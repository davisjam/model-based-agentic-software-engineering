<!-- note-spread: 1 -->

**Intent** — Project test coverage onto the *model's nodes* — its states, seams, and invariants — so "is this
invariant tested?" becomes a queried fact instead of a guess from a line-coverage percentage. The map turns
the model into a test work-list: an invariant node with no covering test is a visible gap that drives the
next test.

## Problem

Line and branch coverage tell you what fraction of the code ran under test, not which of the system's
invariants are actually exercised. A model can show 90% line coverage while a critical race invariant has zero
tests touching its states, because coverage counts lines, not meanings. So the invariants you most need
verified hide inside a high aggregate number, and "are we testing the thing that matters?" is unanswerable
from the coverage report. The failure is a false sense of test adequacy: a green coverage number sitting over
an untested critical invariant.

## Mechanism

A mapping projects the suite's coverage data onto the model's nodes. Each node — a state-machine state, an IPC
seam, an invariant — joins to the tests that exercise it, for instance at function granularity by naming which
covered functions realize the node. The result is a per-node fact: covered, uncovered, or covered by which
tests. Two uses ride on it: a backlog, where the uncovered critical nodes are the next tests to write and a
sweep walks them; and, once promoted, a gate, where a critical invariant node with no covering test fails the
build. It sits on the executable-source-of-truth substrate [appendix: executable-source-of-truth].

## Engineering Consequences

The question becomes per-node — which invariants, states, and seams have a covering test, and which have
none — instead of one aggregate a threshold satisfies while a specific invariant stays untested. The
uncovered node is actionable: a concrete next test. Backlog-versus-gate is a judgment: gating every node
starves throughput, gating none leaves criticals untested, and the criticality scope is the tuning surface
between them.

## Implementation Seam

The pattern rests on the coverage-to-node mapping, the node-to-code join that attributes coverage to the right
node, a criticality policy naming which nodes must be covered, and the two consumers — the backlog sweep and
the promotable gate. It requires a structured model with addressable nodes and coverage data attributable to
the code realizing each node.

## Known Limitations

The join is only as good as the node-to-code mapping: a node mapped to the wrong functions gets
mis-attributed coverage. Coverage is not correctness — a covered node is exercised, not proven, so pair it
with a proof mechanism [appendix: formal-invariant-verification] for invariants that need proof.
Function-granularity coverage cannot separate two invariants realized by the same function.
