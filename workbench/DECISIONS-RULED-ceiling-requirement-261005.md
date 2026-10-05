# RULED — the ceiling-bearing obligation already authors; no `ceiling:` key, and `decided_by` names nothing (261005)

The commissioning brief asks whether the authored requirement should be able to express *"this quantity
stays under this ceiling"*. It already can. Two shipped requirements do it, one of them the Embedded
Sensor Node budget the brief names as the obligation a student cannot currently write.

So this document rules against the key, and it also rules against the framing. The gap the brief
describes does not exist. A different gap does, it is narrower, and it is worse: **a requirement may
name a deciding query that cannot refute it, and the engine reports that as `satisfied`.** Measured at
1,152 MB against a declared 512 MB ceiling.

Baseline measured at `3df677fa` before anything was read: `npm run check` clean, `npm run test`
**1275 pass / 0 fail / 0 skipped**. Matches the brief's figure. Nothing in this document changes it —
prose only.

---

## 0. Measured first, because two premises did not survive

### 0.1 `queries:` saves a ceiling today, and the schema says so

`mage-query.schema.json:141` declares `within` on a `quantityQuery`:

> The `model:`-targeted quantity declaring the ceiling to decide against. A name that resolves to no
> declared quantity is a V39 finding at authoring time and a refusal at ask time.

The ceiling is a *reference*, not a literal, and `validate.py:1033` holds the reference (V39). The
quantifier is forced in code, both directions (`src/quant/query.ts:156`, `:163`): `within` present
demands `forall`, `within` absent demands `exists`. A ceiling claim is universal; a measurement is
existential. Neither can be miswritten.

### 0.2 Eight authored requirements, two quantity-decided, and both carry a ceiling

Every authored requirement in the corpus, probed through `verifySystemRequirements`:

| Example | Requirement | Deciding query | kind | `within:` | → |
|---|---|---|---|---|---|
| document-processing | `publication-requires-validation` | `publish-without-validating` | behavior | — | SATISFIED |
| document-processing | `successful-processing-within-two-seconds` | `successful-executions-within-two-seconds` | **quantity** | **`successful-latency-requirement`** | VIOLATED |
| embedded-sensor-node | `firmware-fits-physical-sram` | `sram-fits-budget` | **quantity** | **`sram-budget`** | SATISFIED |
| message-bus | `no-restricted-data-to-an-impermitted-subscriber` | `restricted-data-reaches-impermitted-subscriber` | graph | — | VIOLATED |
| transaction-workspace | `commit-requires-validation` | `commit-without-validating` | behavior | — | SATISFIED |
| transaction-workspace | `no-stale-base-commit` | `committed-base-is-current` | behavior | — | SATISFIED |
| worker-queue | `processing-implies-custody` | `lease-held-while-processing` | behavior | — | SATISFIED |
| worker-queue | `retry-policy-bounds-every-execution` | `job-can-retry-forever` | behavior | — | SATISFIED |

Both quantity-decided requirements name a ceiling, both declare `satisfied_when: holds`, and one of
them reads VIOLATED — so the arm that accuses the system is live, not theoretical.

`examples/embedded-sensor-node/system.mage.yaml:478-483` is the brief's own counterexample:

```yaml
firmware-fits-physical-sram:
  statement: >
    The modeled firmware's SRAM allocations fit within the part's 256 KiB of physical SRAM.
  expressed_as: sram-fits-budget        # kind: quantity, forall, within: sram-budget
  satisfied_when: holds
```

### 0.3 The architecture is already written down, as teaching material

`examples/embedded-sensor-node/system.mage.yaml:115-122`, a `rationale` note on the budget quantity:

> The 256 KiB ceiling is a physical fact about the part, not a policy. It is declared as a
> `model:`-targeted quantity because a budget is a NUMBER: a `model:` total is charged by no
> accounting basis and exists to be compared against. The OBLIGATION that cites it is a separate
> declaration in this file's `requirements:` block, which names the query that decides it **rather
> than restating the figure**.

Three roles, three places, one figure: the quantity *declares* the number, the query *compares*
against it by reference, the requirement *obliges*. "Rather than restating the figure" is the ruling
below, authored before this document asked the question.

### 0.4 So why did two requirements not migrate

