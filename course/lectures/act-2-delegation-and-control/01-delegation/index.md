---
title: "Delegating to Software Agents: Old Problem, New Properties"
readings:
  groups:
    - heading: 'Delegation: work, responsibility, and the recipient'
      items:
        - cite: bainbridge1983
          locator: 'opening and §1 only (pp. 775–76), stopping at §2'
          annotation: 'Bainbridge, ["Ironies of Automation."](readings/ironies-of-automation-bainbridge-1983.pdf) Read the opening and §1 only (pp. 775–76 of the course copy), stopping at §2. Bainbridge asks what remains for people when routine work is automated: the residue may be poorly designed, the skills needed to perform it may decay through disuse, and human intervention may be required precisely when circumstances become unusual. As you read, ask what work remains with the engineer after routine realization is delegated to an agent, and what capability that remaining work requires.'
        - cite: anancsbn2019delegation
          locator: 'pp. 1–9; special attention to the Five Rights, p. 4'
          annotation: 'ANA and NCSBN, ["National Guidelines for Nursing Delegation."](https://www.nursingworld.org/globalassets/practiceandpolicy/nursing-excellence/ana-position-statements/nursing-practice/ana-ncsbn-joint-statement-on-delegation.pdf) Read pp. 1–9, with special attention to the Five Rights of Delegation on p. 4. Treat the Five Rights as one profession''s answer to the same delegation problem we face here: what work may be delegated, to whom, under what circumstances and directions, and with what supervision and evaluation. Then consider what changes when the delegatee is a software agent that cannot itself bear professional accountability.'
    - heading: Bound and equip the work
      items:
        - cite: polya1957
          locator: 'Part I, §§6–9 and selected dictionary entries'
          annotation: 'Pólya, *How to Solve It*. Read Part I, §§6–9 (PDF pp. 14–17 of the course scan), together with "Draw a figure," "Working backwards," "Decomposing and recombining," and "Use a problem related to yours." Pólya repeatedly improves problem solving not by changing the reasoner, but by changing the problem presented to the reasoner through representation, decomposition, notation, and related problems. Read these techniques as ways of moving work within a reasoner''s effective reasoning horizon.'
        - cite: davis2026mage
          locator: '§7.1.2 and §7.1.4'
          annotation: '{mage:7.1} Davis, 2026. Read §7.1.2, "Agents Entered an Implementation-Centered Discipline," and §7.1.4, "Where Engineering Effort Moves," only. §7.1.2 traces how agent systems have expanded from repository retrieval toward engineered interfaces, tools, and program representations, then asks what changes when we treat those mechanisms as parts of a larger engineering environment. §7.1.4 asks where engineering effort goes once implementation is cheap, and treats explicit representation as one possible destination rather than a settled one; inside that argument it distinguishes supplying a reasoner more information from changing the representation over which reasoning occurs. Read the pair against this unit''s question: where does the capability for delegated work actually live?'
    - heading: Engineer the environment around the agent
      items:
        - cite: claxton2026sdlc
          annotation: 'Claxton, ["The AI-Native SDLC Playbook."](https://claude.com/blog/the-ai-native-sdlc-playbook) Read this as a practitioner account, not as evidence: it is published by the maker of the tools it recommends and reports experience rather than controlled measurement. As you read, classify its practices using BOUND → EQUIP → AUTHORIZE → VERIFY: project instructions and skills supply information and means; permissions determine consequences; tests, builds, screenshot comparisons, CI, and independent approval supply evidence. Notice especially where an advisory instruction is backed by a deterministic mechanism.'
        - cite: davis2026sehandbook
          locator: 'chap. 4'
          annotation: '[*The Software Engineering Handbook*, Chapter 4, "Engineering Knowledge."](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/03-engineering-knowledge.html) Davis, 2026. Read the full chapter. Focus on what an engineering organization should remember and how knowledge moves among people, representations, and mechanisms. For this unit, the central question is what knowledge should live in the engineering environment so that each human or machine reasoner does not have to reconstruct it anew.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: "Lecture slides — Delegating to Software Agents: Old Problem, New Properties"
    src: 2-1-Agents.pptx
---

**Premise.** *Delegation is an engineering decision shaped by the work, the recipient, and the consequences.*

Software agents combine attractive properties of two familiar recipients of delegated work. Like people, they can reason, adapt, and act under circumstances that were not completely specified in advance. Like deterministic automation, however, they cannot assume responsibility for the consequences of their actions. We can delegate work to an agent; we cannot delegate responsibility to it.

