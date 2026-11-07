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


## Factory workflow and validation placement, 3 November 2026

- Source: `book/latex/sources/part5/5.2-inside-docables-software-factory.tex`, lines 433–449.
- Source revision: `cf326ba6ea659b2c3d24fd32a5457be5391ff7e2`.
- Removal revision: uncommitted local edit.
- Reason: Expanded the operating account from the November lecture and dated the subsequent change from synchronous merge-train validation to periodic checks.

```latex
\section{The Factory in Operation}\label{heading:the-factory-in-operation}

% <!-- section-terms: governance-conversion, governed-engineering-environment -->

% <!-- point: the-mature-production-flow | The mature production flow in one pass — what the build accumulated, in motion: intent becomes a work unit, realization fans out to isolated worktrees, and admission is serialized through an integration gate that regenerates the evidence against the actual candidate tree. -->

With the representations and joins in place, the mature factory\textquotesingle s production flow can be walked in one pass. What follows is everything the build accumulated, in motion. Engineering intent becomes a named work unit; a brief carries the task, its scope, and the context selected for it; realization fans out to agents working in isolated copies of the repository. Nothing an agent produces reaches the production branch directly. Each candidate change queues for a merge train that rebuilds, re-lints, and re-tests the actual candidate tree --- the independent-evidence discipline a later episode in this subsection explains --- and only work that survives that gate lands. Parallelism lives entirely on the realization side; admission stays serialized through regenerated evidence.

% <!-- point: task-scoped-context-connects-models-to-dispatch | Dynamic context injection supplies task-specific knowledge at dispatch and after planning; its extraction gate requires discovery, while separate controls enforce selected obligations. -->

DocAble selects task-specific engineering knowledge through dynamic context injection (\magevalue{sec:the-agent-stack}). The initial work order supplies an anticipated file set; after planning, the agent repeats the extraction using its refined scope. A pre-commit gate requires evidence that discovery occurred, while separate controls enforce selected obligations. This lets the factory maintain a large modeling substrate without placing all of it into every agent's context.

% <!-- point: repair-is-cheap-escalation-is-the-signal | Most failures die where they are cheap: the agent repairs against the accumulated local gates, a failed admission returns the work for another attempt, and only failures that resist local repair — or implicate the environment itself — reach the engineer. -->

Between realization and admission sits repair, and most failures die there, where they are cheap. An agent whose change fails a local check --- the accumulated controls again, now doing their routine work --- repairs it and tries again; a candidate that fails the merge train\textquotesingle s gate is rejected without landing, and the work returns for another attempt. The engineer sees none of this. What reaches the engineer is the residue: failures that resist local repair, evidence the machinery cannot interpret, and --- the consequential class --- failures that implicate the engineering environment itself. Escalation, in this factory, is not a ticket queue; it is the moment a failure stops being an implementation problem and becomes an engineering one.
```

- Source: `book/latex/sources/part5/5.2-inside-docables-software-factory.tex`, lines 487–487.
- Source revision: `cf326ba6ea659b2c3d24fd32a5457be5391ff7e2`.
- Removal revision: uncommitted local edit.
- Reason: Preserved the original incident account while dating its merge-train response to the earlier arrangement.

```latex
\textbf{"Done" became a claim requiring independent evidence.} Two incidents, close together, made the rule non-negotiable. A lint gate hit a stray error, caught it in a catch-all that returned success, and let a run of commits land completely unlinted while the log said fine. A chain of pin tests passed green --- because a botched merge had landed them onto a tree missing the very field they were supposed to check. Both reported done; neither was. A report of "done" describes the producer\textquotesingle s claim, not the state of the repository, and the gap between the two is where a confident green hides. The durable response regenerated the evidence at the admission boundary: required tests and lints re-run against the actual candidate tree, gate failures made fail-loud --- a control cannot translate its own uncertainty into success --- and counts re-derived rather than accepted from the task report. The capital is not a standing habit of distrust; it is machinery that regenerates the evidence cheaply. That machinery is the merge train whose weekly funnel opened this subsection --- the same gate, measured in operation.
```

- Source: `book/latex/sources/part5/5.4-two-problems-of-factory-engineering.tex`, lines 28–28.
- Source revision: `cf326ba6ea659b2c3d24fd32a5457be5391ff7e2`.
- Removal revision: uncommitted local edit.
- Reason: Clarified the distinction between little inherited human organizational process and the substantial coordination process subsequently built for agents.

```latex
DocAble\textquotesingle s emphasis on tolerance was partly a consequence of the problem that produced it. Accessibility supplied external requirements, including legal obligations, that the resulting documents had to satisfy. The project was also a side effort run by one engineer. There was little organizational process to design, and neither time nor appetite to inspect every implementation decision made by coding agents. The practical objective was therefore to encode consequential requirements precisely enough that agents could change the system freely while the resulting software continued to satisfy them. At the time, this struck me as the obvious way to build an agentic software factory. Having now compared it with commercial factories, I can see that it was specifically the obvious way for an "organization" with one human engineer and no spare humans to supervise the agents.
```



## Factory walkthrough refinement and async-CI placement, 3 November 2026

- Source: `book/latex/sources/part5/5.2-inside-docables-software-factory.tex`, “The Factory in Operation,” lines 435–467.
- Source revision: working tree based on `cf326ba6ea659b2c3d24fd32a5457be5391ff7e2`; includes the earlier uncommitted factory-workflow draft archived above.
- Source excerpt SHA-256: `79519a6ebed2f1d0361894fde88341fd6bca388e6db9cd6a6e22d55e165d70cc`.
- Removal date: 2026-11-03; removal revision: the change introducing this entry.
- Reason: Author approved a compact Chapter 5 walkthrough with a table and process figure. The validation-bottleneck example is revised into Chapter 4, where it illustrates optimization of agent infrastructure. The installation gap and premature alert-resolution details are excluded at the author's request and preserved here. Existing appendix linkage is retained.

```latex
\section{The Factory in Operation}\label{heading:the-factory-in-operation}

% Evidence: 3 November 2026 factory lecture, slides 4--12 and 18--24, and its index.md.
% This operating description postdates the 31-week reconstruction above.
% <!-- section-terms: governance-conversion, governed-engineering-environment -->
% <!-- point: the-mature-production-flow | The November factory turns priorities into reviewed work orders, parsed phase dependencies, scoped dispatch briefs, and independently examined completion evidence. -->

\subsection{From a Priority to Completed Work}\label{heading:from-a-priority-to-completed-work}

How does one engineer keep several agents working without continually prompting each one? By November 2026, I directed DocAble's work through a strategy document containing deployment requirements and near- and longer-term priorities. Selecting a substantial change started a planning process. An agent developed an epic: a persistent work order recording the goal, relevant engineering models, proposed design, validation obligations, and implementation phases. Another agent reviewed the plan; consequential questions that remained unresolved came back to me. This gave the orchestrator a plan it could execute while leaving priorities and unresolved engineering decisions with the engineer.

The plan connected engineering intent to scheduling. Its phase table recorded dependencies and model assignments in a form the orchestrator could parse. A phase defining an interface could precede several implementation phases; those phases could proceed concurrently once their prerequisites existed. Each agent received a brief stating its scope, relevant source and models, verification work, and expected hand-back, and worked in an isolated Git worktree. Isolation separated working directories; integration still had to establish whether the changes worked together.

% <!-- point: task-scoped-context-connects-models-to-dispatch | Dynamic context injection supplies task-specific knowledge at dispatch and after planning; its extraction gate requires discovery, while separate controls enforce selected obligations. -->

DocAble selects task-specific engineering knowledge through dynamic context injection (\magevalue{sec:the-agent-stack}). The initial work order supplies an anticipated file set; after planning, the agent repeats the extraction using its refined scope. A pre-commit gate requires evidence that discovery occurred, while separate controls enforce selected obligations. This lets the factory maintain a large modeling substrate without placing all of it into every agent's context.

Completion required another examination of the work. The implementation agent's first commit recorded its refined plan, and subsequent commits recorded progress against it. A separate agent then checked the epic's Definition of Done against the integrated changes and their evidence, routing deficiencies back for repair. Commit metadata could expose missing steps; deciding whether the implementation met its intended purpose still required judgment. The factory combined mechanical checks with agent review, using each for questions it could answer. {[}appendix: appendix-d-a-worked-factory-workflow{]} gives the artifact relationships and a worked operating example.

\subsection{Moving Expensive Validation off the Merge Path}\label{heading:moving-expensive-validation-off-the-merge-path}

% <!-- point: repair-is-cheap-escalation-is-the-signal | Earlier merge-train checks returned failed candidates for repair before admission; later periodic checks also exposed faults after integration, while failures in the process itself required engineering intervention. -->

The placement of validation changed as the factory grew. In the earlier arrangement, each candidate queued for a merge train that rebuilt, re-linted, and re-tested the actual candidate tree before admitting it to the main branch. Failed candidates returned for repair. This regenerated evidence at integration, but increasingly made validation the bottleneck: completed changes arrived in batches more frequently than the full suite could finish. Increasing the number of implementation agents could not remove that downstream wait.

% Evidence: fast-land-async-ci-design-261103.md; factory lecture slides 26--27.
% The note reports deployment-scope lints, not every test running on each timer tick.
% <!-- point: validation-placement-became-a-factory-design-decision | Cheap checks stayed before merge, expensive checks moved to a periodic single-worker sweep, and detected blocking failures interrupted further dispatch; deployment retained a separate validation boundary. -->

I moved expensive checks out of the merge operation. Cheap checks remained synchronous; a periodic sweep examined the main branch in an isolated worktree, with a lock allowing only one sweep at a time. An intermediate implementation had started a background sweep after every merge, multiplying validation work as agents produced more changes and overloading the host. Making the sweep timer-driven separated its load from the number of merges. The dispatch gate was configured to refuse further ordinary work when a sweep reported a blocking failure, until the orchestrator acknowledged or resolved the alert. Deployment retained a separate full-validation step. This arrangement accepted temporary defects on the development branch and harder diagnosis across a batch of changes in exchange for less waiting at integration.

The new arrangement also needed validation. On November 3, I found that the periodic job had been declared but never installed; later, an alert was marked resolved while its failing check remained red. Declared configuration and recorded resolution were insufficient evidence that the intended behavior had occurred. These failures exposed obligations for the factory itself: verify that the scheduled checks actually run, and verify recovery before treating a failure as cleared. The experience shows a decision about the location and timing of checks, with continuing maintenance costs; it does not establish a measured throughput improvement or a fixed bound on defect exposure.
```


## Textbook-register refinement of the factory additions — 3 November 2026

Author requested a direct register pass over the new Chapter 4/5 material and reuse of the lecture’s CI visual. These working-tree passages are preserved before replacing abstract wording, clarifying discovery before implementation, and developing the reason combined changes still require validation. No additional case incidents are introduced.

Source: `book/latex/sources/part4/4.4-engineering-the-environment.tex`, lines 146–156; working tree based on `54233c034edb0bfa97ff23564e51d384f4ce821f`. Excerpt SHA-256: `8e6692a67ec755c13e8c941b15a2cbbf989b07a28d16a072f60b92fa28daed9b`.

```tex
\subsection{When Validation Becomes the Bottleneck}\label{heading:when-validation-becomes-the-bottleneck}

The performance reasoning used to redesign document processing also applies to the agents' infrastructure. Before a November 2026 redesign, completed DocAble changes arrived in batches roughly every ten minutes, while the full test suite took about thirty minutes. Agents could finish more work than the validation stage could process. Adding agents would lengthen the queue. The next engineering question concerned the checks: which had to pass before each merge, and which could examine several changes together?

An initial asynchronous arrangement launched expensive checks in the background after each merge. Merging no longer waited for them, but a burst of merges still launched a burst of validation workers and overloaded the host. The checking load remained coupled to the rate at which agents finished work. Moving a computation into the background had changed who waited for it; it had not reduced how often the computation ran.

The redesign kept inexpensive checks before merge and scheduled broad repository checks independently, on a thirty-minute timer. Each sweep examined the main branch in an isolated worktree, and a lock permitted only one sweep at a time. Several merges could therefore share a run without creating competing validation workers. A blocking failure raised an alert, and a gate stopped new dispatch until the orchestrator acknowledged or handled it. Acknowledgment required attention to the failure, while repair remained a separate task. Before deployment, the full validation suite ran again against the candidate being shipped.

This arrangement exchanged some detection speed for lower integration cost. A defect could remain on the main branch until a sweep found it, and a failure after several merges was harder to attribute than a failure immediately after one. The periodic checks therefore needed a response that could diagnose and repair failures, while deployment retained its own validation boundary. Optimizing the infrastructure required reasoning about both schedules and consequences: how much checking work each change caused, how long a defect could go unnoticed, and what could happen during that interval.

Other stalls require different diagnoses. Before adding another mechanism, establish what kind of problem you have.
```

Source: `book/latex/sources/part5/5.2-inside-docables-software-factory.tex`, lines 440–485; working tree based on `54233c034edb0bfa97ff23564e51d384f4ce821f`. Excerpt SHA-256: `2bb377d764b3478d9b61727be6931586a7cbed7f683f9252a73b6cd29ad8d850`.

```tex
\subsection{From a Priority to Completed Work}\label{heading:from-a-priority-to-completed-work}

How does one engineer keep several agents working without continually prompting each one? The workflow described here is the factory's November 3, 2026 configuration, following the measurements that end on October 14. I record priorities in a strategy document, including work that must precede the next deployment. An orchestrating agent selects ready work from that queue and coordinates its planning, implementation, and evaluation.

A planning agent develops an \emph{epic}, a persistent work order for a change that needs several phases. The epic records why the work is worthwhile and what would count as completion. Its design document states what must hold in the changed system and maps named invariants to tests or analyses. Those properties bound acceptable changes while leaving implementation choices open. A separate agent reviews the plan; unresolved engineering decisions return to me. \autoref{work-order-artifacts} distinguishes the artifacts by what they record and how the factory uses them.

{\footnotesize
\begin{longtable}[]{@{}
  >{\raggedright\arraybackslash}p{(\linewidth - 4\tabcolsep) * \real{0.22}}
  >{\raggedright\arraybackslash}p{(\linewidth - 4\tabcolsep) * \real{0.39}}
  >{\raggedright\arraybackslash}p{(\linewidth - 4\tabcolsep) * \real{0.39}}@{}}
\caption[DocAble's work-order artifacts]{The artifacts carry different decisions through the factory. Each has a reader or a mechanical consumer that uses it to direct or evaluate work.}\label{work-order-artifacts}\tabularnewline
\toprule\noalign{}
Artifact & What it records & How it is used \\
\midrule\noalign{}
\endfirsthead
\toprule\noalign{}
Artifact & What it records & How it is used \\
\midrule\noalign{}
\endhead
\bottomrule\noalign{}
\endlastfoot
Strategy & Priorities and prerequisites for deployment & The orchestrator selects the next work. \\
Epic work order & Scope, cost, phases, dependencies, completion criteria & The orchestrator schedules phases; the auditor evaluates completion. \\
Design document & Structure, invariants, required evidence & Agents plan changes and find the checks that cover each property. \\
Dispatch brief & One agent's assignment, scope, and verification & Checked before dispatch, then supplied to the agent in its isolated worktree. \\
Completion record & Landed changes and supporting evidence & An independent agent audits the result against the work order. \\
\end{longtable}
}

% <!-- point: task-scoped-context-connects-models-to-dispatch | An agent's refined target files let Query Repo retrieve relevant models, invariants, tests, and analyses before implementation; a separate check requires that discovery occurred. -->

The phase dependencies determine which agents can work concurrently, as \autoref{docable-work-order-flow} shows. The orchestrator dispatches ready phases into isolated Git worktrees. Each agent inspects its component and records a refined plan, including target files, in its first commit. Those files become inputs to \emph{Query Repo}, which retrieves the associated models, invariants, tests, and static checks. A pre-commit check requires a record that this discovery occurred. The agent can therefore consider known obligations before editing, instead of discovering them only when a check fails.

\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/docable-work-order-flow.pdf}
\caption[From engineering intent to completed work]{\emph{From engineering intent to completed work.} The orchestrator schedules independent phases from a reviewed work order, then an independent audit checks their integrated result against completion criteria and returns deficiencies for repair. Closing the work order and authorizing deployment are separate decisions.}
\label{docable-work-order-flow}
\end{figure}

Completed changes pass inexpensive checks before integration. Broader validation runs periodically against the combined code, and the deployment process reruns the full validation suite. \magevalue{sec:engineering-the-environment} explains the bottleneck that motivated this arrangement and the cost of delaying some checks. Separate worktrees isolate edits; checks on the combined result remain necessary.

% <!-- point: repair-is-cheap-escalation-is-the-signal | Checks and the completion audit return deficient work for repair; unresolved decisions and defects in the environment reach the engineer. -->

Finally, an independent agent audits the epic against its completion criteria. It checks that the expected changes landed and that the required evidence supports completion. Missing work or failed checks lead to repair and another review. Questions that resist repair, or expose a defect in the factory itself, return to the engineer. The work order closes after the audit accepts the result. {[}appendix: appendix-d-a-worked-factory-workflow{]} develops a worked example with the underlying artifacts.
```


## Chapter 2 opening — approved copyedits, 3 November 2026

The author approved `20-modeling-economics` and `20-docable-introduction`, with “projects” replacing “selects” and the sentence about regenerated figures removed. The economic explanation and the introduction are retained below for editorial history.

### 20-modeling-economics

Source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/part2/00-part-intro.md`; canonical native source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/00-part-intro.tex`, line 9. Source revision: `9e1a77eaf7b5a1b97922d357ea0947d7fea32f29` (working tree). Native excerpt SHA-256: `66083e4d7cb80ce5d0b7a0bae5a7a27c973e1435157034156ef90fd10dc3c0b0`. Replaced on 2026-11-03 with the author-approved revision.

```text
Explicit models have nevertheless remained secondary in much code-centric software practice because another representation costs work to create, maintain, and reconcile with a changing system. Commodity intelligence changes that economics. Agents can increasingly derive, regenerate, reconcile, and query structured representations cheaply. At the same time, rapid autonomous implementation increases their value: engineering knowledge that once needed to be reconstructed occasionally may otherwise be reconstructed across many tasks and fresh reasoning states.
```

### 20-docable-introduction

Source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/part2/00-part-intro.md`; canonical native source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/00-part-intro.tex`, line 36. Source revision: `9e1a77eaf7b5a1b97922d357ea0947d7fea32f29` (working tree). Native excerpt SHA-256: `44bff456a09adde3764dd14d9eff6ebe5819e9ce6bb957fc89607aa360653b9d`. Replaced on 2026-11-03 with the author-approved revision.

```text
DocAble is the running example—the production accessibility service introduced in {{chapter:problem}}. A document enters, remediation is distributed across workers and services, the result is validated, and a corrected document returns with a record of what changed. The real system is far more complicated than any single representation ahead. That is the point. Each model keeps only the relationships its question needs. The DocAble specifics ahead — models, mechanisms, and counts — describe the repository revision examined at the time of writing; the live system moves, and exact quantities belong to figures regenerated from it.
```

### Removed sentence from the reviewed introduction proposal

The author requested deletion on 2026-11-03; the sentence was present only in the proposal.

> Figures regenerated from the repository provide the exact quantities for that revision.


## Chapter 2 project knowledge — approved copyedit, 4 November 2026

Review item: `21-project-knowledge`. Source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/part2/2.1-context-is-the-first-modeling-problem.md`; canonical native source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, line 23. Source revision: `f1b29ecf9cc275407f0a6c8a74d5d9d922475597` (working tree). Native excerpt SHA-256: `e2fdbbe95ab437fcb77b01386b123d9a0b503cab5a312af2f6d74c22724d2951`. Replaced on 2026-11-04 with the author-approved explanation of repeated reconstruction, using “Fresh out of the box” to introduce the absence of project knowledge.

```text
A foundation model knows programming languages, frameworks, databases, distributed systems, cloud infrastructure, testing practices, security concepts, and common architectural patterns. It does not arrive knowing the particular system in front of it: its boundaries, history, conventions, ownership, or current engineering state. That knowledge is distributed across source, configuration, documentation, registries, history, and the people who maintain the system. An agent can reconstruct what a task needs from those artifacts, but reconstruction consumes reasoning and is easily repeated across tasks and reasoning states.
```


## Chapter 2 prose and engineering models — approved copyedit, 4 November 2026

Review item: `21-prose-and-engineer`. Source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/part2/2.1-context-is-the-first-modeling-problem.md`; canonical native source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, lines 48–52. Source revision: `d737a31806f469a5102501b1f72bef055dfbaf1f` (working tree). Native excerpt SHA-256: `4c0c091eae4d9bde9851bf8fd4305a86f7fad8658c3f98cf1edcac34e84f82a7`. Replaced on 2026-11-04 with the author-approved account of articulation, interpretation, and how constructing models helps engineers. The concluding possibilities use “may … may,” as requested.

```text
The problem is not only context-window size. Natural language is itself a representation, and often an appropriate one: it is cheap, expressive, and for many engineering questions entirely sufficient. But consequential engineering knowledge expressed only in prose has two difficulties. The engineer must articulate the relevant distinctions correctly, and each later reasoner — human or agent — must recover those distinctions correctly, in this task and again in the next. A structured model can preserve distinctions that would otherwise have to be restated or reconstructed. The representation can therefore change what both the engineer and the agent are capable of getting wrong. Some knowledge should stay in prose, and some judgment should stay human; {{chapter:theory}} returns to articulation and interpretation as separate sources of error with separate costs.

<!-- point: models-are-also-for-the-engineer | Models are not only for the agent but also for the engineer: a representation can make distinctions visible, force consequential decisions to be made explicitly, and expose omissions prose leaves easy to overlook, so its value does not depend entirely on the agent interpreting it better than natural language. | terms: modeling-principle -->

Models are not only for the agent. They are also for the engineer. A useful representation can make distinctions visible, force consequential decisions to be made explicitly, and expose omissions that ordinary prose leaves easy to overlook. Its value therefore does not depend entirely on whether an agent interprets it more accurately than natural language. Modeling improves the representation of engineering judgment before any agent attempts to act on it.
```


## Chapter 2 Modeling Principle and capacity — approved copyedit, 4 November 2026

Review item: `21-principle-capacity`. Source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/part2/2.1-context-is-the-first-modeling-problem.md`; canonical native source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, line 58. Source revision: `d737a31806f469a5102501b1f72bef055dfbaf1f` (working tree). Native excerpt SHA-256: `7d29733266817d74a762607bba046d15dee8b61a3ea9a8343b2b54aaaad00828`. Replaced on 2026-11-04 with the approved distinction between extending reasoning capacity and reducing the cost of manageable work. The canonical Modeling Principle is retained.

```text
**The Modeling Principle:** externalize engineering knowledge and intent into explicit, structured models that both engineers and agents can reason through. *In other words:* once a system exceeds what a reasoner can usefully hold in view, give recurring engineering questions purposeful representations.
```


## Chapter 2 requirements and specification practices — approved copyedit, 4 November 2026

Review item: `21-requirements-tradition`. Source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/part2/2.1-context-is-the-first-modeling-problem.md`; canonical native source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, line 60. Source revision: `d737a31806f469a5102501b1f72bef055dfbaf1f` (working tree). Native excerpt SHA-256: `aeb5c3628a9d2cafebec18d1f83bfa31cef24250456e6bfaef8ab345e13cbd62`. Replaced on 2026-11-04 with the approved explanation connecting software change to requirements and specifications, including concrete specification examples and a Chapter 2 then Chapter 3 signpost. Supporting citations are retained.

```text
Software engineering has long treated the externalization of intent as an engineering problem. Requirements engineering, for example, distinguishes stakeholder goals and environmental assumptions from specifications used to constrain a realization, and develops representations through which those claims can be analyzed, refined, and traced.[cite: zave1997darkcorners][cite: nuseibeh2000roadmap][cite: vanlamsweerde2009re] Important requirements may remain qualitative, incomplete, or dependent on assumptions about the environment. The inheritance MAGE takes from this tradition is the more basic move: make consequential engineering knowledge into an explicit object through which engineering can reason. {{chapter:alignment}} takes up the separate question of which obligations the engineered environment should enforce.
```


## Chapter 2 21-classical-implementation — approved copyedit, 4 November 2026

Review item: `21-classical-implementation`. Source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/part2/2.1-context-is-the-first-modeling-problem.md`; canonical native source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, lines 70–72. Source revision: `d737a31806f469a5102501b1f72bef055dfbaf1f` (working tree). Native excerpt SHA-256: `6ecbfde9766519eabe993ae24eb59ba4617800ce4bd76aef137ca12d23c8cbf5`. Replaced on 2026-11-04 following author approval. Uses implementation consistently with the Chapter 1 convention and the author’s latest instruction. Retains the existing explanation, citations, and stable identifiers.

```text
<!-- point: mage-reuses-established-modeling-traditions | These representations share one engineering move — choose a form in which the property of interest becomes easier to express, inspect, or analyze than in the realized artifact; MAGE proposes no new modeling language, and this chapter illustrates the technique through selected established models. | terms: modeling-principle -->

These representations differ in purpose and rigor, but they share the same engineering move: choose a form in which the property of interest becomes easier to express, inspect, or analyze than it is in the realized artifact. UML standardized notations for many structural and behavioral views,[cite: booch-uml] while requirements engineering developed representations for goals, assumptions, and specifications.[cite: vanlamsweerde2009re] MAGE does not propose a new modeling language. It does, however, use these established representations, and this chapter illustrates the technique through selected models.
```


## Chapter 2 21-models-in-agentic-work — approved copyedit, 4 November 2026

Review item: `21-models-in-agentic-work`. Source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/part2/2.1-context-is-the-first-modeling-problem.md`; canonical native source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, lines 74–76. Source revision: `d737a31806f469a5102501b1f72bef055dfbaf1f` (working tree). Native excerpt SHA-256: `c3d0389b50173f82a5ba9b91b81817c0fdbe27567e71cb2f5d189be09d13ddf1`. Replaced on 2026-11-04 following author approval. Restores the original argument at the author’s request. Uses agents consistently in place of the switch between commodity intelligence and generative implementation, and retains the proposed closing sentence about construction and upkeep.

```text
<!-- point: mage-adopts-the-classical-move-under-changed-economics | What changes is the economics: commodity intelligence makes explicit representations cheaper to build and use, generative implementation makes them more valuable, and models can become part of the engineered environment through which agents work. | terms: modeling-principle, alignment-principle -->

What changes is the economics. Commodity intelligence makes structured representations cheaper to construct, maintain, and consume; generative implementation simultaneously increases their leverage, because engineering knowledge must remain available across an increasing volume of autonomous work. Models can become part of the engineered environment through which agents work, preserving that knowledge across reasoning episodes and making selected properties available for Alignment.
```


## Chapter 2 21-architecture-implementation — approved copyedit, 4 November 2026

