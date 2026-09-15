---
id: research-and-development
title: Research and Development
short_title: Research and Development
order: 9
status: draft
description: >
  Research and development invests scarce engineering effort in uncertain opportunities for
  asymmetric benefit. Four questions organize the judgment: what is worth pursuing, whether it
  requires a new idea, how large the advance is, and what would establish it. The chapter
  distinguishes essential limitations of an approach from accidental limitations of its embodiment,
  and asks the reader to analyze their own ideas the same way.
objectives:
  - Compare uncertain opportunities under opportunity cost, weighing potential impact against likelihood of success rather than defaulting to the easiest visible project.
  - Distinguish essential limitations of an approach from accidental limitations of its current embodiment, using the elbow-grease diagnostic.
  - Calibrate the magnitude of a proposed improvement as an increment, an advance, or occasionally a transformation.
  - Structure an R&D argument as problem, essential limitation, new idea, and evidence, and apply the same analysis to one's own contribution.
---

**Premise.** *Research and development invests scarce engineering effort in uncertain opportunities
for asymmetric benefit.*

R&D begins with a constraint: there are more worthwhile problems than there is time to pursue them.
A researcher may see opportunities to improve performance, remove a limitation, support a new use,
exploit a new capability, or understand a phenomenon more deeply. An industrial R&D group faces the
same abundance of possibilities. Pursuing one means not pursuing another.

The unusual feature of R&D is that the outcomes can be asymmetric. An investigation may fail and
produce little beyond what was learned, while a successful new idea can enable capabilities,
improvements, or understanding far beyond the effort invested. Most research projects can fail
without doing much harm; a successful one can change what becomes possible.

The preceding chapters followed a purpose into a system: engineers decide what to promise
(@ch-requirements), make those promises precise (@ch-specification), organize a realization
(@ch-architecture) and resolve the choices inside its parts (@ch-design), and decide what evidence
justifies delivery (@ch-validation). R&D asks a prior question: where should engineering effort go
when we do not yet know what is possible? Before asking how to solve a problem, we must decide
whether the problem deserves the effort. The answer depends partly on what success could accomplish
and partly on how likely success appears. A modest improvement with an obvious solution may be
nearly certain. A larger advance may require an idea we do not yet have.

There is no formula that resolves this tradeoff. R&D exists precisely because important facts are
unknown. But four questions organize the judgment.

