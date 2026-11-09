---
title: Building with Agents
sessions:
  - "Building with Agents: Agentic Workshop"
  - "Building with Agents: Software Factories"
  - "Building with Agents: Inside an Agentic Software Factory"
readings:
  groups:
    - heading: What becomes scarce when code becomes cheap
      items:
        - cite: davis2026factory
          annotation: 'Davis, Jiang, Synovic, and Thiruvathukal, ["Open Source Software, Closed Software Factory"](https://davisjam.github.io/files/publications/DavisJiangSynovicThiruvathukal-OpenSourceClosedSoftwareFactory-TechReport2026.pdf) (technical report, 2026). The authors argue that generative AI makes hidden source code a weak competitive advantage. They say the real advantage is the "software factory": the knowledge, agent guidance, validation tooling and infrastructure that turn changing requirements into reliable updates. Read it for the claim this unit builds on — that the durable asset is the environment that produces the software, not the source it produces.'
    - heading: What changes when the agent works on its own
      items:
        - cite: chen2026automation
          annotation: 'Chen, Talwalkar, Brennan, and Neubig, ["Code with Me or for Me? How Increasing AI Automation Transforms Developer Workflows"](https://dl.acm.org/doi/10.1145/3772318.3790850) (CHI 2026). This controlled user study compares autonomous coding agents with copilot-style assistants. It finds that agents reduce developer effort and help people finish tasks they might not have finished otherwise. They also change how developers work, and wider adoption is held back because users do not fully understand how agents behave. The evidence is a study rather than an anecdote, so it is the best available ground truth on what delegation actually does to the workflow.'
    - heading: Designing the harness
      items:
        - cite: anthropic2026harnesses
          annotation: 'Anthropic, ["Effective Harnesses for Long-Running Agents"](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents). An agent working across many sessions starts each one with no memory of the last, so it tends to try too much at once or declare the work done too early. The post describes a fix: an "initializer" agent sets up a feature list, a progress log and git, and later sessions build one feature at a time with end-to-end tests and clean handoffs. Read it as harness design — the H in the Act II decomposition — rather than as vendor guidance.'
    - heading: Kiro's specification and checking workflow
      items:
        - cite: kiro2026specs
          annotation: 'Kiro, ["Specs"](https://kiro.dev/docs/specs/). Inspect the requirements, design, and task documents that Kiro maintains during development. Compare their roles with the work orders and design documents in Lecture 3. Which engineering decisions does the workflow make available for review?'
        - cite: kiro2026correctness
          annotation: 'Kiro, ["Correctness with Property-based Tests"](https://kiro.dev/docs/specs/correctness/). Read how the IDE connects requirements to generated properties and tests, including the stated limitations. Be ready to explain what an engineer should inspect when a generated property passes, and who should decide whether to change the requirement, implementation, or test when they disagree.'
    - heading: A factory applied to the code nobody wanted to touch
      items:
        - cite: launchdarkly2026factory
          annotation: 'LaunchDarkly, ["Building a Software Factory on Our Scariest Code"](https://launchdarkly.com/blog/building-a-software-factory-on-our-scariest-code/). Two engineers used Claude Code to rewrite LaunchDarkly''s oldest and most critical frontend code (about 66K lines) in six weeks for about $7K. Their lessons: get the codebase ready first, treat the old code as the spec, work in phases with a human steering, and use feature flags for safety rather than aiming for full autonomy. It is a company blog post, so the results are self-reported — read the method, and ask which claims the post gives you evidence for.'
    - heading: The factory, as the textbook develops it
      items:
        - cite: davis2026mage
          locator: '§5.1, §5.3, and §5.5'
          annotation: '{mage:5.1}, {mage:5.3}, and {mage:5.5} Davis, 2026. Read §5.1 for what a software factory is, and §5.5 for the two problems this unit is organized around — process design and tolerance. Skim the industrial cases in §5.3: attend to the comparison between organizations rather than to every implementation detail. §5.2 provides a detailed account of the DocAble factory discussed in Lecture 3; it is recommended for students interested in the implementation, but is not required.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: "Lecture slides — Agentic Workshop"
    src: 2-5-Agentic-Workshop.pptx
  - title: "Lecture slides — Software Factories"
    src: 2-6-Software-Factories.pptx
  - title: "Lecture slides — Inside an Agentic Software Factory"
    src: 2-7-Inside-an-Agentic-Software-Factory.pptx
