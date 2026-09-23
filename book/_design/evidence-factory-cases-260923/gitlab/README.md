# Evidence file — GitLab (factory-in-a-box case)

**Crawl date:** 2026-09-23. **Scope:** GitLab's public record on (a) what it supplies as
an agentic software-production capability sold to other organizations, and (b) how it builds
its own software with agents.

## Verification note — read before citing

Two retrieval methods were used, and they differ in fidelity.

- **Method R (raw).** Fetched directly and rendered to text locally, or read through the
  GitLab REST API. The quoted strings are byte-exact from the page/issue body.
  Applies to: **[S1]**, **[S2]**, **[S3]**, **[S4]**.
- **Method X (extracted).** Fetched through a summarizing fetch tool that returned quoted
  fragments. The fragments are reported as quotations by that tool but have **not** been
  byte-verified against the page. Applies to all other sources.

Before any Method-X string is printed in the book as a quotation, re-open the URL and confirm
the wording. Method-X items are safe to use as *facts* now; treat them as *paraphrase-grade*
until checked. This distinction is recorded rather than hidden because the whole point of this
folder is checkability.

**Failed / blocked fetches (recorded, not substituted):**

- `https://gitlab.com/gitlab-com/content-sites/handbook/-/raw/main/content/handbook/engineering/workflow/ai-assisted-development/_index.md` — HTTP 404 (wrong path guess; the page was then retrieved by Method R from the rendered handbook URL, [S1]).
- `https://docs.gitlab.com/user/application_security/vulnerabilities/dependency_scanning_auto_remediation/` — 302 redirect to `projects.gitlab.io/auth`; not followed. Auto-remediation evidence therefore rests on [S19] and [S20], not on the feature's own doc page.
- `https://handbook.gitlab.com/handbook/engineering/architecture/design-documents/ai_agent_registry` — returned handbook navigation only; no Flow/Agent Registry design content retrieved. **Gap, not absence.**
- The Orbit team's internal write-up is linked from [S2] as a Google Doc (`docs.google.com/document/d/1NPTAtoikQvhuyBi456pI4was9YYaq240JizI-drfKto`). Not fetched; presumed non-public. The 95% figure is quoted from the public issue body instead.

---

## § Sources

