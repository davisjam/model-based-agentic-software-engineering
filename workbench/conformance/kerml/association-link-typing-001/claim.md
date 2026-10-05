# kerml/association-link-typing-001

**MAGE construct** — a relation type and the typed relations declared against it
(`entities` / `relation-types` / `models[].relations`, the `structural-graph` substrate).

**Registry row** — `MODEL_TYPES` `structural-graph`, `semanticBasis.kind: "borrowed"`,
`standard: "KerML"` (`src/engine/model-types.ts`, the `structural-graph` entry).

**Standard concept** — an Association: a Relationship that is also a Classifier, classifying the
links between the things at its ends.

## The specification, quoted

KerML 1.0, OMG Document Number **formal/2026-03-01** (March 2026),
clause **8.3.4.4.2 Association**, Description:

> An `Association` is a `Relationship` and a `Classifier` to enable classification of links between
> things (in the universe). The co-domains (`types`) of the `associationEnd` `Features` are the
> `relatedTypes`, as co-domain and participants (linked things) of an `Association` identify each
> other.

Clause **8.3.3.2.2 Classifier**, Description, first bullet:

> A `Classifier` is a `Type` that classifies: Things (in the universe) regardless of how `Features`
> relate them.

And the Kernel Semantic Library, `Links.kerml`, on how a link population is narrowed to a type:

> `abstract feature binaryLinks: BinaryLink[0..*] nonunique subsets links` —
> "binaryLinks is a specialization of links restricted to type BinaryLink."

The same two sentences appear in OMG's normative machine-readable artifacts: the `Association`
`ownedComment` of `KerML.xmi`, and `Links.kerml` inside `Semantic-Library.kpar`. `source.kerml`
Part A quotes both with their locations.

## The ONE interpretation this fixture pins

> **A relation type classifies its links, so a question naming one relation type ranges over the
> links that relation type classifies and over no others.**

Operationally, in `model.mage.yaml`: `alpha` conveys to `beta`, and `beta` *records* to `gamma`.
Both relation types license path composition, so composition is not what stops the query.

| query | verdict | why |
|---|---|---|
| `conveys-does-not-span-the-chain` — reachability over `conveys`, `alpha` to `gamma` | `refuted` | the second hop is not a `conveys` link, so it is not in range |
| `conveys-reaches-its-own-target` — reachability over `conveys`, `alpha` to `beta` | `holds` | the positive control: the same form, type and source do answer |

**What would be false if the construct meant something else.** Read `type:` as a display label or a
documentation string and the engine would range over every edge in the model; the first query then
answers `holds`. The pinned pair is therefore not satisfiable by both readings. The conformance test
adds the converse: retyping the single `beta -> gamma` edge to `conveys`, and changing nothing else,
must flip the first query to `holds`. That is what shows the verdict tracks the type assignment
rather than the shape of the graph.

## What this fixture does NOT establish

- **It does not exercise multiple classification.** KerML permits a link to be an instance of
  several Associations through subclassification. MAGE admits exactly one `type:` per relation and
  has no relation-type specialization, so classification here is exclusive by MAGE restriction, not
  by anything KerML says. The fixture pins the restricted case only.
- **It does not establish that end types are honoured.** `Links::BinaryLink` types its `source` and
  `target` ends; a MAGE relation type declares no endpoint types at all, so that part of the
  Association concept has no MAGE realization to check. `source.kerml` Part B types its ends because
  the standard's notation requires it, and that typing has no counterpart in `model.mage.yaml`.
- **It does not establish the population rule in general.** The library exhibits
  "restrict `links` to the type" for its own three association types and declares no obligation that
  a user-defined Association have such a feature. Reaching the pinned interpretation from the quoted
  material takes one inference, which is why `oracle.json` records `spec-inspected` rather than
  `normative-artifact`.
- **It says nothing about the next construct, and nothing about completeness.** Per
  `DESIGN-v02-semantics-261004.md` section 35.6: no count of passing fixtures establishes that the
  Workbench implements a SysML v2 subset.
