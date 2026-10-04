# The model query interface: design

The authority is `DECISIONS-RULED-model-query-261002.md` — the Q9 ruling and its two extensions.
This document designs what that ruling obliges: a model query interface whose operations are
defined over the MAGE metamodel, a `check` operation naming the gate that already exists, a
`validate` operation closing the gap the ruling names, query semantics attached to the model-type
registry, and the SPARQL console fenced outside the semantic interface where the registry can see
it. The design does not re-litigate the ruling, and nothing here is implementation — waves are
sequenced in §10.

What this design does NOT touch: the SPARQL evaluator's semantics (`src/sparql/eval.ts`), the RDF
projection (`src/rdf/`), the transaction pipeline, and `src/ui/` (a sibling agent is live there;
the human halves of new operations ride the shell waves, §10). Where a ruling obligation looks
like it needs those, the relevant section shows it does not.

The architecture, fixed by the ruling and used as this document's spine:

```
model type definition
  → structural semantics + query semantics + validation semantics
    → model query interface  (construct → check → execute → result + evidence)
      → human and agent affordances
        → SPARQL execution over RDF   (implementation, never authority)
```

---

## 1. Genre check — OCL, and what was taken

The genre is model query and constraint over a metamodel. The canonical best-in-class is **OCL**
(OMG, over UML/MOF), with Eclipse OCL / Papyrus / Capella as the adjacent tooling, QVT as the
transformation sibling, VIATRA as the declared-graph-pattern approach over EMF, and the SysML v2
API's query services as the recent REST-shaped instance.

**Taken, at naming-convention cost:**

- **The operation vocabulary.** OCL's `allInstances()` becomes `elements` (§2.2, scoped — see the
  departure below); association-end navigation becomes relation traversal over a declared relation
  type with a direction; OCL 2.4's `closure()` is the composing traversal family
  (`reachability`, already licensed per relation type); `select`/`reject` over a collection is the
  `where`/predicate grammar already in `src/engine/types.ts:183,205`; an invariant evaluated
  against a model is a saved property with an expectation — the construct the workbench already
  has. The author's five example shapes all land in this vocabulary (§2.2).
- **Context-typed well-formedness.** Every OCL expression is typed against a classifier context
  and checked before evaluation. That is `check` (§5): a question is admitted against the
  metamodel before anything evaluates, and ill-typed questions are a *static* answer, not a
  runtime surprise.
- **Side-effect freedom.** OCL constraints may not mutate the model. Held here more strongly than
  OCL holds it: queries are read-only by construction, and verdicts are derived state that is
  recomputed, never stored (the V18 discipline).
- **Explicit absence semantics.** OCL's `invalid`/`null` taught the genre that partial functions
  over models need a defined absence value. The workbench already exceeds the lesson: a refusal is
  a typed object carrying cause, missing distinctions, and the remedy (`src/engine/types.ts:70`,
  `src/sparql/refusal.ts:83`).

**Deliberately not taken, and why:**

- **The textual language.** The ruling defers it; the trigger is measured need (§4).
- **Unlicensed navigation.** OCL navigates any association, in either direction, by default. MAGE
  licenses traversal per relation type (`composition.path`, V7; `symmetric`, V8) and refuses the
  rest by name. This is the sharpest departure, and it is the ruling's own boundary: the model
  decides what questions mean, not the representation's mechanical navigability.
- **Unscoped `allInstances()`.** OCL's is global. Here every relational question states its scope
  (V34, `src/sparql/licensing.ts:106`): one model's purposeful reduction, or the system union.
- **`iterate` and general collection folds.** The point where OCL became a general-purpose
  language inside a constraint language, and the best-documented source of unanalyzable OCL. This
  is where the composition line is drawn (§4): no folds, no result piping.
