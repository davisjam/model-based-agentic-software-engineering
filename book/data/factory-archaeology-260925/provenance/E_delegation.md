# Provenance — E: Human work and delegation

## Dataset & figure
- `data/delegation_weekly.csv` — weekly commit provenance split with
  agent-driven vs human-or-unknown fractions.
- **F19** `f19_delegation_over_time.py` — stacked provenance over time.

## The defensible proxy (and what we deliberately do NOT do)
The best defensible agent-vs-human realization proxy this repo supports is the
**commit provenance split** (see A_realization_throughput.md for the heuristic):
agent-authored + automation-integrated vs the explicit human-or-unknown residual.

- Overall: **human-or-unknown = 1,763 / 32,027 commits (~5.5%)**. Because this
  bucket also holds early-history agent commits that predate the trailer
  convention, it **OVER-states** human authorship — the true human-direct share
  is lower.
- The brief explicitly forbids manufacturing a quantitative delegation staircase
  from qualitative evidence. **We do not.** The staircase (co-coder → QA →
  review lead → tech lead → architect) is the book's qualitative chronology; this
  dataset supplies only the one quantitative trace that genuinely exists (authored
  commit share) and labels it a proxy.

## Requested-but-unsupported (section E)
- **F18 "where the human works" (human edits classified product-impl vs
  tests/models/controls/orchestration/docs/infra)** — requires classifying each
  human commit by the subsystem of the files it touched, i.e. per-commit file
  paths (`--numstat`), a heavier extraction deferred to keep this pass cheap. The
  human-or-unknown bucket is also polluted by early-history agent commits, so a
  subsystem split of it would be low-signal. NOT fabricated.
- **F20 supervisory leverage (implementation change per human-authored change /
  supervisory event)** — supervisory events (dispatches, prompts, review actions)
  are not logged as a queryable series (the orchestrator's dispatch history is not
  a retained per-week telemetry stream comparable to commits). Marked exploratory /
  unavailable; no denominator manufactured.
- **Human interventions / escalations / manual merges / review events per week** —
  not retained as events. The registry logs merge-train automation, not human
  review/intervention. Unavailable.

## Confidence
Reconstructed (the provenance heuristic). The ~5.5% figure is a reconstructed
UPPER bound on human-direct commit share, not an exact human-authorship count.
