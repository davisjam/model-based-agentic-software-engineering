---
title: Process
readings:
  groups:
    - heading: The engineered medium
      items:
        - '{mage:1.1} Davis, 2026. Commodity intelligence changes the economics of software production, making implementation abundant relative to engineering judgment. The section asks what follows for engineering work once the scarce input shifts, which is the premise this unit carries into process: the medium you build in decides which arrangements of work are even sensible. Hold it against the three dimensions developed below, and ask which of certainty, changeability and decomposability cheap implementation actually improves.'
    - heading: Process models
      items:
        - cite: royce1970
          annotation: 'Royce, 1970. The paper usually cited for the waterfall diagram in fact argues against relying on it. Royce lays out the sequential arrangement, calls its straightforward implementation risky, and then adds the feedback it omits: design before analysis is complete, document the design, build the thing twice, plan and monitor testing as its own activity, and involve the customer. Read it as a report on where plan-driven arrangements broke, written by someone who had watched them break. Ask which of this unit''s three dimensions each of his remedies was trying to repair.'
        - cite: brooks1995
          locator: 'chap. 11'
          annotation: 'Brooks, *The Mythical Man-Month*, chapter 11, "Plan to Throw One Away." Brooks covers much of Royce''s ground in essay form: the first build of a system teaches what the design should have been, so change is a condition of the work rather than a disruption to the plan. He therefore asks engineers to design the system, its documentation and the organization for change. Reading him beside Royce shows two practitioners reaching the same conclusion from different evidence, and raises the question of what a throwaway build is worth once implementation is cheap.'
        - cite: beck1999xp
          annotation: 'Beck, "Embracing Change with Extreme Programming" (1999). Beck inverts the assumption behind the two readings above: rather than reduce the cost of late change through planning, XP drives that cost down through practice, holding the feedback loop short with continuous testing, continuous integration, refactoring and an on-site customer. The practices are offered as mutually supporting, which is the claim to interrogate: take any one and ask what fails if a team adopts it alone. This is the changeability dimension turned into a method.'
        - cite: agile-manifesto2001
          annotation: 'Beck et al., "Manifesto for Agile Software Development" (2001), read together with its [Principles](https://agilemanifesto.org/principles.html). Four value statements and twelve principles, each phrased as a preference between two goods rather than a rejection of one, which is easy to miss and is where most arguments about Agile go wrong. The document specifies no process; it specifies the criteria by which seventeen practitioners thought a process should be judged. Ask which of the twelve principles presuppose high changeability and high decomposability, and what becomes of them in a system that has neither.'
        - cite: scrumguide2020
          annotation: 'Schwaber and Sutherland, *The Scrum Guide*, November 2020 edition; read the [course copy](readings/scrum-guide-2020.pdf). It is deliberately thin: roles, events and artifacts, with the technical practices left out. That omission is the interesting part, because it lets Scrum wrap almost any engineering practice, including bad ones. Compare it with Beck, who specifies the technical practices and says little about management structure, and decide which of the two your project actually needs specified. (Source: [redagile.com/scrum-guide](https://www.redagile.com/scrum-guide).)'
    - heading: A critical perspective
      items:
        - '["Extreme Programming Considered Harmful for Reliable Software Development."](readings/extreme-programming-considered-harmful.pdf) Keefer, 2002. A practitioner critique written from a quality-assurance standpoint and unusually honest about its own position: section 2 is titled "Bias" and states the author''s commitments before the argument begins. Keefer credits XP with popularizing testing and visual communication, then goes after particular practices, and his sharpest material is evidentiary rather than philosophical, counting how few studies the pair-programming claims of the period rested on and what those studies actually measured. Read it for how to interrogate a method''s evidence base, and ask which of his objections survive once implementation becomes cheap.'
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
