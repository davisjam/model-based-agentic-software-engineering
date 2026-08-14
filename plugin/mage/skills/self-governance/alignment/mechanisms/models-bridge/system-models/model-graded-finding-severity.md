# Model-graded finding severity (distance-graded gate)

**Intent** — Grade each lint finding's severity — **block, warn, or silence** — by the finding's
*distance*, in a structured component model, from the files the commit actually changed, computed by **one
central join the gate runs over every finding** rather than by each lint scoping itself. The pre-commit
hook reads the model at check time and dogfoods it to run a mechanism. (Our instance grades a
governed-doc commit's deploy-scope lints against the component-and-zone model.)

| | |
|---|---|
| Summary | A gate grades each finding block/warn/silence by its model-distance from the changed files. |
| Target | Bridge · **System models** |
| Form | `quality-gate` |
| Move | `sensor` — detects the error after the fact |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Hard** (deterministic) · *blocking* — findings at or adjacent to the change block the commit; the gate runs one central grader over every finding |
| Governs | `all-models` — severity graded by each finding's relation to a model |

*Its place in the environment — a **variant / known-use** of **Read the Model, Don't Copy It**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

A whole-tree lint reports findings from all over the tree. Two ways to gate on it both fail, and both
recur:

- **All-or-nothing blocking.** The gate blocks on any finding the lint reports. A commit that touches
  one file gets blocked by a pre-existing finding three subsystems away — noise it can't fix and didn't
  cause. Agents learn to bypass the gate, and the gate stops protecting anything.
- **Every lint scopes itself.** Each lint re-decides "is this finding relevant to *this* change?" — one
  reads a scan-root, another inlines a relevance guess, a third does nothing. Now the relevance logic
  lives in N places and drifts N ways. Fix the scoping rule once and it holds for one lint; the others
  keep their private, subtly-wrong copies. A new lint arrives with no scoping at all and re-opens the
  all-or-nothing problem.

The shared failure: **findings graded uniformly wrong.** The gate either over-blocks on unrelated
findings or under-warns on relevant ones, and no single place owns the answer to "how close is this
finding to what the commit changed?"

## Why it's not just per-lint self-scoping, a severity config, or level-enforcement

- **Not per-lint self-scoping.** Self-scoping puts the relevance decision inside each lint, so the rule
  is re-implemented per lint and drifts. This inverts the locus: the lint's only job is to emit a
  *structured finding* — a typed record carrying its site, the file(s) that caused it, a machine-readable
  kind, and fix-guidance. The gate runs **one** grader over every lint's findings. A fix to the grading
  rule, or a new severity tier, applied once holds for every finding and every future lint. No lint ever
  re-implements scoping.
- **Not a flat allowlist or severity config.** An allowlist assigns a fixed severity per finding kind or
  per path glob — a static table that knows nothing about *this* commit. This grades by a live, per-commit
  measurement: the same finding blocks a commit that touched its site, warns a commit that touched its
  neighbourhood, and stays silent for a commit elsewhere. Severity is a function of the finding *and* the
  change, computed against the model at check time, not a constant baked in a config.
- **Not semantic-level enforcement.** That mechanism picks the *level* where a property is legible — the
  layer at which a check can even be written. This is orthogonal: it takes findings a lint already emits
  and grades their *severity* by graph distance. One chooses where a check runs; this decides how loudly
  an existing finding speaks, given what the commit touched.

## Mechanism

- **Each lint emits structured findings.** A finding is a typed record: its **site** (the repo-relative
  path it is attributed to, which may be a file the commit never touched), its **causing input** (the
  file whose presence, absence, or content produced the finding — the cross-file link), a machine-readable
  **kind**, and **fix-guidance**. The lint stops deciding relevance; it reports facts about each finding.
- **The gate reads the model at check time.** The pre-commit hook loads the structured component model in the
  same process that runs the commit — never a snapshot. Each finding's site maps to a model component; the
  changed files map to their components. The grade reflects the model as it stands at the commit, and a
  commit that edits the model itself grades against the version it is creating.
- **One central grader, three tiers.** The hook runs every participating lint, collects all findings, and
  passes them through a single grader:
  - **HARD** — the finding's site is in the changed set, or one of its causing inputs is. Block the
    commit.
  - **SOFT** — not hard, but the finding's component is one the commit touched. Warn; do not block.
  - **SILENT** — neither. Suppress at commit time; a no-baseline gate downstream is the backstop.
  The grader never reaches into a lint's internals. It operates on the structured-finding contract alone,
  so a new lint that emits the contract gets graded for free — zero grader change.
- **Fail-closed on the unknown.** A finding the grader can't place — a lint that emits no structured
  output, or a member that crashes — degrades to **HARD**. It blocks opaquely rather than passing
  silently. An un-gradable finding is treated as the most severe, not the least, so the gap in the
  contract fails safe.
- **HARD findings carry fix-guidance.** A blocked commit is a blocked agent, so every HARD finding renders
  actionable text: the lint's own how-to-fix description plus a pointer to where the lint is defined, and,
  for a finding blocked by causation, the touched file that caused it — so the agent sees *why* an
  untouched-site finding blocks its change.

The grade is **additive-restrictive**: it can only turn a would-block finding into a warn or a silence,
never invent a block on unrelated work — HARD requires a real member of the changed set. A grader bug can
at worst let an unrelated finding slip to the downstream backstop; it cannot fabricate a spurious block.

## Prerequisites

- **A structured component model** the gate can read at check time — a map from repo path to component, and a
  way to ask which components a set of paths touches.
- **A structured-finding contract that already ships.** The lints must emit findings as typed records —
  site, causing input, kind, fix-guidance — and the gate must be able to parse them. In the instance this
  contract existed before the mechanism: the lints already built typed findings and already supported a
  JSON emission mode a shared parser reads. The central join **consumes a substrate that ships today**
  rather than inventing a contract; the only per-lint change is populating the causing-input field where a
  lint had buried the causing file inside its message string.
- **A downstream backstop** — a no-baseline gate (at deploy, say) that catches every finding regardless of
  grade, so SILENT means *deferred*, not *unchecked-forever*.
- **A cost budget.** The central join needs each lint to run whole-tree so the gate sees every site to
  grade. Where a lint's whole-tree cost stays under a declared threshold, it goes through the central
  grader; a lint over the threshold keeps a cheaper self-scoped path and forgoes the SOFT warn — the
  placement is a recorded lookup, not a per-lint judgment.

## Consequences & costs

- **One grader, one blast radius.** Centralizing the join means a bug in the grader touches every lint,
  where a per-lint bug was contained. The trade buys a single well-tested surface with an exhaustive
  invariant suite over N private re-derivations, and the additive-restrictive property bounds the worst
  case to a fail-safe.
- **SOFT debt accumulates.** A SOFT warn never forces a fix, so a component collects pre-existing findings
  shown on every commit that touches it. Cap the per-commit output and let the downstream backstop force
  the drain; a rising SOFT count in a component is a signal a hygiene pass is due, not a leak.
- **Whole-tree cost per governed commit.** Grading every finding means running the lints whole-tree, more
  compute than a self-scoped run. Measure it; keep the cheap members central and route only the expensive
  ones to a self-scoped path.
- **The contract is now load-bearing.** A lint that stops emitting a well-formed structured finding
  degrades to opaque HARD — safe, but noisy. The emission contract earns a check of its own.

## Known uses

- A pre-commit hook that grades a governed-doc commit's whole-tree lint findings — a doc-staleness check
  and an index-comprehensiveness check — against the component-and-zone model. The hook runs each lint in
  structured-emit mode, parses the findings through a shared parser that already shipped, and grades them
  HARD / SOFT / SILENT in one central join. It fixed a recurring incident where a commit touching one doc
  was blocked by stale findings elsewhere in the tree. A commit that *adds* an unindexed doc still blocks
  — the finding's site is an untouched index file, but its causing input is the doc the commit added, so
  it grades HARD by causation.

## Related mechanisms

- **Enabler** — [component & zone model](component-zone-model.md): the structured model the grader reads at
  check time. This is the sharpest instance of a model *consumed to run a mechanism* — the gate dogfoods the
  component map on every governed commit, not as documentation but as the thing that decides severity.
- **Enabler** — [meta-model consumption](meta-model-consumption.md): the read-don't-snapshot discipline
  the grader follows when it imports the model at check time rather than baking a copy.
- **Counterpart** — [drift & parity gates](drift-parity-gates.md): both are hard gates reading a model at
  check time, but a parity gate asks *does the model match reality?* — a fixed pass/fail per model row.
  This asks *how close is this finding to the change?* and returns a graded answer.
- **See also** — [pre-commit hook](../../agent/gates-and-merge-train/pre-commit-hook.md): the gate this
  grader runs inside. The hook owns the staged set and the commit process; this mechanism is what the hook
  does with a finding once a lint reports it.
- **See also** — [symbol-anchored traceability graph](symbol-anchored-traceability-graph.md): a sibling
  that consumes the models to grade a *join*'s health. Both turn a model into a live check rather than a
  read-only reference; that maps code onto model nodes and re-derives the edges, this maps findings onto
  model components and grades their distance.
