# Uber — factory-case evidence file

Crawl date: **2026-09-23**. All access dates below are 2026-09-23 unless noted.
Scope: the current public record of how Uber builds and changes software with
coding agents. Read-only research artifact; no book prose here.

**Headline for the rewrite wave:** the three figures the book currently cites
(>70% of PRs, >3,600 skills, >30K skill executions/day) **all still hold** and
are from Uber's most recent first-party post (2026-08-27). Nothing newer
supersedes them. What HAS moved since the book's text was written is the
availability of a *first-party statement on admission authority* — see [E30] —
and a set of **definitional tensions** around the 70% figure — see [E4], [E26],
[E27], and [GAPS] G1.

---

## § Sources

| ID | Title | Publisher / author | Published | URL | Type | Weight |
|---|---|---|---|---|---|---|
| **[S1]** | Running a Software Factory Efficiently at Uber Scale | Uber Engineering / Uday Kiran Medisetty (Distinguished Engineer) | 2026-08-27 | https://www.uber.com/us/en/blog/efficient-software-factory/ | `eng-blog` | **Strongest first-party.** Substantive technical account: named mechanisms, a measurement table, a cost decomposition, measured token deltas. Contains one explicit generalizability caveat (see [E33]). Mild promotional framing only in the conclusion. |
| **[S2]** | uReview: Scalable, Trustworthy GenAI for Code Review at Uber | Uber Engineering / Shauvik Roy Choudhary, Sonal Mahajan, Joseph Wang | **2025-08-12** | https://www.uber.com/us/en/blog/ureview/ | `eng-blog` | Substantive technical account (pipeline stages, filtering, feedback loop, lessons-learned with stated weaknesses). **Now 13 months old**; superseded in part by [S7]. Contains an internal inconsistency — see [E20]. |
| **[S3]** | Automated Software Test Generation at Industry Scale Using a Multi-Agent Architecture and Workflow Integration | Rastenis, Chou, Roy Choudhary (Uber Technologies Inc.); Just (Univ. of Washington) — ICSE-SEIP '26, Rio de Janeiro | **2026-04-12/18** | https://doi.org/10.1145/3786583.3786918 (PDF: https://homes.cs.washington.edu/~rjust/publ/auto_cover_icse_2026.pdf) | `paper` | **Strongest evidence of any type in this file.** Peer-reviewed, CC-BY, with a threats-to-validity section about Uber's own tooling. Deployment numbers are as of **Aug–Sep 2025** and are therefore the *oldest* quantities here. |
| **[S4]** | Solving the Identity Crisis for AI Agents | Uber Engineering / Matt Mathew (Principal Engineer), Prasad Borole (Staff SWE), et al. | 2026-05-21 | https://www.uber.com/us/en/blog/solving-the-agent-identity-crisis/ | `eng-blog` | Substantive technical account of agent identity, delegation and policy enforcement. Directly relevant to *what an agent may do*, not to what it may decide about code. |
| **[S5]** | How Uber Executed A JUnit Migration at Massive Scale | Uber Engineering / Anshuman Mishra (Staff SWE), Kaushik Vejju (SWE) | 2026-04-07 | https://www.uber.com/us/en/blog/junit-migration/ | `eng-blog` | Substantive. Primary account of **Shepherd**, the fleet-migration executor. Important nuance: this migration is *deterministic* (OpenRewrite recipes), not LLM-agentic — see [E23]. |
| **[S6]** | Agentic SDLC at Uber — Building Blocks for Uber's Software Factory (talk + full timestamped transcript + editorial writeup) | Uday Kiran Medisetty & Adam Huda, AI Engineer World's Fair 2026; page published by AI Engineer | page dated 2026-08-21 (talk given at AIE WF 2026) | https://ai.engineer/talks/17-YSUHo6Lk-agentic-sdlc-at-uber-building-blocks-ubers (video: https://www.youtube.com/watch?v=17-YSUHo6Lk) | `talk` | **Richest anatomy source.** Carries a *verbatim* speaker transcript, so quotations below are exact. The conference's editorial layer adds explicit "this does not establish X" caveats, which I have preserved where they bear on evidence strength. |
| **[S7]** | Building uReview, Uber's Multi-Agent Code Review Engine (talk + transcript + writeup) | Will Bond & Ameya Ketkar (Uber), AI Engineer World's Fair 2026; page published by AI Engineer | page dated 2026-08-28 | https://ai.engineer/talks/EL123UNokkI-building-ureview-ubers-multi-agent-code-review (video: https://www.youtube.com/watch?v=EL123UNokkI) | `talk` | **The single most important source for admission authority** ([E30]). Verbatim transcript. Supersedes several [S2] figures. |
| **[S8]** | How Uber uses AI for development: inside look | The Pragmatic Engineer / Gergely Orosz; reporting on a Pragmatic Summit session by Ty Smith (Principal Engineer) and Anshu Chada (Director of Engineering), Uber | 2026-03-10, **updated 2026-03-11** with corrected numbers | https://newsletter.pragmaticengineer.com/p/how-uber-uses-ai-for-development | `third-party` | Credible third-party quoting named Uber engineers; **paywalled after ~§3**, so only the free preview was readable. The adoption figures are in the free portion and are attributed to an Uber-supplied correction. |
| **[S9]** | How Uber built an AI software factory for agentic coding: the MCP gateway and the platform underneath | Port (newsletter.port.io) / Zohar Einy | 2026-08-24 | https://newsletter.port.io/p/how-uber-built-a-software-factory | `third-party` | Detailed secondary writeup, **explicitly** "based on a talk given by two Uber engineers, Uday Kiran Medisetty and Adam Huda." **Vendor with commercial interest** — closes with a Port product pitch. Use only where [S6] corroborates. |
| **[S10]** | Uber's software factory (Inside the Software Factory) | Port (software-factories.port.io) | undated on page; accessed 2026-09-23 | https://software-factories.port.io/uber | `third-party` | A *reconstruction* with numbered citations back to [S1]–[S5], [S8], [S11]. Same vendor as [S9]. Notably publishes its own "Gaps in the record" list, which overlaps mine — an independent convergence worth knowing about, not a source to lean on. |
| **[S11]** | Uber Minion: 11% Agent-Generated PRs (session listing + abstract) | background-agents.com Summit / Nikhil Ramakrishnan (AI Foundations & Developer Experience, Uber) | session recorded **2026-05-07** | https://background-agents.com/summit/sessions/nikhil-ramakrishnan/ | `talk` | Only the session title and abstract were retrievable; **no transcript**. Sole source for the Minion-specific 11% figure. |
| **[S12]** | Uber's Agentic SDLC: Building the Future of Software | StartupHub.ai / Daniel Singer | 2026-08-21 | https://www.startuphub.ai/ai-news/artificial-intelligence/2026/uber-s-agentic-sdlc-building-the-future-of-software | `press` | Summary of the same talk as [S6]; no original reporting, no direct quotes. Superseded by [S6] for every fact. Listed only to record that it was checked. |

