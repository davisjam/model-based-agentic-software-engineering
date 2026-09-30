# University of Wisconsin–Madison — COMP SCI 639 "AI-Assisted Software Development and Intelligent Applications"

**Gathered:** 2026-09-30 · **Preliminary class:** mixed (explicitly two-headed: "leverage AI as both a productivity tool and architectural component" — half the course is AI-assisted development practice with a strong verification/AI-use discipline, half is building applications *with LLMs and agents inside them*: RAG pipelines, multi-agent apps)

## Sources consulted
- https://aicoding.cs.wisc.edu/fa26/syllabus.html — official syllabus, Fall 2026 (primary; rich — description, objectives, grading, tools, AI-use policy)
- https://aicoding.cs.wisc.edu/fa26/staff.html — staff page (course number "CS 639", title "AI-Assisted Software Development & Smart Applications", instructors + 5 TAs)
- https://aicoding.cs.wisc.edu/fa26/schedule.html — schedule page (the schedule table is JavaScript-loaded and did not render to a fetchable form — per-lecture topics/readings are effectively not machine-readably public)
- https://aicoding.cs.wisc.edu/ — site root (redirects to fa26; no earlier terms listed; a probe of /sp26/ returned 403, so Fall 2026 appears to be the current/only public offering on this site)
- https://guide.wisc.edu/courses/comp_sci/ — university catalog (does not yet list this course under a permanent number; COMP SCI 639 is the department's special-topics-style number. The catalog's separate COMP SCI 440 "AI Paradigms to Practice" is a different course.)
- Behind login: Canvas, lecture activities, "Vault", UW GitLab, AI session logs infrastructure.
- Note on the Geng et al. Table-1 "Univ. of Wisconsin — AI-Assisted Software Development" row: this site is the matching course identity found; whether Geng surveyed an earlier term of the same course could not be verified from public pages (no archived earlier-term site was reachable).

## A. Explicit course content (quoted / cited)

### Identity
University of Wisconsin–Madison · Department of Computer Sciences · COMP SCI 639 · "AI-Assisted Software Development and Intelligent Applications" (staff page styles it "AI-Assisted Software Development & Smart Applications") · Fall 2026 · Instructors: Louis Oliphant and Kaiser Pister (both Teaching Faculty, Computer Sciences); Head TA Omid Rostamabadi + 4 TAs · undergraduate (3 credits; prerequisites CS 200 and CS 300, concurrent CS 400 expected) · two in-person lecture sections (TR 1:00–2:15 Noland 132; MW 4:00–5:15 Morgridge 2522); attendance required, no recordings.

### Stated learning objectives
As extracted from the syllabus (near-verbatim list) — students should be able to:
- "Integrate AI-driven development tools to accelerate the software life cycle"
- "Design full-stack applications incorporating LLMs and agents"
- "Build and optimize RAG pipelines using vector databases"
- "Execute end-to-end product development from design to deployment"
- "Evaluate AI-generated code for accuracy, security, and ethics"
- "Automate QA using AI-generated tests"
- "Optimize AI performance balancing model selection, latency, and costs"

Course description (as extracted): the course "teaches students to leverage AI as both a productivity tool and architectural component"; students "master AI-assisted workflows spanning requirements analysis through cloud deployment" and "learn to architect full-stack applications integrating LLMs and AI agents as core functional elements."

### Organizing sequence
Not machine-readably public (the schedule table loads via JavaScript; pre-class readings "are assigned per lecture and listed on the schedule page"). The project ladder (below) implies the arc: frontend → full-stack → RAG → multi-agent → open final project.

### Assignments and project structure
Grading: Quizzes 7% (27 pre-lecture reading-comprehension quizzes, 5 lowest dropped) · Surveys 1% · Projects 54% · Exams 30% (three closed-book written exams, one 8.5"×11" note sheet) · In-class participation 8% (hands-on lecture activities "using parallel practice codebases", 5 lowest dropped).