Review item: `21-architecture-implementation`. Source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/part2/2.1-context-is-the-first-modeling-problem.md`; canonical native source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, lines 92–92. Source revision: `d737a31806f469a5102501b1f72bef055dfbaf1f` (working tree). Native excerpt SHA-256: `3d25fdaaccec5a29dca323ba01920af2e8204a0cd1ad3762d85d4f6c4ebb7d43`. Replaced on 2026-11-04 following author approval. Uses implementation consistently with the Chapter 1 convention and the author’s latest instruction. Retains the existing explanation, citations, and stable identifiers.

```text
> Software makes the relationship between model and realization unusually fluid because both are made of information. A schema can generate code; a state machine can drive behavior; a policy model can generate configuration; a dependency graph can become an execution plan. Such a representation can participate directly in the system while remaining selective about what it represents.
>
```


## Chapter 2 reduction and entitlement preview — approved copyedit, 4 November 2026

Review item: `21-entitlement-preview`. Source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/part2/2.1-context-is-the-first-modeling-problem.md`; canonical native source: `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, lines 113–115. Source revision: `d737a31806f469a5102501b1f72bef055dfbaf1f` (working tree). Native excerpt SHA-256: `4969ffbe863a99d381300e99ff1527d3e4b653ae6a4c68db16673ce9952d46aa`. Replaced on 2026-11-04 with the approved hypothetical prepaid-credit and unlimited-subscription example. The example explains how a model can contain accurate information yet omit a distinction required for its decision, while leaving the detailed DocAble case for later in the chapter.

```text
<!-- point: a-reduction-must-preserve-the-distinctions-its-question-requires | A representation can contain accurate information and still be inadequate because its output cannot express a consequential case; a DocAble entitlement failure later in the chapter shows a reduction discarding a distinction the code had observed. | terms: model-as-map, modeling-principle -->

Reduction is useful only if it preserves the distinctions the engineering question requires. A representation can contain accurate information and still be inadequate because its output has no way to express a consequential case. Later in this chapter, a DocAble entitlement failure shows exactly this: code observed that a group carried unlimited entitlement, then reduced entitlement to a finite-credit scalar that could not represent *unlimited* — the sum deliberately excluded the unlimited groups the code had just identified. An unlimited user became zero credits. The missing distinction produced a production failure and, in response, an explicit decision model.
```


## Chapter 2 tolerance, freedom, and implementation-space figure — approved revision, 4 November 2026

Review item: `21-tolerance-and-freedom`, including `21-figure-implementation-space`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, lines 119–124. Source revision: `ea4b6f751685ae6ecc0a1a19035edbc4b751aaf5` (working tree). Native excerpt SHA-256: `4aee3f2c822f8343a874308b61bcdc10f2f24fe77feeff94a3f50f6fa1a97ee9`. Applied on 2026-11-04 after author approval. Restores the teaching progression, distinguishes tolerance from remaining implementation choices, and moves the existing figure from the later implementation-space discussion to the sorting example. The figure now illustrates alphabetical order and the response-time bound; its stable label is retained for later references. The superseded figure and proposal sources are preserved in `tolerance-figure-before-2026-11-04.json` beside the review history.

```text
<!-- point: reduction-preserves-degrees-of-freedom | Obligations rarely fix one realization; a tolerance bounds permitted variation, a degree of freedom is a choice left open. | terms: model-as-map, scope-of-modeling, degrees-of-freedom, tolerance -->

### Tolerance and degrees of freedom

The suppressed detail has a realization-side consequence. Engineering obligations rarely determine a single acceptable realization. They constrain some variation and leave other choices open. This book uses two engineering terms for that distinction. A tolerance bounds the variation that an obligation permits; a degree of freedom is a realization choice left open because the governing obligations do not distinguish among its acceptable alternatives. Purposeful reduction therefore does two things at once: it represents the distinctions the engineering question requires while declining to settle choices that do not matter to that question. MAGE does not seek to close those degrees of freedom merely because they could be specified.
```

Original figure placement and caption:

```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/realization-space-2a3916a20a.pdf}
\caption{\emph{Obligations bound a realization space without selecting one realization.} Each region contains implementations satisfying one engineering obligation; their intersection contains implementations satisfying both. The points within that intersection may differ substantially in structure and implementation while remaining acceptable under the represented obligations. Those remaining choices are realization degrees of freedom.}
\label{realization-space}
\end{figure}
```


## Chapter 2 deferred implementation decisions — approved copyedit, 4 November 2026

Review item: `21-deferred-implementation`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, lines 144–147. Source revision: `ea4b6f751685ae6ecc0a1a19035edbc4b751aaf5` (working tree). Native excerpt SHA-256: `83cc8e926a4d1167a4c98070d67e652130ab452c91094e93fe410683a631a855`. Replaced on 2026-11-04 following author approval: introduce the two reasons through a teaching question, and use implementation consistently. The remaining proposed explanation is retained.

```text
<!-- point: freedom-defers-commitment | Preserving a degree of freedom defers a decision to a reasoner better positioned to make it: information may arrive later, and the realizing agent can acquire evidence before deciding. | terms: degrees-of-freedom, scope-of-modeling -->

Preserving a degree of freedom can defer a decision to a reasoner better positioned to make it. There are two distinct reasons. First, information may arrive later. The target environment, surrounding implementation, workload, available components, or consequences of earlier choices may not be known when the model is constructed. A decision made during realization can use information that an earlier decision could not. Second, the realizing agent can actively acquire evidence before deciding. It can construct alternatives, run pilots, benchmark them, measure their consequences, and tune the realization to its environment. Human engineers can of course do the same, as can evolutionary algorithms, autotuners, search procedures, and other optimization mechanisms. What changes with commodity intelligence is how broadly and cheaply this kind of exploration can be applied during ordinary realization. Closing a degree of freedom early can therefore replace a later, evidence-informed decision with an earlier guess. Engineering should constrain the choices whose consequences matter now while preserving choices that can be made better during realization.
```


## Chapter 2 21-parsimony — approved copyedit, 5 November 2026

Review item: `21-parsimony`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, Tolerance and degrees of freedom, lines 150–172. Source revision: `bcb99c75472c4aa01bf731ac069edb6e487fcd04` (working tree). Native excerpt SHA-256: `d2e97f94e54b57826f4f614d7fbf482b7b83cf358666a5f2943f2fffca1329f9`. Replaced on 2026-11-05 following author approval. Reason: Preserves the complementary top-down/bottom-up test and both failure directions. Replaces “Degrees of freedom reasons” and “Parsimony reasons” with engineers’ questions, removes two premature case previews, and keeps the useful return from a general rule to revision under evidence. Defines parsimony inline at first use as keeping only what is needed. Briefly recalls the distinction lost in the earlier subscription example, uses parsimonious consistently, and combines the explanation following the two failure-direction bullets into one paragraph.

```text
Parsimony provides the complementary test. Degrees of freedom reasons from the engineering obligation outward: what must the model preserve, and what may remain unspecified? Parsimony reasons from the proposed model inward: which of the distinctions it contains are actually required by the engineering question? A distinction that contributes neither to the question nor to a consequential obligation should earn its place or be removed. The aim is therefore not the smallest model, but the smallest model adequate to its purpose.

<!-- point: reduction-fails-in-either-direction | Reduction fails in either direction: too little reproduces complexity and may needlessly constrain realization, while too much erases a consequential distinction. | terms: degrees-of-freedom, modeling-principle -->

Adequacy fails in either direction.

- **Too little reduction** — unnecessary distinctions reproduce the complexity the model exists to escape: they consume attention, create obligations to keep model and realization in correspondence, and may needlessly constrain realization.
- **Too much reduction** — a consequential distinction disappears.
- **A parsimonious reduction** — enough structure to preserve the obligation, plus whatever scaffolding this reasoner actually requires.

<!-- point: mage-prefers-adequate-reductions-not-more-models | MAGE prefers adequate purposeful reductions, not more detailed models or stronger semantics; both detail and semantic precision must earn their carrying cost. | terms: modeling-principle, degrees-of-freedom, semantic-commitment -->

MAGE therefore does not prefer more detailed models. It prefers adequate purposeful reductions, and sometimes the engineering improvement is deleting modeled structure. Nor, as a later section of this chapter shows, does MAGE prefer stronger semantic commitments merely because they are available. Both detail and semantic precision must earn their carrying cost. The examples ahead supply the boundary cases of this criterion: an ownership model whose omission proved genuinely free, and the entitlement reduction whose omission proved consequential.

<!-- point: models-are-provisional-engineering-judgments | Degrees of freedom asks what present obligations permit leaving open; parsimony asks whether represented distinctions earn their place; neither judgment is final, because experience may reveal an omitted distinction was consequential or a represented one unnecessary. | terms: degrees-of-freedom, modeling-principle -->

Degrees of freedom asks what our present engineering obligations permit us to leave open. Parsimony asks whether the distinctions we currently represent earn their place. Neither judgment is final: experience may reveal that an omitted distinction was consequential, or that a represented distinction was unnecessary. A model records a provisional engineering judgment.
```


## Chapter 2 21-quantitative-margin — approved copyedit, 5 November 2026

Review item: `21-quantitative-margin`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, Tolerance and degrees of freedom, lines 174–180. Source revision: `bcb99c75472c4aa01bf731ac069edb6e487fcd04` (working tree). Native excerpt SHA-256: `aa88541c2d0ca10ca42c84a446006262aed1216aabb61d74fb37a33da3d931f3`. Replaced on 2026-11-05 following author approval. Reason: Develops the existing point with the preceding latency example. Replaces “a numeric bound is rarely a single line,” “capacity envelope,” and “both statable” with the quantities and judgments a model supports. It does not add a new numerical claim. Companion terminology changes use implementation consistently with Chapter 1 and the author’s request.

```text
<!-- point: software-tolerance-is-often-qualitative | In software a tolerance can be numeric but is often qualitative, because code owes more to discrete mathematics than to continuous media. | terms: tolerance, degrees-of-freedom -->

In software engineering, a tolerance can be numeric but is often qualitative. A latency budget may set a numerical bound: a response must complete within 200 ms. Coupling admits an intermediate form: an architecture may tolerate dependencies up to a measured threshold while also distinguishing kinds of coupling that are acceptable or prohibited. Other architectural tolerances are primarily qualitative: one component may depend on another through a declared interface but not reach directly into its implementation. The difference partly follows from the medium. Physical engineering often concerns continuous quantities such as length, voltage, pressure, or temperature, so tolerances naturally take numerical form. Software structures and behaviors are largely discrete—types, sets, relations, graphs, states, and transitions—so tolerances often define sets of acceptable realizations instead.

<!-- point: a-measurement-model-can-carry-a-margin-not-just-a-target | Even a numeric bound is rarely a single line — a budget carries a margin, a capacity envelope leaves headroom — so a quantitative model can represent the band of acceptable variation, not just a target. | terms: tolerance -->

Even a numeric bound is rarely a single line. A budget usually carries a margin; a capacity envelope leaves headroom. A quantitative model can represent not just a target but the band of acceptable variation around it, so that "within tolerance" and "over the line" are both statable.
```


## Chapter 2 implementation space — approved copyedit, 5 November 2026

Review item: `21-implementation-space`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, Tolerance and degrees of freedom, lines 180–184. Source revision: `bcb99c75472c4aa01bf731ac069edb6e487fcd04` (working tree). Native excerpt SHA-256: `91a00944c6fb52f99b8634f3b41d4d62b21f0b27ead15516c0d02e919d2f7e08`. Replaced on 2026-11-05 following author approval. Reason: identify software itself as the medium, use implementation consistently, and clarify the transition to the economics of agent implementation, with the final sentence break requested by the author.

```text
<!-- point: obligations-bound-a-region-without-choosing-a-point | Obligations bound the space of acceptable realizations without selecting a point; commodity intelligence makes exercising that freedom cheap, so Modeling names the consequential distinctions and Alignment enforces selected boundaries. | terms: degrees-of-freedom, tolerance -->

Software's medium compounds this: because programs are constrained less by physical material than by the information they must accept, produce, and preserve, different implementations can satisfy the same obligations, so the space of acceptable realizations is often large.[cite: brooks1987] There are often many right answers. Engineering need not choose one point in that space merely because it could. It can instead specify the properties that distinguish acceptable from unacceptable realizations and leave the remaining choices open. Good engineering constrains the choices that matter and deliberately leaves the rest free. Commodity intelligence changes the economics of exercising that freedom: once realization becomes cheap, an autonomous reasoner can construct and revise implementations inside a space that would previously have been expensive for human engineers to explore. Modeling identifies the consequential distinctions; Alignment can enforce selected boundaries. The rest remains available to realization.

[ref:realization-space] illustrates this relationship in the sorting example: the requirements bound an acceptable region without selecting one implementation.
```


## Chapter 2 capability and omission — approved copyedit, 5 November 2026

Review item: `21-capability-and-omission`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, Tolerance and degrees of freedom, lines 188–197. Source revision: `bcb99c75472c4aa01bf731ac069edb6e487fcd04` (working tree). Native excerpt SHA-256: `ff40d06475f61a557de607dbc2ec9ff04d15e5b5066c92c52f364176408c8665`. Replaced on 2026-11-05 following author approval. Reason: Emphasizes that the engineering problem sets the system’s obligations, regardless of who implements it. Applies the capability/scaffolding distinction to both humans and agents. Removes the repeated entitlement example and folds its remaining qualification into one sentence: the actor still needs the relevant information, in the model or from other evidence. Uses implementation consistently and retains the existing figure reference and proposed caption.

```text
<!-- point: capability-moves-the-specification-boundary-not-the-obligation | The obligation boundary is set by the engineering problem and does not move with agent capability; the specification boundary can move — greater capability reduces required scaffolding but cannot recover omitted semantics. -->

How much must be written down depends partly on who realizes it. The engineering obligation determines what must remain true; a particular engineer or agent may also need representational scaffolding — examples, decomposition, intermediate constraints — to interpret and realize that obligation reliably. Obligation plus scaffolding form the specified region, and its two boundaries behave differently ([ref:specified-region]). The obligation boundary is set by the engineering problem, and agent capability does not move it: a more capable agent does not make a required ordering optional or a consequential distinction irrelevant. The specification boundary can move, because a more capable agent needs less scaffolding. Capability can reduce how much we must specify. It cannot reduce what must be true. The limit is semantic: capability can bridge omitted scaffolding, but it cannot recover omitted semantics — a distinction reduced away is not reconstructible downstream.

<!-- label: specified-region -->
<!-- figure: assets/specified-region.svg | *Obligation, scaffolding, and degrees of freedom.* The engineering obligation establishes the minimum consequential content that must be preserved. A particular agent may require additional scaffolding to interpret and realize that obligation reliably. Greater agent capability can reduce this scaffolding and enlarge the realized degrees of freedom, but it does not change the obligation itself. -->
```


## Chapter 2 freedom and uncertainty — approved copyedit, 5 November 2026

Review item: `21-free-implementation-choices`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, Not every unmodeled choice is free, lines 201–226. Source revision: `bcb99c75472c4aa01bf731ac069edb6e487fcd04` (working tree). Native excerpt SHA-256: `094c16599815226438e3cce13edff5186ec6b9f5aade275cc7afc9feb7cbb051`. Replaced on 2026-11-05 following author approval. Reason: Recalls the earlier distinction between known freedom and uncertainty, then merges the inset’s opening paragraphs around the new lesson: models can help engineers discover obligations they have not yet recognized. Keeps the closing explanation of why modeling can precede specification. Names the reviewer in the diagnostic and sets “NOT THAT!” in bold italic. Retains implementation terminology and stable identifiers.

```text
<!-- point: tacit-obligation-vs-genuinely-free | A tacit obligation can look free; the "not that" test reveals a boundary that was never written down. | terms: degrees-of-freedom, tolerance, modeling-principle -->

### Not every unmodeled choice is free

This also distinguishes tacit obligations from genuinely free choices. An unmodeled choice can look open even when engineers would reject some realizations of it. Then the choice was never wholly free. Human judgment was already imposing a boundary. What was missing was an explicit representation of the obligation or its tolerance. A genuinely free choice is different. Once the governing obligations are accounted for, engineering has no reason to distinguish among the remaining alternatives. A useful diagnostic follows: if a realization would provoke *not that*, some consequential boundary remains, whether or not anyone has written it down.

<!-- point: unknown-tacit-explicit-free-are-states | Whether a choice is tacitly bounded or genuinely free is a present state, not a fixed one; it changes as engineers learn from the system. | terms: degrees-of-freedom, modeling-principle -->

Whether a choice is tacitly bounded or genuinely free can change as engineers learn from the system. A region initially treated as free may expose a consequential distinction; investigation may also show that a suspected distinction does not matter.

<!-- point: modeling-can-precede-complete-specification | Modeling can begin before specification is complete; a reduction can make variation tractable so distinctions can be discovered. | terms: modeling-principle, alignment-principle, degrees-of-freedom -->

<!-- box-family: inset -->

<!-- inset-domain: ENGINEERING -->

> #### Inset — Uncertainty and unknown unknowns {#inset-uncertainty}
>
> Engineering distinguishes a choice deliberately left open from one whose consequences are not yet understood. The first is a degree of freedom. The second is uncertainty. In the harder case—sometimes called an unknown unknown—engineering has not yet recognized the consequential property, interaction, or failure well enough to ask the right question about it. An unmodeled region therefore should not be assumed to be free merely because no obligation has been stated.
>
> A model cannot directly represent what engineering has not yet recognized. It can, however, make uncertainty more inspectable. By reducing a complicated system to selected entities, relations, states, quantities, or alternatives, a model can make variation and interaction easier to compare and trace. Unexpected behavior can then expose distinctions that were difficult to see in the realized system directly. A degree of freedom is known freedom; uncertainty is not.
>
> This is one reason modeling can precede specification. Sometimes engineers construct a model because they know which property must hold. Sometimes they construct one to discover which properties matter.
```


## Chapter 2 revision under evidence — approved copyedit, 5 November 2026

Review item: `21-revision-evidence`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, Constructing and Revising a Model, lines 264–264. Source revision: `bcb99c75472c4aa01bf731ac069edb6e487fcd04` (working tree). Native excerpt SHA-256: `3a63ee861b9892d3af47dd7211deb7b7209c73df8a7ec63feb7da6fa7c084111`. Replaced on 2026-11-05 following author approval. Reason: Stops at “The later examples show both possibilities” as requested. Names the two possibilities before that sentence so the brief forward reference remains clear, and leaves the case details for their later treatment.

```text
Neither direction guarantees the boundary is right. Analysis, implementation, measurement, or failure may reveal that an omitted distinction mattered or that an included one did not. When the evidence changes the engineering judgment, revise the model. This is the theoretical role the chapter's two boundary cases play. The ownership model ahead is evidence that an omitted distinction really was a degree of freedom: the omission survived contact with the system. The entitlement reduction is evidence that an omitted distinction was consequential, so it is not merely a bad reduction. It demonstrates model revision under evidence: the engineer judged a distinction collapsible, and production proved otherwise.
```

## Chapter 2 executable and mental models — approved copyedit, 5 November 2026

Review item: `21-executable-model-implementation`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, executable models and Constructing and Revising a Model, lines 242–256. Source revision: `9b35ec3658316edbd35819102f1ee77079b7d7ca` (working tree). Native excerpt SHA-256: `477fc728e914f8137f4db79f22fed08b097c85dd5ba6ea643ab4a6e25704c857`. Replaced on 2026-11-05 following author approval. Reason: Answers the two developed objections in turn. Removes the authorization detour, retains limits of type-system expressiveness and the smaller class view, and describes the worker-pool model as the engineer’s mental reduction of the implementation. A brief Magritte footnote distinguishes representation from object. The queue-growth question tests the model’s sufficiency. The general discussion now opens Constructing and Revising a Model and leads into the judgment of choosing distinctions.

```text
<!-- point: a-reduction-first-even-when-executable | A model is a reduction first, even when it runs; executability changes what you can DO with it, not whether it abstracts. | terms: model-as-map, executable-source-of-truth -->

A representation remains a purposeful reduction even when it is executable. Some models in this chapter participate directly in execution or analysis: machines query them, derive artifacts from them, generate from them, or check properties over them. Software can therefore make the distance between architectural representation and realization unusually small. Executability changes what a model can do; it does not make the model a complete representation of the system. That is why the examples ahead are drawn as reductions before their implementations are discussed: the abstraction should remain visible apart from its encoding.

## Constructing and Revising a Model

<!-- section-terms: modeling-principle, degrees-of-freedom -->

<!-- point: purposeful-reduction-is-judgment-not-algorithm | Purposeful reduction is a judgment process, not an algorithm: no procedure takes an engineering question and returns the right model, so the engineer reasons toward the boundary from more than one direction and revises it as evidence arrives. | terms: modeling-principle, degrees-of-freedom -->

Purposeful reduction is a judgment process, not an algorithm. No procedure takes an engineering question and returns the right model. The engineer reasons toward the boundary — what the model must preserve, what it may leave free — from more than one direction, and revises it as evidence arrives.

<!-- point: reason-top-down-from-the-question | Reasoning top-down from the question asks what must remain true and which distinctions expressing or evaluating that obligation requires; the model preserves those, and the remaining realization choices stay free. | terms: degrees-of-freedom, tolerance -->

One direction is top-down, from the question. What must remain true? Which distinctions are required to express or evaluate that obligation? The model preserves those; the remaining realization choices stay free.
```


## 2026-11-05 — Semantic-commitment implementation terminology

Review item: `21-semantic-implementation`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`. Source revision: `b7983dd7acab4f3dd66be70d36a8d5435151323e` (working tree). Native excerpt SHA-256: `6988a5ad4af9cac218a0bcc38c7b33905b9548a691f212bd6140d18831f3c6bc`. Author approved the proposed terminology changes; the original is preserved below.

<!-- point: stronger-semantics-buy-capabilities-and-create-obligations | Stronger semantics buy capabilities and create obligations; they are not inherently better. | terms: semantic-commitment, degrees-of-freedom -->

Greater semantic commitment buys capabilities, but it also creates obligations. More precise representations can be harder for people to author and read. Their concepts must be defined, their types and relationships maintained, and their correspondence with the realized system preserved. Stronger semantics are therefore not inherently better. The appropriate question is what the representation must support.

<!-- point: the-spectrum-in-concrete-artifacts | Concrete artifacts illustrate the range; the rows are examples, not maturity levels. | terms: semantic-commitment, degrees-of-freedom -->

[ref:semantic-commitment-spectrum] illustrates the range with concrete modeling artifacts, from an informal sketch through UML 2.5.1[cite: omg2017uml] and OpenAPI/JSON Schema to SysML v2 and its semantic foundation, KerML.[cite: omg2025sysml][cite: omg2025kerml] The rows are not maturity levels: stronger semantic commitment is useful only when the resulting precision and machine operability justify its cost. Nor does stronger semantics necessarily close more degrees of freedom. A SysML model may say less about a realization than an elaborate natural-language specification while saying what it does say much more precisely. Amount specified and precision of meaning are separate axes.

