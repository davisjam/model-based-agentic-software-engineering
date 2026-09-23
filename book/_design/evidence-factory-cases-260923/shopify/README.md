# Shopify — factory-case evidence

Crawl date: **2026-09-23**. All URLs below were retrieved on that date unless a
retrieval failure is recorded. Every quotation in § Evidence was extracted from the
page's own HTML (fetched and de-tagged locally), not from a summarizer, **except**
where an item is explicitly marked `[third-party paraphrase]`.

Scope note: Shopify's public record covers two overlapping systems. **River /
Aquifer** is the internal Slack-native coding agent and its substrate — the case the
book uses. **Dispatch** is a separate AppSec scanning harness that feeds findings
into River's remediation loop. Both are in scope because they are the same factory
seen from two ends (origination and admission).

---

## § Sources

| ID | Title | Publisher / author | Published | URL | Type | Weight |
|---|---|---|---|---|---|---|
| **[S1]** | *Under the River* | Shopify Engineering — Javier Moreno, Burke Libbey, and "River" (listed as co-author) | 2026-05-28 | https://shopify.engineering/under-the-river | `eng-blog` | **Strong.** Substantive technical account: named substrate components, a decomposition (session/harness/sandbox), self-reported instrumented quantities with their source table, and stated design constraints. Some promotional framing at the close ("that's the unlock"), but the mechanism content is specific and falsifiable. |
| **[S2]** | *How River takes security work from a fix to merge* | Shopify Engineering — Erin Son, Kaiyi Li | 2026-09-02 | https://shopify.engineering/river-vulnerability-remediation | `eng-blog` | **Strongest source for admission and quality.** Names controls (freshness-gated merge queue, draft-only, human merge authority), gives measured before/after quantities, and volunteers a failure of its own controls. Notably self-critical — low marketing content. |
| **[S3]** | *Learning on the Shop floor* | Tobi Lütke (@tobi), X long-form article | 2026-05-09 | https://x.com/tobi/article/2053121182044451016 | `press` (executive essay) | **Mixed-strong.** CEO essay, rhetorical in places, but contains the only published before/after figure for River's merge rate and the clearest statement of who performs the extraction. Treat quantities as founder-stated, not audited. |
| **[S4]** | *Learning on the Shop floor* (link blog) | Simon Willison | 2026-05-11 | https://simonwillison.net/2026/May/11/learning-on-the-shop-floor/ | `third-party` | **Corroborating.** Independent verbatim requotation of [S3]'s key passage; useful as a second witness to wording. No new facts. |
| **[S5]** | *Building an agentic harness that outlasts the model* | Shopify Engineering — Zack Deveau | 2026-07-29 | https://shopify.engineering/building-an-agentic-harness-that-outlasts-the-model | `eng-blog` | **Strong.** Stage-by-stage pipeline table, an explicit test-oracle definition, an adversarial cross-model verification step, a locally constructed benchmark, and per-scan cost figures. Little marketing. |
| **[S6]** | X post on AGENTS.md / CLAUDE.md "split brain" | Tobi Lütke (@tobi) | 2026-08-25, 2:34 PM | https://x.com/tobi/status/2092259436538495186 | `press` (primary short-form) | **Strong for one narrow fact.** Verbatim primary statement of a named context-inheritance failure mode. |
| **[S7]** | *Shopify's CEO threatened to ban Claude Code. Anthropic had already closed the feature request.* | The New Stack — Amanda Caswell | 2026-08-25, 3:39 PM | https://thenewstack.io/shopify-claude-code-agentsmd/ | `third-party` | **Credible reporting**, quotes Lütke's follow-up posts directly. Used only for quotations it attributes to him. |
| **[S8]** | *Tobi Lütke: AI Agents, Better Decisions, and the Future of Work* (The Knowledge Project) | Farnam Street — Shane Parrish, with Tobi Lütke | 2026-09-15 | https://fs.blog/knowledge-project-podcast/tobi-lutke-3/ | `talk` | **Primary but NOT directly verified.** The episode page was fetched; the **transcript is members-only and was not accessible to this crawl**. Featured-clip index confirms a segment titled "River: Shopify's Internal AI" at 07:18. All podcast content below is therefore carried through [S9]–[S12]. |
| **[S9]** | *Brain Food No. 699 — "Slop"* | Farnam Street — Shane Parrish | 2026-09-20 | https://fs.blog/brain-food/september-20-2026/ | `press` | **Strong for one definition.** Written by the episode's own host; defines "Slop Grenade" verbatim. |
| **[S10]** | *Shopify CEO Tobi Lütke says half the company's pull requests now start as Slack conversations with an agent named River* | Shopifreaks — Paul Drecksler | 2026-09-17 | https://www.shopifreaks.com/shopify-ceo-tobi-lutke-says-half-the-companys-pull-requests-now-start-as-slack-conversations-with-an-agent-named-river/ | `third-party` | **Medium.** Trade-newsletter summary of [S8]. Paraphrase, not quotation. Corroborated on its key claims by [S11]. |
| **[S11]** | *Tobi Lütke: How Shopify Runs on AI Agents* | Fabulous Pod (thefabulous.co) | 2026-09-15 (updated Sept 2026) | https://www.thefabulous.co/pod/knowledge-project/tobi-lutke-how-shopify-runs-on-ai-agents/ | `third-party` | **Medium.** Episode digest with per-claim timestamps; states "quotes verified, timestamped." Independent of [S10] and agrees with it on the two claims that matter here. |
| **[S12]** | *Tobi Lutke: River Now Writes Half of Shopify's Pull Requests* | Podcast Alpha (Substack) | 2026-09-21 | https://podcastalpha.substack.com/p/tobi-lutke-river-now-writes-half | `third-party` | **Medium-weak.** Investor-framed digest of [S8] with timestamps. Explicitly labels the 50% figure "founder-stated, not audited" — that caveat is itself useful. |
| **[S13]** | *Field notes: Shopify's "split brain" is instruction-file drift* | untactit/agent-drift (GitHub release note) | 2026-09-15 | https://github.com/untactit/agent-drift/releases/tag/notes-2026-09-15 | `third-party` | **Weak / promotional.** Vendor content selling a drift-detection product. Used ONLY as a pointer to [S6]/[S7]; no claim below rests on it. |
| **[S14]** | Shopify Engineering topic indexes (AI & Machine Learning, Infrastructure, Developer Tooling) | Shopify Engineering | index pages, accessed 2026-09-23 | https://shopify.engineering/topics/ai-machine-learning · /topics/infrastructure · /topics/developer-tooling | `docs` | **Used for absence.** Establishes the complete set of Shopify engineering-blog posts touching internal agentic development as of the access date: [S1], [S5], [S2]. No others exist on those indexes. |

