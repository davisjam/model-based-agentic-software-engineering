# RULED — Q9: arbitrary SPARQL is not a semantic capability; a model query interface is

The author ruled Q9 on 261002. The ruling is **No** on the question as posed, and it obliges an
architecture rather than merely forbidding one — the author's own framing: *"'No' creates work: we
now owe the architecture a model query interface. Otherwise we have merely prohibited SPARQL without
supplying the mechanism by which agents ask nontrivial questions of models."*

This file records the ruling and what it binds. The design is [`DESIGN-model-query-261002.md`]
(commissioned separately); this document is the authority that design answers to.

---

## The ruling

> **"Run arbitrary SPARQL" should not be a semantic capability under UX-I1, and arbitrary SPARQL
> should not be the normal query interface for either humans or agents.**

In its place, a **model query interface**: operations whose semantics are defined over the MAGE
metamodel. The author's examples — finding elements of a given type, following a particular
relationship, computing reachability, tracing between model elements, identifying violations of a
model constraint. **Humans and agents normally query models through these model-semantic operations.**

### The architecture it fixes

```
Human or agent  →  model query interface  →  metamodel semantics  →  SPARQL  →  RDF
```

**SPARQL and RDF remain implementation mechanisms for querying and storing the model. They do not
define the public semantics of the model.** The interface's implementation MAY compile its operations
to SPARQL over the RDF representation; that is an internal choice, not a contract.

### Why the boundary is load-bearing

The author's reasoning, which is the part to carry into every subsequent decision:

> A syntactically valid SPARQL query can ask questions permitted by the RDF representation that are
> not meaningful under the MAGE metamodel, UML semantics, or the semantics of a particular model
> type. Allowing agents to depend routinely on arbitrary SPARQL would therefore let them bypass the
> model abstraction and couple their reasoning to its storage representation.

**Design principle: agents reason over models, not over their storage representation.**

Note how this generalizes a defect class this project has already paid for. A `latency` query over a
system declaring no quantities once answered `holds` with magnitude `0 ms` — a figure that *looked
measured* because nothing checked whether the question was meaningful for the substrate present
(`DECISIONS-RULED-model-types-261002.md` Ruling 3). Arbitrary SPARQL is that hazard with the guard
rail removed by design: the RDF layer will happily answer a shape the metamodel does not license.

### No new query language — yet

> The model query interface need not introduce a new textual query language. **Prefer typed API/tool
> operations initially.** A dedicated query language should be introduced only if we later find that
> users or agents need substantially more expressive composition than the typed operations provide.

So the v1 surface is typed operations, and the trigger for revisiting is **measured** need for
composition, not anticipated need.

### Both interfaces, one set of operations

> The model query interface is consequently a first-class Workbench capability and must be carried
> into the design. Human UX should expose useful model queries through appropriate interactive
> affordances; agent UX should expose the same underlying semantic operations as typed tools/API
> calls.

This is UX-I1's parity requirement applied to the new capability — and under the **G1** reading
ratified the same day, the human affordance for each operation must declare a navigation path from
the default workspace that something machine-walks. A model query operation with no reachable human
route is a UX-I1 violation, not a convenience gap.

### The escape hatch, explicitly fenced

> A raw SPARQL console may still exist as an advanced, debugging, or development escape hatch. If
> retained, it should be **explicitly outside** the normal UX-I1 semantic interface and should **not
> become an interface on which normal agent workflows depend.**

Two obligations follow, and they are the ones most likely to rot:

1. The console's exclusion must be **declared where the registry can see it**, not merely asserted in
   prose. UX-I1 is now a blocking, compiler-backed check (`BASELINE-a11y-261002.md` §8 F-3); an
   "outside the semantic interface" that lives only in a sentence is the class of claim this project
   has repeatedly found to be unenforced.
2. "Normal agent workflows do not depend on it" is a claim about *usage*, which no type can hold. If
   it is to mean anything it needs a check — at minimum, the shipped examples and saved questions
   must not route through it, and that should be verifiable rather than reviewed.

---

## What this ruling finds already built, and what it renames

The ruling partly ratifies existing substrate and partly reclassifies it. A design must start from
what is there rather than from a blank page:

- **`window.mage.query()` / `ask()` are already model-semantic**, typed over saved questions and
  returning typed outcomes. They are the seed of the interface, not a thing to replace.
- **The typed form vocabularies are the operation inventory's substrate** — `GRAPH_FORMS`,
  `BEHAVIOR_FORMS`, `REQUIREMENT_METRICS`, plus the model-type registry in
  `src/engine/model-types.ts` that says which types a loaded system actually has.
