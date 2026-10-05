# RULED — §6.8's multiple machines: option 2 already shipped, and the gate's premise is wrong (261005)

`DESIGN-v02-examples-and-semantic-completion-261004.md` §6.8 gates the Autonomous Delivery example on
resolving how independent machines compose. It offers two routes, prefers the first, and forbids a
third:

> **Do not implicitly compose independent machines.** Either: (1) v0.2 behavioral models contain one
> explicit system transition system whose state represents the relevant product state; or (2) v0.2
> defines an explicit machine-composition operation, including synchronization/interleaving
> semantics. **Prefer option 1** … **The examples should not smuggle in an undefined asynchronous
> product.**

`examples/worker-queue` declares two machines and ships queries whose predicates name both, so the
gate is live rather than hypothetical. This file measures what the engine does, then rules.

---

## 1. The measurement, before any ruling

Three claims, each with the code path that establishes it and a number from the shipped example. The
probe that produced the numbers is described in §1.4 and was not committed.

### 1.1 The engine builds an EXPLICIT product over every declared machine

`initialConfiguration` iterates `system.instances` and sets one `control` entry per instance
(`src/engine/explore.ts:76-103`). The configuration is therefore a vector spanning every machine, not
a per-machine state with foreign names resolved out of band. Measured:

```
instances      : job-lease(machine=job-lease), job-lifecycle(machine=job-lifecycle)
initial.control: [["job-lease","free"],["job-lifecycle","queued"]]
initial.values : [["job-lifecycle.retry_count",0]]
```

A predicate atom resolves through the same `resolveRef` every guard and effect uses
(`src/engine/refs.ts:95-140`). `job-lease.state` resolves to `{ kind: "control", instance:
"job-lease" }` and compiles to `cfg.control.get("job-lease")` (`src/engine/refs.ts:174-177`). **A
foreign machine's atom is not special-cased anywhere** — there is no "foreign" in this engine, because
there is one vector.

The step relation is `successorsOf` (`src/engine/explore.ts:429-457`), and it offers exactly two
kinds: local moves of one instance, and `eventMoves` Cartesian products over participants' enabled
`sync:`-transitions. Measured over the complete walk:

```
statesExplored: 29   complete: true   stopReason: complete
job-lease reached      : free, held-by-0, held-by-1
job-lifecycle reached  : queued, claimed, processing, completed, failed, dead_letter
edges moving ONE instance (interleaved local): 12
edges moving >1 instance (synchronized event): 24
```

Both machines' control states vary across the space, and both kinds of step occur. This is an
interleaved product synchronized on declared events — the asynchronous product §6.8 names, built
deliberately.

### 1.2 `lease-held-while-processing` is EARNED, not vacuous

The brief's hypothesis — that this query reports a proved safety property holding vacuously because a
foreign machine's atom can never be satisfied in the walked space — is **refuted**.

The invariant's violation is `job-lifecycle.state: processing AND job-lease.state: free`. Measured:

| | count |
|---|---|
| configurations the state vector admits (3 lease × 6 lifecycle × 4 `retry_count`) | 72 |
| of those, satisfying the violation | **4** |
| reachable configurations | 29 |
| of those, satisfying the violation | **0** |

**Satisfiable in the vector, unreachable in the design.** That is exactly the shape of an earned
safety property, and it is earned by two declared facts: the `claimed -> processing` transition
carries `requires: job-lease.state: { ne: free }` (a guard, `system.mage.yaml:177-181`), and `release`
is a declared event that steps both machines atomically, so the lifecycle cannot leave `processing`
while the lease stays held. The example's own fixture note already claimed non-vacuity on the grounds
that "both conjuncts are individually reachable" (`expected-results.yaml:161-162`) — measured at 8 and
13 reachable configurations respectively, so the claim was true. It was unverified prose; it is now a
test.

### 1.3 `two-workers-own-one-job` is vacuous, and nothing computed that

`reach` for `job-lease.state: held-by-0 AND job-lease.state: held-by-1`. One machine occupies one
control state, so the target is satisfied by **0 of 72** vector configurations — unsatisfiable, not
merely unreachable. The engine returned:

```
outcome=refuted  coverage=exhaustive/29  evidence=none  compilation=[]
```

That result is byte-identical to what a target the design genuinely prevents returns. The example's
prose said so correctly in two places (`system.mage.yaml:366-369`,
`expected-results.yaml:172-178`), and **no code computed it**. §4 is the control that closes this.

