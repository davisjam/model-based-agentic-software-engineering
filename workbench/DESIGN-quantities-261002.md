# Phase I — quantitative models: design

Quantities let the workbench answer *does this satisfy the modeled latency and memory requirements?*
Phase I is now on the critical path: the Document Processing example (`requirements-default-examples-261002.md`
§5) cannot be authored without it, and invariant EX-I3 — the example set collectively demonstrating
quantitative performance reasoning — cannot be satisfied until it lands.

The ruling is in `requirements-rdf-sparql-smt-261002.md` §5–§10 and §29, and `PLAN.md` §1a.3. This
document turns that into an implementable design and records what the ruling leaves open.

---

## 1. The hard boundary: quantities are not state

> Quantitative annotations SHALL NOT enter the behavioral state vector merely because their values
> are real-valued. — §6

A configuration is machine control states plus finite mutable variables, and nothing else. Quantities
are annotations **evaluated over** configurations, transitions, paths, or model structure. So

    latency: 5 ms      hit_rate: 0.80      memory: 128 MB

does not make the reachable configuration space infinite.

The IR already honours this and the reason is written down in `src/ir/types.ts`: `Configuration`
carries `control` and `values` only, with properties and derived values deliberately excluded —
properties because they are immutable (V16), derived because they are recomputed and never stored
(V18). Quantities join that list for the same reason: keeping them out is what preserves the finite
exploration guarantee the whole engine rests on.

This is the one place where a convenience shortcut would be unrecoverable. A quantity admitted into
the state vector turns exhaustive coverage into a lie that every subsequent result inherits, and
`Coverage.kind: "exhaustive"` is load-bearing for the strongest claims the workbench makes.

## 2. Dimensions are typed; literals normalize at canonicalization

Five core dimensions (§5, with `ratio` added by the §29 ruling):

| Dimension | Base | Notes |
|---|---|---|
| `duration` | `ms` | `s: 1000` |
| `memory` | `MB` | `KB: 0.0009765625`, `GB: 1024` |
| `cost` | `usd` | |
| `ratio` | `1` | constrained to `[0, 1]` — hit rates, probabilities |
| `count` | — | dimensionless |

Two rules, and the second is the one that earns the feature:

- **Literals normalize to the base unit during model normalization** (§7). `canonicalize()` is where
  this belongs: it is already the total, deterministic, non-validating projection, so a quantity
  arrives downstream in base units or not at all.
- **Operations across incompatible dimensions fail validation.** `250 ms + 2 s` valid; `128 MB + 1 GB`
  valid; `250 ms + 128 MB` invalid. §7 is explicit: *do not silently coerce dimensions.* This is a new
  numbered rule, and it is the kind that pays for itself — a dimension error is exactly the defect
  that produces a plausible number nobody questions.

`ratio`'s `[0, 1]` constraint is itself a validation rule, not a comment. A hit rate of `1.3` must be
a finding.

## 3. The ruling that replaces aggregation operators: scope follows the dimension

> Memory is principally a property over configurations. Latency and cost are principally properties
> over executions. This gives us cleaner semantics than an arbitrary list of aggregation operators.
> This distinction should be visible in the IR. — §8

This is the design's load-bearing idea, so state it as a typed field rather than a convention:

    QuantityScope = "configuration" | "execution"

- **Configuration-scoped** (memory). Evaluated at a point in the state space:
  `peak_memory = max over reachable configurations c of memory(c)`.
- **Execution-scoped** (latency, cost). Evaluated along a trace:
  `latency(trace) = sum of transition/entity/relation latency`.

What this buys: the aggregation is **derived from the dimension's scope**, not chosen per query. A
user cannot ask for the sum of a configuration-scoped quantity along a path, because that is a
category error the type system can refuse rather than a wrong answer the engine computes. §29's
refinement ① says the same thing from the other side — *do not make `max|min|named` a fundamental
execution-path selector; distinguish paths and traces from analyses over them.*

## 4. Addressing: every quantity targets a stable semantic ID

    quantities:
      parse-latency:   { target: transition:parse,                dimension: duration, value: 20 ms }
      gateway-latency: { target: relation:remediation-gateway,     dimension: duration, range: [100 ms, 500 ms] }
      cache-memory:    { target: entity:cache,                     dimension: memory,   value: 128 MB }

Targets resolve during validation. **A quantity whose target does not exist is an error** — no
dangling annotations (§9). Note the failure this prevents is the V26 failure one layer up: an
annotation pointing at a deleted transition is not invalid, it is *wrong*, and nothing reports it
unless a rule does.

The `target:` prefix set (`transition:`, `relation:`, `entity:`, `state:`, `parameter:`, `model:`)
must be a closed typed union, matching how this project handles every other closed vocabulary.

## 5. Model metrics live in a reserved namespace

Facts computed *from* the model are not facts asserted *about* the modeled system, and §10 requires
the distinction be explicit rather than ambient:

    metrics.state_count   metrics.transition_count   metrics.entity_count   metrics.relation_count

permitting `value: { expression: metrics.state_count * 2 ms }` while making clear that
`state_count` describes the model. *They must never appear as ambient magic identifiers* — so
`metrics` is reserved, and a user variable named `metrics` is a finding.

## 6. Requirements are first-class, and produce evidence

    requirements:
      - { id: normal-latency, quantity: path-latency, operator: "<=", bound: 750 ms }
      - { id: peak-memory,    quantity: peak-memory,  operator: "<=", bound: 512 MB }

