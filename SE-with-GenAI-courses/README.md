# SE-with-GenAI courses — a survey corpus

A systematic survey of publicly documented university courses that teach **engineering software
*with* AI** — not courses about building AI systems. Compiled 2026-09-30.

This folder is evidence collection and normalization, not advocacy. The corpus was built and coded
**before** any ECE 30861 / MAGE material was read, so the external coding could not be biased by it.
The ECE 30861 comparison came last and cites the already-frozen evidence.

## Scope rule

- **In scope** — courses whose principal educational object is software engineering using AI: LLMs,
  coding agents, generative tooling applied to requirements, specification, architecture, design,
  implementation, testing, validation, maintenance, deployment, project management, code review.
- **Out of scope** — courses principally about engineering *of* AI systems: building LLM agents,
  RAG, tool-use systems, foundation models, inference infrastructure. A course may contain some of
  this and remain in scope if its principal object is SE-with-AI.
- Generic SE courses that merely permit Copilot/ChatGPT do not qualify.

## Contents

| File | Deliverable |
|---|---|
| [corpus.md](corpus.md) | Every candidate course: classification (core / mixed / exclude), rationale, primary-source links |
| [courses/](courses/) | One brief per core comparator: what it teaches and how it is organized |
| [matrix.md](matrix.md) | Cross-course concept matrix (Delegation · Modeling · Alignment/control · Traditional SE under AI) with evidence |
| [organization.md](organization.md) | How each course intellectually decomposes the problem |
| [ece30861-comparison.md](ece30861-comparison.md) | ECE 30861 vs the corpus: shared, distinctive, and plausibly omitted by ECE 30861 |
| [sources/](sources/) | Per-course evidence files (quotes + URLs) and the source appendix — the raw material every classification rests on |

## Evidence discipline

Three rules were enforced while coding:

- **Explicit course content is separated from surveyor inference** in every file. Where published
  material does not support a concept, the finding reads "not evident in available materials" —
  *not taught* and *not observable in public materials* are different findings.
- **Concepts, not keywords.** A course that lacks our vocabulary may still teach the idea; a
  passing mention of models or oversight is not the richer concept.
- **Evidence outranks classification.** Matrix cells carry quotations or precise syllabus
  references; a cell without evidence says so.