<!-- label: semantic-commitment-spectrum -->
<!-- table: *Semantic commitment is not model completeness.* The rows are examples, not maturity levels: a representation can define precisely what its modeled distinctions mean while deliberately leaving most realization choices open. [short: Degrees of semantic commitment, in concrete artifacts] -->
| Semantic commitment (example) | Semantics supplied by the representation | Interpretation burden | Remaining realization freedom | Agentic implication |
|---|---|---|---|---|
| **Mostly implicit** (Informal box-and-arrow architecture sketch) | Almost none beyond marks and labels; the team supplies what boxes and arrows mean | Low for readers who share the context; high for anyone who does not | Very large | Agent must infer both the intended semantics and the realization |
| **Notation with standardized semantics** (UML 2.5.1 state-machine diagrams) | Standardized model elements and relationships give diagrams meanings beyond their visual appearance | Requires notation knowledge and project context | Large; UML generally describes selected aspects rather than determining a program | Agent has substantially more structure to interpret, but considerable design and implementation remain |
| **Machine-readable structured model** (OpenAPI 3.1 / JSON Schema; a typed repository model such as DocAble's registries and schemas) | Named entities, types, fields, constraints, references, and relationships are directly machine-readable | Structure is explicit, but domain intent remains contextual | Often still large: a schema can constrain externally relevant properties while leaving implementation open | Agent can query and transform explicit structure rather than reconstructing it from prose or code |
| **Semantically defined engineering language** (SysML v2 + KerML 1.0) | Abstract syntax, types, relationships, expressions, constraints, and semantic foundations are defined as part of the language; machine-readable interchange is standardized | Substantial language and tool knowledge, but less semantics to reconstruct | Potentially very large: precise semantics do not imply complete specification | Tools can reliably interpret and compose more of the model; agents can reason over model elements and tool-produced results rather than rediscovering their meaning |

<!-- point: the-columns-are-not-one-progression | Stronger commitment aids mechanical interpretation; it moves interpretation burden rather than removing it. | terms: semantic-commitment -->

The columns do not form a single progression from weak to strong engineering. Greater semantic commitment usually makes more mechanical interpretation possible, but it does not simply lower the interpretation burden — it relocates it. An informal sketch asks almost nothing of a reader who already shares its context and a great deal of one who does not; a semantically defined language asks for language and tool knowledge up front, and in exchange leaves less meaning to be reconstructed each time the model is read. What changes across the rows is where the interpretive work is done, and by whom.

<!-- point: semantic-precision-is-not-generative-completeness | Semantic precision and generative completeness are different properties. | terms: semantic-commitment, degrees-of-freedom -->

This distinction matters particularly for generative implementation. Semantic precision and generative completeness are different properties. A model can have precisely defined meaning while remaining radically incomplete as a program. Conversely, a detailed prompt can say a great deal about an intended implementation while leaving much of its meaning informal. The question is not whether a model can generate the code. The question is which decisions the engineer has made explicit and which decisions the implementor remains authorized to make.


## 2026-11-05 — Learning from implementation

Review item: `21-learning-from-implementation`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, lines 286–298. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `8f4d127f3b328ac17d26bd9a71a60db918fd5150eeb8542248cd8b7e41d1921c`. Removed on 5 November 2026 after author approval. Replaced the compressed account of prototyping with the approved explanation of learning from implementation and recording reusable engineering knowledge.

```markdown
<!-- point: the-most-important-evidence-comes-from-realization | The most important instance of revising from evidence is learning from realization itself. | terms: modeling-principle -->

The most important instance of revising from evidence is learning from realization itself.

### Implementation can induce a model

<!-- point: the-direction-also-runs-in-reverse | The chapter has so far run from question to model to realization, but the direction also reverses: a cheap exploratory realization can expose constraints, tradeoffs, state distinctions, dependencies, and bounds that were invisible on paper. | terms: modeling-principle, degrees-of-freedom -->

The chapter has so far run in one direction: from question to model to realization. The direction also reverses. A cheap exploratory realization can expose a constraint, a tradeoff, a state distinction, a dependency, a bound that was invisible on paper — distinctions no one knew to ask about.

<!-- point: a-prototype-preserves-a-realization-not-the-knowledge | A prototype preserves a realization but not necessarily the engineering knowledge learned from it; after probing, extract the durable relationship into an explicit representation, or deleting the prototype deletes the knowledge. | terms: modeling-principle, externalized-knowledge -->

A prototype preserves a realization, but not necessarily the engineering knowledge learned from it. After probing, extract the durable relationship into an explicit representation; otherwise deleting the prototype deletes the knowledge. The probe answers a question without preserving the answer. The model is the artifact that preserves it.
```


## 2026-11-05 — Preface: assurance and efficiency

Review item: `preface-assurance-and-efficiency`. Source: `book/latex/sources/frontmatter/0.5-preface.tex`, Preface, line 30. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `fe94a76d11a76650af7924443cbe58265b465b8664b4baa85923d745c60c3f66`. Removed on 5 November 2026 after author approval. Replaced the general statement about recurring engineering effort with the approved distinction between human assurance and agent efficiency, including lower cost and use on more complex systems.

```markdown
MAGE identifies recurring engineering work, including reconstructing system knowledge and reviewing decisions, and asks which models or mechanisms could reduce that effort.
```


## 2026-11-05 — Tools and engineering decisions

Review item: `21-tools-and-decisions`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, Tools inset, lines 415–419. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `7abfed80c56446c31f4ae9efbeb2211b20234c24637d0f8316135bbcb201ff43`. Removed on 5 November 2026 after author approval. Retains the engineering position and developed examples while naming engineers as the actors, clarifying the recorded ownership query, and keeping implementation terminology consistent.

```markdown
> MAGE seeks to move suitable work out of probabilistic reasoning and into engineered mechanisms. Today's agent harnesses do this partly through tools. A tool gives the agent an engineered capability it can invoke: querying repository state, parsing a file format, running a compiler, inspecting a dependency graph, applying a transformation, or executing some other operation whose mechanics need not be reconstructed through model reasoning each time.
>
> Tools change the division of labor inside the engineered system. Suppose an agent needs to determine which component owns a file. It might infer ownership from directory names, nearby code, and documentation. Or the environment might maintain an ownership model and expose a query over it. In the second case, the agent still has to decide why ownership matters and what to do with the answer, but it no longer has to infer the answer from indirect evidence. The same move applies to parsing, dependency analysis, schema validation, code transformation, and many other operations: suitable work can move from probabilistic reconstruction into mechanisms whose behavior is engineered directly. Merely exposing a tool does not guarantee that the agent will invoke it when appropriate, so consequential uses may need to be built into the surrounding workflow or checked at an enforcement boundary.
>
> This is why MAGE's concern is broader than tool use. A tool is one contemporary interface through which an engineered environment can expose knowledge or capability. The deeper design question is what the probabilistic implementor should actually have to realize. As more knowledge and suitable operations move into models, queries, transformations, validators, and other engineered mechanisms, reasoning can be concentrated on the decisions that still require it.
```


## 2026-11-05 — Name the uses of structure instead of an accumulating capability ladder

Review item: `21-model-capabilities`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, lines 446–454. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `411247e8f32c07ff7d8ed346124203f965bfb7993e8ffc34ff2346be5dbd5086`. Removed on 5 November 2026 after author approval. Applied the approved heading and paragraph, including the author’s short-sentence edits and removal of the required-sequence clause. The stable heading label is retained.

```text
\section{Representations Support Accumulating Capabilities}\label{heading:representations-support-accumulating-capabilities}

% <!-- section-terms: modeling-principle, alignment-principle, capability-ladder -->

% <!-- point: capability-comes-in-rungs | Increasing semantic commitment can make additional capabilities possible — not a required sequence or maturity model. | terms: capability-ladder, structured, semantic-commitment -->

% <!-- index-def: capability-ladder -->

Increasing semantic commitment can make additional capabilities possible: typed relationships, machine-checkable properties, derivation, generation, traceability, composition, querying, and checking. These capabilities do not arrive in a required sequence, nor do they define a maturity model. Different representations make different commitments because they serve different engineering purposes.
```


## 2026-11-05 — Use implementation choices and ordinary language for satisfying obligations

Review item: `21-figure-implementation-choices`. Source: `book/tikz/figures/specified-region.tex`, §2.1, lines 9–11. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `84659ed6ec37f933a2453c0281d9c4c3b2fc8ad05baed6ec59d62d46e2af1ef5`. Removed on 5 November 2026 after author approval. Applied the approved labels to both native black-and-white and color SVG versions, preserving geometry and headings.

```text
\node[n,text width=7.5cm,fill=white] (s) at (0,-2.3) {\textbf{SCAFFOLDING}\\Additional structure this agent needs to interpret and realize the obligation reliably};
\begin{scope}[on background layer]\node[draw,dashed,fill=white,inner sep=7pt,fit=(o)(s),label={[font=\fontsize{9}{11}\selectfont]above:{\textbf{SPECIFIED REGION}}}] {};\end{scope}
\node[n,text width=7.5cm] (d) at (0,-5) {\textbf{DEGREES OF FREEDOM}\\Realization choices left to the agent};
```


## 2026-11-05 — Judging what an agent discovers

Review item: `21-from-discovery-to-decision`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, lines 298–324. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `e8d45718d987acc2ec0542b422939726acf452204297631d0da079b5c62ef99d`. Removed on 5 November 2026 after author approval. Applied the developed example distinguishing adopted requirements from observations, the direct answer about tests and TDD, and the chapter cross-references.

```markdown
### Judging what an agent discovers

<!-- point: agents-import-patterns-but-design-is-contextual | An agent can bring patterns from other systems into an exploratory realization, but design is contextual: the engineer must judge which discovered choices suit the present system, and choices worth preserving should be extracted into explicit models rather than persist accidentally. | terms: modeling-principle, degrees-of-freedom -->

An agent can bring engineering patterns learned from other systems into an exploratory realization. That can be valuable: the realization may embody a decomposition, boundary, state distinction, or constraint that the engineer had not specified in advance. But design is contextual. A pattern appropriate elsewhere may violate an obligation or erase a distinction that matters here. The engineer must therefore judge which choices discovered through implementation are appropriate to the present system. Choices worth preserving should be extracted into explicit models rather than left to persist accidentally in one realization.

<!-- point: model-extraction-turns-transfer-into-local-law | Model extraction turns candidate knowledge transfer into local engineering law: the agent proposes a judgment through implementation, the engineer decides it should persist, and once explicit the judgment can be inspected, communicated, revised, and eventually enforced. | terms: modeling-principle, governance-conversion -->

Model extraction turns candidate knowledge transfer into local engineering law. The agent can propose a judgment through implementation; the engineer decides that the judgment is appropriate here and should persist across later realizations. Once made explicit, that judgment can be inspected, communicated, revised, and eventually enforced. Until then, it remains merely a choice one realization happened to make.

<!-- point: not-every-extraction-becomes-law | Not every extraction becomes law: descriptive discoveries can remain engineering knowledge, and law is the narrower case in which the engineer accepts the discovered choice as one that should persist. | terms: modeling-principle, externalized-knowledge -->

Not every extraction becomes law. Some of what implementation reveals is descriptive — a measured bound, an interaction the system turns out to have — and is worth preserving as knowledge without any intent that later realizations conform to it. Law is the narrower case: the engineer accepts the discovered choice as one that should persist.

<!-- pullquote -->

> training supplies candidate patterns → implementation instantiates one → engineering judgment evaluates it in context → Modeling makes an accepted judgment durable → Alignment can later give selected judgments force

<!-- point: human-authority-is-not-human-invention | The division of labor belongs to MAGE because human authority is not human invention: the agent may supply the insight, and the engineer decides what becomes durable. | terms: modeling-principle -->

This division of labor is why the account belongs to MAGE rather than to good practice in general. Human authority is not human invention. The agent may supply the insight; the engineer decides what becomes durable.

<!-- point: inference-is-not-institutional-memory | MAGE does not simply let a capable agent infer the architecture, because inference is not institutional memory or engineering authority: different agents, contexts, prompts, or future priors may infer differently, and rediscovering a decided structure on every task is needless epistemic decay. | terms: modeling-principle, externalized-knowledge -->

The same distinction explains why MAGE does not simply say: give a sufficiently capable agent the code and let it infer the architecture. An agent may well infer a plausible architecture every time it is asked. But inference is not institutional memory, and it is not engineering authority. Different agents, contexts, prompts, or future priors may infer differently, and nothing in the system records which inference the engineers accepted. Once an engineer has decided that a discovered structure matters here, repeatedly asking intelligence to rediscover it is needless epistemic decay. {{chapter:one-problem-many-models}} develops these dynamics — realize, observe, model, align — across the system lifecycle.
```


## 2026-11-05 — Distinguish human assurance from agent efficiency

Review item: `10-assurance-and-efficiency`. Source: `book/latex/sources/part1/1.1-the-printer.tex`, §1.1, lines 65–71. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `0abc0fcd2e8a980798b91caa81bf09bd3693b8eca3fe397fb60aa4f72eb7ecc6`. Replaced on 5 November 2026 after author approval; retained here for editorial recovery.

```markdown
MAGE is an engineering methodology for working with agents. Models make relevant engineering knowledge and intent explicit, and the engineered environment uses those models to guide work and enforce selected obligations. Engineers choose which decisions should persist across tasks and which can remain open to the agent's judgment. Leaving more judgment to the agent offers greater potential leverage, but can also increase the risk of an unacceptable result. How far to go along that spectrum is an engineering decision.

<!-- point: modeling-and-alignment-supply-the-instruction-package | Modeling and Alignment supply the printer's missing instruction halves. | terms: printer-metaphor -->

Chapters {{chapter:modeling|num}} and {{chapter:alignment|num}} develop these ideas. Modeling makes consequential properties explicit; Alignment enforces selected obligations during implementation.

That environment need not simply reproduce the one built for human developers. Agents can consume and maintain representations at scales that would be impractical for people, and automated analyses can check properties that human review would otherwise have to reconstruct from implementation. The design question is therefore two-sided: what existing engineering machinery should agents inherit, and what stronger machinery becomes practical because the workers are now machines?
```


## 2026-11-05 — Explain how models distinguish accepted intent from incidental implementation choices

Review item: `21-models-preserve-accepted-intent`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, lines 260–262. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `c1c9ff808a0dcea5ef28980d8fe29ba44ab63d1bab3226d67a588285098b3d14`. Replaced on 5 November 2026 after author approval; retained here for editorial recovery.

```markdown
Your concept of a worker pool as a queue feeding eight workers is a mental model of the implementation. The implementation is the thing represented.[^model-object] It may contain hundreds or thousands of lines for synchronization, error handling, cancellation, and other details. You can reason with the smaller picture because you have already reduced the implementation to a model in your mind. An agent given only the code may have to reconstruct that picture before it can answer the same question. Modeling makes your understanding explicit: it records the queue, worker slots, assignment rule, and relevant state transitions so that another human or agent can reason through them. What you have in mind when you call the worker pool a model is what you would capture.

But is that model sufficient for your engineering needs? Suppose you want to know whether and how quickly the queue will grow during a busy period. The concurrency limit cannot answer that question: two workloads can obey the same limit while one queue drains and the other grows. We need a model that relates arrival patterns, job service times, and worker capacity. It can omit the jobs’ business logic and the machinery that schedules individual threads, while retaining the quantities needed to reason about backlog. The concurrency model and this queueing model describe different properties of the same running pool.

## Constructing and Revising a Model
```


## 2026-11-05 — Explain what externalized knowledge lets later agents reuse

Review item: `21-preserving-meaning`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, lines 436–442. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `1b06e95a618d52fce699edf22c8e0aa8ddea19e0fb2546c360dc099298f2e6cc`. Replaced on 5 November 2026 after author approval; retained here for editorial recovery.

```markdown
<!-- point: industry-already-lives-here | Externalized knowledge representation is the lightest form of Modeling, and most of industry already stands on it. | terms: knowledge-representation, modeling-principle, externalized-knowledge -->

Externalizing knowledge this way is the lightest form of Modeling, and much of current practice already stands on it. Spotify's public account describes a retrievable service catalog.[cite: spotify2026constraint] Cloudflare's describes standards externalized under stable identifiers.[cite: reimann2026codex] Shopify's describes a different form, in which agent sessions are mined into reusable skills.[cite: moreno2026river] DocAble assembles its graph from registries, schemas, and YAML joined on stable identifiers. Each makes selected engineering knowledge durable outside a single reasoning episode, allowing later agents to retrieve rather than reconstruct it.

<!-- point: agents-make-the-semantics-tradeoff-newly-consequential | Agents lack shared context's continuity, so stronger commitment converts recurring interpretation into durable knowledge. | terms: semantic-commitment, externalized-knowledge -->

Agentic systems make this tradeoff newly consequential. A human team can sustain surprisingly informal semantics through shared context: the same engineers repeatedly look at the same diagram and remember what its arrows mean. Agents do not provide the same continuity. Across tasks, contexts, models, and time, unstated semantics must be inferred again — the needless epistemic decay the previous section described, now at the level of meaning rather than structure. Stronger semantic commitment can therefore convert recurring interpretation into durable engineering knowledge. It does not eliminate agent reasoning; it lets engineers decide which meanings agents should no longer have to reconstruct.
```


## 2026-11-05 — Keep the practical test about work saved and costs incurred

Review item: `21-selective-modeling-cost`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, lines 456–456. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `f6be9b655b991c97e16ba3e10a9f3cf575799c6b9c41bbcfee7454502e88076f`. Replaced on 5 November 2026 after author approval; retained here for editorial recovery.

```markdown
<!-- point: the-consequence-is-selective-modeling | Selective modeling: model repeatedly reconstructed facts and repeatedly adjudicated properties; add commitment when it retires recurring work. | terms: capability-ladder, modeling-principle, semantic-commitment -->

The practical rule remains selective modeling. Model facts that are repeatedly reconstructed and properties that are repeatedly adjudicated. A service catalogue may end repeated ownership discovery; an invariant may retire a recurring class of judgment. Add semantic commitment when the resulting reduction in recurring engineering work justifies carrying it.
```


## 2026-11-05 — Document-mutation implementation terminology

Review item: `22-implementation-terminology`. Source: `book/latex/sources/part2/2.2-structural.tex`, §2.2, lines 47–66. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `9468e9355ea67a980a097f939f300871f53e45f22ea8ce7b6e86b04a5e9b4721`. Removed on 5 November 2026 after approval, including the author’s final shortened format example and “necessary model” wording.

```markdown
> #### Document-mutation model · Structural
>
> - **Engineering question** — Where is document mutation supposed to occur?
>
> - **Model** — a layered structural relation: remediation logic operates through a structured-document model, realized by format-specific implementations for DOCX, PPTX, XLSX, and PDF.
>
> - **Property** — the intended architecture places format-specific mutation behind one sanctioned seam; ordinary remediation logic is not intended to bypass it.
>
> - **Quality attribute** — architectural integrity and modifiability.

<!-- point: a-structural-model-names-the-sanctioned-seam-for-document-mutation | The model draws one architectural relation — remediation reaches format-specific mutation through a structured-document seam, realized per format — and leaves queues, retries, sessions, and repair mechanics out. -->

The useful model is small. [ref:document-mutation-model] draws it: remediation logic operates *through* a structured-document model, which is *realized through* a format-specific implementation, which finally touches the concrete DOCX, PPTX, XLSX, and PDF formats. It says nothing about queues, retries, deployment, user sessions, or the mechanics of individual repairs. Those facts are real but irrelevant to the question; the reduction preserves only the architectural boundary that matters.
```


## 2026-11-05 — Reuse the engineering repertoire

Review item: `21-engineering-repertoire`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, lines 504–510. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `03e00693d044cd4da5956aef1a95f90570801e390349c692617af5e93e016c70`. Removed on 5 November 2026 after approval. Preserves the teaching-mindset opening, consolidates the repertoire examples, and clarifies how engineers make that knowledge available to agents.

```markdown
> This chapter does not attempt to enumerate every useful model nor every consequential engineering question. Its purpose is to draw attention to the fact that your system has consequential questions, and that models provide a means of articulating those questions in representations that let engineers reason about those properties and give agents a succinct form in which to reason about them. The examples ahead illustrate that practice rather than exhaust it.
>
> But you are an engineer. Take this not as an invitation to invent a new modeling technique for every problem, but as a reminder to study the models, patterns, and analyses your field has already developed. Once the engineering question is known, start with the established repertoire. State machines capture legal transitions; dependency and data-flow graphs support reachability questions; schemas capture entities and relations; queueing and resource models expose capacity and contention; decision tables and constraint systems expose permitted combinations. Each comes with known semantics, applicable analyses, strengths, and tradeoffs.
>
> An engineer who needs to sort data does not ordinarily invent a sorting algorithm from first principles. The engineer recognizes the problem and selects among established algorithms according to the properties and tradeoffs that matter. Modeling works the same way: recognize the engineering question, then choose a representation that preserves what is needed to answer it. Occasionally the established repertoire is inadequate and invention is required. Recognizing when that is true, and devising the new abstraction, is precisely the kind of judgment for which engineers are valuable.
>
> There are books full of this accumulated knowledge. Software architecture, model-based systems engineering, formal methods, databases, distributed systems, operations research, performance engineering, and other fields document modeling techniques and the conditions under which they work. MAGE does not reproduce those catalogs. It provides a framework for deciding when such knowledge should become an explicit part of the engineered environment. A governed engineering environment can then make the relevant repertoire—or an approved subset of it—available directly to agents. [appendix: appendix-skill-recipe] shows one realization: DocAble's self-governance skill packages the MAGE engineering method for agents, including a modeling repertoire and modeling moves. The agent can recognize a situation, choose an appropriate Modeling or Alignment move, act through the environment, and learn from the resulting evidence rather than inventing its engineering method afresh on each task. The repertoire is reusable engineering knowledge; choosing from it remains engineering judgment.
```


## 2026-11-05 — Document-mutation figure relation

Review item: `22-figure-mutation-implementation`. Source: `book/tikz/figures/document-mutation-model.tex`, §2.2, line 12. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Source SHA-256: `5b4dfdd5f6a0bcc21d62534825c260f6224ec8cfc058825e8c0e345302cd34c0`. Replaced on 5 November 2026 after author approval. Both color and black-and-white versions now name the relation “implemented by”; italic emphasis and edge endpoints are preserved.

```tex
\draw[edge] (n1) -- node[lab,right] {\textit{realized through}} (n2);
```


## 2026-11-05 — Use implementation in the behavioral point summary

Review item: `23-implementation-annotation`. Source: `book/latex/sources/part2/2.3-behavioral.tex`, §2.3, line 20. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `8857e9bb7a51f65562eb60edc46aba2836151512ebee4475eaa45533da15c367`. Replaced on 5 November 2026 after author approval.

```markdown
<!-- point: behavior-has-a-long-repertoire-of-state-transition-representations | Engineering has long represented behavior as states and transitions — automata, labeled transition systems, statecharts, temporal specifications — all keeping states and transitions and discarding the code that realizes them. -->
```


## 2026-11-05 — Connect the invariant inset to the preceding lease example

Review item: `23-invariant-entry`. Source: `book/latex/sources/part2/2.3-behavioral.tex`, §2.3, line 156. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Native excerpt SHA-256: `c1610e9018dcec3242bcc8785a5133978723e10e776bbe1839630708169e2b4a`. Replaced on 5 November 2026 after author approval.

```markdown
Notice what this model omits: the processing topology. Ownership, generation, lifetime, and reclamation are the consequential properties for this question; how the job's work is partitioned is not. Indeed, the implementation changed over time in ways that optimized its performance but not its semantics. We changed the pointers to the code, but not the model.
```


## 2026-11-05 — Use implementation consistently in the established summary

Review item: `26-implementation-terminology`. Source: `book/latex/sources/part2/2.6-modeling-summary.tex`, §2.6, review line 15. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Source SHA-256: `35478a6406e63296431e5ce8f0686a916452c9c67ffb21ab71b62280bb93c5b5`. Replaced on 5 November 2026 after author approval.

```
3.  **Choose degrees of freedom deliberately.** Every representation leaves some choices open. Reduce consequential freedom where doing so improves reasoning or control; preserve freedom where realization can safely remain open, or where later information can support a better choice.

4.  **Maintain the correspondences you depend on.** Multiple representations create correspondence obligations. Derivation, generation, validation, shared identity, and other mechanisms can keep related representations sufficiently consistent for their intended uses.

5.  **Distinguish correspondence from governance.** A model may describe another artifact, or realization may be required to follow the model. Decide which representation owns each consequential fact and which consumers must follow it.

Modeling gives engineering judgment a durable representation. It does not establish that an agent understood that representation correctly, that the resulting artifact realizes it, or that the property continues to hold as the system changes. Those are problems of Alignment, which {{chapter:alignment}} takes up.
```


## 2026-11-05 — Call the edit record recorded history

Review item: `25-figure-recorded-history`. Source: `book/tikz/figures/two-reductions-static-realized.tex`, §2.5, review line 23. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Source SHA-256: `b0a482bd2dc1a1d771b40cac04531dfb5e076f80b06b064c542b955ef2d12c47`. Replaced on 5 November 2026 after author approval.

```
\node[note,text width=13cm] (n) at (0,-6) {Static structure and realized history;\\join by computation identity when a question needs it.};
```


## 2026-11-05 — Executable-model point summary

Review item: `25-executable-pattern`. Source: `book/latex/sources/part2/2.5-system-knowledge.tex`, §2.5, line 194. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Replaced on 5 November 2026 after author approval. Metadata only; the published prose is unchanged.

```markdown
<!-- point: an-executable-model-is-its-schema-plus-its-checked-predicates | Operationally, an executable model is its structured schema plus the predicates a machine can check over that schema; a schema without checked predicates is only half the pattern. | terms: drift-gate, modeling-principle -->
```


## 2026-11-05 — Correspondence point summary

Review item: `25-correspondence-summary`. Source: `book/latex/sources/part2/2.5-system-knowledge.tex`, §2.5, line 132. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Replaced after author approval. Unpublished editorial metadata only; published text is unchanged.

```markdown
<!-- point: name-the-direction-of-derivation-up-front | A model and the code stay equal by derivation, and derivation runs in one of two directions; the machinery that keeps them equal depends on which. | terms: derivation-direction, model-from-code, model-to-code -->
```


## 2026-11-05 — Figure 1 appendix branches

Sources: `book/tikz/figures/book-map.tex` and `book/assets/book-map.svg`, Figure 1. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree). Removed after author request: optional appendices should not be highlighted in the book’s main argument. The remaining color drawing is centered; the shaded Chapters 2–5 enclosure remains in both editions.

```tex
\node[n,text width=3.4cm] (a4) at (6,-6.96) {\textbf{\magebookref{chapter:appendix-part-1-practice}{Appendix Part I}}\\Practice\\\textit{Use and extend}};
\draw[edge,dotted,-] (s4.east) -- (3.95,-7.2) |- (a4.west);
\node[n,text width=3.4cm] (a5) at (6,-9.36) {\textbf{\magebookref{chapter:appendix-part-2-evidence}{Appendix Part II}}\\Evidence\\\textit{Inspect the\\empirical record}};
\draw[edge,dotted,-] (s5.east) -- (3.95,-9) |- (a5.west);
```

```xml
  <!-- CHAPTER 4 to Appendix Part I (DOTTED branch — related destination, not a step; quieter than the argument) -->
  <line x1="512" y1="506" x2="604" y2="506" stroke="#78716c" stroke-width="1.5" stroke-dasharray="2 4" marker-end="url(#bm-ah-muted)"/>
  <rect id="appendix-1" x="604" y="480" width="296" height="52" rx="8" fill="#faf8f4" stroke="#78716c" stroke-width="1.4" stroke-dasharray="5 3"/>
  <text x="752" y="503" text-anchor="middle" font-size="18.4" font-weight="600" fill="#57534e">Appendix Part I · Practice</text>
  <text x="752" y="523" text-anchor="middle" font-size="18.4" font-style="italic" fill="#78716c">use + extend</text>

  <!-- CHAPTER 5 to Appendix Part II (DOTTED branch) -->
  <line x1="512" y1="592" x2="604" y2="592" stroke="#78716c" stroke-width="1.5" stroke-dasharray="2 4" marker-end="url(#bm-ah-muted)"/>
  <rect id="appendix-2" x="604" y="566" width="296" height="52" rx="8" fill="#faf8f4" stroke="#78716c" stroke-width="1.4" stroke-dasharray="5 3"/>
  <text x="752" y="589" text-anchor="middle" font-size="18.4" font-weight="600" fill="#57534e">Appendix Part II · Evidence</text>
  <text x="752" y="609" text-anchor="middle" font-size="18.4" font-style="italic" fill="#78716c">inspect the empirical record</text>

```


## 2026-11-05 — Duplicate selective-modeling editorial point

Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, former line 454 (working tree). Removed the superseded duplicate annotation under the author’s authorization to apply unpublished editorial-point updates directly. The newer summary and all published prose remain.

```tex
% <!-- point: the-consequence-is-selective-modeling | Selective modeling: model repeatedly reconstructed facts and repeatedly adjudicated properties; add commitment when it retires recurring work. | terms: capability-ladder, modeling-principle, semantic-commitment -->
```


## 2026-11-05 — Bridge into the worked modeling insets

Review item `21-worked-inset-bridge`. Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, working tree at `005947527192ae65b958fc9a37ce8746dbbc6391`. Replaced following author approval; the chapter now introduces simple mainline examples and optional worked cases.

```markdown
The sections ahead therefore do not survey the repertoire. They develop three kinds of modeling question through production examples from DocAble. Structural models ask what exists and how parts relate. Behavioral models ask what may happen and in what order. Decision models ask what is allowed or which alternative should be selected. Other questions require other representations; ownership, measurement, and provenance will appear where the examples need them. The final section asks what becomes possible when several such representations describe the same system and can be connected through shared identity.

<!-- point: modeling-creates-surfaces-for-alignment | A model does not govern by existing; modeling makes a property explicit, and Alignment makes selected properties enforceable. | terms: modeling-principle, alignment-principle -->
```


## 2026-11-05 — Worked-inset bridge point summary

Source: `book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex`, §2.1, working tree. Updated the unpublished annotation to match the approved bridge; author authorized direct editorial-point maintenance.

```tex
% <!-- point: the-sections-ahead-develop-three-kinds-of-modeling-question | The sections ahead do not survey the repertoire; they develop structural, behavioral, and decision questions through DocAble examples, other questions appear where the examples need them, and the final section asks what joining representations through shared identity makes possible. | terms: model-classes, modeling-principle -->
```


## 2026-11-05 — Approved Chapter 2 and 3 worked insets and supporting revisions

Applied after the author approved all remaining changes and requested reading in context. Native LaTeX remains authoritative. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree).

### 25-deep-dive-placement

Source: `book/latex/sources/part2/2.5-system-knowledge.tex`; original projection SHA-256 `13e1625372e8c42c2888f727b5321fa9bb18163b2bda829f678a7507d1561cc1`.

