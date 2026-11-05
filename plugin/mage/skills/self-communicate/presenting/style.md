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

## House typography and punctuation

Audience-facing slide text should read as presentation language rather than
document prose.

-   Do not end slide titles with periods. Titles are headings, claims,
    questions, or orientation labels rather than prose paragraphs.
-   Avoid em dashes in audience-facing slide text. Prefer a colon, comma,
    parentheses, a line break, or a rewritten sentence according to the
    relationship being expressed.
-   Keep ordinary slide titles to one line. Rewrite rather than shrinking the
    title to preserve wording.
-   Apply punctuation consistently across comparable labels, headings, and
    annotations. Do not let mechanically generated punctuation create visual
    noise.

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

### Engineering lectures develop a decision

A MAGE engineering lecture should ordinarily develop one sustained
engineering problem through a sequence of models, judgments, mechanisms,
and evidence.

The preferred pattern is:

    CONCRETE ENGINEERING PROBLEM
                 |
                 v
          STUDENT REASONING
                 |
                 v
           MODEL OR METHOD
                 |
                 v
         ENGINEERING DECISION
                 |
                 v
         REALIZATION / CONTROL
                 |
                 v
               EVIDENCE
                 |
                 v
        REVISED UNDERSTANDING

This is an intellectual structure, not a required slide template.

-   Use a running system or case when several concepts concern the same
    engineering decision. Revisit it as new evidence, requirements, or
    failures arise.
-   Introduce major techniques because the investigation requires them.
    Do not organize a lecture primarily as a catalogue of terminology,
    mechanisms, or technologies.
-   Have students predict, diagnose failures, compare alternatives, or
    propose controls before the complete answer is supplied.

A lecture may also contain direct exposition, worked examples,
definitions, historical context, and deliberate digressions. These are
valuable when they support the audience's developing understanding.

The objective is not constant interaction. It is sustained intellectual
engagement.

### Prefer engineering judgment to technology selection

The course teaches engineering decisions, not product recommendations.

A database, cloud platform, deployment strategy, or architectural pattern
should appear as a possible realization of requirements.

When comparing alternatives, identify:

-   the requirement or obligation;
-   the relevant model;
-   the available alternatives;
-   the consequences of each;
-   the evidence that would justify the choice.

Where useful, change an assumption and ask whether the decision changes.

Do not imply that one technology is universally preferable merely because
it appears later in the lecture or has a more elaborate architecture.

### Let established engineering practice carry weight

Not every engineering decision is an unconstrained menu of equally
plausible choices.

Some practices embody decades of accumulated experience. Transactional
databases, established security principles, reproducible builds, and
systematic failure analysis exist because engineers repeatedly met the
problems they address. Teach the reasons those practices became
established.

An alternative that weakens a guarantee may still be appropriate. The
engineer must then identify which obligations are relaxed, which are
transferred, and which are accepted as risks.

For example, self-managed files, Redis with asynchronous persistence, and
a transactional relational database offer different guarantees. The
lesson is not that one is always correct; it is that consequential shared
state often justifies established transactional mechanisms.

Do not manufacture false equivalence among alternatives when the evidence
supports a strong default.

### Preserve room for expert digression

A lecture is a live intellectual exchange, not a recorded reading of the
deck.

A question may open an opportunity to examine a deeper mechanism, connect
to another field, or explore a consequential exception. Such digressions
earn their place by showing how an expert reasons beyond prepared
material.

Keep the prepared sequence coherent enough that the instructor can leave
it and return. Use stable conceptual anchors, meaningful section
boundaries, and concise speaker notes. Identify the material that can be
skipped when a discussion runs long.

Do not script every transition so tightly that the lecture becomes hard
to adapt to student questions.

A digression should contribute understanding rather than consume time.
The instructor decides when to return to the governing problem.

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

## Technical connectors

In box-and-arrow technical diagrams, connectors are semantic objects. Their
geometry, endpoints, direction, and visual weight should make the represented
relationship unambiguous.

-   Prefer orthogonal, right-angle connectors between rectangular components.
    Use diagonal connectors only when the geometry itself carries meaning or an
    orthogonal route would materially reduce clarity.
-   Attach connectors exactly to the boundaries or native connection points of
    the objects they relate. Do not leave arrow endpoints floating near a box.
