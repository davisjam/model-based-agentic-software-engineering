# UMD — CMSC 398Z "Effective use of AI coding assistants and agents"

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator (the entire course is practicing AI-assisted development of production-quality code with commercial assistants/agents; the "building LLM-powered software" unit is one topic inside a use-the-tools course)

## Sources consulted
- https://www.cs.umd.edu/class/fall2025/cmsc398z/ — official course main page
- https://www.cs.umd.edu/class/fall2025/cmsc398z/details.html — official topics + assigned-readings page
- https://www.cs.umd.edu/class/fall2025/cmsc398z/grading.html — official grading page
- https://github.com/billpugh/cmsc398z-student-downloads — official course handouts repo (14 weekly directories of projects/handouts)
- https://github.com/billpugh/cmsc398z-student-downloads/tree/main/week8 — week 8 handouts (Claude Code introduction)
- https://www.youtube.com/playlist?list=PLitxQsyUN5Ax0gNlxV5AP1IToUtikJ5jN — course videos playlist (exists publicly; not reviewed in detail here)
- https://cmsc398z-umd-fall25.zulipchat.com — course Zulip (behind login; noted as existing, not publicly reachable)

## A. Explicit course content (quoted / cited)

### Identity
University of Maryland, College Park · Computer Science (CMSC) · CMSC 398Z (special-topics number) · "Effective use of AI coding assistants and agents" · Fall 2025 · Instructors: Bill Pugh, Derek Willis · undergraduate · Fridays 2–4 PM, IRB 2207, 14 weeks · Prerequisite: "Minimum grade of C- in CMSC320 or CMSC330; and permission of CMNS-Computer Science department." · Credits: not evident in available materials.

### Stated learning objectives
Course description (main page):
> "Covers how to effectively use AI coding tools to develop software. The course will look at the tools and techniques used by engineers at companies like Google and Microsoft to develop production-quality code."

A formal learning-objectives list is not evident in available materials (grading references "relevance to learning objectives" without publishing a list on the fetched pages).

### Organizing sequence
Format: "Most weeks, much of the 2-hour window for class will be more like a discussion section or hackathon" (main page).

Topics (details page): introduction/course purpose; computer setup (Python, VSCode, version management with uv, testing frameworks); file formats and tools (CSV, dataframes, databases, JSON, git, markdown); GitHub Copilot in VSCode (slash commands, autocomplete, chat, prompt engineering); building LLM-powered software (structured output, constrained generation, security); "code quality beyond test passage (maintainability, architecture, efficiency, security)"; and planned later topics: alternative coding models (Cursor, Claude Code, Gemini CLI), CI/CD integration with AI tools, asynchronous coding agents, low-code/rapid development environments.

Weekly project arc (handouts repo): wk1 "Setting the stage" (playWordle) · wk2 Markov model · wk3 poker analysis · wk4 CSV/JSON/foreclosures data · wk5–6 structured data extraction with Simon Willison's `llm` tool · wk7 SQL generation + embeddings/vector similarity · wk8 Claude Code introduction · wk9–10 congressional-record text analysis · wk11–12 social media app build (two phases) · wk13–14 capstone ("quuly" project) + final class.

### Assignments and project structure
Grading (grading page, verbatim): "40% - Weekly learning log and check-in, 40% - Class participation, 20% - Code submitted for review."
- **Learning logs:** twice-weekly written reflections (due Tue and Fri noon) "focused on reflection about prior classwork and assigned readings," graded 1–6 "based on thoughtful completion, not on correctness."
- **Participation:** "Graded each class based on instructor observation in the classroom during pair and group work... with the expectation that most students will get a 10 each week." In-class pair coding is the core activity.
- **Code submissions:** graded 1–6 on "good faith effort, time on task, and relevance to learning objectives. Successful outcomes not required for top grades."

