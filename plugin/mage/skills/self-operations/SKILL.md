---
name: self-operations
description: >-
  Operate an agent-fleet repository as a DevOps engineer — the positive lifecycle
  map of how the substrate works (managing agents, context windows, the git repo,
  deploys, the dev machine, cron, and the orchestrator's own hooks), plus a
  symptom → resolving-doc catalog for when something breaks. Use when running an
  orchestrator/operator session: dispatching or recovering agents, keeping the
  mainline deployable, reclaiming disk, colima/host-tool trouble, cron or
  merge-train health, hook misbehavior, or RCA of a substrate failure. LEADS with
  how things should work; troubleshooting is the fallback. Partner to the
  self-governance skill — operate routes a break to its fix, and when a failure
  RECURS, hand it to self-governance to convert into a durable control. NOT for
  the product's domain logic (its checkers, generators, business rules) — that is
  product code, not repo operation.
---

# self-operations — run the repo like a DevOps engineer

You are operating **the way the work is done** in this repository — the agent fleet and the substrate that
produces it. Your job is a DevOps engineer's: keep it running, know how it works, improve it when you
touch it. This is the *operate* half of the pair; **[`self-governance`](../self-governance/SKILL.md) is the
*harden* half.** Operate routes a break to its fix; when a failure *recurs*, hand it to self-governance.
The two are **two lenses on one substrate**, not competitors: self-governance is the *design-time* census of
controls (what exists, what's missing, how to mint one); this skill is their *run-time* operation. A
mechanism lives in that census **and** is run here — the same thing seen design-time vs run-time.

Read [`principles.md`](principles.md) — the portable operating mindset (positive-first, route-to-class,
observability-first RCA, typed runbooks, semantic-gap placement, freedom-to-improve). The rest of this
skill is the map you operate against and the bootstrap that fits it to *this* repo.

## How to use this skill

1. **Orient positive first.** Read the lifecycle map below — know the healthy baseline before you hunt
   a break. Most sessions are steady-state operation.
2. **When something breaks,** find the symptom's *class* in your Part B catalog (match the class, not the
   example that seeded the row), follow its resolving doc, and run the matching runbook's typed steps.
3. **If the cause is unknown,** RCA observability-first (`principles.md` A.3) — an observability gap is
   itself the first finding.
4. **After resolving,** if this failure has happened **more than once**, run the partner `self-governance`
   skill (interpret-failure mode) to classify the class and design the control — a registered, designed
   control, never an inline hack. Governance is design.

## The core lifecycles (the map — know normal before you hunt a break)

Every agent-fleet repo manages the same five core lifecycles (plus cron/scheduling and the operator's own
hooks where present). The *structure* is shared; only the bindings differ (your Part B).

| Lifecycle | The resource you manage | Healthy baseline | Symptom classes |
|---|---|---|---|
| **L1 · manage-agents** | the fleet: dispatch, monitor, land, tombstone, **recover** | agents ≤ cap; each has a live record; landed work cleaned up | agent died mid-flight; orphaned worktree; dispatch refused (resource); wrong-branch commit |
| **L2 · manage-context** | the operator's + agents' context windows | in-flight state banked; a fresh session reconstructs it | near compaction with unsaved state; post-compaction rebuild; idle capacity, queued work |
| **L3 · manage-git-repo** | landing work onto the mainline | ready work lands; mainline releasable; stale branches reaped | a worktree won't land; mainline un-releasable; a wrong landed commit; branch sprawl |
| **L4 · manage-deploy** | shipping | staged deploys reach green; hotfixes don't ship HEAD | deploy won't green; smoke hangs on one case; a prod bug report; hotfix-without-HEAD |
| **L5 · manage-dev-env** | the machine/host | disk/compute headroom; toolchain present; VM healthy | pressure sheds work; disk exhausted; a host tool vanished; VM mis-sized |
| **(L-cron)** | scheduled automation | scheduler live; its alerts consumed | an alert blocks new work; the scheduler broke its own fix; a queued conflict needs hands |
| **(L6 · govern-your-own-loop)** | the operator's own decision loop — hooks that fire a skipped reflex at its moment | each ambient must-do judgment is backed by a fail-open, windowed, telemetered hook | a recurrence never converted to a control; a durable lesson written to the wrong store |

The problems above are **universal**; only the *solutions* (your tools, your docs) are repo-specific.

## The bridge to self-governance (the two-way interface)

Self-Operate runs the environment; **self-governance engineers it.** The two compose through one explicit,
two-way interface. Encode it — the same contract self-governance carries, seen from the operate side.

**Down (self-governance → self-operate): you incorporate what it designs.** When self-governance mints a
mechanism, you run it at the right lifecycle state. A new validator → run it at its deployment state. A new
operational invariant → run the monitoring machinery that watches it. A lifecycle-design change → adopt the
revised state model and its runbooks. You delegate *design* upward; self-governance delegates *execution*
downward.

**Up (self-operate → self-governance): you return evidence, not designs.** When operation exposes a
deficiency in the models, mechanisms, skills, or lifecycle itself, hand the *engineering problem* up — with
the evidence, not a fix. You recognize the recurrence and report; the design move is self-governance's.

**The routing fork — the load-bearing nuance.** Not every anomaly crosses the boundary. Classify what
happens after an operational anomaly (the classification need not be mechanical):

```
                  OPERATIONAL ANOMALY
                          |
                     known class?
                      /       \
                    yes        no
                    |           |
             known recovery     |
                    |           |
                 recover        |
                    |           |
               recurrence?      |
                /      \        |
              no       yes      |
              |         |       |
           continue     +-------+
                           |
                           v
                 ENGINEERING DEFICIENCY?
                      /          \
                    no            yes
                    |              |
              document/learn   SELF-GOVERNANCE
                 (stays here)
```

A known operational condition with an adequate runbook **stays in Self-Operate.** A condition that reveals
inadequacy in the models, mechanisms, skills, or engineered environment **crosses to self-governance.**
Operations does not redesign the architecture every time a service restarts.

**The nine hand-back signals** — when to route the class up (run the partner skill's interpret-failure mode):

- recurrence despite successful recovery;
- a missing lifecycle state;
- a runbook that repeatedly needs substantial unmodeled judgment;
- a mechanism that produces false positives or false negatives;
- operational reality that contradicts a system model;
- expected evidence that cannot be obtained;
- a supposedly deterministic procedure that is not deterministic;
- a recovery that is disproportionately expensive;
- a new class of failure.

Everything else — the one-off, the handled-and-gone — stays here. `document/learn` is a legitimate
terminal; not every failure earns permanent governance.

## Bootstrap — fit the map to this repo (generate Part B)

*Discover as much as you can yourself; ask the human only for what you can't determine, and confirm the
shape before you commit it.*

- **Auto-discover (inspect the repo, don't ask).** Find how agents are dispatched, where the operational
  docs live, the deploy command(s), the host/VM (container runtime, disk sites), the scheduler/cron if any,
  and the mainline-landing path. Read the house-rules doc and the docs index if present.
- **Map to the lifecycles.** For each L1–L5 (+cron and your own loop where present), fill the healthy
  baseline and the symptom→doc rows from what you found. Cite real files/sections; the ref-lint checks them.
- **Ask the human only for the gaps** — and *state your assumptions so they correct rather than supply.*
- **Confirm the lifecycle models + runbooks with the human.** Walk them through the drafted models (right
  five? a baseline they'd state differently?) and runbooks (does each problem match a real failure? are the
  solution steps right, and correctly typed?). Their operational judgment is what inspection can't supply.
- **Emit Part B** as the typed source-of-truth (a pointer catalog + a runbook catalog) and wire the
  reference-validity lint — because a non-executable index earns trust from a ref-check, not from tests.
  Don't hand-roll it: start from the scaffolds in [`templates/`](templates/) —
  [pointers-starter.yaml](templates/pointers-starter.yaml) (the lifecycle + docs-map + symptom schema, with
  the `ref`+`#anchor` grammar in its header), [runbooks-starter.yaml](templates/runbooks-starter.yaml) (the
  typed-step schema — RUNNABLE / JUDGMENT-AUTOMATABLE / JUDGMENT-IRREDUCIBLE, one required field per kind),
  and [gen-and-lint-partb-starter.py](templates/gen-and-lint-partb-starter.py) (one stdlib+PyYAML script that
  renders Part B between provenance markers *and* lints it — file-exists, anchor-resolves, and
  counts-derived-never-quoted). Edit the YAML SSOTs, regenerate, let the lint keep the two honest.

## Examples — read one before you author Part B

Need the shape before you write? Read a shipped example under [`examples/`](examples/) and adapt it in
place. Pick by what you want to see:

- **A lifecycle model** → one per lifecycle in [`examples/`](examples/):
  [L1 manage-agents](examples/lifecycle-L1-manage-agents.md) ·
  [L2 manage-context](examples/lifecycle-L2-manage-context.md) ·
  [L3 manage-git-repo](examples/lifecycle-L3-manage-git-repo.md) ·
  [L4 manage-deploy](examples/lifecycle-L4-manage-deploy.md) ·
  [L5 manage-dev-env](examples/lifecycle-L5-manage-dev-env.md) ·
  [L6 govern-your-own-loop](examples/lifecycle-L6-govern-your-own-loop.md) — each a filled-in model
  (purpose, healthy baseline, symptom classes, owned runbooks).
- **A runbook** → [recover-the-fleet](examples/runbook-recover-the-fleet.md) ·
  [drain-an-un-releasable-mainline](examples/runbook-drain-unreleasable-mainline.md) ·
  [reclaim-a-full-disk](examples/runbook-reclaim-a-full-disk.md) ·
  [get-a-red-deploy-green](examples/runbook-get-a-red-deploy-green.md) ·
  [rca-an-ambiguous-signal](examples/runbook-rca-an-ambiguous-signal.md) ·
  [recover-a-broken-scheduler](examples/runbook-recover-a-broken-scheduler.md) ·
  [keep-the-tree-clean](examples/runbook-keep-the-tree-clean.md) ·
  [query-the-caused-by-mix](examples/runbook-query-the-caused-by-mix.md) ·
  [audit-model-code-drift](examples/runbook-audit-model-code-drift.md) ·
  [convert-a-recurring-failure-to-a-control](examples/runbook-convert-recurring-failure-to-control.md) —
  each shows the typed steps
  end to end (a RUNNABLE line, a JUDGMENT-AUTOMATABLE carried brief, a JUDGMENT-IRREDUCIBLE escalation),
  opening with its universal problem statement, then illustrative solution steps. The
  [drift-audit](examples/runbook-audit-model-code-drift.md) one is the sharpest case of the split this
  skill's runbooks are built on: it mechanizes the enumerate-and-diff of a typed model against the code it
  claims, and reserves the human for the one question a machine can't answer — is this drift a real
  divergence or an intended as-built gap? The
  [convert-a-recurring-failure-to-a-control](examples/runbook-convert-recurring-failure-to-control.md) one is
  the operate↔govern bridge: it is what you run when a break RECURS — confirm genuine recurrence, hand the
  class to the partner [`self-governance`](../self-governance/SKILL.md) skill, design the control as a
  first-class artifact, and surface the open design forks.
- **The runnable hook library** → [`hooks/`](hooks/) — a self-contained, stdlib-only Claude Code hook
  substrate you copy into your `.claude/` and adapt, in three independently-adoptable layers: **(1)** the
  reflection substrate (a Template-Method `ReflectionFacet` base + typed registry, a shared once-per-window
  Stop emitter, three generic example facets — failure→control, memory-vs-runbook, bank-consistency — and
  the measured-leash query); **(2)** the typed hook substrate (a machine-checkable hook-output schema + a
  registry that catches an inject-on-a-block-only-event bug *at construction*, plus a conformance test);
  **(3)** the banking substrate (an atomic dual-write status banker + a skill-usage measured leash) — the
  runnable half of [L2 manage-context](examples/lifecycle-L2-manage-context.md). The runnable complement to
  the [L6 govern-your-own-loop](examples/lifecycle-L6-govern-your-own-loop.md) model — read its
  [`README.md`](hooks/README.md) for the wiring + how-to-add-a-facet, and its five-part hook discipline.
  The pattern behind all three layers is **the meta-hook**: register every control into one typed seam
  per event, so your governance layer is portable across agent harnesses and readable as a census from
  one place (see [the meta-hook](hooks/README.md#the-meta-hook-one-registration-seam-per-event)).
- **Design + Epic + handoff templates** → [`templates/`](templates/) — when operating spills into
  *building* (an infra change, or the design → ratify → build → DoD feature-dev flow), author from the
  shipped [Epic template](templates/EPIC-TEMPLATE-starter.md) and
  [design-doc template](templates/design-doc-template-starter.md): they carry the required sections +
  Definition-of-Done, so a design's ratification lands *committed in the doc* (a `§G` block), not stranded in
  conversation. For L2 banking, the [emit-handoff scaffold](templates/emit-handoff-starter.py) machine-fills
  the reconstructable handoff sections from git state so re-banking is a narrative diff, not a rewrite.

Copy a sample's shape, swap in this repo's tools, drop the rest.

## Notes

- **Make it fire — cite, don't mirror.** Don't paraphrase this skill's map into your always-loaded
  CLAUDE.md: a mirrored skill is applied *ambiently* and never *invoked*, so you lose its structured value
  (the lifecycle map, the symptom→doc routing, the typed runbooks) and the two copies drift. Instead —
  keep a one-line reflex in CLAUDE.md, **cite** this skill, and wire a **trigger** (a turn-end /
  operations reflection nudge) that pushes "invoke the operate skill" the moment a substrate break or an
  RCA is in hand. The skill earns its keep when *invoked* at the decision point, not paraphrased in boot
  context. (The failure it prevents: skills that fire ~never because their content was mirrored, not cited.)
- **This skill is soft.** It aims you at how the substrate works and where a break resolves; it doesn't
  execute or block. The one hard control it recommends is a reference-validity lint over your Part B.
- **Partner with self-governance.** This routes to the fix; that classifies a recurring failure's class
  and designs the durable control. Two soft skills — one operates the substrate, one hardens it.
- **Use the `self-communicate` skill when you write a runbook, a handoff, or a banking doc.** Reach for
  [`self-communicate`](../self-communicate/SKILL.md): its shared lexicon's **Operations** cluster keeps the
  terms consistent, and its engineering register keeps a runbook readable and correctly shaped.
- **Stay in the operations lane.** This governs *operating the repo*, not the product's domain logic.

## Local adapter (plug points)

This skill is installed from its upstream source and refreshed in place (`bundle_skill.py --install` /
`--refresh`). A refresh **overwrites every upstream file**, so put your local additions where the refresh
never looks. Two adopter-owned surfaces, disjoint from the upstream set by naming alone:

- **File overlays** — for a listed upstream file, create the named `*.local.md` sibling. The agent reads it
  as an **APPEND** after the upstream file. There is no override mode — replacing an upstream file wholesale
  is a fork, out of scope for the adapter. Declared overlays:
  - `principles.md` → `principles.local.md` — your house operating mindset, appended to the portable base.
- **Directory drop-in** — any file you place under `local/` is adopter-owned: the agent reads it on the
  topic it names, and upstream never ships into `local/`. Use it for a standalone house runbook this skill
  does not already carry.

A refresh never reads, writes, or deletes a `*.local.md` file or anything under `local/`, so your local
tinkering survives every upstream update untouched.
