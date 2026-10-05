# DESIGN — requirements: the polarity seam over a descriptive kernel (261004)

**Status: DESIGN. Nothing in this document is built.** Written at `7145a5a6`. Gates green at that
tree: `npm run check` exit 0, `npm run test` 965 pass / 0 fail / 0 skipped, 26 declared capabilities.

**What this document rules on.** The semantics are the author's and are not reopened here:
*properties describe; requirements prescribe*, and a prohibition is satisfied when its positive
breach query is refuted (`DESIGN-v02-semantics-261004.md:700-790`, §§18–20). What is open is the
engineering: the kernel's `Outcome` is four-valued, the author's teaching table has two rows, and the
two rows the table leaves out are where a bounded search can be turned into a false accusation. This
document rules on those, on polarity direction, on where a requirement is declared, on what holds the
claim, and on what the Learn page may derive.

**Three labels are used throughout and never blurred.** `RULED` — the author's decision, carried
forward. `MEASURED` — read from the tree at `7145a5a6` with a citation. `DESIGN` — a choice made
here, which the author may overturn.

---

## 1. What exists — measured before designing

The brief's premise is that §20 is unbuilt and that the distinction is half-implemented. The second
half of that is right and the first is wrong in a way that changes the shape of the work. The
distinction is **fully** implemented — twice, in two layers, with two different vocabularies — and
neither layer can see the other.

### 1.1 Half A — the pinning mechanism, inside `src/`, complete

A requirement already exists in the product as *a property whose satisfaction the engineer declared
matters*. The whole chain ships:

| Stage | Site (verified at `7145a5a6`) | What it does |
|---|---|---|
| Declaration | a saved query's `expect:` key | `examples/docable.mage.yaml:266,283,300,315,335` |
| Comparison | `src/engine/index.ts:141-163` | `checkExpectation(raw, res)` — string equality `expect === res.outcome` |
| Verdict union | `src/engine/index.ts:133-137` | `ExpectationVerdict` = `exploratory \| met \| unmet \| coerced` |
| Projection | `src/app/properties.ts:103-108` | `Expectation { declared, met: boolean, problem }` |
| The distinction | `src/app/properties.ts:511` | `kind: expectation === null ? "property" : "requirement"` |
| Reading | `src/ui/view-model.ts:981-986` | REQUIREMENT MET / UNMET / could-not-be-read |
| Ordering | `src/ui/view-model.ts:1190-1196` | requirements first in the property list |
| Rail word | `src/ui/shell/nav.ts:86-87` | `kind` carried as a WORD, not an icon |
| Edit interposition | `src/ui/shell/review.ts:373-376` | `breaks` when a requirement stops being met |
| Authoring control | `src/ui/view-model.ts:1326-1332` | the `expect` picker, five options |
| CI gate | `src/engine/index.ts:126-131` | header: "for the CI-gate use in `validate.py`'s `check_queries`" |

So the kernel is not missing the requirement concept, the requirement/property split, the
requirements-first UI, or the "an edit would move a requirement" gate. It has all of them.

**What Half A's satisfaction check actually is: string equality over one field.** `checkExpectation`
compares the declared word to the computed word and returns met or unmet
(`src/engine/index.ts:161-163`). It consults neither `Coverage` nor polarity. That single fact is the
root of everything §3 below has to fix.

### 1.2 Half B — the prescriptive vocabulary, outside `src/`, also complete

The author's §20 vocabulary is not unbuilt. It is built in the fixture layer, where it has been
carrying three shipped examples:

```yaml
# examples/message-bus/expected-results.yaml:43-55
requirements:
  - id: no-restricted-data-to-an-impermitted-subscriber
    statement: >
      No event type carrying data above a service's permitted sensitivity may be delivered to that
      service.
    expressed_as: restricted-data-reaches-impermitted-subscriber
    satisfied_when: refuted
    status: violated
```

- **The typed shape.** `FixtureRequirement` — `id`, `statement`, `expressedAs`, `satisfiedWhen`,
  `decidedBy`, `declaredAs`, `limit`, `blockedBy`, `status`
  (`scripts/gen-example-coverage.ts:172-188`).
- **The status union.** `RequirementStatus = "satisfied" | "violated" | "pending-evaluator"`
  (`scripts/gen-example-coverage.ts:170`). `violated` is a shipped literal, at
  `examples/message-bus/expected-results.yaml:50` and
  `examples/document-processing/expected-results.yaml:80`.
- **A strict reader that refuses malformed declarations.**
  `scripts/gen-example-coverage.ts:310-337` throws `FixtureError` on: both or neither of
  `expressed_as` / `decided_by` (`:315`), a `status` outside the union (`:318-319`), a
  `pending-evaluator` with no `blocked_by` (`:320-321`), a `decided_by` without exactly one limit
  (`:326`).
- **A join gate.** `test/examples.test.ts:290-320` asserts that the recorded outcome agrees with
  `satisfied_when`, "so a requirement cannot claim to be satisfied by a query that refutes it"
  (`examples/message-bus/expected-results.yaml:39-41`).
- **A generated, byte-exact-gated capability row.** `models/example-coverage.mage.yaml:141-146`
  declares `capability.safety-as-existential-dual`, whose label already states the polarity
  discipline verbatim: *"the requirement is satisfied when the query is REFUTED, and `holds` is the
  breach."* Generated from the fixtures (`scripts/gen-example-coverage.ts:751-759`) and held
  byte-exact (`test/examples.test.ts:878-884`).
- **The third status carries weight.** `pending-evaluator` exists because "a requirement whose
  verdict needs arithmetic no product code performs cannot honestly read `satisfied` or `violated`:
  the fixture would present a hand-derived figure as a machine-verified one"
  (`scripts/gen-example-coverage.ts:166-168`). The fixture layer has *already* reasoned about
  honest-status-under-limited-reach, which is the same reasoning §3 applies to `inconclusive` and
  `unlicensed`.

### 1.3 So which half exists — answered

Both halves exist. **The gap is not conceptual and it is not lexical; it is a layer boundary.**

- Half A is **product-side and computed** — it reads a live `QueryResult` on every revision — and its
  vocabulary is a **boolean** (`met`), which cannot express a prohibition or carry an
  under-determined verdict.
