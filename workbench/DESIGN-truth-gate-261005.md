# TRUTH gate — design

**Deliverable of the read-only design brief, 261005. Base sha `5777381fe` (= HEAD of
`talks-and-notes/governance-catalog` at the time of reading; all `file:line` cites below are
against that tree).**

The gate: *no instructional statement may attribute causality to an inert declaration.* The brief
asked for the declared link between instructional prose and the declaration it calls causal, the
checkable predicate, and the migration over the shipped corpus. All three are below. The short
version first:

> **Causal claims become first-class fixture artifacts.** Each example's `expected-results.yaml`
> gains a `claims:` block: a claim names the declaration(s) it calls causal (in the transaction
> vocabulary's addressing scheme), the saved query whose answer the prose says they move, and one
> of three evidence forms — a **perturbation transaction**, a **contrast pair** of existing fixture
> modifications, or an explicit **inert** label. A new node-tier gate executes every claim through
> the same `Workspace.openHypothesis` seam the modification harness already drives. Prose joins a
> claim by id: a YAML-comment directive line (`# claim: <id>`, the book's `<!-- point: … -->`
> pattern transplanted), or a `claims:` field on a note. Causal prose with no resolvable claim id
> is the residue a census-ratchet drains.

Both RED-ALERT defects are caught — one structurally (the named modification does not touch the
named transition), one semantically (perturbing the named relation moves no answer). §6 walks
through each.

---

## 1. The problem, as verified — and what the brief got wrong

### 1.1 Defect 1 — worker-queue (verified, with a correction that changes the design)

`workbench/examples/worker-queue/system.mage.yaml:174-176`:

```yaml
      # A GUARD, not synchronization: the job reads the lease's state and moves alone. This is the
      # transition section 6.7 asks you to break and then repair -- an unguarded path into
      # processing is what makes the safety counterexample appear.
      - from: claimed
        to: processing
```

False twice, as the brief says:

- The break the fixture ships (`expected-results.yaml:202-226`, mod
  `begin-processing-without-the-lease`) is `add-transition queued -> processing` (`steal`). It
  never touches `claimed -> processing`. A student who breaks the commented transition as
  instructed sees nothing the fixture promises.
- The guard on `claimed -> processing` is inert with respect to the safety query
  `lease-held-while-processing`: `queued -> claimed` carries `sync: claim`
  (`system.mage.yaml:170-172`), which acquires the lease atomically (event declaration at
  `:113-121`), so any configuration with the job in `claimed` already has the lease held. Remove
  the guard and the query still holds.

**Where the brief is wrong, and it matters:** the brief states "what actually holds mutual
exclusion at HEAD is the `claim` SYNCHRONIZATION on `queued -> claimed`." That is not demonstrable
by single-declaration perturbation either:

- Removing `sync: claim` from the job's transition makes `job-lifecycle` a non-participant in a
  declared event, which the engine **refuses to load** — V12, `src/engine/explore.ts:236-241`:
  *"a participant that never participates is a modeling error, not a silent no-op."* The
  perturbation does not produce a counterexample; it produces a validation failure.
- Removing the guard alone moves nothing (above).
- Deleting the whole `claimed -> processing` transition makes `processing` unreachable, so the
  safety query holds vacuously.

Mutual exclusion at HEAD is held **jointly and by construction**: the sync acquires the lease, the
guard refuses to begin without it, and no single deletion produces the violation — which is exactly
why the exercise *adds* a bypass transition rather than editing an existing one. The fixture's own
repair modification (`expected-results.yaml:228-248`) states the true causal fact in its rationale:
*"the guard — not the absence of the transition — is what carries the invariant"* — and the
break/repair **pair** proves it: two modifications identical except for `requires:`, with opposite
verified outcomes (`refuted` vs `holds`).

Three design consequences, each load-bearing:

1. The gate needs a **REFUSED** verdict distinct from RED: a perturbation the engine rejects means
   the claim as stated is not perturbation-demonstrable, and the prose must not assert
   single-point causality there.
2. Claims need **multi-declaration subjects** (joint causality is real in this corpus — redundant
   defenses are a feature of the models, and prose that names one member of a redundant pair as
   "the" cause is precisely the lie the gate exists to refuse).
3. The gate needs a **contrast** evidence form, because the declaration defect-1's *corrected*
   prose is about (the guard on the `steal` transition) **does not exist in the base system** —
   you cannot perturb what is not there. The break/repair pair is the only evidence that can carry
   that claim, and the fixture already verifies both halves.

### 1.2 Defect 2 — message-bus (verified, with a location correction)

**The brief's location is wrong.** It cites `system.mage.yaml` ~163-171; lines 164-172 hold the
`order-created-aggregate` note, which is *honest* — "`carries` is the maximum sensitivity over this
event type's fields. It is written down rather than computed…" — in fact it is the model of correct
practice. The false causal prose lives at two other sites:

- `system.mage.yaml:144-146` (comment on `analytics`): *"Analytics subscribes to OrderCreated,
  which carries a restricted shipping address. The safety query returns a real counterexample…"*
- `expected-results.yaml:150-152` (the `note:` on query
  `restricted-data-reaches-impermitted-subscriber`): *"The field that makes it restricted is
  shipping-address, which the data-policy model represents as a `carries_field` edge."*

What the engine consumes is the **declared aggregate** `carries: { value: restricted }` on
`order-created` (`system.mage.yaml:163`); the query form compares `source.permits` against
`target.carries` over `subscribes` edges. Deleting the
`order-created-carries-shipping-address` relation (`system.mage.yaml:405-408`) moves **no query
answer**. One refinement to the brief's "moves nothing": it does trip the parity pin —
`test/examples.test.ts:675-690` asserts declared `carries` equals the max over `carries_field`
edges — so the deletion is not silent *at the suite level*. But the student does the exercise in
the workbench, where no test output exists; the answers they watch do not move, which is the
defect as experienced.

### 1.3 Why this is the hard gate

The repo has already ruled on the general problem.
`workbench/test/example-semantic-coverage.test.ts:1694` grades the §16 closing prohibition ("no
prose-only question may imply capability the kernel cannot perform") as `grade: "asserted"`,
`audit: null` — with a written ruling (file header, ~line 47-56) that a keyword scan over example
prose *"would have caught none of them, and would have fired on every `256 KiB` in a file whose
prose is scrupulously correct."* "This prose is true" is not decidable and this codebase knows it.
What *is* decidable: **"this prose names declaration D as causal for query Q's answer, and the
declared demonstration bears it out."** The gate therefore governs only claims that carry a
declared link — and the migration (§8) plus a census-ratchet (§8.3) is what shrinks the unlinked
residue, claim by claim, without ever pretending to judge free text.

---

## 2. The substrate that already exists (read before inventing)

The brief named two precedents; the corpus holds five relevant mechanisms. The design reuses all of
them rather than building new machinery:

| Mechanism | Where | What it contributes |
|---|---|---|
| **Fixture modifications** | `expected-results.yaml` per example; parsed by `scripts/gen-example-coverage.ts:469-491`; executed by `test/examples.test.ts:578-640` | Already *verified causal statements*: a transaction, a `changes: [{query, from, to}]` list, and counterexample evidence, driven through the real `Workspace.openHypothesis` seam with before/after/discard assertions. The TRUTH gate's execution engine exists; only the join to prose is missing. |
| **Walkthrough grounding registry** | `src/learn/walkthrough.ts:77-87` (`StepGrounding`), enforced by `test/learn-walkthrough.test.ts` | The declared-link pattern: every Learn step names the example/model/query/modification it runs on *in the corpus's own spellings*, and a conformance test resolves every reference. Claims follow this shape exactly. |
| **Book point directives** | `<!-- point: <slug> \| <text> -->` in `book/part2/*.md`; parsed at `book/build_book.py:1882`, `book/book_typst.py:1109` | The prose-side join: an invisible machine-readable directive adjacent to the prose it governs, consumed by a typed model, stripped from reader-visible output. The YAML-comment `# claim: <id>` directive (§4.3) is this pattern transplanted. |
| **Transaction op vocabulary** | `mage-transaction.schema.json` — 19 ops incl. `delete-transition` (addressed by machine/from/to/sync/index), `delete-relation`, `set-property` with `unset: true`, `add-transition` with `requires`/`sync` | Every perturbation the gate needs is already expressible as a transaction, and the addressing scheme doubles as the claim's subject-reference grammar (§4.2). No new mutation surface. |
| **The parity-pin precedent** | `test/examples.test.ts:675-690` (declared `carries` = max over `carries_field`) | The house pattern for declared-vs-derived joins the gate composes with; also the proof that defect-2's edge is *governed* (for drift) while being *inert* (for answers) — two different properties the prose conflated. |

Two constraints verified in code:

- **YAML comments round-trip but are not data.** `src/yaml/document.ts:1-45`: the write path is
  the `yaml` package's CST; `verbatim`/`surgical` fidelities are byte-identical, `reserialized`
  preserves comments but normalizes layout. So a comment *survives* every tool write — prose can
  stay where students read it — but nothing can attach structured fields to it. A comment can
  carry at most a *reference* (a directive line the gate resolves), never the claim body. This is
  the central constraint the brief suspected, and it is established, not assumed.
- **Notes are data, but attach at only four positions and are hash-excluded there.** Note objects
  (`mage-model.schema.json` `$defs/note`: `id`, `kind` ∈ {comment, rationale, assumption,
  question, todo}, `text`, open to extension) attach to entities, graph models, relations, and
  quantity charges — **not to transitions**, and requirements carry no notes by design (the
  schema's own `$comment` at line 273: a note inside a requirement would enter `systemHash`,
  which invariant A1 forbids). So "put the claim on the declaration it is about" is structurally
  unavailable for the single most claim-dense declaration kind (transitions). This kills Option B
  in §7 and pushes the claim body into the fixture.

One more fact that settles where claims live: **the fixture is already student-visible.**
`src/app/examples.ts:22-25` reads title/summary/"try asking" from `expected-results.yaml`, and
`src/learn/fixtures.ts` reads the modifications (labels, rationales, changes) so the Learn page can
apply them through the real hypothesis seam. The fixture is simultaneously the executable surface
and a presentation surface — exactly where a verified teaching claim belongs.

---

## 3. The join, exactly

### 3.1 Placement

Each example's `expected-results.yaml` gains a top-level `claims:` block — the per-example claim
registry. (Why the fixture and not the model file: §2's note-attachment gap; the fixture's
discipline header already says "semantic outcomes only" and is parsed by one typed reader; the
model file's hash discipline (A1) stays untouched; and the claim sits beside the modifications
that are its most common evidence.)

### 3.2 Claim schema

```yaml
claims:

  # Evidence form 1: CONTRAST — two shipped modifications that differ only at the subject.
  - id: guard-carries-mutual-exclusion
    subjects:
      - machine: job-lifecycle
        transition: { from: queued, to: processing, label: steal }
        part: requires
    shows: { query: lease-held-while-processing }
    evidence:
      contrast: [begin-processing-without-the-lease, repair-the-stolen-transition]

  # Evidence form 2: PERTURB — an inline transaction the gate applies as a hypothesis.
  - id: declared-carries-is-what-the-query-reads
    subjects:
      - entity: order-created
        property: carries
    shows: { query: restricted-data-reaches-impermitted-subscriber, from: holds, to: refuted }
    evidence:
      perturb:
        operations:
          - { op: set-property, id: order-created, name: carries, value: internal, domain: sensitivity }

  # Evidence form 3: INERT — the declaration is explanation, not machinery; the gate verifies
  # that perturbing it moves NO recorded answer. (The EPISTEMIC-BOUNDARY label, made checkable.)
  - id: carries-field-edges-are-rationale-not-machinery
    subjects:
      - model: data-policy
        relation: order-created-carries-shipping-address
    inert: true
    held-by: parity          # free text naming the drift control, e.g. the carries parity pin
    evidence:
      perturb:
        operations:
          - { op: delete-relation, model: data-policy, id: order-created-carries-shipping-address }
```

Field semantics:

- `id` — unique per example; the token prose references. Same lexical rule as model ids.
- `subjects` — one or more declaration references (§3.3). Multi-subject = joint causality: the
  evidence must demonstrate the *set*, and the gate never certifies prose that names one member of
  a joint set as sole cause (that is defect 1's second lie).
- `shows` — the saved query the prose says the subjects move, by id, with optional pinned
  `from`/`to` outcomes. Required for causal claims; absent for `inert: true`.
- `evidence` — exactly one of `contrast` (two modification ids from this fixture's
  `modifications:` block) or `perturb` (an inline operations list in the transaction vocabulary;
  ops that exist only to keep the perturbed system loadable — e.g. dropping an event participant
  so a sync removal passes V12 — are marked `scaffold: true` and exempted from the TOUCH check).
- `inert: true` — inverts the predicate: *no* recorded answer may move. `held-by` names the
  control that governs the declaration's correctness instead (prose display may render it).

### 3.3 Subject reference grammar

Reuse the transaction schema's addressing (no third naming scheme — the TOUCH check in §5 depends
on claims and operations addressing declarations the same way):

| Declaration kind | Reference | `part` values |
|---|---|---|
| transition | `{ machine, transition: { from, to, label?, sync?, index? } }` | `whole` (default), `requires`, `sync`, `effects` |
| relation | `{ model, relation: <id> }` | — |
| entity property | `{ entity, property: <name> }` | — |
| machine variable | `{ machine, variable: <name> }` | `range`, `initial` |

v1 stops there — those four cover every causal-cue site found in the census (§8.1). Quantities,
bindings, and purposes extend the same table when a claim needs them.

### 3.4 Prose joins a claim by id

Three surfaces, one rule — *a causal instructional statement must sit adjacent to a resolvable
claim id*:

1. **YAML comments** (the student-visible prose in `system.mage.yaml`): a directive line inside
   the comment block, `# claim: <id>` (or inline suffix `(claim: <id>)` on the sentence). The
   gate scans raw file text for `claim:` tokens in comments — literal-prefix matching, nothing
   semantic — and asserts every referenced id resolves in that example's registry. This is the
   book's `<!-- point: … -->` move: the directive is invisible furniture joining prose to a typed
   model; comments stay comments.
2. **Note objects** (`notes:` in `system.mage.yaml`): an optional `claims: [<id>, …]` field on the
   note (note objects are open; add the field to the schema and to `validate.py`'s ANNOTATION
   layer). Hash-safe: notes are excluded from `systemHash` at every position they may appear (A1).
3. **Fixture prose** (`note:` on queries, `rationale:` on modifications): an optional sibling
   `claims:` list, parsed by `gen-example-coverage.ts`.

The reverse direction is a notice, not a failure: a claim no prose references is dead weight worth
reporting, but it is verified dead weight — it cannot mislead.

---

## 4. The checkable predicate, precisely

For claim `C = (subjects S, shows q, evidence E)` over example `X` with base system `B` (the
canonical IR of `X/system.mage.yaml`) and fixture `F`:

**Resolution (all claims).** Every `s ∈ S` resolves in `B` (transition lookup by
machine/from/to/label/sync/index, exactly as `delete-transition` resolves); `q` is a saved query of
`B`; every modification id in `E` is in `F.modifications`. Any miss → **STALE** (red).

**PERTURB evidence** (`E` = transaction `T`):

- **TOUCH** — every `s ∈ S` is addressed by some op in `T`, and every non-`scaffold` op addresses
  some `s ∈ S`. "Addresses" is a mechanical table: `delete-relation` ↔ relation subject by id;
  `set-property` ↔ property subject by (id, name); `delete-transition`(+`add-transition` pair) ↔
  transition subject by site, and for a `part:` subject the delete/re-add pair's field diff must
  be confined to that part. A perturbation that moves the answer by touching something *else* is
  defect 1 wearing a new costume; TOUCH is what makes that unwritable.
- **APPLY** — `openHypothesis(B, T)` must succeed. Engine refusal (V12-class) → verdict
  **REFUSED**: the claim is not demonstrable as stated; the gate prints the engine's finding. A
  REFUSED claim fails the gate — the author either restates the claim (usually: joint subjects,
  or contrast evidence) or widens `T` with `scaffold` ops that make it loadable.
- **MOVE** — the engine's answer for `q` under the hypothesis differs from its answer at `B`
  (and, when `from`/`to` are pinned, matches them; `B`'s answer must equal `from`, which the
  fixture's own expectations already pin). No movement → **RED: inert** — the exact defect class,
  named in the failure message with both outcomes.
- Discard the hypothesis; assert the base hash and bytes restored (the modification harness
  already owns this discipline — `test/examples.test.ts:607-614` — and the gate inherits it by
  using the same seam).

**CONTRAST evidence** (`E` = `[m1, m2]`):

- **TOUCH (diff form)** — pair the ops of `m1` and `m2` by site; the paired diff must be confined
  to the `part`s named by `S`. (For the seed claim: the two `add-transition steal` ops differ only
  in `requires` → touches exactly `part: requires`.) Ops present in one and absent in the other
  are a diff at `whole`.
- **MOVE** — `F`'s pinned `changes` rows for `q` under `m1` and `m2` end at different outcomes.
  No re-execution needed: `test/examples.test.ts:578-640` already drives both modifications
  through the engine and asserts every `from`/`to`; the gate consumes the pinned rows and the
  suite's green as its execution witness.

**INERT claims** — APPLY must succeed, and **every** query with a recorded expectation in `F` must
keep its recorded outcome under the hypothesis. Any movement → **RED: falsely-labelled-inert**
(the symmetric lie: prose that waves machinery away as commentary).

Verdict set: **GREEN · RED-inert · RED-falsely-inert · RED-untouched (TOUCH fail) · REFUSED ·
STALE**, each with the engine's own words in the message. The predicate never judges the prose's
free text — it judges the declared link, which is the only decidable thing here (§1.3).

---

## 5. The gate, concretely

- **New file `workbench/test/truth-claims.test.ts`** (node tier, under the default `npm test`
  runner — `test/gate-reachability.test.ts` derives the gate set from `package.json`, so wiring is
  governed the day the file lands; no new runner).
- Loads every shipped example via the same `loadExample` path `examples.test.ts` uses; parses
  `claims:` via an extension of `gen-example-coverage.ts` (one typed reader for the whole fixture,
  as today).
- Per claim: run §4. Per example: scan `system.mage.yaml` + `expected-results.yaml` raw text for
  `claim:` comment directives and resolve them; walk note objects' `claims:` fields.
- **Vacuity, house style** (`example-semantic-coverage.test.ts` header): the gate returns
  `subjects` (the claim denominator) beside findings; an empty denominator fails. It is born
  non-empty: the two defect rewrites (§6) land in the same change as the gate, as its seed —
  a gate first proven on the defects it was commissioned for, then sabotage-checked (flip one
  seed claim's subject to a wrong transition, watch RED-untouched, restore).
- §16 bookkeeping: the `prose-capability` obligation's ruling stands for *unlinked* prose; the
  gate adds a new obligation row for *linked* claims at `grade: "checked"` with this file as its
  audit. The asserted-grade clause shrinks as migration converts sites (§8).
- Cost: one `openHypothesis` + a handful of query evaluations per PERTURB/INERT claim — the same
  work the modification harness already does ~13 times per run; expected well under a second per
  example.

---

## 6. How it catches both defects

**Defect 1.** The shipped comment, translated into a claim, must say what it says:
subjects = `{machine: job-lifecycle, transition: {from: claimed, to: processing}}`,
shows = `lease-held-while-processing`, evidence = the section-6.7 modification pair.

- "This is the transition 6.7 asks you to break" → CONTRAST TOUCH fails: the modifications'
  ops address `queued -> processing` (`expected-results.yaml:210-214`), not the claimed site →
  **RED-untouched**. The lie is structurally unwritable.
- "An unguarded path … is what makes the counterexample appear," read as a claim about the
  *commented* transition's guard → PERTURB (delete+re-add without `requires`) applies cleanly and
  the query still holds → **RED-inert**. Also unwritable.
- The *corrected* prose: "Section 6.7 adds a `steal` transition that bypasses the claim
  synchronization; the guard on that added transition — not the transition's absence — is what
  carries mutual exclusion" → the seed claim `guard-carries-mutual-exclusion` (§3.2), CONTRAST on
  the break/repair pair: diff confined to `requires`, outcomes `refuted` vs `holds` → **GREEN**.
  And any attempt to write the old single-cause story about the sync alone meets **REFUSED**
  (V12), which forces the honest joint statement. The gate does not merely catch the lie; it
  catches the subtler oversimplification the lie grew from.

**Defect 2.** "The field that makes it restricted is shipping-address" → claim with
subject = the `carries_field` relation, shows = the breach query, PERTURB delete-relation →
applies cleanly, outcome unmoved (`holds`) → **RED-inert**. The corrected pair of claims:
`declared-carries-is-what-the-query-reads` (PERTURB `set-property carries: internal` flips
`holds → refuted` → **GREEN**) plus
`carries-field-edges-are-rationale-not-machinery` (INERT, `held-by: parity`, which the parity pin
at `test/examples.test.ts:675` backs) → **GREEN**. The student now reads prose that distinguishes
what the engine consumes from why the author wrote it — which is also exactly the
EPISTEMIC-BOUNDARY distinction, produced here as a verified artifact.

---

## 7. Alternatives rejected

- **Judge the prose (NLP/keyword truth-checking).** Already ruled out by the repo's own
  `prose-capability` ruling, with incident evidence (§1.3). The gate judges links, never text.
- **Claims as structured fields on the declarations themselves** (notes on transitions, `claims:`
  inside machine blocks). Structurally unavailable: notes do not attach to transitions, and
  putting them there (or any new key inside a transition) enters `systemHash` — an A1-sensitive
  change to `canonicalize`/hash for a pedagogical feature. Rejected on blast radius.
- **A line-anchored external registry** (`claims.yaml` mapping `file:line` → claim). Line anchors
  rot under the `reserialized` write fidelity (layout normalizes); the 261004 brief-incident
  history in the root `CLAUDE.md` is one long argument against line-number joins. Rejected.
- **A third per-example file** (`teaching.yaml`). Adds a surface with no new capability over a
  fixture block; the fixture is already the typed, student-visible, executable home. Rejected.
- **Marker-free closed world** (causal prose may *only* live in claim-bearing structured fields;
  comments banned from causality entirely). Honest but needs an enforcer anyway (what finds the
  violating comment?), and it evicts prose from the file students actually read alongside the
  model. The directive-comment join keeps reading flow and addressability. Partially adopted: the
  census-ratchet (§8.3) is this option's enforcement half, applied as a drain instead of a ban.
- **The brief's "honest alternative" — move the prose wholesale to already-joined surfaces.**
  Half-adopted: the claim *bodies* do move to the fixture (the joined surface), and that is where
  verification lives. But evicting all instructional text from `system.mage.yaml` comments was
  rejected: the comment surface is the one a student reads inside the editor, the CST round-trip
  exists precisely to preserve it (`document.ts` header: "that prose is the model's argument"),
  and the directive join costs one line. What *is* worth saying plainly: defect-1's fix will
  likely shrink the comment to a pointer plus one true sentence, because the verified detail
  reads better beside the modification pair that proves it.

---

## 8. Migration over the shipped corpus

### 8.1 Census (measured at base sha)

Comment volume: ~1,637 `#`-comment lines across the 13 prose-bearing files (6 examples × 2 files
+ `docable.mage.yaml`; per-file from 297 down to 10). Causal-cue scan ("is what makes/holds/
carries", "makes the … appear", "asks you to break", "the field that makes"): **29 hits, ~27
genuine** after discarding two incidental matches. Classification by sample:

- **~15 engine-causal, claimable** — e.g. `transaction-workspace/system.mage.yaml:330` ("guard is
  what makes `base-can-keep-advancing` answer refuted" — a ready-made PERTURB claim),
  `autonomous-delivery/system.mage.yaml:329` ("…which is what makes
  `motion-inhibited-whenever-faulted` hold"), `document-processing/system.mage.yaml:427` ("the
  ONLY edge into published…"), both defect sites, `docable.mage.yaml:314`.
- **~6 language/semantics-level** — "a finite domain is mandatory (V17) and it is what makes the
  progress claim decidable" (worker-queue:161, autonomous-delivery:366, …). Causality about MAGE's
  semantics, not this model's answers; not perturbation-checkable (the schema refuses the
  perturbation). These get a `kind: semantics` label (EPISTEMIC lane) citing the V-rule, no claim.
- **~6 vague/consequence-adjacent** — reword or label; judgment calls, cheap ones.

Fixture `note:`/`rationale:` prose adds a handful more (the two strongest already quoted above).
So the realistic v1 load is **≈15-20 claims, ~10 labels/rewords**, across 7 files.

### 8.2 Phases

1. **Land the join + gate + seeds** (one change): fixture reader extension (+~80 LoC in
   `gen-example-coverage.ts`), note-schema `claims:` field + `validate.py` ANNOTATION awareness,
   `test/truth-claims.test.ts` (~300-400 LoC), the four seed claims of §3.2/§6 and the two
   defect-site prose rewrites. Gate is BLOCKING from birth — it governs only declared links, and
   at landing every declared link is green. Nothing else in the corpus is obligated yet, so
   landing blocks nobody (the AUDIT-ONLY-first concern applies to the census, not the gate).
2. **Sweep the ~27 sites** example-by-example (parallelizes clean: one agent per example,
   disjoint files, worktrees per the root `CLAUDE.md` fleet discipline). Each site → claim, label,
   or reword. Worker-queue and message-bus first (done in phase 1), then transaction-workspace
   and autonomous-delivery (richest causal prose), then the rest.
3. **Close the ratchet** (§8.3) once the census residue is an allowlist of reviewed survivors.

### 8.3 The census-ratchet (author to ratify — §9 Q3)

The gate verifies linked claims; nothing yet *compels* a link. Proposal: the gate also runs the
causal-cue scan as a **monotone census** — cue-pattern hits in comments that carry no `claim:`
directive are counted against a committed per-file allowlist (the closed-tuple pattern: the list
only shrinks; new unlinked cue-prose fails). This is not a truth judgment — it caps ungoverned
surface — but it is a keyword scan, and §16's ruling is openly hostile to those. The difference:
that ruling rejected keyword scans as a *verdict* ("would have fired on every `256 KiB`"); this
one fires only to demand a link or an allowlist entry, both reviewed. If the author still rules it
out, the fallback is review-time discipline plus the §16 asserted-grade clause continuing to own
the residue — the gate stays sound either way, it just stops growing itself.

---

## 9. Composition with the sibling gates, and the seam to agree

- **SEMANTIC-LIVE** ("every highlighted declaration must survive a perturbation test or be
  labelled non-operative") and TRUTH share one predicate core: *perturb D, observe which recorded
  answers move*. TRUTH is the named-query restriction of it, driven from declared links;
  SEMANTIC-LIVE is the any-answer-moves version, driven from the highlighted set. **Proposed
  seam:** one shared perturbation runner (apply transaction via `openHypothesis`, evaluate the
  fixture's recorded query set, diff outcomes, discard-and-verify-restored) that both gates call;
  TRUTH owns the claim registry, TOUCH, and the named-query verdicts; SEMANTIC-LIVE owns the
  highlighted-declaration inventory and the moved-anything verdict. The INERT claim form (§3.2)
  is the same object as SEMANTIC-LIVE's "labelled explicitly non-operative" — it should be ONE
  label, defined once, verified by the shared runner (falsely-inert is checkable and both briefs
  need it). The building agent and this design need to converge on that label's spelling and on
  the runner's home before either lands — the one real coordination point.
- **EPISTEMIC-BOUNDARY** ("displayed as explanation but not consumed by the engine must be
  visibly distinguished"): `inert: true` + `held-by:` is the machine-readable version of that
  distinction, and the Learn/app surfaces that already read the fixture can render it (e.g. a
  "rationale, held by a parity check — not consumed by the engine" chip). TRUTH supplies the
  verified data; the display rule stays EPISTEMIC's.

---

## 10. Open questions for the author

1. **Directive spelling in comments** — standalone `# claim: <id>` line vs inline
   `(claim: <id>)` suffix, or both? (Design assumes both accepted, standalone preferred; the
   scanner is a literal-prefix match either way.)
2. **Should claims be renderable to students?** The fixture is already a presentation surface;
   a claim could render as "demonstrated by: [break] vs [repair]" under the relevant query in
   Learn. Zero-cost to defer; the schema does not change either way.
3. **The census-ratchet (§8.3)** — adopt, or leave unlinked prose to review + the §16
   asserted-grade clause? (Recommendation: adopt; it is the only forcing function on NEW prose.)
4. **REFUSED semantics** — design says REFUSED fails the gate (forces restatement). Alternative:
   REFUSED passes with a notice when the claim carries an explicit `refused-ok:` acknowledgment.
   Recommendation: fail; the worker-queue case shows REFUSED is exactly where the richest
   mis-teaching hides.
5. **Scope of v1 subject grammar** (§3.3 four kinds) — ratify, or require quantities/bindings
   day one? (No causal-cue site in the census needs them.)

## 11. Corrections to the brief (standing instruction)

1. Defect-2's false prose is at `expected-results.yaml:150-152` and `system.mage.yaml:144-146`,
   **not** `system.mage.yaml` ~163-171 — those lines hold the honest `order-created-aggregate`
   note.
2. "Deleting the `carries_field` edge moves nothing" — no *query answer* moves; the parity pin
   (`test/examples.test.ts:675`) does fire. The defect is real in the workbench, where the student
   sees only answers.
3. "What actually holds mutual exclusion at HEAD is the `claim` SYNCHRONIZATION" — understated:
   it is held jointly (sync + guard, redundantly, and by the absence of any bypass); the sync
   alone is not perturbation-demonstrable (V12 refusal). This correction produced the REFUSED
   verdict, multi-subject claims, and the contrast evidence form — load-bearing parts of the
   design.
4. The brief's two named precedents were the right ones; the census found three more already in
   the tree (modification harness, transaction addressing, parity pin) that reduce this design to
   mostly-join, little-machinery.
