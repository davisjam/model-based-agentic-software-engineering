# Zenseact — factory-case evidence crawl

**Crawled:** 2026-09-23 · **Scope:** the current public record of how Zenseact builds and
changes software with agents.

**Headline for the rewrite wave.** The public record on Zenseact contains exactly **one**
substantive company-authored source: a May 2026 whitepaper describing an internal agent
platform called ZAP. That platform is **not a software-production system**. Its agents
answer questions over enterprise systems (SAP, JIRA, Gerrit, Zuul, Confluence,
SharePoint, Elasticsearch); nothing in the record shows an agent authoring, changing, or
merging code. Separately, a vendor case study documents a genuine safety-critical
verification regime (SPARK proofs in CI, ASIL-D requirement-to-contract checks) — but that
account is undated, names no engineer, and has **no stated connection to agents**. The two
halves do not meet anywhere in the public record. See [C9] and [GAPS].

---

## § Sources

| ID | Title | Publisher / author | Published | URL | Accessed | Type | Weight |
|---|---|---|---|---|---|---|---|
| **[S1]** | "A platform for scalable enterprise AI agents" | Zenseact — Philip Dufwa and Thomas Luvö | **2026-05-29** (labelled "Reports", 13 min read) | https://zenseact.com/news/a-platform-for-scalable-enterprise-ai-agents/ | 2026-09-23 | `eng-blog` (company-authored whitepaper) | **STRONG.** Substantive technical account: named architecture, named mechanisms, a config example, a failure-taxonomy table, one measured quantity. Company-authored and self-advocating in its conclusion, but it describes mechanisms rather than selling a product. **The only substantive source in this crawl.** |
| **[S1a]** | Figure in [S1]: skill-disclosure-miss taxonomy table | Zenseact (image asset in [S1]) | 2026-05-29 | https://zenseact.com/wp-content/uploads/2024/05/screenshot-2026-05-29-at-08.17.27.png | 2026-09-23 | `eng-blog` (figure) | STRONG. Read directly from the image; three-row Miss type / Trigger / Resolution table. |
| **[S1b]** | Figure in [S1]: `agents/financials/config.yaml` example | Zenseact (image asset in [S1]) | 2026-05-29 | https://zenseact.com/wp-content/uploads/2024/05/screenshot-2026-05-29-at-08.36.52.png | 2026-09-23 | `eng-blog` (figure) | STRONG. Concrete agent definition; names model, skills, channels, delegation allow-list. |
| **[S1c]** | Figure in [S1]: ZAP system-overview ASCII diagram | Zenseact (image asset in [S1]) | 2026-05-29 | https://zenseact.com/wp-content/uploads/2024/05/screenshot-2026-05-29-at-08.40.31.png | 2026-09-23 | `eng-blog` (figure) | MODERATE. Component topology only. |
| **[S2]** | "Case Study: Zenseact — Zenseact Chooses SPARK for Automotive Safety" | AdaCore (vendor) | **No date shown on the page**; site footer reads "Copyright © 2026 AdaCore" | https://www.adacore.com/case-studies/zenseact-chooses-spark-for-automotive-safety | 2026-09-23 | `third-party` (supplier case study) | **MODERATE-WEAK.** Names real mechanisms (SPARK in CI on every commit; ASIL-D requirement-to-contract checks) but is a supplier's marketing case study: **no date, no named Zenseact engineer, no direct quotation from Zenseact, no quantities.** Nothing in it mentions agents or AI. |
| **[S3]** | Zenseact Insights index | Zenseact | continuously updated | https://zenseact.com/insights/ | 2026-09-23 | `docs` | Used only to confirm [S1]'s date/type and to enumerate what else Zenseact publishes. Establishes an absence (see [E20]). |
| **[S4]** | "Building clarity, safety, and agility" | Zenseact — Marcus Nilsson, VP of Engineering | 2025-11-24 (Story, 2 min read) | https://zenseact.com/news/building-clarity-safety-and-agility/ | 2026-09-23 | `eng-blog` | **WEAK / near-zero for this book.** Leadership-culture interview on agile practice and psychological safety. Contains no platform-team/domain-team structure, no CI, no review, no metrics. Recorded because it is the *only other* Zenseact statement on engineering organization. |
| **[S5]** | "Reimagining engineering" (podcast, 52:35) | Zenseact — host Veronika Nihlén (Head of Brand and Communications) with guest Wasil Rezk (BeyondMath) | 2026-02-09 | https://zenseact.com/news/reimagining-engineering/ | 2026-09-23 | `talk` (podcast) | **NOT USABLE as Zenseact evidence.** It is Zenseact-hosted but the technical content is the *external guest's* product (BeyondMath physics foundation models). It describes neither Zenseact's own workflow nor its factory. |
| **[S6]** | Zenseact GitHub organization | Zenseact | continuously updated | https://github.com/zenseact | 2026-09-23 | `docs` | Establishes an absence: ten public repositories, all autonomous-driving research / datasets / testing; **no ZAP, no agent, skill, or developer-platform repository.** |
| **[S7]** | `zenseact/zmbt-framework` — "Zenseact Model-based Testing Framework" (C++, Apache-2.0) | Zenseact | no release; README states active development | https://github.com/zenseact/zmbt-framework | 2026-09-23 | `docs` | WEAK-MODERATE. Real Zenseact-published quality machinery, but self-described as prototype, and the README makes no ISO 26262 / safety-critical-use claim and no agent connection. |
| **[S8]** | "High-Performance Computing as a Service: Powering Autonomous Driving at Zenseact" | TechTarget ("Driving IT Success" blog; HPE-facing) | **No date shown on the page; no author named** | https://www.techtarget.com/searchcio/DrivingITSuccess/High-Performance-Computing-as-a-Service-Powering-Autonomous-Driving-at-Zenseact | 2026-09-23 | `press` (vendor-sponsored-style) | **WEAK.** Quotes named Zenseact executives (Robert Tapper, CIO; Ödgärd Andersson, CEO) and gives data-scale figures, but it is infrastructure/supplier content, undated, and says nothing about software production or agents. Context only. |
| **[S9]** | Zenseact site "About Zenseact" footer blurb (appears on [S1]) | Zenseact | as served 2026-09-23 | https://zenseact.com/news/a-platform-for-scalable-enterprise-ai-agents/ | 2026-09-23 | `docs` | Organizational scale and ownership only. |