### Retrieval log — attempts and failures

- **[S8] transcript: NOT OBTAINED.** `fs.blog/knowledge-project-podcast/tobi-lutke-3/` fetched successfully, but the transcript is behind a Farnam Street membership. No public transcript was located. Podcast claims below are therefore third-party paraphrase only, and are marked as such.
- **Hacker News discussion of [S1]** (https://news.ycombinator.com/item?id=48319557) fetched successfully: **2 points, zero comments.** Recorded as a finding — there is no substantive public technical critique of the Under-the-River account on HN.
- No Shopify conference talk, paper, or published case study on River/Aquifer was found. Searches returned only the engineering blog, the CEO's essay/posts, the podcast, and downstream commentary.
- No Shopify documentation page describing River, Aquifer, skills, or the session corpus was found. Aquifer appears to be entirely internal; nothing indicates it is released or open-sourced.

---

## § Evidence

### From [S1] — *Under the River*, 2026-05-28 (verbatim)

**[E1]** "River is an AI agent that lives in our company Slack. We launched it a couple of months ago. Now, one in eight merged pull requests across Shopify is coauthored by it." — [S1], 2026-05-28

**[E2]** "In a recent 30 day period: 59,918 River sessions happened in 5,170 Slack channels, touching the work of 7,000+ people inside the company (~1,200 more than when Tobi posted about River in early May). 3,536 River-coauthored pull requests merged in that window. These numbers come from the river_sessions domain table that River writes to itself, every session." — [S1], 2026-05-28

**[E3]** "Median session length: 19 minutes. Median tool calls per session: 50." — [S1], 2026-05-28

**[E4]** "One constraint: River only works in the open. No direct messages. Every conversation with River becomes a public Slack transcript, open by default to other Shopify employees." — [S1], 2026-05-28

**[E5]** "We mine that corpus. One person's hard-won fix becomes the next person's starting point because we feed the patterns we see back into River's skills, prompts, and defaults. The agent gets smarter without requiring model retraining. The codebase teaches the agent. The agent teaches the codebase. All of this teaches us. This compounding effect is the most important part." — [S1], 2026-05-28

**[E6]** "The thread is searchable. The work is reproducible. The next person to hit a similar problem starts from this thread, not from a blank prompt." — [S1], 2026-05-28

**[E7]** "World contains code. It also contains skills, conventions, intent documents, runbooks, `AGENTS.md` files, and written-down zone knowledge. It's an intelligence layer, accumulating and compounding. When someone solves a problem with River, they leave a memory behind: a pebble, a skill update, an `AGENTS.md` diff, sometimes a whole new shared skill. The next session uses it. The next person watching the thread learns from both." — [S1], 2026-05-28

**[E8]** "Make the agent multiplayer by construction. A private agent has a ceiling: the person at the keyboard. A public agent teaches every session that comes after it. The corpus is the compounding asset; the privacy of an agent thread is a disadvantage." — [S1], 2026-05-28.
*Context that matters for citation:* this is item 2 of three numbered **recommendations to readers** under the heading "What to take with you" — advice addressed outward, not a characterization of Shopify's own system in the descriptive sections. The phrase "multiplayer by construction" appears in the article exactly once, here.

**[E9]** "Aquifer is Shopify's internal platform for running AI agents. It's the substrate: session, harness, sandbox, gateway, the durable event log, the credentials proxy, the observability pipeline. River is a profile on top of it." — [S1], 2026-05-28

**[E10]** "A profile is data: a system prompt, a set of skills, a set of extensions, a sandbox policy, model defaults. All built with Nix and shipped as bundles. Adding a new agent product means adding a bundle, not building a new platform." — [S1], 2026-05-28

**[E11]** "Mode · Automation: PR review. Durable session, woken by an external system, often no human in the loop." — [S1], 2026-05-28

**[E12]** "Moving Shopify into one repo caused real breaks. CI had to scale by an order of magnitude, almost overnight. Merge queues became load-bearing. The build cache became a product. Test infrastructure had to be rebuilt around the assumption that any change might recompile a large share of the graph." — [S1], 2026-05-28

**[E13]** "Every change we made for agents was also the right thing for humans. The monorepo. Reproducible environments. Written-down skills. Clean, fast CI signal." — [S1], 2026-05-28

**[E14]** "It reads code, runs tests, opens pull requests, queries the data warehouse, looks at production traces, and occasionally pushes back on a plan it thinks is bad." — [S1], 2026-05-28

**[E15]** "The harness lives outside the sandbox. The agent doesn't live where the code lives." … "Safety: the agent loop is not in the same blast radius as `rm -rf`" — [S1], 2026-05-28

**[E16]** "River shipped about two months ago. Aquifer is rolling out underneath it, profile by profile. The usage numbers we shared are already wrong, in the upward direction." — [S1], 2026-05-28

### From [S3] — Lütke, *Learning on the Shop floor*, 2026-05-09 (verbatim)

**[E17]** "In the last 30 days, 5,938 Shopify employees worked with River across 4,450 different Slack channels. It opened 1,870 pull requests in the last week alone in our main monorepo. About one in eight pull requests merged into our codebase last week was authored by River, reviewed by us." — [S3], 2026-05-09

**[E18]** "River does not respond to direct messages. She politely declines and suggests to create a public channel for you and her to start working in." — [S3], 2026-05-09 (requoted verbatim in [S4], 2026-05-11)

**[E19]** "In my own channel, there are over 100 people who, react to threads, add color and add context, pick up the torch, help with the reviews, remind me how rusty I am, and importantly, learn from watching." — [S3], 2026-05-09 (requoted in [S4])

**[E20]** "This is also why the merge rate keeps climbing. We did not retrain a model. We did not switch models. An improvement from 36% to 77% over two months came from people watching River work, noticing where it got stuck, and writing down what it should have known and helping make River itself a better teammate. Every team's accumulated taste flows into the agent. The agent gets better at being Shopify." — [S3], 2026-05-09

**[E21]** "The skill someone wrote to teach River about the company's checkout data warehouse gets reused by twelve other teams. River herself learns: every channel can pre-load the zones, skills, and instructions its team needs, written by the people closest to the work. River also has a memory that is constantly learning and un-learning critical information about the company and the best way to do work." — [S3], 2026-05-09

**[E22]** "It's osmosis learning, because it does not require a curriculum, a training plan, or a manager. It just requires everyone's work to be visible to the maximum extent possible." — [S3], 2026-05-09 (requoted in [S4])

### From [S2] — *How River takes security work from a fix to merge*, 2026-09-02 (verbatim)

**[E23]** "In the first 11 days of running the dependency workflow, the backlog of open issues fell by about 70%. Roughly two-thirds were direct merges, and the rest were confirmed by River as obsolete or already fixed elsewhere. Since launch, security merges through our freshness-gated merge queue went from about 10% to 80%." — [S2], 2026-09-02

**[E24]** "The engineers who own the affected code make decisions that affect product behavior and remain responsible for approvals and merges." — [S2], 2026-09-02

**[E25]** "These workflows are driven by River prompts and skills that specify complete enumeration, draft-only behavior, and human merge authority. Prompts are the right place to express judgment and the wrong place to express a guarantee." — [S2], 2026-09-02

**[E26]** "So decide which guarantees belong in code. Pagination, deduplication, current-head identity, and accounting should become deterministic as the workflow matures. Prompts stay useful for judgment calls… In security, this matters more than usual. Any rule that determines whether a vulnerability is closed must be enforced in code." — [S2], 2026-09-02

**[E27]** "On one run, River rechecked only the oldest in-flight claim and said so in its own report. That shows why \"the prompt says so\" isn't an invariant." — [S2], 2026-09-02

**[E28]** "River works from the root of World, Shopify's monorepo, using the same reproducible development environments, written-down skills, and engineering conventions as our developers. That shared substrate gives these security workflows Shopify-specific context from the start; we add the remediation logic rather than reteaching the agent how our codebase works." — [S2], 2026-09-02

**[E29]** "Dependency work usually starts with a PR aimed at upgrading a vulnerable dependency… Application vulnerability remediation work begins with an agent-discovered security finding and a recommended fix that may need deeper investigation." — [S2], 2026-09-02

**[E30]** "It didn't rebase the eighth PR. A human had taken over that branch with their own commits, and a second engineer had an open review on it. Rebasing would have overwritten someone's work and pre-empted a design question, so it went back to its author untouched." — [S2], 2026-09-02

**[E31]** "Six of the seven PRs that River had rebased came out green and went to their stewarding teams needing only an approval. The seventh stayed red on a failure that needed a decision rather than a patch." — [S2], 2026-09-02

**[E32]** "For this workflow, \"done\" means the source system records the outcome, the default branch reflects it, and the tracker and ledger agree." — [S2], 2026-09-02

**[E33]** "A Slack thread provides a transcript of a given run, but more than that it preserves the investigation and handoff. This means that in future sessions, River, security engineers, and code owners can pick up this shared context and apply it to future fixes." — [S2], 2026-09-02

**[E34]** "Measure whether each finding reaches an evidence-supported outcome—fixed, rejected, or escalated—not how many patches the agent creates." — [S2], 2026-09-02

**[E35]** "So River treats every ledger entry as a claim to be checked, not a fact." — [S2], 2026-09-02

### From [S5] — *Building an agentic harness that outlasts the model*, 2026-07-29 (verbatim)

**[E36]** "We've built an agentic code review and test oracle harness that discovers vulnerabilities in our software, proves them with real tests, and provides Shopify-tuned fixes before presenting them to our developers." — [S5], 2026-07-29

**[E37]** Pipeline stage "Verification": "Runs Verifiers sequentially to author and execute tests against candidate findings. Uses a different model than the Hunting agent. Adversarial review reduces noise and prevents blind spots." Why it matters column: "Tests are the oracle; sequential execution avoids port, database, and fixture collisions." — [S5], 2026-07-29

**[E38]** Pipeline stage "Remediation": "Runs fix author agents per-finding. Creates a branch and authors a PR body." Why it matters column: "Developers receive draft PRs with context, tests, and proposed fixes." — [S5], 2026-07-29

**[E39]** "We encoded strict guidelines in our agents about what does and doesn't constitute a \"proven finding.\"" … "Findings that cannot be proven within these constraints are either rejected or downgraded to a \"Low\" or \"Medium\" rating depending on potential criticality." — [S5], 2026-07-29

**[E40]** "To experiment with this idea, we created benchmarks where we reintroduced previously confirmed vulnerabilities into our applications locally and performed comparison testing between partitioned and non-partitioned approaches." — [S5], 2026-07-29

**[E41]** "Over roughly six weeks, we've run thousands of scans, produced over 300 findings ranging from defense-in-depth improvements to resolved security incidents." … "A full application scan with publicly available frontier models costs between $50 and $300… Incremental diff scans are much cheaper, roughly $5 to $50." — [S5], 2026-07-29

**[E42]** "In one audit, a model uncovered more than 30 candidate vulnerabilities. After validation, every one was downgraded to low or medium, found to be a false positive, or reclassified as defense in depth." — [S5], 2026-07-29

**[E43]** "Where possible, hand agents deterministic scripts inline, or author dedicated skills that call scripts to accomplish a task when you need structured inputs or outputs." … "Deterministic code that owns credentials, Git, and storage so the agents don't have to" — [S5], 2026-07-29

### From [S6] / [S7] — instruction-file drift, 2026-08-25 (verbatim)

**[E44]** "I'm thinking about banning Claude code at Shopify until they change their mind and read AGENTS.md and .agents/skills etc. Insisting on only reading CLAUDE.md sometimes leads to split brain problems when different team members use different tools. Just unnecessary." — Tobi Lütke, [S6], 2026-08-25 2:34 PM

**[E45]** "Agents and Claude files are recursively applied through the tree… With thousands of [developers] in a mono repo, it just does happen that one directory is missing one of the two files and this means that a subset of devs work with lobotomy." and "We fix this with automation, but it's a stupid complexity tax that shouldn't have to be paid." — Lütke, quoted in [S7], 2026-08-25

### From [S8] via [S9]–[S12] — The Knowledge Project, recorded/published 2026-09-15

> All items in this block are `[third-party paraphrase]` of a podcast whose transcript
> this crawl could not access. They are recorded because two or three independent
> digests agree, but they are **not** quotations of Lütke.

**[E46]** `[third-party paraphrase]` Up to roughly **half of Shopify pull requests now begin as a Slack conversation with River**. [S10] (2026-09-17): "as many as half of all Shopify pull requests now begin with someone talking to River in Slack." [S11] (2026-09-15, timestamp 07:13): "up to half of them now start as ordinary chat conversations, later handed to an AI system to draft." [S12] (2026-09-21, timestamp 07:33) concurs and labels it "founder-stated, not audited."

**[E47]** `[third-party paraphrase]` River is used by "roughly seven thousand employees across ten thousand channels" — [S11], timestamp 08:11; [S10] independently: "its 7,000 employees use across 10,000 channels."

**[E48]** `[third-party paraphrase]` **A nightly self-review loop that rewrites River's own instruction files.** [S10]: "Overnight it reviews the day's conversations for what it struggled with and updates its skill files." [S11] (timestamp 11:17): "Tobi Lütke has Shopify's AI agent River review its own conversations from the day, identify what went wrong, and rewrite its own instruction files to improve, a process the team calls **dreaming**." Two independent digests; the name "dreaming" appears only in [S11].

**[E49]** "A \"Slop Grenade\" is when you let AI produce the work and pass it on without adding any value (including checking it). Someone else has to wade through it, catch the mistakes, and clean up the mess. You save time and look productive but someone else pays for it." — Shane Parrish, [S9], 2026-09-20 (verbatim; written by the episode's host, tied to the Lütke episode).

**[E50]** `[third-party paraphrase]` Lütke's stated reason for keeping humans at the top: "Machines can inform a decision but cannot take responsibility for it" — [S12], timestamp 14:00; corroborated in substance by [S11] ("machines can never take responsibility").

**[E51]** `[third-party paraphrase]` The number of Shopify employees who write code by hand without AI help is "vanishingly small"; engineers "often run ten, twenty, even fifty instances" of coding agents at once — [S11], timestamps 00:49 and 01:19; [S12] gives the same at 01:27 with the quoted fragment "very often 10, 20, 30, 40, 50 instances of them."

### Evidence about absence

**[E52]** As of 2026-09-23 the Shopify engineering blog's AI & Machine Learning, Infrastructure, and Developer Tooling indexes contain exactly three posts describing internal agentic software development: [S1], [S5], [S2]. No conference talk, paper, or product documentation for River or Aquifer was located. — [S14]

**[E53]** The Hacker News submission of [S1] received 2 points and zero comments. There is no substantive public technical critique of the account. — retrieval log, accessed 2026-09-23

---

## § Claims

Organized against the factory anatomy of `book/part5/5.1-software-factory.md`
(read 2026-09-23 at commit `c8080146`).

### Where work originates

**[C1]** In the general case, **work originates in a public conversation, not a ticket**: an employee @-mentions River in a Slack channel, and the resulting thread is the unit of work. By September 2026 this is reported as the dominant origination path — up to half of all Shopify pull requests are said to begin this way. *(Supported by [E4], [E14], [E46].)*

**[C2]** In the security lane, **origination is split between machine-discovered and machine-generated inputs**: dependency work starts from an upgrade PR, and application-vulnerability work starts from "an agent-discovered security finding" — i.e. from the output of a *different* agentic pipeline ([S5]'s Dispatch harness). Shopify therefore has at least one closed agent-to-agent loop where one factory's output is another's intake. *(Supported by [E29], [E36], [E38].)*

**[C3]** Work also originates from **scheduled sweeps rather than human request**: River "reads its work ledger, identifies eligible items," and Dispatch runs diff-based scans on every commit. Origination in these lanes is a property of the production system, not of a person. *(Supported by [E29], [E35]; [S5] diff-scan description.)*

### What humans do

**[C4]** Humans **originate the request, supply constraint mid-flight, decide product-behavior questions, and approve and merge**. The public record is explicit and repeated on the last of these: "The engineers who own the affected code make decisions that affect product behavior and remain responsible for approvals and merges," and, a year earlier in the CEO's own framing, PRs are "authored by River, reviewed by us." *(Supported by [E24], [E17], [E25].)*

**[C5]** Humans also **perform the extraction that improves the factory** — at least in the mechanism Shopify documents. The measured improvement in River's merge rate is attributed to "people watching River work, noticing where it got stuck, and writing down what it should have known." The artifacts they write are files in the monorepo: a skill update, an `AGENTS.md` diff, a new shared skill. *(Supported by [E20], [E7], [E21], [E5].)*

**[C6]** Humans retain authority for a **stated principle, not merely by default**: the CEO's public argument is that machines can inform a decision but cannot bear responsibility for it. This is the closest thing in the Shopify record to a doctrine of admission. *(Supported by [E50]; `[third-party paraphrase]`.)*

### What agents do

**[C7]** Agents perform a **large and broad share of realization**: reading code, running tests, opening pull requests, querying the warehouse, reading production traces, rebasing stale branches, regenerating lockfiles, repairing mechanical CI failures, authoring tests that prove a vulnerability, and drafting fixes. One in eight merged PRs was River-coauthored as of May 2026. *(Supported by [E1], [E14], [E17], [E31], [E36], [E38].)*

**[C8]** Agents also perform **supervisory work on other agents' output**: [S5]'s Verifier stage uses a *different model* than the Hunter stage, described as "adversarial review." PR review is a first-class Aquifer profile that runs "often no human in the loop." Shopify does not restrict agents to fabrication. *(Supported by [E37], [E11].)*

**[C9]** The agent's output is **routinely draft-shaped by design** rather than merge-shaped: "draft-only behavior," "Developers receive draft PRs," "went to their stewarding teams needing only an approval." *(Supported by [E25], [E38], [E31].)*

### What the fabricator inherits

**[C10]** **The monorepo is the inheritance vehicle.** "World" carries not only code but "skills, conventions, intent documents, runbooks, `AGENTS.md` files, and written-down zone knowledge," and the same substrate — reproducible Nix environments, written-down skills, engineering conventions — is what a new workflow gets "from the start" so that "we add the remediation logic rather than reteaching the agent how our codebase works." This is a *reuse* claim about context, stated by two separate engineering teams four months apart. *(Supported by [E7], [E28], [E13].)*

**[C11]** **An agent's identity is a data bundle, not a program.** "A profile is data: a system prompt, a set of skills, a set of extensions, a sandbox policy, model defaults… shipped as bundles." What a new agent inherits is therefore composable and versioned in the same way as code. *(Supported by [E10], [E9].)*

**[C12]** **Inheritance is scoped per channel and per person.** Channels "pre-load the zones, skills, and instructions its team needs, written by the people closest to the work," and River carries a memory tied to each conversation. Context is not one global corpus injected uniformly; it is routed. *(Supported by [E21], [E47].)*

**[C13]** **The inheritance channel has a publicly acknowledged failure mode.** With thousands of developers in one monorepo, instruction files diverge across directories and tool vendors, so "a subset of devs work with lobotomy"; Shopify papers this over with automation the CEO calls "a stupid complexity tax." The externalized-knowledge layer is real enough to have its own drift problem — a useful counterweight to reading the corpus as frictionlessly compounding. *(Supported by [E44], [E45].)*

### What the agent may decide for itself

**[C14]** The agent's realization freedom is **bounded by an explicit stop-and-hand-off protocol**, and the boundary is drawn at *standing to decide*, not at difficulty: "Both were context River could gather but had no standing to adjudicate." It stops when a decision affects product behavior, when a human has taken over a branch, or when it cannot define the evidence that would prove a change correct. *(Supported by [E24], [E30], [E25].)*

**[C15]** The agent is permitted to **disagree and to withdraw its own work**: River "occasionally pushes back on a plan it thinks is bad," and in one documented case recommended dropping its own patch after a developer's question changed the evidence. *(Supported by [E14]; [S2]'s "River recommended dropping its own patch".)*

**[C16]** The agent is **physically bounded by substrate design**: the harness lives outside the sandbox, so "the agent loop is not in the same blast radius as `rm -rf`," and credentials, Git, and storage are owned by deterministic code rather than by the agent. Freedom is limited by architecture, not only by instruction. *(Supported by [E15], [E43].)*

### Where quality is established

**[C17]** **Quality is established in three places, and the public record names all three.** (a) *Inside the loop*: the agent runs tests, retriggers CI on each new head, and discards CI verdicts that belong to a superseded commit. (b) *At a purpose-built oracle*: [S5] defines the oracle explicitly — "Tests are the oracle" — with a second model authoring executing tests against the first model's candidate findings, and encoded criteria for what counts as a "proven finding." (c) *At the gate*: a freshness-gated merge queue, plus a post-merge check that the default branch no longer contains the defect. *(Supported by [E31], [E37], [E39], [E23], [E32].)*

**[C18]** Shopify **treats the harness, not the model, as the locus of quality**, and has built a local benchmark to tune it: previously confirmed vulnerabilities were reintroduced into applications to compare pipeline configurations. Better models produced *more* candidate findings, most of which validation rejected — so the quality investment went into the surrounding apparatus. *(Supported by [E36], [E40], [E42].)*

**[C19]** Shopify **distinguishes what a prompt can express from what a control can guarantee**, and states the rule: "Prompts are the right place to express judgment and the wrong place to express a guarantee… Any rule that determines whether a vulnerability is closed must be enforced in code." It also publishes the incident that taught the rule — a run where River violated its own prompt-stated enumeration requirement. This is the sharpest governance statement in any of the sources. *(Supported by [E25], [E26], [E27].)*

**[C20]** Shopify **redefines the success metric away from output volume**: "Measure whether each finding reaches an evidence-supported outcome—fixed, rejected, or escalated—not how many patches the agent creates," and "PR count and green-branch count measure motion, not remediation." *(Supported by [E34]; [S2] "What you should copy first".)*

### Who or what holds admission authority

**[C21]** **Admission authority is human and is asserted as policy** — "human merge authority," code owners "remain responsible for approvals and merges" — while the *enforcement* of admission is machinery: a freshness-gated merge queue that rejects stale evidence, plus post-merge verification against the default branch. Representation and enforcement are separated in the way §5.1's armory-practice reading would predict: the prompt states the obligation, the merge queue gives it consequences. *(Supported by [E24], [E25], [E23], [E32].)*

**[C22]** **Admission quality is itself measured**, and Shopify has published movement on it: security merges through the freshness-gated queue went from about 10% to 80% since launch; River's overall merge rate moved from 36% to 77% over two months. These are the only admission-rate figures in any of the seven cases this crawl touched. *(Supported by [E23], [E20].)*

**[C23]** **Admission is the acknowledged bottleneck, and the organization names the failure mode socially rather than mechanically.** "Slop grenades" describes unreviewed agent output dumped on a colleague; the CEO's stated worry as of September 2026 is too much output, not too little. The published remedy is a shaming label, not a control. This is the clearest place where Shopify's factory has a load it has not yet converted into machinery. *(Supported by [E49], [E23]; [E46] for the volume context.)*

### How experience changes the factory

**[C24]** **Extraction from sessions is a real, operating mechanism — not an aspiration — and it has a measured effect.** Three independent supports: the engineering account states it as current practice ("We mine that corpus… we feed the patterns we see back into River's skills, prompts, and defaults"); the artifacts it produces are named and located in the monorepo ("a pebble, a skill update, an `AGENTS.md` diff, sometimes a whole new shared skill"); and the CEO attributes a 36%→77% merge-rate improvement over two months specifically to it, with the counterfactual controlled ("We did not retrain a model. We did not switch models."). *(Supported by [E5], [E7], [E20], [E21].)*

**[C25]** **The extraction is human-driven in the documented mechanism and machine-driven in the reported one, and these are different claims with different evidential strength.** Everything Shopify has *published in engineering prose* describes people doing the extraction — watching, noticing, writing down. A nightly automated loop in which River reviews the day's conversations and rewrites its own instruction files (reportedly called "dreaming") appears only in third-party digests of a September 2026 podcast whose transcript was not accessible to this crawl. The book should not present the automated loop as established. *(Supported by [E20], [E5], [E7] for the human mechanism; [E48] `[third-party paraphrase]` for the automated one.)*

**[C26]** **The factory changes by adding profiles, not platforms.** "Adding a new agent product means adding a bundle, not building a new platform." The next change inherits a substrate whose marginal cost of a new agent kind is a data bundle. *(Supported by [E10], [E9].)*

**[C27]** **The infrastructure investment preceded the agents and was justified retroactively.** The monorepo and Nix decisions were made in early 2024 on an explicit bet — "Code is going to be increasingly written with AI, and our infrastructure needs to be the substrate for that" — and Shopify's own reading is that agent-legibility work is "simply the debt you owe to your human engineers." The factory was made supervisable before it was made agentic. *(Supported by [E12], [E13].)*

**[C28]** **The corpus is instrumented and self-recording.** The usage figures come "from the `river_sessions` domain table that River writes to itself, every session." The production exhaust is not merely visible; it is a queryable dataset the factory maintains about itself. *(Supported by [E2].)*

### Figures the book currently cites — verification as of 2026-09-23

**[C29]** The book's three figures — 59,918 sessions, 5,170 channels, 7,000+ people — **are accurately quoted from [S1] and remain the most recent *session-level* figures Shopify has published.** They are a 30-day window reported on 2026-05-28. The article itself flags them as already stale ("already wrong, in the upward direction"). *(Supported by [E2], [E16].)*

**[C30]** **Two of the three have moved on the public record.** Channels: 4,450 (2026-05-09) → 5,170 (2026-05-28) → ~10,000 (2026-09-15, third-party). People: 5,938 (2026-05-09) → 7,000+ (2026-05-28) → ~7,000 (2026-09-15, third-party). Sessions: no figure has been published since 59,918. Note the shape of the trend: **channels roughly doubled while headcount using River was flat** — the growth is in surfaces, not in users. *(Supported by [E17], [E2], [E47].)*

**[C31]** **The phrase "multiplayer by construction" is verbatim but is a recommendation, not a self-description.** It occurs once in [S1], as the imperative "Make the agent multiplayer by construction," in a closing list of three priorities addressed to readers building agent infrastructure. A book sentence that presents it as Shopify's characterization *of Shopify* is slightly off-register; quoting it as the design prescription Shopify offers is exact. *(Supported by [E8].)*

**[C32]** **The PR-share figure is not a single trend line and must not be presented as one.** "One in eight merged pull requests… coauthored by River" (May 2026) and "half of pull requests start as Slack conversations with River" (September 2026) measure different things: a *merged-and-coauthored* share versus an *origination* share. There is no published September figure for the coauthored-and-merged share. *(Supported by [E1], [E17], [E46].)*

---

### [GAPS] — what the public record does not answer for Shopify

1. **How the mining of the corpus actually works.** [E5] says "We mine that corpus" and "we feed the patterns we see back" in the first person plural, without saying who "we" is, how patterns are identified, at what cadence, or whether any tooling exists. The engineering blog never describes the extraction pipeline it claims to operate.
2. **Whether the nightly "dreaming" loop exists as described.** [E48] is two third-party digests of an inaccessible podcast transcript. Neither Shopify engineering post mentions self-rewriting instruction files. Unresolved.
3. **Whether extracted skills are reviewed before they take effect.** If River rewrites its own instruction files, nothing in the record says whether a human approves that diff, whether it goes through the same PR path as code, or whether a bad extraction can be rolled back. Given that `AGENTS.md` and skills live in the monorepo, code review is *plausible* — but it is never stated, and inference is exactly what this file must not do.
4. **Any measure of skill quality or skill decay.** Skills are counted nowhere; there is no figure analogous to Uber's "3,600 engineer-created skills." No published notion of a stale, wrong, or conflicting skill, beyond the file-drift problem in [E44]–[E45].
5. **The general (non-security) admission path.** [S2] is explicit about draft-only behavior, human merge authority, and a freshness-gated queue **for security workflows**. Nothing states whether the same controls govern the other seven-eighths of River's work. The book should not generalize [S2]'s admission story to all of River's output.
6. **What a general River PR must carry to be admitted.** No published statement of required evidence — test coverage, review count, CI gates, risk tiering — for an ordinary River-coauthored change.
7. **Failure and defect data.** No published figure for River-caused incidents, reverted PRs, escaped defects, or production regressions. [E49]'s "slop grenades" acknowledges a review-burden problem qualitatively; no measurement accompanies it.
8. **Who may observe sessions, precisely.** "[O]pen by default to other Shopify employees" ([E4]) is the only statement. Nothing about private-channel exceptions, sensitive-data handling, retention, redaction, or whether any session class is exempt from the no-DM constraint — despite River having warehouse and production-trace access.
9. **How sessions are searched or retrieved at scale.** The claim is that "the next person… starts from this thread" ([E6]). No retrieval mechanism is described: no search surface, no ranking, no index. With ~60,000 sessions per month, discovery is the load-bearing step, and it is the step the record omits.
10. **Whether representation of consequential properties exists at all.** Nothing in the Shopify record describes a model of the software's behavior, architecture, or invariants that admission checks against. Quality is established by tests and by owner reading. There is no externalized specification layer in §5.1's sense.
11. **Model selection and cost.** [S5] gives per-scan costs for the AppSec harness. Nothing comparable exists for River: no cost-per-merged-PR, no model-selection criteria, no evaluation suite.
12. **The relationship between River and the AppSec harness.** [E29] implies Dispatch findings flow into River threads, but no source states the interface, the ownership boundary, or whether they share skills or only a monorepo.
13. **Aquifer's availability.** Nothing indicates Aquifer is documented, released, or externally usable; the only "in the open" framing comes from a vendor blog ([S13]), not from Shopify.
14. **Independent scrutiny.** The account has not been meaningfully contested in public ([E53]), and no conference talk or paper exists ([E52]). Every quantity in the Shopify case is self-reported and un-audited — a caveat [S12] makes explicitly about the 50% figure.
