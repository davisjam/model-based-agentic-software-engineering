---
title: Requirements
readings:
  groups:
    - heading: Organized textbook treatment
      items:
        - cite: sommerville2016
          locator: 'chap. 4, "Requirements Engineering"'
          annotation: 'An organized introduction to requirements engineering, including functional and nonfunctional requirements, elicitation, analysis, validation, and requirements change. (Available through O''Reilly Learning.)'
    - heading: Stories from practice
      items:
        - cite: patton2008backlogmap
          annotation: '["The New User Story Backlog Is a Map."](https://web.archive.org/web/20190718153846/https://www.jpattonassociates.com/the-new-backlog/) Patton, 2008. A short practitioner article on organizing requirements around what users are trying to accomplish rather than treating the backlog as a flat collection of features.'
        - cite: kostova2019canvas
          annotation: '["Requirements Elicitation with a Service Canvas for Packaged Enterprise Systems."](https://doi.org/10.1109/RE.2019.00043) Kostova et al., 2019. An industrial case study of requirements elicitation for a Salesforce integration. Read §1 and §3, skim §5, and read §6; focus on how Nexell moves from stakeholder needs and business activities to system requirements, and on what the customer''s initial list of requirements failed to capture. (Not self-hosted; access via IEEE Xplore.)'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — Requirements
    src: slides/1-4-RequirementsEngineering.pptx
---

**Premise.** *Requirements engineering turns uncertainty about what matters into engineering commitments.*

Software systems are built for purposes in the world. Before engineers decide how a system should work, they must make two coupled judgments:

- **What would create value?** Discover the problems, purposes, needs, and obligations that might justify engineering work.
- **What can we responsibly promise?** Decide which candidate obligations the engineering effort should accept.

Neither judgment is simply a matter of asking users what they want. Needs may be implicit, stakeholders may disagree, and obligations may come from operations, contracts, laws, standards, existing systems, and the surrounding domain. Work on either judgment can change the other. Requirements engineering does not eliminate uncertainty before commitment. It reduces uncertainty enough that a commitment can be defended.

## What would create value?

Requirements begin with people: what are they trying to accomplish, what problems matter to them, and under what conditions do they act? Engineers also need to understand how people expect the machine to participate in that activity: what they will provide to it, what they expect from it, where it fits into their workflow, and what else in the environment affects whether the result is useful. A requested feature is evidence about these questions, not necessarily the answer. Other obligations may originate in operations, contracts, regulations, standards, or existing systems rather than with users at all.

Different discovery techniques expose different information:

- **Ask** when people can articulate what matters.
- **Observe** when knowledge is embedded in work practices, tacit expectations, or workarounds.
- **Compare** when existing systems or prior attempts provide evidence about value and alternatives.
- **Build** when a prototype or experiment can cheaply test an assumption or provoke useful feedback.

Choosing among them is itself an engineering judgment: *which action will buy the information needed for the next consequential decision?* Software's changeability makes building unusually useful because a partial realization can sometimes reveal information more cheaply than prolonged prediction. As implementation becomes cheaper, including through GenAI, building can become a more attractive requirements technique.

Discovery produces **candidate requirements**: possible obligations worth considering. It does not establish that those obligations should be accepted.

## What can we responsibly promise?

A **candidate requirement** is an obligation under consideration. A **requirement** is an obligation the engineering effort has accepted. The central judgment is therefore: *Should we make this commitment?*

Several considerations bear on that decision:

- **Value.** What would the candidate contribute, and for whom?
- **Feasibility.** Can it be satisfied under the available constraints?
- **Cost.** What will making and keeping the commitment require?
- **Dependencies.** What else must exist or remain true?
- **Risk.** What could go wrong in building, operating, or relying on it?
- **Opportunity cost.** What else could the same engineering effort accomplish?
- **Responsibility.** What consequences would accepting it make us responsible for?

![A candidate requirement flows into the central decision, "Should we make this commitment?", which is weighed by value, feasibility, cost, dependencies, risk, opportunity cost, and responsibility. The decision resolves to one of four peer outcomes: accept, revise, learn more, or reject. Accept yields a requirement.](figures/commitment-decision.svg)

*All four outcomes are legitimate resolutions; only accept yields a requirement.*

These considerations structure judgment rather than provide a formula. A valuable capability may be infeasible or too risky; a feasible capability may not justify its cost; two worthwhile candidates may compete for the same resources. Cost includes not only implementation but also integration, validation, operation, support, security, maintenance, and future change. Estimates can therefore change which commitments are worth making, while professional responsibility can rule out commitments whose consequences engineers should not accept.

## Accept, revise, learn more, or reject

A commitment decision has four legitimate outcomes:

- **Accept.** Take responsibility for satisfying the candidate; it becomes a requirement.
- **Revise.** Change its scope, conditions, or obligation and reconsider it.
- **Learn more.** Acquire information that could materially change the decision.
- **Reject.** Decline the commitment under what is known.

**Learn more** matters because uncertainty is not itself a reason to accept or reject. Ask: *What don't we know? Could knowing it change the decision? What would it cost to find out?* If missing information could change an important decision and can be obtained economically, learning is the engineering decision.

This gives requirements work a stopping condition. Engineers do not need to know everything before accepting a requirement. They need enough evidence that the commitment can be defended given its consequences and the remaining uncertainty.

## The judgments remain coupled

Trying to decide what to promise often changes what appears valuable. An estimate may reveal an unexpected dependency; a prototype may show that the original request solves the wrong problem; risk analysis may expose an obligation that remained implicit. That information flows back into discovery, while new evidence about stakeholder needs and the environment flows forward into commitment.

The coupling continues after requirements work. Specification, architecture, implementation, validation, operation, and use can all produce evidence that reopens an earlier decision. Requirements are commitments, not claims of perfect foresight.

## Measurement for decision-making

Before committing to a requirement, ask *what would later show that the promised outcome actually occurred?* Response time, energy consumption, and transaction capacity suggest direct measurements. Other outcomes need a measurement model first: "easy to use" might be investigated through a usability study that records task-completion times, error rates, and where participants hesitate, with a standardized questionnaire supplying a second view. Some requirements resist measurement entirely. Observing no security failures does not establish that none remain possible, so safety and security need several forms of evidence at once, each explicit about what it leaves open. Requirements also differ in **criticality**: inconvenience for one, safety or mission failure for another. Making that judgment now lets later work allocate design attention and validation evidence according to consequence.

## From requirements to specification

Accepting a requirement establishes what the engineering effort is willing to promise in the world. Requirements work should also have established enough understanding of that world to explain the commitment: what stakeholders are trying to accomplish, how they expect to interact with the machine, and what relevant conditions surround that interaction.

It does not yet follow exactly what the machine must guarantee. Some responsibility may reasonably remain with users, operators, other systems, or the surrounding environment; other responsibility must belong to the machine itself. Nor has the requirement necessarily settled every consequential distinction among acceptable machine behaviors.

Requirements asks: *what should we promise?* Specification asks: *what must the machine and its environment provide for us to keep that promise?* Specification takes the accepted commitment and the understanding behind it, then decides where responsibility belongs and which differences among possible realizations must be constrained.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Requirements" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/04-requirements.html)
