# Documentation, taken to its limit, is a structured model

**Claim** — A context-bounded agent can't hold the whole system. Externalize what it must know into structured, drift-checked models, purposeful compression, and the reasoning fits the window.

| Concept | Big idea 3 · Thesis 1 |
| --- | --- |
| Claim | A context-bounded agent can't hold the whole system. Externalize what it must know into structured, drift-checked models, purposeful compression, and the reasoning fits the window. |
| Mechanisms | Executable source-of-truth models · Drift & parity gates · Component & zone model · PdfModel · Office Models |
| Related | Give intent authority: constrain, sense, validate, gate · The Engineered Environment |
| In the book | book/2.1-context-is-the-first-modeling-problem.html |

## The idea

<!-- fig: 0 -->

Start with the constraint. A foundation model reasons through a bounded context and rebuilds its picture of
the system on every task. Software engineering is a long-horizon task: the reasoning state a real change
needs — the interfaces it touches, the invariants it must not break, the way the pieces compose — outruns
the working memory that has to hold it. So that state gets compressed and reconstructed, over and over, and
every lossy round trip degrades the reasoning it stands in for.

A model answers that chain at its source, and the reason is **purposeful compression**: keep the
relationships an engineering question actually needs — subsystem, interface, invariant, workflow — and
discard the rest. Each reconstruction then restores more of what mattered, because a model re-expresses the
system at a higher level where the irrelevant implementation detail has already been dropped. The reasoning
horizon the human–agent system can hold stretches out.

<!-- fig: 1 -->

This is what "documentation, taken to its limit" means. A README is prose a human skims; push it until an
agent must reason from it on every change, and it becomes typed data that tools read and generate from — a
model, not a document.

<!-- more -->

## Modeling is representation; Alignment is authority

Keep the two theses distinct. A model helps an engineer think and an agent navigate, but nothing forces the
code to obey it — a model has no authority of its own. That is Alignment's job, and it does not wait on
Modeling: where a property is already legible, authority can act directly, and a constraint the compiler
enforces needs no model at all. The relationship runs one way and softly. Richer models do not command
Alignment; they *enlarge the surface* it can govern, by making more properties explicit enough to constrain,
sense, validate, or gate. Representation widens what authority can reach.

## Why it's more than a tidier README

A tidier README is still prose, and prose drifts because nothing forces it true. It is read occasionally
and validated never, so a drifted doc lies quietly while the code moves on. A structured model is
executable: tools, lints, and deploy scripts read it on every run, so the build fails the moment it
diverges from the code. Drift surfaces as a red build, not a stale paragraph nobody reopened.

The other difference is the reasoning horizon. However tidy, a README still asks the agent to reconstruct
the system from implementation-level prose — the state it must hold stays large. A model changes the
*level* the reasoning happens at, so the state that must survive each compaction is smaller and richer.
That is leverage no amount of tidying gives you. The bound is honest, though: a model moves the wall, it
does not remove it — a finite reasoner still has a finite horizon.

## In practice

Every mutation of a PDF routes through a single typed model with a ban-lint on the raw library, so an agent
reasons about "add a tag" at the model level instead of the byte level. A component-and-zone model names
the subsystems and the boundaries between them, so the fleet reasons over a map of the architecture rather
than re-deriving it from code each task. A drift-parity gate holds each model equal to the code it
describes. The prose lives in markdown; the structure lives in the model; the gate keeps the two from
parting.

## The mechanisms that instantiate it

- [Executable source-of-truth models](models-bridge/system-models/executable-source-of-truth.md)
- [Drift & parity gates](models-bridge/system-models/drift-parity-gates.md)
- [Component & zone model](models-bridge/system-models/component-zone-model.md)
- [PdfModel](product/canonical-models-and-seams/pdf-model.md)
- [Office Models](product/canonical-models-and-seams/office-models.md)

## Related concepts

- [Give intent authority: constrain, sense, validate, gate](concept-alignment-thesis.md)
- [The Engineered Environment](concept-governance-centric.md)

## Read in the book →

[Read in the book →](book/2.1-context-is-the-first-modeling-problem.html)
