# Fuzz campaigns (+ auto-coverage)

**Intent** — Campaigns that feed malformed and adversarial inputs to the tool to find crashes and
corruption, with coverage collected automatically, plus an RCA discipline that fixes to the *spec*, not
the failing seed.

| | |
|---|---|
| Summary | Malformed-input campaigns; fix to the spec, not the seed. |
| Target | Product · **Regression tests** |
| Form | `regression` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) — a repeatable campaign body; coverage tracked against a baseline |

*Its place in the environment — the **canonical mechanism** for **COMPLETE · Establish completion on re-derived evidence**.*

## Motivation — the failure it kills

Real-world documents are malformed in ways no hand-written test anticipates: a truncated stream, an odd
encoding, a structure right at the edge of what the spec allows. A fuzzer finds the crash or corruption on inputs you would never think
to write. The failure is *crashes / corruption on adversarial or spec-edge inputs*, and it hides across
an input space far too large to enumerate.

## Why it's not just "property tests" (or "more example inputs")

Property tests check invariants over *structured, generated* inputs; fuzzing throws **malformed,
adversarial bytes** to find crashes and spec-edge failures the structured generators don't reach. And
the payoff is multiplied by an **RCA discipline**: fix to the *stable point in the format spec*, not to
the failing seed, so the fix passes *every* spec-allowed input, not just the one that crashed.
Structured generation is a good tool, and it does find bugs, until the corruption lives in bytes no
generator would produce. Adversarial campaigns reach that space, and fixing to the spec closes the whole
class the seed exposed rather than the one seed. Auto-coverage tracks what the campaign actually reached
so gains are measurable, not assumed.

Two moves sharpen this beyond random bytes, and they are the depth of this entry — the **producer-
dialect corpus** (real independent producers of a format supply the adversarial input, so the campaign
occupies the whole spec-allowed producer space instead of a random slice) and **fuzz + model-based
engineering** (the structured model becomes the oracle, so you fuzz against a stable point in the
specification and the fix generalizes to every legal input). Both are detailed below.

## Mechanism

Fuzz / campaign harnesses run the tool against generated malformed inputs. The host test-runner
auto-appends coverage collection when a fuzz/campaign filter is in play, aggregated against a
baseline. On a finding, the RCA discipline mandates root-cause analysis to the stable spec point
rather than patching the seed.

## Where the inputs come from — the producer-dialect corpus

Random and adversarial bytes are the crude generator; the sharp one is a **producer-dialect corpus.**
The insight: the failure space that matters is not pure randomness — it is *producer diversity.* A
document format has one specification but many independent writers, and each writer emits its own
*accent* within the grammar. A different office suite, a different PDF writer, a document-conversion
tool, a from-code generator — each produces unusual-but-valid object orderings, obscure-but-permitted
structures, features the specification allows and your own writer never uses. Those are exactly the
spec-legal-but-rare paths a from-scratch byte generator will almost never reach.

- **The world's producers are the generator.** Round-trip a real document through a genuine
  third-party producer, and let that producer's legal-but-unusual dialect be the adversarial input. No
  mutation engine is needed — the diversity is already out there, produced by tools that never
  coordinated on a canonical encoding.
- **It reasons *outward*, not inward.** A random fuzzer mutates *toward* malformed bytes and hopes to
  trip something. A producer-dialect corpus generates inputs that occupy the whole
  specification-allowed producer space, so the tool is tested against the full breadth of what the
  format legally permits rather than the narrow slice its own tooling happens to emit.
- **It catches the real-world class.** The bug that hurts in production is "a real user uploaded a file
  from a tool we never tested, and its perfectly-legal-but-unusual dialect broke us." A random fuzzer
  rarely synthesizes that dialect; the producer that emits it every day does so on the first
  round-trip. This is the highest-fidelity corpus a fuzzing effort can hold.

## The deepest form — fuzz + model-based engineering (the model as oracle)

The synthesis that makes fuzzing precise: **let the structured model itself be the fuzzer's oracle.** Plain
fuzzing has a coarse oracle — "never crash, never corrupt" — because it has no declared notion of what
a *correct* answer looks like on a wild input. When the tool has an explicit structured model of the
domain, that model already names a *stable point in the specification*: a closed set of legal outcome
classes, an invariant predicate, a state-transition table. Point the wild inputs at the model's own
entry surface, and judge the outcome against that declared set.

