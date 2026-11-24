# AGENTS.md

# Model-Based Agentic Engineering
## Instructions for authoring agents

> Build, format, and index-annotation conventions live in [BUILD.md](BUILD.md).

This repository contains *Model-Based Agentic Engineering (MAGE)*.

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

Agentic engineering through models involves recurring modeling, realization, and evaluation, with no required starting point. Alignment operates throughout: constraints govern realization, sensors supply evidence, and gates control admission. Governance conversion can occur during any of these activities; it is not a phase of the cycle. Repeated governance conversions can accumulate engineering capital. Ratcheteering specifically introduces an authoritative model that deliberately disagrees with the current implementation, then directs agents to bring that implementation into conformance; it is not a synonym for accumulation, maintenance, or model revision.

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

A reasoning horizon is the practical limit of the work a reasoner and its supporting machinery can carry through reliably, given the available representations and resources.

For an agent, include the foundation model, harness, external memory, and tools. Do not equate this system-level limit with a token-window size or the amount of state a task requires. A long-horizon task carries related decisions and their dependencies across an extended sequence of steps; it need not exceed the system's capacity.

Better memory management can increase the state the system can use across its work; a better representation can reduce the search, reconstruction, or inference required. Either can extend the horizon or reduce cost within it. The definition and supporting literature are in §1.3; keep the glossary and `book/data/definitions.json` consistent with them.

## Engineering environment

Keep **agentic harness** and **engineered environment** distinct. The harness supplies runtime facilities, including context management, tool invocation, and hooks. The engineered environment is the project’s arrangement of representations, tools, processes, permissions, and checks: how those harness facilities are configured and used, plus structures outside the harness. A hook facility belongs to the harness; installing a project check through it is part of engineering the environment. This is a distinction of roles, not necessarily of software packages. A **Governed Engineering Environment** is the form that enforces selected obligations; it is not a synonym for the general environment. Use the existing term IDs `agentic-harness` and `engineered-environment`, whose canonical definitions are in §1.3 and `book/data/definitions.json`.

The environment carries engineering decisions forward through models, APIs, abstractions, tests, static checks, generators, gates, permissions, deployment controls, conventions, and other mechanisms.

When describing one, say what it actually does.

Prefer:

> The gate rejects a change that violates the dependency rule.

over:

> The obligation acquires authority.

## Governance mechanisms

Use the vocabulary precisely.

Distinguish three functional categories: **constraints** restrict available actions or states; **sensors** observe artifacts, attempted actions, or executing systems and produce evidence; **gates** evaluate admission conditions and enforce the resulting decisions at a boundary. One implementation can combine these functions. Sensors require observability of the relevant state or behavior, which can include static artifacts as well as executions. Gates can govern runtime actions and resource use as well as development and deployment.

**Evaluation** is the operation of evaluating evidence against an obligation. A validator may report findings without blocking work or supply a gate’s evaluation. Do not classify checking as a fourth peer category or treat a correct verdict alone as enforcement. Explain the policy decision/enforcement distinction with the policy-based access-control sources cited in §3.3.

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

### Trace claims to their evidence

At every substantive use of private case evidence, attach an editorial reference beside the
claim in the canonical LaTeX source, including independently reused claims, tables, captions,
and blueprint examples. Use a raw comment, which does not enter the published editions:

```latex
% Evidence: E10 | source: book/data/local-evidence/evidentiary-basis-11202026/integration/records/E10.md | kind: implementation
```

The referenced record must identify the preserved sources, their dates or revisions, the
claim's scope, and any remaining limitations. Keep private source material under the ignored
`book/data/local-evidence/` directory; do not force-add it or substitute a broken public link.
Use ordinary bibliographic citations for published sources. A fresh checkout may lack private
evidence; report that absence instead of treating a reference as verification.

