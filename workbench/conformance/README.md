# Borrowed-semantics conformance fixtures

**Status, 2026-10-05 — checked by 5 fixtures: 0 oracle-executed, 3 normative-artifact, 2 spec-inspected.
No reference implementation ran.**

(That status line is the string `manifest.json` derives from its own corpus, and
`test/conformance.test.ts` asserts the two are identical — so the count in this prose cannot drift
from the count in the data.)

`DESIGN-v02-semantics-261004.md` §35 rules that a Workbench construct derived from SysML v2 or KerML
must identify the corresponding standard concept **and maintain a conformance fixture demonstrating
the intended correspondence**. §35.4 marks five rows as owing one. **This directory now discharges
all five**, the last two on 2026-10-05.

**Five of five is a count, not a strength.** No oracle has run; two of the five rest on a sentence;
and the correspondence half of every row is still `asserted` (see "The ceiling", below). What a
fixture changes is that the assertion carries a quoted source, a named artifact, a stated bound and
a date, and that a reader can reproduce the reading by hand. A reader who takes `5 of 5` for
conformance against the standards has read the number and not the ceiling.

**What discharged the last two.** `binding` is pinned by `kerml/binding-connector-identity-001`,
against a KerML BindingConnector. It pins **`appears-in`** rather than `machine-of-entity`, which is
a departure from `DECISIONS-RULED-authored-constructs-261004.md` §2 and is argued where it is taken:
a BindingConnector asserts its two ends identify the same thing, and a machine is not the entity
whose behaviour it describes — the registry's own interpretation says "describes", and the RDF
projection comments `MAGE.describes` as *"Optional correspondence, not identity."* `appears-in` is
the row whose correspondence IS that assertion. `requirement, verification` is pinned by
`sysml/requirement-verification-verdict-001`, against a RequirementDefinition's required constraint
and the VerificationCase that discharges it.

**`owed` is now empty, and the control that watched it did not get relaxed to suit.** An empty
obligation list is the shape most likely to rot into a check that cannot fail — the loop over
`owed` runs zero times, and every assertion inside it passes by vacuity. So the live assertions
moved to the **row set**, which does not shrink when the obligation is met:

- Every one of §35.4's five rows must still **resolve**, by the same lookups that decided whether it
  was owed — `MODEL_TYPES` for the three model-type rows, `BINDINGS` for `binding`, and the schema's
  top-level `properties` plus `VERIFICATION_TEXT`'s keys for `requirement, verification`. Delete a
  construct or un-borrow a basis and the suite goes red, saying a shipped fixture is now fiction.
- The five rows must be **partitioned** between `fixtures[].dischargesRow` and `owed[].row`, exactly
  once each. A row cannot leave the obligation by being deleted from both arrays, which is how a
  discharged obligation and a forgotten one would otherwise look identical.

The two `blockedBy` arms remain for any row that returns. **Both were a lookup, and the second arm
exists because the first one's prose rotted.** "There is no binding construct" is a negative claim,
and a negative claim is only as wide as the search behind it. The authored construct set has no such
weakness: it is the top-level `properties` of `mage-model.schema.json`, closed and enumerable, so
the absence of a construct is a lookup. What that arm could not see is a construct landing in `src/`
rather than in the schema, which is exactly what happened. For one day both rows carried an absence
reason the tree had already falsified — `binding`'s said §14 had not landed while `BINDINGS` and
`COMPOSITIONS` were exported typed registries, and `requirement, verification`'s said `verif`
appeared nowhere in `src/` while `src/engine/verification.ts` carried the whole verification
vocabulary — and the suite was green, because it read `absentConstructs` and never read the sentence
beside it.

**No authored `bindings:` key was owed, and that is a ruling.** Each registered binding is licensed
by what the author already writes — `machine-of-entity` by a machine's `entity:`, `state-of-entity`
by the `executes_in_state` property — or holds by construction, as `appears-in` does from entity ids
inhabiting one namespace per system. The binding fixture is built from one of those authored fields,
and the registry's own `semanticBasis` says MAGE carries none of KerML's author-declarable connector
vocabulary. The sibling ruling is that a `verification:` key will never land either: a status is
derived per read and stored nowhere, so recording it would change the system the answer was about.
The standard agrees in declared material rather than prose — `VerificationCase` declares
`return verdict : VerdictKind :>> result`, so a verdict redefines a case's return value and there is
nowhere in SysML v2 to store one either.

## What a fixture is

One directory per correspondence, under `kerml/` or `sysml/`:

```
<standard>/<concept>-<nnn>/
  source.kerml | source.sysml   the standard side: verbatim normative excerpts (Part A), then a
                                minimal composed model in the standard's notation (Part B)
  claim.md                      the specification, quoted; the ONE interpretation pinned; and what
                                the fixture does NOT establish
  model.mage.yaml               the Workbench model intended to correspond, with pinned `expect`
  oracle.json                   the warrant record: method, evidence per rung, bound
```

