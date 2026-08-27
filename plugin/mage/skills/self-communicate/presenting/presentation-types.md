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

### Lecture audit

Ask:

- What can students understand or do afterward that they could not before?
- Where do they perform meaningful reasoning?
- Are prerequisites established before composition?
- Are examples doing conceptual work?
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