Distinguish implementation definitions, recorded executions, measurements, author accounts,
illustrations, and prescriptions. Source code can establish how a mechanism is defined; a
test definition is not a historical run receipt, and a derived plan is not evidence of its
external effect. When revising a claim, inspect its evidence record and update its other book
occurrences. Preserve the source date and population of numerical claims. Do not turn a
blueprint recommendation into an implementation assertion, or add implementation-status
disclaimers where the passage already clearly describes a design.

---

# 4. Write an engineering book

Use `self-communicate` as the detailed style authority, especially its
[textbook register](../plugin/mage/skills/self-communicate/writing/textbook.md).

Write for a technically capable engineer learning the argument. Develop the reasoning needed to
understand and apply each idea in connected paragraphs, with mechanisms, examples, and transitions.
**Use technical language where precision requires it, not where convention permits it.**
Chapter 1 provides the example: “A stapler joins sheets of paper and a hole punch makes holes in them.”
The sentence names the objects and says what they do; more specialized wording would add no precision.
Apply the same standard to engineering prose: retain a technical term when the distinction requires it,
and explain it in ordinary language. In Chapter 6, readers should spend their effort on the mathematics,
not on deciphering the surrounding English. Preserve formal definitions, propositions, and hypotheses.

Preserve precise terms in ordinary syntax. Start with the problem, question, example, or claim that
best prepares the reader; definition-first is appropriate for a glossary, not a universal rule for exposition.

Judge length by explanatory work. Keep intuition, worked examples, and deliberate repetition that
helps the reader test or connect an idea. Remove repeated claims, ornament, and qualifications that
interrupt the argument before the reader needs them. Before shortening, ask what the reader must
now infer. Before expanding, identify the question the added material answers.

Use first person, direct address, questions, and lists when they help teach. Explain engineering
costs, alternatives, and the judgment behind a choice. As the reader learns the vocabulary, use
its established names and increase density without skipping new reasoning. Vary rhetorical devices,
keep slogans rare, and present the argument rather than narrating the manuscript.

A normal paragraph should develop one idea:

**topic sentence → explanation → mechanism or example → consequence**

Use that as a diagnostic, not a rigid template.

A memorable sentence should usually compress a developed argument, not replace one.

When introducing established background, synthesize lines of research and their shared findings, with representative citations. Avoid study-by-study accounts, benchmark multipliers, and lists of researchers unless those details matter to the engineering argument. Attribute borrowed or adapted vocabulary explicitly.

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


## Chapter opening conventions

Each numbered chapter begins with a question, a Key Ideas box, and brief opening prose. These elements serve distinct purposes:

1. **Question this chapter answers.** Pose the motivating engineering problem in language available to the reader at this point in the book. Do not presuppose terminology introduced within the chapter, enumerate the contents, or ask a question answered trivially by the first example. Prefer one concise question.
2. **Key Ideas.** Orient readers to why the chapter matters and what they should learn. Use accessible prose rather than a compressed chapter summary or a list of definitions. Introduce unfamiliar concepts through their ordinary engineering meaning. Where the chapter establishes a formal principle or recurring process, place its concise statement last, in italics and centered. Preserve canonical principle wording rather than silently creating a new definition.
3. **Opening prose.** Advance the argument rather than merely recapitulating the preceding chapter. Usually use two or three paragraphs: establish the problem, develop its significance through an example or organizing idea, and explain how the chapter proceeds. Introduce an organizing figure where useful.
4. **Signposting.** End the opening prose with a compact roadmap of the substantive sections, following Chapter 5's pattern. Explain each section's contribution rather than repeating the table of contents. Use resolved symbolic references, never hard-coded numbers or placeholder labels. In canonical LaTeX, single-label `\cref{chapter:<actual-slug>}` or the established `\magevalue{sec:<identity>}` convention works across editions; verify the destination against the current structure. Do not use unsupported uppercase or multi-label forms without extending and checking the projection.
5. **Continuity.** Read adjacent questions and Key Ideas together. Each opening builds on concepts already established and introduces the next engineering problem. The progression is problems, representation, enforcement, dynamics, production organization, theory, and professional implications.
6. **Length and typography.** Keep the opening proportionate to other chapters, Key Ideas compact, and the question short enough to read as one question. Check the rendered page for avoidable wrapping. Formal principles and process statements use consistent closing typography; ordinary explanatory paragraphs retain normal alignment.

