# RULED — a sound requirement decided by a VACUOUS query is inconclusive, not satisfied (261005)

Phase A of the ceiling ruling closed the *unrefutable pairing* and then reported a hole its own rule
does not close, rather than claiming the area clean. This document rules on that hole and lands the
fix. It is the third shape in the ceiling family and the nastiest, because the requirement is
**soundly authored** — correct `within:` ceiling query, correct `satisfied_when: holds` — and still
read `satisfied` for an obligation the product violates, **at 2,750 ms against a declared 750 ms
ceiling, on an exhaustive walk**.

Baseline measured at `ae6f4393` before anything was read: `npm run check` clean, `check:parity`
**0 violations over 26 capabilities**, `npm run test` **1322 pass / 0 fail / 0 skipped**, `build`
clean. Matches the commissioning figures exactly.

---

## 0. The finding's three claims, each verified by symbol before anything was built

The commissioning brief said to grep the symbols rather than trust the line cites, because Phase A's
own edits had moved them. All three held.

| Claim | Verdict | Evidence |
|---|---|---|
| `verifyDeclaration` takes a `Pick` without `compilation` | **HELD** | `src/engine/verification.ts`, `results: ReadonlyMap<string, Pick<QueryResult, "outcome" \| "coverage" \| "refusal">>` |
| The evaluator emits a typed `vacuous` disclosure on this path | **HELD** | `src/quant/requirement.ts`, `evaluatePath`'s `kind === "none"` arm: `disclose("vacuous", …)` beside `outcome: "holds"` |
| `Compilation.kind` carries a `vacuous` arm declaring it binds forward | **HELD** | `src/ir/types.ts`: *"The arm binds forward. Any universal added later … emits this same kind rather than re-deriving the disclosure in its own dialect."* |

So the producer was wired and the consumer was not, exactly as reported. Measured independently
rather than inferred: the same declared 750 ms ceiling with only the impossible `target:` removed
reads `refuted` with `magnitude: 2750 ms` under exhaustive coverage. **The breach is real, so the
`satisfied` reading was hiding one rather than adding a harmless caveat.**

### 0.1 One claim the brief did not make, and it sharpens everything

**A SHIPPED query already discloses vacuity.** `worker-queue`'s `two-workers-own-one-job` is a
`reach` whose target asks one machine to hold two control states at once; it returns `refuted` under
exhaustive coverage with a V41 vacuity disclosure. No shipped requirement names it — which is why
this ruling lands green — but the obligation someone writes next over that query is the V41 scenario
arriving at the verification layer through the front door, with no injected query shape at all.

It also proves the channel is not a quantity-evaluator quirk: two independent evaluators emit this
kind, which is the "binds forward" promise already being kept.

---

## 1. RULED — `inconclusive`, with a fourth `InconclusiveCause`

**A sound requirement decided by a vacuous verdict verifies as `inconclusive`, cause `vacuous`,
carrying the evaluator's own remedy sentence.** It binds in **both** directions: such a verdict
licenses neither a discharge nor an accusation.

### 1.1 The candidates, and why three lost

**`error` — rejected.** `error` means a declaration that could not be read, and this layer's own
comment scopes it: *"a statement about the declaration or the transport, never about the system under
design."* The declaration here reads perfectly and the pairing is sound by Phase A's verified truth
table. The defect is in the model's reachability or the query's selection. Filing it as `error` would
also put a result-fact inside the arm §5 requires to stay static.

**`violated` — rejected.** A vacuous ceiling exhibits no breach. Accusing the system on no evidence is
the precise failure `verify` exists to prevent, and its header says so: a four-valued switch
*"reports an engineer that the system breaches a prohibition when what happened is that a walk hit
`state-limit`."* Same error, different trigger.

**`satisfied`, but disclosed — rejected, and this is the one the brief said to weigh hardest.** It
loses on three counts, and the first is the one that matters.

