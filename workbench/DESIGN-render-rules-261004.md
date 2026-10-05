# Rendering rules: what V-RENDER and V-CROSSMODEL can actually hold

`DESIGN-v02-examples-and-semantic-completion-261004.md` §22–§25 proposes two acceptance rules and
ends with the sentence that makes them a design problem rather than a documentation one: *"These
should be compiler/test-enforceable where possible rather than style-guide prose alone"*
(`DESIGN-v02-examples-and-semantic-completion-261004.md:2135`).

This document answers that. It measures the rendering architecture that exists, states the delta from
§22's target, proposes the registry shape, and gives a **per-clause verdict** on what machinery can
hold and what only a reader can. The verdicts use `SEMANTICS.md` §13's own vocabulary — `asserted` /
`checked` / `derived` / `generated` (`SEMANTICS.md:1229-1234`), with the warrant class K1–K5 from
§13.3 where the four words are too coarse. No new vocabulary is introduced.

**Why §13's vocabulary applies to a rule about our own code.** §13 is about correspondence between a
claim and the engineered system. The components self-model already uses it that way: its
`depends-on` edge set carries `kind: checked` because a named gate re-derives it from the import
graph on every run (`models/workbench-components.mage.yaml:376-381`). A V-rule about the renderer is
the same shape of claim, so the same words grade it.

**Two of the four words are undefined.** §13.1's table records `derived` and `generated` as *admitted
by the enum, defined by no use* (`SEMANTICS.md:1233-1234`). Nothing below assigns either, because
assigning an undefined word would be the overclaim this document exists to prevent. Every verdict
lands on `asserted` or `checked`, and where the honest answer sits between them the K-kind says which
half.

**Measured at `2ed64466`.** `npm run check` clean; `npm run test` 1105 pass, 0 fail. Every `file:line`
below was read at that commit. Three measurements come from a throwaway probe described in §A.6; the
probe was not committed.

**Design only.** This document proposes; it changes no code, no test and no model.

---

## A. What renders today

### A.1 There is no Mermaid, and its absence was a decision

§22 is written as though Mermaid were the renderer: *"Workbench renders models through Mermaid"*
(`:1849`), and §23.4 titles itself "Mermaid boundary." The workbench renders through neither Mermaid
nor anything like it. The rendering stack is first-party: `buildScene` extracts a scene from the IR,
a dagre-based engine ranks it, and `svg.ts` emits SVG plus an accessible twin
(`src/render/index.ts:13-26`). A full-tree search for the string `mermaid` outside `node_modules`
returns seven files, six of them prose and one a code comment.

