# slide.md — design the atomic visual unit

This is an **agent-facing** resource for designing an individual presentation slide.

A slide is not a page of prose.
It is a temporary visual field shown to an audience that is usually at a distance, listening at the same time, and unable to inspect every element equally.

The strongest foundations here are Michael Alley's **assertion–evidence** approach for technical presentations, Richard Mayer's research on multimedia learning, Edward Tufte's information-design principles, and Mike Morrison's Better Poster work on rapid acquisition and perceptual hierarchy.

The governing rule is:

> **Make the important idea perceptible, show enough evidence to judge it, and remove attention costs that do not carry meaning.**

This does not mean "make every slide minimal."
A rich technical figure can be excellent when its detail is evidence rather than clutter.

## Give the slide one primary job

Every slide should have an identifiable primary job.

Examples include:

- establish a claim;
- show evidence;
- pose a question;
- compare alternatives;
- expose a mechanism;
- establish scale;
- introduce vocabulary;
- prompt an activity;
- synthesize established concepts.

"One job" does **not** mean one fact, one object, or low information density.
A chart with twenty data points can perform one job.
A system diagram with twelve components can perform one job.

Split the slide when different regions compete for unrelated audience actions.

## Default to assertion → evidence

Michael Alley's assertion–evidence approach provides a strong default grammar for technical slides.

### Assertion

Prefer a title that states what the audience should conclude from the slide.

Weak:

> Performance Results

Stronger:

> Latency remains bounded as the workload grows

The stronger title tells the audience what relationship to inspect in the evidence.

An assertion title is a default, not a law.
Topic titles remain appropriate for genuine orientation, reference, activity, or section slides.

### Evidence

Use the body for the thing that lets the audience inspect, understand, or judge the assertion.

Evidence may be:

- a chart;
- a diagram;
- a table;
- a photograph;
- code;
- an equation;
- a measurement;
- a quotation;
- a worked example;
- an experimental artifact;
- a demonstration result.

Avoid **topic heading + bullet inventory** as the automatic structure for a technical slide.
If the content is fundamentally a list, a list may be correct.
Do not turn relational or evidentiary content into bullets merely because bullets are easy to author.

## Design for acquisition conditions

Mike Morrison's Better Poster work emphasizes a useful constraint: communication artifacts are encountered under real conditions, not inspected indefinitely at the author's preferred zoom level.

For a projected slide, the audience is typically:

- several meters away;
- seeing the slide temporarily;
- listening simultaneously;
- unable to allocate equal attention to every region.

Ask:

> What does the audience acquire in the first few seconds?

The primary message and visual hierarchy should survive that test.

This is not a requirement that every technical detail be understood instantly.
It is a requirement that the audience can quickly determine **what matters and where to look**.

## Layer information when the evidence supports it

A useful technical slide can support multiple acquisition depths:

1. **Immediate takeaway** — the primary claim or relationship.
2. **Inspectable evidence** — enough information to see why the claim is plausible.
3. **Fine detail** — values, labels, exceptions, or structure useful to technical scrutiny.

This reconciles Morrison's emphasis on rapid acquisition with Tufte's emphasis on information richness.

Do not confuse visual simplicity with informational poverty.

## Direct attention rather than decorating

Mayer's **signaling** principle says that cues can help learners identify the organization and important elements of material.

Useful signals include:

- position;
- scale;
- typographic weight;
- restrained highlighting;
- arrows;
- annotations;
- progressive reveal.

Use them to answer "where should I look?" or "what changed?"

Do not highlight everything.
A cue with no contrast carries no information.

## Coordinate the visual and spoken channels

Mayer's multimedia-learning work treats visual/pictorial and auditory/verbal processing as limited channels.
The practical consequence for slides is simple: do not routinely make the audience read the same narration it is hearing while also trying to inspect a visual.

Prefer:

- **slide:** evidence, structure, exact wording, comparison;
- **speech:** interpretation, connective reasoning, qualification.

If exact prose itself is the object of analysis—a requirement, quotation, legal clause, definition, or code fragment—show it.
If a graphic is the object of analysis, let the audience look at the graphic while the speaker explains it.

## Put labels beside what they describe

Mayer's **spatial contiguity** principle favors placing corresponding words and graphics near each other.

Prefer:

- labels directly on lines or regions;
- annotations beside the relevant feature;
- units next to values;
- short explanations adjacent to the object they explain.

Avoid making the audience repeatedly shuttle between a distant legend and the evidence.

Direct labeling also aligns with Tufte's information-design practice.

## Show the relevant thing when discussing it

Mayer's **temporal contiguity** principle favors presenting corresponding visual and verbal information together.