**Nobody made the unwarranted claim.** The Learn pages never mention the query;
`examples/transaction-workspace/expected-results.yaml:178` cites it as "the shipped example of that
trap", correctly. The defect was the missing mechanism, not a false claim.

### 1.4 The probe

A ~130-line script at `workbench/probe-multimachine.ts`, run under Node 24, deleted and not committed.
It loaded the example through `canonicalize`, compiled the system, walked the space, independently
enumerated **all 72** vector configurations by brute-force Cartesian product, and counted how many
satisfied each query's deciding subject. Its brute-force enumeration and the projected check that
shipped in §4 agree on both queries, which is the cross-validation: one enumerates the whole vector,
the other projects onto 1 and 3 coordinates, and they return the same verdict.

---

## 2. RULED — the composition stays. Option 2 is already the answer, and the preference arrived too late.

**This is a ruling, not a deferral.**

§6.8's premise is factually wrong about the code: the product is neither implicit nor undefined.
Three reasons the ruling goes this way, in descending order of how much each constrains the choice.

1. **Option 2 is not a v0.2 proposal to evaluate — it is v0.1, specified, implemented, and tested.**
   §6.8 asks whether v0.2 "defines an explicit machine-composition operation, including
   synchronization/interleaving semantics", and asks the reader to find out whether the semantics are
   stated anywhere. They are stated in three places, normatively: **§4.2** gives interleaving ("the
   configuration is the tuple of machine states plus all variable valuations. One enabled transition
   of one machine executes per step. No scheduler, no fairness, no priority"); **§4.3** gives
   synchronization (enabled iff every participant offers an enabled `sync:`-transition; effects apply
   atomically and the intermediate state is unobservable; V12 and V13 constrain participation and
   conflicting writes); **§6** states the step relation and reachable set as the normative definition.
   §4.1 separates a guard from synchronization in terms. A design gate cannot require the
   construction of something the code has shipped for a version — so the author's stated preference
   for option 1 arrived after the decision it was meant to make.

2. **Option 1 is not available for this system under MAGE's own rules, and where it is available it
   moves the engine's work to the author.** §4.4's V14 refuses participant selection for a
   multiply-instantiated machine and tells the author in terms to *"model the resource rather than the
   holders: a single lock machine with states `free | held_by_0 | held_by_1`"*. `job-lease` IS that
   machine, written to that instruction. So the spec's own prescribed modelling for custody produces a
   second machine, and option 1 would now forbid what §4.4 recommends. Collapsing the two into one
   transition system means hand-writing the cross product — 6 lifecycle states × 3 lease states, each
   paired with `retry_count` over `[0,3]`, with every `claim`/`release` edge re-expanded into one
   transition per surviving combination. The engine computes that product and checks it; a merged
   machine makes the author maintain it, and a hand-maintained product is where the undisclosed
   modelling error §6.8 fears actually lives.

3. **Applying option 1 here would leave the composition exercised by no example at all — measured,
   and the number is 1.** Counting machines and declared events across the five shipped examples:

   | Example | machines | instances | declared events |
   |---|---|---|---|
   | `document-processing` | 1 | 1 | 0 |
   | `embedded-sensor-node` | 0 | 0 | 0 |
   | `message-bus` | 0 | 0 | 0 |
   | `transaction-workspace` | 1 | 1 | 0 |
   | **`worker-queue`** | **2** | **2** | **2** |

   `worker-queue` is the **only** example that composes machines, and the only one that declares an
   event — so it is the sole example exercising `eventMoves`, V12, V13, and the interleaving of §4.2.
   Re-model it as one transition system and the entire synchronization mechanism ships with zero
   example coverage. Unit fixtures would still reach it (`docable()` in `test/engine-fixtures.ts`
   declares two machines), so this is a claim about end-to-end example coverage, not about the code
   being wholly untested. Even so, the trade is bad in the direction §6.8 cares about: taking option 1
   to avoid an *undefined* product would produce an *unexercised* one, and the modelling error it
   feared is likelier to hide in the hand-maintained product of reason 2 than in the engine's.

A smaller point, not load-bearing but real: option 1 would delete the lesson `worker-queue` exists to
teach. "The lifecycle model supplies `processing`; the lease model supplies `free`; neither alone can
state the property" (`system.mage.yaml:351-353`) is the example's climax. One merged machine makes
that property intra-model, and the example becomes an ordinary reachability demo.

### 2.1 What §6.8 got right, by asking the wrong question

The gate reached for something real. **Once a predicate can conjoin two machines' states, it can also
conjoin one machine's state with itself** — and that is a contradiction wearing a cross-model
predicate's shape. §6.8 was worried about an undefined product; what the product actually made
possible was an undisclosed vacuity, and the shipped example contains one. The gate found a live
defect by asking a question whose premise was false, which is worth recording as a win for the gate
and a correction to its text.

### 2.2 The residue §6.8 was entitled to

One obligation of §6.8's was genuinely unmet, and it was not the one the text names. The composition
semantics were stated in prose and carried **no invariant ID**, so nothing could cite them and no test
could be mapped to them. `engine-explore.test.ts` walks the event-moves-all-participants case and the
guard-is-not-sync case, and it walks them as behaviour rather than as a named obligation. **V42** is
that ID.

---

## 3. What this means for `worker-queue`

**It stays as it is, as two machines, and it is the compelling implementation reason §6.8 leaves room
for.** Nothing is re-modelled. Three facts carry it:

- Both machines declare `entity: job`, so they are two reductions of one identity rather than two
  unrelated diagrams — the condition that makes the cross-model question sound.
- They are linked by two declared events, `claim` and `release`, each stepping both machines
  atomically. The composition is authored, not inferred: 24 of the 36 edges in the space are joint
  event steps.
- `job-lease`'s enumerated ownership states are what §4.4 instructs an author to write when ownership
  identity matters, and they make dual ownership **unrepresentable rather than merely unreachable** —
  which is the stronger property and is now disclosed as such rather than reported as a proof.

The one change owed to the example is a prose correction, not a re-modelling: `system.mage.yaml:14`
calls the cross-model question "can a job be in processing while nobody holds its lease?" and
describes the machines as "linked by shared job identity". Accurate. But line 366's comment on
`two-workers-own-one-job` says the vacuity is something the reader must "read it as", which was true
when nothing computed it and is now the engine's job. §5 lists that as owed.

---

## 4. The control, and where it cannot be reintroduced

The ruling defines rather than refuses composition, so §6.8's own terms apply: the semantics go in
`SEMANTICS.md` with an invariant ID, and a test walks them.

| ID | Obligation | Held by |
|---|---|---|
| **V41** | A verdict decided by the PREDICATE rather than by the transition structure must disclose it, on `Compilation.kind: "vacuous"` | `satisfiability()` in `src/engine/predicate.ts`; emitted by `vacuityOf` in `src/engine/behavior.ts` |
| **V42** | The composition is the explicit interleaved product and nothing is composed implicitly: `control` total over instances, a local step moves one instance, an event step moves exactly its declared participants | `src/engine/explore.ts`; walked by `test/multi-machine-vacuity.test.ts` |

**Why this is not a comment.** `satisfiability` decides vacuity by enumerating the predicate's **own
coordinates** — the refs its atoms read — rather than the configuration space, so a predicate naming
one machine searches that machine's 3 states and never the 72-configuration product. The disclosure
rides the `vacuous` arm of `Compilation.kind`, which already existed and whose own declaration says
*"the arm binds forward. Any universal added later … emits this same kind rather than re-deriving the
disclosure in its own dialect"* (`src/ir/types.ts:913-930`), and which
`mage-query.schema.json:272` already carried on the wire. Its only emitter was
`src/quant/requirement.ts:157`, the quantitative path. **The channel was declared, wired on one path,
and unwired on the path shipping the vacuous answer.** So this landed no new vocabulary; it reached
the one that was waiting.

Three named arms, not a boolean — `satisfiable | unsatisfiable | unknown`. Only `unsatisfiable`
discloses. `unknown` means the projection exceeded its budget and stays silent, because a disclosure
that fires on "not computed" trains readers to ignore it. A mentioned derived ref expands to its
instance's whole coordinate set rather than getting a coordinate of its own, since a derived value is
a function of those variables (V18) and treating it as independent would call
`retry_count == 0 AND retries_exhausted` satisfiable — an error in the direction that silently stops
disclosing.

**Both failure directions were sabotaged and watched red**, because a control nobody has seen fail is
worth little. Suppressing the disclosure turns 3 tests red while the negative controls stay green;
forcing `unsatisfiable` everywhere turns 4 red, including the earned-verdict test and the
design-refuted negative control. The tree was restored byte-identical before measuring.

The pair to read first in the test file: `job-lease.state: held-by-0 AND held-by-1` and
`job-lifecycle.state: processing AND job-lease.state: free` are **structurally identical** — a
conjunction of two control-state atoms. One is a contradiction; one is the property this example
exists to ask. A check keyed on predicate shape would call both vacuous and destroy the second.
Keying on the state vector is what separates them, and the test asserts both halves.

### 4.1 What now distinguishes a design-refuted `reach` from an unsatisfiable one

Before this wave: **nothing.** Both returned `refuted / exhaustive / no evidence`, and the difference
lived in two authored prose notes. After: the unsatisfiable one carries a typed `vacuous` compilation
whose text states that no transition structure was consulted and that the sound reading is *the model
cannot represent the situation* — stronger than "it does not happen here", weaker than "it was
searched for and not found".

---

## 5. What is NOT done, and is the follow-up

1. **`disclose` is duplicated, and the house rule says extract on the second site.** It now exists as
   a 1-line local in `src/engine/behavior.ts` and in `src/quant/requirement.ts:76`, and
   `src/engine/ltl-product.ts:625` has a third copy hardcoded to `kind: "other"` — which means the
   LTL path **structurally cannot** emit `vacuous`. Reported rather than reached: `src/quant/` belongs
   to a live sibling wave this session. One shared `disclose` in the engine's own `types.ts` beside
   `exhaustive` and `bounded` is the shape.
2. **The LTL path has the same hole, unmeasured.** `src/engine/ltl.ts:462` compiles atoms through the
   same `compilePredicate`, so an LTL formula can carry the same contradiction; its result builder
   (`ltl-product.ts:676-700`) emits only `kind: "other"`. V41 is written to cover any verdict decided
   by the predicate, so the LTL path is owed the same disclosure. **Not measured in this wave** — I did
   not establish which LTL verdicts are affected, so this is a lead, not a finding.
3. **`avoid` is not checked for vacuity.** An `avoid` predicate that is unsatisfiable imposes no
   restriction and the query silently answers the unrestricted question. Same class, different field.
4. **The example's prose is owed one correction** — `system.mage.yaml:366-369` tells the reader to
   "read it as" the vacuity the engine now reports. Left alone in this wave because the fixture note
   is accurate and a sibling wave may hold the file.
5. **`V41`/`V42` were taken from a `SEMANTICS.md` whose maximum was `V40`.** If a concurrent wave also
   appends, the numbers collide and one set must be renumbered. Flagged rather than coordinated.

---

## 6. Corrections to the record

- **§6.8's premise is wrong about the code, and its text should be amended rather than discharged.**
  "Do not implicitly compose independent machines" and "the examples should not smuggle in an undefined
  asynchronous product" both describe a condition that does not hold: the product is explicit (§4.2,
  §4.3, §6) and the examples compose through declared events. The preference for option 1 is a
  preference stated against a shipped option 2.
