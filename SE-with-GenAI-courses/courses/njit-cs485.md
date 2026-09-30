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
