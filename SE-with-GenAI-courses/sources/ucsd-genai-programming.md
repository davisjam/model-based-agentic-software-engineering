# UC San Diego — CSE 190/291P "Generative AI and Programming"

**Gathered:** 2026-09-30 · **Preliminary class:** mixed (course centers on building LLM-integrated
software systems as the artifact, but a substantial, explicit strand teaches engineering-with-coding-agents
practice: agent workflow discipline, verifier-centered confidence, transcript-documented development)

## Sources consulted
- https://ucsd-cse-115-215.github.io/sp26/welcome.html — course site, welcome/logistics page
- https://ucsd-cse-115-215.github.io/sp26/lectures/00-intro.html — Unit 0 intro lecture
- https://ucsd-cse-115-215.github.io/sp26/lectures/02-document-scanner.html — Unit 2 lecture "Live-Clauding a Document Scanner"
- https://ucsd-cse-115-215.github.io/sp26/lectures/03-agents.html — Unit 3 lecture "Agents"
- https://ucsd-cse-115-215.github.io/sp26/lectures/04-correctness.html — Unit 4 lecture "Getting Confidence in (Agentic) Code"
- https://ucsd-cse-115-215.github.io/sp26/lectures/05-grounding.html — Unit 5 lecture "Getting Confidence in LLM Answers"
- https://ucsd-cse-115-215.github.io/sp26/assignments/social-media-monitor-assignment.html — Assignment 1 spec
- (Not fetched in depth: lectures/01-semantic-text-processing.html, assignments 2–4 specs — public, same site)

## A. Explicit course content (quoted / cited)

### Identity
- University: UC San Diego; department: CSE (site org "ucsd-cse-115-215", course numbered CSE 190/291P — cross-listed undergrad special topics / grad)
- Number/title: CSE190/291P, "Generative AI and Programming"
- Term: Spring 2026 ("SP26")
- Instructors: identified on the site as "Joe and Nadia" (first names only on fetched pages; consistent with UCSD CSE faculty Joe Gibbs Politz and Nadia Polikarpova — surveyor identification, see §B)
- Level: mixed UG (190) / grad (291P); selective enrollment ("admission is selective" per search snippet of the welcome page)
- Format: lecture units + open-ended project assignments with demo/peer-review rounds

### Stated learning objectives
No formal numbered objectives section evident in available materials. Framing statements (verbatim):
- "This class is about **AI-powered systems**: software systems that integrate generative AI as a core component."
- "This is **not** a class about using ChatGPT to write code faster. It's about building **new kinds of programs** that weren't possible before."
- Instructors state they have "strong opinions about doing it well: testing, evaluation, cost management, code quality."
- "We don't claim to be experts — this field is evolving fast and we're learning alongside you."
- Per-assignment goals exist, e.g. Assignment 1: "Use basic LLM APIs for text processing"; "Learn to balance cost and quality by combining LLMs with cheaper processing stages"; "Build an eval harness for an LLM-powered application."

### Organizing sequence
Published lecture/unit sequence (from site navigation):
1. Unit 0 — Introduction
2. Unit 1 — Semantic Text Processing (classification, extraction, summarization)
3. Unit 2 — "Live-Clauding a Document Scanner" (building an app with Claude Code, live)
4. Unit 3 — Agents (building a git-repo agent "GitBot"; frameworks; guardrails; evaluation; prompt injection)
5. Unit 4 — "Getting Confidence in (Agentic) Code" (verifier-centered confidence in agent-written code; case study: concurrent memory allocator)
6. Unit 5 — "Getting Confidence in LLM Answers" (grounding, RAG, quote verification, symbolic checking)
Intro lecture describes "Four thematic units": semantic text processing; image/document processing; agents and tools; "TBD (student-shaped direction)."

### Assignments and project structure
Four assignments: (1) Social Media Monitor, (2) Document Scanner, (3) Agents, (4) Student Choice.
Grading model per welcome page: "Open-ended projects with a round of demos, peer review, and responses to feedback" rather than traditional rubrics.
Assignment 1 (verbatim/cited detail):
- Multi-stage cost-aware pipeline: "progressively filter content through increasingly expensive stages" (symbolic filtering, keyword matching, embeddings, small LLM classifiers).
- Eval discipline: "Gold dataset of minimum 50 labeled examples"; measure "precision/recall and cost"; optimize domain metrics (F1, recall at minimum precision, cost at minimum recall).
- Deliverables include: "Three exported AI assistant chat transcripts documenting development work"; a "DESIGN.md describing three design decisions and agent tool involvement level"; revision round adds "Two additional coding agent transcripts addressing feedback" and a "FEEDBACK-RESPONSE.md documenting all review responses with commit links."
- Peer review: "Three-round review session where teams present live demonstrations, code, and prompts to two peer teams. Reviewers file GitHub Issues using provided templates."

### AI tools and agent frameworks used
- Model APIs: Anthropic, OpenAI, Google Gemini (per welcome page).
- Claude Code as the demonstrated coding agent (Unit 2 "Live-Clauding"; Unit 4 orchestration).
- Students may use "any AI assistants (Claude, Copilot, Gemini, etc.)" and must export chat logs.
- Agent frameworks discussed: OpenAI Agents SDK, LangGraph; eval framework Inspect AI (Unit 3).
- GitHub for workflow (PRs, Issues-based peer review).

