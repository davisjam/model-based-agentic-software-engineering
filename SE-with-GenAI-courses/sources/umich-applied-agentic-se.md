# University of Michigan — EECS 498-016 "Applied Agentic Software Engineering" (AASE)

**Gathered:** 2026-09-30 · **Preliminary class:** mixed (Phase 1 is squarely engineering-with-agents
— operate a coding agent, diagnose its failures, verify its output — but Phases 2–3, carrying ~72%
of the grade, have students construct their own agent/assistant systems from raw LLM APIs, which is
building-AI-systems content, albeit aimed at understanding the tools they engineer with)

## Sources consulted
- https://eecs498-aase.github.io/index.html — course site home (cited as course URL in Geng et al. 2026, arXiv:2608.05898, Table 1)
- https://eecs498-aase.github.io/syllabus.html — full syllabus (objectives, phases, grading, policies)
- https://eecs498-aase.github.io/faq.html — FAQ (philosophy, prerequisites, governance)
- https://github.com/eecs498-aase — course GitHub org (linked from site; not fetched in depth)
- Site also links a "Podcast" section (podcast/) — not fetched.
- Ed platform (course communication) is enrollment-gated; PrairieLearn evaluation platform is login-gated.

## A. Explicit course content (quoted / cited)

### Identity
- University of Michigan, EECS (CSE); EECS 498-016, special topics technical elective, 4 credits
- Title: "Applied Agentic Software Engineering (AASE)"
- Term: Fall 2026 (started Aug 31, 2026); Tue+Thu 3:00–4:30 PM lecture; 2-hour Mon or Tue lab section
- Instructor: Marcus Darden; GSIs Rafe Symonds, Zilin Wang; IA Rushil Kagithala; staff email eecs-aase-staff@umich.edu
- Level: upper-division undergraduate (EECS 281 prerequisite); "Assessment: Projects, labs, demos (no exams)"

### Stated learning objectives
Verbatim from the syllabus — students will be able to:
1. "Drive an AI coding tool effectively against a permitted model on a compatible endpoint, and reason about failures with the Big Three: context, model, prompt"
2. "Specify and build a pair-programmer from a specification, with your own endpoint client, architecture, and tests"
3. "Build an autonomous agent: real tool use, an approval layer, a loop with stop conditions, and an eval suite that measures it"
4. "Measure and harden an agent: edit formats, prompting the harness, permission policy, context management, regression gates"
5. "Design and ship a working assistant: persistent memory, design-first method, a webserver, and a channel beyond the terminal"
FAQ framing: the course is "Building software with AI agents, treated as a serious engineering discipline"; the home page motto: "drive one, take it apart, build one worth keeping."

### Organizing sequence
Three phases over 15 weeks:
- **Phase 1 "Apply" (Weeks 1–6, 18%):** six lectures; use Aider with small local models to build a pair-programmer, "starting with guided lessons and progressing to independent design and implementation." Deliverable: "Fully functional pair-programmer with YAML configuration" (due Oct 6).
- **Phase 2 "Analyze" (Weeks 4–7, 22.5%):** eight lectures on direct LLM API calls and agent-loop construction; "Take the human out of the loop" by implementing tool layers, "an approval layer, an autonomous loop with stop conditions," and eval suites. Deliverable: Agent v0 with stop conditions and evaluation suite.
- **Phase 3 "Create" (Weeks 8–15, 49.5%):** fourteen lectures; build "a wiki...sessions and memory," harden approval systems, integrate into a deployment-ready assistant with a webserver and "a channel beyond the terminal." Deliverable: showcase presentation (Dec 10).
Named week topics (verbatim where captured): Week 10 "Permission Policy and How It Fails"; Week 11 "Harden the approval layer you built in week 5" and "A Repository That Tries to Prompt-Inject Your Agent"; also "Context Management and Compaction," "Sessions and Memory," "Testing Your Own Agent; Regression Gates."

### Assignments and project structure
- Apply Build rubric: "50% specification and design, 50% implementation and tests"; spec includes "requirements...architecture/interfaces...diagrams...specs before code"; implementation graded on "functional correctness...custom test cases, failure-path tests, end-to-end runs and live evidence."
- Analyze deliverable: "an eval suite that measures all of it" with "at least eight tasks, each run at least three times, reported as pass rates," culminating in "a teardown report on what your agent still cannot do."
- Create: staged "baseline gates" covering "wiki, skills, hardened agent" before final submission.
- Three graded in-person hackathons; final demos require explaining "design decisions," answering "technical questions," presenting "eval results and the cost report."
- Grading: Administrative 10% (attendance; "70% attendance earns full credit," 8-lecture + 3-lab buffer); Apply 18%; Analyze 22.5%; Create 49.5%. "No late days and no redo periods. Work is due when it is due." Projects lose "10% per calendar day, up to 3 days; no credit after that."

