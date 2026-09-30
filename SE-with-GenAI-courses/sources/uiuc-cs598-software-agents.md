# UIUC — CS598 "Software Engineering with LLM Agents" (Spring 2026)

**Gathered:** 2026-09-30 · **Preliminary class:** mixed, leaning exclude (Module II covers agents doing SE work, but Modules III–IV — roughly half the syllabus — are about *constructing and training* coding agents: benchmarks, training environments, synthetic data, RL)

## Sources consulted
- https://github.com/lingming/software-agents — course repository / README syllabus (full dated schedule + reading list)
- https://lingming.cs.illinois.edu/teach.html — instructor teaching index; lists "CS598: Software Engineering with LLM Agents — Spring 2026" pointing at the GitHub repo, distinct from "CS598: Software Quality Assurance with Generative AI" (Spring 2024/2025)
- Not publicly reachable: homework ("Released via Campuswire ('Assignments' page)"), forum discussions, project submissions.

## A. Explicit course content (quoted / cited)

### Identity
- University of Illinois Urbana-Champaign · Computer Science · CS598 (listed under Zhang's LMZ topic sequence) · "Software Engineering with LLM Agents" · Spring 2026 · Instructor: Lingming Zhang; TA: Yuxiang Wei · Tue/Thu 9:30–10:45 AM, CIF 3025 · graduate research seminar. Distinct-course check requested by the survey: **confirmed distinct** from the Spring 2025 "Software Quality Assurance with Generative AI" — separate title, separate TA (Yuxiang Wei vs. Yinlin Deng), separate syllabus/repo, listed separately on the instructor's teaching index.
- Term note: the README schedule runs 01/20–05/05 with Tue/Thu dates matching the 2026 calendar (01/20/2026 is a Tuesday), and the teaching index labels it Spring 2026; one fetch of the README inferred "Spring 2025" from bare dates — the 2026 dating is the corroborated one, and the reading list (Kimi K2, Qwen3-Coder-Next, SWE-Bench Pro) is 2025-vintage, consistent with a Spring 2026 offering.

### Stated learning objectives
- No enumerated objectives list. Course description (README, verbatim): "Modern Large Language Models (LLMs) and agents have demonstrated remarkable capabilities across diverse fields, with software engineering as one of their most successful applications. This course dives deep into the intersection of LLM agents and software engineering, exploring how recent advances in generative AI can substantially transform the way people build and maintain software systems." Also described as "a research-driven course targeting students interested in research."
- Prerequisites (as extracted): research background in PL/formal methods/SE or NLP/ML; Python proficiency; NLP/ML coursework; strong algorithms background.

### Organizing sequence
Four modules, class-by-class (paper titles verbatim; "Additional" marks optional readings):
- **Module I: Background and Basics** — 01/20 Course Intro ("How to read a research paper?", presentation guide); 01/22 SE basics (I) (compilers text, "Introduction to Software Testing"); 01/27 SE basics (II) ("Feedback-directed Random Test Generation", "Finding and Understanding Bugs in C Compilers", "Fuzzing with Code Fragments", "Compiler Validation via Equivalence Modulo Inputs"); 01/29 LLM basics ("Attention Is All You Need", "Chain-of-Thought Prompting…", "Training language models to follow instructions with human feedback", "ReAct: Synergizing Reasoning and Acting in Language Models"); 02/03 Software Testing with LLMs; 02/05 Software Debugging with LLMs.
- **Module II: Software Engineering Agents** — 02/10 Coding agents ("SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering", "OpenHands: An Open Platform for AI Software Developers as Generalist Agents"); 02/12 Coding agents with SE insights ("AutoCodeRover: Autonomous Program Improvement", "Agentless: Demystifying LLM-based Software Engineering Agents"); 02/17 Coding agents with memory supports ("EXPEREPAIR: Dual-Memory Enhanced LLM-based Repository-Level Program Repair", "Confucius Code Agent…"; additional: A-MEM, Mem0, Memory-R1, Recursive Language Models); 02/19 Proposal Presentations; 02/24 Coding agents for scientific discovery ("AlphaEvolve…", "ShinkaEvolve…"); 02/26 + 03/03 Self-improving coding agents (I)/(II) ("A Self-Improving Coding Agent", "Darwin Godel Machine…", "Automated Design of Agentic Systems", "Live-SWE-agent: Can Software Engineering Agents Self-Evolve on the Fly?", "Huxley-Gödel Machine…", "GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning").
- **Module III: Benchmarks and Datasets** — 03/05 Software benchmarks ("SWE-bench…", "SWE-Bench Pro…", "SEC-bench…"); 03/10 Multilingual benchmarks (Multi-SWE-bench, SWE-PolyBench); 03/12 Automated benchmark construction ("SWE-bench Goes Live!", "SWE-rebench…"); 03/24 Environments for training coding agents (SWE-Gym, R2E-Gym, SWE-Universe); 03/26 + 04/07 Synthetic training data generation (I)/(II) (SWE-smith, SWE-Synth, SERA, SWE-Mirror, BugPilot); 03/31–04/02 Project Midterm Presentations.
- **Module IV: Training Software Agents with RL** — 04/09 RL on simple code and math data (DeepSeek-R1, Kimi k1.5); 04/14 + 04/16 Scaling RL to real-world software data (SWE-RL, Kimi-Dev, DeepSWE, SWE-RM, MiniMax-M1); 04/21 Training LLMs with agentic intelligence (CWM, "Kimi K2: Open Agentic Intelligence", Qwen3-Coder-Next); 04/23 Training superintelligent coding agents ("Toward Training Superintelligent Software Agents through Self-Play SWE-RL", "Self-Adapting Language Models"); 04/28–04/30 Project Final Presentations; 05/05 Invited Speaker: Yinfang Chen.

### Assignments and project structure
- Grading: Homework 20% · Paper Presentation 20% · Class Participation 10% · Course Project 50% (proposal 5%, midterm 20%, final 25%). No exams.
- Homework: "Released via Campuswire ('Assignments' page). No late submissions without prior approval/documentation."
- Paper presentation: "select at least five classes you would like to present by Jan. 30th"; slides due one week prior for feedback; final version 48 hours before lecture.
- Project: groups of 3–5; teams with original ideas must "meet with Lingming before Feb. 9th to discuss your proposal"; proposal → midterm → final report/presentation.

### AI tools and agent frameworks used
- Studied via the literature: SWE-agent, OpenHands, AutoCodeRover, Agentless, Trae Agent, AlphaEvolve, plus training frameworks/benchmarks above. A mandated hands-on tool stack for coursework: not evident in available materials.

### Readings
- 40+ assigned papers as listed in the Organizing sequence above (README is itself the reading list; titles quoted there verbatim).

### Treatment of: conventional SE activities
- Module I grounds students in classic testing, fuzzing, compilers, and debugging literature before any LLM content; SE tasks recur throughout as the *target domain* of agents (issue resolution, repository-level repair, test generation). Human-practiced SE activities (requirements, design, code review, process): not evident in available materials.

### Treatment of: human responsibility and judgment
- Not evident in available materials.

### Treatment of: evaluation/verification of AI-produced work
- An entire module (III) on benchmarks, verifiers, and evaluation: SWE-bench family, "SWE-bench Verified", contamination-aware evaluation ("SWE-rebench: An Automated Pipeline for Task Collection and Decontaminated Evaluation of Software Engineering Agents"), "Training Software Engineering Agents and Verifiers with SWE-Gym", execution-free reward models ("SWE-RM: Execution-free Feedback For Software Engineering Agents"), and SEC-bench for security tasks. The framing is benchmarking/verifying *agents*, not verifying AI output inside a human workflow.

### Treatment of: persistent engineering knowledge beyond source code
- Agent memory systems appear as a technical topic (02/17: dual-memory repair, agentic memory, Mem0, Memory-R1) — persistent knowledge *for agents*. Team-side engineering knowledge (docs, ADRs, conventions): not evident in available materials.

### Treatment of: controls, constraints, governance, enforcement
- Closest published content: SEC-bench (security tasks) and verifier/reward-model papers. Governance of AI-assisted development practice: not evident in available materials.

## B. Surveyor notes (interpretation, labeled)
- **Coverage gaps:** homework content behind Campuswire; no slides public; schedule marked tentative in the repo's genre (research-seminar READMEs typically evolve during the term).
- **Organizing logic (interpretation):** a frontier-tracking research seminar organized as a pipeline: what agents are (Module II) → how they are measured (Module III) → how they are trained (Module IV), bootstrapped by a classic-SE + LLM-fundamentals on-ramp (Module I). The arc runs deliberately toward agent *construction* — self-improving agents, training environments, RL — which is why I lean exclude despite the SE framing: the course's center of gravity is building/evaluating/training AI systems whose domain is software engineering, not teaching humans to engineer software with AI.
- **Level of evidence:** rich — complete dated schedule with full reading list, grading, and project mechanics public in the course repo.
