---
id: preface
title: Preface
kind: frontmatter
status: draft
description: >
  An apprenticeship in engineering judgment: why this handbook teaches software engineering as
  decision-making, and how it serves as a practical companion to the MAGE method.
---

Once upon a time, engineering was taught via apprenticeship. A novice worked alongside experienced
practitioners, first observing their decisions and then making increasingly consequential decisions
under supervision. The apprentice learned the formal knowledge of the field, but also something
harder to write down: which questions to ask, which details matter, when a familiar solution
applies, when it does not, and how to make a defensible choice when no answer is obviously correct.
Modern engineering education cannot reproduce that arrangement at scale. We teach principles,
methods, tools, and examples instead. These are valuable, but they can leave students knowing about
engineering without yet knowing how an engineer thinks.

Welcome to your apprenticeship. This book is an attempt to teach software engineering through the
judgments its practitioners must make. Why choose one development process rather than another? What
should we promise to build? Which distinctions belong in a specification, and which choices should
remain open? Where should an architectural boundary go? When is additional analysis worth its cost?
There are methods that help answer these questions, but the methods are not the point. The point is
learning to recognize the decision, identify the relevant alternatives and consequences, and
exercise engineering judgment.

I wrote this book because generative AI has made that distinction unusually important. As
implementation becomes cheaper, producing code is less often the limiting step. The difficult
questions remain: What should we build? What must be true of it? Which choices matter enough to
constrain? What evidence is sufficient? When should we revisit an earlier decision? These have
always been software-engineering questions. AI did not create them. It has simply made the scarcity
of engineering judgment much easier to see. That is why this handbook begins by treating software
engineering as judgment and decision-making rather than as a catalog of activities and terminology.

This handbook is also a practical companion to Model-Based Agentic Software Engineering (MAGE). MAGE
argues that engineering with increasingly capable agents depends on making consequential knowledge
explicit, making important obligations enforceable, and converting recurring judgment into durable
engineering structure. But applying those ideas requires knowing what is consequential in the first
place. An engineer must decide what should be modeled, which obligations deserve enforcement, what
can safely remain free, and when experience should become a rule that future work inherits. MAGE
provides a theory for engineering with increasingly capable agents. This handbook develops the
engineering judgment needed to put that theory into practice.

So the chapters that follow are deliberately organized around decisions. Requirements engineering
asks what we should promise. Specification asks what exactly that promise means. Architecture asks
how competing obligations can coexist in one system. Design asks how the resulting parts should
actually work. The same pattern continues throughout software engineering: identify the engineering
problem, understand the available choices, reason about their consequences, make a decision, and
learn when reality tells you to reconsider it. No handbook can substitute for years spent working
beside excellent engineers. But it can try to make some of what those engineers would teach you
explicit. That is the apprenticeship I hope to offer here.
