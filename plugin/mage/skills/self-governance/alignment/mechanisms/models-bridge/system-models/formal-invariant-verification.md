# Formal invariant verification (temporal form → model checking)

**Intent** — Give every model invariant a **temporal form**: a temporal-logic operator saying whether it
is *safety* (`[]P`, always holds) or *liveness* (`P ~> Q`, eventually leads to), and make that form **the
routing input**: it derives *which exhaustive checker verifies the invariant*. An invariant is then
proven by the method its shape demands, a state-space model-check rather than a sampled test, and it cannot be
silently mis-verified (our instance: temporal-logic operators on the cross-service state model, checked by
a model checker plus a bounded-BFS "simworld").

| | |
|---|---|
| Summary | Each invariant's temporal-logic form derives its checker — proven, not sampled. |
| Target | Bridge · **System models** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Hard** (deterministic) — an exhaustive model-check (state-space BFS / a temporal model checker) proves the invariant or emits a counterexample trace; a lint asserts the temporal form matches the routed checker |
| Governs | `all-models` — every model invariant earns a temporal form and a checker |

*Its place in the environment — a **variant / known-use** of **Model-Derived Assurance Coverage**, under **COMPLETE · Establish completion on re-derived evidence**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-complete) shows how it folds.*

## Motivation — the failure it kills

Some invariants are about a *single reachable state*: "a job is never both leased and free." Others are
about *interleavings over time*: "a preempted job eventually re-runs." Stated in prose, or pinned by one
example test, either kind can be **believed** true while a rare interleaving violates it: a property test
*samples* the input space and sails past the one adversarial schedule; a distributed race has failure
traces no hand-picked example hits. Worse, when the same invariant is restated in three places (prose, a
runtime assertion, a formal spec) with nothing tying them, they drift; and a **mis-declared** liveness
invariant gets routed to a safety runtime that structurally cannot see its violation, with zero signal.

## Why it's not just "property-based testing"

A property test generates inputs and checks a predicate; it *samples* a space it cannot exhaust, so it
raises confidence without proving. A model-check **exhaustively explores** the (bounded) state space:
it either proves the invariant across every interleaving or returns a concrete counterexample trace. And
the temporal *form* does something a property test conflates: it names **safety vs liveness** explicitly
(`[]P` vs `P ~> Q`), and that operator **derives which checker runs**. The form is *consumed*, not
decorative. A lint rejects an invariant whose temporal shape doesn't match its routed checker, so "a
liveness property checked by a safety runtime" becomes impossible rather than silent. A sampled test that
misses the one adversarial schedule reports green and moves on; the exhaustive check routed from the
temporal form has no un-visited schedule to hide the bug in.

## Mechanism

Each invariant records a temporal-logic form in a standard operator syntax: `[]P` (always: safety),
`[]<>P` (infinitely often), `P ~> Q` (leads-to: liveness). The form is a **required field**: an invariant
cannot be constructed without declaring its temporal shape (a defaulted boolean is exactly what rots). From
that operator the model **derives** the verification tier and the checker. A safety property routes to an
exhaustive state-space search (BFS over reachable states, or a model checker); a liveness property routes
to a temporal model checker. A lint asserts the routed checker matches the operator (a leads-to body must
carry the leads-to token; a safety body must not). Reuse one mature formal engine rather than building a
parallel one, since an established model checker already subsumes the temporal logic.

## Prerequisites

- **A structured invariant model** with invariants as first-class entities the form attaches to. This rides on
  the executable-source-of-truth substrate.
- **A required, consumed temporal-form field.** Optional or defaulted, it rots; the point is that the
  form is *the* routing input, so it must be present *and* acted on.
- **At least one exhaustive checker** (a state-space BFS and/or a temporal model checker) the derived tier
  can route to. The form routes nothing if no checker reads it.
- **A bounded state space.** A model-check is exhaustive only within bounds; an unbounded model is checked
  to a depth, not proven absolutely.

## Consequences & costs

- **Exhaustive, within bounds.** The check proves the invariant over the *modeled* state space, but the
  model is an abstraction, and a bug outside it is out of scope. The proof is only as strong as the model's
  fidelity to the real system.
- **Heavier than a unit test; typically dev/CI-only.** A model checker is not a per-commit gate; the
  derived-tier routing keeps simple invariants on cheap checkers and reserves the model checker for the
  hairy multi-actor races that earn it.
- **The form must stay honest.** Its whole value is being *consumed* — deriving the tier, validated by the
  match lint. A decorative temporal string no checker reads is worse than none: it *looks* verified and
  isn't. The match lint is what keeps the form true to the checker it names.

## Known uses

- Temporal-logic operators (`[]P` / `[]<>P` / `P ~> Q`) as a required field on each cross-service
  invariant, deriving the verification tier from the operator shape.
- The exhaustive runtimes: a temporal model checker (the TLA+ family) plus a bounded-BFS "simworld" over
  the reachable state space.
- The match lint (temporal shape ↔ routed checker) that makes a mis-routed invariant a build error rather
  than a silent gap.
- The state model named in **SysML vocabulary** (blocks / parts / state machines), adopting the canonical
  systems-modeling terms even where its heavyweight tooling is skipped, the same "adopt the schema, skip
  the runtime" move as a service-topology dialect.

## Related mechanisms

- **Enabler** — [executable-source-of-truth](executable-source-of-truth.md): the invariants it verifies are
  fields on the structured model; the temporal form is one more *consumed* field, held true by the same
  data-not-code discipline.
- **Counterpart** — [drift-parity-gates](drift-parity-gates.md): parity keeps the model equal to
  *reality* (every model row ↔ a real thing on disk); this keeps the model's *invariants* sound (every
  stated invariant provably holds). Two faces of trusting the model: it matches the world, and its claims
  are true.
- *See also* — a sampled property test raises confidence where a full model-check is too costly; the
  temporal form routes each invariant to the strength its shape demands, some to exhaustive checking, some
  to a lighter tier.
