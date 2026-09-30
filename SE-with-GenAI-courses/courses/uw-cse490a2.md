# UW CSE 490 A2 — AI-Assisted Software Development

Fall 2025 (pilot; next planned Winter 2027) · Michael Ernst · undergraduate, one 90-minute weekly
meeting · [evidence](../sources/uw-ai-assisted-swdev.md)

## What it teaches

From the official description: "This is not a course about coding. It teaches clear
specifications, system decomposition, code review, debugging, and similar skills needed of a team
leader. **A programmer directing AI agents is a team leader.** Most of the topics are the same
skills that you should learn today to become an effective system builder... Each week, the course
will cover a different software development task. The weekly assignment is doing that task, using
AI assistance, on a codebase provided by the course staff." Students are pushed to use multiple
tools (Cursor, Copilot, Claude Code, Codex, Gemini) to learn "their strengths and weaknesses."

## How it is organized (interpretation)

Role reversal as the organizing idea: the student is repositioned from coder to team leader whose
team is AI agents, and the curriculum is the classical leader skill set — specification,
decomposition, review, debugging, documentation — exercised one task per week on an existing
staff-provided codebase (a deliberate brownfield choice) rather than a greenfield project. This is
the corpus's most explicit published statement that delegation-to-agents is a management skill
with a classical antecedent.

## Evidence caveat

Thin: the public record is the course description, framing paragraph, and tools list; syllabus,
schedule, assignments, and policies are Canvas-gated. The pilot scale (1 meeting/week) limits how
much curriculum exists to observe.

## Adoptability (drop-in availability, audited 2026-09-30)

**Category 2 — substantial reusable materials, at the low end.** Three or four genuinely reusable
project specs sit on a site with no syllabus, no schedule, and no slides.

- **Public:** **5 projects, 3 with complete student-facing instructions.** P1 is a 4-page PDF spec —
  build an entity-relationship visualizer, spaCy entity extraction, Wikidata KG queries, an exact
  submission layout, and an "Evaluation Instructions" section pinning the required `install.sh` /
  `generate.sh` contract and the exact JSON output schema. P2 is the same project in a marked-up V2.
  P5 is a real open-source exercise: fix issue #3211 in the Checker Framework on a named branch,
  enable the disabled test, write up what LLM support did and did not do, with a four-step statement
  of exactly what staff will run. Also public: one week of readings and a real 9 KB AI-terminology
  glossary.
- **Absent:** no syllabus, no grading breakdown, no policies, no prerequisites. `/schedule/` exists
  and says "Schedule incoming!"; `/calendar/` is an empty directory. **Zero slides** — for a weekly
  90-minute seminar, a complete absence of delivery material. Readings stop after week one. About 22
  probed paths (syllabus, lectures, slides, grading, policies) genuinely do not exist.
- **Login:** yes, for a meaningful share. Canvas hosts a per-project assignment page for all five
  projects and hard-redirects to UW Shibboleth; EdStem needs an account. The project *materials*
  themselves are not gated.
- **Unverified:** P3 and P4 ship data and build scaffolding locally, with the prose specs inside
  `a3.zip` / `a4.zip` in public Drive folders — confirmed listable, not opened. Their instruction
  quality is unverified rather than absent.
- **License:** **no license stated.** No footer notice, no reuse grant, nothing on the PDFs.
- **Checked:** the 25au tree including `/projects/project-1–5/`, both project PDFs opened, `/readings/`
  and `/readings/terminology.html`, `/schedule/`, `/calendar/`, ~22 further paths (404); the four
  Google Docs and Drive folders confirmed world-readable; `canvas.uw.edu/courses/1871656` (→ UW
  Shibboleth).

Method, corpus-wide counts, and the unreachable-this-pass log: [adoptability-audit.md](../adoptability-audit.md).
