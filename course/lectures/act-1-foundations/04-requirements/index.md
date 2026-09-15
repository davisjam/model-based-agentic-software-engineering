---
title: Requirements
readings:
  groups:
    - heading: Organized textbook treatment
      items:
        - 'Sommerville (2016), *Software Engineering*, 10th ed., Ch. 4, "Requirements Engineering." An organized introduction to requirements engineering, including functional and nonfunctional requirements, elicitation, analysis, validation, and requirements change. (Boston: Pearson, 2016; available through O''Reilly Learning.)'
    - heading: Stories from practice
      items:
        - '["The New User Story Backlog Is a Map."](https://web.archive.org/web/20190718153846/https://www.jpattonassociates.com/the-new-backlog/) Patton, 2008. A short practitioner article on organizing requirements around what users are trying to accomplish rather than treating the backlog as a flat collection of features. Full citation: Jeff Patton, "The New User Story Backlog Is a Map," Jeff Patton & Associates, October 8, 2008.'
        - '["Requirements Elicitation with a Service Canvas for Packaged Enterprise Systems."](https://doi.org/10.1109/RE.2019.00043) Kostova et al., 2019. An industrial case study of requirements elicitation for a Salesforce integration. Read §1 and §3, skim §5, and read §6; focus on how Nexell moves from stakeholder needs and business activities to system requirements, and on what the customer''s initial list of requirements failed to capture. Full citation: Blagovesta Kostova, Lucien Etzlinger, David Derrier, Gil Regev, and Alain Wegmann, "Requirements Elicitation with a Service Canvas for Packaged Enterprise Systems," in *2019 IEEE 27th International Requirements Engineering Conference (RE)* (IEEE, 2019), 340–350, doi:10.1109/RE.2019.00043. (Not self-hosted; access via IEEE Xplore.)'
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

Software systems are built for purposes in the world. Requirements engineering connects those purposes to decisions about what the system should do and what constraints it must satisfy. This is not simply a matter of asking users what they want. Relevant needs may be implicit, stakeholders may disagree, and obligations may also come from existing systems, operations, contracts, laws, standards, and the surrounding domain.

This module treats requirements engineering as two coupled problems: discovering what would create value, and deciding what we can responsibly promise. Work on either can change our understanding of the other.

## Discovering what would create value

Requirements begin with people: what are they trying to accomplish, what problems matter to them, and under what conditions will the software be used? Engineers learn this from stakeholders and from the environment in which people work.

No single technique reveals all the requirements. Interviews, surveys, and workshops expose what people can articulate. Observation reveals work practices, tacit knowledge, and workarounds people do not think to report. Existing systems and competitors show current capabilities and expectations. Prototypes and experiments let people react to concrete possibilities rather than describe an imagined system in advance.

These activities produce candidate requirements: possible commitments that deserve consideration. Discovery alone does not determine which candidates to accept. A requested feature may have little value, conflict with another need, cost more than it is worth, or be infeasible under the available constraints. Conversely, something important may never have been explicitly requested.

Software's changeability makes building particularly useful as a discovery technique. A prototype or partial implementation can test an assumption, expose a missing need, or give stakeholders something concrete to evaluate. As GenAI reduces the cost of producing such artifacts, engineers can increasingly obtain evidence by building rather than by discussion or prediction. What is learned may confirm a candidate requirement, change it, reveal another, or show the idea should be abandoned.

## Deciding which commitments to make

Discovering that something would create value does not mean that engineers should promise it. A customer may want ten valuable capabilities when the project can responsibly deliver five. Choosing one use of engineering resources necessarily forgoes others.

Engineers weigh seven kinds of information when deciding whether to make a commitment. None provides a formula; each can change the decision.

- **Value.** What would it contribute to the purposes the system serves?
- **Feasibility.** Can it be built under the available constraints?
- **Cost.** What would delivering and keeping it take?
- **Dependencies.** What else must exist or hold for it to work?
- **Risk.** What could go wrong in building or having built it?
- **Opportunity cost.** What else could the same effort accomplish?
- **Responsibility.** What obligations would it impose on those it affects?

![A candidate requirement flows into the central decision, "Should we make this commitment?", which is weighed by value, feasibility, cost, dependencies, risk, opportunity cost, and responsibility. The decision resolves to one of four peer outcomes: accept, revise, learn more, or reject. Accept yields a requirement.](figures/commitment-decision.svg)

*All four outcomes are legitimate resolutions; only accept yields a requirement.*

The cost of a commitment includes more than implementation. A feature may require architectural changes, integration with other systems, additional validation, operational support, security controls, maintenance, or compatibility commitments that persist long after its code has been written.

Estimation informs the commitment decision. Engineers need some understanding of scope to estimate effort, while estimates can change which scope is worth accepting. A customer may reconsider a requirement after learning its likely cost. Engineers may revise it to obtain most of its value more cheaply, or decide that more information is needed first.

Professional responsibility also affects the decision. A requested system may be feasible and economically attractive while imposing unacceptable risks on users, workers, or others affected by it. Engineers must therefore consider not only what people value and what can be built, but the consequences of accepting the obligation.

GenAI changes some of these judgments by reducing implementation and experimentation costs. It does not remove the costs of integration, validation, operation, maintenance, or future change, nor does it decide whether a commitment is worthwhile. A capability that has become cheap to implement may become worth accepting; another may remain a poor commitment because its other consequences dominate its implementation cost.

## Discovery and commitment interact

Discovery and commitment are coupled rather than sequential. Attempts to evaluate a commitment often reveal something new about what would create value. An estimate may expose a dependency that changes the proposed requirement. A prototype may show that a requested workflow does not solve the underlying problem. Negotiation may reveal that one stakeholder's requirement conflicts with another's. Engineers may reject one candidate and discover an alternative that achieves the same purpose at lower cost or risk.

The outcome *learn more* is therefore an important engineering decision. When uncertainty could change whether a commitment should be accepted, engineers can ask what information is missing and whether obtaining it is worth the cost. They might interview another stakeholder, observe the current workflow, investigate a dependency, improve an estimate, or build a prototype. The resulting evidence feeds back into both discovery and commitment.

A useful working loop is: discover → organize → negotiate → record → learn → repeat.

Different software processes run this loop at different tempos. A plan-driven project may establish a substantial set of commitments before implementation begins. An incremental project may revisit them frequently as partial systems produce evidence. Later specification, architecture, implementation, validation, and use can also expose information that reopens an earlier requirements decision.

The aim is to learn enough to make commitments that can be justified given what is known.

## From requirements to specification

Accepting a requirement decides what the engineering effort is willing to promise. The requirement may still leave substantial freedom in what the software actually does.

For example, a requirement to "warn users before illness affects their day" identifies a desired outcome, but does not establish which observations justify a warning, when the warning should occur, or what behavior counts as satisfying the requirement.

Specification addresses those questions. It makes accepted requirements precise enough to distinguish acceptable from unacceptable realizations while leaving other choices open.
