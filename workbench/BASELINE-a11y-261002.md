# Keyboard-accessibility baseline — the flat page, 261002

The redesign in `requirements-progressive-disclosure-261002.md` replaces this page with a
three-pane shell, and argues that "a semantic model tree can provide equivalent keyboard/AT
access while sighted users get progressive disclosure." *Equivalent* compares two things. This
record is the one being compared against. Once the flat page is gone it cannot be re-derived.

Measurement, not a build. Nothing under `src/` changed. Every number below comes from a probe that
ran; where a probe could not settle something, the row says **UNMEASURED** and why. Nothing was
inferred from markup that looked focusable.

Re-run it with `node scripts/measure-a11y-baseline.mjs` (§7).

---

## Verdict

The flat page is keyboard-complete and AT-named. Of the 23 human control affordances the
capability registry declares, **23 are reachable by Tab, 21 are operable by keyboard, and 23 carry
a computed accessible name**. The two gaps in the operable column are instrument limits, not page
defects: no automation protocol can drive a native file picker, and accepting a hypothesis was
deliberately not activated because it mutates the authoritative model mid-sweep.

Three findings sit against that.

**The live region is silent on an agent mutation that moves no property verdict.**
`window.mage.load()` loaded an entire three-model system and `window.mage.transact()` added an
entity; the human surface updated both times, and `#live` received **zero writes** — its text was
still the boot message afterwards [measured]. The same page, driven by a human control, announced
immediately. UX-I3 passes and FR-A11Y-3 fails on the same event (§5, §6 F-1).

**The toolbar is enabled before it can do anything.** On a fresh page, with no model loaded,
**Export** and **Run all questions** are both in the tab order and both enabled, while Undo and
Redo are correctly disabled [measured] (§3, F-2).

**The registry's `wired` is an author's assertion, not a check.** `capabilities.ts` names each
affordance as a logical site string; nothing in the codebase binds those strings to the DOM, and
`checkRegistryClosure` — the function written to catch exactly that drift — is only ever called
with literals in a unit test (`test/capabilities.test.ts:232`) [measured] (§6, F-1).

---

## 1. Method and environment

| | |
|---|---|
| Page | `workbench/index.html` at commit `98be316a`, built by `node build.mjs` |
| Served | `python3`-free static server inside the script, `127.0.0.1:8152` |
| Browser | Chromium 153, bundled with the Puppeteer under `book/node_modules` (resolved, never installed) |
| Node | v24.21.0 |
| Example | `examples/message-bus/system.mage.yaml` — 3 models, 11 entities, 18 relations, 6 saved questions |
| Script | `scripts/measure-a11y-baseline.mjs` |
| Raw output | `/tmp/wb-a11y-baseline-v3.json` (gitignored; regenerate with the script) |

Three things the instrument does and does not do, because they bound what the numbers mean.

- **Pressed keys only.** No `element.click()`, no `element.focus()`. Programmatic focus skips the
  tab sequence, so a control that is focus*able* but not tabbable would pass. Reachability is
  measured by pressing Tab until the control has focus, or failing.
- **`<select>` is driven by type-ahead**, the way a keyboard user picks an option — not by
  assigning `.value`. A list whose options share a prefix fails loudly, because a keyboard user
  has the same problem.
- **Names and roles come from Chrome's own accessibility tree** (`page.accessibility.snapshot`),
  not from the markup. A `<label>` that does not reach AT reads as an empty name here.

### Three instrument defects, found and fixed mid-measurement

Stated because they each produced a wrong number first, and a later re-measurement will hit them.

1. **`blur()` does not rewind the tab order.** Chromium keeps a sequential-focus navigation
   starting point, so a walk after a blur resumes mid-document and wraps. The first run reported
   the loaded tab order as 55 stops beginning inside the Edit section. `rewindToTop` now
   Shift-Tabs out of the document first; the real walk is 62 stops beginning at the skip link.
2. **A radio group has one tab stop.** Tab alone can never reach an unchecked radio, so the first
   run recorded `edit-section.hypothesis-target` as keyboard-unreachable. That is the native
   contract, not a defect. Reachability for a radio now means: the group has a tab stop, and
   ArrowDown moves from it to this member.
3. **`.evidence` is an `<ol>`, not a `<ul>`.** The first run asked for `ul.evidence`, got nothing,
   and recorded the evidence list as not AT-readable — a wrong selector reported as a page defect.

---

## 2. The capability sweep

`src/app/capabilities.ts` declares 25 capabilities and 29 human affordance sites. The table is by
SITE, because a capability with two human affordances (`import`, `query`, `analyze`,
`create-element`, `edit-property`) is reachable through either, and a per-capability row would
hide which half was measured.

**Tab position** is the control's index in the authoritative tab walk of that state (§3), not a
press count. `—` means the control is not in that state's walk.

Measured with the flagship example loaded by keyboard, after the edit wave.