1. **It is a different question, in a vocabulary that is explicitly not interchangeable.** V41 governs
   `Outcome`, which asks *is this proposition true?* A vacuous universal **is** true, so `holds` is
   right and stays — already shipped, untouched here. `Verification` asks something else, and the
   layer states it in its own display text: `satisfied` reads *"the obligation is discharged on
   evidence that bears the weight."* A vacuous holds is discharged on no evidence at all.
   `verification.ts` warns against exactly this import: *"The words are not interchangeable with the
   query's."* Carrying V41's answer across the layer boundary would be the category slip the file is
   built to refuse.
2. **`Verification` has nowhere to put a disclosure.** Its `satisfied` arm is
   `{ status, requirement, verdict }` — no compilation channel, no evidence field. "Satisfied but
   disclosed" would mean adding a disclosure surface to the one vocabulary whose four-word closure is
   the most defended thing in the layer. `inconclusive` already carries a typed cause, built for
   precisely this: a distinction too fine for a status word.
3. **It preserves the coverage-dependence §5 forbids.** See §2 — this is the measurement that settles
   it.

### 1.2 Why a fourth cause is not minting new vocabulary

The brief warned that two rulings this week refused to mint new status vocabulary. They did, and
reading what they refused is what licenses this.

`DESIGN-v02-requirements-261004.md` §3.2 designed **five** status words — the author's four plus
`not-verifiable` — on the argument that folding a declined question into `inconclusive` sends a
student to raise a budget when the answer is to declare a relation type. §5.3 ruled four. **It did not
dismiss the argument; it relocated it.** `verification.ts` records the outcome: *"it is answered by
§5.4 rather than by a word … the verification carries the CAUSE as a typed field, and
`InconclusiveCause` keeps the three remedies apart — raise the bound, declare a model, run the
query — with no fifth status word to name."*

So the cause field exists to carry exactly this kind of distinction, and it is keyed by **remedy**.
Checked against each existing member:

| Cause | Its remedy | Fits a vacuous ceiling? |
|---|---|---|
| `bounded` | raise the bound | **No, and actively misleading.** No budget makes an unreachable selection reachable. This is §5's own collapse: a model defect reported as an evidence shortfall. |
| `unlicensed` | declare a model | **No.** Nothing was declined. The query ran and answered. |
| `not-evaluated` | run the query | **No.** It was evaluated, under exhaustive coverage. |
| `vacuous` *(new)* | make the selection reachable, or fix the predicate | — |

A fourth remedy needs a fourth member. Reusing any of the three would hand the author a condition and
send them somewhere that cannot help.

**Correcting the record on a count:** Phase A's §4 says its placement needs *"no new status word and
no fifth `InconclusiveCause`."* The union has **three** members, so a new one is the fourth, not the
fifth. The sentence's argument is untouched — Phase A's arm genuinely needed neither — but the number
is off by one, and this ruling adds the fourth rather than a fifth.

### 1.3 Why both directions, not just the discharging one

The brief framed the defect as "reports `satisfied`", and the discharge arm is where the 2,750 ms case
lands. The accusing arm needs the same treatment, and the shipped query shows why.

A requirement over `two-workers-own-one-job` with `satisfied_when: refuted` — the natural authoring
of a breach query — would have been **discharged** by a vacuous `refuted`: "two workers never own one
job", guaranteed by a contradiction the author wrote rather than by the lease design. With
`satisfied_when: holds` the same result reads **`violated`**: the system accused of a breach on the
strength of that same contradiction. Both are wrong, and for one reason — a vacuous verdict is a fact
about the author's predicate, so it is evidence for neither party.

**This does not breach the layer's asymmetry.** *A witness is coverage-insensitive; an absence is
coverage-sensitive* — and a vacuous verdict is not a witness. V41's table is explicit that both of its
vacuous rows carry **no evidence at all**. There is no witness here for coverage to be insensitive
about, so blocking the accusing arm costs the asymmetry nothing.

---