Projects (54%): P1 Frontend Game 8% · P2 Full-Stack Quiz Game 11% · P3 RAG Q&A Application 11% · P4 Multi-Agent Study Assistant 11% · Final Project 13%. P1–P4 in instructor-assigned pairs; Final Project in self-chosen teams up to 4. "Graded on automated tests, rubric criteria, AI logs, and commit history balance. Required TA code review meeting." Slip-day policy: 5 slip days across P1–P4, hard 2-day late cutoff.

### AI tools and agent frameworks used
"Students must purchase Claude Code Pro subscription ($20/month) for course duration. This is a mandatory course cost; financial hardship exceptions available upon request." "Claude Code is required and expected on all projects." Vector databases (for RAG), LLM APIs, and agents are course infrastructure per the objectives; specific vendor stack beyond Claude Code: not evident in available materials.

### Readings
No textbook; per-lecture assigned readings on the (non-fetchable) schedule page. The site also lists a "Resource Guide" and an "AI Roundup".

### Treatment of: conventional SE activities
The workflow span is stated as "requirements analysis through cloud deployment"; QA/testing appears as "Automate QA using AI-generated tests"; projects are graded partly on "automated tests" and "commit history balance" (i.e., version-control discipline within pairs) with a "required TA code review meeting". Design documentation is mandated before coding (see the Elephant-Goldfish Model below).

### Treatment of: human responsibility and judgment
Central and explicit. The AI-use policy's stated "critical standard", quoted: "can you explain, defend, and verify what it produced?" Acceptable use: "Using Claude Code to design, implement, debug, test, and review project code while maintaining ability to explain the approach and limitations; logging all AI sessions as required." Not acceptable: "Submitting unexplainable AI code, using AI on quizzes or exams, having non-partners complete paired work, or failing to log sessions. Violations constitute academic dishonesty." Exams are closed-book and AI-free — individual comprehension is separately assessed (30% of grade).

### Treatment of: evaluation/verification of AI-produced work
Explicit at three levels: (1) learning objective "Evaluate AI-generated code for accuracy, security, and ethics"; (2) the explain-defend-verify standard quoted above; (3) a named course methodology — "the 'Elephant-Goldfish Model' — design documentation before coding, 'Goldfish tests' (fresh AI verifying design comprehension), and rigorous code review." ("Goldfish tests" — a fresh, context-free AI instance used as a verification probe against the design docs — is the syllabus's own coinage as extracted.)

### Treatment of: persistent engineering knowledge beyond source code
Two mechanisms are visible: design documentation required before coding (Elephant-Goldfish Model), and mandatory AI session logs (a durable record of the human-AI interaction, used in grading). The site also lists a "Shared Skills" area (content behind the site; not inspectable). Anything further: not evident in available materials.

### Treatment of: controls, constraints, governance, enforcement
The course itself operates a control regime on students' AI use: mandatory session logging (graded artifact; failing to log = academic dishonesty), AI-free closed-book exams, commit-history balance checks, automated-test grading, and required TA code reviews. Governance of AI in industrial engineering settings as *taught content*: beyond "accuracy, security, and ethics" evaluation, not evident in available materials.

## B. Surveyor notes (interpretation, labeled)
- **Coverage gaps:** the lecture-by-lecture schedule, readings, activity specs, and the "Shared Skills"/"Vault" materials are not publicly fetchable (JS-rendered or behind login). Everything else is unusually well documented. Evidence strength: rich.
- **Organizing logic (interpretation):** a deliberately dual-track undergraduate course. Track 1 — *engineering with AI*: mandated Claude Code, design-docs-first methodology, an explain-defend-verify accountability standard, AI session logs, and independent human-comprehension assessment via closed-book exams. Track 2 — *engineering AI-bearing applications*: a project ladder that climbs from plain frontend to RAG to multi-agent systems. The named "Elephant-Goldfish Model" (design docs as the durable memory; a fresh "goldfish" AI as a verification probe of whether the docs suffice) is the most distinctive pedagogical device in this batch — it operationalizes both persistent-knowledge and verification concerns.
- **Classification reasoning (interpretation):** mixed — Track 1 alone would make it a core comparator; P3/P4 and three of seven objectives (LLM/agent app architecture, RAG pipelines, model-selection/latency/cost optimization) are squarely building-AI-systems content of comparable weight.