---

**Premise.** *A software organization's engineering capability depends not only on the software it possesses, but on its ability to change that software reliably.*

Software is an unusually changeable engineering medium. Requirements evolve, defects are discovered, dependencies change, and new technologies make previously expensive capabilities practical. A software organization must therefore do more than produce a working implementation. It must be able to change that implementation while preserving the properties on which its users depend.

Coding agents change the economics of this work. They can produce substantial implementations from relatively informal instructions, reducing the amount of human effort required for realization. But generating a change and establishing that it is acceptable remain different engineering activities. As implementation becomes cheaper, the knowledge and machinery required to direct, evaluate, and integrate changes become increasingly important.

This unit concludes Act II by examining how engineers build software with agents. The first lecture develops the mechanisms for delegating individual development tasks. The second considers how those mechanisms become part of a software factory, an engineered production system for repeatedly producing controlled changes to software. The third examines a working agentic software factory, showing how planning, engineering models, automated controls, and validation allow one engineer to direct multiple coding agents.

## Structure of this unit

**Lecture 1: Building with Coding Agents.** We examine the practical mechanisms that make an agent useful in a software repository: context engineering, persistent instructions, tools, MCP, skills, and feedback loops. A guided exercise uses these mechanisms to investigate and repair an implementation while preserving its existing obligations.

**Lecture 2: Agentic Software Factories.** We extend the individual development environment into a production system. The factory metaphor introduces two complementary engineering problems, process design and tolerance. Industrial examples illustrate different ways organizations arrange agentic production, preserve engineering knowledge, and control the admission of changes.

**Lecture 3: Inside an Agentic Software Factory.** We examine the development environment used to build DocAble, a document accessibility remediation service. A strategy document records priorities; structured work orders describe engineering obligations and implementation plans; an orchestrator schedules agents; and lifecycle hooks enforce or reinforce the processes they follow. Engineering models help agents discover constraints before modifying code, while validation and independent audits determine whether work is complete. The case illustrates both the opportunities and limitations of automated software production.

The closing comparison examines Kiro, whose harness provides a specification workflow and connects requirements to generated property-based tests. Students apply the same engineering questions to both environments: what knowledge is represented, which checks supply evidence, and who may revise an obligation? The comparison shows how the ideas developed in Act II apply to an existing commercial tool.

## From delegation to a working agent

The Delegation unit introduced four engineering decisions:

> BOUND → EQUIP → AUTHORIZE → VERIFY

These decisions apply whether the recipient is a person or an agent. The engineer determines what work to delegate, supplies the information and means required to perform it, limits the consequences the recipient may produce, and establishes what evidence will justify accepting the result.

For coding agents, the underlying foundation model supplies reasoning capability, while the agent harness manages context, tools, and actions over time. The engineering environment supplies the repository, specifications, tests, build systems, and other resources with which the agent works. An agent's effectiveness therefore depends on more than its underlying foundation model.

## Equipping the agent

Consider an agent assigned to repair a defect in an unfamiliar repository. It may be capable of identifying the defective implementation, but first it must discover how the project works. Which specification governs the affected behavior? Where are the relevant tests? What commands build the system? Which architectural conventions must a change preserve? The engineer can answer these questions repeatedly during each session, or arrange for the engineering environment to supply the relevant knowledge.

Several contemporary mechanisms support this arrangement.

| Mechanism | Engineering purpose | Example |
|---|---|---|
| Context engineering | Supply task-relevant information within the agent's reasoning horizon | Relevant source, specifications, and architectural models |
| Project instructions | Preserve guidance across agent sessions | `AGENTS.md` describing conventions and build procedures |
| Tools and MCP | Give the agent access to engineering resources and operations | Repository search, issue retrieval, test execution |
| Skills | Package reusable procedures for recurring work | Investigate, repair, test, and report a defect |
| Feedback loops | Use observations to revise an attempted realization | Test failures followed by further investigation and correction |

The distinctions matter. Project instructions preserve information the agent should generally know; a skill describes how to perform a recurring kind of work; a tool provides a capability to observe or act. MCP standardizes how agents can discover and invoke tools exposed by external systems. None of these mechanisms establishes that the agent has interpreted its instructions correctly or that its output satisfies the specification.

