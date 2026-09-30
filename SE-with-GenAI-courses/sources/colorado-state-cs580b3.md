# Colorado State University — CS-580B3 "Artificial Intelligence for Software Engineering"

**Gathered:** 2026-09-30 · **Preliminary class:** mixed (an AI4SE survey course — students *study and build AI solutions for* SE-lifecycle tasks from the research literature — but several outcomes have students *use* AI/LLMs in engineering practice: documentation generation, testing automation, team productivity; AI use is permitted-and-reported on assignments)

## Sources consulted
- https://courses.cs.colostate.edu/cs580b3/ — official course home page (identity, description, sections)
- https://courses.cs.colostate.edu/cs580b3/syllabus/ — official syllabus (description, CLOs, schedule, grading, AI-use policy)
- (Sibling course library entry https://courses.cs.colostate.edu/cs580b2/ exists — a different B-section course, not consulted for content. Activities/assignment specs live behind Canvas — not public.)

## A. Explicit course content (quoted / cited)

### Identity
Colorado State University · Department of Computer Science · CS-580B3 (580 = graduate special-topics letter-section numbering) · "Artificial Intelligence for Software Engineering" · Spring 2026 · Instructor: Fabio Santos (fabio.deabreusantos@colostate.edu, office CS 458); TA: Satya Kadiyala · graduate level (senior undergraduates admitted via prerequisites) · two sections: 001 in-person T-Th 2:00–3:15pm Eddy 118; 801 asynchronous online.

### Stated learning objectives
Syllabus description, quoted: the course provides "a comprehensive overview of AI applied to software engineering (SE)" focused on the "challenges involved in adopting state-of-the-art AI techniques to the SE life cycle"; "This course is designed as a graduate-level Artificial Intelligence for Software Engineering (AI4SE)."

Course learning outcomes (as extracted; near-verbatim, numbered as in the syllabus):
- CLO 1: Mine software repositories
- CLO 2: Describe AI's role supporting SE domains
- CLO 3: Build AI solutions for software maintenance
- CLO 4: Leverage AI for team collaboration and productivity
- CLO 5: Improve code quality using AI and MLOps
- CLO 6: Automate code and documentation generation with LLMs
- CLO 7: Implement AI-driven testing automation

Home-page topics: "code quality monitoring, bug detection, automatic code generation and documentation, automated testing, and social-technical environment monitoring in software teams."

### Organizing sequence
Published weekly arc (16 weeks):
- Weeks 1–3: course introduction, OSS communities, AI4SE fundamentals, MSR (mining software repositories) APIs, LLM basics — prompt engineering, fine-tuning, RAG
- Weeks 4–8: datasets, Requirements, Contributor Onboarding, Knowledge Modeling, Documentation
- Weeks 9–12: Bug Localization, Program Repair, MSR Lab, LLM Lab
- Weeks 13–15: Code Review, Testing, final project work and presentations
- Week 16: Final Exam

### Assignments and project structure
Grading: Assignments 40% · Project 30% · Article 30%. (An "Article" deliverable — a written scholarly artifact — carries equal weight with the project.) Assignment specs: not public. Two hands-on labs are named in the schedule (MSR Lab, LLM Lab).

### AI tools and agent frameworks used
LLM techniques are named (prompt engineering, fine-tuning, RAG); MSR APIs; MLOps (CLO 5). Specific products (Copilot, ChatGPT, etc.): not evident in available materials.

### Readings
"Recent or relevant articles published" (quoted) — a research-paper-driven course; no textbook.

### Treatment of: conventional SE activities
The lifecycle organizes the schedule: requirements, onboarding, documentation, bug localization, program repair, code review, testing, maintenance, code quality — each treated as a domain where AI techniques are adopted (per the "challenges involved in adopting state-of-the-art AI techniques to the SE life cycle" framing).

### Treatment of: human responsibility and judgment
Not evident in available materials beyond the AI-use reporting requirement quoted below.

### Treatment of: evaluation/verification of AI-produced work
Testing appears as an AI-application area (CLO 7 "Implement AI-driven testing automation"; Week 13-15 Testing) — i.e., AI *for* testing. Verification *of* AI-produced work as a taught concern: not evident in available materials.

### Treatment of: persistent engineering knowledge beyond source code
"Knowledge Modeling" is a named week (Weeks 4–8 block) and "Documentation" both a week and a CLO (automate documentation generation). Depth: not evident in available materials.

### Treatment of: controls, constraints, governance, enforcement
AI-use policy, quoted: "AI is allowed to prepare code assignments, except when explicitly mentioned in assignments. Students must report AI usage." Plus standard academic-dishonesty penalties (plagiarism, cheating, contract cheating). Governance of AI-in-engineering as course *content*: not evident in available materials.

## B. Surveyor notes (interpretation, labeled)
- **Coverage gaps:** assignment/lab specs, project description, article requirements, lecture slides, and reading lists are behind Canvas. Evidence strength: moderate.
- **Organizing logic (interpretation):** a research-literature-driven AI4SE survey in the same genre as Purdue CS 59200-ASE, but with a stronger empirical-SE/MSR spine (mining repositories, OSS communities, socio-technical monitoring — consistent with the instructor's MSR research background) and more hands-on "use the LLM technique" labs. The CLOs mix building AI solutions (CLO 3) with using AI in practice (CLO 4, 6, 7), which is why this lands "mixed" rather than "exclude."
- **Classification reasoning (interpretation):** mixed — closer to the build-AI-for-SE pole than to a practice course in engineering software with AI assistants; if the survey needs a binary, it leans exclude, but the use-oriented CLOs and permitted-AI assignment policy are genuine engineering-with-AI content.