| ID | Title | Publisher / author | Published | URL | Accessed | Type | Weight |
|---|---|---|---|---|---|---|---|
| **S1** | AI-Assisted Development Playbook | GitLab Handbook (Engineering Workflow) | Last modified **2026-03-27** | https://handbook.gitlab.com/handbook/engineering/workflow/ai-assisted-development/ | 2026-09-23 | docs (internal practice) | **Strongest.** Names specific mechanisms, CI jobs, file paths, failure modes, and an internal quantified example. Prescriptive engineering account, not marketing. Method R. |
| **S2** | Work item #163, "Orbit Project Agentic Engineering Enablement" | GitLab — `gitlab-org/orbit/knowledge-graph` | Created **2026-02-18**, updated **2026-07-11** | https://gitlab.com/gitlab-org/orbit/knowledge-graph/-/work_items/163 | 2026-09-23 | eng-artifact (public issue) | **Strongest.** Internal engineering issue with named MRs, dates, and measured production figures. Method R (REST API). |
| **S3** | AI in Developer Experience | GitLab Handbook (Infrastructure Platforms / DevEx) | undated on page (see note) | https://handbook.gitlab.com/handbook/engineering/infrastructure-platforms/developer-experience/ai/ | 2026-09-23 | docs (internal practice) | **Strong.** Named labels, YAML examples, explicit "what we avoid" list. Method R. |
| **S4** | Duo-First Development | GitLab Handbook (Engineering Workflow) | Last modified **2026-04-14** | https://handbook.gitlab.com/handbook/engineering/workflow/duo-first-development/ | 2026-09-23 | docs (internal policy) | **Strong.** States mandatory internal practice ("all team members are expected to..."). Method R. |
| **S5** | Introducing GitLab Orbit | about.gitlab.com — Rebecca Carter | **2026-06-10** | https://about.gitlab.com/blog/introducing-gitlab-orbit/ | 2026-09-23 | eng-blog | **Strong.** Names the data path (CDC → ClickHouse), 12 languages, indexing scale, and a named-customer A/B with numbers. Mixed with launch promotion. Method X. |
| **S6** | GitLab: Built for the agentic engineering era (Transcend announcements) | about.gitlab.com | **2026-06-10** | https://about.gitlab.com/blog/gitlab-transcend-announcements/ | 2026-09-23 | eng-blog / press | **Medium.** Launch post; quantities present but "up to" framed. Method X. |
| **S7** | GitLab Announces the General Availability of GitLab Duo Agent Platform | about.gitlab.com (press) | **2026-01-15** | https://about.gitlab.com/press/releases/2026-01-15-gitlab-announces-duo-agent-platform-general-availability/ | 2026-09-23 | press | **Weak-medium.** Feature list + analyst/customer quotes; promotional register. Method X. |
| **S8** | Introduction to GitLab Duo Agent Platform | about.gitlab.com — Itzik Gan Baruch | **2026-01-14** (updated 2026-05-27) | https://about.gitlab.com/blog/introduction-to-gitlab-duo-agent-platform/ | 2026-09-23 | eng-blog | **Medium.** Architectural vocabulary (agents / flows / orchestration / context); little measurement. Method X. |
| **S9** | When code is abundant | about.gitlab.com — Bill Staples (CEO) | **2026-08-24** | https://about.gitlab.com/blog/when-code-is-abundant/ | 2026-09-23 | eng-blog (executive essay) | **Medium.** Vision/architectural thesis, no measurement. This is the book's existing `staples2026abundant` cite. Method X. |
| **S10** | Customize GitLab Duo Agent Platform | GitLab Docs | undated | https://docs.gitlab.com/user/duo_agent_platform/customize/ | 2026-09-23 | docs | **Strong.** Enumerates the four customer-intent entry mechanisms and their file paths. Method X. |
| **S11** | Agent tool governance | GitLab Docs | undated (moved to `/user/ai-governance/tool-governance/`) | https://docs.gitlab.com/user/ai-governance/tool-governance/ | 2026-09-23 | docs | **Strong.** Named enforcement modes, default matrix, role requirements, override direction. Method X. |
| **S12** | Composite identity | GitLab Docs | undated | https://docs.gitlab.com/user/duo_agent_platform/composite_identity/ | 2026-09-23 | docs | **Strong.** Precise authorization semantics and attribution rule. Method X. |
| **S13** | External agents | GitLab Docs | undated | https://docs.gitlab.com/user/duo_agent_platform/agents/external/ | 2026-09-23 | docs | **Strong.** Token scopes, per-vendor credential requirements, explicit security-limitation statement. Method X. |
| **S14** | Configure flow execution | GitLab Docs | undated | https://docs.gitlab.com/user/duo_agent_platform/flows/execution/ | 2026-09-23 | docs | **Strong.** Concrete customer infrastructure obligations (runner tag, executor, network). Method X. |
| **S15** | GitLab Orbit (product docs) | GitLab Docs | undated; version history cited in page | https://docs.gitlab.com/orbit/ | 2026-09-23 | docs | **Strong.** What is and is not indexed; feature-flag/beta lineage. Method X. |
| **S16** | GitLab Orbit on GitLab Self-Managed | GitLab Docs | undated | https://docs.gitlab.com/orbit/self-managed/ | 2026-09-23 | docs | **Strong.** The self-hosted deployment burden, stated plainly. Method X. |
| **S17** | Security Review Flow | GitLab Docs | Introduced GitLab **19.1**; beta | https://docs.gitlab.com/user/duo_agent_platform/flows/foundational_flows/security_review/ | 2026-09-23 | docs | **Strong.** Contains the sharpest admission-authority statement found. Method X. |
| **S18** | Code Review Flow | GitLab Docs | undated | https://docs.gitlab.com/user/duo_agent_platform/flows/foundational_flows/code_review/ | 2026-09-23 | docs | **Medium-strong.** Trigger mechanics and the customer-authored instructions file. Method X. |
| **S19** | GitLab 19.2 release notes | GitLab Docs | **2026-07-16** | https://docs.gitlab.com/releases/19/gitlab-19-2-released/ | 2026-09-23 | docs / release | **Strong.** Mechanism descriptions for auto-remediation, breaking-change resolution, AI audit events. Method X. |
| **S20** | GitLab 19.2 Puts AI Agents to Work on the Security Backlog | InfoQ | **2026-07-21** | https://www.infoq.com/news/2026/07/gitlab-19-2-ai-agents/ | 2026-09-23 | third-party | **Medium.** Reports an explicit human-approval constraint that GitLab's own release notes do not state as flatly; treat as third-party characterization. Method X. |
| **S21** | AI audit events | GitLab Docs | GitLab **19.1** beta → enabled by default **19.2** | https://docs.gitlab.com/user/ai-governance/ai-audit-events/ | 2026-09-23 | docs | **Strong.** Exact record contents and the role required to see them. Method X. |
| **S22** | AI Catalog | GitLab Docs | undated | https://docs.gitlab.com/user/duo_agent_platform/ai_catalog/ | 2026-09-23 | docs | **Strong.** Versioning/visibility semantics for shared agents and flows. Method X. |
| **S23** | Custom flow YAML schema | GitLab Docs | undated | https://docs.gitlab.com/user/duo_agent_platform/flows/custom_flows_schema/ | 2026-09-23 | docs | **Strong.** Shows exactly what a customer authors and what the vendor forbids them to set. Method X. |
| **S24** | GitLab Research Reveals Organizations Are Generating AI Code Faster Than They Can Control It | GitLab IR (Harris Poll survey) | **2026-06-23** | https://ir.gitlab.com/news/news-details/2026/GitLab-Research-Reveals-Organizations-Are-Generating-AI-Code-Faster-Than-They-Can-Control-It/default.aspx | 2026-09-23 | press (vendor-commissioned survey) | **Medium.** Vendor-commissioned but methodologically stated (n, countries, pollster). Self-serving direction — GitLab sells the remedy. Method X. |
| **S25** | AGENTS.md customization files / Custom rules | GitLab Docs | undated | https://docs.gitlab.com/user/duo_agent_platform/customize/agents_md/ ; https://docs.gitlab.com/user/duo_agent_platform/customize/custom_rules/ | 2026-09-23 | docs | **Medium-strong.** File locations and precedence for repo-resident instructions. Method X (via search-result summarization; lowest confidence of the docs set). |

---

## § Evidence

### GitLab as producer — its own factory

**[E1]** (S1, 2026-03-27) The playbook's five "core principles," stated as coming from "teams that
have shipped production code with agents at GitLab":

> "Failing test before every feature. Never give an agent a task without a failing test. The test defines 'done' for the agent and catches regressions in CI."
> "Fix the environment, not the prompt. When an agent produces bad code, don't write a better prompt. Add a lint rule, a test, or a doc. Environment fixes persist across sessions; prompts don't."
> "Constraints are multipliers. One CI gate catches more bugs than a thousand lines of prompt instructions. Encode rules in CI, not in natural language."
> "Repo is the single source of truth. Architecture decisions, quality standards, and coding conventions belong in the repo where agents (and humans) can read them. Not in Slack, not in a Google Doc."
> "Ask the agent to challenge you. Agents are agreeable by default. ... Encode this in your Skills or AGENTS.md so it applies every session."

**[E2]** (S1, 2026-03-27) A five-level autonomy ladder, defined by *what the human does* versus
*what the agent does*:

| Level | Name | What the human does | What the agent does |
|---|---|---|---|
| 1 | Baseline | Writes everything | Autocomplete suggestions |
| 2 | Pair | Designs and reviews | Writes code |
| 3 | Conductor | Steers in a tight feedback loop | Executes a single task end-to-end |
| 4 | Orchestrator | Manages multiple async agents | Runs parallel workstreams |
| 5 | Harness | Sets architecture and quality bar | Everything else |

with the gating rule: "Skipping to level 4 or 5 without the right infrastructure produces unreliable
output and amplifies technical debt. Reach Level 2 on the maturity grid first."

