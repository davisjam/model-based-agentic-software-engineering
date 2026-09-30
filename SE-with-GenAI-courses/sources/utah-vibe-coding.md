# University of Utah — CS 3960 "Vibe Coding"

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator (the entire course is how to work effectively with AI coding agents to build and maintain complex software; AI use is mandatory on every assignment)

## Sources consulted
- https://github.com/utah-cs3960-sp26/syllabus — instructor GitHub course repo (org `utah-cs3960-sp26`; README, syllabus.md, lectures.md, hw1–hw5.md, writeup.md, llm-repl.py, slides/)
- https://raw.githubusercontent.com/utah-cs3960-sp26/syllabus/main/syllabus.md — full syllabus
- https://raw.githubusercontent.com/utah-cs3960-sp26/syllabus/main/lectures.md — lecture schedule + readings
- https://raw.githubusercontent.com/utah-cs3960-sp26/syllabus/main/hw1.md — Homework 1 spec
- https://raw.githubusercontent.com/utah-cs3960-sp26/syllabus/main/hw5.md — Homework 5 (self-directed final project) spec
- https://raw.githubusercontent.com/utah-cs3960-sp26/syllabus/main/writeup.md — instructor retrospective, "Lessons Learned from a Course on Vibe Coding" (Regehr & Panchekha), written after the Spring 2026 run
- Geng et al. 2026, arXiv:2608.05898 Table 1 (cites the syllabus.md URL above) — secondary locator only
- Note on repo state: the org slug is `sp26`, homework due dates run 23 Jan–17 Apr (Spring 2026), and lecture weeks start "Week of Jan 5" — the Spring 2026 offering; the README header now reads "Fall 2026," i.e., the repo is being carried forward to a re-offering, so some files may post-date the surveyed Spring instance. The retrospective (writeup.md) confirms the Spring 2026 run completed. Slides folder exists but individual decks were not inspected; hw2–hw4 not fetched.

## A. Explicit course content (quoted / cited)

### Identity
University of Utah · Kahlert School of Computing · CS 3960 · "Vibe Coding" · Spring 2026 · Instructors: John Regehr, Pavel Panchekha; TA Yumeng He · undergraduate (3960 = special-topics-level UG number; "Students are expected to be experienced programmers") · in-person lecture Mon/Wed 3:00–4:20pm, WEB L110. (syllabus.md)

### Stated learning objectives
From syllabus.md, "The goal of the class is to teach you how to work effectively with modern AI coding agents." By course completion, students will (quoted as listed):
- "Understand the basics of how AI coding agents work"
- "Understand how to establish an effective context for AI coding"
- "Understand how to develop an AI-focused testing approach"
- "Understand how to create modularity to scale AI coding"
- develop workflows leveraging both AI and human programmer strengths (paraphrase of final bullet as returned by fetch)

Course nature: "This is an experimental class, never taught before, on a rapidly shifting topic."

### Organizing sequence
Four visible lecture tracks (lectures.md), interleaved by week:
- **A-track (software engineering):** A1 Software Engineering; A2 Testing (reading: "Your job is to deliver code you have proven to work"); A4 Test Coverage; A5 Fuzzing; A6 Assertions (reading: QuickCheck paper); A7 Program Verification.
- **B-track (how models work):** B1 Next-token Prediction (reading: "The Bitter Lesson"; Markov-chain activity; optional: Shannon, "Attention is All You Need", Chinchilla); B2 Fine-tuning (Scaling Laws §1.1); B3 Tool use (reading: "How to Build an Agent").
- **C-track (agent workflows):** C1 Context Engineering (reading: "Context Engineering for Agents"); C2 Parallelizing Work (reading: "A Successful git Branching Model"); C3 Documentation (reading: "Harness engineering: leveraging Codex in an agent-first world"); Cn Tool outputs (reading: Toyota Production System; optional: Agile Manifesto).
- **D-track (case studies):** D1 "Claude C Compiler" (reading: "Building a C compiler with a team of parallel Claudes"; optional: "I Fuzzed, and Vibe Fixed, the Vibed C Compiler"); D2 "JustHTML and chardet" (readings: "How I wrote JustHTML using coding agents", porting articles, chardet relicensing discussion); D3–D8 unlabeled in current schedule.
Plus periodic in-class Demo days and HW1–HW5 due dates (23 Jan, 13 Feb, 6 Mar, 3 Apr, 17 Apr).

