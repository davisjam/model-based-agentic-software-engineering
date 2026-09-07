# Timeout-budget ordering model (nested wall-clock budgets, checked)

**Intent** — Gather a system's scattered wall-clock budgets — request timeouts, worker deadlines, lock
waits, retry windows — into **one typed surface**, and state the ordering that must hold between them as a
machine-checkable invariant: an inner budget must expire before the outer budget that contains it. The
nesting relationship stops being an accident of separately-edited constants and becomes a property a
check can prove, so a timeout raised past its container is a build finding rather than a production hang
(our instance: the pipeline's wall-clock budgets unified into one surface with a property test over the
nesting order).

| | |
|---|---|
| Summary | Scattered wall-clock budgets unified into one surface with a checkable nesting order. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — the budgets live in one declared surface and a property test proves the nesting order (each inner budget strictly less than its container) holds across every declared pair |
| Derivation | `model-from-code` — the surface mirrors the scattered authoritative constants, reconciled against them |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Wall-clock budgets get set independently, one constant at a time, in whatever file needs a timeout. Each
looks reasonable alone. The bugs live in the **relationships between them**: an inner operation whose
timeout exceeds the deadline of the operation that calls it, so the outer one gives up first and the inner
work is abandoned mid-flight; a lock wait longer than the request that holds it, so the request dies still
waiting; a retry window that outlasts the total budget it was meant to fit inside. None of these is visible
in any single constant. They surface as a hang, a leaked lock, or a partial write under load, and the
person debugging has to *reconstruct the intended nesting from scattered numbers* to even see the
inversion. Nothing in the codebase states that inner-must-expire-before-outer, so nothing checks it.

## Why it's not just a config file of constants

A config file collects the numbers in one place; it does not state the **relationship** they must satisfy,
and the relationship is the whole point. Two budgets sitting in the same file are still just two numbers —
nothing says the first must be strictly less than the second, and nothing fails when someone bumps the
inner one past the outer. The model adds the missing thing: a declared *ordering invariant* over the pairs,
checked by a property test that holds for every nesting, not just the values present today. That is the
difference between storing the budgets and *modeling* them. A config file also invites the very drift the
model prevents — consumers copy a constant and the copy diverges — whereas a single sourced surface makes
the budget one value that every consumer reads, so the nesting a check proves is the nesting the code
actually runs.

## Mechanism

- **One surface holds every budget.** Request timeouts, worker deadlines, lock waits, and retry windows
  live in a single declared object, each a named entry, rather than as constants scattered across the
  files that happen to use them.
- **Declare the nesting relation.** For each pair where one operation runs inside another, the model
  records that the inner budget must be strictly less than the outer — the containment structure made
  explicit, not inferred.
- **Prove the ordering with a property test.** A check quantifies over the declared pairs and asserts each
  inner budget is strictly less than its container, so the invariant holds for the whole surface and for
  any future edit, not merely the current numbers.
- **The surface mirrors the authoritative constants.** The declared budgets are reconciled against the
  scattered constants the code already enforces, and a property check verifies their nesting order over the
  mirror — nothing flows model→code; the surface exists to make the ordering checkable, not to source it.
- **A raised budget that breaks nesting reddens the gate.** Bumping an inner timeout past its outer one
  fails the property test at the edit, turning a latent production hang into a build finding.

## Prerequisites

- **Budgets with a real containment structure.** The model pays off when operations nest — a request
  containing a worker call containing a lock wait; a flat set of unrelated timeouts has no ordering to
  check.
- **A single surface consumers actually read.** The nesting proof is only trustworthy if the checked
  values are the used values, so consumers must source from the surface rather than mirror it.
- **A property-test harness over the declared pairs.** The invariant is "for all nested pairs, inner <
  outer"; without a check that quantifies over the pairs, the ordering is a comment.

## Consequences & costs

- **Timeout inversions become impossible to land quietly.** Raising a budget past its container fails a
  check at the edit, exactly the class of change that used to surface only as an intermittent hang under
  load.
- **The nesting relation must be authored, not just the numbers.** Someone has to say which budget contains
  which; that declaration is the model's substance and its upkeep, and an unstated nesting is unchecked.
- **Small surface, sharp payoff, narrow scope.** The model governs one property — ordering — and does not
  tell you whether any individual budget is *well chosen*, only that the budgets are consistently nested.

## Known uses

- A single wall-clock-budget surface for a document pipeline: per-stage deadlines, lock waits, and retry
  windows gathered into one declared object.
- A property test asserting the nesting order — each inner budget strictly less than the deadline of the
  operation that contains it — across every declared pair, so an inversion fails at build time.
- Consumers sourcing their timeout from the surface, so the budgets a check reasons over are the budgets
  the running pipeline enforces.

## Related mechanisms

- **Layer** — [composed-state-machine-model](composed-state-machine-model.md): timeout inversions cause the
  terminal-state and requeue races that model names as cross-machine invariants; the budget ordering is one
  concrete guard beneath those lifecycle predicates.
- **Consumer** — [formal-invariant-verification](formal-invariant-verification.md): the nesting order is a
  linear-ordering predicate, exactly the shape that mechanism routes to a property test.
- **Sibling** — [synchronization-model](synchronization-model.md): both model an otherwise-implicit
  ordering constraint over shared resources — that one the lock-acquisition order, this one the timeout
  containment order.
- *See also* — [meta-model-consumption](meta-model-consumption.md): consumers reading their budget from the
  one surface rather than hardcoding it is that read-side discipline applied to timeouts.