The workshop illustrates this separation using an API repair. The agent retrieves an issue, investigates the implementation, runs tests, and proposes a correction. Its explanation of the repair is useful, but the test results and implementation differences provide separate evidence about what changed. Permissions further distinguish capability from authority: a tool may allow the agent to read an issue without allowing it to modify the issue or approve a change.

These mechanisms make individual delegation more practical. They also introduce engineering resources that can persist beyond one task. A useful instruction, test, or skill can serve subsequent agents without being reconstructed each time.

## From the agent to the factory

The factory metaphor begins with manufacturing. A machinist can fabricate a part from a drawing, but large-scale manufacturing requires a production system around the machinist. Interchangeable parts, machine tools, gauges, and inspection procedures made production more repeatable. As machinery increased fabrication capacity, engineers also had to develop better ways to organize production and determine whether its products were acceptable.

Two engineering techniques from this history are especially relevant, and they organize the rest of this unit.

- **Process design** determines how production proceeds. It establishes how work is decomposed and sequenced, what information and tools reach the fabricator, where decisions are made, and how products move through inspection and admission.
- **Tolerance** determines what variation in the product is acceptable. A drawing may specify a dimension and its permitted variation without prescribing every action the machinist takes. Measurement establishes whether the resulting part remains within those bounds.

Software factories face the same two problems, with one important difference. A manufacturing factory typically produces many copies of a product. A software factory usually produces successive versions of an evolving system. Each production cycle begins with an existing realization and attempts to produce a changed realization that remains acceptable.

> A software factory is the engineered production system through which software changes are realized from engineering intent and evaluated, admitted, deployed, and improved.

The distinction between process design and tolerance gives us a way to examine such a factory.

![Inside a software factory, engineering intent flows down into context and work preparation, then into the fabricator, which also receives tools and guidance from the side. The fabricator emits a proposed realization, which flows into measurement and evaluation. There the flow branches: a realization within tolerance becomes an admitted change, while one outside tolerance is revised or rejected. Two annotations frame the flow — process design ("How production proceeds") spans the stages around the fabricator, and tolerance ("Which variation is acceptable?") governs the branch between the two outcomes.](figures/software-factory.svg)

*Figure: Two problems of factory engineering. Process design organizes the work around the fabricator. Tolerance bounds acceptable variation in its output. A factory can improve one without necessarily improving the other.*

The tolerance concept generalizes beyond numerical measurements. A software tolerance may be a memory bound, an architectural dependency rule, an invariant over system states, or a behavioral requirement. Some obligations can be checked mechanically, while others require human judgment. The engineer must decide which variation the agent may choose and which properties the factory must preserve.

## Engineering the factory

The mechanisms from Lecture 1 primarily help organize production. Context engineering determines what information reaches an agent. Skills encode procedures. Tools determine what operations are available, while permissions restrict their use. Work decomposition and scheduling determine which tasks can proceed concurrently.

Tolerance addresses the resulting software. Requirements and specifications establish obligations; engineering models represent selected properties; tests, analyses, and measurements provide evidence about whether a realization satisfies them. Alignment connects consequential obligations to mechanisms that can constrain actions or reject unacceptable changes.

The two concerns interact. A project instruction may guide an agent away from an architectural violation, while a dependency check independently rejects the violation if it occurs. The instruction participates in process design; the represented architectural obligation and its enforcement participate in tolerance. A more capable agent may need less guidance, but the architectural obligation remains.

The factory also requires maintenance. Instructions can become stale, models can diverge from implementation, and tests can cease to represent the properties they were intended to check. These resources are engineering capital only while they continue to help future work. Preserving knowledge in the environment exchanges some repeated human judgment for the cost of maintaining the representations and controls that carry it.

## How industrial factories differ

Organizations are developing different agentic software factories according to their engineering problems. The industrial accounts in {mage:5.3} illustrate how the same production concerns lead to different arrangements.

Spotify provides a useful example of process design surrounding a replaceable fabricator. Its existing Fleet Management infrastructure already selected repositories, opened pull requests, arranged review, and merged changes. Replacing deterministic transformation scripts with coding agents extended the kinds of changes the system could perform without requiring the surrounding production process to be rebuilt. Agent-authored changes nevertheless retained different review requirements from deterministic transformations.

