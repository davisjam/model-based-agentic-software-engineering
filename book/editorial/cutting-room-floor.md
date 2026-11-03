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
