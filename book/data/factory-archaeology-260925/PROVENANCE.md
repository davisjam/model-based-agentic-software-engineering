# Factory archaeology — acquisition record

Provenance for the mined weekly series behind §5.2 (*Inside DocAble's Software Factory*).
This file plays the role the `_provenance` key plays in the sibling `book/data/*.json`
models: it names the emitter, the acquisition point, and the regeneration discipline, so a
later reader can tell whether the data needs refreshing without re-deriving any of it.

## What was acquired

| | |
|---|---|
| **Acquisition stamp** | `260925.103236` |
| **Date obtained** | 2026-09-25 |
| **Source** | the sibling `mage-book-52-factory-archaeology/` working directory in the parent repo (not part of this submodule) |
| **Chapter revision ingested** | `5.2-inside-docables-software-factory-260925.103236.md` (108,591 bytes), with its cover note `COVER-NOTE-52-V2-260925.103236.md` |
| **Window mined** | the parent repo's project weeks 1–29, 2026-03-09 through 2026-09-21 |
| **This directory** | 25 CSVs — the mined weekly series and its census tables |
| **Sibling scripts** | `book/figures/factory-archaeology-260925/` — 17 matplotlib generators |
| **Analysis write-ups** | `provenance/` beside this file — 10 notes, one per mining pass (A–J) |

A superseded revision, `5.2-inside-docables-software-factory-REVISED-260925.md` (09:45,
103,416 bytes), also sits in the source directory. It was **not** ingested; the
`260925.103236` file is a re-synthesis over it.

## Refreshing the data

The series are a **snapshot of a moving repository**, not fixed quantities. Every count in
them drifts upward on a re-run, and the chapter says so where it matters — the model census
had already drifted by one between the revision examined and the census re-derived while the
chapter was being written. Refresh when a claim's *shape* is at stake, not to chase a level.

Re-mining requires the extraction tool, **`factory_archaeology.py`**, which was deliberately
not copied here. It lives with the source working directory, reads the parent repository's git
history directly, and is of no use to this submodule: the book repo ships the *results* of the
archaeology, not the machinery that performs it. Its raw extraction caches (`data/_raw/`) are
likewise absent — they are large and regenerable.

## Regenerating the figures

The eight generated figures in §5.2 are **regenerable from this directory plus the sibling
scripts** — nothing else is needed, and no network or repository access is involved:

```
python3 book/figures/factory-archaeology-260925/f1_realization_over_time.py
```

Each script reads its CSVs from this directory and writes an SVG into `book/assets/`, where
the chapter's `<!-- figure: -->` directives resolve. Edit a script to restyle a figure and
re-run it; the rendered asset is tracked, so the change lands with the commit.

| Figure asset | Generator | Primary series |
|---|---|---|
| `assets/f1_realization_over_time.svg` | `f1_realization_over_time.py` | `weekly_factory_metrics.csv`, `events.csv` |
| `assets/f2_work_over_time.svg` | `f2_work_over_time.py` | `weekly_factory_metrics.csv` |
| `assets/f5_f6_capital_and_support_ratio.svg` | `f5_f6_capital_and_support_ratio.py` | `loc_weekly.csv`, `loc_snapshots.csv` |
| `assets/f7_controls_accumulate.svg` | `f7_controls_accumulate.py` | `control_growth_weekly.csv` |
| `assets/f10_what_experience_became.svg` | `f10_what_experience_became.py` | `governance_conversions.csv` |
| `assets/f13_mature_flow_funnel.svg` | `f13_mature_flow_funnel.py` | `mature_flow_weekly.csv` |
| `assets/f19_delegation_over_time.svg` | `f19_delegation_over_time.py` | `delegation_weekly.csv` |
| `assets/f21_f22_model_census.svg` | `f21_f22_model_census.py` | `model_census.csv` |

The other nine scripts generate figures the chapter does not currently place. They are kept
because they run against the same data and are the cheapest way to look at a series the
chapter summarizes in prose.

The four authored diagrams §5.2 also uses — `build-stages-timeline`, `mage-staircase`,
`measurement-no-gate`, `modeling-history` — are hand-drawn SVGs that predate this ingest and
already lived in `book/assets/`. They are not generated from anything here.

## Known gaps in the mined data

Recorded so a later refresh does not rediscover them:

- **`loc_snapshots.csv` carries a `support_ratio` for only two of its four rows.** The
  mechanization and hardening snapshots are present as dated rows with the ratio column empty,
  so `f5_f6` overlays two validation diamonds, not four. The chapter says two.
- **`cross_metric_correlations.csv` reports every correlation over all 29 weeks**, including
  weeks that are structurally zero because the discipline being counted did not yet exist. The
  Epic creation/closure correlation is the case that matters: `r = 0.9095` over 29 weeks
  becomes `r ≈ 0.70` over the eighteen weeks the Epic discipline existed, because eleven
  jointly-zero weeks inflate it. §5.2 reports the restricted figure and explains the
  difference. Read every other row of that file with the same question in mind.
- **The mature-flow event log covers the admission stage only.** Per-task validation attempts,
  repair iterations, rollbacks and escalations were never retained as queryable events, so the
  funnel upstream of admission is not reconstructable from this record at any date.
