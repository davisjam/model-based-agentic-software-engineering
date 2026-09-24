# SYNTHESIS — measurement & incidents across the seven factory cases

Drafted 2026-09-24 from `book/_design/evidence-factory-cases-260923/<org>/README.md` only. Evidence ids are prefixed by org (e.g. [UBER E37]). Per-org detail in the sibling sheets.

**Calibration up front**: the author expected this pass to surface little, and for four of the five measurement categories that expectation is broadly right for most of the corpus. The result is *not* uniformly thin, though: three organizations (Uber, Cloudflare, Spotify) publish real measurement, one (Spotify) publishes factory-health results including a production failure, and the incidents lens yields two analyzable failure chains. The rest is honestly "not reported."

---

## 1. Hypothesis tests — measurement

### H1. Activity/throughput measured more readily than properties of the software — **SUPPORTED, with one partial exception**

- Uber: every published factory number is adoption, volume, or cost; the named quality signals (revert rate, F1, MTTR) have no published values [UBER E37, G4, C28].
- Cloudflare: "every published number counts *activity* (violations flagged, merges blocked, findings produced, specs reviewed). Not one measures whether the software got better" [CF GAP 17].
- GitLab: no defect/rollback/revert/incident data at GitLab or any customer [GL GAPS 2].
- Shopify: admission-rate metrics (merge rates) but no defect outcomes [SHOP GAPS 7]. Zenseact, Siemens: no outcome measurement at all [ZEN E31; SIE G3].
- **Partial exception — Spotify**: a rebuilt rework-rate metric with a published null result, incident-retrospective attribution with a published negative finding, and two watched warning signals (complexity, PR size) explicitly not re-baselined [SPOT E76–E80]. Still not defect rates for agent code, but genuinely property-of-the-software trend measurement.

### H2. Factory economics more visible than end-product quality — **SUPPORTED for the two heaviest publishers; CONTRADICTED by Spotify's inversion**

Uber publishes a cost decomposition with a stated method (one model held fixed) while quality stays name-only [UBER E3, E37, G4]. Cloudflare publishes per-review cost percentiles, per-tier costs, token volume, and cache hit rate against zero quality outcomes [CF E13, E14, GAP 17]. Shopify prices Dispatch scans but not River [SHOP E41, GAPS 11]. **Spotify inverts the pattern**: no cost figure of any kind for Honk [SPOT GAP-11], yet the corpus's best factory-health results. The hypothesis describes a tendency, not a law, and the corpus contains its counterexample.

### H3. Reported "quality" is mostly proxy/process evidence — **SUPPORTED nearly universally**

The corpus's quality numbers are: comment usefulness and addressal rates [UBER E20, E22]; test viability and acceptance rates [UBER E27]; violations flagged and merges blocked [CF E7]; merge rates [SHOP E20, E23]; review-comment placement accuracy [GL E32]; judge veto/self-correct rates [SPOT E38]. All measure the machinery's interaction with people or gates — developer response, admission outcomes, reviewer activity — not consequential product properties. The nearest approaches to the real thing: Spotify's incident-attribution finding and rework rate [SPOT E77, E79], and (as an admission gate over tests, peer-reviewed) AutoCover's mutation-tested validator [UBER E26].

### H4. Observe vs. close-a-loop — **SUPPORTED: the corpus spans the full range**

- **Loop-closers with stated procedures**: Uber (benchmark→Pareto model selection; priced anti-patterns with built-in remediations; measured token overhead engineered away) [UBER E38, E42, E44]; Shopify (skill/instruction feedback moving merge rate 36%→77% with the model held fixed — founder-stated) [SHOP E20]; Spotify (judge added on observed gaming, measured, then reportedly retired; verification-pace finding driving delivery-system strengthening) [SPOT E38, E51, E77].
- **Described-but-unmeasured loops**: Cloudflare's incident→RFC→rule flywheel — mechanism stated, two rules named, zero outcome measurement [CF E29, E29a, E29b, GAP 9]; the one loop it demonstrably closed is narrow and inward-facing (AGENTS.md staleness; representation revision Markdown→JSON) [CF E32, E21].
- **Reporting-only / no loop visible**: GitLab's vendor metrics; Siemens' marketing quantities; Zenseact's router number (whose miss-taxonomy loop *is* closed, but over retrieval fit, not work outcomes) [ZEN E26].

