# UIUC — CS598LMZ "Software Quality Assurance with Generative AI" (Spring 2025)

**Gathered:** 2026-09-30 · **Preliminary class:** mixed (Modules I & III center on LLMs/agents *performing* SE quality-assurance work — fuzzing, unit testing, repair, debugging; Modules II & IV are substantially about the code LLMs/agents themselves — their architectures, training, benchmarking, and QA *of* them)

## Sources consulted
- https://lingming.cs.illinois.edu/courses/cs598lmz-s25.html — official course page/syllabus with full lecture-by-lecture schedule and reading list (Spring 2025)
- https://lingming.cs.illinois.edu/teach.html — instructor teaching index (confirms Spring 2025 and Spring 2024 offerings; a prior Spring 2024 version exists at courses/cs598lmz-s24.html)
- Not publicly reachable: homework assignments ("released on Campuswire"), Campuswire forum, and submitted project materials are behind login.

## A. Explicit course content (quoted / cited)

### Identity
- University of Illinois Urbana-Champaign · Computer Science · CS598LMZ · "Software Quality Assurance with Generative AI" · Spring 2025 · Instructor: Lingming Zhang; TA: Yinlin Deng · Tue/Thu 9:30–10:45 AM, 4039 Campus Instructional Facility · graduate research seminar (discussion-based; paper presentations + course project; no exams).

### Stated learning objectives
- No enumerated objectives list. Course description (course page): opening — "Modern Large Language Models (LLMs) like ChatGPT have demonstrated remarkable capabilities across diverse fields, notably in natural language processing and programming." Scope statement — the course covers "foundational principles and cutting-edge research on software quality assurance, recent representative LLMs for code, emerging techniques on leveraging LLMs/Agents for software quality assurance, as well as innovative methods targeting quality assurance of LLMs/Agents themselves."
- Prerequisites (as extracted): research background in programming languages / formal methods / software engineering / NLP / ML; Python proficiency; NLP/ML coursework; strong algorithms foundation.

### Organizing sequence
Four modules, lecture-by-lecture (schedule marked tentative on the page):
- **Module I: Background and Basics** — 01/21 Course Introduction; 01/23+01/28 Program Analysis Basics (I)/(II); 01/30 LLM Basics; 02/04 Software Testing; 02/06 Automated Debugging.
- **Module II: Code LLMs** — 02/11 Encoder-only Models; 02/13 Encoder-Decoder Models; 02/18 Decoder-only Models; 02/20 Project Proposal Presentations; 02/25 Foundation Models; 02/27 Instruction Tuning; 03/04 Inference-Time Scaling.
- **Module III: LLMs/Agents for Software QA** — 03/06 Fuzz Testing I; 03/11 Fuzz Testing II; 03/13 Unit Testing; 03/25 Program Repair; 03/27 Automated Debugging; 04/01–03 Project Midterm Presentations; 04/08 Program Analysis; 04/10 AI Software Engineers.
- **Module IV: Software QA for Code LLMs/Agents** — 04/15 Code Benchmarking; 04/17 Agent Benchmarking; 04/22 Code Security; 04/24 Agent Security; 04/29–05/01 Project Final Presentations; 05/06 System Reliability.

### Assignments and project structure
- Grading: "Homework Assignments: 20% · Paper Presentation: 20% · Class Participation: 10% · Course Project: 50% (Proposal 5%, Midterm 20%, Final 25%)."
- Homework: "There will be five assignments released on Campuswire ('Assignments' page). Please make sure that you follow the instructions and deadlines."
- Paper presentation: students "select five classes for presentation by January 31"; initial slides due one week before for feedback; final slides 48 hours before lecture; "You should not directly reuse the original slides from the authors."
- Project: teams of 3–5; proposal / midterm / final report + presentation phases; teams selecting their own ideas must meet the instructor by Feb 10; "Students should use GitHub to host code and development history"; direction prompts provided, creative proposals encouraged.
- Discussion format: students read assigned papers before class and respond to instructor questions about "problem statements, solutions, evaluation methods, and limitations" (as extracted).

### AI tools and agent frameworks used
- Studied via the literature (not as a mandated toolchain): SWE-agent, Agentless, AutoCodeRover (04/10 "AI Software Engineers"); code LLMs across Module II (CodeBERT, GraphCodeBERT, CodeT5/T5+, AlphaCode, CodeGen, StarCoder 2, Code Llama, Qwen2.5-Coder, WizardCoder, Magicoder, OpenCodeInterpreter, DeepSeek-R1). A specific in-class tool stack: not evident in available materials.

