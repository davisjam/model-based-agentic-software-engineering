# Where a claim has to run to be worth anything

**Design, 261004.** Prompted by a red CI gate and the question that followed it: *the pre-push hook
is not strong enough, right?*

The answer is no, and the interesting part is why. The failure that reddened CI would have survived
a stronger hook, because the check that caught it returns a different answer depending on where it
runs. Strengthening a hook adds runs of the same unreliable instrument. What the incident asks for
is a line between claims whose verdict is a property of the page and claims whose verdict is a
property of the machine — and then a tier for each.

This document draws that line, assesses every browser and a11y assertion against it, answers the
DOM-shim question, and makes a recommendation on the hook. Every number below was measured in this
worktree on 261004; the measurement appendix says how.

---

## 1. The four premises, verified

The commission named four premises to check rather than inherit. Three hold. Two carry corrections
that change the design.

### 1.1 What pre-push actually runs — **premise incomplete, and the correction matters**

`hooks/pre-push` runs six gates, not four, and only two of them run unconditionally:

| Gate | Condition | File |
|---|---|---|
| `catalog.py build` | always | `hooks/pre-push:141-144` |
| `book/build_book.py --pdf` | iff the push touches `book/` or `book-models/` | `hooks/pre-push:146-152` |
| `handbook/scripts/build.py pdf` | iff the push touches `handbook/` | `hooks/pre-push:154-160` |
| workbench `npx tsc --noEmit`, `npm test`, `npm run build` | iff the push touches `workbench/` **and** Node ≥ 22 | `hooks/pre-push:182-192` |
| `workbench/validate.py --self-test` + every `*.mage.yaml` | iff the push touches `workbench/` | `hooks/pre-push:194-207` |
| `catalog_tests.py --tier1` | always | `hooks/pre-push:211-214` |

The brief said the workbench **node** tier is not among them. It is: `hooks/pre-push:185` runs
`npm test`, which is the whole node tier (1097 tests, measured 10.5s). What pre-push does not reach
is the **browser** tier, the **a11y** tier, `check:node` and `check:parity`.

Two further facts about the hook are load-bearing and are not in the brief.

- **Pre-push is strictly weaker than the default gate on the workbench axis.** It hand-enumerates
  three scripts (`hooks/pre-push:182-192`) rather than invoking `npm run all`, which is
  `check:node && check && check:parity && test && build && test:smoke`
  (`workbench/package.json:22`). So `check:parity` and `test:smoke` are in the gate an agent is told
  to run and absent from the gate that guards the push. `test/gate-reachability.test.ts:61-64`
  already records this and routes it to the hook's owner rather than asserting it.
- **The hook's workbench coverage is conditional on the developer's shell.** If `node --version`
  reports below 22, all three TypeScript gates **skip** and the push proceeds
  (`hooks/pre-push:171-180`). The skip is deliberate and reasoned. Its consequence is that a green
  pre-push from a Node 20 shell means *the workbench gates did not run*, not *they passed* — which
  is the same defect this document is about, sitting inside the hook that was accused of being too
  weak.

### 1.2 The exclusion is deliberate and documented — **premise holds; the stated reason does not separate the cases**

`test/gate-reachability.test.ts:121-138` declares `test:browser` and `test:a11y` exempt from the
default gate, with reasons, with evidence commands, and with a 40-character reason floor
(`:181`). The machinery is sound. Two things about the reasons are not.

- **The dependency half of the reason does not distinguish the excluded tiers from the included
  one.** `test:browser` is excused because it "needs Puppeteer + Chromium resolved from
  book/node_modules, which this package deliberately does not depend on and a fresh worktree does
  not have" (`test/gate-reachability.test.ts:125-128`). But `npm run all` reaches `test:smoke`
  (`workbench/package.json:18,22`), and `test:smoke` resolves Puppeteer from exactly that tree
  (`test/browser/harness.mjs:178-181`). The default gate already requires `book/node_modules` and
  already fails in a worktree that lacks it. The file knows: its own header says the smoke tier
  "failed on a missing module until that directory was linked" (`:36-38`). So the separator between
  `test:smoke` and `test:browser` is **cost alone**.
