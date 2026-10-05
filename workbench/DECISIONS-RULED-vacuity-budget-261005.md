# RULED — vacuity is decided by satisfiability, and the shipped proxy was wrong in both directions (261005)

The V43 ruling left a question it framed as a choice between two defensible readings: does an
unsatisfiable `target:` disclose vacuity at every budget on satisfiability grounds, which is V41's
letter, or only at exhaustive, which is what the quantity evaluator shipped? `SEMANTICS.md` §7.1
carried the divergence as an ⚠️ as-built note, and V43 declared itself deliberately indifferent.

Measuring the shipped behaviour before ruling on it dissolved the choice. **The evaluator implemented
neither reading, because it never decided satisfiability at all.** It keyed the disclosure on "the
selection came back empty on a complete walk" and used that as a proxy for "no state vector admits
this predicate". The proxy is wrong in both directions, and the direction nobody was looking at is the
one §7.1 names as the worse failure.

Baseline measured at `db0a0377` before anything was read: `npm run check` clean, `check:parity`
**0 violations over 26 capabilities**, `npm run test` **1334 pass / 0 fail / 0 skipped**, `build`
clean. Matches the commissioning figures exactly.

---

## 0. The defect, measured in both directions before anything was designed

Three ceiling queries over `document-processing`, differing only in the selection, each run at
`limit: 3`, `limit: 10` and exhaustive. The `latency-requirement` ceiling and the obligation over it
are identical across all nine rows.

| Selection | Satisfiable in the vector? | Reached? | Disclosed BEFORE | Should disclose |
|---|---|---|---|---|
| `published AND waiting` | **No** — one machine, two control states | no | only at exhaustive | **at every budget** |
| `uploaded AND retry_count: 1` | **Yes** — the vector admits the pair | no | only at exhaustive | **never** |
| `published` | yes | yes | never (charged at 2,750 ms) | never |

**The under-firing half is the one the brief named.** An unsatisfiable target discloses nothing under
a bound, though no walk is needed to know that no configuration satisfies it. That is the
coverage-dependence V41's letter already forbids.

**The over-firing half was not in the brief, V43, or §7.1's divergence note, and it is worse.**
`uploaded AND retry_count: 1` is a perfectly sound thing to ask about — the lifecycle starts at
`uploaded`, nothing transitions back into it, and `retry_count` only advances on the retry edge, so
the pair is representable and never exhibited. §7.1 rules on this case by name:

> It MUST NOT emit the disclosure when the predicate is satisfiable but unreachable. That is the
> **earned** verdict, and a disclosure that fires on it teaches readers to ignore the one that matters.

The shipped evaluator disclosed it anyway, identically to the contradiction, because an empty
selection is all it could see. And since V43 landed, that is no longer a mislabel a reader shrugs at:
the obligation verified **`inconclusive`, cause `vacuous`** — a sound requirement downgraded, with the
author sent to fix a predicate that was never wrong. V43's own closing paragraph predicted the bill:

> An evaluator that discloses vacuity on an EARNED verdict downgrades a sound requirement, so V41's
> "MUST NOT emit when the predicate is satisfiable but unreachable" is paid in verdicts from here on.

It was already overdue on the shipped evaluator when that sentence was written.

### 0.1 One thing the brief did not say, and it decides the mechanism

**`satisfiability()` already exists.** The multimachine wave landed it in `src/engine/predicate.ts`
with the three named arms V41 asks for — `satisfiable | unsatisfiable | unknown` — and the behavioural
evaluator has keyed `vacuityOf` on it since. So this ruling does not design a vacuity check. It brings
the quantity evaluator to the discriminator the other evaluator already uses, which makes the change a
consolidation rather than a second mechanism: a fix applied to the discriminator now holds for both.

The quantity path could not reach it for a structural reason. `RequirementOptions.target` was
`((cfg: Configuration) => boolean) | null` — an opaque closure with the authored `Predicate` thrown
away at the admission site, so there was nothing left to project onto coordinates. The seam is the
whole of why the proxy existed.

---

## 1. What deciding satisfiability costs — measured, not argued

The brief said to measure before ruling, because the multimachine wave had brute-forced a
72-configuration vector in a throwaway probe. Measured the same way, on the shipped corpus.

**The decision is projected, which is what makes it cheap.** `satisfiability` enumerates only the
coordinates the predicate reads, so a predicate naming one machine's control state searches that
machine's states rather than the product of every machine and variable in the system.