### Failed / unavailable fetches (recorded, not substituted)

| Attempted | Result |
|---|---|
| `https://x.com/praveenTweets/status/2074605343439810922` — a post attributed in search results to Praveen Neppalli Naga (Uber engineering leadership) claiming "99% of our engineers use AI tools" alongside the 70%/skills figures | **HTTP 402 Payment Required.** Could not verify text, date, or author. The "99% of engineers" figure is therefore **NOT recorded as evidence** and must not be used. |
| Full text of [S8] beyond section 3 | Paywalled. Sections on Minion internals, challenges, and the impact-numbers discussion were not readable. |
| A dedicated Uber first-party post on Minion, Code Inbox, or Cortana | **None found.** These systems appear only in talks ([S6], [S11]) and third-party reporting ([S8]–[S10]). Recorded as a gap, not filled by inference. |
| Uber engineering posts dated **September 2026** touching agents | **None found.** Uber's September 2026 engineering output (ML feature consistency, retry storms, dependency analysis, Eats search, compute platform, M3DB) is unrelated to the software factory. [S1] on 2026-08-27 remains the current first-party statement. |

---

## § Evidence

Quotations are verbatim from the source's own text (blog HTML or the published
talk transcript). Ellipses mark elision; nothing else is altered.

### Scale and adoption

**[E1]** — "More than 70% of pull requests are attributed to local or cloud agents. Engineers have built over 3,600 agent skills across the software development life cycle, and executed more than 30K agent skill executions per day." — [S1], 2026-08-27.

**[E2]** — "from February to Aug 2026, weekly active users across all agentic offerings across all our employees (engineers & non-engineers) grew 7x, and weekly agentic requests grew 9.4x. Meanwhile, our total AI spend has relatively stabilized since April due to optimizations across the board." — [S1], 2026-08-27.

**[E3]** — "cost per 1,000 model requests is down almost 34% from its peak, and cost per session is down 52% from its June peak." Stated for Feb–July 2026 **with one model held fixed**, because "isolating our own optimization gains means holding one model fixed, since behavior shifts with every upgrade and model family." — [S1], 2026-08-27.

**[E4]** — Verbatim from the talk transcript: "we have a few thousand engineers across twelve global tech sites. Over the last year, all of the investments we made in agentic AI have led to more than seventy percent of our PRs now either by local or cloud agents. And all of this led to twice the number of lines of code per engineer year over year." — Medisetty, [S6] (transcript 0:32–0:49), AIE World's Fair 2026.

**[E5]** — "we handled more than two hundred and fifty automated migrations, cumulatively nine million lines of code automatically for our engineers." — Medisetty, [S6] (transcript 1:00).

**[E6]** — "all the investments we made over the last six years on moving to monorepos, moving to Bazel, all of that also laid a really solid foundation for us to accelerate this." — Medisetty, [S6] (transcript 1:12). *The factory inherits a six-year substrate investment that predates agents.*

**[E7]** — Adoption, as of **March 2026** and supplied by Uber as a correction to the article: "84% of devs at Uber are agentic coding users"; "65-72% of code is AI-generated inside IDE-based tools. This number is, naturally, 100% for AI command line tools like Claude Code"; "Claude Code usage nearly doubled in 3 months — from 32% in Dec to 63% in Feb, while IDE-based tools (Cursor, IntelliJ) have plateaued." — [S8], 2026-03-11 update.

**[E8]** — "92% of Uber devs use agents monthly, 65-72% of code is AI-generated inside IDEs, and **11% of pull requests opened by agents**. At the same time, AI-related costs are up 6x since 2024" — [S8], 2026-03-10. *Emphasis mine; see [E26].*

### What agents do, and who starts the work

**[E9]** — "a growing share of sessions aren't initiated by humans, but by automated managed agents handling code review, self-healing CI failures, completing E2E PRs with visual validation, triaging on-call alerts, debugging incoming bugs, and handling a variety of code maintenance tasks **with human reviews/escalations**." — [S1], 2026-08-27. *Emphasis mine.*

**[E10]** — The demonstrated feature flow originates with a **human product idea** discussed in Slack (a World Cup stadium pickup-location feature), tagged to Cortana, which "helps investigate the business opportunity," proposes a rollout, generates Figma mockups with two variants, plans an A/B experiment, and identifies reusable screens/backend capabilities. The conference writeup explicitly flags: "This is a proposed feature workflow, not evidence of a completed rollout or an experiment result." — [S6] §8 (11:33).

**[E11]** — "Cortana hands the design to Minion, Uber's cloud coding agent... **The demonstrated workflow stops at a draft PR, without immediately sending it to CI.** The boundary is deliberate. Generating changes works well for many toil tasks, but an end-to-end feature needs behavioral validation before it consumes shared CI resources." — [S6] §9 (13:17).

**[E12]** — Minion "takes a prompt from web, Slack, or command line and opens pull requests on its own." — [S10], citing [S8]. *Corroborated in the free portion of [S8]: "Minion — background agent platform with monorepo access."*

### What the fabricator inherits

**[E13]** — The Model Gateway: "no PII ever leaves our perimeter to any of the vendor by default"; middleware chain is "identity and authentication using SPIRE... a data anonymizer that redacts twenty plus PII types... a AI guard that has five specialized models that handles various parts of safety and policy... and all of that runs under a hundred milliseconds." Scale: "eight hundred plus projects internally going through this, cumulatively handling more than a hundred million model requests per day." — Medisetty, [S6] (transcript 1:46–3:38).

**[E14]** — "all MCP (Model Context Protocol) interactions are routed through a unified gateway. This single entry point encompasses more than 1,000 MCP servers across internal and third-party SaaS MCP, enabling centralized authentication and policy enforcement." — [S1], 2026-08-27.

