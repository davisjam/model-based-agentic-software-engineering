# Provenance — A: Realization throughput

## Datasets
- `data/commits_daily.csv`, `data/commits_weekly.csv` — commit counts by provenance.
- `data/churn_weekly.csv` — files changed, insertions, deletions, churn, net LoC.
- `data/agents_weekly.csv` — merge-train landings, distinct agents, registry launches.
- `data/epics_weekly.csv` — Epics created/closed/active per week (cumulative too).
- `data/deploys_weekly.csv` — deploy/release keyword commit counts.

## Figures
- **F1** `f1_realization_over_time.py` — weekly commits, stacked by provenance,
  with retrospective build-stage boundary lines.
- **F2** `f2_work_over_time.py` — Epics created vs closed + active-Epics estimate.
- **F3** `f3_agent_activity.py` — merge-train landings + registry launches.
- **F4** `f4_change_surface.py` — files changed + insertion/deletion churn.
- **F4b** `f4b_normalized_comparison.py` — the four traces indexed to their own
  peaks, so their shapes overlay (shape comparison only, not a substitute for
  F1–F4).

## Sources & queries
All git-derived, `git log --no-merges main`:
- Metadata + trailers: `--format` with `%H %ad %ae %an %s` plus
  `%(trailers:key=Co-authored-by,valueonly)` and `%(trailers:key=Commit-of,valueonly)`,
  records terminated by ASCII RS (0x1e) so multiline trailer values stay in-record.
- Churn: `git log --no-merges --shortstat` (per-commit files/insertions/deletions).
- Epics: `git log --diff-filter=A --name-only -- docs/epics/` for first-add dates;
  `-- docs/epics/closed/` for close dates.
- Registry launches: `.claude/agent-registry.jsonl` in the **main checkout**
  (`event_type == register`, bucketed by `event_ts`).

## Authorship / provenance heuristic (report it explicitly)
Nearly every commit's git **author** is the human git identity (`Jamie Davis`) —
agents commit under the repo's git user and mark agent authorship with a
`Co-Authored-By: Claude` trailer. Author-field classification would be actively
misleading, so we classify on **trailers + subject prefixes**:

- **automation** — subject starts with `merge-train squash:`, `merge-train `,
  `sentinel:`, `tombstone:`, `chore(worktree):`, or `quiesce:`. These are substrate
  bookkeeping / integration commits emitted by tooling.
- **agent** — carries a `Co-Authored-By: Claude` trailer OR a `Commit-of: i/N`
  trailer.
- **human_or_unknown** — neither. This is an **explicit residual**, NOT a human
  claim: early-history agent commits made before the trailer convention existed
  land here. We keep the bucket rather than infer.

Classification is **reconstructed**, not exact.

## The landing-mechanism transition (the load-bearing caveat for A)
The provenance split changes character around **2026-W32 (early August)**:

- Before ~W32, agent work landed on main via **direct cherry-pick** — each landed
  commit carried the `Co-Authored-By`/`Commit-of` trailer, so it counts as
  **agent**. `commits_agent` is high (hundreds–thousands/week).
- From ~W32, **merge-train squash** became the dominant landing mechanism. Each
  agent worktree lands as ONE `merge-train squash: agent-<id>` commit, classified
  **automation**. `commits_agent` drops and `commits_automation` rises — this is a
  **change in how work is recorded, not a drop in agent activity**.

Consequences:
- `commits_all` is comparable across the whole window (it counts every main commit
  either way), but its **composition** is not: a late-period squash represents many
  underlying agent commits collapsed into one.
- `agent_landings_merge_train` is **0 before W32** because squash was not yet the
  mechanism — it is a lower bound on total agent work-units, valid as a series only
  from W32 on. Do NOT read the pre-W32 zeros as "no agents".
- The cleanest cross-window realization signal is therefore **Epics created/closed**
  (intent units) and **`commits_all`** (raw landings), with agent-vs-automation used
  to *explain* the composition shift rather than as an activity level.

## Denominators
- Commit series denominator: all non-merge commits on main that week.
- Epics: distinct slugs (deduplicated on first appearance), not file-events.
- Registry launches: `register` events only; denominator is registry-covered weeks
  (from 2026-W22).

## Confidence
- **exact**: `commits_all`, churn sums, merge-train landings, distinct agents.
- **reconstructed**: provenance split, epics, registry launches.
- **estimated**: `deploy_release_commits` (keyword proxy; lower bound),
  `active_epics_estimate`.

## Requested-but-unsupported (section A)
- **PRs/MRs per week** — the repo does not use PRs for the agent flow (worktree +
  cherry-pick / merge-train), so there is no PR series. Unavailable by design.
- **Merge attempts vs merges, conflicts/reconciliations per week** — partially in
  the registry (`merge_train_started` / `merge_train_complete` / `merge_train_aborted`
  from 2026-05-30) and will be added under section D; not in section A.
- **Peak/mean concurrent agents per week** — no continuous liveness series retained;
  reported unavailable-as-a-time-series (see README).
- **Agent-hours / session duration per week** — not reliably retained; the registry
  logs discrete events, not durations, and worktree lifetimes are not a clean
  session-duration proxy. Unavailable.
- **Model/API calls & tokens per week (historical)** — only deploy-time GenAI cost
  reports carry timestamps (section G); production per-week token history is not
  retained. Deferred to G with its limitations stated.
- **Unique files changed / subsystems touched per week** — requires `--numstat`
  (per-file paths), a heavier extraction deferred to keep this pass cheap; the tool
  has a hook to add it (`churn` currently uses `--shortstat`, which gives
  non-unique file counts). Marked as a planned extension, not fabricated.
