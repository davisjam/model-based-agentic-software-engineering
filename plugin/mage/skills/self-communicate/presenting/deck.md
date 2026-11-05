# deck.md — realize the talk as a visual sequence

This is an **agent-facing** resource for designing a slide deck after the talk's intellectual structure is known.

A **talk** is the argument, explanation, activity, and temporal experience intended for the audience.
A **deck** is the persistent visual artifact used to realize part of that talk.
A **slide** is the deck's atomic visual unit.

Keep these objects distinct.
A good-looking deck can realize a bad talk, and a strong talk can have a poor deck.

This guidance draws on Michael Alley's assertion–evidence approach, Richard Mayer's multimedia-learning principles, Edward Tufte's information-design discipline, and Mike Morrison's attention to real acquisition conditions.
The deck level adds a concern none of those individual-slide rules captures alone: **continuity across time**.

## Map the talk onto slides

Start from the established movements and presentation moves in `talk.md`.

For each portion of the talk, ask:

- Does the audience need to see something?
- What should remain visible while the speaker reasons?
- Is there evidence the audience should inspect?
- Is a visual relationship easier to understand than a verbal description?
- Would a question or activity benefit from a persistent prompt?

Do not create one slide mechanically for every outline item.
A presentation move may need no slide, one slide, or a sequence.

The deck supports the talk; it does not determine its granularity.

### Distinguish discovery, practice, and transfer

An exercise should have one of three primary instructional purposes, and the purpose decides where it goes.

| Purpose | Placement | Student work |
|---|---|---|
| Discovery | Before the complete explanation | Construct or revise an idea |
| Practice | After explanation | Apply the newly established method |
| Transfer | After one or more worked examples | Apply the method under changed conditions |

A discovery exercise may ask students to identify failure modes before receiving a completed FMEA.
A practice exercise may ask them to complete another FMEA row once the method has been demonstrated.
A transfer exercise may ask them to apply failure analysis to an unfamiliar system.

Do not move every exercise earlier merely to satisfy a problem-first preference.
Match each placement to the intellectual work the exercise is meant to do.

If an exercise asks students to reproduce an answer already on screen, either move it earlier or change
the problem enough to require genuine application.

## Preserve visual continuity

The audience has visual memory.
Use it.

- Stable concept → stable name.
- Stable object → stable visual representation.
- Preserve spatial position where doing so helps comparison.
- Reuse and modify an established figure rather than unnecessarily redrawing it.
- Highlight the changed part.
- Keep established labels stable.

When a diagram evolves from three components to four, prefer adding the fourth component to the established diagram over presenting an unrelated new drawing with all four.
The audience should spend its attention on the new idea, not on reconstructing what stayed the same.

This is the visual analogue of progressive density: establish a representation once, then make it do more work.

## Preserve continuity of the investigation

Visual continuity should carry continuity of reasoning.

When a lecture uses a running system or problem, preserve the audience's knowledge of that system across movements.

Before introducing a new concept, name what has changed:

- a requirement;
- an assumption;
- an observation;
- a failure;
- a proposed design;
- an engineering obligation.

Prefer modifying an established system diagram over introducing an unrelated new diagram when the system itself has not changed.

For example, a reservation-service diagram may first show application components, then reveal database access, then expose a concurrency failure, and finally annotate the enforcement mechanism.

The audience should recognize the system while watching its engineering interpretation become more sophisticated.

A new concept should not force the audience to reconstruct the whole problem, unless that reconstruction is itself the lesson.

## Use progressive disclosure when it reduces cognitive load

Mayer's **segmenting** and **temporal contiguity** principles support revealing complex material in stages when the audience cannot usefully process the final state all at once.

A useful build:

- preserves the established frame;
- introduces one meaningful addition or change;
- synchronizes that change with its explanation;
- culminates in a final state that remains intelligible.

An animation that merely makes elements fly, fade, or bounce is decoration.
Motion consumes attention and must earn it.

When the deck will be distributed as PDF, ensure that essential information is available in the static artifact.
Do not make understanding depend on an animation that disappears on export.

## Treat interactive demonstrations as experiments

An interactive simulation should support reasoning about a model, not animate a conclusion.