**[E15]** — Context: "we engineered the AI Context Graph: a unified network containing **24 million nodes and 80 million edges across 86 nodes and 117 edge types**. It integrates data from over 30 internal systems, including services, engineering teams, incident logs, pull requests, architectural design docs, deployments, datasets, and historical table usage queries, and lets any agent query it in natural language." — [S1], 2026-08-27.

**[E16]** — Earlier figure for the same graph, from the June-2026 talk: "Medisetty reports **150 unique node and edge types and forty million entries**. The graph connects mobile applications, backend systems, the data lake, design documents, Jira, and incidents." — [S6] §6 (8:37). *[E15] and [E16] are not reconcilable from the public record; see [GAPS] G8.*

**[E17]** — Grounding effect, measured once: "The grounded agent queried historical usage, identified the specific table used by over 50 analysts, and delivered the answer in 38 seconds. Conversely, the ungrounded agent lacked visibility into that table; it spent 20 minutes inspecting service code, spawning 2 subagents, and hitting 3 errors before incorrectly concluding the dataset was unqueryable." — [S1], 2026-08-27. *A single paired anecdote, not a benchmark.*

**[E18]** — Skills as a governed lifecycle: "Uber responded with a managed skills marketplace containing both core and domain-specific skills. **Lint checks and automated reviews establish a baseline before those skills reach agents.**... Persona-based defaults go further by installing relevant skills automatically... traces, comments, and continuous evaluations return evidence to skill authors." Reported at the time of the talk: "2,500 skills with more than 20,000 skill executions per day." — [S6] §5 (7:09). *Compare [E1]: 3,600 skills / 30K executions by 2026-08-27.*

**[E19]** — Environments: "Uber keeps pre-provisioned Kubernetes balloon pods ready for allocation. Repository snapshots and search indexes are already present, so an agent does not have to prepare its workspace from scratch. Medisetty says agents can begin working within seconds." A "mega DevPod brings all repositories into one environment for autonomous coding." — [S6] §4 (5:41).

### Where quality is established

**[E20]** — "uReview today analyzes over 90% of the weekly ~65,000 diffs (equivalent of pull requests) landed at Uber. Engineers who interact with the tool mark 75% of its comments as useful, and we see over 65% of its posted comments addressed." — [S2], 2025-08-12. **Internal inconsistency in the same post:** a later section says "given the scale of diffs at Uber (65,000 per month)". Weekly and monthly cannot both be right; Uber has not corrected this publicly.

**[E21]** — uReview's own stated limits: "uReview today only has access to the code, and not to other artifacts like past PRs, feature flag configurations, database schemas, technical documentation, and so on, because of which it can't correctly assess overall correctness and review the system design. It's much better at catching bugs that are evident from analyzing the source code alone." — [S2], 2025-08-12.

**[E22]** — Superseding uReview figures, from the 2026 talk: "uReview does like around 25,000 comments a week. And uh we get 10% of them actually get some feedback. And only 4% of the PRs actually get some negative feedback... the overall addressal rate was uh around 67% and almost three quarters of the high severity issues... were usually addressed by the developers... against like a very naive implementation, our costs were down by 60% and our quality and our accuracy was up by uh around 70%." — Ketkar, [S7] (transcript 10:13–10:58). The conference's own editorial note: "The talk does not define the quality or accuracy metrics, identify the measurement window, or say whether 70% is a relative increase or a percentage-point change."

**[E23]** — Review is now the constraint: "Uber's scale makes code review an allocation problem as much as a code-quality problem. Thousands of engineers work across hundreds of teams, 12 sites, and six language-specific monorepos. Over the preceding 24 months, both pull-request volume and pull-request size grew. The company's time to first review rose from **three hours in 2024 to nine hours in 2026**, leading Bond to identify review as the new bottleneck." — [S7] §, AIE writeup of the talk.

**[E24]** — Inner-loop validation, before shared CI: "Detect and repair static-analysis issues. Use a skill to launch the app in a simulator and capture a screenshot. **Compare the screenshot with the Figma specification.** Start the backend service in staging and validate frontend/backend integration." — [S6] §10 (14:14). *Emphasis mine — this is the one place in the corpus where an agent's output is checked against an explicit design artifact.*

**[E25]** — Evidence attached to the PR: "Once a change enters the outer loop, Uber's self-healing CI can repair many issues encountered there. Code review is also split across the two loops: a smaller, faster model reviews earlier, while a more powerful model uses reasoning and a review skill for deeper outer-loop review. For an autonomous Minion diff, the human reviewer needs to see what happened after the first generation. **The PR carries a table of the checks performed, including screenshots.** That evidence makes the agent's validation and improvement work inspectable; it does not guarantee correctness or remove the need for human judgment." — [S6] §11 (14:53). *Emphasis mine.*

**[E26]** — AutoCover, peer-reviewed: "AutoCover now generates about 11% of all new tests that are **reviewed and added to** Uber's codebase." Quality gates: "Validator is the quality gate between execution and persistence. A test case is viable only if it successfully executes and either raises code coverage or scenario coverage." Validator enforces a machine-readable best-practices registry (`⟨id, severity, span, rationale, patch, confidence⟩`), uses **mutation testing** with bounded mutants, and "rejects change-detector tests." — [S3], ICSE-SEIP '26.

**[E27]** — AutoCover deployment results, **as of Aug–Sep 2025**: monthly, "hundreds of thousands of tests" (IDE), "tens of thousands" (Headless), "thousands" (CLI); "overall success rate of generating viable tests... is about 20% for Java, 40% for Go, and 80% for Python"; "AutoCover's viable IDE tests are explicitly accepted by users at a rate of about 44%"; "AutoCover's Validator automatically fixes tens of thousands of developer-written tests." — [S3].

**[E28]** — AutoCover's own threats-to-validity: the authors state that coverage is an imperfect proxy, mitigated with scenario coverage and mutation testing, and that target-selection bias is possible because "developers may have targeted particularly hard-to-test legacy code." — [S3]; characterization corroborated by [S10]. *Uber is the only organization in this seven-case corpus that has published a peer-reviewed threats-to-validity section about its own agent tooling.*

