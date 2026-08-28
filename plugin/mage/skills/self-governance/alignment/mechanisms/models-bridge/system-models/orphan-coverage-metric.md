# Orphan-coverage metric (walk code → governance; score the un-covered remainder)

**Intent** — Point a tracer at the *code* and ask, for each governance-relevant site, "does any model row
or any control node reach this?" Score the remainder — the **orphans**, sites nothing governs — as a rate,
cluster them, and treat each cluster as a candidate for a new model or a new control. It walks the
**inverse** of a control-outward census, and it never gates: an instrument that ranks work, not a check
that blocks a commit (our instance: a tracer that scores the un-modeled and un-governed fraction of a
subsystem's code and ranks the orphan clusters that should be modeled or controlled next).

| | |
|---|---|
| Summary | Walk code → governing model/control; score the orphans; each orphan cluster is candidate work. |
| Target | Bridge · **System models** |
| Form | `validation` |
| Move | `sensor` — it measures the un-covered fraction of the code and surfaces the orphan; it never gates |
| Model | `governs-a-model` — it reads the model row-set and the control node-set to decide, per code site, whether either reaches it |
| Enforcement | **Soft** — the orphan rate and its ranked clusters are instrument-only: they inform which model or control to build next, and never block a commit (exit 0 always). |
| Governs | `all-models` — walks the code estate against whichever models and controls declare a governing reach |

*Its place in the environment — a **variant / known-use** of **Governance Graph**, under **GOVERN · Govern
the control machinery itself**: the inverse-direction counterpart to the
[control-coverage census](control-coverage-census.md). Preserved here for its technical texture; the
[construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-govern) shows how it folds.*

## Motivation — the failure it kills

The dangerous gap is the one nothing points at: a trust boundary, a governance-relevant seam, or a piece of
work-producing logic that **no model describes and no control watches**. It is invisible precisely because
nothing is wrong — until it breaks, and then the surprise is that the estate never knew the site was
un-governed at all.

A census that walks *controls outward* — "what does each control guard?" — cannot see this class. It can
report high per-control coverage while whole regions of code sit un-touched, because it only ever reads the
sites its controls already point at. It measures the reach of what exists; it is structurally blind to what
was never pointed at. The knowledge of *which code has no governing model or control* lives nowhere, so the
gap between "governed" and "un-governed" goes unmeasured until an un-watched site fails.

## Why it's not just the control-coverage census

Its nearest neighbour shares the coverage-of-governance spirit and walks the graph the other way.

- **Not just the control-coverage census (the direction is inverted).** That census walks **control →
  target** and makes a completeness claim *per target*, over a closed taxonomy of targets; its orphan is an
  *empty target cell*. This walks **code → governing model/control**, over the **code estate** as its
  denominator; its orphan is an *un-covered code site*. One asks "which target is thin?"; this asks "which
  code is un-covered?" — and the second cannot be read off the first, because a fully-populated target
  still leaves regions of code no control was ever pointed at.
- **Not just a coverage report.** Line coverage counts the lines a test ran. This counts the code sites a
  *governing artifact* reaches, and reports the fraction that none do. Its denominator is governance reach,
  not test execution.
- **Not just the traceability graph.** A symbol-anchored traceability graph is bidirectionally traversable,
  so it *can* walk this direction — but it is a **join-integrity** checker: does each declared edge still
  resolve? This is a **coverage metric**: what fraction of code has *no* governing edge at all? Traversing a
  direction is not scoring the orphan remainder over it.

The named varying axis is threefold: **walk direction** (code → governance, the inverse), **the orphan as a
work-unit** (an un-covered site becomes a ranked candidate for a new model or control, not a percentage on
a dashboard), and **a code-estate denominator** (a driven-down rate over the code, not a per-target cell).
And it is strictly an **instrument** — it enumerates and ranks, and never gates — where several
census-family neighbours are sensors that feed a blocking gate.

## Mechanism

- **Trace from the code.** For each governance-relevant site in a subsystem, ask whether any model row or
  any control node reaches it. The tracer reads the model set and the control set as data and computes the
  reach, rather than a hand-kept list of what is covered.
- **Score the orphans as a rate.** Report the un-covered fraction — `orphans / total` — over the traced
  estate. The rate is the headline the drain loop drives down round after round.
- **Cluster the orphans and rank them.** Group the un-covered sites; a dense cluster of related orphans is
  the signal that a whole model or control is missing there. Each cluster becomes a candidate work-item, not
  a line on a report.
- **Re-measure every round.** Model one cluster, re-run the tracer, and the rate drops; the next-densest
  cluster surfaces as the next candidate. The metric drives its own backlog.
- **Instrument, never gate.** The rate and its clusters inform which model or control to build next. They
  never block a commit — a code site is allowed to be un-governed; the metric only makes the choice to
  govern it *visible and ranked*.

## Prerequisites

- **A tracer over the code estate** that can resolve, per site, whether a model row or control node reaches
  it — the same reachability the traceability graph and the control node-set already supply.
- **Model and control sets read as data**, so the reach is computed from the live sets rather than a
  hand-maintained coverage list that rots.
- **A done-condition, not a zero target.** Without a declared stopping point the rate becomes a
  completeness-chase; the metric needs a regime below which the residual orphans are accepted as
  un-modeled-on-purpose (see Consequences).

## Consequences & costs

- **The done-condition is a glue-only regime, not zero.** The metric is "done" not at `0%` but when the
  residual orphans are all *below-granularity glue* — re-export shims, thin facades, config that reaches
  production only through another governed seam. Driving past that regime chases coverage nobody needs. A
  small residual (a few percent, glue-only) is the honest stopping point, and it is the counterweight to the
  metric's own growth pressure.
- **It measures presence, not strength.** A site a weak model or a soft-only control reaches counts as
  covered. The metric closes the "nothing reaches this at all" gap and leans on other mechanisms to judge
  whether the model or control that reaches it is any good.
- **The tracer's reach rule is load-bearing.** A site the tracer mis-resolves reports a false orphan (or
  false coverage); the rule that decides "does this reach that" must track how models and controls anchor to
  code, or the rate drifts from the truth it claims to measure.
