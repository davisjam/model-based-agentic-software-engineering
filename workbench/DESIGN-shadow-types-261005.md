# Design — Mandatory entity typing with fresh shadow types

**Design, 261005.** Elaborates the author's ruling on `OPEN-DECISIONS.md` D7 (landed `b1d702e47`):
every entity has a type; untyped entities get fresh nominal shadow types; unknown does not mean
compatible; one regime, not two. This document stress-tests that ruling against the corpus,
specifies the checking machinery, the two V-rules, the hash and migration decisions, one Learn
lesson, and one new lab example. The ruling itself is not reopened. One component of the ruled
mechanism — use-induced unification — is refined by a measurement the ruling did not have; §2
carries the evidence and §G.1 asks for the ratification.

**Base:** worktree `wb-shadow-types-design-261005`, cut from `b1d702e47`, tree clean. Every number
below was measured in this worktree; the appendix says how.

---

## 1. The brief's premises, verified

Per standing instruction, each premise was checked in code before use. Two corrections, and both
change the design.

### 1.1 "0 of 77 entities set `CanonEntity.type`" — **false, and the truth is better**

The corpus is **fully typed, everywhere, and has been since before D7 was written**:

| Scope | Entities | With `type:` set |
|---|---|---|
| Six shipped examples | 48 | 48 |
| + language specimen (`examples/docable.mage.yaml`) | 53 | 53 |
| + self-models (`models/*.mage.yaml`, 93) + conformance fixtures (14) | **160** | **160** |

Verified three ways: a YAML count per file; the actual loader (`canonicalize` reads `s["type"]` at
`src/ir/canonicalize.ts:132` and has at every revision back through `e1e27eb00`); and a runtime
probe — `canonicalize(message-bus)` returns 11 entities, 11 typed (`checkout:service`,
`order-created:event-type`, `shipping-address:field`, …). `git log` on
`examples/message-bus/system.mage.yaml` shows the `type:` fields predate the D7 commit by several
landings (last touch `a9366500d`). The entity count is also wrong: 48 across the six examples, not
77; no scoping I could construct reaches 77.

What D7 evidently meant, and what IS true: **no validator consumes the slot.** No rule in
`src/validator/rules.ts` reads an entity's `type`; `SEMANTICS.md` §3 never mentions it; the schema
admits it as a bare string with no stated meaning. Its live consumers are the `elements` query
selector (`src/engine/elements.ts:50` — "matched exactly"), the hash (`src/ir/hash.ts:66`), the
inspector, the agent API, the renderer, and the RDF projection (`src/rdf/project.ts:137`,
`mage:entityType`). So the corrected finding reads: *the slot is set corpus-wide, displayed,
queried, hashed, and projected — and checked by nothing.* The authors of every shipped model
reached for `type:` unprompted. The system was already typed, more literally than D7 knew; what is
missing is not the types but the contract that anything holds them to.

Consequences folded into this design: the migration story (§9) inverts — there is nothing to
migrate; and the author's "naming unifies deliberately" already has 160 worked instances, so the
design's job is to give those names force, not to introduce them.

### 1.2 Edge counts — **verified exactly**

`may_propagate_to` 6, `carries_field` 5, `subscribes` 4, `publishes` 2, `calls` 1, in the flagship
at this base. The single-edge case is not an outlier: corpus-wide, 9 of 31 relation-type
declarations in active use have exactly one edge (`carries`, `caches_for`, `invokes`, `calls`,
`records_in`, `submits_to`, `owns`, and two conformance `conveys`/`records`).

### 1.3 The nonsense edge still loads — **verified by re-injection, with one nuance**

`shipping-address --publishes--> customer-id` injected into the `data-policy` model (both
endpoints are members there) validates clean: **0 findings**. Injected into `event-flow` instead,
V40 fires first — on *membership*, not meaning. The nonsense that loads clean is nonsense among a
model's own members, which is exactly the D7 case.

### 1.4 No domain, no range — **verified**

`CanonRelationType` (`src/ir/types.ts:94`) declares `id`, `description`, `absence`,
`pathComposition`, `symmetric`, `acyclic`, `aggregates`. The schema's relation-type object is
`additionalProperties: false` over the same seven. Nothing states what may sit at either end.

---

## 2. The measurement the brief did not have: five shipped relation types are type-heterogeneous

