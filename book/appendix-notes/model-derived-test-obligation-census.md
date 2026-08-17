<!-- note-spread: 1 -->

**Intent** — Derive the set of things that *should* be tested from the structured models themselves — every
external seam that should be fuzzed, every failure edge that should have an injection test, every invariant
that should have a checker — and lint the gap between that derived obligation set and the tests that
actually exist. Coverage stops being a percentage over lines you happened to write and becomes a walk over
the model: an untested obligation is a named, listable finding, not an absence nobody notices.

## Problem

Line coverage measures the code you wrote *and* tested; it is blind to the code you should have written a
test for and didn't. The dangerous gaps are the ones nothing points at — an external seam never fuzzed, a
failure edge with no injection test, a cross-service invariant with no checker. A percentage climbs toward a
hundred while whole *categories* of obligation sit at zero, because coverage counts what exists and cannot
count what's missing. And the obligation set is not static: every new seam, edge, and invariant adds one,
and a coverage number never says "you added a thing that should be tested and didn't test it."

## Mechanism

Walk the structured models that declare a testable surface: the seam registry yields fuzz targets, the
error-path model yields injection obligations, the invariant model yields the checkers owed. Join each
derived obligation against the test corpus by naming convention, tag, or registry. An obligation with no
matching test is a finding — named, and attributable to the model element that generated it; and, in
reverse, a test naming an obligation the model no longer declares is a rename-orphan finding, so the join is
linted both ways. Because the set is *derived*, adding a seam adds an obligation, so a newly-introduced
surface with no test reopens the gap until a test closes it. One derive-and-lint shape covers all three obligation kinds, rather than a separate
hand-audit per kind.

## Engineering Consequences

A whole class of obligation sitting at zero becomes a listable set of findings, not a blind spot a rising
percentage hides. The denominator flips from *what you built* to *what the models say should be tested* —
the set a coverage report structurally cannot see.

## Implementation Seam

The censuses that derive the should-be-fuzzed and should-have-injection sets from the seam and error-path
models, the same shape reused for invariant checkers, and the gate that treats an unmet obligation as a
build finding — a derived list nobody checks is just another report.

## Known Limitations

The join must stay accurate: a test the census fails to match to its obligation reports a false gap, and a
stale match reports false safety, so the matching rule tracks how tests are named and tagged. The line it draws is obligation coverage, not test quality: a matched obligation counts as covered even if
its test is weak, so it closes the "no test at all" gap and leans on other mechanisms to judge test strength.
