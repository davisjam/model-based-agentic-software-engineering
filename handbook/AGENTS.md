# AGENTS.md
# The Software Engineering Handbook
## Instructions for authoring agents

This repository contains *The Software Engineering Handbook: A Judgment and Decision-Making Approach*.

This is a short textbook about how software engineers make engineering decisions. It is not an encyclopedia of software-engineering terminology, methods, processes, patterns, or tools.

The organizing idea is apprenticeship.

The book should help a reader learn to approach an engineering problem the way an experienced engineer would: determine what matters, identify the decision that must be made, determine what information is needed to make it well, obtain that information economically, consider plausible alternatives and their consequences, and then exercise judgment.

The book is intentionally selective. Concision comes from choosing what to teach, not from reducing every idea to a slogan.

---

# 1. The intellectual center of the book

The book begins from the engineered medium.

Software has unusual properties as an engineering medium. Among other things, it is highly changeable, copyable, transferable, inspectable, instrumentable, and capable of representing abstractions that hide enormous amounts of detail. A single engineer can create a change that propagates across millions of deployed copies. Software can often be built partially, tested, modified, and redeployed at costs that would be extraordinary for many physical artifacts.

These properties create the decision landscape of software engineering.

They affect:

- how engineering work should be organized;
- how cheaply engineers can learn by building;
- which decisions can remain reversible;
- how systems can be decomposed;
- how engineering knowledge can be represented;
- how evidence can be gathered;
- how much leverage an individual engineer can exercise;
- and what kinds of failures can propagate at scale.

Generative AI changes the economics of this medium further by reducing the cost of producing implementations and some other engineering artifacts. It does not eliminate engineering judgment. It changes which activities are scarce and which forms of evidence become economical to obtain.

The chapters should therefore not read as seven unrelated introductions to conventional software-engineering topics. They form a progression:

1. **Software / GenAI:** What kind of engineered medium is software, and what changes when implementation becomes cheap?
2. **Process:** Given that medium, how should engineering work be organized?
3. **Teamwork:** How does individual capability become coordinated engineering capability?
4. **Requirements:** What should the engineering effort promise?
5. **Specification:** Which realizations would count as satisfying those promises?
6. **Architecture:** How should one acceptable realization be organized so its obligations can coexist?
7. **Design:** How should its parts actually realize their responsibilities?
8. **Conclusion:** How should an engineer approach a consequential decision?

Preserve this progression.

---

# 2. The recurring model of engineering judgment

The book should repeatedly teach the reader to recognize a common pattern.

When facing an engineering decision:

1. **What is required?**
   Identify the outcome, obligation, constraint, or property that matters.
2. **What decision must be made?**
   Identify the consequential choice rather than immediately reaching for a familiar solution.
3. **What do we need to know?**
   Determine which information could materially change the decision.
4. **What might we be missing?**
   Look for assumptions, tacit knowledge, missing stakeholders, unfamiliar perspectives, and gaps in our own understanding.
5. **How can we learn enough?**
   Ask, observe, inspect, model, estimate, measure, prototype, experiment, implement, or otherwise obtain evidence.
6. **What are the plausible alternatives?**
   Compare actual choices rather than judging one proposal in isolation.
7. **What does each alternative make easier or harder?**
   Make tradeoffs concrete.
8. **Is more information worth its cost?**
   Analysis, modeling, experimentation, and consultation are engineering activities with costs of their own.
9. **Then decide.**
   Engineering cannot wait for perfect information. Make a defensible choice with the evidence available and remain responsible for its consequences.

This is not a rigid nine-step process that must be enumerated in every chapter. It is the intellectual habit the book is trying to cultivate.

---

# 3. Epistemic humility is part of engineering judgment

Do not portray engineering judgment as merely selecting correctly among known alternatives.

Engineers often have incomplete models of the problem itself.

