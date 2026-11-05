# House style — the six interactive laboratories

The course author's editorial direction for `course/interactive/<lab>/`, transcribed into the form a
lab author and a dispatched agent both need. Its companion is [`README.md`](README.md), which covers
the stylesheet's mechanics: what belongs in the shared core, how the sync inlines it, which gates
hold it. This file covers what the pages must **say and show**. Read both before changing a lab.

The governing principle, in the author's words:

> **Teach the model, specify the experiment, then operate the apparatus.**

His diagnosis is that the pages failed to distinguish three things and gave them equal prominence:
the model a student must understand, the experiment a student must perform, and the simulation
machinery that produces the results. The correct editorial direction is **substantial
simplification, not further explanation**.

---

## §0 · PRECEDENCE — the dashboard layout is WITHDRAWN

**Read this before anything else in this file, and before any redesign.** The author made a first
pass that proposed a dashboard-first layout, then disagreed with himself and reversed it. **The
reversal governs completely.** It is recorded here so nobody re-derives the layout he withdrew.

> *"Disagree on point 2. The right structure is the background / context / etc. on top, and the
> simulation/etc. on bottom. Think about how lab handouts are structured."*
>
> *"I was optimizing for an interactive dashboard rather than an instructional laboratory. The
> correct analogy is **a laboratory handout with an embedded experimental apparatus**, not a
> simulator with some introductory documentation."*

| His first pass said | **FINAL — do this** |
|---|---|
| Put the apparatus on the first screen. *"Students must scroll through several screens before reaching the principal results. This is backwards."* | **The apparatus goes BELOW the instructional material.** Sections 1–4 precede it. Students should understand what they are manipulating before they meet the controls. *"This is a deliberate instructional sequence, not an unfortunate amount of scrolling."* |
| *"At 1440 pixels, the student should see the model, controls, and at least the primary results without substantial scrolling."* | **WITHDRAWN.** *"I withdraw the recommendation that controls and results must appear on the first screen. The first screen should establish the engineering problem and begin the background."* |
| Cap the background at 150–250 words | **400–600 words is fine** where students meet unfamiliar concepts. *"I would not impose my earlier 150–250-word limit rigidly."* |
| The first-screen mock-up: TITLE → diagram → PARAMETERS \| RESULTS | **Superseded** by the handout order in §1. |

> **Explicit instruction:** *"Do not move the apparatus above the instructional material merely to
> reduce scrolling. Scrolling is acceptable when it reflects the progression of a laboratory
> exercise."*

**What the reversal does NOT change.** *"That changes the information hierarchy, but not the need
for simplification."* Every complexity reduction below stands in full.

**And the real diagnosis survives intact:**

> *"The mistake in the current Release Factory is not that the simulation appears below the
> background. It is that **the background is excessively dense, the model diagram is tiny, and the
> parameter table tries to document the entire simulator.**"*

A note for whoever reads the stylesheet next: the shared core was engineered to the withdrawn
first-screen budget, and the opening figure was starved as a direct consequence. The chain and the
measurement are recorded in [`instrument-core.css`](instrument-core.css)'s lab-shell header and in
§3 below.

---

## §1 · The mandatory section order

| | Section | Purpose | Presentation |
|---|---|---|---|
| 1 | **Engineering problem** | What question are we investigating, and why? | Short motivating scenario |
| 2 | **Background** | What technical knowledge does the student need? | Explanatory prose, figures, equations |
| 3 | **Model** | What system is represented, under which assumptions? | Large diagram, 1–2 equations, parameter table |
| 4 | **Experiment** | What should the student predict and vary? | Numbered procedure |
| 5 | **Interactive apparatus** | Execute the experiment | Controls, simulation, results |
| 6 | **Interpretation** | What do the observations establish? | Questions and comparison prompts |
| 7 | **Further investigation** | Optional extensions and technical detail | Collapsed sections |

*"This is a conventional engineering laboratory sequence, adapted to a browser."*

## §2 · The complexity budget

Default maxima, not absolute limits.

| Element | Default maximum |
|---|---|
| Principal engineering question | **1** |
| Models or equations explicitly taught | **1–2** |
| Adjustable engineering parameters | **4–5** |
| Primary output measurements | **2–3** |
| Main visualization | **1** |
| Guided experiments | **2–3** |
| Secondary visualization | 1, only if necessary |
| **The Background SECTION** (§1 row 2) | **400–600 words** (per §0) |
| Prose before the first control | **no cap — §1 mandates four sections there** (see below) |
| Prose in the primary interface, all of it | **no hard cap — but reference material belongs behind `<details>`** |
| Expected exercise duration | 5–10 minutes |