### Fetch attempts that failed or returned nothing usable

Recorded per the brief rather than silently substituted.

- Searched for a Zenseact conference talk or presentation on ZAP by Dufwa or Luvö — **none found.**
  Search surfaced only [S1] itself plus unrelated LinkedIn profiles.
- Searched for third-party analysis or commentary on the ZAP whitepaper — **none found.** Every
  result either restated [S1] or was a different company (Zencoder, Zensar/ZenseAI, Zenity).
- Searched for any Zenseact statement on AI-assisted *coding* (Copilot / Cursor / Claude Code /
  LLM code generation in their stack) — **no Zenseact-specific result.**
- Searched for Zenseact agent/ZAP news after 2026-05-29 — **none found**; [S1] remains the latest.
- [S1] contains no downloadable PDF and no code blocks; its three figures are PNG screenshots,
  which were downloaded and read directly ([S1a]–[S1c]).
- Zenseact's "speakers and topics" page (https://zenseact.com/speakers-and-topics/, accessed
  2026-09-23) lists six speakers; **none is listed with an AI-agents, software-engineering-practice,
  developer-tooling, or platform-engineering topic.**

---

## § Evidence

### The platform's premise and origin

**[E1]** *(S1, 2026-05-29)* "We built Zenseact AI Platform (ZAP), an AI agent framework on top of
AWS Bedrock to test our hypothesis and our scaling strategy: that the right way to scale agents
across an organization is not to centralize agents, but to distribute ownership and development."

**[E2]** *(S1, 2026-05-29)* "Rather than building a single master application, we built a platform
and an execution framework in which teams define their own agents, own their own tools, and write
their own domain instructions."

**[E3]** — *the prior approach failed.* *(S1, 2026-05-29)* "Initially we approached the adoption of
AI Agents in our organization through using common open-source agentic frameworks and an external
platform. This, however, did not scale. The open-source agentic framework did not provide enough
supporting functions that led to non-generic implementations for each use case that were not
possible to scale to new use cases. This meant that AI tool usage did not expand and measurable
outcomes were lacking. Every new implementation required additional implementation of an agentic
loop, knowledge bases etc."

**[E4]** — *the three deployment questions the account is organized around.* *(S1, 2026-05-29)*
"How do you authenticate users and enforce role-based access to tools that can write to production
systems?" / "How do you manage prompt context when an agent has access to 20+ tools across 10
domains?" / "How do you let a finance team and a CI/CD team each own their agent without creating a
coordination bottleneck?"

### What the work is — and is not

