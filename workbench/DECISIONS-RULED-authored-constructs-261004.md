# RULED — the authored construct set: `requirements:` lands, `bindings:` does not (261004)

Two constructs the kernel understood and no document could contain. They look like one gap and they
are not: one was missing an authored surface, the other was never supposed to have one.

Measured at `853b1712` before any change, and each figure is a lookup rather than a search:

- `mage-model.schema.json` had **twelve** top-level properties — `accounting`, `domains`,
  `entities`, `events`, `machines`, `mage`, `models`, `quantities`, `queries`, `relation-types`,
  `system`, `views`. Neither `requirements` nor `bindings`.
- `src/engine/verification.ts` already carried the whole verification layer: `Requirement`,
  `parseRequirement`, `VerificationStatus` (`satisfied | violated | inconclusive | error`),
  `InconclusiveCause`, and `verify`, total over `EvaluationStatus` by the compiler.
- `src/engine/model-types.ts` already carried `BINDINGS` — three rows, each with a `licensing`, a
  `witness` and a `declaredBy` — and `COMPOSITIONS`, one row.

So the engine knew what both constructs mean. The question was which of them the author should be
able to write.

---

## 1. RULED — `requirements:` is authored. Implementation, not design.

The declaration shape was already specified (§5.2), already carried by three shipped fixtures, and
already read by `parseRequirement`. The only missing piece was a place in a model document to put
it. It is now a top-level key: a map keyed by id, each value declaring `statement`, `expressed_as`
and `satisfied_when`.

**The map form, not an array.** `queries:` is the convention for an id-keyed collection in this
schema, and a mapping makes a duplicate id *unrepresentable* rather than a finding somebody has to
raise. The fixture corpus uses the array form because `expected-results.yaml` answers to no schema;
`canonicalize` hoists the map key into the mapping so one reader serves both surfaces.

**Polarity is preserved, and structurally rather than by instruction.** `expressed_as` names the
POSITIVE breach query — the one whose `holds` IS the violation — and `satisfied_when: refuted` is
where the prohibition lives. §5.2's "do not negate the query internally merely to make the
requirement read positively" is not a convention a future author has to remember here: the schema
declares three keys and none of them is a predicate, so there is nowhere to put a negation.

**The schema answers SHAPE and stops.** `satisfied_when` is `type: string` with no enum, following
`accounting`'s stated discipline — a wrong word reaches the MEANING layer, where the engine says
*"'inconclusive' and 'unlicensed' are evaluation statuses, so neither can be prescribed"* instead of
JSON Schema answering with a shape complaint. That choice also keeps the `error` verification status
REACHABLE from an authored model, which an enum would have made dead code.

**The declaration hashes; the status does not exist to hash.** A system that prescribes a prohibition
is not the system that prescribes nothing, so `systemHash` covers the declaration. The verification
is stored nowhere at all (V18), which is a stronger exclusion than omitting a field from the hash —
and it is what preserves §10's climax, *the model changed, the query did not*.

**No `notes:` on a requirement.** The declaration hashes, so a note inside it would hash with it, and
invariant A1 holds that annotation never alters interpretation or an analysis result. The
prescription's own prose is `statement`.

---

## 2. RULED — no authored `bindings:` key, ever. A binding is READ, not declared.

**This is a ruling, not a deferral.** A key for it would be worse than the gap.

Each registered binding is already licensed by something the author writes, or holds without any
declaration at all. The registry says so row by row:

| Binding | Licensing | Witness — the authored fact |
|---|---|---|
| `appears-in` | `by-construction` | `shared-membership`: a model's `entities:` list. Entity ids inhabit ONE namespace per system, so two models naming one id name one entity. |
| `machine-of-entity` | `declared`, by `CanonMachine` | `authored-property`, key `entity` — a machine's `entity:`, which V6 already refuses when the referent is undeclared. |
| `state-of-entity` | `declared`, by `EXECUTES_IN_STATE` | `authored-property`, key `executes_in_state` — an entity property naming a state. |

Three reasons, in descending order of how much they constrain the choice:

1. **It would be a second source of truth for facts already authored elsewhere.** `machine-of-entity`
   IS `CanonMachine.entity`, load-bearing in four places — the validator (V6), the RDF projection
   (`MAGE.describes`), the inspector's navigation, and the transaction layer's reference report. §4.2
   requires it to *reuse rather than duplicate* for exactly this reason. A `bindings:` key would be
   free to disagree with the field it restates, and nothing could decide which copy was right.
2. **The set is closed in the registry, by ruling.** The borrowed-semantics basis enumerates what
   MAGE does *not* take from KerML, and the fourth item is **"no author-declarable connector
   vocabulary: a KerML model may declare a binding connector; MAGE's set is closed in this registry,
   so a model cannot introduce a fourth."** An authored key is precisely the capability that
   sentence refuses.
