# Chapter 1: complete disposition audit

**Author approved all three dispositions on 2026-11-09.** The audit is retained as the decision record. This version records the concrete review draft being compiled, while distinguishing the author’s approved copy from additional proposals awaiting approval.

## Decision summary

- **Approved:** the printer/engineering-object split, supplied replacement prose, three new subheadings, leverage-figure placement, and the latest DocAble opening quoted below.
- **Draft proposal, pending author approval:** move the original engineering-model terminology aside to §1.4’s foundation-model introduction.
- **Draft proposal, pending author approval:** move the model-routes figure to §2.1 **after the paragraph beginning “Neither direction guarantees…” and immediately before “Learning from implementation.”** A short new bridge replaces the old lead-in; the complete displaced lead-in remains archived. The caption changes only **“it serves three uses” → “it can support three uses.”**
- **Draft dispositions, pending author approval:** retain the remaining displaced explanatory callbacks/preambles/pointers in the cutting room where the inventory establishes that their teaching jobs are already covered elsewhere.
- **Local DocAble flag, no edit proposed here:** the later engineering-experiment paragraph repeats both the method’s origin and the Chapter 5 pointer now supplied by the approved opening. Its personal motivation still earns its place; do not remove that paragraph wholesale.

The complete inventory follows so that approval of new copy does not silently decide the fate of everything it displaced.

The complete source is preserved in [chapter-one-printer-before-20261109.tex](/private/tmp/mage-textbook-layout-20261109/book/editorial/chapter-one-printer-before-20261109.tex), from revision `cc92e3fac92da2b38a3569a00ca3f4ecdd85696c`, original lines 1–116, SHA-256 `2aedb040391ae89538194d79314e13053dc5c5b5b27ddb42320d66ccd008f650`. Archive line numbers below include its nine-line provenance header. The inventory accounts for **all 26 original prose paragraphs, all three embedded notes, and both figures with their captions**.

## Status and destinations

- **Approved copy** means the supplied final replacement explicitly retains, rewrites, or reorders this material. It does not imply approval of an additional relocation elsewhere.
- **Approved removal from §1.1** identifies an express instruction to remove the material from the printer analogy; the proposed final disposition is still stated.
- **Review: relocate / cutting room** identifies a substantive choice that the replacement copy alone should not silently decide.

Destination keys:

- **P:** [The Printer](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part1/1.1-the-printer.tex), five body paragraphs.
- **E:** [The Engineering Object](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part1/1.2-the-engineering-object.tex), with *Consequential Choices and Degrees of Freedom*, *Engineering the Environment*, and *When Agents Produce the Wrong Result*.
- **S:** [Agentic Machinery and Engineering Mechanisms](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part1/1.4-the-agentic-substrate.tex), especially *Foundation Model, Agentic Harness, and Engineered Environment*, *The Reasoning Horizon*, and *Probabilistic Work Needs External Enforcement*.
- **T:** [Two Problems the Method Must Solve](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part1/1.5-the-new-engineering-problem.tex), *The Two Problems in Software*.
- **M:** [From Context to Engineering Models](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part2/2.1-context-is-the-first-modeling-problem.tex), especially *Constructing and Revising a Model*, its *Learning from implementation* and *Judging what an agent discovers* subsections, and *The Engineering Modeling Repertoire*.

## Latest approved DocAble opening and local overlap

The author has approved the following replacement for the opening of [§1.3, MAGE by Example: Summary of the DocAble Case](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part1/1.3-mage-by-example.tex:17). The draft retains the existing DocAble product link and the dynamic Chapter 5 reference.

> The engineering methodology described in this book emerged from six months of developing and studying a production document-accessibility system called DocAble. I directed the development, but coding agents wrote every line of its implementation. My role was to exercise engineering judgment, direct the agents, and develop the models and controls governing their work. Chapter 5 examines the system and its development in detail. For now, a few facts about DocAble are in order.

The following *Accessibility and the Engineering Experiment* subsection still provides necessary context: the accessibility obligation, remediation effort, the author’s two courses, and why he chose this production problem. Two local overlaps are worth presenting for later review, **without rewriting them here**:

- Its final paragraph repeats the origin claim in **“The system became DocAble; the resulting method became MAGE”**, then repeats the **Chapter 5** destination. Those are the clearest redundancy candidates now that the opening supplies both. The paragraph’s account of choosing a real production problem for an agentic-engineering experiment is distinct and should remain.
- **“I stopped writing most of the implementation myself”** states the experiment’s intention more weakly than the opening’s approved outcome, **“coding agents wrote every line.”** This is not a factual contradiction—intention and outcome differ—but it can make the local account feel imprecise. Flag the wording for author review rather than silently changing it.