A fixture asserting "this corresponds" would prove nothing, so each one pins an interpretation
**specific enough to be false** if the Workbench construct meant something other than the standard
concept. Each `claim.md` carries a table of the competing reading and the verdict it would produce,
and `test/conformance.test.ts` drives the converse: it mutates the fixture model and asserts the
verdict moves when the meaning moves and holds still when it does not.

## The three methods, and why the middle one exists

A corpus that reported one strength for everything in it would report a strength it does not have.
So the method is a required field, and there are three values.

| method | what it means | what it is not |
|---|---|---|
| `oracle-executed` | the SysML v2 Pilot Implementation ran the standard-side model and its verdict is transcribed, with the implementation's version | — |
| `normative-artifact` | the correspondence is decided by OMG's normative **machine-readable** material — declared structure, multiplicities, values, invariants — with no prose step between artifact and claim | not an execution; nothing ran |
| `spec-inspected` | the correspondence is established by reading specification prose; the decisive step is a sentence | **not executable conformance** |

The middle rung is available without a runtime dependency because OMG publishes normative
machine-readable artifacts alongside the PDFs: KerML ships `KerML.xmi` plus the Semantic, Data Type
and Function libraries; SysML v2 ships `SysML.xmi` plus the Systems, Analysis, Quantities and Units,
Geometry, Metadata and Requirement Derivation libraries. Reading a declared invariant out of one of
those is stronger than reading a sentence, and it needs nothing installed.

**Never collapse the three.** Two disciplines hold that here:

- A fixture's `method` reports the **weakest** rung the pinned interpretation depends on, and
  `evidence[]` lists every component with its own rung. A claim whose structural half is declared
  and whose decisive step is a sentence records `spec-inspected`, with the declared half visible
  under evidence. The headline never reads stronger than the claim.
- A `spec-inspected` fixture is not described as conformance testing anywhere, including in the
  status line above.

## The ceiling, stated beside the count

**No method on that list yields `checked` for the correspondence.** §13.1 of `SEMANTICS.md` reserves
`checked` for a claim a named gate re-derives on every run and fails on drift in both directions.
With no runtime dependency on the Pilot Implementation, nothing in CI can re-derive the standard's
half. So the correspondence stays `asserted` — what a fixture changes is that the assertion now
carries a quoted source, a named artifact, a stated bound and a date, and that a reader can
reproduce the reading by hand.

What a fixture **does** make `checked` is the Workbench's half. Each `model.mage.yaml` is an ordinary
tracked model with pinned `expect`, and the coverage gate's denominator is every tracked
`*.mage.yaml` — so "MAGE still answers X about this fixture" is verdict-checked by the file
existing. `test/conformance.test.ts` adds what `expect` cannot carry: that the verdict is sensitive
to the meaning under test and not to the drawing.

**No person has read these fixtures.** Every `oracle.json` records
`establishedBy: "MAGE Workbench conformance-fixtures wave (agent)"` and
`reviewedByPerson: null`. §35.6's template field is spelled `read_by: <person>`, and §13.3's K4
warrant is about a person reading a specification and a model together on a date. That has not
happened, and the field says so rather than being filled with the wave's name.

## What this corpus does not attempt

It demonstrates intended correspondence construct by construct. It does **not** establish that the
Workbench implements a SysML v2 subset, and no count of fixtures should be read that way (§35.6).
A fixture says what one construct means in both places. It says nothing about the next construct and
nothing about completeness — the same discipline the coverage gate holds for itself by shipping
`NOT_PROVEN` beside its numbers.

## Divergences from §35.6's stated shape, recorded rather than quietly taken

- **The directories are nested, not flat.** §35.6 specifies
  `conformance/<standard>-<concept>-<nnn>/`; this corpus uses
  `conformance/<standard>/<concept>-<nnn>/` plus a `README.md` and a `manifest.json`, per the
  author's 2026-10-04 revision.
- **`oracle.json` has three methods, not two.** §35.6's two templates are `executed` and
  `specification-read`. The revision splits the second, and the field spellings here are the three
  in the table above.
- **The registry still says the obligation is owed.** `SemanticBasis`'s `borrowed` arm carries
  `clause` and `fixture` (`src/engine/model-types.ts`), and every row — the three model-type bases
  and the one shared binding basis — still reads `clause: CLAUSE_OWED, fixture: null`. Both waves
  were scoped out of editing those declarations, so the registry understates what exists, and as of
  2026-10-05 it understates all of it. Wiring each row to its fixture directory and its clause is
  the next edit this corpus owes, and `test/model-types.test.ts` already holds the biconditional
  that will check it: a named fixture must exist on disk and must come with a clause carrying a
  number. The clause strings to wire in are in each fixture's `oracle.json` under `clause`.
- **The `requirement, verification` row has no `SemanticBasis` object at all.** The other four rows
  are carried by a registry declaration; this one is a §35.4 row about a construct, so there is
  nothing to put `clause`/`fixture` on. Its fixture's `semanticBasis.owner` says so rather than
  naming a symbol that does not exist, and the row's construct half is looked up through the
  schema's `requirements` property and `VERIFICATION_TEXT`'s keys instead.
