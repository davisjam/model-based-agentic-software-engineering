# Cutting room floor

Substantive passages removed or deferred during MAGE book editing are preserved here for later author review. Their destination is undecided; setting them aside does not establish that they are incorrect or authorize inserting them elsewhere. This editorial file is outside the published manuscript.

Append future cuts to this same file before changing the manuscript. Record the source path, section, source revision and line range, removal date and revision when known, and reason for setting the passage aside. Preserve the original wording, citations, references, and qualifications. If material is later reused or discarded, record that decision alongside its entry.

## Preface cuts from 30 October 2026

- Source: `book/latex/sources/frontmatter/0.5-preface.tex`
- Source revision before editing: `6f9e6faa477c3712ad85b40671e3db6b66c37855`
- Removal revision: `5dfad34bee7049f9bf9c43e7cf9f28d4e61c3a4b`
- Status: set aside for later review; destination undecided.

### The MAGE Method

Provenance: source lines 122–126 at the revision above.

Reason: The Preface should introduce how Modeling and Alignment work together. The discussion of Alignment without explicit models, and the defense of Modeling as a methodological rather than logical prerequisite, was too subordinate for that introduction.

Excerpt scope: Three original paragraphs, replaced by one short bridge into the method cycle.

```latex
They solve different problems but interact. Alignment always assumes something about what an acceptable result looks like: what must hold, and sometimes what variation remains acceptable. That understanding may remain tacit or be encoded locally rather than written down as a model. A sandbox can forbid an action using a local rule rather than a separate system model; a test can block a regression by encoding expected behavior; a human reviewer can judge an obligation that no machine-readable model yet captures. But they have a limit: they can govern only what the environment can state, observe, or ask a person to reconstruct.

Modeling changes that boundary. By making consequential relationships explicit---structural, policy, behavioral, ownership, measurement, and others---Modeling lets humans, agents, and tools reason over them directly and apply analyses suited to those representations. Where those properties express obligations, Alignment can enforce them through governance mechanisms that consume the available evidence.

MAGE therefore places Modeling first as a methodological choice rather than a logical prerequisite. Relevant knowledge and intent may already be tacit or encoded locally; Modeling makes explicit only what is worth externalizing; it need not eliminate realization choices that engineering has reason to leave open. The method asks the engineer to externalize the abstractions that matter before repeatedly spending human attention on what the environment cannot see. Once those properties are explicit, some judgments that once required reconstruction can be handled by repeatable machinery.
```

### The new bottleneck

Provenance: source line 87 at the revision above.

Reason: Removed the early qualification about tests, sandboxes, types, and gates enforcing obligations without a separately represented model. The revised paragraph stays with the problem of reconstructing missing knowledge.

Excerpt scope: Original paragraph retained in full for context; much of its surrounding explanation remains in the Preface.

```latex
A fleet can generate, inspect, and modify implementation much faster than a human team. But more implementation capacity does not automatically produce more system-level understanding or better engineering judgment. When the necessary knowledge remains implicit, the fleet repeatedly reconstructs it. When an obligation is locally checkable, a test, sandbox, type, or gate may enforce it without a separately represented model. But when the obligation depends on architecture, ownership, end-to-end behavior, or another model the environment lacks, somebody must supply the missing meaning. In many organizations that somebody is still a human reviewer. The result can work, but the human sits in the gap between what the environment can check and what the system actually needs guaranteed.
```

### Evidence and scope

Provenance: source line 107 at the revision above.

Reason: Set aside the comparison between systems relying more heavily on explicit models and systems relying more heavily on controls and human judgment. The Preface now describes the variation in organizational choices without developing that distinction.

Excerpt scope: Original paragraph retained in full for context; the two-source evidence account remains in the Preface.

```latex
MAGE draws on two kinds of evidence. The first is a single longitudinal case: one production system, built by one engineer using one vendor\textquotesingle s agent ecosystem over several months and used in production by me and my colleagues at Purdue. Numbers from that case are observations, not measured laws. The second is a set of reconstructions based on independent industrial accounts. Those accounts show less of how each system evolved, but more variation in technical and organizational choices, including systems that rely more heavily on explicit models and systems that rely more heavily on controls and human judgment. \magevalue{chapter:software-factories} presents both sources, states their limits, and ties empirical claims to supporting data or citations.
```

## Chapter 1 delegation passage from 30 October 2026

- Source: `book/latex/sources/part1/1.1-the-printer.tex`
- Section: §1.1, The Printer, opening discussion of implementation and delegation.
- Source revision before editing: `1f31538eb41fdb0aac202e8fda6f3df10581545e`
- Source line: 30.
- Removal date: 2026-10-30.
- Removal revision: the commit introducing this archive entry and the approved replacement paragraph.
- Status: set aside for later review; destination undecided.

Reason: Replaced with the author's approved explanation of delegating judgment as an opportunity rather than a requirement. Responsibility and engineering control remain established in the Preface and surrounding discussion.

Excerpt scope: The complete original paragraph, preserved before replacement.

```latex
Engineers can delegate increasing amounts of implementation while remaining responsible for the resulting system. The engineering problem is not how to keep humans performing work that machines can perform. It is how to delegate that work without surrendering the control required to understand, direct, evaluate, and change the resulting system.
```

## Chapter 1 repeated engineering-object paragraph from 2 November 2026

- Source: `book/latex/sources/part1/1.1-the-printer.tex`
- Section: §1.1, The Printer, “The Engineering Object.”
- Source revision before editing: `d0a9332fdfe2094ac2ec272e84db96f4619b693a`
- Source lines: 61–63.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved deletion.
- Review item: `s11-repeated-engineering-object`, approved by the author.
- Status: set aside for later review; destination undecided.

Reason: The preceding environment discussion and definition already explain what engineers design. Remove the immediate repetition so the discussion of the durable engineering problem leads directly into MAGE’s focus.

Excerpt scope: The complete paragraph and its point annotation, preserved before removal.

```latex
% <!-- point: the-object-of-engineering-expands-beyond-implementation | The object of engineering expands beyond the implementation to the environment through which autonomous work proceeds: what the agent can know, what it may do, what evidence it must produce, and which obligations the environment will enforce. | terms: commodity-intelligence -->

The object of engineering therefore expands beyond the implementation. Engineers also design the environment through which autonomous work proceeds: what the agent can know, what it may do, what evidence it must produce, and which obligations the environment will enforce.
```

## Chapter 1 printer analogy from 2 November 2026

- Source: `book/latex/sources/part1/1.1-the-printer.tex`
- Section: §1.1, The Printer, opening analogy.
- Source revision before editing: `e4ab374ea326fa73604ed623f336fee00b112158`
- Source lines: 18–26.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved replacement.
- Review item: `s11-printer-analogy`, approved by the author.
- Status: set aside for later review; destination undecided.

Reason: Replace the original passage with the approved office-supplies and 2D/3D printer analogy. The new passage defines fabricative capacity, explains the forms and ways of working people develop around it, and introduces the freedom that agents' inference permits. The detailed discussion of fabrication constraints and acceptance evidence is deferred.

Excerpt scope: The three original paragraphs and their intervening point annotations, preserved in full. The fabricative footnote remains unchanged in the replacement; its text is retained here as part of the original source.

```latex
Printers provide a useful analogy. A stapler is a specific-purpose technology: it performs a narrow operation over artifacts that already exist. A printer is different. A 2D printer realizes documents from descriptions of their contents; a 3D printer realizes physical artifacts from descriptions of their geometry. Both are fabricative (open-ended): the same machine can realize an enormous variety of artifacts from descriptions of what should be made.\magefootnote{fabricative}{I use \emph{fabricative} (open-ended) for a productive technology whose useful output classes are not fixed by the machine itself. The capability arrives before the engineering conventions for exploiting it. New artifact types, representations, interfaces, constraints, and operating practices are discovered as people learn what the technology is useful for. Writing and general-purpose computation offer earlier examples; commodity generative intelligence adds a similarly broad realization substrate to engineering.} Coding agents are fabricative in this sense. They can realize many different software artifacts from engineering intent rather than merely perform one predetermined transformation. Fabricative capacity does not tell the engineer which object to make, what properties that object must satisfy, or which representation is adequate for realizing those properties.

% <!-- point: open-ended-capacity-must-be-engineered | Open-ended capability must itself be engineered to use reliably. | terms: printer-metaphor, commodity-intelligence -->

That is the useful resemblance to commodity intelligence. A coding agent supplies broad realization capacity without supplying the engineering discipline for using it. The engineer must still decide which distinctions matter, what must be represented explicitly, which choices may remain open, and which boundaries the productive machinery may not cross. Open-ended capability therefore creates a second design problem: engineers must also design the forms, types, interfaces, constraints, and evidence through which that capability can be used reliably.

% <!-- point: intent-is-not-fabrication-instructions | Intent is not the same as fabrication instructions. | terms: printer-metaphor -->

A 3D printer also makes clear that intent is not the same thing as fabrication instructions. A photograph can communicate the desired appearance of a part without specifying its internal geometry, material, tolerances, load paths, or allowable joints. The machine needs a representation adequate to the properties the part must have, together with constraints on how realization may proceed. Software agents can infer much more from an incomplete description than a physical printer can; that inferential capacity is precisely what makes the machinery powerful, but inference remains different from an engineered guarantee. The engineering problem is still to make important engineering intent available to the machinery in a form that can guide and govern realization.
```

## Chapter 1 environment bridge from 2 November 2026

- Source: `book/latex/sources/part1/1.1-the-printer.tex`
- Section: §1.1, The Printer, engineering leverage and the environment.
- Source revision before editing: `846057bdf2bf39f25a792cc452f8fec2a3e0451f`
- Source lines: 42–46.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved replacement.
- Review item: `s11-environment-bridge`, approved by the author.
- Status: set aside for later review; destination undecided.

Reason: Replace the original bridge with the approved account of decisions carried through the engineering environment. Qualify the reference to the Preface's level of indirection, and explain repeated benefit through reusable 2D layouts and 3D designs. Defer the software-specific examples until their mechanisms have been introduced.

Excerpt scope: Both original paragraphs and their intervening point annotation, including the figure reference.

```latex
When agents perform the implementation, more of the engineer\textquotesingle s control must act through the engineered environment. This is the level of indirection introduced in the Preface. Instead of expressing engineering intent primarily by writing the implementation, the engineer designs an environment through which autonomous implementation proceeds. That indirection creates a new engineering surface: representations can carry consequential knowledge, mechanisms can enforce obligations, and agents can remain free to choose among implementations that satisfy them. \autoref{engineering-leverage} shows the shift.

% <!-- point: gee-is-the-engineered-instruction-set | The governed environment is the printer's engineered instruction set. | terms: printer-metaphor -->

In the printer metaphor, the governed engineering environment is the engineered instruction set around the productive machinery: the representations that tell it what matters, the boundaries that constrain realization, and the evidence used to decide whether the result is acceptable. Some of that environment helps the agent reason better; other parts remove selected judgments from the agent\textquotesingle s discretion altogether.
```

## Chapter 1 MAGE definition from 2 November 2026

- Source: `book/latex/sources/part1/1.1-the-printer.tex`
- Section: §1.1, The Printer, “The Engineering Object.”
- Source revision before editing: `6e3334180762924949507c638d1deec7dc859f7a`
- Source lines: 63–65.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved replacement.
- Review item: `11-definition`, approved by the author.
- Status: set aside for later review; destination undecided.

Reason: Replace the indirect account of MAGE's focus with the approved definition of MAGE as an engineering methodology. The new paragraph explains decisions that persist across tasks and the spectrum of delegated judgment, potential leverage, and risk.

Excerpt scope: The original paragraph and its point annotation, preserved in full.

```latex
% <!-- point: mage-is-about-that-environment | MAGE is principally about that environment; the method lies in the representations agents and engineers reason through, the mechanisms that enforce obligations, and the judgment that decides what should become durable engineering structure. | terms: commodity-intelligence -->

MAGE is principally about that environment. We will get to foundation models, harnesses, tools, hooks, skills, and workflows because their properties determine what can be engineered around them. But the method lies in how engineers represent what matters, how they enforce obligations, and how they decide which recurring judgments should become durable engineering structure.
```

## Chapter 1 related-work inventory from 2 November 2026

- Source: `book/latex/sources/part1/1.1-the-printer.tex`
- Section: §1.1, The Printer, antecedents of the engineering-environment approach.
- Source revision before editing: `8e385f13942fd20fbb04b39be91cff646bdb7d65`
- Source line: 83.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved replacement.
- Review item: `s11-related-work`, approved by the author.
- Status: set aside; Chapter 7 editorial follow-up remains open.

Reason: Retain a short acknowledgment and forward reference in Chapter 1, deferring the detailed literature inventory until the reader has learned the engineering argument. Preserve the full original paragraph and all seven citations below.

### Chapter 7 follow-up

- [ ] Revisit §7.1 (`book/latex/sources/part7/7.1-reorganization-of-se.tex`) and decide how this literature inventory should be developed there: check the depth, placement, and explanation of each work's relationship to MAGE, including the distinction between improving individual implementation tasks and engineering an environment that carries knowledge and obligations across changes.

The seven citation keys are `besta2024got` (external representations), `packer2023memgpt` (managed memory), `liu2023llmp` (specialized solvers), `zhang2023repocoder` (repository retrieval), `zhang2024autocoderover` (program analysis), `yang2024sweagent` (interfaces for autonomous work), and `rich-waters` (earlier ambitions). All seven already occur in §7.1 at source revision `8e385f13942fd20fbb04b39be91cff646bdb7d65`, verified on 2026-11-02. Their presence does not close this follow-up: the author requested an editorial revisit of their treatment. No new Chapter 7 prose has been inserted as part of this cut.

Excerpt scope: The complete original paragraph, including every citation and the Chapter 7 cross-reference.

```latex
That emphasis has important antecedents. AI research has long improved machine reasoning by giving systems access to external representations,\citep{besta2024got} managed memory,\citep{packer2023memgpt} and specialized solvers.\citep{liu2023llmp} Recent agentic software-engineering research extends this approach through repository retrieval,\citep{zhang2023repocoder} program analysis,\citep{zhang2024autocoderover} and interfaces designed for autonomous work.\citep{yang2024sweagent} The ambition predates foundation models.\citep{rich-waters} \magevalue{chapter:profession} returns to these traditions and to what commodity intelligence changes. The distinction lies in the engineering objective: MAGE shifts the primary engineering focus from individual implementation tasks to the engineered environment through which autonomous software work proceeds over time, including the representations and controls that govern its results.
```

## Chapter 1 Java example from 2 November 2026

- Source: `book/latex/sources/part1/1.1-the-printer.tex`
- Section: §1.1, The Printer, The Engineering Object.
- Source revision before editing: `48d2eb38134cdfcddd13d46aacea77a7297b55b6`
- Source line: 75.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved replacement.
- Review item: `s11-java-example`, approved by the author.
- Status: original preserved; replaced by the approved developed example.

Reason: Introduce authoring fluency and ease of human review or audit together, then distinguish how delegation can weaken the former and strengthen the latter. Retain the language-property and deployment considerations and give the former a concrete garbage-collection example.

Excerpt scope: The complete original paragraph.

```latex
Commodity intelligence can also change which traditional engineering choices remain consequential. Consider the choice of a programming language. A human team might once have chosen Java over another suitable language simply because its developers already knew Java. If an agent can implement competently in either language, that constraint largely disappears: some language still has to be chosen, but the particular choice may no longer deserve much engineering attention. Other language choices remain consequential. A deployment target may require a particular toolchain, or a safety requirement may favor a language that provides a needed property. The relevant question is therefore not whether engineers have traditionally made a choice, but what property made the choice consequential.
```

## Chapter 1 failure diagnosis from 2 November 2026

- Source: `book/latex/sources/part1/1.1-the-printer.tex`
- Section: §1.1, The Printer, Examine the Environment First.
- Source revision before editing: `43d71912a18af1b31ab48ebbd9de5b226be4a337`
- Source lines: 89–103.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved replacement.
- Review item: `s11-failure-diagnosis`, approved by the author.
- Status: original preserved; replaced by the approved wording.

Reason: Open with the approved craftsman aphorism and direct attention to the engineer’s work. Preserve the distinction between productive machinery and the engineering supplied to it, explain how agent inference blurs that distinction, and retain the acknowledgment of genuine capability limits.

Excerpt scope: The complete original source span, including any point annotations.

```latex
% <!-- point: suspect-the-engineered-setup-before-a-machine-limit | When an agent fails, examine its engineering environment before concluding that the foundation model lacks the necessary capability. | terms: whose-fault -->

When an agent fails, examine its engineering environment before concluding that the foundation model lacks the necessary capability. Observed performance is a property of the whole arrangement, not just the productive machinery.

% <!-- point: a-failed-part-has-several-diagnoses | A failed part can reveal several different problems. | terms: whose-fault -->

A 3D printer separates productive capability from the instructions that condition it. A photograph may show what an object should look like, but appearance does not specify internal structure, material, tolerances, load paths, or fabrication constraints. A failed part can therefore reveal several different problems: the machine lacked capability; the model omitted a consequential property; the chosen material could not satisfy it; or the fabrication instructions permitted a realization that should have been ruled out.

% <!-- point: inferred-completion-is-not-explicit | Inferred completion is not an explicit specification. | terms: whose-fault, build-instructions -->

Software agents blur this distinction because they can infer missing structure. A capable agent may produce an impressive result from a screenshot, prose request, or incomplete specification. But inferred completion is not an explicit statement of which properties must hold, which tradeoffs are acceptable, or what evidence establishes acceptance.

% <!-- point: inspect-what-the-engineer-controlled-first | When an agent produces the wrong result, inspect first what the engineer controlled — instructions, representation, task boundary, tools, evidence; failed output alone does not establish that the foundation model lacks the capability. | terms: whose-fault, build-instructions -->

When an agent produces the wrong result, inspect first what the engineer controlled: the instructions, the representation of the problem, the task boundary, the available tools, and the evidence the work was required to satisfy. Sometimes the foundation model simply lacks the necessary capability. Failed output alone does not establish that diagnosis.
```

## Chapter 1 fabricative footnote from 2 November 2026

- Source: `book/latex/sources/part1/1.1-the-printer.tex`
- Section: §1.1, The Printer, fabricative terminology footnote.
- Source revision before editing: `43d71912a18af1b31ab48ebbd9de5b226be4a337`
- Source lines: 20–20.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved replacement.
- Review item: `s11-fabricative-footnote`, approved by the author.
- Status: original preserved; replaced by the approved wording.

Reason: Keep the approved concise definition in the introduction. Set aside the broader historical argument about writing, general-purpose computation, and the discovery of engineering conventions for possible later reuse.

Excerpt scope: The complete original source span, including any point annotations.

```latex
\magefootnote{fabricative}{I use \emph{fabricative} (open-ended) for a productive technology whose useful output classes are not fixed by the machine itself. The capability arrives before the engineering conventions for exploiting it. New artifact types, representations, interfaces, constraints, and operating practices are discovered as people learn what the technology is useful for. Writing and general-purpose computation offer earlier examples; commodity generative intelligence adds a similarly broad realization substrate to engineering.}
```

## Chapter 1 DocAble introduction from 2 November 2026

- Source: `book/latex/sources/part1/1.2-mage-by-example.tex`
- Section: §1.2, MAGE by Example, opening paragraph.
- Source revision before editing: `5d54a8032817d2829b0f04d454ca0c8fd87d353b`
- Source line: 17.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved replacement.
- Review item: `s12-distinguish-two-roles`, approved by the author.
- Status: original preserved; replaced by the approved wording.

Reason: Retain the focus on DocAble as a production system built largely through coding agents. Replace the comparative “deepest worked example” with “running case study” and simplify the Chapter 5 transition without foreshadowing models and Alignment mechanisms.

Excerpt scope: The complete original paragraph, including its link and Chapter 5 cross-reference.

```latex
\href{\%7B\%7Bproduct_url\%7D\%7D}{DocAble} provides the book\textquotesingle s deepest worked example: a production accessibility system built largely through coding agents. \magevalue{chapter:software-factories} presents the full case study; before examining its models and Alignment mechanisms here, a few facts about the system are in order.
```

## Chapter 1 accessibility and manual-remediation framing from 2 November 2026

- Source: `book/latex/sources/part1/1.2-mage-by-example.tex`
- Section: §1.2, MAGE by Example, Accessibility and the Engineering Experiment.
- Source revision before editing: `7ad5d1d0b4e4dfea9615112094640da31b681103`
- Source line: 25.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved replacement.
- Review items: `s12-remediation-scale` and its paired `s12-recovery-footnote` removal, approved by the author.
- Status: original paragraph and footnote preserved; replaced by the approved two-paragraph introduction.

Reason: Explain WCAG’s perceivable and operable principles before listing example failures. Give manual remediation its own paragraph, focused on slow, costly work: total billed hours, materials for 20 courses against thousands offered, a coarse three-hour per-document estimate, and variation by document complexity. Preserve the original corpus-accounting details and qualification here; the introduction no longer uses that footnote.

Excerpt scope: The complete original paragraph, including the embedded recovery footnote, metric references, and citation.

```latex
In 2024, the U.S. Department of Justice gave public universities a deadline to make their digital content accessible, measured against the Web Content Accessibility Guidelines (\magevalue{doj_technical_standard}). A typical slide deck can fail the standard in dozens of ways: images without descriptions, missing titles, or a reading order that a screen reader cannot follow. Purdue's manual remediation effort made the scale of the work concrete. Over approximately six months, \magevalue{seip_uta_workers} trained undergraduate teaching assistants billed \magevalue{seip_uta_hours} hours; the resulting corpus contained \magevalue{seip_uta_pairs} identifiable before-and-after document pairs from \magevalue{seip_uta_courses} courses. That is about \magevalue{seip_uta_hours_per_pair} billed hours per identifiable pair.\footnote{The recovered pairs need not account for every document the students worked on. This corpus-level ratio is not a measured remediation time for each document.}\citep{davis2026docable}
```

## Chapter 1 DocAble roadmap from 2 November 2026

- Source: `book/latex/sources/part1/1.2-mage-by-example.tex`
- Section: §1.2, MAGE by Example, How the Book Uses DocAble.
- Source revision before editing: `215b76d1b844e71ad7feef2973042d478ea146db`
- Source lines: 185–203.
- Removal date: 2026-11-02.
- Removal revision: the commit introducing this archive entry and the approved replacement.
- Review item: `s12-docable-roadmap`, approved by the author with a Chapter 4 sentence added.
- Status: original preserved; replaced by the approved concise roadmap.