> *"This should be a default design constraint, not an absolute mathematical limit. A model might
> require additional internal parameters, but those should not automatically become user controls."*

### The 400–600 applies to the Background SECTION. "Words before the first control" is incoherent with §1.

Corrected again, hours after the correction below, because the Release Factory rebuild found a
contradiction that the first correction preserved. **§1 mandates four sections ahead of the
apparatus** — engineering problem, background, model, numbered procedure — so "words before the first
control" necessarily counts the model tables and the whole experimental procedure, and can only reach
400–600 if the model and the experiment are wordless. The two rules cannot both be satisfied, and the
proxy is the one that is wrong.

The evidence is the rebuild itself: its Background section landed at **405 words, in budget**, while
its words-before-the-first-control went **up** to 1,038 from 557, entirely because §1's sections 3 and
4 now exist and sit where §1 puts them. In the agent's words: *"I optimised the section, not the
proxy, and I am flagging the proxy rather than quietly gaming it."* Both wave-1 rebuilds converged on
measuring the Background section independently.

**So: the Background section is 400–600 words. Nothing caps the prose ahead of the apparatus** —
placement governs it instead, per the rule below. A page that moves its model or procedure *after* the
controls to make a word count go down has broken §1 to satisfy a proxy, which is the opposite of what
the budget is for.

### The background-words column measures PLACEMENT, not volume

Corrected 261105, after the Storage Cost rebuild re-measured it and the 261105 budget audit's figures
for this column did not reproduce. The audit defines the column as *prose in `<main>` before the first
control, excluding `<details>`* and then reports numbers that track the whole of `<main>` instead —
so its claim that *"every laboratory is 2× to 4× over on background words"* is an artifact of the
measurement. Measured by the stated rule, **all six laboratories were already inside 400–600** when
the audit ran, ReDoS highest at 635:

| Laboratory | audit's figure | before first control | whole `<main>` |
|---|---|---|---|
| Storage Cost | 2,210 | **474** | 2,409 |
| Release Factory | 1,333 | **536** | 1,522 |
| N+1 | 1,247 | **480** | 1,607 |
| Architecture Workbench | 2,493 | **555** | 2,461 |
| Performance Knee | 1,154 | **437** | 1,384 |
| ReDoS | 2,248 | **635** | 2,494 |

**The defect the audit found is real; the number it found it through was wrong.** Storage Cost carried
2,409 words of prose in the primary interface with **zero** collapsed sections, which is exactly the
reference-material-in-the-foreground problem §5, §7 and §9 describe. So the rule to apply is a
placement rule: the background a student reads before touching anything stays inside 400–600, and
everything that is reference rather than prerequisite goes behind `<details>`. Do not cut prose to hit
a whole-page word count — relocate it, and report what moved versus what was deleted.

**When a budget column and the artifact disagree, re-measure before acting.** Every stage-B agent is
told to verify the audit's row for its own lab; two of the three columns checked so far did not
reproduce. The output column undercounts too — it misses `.big .cell`, so Storage Cost reported ten
named quantities where the audit recorded eight.

The sentence that decides the hard cases:

> *"The simulator may internally contain a sophisticated stochastic model. That complexity is an
> implementation detail unless exposing it serves a specific learning objective. **Do not equate
> simulation fidelity with instructional quality.**"*

And: *"The fact that these variables are meaningful does not establish that they belong in the
student interface."* · *"Simplifying the student interface does not require simplifying the internal
engine."*

**Preserve the simulation engines and their tests.** This is a presentation change.

## §3 · Width — use the desktop

> *"The full width is not being used."* · *"That is inappropriate for a desktop laboratory
> containing tables, diagrams, and charts."*

The requirement: **a wide laboratory layout, not a wide article layout.** A reading column suits
prose; it does not suit a page carrying a model diagram, a parameter table and charts side by side.

**No horizontal overflow at any supported width.** Test at 1280, 1440 and 1920 px, at 100% and 125%
browser zoom, and take screenshots at each — *"a technically correct interface can still fail these
criteria."*

**Where the width actually goes, measured rather than assumed** (headless Chromium, all six labs,
261105). Record it here so the next author does not re-diagnose it:

