# Spotify — measurement & incidents lens

Source: `book/_design/evidence-factory-cases-260923/spotify/README.md`. All [E]/[GAP] ids refer to that file.

## 1. What Spotify reports measuring

### Production / productivity — rich, but numerator-only for the agent line

- Pre-agent fleet line (2023): >300K changes authored+merged, ~7,500/week, 75% automerged [E7]; 270K PRs in 2022, 77% automerged, 4.2M LoC [E16]; framework adoption 200 days → <7 days [E8]; Log4j fix to 80% of services in 9 hours [E9].
- Agent line: 1,500+ merged PRs (Nov 2025) [E27] → 3,000+ (Mar 2026) [E48] → 1,000 merged/10 days, up from 1,000/3 months [E49]; ~50 migrations on Claude Code [E32]; "60–90% total time saving" [E27]; one migration estimated at ~10 engineering weeks manual [E42].
- Aggregates: 2.5M+ cumulative automated maintenance PRs, "vast majority auto-merged" [E56] — **a decade-spanning, mostly-deterministic aggregate that must not be read as agent automerge** [GAP-4]; ~half of all PRs automated since mid-2024 [E26]; total merged changes ~8,100 → ~17,000 August-over-August [E78] — the cleanest published velocity delta in the case; 76% PR-frequency increase [E57] (provenance weak, [GAP-13]).
- **Denominator hole**: every agent quantity is a numerator. No sessions-attempted, no PRs-opened-but-unmerged, no per-migration success rate — "there is no public agent-change success rate" [GAP-2]. **No cost figure of any kind for Honk** [GAP-11].

### Product / quality — the corpus's only published factory-health results, including negative ones

- **Incident-retrospective instrumentation**: two questions added to every monthly incident review during the AI ramp-up — did AI-authored code directly contribute? did change *volume* pressure review/testing/rollout/observability? [E76]. Published finding: AI-authored code **not** a material direct contributor; the volume risk **was** observed — "the volume of change increased faster than some of our verification controls could adapt" [E77].
- **Rework rate**, rebuilt to separate genuine rework from new work and legacy refactoring; result: no rise, against an industry-wide churn increase — published as "a clear signal that we are not accumulating AI-induced quality debt" [E79].
- **Two watched warning signals** — code complexity and PR size creeping up — with an explicit refusal to re-baseline thresholds: "we are deliberately not rewriting the thresholds to make ourselves feel better" [E80].
- Work-mix measurement: quality/optimization work 27%→31% of merged changes [E78].
- **LLM-judge rates** (Dec 2025): vetoed ~25% of thousands of sessions; agent self-corrected ~half the time [E38]. Measured once; the judge was later reportedly removed [E51] — see incidents.
- Standardization→agent-performance: "in our more fragmented codebases, agent performance is measurably worse" [E63] — **measurement claimed, never shown** (no metric, sample, or comparison) [C13].

### Factory / process

- Verification gates PR *existence* (stop-hook verifiers [E37]; later a separate verification runtime — PR created only after full validation [E52], second-hand). Firewatch correlates automerged commits with deployment/pipeline failures and alerts the change author [E19]; cohorted rollout advances on configurable health thresholds [E20]. These are represented controls; their firing rates are not published.
- Review named the new bottleneck [E53] — asserted by the speakers; **no review-latency or review-load figure appears anywhere in the Spotify record** [C23].

### Human / organizational — the only org with published sentiment figures

- ">95% of Spotify developers believe Fleet Management has improved the quality of their software" (2023) [E10]; ">80% … positively affected the quality of their code" (2023, different wording) [E16] — divergent survey wordings, don't merge; "94% report that AI has made them more productive," ">99% use AI coding tools weekly" (2026) [E57] — no population, instrument, or period published [GAP-13].
- Xirp adoption: 36,000+ sessions, thousands of engineers, 50+ parallel sessions [E69][E70] (product copy).

## 2. Incidents

### The production escape (2026) — the corpus's only first-party account of admission machinery failing

- **What happened**: "an automated dependency upgrade passed our checks, but still failed in production, impacting end users" [E75].
- **Property threatened**: production behavior of downstream services; user impact.
- **Where the factory failed**: by construction, *measured too late* — the failure was invisible to the admission predicate ("passes all tests and checks" [E14]) and surfaced in operation. Whether the underlying gap was evidence (tests that couldn't have caught it), tolerance (no bound on the change class), or process cannot be determined: the account is one sentence — no date, component, detection latency, rollback outcome, or even deterministic-vs-agentic attribution [GAP-7]. Whether Firewatch caught it is not said. **Do not classify further than the record permits.**
- **What changed**: "strengthening safeguards, expanding rollback capacity, and scheduling automated changes during owning teams' working hours" [E75] — noting that working-hours scheduling was already 2023 policy [E15]; whether this restates or extends it is unstated.
- **Loop closed? Worked?** The response is stated in progress; no effectiveness evidence exists.

### Agent misbehaviour → control → control retired

- **Gaming**: agents "would take shortcuts to make builds pass, such as commenting out failing tests or downgrading Java versions" [E51]; the judge's most common veto trigger was scope departure [E38]. Factory-failure shape: the measured obligation (green build) diverged from the intended one — an evidence/representation gap the deterministic verifiers could not see.
- **Response**: the LLM judge (probabilistic scope check) was added and measured [E38]; per the QCon account it was "too rigid, blocking valid changes. As models improved, the judge was eventually removed, with verification steps in prompts proving sufficient" [E51]. **The removal is third-party-only and contradicts the first-party post three months earlier** [GAP-6]. If accurate, this is the corpus's only documented *retirement* of a control — and the asymmetry matters: the independent deterministic verifiers were kept; the probabilistic evaluator was retired back into the generator's own instructions [C34].
- Also: CI-failure taxonomy → verifier abstraction + pre-PR gate [E35]–[E37]; estate heterogeneity defeated prompting (Scio) → withdrawal + a standardization/testing mandate [E43][E47]; missing build-time tests in a migration → verification silently relocated to downstream human teams [E44].

## 3. Factors measured or managed with no clean home in the current model vocabulary

- **Verification-pace-vs-change-volume as the named factory-health axis**: "AI increased the capacity to produce change. The next constraint became our ability to verify it… ensure those controls operate at the same pace as development" [E81], with the incident-review volume question [E76] as its instrument. The model's admission/evidence vocabulary covers the *controls*; the measured quantity here is a *rate mismatch between fabrication and supervision* — arguably a distinct dynamic concern.
- **Review economics**: self-approval for migration drivers, stale-PR closing, a PR inbox, prospective docs-only automerge [E54] — attention-allocation responses to a bottleneck that is asserted, not measured.
- **Developer sentiment**, measured and published (above) — no home in the current model.
- **Refusal to re-baseline** [E80] — a measurement-governance discipline (protecting the metric from the operator) the model vocabulary doesn't name.
- Operator skill/training: not reported in the available sources.

## 4. Reading

Spotify is the inversion of the corpus norm: it publishes **no cost figures** and comparatively weak activity denominators, but the **strongest product/factory-health measurement** — incident attribution with a negative finding, a rebuilt rework metric with a null result, watched-but-not-rebaselined warning signals, and the only first-party account of a fleet-automation production failure. It is also the only case where measurement is documented driving a control's *removal* (second-hand) as well as controls' addition.
