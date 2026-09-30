# CUHK-Shenzhen — CSC4801 "AI-assisted Software Engineering"

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator ("a hands-on course on building software with coding agents" — the engineering lifecycle practiced with agents, with an explicit testing/security/verification arc)

## Sources consulted
- https://sra-research.github.io/CSC4801/ — official course website (primary; course description, staff, full Tue/Thu schedule, tool mentions)
- https://sra-research.github.io/CSC4801/project.html — team project page (project description, timeline, grade weight; leaderboard template not yet populated)
- https://github.com/sra-research/CSC4801 — course website repository (structure confirmation; lecture decks under `assets/slides/` are gitignored — i.e., slides exist but are not yet published)
- Not public: lecture slides (gitignored in the repo), homework specs (HW 1–3 appear only as release/due dates on the schedule), grading percentages beyond the project's 50%.

## A. Explicit course content (quoted / cited)

### Identity
The Chinese University of Hong Kong, Shenzhen (CUHK-Shenzhen) · CSC4801 · "AI-assisted Software Engineering" · Fall 2026 (Sep 8 – Dec 17, 14 weeks) · Instructor: Jinsheng Ba; TAs Xiaoyuan Liu, Tong Zhu; undergraduate TFs Haoyi Yu, Geyu Liu · undergraduate (4xxx-level) · lectures Tue & Thu 8:30–10:00, Teaching C Building 210. Course supporter acknowledged: MiMo (Xiaomi). (Note: not in the Geng et al. dataset; likely too new.)

### Stated learning objectives
No enumerated learning-objectives list is published. The course description, verbatim: "CSC4801 is offered by The Chinese University of Hong Kong, Shenzhen (CUHK-Shenzhen). It is a hands-on course on building software with coding agents." And the three-stage framing, verbatim: "first the **basis** — how AI and large language models work, and how they support software engineering; then the **techniques** — the basic methods of applying AI across the engineering lifecycle; and finally the **application** — a real-world team project where you practice using AI to build, test, and secure a working product."

### Organizing sequence
Full published schedule (lecture titles verbatim):
- Wk 01: Introduction · Principles of LLMs
- Wk 02: Principles of Agents · Advanced Agents
- Wk 03: MCP/Skills & Project Announcement · Prompts (HW 1 released)
- Wk 04: Requirements · Specification Driven Development
- Wk 05: Coding I · Coding II (HW 1 due; HW 2 released)
- Wk 06: Team Collaboration · Quiz 1 & Coding Exercise
- Wk 07: Testing & Verification · Fuzzing (HW 2 due; HW 3 released)
- Wk 08: Security · Prompt Injection
- Wk 09: Repair · AIOps (HW 3 due)
- Wk 10: Quiz 2 & Project Exercise · Guest Speaker
- Wk 11: Guest Speaker · Guest Speaker
- Wk 12: Project Competition ×2
- Wk 13–14: Project Presentation ×4 sessions
(National Day recess Oct 1–7.)

### Assignments and project structure
- Three homeworks (HW 1–3; specs not public) + two in-class quizzes + in-class coding/project exercises.
- Team project, from project.html: teams of three develop "a locally runnable, full-stack recruiting and candidate-matching platform" using AI coding agents and spec-driven workflows. Timeline: development Weeks 1–10; **feature freeze Week 11**; **"Cross-team Auditing & Repair" Week 12**; final presentations Weeks 13–14. "Requirements fulfillment, peer review, and presentations comprise 50% of overall course grade." A competition leaderboard page exists (template, unpopulated).

### AI tools and agent frameworks used
Named on the course site: **Claude, Claude Code, Claude Worktree, Codex, MCP (Model Context Protocol), Ollama, Hugging Face**; the agent lectures reference the **ReAct** framing. The project mandates "AI coding agents and spec-driven workflows."

### Readings
"Recommended readings span topics including LLMs, agents, prompt engineering, and coding benchmarks" (per the site; specific titles not captured in the fetched excerpt). No textbook stated.

### Treatment of: conventional SE activities
The "techniques" stage walks the lifecycle explicitly as lecture units: Requirements → Specification Driven Development → Coding → Team Collaboration → Testing & Verification → Fuzzing → Security → Repair → AIOps. Each is a named lecture applied with/through AI.

### Treatment of: human responsibility and judgment
Not evident in available materials as an explicit unit or policy. (The Week-12 "Cross-team Auditing & Repair" phase makes students audit other teams' AI-built products — a practice bearing on judgment — but the site does not frame it in responsibility terms.)

### Treatment of: evaluation/verification of AI-produced work
Explicit at the unit level: "Testing & Verification" and "Fuzzing" are dedicated lectures; the project's stated aim is to "build, test, and secure a working product"; Week 12 is cross-team auditing and repair of the produced platforms; peer review is a graded project component. Depth beyond lecture titles: not evident in available materials (slides unpublished).

### Treatment of: persistent engineering knowledge beyond source code
"Specification Driven Development" is a dedicated lecture and "spec-driven workflows" are mandated in the project — specifications as first-class engineering artifacts. "MCP/Skills" appears as a lecture title (agent skills/capability packaging). Anything further: not evident in available materials.

### Treatment of: controls, constraints, governance, enforcement
Security is a named arc — "Security" and "Prompt Injection" lectures, "secure a working product" in the project framing, and the cross-team audit phase acts as an enforcement-shaped exercise (adversarial review of another team's AI-built system). Formal governance/controls vocabulary: not evident in available materials.

## B. Surveyor notes (interpretation, labeled)
- **Coverage gaps:** lecture slides exist but are gitignored/unpublished; homework specs, grading percentages (besides project 50%), and reading lists are not public. Evidence strength: moderate (structure-rich, content-thin).
- **Organizing logic (interpretation):** a deliberate three-act design — (1) mechanism literacy (LLMs → agents → MCP/skills → prompts), (2) the SE lifecycle re-taught agent-first (requirements, spec-driven development, coding, collaboration, testing/verification, fuzzing, security, repair, ops), (3) a competitive team build with a feature freeze and an adversarial cross-team audit-and-repair phase. Of the batch, this is the course most clearly organized around *engineering software with coding agents*, and its schedule gives verification and security more named airtime (4 of 18 content lectures) than any other course in this batch.
- **Instructor context (interpretation):** the hosting org "sra-research" and instructor Jinsheng Ba (systems/security research background, e.g. SQL engine testing work) are consistent with the course's testing/fuzzing/security tilt.
- **Classification reasoning (interpretation):** core comparator — the object built is ordinary software (a recruiting platform); AI appears as the *means* of engineering, not the thing constructed.
