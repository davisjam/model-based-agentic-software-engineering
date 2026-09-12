---
id: requirements
title: Requirements Engineering
short_title: Requirements
order: 3
status: draft
description: >
  Requirements engineering turns uncertainty about what matters into engineering commitments. It
  couples discovering what would create value with deciding what can responsibly be promised.
objectives:
  - Distinguish discovering candidate requirements from deciding which to accept.
  - Explain why feasibility, cost, and opportunity cost belong inside requirements engineering.
  - Describe how cheaper implementation changes the economics of what we promise without abolishing it.
---

**Premise.** *Requirements engineering turns uncertainty about what matters into engineering
commitments.*

Software systems are built for purposes in the world.

::: {.definition #def-requirements-engineering title="Requirements engineering"}
Requirements engineering connects the purposes a system serves to decisions about what the system
should do and what constraints it must satisfy. It is not simply a matter of asking users what they
want: relevant needs may be implicit, stakeholders may disagree, and obligations may also come from
existing systems, operations, contracts, laws, standards, and the surrounding domain.
:::

Requirements engineering is therefore two coupled problems: discovering what would create value, and
deciding what we can responsibly promise.

## Discovering what to build

Requirements begin with purpose: what are people trying to accomplish, what problem matters, and what
conditions must hold? Engineers learn this from stakeholders and from the environment in which the
system will operate.

Different techniques reveal different kinds of information.

- **Interviews, surveys, and workshops** expose what people can articulate.
- **Observation** reveals work practices, tacit knowledge, and workarounds.
- **Existing systems and competitors** show solutions and expectations that already exist.
- **Prototypes and experiments** let stakeholders react to concrete possibilities rather than
  describe an imagined system in advance.

Requirements engineering is iterative. Engineers discover candidate requirements, organize and
negotiate them, record decisions, and revise them as they learn more. The appropriate tempo depends
on the engineering process.

## Deciding what to promise

Discovering that something would be valuable does not automatically make it a requirement. Accepting
a requirement creates an engineering obligation and consumes resources that could have been spent
elsewhere.

Feasibility, cost, dependencies, risk, and opportunity cost therefore belong inside requirements
engineering. Estimates and requirements necessarily co-evolve: engineers need some understanding of
scope to estimate cost, while cost affects which scope is worth pursuing. The objective is not to
eliminate uncertainty before making a decision, but to reduce it enough to make a defensible
commitment.

As implementation becomes cheaper, these decisions do not disappear. GenAI can make prototypes and
implementations inexpensive enough to use as tools for learning, but requirements, integration,
validation, operations, maintenance, and change still carry costs. Cheaper implementation changes the
economics of what we promise; it does not abolish those economics.

## From requirements to specification

Requirements engineering asks *what should we promise?* Specification asks *what exactly are we
promising?* @ch-specification considers how accepted obligations can be represented precisely enough
to support implementation, reasoning, validation, and change.
