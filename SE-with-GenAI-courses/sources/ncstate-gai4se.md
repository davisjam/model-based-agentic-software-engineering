# NC State — "Generative AI for Software Engineering" (GAI4SE)

**Gathered:** 2026-09-30 · **Preliminary class:** exclude, borderline mixed (schedule and assignments center on researching/constructing and securing AI-for-SE techniques — code embeddings, backdoor detection, red-teaming, autonomous-SE research — with only isolated activities on practicing SE with AI)

## Sources consulted
- https://github.com/gai4se/GAI4SE-Course — official instructor GitHub course repo (README with full weekly schedule, logistics, deadlines); cited by Geng et al. 2026 arXiv:2608.05898 Table 1 as the course URL
- https://github.com/gai4se/LLM4SE — companion paper list linked from the README
- https://catalog.ncsu.edu/course-descriptions/csc/ — NC State catalog (CSC 421 "Generative AI for Software Engineering" description, for numbering context)
- https://www.kaggle.com/competitions/backdoor-detection-in-code-snippets — course Kaggle competition (linked from README; not fetched)
- Known to exist but NOT publicly reachable: the full Syllabus (Google Doc, HTTP 401) and the take-home assignment instructions (Google Doc, HTTP 401); GradeScope, Discord, and Google Forms (team formation, peer evaluation) are course-internal.

## A. Explicit course content (quoted / cited)

### Identity
North Carolina State University · Dept. of Computer Science · course number/section: not evident in available materials (README styles it only "Generative AI for Software Engineering (GAI4SE)"; NC State's catalog separately lists CSC 421 under this title, and Bowen Xu teaches CSC 591 special-topics sections in adjacent terms — which numbering applied in Fall 2025 is not publicly established) · Fall 2025 · Instructor: Dr. Bowen Xu (bxu22@ncsu.edu); grader Weiyuan Ding · graduate-flavored (midterm + research proposal/presentation structure; guest research talks) · Tue/Thu 3:00–4:15 PM, Fitts-Woolard Hall 02321.

For numbering context only, the catalog CSC 421 description reads: "This course primarily focuses on developing AI solutions to address complex software challenges, including the following content: AI model training and inference specifically for programming, software dataset construction and quality assessment, supporting tools for software development, AI for software security and privacy, developer-AI interaction, AI for software testing, communication, and teaming. It's a project-based course." (Whether the Fall 2025 GAI4SE offering ran under this description is not established.)

### Stated learning objectives
Not evident in available materials (they live in the login-gated syllabus Google Doc). The README's topic coverage spans code embeddings through "Autonomous SE with LLMs."

### Organizing sequence
Weekly schedule from the README (topics as listed; guest affiliation in parentheses):
Course Intro → "Research Ideas in GAI4SE" (paper-list reference) → Activity: "AI Impact on Programming" (pre-survey, annotation tool; paper "Reading Between the Lines") → "Basics of SE" → "Basics of Generative AI" → "Trojan Detection in LLMs" (guest: Aftab Hussain, Texas A&M) → "Code Embedding" → project workday → "Usable Privacy and Security" (guest: Shidong Pan, NYU) → "ASTRA: Red-teaming AI Assistants" (guest: Xiangzhe Xu, Purdue) → Proposal Presentations 1–3 → Mid-term Exam (Oct 9) → "Systematic Code Migration" → assignment discussion + competition → "Vibe Coding Activity" (in-class, Oct 23) → "Software Reliability via LLMs" (guest: Danning Xie, Meta) → "Autonomous SE with LLMs" (guest: Yuxiang Wei, UIUC) → "Causal Inference" (guest: Alejandro Velasco, William & Mary) → "Analytical SE with Generative AI" (guest: Yonglin Zhu, SAS) → Final Presentations 1–3 → Artifact Preparation.

### Assignments and project structure
From the README:
- **Group research project:** team formation (31 Aug), project topic finalization (26 Sep), proposal presentations, final presentations, "Group Project Artifacts + Peer Review" due 2 Dec.
- **Kaggle competition:** "Code Backdoor Detection" — first submission 3 Nov; "Submit your final result at Kaggle and analysis report" by 23 Nov.
- **Take-home assignment:** code embedding, due 26 Sep (instructions login-gated; submission via Gradescope).
- **AI Concepts Video** due 7 Sep; **Mid-term exam** Oct 9.
Grading percentages: not evident in available materials.

### AI tools and agent frameworks used
Not evident in available materials as a mandated toolchain. The course works ON AI-for-code artifacts (code embedding models, backdoored code snippets, LLM assistants as red-teaming subjects) rather than documenting a required coding-agent stack; one in-class "Vibe Coding Activity" (23 Oct) is scheduled.

### Readings
Research-paper driven: companion paper list repo (gai4se/LLM4SE); named paper "Reading Between the Lines" for the AI-impact activity; per-lecture slides in the repo.

### Treatment of: conventional SE activities
One early lecture, "Basics of SE"; research topics touch SE concerns (code migration, software reliability, software security/privacy, testing via the reliability/red-teaming lens). A practice-oriented SE lifecycle (requirements, design, review, deployment): not evident in available materials.

### Treatment of: human responsibility and judgment
Not evident in available materials. (The "AI Impact on Programming" activity with pre-survey and annotation tool examines how AI affects programmer behavior — an empirical-study framing rather than a responsibility framing.)

### Treatment of: evaluation/verification of AI-produced work
Present chiefly as a research subject rather than a practice: backdoor/trojan detection in code models (Kaggle competition + guest lecture), red-teaming AI assistants, "Software Reliability via LLMs." Verification of AI-generated code as a student practice: not evident in available materials.

### Treatment of: persistent engineering knowledge beyond source code
Research artifacts (proposal, analysis report, final presentation, "Artifact Preparation" session, peer review) are the graded documents. Engineering-knowledge artifacts (specs, ADRs, design docs): not evident in available materials.

### Treatment of: controls, constraints, governance, enforcement
Security/safety of AI coding systems is a major theme at the research level (trojan detection, red-teaming, privacy). Course-process controls (AI-use policy, logging, verification gates): not evident in available materials (policies presumably in the gated syllabus).

## B. Surveyor notes (interpretation, labeled)
- Coverage gaps: the syllabus and assignment instruction Google Docs are access-restricted (HTTP 401), so objectives, grading, prerequisites, and AI-use policy are "not observable in public materials," not absent. Slides exist in the repo but were not individually inspected. The exact CSC number/section for Fall 2025 could not be pinned from public sources.
- Interpretation: this reads as a graduate research seminar on GenAI-for-SE — a survey of the research field (representation learning for code, security of code models, agentic/autonomous SE, empirical methods) driven by guest researchers, a Kaggle-style model-analysis competition, and a student research project. The two practice-facing touchpoints (the AI-impact annotation activity and a single vibe-coding session) are data-collection/exposure exercises, not a sustained engineering-with-AI practicum. Against this survey's rubric it is principally about studying/constructing AI systems for SE — hence exclude, borderline mixed; note the tension with Geng et al.'s inclusion of it as an AI-assisted-SE course.