The brief's objection is that use-based unification is too *weak* on sparse relations. The corpus
says something stronger: it is **unsound** on this corpus's modeling style. If every relation type
had one source domain and one target range — the premise under which two `publishes` edges induce
τ_checkout ~ τ_orders — then these five shipped relation types are contradictions:

| Relation type | Example | Endpoint types in use |
|---|---|---|
| `may_propagate_to` | message-bus | `checkout(service) → order-created(event-type)`, `order-created(event-type) → billing(service)`, … — **alternates** service/event-type by design |
| `feeds` | embedded-sensor-node | `firmware → firmware`, `firmware → buffer`, `buffer → firmware` — a pipeline through a queue |
| `powers` | autonomous-delivery | range {`subsystem`, `compute`} |
| `owns_buffer` | autonomous-delivery | domain {`compute`, `subsystem`} |
| `hands_to` | transaction-workspace | range {`service`, `store`} |

Four of the six shipped examples carry at least one. And the first row is not sloppiness — it is
the house pattern for composition: `may_propagate_to` exists to let one path-licensed relation
type span services *and* event types, which is how "checkout reaches fulfillment" becomes askable
at all (the Combining-models walkthrough step runs on it). A type layer that forbids
heterogeneous relation types forbids the corpus's own way of licensing cross-kind reachability.

So mono-typing per relation type is a **per-relation-type fact, not a universal**: true of
`publishes`, `subscribes`, `carries_field`, `calls`; false of the five above. Any rule that
unifies all sources of a relation type into one class — which is what "uses earn equality"
operationalizes — invalidates four shipped examples at HEAD. The author's own sentence carries the
needed conditional: *"**If** `publishes` establishes one source domain and one target range…"*.
The measurement answers how a relation type comes to establish that: **by declaration.** Use alone
cannot, because use cannot distinguish `publishes` (accidentally uniform so far) from
`may_propagate_to` (deliberately mixed).

---

## 3. The invariant, elaborated

The ruled invariant, verbatim:

> Every entity has a type. Every relation occurrence imposes type constraints on its endpoints.
> Missing type declarations introduce fresh shadow types rather than a universal unknown type.
> Explicit declarations and relation semantics may unify or constrain those types. Contradictory
> constraints make the model invalid.

Elaborated into checkable clauses:

- **T1 — totality.** Every entity has a type: the authored `type:` string, or a fresh shadow type
  `τ_<entity-id>` when none is authored. Shadow types are nominal: two shadows are distinct unless
  equality is earned. There is no universal type and no finding for "untyped" — the shadow *is*
  the semantics of omission. (This is where "one regime" holds, fully: typing is never optional,
  never partial, and costs an author nothing.)
- **T2 — declared constraints.** A relation type MAY declare `domain:` and `range:` — each one
  entity-type name or a list of them (§5.1). Every occurrence of a declared relation type requires
  each endpoint's type to be **established as a member** of the declared set. Occurrences of
  undeclared relation types impose no endpoint constraint — see the honesty note below.
- **T3 — earning.** An entity's type is *established* by authorship: the `type:` field, written by
  the human or by an agent transaction (`add-entity` already carries optional `type` —
  `src/transaction/types.ts:55`). A shadow type is established as nothing. In particular, **the
  edge being checked never establishes its own endpoint's type** (§4.3 — this is the RDFS-vs-SHACL
  fork, and the lab example depends on choosing checking over inference).
- **T4 — contradiction.** A violated membership is a load-time finding (V48). Two distinct named
  types are never equal; a shadow is never a member of a declared set.
- **T5 — the layer boundary, respected.** The type layer says only which kinds may sit at a
  relation type's ends. What compositions mean, and what they require, stays with each analysis —
  `publishes` and `may_propagate_to` keep their own composability semantics, and an analysis that
  needs same-kind endpoints consults establishment and **refuses** (V7's "unlicensed, not false"
  verdict shape) when it is absent.

**The honesty note on T2.** The ruled text says *every* relation occurrence imposes constraints.
After §2, that universal survives only in a weakened reading: every occurrence imposes *the
constraints its relation type declares*, which for an undeclared type is none. The alternative —
every relation type gets shadow domain/range variables that all its edges unify against — is
exactly the mono-typing universal the corpus refutes. I state the weakening plainly rather than
hiding it in a definition, and §G.1 asks the author to ratify it. What is preserved: omission of a
*declaration* means "unconstrained ends", never "compatible ends"; omission of an entity's *type*
means "its own kind", never "any kind". Both omissions stay purposeful reduction; neither turns
into permission.