When editing an opening, verify that its question, Key Ideas, and prose do different work; that terminology is explained at the reader's current level; that roadmap references resolve to the intended sections in every edition; and that the next substantive section follows without repeating the introduction. Preserve a recently approved opening when only reference or continuity edits are needed.

## Chapter-Specific Purpose, Voice, and Editorial Style

The chapters of MAGE serve different purposes and should not be edited toward a uniform prose style. The book moves from motivation to engineering methodology, empirical case analysis, theory, and professional implications. The appendices provide technical reference and adoption guidance. Editors should preserve these distinctions, including deliberate differences in pacing, exposition, examples, and use of the first person.

### Chapter 1 — The New Engineering Problem

**Purpose and reader outcome.** Chapter 1 motivates MAGE by establishing how commodity intelligence changes the engineering problem. It introduces the central distinctions—implementation versus engineering judgment, consequential obligations versus implementation freedom, and Modeling versus Alignment—without requiring readers to understand the machinery developed later. The reader should finish understanding why conventional agent-assisted programming is insufficient for governing large systems, what MAGE proposes instead, and why DocAble provides a useful setting in which to investigate the method.

**Voice and organization.** This is an accessible, engaging opening chapter, closer to a well-written popular technical book than a reference manual. Concrete analogies, familiar engineering examples, rhetorical questions, occasional humor, and first-person observations are welcome. The printer analogy is a deliberate organizing device, not an incidental metaphor. Explanations should proceed from familiar situations toward technical distinctions, introducing terminology only when it becomes useful. Preserve the author’s personality and the narrative of discovery. Avoid premature formalism, excessive qualifications, and exhaustive descriptions of mechanisms developed in later chapters. Concision matters, but not at the expense of an inviting introduction.

### Chapter 2 — Modeling

**Purpose and reader outcome.** Chapter 2 teaches engineers to select, construct, interpret, and connect purposeful engineering models. Its central lesson is that the engineering question determines the representation: what distinctions must be preserved, what properties become expressible, and what analyses become possible? The reader should acquire a practical modeling repertoire and understand how models preserve consequential knowledge without unnecessarily restricting implementation freedom. This chapter establishes the representational foundation for Alignment.

**Voice and organization.** Use the style of a rigorous but approachable undergraduate engineering textbook. Introduce concepts through small, tractable examples before developing their general properties and then examining their realization in DocAble. The recurring progression—engineering question, model, semantics, properties, analysis, and application—is deliberate pedagogical scaffolding. Figures, small formal examples, and worked analyses should do substantial explanatory work. Explain mathematical notation before relying on it, and distinguish what a model establishes from what remains unknown. Preserve careful, incremental development and useful transitions between model classes. Avoid turning the chapter into a catalogue of notations or compressing worked reasoning into abstract conclusions. The reader should learn how to think with models, not merely recognize their names.

### Chapter 3 — Alignment

**Purpose and reader outcome.** Chapter 3 teaches engineers how to make selected engineering obligations enforceable. It develops the relationship among obligations, evidence, constraints, sensors, gates, intervention boundaries, and governance mechanisms. The reader should learn to choose what warrants enforcement, where an obligation becomes decidable, how to evaluate whether a mechanism provides the intended protection, and how to maintain a growing portfolio of controls. The distinction between guidance and enforcement is fundamental, as is the distinction between correspondence, conformance, and acceptance.

**Voice and organization.** Preserve Chapter 2’s rigorous, accessible textbook style, but emphasize engineering decisions about evidence and enforcement rather than model construction. Develop each mechanism from the obligation it serves, using small examples to establish its behavior before introducing more complex DocAble applications. Distinguish carefully among what a mechanism observes, what it evaluates, and what it actually prevents or refuses. Scope and limitations of assurance are substantive engineering facts, not boilerplate disclaimers. Formal distinctions, diagrams, and worked examples should make these boundaries intelligible. Avoid implying that more controls are inherently better, that passing checks establishes unrestricted correctness, or that every engineering judgment should be mechanized. Preserve the discussion of engineering freedom alongside enforcement.