The repeated six-month duration in **“I was, however, perfectly willing to spend six months attempting to automate the work”** has a different purpose: it carries the author’s joke about avoiding manual remediation. I would retain it. The nearby undergraduate-remediation duration describes a different effort and should not be treated as a duplicate of DocAble’s development period.

The author subsequently approved these local DocAble copyedits: “As a lazy software engineer, however, I was perfectly willing…”; “as a real problem” (without “production”); and “roughly three hours per document,” removing the sentence about simple documents and a colleague’s week-long PDF. The source citation is retained with the labor estimate. The original DocAble source is preserved in `chapter-one-docable-before-20261109.tex`. The Claude quotation now uses correctly directed LaTeX quotation marks.

## Every original prose paragraph

| Archive line / opening | Disposition and reasoning |
| --- | --- |
| 21 — “Coding agents make implementation cheap…” | **Approved copy → P ¶1.** Replaces the reliability preamble with the productive-capacity question. The removed assurance point is already taught in S, *Probabilistic Work Needs External Enforcement*, particularly the paragraph beginning “The second problem concerns assurance”; E’s diagnostic ending also preserves the danger of rapid wrong implementation. No relocation needed. |
| 27 — “For an analogy, let us begin…” | **Approved copy → P ¶2.** Stapler/hole-punch comparison retained with the supplied local wording. |
| 29 — “But is the same true about printers?” | **Approved copy → opening of P ¶3.** Direct printer description, merged with the following paragraph; “fabricative” removed. The separate note is audited below. |
| 33 — “People make fabricative capacity useful…” | **Approved copy → remainder of P ¶3.** Forms, templates, production practices, and the concrete examples remain. The printer paragraph is substantial rather than broken into small observations. |
| 37 — “Software agents likewise supply broad realization capacity.” | **Approved copy → P ¶4.** Uses the exact approved “Software agents are printers, not staplers…” replacement. Its omitted closing sentence about freedom and unacceptable choices is developed by P’s conclusion and E’s first subsection; it need not be inserted again. |
| 39 — “Realization is the act…” | **Approved removal from §1.1; recommend cutting room.** The definition is useful but interrupts the analogy. Do not relocate the whole paragraph merely to preserve it: [Chapter 2 opener](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part2/00-part-intro.tex:8) already has an aside explaining that implementation can include delegated specification, design, and validation. The revised Preface uses “physical realization” intelligibly in the Apple example. There is no remaining need for this longer catalog of documentation/configuration/support artifacts. The original is preserved, including its broad scope. |
| 43 — “When we work with agents…” | **Approved copy → P ¶5.** Judgment delegation and the expensive-file-copy joke retained. “We do not have to, of course” is absorbed into the concrete copying example. |
| 47 — “Consider how much freedom…” | **Approved copy → E, Consequential Choices, ¶1.** Revised topic sentence; ten/ten-thousand lines, monolith/microservices, and the engineer’s responsibility for acceptable freedom remain. |
| 51 — “When agents perform the implementation…” | **Approved copy → E, Engineering the Environment, ¶1.** Combined with the environment/GEE definition, retaining the Preface indirection callback and figure reference. The environment’s control over information, action, and acceptance remains represented by its definition and the unchanged figure/caption; S later develops the mechanism distinctions. |
| 55 — “A reusable form preserves some decisions…” | **Review: cutting room.** The poster-logo and mounting-hole examples are good teaching prose, but repeat the printer examples after the analogy has ended. E’s language/database choices teach the same settled-versus-free distinction in the actual domain. The idea of decisions carrying forward remains in E’s GEE definition, the Preface’s *Why MAGE? Why Models?*, and [§3.4, Engineering Capital](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part3/3.4-governance-conversion.tex:121). Do not move these examples into Chapter 2, whose existing sorting/tolerance and worker-pool examples already develop that distinction more precisely. |
| 57 — “An engineering environment is…” | **Approved copy → E, Engineering the Environment, ¶1.** Definition and GEE name retained. Combined with the preceding leverage explanation, not deleted. |
| 66 — “Engineering models need not precede implementation.” | **Review: archive the complete lead-in; replace it with the shorter bridge quoted below at the figure’s proposed Chapter 2 destination.** The figure would follow “Neither direction guarantees…” and immediately precede *Learning from implementation*. The old paragraph’s origins/uses distinction survives in the bridge and caption; repeating the full lead-in would duplicate the receiving explanation. |
| 79 — “Agent products and foundation models will continue to change.” | **Review: cutting room for the two mainline sentences; relocate the embedded terminology aside separately.** The changing-product premise is generic and no longer advances the opening. The substantive assurance problem remains in E’s diagnosis, S’s probabilistic-work subsection, and T’s Enforcement Problem. Removing the aside with it would lose an explicit terminology convention, however; see below. |
| 83 — “MAGE is an engineering methodology…” | **Approved copy → distributed across E.** The GEE paragraph carries the environment/method account; the consequential-choice and diagnosis subsections explain delegation and unacceptable results. The [Preface, MAGE: Model-Based Agentic Engineering](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/frontmatter/0.5-preface.tex:39) now gives the formal two-principle introduction. No separate methodology paragraph is needed here. |
| 85 — “Two factors may affect this decision…” | **Approved copy → E, Engineering the Environment, ¶2.** Both assurance and repeated-reconstruction efficiency remain, including that they can matter at different scales. The approved replacement adds the explicit cost condition. |
| 87 — “The environment we build for agents…” | **Approved copy → E, Engineering the Environment, ¶3.** Retained, including the two-sided question about inherited machinery and stronger machinery for machine workers. |
| 91 — “Chapters … develop these ideas.” | **Review: cutting room.** T, *The Two Problems in Software*, already gives the explicit Chapter 2/Modeling and Chapter 3/Alignment links after readers have seen DocAble. The Preface also names the principles and method. Another chapter pointer before the case weakens the new sequence. |
| 93 — “MAGE concerns how established software-engineering knowledge…” | **Review: cutting room.** Its scope distinction survives concretely in E’s database paragraph (“MAGE does not supply the database theory…”), in the [Preface, Who this book is for](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/frontmatter/0.5-preface.tex:160), and in M’s *Reuse the engineering repertoire* inset. The original paragraph is a sound concise statement, but no new home improves those passages. |
| 95 — “Commodity intelligence can also change why…” | **Approved reorder → E, Consequential Choices, ¶2.** Full programming-language example retained before the environment abstraction. |
| 97 — “The same distinction applies at larger scales.” | **Approved reorder → E, Consequential Choices, ¶3.** Full database example retained, including the distinction between database theory and representing/enforcing a consequential property. |
| 99 — “Notice the distinction between unmodeled and free.” | **Approved reorder → E, Consequential Choices, ¶4.** Retained as its own developed paragraph; the return to the database example teaches a further distinction. |
| 103 — “These ideas have antecedents in AI research…” | **Review: cutting room.** S’s *The Reasoning Horizon* already introduces external representations and cites the research. [§7.2, Established Traditions, New Composition](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part7/7.2-software-rejoins-engineering.tex:84) explicitly develops AI’s external structure, memory, tools, and the engineering-environment synthesis. Moving this short chapter pointer there would repeat that argument. |
| 111 — “’Tis a poor craftsman…” | **Approved reorder → E, When Agents Produce the Wrong Result, ¶1.** Retained, including the 3D-printed bracket callback. |
| 115 — “Software agents blur the distinction…” | **Approved reorder → E diagnostic ¶2.** Retained; it explains how useful inference can hide omissions in engineering instructions. |
| 119 — “When an agent produces the wrong result…” | **Approved reorder → E diagnostic ¶3.** Retained in full, including the possibility of a genuine capability limit and the warning that failure alone does not establish it. |
| 125 — “Abundant implementation raises the stakes.” | **Approved reorder → E diagnostic ¶4.** Retained with its original field-note aside. This supplies the ending; no additional summary proposed. |