### Assignments and project structure
- Grading: "Grades will be 60% assignments, 30% activities, and 10% readings." (syllabus.md)
- "Assignments will build large, complex applications." "Most assignments will be individual---student plus AI---but some later ones might be done in groups."
- "Maintaining large software projects over time, without the AI breaking older features or making the code impossible to work with, is a major theme of the class."
- "AI tools make it easy to build brittle prototypes very quickly. What's hard is handling edge cases, dealing with interaction between features, and applying some taste to make sure the software works well."
- HW1 (hw1.md): build "a native, cross-platform text editor using the Qt framework in Python"; core editing features plus at least two advanced features (multiple cursors, syntax highlighting, find/replace, split views, jump-to-definition, etc.); testing with pytest; deliverables = GitHub repo, README release notes "organized by feature" explaining "what works/doesn't work, design decisions, architectural approach, and testing validation methods", three weekly releases (R1–R3), in-class demo. Graded on "in-class demo, the release notes, and based on the final product."
- Activities: in-class group work, "graded largely pass/fail on effort"; attendance "mandatory."
- Readings: graded via required GitHub comments; rationale: "No one has more than a year's experience with AI coding, so workflows and knowledge evolve and learning from others is key."
- HW5 (hw5.md): "self-directed project" started "from scratch as a fresh project," excluding recipe/marketplace/exercise/social apps; students must "Be appropriately ambitious" and consider what AI does well and poorly; any coding agent allowed ("whatever coding agent you want" — course provides Amp credits but permits testing Codex or Gemini); deliverables include a hand-written README with a proposal section (agentic-loop approach), weekly progress/agent-behavior sections, and a "4-5 minute YouTube video."
- As-run project arc per the instructor retrospective (writeup.md): "a text editor with three separate assignments (feature implementation; code review and testing; and performance optimization)," then "a physics simulation," then "a self-directed final project"; after each, a "demo day" where students "showed off what they'd built, answer some questions about it, and talk us through their design choices." Weekly: "1-2 reading assignments," graded by Claude Opus 4; lectures with a 20-minute in-class exercise.

