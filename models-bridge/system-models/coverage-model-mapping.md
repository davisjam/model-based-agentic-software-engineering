# Coverage → model-node mapping (which invariants are actually tested)

**Intent** — Project test coverage onto the *model's nodes* (its states, seams, and invariants), so "is
this invariant tested?" is a queried fact, not a guess from a line-coverage percentage. The map turns the
model into a test **work-list**: an invariant node with no covering test is a visible gap that drives the
next test (our instance: a coverage-reference mapping test coverage onto the cross-service state-machine
model's nodes at function granularity).

| | |
|---|---|
| Summary | Project test coverage onto model nodes (states, seams, invariants) so untested ones are visible. |
| Target | Bridge · **System models** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Soft·Hard** — a per-node coverage map that *surfaces* untested nodes (a backlog); promotable to a gate that *requires* a covering test for critical nodes |
| Governs | `all-models` — test coverage is projected onto every model's nodes |

*Its place in the environment — a **variant / known-use** of **Model-Derived Assurance Coverage**, under **COMPLETE · Establish completion on re-derived evidence**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Line and branch coverage tell you what *fraction of the code* ran under test, not *which of the system's
invariants* are actually exercised. A model can show 90% line coverage while a critical race invariant
has zero tests touching its states, because coverage counts lines, not *meanings*. So the invariants you
most need verified hide inside a high aggregate number, and "are we testing the thing that matters?" is
unanswerable from the coverage report. The failure is **a false sense of test adequacy**: a green
coverage number sitting over an untested critical invariant.

## Why it's not just "line coverage" (or a coverage threshold)

A coverage percentage is over *lines*, aggregated; this map is over *model nodes* (a state, an IPC seam,
an invariant). It joins the coverage data to the structured model, so the question becomes "which invariants /
states / seams have a covering test, and which have none?", answerable **per node**, not as one number. A
line-coverage threshold can be met while a specific invariant is untested; a per-node map cannot hide
that. And it is *actionable*: an uncovered node is a concrete next test, so the model becomes the test
**work-list** ("cover *this* invariant"), not a percentage to chase. A line-coverage number aggregates
away the one fact you needed: whether the invariant that matters ran at all. The per-node map keeps that
fact, one row per meaning of the system.

## Mechanism

A mapping projects the test suite's coverage data onto the model's nodes. Each node (a state-machine
state, an IPC seam, an invariant) is joined to the tests that exercise it (e.g. at function granularity:
which covered functions realize the node). The result is a per-node coverage fact: covered / uncovered /
by-which-tests. Two uses ride on it — a **backlog** (the uncovered critical nodes are the next tests
to write; a sweep walks them), and, promoted, a **gate** (a critical invariant node with no covering
test fails the build). It sits on the executable-source-of-truth substrate (the nodes are structured model
entities) and completes the verification family: parity keeps the model matching reality, formal
verification *proves* an invariant, this *measures* whether any test exercises it at all.

## Prerequisites

- **A structured model with addressable nodes** — states, seams, invariants as first-class entities coverage
  can join to.
- **Coverage data mappable to nodes** — line/function coverage that can be attributed to the code
  realizing each node.
- **The node → code join** — a mapping from a node to the functions/regions that realize it, so coverage
  attributes to the right node.
- **A criticality policy** — which nodes *must* be covered (the gate's scope), so the map drives a
  backlog first and a gate only where it earns it.

## Consequences & costs

- **The join is only as good as the node→code mapping.** A node mapped to the wrong functions gets
  mis-attributed coverage; the map inherits that fidelity.
- **Coverage ≠ correctness.** A node with a covering test is *exercised*, not *proven*. Pair it with
  formal verification for invariants that need proof.
- **Granularity limits sharpness.** Function-granularity coverage can't separate two invariants realized
  by the same function; the map is only as sharp as the coverage.
- **Backlog-vs-gate is a judgment.** Gating every node starves throughput; gating none leaves criticals
  untested — the criticality scope is the tuning surface.

## Known uses

- A coverage-reference mapping projecting test coverage onto the state-machine model's nodes (states, IPC
  seams, invariants) at function granularity.
- The model-as-work-list: a sweep that walks the uncovered critical nodes and writes the missing tests.
- (Promotable) a gate requiring a covering test for each critical invariant node.

## Related mechanisms

- **Counterpart** — [formal-invariant-verification](formal-invariant-verification.md): that *proves* an
  invariant holds across every interleaving; this *measures* whether any test exercises the node at all.
  Proof vs exercise: complementary, and a critical node ideally has both.
- **Enabler** — [executable-source-of-truth](executable-source-of-truth.md): the nodes coverage joins to
  are fields on the structured model; this is one more consumer of that substrate.
- *See also* — [drift-parity-gates](drift-parity-gates.md): three angles on trusting the model. Parity
  keeps it matching the world, formal verification keeps its claims *true*, and this keeps its claims
  *exercised*.
