---
id: conclusion
title: Conclusion
short_title: Conclusion
order: 99
status: draft
kind: conclusion
description: >
  The book's closing: engineers master their medium, so the properties of software created the
  decision landscape; a recurring decision procedure — what is required, what do I need to know,
  what might I be missing, how should I find out, then decide — is the judgment the apprenticeship
  cultivates; and that judgment is what makes it possible to delegate realization without
  delegating engineering.
objectives:
  - Recover the book's progression as one recurring habit of engineering judgment.
  - Apply the decision procedure — requirements, information, gaps, evidence, decision — to a new engineering problem.
  - Explain why engineering judgment is shaped by its medium, and how that judgment makes responsible delegation possible.
---

Software engineers make the decisions in this book because software has particular properties as an
engineered medium.

The underlying habits of mind are not unique to software engineering. Engineers in every discipline
must understand what is required, reason about alternatives and consequences, gather evidence where
uncertainty matters, and accept responsibility for consequential decisions. But engineering judgment
does not operate independently of the thing being engineered. Engineers master their medium. They
learn what it makes easy, what it makes difficult, how it fails, what can be measured or predicted,
which changes are reversible, and where apparently reasonable intuitions cease to apply.

Software is an unusual medium. It is expressive, changeable, copyable, transferable, and updateable.
We can build and test partial systems. We can create abstractions that hide enormous amounts of
detail. We can automate tests and analyses. Increasingly, we can ask an agent to produce an
implementation in minutes. Other properties become important for particular decisions. Software's
discrete behavior, for example, changes what validation evidence can establish: success on observed
executions does not generally tell us how nearby unobserved executions will behave.

These properties shape the judgments software engineers must make. Because software is changeable,
we must decide what should remain open and what must be fixed. Because it is copyable and
updateable, one decision can propagate quickly across a deployed population. Because abstractions
and boundaries can constrain interactions, architecture can make change and failure local—or allow
their consequences to spread. Because behavior is discrete, validation must account for what its
evidence has not observed. And because software can often be changed after delivery, engineers can
sometimes learn from operation rather than eliminate every uncertainty beforehand.

These properties give us choices. We can organize work in different ways. We can choose what to
specify and what to leave open. We can divide a system along different boundaries. We can choose
among designs with different costs and consequences. We can build first to learn, or reason first
because changing our minds later will be expensive. Those choices are why software engineering
requires judgment.

## Making an engineering decision {#sec-making-a-decision}

When you face an engineering task, begin with a simple question: what is required?

Before choosing a solution, understand what the solution must accomplish. Identify the
requirements, constraints, assumptions, and existing decisions that bear on the problem. Determine
what is fixed and what remains open.

Then ask: what do I need to know to make this decision?

Perhaps you need to understand how users actually work. Perhaps you need to know how expensive an
architectural choice will be to reverse. You may need an estimate, a model, a measurement, a
prototype, or an experiment. You may need to read the code. You may need to talk to the person who
operates the system every day. Gather the information that could change your decision.

But there is a harder problem. You may not know what you need to know.

The requirement you were given may omit an important stakeholder. The strange piece of code you
want to remove may exist for a reason. Someone else may understand a failure mode that has never
occurred to you. Your experience may simply not cover the situation you now face.

No technique in this handbook makes that problem disappear. You have to look for gaps in your own
understanding. Ask questions. Seek out people who know things you do not. Listen when someone
disagrees with you. Treat an unexplained constraint as something to investigate before treating it
as a mistake. This is part of engineering judgment too.

Eventually, you have to decide. Engineering rarely provides perfect information, and obtaining more
information has a cost of its own. Sometimes the right choice is to investigate further. Sometimes
it is to build a prototype and learn from it. Sometimes the evidence is already sufficient and
further analysis would add little.

The goal is to know enough to make the decision well, while remaining aware of what you do not
know.

::: {.decision #decision-before-you-decide title="Before you decide"}
**What is required?** What must the result accomplish or preserve?

**What do I need to know?** What information could change the decision?

**What might I be missing?** Whose knowledge, experience, or perspective could reveal something I
have overlooked?

**How should I find out?** Ask, inspect, model, measure, prototype, experiment, or build.

**Then decide.** Act when you have enough information, and take responsibility for the choice.
:::

Requirements elicitation, specification, process models, architectural views, design alternatives,
prototypes, tests, reviews, and measurements all help you answer these questions. They are not
recipes that remove the need for judgment. They help you exercise it.

That is also why this book cannot finish your apprenticeship. It can show you the questions software
engineers have learned to ask and the tools they use to answer them.

Increasingly capable machines change what engineers may need to do themselves, but not what
engineers must remain able to judge. An engineer who understands the decisions in this book can
delegate implementation, analysis, testing, and other work without simply delegating responsibility
for the result. The engineer can state what is required, decide what freedom may remain, recognize
consequential choices, ask what evidence is needed, evaluate what comes back, and intervene when the
result or its assumptions are unacceptable.

This is the connection to *Model-Based Agentic Engineering* [@davis2026mage]. MAGE is not a
substitute for software-engineering judgment. It begins from it. Models make consequential knowledge
and intent available to delegated work; alignment makes important obligations enforceable;
engineering structure preserves lessons that should not have to be rediscovered. But none of those
mechanisms can tell the engineer which knowledge is consequential, which obligations matter, or
which evidence is sufficient. Those are engineering judgments.

The purpose of this handbook, then, is not to prepare you to compete with a machine at producing
software. It is to teach you enough of the discipline to delegate realization without delegating
engineering.

Experience will deepen that judgment. It will teach you when to ask which question, how much
evidence is enough, when something feels wrong, and when you need to find someone who knows more
than you do. It will also deepen your understanding of the medium itself: what software makes
possible, where its dangers hide, and which engineering intuitions survive contact with it.

Engineers master their medium, exercise judgment over its consequences, and take responsibility for
what they create—even when they do not create every part themselves.

Welcome to software engineering.
