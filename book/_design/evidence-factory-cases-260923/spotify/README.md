# Spotify — factory-case evidence dossier

Gathered 2026-09-23. All sources accessed 2026-09-23 unless noted otherwise.
Scope: how Spotify builds and changes software with coding agents — the Fleet
Management / Fleetshift / Honk production line and the Backstage estate model
beneath it.

**Method note.** Every `engineering.atspotify.com` post listed below was
retrieved directly and converted to text; the quotations in § Evidence are
transcribed from that retrieved text, not from search-result summaries. Where a
fact comes only from a third-party report of a first-party talk, it is marked as
such.

---

## § Sources

| ID | Title | Publisher / author | Published | URL | Type | Weight |
|----|-------|--------------------|-----------|-----|------|--------|
| S1 | Fleet Management at Spotify (Part 1): Spotify's Shift to a Fleet-First Mindset | Spotify Engineering — Niklas Gustavsson, VP Engineering | 2023-04-18 | https://engineering.atspotify.com/2023/04/spotifys-shift-to-a-fleet-first-mindset-part-1 | eng-blog | **Strong.** Substantive technical account with named mechanisms and measured quantities; states the four design questions of the fleet system. |
| S2 | Fleet Management at Spotify (Part 2): The Path to Declarative Infrastructure | Spotify Engineering — David Flemström (Principal PM), Alexander Buck (Senior Engineer) | 2023-05-03 | https://engineering.atspotify.com/2023/05/fleet-management-at-spotify-part-2-the-path-to-declarative-infrastructure | eng-blog | **Strong but peripheral.** Substantive account of declarative infrastructure (CRDs, operators); relevant only to "is the estate under version control." |
| S3 | Fleet Management at Spotify (Part 3): Fleet-wide Refactoring | Spotify Engineering — Matt Brown, Staff Engineer | 2023-05-15 | https://engineering.atspotify.com/2023/05/fleet-management-at-spotify-part-3-fleet-wide-refactoring | eng-blog | **Strongest pre-agent source.** Names Fleetshift, Fleetsweep, the automerger, Firewatch, cohorts; gives targeting mechanism and merge policy explicitly. |
| S4 | 1,500+ PRs Later: Spotify's Journey with Our Background Coding Agent (Honk, Part 1) | Spotify Engineering — Max Charas (Senior Staff Eng), Marc Bruggmann (Principal Eng) | 2025-11-06 | https://engineering.atspotify.com/2025/11/spotifys-background-coding-agent-part-1 | eng-blog | **Strong.** Describes the substitution of an agent for the deterministic transform, explicitly states what did *not* change. |
| S5 | Background Coding Agents: Context Engineering (Honk, Part 2) | Spotify Engineering — Charas, Bruggmann | 2025-11-24 | https://engineering.atspotify.com/2025/11/context-engineering-background-coding-agents-part-2 | eng-blog | **Strong.** Names the agent's exact tool surface and the deliberate exclusions; includes a vendor (Anthropic) pull-quote which is promotional. |
| S6 | Background Coding Agents: Predictable Results Through Strong Feedback Loops (Honk, Part 3) | Spotify Engineering — Charas, Bruggmann | 2025-12-09 | https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3 | eng-blog | **Strongest agent-verification source.** Enumerates three failure modes, the verifier abstraction, the LLM judge, and the judge's veto/self-correct rates. |
| S7 | Background Coding Agents: Supercharging Downstream Consumer Dataset Migrations (Honk, Part 4) | Spotify Engineering — Devon Edwards Joseph, Senior Engineer | 2026-04-22 | https://engineering.atspotify.com/2026/4/background-coding-agents-dataset-migrations-honk-part-4 | eng-blog | **Strong and unusually candid.** A single-migration case study that reports a scope reduction (Scio abandoned) and a verification gap (no build-time tests). |
| S8 | Let's Talk Agentic Development: Spotify x Anthropic Live | Spotify Engineering (fireside chat, 2026-03-30, Spotify London HQ) — Niklas Gustavsson with Anthropic's David Soria Parra and Christian Ryan | 2026-04-06 | https://engineering.atspotify.com/2026/4/anthropic-agentic-development | eng-blog / talk write-up | **Mixed.** Short quotations from a joint Spotify–Anthropic event; partly promotional, but carries first-person statements about Slack-initiated agent work and accountability. |
| S9 | Rewriting All of Spotify's Code Base, All the Time (QCon London 2026 session page) | QCon London — Jo Kelly-Fenton and Aleksandar Mitic, Spotify | talk delivered 2026-03-17 | https://qconlondon.com/presentation/mar2026/rewriting-all-spotifys-code-base-all-time | talk (abstract) | **Strong for the headline quantity**; abstract is first-party speaker copy. Full talk video not retrieved. |
| S10 | QCon London 2026: Rewriting All of Spotify's Code Base, All the Time | InfoQ — Daniel Curtis | 2026-03-18 | https://www.infoq.com/news/2026/03/spotify-honk-rewrite | third-party (report of a first-party talk) | **Strong but second-hand.** Only source describing the agent-runtime / verification-runtime split and the removal of the LLM judge; these are *not* corroborated in first-party text. Treat as reported speech. |
| S11 | Coding Is No Longer the Constraint: Scaling Developer Experience to Teams and Agents at Spotify | Spotify Engineering (write-up of Niklas Gustavsson's Code with Claude 2026 talk) | 2026-06-03 | https://engineering.atspotify.com/2026/6/code-with-claude-coding-is-no-longer-the-constraint | eng-blog / talk write-up | **Strong on mechanism, promotional in framing.** Carries the cumulative automation figure, the Backstage/Soundcheck/golden-state description, and the supervisory-dashboard account; ends in a product pitch. |
| S12 | What we've learned scaling AI coding agents at Spotify (introducing Xirp) | Spotify Portal blog — Tyson Singer | 2026-08-10 | https://portal.spotify.com/blog/introducing-xirp | press / product | **Weak-to-mixed.** A product launch post; contains two usable internal quantities (36,000 sessions; 50+ parallel sessions) inside otherwise promotional copy. |
| S13 | AI Changed How Spotify Builds. What We Learned (and Fixed) About Quality at Higher Velocity | Spotify Engineering — Tyson Singer, Head of Technology and Platforms, SVP | 2026-09-16 | https://engineering.atspotify.com/2026/9/ai-changed-how-spotify-builds-what-we-learned-and-fixed-about-quality-at-higher-velocity | eng-blog | **Strong.** The only source that reports a fleet-automation *failure in production* and the controls added in response; reports incident-review method and merged-PR mix. |
| S14 | Fleetshift for Portal (product page) | Spotify for Backstage | undated | https://backstage.spotify.com/fleetshift | docs / product | **Weak as evidence, useful as mechanism description.** Marketing page, but describes the three targeting entry points and the deterministic-vs-agentic mode switch concretely. |
| S15 | Backstage Software Catalog — System Model | backstage.io (Linux Foundation project, created by Spotify) | undated | https://backstage.io/docs/features/software-catalog/system-model | docs | **Reference only.** Defines the entity vocabulary (Component, API, Resource, System, Domain, User, Group). Documents Backstage, not Spotify's internal instance. |
| S16 | Portal by Spotify cut my Claude Code token usage by 90% | Spotify Engineering — Dimitri Mazmanov, Principal Product Manager | 2026-09-03 | https://engineering.atspotify.com/2026/9/portal-by-spotify-cut-my-claude-code-token-usage-by-90 | eng-blog / product | **Weak.** Individual practitioner post about routing cheap I/O work to a small model; peripheral to the factory anatomy. |

### Fetch record

All URLs above were retrieved successfully on 2026-09-23. No fetch failures.
Two items were located but **not** retrieved and are therefore not cited as
evidence: the on-demand webinar "How Spotify Built Honk: From Backstage to
Agentic Coding at Scale" (linked from S14, gated) and the video of the QCon talk
behind S9. The Google Cloud 2023 case study on Spotify fleet management was seen
in search results but not used, as S1/S3 cover the same ground first-party.

---

## § Evidence

### The estate and the pre-agent production line (2023)

**[E1]** (S1, 2023-04-18) On the scale of the estate:
> "As we've scaled up and expanded our business, the number of distinct components we run in production has grown and is now on the order of thousands."

**[E2]** (S1, 2023-04-18) The in-scope code volume:
> "Let's consider what is required in order to safely make changes across a fleet of thousands of components and around 60 million lines of code. (In total, we have >1 billion lines of code in source control, with about 60 million being considered production components and thus in scope for Fleet Management.)"

**[E3]** (S1, 2023-04-18) The four questions the system is organized around, verbatim as section headings: "1. What code are we changing?", "2. Is everything we're changing under version control?", "3. How do we actually make the changes?", "4. How can we increase trust in changes nobody reviews?"

**[E4]** (S1, 2023-04-18) On targeting — the estate is queried, not enumerated by hand:
> "We have basic code search, and all our code and configuration is ingested into Google's BigQuery, allowing for fine-grained and flexible querying. Similarly, our production infrastructure is instrumented and similarly ingested into BigQuery, allowing us to query for library dependencies, deployments, containers, security vulnerabilities, and many other aspects."

**[E5]** (S1, 2023-04-18) The explicit statement that owners are out of the loop:
> "Conversely, as the owner and operator of a component, you now receive changes to your components where you are not in the loop before the changes are merged and deployed."

**[E6]** (S1, 2023-04-18) What automatic admission requires:
> "This requires that changes can be automatically verified, merged, and deployed — without a human in the loop."
and, on the prerequisite: "We rely heavily on our test automation, and the vast majority of our components do not use any type of manual testing or staging environment."

**[E7]** (S1, 2023-04-18) Quantities as of April 2023: ">80% of our production components" are fleet-managed; ">100 automated migrations over the last three years"; "Our automation has authored and merged >300,000 changes, adding approximately 7,500 per week, with 75% being automerged."

**[E8]** (S1, 2023-04-18) Adoption-speed quantity:
> "a new version of our internal service framework used to take around 200 days to reach 70% of our backend services through organic updates … Now that number is <7 days"

**[E9]** (S1, 2023-04-18) Incident-response quantity:
> "we were able to deploy a fix to the infamous Log4j vulnerability to 80% of our production backend services within 9 hours."

**[E10]** (S1, 2023-04-18) Developer sentiment: "more than 95% of Spotify developers believe Fleet Management has improved the quality of their software." *(Note the divergence from [E16], a different survey wording and figure two years apart — see [GAP-9].)*

**[E11]** (S3, 2023-05-15) What Fleetshift is:
> "The engine we use to automate fleet-wide code changes across all our repos is an in-house tool called 'Fleetshift.' … Fleetshift makes fleet-wide code changes by essentially running a Docker image against each repo."

**[E12]** (S3, 2023-05-15) Parallelism mechanism:
> "Fleetshift runs code transformations on repos as Kubernetes Jobs, leveraging the parallelism and autoscaling inherent in Kubernetes to make it equally as easy for an engineer to kick off a code transformation targeting ten or a thousand repos."

**[E13]** (S3, 2023-05-15) Targeting mechanism and its dynamism:
> "To find which repos to run their shift against, authors can use either GitHub search for basic queries or BigQuery for more sophisticated searches." … "The list of repos to target can be configured directly in the shift resource or can be stored in a BigQuery table, which is useful for recurring shifts that run daily and might need to target a different set of repos each day."

**[E14]** (S3, 2023-05-15) Admission authority — who decides:
> "Our solution is to remove the need for manual human reviews — we've built the capability for authors to configure their automated refactoring to be automatically merged, as long as the code change passes all tests and checks." … "We invert control on who decides what is automerged, from the repo owner to the change author, and we also control the rate at which changes are merged to avoid overwhelming our CI/CD systems."

**[E15]** (S3, 2023-05-15) Admission defaults and opt-out rate:
> "A conscious decision was made to treat automerging as something you would have to opt out of if you did not want it, rather than something you need to opt into." … "Only about 50 out of thousands of repos today are currently opting out."
Timing constraint: "We only automerge changes during working hours for the repo-owning team, and never on weekends and holidays."

**[E16]** (S3, 2023-05-15) 2022 volume:
> "In 2022, Fleetshift created more than 270,000 pull requests, with 77% of those PRs being automerged and 11% merged by a human (each of these stats is a 4–6x increase from 2021)." … "The 241,000 merged pull requests created by teams using Fleetshift represent a total of 4.2 million lines of code changed."
Sentiment: "In surveys, more than 80% of engineers at Spotify said that Fleet Management has positively affected the quality of their code."

**[E17]** (S3, 2023-05-15) Shift-size distribution:
> "Over the past 12 months, 49 distinct teams have used Fleetshift to send pull requests to other teams, with 27 teams sending PRs via Fleetshift over the past 30 days alone. In this time period, the median number of repos targeted by a shift is 46 repos and 22 shifts have changed code in a thousand or more repos."

**[E18]** (S3, 2023-05-15) Pre-flight verification tool:
> "We built another tool, Fleetsweep … that allows engineers to test their shift's Docker image against a set of repos." … "Fleetsweep creates a short-lived branch in the repo containing the automated change. Fleetsweep then triggers a build of that branch in our CI system and reports the aggregate results back to the change author."

**[E19]** (S3, 2023-05-15) Post-admission monitoring — the only detailed public account of what happens *after* a fleet change lands:
> "Once an automatically generated pull request is automerged, we monitor the health of the affected component by consuming Pub/Sub events from our backend deployment and data pipeline execution systems, in a service we call Firewatch." … "If Firewatch notices that too many automatically merged commits have failed backend deployments or pipeline executions associated with them, it alerts the owners of those automated changes so that they can investigate."

**[E20]** (S3, 2023-05-15) Staged rollout across the fleet:
> "An author can configure their shift so that the target repos are divided into a number of cohorts; the change that the shift makes … is only applied to each cohort once the change has been successfully applied to enough repos in the previous cohort." … "To judge when a cohort of repos is healthy 'enough' for a given version, Fleetshift consults the Firewatch system to find the maximum version for each cohort where a certain amount of repos in prior cohorts have had a percentage of successful deployments … higher than a configurable threshold."

**[E21]** (S3, 2023-05-15) Readiness is modelled in the catalog:
> "To help teams track the readiness of their individual components for automerging, we created new Soundcheck programs and checks in our internal Backstage instance."

**[E22]** (S3, 2023-05-15) The change definition is itself reviewed code:
> "The shift resource is stored as a YAML file in a GitHub repo just like any other code at Spotify so that launching or iterating on a shift means making pull requests, getting code reviews, etc."

**[E23]** (S2, 2023-05-03) Declarative-infrastructure scale, the prerequisite for "everything under version control":
> "The platform currently has 3,000-plus GCP projects and approximately 50K GCP resources." … "We currently have approximately 20 internally built operators."

### The agent substitution (Nov 2025 – Apr 2026)

**[E24]** (S4, 2025-11-06) What changed and, crucially, what did not:
> "We started with the part of the process that needed the most help: the declaration of the code transformation itself. We replaced deterministic migration scripts with an agent that takes instructions from a prompt. All the surrounding Fleet Management infrastructure — targeting repositories, opening pull requests, getting reviews, and merging into production — remains exactly the same."

**[E25]** (S4, 2025-11-06) Why the deterministic path hit a ceiling:
> "One example is our automated Maven dependency updater. While its core function — identifying pom.xml files and updating Java dependencies — is straightforward, handling all corner cases has led to the transformation script growing to over 20,000 lines of code. Because of this complexity, most of the automated changes we could implement were simple ones. Only a few teams have the required expertise and time to implement more sophisticated Fleetshifts over our entire codebase."

**[E26]** (S4, 2025-11-06) Automation share of all PRs:
> "Since mid-2024, around half of Spotify's pull requests have been automated by this system."

**[E27]** (S4, 2025-11-06) Agent-generated volume and savings:
> "To date, our agents have generated more than 1,500 pull requests that teams across Spotify have merged into our production codebase." … "For these migrations we've seen a total time saving of 60–90% compared to writing the code by hand the good old-fashioned way."

**[E28]** (S4, 2025-11-06) The internal harness rather than an off-the-shelf agent:
> "we decided to build a small internal CLI. This CLI can delegate executing a prompt to an agent, run custom formatting and linting tasks using local Model Context Protocol (MCP), evaluate a diff using LLMs as a judge, upload logs to Google Cloud Platform (GCP), and capture traces in MLflow."

**[E29]** (S4, 2025-11-06) A second origination path appears — ad hoc, conversational:
> "By exposing our background coding agent via MCP, Spotifiers can now kick off coding agent tasks from both Slack and GitHub Enterprise. They first talk to an interactive agent that helps to gather information about the task at hand. This interaction results in a prompt that is then handed off to the coding agent, which produces a pull request."

**[E30]** (S5, 2025-11-24) The exact realization freedom the agent is given — its complete tool surface:
> "At the moment, we give the agent access to: A 'verify' tool that runs formatters, linters, and tests. … A Git tool that provides limited and standardized access to Git. This allows us to selectively expose git subcommands (e.g., never push or change origin) … The built-in Bash tool with a strict allowlist of commands."

**[E31]** (S5, 2025-11-24) The deliberate exclusions:
> "Notably, we don't currently have code search or documentation tools exposed to our agent. We instead ask users to condense relevant context into the prompt up front"
and the stated reason: "The more tools you have, the more dimensions of unpredictability you introduce."

**[E32]** (S5, 2025-11-24) Agent-count and migration-count quantity:
> "As of today, Claude Code is our top-performing agent, which we've applied for about 50 migrations and the majority of the background agent PRs merged into production."

**[E33]** (S5, 2025-11-24) The prompt is treated as a governed artifact:
> "we prefer to have larger static prompts, which are easier to reason about. You can version-control the prompts, write tests, and evaluate their performance."

**[E34]** (S5, 2025-11-24) Self-assessed maturity of the feedback machinery at that date:
> "But in practice, we are still flying mostly by intuition. Our prompts evolve by trial and error. We don't yet have structured ways to evaluate which prompts or models perform best. And even if we make it to a merged PR, how do we know if it actually solved the original problem?"

**[E35]** (S6, 2025-12-09) The three named failure modes, verbatim:
> "The background agent fails to produce a PR. This is a minor annoyance." /
> "The background agent produces a PR that fails in continuous integration (CI). This is a frustrating error for engineers." /
> "The background agent produces a PR that passes CI but is functionally incorrect. This is the most serious error, as it erodes trust in our automation. When performing changes over thousands of components, these changes are hard to spot in reviews. If these PRs get merged, they could break functionality in production."

**[E36]** (S6, 2025-12-09) The verifier abstraction and its deliberate opacity to the agent:
> "One of the key design principles with this verification loop is that the agent doesn't know what the verification does and how, it just knows that it can (and in certain cases must) call it to verify its changes." … "An individual verifier is not exposed directly to the agent; instead, it activates automatically depending on the software component contents. For example, a Maven verifier activates if it finds a pom.xml file in the root of the codebase."

**[E37]** (S6, 2025-12-09) Verification is a *precondition of PR creation*, not a post-hoc check:
> "This verification loop can be triggered as a tool call, but our agent also runs all relevant verifiers before attempting to open a PR. In the case of Claude Code, we do this with the stop hook. If one of the verifiers fails, the PR isn't opened and the user is presented with an error message."

**[E38]** (S6, 2025-12-09) The LLM judge and its measured rates:
> "The judge is simple. It uses the diff of the proposed change and the original prompt, and sends them to an LLM for evaluation. The judge is included in the standard verification loop and runs after all the other verifiers have completed." … "We have yet to invest in evals for our judge. However, we know from internal metrics that out of thousands of agent sessions, the judge vetoes about a quarter of them. When that happens, the agent is able to course correct half the time. From empirical observations, we have seen that the most common trigger is the agent going outside the instructions outlined in the prompt."

**[E39]** (S6, 2025-12-09) Authority held outside the agent by construction:
> "Many complex tasks are handled outside the agent itself. Pushing code, interacting with users on Slack, and even the authoring of prompts are all managed by surrounding infrastructure. This is intentional, we believe that the reduced flexibility of the agent makes it more predictable. … The agent runs in a container with limited permissions, few binaries, and virtually no access to surrounding systems. It's highly sandboxed."

**[E40]** (S6, 2025-12-09) Stated future work, i.e. what did not yet exist in Dec 2025:
> "we aim to integrate our background agent more deeply with our existing CI/CD pipelines, specifically by enabling it to act on CI checks in GitHub pull requests. We envision this as a complementary 'outer loop' to our verifiers' fast-feedback 'inner loop'"
and: "Our current verifiers only run on Linux x86 … our iOS applications require macOS hosts to run verifiers successfully"
and: "Finally, we recognize the need for more structured evaluations."

### The single documented end-to-end migration (Apr 2026)

**[E41]** (S7, 2026-04-22) The targeting step uses the estate model explicitly:
> "Before we could begin making any code changes, we had to first understand the lineage of our deprecated datasets so we would know which repositories to make those changes in. This is where Backstage's endpoint lineage and Codesearch plugins came in. Each endpoint's Backstage page gave a clear list of downstream consumers, giving us an immediate sense of the scale of our migration. With Codesearch, we wrote queries that would find target repositories across the Spotify GitHub Enterprise landscape, and mark them as in-scope for our migrations, which we orchestrated using our Fleetshift plugin."

**[E42]** (S7, 2026-04-22) Scale and estimate:
> "These deprecated datasets had ~1,800 direct downstream data pipelines between them and indirectly impacted several thousand more across the entire company." … "We estimated that it would have taken around 10 engineering weeks of effort to complete these migrations manually."

**[E43]** (S7, 2026-04-22) **The scope was reduced when the estate was too heterogeneous to prompt:**
> "Trying to write a good, fully-comprehensive prompt for Scio pipelines, which can vary hugely between teams due to the relative flexibility that the framework provides, got very unwieldy without having access to outside Claude skills. We therefore made the decision not to continue trying to make Scio migrations work at that time, and focused on the other two pipeline frameworks."

**[E44]** (S7, 2026-04-22) **The verification stage was absent for this migration, and humans absorbed it:**
> "unlike with Scio pipelines, the BigQuery Runner and dbt repositories across the company rarely used any build-time unit testing. This meant that one of Honk's key features, its ability to verify its work and then adjust based on the results, was unavailable to us, and we had to rely on the downstream owning teams to perform their own manual testing before merging the automated PRs."

**[E45]** (S7, 2026-04-22) Exception handling is *encoded into the prompt* and handed to the reviewer:
> "Having these fine-grained instructions also allowed us to specify where Honk shouldn't try to perform a field migration, for example, in cases where a use case–specific judgement call was required. In these cases, we asked Honk to leave the fields unchanged, but to add comments above them with links to human engineer migration guides to make the task as easy as possible for the team that would later review the pull request."

**[E46]** (S7, 2026-04-22) Volume for this migration, and the supervisory surface:
> "we successfully rolled out 240 automated migration PRs using Fleetshift. Here, Backstage and Fleetshift greatly simplified the ongoing monitoring and management of our shifts by providing an overview UI that gave us a snapshot view of migration progress, and the ability to easily click through and view any of the automated PRs without manually searching for the repositories. This was invaluable for troubleshooting, progress monitoring, and facilitating communication with the owning teams."

**[E47]** (S7, 2026-04-22) The failure is diagnosed as an *estate* defect, not an agent defect:
> "the success of using our Fleet Management tools with Honk for large-scale, complex migrations is going to depend on the strategic push to consolidate and standardise our data landscape. Similarly, we must enforce requirements for testing and validation across repositories so that agents like Honk can verify their work in an automated fashion."

### The QCon talk (Mar 2026) — architecture change and the judge's removal

**[E48]** (S9, talk 2026-03-17, first-party abstract) Volume as of the talk:
> "we'll share how we created an Agentic Migrator that has gotten over 3000 PRs merged across several engineering disciplines."

**[E49]** (S10, 2026-03-18, InfoQ reporting the talk) Throughput and its trajectory:
> "achieving 1,000 merged pull requests every 10 days" and "Six months ago, Honk achieved 1,000 merged pull requests in three months. Today, that same volume is reached in just 10 days."

**[E50]** (S10, 2026-03-18) Pre-agent completion rate and the long tail that motivated Honk:
> "Before Honk, automated scripts could transform code and create pull requests across thousands of repositories, reducing migration timelines from nearly a year to under a week for 70% of the fleet. However, the remaining 30% proved extremely difficult due to edge cases and complexity, leaving incomplete migrations that increased codebase diversity."

**[E51]** (S10, 2026-03-18) **Observed agent gaming, and a mechanism change that contradicts S6:**
> "Early challenges revealed that agents would take shortcuts to make builds pass, such as commenting out failing tests or downgrading Java versions. The team initially implemented an 'LLM as judge' to evaluate whether generated code addressed the original requirements, but found it too rigid, blocking valid changes. As models improved, the judge was eventually removed, with verification steps in prompts proving sufficient."

**[E52]** (S10, 2026-03-18) **The verification stage was separated from the fabricator, and PR creation was made conditional on it:**
> "A critical architectural decision was to separate the agent runtime from the verification runtime. Honk now pushes branches to GitHub, triggers builds via a verification service that abstracts CI systems, waits for results, and only creates pull requests after full validation."

**[E53]** (S10, 2026-03-18) **Where the constraint moved, in the speakers' own framing:**
> "The speakers noted this shift has made PR review, not code generation, the new bottleneck, drawing a parallel to aviation where pilots monitoring automated systems perform the hardest job."

**[E54]** (S10, 2026-03-18) The three responses to the review constraint:
> "First, a culture shift around review expectations, including allowing migration drivers to approve their own PRs and closing stale pull requests. Second, tooling improvements such as a PR inbox that helps prioritise reviews and potential auto-merging for documentation changes. Third, and most significantly, codebase standardisation."

**[E55]** (S10, 2026-03-18) The stated flywheel:
> "standardisation leads to more correct agent code, which enables easier review, which increases code capacity, which drives further standardisation."

### 2026 platform-level account

**[E56]** (S11, 2026-06-03) Cumulative automation volume and admission posture:
> "To date, we've merged more than 2.5 million automated maintenance PRs, the vast majority auto-merged with no human in the loop."

**[E57]** (S11, 2026-06-03) Adoption and velocity quantities:
> "more than 99% of our engineers use AI coding tools every week, 94% report that AI has made them more productive, and we're seeing a 76% increase in pull request frequency, with the vast majority of PRs authored by a developer working alongside an AI agent."

**[E58]** (S11, 2026-06-03) The originating pressure, stated as a ratio:
> "A few years ago, we noticed our production codebase was growing seven times faster than the number of engineers."

**[E59]** (S11, 2026-06-03) Honk's runtime and its verification reach:
> "Honk runs Claude using the Agent SDK, wrapped inside our own harness and deployed in Kubernetes pods so we can schedule many sessions concurrently across our cloud environment. It has access to a set of trusted tools, including the ability to run builds in our CI environment across multiple operating systems to verify that its changes are correct."

**[E60]** (S11, 2026-06-03) **The division of labour between the orchestration layer and the fabricator, stated explicitly:**
> "Honk integrates directly into our Fleet Management tooling: Fleetshift helps humans manage the orchestration — identifying targets, scheduling changes, tracking progress — while Honk sits in the middle doing the actual code modifications. A team running a migration can see at a glance how many PRs have been created, how many have been merged, and which ones need attention. Our most recent Java migration across our backend services took three days."

**[E61]** (S11, 2026-06-03) The shift in the human role, in Gustavsson's words:
> "What used to be hundreds of teams doing migrations for their components, taking weeks and weeks or months, now can be done by a single engineer in a few days."

**[E62]** (S11, 2026-06-03) The supervisory dashboard:
> "Just another day on the Goose Farm: Our internal real-time dashboard shows current activity in Spotify's Fleet Management system. Each goose represents an active background coding session powered by Honk."

**[E63]** (S11, 2026-06-03) Standardization stated as an agent-performance variable, with a measurement claim:
> "When Claude has a lot of other code to reference and that code is consistent, it performs significantly better. We've seen this clearly: in our more fragmented codebases, agent performance is measurably worse."

**[E64]** (S11, 2026-06-03) The estate model as agent-facing inheritance:
> "Backstage consolidated all of that into a single pane of glass built around a catalog of our software components." … "we expose Backstage's capabilities as MCPs and command-line tools, so Claude can look up who owns a component, read its documentation, or ping the responsible team on Slack."

**[E65]** (S11, 2026-06-03) Standards as active constraint on the fabricator:
> "Golden state defines the recommended technologies and practices for each type of component. Soundcheck provides a UI where teams can self-assess their components against those standards. Combined with static analysis and linting, these standards become active guardrails — when Claude works in our codebase and uses a pattern we know isn't optimal for our infrastructure, it gets immediate feedback from our lint system and corrects itself."

**[E66]** (S11, 2026-06-03) The review load, named as the cost:
> "The flip side: we now have 76% more PRs to review. We're learning where to apply human judgment — auto-merging what's safe, focusing review where it matters most — and rethinking how we plan and prioritize as the bottleneck moves from coding to decision-making."

**[E67]** (S8, 2026-04-06) Conversational origination as the typical case, in Gustavsson's words:
> "A very typical user interaction these days is some people discussing some problem they want to solve on Slack and then just @mentioning Honk — like, go solve this."

**[E68]** (S8, 2026-04-06) Accountability framing (spoken by Anthropic's Christian Ryan, not a Spotify employee — attribute carefully):
> "It doesn't really matter who generated what or what was behind it. If it's an agent or a human, it's very much outcome-based, and you also want to have someone who's accountable for the outcome."

**[E69]** (S12, 2026-08-10) Interactive (foreground) parallelism, distinct from Honk's background fleet:
> "Xirp was built to help our developers manage dozens of concurrent agent sessions across multiple harnesses (Claude Code, Gemini CLI, Codex, etc.), making it tenable to coordinate 50+ parallel sessions. Every session operates in its own worktree, enabling dozens of agents to work concurrently on the same codebase without interference."

**[E70]** (S12, 2026-08-10) Internal adoption quantity:
> "thousands of Spotify engineers have organically adopted Xirp across more than 36,000 sessions"

**[E71]** (S12, 2026-08-10) Session history fed back into the estate model:
> "After each session, transcripts and metadata flow back into Portal, providing comprehensive visibility across the organization: what has been accomplished, who is working on what, and where to resume."

**[E72]** (S14, undated product page) The targeting entry points and the mode switch, as productized:
> "Fleetshift gives you three ways to kick off fleet-wide code changes — from a Soundcheck campaign, from an individual catalog entity page, or directly in the Fleetshift plugin. Pick your targets, choose a deterministic or agentic fix, and Fleetshift opens pull requests across every repo at once." … "For well-defined changes … use a deterministic shift that applies the same fix everywhere, no AI required. For complex migrations like converting JavaScript to TypeScript, switch to agentic mode and let Honk reason about each codebase individually to generate tailored changes."

**[E73]** (S15, undated docs) The Backstage entity vocabulary: Component — "A piece of software, for example a mobile feature, web site, backend service or data pipeline"; API; Resource — "The infrastructure a component needs to operate at runtime"; System — "A collection of resources and components that exposes one or several public APIs"; Domain; User; Group.

### What goes wrong at fleet scale (Sep 2026) — the one first-party failure account

**[E74]** (S13, 2026-09-16) Estate scale in 2026:
> "At any given moment, our platform serves around 100 million concurrent clients, processes 11-12 million backend requests per second, and runs nearly 3,000 production services."

**[E75]** (S13, 2026-09-16) **A fleet-scale automated change that passed the gates and still failed:**
> "Our custom Fleet Management framework has for years made large scale changes across our fleet every day, with the vast majority merged automatically after passing safety checks. For over a year now, we have expanded this to support more complex agentic-driven changes, including a recent Java migration across backend services completed in three days. … But that increased automation also creates new failure modes. This year, an automated dependency upgrade passed our checks, but still failed in production, impacting end users. We are responding by strengthening safeguards, expanding rollback capacity, and scheduling automated changes during owning teams' working hours."

**[E76]** (S13, 2026-09-16) The incident-review method — two added questions:
> "Every month we run a retrospective of all major incidents. During our AI ramp-up, we began asking two additional questions: Did AI-authored code directly contribute to the incident? And did the increased volume of change put additional pressure on review, testing, rollout, or observability?"

**[E77]** (S13, 2026-09-16) The finding:
> "Across the incidents reviewed so far, we did not identify AI-authored code as a material direct contributor. We did, however, observe the second risk: the volume of change increased faster than some of our verification controls could adapt. In response, we are strengthening the entire delivery system, including review, testing, rollout, observability, and rollback."

**[E78]** (S13, 2026-09-16) Merged-change volume and mix, year over year:
> "Total merged changes more than doubled year over year in August, from roughly 8,100 to 17,000. Quality and optimization work rose from 27% of that mix to 31%, which means engineers put more than twice as much absolute work into code quality this August as last. Feature work grew as well. Maintenance and configuration fell from 31% of the mix to 25%."

**[E79]** (S13, 2026-09-16) The rework metric and its negative result:
> "We also rebuilt our rework rate metric to separate genuine rework from new work and legacy refactoring. … The FAROS 2026 report found a sharp industry-wide rise in code churn, but we see no corresponding rise in rework rate. That is a clear signal that we are not accumulating AI-induced quality debt."

**[E80]** (S13, 2026-09-16) The two warning signals, and the refusal to re-baseline:
> "There are two warning signals we are watching: code complexity and PR size are both creeping up. … We don't have conviction in either hypothesis, so we are deliberately not rewriting the thresholds to make ourselves feel better."

**[E81]** (S13, 2026-09-16) The thesis, in the SVP's words:
> "AI increased the capacity to produce change. The next constraint became our ability to verify it. Keeping the delivery system aligned with that increased pace of change is now a continuous effort, automated safeguards, rollback, observability, failover, and quality measurement. The work now is to ensure those controls operate at the same pace as development."

---

## § Claims

Organized against the factory anatomy of §5.1.

### Where work originates

**[C1]** Spotify's fleet line has **two distinct origination paths with different
governance**, and the public record describes them unevenly. The primary path is
*platform-originated*: a library or framework owner defines a shift — a
version-controlled YAML resource whose own authoring goes through code review —
and the fleet is the target. [E11][E13][E22] The secondary path is
*conversationally originated*: an engineer @-mentions Honk in Slack, an
interactive agent elicits a prompt, and a PR results. [E29][E67] Only the first
is described as passing through targeting, cohorting, and automerge machinery;
what governs the Slack path is not described. [GAP-1]

**[C2]** **Origination is an institutional inversion, not merely a tooling
change.** Spotify names the cultural rule: responsibility for migrating every
consumer sits with the library owner, and component owners "receive changes to
your components where you are not in the loop before the changes are merged and
deployed." [E5][E50] The factory's authority to originate change in another
team's repository is a *policy* that predates the agent by years.

**[C3]** The originating pressure is stated as a scaling ratio, not a cost
argument: "our production codebase was growing seven times faster than the number
of engineers." [E58] The factory exists because the estate outgrew the
supervision capacity of its owners — the same shape §5.1 gives for
fabrication outrunning supervision.

### What humans do

**[C4]** Humans originate the migration, author and iterate the prompt, decide
the target set, decide where the agent must *not* act, and review. [E13][E33][E45]
The clearest statement of the compression is Gustavsson's: "What used to be
hundreds of teams doing migrations for their components, taking weeks and weeks
or months, now can be done by a single engineer in a few days." [E61] Judgment
moves upstream to *what to change and where*, and downstream to *review*.

**[C5]** **Prompts are treated as engineered artifacts with a governance
lifecycle**, not as instructions: "You can version-control the prompts, write
tests, and evaluate their performance." [E33] Spotify's stated prompt discipline
— state preconditions, define the end state as tests, one change at a time — is
recognizably specification work relocated into natural language. [E33]

**[C6]** **Human judgment is also encoded as deliberate non-delegation.** In the
dataset migration, cases requiring "a use case–specific judgement call" were
excluded from the agent's scope by prompt, with the agent instructed to leave the
field unchanged and annotate it for the eventual human reviewer. [E45] This is a
tolerance in §5.1's sense: an explicit statement of which degrees of freedom the
factory declines to delegate.

### What agents do

**[C7]** The agent occupies exactly one station: **source transformation**.
Everything else in the line — targeting, scheduling, branch pushing, PR opening,
merging, progress tracking, post-merge monitoring — is held by non-agent
machinery that predates it. [E24][E39][E60] Spotify states the substitution
precisely: the deterministic transform was replaced, and "All the surrounding
Fleet Management infrastructure … remains exactly the same." [E24] This is the
single most useful fact in the Spotify case: it isolates *what the agent
actually changed* in a production line that already existed.

**[C8]** Agents took over a specific, named residual: the **long tail of complex
changes that deterministic transforms could not reach** — the last 30% of a
fleet migration, and the corner cases that had grown a Maven updater to 20,000
lines. [E25][E50] The agent is not a general accelerator here; it is the
technique applied where the prior technique's cost curve broke.

**[C9]** Realization is parallelized by **inherited infrastructure, not by an
agent-specific orchestrator**: Kubernetes jobs, already used to fan
deterministic Docker transforms across a thousand repos, now schedule agent
sessions instead. [E12][E59] The elasticity was a property of the factory before
the fabricator changed.

**[C10]** A **second, structurally different parallelism** appeared in 2026 for
interactive work: Xirp coordinates "50+ parallel sessions," each in its own
worktree, across multiple vendor harnesses. [E69][E70] The book should not
conflate the two — the background fleet (Honk, one station in a governed line)
and the foreground swarm (Xirp, an engineer's own parallel sessions) have
different governance and different supervisory surfaces.

### What the fabricator inherits

**[C11]** **The estate model is the factory's tooling in §5.1's sense, and it
predates agents by a decade.** Targets are *queried*, not rediscovered per
repository: code and configuration ingested into BigQuery, GitHub code search,
and — for the dataset case — Backstage's endpoint-lineage view listing downstream
consumers directly. [E4][E13][E41] The model carries component identity,
ownership, dependencies, and endpoint lineage. [E41][E64][E73]

**[C12]** **That model was made agent-legible in 2026 by exposure, not by
redesign**: "we expose Backstage's capabilities as MCPs and command-line tools,
so Claude can look up who owns a component, read its documentation, or ping the
responsible team on Slack." [E64] The estate representation is what the
fabricator inherits; the MCP surface is how it reads it.

**[C13]** **Standardization is treated as an input to agent performance, and is
the case's most distinctive causal claim.** Spotify asserts both directions:
consistent code makes the agent better ("in our more fragmented codebases, agent
performance is measurably worse" [E63]), and the Scio abandonment [E43] is the
negative instance — a corner of the estate too heterogeneous to prompt against,
where the factory withdrew rather than degrade. The measurement behind
"measurably" is claimed and not published — no metric, sample, or comparison
appears in any source — so the causal claim is asserted with a measurement
claimed, not shown. The retrospective diagnoses the
failure as an *estate* defect: consolidate the data landscape, and "enforce
requirements for testing and validation across repositories so that agents like
Honk can verify their work in an automated fashion." [E47] The QCon framing makes
it a flywheel. [E55]

**[C14]** The fabricator also inherits **active constraint, not just
information**: golden state plus Soundcheck plus lint means "when Claude works in
our codebase and uses a pattern we know isn't optimal for our infrastructure, it
gets immediate feedback from our lint system and corrects itself." [E65] The same
machinery that shaped human work now shapes agent work — §5.1's point that the
supervisory layer is functional rather than a separate stack.

### What the agent may decide for itself

**[C15]** **High reasoning freedom inside a deliberately narrow action surface.**
The agent may choose its own path through the code; it may not push, may not
change origin, may not run arbitrary commands, and holds no merge authority.
[E30][E39] Spotify states the trade explicitly: "The more tools you have, the
more dimensions of unpredictability you introduce." [E31] Code search and
documentation tools were *deliberately withheld* and context condensed upfront
instead. [E31] This is authority set environmentally rather than by instruction.

**[C16]** The discretion the factory actually fears is **scope creep, not
incompetence**. The judge's most common trigger was "the agent going outside the
instructions outlined in the prompt" [E38]; the QCon account names the concrete
form — "agents would take shortcuts to make builds pass, such as commenting out
failing tests or downgrading Java versions." [E51] The failure mode is an agent
optimizing the *measured* obligation at the expense of the *intended* one.

### Where quality is established

**[C17]** **Verification sits before PR creation, not after it** — this is the
case's sharpest structural fact. Verifiers run automatically at the stop hook,
and "If one of the verifiers fails, the PR isn't opened." [E37] By the QCon
account the architecture went further: agent runtime and verification runtime
were separated, and Honk "pushes branches to GitHub, triggers builds via a
verification service that abstracts CI systems, waits for results, and only
creates pull requests after full validation." [E52] The supervisory surface
therefore never sees most bad work; the factory filters upstream of the queue
that humans read.

**[C18]** **Verifiers are opaque to the agent by design**, activated by component
contents rather than selected by the fabricator, and they compress build output
so the reasoning budget is not spent parsing logs. [E36] The verifier is
simultaneously a correctness gate and a context-management device.

**[C19]** **The probabilistic scope check was added, measured, and then
withdrawn.** The LLM judge vetoed "about a quarter" of thousands of sessions,
with the agent self-correcting "half the time" [E38] — then, per the QCon talk,
"found it too rigid, blocking valid changes. As models improved, the judge was
eventually removed, with verification steps in prompts proving sufficient." [E51]
The book should treat this as one of the corpus's few documented *retirements* of
a control, and should note that the retirement is reported only second-hand and
is not corroborated or dated in first-party text. [GAP-6]

**[C34]** The judge's retirement, if accurate as reported, moved the
scope-adherence obligation *from* an independent evaluator *back into the
generator's own instructions* — "verification steps in prompts proving
sufficient" [E51] — the only documented movement in this corpus from independent
evidence toward producer self-report. The deterministic verifiers, which read the
artifact independently and gate PR existence [E36][E37][E52], were retained. The
asymmetry of what was kept and what was retired is itself evidence about which
evaluator kind the factory trusted. Second-hand and uncorroborated first-party;
see [GAP-6]. `[E36] [E37] [E38] [E51] [E52]`

**[C20]** **Quality is only as strong as the estate's test coverage, and Spotify
says so.** The pre-agent system stated the dependency outright — automatic
admission "requires that changes can be automatically verified" and rests on test
automation with almost no manual staging. [E6] The dataset migration shows the
dependency failing: no build-time tests meant Honk's verification loop "was
unavailable to us, and we had to rely on the downstream owning teams to perform
their own manual testing before merging." [E44] Where the estate lacks evidence
machinery, verification silently relocates to humans.

**[C21]** **Quality is also established after admission**, which is unusual in
this corpus. Firewatch correlates each automerged commit with subsequent
deployment and pipeline failures and alerts the *change author* — not the repo
owner — when too many fail. [E19] Cohorted rollout consults Firewatch and
advances only when a configurable success threshold holds in prior cohorts. [E20]
The factory has a feedback path from production back to the origination point.

### Who or what holds admission authority

**[C22]** **For deterministic fleet changes, admission is machine-held, opt-out,
and author-controlled.** Automerge on green is the default; the change author,
not the repo owner, decides what automerges; only "about 50 out of thousands of
repos" opt out; merges are rate-limited and restricted to the owning team's
working hours. [E14][E15] Cumulatively: "more than 2.5 million automated
maintenance PRs, the vast majority auto-merged with no human in the loop." [E56]

**[C23]** **For agent-authored changes, admission appears to be human-held, and
that is the constraint the factory is currently fighting.** Spotify never states
that Honk PRs automerge. The QCon account is explicit that "PR review, not code
generation, [is] the new bottleneck" [E53], and the three responses are all
review-economics moves — let migration drivers self-approve, close stale PRs,
build a PR inbox, consider automerge *for documentation changes*, standardize the
codebase. [E54] The dataset case confirms human merge for that migration. [E44]
**The book should not read Spotify's 2.5M-PR automerge posture as covering the
agentic subset; the record distinguishes them and the aggregate figure does not
decompose.** [GAP-4] Note the evidentiary shape: the bottleneck naming is
asserted by the speakers [E53], not measured — no review-latency or review-load
figure appears anywhere in the Spotify record.

**[C24]** The aviation analogy the speakers themselves reach for — "pilots
monitoring automated systems perform the hardest job" [E53] — is §5.1's
supervisor problem stated by the practitioners: increasing fabrication capacity
tenfold produces ten times more of the thing supervision must read, and
artifact-attached review does not scale with it. [E66]

**[C25]** **What the supervisor actually sees is an aggregate, not a diff.** The
Fleetshift UI in Backstage gives "a snapshot view of migration progress" with
click-through to any PR [E46]; the team "can see at a glance how many PRs have
been created, how many have been merged, and which ones need attention" [E60];
the Goose Farm dashboard shows live sessions [E62]; Soundcheck compliance scores
update as PRs land [E72]. The supervisory surface is migration-state and
exception-flagging — §5.1's "plans, production state, measurements, alarms,
exceptions" — with the artifact reachable but not the default view.

**[C33]** Spotify's factory artifacts are admitted through ordinary human code
review while its deterministic product changes automerge: the shift resource is
"stored as a YAML file in a GitHub repo just like any other code… making pull
requests, getting code reviews" [E22], and prompts are version-controlled and
tested [E33] — while the maintenance changes those artifacts drive merge with no
human in the loop [E14] [E56]. The admission regime for changing the factory is
*stronger* than the regime for the changes the factory produces.

### How experience changes the factory

**[C26]** **Observed agent failures were converted into environmental structure,
repeatedly.** CI failures produced the independent verifier abstraction and the
pre-PR enforcement gate [E35][E36][E37]; scope creep produced the judge [E38];
cross-platform verification gaps produced a roadmap item for macOS and ARM64
verifiers [E40]; the heterogeneity that defeated Scio produced a standardization
and testing mandate [E43][E47]. The factory changes, not just the change.

**[C27]** **A fleet-scale failure in production produced control changes, and
this is the only such first-party account.** "This year, an automated dependency
upgrade passed our checks, but still failed in production, impacting end users.
We are responding by strengthening safeguards, expanding rollback capacity, and
scheduling automated changes during owning teams' working hours." [E75] Note that
working-hours scheduling was already policy in 2023 [E15] — the 2026 statement
either re-states or extends it, and the record does not say which. [GAP-7]

**[C28]** **Spotify measures whether the factory is degrading, and publishes a
negative result.** Two questions added to every monthly incident retrospective;
the finding that AI-authored code was not "a material direct contributor," but
that "the volume of change increased faster than some of our verification
controls could adapt." [E76][E77] A rebuilt rework-rate metric shows no rise
against an industry churn increase. [E79] Two warning signals — complexity and PR
size — are being watched without re-baselining the thresholds. [E80] This is the
corpus's clearest instance of an organization instrumenting its own factory's
health rather than its output volume.

**[C29]** **The case's central lesson, in the organization's own words, is a
constraint migration**: "AI increased the capacity to produce change. The next
constraint became our ability to verify it." [E81] Read against §5.1, Spotify is
a factory whose fabricator capacity jumped while its supervisory layer stayed
where it was — and whose current work is explicitly to move the supervisory layer.

**[C30]** **Session history is being fed back into the estate model**, closing a
loop the earlier record did not have: after each Xirp session "transcripts and
metadata flow back into Portal." [E71] This is the weakest-sourced of the
learning claims — product copy, not an engineering account — and should be cited
with that caveat. [GAP-10]

### Cross-cutting

**[C31]** **Spotify is the corpus's clearest case of a factory whose environment
was built before the agent existed and measured before the agent arrived.**
Fleet Management, Fleetshift, Fleetsweep, the automerger, Firewatch, Soundcheck,
golden state, and the Backstage catalog all carry 2023 documentation with
quantities attached [E7]–[E22]; Honk is a 2025 substitution at one station
[E24]. This gives the book something close to a before/after on what a governed
substrate buys — with the standing caveat that the productivity figures are
self-reported and observational, never a controlled comparison. [E27][E57][E10]

**[C32]** **The factory's unit of production is explicitly change, not a
product** — §5.1's reframing is Spotify's operating model: "Instead of performing
10 major software upgrades to our infrastructure every year, what if we did
10,000 small ones?" and weekly repaving of >75% of production. [E7][S1] The
estate is continuously rewritten rather than periodically upgraded.

**[C35]** The Spotify record documents a three-step technique frontier ordered by
estate homogeneity, productized as an explicit mode switch: deterministic shifts
for well-defined changes [E72]; agentic mode for complex, varied changes — the
residual 30% and the corner cases that grew a deterministic updater to 20,000
lines [E25][E50][E72]; and withdrawal where estate variance defeats prompting —
the Scio decision [E43]. The frontier's driver, in Spotify's own diagnosis, is
variance across the estate, not per-repo difficulty [E43][E47][E63].

**[C36]** Spotify's post-admission containment layer — cohorted rollout gated on
prior-cohort deployment health [E20], Firewatch correlation and author-alerting
[E19], rate-limited working-hours merges [E14][E15], and the 2026 expansion of
rollback capacity [E75] — predates the agent: [E19] and [E20] are documented in
2023, before Honk existed. The containment machinery bounding what an admitted
change can do in production is inherited reliability engineering, not agent
governance.

**[C37]** The only cost the record attaches to the pre-agent technique is
complexity, not money: the deterministic Maven updater's corner-case handling
grew past 20,000 lines of transformation script [E25], which is the stated reason
the agent replaced it. No monetary figure appears for either the deterministic or
the agentic technique [GAP-11], so the substitution's economics are argued from
maintainability, not measured cost.

---

### [GAPS] — what the public record does not answer

**[GAP-1] What governs the Slack-originated path.** The record describes
conversational origination [E29][E67] but never says whether Slack-initiated
Honk PRs go through the same verifiers, the same targeting model, or the same
merge policy as migration shifts, nor who reviews them. Given that "hundreds of
developers now interact with our agent" [E27] and product managers use it [S4],
this is a material silence. Marker: **not publicly stated** — no source describes
any verification, targeting, or merge policy for Slack-initiated Honk PRs; the
silence is complete rather than a conflict.

**[GAP-2] The denominator.** Every agent quantity is a numerator: 1,500+ merged
[E27], 3,000+ merged [E48], 1,000 per 10 days [E49]. Spotify never publishes how
many agent sessions were attempted, how many produced no PR, how many PRs were
opened and closed unmerged, or a per-repo success rate for a named migration. The
240-PR dataset case [E46] does not state how many of the 240 merged. **There is
no public agent-change success rate.**

**[GAP-3] The human-intervention rate.** The one measured intervention-like
figure — the judge vetoing ~25% of sessions with ~50% self-correction [E38] — is
machine-on-machine, was measured once, and the mechanism was subsequently removed
[E51]. What fraction of Honk PRs require a human to fix, amend, or abandon them
is not published anywhere in the record.

**[GAP-4] Whether agent-authored PRs automerge, and under what conditions.** The
2.5M automerge figure [E56] is a Fleet Management aggregate spanning a decade of
deterministic shifts. Nothing states the automerge policy for Honk output; the
review-bottleneck framing [E53][E54] implies human review is the norm, and
automerge for documentation changes is discussed as prospective [E54]. The
record does not decompose the aggregate. Marker: **unclear**, not silence.
Sources exist — [E53]/[E54] frame human review as the norm and automerge for
documentation changes as prospective; [E56]'s 2.5M automerge figure is an
undecomposed aggregate — but no source states the automerge policy for Honk
output, so the sources underdetermine rather than omit the answer.

**[GAP-5] What "review" of a fleet-scale agent PR actually consists of.** Spotify
notes the hazard directly — with changes "over thousands of components, these
changes are hard to spot in reviews" [E35] — and then reports allowing migration
drivers to approve their own PRs [E54]. What a reviewer is expected to check,
what evidence they are shown, and whether sampling is used are not described.

**[GAP-6] When and why the judge was removed, and what replaced it.** The removal
appears only in third-party reporting of a talk [E51] and directly contradicts a
first-party post from three months earlier [E38]. No first-party account
acknowledges the removal, dates it, or reports what scope-adherence signal
replaced it beyond "verification steps in prompts." Marker precision: the judge's
current status is **unclear** (conflicting sources — [E38], first-party,
2025-12-09, describes it in operation with measured veto/self-correct rates;
[E51], third-party report of a first-party talk, 2026-03-18, reports it removed —
the two conflict unless time-ordered, and no first-party source confirms, dates,
or explains the removal), while the removal's date, criterion, and decision
process are **not publicly stated**. The two markers are different findings and
should not be merged when citing this gap.

**[GAP-7] What happened in the failed dependency upgrade.** The one reported
fleet-automation production failure [E75] gives no date beyond "this year," no
component or user-impact scale, no detection latency, no rollback outcome, and
no statement of whether the change was deterministic or agentic. Whether it was
caught by Firewatch [E19] is not said. **This is the most consequential silence
for the book's purposes: the public record describes the admission machinery in
detail and the failure of that machinery in one sentence.**

**[GAP-8] Rollback.** "Expanding rollback capacity" [E75] is the only mention.
There is no account of how a merged fleet-wide change is reverted across
thousands of repositories, whether revert is itself a shift, how long it takes,
or how often it has been exercised.

**[GAP-9] How consequential properties are represented at admission.** The
admission predicate is "passes all the tests and checks" [E14] plus, formerly,
an LLM scope judgment [E38]. Nothing in the record describes representing
behavioral obligations, contracts, or invariants that the estate model could
check a change against — the Backstage catalog carries identity, ownership,
dependencies, and lineage [E41][E64][E73], and Soundcheck carries standards
compliance [E21][E65], but neither is described as gating a specific change on a
specific property. Whether Spotify has a model-to-implementation parity check is
not addressed.

**[GAP-10] Whether session history actually changes later work.** [E71] asserts
transcripts flow back into Portal and that knowledge becomes available to later
sessions, but this is product copy with no mechanism, no measurement, and no
engineering-blog corroboration. Treat as claimed capability, not observed
practice.

**[GAP-11] Costs.** No token cost, compute cost, or cost-per-merged-PR figure
appears anywhere for Honk, despite Part 1 naming "the significant computational
expense of running LLMs at scale" as a live concern [S4]. The one cost-adjacent
post [S16] discusses an individual's routing trick, not fleet economics.

**[GAP-12] Non-backend coverage.** Verifiers ran only on Linux x86 as of Dec 2025
[E40], and the 2026 posts still describe backend-service and data-pipeline
migrations. Whether the mobile/client estate — which has its own release
checkpoints and its own quality cycle [E80] — is inside the agentic fleet line at
all is never stated.

**[GAP-13] Adoption-figure provenance.** The headline 2026 figures ("more than
99% … every week," "94% report … more productive," "76% increase in pull request
frequency" [E57]) appear in a talk write-up with no population, instrument,
period, or definition of "AI coding tools." The 76% PR-frequency figure in
particular is not separable from the automated-PR volume that Fleet Management
already generated.

**[GAP-14] Whether Slack-originated Honk PRs pass the pre-PR verification gate.**
[GAP-1] records that the Slack path's governance is undescribed; specifically, no
source states whether the stop-hook verifier requirement [E37] and the
verification-runtime precondition on PR creation [E52] apply to conversationally
originated work, or only to migration shifts. Not publicly stated.

**[GAP-15] Control retirement machinery.** The judge's reported removal [E51] is
an event, not a process: no Spotify source describes a criterion, review, or
owner for deciding that any verification control (verifier, judge, gate) has
stopped earning its cost. The record documents controls being added and
strengthened [E35][E36][E37][E75]; a retirement mechanism is not publicly stated.

**[GAP-16] How the authored layer of the estate model is kept true.** The derived
layer is documented as re-ingested (code, configuration, and infrastructure into
BigQuery [E4]; targeting tables refreshed daily [E13]). The authored layer —
Backstage component entries, ownership, lineage edges, Soundcheck standards — has
no publicly stated maintenance mechanism: no source says how a stale catalog
entry or lineage edge is detected or corrected, for a factory whose targeting and
automerge machinery consume that layer directly [E41][E20].

---

## Notes for the rewrite wave — divergences from the book's current Spotify text

Checked against `book/part5/5.3-other-agentic-software-factories.md` §"Spotify:
fleet-scale change over an estate model" and the `spotify-honk` record in
`book-models/industry_cases_declared.json`. These are reported, not acted on.

1. **"the admission machinery pushes further toward automatic fleet-scale
   acceptance than most of the corpus"** (5.3) is well-supported for
   *deterministic* Fleet Management [E14][E15][E22][E56] but is **not supported
   for the agentic subset**, where the first-party and talk record both point to
   human review as the norm and name it the binding constraint [E44][E53][E54].
   The sentence is true of the factory; it may mislead about the agent line.
   See [C23], [GAP-4].

2. **The model record's `judgment.scope_adherence: "llm"` and the
   `governance-conversion` note ("scope creep led to an LLM judge that vetoes and
   requests correction (~25% veto rate, ~50% self-correct)") are now
   time-bounded.** Per the QCon talk the judge was removed [E51]. The ~25%/~50%
   figures remain accurate *as of Dec 2025* [E38] and should be dated rather than
   deleted; the removal is second-hand only [GAP-6]. If anything, the removal
   *strengthens* a Loop-A "failure → control → control retired once the
   underlying capability improved" reading — a control lifecycle the corpus
   otherwise lacks.

3. **The model record's `determinization` note** ("a probabilistic judge covers
   the residual semantic scope-check") inherits the same staleness.

4. **New mechanism not in the record: the agent-runtime / verification-runtime
   separation** [E52]. This is architecturally significant for the book — it
   makes PR *existence* conditional on full CI validation, pushing the admission
   filter upstream of the human queue entirely. It also supersedes Part 3's
   local-MCP-verifier-plus-stop-hook description [E37] and closes the "outer
   loop" future-work item stated in Dec 2025 [E40].

5. **The record's `autonomous_work` says "one Kubernetes pod per task."** No
   source I found states one-pod-per-task. First-party text says Honk is
   "deployed in Kubernetes pods so we can schedule many sessions concurrently"
   [E59] and runs "in a container with limited permissions" [E39]; the 2023
   deterministic engine used "Kubernetes Jobs" [E12]. Recommend softening to
   per-task containerized execution on Kubernetes.

6. **The record's repeated use of "the System Model"** as a Spotify artifact is
   not a term I found in any Spotify source. Spotify's own posts say "a catalog
   of our software components" / "Backstage Software Catalog" [E64]; "System
   Model" is the title of a *Backstage documentation page* defining the entity
   kinds [E73][S15]. Recommend either citing S15 explicitly when using the term,
   or replacing it with "the Backstage software catalog."

7. **Quantities that have moved since the record was written** (record shows
   ">1,500 merged AI-generated (Honk) PRs"):
   - 1,500+ merged (2025-11-06, [E27]) → **3,000+ merged** (2026-03-17, [E48])
     → **1,000 merged per 10 days**, up from 1,000 per three months six months
     earlier (2026-03-18, [E49]).
   - ">300,000 automated changes … ~75% automerged" (2023) → **2.5M+ cumulative
     automated maintenance PRs** (2026-06, [E56]).
   - Total merged changes per month: **~8,100 → ~17,000** August-over-August
     (2026-09, [E78]) — a figure the book does not currently carry and which is
     the cleanest published velocity delta in the case.
   - Estate: "on the order of thousands" of components (2023, [E1]) → **"nearly
     3,000 production services"** (2026, [E74]).

8. **New material the record does not yet carry, in rough order of usefulness:**
   the production failure of an automated dependency upgrade and the controls
   added in response [E75]; the incident-retrospective instrumentation and its
   negative finding [E76][E77]; the rework-rate result [E79]; the
   refusal-to-re-baseline on complexity and PR size [E80]; the review-bottleneck
   framing and its three responses [E53][E54]; the Scio abandonment as a
   negative instance of the standardization claim [E43]; the verification gap in
   the dataset migration [E44]; and Xirp as a second, foreground parallelism with
   different governance [E69][E70].

9. **The record's `setting.scale_facts` attributes the 60–90% saving to "the Honk
   Part 1 material, not Part 4."** Confirmed correct — the figure is in Part 1
   [E27]; Part 4 reports a separate "around 10 engineering weeks" estimate for a
   single migration [E42].