- **The declared costs are stale, and one is stale by 3.4×.** Measured today against the declared
  figures from 261003:

  | Tier | Declared | Measured 261004 | Tests |
  |---|---|---|---|
  | `test` (node) | ~9.9s (`:35`) | **10.5s** | 1097 |
  | `test:browser` | 10.5s (`:125`) | **7.8s** | 115 |
  | `test:a11y` | 36.3s (`:133`) | **122.5s** | 112 |

  `test:browser` now costs **less than the node tier it is excluded beside**, and `test:a11y` costs
  sixteen times what `test:browser` does. A single number named them both expensive; they are not
  the same kind of expensive, and the design in §7 turns on that.

### 1.3 The incident would have survived a stronger hook — **premise holds, and is now quantified**

The failure was `scrollable-region-focusable [serious] @ #question-agents > .scroll` on
`learn.html` (`test/browser/learn-scroll-focusable.test.mjs:11`). axe runs that rule only on a
region that *actually overflows*, so the rule's reach is a function of viewport width. Measured on
`learn.html` at HEAD, counting `.scroll` containers and how many overflow:

| Viewport | Containers | Overflowing | axe would examine |
|---|---|---|---|
| 320px | 10 | **10** | 10 of 10 |
| 800px (the tier's own viewport) | 10 | **1** | 1 of 10 |
| 1280px | 10 | **0** | 0 of 10 |
| 1600px | 10 | **0** | 0 of 10 |

The a11y tier sets no viewport (`test/browser/harness.mjs:375-385` — `openServedPage` calls
`newPage` and `goto` and nothing else), so it audits at Puppeteer's default. At that width the rule
examines **one container in ten**. CI named exactly one node. A developer on a wider window gets
zero. Nothing about the markup differs between those three runs.

So the premise is right, and stronger than stated: running the same tier locally does not merely
risk the wrong answer, it reproduces an instrument whose **coverage of a ten-instance class ranges
from 0% to 100% as a function of window width**. Adding that tier to pre-push buys a check whose
sensitivity nobody controls.

### 1.4 The scope the environment hid — **premise holds; the count has moved, and the class has a third instance**

The fix commit recorded eight `.scroll` containers with one overflowing (`d00958c3`). Today
`learn.html` has **ten**, all carrying `tabindex="0"`, and at 800px exactly one overflows. The ratio
is what the premise was about and the ratio is intact.

The class, though, has a longer history than the brief suggests, and it is a **recurrence**:

1. **261002, `#nav`.** `scrollable-region-focusable` on the workspace rail, both themes, measured at
   1440×1000 — in a state the axe suite does not scan, because `axe.test.mjs` scans every state and
   *then* selects a node (`BASELINE-a11y-261002.md:742-752`).
2. **261004, `learn.html`.** The incident. Caught by CI, at one of ten sites.
3. **261004, `index.html`, still live.** Three more sites, found by the measurement for this
   document. §5 has them.

Three instances of one rule, each exposed by a different accident of environment. That is what makes
this a design question rather than a bug report.

---

## 2. The line: two axes, not one

"Must this run in a browser?" is the wrong first question. It conflates two independent properties,
and the incident lives in the gap between them.

- **Axis 1 — execution requirement.** Can the claim be *evaluated* without a browser? "Every
  declared affordance names an element the page declares" can (`test/capabilities.test.ts:285-295`
  reads `index.html` as text). "Pressing Enter on Export writes the serialization" cannot.
- **Axis 2 — verdict stability.** Does the claim's *truth value* depend on the environment it was
  evaluated in? "A scroll container carries `tabindex`" does not. "This region overflows at the
  current width" does.

The two axes are orthogonal, and the useful cells are the off-diagonal ones:

|  | **Verdict stable** | **Verdict environment-dependent** |
|---|---|---|
| **No browser needed** | The cheap tier's home. Registry structure, markup structure, source structure. | Rare and suspect — a stable-looking claim over an unstable input. |
| **Browser needed** | Keyboard journeys, event wiring, computed names. Expensive, but a green means something. | Contrast, reflow, geometry, overflow. Expensive **and** the green is conditional. |

The scroll claim belongs in the top-left cell and was being checked exclusively from the
bottom-right one. That is the whole defect. It was expensive because it needed Chromium, and
unreliable because its instrument only looked when the window was narrow enough.

### 2.1 Two ways an environment-dependent verdict goes wrong, and only one announces itself