Cloudflare emphasizes the representation and enforcement of engineering standards. It extracts institutional policies into structured obligations with stable identifiers, then applies them through linters and automated review. Approved standards can be promoted from advisory guidance to enforced requirements. The distinction between stating a policy and granting it authority to block changes is an Alignment decision.

Shopify emphasizes organizational learning. Its River agent operates through shared conversations, allowing engineers to observe failures and improve reusable project instructions and skills. The company reports improved merge rates without changing the underlying foundation model. The result is self-reported and does not isolate every contributing factor, but it illustrates how changes to the engineering environment can improve agent performance.

These examples also expose a common constraint. Increasing implementation capacity does not automatically increase the capacity to evaluate and admit changes. Spotify reports that change volume grew faster than some verification controls could adapt. Uber reports increasing reviewer delays as agent-generated work expanded. The factory must therefore allocate scarce supervisory attention as deliberately as it allocates implementation capacity.

The examples are not stages of a universal maturity model. Different organizations can reasonably place engineering knowledge and control in different parts of production. Their public accounts also provide stronger evidence about production mechanisms and activity than about the quality of the resulting software.

## Inside an agentic software factory

DocAble is a document accessibility remediation service, and its development environment is the factory this lecture takes apart. One engineer directs several agents working concurrently on different changes, mostly through natural-language instructions, while the environment records plans, schedules tasks, checks results, and preserves what later agents will need. Three engineering questions organize the walkthrough, and the engineer owns all three: what work comes next, what process should carry it out, and what the surrounding infrastructure costs the agents working inside it. Answering them requires a concrete enough vision of the intended system. Without that vision, more implementation capacity produces more software whose correctness nobody can establish.

![An engineer panel on the left carries three authority edges, labelled "prioritizes", "decides" and "accepts", which re-enter the central chain at the strategy document, at the independent plan review, and at the accept outcome; the panel notes that the engineer sets priorities, chooses models and controls, rules on open questions, judges evidence, and does not delegate that authority. The chain runs from top to bottom. The strategy document, the prioritized work queue, feeds a planning agent, which produces two artifacts side by side: an epic carrying the work order and its phases, and a design document carrying the obligations and models. Both feed an independent plan review, which feeds an orchestrator that dispatches briefs to isolated worktrees. Three implementation agents work in parallel, and their commits converge into integration, where accepted commits land on main. Integration feeds the Definition of Done, where evidence is assembled and independently reviewed, and that branches into accept or return for repair. A red rework edge carries returned work back into the implementation agent row. A legend keys the box fills: management, engineering, execution, agents, and outcome.](figures/factory-workflow.svg)

*Figure: Work organization in the DocAble factory. The engineer sets the priorities, rules on what the plan review cannot resolve, and accepts the finished work. Everything between those three decisions is delegated. Management artifacts carry priorities and work orders, engineering artifacts carry the obligations a change must preserve, and execution artifacts carry plans, commits, and evidence.*