**[E3]** (S1, 2026-03-27) The named production loop, given as a flowchart:
`Fetch issue + requirements → Collaborate on plan → Write tech spec → Agent implements →
Automated verification (CI + tests) → [fails: back to implement] → Adversarial review →
[issues found: back to implement] → Open MR → Garbage collection → (next issue)`.

**[E4]** (S1, 2026-03-27) "The harness" is defined as exactly three components: "Context —
AGENTS.md + Skills", "Constraints" enforced in CI, and "Garbage Collection — TODO scan + coverage
check + doc sync", with the merge path shown as `CI Pass → Human reviews → Approved → Merge`.

**[E5]** (S1, 2026-03-27) On why CI rather than prompting: "Prompts are suggestions. CI is a gate.
If the agent can break a rule and still pass the pipeline, the rule doesn't exist."

**[E6]** (S1, 2026-03-27) A named agent failure mode and its mechanical counter: "Test count guard
prevents agents from deleting tests to make them pass (a known failure mode)," implemented as a CI
job that fails "if test count decreases without a `skip-test-count-check` label."

**[E7]** (S1, 2026-03-27) Enumerated constraint classes to enforce in CI: "Layer boundaries",
"Forbidden patterns", "API schemas" (contract test against OpenAPI), "Test count", "Secrets and
deps" ("Secret Detection + Dependency Scanning required to pass before merge"), and
"Domain-specific reviews" via `.gitlab/duo/mr-review-instructions.yaml`.

