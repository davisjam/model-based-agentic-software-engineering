# The shell — information architecture under UX-I8: design

The specification is `requirements-progressive-disclosure-261002.md`, the author's verbatim text.
Its verdict on the shipped page: *"It reads like an executable specification/debug console, not a
workbench."* Its scope ruling is equally explicit: do not redesign the model kernel. This is an
information-architecture and interaction-design pass over `index.html` and `src/ui/`, and this
document turns the ten corrections and the new invariant into an implementable design.

What this pass does NOT touch: `src/ir/`, `src/engine/`, `src/transaction/`, `src/yaml/`,
`src/rdf/`, `src/sparql/`, `src/quant/`, `src/validator/`, `src/render/` (consumed, not changed),
`src/worker/`, and the services facade (`src/app/services.ts`). Every surface this design describes
composes existing services. Where a correction looks like it needs a kernel change, §4 shows it
does not.

The one conceptual correction, from the spec:

> Human-accessible does not mean simultaneously visible. Machine completeness is provided by the
> API; human completeness is provided by navigation.

---

## 1. UX-I8, and the three invariants it collides with

**UX-I8 — Progressive disclosure** (normative, verbatim in the spec): every semantic capability
SHALL be human-accessible, but exposed in the context of the model, property, evidence, or element
it applies to. Exhaustive representations SHALL NOT constitute the default workspace.

Three existing invariants read differently once the default workspace stops being exhaustive, and
each needs a ruling rather than a shrug:

- **UX-I1 (affordance parity)** — "has a human affordance" was checked as "a wired control
  exists". Under disclosure a control can exist and be findable by nobody. §2 rules on this.
- **UX-I2 / FR-A11Y-2 (evidence parity, accessible representations)** — collapsing content can
  make it unreachable to assistive technology, and the author's permission ("a semantic model tree
  can provide equivalent keyboard/AT access") is not yet a structure or a test. §3 rules on this.
- **UX-I3 / FR-AGENT (convergence, live agent)** — a navigable shell has selection state the flat
  page did not. Whether an agent may read and set it, and what happens when an agent mutates a
  model the human is not looking at, is §4's ruling.

## 2. Ruling — UX-I1's human affordance becomes a verified reachability claim

### 2.1 The problem, precisely

`checkAffordanceParity` (`src/app/capabilities.ts:497`) asks whether any human affordance has
`status: "wired"`. That was sufficient while every control sat in the document: wired implied
visible implied findable. The shell breaks the implication. A rename action that exists only in a
selected entity's inspector is wired, invisible on load, and reachable only by a navigation path —
and nothing in the registry says what that path is, so nothing can check it.

The failure to refuse outright: a `path` field that is prose. A plausible-but-unverifiable
reachability declaration is worse than the status quo, because it reads as an invariant and holds
nothing. So the declaration must be machine-walkable, and something must walk it.

### 2.2 The ruling

**A human affordance is wired only if it declares a navigation path from the default loaded
workspace to the control, over a closed surface vocabulary, and the browser tier walks that path
keyboard-only and reaches a live control.** UX-I8 therefore amends UX-I1's interpretation rather
than voiding it; the §G1 question asks the author to ratify the amended reading.

The registry change, in `src/app/capabilities.ts`:

```ts
/** The shell's navigable surfaces. CLOSED: a path step naming anything else fails statically. */
export type NavSurface =
  | "header" | "start" | "nav-models" | "nav-properties" | "workspace" | "inspector"
  | "askbar" | "statusbar" | "palette" | "review" | "system-browser" | "advanced-query";

/** What must already be true before this step can be taken. Closed, so a harness can set it up. */
export type NavPrecondition =
  | "loaded" | "selection:element" | "selection:relation" | "selection:model"
  | "property-exists" | "hypothesis-open" | "exhausted-answer";

export interface NavStep {
  readonly surface: NavSurface;
  /** How the step is taken: activate a control, open a disclosure, open a menu, a shortcut. */
  readonly via: "activate" | "disclose" | "menu" | "shortcut";
  readonly requires?: NavPrecondition;
}

export interface Affordance {
  readonly at: string;
  readonly status: AffordanceStatus;
  readonly note?: string;
  /** HUMAN affordances only: the declared route from the default workspace to the control. */
  readonly path?: readonly NavStep[];
}
```

An empty path means "visible in the default workspace" (header Undo, the ask bar). A path of
`[{surface:"inspector", via:"activate", requires:"selection:element"}]` means "select an element,
act in its inspector".

### 2.3 What checks it, at three rungs

1. **Static (node tier, extends `checkAffordanceParity`).** Every `wired` human affordance
   declares a `path`; every step's surface is in the vocabulary; every `requires` is in the closed
   precondition set. A missing path is a UX-I1 violation naming the capability. The companion
   closure check: every `NavSurface` value maps to a landmark or control id the page declares (a
   SURFACES table exported by the shell), so a path cannot cite a surface nobody built.
2. **Derivation (browser tier).** The keyboard drive for each affordance is **generated from its
   declared path**, not hand-written: the harness establishes the step's `requires` precondition
   from a loaded example, then takes each step keyboard-only (Tab/arrow to the surface's landmark,
   activate/disclose/menu as declared), and asserts the terminal control exists, is focusable, and
   is enabled. A path that types-check but no human can follow fails HERE — the drive IS the
   declaration, executed. This generalizes what `test/browser/a11y/keyboard.test.mjs:497` does
   today for §19's thirteen operations by hand; the thirteen stay as a verbatim floor, and the
   generated walks cover the full registry.
3. **Receipt.** The browser gate asserts walked-path count equals registry wired-human-affordance
   count, by derivation (the pattern `test/capabilities.test.ts:326` already uses for the
   operation count), so a path silently skipped reads as a red gate rather than shrunk coverage.

### 2.4 Migration

The field lands optional with the checker reporting path-less wired affordances as a known set the
test asserts (the house pattern: an accurate violation over a comfortable number — the
`explore-space` precedent, `capabilities.ts:250`). Each shell wave drains its own region's
affordances; the final wave flips the checker so a wired human affordance without a path is a hard
UX-I1 violation.

## 3. Ruling — the AT surface is the model tree, produced at the render seam

### 3.1 The two ways to get this wrong

- **Hide-behind-disclosure.** `display:none` content with no disclosure control is simply absent
  to AT. Collapsing the entity tables into nothing voids FR-A11Y-2.
- **Render-everything-and-visually-hide.** Keeping the whole flat page in the DOM and hiding it
  with CSS gives a screen-reader user exactly the wall the sighted user was just spared. The
  author's sentence — "sighted users get progressive disclosure" — must not be implemented as
  "blind users keep the debug console".

The structure that satisfies both: **disclosure is symmetric.** Every collapsed region is behind a
real disclosure control (`<details>/<summary>`, or a button carrying `aria-expanded`) that is in
the tab order and announces its state. A keyboard/AT user and a sighted user open the same things
by the same acts. No semantic content is ever hidden without a control that reveals it.

### 3.2 The semantic model tree

