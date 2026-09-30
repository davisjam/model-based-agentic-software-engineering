# NJIT CS 485/698 — AI-Assisted Software Engineering

Spring 2026 · Martin Kellogg · BS/MS/PhD, special topics ·
[evidence](../sources/njit-ai-assisted-se.md)

## What it teaches

A semester-long team project spanning requirements → dev spec → frontend → backend → testing →
deployment → postmortem, executed with LLMs, with a parallel reflective-essay track per lifecycle
phase. Named topics include "requirements elicitation and specification in the AI era, AI code
generation and how to ensure that AI-generated code is correct," plus "how other traditional
software engineering practices like code review and static analysis can help with AI-assisted
software engineering" — the calendar ends with dedicated "Static analysis + LLMs" and
"Verification + LLMs" lectures and a guest lecture on evaluating LLM-generated code quality.

Distinctive process rules: universal AI-interaction logging ("you are **required** to include a
log of your interaction with the tool," with a how-to tutorial); and in the testing milestone,
prompt-mediated development — "You may not modify any generated code directly, only by prompting
the LLM," graded on "how well you prevent the LLM from hallucinating nonsensical test cases."

## How it is organized (interpretation)

The classical end-to-end lifecycle re-instrumented for LLM collaboration, with the human's
steering and checking of the model as the graded skill. Ensuring AI-output correctness is a
first-class topic arc (tests → coverage → CI → static analysis → verification), not a policy
aside. Shares the CMU 17-316 design family (same Mom-Test/INVEST/dev-spec/chat-log DNA).

## Evidence caveat

Rich: full calendar, syllabus, milestone specs (P1, P5 fetched; others public but uninspected).
Specific vendor tools not established.

## Adoptability (drop-in availability, audited 2026-09-30)

**Category 1 — drop-in / canned course.** The most complete package in the corpus, and explicitly
licensed: near-total deck coverage, seven assignments and an eight-stage project with point-level
rubrics, and a calendar carrying its own readings.

- **Public:** 26 slide PDFs covering 25 of 26 meeting days, every one fetched and confirmed as a real
  payload · 7 reflection essays (a1–a7) with complete instructions · an 8-stage project (p0–p7),
  requirements engineering through final demo and postmortem · a full syllabus · a calendar with
  roughly 25 linked readings · 3 student tutorials (saving LLM logs, reading a paper, a glossary) ·
  point-level rubrics on the assignment pages.
- **Absent:** a separate teaching-notes file; guidance is embedded in the decks.
- **Login:** none for any instructional artifact. Discord and the two Canvas sections are
  communication and submission surfaces.
- **License:** **CC BY-SA 4.0.** Every page footer reads: *"© 2022-2026 Martin Kellogg, Andrew Begel,
  Austin Henley, Jonathan Bell, Adeel Bhutta and Mitch Wand. Released under the CC BY-SA license."*
  Share-alike obliges an adopter to release derivatives on the same terms.
- **Checked:** the course root and its `/about/`, `/calendar/`, `/projects/p0–p7`,
  `/assignments/a1–a7`, and `/tutorials/` pages; all 26 PDFs under `/assets/`; the footer text.

Method, corpus-wide counts, and the unreachable-this-pass log: [adoptability-audit.md](../adoptability-audit.md).
