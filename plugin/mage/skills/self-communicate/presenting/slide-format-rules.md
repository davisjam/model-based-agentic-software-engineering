# Slide Format Rules

Mechanical, visual, and accessibility constraints for generated or
revised slide decks.

These rules complement the conceptual guidance in `talk.md`, `deck.md`,
`slide.md`, `presentation-types.md`, and the local style guide. They are
deliberately more prescriptive: where the other resources explain how to
reason about a presentation, this file establishes defaults and
mechanically auditable constraints for realizing it.

Treat violations as defects unless the slide has a deliberate,
defensible reason to depart from the rule.

# Typography

-   **No audience-facing text below 20 pt.**
-   Treat 20 pt as a floor, not a target. Prefer substantially larger
    text for primary content.
-   If content does not fit at 20 pt, shorten it, restructure it, split
    the slide, simplify the representation, or move detail to notes or
    backup material. **Do not solve overcrowding by shrinking the
    type.**
-   Slide titles should normally fit on **one line**.
-   Do not shrink a title merely to preserve an overlong formulation.
    Rewrite it.
-   Use a small, consistent type hierarchy. Avoid gratuitous changes in
    font family, weight, and size.
-   Sentence case is the default unless an established template requires
    otherwise.
-   Use bold, italics, and other typographic emphasis sparingly. If
    everything is emphasized, nothing is.
-   Avoid using typography alone to encode an essential semantic
    distinction.

# Titles

A title should tell the audience what intellectual work the slide is
doing.

-   A slide title should convey the **idea, claim, question, or
    intellectual role of the slide**, not merely name its contents.
-   Use assertion titles by default for slides making technical claims.
-   Use question titles when the audience is meant to reason before the
    answer is supplied.
-   Topic titles are acceptable for genuine orientation, reference,
    activity, or section slides.
-   Avoid generic titles such as `Background`, `Results`,
    `Architecture`, or `Key Takeaways` when a more informative title is
    available.
-   Prefer:
    -   `Implementation capacity is no longer the primary constraint`
    -   `What becomes scarce?`
-   Avoid:
    -   `Implementation Capacity`
    -   `Scarcity`
-   Reusing the same title across a short build sequence is acceptable
    when the evolving visual underneath it is the point.
-   Every slide should also have a meaningful structural title for
    accessibility and navigation. The structural title may be visually
    hidden when the design genuinely requires it, but it should not be
    omitted.

# Layout and visual hierarchy

-   Keep the title in a predictable location across ordinary content
    slides.
-   Give every slide a clear primary visual hierarchy.
-   Make the primary visual, claim, question, or evidence region
    perceptually dominant.
-   Do not fill unused space merely because it is available.
-   Avoid layouts that divide attention among several equally weighted
    boxes without a clear reading path.
-   Prefer direct spatial grouping over borders, cards, panels, and
    decorative containers.
-   Keep meaningful content away from slide edges so it survives
    projection, display cropping, and export.
-   Align objects deliberately. Near-alignment looks accidental and
    increases visual noise.
-   Use white space to establish hierarchy and grouping, not as an
    aesthetic quota.
-   Do not force every slide into the same layout. Let the
    representation follow the intellectual job.

# Text density

-   Paragraphs are exceptional on audience-facing slides.
-   Bullets are appropriate only when the content is genuinely a list.
-   Do not convert speaker narration into bullets merely because the
    information exists.
-   Prefer labels, short annotations, compact statements, equations,
    examples, and visible relationships.
-   If a slide requires sustained reading while the speaker is also
    talking, reconsider the representation.
-   Material intended for careful self-paced reading may belong in
    notes, backup material, a handout, or a companion document.
-   Dense technical evidence is permitted when the detail itself
    matters. Improve hierarchy, annotation, and signaling before
    deleting evidence.
-   Do not compress wording until a technical claim becomes less
    precise.

# Figures, diagrams, and evidence

-   A visual must explain, demonstrate, compare, orient, or provide
    evidence. Do not add imagery merely to make a slide look designed.
-   Prefer diagrams that expose real semantics: objects, boundaries,
    flows, dependencies, hierarchy, transformations, authority,
    feedback, or constraints.
-   Prefer direct labels on diagrams and charts over detached legends
    where practical.
-   Annotate the specific feature the speaker is discussing so the
    audience knows where to look.
-   Preserve enough resolution, axes, units, baselines, denominators,
    uncertainty, and context to keep evidence honest.
