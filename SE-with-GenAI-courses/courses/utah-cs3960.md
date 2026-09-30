# Utah CS 3960 — Vibe Coding

Spring 2026 · John Regehr, Pavel Panchekha · undergraduate, experienced programmers ·
[evidence](../sources/utah-vibe-coding.md)

## What it teaches

"How to work effectively with modern AI coding agents" — with AI use "allowed and, in fact,
mandatory," Amp as the class-standard agent, and assignments that "build large, complex
applications" (HW1: a native Qt text editor with three weekly releases and per-feature release
notes covering design decisions and "testing validation methods"). "Maintaining large software
projects over time, without the AI breaking older features or making the code impossible to work
with, is a major theme."

Four interleaved lecture strands: (A) classic SE quality techniques — testing, coverage, fuzzing,
assertions/QuickCheck, program verification; (B) how models work (next-token prediction →
fine-tuning → tool use); (C) agent workflow craft — context engineering, parallelizing work (git
branching), documentation-for-agents ("Harness engineering"); (D) practitioner case studies of
large agent-built systems ("Building a C compiler with a team of parallel Claudes").

## How it is organized (interpretation)

The strands assign the human a specific lever: strand A repositions the classical verification
stack as how you control agent output ("Your job is to deliver code you have proven to work");
strand C professionalizes context, decomposition, and documentation as agent-facing engineering
assets. The through-line is sustained maintainability under mandatory agent use. Enforcement is
by telemetry: "Amp records and makes available to instructors complete logs of all AI
interactions... Absence of logged work will be grounds for failing." Notable boundary: sharing
another student's prompt is cheating, but "using prompts found online is fine."

## Evidence caveat

Rich (syllabus, lecture schedule + readings, HW1 spec public). HW2–5 and slide decks uninspected;
later case-study slots unpublished.

## Adoptability (drop-in availability, audited 2026-09-30)

**Category 1 on materials, blocked on permission.** Twenty-one full decks, five homework specs, a
16-week annotated lecture grid, runnable activity repos, and an instructor post-mortem constitute a
genuine open course package — under no license at all.

- **Public:** 21 full lecture decks with editable sources (5.8 MB to 67 MB) · 5 homework specs
  including the staged final project · full syllabus · 16-week lecture grid with required and
  optional readings annotated per session · runnable activity repos (install-Amp as the lecture-00
  activity, a next-token-prediction demo, a tool-restricted agent shell with written week-4 and
  week-5 instructions) · `writeup.md`, a signed post-mortem by Regehr and Panchekha on what landed
  and what did not with 60 students · 24 further public repos of actual student work, usable as
  worked exemplars.
- **Absent:** point rubrics. Grading guidance is narrative — category weights plus prose such as
  "most assignments will be graded on functionality."
- **Login:** none for course material. The Amp workspace, Piazza, and Canvas quizzes are the tool
  account, the forum, and the submission channel.
- **License:** **no license stated — the one serious adoption blocker.** Five filename variants
  (`LICENSE`, `LICENSE.md`, `LICENSE.txt`, `COPYING`, `license`) all 404 on `main`; the recursive tree
  confirms no license file; the GitHub API reports `license: null` for the `syllabus` repo and for all
  25 repos in the org; no copyright or reuse statement appears in `README.md`, `syllabus.md`, or
  `writeup.md`. Independently re-verified after the audit. The course assigns the `chardet`
  relicensing dispute as a reading.
- **Checked:** `github.com/utah-cs3960-sp26/syllabus` (full recursive tree), the raw `syllabus.md`,
  `lectures.md`, `hw1`–`hw5`, `writeup.md`, `art.md`; the `calculator` activity repo; the org repo
  list and license fields.

Method, corpus-wide counts, and the unreachable-this-pass log: [adoptability-audit.md](../adoptability-audit.md).
