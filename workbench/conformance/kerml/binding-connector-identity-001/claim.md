# kerml/binding-connector-identity-001

**MAGE construct** — the `appears-in` binding: one entity id listed by two purposeful models'
`entities:` memberships (`models[].entities`, read against the system's one entity namespace).

**Registry row** — `BINDINGS` `appears-in`, `semanticBasis` `KERML_BINDING_BASIS`,
`kind: "borrowed"`, `standard: "KerML"` (`src/engine/model-types.ts`). All three binding rows share
that one basis object, so this fixture discharges the `binding` row of §35.4.

**Standard concept** — a BindingConnector: a binary Connector that requires its `relatedFeatures`
to identify the same things.

## Which binding this pins, and why it is not `machine-of-entity`

§2 of `DECISIONS-RULED-authored-constructs-261004.md` specifies the fixture as built from
*"a machine's `entity:` key, for machine-of-entity … with the pinned interpretation being that the
two ends denote the same thing."* **That interpretation is not available for that row, and this
fixture pins `appears-in` instead.** The argument, because a substitution against a ruling owes one:

- `machine-of-entity`'s own `interpretation` in the registry reads *"this behavioural model
  **describes** this structural entity"* — a machine and the entity whose behaviour it describes are
  two things, not one.
- The RDF vocabulary says so where the correspondence is projected:
  `MAGE.describes` is commented *"Machine to the entity whose behavior it describes. **Optional
  correspondence, not identity.**"* (`src/rdf/vocabulary.ts`).
- Nothing in MAGE identifies a machine with its entity. A behavioural query names `<machine>.state`,
  never `<entity>.state`, so the two are not interchangeable at any seam.

Identity is not an optional part of a BindingConnector; it *is* the BindingConnector, declared by
the `checkBindingConnectorSpecialization` constraint that forces specialization of
`Links::selfLinks` (source.kerml A1). Pinning `machine-of-entity` against it would assert an
identity MAGE does not claim — the over-attribution §35.3 forbids.

`appears-in` is the row whose correspondence *is* that assertion: *"entity ids inhabit ONE namespace
per system, so two purposeful models naming the same id name the same entity."* It is also built
from a field the author already writes — a model's `entities:` list, which is the witness the
ruling's own table gives it (`shared-membership`) — so the ruling's governing principle holds
unchanged. Only its choice of row moves. Per §35.6 this pins ONE binding and says nothing about the
other two or about completeness.

## The specification, quoted

KerML 1.0, OMG Document Number **formal/26-03-01** (March 2026), clause **8.3.4.5.2 Binding
Connector** (page 185), Description:

> A `BindingConnector` is a binary `Connector` that requires its `relatedFeatures` to identify the
> same things (have the same values).

Clause **8.4.4.6.2 Binding Connectors** (page 262) — the decisive sentence, and it is a sentence:

> The `checkBindingConnectorSpecialization` constraint requires that `BindingConnector`s specialize
> the `Feature` `Links::selfLinks` (see 9.2.3.2.6 ), which is typed by the `Association` `SelfLink`
> (see 9.2.3.2.5 ). `SelfLink` has two `associationEnd`s that subset each other, meaning they
> identify the same things (have the same values) …

And the Kernel Semantic Library, `Links.kerml` lines 32-41, on how that identity is declared:

> `end feature thisThing: Anything redefines source subsets sameThing crosses sameThing.self;`
> `end self2 [1] feature sameThing: Anything redefines target subsets thisThing;`

The declared half appears in OMG's normative machine-readable artifacts: the two `ownedRule`
constraints of `Kernel-Connectors-BindingConnector` in `KerML.xmi` —
`relatedFeature->size() = 2` and `specializesFromLibrary('Links::selfLinks')` — and the `SelfLink`
declaration in `Links.kerml` inside `Semantic-Library.kpar`. `source.kerml` Part A quotes all of
them with their locations.

## The ONE interpretation this fixture pins

> **One entity id denotes one entity across every purposeful model that lists it, so two models'
> edge sets meet at a shared id and a question answered over the system crosses the junction.**

Operationally, in `model.mage.yaml`: `upstream` declares `alpha → shared`, `downstream` declares
`shared → omega`, and no model declares both edges. The only thing joining them is the spelling of
the id in the middle.

| query | verdict | why |
|---|---|---|
| `handoff-spans-the-two-models` — reachability over `conveys`, `alpha` to `omega` | `holds` | the two models' edges compose, because both `shared`s are one entity |
| `handoff-does-not-reach-the-unconnected-entity` — same form, target `isolated` | `refuted` | the negative control: `reachability` discriminates rather than answering `holds` to everything |
| `handoff-reaches-its-own-model-target` — same form, target `shared` | `holds` | the positive control, inside one model, which must survive the mutation |

**What would be false if the construct meant something else.** Read an entity id as model-local — a
label scoped to the document that wrote it — and `upstream` and `downstream` are two disjoint
graphs; the first query then answers `refuted`. The pinned triple is therefore not satisfiable by
both readings. The conformance test adds the converse: retargeting the `downstream` edge's source
from `shared` to `isolated` — a declared entity, so no declaration is added and no other line moves
— must flip the first query to `refuted` while the third holds still. That is what shows the verdict
tracks the shared denotation rather than the number of edges.

## What this fixture does NOT establish

- **It does not establish value identity.** A KerML binding makes its two ends' *values* the same,
  in both directions. Nothing here transports a property value across the correspondence, and the
  registry's basis names that exclusion first. The fixture pins co-denotation of one element, not
  propagation.
- **It does not establish an author-declarable binding.** `source.kerml` Part B must write a
  `binding` connector to make the two packages' features co-denote; MAGE has no such declaration
  and, by the 261004 ruling, never will. On the MAGE side the identity follows from the namespace
  instead, which is why `appears-in` is licensed `by-construction`. The two mechanisms agree on the
  assertion and differ on who makes it, and that difference is not something this fixture closes.
- **It does not establish the identity step from declared material alone.** The move from
  `SelfLink`'s mutually-subsetting ends to "the same things" is stated in clause 8.4.4.6.2's prose
  and in the library's own `doc` comment. KerML's `Subsetting` metaclass declares three OCL
  constraints and none of them is extension containment, so the step is a sentence rather than a
  lookup. That is the reason `oracle.json` records `spec-inspected` with the declared chain visible
  under `evidence[]`, and not `normative-artifact`.
- **It does not exercise multiplicity or cardinality on the binding's ends**, which the basis also
  excludes, nor the two bindings it does not name.
- **It says nothing about the next construct, and nothing about completeness.** Per
  `DESIGN-v02-semantics-261004.md` §35.6: no count of passing fixtures establishes that the
  Workbench implements a KerML subset.
