# Northeastern CS 7180 — Vibe Coding: AI-Assisted Software Engineering

Spring 2026 · John Alexis Guerra Gómez · graduate (Oakland campus), hybrid ·
[evidence](../sources/northeastern-vibe-coding-ai-assisted-se.md)

## What it teaches

"Master AI-assisted development tools while maintaining professional engineering standards."
Sixteen weeks climb a tool ladder — LLM fundamentals and prompting → Claude Web/Artifacts →
IDE-centric AI → Claude Code (workflows, TDD, extensibility: skills, hooks, MCP, sub-agents) →
Agent SDK → AI security and code quality → production. Three projects with escalating rigor:
CRUD app with CI → full-stack app with TDD (80%+ coverage) and documented Agile sprints →
production app with Claude Code extensibility, AI PR review in CI, deployment and monitoring.

The verification stance is explicit: "'The single highest-leverage thing' developers can do when
coding with AI is providing verification mechanisms. Test-driven development serves as the most
powerful form of this verification." Enforcement machinery is taught as content: "PreToolUse hooks
block writes to sensitive files... deterministic scripts with exit codes enforce deterministic
quality rules," with the decision rule "If you would be upset when the rule is broken, use a hook.
If it's a preference, use CLAUDE.md." Week 14 teaches an 8-gate security pipeline (secrets, deps,
SAST, DAST, containers, licenses, security acceptance criteria, SBOM): "No single gate catches
everything. Together, they form defense in depth." Responsibility is named: "You are the author of
record. You are responsible for bugs, vulnerabilities, and license violations."

## How it is organized (interpretation)

A tool-mastery ladder interleaved with a professional-practice ladder, converging on the thesis
that AI-assisted engineering is legitimate exactly when wrapped in verification and enforcement
machinery. Of the corpus, this course teaches the most explicit guidance-vs-enforcement
distinction (hooks vs CLAUDE.md) and quantified evaluation formalism (pass@k vs pass^k, LLM-judge
biases). AI-free weekly quizzes preserve demonstrable no-AI competence.

## Evidence caveat

Rich (site + 2 of 14 slide decks fetched; as-delivered materials). Homework specs and remaining
decks uninspected.

## Adoptability (drop-in availability, audited 2026-09-30)

**Category 1 — drop-in / canned course.** Twenty-one decks with sources, itemized point rubrics on
every graded artifact, thirteen ready-made quizzes, and an explicit dual license covering materials
and code separately.

- **Public:** 21 reveal.js decks with their full markdown sources · 5 homeworks and 3 projects, each
  with an itemized point rubric · 13 ready-made weekly quizzes · syllabus · schedule · a 26 KB reading
  list · worked example repos and setup handouts · `course/COURSE_MEMORY.md`, written for the
  instructor rather than the student.
- **Login:** none for course material. Slack carries communication; Canvas carries submissions,
  grades, and the showcase form.
- **License:** **CC BY-NC 4.0** for materials — the `LICENSE` file names the covered set explicitly
  ("all lecture slides, the syllabus, schedule, readings, homework assignments, project
  specifications, handouts"), © 2026 John Alexis Guerra Gómez, Northeastern University — with code
  (`tools/` MCP servers, `slides/js/`, build scripts) **Apache 2.0** under `LICENSE-CODE`. Two
  caveats: NonCommercial may bind some institutions, and the `johnguerra.co` class site itself states
  no license.
- **Provenance caveat:** the complete package now lives in `john-guerra/ai-coding-class`, framed as
  **CS 6983, Fall 2026** — the same course lineage, with the Spring 2026 syllabus archived under
  `course/archive/spring2026/`. An adopter gets the successor edition, not a frozen S26 snapshot.
- **Checked:** the class site and all 21 decks; the repo `LICENSE` and `LICENSE-CODE`; the full
  recursive tree and raw files for homeworks, projects, quizzes, syllabus source, and readings.

Method, corpus-wide counts, and the unreachable-this-pass log: [adoptability-audit.md](../adoptability-audit.md).
