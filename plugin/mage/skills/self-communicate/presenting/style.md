# Slide Design Guide

A working house-style specification inferred from the supplied teaching
and research decks.

# Purpose

This document captures a reusable slide-design grammar rather than a
rigid template. The central unit is the argument or teaching sequence:
individual slides should serve the progression of thought, not behave
like isolated pages of a report.

# Core style

-   Treat each slide as a unit of thought. A slide should usually make,
    illustrate, test, or transition one idea.
-   Design sequences, not isolated slides. Repetition across adjacent
    slides is useful when it advances the audience through an argument.
-   Use titles to orient the audience to the current idea. Prefer
    semantic titles over generic section labels when the slide is making
    a claim.
-   Use visuals as explanatory objects, evidence, or analogies---not
    decoration.
-   Allow complexity when the intellectual object is genuinely complex.
    Do not simplify a diagram or evidence display merely to make the
    slide sparse.
-   Keep visible prose subordinate to oral delivery. When the story is
    carried orally, a sparse slide with substantial speaker notes is
    appropriate.
-   Prefer concrete cases before or alongside abstraction. Return from
    the case to the principle explicitly.

# Presentation modes

The supported presentation types are **lecture** and **research talk** (with lecture free to
blend tutorial). Storytelling is not a third type; it is a narrative sequence a lecture or
research talk may use locally.

## Lecture

Goal: build concepts progressively and give students enough structure to
reason with them.

-   Use deliberate repetition and revisiting of concepts.
-   Move naturally among principle, example, visual analogy,
    formalization, and application.
-   Case studies may occupy several slides when they establish why a
    principle matters.
-   Question, discussion, and activity slides are legitimate parts of
    the teaching sequence.
-   Some exposition on-slide is acceptable; the deck need not have
    research-talk compression.

Observed pattern: a design lecture can introduce a principle, develop a
concrete case, return explicitly to the principle, use another example
to expose structure, and then state the abstraction and its mechanisms.

## Research talk

Goal: make an evidence-backed argument quickly enough that the audience
can see the problem, gap, contribution, and result.

-   Compress aggressively: motivation → evidence → gap/question →
    mechanism → evaluation → conclusion.
-   Dense evidence slides are acceptable when the density is doing
    argumentative work.
-   Annotated screenshots, tables, code, and purpose-built diagrams can
    carry much of the reasoning.
-   Make the contribution visually explicit once the problem and gap are
    established.
-   Results should answer the questions the talk set up rather than
    merely report measurements.

The supplied Amusuo research talks exhibit this mode: they move from a
consequential problem through evidence and a research gap to a mechanism
and evaluation.

## Storytelling / narrative sequence

Some sequences within a lecture or research talk may primarily control
audience attention and narrative pacing rather than expose the full
information structure on every slide.

-   A single sparse slide may support an elaborate spoken story.
-   Speaker notes may carry substantially more content than the visible
    slide.
-   Use visual pacing, reveals, and transitions to create the narrative.
-   Do not force explanatory completeness onto the slide when the oral
    story supplies it.

# Useful sequence patterns

-   **Principle → case → return to principle → abstraction →
    application.** Strong lecture pattern. Establish the idea, make its
    consequences concrete, then generalize.
-   **Problem → evidence → gap → contribution → evaluation →
    conclusion.** Default research-talk argument.
-   **Question → visual/evidence → answer.** Useful when the audience
    should reason before the conclusion is stated.
-   **Simple visual → more detailed visual → decomposition.** Useful for
    teaching hierarchy, abstraction, architecture, or complexity.
-   **Claim → counterexample/caveat → refined claim.** Useful for
    principles that are easy to over-apply.

# Slide construction rules

-   Start from the point the audience should understand after the slide,
    then choose the minimum combination of text and visual needed to
    create that understanding.
-   Do not turn speaker notes into bullets merely because the
    information exists.
-   Avoid decorative stock imagery. A photograph is useful when it
    supplies a concrete analogy, case, object, or narrative anchor.
-   Prefer diagrams that expose relationships, boundaries, flows,
    hierarchy, or constraints.
-   When showing evidence, annotate the evidence directly so the
    audience knows what to inspect.