Reason: Preserve the common case study’s distinct roles across Chapters 2–5, including how Chapter 4 follows the use and revision of models and controls during development, then transition to the agentic machinery in §1.3. Set aside the longer roadmap and comparative framing.

Excerpt scope: The complete original subsection, including its heading, cross-references, section terms, and point annotations.

```latex
\section{How the Book Uses DocAble}\label{heading:how-the-book-uses-docable}

% <!-- section-terms: running-example -->

% <!-- point: docable-shown-at-method-resolution | DocAble is the book's deepest worked example because its engineering can be shown at the resolution the method requires; Chapter 2 asks which representations make properties tractable, Chapter 3 how intent comes to bind the work. | terms: running-example, modeling-principle, alignment-principle -->

DocAble is the book\textquotesingle s deepest worked example because the system can be examined at the resolution the method requires. Chapters \magevalue{chapter:modeling|num} and \magevalue{chapter:alignment|num} use the working system to ask two different kinds of questions. \magevalue{chapter:modeling} asks which representations make important system properties tractable. \magevalue{chapter:alignment} asks how engineering intent comes to bind the work.

% <!-- point: motion-then-the-production-system | Chapter 4 examines how those mechanisms are used during development, following engineering problems through successive models, decisions, implementation, and governance conversion; Chapter 5 then examines the production system itself — what failed, what those failures revealed, and how recurring judgments became durable engineering structure. | terms: running-example -->

\magevalue{chapter:one-problem-many-models} examines how those mechanisms are used during development. It follows engineering problems through successive models, decisions, implementation, and governance conversion, showing how Modeling and Alignment change as the system changes. \magevalue{chapter:software-factories} then examines the production system itself: what failed, what those failures revealed, and how recurring judgments became models, controls, and other durable engineering structure.

% <!-- point: docable-is-depth-not-the-whole-evidence | DocAble is the primary case study; Chapter 5 examines practices at other engineering organizations, identifying where related structures recur, where they take different forms, and where the evidence supports a more limited interpretation. | terms: running-example -->

DocAble is the primary case study. \magevalue{chapter:software-factories} examines practices at other engineering organizations, identifying where related structures recur, where they take different forms, and where the available evidence supports more limited conclusions.

% <!-- point: bridge-to-the-substrate | We can now examine the machinery that makes autonomous implementation possible and the engineering mechanisms through which MAGE acts on it. | terms: running-example -->

We can now examine the machinery that makes autonomous implementation possible and the engineering mechanisms through which MAGE acts on it.
```

### Roadmap authorship correction, 2 November 2026

Source: `book/latex/sources/part1/1.2-mage-by-example.tex`, §1.2, line 191, revision `0fff0effd1aabeb85ed7554da46b45f7497304a0`. The author corrected the Chapter 4 sentence to first person: this case study concerns his work as a single engineer. Removed in the commit introducing this note; only the replaced sentence is preserved below.

```latex
\magevalue{chapter:one-problem-many-models} follows how engineers use and revise those models and controls as the system evolves.
```


## Harness and engineered environment definitions, 2 November 2026

The author approved review item `13-substrate`: retain the textbook explanation of inexpensive reasoning, define harness facilities separately from their engineering use, and bold the defined terms. The glossary now develops the environment distinction within the GEE entry. Removed in the commit introducing this note.

### §1.3, Foundation Model and Agentic Harness

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, revision `a3385492a357c8681cefb8d0605925cb0fdb1ac7`, lines 22–30.

```latex
\section{Foundation Model and Agentic Harness}\label{heading:foundation-model-and-agentic-harness}

% <!-- section-terms: engineering-substrate, foundation-model, agentic-harness -->

% <!-- point: model-plus-harness-form-a-new-engineering-substrate | A foundation model supplies broad inexpensive semantic reasoning; an agentic harness turns it into action, manages the working context, and exposes points where the work can be observed or constrained — the useful unit is the pair inside an engineered environment. | terms: engineering-substrate, foundation-model, agentic-harness -->

% <!-- index-def: engineering-substrate -->

A foundation model makes broad semantic reasoning available at a marginal cost far below the skilled human labor that many such tasks previously required. Of course, training a frontier model can require billions of dollars in capital, data, and computation---but using an already-trained model for one additional reasoning task is comparatively cheap. An agentic harness---the runtime around it---turns that reasoning into action, manages the working context available to it, and exposes points where the resulting work can be observed or constrained. The useful engineering unit is therefore not the foundation model alone, but the foundation model and harness operating inside an engineered environment.
```

### Glossary, Agentic harness

Source: `book/latex/sources/frontmatter/0.4-the-books-language.tex`, revision `a3385492a357c8681cefb8d0605925cb0fdb1ac7`, lines 79–79.

```latex
\textbf{Agentic harness.} The runtime wrapped around the foundation model --- Claude Code, OpenCode, and their kin --- that feeds it prompts, manages the context window, and provides hooks, skills, and tools.
```

### Glossary, Governed Engineering Environment

Source: `book/latex/sources/frontmatter/0.4-the-books-language.tex`, revision `a3385492a357c8681cefb8d0605925cb0fdb1ac7`, lines 97–97.

```latex
\textbf{Governed Engineering Environment.} An engineered environment where selected engineering obligations are enforced by durable mechanisms instead of relying mainly on people to remember or inspect them. Explicit models let those mechanisms govern properties that would otherwise require a person to reconstruct or judge them.
```


## Representation argument set aside from the horizon proposal, 2 November 2026

The author asked to set aside the representation-strength argument from review item `13-horizon`. At this point the reader is learning why human working memory and agent context are limited and what a reasoning horizon means; the dependency-graph and state-machine argument starts teaching the response before the problem has been established. Reconsider with the Modeling treatment later. This note does not authorize insertion elsewhere.

**Status:** removed from the review proposal on 2 November 2026, then from the manuscript in the later system-level horizon landing on the same day. The author approved the definition and citation-backed introduction. This archive preserves the preceding manuscript passage and the unlanded proposed replacement; neither has been relocated.

### Existing manuscript passage

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, §1.3, “The Reasoning Horizon,” revision `8d0fcac70aa2c7cadb607b75c5d75791d1e64089`, lines 101–103.

```latex
% <!-- point: the-horizon-is-a-locality-problem-for-reasoning-state | The reasoning horizon is a locality problem: systems keep useful state close to the computation that consumes it, and purposeful representations apply the same principle semantically — a dependency graph or state machine answers a question that retrieved source lines merely make available. | terms: reasoning-horizon, engineering-substrate -->

This is a locality problem for reasoning state. Systems have long dealt with finite working sets by keeping useful state close to the computation that consumes it rather than making all state equally immediate. Purposeful representations apply the same principle semantically. A dependency graph can answer a question that thousands of retrieved source lines merely make available; a state machine can expose a behavioral property that additional context leaves implicit. Better representations reduce the amount of state that must be reconstructed for a particular engineering question.
```

### Unlanded review replacement

Source: `13-horizon`, `mage-introduction-review/proposed-replacements.json`, the proposal saved immediately before this cut in `proposal-history-2026-11-02-horizon-representation-cut.json`. Removed from the proposed replacement, not from the manuscript.

```markdown
Representation determines how much of that information must be reconstructed. A dependency graph can expose a relationship that would otherwise have to be recovered from thousands of source lines; a state machine can make a behavioral question explicit. The reasoner still has to answer the engineering question, but it need not first rebuild every relevant relationship from implementation. Poor representations impose that work repeatedly and risk losing distinctions that later decisions need.
```


## System-level reasoning horizon, 2 November 2026

The author approved defining the horizon as the practical limit of the reasoner and its supporting machinery, adding research citations in §1.3, and correcting the glossary. The task imposes demands; the system has a horizon. The excerpts below preserve the superseded prose and vocabulary. Removed in the commit introducing this note. The earlier representation-strength passage remains set aside for possible later reuse, not relocated.

### book/latex/sources/part1/1.3-the-agentic-substrate.tex

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, revision `c15b945d681028c06fcbc090aca79688486a9703`, lines 85–109.

```latex
% <!-- point: scale-creates-the-reasoning-problem-before-an-agent-enters | Scale creates a reasoning problem before an agent enters; a long engineering task is a sequence of related decisions whose required state grows while the active state available to the reasoner stays finite. | terms: long-horizon-task, context-window -->

% <!-- index-def: long-horizon-task -->

Scale creates a reasoning problem before an agent ever enters the picture. A sufficiently large software system exceeds what one engineer can keep actively in mind; agentic work inherits the same condition. A long engineering task is not a prompt and an answer but a sequence of related decisions: read the system, form a plan, make a change, inspect the result, reconcile what changed, and carry consequential earlier decisions into later work. The state required by that work grows while the active state available to the reasoner remains finite.

% <!-- point: once-a-task-exceeds-active-state-question-relevant-state-must-be-reconstructed | Once a task exceeds active state, some information must live elsewhere and be recovered; poor reconstruction re-solves solved questions and contradicts constraints, so the problem is how much question-relevant state must be reconstructed for the next judgment. | terms: reasoning-horizon, churn -->

Once a task exceeds that active state, some consequential information must live elsewhere and be recovered when needed. If the reasoner repeatedly reconstructs its picture from raw implementation, loose notes, or lossy summaries, relevant decisions compete with irrelevant detail. Solved questions are re-solved, earlier constraints are contradicted, and system structure has to be rediscovered. The problem is therefore not merely how much information can be stored or retrieved, but how much question-relevant state must be reconstructed for the next engineering judgment.

% <!-- point: availability-is-not-a-useful-representation | Harnesses move the boundary by expanding or better managing working state, but availability is not a useful representation — usable context falls short of nominal capacity and present state is not equally accessible, and raw implementation is an expensive substrate when the question depends on a smaller set of relationships. | terms: reasoning-horizon, context-window -->

Agent harnesses can move this boundary by expanding or better managing the working state available to the reasoner. But making more information available is not the same as providing a useful representation. Empirical work on long-context language models shows both limits. Usable context can fall well short of nominal capacity, and information already present in the context is not uniformly accessible.\citep{hsieh2024ruler}\citep{liu2024lostmiddle} Greater model capability can move these boundaries; it does not make finite working state disappear.

Repository-scale studies report the same problem operationally: as the relevant state spreads across a larger codebase, navigation and reconstruction consume an increasing share of the work.\citep{sourcegraph2026largecodebase} The precise boundary depends on the model, harness, repository, and task.

% <!-- point: the-horizon-is-a-locality-problem-for-reasoning-state | The reasoning horizon is a locality problem: systems keep useful state close to the computation that consumes it, and purposeful representations apply the same principle semantically — a dependency graph or state machine answers a question that retrieved source lines merely make available. | terms: reasoning-horizon, engineering-substrate -->

This is a locality problem for reasoning state. Systems have long dealt with finite working sets by keeping useful state close to the computation that consumes it rather than making all state equally immediate. Purposeful representations apply the same principle semantically. A dependency graph can answer a question that thousands of retrieved source lines merely make available; a state machine can expose a behavioral property that additional context leaves implicit. Better representations reduce the amount of state that must be reconstructed for a particular engineering question.

% <!-- point: the-reasoning-horizon-defined | The reasoning horizon is the boundary beyond which consequential state can no longer be carried in active reasoning and must be reconstructed; larger windows, stronger reasoners, retrieval, and memory move it, and Modeling moves it differently by changing the representation over which reasoning occurs. | terms: reasoning-horizon, context-window -->

% <!-- index-def: reasoning-horizon -->

The \textbf{reasoning horizon} is the boundary beyond which consequential state can no longer be carried effectively in active reasoning and must instead be recovered or reconstructed. Larger context windows, stronger reasoners, retrieval, and memory can move that boundary. Modeling can move it differently, by changing the representation over which reasoning occurs. It does not make the reasoner unbounded; it makes selected engineering questions require less reconstructed state. \autoref{reasoning-horizon-fig} shows the mechanism.
```

### book/latex/sources/frontmatter/0.4-the-books-language.tex

Source: `book/latex/sources/frontmatter/0.4-the-books-language.tex`, revision `c15b945d681028c06fcbc090aca79688486a9703`, lines 70–70.

```latex
\caption{The agent stack and a characteristic failure mode. When a task\textquotesingle s reasoning horizon exceeds the working state the harness can keep active, repeated reconstruction contributes to churn.}
```

### book/latex/sources/frontmatter/0.4-the-books-language.tex

Source: `book/latex/sources/frontmatter/0.4-the-books-language.tex`, revision `c15b945d681028c06fcbc090aca79688486a9703`, lines 85–85.

```latex
\textbf{Reasoning horizon.} The amount of intermediate reasoning state that must remain available at once to carry a task to a correct result. It is a property of the task, not of who reasons --- human, agent, or a later architecture. A \emph{long-horizon task} needs more reasoning state than the available working memory can hold, forcing some state to be compressed and later reconstructed. Agent harnesses call this compaction; today, the context window is one important source of the limit.
```

### book/data/definitions.json

Source: `book/data/definitions.json`, revision `c15b945d681028c06fcbc090aca79688486a9703`.

```json
{
  "reasoning-horizon": {
    "term": "Reasoning horizon",
    "box": "The amount of intermediate reasoning state a task requires you to hold at once to carry it to a correct result — a property of the task, not of who reasons, whether a human, an agent, or a later architecture.",
    "aspects": [
      {
        "lead": "The axis the task modes fork on",
        "text": "One-shot scripting sits at a short horizon: the whole transaction fits in one context window and one sitting. Supervised autonomy is for a long horizon: the reasoning state outruns the working memory that must hold it. Writing a shell script, proving a theorem, debugging a deadlock, and re-architecting a subsystem sit at very different points on it."
      },
      {
        "lead": "Why the constraint is capacity, not a token buffer",
        "text": "A context window instantiates the limit today, but the horizon is architecture-independent: a longer window, a new memory architecture, or a post-transformer system each moves the wall without removing it, because a finite reasoner still has a finite reasoning horizon. This is offered as an analytic generalization for the reader to test, not a measured law."
      }
    ],
    "site_home": "N/A",
    "derived_from": "book/part1/1.3-the-agentic-substrate.md#reasoning-horizon",
    "book_home": "reasoning-horizon#idx-def-reasoning-horizon",
    "book_home_owed": {
      "section": "Chapter 1 — §1.3 The Reasoning Horizon",
      "status": "landed",
      "note": "Landed: the term's index-def anchor lives in §1.3 The Reasoning Horizon, the chapter that develops it (relocated from §1.1 when the Task-Mode fork moved to Chapter 4 §4.1). Book-only by design; the modeling-principle reframe (§1.4) is where the causal chain it names is worked out."
    },
    "lexicon_link": "the-books-language",
    "concepts_link": "book/data/concepts.json"
  },
  "long-horizon-task": {
    "term": "Long-horizon task",
    "box": "A task whose required intermediate reasoning state cannot be held losslessly within the available working memory, so completing it forces compression and reconstruction of that state, at some cost in fidelity.",
    "aspects": [
      {
        "lead": "Why the lossy round trip matters",
        "text": "When the state will not fit, the reasoner must compress it and rebuild it later, and every lossy round trip degrades the reasoning it stands in for. That degradation is what surfaces as churn — effort spent rebuilding a picture the reasoner keeps losing rather than advancing the system."
      },
      {
        "lead": "The task class supervised autonomy is for",
        "text": "A long-horizon task is the downward branch of the task-mode fork: too large to hold in a single context window or trust to a single pass. It is why the book spends its weight on supervised autonomy — the method that supplies correctness conditions, tools, and monitoring rather than hoping a single pass lands."
      }
    ],
    "site_home": "N/A",
    "derived_from": "book/part1/1.3-the-agentic-substrate.md#long-horizon-task",
    "book_home": "reasoning-horizon#idx-def-long-horizon-task",
    "book_home_owed": {
      "section": "Chapter 1 — §1.3 The Reasoning Horizon",
      "status": "landed",
      "note": "Landed: the term's index-def anchor lives in §1.3 The Reasoning Horizon, its defining chapter, alongside reasoning horizon (relocated from §1.1 when the Task-Mode fork moved to Chapter 4 §4.1). Book-only by design."
    },
    "lexicon_link": "the-books-language",
    "concepts_link": "book/data/concepts.json"
  }
}
```

### Internal authoring rule

Source: `book/AGENTS.md`, “Reasoning horizon,” revision `c15b945d681028c06fcbc090aca79688486a9703`, lines 85–89. Replaced with the same system-level definition and an explicit task-demand distinction.

```markdown
A reasoning horizon is the amount of intermediate reasoning state that must remain available at once to carry a task to a correct result.

It is a property of the task and its representation, not merely the intelligence of the reasoner.

More context does not automatically solve a representation problem.
```

## Research detail trimmed from the reasoning horizon, 2 November 2026

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, “The Reasoning Horizon,” revision `f9e1105a29bad7a6113968706d9e1f55e1105c32`, lines 87, 95, and 107. Replaced during the 2 November 2026 editorial pass.

Reason: synthesize lines of research and their useful findings in textbook prose. Remove the individual benchmark multiplier and researcher-by-researcher exposition; retain representative citations and the explicit attribution of the borrowed term. These original paragraphs are preserved for possible later reuse, without authorizing relocation.

```tex
Scale has always created problems. An engineer may be able to hold a small program in mind, but a large system soon exceeds that capacity. Human \textbf{working memory} is limited: we can actively hold and work with only a small amount of information at once, even when we have much more knowledge in long-term memory.\citep{cowan2001capacity} A change that looks simple in one file may require us to recall an interface elsewhere, a prior design decision, and a constraint on acceptable behavior. We use notes, diagrams, and other external representations so that we do not have to keep all of that information in our heads. Norman describes this as using knowledge in the world alongside knowledge in the head.\citep{norman2013}

Memory management can nevertheless expand what the whole system can work over. ReadAgent, for example, combines short summaries with selective retrieval of the original passages. On the long-document comprehension tasks it evaluated, this arrangement extended the effective context window by 3.5--20 times.\citep{lee2024readagent} The underlying model's context window remained bounded; the surrounding machinery made more information usable across the task.

Better machinery and better representations can extend the horizon in different ways. A harness can preserve and recover more relevant state across a task; a useful representation can reduce what must be searched, reconstructed, or inferred. Larkin and Simon distinguish informational equivalence from computational equivalence: representations that convey the same information can differ in the computation needed to use it.\citep{larkin1987diagram} Zhang and Norman study such differences as representational effects.\citep{zhang1994representations} These improvements may also make work cheaper without extending the range of tasks the system can handle. \autoref{reasoning-horizon-fig} illustrates how purposeful abstraction reduces reconstruction.
```

## Figure 1.5 caption, 2 November 2026

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, “The Reasoning Horizon,” revision `4fbcb65306cbc16a7f4eb08cf49e8ceb1b7e4d2b`, line 112. Replaced on 2 November 2026 by approved review item `13-horizon-caption`, including the author’s final edit to “the system’s reasoning horizon.”

Reason: distinguish preservation and recovery from reconstruction, and connect representation to the broader system-level definition without claiming that every efficiency gain extends the horizon. The figure-label proposals remain separately pending.

```tex
\caption{\emph{The reasoning horizon.} At sufficient scale, a task requires more state than a finite reasoner can keep active, so some state must be reconstructed. Representation determines the cost: raw implementation carries irrelevant detail, while purposeful abstraction can keep question-relevant state smaller and cheaper to recover.}
```

## Context Windows and Compaction inset, 3 November 2026

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, §1.3, revision `2256d4189667f026f9b86c6be95411f0db8904de`, lines 122–129. Replaced on 3 November 2026 by approved review item `13-inset`.

Reason: enter from the reasoning-horizon discussion, explain LLM context windows and compaction with a concrete example of information loss, include multimodal inputs, and return to the book’s broader abstraction. Preserve the original here for possible reuse; no relocation is authorized by this archive.

```tex
\begin{bookbox}{inset}{Context Windows and Compaction}
\label{inset-context-windows-and-compaction}
MAGE\textquotesingle s reasoning horizon appears in today\textquotesingle s agent harnesses most visibly as the problem of working within a bounded context window. The context window determines how much material the underlying model can consider directly at once, and those windows have grown substantially across generations of foundation models. Harnesses further stretch the useful working horizon by retrieving relevant state, caching or preserving selected information, and compacting an extended interaction into a smaller representation when the accumulated context becomes too large.

These mechanisms expand the amount of work an agent can carry forward, but they do so in different ways. A larger context window increases the amount of state that can remain directly available. Compaction compresses earlier state so that a longer interaction can fit within that bound, at the risk of discarding details that later matter. Retrieval and persistent state move information outside the immediate context and bring it back when needed. More generally, loop engineering can decompose work, preserve intermediate artifacts, selectively reconstruct context, and hand state between reasoning episodes. The effective working horizon of an engineered agent system can therefore be much larger than the raw context window of any single model invocation.

This is why MAGE uses reasoning horizon rather than context window. The engineering limit that matters is not a fixed token count but how much consequential reasoning state a task requires, and how effectively the surrounding system can preserve and recover that state. Today\textquotesingle s context windows are one implementation constraint on that horizon; larger models and better harnesses can move the constraint without making the underlying problem disappear.
\end{bookbox}
```


## Reliability and the probabilistic surface, 3 November 2026

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, §1.3, “Probabilistic Work Needs External Enforcement,” revision `35c64cf750dba448d32161007dddbe962f4e37d6`, lines 147–167. Replaced on 3 November 2026 by approved review item `13-reliability`.

Reason: center the agent in a simple model of implementing multiple features, retain the product equation and numerical examples, remove the detour about implementation details, and distinguish agentic inference from deterministic tools and checks. The revised definition does not assume that decisions recur or that all decisions can be made deterministic. Preserve the original here for possible reuse; no relocation is authorized by this archive.