This repo has already audited the a11y tier for environment dependence once. `BASELINE-a11y-261002.md:1026-1035`
asks whether any assertion "pins a machine-dependent value as a page property", finds exactly one
besides the D-2 counts (1.4.10's hard zero), and concludes that "nothing else in the a11y or browser
tiers pins a machine-dependent value".

That audit is correct and its frame cannot see the scroll bug, because there are two failure modes
and the frame describes one:

- **Mode A — the assertion's VALUE moves.** `EXPECTED_INVERSIONS` pinned focus-order inversion
  counts; the counts were a function of which font resolved and whether the platform's scrollbar
  takes layout width (`test/browser/a11y/wcag-f6.test.mjs:28-30`; the five-condition table at
  `:127-140`). Mode A is loud. It passes here, fails there, and somebody has to look.
- **Mode B — the assertion's value holds and its COVERAGE moves.** `violations.length === 0` is
  stable, correct, and says nothing about the nine containers the instrument declined to examine.
  Mode B is silent. It is green in every environment until the environment shifts, and then it is
  red on one arbitrary instance of a class.

Mode B is the more expensive of the two, and it is invisible to the question "does this assertion
pin a machine-dependent number". The assertion pins zero. Zero is right. Zero was useless.

**The generalisation.** A verdict is worth acting on when every environment variable it depends on
is either *absent* or *controlled by the test*. Mode A is an uncontrolled variable in the value.
Mode B is an uncontrolled variable in the *applicability*. Both are the same defect — a gate
reporting something other than what it measured — and the fix for both is to name the variable.

### 2.2 The instrument is unreliable in both directions, measured at one site

One more reason not to let the browser check be the only check: axe's answer to this rule is wrong
in *both* directions, and this repo has now measured both.

- **False negative** (the incident): the region overflows nowhere the suite looks, so the rule never
  fires over markup that is wrong.
- **False positive** (`BASELINE-a11y-261002.md:753-757`, and reproduced for this document in §5):
  Chromium puts a keyboard-scrollable container in the tab order when it holds no focusable child,
  which axe's rule does not model. So the rule reports [serious] on a region a Chromium user can
  reach.

Only a measurement tells you which you have. The markup claim has no such problem: *the page
declares this region reachable* is one value, in one place, true or false before any browser opens
it — and it is also the claim WCAG 2.1.1 is about, since a declared `tabindex` is a contract across
engines rather than one engine's courtesy.

---

## 3. Three moves, all of which this repo has already made once

The line in §2 implies three remedies, in descending preference. Naming them matters because two of
the three are already in the tree, which makes the fourth application a pattern rather than an
invention.

1. **LIFT** — restate the claim so it needs no environment, and check it in the cheap tier. *Done
   261004:* `test/browser/learn-scroll-focusable.test.mjs:96-101` asserts `tabindex !== null` and
   says in terms that `scrolls` is deliberately not part of the claim. (Lifted out of axe's hands —
   though only as far as the browser tier. §7 finishes the move.)
2. **CONTROL** — keep the environmental claim and make the test own the variable. *Done twice:* the
   contrast and focus-ring probes apply both themes explicitly rather than inheriting one
   (`THEMES` at `test/browser/a11y/wcag-f6.test.mjs:64`, applied at `:198`); the reflow widths are **derived from the stylesheet**
   rather than typed into the test (`cssReflowWidths`, `test/browser/a11y/wcag-f6.mjs:411-433`), so
   a new breakpoint is tested by existing. `WB_F6_SIMULATE_CI_FONTS=1` controls the font variable and
   asserts the substitution applied (`test/browser/a11y/wcag-f6.test.mjs:272-290`).
3. **DEMOTE** — move the unstable number to a receipt and assert the structural residue underneath
   it. *Done 261004:* D-2's exact inversion counts became two booleans per region, "is it
   multi-column" and "do its two orders disagree at all", both computed from the region's own rows
   and invariant to metrics (`BASELINE-a11y-261002.md:993-1003`). The counts still ride in the
   receipt, "where a number that moves with the environment is a record rather than a gate".

A fourth move exists and is a trap. **Match the environment** — install CI's fonts locally, run the
a11y tier at CI's viewport — makes the two runs agree without making either answer the question. It
would have turned this incident's local green into a local red, at one site of ten, and left the
class exactly as exposed. The fix commit says so (`test/browser/learn-scroll-focusable.test.mjs:19-21`):
"NOT to make the local axe run match CI's metrics — that chases the symptom and would re-break the
day a font changes."

---

## 4. Per-assertion assessment

Every assertion in the browser and a11y tiers, classified on the two axes of §2. `→ LIFT` marks a
structural claim currently held only in a browser tier.

### 4.1 `test/browser/a11y/axe.test.mjs` — 16 tests, **4.7s**

| Assertion | Axis 1 | Axis 2 | Note |
|---|---|---|---|
| zero violations, per page × state (7 combos) (`:401`) | browser | **mode B** | One assertion aggregates ~48 rules of mixed stability. Its verdict inherits the applicability of the least stable rule in the set. §4.5 unpacks it. |
| every served page is audited here (`:423`) | **no browser** `→ LIFT` | stable | Compares the `PAGES` register against the served `.html` set. A file-system claim in a Chromium file. |
| the only thing axe declines to judge is SVG text contrast (`:433`) | browser | environment | Pins axe's `incomplete` set for this build. Correctly environmental: it is a claim about the tool. |
| every diagram host drew text in both themes (`:468`) | browser | **controlled** | Theme applied explicitly; renderer stylesheet is a fixed light palette by design (`test/browser/a11y/axe.mjs:118-121`). |
| every diagram label clears AA, each theme (`:497`, `:503`) | browser | **controlled** | Hit-tested against the actual paint. Genuinely environmental and correctly owned. |

### 4.2 `test/browser/a11y/keyboard.test.mjs` — 23 tests, **52.5s**

| Assertion | Axis 1 | Axis 2 | Note |
|---|---|---|---|
| the tab order opens on the skip link, then the toolbar (`:104`, `:137`, `:165`) | browser | stable | Tab order is DOM order plus `tabindex`, so the claim is structural; the browser is the only thing that computes it. Keep. |
| §19 operations 1–16, driven by keyboard (`:189`–`:566`) | browser | stable | User journeys: reach the control, operate it, assert the model moved. The strongest claims in the suite and the correct home for them. |
| every one of §19's thirteen operations was driven (`:591`) | **no browser** `→ LIFT` | stable | A census over the run's own record. Needs the drives, so it cannot move alone; noted because it is arithmetic, not observation. |
| a consequential change announces in the live region (`:624`, `:745`) | browser | stable | |
| the announcement WAITS for the state to settle (`:633`) | browser | **environment** | The one timing-dependent verdict in the tier. A debounce assertion under host load is a variable nobody controls. Not implicated here; named because it is the shape that bites next. |
| Tab reaches Explore configuration space (`:851`) | browser | stable | |

### 4.3 `test/browser/a11y/paths.test.mjs` — 52 tests, **137.2s** (the tier's dominant cost)

| Assertion | Axis 1 | Axis 2 | Note |
|---|---|---|---|
| every wired affordance declares a path or is enumerated (`:73`) | **no browser** `→ LIFT` | stable | Synchronous. Calls `checkNavPaths()` from `src/app/capabilities.ts:1251`. |
| the surfaces table and the citing paths agree (`:97`) | **no browser** `→ LIFT` | stable | Synchronous. |
| the known set is exactly the declared one (`:109`) | **no browser** `→ LIFT` | stable | Synchronous. |
| those sites are still reachable some other way (`:126`) | **no browser** `→ LIFT` | stable | Synchronous. |
| every surface a path names resolves to a page element (`:81`) | browser | stable | |
| ~26 generated drives, one per declared path (`:149`) | browser | stable | Arrival only; the §19 thirteen are the deeper tier. Correct home. |
| the three census assertions (`:156`, `:168`, `:180`) | arithmetic over the run | stable | Depend on the drives. |

**Four synchronous, registry-only assertions sit in a 137-second Chromium file, and `checkNavPaths()`
has exactly one caller in the whole tree** — `test/browser/a11y/paths.test.mjs:78`. The node-tier
registry suite (`test/capabilities.test.ts`, 23 tests) covers a great deal of `capabilities.ts` and
not this. So the path-declaration invariant is held only in the tier that neither `npm run all` nor
`hooks/pre-push` reaches. It is the clearest instance in the tree of a structural claim wearing
environmental clothing, and moving it costs nothing but the move.

### 4.4 `test/browser/a11y/wcag-f6.test.mjs` — 21 tests, **28.8s**

| Assertion | Axis 1 | Axis 2 | Note |
|---|---|---|---|
| the CI-font simulation is OFF, or ON and applied (`:272`) | no browser | stable | A witness over the control itself. |
| the focus ring renders, per control kind, both themes (`:295`) | browser | **controlled** | Verdict is a *fraction* of the band, not a pixel count (`BASELINE-a11y-261002.md:1033`). Correctly environmental. |
| no text below its contrast floor, both themes (`:339`) | browser | **controlled** | Reads tokens and CSS-declared sizes. |
| the HTML walk leaves SVG text to the SVG probe (`:361`) | browser | stable | A partition claim over the two probes. |
| no horizontal scrolling at 320px or any CSS-defined width (`:397`) | browser | **environment, measured** | Genuinely font-sensitive and knowingly so; re-measured at 0 under four font conditions (`BASELINE-a11y-261002.md:1027-1030`). The right call: a real page claim, kept hard, with the sensitivity recorded. |
| focus order diverges from visual order only where 2-D (`:414`) | browser | **demoted** | The §3 exemplar. Was counts; is now per-region booleans. |
| no two sibling regions occupy the same pixels (`:470`) | browser | environment | Geometric by nature. |
| four negative controls (`:319`, `:376`, `:495`, `:517`, `:545`) | browser | stable | Sabotage-and-see-red. The only evidence the zeros are measurements. |

### 4.5 The one assertion that cannot be classified as written

`zero violations` is not one claim. It is a conjunction over the ~48 axe rules that happened to be
applicable in that state, and the rules split on axis 2:

- **Structural rules** whose verdict is a property of the markup: `image-alt`, `label`,
  `duplicate-id-aria`, `heading-order`, `landmark-unique`, `empty-table-header`, list semantics. The
  two real defects Learn's first audit found were both of this kind
  (`test/browser/a11y/axe.test.mjs:60-66`).
- **Environmental rules** whose verdict depends on rendering: `color-contrast`,
  `scrollable-region-focusable`, target size.

A green therefore means "no structural rule fired, and no environmental rule fired *on the subset of
nodes this environment exposed to it*". The first half is a conclusion; the second is a sample of
unknown size. The assertion cannot say which half it is reporting, which is exactly the property
§2.1 calls mode B.

This is not an argument for weakening the axe gate. It is an argument that the axe gate cannot be
the *only* holder of a structural rule's claim — and three of the rules in that set have page-level
structural restatements available for the cost of a `querySelectorAll`.

---

## 5. What the measurement found: the same rule, live, on the other page

Three more `.scroll` containers exist, built by `sectionTable` at **`src/ui/render-dom.ts:206`**,
and none carries `tabindex`. A fourth site is `findingTable` at **`src/ui/render-dom.ts:296`**, same
shape. The one site that does set the attribute is `rowsTable` at **`src/learn/main.ts:211-212`**.

Measured on `index.html`, loaded state, System Browser disclosure opened — the containers live
inside `<details id="system-browser-detail">`, which ships closed:

| Viewport | Containers | Overflowing | `tabindex` | axe verdict |
|---|---|---|---|---|
| 320px | 3 | 3 | none | **1 violation, `scrollable-region-focusable` [serious], 3 nodes** |
| 800px | 3 | 0 | none | 0 violations |
| 1280px | 3 | 0 | none | 0 violations |

With the disclosure closed — the state the suite audits — the containers are not visible, axe treats
them as inapplicable, and all four audited `index.html` states report zero violations. The a11y tier
is green at HEAD, 112/112.

So the verdict on this one rule, at this one site, is a function of **three** uncontrolled variables:
viewport width, whether a disclosure is open, and which state the suite drives. And a fourth, from
§2.2: a 400-press tab walk at 320px with the disclosure open lands on all three containers,
**fifteen stops over five cycles, in Chromium 131.0.6778.204** — so axe's [serious] there is a false
positive for this engine, reproducing the `#nav` finding of `BASELINE-a11y-261002.md:753-757`.

**What to do with that, stated as three separate things.**

- **The attribute is still right**, for the reason the markup claim is the stable one: a declared
  `tabindex` is a contract every engine honours, and Chromium's scroller-focusability heuristic is
  not. One line at `src/ui/render-dom.ts:206`, one at `:296`. Not mine to land (§8).
- **The landed pin does not cover it.** `learn-scroll-focusable.test.mjs:66` navigates to
  `LEARN_PAGE` and nowhere else. Its "What would defeat it" section (`:30-37`) names two defeats and
  not this one: a second *page* with the same selector. The invariant is page-scoped where the
  constructor is not.
- **A reasonable future change makes CI red over a non-defect.** Adding the selected state to the
  axe suite, or auditing at 320px, are both sensible and both produce three [serious] findings that
  a Chromium user cannot experience. The gate would report the right remedy for the wrong reason,
  which is this session's governing defect one more time.

**The repo's own rule already points at the fix.** `rowsTable`'s doc comment says it was "extracted
on the second site, not the third" (`src/learn/main.ts:199-200`). There are three sites constructing
`div.scroll`, the extraction covered one of them, and the two it did not cover are the two that are
wrong. The invariant does not want another test. It wants one constructor. §6 costs that out.

---

## 6. The DOM-shim question, answered

**Is a DOM shim warranted for the structural half?** No. Three reasons, in order of decisiveness.

**It would buy nothing without unrelated code changes.** `src/learn/main.ts` declares **zero
exports** — it is a composition root whose only entry is `boot()` at the foot of the file, and
`rowsTable` is module-private. `sectionTable` and `findingTable` are module-private in
`src/ui/render-dom.ts`. A shim lets you call a function you cannot import. The export change is the
real work, and once you have made it the shim is the smaller half of the problem.

**The repo already has the pattern it would be reaching for, twice over.**

- The renderer's `el()` returns a plain typed `SvgNode`, not a DOM element (`src/render/svg.ts:61`),
  so `test/render-accessible.test.ts` walks the emitted markup in `node:test` with no browser. That
  is a DOM shim the repo wrote once, named a domain type, and gets a full tier of structural
  assertions out of.
- The node tier reads `index.html` as text and asserts structure over it, with comments stripped, a
  breadth assertion, and a negative control (`test/capabilities.test.ts:285-295`, `:388-409`,
  `:411-419`). Its own comment states the division this document is arguing for: both defects are
  "mechanically visible in the file, in a millisecond, without a browser", and "it does not replace
  the browser pass, which is what asserts the name COMPUTES to something".

**A runtime dependency is a real cost here and the shim is the expensive form of a cheap answer.**
`workbench/node_modules` is a symlink shared across live agent worktrees (verified in this worktree:
all three of `node_modules`, `book/node_modules`, `workbench/node_modules` resolve to the main
checkout). An install mutates every concurrent agent's tree at once. `test/browser/a11y/axe.mjs:1-11`
declined the same trade for axe-core and resolved the already-pinned copy instead; the harness
declined it for Puppeteer (`test/browser/harness.mjs:6-8`). A third decline is consistent, not
precious.

### 6.1 So what holds the structural half?

**Constructor-level unit tests get most of the value with none of the dependency — but only after a
unification, and the unification is the part worth doing.** Ranked by the rung it holds the invariant
at:

1. **UNIFY (recommended).** One exported `scrollContainer()` — or a parameter on an existing shared
   builder — that creates the element and sets the attribute, called from all three sites. The
   invariant stops being "every site remembers" and becomes "there is one site". Cost: ~10 lines of
   production code, three call sites, one node-tier test over the helper's returned shape if the
   helper is made DOM-free, or over its source if not. This is the rung the repo's own guidance puts
   first, and `rowsTable`'s comment shows the extraction was already begun and scoped too narrowly.
2. **SOURCE PIN (cheap, weaker, complementary).** Assert over the text of the modules that construct
   `.scroll` that no construction appears without a neighbouring `tabindex`. The pattern exists:
   `test/shell-inspector.test.ts:479-481` asserts the inspector builds no `<button>` by reading its
   own source. Cost: ~15 lines, zero dependencies, runs in the node tier in milliseconds. Weakness
   is spelling, and the landed test already names it: "a scrollable region built with a class other
   than `.scroll` would be invisible here" (`test/browser/learn-scroll-focusable.test.mjs:31-33`). A
   source pin that watches for the *second spelling* is the right scope for it once (1) exists.
3. **BROADEN THE BROWSER PIN (keep, do not rely on).** Parameterise
   `learn-scroll-focusable.test.mjs` over both served pages, the way `axe.test.mjs` is parameterised
   over `PAGES` (`:16-23`). Cost: a tab, not a Chromium. It catches the one class the other two
   cannot — a region that scrolls because of CSS on an ancestor the selector does not match, which
   the landed test names as its second defeat (`:35-36`).

The three are not alternatives. (1) makes the defect hard to write, (2) catches the route around
(1), (3) catches what neither can see. That is the full-coverage answer, and the one-line fix at
`src/ui/render-dom.ts:206` is a prerequisite for any of them landing green.

---

## 7. The recommendation on pre-push

**Leave the shape of the hook alone. Do not add the a11y tier. Close one gap, which is free, and
promote one script in the default gate.**

### 7.1 Do not add `test:a11y` to pre-push

Three reasons, each sufficient.

- **It would not have caught this.** §1.3: at any width above ~900px the rule examines zero of ten
  containers. The hook would have been green at the same commit CI was red.
- **Measured cost is 122.5s**, not the declared 36.3s, and it lands on every push that touches
  `workbench/`. `npm run all` is 22.7s today; this is a 6× multiplication of the gate for a check
  whose sensitivity nobody controls.
- **It would duplicate CI's strongest property for none of CI's benefit.** The workflow runs
  `test:a11y` unconditionally with receipt assertions (`.github/workflows/pages.yml:251-261`), which
  is the right home for an expensive environmental tier: one environment, declared, reproducible,
  and not the developer's.

I cannot name a class the a11y tier would catch at pre-push that nothing cheaper would. That is the
test the brief set, and it fails it.

### 7.2 Replace the hand-enumerated workbench triple with `npm run all`

`hooks/pre-push:182-192` lists `npx tsc --noEmit`, `npm test`, `npm run build` by hand. Invoking
`npm run all` instead does the same three plus `check:node` and `check:parity` and `test:smoke`, and
— the reason that matters — makes the hook's coverage **derived** from `package.json` rather than
copied from it. A tier added to `all` then reaches pre-push by existing. The repo's own argument for
derivation over listing is at `test/gate-reachability.test.ts:44-47`, and this hook is the file that
rule's author pointed at (`:61-64`).

Measured cost: `all` is **22.7s** against **14.1s** for the three gates it replaces (2.9 + 10.8 +
0.4, summed; the hook runs them serially). **+8.6s**, and `check:node` makes the Node-version skip of
§1.1 announce itself as a failure instead of a line of stderr nobody reads.

### 7.3 Promote `all`'s browser gate from `test:smoke` to `test:browser`

This is the recommendation that answers the commission, and it is not about the hook.

The structural pin written *because* the viewport-dependent check could not be trusted —
`test/browser/learn-scroll-focusable.test.mjs`, the one assertion in the tree that returns the same
verdict in every environment — **runs only in CI**. `all` reaches `test:smoke`, which is
`node --test test/browser/smoke.test.mjs` and nothing else (`workbench/package.json:18`). Pre-push
reaches neither. So the remedy for a gate that measured the wrong thing was filed in the tier that
nothing local runs.

| | Measured | Tests | Adds |
|---|---|---|---|
| `test:smoke` (today) | 2.9s | 3 | — |
| `test:browser` | 7.8s | 115 | the scroll pin, `learn-reachable`, `learn-contextual`, `shell-geometry`, `workbench`, `agent-coverage`, `attach` |

**+4.9s.** No new dependency class: `all` already resolves Puppeteer from `book/node_modules` via
`test:smoke` (§1.2). `test:browser`'s glob `test/browser/*.test.mjs` already matches
`smoke.test.mjs`, so this is a strict superset and nothing is lost.

**Two consequences to land in the same change, because the controls will fire otherwise.**

- `EXEMPT_FROM_ALL["test:browser"]` (`test/gate-reachability.test.ts:122-129`) becomes a stale
  exemption over a reached gate, and the audit reports exactly that (`:246-248`). Delete the entry.
  The control working is the point.
- Re-measure and correct `test:a11y`'s declared 36.3s (`:133`). A reason floor that holds a stale
  number holds a decision nobody can review — the failure mode `:55-56` already names for stale
  exemptions, in the field the exemption is made of.

### 7.4 And then the cheap tier earns the backstop framing

With §7.2 and §7.3 landed, the expensive tiers stop being the only line of defence for anything
structural, which is the condition the brief set for "leave pre-push alone" to be a legitimate
finding. The remaining work is the four lifts of §4, in priority order: the four synchronous
registry assertions out of `paths.test.mjs` (a 137-second file holding millisecond claims), the
served-page register check out of `axe.test.mjs`, and the `.scroll` invariant down to a constructor
per §6.1.

**Total measured cost of the recommendation: +13.5s on a workbench push, +4.9s on `npm run all`, and
one deleted exemption.** No new dependency. No change to the a11y tier's home.

---

## 8. Scope: what this document changed

Nothing but this file. The one-line `tabindex` additions at `src/ui/render-dom.ts:206` and `:296`,
the `npm run all` substitution in `hooks/pre-push`, the `test:smoke` → `test:browser` promotion in
`workbench/package.json`, and the exemption deletion in `test/gate-reachability.test.ts` are all
named here and none is landed. The probes in §9 were written outside the repo working tree and are
not committed.

---

## 9. Measurement appendix

**Environment.** This worktree at HEAD, Node v24.21.0, Chromium 131.0.6778.204 resolved from
`book/node_modules`, axe-core 4.12.1 resolved from the repo-root `node_modules`. All three
`node_modules` are symlinks to the main checkout. Host 1-minute load average 8.2 during the tier
timings; `test:browser` and `test:a11y` were timed in the same window, so the gap between them is
not contention.

**Baseline, measured rather than quoted.**

| Command | Wall clock | Tests |
|---|---|---|
| `npm run check` | 2.9s | — |
| `npm run check:parity` | 0.6s | 0 violations over 26 capabilities |
| `npm run test` | 10.8s | 1097 pass |
| `npm run build` | 0.4s | 87 source inputs |
| `npm run test:smoke` | 2.9s | 3 pass |
| `npm run test:browser` | 7.8s | 115 pass |
| `npm run test:a11y` | 122.5s | 112 pass |
| **`npm run all`** | **22.7s** | — |

**a11y tier, per file** (run individually; the tier's 122.5s is lower than the sum because
`node --test` runs files concurrently):

| File | Wall clock | Tests |
|---|---|---|
| `axe.test.mjs` | 4.7s | 16 |
| `keyboard.test.mjs` | 52.5s | 23 |
| `paths.test.mjs` | 137.2s | 52 |
| `wcag-f6.test.mjs` | 28.8s | 21 |

**Probes** (throwaway, run from `workbench/`, written to the session scratchpad and not committed).
Each starts the repo's own fixture server and browser through `test/browser/harness.mjs`, so it
measures the same served tree the tiers do.

1. `.scroll` census on both pages — container count, `tabindex`, overflow — at 320 / 800 / 1280 /
   1600px. Produced the tables in §1.3 and §5.
2. axe over `index.html`'s loaded state at three viewports, with and without
   `#system-browser-detail` opened, via `loadAxeSource` / `runAxe` from
   `test/browser/a11y/axe.mjs`. Produced the verdict column in §5.
3. Ancestor-chain visibility walk from `#sections`, which identified the closed `<details>` as the
   third uncontrolled variable.
4. A 400-press tab walk at 320px with the disclosure open, counting stops that land on a `.scroll`
   container. Produced the false-positive finding in §2.2 and §5.

**A note on the probes, since this document is about instruments.** Probe 1's first run reported
zero containers on `index.html` and I nearly wrote that down. The cause was the probe:
`window.mage.load` takes YAML **text**, not an example id (`test/browser/a11y/axe.test.mjs:121-123`),
so the load silently succeeded over an empty system and the page correctly rendered "No model system
is loaded." An absence is the expected output of asking the wrong question, and it took a second
look at how the real suite drives that state to tell the two apart.

---

## 10. The principle

A gate's job is not to run. It is to return a verdict somebody can act on, and a verdict is
actionable only when its answer does not depend on where it was produced.

The scroll incident is the purest form of this session's governing defect because nothing about it
was broken. The page was wrong and the local run was green and **both readings were correct**. axe
asked "does a region that overflows lack a tab stop", and at a 1280px window no region overflowed,
so the honest answer was no. The question the engineer needed answered was "can a keyboard user
reach the columns past the fold", and that question has one answer, at every width, which nobody
was asking.

So the test to apply to a check is not "is it thorough" or "is it fast". It is: **name every
environment variable this verdict depends on, and say which of them the test controls.** A variable
you can name and control gives a gate like the reflow probe, which derives its widths from the
stylesheet and goes red for a reason. A variable you cannot name gives a gate like this one, which
was green for 0 of 10 instances on a wide screen and red for 1 of 10 on a narrow one, and told
nobody that the number was ten.

And when the list of variables comes back empty — when the claim is just a fact about the markup —
the check does not belong in a browser at all, however much the symptom first showed up there.