-   When a slide is intentionally dense, establish a clear visual path
    through it.
-   Section-divider slides can be extremely sparse.
-   Reusing a title or framing sentence over multiple slides is
    acceptable when the visual progression underneath it is the lesson.

# What not to optimize for

-   Do not require every slide to be self-contained.
-   Do not impose a universal word-count or object-count limit.
-   Do not make every slide visually novel.
-   Do not replace a useful technical figure with a generic infographic
    merely for visual cleanliness.
-   Do not mistake sparsity for quality. Sparse slides work when the
    oral narrative carries the missing structure.
-   Do not mistake density for poor design. Dense evidence can be
    appropriate when the audience is being directed through it.

# Use native semantics without adopting generic infographic style

Prefer PowerPoint's native semantic constructs when they faithfully
represent the idea. SmartArt, charts, tables, equations, placeholders,
and other structured objects are generally preferable to recreating the
same semantics from disconnected primitives.

This does **not** mean that a MAGE deck should look like a gallery of
stock SmartArt templates. Use SmartArt only when the relationship it
encodes is actually the relationship being communicated.

Preserve the house preference for literal technical representations.
When a native construct cannot faithfully express the technical model,
use an appropriate custom representation rather than forcing the model
into a generic infographic.

Do not use Microsoft's decorative 3D/bevel/extrusion aesthetic.
Representations are flat by default. Use three-dimensional depiction
only when three-dimensional structure is itself part of the subject.

# Establish orientation immediately

MAGE presentations begin with a stable two-slide opening whose second slide depends on presentation type:

    Lecture/module:
        cover → module outline

    Research talk:
        cover → contributions

For a lecture, orient the audience to the intellectual journey — keep the module outline compact and
meaningful; it is not an administrative agenda. For a research talk, orient the audience to the
intellectual payload — state what the work contributes, not the sections of the presentation. Do not
substitute a generic agenda for either.

Use the same vocabulary across the outline, the PowerPoint/O365 Sections, any meaningful section-divider
slides, and the references to the movements in speaker notes — one stable representation of the module's
structure rather than several competing outlines.

# Preserve the talk in speaker notes

MAGE decks use speaker notes as part of the authored presentation, not as an afterthought.

Use the standard notes form:

    <estimated time> — *<one-line purpose/message>*

    - presenter crib
    - key points / evidence / qualifications

    =====

    transcript or detailed speaking notes

    ANIMATE

    continuation after the build

Keep the opening purpose line intellectual rather than descriptive:

    2 minutes — *Show that process can arrange for judgment without being judgment itself.*

is stronger than:

    2 minutes — *Discuss process and judgment.*

Use the transcript to preserve useful phrasing, sequencing, explanation, and transitions, especially for
storytelling or carefully staged reasoning. Sparse visible slides may legitimately carry elaborate speaker
notes.

Do not require a fully scripted transcript when the slide is better delivered conversationally. The notes
structure should preserve the talk, not force every talk into recital.

# Agent instructions

When generating or revising slides, first classify the presentation as
lecture, research talk, or a deliberate blend. Then identify the role of
the local sequence; some sequences may use storytelling and sparse visual
pacing. Preserve continuity across the sequence. Do not mechanically
normalize slides toward one density, layout, or amount of text.

-   For lecture material, optimize for concept formation and reasoning.
-   For research talks, optimize for argumentative compression and
    evidence.
-   For storytelling slides, optimize for pacing and oral delivery.
-   Prefer adapting an existing sequence pattern over inventing a new
    visual idiom for every slide.
-   If a complex slide is hard to read, first improve hierarchy,
    annotation, or sequencing; split it only when the audience genuinely
    needs separate reasoning steps.
-   If a slide feels empty, do not add decoration. Ask whether the
    emptiness serves pacing; otherwise strengthen the intellectual
    content.

# Source basis

This guide was inferred from the supplied teaching and research decks,
including graduate-course introduction material, storytelling-heavy
material with substantial speaker notes, software-design lecture
material, and the two Amusuo research talks. It is intended as a
house-style overlay on top of the portable `talk.md`, `deck.md`,
`slide.md`, and `presentation-types.md` foundations.
