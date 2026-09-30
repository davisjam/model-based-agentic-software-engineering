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