Not for want of a construct. `examples/document-processing/system.mage.yaml:756-757`, the author's own
note, gives the actual reason:

> Saving the two composed questions here would make them expressible; it would also add two saved
> queries to teach a join, which is a change to what the example is about and not a migration of it.

**Expressible. The author says so.** The hold-back is pedagogical scope, not expressive power.

### 0.5 Measured: both migrate today, with no change to any construct

A throwaway probe (not committed) added one saved `within:` query per requirement over the ceiling
quantities the example *already declares*, moved each row to `expressed_as`, and re-derived:

| Probe | New saved query | Derived | Fixture records |
|---|---|---|---|
| C1 `normal-processing-latency` | `forall`, `metric: latency`, `within: latency-requirement`, `target: published` | **VIOLATED** | `violated` |
| C2 `peak-memory` | `forall`, `metric: peak_memory`, `within: peak-memory-requirement` | **SATISFIED** | `satisfied` |

Both agree with the hand-derived oracle — 2,750 ms against 750 ms, and 384 MB against 512 MB. No
schema change, no IR change, no new key. The two "unmigratable" requirements are two saved queries
away, and `test/examples.test.ts:416-421` already says so in its own failure message:

> a `decided_by` requirement is decided by a COMPOSED question, and the model authors one anyway.
> **If a saved query now states this ceiling, give the fixture row `expressed_as` and let the derived
> arm decide it.**

---

## 1. RULED — no `ceiling:` key on a requirement, ever

**A ruling, not a deferral.** A key for it would be worse than no key, and the gap it would close is
already closed.

Three reasons, in descending order of how much each constrains the choice.

1. **It would be a second source of truth for a number the model already declares.** The 750 ms lives
   once, at `quantities.latency-requirement.value`
   (`examples/document-processing/system.mage.yaml:343-347`), as a `model:`-targeted total that
   SEMANTICS.md 5.3 exempts from every accounting basis so it can exist to be compared against. A
   requirement-side ceiling would be free to disagree with that quantity, and nothing could decide
   which copy was right. The hazard is not hypothetical: the fixture corpus *already* keeps a second
   copy (`limit_ms: 750`, `limit_mb: 512`), and it already costs a dedicated test to hold —
   `test/examples.test.ts:842` exists only to assert that the fixture's limit equals the declared one,
   with the comment *"Without this check the fixture's `limit_ms` is a second copy free to drift from
   it."* Promoting that shape into the model would promote the drift and buy a third copy.

2. **Nothing would read it.** `verify(req, ev)` consumes a `Requirement` and a `QueryEvaluation`
   (`src/engine/verification.ts:254`), and the comparison it performs is `ev.verdict !==
   req.satisfiedWhen` — two proposition values. A magnitude has no place in it. The comparison against
   a ceiling happens one layer down, at admission, where `src/quant/query.ts:116-151` resolves the
   quantity, converts the unit, and refuses a cross-dimension comparison by name (`:135-143`). A requirement-side
   ceiling would either duplicate that resolution or be ignored, and `parseRequirement` could not even
   check its unit: its own doc comment records that it *"reads a declaration and has no system in
   hand"* (`src/engine/verification.ts:136-137`). The brief asks where the unit would live and what
   refuses a mismatched one. Both answers already exist, and neither is reachable from the requirement.

3. **The capability ships twice, so the key would be a second way to say one thing.** §0.2. Adding a
   `ceiling:` key would give a student two spellings of the Sensor Node obligation, one of which
   bypasses V39 and the forced quantifier. Uniformity is worth more here than a shorter declaration.

The schema's standing discipline points the same way. `requirements` answers SHAPE and stops, leaving
vocabulary to the engine (`mage-model.schema.json:265-290`; `satisfied_when` is `type: string` with no
enum for that reason). A ceiling is a value with a unit and a dimension — the most meaning-laden thing
in the model — and a schema that declines to enumerate two words has no business carrying it.

---

## 2. RULED — `decided_by` is fixture bookkeeping; the construct set must not name it

The brief offers `decided_by` as "a legitimate second route that the construct set should name rather
than eliminate." Reject it, on two grounds.