| # | Capability | Human affordance (registry site) | DOM | Reach | Tab pos | Operable | Computed name | Role |
|---|---|---|---|---|---|---|---|---|
| 1 | `import` | `header.file-input` | `#file` | **y** | 2 | UNMEASURED | `Open a .mage.yaml` | `button` |
| 2 | `import` | `header.new-system` | `#new-system` | **y** | 3 | **y** | `Create new model system` | `button` |
| 3 | `load-example` | `start.load-example` | `#example-load` | **y** | 7 | **y** | `Load this example` | `button` |
| 4 | `export` | `header.export` | `#export` | **y** | 4 | **y** | `Export` | `button` |
| 5 | `inspect` | `model-section.tables` | `#sections` | readout | — | readout | *(none)* | `generic` |
| 6 | `validate` | `validation-section.table` | `#finding-list` | readout | — | readout | *(none)* | `generic` |
| 7 | `query` | `header.run-all` | `#run` | **y** | 5 | **y** | `Run all questions` | `button` |
| 8 | `query` | `properties-section.ask` | `#ask-go` | **y** | 55 | **y** | `Ask` | `button` |
| 9 | `analyze` | `properties-section.list` | `#question-list` | readout | — | readout | *(none)* | `generic` |
| 10 | `inspect-evidence` | `properties-section.evidence-list` | `#question-list .evidence` | readout | — | readout | *(none)* | `generic` |
| 11 | `explore-space` | `analysis-section.explore` | **none** | **n** | — | **n** | — | — |
| 12 | `undo` | `header.undo` | `#undo` | **y** | 6 | **y** | `Undo` | `button` |
| 13 | `redo` | `header.redo` | `#redo` | **y** | — | **y** | `Redo` | `button` |
| 14 | `create-element` | `edit-section.add-entity` | `#add-entity-go` | **y** | 14 | **y** | `Add the entity` | `button` |
| 15 | `create-element` | `edit-section.add-state` | `#add-state-go` | **y** | 17 | **y** | `Add the state` | `button` |
| 16 | `delete-element` | `edit-section.delete-element` | `#delete-element-go` | **y** | 20 | **y** | `Delete the element` | `button` |
| 17 | `create-relation` | `edit-section.add-relation` | `#add-relation-go` | **y** | 25 | **y** | `Add the relation` | `button` |
| 18 | `delete-relation` | `edit-section.delete-relation` | `#delete-relation-go` | **y** | 27 | **y** | `Remove the relation` | `button` |
| 19 | `edit-property` | `edit-section.set-label` | `#set-label-go` | **y** | 30 | **y** | `Change the label` | `button` |
| 20 | `edit-property` | `edit-section.set-property` | `#set-property-go` | **y** | 37 | **y** | `Set the property` | `button` |
| 21 | `create-model` | `edit-section.add-model` | `#add-model-go` | **y** | 42 | **y** | `Add the model` | `button` |
| 22 | `delete-model` | `edit-section.delete-model` | `#delete-model-go` | **y** | 44 | **y** | `Remove the model` | `button` |
| 23 | `add-note` | `edit-section.add-note` | `#add-note-go` | **y** | 48 | **y** | `Attach the note` | `button` |
| 24 | `save-property` | `properties-section.save` | `#save-property-go` | **y** | 59 | **y** | `Save as property` | `button` |
| 25 | `retract-property` | `properties-section.retract` | `#retract-property-go` | **y** | 61 | **y** | `Retract the property` | `button` |
| 26 | `inspect-provenance` | `provenance-section.records` | `#provenance-list` | readout | — | readout | *(none)* | `generic` |
| 27 | `create-hypothesis` | `edit-section.hypothesis-target` | `#target-hypothesis` | **y** † | 8 ‡ | **y** | `a hypothesis, left for review before it becomes authoritative` | `radio` |
| 28 | `commit-hypothesis` | `hypothesis-bar.accept` | `#hypothesis-apply` | **y** § | 7 | UNMEASURED | `Accept this hypothesis as authoritative` | `button` |
| 29 | `discard-hypothesis` | `hypothesis-bar.discard` | `#hypothesis-discard` | **y** § | 8 | **y** | `Discard this hypothesis` | `button` |

† Reached by Tab to the group's checked member `#target-main`, then ArrowDown — the native radio
contract. Tab alone does not reach it, and should not.
‡ Position 8 is `#target-main`, the group's single tab stop.
§ Measured with a hypothesis open. The bar is `hidden` otherwise, and a hidden control has **no
node in the accessibility tree at all** — name and role both come back `null`, which is correct.

### Row 13 — Redo's missing tab position

Redo is **reachable and operable** [measured: Enter on it moved the system hash
`36ff1b7f…` → `05da90fa…`, the summary, and the property list]. Its position reads `—` because the
tab walk used for positions was captured when Redo was still disabled — nothing had been undone
yet. Enabling it requires an undo first, which the sweep performs. Not a page defect; a sequencing
artefact of one walk, recorded rather than smoothed.

### Readouts are not controls

Five affordance sites are read surfaces: a table or a list a person reads, with nothing to
activate. Calling them keyboard-unreachable would be a category error. They are measured as
present, non-empty, outside any `aria-hidden` subtree, and carrying real structure.