## 2. Coverage-independence — and the fix runs the opposite way from the guess

§5 of the ceiling ruling forbids a rule that becomes conditional on how far a walk got. Measured, at
HEAD, before the change:

| `limit` | Status BEFORE | Status AFTER |
|---|---|---|
| 3 | `inconclusive` | `inconclusive` |
| 10 | `inconclusive` | `inconclusive` |
| exhaustive | **`satisfied`** | `inconclusive` |

**The defect WAS the coverage-dependence, and this rule removes one rather than adding one.** More
evidence flipped an unsettled reading green, for a selection that is never charged at any depth. That
is the sharpest argument against `satisfied`-but-disclosed: it would have kept this table split, so a
single declaration would still read discharged at one budget and unsettled at another.

The rule reads the disclosure and never the coverage, so it cannot acquire a budget dependence later.

**The cause refines, and the test deliberately does not pin which way.** Under truncation the shipped
quantity evaluator reports `bounded`; at exhaustive it reports `vacuous`. That reflects a live
divergence now flagged in `SEMANTICS.md` §7.1 — V41 says vacuity is a property of the predicate and
travels under truncation, which is true of predicate satisfiability but not of a `target:` whose
emptiness the walk establishes. V43 is indifferent, so the coverage test accepts either cause under a
bound and pins the STATUS, which is what V43 actually governs. Pinning today's answer would freeze the
weaker reading and break the day the evaluator is brought to V41's letter.

---

## 3. What landed

**The `Pick` widening needed an IR change, and a small one.** `verifyDeclaration` and `evaluationOf`
take the same `Pick`, and `evaluationOf` lives in `src/ir/types.ts` — so widening one widens both:

- `src/ir/types.ts` — `evaluationOf`'s parameter gains `compilation`; `QueryEvaluation`'s `completed`
  arm gains `vacuous: Compilation | null`.
- `src/engine/verification.ts` — `InconclusiveCause` gains `{ kind: "vacuous"; detail: string | null }`;
  `verify` returns it ahead of both settled arms; `verifyDeclaration`'s `Pick` gains `compilation`.
- `src/engine/index.ts` — **no change needed.** The join already passes whole `QueryResult`s, which
  satisfy the widened `Pick` as they stand.

**`vacuous` is typed as the `Compilation` itself rather than as a flag.** The union's two non-completed
arms already carry what their remedy needs — `limit` names the budget, `refusal` names the missing
distinction — and a reader handed a bare `true` would have a condition with nowhere to go. Reusing the
existing closed vocabulary also avoids a second spelling of the disclosure.

**Required rather than optional, which is the union's standing discipline.** The compiler found exactly
four construction sites; all four are in tests, because `src/` has a single producer. That ratio is the
seam working.

---

## 4. The pins, with the vacuity case for each

The irony is live in this ruling's own subject, so each pin names the way it could pass while the
property is violated. Full text in `test/vacuous-verification.test.ts`.

| Pin | Catches | Passes vacuously if… | Stopped by |
|---|---|---|---|
| The live case | the 2,750 ms obligation reading `satisfied` | the product did not actually breach 750 ms, making `inconclusive` right by accident | the breach is MEASURED in the same test — same declared ceiling, target removed, `refuted` at 2,750 ms |
| Strip-the-disclosure | the verdict moving for an unrelated reason | — *(this is the control ON the controls)* | the same result is replayed through `verify` with `compilation: []` and goes back to `satisfied` |
| Coverage-independence | a budget-dependent status | `limit: 3` does not actually truncate, so three-way agreement is agreement about nothing | the SOUND shipped row degrades to `inconclusive` under the same budget |
| Shipped behavioural vacuity, both polarities | the accusing arm, and quantity-evaluator-specificity | the shipped query stopped disclosing vacuity | the disclosure is asserted from the shipped model first; the sentence is matched for `cannot REPRESENT`, which only the behavioural evaluator writes |
| Both sound shipped chains | the rule breaking a sound requirement | status alone matched while the verdict moved | the verdict is pinned beside the status |
| Zero findings at HEAD | a shipped requirement silently moving | the probe enumerated nothing | the corpus size is pinned at 8 |
| Over-firing control | the rule firing on a merely-lenient ceiling | the status were checked without the figure | `magnitude: 2750` is asserted — a charged comparison, which is the structural difference from a vacuous one |
| Precedence | the two rules disagreeing about what to tell the author | §4 had simply stopped firing, or the selection had stopped being empty | both halves of the premise are asserted |

