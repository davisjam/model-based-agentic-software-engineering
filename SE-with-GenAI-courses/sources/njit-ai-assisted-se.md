# NJIT — CS 485/698 "ST: AI-Assisted Software Engineering"

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator (semester-long AI-assisted SE project spanning requirements → spec → frontend → backend → testing → deployment, with mandatory LLM-interaction logs and units on ensuring AI-generated code is correct)

## Sources consulted
- https://kelloggm.github.io/martinjkellogg.com/teaching/cs485-sp26/ — official course site (index)
- https://kelloggm.github.io/martinjkellogg.com/teaching/cs485-sp26/about/ — syllabus
- https://kelloggm.github.io/martinjkellogg.com/teaching/cs485-sp26/calendar/ — full lecture calendar
- https://kelloggm.github.io/martinjkellogg.com/teaching/cs485-sp26/projects/ — project milestone index (P0–P7)
- https://kelloggm.github.io/martinjkellogg.com/teaching/cs485-sp26/projects/p1.html — P1 Requirements Engineering spec
- https://kelloggm.github.io/martinjkellogg.com/teaching/cs485-sp26/projects/p5.html — P5 Testing spec
- https://people.njit.edu/profile/mjk76 — NJIT faculty profile (course listings CS 485 / CS 698)
- https://news.njit.edu/ai-assisted-software-engineering-special-topics-course-could-become-mainstream — NJIT news article (secondary)
- Not fetched in depth (public, further detail available): assignments a1–a7.html, projects p0/p2/p3/p4/p6/p7.html, tutorials (incl. "How to Save Logs From Your LLM", Glossary). Canvas pages (undergrad/grad) are login-gated.

## A. Explicit course content (quoted / cited)

### Identity
New Jersey Institute of Technology · Ying Wu College of Computing, Dept. of Computer Science · CS 485 (UG) / CS 698 (grad), special topics · "AI-Assisted Software Engineering" · Spring 2026 · Instructor: Martin Kellogg · "Open to bachelor's, master's, and PhD students" · in-person, Mon/Wed 11:30am. Two Canvas sections (undergrad 64185, grad 64184). Site licensed CC BY-SA.

### Stated learning objectives
Course-level description (syllabus/about page): "Modern generative artificial intelligence tools are astonishingly effective at generating code, given natural language specifications... students will get hands-on experience in using such artificial intelligence tools for software engineering in a semester-long course project." Per the NJIT news article and course materials, topics include "agents, requirements elicitation and specification in the AI era, AI code generation and how to ensure that AI-generated code is correct," plus "how other traditional software engineering practices like code review and static analysis can help with AI-assisted software engineering." Per-milestone learning goals are stated on each project page (e.g., P5: "Write unit tests using multi-shot prompting"; "Automate test runs via GitHub continuous integration").