**It is not a model key and never was.** `decided_by`, `declared_as`, `limit_ms` and `limit_mb` appear
only in `expected-results.yaml`, which answers to no schema, and their readers are the fixture layer
and the coverage script (`src/learn/fixtures.ts:118-128`,
`scripts/gen-example-coverage.ts:311-335`). `mage-model.schema.json` has thirteen top-level properties
and no route for any of them. Naming a test-oracle key in the authored construct set would make a
requirement have two kinds for the sake of a surface the author never writes.

**The independent oracle does not belong to the key, so migration does not trade it away.** This
corrects §7.0. The oracle is the `quantitative_expectations` block — hand-derived, `hand_derived:
true`, with its premises, its arithmetic and its product-agreement each separately checked
(`examples/document-processing/expected-results.yaml:10-31`). That block is declared independently of
how any requirement is declared, and `decided_by` merely *points* at it. Move a requirement row to
`expressed_as` and the entry it pointed at stays, still hand-derived, still checked, still the oracle.
Probes C1 and C2 confirm it from the other end: the derived verdicts reproduced 2,750 ms and 384 MB,
the oracle's own numbers.

What migration *does* cost is two tests that currently key off the `decided_by` route —
`test/examples.test.ts:416-421` (which asserts such a requirement is absent from the model) and `:842`
(which filters `decidedBy !== null` and asserts the filtered set is non-empty). Both need re-pointing
at the `declared_as`/`within:` join. That is a real cost, it is small, and it is bookkeeping rather
than a loss of checking power. Recorded in §7 as a phase, not hidden.

---

## 3. The real gap, measured — a requirement may name a query that cannot refute it

Here the brief is right about the symptom and wrong about the cause. Nothing stops a student
authoring the distortion, and the reason is not a missing ceiling key.

Three distortions, each probed, each reading green:

| # | What the student authors | Derived | Truth |
|---|---|---|---|
| A1 | 750 ms obligation → `max-latency-among-successful-executions` (`exists`, no `within`), `satisfied_when: holds` | **SATISFIED** | product holds 2,750 ms |
| B1 | 512 MB obligation → a bare `metric: peak_memory` measurement, `satisfied_when: holds` | **SATISFIED** | 384 MB, never compared |
| D1 | 750 ms obligation → the *correct* `within: latency-requirement` ceiling query, but `satisfied_when: refuted` | **SATISFIED** | the breach discharges the obligation |

A1 reproduces the brief's measurement. B1 and D1 are new, and D1 is the nastiest of the three: the
query is right, the ceiling is right, the join is right, and one inverted word turns a found
counterexample into a discharge.

**B1 is not luck. It cannot fail.** Raise `remediation-memory` from 256 MB to 1024 MB so peak memory
reaches 1,152 MB against the same declared 512 MB ceiling, and re-derive both routes:

| Probe | Route | Derived at 1,152 MB vs 512 MB |
|---|---|---|
| F1 | measurement query (`exists`, no `within`) | **SATISFIED** |
| F2 | ceiling query (`forall`, `within: peak-memory-requirement`) | **VIOLATED** |

`measurePeak` (`src/quant/query.ts:286-309`) has **no `refuted` arm at all** — its outcome is
`bounded ? "inconclusive" : "holds"` and nothing else. So a memory obligation decided by a measurement
is unfalsifiable: satisfied for every model, at every magnitude, forever. The mirror case is equally
degenerate — the same measurement with `satisfied_when: refuted` reads **VIOLATED** at 384 MB under a
512 MB ceiling, unsatisfiable by construction. Both polarities probed:

```
measurement query, satisfied_when: holds    -> SATISFIED holds     (cannot fail)
measurement query, satisfied_when: refuted  -> VIOLATED  holds     (cannot pass)
```

Neither reads the magnitude. For `latency`, `measurePath`'s single `refuted` arm
(`src/quant/query.ts:239`) fires when *no execution reaches the selection* — "there is nothing to
measure", never "the figure is too large".

**The defect class, named:** a measurement answers *how much*; it discharges no obligation. A
requirement that names one has a join that resolves, a status that derives, and a question that is not
its own.

---

## 4. RULED — the engine refuses the unrefutable pairing, as `error`

The soundness of a quantity-decided requirement is fixed by two facts the model already carries, and
the forced quantifier does the work:

| Deciding query | Quantifier (forced) | What it states | Sound `satisfied_when` |
|---|---|---|---|
| `kind: quantity`, `within:` present | `forall` | a ceiling claim, positive and universal | **`holds`**, and only `holds` |
| `kind: quantity`, `within:` absent | `exists` | a measurement | **none** — it decides no obligation |

One combination is sound. The three distortions of §3 are the three that are not, and the table is
exhaustive over them. So the rule is small: **a requirement whose `expressed_as` names a `kind:
quantity` query verifies as `error` unless that query declares `within:` and the requirement declares
`satisfied_when: holds`.**

**It goes in the engine, not the validator, and that placement is the reason it is cheap.** The arm
belongs beside one of the same class that already exists: `verifyDeclaration`
(`src/engine/verification.ts:303-319`) already refuses a requirement whose named query the system does
not *declare*. The new arm refuses one whose named query cannot *decide* it. Same function, same
`error` status, adjacent sentence, no new status word and **no new `InconclusiveCause` member**. The inputs are
in hand: `verifySystemRequirements` (`src/engine/index.ts:150-162`) iterates `system.queries`, and
`SavedQuery` carries the query raw (`src/ir/types.ts:647-650`) — *"the engine owns the vocabulary, the
IR owns the identity"* — so the deciding query's shape is available at the join with no IR change.

**⚠️ Corrected 261005.** This sentence first read "no fifth `InconclusiveCause`", and
`DECISIONS-RULED-vacuous-verification-261005.md` §1.2 caught the ordinal: the union held **three**
members when this ruling was written, so a new one would have been the fourth. The claim the sentence
makes is that Phase A's arm adds no cause at all, which the ordinal never carried, so it is now stated
without one. Worth knowing why the number is not simply bumped: the vacuity ruling landed `vacuous` as
that fourth member the same day (`src/engine/verification.ts:191-207`), so "fifth" is accurate at HEAD
and was wrong when written. An ordinal in prose counts a set that keeps moving, and either spelling
would be stale by the next landing.

**This leaves V41's cost-benefit exactly where §4 of the authored-constructs ruling left it.** V41 was
declined because a dangling `expressed_as` already reads `error`, so a validator rule would buy
earlier surfacing at the price of a mirrored rule in `validate.py`, a parity-set entry, a
`SEMANTICS.md` heading, and a third copy of the proposition vocabulary. Every word of that still
holds, and this ruling adds no authored key to disturb it. The one variable that decided V41 is the
one that differs here: V41's failure is **already loud**, and this one is **silent and green**. An
engine arm inherits V41's own winning argument — the vocabulary stays in one place, `validate.py` gains
nothing to mirror, and no third copy appears. If someone later wants the finding at authoring time,
that is a new proposal with V41's full cost, and it should be argued then and not smuggled in here.

**It lands green.** Measured, not assumed: of eight authored requirements, two are quantity-decided and
both already carry `within:` with `satisfied_when: holds` (§0.2). Zero findings at HEAD. Authoring a
check at zero findings is this project's standing habit, and it is the same forward-policing argument
§7.0 used to keep the recorded-coverage arm.

---

## 5. How coverage sensitivity bears on this, and why it must not bend the rule

`verify` is coverage-sensitive on the `satisfied` arm and only there
(`src/engine/verification.ts:267-272`): a verdict that matches `satisfiedWhen` is downgraded to
`inconclusive` unless the coverage bears a conclusion. The header states the asymmetry as a rule at
`:251-252` — *a witness is coverage-insensitive; an absence is coverage-sensitive.*

**The ceiling route inherits that protection twice, and needs no new machinery.** Probed on the C1
ceiling query with a pinned `limit`:

| `limit` | Derived |
|---|---|
| 3 | **INCONCLUSIVE**, `because: { kind: "bounded", limit: "state-limit" }` |
| 10 | **VIOLATED**, verdict `refuted` |

Two layers degrade independently and agree. The quantity layer already returns `inconclusive` directly
on a truncated walk (`bounded ? "inconclusive" : "holds"`, `src/quant/query.ts:273`, `:298`), and
`verify` would downgrade a bounded `satisfied` again if it arrived. At `limit: 10` the counterexample
is found inside the truncated region and `violated` survives, which is the asymmetry behaving
correctly rather than an exception to it.

