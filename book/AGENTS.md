# AGENTS.md

# Model-Based Agentic Software Engineering
## Instructions for authoring agents

> Build, format, and index-annotation conventions live in [BUILD.md](BUILD.md).

This repository contains *Model-Based Agentic Software Engineering (MAGE)*.

MAGE is an engineering book about how to build reliable software with probabilistic software agents.

The central problem is not how to make agents perfectly reliable. It is how to structure the engineering environment so that humans and agents can exercise substantial autonomy without losing the requirements, design decisions, evidence, and controls that make the resulting software acceptable.

This book develops an argument. It is not a survey of AI coding tools, a prompting guide, a DocAble manual, or an AI-futures manifesto.

For substantial prose work, use a Fable and have it use the `self-communicate` skill for planning, drafting, and review.

---

# 1. Preserve the argument

Implementation is becoming abundant relative to engineering judgment.

As implementation gets cheaper, other engineering problems become more visible:

- deciding what should be built;
- representing systems well enough to reason about them;
- preserving consequential engineering knowledge across changes;
- determining what evidence is sufficient;
- enforcing important obligations;
- coordinating humans and agents;
- and deciding which choices should remain open.

MAGE responds through three moves:

**Modeling** makes consequential engineering knowledge explicit in representations that humans and agents can reason through.

**Alignment** backs important obligations with concrete mechanisms that constrain, check, or reject work.

**Governance conversion** turns recurring failures and judgment into durable engineering structure that future work inherits.

That accumulated structure becomes **engineering capital** when later work continues to benefit from it.

MAGE is a working cycle:

1. model consequential knowledge;
2. enforce important obligations;
3. do the governed work;
4. observe failures, friction, and repeated judgment;
5. convert recurring lessons into durable structure;
6. repeat.

The objective is not maximum automation. It is greater autonomy while preserving consequential engineering decisions.

---

# 2. Keep the main distinctions stable

## Modeling and Alignment

Do not collapse them.

Modeling changes what the reasoner can know.

Alignment changes what the engineering environment will permit or accept.

A model may expose an obligation without enforcing it. A gate may enforce a rule without supplying a useful model.

## Degrees of freedom

An unconstrained choice may be:

- **Unknown** — consequences are not yet understood.
- **Tacit** — a consequential boundary exists but has not been made explicit.
- **Free** — the alternatives are genuinely acceptable.

Only the third is a deliberate degree of freedom.

Do not treat “unspecified” as synonymous with “free.”

Govern what is settled. Preserve what is genuinely free.

## Reasoning horizon

A reasoning horizon is the amount of intermediate reasoning state that must remain available at once to carry a task to a correct result.

It is a property of the task and its representation, not merely the intelligence of the reasoner.

More context does not automatically solve a representation problem.

## Engineering environment

The environment carries engineering decisions forward through models, APIs, abstractions, tests, static checks, generators, gates, permissions, deployment controls, conventions, and other mechanisms.

When describing one, say what it actually does.

Prefer:

> The gate rejects a change that violates the dependency rule.

over:

> The obligation acquires authority.

## Governance mechanisms

Use the vocabulary precisely.

A **constraint** prevents or narrows an invalid action.

A **sensor** detects drift after an action has been attempted.

Examples of sensors include tests, lints, validators, and gates.

Keep mechanism kind separate from enforcement strength:

- **soft** enforcement aims behavior;
- **hard** enforcement deterministically prevents or rejects violations.

Do not use “control” loosely when a more precise term exists.

---

# 3. DocAble is evidence, not the subject

DocAble is the book’s deepest worked case.

Use it when its details uniquely demonstrate MAGE concepts such as typed models, governance conversion, assurance, repeated failure families, or engineering capital.

Do not use it merely because it is familiar.

Vary examples across domains when another system can carry the abstraction more cheaply.

When using DocAble, distinguish among:

- an observed fact;
- an interpretation;
- a hypothesis suggested by the case;
- and a broader claim supported by literature.

Do not silently generalize one case into a universal law.

Organize the book around the engineering ideas, not the chronology of how DocAble discovered them.

---

# 4. Write an engineering book

Use `self-communicate` as the detailed style authority.

The local requirements are:

- write textbook prose, not expanded slides;
- prefer rich paragraphs over one-sentence barbs;
- state the abstraction once, then use its name;
- use plain verbs around precise technical nouns;
- introduce examples before generalizations where practical;
- vary rhetorical devices;
- keep slogans rare;
- do not narrate the manuscript itself;
- and let later chapters become denser as the reader learns the vocabulary.

A normal paragraph should develop one idea:

**topic sentence → explanation → mechanism or example → consequence**

Use that as a diagnostic, not a rigid template.

A memorable sentence should usually compress a developed argument, not replace one.

---

# 5. Keep Alignment concrete

Whenever prose says an obligation is aligned, governed, enforced, or given authority, ask:

1. What is the obligation?
2. Where is it represented?
3. Which mechanism can see it?
4. What action does that mechanism take?
5. What does it cost?
6. What can still escape?

Prefer concrete operations:

- the type prevents;
- the validator checks;
- the lint detects;
- the gate rejects;
- the permission blocks;
- the model exposes;
- the test produces evidence.

Avoid vague formulations such as “make the requirement effective” when the actual operation can be named.

---

# 6. Models are purposeful views

A model earns its place by the engineering question it helps answer.

For every model, ask:

- What question is it for?
- What distinctions does it preserve?
- What does it omit?
- What property can be stated over it?
- What analysis or check does it support?
- How does it stay connected to the implementation?
- What happens if it drifts?

The recurring pattern is:

**engineering question → representation → property → analysis or check**

Do not advocate structure for its own sake.

A larger context window is not automatically a better representation.

---

# 7. Evidence must match the claim

A recurring MAGE question is:

**What evidence is sufficient to justify accepting this change or system?**

Evidence may include tests, static analysis, measurements, model checking, proofs, reviews, provenance, runtime observations, or compliance artifacts.

Distinguish among:

- reasoned expectation;
- structural argument;
- quantitative prediction;
- observed measurement;
- proof.

Do not reduce assurance to “more tests.”

For broader claims, distinguish:

- case observation;
- literature-backed claim;
- hypothesis;
- author standpoint.

Cite, scope, hedge, or cut claims whose evidence is too weak.

---

# 8. Governance has a cost

Do not advocate maximal governance.

Every model, lint, gate, generator, process, or rule has costs: implementation, maintenance, runtime, false positives, reduced flexibility, cognitive load, or coordination.

Governance is justified when the consequence or recurrence of a failure makes durable structure worthwhile.

A one-off local choice may stay local.

A repeated failure may deserve a reusable mechanism.

Governance conversion should answer:

**What will the next task inherit that this task did not?**

---

# 9. Keep the book durable

Do not overfit the theory to current model vendors, prices, benchmarks, or organizational predictions.

Use contemporary examples when they matter, but state the durable engineering principle underneath them.

Avoid unnecessary predictions about:

- headcount;
- management layers;
- AGI timelines;
- specific vendors;
- or inevitable organizational outcomes.

The book may discuss implications, but should distinguish evidence from speculation.

---

# 10. Preserve the large-scale arc

The book moves broadly through:

**setup → Modeling → Alignment → practice → theory → implications**

Earlier Parts establish the problem.

Middle Parts develop the machinery.

Later Parts extract theory, predictions, organizational and educational implications, and adoption guidance.

Do not turn each Part into an independent essay.

Part openings should state the unresolved problem and the new move.

Part closings should compress the contribution and lead forward.

The Conclusion should return to the opening problem rather than summarize every chapter.

---

# 11. Use insets as an optional second track

Use an inset when an established outside concept is needed at one point but some readers will already know it.

An inset should:

- answer one question;
- begin with plain intuition;
- use one concrete example;
- include only the formalism needed here;
- and let the reader rejoin the main argument.

The mainline must remain readable if the inset is skipped.

Once a term has been taught, use the term without re-teaching it.

---

# 12. Authoring workflow

For substantial revisions:

## Before writing

Recover:

- the chapter’s engineering problem;
- the claim it contributes to the book;
- concepts already available to the reader;
- the new concept introduced here;
- the evidence or examples supporting it;
- and the transition to what follows.

Then write an internal outline containing only the topic sentences of the intended paragraphs.

Read those topic sentences alone. They should form an argument.

## While writing

Develop each paragraph with mechanism, example, evidence, contrast, qualification, or consequence.

Do not optimize for punchiness.

Use figures only when a relationship is easier to understand spatially than in prose.

## After writing

Run `self-communicate`, then perform the MAGE checks below.

---

# 13. MAGE-specific review

Before considering a chapter complete, ask:

## Argument
- What engineering problem does this chapter solve?
- How does it advance Modeling, Alignment, governance conversion, or their implications?
- Does the argument develop rather than accumulate observations?
- Does the chapter end one conceptual level beyond where it began?

## Modeling
- Does every important model answer an explicit question?
- Is the model purposeful rather than comprehensive?
- Can it drift from reality, and if so is that addressed?

## Alignment
- Are obligations concrete?
- Are mechanisms named precisely?
- Are constraints and sensors distinguished?
- Is enforcement strength clear?
- Are costs acknowledged?

## Evidence
- Are observations, hypotheses, and broader claims distinguishable?
- Do citations support the verbs used?
- Does DocAble evidence remain scoped appropriately?

## Prose
- Do paragraphs carry developed ideas?
- Are one-sentence paragraphs rare?
- Are established concepts invoked rather than re-taught?
- Is the prose plain without losing technical precision?
- Have repeated epigrams, tricolons, em-dashes, and “not X, but Y” constructions been reduced?

## Continuity
- Is terminology stable?
- Does the chapter reuse earlier vocabulary with progressive density?
- Does GenAI appear because it changes the economics or reasoning, rather than by reflex?
- Does the chapter connect naturally to what comes before and after?

---

# 14. Source and artifact discipline

Use primary literature, standards, regulations, and official documentation where appropriate.

Do not invent citations or overstate what a source establishes.

Quotes should earn their space; endorsements do not establish validity.

HTML and PDF are peer outputs. Author semantic source, not target-specific hacks.

Do not hand-edit generated artifacts. Fix the source representation, build rule, or mechanism that future outputs inherit.

---

# 15. Final test

For every chapter, ask:

**If an engineer encounters a new agentic-software problem not described in this book, has this chapter improved their ability to structure the engineering environment around it?**

Knowing another MAGE term is not enough.

The reader should be better able to:

- identify the engineering knowledge that matters;
- choose a representation for it;
- decide which obligations need enforcement;
- preserve legitimate degrees of freedom;
- gather appropriate evidence;
- and recognize when recurring judgment should become durable engineering structure.

That is the book’s job.