- **Declared named patterns per type (VIATRA's shape).** A per-type catalogue of permitted
  queries is exactly the "declarative query-language-in-YAML" the author forbade. The metamodel
  declares meanings; the query layer composes questions.

## 2. The interface — what exists, what is named, what is added

### 2.1 The seed is already planted

The ruling says to start from what is there, and what is there is most of the interface:

- `window.mage.query()` / `ask()` are typed, model-semantic, and return outcome + coverage +
  evidence + the hash they describe (`src/app/agent-api.ts:47,57`).
- The operation inventory's substrate is the form vocabularies: `GRAPH_FORMS` (10 forms),
  `BEHAVIOR_FORMS` (6), `REQUIREMENT_METRICS` (3) (`src/engine/types.ts:127,134`;
  `src/quant/requirement.ts:31`).
- The substrate-absence rung already runs ahead of every evaluator and is registry-worded
  (`src/engine/index.ts:73` → `absentSubstrateVerdict`, `src/engine/model-types.ts:223`).
- The SPARQL seam's gate already holds the single-semantics requirement by type: `admit` is the
  only producer of the branded `LicensedQuestion` (`src/sparql/licensing.ts:183,294`), and
  `evaluate` accepts only that type (`src/sparql/eval.ts:831`).

So the design adds exactly four things: the `QuerySemantics` declaration on the registry (§3),
the `check` operation (§5), the `validate` operation (§6), and the fence (§7). Plus one new query
operation (§2.2) and a derived facade spelling (§2.3).

### 2.2 The operation inventory, derived

The ruling requires the inventory be derived from what the kernel can answer, not enumerated by
hand. The kernel answers: the three form vocabularies, element enumeration (`inspect`), and
saved-question evaluation. The author's five example shapes map onto that substrate as follows —
four exist, one is new:

| Author's shape | Operation | Substrate | Status |
|---|---|---|---|
| elements of a given type | `elements` | the IR's entity table + the `PropConstraint` grammar | **NEW** (§2.4) |
| following a relationship | graph `direct` / `predecessors` / `successors` | `GRAPH_FORMS` | exists |
| computing reachability | graph `reachability` / `components`, licensed per relation type | `GRAPH_FORMS` ∩ `GRAPH_COMPOSING` | exists |
| tracing between model elements | graph `path` (witness-bearing) + the `appears-in` cross-model join (`agent-api.ts:214`) | `GRAPH_FORMS`, entity identity | exists |
| identifying violations of a model constraint | `validate` (model well-formedness, §6) + `properties()` (declared claims with expectations) | `rules.ts`, saved queries | `properties` exists; `validate` is §6 |

Behavioural and quantitative questions are already operations (`BEHAVIOR_FORMS`,
`REQUIREMENT_METRICS`) and need no renaming. The inventory is therefore not a new list anyone
maintains: it IS the form vocabularies plus `elements`, and §3 makes the registry say so per
type, by reference.

### 2.3 One declaration, two affordances — and the agent spelling

The Extension-1 test: declaring a relationship as a queryable directed relation must yield both a
Workbench action (*Show dependencies*) and an agent operation (`related(element, DEPENDS_ON,
OUTGOING)`), derived from one declaration.

The machine side keeps `query()` as the stable wire contract, and gains a **derived facade**:
`window.mage.model.*`, a namespace of thin constructors — `elements`, `related`, `reachable`,
`path`, `violations` — each of which builds a typed `Query` (or calls `validate`) and delegates to
the same `workspace.query` seam. The facade adds no semantics: a derivation test (MQ-I8) holds
that every facade operation maps onto a form the registry's `QuerySemantics` declares, so the
facade cannot offer what the kernel refuses. It is registered as additional machine affordances of
the `query` capability — the `ask`/`sparql` precedent: one capability, several spellings
(`src/app/capabilities.ts:219`).

The human side derives from the same declaration: the inspector's contextual actions for a
selected element are generated per declared traversable relation (*Show depends_on →*), and the
ask bar's contextual question catalogue is generated from `QuerySemantics.forms` for the types the
loaded system declares. Those surfaces are shell territory; §10 sequences them, and each owes a
declared navigation path under the ratified G1 reading (`DECISIONS-RULED-shell-261002.md`).

### 2.4 `elements` — the one new operation

`elements({ type?, where? }) → { ids, hash }`: the entities the system declares, filtered by
declared type and by the existing `PropConstraint` grammar (`src/engine/types.ts:170`). It reads
the IR directly — it is a representation question, not an analysis — and it is licensed by the
structural-graph type's presence rung like any graph question. It exists because every one of the
author's other shapes takes element ids as input, and today an agent gets them only by filtering
the whole of `inspect()` client-side. Scope note: `where` uses the same operator rules as
everywhere else — order comparisons only over a declared ordered domain (V20,
`src/engine/types.ts:168`).

## 3. Query semantics on the model type

### 3.1 The shape: primitives and citations, never permitted queries

`ModelType` (`src/engine/model-types.ts:60`) gains one field:

```ts
export interface ModelType {
  // ... existing fields ...
  /** What questions can meaningfully be asked of this type. Primitives, never query catalogues. */
  readonly query: QuerySemantics;
}

export interface QuerySemantics {
  /**
   * The question forms this type answers — the engine's own array BY REFERENCE (MQ-I3).
   * Replaces `propertyFamilies`, which was this fact wearing a Learn-page field name.
   */
  readonly forms: readonly string[];
  /**
   * Forms whose answer is derived by composing edges or steps, and which are therefore gated by a
   * per-instance licensing declaration. Null when composition is not a concept the type has.
   */
  readonly composing: ReadonlySet<string> | null;
  /**
   * Where per-INSTANCE licensing is DECLARED, as citations. The registry points; the IR decides
   * (V32). Restating `pathComposition: forbidden` here would be a second copy of a per-system
   * fact, which is the drift this registry exists to prevent.
   */
  readonly licensedBy: readonly SchemaAuthority[];
  /** The nouns a question of this type may name, each with the selector grammar that applies. */
  readonly subjects: readonly QuerySubject[];
  /** Which comparisons are meaningful over this type's attributes, and what scopes them. */
  readonly predicates: PredicateSemantics;
  /** Transitive or derived relations the type defines semantically, each with its gate. */
  readonly derived: readonly DerivedRelation[];
  /** Cross-model traces or joins that are meaningful for this type. */
  readonly joins: readonly JoinSemantics[];
}

export interface QuerySubject {
  readonly noun: string;                    // "entity", "relation type", "state", "quantity"
  readonly selector: "by-id" | "property-constraints" | "predicate";
}
export interface PredicateSemantics {
  /** What equality/membership applies to. */
  readonly equality: string;
  /** Order comparisons, and the declared structure that licenses them. Null: no ordering concept. */
  readonly order: { readonly ops: ReadonlySet<string>; readonly scopedBy: string } | null;
}
export interface DerivedRelation {
  readonly name: string;
  readonly meaning: string;
  /** The per-instance declaration that gates it, or "none" when derived by construction. */
  readonly gate: string;
}
export interface JoinSemantics {
  readonly name: string;
  readonly meaning: string;
}
```

This is the author's Extension-1 list — queryable elements and properties, traversable
relationships and directions, meaningful predicates, defined transitive relations, evaluable
constraints, meaningful cross-model joins, supported operations — as a typed description. The
load-bearing property: **every field is either a reference to an engine-owned vocabulary or a
citation of where the IR declares the fact.** Nothing enumerates permitted queries; nothing
restates a per-system declaration. The gate keeps reading the IR; the registry says what KIND of
gate each primitive has and where its facts live. Constraint evaluability needs no field of its
own: a constraint-as-query is a saved property, and the forms it may use are `forms`.

### 3.2 The three kernel types, declared

**structural-graph:**

```ts
query: {
  forms: GRAPH_FORMS,                       // identity-asserted, not spread
  composing: GRAPH_COMPOSING,               // the five composing forms, by reference
  licensedBy: [
    { file: "src/ir/types.ts", symbol: "CanonRelationType",
      role: "per-relation licensing: composition.path gates composing forms (V7); symmetric fixes traversal directions (V8)" },
  ],
  subjects: [
    { noun: "entity", selector: "property-constraints" },
    { noun: "relation type", selector: "by-id" },
    { noun: "model", selector: "by-id" },   // scope, stated per question (V34)
  ],
  predicates: {
    equality: "any scalar entity property",
    order: { ops: ORDER_OPS, scopedBy: "a shared declared ordered domain (V20)" },
  },
  derived: [
    { name: "reachability", meaning: "transitive closure of one licensed relation type",
      gate: "composition.path" },
    { name: "connected components", meaning: "reachability classes", gate: "composition.path" },
    { name: "containment ancestry", meaning: "the entity contains tree, hierarchical by construction (§2)",
      gate: "none" },
    { name: "cycles", meaning: "declared-acyclicity check", gate: "none — licensed by V8 independently of V7" },
  ],
  joins: [
    { name: "appears-in", meaning: "one entity's identity across purposeful models (§8)" },
  ],
}
```

**state-machine:** `forms: BEHAVIOR_FORMS`; `composing: null` — behavioural questions compose
configurations, not edges, and the state space is the type's own semantics rather than a gated
privilege; `licensedBy` cites `CanonMachine`/`CanonTransition` (guards, sync) as what fixes the
configuration space; `subjects`: state (by-id inside a predicate), machine variable (predicate),
transition (selector); `predicates`: equality on variables over their finite domains, order only
over declared ordered domains; `derived`: configuration reachability (gate: none — it is what the
type IS), repeatable cycles / lassos; `joins`: the machine↔entity binding (`CanonMachine.entity`),
which is what lets a behavioural answer name the structural element it concerns.

**quantitative-model:** `forms: REQUIREMENT_METRICS`; `composing: null`; `licensedBy` cites
`CanonAccounting` (the declared basis is what licenses path aggregation) and `DIMENSIONS` (the
closed table comparisons normalize against); `subjects`: quantity (by-id), target predicate,
declared ceiling (`within`, by-id); `predicates`: order comparisons scoped by one shared dimension
— cross-dimension comparison is a category error, refused by name; `derived`: path-aggregated
worst case (gate: `accounting` basis), configuration peak (gate: dimension scope); `joins`: the
composition with the state machine the registry already declares (`combineWith`) — a quantity
question selects executions by a behavioural predicate (`QuantityQuery.target`), which is the one
cross-type composition built today.

### 3.3 What consults it

Four consumers, which is what keeps the declaration from being a brochure:

1. **The dispatcher** keeps consulting `presentIn` at the substrate rung (unchanged).
2. **`check`** (§5) reports refusal alternatives from `forms`, `subjects`, and `predicates` —
   the closed lists a revising agent needs.
3. **The derived facade and the human contextual actions** (§2.3) are generated from `forms` and
   `derived` — MQ-I8.
4. **Learn** projects `forms` where it projected `propertyFamilies` (`src/app/learn.ts` changes
   one field read; its derivation discipline is unchanged).

## 4. Composition without a language

### 4.1 The line

Three sanctioned composition sites, and no fourth:

1. **Within one operation: the closed combinator grammars.** Predicates compose by
   `all-of`/`any-of`/`not` (`src/engine/types.ts:205`); graph questions carry endpoint property
   constraints and cross-property comparisons (`GraphWhere`, `:183`); quantity questions compose a
   behavioural target predicate with a metric and a declared ceiling. These grammars are typed,
   closed, and already shipped.
2. **Across model types: registered compositions only.** A cross-type question exists when the
   registry declares the pair (`combineWith`) and an operation implements it —
   `QuantityQuery.target` is the built instance. A new cross-type composition is a deliberate
   registry + engine act, never an emergent property of chaining.
3. **In the caller.** An agent iterates: run `elements`, loop, run `related` per element. That
   costs round trips and is the intended cost — the caller composes RESULTS in its own language,
   not queries in ours.

**Ruled out, by name:** piping one operation's result set into another operation as input; joins
over two result sets inside the interface; universal quantification over a result set as one call
("for every element matching P, does Q hold" — the caller loops, or models the claim as a saved
`forall` property where a form supports it); aggregation beyond the declared forms (no generic
GROUP BY); disjunction ACROSS operations; folds (`iterate`) of any kind. Each of these is a query
language wearing an API's clothes, and together they are how typed operations become one by
accident.

### 4.2 The revisit trigger, made measurable

The ruling's trigger for a textual language is measured need. Measured means recorded: a question
is evidence when it (a) arises in a shipped example, curriculum exercise, or recorded agent
workflow, and (b) cannot be expressed as one typed operation plus caller-side iteration, and (c)
drove someone to the escape hatch (§7). MQ-I5's test keeps shipped artifacts off the hatch, so
every hit of (c) is deliberate and reportable. When such questions accumulate, the composition
decision reopens with data; §G5 asks the author to ratify this as the trigger's definition.

## 5. `check` — naming the gate that exists

### 5.1 What `check` is, and is not

`check(query) → QueryCheckResult` answers: *is this a meaningful and permitted question for this
model type?* It takes the same untyped query document `query()` takes. It does not predict the
answer, the outcome, or coverage — those are execution's. And it is advisory for efficiency, not
load-bearing for safety: executing an unchecked query is permitted and safe, because the executor
runs the same admission itself. The `construct → check → execute` flow exists so an agent can
revise cheaply, not so the executor can trust its caller.

`check` does NOT accept SPARQL text. SPARQL is not a model query under the ruling; the console
keeps its own internal gate (`translate`, `src/sparql/parse.ts:963`, which is already
check-then-compile), outside the semantic interface (§7).

### 5.2 One semantics, held two ways — and why not one

The ruling: a query accepted by the checker must not acquire a different meaning at execution.
Two structural arrangements hold it, one per path, each already native to its layer:

- **The SPARQL seam: the brand.** `admit` is the sole producer of `LicensedQuestion`; `evaluate`
  consumes only that type; the brand cannot be serialized, so every evaluating thread runs the
  gate itself (`src/sparql/licensing.ts:197-201`). Unchanged by this design, and deliberately so.
- **The engine path: the executor calls the checker.** Each evaluator's pre-evaluation decision
  rungs — vocabulary resolution, endpoint existence, licensing, category errors — are factored
  into one exported function per kind, `admitTyped(system, query) → TypedAdmission`, and the
  evaluator's first act becomes calling it. Today those rungs run at the head of each evaluator
  but interleaved per form (`src/engine/graph.ts:431-512`); the factoring moves code, not
  decisions. `check` calls `parseQuery` → `absentSubstrateVerdict` → `admitTyped`; `execute`
  calls the same three and then evaluates. The checker is not a second implementation — it is the
  executor's own head, exposed.

Why not brand the engine path too: the brand earns its keep at the seam because translation and
evaluation are separate modules on separate threads, so an ungated path could exist. On the
engine path, `admitTyped` and evaluation live in one function's body; the call-graph identity is
the guarantee, and a brand would be ceremony with no second caller to defend against. MQ-I2 pins
the agreement regardless of arrangement: for every saved question in every shipped example, plus
a violation battery, `check` and `execute` report the same refusal cause and the same sentence at
the same hash.

### 5.3 `QueryCheckResult`

```ts
export type QueryCheckResult =
  | { readonly outcome: "licensed";
      readonly kind: Query["kind"];
      readonly modelType: ModelTypeId;     // what the question interrogates
      readonly hash: string }              // the system this admission describes
  | { readonly outcome: "refused";
      readonly refusal: Refusal;           // reason, prose, missing, models — the engine's own shape
      readonly alternatives: readonly string[];
      readonly hash: string }
  | { readonly outcome: "malformed";       // parseQuery failed: not a question of any type
      readonly prose: string;
      readonly alternatives: readonly string[] };
```

The refused arm carries the three things the ruling demands. The offending portion is
`refusal.missing` (the engine's existing field: the named relation type, the rejected construct,
the absent distinction). The violated rule is `refusal.reason` — the existing closed
`RefusalReason` vocabulary (`src/engine/types.ts:30`), which already spans both interfaces. The
**permitted alternatives** are the new field, and they are derived from closed vocabularies, never
written per site: an unknown form lists the type's `forms`; an unknown relation type lists the
system's declared relation types; an unlicensed traversal quotes `wouldLicense`; an unknown metric
lists `REQUIREMENT_METRICS`; a missing quantifier lists both quantifiers with their evidence
rules. A refusal that names alternatives from anywhere other than a closed list is a drift site,
and MQ-I2's battery includes one case per `RefusalReason` to keep the derivation honest.

Relation to `LicensedQuestion`, stated exactly: **`QueryCheckResult` is a report derived from the
same admission call; it is not the certificate, and never carries it.** The brand stays
unserializable and internal. A caller cannot present a `licensed` check result to skip the gate —
execution re-admits, structurally. This is the arrangement the seam already chose for the Worker
boundary ("publish the gate's INPUT, never its output", `DESIGN-sparql-261002.md` §8.1), applied
to the agent boundary.

### 5.4 Where it lands

`workspace.check(raw)` on the facade (`src/app/services.ts`), `window.mage.check(raw)` on the
agent API. It is a **new capability row**, `check-query`: it answers a different question than
`query` and returns a shape no other capability produces — the `explore-space` precedent
(`src/app/capabilities.ts:288`). Its human affordance: a *Check* control beside *Ask* in the
Advanced query surface, same service, declared `absent` with a note until the shell wave wires it
(the house pattern: an accurate violation over a comfortable number). UX-I1 will therefore report
`check-query` until that wave lands; that is the registry doing its job.

## 6. `validate(model)` — the operation, and the authority ruling

### 6.1 The gap, confirmed at the registry itself

The rule set exists (`src/validator/rules.ts:1025`) and runs inside `load` and `transact`
(`src/app/services.ts:204,242`; relayed at `src/app/agent-api.ts:499,540` — the ruling's cites at
`agent-api.ts:400,478` have drifted). There is no on-demand call: an agent that wants to know
whether the current model is well formed must mutate or reload it. The capability registry
records the gap in its own terms — the `validate` row's machine affordance is
`window.mage.context.findings` (`src/app/capabilities.ts:216`), a SNAPSHOT of the last
load/transact rather than an operation. An agent reading it after another client's edits reads
stale findings and cannot tell.

### 6.2 The operation

`workspace.validate()` on the facade; `window.mage.validate()` on the agent API. It recomputes
from the current system — the V18 discipline for derived state, the same reason `properties()`
recomputes (`src/app/agent-api.ts:84`). The `validate` capability row re-points its machine
affordance to `window.mage.validate`; `context().findings` survives as what it honestly is, the
last transition's findings, and its doc-comment says so. The human affordance (the findings list
+ the shell's status chip) is unchanged — the human side never had the gap.

### 6.3 Authority: `rules.ts` decides; `validate.py` stays the cross-check

**The TypeScript implementation is authoritative for the operation's result.** It is the one
wired into the live workspace, the transaction pipeline, and the agent API; the operation is a
new CONSUMER of it, not a third implementation. `validate.py` keeps exactly the role it has: the
independent second implementation held to the first by `test/parity.test.ts`'s declared `PARITY`
and `ASYMMETRIC` sets (`test/parity.test.ts:40,66`), and the no-page validation path. The
operation never consults it. The rule that keeps parity two-party: **any semantic enrichment of
findings lands in `rules.ts` and enters the parity comparison only when `validate.py` implements
it too**; until then the enrichment fields (§6.4) sit outside the compared surface, which remains
(rule, where) agreement plus the answers sweep. §G3 asks the author to ratify this split.

### 6.4 `ValidationResult`, actionable

```ts
export interface ValidationResult {
  readonly ok: boolean;                       // no error-severity findings
  readonly hash: string;                      // the revision this result describes
  readonly findings: readonly ValidationFinding[];
}

export interface ValidationFinding {
  readonly rule: string;                      // "V12" — the shared spec identifier
  readonly severity: "error" | "warning";
  readonly where: string;                     // the dotted address rules.ts already writes
  /** The declared ids the finding is about — structured, so an agent selects rather than parses. */
  readonly subjects: readonly string[];
  readonly message: string;                   // the repair-sufficient sentence, as today
  readonly spec: string;                      // the SEMANTICS.md section the rule id joins to
}
```

Three fields are new, and each has a derivation rather than a second author:

- **`severity`** comes from a closed rule→severity table in `rules.ts`, total over every emitted
  rule id (MQ-I9 pins totality). Every current V-rule is `error`; the vocabulary exists because
  the ruling names severity and because the first advisory rule should not force a schema change.
  §G4 asks whether the author wants the field at all yet.
- **`subjects`** is populated by each rung as it fires — the `Collector` (`rules.ts:40`) grows an
  optional subjects argument. It is never parsed out of `where` or `message`: deriving structure
  from prose is the move this repo bans. Migration: rungs not yet draining report `[]`, and a
  test holds the drained set so coverage only grows.
- **`spec`** is derived from the rule id against the SEMANTICS.md section map — the same
  join-by-identifier that makes the parity test meaningful (`rules.ts:4-7`).

`ok` is derived (`findings.every(f => f.severity !== "error")`), never stored.

## 7. Registry consequences — the capability map, and the fence

### 7.1 `model-query` is not a new capability; `query` is extended

The ruling left open whether `model-query` stands beside `query` or extends it. Ruled: **extend.**
The model query interface and today's `query` capability resolve to the same service
(`workspace.query`) and the same semantics; a second row would report a capability the product
did not gain — the test the registry already applies (`src/app/capabilities.ts:296-304`). The
changes to the map:

| Capability | Change |
|---|---|
| `query` | gains the `window.mage.model.*` facade methods as machine affordances (§2.3); gains `elements`; **loses `window.mage.sparql`** (§7.2) |
| `check-query` | NEW row (§5.4) |
| `validate` | machine affordance re-pointed to `window.mage.validate` (§6.2) |

### 7.2 The escape hatch, declared where the registry can see it

`window.mage.sparql` is registered today as a third machine affordance of `query`
(`src/app/capabilities.ts:269`, with a long rationale implementing Q9's first reading —
`DESIGN-sparql-261002.md` §6 Q9). The ruling reverses that reading; the registration is now
wrong, and the fix is typed, not prose:

```ts
/** A surface that exists for debugging and development, OUTSIDE the semantic interface. */
export interface EscapeHatch {
  readonly at: string;                        // "window.mage.debug.sparql"
  readonly reason: string;                    // why it exists at all
  /** The ruling that fences it. A hatch with no fence citation fails the registry test. */
  readonly fencedBy: string;                  // "DECISIONS-RULED-model-query-261002.md"
}

export const ESCAPE_HATCHES: readonly EscapeHatch[] = [
  { at: "window.mage.debug.sparql",
    reason: "raw SPARQL over the RDF projection, for debugging the projection and the seam",
    fencedBy: "DECISIONS-RULED-model-query-261002.md" },
];
```

Consequences, each mechanical:

- **The method moves to `window.mage.debug.sparql`** — the namespace makes the status legible at
  every call site, which is the cheapest fence that cannot rot. Breaking change;
  `AGENT_API_VERSION` bumps to 0.3.0 (`src/app/agent-api.ts:38`). §G2 asks the author to ratify
  the rename. The wiring beneath is untouched: it still delegates to `workspace.sparql`
  (`src/app/services.ts:396`), whose internal gate (`translate` → `admit`) keeps enforcing
  metamodel licensing — the hatch is outside the semantic interface, not outside the gate.
- **`checkRegistryClosure` consumes both lists** (`src/app/capabilities.ts:625`): a machine site
  must be registered to a capability OR declared a hatch; a site in both lists is a violation
  (disjointness); a hatch owes no human affordance — UX-I1 does not govern it, which is exactly
  what "outside the semantic interface" means, now as a checked property rather than a sentence.
- **`describe()` stops advertising it.** `operations` derives from `CAPABILITIES` and loses the
  row automatically; a new `describe().outsideSemanticInterface` field names each hatch with its
  reason and fence, so an agent learns the boundary from the API rather than from a refusal
  (the FR-AGENT-2 pattern).
- **`analysis.resolveExhausted` stays a `query` affordance.** Its handle is obtainable only from
  an exhausted answer (`src/app/services.ts:467`), so once the hatch is the only SPARQL producer,
  escalation is reachable only downstream of a deliberate hatch use — no separate fencing needed.

### 7.3 What verifies "normal agent workflows do not depend on it"

The ruling's second obligation is a usage claim no type can hold. The checks, each cheap:

1. **Shipped artifacts.** A node test asserts every shipped example's saved questions and the
   ask catalogue's suggested/contextual questions are typed query documents (they validate against
   `mage-query.schema.json`) — none is SPARQL text. Structurally true today; the test keeps it so.