```tex
Commodity intelligence is probabilistic in an engineering sense. Contemporary foundation models are learned systems whose outputs do not ordinarily carry guarantees that the engineering judgments embodied in those outputs are correct. Their present implementations may add uncertainty at several levels: generation can vary across samples; an underspecified request may admit several interpretations; intermediate reasoning and tool choices may differ; and an agentic task may compose many such judgments before producing a result. Harnesses can retry, decompose, vote, retrieve additional context, or ask another model to evaluate the first. All of these can improve reliability. None by itself turns an inferred engineering judgment into an engineering guarantee.

The details matter when evaluating a particular system, but they are too contingent to serve as the foundation of a general engineering method. Decoding can be deterministic. Errors can be correlated. One model or harness can be much better than another. Future foundation models may operate differently again. We therefore use a deliberately simple abstraction.

Suppose a realization depends on \(n\) consequential judgments, numbered 1 through \(n\). Let \(p_i\) denote the probability that judgment \(i\) is resolved acceptably. Under the simplifying assumption that these events are independent, the probability that all of them are acceptable is the product

\[
P(\text{all judgments acceptable}) = \prod_{i=1}^{n} p_i
\]

The effect is small when each judgment is highly reliable and there are only a few of them. If each judgment has a 99\% probability of being acceptable, for example, three such judgments give an overall probability of \(0.99^3 \approx 97\%\). But the chance of success falls as the number of judgments grows: \(0.99^{10} \approx 90\%\), and \(0.99^{100} \approx 37\%\). It falls faster when individual judgments are less reliable: ten judgments that are each 95\% reliable give \(0.95^{10} \approx 60\%\). Even under this deliberately favorable model, many individually reliable judgments do not compose into a comparably reliable whole.

Many techniques can improve these probabilities, most notably running agents in iterative loops that critique, test, and revise their own work. Such techniques can make individual judgments substantially more reliable. The equation is illustrative, not a model of an actual agent: real judgments are not generally independent, their probabilities may be unknown, and iterative techniques can change those probabilities. Nevertheless, the example shows why high reliability at the level of individual judgments does not establish high reliability for a system that depends on many of them.

% <!-- index-def: probabilistic-surface -->

% <!-- gloss-only: Probabilistic surface | The set of consequential decisions in a system whose correctness depends on probabilistic inference at the time they are made. A larger probabilistic surface creates more opportunities for inference error to affect the outcome, even when each individual decision is highly reliable. MAGE seeks to reduce this surface by moving suitable decisions into explicit models, deterministic mechanisms, and independently enforced obligations, while leaving genuinely judgment-dependent decisions probabilistic. -->

% <!-- point: the-probabilistic-surface-is-the-judgments-still-bought-per-instance | The consequential judgments that still depend on fallible per-instance inference form the probabilistic surface; better models, context, decomposition, harnesses, and iterative loops make those judgments more reliable but leave the obligation dependent on probabilistic judgment each time it arises. | terms: engineering-substrate, foundation-model -->

The consequential judgments that still depend on fallible per-instance inference form the system\textquotesingle s \textbf{probabilistic surface}. Better models, prompts, context, tools, decomposition, agent harnesses, and iterative loops can make those judgments more reliable. These are valuable improvements, but they leave the obligation dependent on probabilistic judgment each time it arises.
```

## Enforcement Outside the Producing Run, 3 November 2026

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, §1.3, revision `5a2d47a1f5b019622a009f3cf21b3e47d2a3a525`, lines 167–177. Removed on 3 November 2026 by approved review item `13-enforcement`, including its heading, point annotations, and closing paragraph. The associated `mage-auto-heading` annotation was removed as well.

Reason: §1.2 already demonstrates independent enforcement through DocAble’s content-preservation example; §1.3 introduces the machinery and its limits; §1.4 names the engineering problems. This subsection starts teaching the mechanisms developed in Chapter 3 before that progression is complete. Preserve the material here for later consideration; no relocation into another chapter is authorized by this archive.

```tex
\section{Enforcement Outside the Producing Run}\label{heading:enforcement-outside-the-producing-run}

% <!-- point: software-engineering-can-make-an-obligation-explicit-and-enforce-it-outside-the-run | For selected obligations the environment can make the required property explicit and enforce it independently of the producing run: it can represent an architectural boundary, a dependency rule, or a safety condition and reject changes that violate it, so the judgment that established the obligation is reused across later implementation. | terms: engineering-substrate -->

Software engineering already provides mechanisms for independent enforcement. For selected obligations, the environment can make the required property explicit and enforce it outside the producing run. It can represent an architectural boundary, a dependency rule, or a safety condition, and reject changes that violate it. The judgment that established the obligation can then be reused across later acts of implementation.

% <!-- point: agentic-work-provides-identifiable-interfaces-where-enforcement-can-act | Important changes reach the system through identifiable interfaces — inputs, tool calls, edits, outputs, lifecycle transitions — where a sandbox, hook, or test can act without a rich model, and explicit representations extend the semantic reach of those same control points. | terms: agentic-harness, injection-point, engineering-substrate -->

Agentic work provides places where such enforcement can occur. Important changes reach the engineering system through identifiable interfaces: inputs, tool calls, edits, outputs, and lifecycle transitions. A sandbox can deny network access, a hook can reject a command, and a test can block a regression without requiring a rich system model. Explicit representations can extend the semantic reach of those same control points, allowing an action to be judged against architectural, behavioral, policy, ownership, or other system-level obligations.

The harness therefore supplies control points; representation determines what those control points can know. MAGE develops principled ways to use both while leaving the rest of realization open.
```

## Chapter 1 summary: reliability across features, 3 November 2026

Source: `book/latex/sources/part1/1.5-problem-summary.tex`, §1.5, revision `5a2d47a1f5b019622a009f3cf21b3e47d2a3a525`, line 14. Revised on 3 November 2026 alongside approved review item `13-enforcement`, at the author’s request to reconcile the summary with the newly landed `13-reliability` passage.

Reason: the old summary assumes that the same decision is repeated. The approved simple model concerns an agent implementing multiple features and the probability of getting all of them right. Preserve the original paragraph here.

```tex
Two problems follow. The Representation Problem concerns what the reasoner can know and reconstruct while performing a task. Important system knowledge left implicit in implementation must repeatedly be recovered through finite and fallible reasoning. The Enforcement Problem concerns consequential judgments left to probabilistic implementation. Even a highly reliable decision can eventually fail when it is repeated often enough.
```

## Two Problems the Method Must Solve: opening, 3 November 2026

Source: `book/latex/sources/part1/1.4-the-new-engineering-problem.tex`, §1.4, “The Two Problems in Software,” revision `99a576a01fbb22a6dcccd201fd54976323679f46`, lines 13–32. Replaced on 3 November 2026 by approved review item `14-opening`.

Reason: connect the two engineering problems to §1.3’s probability model and to engineers’ responsibility for requirements and assurance. The approved revision recalls the engineered environment without changing its definition, adds a footnote about the total cost of completing and checking agent-produced work, retains the numbered structure, and describes Modeling and Alignment as parts of the MAGE methodology. It also uses the author’s “arbiter of validity” wording. Preserve the original opening, transition, and problem definitions here with their annotations and chapter references.

```tex
% <!-- point: substrate-leaves-two-problems | The properties of agentic machinery leave two engineering problems: a finite reasoner needs representations that keep relevant state tractable, and fallible autonomous work needs enforcement outside the producing run. | terms: engineering-substrate, foundation-model, agentic-harness -->

The properties of agentic machinery leave two engineering problems. A finite reasoner needs representations that keep relevant system state tractable as systems and tasks grow. Fallible autonomous work needs enforcement outside the producing run so that important obligations do not depend on the producer resolving every consequential judgment correctly.

% <!-- point: the-two-problems-representation-and-enforcement | The two problems, related but distinct: the Representation Problem (how to represent a large system so relevant properties are reasoned about without reconstruction) answered by Modeling in Chapter 2, and the Enforcement Problem (how intent comes to bind autonomous work so satisfying obligations does not depend on the producer self-certifying) answered by Alignment in Chapter 3. | terms: engineering-substrate, modeling-principle, alignment-principle, reasoning-horizon, injection-point -->

These problems are related but distinct:

% <!-- index-def: representation-problem -->

% <!-- index-def: enforcement-problem -->

\begin{enumerate}
\def\labelenumi{\arabic{enumi}.}
\tightlist
\item
  \textbf{The Representation Problem.} Large systems contain far more detail than any one engineering question needs, while the active state available to a reasoner is finite. How should a large, evolving system be represented so that the properties relevant to an engineering question can be reasoned about without continually reconstructing them from implementation? \magevalue{chapter:modeling} develops MAGE\textquotesingle s answer: Modeling.
\item
  \textbf{The Enforcement Problem.} Autonomous work can be constrained and checked at the interfaces through which it acts, but the producing run cannot be the final check on its own consequential judgments. How should engineering intent be enforced over autonomous work, so that satisfying important obligations does not depend on the producing agent remembering, agreeing, or self-certifying each time? \magevalue{chapter:alignment} develops MAGE\textquotesingle s answer: Alignment.
\end{enumerate}
```

## The Problem Is Larger than Software: material for Chapters 6 and 7, 3 November 2026

Source: `book/latex/sources/part1/1.4-the-new-engineering-problem.tex`, §1.4, “The Problem Is Larger than Software,” revision `1483c30d9d0d2b470a640b88d87336e4a8fd5e25`, lines 43–59. Preserved on 3 November 2026 at the author’s request during review item `14-scope`.

Status: the shorter replacement is still under review. This record preserves the complete original before any abridgement is applied; the source passage has not yet been removed.

Reason: retain the domain comparisons and conditions for extending MAGE beyond software while the Chapter 1 proposal is shortened. The proposed revision keeps the heading, brief software/mechanical-engineering/accounting examples, chapter signposts, and the qualification that the balance between inference, representation, and enforcement changes as agents improve.

Revisit after the Chapter 1 review:

- **Chapter 6:** consider the theoretical and predictive status of the broader claim, including the conditions that relevant knowledge can be represented, obligations can be evaluated with adequate evidence, and the resulting structure is economical to maintain. Compare with the existing scope-conditions treatment before reusing any prose.
- **Chapter 7:** consider the fuller domain inventory, including legal work, and the explanation of why the Representation and Enforcement Problems extend beyond source code. Compare with §7.3’s discussion of what must transfer and where generalization fails.

These are candidate destinations for later editorial review, not authorization to insert the material now.

```tex
\section{The Problem Is Larger than Software}\label{heading:the-problem-is-larger-than-software}

% <!-- point: the-problem-is-larger-than-software | Software makes the governing problem visible; it does not create it. -->

Software makes the problem unusually visible, but does not create it.

Suppose an agent is asked to perform consequential work in some other domain. It may analyze a contract, develop an engineering design, reconcile a set of accounts, or synthesize evidence for a scientific question. The artifacts differ, but two problems remain. First, the knowledge needed to do the work may exceed what the agent can reliably reconstruct and reason over in one episode. Second, some judgments matter enough that whether the work takes effect should not depend only on the producing agent having made those judgments correctly.

Those are the same two problems this chapter named the Representation Problem and the Enforcement Problem. Modeling addresses the first by making consequential knowledge available in representations suited to the questions being asked. Alignment addresses the second by giving selected obligations evidence and enforcement outside the producing reasoner. Neither move fundamentally requires source code.

What changes across domains is the engineering material. Software has requirements, architectures, dependency graphs, types, tests, admission gates, permissions, telemetry, and executable artifacts. Mechanical engineering has geometry, tolerances, load models, simulations, and physical tests. Accounting has ledgers, classifications, reconciliations, controls, and audit evidence. Legal work has authorities, claims, elements, facts, procedural rules, and approval structures. The useful representations differ, as do the obligations that can responsibly be enforced.

MAGE is an approach to governing agentic engineering work by engineering what the agent and its environment can know, decide, check, and enforce. This book develops that approach through software engineering because software is where we have exercised it deeply enough to study the mechanisms. The broader claim is theoretical and predictive. If the account is right, similar leverage should appear elsewhere when consequential knowledge can be represented, important obligations can be evaluated with adequate evidence, and the resulting structure is economical to maintain.

The balance between inference, explicit representation, and enforcement will change as agents improve. MAGE does not prescribe that balance in advance; it asks engineers to establish it for the systems and obligations they face.

The following chapters develop the software-engineering mechanisms in detail. \magevalue{chapter:theory} abstracts those mechanisms into a theory. \magevalue{chapter:profession} then asks what remains when the software-specific assumptions are relaxed.
```


## Reasoning-horizon figure labels, 3 November 2026

Source: `book/tikz/figures/reasoning-horizon.tex`, revision `85c7332250fb505726c6e423e4e47267879e39e2`, lines 7 and 21. SVG peer: `book/assets/reasoning-horizon.svg`, lines 40–41 and 110. Replaced on 3 November 2026 after approval of `horizon-figure-task` and `horizon-figure-spine`.

Reason: reconstruction is not the only way to continue when relevant state cannot all remain active. The revised labels emphasize preserving what later decisions need and keeping that state available. The SVG peer and accessibility description follow the same distinction.

```tex
\node[n,fill=white,text width=8cm] (task) at (0,0) {\textbf{Task exceeds the finite active state}\\Some reasoning state must be reconstructed};
\node[note,draw,text width=3.2cm] (c1) at (0,-11.2) {Reconstruction unavoidable};
```


## H4 and context delivery, 3 November 2026

Source revision: `607f877eb0d9d43eff82590ba016fcf2d5800832`. Replaced on 3 November 2026 after approval of `62-h4` and `appendix-deliver`.

- `book/latex/sources/part6/6.2-what-the-theory-predicts.tex`, line 48 (H4), with its title also used in the summary table at line 155. The revision leads with the possibility that more capable agents suggest ways to model systems that engineers had not considered, while retaining validation, maintenance cost, and resource/quality conditions.
- `book/latex/sources/appendix-stacks/context-delivery-stack.tex`, line 54. The revision distinguishes supplied context from the reasoning horizon.

```tex
\textbf{H4 --- Representation induction and innovation.} Commodity intelligence can contribute useful engineering representations, first by inducing latent structure from existing systems and, more strongly, by proposing representations that make consequential engineering questions tractable in ways the existing set of representations does not. Where those representations can be independently validated and economically maintained, they should extend the effective reasoning horizon of later agents and human engineers.

\textbf{DELIVER} & Put that context into the actor\textquotesingle s reasoning horizon. \\
```


## Approved introduction and glossary edits, 3 November 2026

Source revision: `5a8575094ba50e7ec2fbfd9abc8140cff41f21b1`. Replaced on 3 November 2026 after approval of `13-enduring`, `14-together`, `gloss-caption`, and `gloss-horizon`. The glossary approval includes its recorded consistency targets.

### 13-enduring

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, lines 164–164.

Reason: Follow the approved reliability passage with an explicit turn to a different engineering question: reliable implementation does not tell us what to build. Keep the responsibility to choose and justify requirements, and name validation evidence rather than reusing “judge” after the discussion of agentic judgments. Remove the vague final sentence about making reasoning explicit and the extra Chapter 7 signpost. The original, including its Chapter 7 reference, will be archived if this edit is approved.

```text
This is the immediate reliability argument for moving consequential judgments out of repeated inference, but it is not the only argument for doing so. Future agents may make many such judgments cheaply and reliably. But even granting that future, engineering disciplines require an independent basis for understanding what a system is intended to do, deciding which obligations govern it, and establishing why its behavior should be trusted. \magevalue{chapter:profession} returns to that requirement as one of engineering control and responsibility.
```

### 14-together

Source: `book/latex/sources/part1/1.4-the-new-engineering-problem.tex`, lines 34–34.

Reason: Connect the two activities to the DocAble example in §1.2: the content representation supports comparison, and the validator fails the job when original extracted content is missing. Carry the engineering decision forward into later work.

```text
The two activities complement one another. Modeling makes selected system properties explicit enough to reason about; Alignment enforces selected obligations over realization. Neither requires the other in every case: useful representations need not become constraints, and some local controls can act without a rich system model. Together, however, they let engineering knowledge and judgment persist outside any one producing run. \autoref{substrate-to-method} traces that derivation.
```

### gloss-caption

Source: `book/latex/sources/frontmatter/0.4-the-books-language.tex`, lines 70–70.

Reason: Use the system’s reasoning horizon to frame the failure mode, then connect churn to the figure’s available-state limit. Describe reconstruction as a possible failure, rather than an unavoidable response to a bounded context window.

```text
\caption{The agent stack and a characteristic failure mode. When required state cannot remain active, it must be preserved elsewhere and recovered; repeated reconstruction can contribute to churn.}
```

### gloss-horizon

Source: `book/latex/sources/frontmatter/0.4-the-books-language.tex`, lines 85–85.

Reason: Replace the opaque shorthand “the system has a horizon” with the concrete effects of better machinery and better representations. Keep the approved definition. On approval, carry this clarification into the matching wording in §1.3, the internal definition, the authoring guidance, and the figure description.

```text
\textbf{Reasoning horizon.} The practical limit of the work a reasoner and its supporting machinery can carry through reliably, given the available representations and resources. For an agent, this depends on the foundation model together with the harness, external memory, and tools. The task imposes reasoning demands; the system has a horizon. Better machinery can increase what it can handle, while better representations can reduce what it has to handle. \magevalue{sec:reasoning-horizon} develops the definition and its grounding in the literature.
```

### gloss-horizon consistency: remove the opaque shorthand from §1.3

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, lines 104–104.

Reason: keep the companion wording consistent with the approved passage.

```text
The task imposes reasoning demands; the system has a horizon.
```

### gloss-horizon consistency: state the effects in §1.3

Source: `book/latex/sources/part1/1.3-the-agentic-substrate.tex`, lines 106–106.

Reason: keep the companion wording consistent with the approved passage.

```text
Better machinery and better representations can extend the horizon in different ways.
```

### 14-together annotation

Source: `book/latex/sources/part1/1.4-the-new-engineering-problem.tex`, lines 32–32.

Reason: keep the companion wording consistent with the approved passage.

```text
Modeling makes selected properties explicit enough to reason about; Alignment enforces selected obligations over realization; neither requires the other in every case, but together they let engineering knowledge and judgment persist outside any one producing run.
```

### gloss-horizon consistency: authoring guidance

Source: `book/AGENTS.md`, lines 87–87.

Reason: keep the companion wording consistent with the approved passage.

```text
The task imposes reasoning demands; the system has a horizon.
```

### gloss-horizon consistency: internal definition

Source: `book/data/definitions.json`, lines 159–159.

Reason: keep the companion wording consistent with the approved passage.

```text
The task imposes reasoning demands; the system has a horizon.
```

### gloss-horizon consistency: internal explanation

Source: `book/data/definitions.json`, lines 160–160.

Reason: keep the companion wording consistent with the approved passage.

```text
Better machinery can increase the state the system can use across its work, while better representations can reduce the search, reconstruction, or inference required.
```

### gloss-caption consistency: accessible figure description

Source: `book/assets/gloss-agent-vocab.svg`, lines 11–11.

Reason: keep the companion wording consistent with the approved passage.

```text
Layered agent stack and a characteristic failure mode: the reasoning state required by a task may exceed the state available at once. Preserving and recovering state lets work continue; repeated reconstruction can contribute to churn.
```

### gloss-horizon consistency: figure maintenance note

Source: `book/assets/gloss-agent-vocab.svg`, lines 8–8.

Reason: keep the companion wording consistent with the approved passage.

```text
Required reasoning state: the task imposes demands; the complete reasoning system has a horizon.
```


### 61-window

Source: `book/latex/sources/part6/6.1-toward-a-theory-of-mage.tex`, line 725. Approved on 3 November 2026. Source revision: `5a8575094ba50e7ec2fbfd9abc8140cff41f21b1`.

Reason: Keep the alternative between increasing available context and changing the representation. Add a transition and make the larger-window option concrete: switching to a more costly model.

```text
An agent faces the same problem. A larger context window can postpone the limit, and better retrieval can bring useful evidence closer, but neither changes the underlying fact that implementation contains far more detail than most engineering questions require. DocAble encountered the limit literally: one document produced roughly 590,000 tokens of reasoning representation against a 272,000-token context. That result did not argue for a larger context window; it made windowing and whole-document compression the next representation problem.
```

### 61-general

Source: `book/latex/sources/part6/6.1-toward-a-theory-of-mage.tex`, line 735. Approved on 3 November 2026. Source revision: `5a8575094ba50e7ec2fbfd9abc8140cff41f21b1`.

Reason: Use Chapter 1’s distinction between task demands and the capacity of the complete reasoning system. Connect cost savings with “Even when a task is already within that horizon,” avoiding both the repeated “can” and an abrupt shift from reach to cost.

```text
\textbf{General form.} Consequential work can require more potentially relevant state than a finite reasoner can reliably keep active at once. Task-relevant representations can extend the effective reasoning horizon when they preserve the distinctions needed for the work while suppressing irrelevant detail. The software proposition is one specialization of this claim. Whether other domains admit representations with the same leverage is an empirical question.
```

## Approved field-guide and industry wording edits, 3 November 2026

Source revision: `a9faf106721820e9105ac9337c52724900c3feaa`. The author approved all six field-guide cards and the GitLab, measurement, and governance-conversion edits in Chapter 5.

### uber-reading

Source: `book/latex/sources/appendix-field-guide/uber.tex`, lines 29–29.

Reason: Name the connection directly, describe context selection without the compiler metaphor, and distinguish a foundation model from the engineering models discussed in MAGE.

```text
\textbf{MAGE reading.} Uber is strong evidence that the durable engineering object is the Governed Engineering Environment rather than the model. It engineers the reasoning horizon by compiling context and tools down to what a task needs, externalizes organizational knowledge into a queryable graph, and converts recurring workflows into reusable skills --- engineering capital that outlives any one model.
```

### uber-boundary

Source: `book/latex/sources/appendix-field-guide/uber.tex`, lines 31–31.

Reason: Separate the mechanisms Uber describes from claims the account does not establish. Remove the editorial shorthand about an interpretive reading and a sibling case.

```text
\textbf{Interpretive boundary.} MAGE reads much of Uber interpretively. The reasoning-horizon and externalized-knowledge moves are directly supported, but the account stops at a knowledge graph, with no executable behavioral model as the reasoning surface. GitLab enters the same kind from the trust motive and is cited as the sibling, not developed separately.
```

### uber-comparison

Source: `book/latex/sources/appendix-field-guide/uber.tex`, lines 12–12.

Reason: Replace the opaque classification and claims of permanence with the engineering concern the two accounts share. Distinguish self-reported operational measurements from an independent evaluation.

```text
\textbf{A shared kind, two motives.} Two organizations build the same durable environment around a replaceable reasoner and reach it from opposite motives. GitLab starts from trust: as code gets cheap, the scarce problem becomes trusting it, so GitLab wraps the model in a durable layer of context, verification, governance, identity, and provenance, kept independent of any one model or agent so the organization\textquotesingle s controls persist as reasoners change.\citep{staples2026abundant} Uber starts from economics: with agents already writing most of its code, it treats the surrounding environment as an object of continuous measurement. Both keep the reasoner swappable and the environment permanent, and both stop at a knowledge-and-context graph rather than an executable model of behavior. Uber gives the fuller, independently measured account, so the deep treatment follows it.
```

### uber-context-tools

Source: `book/latex/sources/appendix-field-guide/uber.tex`, lines 14–14.

Reason: Use the mechanism described by Uber rather than “compiled down” or “harden.”