**The sharp point, and the reason a ceiling design that leans on coverage would be wrong:** coverage
sensitivity defends against a *truncated* walk. It offers nothing against a *well-covered* walk
answering the wrong question. F1 is the proof — exhaustive coverage, determinate figure, 1,152 MB, and
`satisfied`. Question-correctness and evidence-sufficiency are orthogonal axes, and the distortion
lives entirely on the first one.

So the §4 refusal must be **static** — computed from the declaration pair alone, never from the result
or its coverage. Condition it on coverage and the same unrefutable declaration would be refused under
an exhaustive walk and pass quietly as `inconclusive` under a bounded one, reporting a declaration
defect as an evidence shortfall. The engine already refuses that collapse in the neighbouring case:
`verifySystemRequirements` derives `known` from the system's declared query ids rather than from the
result map precisely so *"a dangling reference"* is not reported as *"a search that has not run"*
(`src/engine/index.ts:141-145`). The new arm must hold the same line.

---

## 6. The shapes weighed, and why each lost

- **A saved query that names a ceiling.** Not rejected — **this is the answer, and it already ships.**
  `within:` names a declared quantity by id, V39 holds the reference, and the quantifier is forced.
  The brief's blocker ("the ceiling-composed question is composed at analysis time and saved nowhere")
  describes `document-processing`'s two fixture rows, not the construct: `successful-executions-within-two-seconds`
  and `sram-fits-budget` are saved ceiling questions in the shipped corpus.

- **A ceiling key on the requirement.** Rejected, §1. Second source of truth; nothing reads it; the
  capability already ships twice.

- **`decided_by` as a declared second route.** Rejected, §2. A fixture key answering to no schema, and
  the oracle it is credited with belongs to `quantitative_expectations` instead.

- **A `limit:` + `unit:` pair on the requirement** (the ceiling key's smaller cousin, worth naming
  because `expected-results.yaml` already has this shape). Rejected harder than the ceiling key. It
  carries the magnitude *and* splits the unit from the dimension that governs it, so nothing could
  refuse `limit: 750`, `unit: ms` against a `memory` quantity — a cross-dimension comparison the
  evaluator refuses by name today (`src/quant/query.ts:135-143`) and V30 refuses in the model.

- **Nothing; the gap is correct.** Half right, and the half that is right is the half this ruling
  keeps. "A ceiling is a quantity declaration the model already carries" holds exactly — §0.3 says it
  in the corpus's own words. But the position's second clause fails: leaving the *distortion*
  unguarded is not defensible once measured. A1, B1 and D1 read `satisfied`, B1 cannot fail at any
  magnitude, and the only thing catching them in `document-processing` today is a fixture row
  recording `violated` — a backstop that disappears the moment those two rows migrate, which §7 is
  about to do. A requirement that cannot fail is worse than a requirement nobody can write.

---

## 7. What the ruling implies, as phases

Scoped, not implemented. Each phase names what it unblocks.

**Phase A — the engine arm, and its pins.** The §4 refusal in `verifyDeclaration`, with the deciding
query's shape supplied by `verifySystemRequirements`. Pin all three distortions as negative controls
(A1, B1, D1), pin the two sound shipped requirements as positive controls, and pin that the refusal is
coverage-independent (the same declaration refuses at `limit: 3` and at exhaustive). Lands green at
zero findings — §4. *Unblocks:* Phase B can migrate without removing the only thing that catches a
mis-authored ceiling.

**Phase B — migrate the last two requirements; ten of ten.** Two saved `within:` queries over
`latency-requirement` and `peak-memory-requirement`, both rows moved to `expressed_as` +
`satisfied_when: holds`. Verdicts already measured (§0.5): VIOLATED and SATISFIED, both matching the
oracle. *Unblocks:* the `decided_by` route retires from the corpus, and the example's §0.4 note becomes
a statement about pedagogy alone. Note the live scope question Phase B must answer rather than assume
— the author declined these two saved queries because they *"change what the example is about"*. That
judgment is the author's; this ruling establishes only that the construct does not force the issue.

**Phase C — re-point the two tests that key off `decided_by`.** `test/examples.test.ts:416-421` and
`:842`. The ceiling-single-source check at `:842` must survive in some form: it is the only assertion
that a declared ceiling targets `model:`, declares no `residency` and no `when`, and after Phase B its
join is `within:` rather than `declared_as`. *Unblocks:* nothing downstream; this is the debt Phase B
incurs, recorded so it is not discovered.

