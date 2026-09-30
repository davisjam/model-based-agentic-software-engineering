# Stanford — CS 146S "The Modern Software Developer"

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator (organized around developing software with LLMs/coding agents across the SDLC; agent-construction content — building an MCP server, agent anatomy — serves tool-use fluency inside a developer-workflow course, not AI-systems engineering as the subject)

## Sources consulted
- https://themodernsoftware.dev/ — official course site (currently serving the Fall 2026 offering; links to a Fall 2025 archive)
- https://themodernsoftware.dev/fall2025 — official Fall 2025 archive page (SPA: Overview tab is server-rendered; the Syllabus and FAQ tabs are client-rendered and were NOT retrievable by fetch — that content is known to exist but was not reachable here)
- https://github.com/mihail911/modern-software-dev-assignments — instructor's official assignments repo (current state holds week1–week2 for Fall 2026)
- https://github.com/SreenityaThatikunta/modern-software-dev-assignments — Fall 2025 student fork preserving the FULL Fall 2025 assignment set (week1–week8); assignment specs fetched from raw files under this fork, `master` branch
- https://www.heyuan110.com/posts/ai/2026-02-24-stanford-cs146s-overview/ — secondary: third-party course overview reproducing the Fall 2025 10-week syllabus, grading, and guest list
- https://akjamie.github.io/post/2026-02-23-stanford-cs146s-summary/ — secondary: third-party lecture-content summary of Fall 2025
- https://github.com/allarddewinter/my-blog/blob/main/src/posts/2025/2025-09-26-stanford-modern-software-developer-course.md — secondary: contemporaneous (Sept 2025) blog post quoting the instructor's course email
- https://docs.google.com/document/d/1W11sWBigWIsi9wVIhhFx3wajIEnP0Qfb-ei8Ecf5VKU/ — official assignment calendar ("CS 146S FA26 Calendar"); body not retrievable by fetch
- https://x.com/mihail_eric/status/1953116446046957941 — instructor course announcement (not fetched; located via search)

## A. Explicit course content (quoted / cited)

### Identity
Stanford University · Computer Science · CS 146S · "The Modern Software Developer" · Fall 2025 (inaugural; re-offered Fall 2026) · Instructor: Mihail Eric; TAs (Fall 2025): Febie Lin, Brent Ju · undergraduate, 3 units · "Weekly lectures, hands-on coding sessions, and guest speakers from industry. Final project showcasing modern development practices." (course site) · Fall 2025 meetings Tue/Thu 5:30–6:20 PM, Room 370-370 · Prerequisites: "CS111/CS161 equivalent programming experience. CS221/229 recommended."

### Stated learning objectives
Course site (fall2025 archive + current):
> "Large language models have changed software development from a primarily manual coding process into one where developers collaborate with increasingly capable coding agents."

Learning goals (course site, list form): "Master modern development tools, understand AI-assisted coding, learn automated testing and deployment, explore emerging software trends"; plus (site text as extracted) "Design effective agent-driven workflows" and "Compose tools and skills into reliable development systems."

From the instructor's course email, quoted in the allarddewinter blog post (Sept 2025):
> "Human-agent engineering, not vibe coding."
> "LLMs are only as good as you are."

### Organizing sequence
Fall 2025 ran 10 weeks. Week titles as reproduced by the heyuan110 third-party overview (SECONDARY source; the official Syllabus tab was not fetchable):
1. "LLMs and AI Coding Foundations" · 2. "Anatomy of a Coding Agent" (agent architecture, tool use, MCP) · 3. "AI IDEs and Context Engineering" (context management, PRDs for agents) · 4. "Coding Agent Patterns" (agent autonomy levels, human-agent collaboration) · 5. "The Modern Terminal" · 6. "AI Testing and Security" · 7. "Code Review and Software Support" · 8. "Automated App Building" · 9. "Post-Deployment Operations" (monitoring, observability, incident response) · 10. "The Future of AI Software Engineering".

The akjamie summary (SECONDARY) adds per-lecture concepts: pre-training pipeline and "Swiss cheese capability gaps" (wk1); sync vs. async agents and "four context window failure modes (poisoning, distraction, confusion, clash)", "defensive prompting" (wk3); "CLAUDE.md project context pattern" (wk4); "strategic vs. YOLO agent profiles" (wk5); SSRF/credential-theft vectors and "AI scanning false positive rates (82-86%)" (wk6); "code review hierarchy, AI review quadrants, mental alignment as primary purpose" (wk7); Vercel v0 pipeline (wk8); "SRE principles, 50% toil rule, error budgets, AI-native operations with dynamic runbooks" (wk9).

Guest speakers (SECONDARY, per heyuan110): Silas Alberti (Cognition), Boris Cherney (creator of Claude Code, Anthropic), Zach Lloyd (Warp), Isaac Evans (Semgrep), Tomas Reimers (Graphite), Gaspar Garcia (Vercel), Resolve AI, Martin Casado (a16z). The allarddewinter post names Russell Kaplan (Cognition) instead of Alberti — the two secondary sources disagree on the Cognition speaker.

### Assignments and project structure
Grading (SECONDARY, heyuan110): Final Project 80%, Weekly Assignments 15%, Class Participation 5%.