### Readings
Full per-session paper titles are published; representative verbatim titles:
- Testing/fuzzing: "Large Language Models are Zero-Shot Fuzzers: Fuzzing Deep-Learning Libraries via Large Language Models"; "Universal Fuzzing via Large Language Models"; "KernelGPT: Enhanced Kernel Fuzzing via Large Language Models"; "White-box Compiler Fuzzing Empowered by Large Language Models"; "No More Manual Tests? Evaluating and Improving ChatGPT for Unit Test Generation"; "CodaMOSA: Escaping Coverage Plateaus in Test Generation with Pre-trained Large Language Models".
- Repair/debugging: "Less Training, More Repairing Please: Revisiting Automated Program Repair via Zero-shot Learning"; "Keep the Conversation Going: Fixing 162 out of 337 bugs for $0.42 each using ChatGPT"; "Teaching Large Language Models to Self-Debug"; "Copiloting the Copilots: Fusing Large Language Models with Completion Engines for Automated Program Repair".
- Benchmarking/evaluation: "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?"; "LiveCodeBench: Holistic and Contamination Free Evaluation of Large Language Models for Code"; "Is Your Code Generated by ChatGPT Really Correct? Rigorous Evaluation of Large Language Models for Code Generation"; "MLE-bench: Evaluating Machine Learning Agents on Machine Learning Engineering".
- Security/safety of AI-written code and agents: "Asleep at the Keyboard? Assessing the Security of GitHub Copilot's Code Contributions"; "Lost at C: A User Study on the Security Implications of Large Language Model Code Assistants"; "RedCode: Risky Code Execution and Generation Benchmark for Code Agents"; "Agent-SafetyBench: Evaluating the Safety of LLM Agents"; "R-Judge: Benchmarking Safety Risk Awareness for LLM Agents".
- Classic SE grounding (Module I): "Feedback-directed Random Test Generation"; "Finding and Understanding Bugs in C Compilers"; "Fuzzing with Code Fragments"; "Compiler Validation via Equivalence Modulo Inputs"; "A Survey on Software Fault Localization".

### Treatment of: conventional SE activities
- Deep and explicit on the QA slice of SE: program analysis, software testing, fuzzing, unit testing, fault localization, program repair, debugging, code security — each with dedicated sessions grounded first in pre-LLM classics (Module I), then LLM-era counterparts (Module III). Requirements/design/architecture/process activities: not evident in available materials.

### Treatment of: human responsibility and judgment
- Not evident in available materials as an explicit theme; the pedagogy (students critique problem statements, solutions, "evaluation methods, and limitations" of each paper) exercises research judgment rather than practitioner responsibility.

### Treatment of: evaluation/verification of AI-produced work
- A full module (Module IV, "Software QA for Code LLMs/Agents") is devoted to evaluating AI systems and their outputs: code benchmarking, agent benchmarking, correctness evaluation ("Is Your Code Generated by ChatGPT Really Correct?..."), security of AI-generated code, agent safety, and system reliability of the ML stack itself (NNSmith, NeuRI, autodiff fuzzing).

### Treatment of: persistent engineering knowledge beyond source code
- Not evident in available materials (project requires GitHub-hosted "code and development history," which is the closest observable artifact).

### Treatment of: controls, constraints, governance, enforcement
- Adversarial/safety benchmarking of code LLMs and agents (04/22, 04/24 sessions) is the closest published content — evaluation-side controls on AI systems. Governance of AI-assisted development practice: not evident in available materials.

## B. Surveyor notes (interpretation, labeled)
- **Coverage gaps:** homework content is behind Campuswire; no lecture slides public; the s24 sibling page suggests a stable year-over-year design but was not relied on here.
- **Organizing logic (interpretation):** a symmetric two-way research seminar — "GenAI for QA" and "QA for GenAI" — scaffolded by a deliberate pre-LLM canon (Module I teaches classic testing/analysis/repair first, so LLM-era papers are read against non-AI baselines) and a model-literacy module (Module II) so students understand the instrument before its applications. The pedagogy is research-apprenticeship: presentations + a publication-shaped team project.
- **Classification note (interpretation):** "mixed" because roughly half the syllabus (Modules II and IV) is about the AI systems themselves (architecture, training, benchmarking, safety) rather than about doing software engineering with AI; and even the AI-for-SE half studies *automated* QA techniques rather than AI-assisted human practice.
- **Level of evidence:** rich — full dated schedule, complete reading list, grading, and project mechanics are public.