| Selection | Verdict | Cost per call | Share of the walk it rides beside |
|---|---|---|---|
| `published AND retry_count: 0` (shipped) | satisfiable | 1.35 µs | 0.11% |
| `published` (shipped, two queries) | satisfiable | 0.34–0.38 µs | 0.03% |
| `published AND waiting` | **unsatisfiable** | 0.92 µs | 0.08% |
| `uploaded AND retry_count: 1` | satisfiable | 1.76 µs | 0.14% |
| `retry_count: 0 AND retries_exhausted` (derived) | **unsatisfiable** | 3.27 µs | 0.27% |

The walk it is compared against — `maxOverExecutions` over `document-processing`, no target — runs in
**1.18–1.23 ms** over 18 explored configurations. The derived-reference row is the most expensive
because a mentioned derived value expands to its machine's whole coordinate set rather than becoming
an independent coordinate, which is the sound direction: it fails toward finding vacuity rather than
missing it.

**Scale, across the shipped corpus.** The widest single-instance projection is **24** coordinates,
against `satisfiability`'s enumeration budget of 100,000 — three orders of magnitude of headroom.
`worker-queue` is the system whose whole vector is **72**, confirming the brief's reference; the
projection never has to enumerate it, because no shipped predicate reads every coordinate.

| System | Whole vector | Widest single-instance projection | `compileSystem` |
|---|---|---|---|
| `message-bus` | 1 | 0 | 0.002 ms |
| `transaction-workspace` | 10 | 10 | 0.011 ms |
| `document-processing` | 24 | 24 | 0.004 ms |
| `worker-queue` | **72** | 24 | 0.009 ms |
| `embedded-sensor-node` | 1 | 0 | 0.0003 ms |

**So the total added cost is under one percent of the walk, and the expensive part is not the
enumeration.** Deciding satisfiability needs an initial configuration, which means one
`compileSystem` call at the admission site — at most **0.011 ms** measured, against a walk of
**1.2 ms**. The enumeration itself is noise beside it.

**The conclusion that matters: budget-independence is affordable, so the escape is not needed.** V41
permits a bounded enumeration with a third answer, and that permission stays in force — but on this
corpus it is a guard against a model nobody has written, not a routine outcome. An implementation that
declined here would be declining to spend a fraction of a percent.

---

## 2. RULED — satisfiability is the discriminator; the sentence was right and the code was wrong

**The disclosure fires exactly when the predicate deciding the verdict is unsatisfiable in the state
vector, at every budget, and never otherwise.** `SEMANTICS.md` §7.1's "decided before the walk begins"
was correct, and "truncation cannot weaken it" was correct. The code diverged from both.

Landed as **V44**, allocated from the highest landed heading in `SEMANTICS.md` — V41, V42 and V43 were
taken, so the next free id is V44, and nothing above V43 existed anywhere in the repo.

### 2.1 How the coverage-independence prior weighed against the bounded-enumeration escape

The brief asked for these to be weighed rather than for the first one to be picked. They did not end
up in tension, and the reason is the measurement.

**The prior is strong and it applies.** V43's §5 mandates coverage-independence, and V43's sharpest
result removed a coverage-dependence of precisely this shape — the same unsatisfiable target reading
one way at one budget and another way at another. Disclosing only at exhaustive is that shape again.
A rule whose answer moves with the walk depth, for a question the walk does not inform, is the defect
V43 was written to kill.

**The escape is real and it would have defeated the prior if the cost had come out differently.** §7.1
permits a bounded enumeration precisely because satisfiability can be expensive, and a ruling that
mandated budget-independence at any price would have been writing a cheque the evaluator could not
cash on some future model. That is why the measurement came first.

**The measurement settles it without a trade.** Budget-independence costs a fraction of a percent of
the walk, so there is nothing to trade the prior against. And the escape is not discarded — it stays,
as `unknown`, with a pinned obligation to say so rather than to guess.

**What the escape could not have justified, at any cost: the over-firing half.** A bounded enumeration
licenses declining to decide. It never licenses asserting a contradiction nobody established. So even
on a model where the projection declines, the earned absence stays silent — and `unknown` reaching the
`vacuous` channel would be the silent false negative inverted, which is the one thing V41's third
answer exists to prevent.

### 2.2 Two axes, kept apart — the shape of the fix

The defect was one proxy standing in for two independent questions. The fix separates them, and the
separation is what makes budget-independence structural rather than conventional.