For a teaching demonstration, establish:

1. **Model.** What system or relationship does it represent?
2. **Assumptions.** What has been simplified or excluded?
3. **Prediction.** What should happen when a parameter changes?
4. **Experiment.** Which parameter changes, and which stay fixed?
5. **Observation.** What did the simulation produce?
6. **Interpretation.** Does the result support the prediction?
7. **Judgment.** What engineering decision follows?

For example, a performance-knee simulator lets students vary arrival rate while holding service capacity fixed.
The class predicts how response time will change, observes the simulated queue, and compares the result against the analytical model.

Such a simulation does not establish the performance of an actual service.
It supplies evidence about the behavior of the specified queueing model.
Say so.

The slide that introduces the demonstration should carry the engineering question and the experiment's essential parameters.
It should not reproduce the simulator's interface.

The speaker notes should preserve the experiment sequence, the expected observations, the important limitations, and a fallback if the demonstration cannot run.

Do not add an interactive demonstration merely because one exists.
It should replace or strengthen a specific instructional move.

## Let visual rhythm follow the argument

Not every slide should have the same density or representation.

A deck may legitimately move among:

- evidence-rich technical figures;
- sparse assertions;
- photographs;
- diagrams;
- comparisons;
- quantitative results;
- code;
- activity prompts;
- synthesis models.

Variation is useful when the **content changes what representation is appropriate**.
Variation added merely to make the deck "interesting" is noise.

Conversely, a rigid template can make different intellectual jobs look artificially identical.
Consistency should reduce orientation cost, not erase meaningful differences.

## Manage information density across the sequence

Low density is not automatically good.
High density is not automatically bad.

Match density to the audience's task.

- Orientation and transition slides may be sparse.
- Evidence slides may contain rich inspectable material.
- A synthesis slide may legitimately contain substantial structure that the audience has already learned piece by piece.
- A new complex diagram may need several builds before the final dense state becomes useful.

Tufte's work is especially important here: reducing a serious technical argument to shallow bullets can destroy information rather than clarify it.

**Reduce cognitive waste, not evidence.**

## Establish vocabulary and visual identity

Name important concepts once and reuse the canonical names.

Avoid casual synonyms that force the audience to ask whether two labels denote the same thing.
Where useful, give recurring concepts a stable graphical treatment—position, shape, icon, or other restrained visual cue.

Do not create an elaborate visual language merely for branding.
A visual identity earns itself when it reduces the cost of recognizing an established concept.

## Use movement boundaries deliberately

A divider or transition slide should mark a meaningful change of frame.

Use one when the audience benefits from recognizing:

- a new major question;
- a shift from diagnosis to construction;
- a shift from evidence to implications;
- a break or activity boundary;
- a substantial change in scale or abstraction.

Do not insert section dividers mechanically because every outline heading has one.

A useful transition answers, explicitly or implicitly:

> Why are we talking about this next?

### Section dividers should form a compressed argument

When visible section dividers are used, read only their titles and
commentaries in sequence. They should provide a coherent account of the
talk's intellectual progression.

A section divider should normally make clear both:

1. the question, claim, or intellectual job of the movement beginning now;
2. why that movement follows from what the audience has already established.

Prefer a sequence such as:

    What is X?
    How do we choose among X?
    Where do the alternatives come from?
    How much can we know before acting?

over a mixture such as:

    What is X?
    Choosing X
    Patterns
    Analysis

The first sequence exposes the reasoning that connects the movements. The
second merely names topics.

A conceptual opener is not automatically the first section. An opening slide
may establish the premise or problem that motivates the entire talk before
the first named movement begins. When using numbered visible sections, verify
that the audience actually encounters Section 1 before Section 2 and that the
opener has not accidentally been asked to serve both roles.

## Treat repeated slides as representations, not pages

Slides need not be unique pages in the document sense.

Reusing a prior slide can be powerful when the talk returns to an earlier question or model.
A repeated slide can:

- close a loop;
- expose how the audience's interpretation has changed;
- add a new annotation;
- compare before and after;
- recover an established frame after a digression.

Prefer intentional recurrence over a near-duplicate slide that forces needless reorientation.

