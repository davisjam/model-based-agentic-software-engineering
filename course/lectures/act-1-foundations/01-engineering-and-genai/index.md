---
title: Engineering & GenAI
readings:
  groups:
    - heading: The new engineering problem
      items:
        - '[MAGE Part I, "The New Engineering Problem."](https://davisjam.github.io/model-based-agentic-software-engineering/book/part-1-intro.html) Davis, 2026. Develops the premise that commodity intelligence changes the economics of software engineering by making implementation capacity abundant relative to engineering judgment. Introduces the resulting imbalance and asks where engineering effort moves when producing implementation is no longer the dominant constraint.'
    - heading: The MAGE argument
      items:
        - '[MAGE Part 0, "What This Book Argues"](https://davisjam.github.io/model-based-agentic-software-engineering/book/0.2-what-this-book-argues.html) and ["MAGE on One Page."](https://davisjam.github.io/model-based-agentic-software-engineering/book/0.3-the-mage-method-at-a-glance.html) Davis, 2026. A compact statement of MAGE''s six claims and their relationship: scale creates an enduring reasoning problem; commodity intelligence changes its economics; Modeling makes consequential knowledge explicit; Alignment gives obligations authority; governance conversion turns recurring judgment into durable structure; and engineering work reorganizes around what remains scarce.'
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

## Six claims that frame the course

This module introduces six claims that frame the course:

1. **Commodity intelligence changes the economics of software engineering.** Implementation capacity is becoming abundant relative to engineering judgment. Engineering effort therefore shifts toward what remains scarce: deciding what to build, representing consequential knowledge, producing evidence, coordinating work, and determining what should be accepted.
2. **Scale creates a reasoning problem.** Large software systems already exceed the reasoning horizon of any one engineer; agents inherit the same problem. More context helps, but does not replace abstraction. Software engineering has always answered scale by finding representations that let us reason without holding the entire implementation in mind.
3. **Modeling makes engineering knowledge and intent explicit.** Requirements, architecture, behavior, ownership, policies, measurements, and other models preserve the information needed to answer engineering questions while suppressing irrelevant detail. As machine intelligence makes these representations cheaper to create, maintain, and use, more engineering knowledge can be carried forward instead of repeatedly reconstructed.
4. **Alignment gives engineering obligations authority.** Important requirements should not depend only on an agent remembering an instruction or a human noticing a violation. Constraints, sensors, validators, and gates can make selected obligations consequential: they restrict actions, produce evidence, check results, and determine what work may proceed.
5. **Recurring judgment should become durable engineering structure.** When a failure, repeated decision, or observed gap reveals something future work should inherit, encode the lesson into a model, procedure, or mechanism. This governance conversion turns repeated engineering effort into engineering capital rather than engineering churn.
6. **Engineering work reorganizes around what remains scarce.** As implementation becomes cheaper, engineering effort moves toward representation, evidence, governance, coordination, and judgment. Agents may increasingly assist with these activities too. The durable human role is therefore not defined by whatever machines happen to be unable to do today, but by responsibility for deciding what matters, what evidence is sufficient, which obligations deserve authority, and which tradeoffs are acceptable.

## From the claims to MAGE

Together these claims motivate MAGE: Model-Based Agentic Software Engineering. Its working cycle is: model consequential knowledge; give obligations appropriate authority; perform the governed work; convert recurring failures and judgment into durable structure; repeat. The goal is not maximum automation. It is a governed engineering environment in which greater autonomy becomes possible because consequential engineering decisions do not depend on trusting an agent—or on humans inspecting every decision it makes.

The framing establishes a question that runs through the rest of the course: *How do we safely grant autonomy to commodity intelligence—and what cannot be delegated?* The lecture develops this argument by having students derive Modeling, Alignment, and governance conversion from the engineering problem rather than treating MAGE as a collection of prescribed practices.
