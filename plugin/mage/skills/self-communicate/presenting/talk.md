# talk.md — design the talk before the deck

This is an **agent-facing** resource for designing a talk as an intellectual and temporal object.
Read it before opening PowerPoint or choosing slide layouts.

A **talk** is the sequence of changes you intend to produce in an audience's understanding.
A **slide deck** is one visual realization of that talk; it is not the talk itself.
A strong deck cannot rescue an argument that has no destination, and a strong talk can often survive with very few slides.

The foundations behind this guidance come from several traditions.
Michael Alley supplies assertion–evidence thinking for technical presentations; Richard Mayer supplies principles from multimedia learning and cognitive load; Edward Tufte supplies information integrity and economy; Mike Morrison's Better Poster work emphasizes acquisition under real viewing conditions; Barbara Minto contributes argument hierarchy; and Nancy Duarte contributes useful patterns of contrast and tension.
These are inputs, not mandatory templates.
Use the principle that fits the communication problem.

## Start with the audience transformation

Before drafting slides, answer:

- Who is the audience?
- What do they already know?
- What should they understand, believe, distinguish, or be able to do afterward?
- What is the governing question or claim?
- What prerequisite concepts must be established before the main argument can work?

A talk should have a destination.
"Cover chapters 3–5" or "talk about testing" names content, not a destination.

Prefer a formulation such as:

> By the end, the audience should understand why implementation capacity can cease to be the limiting resource in software engineering, and what engineering activities become relatively more important when that happens.

The destination need not be persuasion.
A lecture may aim to establish a mental model, teach a procedure, expose a design space, or give students enough structure to solve a problem themselves.

## Build the argument before the sequence

Identify the governing claim or question and the claims needed to support or answer it.

Minto's Pyramid Principle is useful here: supporting ideas should form a hierarchy rather than a pile.
Her Situation → Complication → Question → Answer pattern is one useful way to open an argument, but it is not a universal presentation template.

Ask of each major point:

1. Why does the audience need this?
2. What does it depend on?
3. What later reasoning depends on it?
4. What evidence or example earns the claim?

Organize by logical dependency rather than by the chronology in which you discovered the material.

## Divide the talk into movements

A long talk should contain a small number of meaningful **movements**: portions of the talk in which the audience's model changes in a coherent way.

Examples:

- establish the existing model;
- expose a problem with it;
- examine evidence;
- introduce a replacement model;
- apply the model;
- synthesize consequences.

The labels are descriptive, not prescribed.

Mayer's **segmenting** principle supports this: complex material is easier to process when divided into meaningful units.
His **pre-training** principle adds a second rule: establish the names and basic behavior of important components before asking the audience to reason about their interactions.

Allocate time by intellectual importance and cognitive difficulty, not by the number of topics in the outline.

## Presentation moves — operations on the audience's model

These moves are a toolkit, not a required sequence.
A move may occupy one slide, several slides, speech alone, a demonstration, or an audience activity.

### Orient

Give the audience enough structure to interpret what follows.

Use orientation to establish context, the governing question, prerequisite vocabulary, or the audience's current location in a larger argument.

Do not repeatedly show an agenda merely because a template contains one.
Orient when orientation does work.

### Assert → Evidence

Make a consequential claim, then provide something by which the audience can judge it.

This is the talk-scale form of Alley's assertion–evidence model.
Evidence may be a measurement, figure, photograph, quotation, demonstration, code fragment, worked example, or other inspectable artifact.

Do not ask the audience to accept a technical claim merely because the speaker says it confidently.

### Instantiate

Give an abstraction a concrete instance.

Useful forms include:

- worked example → general principle;
- concrete failure → failure class;
- physical analogy → engineering concept;
- actual artifact → abstract model.

A concrete anchor often belongs before the abstraction it supports.
When using analogy, state its operational meaning and its boundary; resemblance alone is not evidence.

### Contrast

Place two states, models, alternatives, or outcomes where the consequential difference becomes visible.

Examples include:

- current state ↔ possible state;
- expectation ↔ observation;
- before ↔ after;
- abundant ↔ scarce;
- design A ↔ design B.

Duarte's "what is / what could be" pattern is one useful instance.
Do not manufacture contrast when the material does not contain one.

### Pose → Resolve

Let the audience encounter a question, failure, puzzle, or objection before giving the resolution.

Examples:

- question → answer;
- failure → mechanism;
- objection → response;
- surprising result → explanation.

This can produce useful reasoning time.
Avoid dramatized withholding when the audience gains nothing from attempting the problem.

### Decompose

Expose the meaningful parts of a whole.

Use for architectures, taxonomies, mechanisms, lifecycles, layers, and causal chains.
Prefer a representation that makes the decomposition visible rather than a spoken inventory of components.

### Relate

Expose the relationship among established objects.

Typical relations include:

- cause and effect;
- dependency;
- flow;
- hierarchy;
- feedback;
- correspondence;
- constraint.

A diagram often earns its place here because the relationship, not the individual objects, is the content.

### Accumulate / Build

Introduce complexity incrementally while preserving an established frame.

Add one component, edge, path, state, or consequence at a time when simultaneous presentation would overload the audience.
Each addition should do conceptual work.
Animation whose only contribution is motion is not a build.

### Quantify

Give magnitude perceptual force.

Use an appropriate number, comparison, distribution, trend, benchmark, or scale.
Preserve enough evidence to make the quantitative claim honest; a large decorative number is not a substitute for evidence when the distribution or denominator matters.

### Synthesize

Combine concepts the audience already holds into a new usable representation: a matrix, framework, decision rule, summary model, or derived principle.

Synthesis is not recap.
It compresses or advances prior reasoning.

### Transition

Establish why the next movement follows.

Most transitions belong in speech.
A transition slide earns itself when the change of frame is important enough that the audience should notice and retain it.

## Concrete before abstract

Where practical, give the audience something to reason from before naming the generalization.

Useful sequences include:

- example → abstraction;
- evidence → conclusion;
- failure → mechanism;
- observed behavior → model;
- analogy → operational meaning → boundary.

Do not turn this into a rigid rule.
Sometimes a short definition is the prerequisite that makes the example intelligible.
The test is whether the ordering reduces the audience's inferential burden without teaching a false model.

## Progressive density

A talk can become denser as the audience learns its vocabulary.

- Introduce an important concept fully once.
- Give it a stable name.
- Reuse that name.
- Later, invoke the concept rather than reteaching it.
- Compose established concepts into more sophisticated reasoning.

This is not permission to increase visual clutter.
The **ideas** can become denser because the audience now holds more handles.

## Speech and visuals divide the work

Slides and speech are coordinated channels, not duplicate representations.

Put on screen what the audience benefits from **seeing**:

- evidence;
- structure;
- comparison;
- exact wording;
- a persistent conceptual anchor;
- vocabulary worth retaining.

Use speech for what the audience benefits from **hearing in sequence**:

- connective reasoning;
- interpretation;
- qualification;
- anecdote;
- emphasis;
- transitions.

Mayer's multimedia-learning work motivates this division.
In particular, routinely printing the speaker's narration over a graphic can create unnecessary competition for visual processing.

Do not turn the slide into a transcript.
Do not force an important exact statement into speech alone when the audience needs to inspect or retain its wording.

## Activities are part of the talk

Audience activity is not dead time between slides.
It can be the mechanism by which the audience performs the reasoning the talk is trying to teach.

Useful forms include:

- prediction before evidence;
- show-of-hands vote;
- think/pair/share;
- classify examples;
- work a small design problem;
- critique an artifact;
- demonstration;
- derive a model from a scaffolded case.

Specify the activity's intellectual job.
"What should students know after discussing this that they did not know before?" is a better design question than "Where can I add engagement?"

## Pacing

Budget time at the movement level.

- Important evidence may need to sit.
- A difficult conceptual transition often needs more time than an orientation slide.
- Activities need explicit time.
- A slide count is not a time estimate.
- Identify material that can be compressed or skipped without breaking the argument if time slips.

A pause is sometimes part of the representation.
Do not fill every second with narration.

## Audit the talk

Before realizing the talk as a deck, ask:

- Can the governing question or claim be stated in one sentence?
- What should change in the audience's model during each movement?
- Does each movement earn the next?
- Are prerequisite concepts established before use?
- Does the audience encounter evidence for consequential claims?
- Are concrete anchors available for difficult abstractions?
- Are activities doing intellectual work?
- Does repetition compress, connect, or advance rather than merely recap?
- Is time allocated according to importance and difficulty?
- Could the talk still be explained coherently without the deck?

If the last answer is no, repair the talk before polishing slides.
