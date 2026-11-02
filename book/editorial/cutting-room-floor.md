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
