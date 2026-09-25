---
title: Process
readings:
  groups:
    - heading: The engineered medium
      items:
        - '{mage:1.1} A contemporary perspective on how commodity intelligence changes the economics of software production. The reading asks what happens to software engineering when implementation becomes abundant relative to engineering judgment, and provides a useful lens for considering why engineering processes change as the underlying productive medium changes.'
    - heading: Process models
      items:
        - cite: royce1970
          annotation: 'Summarizes early efforts and failures to engineer large software systems.'
        - cite: brooks1995
          locator: 'chap. 11'
          annotation: 'Covers similar ground to Royce from Brooks''s more informal, essay-like perspective.'
        - cite: beck1999xp
          annotation: 'Describes the major practices of XP and its approach to embracing change compared with traditional Waterfall development.'
        - cite: agile-manifesto2001
          annotation: 'Read the manifesto together with its [Principles](https://agilemanifesto.org/principles.html).'
        - cite: scrumguide2020
          annotation: 'Read the [course copy](readings/scrum-guide-2020.pdf) of the November 2020 edition. (Source: [redagile.com/scrum-guide](https://www.redagile.com/scrum-guide).)'
    - heading: A critical perspective
      items:
        - '["Extreme Programming Considered Harmful."](readings/extreme-programming-considered-harmful.pdf) An engineering critique of Extreme Programming based on the author''s experience. Read as a practitioner perspective rather than as systematic empirical evidence.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — SE processes and methodologies
    src: slides/1-2-SEProcessesAndMethodologies.pptx
---

**Premise.** *The engineered medium affects the engineering process.*

A software process organizes engineering activities: deciding what to build, designing it, implementing it, validating it, releasing it, and learning from the result. There is no universally correct ordering of these activities. Instead, process is an engineering choice shaped by properties of the system and its environment.

That distinction matters because the activities themselves are fairly stable. Nearly every serious engineering effort must somehow determine what should be built, work out how to build it, realize the design, and establish whether the result is acceptable. What varies is how we arrange that work. *Must requirements be substantially settled before design begins? Can implementation teach us something that changes the requirements? When do we validate? When can users see the system? How much work do we complete before revisiting earlier decisions?*

**Plan-driven** and **incremental** processes give different answers to these questions. Neither eliminates the fundamental engineering activities. They partition and order them differently.

## A model for the process choice

This unit develops a simple model for reasoning about that choice along three questions:

- *How much can we know before we build?* When requirements and solutions can be established confidently in advance, more work can be planned up front. When building is itself a way of discovering what is needed, shorter feedback cycles become more valuable.
- *How expensive is change?* Processes inherited from conventional engineering reflect media in which late change can be extraordinarily expensive. Software makes many changes cheaper—but not all changes cheap. An internal function may be easy to replace; a public API used by thousands of clients may not be.
- *Can partial systems be built, validated, or deliver value?* When useful evidence or value can be obtained incrementally, development can proceed in smaller slices. When the system must substantially exist before it can be meaningfully evaluated, incremental approaches have less leverage.

These questions explain why very different processes can each be sensible.

Consider a consumer mobile application. We may know what features we intend to build without knowing which ones users will actually value. Much of the application can be changed and redeployed comparatively cheaply, and a useful subset can be released while later capabilities remain unfinished. Low certainty, relatively high changeability, and high decomposability make short feedback loops attractive. Build something coherent, observe its use, learn, and revise.

Now imagine a system whose interfaces must be agreed among several organizations before implementation, whose deployment requires expensive certification, and whose important behavior can only be evaluated once many components operate together. More decisions must be made before useful feedback is available, and reversing them may be costly. A more plan-driven arrangement can therefore be rational.

The point is not that mobile apps are "Agile" while consequential systems are "Waterfall." The point is to ask what information is available, when it becomes available, and what it costs to act on it.

## The engineered medium changes the answer

Software makes this process question especially interesting because software is an unusually changeable medium. We can often build something, run it, learn from it, change it, and distribute the revised version quickly. That makes arrangements based on iteration and feedback practical in situations where they would be absurd for many physical artifacts.

Imagine constructing a bridge one span at a time, opening each span to traffic, and using what we learn from drivers to decide what the next span should look like. The problem is not that civil engineers dislike feedback. The physical artifact makes this particular feedback loop unhelpful: partially constructed bridges provide little of the intended value, and major decisions become extraordinarily expensive to reverse.

Software often changes those economics. But software being changeable does not mean every software decision is cheap to change. A prototype may be disposable; a data format may become increasingly difficult to alter as years of stored data accumulate around it. Process choice therefore depends on the particular system, not simply on the fact that it is software.

Generative AI changes these economics again. If implementation becomes cheaper, building a candidate solution may become a practical way to answer questions that we previously tried to settle through analysis alone. But cheaper implementation does not automatically make requirements more certain, consequential decisions more reversible, or partial systems more informative. Faster building is valuable only when what we build helps us learn.

## Measurement for decision-making

The three questions are judgments about the work, not labels assigned at kickoff. The work then produces evidence about them. Decisions that were supposedly settled but keep reopening suggest less certainty than the chosen process assumed. The cost and latency of absorbing a change test the changeability estimate. Increments that cannot be delivered independently, or work that repeatedly blocks on someone else, test decomposability. Feedback latency bears on all three, because delayed evidence means more work is completed before a wrong assumption surfaces. None of these is a target: a high rate of requirements change can indicate productive learning or weak requirements work. The question they serve is *does the process still fit the work as the work actually behaves?* When the answer is no, revise the process or the model of the work.

## Process is an engineering decision

The three dimensions give us a better question than *Which methodology should we use?*

Ask instead: *How much can we know before building, how expensive will our decisions be to change, and how much can we learn from a partial system?*

Those answers help determine how to arrange the work. They are not necessarily fixed, either. Engineers can sometimes invest in learning earlier, making decisions easier to reverse, or making systems easier to divide into useful increments. Whether those investments are worthwhile is itself an engineering decision.

The goal of this unit is therefore not to memorize a preferred software process. It is to learn to recognize why a particular arrangement of engineering work fits one problem better than another.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Process" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/01-process.html)
