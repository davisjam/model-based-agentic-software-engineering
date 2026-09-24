# Uber — measurement & incidents lens

Source: `book/_design/evidence-factory-cases-260923/uber/README.md`. All [E]/[G] ids refer to that file.

## 1. What Uber reports measuring

### Production / productivity — rich, published

- **>70% of PRs "attributed to local or cloud agents"** [E1][E4]. Activity/attribution measure; fabrication-stage. **No published definition, denominator, or window** [G1]. Distinct constructs on the record: 11% of PRs *opened by agents* (Mar 2026) [E8] and 11% of merged PRs via Minion (May 2026) [S11]. These three numbers must not be presented as one trend line.
- **3,600+ skills; 30K+ skill executions/day** [E1]; **7x WAU growth, 9.4x weekly request growth Feb–Aug 2026** [E2]. Activity measures.
- **Cost per 1K model requests −34% from peak; cost per session −52% from June peak**, measured with one model held fixed to isolate own-optimization gains [E3]. Cost measure with a stated controlled method — the most methodologically careful economics number in the seven-case corpus.
- **2x lines of code per engineer YoY** [E4]. Output measure; no counterfactual [G12].
- **250+ automated migrations, 9M lines** [E5] — not decomposed agentic vs. deterministic; the one documented migration (Shepherd/JUnit, 75K test classes, 1.25M lines) was deterministic OpenRewrite codemods [E29]. Do not read as agent volume.
- **Token economics measured per intervention**: code-mode savings 55–~100% on five paired runs, >90% compounded in bulk [E43]; 50–70K tokens of schema overhead identified and eliminated [E44]. Cost measures that fed engineering changes (see §3).
- **Outcome-denominated unit costs** — cost per merged PR / per review / per alert / per cleanup — *named as tracked* per managed agent [E37]. **No values published.**

### Product / quality — named in detail, values not published

- **Revert rate, F1, MTTR** are named as the tracked quality signals per managed agent, explicitly framed as answering "whether quality holds through model migrations" [E37]. **Not one value for any of them appears anywhere in the public record** [G4]. Mechanism-exists ✓, result-measured claimed ✓, value published ✗.
- **uReview**: 75% of comments marked useful, >65% addressed (2025) [E20]; later 25K comments/week, ~67% addressal, ~3/4 of high-severity issues addressed [E22]. These measure **developer response to agent output**, not defect outcomes. The claimed "accuracy up ~70%" is undefined by the conference's own editorial note [E22]. [E20] contains an uncorrected weekly-vs-monthly denominator conflict [G9].
- **AutoCover (peer-reviewed)**: viable-test success rates ~20% Java / 40% Go / 80% Python; 44% IDE acceptance; mutation testing and a validator as a genuine machine admission gate over tests [E26][E27], with a published threats-to-validity section [E28]. This is the corpus's strongest quality instrumentation — and it still measures test viability and user acceptance, not production defect outcomes.
- **No incident, escape, or rollback rate attributed to agent-authored change anywhere** [G4].

### Factory / process — rich, and used

- **Uber SWE Benchmark built from thousands of real PRs**; four-step procedure: benchmark from real work → model-agnostic harness → move to Pareto-optimal (cost/completed task, output quality, model reliability) → keep moving [E38]. Stated as governing model selection for all managed agents.
- **16 named session anti-patterns, each priced and paired with a remediation**, detected in the runtime with zero opt-in [E42].
- **Time to first review: 3h (2024) → 9h (2026)** [E23] — a factory-health regression published in Uber's own talk; the stated motive for the review-architecture work.
- One paired grounding anecdote (38s vs 20min) [E17] — an illustration, not a benchmark.

### Human / organizational

- The review-latency figure [E23] doubles as a review-burden measure. Reviewer attention is explicitly treated as a rationed, schedulable capacity ("spare compute does not imply unlimited reviewer attention") [E40].
- Spend governance instrumented per engineer (statusline counter, 50/80/100% nudges, manager sign-off on tier upgrades) [E34].
- No published developer-satisfaction, cognitive-load, or adoption-survey instrument beyond the adoption percentages in [E7]/[E8]. Otherwise: **not reported in the available sources.**

