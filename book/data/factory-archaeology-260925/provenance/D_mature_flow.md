# Provenance — D: Mature factory in operation

## Dataset & figure
- `data/mature_flow_weekly.csv` — weekly merge-train lifecycle event counts
  from the shared registry (`register`, `merge_train_started`,
  `merge_train_complete`, `merge_train_aborted`, `tombstone`,
  `tombstoning_started`, `gc`).
- **F13** `f13_mature_flow_funnel.py` — the representative mature week's funnel.

## Representative window (why this one)
The week with the most `merge_train_complete` events is **2026-W35**
(2026-08-24), a FULL week deep in the merge-train era (not a hand-picked good
day). Its funnel: **592 merge-train runs started → 573 completed (landed) → 10
aborted** (~96.7% completion), with 192 worktrees tombstoned. This is a real
operational funnel for the mature push-plane factory.

## Source & classification
Registry (`.claude/agent-registry.jsonl`) in the main checkout, coverage from
**2026-05-30** (`register` and `merge_train_*` events). Counts are **exact** for
the events the registry logs. Weeks before 2026-W22 are empty (registry did not
exist), retained as missing.

## Requested-but-unsupported (section D)
The brief's full mature-flow funnel (tasks delegated → local validation
attempts/pass/fail → autonomous repair/retry → integration validation →
admitted → deployed → rollbacks → human escalations → abandoned; time-to-admission;
autonomous iterations before admission; % admitted without human code
modification / inspection) is **only partially reconstructable**:
- **Supported**: merge-train started/completed/aborted (the admission funnel),
  tombstones (worktree completion), from the registry.
- **NOT retained as event-level data**: per-task local validation pass/fail
  counts, autonomous repair iterations, integration-validation attempts,
  rollbacks, human escalations, tasks abandoned, time-to-admission,
  iterations-to-admission. These are not logged as queryable events. F14–F17
  (outcomes / admission-evidence / time-to-admission / iterations-to-admission)
  are therefore **not supported at event granularity**.
- **% admitted without direct human code modification / inspection**: the
  book's headline ("I inspected almost none of the code") is a qualitative
  author statement. The commit-provenance proxy (section E: ~5.5% human-or-unknown
  commits, which OVER-states human involvement) is consistent with it but is a
  DIFFERENT quantity (authored-commit share, not per-change inspection). We do
  NOT claim an inspection percentage — no evidence records whether a human read a
  given change. Reported as unavailable to avoid a false precision.