2. **The API's own description.** `describe().operations` contains no hatch site (MQ-I4's second
   clause) — so no agent following the API's self-description can land on the hatch.
3. **Reference closure.** A node test walks the source tree and asserts `workspace.sparql` /
   `debug.sparql` are referenced only from `src/app/agent-api.ts`, `src/app/services.ts`, the
   worker plumbing, and `test/`. A UI surface or example generator that grows a dependency on the
   hatch turns the gate red. (A grep-level check is acceptable here because it checks USAGE, not
   semantics — the semantics are held by the types above.)

## 8. The falsification test, worked

*If adding a new model type requires hand-writing unrelated SPARQL throughout the Workbench, the
abstraction has failed.* Worked for a hypothetical fourth kernel type — an **allocation model**
(entities allocated to deployment nodes; questions: "where does X run", "what shares a node with
X"), with its own substrate section, query kind, and form vocabulary. Every file that changes:

| # | File | Why it changes | Contains SPARQL? |
|---|---|---|---|
| 1 | `src/ir/types.ts` + `src/ir/canonicalize.ts` | the substrate — structural semantics | no |
| 2 | `mage-model.schema.json` | the authored wire shape | no |
| 3 | `SEMANTICS.md` | normative semantics | no |
| 4 | `src/engine/model-types.ts` | THE registry entry: structural + query + validation attachment, `presentIn`, `wouldLicense` | no |
| 5 | `src/engine/types.ts` | the new form array, the `Query` union arm, its parser | no |
| 6 | `src/engine/allocation.ts` (new) | `admitTyped` + the evaluator for the kind | no |
| 7 | `mage-query.schema.json` | the published query kind (held by the engine-forms parity test) | no |
| 8 | `src/validator/rules.ts` + `validate.py` | the type's validation rules, both sides + parity sets | no |
| 9 | `src/rdf/project.ts` | projecting the new substrate into the dataset | no — term emission, zero query text |
| 10 | tests | pins for all of the above | no |

**SPARQL sites that change: zero.** The one RDF-adjacent change (#9) is the projection — the
implementation layer beneath the boundary, which is where the ruling says RDF work belongs. If the
new type's questions should ALSO be expressible through the debug hatch, `QUERY_KIND` in
`src/sparql/licensing.ts:252` gains one row and the parse walker a subject derivation — optional,
localized, and still not hand-written query text.

What does NOT change, because it derives: `agent-api.ts` (dispatch is by kind through
`runTypedQuery`), `capabilities.ts` (`query` covers every kind), `learn.ts` (projects the
registry), the refusal substrate (`absentSubstrateVerdict` is registry-worded), the derived
facade and human contextual actions (generated from `QuerySemantics`, MQ-I8).

Two findings about this design, from working the count:

- **Two files on the path have no compile-time forcing:** `mage-query.schema.json` and
  `validate.py`. Both are held by existing parity tests (`test/engine-forms.test.ts`,
  `test/parity.test.ts`) — controls, not compilers. The registry itself IS forced: widening
  `Query["kind"]` without a registry entry fails the registry's 1:1 test and the
  `modelTypeForQueryKind` throw (`src/engine/model-types.ts:184-192`).
- **The ask catalogue is the one site that could silently become a hand-maintained brochure.**
  If the shell's wave 1c hand-lists contextual questions per type instead of deriving them from
  `QuerySemantics.forms`, a fourth type ships with no human questions and nothing goes red.
  Flagged to the shell effort in §9's coordination note; MQ-I8's human half is the pin.

## 9. Invariants

| ID | Statement | Pinned by |
|---|---|---|
| MQ-I1 | Every evaluation is preceded by the same admission the checker reports: the seam by the `LicensedQuestion` brand (`src/sparql/licensing.ts:183`, as-built), the engine path by the evaluator's head calling `admitTyped`. | the brand (compiler) + `evaluate*` being module-private so admission is the only route in (compiler) + `test/engine-check.test.ts`, which asserts each evaluator's answer IS the admission's verdict, object-equal, for every cause on all three kinds. TESTED (M2) |
| MQ-I2 | `check(q)` and execution agree on refusal cause and sentence at the same hash, for every shipped saved question plus a battery with ≥1 case per `RefusalReason`. | `test/engine-check.test.ts` — every shipped example's saved questions plus a per-cause battery; the `malformed` arm's mapping is pinned separately because it is not an identity (§13(4)). TESTED (M2) |
| MQ-I3 | `QuerySemantics.forms` / `.composing` are the engine's own arrays by identity, per type. | the registry identity tests in `test/model-types.test.ts`. TESTED (M1) |
| MQ-I4 | `ESCAPE_HATCHES` and capability affordances are disjoint; every machine site is in exactly one; `describe()` names a hatch ONLY under `outsideSemanticInterface` (amended from §7.3's `operations` clause, which was unfalsifiable — §15(3)). | `checkEscapeHatchFence` inside `checkAffordanceParity` — so the BLOCKING `check:parity` gate holds it (compiler holds `fencedBy`) — plus `checkRegistryClosure` and `test/escape-hatch.test.ts`, whose describe() check blanks the one permitted field and asserts over the rest. TESTED (M4), each arm watched failing |
| MQ-I5 | No shipped example question and no question the ask catalogue OFFERS is SPARQL text — each validates against `mage-query.schema.json`'s own `query` definition, read at test time, AND is admitted by `parseQuery`; hatch CALLS close over one declared file (§15(4)) and the hatch SITE STRING has one author (§15(5)). | `test/escape-hatch.test.ts`. TESTED (M4), each arm watched failing on the real tree |
| MQ-I6 | `validate()` recomputes: its `hash` equals the current system hash, and its findings derive from `rules.ts` alone. | NEW node test: transact, validate, compare hashes; assert no cached path. UNTESTED until M3 |
| MQ-I7 | Adding a model type changes no SPARQL query text (§8's count stays zero). | the §8 enumeration is the audit; partially held by MQ-I8's derivation tests. UNTESTED as a mechanical gate — see §G5-adjacent note in §11 |
| MQ-I8 | Every derived-facade operation and every generated contextual question maps onto a form the loaded types' `QuerySemantics` declares. | NEW derivation test (machine half, M5); the human half rides the shell's path-walking gate. UNTESTED until M5 |
| MQ-I9 | The severity table is total over every rule id `rules.ts` emits. | NEW node test: run the violation corpus, assert every finding's rule has a severity row. UNTESTED until M3 |

## 10. Waves

`src/app/agent-api.ts` is the shared hotspot (M2-M5 all touch it); those waves serialize on it.
`src/ui/` is a live sibling's tree — nothing here touches it; the human halves (Check control,
contextual actions, ask-catalogue derivation) are handed to the shell effort as requirements with
declared G1 paths, not implemented by these waves.

| Wave | Scope | Footprint (exclusive) | Serializes? |
|---|---|---|---|
| M1 | `QuerySemantics` + three declarations; absorb `propertyFamilies`; MQ-I3 | `src/engine/model-types.ts`, `src/app/learn.ts`, `test/model-types.test.ts`, `test/learn.test.ts` | no |
| M2 | `admitTyped` factoring per kind; `check` on facade + agent API; MQ-I1/I2 | `src/engine/{graph,behavior}.ts`, `src/quant/requirement.ts`, `src/engine/index.ts`, `src/app/services.ts`, `src/app/agent-api.ts`, tests | after M1 (reads `QuerySemantics` for alternatives) |
| M3 | `validate()` + `ValidationFinding` enrichment; capability row re-point; MQ-I6/I9 | `src/validator/rules.ts`, `src/app/services.ts`, `src/app/agent-api.ts`, `src/app/capabilities.ts`, tests | after M2 (agent-api hotspot) |
| M4 | `ESCAPE_HATCHES`; `debug.sparql` rename + 0.3.0; closure extension; MQ-I4/I5 | `src/app/capabilities.ts`, `src/app/agent-api.ts`, tests | after M3 (agent-api + capabilities hotspots); needs §G2 ruled |
| M5 | `elements` + the derived facade; MQ-I8 (machine half) | `src/engine/` (elements), `src/app/agent-api.ts`, tests | after M4; needs §G1 ruled |

Every wave lands with `tsc --noEmit` clean AND the full suite — the standing lesson that a clean
merge can type-break a green test tree.

## 11. What the design revealed in the existing code

- **The `validate` capability's machine affordance is a stale snapshot** (§6.1) — the ruling's
  gap, recorded in the registry's own row. The row is honest about its service but not about its
  staleness; M3 fixes both.
- **`capabilities.ts:238-268` argues the position the author reversed.** The `query` row's
  rationale implements Q9's first reading ("SPARQL is a syntax for the query capability") and even
  anticipates this: *"the author still owns Q9's ruling, and if they rule otherwise what changes
  is this row, not the wiring."* Correct prediction; M4 changes that row and rewrites the comment.
  This is a ledger entry in the shell design's sense (`DESIGN-shell-261002.md` §7).
- **`propertyFamilies` is query semantics wearing a Learn field's name** (§3.1). The absorption
  is a rename plus one projection change, and it makes the "one declaration, two affordances"
  requirement literal: the dispatcher, the facade, the contextual actions, and Learn all read one
  field.
- **The engine's admission rungs are interleaved with evaluation per form**
  (`src/engine/graph.ts:431-512`) — the real as-built distance between "the design already
  contains a query checker implicitly" and a callable `check`. The factoring (M2) moves code, not
  decisions; MQ-I2 is the net under the move.
- **The ruling's line cites have drifted** (`eval.ts:6,834` → `:831`; `agent-api.ts:400,478` →
  the findings side effects live in `services.ts:204,242`). Cosmetic, but worth recording: this
  design's own cites are as of branch `wb-mquery-261002`.
- **MQ-I7 has no mechanical gate.** "No SPARQL text outside `src/sparql/` + `test/`" is checkable
  by a reference-closure test like §7.3's, and nothing runs it today. Filed as a follow-up in
  M4's wave rather than invented ad hoc here.

---

## G. Open questions

Five fields per question: Question · Context · Options · Recommendation · Consequence of ruling
otherwise.

### G1 — The agent spelling: derived facade, or typed documents only?

- **Question.** Does the agent surface gain `window.mage.model.*` (`elements`, `related`,
  `reachable`, `path`, `violations`) as thin, derivation-tested constructors over `query()` —
  or does the typed query document stay the only spelling?
- **Context.** Extension 1's worked example names `related(element, DEPENDS_ON, OUTGOING)` as the
  agent affordance. The typed `Query` document already expresses it (`{kind:"graph",
  graph:{form:"direct", relation, from}}`), so the facade is ergonomics plus a visible noun
  vocabulary, not capability. MQ-I8 keeps it derived from `QuerySemantics`, so it cannot offer
  what the kernel refuses.
- **Options.** (a) Ship the facade, registered as additional `query` machine affordances.
  (b) Documents only; the "operation vocabulary" lives in `describe()` and the docs.
- **Recommendation.** (a). The ruling's interface should be nameable by its nouns, and the
  facade is where an agent meets them; (b) leaves the model query interface implicit in a JSON
  shape, which is most of how the current surface came to read as storage-shaped.
- **Consequence of ruling otherwise.** (b) drops M5's facade half; `elements` still lands (it is
  a kernel operation, not sugar); `describe()` carries the noun vocabulary alone.

### G2 — Ratify the `window.mage.debug.sparql` rename

- **Question.** Does the console move to a `debug` namespace (breaking, 0.3.0), or keep its name
  with the fence held by the registry alone?
- **Context.** §7.2. The registry's `ESCAPE_HATCHES` entry is the normative fence either way;
  the rename makes the status legible at call sites and in transcripts, at the cost of breaking
  any existing agent script that calls `window.mage.sparql`.
- **Options.** (a) Rename + version bump. (b) Keep the name; registry-only fencing.
- **Recommendation.** (a). The API versions for exactly this; pre-1.0 is when the rename is
  cheap; and a fence only the registry can see is invisible at the one place dependence forms —
  the call site.
- **Consequence of ruling otherwise.** (b): MQ-I4/I5 hold unchanged, `describe()` still
  declassifies it, and every future reader of an agent transcript must know the registry to know
  the call is a hatch.
- **Status after M4: IMPLEMENTED, PROVISIONAL.** (a) landed behind `SPARQL_HATCH_RENAME`
  (`ratified: false`). M4 confirms the §G2 analysis on one point and sharpens it on another: the
  rename buys legibility and NO enforcement, because every control keys off `ESCAPE_HATCHES[].at`
  — so the (b) reading is cheaper than this question implies. The exact revert surface is §15's
  PROVISIONAL paragraph; no test spells the site.

### G3 — Ratify the validation authority split

- **Question.** Is `rules.ts` authoritative for `validate()`'s result, with `validate.py` the
  CI cross-check that never serves the operation — and enrichment fields outside the parity
  surface until implemented on both sides?
- **Context.** §6.3. The alternative reading — Python authoritative because it is the
  no-page/CI gate — would make the operation's authority a tool the browser cannot run.
- **Options.** (a) As stated. (b) Declare the parity test itself the authority (both sides
  normative, disagreement a spec bug) with the operation serving the TS answer as an
  implementation fact.
- **Recommendation.** (a); it is (b) with one sentence less ambiguity about what an agent was
  served. The parity discipline already treats disagreement as failure either way.
- **Consequence of ruling otherwise.** (b) changes no code — only what a future
  parity-disagreement incident report says the agent's answer WAS.
- **RULED (a), 261004** (`PLAN.md` §0.2a). `VALIDATION_AUTHORITY.ratified` is now `true` and
  `declaredBy` names the ruling; `test/validate-operation.test.ts` pins both. No behaviour moved.

### G4 — Severity now, or when the first warning exists?

- **Question.** Does `ValidationFinding.severity` land now (every current rule `error`), or wait
  for the first advisory rule?
- **Context.** §6.4. The ruling names severity as a required `ValidationResult` element; today's
  rule set has no non-error rule, so the field would be constant at birth.
- **Options.** (a) Land it now, constant, with MQ-I9's totality pin. (b) Defer; add on first use.
- **Recommendation.** (a). The ruling asks for it; a constant field with a totality test is
  cheap; and adding it later is a wire change to a published result shape.
- **Consequence of ruling otherwise.** (b) trims §6.4 and MQ-I9; the first advisory rule pays
  the schema change, and `ok` is `findings.length === 0` until then.

### G5 — Ratify the composition line and its revisit trigger

- **Question.** Is §4.1 the line — closed in-operation grammars, registered cross-type
  compositions, caller-side iteration; no piping, joining, folding, or cross-operation
  quantification — with §4.2's recorded-and-inexpressible-without-the-hatch definition as the
  measured trigger for revisiting?
- **Context.** The ruling names this the design's hardest question and defers a language to
  measured need; §4.2 is this design's proposal for what "measured" means, since an unmeasurable
  trigger never fires.
- **Options.** (a) Ratify both. (b) Ratify the line, define the trigger differently (e.g. a
  count threshold of hatch uses, or author-curated exemplar questions). (c) Widen the line now —
  admit one pipe step (result set as the next operation's element set).
- **Recommendation.** (a). (c) is the first clause of a query language, and nothing shipped
  today needs it; the quantity query's target predicate already covers the one cross-type
  composition in real use.
- **Consequence of ruling otherwise.** (c): the `Query` union gains a composite arm, `check`
  must admit compositions (admission becomes recursive), and the line must be redrawn one step
  further out — the step after a pipe is a join.

---

## 12. As built — M1, and where §3 was wrong

M1 landed `QuerySemantics` and the three concrete declarations. Four things differ from §3, each
because applying the design surfaced a problem the design could not see from the outside. M2 reads
this field for `check`'s alternatives (§5.3), so the shape below is what it will find.

**The landed shape.** `forms` and `composing` as specified, by reference. `licensedBy` as specified.
`subjects` as specified, plus a `declaredBy` citation per subject and a typed `QueryNoun`. Then
`interpretedBy` (new), `primitives` (replacing `derived`), `predicates` (reshaped), `joins` (plus
`with` and `declaredBy`). `derivedPrimitives(query)` computes Extension 1's "transitive or derived
relations" from the classification rather than storing a second list beside it.

**(1) No prose meaning on a primitive — the engine already owns it.** §3.1's `DerivedRelation`
carried `meaning: string`. Each form's plain-language meaning already exists, once, as the engine's
own `interpretation(query)` (`src/engine/graph.ts:626`, `src/engine/behavior.ts:347`) — a switch
TOTAL over the form union by the compiler, and parameterized by the question actually asked, which
is strictly more than a type-level sentence can say. A registry `meaning` would have been a second,
coarser copy of that prose held by a weaker control. `QuerySemantics.interpretedBy` cites it, which
also gives the human and machine affordances one text source rather than two.

**(2) `gate` is typed, not prose.** §3.1's `gate: string` ran to `"none — licensed by V8
independently of V7"`, which serves a human affordance and tells a machine affordance nothing it can
act on. `PrimitiveGate` is now `{ kind: "declared"; by: SchemaAuthority } | { kind:
"by-construction"; why: string }` — so a caller knows whether to go and read the IR at all, and the
declared arm's citation is the type's own `licensedBy` entry BY IDENTITY (shared object, pinned by a
test). The design's stated load-bearing property — every field a reference or a citation — did not
survive its own `DerivedRelation` sketch; this is the repair.

**(3) The classification is TOTAL over `forms`.** §3.1 listed only the derived relations, which
leaves a form absent for two indistinguishable reasons: a decision, or an oversight. Totality makes
a form added to an engine vocabulary with no registry entry fail the build, and it pays twice —
`composing` and the per-instance gates now cross-check, because `GRAPH_COMPOSING` must equal exactly
the forms whose gate is `declared`, and those two facts come from different modules.

**(4) `PredicateSemantics` could not be filled honestly for the quantitative type.** §3.1 specified
one shape: `equality: string` plus `order: { ops, scopedBy }`. A quantitative question chooses no
comparison operator — it decides a magnitude against a declared ceiling — and the evaluator
implements no equality over magnitudes at all. Filling the specified shape would have advertised
four order operators and an `eq` that refuse, which is the brochure failure the registry exists to
prevent. So `equality` is nullable and `order` has two arms, `operator` and `declared-ceiling`.
Generalizing: **§3.1's predicate shape was derived from the two types whose questions share the
guard-op grammar, and the third type's predicates are not its own** — a quantity question borrows
the machine's predicate through the registered join (`QuantityQuery.target`). A design that reads
two of three instances will mint a field the third cannot fill.

**Two smaller corrections to §10's M1 row.** Its footprint named `test/learn.test.ts`, which does
not exist — the Learn derivation tests live in `test/model-types.test.ts` and `test/learn-content.test.ts`
— and it missed `src/learn/main.ts:214`, the one real consumer of the field being renamed. The wave
touched that one line.

**The falsification count holds.** A fourth type still changes §8's ten files and no eleventh: every
vocabulary M1 added (`QueryNoun`, `SubjectSelector`, `AnswerBasis`, `PrimitiveGate`) lives in
`src/engine/model-types.ts`, already file #4, and a fourth type's `interpretedBy` cites its own
evaluator, already file #6. Nothing M1 landed contains SPARQL text. The registry entry is forced
harder than before: the fourth type cannot ship a form it has not classified.

**One flag for the shell effort, sharpening §8's.** `src/ui/shell/askbar.ts:127` derives its
contextual slots from `GRAPH_FORMS` directly — `CONTEXT_SLOT` is total over that array by type, so
it does not rot — but it reads the engine rather than `QuerySemantics.forms`, and it is
structural-graph only. The derivation MQ-I8's human half needs is per loaded TYPE, which means
reading the registry; that re-point is the shell's, not M1's.

---

## 13. As built — M2, and where §5 was wrong

M2 landed `admitGraphQuery` / `admitBehaviorQuery` / `admitQuantityQuery`, `check` on the facade and
on `window.mage`, the `check-query` capability row, and MQ-I1/MQ-I2. The semantics §5 specified
survived; six things about it did not, each because applying the design surfaced a problem it could
not see from outside.

**(1) The admission returns a PLAN, and that is what makes the identity structural.** §5.2 said the
rungs "factor into one exported function per kind, and the evaluator's first act becomes calling
it" — which describes a refusal-or-nothing function and leaves the evaluator free to re-derive the
data it needs. It would then hold a second copy of the resolution logic even with the refusals
hoisted out: the adjacency, the compiled predicate, the resolved ceiling. So the licensed arm
carries a `Plan` — `GraphPlan`, `BehaviorPlan`, `QuantityPlan` — and `evaluateGraph`,
`evaluateBehavior` and `evaluateQuantity` are module-PRIVATE, taking only the plan. The call-graph
identity §5.2 claimed is therefore held by the compiler: there is no route into evaluation that does
not pass through admission, because the only data evaluation can run on is admission's output.

**(2) The plan is the brand's analogue, and dropping it is the seam's rule — not a convenience.**
§5.3 argued at length that `QueryCheckResult` must not carry `LicensedQuestion`, and §5.2 ruled the
engine path needs no brand. Both are right and together they leave a hole: once admission produces a
plan, the plan IS the thing a caller could present to skip the gate. `admitTyped` discards it, and
`check` never sees one. That is the same rule — publish the gate's input, never its output — applied
one layer in from where §5.3 applied it, and the design did not notice it had created a second place
to apply it.

**(3) `check` must not go through `EnginePort`.** §5.4 placed `check` on the facade beside `query`
and said nothing about the route, and `Workspace.query` goes through `EnginePort.graphQuery`. The
port is a SUBSTITUTION seam — the page, four test files and the worker each supply their own — so a
port literal could supply a checker that admits what its evaluator refuses. That is exactly the
second semantics §5 exists to prevent, at the one place it would be invisible. `Workspace.check`
imports the engine's `checkQuery` directly. The pre-existing residue, recorded rather than fixed:
`query` still routes through the port, so a test fake's evaluator could in principle disagree with
`check`. Every port literal in the tree is `runQuery`, so nothing diverges today.

**(4) Check and execute do NOT agree on the cause for a malformed query, and §5.3 implied they
would.** MQ-I2 is stated as agreement "on the same refusal cause and the same sentence", and §5.3
gives `malformed` an arm with no `RefusalReason` — correctly, since a document that parses as no
question has no model type to be refused by. But execution routes a parse failure through
`unlicensed(...)` with no detail, which DEFAULTS the cause to `unknown-vocabulary`. So the sentence
agrees on both paths and the cause does not. MQ-I2's test pins the mapping explicitly instead of
asserting an agreement that is false. A smaller finding behind it: `unknown-vocabulary` is the wrong
cause for "this names no query kind" — nothing was misspelled — but it is the pre-existing wire
behaviour and changing it is a parity question, not M2's.

**(5) `alternatives` needed one new closed vocabulary, and building it removed a copy.** §5.3's
derivation list included "a missing quantifier lists both quantifiers with their evidence rules",
and the evidence rules existed only inside `parseQuery`'s refusal sentence as one blob of prose.
`QUANTIFIER_EVIDENCE` is now the table, `QUANTIFIERS` the array `Quantifier` derives from, and
`parseQuery` builds its sentence from the table — the emitted string is byte-identical, and the
`check` alternatives and the refusal now read one source. The remaining arms needed nothing new:
the by-construction primitives, the registry's `subjects` resolved against the system's own
declarations, the registry filtered by `presentIn`, the form vocabulary, the metric and dimension
tables, and the type's `predicates`. One arm is honestly empty — a `QueryNoun` of `execution` has no
declared names, because an execution is selected by a predicate rather than named.

**(6) §10's M2 footprint named the wrong quantitative file.** The row says
`src/quant/requirement.ts`; the admission rungs are the first ninety lines of `src/quant/query.ts`,
and `requirement.ts` was not touched. Same class of error as §10's M1 row naming a
`test/learn.test.ts` that does not exist.

**Naming, departing from §5.2 deliberately.** §5.2 calls the per-kind function `admitTyped`. Three
modules each exporting `admitTyped` would need aliasing at every import site, so the per-kind
functions are `admitGraphQuery` / `admitBehaviorQuery` / `admitQuantityQuery` — the parallel
`runGraphQuery` / `runTypedQuery` already draws — and `admitTyped` is the kind DISPATCHER, the
function `check` calls.

**UX-I1 reads zero over 26, and `check` has a human affordance — §5.4 was wrong to plan for the
gap.** §5.4 ruled the human half out of scope and predicted UX-I1 would report `check-query` until a
later wave; the row landed that way and a review reversed it. Three things make the reversal right.
The ruling says the human Workbench and the agent interface expose THE SAME semantic capabilities
through different interaction surfaces, so "no person needs this" would have been a claim about users
defended by a claim about scope. `explore-space` had just closed, which changes what its precedent
MEANS: a one-sided capability is closed by building the affordance, not by recording the absence.
And the surface decides it — the ask bar's catalogue offers only questions the loaded models
license, so a check there always says yes, but the **Advanced query form** states a hop limit, two
named endpoints and an explicit quantifier, which are exactly the fields that produce a
quantifier-mismatch or a V7 refusal. A person composing there can write a question the models
decline, and before this they learned it only by running it — getting the sentence and not the
alternatives, which are the half of `check` that justifies its own row.

So the control is `properties-section.check` → `#ask-check-go`, beside Ask, ending at
`workspace.check`. It renders the report in its own host rather than in `#ask-answer`: a verdict with
its grounding and "was this askable at all" are different claims, and overwriting one with the other
would teach that a check is a weak answer. Four browser-tier cases drive it — licensed, refused with
derived alternatives, agreement with `window.mage.check` in one process over one workspace, and the
form's own pre-flight — and all four go red when the control stops painting.

**The threshold is not negotiable from here, and that is new too.** `PARITY_VIOLATION_CEILING` in
`capabilities.ts` is now the single home for the number both the default gate and CI read
(`npm run check:parity`). The baselines in `test/capabilities.test.ts` say WHICH capability is
one-sided and in which direction; they are no longer a second way to pass. Admitting a standing
violation means raising that ceiling, in one place, which raises it for CI in the same edit.

**What M2 did not change.** No answer moved, so `validate.py` parity needed no update: the three
refactors are behaviour-identical (the node tier held at 728 across all three), and `check` adds a
read-only report. The SPARQL seam is untouched — `admit`, the brand, and `evaluate`'s signature are
exactly as M1 left them.

**Gates at the landing tree, counted after rebasing onto main:** `tsc --noEmit` clean ·
`check:parity` `UX-I1: 0 violation(s) over 26 capabilities` · node 760 · smoke 3 · browser 36 ·
a11y 59. Every tier 0 fail, 0 cancelled.

**Three worktree-setup gaps, because each one reads as a product defect.** The browser tiers need
`npm run build` first, a `book/node_modules` symlink (puppeteer), and a ROOT `node_modules` symlink
(axe-core). `git worktree add` makes none of them. Without the first two every browser test fails in
`before` — 0 pass / 3 fail, which looks like a broken page. Without the third, fifteen a11y tests
report **`cancelled`**, and a first pass of this wave reported "54 / 38 pass / 1 fail" and left 15
unaccounted: the hook aborts were in the `cancelled` line, which went unread. A count that does not
add up is the tell, and the honest reading is 41 + 1 + 15 = 57.

---

## 14. As built — M3, and where §6 was wrong

M3 landed `workspace.validate()` / `window.mage.validate()`, `src/validator/result.ts`
(`ValidationRule`, `SEVERITY`, `SPEC_SECTION`, `ValidationFinding`, `ValidationResult`,
`VALIDATION_AUTHORITY`), the `subjects` drain across all sixty rungs, the `validate` capability
row's re-point, and MQ-I6 / MQ-I9. The gap §6 names is real and the operation closes it. Six things
about §6 did not survive applying it.

**(1) `context().findings` is NOT a stale snapshot, and the gap is a different one.** §6.1 says the
`validate` row's machine affordance is "a SNAPSHOT of the last load/transact" and that "an agent
reading it after another client's edits reads stale findings and cannot tell." Read the code:
`Workspace.state` computes `findings: validate(system)` on every access (`services.ts:179`), and
`context()` reads `workspace.state`. So those findings always describe the current revision. The
design diagnosed a staleness bug that does not exist — and the ruling's gap survives the correction
intact, because it was never about freshness. Three things are missing from `context().findings`, and
each is in the ruling's own sentence: it is **not an operation** (a field of another operation's
result, so an agent asks for a context and reads a member), it is **not actionable** (the bare three
wire fields: no severity, no subjects, no spec join), and it **does not say who decided it**. An
agent could always see the findings; it could never ASK, and what it saw was a sentence. Had M3
trusted §6.1, the fix would have been a cache-invalidation that nothing needed.

**(2) The severity table is total by the COMPILER, not by MQ-I9's test.** §6.4 and MQ-I9 plan a node
test that runs a violation corpus and asserts every finding's rule has a severity row — which holds
only for rules the corpus happens to drive, so a rule with no corpus case could ship with no
severity. Narrowing `Collector.add`'s first parameter from `string` to a closed `ValidationRule`
union, and writing both tables as mapped types over it, makes a rule without a row a compile error.
The corpus sweep stayed, demoted to what it honestly is: the net under a future cast. This is M1's
§12(3) lesson applied one module over — totality is cheap when a union is already closed, and a
registry that is total refuses to hide an oversight as a decision.

**(3) `subjects` landed REQUIRED, which means there is no migration.** §6.4 plans "an optional
subjects argument" with rungs "not yet draining" reporting `[]` and a test holding the drained set so
coverage only grows. An optional field cannot distinguish a rung that considered its subjects and
found none from one that never considered them, which is the same defect the `evidence()` nullable
was — so the parameter is required and all **sixty** call sites were drained in one pass. `[]` is now
a statement rather than a default, and no coverage ledger is needed because coverage is total.
(§6.4's prose also says the rungs "grow an optional subjects argument" on `Collector`, which is
`rules.ts:40` — the cite is right; §6.1's `services.ts:204,242` cites are the load/transact
side-effect sites and still land, but the load-time `validate` is `:179` in `get state()`.)

**(4) `subjects` and `where` answer different questions, and the design never said so.** §6.4
describes `subjects` only negatively — "never parsed out of `where` or `message`". Working the rungs
produced the positive statement: `where` is the dotted address of the SITE TO EDIT, `subjects` are
the OBJECTS THE FINDING IS ABOUT, and for several rules they are disjoint. V5 is reported at the
claiming entity and is about the child plus the parent that claimed it first — two ids `where` does
not contain. V13 is reported at the event and is about two machines and a variable the sentence
names, plus the event the sentence does not. Those two cases are now the tests that prove the field
is populated rather than derived: a parse of `where` could not produce V5's set, and a parse of the
message could not produce V13's. A second, smaller finding: a DANGLING reference contributes its name
*as written* (`ghost`, `m.ghost`), which §6.4's "the declared ids" would have excluded — and the
unresolved name is the one id a repair needs.

**(5) The result must SAY who decided it, so it says so in a field.** §6.3 rules the authority split
and §6.4 specifies a result with no place to record it, which leaves the ruling's requirement —
*"A `validate(model)` operation must say which implementation is authoritative for its result"* —
discharged by a design document the agent cannot read. `ValidationResult.authority` carries
`VALIDATION_AUTHORITY`: the implementation, the cross-check and the control that holds it, the
enrichment fields outside the compared surface, `ratified: false`, and the §G3 cite. One constant,
carried by reference, is also the reversibility §G3 needs: moving authority is one edit.

**PROVISIONAL, and what changes if §G3 is ruled the other way.** The operation serves `rules.ts` and
never consults `validate.py`. Under §G3(b) — parity itself normative, the TS answer an implementation
fact — no behaviour changes: `VALIDATION_AUTHORITY` is reworded (`implementation` becomes the serving
side rather than the deciding one, `ratified` flips true) and the test that reads it follows. Under a
reading that made PYTHON authoritative, the operation would need a Python answer in a browser, which
there is no path to — that is the reading §6.3 rejects and the as-built agrees.

**(6) `validate()` had to keep the three wire fields, or three uncompared fields joined the parity
surface by accident.** §6.3 states the rule and §6.4's shape breaks it: if the enriched findings flow
through the existing `validate(s)` used by `load`, `transact` and `state`, they reach
`test/parity.test.ts`'s comparison objects, where `Finding` is the shape `validate.py` emits. So
`validate(s)` narrows to `{rule, where, message}` and `validateModel(s)` publishes the enrichment —
one pass over the rungs, two projections of it. A test asserts the narrowing, and another asserts the
enrichment field set EQUALS `authority.outsideCrossCheck`, so a fourth enrichment cannot be added
without declaring it uncompared.

**`spec` needed a nested read of SEMANTICS.md.** The join test walks the spec's headings and asserts
each cited section exists verbatim AND mentions its rule. A flat heading list reports V27-V31 as
filed under the wrong section, because they are stated under `#### The rules` INSIDE §5.2 — so a
section's body includes its subsections. The allowance for a rule introduced outside its section by a
line citing it by number is what `ANNOTATION` needs: the preamble introduces it as "reports a
malformed note (§5.1)". And the table itself was wrong once: V1 is stated in §1, where `sync:`
syntactic visibility is fixed, not in §2 — found by the test, not by inspection.

**No human affordance was owed, and the reasoning is the opposite of `check`'s.** §5.4's lesson was
that a declared absence is usually work in disguise; this capability is the case where the asymmetry
runs the other way and is still right. The findings table repaints from `state.findings`, which
recomputes, so a person has always SEEN the verdict for the current revision — there is no question a
person can ask that the panel does not already answer. A machine client has no panel, which is why
for it the operation IS the affordance. UX-I1 reads **`0 violation(s) over 26`**.

**What M3 did not change.** `validate.py` needed no edit and no parity-set change: no finding moved,
no message changed, and the three enrichment fields sit outside the compared surface by the rule §6.3
sets. `AGENT_API_VERSION` stays `0.2.0` — the operation is additive and `context().findings` survives
(with a doc-comment that now says what it honestly is); M4 owns the 0.3.0 bump.

**One generated artifact had to be regenerated, and a test caught it.** The capability row's `summary`
changed, and `models/workbench-affordances.mage.yaml` is generated from `CAPABILITIES` and held to it
byte-for-byte (`test/capabilities.test.ts:526`). `npm run affordances`. Worth recording because the
node tier is the only thing that notices.

**Gates at the landing tree:** `tsc --noEmit` clean · `check:parity` `UX-I1: 0 violation(s) over 26
capabilities` · node **802** (785 at the fork + 17) · smoke **3** · browser **36**. Every tier 0 fail,
0 cancelled. The a11y tier was not run: five of its cases are a sibling wave's, being re-pointed after
wave 2c removed the hypothesis radios they drove.

**The worktree-setup gaps §13 recorded are still gaps.** `git worktree add` created no
`workbench/node_modules`, no ROOT `node_modules` and no `book/node_modules`, so the browser and smoke
tiers cannot run until all three symlinks exist and `npm run build` has run. Three for three with
§13's count.

---

## 15. As built — M4, and where §7 was wrong

M4 landed `EscapeHatch` / `FenceCitation` / `ESCAPE_HATCHES` / `SPARQL_HATCH_RENAME`,
`checkEscapeHatchFence`, the hatch list as a second input to `checkRegistryClosure`,
`describe().outsideSemanticInterface`, the `window.mage.debug.sparql` rename with
`AGENT_API_VERSION` 0.3.0, and MQ-I4 / MQ-I5 in `test/escape-hatch.test.ts`. The fence §7 specified
is real and holds. Six things about §7 did not survive applying it.

**(1) `fencedBy: string` would have made the fence forgeable, and the fix is a closed union.** §7.2
types the field `string`, and the sentence beside it — *"a hatch with no fence citation fails the
registry test"* — concedes that a test is what would catch an empty one. `FenceCitation` is a closed
union of ruling filenames instead, so `fencedBy: ""` and `fencedBy: "whatever.md"` are both compile
errors, and a second hatch cannot be declared until a second ruling is added to the union. This is
M3's §14(2) lesson one module over: totality is cheap when the set is already closed. What a test
can still usefully do is the JOIN — a closed union cannot be forged, but a citation to a real
document that says nothing about fencing can be, so the test reads the cited file and asserts it
calls something an escape hatch and says it is *explicitly outside* the semantic interface.

**(2) The fence belongs in the BLOCKING gate, and §7.2 put it only in the closure check.** §7.2
assigns disjointness to `checkRegistryClosure`, which is called by two tests. `check:parity` — the
0-violation gate CI reads — calls `checkAffordanceParity`, and would have stayed green with the
console registered in both lists. That is precisely the `PARITY_VIOLATION_CEILING` incident in
advance: one invariant, two definitions of passing, the weaker one local. So
`checkEscapeHatchFence` is ONE function with two consumers — `checkAffordanceParity` (the gate) and
`checkRegistryClosure` (whose stated invariant is "every machine site is in exactly one list", of
which disjointness is half). Re-registering the hatch as a `query` affordance now reads
`UX-I1: 1 violation(s) over 26 capabilities`, named against the row an author has to edit.

**(3) `describe().operations` never advertised the hatch, so §7.3's second check could not fail.**
§7.2 says *"`operations` derives from `CAPABILITIES` and loses the row automatically"* and §7.3 makes
"`describe().operations` contains no hatch site" check 2. Read the code: `operations` is
`CAPABILITIES.map(c => ({name: c.id, …}))` — one entry per CAPABILITY ID, never a call site. It
named no affordance before this wave and names none now. The clause was true at birth and
unfalsifiable, which is the same defect class as the tier that reported `8 pass / 0 fail` on 27
tests. What an agent can actually be routed by is the whole object, so the landed check serialises
`describe()`, blanks `outsideSemanticInterface`, and asserts no hatch site — and no mention of
SPARQL at all — survives in what is left. That check DOES fail: a `notSupported` entry naming the
site turns it red, and so does the `query` row's old summary, which said *"Run one graph,
behavioural or SPARQL query"* and is now *"…or quantitative model query"*. §7.2 did not notice that
the row's own summary was the one place `describe()` really did advertise the console.

**(4) §7.3's declared file set was wrong about three of its four members.** The reference-closure
check is named over `src/app/agent-api.ts`, `src/app/services.ts`, "the worker plumbing" and
`test/`. Exactly one file CALLS the seam: `agent-api.ts`, which delegates. `services.ts` *defines*
`Workspace.sparql` and never calls it — a different relation, and not an allowance a closure check
should grant, because granting it would license a future internal self-call. `src/analysis.worker.ts`
and `src/sparql/worker-eval.ts` contain no reference to the seam at all: the escalation path carries
a `TranslatedQuery` off an exhausted answer and the worker admits it again on its own thread. Three
allowances for nothing, each of which would have hidden a real dependency the day that file grew
one. The REVERSE direction of the check is what found them — the same shape as
`WIRED_WITHOUT_A_WALKED_PATH`'s drained-list rejection, and the reason it is asserted rather than
assumed.

**(5) One check §7.3 did not ask for, because the closure it specified has a hole.** A grep for
calls catches a module that *invokes* the hatch. It does not catch a module that hand-types the
site: a doc page offering the string, a palette entry naming it, a second affordance list
re-declaring it. So there is a second closure — the site string `window.mage.debug.sparql` is
authored in `capabilities.ts` and nowhere else across `src/`, `scripts/`, `index.html`, `examples/`
and `models/`. Everything else learns the string from `describe()`. This is also what keeps §G2
cheap: no consumer spells it, so renaming it again touches one line.

**(6) `query` keeps three machine affordances, and `resolveExhausted`'s asymmetry got NARROWER.**
§7.2 predicts `resolveExhausted` needs no separate fencing because the hatch becomes the only SPARQL
producer. True, and the direction is worth stating positively: its handle is obtainable only from an
`exhausted` answer, so escalation is now reachable only *downstream of a deliberate hatch use*. It
is less exposed after the fence than before it, not merely no more exposed.

**PROVISIONAL, and what changes if §G2 is declined.** The rename landed with `AGENT_API_VERSION`
reading `SPARQL_HATCH_RENAME.apiVersion`, so the version constant and the site string are one
record carrying `ratified: false` and the §G2 cite. **The fence does not depend on the rename.**
Every control keys off `ESCAPE_HATCHES[].at`: the disjointness check, the closure check,
`describe().outsideSemanticInterface`, both reference closures, and every test (no test spells the
site — they read it from the declaration, which is rule-42 discipline doing double duty as a
reversibility budget). Declining §G2 therefore reverts: `at` and `apiVersion` in
`SPARQL_HATCH_RENAME`, the `debug: DebugApi` member on `MageAgentApi` and its one-line delegation in
`createAgentApi`, and three call sites in `test/services.test.ts`. Nothing about the fence's teeth
moves. Taking the rename buys legibility at the call site and in agent transcripts; it buys no
enforcement.

**Every obligation-2 check was watched failing, on the real tree.** The in-test negative controls
are permanent, but they assert against literals, so each check was also sabotaged live and reverted:
a shipped example's saved question given a `sparql:` key (checks (a) red — both the saved-question
sweep and the catalogue sweep, because the catalogue offers saved questions too); a `notSupported`
entry naming the site (check (b) red, plus the site-authorship closure); a `.sparql(` call added to
`src/ui/shell/askbar.ts` (check (c) red, and the site-authorship check correctly stayed green — it
is a different hole); and the hatch re-registered on the `query` row, which is the pre-wave state
(`check:parity` red at 1/26, plus three node tests).

