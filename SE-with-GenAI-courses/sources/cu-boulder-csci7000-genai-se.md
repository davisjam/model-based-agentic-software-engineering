# CU Boulder — CSCI 7000-11 "GenAI-powered Software Engineering" (Fall 2025)

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator (a graduate seminar squarely about GenAI *applied to* software engineering practice — refactoring, migration, testing, repair, maintenance, developer-agent collaboration — with hands-on use of GenAI on SE tasks; not about constructing AI systems)

## Sources consulted
- https://danny.cs.colorado.edu/courses/csci7000-011_F25/index.html — official course site with full session-by-session schedule and reading list
- https://danny.cs.colorado.edu/courses/csci7000-011_F25/syllabus.html — syllabus subpage (grading, policies)
- https://danny.cs.colorado.edu/courses/csci7000-011_F25/researchProject.html — research-project requirements
- https://danny.cs.colorado.edu/courses/csci7000-011_F25/paperCritiques.html — paper-critique assignment spec
- Other linked subpages exist (paperPresentation.html, projectProposal.html, projectTeams.html, milestone1–4.html, finalProject.html) — not all fetched; critiques via Canvas and class communication via Piazza are behind login.

## A. Explicit course content (quoted / cited)

### Identity
- University of Colorado Boulder · Computer Science · CSCI 7000-11 (special topics, graduate) · "GenAI-powered Software Engineering" · Fall 2025 · Instructor: Prof. Danny Dig · Tue/Thu 2:00–3:15 PM, remote via Zoom with three in-person sessions (Aug 21, mid-semester, Dec 2 or 4, DLC 1B70) · seminar format, no final exam.
- Audience statement (as extracted): "not" introductory — "assumes you are a competent software engineer already, looking into how you can augment your current skills to include GenAI supported software development." Prerequisites: basic knowledge of CS undergrad classes including "software engineering, programming languages, systems, and ML/AI."

### Stated learning objectives
Purpose: "expose students to seminal topics and recent trends in the field of GenAI for Software Engineering"; framing: "software development is undergoing a profound transformation as GenAI becomes increasingly integrated into development practices." Students will "(i) understand the capabilities and limitations of GenAI systems deployed in production or in research; (ii) Learn to critically assess AI-assisted development workflows; (iii) Gain hands-on experience using GenAI in tasks such as testing, debugging, code synthesis, and refactoring."
Enumerated aims (verbatim, per course page):
- "expand student's knowledge more broadly about GenAI-based Software Engineering research & practice through reading research papers and industry surveys"
- "develop critical thinking abilities by being able to assess the quality of published research and pose new research questions"
- "practice giving scientific presentations and teaching others"
- "engage in active learning activities in class, such as student-guided discussions on research and applications for GenAI in Software Engineering"
- "practice developing a research or novel-industrial software development project through all its stages: formulating a research problem, posing research questions, gathering related work, designing a solution, evaluating the solution empirically, writing a research paper"
- "practice engaging in dialogue with thought leaders in GenAI Software Engineering"
- "have fun learning"