## Represent the talk's movements using native deck structure

When the presentation format provides native structural organization, use it rather than representing the
outline only visually.

In PowerPoint / Microsoft 365, use **Sections** to represent the major movements of the talk or module.
Give each section a short, meaningful name that describes its intellectual role or subject.

The section structure should correspond to the actual organization of the talk. Do not create sections
merely to partition an arbitrary number of slides.

For example:

    Opening
    What changed?
    Engineering under abundant implementation
    Modeling
    Alignment
    Synthesis

Prefer meaningful names over mechanical labels such as:

    Section 1
    Part 2
    Slides 12–24

Native sections complement visible movement boundaries; they do not require a section-divider slide at
every boundary. Add a visible divider only when the audience benefits from perceiving the transition.

Native structure improves navigation, editing, reuse, presenter orientation, and machine interpretation of
the deck.

## Speaker notes have a different audience

Notes are presenter-facing.

Use them for:

- timing;
- exact phrasing where needed;
- source details;
- anticipated questions;
- reminders about builds;
- activity instructions;
- qualifications that do not belong permanently on screen.

Do not hide audience-essential content in notes.
Do not copy the entire visible slide into notes merely to have notes.

### Use a consistent speaker-notes structure

Speaker notes should preserve the intended performance of the slide without turning the visible slide into
a document.

Use this default structure:

    <estimated time> — *<one-line purpose/message of the slide>*

    - Key point.
    - Key point.
    - Important evidence, qualification, or delivery instruction.

    =====

    Transcript or detailed speaking notes.

    ANIMATE

    Continue after the build.

The first line combines a pacing estimate with the slide's intellectual purpose. Write the time naturally
for humans in Presenter View:

    30 seconds — *Transition from diagnosis to construction.*

    2 minutes — *Establish that cheap fabrication does not eliminate engineering judgment.*

    8 minutes — *Students derive the representations an autonomous coding agent would need.*

The italicized statement is not merely a description of the slide's contents. It states what the slide is
intended to accomplish in the talk. This makes the notes useful for auditing whether the slide earns its
place.

The `*…*` marks native italics in the delivered notes, not literal characters. Realize the emphasis using
the presentation format's rich-text support; the Markdown markers are a source convention, not text to
place in PowerPoint speaker notes. Use native bold or italics elsewhere in notes the same way rather than
emitting Markdown markers as text.

The bullets are the presenter's crib. They should capture the points that must survive delivery: important
claims, evidence, qualifications, transitions, activity instructions, or other reminders. They need not
reproduce the transcript.

The `=====` delimiter separates presenter-facing summary material from the fuller performance script.

Below the delimiter, preserve a transcript or sufficiently detailed speaking notes when doing so is useful.
Use paragraph breaks to mark meaningful speaking beats rather than storing the script as one wall of text.

Place `ANIMATE` on its own line at the exact point where the presenter should advance a build:

    Explain the established state.

    ANIMATE

    Explain the newly revealed element.

This makes the relationship between speech and progressive disclosure explicit and recoverable. Do not add
`ANIMATE` markers for transitions between ordinary slides — they represent builds within the current slide.

`ANIMATE` has a precise meaning: it marks the speaking point where an animation actually present on the
slide should advance. Do not emit an `ANIMATE` marker merely because a staged reveal would be
rhetorically useful — if the slide contains no corresponding animation, the notes contain no `ANIMATE`
marker.

Animation and notes should agree by construction. When authoring both, add an `ANIMATE` marker only after
the corresponding build exists, placed where that build should fire. When writing notes for an existing
deck without changing its animation, inspect the actual animation sequence first and mark only builds that
really exist.

The transcript may be lighter for slides whose delivery is naturally variable, interactive, or already
obvious from the crib. Do not invent verbatim prose merely to fill the structure.

For activities, the estimated time should include the activity rather than only the instructor's setup. Use
the crib to preserve instructions, expected responses or failure modes, and the intended synthesis where
those are important to successful delivery.

Speaker notes remain presenter-facing. Audience-essential information must still appear in the visible or
otherwise accessible presentation artifact rather than existing only below the `=====` delimiter.

### Preserve the instructional sequence in lecture notes