### H5. Different implicit objective functions — **SUPPORTED at the reading level**

The measurements reveal what each factory optimizes: Uber — cost per outcome under quality-held-constant across fabricator churn [UBER E37, E38]; Cloudflare — standards compliance at controlled noise (1.2 findings/review "deliberately low," approval-biased rubric) [CF E12, E27a]; Spotify — keeping verification pace matched to change volume [SPOT E81]; Shopify — evidence-supported outcomes over patch counts, plus a compounding public corpus [SHOP E34, E5]; GitLab (vendor) — governance/trust legibility for a buyer [GL E28, E35]. This is interpretation of what is measured, not something any source states; present it as a reading.

### The Uber claim, verified

*"Uber's measurement appears to close a loop by selecting models and restructuring workflows rather than merely reporting percentages."* **Supported on the cost/routing side; asymmetric.** The four-step benchmark→Pareto procedure is stated as governing model selection for all managed agents [UBER E38]; measured session waste feeds sixteen priced, built-in remediations [E42]; measured schema overhead was engineered away [E44]; maintenance is scheduled against measured CI capacity *and capped against reviewer attention* [E40]. That is qualitatively different from publishing an attribution percentage. Two caveats the book should carry: (1) the quality half of the loop — the signals that would show quality *holding* through model migrations — is named and never published [E37, G4]; the public record proves a cost-optimizing loop and asserts a quality-holding one. (2) Uber also publishes the headline percentages, with the 70% figure's denominator undefined [G1] — the two postures coexist.

### The Cloudflare claim, verified

*"Cloudflare's incident→rule behaviour is a clean instance of repeated judgment becoming durable structure."* **Supported as incident→durable-structure; "clean" overstates it.** Clean parts: two named outages → a shared named failure mode → two named machine-enforced rules [CF E29a], with stable slug identity making the obligations trackable [E20], real blocking consequences [E7], and a second, structurally different conversion alongside (Snapstone substrate enrolment) [E29c]. Not clean: (a) the origin is overdetermined — three unreconciled motives, the remediation programme's founding document never mentions the Codex [E28], and the AI programme predates the outages while the Codex postdates them [E5, E6]; (b) the outcome claim is a counterfactual with no recurrence or before/after measurement anywhere [E29b, GAP 9]; (c) the incident→RFC mechanics are undescribed [GAP 10]. Also, strictly: this is *failure* becoming structure. "Repeated judgment becoming structure" fits Cloudflare's Astro loop (recurring agent-failure classes → a three-class doctrine → environment repair, with one anecdotal behavior-change observation [E50, E51]) and Uber's monthly incident-review→maintenance-skill mining [UBER E39] better — and those two produce **different kinds** of structure, as the brief anticipated: Cloudflare mints *obligations* (rules a reviewer enforces); Uber mints *capabilities* (skills that do future maintenance). The distinction survives contact with the evidence.

---

## 2. Hypothesis tests — incidents

The corpus contains exactly **two analyzable incident chains** (Cloudflare's outages→Codex, Shopify's enumeration violation), **one one-sentence production escape** (Spotify's dependency upgrade), several **named failure classes without narrated occurrences** (GitLab's test-deletion; Spotify's build-gaming; Shopify's instruction-file drift), and **three organizations with no incident record at all** (Uber, Zenseact, Siemens).

### H6. Incidents reveal how factories evolve — **SUPPORTED where incidents exist**

