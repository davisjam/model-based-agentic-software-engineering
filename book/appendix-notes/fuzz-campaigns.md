<!-- note-spread: 2 -->

**Intent** — Campaigns that feed malformed and adversarial inputs to the tool to find crashes and
corruption, with coverage collected automatically, plus an RCA discipline that fixes to the
specification, not the failing seed.

## Problem

Real-world documents are malformed in ways no hand-written test anticipates: a truncated stream, an odd
encoding, a structure right at the edge of what the spec allows. A fuzzer finds the crash or corruption on
inputs you would never think to write, hiding across an input space far too large to enumerate.

## Mechanism

Fuzz harnesses run the tool against generated malformed inputs. On a finding, the RCA discipline fixes to
the stable point in the format spec, not the seed, so the fix passes every spec-allowed input, not just the
one that crashed.

Two moves sharpen this beyond random bytes:

- **The producer-dialect corpus.** The failure space that matters is producer diversity, not pure
  randomness. A format has one specification but many independent writers, each emitting its own accent
  within the grammar — a rival office suite, a different PDF writer, a conversion tool, a from-code
  generator — producing legal-but-unusual object orderings your own writer never emits. Round-trip a real
  document through a genuine third-party producer and let its dialect be the adversarial input: no mutation
  engine needed, the diversity is already out there. This reaches the class that hurts in production — a
  user uploads a file from a tool you never tested.
- **The model as oracle.** Plain fuzzing has a coarse oracle — never crash, never corrupt — with no
  declared notion of a correct answer on a wild input. A structured model already names a stable spec
  point: a closed set of legal outcome classes, an invariant predicate, a state-transition table. Point the
  wild inputs at the model's entry surface and judge the result against that set. A clean structured
  rejection of an illegal input passes; an outcome outside the set — an unexpected exception, a corrupted
  structure, a forbidden transition, a false invariant — fails.

<!-- note-fold -->

## Engineering Consequences

The two moves compose: feed the producer's wild dialect to the model's entry point and classify the
result against the model's declared outcome set. Wild input and a rich oracle at once — and a fix that
holds for the whole format, because the oracle is the model's own declaration, so a fix aimed at its
stable point closes every input the specification allows rather than the one seed. This is the RCA
discipline expressed structurally: the model is the stable spec point written down, so
RCA-to-the-spec-point and judged-against-the-model become one move.

The synthesis scales from formats to concurrency. There the input is an interleaving of concurrent steps,
the generator is an interleaving-fuzzer or an exhaustive walk over reachable states, and the oracle is an
invariant predicate over the model's states — no two workers hold the same lease, a job never leaves a
terminal state, a queued item is eventually served. Naming the predicate points the search straight at
the interleaving that violates it, a defect a strong-but-static unit suite walks right past. Because the
oracle is a declared property and not a per-seed check, a campaign that finds nothing is proof-shaped — one
linear-invariant campaign cleared 200 adversarial inputs with the invariant holding on every one, and the
same technique caught a real zip-bomb, a never-raise-contract breach, and four latent parser crashes before
the model-derivation half landed.

Use this when the input is adversarial or malformed by nature. Don't fuzz a closed, well-typed interface —
random bytes there buy noise, not coverage.


## Implementation Seam

Fuzz and campaign harnesses plus a corpus of malformed inputs — random and adversarial bytes, and for the
sharper corpus a set of real third-party producers of the format to round-trip through. A coverage
collector, aggregator, and baseline make reach measurable. The model-as-oracle form additionally needs a
structured model that declares the stable spec point — a closed legal-outcome set, an invariant
predicate, or a state-transition table — for the wild input to be judged against.

## Known Limitations

Campaigns cost real compute; coverage is tracked to know when they have saturated, and the baseline must
be re-based only on intentional coverage-shape changes. Seed-fixing is the anti-pattern the RCA
discipline exists to prevent — patching only the failing input leaves the spec-class open. The model-as-oracle form is only as good as its declared outcome set: an outcome the model never named as
legal or illegal escapes judgment entirely.