The AT-equivalent of the canvas-centred workspace is a **model contents tree**: a structured,
keyboard-navigable rendering of the principal model — entities, relations (with type, meaning, and
absence semantics one disclosure deep), machines, states, transitions — placed BEFORE the canvas in
DOM order. Selecting a tree node is the same act as clicking the canvas node: both set the one
selection (§4) and populate the inspector. The tree is an interaction surface, not a caption —
`requirements-ux-261002.md` §16 already requires exactly this ("a structured model tree/list
therefore serves as a full semantic interaction surface").

**The seam that produces it is the renderer's structured twin, and nothing else.** The
`RenderPort` contract (`src/app/ports.ts:80-95`) makes the SVG unobtainable without the
`AccessibleScene` (`src/render/accessible.ts`); the tree renders the scene the canvas draws, from
the SAME `RenderedView` in the same paint. This is the landed lesson applied: a stub standing in
for the real renderer in `realPorts` silently voided the accessible-view requirement at the one
seam that produces it — so the shell consumes `workspace.renderView()` and derives both the SVG
and the tree from its one return value, and SH-I7 pins that they cannot come from different calls.
System-level facts the scene does not carry (the model list, properties, provenance) come from the
view model (`src/ui/view-model.ts:850 buildViewModel`), which stays the producer for the rails and
inspector.

### 3.3 The equivalence pin

"Equivalent access" is a claim, so it gets a test, and the test derives its expectations from the
machine representation rather than from a hand-list that rots. **SH-I3**: a browser-tier test
loads an example, reads `window.mage.inspect()`, and asserts for every entity, relation, model,
and machine that the tree (or the inspector reached by activating its tree node) exposes it by
accessible name — and for every evidence-bearing property in `window.mage.properties()` that the
property's workspace view exposes its steps as the numbered list `AccessibleScene` already emits.
That is UX-I2 made walkable: the machine answer is the oracle for what the human surface must be
able to reach.

### 3.4 The canvas

The canvas keeps `aria-hidden` (its facts are in the tree; un-hiding it would be the announcement
storm `index.html:580-583` names) and becomes an input surface: pointer-only hit targets for
select, a context action on selection, blank-space + Add. **SH-I4: no focusable element inside the
aria-hidden figure** — a focusable descendant of `aria-hidden` is an axe violation and a trap. The
keyboard path to everything the canvas can do is the tree and the palette, which FR-A11Y-2's
"editing and query execution possible without the canvas" already requires and the a11y tier
already drives.

## 4. Ruling — selection is agent-visible view state; disclosure is chrome

⚠️ As-built note: the audit (`AUDIT-v0.1-261002.md` §4.2) records cdp-agent §12 view operations as
NOT satisfied. That row is stale: `window.mage.view.select/selection/focus/target` and the
`ViewState` object landed since (`src/app/agent-api.ts:244-256`), wired through the composition
root (`src/ui/main.ts:166`). Only `show({result})` remains unbuilt.

The ruling, in three parts:

1. **Selection and the principal target ARE authoritative view state, and the agent reads and
   writes them.** `requirements-cdp-agent-261002.md` §5 says it directly: "Selection is therefore
   part of agent-visible context, although it is not semantic model state." The shell adopts the
   existing `ViewState { target, selection }` as its one navigation state: the models rail sets
   `target`, the tree/canvas/inspector set `selection`, and `window.mage.view.*` sets both. One
   state, two writers, every reader painting from it — UX-I3's shape applied to view state.
   Non-semantic stays non-semantic: not in the IR, not hashed, not in undo history
   (`requirements-ux-261002.md` §18: view-only actions need not enter semantic history).
2. **Disclosure state is chrome, and none of the agent's business.** Which `<details>` are open,
   which inspector tab is lit, whether the palette is up: not in `ViewState`, not in `context()`,
   not API. FR-AGENT-1 already draws this line ("implementation internals SHALL NOT be treated as
   agent API"); an agent that wants the human looking at something says so semantically
   (`view.focus`, `view.select`), and the shell makes the disclosed state follow selection.
3. **Semantic mutation never navigates (SH-I6).** When an agent commits a transaction against a
   model the human is not viewing, every projection repaints — the properties rail re-evaluates,
   the status chip updates, the announcer names the moved verdicts (`src/ui/main.ts:93-120`, which
   already announces agent edits) — but `target` and `selection` do not move. Stealing the
   human's navigation on every mutation is FR-A11Y-3's focus theft, one level up. Deixis is the
   agent's explicit act: `view.focus` then `view.select`, which the student watches happen.

**Dangling selection (SH-I5).** A transaction can delete the selected element or the principal
model. View state is validated against the new system on every repaint: a vanished selected
element collapses selection to its model; a vanished target falls back to the first model;
`view.selection()` never returns an id the current system lacks. Stated here because it is the
first place the flat page's "selection cannot dangle, there is no selection" stops being true.

## 5. The shell

The author's normal loaded state, which this design treats as the normative hierarchy (geometry
non-normative, per `requirements-human-ux-261002.md` §4):

```
┌──────────────────────────────────────────────────────────────────────┐
│ MAGE   Message Bus                              Undo  Redo  ⋯       │
├───────────────────┬──────────────────────────────────┬───────────────┤
│ MODELS            │ Event Flow                       │ INSPECTOR     │
│ Event Flow        │ Which services may publish or    │ (selection-   │
│ Data Policy       │ receive each event type?         │  scoped)      │
│ Event Propagation │   [ MODEL CANVAS ]               │               │
│ + Model           │   (model contents tree is its    │ Notes         │
│ PROPERTIES        │    DOM-first structured twin)    │ Provenance    │
│ ✓ / ✗ / ? rows    │ ▸ represents ▸ omits ▸ history   │               │
│ + Property        │                                  │               │
├───────────────────┴──────────────────────────────────┴───────────────┤
│ Ask about the model system…                      [Ask]   ✓ Valid    │
└──────────────────────────────────────────────────────────────────────┘
```

| Region (`NavSurface`) | Holds | Module (new) | Stable ids kept |
|---|---|---|---|
| `header` | title, system name, Undo, Redo, ⋯ menu (Export, Run all, System Browser, Advanced query, Learn) | `src/ui/shell/header.ts` | `undo`, `redo`, `export`, `run` |
| `start` | empty-workspace Start; unmounts on load | `src/ui/shell/start.ts` | `example-choice`, `example-load` |
| `nav-models` | model list: name + purpose question; + Model | `src/ui/shell/nav.ts` | — |
| `nav-properties` | property rows: status word + claim; + Property | `src/ui/shell/nav.ts` | `question-list` (the browser tier pins it, `index.html:478-480`) |
| `workspace` | principal model: purpose, canvas, contents tree, ▸represents ▸omits ▸notes ▸history | `src/ui/shell/workspace.ts` | `canvas`, `diagram-text`, `principal-purpose` |
| `inspector` | selected object: properties, relations, appears-in, ▸notes ▸provenance | `src/ui/shell/inspector.ts` | — |
| `askbar` | ask input + suggestions; `[Ask]` | `src/ui/shell/askbar.ts` | `ask-answer` |
| `statusbar` | ✓ Valid / N findings chip; analysis in flight | `src/ui/shell/status.ts` | — |
| `palette` | ⌘K command palette | `src/ui/shell/palette.ts` | — |
| `review` | REVIEW CHANGE surface for hypotheses | `src/ui/shell/review.ts` | `hypothesis-bar` ids |
| `system-browser` | the exhaustive entity/relation tables, on demand | `src/ui/shell/browser.ts` | — |
| `advanced-query` | the structured query builder (today's ask form) | `src/ui/shell/askbar.ts` | `ask-form` … `ask-go` |

`#live` (the one polite announcer) and `#banner` survive unchanged. `src/ui/main.ts` shrinks to
the composition root: ports, workspace, `window.mage`, region mounting — the role its own header
claims (`src/ui/main.ts:1-7`).

## 6. The ten corrections, made implementable

Numbered as the author numbered them.

**1 — Start is an empty-workspace experience.** `start.ts` renders create / open / example cards
(title, description, model count — read from `ExampleCatalog.describeAll()`, as now) and is
mounted only while `WorkspaceState.loaded` is false; on load it unmounts (SH-I1). The
developer-retrospective paragraph at `index.html:256-261` is deleted outright. Worth recording:
that paragraph IS the DEFECT-1 fix (`f74cd538`) — the repair of the false "Two examples ship"
text shipped a retrospective about the repair as product prose. The correction closes the defect's
defect.

**2 — Models are navigation.** `nav.ts` lists each model as name + purpose question (both already
in `buildViewModel`'s model rows; UX-I4 requires the purpose block). Activating one sets
`viewState.target`. The workspace header shows the purpose; `represents`, `omits`, notes, and
history sit in disclosures directly beneath it (§5.1 of `requirements-human-ux-261002.md`
explicitly permits represents/omits to be "directly inspectable" rather than permanently visible).

**3 — The inspector replaces the global tables.** Selection resolves to an entity, relation,
model, or machine; the inspector shows its type, properties, relations, appears-in (the §8
cross-model navigation: activating an appearance sets `target`), and disclosed notes/provenance.
Relation selection uses the composite addressing `view-model.ts:443 RelationRef` already defines —
relations have no ids, and inventing ids for them would be a kernel change this pass refuses. The
exhaustive tables move to the **System Browser** (`⋯ → System Browser`), which becomes the new
`at:` site for the `inspect` capability's table affordance; the tree+inspector are registered as
additional wired affordances of `inspect` with their paths.

**4 — Editing is contextual, plus a palette.** The ten always-visible fieldsets
(`index.html:322-468`) are replaced by: a `+ Add` menu on the workspace toolbar (entity, state,
relation, model, note); per-selection actions in the inspector (Rename, Set property, Connect,
Delete); and a ⌘K palette listing every operation with its precondition. Each action opens one
small focused dialog and submits through the existing `planEdit` (`src/ui/view-model.ts:501`) into
the one `submitEdit` funnel — the machine API stays orthogonal and exhaustive, untouched. The `+
Model` menu consumes the model-type registry the UX-I9 wave is building: one row per public model
type, question-first ("Structural Graph — what is connected to what?"), with a trailing "Not sure?
Learn about model types" link into the Learn gallery. This design consumes that registry's
id/question/learn-anchor and deliberately does not define it.

**5 — The ask bar is the primary question surface.** A persistent bottom input. On focus it offers
the loaded example's suggested questions plus contextual deterministic questions for the current
selection ("Can anything reach Analytics?"), each a prebuilt query submitted through
`workspace.evaluate` — the same service as today's ask form. Typed text filters that catalogue; it
is not parsed as natural language (the spec leans on the coding agent for NL; §G2 asks the author
to confirm the filter reading). The structured builder — today's `form-ask`, including its hint
about behavioural questions having no menu spelling — moves intact under `⋯ → Advanced query`.

**6 — Properties get the persistent rail.** Always visible, every row a status WORD plus claim
(never colour or glyph alone — the house rule at `index.html:109`). Activating a row makes the
property the workspace's subject: claim, status, models used (UX-I5 grounding, already computed),
and evidence steps. The two-pane models-side-by-side sketch in the spec is the Separate-mode
presentation `requirements-human-ux-261002.md` §6.2 describes; this pass ships the single-subject
property view with the grounding and evidence, and leaves Separate/Linked unbuilt as before — the
property view is where Separate mode will plug in when it lands.

**7 — Promotion is almost trivial.** A YES/NO answer in the ask bar carries `[Inspect evidence]`
and `[Track as property]`. Track prefills the save dialog: the claim restated as an assertion, a
derived id, no quantifier or expectation controls visible — one field, one button, submitting the
same `save-query` operation the form submits today (`capabilities.ts:384-399`). From a tracked
property's `⋯`: **Make requirement**, which sets the expectation field — the existing machinery by
which "declaring an expectation makes it a requirement" (`index.html:528-531`). The full lifecycle
(ask → query → track → property → require → obligation) therefore needs NO new kernel construct;
the audit's "no requirement construct" residual is unchanged by this pass, and the Make-requirement
verb is honest about being an expectation on a saved query.

**8 — Changes get a review surface, not radio buttons.** The `edit-mode` fieldset
(`index.html:295-313`) is deleted. A human edit commits normally: transactions are the
architectural guarantee, not a ceremony. A hypothesis — opened by an agent through
`window.mage.hypothesis.open`, or by a human through the palette's "Start a what-if" — replaces
the current banner-plus-two-buttons with the REVIEW CHANGE surface: the operations grouped per
model, then PROPERTY IMPACT computed by diffing `properties()` evaluated on the authoritative
branch against the hypothesis branch (`hypothesis.compare()` already re-runs the saved queries on
the branch, `agent-api.ts:364`), then Discard / Commit. Deleting the radios deletes
`create-hypothesis`'s human affordance (`edit-section.hypothesis-target`,
`capabilities.ts:429-437`) — the palette entry is its replacement, and the registry change rides
in the same wave so UX-I1 never reports a gap that is really a move. Whether a CONSEQUENTIAL
authoritative human edit should transparently become a hypothesis and get the same review is §G3.

**9 — Validation is quiet when green; provenance moves to the object.** The status bar shows
`✓ Valid` or `3 findings`; activating it opens the findings panel (same rows, same V-rule text).
The page-long provenance section (`index.html:569-577`) is removed; provenance renders in the
inspector's disclosed Provenance block, and a model's "Asked for" prompt renders in the model
header's History disclosure — one click from the purpose, because the prompt is the field that
earns the feature. This contradicts the standing rationale in `capabilities.ts:416-421` ("it gets
a prominent section rather than a row in the inspector…"); the new spec wins, and that comment is
rewritten in the wave that moves the section.

**10 — The diagram is the workspace.** The canvas moves to the visual centre of the workspace
region. Document order does NOT invert: the model contents tree (§3.2) precedes the canvas in the
DOM, the canvas stays `aria-hidden`, and the head comment in `index.html:7-10` ("the canvas is
last and the structure is first") is rewritten to say what is now true — the structured view is
first in DOM and in AT order, and the canvas is the sighted user's primary surface. Visual
hierarchy and accessibility order are different orderings of the same facts, and conflating them
is how the old page ended up exhaustive.

## 7. Superseded clauses — the ledger

The audit's sharpest finding (§8.3) was that requirement transcripts get reversed by rulings and
never amended, making "requirements-and-nothing-else" the most misleading read of the repo. This
table is the amendment record for the UX pair; the transcript files stay verbatim, per the
standing rule that the author's text is not edited.

| Where | Old text | Status under UX-I8 |
|---|---|---|
| `requirements-human-ux-261002.md` §4 | default layout with `Separate \| Linked` header toggle and a QUERY/EVIDENCE bottom panel | **Superseded** by the spec's §"normal loaded state": ask bar bottom, no mode toggle. §6's Separate/Linked modes remain specified-and-unbuilt, unchanged. |
| `requirements-human-ux-261002.md` §17 / examples §3 | empty workspace offers create/load/import prominently | **Restored, not contradicted** — both already scope Start to the EMPTY workspace. The shipped always-visible Start exceeded the old spec; correction 1 returns to its letter. |
| `requirements-ux-261002.md` §20 table | human affordances named as `model-section.tables`, `validation-section.table`, `provenance-section.records` | **Re-sited.** The capabilities survive; their `at:` sites become the tree/inspector, the status-bar findings panel, and the inspector provenance block, each with a declared path (§2). The System Browser keeps a tabular `inspect` affordance. |
| `index.html:7-10` (head comment) | "the canvas is last in the document order and the structure is first" | **Half survives.** DOM/AT order unchanged; the visual-epilogue half is superseded by correction 10. |
| `index.html:560-567` + `capabilities.ts:416-421` | provenance earns a prominent top-level section; "buried in a metadata list, nobody finds it" | **Superseded** by correction 9. The discoverability concern is answered by placement (History one disclosure from the purpose), not by prominence. |
| `index.html:295-313` | per-edit authoritative-vs-hypothesis radio buttons as `create-hypothesis`'s human affordance | **Superseded** by correction 8; affordance moves to the palette. |
| `requirements-ux-261002.md` §10.1 "structured query controls" as the ask surface | the always-visible query builder | **Demoted, not removed** — the builder is the Advanced surface; the SHALL ("execute supported queries without writing SPARQL") is satisfied by the ask bar. |

## 8. Invariants, and what pins them

| ID | Statement | Pinned by |
|---|---|---|
| SH-I1 | The Start surface is mounted iff no system is loaded; Start and the workspace are never both mounted. | NEW browser test (extends the four-state matrix of `axe.test.mjs:146`) |
| SH-I2 | Every collapsed semantic region sits behind a disclosure control that is in the tab order and announces its expanded state; no semantic content is CSS-hidden without one. | NEW a11y-tier walk: enumerate `[hidden]`/`details` regions, assert a labelled controlling element |
| SH-I3 | Every entity, relation, model, and machine in `window.mage.inspect()`, and every evidence step in `properties()`, is exposed by accessible name through the tree/inspector/property view. | NEW browser test, oracle derived from the machine API (§3.3) |
| SH-I4 | The `aria-hidden` canvas contains no focusable element. | NEW a11y assertion (one query over the figure) |
| SH-I5 | View state never dangles: after every repaint, `selection ⊆ current system`, `target` resolves. | NEW node test over the shell's repaint reducer + agent-API drive |
| SH-I6 | A committed transaction changes no view state; only `view.*` and human navigation do. | NEW node test: transact under a set selection, assert `ViewState` unmoved |
| SH-I7 | The workspace SVG and the model contents tree derive from one `RenderedView` per paint (same `systemHash`, same scene). | NEW node test over `workspace.ts`'s paint path |
| SH-I8 | Every wired human affordance declares a `path` over the closed surface vocabulary, and the browser tier walks every declared path keyboard-only to a live control. | extended `checkAffordanceParity` + NEW derived-drive browser gate (§2.3); UNTESTED until wave 3 flips it hard |

UX-I4's §5.1 clause (the principal model shows its purpose) continues to be checked by
`checkPurposeVisibility` (`src/ui/invariants.ts:45`); the checker reads the view model, so it
moves with the view-model restructuring in wave 0 and its test updates in the same change.

## 9. Waves

The two shared hotspots are `index.html` and `src/ui/main.ts`. Wave 0 exists to break them into
the per-region modules of §5 so the later waves have disjoint footprints. Browser-tier tests pin
ids and behaviours; **the wave that moves a surface updates that surface's tests in the same
wave**, and ids in §5's "stable ids kept" column do not change at all.

| Wave | Scope | Footprint (exclusive) | Serializes? |
|---|---|---|---|
| **0 — skeleton** | Grid regions in `index.html`; Start gating (SH-I1); split `main.ts` into composition root + region modules with CURRENT behaviour moved, not changed; status bar shell; SURFACES table | `index.html`, `src/ui/main.ts`, `src/ui/shell/*` (new), `src/ui/invariants.ts`, `test/browser/**` selector updates | YES — runs alone, and only after the agent now live in `index.html` reports done (CLAUDE.md: gate the next writer on the writer's own signal) |
| 1a — navigation | models + properties rails; target/selection wiring | `src/ui/shell/nav.ts`, `test/shell-nav.test.ts` | parallel within wave 1 |
| 1b — inspector | selection → inspector; appears-in navigation; notes/provenance disclosures | `src/ui/shell/inspector.ts`, `test/shell-inspector.test.ts` | parallel |
| 1c — ask bar | ask bar + suggestions + promotion buttons; Advanced query relocation | `src/ui/shell/askbar.ts`, `test/shell-askbar.test.ts` | parallel |
| 1d — registry | `NavStep`/`NavSurface`/`path`; static checks; known path-less set | `src/app/capabilities.ts`, `test/capabilities.test.ts` | parallel (disjoint from shell files) |
| 2a — editing | `+ Add`, contextual actions, palette, dialogs over `planEdit`; `create-hypothesis` re-siting | `src/ui/shell/palette.ts`, `src/ui/shell/edit-dialogs.ts`, `test/shell-edit.test.ts` | parallel within wave 2 |
| 2b — workspace | canvas-centre, contents tree, purpose disclosures, SH-I4/I7 | `src/ui/shell/workspace.ts`, `test/shell-workspace.test.ts` | parallel |
| 2c — review | REVIEW CHANGE surface; property-impact diff; radios deleted | `src/ui/shell/review.ts`, `test/shell-review.test.ts` | parallel |
| 2d — derived drives | path-walking browser gate + receipt (§2.3); SH-I2/I3 tests | `test/browser/a11y/paths.test.mjs`, `test/browser/a11y/equivalence.test.mjs` | after 1d (needs the vocabulary); parallel with 2a-c (test files only) |
| **3 — closure** | System Browser; dead form code deleted from `view-model.ts`/`render-dom.ts`; registry `at:`/path drain to zero; SH-I8 flipped hard; `capabilities.ts` comments corrected (§7 ledger) | `src/ui/shell/browser.ts`, `src/ui/view-model.ts`, `src/ui/render-dom.ts`, `src/app/capabilities.ts`, tests | YES — touches registry AND shell AND tests; nothing else in flight |

Wave boundaries: 0 → {1a,1b,1c,1d} → {2a,2b,2c,2d} → 3. Every wave lands with `tsc --noEmit`
clean AND the full suite — the 261002 lesson that a clean merge can type-break a green test tree.

### 9a. Wave 0 as built — four places the table above was wrong

Appended by wave 0 after landing, because waves 1a–1d read this table to know which file is theirs
and three of these would otherwise be discovered as a surprise.

- **`src/ui/shell/edit-forms.ts` exists, and §5 gives it no row.** The ten always-visible editing
  fieldsets have no region in the finished shell — correction 4 replaces them with a `+ Add` menu,
  inspector actions and a palette — so the table assigns them nowhere. Leaving their handlers in the
  composition root would have made `main.ts` the file waves 2a and 2c both edit, which is the hotspot
  wave 0 exists to break. They have a module of their own, declared a holding pen in its own header,
  and waves 2a and 2c drain and delete it. The `submitEdit` funnel is exported from there; the ask
  bar's Save and Retract send through it.
- **`NavSurface` lives in `src/ui/shell/surfaces.ts`, not in `capabilities.ts`.** §2.2 sketches the
  union beside `NavStep` in the registry, and §2.3 asks the shell to export the SURFACES table. Those
  two cannot both happen without splitting one fact across two files owned by two waves, and the
  registry importing a VALUE from `src/ui/` would invert the layering. So the vocabulary sits with
  the table, and wave 1d's `NavStep` takes it by `import type` — no runtime dependency from
  `src/app/` on `src/ui/`. The table also carries a `planned` member, because the palette does not
  exist and a table that implied it did would be the unverifiable declaration §2.1 refuses.
- **Wave 1a's footprint is bigger than `nav.ts`.** The view-model-to-DOM binder (`render-dom.ts`'s
  `paint`) writes all four readouts, including the property rail's rows, and wave 3 owns that file.
  So wave 1a cannot change how a property row reads without either growing a renderer inside
  `nav.ts` or editing a wave-3 file. Wave 0 left the binder whole rather than splitting a file it
  does not own; whoever takes 1a should decide which, early, and say so.
- **The exhaustive readouts went to `system-browser` together, provenance included.** Correction 9
  sends provenance to the inspector (wave 1b), so it needed a holding pen for one wave. It is an
  exhaustive tabular readout of the whole system, which is the System Browser's genre, so it waits
  in that region's markup rather than in a pane wave 1b would have to clear out. The root paints it,
  not `browser.ts` — a module that never claimed it is a module nobody has to strip it from.

What wave 0 did NOT do, to be explicit: no `NavStep`/`path` field, no closure check over the table
(that is 1d's), no contents tree, no disclosures, no palette, no ask input, no inspector content.
`inspector.ts` and `nav-models` land as named regions reporting the one fact each can know.

### 9b. Wave 1a as built — the §9a decision, and what it leaves for 1d and 3

Appended by wave 1a after landing. §9a asked whoever took this wave to decide early whether the
rails grow a renderer or edit the binder, and to say so.

- **Both, in one direction: the renderer is in `nav.ts`, and the binder gave up one root.** The
  rail's ROW is a new rendering — a mark, a status word, the claim, a disclosure — not a restyled
  `propertyBlock`, so there was nothing to lift out of the binder. But leaving `paint` writing
  `#question-list` would make two authors race on paint order, so `paint`'s `roots` lost
  `properties` and the composition root stopped resolving it. `propertyBlock` stays exported from
  `render-dom.ts` and the rail imports it for the full reading it discloses: one module still
  decides how a property reads in full. **Wave 3 inherits a `paint` with three roots, not four** —
  a removal in the direction that wave's own work already runs, and NOT the four-readouts split
  wave 0 refused.
- **Two typed fields landed on `PropertyRow`** (`view-model.ts`): `statusKey`, the status as the
  typed `PropertyStatus` the rail's three-valued mark branches on, and `groundSubjects`, the
  UX-I5 grounds as `subjectValue`-shaped targets. Both exist so the rail reads STRUCTURE instead of
  parsing the display prose — §10's `checkModelPlurality` lesson, applied before it bit again.
- **The property rail's full reading stays inside `#question-list`, and that was forced.** The
  registry declares `inspect-evidence`'s human site as `.evidence` *within* `#question-list`
  (`capabilities.ts:341`), so moving the full block to another host would have broken a binding this
  wave cannot edit. The disclosure is therefore in the rail rather than in a holding pen.
- **Correction 6's "the workspace changes to explain that property" is HALF built, deliberately.**
  Activating a claim moves the workspace to the first model the verdict derives from — navigation
  this wave owns, because it only writes `viewState.target`. The property-as-workspace-SUBJECT view
  (claim, status, models used, evidence occupying the centre) is a surface in `workspace.ts`, which
  is **wave 2b's file**, and a property is not a `SceneSubject`: representing one needs either a
  third axis in `ViewState` or a subject union the renderer does not have. Wave 2b owns that call.
- **What wave 1d must declare**, one `path` per rail affordance, all from the default workspace:
  `nav-models` activate → `[{surface:"nav-models", via:"activate"}]` for drawing a model and for
  `+ Model`; `nav-properties` activate → `[{surface:"nav-properties", via:"activate"}]` for a
  claim's explain link and for `+ Property`; and the claim's full reading → the same surface with
  `via:"disclose"`. None need a `requires`: both rails are in the default loaded workspace, which
  is what makes them the two principal navigation objects. The `+` rows navigate to the element the
  registry ALREADY declares for `create-model` and `save-property` (resolved at paint, first site
  present and enabled), so 1d is extending those two sites' paths rather than registering new ones.
- **The pristine tab walk did not move.** The rails live in `#nav`, which is `hidden` until a system
  loads, so the five-stop pin at `keyboard.test.mjs:112` is untouched. The LOADED walk gains the
  rail links and one `<summary>` per claim; no pin measures it.

## 10. What the redesign revealed in the existing code

- **The DEFECT-1 fix is correction 1's deletion target.** `f74cd538` replaced false prose with a
  retrospective about the falsehood (`index.html:256-261`). The class problem: product prose with
  no gate — the shell removes the paragraph, and SH-I3-style derivation keeps Start's example
  cards described from the files rather than by prose at all.
- **`capabilities.ts:416-421` argues the position the author just reversed** (provenance
  prominence). Rewritten in wave 2c/3; recorded in the §7 ledger.
- **`window.mage.evidence(queryId)` reads a UI-side cache** (`lastResults`,
  `agent-api.ts:268,387`) populated only by `savedQueries()` — a staleness trap the shell must not
  build on. The inspector and property view read `properties()` (recomputed per call); the cache
  and `evidence()` deserve a deprecation look by whoever owns the agent API, outside this pass.
- **`ViewState.selection` is untyped ids.** Entity/relation/model selections need the
  `ElementRef`/`RelationRef` composite values (`view-model.ts:417,443`) rather than bare strings;
  the agent-facing `view.select` keeps accepting entity ids (the cdp §12 examples are entity ids)
  and the shell widens internally. If the author wants agents selecting relations, that is an API
  addition, not assumed here.
- **`checkModelPlurality` greps presentation strings** (`src/ui/invariants.ts:119-127` matches
  `/\bin model \S/` in a detail string). The restructured view model should carry the asserting
  model as a FIELD so the invariant reads structure, not prose. Wave 0.
- **The audit's cdp §12 row is stale** — `select`/`focus` landed; only `show` is missing. The
  review surface plus the properties rail cover `show({result})`'s use case for results; `show`
  itself stays unbuilt and unclaimed.
- **`explore-space`'s promised human site** (`analysis-section.explore`, `capabilities.ts:250`)
  names a section the shell deletes. Its new path: `⋯ menu → System Browser → Explore space`
  (statistics belong with the exhaustive view), registered in wave 3 — which would finally take
  UX-I1 to an honest zero.

---

## G. Open questions

Five fields per question: Question · Context · Options · Recommendation · Consequence of ruling
otherwise.

### G1 — Ratify the amended UX-I1 reading

- **Question.** Under UX-I8, does "human-accessible affordance" mean *reachable by a declared,
  machine-verified navigation path from the default workspace* (§2.2)?
- **Context.** UX-I1 is the author's normative SHALL (`requirements-ux-261002.md` §23); this
  design reinterprets its human half rather than editing the text. The checker, the registry
  schema, and the browser gate all build on the reading.
- **Options.** (a) Ratify the reachability reading. (b) Keep existence-only parity and treat
  UX-I8 as advisory layout guidance. (c) Reachability as a NEW invariant (UX-I10) beside an
  unchanged UX-I1.
- **Recommendation.** (a). Option (b) quietly voids the invariant that has been keeping the
  product honest; (c) is (a) with a second number for the same claim.
- **Consequence of ruling otherwise.** (b): the derived-drive gate and `path` field are dropped;
  nothing verifies that a disclosed control can be found. (c): §2 lands unchanged under a
  different ID and the INDEX of invariants grows by one.

### G2 — Ask-bar free text

- **Question.** Is the ask bar's typed text a filter over the deterministic question catalogue
  (suggested + contextual), with unmatched text answered by "ask your coding agent, or open
  Advanced query" — and nothing more?
- **Context.** The spec shows free text ("Can restricted data reach Analytics?") above suggested
  questions, and separately says NL interaction is deliberately the coding agent's job. A bar that
  silently keyword-matches English into a formal query would fabricate precision the engine never
  had — the anti-pattern §12 exists to prevent.
- **Options.** (a) Filter-only, as stated. (b) Filter plus a conservative template matcher for
  the few supported forms ("can X reach Y"), refusing anything else by name. (c) Free text is
  display-only; Ask is enabled only on a chosen suggestion.
- **Recommendation.** (a). It is honest, cheap, and leaves NL where the architecture puts it.
  (b) is a maintenance magnet whose refusals will read as bugs.
- **Consequence of ruling otherwise.** (b) adds a parser with its own refusal vocabulary to
  wave 1c. (c) reads as a broken input and contradicts the spec's own sketch.

### G3 — Impact review for authoritative human edits

- **Question.** When a DIRECT human edit (not a hypothesis) would flip a tracked property, does
  v-this-pass interpose the REVIEW CHANGE surface before commit, or commit and announce the moved
  verdicts with undo one keystroke away?
- **Context.** The spec: transactions "don't all need to become modal ceremonies", but the
  review surface exists precisely for consequential change; `requirements-human-ux-261002.md`
  §874-1050 sketches pre-commit impact as the eventual model ("no break → commit; break →
  explicit decision"). Interposing requires evaluating the edit hypothetically first — every
  consequential edit transparently becomes a short-lived hypothesis, which is real machinery in
  the shell (the engine already supports it).
- **Options.** (a) Commit-and-announce now; pre-commit interposition as a later phase. (b) Build
  transparent-hypothesis interposition now for edits that touch any model a tracked property
  depends on. (c) Interpose only when a REQUIREMENT (expectation-bearing property) would flip.
- **Recommendation.** (c), with (a)'s behaviour for plain properties. It matches the
  property/requirement distinction the author drew ("Track… then Require") at the cost of one
  pre-evaluation only when expectations exist, and it gives the review surface its second user
  (agent hypotheses being the first).
- **Consequence of ruling otherwise.** (a): a violated requirement is announced after the fact —
  the "FYI it broke" the author distinguished from "blocked". (b): wave 2c grows a
  dependency-tracking question (which edits COULD affect which properties) the kernel does not
  answer today; conservative re-evaluation of everything is the honest v1 if so.

### G4 — Canvas pointer editing scope

- **Question.** Does the canvas acquire pointer EDITING this pass (blank-space + Add,
  drag-to-connect), or selection and context actions only?
- **Context.** Correction 4 sketches "Canvas blank space / toolbar: + Add". Every operation
  already has a non-canvas path, so canvas gestures are redundant affordances — but drag-connect
  is new input machinery (hit-testing, drag state, keyboard-parity review) inside the one region
  wave 2b owns.
- **Options.** (a) Selection + context menu + blank-space "+ Add" menu; no drag gestures. (b) Add
  drag-to-connect as well.
- **Recommendation.** (a). It delivers the spec's sketch; drag-connect is polish with real a11y
  surface area, and nothing else in this pass depends on it.
- **Consequence of ruling otherwise.** (b) extends wave 2b by roughly its own size and adds the
  first pointer-only input the registry would need to justify (the parity story stays intact —
  `canvas.connect` would register beside the dialog affordance — but it must be SAID).

### 9c. Wave 2a as built — one catalogue, three surfaces, and three things the kernel cannot do

Appended by wave 2a after landing. §9a asked wave 2a to drain `edit-forms.ts`; this records how far
that got and what stopped it, because the stopping point is a pin in a file wave 2a does not own.

- **An operation is declared once and every surface derives from it.** `EDIT_ACTIONS`
  (`src/ui/shell/edit-dialogs.ts`) is one row per editing operation: its fields, their option
  sources, the precondition it needs, the licensing hint the old fieldset carried, and a `build`
  that produces the `EditRequest`. The `+ Add` menu renders the additive rows; the inspector renders
  the rows a selection makes applicable, prefilled with it; the ⌘K palette lists all of them with
  their preconditions; the dialog builds the parameter form. Four surfaces that each spelled their
  own option lists would be four places to fix one defect — which the ten fieldsets already were.
- **`edit-forms.ts` went from 249 lines to 124, and what is left is exactly wave 2c's target.** The
  ten `*-go` bindings, every `fillSelect`, the datalists and the relation-endpoint narrowing moved
  out. What remains is `submitEdit` plus correction 8's radios, hypothesis name, rationale and
  `#edit-result`. `submitEdit` now RETURNS an `EditOutcome`: a modal cannot report a refusal by
  painting a readout behind itself, and a dialog that closed on a rejected edit would lose both the
  reason and everything the user typed.
- **The ten fieldsets' MARKUP is still in `index.html`, and that is a pin rather than an omission.**
  Six §19 drives in `test/browser/a11y/keyboard.test.mjs` (13.2, 13.3, 13.5, 13.6, 13.15, and the
  announcement-storm test at ~line 645) reach these operations by typing into `#add-entity-id`,
  choosing in `#delete-element-target` and pressing `#add-entity-go`. A field inside a closed
  `<dialog>` is not focusable, so deleting the markup turns six passing accessibility drives red —
  and that file belongs to the wave that generates drives from declared paths (wave 2d). The
  bindings for it are one clearly-marked block in `edit-dialogs.ts` that submits through the same
  `EditAction.build` the dialog uses, so the fieldsets cannot drift from the dialogs while they
  wait, and the deletion is that block plus the markup.
- **Three things correction 4 asks for, that the transaction vocabulary cannot do.** Said plainly
  rather than faked with a control that cannot work:
  1. *Selected model → Edit purpose.* No operation rewrites a model's engineering question.
     `add-model` composes `add-model` + `set-purpose` at creation; there is no `set-purpose` form
     for an existing model, and `set-label` reaches the LABEL. `test/shell-edit.test.ts` pins the
     absence, so the first thing that fails when the op lands is the test asking for the action.
  2. *Selected relation → Edit.* No operation changes a relation in place. The honest contextual
     set for a relation is Attach note and Delete; editing one means deleting it and connecting
     again, which is a different act and should look like one.
  3. *Selected model → Add element.* No operation adds an entity to an existing model. The nearest
     licensed act is asserting a relation IN that model, which is what the model's Connect action
     does (prefilled with the model), and it is offered under that name rather than as "Add
     element".
- **The palette is a surface, not an affordance site.** Its rows are rendered per open and emptied
  on close, so there is no element for the registry to stamp — and a declared site bound to nothing
  in every state but one reads to the closure gate as a deleted control. The palette's registry
  presence is therefore its OPENER, and even that is chrome: `CHROME_CONTROLS` in
  `capabilities.ts` is the four-button exemption (palette open/close, dialog confirm/cancel), read
  by both the node-tier markup sweep and the browser-tier served-page sweep from one constant.
- **What wave 1d must declare, one `path` per new control.** All from the default loaded workspace:
  `+ Add` menu items → `[{surface:"workspace", via:"disclose"}, {surface:"workspace", via:"menu"}]`
  (the `<details>` is in the workspace region; opening it is the disclosure step). Inspector actions
  → `[{surface:"inspector", via:"activate", requires:"<the kind>"}]`, where the precondition is the
  action's own `needs`: `selection:element` for `inspector.rename` / `inspector.set-property` /
  `inspector.connect` / `inspector.note` / `inspector.delete-element`, `selection:relation` for
  `inspector.delete-relation`, `selection:model` for `inspector.delete-model`. Note that
  `ActionPrecondition` is deliberately the same closed vocabulary as `NavPrecondition` narrowed to
  five members, so 1d can read the condition off the catalogue instead of re-deriving it — and a
  `selection:machine` member exists for the machine rename, which the action bar offers through
  `inspector.rename`. The surviving `edit-section.*` sites keep an empty path: they are still
  visible in the default loaded workspace, below the shell, until the markup goes.

### 9d. Wave 2b as built — one declaration, one guard, and the invariant that rejected the first draft

Appended by wave 2b after landing. Correction 10 is the one the author called the largest visual
mistake, and the thing worth recording is how little code the inversion needed and how much the
surrounding gates had to say about it.

- **The inversion is seven words of CSS, and nothing moved in the DOM.** `#workspace` became a
  one-column grid of named rows — `wtitle wtools wmenu wpurpose wcanvas wdetail wreading` — and
  `#canvas` took the row under the model's question. `#model-reading` keeps its place in the source,
  before the figure, which is the order assistive technology receives and the order Tab follows.
  `grid-template-areas` over `order` or `column-reverse` for a reason that is not technical: all
  three reorder visually and none reorders the DOM, and named areas are the one of the three that
  states the intent in words, in the mechanism the shell grid above already uses for exactly this
  separation.
- **The structured reading went behind one disclosure, which is the whole of what correction 10
  licenses.** "The accessibility requirement does not mean we must visually render the entire
  screen-reader representation." So `#model-reading` is a `details`/`summary`: in the tab order,
  announcing its own state, opened by the same act for both users. That is SH-I2's spelling and it
  is what separates this from §3.1's two failures — not `display:none` with no control, and not a
  flat page kept for screen readers alone.
- **The one-column focus-order invariant rejected the first arrangement, correctly.** The first draft
  painted the represents/omits disclosures BELOW the reading while the markup declares them above
  it: one column, a control in each of two rows, read in one order and tabbed in the other. The
  probe named the pair (`model-reading-summary` read before `What this model represents`, tabbed
  after it) and the fix was to stop moving a row that holds a control. Only `wcanvas` moves now,
  because the figure is the one row with nothing focusable in it (SH-I4) and therefore the one row
  whose position the keyboard cannot observe. The arrangement that satisfies the invariant is also
  the author's own sketch: question, picture, then represents / omits.
- **An author `display` on a region OUTRANKS the `hidden` attribute, and that broke SH-I1 silently.**
  `hidden` is a UA `display: none` rule; `#workspace { display: grid }` beat it, the region unhid
  itself on the pristine page, and `#diagram-subject` reappeared as a sixth stop in a five-stop tab
  walk. The rule is `#workspace:not([hidden])`, and the general form belongs in whatever wave gives
  another region a display of its own: `mountIf` writes an attribute whose effect a stylesheet can
  revoke.
- **The contents tree reads the renderer's scene, and its rows are chrome.** `modelContents` is pure
  — scene plus system to a typed reading — so the node tier asserts the product rather than a
  stylesheet, the way `navRails` does. Its rows are `button`s inside lists rather than a
  `role="tree"`: a real tree widget owes arrow keys, a roving `tabindex` and `aria-selected`
  management, all hand-written, and the claim §3.2 makes is that activating a row SELECTS, not that
  it reproduces a desktop control. Activating one sets `ViewState.selection`, which §4's first
  ruling puts outside semantic state, so the rows are navigation and `CHROME_HOSTS` (new, beside
  `CHROME_CONTROLS`) exempts them by HOST — one button per drawn element leaves no id to name.
- **Two things the kernel and the encoding cannot do, recorded rather than faked.**
  1. *A containment edge and a transition are not selectable.* `selectionKind` has no member for
     either, so a row offering one would be a control that cannot work. They are read in the tree and
     are not activatable there; `test/shell-workspace.test.ts` pins the null, so the first thing that
     fails when the encoding grows a member is the test asking for the row.
  2. *A property cannot become the workspace's subject.* Wave 1a left this to 2b, and it is still
     unbuilt: `SceneSubject` is `model | machine`, and representing a property needs either a third
     axis in `ViewState` or a subject union the renderer does not have. Activating a claim still
     navigates to the first model its verdict derives from. This is a design fork, not an
     oversight, and it is the one open item correction 6 names.
- **What wave 1d must declare, one `path` per canvas affordance.** All from the default loaded
  workspace. The contents tree's rows get NO path, because they register no affordance — they are
  chrome, and 1d should read `CHROME_HOSTS` rather than discover them. The canvas's own gestures get
  no path either, and that is G4's consequence rather than a gap: a right-click on an object offers
  operations whose declared sites stay the Inspector's `act-*` buttons, so the path 1d declares for
  each is the inspector path §9c already specifies; a right-click on blank canvas discloses
  `#add-menu`, whose five sites already have `[{surface:"workspace", via:"disclose"},
  {surface:"workspace", via:"menu"}]`. What 1d DOES owe this region is one step on the structured
  reading, because it is now collapsed by default and §2.3's drive has to open it:
  `[{surface:"workspace", via:"disclose"}]` for anything declared at `#diagram-text` or below.

### 9e. Wave 2c as built — the pen is empty, and G3 fires in the a11y suite's own fixture

Appended by wave 2c after landing. Two of these change what a later wave will find; the third is a
list wave 2d needs before it re-derives a drive.

- **The holding pen is drained, and two things stayed.** `edit-forms.ts` kept `submitEdit` and the
  `#edit` region's mounting, nothing else. The funnel stayed because it is the one thing every
  editing surface shares — the ask bar's Save and Retract, every dialog, the pinned fieldsets — so
  moving it into any one of them would make that surface the mutation path for the others. The
  region and `#edit-result` stayed because the fieldsets' markup is still pinned (§9c) and
  `#edit-result` is where those forms report a refusal; a §19 drive reads its text to say WHY it
  failed, so deleting the element turns a passing assertion into a TypeError in its own message.
  Routing moved out: the funnel hands the envelope to `ReviewSurface.land`, which decides.
- **The review surface is a `<dialog>` at `#hypothesis-bar`, and `hidden` tracks `open`.** §5 pins
  the bar's ids and two §19 drives read `document.getElementById("hypothesis-bar").hidden`, so the
  dialog carries the id and the module sets `hidden` with every open and close. 13.13 and 13.14 pass
  unchanged: an agent's hypothesis opens the modal, both ways out are reachable by Tab inside it,
  and Discard closes it. Escape is refused (`cancel` → `preventDefault`), because the two ways out
  are the two buttons and dismissing the surface would leave a change pending with no route back.
- **A probe is DISCARDED and re-applied, not accepted.** `applyHypothesis` keeps the branch engine,
  whose history begins at the load, so accepting a branch collapses the authoritative undo stack to
  one step. An edit the user never asked to branch must not silently shorten undo, so the interposed
  path discards the probe and re-applies the identical operations through `transact`. `transact`
  stays the single authoritative mutator. An agent hypothesis and an armed what-if still commit by
  accepting the branch — there the branch IS what is being accepted, and no envelope was retained.
- **`create-hypothesis`'s human affordance is `#whatif-arm`, a header toggle, off and disabled by
  default.** The radios carried it and correction 8 deletes them. The route G3 creates — a
  consequential edit becoming a branch by itself — has no control of its own, because it is every
  editing control, so it cannot be the declared site. The toggle is the deliberate route for a user
  who wants to try something where no obligation is at stake. UX-I1 stays at 0 over 25.
- **No shipped example declares an `expect:`, so on shipped content the interposition is LATENT.**
  Measured, and pinned by `test/shell-review.test.ts`. Every human edit to Message Bus, Worker Queue
  or Document Processing commits and announces — which is the author's own limit, satisfied by the
  content rather than by a threshold. The day an example gains an expectation, that test fails and
  the surface starts interposing for it.
- **Four a11y drives move, and three of them are wave 2d's to re-derive.** Run at this tree, the
  a11y tier reports these beyond the standing focus-order pin:
  1. **13.15 ACCEPT IT** fails at `chooseRadioByKeyboard(page, "edit-target", …)`. That route is
     the one correction 8 deletes. Its replacement is `#whatif-arm` (Tab, Enter) followed by the
     ordinary edit and then Enter on `#hypothesis-apply` inside the modal — the same three
     keystroke classes, one fewer radio group.
  2. **"every one of section 19's thirteen operations was driven, by name"** fails as 13.15's
     cascade; it asserts the census, not a behaviour.
  3. **The announcement-storm drive** fails because the feature FIRED, and this is the instructive
     one. 13.9 earlier in the same file saves `audit-subscribers-exist` as a requirement expecting
     `holds`; the storm drive's cascade delete of `order-created` breaks it; so G3 interposes, the
     change is held for review, and the announcement is the review surface's rather than
     `delete-entity applied`. The suite built the first requirement this workbench has ever had and
     then measured a page that no longer commits that edit unreviewed. The drive needs to either
     commit from the surface and then assert, or move its storm to an edit that moves no obligation.
  4. **"Tab reaches Explore configuration space"** fails as (3)'s cascade: the suite leaves a change
     pending, the review modal is open, and everything behind a modal is inert.
  Two pieces of the tier cannot run in an agent worktree at all — `axe-core` resolves from the
  repository root and `puppeteer` from `book/`, neither of which a fresh `git worktree add` has.
  Symlinking both from the main checkout is the fix, and it is the orchestrator's step rather than
  the agent's (CLAUDE.md: never `npm install` in a worktree).

### 9f. Wave 1d as built — the seven corrections the drive forced, and the one control nobody can reach

Appended by wave 1d after landing. §2.2 sketched the shapes and §2.3 the three rungs; building the
drive measured the page against both, and the page won seven arguments. Three of these change what
a later wave finds; the fourth is the finding this wave exists to produce.

- **The baseline is the PRISTINE page, and that is the ruling the sketch could not have made.** G1
  says "from the default loaded workspace", so the obvious reading is that a drive loads an example
  and starts there. It cannot. `start.load-example` is the control that CREATES the loaded
  workspace, and `#start` is `hidden` once a system loads (SH-I1) — so from a loaded workspace it
  has no path, and no member of §2.2's precondition set can un-load a system. Making the baseline
  the fresh page costs one word and fixes it: `loaded` becomes a DECLARED step with a keyboard
  routine of its own, 34 of the 43 paths name it, and §2.2's "an empty path means visible in the
  default workspace" becomes literally true of exactly the two controls it is true of —
  `header.file-input` and `header.new-system`. The drive establishes `loaded` through Start's own
  example control, by keyboard, rather than through `window.mage.load`: it is the precondition
  everything else depends on, and establishing it with the agent API would mean the whole suite ran
  against a state no keyboard produced.

- **Four preconditions were missing, and §2.2's own example was one of them.** The sketch offers
  "header Undo" as an empty path. `#undo` and `#redo` ship disabled and a disabled button is not
  focusable, so neither is reachable until there is history — `edited` and `undone`, with routines
  that add an entity by keyboard and then undo it. `#ask-track-box` is `hidden` until the ask bar
  has answered: `answer-present`. And `selection:machine` exists in the editing catalogue's
  `ActionPrecondition` and not in `NavPrecondition`, which §9c asked 1d to read the condition off —
  a narrowing that was not a subset. Eleven members now; `exhausted-answer` still has no human
  route at all, because escalating a bounded search starts from a SPARQL answer and a person cannot
  write SPARQL here (the `query` row's own asymmetry, and §G Q9's stake).

- **`via` needed a fifth member, because five affordance sites are not controls.** The model tables,
  the findings list, the property list, the evidence list and the provenance list are a `<section>`
  or an `<ol>` with `tabindex="-1"`. Rung 2's "exists, is focusable, and is enabled" can never hold
  for one, and a drive that applied it to all 43 would have had to be weakened to pass — which is
  how a gate stops meaning anything. `via: "read"` declares the terminal's KIND, and the drive then
  asserts the two things a reader needs instead: the region is not hidden and carries an accessible
  name, and the readout has content. Falsifiable both ways: a readout that becomes focusable fails,
  and a control declared `read` fails too, because a control the drive never Tabs to is coverage
  lost silently.

- **THE FINDING: `inspector.delete-model` is a wired human affordance no person can reach.** Its
  button is enabled only for a model selection, and nothing a person can press produces one. The
  contents tree is the only surface that writes `ViewState.selection` from a human act, and its row
  encoders (`nodeSelection` / `edgeSelection`) return `entity:`, `state:` or `rel:` and null for
  everything else — §9d recorded the nulls for containment edges and transitions and did not notice
  that a MODEL has no row either. An agent reaches a model selection through
  `view.select("model:x")`; a person cannot reach it at all. It is the single member of
  `WIRED_WITHOUT_A_WALKED_PATH`, which carries the reason and names the wave that drains it. The
  capability is unaffected — `delete-model`'s pinned fieldset site declares a walked path — so
  UX-I1's zero stays honest rather than laundered, and a test holds that distinction shut: a
  capability whose EVERY wired site is excused is a violation wearing a known-set costume.

- **`ViewState.selection` carries two encodings, and the ask bar understands only one.**
  `askCatalogue` resolves the selected entity with `selection.find((id) => system.entities.has(id))`
  — a BARE id — while the contents tree writes `entity:<id>`. So selecting a node in the tree leaves
  the ask bar's contextual questions empty, and since the unselected catalogue is exactly the
  already-saved questions and the Track box opens only for an UNTRACKED item, `askbar.track` is
  unreachable from a tree selection. The walked route goes through a RELATION's inspector, whose
  navigate links still carry bare ids (`{ kind: "select", selection: r.from }`). §10 predicted this
  class — "`ViewState.selection` is untyped ids" — and the shell has now shipped both spellings in
  one field. Whoever widens it should widen `askCatalogue` in the same change; the drive is what
  fails if they do not.

- **§9c's two-step `+ Add` declaration over-declares, and §9b's rail declarations under-declare.**
  The built menu is one `<details>`, so `[{disclose}, {menu}]` describes an act the page does not
  have; the drive counts declared disclosures against the collapsed ancestors it finds, so the extra
  step fails rather than passing vacuously. Nothing declares `via: "menu"` today. And §9b asked for
  `[{surface:"nav-properties", via:"disclose"}]` for a claim's full reading, which is half the route:
  the terminal is an `<ol>`, so a `read` step follows, and the precondition is `property-exists`
  rather than nothing — with no saved question there is no claim row and no disclosure to open.

- **The `advanced-query` surface under-covers the disclosure it sits in, and `edit` had no surface at
  all.** `advanced-query` names `#form-ask`, one of three fieldsets inside `<details id="ask-advanced">`,
  so the Save and Retract sites are inside the Advanced disclosure and outside the surface; their
  paths cite `askbar` for both steps instead. Widening the row is wave 1c's call — three gates read
  `#form-ask`. The ten pinned editing fieldsets had a worse problem: §5 gives them no region, so
  their only declarable path was the empty one, which claims they are reachable on the pristine page
  while `#edit` is `hidden` there. `NavSurface` gained an `edit` member and `SURFACES` a built row
  for it. A table that admits a `planned` row for a region nobody built should admit a row for a
  region everybody can walk to; wave 3 deletes the member with the markup.

**What the drive proves, and what it does not.** 43 declared paths, each walked from a fresh page:
38 control terminals reached by Tab and asserted enabled, 5 readouts asserted named and non-empty,
10 disclosures opened with Enter on their own `<summary>`, 8 of the 11 preconditions exercised. The
walks stop at ARRIVAL — reached, focusable, enabled — which is deliberately the weaker claim.
`keyboard.test.mjs` drives §19's thirteen operations through to an assertion about the MODEL, and
those stay as a verbatim floor: two tiers of one requirement, with the thirteen as the stronger one.
Five sabotages were run and watched red before restoring — an under-declared disclosure, a readout
declared as a control, a surface that does not contain its control, a control disabled in the markup
with the declaration untouched, and a drive that walks without recording, which rung 3 caught by
name.

**What wave 3 inherits.** The `path` field is still optional and the known set still has one member;
flipping `BoundAffordance.path` to required is a one-character change once a model becomes
selectable. `explore-space`'s path gains a menu step rather than moving its control, as §10 and the
registry's own comment both promise. And the `edit` surface row plus the ten `edit-section.*` paths
go with the markup — ten declarations to delete, which is the shape a relocation should have.

### 9g. Wave 3 as built — six places the spec was wrong, and the set that reached zero

Appended by wave 3 after landing. This is the last shell wave, and its job was to make the earlier
waves' promises true. Four of these change what a reader of §9 would otherwise believe; the second
is the one the whole migration was for.

- **THERE IS NO DEAD FORM CODE IN `view-model.ts` OR `render-dom.ts`, and the wave-3 row in §9 is
  wrong about it.** The row names that deletion as a third of this wave's scope. Measured at this
  tree: every export of both files is live, and so is every FIELD of the one shape that looked like
  residue. `EditOptions`' seventeen option lists are all read, through `edit-dialogs.ts`'s
  `optionsFor` over the declarative `OptionSource` union — including the three (`domains`,
  `machines`, `relations`) that no call site names directly, because the catalogue indexes into the
  record by a declared field name rather than reading properties. `render-dom.ts`'s two
  zero-external-reference exports (`purposeDisclosures`, `svgElement`) are recursive helpers of
  `paintPrincipal` and `paintDiagram`. The residue §9 expected was drained INCREMENTALLY and by the
  waves that owned it: 1a took the property rail's root out of `paint` (three roots, not four), 2a
  took the ten `*-go` bindings and every `fillSelect` out of the holding pen, 2c took correction 8's
  radios. A plan that assigns a cleanup to the last wave and a drain to each earlier one gets the
  cleanup done early and then reads as incomplete — which is a scheduling artefact, not a finding,
  and the honest record is that this third of the row was already finished.

- **The path-less set reached zero through a ROW, and SH-I8 is flipped hard.** §9f's single member
  was `inspector.delete-model`, whose precondition is `selection:model` and whose finding was that
  no human act produced one. The drain is `ModelContents.subject`: the contents tree now opens with
  the thing it is a reading OF — the drawn model or machine, selectable as `model:<id>` /
  `machine:<id>`, with the engineering question as its disclosed detail. `BoundAffordance.path` is
  REQUIRED, `WIRED_WITHOUT_A_WALKED_PATH` is empty, and `checkNavPaths`' path-less branch is DELETED
  rather than left behind the required field: a check whose condition the type system has made
  unreachable is dead code that reads like defence. 44 declared paths, 44 walked, 0 excused.
  The flip's first consequence was the compiler rejecting a test fixture in
  `capabilities.test.ts:360` that fabricated a path-less affordance — the rung-above-a-check working
  on the day it landed.

- **§9f offered the System Browser's model table OR the contents tree's model heading, and the tree
  is the right one for a reason §9f could not have had.** The Browser looked like the obvious site:
  it is the exhaustive model view, and selecting any model there would reach a model the workspace is
  not drawing. Two things rule against it. Its model table is painted by `paint`'s generic
  `sectionTable` from `vm.sections`, so selectable rows mean either a second painter for one table
  or a widened binder — and the contents tree ALREADY is the selection surface, with a
  `CHROME_HOSTS` exemption, a selection encoder and a drive routine. And the coverage loss is
  nil: `#diagram-subject` navigates to any model by keyboard, so every model is two acts away, which
  is what the Browser's table would also have cost. Extract at the existing seam rather than build a
  second one.

- **The ⋯ menu is a `<details>`, and the heading stays outside it.** §10 and `browser.ts` both
  promise `⋯ menu → System Browser → Explore space` with the step PREPENDED rather than the controls
  relocated. There is no ⋯ menu and inventing one for three readouts would be a region nobody
  designed, so the step is a disclosure — the same act in the mechanism SH-I2 already governs
  everywhere else in this shell. What the design did not say, and what the markup now records: the
  `<details>` is INSIDE the labelled `<section>`, not in place of it. A `<details>` carries no
  landmark role, so making the region itself the disclosure would have answered correction 3's
  visual complaint by removing the System Browser from an AT's landmark list — §3.1's first failure
  mode with a tidier diff. Three sites gained a `disclose` step and no element id moved.

- **The drive's row lookups were POSITIONAL, and wave 3 is the change that proves it.** The
  `selection:element` routine reached `#model-contents button` — the first one — and
  `selection:relation` found the row whose rendered text contains an arrow. Adding a row above them
  broke the first immediately; the second was the parse-the-presentation failure
  `checkModelPlurality` was written about, waiting. `treeRow` now stamps `data-select` from the same
  value its click handler sends, and all four selection routines read the encoding. §10's
  "`ViewState.selection` is untyped ids" lesson applies to the TEST's handles on it as much as to
  the field.

- **One hand-written a11y drive went red on the disclosure, and the fix is an Enter, not an
  exemption.** "Tab reaches Explore configuration space" reported `the walk ended on summary` — the
  button behind a closed `<details>`, named exactly. It was given the disclosure step, like the
  declared path. The two tiers now agree about the route and disagree about the claim, which is the
  arrangement §9f set up: the generated drive asserts ARRIVAL, and this one asserts that Enter
  produces an honest readout.

- **`npm run build` is a PRECONDITION of all three browser tiers, and no wave recorded it.** A fresh
  worktree has no `dist/build-manifest.json`, so `smoke`, `browser` and `a11y` all fail in `before`
  with the harness's own (good) message. At the fork that reads as 3 failing, 36 failing and 110
  failing — a red that looks like the tree and is the bundle. Worth one line here because the first
  measurement a wave takes is its baseline, and this one costs a confused ten minutes.

**The three follow-ups wave 1d filed, triaged.**

1. `[FIX]` the unreachable `delete-model` control — **DONE**, above.
2. `[FIX]` the dual `ViewState.selection` encodings — **REAL, NOT MINE, and now narrower.**
   `askCatalogue` resolves the selected entity with `selection.find((id) => system.entities.has(id))`
   — a bare id — while the tree writes `entity:<id>`, so a tree selection leaves the ask bar's
   contextual questions empty. Still true at this tree. The fix is to widen `askCatalogue` to parse
   the prefixed encoding (`parseElementValue`, which the shell already exports), in `askbar.ts`,
   which is **wave 1c's file and the surface three gates read** — the same reason §9f gave for not
   widening `advanced-query` from 1d. Routed there, with the drive as the thing that fails if it is
   not done: `paths.mjs`'s `answer-present` routine carries a comment naming the defect and walks
   the inspector's bare-id link to work around it, so the workaround is the regression test.
   Wave 3 made it narrower, not wider: the tree's rows now declare their encoding in
   `data-select`, so the widened `askCatalogue` has a typed thing to read rather than a prefix to
   guess.
3. `[DESIGN]` `advanced-query` names one of three fieldsets — **RULED: widen the row to
   `#ask-advanced`.** The surface's job in a declared path is to CONTAIN the control, and a surface
   that holds one of three siblings forces the other two to cite a region that does not contain them
   — which is what `askbar.save` and `askbar.retract` do today. §9f deferred it because three gates
   read `#form-ask`; that is an argument about who changes it, not about which is right. The row
   should name the disclosure and the three fieldsets inside it should be one surface, because they
   are one disclosure to a person. Left to whoever owns those three gates rather than taken here:
   wave 3's footprint is the registry and the shell, and re-pointing `#form-ask`'s three readers is
   wave 1c's file plus three test files, which is a different change with a different blast radius.

**What is deliberately NOT deleted, and why.** The ten `edit-section.*` fieldsets, their markup, the
`edit` surface row, and `edit-forms.ts`'s `submitEdit` + `#edit-result`. §9f says the first three
"go with the markup"; the markup cannot go in this wave. Seven keyboard drives reach these
operations by typing into their fields — the six §19 drives §9c enumerated, plus `paths.mjs`'s own
`edited` routine, which establishes the precondition `header.undo` and `header.redo` depend on — and
a field inside a closed `<dialog>` is not focusable, so deleting the markup turns seven passing
accessibility drives red. Re-deriving them through the dialogs is wave 2d's declared scope and was
not landed with 1d's path drive. `edit-section.delete-model` additionally still matters: it is
`delete-model`'s second site, and while it exists UX-I1's zero does not depend on a single control.
`submitEdit` stays for §9e's reason, unchanged and still correct — it is the one thing every editing
surface shares, so moving it into any one of them would make that surface the mutation path for the
others.

### 9h. The three recorded residues, closed

Appended by the wave that drained the three findings §9f and §9g left on the floor, each filed by a
wave that deliberately did not widen its own scope. One is a coverage hole, one is a detection that
watched a proxy, one is a ruling that had been made and not executed.

- **RESIDUE 1 — the prefill round-trip had no coverage, and the fix removes the encoding rather than
  escaping it.** `edit-dialogs.ts` flattened each inspector action's prefill onto its button as
  `key=value` pairs joined by a NUL and split it back in the button's click handler. A control-byte
  gate flagged the raw separator; the first repair DELETED it, which turns `split(SEP)` into
  `split("")` and leaves every dialog field empty — **and the suite reported 749 of 749 passing**,
  because no tier looked at what the dialog received. The gate guarded the file's bytes; nothing
  guarded the behaviour those bytes implemented.

  The gate that was missing is three cases in the browser tier (`workbench.test.mjs`, "correction 4:
  what a selection determines arrives in the dialog's own fields"): select an object through
  `window.mage.view.select`, press the real `#act-rename` / `#act-note` button, and read the value
  out of the `<select>` the dialog generated. Two actions rather than one, because `set-label`'s `id`
  is a BARE entity id and `add-note`'s `target` is the `elementValue`-prefixed spelling under a
  different field name — so a handler that paired the wrong key with the wrong value fails here.
  Both terminals being `<select>`s makes the assertion stronger than a string compare: a `<select>`
  accepts a value only when it names one of its own options.

  **The first draft of that test passed the sabotage, and that is the part worth carrying forward.**
  It selected the example's FIRST entity, which is also the first option of both selects — so with
  the prefill dropped entirely the field still read that id as the browser's default, and the
  assertion could not distinguish a delivered prefill from none. The subject is now the LAST entity
  and each case also asserts the expected value is NOT the field's own default, so a fixture reorder
  cannot quietly make the gate vacuous again. Watched red under the original deletion, with the
  message naming both ids, before restoring.

  **Ruling on the separator: it does not need to be a control byte, because it does not need to
  exist.** The question §9f's residue poses is whether the values are constrained enough for a
  printable separator. They are not — the keys are the catalogue's own field names, but the values
  are entity and model ids a person types into `add-entity`, so no printable character is safe and
  the NUL was load-bearing for as long as the encoding was. What makes the encoding unnecessary is
  that these seven are SHIPPED buttons with a listener each, not generated rows behind a delegated
  one: the prefill can travel from `paint` to the handler as a `ReadonlyMap<string, string>` in a
  `let` with exactly the lifetime `options` and `current` in the same module already have — latest
  paint wins, nothing captured — which is also what the canvas context menu already does
  (`workspace.ts` calls `openDialog(action.form, action.prefill)`). So `data-prefill` and the
  inspector's `data-form` are gone and the hazard with them. The palette KEEPS its `data-form`,
  because its rows are generated per render and read by one delegated listener, which is the case
  that genuinely needs the row to declare its operation.

  Found while in there, unmentioned by the residue report: **every current contextual action
  prefills exactly ONE pair**, so the separator was never emitted by any shipped path — the
  deletion broke the single-pair case through `indexOf("=")`, not through a mis-split. And an action
  button that returns to disabled KEEPS the last selection's wording rather than the generic label
  the markup ships. That is pre-existing, unchanged here, and recorded rather than folded into a
  change about the prefill encoding.

- **RESIDUE 2 — the annotation channel watched a PROXY, and the proxy was blind to every note, not
  only the second.** §9f's own words were "an annotation-only agent commit is detected through the
  provenance record COUNT, so attaching a note to an object that already carried one is still
  silent." Measured in the browser tier before the fix: the FIRST annotation-only agent commit wrote
  **zero** times to `#live`. A provenance record exists only for an object whose source declares a
  `provenance` block, and `add-note` writes into `notes` — so the count never moved for any shipped
  note, and the branch that says "A note was attached. The model's revision is unchanged" was
  unreachable on the agent path. The residue was real and understated; recording the stronger version
  matters because "only the second note is silent" would have licensed a one-line fix to the
  comparison.

  **What it looks at now: `annotationHash`, the complement of `systemHash`** (`src/ir/hash.ts`). The
  two are a declared pair — one digests exactly what the semantic projection includes, the other
  exactly what it excludes (notes and provenance, on all four IR objects that carry an `Annotated`).
  A1 is why the pair is needed at all: an annotation-only commit leaves the semantic revision
  standing BY CONSTRUCTION, so the one channel that reports agent actions to assistive technology has
  no semantic diff to describe for this class, and a digest over the excluded half is the smallest
  thing that sees the change itself rather than a stand-in for it. Deliberately MORE sensitive than
  `systemHash`: that hash normalizes everything cosmetic because a false mismatch costs an agent a
  recomputed transaction, while this one's error directions are asymmetric — an extra announcement is
  noise, a missing one is an agent edit a screen-reader user never hears. It must never become a
  transaction base, and a node-tier test says so in those words.

  Pinned the way the others are pinned: a browser-tier case in the FR-A11Y-3 suite, driving
  `window.mage.transact` on a page nobody has touched and observing `#live`. **The pin needed an
  interleaved semantic commit between the two notes, and that is an instrument fact worth recording.**
  Both notes announce the identical sentence, and Chromium emits no mutation record for assigning
  `textContent` a string identical to the one already in the node — the limitation this suite's own
  fixture comment names for its own reason. Without a different announcement in between, the second
  note reads as unannounced when it is merely unobservable: the probe describing itself. The
  interleave is also the realistic agent sequence. Two node-tier cases carry the pure-function half,
  including one that asserts the fixture reproduces the residue (the provenance-record count must
  stand still across the second note, or the counting detector would have caught it and the digest
  would be unnecessary).

- **RESIDUE 3 — RULED and now EXECUTED: `advanced-query` names the disclosure, not one of the three
  fieldsets inside it.** §9g already made this ruling in words ("the row should name the disclosure
  and the three fieldsets inside it should be one surface, because they are one disclosure to a
  person") and left the edit to whoever owned the readers, because §9f had deferred it on the ground
  that three gates read `#form-ask`. **Re-measured before taking it, that reason no longer holds:**
  the only remaining mention of `#form-ask` outside the markup is the ask bar region's own
  fieldset-disable list, which reads the markup and not the surfaces table. A deferral's reason is a
  fact about a tree, and this one had expired — which is the argument for re-measuring a cited reason
  rather than inheriting it.

  So the row names `ask-advanced`, and `properties-section.save` / `.retract` stop citing `askbar`
  for their second step. **The `advanced` helper lost its `surface` parameter in the same change**:
  all four callers now want the same surface, and a parameter with one value is a decision nobody is
  making. `control` rather than `landmark`, for the reason §9g gave the System Browser's own
  disclosure — a `<details>` carries no landmark role, so it is a thing a keyboard reaches and
  activates rather than a region an AT jumps to.

  **UX-I1 stays at 0 over 26 capabilities and the drive is what holds the widening honest.** Rung 2's
  CONTAINMENT assertion is exactly the check this row was failing to satisfy, so the narrow row was
  sabotaged back in with the paths left pointing at `advanced-query`, and the drive named both sites:
  "step 2 names 'advanced-query' (#form-ask), which does not contain '#save-property-go'. The route
  passes through a region the control does not live in." Restored, 44 of 44 paths walk. No element id
  moved, so SH-I8's hard flip is untouched: this is a declaration catching up with a page that was
  always built this way.

### 9i. The full-width correction as built — one bug in two halves, and the figure that could only shrink

Appended by the wave that executed the author's full-width ruling: *"this is wasting an enormous
amount of horizontal space… at this viewport the application is effectively a ~1000px fixed-width
page sitting inside a ~1600px browser."* A layout correction, not a redesign — the three-column
hierarchy, the named grid areas, the DOM-order-is-AT-order separation and every pane's styling are
untouched. What changed is four declarations and what they were allowed to reach.

**THE BUG HAD TWO HALVES AND EITHER ONE ALONE DEFEATS THE FIX.** `main { max-width: 84rem }` made
the shell a 1344px page centred in the viewport. Removing it alone would have handed every freed
pixel to the centre, because the side tracks were `minmax(14rem, 18rem)` and
`minmax(13rem, 20rem)` — **capped**, not floored, so above about 1136px of content box Properties
sat at exactly 288px and the Inspector at exactly 320px no matter how wide the browser was. The
ruling asks for width *at* those rails ("relation names and actions do not wrap nearly as
aggressively"), so a cap is the half of the defect that a reader of the `main` rule alone would
never find.

Measured at a 1600px viewport, before and after:

| | before | after |
|---|---|---|
| `main` | 1344px, 128px of dead gutter each side | 1600px, 20px gutter |
| Properties (`#nav`) | 288px (at its cap) | 333px |
| Workspace (`#workspace`) | 656px (51.9%) | 847px (56.0%) |
| Inspector (`#inspector`) | 320px (at its cap) | 333px |
| ratio | 22.8 / 51.9 / 25.3 | **22.0 / 56.0 / 22.0** |
| Event Flow figure | 445px inside a 628px frame | 817px inside an 819px frame |

The tracks are now `minmax(16.25rem, 22fr) minmax(34.375rem, 56fr) minmax(17.5rem, 22fr)` — the
ruled 22/56/22 over the ruled 260/550/280px floors.

**`fr` RATHER THAN `%`, and the gaps are the reason.** A percentage track resolves against the grid
container's content box and knows nothing about `gap`, so `22% 56% 22%` asks for the full width
*and* two 1.5rem gutters — 48px more than exists, which overflows the shell and takes 1.4.10 with
it. An `fr` distributes what remains after the gaps come out, so the ratio holds at every width with
no `calc()`. The floors are rem so they track a user's root font size rather than pinning to 16px.

**THE COLLAPSE BREAKPOINT IS DERIVED, AND IT HAD TO MOVE — 64rem to 74rem.** The floors plus the two
column gaps plus main's two gutters come to 73.625rem (1178px). Left at 64rem, every viewport between
1024px and 1178px would have drawn three columns whose floors do not fit, and **a grid track that
cannot reach its minimum overflows** — a horizontal scrollbar and a 1.4.10 failure caused by a
breakpoint rather than by any content. This is a consequence of the author's own minimums, not a
second opinion about them: 260 + 550 + 280 cannot be shown above 1024px. Verified at both sides of
the new boundary — 1185px draws three columns at 260/557/280 with zero overflow, 1184px draws one.
The collapse itself is unchanged: one track, regions stacked in DOM order, rails released from their
80vh box.

**THE FIGURE COULD ONLY EVER SHRINK, which is a different bug from the one the ruling describes.**
The ruling calls the Event Flow canvas "a small fixed-size canvas", and the fixed size is not a
`viewBox` — the renderer's viewBox follows its content correctly. It is that `src/render/svg.ts`
writes the content's extent onto the root element as `width` and `height` **attributes**, and the
page styled it `max-width: 100%`. Intrinsic size plus a maximum means the drawing shrinks on a phone
and never grows on a desktop: 445px in a 628px frame before, and it would have been 445px in an
845px frame after the shell went full-width — the figure was the one part of the page that would
have gained nothing. One word fixes it: `width: 100%`, which makes the frame the authority on size
and the attributes merely the aspect ratio.

**Bounded by `max-height: 80vh`, because width alone is not a size.** This graph is taller than it is
wide (445 × 582), so filling an 845px frame on width computes a 1105px-tall figure that pushes the
structured reading, the ask bar and the status line off the bottom — using the width by costing the
reader everything under it. 80vh is the ceiling the two rails already use, so the three panes agree
on how tall a pane may get.

**WHAT THIS DELIBERATELY DOES NOT DO is re-rank the graph, and the ruling did ask for a re-layout.**
Horizontal extent in a left-to-right layered layout is set by the number of RANKS, which is a
property of the model's edges and not of the viewport. No width hint can make this graph *wider*; it
can only make it *bigger*. The evidence is the measurement above — the flagship model draws 445 × 582,
taller than wide, **despite** the layout already running left-to-right. Spreading ranks to fill a
measured width would mean passing viewport geometry into a layout module that is deliberately pure
and deterministic (it runs in a Worker and under `node:test`, with no DOM to measure against, and
its determinism and local-perturbation properties are acceptance criteria rather than polish). That
is a renderer change, not a stylesheet one, and it is recorded here rather than attempted.

**A FOURTH DECLARATION CHANGED, AND IT IS THE ONE WORTH WARNING ABOUT.** Widening main's gutter from
1rem to 1.25rem put the editing forms 4px past the right edge of a 320px viewport — a 1.4.10
regression introduced by this wave and caught by its own measurement before it was committed. The
cause is `.forms`, whose `minmax(19rem, 1fr)` demanded a 304px track inside a 288px content box and
fitted only because the old 16px gutter left it *exactly* 320px to the document's edge. **The
reflow invariant was resting on an arithmetic coincidence between two unrelated rules**, and the
repair is the floor rather than the gutter: `minmax(min(19rem, 100%), 1fr)` caps the floor at the
space that exists, so the column can no longer overflow at any width. Keeping a 16px gutter would
have hidden the landmine for the next author to tread on.

**WHAT PINS IT: `test/browser/shell-geometry.test.mjs`, 10 cases in the browser tier.** A CSS value
is exactly the kind of thing that regresses in silence — nothing in the node tier can see a
stylesheet, the a11y tier asks only whether the page reflows, and every other browser assertion is
about structure rather than size, which is how an 84rem cap survived Waves 0 through 3 with no gate
holding an opinion. So this file **measures `getBoundingClientRect` on the rendered page** and never
reads the stylesheet: a grep for `max-width: 84rem` passes while the page is broken in both
directions, since the cap can return under another spelling and the ratio can rot with no cap
present at all.

It asserts the gutter is ≤24px, the shell reaches the viewport, the three shares sit within 1.5
points of 22/56/22 at 1600px and 1920px, the centre outweighs both rails together, every floor holds
at the breakpoint's upper side and above, the figure fills its frame and grows between 1280px and
1920px, the figure stays under 80vh, the grid collapses to one track at and below 1184px, and the
document never scrolls sideways at ten widths from 320px up. **The ratio is checked only where it is
free** — below about 1440px the Inspector's floor legitimately binds and the ratio bends around it,
so asserting 22/56/22 at 1280px would pin arithmetic nobody ruled on.

**Watched red before it was trusted.** Each of the four declarations was reverted in turn and the
gate failed on the matching assertion: the `main` cap took 3 cases, the side-column caps 3 (including
the floors, since a capped rail starves the centre below its 550px floor near the breakpoint), the
figure's `max-width` 2, and the forms floor the overflow case. Against HEAD's whole `index.html`,
8 of the 10 fail. Restored, 10 of 10 pass.

Gates at the final tree, every tier, nothing skipped: `check` clean, `check:parity` 0 violations over
26 capabilities, node tier **815/815**, `build` clean, smoke **3/3**, browser **50/50** (40 before
this wave), a11y **111/111** — and the a11y count was measured at **111 with this wave's CSS
reverted as well**, so full width cost that tier nothing.

### 9j. Properties are propositions as built — the brief's own trap caught the brief

The ruling: a property states a declarative proposition, never asks a question; internally it
carries a `statement`; and the authoring UX normalizes an interrogative rather than rejecting it.
Landed. Below is where the brief was wrong, and the two defects the rewrite exposed.

**The brief fell into the trap it wrote.** Its RENAME list named `view-model.ts:926`
(`p.question !== null`) as a property's text. That line is `purposeBlock(p: Purpose)` — a MODEL's
purpose, the brief's own KEEP category. Renaming it would have erased exactly the distinction the
ruling exists to create. Left alone.

**There was no `question` field on a property to rename.** The property's text was already
`proposition` (`EvaluatedProperty`, `PropertyRow`, the `save-property` request, the
`save-property-proposition` input). So the rename was `proposition` → `statement`, not
`question` → `statement`, and the ruling's "never a `question`" already held at the field level. What
was genuinely wrong was the PROSE: `properties.ts`'s header asserted "a saved query is a question. A
property is a question PLUS its current verdict", and roughly a dozen grounding and refusal strings
called a property's text "the question". Those moved.

**The fixture format had already chosen `statement`, and the brief did not know.** Every
`expected-results.yaml` carries a `requirements:` block whose field is literally `statement`, holding
a declarative sentence, with polarity in a separate `satisfied_when`. That is independent
corroboration for `statement` over `proposition` — and the model for how to phrase a safety claim
(below).

**Two shipped properties had INVERTED polarity, and the interrogative was hiding it.** Both are
`forall` / `invariant` over a negated conjunction, where `holds` means NEVER:

- `worker-queue` `lease-held-while-processing` asked "Is the job ever in processing while no worker
  holds its lease?" and records `holds`. Read together that asserts the breach exists.
- `docable` `processing-implies-custody` asked "Is the document ever processing while the worker is
  idle?" and records `refuted` — and `engine-behavior.test.ts` proves it CAN happen.

Both now state the invariant ("The job is never in processing while no worker holds its lease"), so
the status word and the sentence agree. Neither query's semantics changed; only the sentence that
was being graded against them. A declarative statement is checkable against its own verdict in a way
an interrogative is not, which is a sharper argument for the ruling than grammar.

**The author's phrasing #3 would have inverted a third one.** "Events carrying restricted data
CANNOT reach services not permitted to process it" applied to
`restricted-data-reaches-impermitted-subscriber` — an existential whose `holds` IS the safety breach
— would have made ESTABLISHED mean the opposite of the truth. The negative phrasing belongs to the
REQUIREMENT that the query refutes, and the fixture already states it there. The query's own text is
the positive existential: "An event carrying restricted data reaches a service not permitted to
process it". Same resolution for the nine `workbench-components` queries carrying `expect: refuted`:
the statement says what the query decides, and `expect` carries the polarity.

**Two generated models reverted the edit until their generators were fixed.**
`models/example-coverage.mage.yaml` is emitted by `scripts/gen-example-coverage.ts` and
`models/workbench-affordances.mage.yaml` by `scripts/gen-affordances.ts`; both are re-generated and
compared by the suite. The capability-summary edits tripped the second one, which is the drift gate
doing its job. The generators carry the new phrasings now.

**Normalization, and what it refuses.** `normalizeToStatement` undoes subject-auxiliary inversion
only where the subject is unambiguous — a single token, or the expletive `there` — and drops
do-support onto the main verb, skipping `-ly` adverbs and handling the four irregular present forms
(`be`/`have`/`do`/`go`). It covers the author's target #4 and three of the composer's four yes/no
templates. It REFUSES, keeping the user's text verbatim:

- **wh-questions** — they ask for a value, so there is no proposition to state without inventing the
  answer.
- **determiner-headed subjects** — bounding them needs a parser, and guessing flips quantifiers.
  "Is ANY entity reachable from Checkout?" asks whether SOME is; "Any entity is reachable from
  Checkout" claims they all are, and the composer emits that exact shape for an unbounded endpoint.
  This is also why the author's "Can an event originating at Checkout eventually cause…" is not
  normalized: the participial post-modifier puts the subject boundary out of reach, and det+noun
  would strand "originating" after the modal.
- **`Did …`** — irregular pasts are not a closed set; four irregular presents are.

A closed verb lexicon would have reached the determiner cases, and was rejected: an unlisted verb
fails safe (no rewrite) but a MISLISTED one mangles, and tokens like `run`, `cause` and `cache` are
both verbs and head nouns here. A mangled statement reads as the author's own words, so nobody goes
looking for the tool that produced it.

**Inversion does not re-case the subject, and that is a trade.** "Does parsing run before
validation?" becomes "parsing runs before validation." — a lowercase sentence start. `api`,
`checkout`, `dead_letter` and `parsing` all arrive as lowercase tokens and only the last is a word,
so sentence-casing would rename a declared entity or state inside a claim about it. The first draft
capitalized and its own tests caught it. Renaming a declared object is the worse error.

Normalization runs at BOTH authoring paths and is idempotent: the ask bar normalizes before
`derivePropertyId` so a tracked property is not addressed as
`is-fulfillment-reachable-from-checkout` forever, and `planEdit` normalizes the saved text. The Track
box is PREFILLED with the composer's interrogative label (`askbar.ts`), so this runs on text the
workbench wrote as much as on text a person typed.

**Deliberately NOT renamed.** `NoSuchQuestion` and `EvidenceReading.savedQuestions` enumerate saved
query IDs to diagnose a misspelled id; an id list is not a statement, and the IR object genuinely is
a query document (`kind`, `quantifier`, a `graph`/`behavior` form, the `save-query` / `delete-query`
ops, `mage-query.schema.json`). Renaming the IR concept is a larger ruling than the one given. The
user-visible COUNT did move — the summary and the announcer said "6 saved questions" about six
properties — because the ruling's stated motive is the distinction the UI shows. `richerQuestion`,
`ModelType.question` and every `purpose.question` stay interrogative; an ask is upstream inquiry.
Learn's `SavedQuestion` became `SavedStatement` because its `label` IS a property's text, and leaving
it divergent from `properties.ts` would be the mixed vocabulary the ruling warns against.

**Quantitative expectations keep their question marks, on purpose.** "What is the peak modeled memory
over reachable configurations?" is a `quantitative_expectations` entry — a hand-derived value with
arithmetic, never read by `readPresentation` and never rendered as property text. Its answer is a
number, not a verdict. Asserting a specific value in the sentence would claim an ESTABLISHED the
engine never checked.

**The gate.** `test/properties.test.ts` holds both halves: no shipped query `name` and no fixture
`label` is interrogative (trailing `?` or a leading auxiliary / wh-word), and — asserted positively —
every shipped `purpose.question` and every `ModelType.question` / `richerQuestion` DOES ask. The
positive half is the one that matters: a skip-the-purposes test would stay green if somebody
flattened a model's purpose into a statement to satisfy the first half, erasing the same distinction
from the other side. Both halves carry a floor on how much they read, so a walk that finds nothing
fails instead of passing vacuously.

Gates: `check` clean, `check:parity` 0 violations over 26 capabilities, node 829 (815 + 14 new),
smoke 3, browser 40, a11y 111 — every tier 0 skipped.

### 9k. The persistent Learn entry — a requirement that fell between two waves

Appended by the wave that landed the header entry `requirements-learn-261002.md` specifies, moved
the operational panes' explanatory prose onto Learn, and wrote the check that would have caught the
gap. **§9i is left for whichever of the two sibling waves live in these files at the time lands
first;** this section takes the next letter after it rather than racing for one.

- **Nothing regressed. A requirement was dropped, and the diagnosis matters more than the fix.** The
  Learn page landed whole — `learn.html`, the derivation under `src/learn/`, the gallery built from
  the model-type registry, the UX-I9 content checks. The NOT ANSWERABLE route landed too. The
  requirement's own first sentence did not: "The global header SHALL contain a persistent Learn
  entry: `MAGE  Workspace  Learn … ⋯`". This file's §5 put Learn inside a ⋯ menu alongside Export,
  Run all, System Browser and Advanced query; `index.html` and `src/ui/shell/header.ts` both carried
  a comment saying that menu "is a later wave's"; **that wave never ran, and the menu does not
  exist.** So Learn was not hidden behind an overflow. There was no overflow. The only route from the
  application to the page was `#ask-absent-learn`, inside `#askbar`, which SH-I1 unmounts on a
  pristine page — reachable only after loading a model and asking a question the system's declared
  types cannot answer.

- **The ⋯ menu was the wrong home for it, and the requirement says so.** `persistent` and `inside a
  collapsed overflow` are contradictory. The menu stays a later wave's for the other four controls;
  Learn comes out of that list, and §5's table should be read as four entries rather than five.

- **Why every gate stayed green, which is the finding.** UX-I9 constrains what the Learn page SAYS —
  one section per registry entry, every visual the real renderer, every suggested composition one
  the kernel evaluates — and `test/learn-content.test.ts` plus the smoke tier hold that tightly.
  Nothing asserted the page is REACHABLE. The capability registry could not have caught it either:
  Learn is navigation, not a semantic capability, so UX-I1 has no opinion about it, and
  `npm run affordances` emits an unchanged model after this change. A page can be perfectly derived
  and perfectly unreachable, and the suite had no axis on which to notice.

- **What landed: a link, in the bar, in every state.** `<a id="learn" href="learn.html">` inside a
  `<nav class="pages">` beside the title, with `Workspace` as its sibling and `aria-current="page"`
  on whichever page is open — the same two-entry nav `learn.html` already shipped, so the two pages
  hold one bar between them rather than one page having chrome the other invented. A LINK and not a
  button, because it navigates: middle-click, ⌘-click and the context menu all have to behave, and a
  click handler on a button gives none of that. It is never `disabled`, which is the substance of
  `persistent` — Export, Run all, Undo, Redo, Commands and the what-if toggle are all dimmed with
  nothing loaded (F-2), and the empty state is precisely when a reader needs the surface that
  explains what a model system is.

- **`src/ui/shell/header.ts` owns it, and owning it is three things.** It resolves `#learn` through
  `byId` at mount, so a rename blanks the page before first paint and the node tier's page-contract
  scan covers the id with no list to maintain. It sets the href from `LEARN_PAGE` in
  `src/app/learn.ts` — the module the refusal panel's link already derives from — so where Learn
  lives is one value. And its paint calls `assertLearnReachable`, which reports to `console.error`
  when the entry is hidden, inside a `hidden` ancestor, or no longer pointing at the Learn page. That
  channel is `main.ts`'s for unbound affordances and for its reason: the browser tier already asserts
  the page logs no errors of its own, so losing the entry reds a gate that exists. Measured: hiding
  the nav reds the smoke tier on "index.html logged console errors" as well as on the direct check.

- **The check that was missing, and it is the deliverable.**
  `test/browser/learn-reachable.test.mjs` drives the rendered page in BOTH empty states — pristine,
  and the model-less system "Create new model system" produces, which is the state the ruling's
  screenshot shows — and asserts present, in the banner, rendered (`checkVisibility`), named, not
  inside a `hidden` ancestor, pointing at `LEARN_PAGE`, reached by Tab, and activated by Enter onto a
  Learn page that reaches `window.mageLearn.ready` with a non-empty gallery. A last suite asserts the
  asymmetry the dropped requirement left behind: on a pristine page the refusal route is unreachable
  and the header entry is not. **Sabotaged four ways before being trusted**, because a grep for the
  string "Learn" in `index.html` passes all four: the entry deleted (9 of 11 red); the entry moved
  inside a collapsed `<details>` overflow, which is the shape §5 originally specified (7 red); the
  entry given `tabindex="-1"`, present and visible and keyboard-unreachable (4 red); the nav
  `hidden`, which is the author's complaint exactly (7 red, plus the runtime guard).

- **The cheapest three assertions are duplicated into the smoke tier, deliberately.**
  `test:browser` is declared out of `npm run all` with CI as its evidence
  (`test/gate-reachability.test.ts`), which would have left a requirement dropped once protected only
  by a gate an agent does not run before reporting. So presence, renderedness and the href also sit
  in `smoke.test.mjs`, on a page that gate already has open — no extra browser, no extra page. The
  keyboard walk, the navigation and the model-less state stay in the deep tier. The `tabindex="-1"`
  sabotage is the one of the four the cheap rung does not catch, which is the honest boundary of a
  three-assertion check.

- **The prose moved, and `src/learn/workbench-guide.ts` is where it went.** The ruling: "much of
  that explanatory prose can probably move into Learn, making the operational panes considerably
  quieter." Three declared sections — how the workbench is laid out, what a property is, how asking
  works — built by `src/learn/main.ts` with the same grammar as a gallery section and appended AFTER
  it, because the landing is the gallery. The division held to: **a pane says what to do HERE; Learn
  says what it MEANS.** So the models rail keeps "No purposeful model yet. Add one, and state the
  engineering question it answers" with its `+ Model` row, and the account of what the Inspector
  shows, what a verdict is, what a bounded search reports, and where each kind of operation lives is
  on Learn. Four surfaces went quieter: `#ask-help` from five sentences to two, the `+ Add` hint from
  two to one, the Inspector's empty sentence and its action bar's, and the properties rail's.

- **The move is checked as a MOVE.** Each guide section declares the surface it took prose off and a
  phrase that must no longer be in it, and `test/workbench-guide.test.ts` reads those files. A copy
  fails on the day it lands; a later wave restoring the verbose sentence fails then, while Learn is
  still claiming to own it. That is the control for a change a type system cannot see, and the shape
  generalises to any "move this text" instruction.

- **One empty state had nothing honest to say, and it was also wrong.** `paintPrincipal`'s null
  branch read "No model is loaded, so no model is being viewed" — false in the only state that
  reaches it, because `resolveSubject` falls back to the first model or machine the system declares,
  so a null principal means a system IS loaded and declares neither. That is the model-less state the
  ruling is about, and the pane named no next act in it. It now reads "This model system declares no
  model yet. Add one under + Add above, and it appears here with the engineering question it
  answers." Nothing was invented: the control it names is the one already on that toolbar.

- **The a11y numbers moved in one place and dropped in none.** Two links join the pristine tab order,
  so the opening walk pin goes from five stops to seven — `a#skip, a#, a#learn, input#file,
  button#new-system, select#example-choice, button#example-load` — and the focusable count on the
  loaded page goes 117 → 119. Everything else held: axe reports 0 violations and the SAME
  rules-passed in all seven states (39 / 41 / 41 / 20 / 45 / 45 / 45) with identical incompletes, 17
  keyboard operations proved, 44 of 44 declared paths walked, UX-I1 at 0 over 26. The two added stops
  are site navigation rather than controls, they sit between the bypass and the ways in because that
  is where page chrome belongs, and the skip link exists to skip exactly them. The pin that used to
  be titled "six stops became five" is retitled: what it asserts is that the walk does not reach into
  the unmounted workspace, and that claim never depended on the number.

- **Left for a later wave, measured rather than guessed.** The ⋯ menu still does not exist and the
  other four controls still stand in the bar; this change does not open that surface. The banner's
  CSS rules are still written twice, once per page — `nav.pages` is now the same selector in both, so
  the duplication is at least spelled identically. And the axe suite's header comment records
  `index.html` loaded at 48 rules passed where the receipt measures 41; that gap predates this wave
  and belongs to whichever change made a rule inapplicable, but it is the kind of stale number this
  file's own discipline says to re-measure rather than inherit.

### 9l. A real layout engine as built — the suite that could not see the collisions it was for

Appended by the wave that executed the author's ruling: *"the Workbench should not manually position
graph elements in ways that permit nodes, edges, or labels to collide… replace it rather than
continuing to patch individual collision cases"*, plus *"put relation/type semantics in a legend, not
repeated labels."* The hand-rolled placer is gone; `@dagrejs/dagre` lays out behind the
`LayoutEngine` seam that already existed.

**THE SUITE WAS THE REAL FINDING, not the engine choice.** Eighteen layout tests were green on a tree
that drew five distinct collisions in the shipped examples. The reason is that every geometry
assertion read `Layout` and the collisions were in what got PAINTED, and that one of them tested the
wrong predicate:

- `pipeline-performance` painted `invokes` and `stage_of` at the **identical point** (401.3, 45).
- `event-propagation` painted six edge labels carrying **one** distinct word, four of them over node
  boxes.
- A rank-skipping edge `a→d` drew **one straight run at y=51 through the centres of `b` and `c`** —
  and the backedge test could not see it, because it asked whether a polyline VERTEX landed inside a
  box. A straight edge crosses a box *between* two vertices, so the vertex form is blind to exactly
  the geometry it exists to forbid.
- The initial-state marker drew at **x = −3 against a viewBox starting at 0**, in all five machine
  diagrams.
- The emphasis legend's longest row reached **x ≈ 490 inside a viewBox 420 wide**.

The last two share one cause: `bounds()` saw rects and edge points and nothing else. Text, markers
and the legend are ink, and ink the viewBox does not know about is ink the browser cuts off. The
marker's offset and radius were literals inside the painter — `26` and `5`, known to that function
and to nothing else — so no extent calculation *could* have reserved room for them.

So Step 0 was to strengthen the suite first, against the unchanged tree, and watch it go red:
**5 failing of 23**, with the counts above as the failure messages. Only then was the engine swapped.
Without that order the swap would have been an act of faith.

**What the new properties assert**, over a corpus derived from the examples directory — every model
and every machine of every shipped example, 12 subjects, with a floor assertion so a glob that
matched nothing fails instead of passing vacuously:

| Property | Reads | Caught at HEAD |
|---|---|---|
| no edge crosses a node box it neither leaves nor enters | Liang–Barsky, segment vs rect | 10 crossings |
| no two node boxes overlap | rects | 0 — it already held |
| every painted text run and marker is inside the viewBox | the rendered TREE | 5 clipped markers |
| no label overlaps a label or a node box | the rendered TREE | 23 collisions |
| a rank-skipping edge routes around what it skips | the sharpest case for the segment form | 1 |

`no two node boxes overlap` passing at HEAD is worth recording: the old placer's nudge loop did its
job, and the ruling's first clause was the one requirement already met.

**Engine: dagre, and the choice is derived rather than preferred.** Layout must be synchronous and
DOM-free, and both are held by gates rather than by taste — the shell's paint callbacks return
`void`, the render port returns its result rather than a promise, and a test asserts the renderer
runs exactly once per paint, so render-measure-render is forbidden. That eliminates elkjs
(promise-only; and its incremental mode preserves layer and order but not coordinates, failing the
zero-displacement property this feature exists to protect), Graphviz-WASM (async init, Béziers where
the contract says polyline), and Mermaid (whose layout *is* dagre plus elkjs, and which measures text
against a DOM). Dagre is synchronous, DOM-free, a multigraph so parallel edges separate, routes
around nodes through dummy nodes, and **treats edge labels as sized boxes** — which is the ruling's
"text must participate in layout", obtained from the library instead of hand-rolled.

**`layout.ts:542-554` argued the opposite and is now superseded.** It said an external engine should
enter UPSTREAM as a complete hint set, deliberately bypassing the seam, because elkjs cannot
implement a synchronous signature. That reasoning was sound *for elkjs* and does not generalise: a
synchronous engine can implement the seam directly, and routing through hints would have meant the
renderer could never see an engine's EDGE geometry — only its node positions — so every collision
above would have survived the integration. The hint path is not removed; it is still the cold-layout
contract and still pinned. It is no longer the sanctioned route for an engine that can be called.

**Four traps, three of which the brief predicted and one it did not.**

- **Ids are inserted sorted and prefixed `n:`.** Graphlib keeps nodes in a plain object, so a model
  whose entities are named `1`, `2`, `10` would be iterated in *numeric* order by JavaScript itself
  and lay out differently from one named `a`, `b`, `c`. The prefix makes every key non-numeric.
- **Cycles are broken here, not by dagre's `acyclicer`.** Depth-first search seeded from
  `scene.roots` — a machine's declared initial state. Dagre's greedy heuristic answers a different
  question; a lifecycle should rank by distance from the state the author declared as the start, and
  `retry` should be the backwards edge because it *is* the backwards edge.
- **Region children never enter the graph.** A child's rect is derived from its parent's, so an
  engine ranking it as a peer would be ranking a coordinate it does not control. Only outer nodes go
  in, with each region sized to hold its contents — which is what keeps region pinning and
  containment passing untouched.
- **NOT predicted: `width`/`height`, not `w`/`h`.** Dagre reads those exact keys for an edge label
  and silently treats an unknown-size label as *no label* — reserving nothing and reporting no
  position. The first draft passed the internal `{w, h}` shape, so every label fell back to the
  polyline midpoint and the collisions came straight back. It typechecked, because the label object
  is an index signature. This is why `labelBox` is one named function with the spelling in its
  doc comment.

**`DAGRE REPRODUCES THE FIVE EXACT RANK INTEGERS.** The brief flagged
`render-layout.test.ts:164` as the one genuinely open risk and the survey could not verify it.** It
reproduces them exactly — `waiting` 0, `processing` 1, `reviewed` 2, `failed` 2, `published` 3 — and
so does the exact `ranks` array at `:177`, `[["api"], ["remediation"], ["gateway"]]`. Both tests are
unchanged. The reason is not luck: on these DAGs every edge has minimum length 1, so network simplex
and longest-path agree. But it required one correction. **Dagre's node ranks are always EVEN** —
`makeSpaceForEdgeLabels` doubles every edge's minimum length so a label dummy can sit in the
half-rank between two real ranks, whether or not any edge carries a label — so the raw output is
0, 2, 4, 6. `Layout.ranks` is an ordinal index that the twin turns into reading order, so the engine
compresses distinct ranks back to 0, 1, 2, … Without that, the exact-rank tests would have failed and
the twin would have announced ranks no reader could count.

**Of the ~6 brittle coordinate tests the brief predicted, 4 survived unchanged and 2 needed
rewriting.** Survived: `:164` five exact ranks, `:177` the exact `ranks` array, `:133`'s 1000–1400
window, `:110`'s `LANE_PITCH` negative control. Rewritten, each to the property it was approximating:

- **`:182` detour-lane clearance.** It required a vertex below every node box by a fixed clearance
  constant. That is not the requirement — it is one implementation's choice of WHICH SIDE to detour
  on, and dagre routes this backedge *above* the flow. It now asserts what the old form was
  protecting: exactly one backwards edge, it is `failed → waiting` (so the cycle broke at the
  declared initial state and not wherever a heuristic found cheapest), it is flagged `backedge` so
  the picture can mark it, it travels backwards along the rank axis, it detours rather than running
  straight, and — by the corpus property — it crosses no box.
- **`:259` `span === METRICS.selfLoop`.** An equality against one engine's chosen loop height, a
  number no requirement names. It now asserts the loop encloses area on both axes, escapes the box
  it returns to (the property that makes it visible at all), stays local to its state, and crosses
  no other node.

Both constants those tests named — the self-loop height and the detour clearance — were left dead in
`METRICS` by the removal and are deleted. A dead constant in a shared metrics table tells the next
reader there is a detour lane to find.

**The legend, and A CORRECTION TO THE RULING'S PREMISE.** Relation TYPE labels are gone from the
edges: `scene.ts` sets a relation's `label` to null and keeps `via`, so the type is still the join
key, still in every edge's description in the twin, and now stated ONCE in a key row. **Per-edge
EVENT NAMES on state-machine transitions are KEPT.** `acquire` and `retry` are not a repeated type
label — they name *different* events on different transitions, so the text is topology-bearing, a key
strip has nothing to say once, and two states joined by two transitions are distinguishable only by
those words. Reading "do not write relation semantics on every edge" as "delete all edge text" would
strip real content from behaviour diagrams. What makes keeping them safe is that the engine now
reserves a sized box for each one.

**The key is a SECOND strip, not an extension of the emphasis legend**, and the separation is
load-bearing rather than tidy. The two have different lifetimes: the vocabulary key is present
whenever a diagram has shapes and arrows, while the emphasis legend appears only once a query has
emphasised something — and the a11y tier uses *exactly that* ("a legend appears only under
emphasis") to prove a picker's change reached its render. Merging them would have made that property
false and broken the proof. So `data-layer="key"` with `mage-key`, beside `data-layer="legend"` with
`mage-legend`, and `AccessibleScene.key` beside `.legend`.

**Encoding.** Emphasis already owned the stroke hue, so it moved to a wide translucent underlay
polyline painted beneath the edge, which frees the stroke for relation type. A type gets a hue AND a
distinct arrowhead form — the ruling's redundant channel — assigned by sorted type order so the
mapping is a function of the model rather than of authoring order. Four forms (triangle, open,
diamond, square) and four hues, the Okabe–Ito subset clearing 3:1 against the fixed `#ffffff` figure
ground: `#0072B2` (5.19:1), `#D55E00` (3.87), `#009E73` (3.42), `#CC79A7` (3.06). The three Okabe–Ito
entries that fail that floor are deliberately absent — `#E69F00` (2.25), `#56B4E9` (2.31), `#F0E442`
(1.32) — which is also why there are four forms rather than eight; the maximum relation-type count in
any shipped diagram is four. **Node type adds no colour**: an entity's `type` is unbounded, so a
categorical palette over it is unsound. The three node SHAPES get key rows instead, which is the
cheap half of the same omission — they had been drawn since Wave 0 with nothing anywhere saying what
they mean. `MarkStyle` still declares no colour field at all.

**Shape-key prose had to be cut back, and the reason is a measurement.** A key row is drawn inside
the diagram's own viewBox, so the longest meaning sets the canvas width. The first draft's thorough
sentence ("a square-cornered box is an entity: a service, component or other named part") made a
445-unit teaching diagram **561** units wide — the picture shrinking inside a fixed reading column to
make room for prose about itself. The rows now name the thing in a few words and the fuller sentence
lives in the twin's key list, which has no width to spend. Measured after: 445.

**Canvas fill and resize — §9i had already done the part that was doable, and its refusal stands.**
That section's `width: 100%` plus `max-height: 80vh` is what makes the figure fill its frame and
respond to size, and it is untouched here. Its stated refusal — that spreading ranks to fill a
measured viewport would mean passing viewport geometry into a module that is deliberately pure,
synchronous and DOM-free, whose determinism is an acceptance criterion — is **correct and not
revisited**; horizontal extent in a layered layout is a property of the model's edges, and no engine
changes that. What this wave contributes to the same complaint is the half §9i could not reach: the
viewBox now accounts for every piece of ink, so the frame is filled by a COMPLETE drawing rather than
one whose marker and legend hung outside it. The flat `max(bounds.w, 420)` guess is replaced by a
measured union over the strips, using the same no-DOM estimator the layout uses. One bug of my own
was caught by re-measuring: taking the margin on the union instead of on the strips alone added 28
units of empty canvas to the right of every diagram.

**What the geometry change costs, measured.** Rank COUNTS are identical on all 12 subjects — the
logical structure is preserved exactly. Model diagrams keep their width (or narrow slightly) and gain
the key strip's height. Machine diagrams widen 18–24% (`docable:document` 766 → 917,
`document-lifecycle` 970 → 1175) because edge labels now get reserved boxes between ranks instead of
being painted over whatever was there. `data-policy` goes 445 × 582 → 445 × 746: dagre packs its 11
nodes into 2 ranks more tall than the old grid did, and in Learn's 46rem column that figure is
height-capped by `max-height: 80vh`, so it renders ~22% narrower than before. That is the honest
price of not overlapping anything, and it is a layout trade rather than a defect.

**Reading order is unchanged on two of three sampled diagrams and changes on one, by design.**
`machine:document` and `model:service-flow` produce byte-identical reading orders. `event-propagation`
rank 2 goes from `analytics, billing, inventory` to `inventory, billing, analytics` — the old order
was a barycentre pass with an alphabetical tie-break, the new one is dagre's crossing-minimised lane
order. Reading order is specified as "rank then lane", so following the picture's actual lanes is
what the specification asks for; the twin and the diagram still agree, which is the property that
matters.

**LEARN RENDERS THROUGH THIS SEAM AND WAS VERIFIED SEPARATELY.** `src/learn/main.ts` calls the same
`renderView` and re-renders with a `selection` plus position hints when a node is picked, so every
diagram on the page changed. Its exemplar subjects are drawn from the shipped examples, which means
the corpus properties already cover them — checked rather than assumed. All four figures: key rows
present, emphasis legend appearing only under selection, and **zero nodes displaced on select**, which
is the hint round-trip holding through Learn's own interaction path. `learn.js` is a separate bundle,
so it was rebuilt before the browser tiers.

**Four gates added for the ruling, and all four watched red before being trusted.** Nothing held any
of this: the author's complaint about `may_propagate_to` on six edges was true of a tree whose whole
suite was green. Reverting relation labels fails 2 tests; deleting transition event names fails 1;
dropping the initial marker from the extent calculation fails 1. **The fourth attempt failed to
fail, and that is the useful part.** "Edge text is placed where the engine reserved room for it"
passed when the painter was reverted to the polyline midpoint — because dagre reserves a label's box
by inserting a dummy NODE into the edge, so its label position *is* the middle vertex and the two
readings agree by construction. Asserting it against the real engine proves nothing. It now tests the
painter against a stub engine that puts the label where the polyline never goes, which is the
contract that matters, and it fails on that sabotage.

**A finding from one of the new gates.** "Every emitted class has a stylesheet rule" found
`mage-plain` — emitted on every unemphasized shape, with no rule anywhere. Harmless by design
(`PLAIN_MARK` exists so `MARKS` can be compared against a named baseline and carries no treatment),
so it is exempted by name rather than by a loose predicate, which leaves a SECOND unstyled class
still failing.

**Bundle cost, measured before and after by building HEAD in an isolated copy** rather than trusting
the prior doc's number (the brief's "554 KB raw / 168 KB gz" was right, and is `workbench.js`):

| | before | after | delta |
|---|---|---|---|
| `workbench.js` | 556,201 raw / 169,239 gz | 609,187 / 188,060 | +52,986 / **+18,821 (+11.1%)** |
| `learn.js` | 395,259 / 120,739 | 448,512 / 139,630 | +53,253 / +18,891 |
| `analysis.worker.js` | 312,293 / 93,430 | unchanged | 0 |

dagre plus graphlib is 48,199 bytes of the minified bundle, 7.9%. The Worker bundle is untouched,
which is the kernel/host boundary doing its job — layout is a host concern and never reaches the
analysis engine.

Gates at the final tree, every tier, nothing skipped: `check` clean, `check:parity` 0 violations over
26 capabilities, node tier **862** (851 before, +5 collision properties +6 legend gates), `build`
clean, smoke **3**, browser **61**, a11y **111**.

**Recorded residue.** The corpus properties run on COLD layouts only. A node pinned at an arbitrary
hint can still take an edge across the diagram, because honouring an arbitrary user position and
routing cleanly are in genuine tension and the pinning contract wins — the old code had the same
property. Stating it: incremental layouts are stable, not collision-free, and no gate claims
otherwise.

### 9m. The two contextual Learn routes — specified, unbuilt, and unasserted

Appended by the wave that built the `+ Model` picker and the per-object route into Learn.
§9k landed the persistent header entry and recorded the diagnosis; **the same requirement asks for
two more routes, and both were still missing.** `requirements-learn-261002.md` sketches a picker
that presents model types by the engineering question each answers, with a `Not sure?` escape, and
an `About <Type>s` / `Possible combinations` pair offered from the object you are looking at. Neither
existed. Verified before the wave rather than assumed: no `Not sure` string anywhere in `src/`, and
`inspector.ts` carrying no Learn route at all.

- **The diagnosis is §9k's, one turn of the screw further.** §9k found a page that was perfectly
  derived and perfectly unreachable, and closed the reachability gap with a link plus a check. What
  it did not do was ask how many OTHER routes the requirement names. Four; two landed. The reason
  both survived a whole redesign is the one §9k already named and did not generalise: UX-I9
  constrains what Learn *says*, and nothing constrained where the application *offers* it. So the
  lesson is not "add a gate for the header entry" but "a requirement that enumerates routes needs a
  test per route", which is why this wave's node tier is organised by route rather than by module.

- **The picker presents QUESTIONS, and the questions come from the registry.** `MODEL_TYPE_CHOICES`
  in `shell/edit-dialogs.ts` projects `MODEL_TYPES` — id, label, question — and the dialog renders a
  button per row. A fourth registered type appears in the picker with no edit to the dialog, which
  is the property UX-I9 exists for one layer in from the Learn page: the author's objection to a
  hand-maintained surface is that it drifts from what the kernel supports, and a question typed into
  a dialog is that drift in front of the person creating a model.

- **It FILLS the question field rather than selecting a type, because `add-model` carries no type.**
  The operation declares a purposeful model in `system.models` and sends `add-model` plus
  `set-purpose`; there is no type parameter for a picker to set, and a control that appeared to
  choose between three substrates while producing one would be worse than no picker. So the row
  writes its type's question into the field the action itself names — one new `EditAction` field,
  `questionField`, present on `add-model` and absent on the other nine, which is also the switch
  that decides whether the picker is shown. The question stays editable and the user still presses
  the confirm button: a model's purpose is usually narrower than its type's generic question, and a
  picker that submitted would teach the opposite of what the field exists to teach.

- **The escape goes to the gallery, and that is a design claim rather than a default.**
  `learnHrefForType` was right there and is the wrong call here — a reader who cannot tell which of
  three questions they are asking is the one reader a per-type deep link misdirects. Per-row Learn
  links were considered and dropped for the same economy: the inspector now offers the per-type
  route from the object, and six controls in a dialog whose job is four fields crowds the surface
  the escape answers in one. The escape's href ships in the markup so it works before the bundle
  evaluates, and `edit-dialogs.ts` re-assigns it from `src/app/learn.ts` — the header entry's own
  arrangement, so "where Learn lives" stays one value.

- **The per-object route lives in the inspector, and the pane's rule needed one word changed.** The
  inspector is the pane that describes the selected thing, so it is where "what kind of model is
  this?" is asked. Its standing rule — nothing here is a command, everything navigates — already
  covers a Learn line, so the route is a third `InspectorAction`, `learn`, carrying its own href
  because its destination is not a surface of this page. `DESTINATION` stays total over the two
  in-page kinds by subtraction (`Exclude<InspectorAction, { kind: "learn" }>`), so a fourth in-page
  action is still a compile error until it declares a surface. A Learn line writes no `data-arg`,
  and that absence is the mechanism by which the pane's one delegated listener steps aside and lets
  the browser follow the link.

- **The type comes from the registry's own 1:1 with the query dialect, not from a type id written in
  the pane.** `LEARN_ROUTE_FOR` maps a selection kind to a `Query["kind"]`, and
  `modelTypeForQueryKind` resolves that to the registered type — the same function the dispatch gate
  and the ask bar's NOT ANSWERABLE route use. The label is `ModelType.label`, so the line reads
  "About state machines" as the registry spells it, the derivation `learnLinkForRefusal` already
  used for its link text. `Possible combinations` names the declared partner and the question the
  PAIR answers, from `combineWith`; every declared USE of the type follows, at `anchorForUse`'s
  spelling. The table is read at exactly ONE site, so "which objects offer the route" is one
  declaration rather than a judgement repeated in five inspection functions.

- **Three selections deliberately offer nothing, and one of them is the interesting case.** An
  ENTITY has no Learn block: identity is shared across every reduction, so an entity belongs to all
  three types and to none, and a block claiming one would contradict the `Appears in` list directly
  above it. A relation and a state are parts of a typed subject rather than subjects of their own.
  And **the quantitative type is reachable from no selection at all** — `SelectionRef` has no member
  for a quantity. That is a gap in the SELECTION vocabulary, not in this block, and it is left
  recorded rather than papered over; the ask bar's refusal route already carries a reader to that
  section from the question they asked.

- **The capability registry gained an exemption, not a capability, and the reasoning is worth
  keeping.** `npm run affordances` emits an unchanged model and UX-I1 still reports 0 over 26 — Learn
  is navigation, exactly as §9k found. But the served-page sweep asserts every `<button>` is a
  declared affordance, and the picker's rows are one button per registry entry: no id to write down
  and no fixed count. That is the `CHROME_HOSTS` shape, so `#edit-dialog-type-rows button` joins it
  with its reason. The constant's doc comment said each member is exempt because its controls are
  *navigation*; that was true of its one member and is not the general rule, so it now says what the
  rule actually is — the control moves something the census is not about. The contents tree moves the
  view's selection; a picker row moves the open dialog's own unsubmitted field. Neither reaches the
  IR.

- **The drift pin is a SOURCE scan, because comparing values proves nothing about derivation.** Two
  of the node-tier tests compare `MODEL_TYPE_CHOICES` against `MODEL_TYPES` field by field, and two
  equal strings are equal whether they were derived or copied. So a third test reads
  `edit-dialogs.ts`, `inspector.ts`, `index.html` and ITSELF, and asserts no registered type's
  question or label appears as a literal in any of them. **Its first run went red on three sites,
  all of them prose quoting the requirement's own sketch** — and the sketch is already behind the
  registry for two of the three types, so those comments would have stood a stale question six lines
  above the live one. The comments now give the shape and cite the requirements file for the words.
  A comment is not a surface; a comment beside the host that renders the real thing is read first.

- **The a11y tier gained a page state, because the surface was otherwise outside every state it
  sweeps.** Three buttons and a link inside a closed `<dialog>` are in no accessibility tree, so the
  tier would have reported its old 111 passing over a surface it never looked at — the repo's
  "a gate exists and the path meant to run it does not reach it" class, read from the other side. So
  `axe.test.mjs` declares a fifth `index.html` state, `add-model-dialog`, driven through the human
  controls, with `covers` naming the rows, the escape and the field they fill; at modal scope the
  floor is 15 for the hypothesis state's reason, and `covers` is what gives the state teeth. **It
  surfaced a latent fragility in the suite, which is recorded because the next person to add a modal
  state will meet it:** a `<dialog>` in the top layer paints a `::backdrop`, and the diagram's
  contrast measurement reads the colour actually behind each glyph — so the dark theme's labels went
  from clearing AA to failing it with no change to the renderer. The fix is one line in
  `diagram.emphasise`, which already existed to undo the previous state's modal and now closes this
  one too, through the dialog's own Cancel.

- **Every new test was sabotaged once and the red read.** Twelve sabotages: dropping a type from the
  projection, typing a registry question into the dialog, detaching the Learn block in `resolve`,
  turning the escape into a deep link, rotting the shipped href, pointing `About <Type>s` at the
  partner, hand-assembling a use anchor, never revealing the picker, rendering no rows, filling
  nothing on press, and — against the axe state — no rows and no escape link. Each reds at least one
  new test and the right one. Two gaps are worth naming rather than claiming total coverage: the
  smoke rung asserts the rows EXIST (it is zero-interaction, and the picker is built at mount), so a
  picker that renders and is never revealed reds only the deep tiers; and detaching the Learn block
  leaves the `LEARN_ROUTE_FOR` table test green, since that test audits the declaration rather than
  its effect. Five other tests catch that one.

- **The numbers.** Node 851 → 864, browser 61 → 69, a11y 111 → 112, smoke 3 (extended in place, 2.9s
  against its 8s budget), UX-I1 0 violations over 26 capabilities unchanged, `tsc` and `build` clean,
  0 skipped anywhere. The a11y count rose by the one state; nothing dropped.

- **Left undone, deliberately.** The ⋯ menu still does not exist and this wave did not invent it: the
  requirement's sketch puts `About <Type>s` under one, and §9k already ruled that the header entry is
  persistent rather than behind an overflow. Putting the per-object route in the pane that describes
  the object is the same reasoning applied one surface over. And the sketch's three questions are
  shorter than the registry's three; the registry is the authority, so the picker shows the longer
  ones. Whoever updates `requirements-learn-261002.md` should re-cut the sketch from
  `MODEL_TYPES` rather than the reverse.

### 9n. The agent surface gets the gate the human surface already had — as built

Appended by the wave that drove `window.mage` from `describe()` and attached to a browser over CDP.
The author's ask: *"one agent opens a chromium headless to local instance of this; another acts as
the agent; they confirm the interaction works (and this should be fully automatable w/o any agents,
too, to confirm the devtools interaction works)… I want full feature coverage following our
model-based approach here for the workbench."* Two holes, both verified before the wave rather than
assumed: `test/browser/harness.mjs` only ever called `puppeteer.launch`, and nothing anywhere
compared what `describe()` advertises against what any test drives.

- **Fully automatable means NO AGENT IN THE LOOP, and that reading is the design.** The attach tier
  is one node process that spawns a browser and opens two CDP clients against it. Nothing asks a
  model for anything, so the interaction is checked on every run of the browser tier rather than
  demonstrated once by hand — which is what the two existing FR-AGENT assertions had been, by the
  browser suite's own admission in its header.

- **The attach path has nothing in common with the launch path except the protocol that runs
  afterwards.** FR-AGENT-1 specifies an agent attached to *the user's existing* Chromium and makes
  the transport the environment's responsibility; `puppeteer.launch` hands its caller an endpoint it
  was given, so it never performs the discovery-and-attach an operator's agent performs. The
  consequence measured before the wave: `puppeteer.connect` could be broken outright and the browser
  tier stayed green at 69. So `spawnDebuggableBrowser` starts Chromium as an ordinary child process
  with the page URL as an argument — the BROWSER opens the tab — and two independent clients attach
  to a session neither created. The agent client mutates; the student client, over its own socket,
  is where the assertions read. A call that merely returns would prove the method exists.

- **The port is chosen by the kernel and then READ BACK, which is not a detail.** The spawn passes
  `--remote-debugging-port=0` and the suite reads the profile's `DevToolsActivePort` file, with
  Chromium's own "DevTools listening on" line as the fallback. The reasoning is
  `startServerOnFreePort`'s, applied one layer out: a fixed port collides between PROCESSES, which
  is the normal state in this repo, and the failure mode is not a noisy red but a green gate that
  measured less — the 261002 a11y run that reported 8 passing when the keyboard file alone declares
  22. Two sources for the port rather than one because neither has been reliable on every platform,
  and the ceiling is 30 s against a measured 718 ms because a cold start on a loaded runner is the
  case that must not flake.

- **What attach does NOT prove, stated rather than implied.** It covers the transport MAGE claims to
  support, reached the way an operator's environment reaches it. It does not cover a REMOTE
  operator's network — a tunnel, a forwarded port, an agent on another host — and it is not supposed
  to: §FR-AGENT-1 makes that the execution environment's job, and MAGE opens no port, discovers no
  agent and holds no socket. What is in scope is that the surface behaves identically when reached
  by a client that did not start the browser.

- **The coverage gate's denominator is the page's own self-description, read at run time.** The
  human side has had a real census for several waves — `npm run check:parity`, zero violations over
  26 capabilities, failing on a one-sided change. The agent side had none: `describe()` advertised an
  operation list, the browser tier drove a couple of dozen `window.mage` paths, and nothing compared
  them. So an operation could be advertised to agents and never once executed, which is how an
  FR-AGENT regression ships silently. The gate reads `describe().operations` out of the served page
  and compares it against a table of drives keyed by the same names. A hand-written expected list
  was rejected for the reason this project keeps rejecting them, and the direction of its failure is
  the specific one: a newly registered operation joins `describe()` and never joins the list, so the
  gate would report full coverage of a smaller surface.

- **TWO axes, because the operation axis structurally cannot see nine callables.**
  `describe().operations` names CAPABILITIES, and the API has functions that belong to no capability
  row by deliberate decision: the four `view.*` methods are non-semantic by construction and
  therefore outside the census §4 rules on, `debug.sparql` is fenced OUTSIDE the semantic interface
  by a ruling, and `analysis.inFlight` / `analysis.cancel` / `analysis.resolveExhausted` are the
  reporting and escalation halves of capabilities rather than capabilities. An operation-only gate
  reads 26 of 26 while those nine go untouched. The second axis therefore walks the live
  `window.mage` object and measures what was called — by INSTRUMENTATION, not by declaration: the
  suite wraps every function on the object in a recorder before the drives run. A declared mapping
  from drive to path would be a third list to maintain, recording what the author believed a drive
  calls rather than what it called.

- **The instrumentation asserts its own integrity, because a lost recorder reads as a coverage
  gap.** Each wrapper is tagged with the path it records; the readout asserts the recorder is still
  installed and that every callable the page presents is one it wrapped. A method installed after the
  recorder ran is therefore reported as unmeasurable rather than silently counted as uncovered for
  the wrong reason. The non-function members are pinned as an exact set (`version`, one member), so a
  new data member cannot escape both axes by being neither an operation nor a callable.

- **The numbers, and they are the point of the wave: 26 described, 26 driven, 0 exempt; 31 callables,
  31 invoked, 0 exempt.** Both exemption maps are EMPTY. That outcome was not assumed — the drives
  were probed one at a time first, and the single capability that resisted was `explore-space`, which
  needs a system with a state machine and was being driven against the flagship, which declares none.
  The fix is the house rule rather than a spelled example id: the drive LOOKS UP a shipped example
  whose `counts.machines` is non-zero. The same discipline runs through every drive — the entity to
  annotate, the model to add a relation to, the composing relation type, the saved question to read
  evidence from, and the SPARQL text that exhausts a one-step budget are all derived from `inspect()`,
  `savedQueries()` or `examples()` at run time.

- **Exemptions are reasoned, capped, and the cap is zero.** A reason must clear the 40-character
  floor `gate-reachability` already uses, and `EXEMPTION_CEILING` is zero, so adding an exemption is
  two deliberate edits. The reasoning is the one `PARITY_VIOLATION_CEILING` records: a gate that
  exempts its way to green reports coverage that does not exist, which is worse than no gate because
  the number looks like evidence. The audit is a pure function and the negative control drives all
  six of its findings — undriven, thin reason, over the ceiling, exempted-yet-driven, naming
  something that no longer exists, and an EMPTY denominator, which would otherwise make every
  comparison trivially true and print a green tier having measured nothing.

- **The gate found two defects in its own drives, which is the only evidence that it works.** The
  first draft sent `set-label` with a `label` field; the operation's field is `value`, and the
  transaction engine refused the whole transaction with a SCHEMA finding. The second asserted
  `validate().authority` was a non-empty string; it is a `ValidationAuthority` record. Both read as
  red operation-coverage findings naming the capability — `edit-property` and `validate` advertised
  and undriven — which is exactly the message the gate exists to produce. The authority assertion was
  then strengthened rather than repaired: it now deep-equals `VALIDATION_AUTHORITY` imported from
  source, so a served bundle whose answer has drifted from the one constant that writes it fails.

- **The human→agent direction, which was the half nobody held.** FR-AGENT-1 claims agent and human
  share "the same application services and authoritative client-side state", and only the
  agent→human direction was pinned: `workbench.test.mjs:643` drives `window.mage.transact` and
  asserts `#live` moved. A shared-state claim is two-directional, and a UI that wrote through a
  second path would have passed every agent→human assertion in the suite. So the reverse is driven
  through a REAL control — the workspace's `+ Add` disclosure, its menu item, and the dialog's Apply,
  which is the route the registry declares for that site — and then read through the agent surface:
  the count moved, the hash advanced, `inspect()` carries the label the person typed, and `canUndo`
  flipped, so the two surfaces share one history rather than two. It is asserted twice, once on one
  page and once ACROSS the two attached CDP clients, because those are different claims.

- **A third reachability axis, found while registering the gate.** `test/gate-reachability.test.ts`
  reasons about SCRIPT NAMES; `node --test` takes GLOBS. So a gate can land in a file no pattern
  matches, and a pattern can match nothing at all — in both cases every name is wired and nothing
  runs, which is instances 1 and 3 of that file's own failure class one level down. The second
  direction is the sharper one: `node --test` over a glob matching no file exits 0 and prints
  "pass 0". Both are now audited over patterns DERIVED from `package.json`, with a negative control
  per direction, and `*` is confined to one path segment with `**` reported rather than
  approximated — an over-reaching matcher would have called the orphan case reached.

- **Registered by NAME as well, because the glob audit cannot assert existence.** A gate file that is
  deleted is matched by no pattern and reported by nothing, so both new tiers are declared in
  `AGENT_SURFACE_GATES` with the runner whose glob must reach them and a reason over the floor.

- **The numbers.** Node 921, browser 69 → 114, a11y 112, smoke 3, `check:parity` 0 violations over
  26 capabilities, `tsc` and `build` clean, 0 skipped anywhere. The browser tier grew by 45: six
  attach assertions and thirty-nine in the coverage gate.

- **One finding this wave did not cause and is not fixing: the FR-A11Y-3 debounce test is
  load-sensitive.** `test/browser/a11y/keyboard.test.mjs`'s "the announcement WAITS for the state to
  settle" reads the live region ONCE "well inside" the 250 ms debounce window and asserts nothing has
  been written yet. Under machine load the READ itself lands outside the window — the test took 6.8 s
  on one run and 16.8 s on another, against a 250 ms subject — so the settled write is already there
  and the assertion reports a debounce that is working as one firing per keystroke. Measured four
  times this session: 112 of 112 at the branch point on a quiet machine; 111 of 112 three times
  running with many agents live, in the full tier and with the file run alone; then 112 of 112 again
  once the machine quieted, against the identical bundle. Pass and fail over the same bytes is the
  definition of the flake, and the failing run reports a delay of 264 ms against a 250 ms debounce —
  the test is measuring its own CDP round trip. This wave's diff cannot reach it (no `src/`, no `index.html`, no a11y test touched; the only line removed anywhere
  is one `import` replaced by a superset), so it is reported to that file's owner rather than
  adjusted from here. The fix shape is a MEASURED window rather than a wall-clock guess: the suite
  already has `advanceVirtualTime`, which makes the timer clock deterministic, and reading the region
  after a virtual grant SHORTER than the debounce would hold the same claim without racing the CDP
  round trip.

- **Left undone, deliberately.** The publishing workflow hard-asserts the browser, axe, keyboard,
  smoke and declared-path receipts into its artifact; the two receipts this wave writes
  (`wb-attach-receipt.json`, `wb-agent-coverage-receipt.json`) are not yet among them. The tiers
  themselves run in CI — both files sit under the `test:browser` glob, which the workflow invokes
  unconditionally — so what is missing is the receipt assertion that publishes the measured numbers
  into the CI log, not the run. It is left to whoever owns the workflow this session rather than
  edited from here, and the coverage numbers are the ones most worth publishing, because three
  numbers are this gate's entire output.

### 9o. Every model's own assertions, evaluated in CI — as built

Appended by the wave that closed gaps 2, 5 and 6 of `AUDIT-system-models-261004.md`. The audit's
finding is the premise and it was re-verified at this tree before anything was written: a
`model-ir → ui` edge injected into `models/workbench-components.mage.yaml` passes the entire CI gate
set. Exit 0, every node test green. The nine `expect:` assertions that are the components model's
whole reason to exist were enforced by `validate.py` from `hooks/pre-push` — the author's laptop, on
a path a hurried commit skips — and by nothing a push had to clear.

- **The hole was in the parity test's SHAPE, not in either tool.** `validate.py` evaluates every
  graph query carrying `expect` and emits a failing `QUERY` finding on a mismatch; it works.
  `test/parity.test.ts` runs it on every push and compares the two engines' ANSWERS per query, which
  is a strong check and the wrong one for this: it declares `QUERY` a Python-only asymmetry, filters
  it out of the cleanliness assertion, and compares TS against Python rather than either against
  `expect`. Two tools agreeing on a verdict nobody expected was a passing build. So the fix is not a
  second validator — it is one test that compares each outcome to the file's own declared
  expectation, which the parity suite had deliberately never done.

- **`test/model-coverage.test.ts` generalises `test/examples.test.ts:893`,** the pattern the audit
  called the strongest in the repo, from one generated model to every tracked one. Denominator from
  `git ls-files '*.mage.yaml'`, minus the three shipped example systems. Every subject's saved queries
  are answered through `Workspace` on `realPorts`, and `checkExpectation` — the engine's own
  function, the one `validate.py` mirrors — decides met-or-not. **First run:**

  | model | queries | asserted | met | exempt | outcomes |
  |---|---|---|---|---|---|
  | `examples/docable.mage.yaml` | 5 | 5 | 5 | 0 | holds 2, refuted 2, unlicensed 1 |
  | `models/example-coverage.mage.yaml` | 24 | 24 | 24 | 0 | holds 22, refuted 2 |
  | `models/workbench-affordances.mage.yaml` | 80 | 80 | 80 | 0 | holds 78, refuted 1, unlicensed 1 |
  | `models/workbench-components.mage.yaml` | 9 | 9 | 9 | 0 | holds 1, refuted 7, unlicensed 1 |

  This row is the first run's record. §9p re-founded the components model on the observed import
  graph and it now carries 13 queries (holds 2, refuted 10, unlicensed 1), all met.

  The components model's nine PASS, which was the prediction: the audit measured them passing under
  `validate.py`, and the gap was that CI never asked. What changed is that asking is now on the
  protected path — under mutation the gate names five of the nine by id with both verdicts, because
  one injected kernel edge breaks every isolation claim downstream of it at once.

- **`checkExpectation` rather than `outcome === expect`, and the difference is one arm.** A
  hand-written comparison reads `expect: true` as an unmet expectation of the string `"true"`. The
  engine's function names it as V25 — a YAML 1.1 loader coerced a word into a boolean — which is a
  YAML problem wearing a semantics costume, and the negative control drives that arm specifically.

- **A model with zero queries is a FINDING.** That is gap 6's enforcement, and it is why the fix had
  to be a gate rather than a note: `workbench-affordances` carried 44 entities, 81 edges and nothing
  refutable, held to its generator by a byte-exact staleness gate and to nothing else. An empty
  numerator over an empty denominator reads as full coverage, which is the vacuous pass this project
  keeps finding in new costumes.

- **The exclusions carry EVIDENCE, like `gate-reachability`'s exemptions.** The three example systems
  keep their verdicts in `expected-results.yaml`, beside the coverage kind and evidence shape each
  query must produce — a richer pin than `expect` can hold. Each system file says so in its own prose,
  and that sentence is the exclusion's evidence, so dropping the fixture discipline fails this gate
  even though no path moved. The set derives from `SHIPPED_EXAMPLE_IDS`, so a fourth example is
  excluded by landing. `examples/docable.mage.yaml` is deliberately NOT excluded: it has no fixture
  file, so `expect` is the only holder its verdicts can have.

- **`EXEMPTION_CEILING = 0`, measured.** Every query in every subject model carries `expect`, so the
  honest ceiling is zero and raising it is a deliberate edit to a named constant — the discipline
  `PARITY_VIOLATION_CEILING` and `test/browser/agent-coverage.test.mjs` already hold. Nothing here
  was exempted to reach green.

- **What a green run does NOT prove, and why that sentence is shipped rather than commented.** It
  proves verdict-sensitivity of each model's own queries. It does not prove any model corresponds to
  the code: nothing derives the import graph from `src/`, and the audit showed by mutation that a
  real `import { checkPurposeVisibility } from "../ui/invariants.ts"` in `src/ir/types.ts` passes
  everything everywhere. That is audit gap 1 and a later wave. Because a reader meets this gate as
  three numbers in a CI log, the limit travels in the receipt beside the claim and a test asserts
  both are present — a disclaimer only a source comment carries is a disclaimer that does not reach
  the person reading the number.

#### Gap 5 — docable's five verdicts, re-derived rather than copied

The audit's table predicted refuted / refuted / holds / unlicensed / holds. Measured by running them:
`publish-requires-review` **refuted**, `processing-implies-custody` **refuted**,
`document-can-return-to-waiting` **holds**, `restricted-reaches-public` **holds**,
`transitive-ownership` **unlicensed**. Every one agrees with the audit and with the literals in
`test/engine-behavior.test.ts` and `test/engine-graph.test.ts`. **No third inverted polarity.** Those
literals stay: they pin evidence SHAPE — a lasso's cycle, a counterexample's final configuration, a
refusal's structured cause and `missing` list — which no `expect` can carry.

`publish-requires-review` is worth naming because it looks like an inversion and is not. The name
reads as the invariant and the statement asserts its negation, so the healthy verdict is `refuted` —
exactly the reconciliation work co-location forces on a reader, and the work that surfaced the two
real inversions in §9j.

- **And adding the fifth `expect` found a defect in `validate.py`.** `restricted-reaches-public`
  carries a `where` clause, which that tool declines for scope — it has no join evaluator — and the
  decline is reported through the same `outcome: unlicensed` channel a genuine V7 refusal uses.
  `check_queries` compared it against `expect` anyway and reported `expected holds, got unlicensed`,
  failing the pre-push model pass. So a correct expectation could not be written at all, on the one
  query where the engine is the only side that decides. The fix is one branch: `unsupported-form`
  means *I did not evaluate this*, and an unevaluated query is skipped rather than judged.
  `test/parity.test.ts` already encodes that rule — it excuses exactly the `unsupported-form` rows
  and requires each to carry the `where` clause explaining itself — so this makes the two agree.
  Every other refusal cause is still compared: `composition-forbidden` is a verdict `validate.py`
  decides, and `transitive-ownership` asserting `unlicensed` is held by it on both sides.

#### Gap 6 — the model that asserted nothing now carries 80 assertions

`generateAffordanceModel()` emits them with everything else, because an assertion someone could edit
without touching the registry is the second source of truth the generator exists to remove. One per
capability per interface (52), one per capability for the service it routes through (26), and two
controls — the three conjuncts of the question the model's `purpose` already declared, which it had
never answered.

- **`direct`, not the `predecessors` the audit suggested.** The suggestion is right for
  `gen-example-coverage.ts`, where each capability is its own query's target, so one witness answers
  one question. Here the shared node is the INTERFACE: twenty-six capabilities point at
  `human-interface`, so `predecessors` of `human-interface` is satisfied by any single surviving edge
  and would report full parity of a one-capability surface. `direct` names both endpoints, asks about
  one capability and one interface, and is single-hop — so `afforded-by`'s
  `composition.path: forbidden` does not refuse it.

- **Two controls, because fifty-two `holds` assertions share one failure mode.** A `holds` is carried
  by a witness, so an adjacency bug answering `holds` for any pair at all would satisfy every one of
  them and look like full parity. `control.interfaces-do-not-afford-each-other` asserts `refuted` over
  a pair the registry can never draw — the inverse of the components model's `ui-can-reach-kernel`
  positive control. `control.afforded-by-does-not-compose` asserts `unlicensed` over a multi-hop
  question, which makes the relation type's `composition.path: forbidden` and its `absence` prose
  into live claims rather than inert ones.

- **It does not move UX-I1's authority, and the `expect` values say what they mean.**
  `npm run check:parity` still reads the registry directly, still holds the count under
  `PARITY_VIOLATION_CEILING`, and still fails the publishing workflow. A capability with no wired
  affordance would emit `expect: refuted` for that interface, because that is then what the model
  says — the judgement that `refuted` is a VIOLATION belongs to `checkAffordanceParity`. Two
  different claims, both true at once. What the model adds is a second reading of the same fact
  through the IR, so a generator bug emitting a wrong edge is caught by the query that disagrees with
  it — which the registry-side gate cannot see, because it never reads the emitted file.
  `validate.py` evaluates all 80 independently and agrees with the engine on every one.

- **Registered by name in `test/gate-reachability.test.ts`.** `AGENT_SURFACE_GATES` became
  `PINNED_GATE_FILES` on its third entry: the list is the repo's coverage MEASURES, and two of the
  three were browser-tier agent gates only by accident of which wave landed first. The glob audit
  beside it cannot make this claim — a deleted file is matched by no pattern and reported by nothing —
  so each entry pins existence plus the script whose glob reaches it.

**Gates at this tree:** `tsc` clean; node **926/926** (921 + this file's 5), 0 skipped; `check:parity`
0 violations over 26 capabilities; build clean; smoke 3/3; browser 114/114; a11y **112/112** — the
load-sensitive `keyboard.test.mjs` debounce test passed here, so this wave saw the quiet-machine
outcome §9n describes rather than the flake. `validate.py` clean on all seven tracked models and
`--self-test` PASS.

**Left for the author.** This wave did not touch `models/workbench-components.mage.yaml`: gap 3's
re-founding and gap 4's header are held for a ruling. Its nine queries are now evaluated in CI, which
is gap 2 closed against the model as it stands — and the honest reading is that the gate holds the
model to ITSELF, so the drift between the model and today's imports that the audit enumerated is
untouched and still invisible to every gate. Gap 1 is the one that closes it.

### 9p. The components model re-founded on today's imports — as built

Gap 3 of `AUDIT-system-models-261004.md`. The model was drawn before six of today's thirteen `src/`
modules existed, so it declared an architecture the code had stopped having. §9o closed gap 2 and
said so plainly: the gate holds the model to itself. This wave makes the model describe the tree, and
lands the join gap 1's import-graph gate needs. It does not build that gate.

**Measurement first, then the model.** Every claim below came from reading the import specifiers of
all 87 files under `src/`, both value and `import type`, resolving each to the module it names, and
computing the strongly-connected components. The audit's line numbers were a starting point; each was
re-checked at this tree and all held.

#### What the measurement found that the audit had not

- **A second cycle.** The audit flagged `engine ↔ quant`. There is another: `app`, `ui` and `worker`
  form one strongly-connected component. Both back-edges are type-only and both are deliberate —
  `src/app/capabilities.ts` takes `NavSurface` from `src/ui/shell/surfaces.ts` so the registry gains
  no runtime dependency on the shell, and `src/worker/port.ts` takes `AnalysisPort` from
  `src/app/ports.ts` rather than restating a contract. `depends-on` counts a type reference, so
  neither can be argued away.
- **`persistence` named no code.** No `src/persistence/`, no IndexedDB, no localStorage — the
  condition `AUDIT-v0.1-261002.md:113` already recorded. Its two declared edges were both false.
- **`ui → analysis-worker` was declared and is now a two-hop path.** The shell's only worker import
  is `src/ui/main.ts → ../worker/port.ts`, which is the wiring, not the worker.

#### The decisions, and why each went the way it did

- **`analysis-worker → yaml-adapter` is architecture** (author's ruling, 261004), so the edge is
  declared and `engine-must-not-reach-yaml` is untouched. Verified rather than assumed:
  `query-engine`'s only out-edge is `→ model-ir`, the kernel has none, and `analysis-worker →
  query-engine` points upstream — the query measures `refuted` after the redraw, so the ruling cost
  the prohibition nothing. **What the undeclared edge violated was the `absence` clause, not the
  query.** The queries police the shape of the declared graph; `absence` is what makes the declared
  graph a claim about the code. Four real worker imports were missing from the model, which no query
  could catch, because queries read declarations. The model's header now says this in terms.
- **The worker's dangerous direction is pointed at, not duplicated.** `test/worker.test.ts:208-241`
  reads `analysis.worker.ts`'s own bytes, asserts no `../transaction/` and no `../ui/` specifier,
  slices `protocol.ts`'s reply union and asserts no arm carries a system, document or source text
  back, and drives a negative control through the same predicate. That is the control. The model
  cites it and asserts no competing version of it.
- **`quant` is CONTAINED by `query-engine`.** The measurement decides it: `src/quant/` has exactly
  one importer in the tree, `src/engine/`, and imports it back. A module whose only consumer is the
  module it consumes is the quantitative half of one component, not a component beside it. A peer
  entity would have required declaring a cycle against `acyclic: true`; deleting the entity would
  have lost the subject ref that routes `src/quant/` for the gate.
- **`shell-surfaces` and `worker-wiring` became entities.** Each is a declaration seam its own header
  already names: `surfaces.ts` imports nothing and is the one table of region identity, read by
  ten modules under `src/ui/` and by the registry for a type; `port.ts` is the single touch of the `Worker`
  constructor, which is what keeps every other file under `src/worker/` DOM-free and drivable from a
  node test. Stated candidly because it matters to how the call should be reviewed: the cycle is what
  sent anyone looking at those two files, and the entities survive on the independent ground that
  each is a seam with a documented reason. Splitting them is also the only decomposition that leaves
  the graph acyclic without collapsing the facade, the view and the host into one component.
- **`persistence` deleted.** An entity with no code and two false edges is the brochure class this
  project refuses. The design intent — portable file is the truth — survives as a paragraph in the
  model's header naming where export and import actually live and that reload persistence is an
  unsatisfied requirement.
- **`may_mutate` re-pointed at the transaction path.** The model used to name `yaml-adapter` as the
  sole IR mutator, which predated `TransactionEngine`. As built, `src/transaction/engine.ts` holds
  the authoritative revision pointer and is the only thing that swaps it, and `applyOperation` edits
  an unsealed `MageDocument` clone in place while `seal()` makes a committed revision throw. So two
  edges, both from `transaction-engine`: `→ model-ir` (decides which system is committed) and
  `→ yaml-adapter` (the system's only in-place mutation). The relation-type description grew the
  second arm, because "mutates the model" cannot mean an in-place edit of an immutable object.
- **`layer` is descriptive, and the model says so.** Seven values now. They do not form a total
  order and the model does not claim one — `app-services` reads a view module's type. The ordering
  claim is the narrow one the queries check: the kernel's out-degree is zero.

#### The edge set

| | before | after |
|---|---|---|
| entities | 9 | 16 (6 new modules + 2 declaration seams, − `persistence`) |
| `depends-on` edges | 12 | 46 |
| `may_mutate` edges | 1 (`yaml-adapter → model-ir`) | 2 (both from `transaction-engine`) |
| containment | none | `query-engine contains quant-evaluator` |
| queries | 9 | 13 |
| `src/` modules with no entity | 6 of 13 | 0 of 13 |

The 46 declared edges reconcile exactly with the 49 observed: the three not drawn are
`query-engine → quant-evaluator` and `quant-evaluator → query-engine`, internal to one component, and
`quant-evaluator → model-ir`, which lifts to the declared `qe-ir`.

#### The join gap 1 needs

Every entity carries `provenance.subject.ref` — docable's own pattern at
`examples/docable.mage.yaml:79-86`, which this model used nowhere. Two rules in the header make the
file→entity map total and unambiguous, and an import-graph gate should implement both:

- **Longest prefix wins**, so `src/app/agent-api.ts` resolves to `agent-adapter` rather than to
  `app-services`. A component is a unit of architecture; which directory holds it is filing.
- **A contained entity's edges lift to its container**, so an observed `src/quant → src/ir` is
  checked as `query-engine → model-ir` and `src/quant → src/engine` is checked against nothing.

The `dependencies` model carries one `correspondence: {kind: asserted, checked: "2026-10-04"}` record
rather than sixteen copies of the same sentence. It should become `derived` when the gate lands —
that is the point of the kind.

#### Which absences are still asserted claims

`depends-on`'s `absence` clause binds every pair not drawn, and the redraw did not weaken it; it made
the drawn set true, so the clause now forbids something real. The absences worth naming, each
verified at this tree:

- **`model-ir` depends on nothing.** `src/ir/` imports only itself. The spine, and the four
  `kernel-must-not-reach-*` queries are its assertion.
- **`query-engine` reaches only `model-ir`** (plus its contained half). No YAML, no DOM, no renderer.
- **`validator`, `renderer`, `rdf-projection`, `yaml-adapter` reach only `model-ir`.** Four separate
  one-edge components, each a real constraint on a file an agent will touch.
- **`ui` reaches no `yaml-adapter`, no `rdf-projection`, no `validator` directly.** The view holds no
  second parse path; the export control gets its text from the facade.
- **`analysis-worker` reaches no `app-services`, no `ui`, no `renderer`, no `transaction-engine`** —
  and the last of those is the one with a test behind it rather than only an absence.
- **`shell-surfaces` depends on nothing**, which is what lets the registry reference it without
  taking on the DOM.
- **Nothing depends on `learn-page`.** The old model said that of `ui`, and it was false: `learn-page
  → ui` is real (`src/learn/main.ts:23` value-imports `../ui/render-dom.ts`), and so is
  `app-services → shell-surfaces` (`src/app/capabilities.ts:33`). The corrected sentence is that only
  the Learn page depends on the shell, and only for its DOM binders.

#### Every `expect:` measured, not predicted

Thirteen queries, all met, in both implementations — `test/model-coverage.test.ts` through the engine
and `python3 validate.py models/workbench-components.mage.yaml` through the Python rule set. Kept
unchanged: the four `kernel-must-not-reach-*`, `engine-must-not-reach-yaml` (per the ruling),
`renderer-must-not-mutate-ir`, `agent-must-not-mutate-ir`, `ui-can-reach-kernel` (the positive
control), `transitive-mutation-is-unlicensed` (the refusal control). Added, with measured verdicts:

| query | expect | measured |
|---|---|---|
| `ui-must-not-import-yaml` | refuted | refuted |
| `ui-must-not-mutate-ir` | refuted | refuted |
| `yaml-must-not-mutate-ir` | refuted | refuted |
| `transaction-engine-is-the-mutator` | holds | holds |

`transaction-engine-is-the-mutator` closes a vacuity hole that predates this wave. Four prohibitions
are answered over the `may_mutate` graph and there was no positive control on it, so emptying the
relation would have passed all four. The model's own comment warns about exactly this for
`depends-on` and had no equivalent for mutation.

**The one query the gate caught, and what the catch was worth.** `ui-must-not-reach-yaml` was written
as a reachability claim and measured `holds`. The UI does reach the YAML adapter — through
`ui → transaction-engine → yaml-adapter`, which is the sanctioned route, because every edit is a
document edit. The architectural fact meant was narrower and it is a direct-edge claim: the view does
not import the adapter itself. The query is now `ui-must-not-import-yaml` with `form: direct`, and the
comment records the reachability verdict so the next reader does not re-ask. This is the gate working
on a query thirty minutes old.

**Where the temptation was, and what was done instead.** Once, and not on a pre-existing prohibition:
the `ui`-to-YAML query above was authored in this wave, measured false, and corrected to state the
fact that is true rather than kept at a strength the code does not support. No inherited query was
weakened — `engine-must-not-reach-yaml` kept its text, its endpoints and its polarity under a ruling
that could have been read as licence to re-point it, and the measurement confirmed it did not need
re-pointing. Both cycles were resolved by naming components more precisely, never by relaxing
`acyclic: true`.

#### Proposed and NOT landed — the author's call

The orchestrator floated a sharper statement of what the analysis path must not reach: not the YAML
adapter specifically, which the worker legitimately reads, but any *mutator*. Written and measured,
deliberately not added to the model:

```yaml
no-mutator-reachable-from-analysis:
  name: The analysis worker reaches the component that may mutate the model
  kind: graph
  quantifier: exists
  expect: refuted
  graph: { form: reachability, relation: depends-on, from: analysis-worker, to: transaction-engine }
```

**Measured: `refuted`** — it would land green. One nuance the measurement surfaced and a ratifying
author should see: the same question asked from `worker-wiring` measures **`holds`**, because the
page-side spawn file returns the facade's port type and the facade reaches the transaction engine. So
the claim is about the analysis thread, not about `src/worker/`, and the scope has to say
`analysis-worker` to be true. Adding it unilaterally would enshrine an unratified invariant, which is
why it is here rather than in the model.

#### Two header corrections

- **"This is model (1) of the eight" is deleted** (author's ruling, 261004). The phrase had no
  referent in any tracked file or any reachable commit, and the founding commit carried it unbacked
  too. Not replaced with "three": the three the author named are model TYPES (`MODEL_TYPES` at
  `src/engine/model-types.ts:338`), while this file is one of the SELF-models — different axes, and
  the coincidence of count is not a fact to enshrine. The header points at `PLAN.md` §0.2a, which
  enumerates the self-model set and will stay true as that set changes.
- **"never from CI" is now false and was corrected.** §9o landed `test/model-coverage.test.ts`, so
  the header names both evaluations — the node-tier gate CI runs, and `validate.py` plus `--self-test`
  from the pre-push hook — and then says the thing that still matters: neither establishes
  correspondence with `src/`.

**Gates at this tree:** `tsc` clean; node **926/926**, 0 skipped; `check:parity` 0 violations over 26
capabilities; build clean; smoke 3/3; browser 114/114; a11y 112/112. `python3 validate.py
models/workbench-components.mage.yaml` clean, 13 asserted queries evaluated; `--self-test` PASS,
including the injected `model-ir → ui` edge still being caught against the redrawn graph.

**Left for the author.** Gap 4's other two instances were not touched, and one of them is now
measurably false: `src/ir/types.ts:4-9` says "only from the pre-push hook. No CI step runs that
check", which §9o made wrong, and `src/engine/types.ts:4-8` says the same of
`engine-must-not-reach-yaml`. The audit scheduled those headers for after gaps 1–2 and gap 1 has not
landed, so they are reported rather than edited — one file, one owner. Gap 1 itself is now unblocked:
the model matches the tree, and the refs give a scanner somewhere to join to.

### 9q. The import graph derived from `src/` — as built

Audit gap 1, and the one the audit ranked first. `test/import-graph.test.ts` parses every module
specifier under `src/`, resolves each to the entity that owns its path, and compares the result
against the components model's declared `depends-on` edges. §9p landed the join; this landed the
reader.

**The first run agreed with the hand-check, exactly.** 46 observed edges over 454 module specifiers
across 87 files; 46 declared; zero undeclared imports, zero declared edges nothing creates, kernel
out-degree 0. The model's `correspondence` note said the edge set had been "read by hand from today's
import graph, both value and type imports" — that claim is now measured, and it was true. Nothing on
either side needed changing to get there, which is worth recording because the brief anticipated the
opposite and asked which of the two would turn out wrong.

#### The gate is red when the defect is present, proven three ways

The audit's mutation is reproduced as a control against an in-memory copy of the tree: the real
model, the real other 86 files, and `src/ir/types.ts` with
`import { checkPurposeVisibility } from "../ui/invariants.ts"` prepended. It reports two findings —
the undeclared `model-ir → ui` edge, and the kernel's out-degree separately — each citing
`src/ir/types.ts:1`. The same mutation written as `import type` and as `export … from` is driven too,
because those are the two spellings a value-only or line-anchored scan walks past.

Once, on disk, to prove the wiring from the filesystem rather than only the audit function: three of
the nine tests went red, and `tsc` reported nothing but TS6133 for the unused binding — make the
import *used* and the typecheck is clean again, which is the audit's finding reproduced in one
command. The file was restored from a copy, and the shipped control does not touch disk.

And the inverse sabotage, which the audit did not ask for: deleting the `learn-ui` declaration from
the model surfaces `learn-page → ui` as an undeclared import, naming `src/learn/main.ts`. A gate that
only reads the code cannot tell a removed declaration from a new import; this one reports the pair.

#### Both directions are failures, and the second one took an argument

`observed ⊆ declared` is the prohibition and needed no defending. The reverse — a declared edge no
import creates — reads at first like a report, since nothing in the code is wrong. It is asserted
anyway, on three grounds, and the finding carries them:

- **Reachability is monotone in edges.** The four kernel queries and `ui-can-reach-kernel` are
  answered over the declared graph, so a stale edge can carry the positive control along a path the
  code no longer has. That is the vacuous pass this project keeps meeting in new costumes, and §9o's
  gate would not see it.
- **A stale edge widens the permitted set silently**, so the next import of that shape lands with
  nothing to say — gap 1 again, one edge at a time.
- **The model claims equality, not containment.** Its `correspondence` record says so. A gate weaker
  than the claim leaves the claim unchecked.

The practical half settled it: both sets are 46 and identical, so asserting equality lands green and
the repo's drain-then-promote rule has nothing to drain.

#### What the measurement found that the brief had not

- **The kernel is DERIVED, not named.** Writing `model-ir` in the test would have made the spine a
  second copy, and then editing the model's spine away would leave the gate asserting a fact the
  model had dropped. The derivation is the model's own sentence read as a predicate: an uncontained
  entity at `layer: kernel` with no declared out-edge. Exactly one satisfies it, and a separate
  assertion requires that the derived entity be the subject of at least three refuted reachability
  queries — the prohibitions are what make it the kernel.
- **That derivation catches a mutation the subset check cannot.** Edit the model AND the code
  together — add `model-ir → ui` to both — and `observed ⊆ declared` is satisfied. The spine is held
  against the OBSERVED graph independently, so the both-sides edit reports "no uncontained entity at
  `layer: kernel` has zero declared out-edges." A control drives exactly that.
- **`provenance.subject.ref` is not in the canonical IR.** The loader's `Provenance` carries
  `created_by`, `prompt` and `history`; `subject` and `correspondence` are dropped. So a ref with a
  typo validates clean, and the gate parses the YAML itself rather than reading the facade. Two
  checks close the hole that opens: every scanned file must have an owner, and every entity's ref
  must own at least one real file. A third asserts the YAML read and the canonicalized relation list
  describe the same edge set, so the gate cannot end up policing a graph the queries are not
  answered over.
- **Three imports leave the scan root, and they are data.** `src/ui/main.ts` loads
  `mage-{model,query,transaction}.schema.json` from the package root. No entity owns them, correctly:
  a schema document is an input the `types` script generates from, not a component. Each is declared
  with the evidence that `package.json` names it in a `json2ts -i` flag, and an unused allowance is
  itself a finding — without that, the map is where a real undeclared edge would go to be forgotten.
- **A scanner's coverage claim is its whole worth, so the claim is tested row by row.** Sixteen
  fixtures, one per covered syntax: `import`, `import type`, inline `{ type X }`, bare
  `import "./x"`, import attributes, multiline specifiers, `export … from`, `export type … from`,
  `export *`, `export * as`, dynamic `import()`, `import x = require()`, `require()`, and a
  `/// <reference path>` directive. The tree uses six of these; the other ten are covered so a later
  file cannot hide an edge in a spelling nobody anticipated. Two forms are NOT resolvable and are
  REPORTED rather than skipped — a dynamic specifier that is not a string literal, and a relative
  specifier with no extension. A silent skip is what makes a coverage list false by omission.
- **The parse is TypeScript's own**, from the existing devDependency. No new package.

#### Two headers corrected, and one claim promoted

§9p left `src/ir/types.ts:4-9` and `src/engine/types.ts:4-8` for after gap 1 — the first said "no gate
yet derives this file's real import graph," which was the sentence this wave exists to falsify. Both
now name the three gates and say which reads declarations and which reads imports.

The model's `correspondence.kind` moved from `asserted` to `checked`. The schema reserves the
stronger kinds for "where later tooling earns trust rather than claiming it"
(`mage-model.schema.json:550`), and the tooling now exists. Not `derived` — the edges are written by
hand and the gate refutes them; nothing generates them.

#### The unmigrated call site

`test/examples.test.ts` hand-rolled `res.outcome !== expect` while the engine exposes
`checkExpectation` and `test/model-coverage.test.ts` already used it. Migrated, and not for tidiness:
the raw comparison coerced a non-string `expect` to `null` and then reported *"must carry an
expect"* — false, since it carries one of the wrong type — and reported an invalid outcome word as a
plain mismatch rather than as a word that is not an outcome. The generator's own claim survives
beside it, re-keyed on the field being PRESENT rather than on it being a string: that a generated
coverage query must carry an expectation is a statement about the generator, and reporting a coerced
boolean as a missing field would send a reader to the generator instead of to V25.

**Gates at this tree:** `tsc` clean; node **935/935** (926 + 9), 0 skipped; `check:parity` 0
violations over 26 capabilities; build clean; smoke 3/3; browser 114/114; a11y 112/112.
`python3 validate.py models/workbench-components.mage.yaml` clean, 13 asserted queries evaluated;
`--self-test` PASS; model-coverage census still `workbench-components 13/13`.

**Left for the author.** The components model is the only tracked model with a code join. The other
three have none: `workbench-affordances` is held to its generator and, transitively, to the registry
through `check:parity`; `example-coverage` is generated from the examples it measures; docable's
subject refs name a tree this repo does not ship. Whether any of those wants a join is a scope
question, not an oversight, and `NOT_PROVEN` in `test/model-coverage.test.ts` now says so in the
receipt rather than implying the gap is universal.