**[E5]** — *the systems the agents reason over.* *(S1, 2026-05-29)* "Enterprise organizations
accumulate data across dozens of systems: ERP (SAP), issue trackers (JIRA), code review platforms
(Gerrit), CI/CD pipelines (Zuul, GoCD), document stores (Confluence, SharePoint), observability
platforms (Elasticsearch), and proprietary internal tools."

**[E6]** — *who the agents serve.* *(S1, 2026-05-29)* "Product development teams – querying JIRA,
Gerrit, Zuul, and Elasticsearch for development workflow insights" / "Finance and operations teams –
querying SAP, SharePoint, and capacity planning tools for budget tracking and forecasting" /
"Support teams – querying service logs and pipeline monitoring tools for diagnostic information".

**[E7]** — *the work product is an answer, not a change.* *(S1, 2026-05-29)* The motivating example
is a question — "Why is the cost variance for Department X higher this quarter, and is it related to
the CI failure rate?" — and the stated payoff is: "An AI agent with access to both data sources,
combined with domain knowledge, can answer this question in a single conversation turn."

**[E8]** — **ABSENCE (recorded as a finding).** Across the whole of [S1] there is **no** mention of
an agent writing code, opening a change, editing a repository, producing a patch, or having a change
merged. The one worked end-to-end example ([E19]) ends in a scorecard table. The word "Gerrit"
appears only as a *data source to query*, never as a destination.

### The platform / domain division

**[E9]** — *what the platform owns.* *(S1, 2026-05-29)* "The **Agent Service** is the core runtime
and handles authentication, session management, tool execution, and the LLM call loop. It does not
contain any business logic."

**[E10]** — *what a domain team owns.* *(S1, 2026-05-29)* "Creating a new agent does not require
modifying the platform. It requires: A directory under agents/ with two files / A config.yaml that
lists which skill modules to load / A SKILL.md that encodes the domain's business rules, formatting
preferences, and tool usage patterns". And: "If the tools already exist, no Python code is needed at
all."

**[E11]** — *the boundary stated explicitly.* *(S1, 2026-05-29)* "This is the mechanism that enables
distributed ownership. The platform team maintains the framework, while domain teams maintain their
agents and tools."

**[E12]** — *the design principle that makes the split hold.* *(S1, 2026-05-29)* "the LLM decides
which tool to call and how to format the output while tools do the actual work. The LLM should not
be performing calculations, string manipulation, or data transformations in its response text. If it
is, you are missing a tool."

**[E13]** — *component topology.* *(S1c, 2026-05-29)* The system diagram shows `Web / CLI / Slack
Bot` → `Agent Service (FastAPI :8000)` → three stores: `Skills (skills/)`, `Agents (agents/)`, and
`Vector DB (RAG)`.

**[E14]** — *a concrete agent definition.* *(S1b, 2026-05-29)* `agents/financials/config.yaml`
declares — Provider: `bedrock`; Model ID: `ModelIDs.GPT_OSS_120B`; Max Tokens: `4,096`; Temperature:
`0.1`; Enabled Skills: `data`, `sap_odata`, `sharepoint`, `excel_export`, `jira`, `chart`,
`capacity_planning`; Channels: web ✅, rest_api ✅, slack ✗; Can Invoke: `product_development`.

### Context routing — the one measured quantity

**[E15]** — *the stated hard problem.* *(S1, 2026-05-29)* "The hardest engineering problem in
multi-tool agents is not to run tool executions, it is to decide **which** tools and **which**
instructions to present to the LLM on each turn, given a limited context window." Scale given: "An
agent with access to 20 skill modules might have 150+ tools".

**[E16]** — *the two-level disclosure mechanism.* *(S1, 2026-05-29)* Level 1 frontmatter is "always
loaded", "typically 1.5–2KB total across all active skills"; Level 2 body is "injected only for skill
packages that are semantically relevant to the **current user query**. After each turn, the previous
injection is removed."

**[E17]** — *the router is deterministic and dependency-free.* *(S1, 2026-05-29)* "The selection
algorithm is deliberately simple: TF-IDF cosine similarity between the user's query and each skill's
frontmatter description, implemented without external ML dependencies. Packages above a similarity
threshold are expanded; if nothing exceeds the threshold, all packages are expanded as a safe
fallback."

**[E18]** — **QUANTITY.** *(S1, 2026-05-29)* "Measured context savings: 67–98% for financial queries
and 43–97% for engineering queries." *(This is the only measured number anywhere in the Zenseact
record. The measurement method, sample, and baseline are not stated.)*

