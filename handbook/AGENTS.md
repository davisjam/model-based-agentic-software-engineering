# AGENTS.md

# The Software Engineering Handbook
## Instructions for authoring agents

This repository contains *The Software Engineering Handbook: A Judgment and Decision-Making Approach*.

This is a short engineering textbook about how software engineers make decisions.

It is not an encyclopedia of software-engineering terminology, methods, processes, patterns, or tools.

The organizing idea is **apprenticeship**: the reader should become better able to recognize an engineering problem, determine what matters, gather the information needed to decide, compare plausible alternatives, understand their consequences, and exercise judgment.

For substantial prose work, use a Fable and have it use the `self-communicate` skill for planning, drafting, and review.

---

# 1. Preserve the book's intellectual spine

The book begins from the engineered medium.

Software is unusually changeable, copyable, inspectable, instrumentable, automatable, and cheap to reproduce. Those properties create much of the decision landscape of software engineering.

Generative AI changes that landscape further by reducing the cost of implementation and some forms of experimentation. It does not remove engineering judgment.

The chapters form one progression:

1. **Software / GenAI** — What kind of engineered medium is software, and what changes when implementation becomes cheap?
2. **Process** — Given that medium, how should engineering work be organized?
3. **Teamwork** — How does individual capability become coordinated engineering capability?
4. **Requirements** — What should the engineering effort promise?
5. **Specification** — Which realizations would satisfy those promises?
6. **Architecture** — How should one acceptable realization be organized so its obligations can coexist?
7. **Design** — How should its parts actually realize their responsibilities?
8. **Conclusion** — How should an engineer approach a consequential decision?

Do not let the chapters become seven independent textbook surveys.

---

# 2. Teach a recurring model of engineering judgment

The book should repeatedly cultivate the same habit of mind:

- What is required?
- What decision must be made?
- What information could change that decision?
- What might we be missing?
- How can we learn enough?
- What plausible alternatives exist?
- What does each alternative make easier or harder?
- Is more information worth its cost?
- Then decide.

This is not a rigid process to enumerate in every chapter.

It is the reader's apprenticeship.

Engineering judgment includes epistemic humility. The engineer may not yet know what matters. Tacit requirements, missing stakeholders, unexplained constraints, unfamiliar failure modes, or another person's experience may change the problem itself.

---

# 3. Concision comes from selection, not terse prose

The handbook should be short because it teaches fewer things well.

Do not make it short by compressing important ideas into slogans.

Prefer removing:

- redundant examples;
- terminology catalogs;
- secondary methods;
- digressions;
- or overlapping sections

over reducing a central argument to three sharp sentences.

The surviving ideas should receive enough explanation that a student can use them.

---

# 4. Write textbook prose, not expanded slides

The lecture decks are source material, not prose.

Use their slide titles as candidate paragraph burdens: many already state useful engineering questions or claims.

Do not mechanically create one paragraph or subsection per slide.

The normal paragraph should develop one substantial idea. A useful diagnostic is:

**topic sentence → explanation → example or contrast → consequence**

One-sentence paragraphs should be rare.

Do not create paragraph breaks merely because a sentence sounds memorable.

Avoid blog rhythm:

> claim  
> punch line  
> rhetorical question  
> answer  
> another punch line

A memorable sentence should usually compress reasoning the paragraph has already earned.

---

# 5. Begin from engineering problems, not catalogs

Methods, patterns, models, and tools should enter because they help answer an engineering question.

Prefer:

> Several components need access to the same evolving information. Should they pass it through a sequence or share an authoritative repository?

over:

> Two common architectural patterns are pipeline and repository.

Whenever practical:

1. state the problem;
2. present plausible alternatives;
3. explain their mechanisms;
4. show what each makes easier or harder;
5. identify what evidence could change the choice.

Do not label an alternative "best practice" unless the others are genuinely dominated under the stated conditions.

---

# 6. Tradeoffs must explain mechanisms

Avoid empty tradeoff prose such as:

> This is more scalable but less maintainable.

Explain why.

For example:

> Deferring work to a queue removes it from the request's latency-sensitive path and isolates the caller from some worker failures. The design now has to handle retries, duplicate execution, ordering, and eventual failure reporting.

The reader should be able to transfer the reasoning to a new problem.

---

# 7. Keep the central distinctions stable

## Requirements and specification

Requirements describe obligations the engineering effort accepts.

Specification bounds the realizations that would count as satisfying those obligations.

Preserve the world / machine / domain-assumption distinction where relevant.

## Unknown, tacit, and free

An unconstrained choice may be:

- **Unknown** — consequences are not yet understood.
- **Tacit** — a consequential boundary exists but has not been made explicit.
- **Free** — the alternatives are genuinely acceptable.

Only the third is a deliberate degree of freedom.

Do not treat "unspecified" as "free."

## Modeling

A model is a purposeful view.

The recurring pattern is:

**engineering question → representation → property → analysis or check**

A model is useful because it preserves the distinctions needed for one question and leaves irrelevant detail out.

## Architecture and design

Architecture establishes consequential organization within which later decisions are made.

Design realizes responsibilities within those inherited constraints.

The relationship is recursive.

The useful shorthand is:

**Architecture establishes strategy. Design chooses tactics within it.**

Explain the relationship; do not use the sentence as a substitute for explanation.

---

# 8. Decisions flow downward; evidence flows upward

The conceptual progression is:

**purpose → requirements → specification → architecture → design → implementation**

but engineering learning also moves upward.

A prototype may reveal a misunderstood requirement.

Design may expose an architectural gap.

Architecture may reveal that a specification is impractical.

