# Pending decisions — the quantitative accounting model

Two questions block the quantitative **evaluator**, and through it the Document Processing example
and invariant EX-I3. Everything else in Phase I is landed: quantities are typed, dimensionally
checked, normalized to base units, addressed against stable ids, and validated by rules V27–V31 on
both implementations.

**Why these two and not the other four.** Q1 (interval arithmetic), Q4 (expectation), Q5 (unbounded
maximum) and Q6 (RDF projection) are engineering judgment — I have recommendations and they can be
implemented and changed. Q2 and Q3 are different: they are **underdetermination in the requirements**.
§8 of `requirements-rdf-sparql-smt-261002.md` names a thing it does not define, twice. Two defensible
readings of each give different numbers for the same model, and both look correct.

**Why it cannot be deferred past the fixtures.** The example suite is now the workbench's end-to-end
gate. A fixture asserting "maximum modeled latency: 1,425 ms" becomes the definition of correct the
moment it is committed — every later change is measured against it. A guess written there is not a
guess for long; it is load-bearing, and nobody re-derives it.

---

## Q2 — What declares the latency accounting model?

### The text

> `latency(trace) = sum transition/entity/relation latency according to the declared accounting model`

The phrase *the declared accounting model* appears once and is never defined: nothing says where it
is declared, what the options are, or what the default is.

### The concrete problem

Document Processing (`requirements-default-examples-261002.md` §5) is a pipeline:

```
Upload -> Parse -> Remediate -> Model Gateway -> Validate -> Publish
```

with quantities attached per §5.4 — `Parse 50 ms`, `Remediate 100 ms`, `Model Gateway 100–500 ms`,
`Validate 75 ms`. But those names are **both** states in the lifecycle model **and** components in
the performance model, joined by shared identity. So a single step of an execution can touch three
things that may each carry a duration:

- the **state** entered (`remediating`)
- the **transition** taken (`remediating -> validating`)
- the **relation** traversed (`Remediate --invokes--> Model Gateway`)

Three readings, all defensible:

| Reading | `Parse -> Remediate` costs | Consequence |
|---|---|---|
| **A. States only** | state `remediating` | Edges are free. A model that puts cost on edges silently contributes nothing. |
| **B. Transitions only** | transition `parse->remediate` | States are free. §5.4's per-component table contributes nothing. |
| **C. Sum all three** | state + transition + relation | A pipeline modelled with latency on both a stage and its inbound edge **double-counts**. |

Reading C is the natural reading of "sum transition/entity/relation latency", and it is the one that
double-counts the example the spec itself supplies. Readings A and B each make half of §5.4's quantity
table inert — attached, validated, and contributing nothing to any answer, which is the silent-failure
class V27 exists to prevent one level down.

### What I need from you

1. **Which elements contribute** to a path sum — and whether that is fixed by MAGE or declared per
   model. If declared: *where*, and what the legal values are.
2. **Whether double-attachment is an ERROR.** The cheapest sound answer may be that a model attaching
   duration to both a state and its inbound transition is a **validation finding**, not an accounting
   puzzle — refuse the ambiguity instead of resolving it silently. That makes the rule mechanical and
   the example unambiguous, at the cost of forbidding a modelling style someone may want.

**My recommendation, if you want one:** fix it in MAGE rather than declaring it per model — one
accounting model, applied everywhere, is the uniformity this project prefers over per-site fit. Make
transitions the carriers of duration (an execution is a sequence of transitions, so a per-transition
cost needs no reconciliation), treat state and relation durations as a **finding** rather than silent
input, and revisit only if a real model needs them.

---

## Q3 — What precise predicate is `memory(c)`?

### The text

> For a configuration `c`, peak modeled live memory can be defined **approximately** as:
> retained memory of active states/entities in `c` + temporary memory associated with the active
> operation

Then: `peak_memory = max over reachable configurations c of memory(c)`.

The outer `max` is unambiguous and implementable. **`memory(c)` is not.** "Active" carries the whole
definition and is undefined, and "approximately" is honest in a requirements document and
un-implementable in an evaluator.

### The concrete problem

A configuration is every machine instance's control state plus every variable's value. So in a
two-machine system where machine A is in `remediating` and machine B is in `idle`:

1. **Is B's entity memory retained?** A worker sitting idle still occupies its process. If idle
   memory counts, `peak_memory` is roughly the sum of everything always, and the `max` over
   configurations tells you almost nothing — every configuration has nearly the same value. If it
   does not count, "peak memory" means *peak transient* memory and a 256 MB resident service
   contributes zero while parked.
2. **Does a containment parent count when a child is active?** If `Pipeline` contains `Remediate`
   and `Remediate` is active, does `Pipeline`'s memory count once, twice, or not at all? Containment
   is a first-class relation here, so this is not hypothetical.
3. **What is "the active operation"?** With two machines running there may be two. Both? The
   maximum? Their sum?
4. **Does an entity in no model's active state count?** Entities exist system-wide; only some appear
   in the model being evaluated.

Reading 1 alone splits the Document Processing answer: §5.4 declares `Remediation memory 256 MB` and
`Gateway cache 128 MB` against a `peak memory ≤ 512 MB` requirement. Whether those coexist in one
configuration — and whether idle components count — decides whether the requirement holds or is
refuted. **Both readings are defensible and they give opposite verdicts on the example the spec
ships.**

### What I need from you

A predicate precise enough to implement and test. Specifically:

1. Does a machine's entity memory count when that machine is in a non-active state (e.g. `idle`)? Is
   there a way to declare a state's memory as resident versus transient?
2. How does containment compose — parent plus child, or child only?
3. With several machines active, is the "temporary" term summed or maximised?
4. Does an entity outside the evaluated model's entity set contribute?

**My recommendation, if you want one:** the crudest defensible predicate, stated explicitly and
tested. Memory attaches to **entities and states**; `memory(c)` sums the memory of every entity whose
machine is in a state carrying a memory quantity, plus every entity with an unconditional memory
quantity; containment does not compose (a parent counts only if it carries its own quantity); and
nothing is maximised. Crude, total, explainable in one sentence, and a sound basis for a worst-case
`peak_memory` — which is all the `<=` requirement needs. Refinement is a later phase, and a crude
predicate that is *written down* can be refined; an approximate one cannot even be tested.

---

## What happens once you rule

1. The evaluator lands behind V27–V31, which already guarantee dimensional soundness of its inputs.
2. Document Processing is authored with fixtures whose numbers follow from the ruling rather than
   from a guess — §5.5's expected counterexample (`1,425 ms` against `≤ 750 ms`, with the retry trace
   and the `retry_count ∈ [0,3]` bound) becomes derivable rather than asserted.
3. §5.6's cache what-if gets its purposeful-omission case: omit the hit rate and expected latency is
   **not answerable**, naming the missing frequency.
4. EX-I3 becomes satisfiable, and the coverage model's `performance` and `requirements` rows move
   from `unavailable` to exercised. They are currently `unavailable` with the blocking construct
   named, so the model already states this dependency.

Both answers belong in `SEMANTICS.md` as numbered rules once ruled — they are semantics, not
implementation detail, and they must hold identically in `rules.ts` and `validate.py`.
