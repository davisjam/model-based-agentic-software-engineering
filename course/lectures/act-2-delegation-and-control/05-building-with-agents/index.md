---
title: Building with Agents
sessions:
  - "Building with Agents: Agentic Workshop"
  - "Building with Agents: Software Factories"
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
    - heading: A factory applied to the code nobody wanted to touch
      items:
        - cite: launchdarkly2026factory
          annotation: 'LaunchDarkly, ["Building a Software Factory on Our Scariest Code"](https://launchdarkly.com/blog/building-a-software-factory-on-our-scariest-code/). Two engineers used Claude Code to rewrite LaunchDarkly''s oldest and most critical frontend code (about 66K lines) in six weeks for about $7K. Their lessons: get the codebase ready first, treat the old code as the spec, work in phases with a human steering, and use feature flags for safety rather than aiming for full autonomy. It is a company blog post, so the results are self-reported — read the method, and ask which claims the post gives you evidence for.'
    - heading: The factory, as the textbook develops it
      items:
        - cite: davis2026mage
          locator: '§5.1, §5.3, and §5.4'
          annotation: '{mage:5.1}, {mage:5.3}, and {mage:5.4} Davis, 2026. Read §5.1 for what a software factory is, and §5.4 for the two problems this unit is organized around — process design and tolerance. Skim the industrial cases in §5.3: attend to the comparison between organizations rather than to every implementation detail. §5.2 is valuable but too long for this assignment and is not assigned.'
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
---

**Premise.** *A software organization's engineering capability depends not only on the software it possesses, but on its ability to change that software reliably.*

Software is an unusually changeable engineering medium. Requirements evolve, defects are discovered, dependencies change, and new technologies make previously expensive capabilities practical. A software organization must therefore do more than produce a working implementation. It must be able to change that implementation while preserving the properties on which its users depend.

Coding agents change the economics of this work. They can produce substantial implementations from relatively informal instructions, reducing the amount of human effort required for realization. But generating a change and establishing that it is acceptable remain different engineering activities. As implementation becomes cheaper, the knowledge and machinery required to direct, evaluate, and integrate changes become increasingly important.

This unit concludes Act II by examining how engineers build software with agents. The first lecture develops the mechanisms for delegating individual development tasks. The second considers how those mechanisms become part of a software factory, an engineered production system for repeatedly producing controlled changes to software.

## Structure of this unit

**Lecture 1: Building with Coding Agents.** We examine the practical mechanisms that make an agent useful in a software repository: context engineering, persistent instructions, tools, MCP, skills, and feedback loops. A guided exercise uses these mechanisms to investigate and repair an implementation while preserving its existing obligations.

**Lecture 2: Agentic Software Factories.** We extend the individual development environment into a production system. The factory metaphor introduces two complementary engineering problems, process design and tolerance. Industrial examples illustrate different ways organizations arrange agentic production, preserve engineering knowledge, and control the admission of changes.

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

```text
                    SOFTWARE FACTORY

 PROCESS DESIGN
 How production proceeds

 Engineering intent
        |
        v
 Context and work preparation
        |
        v
     Fabricator  <---- Tools and guidance
        |
        v
 Proposed realization
        |
        v
 Measurement and evaluation
        |
        +-----------------------------+
        |                             |
        v                             v
 Within tolerance              Outside tolerance
        |                             |
        v                             v
 Admitted change                 Revise or reject

 TOLERANCE
 Which variation is acceptable?
```

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

## Measurement for decision-making

A factory is an engineering investment. It costs resources to construct, operate, and maintain, and those costs must be justified by what the factory enables. The relevant question is how economically can the organization produce acceptable changes to its software?

Implementation throughput provides only part of the answer. A factory that generates many changes but requires extensive human correction may perform worse than one producing fewer changes with stronger evidence. Useful measurements therefore include the end-to-end cost and latency of accepted changes, the amount of human supervision required, the frequency of rejected or reverted changes, and failures observed after deployment. Each measures a different aspect of the production system.

The *Open Source Software, Closed Software Factory* paper proposes comparing organizations that possess the same source code but different production resources. It distinguishes replicating existing software, modifying it under specified requirements, and evolving it as requirements and constraints change. The hypothesis is that capable agents may make replication and some modifications inexpensive while substantial differences remain in organizations' ability to evolve software reliably.

This brings the discussion back to the opening premise. Possessing source code gives an organization an implementation. Its engineering environment determines how much knowledge must be reconstructed, how much work can be delegated, and what evidence is required to change that implementation responsibly.

## Engineering the ability to change

Act II began with delegation: deciding what work an agent may perform and what responsibility remains with the engineer. Modeling made consequential knowledge explicit. Alignment connected obligations to controls, while Failure-Aware Engineering examined how experience can improve both the engineer and the environment.

An agentic software factory brings these activities together as a production system. Process design determines how work proceeds around capable agents. Tolerance determines which properties their work must preserve. Both require engineering judgment, and both can be improved as the organization learns.

As agents improve, the process required to direct them may change substantially. They may need less decomposition, recover context more effectively, or perform tasks that previously required close supervision. The obligations of the resulting software do not disappear with those improvements. Engineers must still determine what variation is acceptable and what evidence justifies admitting a change.

Software engineering has always concerned the creation and evolution of software systems. Agentic production changes how much realization work can be delegated and how the engineering environment must support it. The factory is one way an organization preserves the capability to make consequential changes without reconstructing the knowledge and judgment behind every earlier decision.