A requirement evaluates to the existing `Outcome` vocabulary with the existing `Evidence`. The
Document Processing example's expected shape (§5.5) is a counterexample carrying the trace and the
bound that licensed it:

    Maximum modeled latency: 1,425 ms      Requirement: <= 750 ms      Status: counterexample found
    Trace: uploaded -> parsing -> remediating -> failed -> waiting -> remediating -> validating -> published
    Bound: retry_count in [0,3]

No new outcome vocabulary. A requirement is a claim; it holds, is refuted with a counterexample, is
inconclusive under incomplete coverage, or is unlicensed.

## 7. The flagship not-answerable case

§5.6: add a cache with an 80% hit rate and ask whether expected latency improves. **If the hit rate
is omitted, the expected-latency query must return**

> Not answerable. The model represents hit and miss costs but deliberately omits their frequencies.

This is purposeful omission applied to quantitative reasoning, and it is the example the spec calls
flagship. Mechanically it is `outcome: "unlicensed"` with a `refusal` naming the missing
distinction — the same shape the graph engine already uses when path composition is forbidden. The
refusal must name *what is missing*, not merely decline: a refusal that does not tell the author what
to model is a dead end rather than a direction.

---

## 8. Open questions

Six. Each changes the implementation, and three change the semantics.

### Q1 — Does v0.1 do interval arithmetic, or worst-case only?

`gateway-latency` is declared `range: [100 ms, 500 ms]`. A maximum-latency analysis can take the
upper bound and be done. But a *minimum* analysis takes the lower, and anything comparing two paths
needs both, which is interval arithmetic.

The §29 ruling says: *once SMT exists we should use it rather than deliberately maintaining a weaker
interval-analysis semantics.* That settles the end state and leaves v0.1 open. The honest cheap
option is **worst-case only** — compute with the bound the requirement's operator selects (`<=`
takes the upper), and refuse any query needing both ends until SMT lands. The alternative is to build
interval arithmetic now and throw it away, which is exactly what the ruling warns against.

**Recommendation: worst-case only, refusing two-ended queries with a named refusal.** It is less
capable and it does not lie about being more.

### Q2 — What declares the accounting model?

§8: *sum transition/entity/relation latency according to the declared accounting model.* Nothing says
where that declaration lives or what the choices are. Does a traversal of a relation cost its
latency? Does entering a state cost the state's quantity, or the transition's, or both? Summing all
three double-counts a pipeline modelled with latency on both the stage and the edge into it.

This is underdetermined in the spec and it must be pinned, because two defensible readings give
different numbers for the Document Processing example and both look right.

### Q3 — `memory(c)` is defined approximately; it needs a predicate

§8 offers *retained memory of active states/entities in c, plus temporary memory associated with the
active operation* — and says "approximately". "Active" is doing the work and is not defined. In a
configuration where machine A is in `remediating` and machine B is in `idle`, is B's entity memory
retained? Does a containment parent count when a child is active?

An approximate definition is fine in a requirements document and not implementable. v0.1 needs one
precise predicate, stated in the semantics and pinned by a test, even if it is deliberately crude.

### Q4 — Is expectation in scope at all for v0.1?

The cache what-if asks for **expected** latency, which needs probability composition over paths —
a genuinely different analysis from a maximum over paths. With `ratio` as a dimension the inputs
exist, but expectation over a branching state space is where this stops being "modest quantitative
modeling" (§5) and starts being a probabilistic model checker.

**Recommendation: no.** Ship the maximum and the not-answerable refusal; let the hit-rate question be
answered by two hypotheses the user compares — all-hit and all-miss — which the hypothesis machinery
already supports and which teaches the bound honestly. If expectation is wanted, it is its own phase.

### Q5 — What is the outcome shape when an additive maximum is unbounded?

§29 ①: *a positive repeatable cycle makes an additive maximum unbounded, and that produces a CYCLE
WITNESS rather than a refusal.*

The existing vocabulary has `Outcome = holds | refuted | inconclusive | unlicensed` and
`EvidenceShape` includes `lasso`. An unbounded maximum against a `<=` requirement is naturally
**`refuted` with a `lasso` witness** — the cycle *is* the counterexample, and it refutes any finite
bound. That reading needs no new vocabulary, which is the strongest argument for it.

Worth confirming, because the alternative reading — a distinct outcome meaning "unbounded" — would
be a vocabulary change, and this project has been deliberate about keeping that set closed.

### Q6 — Do quantities project to RDF, and are they queryable in SPARQL?

Phase J layer 1 is being built now. §4's own illustration includes `gateway latencyMs 250` inside a
named graph, which implies yes. But a quantity carries a dimension, a unit, a target and possibly a
range, and flattening it to a bare literal loses the dimension — at which point SPARQL can add
milliseconds to megabytes, which §7 forbids at the validation layer.

Either quantities project as structured resources (preserving the dimension, costing query
ergonomics) or they stay out of the RDF projection in v0.1. Sequencing note: the RDF work is in
flight and does not depend on this answer, so deciding it after that lands costs nothing.

---

## 9. What this does not change

The hash. §28, already satisfied: the semantic revision hash is computed over the canonicalized typed
IR, which `src/ir/hash.ts` does. Quantities are semantic, so they enter the hash — unlike annotation,
which is excluded by invariant A1. Those two facts sit side by side and are easy to confuse: a note
saying *"gateway latency is probably 200 ms"* cannot change a latency query, while a declared
quantity of `200 ms` must. That contrast is the clearest statement of where the formal boundary lies,
and it belongs in the semantics document next to both.