## Every footnote or aside

1. **`fabricative`, embedded at archive line 29.** **Approved removal from §1.1; recommend cutting room.** Its only job was to define a term the replacement intentionally stops using. P ¶3 now directly explains breadth and machinery limits. Relocating the note would revive unnecessary terminology.
2. **Engineering-model / foundation-model distinction, embedded at archive line 79.** **Review: relocate the original aside to S, *Foundation Model, Agentic Harness, and Engineered Environment*, attached to the first bold “foundation model” paragraph (currently line 29).** The glossary separately defines Model, Agent, and Foundation model, and S separates foundation model/harness/environment, but neither states the convention that *unqualified model* means an engineering representation. Readers may skip the glossary. This note answers a question exactly where the two usages could first become confusing. Preserve the existing full aside for this relocation rather than inventing an expanded terminology subsection; the parent paragraph’s two product-change sentences do not come with it.
3. **“Claude is the fastest road to hell,” embedded at archive line 125.** **Approved copy → E’s final paragraph.** The complete original aside, including “My field notes on this point were less measured,” remains. Its voice and diagnostic context are preserved.

## Every figure and caption

### Where engineering leverage acts — archive lines 59–64

**Approved move → E, immediately after the first Engineering the Environment paragraph.** Figure, caption, and `engineering-leverage` identity are retained unchanged. This is its explanatory home: the preceding paragraph defines the environment, the figure shows the changed relationship, and the following prose explains the possible assurance and efficiency benefits. No substantive visual revision proposed. The approved B&W rendering remains the publication choice.

### Multiple routes to engineering models — archive lines 68–73, paragraph at 66

