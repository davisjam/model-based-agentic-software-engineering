# Phase E — Renderer — DONE

Branch `wb-render-261002`, based on `be16daee`. Footprint: `src/render/**` plus four
`test/render-*` files (three suites and one fixtures module). Nothing outside that was touched; no orchestrator-owned file was edited.

**Gates:** `npx tsc --noEmit` clean (strict + `noUncheckedIndexedAccess` +
`exactOptionalPropertyTypes` + `erasableSyntaxOnly`). `npm test` 69/69 pass — 11 pre-existing, 58
new. `python3 validate.py models/workbench-components.mage.yaml` clean, including all nine asserted
architectural queries. **No new dependency; lockfile untouched.**

The mid-phase ELK.js question is answered in §7: the seam is landed and tested, ELK is **recommended
for cold layout only**, the integration path costs nothing because an external layout is just a
complete hint set, and the dependency was NOT added.

---

## 1. What was built

| Module | LoC | Responsibility |
|---|---|---|
| `src/render/types.ts` | 366 | Geometry, the closed emphasis vocabulary, the `MarkStyle` non-colour channel table, and the `AccessibleScene` twin types. |
| `src/render/scene.ts` | 221 | The only module that reads the IR's shape: canonical IR → a renderable scene graph. |
| `src/render/layout.ts` | 605 | The `LayoutEngine` seam, deterministic ranking, within-rank ordering, incremental placement from hints, containment regions, edge routing. |
| `src/render/accessible.ts` | 417 | The structured twin: node/edge descriptions, evidence-as-a-step-list, V22 enforcement. |
| `src/render/svg.ts` | 464 | SVG as a serializable node tree, the inline stylesheet, `RenderOptions`, and `renderView` — the only public entry. |
| `src/render/index.ts` | 49 | Public surface. |

The renderer imports from `src/ir/` and nothing else, which is the `rend-ir` edge and no other.

## 2. The three things the brief said make or break the phase

**Layout stability.** Placement is seeded by stable ids and nothing else — no clock, no random, no
insertion order, no Map iteration order. Existing positions are *strong* hints: a hinted node is
pinned at its exact coordinate and never moved, and a fresh node adopts the **pinned frame's** rank
spacing rather than imposing a second grid (step 2 of `place()`), then nudges along the lane axis in
whole pitches until clear. The deliverable test asserts **zero** displacement, and it is paired with
a negative control so it cannot pass by accident:

- `adding one state moves nothing that already had a position` — inserts `archived` at an occupied
  rank, re-lays out with the prior positions as hints, asserts `maxDisplacement == 0` and `<
  LANE_PITCH`, asserts the new node is unpinned and overlaps nothing.
- `the same insertion WITHOUT hints does re-rank, which is why hints exist` — the same insertion
  with no hints displaces a sibling by ≥ one lane pitch. Without this, the first test would pass
  against an insertion that simply happened to be harmless.
- `a hinted node is honoured exactly, at coordinates no fresh layout would choose`,
  `a fresh node adopts the pinned frame's rank spacing, not a second grid`,
  `a pinned region pins its children`,
  `layout is deterministic: the same model places identically every time`,
  `layout does not depend on authoring order of the source document`.

**A second view, never the primary one.** `renderView` returns
`RenderedView { svg, tree, accessible, layout, positions }` and the module exports **no function returning a bare SVG string**. A caller
physically cannot take the picture and skip the twin. Pinned by `the renderer cannot hand back a
picture without its twin` and by the parity test `nothing reaches the picture without reaching the
twin`, which walks the emitted markup, collects every `data-node-id` / `data-edge-id` the SVG
actually draws, and demands the twin account for each. A later edit that adds a visual element
without a semantic counterpart fails there rather than at a screen-reader audit.

Everything positional is restated: containment as `contains` + an explicit containment edge, the
initial marker as `initial`, an arrow as a from/to pair, guards and effects as phrased strings, a
witness as a **numbered list of steps**. Pinned by `containment is restated as a relation, not
carried by enclosure alone`, `direction of an arrow is available as a from/to pair, not as
geometry`, `guards and effects reach the twin, not only the edge label`, `properties reach the twin
even when nothing asks to display them`, `a witness is a numbered list of steps before it is a
coloured path`, `a lasso names where the repeating suffix begins`.