**Teaching sequence.** Build from Chapter 2’s models to obligations and adequate evidence, then introduce governance mechanisms and the implementation freedom they preserve. Teach placement after the mechanism repertoire, bringing the semantic gap into the discussion of intervention boundaries. Follow with governance conversion and engineering capital, then treat the accumulated controls as a system that itself needs models and maintenance. This is an order for teaching; Chapter 4 shows that engineering work need not follow it as a fixed process.

**Figures and tables.** Use the standard book figure font at a consistent size, with restrained boldface and italics to distinguish roles. Fit boxes to labels and short explanations; keep detailed reasoning in the prose. Compact diagrams by reducing excess padding, gaps, and connector runs, while preserving readable text and clear arrow approaches. Prefer horizontal arrangements where the relationships permit. Captions should explain the lesson and necessary qualifications rather than transcribe the drawing. Allocate table widths according to content. Verify legibility at final print size; estimated percentage reductions are targets, not reasons to shrink type or lose scope qualifications.

### Chapter 4 — MAGE in Motion: Engineering Through Models

**Purpose and reader outcome.** Chapter 4 integrates Modeling and Alignment into an evolving engineering practice. It explains active and passive alignment, incremental development of an alignment kernel, the emergence of related models from engineering problems, brownfield model recovery, and maintenance of the governed engineering environment. The reader should understand how to practice MAGE without assuming that modeling precedes implementation, that models remain correct indefinitely, or that engineering follows a fixed sequence of phases.

**Voice and organization.** Make this the chapter in which the reader watches an engineer work. Use a short conceptual introduction followed by sustained episodes of engineering the product, recovering knowledge from an existing implementation, and improving the engineering environment itself. The extended DocAble memory, execution, and latency case is particularly important: an observed problem motivates a model, the model enables an intervention, and the intervention exposes further questions. Preserve this causal progression, including unsuccessful hypotheses, revised models, measurements, and tradeoffs. Use first-person past tense for the author’s engineering decisions, identify actions performed by Claude or other agents, and use present tense when developing a general lesson with the reader. Mark hypothetical extensions explicitly. Generalize after the relevant evidence rather than interrupting the episodes with adoption manuals. Chapters 2–3 teach the constituent activities, Appendix A explains construction, and Appendix B carries practical adoption and operation guidance. Integrate relocated material at those destinations without duplicating existing explanations. Do not rewrite an episode as though the final architecture had been planned from the beginning. Modeling, Realization, and Evaluation need no fixed starting point or order.

**Episode lessons.** Each major engineering episode establishes the practical problem that motivated the work, explains the technical decisions and their consequences, and states a lesson transferable beyond DocAble. Recall concepts from Chapters 2–3 briefly rather than reteaching them. Do not require readers to infer the principal lesson from technical details alone. In the experiential sections, use `\engineeringlesson{...}` for an unnumbered, italicized paragraph beginning “Lesson:”, with modest vertical separation and no box, icon, border, or heading. Ordinarily use one or two sentences after the evidence that earns the lesson. Convert existing conclusions rather than repeat them. Preserve material qualifications; these are lessons from experience, not universal laws or new named MAGE principles. Do not add them to the conceptual introduction or turn the chapter summary into a list of every lesson. Review the lessons alone for a coherent progression, then in context to ensure the narrative establishes each one.

### Chapter 5 — DocAble Among Other Software Factories

**Purpose and reader outcome.** Chapter 5 examines MAGE as a production system rather than as a collection of individual techniques. It develops the software-factory metaphor, describes DocAble’s engineered production environment, evaluates the product and its development, and compares the originating case with published accounts from other organizations. The reader should understand how models, agents, controls, processes, and infrastructure operate together; what evidence supports the claimed benefits; and which practices appear to generalize across different engineering organizations.