The requirement may be tacit. A strange constraint may have a history the current engineer does not know. An operator may understand a failure mode that the designer has never encountered. A stakeholder may have been omitted. A seemingly irrational implementation choice may preserve an obligation that was never documented.

The book should therefore normalize asking:

- Who knows something about this problem that I do not?
- Whose perspective is missing?
- Which assumptions am I treating as facts?
- What would have to be true for my preferred solution to be wrong?
- Is an unexplained constraint actually accidental?
- What could I learn by talking to someone before building?
- What could I learn only by observing, measuring, prototyping, or building?

Humility is not indecision. It is recognition that consequential decisions deserve an active search for reasons our current understanding may be incomplete.

This theme should appear naturally where relevant, especially in Requirements, Specification, Architecture, Design, and the Conclusion.

---

# 4. Write textbook prose, not expanded slides

The source material for this book includes lecture decks. Those decks contain excellent arguments, examples, figures, and formulations.

They are not prose.

Do not reproduce slide rhythm in the book.

A slide may appropriately contain:

> Change is cheap

followed by three bullets.

A textbook paragraph should develop the thought.

The normal prose unit is a paragraph organized around one substantial idea.

A useful paragraph often has this shape:

**topic sentence → explanation → example or contrast → consequence → transition**

Do not apply this mechanically, but use it as a diagnostic.

A good paragraph usually answers some combination of:

- What is the claim?
- Why is it true?
- What distinction does it introduce?
- What example makes it concrete?
- What alternative might we have considered?
- What consequence follows?
- Why does this matter to the engineering decision?

Paragraphs should usually be rich enough to develop an idea rather than merely announce it.

---

# 5. Paragraph discipline

One-sentence paragraphs should be rare.

Do not create a new paragraph merely because a sentence sounds important.

Avoid this rhythm:

> Strong claim.
>
> Qualification.
>
> Memorable sentence.
>
> Rhetorical question.
>
> Answer.
>
> Another memorable sentence.

That is blog-post rhetoric, not the normal voice of this book.

Instead, integrate important sentences into developed arguments.

For example, avoid:

> Software systems are built for purposes in the world.
>
> Requirements engineering is not simply asking users what they want.
>
> Users may not know what they need.

Prefer:

> Software systems are built to accomplish purposes in a world that engineers only partly understand. Requirements engineering therefore cannot consist simply of asking users what they want and transcribing the answers. Users may understand their work without knowing which software would improve it, different stakeholders may see different parts of the problem, and important obligations may arise from operations, contracts, regulations, standards, or existing systems.

The first sentence remains strong. It now functions as a topic sentence.

A short paragraph is acceptable when it performs a genuine transition, introduces an example that follows, or deliberately changes the pace. The manuscript should simply not depend on short paragraphs for emphasis.

---

# 6. Use the lecture decks as sources of paragraph structure

When expanding or restructuring a chapter, inspect the corresponding lecture deck.

Slide titles often state the burden of a useful paragraph.

Use them as candidate topic sentences or paragraph ideas.

Do **not** mechanically create one subsection per slide.

Several slides may support one paragraph. One important slide may support several paragraphs. A figure may carry an argument that prose should introduce and interpret.

Mine lecture material when it supplies:

- a motivating problem;
- an engineering question;
- a useful distinction;
- competing alternatives;
- a tradeoff;
- a worked example;
- evidence;
- a failure mode;
- a diagnostic question;
- or a transition in the argument.

Do not import content simply because it appeared in the lecture.

The book is more selective than the course.

---

# 7. Concision occurs at the level of coverage

The handbook should be short.

That does not mean its prose should be terse.

A short textbook can still contain substantial paragraphs, developed examples, and careful reasoning. It becomes short by omitting material that does not contribute enough to the apprenticeship.

When deciding whether to shorten something, prefer:

- removing a redundant example;
- eliminating a catalog of terminology;
- omitting a secondary method;
- combining overlapping sections;
- or removing a digression

over compressing an important argument into three aphorisms.