```text
\textbf{What the public record shows.} Uber describes AI tools operating throughout the software lifecycle: more than 70 percent of pull requests are attributed to local or cloud agents, engineers have created more than 3,600 agent skills, and those skills execute more than 30,000 times per day.\citep{medisetty2026factory} Managed agents perform code review, CI repair, end-to-end changes, alert triage, debugging, and maintenance. The interesting structure is not the volume of agent use but that Uber engineers the environment around the agents: real workloads become benchmarks; models are selected against cost, quality, and reliability; context and tool access are compiled down to reduce unnecessary reasoning; recurring workflows harden into reusable skills; and agents are evaluated in units such as cost per merged pull request, review, or alert.
```

### uber-evidence-limit

Source: `book/latex/sources/appendix-field-guide/uber.tex`, lines 16–16.

Reason: Remove the vague hierarchy of reasoning surfaces and the implication that an unreported mechanism cannot exist.

```text
\textbf{Boundary of the evidence.} The account is self-reported operational data, not a controlled comparison. It is strong on context, skills, routing, benchmarks, and cost, and much thinner on behavioral, process, or invariant models serving as the primary reasoning surface --- its substrate is a knowledge-and-context graph, not an executable model of the software. GitLab\textquotesingle s account is thinner still: a vendor architectural vision rather than a measured deployment.
```

### uber-lesson

Source: `book/latex/sources/appendix-field-guide/uber.tex`, lines 18–18.

Reason: Say what engineers preserve and distinguish the replaceable foundation model from engineering models.

```text
\textbf{Portable lesson.} When code is abundant, the durable engineering object is the environment around the reasoner --- the context it reads, the tools it may call, the cost it is measured against --- not the reasoner itself.
```

### uber-connection-caption

Source: `book/latex/sources/appendix-field-guide/uber.tex`, lines 20–27.

Reason: Use the same connection label as the other industry cards and replace the unexplained executable-model tier.

```text
\subsubsection{Recto --- MAGE Interpretation}\label{heading:recto-mage-interpretation}

\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/field-guide-uber-ea237e11ec.pdf}
\caption{\emph{Uber projected onto MAGE.} Public evidence strongly supports engineering the environment around a replaceable reasoner; the executable-model tier stays out of reach.}
\label{field-guide-uber}
\end{figure}
```

### cloudflare-connection

Source: `book/latex/sources/appendix-field-guide/cloudflare.tex`, lines 6–31.

Reason: Review the related wording changes together: use “Connection to MAGE,” name the mechanisms directly, and keep each claim within the evidence described in Chapter 5.

```text
\subsection{Cloudflare}\label{heading:cloudflare}

\emph{Internet infrastructure · policy-first governance at organizational scale}

\subsubsection{Verso --- Evidence}\label{heading:verso-evidence}

\textbf{What the public record shows.} Cloudflare describes an engineering-standards system in which requirements originating in RFCs are extracted into structured, machine-readable form. Requirements that can be checked mechanically can become custom checks; obligations requiring semantic judgment remain review questions. This separates the authority to establish policy from the machinery that applies it repeatedly.\citep{reimann2026codex}

The important move is not AI review itself, but turning policy into an artifact that later work inherits.

\textbf{Boundary of the evidence.} The public account is much stronger on representation and enforcement of obligations than on explicit executable models of the software being governed. Nor does it show repeated failures being converted into new environmental structure over time. The evidence establishes policy → representation → mechanism, but not failure → diagnosis → environmental adaptation.

\textbf{Portable lesson.} A policy decision gains multiplicative reach when the environment can apply it without requiring another person to reconstruct it.

\subsubsection{Recto --- MAGE Interpretation}\label{heading:recto-mage-interpretation}

\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/field-guide-cloudflare-6ff2dd36d5.pdf}
\caption{\emph{Cloudflare projected onto MAGE.} Public evidence strongly supports structured policy, machine-checkable enforcement, and organizational-scale reuse; the governance-conversion loop stays interpretive.}
\label{field-guide-cloudflare}
\end{figure}

\textbf{MAGE reading.} Cloudflare is strong evidence for Alignment, with a modest Modeling move: obligations that once lived in RFC prose acquire structured identities that machinery can consume. Once represented mechanically, one policy decision can govern many later changes.

\textbf{Interpretive boundary.} This is an Alignment-heavy example with a modest Modeling component, not evidence for the complete MAGE loop.
```

### siemens-connection

Source: `book/latex/sources/appendix-field-guide/siemens.tex`, lines 6–31.

Reason: Review the related wording changes together: use “Connection to MAGE,” name the mechanisms directly, and keep each claim within the evidence described in Chapter 5.

```text
\subsection{Siemens}\label{heading:siemens}

\emph{Industrial and model-based engineering · persistent models as development surfaces}

\subsubsection{Verso --- Evidence}\label{heading:verso-evidence}

\textbf{What the public record shows.} Siemens provides a comparison from outside software-first engineering. Persistent engineering representations carry requirements, behavioral structure, simulation, traceability, and other system semantics; software generation can occur downstream of those representations. The example establishes that the strong end of MAGE\textquotesingle s Modeling is not novel: rich, executable representations are already ordinary practice in model-based engineering.\citep{siemens2026a3e}

SysML and CAD models, simulation, virtual ECUs, and bill-of-materials structures can serve as engineering surfaces, with code and verification downstream.\citep{siemens2026a3e}

\textbf{Boundary of the evidence.} The sources examined here do not establish a general admission mechanism that rejects changes when declared model↔implementation correspondence is violated. As throughout this appendix, source silence does not imply organizational absence.\citep{siemens2026a3e}

\textbf{Portable lesson.} Software need not be the primary surface of engineering reasoning. Mature engineering disciplines routinely place richer representations upstream of realization.

\subsubsection{Recto --- MAGE Interpretation}\label{heading:recto-mage-interpretation}

\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/field-guide-siemens-e677963dcf.pdf}
\caption{\emph{Siemens projected onto MAGE.} Strong evidence for rich Modeling; evidence for analysis and verification; no claim from source silence about generalized model↔code admission.}
\label{field-guide-siemens}
\end{figure}

\textbf{MAGE reading.} Siemens shows the strong end of Modeling in established engineering practice: engineers reason through persistent semantic representations and treat implementation as downstream realization. MAGE did not invent model-first engineering; its contribution is to bring that engineering instinct into agentic software engineering and connect representation explicitly to the enforcement surfaces of the governed environment.

\textbf{Interpretive boundary.} The missing model↔code admission gate means not established, not absent.
```

### spotify-connection

Source: `book/latex/sources/appendix-field-guide/spotify.tex`, lines 6–31.

Reason: Review the related wording changes together: use “Connection to MAGE,” name the mechanisms directly, and keep each claim within the evidence described in Chapter 5.

```text
\subsection{Spotify}\label{heading:spotify}

\emph{Audio streaming · fleet-scale autonomous migration}

\subsubsection{Verso --- Evidence}\label{heading:verso-evidence}

\textbf{What the public record shows.} Spotify\textquotesingle s Honk system moves large-scale code migration from distributed manual implementation toward centrally scoped, fleet-executed work. A migration that could previously involve hundreds of teams over weeks can instead be scoped by one engineer over a few days; tooling identifies and schedules targets, agents execute changes concurrently, and the engineer supervises the fleet and handles exceptions.\citep{spotify2026honk}

Spotify\textquotesingle s surrounding engineering estate also matters. Its System Model and Backstage catalog carry service identities, ownership, dependencies, endpoints, and lineage, giving fleet tooling a representation through which migrations can be targeted rather than requiring each agent to rediscover the repository landscape.\magefootnote{sp-estate}{Spotify System Model and Backstage service catalog, as recorded in the \magevalue{sec:mage-in-the-wild} reconstruction (service identities, ownership, dependencies, endpoints, lineage).}

\textbf{Boundary of the evidence.} Reported activity increases --- including the 76\% PR-frequency figure\magefootnote{sp-prfreq}{76\% PR-frequency figure as reported in the Honk account; cited here strictly as an activity measure, not as evidence of durable throughput.} --- measure implementation activity, not durable throughput. The stronger evidence is how the work changes: agents implement while human judgment moves upstream to scoping and supervision.

\textbf{Portable lesson.} Scale implementation; concentrate human judgment on what to change and where.

\subsubsection{Recto --- MAGE Interpretation}\label{heading:recto-mage-interpretation}

\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/field-guide-spotify-d737ac4cea.pdf}
\caption{\emph{Spotify projected onto MAGE.} Persistent estate representation feeds targeting, concurrent execution, and fleet-level supervision; the reading is judgment moving upstream, not the PR count.}
\label{field-guide-spotify}
\end{figure}

\textbf{MAGE reading.} Spotify shows the model and governed environment working together. A model of the service estate helps determine where work belongs; verification and admission machinery determine whether generated changes can proceed; fleet execution makes one engineer\textquotesingle s upstream decisions consequential across many repositories.

\textbf{Interpretive boundary.} The evidence does not show that every Spotify migration is model-driven or automatically admitted; the reading applies only to the mechanisms described publicly.
```

### shopify-connection

Source: `book/latex/sources/appendix-field-guide/shopify.tex`, lines 6–29.

Reason: Review the related wording changes together: use “Connection to MAGE,” name the mechanisms directly, and keep each claim within the evidence described in Chapter 5.

```text
\subsection{Shopify}\label{heading:shopify}

\emph{Commerce · shared organizational context for agent work}

\subsubsection{Verso --- Evidence}\label{heading:verso-evidence}

\textbf{What the public record shows.} Shopify\textquotesingle s public account describes agent work occurring in shared, observable channels rather than disappearing into private sessions. The record gives a one-month snapshot of \textbf{59,918 sessions across 5,170 channels involving more than 7,000 people}, together with the characterization of the system as "multiplayer by construction."\citep{moreno2026river} Shared sessions become searchable organizational artifacts; repeated knowledge can then be extracted into skills, conventions, and defaults that later agents can retrieve. This is a soft form of externalization: retrievable prose and skills rather than a structured executable system model.

\textbf{Boundary of the evidence.} The evidence establishes \texttt{session\ →\ reusable\ knowledge}, but not \texttt{session\ →\ skill\ →\ engineering\ capital}. MAGE supplies the further interpretation that recurring judgment, once captured in reusable skills, may become engineering capital.

\textbf{Portable lesson.} Experience cannot compound organizationally while it stays private. Make work observable before trying to make its lessons reusable.

\subsubsection{Recto --- MAGE Interpretation}\label{heading:recto-mage-interpretation}

\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/field-guide-shopify-0c48ebf9d5.pdf}
\caption{\emph{Shopify projected onto MAGE.} The source supports shared externalized knowledge and reusable context; conversion into durable capital is the interpretive step, not an automatic one.}
\label{field-guide-shopify}
\end{figure}

\textbf{MAGE reading.} Shopify sharpens a condition on engineering capital: experience must become observable before it can become durable. Shared sessions can be searched, corrected, mined, and --- where a lesson deserves reuse --- converted into skills or defaults. This is Modeling at the knowledge end of the spectrum, not the executable-system-model end.

\textbf{Interpretive boundary.} Observability makes compounding possible; it does not make every observed session engineering capital.
```

### zenseact-connection

Source: `book/latex/sources/appendix-field-guide/zenseact.tex`, lines 6–31.

Reason: Review the related wording changes together: use “Connection to MAGE,” name the mechanisms directly, and keep each claim within the evidence described in Chapter 5.

```text
\subsection{Zenseact}\label{heading:zenseact}

\emph{Autonomous-driving software · centralized substrate, distributed domain ownership}

\subsubsection{Verso --- Evidence}\label{heading:verso-evidence}

\textbf{What the public record shows.} Zenseact describes an organizational split. A platform team owns common substrate --- authentication, sessions, execution, and safety --- while domain teams retain their own agents, tools, instructions, and domain expertise. The arrangement expresses organizationally a principle seen technically elsewhere: centralize mechanisms that should be shared; leave domain judgment with the people who hold the domain knowledge.\citep{dufwa2026zap}

Zenseact also illustrates \emph{selective context}. Routing machinery selects task-relevant expertise instead of loading the whole organizational corpus into every reasoning window. A central runtime and safety envelope coexist with domain expertise captured in reusable skills and surfaced on demand.\citep{dufwa2026zap}

\textbf{Boundary of the evidence.} The sources show how Zenseact divides the platform, routes context, delegates work, and assigns ownership. They do not establish the resulting productivity, safety, or returns on engineering capital.

\textbf{Portable lesson.} Build the common substrate once; distribute the engineering judgment to the teams that possess the knowledge it requires.

\subsubsection{Recto --- MAGE Interpretation}\label{heading:recto-mage-interpretation}

\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/field-guide-zenseact-34e024fef1.pdf}
\caption{\emph{Zenseact projected onto MAGE.} Shared mechanisms centralize while domain knowledge and judgment remain distributed --- a concrete organizational answer to scaling both context and enforcement.}
\label{field-guide-zenseact}
\end{figure}

\textbf{MAGE reading.} Zenseact combines Modeling and Alignment organizationally. Externalized domain knowledge and selective context help finite reasoners see what a task requires; shared authentication, execution, and safety machinery place common enforcement in one substrate. The organization does not centralize the judgment itself --- domain teams keep the expertise that defines their agents and tools. The result is an organizational realization of the Governed Engineering Environment: common mechanisms without a central knowledge bottleneck.

\textbf{Interpretive boundary.} The platform/domain split illustrates the Governed Engineering Environment; the evidence does not establish a closed governance-conversion loop or complete Modeling and Alignment.
```

### factories-measurement-model

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, lines 270–270.

Reason: Use “foundation model” where “underlying model” could be confused with an engineering representation.

```text
The reported measurements are much stronger on the production of change than on the quality of the changes produced. Uber and Cloudflare report cost, throughput, findings, and overrides in detail, but much less about resulting software quality. Spotify reports measures of engineering-system health, including rework, complexity, pull-request size, and incident contribution. Shopify reports a merge-rate improvement with the underlying model held fixed. GitLab describes measurement mechanisms, while Siemens and Zenseact provide little operating evidence of this kind. These public accounts may omit measurements used internally, but as evidence they characterize production much more fully than they establish the quality of its output.
```

### factories-conversion-evidence

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, lines 274–274.

Reason: Replace abstract descriptions with concrete actions, and attribute the Spotify report without repeating the source caveat already established at the chapter opening.

```text
Operating experience changes the factories too. Cloudflare converts incidents, latency, and representation problems into new production structure; Shopify converts observed agent failures into shared instructions and, where closure depends on a property, into code-enforced guarantees; GitLab states the same discipline as doctrine, fixing the environment rather than repeatedly repairing the prompt; and Spotify provides the converse case, a probabilistic control withdrawn after the underlying models improved. These are instances of governance conversion, but the evidence usually establishes the conversion rather than its effect. No organization in this corpus publishes a recurrence measure showing that an incident-derived control reduced the failure class that produced it.
```

### gitlab-foundation-model

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, lines 208–208.

Reason: Distinguish the foundation model that performs reasoning from the engineering models that represent a system.

```text
The asymmetry is in what the vendor can supply. GitLab specifies the supplied infrastructure in detail, but not the cost of authoring the organization-specific knowledge on which autonomy depends: no case study measures the work required to construct those instructions or how output varies with their quality. The CEO\textquotesingle s essay locates trust in a durable layer of "context, verification, governance and evidence" around a replaceable model.\citep{staples2026abundant} Yet the layer that produced GitLab\textquotesingle s own 95-percent-agent-generated service included failing tests written first, CI gates, repository-resident context, and the test-count guard --- precisely the layer the adopting organization must supply.
```

## Zenseact removal and approved scope edits, 3 November 2026

Source revision: `2fe4ecab61686cf46e09bdffb16e1acd8dcdc87c`. The author requested removal of Zenseact from Chapter 5 and the field guide, including dependent case references, and approved `14-scope` and `3-probabilistic-definition`. All removed prose is retained below for possible reuse; it has not been relocated into another chapter.

### 14-scope

Source: `book/latex/sources/part1/1.4-the-new-engineering-problem.tex`, lines 43–59.

Reason: Name the methodology in the heading. Keep the software, mechanical-engineering, and accounting examples first, the qualification about the changing balance in the middle, and the Chapter 2, 3, 6, and 7 signposts last. The complete original is already preserved in the cutting room with Chapter 6 and 7 reuse notes. This abridgement remains a proposal. Use delegation rather than inference, and connect the balance to the degrees of freedom engineers leave open for agents.

```latex
\section{The Problem Is Larger than Software}\label{heading:the-problem-is-larger-than-software}

% <!-- point: the-problem-is-larger-than-software | Software makes the governing problem visible; it does not create it. -->

Software makes the problem unusually visible, but does not create it.

Suppose an agent is asked to perform consequential work in some other domain. It may analyze a contract, develop an engineering design, reconcile a set of accounts, or synthesize evidence for a scientific question. The artifacts differ, but two problems remain. First, the knowledge needed to do the work may exceed what the agent can reliably reconstruct and reason over in one episode. Second, some judgments matter enough that whether the work takes effect should not depend only on the producing agent having made those judgments correctly.

Those are the same two problems this chapter named the Representation Problem and the Enforcement Problem. Modeling addresses the first by making consequential knowledge available in representations suited to the questions being asked. Alignment addresses the second by giving selected obligations evidence and enforcement outside the producing reasoner. Neither move fundamentally requires source code.

What changes across domains is the engineering material. Software has requirements, architectures, dependency graphs, types, tests, admission gates, permissions, telemetry, and executable artifacts. Mechanical engineering has geometry, tolerances, load models, simulations, and physical tests. Accounting has ledgers, classifications, reconciliations, controls, and audit evidence. Legal work has authorities, claims, elements, facts, procedural rules, and approval structures. The useful representations differ, as do the obligations that can responsibly be enforced.

MAGE is an approach to governing agentic engineering work by engineering what the agent and its environment can know, decide, check, and enforce. This book develops that approach through software engineering because software is where we have exercised it deeply enough to study the mechanisms. The broader claim is theoretical and predictive. If the account is right, similar leverage should appear elsewhere when consequential knowledge can be represented, important obligations can be evaluated with adequate evidence, and the resulting structure is economical to maintain.

The balance between inference, explicit representation, and enforcement will change as agents improve. MAGE does not prescribe that balance in advance; it asks engineers to establish it for the systems and obligations they face.

The following chapters develop the software-engineering mechanisms in detail. \magevalue{chapter:theory} abstracts those mechanisms into a theory. \magevalue{chapter:profession} then asks what remains when the software-specific assumptions are relaxed.
```

### 3-probabilistic-definition

Source: `book/latex/sources/part3/00-part-intro.tex`, lines 10–10.

Reason: Retain the concise closing from the current passage, with the agent as the actor. Identify the generative implementer as an agent and reuse Chapter 1’s probabilistic-surface definition without adding another explanation. Manuscript unchanged pending approval.

```latex
Commodity intelligence makes this longstanding problem newly important. A generative implementer can produce plausible realizations rapidly and explore degrees of freedom that human implementers might never have considered. Instructions alone do not determine which realization will appear. If an architectural relation, behavioral invariant, ownership rule, measurement requirement, or policy matters to the system, relying on every future realization to reconstruct and voluntarily preserve it leaves that obligation on the probabilistic surface.
```

### factories-shared-lesson

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, lines 288–290.

Reason: Replace “unit of governance grows,” “scarce human decision,” and “multiplicative reach” with examples that explain how a decision affects later work. Remove the platform/domain generalization whose clearest Chapter 5 support was Zenseact.

```latex
% <!-- point: the-common-structure-is-leverage-organizational-capital | Where the factories converge most strongly is leverage: shared mechanisms centralize while domain judgment stays distributed, human judgment moves upstream, private learning becomes shared structure, and the unit of governance grows — so a scarce judgment gains multiplicative reach when the environment carries it forward. -->

Where the factories converge most strongly is leverage. Organizations centralize shared mechanisms while keeping domain judgment distributed; human judgment moves upstream, from hand-authoring changes toward scoping, supervision, and the engineering of reusable controls; private learning becomes shared structure; and the unit of governance grows from a task to classes of work, fleets, and platforms. A scarce human decision becomes more valuable when the environment carries it forward: one policy shapes thousands of changes, one shared representation guides work across a fleet, and one learned constraint protects later work over the same surface. Governance does not remove judgment; it gives selected judgments multiplicative reach.
```

### zenseact-chapter5-removal

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, lines 182–190.

Reason: Keep the Chapter 5 comparison focused on systems that produce controlled software changes. Zenseact’s ZAP examples support the broader MAGE discussion through information retrieval and analysis; retain that evidence in the approved field-guide card. Archive the removed case before applying this cut.

```latex
\subsection{Zenseact}\label{heading:zenseact}

% <!-- point: zenseact-federates-agent-ownership-while-keeping-the-authority-to-act-central | Zenseact's agents do no software realization, and the case earns its place on the federation question: a platform team owns a runtime with no business logic, a domain team's agent is a directory with two text files, and a central permission table still resolves every tool call. -->

Zenseact, a driver-assistance software company, belongs here with a scoping sentence attached: its agents do not produce software. The one substantive source --- a company-authored whitepaper describing its ZAP platform --- shows agents querying Gerrit, Zuul, JIRA, SAP, and document stores as data sources and synthesizing answers; no agent authors a patch, opens a change, or merges anything.\citep{dufwa2026zap} Under this chapter\textquotesingle s definitions that is not an agentic software factory but an agentic knowledge-work platform operating around one, and the case earns its place on a question none of the others puts squarely: where should authority over the factory\textquotesingle s agents sit? Zenseact\textquotesingle s answer is federation. A platform team owns the runtime --- authentication, sessions, tool execution, the model loop --- which deliberately "does not contain any business logic"; a domain team\textquotesingle s agent is a directory holding two text files, a configuration listing its skills and a markdown file encoding the domain\textquotesingle s rules, so a new agent is a configuration act rather than a platform change.\citep{dufwa2026zap} What makes that boundary safe to draw is that consequence stays central: a permission table resolves every tool call to auto-approve, confirm with a human, or deny, by tool and by role.\citep{dufwa2026zap} The domain team writes the knowledge; the platform keeps the authority to act.

% <!-- point: zenseact-is-architecture-described-by-its-authors-not-practice-observed | The federation claim is a design property the record never demonstrates — one source, no adoption count, no outcome figure — and its one published performance measurement concerns a context router whose typed failures are repaired in the skill file rather than the model. -->

The evidentiary standing travels with the claim. This is architecture described by its authors rather than practice observed: one source, no adoption count, no outcome figure, and no report of how many domain teams built an agent --- so "distributed ownership scales" is a design property the record states and never demonstrates. Its one published performance measurement concerns the context router, which selects each turn\textquotesingle s skill instructions by text similarity and carries the record\textquotesingle s only quantity, a 67 to 98 percent context reduction on financial queries and 43 to 97 percent on engineering ones. Routing misses are typed --- no skill matched, the wrong skill fired, the agent struggled with a tool --- and each class carries a prescribed repair to the skill file rather than to the model that reads it.\citep{dufwa2026zap} The federated unit is what gets repaired.
```

