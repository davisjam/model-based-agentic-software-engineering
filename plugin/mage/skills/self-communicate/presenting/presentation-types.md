# Presentation Types

Presentation type changes the objective, evidence structure, pacing, and role of the audience.

Use the general principles in `talk.md`, `deck.md`, and `slide.md`; use this file to specialize them for the presentation being built.

Types are not templates. A particular presentation may blend types.

## Lecture

### Governing objective

A lecture exists primarily to **change what students can understand or do**, not merely to transmit information.

Design around the desired learning state:

- What should students understand afterward?
- What distinctions should they be able to make?
- What reasoning should they be able to perform?
- What prerequisite concepts must they acquire first?
- What should they encounter in class that reading alone would not provide?

Coverage is not a learning objective.

### Opening convention

A lecture begins with a cover, then the intellectual problem that motivates the lecture.

The preferred opening is:

    Slide 1 — Cover
    Slide 2 — Motivating problem, question, or concrete phenomenon
    Slide 3 — Orientation, when useful

The cover identifies the module and establishes its identity.

The motivating problem should give the audience something it can reason about. It may be a failure, a
change request, an observation, a comparison, a design choice, or a consequential question.

For example:

    Our reservation service works on one laptop.
    What must change before 500 students can use it?

The instructor may collect initial answers before introducing the engineering framework that organizes
them.

The opening should establish:

1. What problem are we investigating?
2. Why does it matter?
3. What must the audience learn to reason about it?

A module outline stays useful when the audience needs a map of several substantial movements. When one is
used, it should describe the intellectual progression rather than list topics.

Prefer:

    What changed?
    Engineering under abundant implementation
    Modeling
    Alignment
    What this means for software engineering

over:

    Introduction
    Part 1
    Part 2
    Activity
    Conclusion

The outline is an orientation model for the audience. Its vocabulary should agree with the deck's native
Sections and with the movement names used throughout the talk. Return to the outline later only when doing
so provides useful orientation; do not mechanically redisplay it between every section.

**Do not require an outline to occupy Slide 2** when doing so would interrupt a stronger problem-first
opening. A definition or conceptual framework may also precede the motivating problem when students
genuinely need it to interpret the example. Choose the order that supports reasoning rather than enforcing
a fixed slide template.

Research talks keep their own Slide 2 convention; see "Put the contributions on slide 2" below.

### Design around a learning progression

Prefer a sequence in which students acquire conceptual handles before being asked to compose them.

Common useful progressions include:

- concrete case → observation → abstraction → application;
- problem → attempted solution → failure → improved model;
- prediction → evidence → explanation;
- worked example → guided example → independent application;
- existing intuition → counterexample → refined intuition.

These are available patterns, not prescribed structures.

Use Mayer's pre-training and segmenting principles aggressively: establish names and basic concepts before requiring reasoning across them.

### Make students reason

A lecture should not default to 75 minutes of conclusions already worked out by the instructor.

Look for places where students can:

- predict an outcome;
- propose a solution;
- classify examples;
- identify what information is missing;
- critique a design;
- derive part of a model;
- apply a principle to a new case.

When practical, **pose before resolving**. Give enough scaffolding that the reasoning is productive rather than guessing.

### Establish prerequisites before demanding their use

Problem-first teaching does not mean asking students to reason with concepts they have never encountered.

For each substantial question or exercise, distinguish:

- **Known concepts** — knowledge the audience has already acquired.
- **New concepts** — knowledge the lecture intends to establish.
- **Reasoning task** — what students can productively infer using the known concepts.
- **Resolution** — the additional model, technique, or evidence that makes the problem tractable.

A question may precede the formal introduction of a concept when students can reason from an accessible
example. Do not expect them to apply unfamiliar terminology, mechanisms, or notation before those
prerequisites exist.

For example, students who have never met an object-relational mapper cannot predict the database
operations an ORM-based loop generates. First establish that an ORM translates application operations into
database queries, and that related objects may be loaded lazily. Then ask students to predict the query
count for a concrete loop.

