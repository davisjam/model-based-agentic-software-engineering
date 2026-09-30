# Stanford CS 146S — The Modern Software Developer

Fall 2025 (inaugural; re-offered F26) · Mihail Eric · undergraduate, 3 units ·
[evidence](../sources/stanford-cs146s.md)

## What it teaches

Working with coding agents across the lifecycle. Ten weeks: LLM/agent foundations → agent anatomy
(tool use, MCP) → AI IDEs and context engineering → coding-agent patterns (autonomy levels,
human-agent collaboration) → terminal agents → AI testing and security → code review → automated
app building → post-deployment operations. Assignments rotate through a commercial-tool portfolio
(Cursor, Claude Code + CLAUDE.md/subagents, Warp multi-agent with git worktrees, Semgrep triage,
Graphite AI review, bolt.new), each with a required writeup documenting prompts, autonomy levels,
supervision methods, and trust judgments. Final project is 80% of the grade.

Instructor's stated stance: "Human-agent engineering, not vibe coding"; "LLMs are only as good as
you are."

## How it is organized (interpretation)

The SDLC re-walked with agents, with the human positioned as manager and verifier of agent work:
foundations → workflow construction → assurance → operations. Tool-portfolio fluency is itself a
course outcome. Notably rich on persistent context artifacts (CLAUDE.md files, versioned prompts —
secondary sources quote "prompt as source code: specifications should be versioned with same
discipline as traditional code") and on calibrated trust (week 7 has students compare their own
line-by-line review against AI review and state "personal comfort level trusting AI reviews with
supporting heuristics").

## Evidence caveat

Assignment specs are primary (preserved fork of the instructor repo); the syllabus/FAQ tabs are
client-rendered and rest on two third-party write-ups that broadly agree. Final-project
requirements are not public.

## Adoptability (drop-in availability, audited 2026-09-30)

**Category 2 — substantial reusable materials, at the top of the band.** Ten instructor decks, all
eight weekly assignments with starter code, a full sequence and ~73 readings — and no specification
at all for the component worth 80% of the grade.

- **Public:** full syllabus (description, prerequisites, format, goals, staff, a 7-question FAQ) · a
  complete 20-session dated F25 calendar · 17 of 20 sessions carry a Slides link, 13 of 14 distinct
  deck URLs load publicly · **8 of 8 weekly assignments** with learning goals, tasks, constraints,
  deliverables, point allocations, and runnable starter apps · roughly 73 linked readings · the
  grading split (Final Project 80% / Weekly Assignments 15% / Participation 5%) · setup instructions
  (Python 3.12, Conda, Poetry, Ollama, mitmproxy, Warp, Claude Desktop MCP config).
- **Absent, and decisive:** the final project carries **80% of the grade** and has no public brief,
  milestone structure, or rubric anywhere. Ten of the twenty sessions are named industry guest talks
  an adopter cannot reproduce.
- **Branch trap:** the F25 assignments survive only on the `fall2025` branch; `master` has been reset
  to Fall 2026, and the syllabus's assignment links still point at `master`, so they now resolve to
  the wrong term.
- **Login:** none. Gradescope submission is a student-side mechanic.
- **License:** **no license stated.** The assignments repo returns `license: null` and has no
  `LICENSE` on either branch; the decks are shared as public Google Slides view links with no notice.
- **Fetching caveat:** the site is a Next.js SPA and text-extraction fetching silently drops the
  entire Syllabus tab, reporting "no schedule, no slides, no assignments" — which is wrong. The real
  data was recovered by parsing the JS chunk carrying the syllabus arrays.
- **Checked:** `themodernsoftware.dev` and `/fall2025` (plus the syllabus JS chunk); the assignments
  repo, both branches, and four raw `assignment.md` files; 14 deck URLs; both `LICENSE` paths (404).

Method, corpus-wide counts, and the unreachable-this-pass log: [adoptability-audit.md](../adoptability-audit.md).