### AI tools and agent frameworks used
- Aider ("an open-source AI pair-programming CLI" — chosen because "it makes context, model, and prompt visible and controllable")
- Ollama (local model serving); Qwen3.5:9b primary model — "Stage 1 uses Aider with qwen3.5:4b or qwen3.5:9b"; "Other models require a published policy amendment."
- Python, Git, GitHub, pytest; PrairieLearn for evaluations
- "No textbook, API fees, or subscriptions required. All software runs on standard laptops or CAEN lab systems."
- FAQ on later phases: "the tool you use most is the one you wrote," avoiding vendor lock-in.

### Readings
"No textbook" — a formal reading list is not evident in available materials.

### Treatment of: conventional SE activities
- Spec-first discipline: rubric weight "50% specification and design"; "specs before code"; requirements, architecture/interfaces, diagrams as graded artifacts.
- Testing: "custom test cases, failure-path tests, end-to-end runs"; regression gates as a named topic; pytest in the stack.
- FAQ positioning vs traditional SE: the course "builds on" traditional software engineering by teaching students to "direct AI agents that write code, and to build the systems those agents run on."

### Treatment of: human responsibility and judgment
- "AI use is **required** in this course; that is the point." Balanced by: students "must understand every line you submit and be able to explain it...must document your AI usage in each submission: tools, models, prompts."
- FAQ: "AI use is required. Understanding is what gets graded." "If you can't explain how your code works, that is a problem."
- In-person verification of understanding: "Lab checkoffs and the three hackathons are where we verify understanding, in person."
- The approval layer is itself a curricular object: "a manual approval prompt in front of anything dangerous, then rule-based auto-approval with a decision log" — human oversight is designed, built, and then deliberately hardened.

### Treatment of: evaluation/verification of AI-produced work
- Objective 3 requires "an eval suite that measures it"; objective 4 "regression gates."
- Eval discipline is quantitative: "at least eight tasks, each run at least three times, reported as pass rates," plus "a teardown report on what your agent still cannot do."
- Failure diagnosis via a named framework: "the Big Three: context, model, prompt."
- Final demos require "eval results and the cost report."

### Treatment of: persistent engineering knowledge beyond source code
- Phase 3 has students build "a wiki...sessions and memory" and "persistent memory" into their assistant — persistent knowledge is a built feature; YAML configuration for the pair-programmer.
- Required AI-usage documentation per submission ("tools, models, prompts").
- Treatment of repo-level knowledge artifacts for humans (design docs beyond the graded spec) — not evident in available materials beyond the spec-first rubric.

### Treatment of: controls, constraints, governance, enforcement
- Approval layers with decision logs, permission policy ("Permission Policy and How It Fails"), stop conditions on autonomous loops, regression gates, context management/compaction — all first-class graded artifacts.
- Adversarial robustness: "A Repository That Tries to Prompt-Inject Your Agent" (Week 11 exercise).
- Governance of students' own AI use: model allowlists per phase with "a published policy amendment" required for others; documentation mandates; in-person checkoffs; College of Engineering Honor Code process for violations.

## B. Surveyor notes (interpretation, labeled)
- Coverage gaps: per-lecture schedule with all ~28 lecture titles was only partially captured; the GitHub org contents and "podcast" were not inspected; lab handouts are behind course platforms.
- Organizing logic (interpretation): a deliberate pedagogical inversion of the commercial-tool course — use a transparent open-source agent on small local models so context/model/prompt stay visible, then de-black-box the agent by rebuilding it (loop, tools, approvals, evals), then re-assemble it into a hardened assistant. The engineering discipline being taught is largely *governance engineering*: approval layers, permission policy, prompt-injection defense, regression gates, cost reporting.
- The batch brief's conjecture that this is an EECS 481 variant is wrong on the evidence: it is EECS 498-016, a distinct special-topics course (EECS 481 remains a separate conventional SE course).
- Classification reasoning: "mixed" — objective 1 and Phase 1 are engineering-software-with-AI; objectives 2–5 are building the agent systems themselves (~72% of grade). But unlike a generic build-AI-apps course, the built artifact is the coding agent, and the course's stated purpose is to make students better *directors* of such agents — a survey should note this is arguably "building-to-understand" rather than building-AI-products.
