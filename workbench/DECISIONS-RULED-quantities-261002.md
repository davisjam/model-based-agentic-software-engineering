# RULED — the quantitative accounting model

**Status: both ruled 2026-10-02.** This document posed Q2 and Q3; it now records the rulings and
what they require. Phase I's analysis layer is unblocked.

The rulings share one form, and it is better than what I proposed: **the author declares the
accounting, and MAGE refuses to guess.** I had recommended picking a crude rule and fixing it in
MAGE. The ruling instead makes the choice explicit in the model and makes an unparticipating
annotation *invalid* rather than inert — which is the stronger answer, for a reason given below.

---

## The governing principle, now a rule

> A quantitative annotation that cannot participate unambiguously in the accounting semantics of its
> metric is **invalid**, rather than silently inert.

This is the real defect the Q2 analysis exposed, named precisely:

> If MAGE accepts a quantity as meaningful, there must be a defined route from that quantity to the
> analyses for which its dimension is intended. Otherwise the type system is claiming more than the
> semantics provide.

My write-up observed that two of the three Q2 readings leave validated quantities contributing to
nothing. I treated that as an argument for choosing a reading. It is better read as an argument about
*validation*: a quantity that typechecks, validates, and then cannot reach any analysis is the type
system over-claiming. Both rules below exist to make that state unreachable.

---

## Q2 — ruled: declared accounting basis, entity accounting for v0.1

> **Each path-aggregated quantitative metric SHALL declare one accounting basis.** For v0.1, latency
> supports entity accounting. An execution's latency is the sum of the latency assigned to each
> **occurrence** of an accounted entity along the execution. Latency annotations on other semantic
> kinds SHALL NOT implicitly contribute, and SHOULD be rejected or diagnosed when associated with
> that metric.

Declared per quantitative model:

```yaml
accounting:
  latency:
    basis: entities
```

**Why not sum across kinds.** Indiscriminate summing "makes the meaning of a model depend on whether
the author happened to represent the same operation in multiple linked models. Shared identity should
let us connect purposeful models, not cause their annotations to be accumulated." That is the sharp
statement of the double-counting problem: it is not merely arithmetic, it makes meaning depend on
representational accident.

**Why one basis and not `all`.** With `all`, "double counting then becomes an authoring problem with
no principled answer." Transition and relation accounting can be added deliberately later; a
permissive union cannot be narrowed later without breaking models.

**How a retry gets charged — the part that matters for the example.** `Remediate` is charged again
because **the behavioral trace visits that operation again**, not because a state duration plus a
transition duration plus a relation duration are summed. The join is:

```
behavioral execution --shared identity--> performance component --> duration
```

The lifecycle model determines which stages execute and how often; the performance model determines
what each execution costs. That is exactly how §5.4 presents Document Processing (`Parse 50 ms`,
`Remediate 100 ms`, `Model Gateway 100–500 ms`, `Validate 75 ms`), so entity accounting is the basis
for that example.

### What this requires

1. An `accounting` declaration in the model, per metric, with a closed basis vocabulary (`entities`
   for v0.1 — a closed set, so adding `transitions` later is a deliberate act).
2. A validation rule: a latency quantity targeting a kind the declared basis cannot account for is a
   finding. Per the governing principle this is **invalid, not inert**.
3. The evaluator sums per **occurrence** along the trace — so the same entity visited twice is
   charged twice. The occurrence count comes from the behavioral trace, which the engine already
   produces.

---

## Q3 — ruled: residency is represented, never inferred

> Don't try to infer "active" from lifecycle semantics. Memory residency has to be represented.

Two declared forms:

```yaml
- target: remediation
  quantity: memory
  value: 256 MB
  when:
    state: document.remediating      # charged exactly when the linked behavioral thing is active

- target: gateway-cache
  quantity: memory
  value: 128 MB
  residency: resident                # charged in every configuration where the entity exists
```

Giving a completely mechanical predicate:

```
memory(c) = Σ  memory(e)  for e ∈ Resident
          + Σ  memory(e)  for e where active(e, c)
```

where **`active(e, c)` is not guessed** — the annotation identifies the behavioral thing whose
activation licenses the charge, via shared identity or an explicit `when`.

**Why neither of my readings was accepted, and the reasoning is the valuable part:**

> I would not say "idle service memory stays resident" or "idle service memory disappears." Neither
> is something MAGE can infer from "service." That's exactly the sort of apparently reasonable
> implicit semantics that will bite us later.

Both of my candidate readings were implicit semantics dressed as a default. The ruling removes the
question by making residency authored.

**The shipped example now has one interpretation.** During remediation it is at least 384 MB; outside
remediation the cache remains 128 MB. Every configuration is testable, and the `peak memory ≤ 512 MB`
requirement has a determinate verdict.

### What this requires

1. A `residency` field (`resident`) and a `when` clause (naming a state, via shared identity) on a
   memory quantity. Exactly one of them, and **neither present is a finding** — a memory quantity
   with no declared residency cannot participate in `memory(c)`, which the governing principle makes
   invalid rather than inert.
2. `when.state` resolves to a real state, like every other reference (the V27 family already does
   this for targets; extend it rather than writing a parallel resolver).
3. The evaluator computes `memory(c)` by the formula above, and `peak_memory` as `max` over reachable
   configurations — the outer `max` was never in question.

---

## Both rulings, as one sentence each

- **Q2 latency:** the author declares an accounting basis; v0.1 supports one simple basis for path
  latency.
- **Q3 memory:** the author declares *when* a memory quantity contributes; v0.1 supports `resident`
  and explicit behavioral activation.

## Implementation order

The rules belong in `SEMANTICS.md` as numbered rules, implemented on **both** sides and added to
`PARITY` — they are semantics, not implementation detail. The validation half (the accounting
declaration, the participation rules, reference resolution for `when.state`) can land before the
evaluator, and should: it is what makes an over-claiming quantity impossible, and it needs no
decision the rulings have not already made.

Then Document Processing becomes authorable, its fixtures become derivable rather than asserted, and
EX-I3's `performance` and `requirements` rows move off `unavailable`.