### Readings
Not evident in available materials (no reading list found on fetched pages).

### Treatment of: conventional SE activities
- Prereq expectations: "API key management and configuration; Git/GitHub workflows and pull requests; multi-file program development with testing; basic CLI design; web server and HTML fundamentals" (welcome page).
- Unit 2 covers design-doc practice ("Save design documents to version-controlled files rather than transient chat state"), type-driven design ("Type signatures help both human and agent reason about abstractions"), incremental build-and-validate, DRY concerns ("the more duplication the more chance there is for drift").
- Testing is pervasive: unit tests, sanitizers, stress tests (Unit 4); eval harnesses as first-class deliverables (Assignment 1).

### Treatment of: human responsibility and judgment
- Unit 2: "Push back on defaults" — "I decided to tell Claude that it should not do this anymore!"; establishing preferences via a `CLAUDE.md` file; "I would like to know more about what you're going to do and why"; on sycophancy: "That completion includes 'you're right!'"; "in situations where we're unhappy with Claude's suggestions, it can be worth pushing back."
- Division of labor: "Have agents handle boilerplate and tedious code while humans focus on UX testing, design decisions, and architectural choices requiring domain expertise."
- Unit 5: "it's up to the user to decide if the quoted text actually supports the claim."
- Assignment 1's DESIGN.md "requires reflecting on how much individual decision-making versus agentic tool assistance influenced outcomes."

### Treatment of: evaluation/verification of AI-produced work
Extensive and explicit — a named course strand (Units 4–5):
- Unit 4 central claim: traditional confidence signals (social trust, code review) fail at agent scale; "the confidence in the built system rests on _the quality of the verifier_."
- Verification layers taught: unit tests ("verify the property of input-output correctness (on a finite set of examples)"), type systems/static analysis, dynamic verifiers ("predicate checks or `valgrind` or `asan`"), property-based heap invariant checking (`vmcheck()` with seven structural properties), sanitizer instrumentation (`-fsanitize=address,undefined`), concurrent stress testing (8 threads × 20,000 ops with thread-specific payload patterns).
- Stance on review vs. verification: "if I can't have confidence and understand the agent's mistakes on my terms, I need to commit to my understanding of the verifiers."
- Reward hacking / deception: agents might "find clever ways around" restrictions or "outright fabricate performance numbers _in its report to us_," "necessitating independent verification runs."
- Unit 3 agent evaluation: fixture + prompt + oracle-predicate test design; "pass@k" metric ("Run each scenario `n` times, count `c` successes"); Inspect AI tooling.
- Unit 5: grounding/RAG, verbatim-quote verification ("Every quote marked with a ✓ corresponds to a verbatim span of the handbook"), symbolic rule-checkers; "Real guarantees come from verifying the model's output, not from asking it nicely."

### Treatment of: persistent engineering knowledge beyond source code
- Unit 2: "Store guidelines, decisions, and schemas in the repository so the agent (and teammates) can access consistent information across sessions"; `CLAUDE.md` preference files; version-controlled design documents.
- Assignment deliverables institutionalize this: DESIGN.md, FEEDBACK-RESPONSE.md, exported agent transcripts as graded artifacts.

### Treatment of: controls, constraints, governance, enforcement
- Unit 3 "Guardrails": "Safety requires defining explicit policies about acceptable behavior, then enforcing them through code rather than relying on model behavior"; four named dangerous git effects (clobber uncommitted changes; orphan a local commit; touch a remote; rewrite published history); guardrail hooks intercepting tool calls with Allow/Confirm/Deny; "**syntactic pattern matching is NOT a safety mechanism.**"
- Tool-surface design as control: "A small tool surface with clear, analyzable effects enables better guardrail implementation"; typed primitives (`set_ref()`, `delete_ref()`, `commit()`, `write_paths()`) over free-form shell.
- Unit 3 closes with "Security and Prompt Injection."
- Unit 4 orchestration guardrails: "files you must NOT modify" instructions and "independent verifier re-runs to prevent reward hacking."

## B. Surveyor notes (interpretation, labeled)
- Instructor identification: the site names only "Joe and Nadia"; UCSD CSE faculty Joe Gibbs Politz and Nadia Polikarpova match, and the batch brief's conjecture that this is the Geng et al. (arXiv:2608.05898) author-group course is plausible but not confirmed on fetched pages — treat as inference.
- Coverage gaps: no formal syllabus page with grading percentages was found; no reading list; assignments 2–4 specs and lecture 01 exist publicly but were not fetched in depth; enrollment/petition details only via search snippet.
- Organizing logic (interpretation): the course is structured as a two-axis progression — (axis 1) what you build: LLM-integrated applications of increasing agency (text pipeline → document app → world-acting agent); (axis 2) how you build it: with coding agents under an escalating discipline of verification, from eval harnesses to verifier-owned confidence in agent-written code. The intellectual through-line is "confidence via verifiers, not trust" applied both to LLM output inside the product and to agent-written code in the process.
- Classification reasoning: "mixed" — the product artifacts are AI systems (which would lean exclude), but Units 2 and 4 plus the transcript/DESIGN.md deliverables are squarely engineering-software-with-AI practice, taught deliberately, not merely permitted.