- Show the figure while explaining the figure.
- Reveal a new component when discussing that component.
- Do not display a complex diagram long before the audience has a reason to inspect it.
- Do not explain evidence several slides after removing it from view.

When a figure is too complex to process at once, use a sequence or build that preserves the frame while adding structure.

## Choose the representation by the relation

Use the representation that naturally carries the content.

- **Text** — wording itself matters.
- **Photograph** — physical reality or appearance matters.
- **Diagram** — structure, mechanism, or relationship matters.
- **Chart** — quantitative pattern, trend, or distribution matters.
- **Table** — exact values or lookup/comparison matters.
- **Equation** — a formal relationship matters.
- **Code** — implementation detail or syntax matters.
- **Build / animation** — change, sequence, or progressive structure matters.

Do not draw merely because slides are visual.
Do not bullet-list a relationship whose important property is spatial, causal, temporal, or quantitative.

## Preserve information integrity

Tufte's work provides the discipline for technical evidence.

### Show enough evidence

Do not reduce:

- a distribution to one average when spread matters;
- an experiment to a decorative percentage when the denominator matters;
- a system to generic boxes when structure matters;
- a comparison to adjectives when values are available.

The audience should see enough of the evidence to evaluate the claim at the resolution appropriate to the talk.

### Integrate words and graphics

Labels, values, annotations, and explanations should live near the evidence they interpret.
Do not artificially separate "the picture" from all of its language.

### Remove chartjunk

Decoration consumes attention.

Remove gradients, ornamental icons, unnecessary borders, 3-D effects, background imagery, redundant legends, and other marks that do not carry meaning.

### Preserve graphical honesty

Visual magnitude, area, scale, ordering, and emphasis should fairly represent the underlying evidence.
Do not make a small effect look large through graphical manipulation.

The goal is not maximum emptiness.

> **Reduce cognitive waste, not evidence.**

## Use economy without fetishizing minimalism

Every visible element consumes some attention.
Keep it when it carries:

- meaning;
- evidence;
- orientation;
- grouping;
- accessibility;
- provenance.

Remove it when it is merely furniture.

White space is useful when it establishes hierarchy or separation.
It is not an aesthetic quota.

A slide with one sentence and acres of empty space is not automatically better than a dense, well-labeled technical figure.

## Use text as a visual element

Slide prose should usually be shorter than document prose because the audience cannot read deeply and listen deeply at the same time.

Prefer:

- short assertion titles;
- direct labels;
- brief annotations;
- compact quotations;
- small numbers of deliberately structured bullets when a list is genuinely the content.

Avoid paragraphs unless reading the prose is itself the activity.

Do not shrink type to preserve wording that belongs in speech, notes, or a companion document.

## Make quantitative evidence perceptible

When the job is quantitative:

- use a chart for pattern;
- use a table for exact lookup;
- use a direct number when the number itself is the point;
- show denominators, uncertainty, baselines, or distributions when they materially affect interpretation;
- annotate the relevant comparison directly.

A large number in the center of a slide can be effective for scale.
It becomes misleading when the missing context is necessary to interpret it.

## Legibility and accessibility

Design for the room, not the laptop.

- Use type that remains legible from the back.
- Maintain sufficient foreground/background contrast.
- Do not encode meaning by color alone.
- Prefer direct labels.
- Keep important marks thick/large enough to survive projection.
- Preserve meaningful reading order.
- Where practical, ensure distinctions survive grayscale or weak projection.
- Provide alt text for meaningful visuals in distributed artifacts.

Accessibility supports the same objective as good visual design: the intended information should survive the conditions under which the audience receives it.

## Slide-level tests

### Job test

What is this slide supposed to change in the audience's understanding or attention?

If the answer is only "cover topic X," sharpen the job.

### Assertion test

If the slide makes a claim, does the title state the useful conclusion rather than merely name the topic?

### Evidence test

Can the audience see why the assertion should be believed or understood?

### Billboard test

From across the room and after a few seconds, what survives?
Is that the intended primary message?

### Squint test

When fine detail disappears, is the intended visual hierarchy still apparent?

### Competition test

Are multiple elements demanding attention for unrelated reasons?

### Redundancy test

Is substantial visible prose merely duplicating what the speaker will say?

### Contiguity test

Are labels and explanations near the objects they describe?

### Ink test

Can anything be removed without reducing evidence, meaning, orientation, accessibility, or provenance?

### Integrity test

Would a technically sophisticated audience regard the representation as a fair account of the underlying evidence?

A slide that fails one of these tests may still be correct—the principles have boundary conditions—but the failure should be deliberate rather than accidental.