### What becomes of use-induced unification

Deferred, not rejected — with its design recorded here (§6.2) so the deferral is reversible. Three
independent reasons, each sufficient:

1. **Soundness.** §2: as a load-time rule it refutes four shipped examples.
2. **Vacuity where it was wanted.** The brief's objection stands on its own: a single-edge
   relation type (29% of the corpus) derives nothing from use; the first edge *defines* rather
   than *conflicts*. Use-based unification catches incoherence across uses, never nonsense per se.
3. **No shipped consumer.** Unification among shadows only matters where entities are unnamed; the
   corpus has zero unnamed entities (§1.1). Its first real consumer is the new lab example — whose
   teaching job (§12) requires the *refusal*, not the unification.

A relation type that is genuinely mono-typed but whose kind the author declines to name can be
served later by a `domain: uniform` rung that turns use-unification on per relation type, opt-in.
That rung is specified in §6.2 and deliberately not in v1.

---

## 4. What this catches, and what it provably does not

The brief demands this be stated plainly. The table is the claim; nothing elsewhere in this
document claims more.

| Failure | Caught? | By what |
|---|---|---|
| Edge of a **declared** relation type with a wrong-kind endpoint (`shipping-address --publishes--> customer-id` once `publishes : service → event-type`) | **Yes, load-time, deterministic** | V48. Edge count irrelevant — one declared line covers the single-edge `calls` completely |
| Edge of a declared relation type with an **unnamed** endpoint | **Yes — refused until named** | V48: a shadow type is established as nothing (T3) |
| Edge of an **undeclared** relation type, any endpoints | **No** | Nothing. The first and the Nth edge have the same epistemic status; this design refuses to pretend otherwise |
| **Semantic silliness within a kind** (`checkout --calls--> checkout`; calls the *wrong* service) | **No, and not a goal** | Types catch category errors, not falsehoods. Queries, requirements, and V45/V46 own truth |
| **Composition across unestablished kinds** (the lab example: `reading` vs `sample`) | **Yes — as refusal, not invalidity** | The analysis layer consults establishment; distinct shadows ⇒ unlicensed (T5) |
| **Drift in a declared-but-empty relation type** (declaration names a kind nothing carries) | **Yes** | V47 (§10) |

Answering the brief's direct question — *what does the mandatory layer buy on a sparse model?*
Four things, none of them "nonsense is rejected":

1. **The right-hand side of every future check.** A declared `calls : service → service` is only
   checkable because endpoints have types to check. Mandatory typing with shadow fallback is what
   lets declarations be added one line at a time without an entity-migration wave and without the
   two-regimes split the author refused — the *checking* arrives per relation type; the *typing*
   is already total.
2. **A sound compatibility oracle for analyses.** "These two things were never established as one
   kind" is decidable, local, and cheap — and refusal-on-absence is the operational content of
   "unknown does not mean compatible". This is what the lab example teaches.
3. **Spec honesty.** `SEMANTICS.md` finally says what `type:` means; 160 authored values stop
   being decoration.
4. **The pedagogy.** The lesson (§11) and the example (§12) exist only because omission now has
   exact semantics.

And the sharpened reading of the brief's own objection, confirmed: shadow typing catches *"you
mixed two things this model kept distinct"* only where a declaration (or, later, a `uniform`
rung) says there was a distinction to keep. Semantic nonsense needs named kinds plus declared
domain/range. On a sparse, declaration-free model, load-time validation gains **nothing** from
this design — stated without euphemism. The declarations are not an enrichment of the mechanism;
they are the mechanism. What the mandatory layer contributes is that declarations become cheap,
total in reach, and single-regime.

---

## 5. The authored surface

### 5.1 Schema

Two optional keys on a relation type, additive (`mage-model.schema.json`):

```yaml
relation-types:
  publishes:
    description: The source emits events of the target type.
    absence: No emission is represented.
    composition: { path: forbidden }
    domain: service              # one name, or a list
    range: event-type
  may_propagate_to:
    ...
    domain: [service, event-type]   # unions are first-class, not an escape hatch
    range: [service, event-type]
```

