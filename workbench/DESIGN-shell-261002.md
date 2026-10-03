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

#### 9c.1 — what wave 2a cost the D-2 focus-order pin, measured by the wave that owns it

Recorded here because the number is a LAND-ORDER fact, and both branches declined to write it into
their own gate for the same reason: a pin that is green only in a combined state neither branch is
in would be red for whichever lands first.

Wave 2a added seven focusable controls (`#palette-open`, `#add-menu-summary`, and five `+ Add`
items that render only while the disclosure is open; the inspector's seven are `disabled` without a
selection, and both `<dialog>`s are closed). Measured by `wb-focusorder-261003`, which owns
`test/browser/a11y/wcag-f6.test.mjs`, on its own fix merged with wave 2a on a scratch branch:

| widths | its fix alone | its fix + wave 2a |
|---|---|---|
| within-region inversions | `{320: 0, 368: 0, 672: 30, 976: 77, 1024: 75, 1025: 75}` | `{320: 0, 368: 0, 672: 30, 976: 76, 1024: 74, 1025: 75}` |

**Wave 2a's whole cost is −1 at 976 and −1 at 1024.** `#palette-open` is not implicated at all — the
header is one row at every measured width. **Whoever lands second re-measures and takes
`{320: 0, 368: 0, 672: 30, 976: 76, 1024: 74, 1025: 75}`; the diff is two entries.**

Two things about the pin changed under wave 2a, so a future reader must re-measure rather than
reconcile against the shape this wave saw:

- `EXPECTED_INVERSIONS` counts **within-region** inversions now, not the total. A three-column shell
  tabs one whole region before the next while an eye scanning rows crosses all three, so the
  cross-region total moves whenever anybody adds a control to any column — it measured the layout's
  column count, not an ordering defect. Wave 2a's raw total at 1025 was 256 against a 228 fork
  total, which is why it looked alarming; within-region held at 75.
- `focusOrderAt` corrects for scrollable ancestors. `#nav` is `max-height: 80vh; overflow-y: auto`,
  so focusing a rail link scrolled the RAIL and the walk read a straight column of links as a
  zig-zag.

And the defect that walk was really reporting, fixed on that branch and not by wave 2a: `#edit` and
`#system-browser` both declared `grid-area: extra` against one `"extra extra extra"` row
(`index.html:147,157`), under a comment claiming they would "stack inside their own area". Two grid
items in one named area share the cell, so the Edit fieldsets painted straight through the System
Browser's tables in every loaded state at every width. Worth recording beside correction 4 because
it is the same lesson one layer down: a comment asserting a layout behaviour is not a layout
behaviour, and the thing that caught it was a walk that measured geometry rather than read the CSS.