Deployment may expose a false domain assumption.

Repeated local decisions may reveal that the engineering environment needs a common mechanism.

Treat this feedback as normal engineering learning, not as a failure of the progression.

---

# 9. Connect decisions to the engineered medium where it explains them

The engineered medium is the book's conceptual spine.

Use it where it actually explains an engineering result:

- Process depends on certainty, changeability, and decomposability.
- Requirements can use prototypes as discovery tools because partial software can be built cheaply.
- Specification can preserve optionality because some software choices remain reversible.
- Architecture determines which future changes remain local and which become expensive.
- Design can use implementation as a probe when candidate implementations are cheap.

Do not insert generic observations that "software is changeable" merely to remind the reader of the theme.

Likewise, mention GenAI only when it materially changes implementation cost, experimentation, evidence, coordination, reasoning scale, or autonomy.

Teach the general software-engineering principle otherwise.

---

# 10. Use examples to carry reasoning

Examples should show:

- why a distinction matters;
- how alternatives differ;
- what causes a tradeoff;
- what evidence would resolve uncertainty;
- or why a local choice has wider consequences.

Do not add examples merely for color.

Prefer a running example when several decisions accumulate naturally. The Sleep Advisor works well across Requirements and Specification because the reader can watch a broad purpose become progressively constrained.

Rotate examples when another domain better demonstrates the abstraction.

---

# 11. Preserve the semantic components

Use the established box vocabulary consistently:

- `PREMISE` — governing proposition for a chapter;
- `DEFINITION` — vocabulary needed for precise reasoning;
- `DECISION` — a consequential choice and guidance for making it;
- `TRADEOFF` — consequences of competing alternatives;
- `NOTE` — a qualification or caution;
- `EXERCISE` — practice applying judgment.

Do not invent new box types casually.

Boxes support the prose; they do not replace it.

Every substantive chapter ends with:

1. `Summary` — ordinary prose that recovers the chapter's decision model;
2. `READ FURTHER` — a curated box containing 2–4 readings and a short explanation of why each is useful.

The corresponding course/lecture lander is authoritative for the candidate reading list.

`READ FURTHER` is not the chapter bibliography.

---

# 12. Chapter burdens

When revising a chapter, preserve its central engineering question.

## Software / GenAI
Derive the problem from the properties of software as an engineered medium and the changing economics of implementation.

## Process
Explain process through certainty, changeability, and decomposability.

Plan-driven and incremental processes differ substantially in how work is partitioned, not in whether engineering activities exist.

Consequence of failure affects assurance; do not silently make it a fourth process dimension.

## Teamwork
Explain how individual capability becomes team capability and why coordination cost prevents linear scaling.

## Requirements
Treat requirements engineering as two coupled problems: discovering what matters and deciding what the engineering effort can responsibly promise.

A valuable idea is not automatically a requirement.

## Specification
Treat specification as bounding acceptable realizations.

Preserve world / machine / domain assumptions and unknown / tacit / free.

## Architecture
Treat architecture as consequential organization that lets multiple obligations coexist.

Architecture allocates coupling; it does not eliminate it.

Patterns supply alternatives and expectations about consequences.

## Design
Treat design as resolving the remaining degrees of freedom inside inherited specification, architecture, and engineering-environment constraints.

Distinguish choices to **follow**, **choose**, or **escalate**.

---

# 13. Authoring workflow

For substantial chapter work:

## Before writing

Recover:

- the engineering problem;
- the chapter's contribution to the book;
- the concepts already known to the reader;
- the new distinctions introduced here;
- the evidence or examples supporting them;
- and the transition to the next chapter.

Then write an internal outline containing only the intended paragraph topic sentences.

Read those sentences alone.

They should form the chapter's argument.

If they sound like a list of facts, reorganize them.

## While writing

Develop each paragraph with explanation, mechanism, evidence, example, contrast, qualification, or consequence.

Do not optimize for punchiness.

Use the lecture deck to supply missing reasoning, not to inflate coverage.

## After writing

Run the `self-communicate` skill, then perform the handbook-specific review below.

---

# 14. Handbook-specific review

## Argument
- Does the chapter have one identifiable engineering problem?
- Do its sections form an argument rather than a catalog?
- Are alternatives introduced before judgments where appropriate?
- Are tradeoffs explained through mechanisms?
- Does the chapter teach a transferable way of deciding?

## Paragraphs
- Does each paragraph have one governing idea?
- Does its topic sentence orient the reader?
- Do the remaining sentences develop it?
- Are one-sentence paragraphs rare and intentional?
- Have adjacent paragraphs unnecessarily split one argument?
- Does the prose read like a textbook rather than slides or a blog?

## Judgment
- What should the reader notice in a new problem?
- What question should they ask?
- What alternatives should they consider?
- What information might change the decision?
- What uncertainty or missing knowledge might matter?

## Continuity
- Are established concepts invoked rather than re-taught?
- Is terminology stable?
- Does the engineered medium appear where it explains the decision?
- Does GenAI appear only where it materially changes the argument?
- Does the chapter lead naturally to the next one?

## End matter
- Does `Summary` recover the decision model rather than list sections?
- Does `READ FURTHER` use the course lander as its candidate source pool?
- Does each reading explain why it is worth reading?

---

# 15. Final test

For every chapter, ask:

**If a student encounters a new engineering problem not described in this book, has this chapter made them better able to decide what to do?**

Knowing the terminology is not enough.

The reader should know:

- what to look for;
- what question to ask;
- what alternatives to consider;
- what information could change the decision;
- what they might not yet know;
- and why the relevant tradeoffs arise.

That is the handbook's job.