### AI tools and agent frameworks used
- **Amp** (Sourcegraph's coding agent) is the class-standard tool: "Amp, Inc. has generously sponsored the class"; class workspace at ampcode.com/workspaces/utah-vibecode-2025. "AI use is allowed and, in fact, mandatory."
- Course-provided `llm-repl.py` demo script for the next-token-prediction unit.

### Readings
See Organizing sequence above; notable named readings: "The Bitter Lesson"; "Your job is to deliver code you have proven to work"; "How to Build an Agent"; "Context Engineering for Agents"; QuickCheck; "How to Misuse Code Coverage" (optional); "A Successful git Branching Model"; "Harness engineering: leveraging Codex in an agent-first world"; "Building a C compiler with a team of parallel Claudes"; Toyota Production System; optional classics (Mythical Man-Month, Code Complete 2e, Software Engineering at Google, The Fuzzing Book).

### Treatment of: conventional SE activities
Explicit lecture units on testing, test coverage, fuzzing, assertions/property-based testing, program verification, modularity/refactoring, documentation, git branching/parallel work; optional classic SE texts (see A-track). Topics list names "Modularity (interfaces, refactoring, equivalence, migration)" and "Workflows (debugging, refactoring, research)". (syllabus.md, lectures.md)

### Treatment of: human responsibility and judgment
- Assigned reading titles carry the stance verbatim: "AI Can Write Your Code. It Can't Do Your Job." (Lecture 00) and "Your job is to deliver code you have proven to work" (Lecture A2).
- "What's hard is ... applying some taste to make sure the software works well." (syllabus.md)
- The retrospective (writeup.md) makes the human-role question explicit design material: "What relationship to the code are we trying to promote? What relationship to the agent are we trying to promote?"; "We didn't want students to think of the agent as a 'magic genie'." Three candidate role models are named: the "manager" ("the student is responsible for code existing and working, but delegates actually writing to code to subordinate agents"), the "architect" ("the student writes a good specification (including tests, standards, formal methods, and so on) which the agent then implements"), and a "production engineer" vision ("This vision appeals to us, but was too abstract to students"). "[I]t is genuinely unclear what the role of programmers will be in the future."

### Treatment of: evaluation/verification of AI-produced work
A full testing arc aimed at AI-produced code: learning objective "Understand how to develop an AI-focused testing approach"; lecture units on Testing, Test Coverage, Fuzzing, Assertions (QuickCheck), Program Verification; HW release notes must explain "testing validation methods"; grading "focuses primarily on functionality; later assignments may emphasize test coverage or other metrics." (syllabus.md, lectures.md, hw1.md)

### Treatment of: persistent engineering knowledge beyond source code
- Documentation is a lecture unit (C3) with an agent-harness framing (reading: "Harness engineering: leveraging Codex in an agent-first world"; optional "Explaining Code using ASCII Art").
- Required release notes per feature (hw1.md) documenting design decisions and validation.
- Context engineering (C1) treats establishing "an effective context for AI coding" as a named skill.

### Treatment of: controls, constraints, governance, enforcement
- Process-level oversight via tool telemetry: "Amp records and makes available to instructors complete logs of all AI interactions. Instructors will examine those logs to prevent cheating. Absence of logged work will be grounds for failing the assignment or, depending on severity, the class as a whole." (syllabus.md)
- Cheating boundary drawn at prompts vs code: "Sharing or submitting another student's code or using another student's prompt is cheating. Submitting code found online is too, but using prompts found online is fine."
- Beyond academic-integrity logging and the testing/verification units, named "governance" or "controls" vocabulary: not evident in available materials.

### Instructor retrospective — outcomes evidence (writeup.md, quoted)
The post-course writeup records what the design produced:
- Curriculum was "half focused on AI, and half on software engineering, with a particular emphasis on testing"; the AI half explained "how agents work, mechanically, so they would seem less like magic"; deliberately "no math, so there wasn't any gradient descent" and no "prompting tricks or specific models or specific pitfalls."
- Comprehension gap: "students would typically try to understand the AI-written code by asking the AI"; on demo-day probes students would "quite visibly have no idea where that was even defined." "The traditional CS curriculum doesn't really teach *reading* code" — they propose explicitly teaching "code reading, including techniques like grepping for related abstractions, traversing callers and callees."
- Verification gap: asked for 100% coverage, tests would "cheat by, for example, triggering a find-replace without checking its results"; students "didn't think much about test oracles and, correspondingly, ended up with weak ones"; "Testing correspondingly didn't make the editors much less buggy."
- Floor-raising: "all students produced working editors and simulators," where pre-AI "that would have resulted in all but a few students failing to write one" — yet products were "ugly, buggy, and hard to use" because students left "design decisions to the AI," and when defects (e.g., physics objects "vibrating rapidly when in contact with walls, or hanging in mid-air") were pointed out, "students would often say they hadn't noticed the issues."
- Assessment problem: "Reading and grading AI-written code makes no sense"; "AI code is tasteless, but grading taste is hard."
- Cost: "Agentic coding is expensive"; students burned "hundreds of dollars in tokens" leaving prompt loops running ("teaching prompt loops. This specific technique is now obsolete").
- Conclusion: "students both need and value software engineering, that these skills are more important than ever before, and that they can be taught"; "A scoped-down but more-rigorous course may do better."

## B. Surveyor notes (interpretation, labeled)
- Coverage gaps: hw2–hw4 not fetched; slide decks not inspected; D3–D8 lecture topics unpublished ("no schedule is planned up front"). Repo mixes the completed Spring 2026 instance with forward edits for a Fall 2026 re-offering (README header), so file-level provenance per term is imperfect.
- Interpretation: the course is organized as four interleaved strands — (1) classic SE quality techniques (testing → coverage → fuzzing → assertions → verification) repositioned as the human's lever over agent output, (2) a minimal mental model of LLMs/agents, (3) agent-workflow craft (context, parallelism, documentation, tool output hygiene), and (4) practitioner case studies of large agent-built systems. The through-line is sustained maintainability of a growing codebase under mandatory agent use, with instructor-visible AI interaction logs as the enforcement substrate. This is squarely "engineering software WITH AI" — a core comparator.
- The retrospective is unusually candid outcome data for this survey: it names the human-role question (manager / architect / production engineer) as the open design axis, and documents that the verification and code-reading skills the course targeted are precisely where students fell short (weak oracles, AI-mediated comprehension, unnoticed defects). Interpretation: strong corroboration that this course's organizing problem is oversight-of-agent-output, not tool operation.
