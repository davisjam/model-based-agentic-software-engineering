# Chapter 7 professional argument — 10 November 2026

Before-source revision: `641b1386f2de4a2e42e9306fea15c0de5479627a`.
The second supplied review supersedes the first review's 450–550-word authority-inset
target. The directly supplied TDD/agile paragraph and latest exact two agile sentences
also take precedence over the review's earlier advice against adding process examples.

The chapter title remains **The Profession**. The existing four native source paths
remain stable. Exact before-sources, the removed independent-reading inset, the full
pre-edit authority inset, and all replaced spans with original source line ranges are
preserved in this archive. See [retired passages](retired-passages.json) and
[integrity manifest](manifest.json). Root owns the disjoint `figure-before` archive and
the Figure 7.3 drawing correction.

## Topic-sentence outline

Register: engineering-textbook explanation, planned and reviewed with `self-communicate`.
The intervention is focused framing and placement, not a replacement historical survey.

The revised §7.2 sequence is:

1. Does deliberate investment in models while delegating implementation imply waterfall?
2. Working through models differs from requiring a complete model before implementation.
3. Established engineering uses purposeful representations alongside prototypes and experiments.
4. TDD and agile methods already combine explicit obligations, planning, and rapid iteration.
5. Software's economics made implementation a particularly attractive reasoning surface.
6. Model-first organization concerns representational completeness, not a single-pass process.
7. Engineering and AI supply two established inheritances that MAGE brings together.
8. MAGE's architectural contribution can remain iterative and economically selective.

The surrounding chapter now proceeds from the limits of the software evidence directly
to the transferable governing loop (§7.3), then to expertise and authority (§7.4), and
finally to the normative question **What Must Not Be Delegated?** (§7.5).

## Exact scope of the edits

### §7.2

- Changed the title to **Back to Models, but Not Back to Waterfall** in its native chapter
  command and semantic title comment.
- Replaced only the two opening paragraphs with the supplied question and historical framing.
  The Chapter 4 reference uses the existing governed chapter macro.
- Added the author's five-sentence TDD/agile paragraph immediately after “Models do not
  replace the artifact. They organize the reasoning around it.” The final two sentences
  retain the latest approved wording exactly. Primary citation keys supplied and verified
  by root are `beck2003tdd` and `agile-principles2001`, before terminal punctuation.
- Replaced only the opening of **Why Software Often Modeled Differently**.
- Added the supplied model-first/iteration paragraph after Siemens and before the existing
  inversion. The Siemens account, degrees-of-freedom argument, Cabot discussion, and
  selective model-first conclusion are otherwise unchanged.
- Replaced only the opening paragraph of **What MAGE Claims Is New**, retaining its
  architectural claim and closing transition.
- Applied root's later authorized final caption sentence: “Governance conversion carries
  recurring judgment into durable engineering capital within that environment.” This is
  the only prose-task change to a figure block and aligns it with root's GEE/capital nesting.

All five existing subsection headings and their labels remain unchanged and in order.
The historical explanations remain developed paragraphs; no additional taxonomy,
process-history subsection, or novelty argument was added.

### §7.3

Removed the entire **Reading this section on its own** inset, including its metadata,
recap, and procurement example. No material was migrated into the main text. Its exact
source and retired label `inset-read-beyond-software-standalone` are preserved here.
The opening now moves directly from the source and scope of MAGE's evidence to the
generality of the control problem. The rest of §7.3 is byte-identical.

### §7.4

Replaced the two historical paragraphs of **Engineering at the frontier of authority**
with the supplied integrated paragraph. All five existing citation targets remain at
their relevant claims and in their original order. The source-word count of the historical
passage falls from 260 to 163; this is a local consolidation rather than an inset-wide
word target.

At the first proof stage, every other authority-inset paragraph remained byte-identical, including:

- what records must preserve;
- the bounds of delegated authority;
- the legitimate possibility of proceeding despite uncertainty;
- “A decision to accept an inadequately bounded risk does not make the risk bounded”;
- the institutional and personal chain of accountability;
- the inset's concluding connection to engineering environments.

The first proof still spilled approximately six lines. The subsequent pagination pass
therefore removed the optional sentence beginning “The engineering challenge is to
extend the frontier…” and the historical paragraph's closing rhetorical question, which
the next paragraph already develops as a professional record test. A thirteen-word
opening trim retains the same inventory of what the engineering case must make legible.
Together these remove 74 words and 458 source characters. All historical cases and
citations remain. The risk-acceptance and accountability paragraphs remain byte-identical.
Exact post-followup source, removed sentences, line ranges, and the opening replacement
are preserved in [the pagination retirement record](pagination-retired-passages.json)
and `before-authority-pagination-trims.tex`. Root will verify the new one-page proof.

### §7.5

Changed the title and final question to **What Must Not Be Delegated?** The intervening
argument is unchanged: work and particular decision authority can be delegated while
those authorizing the engineering arrangement remain answerable. The coda flag and
source path are unchanged.

## Prose audit

The changed passages were read with the paragraphs immediately before and after them.
The apparent waterfall objection now motivates the history rather than merely preceding
it. The retained discussion makes physical engineering iterative, explains software's
distinctive representational economics, and separates model completeness from development
sequence. TDD supplies a concrete small-scope example; the agile sentences extend that
point to planning and evidence without turning the section into a process survey.

The §7.3 deletion removes a second introduction while preserving the progression from
software evidence to consequential outcomes and transfer conditions. The §7.4 consolidation
preserves the differing kinds of authority failure and gives the subsequent ethical
argument room to do its work. It does not imply that an engineer must always overrule
an authorized decision-maker. The final title is normative and remains consistent with
the chapter's refusal to define the profession by current machine limitations.

No new empirical claim was introduced beyond the author's supplied TDD/agile statements,
whose primary sources were verified by root. Existing citations retain their targets,
ordering, and counts. All existing point IDs are unchanged; their summaries still describe
the revised paragraphs. No new point IDs were required.

## Source integrity

- Existing figure and table blocks remain byte-identical except the explicitly authorized
  final sentence of Figure 7.3's caption.
- All existing citation-target counts are preserved; two verified keys are added.
- All existing point IDs are retained.
- The authority risk-acceptance and accountability paragraphs are byte-identical.
- The five §7.2 subsection headings and labels are unchanged.
- TeX braces balance in all four owned native sources.
- No remaining native-source or data reference uses the retired independent-reading label.

Root owns bibliography registration, models and identities, projection synchronization,
figure assets, the one-page inset proof, builds, commits, and publication. This prose
task did not regenerate, stage, commit, or build anything.
