---
id: software-engineering
title: "Software Engineering: The Engineering Discipline of Controlled Change"
short_title: Software Engineering
order: 0
status: draft
description: >
  Software is an unusually changeable engineered medium. Software engineering exploits that
  changeability while keeping consequential change under control, deciding what may change, what must
  remain true, and what evidence justifies confidence in the result.
objectives:
  - Define engineering as informed control over consequential systems and responsibility for outcomes.
  - Explain the properties that make software an unusual engineered medium.
  - Explain why changeability creates both leverage and risk, and what "controlled change" means.
---

**Premise.** *Software is an unusually changeable engineered medium. Software engineering exploits that
property while keeping consequential change under control.*

Software engineering begins with engineering.

::: {.definition #def-engineering title="Engineering"}
Engineering is the discipline of exercising informed control over consequential systems and accepting
responsibility for their outcomes. Engineers need not personally perform every act required to realize
a system. They must retain sufficient command to understand and direct it, evaluate the evidence for
its consequential properties, recognize when its assumptions fail, and intervene when necessary. They
remain answerable for the consequential decisions made under their authority.

— *Model-Based Agentic Software Engineering* [@davis2026mage]
:::

This definition places judgment and responsibility at the center of engineering rather than
fabrication. Engineers certainly build things, but building is a means rather than the defining
activity. An engineer decides what should be built, reasons about alternatives and their consequences,
determines what evidence is sufficient, and remains responsible when those decisions matter.

Software engineering applies that responsibility to a peculiar engineered medium.

## Programming over time {#sec-programming-over-time}

A useful starting point comes from *Software Engineering at Google* [@winters2020], which describes
software engineering as "programming integrated over time." The distinction is not simply that software
engineers write larger programs. It is that the artifact outlives the act of programming.

Consider a program written to solve a single problem. We decide what it should do, write it, run it,
obtain the result, and perhaps never touch it again. Programming may be all that is required.

Now extend the life of the artifact. Version 1.0 becomes 1.1, then 2.0 and 3.0. Defects are repaired.
Security problems emerge. Performance expectations change. New capabilities are added. Old ones become
unnecessary. The software is moved to new platforms and connected to systems that did not exist when it
was first written.

Meanwhile, the world around the software changes. Users discover new ways to use it. Engineers join and
leave the organization. Dependencies evolve. Regulations change. Competitors introduce new
capabilities. Assumptions that were reasonable when the system was created eventually become false. The
engineering problem is therefore not merely to produce a correct artifact once. It is to keep an
artifact useful as both the artifact and its environment change.

That problem is especially important for software because change is not merely something that happens
to software. The ability to change is one of the principal reasons we use software at all.

## Software as an engineered medium {#sec-engineered-medium}

Every engineering discipline works within the possibilities and limitations of its materials. Concrete
can carry enormous compressive loads. Steel can provide strength with comparatively small structural
members. Electronic circuits can process signals at speeds impossible for mechanical mechanisms. The
properties of the medium shape what engineers can build and how they build it.

Software has several unusual properties.

**Software is changeable.** Much of a software system can be altered without manufacturing a new
physical artifact. A behavior represented in code can often be modified, tested, and replaced far more
cheaply than a corresponding behavior fixed into hardware. This does not make every software change
cheap. Interfaces accumulate users, data representations accumulate data, architectural choices
constrain later work, and deployed systems acquire dependencies. But software gives engineers an
extraordinary range of decisions that can remain revisable after initial construction.

**Software is copyable.** Once an implementation exists, producing another copy costs almost nothing.
The engineering effort required to create the first instance need not be repeated for the millionth. A
successful software design can therefore be replicated at a scale unusual among engineered artifacts.

**Software is transferable.** Software behavior is not permanently tied to the particular physical
object on which it was first realized. The same program can often be transferred to another machine,
deployed in another location, or incorporated into another engineered system. Appropriate interfaces
and abstractions can separate a capability from much of the machinery underneath it.

**Software is updateable.** Engineering can continue after deployment. A system already in use can
receive new behavior, new rules, repaired defects, or adaptations to circumstances that did not exist
when it was released. Deployment is therefore not necessarily the end of construction. It can be one
point in a continuing engineering process.

These properties reinforce one another. Software can be copied widely and then updated. It can be
transferred to new environments and adapted to them. A capability can remain in service while engineers
continue to modify its realization. The result is a medium unusually suited to systems that must
change.

## We put change in software {#sec-change-in-software}

Modern engineered systems contain some decisions that should remain stable and others that we expect to
revisit. Where engineers have a choice, the latter increasingly migrate toward software.

Consider an automobile. Its physical dimensions cannot be changed remotely after it leaves the factory.
But software can alter how the powertrain responds to driver input, how the battery is managed, what
information is displayed, or how driver-assistance features behave. An industrial machine may have a
physical structure intended to last for decades while its control logic changes with products and
operating conditions. Communications infrastructure, aircraft, medical devices, scientific instruments,
and energy systems similarly combine relatively stable physical machinery with software that supplies
adaptable behavior.

Software also creates engineered systems with almost no visible physical counterpart: search engines,
financial systems, social networks, operating systems, databases, business applications, and cloud
services. Their purposes differ enormously, but they exploit the same basic property. Behavior
represented in software can be revised as needs and circumstances change.

Software engineering is therefore not merely the engineering discipline for producing programs. It is
increasingly the discipline through which other fields make parts of their own engineered systems
adaptable. That is a remarkable advantage, and it is also the source of the central engineering
problem.

## Software gives engineers unusual leverage {#sec-leverage}

Software's copyability has another consequence: a single engineering decision can affect an
extraordinary number of people.

Most physical engineering is constrained by the number of artifacts that can be built or modified. A
civil engineer can make a consequential decision about a bridge, but changing that bridge does not
automatically change every other bridge in the world. Manufacturing can replicate a physical design at
scale, but doing so still requires material, production, transportation, and installation for each
additional artifact.

Software behaves differently. Once a change has been made, the cost of propagating it can be tiny
compared with the cost of creating it. An engineer can modify one codebase and, through an update or
deployment, alter software running on millions or even billions of devices. A change to a cloud service
can affect its entire user population at once. The distance between an individual engineering decision
and its effects on the world can therefore be remarkably short.

::: {.note title="Software engineering has unusual leverage"}
A software engineer need not personally construct a million artifacts to affect a million systems.
Copyability and updateability allow one engineering decision to be reproduced across the entire deployed
population.
:::

This leverage is one reason software engineering carries substantial responsibility even when the
artifact itself seems intangible. A small team, or sometimes a single engineer, can make decisions
whose consequences rival those of enormous physical engineering efforts. The same mechanism that lets a
beneficial repair reach every deployed instance can propagate a defect, vulnerability, or mistaken
assumption just as efficiently.

## Change creates risk {#sec-change-creates-risk}

A system that is easy to change is also easy to change incorrectly.

A new feature can violate an old requirement. A repair in one component can break an assumption made by
another. An apparently harmless dependency can undermine a security boundary. A new data representation
can make old data unreadable. A performance optimization can weaken reliability. A library update can
alter behavior throughout a system. An engineer solving today's problem can unintentionally destroy a
decision made years earlier for reasons the engineer no longer knows.

The more widely software is copied, the farther a defective change can propagate. The more
interconnected software becomes, the more consequences a local change can have elsewhere. The more
frequently software is updated, the more often the system is exposed to the possibility of unintended
change.

This creates a tension at the center of software engineering. We want software to remain easy to change
because changeability is one of its greatest advantages. But we also need important properties to
survive those changes.

::: {.definition #def-software-engineering title="Software engineering"}
Software engineering is the engineering discipline of controlled change in software systems. It creates
and evolves software while preserving sufficient control over the properties and consequences that
matter.
:::

"Controlled" does not mean preventing change. Nor does it mean deciding every detail in advance. Quite
the opposite: good software engineering often preserves choices deliberately so that they can be made
later, when more information is available and the cost of commitment is justified. Control means knowing
which changes are acceptable, which properties must survive them, where freedom is useful, what evidence
we require, and when a proposed change forces us to reconsider an earlier decision.

The chapters that follow examine different parts of that problem. Requirements engineering asks what
outcomes matter enough to become engineering commitments. Specification determines what those
commitments mean precisely enough to constrain acceptable realizations. Architecture organizes a system
so that its obligations can coexist and so that expected changes do not require reasoning about
everything at once. Design resolves the choices that remain within that organization. Validation asks
what evidence justifies believing that the resulting system is acceptable. Maintenance and evolution
continue the process as the system and its environment change. Software process, to which we turn next,
asks how to organize all of this work.

## Technology moves the bottleneck {#sec-bottleneck}

The engineered medium itself also changes over time. New technologies make capabilities that were once
expensive comparatively abundant, and engineering reorganizes around the constraints that remain.

The steam engine made mechanical power available at a scale that human and animal labor could not
provide. Factories greatly expanded physical production. Integrated circuits made computation
extraordinarily inexpensive. These developments did not eliminate engineering. They changed its
economics. As one capability became abundant, problems elsewhere in the system became relatively more
important: controlling the new capability, coordinating its use, and deciding what to do with it.

Software itself has repeatedly undergone the same process. Higher-level languages made programmers less
responsible for machine instructions. Operating systems and libraries supplied capabilities that once
had to be constructed locally. Open-source ecosystems made enormous bodies of implementation available
for reuse. Cloud platforms made computing infrastructure available on demand. Each development changed
what engineers had to do themselves, while creating new decisions about how the resulting capabilities
should be selected, combined, controlled, and trusted.

Generative AI and coding agents continue that progression. Implementation that once required
substantial human effort can increasingly be generated, transformed, tested, or explored by machine.
The important question is therefore not whether an engineer personally typed the resulting code.
Engineering has never been defined by personally performing every act required to realize a system. The
question is whether engineers retain sufficient control to direct the work, judge its consequences,
evaluate the evidence for the properties that matter, and intervene when necessary.

This is why greater implementation capacity does not make software engineering obsolete. If
implementation becomes cheaper, deciding what to build, controlling what may change, preserving what
must remain true, and determining whether the result is acceptable become a larger fraction of the
engineering problem. The bottleneck moves.

::: {.mage-moment}
Model-Based Agentic Software Engineering develops one theory for maintaining engineering control as
increasingly capable agents perform more of the work required to realize and change software systems.
This handbook addresses the underlying software-engineering judgments that such an approach assumes:
what should be built, what matters enough to constrain, which choices should remain open, what evidence
is sufficient, and when an engineering decision should be reconsidered.
:::

The tools will continue to change. So will the systems we build with them. The enduring problem is
learning how to exploit a medium built for change without surrendering control of what those changes
mean.

## Summary

Software is an unusual engineered medium: it is highly changeable, copyable, transferable, and
updateable. These properties explain both its value and its risk. Engineers increasingly use software to
place adaptable behavior inside systems, and a single software change can propagate across enormous
deployed populations. Software engineers therefore exercise unusual leverage.

Software engineering is the discipline of keeping that capacity for change under control. The objective
is not to prevent change, but to preserve responsibility for consequential outcomes while deciding what
may change, what must remain true, and what evidence justifies confidence in the result. Technologies
such as generative AI may change the cost of producing implementations, but they do not remove that
engineering problem. They move the bottleneck toward the judgments surrounding implementation.

::: read_further
Davis, James C. [*Model-Based Agentic Software Engineering*](https://davisjam.github.io/model-based-agentic-software-engineering/). 1st ed. 2026. The source of this chapter's definition of engineering; it develops a theory for keeping engineering control as increasingly capable agents perform more of the work of building and changing software.

Winters, Titus, Tom Manshreck, and Hyrum Wright. *Software Engineering at Google: Lessons Learned from Programming Over Time*. Sebastopol, CA: O'Reilly Media, 2020. The origin of "programming integrated over time"; it argues that what distinguishes engineering from programming is the artifact's life across change, and shows how a large organization keeps such change under control.
:::