Introduce the problem earlier when it supplies motivation. Place the substantive exercise where students
know enough to attempt it.

Productive uncertainty concerns the answer, not the meaning of the question.

Do not eliminate challenging questions. Supply the minimum prerequisites that make the challenge
intellectually meaningful.

This qualifies, and does not retract, Mayer's pre-training principle: naming the components first is what
makes the subsequent discovery productive.

### Explanation and activity form one sequence

Activities are instructional moves within the lecture.

For each activity specify:

- the question or task;
- what students already know that makes it answerable;
- expected time;
- likely answers or failure modes;
- what the instructor does with the answers;
- the concept the activity establishes or tests.

When students are actively working from a question, classification, design problem, example, or set of
constraints, keep the relevant prompt and necessary reference material visible unless removing it is
itself part of the exercise.

Do not add interaction merely for engagement.

### Use examples as working objects

Prefer examples rich enough to revisit.

An example can first establish a problem, later illustrate a mechanism, and later still become an application of the resulting model. Reuse reduces orientation cost and lets students observe how their interpretation changes.

Examples should be as small as practical without becoming artificial.

### Use a sustained engineering investigation

When a lecture develops several related concepts, prefer a running engineering problem over a succession
of unrelated examples.

A useful investigation contains:

1. **Initial condition.** Establish the system, requirements, and available evidence.
2. **Engineering difficulty.** Introduce a change, failure, uncertainty, or decision.
3. **Provisional reasoning.** Ask students what they would predict, investigate, or do.
4. **New model or technique.** Introduce the knowledge needed to improve the decision.
5. **Application.** Use that knowledge on the original problem.
6. **Complication.** Change an assumption or reveal additional evidence.
7. **Synthesis.** Establish what the engineer can now decide, and why.

This is a repertoire, not a mandatory seven-stage template.

A single running example may support several movements. In a data-management lecture, one reservation
service can motivate representation choices, expose unexpected database queries, and demonstrate
concurrency failures.

The example should evolve as the lecture progresses.

Avoid introducing a new example merely because a new topic begins. A new example earns its place when it
reveals a distinction the running example cannot.

### Make exercises part of the investigation

Do not routinely explain a technique completely and then ask students to reproduce the explanation.

Place student reasoning where it contributes to developing the technique.

For example:

- Ask students to identify possible failures before completing an FMEA table.
- Ask them to propose branches before revealing a fault tree.
- Ask them to design safe retry behavior before showing a race in the naive solution.
- Ask them to choose an architecture before revealing its distributed-systems costs.

An exercise may also follow instruction when its purpose is independent application, or transfer to a new
problem.

The distinction is between discovering a concept, practicing a concept, and testing whether the concept
transfers. Use each deliberately. `deck.md` gives the placement rule for the three purposes.

### Identify the engineering model

For a lecture about engineering decisions, identify the representation that makes the decision possible.

Distinguish:

- **Problem** — what must the engineer decide?
- **Model** — what representation captures the relevant properties and assumptions?
- **Judgment** — what alternatives or consequences does the engineer compare?
- **Realization** — what mechanism implements the selected decision?
- **Evidence** — what would establish that the result is acceptable?

**Do not confuse a model with a mechanism.** A workload model describes demand; a connection pool
implements a response to it. A threat model describes adversarial possibilities; an authorization check is
a control. A deployment topology describes component placement; a managed cloud service is one possible
realization.

A lecture may use several models. Give each one a clear purpose, and introduce it once the audience has
encountered the question it helps answer.

Do not force every slide into this five-part structure. The structure governs the engineering argument,
not the visual template.

### Distinguish teaching from reference material

The lecture need not reproduce the reading.

Use readings for material students can acquire effectively through self-paced inspection. Use class time for:

- difficult conceptual relationships;
- interpretation;
- demonstrations;
- examples;
- comparison;
- misconceptions;
- guided reasoning;
- application.

A lecture and its assigned reading should complement rather than transcribe one another.

### Blend with tutorial when appropriate

A lecture becomes tutorial-like when the learning objective includes performing a method.

For procedural or skill-oriented material:

1. establish what problem the method solves;
2. demonstrate the method on a concrete case;
3. expose the reasoning behind consequential steps;
4. let students perform a scaffolded application;
5. inspect the result;
6. vary the case enough to test whether the method generalized.

Avoid "click here, then click there" instruction unless operating the interface is itself the skill.

### Close with synthesis, not recap

The end should help students compress what they learned.

Useful closes include:

- derive a compact model;
- revisit the opening question;
- apply the new concept to the opening example;
- expose what the new model makes possible;
- establish the question that motivates the next lecture.

Avoid mechanically repeating the agenda and bullet points.

### Prepare a lecture design brief

Before constructing a lecture deck, prepare a short design brief. It is the artifact that demonstrates a
teaching sequence exists before anyone invests in slides.

| Element | Required content |
|---|---|
| Governing problem | The engineering question the lecture develops |
| Audience starting point | Relevant knowledge, assumptions, and likely misconceptions |
| Learning destination | What students should be able to explain, predict, or decide afterward |
| Running example | The system, failure, change request, or decision used to develop the material |
| Major movements | The successive questions that advance the investigation |
| Engineering models | The representations required to reason about those questions |
| Student reasoning | Where students predict, diagnose, compare, construct, or revise |
| Evidence and complications | What observations or counterexamples change their understanding |
| Synthesis | The engineering judgment students should be able to exercise |
| Timing | Approximate time for exposition, exercises, demonstrations, and discussion |

For each major movement, state the relationship between its problem and its model. A compact movement plan
may use:

| Movement | Question | Model or technique | Student reasoning | Result |
|---|---|---|---|---|
| Workload | Are equal request rates equally demanding? | Workload model | Compare request mixes | Request rate alone is insufficient |
| Capacity | Can we predict waiting time? | Queueing model | Predict behavior near capacity | Latency depends on capacity and variability |
| Diagnosis | Where is the system waiting? | Request traces | Identify the constrained resource | Select the next measurement |
| Improvement | What should we change? | Capacity and workload evidence | Compare interventions | Justify a performance change |

The brief is a planning instrument, not a slide template. Do not create one slide per row, and do not
reproduce the table in the finished deck.

For a revision, reconstruct the brief from the existing deck. Compare the intended sequence against the
actual slides, then repair the discrepancies.

### Lecture audit

Ask:

- What can students understand or do afterward that they could not before?
- Does the opening establish a problem students can reason about before the framework that organizes it?
- Does each major concept answer a question the audience has already encountered?
- Where do they perform meaningful reasoning, and does it occur before the answer appears?
- Are prerequisites established before composition?
- Are engineering models distinguished from the mechanisms that realize them?
- Are examples doing conceptual work, and does one running example carry the related movements?
- Does activity output feed back into instruction?
- Is class time being spent on things better taught synchronously?
- Does the ending synthesize the lecture into something reusable?

## Research Talk

### Governing objective

A research talk should enable the audience to understand and evaluate a **research contribution**.

By the end, the audience should understand:

- the consequential problem;
- why existing knowledge or capability is inadequate;
- the central idea or contribution;
- enough of the method to judge what was actually done;
- the evidence supporting the claims;
- important limitations and scope;
- why the result matters.

The objective is not to reproduce the paper.

### Put the contributions on slide 2

A MAGE research-talk deck begins:

    Slide 1 — Cover
    Slide 2 — Contributions

Slide 2 should convey, on a single slide, the knowledge or capability the work contributes. This is not an
outline of the talk. It tells the audience what this work brings before asking them to invest attention in
the argument and evidence that follow.

