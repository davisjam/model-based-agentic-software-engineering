# Dynamic context injection

**Intent** — Map the files an agent is about to touch to the *exact constraints that govern those
files* (lints, conventions, component boundaries, tests) and inject that subset into the agent's brief
**before it writes code**, moving detection left of the cheapest CI gate.

| | |
|---|---|
| Summary | Inject the rules governing these files into the brief. |
| Target | Agent · **Context & dispatch substrate** |
| Form | `agent-output` |
| Move | `constraint` — prevents the error by construction |
| Model | — |
| Enforcement | **Soft** (probabilistic) — forward injection influences behavior; it does not block. (The *reverse* direction feeds a **hard** self-heal gate, but forward injection is advisory by nature.) |

> **★ Flagship entry.** This is the canonical example of the "why it's not just the naive
> alternative" move that the whole catalogue is built around.

*Its place in the environment — a **variant / known-use** of **Point-of-Action Policy Delivery**, under **MANAGE · Manage work, state, and resources**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-manage) shows how it folds.*

## Motivation — the failure it kills

The recurring failure class is **constraint under-specification at dispatch time.** A coding agent
lacks the tacit knowledge an experienced engineer has of *which* rules apply to a given change, so it
makes plausible edits that violate them, then spends rounds (and tokens) discovering and repairing the
violations. Call it "pinball." A layered validation hierarchy (pre-commit → merge check → deploy gate) makes
it worse: context is lost between where the agent authored the change and where the failure surfaces.
Across many concurrent agents, this wasted work multiplies.

## Why it's not just "it's in the docs"

It comes down to **availability vs. binding.**

- **"It's in the docs" is a *pull* model** with four failure points in series: the agent must (1) know
  the doc exists, (2) infer it is relevant to *this* change, (3) choose to read it, (4) find the right
  passage. Each is a coin flip; at agentic velocity you flip too many. Injection is **push**: the
  applicable rules land in context whether or not the agent would have gone looking.
- **The docs hold the *rules*; the missing thing is *which rules apply here*.** The relevance mapping
  (given *these* files, which of the hundreds of documented rules govern them?) used to live only in the
  engineer's head. The slicing operator (`files → constraints`) *is* that externalized judgment.
- **A brief binds where a doc only informs.** A doc is optional, ambient reference; a brief is the task
  specification, **mandatory reading by construction**. So injecting the constraints into the brief is
  not *adding information*. It is a **change of status**, relocating a rule from "available" to "binding."

Docs do make a rule knowable; they just leave it optional. The brief makes it governing.

## Mechanism

One piece of machinery run in **two directions**:

- **Reverse** (`diff → findings`): given a change, attribute which findings *this change introduced*
  by intersecting checker output with `git diff --unified=0` line ranges (no snapshot cache ⇒ no
  staleness, no cross-agent contention). Powers CI self-heal: ask an agent to fix only what it broke.
- **Forward** (`files → constraints`): given the target files, predict which constraints *will* apply
  and pull their declarations + fix-hints. Powers pre-briefing.

Two firing modes for the forward direction: **brief-time auto-injection** (the orchestrator declares
target files; the dispatch path renders a constraint block into the prompt) and **agent-discovery-time
pull** (the agent asks a constraints-for-files CLI once it knows what it will touch).

## Prerequisites

1. **File-addressable constraints.** Every constraint declares its **scope** (file patterns /
   component tags) and lives in a **registry you can query by file**. Anything not addressable by file
   scope cannot be sliced.
2. **Self-documenting constraints.** Each rule carries a name, docstring, and an actionable
   "How to fix" line. This is the decisive prerequisite: *the value of an injected constraint is
   bounded by the agent's ability to act on it*, and its inverse, *if you can't clearly explain a
   rule to an agent, the rule's own defense value is questionable.*
3. **A slicing operator** at two granularities, file-scope (forward) and line-range (reverse), built
   as **multiple adapters**, one per registry (lint fleet, component registry, banned-API list, test
   corpus, doc index).
4. **An injection point** in the dispatch pipeline (the brief-authoring step) plus the on-demand CLI.

## Consequences & costs

- **Garbage-in.** The mechanism is only as good as the constraint declarations it slices: a rule with no
  scope tag can't be selected, and one with no actionable fix-hint can't be acted on. It *depends on*
  prerequisite 2 being true fleet-wide; it does not create that discipline.
- **Advisory, not binding.** Because forward injection is augmentation (see Enforcement), an agent can
  still ignore an injected constraint. It shifts the *odds*, raising salience at point-of-need, but a
  gate downstream is still what guarantees the rule; DCI reduces pinball, it does not eliminate
  violation.
- **The relevance operator is itself fallible.** Over-injection floods a brief with noise (lowering the
  salience the mechanism trades on); under-injection silently omits a governing rule. Precision/recall of
  `files → constraints` is a real, tunable failure surface, not a solved mapping.
- **Adapter maintenance.** One adapter per registry (lint fleet, component registry, banned-API list,
  test corpus, doc index) must be kept in sync with its registry, or the sliced set drifts from truth.

## Known uses

- A constraint-extraction tool (forward slicing / discovery-time pull).
- The diff-line-range attribution machinery (reverse) that powers CI self-heal.
- Consumes the [component-zone model](../../models-bridge/system-models/component-zone-model.md) and the
  lint fleet's scope tags as its addressable registries (via the
  [read-don't-hardcode](../../models-bridge/system-models/meta-model-consumption.md) discipline).

## Related mechanisms

- **Bridge** — the [component-zone model](../../models-bridge/system-models/component-zone-model.md) (a
  models-bridge mechanism) supplies the file → component → checks mapping the forward slicer reads. DCI is
  the *agent-facing* consumer of that bridge model; the same model *governs the product* via the
  boundary lints, so DCI is one end of the bridge.
- *See also (complement)* — [brief-linting](brief-linting.md): the structural check on the brief; this
  is the content injected *into* it.
- **Counterpart (the feed-back twin)** —
  [reflection-facet-substrate](../lifecycle-and-observability/reflection-facet-substrate.md) (built on
  [lifecycle-hooks](../lifecycle-and-observability/lifecycle-hooks.md)):
  injection is **feed-forward**, the constraints governing a task pushed into an agent *before* it acts,
  at dispatch. A tempo-gated **reflection** facet is the mirror image: it pulls the *operator* back to the
  same kind of repo policy *while or after* acting, at turn-tempo, so it is **feed-back** instead of feed-forward.
  Same move (meet the loop with the right policy at the right lifecycle moment), opposite direction in
  time. And just as injection *slices* one registry per file-set, a reflection substrate generalizes
  across policy facets (convert-a-recurrence, spot-a-second-copy, a stale runbook), consolidated into one
  paced emission so the facets don't compound into the alarm fatigue each was biased to avoid. The deeper
  unity: both are delivery *modalities over the same policy source of truth*. Push it in comprehensively
  at entry, or surface a slice of it selectively at tempo, so one policy-materials registry could feed both.
- **Generalization:** *every meta-substrate authored for human discipline (the lint fleet, the
  component registry, the doc index, the banned-API registry, the test corpus) becomes a
  just-in-time constraint registry the moment you add a slicing operator over it.* Lint pre-briefing
  is only the first adapter.