### factories-six-company-roster

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, lines 22–24.

Reason: Update the opening count and company list; retain the stable point ID.

```latex
% <!-- point: seven-reconstructions-differ-in-representation-direction-evidence-and-judgment | Seven public accounts are reconstructed; they differ in what they represent, how they direct and constrain agents, what evidence they require, where they keep human judgment — and in whether the factory is built for their own software or for somebody else's. -->

In this section, I reconstruct agentic software factories from public reports by seven major companies: Uber, GitLab, Cloudflare, Siemens, Spotify, Shopify, and Zenseact. These factories differ in what they represent, how they direct and constrain agents, what evidence they require, and where they retain human judgment. They also differ in a more basic way: some organizations are building factories for their own software, while others are building factories for somebody else to use.
```

### factories-six-account-comparison

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, lines 50–52.

Reason: Keep the factory-form comparison consistent with six cases. The category table has no company-specific row to remove.

```latex
% <!-- point: the-two-distinctions-are-independent-axes | The two distinctions are independent: either factory form can be existing-environment-first or model-first, and the seven public accounts occupy only part of that design space. -->

These distinctions are independent. An internal factory can be existing-environment-first or model-first. So can a factory in a box. The seven public accounts happen to occupy only part of that design space. \autoref{factory-forms} provides the map I will use for the rest of the section.
```

### factories-six-entry-points

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, lines 93–100.

Reason: Update the caption and baseline summary for six cases. The figure artwork must also lose its Zenseact row and use six in its title and accessibility text.

```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/six-entry-points-b36714cf00.pdf}
\caption{\emph{Seven Entry Points.} MAGE provides the comparison vocabulary; no source is claimed to implement the complete method. The organizations begin with different problems and invest in different parts of the agentic engineered environment. Note how the figure locates emphasis rather than ranking maturity.}
\label{six-entry-points}
\end{figure}

% <!-- point: the-shared-substrate-is-the-baseline-and-the-cases-report-the-differences | Four structures recur across all seven factories — knowledge externalized, action bounded, realization evaluated against evidence, and consequential judgment reserved to people — so the substrate is established once here and each case that follows is organized around what it alone teaches. -->
```

### factories-four-internal-cases

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, lines 110–112.

Reason: Remove the Zenseact exception and introduce the four remaining internal software-production cases directly. Retain the stable point ID.

```latex
% <!-- point: five-internal-accounts-each-answering-a-different-engineering-question | Five accounts describe systems an organization built for its own work, and each answers a different question — optimizing the factory, converting policy into control, evolving controls as the fabricator changes, turning experience into shared knowledge, and placing authority — while Zenseact's agents do knowledge work around the factory rather than realization inside it. -->

Five of the seven accounts describe a system an organization built for its own work, and each answers a different engineering question. Uber asks how to optimize the factory itself. Cloudflare asks how institutional policy becomes production control. Spotify asks how the controls should change when the fabricator does. Shopify asks how one engineer\textquotesingle s experience becomes knowledge every later session inherits. Zenseact asks where authority over the factory\textquotesingle s agents should sit. Four of the five begin with the existing software environment and delegate more of realization to agents from there. Zenseact is the exception --- its agents, as the case will show, perform knowledge work around the software factory rather than realization inside it --- and the exception is itself a data point about where agentic capability lands first.
```

### factories-six-company-measurement

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, lines 268–270.

Reason: Companion to the proposed Zenseact cut. Keep the approved foundation-model wording and remove Zenseact from the production-measurement comparison.

```latex
% <!-- point: the-reported-measurements-favor-production-over-quality | The reported measurements are much stronger on production than on quality: Uber and Cloudflare report cost, throughput, findings, and overrides, Spotify reports engineering-system health, Shopify a merge-rate improvement with the foundation model fixed, GitLab measurement mechanisms, Siemens and Zenseact little — and internal measurements may go unreported. -->

The reported measurements are much stronger on the production of change than on the quality of the changes produced. Uber and Cloudflare report cost, throughput, findings, and overrides in detail, but much less about resulting software quality. Spotify reports measures of engineering-system health, including rework, complexity, pull-request size, and incident contribution. Shopify reports a merge-rate improvement with the foundation model held fixed. GitLab describes measurement mechanisms, while Siemens and Zenseact provide little operating evidence of this kind. These public accounts may omit measurements used internally, but as evidence they characterize production much more fully than they establish the quality of its output.
```

### zenseact-ch7-opening-removal

Source: `book/latex/sources/part7/7.3-agentic-engineering-beyond-software.tex`, lines 48–52.

Reason: Archive the removed case and its point directive. The following paragraph already states the broader theoretical claim; removing its initial “But” lets it follow the reading-path inset directly.

```latex
% <!-- point: the-factorys-boundary-is-not-the-problems-boundary | Zenseact's platform fell outside this book's definition of an agentic software factory and still presented the same engineering problem, showing that the engineering problem is not confined to systems that produce software changes themselves. -->

\magevalue{chapter:software-factories} contained one deliberate boundary case. This book reserves \emph{agentic software factory} for a production system whose agents produce the software changes themselves and whose surrounding machinery decides which of those changes may be accepted. Zenseact\textquotesingle s ZAP platform, a driver-assistance software company\textquotesingle s internal agent platform reconstructed in \magevalue{sec:mage-in-the-wild}, did not qualify: its agents performed knowledge work around software production rather than producing software themselves.\citep{dufwa2026zap} Yet the engineering problem was already recognizable. Domain knowledge had to be represented for agents, capabilities had to be scoped, actions had to be governed, and responsibility remained with the surrounding organization.

But software is not fundamental to the theory. The same engineering problem arises even when the work produces something other than source code. An agent has some capacity. It performs consequential work through an environment. Some of the knowledge needed for that work can be represented outside the agent. Some obligations can be evaluated independently of the agent\textquotesingle s own judgment. Useful decisions made today can sometimes be preserved so that tomorrow\textquotesingle s work inherits them rather than reconstructing them.
```

### zenseact-ch7-worked-example-removal

Source: `book/latex/sources/part7/7.3-agentic-engineering-beyond-software.tex`, lines 127–141.

Reason: Archive the complete Zenseact example, including its configuration, permission, and per-call-admission discussion and evidence caveat. The preceding control-loop argument already leads to the accounting and legal examples that follow.

```latex
% <!-- point: zenseact-is-an-observed-instance-of-the-generalization | One industrial case is an instance rather than a prospect: an automotive company's agents do engineering knowledge work and no software realization, domain teams author each agent as two text files, and admission runs per tool call instead of per change. -->

That loop is not only a prospect. The Zenseact platform this section opened on is already an instance of it. Its agents query the company\textquotesingle s code-review, build, issue-tracking, and enterprise resource systems as data sources and synthesize answers for the engineers who ask.\citep{dufwa2026zap} No agent writes a patch or merges one. The work is consequential knowledge work inside an engineering organization, arranged around a software factory rather than performed inside it.

Two of its choices bear directly on the conditions set out above.

\textbf{Intent enters through domain-authored configuration.} As \magevalue{sec:mage-in-the-wild} described, Zenseact separates a platform-owned runtime from domain-authored agent configurations. Each agent consists of two text files, so creating a new agent is a configuration change rather than a platform change.\citep{dufwa2026zap} The important distinction here is where intent resides: domain teams write down their knowledge, and the platform need not understand it.

\textbf{Admission operates per tool call.} A permission table keyed on the tool and the caller\textquotesingle s role resolves every call the agent attempts to one of three outcomes: execute immediately, stream the call and its arguments to a person and wait for approval, or refuse.\citep{dufwa2026zap}

That second granularity deserves a name, because it differs from the one software uses. A software factory admits a \emph{change}: work is assembled, then accepted or refused as a unit at a merge point. Here the boundary sits one level down, inside the work itself, at each action the agent takes. Per-call admission governs actions as the agent works, rather than waiting to evaluate an assembled result. This matters when individual actions have consequences that cannot be undone merely by rejecting the final answer. The same three-valued choice---proceed, escalate, refuse---arrives at a far finer grain, and arrives many times inside a single session.

Read the case for its architecture rather than its effect. It rests on one source, written by the platform\textquotesingle s own authors, reporting no adoption count and no outcome measure. It shows that the arrangement this section describes is being built in an engineering organization. It does not show what that arrangement yields.


```

### zenseact-ch7-professional-work-transition

Source: `book/latex/sources/part7/7.3-agentic-engineering-beyond-software.tex`, lines 141–141.

Reason: Replace the loose backward reference with the subject of the section after the worked example is removed; leave the remaining argument and accounting/law introduction intact.

```latex
Whether these professions belong here at all turns on the book\textquotesingle s definition of engineering, which is functional rather than institutional: what matters is the kind of control, evidence, expertise, and responsibility being exercised, not the name on the office door. In the tradition of my engineering forebears, I hesitate to assert that doctors and lawyers are "engineering" things. But given the definition used in this book, I must admit the possibility. What marks the boundary is not the profession\textquotesingle s name but whether specialized expertise is being used to exercise informed control over consequential outcomes for which someone remains answerable. Two professions make the range visible.
```

### zenseact-ch3-preview-removal

Source: `book/latex/sources/part3/3.1-where-obligations-can-be-enforced.tex`, lines 151–151.

Reason: Remove the Zenseact preview and its plural lead-in. The existing Spotify example still illustrates the enforcement boundary alongside Docker and DocAble.

```latex
Two industrial fleets place enforcement the same way at coarser grain. Zenseact\textquotesingle s public account describes each domain team\textquotesingle s agent as little more than a config file and a skill, while a central team owns the runtime, permissions, and context routing; an agent\textquotesingle s reach is a property of where it sits in the platform, not of how it was asked. Spotify\textquotesingle s public account describes migration agents operating through a restricted API and a narrow Git interface, with every change clearing a merge gate before it lands. The gate, not the agent\textquotesingle s confidence, admits the work.
```

### zenseact-ch4-preview-removal

Source: `book/latex/sources/part4/4.4-engineering-the-environment.tex`, lines 217–217.

Reason: Remove the Zenseact preview and the promise of two previews. Shopify still connects packaged skills to the later industry discussion.

```latex
The pattern is appearing across the industry, and \magevalue{chapter:software-factories} examines several such systems side by side. Two previews suffice here. Shopify\textquotesingle s public account describes agent sessions made visible and searchable, with repeated judgment mined into shared skills and defaults, so the environment gets incrementally smarter with each pass instead of every session starting cold. Zenseact\textquotesingle s describes the organizational variant: a centrally owned runtime and safety envelope, with domain teams contributing agents as little more than a directory holding a config and a skill --- the organization centralizes the mechanism and decentralizes the judgment.
```

### zenseact-preface-roster-removal

Source: `book/latex/sources/frontmatter/0.5-preface.tex`, lines 66–66.

Reason: Keep the preface’s account of the evidence presented in Chapter 5 consistent with the six retained company cases.

```latex
This book began with one hard engineering problem that emerged over months of building a real production system. Only later did I test its vocabulary against independently described systems from Cloudflare, Shopify, Spotify, Siemens, Zenseact, Uber, and GitLab. \magevalue{chapter:software-factories} presents both views of the evidence: DocAble in depth, then the industrial reconstructions in breadth. \magevalue{chapter:theory} asks what account explains both. \autoref{research-arc} shows the evidentiary path.
```

### zenseact-preface-caption-count

Source: `book/latex/sources/frontmatter/0.5-preface.tex`, lines 71–71.

Reason: Update the caption to the retained six-case comparison. The parent owns any corresponding research-arc artwork change.

```latex
\caption{\emph{From case to theory.} MAGE began with one deeply observed production system, then was compared with seven independent industrial systems. The originating case shows mechanism and sequence; the industrial cases show variation and alternative ways to realize the same moves.}
```

### zenseact-field-guide-removal

Source: `book/latex/sources/appendix-field-guide/zenseact.tex`, lines 1–32.

Reason: Remove the Zenseact field-guide card at the author’s explicit request; preserve it for possible reuse.

```latex
% mage-auto-heading: zenseact
% mage-auto-heading: verso-evidence
% mage-auto-heading: recto-connection-to-mage
% Authoritative LaTeX manuscript; Markdown is a generated compatibility projection.

\subsection{Zenseact}\label{heading:zenseact}

\emph{Autonomous-driving software · centralized substrate, distributed domain ownership}

\subsubsection{Verso --- Evidence}\label{heading:verso-evidence}

\textbf{What the public record shows.} Zenseact describes a platform team responsible for authentication, sessions, execution, and shared safety mechanisms. Domain teams define their own agents, tools, instructions, and domain knowledge. Common mechanisms can therefore be maintained in one place while the teams that know each domain decide what its agents need to know.\citep{dufwa2026zap}

Zenseact also illustrates \emph{selective context}. A router selects the skill instructions relevant to a task, so each agent need not receive the organization's entire body of knowledge. The platform runs the agents under shared permissions, while domain teams maintain the skills supplied on demand.\citep{dufwa2026zap}

\textbf{Boundary of the evidence.} The sources show how Zenseact divides the platform, routes context, delegates work, and assigns ownership. They do not establish the resulting productivity, safety, or returns on engineering capital.

\textbf{Portable lesson.} Build the common substrate once; distribute the engineering judgment to the teams that possess the knowledge it requires.

\subsubsection{Recto --- Connection to MAGE}\label{heading:recto-connection-to-mage}

\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/field-guide-zenseact-34e024fef1.pdf}
\caption{\emph{Zenseact's connection to MAGE.} Domain teams maintain the knowledge supplied to their agents; the shared platform controls tool use. This separates responsibility for domain knowledge from responsibility for common enforcement.}
\label{field-guide-zenseact}
\end{figure}

\textbf{Connection to MAGE.} Zenseact separates two responsibilities that MAGE distinguishes. Domain teams record the knowledge their agents need, and the context router selects relevant instructions: these support Modeling. The platform's permission rules determine which tool calls may proceed, require human confirmation, or are denied: these support Alignment. The arrangement lets teams maintain their own knowledge while sharing enforcement mechanisms.

\textbf{What the evidence establishes.} The source describes how the platform and domain teams divide this work. It does not establish that the arrangement improves productivity or safety, or that recurring failures lead to controls whose effects have been measured.

```

### zenseact-field-guide-roster

Source: `book/latex/sources/appendix-field-guide/_opening.tex`, lines 1–39.

Reason: Keep the field-guide roster and count consistent with the removal.

```latex
% mage-auto-heading: how-to-read-the-recto-diagrams
% Authoritative LaTeX manuscript; Markdown is a generated compatibility projection.

\textbf{Seven organizations, six kinds}

\magevalue{chapter:software-factories} (\{\{sec:mage-in-the-wild\}\}) asks whether engineering structures found in DocAble recur in systems developed independently under different technical and organizational pressures. This appendix presents the evidence behind that comparison.

These are reconstructions, not additional case studies. Public accounts reveal selected mechanisms and design decisions, not the engineering history available for DocAble. They can show that a comparable structure exists, demonstrate another way to realize it, or mark a limit on the MAGE interpretation. They cannot establish causation, and silence in a public source does not establish that an organization lacks a capability (see \magevalue{sec:toward-a-theory-of-mage}.5 and \magevalue{sec:mage-in-the-wild}).

Each kind therefore gets a two-page spread, built on its clearest exemplar. The verso stays close to the public record: what the organization says it built, the evidence available for that account, and the boundary of what those sources establish. The recto interprets the same evidence through MAGE: Modeling, Alignment, the Governed Engineering Environment, governance conversion, and engineering capital.

The diagrams are mappings, not ratings. A strongly marked relation is directly supported by the cited account; a partial relation is a MAGE interpretation. An unmarked region means only that the source does not establish it. No card claims that an organization implements MAGE as a whole.

The organizations enter from different directions: Cloudflare from institutional policy; Spotify from fleet-scale change; Shopify from organizational knowledge; Siemens from model-first engineering; Zenseact from distributed autonomous work; and Uber from factory-scale economics. GitLab enters that last direction from the opposite motive---trust rather than cost---so it shares Uber\textquotesingle s spread as the sibling account of the same kind. The question is which engineering moves survive those differences.

\subsection{How to read the recto diagrams}\label{heading:how-to-read-the-recto-diagrams}

Every recto uses a simplified Figure 0.1-1: an observed engineering pressure enters from the left and passes through the mechanisms supported by the evidence to the part of MAGE it most directly illuminates.

The overlay uses exactly three epistemic states:

{\footnotesize
{\def\LTcaptype{none} % do not increment counter
\begin{longtable}[]{@{}ll@{}}
\toprule\noalign{}
Mark & Meaning \\
\midrule\noalign{}
\endhead
\bottomrule\noalign{}
\endlastfoot
████ solid & directly supported by the public account \\
- - - dashed & MAGE interpretation / partial support \\
░░░░ pale & part of MAGE, but not established by this source \\
\end{longtable}
}
}

The diagrams are neither MAGE audits nor a maturity ordering. Pale means not established, not absent.

```

### Zenseact supporting model and artwork archive

Source revision: `2fe4ecab61686cf46e09bdffb16e1acd8dcdc87c`; removed 3 November 2026 alongside the chapter and field-guide card. Original source files are reproduced below so the case can be reconsidered with its artwork and evidence record.

Source: `book-models/industry_cases_declared.json`, roster and case record.