**Self-contained output.** No CDN, no webfont, no remote image, no `href` of any kind; the only
`url()` is a same-document fragment for the arrowhead marker. `the SVG fetches nothing: no CDN, no
webfont, no remote image` strips the one permitted absolute URL (the `xmlns` declaration) and then
asserts no scheme survives anywhere. This pins a constraint that fails *silently* in development.

## 3. Evidence emphasis without colour

`MarkStyle` has **no colour field at all**. Treatments are carried by stroke weight, dash pattern,
opacity and an ASCII marker glyph; the inline stylesheet adds hue as a redundant fourth channel.
For ordered evidence the marker **is the step number**, which is also the join key to the textual
step list.

- `every emphasis kind is distinguishable without colour` — pairwise over `MARKS` + `PLAIN_MARK` on
  the four non-colour channels; two treatments collapsing onto hue is a failure.
- `MarkStyle declares no colour at all, so a colour-only treatment cannot be added`.
- `evidence emphasis is numbered, and the number is the marker`, and every emphasized shape carries
  a `data-emphasis-reason` a non-visual reader can reach.
- `de-emphasis dims by opacity and weight`, `an unnumbered evidence assignment still gets a
  non-colour channel`.

ASCII glyphs rather than dingbats, deliberately: a glyph with no local font coverage is a font
dependency wearing a disguise.

## 4. Cyclic machines and backedges

Ranking follows the plan's two cases, selected by acyclicity: longest-path layering for an acyclic
graph, breadth from the **initial** state for a cyclic machine. The docable `document` machine is
the motivating case — `waiting` has an incoming `retry` edge, so in-degree-zero ranking finds no
seed at all. Every edge pointing back to an equal-or-earlier rank is routed through a dedicated
detour lane beyond the band the nodes occupy, with the lane index assigned by sorted edge id so two
backedges never share one.

- `a cyclic machine ranks by breadth from the initial state` (waiting 0, processing 1,
  {failed, reviewed} 2, published 3).
- `an acyclic graph gets longest-path ranks`.
- `a backedge is routed around the primary layout, not through it` — asserts a vertex beyond
  `lowest + METRICS.detourGap` and that no vertex lands inside any node box.
- `a self-loop is routed as a loop rather than a degenerate zero-length edge`.
- `top-to-bottom transposes the rank axis without changing the ranking`.

## 5. V22 held at the render layer

Bounded coverage downgrades **every** evidence treatment, witness and counterexample alike, and
nothing the view *says* presents a truncated exploration as a disproof. The engine's own outcome is
preserved verbatim in `AccessibleScene.outcome` — the renderer does not rewrite its input — but
`presentableOutcome()` maps `(refuted, bounded) → inconclusive` for everything it writes.

- `bounded coverage is never presented as refuted` — asserts `outcome` is still `"refuted"`, that
  `/refut/i` does not match the summary, that no element anywhere receives the `violation`
  treatment, and that the legend carries `evidence-inconclusive`.
- `bounded coverage draws evidence as inconclusive, never as a counterexample` (markup side).
- `the coverage downgrade applies to witnesses and counterexamples alike`.
- `an unlicensed result reaches the twin as a refusal with its reason` — a refusal is a successful
  result, so there is still a diagram.
- `a view with no result at all states no outcome rather than inventing one`.

## 6. Open items for the orchestrator

1. **`Evidence.cycle` convention — confirm when Phase C lands.** `describeEvidence` reads `cycle`
   as the repeating **suffix of `steps`** (so `cycleStartIndex = steps.length - cycle.length + 1`),
   per the doc comment in `src/ir/types.ts`. If Phase C instead returns the cycle as a separate
   list *not* included in `steps`, one line in `describeEvidence` changes and
   `a lasso names where the repeating suffix begins` catches it.