A list means membership in the union. Three of the five heterogeneous relation types (§2) are
natural unions; the two alternating ones (`may_propagate_to`, `feeds`) are covered weakly by a
symmetric union — the union admits edges the alternation would not, which is the honest limit of
a domain/range vocabulary and is recorded in the example when declared, not papered over. (A
per-pair constraint language is out of scope and unrequested.)

`CanonRelationType` gains `domain: readonly string[] | null` and `range: readonly string[] | null`
(null = undeclared; the loader normalizes a bare string to a one-element list; an empty authored
list is a V47 finding, not a legal "nothing may be here" — that assertion is `absence:` prose
today and a deliberate non-goal).

**Optional `entity-types:` vocabulary — recommended, small.** A top-level list of declared
entity-type names with descriptions. Not required for v1 correctness (V47 can resolve against
types-in-use), but it gives V47 a stable target, gives the UI a palette, and is the natural home
for the author's "naming a semantic equivalence class". §G.3 rules on it.

### 5.2 Establishment and checking — the algorithm

Per system, at validation time (a pure analysis over the canonical IR; the IR itself is not
rewritten and `CanonEntity.type` keeps its shape):

1. **Type assignment.** For each entity `e`: `T(e) = e.type` if authored, else the shadow
   `τ_e` (spelled `τ_<entity-id>` in findings — deterministic, no generation-order dependence).
2. **V47 — declarations resolve.** For each relation type with `domain`/`range`: every named type
   must appear in `entity-types:` (if present) or on at least one entity. Mirrors V45's "declares
   names that resolve" shape; catches the declared-but-drifted kind (the D6 class: wrong rather
   than invalid, with nothing reporting it).