- Half B is **fixture-side and recorded** — `status: violated` is a string a human typed, checked by
  a *test* comparing it against another string a human typed — and its vocabulary is the author's
  prescriptive one.

Nothing computes Half B's vocabulary from Half A's inputs. `src/` cannot produce the word `violated`,
and the fixture cannot produce a verdict about a model as loaded. The missing artifact is one
function and one union: a status over `(Outcome, Coverage, satisfied_when)`, in `src/`.

That answers the question the brief said decides the work. **This is a naming-and-polarity layer over
a concept the kernel already has — not a new concept.** It is also the smaller job than the brief
implies: the declaration shape is designed, validated, and shipped in three examples; only its
evaluation is missing.

### 1.4 Where this brief's ground truth was wrong

Five corrections, each verified. They are recorded because three of them would have changed the
design if taken on trust.

1. **"`violated` appears nowhere in `src/`" — false, and the collision matters.** Three hits:
   `src/validator/result.ts:6`, `src/validator/result.ts:119` ("One violated rule, with everything
   needed to repair it"), `src/app/capabilities.ts:554`. All three mean a **well-formedness rule
   violation** (`ValidationFinding`), not a requirement breach. So the word is taken in `src/` for an
   unrelated concept, by the validator. §3.7 rules on the collision. The brief's wider claim — that
   the word is absent from the repo — is also false: it is a shipped fixture literal (§1.2).

2. **"§20 wants a requirement→verification vocabulary. It is unbuilt" — the vocabulary is built,
   outside `src/`.** `RequirementStatus` at `scripts/gen-example-coverage.ts:170` is the author's §20
   vocabulary minus `inconclusive`/`error` and plus `pending-evaluator`. §3 should adopt and extend
   it, not invent beside it.

3. **Three of the four files the brief named do not contain a requirement-shaped notion at all.**
   Grep located the token; it did not characterise it. In each of these, `requirement` means a
   **quantitative bound** or a **UX requirements document**:
   - `src/engine/check.ts:42,245` — imports `REQUIREMENT_METRICS` (`latency`, `cost`, `peak_memory`,
     `src/quant/requirement.ts:31`) to build the `category-error` alternatives list. Nothing
     normative. `check.ts` does not evaluate expectations and is not on this seam; it is the
     admission gate (`src/engine/check.ts:1-35`), advisory and not load-bearing (`:29-34`).
   - `src/engine/model-types.ts:29,48,520` — the same `REQUIREMENT_METRICS` import, as a model type's
     declared `forms`. `:261` and `:619` say "the Learn requirement", meaning
     `requirements-learn-261002.md`.
   - `src/engine/omission.ts:6` — a cross-reference to `src/quant/requirement.ts` inside a comment
     about `missing-distinction`. Nothing else.
   - `src/ir/types.ts:422` — "a declared TOTAL … which a requirement is compared against": the
     quantitative sense again.

   The real sites are `src/app/properties.ts`, `src/engine/index.ts:126-163`,
   `src/ui/view-model.ts`, `src/ui/shell/review.ts`, `src/ui/shell/nav.ts`, and
   `src/learn/workbench-guide.ts:120-121`. None was named in the brief.

4. **"Check whether `examples/message-bus/system.mage.yaml` already declares the breach query" — it
   does, and the fixture already declares the requirement over it.** Query at
   `examples/message-bus/system.mage.yaml:479-490` (`quantifier: exists`, `form: direct`, a `where`
   comparing `source.permits lt target.carries`), with the header comment "`holds` here IS the safety
   violation" (`:478`). The requirement is at `expected-results.yaml:43-55`. The brief expected to
   find half of this.

5. **The author's §20 vocabulary is four-valued in the source, not two.**
   `DESIGN-v02-semantics-261004.md:787-800` gives `satisfied / violated / inconclusive / error`. The
   brief's two-row framing is the *Learn table* (`/Users/davisjam/Downloads/learn-1.md` §11), which
   is a teaching simplification of a vocabulary the author had already widened. §3 therefore starts
   from four words, not two — and still has to add one.

---

## 2. The two axes the kernel fused

Before the mapping, one structural finding, because it is what makes the seam small.

`src/app/properties.ts:511` reads:

```ts
kind: expectation === null ? "property" : "requirement",
```

Presence of `expect` **is** the declaration of normativity. That fuses two independent axes:

- **Pinned or exploratory** — did the engineer predict an outcome? Four values are legitimate here.
  `examples/docable.mage.yaml:335` pins `expect: unlicensed` on purpose, and its comment is explicit
  that this is pedagogy: *"an `expect` may name a REFUSAL, so 'the model declines to answer' is an
  assertable verdict rather than a failure to get one"* (`:332-334`).
- **Normative or descriptive** — does the engineer *prescribe* this, such that a different answer is
  a failure of the system under design?

Fusing them produces a defect visible in the shipped product today. `transitive-ownership`
(`examples/docable.mage.yaml:328-340`) pins `expect: unlicensed`; `properties.ts:511` therefore
classifies it `kind: "requirement"`, and `src/ui/view-model.ts:984` renders *"REQUIREMENT MET — the
engineer declared this must be 'unlicensed', and it is."* Prescribing that your own model decline to
answer is not an engineering requirement. It is a pinned descriptive property, and the UI currently
calls it a requirement that is met. The authoring control ships the same fusion: the `expect` picker
offers `inconclusive` and `unlicensed` (`src/ui/view-model.ts:1330-1331`), so a user can declare, in
one control, something that cannot be a prohibition.

**DESIGN.** Split the axes. `expect` keeps its four values and its exact current meaning — the
descriptive pin, V25-guarded (`src/engine/index.ts:148-153`). Prescription arrives as a **second,
two-valued field**, `satisfied_when`, with the same syntax and a different modality. That is the
whole seam: *prescription is a second field on an existing mechanism, not a second mechanism.*

---

## 3. The polarity seam — the status set, and the four-valued problem

### 3.1 RULED, carried forward

A requirement is a prohibition or obligation over a descriptive query plus the outcome that
discharges it. `satisfied_when: refuted` for the breach form;
`refuted → satisfied`, `holds → violated` (`learn-1.md` §11;
`DESIGN-v02-semantics-261004.md:700-760`). This document changes neither row.

### 3.2 DESIGN — the status set: five words, and why not four

```ts
/** A requirement's standing, over an Outcome. Not an Outcome: see §3.6. */
export type VerificationStatus =
  | "satisfied"       // the prescription is discharged, on evidence that bears the weight
  | "violated"        // the breach is exhibited — a witness, so coverage cannot soften it
  | "inconclusive"    // answered, and the answer does not settle the prescription
  | "not-verifiable"  // the models decline the question; no budget changes that
  | "error";          // the declaration could not be read, so there is no requirement to judge
```

Four of the five are the author's §20 words verbatim. The added one is `not-verifiable`, and §3.4
argues it is not optional.

**`satisfied` — DESIGN, stricter than the author's table.** The deciding query returned
`satisfied_when` **and** coverage is `exhaustive` or `not-applicable`. The coverage condition is not
invented here; it restates a shipped rule in the requirement layer. `presentableOutcome`
(`src/render/accessible.ts:64-70`) already refuses to present `refuted` under bounded coverage as
anything but `inconclusive`, because V22 forbids putting "refuting force behind a truncated
exploration" (`:60-62`). `src/quant/requirement.ts:13-14` says the same from the other side: "`holds`
needs the whole space: a truncated walk with no violation is `inconclusive` under bounded coverage,
never a quiet 'yes'." A requirement is the strongest reading any surface puts on a result, so it
cannot be the one surface that drops the coverage condition. **`refuted` under a bounded search is
"we did not find the breach within budget", which is not a demonstration that the prohibition
holds.** It reads `inconclusive`.

**`violated` — DESIGN, deliberately coverage-insensitive.** The deciding query returned an outcome
that exhibits the breach, and it does so *by witness*. A counterexample found inside a truncated
search is a real counterexample. `src/quant/requirement.ts:9-10` already rules this: "a violating
execution or configuration REFUTES on its own evidence, however little of the space was walked —
coverage reads exhaustive with respect to the question."

The asymmetry between `satisfied` and `violated` is the substance of the mapping, so it is worth
stating as a rule rather than leaving it in two bullets: **a witness is coverage-insensitive; an
absence is coverage-sensitive.** Presence of evidence survives a small budget. Absence of evidence
does not.

One caveat the design accepts rather than hides: `src/render/accessible.ts:50-56` downgrades
*presentation* of a counterexample under bounded coverage, "witness or counterexample alike", so the
view will not draw a bounded counterexample with the force of a proof. That is a rendering rule about
emphasis and it does not conflict — the status says the breach was exhibited; the view declines to
render the trace as a proof of *completeness*. If the author wants these aligned, align them toward
the status (the breach is real), not toward the emphasis.

### 3.3 RULED HERE — `inconclusive`

**A requirement whose deciding query is `inconclusive` is `inconclusive`. It is not `violated`.**

This is the brief's load-bearing question and it answers itself once stated with the kernel's own
sentence in view: `src/app/properties.ts:79` — *"INCONCLUSIVE — the search was bounded, so this is
not a 'no'"*, annotated at `:65` as "the one every reader mistakes for a no". Reading "not refuted"
as `violated` would make the requirement layer commit precisely the misreading the status text was
written to prevent, and it would do so with the force of an accusation: the engineer is told the
system breaches a prohibition when what happened is that a search hit `state-limit`.

Two consequences follow, and both are load-bearing:

- **The status must never be computed as a negation.** `status = (outcome === satisfiedWhen) ?
  satisfied : violated` is the defect, and it is exactly the shape of the code that exists today
  (`src/engine/index.ts:161-163` returns `unmet` for every non-equal outcome, and
  `src/app/properties.ts:454` collapses that to `met: false`). The function must be **total over
  `Outcome` by a switch the compiler checks**, so a fifth outcome — were the ban ever lifted — cannot
  default into an accusation. This is the discipline `src/engine/check.ts:204-256` already uses for
  `RefusalReason`: "Total over `RefusalReason` by the compiler, so a cause added to the vocabulary
  cannot ship without someone deciding what a revising caller should be offered."
- **`inconclusive` must carry the reason.** `Coverage.reason` is `state-limit | time-limit |
  depth-limit | null` (`src/ir/types.ts:671`). An `inconclusive` requirement that does not say
  which limit bit sends the engineer to look for a design defect. The remedy for `state-limit` is a
  larger budget; the remedy for a breach is a model change. Those must not look alike.

### 3.4 RULED HERE — `unlicensed`, and why the author's four words are one short

**A requirement whose deciding query is `unlicensed` is `not-verifiable`. It is neither `violated`
nor `error` nor `inconclusive`.**

`unlicensed` is not a failure. It is a sound refusal, and in this codebase it is frequently a
*designed* answer. `examples/message-bus/system.mage.yaml:492-503` ships a query that returns it on
purpose — "this model represents permission, never observation, so there is no vocabulary in which to
ask what arrived and when". `examples/message-bus/system.mage.yaml:450-452` ships a second, the V7
composition refusal. The kernel maps it to its own status word, `not-answerable`, with the text *"the
Workbench cannot determine whether this statement is true or false from the models currently
available"* (`src/app/properties.ts:77-78`), and exempts it from the UX-I5 grounding requirement
because "citing nothing is the true answer" (`:552-557`).

Each of the three available folds is wrong, and each is wrong in a different direction:

- **Fold into `violated`** — blames the system under design for the model's declared purpose. The
  worst of the three.
- **Fold into `error`** — blames the author's declaration for what is often a purposeful omission the
  author wrote deliberately (`src/engine/omission.ts:1-17`). Inverts a feature into a defect.
- **Fold into `inconclusive`** — the subtle one, and still wrong. `inconclusive` means *the search
  was bounded*; its remedy is budget. `unlicensed` means *the models do not represent this*; its
  remedy is a model. Telling a student to raise a bound when the answer is to declare a relation type
  sends them in the wrong direction, and the kernel refuses this conflation at every layer: `Outcome`
  keeps both (`src/ir/types.ts:666`), `statusOf` maps them to different words
  (`src/app/properties.ts:441-442`), and the glyph table keeps them distinct rows
  (`src/ui/shell/nav.ts:118-125`). The requirement layer must not re-fuse what four layers below it
  keep apart.

So the author's four words cannot cover four outcomes plus a broken declaration. Five inputs need
five words. `not-verifiable` is the one that was missing, and its sentence is already written at
`src/app/properties.ts:77-78`.

**What a `not-verifiable` requirement owes the reader: the refusal sentence.** `QueryResult.refusal`
is required when the outcome is `unlicensed` (`src/ir/types.ts:697`), and
`src/engine/omission.ts` is what makes it say "the model deliberately omits cache hit frequency"
rather than "relation type is not declared". A `not-verifiable` status that drops the refusal is
worse than no status.

### 3.5 DESIGN — `error`, and the hole in `satisfied_when` today

`error` is reserved for a declaration that could not be read. It is a statement about the
*declaration*, never about the system under design. Three reachable causes:

1. `satisfied_when` is absent, or not an outcome word.
2. `satisfied_when` is `inconclusive` or `unlicensed` — not a satisfaction condition (§4.2).
3. `expressed_as` names no saved query.

The existing code already distinguishes this class from an unmet requirement and already fails
closed: `src/app/properties.ts:453-455` — *"A coerced `expect` is not an unmet requirement — it is a
claim nobody managed to state. Held as a requirement with `met: false` and the reason, so it cannot
read as satisfied."* `src/ui/view-model.ts:981-982` renders it as its own line. **So the UI today
reconstructs three readings from a two-valued `met` plus a nullable `problem`.** Giving the status
set a fifth member types what two surfaces already compute by hand — this is consolidation, not
addition.

`error` keeps the fail-closed posture: it is a status, so it occupies the slot, and it can never read
`satisfied`.

**MEASURED — the hole this closes.** `scripts/gen-example-coverage.ts:333` validates
`satisfied_when` through a general `outcome(...)` helper, which accepts all four. So
`satisfied_when: unlicensed` parses clean today, and the authoring picker offers it
(`src/ui/view-model.ts:1331`). Nothing refuses a requirement that prescribes its own
unanswerability.

### 3.6 Why five words is not a fifth `Outcome`

The ban is real and recently reaffirmed. `PLAN.md:414-415`: "**Must not:** … add a fourth outcome;
return a bare boolean anywhere", with the ordinal confusion resolved and the substance restated as
"**no outcome beyond the declared union**" (`DESIGN-v02-semantics-261004.md:1636`). The same
section rules `exhausted` a category slip from a demoted surface rather than a fifth-outcome proposal
(`:1604-1632`).

`VerificationStatus` does not touch it:

- **`Outcome` stays four-valued** at `src/ir/types.ts:666`. No arm added, none renamed.
- **It is a function, not a field.** Derived per read, stored nowhere, outside `systemHash` — the V18
  discipline `src/app/properties.ts:20-34` states at length, and for the sharper of its two reasons:
  put a verdict in the IR and "recording the answer changes the system the answer was about".
- **Its arity is not `Outcome`'s, because its inputs are not `Outcome` alone.** Three inputs —
  `Outcome`, `Coverage`, and the readability of the declaration — need not produce four values.
  `PropertyStatus` is the shipped precedent: six words over four outcomes
  (`src/app/properties.ts:60-61`), with a header section titled "Status is five words over four
  outcomes" that argues the case (`:40-51`). A status over an outcome is an established shape here.

The relation to `PropertyStatus` should be stated rather than left for a reader to guess:
`PropertyStatus` answers *what do the models say about this claim*; `VerificationStatus` answers *is
this prescription discharged*. They sit on the two axes §2 separates, and a property that is pinned
but descriptive has the first and not the second.

### 3.7 DESIGN — the `violated` name collision

`violated` already means "a well-formedness rule was violated" in `src/`
(`src/validator/result.ts:119`; `UxViolation` at `src/app/capabilities.ts:1069`). Three options were
considered: rename the validator's usage (large, and the validator's word is correct in its own
domain); pick a different requirement word (`breached` — but it departs from the author's ruled
vocabulary and from the shipped fixture literal); or scope by type.