- **It ranks work; it does not do it.** The output is a backlog of candidate models and controls. The value
  lands only if the ranked clusters are actually worked; an un-read metric is one more report.

## Known uses

- **Un-modeled code (code → model).** Walk the code and score the sites no typed model row reaches; each
  orphan cluster is a candidate for a new model. Run as a drain loop across a subsystem's clusters, the
  metric took one subsystem's un-modeled fraction from roughly a half down toward a fifth over successive
  rounds, each round's densest orphan cluster driving the next model built.
- **Un-governed code (code → control).** The explicit dual: walk the code and score the sites no control
  node reaches; each orphan is governance-relevant code nothing watches — a candidate for a *new control*.
  It reuses the same tracer and the same instrument-not-gate posture, varying only the target kind (a
  control node in place of a model row). A headline orphan cluster it ranked corroborated an
  independently-found gap that a separate cleanup had just closed.
- **The glue-only done-condition.** Both walks share one residual driver — code that reaches production only
  through glue (a re-export shim, a facade, config) — and both declare "done" as the regime where the
  remaining orphans are all that glue, rather than an unreachable `0%`.

## Related mechanisms

- **Counterpart** — [control-coverage-census](control-coverage-census.md): the same coverage-of-governance
  idea walked the other direction. The census walks *control → target* over a closed targets taxonomy and
  names an empty target cell; this walks *code → governing model/control* over the code estate and names an
  un-covered site. One measures whether every target has a control; this measures whether every code site
  has a governor. Named axis: *inverse walk direction + orphan-as-work-unit + code-estate denominator*.
- **Sibling** — [model-derived-test-obligation-census](model-derived-test-obligation-census.md): both
  derive a should-exist set from the models and surface the gap. That one derives what should be *tested*
  and gates on the missing test; this derives what should be *governed* and only ranks the missing
  model/control, never gating.
- **Consumer** — [symbol-anchored-traceability-graph](symbol-anchored-traceability-graph.md): the metric
  rides the graph's code↔model reachability to decide, per site, whether a governing edge exists — but reads
  it as a *coverage* question (what has no edge?) rather than the graph's own *integrity* question (does
  each edge still resolve?).
- *See also* — [query-surface](query-surface.md): the read-only path the orphan roll-up and its ranked
  clusters are projected through.