- **`window.mage.sparql(text, budget)` is registered today as a machine affordance of the `query`
  capability** (`src/app/agent-api.ts:66`, and the registry entry says so). Under this ruling that
  registration is wrong: it makes arbitrary SPARQL part of the semantic interface. It becomes the
  fenced escape hatch instead, and the registry must say which.
- **The SPARQL seam's refusal vocabulary already enforces metamodel licensing** on the questions it
  accepts (`src/sparql/refusal.ts` distinguishes unlicensed-by-model, outside-supported-subset, and
  not-expressible-as-relational; `src/engine/omission.ts` holds the undeclared-name rungs). That
  machinery is evidence the boundary is enforceable — it is the compile target behaving as the ruling
  prescribes, under a seam rather than under a public SPARQL surface.

---

## Open, for the commissioned design

Not ruled here; the design must answer them and surface any that need the author:

- The operation inventory. The author named five shapes by example — elements of a type, following a
  relationship, reachability, tracing, constraint violations — and the inventory must be **derived
  from what the kernel can answer**, not enumerated by hand, or it will offer operations that refuse.
- Composition without a language. Typed operations that cannot compose at all will drive users to the
  escape hatch, which is precisely the dependency the ruling forbids; typed operations that compose
  arbitrarily have become a query language by accident. Where the line sits is the design's hardest
  question.
- Whether the existing `query`/`ask` capability is extended or whether `model-query` is a new
  capability beside it — a registry question with UX-I1 consequences either way.
- What verifies "normal agent workflows do not depend on the console" (obligation 2 above).

---

## The tradition this sits in — MBSE, and the separation it already keeps

The author's framing, which fixes where the vocabulary comes from:

> Think of this in the tradition of systems modeling and MBSE. A user working with a UML or SysML
> model thinks in terms of components, requirements, interfaces, dependencies, allocations,
> behaviors, constraints, and relationships among those things. They do not normally formulate
> questions in terms of the representation used by the modeling repository. MAGE should preserve the
> same separation: **the query vocabulary should arise from the model and its metamodel, not from
> RDF.**

This is not an analogy; it is the genre. A SysML user asks *which components satisfy this
requirement*, *what does this interface depend on*, *where is this behavior allocated* — never *what
triples name this element*. The repository's representation (XMI, a CDO store, an EMF resource) is an
implementation fact they are entitled never to learn. RDF occupies exactly that position here.

Two consequences for the design:

- **The operation names come from the metamodel's own vocabulary.** MAGE's metamodel has entities,
  relation types with declared absence semantics, models with purposes, machines with states and
  transitions, quantities with accounting bases, properties and requirements. Those are the nouns a
  query vocabulary is built from. A name that only makes sense once you know there is a triple store
  underneath has failed the ruling.
- **A genre check is owed before inventing anything** (the repo's standing rule: identify the genre,
  name the canonical best-in-class, and ask whether their schema can be adopted even where their
  runtime is overkill). The MBSE genre has prior art for exactly this problem — **OCL** over UML/MOF
  is the canonical model-query-and-constraint language defined against a metamodel rather than a
  store, with a worked vocabulary for navigating association ends, collecting instances of a type,
  transitive closure, and expressing invariants; **QVT** and the Eclipse OCL / Papyrus / Capella
  tooling are the adjacent implementations. The ruling defers a *textual language*, so OCL is not
  being adopted as a syntax — but its **operation vocabulary and the constraints it learned the hard
  way** are available at naming-convention cost, and a design that re-derives them from scratch has
  skipped the cheapest available review. Say explicitly what was taken and what was deliberately not.

---

## Extension 1 — a model type carries its QUERY SEMANTICS, not just its structure

> **Metamodel consequence.** Model types should carry their query semantics as part of their
> definition. Queryability should not be inferred merely from whatever RDF triples happen to encode
> an instance.
>
> For each model type, the metamodel should be able to declare at least: which element types and
> properties are queryable; which relationships may be traversed, and in which directions; which
> predicates or comparisons are meaningful for attributes; which transitive or derived relations are
> semantically defined; which constraints can be evaluated as queries; which cross-model traces or
> joins are meaningful; which standard query operations the model type supports.
>
> This should be understood as part of the semantics of a model type, analogous to the way a
> systems-modeling metamodel defines the kinds of elements and relationships that may exist. The
> metamodel should tell the Workbench not only what can be represented, but also **what questions can
> meaningfully be asked of what is represented.**

**Not UI flags.** The author is explicit: *"Do not make this a collection of ad hoc UI flags such as
`searchable: true`. Prefer a typed queryability description from which both human and agent
affordances can be derived."* The worked example is the test of whether a declaration is rich enough:
declaring a relationship as a queryable directed relation should enable **both** a Workbench action
like *Show dependencies* **and** an agent operation like `related(element, DEPENDS_ON, OUTGOING)` —
one declaration, two affordances, derived rather than written twice.

