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

The transcript may be lighter for slides whose delivery is naturally variable, interactive, or already
obvious from the crib. Do not invent verbatim prose merely to fill the structure.

For activities, the estimated time should include the activity rather than only the instructor's setup. Use
the crib to preserve instructions, expected responses or failure modes, and the intended synthesis where
those are important to successful delivery.

Speaker notes remain presenter-facing. Audience-essential information must still appear in the visible or
otherwise accessible presentation artifact rather than existing only below the `=====` delimiter.

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

## Audit the deck

Review the deck as a sequence, not only as individual slides.

### Argument test

Read the slides in order at thumbnail scale.
Does the visual sequence realize the talk's movements?

### Titles-only test

Read only the slide titles.
Is there an intelligible progression of questions and claims?

Not every title must be an assertion, but a deck whose titles read only "Background / Method / Results / Discussion" is hiding most of its argument.

### Continuity test

Are recurring concepts named and represented consistently?
Does the audience have to relearn diagrams unnecessarily?

### Build test

Does each build add meaning?
Does the final static state still work?

### Density test

Does density vary according to the audience's task, or is every slide forced toward the same amount of content?

### Transition test

Are major changes of frame visible where useful?
Are there divider slides that do no work?

### Template test

Does anything exist primarily because the template had space for it?

### Distribution test

Does the exported artifact preserve essential evidence, citations, accessibility, and final visual states?

Repair sequence-level problems before polishing individual slides.