- **§6.8's instruction to "resolve this before building the Autonomous Delivery example" is satisfied
  by this file, and the capstone is unblocked** — as a multi-machine model, composing through declared
  events, with V42 as the obligation it must satisfy.
- **`SEMANTICS.md` was not wrong, it was unaddressable.** It stated the composition semantics and gave
  them no ID; §4.4 recommended the very modelling §6.8 would forbid. Both are consistent once option 2
  is the ruling.
- **The brief's framing was right to insist on measurement and wrong in its leading hypothesis.** Its
  hypothesis 3 — a vacuous `lease-held-while-processing` — is refuted, and its instruction to report a
  live soundness bug "in your first commit message and fix it before continuing" would have produced a
  false finding had it been followed on the primary query. The brief's deeper instruction is what
  found the real defect: *state what the answer catches, then construct the case where it reports the
  same thing while the property is violated.* Applied to `reach`, that case is the self-contradictory
  target, and it was already shipped.
- **One number in the brief needs care.** It describes `two-workers-own-one-job` as naming "a single
  machine in two states at once" and calls a `reach` for an unsatisfiable target "correctly
  `refuted`". Both true. But it then asks whether the example "presents that as *we proved two workers
  cannot own one job*" — it does not, in any surface. The defect was the absent mechanism, and an
  audit that had looked only for a false claim would have found nothing and closed.
