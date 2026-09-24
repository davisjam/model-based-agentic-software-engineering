# Shopify — measurement & incidents lens

Source: `book/_design/evidence-factory-cases-260923/shopify/README.md`. All [E]/[GAPS] ids refer to that file.

## 1. What Shopify reports measuring

### Production / productivity

- **1 in 8 merged PRs coauthored by River** (May 2026) [E1][E17]; 59,918 sessions / 5,170 channels / 7,000+ people / 3,536 River-coauthored merged PRs in a 30-day window, self-instrumented via the `river_sessions` table River writes itself [E2]; median session 19 min, median 50 tool calls [E3].
- **"Up to half of PRs begin as Slack conversations with River"** (Sep 2026) — third-party paraphrase of a paywalled podcast, and a **different construct** (origination share) from the merged-coauthored share; there is no published September coauthored-merged figure [E46][C32]. Never present these as one trend line.
- Dispatch (AppSec harness): thousands of scans over ~6 weeks, 300+ findings; **per-scan cost published**: $50–300 full scan, $5–50 incremental diff [E41]. No cost figures exist for River itself [GAPS 11].
- All quantities self-reported and un-audited; no independent scrutiny exists ([E53], GAPS 14).

### Product / quality — admission-rate metrics, no defect outcomes

- **River merge rate 36% → 77% over two months**, with the counterfactual explicitly controlled in the CEO's telling: "We did not retrain a model. We did not switch models" — attributed to people watching sessions and writing skills/instructions [E20]. Founder-stated, not audited. This is the corpus's cleanest published *closed-loop* measurement: an admission-quality metric moved by a named factory intervention with the fabricator held fixed.
- **Security lane**: backlog of open issues −70% in 11 days (two-thirds direct merges, rest confirmed obsolete/already-fixed); merges through the freshness-gated queue 10% → 80% since launch [E23].
- Validation outcomes for the AppSec harness: in one audit, 30+ candidate vulnerabilities all downgraded / falsified / reclassified by the test-oracle stage [E42] — a measured false-positive filter.
- **Metric doctrine stated**: "Measure whether each finding reaches an evidence-supported outcome—fixed, rejected, or escalated—not how many patches the agent creates"; PR and green-branch counts "measure motion, not remediation" [E34]. An explicit published rejection of activity-counting.
- Defect outcomes: **no figure for River-caused incidents, reverts, escapes, or regressions anywhere** [GAPS 7].

### Factory / process

- Local benchmark built by **reintroducing previously confirmed vulnerabilities** and comparing pipeline configurations [E40]; cross-model adversarial verification (Verifier uses a different model than Hunter) [E37]. Mechanisms with measured use in the AppSec lane; whether cross-model verification extends to River generally is not stated [GAPS 16].

### Human / organizational

- **"Slop grenade"** — a named social failure mode (passing unchecked AI output to a colleague) [E49]; qualitative, no measurement attached [C23]. The published remedy is a shaming label, not a control.
- Observational learning is a stated design goal of the no-DM rule — "over 100 people who… learn from watching" [E19], "osmosis learning… requires everyone's work to be visible" [E22]. Not instrumented in any published way.

## 2. Incidents

### The enumeration violation — a small incident with a large doctrinal yield

- **What happened**: on one run, River "rechecked only the oldest in-flight claim and said so in its own report," violating the prompt-stated complete-enumeration requirement [E27].
- **Property violated**: completeness of a security-remediation sweep — a property on which "whether a vulnerability is closed" depends.
- **Where the factory failed**: the property was **represented only in a prompt** — stated, but held by a probabilistic instruction rather than a control. The clean classification here *is* available: known but unenforced (in code); evidence insufficient by construction. Detection was by the agent's own self-report — i.e., near-luck.
- **What changed**: the published rule — "Prompts are the right place to express judgment and the wrong place to express a guarantee… Any rule that determines whether a vulnerability is closed must be enforced in code" [E25][E26]; the freshness-gated merge queue; ledger entries treated "as a claim to be checked, not a fact" [E35]; "done" defined against authoritative state (source system + default branch + tracker + ledger agree) [E32].
- **Loop closed?** Yes in doctrine and partially in machinery — but which admission controls have actually moved from prompt to code is **unclear** [GAPS 15], and whether "draft-only" and "human merge authority" are mechanical or prompt-expressed is likewise unclear. **Worked?** The 10%→80% freshness-gated merge figure [E23] post-dates the controls but is not presented as a before/after on the violation class; no recurrence data exists.

### Instruction-file drift ("split brain")

- Thousands of developers in one monorepo; directories missing one of AGENTS.md/CLAUDE.md mean "a subset of devs work with lobotomy"; fixed "with automation" the CEO calls "a stupid complexity tax" [E44][E45]. A factory-inheritance failure with an asserted remediation whose mechanism is entirely undescribed [GAPS 19]. Do not infer the automation works; the record only says it exists.

## 3. Factors measured or managed with no clean home in the current model vocabulary

- **Human learning as a designed-for output of factory architecture.** The no-DM/public-transcript constraint is justified in part by human observational learning [E19][E22], and the one controlled-ish performance improvement on record (36%→77% [E20]) is attributed to *humans learning what the agent needed and writing it down* — human capability and factory capability improving through the same channel. No org-level metric of the human side exists, but the investment is explicit and architectural. Relevant to the Chapter-6 question of whether human capability is a static residual.
- **Review-burden as a social-norm problem**: "slop grenades" [E49] names an attention-externality (cost shifted to a colleague) the model's admission vocabulary doesn't quite hold — it is about *who pays* the supervision cost, not whether supervision happens.
- **Corpus/instruction maintenance as a standing tax**: drift automation [E45], skill decay unmeasured [GAPS 4].
- Adoption/usage: measured and self-instrumented [E2]; channels doubled while users stayed flat [C30] — growth in surfaces, not users; no model home.