**[E19]** — *the per-turn execution flow.* *(S1, 2026-05-29)* "Selects relevant skill packages via
TF-IDF and injects their instructions / Detects domain-specific intents (e.g., JIRA query, executive
summary request) and injects runtime guidance / Retrieves RAG context (scoped by agent, skill, and
user) and injects it / Enters a tool loop (up to 25 iterations): LLM proposes tool calls → framework
executes them → results are fed back → repeat until the LLM produces a final text response /
Finalizes: strips thinking tags, stores to memory, scores quality, detects skill disclosure misses".
The worked example closes: "Total: 4 tool calls across 2 agents, in a single conversation turn."

### Authority, permission, and the actual "safety envelope"

**[E20]** — *the permission table.* *(S1, 2026-05-29)* "Every tool call passes through a permission
layer before execution. Permissions are configured per-tool and per-role in a YAML file:
auto_approve – execute immediately (default for read-only tools) / confirm – send the tool name and
arguments to the user via SSE, wait for approval before executing / deny – block execution entirely
for that role".

**[E21]** — *the trust boundary.* *(S1, 2026-05-29)* "Tool arguments are validated for injection
patterns before execution. Tool **output** is sanitized to remove potential prompt-injection markers
embedded in data returned from external systems."

**[E22]** — *bounded agent-to-agent delegation.* *(S1, 2026-05-29)* "Agents can delegate to other
agents. […] Delegation is permission-controlled (explicit allow-list in config) and depth-limited."

**[E23]** — *per-skill model routing.* *(S1, 2026-05-29)* "ZAP supports per-skill model overrides,
any skill can declare a preferred model in its SKILL.md frontmatter, and the agent will switch models
after executing that tool. The default model is restored afterward."

**[E24]** — **ABSENCE (recorded as a finding).** [S1] contains **no** occurrence of ISO 26262, ASIL,
functional safety, SOTIF, hazard, or any automotive safety standard. Its "safety" section is titled
"Tool permissions and safety" and covers exactly [E20] and [E21]. The safety envelope in the
public ZAP account is a **permission-and-prompt-injection** envelope, not a functional-safety one.

### How experience changes the platform

**[E25]** — *the feedback signal.* *(S1, 2026-05-29)* "The system tracks **skill disclosure misses**,
cases where the TF-IDF matcher selected the wrong packages or failed to match at all. These are
logged and surfaced in an admin monitoring dashboard, where they are used as input to an automated
skill improvement pipeline."

**[E26]** — *the failure taxonomy, verbatim from the figure.* *(S1a, 2026-05-29)* Three rows,
Miss type / Trigger / Resolution:
- **Fallback** — "No package exceeded the similarity threshold" → "Enrich the relevant skill's
  frontmatter with more descriptive terms"
- **Wrong skill** — "LLM used a tool from a package that wasn't expanded" → "Add discriminating terms
  to the correct package's frontmatter"
- **Tool struggle** — "Agent called the same tool ≥3 times or hit ≥2 errors" → "Improve SKILL.md
  instructions or add a missing tool"

**[E27]** — *the stated closure.* *(S1, 2026-05-29)* "Self-tuning closes the loop. Tracking skill
disclosure misses, tool errors, and quality scores creates a feedback signal that can be used to
improve instructions iteratively, without changing framework code."

### The organizational claim

**[E28]** *(S1, 2026-05-29)* "The architectural choice we made with ZAP is fundamentally about who
owns the agents. A centralized approach, one team builds all agents for all domains, creates a
coordination bottleneck that scales linearly with the number of use cases. A distributed approach, a
shared platform with team-owned agents, scales with the organization."

**[E29]** *(S1, 2026-05-29)* "This works because most code development is on the platform, while the
domain-specific tuning is in configuration files that domain experts can write and iterate on."

**[E30]** — *the authors' forward claim, explicitly not a measurement.* *(S1, 2026-05-29)* "We are
not claiming that every employee will be building agents tomorrow. But we observe that the skills
required to write clear instructions in a markdown file, defining tool parameters, and iterating
based on test results are not exclusive to software engineers. […] They are closer to writing a good
operating procedure than writing production code."

**[E31]** — **ABSENCE (recorded as a finding).** [S1] reports **no** adoption figure: no number of
agents, no number of domain teams that built one, no users, no sessions, no queries, no time saved,
no cost, no defect or quality outcome. The 67–98% / 43–97% context reduction [E18] is the only
number, and it measures the router, not the platform's effect on work.

### The separate (non-agentic) safety-critical account

