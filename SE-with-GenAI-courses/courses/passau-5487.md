# Passau module 5487 — AI-Driven Software Development

Summer 2025 (68 students; repeats SoSe 2026) · Fein, Fraser, Herbold · master's level ·
[evidence](../sources/passau-ai-driven-software-development.md) · primary source: their ICSE-SEET
2026 paper (DOI 10.1145/3786580.3786962)

## What it teaches

Six scaffolded lectures, one per classical SDLC step (requirements, prototyping, coding,
unit/integration testing, system testing, quality-driven process), each crossed with four AI
integration modes — Chat, IDE, Agent, API — and each led by the non-AI method first "to ensure
students are familiar with core software engineering concepts." Lectures deliberately demonstrate
failure ("the LLMs may sometimes generate generic, too complex, or even nonsensical
requirements... Similar demonstrations of limitations continue throughout all lectures"). Then a
five-week individual project (a calendar app) **with requirements that change at the midpoint** —
"the addition of new requirements also requires the AI tools to be able to support maintenance and
evolution, rather than only generating the code of an initial prototype."

## The assessment model — the course's distinctive contribution

"A central problem becomes how to grade the student's learning and critical thinking, not the
generative capabilities of the LLMs they use." Their answer: grade the audit trail and the
reflection, not the artifact. Feature/assignment points are "intentionally coarse... since the
work of the students and the AI is directly mixed"; the main weight sits on a five-part
development-process rubric (issues in user-story form, small PRs/commits, CI with linters and
static analysis, unit tests with coverage bars, browser-driving system tests) and a report rubric
whose top marks require "specific, well-explained examples where AI tools failed or
underperformed" and how the student adapted. Anti-vibe-coding is structural: "The high coverage
requirement... can unlikely be achieved by 'vibe coding', but instead requires conscious use of AI
tools to obtain tests for edge-cases."

## How it is organized (interpretation)

A matrix — stable classical-SDLC axis × volatile AI-mode axis — with assessment displaced off the
artifact onto process + calibrated judgment. The authors argue the design is durable for exactly
this reason: "since the course is organised around core software engineering phases rather than AI
aspects, the overall structure can remain stable" as tools churn. Of the whole corpus this is the
most explicit published answer to the grading problem, and the only course with a published
first-run empirical evaluation (where AI helped, where it failed, tool-design implications).

## Evidence caveat

Rich on design and assessment (both rubrics printed in full); thin on lecture-by-lecture
materials (slides and handouts not public).

## Adoptability (drop-in availability, audited 2026-09-30)

**Category 3 — inspectable but not adoptable.** The ICSE-SEET paper is an unusually rich description
under CC BY 4.0, and it releases no materials package. A paper about a course is not a course.

- **Public:** the paper itself — the course design, the six-phase weekly structure, the final-project
  shape, an evaluation with 68 students · **two multi-column 0–4 rubric tables typeset in the paper**,
  one over the development process (issue and user-story quality, PR and commit granularity,
  CI/linting, 80%/90% coverage thresholds, system-test depth) and one over the final report · a
  narrative discussion of what worked, what students found hardest, and how to give students free
  tool access. The department teaching page lists the module and its meeting slot.
- **The decisive check:** the paper's full text was extracted and searched for `zenodo`, `osf`,
  `figshare`, `github`, `gitlab`, `replication`, `artifact`, `supplement`, `available at`, `package`,
  and `reproduc`. **No data-availability statement, no artifact appendix, no materials link.** Every
  URL is either a tool-vendor footnote or a bibliography DOI. The author's public `~fein/teaching/`
  directory hosts other courses' files and has no directory for this one — an absence, not a locked
  folder.
- **Absent:** no syllabus, no calendar, **zero** slides or notes, **0** assignment handouts, no
  starter repo, no student reading list. The rubrics can be retyped; they are not downloadable as an
  instrument.
- **Login:** not applicable. There is no student-facing course site to be gated; Stud.IP presumably
  holds the materials but nothing public points there. This is "not published," not "behind a login."
- **License:** the **paper** carries "This work is licensed under a Creative Commons Attribution 4.0
  International License," which covers its rubric tables. For **course materials** there is no license
  stated, because no course materials are published.
- **Checked:** the author's self-hosted PDF (727 KB, 11 pages, full text extracted and grepped); the
  chair's teaching page; the author's public web directory tree; three WebSearches for a replication
  package. The ACM DL landing page 403'd the fetcher; the identical self-hosted PDF substituted.

Method, corpus-wide counts, and the unreachable-this-pass log: [adoptability-audit.md](../adoptability-audit.md).