For a substantive teaching slide, the notes should make the intended reasoning recoverable.

Where applicable, identify:

- **Prior belief.** What intuition or assumption does the audience bring?
- **Question.** What should the instructor ask before revealing the answer?
- **Discovery.** What should students learn from the evidence, example, or failed attempt?
- **Transition.** What unresolved question motivates the next slide?

These need not appear as four literal headings on every slide. They should be recoverable from the crib or
the detailed speaking notes.

Example:

    2 minutes — *Show that CI evidence does not itself enforce admission.*

    - Prior belief: failed CI prevents merging
    - Ask: can a developer merge when CI reports failure?
    - Reveal: CI reports failure, but branch protection is absent
    - Discovery: evidence needs an enforcement mechanism
    - Next: how do we control exposure after a change is admitted?

    =====

    Ask whether a failed CI job necessarily prevents merging.
    Allow a few responses before revealing the branch-protection
    configuration.

    ANIMATE

    The checks produce evidence. Branch protection determines
    whether that evidence has authority over admission.

The `ANIMATE` marker must correspond to an animation the slide actually contains, exactly as the format
rules require.

For an exercise, the notes should also give plausible student responses, the evidence the instructor should
reveal, and how the debrief changes the audience's understanding.

Do not script student responses as though they are guaranteed. Preserve alternative paths where reasonable.

## Citations and provenance

Technical evidence should retain enough provenance to be trustworthy.

- Cite figures, quotations, external data, and consequential claims.
- Keep citations legible but visually subordinate to the evidence they support.
- Preserve enough bibliographic information that a distributed deck can be traced back to the source.
- Prefer direct source attribution over a final slide containing dozens of orphaned URLs.

When a source is central to the claim, provenance is part of the evidence, not decorative footer material.

## Design for the live deck and the distributed artifact

A live deck and a standalone document have different conditions.
Do not destroy the live presentation by turning every slide into a paper, but recognize that decks are often shared afterward.

For distributed decks:

- export cleanly to PDF;
- preserve links where practical;
- preserve meaningful reading order;
- provide alt text for meaningful visuals where the format supports it;
- avoid essential information that exists only in transient animation;
- retain citations and provenance;
- make major figures interpretable without requiring the exact spoken sentence that accompanied them.

If substantial standalone explanation is required, consider a companion document rather than overloading the slides.

## Keep template and branding subordinate

A template should provide useful consistency:

- predictable title placement;
- stable typography;
- restrained palette;
- consistent margins;
- unobtrusive identity.

Repeated chrome consumes attention.

Avoid:

- large repeated logos;
- decorative footer furniture;
- borders that do not group information;
- ornamental icons;
- backgrounds that reduce contrast;
- layouts chosen because the template offers them rather than because the content needs them.

The template serves the representation.
The representation does not serve the template.

## Accessibility and robustness

Design for actual presentation conditions, not the author's monitor.

- Use type legible from the back of the room.
- Maintain sufficient contrast.
- Do not encode meaning by color alone.
- Use direct labels where practical.
- Preserve a meaningful reading order.
- Ensure important distinctions survive imperfect projectors and, where practical, grayscale.
- Provide alt text for meaningful visuals in distributed artifacts.
- Do not rely on animation as the sole carrier of meaning.

Accessibility is not a separate aesthetic.
It is part of whether the deck successfully communicates.

## Audit the timing of questions and answers

A lecture deck is a temporal artifact.
Information can be correct and still appear too early to support the intended learning experience.

For each consequential question or activity, identify:

1. The first point at which the question appears.
2. The knowledge students hold at that point.
3. The point at which students are expected to reason or commit to an answer.
4. The point at which the answer or decisive evidence becomes visible.
5. The subsequent application or revision of the result.

Then check whether the answer has already appeared.

Common failures:

- A completed FMEA table precedes an exercise asking students to construct the same table.
- A fault tree is fully revealed before students are asked to identify its branches.
- A mechanism comparison declares the preferred alternative before students evaluate the alternatives.
- A slide displays a question and its answer at the same time.
- An exercise asks students to recall the preceding explanation rather than apply it to a new situation.

