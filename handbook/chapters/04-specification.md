---
id: specification
title: Specification
short_title: Specification
order: 4
status: draft
description: >
  A specification makes accepted requirements actionable by bounding what an acceptable realization
  may do, without unnecessarily deciding how it must be built. Good specification is judgment about
  what to constrain and what to leave open.
objectives:
  - Distinguish a requirement from a specification and the domain assumptions that connect them.
  - Explain how a specification bounds acceptable realizations without prescribing an implementation.
  - Classify an unconstrained choice as unknown, tacit, or a genuine degree of freedom.
---

**Premise.** *Requirements describe what must be true. A specification makes those requirements
actionable by constraining what an acceptable realization may do — without unnecessarily deciding how
it must be built.*

::: {.definition #def-specification title="Specification"}
A specification establishes a boundary around the realizations that would be acceptable. It makes
consequential distinctions explicit while preserving choices whose alternatives are genuinely
acceptable. It need not select one implementation.
:::

Requirements rarely determine a unique implementation. Many different realizations may satisfy the
same stated requirement, while other apparently reasonable realizations violate distinctions that
stakeholders care about. Specification makes those consequential boundaries explicit.

This does not mean specifying everything. Some implementation choices are genuine degrees of freedom:
alternatives we are willing to accept. Others are unknown or conceal tacit requirements. Good
specification therefore requires judgment about both what to constrain and what deliberately to leave
open.

## From requirements to acceptable realizations {#sec-acceptable-realizations}

Requirements (@ch-requirements) and specifications describe different things. A requirement expresses
a desired property of the world; a specification constrains the machine we will build. Following Zave
and Jackson [@zave1997darkcorners], domain assumptions connect the two: under appropriate assumptions
about the environment, satisfying the machine specification should produce the required effect in the
world.

That distinction matters because a requirement such as "users are warned before illness affects their
day" does not yet tell an implementor enough to determine acceptable machine behavior. How is illness
inferred? When is an advisory emitted? What information is available at the machine boundary?
Different answers may produce substantially different products while satisfying the original sentence.

A specification therefore establishes a boundary around acceptable realizations. It need not select
one implementation. The objective is to make consequential distinctions explicit while preserving
choices whose alternatives are genuinely acceptable.

## Case study: the A-7E specification {#sec-a7e}

Alspaugh and colleagues' *Software Requirements for the A-7E Aircraft* shows what this looks like in a
substantial real system. The specification does not rely on one universal notation. It combines prose,
defined data, mode-transition tables, timing constraints, descriptions of required subsets, and
explicit discussion of expected changes.

Three features are especially instructive.

1. The specification constrains detailed externally visible behavior without prescribing the code that
   produces it. Modes, conditions, events, and required responses make behavioral cases inspectable
   while leaving realization choices open.
2. The specification requires the system to support useful subsets. Functionality can be added or
   removed while preserving the retained subset, ruling out realizations whose behavior is correct
   only when the complete system is assembled. A specification-level obligation can therefore have
   architectural consequences without prescribing one architecture.
3. The document distinguishes assumptions designers may treat as stable from changes they should
   anticipate. Expected change is itself engineering information: two implementations that behave
   identically today may differ substantially in how well they accommodate tomorrow's expected
   changes.

## From case to principle: one system, many views {#sec-many-views}

The heterogeneous representations in the A-7E specification illustrate a more general modeling
principle: a model is a purposeful view. It preserves the distinctions needed to answer an engineering
question and suppresses details that do not matter to that question.

Different questions about the same system therefore call for different representations. A state model
can expose legal states and transitions. An activity or sequence model can expose required ordering. A
table can expose combinations of cases, values, and bounds. A schema can constrain the shape of
information crossing the machine boundary.

The pattern is: engineering question → representation → property → analysis or check.

::: {.definition #def-invariant title="Property and invariant"}
A property is a claim expressible over the model. An invariant is a property required to hold over its
declared domain. A representation does not create the obligation; it gives engineers a vocabulary in
which the obligation can be stated, examined, and sometimes checked.
:::

No single representation needs to say everything. The same system may have several peer views
connected through shared concepts. Hold the system constant, change the engineering question, and the
useful model may change with it.

## Specification and degrees of freedom {#sec-degrees-of-freedom}

Every additional obligation rules out some possible realizations. More specification is therefore not
automatically better specification: narrowing the acceptable space is valuable only when the
eliminated alternatives matter.

An unconstrained choice can have three importantly different meanings.

- **Unknown** — we do not yet understand the consequences well enough to decide.
- **Tacit** — a consequential boundary exists, but it has not been made explicit.
- **Free** — the alternatives are genuinely acceptable.

Only the third is a deliberate degree of freedom. A useful diagnostic for tacit requirements is the
reaction "not that." If an apparently permitted realization provokes that response, some consequential
boundary existed outside the specification.

Software's changeability makes this distinction especially important. Many software choices can remain
inexpensive to revisit after an initial realization, so premature constraint can destroy useful
optionality. Overspecification converts cheap future choices into expensive present commitments.
Conversely, implementation and use can expose distinctions that were not previously understood: build,
observe, learn, and then constrain the choice if the difference proves consequential.

::: {.decision #decision-constrain-or-leave-open title="Constrain, leave open, or explore?"}
**Constrain** when alternatives differ consequentially.

**Leave open** when the alternatives are genuinely acceptable.

**Explore** when you do not yet know which is true.
:::
