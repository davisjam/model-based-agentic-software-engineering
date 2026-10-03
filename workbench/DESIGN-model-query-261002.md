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