| Site | Text | Tables | `<th>` | Headings | Lists | In `aria-hidden`? | AT-readable |
|---|---|---|---|---|---|---|---|
| `model-section.tables` | 13,917 chars | 3 | 12 | 3 | 11 | no | **y** |
| `properties-section.list` | 3,894 chars | 0 | 0 | 6 | 10 | no | **y** |
| `properties-section.evidence-list` | 4 `<ol>`, 1 step each | 0 | 0 | — | — | no | **y** |
| `provenance-section.records` | 836 chars | 0 | 0 | 3 | 3 | no | **y** |
| `validation-section.table` | 23 chars | 0 | 0 | 0 | 0 | no | **y**, empty state |

The evidence list reads, verbatim:
`witness: checkout → order-created → billing → payment-completed → fulfillment` [measured]. Four
of the six saved questions carry one.

`validation-section.table` rendered `<p class="intro">No validation findings.</p>` — the example
is clean, so the TABLE form of this readout is **UNMEASURED**. Re-measuring it needs a model that
fails a rule.

All four readout hosts are plain `<div>`s: computed role `generic`, computed name empty. Their AT
identity comes from the enclosing `<section aria-labelledby>`, not from themselves. That is a
defensible structure and a fragile one — a redesign that moves a readout out of its labelled
section strips its only name (§6, F-5).

### The three aggregate numbers

Counting the 23 control affordances (rows 1–4, 7–8, 12–25, 27–29; excluding the five readouts and
the one declared-absent site):

| | Count | of 23 |
|---|---|---|
| **Reachable** by Tab (or by the native arrow contract, for the radio) | **23** | 100% |
| **Operable** by keyboard, with an observed state change | **21** | 91% |
| **Named** — non-empty computed accessible name | **23** | 100% |

The two not operable are both **UNMEASURED, not failing**:

- `header.file-input` — no automation protocol drives a native file picker from the keyboard. The
  control is reachable at position 2 and names itself `Open a .mage.yaml`. The existing suite
  covers the rest of this path by supplying bytes through `uploadFile`
  (`test/browser/a11y/keyboard.mjs:20`).
- `hypothesis-bar.accept` — reachable at position 7 with a full name, deliberately not activated:
  accepting a hypothesis rewrites the authoritative model, and the sweep had 20 more sites to
  measure against it. Its sibling `hypothesis-bar.discard` WAS activated and worked.

Every one of the 21 operable rows was confirmed by an observed change, not by a key the page
accepted. Eleven moved the system hash or the summary; ten produced a named refusal in
`#edit-result` and `#live` — `A model needs an id. Ids are immutable, so choose it deliberately.`
A refusal proves the handler ran as surely as a commit does, and the refusals here name what is
missing rather than failing vaguely.

Across all 67 focusable controls on the loaded page, **every one that is in the accessibility tree
carries a computed name** [measured]. The only two without are `#hypothesis-apply` and
`#hypothesis-discard` while the bar is hidden, which is the correct absence. The skip link, which
has no `id`, computes as `Skip to the model` / `link`.

---

## 3. Focus order, DOM order, visual order

DOM order and focus order **agree exactly, in all three page states** [measured]. The walk is the
document order of the markup, filtered by what is enabled.

| State | Tab stops | Walk |
|---|---|---|
| Pristine, no model | **8** | skip link, `#file`, `#new-system`, `#export`, `#run`, `#example-choice`, `#example-load`, `#diagram-subject` |
| Example loaded | **62** | the same seven, then `#target-main` … `#retract-property-go`, then `#diagram-subject` |
| Hypothesis open | **65** | adds `#undo`, `#hypothesis-apply`, `#hypothesis-discard` after `#run` |

Shift+Tab walks back (verified from `#example-load` to `#example-choice`), so focus is not
one-way.

### The divergences, named

**D-1 — Visual order puts the canvas last; focus order has no canvas.** The `<figure id="canvas">`
carries `aria-hidden="true"` and contains **zero focusable descendants** [measured]. A sighted
mouse user's last visual element is absent from the keyboard path entirely. This is the design, and
it is stated as such in `index.html:579`. Reported as a divergence because the redesign's claim of
"equivalent" access has to account for it: the canvas is not an accessible surface that got worse,
it was never one.

**D-2 — Visual order is two-dimensional; focus order is one-dimensional.** The Edit section is a
CSS grid (`.forms { grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr)) }`), so on a wide
viewport the eleven forms lay out in several columns, read left-to-right. Tab visits them in DOM
order, which is top-to-bottom of the source. At a viewport of three columns the visual order of
forms 1-2-3 is a row and the focus order is a column. **UNMEASURED** at a specific viewport — the
measurement ran headless at the default size, and settling it needs geometry per breakpoint.

**D-3 — Disabled controls leave the sequence, which moves every later position.** `#undo` sits at
position 6 once a revision exists and is absent before. A later re-measurement that pins absolute
positions will see them shift for this reason and not because anything regressed. Pin the ORDER,
not the indices.

**D-4 — `#diagram-subject` is reachable while the whole Edit section is not.** On the pristine
page Tab reaches the diagram's subject menu at position 8, having skipped every control between
it and `#example-load` — those live inside `fieldset[disabled]`. So the pristine walk jumps from
the start of the document to its end, with nothing in between. Correct in mechanism (nothing in
the middle can do anything yet), and worth stating: the keyboard user's model of the page's size
changes by a factor of eight the moment a model loads.

