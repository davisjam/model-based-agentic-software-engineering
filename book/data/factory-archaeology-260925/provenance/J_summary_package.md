# Provenance — J: Unified summary data package

## Files
- `data/weekly_factory_metrics.csv` — one row per ISO week (Monday start),
  every defensible longitudinal measure joined on, **missing values retained as
  empty cells** (not zero-filled).
- `data/metric_dictionary.csv` — per-metric `definition | unit | source |
  derivation | coverage_start | coverage_end | missingness | confidence | caveats`.
- `data/events.csv` — dated build stages, book snapshots, architecture changes,
  substrate milestones, and external events, kept **separate and revisable** so
  stage boundaries can change without touching the primary series.

## Weekly alignment
ISO week, Monday start, label `%G-W%V`. `week_start` is the Monday date
(`date.fromisocalendar(year, week, 1)`). Author date (`%ad`, `--date=short`) is
used for commit bucketing — this is the date the change was authored, which for
this repo's single-committer/agent model is effectively the landing date.

## Join method
Left-join of the per-analysis weekly CSVs on `iso_week`, over the full week range
from inception (2026-W11) to HEAD (2026-W39). A cell is empty when that metric had
no coverage that week (e.g. registry launches before 2026-05-30, churn in the
two dormant weeks W12–W13). Empty ≠ zero.

## Classification of the package
- **exact**: `iso_week`, `week_start`, `commits_all`, churn sums, merge-train
  landings, deploy keyword counts (as a keyword count — the *deploy* interpretation
  is estimated).
- **reconstructed**: provenance split, epics created/closed, registry launches.
- **estimated**: `active_epics_estimate`, `deploy_release_commits` as a deploy count.

## Limitations
- The unified table is **main-branch only**. Agent per-step commits that were
  squashed at merge-train time are represented by the single squash commit, not by
  their individual worktree commits (those never reach main). This is correct for a
  "what landed on main" reading but means `commits_all` is not "all work ever
  committed anywhere".
- Churn columns are **raw diff churn** including vendored/generated/snapshot files;
  they are not a source-tree LoC measure. Section B will add source-category LoC.
- The book's numbers were snapshotted 2026-08-03 (LoC/commits) and 2026-09-22
  (cost); this package extends past both. Use `events.csv` book_snapshot rows to
  align a book figure to the book's own cutoff if desired.
