# Model-derived test-obligation census (derive what should be tested, lint the gap)

**Intent** — Derive the set of things that *should* be tested from the structured models themselves — every
external seam that should be fuzzed, every failure edge that should have an injection test, every invariant
that should have a checker — and lint the **gap** between that derived obligation set and the tests that
actually exist. Coverage stops being a percentage over lines you happened to write and becomes a walk over
the model: an untested obligation is a named, listable finding, not an absence nobody notices (our
instance: censuses that derive the should-be-fuzzed and should-have-injection sets from the seam and
error-path models, then flag the ones with no test).

| | |
|---|---|
| Summary | Derive the should-be-tested set from the models and lint the gap to the tests that exist. |
| Target | Bridge · **System models** |
| Form | `validation` |
| Move | `sensor` — it detects the untested obligation |
| Model | `governs-a-model` — it reads the models to derive obligations and gates the gap |
| Enforcement | **Hard** (deterministic) — the obligation set is computed from the models and the gap to existing tests is a build finding |
| Governs | `all-models` — derives obligations from whichever models declare a testable surface |

*Its place in the environment — the **canonical mechanism** for **COMPLETE · Establish completion on re-derived evidence**.*

## Motivation — the failure it kills

Line coverage measures the code you wrote *and* tested; it is blind to the code you should have written a
test for and didn't. The dangerous gaps are the ones nothing points at: an external seam that was never
fuzzed, a failure edge with no injection test, a cross-service invariant with no checker. A percentage
climbs toward a hundred while whole *categories* of obligation sit at zero, because coverage counts what
exists and cannot count what's missing. Worse, the obligation set is not static — every new seam, every new
failure edge, every new invariant adds an obligation — and a line-coverage number never says "you added a
thing that should be tested and didn't test it." The knowledge of what *ought* to be tested lives in the
models, but nothing connects it to the tests that exist, so the gap between them is invisible.

## Why it's not just a coverage report

A coverage report answers "of the lines that ran, how many did a test exercise?" — a denominator of *what
you built*. This census flips the denominator to *what the models say should be tested*, which is the set a
coverage report structurally cannot see. It **derives the obligation from a model** — the seam registry
yields the fuzz targets, the error-path model yields the injection obligations, the invariant model yields
the checkers owed — and then reports the ones with no matching test as concrete, named findings. A coverage
report can be at ninety percent while an entire obligation category is untouched, because the untested
category never entered its denominator. The census also **grows its own denominator from the model**: add a
seam and the should-be-fuzzed set grows by one, so the gap reappears until a test closes it — a property a
static coverage threshold can never have, since it measures against the code rather than against the
obligations the models declare.

## Mechanism

- **Derive the obligation set from the models.** Walk the structured models that declare a testable surface —
  external seams, failure edges, cross-service invariants — and compute the set of things each says should
  be tested, rather than enumerating tests by hand.
- **Match obligations to existing tests.** Join each derived obligation against the test corpus: this seam
  has a fuzz harness, that failure edge has an injection test, this invariant has a checker.
- **Lint the gap.** An obligation with no matching test is a finding — named, listable, and attributable to
  the model element that generated it — so the absence is surfaced, not silently tolerated.
- **Regrow the denominator on every model change.** Because the obligation set is derived, adding a seam or
  a failure edge adds an obligation, so a newly-introduced surface with no test reopens the gap until a
  test closes it.
- **Lint the join in both directions.** The gap is not only obligations with no test; it is also tests
  naming an obligation that no longer exists. A harness pointed at a derived target id that the model no
  longer declares is a **rename-orphan** — a test stranded when its target was renamed or removed. Linting
  target→test catches the *missing* test; linting test→target catches the *stale* one, so a rename cannot
  silently leave a harness fuzzing nothing.
- **Generalize across obligation kinds.** The same derive-and-lint shape covers fuzz targets, injection
  tests, and invariant checkers; one census genre, several obligation categories, rather than a separate
  hand-audit per kind.

## Prerequisites

- **Models that declare a testable surface.** The census can only derive obligations a model states — a
  seam registry, an enumerated failure-edge set, an invariant list; without such a model there is nothing
  to derive the denominator from.
- **A matchable test corpus.** Existing tests must be joinable to obligations (by naming convention, tag,
  or registry) so the gap can be computed rather than guessed.
- **A gate that treats an unmet obligation as a finding.** The value is the lint; a derived list nobody
  checks is just another report.

## Consequences & costs

- **Untested categories become visible.** A whole class of obligation sitting at zero is a listable set of
  findings, not a blind spot a rising coverage percentage hides.
- **The join must be kept accurate.** A test the census fails to match to its obligation reports a false
  gap; a stale match reports false safety. The matching rule is load-bearing and must track how tests are
  named and tagged.
- **It measures obligation coverage, not test quality.** A matched obligation counts as covered even if its
  test is weak; the census closes the "no test at all" gap, and leans on other mechanisms to judge whether
  the test that exists is strong.

## Known uses

- A fuzz-target census that derives the should-be-fuzzed set from the external-seam model and flags the
  seams with no harness.
- An error-path census that derives the should-have-injection set from the failure-edge model and flags the
  edges with no failure-injection test.
- The same derive-and-lint shape reused for invariant checkers, so a cross-service invariant declared
  without a verifier is a finding rather than an untested predicate.
- The reverse-direction check: a fuzz harness whose named target id resolves to no model-declared seam is
  flagged as a rename-orphan, so renaming a seam reddens the harness that still points at the old id rather
  than leaving it silently dead.

## Related mechanisms

- **Generalization** — [coverage-model-mapping](coverage-model-mapping.md): that maps which *invariants*
  are tested; this census generalizes the same idea across obligation kinds — seams to fuzz, edges to
  inject, invariants to check — deriving each obligation set from its model and linting the gap.
- **Consumer** — [executable-source-of-truth](executable-source-of-truth.md): the census reads the models
  as data to derive its obligations, so its denominator is exactly what those models declare — it depends
  on the models being executable records, not prose.
- **Enabler** — [fuzz-campaigns](../../product/regression-tests/fuzz-campaigns.md): the census names *which* seams owe a fuzz harness; the
  campaigns are the harnesses that discharge those obligations.
- **Sibling** — [journey-task-closure](journey-task-closure.md): both derive a test obligation from a
  declared model element rather than from lines of code — that one a journey's terminal post-condition,
  this one a seam or edge's owed test.
- *See also* — [meta-model-consumption](meta-model-consumption.md): deriving the obligation set by reading
  the models, rather than hardcoding a target list, is that read-don't-duplicate discipline.