**Be selective about ideas and generous enough to explain the ideas that survive.**

---

# 8. Begin from engineering problems, not catalogs

Avoid conventional textbook structures such as:

> There are five types of architecture...
>
> The following seven elicitation methods exist...
>
> There are twenty-three design patterns...

The book should normally begin with an engineering problem.

For example:

> Several components must work over the same evolving information. Should they pass intermediate representations through a sequence, or work through shared persistent state?

Then introduce pipeline and repository as alternatives.

Likewise:

> A requirement says users must be warned before illness affects their day. What machine behaviors would actually count as satisfying that requirement?

Then introduce specification.

Methods, patterns, models, and tools matter because they help answer engineering questions.

---

# 9. Alternatives before verdicts

Engineering judgment is difficult to teach when only one solution is presented.

Whenever practical, present at least two plausible alternatives.

Explain:

- the problem both solve;
- what each assumes;
- what each makes easier;
- what each makes harder;
- which obligations favor one;
- and what evidence might change the choice.

Do not label one side "best practice" unless the alternative is genuinely dominated under the stated conditions.

A pattern is not an answer. It is accumulated experience about a recurring alternative and its likely consequences.

---

# 10. Tradeoffs must have mechanisms

Avoid vague claims such as:

> This improves scalability but reduces maintainability.

Explain why.

For example:

> Deferring work to a queue removes that work from the request's latency-sensitive path and can isolate the caller from worker failures. The design now has to handle retries, duplicate execution, ordering, and eventual failure reporting.

The second form teaches transferable reasoning because the reader can see the mechanism producing the tradeoff.

Whenever the prose says something is:

- more scalable;
- more maintainable;
- more flexible;
- more reliable;
- easier to change;
- more secure;
- simpler;
- more complex;

ask whether the mechanism is sufficiently explained.

---

# 11. Preserve the distinction between unknown, tacit, and free

This distinction is central to the book.

An unconstrained choice can mean:

**Unknown** — we do not yet understand the consequences well enough to decide.

**Tacit** — a consequential boundary exists, but it has not been represented explicitly.

**Free** — the alternatives are genuinely acceptable.

Only the third is a deliberate degree of freedom.

Do not casually describe an unanswered question as flexibility or freedom.

A degree of freedom is known freedom.

When someone reacts to an apparently permissible realization with "not that," investigate whether the specification or design omitted a tacit obligation.

This distinction should remain consistent across Specification, Architecture, and Design.

---

# 12. Modeling is purposeful reduction

Do not describe modeling as producing a comprehensive representation of the system.

A model is useful because it leaves things out.

The recurring reasoning pattern is:

**engineering question → representation → property → analysis or check**

Ask:

- What question are we trying to answer?
- Which distinctions matter to that question?
- Which representation makes those distinctions explicit?
- What property can we state over it?
- What analysis, check, or judgment does that support?

The same representation type may appear at different engineering levels.

A state machine can specify externally visible behavior or model an internal component lifecycle. A dependency graph can describe system architecture or the internals of one component.

The notation does not determine whether something is specification, architecture, or design.

The **question, scope, and role in the engineering decision** do.

---

# 13. Architecture and design are recursive

Do not describe architecture as simply "high-level design" and design as "low-level architecture."

Architecture establishes consequential organization within which further decisions are made.

Design realizes responsibilities within inherited constraints.

A subsystem can appear as one part in a system architecture and itself require an architecture when opened.

Eventually decomposition reaches objects, functions, data structures, algorithms, or small collaborations whose relevant behavior can be reasoned about directly.

At that point, design passes into implementation.

Preserve the useful shorthand:

**Architecture establishes strategy. Design chooses tactics within it.**

But explain the relationship rather than using the phrase as a slogan.

---

# 14. Engineering decisions flow downward; evidence flows upward

The book should not imply a one-way waterfall from Requirements to Specification to Architecture to Design.

There is a conceptual progression:

**purpose → requirements → specification → architecture → design → implementation**