-   Do not replace a technically useful figure with a generic
    infographic merely for aesthetic simplicity.
-   Avoid decorative stock photography and generic AI-generated imagery.
-   Use photographs when the actual physical object, scene, analogy, or
    event matters.
-   Screenshots should be cropped to the relevant region and annotated
    when the audience otherwise would not know where to look.
-   Do not flatten editable, semantic content into an image merely for
    convenience.
-   When a figure evolves across slides, preserve the established visual
    frame and modify or highlight the changed portion where practical.

# Quantitative material

-   Use a chart when the quantitative **pattern** matters.
-   Use a table when exact **lookup or comparison** matters.
-   Use a direct number when the number itself is the point.
-   Show denominators, baselines, distributions, uncertainty, or other
    context when they materially affect interpretation.
-   Label axes and units directly and legibly.
-   Annotate the comparison or relationship the audience is expected to
    notice.
-   Do not distort visual magnitude, area, scale, or ordering to
    exaggerate an effect.
-   A large number can establish scale; it should not substitute for
    necessary context.

# Color and emphasis

-   Use color sparingly and semantically.
-   **Do not encode essential meaning by color alone.**
-   Pair color distinctions with labels, shape, position, pattern,
    symbols, or another non-color cue.
-   Prefer position, scale, weight, and restrained highlighting before
    introducing additional colors.
-   One accent treatment is usually stronger than several competing
    emphasis styles.
-   Maintain sufficient foreground/background contrast for projection
    and accessibility.
-   Avoid gradients, ornamental shadows, glows, and decorative effects
    unless they carry information.
-   Ensure important distinctions remain understandable under weak
    projection and, where practical, grayscale.

# Builds and animation

-   Use builds to control reasoning, not to add motion.
-   Reveal a component when the audience is ready to reason about it.
-   Preserve object positions across builds whenever possible.
-   Highlight changes to an established representation rather than
    replacing the representation unnecessarily.
-   Each build should add conceptual meaning.
-   Avoid entrance-animation theater and motion whose only purpose is
    visual novelty.
-   Do not make essential information available only during a transient
    animation.
-   The final static state should remain intelligible when the deck is
    exported to PDF.
-   When animation is essential to understanding change or sequence,
    provide a static representation or equivalent that survives
    distribution.

# Citations and provenance

-   Cite external figures, quotations, data, and consequential sourced
    claims.
-   Keep citations visually subordinate to the evidence they support,
    but **keep them readable**.
-   Citations and source labels are audience-facing text and should not
    become microscopic exceptions to the 20 pt rule merely because they
    are citations.
-   When full bibliographic detail would overwhelm the slide, use a
    compact readable citation on-slide and retain complete provenance in
    notes or backup material.
-   Prefer meaningful source labels to unexplained raw URLs.
-   Do not allow citations or URLs to dominate the evidence they
    support.

# Accessibility by construction

Build accessibility into the source deck. Accessibility is substantially
easier to preserve, audit, or remediate later when the source already
contains semantic text, meaningful object order, structural titles, and
descriptions of visuals.

## Alt text and visuals

-   Give every meaningful **figure, image, chart, diagram, and
    screenshot useful alt text** in the source deck.
-   Write alt text for the **communicative purpose** of the visual, not
    merely its appearance.
-   For a chart, include the important trend, comparison, or conclusion
    a sighted audience is expected to obtain.
-   For a diagram, include the important objects and relationships
    needed to understand its role in the talk.
-   For a screenshot, identify the relevant interface state or feature
    rather than exhaustively describing incidental pixels.
-   Mark purely decorative images as decorative rather than inventing
    meaningless alt text.
-   If a visual contains essential text that cannot remain native slide
    text, ensure the relevant information is represented accessibly
    elsewhere.
-   Do not assume a filename, caption, or surrounding title is an
    adequate substitute for alt text when the visual itself carries
    additional meaning.

## Native semantics

-   Keep text as real slide text where practical.
-   Use native slide lists, tables, charts, and shapes where they
    preserve useful structure.
-   Avoid flattening an entire slide, diagram, or table into a
    screenshot when the content can remain semantic.
-   Give charts meaningful titles and directly label important series,
    values, axes, units, and relationships.
-   Give tables a simple logical structure where practical.
-   Avoid using tables solely as a layout mechanism.
-   Avoid merged or unnecessarily complex table structures when a
    simpler structure communicates the same information.

## Slide titles