| Axis | Reads | Governs | Changed here? |
|---|---|---|---|
| **Outcome** | coverage (V22) | is the proposition established? | **No** |
| **Disclosure** | satisfiability (V41/V44) | was it decided by the predicate? | **Yes** |
| **Obligation status** | the disclosure (V43) | is the obligation discharged? | No — inherits |

**Unsatisfiability does NOT promote a truncated outcome**, and this was the sharpest internal
correction of the work. The first implementation reported `holds` for an unsatisfiable selection under
a bound, on the reasoning that a universal over a vector-wide empty set is true regardless of depth.
That reasoning is sound in isolation and wrong for this codebase: `holds` beside `bounded` coverage is
certainty claimed from truncation, and several suites assert against it — including one that pins it
for *any* model, and one that names the two-arm `bounded ? "inconclusive" : "holds"` shape as having no
third arm. The behavioural evaluator already settled the question the other way: under a bound it
keeps the outcome unsettled and lets only the disclosure ride along. Matching it costs nothing V43
needs, because V43 reads the disclosure and never the outcome, so the obligation's status is
budget-independent either way.

### 2.3 Why satisfiability is decided at admission

`admitQuantityQuery` already compiles the predicate and builds the scope, and its own contract is the
argument for putting the decision there:

> Every refusal here is decided from declarations alone — the metric vocabulary, the dimension scope,
> the ceiling's target kind and dimension, the forced quantifier, the predicate's vocabulary. Nothing
> walks an execution.

Satisfiability is such a decision. Deciding it there means the plan carries a **decided answer** rather
than a predicate, so at the point the disclosure is chosen there is no scope left to re-decide it
against and no coverage value in reach. A later edit cannot quietly reintroduce the coverage
dependence without changing a type.

**Shape decides nothing, and the capstone wave's models are the counterexample that rules it out.** A
cheap syntactic proxy — "a conjunction of two control-state atoms on one machine is a contradiction" —
would be wrong on the shipped corpus: the capstone ships two structurally identical conjunctions where
one is unsatisfiable in its vector and the other is satisfiable and merely unreachable. Only
satisfiability tells them apart.

---

## 3. What landed

- **`src/quant/requirement.ts`** — `RequirementOptions.target` becomes a typed `ExecutionSelection`
  carrying `match`, the decided `satisfiability`, and the authored `described` for the remedy
  sentence. The walker's own `PathOptions.target` stays a bare matcher, because matching is all the
  walk needs and widening it would push the selection type into the walker for nothing.
- **`vacuityNotes`** — the three-way discrimination, extracted on the **second** site rather than the
  third. Both quantity paths reach it, and they must: a second copy keyed on an empty selection is
  exactly how this evaluator acquired the defect, so leaving the measurement path its own copy would
  have re-introduced the over-firing in whichever path kept it.
- **`src/quant/query.ts`** — satisfiability decided at admission; both the ceiling path and the
  measurement path route through the shared helper. A system that will not compile yields `unknown`
  rather than a new refusal path, so the walk still raises the refusal the evaluator already reports
  well.
- **`SEMANTICS.md` §7.1** — V44 replaces the ⚠️ as-built divergence. Two ordinals removed while there
  (§6).
- **`test/vacuity-budget.test.ts`** — the pins (§4).
- **`test/quant-query.test.ts`** — one pin **re-pointed, not relaxed** (§5).

**No new `Compilation` kind.** The union already carries `vacuous`, and the undecided case belongs in
`other` beside a sentence that says so. Minting a kind for a case measured unreachable on the corpus
would be adding vocabulary to a closed set for a reader who has nowhere to spend it.

---

## 4. The pins, with the vacuity case for each

The irony is live in this ruling's own subject, so each pin names the way it could pass while the
property is violated. Full text in `test/vacuity-budget.test.ts`.

