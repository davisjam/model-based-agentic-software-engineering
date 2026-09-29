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

**Premise.** *Delegation is something engineers design, from the work delegated and the properties of its recipient.*

Earlier, we defined engineering as the discipline of exercising informed control over consequential systems and accepting responsibility for their outcomes. That definition does not require engineers to personally perform every act of realization. Work can be delegated, whether to other people or to machine intelligence. Responsibility for the resulting system remains with the engineer.

Delegation is not new to software engineering. Engineers have always delegated realization: to junior colleagues, to contractors and vendors, to libraries they did not write, and to compilers that allocate registers and manage memory on their behalf. Factories made the same move earlier still, delegating fabrication to skilled machinists while retaining control through drawings, tolerances, gauges, and inspection. That move handed work to two kinds of recipient at once. Judgment stayed with the machinist, while other knowledge moved into the drawing, the tolerance, the gauge, and the inspection step — instruments that read the same way every time and could not be argued with. A gauge is deterministic automation, so two of the three recipients an engineer chooses among today are centuries old, and only the third is new. The longer history is in {mage:5.1} In each case the engineer answered the same four questions: what work to hand over, what the recipient needed in order to do it, what consequences it was permitted to produce, and what evidence would justify accepting the result.

What changes with agents? The primary change is in cost: work previously assigned to an engineer (human intelligence) can now be completed by a reasoning machine (commodity intelligence), and machines are cheaper than humans. The other change is harder. It is identifying the right means of supervising agentic work so that we can have confidence in the result: trustworthy outcomes from probabilistic actors.

Set side by side, the three differ on the properties that decide what each can be given. Accountability is the only row where both automations fall on the same side against a person, which is why responsibility for the result stays with the engineer whenever the delegate is a machine.

| | another person | deterministic automation | probabilistic automation |
|---|---|---|---|
| **reliability** | depends on skill and care; may fudge, or claim competence not held, and may not recognise that a situation is unfamiliar | exact and repeatable within its specification — and wrong exactly as specified, every time | depends on model strength and context; produces fluent work whether or not it is correct |
| **unforeseen circumstances** | can adapt, but recognising novelty itself takes expertise | cannot act outside what was specified | acts regardless of whether it should |
| **what the delegator supplies** | instruction, context, and review | a specification, once | instruction, context, and review — re-supplied each engagement |
| **memory** | learns durably; knowledge accrues in the person | does not learn, but *is* memory — the check encodes it permanently | carries memory as session state, externalized files, and weights; the durable part is what was externalized by design, and the internal part is not interpretable |
| **accountable?** | yes | no | no |
| **cost shape** | low setup, high per unit | high setup, near-zero per unit | low setup, low but non-zero per unit |

The memory row is what the rest of this Act answers: deterministic automation is the only one of the three that remembers by construction, so the response to an agent's non-persistence is to push knowledge into checks and representations — the work of Modeling and Alignment.

This unit asks how to make that delegation an engineering decision. An agent's engineering capability is not a property of the model alone. What an agent can accomplish depends on the model, the harness through which it acts, the engineering environment in which the work occurs, and how the work itself is structured.

Delegation is therefore a system-design problem: bound the work, equip the agent, authorize its actions, and verify the result.

**BOUND → EQUIP → AUTHORIZE → VERIFY**

These are not rigid stages. They are four questions an engineer must answer when delegating consequential work. What work should the agent perform? What does it need in order to succeed? What consequences should it be permitted to produce? What evidence will justify accepting the result?

The rest of this unit develops the engineering levers available for answering those questions.

![The four delegation decisions — bound, equip, authorize, verify — each with its question and principal levers.](figures/delegation-model.svg)

*Capability is designed across model, harness, and environment. Authority and evidence determine which consequences that capability may produce.*

## Where does capability live?

An agent has three layers:

- **The model** interprets information, reasons, and generates candidate actions or artifacts.
- **The agent harness** turns that capability into an actor. It determines what context the model receives, what it remembers, which tools it can invoke, what actions it may take, how results return as feedback, and how work continues across steps.
- **The engineering environment** surrounds the work: repositories, specifications, architectural models, documentation, tests, build systems, issue histories, deployment systems, and organizational knowledge.

![The model nested inside the agent harness, inside the engineering environment.](figures/agent-layers.svg)

*The layers are not independent: the harness selects what the model sees and does; the environment sets what must be reconstructed; the model bounds the reasoning.*

Capability is a design variable. Frontier, smaller, open-weight, and specialized models trade against decomposition, representations, tools, and task scope; calls cost money, time, computation, and context. "Which model is best" has no context-free answer.

These layers determine the capability available for delegated work. They do not determine what work should be delegated, what authority the agent should receive, or what evidence should be required before its work is accepted.

## Engineers have levers

Once the work has been bounded, engineers can equip the agent by intervening at several points in this system. The levers are a repertoire of interventions, all serving the EQUIP decision:

| Lever | Engineering purpose | Examples |
|---|---|---|
| Model | Select the underlying reasoning capability | frontier, low-cost, specialized, open-weight |
| Context | Make relevant information available now | files, specifications, retrieved knowledge |
| Instructions | Shape how work should be approached | system instructions, project instructions |
| Tools | Give the agent capabilities to observe or act | shell, compiler, tests, search, APIs |
| MCP | Connect agents to external capabilities through a common interface | repository, issue tracker, engineering service |
| Skills | Package reusable ways of performing recurring work | review procedure, remediation workflow |
| Memory / state | Preserve useful information across reasoning steps or tasks | plans, task state, durable records |
| Task structure | Change the reasoning problem itself | decomposition, checkpoints, intermediate artifacts |

The levers are not interchangeable. A tool does not solve a missing-context problem, more context does not create authority, and a skill does not guarantee its instructions are followed. When an agent struggles, "use a better model" is one engineering response among eight.

## Bound the work

Delegation begins by deciding what work the agent should perform. A task that is too broad may require the agent to maintain more relevant state than it can reason about effectively; a task divided too finely may require so much information to cross its boundaries that decomposition makes the work harder rather than easier.

Engineers can therefore change the task itself. They can narrow its scope, divide it into stages, establish intermediate artifacts, introduce checkpoints, separate generation from evaluation, or choose boundaries that reduce the amount of state each step must consider. These are not merely project-management choices. They change the reasoning problem presented to the agent.

A useful delegation boundary gives the agent enough freedom to perform coherent work while keeping the consequential context and outputs tractable. The question is not *how small can we make the task?* It is *what boundary makes this work independently reasonable without forcing important relationships to be reconstructed across the boundary?* Agentic engineering does not eliminate architecture; it adds another system to architect, the system performing the engineering work.

## Engineer the reasoning surface

An agent's **reasoning horizon** is the amount of relevant state it can effectively bring to bear on a task. Better representations extend it by changing the problem presented to the reasoner: an agent checking a change against the architecture can reconstruct dependencies from source or consult a trustworthy dependency model.

When work exceeds the agent's reasoning horizon, engineers have several choices: reduce the task, improve the representation, retrieve relevant context, externalize state, provide a tool, or move the delegation boundary. The objective is not to maximize the amount of context presented to the model. It is to construct a reasoning surface on which the relevant relationships become tractable.

Recurring reconstruction is evidence of useful knowledge; the question is whether it stays ephemeral or becomes inheritable. Knowledge can live in people, prose, diagrams, specifications, models, tests, tools, conventions, and mechanisms, at different costs: permanence everywhere accumulates stale representations, implicitness everywhere forces rediscovery. Ask what future engineers — or future agents — would regret having to rediscover. Do not make the agent infer repeatedly what the environment can represent usefully.

## Capability is not authority

A model responds to an invocation; an agent acts over time. The harness creates that difference, and tools confer authority as well as capability. Consider the same capable coding agent under five grants of authority: read repository → propose patch → modify branch → merge → deploy. Its underlying reasoning capability may be unchanged. What changes is the consequence it is permitted to produce. Authority is therefore an engineering variable independent of capability.

Two design decisions follow: what does the agent need to perform the work, and what consequences should it be permitted to produce? Equipping the agent answers the first question; authorization answers the second. Prompts, examples, retrieved context, plans, and instructions can make desirable behavior more likely. They do not restrict what an authorized action can cause, nor do they establish that the resulting artifact satisfies its obligations.

## Verify the result

Delegating realization does not delegate responsibility for deciding whether its result is acceptable. Before the work begins, engineers should therefore ask what evidence will be required to close the delegation. A generated patch might require tests and review; an architectural change might require evidence about dependency or performance consequences; a deployment might require stronger checks because its consequences are immediate and difficult to reverse.

The required evidence depends on the claims and consequences of the work, not on whether a human or an agent produced it. Nor should the agent's own judgment that its work is correct generally be confused with independent evidence for that claim. Later units develop how engineering environments can evaluate such obligations and control what happens when they are violated.

## Engineer the whole system

**BOUND → EQUIP → AUTHORIZE → VERIFY.** Bound the work so that it presents a tractable reasoning problem. Equip the agent with the capability, representations, context, state, and tools needed to perform it. Grant only the authority appropriate to the consequences of the task. Determine what evidence must exist before the work is accepted or allowed to produce further consequences.

These decisions interact. Better representations may let an agent handle a larger task. Narrower authority may make greater autonomy acceptable. Stronger verification may justify delegating work whose realization would otherwise require close human supervision. A more capable model may reduce the amount of decomposition required. The engineering object is therefore not the agent alone but the system in which delegation occurs.

## Scope

This unit deliberately avoids the technical details of how language models produce intelligence; we consider their properties in the abstract, with enough detail to provide a useful model for controlling their behavior. We do study the mechanisms through which contemporary agents are controlled and connected to engineering work — context management, tools, MCP, skills, memory, permissions, and work decomposition — for their engineering purpose rather than the details of any particular product.

The remainder of this Act considers the paired tasks of sufficiently specifying a problem (Modeling) and the means by which to ensure an agent complies (Alignment).