Earlier, we defined engineering as the discipline of exercising informed control over consequential systems and accepting responsibility for their outcomes. That does not require engineers to personally perform every act of realization. It requires them to retain responsibility for the resulting system.

Delegation is not new. Software engineers delegate to colleagues, contractors, libraries, compilers, and other automation. Factories did the same earlier still: engineers delegated fabrication to skilled machinists while drawings, tolerances, gauges, and inspection preserved control over the result. Nursing provides another consequential setting in which work is deliberately assigned according to the capability of the recipient, the consequences of the task, and the supervision available.

Across these settings, the recipient changes but the delegation problem persists: what work should be handed over, what does the recipient need, what consequences may it produce, and what evidence justifies accepting the result?

Software agents introduce a new recipient: probabilistic automation capable of reasoning and acting over time. Their capabilities and costs differ substantially from both people and deterministic automation, but the engineering problem of delegation remains.

| | another person | deterministic automation | probabilistic automation |
|---|---|---|---|
| **reliability** | depends on skill and care; may fudge, or claim competence not held, and may not recognize that a situation is unfamiliar | exact and repeatable within its specification — and wrong exactly as specified, every time | depends on model strength and context; produces fluent work whether or not it is correct |
| **unforeseen circumstances** | can adapt, but recognizing novelty itself takes expertise | has no independent judgment for novel circumstances | can reason about novelty, but may fail to recognize or handle it correctly |
| **what the delegator supplies** | instruction, context, and review | a specification, once | instruction, context, and review — re-supplied each engagement |
| **memory** | learns durably; knowledge accrues in the person | does not learn, but *is* memory — the check encodes it permanently | carries memory as session state, externalized files, and weights; the durable part is what was externalized by design, and the internal part is not interpretable |
| **accountable?** | yes | no | no |
| **cost shape** | low setup, high per unit | high setup, near-zero per unit | low setup, low but non-zero per unit |

This unit asks how to make that delegation an engineering decision. An agent's engineering capability is not a property of the model alone. What an agent can accomplish depends on the model, the harness through which it acts, the engineering environment in which the work occurs, and how the work itself is structured.

Delegation is therefore a system-design problem: bound the work, equip the agent, authorize its actions, and verify the result.

**BOUND → EQUIP → AUTHORIZE → VERIFY**

These are not rigid stages. They are four questions an engineer must answer when delegating consequential work. What work should the agent perform? What does it need in order to succeed? What consequences should it be permitted to produce? What evidence will justify accepting the result?

The rest of this unit develops the engineering levers available for answering those questions.

![The four delegation decisions — bound, equip, authorize, verify — each with its question and principal levers.](figures/delegation-model.svg)

*Capability is designed across model, harness, and environment. Authority and evidence determine which consequences that capability may produce.*

## The Master Equation

The Master Equation separates places where reliable delegated realization can fail. Act II's introduction factored the probability that one attempt produces an acceptable realization into encoding, interpretation, and realization. Each unit of the Act works on that system from a different side.

> **p<sub>R</sub> = P(E | R) · P(I | E, R) · P(L | I, E, R)**

Delegation asks how the engineer should design the whole system around that realization: the work, capability, authority, and evidence.

| Delegation decision | Effect on the Master Equation |
|---|---|
| **Bound** | Determines *T*: the work being delegated and the degrees of freedom the recipient may resolve |
| **Equip** | Changes *M*, *R*, and *H*: the reasoning capability, information, representations, tools, and environment available for producing *E* and *I* |
| **Authorize** | Limits the consequences the process may produce even when its reasoning or realization is wrong |
| **Verify** | Produces evidence about whether *I* satisfies the obligations represented by *L* before the engineer accepts its consequences |

The equation is not a recipe for calculating a number. It is a model of where reliability comes from. A stronger reasoning model can improve the system without repairing a bad representation; a better representation cannot compensate for missing means; and high capability does not justify unlimited authority. Delegation means designing the whole system around the reasoner.

## Where does capability live?

An agent's capability emerges from three layers:

- **The model** interprets information, reasons, and generates candidate actions or artifacts.
- **The agent harness** turns that reasoning into sustained action by managing context, state, tools, feedback, and continuation across steps.
- **The engineering environment** supplies the artifacts and systems in which the work occurs: repositories, specifications, engineering models, tests, build and deployment systems, and organizational knowledge.

