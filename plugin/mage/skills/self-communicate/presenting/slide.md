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

## A fact is not necessarily a lesson

A technically correct statement does not by itself make a useful teaching slide.
Three slides can define a term, define a second term, and show a diagram, each individually clear, and together advance nothing.

**The four questions below are for the author. Do not mechanically convert their answers into
audience-facing text.**

For every substantive slide, identify:

1. **Need.** Why does the audience need this information now?
2. **Intellectual job.** What should change in the audience's understanding?
3. **Evidence or reasoning.** What establishes the point?
4. **Consequence.** What can the audience now explain, predict, or decide?

Weak instructional design:

    Title: ACID Properties
    Body: Definitions of atomicity, consistency, isolation, and durability.

Stronger:

    Title: What would we need to implement without a database?
    Body: Four failure scenarios involving concurrent updates, crashes,
          durability, and integrity.

Students identify the obligations.
ACID then names the guarantees transactional databases already provide.
The definitions are still necessary; now they answer a question.

Some slides legitimately introduce vocabulary, notation, or prerequisites with no separate motivating problem.
Keep those brief and connected to the reasoning that follows.

Do not manufacture a thesis for a reference slide.
Do not let an entire lecture consist of reference slides.

## The slide performs the lesson; it does not describe it

Keep authoring rationale off the slide.

A slide's intellectual job is an authoring requirement, not audience-facing text.
A slide may exist to make students compare alternatives, discover an invariant, revise an assumption, or exercise judgment.
It should supply the question, model, evidence, or comparison through which that work happens.
Do not print a sentence describing the work students are supposed to perform.

Three kinds of statement show up at the bottom of a teaching slide. Two of them belong there.

| Kind | Example | Treatment |
|---|---|---|
| **Engineering claim** | *Separating data from execution creates new engineering choices* | Appropriate when the slide supports it |
| **Engineering judgment** | *Choose a representation that supports the application's required operations* | Appropriate when it establishes a useful decision criterion |
| **Pedagogical commentary** | *One concrete decision, and the requirement that justifies it* | Keep it in authoring plans or speaker notes |

The first two concern the engineering subject.
The third concerns how the lecture is being taught.

Commentary to keep off audience-facing slides:

- *The next four slides supply what is missing.*
- *Decisions the exercises actually made, not a tour of what exists.*
- *Formulate the obligation before reaching for a mechanism.*
- *The point is to understand the tradeoff.*
- *This is the engineering judgment.*

The test:

> Does this statement tell the audience something about the engineering subject, or does it tell them
> what the presentation is trying to teach?

Keep the former where it is useful. Move the latter to speaker notes, or delete it.

**A substantive concluding statement is a different thing.** It may establish a generalization, a
limitation, a decision criterion, or a consequence the evidence does not make obvious on its own.
**Do not remove a useful engineering conclusion merely because it appears at the bottom of a slide.**

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

## Choose the title by the slide's instructional role

Assertion–evidence is a strong default for communicating an established technical claim.
It is the wrong opening move when the audience is supposed to construct the claim.

In a lecture, three instructional roles recur, and the role decides the title.

| Slide role | Purpose | Preferred title |
|---|---|---|
| Question | Establish a problem requiring reasoning | A question the audience can attempt |
| Investigation | Supply evidence, expose a mechanism, or test an explanation | The relationship or uncertainty under examination |
| Conclusion | Establish the principle the investigation supports | An assertion stating what was learned |

A performance-engineering sequence might run:

- **Question** — *Why does the service become slow near capacity?*
  Show the workload and the service capacity. Ask students to predict the effect of more arrivals.
- **Investigation** — *What happens as utilization approaches 100%?*
  Show the queueing model and progressively reveal the predicted response-time curve.
- **Conclusion** — *Queueing delay grows rapidly near capacity.*
  Show the relationship and identify the assumptions under which it holds.

The conclusion slide may reuse the investigation's figure. What changes is what the audience is now expected to understand.

Do not mechanically build three slides for every concept.
These roles may appear as builds within one slide, across several slides, or through a combination of speech and visuals.

Use a question title when the audience is genuinely expected to reason before the answer appears.
Use an assertion title when the audience should inspect evidence for a conclusion already established.

**Do not reveal the answer in the title of a slide meant to elicit that answer.**
For question and investigation slides, this rule takes precedence over the assertion-title default.

Research talks keep assertion–evidence as the default throughout; this role distinction is a lecture concern.

## Questions must support productive reasoning

A teaching question needs a clear intellectual purpose.

Before placing a question on a slide, determine:

- what information students hold;
- what reasoning they can perform with it;
- what plausible answers they might propose;
- what observation or explanation resolves the question;
- how the result contributes to the lecture.

Avoid questions that merely disguise a definition.

Weak:

> What is an ORM?

Students who have never met one can only guess.

Stronger:

> How many database queries will this loop execute?