### Organizing sequence
Full calendar published (calendar page). Arc: Intro → LLM Code Generation (reading: Simon Willison's 2025 LLM review) → Requirements Engineering (User Discovery Lab; synthetic-users reading; "The Mom Test"; user stories) → Creating Dev Specs → Frontend (intro; creating UI code; UI behaviors) → Backend (coding lab; data and notifications) → Testing w/ LLMs (intro; TDD; "Evaluating Test Quality") → Deployment (intro; backend and CD; monitoring) → Static analysis + LLMs → Verification + LLMs → Guest lecture (Michael Chong) "on evaluating LLM-generated code quality" → wrapup → project presentations. Each unit closes with an in-class Discussion session and a due reflection essay.

### Assignments and project structure
- Grading (about page): "50% Course Project, 18% Reflection Essays, 32% In-class Activities, Participation, and Professionalism."
- Seven individual reflection essays (A1 LLMs-for-code experience; A2 requirements; A3 frontend; A4 backend; A5 testing; A6 deployment; A7 special topic, graduate-only).
- Team project milestones P0–P7: Choose a Project Team; Requirements Engineering; Development Specification; Frontend Development; Backend Development; Testing; Deployment; Final Demo & Postmortem.
- P1 (spec page): human-authored value proposition compared against an LLM-generated one; 10 discovery questions per "The Mom Test" ("Talk about their life instead of your idea. Ask about specifics in the past..."); "four+ conversations with actual humans (not LLMs)"; LLM-generated user stories ("As a <user>, I want <action> so that <benefit>") evaluated via the INVEST framework, pruned and prioritized into sprints; "all LLM chat logs" are deliverables.
- P5 (spec page): unit tests generated via "formalized LLM prompts, such as those we introduced in class"; "You may not modify any generated code directly, only by prompting the LLM."; minimum "80% code coverage"; CI via GitHub.

### AI tools and agent frameworks used
Specific tool mandates are not evident in the fetched pages (assignment/tutorial pages not all inspected). The syllabus requires: "You are permitted (or, sometimes, even required) to use generative AI tools on many assignments... you are **required** to include a log of your interaction with the tool." A tutorial "How to Save Logs From Your LLM" exists. Calendar names "agents" era topics; specific vendor tools: not evident in available materials.

### Readings
"This course has no required textbook... Topic-specific reading materials for software engineering topics... will be provided; these will be officially optional, but strongly recommended for students who have not taken CS 490." Named/mandatory readings on calendar: the syllabus itself; Willison's piece on 2025 LLM developments; a reading on synthetic users; "The Mom Test" (background); development-spec guidelines; special-topics readings on LLMs vs human experts. Tutorial: "How to Read a Paper."

### Treatment of: conventional SE activities
The project spine IS conventional SE re-run with LLMs: requirements elicitation, user stories/sprints (INVEST), development specifications, frontend/backend implementation, testing (TDD, test quality, coverage, CI), deployment (CD, monitoring), code review, static analysis, postmortem. Prerequisites: "Officially, none. Students will be expected to know how to program well enough to understand and debug code generated by an AI tool." Course "utilizes what was learned in CS 490: Guided Design in Software Engineering" (news article).

### Treatment of: human responsibility and judgment
- "Students will be expected to know how to program well enough to understand and debug code generated by an AI tool." (about page)
- P1 keeps humans in the loop by construction: interviews must be "with actual humans (not LLMs)"; the value proposition is first human-authored, then compared with the LLM's.
- P5 grades the human's control of the model: "You will be graded on how well you prevent the LLM from hallucinating nonsensical test cases or creating duplicate or significantly overlapping test cases."

### Treatment of: evaluation/verification of AI-produced work
Explicit and recurring: "how to ensure that AI-generated code is correct" is a named course topic; dedicated lectures on "Evaluating Test Quality," "Static analysis + LLMs," "Verification + LLMs"; guest lecture on "evaluating LLM-generated code quality"; P5 requires running tests locally, coverage thresholds, CI execution, and debugging failed tests via re-prompting ("You may not modify any generated code directly, only by prompting the LLM").

### Treatment of: persistent engineering knowledge beyond source code
Requirements documents, development specification documents (P2 + "development spec guidelines" reading), postmortem (P7), and per-unit reflection essays are all graded artifacts. LLM chat logs are mandatory deliverables throughout.

### Treatment of: controls, constraints, governance, enforcement
- Mandatory AI-interaction logging as an enforcement/audit substrate: "you are **required** to include a log of your interaction with the tool" (about page), supported by a logging tutorial; academic-integrity violations (including using AI where forbidden) fall under NJIT policy up to "failing grade of F, and/or suspension or dismissal."
- Process constraints inside assignments (P5's prompt-only modification rule; coverage floors; CI gates).
- Broader "governance" vocabulary beyond these: not evident in available materials.

## B. Surveyor notes (interpretation, labeled)
- Coverage gaps: individual assignment pages (a1–a7), P0/P2/P3/P4/P6/P7 specs, tutorials, and the grading rubrics were not all inspected (public but unfetched); Canvas content is login-gated; specific AI tool choices not established.
- Interpretation: the course is organized as a classical end-to-end SE lifecycle (requirements → spec → build → test → deploy → postmortem) re-instrumented for LLM collaboration, with a parallel reflective-writing track per lifecycle phase. Its distinctive moves are (1) treating "ensuring AI-generated code is correct" as a first-class topic culminating in static-analysis and verification lectures, and (2) enforcing prompt-mediated development (no direct edits to generated code in P5) plus universal chat-log submission — i.e., the pedagogy makes the human's steering and checking of the model the graded skill. Core comparator.