No place was found where DOM order and focus order disagree.

---

## 4. The AT-representation seam — real, verified by driving it

**The seam: `src/render/svg.ts:373`, `renderView`.** It returns `RenderedView`, which holds the
SVG and its `accessible` twin together; there is no export that yields one without the other
(`src/render/index.ts:4`). The accessible half is built by `buildAccessibleScene` in
`src/render/accessible.ts`.

**It is bound to the real renderer at both composition roots.**

- The page: `src/ui/main.ts:162` — `render: { render: (system, request) => renderView(system, request) }`.
- The test fixture `realPorts`: `scripts/gen-example-coverage.ts:447`, with the render port at
  **line 457**, and a comment recording that a stub there previously broke the build when the
  accessible view gained fields.

**Driven, not read.** Choosing a diagram subject by keyboard type-ahead (prefix `Model: D` →
`model:data-policy`) produced **1,522 characters** in `#diagram-text`, one ordered list, **11
list items** — one per node — outside any `aria-hidden` subtree [measured]. It opens:

> graph model "Data Policy": 11 nodes, 6 relations. Question: What data does each event type carry,
> and what sensitivity may each service process? Deliberately omits: observed runtime delivery,
> which service wrote a given field, encryption in transit, field-level redaction and masking, data
> retention periods. System: `fnv1a64:05da90fa4f2f845e`. **Reading order** Entity "Analytics" of
> type service; permits is internal. Entity "Billing" of type service; permits is restricted.
> Entity "OrderCreated" of type event-type; carries is restricted; leads to "customer-id" via
> carries_field…

That is the model's purpose, its omissions, the system hash, a reading order, per-node types and
properties, and the relations each node leads to. A stand-in would have produced an empty element
or a node count. **The seam is real.**

One qualification. `realPorts` still stubs a *different* port on the same object:
`engine.explore: () => ({ configurations: [], exhaustive: false })`
(`scripts/gen-example-coverage.ts:451`). That is deliberate and declared — `explore-space` is the
one capability the registry admits has no human affordance — but it sits three lines above the
comment asserting the renderer is real, and a future reader skimming for stubs will find it.

---

## 5. Live-region and dynamic-update behaviour

The page has **exactly one** live region [measured]:

```html
<p id="live" role="status" aria-live="polite" class="sr-only"></p>
```

`index.html:222`. `role="status"` plus `aria-live="polite"`, visually hidden, `tabIndex -1` so an
announcement cannot steal the caret. No `aria-atomic`, no `aria-relevant`. Politeness is right for
the content: analysis completing is worth knowing, not worth interrupting a sentence for.

**The announcements say something.** Measured texts, verbatim:

- `Loaded Message Bus: 3 model(s), 0 validation finding(s). This is an ordinary editable workspace.`
- `Re-evaluated 6 properties against the current revision.`
- `add-note applied. 0 validation finding(s). The model's revision is unchanged: a note is context, not a constraint.`
- `Edit rejected. this model asserts checkout -calls-> checkout. Delete that relation explicitly, in this transaction if you like — a claim must not disappear as a side effect.`
- `Hypothesis "baseline probe" discarded. The authoritative model was never touched.`

Each names the operation and its consequence. Not a re-read number. The note announcement states
the one thing a screen-reader user could not otherwise tell — that the revision did not advance.

**And then the finding.** On a fresh page where `#live` held only the boot message:

| Event | Human surface | `#live` writes | `#live` text after |
|---|---|---|---|
| `window.mage.load(yaml)` — a whole 3-model system | summary → `3 models, 11 entities…` | — | `MAGE Model Workbench ready. Agent API 0.1.0 at window.mage.` |
| `window.mage.transact(add-entity)` — `ok: true` | summary → `12 entities` | **0** | `MAGE Model Workbench ready. Agent API 0.1.0 at window.mage.` |
| Enter on `#run` — same page, same observer | property list repainted | **1** | `Re-evaluated 6 properties against the current revision.` |

**An agent mutation is visually obvious and silent to a screen reader.** The cause is narrower
than "no announcer runs on the agent path," and the narrow version is the useful one.

`repaint()` has exactly one announcement call: `announceProperties(propertyNews(vm.properties))`
at `src/ui/main.ts:242`. The comment above it (`main.ts:105-107`) states its purpose outright —
"Property news is also what makes an AGENT's edit perceivable. `window.mage.transact` repaints
without going through any human handler, so before this there was no announcement at all for a
change the human is supposed to be watching." So the gap was seen and a channel was built.

The channel is **conditioned on a property verdict moving**. `propertyNews`
(`main.ts:209-224`) returns a sentence only when a property's status word CHANGED since the last
paint, or a property was DROPPED; otherwise it returns `""` and `announceProperties` is not
called. An agent edit that changes the model without flipping any verdict — add an entity, add a
relation, attach a note, add a model — passes through `repaint()` and announces nothing. That is
what the probe caught: `add-entity` on the message-bus example, `ok: true`, no verdict moved,
zero writes.