**[E8]** (S1, 2026-03-27) A three-layer context hierarchy: Global `~/.claude/CLAUDE.md`
("~20 lines"), Project `AGENTS.md` at repo root ("Build/test/lint commands, repo structure,
conventions, off-limits files"), Module `AGENTS.md` in subdirectories ("use sparingly").

**[E9]** (S1, 2026-03-27) A four-dimension maturity grid — "CI and Constraints", "Context and Docs",
"Testing Depth", "Review Practice" — scored 0–3, with Level 3 "Review Practice" defined as
"AI review in CI + author-reviewer separation".

**[E10]** (S1, 2026-03-27) Role-based personas per phase: discovery = "Product manager + architect"
("Challenge my assumptions"); implementation = "Engineer"; verification = "Tester" ("Try to break
this"); pre-merge = "Adversarial reviewer" ("Find every problem you can — security holes, missing
tests, incorrect assumptions. Do not be encouraging."). "Encode each persona as a Skill so it loads
consistently."

**[E11]** (S1, 2026-03-27) On the factory learning: "When an agent finds a better way to do
something, let it update its own instructions. The next session starts with improved context."
Plus a git-ignored "Session learning log" (`AGENTS.local.md`) that "becomes the institutional memory
of every non-obvious thing the agent had to learn."

**[E12]** (S1, 2026-03-27) Automated "garbage collection" cadence table: stale TODO/FIXME scan
(weekly), test-coverage drift (every MR), doc freshness (weekly), dependency updates (weekly),
"Doc convergence — Agent loop that diffs docs against code and submits corrections ('Ralph
pattern')" (weekly).

**[E13]** (S1, 2026-03-27; S2, 2026-02-18) **Quantity.** The internal reference case:
"Knowledge Graph Orbit — 135K-line Rust codebase, 95% AI-generated, 4 engineers, 259 MRs, 2 weeks.
Worked because CI, AGENTS.md, and architecture docs were in place from day one." S2's fuller
statement: "The Knowledge Graph (Orbit) team has built a 135K-line Rust codebase in which roughly
95% of the code was generated by AI coding agents. A 4-person core team produced 259 MRs across
multiple repos in about 2 weeks."

**[E14]** (S2, 2026-02-18) On how that was achieved: "The engineers applied structured agentic
engineering practices, not ad hoc prompting, but rather deliberate guardrails, agent context files,
custom skills, and CI enforcement."

**[E15]** (S2, 2026-02-18) **Quantity.** The harness took time to build: "The knowledge-graph repo
has built up agentic engineering infrastructure over approximately 4 weeks," itemized as
`AGENTS.md` + `CLAUDE.md` "with CI-enforced sync (`agent-file-sync-check` job)"; skills
(`debug-clickhouse-queries`, `related-repositories`, `remove-llm-comments`); "GitLab Duo MR review
instructions with 3 specialized AI reviewers (security, performance, logging security)"; commitlint;
markdownlint + Vale ("50+ `gitlab_base` rules") + lychee; "Comprehensive CI with 15+ jobs across
lint, security, test, build, deploy, and release stages"; "cargo-audit, cargo-deny, cargo-geiger,
and Semgrep SAST"; templates with auto-labeling; semantic release; `mise.toml`.

**[E16]** (S2, 2026-02-18) Dated MRs that built the harness: "!5 chore: add duo review instructions
(Jan 24)", "!23 docs: add AGENTS.md for AI agent context (Jan 25)", "!19 feat: add
related-repositories SKILL (Jan 25)", "!178 feat(ci): add sync check between AGENTS.md and CLAUDE.md
(Jan 31)", "!266 ci: add markdown linting with markdownlint, Vale, and lychee (Feb 18)".

**[E17]** (S2, 2026-02-18) Admission is still gated: "Every agent-generated change still goes
through CI, security scanning, and code review."

**[E18]** (S2, 2026-02-18) The externalization thesis, stated as a design goal borrowed from
OpenAI: "Agent legibility is the design goal: anything the agent can't access in-context effectively
doesn't exist. To support this, they continuously push context into the repo. Slack discussions,
architectural decisions, and product specs all get encoded as versioned artifacts. We already do
this with [orbit-artifacts], where offsite transcripts and session notes are stored as versioned
markdown alongside the code."

**[E19]** (S2, 2026-02-18) Also: "They treat AGENTS.md as a table of contents, not an encyclopedia.
Repository knowledge lives in structured `docs/` directories rather than a single monolithic file."
And: "Architecture is enforced mechanically via custom linters and structural tests, not
documentation alone."

**[E20]** (S3, undated) GitLab's DevEx team requires per-MR provenance labelling: "we expect every
merge request author to apply a `devex-ai-assistance` scoped label before merging," on a 1–5 scale
from "No AI usage" to "`devex-ai-assistance::5` — Fully AI-driven. AI was used for all elements of
the task with minimal human input beyond prompting and a final review pass."

**[E21]** (S3, undated) Stated rationale for the label includes review calibration: "Over time, it
helps the team calibrate expectations around review depth for heavily AI-assisted MRs."

**[E22]** (S3, undated) Explicit limits: "AI-assisted review, not AI-replaced review. Use AI to help
identify issues faster, not to skip human judgment on correctness or security." Under "What We
Avoid": "Committing AI-generated code without review. All code, AI-assisted or not, goes through
standard review. AI output can be confidently wrong." And "Over-relying on AI for security-sensitive
work. Security decisions require human expertise."

**[E23]** (S3, undated) Guidance on what to encode as an AI review instruction versus a lint:
"Reserve MR review instructions for things that require judgement or context to evaluate ...
Avoid duplicating checks already covered by static analysis. If RuboCop, or Danger can catch it
deterministically, let them — it's cheaper, faster, and raised directly in the IDE."

**[E24]** (S4, 2026-04-14) Internal mandate: "Going forward, all team members are expected to
perform these use cases using Duo as part of our standard development practice" — issue/epic
creation, MR generation, code review assistance ("Run Duo review before human reviewers"), test-case
generation ("as part of the Definition of Done for new features"), documentation generation. Stated
purpose: "to be a true customer zero of our own product."

### What the vendor supplies

**[E25]** (S8, 2026-01-14) Architecture vocabulary: agents (foundational, custom, external); flows;
"One orchestration layer that runs repo-side, within your GitLab environment, with your guardrails";
context described as "Full SDLC context across code, issues, epics, merge requests, CI/CD pipelines,
wikis, analytics, and security scans."

**[E26]** (S7, 2026-01-15) GA feature set: Agentic Chat; Planner Agent; Security Analyst Agent;
custom agents via "AI catalog, a central repository where teams create, publish, manage, and share";
external agents "including Claude Code from Anthropic and Codex CLI from OpenAI"; foundational flows
(Issue-to-MR developer flow, Convert to GitLab CI/CD, Fix CI/CD pipeline, Code Review, IDE software
development). Controls listed: "Group-based access control allows administrators to define
namespace-level rules"; "Model selection allows top-level namespace owners to choose a model";
"LDAP and SAML integration enable governance at scale".

**[E27]** (S7, 2026-01-15) Framing quantity: "Only about 20% of a developer's time is spent writing
code." Commercial terms: Premium "$12 ... in included credits per user" monthly; Ultimate "$24
dollars in included credits per user."

**[E28]** (S9, 2026-08-24) The vendor thesis, Bill Staples: "Code is no longer the bottleneck."
"The constraint moves from producing code to trusting it." "Trust increasingly depends on the
environment around the model: context, verification, governance and evidence." "The model should be
replaceable. The agent should belong to the customer. The organization's memory and controls should
endure." "At machine velocity, provenance becomes part of the execution path itself."
"Software engineering spent sixty years protecting a scarce resource. It will spend the next decade
governing an abundant one."

**[E29]** (S5, 2026-06-10) Orbit's construction: "Ingests software development lifecycle data via
change-data-capture into ClickHouse, parses code in 12 languages (Ruby, Java, Kotlin, Python,
TypeScript, JavaScript, Rust, Go, C#, C, C++, PHP) through the Rails internal API, and serves the
combined graph over a Cypher-like DSL, MCP, REST, and the GitLab CLI." What it indexes: "Issues,
merge requests, pipelines, code, security findings, deployments, and incidents."

**[E30]** (S5, 2026-06-10) **Quantity — vendor internal test.** "Up to 11 times faster", "use up to
4.5 times fewer tokens", "generate up to 45 times fewer hallucinations", measured as "Claude Code
connected to Orbit versus without Orbit on identical tasks."

**[E31]** (S6, 2026-06-10) The same three figures are stated differently in the Transcend post:
"up to 11 times faster response, were up to 4.5 times more cost effective" and "up to 45 times fewer
hallucinations," attributed to "GitLab's early internal tests." **Note the drift:** *fewer tokens*
(S5) versus *more cost effective* (S6) are not the same claim. Record the S5 wording as primary.

**[E32]** (S5, 2026-06-10) **Quantity — named customer A/B.** Compare the Market tested context
strategies "across 79 real merge requests": the Orbit-grounded reviewer placed accurate inline
comments "70% ... (0.696 accuracy)" versus "58% (0.577) for RAG" (S6 wording), and captured
"68% of key changes in summaries versus 66% for RAG" (S5 wording). The comparison used "the same
prompts and models."

**[E33]** (S5, 2026-06-10) **Quantity — indexing scale.** "At GitLab's scale, the indexer covers
over 40,000 projects, 500 million nodes, and 2 billion edges in under 45 minutes."

**[E34]** (S6, 2026-06-10) Next-generation SCM claim: "up to 2x fewer tokens, up to 50x faster wall
clock time, and up to 1,000x less network."

**[E35]** (S6, 2026-06-10) Governance for agents (private beta at announcement) "puts identity,
policy, audit, and approval around every agent action," with "real-time visibility into inputs,
reasoning, tool calls, and high-risk or anomalous activity." Problem statement: "Teams can lose
track of which agent acted, under which policy, and who approved it, with no consistent way to
define where agents operate independently, where humans must review, and where activity stops."

### How customer intent enters the generic machinery

**[E36]** (S10, undated) Four documented mechanisms, each a file the customer authors:

| Mechanism | Applies to | File location |
|---|---|---|
| Custom rules | Duo Chat, agents, flows (not Code Review Flow) | `.gitlab/duo/chat-rules.md` |
| `AGENTS.md` | Duo Chat, flows (not Code Review Flow) | project root (+ subdirectories) |
| MR review instructions | Code Review Flow only | `.gitlab/duo/mr-review-instructions.yaml` |
| Agent Skills | Duo Chat, flows (not Code Review Flow) | `skills/<skill-name>/SKILL.md` |

**[E37]** (S25, undated) `AGENTS.md` is positioned as adoption of an external standard: "GitLab Duo
supports the AGENTS.md specification, an emerging standard for providing context and instructions to
AI coding assistants ... these details are available for GitLab Duo Agent Platform and any other AI
tool that supports the specification." Locations: `~/.gitlab/duo/AGENTS.md` (global),
`<repo-root>/AGENTS.md`, `<any-dir>/AGENTS.md`.

**[E38]** (S25, undated) A staleness property: "Only new conversations and flows created after you
add or update AGENTS.md files follow the new instructions. Previously existing conversations do not."

**[E39]** (S3, undated) Worked example of codified standards — an `mr-review-instructions.yaml` with
`fileFilters` scoping rules to `spec/**/*.rb` and `**/*.rb`, e.g. "If error handling swallows
exceptions silently, flag it and ask whether the failure should be surfaced." Duo's violation
comment format: "According to custom instructions in '[rule name]': [feedback]".

**[E40]** (S23, undated) Custom flows are authored YAML against "flow registry v1", with fields
"`version`, `environment`, `components`, `prompts`, `routers`, and `flow`". The vendor constrains
what the customer may express: `environment` "supports only the `ambient` value"; the `model` field
"inside a `prompts` entry is not supported"; `response_schema_id`, `response_schema_version`,
`ui_role_as` are blocked; top-level `name`, `description`, `product_group` are "rejected". "If
invalid values are provided, the schema validation fails and the flow does not run."

**[E41]** (S22, undated) Reuse and accumulation: "The AI Catalog is a central list of agents and
flows." "Each custom agent and flow in the AI Catalog maintains a version history. When you make
changes to an item's configuration, GitLab automatically creates a new version"; "versions are
immutable"; visibility is public / private / restricted-to-top-level-group; "GitLab pins the latest
version."

### Customer-side integration burden

**[E42]** (S14, undated) Flows from the UI run on the customer's CI: "Flows executed from the GitLab
UI use CI/CD"; "Flows executed in an IDE run locally." Runner obligations: "Add the `gitlab--duo`
tag to the runner"; "Configure the runner to use an executor that supports Docker images, like
`docker`, `docker-autoscaler`, or `kubernetes`"; "The `shell` executor is not supported"; for
self-managed, "Create an instance runner or a group runner assigned to the top-level group."
Network: "Allow outbound connections from the GitLab instance to the Agent Platform" and "from the
runner to the Agent Platform." Sandbox: "set `privileged = true` in your runner configuration."

**[E43]** (S16, undated) Self-managed Orbit is a separate distributed system the customer operates:
"GitLab Orbit is distributed only as a Helm chart for Kubernetes. The Linux package does not include
it." Components named: Kubernetes cluster, PostgreSQL logical replication, Siphon, NATS JetStream,
ClickHouse. Status: "GitLab Orbit on GitLab Self-Managed is in beta. This feature is available for
testing, but not ready for production use." "GitLab Orbit does not run on a GitLab Geo secondary
site." "Because GitLab Orbit on GitLab Self-Managed is in beta, contact your account team before you
plan a deployment to confirm current limitations."

**[E44]** (S15, undated) Orbit's lineage and coverage limits: "Introduced in GitLab 18.10 with a
feature flag named `knowledge_graph`. Disabled by default."; "Changed to beta in GitLab 19.1";
"Introduced for GitLab Self-Managed in GitLab 19.2.2". Indexed: "groups, projects, users, merge
requests, pipelines, jobs, work items, milestones, labels, and security findings" plus "files,
directories, function and class definitions, and cross-file import references." Limits: "Code is
indexed from the default branch only"; "GitLab Orbit Local indexes code only. SDLC data—merge
requests, pipelines, work items—requires GitLab Orbit Remote."

**[E45]** (S13, undated) External agents carry per-vendor credential burden: Claude Code and Codex
"use GitLab-managed credentials and require no additional setup beyond enablement"; Amazon Q
requires `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION_NAME` / `AMAZON_Q_SIGV4`;
Gemini requires `GOOGLE_CREDENTIALS` / `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_LOCATION`.

**[E46]** (S13, undated) A stated asymmetry in guarantees: external agents lack "the same level of
network isolation and security restrictions that are applied to GitLab native agents," GitLab's
"prompt injection scanning is unavailable," and "third-party providers manage their own security
controls." Also "Not available on GitLab Duo with self-hosted models."

### Authority, identity, and admission

**[E47]** (S12, undated) "Composite identity is an authentication and authorization mechanism that
combines two identities into a single token: A service account. The agent that performs the actual
actions. A human user. The person who initiated the request." Evaluation: "a combination of the
user's role and the service account's Developer role, whichever is more restrictive." Reach: "all
projects that both: The user has access to. The service account has been added to." Scopes: "OAuth
tokens used for composite identity in AI workflows have access restricted to the `ai_workflows` and
`mcp` scopes."

**[E48]** (S12, undated) Attribution rule: "When a flow creates a merge request, the merge request is
attributed to the human user who triggered the flow instead of the service account," though "the
service account creates the commits and opens the merge request." Limit: composite identity applies
to "flows and agents [that] execute on runners" and not to "GitLab Duo Agentic Chat in the UI and
IDE."

**[E49]** (S11, undated) Tool-call governance has three modes: "Always Allow — The tool executes
silently without prompting the user"; "Always Ask — The user is shown an inline approval card and
must approve or reject"; "Always Deny — The tool is blocked entirely and is invisible to the agent."
Default matrix: read GitLab resources = Always Allow; read local files = Always Ask; write = Always
Ask; delete = Always Ask.

**[E50]** (S11, undated) Who holds the setting, and in which direction it can move: group-level
requires "the Owner role for the top-level group", project-level "Maintainer or Owner role for the
project", and "Project-level rules override group-level rules for the same tool, but can only be
equal to or stricter than the group-level rule."

**[E51]** (S17, GitLab 19.1, beta) The clearest admission-authority statement in the public record:
"The flow never sets the **Approve** state, even when it finds no issues." Plus: "Security Review
Flow results are AI-generated and are advisory input, not an authoritative or complete security
assessment" and "Treat findings as input that needs human judgment, not as a final verdict."

**[E52]** (S18, undated) Code Review Flow "Analyzes code changes ... Delivers detailed review
comments with actionable feedback," triggered by assigning `@GitLabDuo` as reviewer, the
`/assign_reviewer @GitLabDuo` command, an `@GitLabDuo` mention, the REST API, or Agentic Chat.
**The page does not state that it can approve, and does not state that human review remains
required** — an absence worth citing as such.

**[E53]** (S19, 2026-07-16) Agentic repair inside the pipeline: "When a merge request that bumps
dependency versions has a pipeline fails on a breaking change, GitLab Duo analyzes the pipeline
errors, the dependency's changelog, and how your code uses the dependency. GitLab Duo commits fixes
to the same MR and re-runs the pipeline until the pipeline passes."

**[E54]** (S20, 2026-07-21) InfoQ's characterization of the same release: agents cannot merge
independently — "A maintainer still has to review and approve every change before it merges" and
the flow "never approves a merge request on its own; a person still makes the final call."
**Third-party wording; S19 does not state the constraint this flatly.**

**[E55]** (S21, GitLab 19.1 beta → default in 19.2) "Use the AI audit event report for a unified,
browsable record of GitLab Duo agent activity." Each session records "the agent type (workflow
definition)," "the project the session ran in," "the number of audit events in the session," and
"the session start time," with "session metadata and a chronological list of audit events." Access:
"You have the Owner role for the top-level group." Introduced "in GitLab 19.1 as a beta with a
feature flag named `agent_artifacts_page`. Disabled by default. Enabled by default in GitLab 19.2."

**[E56]** (S19, 2026-07-16) Audit-event identification for downstream tooling: when an audit event
relates to the Agent Platform, "the details object includes a `duo_related` field set to `true`,"
usable "in your Security Information and Event Management (SIEM) tool."

### The problem the vendor says the market has

**[E57]** (S24, 2026-06-23) **Quantity.** Harris Poll survey for GitLab, "1,528 developers and
technology buyers across six countries": "91% of organizations have two or more AI coding tools in
active use"; "54% have three or more"; "78% report that developers are writing and committing code
faster"; "73% say overall code quality has improved."

**[E58]** (S24, 2026-06-23) **Quantity — the governance gap.** "43% of respondents reporting that
they cannot reliably distinguish AI-generated code from human-written code"; "92% report some form
of governance challenge with AI-generated code"; "85% agree AI has shifted the bottleneck from
writing code to reviewing and validating it"; "80% agree their organization adopted AI tools faster
than it developed policies to govern them."

**[E59]** (S20, 2026-07-21) A commissioned Forrester study reported "a 400 percent return on
investment with payback in under six months" for Duo Agent Platform users. Vendor-commissioned;
weak evidence.

---

## § Claims

### Where work originates

**[C1]** In GitLab's own factory, a change originates from an issue and passes through an explicit
pre-realization step — a collaboratively refined plan and a written tech spec — before an agent
implements anything. Origination is human and is not the same act as realization. [E3]

**[C2]** In the product GitLab sells, origination is deliberately plural and mostly customer-owned:
a human in chat, an issue routed to the Developer (issue-to-MR) flow, a scheduled or triggered
custom flow, a dependency scan finding, or a review request. The vendor supplies triggers; what is
worth changing remains the customer's. [E26] [E52] [E53]

**[C3]** A notable machine-originated class does exist and is narrow: a dependency vulnerability
causes an MR to exist without a human asking. This is the one place in the public record where the
factory originates its own work. [E53]

### What humans do

**[C4]** GitLab's internal doctrine assigns humans four things: intent, plan/spec, the architecture
and quality bar, and the merge decision. The autonomy ladder is written as a redistribution of those
four, and even its top rung ("Harness") retains "Sets architecture and quality bar" for the human.
[E2] [E4]

**[C5]** GitLab treats *how much a human did* as metadata worth recording per change, on a five-point
scale applied before merge — provenance of authorship as a first-class review input, explicitly so
reviewers can calibrate review depth. This is a governance move the other cases rarely make
explicit. [E20] [E21]

**[C6]** Human judgment is fenced off by policy in two named areas: security decisions, and final
correctness review. GitLab states the fence as a rule about what AI must not replace, not as a
capability limit. [E22]

### What agents do

**[C7]** GitLab's strongest internal datum is a bounded, high-share result: a 135K-line Rust service,
roughly 95% agent-generated, 259 MRs, four engineers, about two weeks. It is a greenfield service by
a team that had built the harness first, not a claim about GitLab's monolith. Use it as an
existence proof about *realization share under a harness*, not as an organizational average.
[E13] [E14]

**[C8]** The same source is unusually honest about cost of entry: the harness took about four weeks
to build and comprises CI-enforced context sync, three specialized AI reviewers, 15+ CI jobs, four
security scanners, doc linting, and commit/release automation. The 2-week/259-MR figure sits on top
of that 4-week investment — which is the factory-startup-cost structure §5.1 describes, observed in
the wild. [E15] [E16]

**[C9]** Agents at GitLab perform review as well as implementation, but in a strictly advisory
capacity, and the repo it was measured in ran three specialized AI reviewers (security, performance,
logging security) alongside human review. [E15] [E24] [E51]

### What the fabricator inherits

**[C10]** GitLab's answer to "how does organization-specific intent enter generic machinery" is:
**as files in the customer's repository**. Four documented entry points, each with a fixed path —
`AGENTS.md`, `.gitlab/duo/chat-rules.md`, `.gitlab/duo/mr-review-instructions.yaml`,
`skills/<name>/SKILL.md` — plus the customer's CI configuration and, optionally, an authored flow
YAML. The vendor ships the reader; the customer writes what is read. [E36] [E37] [E39] [E40]

**[C11]** GitLab states the underlying principle explicitly and normatively: "Repo is the single
source of truth ... Not in Slack, not in a Google Doc," and "anything the agent can't access
in-context effectively doesn't exist." This is the externalization thesis of §5.3 asserted by the
vendor as engineering doctrine — and GitLab reports acting on it by converting offsite transcripts
and session notes into versioned markdown in the repo. [E1] [E18]

**[C12]** Orbit is the vendor's attempt to supply, as infrastructure, the relational context a
customer would otherwise have to state: a property graph over projects, MRs, pipelines, work items,
security findings, deployments, incidents, and cross-file code structure, queryable by any agent
over MCP/REST/CLI. It is context *recovered from the customer's existing artifacts*, not intent the
customer authored. [E29] [E44]

**[C13]** GitLab claims a measurable grounding benefit for that recovered context, and — unusually —
has a named customer replicate it against controls: 70% vs 58% inline-comment accuracy over 79 real
MRs with prompts and models held fixed. That is a comparatively strong quantitative claim for a
vendor context layer, though the absolute numbers are modest. [E30] [E32]

**[C14]** The inheritance has documented holes the book should name: code is indexed from the
default branch only; Orbit Local sees code but no SDLC data; `AGENTS.md` changes do not propagate to
in-flight sessions. What the fabricator inherits is a *snapshot with a shape*, not the organization.
[E38] [E44]

### What the agent may decide for itself

**[C15]** GitLab converts realization freedom into a per-tool, per-namespace policy rather than a
per-prompt instruction: every tool call is Always Allow, Always Ask, or Always Deny, with a default
matrix that is permissive for reads of GitLab resources and interrupting for local reads, writes,
and deletes. Freedom is configured, not negotiated. [E49]

**[C16]** That configuration is hierarchical and monotone in one direction: a project may make a rule
stricter than its group, never looser. Realization freedom is therefore a bounded lattice owned by
the top-level group Owner — a structural answer to "who decides what the agent may decide." [E50]

**[C17]** The vendor also bounds what a customer may express. Custom flows may not select a model,
may not declare response schemas, and run only in the `ambient` environment; invalid values cause the
flow not to run at all. The factory-in-a-box constrains its buyer as well as its agents. [E40]

**[C18]** Freedom is *lower* for external agents, and GitLab says so: no prompt-injection scanning,
weaker network isolation, third-party-managed controls. Model pluralism is real but is purchased
with a stated reduction in guarantees — a trade the book can quote rather than infer. [E45] [E46]

### Where quality is established

**[C19]** GitLab's doctrine puts quality establishment *before* the agent, in the environment:
"Fix the environment, not the prompt"; "Prompts are suggestions. CI is a gate. If the agent can
break a rule and still pass the pipeline, the rule doesn't exist"; "One CI gate catches more bugs
than a thousand lines of prompt instructions." This is the sharpest published statement of
control-over-instruction found in this corpus. [E1] [E5]

**[C20]** It names an agent-specific failure mode and answers it mechanically rather than by
instruction: agents delete tests to make them pass, so a CI job fails when the test count decreases
without an explicit label. This is exactly the "supervision must move into the production system"
pattern §5.1 develops. [E6]

**[C21]** Quality sits at four distinct stations in GitLab's loop: a failing test authored *before*
the agent starts; CI constraints between implementation and review; adversarial review before the MR
opens; and human review before merge. Verification is not one gate but a staircase, and the first
station precedes realization. [E1] [E3] [E4]

**[C22]** GitLab distinguishes what belongs to deterministic analysis from what belongs to an AI
reviewer, and says so in cost terms: if RuboCop or Danger can catch it deterministically, let them;
reserve AI review instructions for "things that require judgement or context to evaluate." This is a
published routing rule between the two kinds of control. [E23]

**[C23]** Quality standards themselves are treated as authored artifacts under version control and
CI enforcement — including a CI job that fails if `AGENTS.md` and `CLAUDE.md` drift out of sync.
The instructions to the fabricator are themselves a governed artifact. [E15]

### Who or what holds admission authority

**[C24]** In every documented GitLab flow, admission authority is human and is expressed as a
withheld capability rather than a recommendation: "The flow never sets the Approve state, even when
it finds no issues." A machine may produce, repair, and advise; only a person approves. [E51]

**[C25]** Agent action is nonetheless given an identity that can hold authority-relevant limits.
Composite identity binds a service account to the triggering human and evaluates the *more
restrictive* of the two roles, with tokens scoped to `ai_workflows` and `mcp`. Authority is
intersected, not inherited — and privilege escalation through an agent is structurally foreclosed.
[E47]

**[C26]** The attribution rule is a deliberate and debatable choice: commits are made by the service
account, but the merge request is attributed to the human who triggered the flow. GitLab has chosen
human accountability over mechanical authorship in the record a reviewer sees. The book can note
the tension with [C5]'s provenance labelling — one mechanism hides the agent, the other surfaces it.
[E48] [E20]

**[C27]** Admission evidence is being industrialized separately from admission itself: per-session AI
audit artifacts, a `duo_related` flag for SIEM ingestion, and a top-level-group-Owner-gated audit
report. GitLab is building the *record* that a human decision was made and under what policy,
without moving the decision. [E35] [E55] [E56]

**[C28]** GitLab's own market research argues that its customers cannot presently discharge that
authority: 43% cannot distinguish AI-generated from human-written code, 85% say the bottleneck has
moved to reviewing and validating, 80% adopted the tools before the policies. The claim is
self-serving — GitLab sells the remedy — but it states the factory-in-a-box problem precisely:
the vendor can ship the machinery and the evidence, and cannot ship the capacity to judge.
[E57] [E58]

### How experience changes the factory

**[C29]** GitLab describes a closed learning loop in which the *instructions* are the learning
substrate: the agent is permitted to update `AGENTS.md` and skills when it finds a better way, and a
session learning log accumulates "every non-obvious thing the agent had to learn" so "it doesn't
make the same mistake twice." Episode knowledge becomes inherited structure. [E11]

**[C30]** Maintenance of that structure is itself automated on a cadence: weekly TODO scans, weekly
doc-freshness checks, a "Ralph pattern" agent loop that diffs docs against code and opens
corrections, and per-MR coverage-drift warnings. This is a published answer to §5.1's "the idle
factory still depreciates": GitLab budgets agents to fight capital decay. [E12]

**[C31]** GitLab maturity-models the factory so that experience can be assessed, not merely accrued:
a 0–3 grid over CI/constraints, context/docs, testing depth, and review practice, with a hard gate
— reach Level 2 before exceeding autonomy Level 1. Readiness for agent autonomy is treated as a
property of the *environment*, not of the model. [E2] [E9]

**[C32]** Across organizations, learning is packaged as versioned, shareable artifacts: the AI
Catalog gives custom agents and flows semantic versions, immutable releases, and public/private/
group-restricted visibility. The vendor supplies distribution for organizational learning; the
learning is still the customer's to produce. [E41]

**[C33]** GitLab's own practice is a reflexive case of [C32]: it converted one team's successful
harness into a documented reference implementation with the explicit purpose that "other teams at
GitLab have expressed interest in understanding and replicating these practices," then published the
generalization as a handbook playbook seven weeks later. The factory's experience propagated as a
document, not as a tool. [E2] [E1]

### Cross-cutting

**[C34]** GitLab is the corpus's cleanest instance of the two-interface structure the section names:
upstream, organization-specific intent enters through customer-authored files, CI, and runners;
downstream, organization-specific authority governs through group-owned tool policy, approval
withholding, and audit records the customer reads. The vendor owns the middle — fabrication,
orchestration, context recovery, evidence plumbing — and owns neither end. [C10] [C15] [C24] [E36]

**[C35]** The buyer's integration burden is concrete enough to cost out, and larger than the product
narrative implies: tagged Docker-capable runners (privileged, for the sandbox), outbound network
paths, per-vendor cloud credentials for non-native agents, authored instruction files at four paths,
optionally authored flow YAML — and, for self-managed context, a Kubernetes cluster running
PostgreSQL logical replication, Siphon, NATS JetStream and ClickHouse, in beta, with an instruction
to contact the account team first. The "box" requires substantial customer-side construction before
it produces anything. [E42] [E43] [E45]

**[C36]** GitLab's public vendor thesis and its public internal practice agree on the load-bearing
point and disagree on emphasis. The CEO essay locates trust in "context, verification, governance and
evidence" around a replaceable model [E28]; the engineering handbook locates it in failing tests, CI
gates, and repo-resident context [E1]. The book can use this: the sellable layer is the one that
generalizes across customers, while the layer that actually produced GitLab's 95%-agent-generated
service is the one only the customer can author.

---

## [GAPS] — what the public record does not answer for GitLab

1. **No organization-wide realization share.** GitLab publishes one team's 95% figure on one
   greenfield Rust service [E13] and nothing about the share of agent-authored change in the GitLab
   monolith, or across R&D. The DevEx `devex-ai-assistance` labels exist [E20] but **no aggregate
   distribution of those labels is published**, despite the stated rationale being "to build a
   clearer picture." The measurement exists internally and is not public.

2. **No defect or escape data.** Nothing in the corpus reports defect rates, rollback rates,
   revert rates, incident attribution, or review-effort change for agent-authored versus
   human-authored MRs — at GitLab or at any named customer. The only outcome numbers are speed,
   tokens, hallucination counts, a review-comment-placement accuracy, and a commissioned ROI figure.

3. **"Hallucinations" is undefined.** The "45x fewer hallucinations" claim [E30] carries no
   definition, rater protocol, sample size, or task set. It is unusable as evidence beyond
   "GitLab asserts a large grounding effect."

4. **The two statements of the 4.5x figure disagree.** "Fewer tokens" [E30] versus "more cost
   effective" [E31] are different quantities from the same test. The book should not print either
   without flagging the drift.

5. **Silence on how *consequential* requirements are represented.** Every documented entry point
   carries conventions, commands, structure, and review preferences [E36]–[E39]. Nothing in the
   corpus describes how a customer represents a regulatory obligation, a safety property, an
   architecture decision whose violation is catastrophic, or a domain invariant — nor any mechanism
   that checks a change against such a property. The word "policy" in GitLab's governance material
   consistently means *agent-permission policy*, not *engineering property*. **This is the central
   gap for the book's argument and should be stated as such.**

6. **No account of what happens when the repo is wrong.** GitLab's doctrine is "repo is the single
   source of truth" [E1], but nothing addresses stale `AGENTS.md`, contradictory nested instruction
   files, or instructions that encode a superseded architecture — beyond a weekly doc-freshness job
   [E12] and the non-propagation note [E38].

7. **Code Review Flow's approval posture is undocumented.** The Security Review Flow page states the
   approval prohibition explicitly [E51]; the Code Review Flow page states neither that it can
   approve nor that human review remains required [E52]. The only flat statement that a maintainer
   must approve every change is third-party [E54]. Whether the prohibition is a platform invariant
   or a per-flow choice is **not established by the public record**.

8. **Governance for Agents was private beta at announcement** [E35] and no public documentation of
   its policy language, evaluation semantics, or enforcement points was located. What "policy" can
   actually express — and whether it can gate on properties of the *change* rather than the
   *action* — is unknown.

9. **No customer-side adoption cost is published.** There is no account of how long a customer takes
   to reach the maturity level GitLab's own playbook says is prerequisite [E2] [E9], nor any case
   study of a customer authoring the instruction files, nor any measure of how factory output varies
   with the quality of what the customer wrote. The factory-in-a-box's dependence on buyer
   externalization is asserted by structure and never measured.

10. **The Flow/Agent Registry design is not retrievable.** The handbook design document exists as a
    URL but returned no content (see failed fetches). Versioning, distribution, and approval
    semantics for flow definitions beyond the AI Catalog surface [E41] are unverified.

11. **No account of agent-to-agent composition at scale.** Flows compose agents [E40] and the vendor
    speaks of "hundreds" of agents acting [E35], but nothing describes conflict, concurrent mutation
    of the same repository, ordering, or what happens when two flows disagree.

12. **Undated documentation.** Most GitLab Docs pages used here carry no publication or
    last-modified date on the fetched content [S10]–[S18], [S21]–[S23], [S25]. For a book that
    distinguishes 2024 from 2026 claims, these are dated only by access (2026-09-23) and, where
    available, by an in-page "Introduced in GitLab <version>" note.