**The test that pinned the superseded ruling had to be inverted, not deleted.** `test/services.test.ts`
held *"Q9: SPARQL and the budget escalation are spellings of `query`"*, which asserted
`window.mage.sparql` was a declared machine affordance. A test defending a reversed ruling is worse
than no test, so it is now *"Q9 AS RULED"* and sweeps the WHOLE registry for a SPARQL affordance
rather than every row but `query` — the assertion the old reading could not make — plus the hatch
declaration and the summary. The comment records that it used to say the opposite.

**What M4 did not change.** `workspace.sparql` is untouched: same signature, same budget, same
`translate` → `admit` gate. The hatch is outside the semantic interface, not outside the gate.
`validate.py` needed no edit (no finding moved) and no human affordance was owed — the console has
no human surface and never had one, so the a11y tier's 43 declared routes are unchanged. SH-I8 is
respected trivially: no wired human site was added.

**Gates at the landing tree:** `tsc --noEmit` clean · `check:parity`
`UX-I1: 0 violation(s) over 26 capabilities` (exit 0) · node **811** (803 at the fork + 8) · smoke
**3** · browser **36** · a11y **111**. Every tier 0 fail, 0 cancelled, 0 skipped.

**The worktree-setup gaps are a gap no longer, because the orchestrator pre-made them.** All three
symlinks (`workbench/node_modules`, root, `book/`) existed at fork. §13 and §14 recorded them as
`git worktree add` omissions twice; the third wave got them by hand. The defect is unfixed — it has
just been routed around a third time.