3. **V48 — occurrences conform.** For each relation `r` of a declared type `R`:
   `T(r.from) ∈ domain(R)` and `T(r.to) ∈ range(R)`, where a shadow type is a member of nothing.
   Each finding is **local**: it cites the edge (`where` = the edge's dotted address), the
   declaration site, and the endpoint's type source (authored value, or "no authored type").
4. No other step. There is no global solve in v1; every verdict is a function of one edge, one
   declaration, and two authored-or-absent type fields.

### 5.3 Provenance — "why are these still distinct?"

The author wants the engine able to report *what caused two shadow types to remain distinct*. In
v1 the honest answer is definitional — nothing unifies shadows except authorship, so distinctness
is the default state, and the useful report is each side's **establishment record**. Specify a
small query (engine function + agent-API passthrough, shape in the house `elements` style):

```
explain-type(entity) → {
  established: "authored" | "unnamed",
  type: string | null,            // the authored name, or null
  shadow: string | null,          // τ_<id> when unnamed
  constraints: [                  // every declared-relation occurrence touching the entity
    { relation, relationType, position: from|to, declared: [names], verdict: member|violation|unestablished }
  ]
}
```

Two `explain-type` calls answer the author's question exactly: *reading is unnamed (τ_reading);
sample is unnamed (τ_sample); no authored statement relates them; here is every constraint each
one sits under.* When the `uniform` rung lands (§6.2), the same shape extends with the
union-find witness path — the design for that is in §6.2 so the v1 shape doesn't need revising.

---

## 6. Retroactive invalidation — and the dynamics argument for v1's shape

### 6.1 v1: locality by construction

The brief's scenario — a student adds one edge and gets an error about two *other* entities —
**cannot occur in v1**. An edge's verdict depends only on its own endpoints' authored types and
its own relation type's declaration. Adding an edge can create findings only at that edge.
Changing an entity's `type:` can create findings only at edges touching that entity — a bounded,
enumerable set, every finding sited at its edge. Deleting a type from `entity-types:` is V47 at
the declaration site. In the hypothesis mechanism (`src/transaction/types.ts:163` — any non-main
branch), re-validation after each applied operation (the existing cadence) therefore produces
finding-deltas that are always attributable to the operation, with no action-at-a-distance. This
locality is not an accident of the simple design — it is a second independent argument (with §2's
soundness) for deferring cross-entity unification.

### 6.2 The deferred `uniform` rung, specified for its day

`domain: uniform` (and/or `range: uniform`) on a relation type R: all sources (targets) of R's
edges must share one type. Implementation: union-find over `{T(e)}` with named types as distinct
constants; each union records its **witness edge**; contradiction = two constants forced equal,
reported with the witness *path* (the standard proof-forest explanation — the chain of edges that
earned the equality, each one a model element the student can see). This is where retroactivity
genuinely enters: an added edge can merge classes and surface a contradiction between two edges
added weeks apart. The finding must then cite the full witness path, not the newest edge — the
newest edge is where the student is looking, but the path is what makes the error *about the
model* rather than about edit order. Ship this rung only with that reporting; a cheaper version
would teach students that errors appear at random.

---

## 7. V45/V46 — one framework, two constraint kinds, one suppression rule

`aggregates` and `domain`/`range` are **not two spellings of one idea**, and must not merge:

- `aggregates` derives **property obligations** — extensional ("every source of `carries_field`
  must declare `carries`; the authored value must equal the max over targets"). V45 fires on a
  missing property that a correct *type* cannot supply; V46 on a value disagreement.
- `domain`/`range` declare **kind membership** — intensional. V48 fires on a wrong category that
  present *properties* cannot excuse.

They meet in one findings vocabulary, one severity table, one parity set — the "one mechanism" the
brief asks about is the constraint-and-finding *framework*, not the constraint kinds. What must be
specified is the overlap: on `carries_field` (which declares `aggregates` and will declare
`domain: event-type`, `range: field`), the D7 injection violates both. Per the house one-defect-
one-finding discipline (D6: "V26 must not double-report"; §3's "V3 owns the finding and V40 stays
quiet"): **V48 owns a mis-kinded edge; V45/V46 skip edges carrying a V48 finding** on this
occurrence. A wrong-kind edge's missing `carries` is downstream of the edge being nonsense;
reporting it would send the student to add a property to an entity that should never have been an
endpoint. (V45/V46 still fire on well-kinded edges exactly as today; nothing lands in their path
for the existing corpus.)

`aggregates` already implies a weak extensional domain ("whatever declares `carries`"). After
declarations land on `carries_field`, that implication becomes redundant with the intensional one
— harmless, and V45 keeps earning its half on the *property* side. No generalization of
`aggregates` into a typing mechanism (D7's shape 2) is pursued: §2 shows derived-from-use can't
reach the relation types that declare nothing, which is most of them, and D7 itself called that
partiality structural.

---

## 8. Model identity: the hash

**Authored types are already in the hash** (`src/ir/hash.ts:66` hashes `e.type`) — no decision
needed there, only the observation that the contract predates this design.

**New authored surface enters the hash.** `domain`/`range` join the relation-types projection
beside `aggregates`, with `aggregates`' own argument (hash.ts comment: "it decides whether a
revision is well formed … a transaction's `base` must say so"). Sorted, normalized to lists, so
`domain: service` and `domain: [service]` are one system.

**Inferred types do not enter the hash.** Two arguments, either sufficient:

1. **Redundancy.** Shadow assignment and (future) unification results are deterministic functions
   of content already hashed. Hashing a derived value adds no discrimination.
2. **Version independence.** The hash's own header refuses invalidation by cosmetic edits; an
   inference-algorithm fix is the same class — a hash that covered inferred classes would
   invalidate every pending transaction on an engine upgrade with zero semantic edits. The
   `fnv1a64:` token answers "is this the system the operations were computed against", and the
   system is the authored artifact.

`canonicalize.ts` and `hash.ts` are the only sites touched, both additively.

---

## 9. Migration over the corpus

The brief's premise was "77 entities, all untyped — what breaks?" §1.1 inverts it: **nothing
breaks, and no entity migrates.**

- **T1 (mandatory typing)** emits no finding by construction — omission yields a shadow, not a
  violation. It is not even a rule; it is the semantics of the absent field, landing as spec text
  (`SEMANTICS.md` §3.3) + the typing analysis.
- **V47 and V48 find 0 at HEAD** — no relation type declares domain/range yet. Per this repo's
  discipline, a blocking check finding 0 at HEAD lands blocking immediately; the audit-only-first
  staircase is not needed for the rules themselves.
- **The declaration-adoption wave** (phase B below) is where findings could appear, and they
  appear *in the authoring worktree* of whoever writes a wrong declaration — ordinary red-gate
  development, not a corpus drain.

**Phases:**

- **A — machinery.** Schema keys + `canonicalize` + `CanonRelationType` + hash projection +
  `SEMANTICS.md` §3.3 (new subsection under §3, sibling of §3.1/§3.2) + V47/V48 in
  `src/validator/rules.ts` *and* `validate.py` + both added to `PARITY` in `test/parity.test.ts`
  (both sides have every input; the D6 ruling's standard — "an asymmetry here would record only
  that one side had not caught up" — applies verbatim) + `ValidationRule` union + severity rows
  (`error`, both) + tests: the §1.3 injection as a pinned regression (with a declaration present,
  V48; without, clean), a V47 drift case, a union-domain case, and the six examples asserted
  finding-free. Also: project `domain`/`range` to RDF as `mage:domain`/`mage:range` — **not**
  `rdfs:domain`/`rdfs:range`, whose semantics are inference (an RDFS reasoner would *conclude*
  `shipping-address a service` from the nonsense edge rather than reject it — the exact inversion
  T3 forbids; genre check: this design is SHACL-shaped validation, not RDFS/OWL-shaped inference,
  and the same fork is why KerML association end types *check* their participants).
  `RDF-VOCABULARY.md` row in the same commit.
- **B — adoption.** `message-bus` declares all five relation types (`publishes`/`subscribes`:
  `service → event-type`; `carries_field`: `event-type → field`; `calls`: `service → service`;
  `may_propagate_to`: union both ends, with a note naming the alternation the union cannot
  express). Remaining examples + specimen + self-models at the author's pace — each is a one-file
  diff whose gate is the suite. `entity-types:` adoption rides along if §G.3 ratifies it.
- **C — pedagogy.** §11 lesson + §12 example; C depends on the case-envelope wave (§12, note).

Phase A is one worktree; B is per-file parallelizable; C is sequenced behind the envelope wave.

---

## 10. The V-rules

Numbered against `src/validator/rules.ts` at base: V46 is the highest in use; **V47, V48** are
next free.

- **V47 — a domain/range declaration resolves.** Every type name in a relation type's `domain:` or
  `range:` names a declared entity type: a member of `entity-types:` when that section exists,
  else a type some entity carries. An empty list is a V47 finding ("declares no kind; delete the
  key or name one"). Severity `error`. `where` = `relation-types.<t>.domain|range`. Catches the
  silently-dead declaration (rename drift), V45's resolution shape pointed at types.
- **V48 — a relation occurrence conforms to its relation type's declared ends.** For every edge of
  a declared relation type: the source's type is a member of the domain, the target's of the
  range. An unestablished (shadow-typed) endpoint at a declared position is a V48 finding whose
  message says what is missing, not what is wrong: *"`reading` has no authored type; `conveys`
  requires `measurement` here. Name `reading`'s kind (`type: measurement`) if that is what it is —
  the edge cannot establish it."* Severity `error`. `where` = the edge; `subjects` = endpoint ids
  + relation-type id. Suppression: an edge with a V48 finding is skipped by V45/V46 (§7).

Both in `PARITY`. Both doc'd in `SEMANTICS.md` §3.3 with the "what the absence of a declaration
asserts" sentence stated in the section's own voice: *an undeclared domain constrains nothing and
licenses nothing — in particular it never asserts that anything may compose with anything.*

---

## 11. The Learn lesson: "Unknown does not mean compatible"

**Placement.** A new walkthrough step in the **Models** group (`src/learn/walkthrough.ts`,
`WALKTHROUGH_GROUPS[0]`), **last in the group, after `walk-combining`** — the group's story
becomes: what a model is for → the three forms → combining → *what omitting a distinction does
and does not mean*. That satisfies the author's "under Modeling, late — after purposeful reduction
(`walk-purpose`) and semantic commitment (the declared-meaning beat of `walk-structural`)".
Models grows 5 → 6 steps; `test/learn-walkthrough.test.ts`'s total-and-disjoint partition check
and the group counts in `DESIGN-learn-ontology-regroup-261005.md` §1 are updated in the same
commit. Anchor: `walk-typing` (stable, short; the title carries the thesis, the anchor the topic).

**Step declaration sketch** (shape per `WalkStep`):

- `title`: "Unknown does not mean compatible"
- `definition`: "Every entity has a kind, even when the author has not named it. An unnamed kind
  is its own kind — distinct from every other — until a name or a declaration earns otherwise.
  Omitting a distinction a model does not need is purposeful reduction; it never makes the omitted
  distinctions interchangeable."
- `instruction` + `grounding`: open the lab example (§12), run its blocked composition, read the
  V48 finding, supply the missing `type:`, re-run. Grounding kind `model` + `query` rows against
  the new example — which makes this step **depend on §12 landing**; if the author wants the
  lesson first, the fallback grounding is message-bus after phase B (inject-and-read in a
  hypothesis), at the cost of teaching rejection without teaching the refusal-until-named beat.
  Recommend: land with §12 (§G.4).
- The five content beats, in the author's order: (1) every entity has a type even if unnamed;
  (2) unnamed entities get distinct shadow types; (3) relations constrain endpoint kinds — when
  their type declares them; (4) explicit declarations name and unify; (5) omission means "not
  specified", never "anything goes". Open with the latent-nonsense hook the author specified:
  `checkout --publishes--> payment_event`, then `payment_event --publishes--> billing` — looks
  reasonable, loads today, and the question "what would Fable need to *know* to refuse the second
  edge?" is the lesson. (Beat 3 carries this document's §4 honesty: the step must say the
  constraint arrives with the declaration — the walkthrough is the wrong place to over-claim what
  the corpus's own gates spent today un-claiming.)

---

## 12. The lab example: under-specified, not wrong

**The teaching job**, distinct from all six shipped examples: the model contains **no error** —
validation is clean — but is too under-specified to license a composition the student wants. The
system's posture is "you have not told me enough to justify what you want", not "you did something
forbidden".

**Count note:** the brief says "sixth lab example"; six examples ship already (five §21 flagships
+ `worker-queue`, built-in). Read as: sixth *flagship-progression* ("lab") example, seventh
`SHIPPED_EXAMPLES` row, status `built-in` (prominence is decided by the progression, not by
coverage — the 261005 ruling in `src/app/examples.ts` applies verbatim; its `covers:` is the
unique V48/refusal coverage).

**Dependency:** the concurrent wave giving all examples the **Scenario / Investigate / Models /
Try asking** case envelope. This example lands in that template, after that wave; specified here
in its terms.

- **Name:** `calibration-loop` (working name; any instrument-and-controller domain serves).
- **Scenario.** Two teams modeled independently. The instrumentation team: `sensor
  --produces--> reading`. The control team: `sample --consumed_by--> controller`. Task: *"connect
  the sensor's output to the controller's input — without weakening the model."*
- **Entities.** `sensor` (`type: instrument`), `controller` (`type: actuator`) — named, so the
  untyped pair stands out; `reading`, `sample` — **deliberately untyped**, the corpus's only
  untyped entities, which is the point.
- **Relation types.** `produces`, `consumed_by` — undeclared ends (each team's purposeful
  reduction); `conveys` — **pre-declared** `domain: measurement`, `range: measurement`,
  `composition.path: allowed`, written by a prior integrator; `measurement` listed in
  `entity-types:` with a description (making it V47-resolvable while no entity yet carries it —
  the declared-vocabulary case). The connecting edge the task invites is `reading --conveys-->
  sample`.
- **Investigate.** The student adds the edge in a hypothesis. V48 fires, twice, locally at the
  edge: `reading` and `sample` have no authored type; `conveys` requires `measurement` at both
  ends; the edge cannot establish it. `explain-type(reading)` shows the full record. The student
  authors `type: measurement` on both; the model validates; the saved question flips. (A graph
  query traverses ONE relation type — `mage-query.schema.json`'s `graphQuery.relation` is
  singular, and the KerML link-typing fixture pins exactly that — so the saved question is
  `direct` over `conveys`, `reading` to `sample`: *"is the instrumentation team's reading
  actually delivered as the control team's sample?"* Before the edge it is refuted; the edge
  cannot be added while the kinds are unestablished; after naming, it holds. A three-type
  "sensor reaches controller" reachability is not expressible and must not appear in the spec.)
- **The wrong answers, named as wrong in the example's own prose** (each "works" by discarding
  information instead of supplying it):
  1. **Delete the typing** — remove `conveys`' domain/range: the edge loads, and so does every
     future nonsense edge; the integrator's one guarantee is gone.
  2. **A universal `Data` type** — retype everything `data`: the declaration still "holds" while
     distinguishing nothing; omission has been turned into permission by hand.
  3. **Force the edge** — connect via an *undeclared* relation type (or a raw `produces` edge to
     the controller): loads clean, asserts nothing, and the model now contains a connection no
     semantics backs — the D7 edge, re-authored on purpose.
  4. **Equate the shadows arbitrarily** — assert reading≡sample (or name them `measurement`
     without believing it): the composition is "possible" and the model now states a semantic
     fact nobody established. The only *right* move supplies the missing fact because it is true.
- **Models.** One graph model (`signal-path`) suffices; its `purpose.question` is the task
  itself. No machine, no quantities — the example must stay minimal so the one lesson is the
  whole surface.
- **Try asking.** The `direct`-over-`conveys` question (before/after), `successors` over
  `produces` and over `consumed_by` (each fragment is internally fine — the point), and
  `explain-type` on `reading` (3–5 per the §2 cap).
- **expected-results.yaml** pins: clean validation pre-edge; the two V48 findings with the edge;
  clean + query-holds after typing. These become the standing regression for T3's
  edges-never-establish semantics.

---

## §G — Open questions for the author

1. **Ratify the T2/T3 refinement** (§3): occurrences of *declared* relation types check
   membership; edges never establish their endpoints' types; use-induced τ-unification is
   deferred to an opt-in `uniform` rung (§6.2). Evidence: five heterogeneous shipped relation
   types (§2), single-edge vacuity (§1.2), and the lab example's own refusal mechanics, which
   *require* the suspect edge not to self-justify (§12). This is the one place this design
   adjusts the ruled mechanism rather than elaborating it. *Recommended: ratify; the alternative
   that keeps load-time use-unification universal invalidates four shipped examples.*
2. **Union domains in v1** (§5.1): `domain: [service, event-type]` from day one, or single names
   with the five heterogeneous types left undeclared? *Recommended: unions in v1 — otherwise
   phase B cannot touch the flagship's most instructive relation type, and the first student
   question ("why is may_propagate_to undeclared?") has no good answer.*
3. **Optional `entity-types:` vocabulary** (§5.1): ship it (V47 resolves against it ∪ types in
   use), or resolve against types-in-use only? *Recommended: ship — it is the declared home of
   "naming a semantic equivalence class", and §12 needs a V47-resolvable type no entity carries
   yet.*
4. **Lesson sequencing** (§11): hold `walk-typing` for the lab example, or land earlier grounded
   on message-bus? *Recommended: hold; the refusal-until-named beat is the lesson's spine.*
5. **Advisory cohesion reporting**: a `warning`-severity report ("the 6 edges of X use endpoints
   of 2 kinds; if that is one kind, name it") — ship or skip? *Recommended: skip; on the shipped
   corpus every instance is deliberate (§2), so the signal starts life as five false positives,
   and the severity vocabulary's first `warning` should not be noise.*
6. **Shadow-type spelling** in findings and `explain-type`: `τ_<entity-id>` (recommended;
   deterministic, self-explaining) vs. opaque fresh names.

---

## Appendix — how the numbers were produced

All at this worktree's base (`b1d702e47`), commands runnable from `workbench/`:

- **Typed-entity census:** PyYAML walk over `examples/*/system.mage.yaml`,
  `examples/docable.mage.yaml`, `models/*.mage.yaml`, `conformance/*/*/model.mage.yaml`, counting
  `entities.<id>.type` presence → 48/48, 53/53, 160/160 (§1.1 table). Loader confirmation: Node 24
  (`.nvmrc` floor is 22; the dev default Node 20 refuses the `.ts` imports), `canonicalize` on
  message-bus → 11/11 typed.
- **Edge counts and heterogeneity:** PyYAML walk over `models.<m>.relations`, grouping endpoint
  `type` values per relation type (§1.2, §2 tables; the §2 edge listings are verbatim dumps).
- **Injection:** `validateModel(canonicalize(raw))` with
  `{from: shipping-address, to: customer-id, type: publishes}` pushed into `data-policy.relations`
  → 0 findings; into `event-flow.relations` → 2 × V40 (membership, §1.3).
- **Consumer census for `CanonEntity.type`:** grep over `src/` → `canonicalize.ts:132` (load),
  `hash.ts:66` (hash), `elements.ts` (selector), `inspector.ts:312`, `agent-api.ts:868`,
  `scene.ts:150`, `rdf/project.ts:137`; zero hits in `validator/rules.ts`.
- **Rule numbering:** `ValidationRule` union in `src/validator/result.ts` and `SEMANTICS.md:11`
  ("V1…V46") → next free V47.
