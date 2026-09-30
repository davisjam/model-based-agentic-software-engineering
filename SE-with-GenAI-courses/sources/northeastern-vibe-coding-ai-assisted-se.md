# Northeastern University (Oakland) — CS 7180 "Vibe Coding: AI-Assisted Software Engineering"

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator (the course teaches professional
software engineering practice conducted with AI tools — TDD, CI/CD, code review, security gates —
with ordinary full-stack web apps as the artifacts; agent-building appears only late and in service
of tooling mastery)

## Sources consulted
- https://johnguerra.co/classes/aiCoding_spring_2026/ — main course site / syllabus (cited as course URL in Geng et al. 2026, arXiv:2608.05898, Table 1)
- https://johnguerra.co/lectures/aiCoding_spring2026/ — lecture-slides index (all module titles)
- https://johnguerra.co/lectures/aiCoding_spring2026/14_AI_Security_Code_Quality/index.html — Week 14 slides "AI Security & Code Quality"
- https://johnguerra.co/lectures/aiCoding_spring2026/11_Claude_Code_Workflows/index.html — Week 11 slides "Claude Code Workflows & Development Practices"
- Not fetched in depth (public): remaining 12 lecture-slide decks, showcase page, homework specs (some assignment detail summarized on the main page).

## A. Explicit course content (quoted / cited)

### Identity
- Northeastern University, Khoury College — Oakland campus; graduate (MS-level) course
- CS 7180 (special topics), "Vibe Coding: AI-Assisted Software Engineering"
- Term: Spring 2026; "Tue/Thu 3:00–4:40 PM PST"; "Hybrid (In-Person + Zoom)"
- Instructor: John Alexis Guerra Gómez (site: johnguerra.co)

### Stated learning objectives
- Tagline (verbatim): "Master AI-assisted development for Silicon Valley. Build production apps with AI—the right way."
- As summarized on the course page: students will "master three AI coding paradigms (Claude Web, Antigravity, Claude Code), build portfolio applications, understand LLM fundamentals, and integrate AI into professional development workflows while maintaining the ability to code independently."
- Course framing (from search snippet of the same page): trains students "to master AI-assisted development tools while maintaining professional engineering standards and building high-quality, production-ready full-stack applications"; covers "when to use which tools, systematic evaluation of AI-generated code, and integration of AI into professional development workflows."

### Organizing sequence
16-week schedule (verbatim topics): 1 Introduction; 2 LLM Architecture & Tokenization; 3 Prompt Engineering Basics; 4 Claude Web & Artifacts; 5 Claude Web Deep Dive: Artifacts; 6 IDE-Centric AI Coding (P1 due); 7 Agile/Scrum + Pair Workflow; 8 Advanced IDE AI Features; 9 Spring Break; 10 Claude Code Foundations (P2 due); 11 Claude Code Workflows & TDD; 12 Claude Code Extensibility; 13 Agent Architectures & SDK; 14 AI Security & Code Quality; 15 Production & Course Synthesis; 16 Finals (P3 due Apr 21).
Slide-module titles confirm: "…Claude Code Extensibility — Skills, MCP, Hooks & Sub-agents"; "Agent Architectures & SDK"; "AI Security & Code Quality"; "Production & Course Synthesis"; plus a "User Research & Prototyping" module.

### Assignments and project structure
- Grading: Participation 15%; Weekly Quizzes 10%; Homeworks (5) 25%; Projects (3) 50%.
- Project 1 "Personal Utility App" (13%): "5+ user stories with CRUD operations; Basic test suite (50%+ coverage); GitHub Actions CI pipeline; Publicly deployed."
- Project 2 "Full-Stack Application" (18%): "User authentication (JWT/OAuth); Test-Driven Development (80%+ coverage); Comprehensive evaluation suite; 2 documented Agile sprints."
- Project 3 "Production App with Claude Code Mastery" (19%): "Pair project demonstrating Claude Code extensibility; CLAUDE.md, skills, hooks, MCP, agents; TDD + CI/CD with AI PR review; Vercel deployment + Sentry monitoring; Blog post, screencast, live demo."
- "Weekly quizzes assess conceptual understanding independently of AI assistance."

### AI tools and agent frameworks used
Required: "Antigravity (free)," "Claude.ai account (Pro recommended, $20/month)," GitHub, Node.js 18+, Git. Paradigms: Claude Web/Artifacts, IDE-centric AI (Antigravity; Cursor docs linked), Claude Code (incl. skills, hooks, MCP, sub-agents, Agent SDK, `claude -p` non-interactive mode, `anthropics/claude-code-action@v1` for AI PR review). Stack: React/Next.js, Node/Express, PostgreSQL/MongoDB, Jest/Vitest, Playwright/Cypress, GitHub Actions, TailwindCSS, TypeScript.

