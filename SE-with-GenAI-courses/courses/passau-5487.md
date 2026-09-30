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
