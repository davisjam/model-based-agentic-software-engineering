# Provenance — I: Cross-metric (exploratory, NO causal claims)

## Dataset & figure
- `data/cross_metric_correlations.csv` — Pearson r + Spearman rho for 8 weekly
  metric pairs, with n (weeks with both values present).
- **FI** `fI_cross_metric_scatter.py` — four weekly scatters with the
  coefficients annotated.

## Method
Pairwise over `weekly_factory_metrics.csv`. Only weeks where BOTH metrics are
present are used (missing retained → dropped pairwise, never zero-filled).
Pearson + Spearman implemented in stdlib (no scipy dependency; Spearman = Pearson
on average-tie ranks). n = 27–29 weeks per pair.

## Descriptive findings (NO causation implied)
- **epics_created vs epics_closed: r=0.91, rho=0.91** — creation and closure move
  together weekly (the Epic pipeline runs at a steady create/close cadence).
- **commits_all vs files_changed: r=0.71, rho=0.79** — more commits, wider change
  surface (expected; not informative).
- **commits_all vs epics_created: r=0.51, rho=0.43** — moderate co-movement.
- **commits_all vs agent_landings_merge_train: r=-0.05, rho=-0.11** — essentially
  ZERO. This is the **load-bearing finding**: commits and merge-train landings
  measure different things across the ~W32 landing-mechanism regime shift
  (landings are 0 before W32). The near-zero is a regime artifact, NOT evidence
  the two are unrelated in a fixed regime. Treat with care.
- **commits_all vs lint_files: r=0.07** and **churn vs lint_files: r=-0.06/rho=-0.32**
  — controls accumulate monotonically regardless of weekly realization volume;
  control growth is a stock, not a weekly flow that tracks commits.

## Caveats (per the brief)
- **NO causal interpretation.** These are descriptive weekly correlations over a
  single project's history (n≈29). Confounded by the build-stage chronology,
  the landing-mechanism regime shift, and vendored-file churn spikes.
- Scatters are provided only where n is adequate and an interpretation is
  coherent. Pairs spanning the regime shift (anything vs merge-train landings)
  are flagged as regime-confounded.
- Raw weekly points + both coefficients are in the CSV; do not read a high r as a
  mechanism.

## Confidence
Exact (the arithmetic), exploratory (the interpretation). No claim survives out
of this single-case, regime-shifted, small-n setting except "these traces are
descriptively related / unrelated as reported".