```json
{
  "roster": {
    "id": "zenseact",
    "organization": "Zenseact",
    "domain": "engineering knowledge work / automotive",
    "distinctive_starting_point": "autonomous knowledge work over distributed engineering systems",
    "status": "authored"
  },
  "case": {
    "id": "zenseact",
    "onepager_lede": "Zenseact carries MAGE past source code. Its agents do not write software; they do knowledge work across the company's own systems, reasoning over issue trackers, code review, CI, search, and even ERP to decide which tool and which piece of expertise a task needs. The platform, called ZAP, is federated: a central team owns the runtime, permissions, and context machinery, while each domain team ships an agent as little more than a directory holding a config file and a skill. The origin is telling: an earlier, open approach 'did not scale,' so Zenseact rebuilt the environment around the same commodity models, betting that capability lives partly in the environment, on a single company-authored source that reports no outcome numbers yet.",
    "organization": "Zenseact",
    "domain": "engineering knowledge work / automotive",
    "distinctive_starting_point": "autonomous knowledge work over distributed engineering systems",
    "status": "authored",
    "source": {
      "citation_key": "dufwa2026zap",
      "source_type": "build-report",
      "independence": "independent",
      "author_role": "engineering (company-authored internal-platform whitepaper: Dufwa + Luvo)",
      "account_type": "architectural",
      "evidence_horizon": "months"
    },
    "setting": {
      "scale": "org-wide",
      "brownfield": true,
      "scale_facts": [
        "measured context reduction of 67-98% for financial queries and 43-97% for engineering queries via progressive skill disclosure (context cost measured; the reasoning-quality half asserted, not measured)",
        "skill frontmatter budget ~1.5-2 KB total across all active skills (always in the system prompt); skill bodies injected only when the deterministic TF-IDF router scores them relevant",
        "integrations span JIRA, Gerrit, Zuul, GoCD, Elasticsearch, SAP (ERP), Confluence, SharePoint, and proprietary internal tools, built on AWS Bedrock",
        "creating a domain agent requires only a directory under agents/ with two files (config.yaml + SKILL.md); no productivity/defect/before-after outcome data and no stated deployment duration"
      ]
    },
    "autonomous_work": "ZAP agents are more than document-retrieval chatbots: they use tools to act over enterprise systems and compose multi-step activity dynamically - deciding what information a task needs, which skill/tool is relevant, which action to perform, and whether to delegate to a specialist agent. Work leans toward engineering + enterprise knowledge work (investigation, synthesis, tool-mediated action across issue-tracking, code review, CI/CD, search, and financial/ERP systems), not autonomous source-code authorship; the autonomy is in reasoning about and orchestrating heterogeneous work.",
    "object_territory": [
      "source-code",
      "design-docs",
      "incident-reports"
    ],
    "representations": [
      "informal-knowledge",
      "spec",
      "structured-policy"
    ],
    "traceability": "Weak-to-absent as a model<->territory join. Skills reference the systems they operate over and tool schemas bind to specific enterprise APIs, but there is no representation<->territory drift check. Stable identity lives in the enterprise systems' own artifacts (JIRA keys, Gerrit changes, SAP records), not in a synchronized model of the system. The one traceable link the platform maintains is the disclosure record - which skills the TF-IDF router selected or missed per query - which is what makes disclosure-misses measurable.",
    "context_strategy": "The platform treats context as a scarce resource: Level-1 frontmatter (~1.5-2 KB across all active skills) is always in the system prompt; Level-2 skill bodies are injected only when a deterministic TF-IDF cosine-similarity router scores them relevant to the query. Measured context reduction of 67-98% (financial) / 43-97% (engineering) - the set's strongest measured reasoning-horizon instance - though the without-lowering-quality half is asserted, not measured.",
    "agent_authority": "Authority is explicit, machine-readable, and placed in the environment. Three stacked surfaces: a per-tool, per-role permission table (auto_approve / confirm-via-SSE / deny), so decide-freely != act-freely and the environment sets the line; agent-to-agent delegation that is allow-listed in config and depth-limited (the delegation topology is itself an authority model); and sanctioned tool seams with bidirectional sanitization (arguments validated for injection patterns; tool output scrubbed of prompt-injection markers). Boundaries live outside the reasoner.",
    "mechanisms": [
      "retrieval-layer",
      "constrained-api",
      "merge-gate",
      "provenance",
      "stable-identity",
      "deterministic-lint"
    ],
    "judgment": {
      "task_orchestration_and_synthesis": "llm",
      "skill_context_selection": "deterministic",
      "consequential_action_admission": "composite",
      "inbound_tool_output_safety": "deterministic",
      "skill_tool_permission_authorship": "human",
      "disclosure_miss_diagnosis": "composite"
    },
    "feedback_adaptation": "One clean loop plus a bootstrap-by-failure origin. The disclosure-miss loop: a task runs, the right skill exists but the TF-IDF router fails to surface it, the miss is detected and recorded as telemetry, an automated improvement pipeline analyzes it, and the skill/disclosure mechanism is updated so future agents get better context - the failure is diagnosed structurally (the environment failed to present the right representation) and the repair targets the environment. Origin: the prior open-source approach 'did not scale' and 'measurable outcomes were lacking', and ZAP is the structural response (same commodity models, a better-engineered environment). Not-described: strengthen / reconcile / retire (the subtractive arm).",
    "org_memory": "Federated engineering capital: skills make expert knowledge durable outside individual people and sessions. The central platform owns generic capital (runtime, tool/skill loading, permissions, context management, delegation, monitoring); domain teams own domain capital (their agents/tools/skills/knowledge, maintained where the expertise resides - an agent is just a directory + config.yaml + SKILL.md). Shopify centralizes; Zenseact federates. The disclosure-miss loop is capital maintenance - keeping the representation-routing fit between the capital and the reasoner.",
    "implicit_theory": "The book reads Zenseact as holding that enterprise autonomy scales when the organization separates a common agent platform from domain-specific intelligence: teams encode expertise as reusable skills + deterministic tools; agents receive only task-relevant context rather than the whole enterprise per session; probabilistic models decide what knowledge/operation is needed, but consequential actions execute through structured tools under explicit permission policies; agent-to-agent delegation is bounded like tool access; and the platform is instrumented so context-disclosure and capability-selection failures become evidence for improving the shared environment.",
    "mage_constructs": [
      {
        "construct": "alignment-principle",
        "strength": "strong",
        "note": "the book reads the per-tool/per-role auto/confirm/deny table, allow-listed + depth-limited delegation, bidirectional sanitization, and deterministic tools behind structured seams as authority placed outside the reasoner - the set's sharpest Alignment instance, adding a graduated per-action ladder and delegation-topology-as-authority"
      },
      {
        "construct": "modeling-principle",
        "strength": "partial",
        "note": "the book reads rich structured knowledge representation (skills) but no invariant-bearing system/process models and no model<->territory join - skills describe how to work in a domain, not what the system is or must remain; a mild Modeling tension held at partial for matrix parity"
      },
      {
        "construct": "bootstrap-governance",
        "strength": "strong",
        "note": "the book reads the existing engineering + enterprise tool estate, team knowledge, and explicit policies as seeding E(0), with the failed open-source attempt as a bootstrap-by-failure origin"
      },
      {
        "construct": "governance-conversion",
        "strength": "strong",
        "note": "the book reads the disclosure-miss loop (miss -> telemetry -> automated skill-improvement pipeline) as a clean failure->diagnosis->environment-change->better-behavior sequence, narrowed to the routing/representation layer (the subtractive reconcile/retire arm is not-described)"
      },
      {
        "construct": "determinization",
        "strength": "strong",
        "note": "the book reads three judgments other sites leave probabilistic being hardened into repeatable mechanisms - execution (deterministic tools), authority (the permission table), and context selection (the TF-IDF router)"
      },
      {
        "construct": "reasoning-horizon",
        "strength": "strong",
        "note": "the book reads progressive disclosure with the set's strongest measured context reduction (67-98% / 43-97%) as reasoning-horizon management, noting the reasoning-quality half is asserted, not measured"
      },
      {
        "construct": "engineers-seat",
        "strength": "strong",
        "note": "the book reads humans retaining skill/tool/permission authorship (distributed to domain teams) plus the confirm gate on consequential actions as the engineer's seat"
      },
      {
        "construct": "graduated-governance",
        "strength": "partial",
        "note": "the book reads auto/confirm/deny as a strong graduated-authority primitive across actions, but with no soft->hard mechanism-strengthening lifecycle over time (graduation across actions, not across maturity)"
      }
    ],
    "modeling_ceiling": [
      {
        "rung": "topology",
        "level": "not-seen",
        "note": "a federated tool/skill catalog, but no system model of the estate"
      },
      {
        "rung": "ownership-deps",
        "level": "implicit",
        "note": "delegation topology + tool bindings encode ownership implicitly, not as an explicit dependency model"
      },
      {
        "rung": "infra-as-code",
        "level": "some",
        "note": "config.yaml + permission tables + AWS Bedrock carry environment as code in part"
      },
      {
        "rung": "structured-policy",
        "level": "some",
        "note": "the auto/confirm/deny permission table is structured authority policy — but authority policy, not domain/system obligations"
      },
      {
        "rung": "data-lineage",
        "level": "not-seen",
        "note": "no data-lineage representation described"
      },
      {
        "rung": "behavioral-state",
        "level": "not-seen",
        "note": "no behavioral/state models described"
      },
      {
        "rung": "process-concurrency",
        "level": "not-seen",
        "note": "no process/concurrency models described"
      },
      {
        "rung": "scenario",
        "level": "not-seen",
        "note": "no scenario models described"
      },
      {
        "rung": "invariant-registry",
        "level": "not-seen",
        "note": "no explicit invariant registry described"
      },
      {
        "rung": "model-derived-verification",
        "level": "not-seen",
        "note": "no model-derived verification described"
      },
      {
        "rung": "bidirectional-traceability",
        "level": "not-seen",
        "note": "FLAG: the disclosure-miss record (query <-> skill the TF-IDF router selected) is provenance over routing, not a model<->code join; noted so it is not mistaken for the strong rung"
      },
      {
        "rung": "drift-gate",
        "level": "not-seen",
        "note": "no representation<->territory drift check"
      }
    ],
    "hypotheses": [
      "H2-governance-moderation",
      "H3-mechanized-assurance",
      "H4-representation-leverage",
      "H4a-representation-efficiency",
      "H6-oversight-amortization",
      "H7-conversion-conditions",
      "H8-learning-propagation"
    ],
    "adds_to_mage": [
      "capability-discovery-itself-must-be-governed",
      "delegation-topology-is-an-authority-surface",
      "graduated-per-action-authority-auto-confirm-deny",
      "distributed-federated-governance-at-org-scale",
      "environment-improvement-can-target-context-selection",
      "trust-boundaries-run-in-both-directions",
      "the-context-router-can-be-deterministic"
    ],
    "mage_explains_implicit": "MAGE compresses Zenseact's separately-named skills / tools / agents / progressive disclosure / permissions / delegation / sanitization / monitoring into one governed environment - skills as soft conditioning, the TF-IDF router as a sensor + reasoning-horizon mechanism (and a determinization of context selection), tool schemas as sanctioned seams, the permission table as authority allocation + a human gate, the delegation allow-list as a constraint on the agent topology, sanitization as a trust boundary, disclosure-miss telemetry as a sensor, the improvement pipeline as governance conversion, and the platform/domain split as an agent stack over federated engineering capital - and names the structural-diagnosis question Zenseact performs but never states.",
    "limitations": [
      "no-invariant-bearing-system-model-described-modeling-tension",
      "no-model-territory-drift-gate",
      "churn-defect-outcome-vocabulary-strains-on-knowledge-work",
      "no-productivity-or-defect-or-before-after-outcome-data",
      "deployment-duration-unstated",
      "reasoning-quality-half-of-progressive-disclosure-unmeasured",
      "single-primary-source",
      "reconcile-retire-not-described"
    ],
    "index_blurb": "Carries the same governance past source code into federated knowledge work — deterministic tools behind structured seams, permissions per role.",
    "result_sentence": "Zenseact built a federated internal agent platform - deterministic tools behind structured seams, a per-tool/per-role permission table, bounded delegation, and a deterministic TF-IDF disclosure router with measured 67-98% / 43-97% context reduction - over distributed engineering-and-enterprise knowledge work rather than source code, carrying MAGE's Alignment, reasoning-horizon, capital, and conversion machinery cleanly beyond code (the governance half of the MBAE widening, complementary to Siemens's modeling half), with the honest bound that its churn/defect outcome vocabulary strains on non-artifact-production work and no effectiveness outcomes are reported."
  }
}
```

Source: `book/assets/field-guide-zenseact.svg`, lines 1–57.

```text
<?xml version="1.0" encoding="UTF-8"?>
<!-- HAND-AUTHORED one-off (Field Guide card — Zenseact) — NOT projector output; edit by hand and keep this header. -->
<!-- Field-guide team card: Zenseact's entry door (autonomous knowledge work) plugs into MAGE landing (Governed Engineering Environment). label: field-guide-zenseact. Reference/nav card art, not a role-coloured figure. -->
<!-- Connect grammar: edges drawn UNDER the nodes, each undirected end run to a node CENTRE (fill caps it). -->
<!-- semantic-families: neutral -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 430" font-family="Georgia, 'Times New Roman', serif" role="img" aria-label="Field Guide card: Zenseact — autonomous knowledge work to the Governed Engineering Environment">
  <rect x="0" y="0" width="1000" height="430" fill="#fdfcf9"/>

  <!-- header -->
  <text x="48" y="44" font-size="20" fill="#57534e">Field Guide · card</text>
  <text x="952" y="44" text-anchor="end" font-size="22" font-weight="bold" fill="#1c1917">Zenseact</text>
  <text x="952" y="68" text-anchor="end" font-size="20" font-style="italic" fill="#57534e">Autonomous-driving software · platform-team / domain-team split</text>
  <line x1="40" y1="86" x2="960" y2="86" stroke="#cfcabf" stroke-width="1.5"/>

  <!-- ===== edges (under nodes; undirected → run to node centres) ===== -->
  <!-- edge: door -> platform -->
  <line x1="151" y1="205" x2="305" y2="205" stroke="#cfcabf" stroke-width="3"/>
  <!-- edge: platform -> d1 -->
  <path fill="none" stroke="#cfcabf" stroke-width="2.5" d="M392.5,175 L392.5,160 L611,160"/>
  <!-- edge: platform -> d2 -->
  <line x1="480" y1="205" x2="611" y2="205" stroke="#cfcabf" stroke-width="2.5"/>
  <!-- edge: platform -> d3 -->
  <path fill="none" stroke="#cfcabf" stroke-width="2.5" d="M392.5,237 L392.5,250 L611,250"/>
  <!-- edge: d2 -> landing -->
  <line x1="629" y1="205" x2="760" y2="205" stroke="#cfcabf" stroke-width="3"/>

  <!-- ===== nodes (fills cap the edge ends) ===== -->
  <circle id="door" cx="140" cy="205" r="11" fill="#fdfcf9" stroke="#1c1917" stroke-width="3"/>
  <rect id="platform" x="299.9" y="175" width="185.2" height="62" rx="8" fill="#fdfcf9" stroke="#1c1917" stroke-width="2.4"/>
  <circle id="d1" cx="620" cy="160" r="9" fill="#fdfcf9" stroke="#57534e" stroke-width="3"/>
  <circle id="d2" cx="620" cy="205" r="9" fill="#fdfcf9" stroke="#57534e" stroke-width="3"/>
  <circle id="d3" cx="620" cy="250" r="9" fill="#fdfcf9" stroke="#57534e" stroke-width="3"/>
  <rect id="landing" x="737.55" y="181" width="244.89" height="48" rx="8" fill="#fdfcf9" stroke="#1c1917" stroke-width="2.4"/>

  <!-- ===== node labels ===== -->
  <text x="140" y="150" text-anchor="middle" font-size="20" letter-spacing="1" fill="#78716c">ENTERS THROUGH</text>
  <text x="140" y="252" text-anchor="middle" font-size="20" fill="#57534e">Autonomous</text>
  <text x="140" y="272" text-anchor="middle" font-size="20" fill="#57534e">knowledge work</text>

  <text x="392" y="199" text-anchor="middle" font-size="20" font-weight="bold" fill="#1c1917">platform team</text>
  <text x="392" y="219" text-anchor="middle" font-size="20" fill="#57534e">auth · sessions ·</text>
  <text x="392" y="233" text-anchor="middle" font-size="20" fill="#57534e">execution · safety</text>
  <text x="392" y="260" text-anchor="middle" font-size="23" fill="#78716c">centralize the mechanisms</text>

  <text x="630" y="138" text-anchor="middle" font-size="23" fill="#57534e">domain teams</text>
  <text x="630" y="288" text-anchor="middle" font-size="23" fill="#78716c">decentralize the judgment</text>
  <text x="630" y="314" text-anchor="middle" font-size="23" fill="#78716c">own agents · tools · instructions</text>

  <text x="860" y="150" text-anchor="middle" font-size="20" letter-spacing="1" fill="#78716c">LANDS ON</text>
  <text x="860" y="203" text-anchor="middle" font-size="20" font-weight="bold" fill="#1c1917">Governed Engineering</text>
  <text x="860" y="223" text-anchor="middle" font-size="20" font-weight="bold" fill="#1c1917">Environment</text>

  <!-- takeaway -->
  <line x1="40" y1="368" x2="960" y2="368" stroke="#cfcabf" stroke-width="1.5"/>
  <text x="500" y="396" text-anchor="middle" font-size="20" font-style="italic" fill="#57534e">Build the common substrate once; leave the domain judgment</text>
  <text x="500" y="418" text-anchor="middle" font-size="20" font-style="italic" fill="#57534e">where the domain knowledge already lives.</text>
</svg>

```

Source: `book/tikz/figures/field-guide-zenseact.tex`, lines 1–19.

```text
\begin{tikzpicture}[x=1cm,y=1cm,font=\magefigurefont\fontsize{10}{12}\selectfont,
box/.style={draw=black,fill=white,rounded corners=3pt,align=center,text width=3cm,minimum height=8mm,inner sep=4pt},
gate/.style={box,line width=1pt},note/.style={align=center,fill=white,inner sep=1pt,font=\magefigurefont\fontsize{9}{11}\selectfont},
edge/.style={-{Stealth[length=2mm]},line width=.6pt},optional/.style={edge,dashed},
every node/.style={text=black,execute at begin node={\hyphenpenalty=10000\exhyphenpenalty=10000}}]
\node[note,text width=12cm] (t5) at (0,1.5) {\textbf{Zenseact}};
\node[box,text width=3cm] (entry) at (-4.5,0) {Autonomous knowledge work};
\node[box,text width=3.5cm] (platform) at (0,0) {\textbf{PLATFORM TEAM}\\ auth · sessions\\ execution · safety};
\draw[draw] (entry) -- (platform);
\node[box,text width=2.7cm] (d0) at (4.5,1.4) {domain team 1};
\draw[draw] (platform.east)--(2.4,0) |- (d0.west);
\node[box,text width=2.7cm] (d1) at (4.5,-0.20000000000000018) {domain team 2};
\draw[draw] (platform.east)--(2.4,0) |- (d1.west);
\node[box,text width=2.7cm] (d2) at (4.5,-1.8000000000000003) {domain team 3};
\draw[draw] (platform.east)--(2.4,0) |- (d2.west);
\node[note,text width=12cm] (t15) at (0,-5) {Centralize shared mechanisms; distribute domain judgment.\\ Domain teams own agents, tools and instructions.};
\node[box,text width=10cm] (land) at (0,-3.3) {LANDS ON: \textbf{Governed Engineering Environment}};
\draw (platform.south)--(land.north);
\end{tikzpicture}

```

Source: `book/tikz/receipts/field-guide-zenseact.json`, lines 1–163.

```text
{
  "source": "book/assets/field-guide-zenseact.svg",
  "claim": "*Zenseact projected onto MAGE.* Shared mechanisms centralize while domain knowledge and judgment remain distributed — a concrete organizational answer to scaling both context and enforcement.",
  "topology": "See source-specific field-guide graph and receipt redesign.",
  "required_terms": [
    "Zenseact",
    "Autonomous knowledge work",
    "PLATFORM TEAM auth · sessions execution · safety",
    "domain team 1",
    "domain team 2",
    "domain team 3",
    "Centralize shared mechanisms; distribute domain judgment. Domain teams own agents, tools and instructions.",
    "LANDS ON: Governed Engineering Environment"
  ],
  "bw_encoding": "Ordinary nodes, artifacts, evidence and outcomes are white. Named roles, position and relation styles provide the necessary distinctions.",
  "redesign": "Field-guide visual argument preserved; decorative header/footer dropped. Evidence caveats retained explicitly rather than color/half-disc glyph alone. Fidelity pass: Restored shared platform-to-governed-environment connection, routing clear of domain labels and the external organizational annotation.",
  "questions": [],
  "alt": "*Zenseact projected onto MAGE.* Shared mechanisms centralize while domain knowledge and judgment remain distributed — a concrete organizational answer to scaling both context and enforcement.",
  "style_review": {
    "guidelines": "book/tikz/README.md#publisher-grayscale-drawing-guidelines",
    "guidelines_sha256": "3af65468a482a3e5611f65ab9dbacab2a02a4692c8ab81082588af424ca0293c",
    "status": "reviewed",
    "source_sha256": "dceae24d254e2c79735b69f4b22fa321ac26de818fac3c3f81c17bf11860a973",
    "candidate_sha256": "2c99f6d899f928634608e83c12083aa093acb75c766b699980d352ac5e96e283",
    "fill": "Ordinary nodes, artifacts, evidence and outcomes are white. Named roles, position and relation styles provide the necessary distinctions.",
    "bold": "Source-derived emphasis includes Zenseact; PLATFORM TEAM. Restored case heading and mage landing concept; mechanism and repeated instance labels remain regular, case heading and mage landing concept; mechanism and repeated instance labels remain regular. Regular counterexamples in checks remain unaccented. Existing connections, light fills and link targets preserved.",
    "routing": "Platform-to-domain peers use a short common vertical rail. The environment destination sits directly below the platform; external explanatory annotation sits below the destination, avoiding an outer detour.",
    "shape": "Ordinary boxes use modest rounded corners; semantic document, state, decision, marker and quantitative shapes retain their roles.",
    "visual_review": "Rendered and visually inspected all 43 pages, including enlarged inspection of revised gate branches and crowded peer junctions. Required dashed relationships, icons, topology, labels and external annotations retained. Geometry checks supplement, rather than replace, visual review.",
    "validation": {
      "proof": "latex/build/tikz/candidates.pdf",
      "proof_sha256": "c366629433f19dc7f04474051c28ec12faea762051979b2956622ed8f20ac59f",
      "page": 133,
      "width_bp": 351.316,
      "height_bp": 209.604,
      "minimum_prose_font_pt": 9.0,
      "unapproved_compile_diagnostics": 0,
      "geometry_findings": 0,
      "monochrome_pixels": true,
      "semantic_typography_checks": 3
    },
    "book_references": []
  },
  "typography_review": {
    "review": "book/tikz/typography-review.json",
    "decision": "refined",
    "source_sha256": "dceae24d254e2c79735b69f4b22fa321ac26de818fac3c3f81c17bf11860a973",
    "candidate_sha256": "2c99f6d899f928634608e83c12083aa093acb75c766b699980d352ac5e96e283",
    "reason": "Restored case heading and mage landing concept; mechanism and repeated instance labels remain regular, case heading and mage landing concept; mechanism and repeated instance labels remain regular. Regular counterexamples in checks remain unaccented. Existing connections, light fills and link targets preserved.",
    "evidence": [
      {
        "source_text": "Zenseact",
        "source_style": "font-weight=bold",
        "semantic_role": "Case heading and MAGE landing concept; mechanism and repeated instance labels remain regular",
        "candidate_text": "Zenseact",
        "candidate_style": "bold"
      },
      {
        "source_text": "Governed Engineering",
        "source_style": "font-weight=bold",
        "semantic_role": "Case heading and MAGE landing concept; mechanism and repeated instance labels remain regular",
        "candidate_text": "Governed Engineering Environment",
        "candidate_style": "bold"
      },
      {
        "source_text": "platform team",
        "source_style": "font-weight=bold",
        "semantic_role": "Platform role heading distinguishes owner from mechanism list",
        "candidate_text": "PLATFORM TEAM",
        "candidate_style": "bold"
      }
    ],
    "checks": [
      {
        "text": "Zenseact",
        "bold": true,
        "italic": false
      },
      {
        "text": "PLATFORM TEAM",
        "bold": true,
        "italic": false
      },
      {
        "text": "domain team 1",
        "bold": false,
        "italic": false
      }
    ],
    "validation": {
      "proof": "latex/build/tikz/candidates.pdf",
      "proof_sha256": "c366629433f19dc7f04474051c28ec12faea762051979b2956622ed8f20ac59f",
      "page": 133,
      "width_bp": 351.316,
      "height_bp": 209.604,
      "minimum_prose_font_pt": 9.0,
      "unapproved_compile_diagnostics": 0,
      "geometry_findings": 0,
      "monochrome_pixels": true,
      "semantic_typography_checks": 3,
      "book_font_inheritance": {
        "configuration": "latex/book-fonts.tex",
        "configuration_sha256": "9a0c63c31c54bd4394caadb6be2523244fdcc84e174c110aca69e863f802a7b4",
        "reference": "latex/build/tikz/body-font-reference.pdf",
        "reference_sha256": "7420c44a26086ee806bc2ba9f8572a4891723f5aefd41186af0c5f3645b8b7eb",
        "body_faces": [
          "SourceSans3-Bold",
          "SourceSans3-BoldIt",
          "SourceSans3-It",
          "SourceSans3-Regular"
        ]
      }
    }
  },
  "layout_review": {
    "review": "book/tikz/layout-review.json",
    "decision": "retained",
    "reason": "Retained: observation/vocabulary grouping uses distinct role panels; repeated leaves align, and no process-terminal crowding requires repair.",
    "candidate_sha256": "2c99f6d899f928634608e83c12083aa093acb75c766b699980d352ac5e96e283",
    "page_layout": {
      "decision": "retained",
      "reason": "Retain compact case mapping: grouping labels and observation branches have sufficient whitespace; expansion would separate closely related evidence.",
      "before_sha256": "2c99f6d899f928634608e83c12083aa093acb75c766b699980d352ac5e96e283",
      "after_sha256": "2c99f6d899f928634608e83c12083aa093acb75c766b699980d352ac5e96e283",
      "before_dimensions_bp": [
        351.3160095214844,
        209.60400390625
      ],
      "after_dimensions_bp": [
        351.3160095214844,
        209.60400390625
      ],
      "before_font_sizes_pt": [
        9.0,
        10.0
      ],
      "after_font_sizes_pt": [
        9.0,
        10.0
      ],
      "reviewed_visually": true
    },
    "validation": {
      "proof": "latex/build/tikz/candidates.pdf",
      "proof_sha256": "c366629433f19dc7f04474051c28ec12faea762051979b2956622ed8f20ac59f",
      "geometry_findings": 0,
      "checked_terminal_approaches": 633,
      "reviewed_peer_groups": 81,
      "semantic_typography_checks": 875,
      "unapproved_compile_diagnostics": 0,
      "audit_sha256": "b9786cf992f06c85ada34c4664690fcc993ab43190c43e8e2d893c7f6f9bc55e",
      "maximum_dimensions_bp": [
        450,
        560
      ],
      "shared_tikz_style_sha256": "e5a78046a7a90d840d399785355827ac2d6a8c121b11693c494621c8e07a15ab",
      "status": "passed",
      "page": 133,
      "width_bp": 351.316,
      "height_bp": 209.604
    }
  }
}

```