## 2. Incidents

**No concrete incident, escape, or near-miss is disclosed anywhere in the Uber record.** [G4], [G7].

What the record does contain:

- **Incidents as feedstock**: "at roughly a monthly cadence, Uber looks through incident reviews for lessons that can become new maintenance skills and be applied across services" [E39]. The incidents themselves are not described; no count of skills so derived and no measure of what they prevented [C26]. This is a *standing conversion process* over an undisclosed incident stream — structurally interesting, evidentially empty.
- **A named failure dynamic, not an incident**: reviewer-comment "cavitation" — a low-quality inner-loop review comment makes the agent "fix backwards" [E32]. Stated as a known dynamic that raised the accuracy bar on the inner-loop reviewer; no specific occurrence reported.
- Post-merge reversal of agent-authored change: no account [G7]. Shepherd's revert-on-test-failure policy [E29] is pre-merge behavior of a deterministic codemod.

Factory-failure classification: not applicable — no incident is reported to classify.

## 3. The loop-closing hypothesis (verified, with an asymmetry)

The brief's claim — Uber's measurement selects models and restructures workflows rather than merely reporting percentages — is **supported by the record, on the cost side**:

- Model selection is a stated, repeatable, benchmark-driven procedure applied to every managed agent [E38] — measurement → routing decision.
- Session-waste measurement feeds priced remediations built into the runtime [E42]; measured schema overhead was engineered away (CLI projection of 1K+ MCP tools) [E44]; measured code-mode savings became 25+ pre-built default skills [E43]; fleet-wide defaults (compaction at 400K, medium reasoning, weak-model subagents) are policy outputs of cost measurement [E45].
- Maintenance work is scheduled against measured CI capacity and *capped against reviewer attention* [E40] — measurement governing workflow shape.
- Developer feedback on uReview streams back as tuning signal [E22].

**The asymmetry**: the quality half of this loop is asserted, not shown. The loop's stated purpose is "whether quality holds through model migrations" [E37], and the quality signals that would answer it (revert rate, F1, MTTR) are named and never published [G4]. The public record proves a cost-optimizing control loop and *claims* a quality-holding one. And Uber also publishes the percentage-flexing numbers (70%, 3,600 skills) with an undefined denominator [G1] — the loop-closing posture and the headline-attribution posture coexist.

## 4. Factors Uber measures or manages with no clean home in the current model vocabulary

- **Reviewer attention as a rationed, schedulable capacity.** Maintenance jobs are placed on Sunday for CI capacity while Monday diff volume facing engineers is *separately* capped; the principle is stated — "spare compute does not imply unlimited reviewer attention" [E40] — and the pressure is measured (time to first review 3h→9h [E23]). This is supervision capacity treated as an operations-research resource, not as a residual. Candidate classification: subdimension of admission/human-judgment at minimum; see SYNTHESIS for cross-case recurrence.
- **Adoption and usage as managed quantities**: 7x WAU, 9.4x requests, tool-mix shift (Claude Code 32%→63%) [E2][E7], tied operationally to "total AI spend has relatively stabilized" [E2]. The model has no adoption concern; Uber measures it and manages spend against it.
- **Factory self-maintenance**: skills lifecycle (lint+review floor, persona defaults, continuous evaluations returning evidence to authors [E18]), with skill decay/retirement unmeasured [G10]; automated skill self-update announced as future work [E41].
- **Operator skill/training**: not reported in the available sources — the human-role change ("up a layer" [E31]) is stated intent, and no source measures what reviewers spend attention on or how their capability changes [C4].

## 5. Denominator warnings specific to this case

- 70% "attributed to" (undefined) ≠ 11% "opened by agents" ≠ 11% merged-via-Minion [G1, E8, S11].
- uReview 65,000 diffs weekly vs monthly — uncorrected internal conflict [E20][G9].
- AutoCover "11% of all new tests" is of tests *reviewed and added*, per the paper's own wording [E26].
- Two irreconcilable published shapes for the context graph [E15][E16][G8].