**Draft proposal, pending author approval: relocate the figure to M, Constructing and Revising a Model, after the paragraph beginning “Neither direction guarantees that the model preserves exactly what is needed” and immediately before the subheading Learning from implementation.** This completes the account of choosing and revising distinctions, then introduces alternative origins before developing the exploratory route. It does not interrupt the top-down/bottom-up explanation.

Use this short bridge, with the figure number supplied by its existing reference:

> A model may be constructed from requirements, recovered from an existing system, or developed through agent exploration. These are alternative routes rather than prescribed stages; Figure [reference] shows their possible uses.

The **entire displaced lead-in at archive line 66 remains archived**; it is not repeated at the receiving site. The bridge and placement are new draft proposals rather than previously approved copy.

I compared the actual diagram labels and the receiving prose:

- This diagram separates **three origins**—requirements/intent, agent exploration, existing systems/experience—from **three uses**—reason/design, direct agents, evaluate/check. Its routes are alternatives, not lifecycle stages.
- M’s *Learning from implementation* and *Judging what an agent discovers* already develop the exploratory route and the distinction between discovered behavior and accepted obligation. The figure gives those paragraphs an overview; it should not replace them.
- M’s **From engineering question to engineering consequence** figure concerns choosing a representation and analysis, interpreting evidence, and deciding on design/enforcement consequences. It is not a duplicate origins/uses diagram.
- M’s **Engineering Modeling Repertoire** figure compares representation families and their questions/properties/analyses. It also does a different job.
- [§4.3, Start from the System You Own / Recover Latent Models](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part4/4.3-brownfield-engineering.tex:15) supplies the practical recovery account; the proposed Chapter 2 overview would not move or repeat that procedure.

The caption remains otherwise unchanged, with one scope adjustment **pending author approval**: **“it serves three uses” becomes “it can support three uses.”** This avoids implying that every model must perform all three roles; the short bridge likewise says “possible uses.” This agrees with [§3.2, Agreement Is Not Correctness](/private/tmp/mage-textbook-layout-20261109/book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex:30), which distinguishes description, obligation, and the consumer that gives a model a governing role. Retain the caption’s explicit warning that recovered behavior does not itself establish what ought to be required.

This relocation earns its space by separating origins from uses at the point where students learn model construction. It is not justified merely by having an existing asset to save. The final layout still needs inspection after approval.

## The four archived point IDs

| Archived ID | What was lost from this location? | Editorial judgment |
| --- | --- | --- |
| `reusable-forms-carry-design-decisions-forward` | The specific poster-template and enclosure examples; the general settled/free and inheritance ideas remain. | Retire this local point with its paragraph if the author approves the cutting-room disposition. E teaches acceptable choice directly; §3.4 *Engineering Capital* develops inheritance. Do not attach this old example-specific point to unrelated prose merely to keep its ID live. |
| `the-agent-is-not-the-engineering-object` | Product-change preamble plus a genuinely useful terminology aside. | Retire the mainline point if approved, but relocate the aside separately to S. The distinction between agent machinery and the engineered environment already remains in S’s first two subsections and E. |
| `modeling-and-alignment-supply-the-instruction-package` | Early two-chapter preview; its “printer instruction halves” synopsis overstates what its original prose actually said. | Retire the local point if approved. T already connects each problem to its principle and chapter, and the revised Preface introduces both. No argument lost. |
| `mage-accepts-the-lesson-changes-the-level` | An early historical-antecedents pointer. | Retire the local point if approved. S’s *The Reasoning Horizon* and §7.2’s *Established Traditions, New Composition* retain and develop the substance. No relocation needed. |

The other 12 original point IDs remain attached to surviving material, with summaries adjusted where the approved copy changed the claim. The printer index definition, diagnostic section terms, danger-in-instructions slogan, and stable engineering-object/whose-fault labels remain. The proposed figure’s owning source/asset registry and references must match the inspectable review build. Preparing those administrative changes for review does not establish author approval of the relocation.

## Decisions to present for review

1. Approve relocation of the **engineering-model terminology aside** to the §1.4 foundation-model introduction.
2. Approve relocation of the **model-routes figure** to §2.1 after “Neither direction guarantees…” and before *Learning from implementation*, with the quoted short bridge and the caption’s **can support** correction. The full old lead-in remains in the cutting room.
3. Confirm cutting-room disposition of the **reusable-forms callback**, **product-change preamble**, **early Modeling/Alignment preview**, **general MAGE/software-engineering scope paragraph**, and **AI-antecedents pointer**. Their substantive jobs are covered at the exact locations above; no automatic relocation is proposed.
4. Confirm that the already requested removal of **realization/implementation terminology** and **fabricative note** should end in the cutting room, rather than creating another note elsewhere.

Until those decisions are made, the full original remains preserved and the chapter restructuring remains uncommitted. This memo recommends dispositions; it does not apply them.