Show a short application loop. Students can reason about possible access patterns, and the ORM's loading behavior then becomes consequential.

Likewise, avoid a question whose answer is already visible elsewhere on the slide.

Keep the question visible while students deliberate. Reveal the decisive evidence or the conclusion afterward.

Do not overuse question titles.
Once the audience holds a concept, later slides can use assertion titles and develop more sophisticated applications.

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

Progressive disclosure is a relationship between the slide's realized state sequence and the speaker's delivery. A proposed sequence is not an animation until it has actually been encoded in the presentation.

Use animation when successive states help the audience understand the idea: revealing successive elements of a process, shifting attention among parts of a model, or accumulating evidence. Do not animate merely because content can be revealed one bullet at a time.

An earlier state may remain visible but de-emphasized when the audience still needs it for context, and may disappear when it has completed its job. When several states or examples remain visible together, restrained borders can make the grouping and current focus legible.

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

## Comparisons should expose the choice

When a slide teaches an alternative, pattern, design, or mechanism whose value
depends on what it is being compared with, show the meaningful alternative.

Prefer:

    recurring problem → alternative A / alternative B → consequences → tradeoff

over:

    named pattern → diagram → list of advantages and disadvantages

The comparison should make visible why a reasonable engineer might choose
either alternative. Do not present a catalogue of named solutions when the
learning objective is engineering judgment among them.

Keep alternatives visually comparable. Do not use layout, color, checkmarks,
or other emphasis to imply that one alternative is preferred unless the
argument actually establishes that preference.

### Make the decision conditions visible

An engineering comparison should name the requirements or assumptions that decide which alternative wins.

Comparing a modular monolith with independently deployed services is incomplete without team ownership,
deployment independence, coordination costs, and shared-state obligations.

A useful comparison contains:

    ENGINEERING REQUIREMENT
             |
             v
        ALTERNATIVES
           /    \
          A      B
           \    /
             v
       CONSEQUENCES
             |
             v
          JUDGMENT

The alternatives should each be credible under some assumption.

When practical, ask students to make a provisional choice before revealing all the consequences.
Then change an assumption and ask whether their choice changes.

Conditions worth varying:

- One development team becomes two independently releasing teams.
- A prototype becomes a long-lived production system.
- Cached data becomes authoritative data.
- A release changes shared database state.
- Implementation becomes cheaper while validation stays expensive.

The purpose is conditional engineering judgment, not a universally preferred technology.

A comparison without decision conditions degenerates into a catalogue of advantages and disadvantages.

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

### Preserve the assumptions that make a teaching example true

Simplification may remove incidental detail. It must not remove a condition the explanation depends on.

When a technical claim holds only under stated assumptions, make those assumptions visible at the point
where they affect interpretation.

- Little's Law relates average occupancy, throughput, and response time; predicting latency from offered load needs an additional model.
- A canary limits initial exposure to a version. It may not limit the consequences of writes to shared state.
- A database enforces the constraints it was given. It does not know application-specific invariants nobody declared.
- A dependency inventory establishes presence, not reachability or exploitability.

Distinguish a simplified model from an actual system.
Label hypothetical measurements and costs as illustrative.

Simplify the representation without changing the claim.

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

## Do not state the same conclusion three times

An assertion title, a technical figure, and a concluding annotation can work together.
They must not state one claim three times.

Give each visible element a distinct role:

- **Title** — identifies the question, claim, or relationship under examination.
- **Evidence** — shows the mechanism, example, measurement, or comparison.
- **Conclusion** — adds a consequence, qualification, generalization, or decision criterion not already expressed. **A conclusion is optional.**

A conclusion that earns its place:

    Title:      Application data can outlive the application
    Figure:     in-process data vs a separate persistent data service
    Conclusion: Separating data from execution creates new engineering choices

That conclusion advances from the observed difference to its engineering consequence.

A redundant one:

    Title:      SQL can combine related information
    Figure:     a JOIN returning reservations and room names
    Conclusion: The database can fetch related rows in one query

That conclusion repeats what the title and the example already establish.

Do not add a bottom banner merely to fill a recurring slide layout.

Before keeping a concluding statement, ask:

1. Does it add a distinct technical proposition?
2. Is that proposition useful at this point in the lecture?
3. Is it already expressed by the title, the figure, or an annotation?
4. Would deleting it lose information or an inference?

Do not replace a deleted conclusion with a differently worded repetition.

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

### Need test

Why does the audience need this now, and what can they explain, predict, or decide afterward that they
could not before?

If the only answer is "it is true," the slide states a fact without doing a job.

### Role test

Is this slide posing a question, running an investigation, or establishing a conclusion — and does its
title match that role rather than contradict it?

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

### Assumption test

Has simplification removed a condition the slide's stated conclusion depends on?

A slide that fails one of these tests may still be correct—the principles have boundary conditions—but the failure should be deliberate rather than accidental.