but information also flows upward.

Detailed design may reveal an architectural conflict.

Architecture may reveal that a specification cannot be satisfied economically.

A prototype may reveal that a requirement was misunderstood.

Deployment may reveal that a domain assumption was wrong.

Repeated local design problems may reveal that the engineering environment needs a common mechanism.

Treat this feedback as ordinary engineering learning rather than as evidence that earlier engineering "failed."

---

# 15. The engineering environment carries decisions forward

Software engineering is not performed only through documents and individual judgment.

Organizations encode recurring decisions into:

- frameworks;
- APIs;
- abstractions;
- tests;
- static checks;
- CI rules;
- templates;
- conventions;
- generators;
- deployment mechanisms;
- access controls;
- review procedures;
- and other engineering infrastructure.

When a recurring failure or recurring judgment can be converted into durable structure, later work should inherit the lesson rather than reconstruct it.

This is engineering capital.

Do not force MAGE terminology into every chapter, but preserve the underlying idea.

---

# 16. Generative AI should not consume the book

GenAI motivates the book and changes several engineering economics.

It should not appear in every section merely because the book was written in the GenAI era.

Mention GenAI when it materially changes:

- implementation cost;
- experimentation cost;
- coordination;
- reasoning scale;
- evidence generation;
- autonomy;
- or the value of durable engineering structure.

Otherwise teach the underlying software-engineering principle.

Prefer formulations that remain useful if today's models change substantially.

---

# 17. Use examples to carry reasoning

Examples should do engineering work.

A good example should help the reader see:

- why a distinction matters;
- why two alternatives differ;
- how a failure occurs;
- what evidence would resolve uncertainty;
- or why an apparently local decision has wider consequences.

Do not add examples merely to make prose colorful.

When possible, carry a good example through several paragraphs rather than introducing a new toy example for every claim.

The Sleep Advisor example is useful in Requirements and Specification because the reader can watch an initially broad purpose become progressively constrained.

Architecture and Design should similarly favor examples that let the reader observe decisions accumulating.

---

# 18. Rhetorical questions

Questions are useful because the book teaches judgment.

Use them as actual engineering questions:

> Which representation would let us determine whether this ordering is possible?

> What future change are we buying this indirection to isolate?

> When these copies disagree, which one wins?

Avoid chains of rhetorical questions used merely to create pace.

If a question matters, usually spend a paragraph answering it.

---

# 19. Aphorisms and memorable lines

The book contains several useful compact formulations.

Examples include ideas such as:

- govern what is settled; preserve what is free;
- a pattern name is a hypothesis about consequences;
- a degree of freedom is known freedom;
- architecture constrains the available tactics; design tests whether the strategy is workable.

Keep such formulations when they compress a developed argument.

Do not use them instead of the argument.

The preferred order is:

**explain → demonstrate → compress**

not:

**slogan → slogan → slogan**

A memorable sentence should usually feel earned when the reader reaches it.

---

# 20. Plain prose

Prefer ordinary words when they carry the technical meaning.

Use technical vocabulary when the concept requires it.

Avoid inflated academic or managerial language when simpler language is equally precise.

Prefer:

- use
- change
- choice
- evidence
- boundary
- part
- responsibility
- constraint
- consequence
- learn
- decide

when those words are accurate.

Do not simplify away useful terms such as:

- engineered medium;
- realization;
- obligation;
- invariant;
- authoritative state;
- decomposability;
- degree of freedom;
- architecture;
- specification.

Large words must earn their place.

---

# 21. Avoid false precision and false universality

Do not turn useful heuristics into laws.

Use calibrated language:

- "often";
- "can";
- "tends to";
- "under these conditions";
- "when this property matters";
- "one useful model is..."

when the claim warrants qualification.

Conversely, do not weaken definitions or logically necessary claims merely to sound cautious.

The objective is precision, not hedging.

---

# 22. Boxes

The book uses a small semantic vocabulary of boxes.