**[E32]** *(S2, undated; accessed 2026-09-23)* "Zenseact set up a system that runs SPARK tools in CI
on every commit, so that proofs are run automatically."

**[E33]** *(S2, undated)* "For ASIL-D level components, they have automated checks that ensure each
requirement is checked by a contract, giving complete assurance that functional requirements are met.
This makes it completely unnecessary to create or run unit tests."

**[E34]** *(S2, undated)* "The SPARK tool set comes with the highest level of ISO 26262
certification."

**[E35]** *(S2, undated)* "As a company focused on safety, Zenseact recognized the value of using
formal verification to increase confidence in the correctness of its software. Unit testing can
demonstrate the presence of errors, but not their absence." Scope stated: "the team adopted SPARK for
**high-integrity components**" (emphasis added) — i.e. not the whole stack.

**[E36]** — **ABSENCE (recorded as a finding).** [S2] is undated, quotes no named Zenseact engineer,
gives no quantity (no code size, no component count, no proof-time figure), and makes **no reference
to AI, agents, or generated code**. There is no public source connecting [E32]–[E35] to [E1]–[E31].

### Organizational context

**[E37]** *(S9, as served 2026-09-23)* "We're a software company developing advanced driver-assistance
systems and self-driving capabilities. Founded and owned by Volvo Cars, we operate globally, with
teams in Gothenburg and Lund, Sweden; Munich, Germany; and Shanghai, China. We're around 800
employees".

**[E38]** *(S6, accessed 2026-09-23)* Zenseact's public GitHub organization holds ten repositories —
`research-blog`, `zod` (Zenseact Open Dataset SDK), `R3D2`, `paragram`, `VoroTracing`, `queryocc`,
`SOSPA`, `SD-RouteFusion`, `idsplat`, `zmbt-framework`. **None is ZAP or any agent/skill/developer
platform.** ZAP is not public.

**[E39]** *(S7, accessed 2026-09-23)* `zmbt-framework` is described as a "C++ Model-based Testing
Framework" that "conceptualizes a software test as a mathematical problem" and "enables users to
define test parameters and goals using a declarative modeling syntax". Licence Apache-2.0. Status:
"currently in active development, with core features functional in a prototype state"; no release.
The README makes no ISO 26262 claim and no agent connection.

**[E40]** *(S4, 2025-11-24)* Marcus Nilsson, VP of Engineering: Zenseact has "done agile since the
beginning, but how we practice it keeps evolving"; "The structure shouldn't get in the way of
progress. Accountability should be simple, and decisions straightforward." The piece names no team
structure, no pipeline, no review or admission mechanism, and no metric.

**[E41]** *(S8, undated)* Robert Tapper, CIO of Zenseact, on the test fleet: "They're like data
centers on four wheels." Data scale given: each test car generates more than 50 terabytes of data
daily; up to 23 sensors per typical test car; the project has amassed hundreds of petabytes.
*(Infrastructure context; not software-production evidence.)*

---

## § Claims

Organized against the §5.1 factory anatomy. Each claim carries the evidence that supports it. Where
the anatomy question cannot be answered, the claim says so rather than inferring.

### Where work originates

**[C1] — Work originates as a human question, not as a change request.** Every origination path in
the record is a person asking something in a chat channel, a web UI, a REST call, or Slack; the
agent's output is an answer, a table, or a scorecard. There is no queue of work items, no ticket
intake, no scheduled sweep, and no automated trigger anywhere in the account. Supported by
[E5], [E6], [E7], [E13], [E14], [E19]; absence per [E8].

**[C2] — Zenseact's own factory origin story is a failed first attempt.** The platform exists
because an earlier, off-the-shelf approach — open-source agentic frameworks plus an external platform
— "did not scale," leaving per-use-case implementations, no expansion of tool usage, and, in the
authors' own words, "measurable outcomes were lacking." The rebuild kept the commodity models and
changed the environment around them. This is directly usable for §5.1's "the answer was never merely
a faster fabricator." Supported by [E3], [E1].

### What humans do

**[C3] — Humans hold origination, domain knowledge, and every consequential approval.** A person
poses the task; a person writes the SKILL.md that encodes the domain's business rules; a person is
the `confirm` gate a sensitive tool call blocks on; a person owns the agent directory. The record
places no autonomous initiation and no unsupervised consequential action anywhere.
Supported by [E7], [E10], [E20], [E11].