::: {.key-idea #key-rd-four-questions title="The four questions of R&D"}
- **What is worth pursuing?** Decide which uncertain opportunity deserves scarce engineering
  effort: seek asymmetric upside under opportunity cost.
- **Does it require a new idea?** Determine whether the limitation in what exists is essential to
  the approach or merely a property of its current embodiment.
- **How large is the advance?** Judge the magnitude of what success would change: an increment, an
  advance, or occasionally a transformation.
- **What would establish it?** Connect the work to its claim: problem, essential limitation, new
  idea, evidence.
:::

The first two are judgments about choosing and seeing: which opportunity deserves your attention,
and whether the obstacle in front of it is real. The latter two are judgments about understanding
what you have actually accomplished. The chapter takes them in turn.

## What is worth pursuing? {#sec-worth-pursuing}

A useful R&D problem offers the possibility of an outcome worth the effort required to investigate
it. Two considerations dominate the initial judgment:

- **Potential impact.** If this works, how large is the upside? An incremental improvement may be
  useful; an advance may change what can be done at all.
- **Likelihood of success.** How plausible is it that the investigation will produce something
  useful?

Cost, timing, available expertise, competition, and dependencies also matter. The point is not to
assign each factor a score and select the largest number. It is to compare opportunities explicitly
rather than allowing the easiest visible project to consume the time available.

This is especially important for graduate researchers. You will have more ideas than you have time
to pursue. Choosing what not to work on is part of becoming a researcher. You will be tempted by
problems you already know how to solve, particularly when you can see the prototype, paper, or
patent waiting at the end. Those projects are comfortable because the path is visible.

My advice is to choose the hardest important problem you can plausibly make progress on. You will
sometimes fail. That is part of accepting the asymmetry. You are giving up some probability of
producing a result in exchange for the possibility of producing a much larger one. You will also
find that difficult problems change what you are capable of doing: they force you to learn more
deeply, acquire techniques you would not otherwise need, and encounter questions you could not have
seen from the easier problem. When the hard problem succeeds, it has more room to matter. Over a
research career, I would rather see you take serious swings than become very efficient at producing
results you already knew how to obtain.

This advice deliberately does not maximize the probability of producing a result. Research can
tolerate failed attempts in a way ordinary delivery work often cannot. The relevant question is not
simply *How likely am I to produce something?* It is *What might become possible if this works, and
what will I learn by seriously attempting it?*

## Does it require a new idea? {#sec-new-idea}

Finding an important problem does not establish that a new approach is needed. Existing systems are
imperfect in innumerable ways. They may be slow, support the wrong formats, expose awkward
interfaces, lack useful features, or have implementations that were never optimized for the
situation now under consideration.

Any of these limitations can motivate engineering work. They do not necessarily motivate R&D. The
useful distinction is Brooks's, between essence and accident [@brooks1995].

::: {.definition #def-essential-accidental title="Essential and accidental properties"}
An **essential** property follows from the underlying concept: an embodiment that lacked the
property would no longer faithfully realize the same idea. An **accidental** property belongs to a
particular embodiment but need not belong to another embodiment of the same idea.

Consider a parser. Parsers accept input and determine whether it conforms to some language or
format; that role is essential to the concept. A particular parser might accept JSON but not XML,
use one parsing algorithm rather than another, or expose a particular API. Those properties may
simply characterize that implementation. Another parser can differ in all of them while remaining
recognizably a parser.
:::

This distinction matters because novelty claims often attack the embodiment when they need to
attack the idea. Suppose an existing system lacks a capability your proposed system provides. If
the existing system could acquire that capability through an ordinary extension while retaining the
same conceptual approach, you have identified an engineering task, not necessarily an advance. A
long list of deficiencies does not change that fact if every deficiency can be repaired without
changing the idea.

The stronger question is therefore: *Could a faithful embodiment of the existing idea avoid this
limitation?*

If yes, the limitation is probably accidental. Improve the embodiment.

If no — if the limitation follows from an assumption, abstraction, algorithm, representation, or
other defining property of the approach — then eliminating it requires a conceptual change. That is
where the opportunity for an advance begins.

### Can this be solved with elbow grease? {#sec-elbow-grease}

There is a practical way to develop intuition for this distinction. When you believe you have found
a limitation worth researching, ask whether it can be solved with **elbow grease**.

Imagine giving the existing system and the limitation to two competent junior engineers for six
months. They can write code, optimize components, replace libraries, support additional formats,
collect more data, improve deployment, and clean up awkward parts of the implementation. If you
expect sustained engineering effort to make the limitation disappear while leaving the underlying
idea intact, be suspicious of the novelty claim. You may have found substantial work without
finding a substantial advance.

If the limitation survives that thought experiment, look deeper. Perhaps every faithful realization
of the approach inherits it. Removing the limitation might require changing an assumption about the
problem, introducing a different representation, replacing the governing algorithm, moving a
boundary, or otherwise altering something integral to the idea. Now you may have found the opening
for R&D.

Elbow grease is a diagnostic, not a definition. An accidental limitation can be expensive to
remove, especially in a large or poorly engineered system. Conversely, a deep conceptual change can
occasionally be easy to implement once somebody sees it. The definitive question remains whether
eliminating the limitation requires changing the idea.

Generative AI also changes the elbow-grease test because it changes the price of engineering effort
(@ch-software-engineering). "Two junior engineers for six months" once represented a substantial
amount of implementation capacity. Increasingly, some of that work can be accomplished by a much
smaller team working with capable agents in days or weeks. Yesterday's impressive implementation
effort can become tomorrow's routine engineering task.

This raises rather than lowers the importance of identifying the conceptual contribution. As
implementation becomes cheaper, difficulty that comes primarily from producing implementation
becomes weaker evidence of an advance. The underlying test has not changed: can additional
engineering effort remove the limitation without changing the idea? Commodity intelligence simply
makes accidental limitations cheaper to eliminate and therefore harder to defend as the basis for
R&D.

## How large is the advance? {#sec-how-large}

R&D can produce improvements of very different magnitude. An **increment** improves an existing
approach while preserving its essential idea. An **advance** changes something essential and
thereby makes something meaningfully different possible. Occasionally, an advance is
**transformative**: it changes the space of problems people can solve or the way a field approaches
them.

The vocabulary follows from the essential–accidental distinction. Work that removes accidental
limitations produces increments: a faster implementation, a broader format, a cleaner interface —
valuable, often necessary, and conceptually conservative. Work that removes an essential limitation
produces an advance, because every faithful embodiment of the old idea inherited the limitation and
the new idea does not. Transformation is rarer still, and mostly recognized in retrospect; few
projects should be judged by whether they achieve it.

This vocabulary also disciplines the potential-impact judgment made when choosing what to pursue.
When you claim an opportunity has a large upside, say which magnitude you mean. An increment can be
worth pursuing when the approach it improves is important enough. But the asymmetric upside that
justifies a hard, uncertain investigation usually lives at the advance level: the work does not
merely improve what exists, it changes what can be done.

## What would establish the contribution? {#sec-establish}

Once you believe an opportunity requires a new idea, you need to state precisely what has changed.
A new system contains thousands of differences from whatever preceded it. Most are consequences of
building the system rather than the reason it is new.

A useful R&D argument has a simpler structure:

**problem → essential limitation → new idea → evidence**

First, establish the problem. What important requirement, capability, or property is not adequately
served?

Then identify the essential limitation of existing approaches. Why can they not adequately address
the problem merely through a better embodiment?

Next articulate the new idea. What changed conceptually? The answer might be a new abstraction,
algorithm, representation, division of responsibility, source of information, or way of composing
existing ideas. The implementation operationalizes this idea; it is not itself the conceptual
contribution.

Finally, produce evidence connecting the new idea to the limitation. Measurement may show that the
new approach achieves a capability the old one cannot. An experiment may isolate the effect of the
conceptual change. Analysis may establish why the new approach avoids a limitation inherited by the
previous class of approaches. Different contributions require different evidence, but the evidence
should test the argument that made the work worth doing — the discipline of @ch-validation applied
to a claim of novelty.

This structure applies beyond research papers. A patent must distinguish an invention from what was
already known. An industrial R&D proposal must explain why investment in a new approach is
preferable to improving what exists. A design review may need to establish why an architectural
change is warranted rather than another round of implementation work. The artifact changes; the
underlying judgment does not.

## Analyze your own idea the same way {#sec-your-own-idea}

The essential–accidental distinction should also be applied to the new work itself. Every new
system has limitations. Some arise from the idea and some from the particular implementation used
to investigate it.

Suppose a prototype supports only one operating system. If nothing in the idea requires that
restriction, porting it may simply require more engineering. Presenting the limitation as though it
were fundamental obscures what the work actually established. Conversely, if the approach depends
on information that is unavailable in an important setting, no amount of implementation polish may
remove that limitation without changing the approach itself.

You should therefore be able to explain both what is essential about your contribution and which
limitations are essential to it. The first tells readers what should survive when somebody builds a
better embodiment. The second tells them where another conceptual advance may be needed.

The same discipline applies to empirical R&D. A study has countless implementation details: survey
software, transcription tools, scripts, storage formats. The choices that matter more determine
what the study can actually establish: the population sampled, constructs measured, interventions
performed, comparison selected, and assumptions required to interpret the observations. Give the
most attention to limitations that follow from those choices rather than mechanically cataloging
every imperfection in the study's execution.

## R&D is a bet on learning {#sec-bet-on-learning}

R&D begins before we know whether the proposed idea will work. That uncertainty is not a defect in
the process; it is why the work is R&D.

The judgment is therefore not merely whether an idea sounds promising. You are deciding which
uncertainty deserves your scarce time. Potential impact matters because success should justify the
investment. Likelihood of success matters because some bets are implausible even when their
imagined payoff is enormous. Novelty matters because an apparent research problem that can be
eliminated through ordinary engineering may not justify inventing a new approach at all.

Then the work itself produces information. A failed prototype may reveal that an assumed
opportunity does not exist. An experiment may show that the supposed limitation of prior work was
accidental. An attempted solution may expose a deeper problem than the one that motivated it. A
failed research direction can therefore be valuable — but only if you recognize what it taught you
and allow that evidence to change what you work on next.

You will spend a career making these bets with incomplete information. Choose them deliberately.
Ask what could matter, whether the obstacle is real, whether it requires a new idea, and what
evidence would tell you that you were right.

And when you have a choice between an easy problem whose answer you can already see and a hard
important problem that might defeat you, I recommend the hard one.

## Summary

Research and development invests scarce engineering effort in uncertain opportunities for
asymmetric benefit. There are more worthwhile problems than time to pursue them, and the outcomes
are asymmetric: an investigation may fail and produce little beyond what was learned, while a
successful new idea can return far more than the effort invested. Four questions organize the
judgment.

*What is worth pursuing?* weighs potential impact against likelihood of success, comparing
opportunities explicitly instead of letting the easiest visible project consume the time — and, for
a researcher, argues for the hardest important problem you can plausibly make progress on. *Does it
require a new idea?* separates essential limitations, which follow from the underlying concept,
from accidental limitations of a particular embodiment. The elbow-grease thought experiment
supplies the diagnostic, and generative AI sharpens it: as implementation becomes cheaper,
accidental limitations become weaker grounds for a novelty claim. *How large is the advance?*
calibrates the upside: an increment preserves the essential idea, an advance changes something
essential, and a transformative advance changes what a field can attempt at all. *What would
establish it?* structures the argument as problem, essential limitation, new idea, and evidence
that tests exactly that argument. The structure applies to papers, patents, proposals, and design
reviews alike, and it should be turned on your own work as honestly as on the prior work it
improves.

The bet is ultimately on learning. Even a failed direction pays, if you recognize what it taught
you and let that evidence change what you pursue next.

::: read_further
Brooks, Frederick P., Jr. ["No Silver Bullet—Essence and Accident in Software
Engineering."](https://doi.org/10.1109/MC.1987.1663532) *Computer* 20, no. 4 (1987): 10–19. The
source of the essential–accidental distinction. Brooks argues that the hard part of software lies
in its essence — the conceptual construct — while tools attack only the accidents of its
embodiment. This chapter turns the same distinction outward, onto prior work and your own: an
advance must remove an essential limitation, not repair an accidental one.

Hamming, Richard W. ["You and Your
Research."](https://www.cs.virginia.edu/~robins/YouAndYourResearch.html) Talk at Bellcore, 1986;
transcription by J. F. Kaiser. Hamming asks why so few scientists work on the important problems of
their field, and answers from a career of watching who did. Read it beside this chapter's mentoring
advice: his courage to attack important problems is the asymmetric bet argued here, described by
someone who spent decades making it and observing its returns.
:::
