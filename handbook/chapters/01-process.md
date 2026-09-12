---
id: process
title: Software Process
short_title: Process
order: 1
status: draft
description: >
  A software process orders the activities of building software. The right ordering is not universal;
  it is an engineering choice shaped by how much can be known in advance, how expensive change is, and
  whether partial systems can deliver value.
objectives:
  - Explain why no ordering of engineering activities is universally correct.
  - Reason about a process choice along the dimensions of foreknowledge, cost of change, and incremental value.
  - Relate the economics of process to the engineered medium.
---

**Premise.** *The engineered medium affects the engineering process.*

::: {.definition #def-software-process title="Software process"}
A software process organizes engineering activities: deciding what to build, designing it,
implementing it, validating it, and learning from the result. There is no universally correct
ordering of these activities. Process is an engineering choice shaped by properties of the system
and its environment.
:::

## A model for the process choice

A simple model reasons about that choice along three dimensions.

- **How much can we know before we build?** When requirements and solutions can be established
  confidently in advance, more work can be planned up front. When building is itself a way of
  discovering what is needed, shorter feedback cycles become more valuable.
- **How expensive is change?** Processes inherited from conventional engineering reflect media in
  which late change can be extraordinarily expensive. Software makes many changes cheaper — but not
  all changes cheap.
- **Can partial systems be built, validated, or deliver value?** When useful evidence or value can be
  obtained incrementally, development can proceed in smaller slices. When the system must
  substantially exist before it can be meaningfully evaluated, incremental approaches have less
  leverage.

These dimensions explain much of the movement from plan-driven development toward iterative,
incremental, and Agile processes. They also explain why no methodology is universally appropriate:
different systems occupy different points in this space.

## The engineered medium

Underlying all three dimensions is the engineered medium. As software platforms, cloud
infrastructure, reusable components, and now commodity machine intelligence reduce the cost of
producing and changing implementations, the economics of process change with them. GenAI accelerates
this shift: implementation may become dramatically cheaper without making requirements, judgment,
validation, or consequences correspondingly easier.
