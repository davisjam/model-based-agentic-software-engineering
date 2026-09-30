# Memphis COMP 4991/6991 — AI Tools for Software Development

Spring 2026 · Scott Fleming · UG/grad dual-listed ·
[evidence](../sources/memphis-ai-tools-software-development.md)

## What it teaches

A declared MIT-licensed adaptation of CMU 17-316 (Henley/Begel): one team product driven through
six units — vibe coding (greenfield, then "Vibe Coding Brownfield Projects"), user discovery &
requirements (personas, user stories under epics with INVEST, storyboards, Mermaid architecture
diagrams and API specs), frontend, backend, testing, deployment — each unit closing with a named
Reflection session and a 500-word no-AI reflection essay. "AI Chat Transcript Requirement:
transcripts of all such interactions must be saved and submitted." Pair programming mandated;
grading by lowest-criterion across attendance, homework, and project.

## How it is organized (interpretation)

The CMU design family's SDLC-with-AI shape, with the reflection loop as the judgment-building
mechanism and an intentional arc from naive tool use toward engineering practice (vibe code
first, hit brownfield reality, then reflect). Its value to the corpus is partly as evidence of
curriculum diffusion: the first documented cross-institution replication of an SE-with-AI course
design.

## Evidence caveat

Rich for structure (site, units, homework rubric, P1 spec); slide decks and later project specs
uninspected, so the testing unit's specific stance on verifying AI output is under-observed.

## Adoptability (drop-in availability, audited 2026-09-30)

**Category 2 — substantial reusable materials.** Classified 1 by its auditor and flagged borderline;
recorded as 2 under the tie-break rule, on two facts.

- **Public:** full syllabus · a complete 32-session dated calendar (Jan 19 – May 06) with per-session
  "Assigned / Activity / Do before next class" annotations · 6 homeworks, fully specified between the
  per-homework pages and a shared instructions-and-rubric block on the homework index · 5 project
  phases with learning goals, enumerated deliverables, step-by-step process, and hierarchical
  rubrics · 4 activity handouts carrying real tool setup, including AWS account creation · 10
  downloadable `.pptx` decks, verified as real binaries.
- **Why 2, not 1:** exactly **10 decks** are published against roughly **16 content-bearing lecture
  sessions** (independently re-counted), and all ~22 "Lecture Video" links redirect to Memphis SSO —
  so the missing six sessions are gated rather than absent. Authoring six lecture sessions is
  designing a significant portion of a course.
- **Login:** the lecture videos (Memphis SAML), the MS Teams reflection sign-up sheet, and Canvas
  submission. Everything else is open.
- **License:** the site footer attributes the **upstream CMU** work — *"based on 'CMU 17-316/616 …'
  by Austin Henley and Andrew Begel, which is licensed under the MIT License"* — and that upstream
  `LICENSE` is real (verified via the GitHub license API). But **no Memphis-owned public repo carries
  a license**: the site's `/LICENSE` 404s, the backing repo is not public, and the org's one public
  repo reports `license: null`. The MIT statement is an attribution, not an independent grant.
- **An adopter drawn to this lineage should fork CMU 17-316** — more complete, and the license
  attaches directly.
- **Checked:** the course site and its syllabus, lecture, homework, project, and activity trees; two
  decks downloaded and byte-verified; the deck list re-counted independently; the org repo list and
  both license endpoints; `memphis.instructure.com/courses/198723` (302 → Memphis SAML).

Method, corpus-wide counts, and the unreachable-this-pass log: [adoptability-audit.md](../adoptability-audit.md).
