# GitLab — measurement & incidents lens

Source: `book/_design/evidence-factory-cases-260923/gitlab/README.md`. All [E]/[GAPS] ids refer to that file. GitLab is two things — its own factory, and a factory-in-a-box vendor — and the measurement records differ.

## 1. What GitLab reports measuring

### Production / productivity

- **Own factory, one bounded datum**: a 135K-line Rust codebase ~95% AI-generated; 4 engineers, 259 MRs, ~2 weeks [E13] — greenfield, harness-first; an existence proof, not an organizational average [C7]. The harness itself took ~4 weeks to build [E15] — a published factory-startup cost, and the input/output split (4 weeks investment before 2 weeks of output) is unusually honest.
- **No organization-wide realization share is published** [GAPS 1]. The per-MR `devex-ai-assistance` 1–5 provenance label exists as stated practice [E20] — the mechanism exists, the measurement is internal, **no aggregate distribution is public**. A clean instance of the mechanism≠metric distinction.
- **Vendor metrics**: "up to 11x faster, up to 4.5x fewer tokens, up to 45x fewer hallucinations" (internal test, Orbit vs no-Orbit) [E30] — "hallucinations" undefined, no protocol [GAPS 3], and the 4.5x is stated as "fewer tokens" in one post and "more cost effective" in another — different constructs, uncorrected drift [E31][GAPS 4]. Indexing scale: 40K projects / 500M nodes / 2B edges / <45 min [E33].
- **Named-customer A/B**: 79 real MRs, 0.696 vs 0.577 inline-comment accuracy (Orbit-grounded vs RAG), prompts and models held fixed [E32] — the vendor record's one methodologically stated comparison; the measured quantity is review-comment placement, a process metric.
- Commissioned figures: Forrester "400% ROI" [E59]; Harris survey market numbers [E57][E58]. Vendor-commissioned; weak.

### Product / quality

- **Not reported.** "Nothing in the corpus reports defect rates, rollback rates, revert rates, incident attribution, or review-effort change for agent-authored versus human-authored MRs — at GitLab or at any named customer" [GAPS 2]. Machinery abounds (15+ CI jobs, four security scanners, three AI reviewers [E15]); no result of any of it is published as a metric.

### Factory / process

- The maturity grid (0–3 over four dimensions) and the autonomy ladder with a gating rule — "Reach Level 2 on the maturity grid first" [E2][E9] — are *represented* readiness models; no scored assessments are published.
- The judge-vs-lint routing rule is stated in cost terms ("if RuboCop or Danger can catch it deterministically, let them — it's cheaper, faster") [E23].

### Human / organizational

- The provenance label's stated rationale is **review-depth calibration**: "it helps the team calibrate expectations around review depth for heavily AI-assisted MRs" [E21] — a human–agent calibration mechanism. Whether the label is enforced or merely normed is not stated [GAPS 14].
- Market survey (not GitLab's own org): 85% say the bottleneck moved to reviewing/validating; 80% adopted tools faster than policies [E58]. Self-serving direction — GitLab sells the remedy.
- Own-org satisfaction, training, cognitive load: **not reported in the available sources.**

## 2. Incidents

**No concrete incident is reported.** What the record has instead is *failure classes named and mechanically countered*, without any narrated occurrence:

- **"Test count guard prevents agents from deleting tests to make them pass (a known failure mode)"** [E6] — a CI job failing on test-count decrease without an explicit skip label. The phrase "a known failure mode" implies operating experience; no specific instance, count, or firing rate is published. Judgment→structure as doctrine, evidence of the originating failures withheld.
- The playbook's whole stance is a codified conversion discipline: "Fix the environment, not the prompt. When an agent produces bad code, don't write a better prompt. Add a lint rule, a test, or a doc" [E1] — an org-level policy that failures become durable structure by default. The record shows the policy, not the ledger of conversions.
- One team's harness became a reference implementation and then a handbook playbook seven weeks later [C33] — experience propagating as a document.
- Self-updating instructions ("let it update its own instructions" [E11]) have **no stated gate** [GAPS 13] — a latent factory risk the record leaves open, not an incident.

Effectiveness evidence for any of these controls: none published.

## 3. Factors measured or managed with no clean home in the current model vocabulary

- **Per-change human-contribution provenance as a review-calibration input** [E20][E21]: the factory records *how much a human did* so that other humans can scale their scrutiny. This is human–agent calibration machinery; the current vocabulary's admission/evidence concepts don't obviously hold it.
- **Environment maturity as a precondition for autonomy** [E2][E9]: readiness is modeled as a property of the *environment*, with a gate on how much autonomy may be granted. Close to process design, but the gating-of-delegation-by-substrate-maturity move is a distinct shape.
- **Factory depreciation budgeted**: weekly TODO scans, doc-freshness checks, the "Ralph pattern" doc-convergence agent loop, per-MR coverage drift [E12] — standing agent capacity spent maintaining the factory's own knowledge substrate.
- **Startup investment measured**: the 4-week harness cost [E15] — an input the organization paid before the factory produced, cleanly separated from the output claim.
