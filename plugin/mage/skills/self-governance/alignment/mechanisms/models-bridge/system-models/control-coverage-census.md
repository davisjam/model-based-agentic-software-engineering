# Control-coverage census (controls per governance target)

**Intent** — Classify every governance control by which of a system's complementary control targets it
guards — derived from the control's own code anchor, never hand-declared — and roll the control set up per
target. A target with zero controls, or with only soft aims and no hard hold, is a re-derived coverage
gap: the estate's own blind spots turn into a queryable map instead of a thing you learn about when one
bites (our instance: a control-target axis over the typed control node-set — agent · models-bridge ·
product — projected read-only by a per-target coverage roll-up).

| | |
|---|---|
| Summary | Classify each control by its governance target; roll up per target; an empty target is a gap. |
| Target | Bridge · **System models** |
| Form | `validation` |
| Move | `sensor` — it measures per-target coverage and detects the under-watched target; it never gates a commit |
| Model | `governs-a-model` — it reads the control node-set to derive the target classification and projects the coverage view |
| Enforcement | **Soft·Hard** — the per-target roll-up is instrument-only (it aims the next control, never blocks); a hard self-guard derives each target from the control's anchor and fails loud on one it cannot place, so the map cannot silently mis-credit |
| Governs | `governance-graph` — it reads the mechanism-interaction model's control node-set and rolls it up per governance target |

*Its place in the environment — a **variant / known-use** of **Governance Graph**, under **GOVERN · Govern the control estate itself**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-govern) shows how it folds.*

## Motivation — the failure it kills

A control portfolio grows toward the last painful failure. Effort piles onto the target that just hurt —
usually the one that produces work, the agent fleet — while another target accretes nothing. Each control
is well-formed; the *set* is lopsided. And the imbalance stays invisible, because no artifact ever asks
whether the controls are balanced across the things that need governing.

The knowledge that a mature system should cover all its complementary targets lives in doctrine. Nothing
joins that claim to the controls that actually exist, so the gap between "should cover all of them" and
"covers one" goes unseen until the un-watched target fails in a way a control would have caught. A
per-control lint checks each control in isolation; it never poses the portfolio question. An un-audited
estate under-covers a whole class in silence.

## Why it's not just a per-control lint

Each neighbour handles a real slice and stays green right up to the blind spot this exists to surface.

- **Not just a per-control lint.** A lint validates one control at a time. It never asks whether the *set*
  is balanced across targets. An empty target is a property of the portfolio, not of any control in it.
- **Not just a one-off coverage audit.** An audit answers "are we covered?" once, in prose, and rots the
  day a control lands or a cell empties. This re-derives from the live control set on every query: add a
  target and the gap reopens, fill a cell and it closes, with no hand-kept list to fall behind.
- **Not just an inventory list.** A flat list of controls carries no notion of "which target has none." The
  census partitions the list by a **closed complementary-targets taxonomy with a completeness claim
  attached** — every target should be non-empty — so a zero cell becomes a first-class finding.
- **Not just a test-obligation census.** Its nearest neighbour shares the derive-and-lint shape but points
  it elsewhere. That census derives what should be *tested* and governs the product's test corpus; this one
  derives what should be *controlled* and governs the governance system's own coverage. The axis that
  varies is named and threefold: the **object censused** (the control portfolio, not a test corpus), the
  **reflexivity** (meta-governance — the control set audits itself), and the **completeness-claim
  denominator** (a closed targets taxonomy, not a per-element obligation set). That variation is at least
  as large as the object axis the catalogue already accepts between siblings.
- **Not just the interaction view of the same graph.** The governance graph models the controls as nodes
  too, but its edges are pairwise *conflicts* over a shared resource. The graph now carries three views:
  the **list** (which controls exist), the **interactions** (how two collide), and — this — the
  **coverage per target** (which target is under-watched). The census is neither the list nor the
  interaction-dual: it measures per-target coverage, not per-pair conflict.

## Mechanism

- **Derive the target from the anchor.** Each control classifies into the target it guards by a rule read
  off its own code anchor, not a hand-authored tag. A control the rule cannot place fails loud — never a
  silent default bucket — so the map cannot quietly mis-credit a control to the wrong target.
- **Roll the set up per target.** A read-through projection groups the control node-set by target and
  reports each target's control count and its soft/hard enforcement shape.
- **Treat an empty (or all-soft) target as a finding.** A target with zero controls, or with only soft aims
  and no hard hold, names a blind spot in the estate. The empty cell *is* the finding; it points at where
  the next control should go.