- **No page container was ever capped near a reading-column width.** The pages run full-viewport at
  1280 and 1440. The only page-level cap sat at 1680px and bound only above 1728px; it is now
  1920px, which recovered 240px of content width at 1920×1080.
- **There is one surface, not two.** MkDocs copies each lab through untransformed and serves it at
  `/teach/interactive/<slug>/`; the published bytes are identical to the source. No parent theme
  container reaches a lab. A fix in the shared core therefore lands on both surfaces at once.
- **The figure's height ceiling was the width defect.** `max-height` on an SVG with a `viewBox`
  letterboxes the drawing instead of cropping it, so every pixel of column width past the ceiling
  became empty margin. The ceiling is gone.
- **What remains is allocation, not constraint.** The opening band gives the figure roughly a
  quarter of the row and the parameter table nearly half. The figure needs about 660px of column
  before its authored labels render at full size. That is §4's requirement and it is reached by
  restructuring the opening, not by another CSS cap.

## §4 · The figure — the worst single defect

> *"The first screenshot's Figure 1 is almost unreadable. This is especially unfortunate because the
> diagram is supposed to establish the model that the students will manipulate."*

The current split gives roughly a quarter of the content width to the figure, a quarter to
assumptions and half to the parameter table. *"That is the wrong hierarchy."*

**The overview figure takes at least 70–80% of the content width, preferably its own row.**

| Requirement | |
|---|---|
| Format | **SVG** where practical |
| Labels | Readable at normal browser zoom — **no 10–11px text** |
| Content | The model's direction and relevant quantities explicit |
| Not in the figure | Explanatory paragraphs embedded inside the diagram |
| Consistency | Same visual encodings across all six laboratories |
| Scope | **The complete internal event-state machine does not belong in the opening figure** — that is technical documentation |

**The acceptance test to actually apply:**

> *"Can a student understand the model from the figure while standing several feet from a projected
> screen? If not, the figure is too complicated or too small."*

And: *"Do not make students enlarge a figure to understand its labels."*

A practical corollary from the measurement in §3: these diagrams carry labels authored at about
11.5px, and an SVG scaled to a 317px column renders them near 6px. Check the **render scale**, not
the box width — a figure can sit in a wide box and still draw small.

## §5 · The model section — three artifacts, inputs apart from outputs

> *"Figure 1: Model overview · Table 1: Model parameters · Table 2: Observed quantities. **These
> should be distinct. Inputs and outputs are different concepts.**"*

**Table 1 holds only the parameters students manipulate**, not the simulator's full parameter set.
**Table 2 gives students the vocabulary for interpreting the simulation before they run it.**

**Kill the parameter encyclopedia.** The six-column table *"explains parameter meanings, values,
defaults, and consequences. That information is useful as documentation, but not as the principal
interface."* Students learn a parameter's meaning from a concise label, a unit, and one sentence of
contextual help on the control. The full table moves to a collapsed **Model reference**.

**Separate assumptions from limitations.** He names the mixture as a current defect:

> *"Assumptions needed to predict behavior belong **beside the model**. Limitations concerning
> external validity, industrial calibration, and implementation fidelity belong in **a short
> qualification or the reference section**. The current Release Factory mixes them, making the
> introductory material more intimidating than necessary."*

**One visible disclaimer, and no more:** `Illustrative simulation; not calibrated to an industrial
organization.` The equations implemented, the fixed parameters, the simplifications, the randomness
and seed behaviour, and what the simulation does *not* establish all go in a collapsible section —
*"concise enough that a technically sophisticated student can audit the model without reading the
simulator's source code."*

## §6 · The procedure — six fields per experiment

**Keep Predict → Run → Explain.** It is the strongest aspect of the existing Release Factory. Put it
in a numbered laboratory procedure. Each experiment specifies all six fields:

1. The baseline configuration
2. The parameter to change
3. The quantities held constant
4. The prediction students should make
5. The measurements to compare
6. The engineering question the comparison answers

> *"This matters because **students should not be randomly manipulating controls.**"*
> *"The apparatus can be sophisticated. The experiment should be simple."*

**His worked example, which is the template:**

> **Experiment 1: Testing and delivery.** Baseline: standard testing, required admission, immediate
> release. Change: test depth from Standard to Thorough. Hold constant: arrival rate, admission
> policy, release strategy. Predict: what happens to lead time? to defective releases? Run both
> configurations. Explain: under what conditions would the additional testing be justified?