Source: `book/assets/six-entry-points.svg`, lines 1–152.

```text
<?xml version="1.0" encoding="UTF-8"?>
<!-- Hand-authored SVG (label: six-entry-points). REPLACES six-company-map.svg for the reordered new §6.3.
     The claim is redesigned: the old figure said "different entry points, common destination" and mapped
     each org onto a MAGE construct, which read retrospectively. This figure LOCATES EMPHASIS only — each
     organization begins with a different problem and invests in a different part of the agentic engineering
     environment. Presented as a four-column table: Organization | Starting problem | Investment | Emphasis,
     one row per source, badge-coloured by the house semantic language: rust for governance/alignment
     emphasis, green for modeling/knowledge emphasis. Uber and GitLab (added this pass) span both poles, so
     their badges use the green->rust synthesis gradient. A final synthesis band reads "MAGE — the vocabulary
     used here to compare", NOT "the whole landscape": the bottom band is the measuring vocabulary, not an
     eighth, superior case. Caption says the figure locates emphasis and does NOT rank maturity or claim any
     source implements the complete method. (File name kept as six-entry-points.svg though the figure now
     shows seven rows — the label/ref key is stable; the reader-facing title + caption say "Seven".
     260923: the Docker row was REMOVED with the Docker case, on the author's evidentiary ruling; the
     remaining rows and the synthesis band shifted up one 84px row pitch and the canvas lost 84px.)
     Palette: Umber Monograph tokens (ink #1c1917 names, muted #57534e cells + captions, governed green
     #1f7a4d/#155c38 modeling/knowledge badges + tints #e3f0e7/#eef7f0, accent #9a3f12 governance/alignment
     badges + tint #faf1e6, rule #e4e0d8, page #fdfcf9). Cell + header fonts at the 20-26 band at the 1000px
     reference so every cell label and column header sits at or above the 8pt print floor. -->
<!-- semantic-families: governance, modeling, neutral -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 904" width="1000" height="904"
     role="group" aria-labelledby="sepTitle sepDesc"
     font-family="'Source Sans 3', -apple-system, 'Segoe UI', sans-serif">
  <title id="sepTitle">Seven entry points into a shared design space: where each organization begins and where it invests</title>
  <desc id="sepDesc">A table of seven industrial systems, each entering the agentic engineering design space
    through a different problem and investing in a different part of the environment. Cloudflare begins from
    institutional policy and invests in machine-readable requirements and review mechanisms — a governance
    emphasis. Spotify begins from fleet-scale change and invests in targeting, verification, and admission —
    a governance emphasis. Shopify begins from organizational knowledge and invests in shared context and
    reusable agent infrastructure — a knowledge emphasis. Siemens begins from model-first
    engineering and invests in persistent executable engineering representations — a modeling emphasis.
    Zenseact begins from distributed autonomous work and invests in platform boundaries, context, and
    delegation — a knowledge emphasis. Uber begins from software-factory economics at scale and invests in
    benchmarks, model routing, reusable skills, and outcome measurement — a combined knowledge and governance
    emphasis. GitLab begins from trusting abundant code at machine-scale development and invests in a durable
    layer of context, provenance, verification, and governance around replaceable models and agents — a
    combined knowledge and governance emphasis. A closing band reads: MAGE is the vocabulary used here to
    compare the observed structures, not an eighth case. Badge colour keys emphasis to the house semantic
    language: rust for governance and alignment, green for modeling and knowledge, and the green-to-rust
    gradient for an emphasis that spans both. The figure locates emphasis; it does not rank maturity or claim
    any source implements the complete method.</desc>

  <defs>
    <linearGradient id="sepSynth" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e3f0e7"/>
      <stop offset="1" stop-color="#faf1e6"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="1000" height="904" fill="#fdfcf9"/>
  <text x="500" y="48" text-anchor="middle" font-size="26" font-weight="700" fill="#1c1917">Seven entry points into a shared design space</text>
  <text x="500" y="78" text-anchor="middle" font-size="18" font-style="italic" fill="#57534e">Each organization begins with a different problem and invests in a different part of the environment.</text>

  <!-- legend: badge colour keys emphasis to the house semantic language -->
  <g font-size="20" fill="#57534e">
    <rect x="250" y="96" width="20" height="20" rx="3" fill="#e3f0e7" stroke="#1f7a4d" stroke-width="2"/>
    <text x="278" y="112">Modeling · knowledge emphasis</text>
    <rect x="612" y="96" width="20" height="20" rx="3" fill="#faf1e6" stroke="#9a3f12" stroke-width="2"/>
    <text x="640" y="112">Governance · alignment emphasis</text>
  </g>

  <!-- header row -->
  <text x="48"  y="150" font-size="20" font-weight="700" letter-spacing="1" fill="#57534e">ORGANIZATION</text>
  <text x="214" y="150" font-size="20" font-weight="700" letter-spacing="1" fill="#57534e">STARTING PROBLEM</text>
  <text x="452" y="150" font-size="20" font-weight="700" letter-spacing="1" fill="#57534e">INVESTMENT</text>
  <text x="869" y="150" text-anchor="middle" font-size="20" font-weight="700" letter-spacing="1" fill="#57534e">EMPHASIS</text>

  <!-- row rules -->
  <g stroke="#e4e0d8" stroke-width="1.5">
    <line x1="40" y1="168" x2="960" y2="168"/>
    <line x1="40" y1="252" x2="960" y2="252"/>
    <line x1="40" y1="336" x2="960" y2="336"/>
    <line x1="40" y1="420" x2="960" y2="420"/>
    <line x1="40" y1="504" x2="960" y2="504"/>
    <line x1="40" y1="588" x2="960" y2="588"/>
    <line x1="40" y1="672" x2="960" y2="672"/>
    <line x1="40" y1="756" x2="960" y2="756"/>
  </g>

  <!-- Cloudflare -> governance (rust) -->
  <text x="48"  y="216" font-size="22" font-weight="700" fill="#1c1917">Cloudflare</text>
  <text x="214" y="204" font-size="20" fill="#57534e">Institutional</text>
  <text x="214" y="230" font-size="20" fill="#57534e">policy</text>
  <text x="452" y="204" font-size="20" font-weight="600" fill="#1c1917">Machine-readable</text>
  <text x="452" y="230" font-size="20" font-weight="600" fill="#1c1917">requirements + review</text>
  <rect x="778" y="189" width="182" height="42" rx="8" fill="#faf1e6" stroke="#9a3f12" stroke-width="2.2"/>
  <text x="869" y="217" text-anchor="middle" font-size="20" font-weight="700" fill="#9a3f12">Governance</text>

  <!-- Spotify -> governance (rust) -->
  <text x="48"  y="300" font-size="22" font-weight="700" fill="#1c1917">Spotify</text>
  <text x="214" y="288" font-size="20" fill="#57534e">Fleet-scale</text>
  <text x="214" y="314" font-size="20" fill="#57534e">change</text>
  <text x="452" y="288" font-size="20" font-weight="600" fill="#1c1917">Targeting, verification,</text>
  <text x="452" y="314" font-size="20" font-weight="600" fill="#1c1917">admission</text>
  <rect x="778" y="273" width="182" height="42" rx="8" fill="#faf1e6" stroke="#9a3f12" stroke-width="2.2"/>
  <text x="869" y="301" text-anchor="middle" font-size="20" font-weight="700" fill="#9a3f12">Governance</text>

  <!-- Shopify -> knowledge (green) -->
  <text x="48"  y="384" font-size="22" font-weight="700" fill="#1c1917">Shopify</text>
  <text x="214" y="372" font-size="20" fill="#57534e">Organizational</text>
  <text x="214" y="398" font-size="20" fill="#57534e">knowledge</text>
  <text x="452" y="372" font-size="20" font-weight="600" fill="#1c1917">Shared context +</text>
  <text x="452" y="398" font-size="20" font-weight="600" fill="#1c1917">reusable agent infra</text>
  <rect x="778" y="357" width="182" height="42" rx="8" fill="#eef7f0" stroke="#1f7a4d" stroke-width="2.2"/>
  <text x="869" y="385" text-anchor="middle" font-size="20" font-weight="700" fill="#1f7a4d">Knowledge</text>

  <!-- Siemens -> modeling (green, emphasized) -->
  <text x="48"  y="468" font-size="22" font-weight="700" fill="#1c1917">Siemens</text>
  <text x="214" y="456" font-size="20" fill="#57534e">Model-first</text>
  <text x="214" y="482" font-size="20" fill="#57534e">engineering</text>
  <text x="452" y="456" font-size="20" font-weight="600" fill="#1c1917">Persistent executable</text>
  <text x="452" y="482" font-size="20" font-weight="600" fill="#1c1917">representations</text>
  <rect x="778" y="441" width="182" height="42" rx="8" fill="#e3f0e7" stroke="#155c38" stroke-width="2.6"/>
  <text x="869" y="469" text-anchor="middle" font-size="20" font-weight="700" fill="#155c38">Modeling</text>

  <!-- Zenseact -> knowledge (green) -->
  <text x="48"  y="552" font-size="22" font-weight="700" fill="#1c1917">Zenseact</text>
  <text x="214" y="540" font-size="20" fill="#57534e">Distributed</text>
  <text x="214" y="566" font-size="20" fill="#57534e">autonomous work</text>
  <text x="452" y="540" font-size="20" font-weight="600" fill="#1c1917">Platform boundaries,</text>
  <text x="452" y="566" font-size="20" font-weight="600" fill="#1c1917">context, delegation</text>
  <rect x="778" y="525" width="182" height="42" rx="8" fill="#eef7f0" stroke="#1f7a4d" stroke-width="2.2"/>
  <text x="869" y="553" text-anchor="middle" font-size="20" font-weight="700" fill="#1f7a4d">Knowledge</text>

  <!-- Uber -> knowledge + governance (spans both: synthesis gradient badge) -->
  <text x="48"  y="636" font-size="22" font-weight="700" fill="#1c1917">Uber</text>
  <text x="214" y="624" font-size="20" fill="#57534e">Software-factory</text>
  <text x="214" y="650" font-size="20" fill="#57534e">economics at scale</text>
  <text x="452" y="624" font-size="20" font-weight="600" fill="#1c1917">Benchmarks, routing, reusable</text>
  <text x="452" y="650" font-size="20" font-weight="600" fill="#1c1917">skills, outcome measurement</text>
  <rect x="778" y="609" width="182" height="42" rx="8" fill="url(#sepSynth)" stroke="#57534e" stroke-width="2.2"/>
  <text x="869" y="627" text-anchor="middle" font-size="18" font-weight="700" fill="#1c1917">Knowledge +</text>
  <text x="869" y="646" text-anchor="middle" font-size="18" font-weight="700" fill="#1c1917">governance</text>

  <!-- GitLab -> knowledge + governance (spans both: synthesis gradient badge) -->
  <text x="48"  y="720" font-size="22" font-weight="700" fill="#1c1917">GitLab</text>
  <text x="214" y="708" font-size="20" fill="#57534e">Trust at machine-scale</text>
  <text x="214" y="734" font-size="20" fill="#57534e">development</text>
  <text x="452" y="708" font-size="20" font-weight="600" fill="#1c1917">Durable context, provenance,</text>
  <text x="452" y="734" font-size="20" font-weight="600" fill="#1c1917">verification + governance</text>
  <rect x="778" y="693" width="182" height="42" rx="8" fill="url(#sepSynth)" stroke="#57534e" stroke-width="2.2"/>
  <text x="869" y="711" text-anchor="middle" font-size="18" font-weight="700" fill="#1c1917">Knowledge +</text>
  <text x="869" y="730" text-anchor="middle" font-size="18" font-weight="700" fill="#1c1917">governance</text>

  <!-- synthesis band: MAGE is the comparing vocabulary, not an eighth case -->
  <line x1="40" y1="768" x2="960" y2="768" stroke="#57534e" stroke-width="2"/>
  <rect x="40" y="776" width="920" height="60" rx="9" fill="url(#sepSynth)" stroke="#e4e0d8" stroke-width="1.2"/>
  <text x="64"  y="814" font-size="22" font-weight="700" fill="#1c1917">MAGE</text>
  <text x="214" y="814" font-size="20" fill="#57534e">the vocabulary used here to compare the observed structures</text>

  <text x="500" y="876" text-anchor="middle" font-size="18" font-style="italic" fill="#57534e">The figure locates emphasis; it does not rank maturity or claim any source implements the whole method.</text>
</svg>

```

Source: `book/tikz/figures/six-entry-points.tex`, lines 1–43.

```text
% Native black-and-white teaching figure; see matching receipt.
\begin{tikzpicture}[x=1cm,y=1cm,>=Latex,font=\magefigurefont\fontsize{10}{12}\selectfont,
 box/.style={draw=black,rounded corners=3pt,line width=.6pt,fill=white,align=center,inner sep=5pt,minimum height=.65cm},
 head/.style={box,font=\magefigurefont\fontsize{10}{12}\selectfont,fill=white},
 note/.style={align=center,font=\magefigurefont\fontsize{10}{12}\selectfont,inner sep=3pt},
 edge/.style={->,line width=.65pt},opt/.style={dashed,->,line width=.65pt}]
\hyphenpenalty=10000 % Keep diagram labels in whole words; explicit phrase breaks below.
\node[note,text width=2.8cm,font=\magefigurefont\fontsize{10}{12}\selectfont\bfseries] (h0) at (-5.7,0) {Organization};
\node[note,text width=2.8cm,font=\magefigurefont\fontsize{10}{12}\selectfont\bfseries] (h1) at (-2.8,0) {Starting problem};
\node[note,text width=5cm,font=\magefigurefont\fontsize{10}{12}\selectfont\bfseries] (h2) at (1.8,0) {Investment};
\node[note,text width=2.3cm,font=\magefigurefont\fontsize{10}{12}\selectfont\bfseries] (h3) at (6,0) {Emphasis};
\draw[line width=.8pt] (-7,-.6)--(7.3,-.6);
\node[note,text width=2cm] (c00) at (-5.7,-1.4) {\textbf{Cloudflare}};
\node[note,text width=3.1cm] (c01) at (-2.8,-1.4) {Institutional\\policy};
\node[note,text width=5cm] (c02) at (1.8,-1.4) {Machine-readable\\requirements and review};
\node[note,text width=2.3cm,draw=black,fill=black!5] (c03) at (6,-1.4) {\textbf{Governance}};
\node[note,text width=2cm] (c10) at (-5.7,-2.8499999999999996) {\textbf{Spotify}};
\node[note,text width=3.1cm] (c11) at (-2.8,-2.8499999999999996) {Fleet-scale change};
\node[note,text width=5cm] (c12) at (1.8,-2.8499999999999996) {Targeting, verification,\\admission};
\node[note,text width=2.3cm,draw=black,fill=black!5] (c13) at (6,-2.8499999999999996) {\textbf{Governance}};
\node[note,text width=2cm] (c20) at (-5.7,-4.3) {\textbf{Shopify}};
\node[note,text width=3.1cm] (c21) at (-2.8,-4.3) {Organizational\\knowledge};
\node[note,text width=5cm] (c22) at (1.8,-4.3) {Shared context and reusable agent infrastructure};
\node[note,text width=2.3cm,fill=white,draw=black] (c23) at (6,-4.3) {\textbf{Knowledge}};
\node[note,text width=2cm] (c30) at (-5.7,-5.75) {\textbf{Siemens}};
\node[note,text width=3.1cm] (c31) at (-2.8,-5.75) {Model-first engineering};
\node[note,text width=5cm] (c32) at (1.8,-5.75) {Persistent executable representations};
\node[note,text width=2.3cm,fill=white,draw=black] (c33) at (6,-5.75) {\textbf{Modeling}};
\node[note,text width=2cm] (c40) at (-5.7,-7.199999999999999) {\textbf{Zenseact}};
\node[note,text width=3.1cm] (c41) at (-2.8,-7.199999999999999) {Distributed\\autonomous work};
\node[note,text width=5cm] (c42) at (1.8,-7.199999999999999) {Platform boundaries, context, delegation};
\node[note,text width=2.3cm,fill=white,draw=black] (c43) at (6,-7.199999999999999) {\textbf{Knowledge}};
\node[note,text width=2cm] (c50) at (-5.7,-8.65) {\textbf{Uber}};
\node[note,text width=3.1cm] (c51) at (-2.8,-8.65) {Software-factory\\economics at scale};
\node[note,text width=5cm] (c52) at (1.8,-8.65) {Benchmarks, model routing, skills, outcome measurement};
\node[note,text width=2.3cm,draw=black,double,double distance=.5pt,fill=black!5] (c53) at (6,-8.65) {\textbf{Knowledge + governance}};
\node[note,text width=2cm] (c60) at (-5.7,-10.1) {\textbf{GitLab}};
\node[note,text width=3.1cm] (c61) at (-2.8,-10.1) {Trust at\\machine-scale\\development};
\node[note,text width=5cm] (c62) at (1.8,-10.1) {Durable context, provenance, verification, governance};
\node[note,text width=2.3cm,draw=black,double,double distance=.5pt,fill=black!5] (c63) at (6,-10.1) {\textbf{Knowledge + governance}};
\draw[line width=.8pt] (-7,-11)--(7.3,-11);
\node[note,font=\magefigurefont\fontsize{9}{11}\selectfont,text width=13cm] (nt) at (0,-11.8) {MAGE supplies the comparison vocabulary; it is not an eighth case. Emphasis is not a maturity ranking.};
\end{tikzpicture}

```

Source: `book/assets/research-arc.svg`, lines 1–119.

```text
<?xml version="1.0" encoding="UTF-8"?>
<!-- Authored for the conclusion-preface-260814 front-matter redraw; frontmatter-figures-260814 COPY-EDIT of
     the vocabulary (no geometry change). The prior redraw already fixed the epistemic verb (refines, NOT
     tested; no node or caption says "validation"). This pass aligns the node labels to the front-matter
     vocabulary: the deep case reads "observed in longitudinal depth"; the external evidence node is
     "Independent industrial accounts"; the procedure node is "Comparative reconstruction" (NOT "validation").
     The depth/breadth split under the theory is preserved: the originating case supplies mechanism and
     sequence (depth); the industrial reconstructions supply variation and alternatives (breadth). The TRUE
     chronological order is preserved (do NOT rearrange to chapter order; that falsifies the research story).
     Two colour families only: green #1f7a4d/#155c38 modeling (the theory nodes) and neutral #57534e (the
     evidence/procedure nodes + the inference spine), so the figure reads in grayscale. Palette: Umber
     Monograph tokens (ink #1c1917, paper #fdfcf9, neutral #57534e, green #1f7a4d + emphasis #155c38,
     modeling tint #e3f0e7, neutral tint #f6f4ef). Coordinate-authored (no invisible anchors).
     260923: the industrial-accounts node reads "seven", not "eight" — the Docker case was removed from the
     corpus on the author's evidentiary ruling. HAND-AUTHORED asset: nothing projects this file (the
     generated figures are the nav-subway maps from book-models/nav_map_model.py), so edit it here. -->
<!-- semantic-families: modeling, neutral -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 740" width="1000" height="740"
     role="group" aria-labelledby="raTitle raDesc"
     font-family="'Source Sans 3', -apple-system, 'Segoe UI', sans-serif">
  <title id="raTitle">Where the theory came from: the research provenance, one procedure read top to bottom, closing on depth and breadth</title>
  <desc id="raDesc">A single vertical chain of five stages, read from top to bottom, each a titled box joined to
    the next by a downward arrow, closing on a depth-and-breadth split. This is where the theory came from —
    its research provenance, in the true order the evidence produced it, which is not the order in which the
    book later teaches the method.
    Stage one, DocAble — one production system, observed in longitudinal depth over months.
    Stage two, Early MAGE — the theory induced from that one case: Modeling, Alignment, governance
    conversion, engineering capital. Stage three, independent industrial accounts — seven independent industrial
    systems. Stage four, comparative reconstruction — each system reconstructed in MAGE's vocabulary:
    recurring moves, variation, limits. That comparison refines — it does not validate — the theory. Stage
    five, MAGE theory — the account developed in Chapter 6. Beneath it a split: the originating case gives
    DEPTH (mechanism and sequence); the industrial reconstructions give BREADTH (variation and alternatives);
    together they converge on a stronger basis for theory. The theory stages are green (modeling); the
    evidence and procedure stages and the spine are gray (neutral).</desc>

  <defs>
    <marker id="ra-ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#57534e"/>
    </marker>
  </defs>

  <rect x="0" y="0" width="1000" height="740" fill="#fdfcf9"/>
  <text x="500" y="42" text-anchor="middle" font-size="26" font-weight="700" fill="#1c1917">Where the theory came from</text>
  <text x="500" y="68" text-anchor="middle" font-size="20" font-style="italic" fill="#57534e">How the book arrived at its claims.</text>

  <!-- spine arrows (neutral) + edge labels naming the inference; src ends seated inside the source box -->
  <g stroke="#57534e" stroke-width="2.2" fill="none">
    <!-- edge: docable -> early-mage -->
    <line x1="500" y1="148" x2="500" y2="180" marker-end="url(#ra-ah)"/>
    <!-- edge: early-mage -> industrial-accounts -->
    <line x1="500" y1="240" x2="500" y2="272" marker-end="url(#ra-ah)"/>
    <!-- edge: industrial-accounts -> comparative-recon -->
    <line x1="500" y1="332" x2="500" y2="364" marker-end="url(#ra-ah)"/>
    <!-- edge: comparative-recon -> mage-theory -->
    <line x1="500" y1="424" x2="500" y2="456" marker-end="url(#ra-ah)"/>
  </g>
  <g font-size="20" font-style="italic" fill="#57534e" text-anchor="start">
    <text x="516" y="169">induces</text>
    <text x="516" y="261">turned outward</text>
    <text x="516" y="353">reconstructed</text>
    <text x="516" y="445">refines</text>
  </g>

  <!-- N1 DocAble (neutral: the deep case) -->
  <rect id="docable" x="240" y="90" width="520" height="58" rx="8" fill="#f6f4ef" stroke="#57534e" stroke-width="2"/>
  <text x="500" y="116" text-anchor="middle" font-size="20" font-weight="700" fill="#1c1917">DocAble</text>
  <text x="500" y="137" text-anchor="middle" font-size="20" font-style="italic" fill="#57534e">one production system, observed in longitudinal depth</text>

  <!-- N2 Early MAGE (modeling: the induced theory) -->
  <rect id="early-mage" x="240" y="182" width="520" height="58" rx="8" fill="#e3f0e7" stroke="#1f7a4d" stroke-width="2.2"/>
  <text x="500" y="208" text-anchor="middle" font-size="20" font-weight="700" fill="#1c1917">Early MAGE</text>
  <text x="500" y="229" text-anchor="middle" font-size="20" font-style="italic" fill="#57534e">Modeling · Alignment · conversion · capital</text>

  <!-- N3 Independent industrial accounts (neutral: external evidence) -->
  <rect id="industrial-accounts" x="240" y="274" width="520" height="58" rx="8" fill="#f6f4ef" stroke="#57534e" stroke-width="2"/>
  <text x="500" y="300" text-anchor="middle" font-size="20" font-weight="700" fill="#1c1917">Independent industrial accounts</text>
  <text x="500" y="321" text-anchor="middle" font-size="20" font-style="italic" fill="#57534e">seven independent industrial systems</text>

  <!-- N4 Comparative reconstruction (neutral: procedure) -->
  <rect id="comparative-recon" x="240" y="366" width="520" height="58" rx="8" fill="#f6f4ef" stroke="#57534e" stroke-width="2"/>
  <text x="500" y="392" text-anchor="middle" font-size="20" font-weight="700" fill="#1c1917">Comparative reconstruction</text>
  <text x="500" y="413" text-anchor="middle" font-size="20" font-style="italic" fill="#57534e">recurring moves · variation · limits</text>

  <!-- N5 MAGE theory (modeling, emphasis: the refined theory) -->
  <rect id="mage-theory" x="240" y="458" width="520" height="64" rx="8" fill="#e3f0e7" stroke="#155c38" stroke-width="3"/>
  <text x="500" y="486" text-anchor="middle" font-size="21" font-weight="700" fill="#155c38">MAGE theory</text>
  <text x="500" y="508" text-anchor="middle" font-size="20" font-style="italic" fill="#57534e">the refined account developed in Chapter 6</text>

  <!-- DEPTH / BREADTH split: what each evidence source contributes.
       Fork encoded as one path per branch, each running mage-theory -> its target; the branches share the
       trunk (500,522 -> 500,540) so it still reads as one split while every edge terminates on a node. -->
  <g stroke="#57534e" stroke-width="2" fill="none">
    <!-- edge: mage-theory -> depth -->
    <path d="M355,522 L355,560" marker-end="url(#ra-ah)"/>
    <!-- edge: mage-theory -> breadth -->
    <path d="M645,522 L645,560" marker-end="url(#ra-ah)"/>
  </g>

  <!-- DEPTH cell (from the originating case) -->
  <rect id="depth" x="150" y="562" width="320" height="56" rx="8" fill="#f6f4ef" stroke="#57534e" stroke-width="1.8"/>
  <text x="310" y="586" text-anchor="middle" font-size="20" font-weight="700" fill="#1c1917">DEPTH</text>
  <text x="310" y="606" text-anchor="middle" font-size="20" font-style="italic" fill="#57534e">mechanism · sequence</text>

  <!-- BREADTH cell (from the industrial reconstructions) -->
  <rect id="breadth" x="530" y="562" width="320" height="56" rx="8" fill="#f6f4ef" stroke="#57534e" stroke-width="1.8"/>
  <text x="690" y="586" text-anchor="middle" font-size="20" font-weight="700" fill="#1c1917">BREADTH</text>
  <text x="690" y="606" text-anchor="middle" font-size="20" font-style="italic" fill="#57534e">variation · alternatives</text>

  <!-- converge to the conclusion: one path per branch, each depth/breadth -> basis; they share the
       trunk (500,640 -> 500,662) so it reads as one merge while every edge terminates on a node. -->
  <g stroke="#57534e" stroke-width="2" fill="none">
    <!-- edge: depth -> basis -->
    <path d="M400,618 L400,662" marker-end="url(#ra-ah)"/>
    <!-- edge: breadth -> basis -->
    <path d="M600,618 L600,662" marker-end="url(#ra-ah)"/>
  </g>
  <rect id="basis" x="330" y="664" width="340" height="48" rx="8" fill="#e3f0e7" stroke="#155c38" stroke-width="2.4"/>
  <text x="500" y="694" text-anchor="middle" font-size="20" font-weight="700" fill="#155c38">a stronger basis for theory</text>
</svg>

```