```
model type definition
  → structural semantics + query semantics
    → model query interface
      → human and agent affordances
        → SPARQL execution over RDF
```

### The nuance that keeps this from becoming a disaster

> I would not make every permissible query an attribute of the model type. That will become a
> horrible declarative query-language-in-YAML. The metamodel should carry the **semantic primitives**
> from which legitimate queries can be composed. That's the MBSE-like move: define what `satisfies`,
> `allocatedTo`, `dependsOn`, containment, traceability etc. MEAN; the query layer composes questions
> over those declared semantics.

So the model type declares **meanings**, and the query layer composes **questions**. A model type
enumerating its permitted queries has mistaken itself for the query layer.

### The falsification test

> If adding a new model type requires hand-writing unrelated SPARQL throughout the Workbench, the
> abstraction has failed.

This is the design's acceptance criterion and it is mechanically checkable: add a model type, count
the SPARQL sites that had to change. The answer should be zero.

---

## Extension 2 — three operations, and they answer different questions

> Agents must be able to validate both the model and a proposed model query directly. They should not
> reproduce either form of semantic checking themselves.

| Operation | Question | Shape |
|---|---|---|
| **Model validation** | Is this model well formed according to its model type? | `validate(model) → ValidationResult` |
| **Query checking** | Is this a meaningful and permitted question for this model type? | `check(query, model_type) → QueryCheckResult` |
| **Query execution** | What answer does this model give to that question? | the model query interface above |

**Model validation.** Defined by the model type and its metamodel, which therefore carries its
**validation semantics**: required structure, cardinalities, typing rules, permitted relationships,
constraints, and model-type-specific well-formedness conditions. `ValidationResult` must identify the
violated rule, the affected model elements, severity, and evidence *sufficient for a human or an agent
to inspect and repair the problem* — actionable, not a verdict.

**Query checking.** *"A query being executable against the RDF representation does not imply that it
is a meaningful model query."* `check` determines whether a proposed query is well formed under the
model query interface and licensed by the type's declared query semantics — referenced element and
relationship types, permitted traversal and composition, directionality, predicates, cross-model
operations, and type-specific restrictions. `QueryCheckResult` must, on rejection, identify **the
offending portion of the query, the violated semantic rule, and where possible the permitted
alternatives**, so an agent can revise rather than merely learn that it failed.

The sanctioned flow:

```
construct query → check query → execute query → return result + evidence
```

> **The checker and executor must share one semantics.** A query accepted by the checker must not
> subsequently acquire different meaning in the SPARQL/RDF execution layer.

### Three classes of semantics per model type

- **structural semantics** — what can be represented
- **query semantics** — what questions can meaningfully be asked
- **validation semantics** — what constitutes a well-formed model

Human Workbench and agent interface expose these same capabilities through different interaction
surfaces. SPARQL stays an implementation mechanism beneath the boundary, never the authority on
whether a model question is meaningful.

---

## What is already built, verified 261002 — and it is more than the ruling assumes

The author's read was that *"the existing design already contains a query checker implicitly. We're
making it an explicit, agent-accessible semantic operation."* That is correct, and the existing form
is stronger than "implicit" suggests:

- **The checker/executor single-semantics requirement is ALREADY HELD BY THE COMPILER.** `admit`
  produces a `LicensedQuestion`, a branded type, and `evaluate` accepts *only* that type
  (`src/sparql/eval.ts:6,834`; `src/sparql/index.ts:13`). A question the checker did not admit
  **cannot reach the executor at all** — not by discipline, by type. So `check` is not a new gate to
  build; it is an existing structural gate to **name, expose, and give a structured result**. The
  design must not weaken this: any agent-facing `check` must return the same admission the executor
  consumes, or the two semantics fork at exactly the seam the ruling exists to protect.
- **This is the V7 case the author cited.** RDF cannot know that `composition.path` is forbidden, so
  the gate is driven from the IR rather than from the representation — which is the ruling's whole
  architecture, already load-bearing at one seam.
- **Validation exists but is NOT an operation.** `src/validator/rules.ts` holds the rule set, and
  findings are returned as a *side effect* of `load` and `transact` (`src/app/agent-api.ts:400,478`).
  There is no `validate(model)` an agent can call on demand, so an agent that wants to know whether a
  model is well formed must mutate or reload it to find out. That is the gap the ruling names, and it
  is a real one.
- **`validate.py` is a second implementation** of the rule set, held to the TypeScript by an explicit
  parity test with declared `PARITY` and `ASYMMETRIC` sets. A `validate(model)` operation must say
  which implementation is authoritative for its result, or the parity discipline acquires a third
  party silently.