- **Regrow the denominator on every query.** Because the targets come from a closed taxonomy and the counts
  from the live node-set, adding a target reopens its gap and filling a cell closes it, automatically.
- **Aim, do not gate.** The roll-up is instrument-only: it steers the next control into the thinnest target
  and never blocks a commit. The hard half is the fail-loud classifier, so honesty is enforced while
  coverage stays a soft aim.

## Prerequisites

- **Controls modeled as a queryable node-set.** The census reads a typed inventory of the controls; without
  one there is nothing to partition. The mechanism-interaction model supplies exactly this node-set.
- **A closed complementary-targets taxonomy with a completeness claim.** The denominator is a small,
  exhaustive set of targets the doctrine says every mature system must cover; an open string field
  reintroduces the drift and typo class the derived classifier removes.
- **A stable anchor per control** the target rule can resolve, so classification tracks the code as controls
  move rather than a hand-maintained copy that rots.

## Consequences & costs

- **Honest partial coverage is a feature.** The instance reads one target populated and one still at zero —
  a named gap, not an embarrassment. The value is that the zero is *stated*, re-derived, and drives the next
  work, rather than hiding as a silent absence.
- **The taxonomy must fit the governance dimension.** A target the closed set cannot express forces a change
  to the set, which is the honest signal that the doctrine itself grew a dimension.
- **It measures balance, not quality.** A populated target counts as covered even if its controls are weak;
  the census closes the "no control at all" gap and leans on other mechanisms to judge whether the controls
  that exist are strong.
- **A gap usually means un-modeled, not un-watched.** Read an empty or thin cell twice before you sound an
  alarm. In a mature estate almost nothing is truly un-watched — some control already fires on that code —
  but a great deal is un-modeled, so the census has not yet learned what watches there. The common case is a
  modeling backlog, not a live hole. Conflate the two and every run reads as a five-alarm fire, and a real
  blind spot drowns in false ones. Treat a fresh gap as a question first: what already guards this, and does
  the map know it? Only a cell that survives that question is an absence.
- **The finishing line is a sparse residual, not full coverage.** The census maps the slice of the estate
  where a coverage question is worth asking, not every line; it is sparse by design, and pointed at
  everything it will always find something un-modeled. So "done" is not a control on every conceivable
  target. It is the point where what remains uncovered is all below-granularity glue: re-export shims, thin
  facades, configuration that reaches production only through something already governed. Name that
  done-condition. Skip it and the roll-up becomes a completeness chase — adding a node to shave a percentage
  that buys nothing, crying wolf over glue no control should spend itself on. A node earns its place when a
  real question needs it, not to drive the last cell to zero.

## Known uses

- A derived control-target axis over the typed control node-set, projected by a read-only per-target roll-up
  that reported one target fully populated and two at zero — the empty cells naming the estate's blind
  spots. The reading drove a fix-wave that filled one empty target from zero to a dozen controls; the third
  still reads zero, named honestly rather than absent.
- The classifier fails loud on any control whose anchor it cannot place, keeping the coverage map honest as
  controls move.
- The census files its own anchor-drift guard, so the control set censuses the very governor that measures
  it.

## Related mechanisms

- **Counterpart** — [reflection-facet-substrate](../../agent/lifecycle-and-observability/reflection-facet-substrate.md):
  the soft reflex that converts each recurring failure into a new control *extends* the same graph the census
  *measures*. The reflex is reactive and has a systematic bias — it grows controls toward the targets that
  already failed, leaving un-failed targets structurally un-watched. The census is the proactive per-target
  audit that catches exactly that blind spot. The axis: *soft-reactive-extends vs hard-deterministic-measures
  the same governance graph* — one supplies controls, the other measures the supply for the coverage bias.
- **Sibling** — [governance-graph](governance-graph.md): the interaction view of the one graph — pairwise
  conflict edges over shared resources — where this is the coverage-per-target view. The graph draws which
  pairs collide; the census counts which target is thin. Two projections of a single control node-set.
- **Sibling** — [model-derived-test-obligation-census](model-derived-test-obligation-census.md): both derive
  a should-exist set from a model and lint the gap. That one over the test corpus (product); this one over
  the control portfolio (governance, reflexive).
- *See also* — [control-substrate-dependency](control-substrate-dependency.md): a different query over the
  same control-as-node idea — computed blast radius, not coverage completeness.
- *See also* — [query-surface](query-surface.md): the read-only path the coverage roll-up rides on.
- *See also* — [drift-parity-gates](drift-parity-gates.md): the model↔reality honesty family the fail-loud
  anchor classifier joins.