**[C4] — The platform/domain split is a deliberate allocation of *authority*, not merely of
labour.** Zenseact states the division twice and in the same terms: the platform team maintains the
framework; domain teams maintain their agents and tools. The design principle that makes it hold is
mechanical — the runtime "does not contain any business logic," and domain knowledge lives entirely
in two text files plus optional Python. Because a new agent is a configuration act rather than a
platform change, the central team is removed from the critical path of every domain.
Supported by [E9], [E10], [E11], [E12], [E28], [E29].

### What agents do

**[C5] — Zenseact's agents do not perform software realization.** This is the most consequential
finding of the crawl. The agents query issue trackers, code-review systems, CI pipelines, ERP, and
document stores, and they synthesize answers. Nothing in the public record shows an agent producing
a patch, a commit, a merge request, or any other change to software. Gerrit and Zuul appear as data
sources, never as destinations. By §5.1's own definition — a factory is "a production system for
controlled change," and *agentic* "names who performs realization" — ZAP as publicly described is not
an agentic software factory. It is an agentic *knowledge-work* platform that happens to reason over a
software factory's instrumentation. Supported by [E5], [E6], [E7], [E19]; absence per [E8].

**[C6] — What agents *do* decide is narrow and deliberately bounded.** The agent selects tools and
formats output; everything consequential executes through a typed tool behind a permission check.
Zenseact states the boundary as a rule with a diagnostic edge: if the model is doing arithmetic or
string manipulation in its response text, a tool is missing. Freedom is further bounded by a 25-turn
tool-loop ceiling, a delegation allow-list, and a depth limit.
Supported by [E12], [E19], [E20], [E22].

### What the fabricator inherits

**[C7] — What an agent inherits is a *routed slice* of the organization, not the organization.**
ZAP's central engineering bet is that loading everything degrades the work. Compact frontmatter
summaries (1.5–2KB across all active skills) are always present; full instructions are injected only
for skills the current query matches, and the previous injection is removed after each turn. Per-turn
the agent additionally inherits detected-intent guidance and RAG context scoped by agent, skill, and
user. Supported by [E15], [E16], [E19].

**[C8] — The routing mechanism is deterministic by choice, and that choice is itself the
interesting one.** Zenseact selects context with TF-IDF cosine similarity and no external ML
dependency, with an explicit safe fallback (expand everything when nothing clears the threshold).
A probabilistic reasoner is steered by a deterministic, inspectable, debuggable selector — and the
selector's failures are enumerable [C12] precisely because it is deterministic. The one number
Zenseact reports measures this mechanism: 67–98% context reduction on financial queries, 43–97% on
engineering queries. Supported by [E17], [E18], [E16].

### Where quality is established, and who holds admission authority

**[C9] — The public record splits Zenseact's quality machinery into two halves that never meet.**
On one side, the agent platform's quality apparatus is an in-loop permission gate plus a per-turn
quality score, with no test, benchmark, validator, or evaluation suite named [E19], [E20], [E31]. On
the other, Zenseact's software-verification regime — SPARK proofs in CI on every commit, ASIL-D
components with automated checks that every requirement is covered by a contract — is documented only
in an undated supplier case study that never mentions AI or agents [E32]–[E36]. **No public source
connects them.** The book should not narrate Zenseact as agents working inside a functional-safety
envelope; the record does not support that sentence.
Supported by [E24], [E32], [E33], [E34], [E35], [E36].

**[C10] — Admission in ZAP is per-tool-call, machine-evaluated, and human-escalating.** The
admission question in this factory is not "may this change merge" but "may this tool execute." A YAML
table keyed on (tool, role) resolves every call to `auto_approve`, `confirm`, or `deny`; read-only
tools default to auto-approve, sensitive ones stream the tool name and arguments to the user and
block on approval, and restricted roles are refused outright. The machine decides *which* of the
three applies; the human decides the middle case. Supported by [E20].

**[C11] — Zenseact treats returned enterprise data as untrusted input.** Arguments are validated
for injection patterns before execution and tool *output* is sanitized for prompt-injection markers
embedded in data from external systems — a trust boundary drawn around the agent's own inputs, not
only around its outputs. Supported by [E21].

**[C11a] — ZAP's publicly described quality strategy combines aiming and containment without
detection.** Containment and aiming are affirmatively documented: per-tool/per-role permission
gating [E20], injection validation and output sanitization [E21], delegation allow-lists and depth
limits [E22], deterministic context routing [E16][E17]. A mechanism that evaluates whether an
agent's *answer is correct* — evaluation suite, benchmark, golden answers, or any post-hoc check —
is not publicly stated (GAPS 9). The absence of detection is a fact about the record, not an
asserted design choice: no source says Zenseact decided against evaluation.

