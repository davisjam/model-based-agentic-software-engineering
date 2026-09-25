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
| **This directory** | 25 CSVs — the mined weekly series and its census tables — plus one JSON, the later per-Epic size ingest below |
| **Sibling scripts** | `book/figures/factory-archaeology-260925/` — 17 matplotlib generators |
| **Analysis write-ups** | `provenance/` beside this file — 10 notes, one per mining pass (A–J) |

A superseded revision, `5.2-inside-docables-software-factory-REVISED-260925.md` (09:45,
103,416 bytes), also sits in the source directory. It was **not** ingested; the
`260925.103236` file is a re-synthesis over it.

## Second ingest — per-Epic size, `epic_size_metrics-260925.185809.json`

| | |
|---|---|
| **Acquisition stamp** | `260925.185809` (the emitter's own `generated_ts`, 2026-09-25T18:58:09Z) |
| **Source** | the same sibling working directory, a later mining pass than the `103236` ingest |
| **Answers** | how big *one* closed Epic is — the magnitude behind a single point on `f2_work_over_time` |
| **Population** | all 478 closed Epics (374 directory-form, 104 flat-file), joined against the 32,099 non-merge commits reachable from the parent repo's main |
| **Write-up** | `epic-size-quantification-260925.md` in the source directory, not ingested |

**The join is non-temporal by construction.** A commit is attributed to an Epic when its
*message* cites that Epic by qualified path, or when it is the Epic's close chore. Timing
proximity is never used: in a fleet that lands many Epics' commits interleaved on the same day
it would be actively wrong. The closure record itself is no help — the close tool verifies its
commit list for reachability and then discards it.

**Read the commit counts as a lower bound.** The path-qualified join covers 444 of 478 closed
Epics (92.9%); the 34 misses are mostly early Epics whose commits used a bare subject scope. A
looser join that accepts a bare slug match reaches 477 of 478 but over-counts badly for Epics
whose slug names a fleet-wide discipline theme. §5.2 quotes the strict median (2 commits) and
names the looser one (4) as the upper bracket.

**Two churn measures, and the chapter says which.** Median *total repository* churn is 344
lines; median *production-source* churn is 10. The gap is the point: the median Epic's change is
mostly its own design document, phase notes, models, and controls. Quoting either alone
misleads. The mean is unusable without the median — a single mechanical mass-repoint Epic
(2,525,014 lines across 496 files in 5 commits) pulls the mean total churn from ~1,348 to 7,032.

**One field in the artifact does not support a claim.** `agent_execs` has n=15 of 444, because
it proxies agent executions by counting agent-id tokens surviving in commit messages, and those
are stripped at squash or cherry-pick. §5.2 makes no agents-per-Epic claim from it. The correct
source would be the parent repo's agent registry, which is not mined here.

## Refreshing the data

The series are a **snapshot of a moving repository**, not fixed quantities. Every count in
them drifts upward on a re-run, and the chapter says so where it matters — the model census
had already drifted by one between the revision examined and the census re-derived while the
chapter was being written. Refresh when a claim's *shape* is at stake, not to chase a level.

Re-mining requires the extraction tools — **`factory_archaeology.py`** for the weekly series and
**`mine_epic_size.py`** for the per-Epic sizes — which were deliberately not copied here. They
live with the source working directory, read the parent repository's git history directly, and
are of no use to this submodule: the book repo ships the *results* of the archaeology, not the
machinery that performs it. The raw extraction caches (`data/_raw/`) are likewise absent — they
are large and regenerable.

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
  jointly-zero weeks inflate it. **§5.2 no longer reports either figure.** The Epic-size
  ingest above shows why: Epics vary from 1 to 102 commits and from 7 to 2.5M lines, so a
  correlation between creation and closure counts invites the reader to treat them as
  homogeneous arrival and service units, which they are not. Read every other row of that
  file with the same question in mind.
- **The mature-flow event log covers the admission stage only.** Per-task validation attempts,
  repair iterations, rollbacks and escalations were never retained as queryable events, so the
  funnel upstream of admission is not reconstructable from this record at any date.