**Scope by type.** The word is only ever reached as `VerificationStatus`, which no validator type
admits, so the compiler keeps them apart. The cost is a grep that returns two unrelated concepts, and
the mitigation is a sentence in the union's doc comment saying so — because the next reader to grep
`violated` will find the validator first, and `src/ir/types.ts:14` records that this file family has
"twice claimed more than it held" when a sentence went unwritten.

---

## 4. Polarity direction — RULED HERE: constrain the condition, not the query

The brief asks whether a requirement's query must be positive and existential. **No.** Constraining
the query's polarity would break a shipped fixture; constraining `satisfied_when` is both necessary
and sufficient.

### 4.1 MEASURED — both polarities already ship

| Requirement | `satisfied_when` | Deciding query | Quantifier / form |
|---|---|---|---|
| `no-restricted-data-to-an-impermitted-subscriber` (`examples/message-bus/expected-results.yaml:44-49`) | `refuted` | `restricted-data-reaches-impermitted-subscriber` | `exists` / `direct` (`system.mage.yaml:479-490`) |
| `retry-policy-bounds-every-execution` (`examples/worker-queue/expected-results.yaml:40-46`) | `refuted` | `job-can-retry-forever` | `exists` |
| `processing-implies-custody` (`examples/worker-queue/expected-results.yaml:28-33`) | **`holds`** | `lease-held-while-processing` | **`forall` / `invariant`** (`system.mage.yaml:354-364`) |
| `publication-requires-validation` (`examples/document-processing/expected-results.yaml:63-68`) | `refuted` | — | — |

