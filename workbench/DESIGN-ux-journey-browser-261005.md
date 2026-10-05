# DESIGN — the student journey at the browser tier: finding first, then the design it leaves room for

**Phase 1 of the UX-journey Epic. Design only; no code, test, or model changed.** Every number below
was measured on this worktree at `ee187838`, and every `file:line` was read, not grepped.

**Baseline, measured here:** `npm run check` clean (4.8s); `npm run test` **1389 pass / 0 fail /
0 skipped** (15.8s); `check:parity` **UX-I1: 0 violations over 26 capabilities**; `npm run build`
clean; `npm run test:browser` **120 pass** (13.4s); `npm run test:a11y` **112 pass** (127s — the
brief's "~2 minutes" is confirmed). Nine browser files plus the `a11y/` subdir, as the brief said.

---

## 1. The finding that outranks the design: the gap, as briefed, is not real

The brief's gap: *"the browser tier drives mutate-then-re-evaluate through the AGENT api … nothing
drives a student's click-path through open-example → ask → modify → watch-the-property-recheck in a
real browser."* The brief also ruled: if a browser test does drive a human click-path through an
edit and a re-check, that finding outranks the design. **One does. The strong form of the gap is
refuted**, by `test/browser/a11y/keyboard.test.mjs` — which the brief's survey did not reach,
presumably because it lives under `a11y/` and reads as an accessibility suite. It is that, and it is
also a keyboard-driven end-to-end drive of §19's thirteen operations, sharing one page in a
deliberate order (its header, lines 37–41, says the ordering is load-bearing). Rung by rung:

- **Open an example through the UI.** `test/browser/a11y/paths.mjs:211–231` — the `loaded`
  precondition routine drives `#example-choice` + `#example-load` by keyboard, explicitly refusing
  the agent path (`window.mage.load`) *"because … establishing it through the agent would mean the
  whole suite ran against a state no keyboard produced."* `keyboard.test.mjs:189–224` drives the
  import route (`#file`) as well.
- **Ask through the UI and read the rendered verdict.** `keyboard.test.mjs:307–334` (13.7) fills the
  Advanced ask form by keyboard and asserts `#ask-answer` renders a verdict word *and* its grounding
  (`Derived from`, UX-I5). `workbench.test.mjs:171–274` drives the human Check control and asserts
  it carries the engine's sentence verbatim.
- **Modify through the UI.** `keyboard.test.mjs:226–303` (13.2–13.6) adds an entity, a model, a
  relation, a property — each through the real form, each asserting the model moved *and* the
  rendered tables show it. `agent-coverage.test.mjs:1138–1184` (UX-I3) drives the `+ Add` menu, the
  dialog, and Apply through real controls.
- **Watch the property re-check and change verdict.** `keyboard.test.mjs:743–825` performs a cascade
  delete *through the UI controls* (`#delete-element-target`, the cascade toggle, `#delete-element-go`),
  takes the G3 review surface that interposes, commits by keyboard, and asserts **≥3 property
  verdicts moved** (line 795) and that the single announcement names the edit *and* the verdict
  count. 13.9 (lines 358–383) separately asserts every rendered `#question-list` row carries a
  verdict word after a keyboard Run.

So the browser tier does drive a human click-path through an edit and a re-check — the brief's
sentence "mutate-then-re-evaluate … through the AGENT api" undercounts the a11y tier, which drives
it through the human surface, keyboard-only, with `element.click()` banned by its own harness.

### 1a. The residue that IS real: curriculum, not capability

What survives of the gap is narrower and worth stating precisely. The keyboard journey is
**ad-hoc**: its question, its edit, and its verdict movement are the suite's own inventions
(`audit-subscribers-exist`, the cascade delete). The **examples' declared activity ladder** — the
curated `queries:` and `modifications:` each `expected-results.yaml` declares, with each
modification's `changes: [{query, from, to}]` (e.g. `examples/message-bus/expected-results.yaml:230–273`)
— is driven only at the node tier: `test/examples.test.ts:578–630` runs every declared modification
through the real seams (`Workspace`, hypothesis open/apply/discard) and pins the verdict flip and
the flip-back on discard. **No browser test reads any example manifest** (verified: no
`expected-results` reference under `test/browser/`). So:

> Nothing shows that a **shipped example's own prescribed modification**, performed through the UI,
> makes the **rendered** verdict for its **declared** query flip from its **declared** `from` to its
> **declared** `to` on the page a student is looking at.

That is the one claim per rung the browser tier does not hold — parity between the curriculum
(DESIGN-v02-examples-and-semantic-completion-261004.md:53: *"4–6 curated questions and 2–3
modifications"* per example) and the served page. Everything else the brief's journey names is
covered, ad-hoc, by the suites above. Two sub-residues fold into it: (a) the storm test observes
verdict movement through the oracle (`window.mage.properties()`, line 764/792) and the announcer,
never through the rendered rows' before/after text; (b) no browser test asks a *curated* question
through the askbar catalogue and compares the rendered answer to the manifest's declared outcome
(the catalogue IS the saved questions — `paths.mjs:53` — and the paths suite proves arrival, not
consequence).

## 2. What the brief and the author's framing got wrong (beyond §1)

- **"Three node tests read the self-models"** — undercount. `models/workbench-components.mage.yaml`
  alone has eight test-file consumers (`import-graph`, `cross-model`, `parity`, `ir`, `rdf`,
  `adapter-reexport`, `model-coverage`, `component-model.ts`); the lifecycle model has three
  (`lifecycle-model`, `model-coverage`, `acceptance-p1-p5`).
- **"No browser test reads any of them"** is literally true but misleading for the affordances
  model: `scripts/gen-affordances.ts:1–3` **generates** it *from* the capability registry, and the
  browser tier imports the registry (`agent-coverage.test.mjs:67`, `workbench.test.mjs:30`). The
  browser reads the source; the YAML is its projection. Reading the projection in a browser test
  would add a second copy of a claim already held, not alignment.
- The brief's two headline characterisations are **accurate as stated**: the agent suite's
  denominator is read out of the served page at runtime (`agent-coverage.test.mjs:160–161, 237`) and
  compared against the imported registry (:1063–1068); the human suite asserts both directions with
  a derived count (`workbench.test.mjs:388–409`). Nothing here needs rebuilding, and nothing below
  proposes rebuilding any of it.
- Timing: `test:browser` is 13.4s, not expensive; only the a11y tier costs two minutes, and the
  journey work does not belong in it.

## 3. Ruling on the denominator: the example manifests, not the lifecycle machines

**The journey set derives from the shipped examples' manifests** — `readdir` of `examples/`
(already the catalogue's source) and, per example, the parsed `modifications[].changes[]` (15
modifications across the 6 shipped examples at this commit: 3+2+2+2+4+2) and the `suggested: true`
curated queries (28 across the set). One journey obligation per declared modification; the count is
**parsed out of the manifests at run time**, never written down — the same move as §16's gate and
`describe().operations`. An empty denominator is a finding, never full coverage (the
`auditCoverage` genre in `agent-coverage.test.mjs:101–148` is the shape to reuse, with its reason
floor and zero exemption ceiling).

**The lifecycle machines are the wrong denominator, and the category error is real.** Reasons, in
force order:

1. **They model the implementation's concurrency semantics, not the student's path.** The
   `transaction` machine's states are the pipeline's outcomes; its interesting window (`based`) is
   *"the gap between `window.mage` handing out `context().hash` and the agent calling `transact`"*
   (`models/workbench-lifecycle.mage.yaml:397–408`) — a window **no student click-path occupies**,
   because the human funnel computes its base at submit time (the `second_author` header,
   :713–733, says exactly this). A journey suite obliged to enter every state would have to drive
   *agent* events to satisfy a *student* coverage claim.
2. **Its correspondence is `asserted`, the schema's weakest kind, and nothing checks it**
   (:14–20: *"a later edit … can falsify every statement in this file and no gate will say so"*;
   `test/lifecycle-model.test.ts:19–23` repeats the disclaimer). Deriving browser obligations from
   it would hang a hard gate off a soft claim — the inversion SEMANTICS.md §13.1's vocabulary
   exists to prevent. The manifests, by contrast, are already verdict-checked end-to-end on every
   node run (`examples.test.ts`), so the browser suite would derive from a substrate something
   already holds true.
3. **Vacuity.** Two of the four machines declare one state (see §5), so "every state entered" is
   half-vacuous by construction, and "every transition traversed" over `painted → painted` ×9 is
   coverage of a counter, not of a student path.

**What the manifest denominator makes checkable that a hand-written journey list would not:** a new
example, or a new modification added to an existing example, lands **red until it has a journey** —
the exact direction a hand list goes stale in (the agent suite's header, lines 14–17, names this
failure mode). And a modification *deleted* from a manifest makes its journey an orphan finding,
so the set cannot inflate against a shrunk denominator.

**The sanctioned secondary alignment** with the lifecycle model: the journey that takes the G3
review surface (or the what-if toggle) traverses `workspace: authoritative → hypothetical →
authoritative`, and the journey file may say so in a comment, as `asserted` correspondence in
§13.1's vocabulary — a reviewable claim, not a checked one. Nothing stronger is honest, because
nothing checks machine↔code.

## 4. What a journey asserts, and the broken-UI-pass construction

A journey is four observations **read from the rendered page**, each compared against the
manifest's declaration:

1. **Opened:** drive `#example-choice`/`#example-load`; assert the workspace mounted and the page
   identifies the example (title/summary), not merely that counts appeared.
2. **Asked:** for each `suggested: true` query, select it in the askbar catalogue and assert the
   **rendered** answer region carries the verdict word mapped from the manifest's declared
   `expected.outcome`, and — for witness-bearing queries — that the rendered evidence names the
   declared nodes.
3. **Before-read (mandatory):** for every `changes[].query` of the modification about to run,
   assert the rendered `#question-list [data-property=…]` row shows the verdict word mapped from
   `from`.
4. **Modified and re-checked:** drive the modification's transaction through the UI edit forms
   (taking the G3 review surface when it interposes — asserted whichever way, since whether it
   interposes is itself declared by the fixture's direction of change), then assert the same
   rendered row now shows the word mapped from `to` — without pressing Run, because repaint-on-commit
   is the product claim.

**The case where a journey passes while the UI is broken — constructed, so the design forbids each:**

- Read verdicts through `window.mage.properties()` (the oracle): the journey passes with
  `#question-list` rendering nothing at all. This is precisely where the existing storm test stops
  (keyboard.test.mjs:764, 792 read the oracle), so the journey's reads MUST be rendered-row text.
- Skip the before-read: a renderer frozen on a stale paint that happens to show the `to` word
  passes. The before-read makes the assertion a *transition*, not a state — the same discipline as
  the prefill test's "the expected value is NOT the field's own default"
  (`workbench.test.mjs:797–803`).
- Read the announcer only: passes while the list is broken, since `#live` is written by a different
  sender.
- Drive the mutation through `window.mage.transact`: the agent path wearing a human name
  (the phrase is `agent-coverage.test.mjs:1148`'s); the forms must carry the transaction.

**What is reviewed rather than checked** (§13.1 vocabulary): that the UI route a journey takes is
the route a student would take is `asserted` — reachability of every control is already `checked`
by the generated paths suite, and consequence is what the journey checks; the choice of route
between equivalent affordances has no oracle. Likewise the machine-walk comment of §3 is
`asserted`. The verdict mappings (`holds`→ESTABLISHED etc.) are `derived` from the renderer's
closed vocabulary, which 13.9 already pins.

## 5. Ruling on the one-state machines

Both are **legitimate declarations, not modelling gaps** — and each is argued in the model itself:
`second_author`'s single state is the point (*"contributes nothing to the configuration and
everything to the TRANSITION RELATION"*, :715–720, with the measured note that the three-machine
draft answered `refuted` for a population reason); `presentation`'s single `painted` state encodes
*"a loaded workspace always presents something, because the paint path evaluates every saved
property unconditionally"* (:736–740), carrying its content in the `answer_of` variable.

**What a one-state machine means for coverage:** it contributes zero state-coverage obligations and
its transition coverage is per-sync-event only — facts that make any "states entered / transitions
traversed" denominator silently shrink or inflate. Their claims are already exercised where they
can be: `model-coverage.test.ts` re-derives all nine statements per node run, and
`lifecycle-model.test.ts` drives each through a negative control (mutate the model text, assert the
verdict flips). The browser adds nothing to either. This is the concrete demonstration, from inside
the model, that machine-derived coverage is the wrong journey denominator — it is also why no
"report a modelling gap" action is proposed.

## 6. Cost, measured

A throwaway probe (written, run twice, deleted — per the brief) drove one full journey on the
flagship: picker-load → Advanced ask with rendered answer → rendered before-read of the safety row →
cascade delete through the UI → rendered row flips to REFUTED. Two runs:

```
total 2217ms :: boot=2059 | open=46 | ask=6 | before-read=1 | modify=24 | verdict-changed=1 | shutdown=80
total 1526ms :: boot=1380 | open=35 | ask=5 | before-read=1 | modify=32 | verdict-changed=1 | shutdown=72
```

**The journey body costs ~75–110ms; boot dominates and is paid once per file.** All 15
modification journeys plus ~28 curated-question asks, sharing one browser, extrapolate to **under
5s of body on one ~2s boot** — against a 13.4s browser tier, comfortably inside budget. (The probe
drives fills via `page.evaluate`; keyboard-driven re-walks would multiply the body severalfold,
which is one reason §7 excludes them.) A relevant incidental finding: the probe shows G3 does
**not** interpose for a cascade delete that *repairs* the shipped requirement — the review surface
is direction-sensitive — which is exactly the kind of declared-per-fixture fact rung 4 asserts.

**Cut order if the suite ever exceeds budget:** first the curated-question asks for queries whose
outcome is not changed by any modification (their verdicts are node-pinned and rendered-list parity
is already held by `workbench.test.mjs:298–316`); then collapse multiple modifications of one
example onto one page load with an undo between (the node tier already pins discard-reverts); the
before/after rendered-verdict reads are never cut — they are the suite.

## 7. Per rung: what the browser adds that the node tier cannot see

- **Open-example:** node loads YAML through `Workspace.load`; only a browser can see the picker
  deliver that example to the page and Start unmount (SH-I1).
- **Ask (curated):** node pins the engine's verdict and evidence; only a browser can see that
  verdict *rendered* in the answer region a student reads.
- **Before-read:** node has no rendered rows; only a browser can establish the row showed `from`
  before the edit, which is what makes the flip a flip.
- **Modify:** node drives the transaction seam directly; only a browser can see the edit forms
  build that transaction and the G3 surface interpose (or correctly not).
- **Re-check:** node pins `from→to` on the seam; only a browser can see the rendered row change
  without a Run press — repaint-on-commit is invisible to node.
- **Evidence after the flip:** adds nothing beyond rung 2's read at the new revision — proposed only
  as part of rung 4's row read, not as a rung.
- **Ask/agent agreement per journey:** adds nothing — UX-I1 convergence is already held by
  `workbench.test.mjs:249–264` and `check:parity`; not proposed.

## 8. Phasing

- **Phase 2 — one journey, end to end (the thinnest slice that catches a real regression class).**
  One file, `test/browser/journeys.test.mjs`, flagship only: both declared modifications of
  message-bus, with the rung-1–4 assertions of §4. Auto-collected by the `test:browser` glob (no
  new script; `gate-reachability` already declares that tier's runners). This slice alone would
  have caught the class the repo has already paid for — a rendered surface silently detached from
  state while every seam-level test stays green (the 749-of-749 prefill incident,
  `workbench.test.mjs:771–808`), here in the form "verdicts recompute but the rows never repaint."
- **Phase 3 — derive the denominator.** Generate one journey per (example, modification) by
  parsing the manifests; census assertion in the paths-suite style (journeys run = obligations
  parsed; empty set is a finding); `auditCoverage`-shaped exemption map, reason floor 40, ceiling
  0. Unblocks: new examples land red until they carry journeys.
- **Phase 4 — curated questions through the catalogue**, rendered answers against declared
  outcomes, subject to §6's cut order. Unblocks nothing downstream; last on purpose.
- **Not phases:** lifecycle-machine-derived obligations (§3); keyboard re-walks of journey routes
  (reachability is the generated paths suite's job; duplicating it at journey count is the
  100×-cost duplication the brief forbids); any journey DSL or framework ahead of the second
  consumer.