| Pin | Catches | Passes vacuously if… | Stopped by |
|---|---|---|---|
| Every budget | a budget-dependent disclosure | the small budgets do not truncate, making three-way agreement agreement about nothing | each row asserts its OWN coverage kind, so the row set is pinned as `bounded, bounded, exhaustive` |
| Same pin, outcome arm | the fix manufacturing `holds` under `bounded` | — *(the axis-separation control)* | the outcome row set is pinned beside the disclosure row set |
| Remedy sentence | a disclosure that fires right and says the wrong thing | matched so loosely the earned note would match too | the earned note is matched against the same patterns and required NOT to carry them |
| **Over-firing** | the earned absence disclosed as vacuity | the selection is reachable, so the arm under test never runs | the arm's signature is asserted first — `holds`, null magnitude, exhaustive coverage — then the silence, then `satisfied` at the obligation layer |
| Ordinary charged row | a disclosure that fires on everything | the query was refused, so there is no disclosure because there is no result | the 2,750 ms figure is asserted — a charged comparison, the structural difference from an absence |
| Third answer | `unknown` read as a licence to claim vacuity, or to claim earned | the projection does not actually exceed the budget, so `unknown` never arises | `satisfiability` is looked up and pinned `unknown`; the walk is pinned `exhaustive`, separating the two budgets |
| Shipped behavioural instance | a regression in the evaluator this ruling did not touch | the shipped query stopped existing or stopped being a `reach` | the corpus row is asserted first; the sentence is matched for `cannot REPRESENT`, which only the behavioural evaluator writes |
| The `[FIX]`, both twins | the measurement path's missing kind, and the naive fix's over-firing | a refusal or an error would carry no disclosure either | `refuted` + exhaustive + null magnitude pins the absence arm; the earned twin on the same path is required silent |

**Premises are looked up, never asserted in prose.** Every pin rests on a claim about whether its
predicate is satisfiable, and a test that stated that claim in a comment would be pinning its own
belief. Each reads `satisfiability` for its own fixture through the same function production reads, so
a pin cannot silently describe the wrong case.

### 4.1 Verified by sabotage rather than by assertion

A table of claims about what a test catches is itself a claim. Each was checked by breaking the source
and watching the red land where predicted.

| Mutation | Predicted | Measured |
|---|---|---|
| Restore the coverage-keyed proxy | the proxy's own defects, in both directions | **5 fail**, and exactly the three that should survive do: the charged row, the behavioural evaluator, the ordinary measurement |
| Read `unknown` as unsatisfiable | the third answer only | **only** the third-answer pin fails |
| Withhold the disclosure under truncation | the every-budget property only | **only** the every-budget pin fails |

The second and third are the ones worth having: each isolates a single property, so neither pin is
riding on the other's coverage.

**V43's pins and Phase A's are unregressed**, and not by editing them. V43's live-case pin asserts the
remedy sentence contains `holds vacuously` and `absence is the finding`; the new sentence carries both
clauses, so the assertion holds against rewritten prose rather than being relaxed to accommodate it.
Phase A's arm is untouched. Both suites are green at the landed tree.

---

## 5. The `[FIX]`, and how the ruling changed what the right kind is

V43 §5.2 reported that the `exists` measurement path over an empty selection emits `other` where
`vacuous` belongs, and left it. **Verified before fixing, by symbol rather than by line:** the
`kind === "none"` arm of `measurePath` in `src/quant/query.ts` built its disclosure through the local
`note` helper, which hard-codes `kind: "other"`. The gap was real and exactly as described.

**The ruling changed the fix, and this is the interaction the brief asked about.** The obvious reading
of the follow-up is "emit `vacuous` on this path too" — disclose whenever the selection comes back
empty, matching what the ceiling path did. That fix would have **imported the over-firing defect into
a second evaluator**, and §5.2 could not have known, because the over-firing had not been found. So the
right kind on that path is `vacuous` **iff the selection is unsatisfiable**, which is only expressible
once satisfiability is decided — the ruling is a precondition for the `[FIX]`, not merely adjacent to
it.

V41's table already put this row beside the ceiling's, which is the argument that the kind belongs
here at all:

| | decided by the design | decided by the predicate |
|---|---|---|
| `reach` / measurement | `refuted` — no execution reaches a representable target | `refuted` — no state vector admits the target |

The polarity differs from the ceiling's and the prose follows it: a universal **holds** over nothing, an
existential is **refuted** by nothing. The outcome axis is untouched here too — `refuted` on a complete
walk, `inconclusive` under a bound (V22).

---

## 6. What the finding, the ruling, or the brief got wrong

**1. The brief's framing of the question was too narrow, and so was §7.1's divergence note.** Both
present a choice between two readings of *when* to disclose — every budget, or exhaustive only. Both
assume the evaluator implements one of them. It implements neither: it tests emptiness-of-selection,
which is not satisfiability and not coverage, and which is wrong in a direction neither document
considered. The brief's instruction to measure first is what surfaced it, and the instruction not to
break the earned half is what made the over-firing legible once measured — the two halves of the brief
that mattered most were the ones that did not presuppose the answer.

