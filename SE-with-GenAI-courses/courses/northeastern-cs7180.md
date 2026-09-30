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