**[E29]** — Fleet migration validation (Shepherd): "Shepherd identifies successfully migrated targets and automatically generates diffs for each one. These diffs are validated through Uber's CI system to adhere to criteria beyond unit tests, including integration tests, linter checks, and code coverage enforcement." Outcome: "Migrated over 75,000 test classes to JUnit 5, modifying over 1.25 million lines of code within 4 months." Failure policy: "For test failures, we reverted affected files back to JUnit 4." — [S5], 2026-04-07. **Important nuance:** this migration's transformation engine is **OpenRewrite recipes**, i.e. deterministic codemods executed at fleet scale, not LLM agents.

### Who or what holds admission authority

**[E30]** — The clearest first-party statement in the entire corpus, verbatim from the transcript: "we're moving software into a model where engineers are interacting with the code less. They're often times not as involved in authoring the code. Uh, currently, **we still have uh humans approving the code**, uh but we see a a short path in the near future to a percentage of our code landing automatically, having automatic approvals, right? The various parts of the industry are already moving there." — Will Bond, [S7] (transcript 11:28–11:56). *Emphasis mine.*

**[E31]** — And the stated direction for the human role: "rather than killing the outer loop, I think that we believe and the industry has just started to really kind of coalesce on this idea that we're really **expanding** the outer loop. Rather than removing humans from the code review process, we are moving their responsibilities up a layer. Rather than them dealing with the details of the implementation... you're going to be thinking more about architecture in your code reviews. You're going to have time to focus on the domain expertise that you have and product thinking." — Will Bond, [S7] (transcript 13:45–14:34).

**[E32]** — The inner loop raises the bar on the *reviewer agent*: "with the inner loop, our accuracy needs actually need to go up, or else we can result in uh dealing with cavitation of an agent where it fixes something, goes back, gets another code review, and has to kind of like fix backwards because the quality of the comment was low." — Will Bond, [S7] (transcript 12:16–12:36).

**[E33]** — Third-party characterization of uReview's authority: "uReview is built as an augmenting second reviewer, not a gatekeeper"; "It does not block a merge"; summary line "Review: uReview across six monorepos · advisory, never blocking [2]". — [S10], citing [S2]. **I could not find this stated in Uber's own words in [S2] or anywhere first-party.** [S2] says uReview is "a second AI reviewer" that "treats automation not as a substitute for human insight, but as a scalable partner" — supportive, but not a statement that it cannot block. Treat "never blocking" as a **third-party inference**, not first-party fact.

### Governance of the agents themselves (spend, identity, policy)

**[E34]** — Spend governance by visibility and friction, not caps: "To avoid imposing strict caps, we implemented real-time spend tracking and automated nudges: Statusline live counter... Harness pool. One shared tier across all interactive harnesses, not per-tool budgets. And separate tiers for managed agents. Slack nudges. Alerts at 50/80/100% of expected spend so engineers have time to plan. Easy approval flows. **Manager sign-off for tier upgrades** with quick propagation." — [S1], 2026-08-27. *Emphasis mine — the only named human approval authority in [S1] governs **money**, not code.*

**[E35]** — Agent identity and delegation: "The Agent Registry serves as the source of truth"; agents present SPIRE-issued workload credentials plus user context to a Security Token Service, which mints tokens that are "single-hop and short-lived, with a specific Audience claim and a TTL in the order of minutes"; "STS manages the token exchange at every step and embeds the fully attested actor chain into the token... we see every participant in the lineage (e.g. engineer to Oncall Agent to Investigation Agent …) rather than just the immediate caller." Policy: "the Gateway enforces tool-level policies, which involves tool access checks and redaction of sensitive data if needed... **Policies are defined based on internal risk classification, and mandated for systems that we consider high risk.**" — [S4], 2026-05-21. *Emphasis mine.*

**[E36]** — Definitional framing: "An agent is best defined as an entity that is authorized to act for or in the place of another... Delegation is the default mode - agents work on behalf of others." — [S4], 2026-05-21.

### How experience changes the factory

**[E37]** — Managed agent outcomes are measured in outcome-denominated units: "For each managed agent: Outcome-denominated cost (**cost per merged PR, cost per review, cost per alert, cost per cleanup**); Quality signal (**revert rate, F1, MTTR**); Volume (diffs landed, reviews posted, alerts triaged)" — answering "Whether each managed agent is getting cheaper per unit of value delivered, and whether quality holds through model migrations." — [S1], 2026-08-27. *Emphasis mine. The quality signals are **named** as tracked; **no values for any of them are published**.*

**[E38]** — Model selection as a repeatable four-step procedure: "Build a benchmark out of the agent's real work. Run the agent on a harness that serves any model, frontier or open-weight, behind one interface. Move to whatever is Pareto optimal, and keep moving. The frontier shifts every few weeks." Pareto efficiency is defined as "cost/completed task, output quality, and model reliability." An "Uber SWE Benchmark" built from "thousands of real-world PRs across our large monorepos" informs "model selection across all our SDLC-managed agents." — [S1], 2026-08-27.

**[E39]** — Failures become new factory structure, on a stated cadence: "The maintenance loop also produces learning signals. Review comments and whether a generated diff lands become labeled data for improving the skill that proposed it. **At roughly a monthly cadence, Uber looks through incident reviews for lessons that can become new maintenance skills and be applied across services.** Maintenance therefore feeds both individual code changes and the next version of the automation." — [S6] §12 (15:53). *Emphasis mine.*

**[E40]** — Maintenance is centrally scheduled against shared capacity and **reviewer attention**: "These jobs run through a managed loop, rather than thousands of independent, unbounded schedules. A shared configuration surface can place work on Sunday, when CI has more available capacity, and limit how many resulting diffs engineers face on Monday. Scheduling execution and controlling review volume are separate requirements: spare compute does not imply unlimited reviewer attention." — [S6] §12.

**[E41]** — Skill improvement is being automated: "Continuous Skill Improvement: We are working on an automated way to record papercuts from agent skill executions and auto-generate skill updates from the collected traces." — [S1], 2026-08-27 ("What's Next"). *Stated as in-progress, not shipped.*

**[E42]** — The session analysis dashboard turns waste into named, priced anti-patterns: "it flags **16 distinct anti-patterns** across sessions, pairing each with its financial impact and a targeted remediation," including "Suboptimal model routing," "Context window bloat," "Cache expiration inefficiencies," and "Prompt initialization overhead." "Built directly into the runtime, it requires zero setup or opt-in." — [S1], 2026-08-27.

