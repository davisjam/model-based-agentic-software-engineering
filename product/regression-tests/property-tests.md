# FsCheck property tests

**Intent** — Property-based tests that assert *invariants* (round-trip, combinatorial) over
machine-*generated* inputs, catching bugs in the input space that example-based tests never reach.

| | |
|---|---|
| Summary | FsCheck invariants over generated inputs find hidden bugs. |
| Target | Product · **Regression tests** |
| Form | `regression` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) — a repeatable regression body; shrinks to a minimal counterexample |

*Its place in the environment — **merged into Generative Validation** (the tame-oracle pole; two sides of one coin), under **COMPLETE · Establish completion on re-derived evidence**.*

## Motivation — the failure it kills

Example-based tests only check the cases you *thought of*. Invariants (read∘write = identity, a
combinatorial property that must hold for all inputs) fail on inputs you never imagined and never
wrote a test for. The failure is *a bug living in the untested input space*, and it recurs for any
invariant-shaped contract that hand-picked examples under-cover.

## Why it's not just "write more example tests"

Examples check *points*; you cannot enumerate a document's input space by hand, and the bug is almost
always in the case you didn't write. A property test asserts an **invariant over generated inputs**
(FsCheck synthesizes them) and, on failure, **shrinks** to a minimal counterexample you can debug. Can a
finite set of hand-picked examples cover a document's input space? It cannot, and the bug is almost
always in the case no one wrote. A property checked over generated inputs surfaces the latent bug that a
hundred examples would miss.

## Two sides of one coin — the generative-validation family

Property testing and fuzzing are the same move: **generate inputs and try to falsify a specification.**
They differ only in what the specification *is* and how wild the inputs get. A property test declares a
rich oracle (the invariant) but asks it of tame, well-typed inputs. A fuzzer has a coarse oracle
("never crash, never corrupt") but reaches wild, malformed inputs a typed generator never emits. The
synthesis — **fuzz + model-based engineering** — takes both halves: wild inputs judged against the
structured model as oracle, so you fuzz against a stable point in the specification and the fix generalizes
to every legal input. That synthesis is where the model *becomes* the oracle; for its detail, see the
[fuzz-campaigns](fuzz-campaigns.md) entry. This entry stays on the property side: the author-declared
invariant over generated inputs.

## Mechanism

FsCheck.Xunit properties (round-trip and combinatorial invariants) live across the test projects; you
add them when a class has a property-shaped contract. FsCheck generates inputs, checks the property, and
shrinks any failure to the smallest input that still breaks it.

## Prerequisites

- **FsCheck** and **generators** for the domain types.
- **Identified invariants** — a class whose contract is expressible as a property (round-trip, idempotence, a combinatorial law).
- Determinism in the property, or it flakes.

## Consequences & costs

- **Generators are real work** to write for rich domain types.
- **The property must be stated correctly** — a wrong invariant yields false failures or, worse, false
  confidence.
- **Nondeterministic properties flake** — the invariant must be a true function of the input.

## Known uses

- FsCheck.Xunit properties across the test projects (round-trip / combinatorial invariants).
- Added per-class when a property-shaped invariant exists (the pilot + triage discipline).

## Related mechanisms

- *See also (sibling)* — [test-onion-tiers](test-onion-tiers.md), [fuzz-campaigns](fuzz-campaigns.md):
  examples-in-tiers and adversarial-fuzzing complement invariant-checking.
- **Consumer** — properties are asserted over the structured models
  ([pdf-model](../canonical-models-and-seams/pdf-model.md) et al.): round-trip properties over a model
  are how you pin its read/write invariants.