**Phase D — the teaching surface.** The Quantity slice can now state the three-role separation as the
lesson: a quantity declares the number, a query compares against it by reference, a requirement
obliges. The Sensor Node budget is the worked example and needs no invention (§0.2, §0.3). *Unblocks:*
the `capability.requirements` teaching material, with the distortion available as the
negative example — "why naming the measurement query is the wrong join" is a better lesson than the
rule stated abstractly.

---

## 8. Corrections owed — what §7.0, the corpus and the brief got wrong

> **✅ DRAINED 261005, all four.** The amendments landed in the same session as this ruling. The
> `file:line` citations in the four bullets below point at the text **as this ruling found it**, and
> that text has since been amended — do not re-apply these corrections, and do not read a bullet's
> line range as current. Where each landed: §7.0 of `DESIGN-v02-requirements-261004.md` carries a
> dated "Corrected 261005" paragraph and a withdrawn-consequence block; §4 of
> `DECISIONS-RULED-authored-constructs-261004.md` carries a "Third correction, 261005" note;
> `examples/document-processing/system.mage.yaml:753-774` and `expected-results.yaml:48-79` now lead
> with the accurate sentence. A fifth correction, owed by
> `DECISIONS-RULED-vacuous-verification-261005.md` §5 rather than by this section, landed in §4 above
> (the `InconclusiveCause` ordinal).

The brief warned that §7.0 exists because earlier wording understated the code, and asked for every
sentence to be checked. Four need amending, and the direction is the same each time: a *fixture*
limitation was written down as a *construct* limitation.

- **`DESIGN-v02-requirements-261004.md` §7.0** — *"a question composed from a declared ceiling at
  analysis time is saved nowhere to be named, and the authored shape has no key for a ceiling."* The
  second clause is true and harmless. The first is wrong: `mage-query.schema.json:141` saves exactly
  that question, and two shipped queries are one. Amend to say the two *document-processing* rows have
  no saved query **because none was written for them**, by the author's stated choice.

- **§7.0's second consequence** — *"Migrating them would trade away an INDEPENDENT oracle."* It would
  not. The oracle is `quantitative_expectations`, declared and checked independently of the
  requirement's route (§2). The sentence that follows it — *"the stronger arrangement until a saved
  query states those ceilings directly"* — is right in form, and its condition is already met
  elsewhere in the same file.

- **`DECISIONS-RULED-authored-constructs-261004.md` §4** — repeats §7.0's wording (*"the authored shape
  has nowhere to name a ceiling instead of a query"*). True as written, misleading in effect: naming a
  query **is** how a ceiling is named, through `within:`. Amend alongside §7.0, since the brief notes
  this repetition is what would send the next reader to undo the right thing.

- **`examples/document-processing/system.mage.yaml:756-764` and
  `expected-results.yaml:52-71`** — both say the `decided_by` rows have "nothing to name". The yaml
  comment then contradicts itself four lines later with *"Saving the two composed questions here would
  make them expressible"*, which is the accurate sentence. Lead with that one.

**What the brief got right, and it is the part that mattered.** The measured distortion is real,
reproduces exactly as described, and is the finding that justified the dispatch. The brief's
instruction to check coverage sensitivity was also right, though not for the reason it gave: coverage
sensitivity does not break a ceiling design, it is *orthogonal* to the defect, and mistaking it for a
defense is how B1 would survive a review (§5).

**Where the brief was wrong.** Its title claim — *"the authored requirement cannot say 'under 750
ms'"* — is refuted by one lookup, and its framing that *"a student who models a budget cannot
currently write the requirement about it"* is refuted by the Sensor Node, whose budget requirement is
authored, shipped, and reading SATISFIED through the join the brief says does not exist. The brief
also presents the two unmigrated requirements as evidence about the construct. They are evidence about
one example's scope, and the example says so itself.

**One note on method.** Every number here came from a throwaway probe run against the shipped corpus
(not committed, per the brief). Reading the schema alone would have produced the opposite ruling twice
over: `requirements` genuinely has no ceiling key, and `quantity` genuinely has no ceiling key either
— the capability lives in a third file, on the *query*. The probe is what found it.