```markdown
> #### Deep dive — Beneath commodity intelligence: why structure helps {#inset-beneath-commodity-intelligence}
>
> MAGE deliberately treats intelligence as a commodity. The method should not depend on a particular neural architecture, training recipe, or context-window size. Still, the language-model systems available in 2026 offer a useful view one level below that abstraction. They suggest why engineering the structure around an intelligent agent can matter as much as improving the intelligence itself.
>
> Access to state is not the same as reasoning over state. Modern language models can accept large contexts, but their ability to use those contexts depends on the reasoning the task requires. OOLONG, for example, was designed to require semantic processing and aggregation across much of a long input rather than retrieval of a few relevant passages. Frontier models degrade substantially on these tasks even when the input fits within their nominal context windows.[cite: bertsch2025oolong] Recursive Language Models (RLMs) make the distinction especially clear. Instead of placing a long input directly into the model's context, an RLM keeps it in an external environment that the model can inspect programmatically, decompose, and pass in pieces to recursive model calls. On several long-context tasks, this restructuring substantially improves performance, including on inputs far beyond the underlying model's context window.[cite: zhang2025rlm]
>
> This belongs to a broader shift from treating a language model as a function that produces an answer toward treating it as a reasoner operating within an environment. ReAct interleaves reasoning with actions that obtain new observations from an external environment;[cite: yao2023react] CodeAct extends this idea by allowing executable code to serve as an expressive action language.[cite: wang2024codeact] RLMs go further by making context management and decomposition themselves part of the interaction with the environment. The common lesson is not that any particular harness is universally correct. It is that the structure through which intelligence encounters a problem changes what that intelligence can effectively do.
>
> Recent work offers a possible explanation in terms of compositional generalization. Zhang, Li, and Khattab hypothesize that frontier models may already be highly capable on many bounded problems while remaining poorly "managed" on long-horizon ones: a larger task succeeds when it can be decomposed into smaller tasks that individual model calls can reliably solve.[cite: zhang2026mismanaged] Zhang and Khattab subsequently argue that a harness can supply some of this structure by transforming complicated external state into observations that remain locally familiar to the underlying model; their RLM experiments suggest that such structure can improve generalization across both task length and domains.[cite: zhang2026harness] These are developing results rather than a settled theory of language models, but they offer a useful substrate-level interpretation of an engineering observation: more intelligence and more context do not remove the need for structure.
>
> MAGE operates one level above this work. A generic agent harness can manage context, call tools, delegate subtasks, and decide how to decompose computation. Software engineering also provides semantic decompositions of the system itself. An architecture model exposes components and boundaries. A data-flow model exposes consequential paths. An automaton exposes legal state transitions. Ownership and obligation models expose ownership and constraints. Bidirectional links among models and implementation let an agent move from code to the relevant model, across related models, and back to the affected code rather than reconstructing all of that structure from a flat collection of source and prose.
>
> This distinction also marks the boundary between Modeling and Alignment. Modeling gives commodity intelligence representations in which consequential engineering relationships are explicit and traversable. Alignment makes selected obligations enforceable through mechanisms in the engineered environment—hooks, validators, tests, gates, runtime checks, and others. Better learned decomposition may improve how agents perform work inside that environment. It does not decide which customer, organizational, safety, or societal obligations the environment should preserve.
>
> The connection is therefore explanatory, not foundational. Future models may reason over much longer contexts, learn better decompositions, and require different harnesses. MAGE should survive those changes. Its engineering claim is more durable: capable reasoning becomes more useful when consequential system structure is made explicit, and consequential obligations become more reliable when the environment enforces them. Most importantly, those structures keep engineers in control of what the system is for, what it must preserve, and which tradeoffs are acceptable, even as increasingly capable machines take on more of the work required to realize those decisions.
```

### 25-worked-connected-models-inset

Source: `book/latex/sources/part2/2.5-system-knowledge.tex`; original projection SHA-256 `13e1625372e8c42c2888f727b5321fa9bb18163b2bda829f678a7507d1561cc1`.

```markdown
<!-- point: different-questions-drew-different-models-joined-where-needed | The preceding sections drew different models because they asked different questions; DocAble keeps a family of structured representations connected by shared identity and traceability where engineers repeatedly need to relate views, not one large model. | terms: system-knowledge, modeling-substrate -->

Different questions drew different models of the same product. Together, the models expose structures through which engineers can reason about DocAble: its components and dependencies, permitted behavior, ownership, policy, quantitative bounds, and realized history. The system keeps them as a family of structured representations, each built for an engineering purpose, connected by shared identity and traceability where engineers repeatedly need to relate one view to another. It would be natural to collapse these views into one large model, but DocAble has no such model, and MAGE requires none.

## A Heterogeneous Modeling Substrate

<!-- section-terms: system-knowledge, modeling-substrate -->

<!-- point: a-heterogeneous-substrate-of-structured-records | DocAble's models differ in shape on purpose: roughly 130 structured model records plus data dialects share identities, derivations, query surfaces, and traceability where useful, are represented as data so map and territory stay separable, and nothing forces them into a single representation. | terms: modeling-substrate, representation-form, map-and-territory -->

<!-- index-def: modeling-substrate -->

DocAble's models differ in shape on purpose. Some are registries of components and their relations. Some represent state transitions. Some encode contracts or decisions. Others capture quantitative relationships or realized history. Roughly 130 structured model records plus several data dialects represent component identity and metadata, deployment topology, inter-service edges, data flow, required environment, state machines, and the governance graph itself. They share identities, derivations, query surfaces, and traceability where those relationships are useful, but nothing forces them into a single representation. The models are represented as data rather than importing the implementation they describe, keeping model and territory separable enough for correspondence to be checked. When a model is meant to provide independent evidence of correspondence, keep it distinguishable from the artifact it checks. {{chapter:software-factories}} returns to this modeling substrate as part of the governed engineering environment and shows how it is maintained and used in practice.

<!-- point: the-unity-that-matters-is-semantic-not-syntactic | Nothing demands that the models share a file format or metamodel; they need only agree on the identities required to connect them — the same service, work item, or operation resolves across representations. | terms: modeling-substrate, join-key -->

The unity that matters is semantic, not syntactic. A service named in a structural registry is the same service a flow model references. A work item in an ownership representation is the same work item whose lifecycle and measurements appear elsewhere. A provenance event identifies the operation whose effect it records. Nothing demands that these models share a file format or metamodel; they need only agree on the identities required to connect them ([ref:modeling-substrate]).

<!-- label: modeling-substrate -->
<!-- figure: assets/modeling-substrate.svg | *Heterogeneous models over shared identities.* DocAble maintains several representations for different engineering questions. Stable identities and explicit correspondence allow those representations to be joined when a question crosses them without requiring one universal model of the system. -->

<!-- point: derive-and-join-do-not-repeat | Prefer shared identity and derivation over independently maintained copies of the same fact; where duplication is unavoidable, make the correspondence explicit and checkable. | terms: derive-and-join, join-key -->

<!-- index-def: derive-and-join -->

That agreement follows one discipline: prefer shared identity and derivation over independently maintained copies of the same fact. Where one model needs a fact owned elsewhere, join through a stable identity or derive a projection. For example, the declared edge model is held in exact correspondence with the deployment edge set, and deployment then derives its access policy — one invocation grant per declared edge — from those edges rather than maintaining a second endpoint list; a journey model joins to those endpoints by call site rather than copying them. Where duplication is unavoidable, make the correspondence explicit and checkable. This reduces the number of independent truths that must be reconciled by hand.

<!-- point: join-static-and-runtime-only-when-a-question-pays | Join static and runtime only when a question pays. | terms: derive-and-join, join-key -->

Static and runtime representations need not collapse into one model either. A computation model can identify remediation work and its declared relations while a provenance record identifies the mutations realized during one run. Shared identity allows observations to join the structural model when a question requires it: DocAble associates staged-run latency and cost with computation identities. The per-session edit record remains separate because it answers a different question — what happened to this artifact — and is a separate provenance reduction rather than a per-run execution graph over computation nodes.

### What happened, and what evidence records it

<!-- point: observable-history-is-not-automatically-useful-a-provenance-model-selects-it | A system may emit millions of events yet leave a consequential question — what changed this artifact, which operation changed it, what evidence supports the account — hard to answer, so a provenance model selects and structures the history that answers it. -->

That realized history deserves its own reduction. A production system may emit millions of events — logs, traces, metrics, audit records — while still making a consequential question difficult to answer: what changed this artifact, which operation changed it, and what evidence supports that account? A provenance model selects and structures the history needed to answer such questions. For DocAble, the consequential history is the history of changes to the user's document, so it records consequential mutations as structured operations: each operation names its target, the mutation made, the remediation pass responsible, and the evidence retained about the change ([ref:attribution-model]). The record is narrower than a general execution trace and more directly useful for explanation, debugging, and audit.

<!-- label: attribution-model -->
<!-- figure: assets/attribution-model.svg | *Attribution provenance model.* A run contains consequential operations; each operation records its target, mutation, responsible pass, and retained evidence. Audit and explanation can be derived from this shared history. -->

<!-- point: event-grain-is-part-of-the-provenance-model | Choosing the grain is part of the modeling decision — "document modified" is too coarse, a complete execution trace too fine; DocAble records consequential mutations as typed operations and derives audit, debugging, and changelog views from that history. -->

Choosing the grain is part of the modeling decision. "Document modified" is too coarse to explain a consequential change; a complete execution trace leaves later reasoning to reconstruct which events matter. DocAble instead records consequential mutations as typed operations and derives audit, debugging, and changelog views from that history.

<!-- point: a-typed-edit-record-replays-deterministically | During a PDF remediation session mutations are recorded as typed edit values in a per-session log, and a replay engine can apply the same sequence deterministically — one representation explains what happened and reproduces the mutations while omitting the reasoning that produced them. -->

During a PDF remediation session, these mutations are recorded as typed edit values in a per-session log, and a replay engine can apply the same sequence deterministically. The representation can therefore explain what happened and reproduce the resulting mutations while omitting the reasoning, analyses, control decisions, and retries that produced them.

<!-- point: record-and-replay-separate-three-questions | The computation graph asks what may compose, the provenance record says which mutations occurred in this run, and replay asks whether that history can be reproduced. -->

The computation graph asks what computations may compose. The provenance record says which consequential mutations occurred in this run. Replay asks whether that realized history can be reproduced ([ref:two-reductions-static-realized]).

<!-- label: two-reductions-static-realized -->
<!-- figure: assets/two-reductions-static-realized.svg | *Computation structure versus realized history.* The computation graph models declared computations and their typed composition; the per-session edit record logs the consequential mutations one run actually produced. They are separate reductions; a shared computation identity can join runtime edits to the static model when an engineering question requires that relation, without collapsing the two representations into one. -->

<!-- point: provenance-boundary-model-records-a-lint-guarantees-every-mutator-stamps | The model records attribution per mutation; a structural check can establish that every mutator leaves an attribution record but not that the semantic account inside it is correct — this chapter models the evidence, Chapter 3 enforces the obligation. | terms: soft-vs-hard-governance -->

A provenance model does not guarantee that every consequential operation actually leaves the required record. DocAble addresses that separately, by requiring typed mutation verbs to emit attribution and checking that obligation structurally. That check is a **hard** presence guarantee over a **soft** content claim: it can establish that every mutator leaves an attribution record, but not that the semantic account inside that record is correct — that remains the author's. This chapter models the evidence an operation should leave; {{chapter:alignment}} asks what mechanism enforces that obligation.

### Questions that span models

<!-- point: joining-models-makes-cross-representation-properties-available | A model makes selected properties of a system available for reasoning; joining models makes properties that cross those representations available for reasoning. | terms: derive-and-join, join-key, modeling-substrate -->

A model makes selected properties of a system available for reasoning. Joining models makes properties that cross those representations available for reasoning. The structural model can answer a structural question, the deployment model a deployment question, the decision model a permission question — but some engineering obligations span them.

<!-- point: the-interservice-edge-is-a-worked-join | One typed interservice-call edge joins to deployment configuration for the callee URL, to runtime identity for the required invocation grant, and to the service catalog for topology agreement; 28 modeled edges produce 10 distinct grants, a deployment plan no single artifact contains. | terms: derive-and-join, join-key -->

DocAble's sharpest worked case is the interservice call edge. A typed edge records that one service may call another — but the same edge is joined to deployment configuration to determine the environment variable carrying the callee's URL, to the runtime identity a deployment executes under to derive the invocation grant the cloud's access-control configuration must contain, and to the service catalog to check that the documented topology agrees. Twenty-eight modeled call edges produce ten distinct invocation grants once shared runtime identities are accounted for. No single source artifact contains that deployment plan; it is derived by joining models. DocAble modeled the join after living the corresponding failure: service URLs were once wired correctly while the matching invocation grant was absent, and staging went down with authorization errors. The repair did not add another bespoke grant. It made URL wiring and authorization two consequences of the same modeled edge.

<!-- point: connections-can-create-information | Connections can create information that no individual model contains: the call model lacks the environment-specific runtime identity, the deployment environment does not state the intended topology, and their join determines the permission that should exist. | terms: derive-and-join, join-key -->

Connections can create information that no individual model contains. The call model does not contain the environment-specific runtime identity; the deployment environment does not independently state the intended call topology. Joining them determines the permission that should exist.

<!-- point: a-declared-property-can-determine-what-evidence-must-exist | Declared invariant facts derive a verification tier, the tier mandates a checker kind, and a check joins the citation against the checker corpus on disk — so a declared property can determine what kind of evidence must exist. | terms: derive-and-join, drift-gate -->

The same pattern reaches from models to their evidence. Each invariant in DocAble's composed state-machine model declares its facts: the participant lanes that touch a coordination point, the coordination primitive, and the temporal shape of the property. A derivation over those facts — never a hand-typed label — assigns the invariant a verification tier; the tier determines what kind of checker the invariant must cite; and a check joins each citation against the checker corpus on disk, failing when the mandated checker is missing. A declared property can therefore determine what kind of evidence must exist. The join makes the obligation derivable. {{chapter:alignment}} discusses the separate decision of whether such an obligation should block a commit.

<!-- point: joins-are-also-where-information-is-lost | Each representation can be locally reasonable while their composition fails to preserve a distinction the engineering decision requires — the entitlement failure crossed exactly such a seam. | terms: derive-and-join, model-drift -->

These crossings are also where information is lost. Each representation can be locally reasonable while their composition fails to preserve a distinction the engineering decision requires. The entitlement failure of the decision section is one example: the system possessed the fact that an entitlement was unlimited, but the representation presented to the admission decision had reduced that richer state to a scalar. A join through shared identity does not remove the risk; it gives the crossing a name and a place where the correspondence can be checked.

<!-- point: an-agent-enters-through-the-object-its-task-names-and-traverses-outward | Semantic unity lets an agent enter the substrate at the entity its task names and follow relations outward, taking only the connected slice the question needs. | terms: modeling-substrate, join-key -->

Shared identity also provides a query entry point. An agent — or an engineer — enters the substrate through the object its task names and follows identities outward across models: name a component and ask what it owns, what it depends on, which flow reaches it, what its lifecycle looks like. A canonical query surface makes those relationships traversable rather than rediscovered through repository search. The agent does not need *the whole model* — only the connected slice that answers the engineering question in front of it. [ref:substrate-traversal] draws that entry and outward walk.

<!-- label: substrate-traversal -->
<!-- figure: assets/substrate-traversal.svg | *Task-driven traversal.* A task enters the modeling substrate through a named system entity and follows only the represented relationships required by its engineering question. -->

## Maintain Explicit Correspondence

<!-- section-terms: map-and-territory, traceability, drift-gate -->

<!-- point: a-family-of-models-risks-a-second-system-of-record-that-diverges | A family of models invites an obvious danger — a second system of record that quietly diverges from the first — and the answer is to engineer the relationship between map and territory, not to stop modeling. | terms: map-and-territory, drift-gate -->

<!-- index-def: map-and-territory -->

Multiple models create a correspondence problem: represented facts can diverge from the system or from one another. Engineer the relationship between map and territory so divergence is caught rather than assumed away. Which machinery you reach for depends on which side is the source of truth.

<!-- point: name-the-direction-of-derivation-up-front | Maintain correspondence by deriving a model from implementation, generating an artifact from a model, or checking traceability where neither side fully determines the other. | terms: derivation-direction, model-from-code, model-to-code -->

<!-- index-def: derivation-direction -->

Make the direction of correspondence explicit. Where the implementation is the source of truth, derive the model. Where the model is the source of truth, generate the downstream artifact. Where neither fully determines the other, maintain traceability and check the mechanically decidable correspondences. [ref:derive-generate-trace] lays the three cases side by side.

<!-- index-def: model-from-code -->

<!-- index-def: model-to-code -->

### Derive when implementation owns the truth

The model is a projection of the code, reconciled at build time. A component-zone registry reads the real directory tree; a journey's dependency list is induced from its real call sites. The drift check is a **reconciler** — it re-derives the model from the code and fails on divergence. This pattern is common when models are introduced into an existing codebase.

### Generate when the model owns the truth

Code, configuration, or documentation are emitted from the model. The service catalog and the wire-contract types are generated from the service-flow model. The drift check is a **freshness and provenance check** — the generated artifact carries a header, and a hand-edit or a stale regeneration is a finding.

<!-- label: derive-generate-trace -->
<!-- figure: assets/derive-generate-trace.svg | *Three correspondence patterns.* Derive where implementation is the source of truth; generate where the model is the source of truth; otherwise maintain traceability and check the correspondences that are decidable. -->

<!-- point: the-computation-model-is-the-generate-case-execution-follows-it | The remediation subsystem illustrates both directions around one source of truth: its explicit computation model is consumed by execution, so realization follows the model rather than reconstructing composition from node implementations — the generate case. | terms: map-and-territory, derive-and-join -->

DocAble's remediation subsystem illustrates both directions around one source of truth. Its explicit computation model names remediation work and its composition, and the execution machinery consumes that model to determine dependency order and readiness. The model therefore governs composition operationally: this is the generate case in the consequential sense that realization follows the model rather than reconstructing composition from node implementations.

<!-- point: a-separate-python-view-projects-the-model-for-analysis | A separate Python remediation-graph view projects that structure for analysis and governance — queryable, joinable, drift-checked — without becoming the runtime scheduler. -->

A separate Python remediation-graph view projects that structure for analysis and governance. For Office formats, its edges derive from the same registry read/write metadata used by scheduling; for PDF, parallel typed declarations are held in correspondence by blocking checks. The view can therefore be queried, joined to other models, and checked for drift without itself becoming the runtime scheduler.

<!-- point: one-source-of-truth-supports-both-directions | One source of truth supports both directions at once: execution consumes the authoritative model while analytical views derive from it or from parity-bound declarations; the question is which representation owns the fact and which consumers must follow it. -->

One source of truth can thus support both directions at once: execution consumes the authoritative model, while analytical representations derive from it or from parity-bound declarations around it. The important question is which representation owns the fact and which consumers are required to follow it.

<!-- point: derivation-solves-correspondence-not-architecture-quality | Derivation settles correspondence, not whether the architecture is good. | terms: map-and-territory, alignment-principle -->

The graph is derived, but it remains a view: it suppresses method bodies, internal algorithms, runtime history, timing, and most document state, keeping only the entities and relations its structural questions need. Derivation prevents one kind of drift by construction — an engineer never authors the edges.

<!-- point: where-neither-is-fully-derivable-maintain-traceability-and-check-decidable-predicates | Where neither side can be fully derived from the other, maintain traceability between them and check the predicates that are mechanically decidable. | terms: map-and-territory, traceability, drift-gate -->

<!-- index-def: traceability -->

### Trace and check where neither owns the truth

Where neither side can be fully derived from the other, the move is **traceability plus drift checking**. Relate each model element to the implementation that realizes it, then check the correspondences a machine can decide. Keep that relation *live*: resolve the target against current code when the check runs, rather than storing a line number or a symbol name that is itself another snapshot able to drift. A deleted target then surfaces as a finding instead of a stale green edge. In DocAble a traceability gate resolves each model-to-code anchor through a language-aware resolver — one for each source language — and reports every anchor that no longer resolves. Before the gate existed, such renames could silently strand model references.

<!-- point: two-layers-cover-the-relationship-mechanical-and-judgment | Mechanical correspondence has a declared surface: some claims are decidable, others remain semantic and require judgment, unmodeled properties have no model-based coverage, and a recurring miss is a candidate for refining the representation or adding a control. | terms: drift-gate, map-and-territory, model-drift -->

### Some correspondence remains semantic

Mechanical correspondence has a declared surface. Some claims are decidable: an anchor resolves, an observed dependency belongs to the permitted set, or a generated artifact is current. Other claims remain semantic and require judgment; unmodeled properties have no model-based coverage. A recurring miss is a candidate for refining the representation or adding a control ([ref:model-sync-two-layer-net]).

<!-- label: model-sync-two-layer-net -->
<!-- figure: assets/model-sync-two-layer-net.svg | *Coverage of model correspondence.* Mechanical checks cover only claims the representation makes decidable; semantic claims still require judgment, and unmodeled properties have no model-based coverage. -->

<!-- point: an-executable-model-is-its-schema-plus-its-checked-predicates | A structured schema plus checked predicates is one executable-model pattern; generation, simulation, transformation, and analysis are others, and correspondence to a changing system still requires checks or derivations. | terms: drift-gate, modeling-principle -->

For invariant-bearing models, one useful executable pattern is a structured schema plus checked predicates over that schema. The schema defines entities, relations, fields, or states; the predicates state properties that a checker evaluates over the declared domain. Other executable models may instead drive generation, simulation, transformation, or analysis. A schema alone does not establish correspondence to a changing system; checks or derivations are needed where that correspondence matters. [ref:coherence-triangle] draws that relationship.

<!-- label: coherence-triangle -->
<!-- figure: assets/coherence-triangle.svg | *Checked predicates over a structured model.* A structured model supplies the domain; invariants state properties over that domain; a checker evaluates them at a declared cadence. This is one executable-model pattern, not the definition of executability. -->

<!-- point: no-synchronization-mechanism-proves-semantic-correctness | Synchronization does not establish that the model is correct; a model can be perfectly in sync and still express the wrong architecture. | terms: map-and-territory, drift-gate, modeling-principle -->

None of this proves the model *right*. Synchronization does not establish that the model is correct, that the architecture it expresses is good, or that the modeled surface captures every relationship that matters. A pointer can resolve while its meaning has changed; a schema and its generated client can agree while a live producer emits something else. The guarantee the machinery offers is narrower:

> **For the surface the model claims, check the correspondence that can actually be decided.**

<!-- point: the-narrow-guarantee-is-the-boundary-part-iii-begins-at | The bounded guarantee — decide the decidable over the claimed surface — is the boundary Chapter 3 opens on, examining why correspondence does not by itself establish correctness. | terms: modeling-principle, alignment-principle, map-and-territory -->

{{chapter:alignment}} examines why correspondence between a model and its implementation does not, by itself, establish correctness. Derive where implementation is the source of truth; generate where the model is the source of truth; trace and check where neither fully determines the other.

## Modeling Makes Properties Available to Engineering

<!-- point: a-model-does-not-govern-by-existing-it-makes-a-property-explicit | A model does not govern by existing: a structural model names a forbidden dependency without preventing it, a behavioral model an illegal transition without rejecting it, a measurement model a budget without stopping work — Modeling makes the property explicit, it does not enforce it. | terms: modeling-principle, alignment-principle -->

A model does not govern the system merely by existing. A structural model can name a forbidden dependency without preventing it; a behavioral model can name an illegal transition without rejecting it; a measurement model can represent a budget without stopping work that exceeds it. Modeling makes these properties explicit. It does not enforce them.

<!-- point: docable-attaches-no-hard-invariant-to-either-quantity | DocAble's cost-and-capacity model relates usage and pricing to an attributable cost against a budget and concurrency to a capacity demand against an envelope, and attaches no hard invariant to either quantity: the model says cost can be compared against a budget, not that it must not exceed one. | terms: soft-vs-hard-governance -->

DocAble's quantitative model makes the point concretely. Usage and pricing determine an attributable GenAI cost, read against a declared budget; concurrency determines a capacity demand, read against a capacity envelope. The wording of the property is deliberate: the model says cost *can be compared* against a budget, not that cost *must not exceed* one. DocAble attaches no hard invariant to either quantity — cost is routed to the administrative pane for observation and accounting, while capacity is controlled through a runtime-tunable limit. In the configuration examined here, these quantities are observations rather than enforced bounds. A cost figure is evidence; whether crossing a budget should block work, raise an alarm, or simply be recorded is a separate question of enforcement.

<!-- point: measurement-boundary-modeling-and-enforcement-are-separate | The cost-and-capacity model makes spending attributable and demand comparable to an envelope; it does not decide the budget, guarantee that the numbers are collected correctly, or enforce the bound. -->

[ref:modeling-perp-enforcement] draws that separation: the model defines the quantity and the reference; whether a comparison is merely observed, used to adapt behavior, or enforced by a gate is Alignment's decision. The model that makes spending attributable does not decide the budget, guarantee that the numbers are collected correctly, or enforce the bound.

<!-- label: modeling-perp-enforcement -->
<!-- figure: assets/modeling-perp-enforcement.svg | *Modeling and enforcement are separate decisions.* The measurement model defines the quantity and reference bound; Alignment determines whether the result is observed, used to adapt behavior, used to trigger graceful degradation, or enforced by a gate. -->

<!-- point: relational-obligations-need-enough-representation | Local syntactic obligations need little modeling; architectural boundaries, temporal obligations, distributed ownership, provenance, and end-to-end policy need enough representation to expose the relevant relationships, which Modeling makes available to analysis and governance. | terms: modeling-principle, alignment-principle -->

Local syntactic obligations can often be checked with little explicit modeling. Architectural boundaries, temporal obligations, distributed ownership, provenance requirements, and end-to-end policies require enough representation to expose the relevant system relationships. Modeling makes those relationships available to analysis and, where appropriate, to governance.

They are also available to design. A dependency graph may reveal that an execution boundary is artificial; a behavioral model may expose a recovery protocol that should change; a quantitative model may show that an otherwise plausible decomposition cannot meet its resource envelope. In each case, analysis of the model can change the architecture before implementation commits to the choice.

<!-- point: alignment-does-not-require-a-separately-represented-model | Alignment does not require every obligation to have a separately represented model — some properties are observable at an action or artifact boundary and can be constrained directly; models extend the range of properties available for analysis and enforcement. | terms: modeling-principle, alignment-principle -->

Alignment does not require every obligation to have a separately represented model. Some properties are already observable at an action or artifact boundary and can be constrained directly. Models extend the range of properties available for analysis and enforcement.

<!-- point: docable-models-arose-around-expensive-questions | DocAble's models arose around engineering questions that implementation alone made expensive or unsafe to reconstruct; different questions required different reductions, and shared identities connect them where a decision crosses views. | terms: modeling-principle, model-classes -->

DocAble's models arose around engineering questions that implementation alone made expensive or unsafe to reconstruct: where mutation may occur, how remediation computations compose, who owns in-flight work, which services may communicate, whether a user is entitled to an operation, what bounds apply, and what happened during a run. Different questions required different reductions; shared identities connect them where a decision crosses views.

<!-- point: part-iii-asks-which-obligations-the-environment-should-hold | Chapter 3 asks which obligations the engineered environment should enforce, where they become decidable, and what evidence and mechanisms are sufficient to enforce them. | terms: modeling-principle, alignment-principle -->

{{chapter:alignment}} asks which obligations the engineered environment should enforce, where they become decidable, and what evidence and mechanisms are sufficient to enforce them.


```

### 33-dynamic-analysis

Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`; original projection SHA-256 `8121dcb5dc7b1a034517f5da82a71d9f99ccdd59eaa335ba4ad3876a65d9fa5e`.

```markdown
<!-- point: a-ci-suite-bundles-three-roles-without-collapsing-the-distinction | A CI suite bundles sensor, validator, and gate without collapsing the distinction among them. | terms: sensor, validator, gate, governance-package -->