Prefer contributions stated as substantive advances:

    We show that ...
    We introduce ...
    We establish ...
    We find ...

over paper-structure descriptions:

    Background
    System design
    Evaluation
    Discussion

The contributions slide should answer: *what do we know, have, or know how to do because of this work that
we did not before?* Keep the complete contribution set on one slide — compress the wording, not the
contribution set, to make it fit.

The remainder of the talk should earn these claims through problem framing, mechanism, method, evidence,
qualifications, and consequences. The contributions slide is therefore an early contract with the audience:
these are the claims the talk will substantiate.

### Establish the problem at useful resolution

Give enough context that the contribution matters.

Prefer:

**concrete phenomenon or problem → why it matters → what is missing**

over a long survey of the field.

Related work belongs where it helps establish the gap, distinguish the contribution, or interpret evidence. It need not appear as a miniature literature-review section merely because the paper has one.

### State the contribution clearly

The audience should know reasonably early what the work contributes.

Distinguish:

- the problem;
- the proposed idea, system, or method;
- the research questions or claims;
- the evidence.

Do not make the audience infer the contribution from implementation details.

### Explain mechanism before detail

For systems and engineering research, establish the conceptual mechanism before exposing implementation complexity.

A useful progression is often:

**problem → key idea → mechanism → realization → evaluation**

Show architecture or workflow when it explains **why the approach should work**, not simply to prove that the system contains components.

### Treat evaluation as evidence for claims

Do not organize results merely by experiment number.

For each important claim:

1. state the claim;
2. show the evidence that bears on it;
3. explain what the evidence establishes;
4. expose material qualifications or counterevidence.

Alley's assertion–evidence structure is particularly appropriate here.

Prefer plots, examples, artifacts, and direct comparisons over bullet summaries of results.

### Preserve enough evidence to permit judgment

Tufte's information-integrity principles matter strongly in research talks.

Do not simplify away:

- baselines that affect interpretation;
- distributions when variance matters;
- denominators;
- meaningful negative results;
- scope conditions;
- important uncertainty.

The talk necessarily compresses the paper, but compression must not convert evidence into advertising.

### Allocate detail according to contribution

Spend presentation time where the intellectual contribution lives.

A novel conceptual mechanism may deserve several slides. Standard experimental plumbing may deserve one sentence. A surprising failure may deserve more attention than three expected positive results.

Do not allocate time according to paper section length.

### Use demonstrations and examples strategically

A concrete example can establish:

- the problem;
- how the approach operates;
- what changed;
- why the result matters.

A demonstration should provide evidence or understanding, not merely spectacle.

When live-demo risk outweighs its informational value, use a recorded or staged artifact.

### State limitations without ritual self-flagellation

Expose limitations that materially affect interpretation or generalization.

Distinguish:

- what was demonstrated;
- what is inferred;
- what remains unknown;
- where the approach is not intended to apply.

This increases credibility and helps a technical audience reason correctly about the contribution.

### End on the contribution and consequence

The close should compress the research argument:

**problem → contribution → evidence → consequence**

Do not end with a generic "Questions?" slide that erases the intellectual endpoint. Leave the central contribution or synthesis visible while taking questions.

### Research-talk audit

Ask:

- Can the contribution be stated in one sentence?
- Does the audience encounter the problem before needing to understand the solution?
- Is the mechanism understandable before implementation detail?
- Does each major claim have visible evidence?
- Is enough evidence preserved for a skeptical technical audience?
- Are limitations clear enough to bound the claims?
- Is presentation time proportional to intellectual importance?
- Does the final slide leave the audience with the contribution rather than an administrative ending?

## Blending Types

Types may blend.

A **research lecture** may use research-talk evidence discipline while giving students substantially more scaffolding and reasoning time.

A **tutorial lecture** may alternate explanation, demonstration, and student application.

Choose the governing objective first. Borrow characteristics from another type only when they help achieve that objective.

Do not blend types merely because the source material contains elements of both.