![The model nested inside the agent harness, inside the engineering environment.](figures/agent-layers.svg)

*The layers interact: the harness determines what reaches the model and what it can do; the environment determines what knowledge and mechanisms are available; the model bounds the reasoning.*

These layers determine the capability available for delegated work. They do not determine what work should be delegated, what authority the agent should receive, or what evidence should be required before its work is accepted.

## Equip the agent

Within this system, engineers have three broad ways to equip the agent for the bounded work:

| Equip | Engineering purpose | Examples |
|---|---|---|
| Reasoner | Select the underlying reasoning capability | frontier, low-cost, specialized, open-weight models |
| Information | Make relevant knowledge and state available to the reasoner | context, instructions, retrieved knowledge, memory, representations |
| Means | Give the agent ways to observe, act, and carry out recurring work | tools, APIs, MCP connections, skills, workflows |

These interventions solve different problems. A stronger reasoner does not supply missing information; more context does not provide a missing capability to act; a tool does not establish that its use is authorized. Diagnose what the delegation lacks before deciding how to equip it.

## Bound the work

Delegation begins by deciding what work the agent should perform and what choices it may resolve. A task that is too broad may require more relevant state than the agent can reason about effectively; one divided too finely may force important relationships to be repeatedly reconstructed across task boundaries.

An agent's **reasoning horizon** is the amount of relevant state it can effectively bring to bear on a task. Engineers can move work within that horizon by narrowing its scope, choosing better boundaries, retrieving relevant context, externalizing state, supplying tools, or providing representations that make important relationships easier to reason about. A dependency model, for example, may expose relationships that the agent could otherwise reconstruct only by examining thousands of source lines.

The objective is not the smallest task or the largest context window. It is a tractable reasoning surface: enough freedom for the agent to perform coherent work without requiring consequential relationships to be repeatedly reconstructed. When the same knowledge must be recovered again and again, that is evidence that the engineering environment may need to represent it explicitly.

Delegation therefore leaves some degrees of freedom for the recipient to resolve. Greater capability may let engineers leave more choices open. Deciding which choices to delegate remains an engineering decision.

## Capability is not authority

A model responds to an invocation; an agent acts over time. The harness creates that difference, and tools confer authority as well as capability. Consider the same capable coding agent under five grants of authority:

*read repository → propose patch → modify branch → merge → deploy*

Its underlying reasoning capability may be unchanged. What changes is the consequence it is permitted to produce. Authority is therefore an engineering variable independent of capability.

Instructions can make desirable behavior more likely. They do not restrict what an authorized action can cause or establish that the resulting artifact is acceptable.

## Verify the result

Delegating realization does not delegate responsibility for deciding whether its result is acceptable. Before the work begins, engineers should therefore ask what evidence will be required to close the delegation. A generated patch might require tests and review; an architectural change might require evidence about dependency or performance consequences; a deployment might require stronger checks because its consequences are immediate and difficult to reverse.

The required evidence depends on the claims and consequences of the work, not on whether a human or an agent produced it. Nor should the agent's own judgment that its work is correct generally be confused with independent evidence for that claim. Later units develop how engineering environments can evaluate such obligations and control what happens when they are violated.

## Engineer the whole system

**BOUND → EQUIP → AUTHORIZE → VERIFY.** These decisions interact. Better representations or a more capable model may permit broader delegation; narrower authority or stronger verification may make greater autonomy acceptable. The engineering object is not the agent alone but the system in which delegation occurs.

## Scope

We study contemporary mechanisms such as context management, tools, MCP, skills, memory, permissions, and work decomposition for the engineering purposes they serve, rather than the details of particular products.

Modeling asks how consequential engineering knowledge can be represented so that humans and agents need not continually reconstruct it. Alignment asks when engineering obligations should have consequences for what the environment permits or accepts.

## What changes as agents improve?

Contemporary agents still require substantial engineering around their reasoning: task boundaries, external context and representations, tools, permissions, and independent checks. Those needs are changing as agents become better at sustained reasoning, independent progress, tool use, constructing useful representations, and evaluating their own work.

Suppose those capabilities improve substantially. What changes about BOUND → EQUIP → AUTHORIZE → VERIFY? What stays the same? If agents can construct the representations they need and evaluate their own work, what knowledge and control must still exist outside the agent?