### Measured token economics (supports the book's existing sentence)

**[E43]** — Code-mode token savings, measured: five identical SQL queries run both ways in the same session gave savings of 55%, 58%, 71%, 59%, and ~100%. Uber's reading: "even for minimal result sets far below response-size limits, code-mode reduces token usage by more than 50%... Bulk workflows compound the effect, because the loop that would have been N model turns becomes one script and the savings compound to more than 90%. By deploying more than 25 pre-built code-mode skills for our most-accessed MCP servers, we ensure standard workflows default to the most cost-effective path." — [S1], 2026-08-27.

**[E44]** — Tool-schema overhead removed rather than tolerated: "with over 100 tools installed, this pre-loading added approximately 50K-70K tokens of schema overhead to the initial prompt, which was subsequently re-sent on every context turn." Fixes: "CLI tool resolution... eliminating Uber MCP schemas from the session context. All 1K+ MCP tools from our internal MCP gateway are projected as CLI commands," plus "Tool search." — [S1], 2026-08-27.

**[E45]** — Defaults as fleet-wide policy: "Automatic compaction is triggered at 400k tokens even for 1M context window models"; "Reasoning effort defaulted to Medium"; subagents "default to a weaker, more cost-effective model while still allowing manual overrides. The primary model handles task decomposition and evaluation while subagents execute the work." — [S1], 2026-08-27.

### The stated limit of the factory

**[E46]** — "Experiment capacity is finite too: the organization cannot feasibly test every feature it can generate. Decision-making becomes another bottleneck. Once building a feature is relatively easy, implementation feasibility no longer settles the product question. **The factory still needs people to decide whether that feature should be built.**" — [S6] §13 (17:14), reporting Huda's closing point. The [S9] rendering of the same moment: "the question is no longer whether they can build something. They know they can. It is whether they should." *Emphasis mine.*

**[E47]** — Generalizability caveat, stated by Uber: "specific cost reductions we measure are unique to our environment and your mileage may vary depending on your codebase, team size, and agent workflows, the methodology of benchmarking real work and optimizing for accuracy and cost is universally applicable." — [S1], 2026-08-27.

---

## § Claims

Organized against the §5.1 factory anatomy. Each claim is an analytical
statement the book *could* make, with the evidence that licenses it.

### Where work originates

**[C1]** — Work at Uber originates from at least four distinct sources, and only one of them is a human writing a ticket: (a) human product intent, entered conversationally and elaborated by an assistant into requirements, mockups and an experiment plan [E10]; (b) **the factory's own operational signal** — CI failures, on-call alerts, incoming bugs — which automated managed agents pick up without a human initiating the session [E9]; (c) **centrally scheduled maintenance enrollment**, where a service is enrolled once and the factory thereafter generates its own change proposals on a managed cadence [E40]; (d) **incident review mined monthly into new maintenance skills**, so a past failure becomes a standing source of future changes across every service [E39]. Evidence: [E9], [E10], [E39], [E40].

**[C2]** — The share of sessions not initiated by a human is described by Uber as *growing*, and this is stated as the strategic direction rather than an artifact: "The core strategic shift is moving from interactive developer workflows to fully managed agents." Evidence: [E9], [S1] conclusion.

### What humans do

**[C3]** — On the current public record, humans at Uber retain four roles: they originate product intent [E10]; they **approve code before it lands** [E30]; they supply the feedback signal that tunes the reviewer agents [E22], [E31]; and they decide *whether a feature should exist at all*, which Uber names as the binding constraint now that implementation is cheap [E46]. Evidence: [E10], [E30], [E31], [E46].

**[C4]** — Uber explicitly frames the human role as **moving up a layer rather than disappearing** — from implementation detail toward architecture, domain expertise and product thinking — and calls this "expanding the outer loop" rather than killing it [E31]. This is a *stated intention by a named engineer in a public talk*, not a measured organizational outcome; no source measures what reviewers actually spend attention on.

**[C5]** — The only human approval authority Uber documents in detail is over **spend**, not over code: manager sign-off gates a spend-tier upgrade, with alerting at 50/80/100% [E34]. The asymmetry is itself a finding — the factory's most thoroughly engineered human-in-the-loop control governs the budget.

### What agents do

**[C6]** — Agents perform a majority share of realization by Uber's own attribution: more than 70% of pull requests, and a doubling of lines of code per engineer year over year [E1], [E4]. Uber offers no definition of "attributed to," and the book should say so when citing the figure (see [GAPS] G1).

**[C7]** — The *kinds* of agent work are broad and each is a named managed agent with its own benchmark and its own outcome metric: code review (uReview), test generation (AutoCover), background PRs (Minion), fleet migration (Shepherd), CI repair (self-healing CI), on-call triage, debugging, and feature-flag/A-B cleanup [E9], [E20], [E26], [E12], [E29], [E37].

**[C8]** — Not all of Uber's "automated migration" volume is agentic. The one migration with a first-party technical account — 75,000 test classes, 1.25M lines — was executed by **deterministic OpenRewrite recipes** dispatched at fleet scale by Shepherd, with CI as the validator and revert-to-original as the failure policy [E29]. The headline "250+ automated migrations, nine million lines" [E5] is not decomposed into agentic vs. deterministic. A book that reads Uber as an all-agent factory would be over-reading its own sources.

### What the fabricator inherits

**[C9]** — Uber's distinctive investment is that the fabricator inherits a **governed, pre-compiled environment** rather than a raw repository: a model gateway with PII redaction, safety models and per-project attribution under 100ms [E13]; a single MCP gateway fronting 1,000+ tool servers with centralized auth and policy [E14]; a context graph of tens of millions of nodes spanning 30+ internal systems [E15]; pre-provisioned "balloon pod" DevPods with repository snapshots and search indexes already warm, so an agent starts working "within seconds" [E19]; and a curated skills marketplace with lint-and-review as a quality floor and persona-based auto-installation [E18].

**[C10]** — Uber treats *context supplied up front* as a first-order economic lever, not a convenience: "An ungrounded agent fails slowly rather than cheaply, repeatedly sending an expanding context window to search one more location" [S1]; the paired 38-seconds-vs-20-minutes anecdote is the published illustration [E17]. Evidence: [E15], [E17].