### How experience changes the factory

**[C12] — Zenseact converts a routing failure into a typed, resolved finding — the clearest
governance-conversion loop in its record.** Disclosure misses are logged, surfaced on an admin
dashboard, and fed to an automated skill-improvement pipeline; the failure taxonomy is explicit and
each row carries a prescribed remedy: *Fallback* → enrich the frontmatter; *Wrong skill* → add
discriminating terms; *Tool struggle* (same tool ≥3 times, or ≥2 errors) → improve the SKILL.md or
add a missing tool. Zenseact names the property directly: this improves instructions "without
changing framework code." Note what is being repaired — not the agent and not the model, but the
*representation* of the organization's knowledge and the fit between that representation and the
router. Supported by [E25], [E26], [E27].

**[C13] — Domain knowledge accumulates as durable, inspectable text outside any session.** A skill
is a markdown file with structured frontmatter holding "field maps, query recipes, workflow steps,
and common mistakes"; an agent is a directory. Capital therefore lives where the expertise lives and
survives the people and sessions that produced it — and, unusually, its *retrieval* behaviour is
measurable, which is what makes the conversion loop in [C12] possible at all.
Supported by [E10], [E16], [E26], [E29].

### The evidentiary standing of the case

**[C14] — Zenseact reports no outcome. The case is an architecture, honestly presented as a
hypothesis under test.** The authors describe ZAP as built "to test our hypothesis," and the record
contains no adoption count, no agent count, no user or query volume, no time or cost saved, and no
quality result. The single measured quantity describes the context router, not the platform's effect
on anyone's work. Any book sentence attributing productivity, throughput, or safety outcomes to
Zenseact is unsupported. Supported by [E1], [E18], [E30], [E31].

**[C15] — The case rests on one source, and the book should say so.** One company-authored
whitepaper, dated 2026-05-29, carries every substantive claim. There is no talk, no paper, no second
post, no third-party reporting, and no public code [E38]. Zenseact's other engineering-adjacent
publications do not touch the factory: a leadership-culture interview [E40] and a podcast about an
external vendor's product [S5]. Among the seven cases this is the thinnest evidence base by a wide
margin, and the honest framing is *architecture described by its authors*, not *practice observed*.
Supported by [S1], [E38], [E40], [S5], [S6].

**[C16] — The analytically distinctive thing Zenseact contributes is the *federation* axis, not
safety.** Set against the rest of the corpus, Zenseact's value is that it answers the ownership
question differently: where a centralized platform makes one team responsible for every domain's
agents, Zenseact pushes the domain half of the factory out to the people who hold the domain
knowledge and keeps only the substrate central. That axis is legible and well-evidenced. The
*safety-constrained factory* axis, by contrast, is not evidenced [C9] — and the brief's expectation
that ISO 26262 and ASIL would be central to Zenseact's agent account is **refuted by the source**
[E24]. Supported by [E9], [E10], [E11], [E28], [E29]; and negatively by [E24], [E36].

---

## [GAPS] — what the public record does not answer

**On origination and work intake**

1. Whether any agent work is ever triggered by anything other than a human typing a question — no
   schedule, no event, no ticket intake, no pipeline hook is described.
2. Whether ZAP agents are ever pointed at *producing* a change to software, in any pilot or roadmap.
   [S1] is silent; no later source exists.

**On the humans**