The remaining 20 `announce(…)` sites in `main.ts` are all inside human event handlers. So for
every model change that does not move a verdict, the live region is driven by *which control was
pressed* rather than by *what changed*, and the agent path presses nothing.

Whether a verdict-CHANGING agent edit announces is **UNMEASURED** — the code path says it should,
and the mechanism was observed firing during the sweep (the trailing
`1 property(ies) are no longer asserted.` in several measured texts is `propertyNews` output). A
re-measurement should construct an agent transaction that flips a verdict and confirm it.

The measurement instrument has one property that bounds this claim, and it does not weaken it.
Chromium emits no mutation record for assigning `textContent` a string identical to the one
already there, so a storm of identical announcements would be invisible here — and equally
invisible to a screen reader reading the same DOM. The probe above was run on a page whose `#live`
held only the boot text, so any agent announcement, identical to nothing, would have shown.

---

## 6. FINDINGS

Defects in the shipped page, in order of what they cost a user. Not redesign fodder.

### F-1 — An agent edit that moves no property verdict announces nothing. FR-A11Y-3 fails.

`src/ui/main.ts:242` announces from `repaint()`, and `main.ts:209-224` gates that announcement on
a property verdict changing or a property being dropped. Every other model change on the agent
path is silent.

Measured: `window.mage.load()` loaded a three-model system and `window.mage.transact()` added an
entity; both repainted the human surface and wrote **zero** times to `#live` (§5).

A screen-reader user working alongside a CDP-attached agent — the scenario the workbench exists
for — gets no signal that the model under them changed, unless the change happens to flip a
verdict. FR-A11Y-3 requires that "agent actions, analysis completion, validation failures,
hypothesis creation, query results, and other consequential asynchronous state changes SHALL be
represented in a manner perceivable by assistive technologies." An agent action is first on that
list. Four of the thirteen human operations have an agent twin that produces no announcement.

**The code comment overstates what was built.** `main.ts:105-107` says property news is "what
makes an AGENT's edit perceivable… before this there was no announcement at all for a change the
human is supposed to be watching." Read in place, that closes the gap. It closes one slice of it.
A reader auditing FR-A11Y-3 against this comment would mark it satisfied.

**It also sits against a claim in the requirements prose.**
`requirements-a11y-261002.md:32` argues the accessibility work and the agent work share
engineering — "A named button helps screen-reader users and browser agents… stable focus
behavior… likewise improve both." That holds for naming, and the paragraph reads as though the
reverse holds too. It does not. The agent interface is wired to the model and the announcer is
mostly wired to the buttons, so the one surface where the two requirements must meet is the
thinnest thing in the file.

The fix extends the existing seam rather than adding a second one: have `repaint()` diff more of
the view model than property status — counts, hash, the model set — and compose that into
`pendingPropertyNews`, which `flushAnnouncement` already debounces and already joins with a
pending human action. Announcing from the handlers *and* a second un-debounced channel would
double every human announcement; the existing `pendingAction` / `pendingPropertyNews` pair is
built to avoid exactly that.

### F-2 — Export and Run are enabled with no model loaded.

`index.html:211-212`. On a pristine page both are in the tab order (positions 4 and 5) and both
enabled, while Undo and Redo are correctly `disabled`. A keyboard user reaches two controls that
can do nothing before reaching the one control that can. WCAG does not forbid it; the page's own
pattern — `disabled` on Undo, `fieldset[disabled]` over the whole Edit section — says this is
inconsistent with how the page handles every other not-yet-applicable control.

### F-3 — The capability registry's `wired` is unchecked against the DOM.

`src/app/capabilities.ts:118` and 28 siblings declare affordance sites as logical strings
(`header.file-input`, `edit-section.add-entity`). **Nothing in the codebase maps those strings to
DOM elements.** `checkRegistryClosure` (`capabilities.ts:528`) exists to catch exactly this drift
in both directions, and its only callers pass literals: `checkRegistryClosure(["header.export"],
["window.mage.query"])` at `test/capabilities.test.ts:232`, and a synthetic negative at 235. The
real page's control set is never the input.

So `wired("edit-section.add-entity")` is a sentence an author wrote. A control could be renamed,
removed, or made unreachable and UX-I1 would stay green. The table in §2 of this document is the
first time those 29 strings have been bound to elements, and that binding lives in a measurement
script rather than in a gate — which is the weakest link in this record, stated as such.

The cheap fix: have the page emit its registered human sites as `data-affordance` attributes and
feed them to `checkRegistryClosure` from the browser tier. One pass, both directions, and the
registry stops being prose.

### F-4 — `explore-space` has no human affordance. Declared, still a defect.

`capabilities.ts:250-257`. The registry names it honestly and UX-I1 reports it, which is the
registry working. It remains a capability a machine can invoke and a person cannot: FR-A11Y-1's
"all workbench functionality SHALL be operable without relying on … mouse input" is not satisfied
by a path that no input method reaches. Verified absent: there is no `analysis-section` in the DOM
at all [measured — the seven sections are `start`, `model`, `edit`, `questions`, `findings`,
`provenance`, `diagram`].