A requirement satisfied by `holds` over a universal invariant is already shipped, already
`status: satisfied`, and its note explains why the universal form is the honest one: "every reachable
configuration was enumerated and none violates the predicate"
(`examples/worker-queue/expected-results.yaml:35-36`).

### 4.2 Why the breach form cannot be mandated — it is a model-type fact, not a style choice

The breach form is not a convention the author chose; it is **forced on graph models and unavailable
nowhere else.**

- **Graph models have no universal form.** `src/engine/graph.ts:464-470` refuses
  `quantifier: forall` outright: "no universal graph form in v0.1, so quantifier 'forall' has no
  reading here." The generator says why: "every graph form is established by a witness"
  (`scripts/gen-example-coverage.ts:746-747`). So a graph safety requirement **can only** be the
  existential dual.
- **Behaviour models do have one.** `form: invariant` is `quantifier: forall`
  (`src/engine/behavior.ts:58`), and `QUANTIFIER_EVIDENCE.forall` is "exhaustive satisfaction
  establishes it, a counterexample refutes it" (`src/engine/types.ts:129-132`).
- **Quantity models require `forall`** for a declared ceiling (`src/quant/query.ts:156-160`).

Mandating the breach form would make a behavioural invariant unstateable in its natural modality;
mandating the universal form would make a graph safety requirement unstateable at all. **So polarity
is a property of the `(query, satisfied_when)` pair, and the pair is where it is declared.** The
generated capability row already frames it this way — `safety-as-existential-dual` is a *separate
row* from `safety` because "the two establish a property by opposite evidence and a reader who
conflates them will misread one of the two answers"
(`scripts/gen-example-coverage.ts:748-750`).