-   Give every slide a meaningful, unique **structural title**.
-   Prefer using the slide's actual title placeholder or equivalent
    structural title field.
-   The structural title should support navigation and identification by
    assistive technology.
-   If a visible slide intentionally has no title, retain an appropriate
    structural title rather than leaving the slide unnamed.

## Reading and object order

PowerPoint reading order follows the slide's object/z-order rather than
the visual left-to-right or top-to-bottom arrangement.

-   **Create objects in the intended semantic reading order whenever
    possible.** For generated slides, insertion order should be
    deliberate from the beginning.
-   Treat correct insertion order as the default way to obtain
    accessible reading order "for free."
-   Visual position does not establish semantic reading order.
-   If later editing, duplication, grouping, or rearrangement changes
    object order, explicitly reorder the objects before finalizing the
    slide.
-   The intended reading sequence should remain understandable without
    relying on visual position alone.
-   Group objects only when grouping preserves rather than obscures the
    intended semantics.

## Color and nonvisual meaning

-   Do not use color as the sole carrier of state, category,
    correctness, emphasis, or other essential meaning.
-   Do not use visual position, font styling, shape, or size as the sole
    carrier of an essential distinction unless the same distinction is
    also available semantically or textually.
-   Give important relationships explicit labels where a nonvisual
    reader would otherwise lose them.

## Links

-   Use descriptive link text for audience-facing hyperlinks.
-   Avoid `click here`, `more`, or an unexplained raw URL when a
    meaningful label is practical.
-   Ensure the link text makes sense independently of its visual
    position.

## Audio and video

-   Provide captions for video containing meaningful speech or audio.
-   Provide an appropriate transcript or equivalent alternative when
    needed for distributed material.
-   Do not rely on audio alone to communicate information that has no
    accessible alternative.

## Export and distribution

-   Accessibility in the source deck does not guarantee accessibility
    after conversion.
-   When exporting or distributing the deck, verify that structural
    titles, alt text, reading order, links, and other relevant
    accessibility metadata survived conversion.
-   Ensure essential information does not disappear when builds or
    animations are flattened.
-   Check the exported PDF or other distributed form separately rather
    than assuming the source deck's semantics were preserved.

# Projection and robustness

-   Design for the back of the room, not the author's laptop.
-   Use sufficiently thick lines, large marks, and clear labels in
    diagrams and charts.
-   Test important figures at realistic projected size rather than only
    at editing zoom.
-   Maintain strong foreground/background contrast.
-   Check that meaningful distinctions survive ordinary projectors and
    low-quality rendering.
-   Do not depend on subtle color differences or hairline strokes.
-   Ensure the deck remains intelligible after PDF export.

# Mechanical audit

Before considering a deck complete, check every slide and the deck as a
whole.

## Typography and titles

-   Is any audience-facing text below 20 pt?
-   Are ordinary slide titles one line?
-   Does each title communicate an idea, claim, question, or useful
    orientation rather than merely a topic?
-   Does every slide have a meaningful structural title?
-   Has any content been shrunk merely to make it fit?

## Content and hierarchy

-   Does every slide have a clear primary visual hierarchy?
-   Are any paragraphs or bullet walls duplicating speech?
-   Are labels readable from presentation distance?
-   Is any decorative element consuming attention without carrying
    meaning?
-   If a slide is dense, is the density evidence or useful structure
    rather than clutter?

## Figures and evidence

-   Are charts and diagrams directly annotated where useful?
-   Are axes, units, baselines, denominators, and other necessary
    context present?
-   Is the representation visually honest?
-   Does every meaningful visual have useful alt text?
-   Are decorative visuals marked decorative?

## Accessibility

-   Is the object/reading order sensible?
-   Were objects created or reordered into the intended semantic
    sequence?
-   Is any essential meaning conveyed only by color, visual position,
    font styling, or an image of text?
-   Are links descriptively labeled?
-   Are tables and other structured objects reasonably simple and
    semantic?
-   Are captions or alternatives present for meaningful media?
-   Are citations readable?

## Builds and distribution

-   Does every build add meaning?
-   Are builds understandable in their final static state?
-   Does the deck remain usable after PDF export?
-   Did structural titles, alt text, links, reading order, and other
    accessibility semantics survive the distributed format?

Treat failures as defects unless there is a deliberate reason for the
exception. If an exception is necessary, preserve the underlying
communication and accessibility objective rather than mechanically
satisfying the surface rule.
