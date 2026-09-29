---
title: "Delegating to Software Agents: Old Problem, New Properties"
readings:
  groups:
    - heading: Delegation is not new
      items:
        - cite: bainbridge1983
          locator: 'opening and §1 only'
          annotation: 'Bainbridge, ["Ironies of Automation."](readings/ironies-of-automation-bainbridge-1983.pdf) Read the course copy, the opening and §1 only (pp. 775–76), stopping where §2, "Approaches to solutions," begins. Sections 2 through 4 propose remedies built for 1983 control rooms and have aged; §1 has not. Bainbridge writes about process-control plant operators in the 1970s, not software engineers in the 2020s. Consider how it transfers to this century. Her subject is what automation leaves behind. Two ironies organize the paper: the first is that designer errors become a major source of operating problems, and the second is the one this unit needs — "the designer who tries to eliminate the operator still leaves the operator to do the tasks which the designer cannot think how to automate," so that the operator "can be left with an arbitrary collection of tasks, and little thought may have been given to providing support for them." The residue is not designed; it is whatever was left over. §1.1 then divides what the supervisor must still be able to do. Taking over manually requires control skills; working out why take-over became necessary requires cognitive skills. Both decay through disuse, and automation removes the routine practice that maintained them, so a formerly experienced operator who has spent a year monitoring is now an inexperienced one — and take-over is demanded precisely when something has gone wrong and unusual action is needed, when the operator ought to be more skilled than average rather than less. §1.1.3 closes the loop: we can only ask a supervisor to judge whether the automation''s decisions are acceptable, but if the automation was adopted because human judgement was inadequate here, on what basis is that judgement supposed to be made? If you read the vigilance paper for Validation, this is where that thread continues. Warm and colleagues establish that sustained watching is itself hard, costly work; Bainbridge establishes that the watcher''s skill erodes because the automation took the routine. The two describe one mechanism from opposite sides, and you do not need the earlier paper to read this one. Read §1 against your own delegation: if an agent does the routine work, which judgments are you still expected to make, which of those depend on skill you are no longer practising, and what would you have to keep doing yourself to remain able to make them?'
        - cite: anancsbn2019delegation
          locator: 'pp. 1–9; special attention to the Five Rights, p. 4'
          annotation: 'ANA and NCSBN, ["National Guidelines for Nursing Delegation."](https://www.nursingworld.org/globalassets/practiceandpolicy/nursing-excellence/ana-position-statements/nursing-practice/ana-ncsbn-joint-statement-on-delegation.pdf) Ten pages, ending in a reference list; read pp. 1–9, and pay special attention to the Five Rights of Delegation on p. 4. The Five Rights were set down in 1995 and the statement adopted in 2019, for nurses at a bedside, not for software engineers delegating to agents. Consider what each right asks for when the delegatee is a model. Read it as a professional standard rather than as advice. Nurses wrote it numbered and prescriptive because a bad handoff injures a patient, and that register is what earns it a place here. *Right task*: the activity falls within the delegatee''s job description or the setting''s established written policies, and the facility must describe the expectations and limits of the activity and provide any competency training it needs. *Right circumstance*: the patient''s condition must be stable, and if it changes the delegatee must communicate that and the licensed nurse must reassess whether the delegation still holds. *Right person*: the nurse, the employer, and the delegatee are together responsible for ensuring the delegatee possesses the appropriate skills and knowledge. *Right directions and communication*: instructions specific to this patient, this nurse, and this delegatee, two-way so the delegatee can ask clarifying questions, covering "any data that need to be collected, the method for collecting the data, the time frame for reporting the results," and carrying the standing limit that the delegatee "cannot make any decisions or modifications in carrying out the activity without first consulting the licensed nurse." *Right supervision and evaluation*: the licensed nurse is responsible for "monitoring the delegated activity, following up with the delegatee at the completion of the activity, and evaluating patient outcomes," and stays ready to intervene. Lay the five against the four questions this unit asks and see where each one lands. Then watch what the statement does with the word responsibility, which it divides: the licensed nurse who delegates a responsibility "maintains overall accountability for the patient," while "the delegatee bears the responsibility for the delegated activity, skill or procedure." The far side of that division has work to do. The delegatee must understand the terms, must agree to accept them, must refuse a responsibility he or she is not competent to carry, and once acceptance is verified becomes "accountable for carrying out the delegated responsibility correctly." Accountability, in the statement''s own definition, means being "answerable to oneself and others for one''s own choices, decisions and actions as measured against a standard." Both halves are occupied by someone who can answer. Now put an agent in the delegatee''s place and read the Five Rights once more. Which of them still have a party on the far side who can be held to them? Which quietly lose one? And where a right loses its far side, who carries its obligation instead, and how would you know they were carrying it?'
    - heading: Changing the reasoning problem
      items:
        - cite: polya1957
          locator: 'Part I, §§6–9 and selected dictionary entries'
          annotation: 'Pólya, *How to Solve It*. Read Part I, §§6–9 (PDF pages 14–17 of the course scan, about six book pages), together with the worked examples "Draw a figure," "Working backwards," "Decomposing and recombining," and "Use a problem related to yours." Pólya''s account of mathematical problem solving predates software agents by decades, but it models engineering with capable reasoners. When a problem is difficult, Pólya does not ask the solver to reason harder: he changes the reasoning problem — draw a figure, introduce suitable notation, recall a related problem, restate the problem itself. Read the techniques as reasoning assistance: they change the representation or structure presented to a reasoner without changing the reasoner. We will use the distinction to ask when an engineer should buy a stronger model, when to engineer better representations, tools, or task structure around it, and how benchmarking can tell the alternatives apart.'
    - heading: The system surrounding an agent
      items:
        - cite: davis2026mage
          locator: '§7.1.2 and §7.1.5'
          annotation: '{mage:7.1} Davis, 2026. Read §7.1.2, "Where Engineering Can Apply Leverage," and §7.1.5, "Three Core Predictions," only. Read the pair as an argument about the system surrounding an agent. §7.1.2 asks where engineers can intervene: the reasoning model, the harness and process, the representations, and the evidence and controls. §7.1.5 asks what should happen when those interventions work: capacity becomes durable throughput, representations extend the reasoning horizon, and judgment becomes inheritable. The remainder of §7.1 belongs to later units.'
        - cite: claxton2026sdlc
          annotation: 'Claxton, ["The AI-Native SDLC Playbook."](https://claude.com/blog/the-ai-native-sdlc-playbook) An account of how one company and its customers rearrange a development lifecycle around coding agents, written as six stages from plan through maintain, each committing a versioned artifact the next stage reads. Read it as a practitioner document rather than as evidence: it is published by the maker of the tools it recommends, it names those products throughout, and its claims rest on reported experience rather than measurement. Read that way it earns its place, because it is a worked instance of this unit''s levers. Institutional knowledge is written into a project instruction file the agent reads at the start of every session, on the working rule that a mistake made twice goes into the file. Recurring procedures are packaged as skills. Verification is arranged so that the agent can check its own work — tests, a build, a screenshot diff — before an engineer sees it, and the agent''s configuration is regression-tested in CI alongside the code. Most useful here, the piece keeps apart two levers that are easy to confuse: a skill is an advisory control, and "a policy that must always hold needs something deterministic behind the skill, such as a hook that blocks the action." Authority is tiered by environment, so the agent deploys freely in development and only prepares the release in production, and the agent that wrote a change has no way to approve it. As you read, sort each recommended practice into the four questions this unit is built on: does the practice bound the work, equip the agent, decide what consequences the agent may produce, or establish the evidence that closes the delegation? Which of them are doing a different job than the stage they are filed under would suggest?'
    - heading: What an engineering organization should remember
      items:
        - cite: davis2026sehandbook
          locator: 'chap. 4'
          annotation: '[*The Software Engineering Handbook*, Chapter 4, "Engineering Knowledge."](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/03-engineering-knowledge.html) Davis, 2026. Read the full chapter. Focus on what an organization should remember, how knowledge moves among people, representations, and mechanisms, and why representations are evidence rather than reality. The chapter supplies the knowledge-management frame this unit applies to agents: an environment that carries knowledge extends every reasoner that works within it.'
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

Earlier, we defined engineering as the discipline of exercising informed control over consequential systems and accepting responsibility for their outcomes. That does not require engineers to personally perform every act of realization. Work can be delegated; responsibility for the resulting system remains with the engineer.

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

Contemporary agents still require substantial engineering around their reasoning: task boundaries, external context and representations, tools, permissions, and human oversight. Those properties are changing rapidly. Agents are becoming better at sustained reasoning, independent progress, tool use, and constructing useful representations for themselves.

Suppose those capabilities improve substantially. What changes about BOUND → EQUIP → AUTHORIZE → VERIFY? What stays the same?