Use it consistently.

## PREMISE
The governing proposition for a chapter.

## DEFINITION
Vocabulary the reader needs to reason precisely.

## DECISION
A consequential choice and guidance for making it.

## TRADEOFF
A pair or set of consequences produced by competing alternatives.

## NOTE
An important qualification or caution that does not carry the main argument.

## EXERCISE
A prompt requiring the reader to apply judgment.

Do not invent new box types casually.

Boxes should not compensate for weak prose. The chapter must remain intelligible if the reader follows the main exposition.

---

# 23. Chapter summaries

Every substantive chapter ends with a `Summary` heading followed by ordinary prose.

The Summary is not a box.

A Summary should usually be one or two compact but developed paragraphs.

It should answer:

- What engineering problem did this chapter address?
- What distinctions should the reader retain?
- What decision should the reader now be better able to make?
- How does this chapter connect to what follows?

Do not write:

> In this chapter, we discussed...

Do not summarize section headings in order.

Recover the chapter's **decision model**.

---

# 24. Read Further

Every substantive chapter ends with exactly one `READ FURTHER` box immediately after the Summary.

The box is a curated reading list, not the chapter bibliography.

Normally include 2–4 works.

Each entry should contain:

1. normalized bibliographic information; and
2. one short sentence explaining why the reader should read it.

The corresponding course/lecture lander is authoritative for the candidate reading list.

Procedure:

1. Open the corresponding lecture/course lander.
2. Locate its readings or further-reading material.
3. Treat those works as the candidate pool.
4. Select the 2–4 works that best support the chapter as actually written.
5. Normalize the citation into the handbook style.
6. Add one sentence explaining the work's value to this chapter.

Do not independently invent a reading list when the lander already defines the source pool.

A work cited for one narrow factual claim does not automatically belong in `READ FURTHER`.

Avoid unnecessary duplication across adjacent chapters.

---

# 25. Relationship to citations

`READ FURTHER` is not a substitute for source metadata or scholarly citation.

Claims and quotations that require attribution should retain it in the manuscript's citation system.

The reader-facing `READ FURTHER` box contains only the small subset of works particularly useful for deeper study.

Do not add long bare URLs to print prose. HTML may link titles to canonical destinations.

---

# 26. Figures

A figure should answer or clarify an engineering question.

Before retaining or adding one, ask:

- What does the reader understand more easily because this figure exists?
- Does the surrounding prose tell the reader what to notice?
- Is the figure showing a relationship that prose handles poorly?
- Is the figure actually necessary, or is it decorative?

Figures inherited from slides often need redesign for book use.

Do not simply screenshot slides.

Prefer figures that remain understandable in print and at modest size.

---

# 27. Chapter-specific burdens

When revising a chapter, preserve its central burden.

## Software / GenAI
Derive the engineering problem from the properties of software as a medium and the changing economics of implementation. Do not begin with MAGE as an unexplained framework.

## Process
Explain process as an engineering response to certainty, changeability, and decomposability. Plan-driven and incremental development differ substantially in how work is partitioned, not in whether engineering activities exist.

Consequence of failure affects required assurance; do not silently make it a fourth process dimension.

## Teamwork
Explain how individual capability becomes team capability and why coordination cost prevents linear scaling. Treat coordination mechanisms as engineering responses to dependencies among people and work.

## Requirements
Treat requirements engineering as two coupled problems: discovering what matters and deciding what the engineering effort can responsibly promise.

A candidate valuable feature is not automatically a requirement.

## Specification
Treat specification as defining the boundary of acceptable realizations.

Preserve the distinction between world requirements, machine specifications, and domain assumptions.

Preserve unknown / tacit / free.

## Architecture
Treat architecture as consequential organization that lets multiple obligations coexist.

Architecture allocates coupling; it does not eliminate it.

Patterns provide alternatives and accumulated expectations about consequences.

