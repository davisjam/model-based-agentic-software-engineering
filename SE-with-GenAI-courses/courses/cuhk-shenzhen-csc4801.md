# CUHK-Shenzhen CSC4801 — AI-assisted Software Engineering

Fall 2026 · Jinsheng Ba · undergraduate ·
[evidence](../sources/cuhk-shenzhen-csc4801.md)

## What it teaches

"A hands-on course on building software with coding agents," in three declared stages: "first the
**basis** — how AI and large language models work...; then the **techniques** — the basic methods
of applying AI across the engineering lifecycle; and finally the **application** — a real-world
team project where you practice using AI to build, test, and secure a working product." The
techniques stage walks Requirements → Specification Driven Development → Coding → Team
Collaboration → Testing & Verification → Fuzzing → Security → Prompt Injection → Repair → AIOps.
The team project (50% of grade) builds a recruiting platform with "AI coding agents and
spec-driven workflows," with a feature freeze, a competitive leaderboard, and a Week-12
"Cross-team Auditing & Repair" phase.

## How it is organized (interpretation)

A three-act mechanism-literacy → lifecycle-techniques → competitive-application design. Two
features stand out: spec-driven development as a named lecture and a mandated project workflow
(specifications as first-class artifacts for agent direction); and the adversarial cross-team
audit-and-repair phase — students verify and fix another team's AI-built product, the corpus's
only structurally adversarial verification exercise. Verification and security get more named
lecture airtime (4 of 18 content lectures) than in most corpus courses.

## Evidence caveat

Moderate: schedule, project page, and tool list public; slides exist but are unpublished
(gitignored), homework specs and grading detail not public. Depth behind lecture titles is
unobservable.

## Adoptability (drop-in availability, audited 2026-09-30)

**Category 2 — substantial reusable materials, at the low band.** Seven complete decks and a densely
curated reading list are genuinely reusable; nothing else in the instructional package is published.

- **Public:** a complete 14-week, 28-session dated table (Sep 8 – Dec 17) with per-session topic,
  Slides, Assessments, and Readings columns · **7 downloadable full PDF decks**, confirmed as real
  binaries in the repo · roughly **40 curated readings** across the 14 weeks — papers, benchmarks,
  vendor engineering writeups, the OWASP LLM Top 10, video lectures — the site's strongest asset.
- **Absent:** no syllabus page at all (no grading breakdown, no policies, no prerequisites, no
  outcomes). **0 of 3 homeworks** have instructions — HW 1–3 and both quizzes appear only as dates.
  The project is one paragraph over an **empty eight-row leaderboard template** still carrying the
  author's own placeholder note. No rubrics anywhere. The repo README is website-maintenance
  documentation, not teaching guidance.
- **Mid-delivery:** F26, week 4 of 14 at audit time, and the site states "Slides are posted after each
  class" — an incomplete package rather than a withheld one. The remaining 21 sessions show `—`.
- **Login:** none. Nothing is gated; the homework and project specs are simply not published here.
- **License:** **no license stated.** No `LICENSE` in the repo root, the GitHub license endpoint
  404s, the `license` field is `null`, and no page states terms — the only footer text is "© 2026
  CSC4801 · Course website."
- **Checked:** the course site and `project.html`; a deck downloaded and byte-verified; the repo
  contents, slides directory, README, and both license endpoints via the GitHub API.

Method, corpus-wide counts, and the unreachable-this-pass log: [adoptability-audit.md](../adoptability-audit.md).