Weekly assignments, Fall 2025 (PRIMARY — specs from the preserved fork):
- **Week 1 — "Prompting Techniques":** "You will practice multiple prompting techniques by crafting prompts to complete specific tasks." Six techniques (k-shot, chain-of-thought, tool calling, self-consistency, RAG, reflexion) implemented against local Ollama models (mistral-nemo:12b, llama3.1:8b), iterating until test scripts pass.
- **Week 2 — "Action Item Extractor":** expand "a minimal FastAPI + SQLite app that converts free-form notes into enumerated action items" using Cursor: LLM extraction function with structured outputs, unit tests, backend refactor, endpoint + frontend integration, and an AI-generated README; writeup.md documents "prompts used, and modifications made by the student or Cursor."
- **Week 3 — "Build a Custom MCP Server":** "Understand core MCP capabilities: tools, resources, prompts. Implement tool definitions with typed parameters and robust error handling. Follow logging and transport best practices." Wrap a real external API; ≥2 tools; graceful failure/rate-limit handling.
- **Week 4 — "The Autonomous Coding Agent IRL":** "build at least 2 automations within the context of this repository" using Claude Code features (custom slash commands, CLAUDE.md guidance files, SubAgents, MCP servers) that "meaningfully improve a developer workflow"; before/after workflow documentation.
- **Week 5 — "Agentic Development with Warp":** "mirrors the prior assignment but emphasizes the Warp agentic development environment and multi-agent workflows"; git worktrees for concurrent agents; writeup must document "autonomy levels and supervision methods" and "multi-agent coordination strategy and concurrency outcomes."
- **Week 6 — "Scan and Fix Vulnerabilities with Semgrep":** run `semgrep ci` (SAST/Secrets/SCA), triage findings including "false positives or noisy rules ignored," fix ≥3 issues with an AI coding assistant, verify app still runs with passing tests.
- **Week 7 — "Exploring AI Code Review Using Graphite":** "practice agent-driven development and AI-assisted code review on a more advanced codebase"; per task: 1-shot-prompt implementation, manual line-by-line review, PR, Graphite Diamond AI review; writeup compares own comments vs. AI comments, "assessment of when AI reviews were better/worse, and personal comfort level trusting AI reviews with supporting heuristics."
- **Week 8 — "Multi-Stack AI-Accelerated Web App Build":** "Build the same functional web application in 3 distinct technology stacks," one via bolt.new, one with a non-JavaScript language.
- **Final project** (80% of grade): "Final project showcasing modern development practices" (course site); details not evident in available materials.

### AI tools and agent frameworks used
Ollama (mistral-nemo, llama3.1), Cursor, Claude Code (slash commands, CLAUDE.md, SubAgents), MCP SDK, Warp, Semgrep, Graphite Diamond, bolt.new (all from assignment specs). The Fall 2026 site adds partner/tool links: Browserbase, HeyGen, CopilotKit, OpenHands, Milvus, Marimo, Pi, CrewAI, Vercel, cmux, Phoenix, Unsloth, Anyscale (whether these applied in Fall 2025 is not evident in available materials).

### Readings
"Publicly accessible papers, blog posts, videos (all linked on course website)" (SECONDARY, heyuan110); the reading list itself sits in the unfetchable Syllabus tab — not evident in available materials.

### Treatment of: conventional SE activities
The syllabus walks the SDLC with AI at each stage: testing and security (wk6), code review, debugging, documentation (wk7), app building (wk8), deployment/monitoring/incident response (wk9). Assignments require unit tests (wk2), passing test suites after security fixes (wk6), PR discipline with descriptions and testing summaries (wk7).

### Treatment of: human responsibility and judgment
Explicit and repeated: "Human-agent engineering, not vibe coding" (instructor email); wk5 writeup requires documenting "autonomy levels and supervision methods"; wk7 requires manual line-by-line review before AI review and a reasoned "comfort level trusting AI reviews with supporting heuristics." Secondary (akjamie) reports the course thesis that "judgment skills (decomposition, architecture, business context) remain distinctly human."

### Treatment of: evaluation/verification of AI-produced work
Concrete per-assignment: test scripts gate wk1 prompts; wk2 unit tests; wk6 triage of AI-scanner false positives and post-fix test verification; wk7's manual-vs-AI review comparison is an evaluation exercise on AI review output itself. Secondary lecture material covers "AI scanning false positive rates" and context-failure modes.

### Treatment of: persistent engineering knowledge beyond source code
Present via artifacts: CLAUDE.md repository guidance files and custom slash commands (wk4), Warp Drive saved prompts/rules and "multi-agent coordination playbooks" (wk5), required per-assignment writeups recording prompts and design decisions. Secondary (akjamie) quotes: "The prompt contains the intent, the business logic, and all the nuance the code itself cannot capture" and "prompt as source code: specifications should be versioned with same discipline as traditional code."

### Treatment of: controls, constraints, governance, enforcement
Security scanning as a workflow gate (Semgrep, wk6); repo pre-commit tooling ships in the wk4 starter app; secondary lecture notes mention "defensive prompting," "YOLO mode exploits," and error budgets/runbooks (wk9). No published course-level AI-use governance policy found (FAQ tab unfetchable) — not evident in available materials.

## B. Surveyor notes (interpretation, labeled)
- **Coverage gaps:** the official Syllabus and FAQ tabs (Fall 2025 archive) are client-rendered and could not be fetched — week titles, grading, guest list, and readings here rest on two third-party write-ups that broadly agree (one guest-speaker discrepancy noted). Assignment evidence is primary and strong (full specs via a preserved fork). Final-project requirements are not public.
- **Interpretation:** the course's organizing logic is the SDLC re-walked with agents — foundations (how LLMs/agents work) → workflow construction (IDE, MCP, Claude Code, terminal, multi-agent) → assurance (testing/security, review) → operations — with the human positioned as manager/verifier of agent work. The assignment arc deliberately rotates through many commercial tools (Cursor, Claude Code, Warp, Semgrep, Graphite, bolt.new), suggesting tool-portfolio fluency is itself a course outcome.
- Weeks 2–3 involve building LLM features and an MCP server, which brushes "building AI systems"; in context these read as learning the substrate developers now work atop, so I keep the course core rather than mixed — a reviewer could defensibly call it mixed.