### 4.3 The constraint that does hold, and what refuses a non-conforming declaration

**`satisfied_when ∈ {holds, refuted}`.** `inconclusive` and `unlicensed` are not satisfaction
conditions — they are the two ways the kernel reports that it *did not settle* the question, and a
prescription cannot be discharged by a non-answer. Prescribing your own unanswerability is a category
error; pinning it is legitimate and keeps its existing home in `expect` (§2).

Three rungs refuse it, in the order the project's §35.5 assesses rungs:

- **Rung 1 — the compiler.** `satisfied_when: "holds" | "refuted"` as a two-member union, not
  `Outcome`. A narrowing at the type, so no reader, test, or UI can widen it. This is the rung
  `scripts/gen-example-coverage.ts:333` currently skips by routing through the general `outcome(...)`
  helper.
- **Rung 2 — the reader, at the trust boundary.** YAML is untyped input, so the loader must reject it
  by name. The site and the shape both already exist: `scripts/gen-example-coverage.ts:310-337`
  throws `FixtureError` for four sibling malformations. Add a fifth, with the sentence saying why —
  "`inconclusive` and `unlicensed` report that the question was not settled, so neither can discharge
  a prohibition."
- **Rung 3 — the authoring control.** `src/ui/view-model.ts:1326-1332` keeps its five `expect`
  options unchanged; a *separate* two-option `satisfied_when` control is added. Deriving both lists
  from their respective unions rather than writing them out keeps the two from drifting — the
  discipline `:1315-1317` already applies to `noteKinds`.

---

## 5. Where it is declared, and what holds it

### 5.1 DESIGN — placement: student YAML, not the registry

§35.5 puts `semantic_basis` inside `src/engine/model-types.ts` and not in student YAML, on a reason
stronger than ergonomics: *"The claim is about the **language**, one per construct — not about any
particular model. A YAML field would therefore invite N copies of one language-level fact, free to
disagree with each other"* (`DESIGN-v02-semantics-261004.md:1390-1392`), and the loader would drop it
anyway (`:1392-1396`).

**A requirement inverts every term of that argument.** It is a claim about one particular model
system, not about the language; there is exactly one copy, because the system is its only subject; and
the author owns it. It is the student's own normative statement about the student's own system, and it
changes when their system changes. It belongs in their file.

### 5.2 DESIGN — the shape: adopt the fixture's, join by id