- **You fuzz against the spec, not the producer's quirks.** A clean, typed rejection of an illegal
  input is a *pass* — the model refused it correctly. An outcome *outside* the declared legal set — an
  unexpected exception, a silently corrupted structure, a transition the table forbids, an invariant
  predicate gone false — is a *fail.* The oracle is now as rich as a hand-written invariant, and the
  inputs are as wild as a fuzzer's. The trade-off between rich-oracle and wild-input is gone.
- **The fix generalizes to every spec-allowed input.** Because the oracle is the model's own
  declaration — the closed outcome set, not a per-seed assertion — a fix aimed at the model's stable
  point closes *every* input the specification allows, not just the failing seed. This is the RCA
  discipline expressed structurally: the model *is* the stable spec point, written down, so RCA-to-the-
  spec-point and judged-against-the-model are the same move.
- **It scales up from formats to concurrency.** The same synthesis applies when the specification is
  not a document format but a **concurrency invariant.** There the "input" is an interleaving of
  concurrent steps, the generator is an interleaving-fuzzer or an exhaustive walk over reachable
  states, and the oracle is the invariant predicate evaluated over the model's states — no two workers
  hold the same lease, a job never leaves a terminal state, a queued item is eventually served. Naming
  the predicate predicts where the bug is: writing the exact condition down forces the search straight
  at the interleaving that violates it — a defect a strong-but-static unit suite walks right past.
- **A clean run over a model-derived oracle is proof-shaped.** When the oracle is the model's own declared
  outcome set rather than a per-seed assertion, a campaign that finds nothing is not merely "no crash on the
  seeds we tried" — it is evidence the invariant held across the whole adversarial space the campaign swept.
  One model-indexed invariant campaign ran clean over its linear-invariant subset: for 200 adversarial
  membership inputs, the total-clearing invariant held on every one. A result of that shape reads like a
  bounded proof of the invariant, not a spot-check — the difference between "we fuzzed it and nothing broke"
  and "the declared property survived the swept space."

The producer-dialect corpus and the model-as-oracle compose: feed the producer's wild dialect to the
model's entry point and classify the result against the model's declared outcome set. Wild input, rich
oracle, and a fix that holds for the whole format — all at once.

## Prerequisites

- **Fuzz harnesses** and a corpus/generator of malformed inputs — random and adversarial bytes, plus,
  for the sharper corpus, a set of real third-party producers of the format to round-trip through.
- **A coverage collector + aggregator + baseline** so reach is measurable.
- **RCA discipline** (fix to the spec, not the seed) — without it, fuzzing devolves into seed whack-a-mole.
- **For the model-as-oracle form: a structured model** that declares the stable spec point — a closed
  legal-outcome set, an invariant predicate, or a state-transition table — for the wild input to be
  judged against.

## Consequences & costs

- **Compute-heavy.** Campaigns cost real time; coverage is tracked to know when they've
  saturated.
- **Baseline maintenance.** The coverage baseline must be re-based only on intentional coverage-shape
  changes.
- **Seed-fixing is the anti-pattern** the RCA discipline exists to prevent — fixing only the failing
  input leaves the spec-class open.

## Known uses

- Fuzz / campaign harnesses + auto-coverage collection and aggregation.
- The fix-to-the-stable-spec-point RCA discipline.
- A **producer-dialect corpus** built from a set of independent third-party producers of the document
  formats (rival office suites, PDF writers, document-conversion and from-code generators): each
  round-trips a document so its legal-but-unusual dialect becomes fuzz input.
- The **model-as-oracle form, with real catches.** Malformed inputs pointed at the structured model's read
  entry point, classified against its declared legal-outcome set. Before the model-derivation half even
  landed, the technique caught a **decompression-amplification upload** (under a megabyte on the wire
  expanding to hundreds of megabytes on decompress — a zip bomb), a **never-raise-contract breach** on a
  malformed archive central directory (an entry point contracted never to throw, throwing), and **four
  latent element-granularity crashes** in a structured-tree parser. The concurrency-invariant variant judges
  an exhaustive interleaving search against a state-machine's invariant predicate.

## Related mechanisms

- *See also (sibling)* — [property-tests](property-tests.md) (structured generation),
  [test-onion-tiers](test-onion-tiers.md) (example tiers).
- **Counterpart** — the coverage baseline tracks what the campaign reached, keeping "we fuzzed it"
  honest.