### Organizing sequence
Session-by-session (dates + paper titles as published):
- 08/21 Course Introduction ("Read an Engineering Research paper", Griswold)
- 08/26 + 08/28 LLMs for SE surveys — "Large Language Models for Software Engineering: A Systematic Literature Review" (Hou et al., TOSEM 2024); "Large Language Models for Software Engineering: Survey and Open Problems" (Fan et al., ICSE 2023)
- 09/02 Code change automation/refactoring — "Unprecedented Code Change Automation: The Fusion of LLMs and Transformation by Example" (Dilhara et al., FSE'24); "Next-Generation Refactoring: Combining LLM Insights and IDE Capabilities for Extract Method" (Pomian et al., ICSME'24)
- 09/04 "Together We Are Better: LLM, IDE and Semantic Embedding to Assist Move Method Refactoring" (Bellur et al., ICSME'25)
- 09/09 Keynote David Lo — "Code, Critique, Cure: Advancing LLM Reasoning for AI-Augmented Software Maintenance"
- 09/11 Project pitches; 09/16 + 09/18 Project Bazaar / team formation (in person)
- 09/23 "Migrating Code At Scale With LLMs At Google" (Ziftci et al., FSE'25); "TestSpark: IntelliJ IDEA's Ultimate Test Generation Companion" (Sapozhnikov et al., ICSE'24)
- 09/25 Milestone 1
- 09/30 "A Taxonomy of Inefficiencies in LLM-Generated Code" (Abbassi et al., ICSME'25); "Can LLMs Update API Documentation?" (Lee et al., ICSME'25)
- 10/02 "AutoCodeRover: Autonomous program improvement" (Zhang et al., ISSTA'24); "RepairAgent: An Autonomous, LLM-Based Agent for Program Repair" (Bouzenia et al., ICSE'25)
- 10/07 "Using AI-Based Coding Assistants in Practice: State of Affairs, Perceptions, and Ways Forward" (Sergeyuk et al., ICSME'25); "The Impact of Fine-tuning Large Language Models on Automated Program Repair" (Machacek et al., ICSME'25)
- 10/14 "Why AI Agents Still Need You: Findings from Developer-Agent Collaborations in the Wild" (Kumar et al., ASE'25); "An Empirical Study on the Potential of LLMs in Automated Software Refactoring" (Liu et al., JASE 2025)
- 10/16 Milestone 2
- 10/21 "RefactoringMiner 2.0" (Tsantallis et al., TSE 2020); "An LLM-based multi-agent framework for agile effort estimation" (Bui et al., ASE'25)
- 10/23 "MANTRA: Enhancing Automated Method-Level Refactoring with Contextual RAG and Multi-Agent LLM Collaboration" (Xu et al., 2025); "Backdoors in Code Summarizers: How Bad Is It?" (Wang et al., ASE'25)
- 10/28 "Prompting Matters: Assessing the Effect of Prompting Techniques on LLM-Generated Class Code" (Yuen et al., ICSME'25)
- 10/30 "One-to-One or One-to-Many? Suggesting Extract Class Refactoring Opportunities…" (Cui et al., ISSTA'24); "Hierarchical Knowledge Injection for Improving LLM-based Program Repair" (Ehsani et al., ASE'25)
- 11/04 "NIODebugger: A Novel Approach to Repair Non-Idempotent-Outcome Tests with LLM-Based Agent" (Ke et al., ICSE'25); "iSMELL: Assembling LLMs with Expert Toolsets for Code Smell Detection and Refactoring" (Wu et al., ASE'24)
- 11/06 Milestone 3
- 11/11 Industrial keynote Giuseppe Raffa (Intel Labs) — "From Tools to Teammates: Generative AI as Collaborative Partners in Industrial Workflows"
- 11/13 Agentic Refactoring
- 11/18 Industrial keynote Ameya Ketkar (Gitar) — "The Landscape of AI-assisted Automated Software Engineering"
- 11/20 Industrial keynote Haifeng Chen (NEC Labs) — "Advancing LLM Intelligence: Uniting Internal Reasoning and External Tool Interactions"
- 12/02 Milestone 4; 12/04 Course Summary (in person); 12/07 Final Project due; no final exam.

### Assignments and project structure
- Grading (syllabus): Class participation and discussion 10% (individual) · Paper Critiques 20% (individual) · Paper Presentation 20% (individual) · Research Project 50% (team).
- Paper critiques: one page, due 5 pm MST the day before class; five components — "What I liked" (problem/idea/evaluation, viability, impact), "What I disliked" (flaws), "Future directions", "Open questions", "Summary"; must "add value and insight beyond what is already in the paper" and cannot "directly copy the abstract, introduction, conclusion or any other part". Alternative: a "Tool Experience Report" from hands-on use of the paper's software (user experience, strengths, weaknesses, practical impact, recommendations).
- Research project: semester-long, teams of 3–4; "research-oriented" or "novel-industrial" (the latter for Professional Masters students); research projects "advance the science and practice of GenAI in Software Engineering"; industrial projects "discover new insights from applying GenAI established knowledge (e.g., frameworks, principles, practices) to a Software Engineering task"; any methodology — "analytic, argumentative, defining, compare/contrast, interpretive, experimental, or survey"; must be non-proprietary and "able to be shared with reviewers and the class"; deliverables: proposal (09/11), milestones 1–4, final project (12/07) written as a research paper.
- Policies: "Attendance is mandatory. Five or more unexcused absences will result in failure of the course." No-laptop policy during in-person sessions. Communication via Piazza.

### AI tools and agent frameworks used
- The objectives commit to "hands-on experience using GenAI in tasks such as testing, debugging, code synthesis, and refactoring," and the critique alternative (Tool Experience Report) has students run tools from the papers (e.g., AutoCodeRover, RepairAgent, TestSpark, RefactoringMiner-adjacent tooling). A specific mandated tool stack: not evident in available materials.

### Readings
- Full dated reading list above; anchored by two survey papers (Hou et al.; Fan et al.) then ~2 recent venue papers per session (FSE/ICSE/ISSTA/ICSME/ASE/TSE/TOSEM, 2024–2025 vintage).

### Treatment of: conventional SE activities
- The syllabus is organized around maintenance-side SE: refactoring (extract method, move method, extract class, code smells, agentic refactoring), large-scale code migration, test generation, test repair, program repair, API documentation, effort estimation, code summarization — each treated via current research plus the instructor's refactoring-research lineage (RefactoringMiner).

### Treatment of: human responsibility and judgment
- Explicit objective: "Learn to critically assess AI-assisted development workflows"; assigned papers foreground the human side — "Why AI Agents Still Need You: Findings from Developer-Agent Collaborations in the Wild"; "Using AI-Based Coding Assistants in Practice: State of Affairs, Perceptions, and Ways Forward". A dedicated ethics/responsibility unit: not evident in available materials.

### Treatment of: evaluation/verification of AI-produced work
- Present through the reading list rather than a named unit: "A Taxonomy of Inefficiencies in LLM-Generated Code"; "Prompting Matters: Assessing the Effect of Prompting Techniques on LLM-Generated Class Code"; "Backdoors in Code Summarizers: How Bad Is It?" (security of AI outputs); empirical-evaluation skills are also a stated project-stage objective ("evaluating the solution empirically").

### Treatment of: persistent engineering knowledge beyond source code
- "Can LLMs Update API Documentation?" (09/30) is the one observable documentation-focused session. Otherwise not evident in available materials.

### Treatment of: controls, constraints, governance, enforcement
- Not evident in available materials as course content (the security-of-AI-outputs paper on 10/23 is the nearest item); course-level AI-use policy for student work is also not evident (syllabus references only a "standard ethics code for CS courses").

## B. Surveyor notes (interpretation, labeled)
- **Coverage gaps:** several subpages (paperPresentation, projectProposal, milestones) not fetched; Canvas/Piazza content non-public; the 11/13 "Agentic Refactoring" session lists no papers on the fetched snapshot.
- **Organizing logic (interpretation):** a research seminar with an unusually strong practice anchor: the topic spine is *software maintenance and evolution* (the instructor's research area — refactoring, migration, repair) with GenAI as the new instrument, bracketed by systematic surveys at the start and three industrial keynotes near the end. The critique-or-tool-experience-report option and the "novel-industrial" project track deliberately admit practitioner-mode engagement alongside research-mode. Human-agent collaboration appears as studied content, not just method.
- **Level of evidence:** rich — full dated schedule with complete paper list, verbatim objectives, grading, and assignment specs across multiple public subpages.