### F-5 — Every readout host is an unnamed `generic`.

`#sections`, `#question-list`, `#finding-list`, `#provenance-list` — all plain `<div>`s, computed
role `generic`, computed name empty [measured]. Their AT identity comes entirely from the
enclosing `<section aria-labelledby>`. It works today. It is one DOM move from not working, and
the progressive-disclosure redesign moves these readouts into panes. A readout that lands outside
its labelled section has no name at all, and nothing in the suite would notice.

### F-6 — Two WCAG-relevant properties this baseline did not measure.

Stated so a later comparison does not read their absence as a pass.

- **Visible focus indication (2.4.7).** `:focus-visible { outline: 3px solid var(--focus) }` is
  authored at `index.html:76` with a comment calling it a requirement. **UNMEASURED** — proving it
  renders needs a screenshot comparison per theme, which this script does not do.
- **Contrast (1.4.3).** Not measured here. `index.html:132-147` records a live instance: the SVG's
  theme-invariant ink on a dark `var(--panel)` ground measured 1.1:1 against the 4.5:1 floor, axe
  scored it INCOMPLETE because it cannot resolve an SVG fill against an SVG ancestor's paint, and
  the page scored zero violations throughout. The existing fix pins it in
  `test/browser/a11y/axe.test.mjs`. Treat "axe reports zero violations" as weaker than it sounds.
- **Reflow and 2-D focus divergence at specific breakpoints (D-2).** UNMEASURED.

---

## 7. Re-measuring this

`scripts/measure-a11y-baseline.mjs`. Committed with this record, because a baseline that cannot be
re-measured is an anecdote.

```bash
cd workbench
node build.mjs                                    # the page loads ./dist/workbench.js
node scripts/measure-a11y-baseline.mjs \
  --port=8152 \
  --out=/tmp/wb-a11y-baseline.json \
  --puppeteer-root=../book                        # a WORKTREE has no book/node_modules of its own
```

It prints the three aggregate numbers and writes the full record as JSON. The run above printed:

```
control affordances: 23; reachable 23; operable 21; named 23
```

Flags:

| Flag | Default | What it does |
|---|---|---|
| `--port` | 8149 | the port the script's own static server binds |
| `--origin` | `http://127.0.0.1:<port>` | override to measure an already-served copy |
| `--browser-url` | *(none)* | attach to a running Chromium over CDP instead of launching one |
| `--puppeteer-root` | `../book` | directory whose `node_modules` holds Puppeteer |
| `--out` | `/tmp/wb-a11y-baseline.json` | where the full record lands |

It **never installs anything**. `workbench/node_modules` is a symlink shared across parallel agent
worktrees, so an install there mutates every live agent at once; Puppeteer is resolved from an
existing copy.

### What a re-measurement against the redesigned shell has to do

The script's `SITES` table (`measure-a11y-baseline.mjs`) maps each registry site string to a DOM
id. **A redesign will move those elements, and the table is the thing to update** — not the
assertions. Then:

1. Re-run it. Compare the three aggregate numbers against 23 / 21 / 23.
2. Compare the §3 walks. Pin the ORDER, not the indices (D-3).
3. Check that §4's seam still returns a populated `accessible` twin — drive it, do not read it.
4. Re-run the §5 agent-mutation probe. If F-1 is still open, the redesign inherited it.
5. For every row that got worse, say which: reachable, operable, or named. The three differ, and a
   single "accessible" number would hide the one that matters.

A redesign that holds 23 / 21 / 23 and closes F-1 is better than this page. One that holds 23 /
21 / 23 and reports "equivalent" without re-running the probe has measured nothing.

---

## 8. What was fixed after this record, and what pins it

**Appended 261002, after the measurement.** The sections above are a dated record and stand as
measured — the numbers in §2 and §5 describe the tree at `197db2ef` and are not rewritten here.
This section says which of §6's findings are closed and by what, so a later reader does not have to
re-derive it from commit messages.

**F-3 — closed, and the gate is BLOCKING.** The registry's `wired` is no longer an author's
assertion. A human affordance declares the element that carries it, and the type refuses the
omission: `HumanAffordance` splits into a bound member that requires an element and an absent
member that requires a reason, so "wired with nowhere to be" does not compile. The page stamps
`data-affordance` onto each declared element from the registry on every paint, and the browser tier
feeds the served page's stamped set to `checkRegistryClosure` in both directions
(`test/browser/workbench.test.mjs`, the UX-I1 suite). The attribute is NOT authored in `index.html`
— a hand-typed one beside a hand-typed registry string would be two copies of one fact, and a test
asserts the markup contains none.

**The binding found no mismatches.** §6 suggested it might; it did not. All 28 distinct declared
sites bind to a live element on the loaded page, and all 21 of the page's buttons are registered
capability affordances. So the gate lands hard rather than as a known set. What the binding DID
surface is smaller and worth recording: `header.run-all` is declared by two capabilities (`query`
and `analyze`), so the registry holds 29 human affordance entries over 28 distinct sites — the
closure check de-duplicates, because Run all questions is still one button.