**Voice and organization.** This is an empirical engineering case analysis, written with the clarity of a technical case study and the interpretive skill of a good engineering historian. Concrete architecture, operational experience, measurements, and documented practices should carry the argument. The factory metaphor is an analytical lens: use it to explain the organization of production, division of work, accumulation of engineering knowledge, and control of output. Do not elaborate it merely for rhetorical effect, or anthropomorphize the factory as though it literally knows, judges, or decides. Distinguish observed facts, the author’s interpretations, and hypotheses about other organizations. Industrial accounts are comparisons, not independent confirmation of every MAGE claim. Preserve the texture of the originating case, including its limitations and imperfect outcomes. Avoid repetitive declarations that the factory carries engineering judgment; show the particular representations, procedures, and mechanisms through which prior decisions influence subsequent work.

### Chapter 6 — The Theory

**Purpose and reader outcome.** Chapter 6 abstracts the preceding engineering experience into an explanatory and predictive theory. It examines faithful production, the economics of engineering work, and cumulative progress through investment in the governed engineering environment. The reader should understand the mathematical relationships, their assumptions, and the conditions under which the theory predicts that MAGE will improve engineering outcomes. The chapter should also make clear what remains hypothetical and what evidence would be needed to test the predictions.

**Voice and organization.** This is the book’s mathematically densest chapter, but it must remain accessible to advanced undergraduates and practicing engineers whose mathematical training may be rusty. Use the patient exposition of a good engineering textbook: motivate each quantity, define it, derive the relationship, interpret it in ordinary language, and illustrate its consequences before proceeding. Equations should clarify the argument rather than substitute for explanation. Deliberate repetition across mathematical, verbal, and numerical representations is pedagogically useful; remove repetition only when it adds no understanding. Preserve transitions that explain why the next analytical step follows from the previous one. Distinguish identities, simplifying assumptions, empirical observations, and theoretical predictions. Avoid overstating the theory’s empirical validation, but also avoid hedging established mathematical consequences merely because their application depends on assumptions. Do not optimize this chapter for minimum length at the expense of comprehension.

### Chapter 7 — The Profession

**Purpose and reader outcome.** Chapter 7 considers the implications of MAGE for software engineering, other engineering disciplines, and the engineering profession. It examines how engineering work may reorganize, how model-based practice relates to earlier development methodologies, what transfers beyond software, and what expertise, authority, and responsibility mean when implementation can be delegated. The reader should finish with a more developed understanding of the engineer’s role, not merely another summary of MAGE’s mechanisms.

**Voice and organization.** This chapter is a collection of connected, intellectually serious essays rather than another methods chapter. Its voice should be reflective, argumentative, historically informed, and occasionally personal. Develop claims through reasoning, concrete examples, engagement with relevant literature, and consideration of objections. Strong topic sentences and carefully constructed transitions are especially important because the argument often moves between economics, methodology, education, and professional responsibility. Preserve memorable formulations, productive contrasts, and passages that invite readers to reconsider familiar assumptions. Do not mechanically replace distinctive prose with standardized technical language, turn arguments into checklists, or remove sentences merely because they revisit an earlier idea. Repetition is justified when an established principle acquires a new consequence; it is not justified when the same conclusion is simply restated. The chapter should sound like an experienced engineer thinking carefully about the future of the profession.

### Conclusion

**Purpose and reader outcome.** The Conclusion answers the question posed in the Preface: how can engineers safely grant autonomy to commodity intelligence? It gathers the book’s principal engineering moves into a final synthesis and identifies what remains the engineer’s responsibility. The reader should leave with a coherent understanding of MAGE and a memorable statement of its significance.

**Voice and organization.** Use concise, confident, reflective prose. The Conclusion may return to the language and framing of the Preface because this completes the book’s argument. Preserve the distinction between summarizing the method and delivering the final claim about engineering responsibility. Do not introduce new technical machinery or reopen arguments already settled. Avoid generic inspirational language, repeated summaries of Modeling and Alignment, and explanatory paragraphs that weaken a strong concluding sentence. The ending should feel earned rather than manufactured.