**[C11]** — What the fabricator inherits is **organizational knowledge and tool access, not an executable model of the software's behavior**. The context graph carries services, teams, incidents, PRs, design docs, deployments, datasets and query history [E15] — relationships *about* the system, not a representation *of* its behavior. The one exception is narrow and visual: the inner loop compares a captured simulator screenshot against a **Figma specification** [E24]. The book's current sentence — that Uber's reasoning surface is "a knowledge-and-context graph, not an executable model of the software's behavior" — survives this crawl, but [E24] is a genuine partial counter-example the rewrite should acknowledge rather than ignore.

### What the agent may decide for itself

**[C12]** — The agent's realization freedom is bounded not by a specification of the change but by **a policy perimeter around its capabilities**: what tools it may call, against what systems, with what data redacted, is decided at the MCP gateway according to an internal risk classification, and "mandated for systems that we consider high risk" [E35]. Delegation is explicit and traceable — every hop carries a short-lived, single-audience token embedding the full attested actor chain back to the originating human [E35], [E36].

**[C13]** — Within that perimeter, realization freedom appears wide: Minion develops frontend and backend changes together across repositories, chooses how to satisfy the design, runs and repairs its own static analysis, launches simulators, and drives staging integration — all before any shared gate sees the work [E11], [E24]. What it may **not** do, today, is land the change itself [E30].

**[C14]** — Uber shapes agent behavior through **fleet-wide defaults** rather than per-task instruction: compaction thresholds, reasoning effort, and subagent model class are set centrally, with the primary model reserved for decomposition and evaluation and subagents executing [E45]. This is a governance surface the other cases in the corpus do not expose as clearly.

### Where quality is established

**[C15]** — Uber's distinctive quality move is **relocating evidence production from the shared outer loop into the agent's own inner loop** — static-analysis repair, simulator screenshot vs. Figma spec, backend staging integration — explicitly so that shared CI "only sees work that is already likely to pass" [E24], [E11]. The stated motivations are two: capacity management, and catching mistakes closer to generation.

**[C16]** — Quality is established in **layers that mirror the loop split**: a smaller, faster reviewer model inside the loop; a larger reasoning model with a review skill outside it; then CI, which can self-heal many failures on its own; then a human [E25]. Uber's own observation is that pushing review inward *raises* the accuracy bar on the reviewer, because a low-quality comment makes an agent "fix backwards" — a dynamics failure the book's §A.11 vocabulary would recognize [E32].

**[C17]** — Uber has published the strongest quality instrumentation of any case in this corpus, and also the most honest account of its limits. AutoCover's Validator is a genuine admission gate over generated tests — mutation testing, a machine-readable best-practices registry, rejection of change-detector tests, viability defined as *executes and increases code or scenario coverage* [E26]. And in the same paper Uber publishes a threats-to-validity section about its own tooling, including that coverage is an imperfect proxy and that target selection may be biased [E28].

**[C18]** — Yet the published success rates are *low and unflattering by design* — about 20% for Java, 40% for Go, 80% for Python, with 44% IDE acceptance [E27]. An organization publishing a 20% success rate for its own flagship agent is evidence of a measurement culture, and the book can use it as such.

**[C19]** — For **code review specifically**, the evidence shows quality established by a *filtering* architecture rather than a generating one: generation, confidence-scoring, semantic deduplication, category classification, and suppression of historically low-value categories, with developer ratings streamed back as the tuning signal [S2], [E22]. Uber's own lesson is that "system architecture, and post-processing were even more critical" than prompt design [S2].

**[C20]** — Review capacity, not review quality, is the binding constraint. Time to first review moved from three hours in 2024 to nine hours in 2026 as PR volume and PR size both grew [E23]. This is the clearest published instance in the corpus of the book's own diagnosis — *automating fabrication while leaving supervision attached to the fabricated artifact* — measured from the inside.

### Who or what holds admission authority

**[C21]** — **Humans hold admission authority at Uber today, and Uber says so plainly**: "currently, we still have uh humans approving the code, uh but we see a a short path in the near future to a percentage of our code landing automatically, having automatic approvals" [E30]. This is the single most important new fact for the book's Uber paragraph, which currently says nothing about admission.

**[C22]** — What the human is given at the moment of admission is **an evidence table, not a model**: the PR arrives carrying a list of every check the agent already performed, screenshots included, explicitly so that the reviewer spends attention on whether the change is a good idea rather than on catching basic mistakes [E25]. Uber's own framing of what this buys is careful: it "makes the agent's validation and improvement work inspectable; it does not guarantee correctness or remove the need for human judgment" [E25]. The table's provenance matters as much as its contents: it is assembled by the producing agent about its own work [E25], and no source states that any entry is independently regenerated before approval (see G15). Uber's own hedge — "inspectable; it does not guarantee correctness" — is accurate about exactly this.

**[C23]** — Admission machinery is **machine-assembled and human-exercised**. The machinery decides what evidence exists (inner-loop checks, CI, two tiers of model review, uReview comments); the human decides whether the change proceeds. No published source states a mechanical merge gate that an agent-authored change must satisfy, nor a set of conditions under which a merge is refused automatically. The "advisory, never blocking" characterization of uReview circulating in third-party reconstructions is **not traceable to a first-party statement** [E33].

**[C24]** — Uber is publicly on a trajectory toward *partial* machine admission — "a percentage of our code landing automatically" [E30] — but has published **no criterion** for which percentage, which code, or on what evidence. The book can legitimately say Uber has named the destination without publishing the map.

**[C31]** — Uber operates a second admission gate over its factory artifacts, distinct from the code path: skills pass lint checks and automated reviews before reaching agents [E18], and automated skill self-update is announced as future work rather than shipped [E41]. The public record prices the code gate's pressure (review latency, [E23]) but says nothing about the skill gate's strictness or its approver ([GAPS] G14).