Week 8 assignment detail (handouts): using Claude Code on a wordSearch project; and "Modifying the idle editor distributed with Python" — students have Claude generate design and implementation documents (`goto-design.md`, `goto-implementation.md`), "then review Claude's work in a goto-review.md file," working against a `cpython-CLAUDE.md` project-context file, after a "Getting set up in Claude" handout.

### AI tools and agent frameworks used
GitHub Copilot (VSCode), Claude Code, Google Gemini, OpenAI tools, Cursor, Simon Willison's `llm` CLI tool (main page + details + handouts). A repo-level `CLAUDE.md` and a `cpython-CLAUDE.md` appear in the handouts.

### Readings
Assigned readings (details page): Wk1 — NYTimes "How Do You Teach Computer Science in the A.I. Era?"; Thomas Ptacek (Fly.io blog) "My AI Skeptic Friends Are All Nuts"; Harper Reed "An LLM Codegen Hero's Journey". Wk2 — Harper Reed "My LLM codegen workflow atm"; Simon Willison "Here's how I use LLMs to help me write code"; a Decoder/The Verge podcast on AI coding adoption. Plus "additional readings on pedagogy, Google's practices, and AI's impact on humanities" (details page as extracted).

### Treatment of: conventional SE activities
Present through the production-quality lens: testing frameworks in setup week; git; a topic explicitly on "code quality beyond test passage (maintainability, architecture, efficiency, security)"; planned "CI/CD integration with AI tools"; code review (20% of grade is "code submitted for review"; week 8 includes a `wordSearch-review.md`). Not organized as a requirements-to-deployment lifecycle course.

### Treatment of: human responsibility and judgment
The reflective spine: twice-weekly learning logs on classwork and readings; readings deliberately span enthusiast and skeptic practitioner voices; grading rewards thoughtful reflection and good-faith effort over outcome success. An explicit statement of human-responsibility doctrine is not evident in available materials.

### Treatment of: evaluation/verification of AI-produced work
Explicit in materials: the "code quality beyond test passage" topic; week 8's generate-design-then-review workflow, where students review Claude's work in a dedicated review document; code submitted for instructor review as a graded category.

### Treatment of: persistent engineering knowledge beyond source code
Present in artifacts: AI-generated design docs and implementation docs as first-class deliverables (`goto-design.md`, `goto-implementation.md`); project-context files (`CLAUDE.md`, `cpython-CLAUDE.md`); markdown as a taught tool; students' own learning logs as a running record.

### Treatment of: controls, constraints, governance, enforcement
Security appears twice as course content ("structured output, constrained generation, security" in LLM-powered software; "security" within code quality). Course-level AI-use governance policy: "Not addressed in document" (grading page) — not evident in available materials (unsurprising given the course's premise that AI use is the subject). CI/CD listed as a planned topic.

## B. Surveyor notes (interpretation, labeled)
- **Coverage:** rich-moderate — full public site (topics, readings, grading), a complete public handouts repo for all 14 weeks, and a public lecture-video playlist. Gaps: no formal objectives list; second-half topics were published as planned rather than confirmed; per-week notes and videos not exhaustively reviewed here; Zulip login-gated.
- **Interpretation:** the course is organized as a practitioner apprenticeship: weekly hackathon-style pair sessions climbing a tool ladder (autocomplete/chat Copilot → `llm` CLI scripting and structured extraction → Claude Code agentic work on real, unfamiliar codebases like CPython's IDLE → multi-week app builds), wrapped in a heavy reflective-writing regime. Grading (80% logs + participation) signals that the learning object is the student's judgment about the tools, not the artifacts.
- Distinctive markers worth carrying into the survey: the data-journalism flavor (co-instructor Derek Willis; foreclosures/congressional-record datasets), the design-doc-then-review agent workflow in week 8, and the readings list built almost entirely from practitioner essays rather than academic papers.
- Note: 398-numbered UMD courses are typically 1-credit seminars; credit value was not confirmed in public materials, so it is left unstated in §A.