## Design
Treat design as resolving the remaining degrees of freedom inside inherited obligations, architectural strategy, and engineering-environment constraints.

Design should distinguish choices that are local, choices that should follow an existing mechanism, and choices whose consequences require escalation.

---

# 28. Before writing: identify the chapter argument

Before substantial revision, write an internal outline containing only the topic sentences that should govern the chapter's paragraphs.

Do not begin prose editing until this outline forms a coherent argument.

A useful test is to read only those topic sentences.

They should approximately tell the chapter's story.

If they sound like a list of facts, reorganize them.

If they sound like slide titles with no logical relationship, add the missing reasoning.

If several repeat the same claim, merge them.

Then write or reshape the paragraphs beneath them.

---

# 29. During writing: preserve conceptual continuity

At each paragraph transition, ask why the next paragraph follows.

Good transitions often have conceptual forms such as:

- general principle → consequence;
- problem → alternatives;
- claim → example;
- example → generalization;
- uncertainty → evidence;
- choice → tradeoff;
- inherited constraint → local decision;
- local discovery → feedback upward.

Do not rely excessively on transitional filler such as:

> Another important consideration is...

Make the logical relationship visible instead.

---

# 30. After writing: perform a paragraph-boundary pass

Inspect every paragraph boundary.

Ask:

1. Does this paragraph have one identifiable governing idea?
2. Does its first sentence orient the reader to that idea?
3. Do the remaining sentences develop it?
4. Does the paragraph explain why the idea matters?
5. Is a one-sentence paragraph present only because the sentence sounds important?
6. Have adjacent paragraphs split one argument unnecessarily?
7. Has one paragraph accumulated two unrelated arguments?
8. Would combining or splitting improve the reasoning rather than merely alter visual rhythm?

Pay particular attention to paragraphs shorter than three sentences.

They are not automatically wrong, but they deserve inspection.

---

# 31. After writing: perform an argument pass

Read only:

- chapter title;
- premise;
- section headings;
- topic sentences;
- Summary.

This skeleton should form a coherent argument.

Ask:

1. Does the chapter begin with an engineering problem?
2. Does each major section advance that problem?
3. Are alternatives introduced before judgments?
4. Are consequences explained through mechanisms?
5. Does the chapter teach a transferable way of deciding?
6. Does the Summary recover that decision model?
7. Does the transition to the next chapter follow naturally?

If the skeleton does not work, sentence-level copyediting will not fix the chapter.

---

# 32. After writing: perform an apprenticeship pass

Ask whether the prose helps the reader behave more like an engineer.

For each major idea:

- What situation would cause the reader to use this idea?
- What should the reader notice?
- What question should they ask?
- What alternatives should they consider?
- What evidence might they seek?
- What mistake does the idea help them avoid?

If a section merely gives the reader vocabulary, ask whether the vocabulary is necessary for one of these acts of judgment.

---

# 33. After writing: perform an evidence and uncertainty pass

For consequential claims and examples, ask:

- What is known?
- What is assumed?
- What remains uncertain?
- What evidence supports the decision?
- Could obtaining more evidence change it?
- What would that evidence cost?
- Is there relevant knowledge outside the current engineering team?

Do not pretend that engineering methods eliminate uncertainty.

Teach the reader how to act responsibly under it.

---

# 34. After writing: perform a medium callback pass

The engineered medium is the conceptual spine of the book.

Do not mechanically mention it everywhere, but inspect each chapter for places where its decisions arise from properties of software.

Ask whether the chapter should explicitly connect its reasoning to:

- changeability;
- copyability;
- cheap replication;
- abstraction;
- instrumentability;
- incremental construction;
- automation;
- reversibility;
- deployment at scale;
- or cheap implementation.

For example:

- Process depends strongly on changeability and decomposability.
- Requirements can use prototypes as discovery tools because partial software can often be built cheaply.
- Specification can preserve optionality because some decisions can remain reversible.
- Architecture determines which future changes remain local or become expensive.
- Design can use implementation as a probe when candidate implementations are cheap to produce.