### Appendix A — MAGE Engineering Blueprints

**Purpose and reader outcome.** Appendix A is an engineering reference: readers should understand how to construct, evaluate, and adapt an arrangement analogous to the DocAble example. Explain the engineering decisions, representations, interfaces, failure mechanisms, and validation boundaries that another engineer must preserve. Repository archaeology supports technical accuracy and remains available in the ignored evidence archive; its incidental findings do not automatically belong in the published blueprint. Ask of each detail: what does another engineer need to know to make this class of decision?

**Voice and organization.** Use conventional technical writing, closer to a design-pattern catalogue or architecture reference than a repository report. Preserve the eight blueprints and their five-part structure: Problem, Conceptual Design, Engineering Models, Realization, and Adaptation and Limits. Use present tense for the construction and its behavior, identifying historical scope where it matters. Conceptual Design explains the arrangement and its rationale. Realization may use imperative construction and validation instructions. Adaptation and Limits explains where the design transfers, which assumptions must hold or change, and what the mechanisms do not guarantee. Expand compressed instructions when the reader otherwise must infer the engineering relationship. Do not mechanically eliminate imperative verbs: construction and verification procedures may use them. Revise sequences of disconnected instructions when explaining their causal relationships would better teach the design. Avoid repeated generic MAGE cautions and closing lists of obligations disguised as paragraphs.

**Selecting technical detail.** Preserve architectural figures, model inventories, worked examples, nontrivial algorithms, failure cases, and validation boundaries. Retain domain concepts and meaningful interface names; remove incidental helper, class, and test names from running prose. Code earns its place when its structure conveys a consequential policy or mechanism, such as conditional release or conservative test selection. Explain straightforward loops and simple result records in prose. Label simplified code as pseudocode. Preserve private evidence references beside retained case claims even when their source-level details leave the prose.

**Selecting evidence.** Retain a measurement when it demonstrates an engineering property, falsifies an assumption, or establishes a consequential limitation. Remove dates, fixture sizes, counts, and experimental precision that merely document a snapshot, while preserving the conclusion and the population or conditions needed to interpret it. Detailed comparative quality and cost evaluation generally belongs in Chapter 5; the blueprint explains how to construct and compare alternatives. A concrete operation, a failure or counterexample, and a scoped validation account are useful selection guides, not a mandatory quota. Recommendations must remain distinguishable from implemented behavior and observed results.

**Limits and length.** State a limitation when it affects construction, operation, verification, or adaptation of that blueprint. Preserve bypass risks, atomicity boundaries, result meanings, evaluator dependencies, and other conditions needed to keep the account true. Remove general qualifications already established elsewhere. Do not impose uniform blueprint lengths or a fixed page limit. Treat suggested reductions as editorial guidance, not a quota. Shorten repetition and incidental archaeology; retain the reasoning and technical detail needed for practical reuse.

### Appendix B — Practicing MAGE

**Purpose and reader outcome.** Appendix B is a compact practical guide to choosing, introducing, operating, and evaluating MAGE. The main chapters explain the method and its rationale; Appendix A explains how to construct particular mechanisms. Appendix B helps an engineer decide where to begin, how to recover and govern an existing system, how to supervise delegated work, and whether the investment is worthwhile. A reader should be able to consult one section independently and make a better engineering decision.

**Voice and organization.** Preserve the four practical questions and their sections: Getting Started, Brownfield Migration, Operating a GEE, and Measuring MAGE. Use direct, economical technical prose centered on decisions, alternatives, tradeoffs, evidence, and criteria for proceeding. Imperative instructions are appropriate for genuine procedures; explanatory passages should make the relationships and consequences clear. Describe operational choices and their costs rather than prescribing DocAble's particular arrangement universally.

