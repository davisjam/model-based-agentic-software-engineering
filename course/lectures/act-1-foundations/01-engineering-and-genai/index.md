---
title: Engineering & GenAI
readings:
  groups:
    - heading: The new engineering problem
      items:
        - '[MAGE Part I, "The New Engineering Problem."](https://davisjam.github.io/model-based-agentic-software-engineering/book/mage-book/part-1-intro.html) Davis, 2026. Develops the premise that commodity intelligence changes the economics of software engineering by making implementation capacity abundant relative to engineering judgment. Introduces the resulting imbalance and asks where engineering effort moves when producing implementation is no longer the dominant constraint.'
    - heading: The MAGE argument
      items:
        - '[MAGE Part 0, "What This Book Argues"](https://davisjam.github.io/model-based-agentic-software-engineering/book/mage-book/0.2-what-this-book-argues.html) and ["MAGE on One Page."](https://davisjam.github.io/model-based-agentic-software-engineering/book/mage-book/0.3-the-mage-method-at-a-glance.html) Davis, 2026. A compact statement of MAGE''s six claims and their relationship: scale creates an enduring reasoning problem; commodity intelligence changes its economics; Modeling makes consequential knowledge explicit; Alignment makes obligations enforceable; governance conversion turns recurring judgment into durable structure; and engineering work reorganizes around what remains scarce.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — GenAI as an engineering tool
    src: slides/1-1-GenAIAsEngineeringTool.pptx
---

**Premise.** *Commodity intelligence changes the economics of software engineering.* As implementation becomes abundant, engineering does not disappear: its scarce resources become more visible.

This is the course's opening argument. It asks what changes when implementation capacity becomes abundant, and why generative AI is an engineering tool to be governed rather than a replacement for engineering judgment. The rest of the course develops the response.

## Six claims about software engineering with GenAI

This module introduces six claims about how GenAI changes software engineering:

1. **Commodity intelligence changes the economics of software engineering.** Implementation capacity is becoming abundant relative to engineering judgment. As implementation gets cheaper, engineering effort shifts toward what remains scarce: deciding what to build, representing the system clearly enough to reason about it, producing evidence, and making important requirements enforceable by the engineering environment.
2. **Scale creates a reasoning problem.** Large software systems already exceed the reasoning horizon of humans; agents inherit the same problem. Software engineering has always answered scale with abstraction. Commodity intelligence does not remove that need. It makes the representations that guide the work more important.
3. **Modeling makes engineering knowledge and intent explicit.** Purposeful models capture the knowledge and intent needed for engineering decisions while leaving irrelevant choices open. As commodity intelligence lowers the cost of deriving, maintaining, and using such representations, more engineering knowledge can be carried forward rather than reconstructed from implementation. Models let humans and agents reason about larger properties while deliberately leaving realization choices open where engineering has imposed no obligation.
4. **Alignment makes engineering obligations enforceable.** Important engineering decisions cannot live only in instructions to an agent or in a person's head. Alignment encodes selected obligations into checks and controls that can constrain work or determine what the environment will accept. Engineers can then give agents substantial freedom in how they build the system while retaining control over the properties that matter.
5. **Governance conversion turns recurring judgment into durable engineering structure.** When a failure exposes missing knowledge or an unenforced obligation, encode the lesson into a model, procedure, or mechanism that future work can inherit. Durable structure becomes engineering capital when later work keeps benefiting from it.
6. **Engineering work will reorganize around what remains scarce.** As implementation becomes cheaper, more engineering effort will move toward representation, evidence, governance, coordination, and judgment. Agents may perform increasing portions of that work as well. The durable boundary is responsibility for deciding what matters, what evidence is sufficient, which obligations should be enforced, and what tradeoffs remain acceptable.

## From the claims to MAGE

These six claims lead to MAGE: Model-Based Agentic Software Engineering. Its working cycle is: model consequential knowledge; enforce important obligations; do the governed work; convert recurring failures and judgment into durable structure; repeat. The goal is not maximum automation. It is to make greater autonomy possible while preserving the engineering decisions and controls that matter.

One question recurs throughout the course: *How do we safely grant autonomy to commodity intelligence—and what cannot be delegated?* The lecture develops Modeling, Alignment, and governance conversion from this engineering problem rather than presenting MAGE as a collection of prescribed practices.