3. How large the platform team is, how it is staffed, or how it is funded.
4. How many domain teams have actually built an agent — the central claim of the paper ("distributed
   ownership scales") is stated as a design property and never as an observation.
5. Who authorizes a *new agent* to exist, what review (if any) a new SKILL.md or skill module
   receives before it is loaded, and whether a domain team can grant itself a write-capable tool.
   The per-call permission table is documented [E20]; the process that *populates* it is not.
   Marker: **not publicly stated** — [S1] is the sole substantive source and documents the
   table's semantics [E20] without any sentence on its authorship, review, or change process.

**On the fabricator's inheritance**

6. What the similarity threshold is, how it was chosen, or how often the safe fallback fires.
7. How the 67–98% / 43–97% context savings were measured — baseline, sample, query set, and whether
   answer quality was held constant. The number is stated without method [E18].
8. What "scores quality" means in the per-turn finalization step [E19] — the scorer, its scale, its
   use, and whether a low score has any consequence.

**On quality and admission**

9. **Whether any evaluation, regression suite, benchmark, or golden-answer set exists for ZAP
   agents.** Nothing in the record tests whether an agent's answer is *right*. For a platform whose
   output feeds executive scorecards and budget decisions, this is the largest single hole.
10. What happens when an agent is wrong — no correction path, no incident account, no rollback, and
    no downstream consequence is described.
11. Whether `confirm` gates are ever exercised in practice, how often users approve versus reject,
    and what a rejection teaches the system.

**On the safety envelope**

12. **Whether ZAP agents touch the ASIL-rated software stack at all.** [S1] never mentions functional
    safety [E24]; [S2] never mentions agents [E36]. The relationship between the agent platform and
    the safety-critical development regime is entirely unstated — including whether Zenseact
    deliberately keeps them apart.
13. What fraction of Zenseact's stack is ASIL-rated, what fraction is under SPARK ("high-integrity
    components" is the only scoping [E35]), and when the SPARK adoption happened — [S2] carries no
    date [E36].
14. Whether any policy governs AI-generated content entering safety-relevant artifacts —
    requirements, contracts, test models, or code.

**On how the factory learns**

15. Whether the "automated skill improvement pipeline" [E25] is automated end-to-end or proposes
    edits for human approval, and whether any skill has measurably improved through it.
16. Whether improved skills are shared across domain teams, or whether each team's capital stays
    local — the federation model's obvious second-order question, unaddressed.

**On outcomes and scale**

17. Any adoption, usage, cost, latency, or benefit figure whatsoever [E31].
18. Whether ZAP remains in production as of late 2026 — the record ends on 2026-05-29 and nothing
    newer exists.

**Added by the second analytical pass (2026-09-23) — appended rather than renumbered**

19. Whether a `confirm`-gate approval or rejection [E20] is logged, attributed, or auditable
    afterward is **not publicly stated**; the admin dashboard [E25] is described as surfacing
    disclosure misses, not permission decisions.

20. **How the RAG store and skill corpus are kept true is not publicly stated.** [E13] shows a
    vector DB and [E19] shows RAG context injected per turn scoped by agent, skill, and user; no
    source states what populates the store, on what cadence, or how stale entries are detected.
    The disclosure-miss loop [E25]–[E27] repairs retrieval *fit* (does the right skill load);
    nothing in the record addresses retrieval *truth* (is what loads still correct).

---

## Contradictions with the book's current §5.3 text

Reported for the rewrite wave; not acted on here. Current §5.3 text quoted from
`book/part5/5.3-other-agentic-software-factories.md` as of 2026-09-23.

1. **"the safety envelope" — mischaracterized.** §5.3 says the platform team owns "authentication,
   sessions, execution, and the safety envelope." Three of those four are exact [E9]. "Safety
   envelope," however, reads in context as an automotive functional-safety envelope; in the source
   it is a per-tool/per-role permission table plus prompt-injection validation and output
   sanitization [E20], [E21], [E24]. The phrase should either be replaced ("a permission and
   trust-boundary layer") or explicitly scoped.

2. **Zenseact is grouped as one of "five internal factories" that "delegate more of realization to
   agents."** The record does not support realization delegation of any kind: ZAP's agents answer
   questions over enterprise systems and never produce a change [C5], [E8]. This is a structural
   issue for the section's framing, not a wording fix — either the paragraph should state plainly
   that Zenseact's agents do knowledge work rather than software realization, or the case belongs in
   a differently-framed slot.

3. **"supervision, on the public record, remains attached to the domain teams' own review
   practices."** No source describes any domain-team review practice for ZAP. The supervision the
   record actually documents is the in-loop `confirm` gate [E20]. The current sentence asserts more
   than the evidence carries; the accurate statement is that supervision is a per-tool-call
   permission gate and that nothing about review of agent output is described at all [GAPS 9, 11].

4. **"Routing machinery selects task-relevant expertise" — correct, and strengthenable.** The claim
   holds [E16], [E17]. It currently omits the two most citable specifics: the mechanism is
   deterministic TF-IDF with a safe fallback, and it carries the case's only measured quantity
   (67–98% / 43–97%) [E18]. §5.3 also omits the disclosure-miss conversion loop [E25], [E26], which
   is the strongest governance-conversion evidence Zenseact offers.

5. **"The sources show the division of the platform, not the resulting productivity or safety."**
   Accurate and well-judged — [E31], [C14] confirm it. Worth strengthening to note that the plural
   "sources" is really one source [C15].

6. **No numeric drift.** §5.3 currently cites no Zenseact quantities, so nothing has moved. If the
   rewrite adds one, [E18] is the only number available.
