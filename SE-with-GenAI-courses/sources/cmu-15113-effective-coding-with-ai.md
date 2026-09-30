# CMU — 15-113 "Effective Coding with AI"

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator (an application-building course whose subject is the effective, quality-preserving use of AI coding tools by programmers; no building-AI-systems content beyond optional ML modules in projects)

## Sources consulted
- https://www.cs.cmu.edu/~mdtaylor/113/S26/ — official Spring 2026 course site archive (the target offering; the live https://www.cs.cmu.edu/~113/ now serves Fall 2026, which split the semester course into two minis, 15-113/15-114)
- https://www.cs.cmu.edu/~mdtaylor/113/S26/project2.html — Spring 2026 Project 2 spec
- https://www.cs.cmu.edu/~mdtaylor/113/S26/bestPractices.html — "Best Practices and Lessons Learned" page (class-developed standards, Spring 2026)
- https://csd.cmu.edu/course/15113/f26 — CMU CS Department course page (description, prerequisites, assessment)
- https://www.cmu.edu/news/stories/archives/2026/august/navigating-the-ai-era-with-a-cmu-focus-on-critical-thinking — CMU News (Aug 2026), instructor quotes reflecting on the Spring 2026 offering
- https://www.cs.cmu.edu/~113/ — Fall 2026 site (used to corroborate objectives/policy text; noted where term differs)
- Ed Discussion forum (https://edstem.org/us/courses/91174/discussion) — behind login, noted as existing but not publicly reachable

## A. Explicit course content (quoted / cited)

### Identity
Carnegie Mellon University · Computer Science Department (SCS) · 15-113 · "Effective Coding with AI" · Spring 2026 (first offering; re-offered Fall 2026 as two minis 15-113/15-114) · Instructor: Mike (Michael) Taylor, Assistant Teaching Professor · undergraduate, open across majors (news article lists CS, ECE, statistics, data science, IS, architecture, neuroscience students) · Mon/Wed 12:30–1:50 PM · stated time commitment 6 h/week (3 in class + 3 outside) · Prerequisite: "15-112 Fundamentals of Programming and Computer Science" ("Algorithmic problem-solving skills, intermediate programming experience 15-112 or equivalent" per CSD page).

### Stated learning objectives
Course description (S26 site):
> "This application-focused course will teach students how to effectively combine intermediate programming skills with contemporary AI tools to enhance their software development workflow."

Also (catalog text recovered via search of the CSD page): students "will explore the capabilities and limitations of current AI coding assistants, experiment with prompt engineering, and collectively develop standards for maintaining code quality, transparency, and ethical integrity in AI-augmented workflows... Through weekly coding projects, students will rapidly build complete applications while balancing creative problem-solving with rigorous quality assurance."

Learning objectives (course site, quoted):
- "Build ambitious projects faster by using AI tools strategically while maintaining code quality"
- "Evaluate AI-generated content critically for correctness, security, performance, and maintainability" (full form from the F26 rendering; S26 lists "Critically evaluate AI-generated content")
- "Choose appropriate AI tools based on task requirements, tool capabilities, and project constraints"
- Navigate ethical considerations ("including bias, privacy, authorship and attribution, environmental impact" per F26 rendering)
- "Articulate a personal framework for when and how to use AI in software development"

### Organizing sequence
Spring 2026 schedule (S26 site, phase summary):
- **Phase 1: Tools & Exploration** (weeks 1–4): AI intro, portfolio building, core prompting, APIs
- **Phase 2: Strategic Mastery** (weeks 5–7): server-side development, ethics, AI & labor; spring break; weeks 8–9: databases, case studies
- **Phase 3: Capstones** (weeks 10–14): agentic workflows, phone apps, RAG, final topics

### Assignments and project structure
Grading (S26): Homework 20% · Participation 20% · Big Projects 40% · Exams/Quizzes 20%. (The F26 site redistributes: Big Projects 30%, TA meetings 10%, oral evaluations & quizzes 20%.)

~10 weekly homework assignments (S26 site): "Portfolio Setup, Crossy Road, API Exploration, Frontend+Backend, Labor Reading, SQLite App, Code Handoff, Agentic Build, Phone Apps."

Projects: **P1** Personal Portfolio Website (weeks 1–2) · **P2** "Creative Web App" (weeks 6–7) · **P3** Capstone (weeks 13–14).

P2 spec (S26): deliverables include a publicly deployed app (live URL), public GitHub repo, README, "prompt log (prompt_log.txt or .md) documenting AI tools used, development process, code authorship, and key prompts," a demo video, a midpoint in-person check-in, and a final presentation. Technical menu: frontend-backend communication, third-party API with secure keys, database, data analysis/visualization, rich interactivity, or ML/computer-vision modules. Grading emphasizes "evidence of manual coding work and learning (not copy-paste)" and requires that developers "understand all code thoroughly enough to discuss it in a technical interview without notes."

### AI tools and agent frameworks used
S26: Python 3.12+, Git & GitHub, GitHub Copilot ("free via Student Developer Pack"), ChatGPT (free tier), VS Code; CSD page adds "contemporary AI coding platforms (ChatGPT, Claude, Copilot, etc.)". The class best-practices page names Cursor and GitHub Copilot agentic modes ("Use Plan Mode before Agent Mode"). (The F26 site lists Google Gemini, Amazon Kiro, Claude, ChatGPT — term-specific.)

### Readings
"Labor Reading" homework and an "AI & Labor" week appear in the schedule; the news article reports Taylor "aimed to integrate ethics through science fiction discussions." Specific reading list: not evident in available materials.

### Treatment of: conventional SE activities
Present as the medium of weekly application-building: frontend+backend, APIs, databases (SQLite), deployment ("Master your platforms: understand deployment systems, databases, and frameworks independently"), testing/QA ("rigorous quality assurance" in the catalog description; "testing and quality assurance" named as a key focus area on the CSD page), documentation and code handoff (a "Code Handoff" homework). It is not organized as a formal SDLC-phase course.

### Treatment of: human responsibility and judgment
Strong and explicit:
- AI policy (course site): required to "Document all significant AI usage in code comments and writeups," "Explain AI-generated code in your own words," "Modify and test AI suggestions, don't just copy-paste"; not allowed: "Submitting AI code you can't explain reasonably well," "Claiming AI-augmented work as wholly original." Verification: "Instructors may ask students to explain submitted code and their creation process."
- Objective: "Articulate a personal framework for when and how to use AI in software development."
- Instructor retrospective (CMU News): "the students who learned the most were the ones who refused to let the AI think for them"; the course is "a sandbox... with an explicit goal of answering together this question of what's the best way to use AI."

### Treatment of: evaluation/verification of AI-produced work
Explicit objective ("Evaluate AI-generated content critically for correctness, security, performance, and maintainability"). Class-derived standards include "verify everything," "Read and understand your code: actively engage with generated code through testing and review, not blind trust," and "Debug manually first." P2 grading rewards bug prevention and secure secret handling.

### Treatment of: persistent engineering knowledge beyond source code
Distinctive: the course "collectively develop[s] standards," published as the living "Best Practices and Lessons Learned" page — 12 numbered practices distilled from student feedback "across nine assignments," including "Plan before coding: write detailed plans or SPEC.md files with acceptance criteria before implementation" and "Document thoroughly: leave READMEs with to-do lists, inline comments, modular file structures, and prompt logs for whoever inherits the code—including future you." Prompt logs are mandatory project deliverables; a "Code Handoff" homework exists. Taylor "surveyed students after each assignment" and "submitted findings to the spring Technical Symposium on Computer Science Education" (CMU News).

### Treatment of: controls, constraints, governance, enforcement
The AI-use policy with its explain-your-code verification interview; prompt-log requirements; secret-management requirements ("Explicitly instruct AI to use environment variables for keys"); late-work and academic-integrity policies ("Understand submitted code; proper attribution required"). Governance is by attestation + oral verification rather than automated gates; no CI/automated enforcement is evident in available materials.

## B. Surveyor notes (interpretation, labeled)
- **Coverage:** rich — official S26 archive with schedule, policy, project specs, plus the unusual class-authored best-practices artifact and an instructor retrospective in CMU News. Gaps: individual homework specs and lecture materials are not all public; exam/quiz content not public; Ed forum login-gated.
- **Interpretation:** the course is organized as guided co-discovery: weekly build-cycles across an escalating tool ladder (chatbot → IDE agent → agentic workflows/RAG), with the class itself producing the normative artifact (the best-practices standards) as a first-class outcome. The intellectual center is calibrated reliance — speed from AI, quality and understanding guaranteed by the human — enforced socially (oral defense, prompt logs) rather than technically.
- Note the lineage: this is a 15-112-successor "second course in programming" reimagined for AI-augmented development, aimed at a broad-major audience — lighter on industrial SE process than the CMU 17-316 or Harvard courses, heavier on personal workflow discipline and norms formation.
