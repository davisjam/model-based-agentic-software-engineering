# Provenance — G: Cost and resource use

## Datasets
- `data/genai_deploy_cost_weekly.csv` — weekly OpenAI cost + tokens + calls
  aggregated from `deploy/genai-cost-reports/genai-token-cost-*.json` (205
  timestamped reports).
- `data/factory_cost_table.csv` — the book's authored factory-cost table.

## Figures
- **F23** `f23_cost_composition.py` — the four cost inputs (log scale).
- **F24** `f24_genai_deploy_cost_over_time.py` — weekly deploy-smoke GenAI cost.

## Classification & the LOAD-BEARING caveat
- **`factory_cost_table.csv` is the book's authored figures (mixed confidence):**
  human eng $100k (estimated), Claude ~5.0B tok $4,800 (subscription; tokens
  order-of-magnitude estimate — Anthropic does not expose Max usage), OpenAI
  628M tok $946.45 (**exact/metered**), GCP $4,886.30 (**exact/billed**), total
  ~$110,633. Priced through 2026-09-22. Source: §5.2 factory-cost-table +
  metrics.json. NOT re-derivable from the repo (subscription + billing data are
  external); reported as the book's numbers.
- **`genai_deploy_cost_weekly.csv` is DEPLOY-SMOKE cost, NOT production:** the
  205 `genai-token-cost-*.json` reports are emitted by the deploy pipeline's
  examples/smoke runs (each report's `by_phase` is dominated by `examples-emit`,
  tens-of-cents totals). They are the ONLY timestamped GenAI-cost series the repo
  retains, so they are useful for *deploy-cadence* cost shape, but they are
  **NOT** the book's 628M-token / $946 production figure and must never be summed
  toward it. Confidence: exact-as-a-deploy-smoke-measure; unavailable-as-a-
  production-cost series.

## Requested-but-unsupported (section G)
- **Production Claude/OpenAI tokens & cost per week** — not retained as a weekly
  time series. OpenAI production cost exists only as the single metered total
  ($946.45 / 628M tok); Claude is a subscription (no per-week metering). The
  deploy-smoke series is the closest available proxy and is explicitly not the
  same quantity.
- **GCP cost per week / infra before-after serverless (actual weekly billing)** —
  only the single $4,886.30 total is available; no weekly GCP billing export is in
  the repo. The before/after serverless split ("~half from always-on K8s") is the
  book's qualitative attribution, not a weekly series. F25 (infra carrying cost
  before/after) is therefore **unavailable as actual weekly billing**; the
  cold-start floor 4057ms→109ms (GC11 in section C) is the concrete before/after
  datapoint that exists.
- **Cost per commit / per merged-change / per Epic / per admitted change** — the
  numerator (weekly production cost) is unavailable, so these normalized
  efficiency ratios (F26) cannot be computed without fabricating the cost series.
  Reported as unavailable rather than divided from a deploy-smoke proxy.
