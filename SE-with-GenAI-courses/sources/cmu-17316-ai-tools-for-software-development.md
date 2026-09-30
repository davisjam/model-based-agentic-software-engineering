# CMU — 17-316/17-616 "AI Tools for Software Development"

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator (an SE-lifecycle project course in which the code is produced by directing AI tools — "You will not write actual code in this class" — with explicit with-and-without-AI comparison and productivity analysis)

## Sources consulted
- https://ai-developer-tools.github.io/ — official course website (home page with full lecture schedule and assignment/project calendar)
- https://ai-developer-tools.github.io/syllabus/ — official syllabus (grading, policies, AI-use policy)
- https://ai-developer-tools.github.io/project/p1/ — P1 Requirements Engineering project spec
- https://ai-developer-tools.github.io/assignments/HW1/ — HW1 Vibe Coding Reflection spec
- https://s3d.cmu.edu/news/2025/1020-ai-tools-for-software.html — CMU S3D news article "Students Put AI Coding Tools to the Test" (Oct 2025), instructor quotes
- https://www.coursicle.com/cmu/courses/S3D/17616/ — catalog mirror (identity corroboration)
- Canvas (https://canvas.cmu.edu/courses/49386), Slack, Gradescope — course channels behind login, noted as existing but not publicly reachable

## A. Explicit course content (quoted / cited)

### Identity
Carnegie Mellon University · Software and Societal Systems Department (S3D), School of Computer Science · 17-316 (undergraduate) / 17-616 (graduate) · "AI Tools for Software Development" · Fall 2025 (Aug 25 – Dec 5, 2025; described by S3D news as "a new experimental fall 2025 course") · Instructors: Austin Henley, Andrew Begel · UG + grad cross-listed · two 80-minute lectures weekly (Mon/Wed 11:00–12:20), 12-unit course (~12 h/week), team-based in assigned groups of 2–3.

### Stated learning objectives
Course description (course site / catalog):
> "Students will learn how to use AI-based developer tools across the software development lifecycle, for example in coding, code reviewing, project management, automated testing, and security."

Same source: "The course will require significant software development practice, both with and without AI tools... Students will use their experiences to analyze the impact of AI tools on software productivity across individuals, teams, and organizations."

Instructor framing (S3D news article):
> Begel: "You will not write actual code in this class. Instead, you will tell the large language model to do everything for you."
> Begel, defining vibe coding: "Coding with the hope that the output will work flawlessly without testing or training."
> Henley, on the inspiration: "We were using AI to build AI."

### Organizing sequence
Full Fall 2025 lecture schedule (verbatim titles from the course home page):
- Aug 25 "Introduction to Vibe Coding" · Aug 27 "Vibe Coding on an Existing Codebase" · Sep 3 "Vibe Coding Discussion"
- Sep 8 "User Discovery Lab" · Sep 10 "Creating Effective User Stories" · Sep 15 "Creating Dev Specs" · Sep 17 "Requirements Engineering Reflection"
- Sep 22 "Front End Development" · Sep 24 "Creating the Front End UI Code" · Sep 29 "Creating UI Behaviors"
- Oct 6 "Backend Coding Lab" · Oct 8 "Backend Coding: Notifications" · Oct 20 "Understanding Backends" · Oct 22 "Backend Coding Discussion"
- Oct 27 "Making an LLM Obey" · Oct 29 "Software Testing" · Nov 3 "Testing: Test-Driven Development and Continuous Integration" · Nov 5 "Testing Discussion"
- Nov 10 "Deployment" · Nov 12 "Deploying a Backend" · Nov 17 "Continuous Deployment" · Nov 19 "Deployment Discussion"
- Nov 24 "Monitoring" · Dec 1 "Class Wrapup + Project Presentations" · Dec 3 "Project Presentations"

### Assignments and project structure
Grading (syllabus): in-class activities 46% · course project 42% · homework essays 12%.

**Seven sequential team project phases:** P1 Requirements Engineering (Sep 17) → P2 Development Specifications (Sep 24, with a "P2 Redo" due Oct 31) → P3 Frontend Development (Oct 5) → P4 Backend Development (Oct 22) → P5 Testing (Nov 10) → P6 Deployment (Nov 21) → P7 Final Demo + Postmortem (Dec 5).

P1 spec detail (project page): value proposition written first "without AI assistance," then "Request LLM-generated propositions for comparison" and "analyze differences"; 10 discovery questions per "The Mom Test" ("Talk about their life instead of your idea"); ≥4 interviews with real people ("not LLMs"); 10 LLM-generated user stories ("As a [user], I want [action] so that [benefit]") evaluated with the INVEST framework, cut to 5, prioritized across five 2-week sprints; deliverables include "complete LLM chat logs."

**Six individual reflection essays** (HW1–HW6: Vibe Coding, User Discovery, Frontend Coding, Backend Coding, Testing, Deployment): 500-word essays on assigned reflection questions. HW1: goals are to "Reflect on your experience vibe coding programs from scratch, use LLMs to modify existing code, and using LLMs to help you understand how the codebase works"; 65/100 points for "meaningful, experience-based reflections."

In-class activities include mob-programming sessions "where classmates call out commands to an AI tool operator"; the first in-class exercise was "an Instagram-like app built in 13 minutes without manual coding" (S3D news).

### AI tools and agent frameworks used
"AI coding tools like Cursor and Windsurf" (S3D news); LLMs generally. No exhaustive official tool list found on the public site.

### Readings
"We will be reading a selection of online sources that will be provided." No textbook. Schedule names two papers: "Good Vibrations? A Qualitative Study of Co-Creation, Communication, Flow, and Trust in Vibe Coding" (Sep 29) and "Software Testing with Large Language Models: An Interview Study with Practitioners" (Oct 29), plus "Development Spec Guidelines" (Sep 15).

### Treatment of: conventional SE activities
The spine of the course IS the lifecycle: requirements/user discovery, dev specs, frontend, backend, testing (incl. TDD and CI), deployment (incl. continuous deployment), monitoring, postmortem — each a project phase with a lecture block.

### Treatment of: human responsibility and judgment
- Reflections must be human-written: "You should not use any AI, GenAI, or LLM to write this essay," with proofreading-only tool use, and students "will be on the hook for understanding and defending the opinions you write in these reflection essays during in-class activities."
- P1 requires human-first work products before AI comparison, and interviews with humans "not LLMs."
- Course-level outcome: students "analyze the impact of AI tools on software productivity across individuals, teams, and organizations."

### Treatment of: evaluation/verification of AI-produced work
- Academic-honesty policy: "All adapted code from external sources requires full understanding demonstrated through passing unit tests."
- P5 Testing phase plus lectures on Software Testing, TDD, and CI; the lecture "Making an LLM Obey" (title verbatim) sits directly before the testing block.
- S3D news: students "learn to read generated code and guide the LLM to fix errors."

### Treatment of: persistent engineering knowledge beyond source code
Development Specifications are a dedicated project phase (P2) with published guidelines and a required redo; P1 deliverables archive interview data, analyses, and "complete LLM chat logs"; P7 requires a postmortem.

### Treatment of: controls, constraints, governance, enforcement
The AI-use policy is differentiated by artifact: "It is expected that much of the artifacts you produce will come in part from AI," but AI is banned for reflection essays. Enforcement mechanisms named: understanding demonstrated through unit tests, in-class defense of one's written opinions, citation requirements, minimum-zero grades for violations. CI and continuous deployment appear as course content (Nov 3, Nov 17 lectures).

## B. Surveyor notes (interpretation, labeled)
- **Coverage:** rich — full public schedule, syllabus, per-assignment specs, plus a news article with instructor quotes. Gaps: lecture slides and Canvas materials are login-gated; the complete tool list and P3–P7 spec details were not fetched (pages exist publicly and could be pulled later).
- **Interpretation:** the course is organized as a conventional-SE project course run at one remove: students execute the classic lifecycle, but the mandated production mechanism is directing an LLM rather than typing code. The design systematically pairs each AI-mediated phase with a human-only reflection essay — the with-AI/without-AI contrast and the "analyze the impact on productivity" outcome make it read partly as a participatory field study of AI-assisted SE, consistent with the instructors' research backgrounds and the news article's "experimental" framing.
- The reflection-essay AI ban plus in-class defense is the clearest published governance mechanism: the course allows near-total AI production of code artifacts while walling off the metacognitive artifacts.
