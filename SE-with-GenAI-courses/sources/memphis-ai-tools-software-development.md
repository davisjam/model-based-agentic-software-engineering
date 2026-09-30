# University of Memphis — COMP 4991/6991 "AI Tools for Software Development"

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator (the whole course is using AI
tools across the lifecycle of a conventional software project — requirements, frontend, backend,
testing, deployment — not building AI systems)

## Sources consulted
- https://ai4sd-s26-memphis.github.io/ — course site home / schedule (cited as course URL in Geng et al. 2026, arXiv:2608.05898, Table 1)
- https://ai4sd-s26-memphis.github.io/syllabus/ — syllabus page
- https://ai4sd-s26-memphis.github.io/lecture/ — lecture schedule with slide/video listing
- https://ai4sd-s26-memphis.github.io/homework/ — homework overview (H1–H6) + rubric
- https://ai4sd-s26-memphis.github.io/homework/h1/ — H1 "Vibe Coding" reflection assignment
- https://ai4sd-s26-memphis.github.io/project/ — project overview (P1–P5)
- https://ai4sd-s26-memphis.github.io/project/p1/ — P1 "Requirements and Design" spec
- https://www.memphis.edu/cs/courses/graduate.php — CS graduate course list ("COMP 6991 - Special Topics: AI Tools for Software Development (Graduate)" with syllabus PDF link /cs/courses/syllabi/6991.pdf)
- Not fetched in depth (public): P2–P5 specs, H2–H6 specs, slide decks (.pptx), lecture videos; Canvas site (https://memphis.instructure.com/courses/198723) is login-gated.

## A. Explicit course content (quoted / cited)

### Identity
- University of Memphis, Department of Computer Science
- "COMP-4991-001, COMP-6991-001" — dual-listed undergrad (4991) / graduate (6991) special topics; site title "ST: AI Tools for Software Development (Spring 2026)"
- Term: Spring 2026 (Jan 19 – May 7, 2026); meets "Mon/Wed 2:20–3:45pm" in Dunn Hall 203
- Instructor: "Dr. Scott Fleming (sdflming@memphis.edu)"; TA: Md Muminul Hossain
- Provenance note on the site: "Based on CMU's 'AI Tools for Software Development' (Fall 2025) by Austin Henley and Andrew Begel (MIT License)."

### Stated learning objectives
Syllabus description (as fetched, close-paraphrase): students examine how to use AI-based developer tools across the entire software lifecycle, including "coding, code reviewing, project management, automated testing, and security," with significant development practice "both with and without AI tools," using "scripting languages (e.g., Python and JavaScript)."
Six named coverage areas (quoted fragments): requirements engineering incl. how to "get an LLM to create sound user stories"; development specification incl. "architecture diagrams, class diagrams, flow charts"; frontend development using "Figma's AI tools to create mockups"; backend development "collaborating with LLMs to generate backend code"; software testing incl. "writing effective automated software tests"; software deployment via "LLMs to assist in the configuration, staging, and uploading."
P1 objectives (verbatim): "Do effective user discovery interviews to learn about the problems your users have"; "Use an LLM to create sound user stories that accurately reflect your planning goals"; "Use an LLM to create storyboards that capture how users engage with the system"; "Guide an LLM to generate architecture diagrams and other technical artifacts."

### Organizing sequence
Six units (site home): 1. Vibe Coding (Jan 26–Feb 6); 2. User Discovery & Requirements (Feb 9–25); 3. Frontend Development (Mar 4–18); 4. Backend Development (Mar 23–Apr 1); 5. Software Testing (Apr 6–15); 6. Deployment & Presentations (Apr 20–May 6).
Lecture titles (verbatim from schedule): "Introduction to the Course"; "Vibe Coding"; "Vibe Coding Brownfield Projects" (×2); "Vibe Coding Reflection"; "User Discovery" (×2); "User Stories"; "Storyboards"; "Architecture and Design"; "Requirements and Design Reflection"; "Project Assignment and AI News"; "Frontend Development" (×2) + "Frontend Development Reflection"; "Backend Development" (×3) + "Backend Development Reflection"; "Software Testing" (×3) + "Software Testing Reflection"; "Software Deployment" (×2); "Software Demonstrations"; "Software Deployment Reflection"; "Final Project Presentations."
Notable rhythm: every unit ends with a named "Reflection" session.

### Assignments and project structure
- Homework: reflection essays H1–H6 (Vibe Coding, Requirements, Frontend, Backend, Testing, Deployment). Format (verbatim): "Write a 500-word essay on a reflection question of your choice from the sign-up sheet in Teams." AI ban on the essays: "You may NOT use AI to write this essay" (proofreading-only exception). Graded High-Pass/Low-Pass/Fail on frontmatter completeness, 500–600 word length, focus, and "depth of personal experience reflection." (Syllabus page says "5 homework assignments"; the homework page lists six, H1–H6 — discrepancy recorded as found.)
- Projects: P1 Requirements and Design; P2 Frontend; P3 Backend; P4 Testing; P5 Deployment & Presentation. ("5 project assignments," High-Pass/Low-Pass/Fail.)
- P1 detail (verbatim): "Pair Programming Requirement. For all parts of this assignment, the full team must work together." "AI Chat Transcript Requirement. Many parts of this assignment will involve interacting with AI chatbots. Transcripts of all such interactions must be saved and submitted." Deliverables in Markdown pushed to GitHub. Parts: user discovery ("Interview minimum 3 AI personas"), user stories ("Work with the AI to get a set of stories that seems reasonably feature complete," organized under epics with INVEST criteria), UX storyboard ("Use an LLM to create a UX storyboard for the selected stories/epic in Markdown" with ASCII art), software architecture (diagrams and API specs "written in the Mermaid diagramming language"), and a Team Reflection on "what worked well and key problems encountered for each part."
- Grading model (syllabus, verbatim): the final grade is "the **lowest performance-criterion grade** earned" across Attendance & Participation, Homework, and Project; letter grades require minimum High-Pass counts (e.g., "A: 3" High-Passes).

### AI tools and agent frameworks used
Named in fetched materials: LLM chatbots generally ("AI chatbots," transcripts required), "Figma's AI tools" for mockups; unit title "Vibe Coding" implies AI coding tools, including on "Brownfield Projects." Specific coding-agent products (Copilot/Claude Code/Cursor etc.) are not named on the fetched pages — likely in slides/Canvas; not evident in available materials.

### Readings
"No textbooks required. Students will read a selection of online sources" (syllabus). Specific reading list not evident in available materials.

### Treatment of: conventional SE activities
The course spine IS the conventional lifecycle: requirements (user discovery interviews, user stories, INVEST, epics), design (storyboards, architecture diagrams, API specs, Mermaid), frontend, backend, testing ("writing effective automated software tests"), deployment, code review, project management, security (per description). Pair programming is mandated on P1.

### Treatment of: human responsibility and judgment
- The recurring per-unit "Reflection" lectures and the six reflection-essay homeworks, which "may NOT use AI," institutionalize individual human sense-making about AI-assisted practice.
- The syllabus requires practice "both with and without AI tools."
- Verbs in objectives place the human in charge: "Guide an LLM…," "Work with the AI…."

### Treatment of: evaluation/verification of AI-produced work
A dedicated Software Testing unit (4 sessions) and project P4 Testing exist; description mentions "writing effective automated software tests" and "code reviewing." Details of how testing is aimed at AI-generated code specifically are in slides/subpages not fetched — beyond the unit's existence, not evident in available materials.

### Treatment of: persistent engineering knowledge beyond source code
Markdown deliverables in GitHub for requirements, stories, storyboards, architecture; mandatory saved AI chat transcripts as submitted artifacts. No evidence of instructor treatment of e.g. agent-facing context files (CLAUDE.md-style) in fetched pages — not evident in available materials.

### Treatment of: controls, constraints, governance, enforcement
- Process controls on students: transcript-submission requirement, no-AI rule on reflection essays, pair-programming requirement, lowest-criterion grading.
- Governance of AI behavior itself (guardrails, permissioning, sandboxing): not evident in available materials.

## B. Surveyor notes (interpretation, labeled)
- Coverage gaps: slide decks (.pptx) and lecture videos are linked but were not inspected; P2–P5 and H2–H6 subpages not fetched; Canvas is login-gated. The testing unit's actual stance on verifying AI output is therefore under-observed.
- Organizing logic (interpretation): a classic SDLC-shaped project course re-instrumented for the AI era — one team product driven through requirements→design→frontend→backend→testing→deployment, with AI tools used at every stage and a deliberate reflection loop (no-AI essays after each unit) as the mechanism for developing judgment. The "vibe coding first, then discipline" opening (greenfield vibe coding, then brownfield, then a reflection) reads as an intentional arc from naive tool use toward engineering practice.
- The CMU (Henley/Begel) lineage means findings here partially generalize to that course family; the Memphis instantiation is an MIT-licensed adaptation.
- Classification reasoning: "core comparator" — the built artifact is an ordinary web application; AI is the means of production, not the product.
