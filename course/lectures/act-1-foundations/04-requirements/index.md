---
title: Requirements Engineering
readings:
  groups:
    - heading: Organized textbook treatment
      items:
        - 'Sommerville (2016), *Software Engineering*, 10th ed., Ch. 4, "Requirements Engineering." An organized introduction to requirements engineering, including functional and nonfunctional requirements, elicitation, analysis, validation, and requirements change. (Boston: Pearson, 2016; available through O''Reilly Learning.)'
    - heading: Stories from practice
      items:
        - 'Jeff Patton, "The New User Story Backlog Is a Map," Jeff Patton & Associates, October 8, 2008. A short practitioner article on organizing requirements around what users are trying to accomplish rather than treating the backlog as a flat collection of features. (Archived copy used for the course.)'
        - '["Requirements Elicitation with a Service Canvas for Packaged Enterprise Systems."](https://doi.org/10.1109/RE.2019.00043) Kostova et al., 2019. An industrial case study of requirements elicitation for a Salesforce integration. Read §§1 and 3, skim §5, and read §6; focus on how Nexell moves from stakeholder needs and business activities to system requirements, and on what the customer''s initial list of requirements failed to capture. Full citation: Blagovesta Kostova, Lucien Etzlinger, David Derrier, Gil Regev, and Alain Wegmann, "Requirements Elicitation with a Service Canvas for Packaged Enterprise Systems," in *2019 IEEE 27th International Requirements Engineering Conference (RE)* (IEEE, 2019), 340–350, doi:10.1109/RE.2019.00043. (Not self-hosted; access via IEEE Xplore.)'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — Requirements Engineering
    src: slides/1-4-RequirementsEngineering.pptx
---

**Premise.** *Requirements engineering turns uncertainty about what matters into engineering commitments.*

Software systems are built for purposes in the world. Requirements engineering connects those purposes to decisions about what the system should do and what constraints it must satisfy. This is not simply a matter of asking users what they want. Relevant needs may be implicit, stakeholders may disagree, and obligations may also come from existing systems, operations, contracts, laws, standards, and the surrounding domain.

This module treats requirements engineering as two coupled problems: discovering what would create value, and deciding what we can responsibly promise.

## Discovering what to build

Requirements begin with purpose: what are people trying to accomplish, what problem matters, and what conditions must hold? Engineers learn this from stakeholders and from the environment in which the system will operate.

Different techniques reveal different kinds of information:

- **Interviews, surveys, and workshops** expose what people can articulate.
- **Observation** reveals work practices, tacit knowledge, and workarounds.
- **Existing systems and competitors** show solutions and expectations that already exist.
- **Prototypes and experiments** let stakeholders react to concrete possibilities rather than describe an imagined system in advance.

Requirements engineering is therefore iterative. Engineers discover candidate requirements, organize and negotiate them, record decisions, and revise them as they learn more. The appropriate tempo depends on the engineering process.

## Deciding what to promise

Discovering that something would be valuable does not automatically make it a requirement. Accepting a requirement creates an engineering obligation and consumes resources that could have been spent elsewhere.

Feasibility, cost, dependencies, risk, and opportunity cost therefore belong inside requirements engineering. Estimates and requirements necessarily co-evolve: engineers need some understanding of scope to estimate cost, while cost affects which scope is worth pursuing. The objective is not to eliminate uncertainty before making a decision, but to reduce it enough to make a defensible commitment.

As implementation becomes cheaper, these decisions do not disappear. GenAI can make prototypes and implementations inexpensive enough to use as tools for learning, but requirements, integration, validation, operations, maintenance, and change still carry costs. Cheaper implementation changes the economics of what we promise; it does not abolish those economics.

## From requirements to specification

Requirements engineering asks *what should we promise?* Specification asks *what exactly are we promising?*

The next module considers how accepted obligations can be represented precisely enough to support implementation, reasoning, validation, and change.