A CI test suite often bundles three roles: executing the code produces evidence, checking the result validates it, and failing the build gates progress. One artifact can perform several roles without collapsing the distinction among them.
```

### 33-test-gate-scope

Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`; original projection SHA-256 `8121dcb5dc7b1a034517f5da82a71d9f99ccdd59eaa335ba4ad3876a65d9fa5e`.

```markdown
> A mechanism can guarantee only the property it actually governs, under the assumptions on which its evidence and implementation depend. A validator can faithfully enforce the wrong obligation; a model can omit a consequential distinction; a sensor can fail to observe the relevant state. Hard control therefore does not mean "the system is correct." It means that, within a stated scope, acceptance no longer depends on the agent voluntarily satisfying that obligation.
```

### 33-worked-ownership-and-tests

Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`; original projection SHA-256 `8121dcb5dc7b1a034517f5da82a71d9f99ccdd59eaa335ba4ad3876a65d9fa5e`.

```markdown
<!-- point: recovery-is-not-permission | The sharpest instance of the pair is ownership: the lease makes ownership visible and recoverable, the durable compare-and-set supplies the constraint. Recovery is not permission. | terms: constraint, sensor, constraints-and-sensors -->

The sharpest instance of the pair is ownership of a unit of work. DocAble's in-flight lease makes active ownership visible and lets apparently abandoned work become recoverable. The lease does not itself grant final permission to perform the consequential side effect. A durable compare-and-set supplies that constraint: competing claimants cannot both acquire it, so at most one performs the effect. The lease may expire because a worker is merely slow, so redelivery cannot imply permission to repeat the effect. **Recovery is not permission.**

## One Obligation, Several Ways to Hold It

<!-- section-terms: constraint, validator, gate -->

<!-- point: a-modeled-obligation-does-not-imply-one-enforcement | A modeled obligation does not imply one enforcement technology; ask what kind of property it is. -->

A modeled obligation does not imply one particular enforcement technology. Ask first what kind of property it is and where the environment can enforce it.

<!-- point: prefer-the-constraint-when-you-can-exclude-the-state | If an invalid state can be removed from the action space, prefer the constraint. -->

If an invalid state can be removed from the action space, prefer the constraint. DocAble's work-item claim is the simple case: a database compare-and-set updates the row only while it remains in the expected prior state. Two competing claimants cannot both win the same transition. The ownership obligation is therefore carried by the runtime primitive itself rather than by a later checker.

<!-- point: interleaving-properties-need-a-validator-over-the-state-space | Properties that live across sequences need a validator that reasons over the composed state space. -->