Every reported failure produced structure, and the *kinds* differ: new machine-enforced obligations (Cloudflare rules [CF E29a]); enrolment substrates (Snapstone [CF E29c]); guarantee-migration doctrine, prompt→code (Shopify [SHOP E25, E26]); evidence-regeneration discipline — ledger entries as claims, freshness-gated admission, "done" defined against authoritative state (Shopify [E32, E35]); control addition then retirement (Spotify's judge [SPOT E38, E51]); rollback capacity and scheduling changes (Spotify [E75]); environment repair (Astro [CF E51]).

### H7. Measurement vs. tolerance vs. evidence vs. admission failures are distinguishable — **SETTLED IN TWO CASES, UNSETTLEABLE IN THE MOST CONSEQUENTIAL ONE**

- Shopify's enumeration violation classifies cleanly: the property was represented only in a prompt — **known but unenforced**, with evidence insufficient by construction; detection was the agent's own self-report [SHOP E27].
- Cloudflare's outages classify as **representation-plus-enforcement** failure on the record's own account (obligations scattered across prose and heads, nothing checkable, nothing blocking) [CF E3, E4] — though the specific rules were authored only afterward, so "known but unenforced" cannot be claimed for them pre-incident.
- Spotify's dependency-upgrade escape — the only production failure of admission machinery in the corpus — **cannot be classified**: the account is one sentence, with no component, detection path, or deterministic-vs-agentic attribution [SPOT E75, GAP-7]. The evidence file is right to call this the most consequential silence in the case.

### H8. Proactive vs. reactive structure — **BOTH ATTESTED; superiority unsettleable (and not to be assumed)**

Proactive: Spotify's containment layer (Firewatch, cohorted rollout, rate-limited working-hours merges) predates the agent entirely [SPOT C36]; Shopify's monorepo/Nix substrate was a 2024 bet made before River [SHOP E12, E13]; GitLab's maturity-gated autonomy ladder is designed-ahead [GL E2]. Reactive: Cloudflare's Codex (at least in its own completion-report narrative) [CF E1]; Spotify's judge and verifier abstraction [SPOT E35–E38]; Shopify's prompt→code rule [E26]. No source measures either style's effectiveness, so no comparison is possible.

### H9. Repeated judgment becoming structure vs. case-by-case handling — **SUPPORTED as a described pattern; effectiveness evidenced almost nowhere**

The conversion *pattern* is stated as standing practice at five orgs (Cloudflare flywheel; Uber monthly mining; Shopify corpus-mining and skill-writing; GitLab "fix the environment, not the prompt" as doctrine [GL E1]; Zenseact's typed miss-taxonomy [ZEN E26]). Evidence any conversion **worked**: Shopify's 36%→77% merge rate (founder-stated, model held fixed) [SHOP E20] and Astro's single-instance HMR behavior change [CF E51]. That is the complete list. Everywhere else, existence of the remediation is the only fact — and per the discipline rule, that is not effectiveness.

---

## 3. Honest thinness statement, per category

1. **Production/productivity**: substantial at Uber, Cloudflare, Spotify, Shopify; one bounded datum at GitLab; absent at Zenseact and for Siemens' own factory. Denominators are the systemic weakness — Uber's "attributed to" undefined [UBER G1]; Spotify's numerator-only agent figures [SPOT GAP-2]; Shopify's origination-share vs merged-share [SHOP C32]; GitLab's "up to" vendor framings.
2. **Product/quality**: thin everywhere, and almost entirely proxy. Zero organizations publish defect/escape/revert values for agent-authored code. Spotify is the only org publishing product-quality *trend* results (rework, complexity, incident attribution), two of them null/negative findings — which is itself the strongest credibility signal in the category.
3. **Factory/process**: moderate and the healthiest category — review throughput/latency/cost (Cloudflare), benchmark-driven model selection and priced anti-patterns (Uber), judge veto/self-correct rates (Spotify), reintroduced-vulnerability benchmarks (Shopify), context-savings (Zenseact — its only number).
4. **Human/organizational**: nearly empty, but not literally empty across all seven. The complete inventory: Spotify's developer-sentiment surveys (95%/80%/94% — provenance weak [SPOT GAP-13]); Uber's review-latency 3h→9h and reviewer-attention rationing [UBER E23, E40]; GitLab's provenance-label-for-review-calibration (mechanism, no published data) [GL E20, E21]; Cloudflare's break-glass rate as an indirect proxy [CF E27b]; Shopify's qualitative "slop grenade" [SHOP E49]. Nothing at Zenseact or Siemens. No org measures operator skill, training, or cognitive load directly.
5. **Incidents**: two substantive chains (Cloudflare, Shopify), one one-sentence escape (Spotify), named-but-unnarrated failure classes (GitLab, Spotify, Shopify), and three complete silences (Uber, Zenseact, Siemens). Uber's silence is notable given its scale claims: not one incident, escape, or rollback attributed to agent-authored change anywhere in its record [UBER G4].

---

## 4. Cross-case table

A *content*-symmetric table (metrics side by side) is **not warranted** — the constructs differ too much to sit in comparable cells without silently equating denominators, exactly what the brief forbids. A *presence/absence* table is honest, because its empty cells are findings:

| Org | Activity/volume published | Cost published | Proxy-quality published | Product-quality outcome published | Incident account | Loop-closure evidenced |
|---|---|---|---|---|---|---|
| Uber | yes (denominator undefined) | yes, detailed | yes (review/test response rates) | no — named, unpublished | none | cost side yes; quality side asserted |
| Cloudflare | yes, detailed | yes, detailed | activity counts + override rate | no | yes (outages→Codex), outcome unmeasured | representation loop only |
| Spotify | yes (numerator-only for agents) | **no** | veto/self-correct rates | **yes — trend + attribution, incl. null results** | yes (1 sentence) + gaming | partial (judge lifecycle) |
| Shopify | yes | Dispatch only | merge rates | no | yes (enumeration run) | yes (36→77, founder-stated) |
| GitLab | one bounded case | vendor "up to" figures | one customer A/B (process metric) | no | none (classes only) | no |
| Zenseact | no | no | no | no | none | router-fit loop only |
| Siemens | marketing "up to" only | one EDA token figure | no | no | none | no |

---

## 5. Proposed prose (Part 4 — only what is earned)

**§5.3 opener candidate (one paragraph):**

> Measurement is a second comparative lens, and it discriminates more sharply than the machinery does. Every case in this corpus publishes activity — pull requests attributed, reviews run, violations flagged — and most publish cost; almost none publish whether the software got better. The quality numbers that do exist are overwhelmingly proxy readings of the machinery itself: comment-usefulness rates, merge rates, veto rates. What separates the cases is not which metrics they name but whether measurement feeds back into the factory — Uber selects its fabricator from a benchmark built of its own work and prices sixteen session anti-patterns with remediations attached; Spotify added two questions to every incident retrospective and published the answers, one of them a null result it declined to celebrate away by re-baselining. And the corpus's incidents, thin as the record is, expose what the measurement regimes did not: in each analyzable failure, the violated property was one the factory had represented only in prose or in a prompt — stated, but held by nothing.

**Per-org sentences (only where earned):**

- **Uber**: Uber's managed agents are measured in outcome-denominated units — cost per merged PR, per review, per alert — with revert rate, F1, and MTTR named as the quality signals that must hold through model migrations; the cost figures are published in detail and not one quality value appears anywhere in the public record.
- **Cloudflare**: Cloudflare traces two named rules to two named outages and enforces them with a blocking reviewer, but the loop's outcome claim remains a counterfactual — "would have been rejected merge requests" — with no recurrence measurement anywhere; the gate's one published calibration number, a 0.6% break-glass rate, instruments only the false-block direction.
- **Spotify**: Spotify is the corpus's clearest instance of an organization instrumenting its own factory's health rather than its output: incident retrospectives that ask whether AI-authored code contributed (finding: no) and whether change volume outran verification (finding: yes), a rebuilt rework metric showing no rise, and two creeping warning signals it refuses to re-baseline.
- **Shopify**: Shopify published the corpus's cleanest closed-loop measurement — River's merge rate moving from 36% to 77% in two months with the model explicitly held fixed — and its most instructive small incident, a run that violated a prompt-stated enumeration requirement and yielded the rule that any closure-determining guarantee must be enforced in code, not prompts.
- **GitLab**: GitLab's record is a clean instance of mechanism-without-published-metric: per-MR AI-assistance labels exist precisely to calibrate review depth, and no aggregate of them has ever been published.
- **Zenseact, Siemens**: omit — neither record carries measurement or incident evidence that would support a sentence beyond "not reported," and Zenseact's agents do not perform software realization at all.

---

## 6. Model-critique memo — what these factories make visible that the current Chapter 5 representation does not

Per the addendum: candidates only where evidence supports them; each tagged (a) captured / (b) subdimension / (c) possible independent concern, with single-case vs. recurring stated. Nothing here licenses a model change by itself; recurrence across independent cases is the signal.

**1. Supervision capacity as a measured, scheduled, economized resource — (c) candidate; RECURS across five cases.**
The model treats human judgment largely as a residual that admission draws on. The factories treat it as a *capacity under management*: Uber measures its depletion (time-to-first-review 3h→9h [UBER E23]) and schedules against it — maintenance placed on Sundays for CI capacity while Monday's diff volume facing engineers is separately capped, with the principle stated: "spare compute does not imply unlimited reviewer attention" [E40]. Spotify names review the new bottleneck and responds with attention-allocation machinery (self-approval for migration drivers, stale-PR closing, a PR inbox, prospective docs-only automerge) [SPOT E53, E54, E66]. Shopify names the attention *externality* — the "slop grenade," unchecked output whose review cost lands on a colleague [SHOP E49]. Cloudflare's reviewer latency complaints produced a whole deterministic station [CF E24]. GitLab's market survey has 85% saying the bottleneck moved to review [GL E58] (self-serving source, consistent direction). This is more than "admission is human-held": it is rate, allocation, and externality of supervision as first-class operating quantities. The current vocabulary can *describe* each instance (process design, admission), but the recurring measured object — supervision throughput vs. fabrication throughput — has no named home. Spotify states it as the thesis: "AI increased the capacity to produce change. The next constraint became our ability to verify it… ensure those controls operate at the same pace as development" [SPOT E81].

**2. Maintenance of the factory's own knowledge substrate — (b) subdimension (of representation/carrying cost), RECURS as investment in three cases and as an independently recorded gap in all seven.**
GitLab budgets standing agent capacity to fight "capital decay" — weekly doc-freshness, TODO scans, a doc-convergence agent loop [GL E12]; Cloudflare runs a dedicated reviewer over AGENTS.md freshness with named anti-patterns [CF E32]; Shopify pays a "stupid complexity tax" in drift-fixing automation for instruction files [SHOP E44, E45]. Meanwhile every one of the seven evidence files independently recorded how-is-the-substrate-kept-true as an unanswered gap ([UBER G17], [CF GAP 15a], [SPOT GAP-16], [GL GAPS 17], [SHOP GAPS 19], [ZEN GAPS 20], [SIE G17]) — the crawlers kept asking a question the model would also ask, and the record kept not answering. The concern fits under representation + carrying cost, but the *decay-and-upkeep dynamics of the inheritance channel* deserve explicit naming rather than absorption into "process design."

**3. Adoption and usage as managed quantities — (b)/(c) borderline; RECURS across all five internal factories.**
Every internal factory measures adoption and usage volumetrically (Uber WAU/tool-mix [UBER E2, E7]; Cloudflare 60%/93% active users [CF E15]; Spotify 99%-weekly claims [SPOT E57]; Shopify sessions/channels/people, self-instrumented [SHOP E2]; GitLab's internal mandate + label regime [GL E24, E20]). Part of this is publicity; but Uber ties usage growth to stabilized spend for capacity management [E2], and Shopify's channels-doubled-users-flat shape [SHOP C30] is an operations reading. The model has no adoption concern at all. Whether it needs one, or whether adoption is an organizational-outcome variable outside the production model proper, the corpus can't settle — flagged, not recommended.

**4. Human capability change with operating experience — (c) candidate; ONE case with a quantified claim plus qualitative echoes. Directly relevant to the Chapter 6 flag.**
Shopify's 36%→77% merge-rate improvement is attributed to *people learning* — "people watching River work, noticing where it got stuck, and writing down what it should have known" — with retraining and model-switching explicitly excluded as causes [SHOP E20]; the no-DM/public-transcript architecture is justified partly as a human-learning channel ("osmosis learning… It just requires everyone's work to be visible" [E22, E19]). The Astro loop shows the same joint-improvement shape anecdotally ("the bot gets noticeably better at that part of the codebase, and so does the next human" [CF E51]). Against the addendum's Chapter-6 question: this is evidence that joint human+factory performance improves with operating experience while the fabricator is held fixed — i.e., the human side is not a static residual in at least one measured (founder-stated) instance. But it is **one quantified case**, un-audited, with the human and environmental contributions entangled by design. The honest statement: the corpus gives a real but single-case signal that operator/organizational learning is a production input the model currently has nowhere to put; no org measures human skill directly.

**5. Factory startup investment as a measured input, distinct from what the factory optimizes — (b); TWO cases with figures.**
GitLab publishes the cleanest input/output split in the corpus: ~4 weeks building the harness before the 2-week/259-MR output [GL E15, C8]; Cloudflare dates its programme ("an eleven-month effort" [CF E5]). Spotify's decade-old estate machinery is the same shape without a price. The author's optimize-vs-invest distinction is visible here: these are inputs the organization pays to *have* a factory, not properties of the process the factory runs. Currently they would be filed under "process design," which is exactly the catch-all risk flagged.

**6. Expertise scarcity as the delegation criterion — weak candidate; TWO cases, one of them outside software.**
Siemens frames delegation targets by human skill supply (6–9-month formal-property apprenticeship; CAE specialist ratios [SIE E16c, E9a]); Spotify's agentic substitution targeted the residual only a few expert teams could reach deterministically [SPOT E25]. Probably (a)/(b) — a motive input to process design — recorded because the addendum asked for skill-related recurrence; it does not clear the bar for a model change.

**No other candidate cleared the bar.** Specifically considered and dropped: developer satisfaction (measured only at Spotify, provenance weak); human–agent calibration (GitLab's label regime is a single clean case [GL E20, E21]; Shopify's social norm and Spotify's self-approval are adjacent but not the same mechanism); organizational ownership/federation (Zenseact's axis, single case, and not a software factory).

---

## 7. Considered and dropped for want of support

- Uber's "99% of engineers" figure (HTTP 402, unverifiable) and the "21,000 hours saved"/"10% coverage" AutoCover figures (absent from the paper) — already flagged NOT EVIDENCE in the crawl; excluded here too.
- Shopify's nightly "dreaming" self-rewrite loop — third-party digests only [SHOP E48, GAPS 2]; excluded from every loop-closure claim above.
- Spotify's judge-removal as settled first-party fact — used only with its second-hand marker [SPOT GAP-6].
- Any use of Cloudflare's 16K blocked merges or 230K violations as a quality outcome — they are activity counts.
- Any effectiveness claim for Cloudflare's incident-derived rules, Spotify's post-incident strengthening, Shopify's drift automation, or Zenseact's skill-improvement pipeline — remediations exist; no evidence any worked.
- Treating GitLab's internal `devex-ai-assistance` label distribution as a measurement — it exists and is not public.
- A "Zenseact/Siemens measure X" sentence of any kind — their records don't support one.

## 8. Hypotheses the evidence could not settle either way

- Whether Uber's quality holds through model migrations — the question its metrics are stated to answer; no values published [UBER E37, G4].
- Whether measurement/tolerance/evidence/admission failure classes are distinguishable in the corpus's one production escape (Spotify) — the account is one sentence [SPOT GAP-7].
- Whether proactive or reactive structure performs better — no comparative evidence exists anywhere.
- Whether any incident-derived control reduced recurrence — no recurrence data exists at any org.
- Whether Cloudflare's coordinator gate is calibrated on the false-pass side — only the false-block channel is instrumented [CF GAP 12a].
- Whether Spotify's agent-authored PRs automerge — the 2.5M aggregate does not decompose [SPOT GAP-4].
- (Model-critique) whether operator learning generalizes beyond Shopify's single founder-stated instance.