The genre check (A.9 / rule #22) has an unusually clean answer here: the canonical best-in-class
shape is *in this repository*, has survived three examples and a strict reader, and the author's own
§19 sketch matches it. Adopt it.

```yaml
requirements:
  - id: no-restricted-data-to-an-impermitted-subscriber
    statement: >
      No restricted event may reach a service not permitted to process it.
    expressed_as: restricted-data-reaches-impermitted-subscriber
    satisfied_when: refuted
```

Three decisions inside that shape:

- **A requirement carries its own `statement`, in normative modality.** Three sentences are in play
  and they are genuinely distinct: the *question* ("Can restricted data reach an impermitted
  subscriber?"), the *proposition* the saved query records ("An event carrying restricted data reaches
  a service not permitted to process it" — `system.mage.yaml:480`), and the *prohibition*
  ("…must not…"). `src/app/properties.ts:1-11` already insists on the first/second split and
  normalizes the interrogative away. Overloading the query's `name` with the prohibition would lose
  the second, and the fixture already keeps both (`expected-results.yaml:45-48` beside
  `system.mage.yaml:480`).
- **Join by id to an existing saved query; do not inline a query.** The cardinality is 1:N — one
  query can decide several prohibitions, and `expressed_as` already expresses it. Inlining would
  duplicate the query and re-open the drift the fixture layer closed.
- **The declaration enters `systemHash`; the status does not.** The requirement is authored content,
  so canonicalization must carry it and the hash must cover it. Its *status* is derived and stored
  nowhere, for the V18 reason at `src/app/properties.ts:20-34`. Stating both halves is necessary
  because only one of them is obvious.

### 5.3 DESIGN — the two claims, in §13's vocabulary

The brief asks which of `asserted / checked / derived / generated` (`SEMANTICS.md:1222-1250`) applies
to a requirement's satisfaction claim. The honest answer is that there are **two** claims and they
take **different kinds**, and conflating them is the defect `SEMANTICS.md` §13 was written to name —
"sentences kept claiming correspondence the gates never held" (`SEMANTICS.md:1194-1195`).

| The claim | Kind | What holds it |
|---|---|---|
| **The status** — that this requirement is `satisfied` / `violated` / … given these models | **`derived`** | Mechanism, totally. Recomputed from `(Outcome, Coverage, satisfied_when)` on every read, stored nowhere. A compiler-total switch; pins in `test/`. |
| **The expression** — that this prohibition is faithfully expressed by *that* query under *that* `satisfied_when` | **`asserted`** | Nothing mechanical. A person read the sentence and the query together. Presence of the join is enforceable; its faithfulness is not. |

Two notes on that table, each worth its line:

**This would be the first use of `derived`.** `SEMANTICS.md:1233` records it as "admitted by the
enum, defined by no use". A requirement status is an unusually clean definition for it — computed
from the model on every read by named product code, with nothing hand-written in the path — and
landing it would retire a row of that table rather than add to it.

**The `asserted` half is the one that can lie, and no rung reaches it.** §35.5's three rungs apply
exactly, and its Rung 3 names the same kind for the same reason — *"that the correspondence is
right: nothing mechanical, and not reachable under the no-dependency ruling. In §13's vocabulary,
this is `asserted`"* (`DESIGN-v02-semantics-261004.md:1467-1468`). Rung 1 is presence (the join
resolves — compiler and reader); Rung 2 is non-placeholder content (the `statement` is real prose,
not a stub — a test, mirroring the one at `test/examples.test.ts:285`); Rung 3 has no instrument. A
requirement whose statement says "must not reach" over a
query that asks about the wrong relation will read `satisfied`, in green, forever. The status is
honestly `derived`; what it is derived *about* is `asserted`.

**So the status must never be presented as warranting the expression.** The prose beside a
`satisfied` requirement has to say what was established — *this query, refuted, exhaustively* — and
not *your prohibition holds*. This is the same bound `src/ir/types.ts:14` records having breached
twice, and the same one the CI gate keeps: "every tracked model query carrying `expect` is evaluated
by the coverage gate, while the gate explicitly does not claim model-to-code correspondence"
(`DESIGN-v02-semantics-261004.md:733`, quoting `workbench-open-questions-261004.md`; the author
repeats the instruction at `:1210` — "**especially** preserve the last distinction").

---

## 6. The teaching surface — what Learn may derive

UX-I9 binds: Learn's capability facts derive from the registry and shipped examples, never
hand-written (`src/learn/content.ts:1-21`, which enumerates its permitted sources and names the two
exclusions — section labels and page furniture).

### 6.1 The derivable sources exist, and one is already read from `src/`

- **The polarity rule itself** is already generated prose. `models/example-coverage.mage.yaml:143`
  carries, as a `label` the generator wrote: *"A safety property over a graph model, stated as the
  existential dual because v0.1 declares no universal graph form: the requirement is satisfied when
  the query is REFUTED, and `holds` is the breach."* Generated at
  `scripts/gen-example-coverage.ts:751-759`, byte-exact gated at `test/examples.test.ts:878-884`. It
  is not reachable from `src/` today (MEASURED: every consumer of `example-coverage.mage.yaml` is a
  test or the generator).
- **The requirement records are reachable from `src/` today.** `src/app/examples.ts:95` defines
  `fixturePath`, and `readPresentation` (`:114-139`) already parses
  `examples/<id>/expected-results.yaml` through the `AssetReader` port for `title`, `summary` and the
  `suggested` flags. The `requirements:` block sits in the same document, three shipped instances,
  two polarities, two statuses. **DESIGN: this is the derivation path.** It needs a reader in
  `src/app/examples.ts`, not a new port, and it costs no new source of truth.

### 6.2 What Learn can then derive, and the one thing it must not hand-write

Once the status function and that reader land, a Learn requirements section derives:

- **The worked instance**, verbatim from the fixture: the prohibition (`statement`), the deciding
  query's own proposition (its `name`), `satisfied_when`, and the computed status. The author's §11
  example and the shipped record are the same artifact.
- **Both polarities**, because the fixtures carry both (§4.1). `satisfied_when: refuted` over
  message-bus's existential breach query, and `satisfied_when: holds` over worker-queue's `forall`
  invariant. A page that showed only the breach form would teach the constraint §4.2 refutes.
- **§10's climax, unchanged.** *"The model changed. The query did not."* Already supported: status is
  recomputed per revision and stored nowhere.

**The §11 table must be rendered from the status function, not written as two rows.** This is the
sharpest UX-I9 consequence. A hand-authored two-row table is a capability claim about what MAGE
supports, so UX-I9 forbids it; worse, a two-row table taught as complete *is* the false-accusation
teaching error — a student who learns "refuted → satisfied, holds → violated" has been told, by
omission, that every other answer means violated. Render all five rows from the union, so the table
cannot drift from the kernel and cannot be silently incomplete.

### 6.3 MEASURED — one shipped sentence this retires

`src/learn/workbench-guide.ts:120-121` hand-writes: *"Declaring an expectation makes a property a
requirement. A differing outcome then counts as a failure rather than as a finding."*

Under this design the first sentence becomes wrong (§2: an expectation makes it *pinned*; a
`satisfied_when` makes it normative) and the second becomes wrong in the dangerous direction (a
differing outcome of `inconclusive` or `unlicensed` is precisely *a finding and not a failure*).
Phase 3 must retire it, and derive what replaces it.

---

## 7. Phasing, and the first fixture

The vocabulary is the risky part and the schema is the cheap part, so the vocabulary goes first —
against the declaration where it already lives.

**Phase 1 — the status mapping, over the existing declaration.** `VerificationStatus` + a
compiler-total `verify(outcome, coverage, satisfiedWhen)` in `src/engine/`. Narrow `satisfied_when`
to two values at the type and in the fixture reader (§4.3, rungs 1–2). Split §2's two axes in
`src/app/properties.ts`: `kind: "requirement"` requires a normative condition, not merely an
`expect`. Pin all five arms, both polarities, and the two coverage cases. **No schema change, no new
YAML key, no IR construct.** This is the smallest sound seam, and it is where every correctness
question in this document lives.

**Phase 2 — the declaration, promoted.** `requirements:` into `mage-model.schema.json`, a
`CanonRequirement` in the IR, canonicalization, the hash. Move the join from `test/examples.test.ts`
to the product, so a requirement's status comes from a loaded system rather than from two recorded
strings compared by a test. Phase 2's gate is that it changes no Phase-1 verdict.

**Phase 3 — Learn.** The `src/app/examples.ts` reader, the derived section, the rendered five-row
table, and the retirement of `workbench-guide.ts:120-121`.

### 7.0 As-built, 261005 — ⚠️ two divergences from Phase 2, both measured

Phase 1 and Phase 2's schema half landed on 261004. The example migration landed on 261005 and
departed from Phase 2's wording twice. Recorded here because the wording, repeated in
`DECISIONS-RULED-authored-constructs-261004.md` §4, would send the next reader to undo both.

**1. "Two recorded strings compared by a test" understates what was there.** The gate at
`test/examples.test.ts` already interpreted through `verify` — it derived a `VerificationStatus`
from the fixture's recorded outcome AND its recorded coverage, then compared that to the recorded
status. Two recorded INPUTS, one derived comparison. The distinction decides the next point.

**2. The join was NOT moved out of the test; a derived arm was added beside the recorded one.**
Phase 2 reads "move the join … so a requirement's status comes from a loaded system rather than from
two recorded strings." The first half shipped: `verifySystemRequirements` runs the saved queries and
derives each verification from the authored model, and the gate asserts that. The second half did
not, and the reason is a measured asymmetry rather than caution. `verify` is coverage-sensitive on
the `satisfied` arm — an absence of evidence does not survive a truncated walk — and the recorded
arm feeds it the fixture's PINNED coverage. So the two arms answer different questions, and one
input proves it: a `refuted` outcome against `satisfied_when: refuted` derives `satisfied` under the
live exhaustive coverage and `inconclusive` under a pinned `bounded` coverage. Retiring the recorded
arm would drop the only check that a fixture's pinned coverage still supports the status it records.

Today no shipped pair exhibits the divergence — every query deciding a migrated requirement records
`coverage: exhaustive`, so the arms agree trivially. The retained arm is forward-policing, which is
the same argument this project applies to authoring a lint at zero findings.

**What did not migrate, and what that cost.** Eight of ten requirements migrated — one each in
message-bus and embedded-sensor-node, two each in transaction-workspace and worker-queue, two of
document-processing's four. (The first two commits of this wave say "nine of eleven" in their
messages; that was a miscount, corrected here against a count of the authored blocks at HEAD.)
`document-processing`'s
`normal-processing-latency` and `peak-memory` take the `decided_by` route, and `expressed_as` joins
to a SAVED query by id — a question composed from a declared ceiling at analysis time is saved
nowhere to be named, and the authored shape has no key for a ceiling. Two things follow that the
design did not anticipate:

- **The nearest available distortion produces a false `satisfied`.** `max-latency-among-successful-executions`
  is a saved query over the same executions, so `expressed_as` could name it — and it asks only
  whether a determinate maximum EXISTS, naming no ceiling. Authored that way the 750 ms obligation
  derives `satisfied` (measured) while the product holds 2,750 ms against a 750 ms ceiling. The gate
  catches it, because the fixture still records `violated`.
- **Migrating them would trade away an INDEPENDENT oracle.** A `decided_by` requirement is checked
  against a hand-derived arithmetic expectation — `expected_ms: 2750` from declared charges times
  occurrence counts, joined through each quantity's own `target` — which is a claim about the
  fixture's numbers and not about the product. An `expressed_as` requirement has no such oracle; its
  check is the product against itself plus a recorded status. So the two staying fixture-side is not
  only forced, it is the stronger arrangement until a saved query states those ceilings directly.

### 7.1 The first fixture — and why one is not enough

**`examples/message-bus`, requirement `no-restricted-data-to-an-impermitted-subscriber`.** It is the
natural first fixture on every count, and the brief's hypothesis is confirmed: the breach query is
declared (`system.mage.yaml:479-490`), the requirement is declared over it
(`expected-results.yaml:43-55`), it is the author's own example verbatim, and it ships
`status: violated` **on purpose** — "Violated on purpose. Analytics permits internal data and
subscribes to OrderCreated, which carries a restricted shipping address"
(`expected-results.yaml:51-55`). A first fixture that shipped `satisfied` would never exercise the
`violated` arm.

**It must be paired with `examples/worker-queue`, requirement `processing-implies-custody`**
(`satisfied_when: holds`, `forall`/`invariant`, `status: satisfied`). A Phase-1 wave that pinned only
the breach form would enshrine in tests the assumption §4.2 refutes, and the next reader would find
the constraint in the pins rather than in the ruling.

**Neither covers `inconclusive`, `not-verifiable`, or `error` — construct those.** No shipped
requirement exercises them, which is exactly why they are the arms most likely to ship wrong. Both
subjects exist: `examples/message-bus/system.mage.yaml:492-503` and `:450-461` are shipped
`unlicensed` queries, and `examples/docable.mage.yaml:328-340` is a third. Negative controls belong
here too — the project's own habit (`test/examples.test.ts` and the capability suite both carry
"— negative control" tests): a pin asserting that `inconclusive` does **not** read `violated` is the
single most valuable test in the wave.

---

## 8. Second-order dynamics