2. **`views:` is in the model schema but not in the canonical IR.** `mage-model.schema.json`
   defines `views.<id>.{models, machines, direction, show-properties, layout}` — including the
   `layout` position hints this phase consumes — but `canonicalize()` drops the whole section, so
   `CanonicalSystem` has no `views`. Right now `SceneRequest` takes `direction`, `hints` and
   `showProperties` as caller arguments, which works, but **nothing can round-trip a saved view**.
   Two options, both orchestrator-owned: add `views` to the IR (and the hash's semantic
   projection — though position hints are explicitly *not* semantic, so they should be hashed as
   cosmetic, i.e. excluded), or hold view state outside the IR in Phase F's services facade. The
   second is probably right, given "layout hints are view metadata, never semantics", but it needs
   deciding before Phase G persists anything.
3. **Text extents are estimated, not measured** (`METRICS.charAdvance = 7.1`). There is no DOM in
   the Worker or in `node:test`, so a box is sized from character count. The estimate is
   deliberately generous — a too-wide box is cosmetic, a too-narrow one clips. If Phase G wants
   tight boxes it can measure in the page and pass widths back; that is an additive change to
   `LayoutOptions`, not a rework.
4. **Nothing auto-derives de-emphasis.** The channel exists and is tested, but "de-emphasize
   everything not in the evidence" is a focus policy, not a rendering fact, so the renderer exposes
   it and Phase G decides. Flagging so it is not mistaken for a gap.

## 7. ELK.js — assessment, and the seam

Asked mid-phase to assess ELK.js against the stability requirement, keep layout pluggable, and not
add the dependency. Done in that order.

### 7.1 The seam (landed)

`LayoutEngine = (scene: SceneGraph, opts: LayoutOptions) => Layout` in `layout.ts`;
`defaultLayoutEngine` names the built-in; `renderView(system, req, { engine })` injects an
alternative. Switching engines is now a module change. Pinned by `the layout engine is swappable`,
which drives `renderView` through a stub engine and asserts the twin is built from whatever the
engine produced — so an engine swap cannot desynchronize the picture from its accessible
representation.

The engine travels in a separate `RenderOptions` argument rather than inside `SceneRequest`,
deliberately: `SceneRequest` is plain JSON-serializable data so it can cross `postMessage` to the
Worker and be handed to `window.mage` by a CDP-attached agent. A function cannot be serialized.

### 7.2 Does ELK honour prior positions?

**Partly, and not in the way this requirement needs.** Stated as assessment, not measurement — I was
asked not to add the dependency, so I could not run it.

ELK's layered algorithm exposes `INTERACTIVE` strategies for several phases
(`cycleBreaking.strategy`, `layering.strategy`, `crossingMinimization.strategy`, plus
`crossingMinimization.semiInteractive`), and these do read the nodes' existing `x`/`y` to derive
*which layer* and *what order within the layer* each node should get. That genuinely preserves the
**topology of the reading** — a node stays in its column, and left-to-right sibling order is kept.

What it does not do is preserve **absolute coordinates**. Node placement (Brandes–Köpf, linear
segments, network simplex) recomputes positions from the layer contents, so inserting a node widens
its layer and shifts its neighbours. A separate `org.eclipse.elk.fixed` algorithm keeps given
coordinates exactly — but that is "do not lay out", not incremental layout: a new node has no prior
coordinate to keep.

So against the acceptance criterion as written, ELK-with-INTERACTIVE lands in the middle: it would
likely satisfy a *bounded* perturbation test, and would fail the **zero**-displacement test that is
currently in the suite. For the interaction this feature exists to support — a side-by-side of a
model and a hypothetical variant of it — my judgement is that bounded is not good enough and zero is
the thing worth having. Everything shifting by 40px is not as bad as a re-rank, but it still breaks
the visual diff the user is performing.

### 7.3 Recommendation: hybrid, and the integration is already free

Take ELK for **cold** layout and keep the pinning pass for everything after. That is the
coordinator's option 2, and the integration cost turned out to be near zero, because an external
cold layout is **just a complete hint set**:

```
ELK (async, in the Worker)  ->  positions  ->  renderView({ hints: positions })
```