Three rungs now hold it, cheapest first: the compiler; a node-tier test that every declared element
id appears in `index.html`, with a negative control that renames one; and the browser pass above.
The `SITES` table in `measure-a11y-baseline.mjs` is now a second copy of a fact the registry owns —
a re-measurement should read the registry instead of maintaining it.

**F-1 — closed.** `repaint()` diffs the authoritative model against the last paint and composes a
third pending channel into the existing debounced sender, so an agent edit that moves no verdict is
announced. It names the consequence rather than re-reading the summary: a replacement says what
loaded and how big it is, an edit says which count moved, an annotation-only commit says the
revision stood still. A pending human action suppresses the derived sentence, so a human edit is not
described twice. Politeness stays `polite`, argued at the sender: an agent mutation is consequential
and not an emergency.

Pinned by four browser-tier tests driven through `window.mage` on an untouched page, in the
FR-A11Y-3 suite of `test/browser/workbench.test.mjs` — `load()` announces by name and size,
`transact()` announces the count it moved, a keyboard-driven human edit is not doubled, and the
verdict channel §5 left UNMEASURED on the agent path is now measured: retracting a saved question
through `delete-query` still reports the drop.

Two residues, stated rather than left to be rediscovered. An annotation-only agent commit is
detected through the provenance record COUNT, so attaching a note to an object that already carried
one is still silent. And the comment at `main.ts` that §6 called overstated now describes all three
senders and which slice each carries.

**F-2 — closed.** Export and Run are `disabled` in the markup and re-enabled from
`workspace.state.loaded` on every paint, the pattern Undo and Redo already used. The pristine tab
walk in §3 therefore drops from **8 stops to 6** — the skip link, `#file`, `#new-system`,
`#example-choice`, `#example-load`, `#diagram-subject`. The keyboard suite's pinned opening
sequence is updated with the reason.

**F-4, F-5 and F-6 are untouched.** `explore-space` still has no human affordance, every readout
host is still an unnamed `generic`, and the two WCAG properties §6 declined to measure are still
unmeasured. F-5 is the one the shell makes urgent: it moves readouts into panes, and a readout that
lands outside its labelled section has no name at all.

**The pristine tab walk moved again: 6 stops to 5, and the shell is why.** Appended by the shell's
wave 0. The sixth stop was `#diagram-subject`, the Draw menu of the always-present Diagram section.
SH-I1 mounts the workspace region iff a system is loaded, so on a fresh page that menu is inside a
`hidden` region — out of the accessibility tree and out of the tab order together. The walk is now
the skip link, `#file`, `#new-system`, `#example-choice`, `#example-load`.

The change is in the right direction and worth saying why rather than only recording the number: a
keyboard user on an empty workbench reached a control for choosing which model to draw before there
was a model, which is the same defect F-2 named in Export and Run. The keyboard suite's pinned
opening sequence did not change — it already listed those five — so a second test pins the ABSENCE
of the sixth with its cause, because a pin that happens to still pass records nothing.

Two more lines of §3 and §8 moved with it.

- **The skip link's target is now derived, not fixed.** It was `#model`. The shell has two principal
  surfaces and exactly one is mounted, so a constant href would point into a `hidden` region half
  the time: it lands on `#start` with nothing loaded and `#workspace` once something is. Still never
  the canvas.
- **F-5 is closed, and the shell is what made it urgent.** Every readout host (`#sections`,
  `#question-list`, `#finding-list`, `#provenance-list`) is a `<section>` named by its own visible
  heading, computed against Chrome's accessibility tree by the browser tier. The four then travelled
  into four different regions in this wave, which is exactly the move that would have orphaned them
  as unnamed `generic`s.

**UNMEASURED, and named so the next browser run closes it.** This wave had no resolvable Chromium,
so every browser-tier change it made is reasoned and un-run: the SH-I1 mount matrix, the rewritten
canvas-placement assertion, the two keyboard pins above, and the axe empty-state rule count. That
last one is a real gap rather than a formality — the pristine page is now the header plus Start, so
the 40 rules axe passed on the old empty page cannot hold, and the floor was lowered to 20 with the
reason written at the assertion. The first run with a browser owes that line a measured number.

**The first measured run after the shell, and what it found.** Appended by the browser-gate wave,
the first to run the a11y tier against the shell at all — `npm run all` does not include the
browser tiers, so the shell's wave verified the node tier truthfully and nobody ran this one. Two
failures, one on each side of the page/test line.

- **A real defect: duplicate "Models" landmarks (axe `landmark-unique`, moderate), in every loaded
  state.** The shell's `#nav-models` rail landed as a `<section>` named by its visible "Models"
  heading — the same role and name the System Browser's model table already computes (named by its
  own heading since F-5 closed). A screen-reader user's landmark list held two indistinguishable
  "Models" entries. Fixed in the page: the rail is now a `<nav>`, which the design already argues
  ("Models are navigation", correction 2), so the role+name pair is unique and the rail reads as
  what it is. The property rail stays a `<section>`: it is the stamped readout host the F-5 gate
  pins as a heading-named region, and its name collides with nothing.