**[C32]** — Admission authority at Uber is indexed by artifact class, not uniform across the factory: generated *tests* face a genuine machine gate (AutoCover's Validator persists a test only if it executes and raises code or scenario coverage, with mutation testing and change-detector rejection [E26]), while *code* admission is human [E30] and uReview's blocking status is unestablished [E33]. Any book sentence of the form "Uber keeps admission human" is true of code and false of tests. `[E26] [E30] [E33]`

### How experience changes the factory

**[C25]** — Uber's factory improves itself through at least five distinct, named conversion loops: (a) **real work becomes a benchmark**, and the benchmark selects the model — a four-step procedure applied identically to every managed agent [E38]; (b) **developer feedback becomes reviewer tuning** — ratings, addressal rate, and agent trajectories feed prompt and threshold changes, and are returned to the *team* that authored a rule [E22], [S7]; (c) **session waste becomes a named, priced anti-pattern** with a targeted remediation, sixteen of them, detected automatically in the runtime [E42]; (d) **recurring workflows become skills**, governed by a marketplace with lint-and-review as its quality floor [E18]; (e) **incident reviews become maintenance skills**, mined monthly and applied across every service [E39].

**[C26]** — Loop (e) is the one that matters most for the book's argument and the one Uber measures least: it is the clean case of *a production failure converted into structure that later work inherits*, stated as ongoing practice with a cadence [E39] — but with no published count of skills so derived, and no measure of what they prevented.

**[C27]** — Uber's **unit of factory measurement is the outcome, not the activity**: cost per merged PR, per review, per alert, per cleanup, paired with revert rate, F1, and MTTR, and asked explicitly of model migrations — "whether quality holds through model migrations" [E37]. That last clause is the sharpest thing in the corpus about how a factory stays under control while its fabricator is replaced every few weeks [E38].

**[C28]** — But the quality half of that measurement is **named and not published**. Revert rate, F1 and MTTR appear in the metrics table [E37]; no value for any of them appears anywhere in the public record. Every published Uber number about the factory is an adoption, volume, or cost number, with the sole exceptions of uReview's usefulness/addressal rates [E20], [E22] and AutoCover's success/acceptance rates [E27] — both of which measure *developer response to agent output*, not *defect outcomes in production*.

**[C33]** — Uber's control layer is framed as the invariant across fabricator churn, the inverse of retiring controls as capability improves: models are replaced on a cadence of "every few weeks" [E38], and the quality metrics exist to answer "whether quality holds through model migrations" [E37]. No Uber source describes weakening or retiring a verification control as model capability improved (not publicly stated; for skills specifically see G10).

**[C34]** — Reviewer attention is treated as a rationed, schedulable capacity distinct from compute: maintenance jobs are placed on Sunday for CI capacity while the number of resulting diffs engineers face on Monday is separately limited, and Uber states the principle — "spare compute does not imply unlimited reviewer attention." No other case in the corpus schedules admission capacity as a resource. Evidence: [E40].

### Cross-cutting

**[C29]** — Uber's factory is best read as **optimizing the economics of reasoning under a governed perimeter**. Its deepest engineering investment is in making each act of fabrication cheaper and better-grounded — benchmarks, Pareto model selection, context grounding, schema elimination, code-mode batching, caching TTLs, compaction defaults [E38], [E43], [E44], [E45] — while identity, policy and spend are enforced at gateways [E13], [E14], [E35]. The book's current reading of Uber survives the crawl.

**[C30]** — Uber's own closing note undercuts the productivity frame and should be quoted rather than paraphrased: once implementation is easy, the constraints become CI capacity, experiment capacity, and *deciding what to build* [E46]. The factory made realization cheap and thereby moved the bottleneck onto human judgment — which is the book's thesis arriving from Uber's own stage.

---

## [GAPS] — what the public record does NOT answer for Uber

**G1 — What "attributed to local or cloud agents" means.** The 70% figure [E1], [E4] has no published definition, denominator, or time window. No source says whether a PR an engineer drove from their own IDE with tab-completion counts, whether a human editing agent output still counts as agent-attributed, or how a co-authored PR is allocated. The book must cite the figure with its definitional silence attached.

**G2 — Whether an agent-opened PR can merge without a human approving it, today.** [E30] establishes that humans currently approve and that automatic approval is coming, but **no source states a current policy, an exception list, or a percentage already landing automatically**. The "advisory, never blocking" claim about uReview is third-party only [E33]. Marker: **unclear**, not silence. Sources exist on both edges — [E30] is first-party ("we still have humans approving the code") and [E33] is a third-party "advisory, never blocking" characterization not traceable to any first-party statement — but they underdetermine whether human approval is a universal enforced policy, a description of the common case, or a norm with unstated exceptions.

**G3 — How consequential properties are represented at admission.** This is the largest silence, and the one the book most needs. The PR carries "a table of the checks performed" [E25], but **no source publishes what checks are in that table, which are required, which are advisory, or how the required set is determined per change class**. There is no published statement of what evidence a change must produce before it may proceed. The one place an explicit intent artifact is used as an oracle is a Figma mockup compared against a screenshot [E24] — visual appearance, not behavior, architecture, safety, privacy, or performance.

**G4 — Defect outcomes.** Revert rate, F1 and MTTR are named as tracked quality signals [E37]; **no values are published for any of them**, and no incident, escape, or rollback rate is attributed to agent-authored change anywhere in the corpus. The public account of the factory is an economics account with quality asserted, not shown.

**G5 — What agents are forbidden to touch.** No source names a code domain excluded from agent authorship — payments, safety-relevant systems, privacy-sensitive paths, regulated code. [E35] shows a risk classification governing **tool access**, not code authorship. Whether the 70% figure spans all code or a subset is unstated.

**G6 — How disagreement is resolved.** Nothing describes what happens when uReview and a human reviewer disagree, when the inner-loop reviewer and outer-loop reviewer diverge, or when an agent declines to accept a review comment. [E32] shows Uber is aware of the "fix backwards" dynamic; no resolution mechanism is published.

**G7 — Post-merge reversal.** No account of how an agent-authored change is detected as bad in production and reversed. Shepherd's fleet migration has an explicit failure policy — revert affected files [E29] — but that is a pre-merge behavior of a deterministic codemod, not a post-merge policy for agent output. Distinguish detection from containment here: self-healing CI [E9][E25] and layered review are detection, and [E35]'s identity/policy perimeter bounds the agent's *actions* during fabrication. A mechanism bounding the production blast radius of an *admitted* agent-authored change — staged rollout, canary, feature gating, health-mediated deploy — is not publicly stated anywhere in the Uber record.

**G8 — The context graph's actual shape.** Uber has published two irreconcilable descriptions two months apart: "24 million nodes and 80 million edges across 86 nodes and 117 edge types" [E15] vs. "150 unique node and edge types and forty million entries" [E16]. Neither is annotated as superseding the other. Cite [E15] as current; do not average them.

**G9 — uReview's diff volume.** Uber's own post says both "~65,000 diffs" weekly and "65,000 per month" [E20]. Uncorrected. The 2026 talk gives comments-per-week (25,000) but not diffs-per-week [E22].

**G10 — Skill quality beyond the floor.** 3,600 skills exist [E1] and "lint checks and automated reviews establish a baseline" [E18]. Nothing is published about the *distribution* of skill quality, how skills are deprecated or retired, what fraction are unused, or what happens when a skill encodes a now-wrong convention. Auto-generated skill updates from traces are announced as future work [E41].

**G11 — Ownership and accountability for agent-authored code.** [E35] traces *who initiated* a chain of tool calls. Nothing addresses who is accountable for a defect in code an agent wrote and a human approved, or how ownership is assigned when a maintenance loop lands a diff nobody requested.

**G12 — Whether any of this is measured against a counterfactual.** Every productivity figure — 70% of PRs, doubled LoC per engineer, 250 migrations, 9M lines, 1,500 hours saved weekly — is a volume or attribution number. [E28] is the only place Uber engages with validity at all, and it does so for AutoCover alone. No source establishes that the factory produced *better* software, only more of it, faster, per dollar.

**G13 — Minion, Code Inbox and Cortana have no first-party technical account.** They appear only in talks and third-party reporting [E10]–[E12], [S8]–[S11]. Uber has published deep posts on uReview, AutoCover, agent identity and JUnit/Shepherd, but nothing comparable on the background-agent platform that authors the PRs, the routing system that allocates review attention, or the assistant that originates work. For a factory whose headline claim is about PR authorship, the PR-authoring component is the least documented.

**G14 — Who admits a skill to the skills marketplace.** [E18] states that "lint checks and automated reviews establish a baseline before those skills reach agents," but who sets that baseline, whether a human approves a skill before publication, and whether skill admission differs from code admission are **not publicly stated**.

**G15 — Provenance of the admission evidence.** Whether any element of the PR evidence table [E25] is regenerated or re-executed by machinery independent of the producing agent at admission time is not publicly stated. The record describes the table as assembled by the agent's own inner loop; no source describes an independent re-derivation of its contents before human approval.

**G16 — Motive for multi-model review.** Uber's review tiers use different models [E25], but the stated distinction is capability and loop position (smaller/faster inner, reasoning model outer). Whether any reviewer model is chosen for *independence* from the generating model — decorrelated blind spots rather than cost/depth — is not publicly stated.

**G17 — How the AI Context Graph is kept true of the systems it describes.** Not publicly stated. No source says how or how often the graph is refreshed from its 30+ source systems [E15], whether staleness is measured or bounded, or what happens when the graph disagrees with a source system. The two irreconcilable published shapes (G8) leave even the graph's current size and schema unclear.

---

## Contradictions and updates vs. `book/part5/5.3-other-agentic-software-factories.md`

The book's Uber paragraph was checked line by line against the crawl.

**No quantitative contradictions.** All three cited figures hold at the most
recent first-party source:

| Book text | Status | Current evidence |
|---|---|---|
| "more than 70 percent of pull requests attributed to local or cloud agents" | **CONFIRMED, current** | [E1], [E4] (2026-08-27 / AIE WF 2026) |
| "more than 3,600 engineer-created agent skills" | **CONFIRMED, current** | [E1] |
| "executing over 30,000 times per day" | **CONFIRMED, current** | [E1] |
| "cutting token use by more than half on common workflows and by more than 90 percent in bulk cases" | **CONFIRMED** | [E43] |
| "managed agents are evaluated in units such as cost per merged pull request, review, or alert" | **CONFIRMED** (and Uber adds "cost per cleanup") | [E37] |
| "managed agents performing code review, CI repair, end-to-end changes, alert triage, debugging, and maintenance" | **CONFIRMED** nearly verbatim | [E9] |
| "real workloads become benchmarks; models are selected against cost, quality, and reliability" | **CONFIRMED** verbatim | [E38] |

**Things the rewrite wave should act on:**

1. **[NEW — admission authority]** The book's Uber paragraph says nothing about
   who admits a change. There is now a dated, first-party, on-the-record
   statement: humans still approve code today, with automatic approval for some
   percentage forecast as a near-term step [E30], and the human role explicitly
   framed as moving "up a layer" rather than out [E31]. This is strong material
   for the admission-authority thread and for §5.4.

2. **[NEW — trend the book might use]** Agent share of PRs moved from **11%
   opened by agents (Mar 2026)** [E8] and **11% of merged PRs via Minion (May
   2026)** [S11] to **>70% attributed to local or cloud agents (Aug 2026)**
   [E1]. These almost certainly measure different things, and no source
   reconciles them. Presenting the 70% figure without noting the undefined
   denominator would overstate what Uber has actually published.

3. **[SHARPEN]** "the reasoning surface is a knowledge-and-context graph, not an
   executable model of the software's behavior" — still correct, but [E24] (the
   inner loop comparing a simulator screenshot against a **Figma
   specification**) is a real, narrow counter-example: a design artifact used as
   a mechanical admission oracle. Worth a clause rather than a silence.

4. **[SHARPEN]** "Supervision is structured by measurement" — true, but the
   crawl shows the measurement is **asymmetric**: cost metrics are published in
   detail; the named quality signals (revert rate, F1, MTTR) are tracked and
   **never published** [E37], [G4]. The current sentence reads as more
   quality-anchored than the record supports.

5. **[ADD — the closing note]** Uber ends its own talk where the book's argument
   ends: implementation feasibility no longer settles the product question, and
   "the factory still needs people to decide whether that feature should be
   built" [E46]. This is Uber independently arriving at §5.1's conclusion, and
   it is currently unused in the book.

6. **[CAUTION]** Uber's "250+ automated migrations, nine million lines" [E5] is
   not decomposed into agentic vs. deterministic work; the only migration with a
   first-party technical account was executed by OpenRewrite codemods with CI as
   validator [E29]. Do not present Uber's migration volume as evidence of agent
   capability.

7. **[NOT EVIDENCE]** Two figures circulating in third-party summaries could not
   be verified and must not be used: "21,000 developer hours saved" and "10%
   coverage increase" for AutoCover do **not** appear in the ICSE paper [S3];
   and the "99% of our engineers use AI tools" claim attributed to an Uber
   executive is behind an HTTP 402 and unverifiable.