The one code hit explains the rest. `src/render/layout-dagre.ts:17` names Mermaid among the libraries
considered and says what disqualified them, and `PLAN.md:350` records the ruling: dagre was chosen
because it is *"synchronous, DOM-free"*, over ELK.js (promise-only, "disqualified by the
synchronous-render contract"), Graphviz-WASM, and **Mermaid/PlantUML**. `PLAN.md:350` also notes that
Mermaid's own layout *is* dagre plus elkjs — so the workbench took Mermaid's layout engine and
declined its renderer.

**This is the first delta, and it moves §23.4 from a design question to a resolved one.** The spec
asks whether Mermaid can be confined to per-panel contents while the Workbench owns the canvas. The
confinement already holds, more completely than §23.4 proposes, because there is no Mermaid to
confine. §G returns to what remains of the question.

### A.2 One pipeline, one subject, two scenes — and no registry

`renderView` is the only way to obtain a picture. The module header says so and gives the reason: the
accessible twin obligation (FR-A11Y-2, `requirements-a11y-261002.md:11`) makes the picture a second
view over the same state, *"so there is no export that yields a bare SVG string"*
(`src/render/index.ts:4-6`). A test pins the return shape field by field, and its comment states the
intent: *"adding a visual output without a semantic one would have to change this line"*
(`test/render-accessible.test.ts:54-64`).

Inside that one pipeline, per-type behaviour exists in exactly one place: a two-arm ternary.

```
export function buildScene(system: CanonicalSystem, subject: SceneSubject): SceneGraph {
  return subject.kind === "model"
    ? buildGraphScene(system, subject.id)
    : buildMachineScene(system, subject.id);
}
```
(`src/render/scene.ts:229-233`)

`SceneSubject` has two arms, `model` and `machine` (`src/render/types.ts:421-423`), and
`SceneSubjectKind` is the matching string union (`src/render/types.ts:244`). `renderView` builds the
scene and then runs one layout, one emphasis merge, one twin build and one SVG emit for both arms
(`src/render/svg.ts:510-532`).

So the answer to the brief's first measurement question: **not a per-model-type renderer, and not a
general graph renderer either.** It is one pipeline with two scene extractors, selected by a scene
subject that the model-type registry does not know exists. `src/engine/model-types.ts` declares three
model types (`src/engine/model-types.ts:67`) and says nothing about rendering; `src/render/` knows
two subject kinds and nothing about model types. The two vocabularies have never been related.

### A.3 The quantitative type has no scene, and the fallback §22.4 forbids already ships

The third model type is where the gap bites. `system.quantities` is a flat top-level map keyed by
quantity id (`src/ir/types.ts:602`), and each `CanonQuantity` carries a `target` pointing at some
other construct (`src/ir/types.ts:530-532`, `QuantityTarget` at `:400-407`). There is no
`CanonQuantitativeModel`. A quantitative model is not an addressable thing; it is a set of
annotations over things that are.

The Learn page therefore routes the quantitative type to a structural subject, and says so plainly:

```
 * The quantitative type has no scene of its own — v0.1's quantities ANNOTATE a subject rather than
 * being one (the registry's SEMANTICS citation says so) — so its visual renders the substrate the
 * annotations name: the model a `model:`-targeted quantity declares its ceiling against, falling
 * back to the system's first model or machine.
```
(`src/learn/content.ts:151-154`)

The implementation is a three-step fallback: the first `model:`-targeted quantity's referent, then
the system's first model, then its first machine (`src/learn/content.ts:174-180`). Downstream, the
figure caption asks `s.visual.subject.kind === "model" ? "model" : "machine"`
(`src/learn/main.ts:265`) — binary, with no quantitative arm to have — and the quantities themselves
are then printed as a four-column table under the sentence *"The quantities themselves: annotations
over the subject above"* (`src/learn/main.ts:275-281`).

**That fallback is `renderAnythingAsGraph()` with better manners.** §22.4 says *"There should be no
generic `renderAnythingAsGraph()` fallback for a registered model type"* (`:1936`) and §22.3 says *"Do
not force quantities into the structural renderer simply because Mermaid can draw boxes and arrows"*
(`:1909`). A registered model type is today drawn by the structural extractor over a substrate chosen
by a positional heuristic. The comment is honest and the behaviour is the thing §22 prohibits. Its
one virtue — and it is the virtue the design in §B builds on — is that the choice is written down in
one place instead of being spread across the renderer.

### A.4 No cross-model visual connection exists at all

`SceneSubject` names one subject, and the workspace draws one at a time. The call site says it:
*"One subject at a time, chosen by the user or by `window.mage.view.focus`"*
(`src/ui/shell/workspace.ts:427`). Nothing composes two rendered views; nothing draws an edge between
two panels; there is no overlay layer and no multi-panel canvas.

So **V-RENDER's third clause and all of V-CROSSMODEL's visual half govern a surface that does not
exist yet.** That is the most consequential fact in this measurement, and it cuts both ways. A rule
over an absent surface cannot be violated, so landing it costs nothing today — and a rule that has
never been tested against a real drawing is prose, however it is worded. §E says what to do about
that.

Four cross-model relationships *are* registered, in the engine's `joins` census
(`JoinSemantics` at `src/engine/model-types.ts:258-265`): `appears-in`
(`:538-545`), `state-of-entity` (`:554-556`), `machine-of-entity` (`:711-718`), and
`executions-selected-by-behaviour` (`:802-809`). The first three are correspondences and the fourth
is an operation, which is exactly the split §4.1 rules on (`:306-333`). Those declarations are the
material a future overlay would draw from. None of them reaches the renderer today.

### A.5 What already prevents a renderer from inventing facts

More than the brief's framing suggests, and less than §22.5's list.

**Held by the type system.** Every interface and object-type member declared in `src/ir/types.ts`
carries `readonly` — 161 of them, with no exception outside object literals — and
`CanonicalSystem`'s collections are `ReadonlyMap` / `readonly T[]`
(`src/ir/types.ts:590-612`). A TypeScript caller cannot mutate the IR at all, so the renderer cannot
alter a semantic fact without a cast. `npm run check` re-derives that on every run.

**Held by a named gate over the declared graph.** The components model asks
`renderer-must-not-mutate-ir` — `form: direct, relation: may_mutate, from: renderer, to: model-ir`,
`expect: refuted` (`models/workbench-components.mage.yaml:584-590`) — and `test/model-coverage.test.ts`
evaluates every saved query's `expect` in CI. The prohibition is vacuity-guarded: the model adds a
positive `may_mutate` edge for exactly that reason (`:627-635`).

**Held by the renderer's own structure.** The scene's node set is derived from the IR
(`buildGraphScene` filters to `system.entities.has(id)`, `src/render/scene.ts:94`), and evidence
emphasis is filtered through it — `if (!nodeIds.has(id)) return;` (`src/render/accessible.ts:204`).
Evidence naming an element this scene does not contain is dropped, not drawn. The failure direction
is closed: the renderer loses a highlight rather than inventing a node. A test pins the
machine case (`test/render-accessible.test.ts:198`, "evidence for another machine does not leak into
this machine's view") and another pins the absence case (`:285`, "a view with no result at all states
no outcome rather than inventing one").

**Held by convention, and worth naming.** `buildScene` accepts a subject the system does not have.
`buildGraphScene` reads `model?.entities ?? []` and titles the result with the bare id when no model
answers (`src/render/scene.ts:93-94`, `:162`), so an unresolvable subject yields an empty picture
captioned as though the model existed. Existence is checked at one call site — `resolveSubject`
returns `null` unless `system.models.has(id)` or `system.machines.has(id)`
(`src/ui/view-model.ts:850-861`) — and the facade's `renderView` forwards whatever request it is
given (`src/app/services.ts:584`). Two call sites are safe because of how they build their subjects,
not because the renderer refuses. §D ranks the test that would close this.

### A.6 Three measured facts that change the test ranking

A throwaway probe built every scene of all four shipped examples and compared the scene's contents
against the IR's declarations. It was run once and deleted; the numbers below are its output.

**One. The renderer's two synthesis paths are live code and dead corpus.**
`buildMachineScene` deliberately adds nodes for states a transition names but the machine never
declared, with the reason stated in place: *"the renderer shows what the model says rather than
silently hiding the dangling end. The validator is what complains about it"*
(`src/render/scene.ts:179-188`). `buildGraphScene` synthesises relation ids
(`r:<type>:<from>:<to>`) and disambiguates collisions with a `#n` suffix
(`src/render/scene.ts:99-108`). Over all four examples — four machines and six models, every scene
the corpus can produce — the probe found **zero** undeclared states drawn and **zero** synthesised
relation ids. Every shipped machine's drawn node count equals its declared state count.

That is the sharpest finding in this document, and it is a finding about §22.5 rather than about the
renderer. §22.5 scopes its tests to *"each built-in example"* (`:1942`). A corpus-scoped test
asserting "every rendered node is a declared element" passes today, will keep passing, and holds
nothing: the two code paths that would break it are reachable and unexercised. A test over the
shipped corpus measures the corpus. Only a test over the extractor measures the extractor.

**Two. Containment is drawn as a fact the IR does not declare as a relation.** `buildGraphScene`
emits a `containment` edge per parent/child pair, with a synthesised `c:<parent>:<child>` id and the
literal label `"contains"` (`src/render/scene.ts:128-138`). The module argues for the duplication —
*"enclosure alone would make position the sole carrier of a containment claim"*
(`src/render/scene.ts:87-91`) — and a test holds it (`test/render-accessible.test.ts:66`). This is a
derived projection of `CanonEntity.contains`, not an invention. It matters because any mechanical
statement of "no renderer creates a semantic fact" must be written to admit it, and the naive
spelling of that test would fail on the renderer's most deliberate design decision.

**Three. Mapping back to canonical ids holds for nodes and is partial for edges.** A scene node id is
an entity id or a bare state name, and `sceneNodeIdFor` converts a selection to it in two lines
(`src/ui/view-model.ts:641-642`). Edges go the other way by lookup rather than by id:
`edgeSelection` resolves against the system on `(model, from, to, type)` and the comment says why the
id cannot be parsed — *"`buildScene` synthesises an id for a relation the source left unnamed … a
wrong guess here deletes a different edge than the one the user clicked"*
(`src/ui/shell/workspace.ts:69-94`). Containment and transition edges resolve to `null`: the
selection vocabulary has no member for either (`:78-79`).

### A.7 The delta, as a table

| §22–§24 target | As built at `2ed64466` | Gap |
|---|---|---|
| Mermaid renders each model view (`:1849`, `:2087`) | First-party SVG over dagre; Mermaid rejected on a synchronous-render contract (`PLAN.md:350`) | **Spec is wrong about the code.** Target is stricter than it knows. |
| Each model type owns its renderer (`:1865`) | One pipeline, two scene extractors, selected by `SceneSubject` (`src/render/scene.ts:229-233`) | No relation between model types and subjects |
| Structural renderer distinguishes entities, types, direction, witness paths, violations (`:1871-1878`) | All present: arrowhead form per relation type, numbered evidence, non-colour emphasis (`test/render-svg.test.ts:405`, `:110`, `:71`) | Met |
| Behavioural renderer shows initial state, transitions, labels; overlays witness and lasso (`:1888-1901`) | Present, including lasso suffix identification (`test/render-accessible.test.ts:174`) | Met |
| Quantitative renderer has its own policy (`:1907`) | Routes to the structural extractor over a heuristically chosen subject (`src/learn/content.ts:174-180`) | **Absent.** The forbidden fallback ships. |
| Renderer registry, no generic fallback, nonvisual must be declared (`:1926-1938`) | No registry; no `nonvisual` concept | **Absent** |
| Cross-model views retain boundaries; the Workbench draws the binding (`:2050-2063`) | One subject at a time (`src/ui/shell/workspace.ts:427`) | **Absent** |
| Workbench overlay carries bindings, compositions, selections, evidence (`:2101-2105`) | Selections and evidence are per-view emphasis; no overlay | Partially met, inside one view |
| Embedded Sensor Node renders memory and budget (`:2117`) | Example does not exist (`src/app/examples.ts:76-77`) | **Absent** |
| Autonomous Delivery System shows multiple views (`:2121`) | Example does not exist | **Absent** |

---

## B. The renderer registry

### B.1 The totality shape, and why it is stronger here than for `semanticBasis`

The brief's lead is correct and the precedent is exact. `semanticBasis` is a required field on
`ModelType` (`src/engine/model-types.ts:357`), and the registry header states what that buys:
*"The field is REQUIRED, which is the whole of rung 1: a new model type or question form cannot land
unattributed, because the compiler will not let it"* (`src/engine/model-types.ts:39-42`). The test
file draws the three rungs apart and refuses to be read as more than it is:

```
// Rung 1 (PRESENCE) is the compiler: `semanticBasis` is required on `ModelType` and on
// `QueryPrimitive`, so a new model type or question form cannot land unattributed and no test is
// needed to say it. Rung 2 is below — the content is not a placeholder. Rung 3, that a borrowed
// row's correspondence to the standard is actually RIGHT, is `asserted` and is held by nothing
// here
```
(`test/model-types.test.ts:228-234`)

A `renderStrategy` field on `ModelType` inherits that structure exactly. **And it gets a fourth rung
`semanticBasis` cannot have, because rendering is internal.** `semanticBasis`'s rung 3 is unholdable
— the workbench takes no runtime dependency on the SysML v2 reference implementation, so nothing in
CI can re-derive the standard's half (`src/engine/model-types.ts:48-51`). A render strategy's
correspondent is `src/render/`, which CI holds in its hand. The claim "this declaration is the
strategy the code actually runs" is mechanically re-derivable. That is the structural reason a large
part of V-RENDER can be `checked` where §35's attribution rule had to stop at `asserted`.

The four rungs for `renderStrategy`:

1. **Presence — the compiler.** A required field on `ModelType`. A new model type cannot land
   without declaring a strategy or declaring itself nonvisual. One direction: a missing field fails.
   The other direction — a declaration for a type that does not exist — is held by the existing pin
   that the registry array covers the published schema's kind enum (`test/model-types.test.ts:37`).
2. **Content — a test.** No placeholder, mirroring
   `test/model-types.test.ts:244` ("no semantic basis is a placeholder"). A `nonvisual` arm owes a
   real reason; an `annotates` arm owes a real account of what it adds.
3. **Dispatch totality — the compiler.** The renderer's dispatcher switches on the declaration's
   discriminant with no `default` arm and a declared return type, so `tsc` refuses a new arm that
   nothing handles. This is what replaces "there should be no generic fallback" with a type error.
4. **Correspondence — a test.** Every declared strategy is the one the code runs, re-derived by
   rendering each type's exemplar and asserting the scene's shape against the declaration. This rung
   is what `semanticBasis` cannot have, and it is what makes clause R2 `checked`.

A `Record<ModelTypeId, RenderStrategy>` would hold rung 1 in both directions by itself, since the
compiler rejects both a missing key and an excess one. It costs the registry's one-object-per-type
shape, which the Learn projection depends on (*"Learn entries are the registry, projected: one card
per type, fields from the same object"*, `test/model-types.test.ts:393`). Recommendation: the field
on `ModelType`, with the existing enum pin supplying the second direction.

### B.2 Where it can live: the import graph decides, and it decides for us

This is not a style question. `test/import-graph.test.ts` asserts **equality** between the declared
`depends-on` edge set and the observed import graph, in both directions
(`SEMANTICS.md:1283-1287` citing `test/import-graph.test.ts:363`). An undeclared import fails the
gate. So the registry's home is constrained by which edges exist.

The declared edges that matter: `rend-ir` (renderer → model-ir), `app-rend` (app-services →
renderer), `app-qe` (app-services → query-engine), `ui-rend`, `learn-rend`
(`models/workbench-components.mage.yaml:394`, `:432-433`, `:453`, `:461`). There is **no**
`query-engine → renderer` edge and no `renderer → query-engine` edge.

Three consequences, each measured rather than preferred:

- **The declaration must be data, not a function reference.** A `renderer:` field holding a function
  from `src/render/` would create `query-engine → renderer` and fail the gate. Declaring that edge
  would invert the layering: the engine would depend on the view. A data declaration creates no edge
  and is readable by a test, the Learn page and an agent facade without a DOM.
- **The declaration must not name the renderer's types either.** Type-only imports are drawn: the
  components model draws `wiring-app` and `app-surf` and says so — *"Build-time it is a dependency,
  so it is drawn"* (`models/workbench-components.mage.yaml:422-424`). So the field cannot reference
  `SceneSubjectKind` (`src/render/types.ts:244`). It should name the **IR construct** the projection
  is of — `"model"`, `"machine"`, or none — which is kernel vocabulary the engine already owns. The
  renderer maps IR construct to scene builder. The two unions are isomorphic today and need not stay
  so, which is the reason to keep them separate rather than a concession.
- **The dispatcher lives in `src/app/`.** `app-services` is the only component with declared edges to
  both the renderer and the engine (`app-rend` and `app-qe`), and it already owns the render seam:
  `RenderPort` is a one-method port (`src/app/ports.ts:93-95`) and `Services.renderView` carries the
  V-RENDER sentence as a comment — *"Non-semantic. A view never changes what the model asserts"*
  (`src/app/services.ts:583-586`). The exhaustive switch belongs there, beside the seam that already
  claims the property.

### B.3 The declaration shape

§22.4 asks for `modelType / semanticDomain / renderer / renderProjection / evidenceProjection`
(`:1930-1934`). Three of those five already exist on `ModelType` under other names — the type id, the
`queryKind` dialect, and the schema citations — so the field adds what is genuinely missing. The
proposed shape, in the registry's existing register:

```ts
/**
 * How a model type's picture is produced, or why it has none.
 *
 * `construct` names the IR construct the projection is OF — kernel vocabulary, so the engine gains
 * no edge to the view (§B.2). The renderer maps a construct to its scene builder.
 */
export type RenderStrategy =
  | {
      readonly kind: "projected";
      /** The IR construct this type's own picture is a projection of. */
      readonly construct: "model" | "machine";
      /** What the projection preserves of this type's semantics, and what it drops. */
      readonly projection: string;
      /** How a verdict's evidence lands on this projection. */
      readonly evidence: EvidenceProjection;
    }
  | {
      readonly kind: "annotates";
      /** The type whose subject hosts this one's picture. */
      readonly host: ModelTypeId;
      /** Where the host subject comes from — a declaration, not a positional heuristic. */
      readonly hostedBy: SchemaAuthority;
      /** What this type adds to the host's picture, and what it still cannot show. */
      readonly adds: string;
    }
  | { readonly kind: "nonvisual"; readonly why: string };
```

**The `annotates` arm is the design's load-bearing move.** It is not a concession to the current
code; it is the mechanism that converts a silent fallback into a declared claim. Today the
quantitative type's routing lives in a `switch` arm in the Learn page with an honest comment
(`src/learn/content.ts:174-180`). Declared as `annotates`, the same fact becomes a required field, a
non-placeholder test, an exhaustive dispatch arm and a Learn card row — and the day a
resource-oriented projection lands, the arm changes from `annotates` to `projected` and the diff is
one line a reviewer cannot miss. A fallback nobody declared and a projection nobody wrote look
identical; these two arms make them different values. That is the same argument `SemanticBasis` makes
for its extension arm — *"a deliberate extension and a forgotten attribution no longer look alike"*
(`src/engine/model-types.ts:41-42`).

`hostedBy` matters for a second reason. The Learn page's three-step positional fallback — first
`model:`-targeted quantity, then first model, then first machine — is the kind of rule §22.3
objects to. `hostedBy` makes it a citation of where the host is *declared*, which is the registry's
standing discipline: *"the registry points; the IR decides"* (`src/engine/model-types.ts:321`). For
quantities that citation is `CanonQuantity.target` (`src/ir/types.ts:532`), and the positional
fallback becomes a defect with a name rather than a heuristic with a comment.

**On `semanticBasis` for the strategy.** §4.4 requires it for bindings and compositions (`:392`).
A render strategy should **not** carry one. A projection is the Workbench's own presentation choice;
no standard defines it, so every row would carry the same `kind: "extension"` reason, and a field
whose value is constant across every row records nothing. §35's rule attaches attribution where
borrowing is possible. Rendering is not borrowed. Recording that judgment here is what keeps it from
being re-litigated as an omission.

### B.4 What the registry does not do

It does not hold a renderer. It does not hold layout. It does not enumerate drawable shapes. Those
would be the "horrible declarative query-language-in-YAML" the model-query ruling rejects for the
query side (`src/engine/model-types.ts:271-274`), transposed to the view. The registry declares a
strategy and cites where the per-instance facts live; the renderer draws.

---

## C. Per-clause verdict

This is the document's central deliverable. **"Today"** grades the clause as the tree stands at
`2ed64466`. **"With §B"** grades it after the registry lands as designed. Both use §13's words, with
the §13.3 warrant class in parentheses where the word alone would mislead.

### V-RENDER

| Clause | Today | With §B | What holds it, and what does not |
|---|---|---|---|
| **R1.** Every rendered view is a typed projection of an authoritative model. | `checked` (K1), with one hole | `checked` (K1) | **Held:** `renderView` is the sole picture seam and its return type admits no bare SVG (`src/render/index.ts:4-6`), pinned field-by-field at `test/render-accessible.test.ts:54-64`; the view carries the system hash it depicts (`test/render-svg.test.ts:224`). **Not held:** the renderer accepts a subject no model answers and draws an empty picture titled with the bare id (`src/render/scene.ts:93-94`, `:162`). Existence is validated at one call site (`src/ui/view-model.ts:850-861`), not at the seam. §D-5 closes it. |
| **R2.** Model types own their render projections. | `asserted` (K4) | `checked` (K1) | **Today:** nothing relates `ModelTypeId` to `SceneSubject`; the relation exists as a `switch` arm in the Learn page (`src/learn/content.ts:169-181`). **With §B:** rung 1 makes the declaration compulsory (compiler), rung 3 makes the dispatch exhaustive (compiler), rung 4 re-derives the declaration against the code each run. That is §13.1's definition of `checked` — a named gate, every run, failing on drift. |
| **R2a.** No generic `renderAnythingAsGraph()` fallback. | **violated** | `checked` (K1) | The fallback ships, in the quantitative arm (`src/learn/content.ts:174-180`). With §B it becomes the declared `annotates` arm — which does not satisfy §22.3's intent, and says so in a field a reviewer reads, rather than being absent. |
| **R2b.** A new model type cannot ship without a strategy or a nonvisual declaration. | — (nothing to violate) | `checked` (K1) | A required field plus the existing enum pin (`test/model-types.test.ts:37`). This is the clause the compiler holds most cleanly, and §22.4's own sentence (`:1938`) is almost a type signature already. |
| **R3.** Cross-model visual connections correspond only to registered bindings or compositions. | **vacuous** | `asserted` (K4), convertible | No cross-model connection exists (`src/ui/shell/workspace.ts:427`), so the clause is true by having nothing to range over. §E states the one construction that makes it `checked`: an overlay whose edge set is *derived from* the binding/composition registry rather than *checked against* it. |
| **R4a.** Rendering must not ALTER semantic facts. | `checked` (K1) | `checked` (K1) | **Strongest clause in the rule, and held by the type system, not by the model.** All 161 declared members of `src/ir/types.ts` are `readonly`, with `ReadonlyMap` collections (`:590-612`); `npm run check` re-derives it every run. The components model's `renderer-must-not-mutate-ir` (`models/workbench-components.mage.yaml:584-590`) is the weaker restatement: K2 — verdict-checked over a **hand-written** `may_mutate` edge set of two edges (`:473-474`) that no gate derives from code. Read `tsc` as the control and the query as defence-in-depth, not the reverse. |
| **R4b.** Rendering must not CREATE semantic facts. | `asserted` (K4), partly bounded | `asserted` (K4), better bounded | **The hard half, and it stays asserted.** Three partial holds: the graph scene's node set is filtered to declared entities (`src/render/scene.ts:94`); evidence emphasis is filtered to the scene's nodes and so fails closed (`src/render/accessible.ts:204`); nothing reaches the picture without reaching the twin (`test/render-accessible.test.ts:38`). Three documented exceptions: the machine extractor adds undeclared transition endpoints (`src/render/scene.ts:179-188`), containment is emitted as an edge the IR does not declare as a relation (`:128-138`, defended at `:87-91`), and relation ids are synthesised when the source names none (`:99-108`). **No single test can hold R4b**, because "semantic fact" is not a type the code has. §D decomposes it into four claims that can be held and one that cannot. |

### V-CROSSMODEL

| Clause | Today | With §B and the sibling split | What holds it |
|---|---|---|---|
| **X1.** Cross-model correspondence is represented as a binding. | `asserted` (K4) | `checked` (K1) for **presence** | `test/joins-census.test.ts` already derives every cross-type reference the tracked models author and requires each pair to be named by some census entry. The sibling's split (§4.4, `:379-392`) re-types the census into bindings and compositions; the existing totality control then holds presence over the split. Its own header draws the limit this verdict must respect: presence is enforceable, while *"correspondence — that the entry's prose describes the edge correctly — is `asserted`, read by a person"* (`test/joins-census.test.ts:15-18`). |
| **X2.** Cross-model evaluation is represented as a composition. | `asserted` (K4) | `asserted` (K4) | Asymmetric with X1, and the census says why: the census-⊆-derived direction is deliberately not asserted, because `executions-selected-by-behaviour` is declared against the query AST and no model document can witness it (`test/joins-census.test.ts:52-55`). The one composition is therefore unwitnessed by the control that holds the bindings. What *can* be held: the composition's declaration cites `QuantityQuery.target` (`src/engine/model-types.ts:806-808`), and a test can assert that the only cross-domain path into a quantitative evaluation runs through that field. That is narrower than X2 and is the honest form of it. |
| **X3.** "Join" is not an authoritative semantic category. | `asserted` (K4) | `checked` (K1) | The one clause in either rule that is purely mechanical, because it is a claim about names. After the split, a grep-class test over `src/` asserting that no exported symbol, type or field in the semantic layers spells `join` holds it exactly. Today the name is still the registry's own (`JoinSemantics`, `src/engine/model-types.ts:258`; `joins`, `:327`), so the test is red until the sibling lands — which is the correct order, and matches the repo's audit-only-first discipline for a new blocking check. |

### The one-line summary

Of V-RENDER's seven clauses, **four become `checked` with the registry** (R1, R2, R2a, R2b), **one is
already `checked` more strongly than the rule knows** (R4a, by `readonly`), **one is vacuous until a
multi-model canvas exists** (R3), and **one stays `asserted` and should say so in the rule's own
text** (R4b). Of V-CROSSMODEL's three, **two become `checked`** (X1 for presence, X3 by name) and
**one stays `asserted`** (X2).

**So the rule as drafted overclaims in exactly two places**, and both are fixable in the wording:
R4's "neither create nor alter" fuses a type-system guarantee to a reviewer's judgment under one
verb pair, and R3 reads as a constraint when it is today a commitment. §H proposes the text.

---

## D. §22.5's six tests, ranked by what each would catch

§22.5 lists six properties per built-in example (`:1942-1949`). Ranked by defect-catching power,
with the measurement from §A.6 applied: four are worth building, one already exists twice over, and
one cannot be written as stated.

**1. All semantically relevant rendered elements map back to canonical ids.** *Highest value, and
currently the weakest.* This is the test that would catch a renderer inventing content, because an
element with no canonical id has no authority behind it. It is partially held — node ids are
canonical (`src/ui/view-model.ts:641-642`) — and partially not: edges resolve by lookup rather than
by id, and containment and transition edges resolve to nothing at all
(`src/ui/shell/workspace.ts:78-79`). **Build it over the extractor, not the corpus.** The §A.6
measurement is decisive: the two synthesis paths in `buildScene` are live code that no shipped
example exercises, so a corpus-scoped assertion passes while holding nothing. The test must
construct a machine with an undeclared transition endpoint and a model with two unnamed relations
between one pair, and assert the declared outcome in each case. State the three sanctioned synthesis
classes as a closed set, the way `WALKED` / `DECLINED` are declared together in
`test/joins-census.test.ts:40-45`, so a fourth cannot land unnoticed.

**2. No renderer creates authoritative semantic facts.** *Second in value, and unwritable as
stated.* "Authoritative semantic fact" names no type, so there is nothing to range over. Decompose
it into four claims that each have a subject:

- every scene node id resolves in the IR (as a declared element, or as a transition endpoint, or as
  a declared synthesis class) — mechanical;
- every scene edge resolves to a declared relation, a declared transition, or a `contains` pair —
  mechanical;
- no scene field feeds a query, a verdict or the system hash — mechanical, and already most of the
  way there: canonicalization drops what the IR does not carry, and the IR has no view fields
  (`SEMANTICS.md:1260-1263` for the analogous provenance case);
- the twin's prose does not assert more than the scene's fields support — **`asserted`.** A reviewer
  reads it. This is the residue, and it is the right residue: it is the same residue §35 leaves for
  borrowed semantics, and `test/joins-census.test.ts:15-18` already rules that correspondence-of-prose
  is read by a person.

**3. Changing layout does not change query results.** *Third, and cheap, because the architecture
nearly gives it away.* Layout is downstream of the scene and the scene is downstream of the IR; no
query reads either. The test worth writing is not a property test over layouts but a **negative
control over the seam**: render a subject under two different layout engines
(`defaultLayoutEngine` and a cold hint set, both already supported — `test/render-layout.test.ts:650`,
`:683`), evaluate every saved query on the system under each, and assert identical verdicts. It
would catch a future renderer that memoised something into the system, which is the realistic
failure, and it costs one test.

**4. Canonical model validates independently of rendering.** *Fourth, and nearly free.* Already true
by construction — the validator has no renderer edge
(`models/workbench-components.mage.yaml:394` declares `val-ir` and nothing else) and the import-graph
gate holds the absence in both directions. A new saved query in the components model —
`validator-must-not-reach-renderer`, `form: reachability`, `expect: refuted` — states it as the
model's own claim at the cost of six lines, and inherits the K2 warrant plus the K1 edge set.
Recommend it, and recognise it as a restatement rather than a new control.

**5. Rendered elements belong to a resolvable subject.** *Not in §22.5's list; added here, because
§A.5 found the hole.* An unresolvable subject yields an empty picture titled with the bare id. Either
`buildScene` refuses — returning a scene that states the absence, matching the refusal doctrine the
engine already applies to an absent substrate (`src/engine/model-types.ts:12-21`) — or the seam
validates. Prefer the refusal: it puts the check where the brief's own standard puts it, by
construction rather than by discipline, and the kernel has a worked precedent for naming what is
absent instead of answering over nothing.

**6. Rendering is deterministic.** *Lowest value, because it is already held twice.*
`test/render-layout.test.ts:275` asserts identical placement across runs, `:283` asserts independence
from authoring order, and `test/render-svg.test.ts:230` asserts byte-stable serialization. §22.5's
sixth bullet is satisfied; adding a per-example version would re-assert it N times over a corpus
that cannot vary it.

---

## E. What it takes for V-CROSSMODEL's visual clause to hold by construction

§E answers the brief's third question: "this visual connection corresponds to a registered binding or
composition" is checkable *if connections are drawn from the registry*. The gap between *checked
against* and *drawn from* is the whole of it.

**Checked against** means the overlay computes its edges some way, and a test compares the result to
the registry. The test can go green while the overlay's edge-production logic has a second,
unregistered path that the shipped corpus does not exercise — which is precisely the failure §A.6
measured in the extractor, where two synthesis paths sit live and untested.

**Drawn from** means the overlay has no other input. Concretely, after the sibling's split
(`:379-392`) lands bindings and compositions as separately typed, separately totalized registry
entries:

- the overlay's edge type is a **function of a registry entry**, so an overlay edge cannot be
  constructed without one. A constructor taking `(binding, fromPanel, toPanel)` and no free-string
  alternative makes the unregistered edge unrepresentable;
- the per-instance endpoints come from the entry's own `declaredBy` citation, read out of the IR —
  the registry points, the IR decides (`src/engine/model-types.ts:321`);
- the overlay module imports the registry and nothing else that could supply an edge.

Then R3 is `checked`: `tsc` holds that every overlay edge has a registry entry behind it, and the
import graph holds that there is no second source. What remains `asserted` is the same residue as
everywhere else — that the entry *means* what its prose says.

**Two obligations the spec does not mention.**

First, **the overlay owes a twin.** FR-A11Y-2 requires an equivalent accessible representation for
information conveyed graphically, and forbids position and line style as the sole carriers
(`requirements-a11y-261002.md:11`). `AccessibleScene` is per-view (`src/render/types.ts:352-375`), so
an N-panel canvas needs an outer accessible object the bindings appear in. The renderer's existing
contract is the model: the picture is unobtainable without the twin
(`test/render-accessible.test.ts:54`). The composer should inherit that shape rather than be trusted
to remember it.

Second, **composition is mechanically free today.** `RenderedView` already returns
`positions: ReadonlyMap<string, Point>` — node id to top-left corner, built for the hint round-trip
(`src/render/types.ts:405-414`) — and `layout.bounds: Rect` (`:100-107`). An outer canvas can place
N panels and draw a binding between `positions.get(a)` and `positions.get(b)`, each offset by its
panel origin, without any change to the renderer. The brief asks what would have to change for
§23.4's architecture to be hostable. The answer is: nothing in `src/render/`. The work is a new
composer in the app or view layer, and the registry it draws from.

---

## F. The quantitative renderer question, and what the registry must express

§22.3 and §24 are explicit: the Embedded Sensor Node must make memory allocation and budget visually
legible rather than drawing a generic dependency graph (`:1924`, `:2117`). The brief asks whether
that implies a third renderer, a projection choice inside a quantitative renderer, or something else,
and instructs that the renderer itself not be designed here. The measurement answers it.

**It is not a renderer question yet. It is a subject question.** `SceneSubject` has two arms because
the IR has two things a picture can be *of*: a `CanonModel` and a `CanonMachine`. There is no third,
because `system.quantities` is a flat map of annotations whose targets point at the other two
(`src/ir/types.ts:602`, `:530-532`). A third renderer has nothing to be a renderer *of*. This is why
the Learn page's fallback exists and why its comment is phrased as a fact about the IR rather than a
gap in the renderer (`src/learn/content.ts:151-154`).

So the sequencing is forced, and it runs opposite to the way §22.3 reads:

1. **A quantitative model must become an addressable construct** before a quantitative projection can
   be registered against it. The spec already anticipates the move: `src/ir/types.ts:606-608` notes
   that v0.1 has exactly one quantitative model per system, *"so the ruling's 'declared per
   quantitative model' is a top-level block. When quantities are scoped to a model, this declaration
   moves with them."* That scoping is the prerequisite.
2. **Then** the registry's `annotates` arm becomes `projected`, the IR construct union gains a third
   member, and the dispatcher's exhaustive switch goes red until a projection exists. The compiler
   schedules the work.

**What the registry must express for either answer to be possible.** Three things, and no more:

- **Which IR construct this type's picture is of, or that it has none of its own.** The `projected` /
  `annotates` / `nonvisual` discriminant. This is what makes the sequencing above visible instead of
  implicit, and it is what the Embedded Sensor Node will change when it lands.
- **What the projection preserves and what it drops.** The `projection` field. A resource-oriented
  view of memory allocation preserves allocation and budget and drops connectivity; a structural view
  of the same entities does the reverse. Both are legitimate pictures of overlapping facts, and the
  field is what lets a Learn card say which reduction a reader is looking at — the same job `omits:`
  does for a model (`src/engine/model-types.ts:361`).
- **Where the per-instance facts come from.** The `hostedBy` citation for `annotates`, and for
  `projected`, the schema authorities the type already carries. A ceiling belongs to
  `CanonQuantity.target`; a budget's 256 KiB is a declared magnitude, not a renderer constant. This
  is what prevents a quantitative renderer from hard-coding a number the model never declared, which
  is the renderer's version of the fabricated-zero defect the registry's consultation gate already
  killed (`src/engine/model-types.ts:12-18`, pinned at `test/model-types.test.ts:362`).

**What the registry must not express:** whether the budget is a bar, a gauge or an annotated box.
That is layout, and the registry has no business in it.

---

## G. The Mermaid boundary

§22.1 and §23.4 ask whether the current architecture can host "Mermaid per panel, Workbench overlay
across panels." Three findings, in order of consequence.

**The boundary already holds, and more strictly than §23.4 draws it.** Mermaid is not in the
dependency set. The per-type renderer is first-party and synchronous, chosen over Mermaid on a
contract Mermaid cannot meet (`PLAN.md:350`, `src/render/layout-dagre.ts:17`). Every concern §23.4
raises — that Mermaid might own the canvas, that it might become the semantics, that it might flatten
two models into one graph — is structurally unavailable.

**The architecture can host the panel-plus-overlay shape today, with no renderer change.** §E
establishes it: `positions` and `bounds` give an outer composer per-panel geometry
(`src/render/types.ts:405-414`, `:100-107`), `renderView` is callable once per panel, and the
accessible twin comes back with each view.

**One thing §23.4 gets right that survives the substitution, and it is the important one.** *"Each
side is rendered by its own model-type renderer. The Workbench composes the rendered views and draws
the binding between their canonical elements"* (`:2063`). Read with "Mermaid" deleted, that is the
correct architecture and it is not what the code does: there is no per-model-type renderer to be each
side's own (§A.2). The spec's Mermaid framing is wrong about the dependency and right about the
seam. **Keep the seam, drop the library.** Recommendation: §22 and §23.4 should be rewritten in terms
of "the per-type renderer" with Mermaid named once, in a note, as considered and declined — otherwise
every future reader of the spec will look for a dependency that was rejected by ruling.

---

## H. What the spec and the brief got wrong

Stated plainly, because a specification that misdescribes the code sends its implementers to the
wrong place.

**The spec.**

1. **Mermaid is not the renderer and was rejected on the record** (§A.1). §22's opening sentence
   (`:1849`), §22.1's "graph/flowchart-style Mermaid" (`:1869`), §22.2's "Mermaid state-diagram
   facilities" (`:1886`), §22.3's "because Mermaid can draw boxes and arrows" (`:1909`) and all of
   §23.4 are written against a dependency the project declined (`PLAN.md:350`). The *rules* survive
   the correction intact; the prose does not.
2. **§22.5's tests are scoped to the examples, and the corpus cannot exercise the renderer's
   synthesis paths** (§A.6). Over all four shipped examples the probe found zero undeclared states
   drawn and zero synthesised relation ids, while both code paths sit live in `src/render/scene.ts`.
   Per-example tests would pass and hold nothing. The scope must be the extractor.
3. **"No renderer creates authoritative semantic facts" cannot be written as stated** (§D-2).
   "Authoritative semantic fact" names no type. It decomposes into three mechanical claims and one
   `asserted` residue, and the rule should say which is which.
4. **Two of §24's five examples do not exist.** Embedded Sensor Node and Autonomous Delivery System
   are absent from `SHIPPED_EXAMPLE_IDS` (`src/app/examples.ts:76-77`). §24 states rendering
   requirements for them as though they ship.
5. **§22.3's ordering is inverted** (§F). A quantitative renderer cannot be registered before a
   quantitative model is an addressable construct. The spec asks for the picture before the subject
   the picture would be of.
6. **§22.4's registry cannot hold a `renderer` function where §4.4 puts the registry** (§B.2). A
   function reference from `src/engine/` to `src/render/` creates an undeclared import edge that
   `test/import-graph.test.ts` fails, and declaring it would invert the layering. The field must be
   data, and it must not name the renderer's types either.
7. **V-RENDER's fourth clause fuses two claims of different strength.** "Neither create nor alter"
   joins a type-system guarantee to a reviewer's judgment. Proposed split:

   > **V-RENDER.** Every rendered view is a typed projection of an authoritative model. Model types
   > own their render projections; a type declares a projection or declares itself nonvisual, and
   > there is no generic fallback. Rendering may not alter semantic facts — the IR is immutable and
   > the renderer holds no mutation authority. Rendering may not create them: every rendered element
   > resolves to a canonical element or to a declared synthesis class, and the residue — that a
   > view's prose asserts no more than its fields support — is `asserted`.
   >
   > **V-RENDER-X.** Cross-model visual connections are *derived from* registered bindings and
   > compositions, not merely consistent with them. Until a multi-model canvas exists this clause is
   > a commitment, not a constraint, and is marked so.

**The brief.**

8. **"`src/render/` is the place to start; `SceneSubject` and the Learn page's exemplar visuals are
   consumers."** `SceneSubject` is declared *in* `src/render/types.ts:421-423`, not a consumer of it.
   The consumers are `src/ui/shell/workspace.ts:441`, `src/learn/main.ts:137` and
   `src/app/services.ts:584`.
9. **"Whether cross-model visual connections exist at all yet."** They do not, and the brief's
   phrasing leaves room for a partial answer that would have been wrong in either direction. The
   workspace draws one subject at a time (`src/ui/shell/workspace.ts:427`); there is no overlay, no
   composer, and no second panel.
10. **The brief treats R4a and R4b as one "hard half."** R4a — *alter* — is the best-held clause in
    either rule, and it is held by `readonly` in `src/ir/types.ts:590-612` rather than by the
    component model's `may_mutate` query, which is the weaker K2 restatement over a two-edge
    hand-written relation. Only *create* is hard.
11. **"If the compiler can hold it the same way, a large part of V-RENDER becomes `checked`."**
    Correct, and it understates the case: a render strategy gets a rung `semanticBasis` cannot have,
    because its correspondent is `src/render/` rather than an external standard
    (§B.1). The result is not analogous to `semanticBasis`; it is stronger.

---

## I. Open questions for the author

1. **Does the `annotates` arm ship, or does the quantitative scoping land first?** Declaring
   `annotates` records today's behaviour honestly and makes the later change a visible one-line diff.
   Waiting for the IR change keeps the registry's arms aspirational but avoids declaring a shape that
   exists for one release. §B.3 recommends declaring it; the opposite call is defensible.
2. **Should `buildScene` refuse an unresolvable subject, or should the seam validate?** §D-5
   recommends the refusal, on the precedent of the kernel's absent-substrate rung. The refusal is a
   behaviour change at a seam three call sites use.
3. **When does X3's name test land?** It is red until the sibling's split renames `JoinSemantics` and
   `joins`. Landing it audit-only first, then promoting it, matches the repo's discipline for a new
   check that finds a violation at HEAD — but it means the rule ships before its enforcement.
4. **Does V-RENDER-X ship marked as a commitment, or wait for the canvas?** A rule that has never
   been tested against a real drawing is prose. Marking it is honest and cheap; deferring it is also
   honest, and avoids a V-rule whose status line has to be maintained.