The example artifacts described below, including the governance document, the dispatch brief, the epic template, and the design-document template, are available as starter templates in the [downloads directory](https://github.com/davisjam/model-based-agentic-software-engineering/tree/main/downloads).

### Organizing the work

The engineer establishes the vision and the priorities, then delegates planning and execution. Each delegation begins from a decision the engineer has already made, and each decision has an artifact that carries it to the agents.

| Engineer's decision | Artifact | What the agent can do |
|---|---|---|
| What matters next? | Strategy document | Maintain and select work |
| What must change? | Epic | Develop a phased plan |
| What must remain true? | Design document | Retrieve and apply obligations |
| What may this agent do? | Dispatch brief | Execute a bounded assignment |
| Is the work acceptable? | Definition of Done | Assemble and review evidence |

The engineer maintains a strategy document recording near-term priorities, longer-term goals, and work that must be completed before the next deployment. The document functions as a work queue, and the engineer can ask the orchestrating agent to update it rather than editing it directly.

When the engineer selects a substantial change, a planning agent develops it into an epic: a structured work order that identifies the relevant system models, proposes new ones where necessary, describes the affected components and types, specifies how the result will be validated, and decomposes implementation into phases with their dependencies. A separate design document develops the engineering argument the epic assumes, covering intended structure, invariants, failure modes, observability, and the controls needed to preserve the system's obligations. The templates behind both make recurring engineering decisions explicit, so an agent cannot produce a plausible implementation while quietly neglecting the architecture, the existing obligations, or the evidence of correctness.

Execution then follows the sequence the figure traces. A second agent reviews the proposed work order independently, challenges questionable decisions, and refers whatever it cannot resolve back to the engineer. The orchestrator dispatches the resulting phases to implementation agents, each working in an isolated Git worktree, and assigns different models to different tasks according to their expected difficulty. It integrates acceptable changes and schedules the next phase as the plan's dependencies allow. Closing the work order takes more than an implementation agent's declaration that it has finished: a separate agent checks the Definition of Done, confirms that the expected changes were integrated, and reviews the evidence offered for completion.

### Engineering the process

A process described in natural language is useful, and an agent may still neglect a step. That becomes consequential when the same process runs thousands of times, so the engineer decides which parts of it to encode and with how much authority.

| Engineering decision | Mechanism | Consequence |
|---|---|---|
| Which instructions persist? | Governance document | Agents receive durable guidance |
| Which rules are mandatory? | Lints and validators | Violations can be rejected |
| What must precede dispatch? | Pre-dispatch hook | Invalid assignments are blocked |
| What knowledge is relevant? | Query Repo | Agents retrieve associated models |
| When is work complete? | Definition of Done | Completion requires independent review |

The governance document separates portable engineering principles from rules specific to the repository, and the two reach enforcement along one chain: **principle, project rule, executable check**. A general principle discourages bypassing a project's established abstractions. A project rule turns that principle into a prohibition on direct access to a particular document-processing library. A lint checks for the prohibited usage. The principle gains a concrete realization, and the project rule becomes enforceable without relying on an agent's interpretation of it.

The rows above differ in authority, and the engineer chooses deliberately between them. A deterministic check rejects an operation that violates a stated condition. A reminder raises the probability that an agent follows a procedure and guarantees nothing. Git hooks supply the familiar version: a pre-push hook runs inexpensive checks before allowing a push, and a commit-message hook requires traceability information. Agent harnesses offer the same lifecycle events one layer up. Before dispatch, a hook checks that the agent has an isolated worktree and a valid work order, and the dispatch brief itself is assembled from a template and checked, so an agent carrying missing or inconsistent instructions is never launched. At startup the agent receives its task-specific instructions. When it returns, a hook reminds the orchestrator to examine the result, integrate what is acceptable, and dispatch the next phase.

The engineer also requires each implementation agent to refine its assigned plan before beginning substantial changes. Its first commit records the intended steps and the target files, and later commits report progress against that record, which lets the orchestrator tell completed work from an agent that stopped early.

Naming the target files buys something further. Query Repo retrieves the models, tests, static analyses, and invariants associated with a file, so an agent about to modify that file can collect the relevant obligations before it changes anything. Without the query, the agent reconstructs the same knowledge by trial and error: modify the code, hit a failing test or analysis, infer the violated constraint, try again. The agent still reasons. The factory simply stops charging it for knowledge the engineering organization already holds, which is modeling put to work for a reader that is not human.

### Improving the infrastructure

The engineer identifies the bottlenecks and changes the environment so that agents spend their effort on the reasoning the work genuinely requires. More agents accomplish little if they wait on tests, contend for shared resources, or repeat avoidable investigations.

Asynchronous validation is the clearest case, and it arrived through a failure. The environment originally validated batches of completed changes at regular intervals. As the test suite grew to roughly thirty minutes, validation became the limit on how fast completed work could be integrated. Validating in the background on every land replaced one bottleneck with another, because that workload scaled with the number of changes and overwhelmed the host. So the engineer separated the two concerns. Inexpensive admission checks run synchronously and decide whether a change may land. A broad validation sweep runs on its own timer, at a rate the host can sustain however many changes have landed. When the sweep finds a blocking failure on the main branch, it records an alert, and a pre-dispatch gate refuses to launch further agents until the condition is handled, so no agent silently inherits a known-bad main.

![Two lanes run side by side. In the left lane, integration and synchronous, implementation agents send a "land a change" edge into cheap admission checks that run on every land, and those send an "admit" edge into the main branch, the integrated tree. In the right lane, validation and timer-driven, an independent timer sends a "fires on a schedule" edge into a broad validation sweep that runs the full test suite, beside a note reading "Lands do not trigger the sweep." The two lanes connect by exactly one edge: a dashed line drawn outward from the sweep and labelled "reads main", so no edge leads from a land into the sweep. The sweep branches into a green "pass" edge reaching a no-alert box where dispatch continues, and a red "fail" edge reaching a known blocking failure recorded as an alert. The alert feeds a pre-dispatch gate that refuses new dispatch, and a red edge runs from that gate around the left of the figure and back into the implementation agents, labelled "no new dispatch while the alert stands". The gate branches into two handling outcomes: acknowledged, captioned "dispatch resumes, main is not yet proven healthy", and resolved, captioned "the defect is repaired, the next sweep can pass". A note at the lower left reads "acknowledgment is not health: only a passing sweep establishes that main is healthy."](figures/asynchronous-validation.svg)

*Figure: Asynchronous validation with a dispatch gate. The sweep runs on its own timer, so validation cost does not scale with the rate of landing. A recorded blocking failure closes the gate on new dispatch. Acknowledging the alert reopens the gate without establishing that main is healthy.*

The redesign bought faster integration and paid for it with delayed detection, and it created obligations of its own: the sweep must actually be scheduled and running, alerts must be handled rather than merely dismissed, and the gate must fail closed. The engineering judgment is which checks must block a change, which may run behind it, and what recovery the factory owes when a late check fails.

Unnecessary reasoning is the second bottleneck. Planning a difficult change justifies substantial inference. Rediscovering an architectural constraint the repository already records does not. Templates, repository queries, and executable controls shift effort out of reconstruction and into the decisions that genuinely need making.

Failures convert into controls. A recurring problem may begin as a correction to one agent's output. When it persists, the engineer revises a template, introduces an engineering model, strengthens a check, or changes the production process, and that control then governs every agent dispatched afterward. This is the failure-aware engineering process from earlier in Act II, turned on the development environment rather than on the software it produces.

Delegation has a limit here. Agents can repair defects in existing automation, and they will often keep optimizing an inadequate process rather than proposing a different one. Recognizing that the factory itself needs redesign, and determining what evidence justifies continuing to operate it, remains the engineer's responsibility.

## Measurement for decision-making

A factory is an engineering investment. It costs resources to construct, operate, and maintain, and those costs must be justified by what the factory enables. The relevant question is how economically can the organization produce acceptable changes to its software? A factory's process and tolerance mechanisms must be evaluated together: stronger checks may reduce defects but increase latency, while faster admission may reduce waiting at the cost of additional diagnosis and recovery.

Implementation throughput provides only part of the answer. A factory that generates many changes but requires extensive human correction may perform worse than one producing fewer changes with stronger evidence. Useful measurements therefore include the end-to-end cost and latency of accepted changes, the amount of human supervision required, the frequency of rejected or reverted changes, and failures observed after deployment. Each measures a different aspect of the production system.

The *Open Source Software, Closed Software Factory* paper proposes comparing organizations that possess the same source code but different production resources. It distinguishes replicating existing software, modifying it under specified requirements, and evolving it as requirements and constraints change. The hypothesis is that capable agents may make replication and some modifications inexpensive while substantial differences remain in organizations' ability to evolve software reliably.

This brings the discussion back to the opening premise. Possessing source code gives an organization an implementation. Its engineering environment determines how much knowledge must be reconstructed, how much work can be delegated, and what evidence is required to change that implementation responsibly.

## Engineering the ability to change

Act II began with delegation: deciding what work an agent may perform and what responsibility remains with the engineer. Modeling made consequential knowledge explicit. Alignment connected obligations to controls, while Failure-Aware Engineering examined how experience can improve both the engineer and the environment.

An agentic software factory brings these activities together as a production system. Process design determines how work proceeds around capable agents. Tolerance determines which properties their work must preserve. Both require engineering judgment, and both can be improved as the organization learns.

In DocAble, these changes accumulate in the factory's models, templates, and controls, allowing subsequent agents to benefit from engineering decisions made during earlier work.

As agents improve, the process required to direct them may change substantially. They may need less decomposition, recover context more effectively, or perform tasks that previously required close supervision. The obligations of the resulting software do not disappear with those improvements. Engineers must still determine what variation is acceptable and what evidence justifies admitting a change.

Software engineering has always concerned the creation and evolution of software systems. Agentic production changes how much realization work can be delegated and how the engineering environment must support it. The factory is one way an organization preserves the capability to make consequential changes without reconstructing the knowledge and judgment behind every earlier decision.