Other properties live across sequences of otherwise legal actions. The in-flight lease is one example. Reclaiming a stale lease, issuing a new epoch, and receiving a late release from the previous holder are each individually plausible events; their interleaving can still violate the ownership invariant. Here the environment needs a validator that can reason over the composed state space. DocAble uses a small, purpose-built model checker: an executable transition model enumerates the reachable interleavings within explicit bounds and searches them for violations of the ownership invariants.[note: More precisely, this is bounded explicit-state model checking. "Bounded model checking" conventionally refers to bounded executions encoded for SAT/SMT solving; DocAble's checker exhaustively explores an explicitly bounded state space instead.] The checker is deliberately specialized to the protocol. For this small protocol, a purpose-built checker keeps the method close to the model and avoids unnecessary tooling.

<!-- point: temporal-obligations-require-another-shape-of-evidence | Temporal obligations require another shape of evidence; a finite trace cannot establish eventuality. -->

Temporal obligations require another shape of evidence. "No two workers own the same claim" is violated by one reachable bad state. "Every submitted job eventually terminates" is not. A finite trace can show progress, but it cannot establish that every fair execution eventually reaches a terminal state. A temporal model checker can reason about that stronger claim.

<!-- point: mechanisms-match-properties-not-an-adoption-sequence | These mechanisms differ in what they make observable or enforceable; their ordering does not prescribe an adoption sequence — an environment uses the mechanisms appropriate to the obligations it must govern. -->

These mechanisms differ in what they make observable or enforceable. Their ordering here does not prescribe an adoption sequence; an engineering environment uses the mechanisms appropriate to the obligations it must govern. The engineering preference remains the same throughout MAGE: make the bad state impossible when you can; otherwise produce proportionate evidence that an appropriate evaluator can use to decide the obligation. [ref:match-mechanism-to-property] sets the three matches out.

<!-- label: match-mechanism-to-property -->
<!-- figure: assets/match-mechanism-to-property.svg | *Match the mechanism to the property.* An obligation may be held structurally by excluding the invalid state, evaluated by exploring reachable states, or checked as a temporal property over executions (for example with TLA+/TLC). These are alternatives selected by the engineering claim. A gate is a separate decision that enforces the resulting verdict. -->


```

### 33-mainline-validator-example

Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`; original projection SHA-256 `8121dcb5dc7b1a034517f5da82a71d9f99ccdd59eaa335ba4ad3876a65d9fa5e`.

```markdown
The other two roles act on evidence and admission. A **validator** turns evidence into a judgment: does the observed call graph contain only permitted edges, did this journey establish its post-condition, does the provenance record account for every mutation? It reads the evidence a sensor produced — or derives it straight from the artifact — and asks whether it satisfies the obligation. A validator may be deterministic, probabilistic, or human; its verdict affects admission only when the environment acts on it. A correspondence validator can enforce agreement without making either representation govern execution. DocAble's remediation-graph parity check blocks drift between the projected graph and typed pass declarations even though the executable declarations remain upstream.
```

### 33-mainline-fresh-evidence

Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`; original projection SHA-256 `8121dcb5dc7b1a034517f5da82a71d9f99ccdd59eaa335ba4ad3876a65d9fa5e`.

```markdown
A loop may re-derive evidence at a later admission boundary; the thing asking to pass does not define passing. | terms: validator, gate -->

A loop may re-derive evidence at a later admission boundary rather than rely on the producing agent's self-report or on an earlier marker.[note: Re-derivation trades additional computation and latency for stronger assurance that the evidence corresponds to the artifact or state being admitted. Reusing or caching an earlier result can be a sound optimization when the system can establish that the relevant inputs have not changed; the optimization should preserve that correspondence rather than merely assume it.] Re-derivation can strengthen independence and freshness: the later mechanism evaluates the artifact or state that is actually being admitted. DocAble's definition-of-done audit takes this approach, recomputing its evidence at close rather than relying on evidence produced earlier in the task. The principle is simpler than the implementation choice: the thing asking to pass does not get to define what counts as having passed.
```

### 33-mainline-measurement-responses

Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`; original projection SHA-256 `8121dcb5dc7b1a034517f5da82a71d9f99ccdd59eaa335ba4ad3876a65d9fa5e`.

```markdown
Related measurements from DocAble's GenAI cost-and-usage model support different enforcement decisions, and [ref:cost-enforcement-gradient] fans them across the roles. Usage is continuously sensed. Capacity signals can adapt request behavior. Exhausting a per-job budget can produce soft completion rather than outright rejection. A hard daily-budget gate exists but is dormant unless configured. One quantitative model can support observation, adaptation, graceful degradation, or hard admission control. The appropriate response depends on the obligation attached to the quantity.
```

### 33-mainline-positive-negative

Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`; original projection SHA-256 `8121dcb5dc7b1a034517f5da82a71d9f99ccdd59eaa335ba4ad3876a65d9fa5e`.

```markdown
Constraints are often introduced as prohibitions: this code must not call that library. DocAble's provenance machinery demonstrates the complementary form. Every typed mutation verb is required to emit attribution. A source-time rule checks that the required call is wired into the mutation path. [ref:positive-negative-obligation] sets the two forms side by side: one mechanism removes a forbidden action; the other requires evidence-producing behavior.
```

### 33-mainline-provenance-example

Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`; original projection SHA-256 `8121dcb5dc7b1a034517f5da82a71d9f99ccdd59eaa335ba4ad3876a65d9fa5e`.

```markdown
Other architectural obligations do not have such a convenient boundary. Suppose all color decisions must pass through a canonical color model before document mutation. The unwanted alternative is not necessarily a call to one forbidden API. A future implementation may combine otherwise legitimate resolvers, representations, and mutation APIs into a new path that reaches the same protected operation. Each call can be legal, and the path may not match any bypass anticipated by a source-time rule.
```

### 20-worked-inset-reading-path

Source: `book/latex/sources/part2/00-part-intro.tex`; original projection SHA-256 `165b9ece6976145ac2f47b33c32242a23043474934a000d00488d10ad93722f1`.

```markdown
DocAble is the running example—the production accessibility service introduced in {{chapter:problem}}. A document enters, remediation is distributed across workers and services, the result is validated, and a corrected document returns with a record of what changed. Each model below projects from that larger system only the relationships needed for its engineering question. The models, mechanisms, and counts describe the repository revision examined at the time of writing.

Consider a document-processing job in DocAble. We might want to know whether a job can have two workers modifying it at the same time. A model of job ownership lets us express that question precisely. We can then require that each job have at most one worker responsible for modifying it at any moment. This requirement must hold for every job, throughout its lifetime, not merely for the jobs we happen to inspect. We can analyze the model to look for situations that violate the requirement. Whether the implementation actually prevents those situations is a further question.

<!-- point: each-chapter-begins-with-a-representation-then-specializes-it-and-four-terms-stay-distinct | A worked example establishes four terms that stay distinct — property, invariant, analysis, enforcement — before each section names them; an invariant is a property required to hold throughout a scope, and enforcement is reserved for Chapter 3. | terms: model-classes, modeling-principle, alignment-principle -->

Each worked section begins with a familiar engineering representation, explains what we can express and analyze using it, and then applies it to DocAble. The example above illustrates four terms used throughout the chapter. A **property** is a claim about a system that we can express using a model, such as whether two workers can modify the same job concurrently. An **invariant** is a property that must always hold within a specified scope: in this case, every job must have at most one modifying worker at any moment. An **analysis** or check produces evidence about whether the property holds. **Enforcement** goes further by preventing violations in the running system or development process. {{chapter:alignment}} examines enforcement.

<!-- box-family: inset -->

> #### Four questions for every model
>
> Every model section ahead opens on the same four lines:
>
> - **Engineering question** — what am I trying to know or decide?
>
> - **Model** — what representation makes the question tractable?
>
> - **Property** — what can I now state precisely?
>
> - **Quality attribute** — what engineering concern does that property serve?


```

### 22-worked-structural-inset

Source: `book/latex/sources/part2/2.2-structural.tex`; original projection SHA-256 `7d43cd9aaebf8f917187354e42dbdd65a37eb0578a683e06574c0cad63da4600`.

```markdown
Static analysis can sometimes derive the graph from the implementation; in other cases engineers declare the architecture as intent. Those are different claims — one describes what the system appears to do, the other what it is supposed to do — and {{chapter:alignment}} treats the distinction carefully. For now the move is smaller: choose the structural relation that makes the engineering question explicit. DocAble uses that move at two grains.

## DocAble: Document-Mutation Structure

DocAble supports several structured document formats through libraries powerful enough to alter their underlying object structures. Those libraries are necessary, but they sit behind a deliberate architectural boundary: most remediation logic works through DocAble's structured-document abstractions rather than reaching into a format-specific implementation directly.

<!-- box-family: model-card -->

> #### Document-mutation model · Structural
>
> - **Engineering question** — Where is document mutation supposed to occur?
>
> - **Model** — a layered structural relation: remediation logic operates through a structured-document model, with a separate implementation for each format: DOCX, PPTX, XLSX, and PDF.
>
> - **Property** — the intended architecture places format-specific mutation behind one sanctioned seam; ordinary remediation logic is not intended to bypass it.
>
> - **Quality attribute** — architectural integrity and modifiability.

<!-- point: a-structural-model-names-the-sanctioned-seam-for-document-mutation | The model draws one architectural relation — remediation reaches format-specific mutation through a structured-document seam, implemented per format — and leaves queues, retries, sessions, and repair mechanics out. -->

The necessary model is small. [ref:document-mutation-model] draws it: remediation logic operates *through* a structured-document model, which has a separate *implementation* for each format—DOCX, PPTX, PDF, LaTeX, etc. It says nothing about queues, retries, deployment, user sessions, or the mechanics of individual repairs. Those facts are real but irrelevant to the question; the reduction preserves only the architectural boundary that matters.

<!-- label: document-mutation-model -->
<!-- figure: assets/document-mutation-model.svg | *Document-mutation structural model.* The reduction preserves one architectural relation: ordinary remediation reaches format-specific mutation through a structured-document seam. Enforcement of that relation is a separate Alignment decision. -->

<!-- point: a-model-precedes-the-constraint-that-protects-it | The model states the boundary as a path property — every ordinary mutation route crosses the seam — and exposes it to checking; a static control that flags a bypass is the Chapter 3 enforcement. | terms: soft-vs-hard-governance -->

The principal property is a path claim: every ordinary route to format-specific mutation crosses the seam, and no route reaches a raw format library directly. The model *states* that relation and exposes it to checking; it does not, by existing, enforce it. {{chapter:alignment}} returns to the same relation when a static control flags code that bypasses the seam. The model supplies the architectural claim; the mechanism enforces that claim. This obligation is a **hard** one — a lint refuses the bypass — but the refusal belongs to {{chapter:alignment}}.

<!-- point: a-structural-model-can-drift-from-the-system-it-describes | A structural model carries the opposite risk — the code moves and the drawing does not — so the boundary it shows quietly stops matching the system; that gap is model drift, and later sections keep the correspondence by deriving, generating, or tracing. -->

<!-- index-def: model-drift -->

A structural model carries the opposite risk too. The code moves and the drawing does not, so the boundary it shows quietly stops matching the system. That gap between a model and the system it describes is **model drift**. Later sections make the correspondence explicit by deriving, generating, or tracing between model and implementation.

## DocAble: Computation and Composition

<!-- point: a-second-structural-question-reaches-inside-the-pipeline | A second structural question reaches inside remediation: which computations make up the pipeline, and how do they depend on one another; the first reduction treats each registered pass as a node. -->

The document-mutation model asked where one kind of change belongs. A second structural question reaches further inside the system: what computations make up remediation, and how do they depend on one another? DocAble runs a document through a collection of registered remediation passes. A pass may detect a condition, produce information a later pass uses, decide whether remediation should proceed, apply a bounded change to the intermediate representation, or edit a larger region directly. That structure exists in the implementation whether or not a model names it. The first reduction is the obvious one: treat each registered pass as a node, and suppress the statements, library calls, and loops inside it.

<!-- box-family: model-card -->

> #### Remediation-computation model · Structural
>
> - **Engineering question** — What consequential computations make up remediation, and how does information move among them?
>
> - **Model** — a static directed graph whose nodes are registered computations and whose typed edges represent declared composition among them.
>
> - **Property** — declared data dependencies and control dependencies are distinguishable and consistent with pipeline ordering; each modeled computation also states how bounded its mutation is — a typed, comparable patch for all or a declared subset of its edits, or a direct in-place edit — and, on a separate axis, which apply seam a patch producer uses.
>
> - **Quality attribute** — analyzability, modifiability, and architectural integrity.

<!-- point: the-computation-model-distinguishes-data-flow-from-control-composition | DocAble's computation model represents registered computations as nodes and distinguishes a data-flow edge (information consumed to produce a result) from a control edge (information consulted only to decide whether to run). -->

DocAble's remediation-computation model represents registered computations as nodes and distinguishes two kinds of composition. A data-flow edge means one computation produces information another consumes in producing its result. A control edge means one computation produces information another consults only to decide whether it should run. Treating both as a generic dependency would obscure a consequential distinction: information that contributes to a result is different from information that controls whether the computation occurs. [ref:from-nodes-to-composition] draws the resulting reduction.

<!-- label: from-nodes-to-composition -->
<!-- figure: assets/from-nodes-to-composition.svg | *From computations to composition.* Typing the dependencies among registered computations separates payload-bearing relations — data-flow and cross-service — from control gates that a computation consults only to decide whether it runs. -->

<!-- point: the-contrast-between-the-two-structural-models | The first model preserves one architectural relation; the second preserves a family of typed compositional relations over the same system. -->

The first model preserves one architectural relation. The second preserves a family of typed compositional relations over the same system.

<!-- point: the-model-also-records-how-bounded-each-effect-is | The same model records how bounded each computation's effect is — a typed patch for all or part of its edits, or a direct in-place edit — exposing distinctions the implementation contains but does not represent uniformly. -->

The same model also records how bounded each computation's effect is: some produce typed patches, some produce them for part of their work and edit directly for the rest, and most edit document state directly. These distinctions do not declare one form universally better. They make previously implicit differences available for engineering questions about composition and mutation.

<!-- point: the-static-graph-is-not-one-execution-of-it | The computation model is static per run, but other views attach observations to its stable computation identities — DocAble joins staged-run latency and cost to those identities without turning the structural graph into an execution log. -->

The computation model remains static with respect to any one run: it records no per-job invocation history, retries, or model fingerprint. Other views can nevertheless attach observations to its stable computation identities. DocAble joins staged-run telemetry to those identities, so measured latency and cost can be queried alongside the structural model without turning the structural graph into an execution log. The per-session mutation record remains separate: it records what happened to one artifact, not the execution history of the computation graph.

<!-- point: the-identity-spine-supports-added-views-without-enlarging-the-schema | Additional engineering views attach by computation identity rather than enlarging the structural schema; declared properties state intent, measured properties report observation, so an unmeasured value is unknown, not zero. -->

The same identity spine can support additional engineering views without enlarging the structural schema each time. Properties such as complexity, bounded execution, latency, test coverage, and checker trust can live in separate providers keyed by computation identity. Declared properties state engineering intent; measured properties report observation and may have incomplete coverage. An unmeasured latency is therefore unknown, not zero. The model family grows by joining views around stable identities rather than by turning one graph into a model of everything.

The next section adds time: what states a thing occupies, and the orderings it is allowed to move through.

```

### 23-worked-behavioral-inset

Source: `book/latex/sources/part2/2.3-behavioral.tex`; original projection SHA-256 `282e699c3b8776cffaed9b5f4b5fc3d86d38b6f0c227c1d0bb487a0e64b03c7e`.

```markdown
A structural model holds a system still; a behavioral model lets it move. It suppresses most of what a component *is* and keeps what it may *do* over time — the states a job may occupy, the transitions permitted between them, and the orderings those transitions allow or forbid. Where a dependency graph answers *what is connected to what?*, a behavioral model answers a question that only arises once time is admitted: what may happen, and in what order?

## The Canonical Move: States, Transitions, and Executions

<!-- point: behavior-has-a-long-repertoire-of-state-transition-representations | Engineering has long represented behavior as states and transitions — automata, labeled transition systems, statecharts, temporal specifications — all keeping states and transitions and discarding the code that implements them. -->

Engineering has represented behavior this way for a long time. A finite-state machine names the legal states of a system and the transitions between them; a labeled transition system adds the events that label those transitions; statecharts add hierarchy and concurrency so that large behaviors stay legible;[cite: harel1987] a temporal specification describes a property of whole executions rather than of any single state. These forms differ in expressiveness, but they share one reduction: they keep the states and the transitions, and they discard the code that implements each one.

<!-- point: the-reduction-is-what-makes-behavior-checkable | Reducing a service to states and transitions turns "can it reach a state it should never occupy?" from a reconstruction over scattered handlers into a question a person or tool can answer. -->

That reduction is what makes behavior checkable. A job-processing service described only through its handlers, database writes, and retries hides the very question an engineer most needs to ask — can the system reach a state it should never occupy? The same service, reduced to a handful of states and the transitions between them, turns that question into one a person or a tool can actually answer ([ref:canonical-behavioral]).

<!-- label: canonical-behavioral -->
<!-- figure: assets/canonical-behavioral.svg | *The behavioral move: states and transitions.* A model keeps the legal states and the permitted transitions and discards the code; the transition it omits — here the skip from IDLE straight to DONE — is the behavior it forbids. Its analyses search for a reachable bad state or a required event that never arrives. -->

<!-- point: semantics-are-states-and-permitted-transitions-and-the-omissions-are-the-obligations | A node is a legal state, an edge a permitted transition, a path an admitted execution; the transitions the model omits are the behaviors it declares illegal, and the property's shape selects the checker. -->

A node is a legal state; a directed edge is a permitted transition; a path through the graph is an execution the model admits. The key content is often negative: the transitions the model omits are exactly the behaviors it declares illegal. Once behavior is explicit, the questions form a progression from local to global — is this single transition legal? is this state reachable at all? can a legal execution reach a forbidden state? can the system deadlock? must some event eventually occur? The first are **safety** questions: a finite execution prefix that demonstrates a violation refutes them. The last is a **liveness** question, which requires reasoning about whether a desired event eventually occurs; no finite prefix alone establishes that the event will never occur. A model can make either expressible, and the choice of check — transition validation, reachability search, invariant checking, or temporal model checking[cite: baier-katoen2008] — follows from the shape of the property rather than from a preference for one method.

A behavioral model does not make the system behave. It makes the behavior something one can reason about before it runs.

## DocAble: Recovery Ordering

DocAble must preserve the ordering between publishing a recovered artifact and updating the database record that references it: the record may not name an artifact that has not yet been published. Reduced to its states, that concern is a small model.

<!-- box-family: model-card -->

> #### Recovery-ordering model · Behavioral
>
> - **Engineering question** — In what order may recovery publish an artifact and update the record that refers to it?
>
> - **Model** — a transition system over the recovery lifecycle; the decisive fact is a transition that does *not* exist.
>
> - **Property** — the database record may refer to the fallback artifact only after that artifact has been durably published.
>
> - **Quality attribute** — data integrity; crash-safety.

<!-- point: the-decisive-fact-is-an-absent-edge-between-staged-and-durable | The recovery obligation lives in the gap between local staging and durable publication: there is no direct FALLBACK_STAGED to DB_UPDATED edge, so the model excludes executions in which the record points at a not-yet-durable artifact. -->

The recovery lifecycle runs through several states, but the obligation lives in two of them. An artifact is first written locally (`FALLBACK_STAGED`) and only later published to durable storage (`FALLBACK_UPLOADED`). The record may advance to `DB_UPDATED` only from the durable state. [ref:recovery-ordering-model] draws the ordering, and the fact that matters is the edge that does *not* exist: there is no direct `FALLBACK_STAGED → DB_UPDATED` transition. The model therefore excludes executions in which the record points at a merely staged artifact. Local staging and durable publication are different states, and the whole obligation rides on keeping them apart.

<!-- label: recovery-ordering-model -->
<!-- figure: assets/recovery-ordering-model.svg | *Recovery-ordering model.* The decisive fact is the absent transition from FALLBACK_STAGED directly to DB_UPDATED. -->

<!-- point: the-model-exposes-the-ordering-a-transition-table-holds-it | Over the model the obligation is a reachability property — DB_UPDATED is reachable only through FALLBACK_UPLOADED — that the model exposes and a checker can search; whether a transition table refuses the short-circuit is a Chapter 3 question of enforcement. | terms: soft-vs-hard-governance -->

Stated over the model, the property is a reachability claim: `DB_UPDATED` is reachable only through `FALLBACK_UPLOADED`. That is a property the model *exposes* and makes checkable — one can search the transition system for any path into `DB_UPDATED` that skips durable publication. Whether the running recovery path is *held* to the ordering — whether a transition table refuses the short-circuit step — is a question of enforcement, addressed in {{chapter:alignment}}. This is a **hard** obligation: the machinery refuses the violation rather than merely reporting it.

## What the Model Makes Checkable

<!-- point: not-every-behavioral-obligation-is-a-safety-property | The recovery model answers a safety question one counterexample settles; "every job eventually terminates" is liveness, ranging over infinite executions, and needs a different checker. -->

The recovery model answers a safety question — can a bad state be reached? — and one counterexample would settle it. Not every behavioral obligation has that shape. "Every job eventually reaches a terminal state" is a liveness claim: no successful run proves the system can never stall, so the obligation ranges over infinite executions rather than reachable states, and it needs a different checker. [ref:behavioral-property-classes] places the three classes side by side.

<!-- label: behavioral-property-classes -->
<!-- figure: assets/behavioral-property-classes.svg | *Behavioral models expose different classes of properties.* A transition relation can support local legality checks, reasoning over reachable states, or temporal claims over executions. The appropriate checker follows from the property; richer machinery is not automatically stronger for every question. -->

<!-- point: the-recovery-ordering-is-a-slice-of-a-larger-lifecycle | Once behavior is explicit the right reasoning becomes available per property; the three-state recovery ordering is a sharp slice of a fuller job lifecycle chosen for crash-safe publication. -->

The point is not that DocAble should apply every one of these techniques. It is that once behavior has an explicit representation, the right form of reasoning becomes available for each kind of property, and the checker follows from the property rather than from habit. The recovery ordering is itself a sharp slice of a larger behavioral model: a DocAble job carries a full lifecycle — queued, leased, remediating, completed or failed — with its own legal transitions. The full lifecycle answers broader workflow questions; the three-state recovery ordering is the sharper reduction for crash-safe publication.

<!-- point: behavioral-boundary | The recovery model makes an ordering obligation explicit and searchable; it does not establish that the implementation realizes it, prove it is the right ordering, or decide the consequence of a violation. -->

The recovery-ordering model makes an ordering obligation explicit and searchable. It does not, by itself, establish that the implementation realizes the model, prove that this is the right ordering for the product, or decide what should happen when the ordering is violated. It gives engineering a precise object to check and a precise thing to align.

Structural models froze time; this section let it flow but assumed a single actor moving through states. The next question is what happens when several actors reach for the same work at once.

## DocAble: Ownership Under Contention

<!-- point: ownership-has-a-long-vocabulary-of-claims-and-leases | With many workers, a crash, and a reclaim sweep, "who owns this job?" acquires time and contention; engineering's vocabulary of locks, leases, and claims relates a holder to a resource over time, and an ownership model keeps those relationships and discards the rest. -->

With one worker, *who owns this job?* has an obvious answer. Add many workers, a crash, and a sweep that reclaims abandoned work, and the same question acquires time and contention: ownership can be claimed, can expire, and can be reclaimed, and a holder that went away can return to find its claim gone. Engineering has a long vocabulary for control over a shared resource: locks and leases,[cite: graycheriton1989] capability and claim relationships, and the lifecycle of a claim from acquisition through expiry to reclamation. An ownership model keeps those relationships and discards the rest — who holds what, on what terms, and for how long.

<!-- point: a-claim-carries-the-facts-that-make-contention-decidable | A claim binds a holder to a resource and carries which holder, which generation of claim, and when it expires — the generation being what tells a current claim from a superseded one — and because the hard failures live in interleavings, the characteristic analysis is state-space exploration with invariant checking. -->

A claim binds a holder to a resource and carries the facts that make contention decidable: which holder, which generation of claim, and when it expires. The generation is the fact a bare "A owns X" edge cannot express — it distinguishes a *current* claim from a *superseded* one. The difficult failures arise from the interleavings: the orders in which concurrent claims, expiries, and reclaims can occur. So the characteristic analysis is state-space exploration over those sequences, with an invariant checked at each reachable configuration — the behavioral toolkit of this section pointed at a concurrency question.

DocAble leases each in-flight job to one worker. A lease carries an owner, a monotonically increasing generation, and a lifetime; when a lease looks abandoned it can be reclaimed and the job re-leased to another worker at the next generation.

<!-- box-family: model-card -->

> #### In-flight lease · Ownership
>
> - **Engineering question** — Who currently owns this in-flight work, and can a returning stale owner disturb the current claim?
>
> - **Model** — a claim relating a worker to a job, stamped with a generation and a lifetime; reclaim advances the generation.
>
> - **Property** — a stale claim cannot clear or supersede the current one.
>
> - **Quality attribute** — correctness under concurrency; crash-safety.

<!-- point: leased-iff-owner-is-the-models-definition | A job is leased exactly when it has an owner; the two are the same fact from two sides, so the model represents ownership as the presence of a current claim — this is what "leased" means, and it sets up the invariant that follows. -->

Start with what the model *means*. A job is leased exactly when it has an owner; the two are the same fact seen from two sides, so the model represents ownership as the presence of a current claim rather than as a separate flag that could disagree with it. That is a definition, not a property that could fail. It sets up the invariant that can.

<!-- point: the-epoch-generation-makes-a-stale-release-inapplicable | Suppose A holds generation 7, stalls, and is reclaimed; the job is re-leased to B at generation 8; a late release from A carrying generation 7 must not clear B's generation-8 claim, and the generation makes that decidable. | terms: soft-vs-hard-governance -->

The consequential invariant is about time and contention. Suppose worker A holds the claim at generation 7, appears to stall, and is reclaimed; the job is re-leased to worker B at generation 8. If A now wakes and tries to release using its generation-7 claim, that release must not clear B's current generation-8 claim. The generation makes the distinction decidable: a release carrying an old generation names a claim that no longer owns, so it is inapplicable to the current one.

[ref:in-flight-ownership-states] draws the claim and its lifetime; the generation is the small addition that separates a live claim from a stale one.

<!-- label: in-flight-ownership-states -->
<!-- figure: assets/in-flight-ownership-states.svg | *In-flight ownership model.* A current claim records owner, epoch, and lifetime. Completion releases the claim; expiry makes it reclaimable. The model distinguishes a live claim from a stale one without representing the storage machinery that implements the lease. -->

<!-- point: ownership-boundary | The generation exposes the question — is this release applicable to the current claim? — and the model's job ends at making that invariant precise and checkable; whether the release path refuses the stale release is a hard guard for Chapter 3, verified by exhaustive search over the interleavings. | terms: soft-vs-hard-governance -->

The generation *exposes* the question — is this release applicable to the current claim? — and the model's job ends at making that invariant precise and checkable. Whether the release path *holds* the line is enforcement for {{chapter:alignment}}: a **hard** guard that refuses the stale release rather than merely reporting it, with an exhaustive search over the interleavings serving as its verification.

<!-- point: the-lease-model-omits-the-processing-topology | The model omits the processing topology: ownership, generation, lifetime, and reclamation are the consequential properties, and the implementation later changed how the job's work is partitioned without invalidating the model — the pointers to the code changed, not the model. -->

Notice what this model omits: the processing topology. Ownership, generation, lifetime, and reclamation matter to the question of who controls a job; how the job's work is partitioned does not. The implementation changed over time to improve performance while preserving those ownership semantics. We changed the pointers to the code, but not the model. The ownership properties could therefore remain invariants across those changes. The inset explains what an invariant requires and how a checker evaluates one.

<!-- index-def: invariant -->

<!-- box-family: inset -->

<!-- inset-domain: FORMAL METHODS -->

<!-- box-weight: callout -->

> #### Inset — What is an invariant? {#inset-invariant}
>
> An **invariant** is a property required to hold over a declared domain of states, structures, or observations. In a behavioral state machine, the invariant may be a predicate that must hold in every reachable state; in a structural model, it may require every observed dependency to belong to a declared set; in a measurement model, it may require a quantity to remain within a hard capacity bound. State both the property *and* the domain the checker claims to establish it over.
>
> Take a behavioral illustration. A job carries two fields at once — a `status` of `free`, `leased`, or `done`, and a `lease_owner` that names the holding worker or is empty. At the model level, leased-iff-owner was a definition; an implementation that represents the two sides as separately written fields turns it into a property that can fail, which is exactly why you write the invariant down. "A job is leased if and only if it has an owner" is a predicate over the pair: `(status == "leased") == (lease_owner is not None)`. A `free` status with a lingering `lease_owner` is a stale lease; a `leased` status with no owner is a lost lease. Separating the two writes can make either inconsistent state reachable, and both break the predicate. The predicate becomes mechanically meaningful when a checker evaluates it over the declared reachable state space:
>
>     STATES = product({"free", "leased", "done"}, {None, "worker-1", "worker-2"})
>     def invariant(s):                                    # leased iff owned
>         return (s.status == "leased") == (s.lease_owner is not None)
>     assert all(invariant(s) for s in reachable_states())  # check every reachable state

## One Representation, Several Questions

<!-- point: the-lease-answers-ownership-behavioral-and-measurement-questions-at-once | Read as ownership the lease says who controls a job; read as behavioral it traces a claimed-held-expired-reclaimed lifecycle; counted, it measures how much work is in flight — one representation, three questions. -->

The lease is the chapter's clearest case of one representation answering several classes of question. Read it as an ownership model and it says who controls a job. Read the same claims as a behavioral model and they trace a lifecycle — claimed, held, expired, reclaimed. Count the active leases and the same representation becomes a measurement: how much work is genuinely in flight right now. [ref:in-flight-lease-overlap] sets the three readings side by side.

<!-- label: in-flight-lease-overlap -->
<!-- figure: assets/in-flight-lease-overlap.svg | *Model classes overlap.* The same lease state supports ownership, behavioral, and measurement questions. The classes distinguish purpose, not storage objects. -->

<!-- point: overlap-confirms-the-classes-sort-questions-not-data-structures | The overlap follows from the distinction introduced at the chapter's opening: model classes identify engineering questions, not mutually exclusive data structures — the observation the closing section builds on to connect the models. -->

The overlap follows from the distinction introduced at the opening of the chapter: model classes identify engineering questions, not mutually exclusive data structures. One purposeful representation can answer several when they share the same underlying facts. This is the observation the closing section builds on when it connects the models through shared identity.

Ownership introduced permission implicitly: a stale claimant *may not* clear a current lease. The next family makes permission the whole question.

```

### 24-worked-decision-inset

Source: `book/latex/sources/part2/2.4-decision.tex`; original projection SHA-256 `73bad8a9600c885b6d0aa8c46a1ce53ff4a9023cadcb281e060917cef51308ce`.

```markdown
The models so far have been descriptive: they say what the system *is* or *does*. A decision model says what the system *may* do. It represents alternatives and the rules that permit, require, or forbid them. That single change in mood — from *does* to *may* — is the subject of the section.

## The Canonical Move: Permitted Alternatives

<!-- point: permission-has-many-canonical-forms-unified-by-mood-not-shape | Decision tables, rule systems, access-control matrices, policy graphs, feature models, and constraint systems all represent permission; what unifies them is not their shape but their normative mood. -->

Engineering represents permission in several familiar forms: decision tables that map conditions to allowed actions, rule systems, access-control matrices that record which subject may act on which object,[cite: lampson1974] policy graphs, feature models that constrain which combinations of options are valid, and constraint systems that declare which assignments are admissible. What unifies them is not their shape but their mood.

<!-- point: same-arrow-different-mood-is-the-sharpest-case-of-topology-not-fixing-meaning | A structural edge and a decision edge can be drawn identically and mean opposite kinds of thing — a fact about what happens versus a rule about what is permitted; an absent decision edge means "not allowed," not "does not happen." -->

This is the sharpest instance of the earlier lesson that topology does not fix meaning. A structural edge and a decision edge can be drawn identically and mean opposite kinds of thing: `A → B` as a structural edge says "A calls B," a fact about what happens; the same arrow as a decision edge says "A *may* call B," a rule about what is permitted. The consequence lives in the absent edge. A missing structural edge means "no such call happens"; a missing decision edge means "no such call is allowed." The gap between those two readings is the reason decision models exist ([ref:canonical-decision]).

<!-- label: canonical-decision -->
<!-- figure: assets/canonical-decision.svg | *The decision move: the same arrow, a different mood.* A structural edge states that a call happens; a decision edge states that it is permitted. The absent edge carries the weight — "not allowed," not "does not happen" — and the analyses check a declared policy for consistency and least privilege. -->

<!-- point: a-declared-policy-turns-is-this-allowed-into-an-evaluation | Once permission is declared, the claims a policy designer wants become expressible — permitted/forbidden, mutual exclusion, prerequisites, consistency, completeness, least privilege — and "is this allowed?" becomes an evaluation rather than an argument. -->

Once permission is declared, the claims a policy designer wants become expressible: which alternatives are permitted or forbidden, which are mutually exclusive, which imply prerequisites, whether the policy is internally consistent, whether it is complete over the cases that can arise, and whether it achieves least privilege. The analyses follow — evaluating a rule against a case, checking or solving constraints, detecting conflicts between rules, testing completeness and consistency. A declared policy turns "is this allowed?" into an evaluation rather than an argument.

## DocAble: Service-Flow Policy

DocAble declares which of its services may communicate with which. The model is a graph whose edges carry the normative reading: an edge means the call is part of the sanctioned policy, and an absent edge means the policy does not permit it.

<!-- box-family: model-card -->

> #### Service-flow model · Decision
>
> - **Engineering question** — Which service may call which, and what may be reached from outside?
>
> - **Model** — a declared graph of services and the permitted edges between them; the deployment is wired from the graph rather than the graph inferred from the deployment.
>
> - **Property** — internal communication is permitted only along a declared edge; one declared node is the public entry.
>
> - **Quality attribute** — least privilege; architectural integrity; security.

<!-- point: the-service-flow-model-is-a-declared-source-of-truth-not-a-firewall | The declared graph is the single source of truth for permitted inter-service edges, with one node declared publicly reachable and every other edge authenticated; a completeness check requires each gated edge to be fully specified, and the deployment config is generated from the graph. | terms: soft-vs-hard-governance -->

[ref:service-flow-model] draws the permitted calls. One node is declared publicly reachable; every other edge is an authenticated internal call. The model is the single source of truth for those edges, and the deployment is generated from it rather than inferred from it — so a completeness check can require every gated edge to be fully specified before the deployment is wired. That check is real and enforced, but it governs the *declaration's* internal consistency, not the running traffic: the model declares the topology; it is not a runtime firewall.

<!-- label: service-flow-model -->
<!-- figure: assets/service-flow-model.svg | *Service-flow model.* A declared graph of which service may reach which. The public web tier is the only node facing the outside; an absent edge means the relationship is not permitted by the model, and enforcement is separate. -->

<!-- point: observed-versus-declared-is-correspondence-not-correctness | The observed call graph reveals that A calls C; the decision model states whether A may call C; agreement is correspondence, not correctness — a faithfully-obeyed rule can still be the wrong rule. -->

Declaring the policy exposes a question the running system cannot answer for itself: do the services call only along declared edges? That is a correspondence between an observed structural fact and a declared decision, and the two are different claims. The observed call graph reveals that A calls C; the decision model states whether A *may* call C. [ref:observed-vs-declared] sets them side by side.

<!-- label: observed-vs-declared -->
<!-- figure: assets/observed-vs-declared.svg | *Observation and intent answer different questions.* The observed system can reveal that A calls C; the decision model can state whether that relationship is permitted. Agreement establishes correspondence, not correctness. -->

<!-- point: docable-does-not-reconcile-observed-traffic-so-correspondence-is-the-open-question | DocAble generates config from the declared graph but does not reconcile observed traffic against it at runtime; whether the deployed services stay on the permitted edges, and what a departure should cost, is Alignment's question. -->

Agreement between observation and policy would establish *correspondence* — the implementation matching the declared intent — not *correctness*: a faithfully-obeyed rule can still be the wrong rule. DocAble generates its deployment from the declared graph, but nothing at runtime reconciles observed traffic back against the declaration. Whether the deployed services stay on the declared edges, and what a departure should cost, is Alignment's question in {{chapter:alignment}}.

## DocAble: When the System Changed but the Model Did Not

<!-- point: the-entitlement-model-was-born-from-a-production-failure | The service-flow policy was declared in advance; DocAble's upload-admission decision acquired its model in the opposite order, after a production failure exposed a representation that could no longer express the decision. -->

The service-flow policy was declared as intent, ahead of any violation. DocAble's upload-admission decision acquired its model in the opposite order: the system changed first, one representation of the decision did not, and the gap surfaced in production.

<!-- point: upload-entitlement-flows-through-groups | A user receives upload entitlement through groups — finite-credit or unlimited — so the admission decision depends on two facts: how many credits remain and whether any entitlement is unlimited. -->

DocAble admits an upload only when the user is entitled to it. A user receives that entitlement through groups. A group may carry a finite credit balance, drawn down as pages are processed, or it may provide unlimited use. The admission decision therefore depends on two different facts: how many finite credits are available, and whether any applicable entitlement is unlimited ([ref:entitlement-domain]).

<!-- label: entitlement-domain -->
<!-- figure: assets/entitlement-domain.svg | *The upload-entitlement domain.* A user belongs to one or more groups; a group carries either a finite credit balance or unlimited use. The admission decision needs both facts, so a representation that can express only the finite balance cannot answer the question the decision asks. -->

<!-- point: the-scalar-was-adequate-until-the-domain-changed | DocAble originally had only finite-credit groups, so a scalar sum was an adequate admission representation; when unlimited groups arrived, no explicit model of the admission decision existed to carry the change. -->

DocAble originally represented upload entitlement in finite credits alone. In that system, reducing a user's groups to a single number — the sum of their credit balances — was adequate for deciding whether a document could be processed. The product later gained unlimited groups, and the domain change altered the admission question: entitlement was no longer a single finite quantity. No explicit model of the upload-admission decision existed at the time. The decision lived in several implementation sites — a server-side reduction, a client-side preflight, the server's admission gate — each with its own hand-rolled representation of the user's groups.

<!-- point: the-old-reduction-observed-the-distinction-and-discarded-it | The legacy reduction read each group's unlimited flag and used it to exclude unlimited groups from the credit sum; its scalar output had no place for "unlimited," so an unlimited user became zero credits — a representation failure, not missing information. -->

One of those representations did not evolve. In August 2026, a user whose one group carried unlimited entitlement was blocked from uploading a thirty-eight-page document by a paywall: *the upload needs 38 credits, and you have 0*. The root cause was a legacy server function that reduced a user's groups to one scalar, the sum of their finite credit balances. The function was not ignorant of unlimited entitlement. It read each group's unlimited flag twice, using it once to *exclude* unlimited groups from the sum and once to compute a display label. Its output type simply had no place to put the fact, so the distinction died at the return statement. A purely-unlimited user became `0` credits; the client compared 0 against 38 and rejected the upload; the server's authoritative admission logic, which handled unlimited correctly, was never reached. This was a representation failure, not an information-availability failure. The implementation held the fact and threw it away.

<!-- point: the-production-failure-produced-the-model | The root-cause analysis made the admission question explicit and produced an explicit entitlement decision model — with property tests, a cross-runtime parity corpus, and a shape check — in roughly five hours from RCA to deletion of the lossy reduction. -->

The production failure produced the model. The root-cause analysis made the engineering question explicit — given the user's group entitlements and the requested work, should this upload be admitted, and under which entitlement? — and an explicit entitlement decision model landed in response. It did not land alone. The founding change carried property tests, a cross-runtime parity corpus pinning the server and the client to the same decision table, and a check on the model's shape. The legacy scalar reduction was deleted with no compatibility shim, the remaining display projections were re-sourced from the model, and the admission gates themselves were delegated to it. From root-cause analysis to model to deletion of the wrong representation took roughly five hours.

<!-- box-family: model-card -->

> #### Entitlement decision model · Decision
>
> - **Engineering question** — May this user upload this document, and under which entitlement?
>
> - **Model** — per-group entitlements that keep finite and unlimited as distinct cases; the output is a structured admission decision: admitted or not, the group that authorizes it, and the ordered plan by which the verdict was reached.
>
> - **Property** — an unlimited entitlement can never be reduced to zero credits; the displayed balance is a projection of the model, not an authority for admission.
>
> - **Quality attribute** — decision correctness; fidelity between the domain and its representations.

<!-- point: the-repair-was-model-to-model | The repair changed the representation through which the decision was made, not merely the failing conditional: the revised model preserves the finite/unlimited distinction and states the admission decision explicitly, and the implementation was then changed to consume it. -->

The repair did more than patch the conditional that failed. It changed the representation through which the decision was made. Upload entitlement could no longer be represented as a scalar credit balance: the revised model preserves finite and unlimited entitlement as distinct cases and represents the admission decision explicitly — whether the upload is admitted, which group supplies the entitlement, and the ordered plan used to reach the verdict. The implementation was then changed to consume that model. The same triggering state that once read as `0` credits now reads as *admit by unlimited entitlement*. The finite-credit scalar still exists where that quantity is the actual question, displaying remaining credits, but it is no longer used as a model of upload permission ([ref:entitlement-model-evolution]).

<!-- label: entitlement-model-evolution -->
<!-- figure: assets/entitlement-model-evolution.svg | *One distinction, lost and preserved.* The scalar reduction cannot represent unlimited entitlement; the revised model preserves the distinction. -->

<!-- point: the-model-was-part-of-the-repair | The failure revealed a decision made through a representation that could no longer express the system's domain; making the decision explicit forced the representation to preserve the distinction the system had acquired. -->

The revised decision model was part of the repair, rather than merely documentation of it. The failure revealed that an engineering decision was being made through a representation that could no longer express the system's domain, and making the decision explicit forced the representation to preserve the distinction the system had acquired. The opening section defined a model as a purposeful reduction that preserves the distinctions its question requires. The old scalar was a reasonable model of *how many finite credits remain*. It was never a sufficient model of *may this user upload*, and when the domain changed, the gap between those two questions became a production failure.

<!-- point: an-explicit-model-would-have-made-the-obligation-visible | The author changed the domain in one place and did not carry the change into every representation of the same decision; when the domain contains a consequential distinction, every representation used to reason about that decision must be capable of expressing it. -->

A note in the first person: I changed the domain in one place — groups could now be unlimited — and did not carry the change into every representation of the same decision. An explicit model would not have made the change automatically correct; it would have made the inconsistency visible as an engineering obligation. When the domain contains a consequential distinction, every representation used to reason about that decision must be capable of expressing it. {{chapter:alignment}} gives the recurring pattern here — a failure converted into explicit structure that later work inherits — a name.

Decision models delimit what is allowed. The final section steps back from any single model to ask how a family of models works together as a system.

```

### 31-worked-context-inset

Source: `book/latex/sources/part3/3.1-where-obligations-can-be-enforced.tex`; original projection SHA-256 `c30dc24174acc4f90ae961a5d10531200d4cabfcc69d9c39774ace6f4aaf9735`.

```markdown
<!-- box-family: inset -->

<!-- inset-domain: AI -->

> #### Inset — Context Engineering: Making the Right Knowledge Available {#inset-context-engineering}
>
> Context engineering concerns what information is made available to a reasoner for a particular episode of work. Instructions, examples, retrieved material, prior decisions, and engineering models can all contribute to that working state. The problem is not fitting more information into a context window. It is selecting the right information, at the right abstraction, when the decision is made.
>
> MAGE gives context engineering durable engineering knowledge to draw from. Modeling externalizes engineering knowledge so that each agent does not have to reconstruct it from source code, documentation, and prior conversations. Context engineering can then select the relevant portions of that knowledge for the work at hand. The distinction is useful: Modeling engineers what is known; context engineering engineers what is presently available to reasoning. Retrieval, memory, compaction, skills, and other mechanisms may change how that selection is implemented, but the underlying engineering problem remains.
>
> One realization is *dynamic context injection* (DCI): the environment observes properties of the work, selects the engineering knowledge relevant to those properties, and places that knowledge into the agent’s reasoning context. This is context engineering: it changes what the agent can see when making a decision. Requiring the selection procedure to occur is a separate enforcement decision.
>
> DocAble selects this context twice. At dispatch, the environment matches the work order’s anticipated files against file-scoped constraint declarations and the models’ file-to-component mappings. It supplies applicable architectural invariants, lint rules, ownership declarations, and design-document references in the work order. After planning, the agent triggers a second extraction using its refined file set. That pass can surface obligations missed by the initial brief as the proposed change becomes more concrete. Both passes select knowledge for the task rather than placing the repository’s accumulated instructions into every agent’s context.[cite: davis2026docable]
>
> A Git pre-commit gate rejects the final agent-worktree commit when the dispatch has no recorded second-extraction event. The gate does not compare the extraction’s file set with the committed files, or establish that the selected constraints were complete, correct, read, or followed. The extraction gate establishes that discovery occurred; separate correspondence checks and implementation gates enforce selected obligations. This distinction lets an engineer require a discovery procedure without mistaking its completion for compliance with the knowledge it retrieves.


```

### 31-mainline-runtime-boundary

Source: `book/latex/sources/part3/3.1-where-obligations-can-be-enforced.tex`; original projection SHA-256 `c30dc24174acc4f90ae961a5d10531200d4cabfcc69d9c39774ace6f4aaf9735`.

```markdown
The third enforcement boundary is the **artifact or runtime boundary**: the resulting system or running state. Types, narrow APIs, architectural seams, schemas, runtime permissions, and admission policies can make a forbidden state impossible to express or impossible to accept. DocAble's format seam (the worked example below) is the concrete case: one structured interface for document mutation, with a ban-lint on direct access.
```

### 31-retire-format-reprise

Source: `book/latex/sources/part3/3.1-where-obligations-can-be-enforced.tex`; original projection SHA-256 `c30dc24174acc4f90ae961a5d10531200d4cabfcc69d9c39774ace6f4aaf9735`.

```markdown
### Example — DocAble

DocAble distributes its controls across the boundaries: a skill in the harness, an action hook, a pre-commit check, and — its sharpest — an application-boundary seam for document mutation. At the application boundary, DocAble represents document mutation through a sanctioned structured seam. Static controls reject ordinary code that bypasses that seam for the raw format library. The model states the architecture; the interface and lint enforce that relation.

<!-- takeaway -->

Place the enforcing mechanism at a boundary where the obligation is legible and the environment can evaluate or constrain the relevant work. The appropriate boundary depends on the obligation.


```

### 32-mainline-independent-obligation

Source: `book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex`; original projection SHA-256 `914652a5630bb06d6e8ac1135901bd44fa87f7c5f3b08a9ca73ad9fc928e1c74`.

```markdown
<!-- point: docable-requested-temporal-checking-for-an-obligation-its-models-already-carried | DocAble's temporal model checking ran the other way round: engineering fixed the obligation from the system's models, then requested an analysis suited to it; the independence that matters lies between the obligation's source and the realization judged against it. | terms: independent-obligation, agreement-vs-correctness -->

DocAble's use of temporal model checking ran the other way round. The obligation came first: every submitted job must eventually reach a terminal state, a property over whole executions rather than over any single reachable bad state, and one the system's state and recovery models already carried. Only then was a formal analysis suited to that shape requested, a small TLA+ specification checked with TLC.[cite: lamport2002] The machine could help construct and run the verification. It did not infer the governing obligation from the implementation it was being asked to justify. The independence that matters was named earlier, and it is not the one between human and machine authorship. It runs between the source of the obligation and the realization being evaluated against it.


```

### 32-worked-correspondence-inset

Source: `book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex`; original projection SHA-256 `914652a5630bb06d6e8ac1135901bd44fa87f7c5f3b08a9ca73ad9fc928e1c74`.

```markdown
### Example — DocAble

DocAble uses all three relations. Wire-contract tests ask whether independently represented sides of an interface correspond; they establish agreement, not external compliance: a synthetic payload can satisfy both sides while the real producer emits something else. PDF output can instead be checked against veraPDF, an independently implemented conformance oracle for the ISO standard. In Office workflows, the acceptance question may be whether Microsoft's own checker accepts the result. Agreement, conformance, and acceptance are useful evidence, but they are not interchangeable.

<!-- worked-examples-end -->

<!-- point: execution-consumes-the-computation-model-so-it-governs-composition | Execution consumes DocAble's explicit computation model to determine dependency order; the model governs composition, while node implementations determine only what each computation does. | terms: agreement-vs-correctness, independent-obligation -->

DocAble's remediation pipeline gives a sharper example of correspondence and governance as separate properties. The execution machinery consumes the computation model {{chapter:modeling}} introduced — registered computations and their typed composition, represented explicitly rather than recovered from the pass bodies — to determine dependency order and readiness. The model therefore governs composition: node implementations determine what individual computations do, but they do not independently decide how the pipeline is assembled.[^static-graph]

<!-- point: a-separate-analytical-view-projects-the-structure-for-governance | A separate Python remediation-graph view — 125 computations, 57 typed relations — projects the structure for analysis and governance, projected and parity-checked, without being the runtime scheduler. | terms: agreement-vs-correctness -->

A separate Python remediation-graph view exposes that structure for analysis and governance. As of this writing, the view contains 125 computations and 57 typed relations: 32 data-flow edges, 24 control gates, and one cross-service relation. Fifty-five relations are projected and two remain authored seeds. For Office formats, the projection derives edges from registry read/write metadata also used by scheduling. For PDF, the analytical relation is projected from typed Produces, Consumes, and ConsumesForControl declarations and held to the executable territory by blocking parity checks.

<!-- point: the-two-representations-play-different-governing-roles-even-with-strong-correspondence | The two representations play different governing roles even where correspondence is strong: making the view more faithful does not make it govern execution; a representation governs what the environment requires it to control. | terms: agreement-vs-correctness, independent-obligation -->

The two representations therefore play different governing roles even where their correspondence is strong. The computation model is consumed by execution. The analytical view is consumed by analyses and checks. Making the view more faithful does not by itself make it govern execution; a representation governs what the environment requires it to control.

<!-- point: a-validator-should-not-get-more-gating-power-than-its-evidence-surface-warrants | The Office parity checks run green but stay audit-only while one live pass runs outside the surface they enumerate; a validator should not receive more gating power than its evidence surface warrants. | terms: agreement-vs-correctness -->

The Office checks expose a second limit. Nodes and edges are now projected and their parity checks run green, but those checks remain audit-only while one live pass still runs outside the registration surface the checks can enumerate. Promoting them to blocking before that escape is drained would certify a green result over an incomplete observation surface. A validator should not receive more gating power than its evidence surface warrants.

[ref:fidelity-vs-authority] draws governing role and correspondence apart.

<!-- label: fidelity-vs-authority -->
<!-- figure: assets/fidelity-vs-authority.svg | *Correspondence strength and governing role are independent.* DocAble's execution machinery consumes an explicit computation model to determine remediation composition. A separate analytical graph view projects that structure and is held in correspondence with its upstream declarations. Stronger correspondence makes the view more trustworthy as a representation; it does not make the view govern execution. -->


```

### 32-mainline-work-unit

Source: `book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex`; original projection SHA-256 `914652a5630bb06d6e8ac1135901bd44fa87f7c5f3b08a9ca73ad9fc928e1c74`.

```markdown
The same gap appears inside a single task. Take a concrete obligation: *if this task substantially changes the call graph, the corresponding architectural model must still agree when the task closes.* A real task runs through several intermediate commits, and temporary disagreement during those commits can be legitimate. A pre-commit check therefore acts too early — it sees a fragment while the property belongs to the completed unit of work. At task return, the accumulated changes, model updates, tests, and other completion evidence can be weighed together — which is exactly where DocAble places its definition-of-done audit, over the whole unit of work rather than any single commit inside it.
```

### 32-mainline-approximate-boundary

Source: `book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex`; original projection SHA-256 `914652a5630bb06d6e8ac1135901bd44fa87f7c5f3b08a9ca73ad9fc928e1c74`.

```markdown
Real boundaries are sometimes approximate. In DocAble's own orchestration loop, the ideal moment to preserve durable session state would be the instant before a lossy compaction, but waiting for that exact hook leaves too little budget to write the hand-off comfortably. So the implemented mechanism fires earlier, when context is becoming full *and* the durable record has gone stale.
```

### 34-mainline-missing-enforcement

Source: `book/latex/sources/part3/3.4-governance-conversion.tex`; original projection SHA-256 `ab94d534d2881138af84990e17a048c0366f803c9888e0e3f24df7f1d28b7279`.

```markdown
## Correct Judgment Without Enforcement

<!-- section-terms: governance-conversion -->

<!-- point: judgment-without-consequence-governance-conversion-can-delete-a-capability | Governance conversion can add a mechanism; it can also delete a capability the environment should never have offered. | terms: governance-conversion -->

A merge automation drained a backlog of agent worktrees into the mainline each tick. Most rebased cleanly; a fraction conflicted, and a single convenience option resolved those conflicts by taking one side automatically. On overlapping edits it silently dropped content. An audit already understood the danger: a guard detected when a conflict touched substrate-class files, judged the resolution unsafe, and logged it correctly, as a warning only. The operation proceeded, and the tree lost content. [ref:judgment-without-consequence] traces the cascade.

<!-- label: judgment-without-consequence -->
<!-- figure: assets/judgment-without-consequence.svg | *Correct judgment without enforcement.* The system observed the dangerous condition and evaluated it correctly, but no enforcing mechanism acted on the verdict. The durable repair removed the unsafe capability rather than making the warning louder. -->

The failure was not missing evidence. The system had evidence. Nor was evaluation missing: the audit correctly identified the danger. What it lacked was enforcement. The warning described a condition the environment still permitted.

The durable repair did not make the warning louder. It removed the dangerous auto-resolution fallback and escalated ambiguous merges to a human instead. **Governance conversion can add a mechanism. It can also delete a capability the environment should never have offered.** Where a warning marks a known-dangerous condition intended to become enforced, its temporary status should be explicit, with an owner and resolution condition.


```

### 34-mainline-transfer

Source: `book/latex/sources/part3/3.4-governance-conversion.tex`; original projection SHA-256 `ab94d534d2881138af84990e17a048c0366f803c9888e0e3f24df7f1d28b7279`.

```markdown
<!-- point: engineering-capital-can-transfer-between-projects | Engineering capital can transfer between projects in two forms: process automation reused or adapted directly, and principles applied to establish and enforce a new architecture. | terms: engineering-capital, modeling-principle, alignment-principle -->

Engineering capital can also transfer between projects. After developing DocAble, I carried parts of its engineering environment into two subsequent projects, approximately 50,000 and 36,000 lines of code. First, I reused process automation directly, including Claude hooks and Git hooks, and adapted existing runbooks with relatively little effort. Second, I applied MAGE's Modeling and Alignment principles to establish a more structured architecture and enforce its obligations from the beginning. These investments appeared to accelerate initial development, although I did not conduct a controlled productivity comparison.
```

### 34-mainline-adaptation

Source: `book/latex/sources/part3/3.4-governance-conversion.tex`; original projection SHA-256 `ab94d534d2881138af84990e17a048c0366f803c9888e0e3f24df7f1d28b7279`.

```markdown
Both projects nevertheless exposed new failure modes requiring further engineering. Reusable automation and established principles improved the starting conditions, but each project still required its own engineering. Engineering capital can therefore travel between projects without making their environments interchangeable.
```

### 34-mainline-stopping-points

Source: `book/latex/sources/part3/3.4-governance-conversion.tex`; original projection SHA-256 `ab94d534d2881138af84990e17a048c0366f803c9888e0e3f24df7f1d28b7279`.

```markdown
DocAble contains examples of each non-governed stopping point, each for a different reason. Some cost controls are deliberately not enforced because imposing a hard daily budget remains a policy choice. DocAble measures governance conversion but does not target a required rate, because doing so would invite gaming. Some accessibility judgments remain outside deterministic enforcement because the available representation does not contain enough semantics to evaluate them reliably. **Non-enforcement is sometimes the engineered result.**
```

### 34-mainline-audit-to-control

Source: `book/latex/sources/part3/3.4-governance-conversion.tex`; original projection SHA-256 `ab94d534d2881138af84990e17a048c0366f803c9888e0e3f24df7f1d28b7279`.

```markdown
The mechanism that discovers an obligation need not be the mechanism that ultimately enforces it. DocAble's primitive-density lint remained an audit signal because high density was only a smell. The migration it provoked produced more specific types, boundaries, and drift controls whose predicates could justify stronger enforcement. {{chapter:one-problem-many-models}} follows that migration in detail.
```

### 35-mainline-control-collision

Source: `book/latex/sources/part3/3.5-when-guardrails-collide.tex`; original projection SHA-256 `26403c379b193f006cb7e04e3e694b65b4643c93ffe8bcc180b0d05516e33cfe`.

```markdown
Two collisions from the case study make it concrete. In the first, one control required a squashed commit while another treated the resulting broad diff as unauthorized scope expansion. Each was reasonable alone; together they imposed contradictory demands on the same commit set. In the second, two hooks fired on the same turn-end with no order declared between them, each able to block, and their composition was left implicit. Neither collision lives in any one control's code. Each lives in the space *between* two controls. That relation had not been represented. [ref:collision-edge] draws it.
```

### 35-worked-control-system-inset

Source: `book/latex/sources/part3/3.5-when-guardrails-collide.tex`; original projection SHA-256 `26403c379b193f006cb7e04e3e694b65b4643c93ffe8bcc180b0d05516e33cfe`.

```markdown
<!-- point: docable-implemented-governance-graph-is-intentionally-partial | DocAble's implemented governance graph is intentionally partial — a small high-value slice of the larger machinery, not comprehensive coverage. | terms: governance-graph, shared-resource -->

DocAble's implemented governance graph is intentionally partial. It models only the high-value interactions for which recurring questions justified explicit representation, including those around the orchestrator lifecycle.

<!-- point: shared-resource-is-a-useful-conservative-relation-not-a-proof-of-completeness | Shared resource is a useful conservative relation, not a proof that the graph captured every interaction. | terms: shared-resource, semantic-gap -->

A shared resource is a conservative signal of interaction, not proof that every conflict has been captured. Within the represented surface, it lets engineers and tools ask useful questions before the controls interact in production work: which controls fire on this event, which touch this resource, which pairs have no declared order, and which known combinations impose incompatible requirements.

<!-- point: decidable-edges-a-lint-settles-semantic-ones-a-validator-or-human-judges | Some candidate conflicts are mechanically decidable; others are semantic — a sensor produces evidence of the interaction, a validator or human judges whether it is a conflict. | terms: governance-graph, semantic-gap -->

Some candidate conflicts are mechanically decidable: a lock cycle, two exclusive writers, or two same-slot mechanisms with no permitted ordering. Others are semantic. A static check can **sense** that two controls touch the same commit-set; a validator — or a human reviewer — must decide whether their requirements actually conflict. Again the four roles matter: producing evidence of an interaction is not the same as judging the interaction invalid. In the motivating commit-set collision, the machine could identify the shared resource, but judgment was still required to recognize the requirements as contradictory. The graph lets the environment surface the interaction for evaluation before the controls collide during work.

<!-- point: diagnose-the-conflict-kind-before-weakening-an-obligation | Not every conflict between controls reflects a conflict between the obligations they enforce; incompatible obligations require revisiting requirements, while interfering mechanisms may be changed without weakening either obligation. | terms: governance-graph, shared-resource -->

Not every conflict between controls reflects a conflict between the obligations they enforce. Two obligations may genuinely be incompatible, requiring engineers to revisit the requirements or specification. But compatible obligations can also be enforced by mechanisms that interfere with one another. In that case, changing the mechanisms or how they interact may resolve the conflict without weakening either obligation.

<!-- point: three-turn-end-hooks-one-shared-slot | Worked example: three turn-end hooks, each reasonable alone, all writing the turn's closing message; the governance graph records exactly these three conflict edges among twenty-five mechanisms. | terms: governance-graph, shared-resource -->

DocAble now represents the second of these conflicts in an explicit governance model. Among the automations that run when an agent finishes a turn, three matter here: one discourages premature termination, another prompts reflection on failures, and a third checks for stranded work. All three write to the turn's closing message. The governance graph contains twenty-five mechanisms and three conflict edges, all between these hooks. [ref:turn-end-ordering] shows their shared resource and the modeled ordering.

<!-- label: turn-end-ordering -->
<!-- figure: assets/turn-end-ordering.svg | *Three turn-end hooks, one shared resource.* All three hooks write to the turn's closing message, producing three conflict edges. The governance model computes an execution order, but the generic runtime driver that would enforce it has not yet been implemented. -->

<!-- point: conflict-classes-and-resolutions-form-a-closed-vocabulary | The graph distinguishes four conflict kinds (contradiction, contention, ordering, soft-versus-hard) and five resolutions (merge, order, separate, accept, open); the goal is not a conflict-free graph but understood, appropriately resolved interactions. | terms: governance-graph, shared-resource -->

The graph distinguishes four kinds of conflict: *contradiction*, when requirements are incompatible; *contention*, when mechanisms compete for a resource; *ordering*, when their execution sequence matters; and *soft versus hard*, when one mechanism can prevent another from achieving its purpose. Each conflict can be resolved by *merging* mechanisms, *ordering* them, *separating* their execution points, *accepting* the interaction, or leaving it *open* for later resolution. The goal is not a conflict-free graph; it is a graph whose consequential interactions are understood and appropriately resolved.

The three turn-end conflicts are ordering conflicts. Their pairwise constraints establish a sequence: the premature-termination guard runs first, reflection second, and the stranded-work check last. The model computes this order by topological sorting; a cycle produces an error rather than an arbitrary sequence.

<!-- point: what-the-model-enforces-today-is-detection-ordering-and-a-drift-report | What exists today: the model records conflicts and computes the resolution order, and a separate audit-only check reports model-vs-configuration discrepancies; the runtime driver is not yet built, so the order is a checkable design decision, not an enforced one. | terms: governance-graph -->

The model currently records conflicts and computes their resolution order. A separate check reports discrepancies between the model and the harness's configured mechanisms. The generic runtime driver that would execute hooks according to the computed order has not yet been built. The order is therefore an explicit, checkable design decision, not yet an automatically enforced one.

<!-- point: the-pileup-was-discovered-by-collision-the-model-reverses-that-direction | The original conflict was discovered when two hooks interfered during development; with the pair recorded, similar interactions can be examined as part of the design rather than discovered through failures. | terms: governance-graph -->

The original conflict was discovered only after two hooks interfered during development. The model records that pair and lets engineers identify similar interactions before installing another automation. Instead of discovering conflicts through failures, engineers can examine them as part of the design.

<!-- point: governance-interaction-graph-candidate-conflict-condition | Conflict detection follows a read/write criterion — same firing event, and one mechanism writes a resource the other accesses; classifying the conflict and resolving it are separate, later judgments. | terms: governance-graph, shared-resource, semantic-gap -->

The governance model records conflicts according to a simple criterion. Each mechanism declares an execution event — its *slot* — and the sets of resources it reads (\(R\)) and writes (\(W\)). Two mechanisms have a **potential conflict** when they execute at the same event and at least one writes a resource the other accesses. Two readers do not conflict. The resulting graph \(G = (V, E)\) records these interactions as edges: an undirected edge joins distinct mechanisms \(u\) and \(v\) when

<!-- eq: \operatorname{slot}(u) = \operatorname{slot}(v) \land (W_u \cap R_v) \cup (R_u \cap W_v) \cup (W_u \cap W_v) \neq \varnothing -->

An edge identifies an interaction requiring attention; it does not establish that the underlying obligations are incompatible. The model separately classifies the conflict and records its resolution.


```

### 35-mainline-control-correspondence

Source: `book/latex/sources/part3/3.5-when-guardrails-collide.tex`; original projection SHA-256 `26403c379b193f006cb7e04e3e694b65b4643c93ffe8bcc180b0d05516e33cfe`.

```markdown
<!-- point: the-meta-model-stays-connected-where-controls-are-modeled-explicitly | Where DocAble models controls explicitly, entries can be anchored to their implementations and drift-checked, so a mis-placed control fails loud. | terms: traceability, teetering-tower -->

The control model must remain connected to the controls it represents. Where DocAble models controls explicitly, entries can be anchored to their implementations and checked for drift, so a control the rule cannot place fails explicitly rather than dropping into a silent default bucket. This applies the broader rule from {{chapter:modeling}}: if engineers and agents are going to reason through a model of the control machinery, the model must stay connected to the territory it claims to describe.
```

### 35-remove-closing-case-repeats

Source: `book/latex/sources/part3/3.5-when-guardrails-collide.tex`; original projection SHA-256 `26403c379b193f006cb7e04e3e694b65b4643c93ffe8bcc180b0d05516e33cfe`.

```markdown
The control-machinery model is grounded primarily in the originating case.[^estate]

<!-- worked-examples: governs-accumulated-governance -->

### Example — Two Safety Rules {other}

A building's fire system unlocks doors when it detects smoke; its security system may lock those same doors under an intrusion policy. Each rule is sensible in isolation while the pair demands incompatible states of the same resource. The contradiction belongs to the interaction, not to either rule's own logic.

### Example — DocAble

DocAble models its governance mechanisms as a system rather than only as individual scripts. Controls are anchored to their implementations, interaction relations identify shared resources, and coverage traces controls back to the obligations or failures that justify them. The model does not make every possible conflict mechanically decidable. It exposes enough structure to ask, before the next collision, which mechanisms interact and which important obligations have no adequate coverage.

<!-- takeaway -->

Governance conversion adds durable engineering structure; governing the control machinery keeps that structure coherent. Catalogue the controls, expose their interactions, trace them to the obligations they serve, and retire machinery that no longer earns its cost.

<!-- worked-examples-end -->
```


## 2026-11-05 — Approved Chapter 2 comparison followups (batch 1)

Applied after the author individually approved these comparison followups. Native LaTeX remains authoritative. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree).