**Two or three guided experiments, not eleven preset cards.** *"Do not put eleven competing entry
points in front of students."* The rest moves to an optional **Explore further** section.

## §7 · Results — measurements, not an analyst's dashboard

**One main visualization and two or three numerical results.** *"Do not display every quantity
merely because the simulator computes it."*

**Choose the visualization by the experiment's learning objective**, not by what the engine emits. A
before/after table can beat a time series for a test-depth comparison; a plot of exposed requests
can be right for a release-strategy comparison.

One technical requirement that matters:

> *"If the stochastic model produces variable outcomes, the interface should distinguish a single
> simulated run from an expected result. Common random seeds improve comparisons, but **they do not
> eliminate sampling variability.**"*

Say so in the model reference.

## §8 · Typography and visual hierarchy

> *"The current interface has a pleasant technical aesthetic, but it is too text-heavy."*

**Retain the visual identity; change the information hierarchy.**

| Element | Desktop size |
|---|---|
| Laboratory title | 28–34 px |
| Engineering question | 20–24 px |
| Section heading | 18–20 px |
| Control label | 16–18 px |
| Body text | 15–17 px |
| Chart labels | **at least 13–14 px** |
| Footnotes | 13–14 px |

> *"Avoid using 10–11 px text to fit more material. **If the material does not fit, remove or
> relocate it.**"*

**What is currently wrong:** many small uppercase headings · repeated bordered cards · dense
paragraphs · tables with too many columns · very small diagrams · large quantities of explanatory
text above the controls · numerous secondary controls competing with the principal experiment.

**Prefer:** one large model figure · one compact control panel · one dominant result visualization ·
one short experimental procedure · collapsed reference material.

**Avoid three-column layouts for dense prose.** *"Use the available width for the figure and
experiment, not for additional paragraphs."* Width goes to the apparatus and the diagram; prose
keeps a readable measure.

## §9 · Language

> *"The page should not continually explain its epistemological status. State the assumptions once,
> clearly, and let the students experiment."*

His examples from the current pages, all to go:

- *"The decision is whether the organisation is producing valuable or correct software."*
- *"No figure here measures any real organisation."*
- *"Read each comparison as the consequence of a stated model — and argue with the model."*

*"These statements are defensible, but they are not necessary in the primary interface."* Also out
of the primary interface: the extended defence of the simulation's limitations, historical DORA
terminology, and event-ledger semantics — *"largely reference material."*

**What the background SHOULD teach**, using his Release Factory list as the model for the others:
why a release pipeline has multiple stages · how testing differs from admission enforcement · why
stronger testing can increase processing time · how staged release affects defect exposure · why
delivery performance and software correctness are distinct measurements. *"Those are genuine
prerequisites."*

> *"The student needs enough background to reason about the experiment, not enough to audit every
> implementation decision before beginning."*

## §10 · One relationship per laboratory

The author's suggested reductions, offered with an explicit caveat:

> *"These are **suggested** reductions, not claims that the existing implementations already expose
> exactly these parameters."*

| Laboratory | Principal relationship | Suggested adjustable parameters |
|---|---|---|
| Release Factory | Release policy versus delivery and exposure | Arrival rate, test depth, admission, release strategy |
| Storage Cost | Representation versus duplication and storage footprint | Entity count, relationships, duplication, payload size |
| N+1 | ORM loading strategy versus query count | Parent count, loading strategy, batch size |
| Architecture Workbench | Architecture choice versus expected change cost | Change frequency, coupling, implementation cost, validation cost |
| Performance Knee | Arrival rate versus queueing delay | Arrival rate, service capacity, variability |
| ReDoS | Input structure versus matching cost | Input length, regex/input family, matching strategy |

**The rule binds; the table only suggests.** *"Each laboratory should make **one relationship
inspectable**."* A student must be able to answer: what does this model represent · which parameter
did I change · what did I predict · what happened · what engineering decision does that support.
*"If they cannot answer those questions, the interface is doing too much."*

Where a lab's real parameters differ from the row above, report the difference. Do not bend the lab
to match the table.

## §11 · Release Factory — the worked case

**Narrow the question** from *"How do the engineer's release policies affect delivery performance and
the consequences of defects?"* to:

> **How do testing and release policies trade delivery speed against defect exposure?**