Make these connections where they explain the engineering decision.

Do not insert generic "software is changeable" sentences as decoration.

---

# 35. After writing: perform an epigram pass

Search for:

- one-sentence paragraphs;
- sentences beginning with "The point is...";
- repeated bold conclusions;
- rhetorical fragments;
- repeated "not X, but Y" constructions;
- repeated "This is..." constructions;
- repeated three-item rhetorical sequences;
- questions immediately followed by one-sentence answers.

For each, ask whether the rhetorical form is doing real work.

Retain a few strong formulations.

Convert the rest into normal explanatory prose.

The desired voice is confident and clear, not constantly quotable.

---

# 36. After writing: perform a terminology pass

Ensure consistent use of:

- requirement;
- obligation;
- candidate requirement;
- specification;
- acceptable realization;
- domain assumption;
- model;
- property;
- invariant;
- degree of freedom;
- unknown;
- tacit;
- free;
- architecture;
- design;
- engineering environment;
- evidence;
- judgment.

Do not casually substitute nearby words when the distinction matters.

In particular:

- a requirement is not automatically a specification;
- an unknown is not a degree of freedom;
- an architectural pattern is not an architecture;
- implementation is not synonymous with design;
- a model is not necessarily a diagram;
- evidence is not certainty.

---

# 37. After writing: perform a duplication pass

Because the chapters deliberately connect, repetition is a risk.

A later chapter may briefly recall an earlier principle, but should then advance it.

Prefer:

> Specification introduced degrees of freedom as deliberately acceptable alternatives. Design now asks what happens to those freedoms inside an architectural part.

over re-explaining the complete unknown/tacit/free framework from scratch.

Callbacks should create continuity, not duplicate pages.

---

# 38. After writing: perform a GenAI pass

For every GenAI reference, ask:

- Does GenAI materially alter the engineering economics here?
- Does it change what evidence can be obtained?
- Does it change scale, autonomy, or coordination?
- Is this actually a general software-engineering point?

If the final answer is yes, state the general principle and omit the unnecessary GenAI reference.

The book should age well.

---

# 39. Final self-review checklist

Before considering a chapter complete, verify all of the following.

## Argument
- The chapter has one identifiable engineering problem.
- Its sections form an argument rather than a catalog.
- The premise is actually developed.
- The chapter teaches judgment, not merely vocabulary.
- Alternatives appear where a consequential choice exists.
- Tradeoffs explain mechanisms.
- Important uncertainty is acknowledged.
- Evidence is connected to decisions.

## Prose
- Most paragraphs develop substantial ideas.
- One-sentence paragraphs are rare and intentional.
- Topic sentences orient the reader.
- Examples are integrated into arguments.
- Aphorisms summarize reasoning rather than replace it.
- Rhetorical questions are used sparingly.
- The prose does not read like expanded slides.
- The prose does not read like a blog post.
- The prose is plain without becoming simplistic.

## Continuity
- Terminology agrees with earlier chapters.
- Earlier concepts are recalled rather than unnecessarily re-taught.
- The engineered medium is invoked where it actually explains the decision.
- The transition to the next chapter is clear.
- GenAI appears only where it materially changes the argument.

## End matter
- The chapter ends with `Summary`.
- The Summary recovers the chapter's decision model.
- `READ FURTHER` follows the Summary.
- Its sources come from the corresponding course lander.
- Each reading explains why it is worth reading.

---

# 40. The final test

Ask:

**If a student encounters a new engineering problem that is not one of the examples in this book, has this chapter made them better able to decide what to do?**

If the answer is only:

> They now know the terminology.

the chapter is not finished.

If the answer is:

> They know what to look for, what questions to ask, what alternatives to consider, what information might change the decision, and why the tradeoffs arise.

then the chapter is doing its job.

The goal is not to make the reader remember the handbook.

The goal is to improve the reader's engineering judgment.