3. **Nothing would read it.** No evaluator consults a binding to transport a value; the three
   correspondences are READ, never solved. A declaration key would be authored, hashed, validated,
   and consumed by nobody.

### What the conformance fixture is built from instead

The `binding` row's fixture is built from **the authored field that licenses one binding**, not from
a declaration key. Concretely, for `machine-of-entity`: a machine's `entity:` key on the MAGE side,
against a KerML binding connector on the standard side, with the pinned interpretation being that
the two ends denote the same thing — and, per §35.6, pinning ONE binding while saying nothing about
the other two or about completeness.

The sensitivity mutation is available and is the same shape the three shipped fixtures use: retarget
or remove the machine's `entity:` and the correspondence the fixture pins must move. If it does not,
the fixture is demonstrating nothing, which is the failure every fixture in this corpus is written to
avoid.

### The sibling ruling: no `verification:` key either

A status is derived per read and stored nowhere. Recording it would change the system the answer was
about, which inverts the climax the construct exists for. `verification` therefore never becomes an
authored construct, and an owed row must not be held open waiting for one — an absence claim that
can never be discharged is a bad trigger.

---

## 3. What this moved, with the numbers

- **Authored construct set: 12 → 13.** `requirements` joins; `bindings` never will.
- **`capability.requirements` in the derived coverage model: `unavailable` → `unexercised`**, and the
  `construct.model-requirements` absent-construct entity, its `blocked-by` edge and the
  `blocked.requirements` CI query drop out with it. 21 exercised / 2 unexercised / 0 unavailable,
  from 21 / 1 / 1. `unexercised` and not `exercised`, because the row is now detected off the
  AUTHORED model and no shipped example authors one yet. (⚠️ **261005:** the examples authored theirs,
  so the row reads `exercised` and the triple is 22 / 1 / 0. The one remaining `unexercised` row is
  `containment-hierarchy`, which is unrelated.)
- **Both `owed` conformance rows: `blockedBy: clause-and-fixture`**, zero rows blocked on an absent
  construct. Neither is waiting on subject matter; each owes a clause and a fixture.
- **Test count: 1259 → 1274.**

## 4. What is NOT done, and is the follow-up

- ~~**No shipped example authors a `requirements:` block.** Every one still carries its requirements
  in `expected-results.yaml`, joined by a test comparing two recorded strings. Migrating them is what
  turns `capability.requirements` green and what retires the join gate; it is also what §9.4's Q4
  activity needs.~~ **DONE 261005.** All five examples author theirs, and
  `capability.requirements` reads `exercised` (22 / 1 / 0). Two corrections to the sentence above,
  both of which the migration turned up. First, the join gate was **strengthened, not retired**: the
  derived arm asserts the `VerificationStatus` that `verifySystemRequirements` computes from the
  authored model against a live query run, and the recorded-outcome arm is KEPT beside it because it
  pins the fixture's coverage kind, on which `verify` is coverage-sensitive — the two catch different
  drift. Second, eight of ten requirements migrated, not all of them: `expressed_as` joins to a SAVED
  query by id, and document-processing's two `decided_by` requirements are decided by a question
  COMPOSED from a declared ceiling at analysis time, which no `queries:` entry saves. The authored
  shape has nowhere to name a ceiling instead of a query, so those two keep their fixture
  declaration and the gate's live composed-query arm keeps deciding them.
- **Neither conformance fixture is built.** Both need normative OMG citations, and a clause written
  from memory reads as checked — which is §35.4's standing reason and not something this pass could
  honestly discharge.
- **No validator rule.** A dangling `expressed_as` reads `error` at verification, which is where §3.5
  rules that it belongs, and the engine owns the two-word vocabulary in one place. The counter-case
  is real and is recorded rather than dismissed: V39 is the same dangling-reference class pointed at
  a quantity ceiling and IS a validator rule, on the argument that a dangling authored reference
  should be one finding rather than a refusal one tool explains and the other never sees. Adding
  such a rule would cost a mirrored rule in `validate.py`, a parity-set entry, a `SEMANTICS.md`
  heading the `SPEC_SECTION` table can cite, and a third copy of the proposition vocabulary.
  Floated, not built.

  **No ID is reserved for it, deliberately** — this paragraph said "V41" when written, and on
  261005 the multi-machine wave landed V41 (vacuity disclosure) and V42 (the composition) in
  `SEMANTICS.md`, which at the time topped out at V40. A floated rule must not hold an invariant
  number: IDs are the join key tests and audits cite, they are allocated by whoever LANDS first,
  and a prospective one sitting in prose becomes a collision the moment a sibling wave reaches for
  the next free integer. Whoever builds this rule assigns its ID then, from the highest landed
  heading in `SEMANTICS.md`.