### 23-name-ownership-case

Source: `book/latex/sources/part2/2.3-behavioral.tex`; original projection SHA-256 `8fecf5c7e2347af9ea43e0b178cf92c589dbf2c857ef2d6d74de3db9d21a2864`.

```markdown
Notice what this model omits: the processing topology. Ownership, generation, lifetime, and reclamation matter to the question of who controls a job; how the job's work is partitioned does not. The implementation changed over time to improve performance while preserving those ownership semantics. We changed the pointers to the code, but not the model. The ownership properties could therefore remain invariants across those changes. The inset explains what an invariant requires and how a checker evaluates one.
```

### 25-generation-and-interpretation

Source: `book/latex/sources/part2/2.5-system-knowledge.tex`; original projection SHA-256 `a9db16186073ab6619d98d0da953230169814de44cf020a64c2cfabd7450a0a0`.

```markdown
<!-- point: name-the-direction-of-derivation-up-front | Maintain correspondence by deriving a model from implementation, generating an artifact from a model, or checking traceability where neither side fully determines the other. | terms: derivation-direction, model-from-code, model-to-code -->

<!-- index-def: derivation-direction -->

Make the direction of correspondence explicit. Where the implementation is the source of truth, derive the model. Where the model is the source of truth, generate the downstream artifact. Where neither fully determines the other, maintain traceability and check the mechanically decidable correspondences. Model-transformation languages make such relationships executable: OMG's Query/View/Transformation (QVT) standard can check a declared relation between models or update a target model to satisfy it.[cite: omg2016qvt] [ref:derive-generate-trace] lays the three cases side by side.

<!-- index-def: model-from-code -->

<!-- index-def: model-to-code -->

### Derive when implementation owns the truth

The model is a projection of the implementation. A component registry can read the directory tree; an observed dependency list can be induced from call sites. A drift check re-derives the selected facts and reports divergence from the maintained view. The correspondence covers what that derivation observes, not every property of the program.

### Generate when the model owns the truth

Code, configuration, or documentation can be emitted from a model. For example, a schema can generate the types used by interface clients. A freshness check compares the checked-in artifact with current generator output; provenance identifies the model and generation step that produced it. The generator preserves that declared correspondence while leaving open whether the schema expresses the right contract.

<!-- label: derive-generate-trace -->
<!-- figure: assets/derive-generate-trace.svg | *Three correspondence patterns.* Derive where implementation is the source of truth; generate where the model is the source of truth; otherwise maintain traceability and check the correspondences that are decidable. -->

<!-- point: the-computation-model-is-the-generate-case-execution-follows-it | A runner can read a task model to determine dependency order and readiness without generating a separate artifact. | terms: map-and-territory, derive-and-join -->

A model can also direct work by being read during execution. Return to the build with two independent compilation tasks and one link task. The build declaration names each task and states that linking requires both object files. A runner reads those declarations to decide which tasks are ready: it may start the independent compilations, but it must wait for both results before linking. The compiler and linker still perform the individual operations. Their dependency order comes from the build declaration.

The same declaration can answer a question without running the build. To find what a changed object file could affect, project the declared dependencies into a graph and follow its outgoing edges. In this example, the path reaches the link task. The runner uses the relationships to schedule work; the analytical view exposes them for queries and checks. DocAble's connected-models inset develops these two uses and shows how the correspondence differs across document formats.
```

### 25-correspondence-recap

Source: `book/latex/sources/part2/2.5-system-knowledge.tex`; original projection SHA-256 `a9db16186073ab6619d98d0da953230169814de44cf020a64c2cfabd7450a0a0`.

```markdown
<!-- point: the-narrow-guarantee-is-the-boundary-part-iii-begins-at | The bounded guarantee — decide the decidable over the claimed surface — is the boundary Chapter 3 opens on, examining why correspondence does not by itself establish correctness. | terms: modeling-principle, alignment-principle, map-and-territory -->

{{chapter:alignment}} examines why correspondence between a model and its implementation does not, by itself, establish correctness. Derive where implementation is the source of truth; generate where the model is the source of truth; trace and check where neither fully determines the other.
```


## 2026-11-05 — Approved Chapter 2 comparison followups (batch 2)

Applied after the author individually approved these comparison followups. Native LaTeX remains authoritative. Source revision: `005947527192ae65b958fc9a37ce8746dbbc6391` (working tree).

### 25-one-alignment-handoff

Source: `book/latex/sources/part2/2.5-system-knowledge.tex`; original projection SHA-256 `f660483f6a6a11ed33df200b08d286bd78672d71e6567191bd36c2c50ad71425`.

```markdown
<!-- point: part-2-ends-where-part-3-begins-the-models-already-pay-enforcement-is-a-separate-question | Models are useful without enforcement — they preserve decisions, expose relationships, and let engineers and agents reason from shared representations; Alignment adds another use by turning selected modeled properties into obligations. | terms: modeling-principle, alignment-principle -->

Models are useful without enforcement. They preserve decisions, expose relationships, support analysis, and let engineers and agents reason from shared representations rather than reconstructing the same knowledge from prose or code. Alignment adds another use: some modeled properties can become obligations that constrain what the engineering process may admit. We turn to that next. {{chapter:software-factories}} returns to these models as part of the engineering environment surrounding agentic production, and {{chapter:theory}} examines when carrying explicit representations is worth their cost.
```


## 2026-11-06 — Preface: familiar practices and the purpose of the book

Source: `book/latex/sources/frontmatter/0.5-preface.tex`, “Why MAGE? Why Models?”, line 58. Source revision: `a7e67851b6fc25fe195731b42c564e7959af2346` (working tree). Native excerpt SHA-256: `b0850fb852e2aa7de6d972c1c40925efab988751b69dfa5c4c43f585b87e67cb`. Revised on 6 November 2026 at the author's request; removal revision pending.

Reason: Replace the contribution statement with a short positioning paragraph that acknowledges agentic harnesses such as Kiro and explains the book's value in understanding, evaluating, and adapting familiar engineering practices. The established lineage and economic transition remain.

```latex
MAGE does not make architecture, abstraction, or formal verification new. Its contribution is to bring established engineering ideas together in an environment where intelligent agents perform much of the realization, consequential knowledge and obligations remain explicit, and the engineering process itself can be represented, analyzed, and governed. Commodity intelligence changes the economics of maintaining that arrangement.
```


## 2026-11-06 — Preface: system obligations across successive changes

Source: `book/latex/sources/frontmatter/0.5-preface.tex`, “Why MAGE? Why Models?”, line 58. Source revision: `a7e67851b6fc25fe195731b42c564e7959af2346` (working tree). Native excerpt SHA-256: `4fb1e9b52f3115645740be1b1c4aa8ff81225bc8a5b1f2e2c5926a3e4d586cbb`. Revised on 6 November 2026 following the author's clarification; removal revision pending.

Reason: The earlier positioning acknowledged familiar workflow practices but underplayed the book's question of retaining system-level understanding and control through successive agent-made changes. The replacement emphasizes interacting parts, enduring obligations, independent evidence and enforcement, and governance conversion without claiming those capabilities are exclusive to MAGE.

```latex
MAGE draws on established ideas in architecture, abstraction, and verification. Agentic harnesses such as Kiro already organize development through requirements, design, and implementation tasks, giving agents explicit representations to work from.\citep{kiro2026specs} Readers may recognize much of this practice. The book explains why these arrangements can help and develops the judgment needed to choose and adapt them. That requires understanding what each representation makes visible, what a check establishes, and which decisions still require human judgment. Engineers must also judge whether the benefits justify the cost of maintaining the supporting structure. Commodity intelligence changes the economics of that arrangement.
```


## 2026-11-06 — §2.4: entitlement repair and model evolution

Review item: `24-entitlement-repair-synthesis`. Source: `book/latex/sources/part2/2.4-decision.tex`, “Worked example — Service calls and upload entitlement”, lines 156–209. Source revision: `991c1a04aa3ca2b87fa4a8aa9374c98cc6b0bddd` (working tree). Native excerpt SHA-256: `64c1916bc0c54d87f32a749c4015a51f2b92d6405542ec2d030fc9d52f4cd6a2`. Removed on 6 November 2026 after author approval; removal revision pending.

Reason: Replace the original failure account with the verified sequence and numbered figure explanation. Explain why the simple balance rule initially needed no separate decision model, how unlimited entitlement made the policy harder to understand across implementation sites, and how the explicit model separated admission from display. Remove the compatibility-shim detail and elapsed-time claim at the author’s request.

```latex
% <!-- point: the-scalar-was-adequate-until-the-domain-changed | DocAble originally had only finite-credit groups, so a scalar sum was an adequate admission representation; when unlimited groups arrived, no explicit model of the admission decision existed to carry the change. -->

DocAble originally represented upload entitlement in finite credits alone. In that system, reducing a user\textquotesingle s groups to a single number --- the sum of their credit balances --- was adequate for deciding whether a document could be processed. The product later gained unlimited groups, and the domain change altered the admission question: entitlement was no longer a single finite quantity. No explicit model of the upload-admission decision existed at the time. The decision lived in several implementation sites --- a server-side reduction, a client-side preflight, the server\textquotesingle s admission gate --- each with its own hand-rolled representation of the user\textquotesingle s groups.

% <!-- point: the-old-reduction-observed-the-distinction-and-discarded-it | The legacy reduction read each group's unlimited flag and used it to exclude unlimited groups from the credit sum; its scalar output had no place for "unlimited," so an unlimited user became zero credits — a representation failure, not missing information. -->

One of those representations did not evolve. In August 2026, a user whose one group carried unlimited entitlement was blocked from uploading a thirty-eight-page document by a paywall: \emph{the upload needs 38 credits, and you have 0}. The root cause was a legacy server function that reduced a user\textquotesingle s groups to one scalar, the sum of their finite credit balances. The function was not ignorant of unlimited entitlement. It read each group\textquotesingle s unlimited flag twice, using it once to \emph{exclude} unlimited groups from the sum and once to compute a display label. Its output type simply had no place to put the fact, so the distinction died at the return statement. A purely-unlimited user became \texttt{0} credits; the client compared 0 against 38 and rejected the upload; the server\textquotesingle s authoritative admission logic, which handled unlimited correctly, was never reached. This was a representation failure, not an information-availability failure. The implementation held the fact and threw it away.

% <!-- point: the-production-failure-produced-the-model | The root-cause analysis made the admission question explicit and produced an explicit entitlement decision model — with property tests, a cross-runtime parity corpus, and a shape check — in roughly five hours from RCA to deletion of the lossy reduction. -->

The root-cause analysis made the admission question explicit: given the user\textquotesingle s group entitlements and the requested work, should this upload be admitted, and under which entitlement? We introduced an entitlement decision model to answer it. Property tests checked the model, a cross-runtime parity corpus supplied shared test cases to check that server and client followed the same decision table, and a further check validated the model\textquotesingle s shape. We deleted the legacy scalar reduction without a compatibility shim. The display code then derived its values from the model, and the admission gates used the model\textquotesingle s decision. From root-cause analysis to deletion of the lossy representation took roughly five hours.

\textbf{Entitlement decision model · Decision}

\begin{itemize}
\tightlist
\item
  \textbf{Engineering question} --- May this user upload this document, and under which entitlement?
\end{itemize}

\begin{itemize}
\tightlist
\item
  \textbf{Model} --- per-group entitlements that keep finite and unlimited as distinct cases; the output is a structured admission decision: admitted or not, the group that authorizes it, and the ordered plan by which the verdict was reached.
\end{itemize}

\begin{itemize}
\tightlist
\item
  \textbf{Property} --- an unlimited entitlement can never be reduced to zero credits; the displayed balance is a projection of the model, not an authority for admission.
\end{itemize}

\begin{itemize}
\tightlist
\item
  \textbf{Quality attribute} --- decision correctness; fidelity between the domain and its representations.
\end{itemize}

% <!-- point: the-repair-was-model-to-model | The repair changed the representation through which the decision was made, not merely the failing conditional: the revised model preserves the finite/unlimited distinction and states the admission decision explicitly, and the implementation was then changed to consume it. -->

The repair did more than patch the conditional that failed. It changed the representation through which the decision was made. Upload entitlement could no longer be represented as a scalar credit balance: the revised model preserves finite and unlimited entitlement as distinct cases and represents the admission decision explicitly --- whether the upload is admitted, which group supplies the entitlement, and the ordered plan used to reach the verdict. The implementation was then changed to consume that model. The same triggering state that once read as \texttt{0} credits now reads as \emph{admit by unlimited entitlement}. The finite-credit scalar still exists where that quantity is the actual question, displaying remaining credits, but it is no longer used as a model of upload permission (\autoref{entitlement-model-evolution}).

\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/entitlement-model-evolution-31ef2274cf.pdf}
\caption{\emph{Upload admission must distinguish finite and unlimited entitlement.} The old reduction passed only a finite balance to the client, so an unlimited user was rejected. The revised model records the entitlement kind and returns an admission decision.}
\label{entitlement-model-evolution}
\end{figure}

% <!-- point: the-model-was-part-of-the-repair | The failure revealed a decision made through a representation that could no longer express the system's domain; making the decision explicit forced the representation to preserve the distinction the system had acquired. -->

The revised decision model was part of the repair, rather than merely documentation of it. The failure revealed that an engineering decision was being made through a representation that could no longer express the system\textquotesingle s domain, and making the decision explicit forced the representation to preserve the distinction the system had acquired. The opening section defined a model as a purposeful reduction that preserves the distinctions its question requires. The old scalar was a reasonable model of \emph{how many finite credits remain}. Once unlimited entitlement was introduced, that scalar was no longer a sufficient model of \emph{may this user upload}. The gap between those two questions then became a production failure.
```