- **A stale pin: the first tab stop is `a#skip`, not `a#`.** The shell gave the skip link an id so
  the composition root can retarget the bypass per SH-I1 (the href and the words follow the mounted
  surface). The walk is still five stops in the same order; only the identifier of the first stop
  changed, and the pin — written without a runnable browser — kept the baseline's anonymous
  anchor. The pin is updated with the reason at the assertion.

The number §8 owed is now measured: the pristine page passes **39** axe rules (the floor at the
assertion stays 20, the loaded states pass 47), and the SH-I1 mount matrix, the canvas-placement
assertion and both keyboard pins from the UNMEASURED list above all ran and held.

**The Learn page was audited for the first time, and the gate now covers every served page.**
Appended by the axe-coverage wave. `learn.html` landed with a smoke test that proves it boots and
with no conformance measurement at all: `axe.test.mjs` opened `index.html` and nothing else. The
requirement was never narrower — FR-A11Y-1 says "the entire MAGE Workbench" — so this was a gap
between the requirement and its enforcement, not a scope the project had chosen. Three states of
the gallery are now audited (the landing paint; a node selected in every figure, which is what makes
the renderer emit the legend and glyph that sit on bare ground; and the text twins expanded, since
axe does not audit what a closed `<details>` hides), and the suite is parameterised over a page
list rather than forked per page.

**Two real defects, both drained, so the gate landed hard.**

- **`duplicate-id-aria`, CRITICAL, in every Learn state.** The renderer derives the SVG's
  `title`/`desc` ids from the subject (`mage-title-<subjectId>`). That holds for a standalone export
  and on the workspace page, which draws one subject at a time. The gallery draws four figures and
  two of them draw `data-policy`, so both SVGs carried the same pair of ids and both
  `aria-labelledby` references resolved to the FIRST figure's nodes. The computed name was
  coincidentally right, because the two figures share a subject; nothing would have made it right
  for a pair that did not. Fixed at the embedder — a page that drops N standalone SVGs into one
  document owns uniqueness within it.
- **`color-contrast`, SERIOUS, light theme only.** Learn is the first page to style prose links and
  pointed them at `--accent`. That token is a FILL: `index.html` puts `--accent-ink` on top of it
  and never uses it as ink. As ink on `--bg` it measures **4.47:1**, three hundredths under AA, on
  the "See <type>s" back link. Prose links now take a `--link` token carrying the values
  `assets/mage-tokens.css` already ships as `--mage-link` — 6.5:1 light, a lifted terracotta in
  dark. `index.html` needed no change.

**The id defect belongs to the shared renderer, and this wave only contained it.** `src/render/`
was out of scope, so the fix re-scopes the ids after paint. The minting itself —
`src/render/svg.ts`, deriving a document-global ARIA-referenced id from author-supplied text — is
latent on `index.html` for exactly as long as that page draws one subject at a time, and the right
pattern already sits one file away: `ariaId` in `src/ui/render-dom.ts` counts instead of deriving,
for this precise reason, and says so in its comment. A renderer wave should take it.

**The diagram contrast measurement now runs on both pages.** `learn.html` already pins
`figure svg`'s ground to `#ffffff` with the same 1.4.3 reasoning the workspace page carries, and it
is right: all four figures measure **8.55:1 at worst** in both themes. The probe's root selector
became a parameter (one `#canvas` versus four `.canvas` hosts), and it asserts that the number of
SVGs it measured equals the number of hosts the page rendered — a selector matching only the first
of four would otherwise pass every contrast assertion while measuring a quarter of the page.

**A number §8 owed, re-measured and corrected: the workspace's loaded states pass 48 axe rules, not
47.** Nothing in this wave touched that page. A sibling wave made one more rule applicable, and the
line above is left as the older run's measurement with this as its correction, per the rule that
the dated record stands.

**The port constants were a FALSE-GREEN hazard, and they are gone.** Reported by a concurrent
agent, measured on `main`: a concurrent `npm run test:a11y` reported 8 passing and 0 failing, where
the keyboard file alone declares 22 tests; the re-run surfaced `EADDRINUSE 127.0.0.1:8145`. A
`before` that dies on the bind can take its whole file's tests out of the count while the runner
prints success — so the collision reads as a passing gate that measured less. Per-tier constants
separated the files inside one process and did nothing about concurrent processes, which is this
repo's normal state. `startServerOnFreePort` binds port 0 and reads the address back; two
simultaneous runs of the tier now both complete 37/37 on four different OS-assigned ports.
`workbench.test.mjs` still uses the 8143 default and is the one remaining instance.

**Two residues, named rather than left to be rediscovered.**

- **Learn's figure status line is not announced.** Selecting a node writes the accessible twin's
  description of it into a plain `<p>`, which a screen-reader user never hears; the same `<p>` is
  also written on `pointerenter`, so a naive `aria-live` would make a low-vision mouse user's hover
  chatter. The fix is a `role="status"` region written on *change* only, and it is a behaviour
  change this wave did not measure. FR-A11Y-3 is the pattern to follow.
- **`header nav a[aria-current="page"]` measures 4.55:1.** Bold ochre on `--panel`. It passes, by
  five hundredths, and is reported because the margin is a hair rather than a decision.