-   Prefer native PowerPoint connectors over independent line shapes so
    relationships remain attached when objects move.
-   Route connectors deliberately. Avoid crossing boxes, labels, or other
    connectors when a clean route is available.
-   Use sufficiently heavy connector strokes and arrowheads to remain clearly
    visible under lecture-hall projection. Hairline arrows are not part of the
    house style.
-   Arrow direction must encode a real semantic relationship such as flow,
    dependency, invocation, implementation, or control. Do not use arrows as
    decorative glue.
-   Keep comparable connectors visually consistent in stroke weight, arrowhead
    size, and routing grammar.

Architecture and dependency diagrams should therefore tend toward the visual
grammar of engineering schematics rather than loosely connected infographic
boxes.

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

# Animation and progressive disclosure

Animation controls attention and reveals structure; it is not decoration.
Prefer a small vocabulary of simple builds whose meaning is predictable
across the deck.

Common house patterns:

-   **Appear.** Introduce a new object when it becomes relevant.
-   **Appear + de-emphasize.** On the same click, introduce the new material
    while making previously discussed material substantially more
    transparent. Use this when the old material remains useful as context but
    should no longer compete for attention.
-   **Replace.** Remove or disappear existing material as the next material
    appears. Use this when retaining the old material would add clutter
    rather than useful context.

Choose between de-emphasis and disappearance deliberately. Keep earlier
material visible when relationships, accumulation, comparison, or history
matter; remove it when the audience no longer needs it to understand the
current point.

When several objects accumulate on a slide, a thin, restrained border around
the active or newly introduced object can clarify grouping and focus. Borders
should be structural, not ornamental.

Make simultaneous changes occur on the same click when they represent one
conceptual transition — the new object appears while the previous object
becomes transparent, for example. Do not force the speaker through multiple
clicks for what the audience should perceive as one move.

Animate conceptual units rather than individual drawing primitives. If several
objects together constitute one new idea, reveal them on the same click.
For comparison slides, a useful default sequence is:

1.  establish the problem and first alternative;
2.  reveal the second alternative;
3.  expose the consequential difference or tradeoff.

Do not reveal the conclusion before the audience has had the opportunity to
inspect the alternatives that support it.

Avoid gratuitous motion: elaborate transitions, spins, zooms, bouncing,
3-D effects, and animation whose only purpose is novelty. Movement should
correspond to a change in the audience's attentional or conceptual state.
Preserve the deck's visual grammar — reuse an established build pattern
before inventing another.

**Reveal by masking.** For a complex figure, diagram, or table revealed in
stages, prefer reveal-by-masking when practical: begin with the complete
artifact, place opaque background-colored boxes over the portions not yet
being discussed, and make those masks disappear as the explanation
progresses. This preserves the full artifact underneath while controlling
what the audience can see, and is especially useful when the final state
should be the complete figure or table. Prefer it to reconstructing the
artifact piece-by-piece when reconstruction would make the final composition
harder to edit, align, or reuse.

# Establish orientation immediately

MAGE presentations open by orienting the audience, and the form of that orientation depends on
presentation type:

    Lecture/module:
        cover → motivating problem → orientation when useful

    Research talk:
        cover → contributions

For a lecture, orient the audience to the intellectual journey by giving it a problem to reason about. The
motivating problem should ordinarily appear before the taxonomy, roadmap, or framework used to analyze it;
an outline may follow once the audience understands what the lecture is trying to resolve. When an outline
is used, keep it compact and meaningful — it is not an administrative agenda.

For a research talk, orient the audience to the intellectual payload — state what the work contributes,
not the sections of the presentation. Keep the contributions on slide 2.

Do not substitute a generic agenda for either.

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
-   Do not repair a pedagogically weak lecture through typography,
    animation, or visual polish. Diagnose the level that is wrong — a
    slide, the sequence, or the teaching argument — and repair it there.

# Source basis

This guide was inferred from the supplied teaching and research decks,
including graduate-course introduction material, storytelling-heavy
material with substantial speaker notes, software-design lecture
material, and the two Amusuo research talks. It is intended as a
house-style overlay on top of the portable `talk.md`, `deck.md`,
`slide.md`, and `presentation-types.md` foundations.