The pinning pass honours every hint exactly, so ELK's coordinates survive untouched, and the next
edit perturbs locally on top of ELK's frame. Pinned by `an external cold layout enters through the
hint mechanism, exactly`, which feeds in an ELK-shaped coordinate set, asserts every node lands on
it, then adds a state and asserts zero displacement of the rest. `positions round-trip as hints
without drift` pins the fixed point, so repeated renders of an unchanged model never creep.

This is worth stressing because it removes the one architectural objection I had: **ELK does not
need to implement `LayoutEngine`.** elkjs is promise-based and intended to run in a Worker, so it
cannot satisfy a synchronous signature — and does not have to. Keeping it upstream of `renderView`
rather than inside it means `renderView` stays synchronous, `SceneRequest` stays serializable, and
the async boundary sits where the architecture already has one (SEMANTICS.md §12: the engine runs in
a Worker from the first commit).

**What ELK buys** that the built-in engine does not do: real crossing minimization (mine is a
two-pass barycentre sweep), proper compound-node layout for nested containment (mine places region
children in a single row), and port-aware orthogonal edge routing (mine routes elbows and detours by
hand). On the eight example models those limits are not visible; on a student's 40-entity model they
will be.

**What it costs:** bundle size is the real one — elkjs is on the order of a megabyte or two
minified, against a current `dist` of a few tens of kilobytes, in an artifact that must be
self-contained (no CDN, so it ships in the bundle). Loading it only in the Worker, and only for a
cold layout, confines that cost; it is still the largest single thing in the project. Second cost:
it is a J2CL transpile of a Java codebase, so when it misbehaves the stack is not readable.

**My recommendation, concretely:** adopt ELK for cold layout, behind the hint seam, in a phase of
its own after G — not now. The built-in engine is good enough for the eight example models, the
stability property is already held and tested, and the honest next step is the cheap experiment
rather than the adoption: add elkjs in a scratch branch, lay out the largest example both ways,
compare edge crossings and whether an INTERACTIVE re-layout after one insertion stays under one lane
pitch. That is an hour, it is falsifiable, and it answers the question I could only reason about. If
the crossing count on the real models is not materially better, the right answer is to record ELK as
considered-and-rejected on bundle size and keep the built-in engine.

**Not adopted, no dependency added, lockfile untouched** — as instructed.

### 7.4 One thing to correct in the author's note

"ELK deliberately only computes layout, leaving SVG semantics/rendering to us" — correct, and it is
the right reason to prefer it over Mermaid or PlantUML. But it does not follow that ELK is
compatible with *this* phase's hardest requirement, which is about layout, not rendering. The
quoted advantage is real and orthogonal.

## 8. On PLAN.md §E — what I would change

§E is accurate and I did not have to re-derive anything from it. Three notes rather than
corrections:

- **§4.1's "existing positions are strong hints" needed one decision the plan does not make:**
  whether a hint constrains the *rank grid* as well as the node. Pinning only the node and keeping
  the fresh grid for everything else produces a layout where new nodes sit at coordinates from a
  different frame. I read "strong" as covering both and made the pinned frame authoritative for
  rank spacing. If that is wrong it is one function (`alongForRank`).
- **§4.2 lists "selection, evidence emphasis, violation treatment, de-emphasis" but not the
  hypothesis diff**, which §5 and SEMANTICS.md §12 both require ("a hypothesis renders on the
  *same* layout with added, deleted and changed elements visually distinguished"). I added `added`
  / `removed` / `changed` to the emphasis vocabulary and a test
  (`a hypothesis diff renders on the same layout with each change stated`). Worth folding into §4.2
  so the next reader does not think it is out of scope.
- **§4.3 says "emit the structured representation alongside the SVG".** I made that stronger than
  "alongside": there is no way to get one without the other. If the intent was a looser coupling —
  e.g. a caller wanting positions without a picture — `layoutScene` and `buildScene` are exported
  for exactly that, and neither produces visual output.

One defect found and fixed in passing, worth recording because it would have shipped invisibly:
quoted font names in the inline stylesheet serialize as `&quot;`, which is not reliably decoded back
when the markup is inlined into an HTML document — it silently breaks the CSS rule. The stylesheet
is now free of `"` and `the inline stylesheet survives XML escaping` pins it.
