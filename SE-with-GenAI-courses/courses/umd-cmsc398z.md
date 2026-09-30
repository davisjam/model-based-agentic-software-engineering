# UMD CMSC 398Z — Effective Use of AI Coding Assistants and Agents

Fall 2025 · Bill Pugh, Derek Willis · undergraduate seminar (Fridays 2–4, hackathon-style) ·
[evidence](../sources/umd-cmsc398z.md)

## What it teaches

"How to effectively use AI coding tools to develop software... the tools and techniques used by
engineers at companies like Google and Microsoft to develop production-quality code." A weekly
tool ladder: Copilot autocomplete/chat → Simon Willison's `llm` CLI for structured extraction and
SQL/embeddings work → Claude Code agentic work on real unfamiliar codebases (modifying CPython's
IDLE editor against a `cpython-CLAUDE.md` context file, with Claude-generated design and
implementation documents reviewed by the student in a dedicated review file) → multi-week app
builds. A named topic: "code quality beyond test passage (maintainability, architecture,
efficiency, security)."

Grading is 40% twice-weekly learning logs + 40% participation + 20% code "graded on good faith
effort... Successful outcomes not required for top grades."

## How it is organized (interpretation)

A practitioner apprenticeship wrapped in a heavy reflective-writing regime. The grading reveals the
learning object: the student's judgment about the tools, not the artifacts. Readings are almost
entirely practitioner essays (Ptacek, Harper Reed, Willison) spanning enthusiast and skeptic
voices. The week-8 generate-design-doc → review-in-writing workflow is one of the corpus's clearest
concrete instances of teaching artifact-level oversight of agent work.

## Evidence caveat

Rich-moderate: full public site, complete 14-week handouts repo, public video playlist. No formal
objectives list; second-half topics published as planned rather than confirmed.

## Adoptability (drop-in availability, audited 2026-09-30)

**Category 2 — substantial reusable materials.** A complete syllabus, an unusually explicit grading
scheme shipped with its actual instruments, a 14-week reading list, and fourteen weeks of
starter-code projects — over weekly notes that are mostly link-lists.

- **Public:** full syllabus, including a candid instructor **disclosures** section · a retroactive
  14-week dated topic sequence in the GitHub README · `grading.html` with weights, a 1–6 scale, an
  anchored 0/6/8/10 participation rubric, a drop-lowest policy, and the full letter curve · **the
  assessment instruments themselves** — the weekly learning-log and reading-log Google Forms load for
  anyone · ~35 linked readings on a dedicated page plus per-week lists · 14 weeks of projects with
  runnable starter code, several shipping both a starter and a finished reference version ·
  `AICSEPAR2026.md`, a workshop deck Bill Pugh prepared *about running this course* · thorough week-1
  environment setup for macOS and Windows.
- **Absent:** 6 of 14 weeks have no slide deck. The YouTube playlist is public but holds only 3
  videos, one of which is an actual class session — recordings should not be read as available.
  Roughly 6 of 14 weeks are fully specified; the rest are specified enough to run only if you already
  know the lesson plan.
- **Login:** none for instructional material. The syllabus states "All instructor provided course
  material will be open to anyone," and the audit verified that against every artifact probed. The
  UMD submit server, Zulip, and graded form submission are enrolled-student mechanics.
- **License:** **no license stated.** No `LICENSE` file; the GitHub license API 404s. Two permission
  statements exist and neither is a license — the syllabus line above, and the README's "Everyone is
  welcome to use this material to follow along." Access and following along, not redistribution or
  re-teaching.
- **Checked:** the course site, `details.html`, `grading.html`; all 14 week `README.md` files and all
  14 `slides.pdf` probes (8 exist); the repo and its license endpoint; both learning-log forms; the
  YouTube playlist.

Method, corpus-wide counts, and the unreachable-this-pass log: [adoptability-audit.md](../adoptability-audit.md).