**Phase A's arm is unregressed.** Its three distortions (A1, B1, B1-mirror, D1) still read `error`,
its two positive controls and its four-row `satisfied_when: refuted` scope control are untouched, and
its own coverage-independence test still agrees three ways.

**Its `BOUNDARY` assertion is re-pointed, not relaxed** — which is what that assertion's own comment
instructed: *"If this starts reading inconclusive, the vacuity ruling has landed — re-point this
assertion at it rather than relaxing it."* It now asserts `inconclusive` with cause `vacuous`.

Final gates: `check` clean, `check:parity` **0 violations over 26 capabilities**, `test`
**1330 pass / 0 fail / 0 skipped** (1322 baseline + 8), `build` clean.

---

## 5. What the finding, the ruling, or the brief got wrong

Three corrections, all found by probing a stated premise.

1. **The brief's "the 261004 ruling refused a fifth cause" misreads what was refused.** What 261004
   refused was a fifth **status word** (`not-verifiable`), and it refused it *by ruling that the typed
   cause field carries the distinction instead*. Adding a cause member uses that ruling's sanctioned
   mechanism rather than defying it. Relatedly, Phase A's §4 calls a new cause "a fifth" when the union
   has three members — the new one is the fourth.
2. **A measurement query over an impossible selection is NOT vacuous.** The brief's framing implies the
   `vacuous` channel covers the empty-selection case generally; it does not. The `exists` measurement
   path returns `refuted` with only an `other` disclosure. This cost a rewrite of the precedence test,
   which now uses a ceiling query with inverted polarity — a construction where both rules genuinely
   apply. The measurement gap is harmless today (Phase A's arm refuses measurement-decided obligations
   before any result is read) and is not in this ruling's scope, but it is a real gap in the "binds
   forward" promise and worth a look.
3. **V41's "truncation cannot weaken it" does not survive contact with the quantity evaluator.** The
   sentence is true of vacuity decided by predicate satisfiability and false of a `target:` whose
   emptiness the walk establishes. The shipped evaluator keys off `coverage.kind !== "bounded"`, so it
   withholds the disclosure under a bound — defensible, and not what V41's letter says. Flagged as an
   ⚠️ as-built divergence in `SEMANTICS.md` §7.1 rather than silently resolved either way, because
   choosing between "no state vector admits this" and "no execution reached it" is a semantics
   question and not a plumbing one.

**One thing the brief got right that was worth checking twice:** every figure in it — 2,750 ms, the
declared 750 ms, `satisfied` on an exhaustive walk, the `Pick`'s exact member list — reproduced
exactly.

### 5.1 Follow-ups this ruling does not take

- **[DESIGN]** Decide whether an unsatisfiable `target:` discloses vacuity at every budget on
  satisfiability grounds (V41's letter) or only at exhaustive (the shipped reading). `SEMANTICS.md`
  §7.1 carries the divergence; `src/quant/requirement.ts` is the site.
- **[FIX]** The `exists` measurement path over an empty selection emits `other`, not `vacuous`
  (§5.2 above).
- **[DESIGN]** The fixture corpus records no disclosures, so the fixture arm of `examples.test.ts`
  reads a vacuous verdict as earned. Self-detecting today — the derived arm compares against the same
  `req.status`, so one of the two assertions would fail — and stated at the helper rather than left
  silent. Recording disclosures in the fixture schema is the fix if a requirement ever needs it.