### Readings
Required books: "The Mom Test" (Fitzpatrick), "Scrum" (Sutherland). Recommended: "Designing for Growth" (Liedtka & Ogilvie). Linked resources: Anthropic docs, Antigravity docs, GitHub Copilot guide, MCP site, 3Blue1Brown neural-net series, "The Illustrated Transformer," Anthropic prompt-engineering tutorial.

### Treatment of: conventional SE activities
Deep and explicit: user research/prototyping (Mom Test), Agile/Scrum with documented sprints and pair workflow, TDD with coverage floors (50%→80%), CI/CD via GitHub Actions, branch-per-feature git + PRs with `gh`, "GitHub Issues as Specifications" ("Transform acceptance criteria from issues into test names and definitions of done"), deployment (Vercel) and monitoring (Sentry).

### Treatment of: human responsibility and judgment
- Policy (verbatim): "This course requires AI tool use but with strict guidelines: document all AI usage, understand all code submitted, never commit code you cannot explain."
- Week 14 (verbatim): "When you use AI to generate code: You are the author of record. You are responsible for bugs, vulnerabilities, and license violations." Also cites the U.S. Copyright Office: "Wholly AI-generated content is not copyrightable."
- Week 11: "Humans write test descriptions and assertions. AI writes the implementation and boilerplate." "Human review remains essential for acceptance criteria specification, test assertion validation, and plan approval before implementation begins."
- Independence maintained via AI-free weekly quizzes and the objective of "maintaining the ability to code independently."

### Treatment of: evaluation/verification of AI-produced work
- Week 11 slides: "'The single highest-leverage thing' developers can do when coding with AI is providing verification mechanisms. Test-driven development serves as the most powerful form of this verification." TDD loop with agent: human writes failing test → commit → agent implements → verify → refactor.
- Week 14 slides: Veracode-based claim "45% of AI code has OWASP vulnerabilities" (XSS 86%, log injection 88%); five root causes incl. "Functional correctness != security" and developer overconfidence in code that "looks right"; "slopsquatting" (AI models "hallucinate package names that don't exist," attackers register them).
- Evaluation formalisms: "pass@k: At least one success in k attempts"; "pass^k: ALL k trials succeed"; "For production systems, pass^k matters more." Grader taxonomy: code-based, model-based, human ("gold standard"). LLM-as-judge: "85% agreement with human judgment" vs human-human "81%," with named biases (position, verbosity, self-enhancement).
- Project deliverables mandate "Comprehensive evaluation suite" (P2) and "AI PR review" in CI (P3).

### Treatment of: persistent engineering knowledge beyond source code
- "CLAUDE.md Pattern: Persistent project context file maintained across sessions; supports `/clear` between phases to retain findings and plans in files rather than context window."
- Explore→Plan→Implement→Commit phase discipline: "Each phase produces a reviewable checkpoint"; planning artifacts kept in files.
- P3 requires public knowledge artifacts (blog post, screencast).

### Treatment of: controls, constraints, governance, enforcement
- Week 11 hooks-as-enforcement: "PreToolUse hooks block writes to sensitive files (`.env`, `secrets.json`); PostToolUse hooks auto-format code after edits; deterministic scripts with exit codes enforce deterministic quality rules." Decision rule (verbatim): "If you would be upset when the rule is broken, use a hook. If it's a preference, use CLAUDE.md."
- Week 14 "8-Gate Security Pipeline": Gate 1 Secrets Detection (Gitleaks); 2 Dependency Scanning; 3 SAST (SonarQube, Semgrep); 4 DAST (OWASP ZAP); 5 Container Scanning; 6 License Compliance; 7 Security Acceptance Criteria; 8 SBOM. "No single gate catches everything. Together, they form defense in depth."
- CI gates (tests, lint, build) required on every PR from Project 1 onward.

## B. Surveyor notes (interpretation, labeled)
- Coverage gaps: individual homework specs and quiz content not public in detail; 12 of 14 lecture decks not inspected; the slides index carries a build timestamp of 2026-04-14, indicating the Spring 2026 offering has concluded and materials are as-delivered.
- Organizing logic (interpretation): a tool-mastery ladder (chat → IDE agent → autonomous CLI agent → agent SDK) interleaved with a professional-practice ladder (user stories → Scrum/TDD → CI/CD → security gates → production monitoring), converging on the thesis that AI-assisted engineering is legitimate exactly when wrapped in verification and enforcement machinery ("hooks for what you'd be upset about; CLAUDE.md for preferences"; TDD as the highest-leverage verification).
- The Week 13 "Agent Architectures & SDK" module is building-AI-systems content, but it occupies one week and serves the Claude Code mastery arc — not enough to make the course "mixed" in my reading.
- Distinctive comparator features: quantified security framing of AI code, pass@k vs pass^k for production, LLM-as-judge with bias caveats, and grading that requires demonstrable no-AI competence (quizzes).
