---
title: Specification
readings:
  groups:
    - heading: Foundations
      items:
        - '["Four Dark Corners of Requirements Engineering."](https://doi.org/10.1145/237432.237434) Zave and Jackson, 1997. A classic treatment of the relationships among requirements, environmental assumptions, specifications, and implementations. Pay particular attention to the distinction between what we require of the world and what we specify of the machine. Full citation: Pamela Zave and Michael Jackson, "Four Dark Corners of Requirements Engineering," *ACM Transactions on Software Engineering and Methodology* 6, no. 1 (1997): 1–30.'
    - heading: Specifications in practice
      items:
        - '["Software Requirements for the A-7E Aircraft."](readings/software-requirements-for-the-a7e-aircraft.pdf) Alspaugh, Faulk, Britton, Parker, Parnas, and Shore, 1992. A substantial real software requirements specification — the Software Cost Reduction (SCR) method applied to a real-time embedded avionics system. Skim rather than reading linearly: look at the different representational forms (natural language, tables, timing constraints, mode/subset structure, and descriptions of expected change) and ask why each form is used where it is. Full citation: Thomas A. Alspaugh, Stuart R. Faulk, Kathryn Heninger Britton, R. Alan Parker, David L. Parnas, and John E. Shore, "Software Requirements for the A-7E Aircraft," NRL/FR/5530-92-9194 (Washington, DC: Naval Research Laboratory, 1992).'
    - heading: Modeling and representation
      items:
        - '{mage:2.1} Davis, 2026. Introduces models as purposeful reductions: representations chosen to make particular engineering questions tractable. Develops the distinction between consequential obligations and realization degrees of freedom, and asks what should be represented explicitly rather than left to repeated reconstruction.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials: []
---

**Premise.** *Requirements tell us what matters; specification makes enough of that intent explicit to build, reason about, and evaluate a system — and the boundary between the two is not clean.*

Requirements engineering asks what the system should accomplish and what obligations it should satisfy. Specification turns those obligations into representations precise enough to support engineering work.

But stated requirements are never complete. They leave assumptions unstated, terms underspecified, and implementation choices apparently open. Some of those choices are genuine degrees of freedom: the customer does not care how they are resolved. Others conceal tacit requirements: choices that appear free until an implementation violates something the customer actually needed.

Specification therefore does more than record requirements already discovered. Trying to specify a system is itself a way of discovering requirements.

## From requirements to specifications — and sometimes back again

A requirement rarely determines a complete implementation. "Search results should return quickly," "users must be able to withdraw consent," and "the system must recover safely after failure" all express consequential intent while leaving substantial questions unanswered.

Specification forces us to confront those gaps. What counts as quickly? Which users and operations are covered? What happens to previously collected data after consent is withdrawn? What states may the system enter after failure?

Some answers simply choose among acceptable alternatives — genuine degrees of freedom. Others expose facts that matter to stakeholders but were never stated; these are not really free choices at all, but missing or tacit requirements. Requirements, specification, and the assumptions they expose therefore form a loop: **requirements → specification → exposed assumptions and choices → requirements.**

The objective is not to eliminate every degree of freedom. It is to determine which distinctions matter, make those explicit, and deliberately leave the rest open.

## Choosing a representation

There is no single correct form for a software specification. Different forms expose different obligations:

- **Natural language** is flexible and broadly understandable, but can leave ambiguity.
- **Tables and structured templates** can expose cases and alternatives.
- **Schemas and interface definitions** make structural obligations explicit.
- **State machines** expose legal behavior.
- **Formal specifications** can make selected properties precise enough for mathematical or mechanical analysis.

A useful representation is a purposeful reduction: it preserves the distinctions needed for an engineering question and suppresses details that do not matter to that question. Different questions about the same system may therefore require different representations; MAGE calls the choices deliberately left open *degrees of freedom*.

The difficulty is that we do not always know in advance which distinctions matter. Modeling may reveal that something treated as a free implementation choice affects customer value, usability, safety, compatibility, regulation, or some other obligation. When that happens, the answer is not merely to make the specification more detailed — we have learned something new about the requirements. More detail is therefore not automatically a better specification: the goal is sufficient precision to preserve consequential intent while avoiding unnecessary constraints on realization.

## Specifications describe a world, not just software

Software does not operate in isolation. Many requirements concern relationships between the software and its environment: what users do, what information arrives, what assumptions hold, and what effects the system should produce in the world.

This makes it important to distinguish requirements about the environment from specifications of the machine we will build. A machine specification is useful only insofar as, under appropriate assumptions about its environment, satisfying it helps produce the required effects.

This distinction also exposes a common failure: specifying software precisely without establishing that the specified software would actually satisfy the underlying requirement.

## Correspondence and change

A specification can be excellent and still become wrong.

Requirements change, implementations change, assumptions change, and representations drift apart. Engineering therefore needs some account of correspondence: which requirement a specification realizes, which implementation realizes a specification, and whether those relationships still hold.

Depending on the representation, correspondence may be maintained through traceability, validation, derivation, generation, tests, or other checks. Precision makes more questions checkable; it does not by itself guarantee that the specification is correct or that the implementation follows it.