These are not always defects.
A worked example may properly precede a transfer exercise.
The defect occurs when the intended intellectual work has already been performed for the students.

### Prefer staged evidence

For an investigation, consider this sequence:

    QUESTION
       |
       v
    INITIAL EVIDENCE
       |
       v
    STUDENT PREDICTION
       |
       v
    ADDITIONAL EVIDENCE
       |
       v
    REVISED JUDGMENT
       |
       v
    ENGINEERING PRINCIPLE

The stages may occupy several slides or successive builds of one slide.

Do not require an animation for every stage.
Use separate slides when that better preserves the static artifact or simplifies delivery.

The governing rule:

> Students should receive the information they need to reason, but not the conclusion they are being asked
> to construct.

This is a stronger operational requirement than the general recommendation to use progressive disclosure.

## Audit the deck

Review the deck as a sequence, not only as individual slides.

### Argument test

Read the slides in order at thumbnail scale.
Does the visual sequence realize the talk's movements?

### Titles-only test

Read only the slide titles, in order.

First ask whether they form an intelligible sequence.
Then ask whether they form a developing argument or investigation rather than a catalogue of subjects.

A weak sequence can be perfectly well organized:

    Workload characterization
    Latency and throughput
    Little's Law
    Queueing theory
    Profiling
    Tracing

A stronger teaching sequence exposes the questions that connect those concepts:

    Why is the reservation service slow?
    Are 100 requests per second always the same workload?
    Can throughput tell us whether users are waiting?
    Can Little's Law predict response time?
    What happens as demand approaches capacity?
    Where is the actual bottleneck?

The second sequence makes the intellectual dependencies visible.

Neither extreme is the rule.
Do not require every title to be a question — once a conclusion has been established, an assertion title is usually stronger.
Do not require every title to be an assertion either; a deck whose titles read only "Background / Method / Results / Discussion" is hiding most of its argument.

The test is whether the titles reveal how the audience's understanding develops.

Then run the same test on the visible section-divider titles and commentaries.
Those dividers should form a compressed account of the talk's reasoning, not a list of its subject categories.

### Question-timing test

For every consequential question or activity, does the audience get the chance to reason before the deck
shows the answer? Run the full timing audit above; this test is its one-line form.

### Continuity test

Are recurring concepts named and represented consistently?
Does the audience have to relearn diagrams unnecessarily?

### Investigation test

Does the running system or problem survive across movements, with each new concept changing a requirement,
assumption, observation, failure, design, or obligation the audience already holds?

### Build test

Does each build add meaning?
Does the final static state still work?

### Density test

Does density vary according to the audience's task, or is every slide forced toward the same amount of content?

### Rhetorical repetition test

Read several consecutive slides at a time and look for repeated forms of audience-facing explanation.
An individual-slide audit cannot perform this check.

Common patterns:

- every slide ends with a takeaway banner;
- every example is followed by an aphorism;
- every engineering choice is summarized as "Choose X based on Y";
- every technical distinction is phrased as "X is not merely Y";
- every section closes with a generalized statement about engineering judgment;
- the same claim appears in the title, the body, and the footer.

A single aphorism may be fine. Fifteen consecutive aphorisms become tiresome.

Ask whether the repeated form contributes information or merely makes the deck sound uniform.

The form alone does not condemn a statement.
A contrast earns its place when the half it rejects is a belief the audience actually holds: *serializable means equivalent to some serial order, not run one at a time* corrects a misconception most students arrive with.
Flag the form when the rejected half is a straw alternative nobody proposed, or when the comparison on the slide has already made the point.

Prefer variation that arises from the content.
A diagram may stand without a conclusion; a comparison may end with a question; a worked example may end with a numerical result; a mechanism slide may end with a precise qualification; a section may end with a synthesis table.

Do not require every slide to carry a concluding statement.
A consistent visual language does not require a consistent rhetorical formula.

### Transition test

Are major changes of frame visible where useful?
Are there divider slides that do no work?

### Template test

Does anything exist primarily because the template had space for it?

### Distribution test

Does the exported artifact preserve essential evidence, citations, accessibility, and final visual states?

Repair sequence-level problems before polishing individual slides.