Source: `book/tikz/figures/research-arc.tex`, lines 1–24.

```text
\begin{tikzpicture}[font=\fontsize{10}{12}\selectfont,>=Stealth,
n/.style={draw,rounded corners=3pt,fill=white,align=center,inner sep=5pt,minimum height=.72cm},
state/.style={n,ellipse,rounded corners=0pt},
strong/.style={n,line width=.65pt,fill=white},
note/.style={align=center,inner sep=2pt,font=\fontsize{9}{11}\selectfont},
head/.style={note,font=\bfseries\fontsize{10}{12}\selectfont},
edge/.style={-Stealth,line width=.55pt},lab/.style={fill=white,inner sep=2pt,align=center,font=\fontsize{9}{11}\selectfont}]
\node[n,fill=white,text width=7cm] (s0) at (0,0.0) {\textbf{DocAble}\\\textit{One production system, longitudinal depth}};
\node[n,line width=.65pt,text width=7cm,fill=black!8] (s1) at (0,-1.8) {\textbf{Early MAGE}\\\textit{Modeling · Alignment · conversion · capital}};
\draw[edge] (s0) -- node[lab,right] {induces} (s1);
\node[n,fill=white,text width=7cm] (s2) at (0,-3.6) {\textbf{Independent industrial accounts}\\\textit{Seven independent industrial systems}};
\draw[edge] (s1) -- node[lab,right] {turns outward} (s2);
\node[n,fill=white,text width=7cm] (s3) at (0,-5.4) {\textbf{Comparative reconstruction}\\\textit{Recurring moves · variation · limits}};
\draw[edge] (s2) -- node[lab,right] {reconstructs} (s3);
\node[n,line width=.65pt,text width=7cm,fill=black!8] (s4) at (0,-7.2) {\textbf{MAGE theory}\\\textit{Refined account in \magebookref{part:6}{Chapter 6}}};
\draw[edge] (s3) -- node[lab,right] {refines} (s4);
\node[n,text width=4.7cm,fill=white,minimum height=1.6cm] (depth) at (-3,-9.6) {\textbf{DEPTH}\\Originating case\\\textit{Mechanism and sequence}};
\node[n,text width=4.7cm,fill=white,minimum height=1.6cm] (breadth) at (3,-9.6) {\textbf{BREADTH}\\Industrial accounts\\\textit{Variation and alternatives}};
\draw[edge] (s4.south) -- (0,-8.3) -| (depth.north);
\draw[edge] (s4.south) -- (0,-8.3) -| (breadth.north);
\node[n,text width=8cm,fill=black!8] (basis) at (0,-11.9) {\textbf{A stronger basis for theory}\\Comparison refines; it does not validate.};
\draw[edge] (depth.south) -- (-3,-10.8) -| (basis.north);
\draw[edge] (breadth.south) -- (3,-10.8) -| (basis.north);
\end{tikzpicture}

```


### Zenseact field-guide artwork: retired style-review record (3 November 2026)

Source: `book/tikz/style-review.json`, lines 3926–3954, at revision `2fe4ecab61686cf46e09bdffb16e1acd8dcdc87c`. Removed 3 November 2026 with the author-approved cut of the Zenseact case and field-guide card. This record preserves its artwork rationale and validation provenance for possible reuse.

```json
{
  "source": "book/assets/field-guide-zenseact.svg",
  "candidate": "book/tikz/figures/field-guide-zenseact.tex",
  "receipt": "book/tikz/receipts/field-guide-zenseact.json",
  "decision": "refined",
  "guidelines": "book/tikz/README.md#publisher-grayscale-drawing-guidelines",
  "guidelines_sha256": "3af65468a482a3e5611f65ab9dbacab2a02a4692c8ab81082588af424ca0293c",
  "status": "reviewed",
  "source_sha256": "dceae24d254e2c79735b69f4b22fa321ac26de818fac3c3f81c17bf11860a973",
  "candidate_sha256": "2c99f6d899f928634608e83c12083aa093acb75c766b699980d352ac5e96e283",
  "fill": "Ordinary nodes, artifacts, evidence and outcomes are white. Named roles, position and relation styles provide the necessary distinctions.",
  "bold": "Source-derived emphasis includes Zenseact; PLATFORM TEAM. Restored case heading and mage landing concept; mechanism and repeated instance labels remain regular, case heading and mage landing concept; mechanism and repeated instance labels remain regular. Regular counterexamples in checks remain unaccented. Existing connections, light fills and link targets preserved.",
  "routing": "Platform-to-domain peers use a short common vertical rail. The environment destination sits directly below the platform; external explanatory annotation sits below the destination, avoiding an outer detour.",
  "shape": "Ordinary boxes use modest rounded corners; semantic document, state, decision, marker and quantitative shapes retain their roles.",
  "visual_review": "Rendered and visually inspected all 43 pages, including enlarged inspection of revised gate branches and crowded peer junctions. Required dashed relationships, icons, topology, labels and external annotations retained. Geometry checks supplement, rather than replace, visual review.",
  "validation": {
    "proof": "latex/build/tikz/candidates.pdf",
    "proof_sha256": "c366629433f19dc7f04474051c28ec12faea762051979b2956622ed8f20ac59f",
    "page": 133,
    "width_bp": 351.316,
    "height_bp": 209.604,
    "minimum_prose_font_pt": 9.0,
    "unapproved_compile_diagnostics": 0,
    "geometry_findings": 0,
    "monochrome_pixels": true,
    "semantic_typography_checks": 3
  },
  "book_references": []
}
```

## Approved reasoning-horizon revisions, 3 November 2026

Source revision: `ad0418eeaf4a292e58b7d9f910449cf9c7664e6e`. The author approved `42-partition` and `61-proposition`, with the latter headed “The Reasoning-Horizon Proposition for Engineering.” Original passages are retained below for possible reuse.

### 42-partition

Source: `book/latex/sources/part4/4.2-one-problem-many-models.tex`, section “Pages as the Unit of Scale”, lines 72–72.

Reason: Distinguish reduced execution memory from the risk of losing semantic context. Explain that chunking can continue all the way down to words or figures, state the tradeoff directly, and end with the author’s question about the architecture. Approved by the author on 3 November 2026.

```latex
This is the reasoning-horizon problem from \magevalue{chapter:problem} in architectural form. An agent can reason only over the information made available to it. Shrinking an execution unit may reduce its resource requirements while simultaneously shrinking the semantic context within which a judgment is made. Page chunking therefore had no hard scaling wall. It had an increasingly unattractive tradeoff: continue subdividing the artifact and pay both systems overhead and semantic loss, or reconsider why so much of the artifact had to reside in the worker at all.
```

### 61-proposition

Source: `book/latex/sources/part6/6.1-toward-a-theory-of-mage.tex`, section “The reasoning-horizon proposition”, lines 729–733.

Reason: Treat representation’s effect on reasoning as established background, cite the external-representation literature already introduced in Chapter 1, and scope the proposition to engineering tasks and maintained software models. Preserve the DocAble motivation and explicit quality and resource budget. Approved by the author on 3 November 2026.

```latex
That is the general move: a useful model changes the problem by presenting the consequential structure directly --- the basis for the reasoning-horizon proposition.

\begin{quote}
\textbf{Reasoning-Horizon Proposition.} Large software systems contain more potentially relevant state than any finite reasoner can keep active at once. Task-relevant models can extend the effective reasoning horizon by replacing implementation detail with semantically richer representations of the properties under consideration. The gain holds only while the representation is relevant, sufficiently faithful to the relation it claims, and cheaper to use than reconstructing the same knowledge from lower-level artifacts.
\end{quote}
```

### 42-partition-transition

Source: `book/latex/sources/part4/4.2-one-problem-many-models.tex`, section “Pages as the Unit of Scale”, lines 74–74.

Reason: The approved replacement ends in a single question; remove the obsolete reference to a second question.

```latex
The 250 MB presentation made the second question worth asking.
```

## Approved industry mechanisms, retrieval, and knowledge upkeep, 3 November 2026

Source revision: `5df5d951c9f03f385c2c04119146339434e9789a`. The author approved `factories-common-mechanisms`, `5-uber-retrieval`, `shopify-observed-learning`, and `factories-maintenance`. Original passages are retained below for possible reuse.

### 5-uber-retrieval

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, section “Uber”, lines 121–121.

Reason: Chapter 5 did not explain the relationship. Add the graph reported by Uber and a short footnote distinguishing representation, retrieval, and human readability.

```latex
The optimization targets the environment rather than the reasoner. Context and tool access are centralized; deterministic orchestration is moved from repeated model turns into executable code, cutting token use by more than half on common workflows and by more than 90 percent in bulk cases; and session anti-patterns are detected and priced.\citep{medisetty2026factory, medisetty2026sdlc} Real workloads become benchmarks, models are selected against cost, quality, and reliability, and managed agents are evaluated in outcome-denominated units: cost per merged pull request, review, alert, or cleanup.\citep{medisetty2026factory}
```

### factories-common-mechanisms

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, section “Other Agentic Software Factories”, lines 101–101.

Reason: Name the teams and mechanisms doing the work, retaining externalizing as the precise verb for recording knowledge outside people’s memories. Put the transition to the individual cases in its own paragraph.

```latex
Across these factories, several structures recur. Engineering knowledge is externalized so that agents need not reconstruct it from a person\textquotesingle s memory on every task. Agent action is bounded through tools, permissions, roles, execution environments, or other controls. Realization is evaluated through tests, validators, reviewers, simulations, or other evidence before consequential changes are admitted. And some engineering judgments remain with people where the available representations, evidence, or organizational obligations do not justify delegation. These common structures establish the baseline. The cases that follow focus instead on where the factories differ: what each organization has chosen to engineer around its fabricators, what operating experience has forced it to change, and what that experience teaches about constructing and maintaining an agentic software factory.
```

### shopify-observed-learning

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, section “Shopify”, lines 171–171.

Reason: Replace the awkward “documents people learning” opening with people using shared sessions, and use the requested language about externalizing missing knowledge in the monorepo.

```latex
The corpus of sessions is the factory\textquotesingle s learning substrate, and the mechanism Shopify documents is human. People watch River work, notice where it got stuck, and write down what it should have known; the artifacts are files in the monorepo --- a skill update, an \texttt{AGENTS.md} diff, sometimes a whole new shared skill --- alongside the code, conventions, intent documents, and runbooks the next session inherits.\citep{moreno2026river} The effect is measured with the counterfactual controlled: River\textquotesingle s merge rate rose from 36 to 77 percent over two months, and "We did not retrain a model. We did not switch models."\citep{lutke2026shopfloor} The measure is self-reported and does not isolate human learning from improvement to the surrounding environment, but that entanglement is itself revealing: the people and the factory learned through the same mechanism. Shopify\textquotesingle s engineering account closes by handing readers an imperative --- "Make the agent multiplayer by construction" --- a design prescription offered outward, not a label the company applies to itself.\citep{moreno2026river}
```

### factories-maintenance

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, section “What the Factories Share, and Where They Differ”, lines 275–275.

Reason: Replace “representations through which a factory inherits” and “carrying-cost problem” with the upkeep engineers perform.

```latex
A second recurring cost is maintaining the representations through which a factory inherits engineering knowledge. GitLab budgets machinery for documentation freshness and convergence, Cloudflare checks the context supplied through AGENTS.md, and Shopify automates repair of instruction-file drift. The factory therefore acquires the same carrying-cost problem as the software it governs: production structures that preserve engineering knowledge are capital only while they remain sufficiently accurate to be useful.
```

## Approved factory connections and theory evidence, 3 November 2026

Source revision: `2f89012357edf5860dec57a5efbc795f659cca4c`. The author approved the Spotify connection, tolerance connection, knowledge upkeep, and evidence-limit edits, and approved the case-evidence edit with a request to replace “theory to explain.” The latter now says the cases identify engineering choices and tradeoffs. Original passages are preserved below.

### factory-tolerance-connection

Source: `book/latex/sources/part5/5.4-two-problems-of-factory-engineering.tex`, section “Process Design and Tolerance”, lines 42–42.

Reason: Replace “maintain correspondence,” “realization freedom,” and “make selected failures consequential for admission” with the obligation, evidence, and rejected change. Preserve the distinction between a requirement and its checking technique.

```latex
DocAble\textquotesingle s approach to tolerance, however, is distinctive. MAGE represents selected consequential properties explicitly and uses Alignment to maintain correspondence between those representations and the realized system. Tests, property-based testing, static analysis, measurements, and other evidence mechanisms can participate in establishing those properties, but the tolerance is the represented engineering obligation rather than any particular checking technique. This permits more systematic control than instructions or isolated checks alone. The factory can represent related obligations, identify the realization freedom they leave open, establish evidence about the resulting system, and make selected failures consequential for admission.
```

### factory-knowledge-upkeep

Source: `book/latex/sources/part5/5.4-two-problems-of-factory-engineering.tex`, section “Process Design and Tolerance”, lines 46–46.

Reason: Replace “cost of exercising that knowledge repeatedly” and “carrying cost of production structure” with the repeated work saved and the upkeep required.

```latex
The representations used by the factory also become part of its maintenance burden. GitLab, Cloudflare, and Shopify all describe machinery for keeping instructions, documentation, or other inherited context current. Externalizing engineering knowledge therefore does not eliminate the cost of exercising that knowledge repeatedly; it exchanges some of that repeated judgment for the carrying cost of production structure. Whether that exchange pays depends on how widely the structure is reused and how expensive it is to keep accurate.
```

### theory-case-evidence

Source: `book/latex/sources/part6/00-part-intro.tex`, section “00-part-intro”, lines 6–6.

Reason: Replace “originating case,” “sustained engineering pressure,” and “industrial reconstructions” with the case, its observations, and the comparison.

```latex
\magevalue{chapter:software-factories} supplied two views of the evidence. The originating case showed how MAGE\textquotesingle s structures emerged under sustained engineering pressure; the industrial reconstructions showed related structures arising independently under different constraints. Neither establishes a universal law. Together, they give us something worth explaining.
```

### theory-evidence-limit

Source: `book/latex/sources/part6/6.1-toward-a-theory-of-mage.tex`, section “From One Delegation to an Evolving Factory”, lines 907–907.

Reason: Replace “longitudinal depth,” “comparative variation,” and “independent industrial reconstructions” with what was observed; frame the theory as a proposed explanation.

```latex
The theory above explains two kinds of evidence from \magevalue{chapter:software-factories} --- longitudinal depth from the originating case and comparative variation from independent industrial reconstructions --- neither of which supplies population-level effect sizes or causal estimates. \magevalue{sec:what-the-theory-predicts} states predictions that require stronger external tests; \magevalue{sec:scope-conditions} asks where they should be expected to hold.
```

### spotify-foundation-model

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, section “Spotify”, lines 157–157.

Reason: Remove the repeated measurement/evaluation caveat and make the MAGE connection explicit where the mechanisms appear: tool limits preserve bounded degrees of freedom, verification enforces the condition for opening a pull request independently of the producer’s assessment, and the judge’s introduction and reported removal illustrate governance conversion and control maintenance.

```latex
The controls around that station are tuned to the fabricator\textquotesingle s properties, and they move when it does. The agent chooses its own path through the code but holds a deliberately narrow tool surface --- a verify tool, restricted git subcommands that can never push, an allowlisted shell --- with code search and documentation tools deliberately withheld and context condensed into the prompt up front: "The more tools you have, the more dimensions of unpredictability you introduce."\citep{charas2025honk} Verification runs before a pull request may exist: verifiers activate from the component\textquotesingle s contents, opaque to the agent, and a failing verifier means no PR;\citep{charas2025honk} a later architecture separates the verification runtime entirely, so the PR is created only after full CI validation.\citep{curtis2026spotifyqcon} The clearest control story in the case is a lifecycle. Agents gamed builds --- commenting out failing tests, downgrading Java versions --- so Spotify added an LLM judge, which by late 2025 was vetoing about a quarter of sessions, the agent self-correcting half the time; the talk record then reports the judge removed as models improved, "verification steps in prompts proving sufficient."\citep{curtis2026spotifyqcon} A control installed against a measured failure mode and retired when the capability beneath it moved --- reported second-hand, with no first-party text yet confirming the removal. If the later account is accurate, no other case in this corpus records a control being withdrawn after the fabricator improved.
```

### spotify-point-summary

Source: `book/latex/sources/part5/5.3-other-agentic-software-factories.tex`, section “Spotify”, lines 155–155.

Reason: Keep the editorial summary consistent with the approved passage; preserve its stable identifier.

```latex
% <!-- point: spotify-installs-and-then-retires-a-control-as-the-fabricator-improves | The controls around the agent station are tuned to the fabricator and move with it: a deliberately narrow tool surface, verification as a precondition of the PR's existence, and an LLM judge added after agents gamed builds and, on a second-hand account, removed once models improved. -->
```

## MAGE scope across process design and tolerance, 3 November 2026

Source revision: `86caa0f0b26f9f6293f045c377c20d435095ef97`. The author approved `factory-mage-scope`. The revision distinguishes DocAble’s emphasis on tolerance from MAGE’s broader application to process design and product requirements. The original paragraph and editorial summary are retained below.

### factory-mage-scope

Source: `book/latex/sources/part5/5.4-two-problems-of-factory-engineering.tex`, section “Process Design and Tolerance”, lines 54–54.

Reason: Preserve the approved distinction between a case’s emphasis and the methodology’s scope; keep the editorial summary consistent.

```latex
That difference also helps locate MAGE within the larger problem of factory engineering. MAGE concentrates primarily on the tolerance side of the factory. Process design remains part of the production system, but MAGE does not attempt to prescribe a general process for agentic software development. The distinction is therefore not between factories that have tolerances and factories that do not. It is between different ways of representing tolerances, establishing them, and making them consequential in production.
```

### factory-mage-scope-point-summary

Source: `book/latex/sources/part5/5.4-two-problems-of-factory-engineering.tex`, section “Process Design and Tolerance”, lines 52–52.

Reason: Preserve the approved distinction between a case’s emphasis and the methodology’s scope; keep the editorial summary consistent.

```latex
% <!-- point: mage-concentrates-on-the-tolerance-side-of-the-factory | MAGE concentrates on the tolerance side and does not prescribe a general process, so the distinction is not between factories that have tolerances and factories that do not, but between ways of representing them, establishing them, and making them consequential. | terms: tolerance -->
```