**2. §7.1's "truncation cannot weaken it" was true of the spec and false of the code, and the ⚠️ note
misdiagnosed which part was wrong.** The note says the sentence "does not describe the second route to
a vacuous verdict: a quantity query whose `target:` selects configurations no execution reaches", and
concludes that the two readings are different claims — "no state vector admits this" versus "no
execution reached it". That framing grants the shipped behaviour a coherent semantics it did not have.
The shipped path was not asking the second question as a deliberate alternative; it was using the
second as a proxy for the first, which is why it also fired on the case where the two come apart in
the other direction. There was one route to a vacuous verdict all along, and one of the two evaluators
was approximating it.

**3. Two ordinals in §7.1 held numbers against sets the work keeps changing** — the exact failure the
brief flagged, in the document the brief pointed at. `no fifth Outcome to reach for` is correct today
and becomes wrong if the union ever moves; the vacuity cause's remedy was described as `a fourth one`,
which the V43 ruling had just finished amending out of Phase A for the same reason. Both are now stated
without an ordinal. V43 removed the shape from its predecessor and left it in its own spec text.

**4. The V43 ruling's coverage table was right about the direction and is now superseded in its
cause column.** Its §2 table pins status before and after at three budgets, and deliberately did not
pin the cause under truncation — "pinning today's answer would freeze the weaker reading and break the
day the evaluator is brought to V41's letter." That foresight is why nothing in V43's suite had to be
edited. The day arrived, and the test survived it.

**One thing the brief got right that was worth checking twice:** the 72-configuration vector it
attributes to the multimachine wave is `worker-queue`'s, and it reproduced exactly. So did the claim
that `src/quant/requirement.ts` is the site, and that §7.1 carries the divergence in live text.

### 6.1 Follow-ups this ruling does not take

- **[FIX]** **The vacuity cause is shadowed by the bounded cause under truncation, and this ruling
  made the gap reachable.** `evaluationOf`'s `inconclusive` arm projects to
  `{ status: "exhausted", limit }` and drops the compilation, so a disclosure that now travels under a
  bound cannot reach `verify` — which checks vacuity first and would otherwise prefer it. Measured at
  the landed tree: an unsatisfiable ceiling at `limit: 3` discloses `vacuous` on the result and
  verifies `inconclusive` cause **`bounded`**, whose remedy is "raise the bound". That is the collapse
  V43's own §1.2 table calls actively misleading — "no budget makes an unreachable selection
  reachable" — and before this ruling it was unreachable, because a truncated vacuous query carried no
  disclosure to shadow. **Not taken** because the fix widens `QueryEvaluation`'s `exhausted` arm and
  changes `verify`'s precedence, in a vocabulary layer this brief scoped out and V43 owns. V43's
  status mandate is unaffected: the status is `inconclusive` at every budget either way, which is what
  V43 governs and what its suite pins.
- **[DESIGN]** Whether `unknown` should downgrade an obligation. This ruling keeps it silent at the
  disclosure layer, because §7.1's over-firing prohibition is the stronger constraint and the
  alternative would downgrade sound requirements whenever a projection is wide. The choice is free
  today — no shipped projection comes within orders of magnitude of the budget — and it should be
  revisited by whoever first writes a model that reaches `unknown`, with the measurement in §1 as the
  baseline.

**The third follow-up V43 left is not taken and this ruling does not change its cost.** Recording
disclosures in the fixture schema stays self-detecting for the reason §5.1 gives: the derived arm
compares against the same `req.status`, so one of the two assertions fails if a fixture requirement is
ever decided by a vacuous verdict. The ruling changes *which* verdicts are vacuous, not whether the
corpus records them, and it moves no shipped requirement. Measured at the landed tree rather than
inferred: the shipped quantity queries carrying a `target:` all select reachable configurations, so
none reaches the absence arm at all; exactly one shipped query discloses vacuity, and it is
`worker-queue`'s behavioural `two-workers-own-one-job`, which this ruling does not touch; and no
shipped requirement verifies `inconclusive` with cause `vacuous`. The cost is where V43 left it.

---

## 7. Gates at the landed tree

`check` clean, `check:parity` **0 violations over 26 capabilities**, `test`
**1342 pass / 0 fail / 0 skipped** (1334 baseline, plus this ruling's pins), `build` clean.