**Selection and compression.** Preserve the principal tables, figures, work-order categories, and distinctions between historical records and current models, and between configured, executed, observed, and acted-upon checks. Let visual summaries carry their sequences; nearby prose should explain choices and failures rather than repeat every step. Retain examples when they expose a consequential choice, boundary, or failure. Refer to Appendix A for construction details and the main chapters for engineering episodes. Do not turn the appendix into an implementation diary or repeat dated operational detail merely because it exists in the evidence archive.

**Length and claims.** Keep the appendix concise enough for consultation without making it cryptic. Suggested page reductions guide editing, not a fixed quota. Remove repeated motivation, repeated metric definitions, and generic qualifications; preserve assumptions and limits that change a practical decision. Distinguish a configured check from its execution, an acknowledgment from repair, and reduced waiting or concurrency from reduced total work. Examples must not turn a proposed migration, test definition, or local practice into an observed universal result.

### Editorial Rule: Preserve Productive Development

Across all chapters, distinguish unproductive repetition from deliberate exposition. A topic sentence may restate an established idea to introduce a new consequence. A segue may recall an earlier distinction to connect two arguments. A worked example may repeat a principle while showing how it operates in a different setting. A mathematical explanation may present the same relationship verbally, symbolically, and numerically to support understanding. These are not redundancies merely because their vocabulary overlaps.

Before deleting or condensing a passage, identify its function in the local argument and ask what the reader would lose. Preserve sentences that establish the purpose of a paragraph, transitions that explain why the argument moves, and elaborations that contribute a new distinction, example, implication, or piece of evidence. Remove repetition when the same claim is made again without changing its meaning or advancing the reader’s understanding. Concision is a means of improving the book, not an independent objective.

---

# 11. Use insets as an optional second track

Use an inset when an established outside concept is needed at one point but some readers will already know it.

An inset should:

- answer one question;
- begin with plain intuition;
- use one concrete example;
- include only the formalism needed here;
- and let the reader rejoin the main argument.

The mainline must remain readable if the inset is skipped. An inset should ordinarily fit on one printed page, including its figures. Place extended worked examples and case evidence essential to the argument in the main text.

An inset belongs to the chapter's reading sequence. Its opening should pick up a concept, question, or difficulty in the preceding prose and make clear why the extra detail is useful here. Its closing should reconnect the explanation to the main argument. Provide both transitions: a return to the mainline at the end does not replace a segue into the inset.

Audit each inset with the prose immediately before and after it. Check both reading paths: entering the inset and skipping it. Track the later book-wide pass in [review.md](review.md).

In Chapter 4, retain useful named techniques as ordinary headings, enumerations, or
emphasized terms rather than green **MAGE Move** boxes. The engineering episode and
its evidence belong in the main narrative. Use a scholarly inset only where its
connection helps the reader understand that episode; place foundational explanations
in Chapters 2–3 and extended practical procedures in Appendix B.

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

For diagram fill and shading, follow the [drawing policy](../plugin/mage/skills/self-communicate/drawing/figures.md#fill-and-shading-meaning-before-decoration): white is the default; gray must carry meaning or useful emphasis. Audit comparable figures together and preserve local semantic encodings. The [Chapters 2–4 fill audit](editorial/figure-fill-audit-20261118.md) records the current baseline and targeted follow-up.


Before cutting or deferring substantive book prose, preserve it in the single
[cutting room floor](editorial/cutting-room-floor.md). Include the original text,
source path and section, source revision and line range, removal date/revision
when known, and the reason for setting it aside. Preserve citations and references.
The author will decide whether to reuse it elsewhere; archiving a passage does not
authorize relocating it into another chapter.

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

## Appendix terminology

The appendices apply the vocabulary established in the main chapters. Introduce a new term only when it names a genuinely new concept, not a renamed version of an existing distinction. Before naming such a concept, consider whether readers also need it in the main text; prefer introducing consequential concepts there, without treating this as mandatory relocation. Reuse established terms such as model coverage, evaluation, and enforcement, qualified by the relevant engineering question and scope. Do not invent additional coverage measures or maturity axes merely to organize practical guidance.