A requirement is a standing claim over an artifact three independent actors edit. Walking the
repetition is where the status set earns or loses its keep (rule #45 / A.11).

### 8.1 The model is edited — RULED, and already safe

This is the author's §10 climax: *"The model changed. The query did not."* It works today and this
design must not break it. Status is derived per read and stored nowhere
(`src/app/properties.ts:20-34`), `stale` exists to catch any caller that caches a verdict
(`:134-140`), and UX-I5 reports a stale verdict as a violation rather than presenting it
(`:565-571`). `VerificationStatus` inherits all three by being a function of a `QueryResult` the
caller just computed. **Nothing to add.** The one prohibition: `VerificationStatus` must never become
a field of anything persisted, or the climax inverts — recording that a requirement is satisfied
would change the system the claim was about.

### 8.2 The query is edited — the real hazard, and it is silent

The query is the requirement's denotation, so editing it re-denotes the prohibition without touching
it. `expressed_as` joins by id, which survives a reworded `name` and also survives a **changed
form** — and a form change can invert polarity. `examples/docable.mage.yaml:296-299` records the
case: the same target under `recurrence` answers `holds` and under `repeatable-cycle` answers
`refuted`, and "the verdict belongs beside the form for that reason: it is the form, not the target,
that decides the question being asked."

So a requirement declared `satisfied_when: refuted` over a query whose form was changed may now be
discharged by the opposite answer, with no edit to the requirement and no diagnostic. **DESIGN:**
Phase 2 must interpose on a form or quantifier change to any query named by an `expressed_as`, and
say so in the `satisfied_when` terms — not merely report that a status moved. The review surface is
the right place; §8.4 says what it needs first.

### 8.3 A named relation is removed — the case the whole design exists for

An engineer deletes a relation type the breach query traverses. The query becomes `unlicensed`
(V7-style refusal, or `missing-distinction` via `src/engine/omission.ts` when the removal was
recorded as a purposeful omission).

- **Under "not refuted means violated":** the engineer is told their safety requirement is now
  **violated**. They go looking for a data leak. There is none. The model simply no longer represents
  the relation the prohibition was stated in. This is the false accusation the brief names as the
  worst failure available, and it is reachable by a one-line edit.
- **Under this design:** `not-verifiable`, carrying the refusal sentence, which names the missing
  vocabulary and — when `omits` covers it — names it as a *decision* rather than a typo
  (`src/engine/omission.ts:11-17`). The correct reading reaches the engineer: *you removed the
  vocabulary this requirement was stated in.*

The second-order observation that makes this more than a nicety: **deleting vocabulary is how a
requirement would be silenced.** If `unlicensed` read `satisfied`, a prohibition could be discharged
by deleting the relation it prohibits — the worst direction of all, because it is green. If it read
`violated`, every purposeful omission becomes a false alarm and engineers learn to ignore requirement
status. `not-verifiable` is the only arm that is neither silent nor crying wolf, which is the
argument for paying a fifth word for it.

### 8.4 The same requirement, over many revisions — and a shipped predicate that must change

`src/ui/shell/review.ts:375` defines a break as:

```ts
breaks: kind === "requirement" && b?.expectation?.met === true && a?.expectation?.met !== true,
```

Over a two-valued `met` that is the only definition available. Over `VerificationStatus` it is
**wrong in both directions**, and it is the one shipped predicate this design obliges to change:

- `satisfied → inconclusive` sets `breaks: true`. The engineer widened the state space past the
  search budget; the review surface tells them they broke a safety requirement.
- `satisfied → not-verifiable` sets `breaks: true`. They removed a relation; same false alarm.
- `violated → error` sets `breaks: false`. The requirement stopped being readable while already
  breached, and the surface reports no break.

**DESIGN:** two words where there is now one. `breaks` means *became `violated`*. A second —
`lostEvidence` — means *left `satisfied` without becoming `violated`*. Both must interpose on the
edit (`review.ts:422-424` lands straight onto the authoritative branch "unless a requirement would
move"), and both must read differently, because the remedies are different: a breach needs a model
change, a lost demonstration needs a budget or a model type.

Two smaller dynamics, recorded rather than designed:

- **Status churn near the budget.** A requirement can oscillate `satisfied ↔ inconclusive` as a model
  grows toward the state limit, with no semantic change. `Coverage.reason` is what keeps this
  legible — "the search hit `state-limit`" is a different sentence from "this may be violated" — and
  it is why §3.3 requires the reason to travel with the status.
- **A `pending-evaluator` analogue may still be needed.** The fixture layer's third status exists
  because a hand-derived figure must not read as machine-verified
  (`scripts/gen-example-coverage.ts:164-168`), and two shipped requirements use the `decided_by`
  route whose oracle is a human
  (`examples/document-processing/expected-results.yaml:74-80,91-96`;
  `test/examples.test.ts:315-320`). Phase 2 must decide whether those migrate to
  `VerificationStatus` or keep a fixture-side status. **Open; §9, Q4.** Deciding it by accident would
  re-introduce the defect `pending-evaluator` was invented to prevent.

---

## 9. Open questions for the author

1. **The fifth word.** §20 gives four; §3.4 argues `unlicensed` needs its own and proposes
   `not-verifiable`. Accept five, or fold `unlicensed` into `inconclusive` and accept that the page
   will tell a student to raise a budget when the remedy is to declare a relation type?
2. **The coverage condition on `satisfied`** (§3.2) is stricter than the two-row table: `refuted`
   under bounded coverage reads `inconclusive`, not `satisfied`. It restates V22 and two shipped
   sites (`src/render/accessible.ts:64-70`, `src/quant/requirement.ts:13-14`), but it means a
   requirement over a bounded search never reads green. Ratify?
3. **Phase 1 against the existing declaration** (§7), with `requirements:` promoted to the schema
   only in Phase 2 — versus §19's sketch, which reads as a schema construct from the start.
4. **The `decided_by` route** and `pending-evaluator` (§8.4). Does a requirement decided by a
   hand-derived quantitative oracle get a `VerificationStatus` at all?
5. **`src/learn/workbench-guide.ts:120-121`** asserts a capability claim in hand-written prose
   (§6.3). Retiring it is in scope here; whether the `workbench-guide` tier is bound by UX-I9 at all
   is a prior question this design does not own.

---

## Appendix A — citation verification

Every `file:line` above was read with its surroundings at `7145a5a6`, not taken from a grep hit.
`SEMANTICS.md:1208-1216` records that anchors in this repo drifted inside one day; the four claims
the argument leans on hardest are therefore named here for re-verification by symbol:

| Claim | Verify by symbol |
|---|---|
| `Outcome` is four-valued | `export type Outcome` in `src/ir/types.ts` |
| presence of `expect` is the normativity declaration | `kind: expectation === null` in `src/app/properties.ts` |
| satisfaction is string equality | `expect === res.outcome` in `src/engine/index.ts` |
| `refuted` under bounded coverage presents as `inconclusive` | `presentableOutcome` in `src/render/accessible.ts` |

**Probe discipline.** One measurement in §1.4 was a near-miss worth recording. `grep -rn "violated"
src/` returns three hits, and reading only the line numbers would have confirmed the brief's premise
backwards — the hits exist, so "appears nowhere" is false, but they mean *validator rule violation*
and not *requirement breach*, so the premise was also right in substance and wrong in letter. Only
reading the surrounding declaration (`ValidationFinding`, `src/validator/result.ts:119-124`)
separated the two, and that separation is what produced §3.7.

## Appendix B — gates

Run at `7145a5a6` in this worktree, Node 24.21.0:

- `npm run check` — exit 0 (`tsc --noEmit`).
- `npm run test` — 965 tests, 965 pass, 0 fail, 0 skipped, 0 todo.
- 26 declared capabilities (`CAPABILITIES.length`, `src/app/capabilities.ts`); affordance-parity
  suite green.

This document is prose. No code, model, test, or fixture was changed.