## 2026-11-06 — §2.5: measurement and engineering use

Review item: `25-measurement-and-engineering-use`. Source: `book/latex/sources/part2/2.5-system-knowledge.tex`, “Modeling Makes Properties Available to Engineering”, lines 263–296. Source revision: `901b381f47e2a1dba8ffebd4586209d9130fd7d0` (working tree). Native excerpt SHA-256: `478aa23d0b2360f6a80bd39d0c5137438a1289da8a9d9c7a678c6a3c8aa1392e`. Removed on 6 November 2026 after author approval; removal revision pending.

Reason: Consolidate repeated explanations of the Modeling/Alignment distinction, refer back to the earlier eight-worker example, retain the local Chapter 3 signpost and design examples, and make the chapter recap lead into the agent-reasoning inset. The fuller Chapter 3 handoff remains at the chapter’s end.

```latex
\section{Modeling Makes Properties Available to Engineering}\label{heading:modeling-makes-properties-available-to-engineering}

% <!-- point: a-model-does-not-govern-by-existing-it-makes-a-property-explicit | Models make properties explicit; whether to enforce them is a separate decision. | terms: modeling-principle, alignment-principle -->

A model does not govern the system merely by existing. A structural model can name a forbidden dependency without preventing it; a behavioral model can name an illegal transition without rejecting it; a measurement model can represent a budget without stopping work that exceeds it. Modeling makes these properties explicit. It does not enforce them.

Suppose a worker-pool model records the number of running jobs and the capacity available to execute them. The comparison may help an operator plan a larger pool, help the system tune admission, or supply a hard rule that refuses work above the bound. Those uses require different mechanisms. The quantities and their units make the comparison meaningful; they do not decide what crossing the bound should do.

% <!-- point: measurement-boundary-modeling-and-enforcement-are-separate | A measurement model defines quantities and their reference bounds; observation, adaptation, and enforcement require separate decisions and mechanisms. -->

\autoref{modeling-perp-enforcement} draws that separation. A measurement can supply evidence without being a hard limit. Engineers must also decide who chooses the reference value, how the quantity is collected, and what action follows from the comparison.

\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/modeling-perp-enforcement-e698f185ed.pdf}
\caption{\emph{Modeling and enforcement are separate decisions.} The measurement model defines the quantity and reference bound; Alignment determines whether the result is observed, used to adapt behavior, used to trigger graceful degradation, or enforced by a gate.}
\label{modeling-perp-enforcement}
\end{figure}

% <!-- point: relational-obligations-need-enough-representation | Local syntactic obligations need little modeling; architectural boundaries, temporal obligations, distributed ownership, provenance, and end-to-end policy need enough representation to expose the relevant relationships, which Modeling makes available to analysis and governance. | terms: modeling-principle, alignment-principle -->

Local syntactic obligations can often be checked with little explicit modeling. Architectural boundaries, temporal obligations, distributed ownership, provenance requirements, and end-to-end policies require enough representation to expose the relevant system relationships. Modeling makes those relationships available to analysis and, where appropriate, to governance.

They are also available to design. A dependency graph may reveal that an execution boundary is artificial; a behavioral model may expose a recovery protocol that should change; a quantitative model may show that an otherwise plausible decomposition cannot meet its resource envelope. In each case, analysis of the model can change the architecture before implementation commits to the choice.

% <!-- point: alignment-does-not-require-a-separately-represented-model | Alignment does not require every obligation to have a separately represented model — some properties are observable at an action or artifact boundary and can be constrained directly; models extend the range of properties available for analysis and enforcement. | terms: modeling-principle, alignment-principle -->

Alignment does not require every obligation to have a separately represented model. Some properties are already observable at an action or artifact boundary and can be constrained directly. Models extend the range of properties available for analysis and enforcement.

% <!-- point: docable-models-arose-around-expensive-questions | Models are justified by engineering questions whose relevant distinctions would otherwise be expensive or unsafe to reconstruct; shared identities connect views where a decision crosses them. | terms: modeling-principle, model-classes -->

The examples began with engineering questions: where a dependency belongs, which state changes are allowed, who owns a job, what a decision permits, and which facts must be joined. Different questions required different reductions. Shared identity and explicit correspondence connect them where a decision crosses views.

\magevalue{chapter:alignment} asks which obligations the engineered environment should enforce, where they become decidable, and what evidence and mechanisms are sufficient to enforce them.
```


## 2026-11-06 — §3.1: hooks, permissions, and enforcement decisions

Review item: `31-hooks-without-method-defense`. Source: `book/latex/sources/part3/3.1-where-obligations-can-be-enforced.tex`, “Hooks and Permissions” inset, lines 94–98. Source revision: `7a89fa84cb6a5228d17bdfc433e7eb938a0eccfa` (working tree). Native excerpt SHA-256: `f41be643671e5ac8541546d3d9bae07c61df748e675ec937d863789828c9ac8c`. Removed on 6 November 2026 after author approval; removal revision pending.

Reason: Introduce familiar permissions and hook examples before explaining where intervention occurs and what the configured mechanism does. Develop the engineering inference through evidence availability, warning versus blocking, and preventing a production write before it occurs. Remove repeated mechanisms and commentary about the book’s choice of abstractions.

```latex
MAGE\textquotesingle s Alignment principle appears in today\textquotesingle s agent harnesses partly through mechanisms that interpose on agent actions. Harnesses may require permission before a tool executes, restrict which tools or resources an agent can access, or invoke hooks when the agent attempts an operation. These mechanisms create places outside the producing model turn where the engineered environment can observe, constrain, or reject what the agent is trying to do.

The mechanisms provide different kinds of control. Permissions and restricted tool surfaces can remove actions from the agent\textquotesingle s available repertoire---for example, allowing a deployment tool to read production state while denying it permission to modify that state. Pre-action hooks can inspect a proposed command or mutation and reject it when an obligation is violated. Post-action hooks can run checks or collect evidence after a change has occurred. Beyond the harness itself, tests, linters, type checkers, CI gates, policy engines, and deployment controls can evaluate larger units of work before they are accepted. What matters is not whether a mechanism is called a hook or a gate, but what obligation it checks and what it does when that obligation is violated.

This is why MAGE describes governance mechanisms and enforcement boundaries rather than treating hooks or permissions as the abstraction. Harness features expose convenient contemporary control points, but the underlying engineering problem is broader: determine which obligations matter, where sufficient evidence exists to evaluate them, and what mechanism constrains or rejects unacceptable realization.
```


## 2026-11-06 — §3.1: boundary placement and useful feedback

Review item: `31-feedback-as-actionable-evidence`. Source: `book/latex/sources/part3/3.1-where-obligations-can-be-enforced.tex`, “Return Evidence at the Earliest Useful Boundary”, lines 127–133. Source revision: `fd05c72d58f86c8326c28e22b6d0f03f7f830161` (working tree). Native excerpt SHA-256: `c0e68c08f493d1439e7358487fe73956601fe11f52d541a73f8061f8ad4fa688`. Removed on 6 November 2026 after author approval; removal revision pending.

Reason: Preserve the explanatory connection between boundaries and feedback while identifying the evidence returned by checks and developing why delayed feedback can require reconstructing the earlier work. Context preservation before compaction remains in §3.2.

```latex
% <!-- point: every-boundary-determines-where-feedback-can-return | Every boundary also determines where feedback can return; earlier evidence means less to reconstruct. | terms: intervention-boundary, feedback -->

% <!-- index-def: intervention-boundary -->

% <!-- index-def: engineered-agent-loop -->

The boundaries also decide where feedback can return. A harness can preserve durable state before a lossy compaction; an action hook can explain why a call was refused; CI can hand back a failing invariant while the change is still fresh in the window; a deployment validator can report which evidence failed admission. The earlier useful evidence returns, the less work an agent must reconstruct before repairing the miss.
```


## 2026-11-06 — §3.1: principle and concrete enforcement examples

Review item: `31-keep-principle-at-chapter-bookends`. Source: `book/latex/sources/part3/3.1-where-obligations-can-be-enforced.tex`, lines 139–159. Source revision: `856020173aa5cbae85a85b766700b47d1425e318` (working tree). Native excerpt SHA-256: `92d4e7e7560ebe3bc659035fabe769fbadc0e03d3c624eed701b370cefe84de6`. Replaced on 6 November 2026 after author approval; replacement revision pending.

Reason: Preserve the canonical Alignment Principle, remove the unnecessary Chapter 4 transition, and develop locally cited examples of Docker’s network proxy and Spotify’s required verification before pull-request creation. Add a Chapter 5 signpost to the fuller factory discussion. The principle, takeaway, and example markers are retained.

```latex
% <!-- point: the-alignment-principle-stated-whole | The Alignment Principle, stated whole: make engineering obligations enforceable by encoding them into mechanisms — constrain, sense, evaluate, admit — that can enforce them; in other words, once an obligation is entrusted to the engineering environment, satisfying it should not depend solely on each future agent remembering it. | terms: alignment-principle, intervention-boundary -->

\textbf{The Alignment Principle:} make engineering obligations enforceable by encoding them into mechanisms that constrain actions, produce evidence, evaluate that evidence, and control admission. \emph{In other words:} once an obligation is entrusted to the engineering environment, satisfying it should not depend solely on each future agent remembering it.

% <!-- point: alignment-installed-at-a-boundary-is-easiest-to-see-in-systems-already-running-it | Enforcement installed at a boundary is easiest to see in systems already using it. | terms: alignment-principle, intervention-boundary -->

\magevalue{chapter:one-problem-many-models} turns these mechanisms into method. For now, their placement is easiest to see in systems already using them.

% <!-- worked-examples: alignment-principle -->

\subsection{Example --- Docker}\label{heading:example-docker}

Docker\textquotesingle s public account places enforcement in the environment, not its instructions: the agent acts only through a constrained tool seam, and the platform --- not the prompt --- decides what that seam permits. A move outside the boundary is refused, not merely discouraged. The permission is enforced at the action boundary: the agent cannot override it through its instructions.

Spotify\textquotesingle s public account describes migration agents operating through a restricted API and a narrow Git interface, with every change clearing a merge gate before it lands. The gate, not the agent\textquotesingle s confidence, admits the work.

% <!-- takeaway -->

Place the enforcing mechanism at a boundary where the obligation is legible and the environment can evaluate or constrain the relevant work. The appropriate boundary depends on the obligation.

% <!-- worked-examples-end -->
```


## 2026-11-06 — §3.2: traceability and the enforcement decision

Review item: `32-traceability-without-novelty-frame`. Source: `book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex`, lines 23–25. Source revision: `28261de14442e437967093e63c975fed798b7e24` (working tree). Native excerpt SHA-256: `49e267d3705d393c78c770c5bb8f8cce187f22f193a3f8470fb9033ed8a66ac0`. Replaced on 6 November 2026 after author approval; replacement revision pending.

Reason: Connect the engineering problem to requirements traceability the reader may already know, develop how the links support evaluation and change analysis, and retain the closing question about enforcing a finding. Preserve the stable point ID while updating its summary.

```latex
% <!-- point: software-engineering-has-a-traceability-heritage-alignment-builds-on | Software engineering already connects intent to realization through requirements, traceability, verification, and acceptance; Alignment builds on that tradition but adds a further question — should the resulting judgment merely inform the work, or should the environment enforce it? | terms: independent-obligation, traceability -->

Software engineering already has a long tradition of connecting engineering intent to realization through requirements, traceability, verification, and acceptance. A requirement may be traced to design elements, implementation, tests, and other evidence so that engineers can ask whether the intended obligation survived realization. Alignment builds on that tradition but asks an additional question: should the resulting judgment merely inform the work, or should the environment enforce it?
```


## 2026-11-06 — Preface footnote 1: the four engineering questions

Review item: `preface-engineering-questions`. Source: `book/latex/sources/frontmatter/0.5-preface.tex`, the `functional-terms` footnote in the paragraph beginning “Now, the boundary between human intent and machine action is shifting”, line 28. Source revision: `28261de14442e437967093e63c975fed798b7e24` (working tree). Native excerpt SHA-256: `1f13770fb17554eec3552f843944cff9bcc69d2ba0a30acf11b9b3b19144fadf`. Removed on 6 November 2026 after author approval; removal revision pending.

Reason: The footnote should perform one job — clarifying that functional terms such as interpret, reason, and judge describe capabilities rather than cognition. It also restated the book’s central motivation and then introduced four questions, which belong in the main text. The footnote now ends at “…imperfect realization of the general-purpose machine intelligence assumed here.”

Disposition: Relocated, not merely cut. The four questions are inserted into the Chapter 1 part intro (`book/latex/sources/part1/00-part-intro.tex`), after the paragraph ending “…enforcing consequential engineering decisions across many changes.” Chapter 1 answers the questions across §§1.1–1.4 but never poses them together, so presenting them together gives a compact statement of the engineering problem before its components are developed. They may also serve a talk or a future revision; the original wording is preserved here for that use.

Excerpt scope: The deleted sentence about cheap implementation that preceded the questions is retained with them, so the footnote’s original wording survives intact.

```latex
Implementation has become cheap enough that agents can produce and modify software at extraordinary speed. The engineering problem therefore shifts: What should we build? What must the agent know about the system? How will we know whether its changes are correct? Which rules must it obey?
```


## 2026-11-06 — Preface, “Why MAGE? Why Models?”: context versus models

Review item: `preface-context-vs-models`. Source: `book/latex/sources/frontmatter/0.5-preface.tex`, closing paragraph of “Why MAGE? Why Models?”, line 62. Source revision: `28261de14442e437967093e63c975fed798b7e24` (working tree). Native excerpt SHA-256: `3df51a0a539180469fba32e4e3d8828fa6c8c385582256cef979e9404342a0f8`. Removed on 6 November 2026 after author approval; removal revision pending.

Reason: The paragraph followed the section’s conclusion about engineering authority and preceded the book’s empirical origin story, so it diluted a substantial ending and weakened the transition. Its distinction is conceptually important and foreshadows Chapter 6’s encoding–realization decomposition, so it is preserved rather than discarded: better context improves the reasoner’s chances, while a better model can make the property explicit enough to analyze or check, reducing how often the question must be answered through inference.

Disposition: The substance has been incorporated into Chapter 1 §1.4 (`book/latex/sources/part1/1.4-the-new-engineering-problem.tex`), immediately before the numbered Representation and Enforcement Problems, where the reasoning-horizon and probabilistic-reliability discussions have already supplied the necessary concepts. The original wording is preserved here for future comparison.

```latex
MAGE examines how software-engineering environments should change when machines can perform both reasoning and implementation. Better context can help an agent make a consequential judgment correctly. Better models can sometimes make the relevant property explicit enough that the environment can analyze or check it instead. The first improves the reasoner\textquotesingle s chances; the second can reduce how much judgment must be reconstructed and exercised again at all.
```


## 2026-11-06 — §3.2: Explain proof scope once, then keep the queueing example

Review item: `V5` (`32-proof-and-obligation-once`). Source: `book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex`, lines 63–77. Source revision: `00345cda5128ac1d15f93e9aedf830a9a83eb1f9`. Native excerpt SHA-256: `670a7a57b1939afb5b9fff6d344866c81f4cbe87cb26a72591ac3871490f079c`. Replaced on 6 November 2026 after author approval.

Reason: Keep the framing sentence and distinguish Lean proof checking from TLA+ specifications and TLC model checking. Consolidate the repeated proof-scope explanation and retain the approved queueing-service example verbatim.

```latex
% <!-- point: proof-strength-applies-to-the-proposition-proved-not-to-its-adequacy | A proof's strength applies to the proposition proved, not to whether that proposition captures the obligation engineering should preserve. | terms: agreement-vs-correctness, independent-obligation -->

Stronger verification does not remove this distinction. A proof assistant such as Lean can establish, with extraordinary rigor, that a realization satisfies a formally stated property. That strength applies to the proposition being proved; it does not establish that the proposition captures the properties engineering should preserve. For example, asking an agent both to produce an implementation and to formulate and prove the property it satisfies can create a circular argument: the generated property may merely formalize assumptions already embodied in the implementation. The proof may be valid while establishing little about whether the implementation satisfies the independently intended engineering obligation. Formal verification can therefore provide exceptionally strong Alignment for a represented obligation without solving the upstream Modeling problem of deciding what that obligation should be.

% <!-- point: the-stronger-the-verifier-the-more-the-distinction-matters | The stronger the verifier, the more the distinction matters: a proof removes uncertainty about the stated property while leaving untouched whether engineering stated the right one. | terms: agreement-vs-correctness, independent-obligation -->

The stronger the verifier, the more important this distinction becomes. Weak evidence leaves uncertainty about whether the system satisfies the stated property. A proof can remove much of that uncertainty while leaving untouched the separate question of whether engineering stated the right property. None of this argues against having agents produce the proofs. Cheaper verification is a gain, and \magevalue{sec:constraints-sensors-validators-gates} makes the same case for synthesized guardrails: the machine can help build the mechanism while the engineer stays responsible for the obligation and for checking that the mechanism enforces it.

% <!-- point: docable-requested-temporal-checking-for-an-obligation-its-models-already-carried | Fix the required behavior before choosing an analysis; independence concerns the source of the obligation and the implementation judged against it. | terms: independent-obligation, agreement-vs-correctness -->

For example, an engineer can require a queueing service to bring every accepted job to a terminal state, then ask an agent to develop an analysis of that requirement. The agent may help formalize the obligation and construct the checker. What matters is that the obligation comes from what the service must do, rather than being chosen merely because the current implementation satisfies it.

% <!-- point: alignment-makes-conformance-dependable-modeling-decides-what-can-become-an-obligation | Alignment can make conformance to an obligation dependable; Modeling determines what engineering knowledge is available to become an obligation at all. | terms: modeling-principle, alignment-principle -->

Alignment can make conformance to an obligation extremely dependable. Modeling determines what engineering knowledge is available to become an obligation in the first place. Proof strength belongs to the conformance relation alone.
```


## 2026-11-06 — §3.2: Name when static type checks run

Review item: `V7` (`32-type-checking-boundary`). Source: `book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex`, lines 174–174. Source revision: `00345cda5128ac1d15f93e9aedf830a9a83eb1f9`. Native excerpt SHA-256: `18b068621662fd0d525568b3162604cc93b049482f9233d3ad32a69be0ed225e`. Replaced on 6 November 2026 after author approval.

Reason: Types do not act the instant an expression is written. A static type checker evaluates uses of types when it runs. Keep the boundary menu while removing the instantaneous-mechanism claim.

```latex
\textbf{Types} act as soon as an expression is formed --- a shape is legible the instant it is written.
```


## 2026-11-06 — §3.3: State exactly what the closed type excludes

Review item: `W1` (`33-closed-enum-scope`). Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`, lines 89–95. Source revision: `00345cda5128ac1d15f93e9aedf830a9a83eb1f9`. Native excerpt SHA-256: `50ca9c8cfdaa5cb0954f1500793c7fa6fc377270e077f14f5d958ab894bf48f2`. Replaced on 6 November 2026 after author approval of uncommented §3.3 edits.

Reason: The current text promises that a compiler rejects any invalid value on the spot and that no iteration is spent catching it. It also leaves the reader to distinguish an invalid representation from an invalid transition. Scope the example to checked construction of a closed type, then name the remaining transition obligation.

```latex
% <!-- point: a-constraint-prevents-drift-within-the-iteration-and-costs-no-iteration | A constraint prevents drift within the iteration, costing none. | terms: constraint, typed-enum -->

% <!-- index-def: constraint -->

% <!-- gloss-only: Constraint | A governance mechanism that prevents drift by scoping the agent's action space so the wrong move is unavailable within a loop iteration (a typed enum instead of a string); the prevented mistake costs no failed iteration. -->

\textbf{A constraint removes an unwanted action or state from the admissible space.} Unlike a sensor, which observes the resulting state after the fact, a constraint makes the prohibited move unavailable through that mechanism. Closed representations are the cleanest example. A lifecycle encoded as arbitrary strings admits values the design never intended, and a mismatch surfaces only an iteration later, when the test suite crashes. Encode it as a closed enumeration instead and the compiler rejects any value outside the declared set on the spot. The enum does not watch for the illegal state later --- it removes that representation from well-typed code, and no iteration is spent catching it. Where the valid action or representation space is naturally closed, MAGE prefers representations that exclude invalid members structurally.
```


## 2026-11-06 — §3.3: Keep evaluation distinct from enforcement in the scope inset

Review item: `W2` (`33-validator-evaluates-wrong-obligation`). Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`, lines 224–224. Source revision: `00345cda5128ac1d15f93e9aedf830a9a83eb1f9`. Native excerpt SHA-256: `261b3ac6c1bb10b3aeacc3f01a20ee78b595ee1d8add8d12b110e02b064dc74c`. Replaced on 6 November 2026 after author approval of uncommented §3.3 edits.

Reason: The scope inset says a validator can faithfully enforce the wrong obligation, although the chapter defines a validator as evaluating evidence. Correct the verb without reopening the approved test-gate scope paragraph.

```latex
A validator can faithfully enforce the wrong obligation; a model can omit a consequential distinction; a sensor can fail to observe the relevant state.
```


## 2026-11-06 — §3.3: Close the provenance explanation once

Review item: `W4` (`33-provenance-one-synthesis`). Source: `book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex`, lines 318–322. Source revision: `00345cda5128ac1d15f93e9aedf830a9a83eb1f9`. Native excerpt SHA-256: `c0501fc6577cb1fe9eec7d1eccf9254cda66336272522f61bb9a03a66ab58135`. Replaced on 6 November 2026 after author approval of uncommented §3.3 edits.

Reason: After the concrete mechanism, selection guidance, and producer/consumer distinction, the passage gives three more versions of the same conclusion. Keep one short connection to the interaction graph and remaining implementation freedom.

```latex
The rule of thumb is short. \textbf{When the forbidden paths are enumerable, ban them. When the allowed path is easier to characterize than all possible bypasses, have the allowed path issue the provenance required at the boundary.}

Provenance-carried admission removes a particular degree of freedom: a protected operation must derive from the sanctioned source or path. Other implementation choices remain open; only the sanctioned derivation can produce an admissible operation.

This is a graph-shaped variation on architectural enforcement. Layering constrains which components may interact across a layered structure. Provenance-carried admission instead constrains a particular derivation through an otherwise richer interaction graph: many implementation paths may exist, but only a path through the sanctioned node can produce an operation permitted to cross the admission boundary.
```

## Chapter 1 figure roadmap caption, 6 November 2026

- Source: `book/latex/sources/part1/1.4-the-new-engineering-problem.tex`, line 43.
- Source revision: `2c98ebd83129058a60187f4ae2c3aa0b7ec9ba6f`.
- Status: author-approved caption shortening; Chapter 2 and Chapter 3 now label the corresponding figure nodes.
- Reason: keep the standalone explanation while moving the chapter signposts into the figure.

```latex
\emph{From substrate to method.} Finite reasoning state creates the Representation Problem; probabilistic autonomous work creates the Enforcement Problem. Chapters 2 and 3 develop MAGE\textquotesingle s corresponding answers: Modeling and Alignment.
```

## 2026-11-06 — V6: Require evidence of rendering, not merely a successful fetch

Source: `book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex`, line 139; revision `2c98ebd83129058a60187f4ae2c3aa0b7ec9ba6f`. Author-approved replacement.

Reason: Restore the earliest-boundary lesson while requiring evidence of browser rendering. A preview or staging deployment may supply the relevant composition earlier; a successful HTTP fetch alone does not establish that scripts ran or expected content appeared.

```latex
% <!-- point: a-deployment-can-pass-every-check-and-still-serve-a-blank-page | A deployment can pass every earlier check and still serve a blank page; the property is legible only once the pieces compose in the served system. | terms: semantic-gap, earliest-legible-boundary -->

A deployment can pass twenty checks and still serve a blank page. No earlier check necessarily failed: the relevant property --- does the deployed page correctly render the emitted data? --- does not exist at the source-file, build, or emission boundary. It becomes legible only after those pieces compose in the served system. A smoke check that fetches the served page is the earliest boundary that can decide it.
```


## 2026-11-06 — X2: End the Chapter 1 summary on engineering judgment

Review item: `X2` (`15-end-on-engineering-judgment`). Source: `book/latex/sources/part1/1.5-problem-summary.tex`, lines 18–20. Source revision: `fcddc4562ced4c88915d849cce60fdd1ef1da19a`. Native excerpt SHA-256: `8c405799e03ca7e0b7711107d55132664c8d055db6c04b5fb71d4e909fe77a09`. Applied after the author approved X2 with an idiom correction.

Reason: Remove the repeated Chapter 2/3 roadmap from the summary, retaining the earlier signposts in §1.4. Replace “what should bind implementation” with “which obligations should be enforced.” The summary closes on the engineering choices.

```latex
Neither move eliminates engineering judgment. Models preserve selected distinctions rather than representing everything, and not every obligation can or should be mechanically enforced. The engineering task is to decide what should be explicit, what should bind implementation, what should remain open, and what evidence is sufficient for the consequence at stake.

Chapters \magevalue{chapter:modeling|num} and \magevalue{chapter:alignment|num} develop those two problems separately. \magevalue{chapter:modeling} asks what should be modeled. \magevalue{chapter:alignment} asks how selected engineering obligations come to be enforced.
```


## 2026-11-06 — X1: Keep a compact Chapters 2–5 roadmap

Review item: `X1` (`14-trim-repeat-roadmap`). Source: `book/latex/sources/part1/1.4-the-new-engineering-problem.tex`, line 55. Source revision: `ce9e52fc89fea2115639b38ae4f09943e8f6ec09`. Native excerpt SHA-256: `e41629f83d76205e9fbb4ed3ec46ed0d2f2f6ed71aa4606aa01840a3f353e47e`. Applied after explicit author approval.

Reason: The earlier problem descriptions already introduce Chapters 2 and 3. Name Chapters 2–5 together here before the theory and implications signposts, preserving orientation without repeating those descriptions.

```latex
This book develops MAGE through software engineering, drawing on the DocAble case study. \magevalue{chapter:modeling} asks how to represent the knowledge needed for engineering decisions. \magevalue{chapter:alignment} asks how selected obligations can govern the work. \magevalue{chapter:theory} develops the theory and examines its scope and limits. \magevalue{chapter:profession} considers its implications beyond software.
```