| | |
|---|---|
| **Four controls only** | arrival rate · test depth · admission policy · release strategy |
| **Fix** | deployment batch size at 1 |
| **Move** | simulation speed beside Run/Pause — *"simulation speed is not an engineering parameter"* |
| **Remove** | the exact arrival-rate slider, redundant with Low/Medium/High for an introductory exercise — keep one or the other |
| **Presets** | eleven cards become **three guided experiments** (testing · enforcement · exposure) |
| **Principal outputs** | lead time for changes · defective releases reaching production · user exposure to defects |
| **Secondary panel** | deployment frequency, restoration time. *"The full Four Keys analysis is interesting, but it is too much for this exercise"* |
| **To advanced sections** | the defect ledger and the capacity sweep |
| **Enlarge** | the pipeline diagram, substantially |
| **Delete from the opening screen** | the six-column parameter table |

**The simulation must still distinguish all six events internally** — defect introduced · detected by
testing · change blocked by policy · defect reaching production · detected after deployment · service
restored. *"Those distinctions are important for simulation correctness. But students do not need a
six-event ledger on the primary screen."*

**His control shape:**

```
CHANGE ARRIVAL RATE   [ Low ] [ Medium ] [ High ]
TEST DEPTH            [ Smoke ] [ Standard ] [ Thorough ]
ADMISSION POLICY      [ Advisory ] [ Required ]
RELEASE STRATEGY      [ Immediate ] [ Canary ]
```

One sentence per control saying what it changes.

> *"**Do not merely hide the existing interface behind more accordions.** Reconstruct the primary
> experience around the experiment."*

## §12 · Acceptance criteria

**Model correctness — behaviour must be PRESERVED.** Known analytical relationships produce the
expected outputs · parameter changes affect the intended quantities · Reset restores the default
state · fixed seeds produce reproducible comparisons where promised · invalid parameter combinations
are handled.

**Interface.** Controls carry readable labels and units · results update correctly · **no horizontal
overflow at supported widths** · charts readable · keyboard interaction works · focus visible ·
**results not communicated by colour alone** · screen readers can identify controls and results.

**Instructional usability.** A student identifies the model within 30 seconds · begins the experiment
within one minute · finds the primary result without searching · meets no more than three guided
comparisons · explains the result without reading the implementation documentation.

> *"I would also have the agent take screenshots at 1280, 1440, and 1920 pixels and **inspect them
> visually**. A technically correct interface can still fail these criteria."*

### Every laboratory pins the house order in its own suite

Added 261105, generalizing the control the Storage Cost rebuild invented rather than leaving one lab
holding it. A reconstructed page satisfies the section order on the day it lands and nothing stops the
next edit dissolving it, so each lab's own test file asserts, **on the shipped bytes**:

- **The section anchors, in house order, with the apparatus after the procedure.** The regression this
  exists to catch has a name: *"just move the controls up to reduce scrolling."* That edit is exactly
  what §0 records the author withdrawing, it looks like an improvement to anyone who has not read §0,
  and no other gate sees it.
- **The budget columns the page claims** — the control count, the measurement count, one chart above
  the collapsed material.
- **The inverse, which is the half worth copying: every relocated control is still ON the page.**
  Moving a control behind `<details>` is presentation; deleting one is a model change. Without this
  assertion the two are indistinguishable in a diff, and the budget rewards the wrong one.
- **Each guided experiment specifies all six §6 fields** and offers a baseline to load.

A test is the only form in which a style rule survives the agent that applied it. The style guide aims;
the suite holds.

---

## As-built — what has landed, and what has not

Status, not style. The rules above are the author's; this section records how far the pages have
been brought to them, so a reader can tell a requirement from a finished job.

| | State |
|---|---|
| §3 page-level width | **Done.** The core's page cap moved 1680px → 1920px; no lab overflows horizontally at 1280 / 1440 / 1920, at 100% or 125% zoom. |
| §4 figure height ceiling | **Done.** The fixed `max-height` ceilings on `.lab-figure svg` are removed; a figure now scales with its column. |
| §4 figure share of the row | **Open.** The opening band still gives the figure about a quarter of the row. Reaching 70–80% means restructuring the opening, which §5's removal of the parameter table from the primary interface is what makes room for. |
| §1 section order, §2 budget, §5–§7, §9–§11 | **Open**, per lab. |

A reminder that outlives this table: **the shared stylesheet is shared.** Six labs read
[`instrument-core.css`](instrument-core.css), the sync inlines it into all six, and a packaging gate
holds the copies byte-equal. Change the core, run the sync, and expect to have changed six pages.
