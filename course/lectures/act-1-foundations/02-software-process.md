---
title: Software Process
readings:
  groups:
    - heading: The engineered medium
      items:
        - '{mage:1.1} A contemporary perspective on how commodity intelligence changes the economics of software production. The reading asks what happens to software engineering when implementation becomes abundant relative to engineering judgment, and provides a useful lens for considering why engineering processes change as the underlying productive medium changes.'
    - heading: Process models
      items:
        - 'Royce (1970), "Managing the Development of Large Software Systems: Concepts and Techniques." Summarizes early efforts and failures to engineer large software systems.'
        - 'The Mythical Man-Month, Ch. 11. Covers similar ground to Royce from Brooks''s more informal, essay-like perspective.'
        - '[Beck (1999), "Embracing Change with Extreme Programming."](https://ieeexplore.ieee.org/document/796139) Describes the major practices of XP and its approach to embracing change compared with traditional Waterfall development.'
        - 'The [Agile Manifesto](https://agilemanifesto.org/) and its [Principles](https://agilemanifesto.org/principles.html). Beck, Fowler, Martin, et al., 2001.'
        - '[The Scrum Guide](materials/scrum-guide-2020.pdf). Schwaber & Sutherland, November 2020. (Source: [redagile.com/scrum-guide](https://www.redagile.com/scrum-guide).)'
    - heading: A critical perspective
      items:
        - '["Extreme Programming Considered Harmful."](materials/extreme-programming-considered-harmful.pdf) Presents an engineering critique of Extreme Programming and reiterates the practices of XP.'
      note: 'Actual engineering experience with Agile, and XP in particular, has been mixed. They may be suitable for low-assurance systems but inappropriate for high-assurance systems. It is hard to disentangle reports about "Agile" from the attitude of "Continuous Delivery," which can be achieved whether a project is following an incremental or plan-based approach. See the PDF for one person''s perspective based on their engineering experiences. The usual disclaimers about bias and small sample size apply. The "XP considered harmful" paper is not being presented as statistically valid evidence, but rather to expose students to different viewpoints.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — SE processes and methodologies
    src: materials/1-2-SEProcessesAndMethodologies.pptx
---

**Premise.** *The engineered medium affects the engineering process.*

A software process organizes engineering activities: deciding what to build, designing it, implementing it, validating it, and learning from the result. There is no universally correct ordering of these activities. Instead, process is an engineering choice shaped by properties of the system and its environment.

## A model for the process choice

This module develops a simple model for reasoning about that choice along three dimensions:

- *How much can we know before we build?* When requirements and solutions can be established confidently in advance, more work can be planned up front. When building is itself a way of discovering what is needed, shorter feedback cycles become more valuable.
- *How expensive is change?* Processes inherited from conventional engineering reflect media in which late change can be extraordinarily expensive. Software makes many changes cheaper—but not all changes cheap.
- *Can partial systems be built, validated, or deliver value?* When useful evidence or value can be obtained incrementally, development can proceed in smaller slices. When the system must substantially exist before it can be meaningfully evaluated, incremental approaches have less leverage.

These dimensions explain much of the movement from plan-driven development toward iterative, incremental, and Agile processes. They also explain why no methodology is universally appropriate: different systems occupy different points in this space.

## The engineered medium

Underlying all three dimensions is the engineered medium. As software platforms, cloud infrastructure, reusable components, and now commodity machine intelligence reduce the cost of producing and changing implementations, the economics of process change with them. GenAI accelerates this shift: implementation may become dramatically cheaper without making requirements, judgment, validation, or consequences correspondingly easier.
