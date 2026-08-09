*Are my models still equal to the code?*

One scorecard, four rows. Green across drift, coverage, freshness, and traceability means the map still
equals the territory — you can reason through the models instead of the code.

This is a scorecard, not four cards. Engineers do not track drift, coverage, freshness, and traceability as
independent gauges. They ask one question — can I trust the model? — and want the four rows that answer it on
one face.

Healthy direction: the Missing-Model surface drains toward an explicitly chosen floor as subsystems get
modeled.
*DocAble reference:* 56% → 7.89% over nine passes — one observed run.

### The four rows

- **Drift.** Model-sync efficacy: the drift and parity gates report the models equal to the code. Green = no
  divergence.
- **Coverage.** The Missing-Model surface — the fraction of tests whose exercised code traces to no model
  claim. It drains toward an explicitly chosen floor as the model loop covers each biggest orphan cluster in
  turn. The drain curve is the coverage reading.
- **Traceability.** The symbol-anchored traceability graph and its reverse index resolve every model claim to
  code and back. Green = no dangling anchors.
- **Freshness.** How recently each model was regenerated against its source (the model-sync discipline).

```
  MODEL HEALTH                    "Are my models = the code?"
  ──────────────────────────────────────────────────────────
  Drift          gates green
  Coverage       Missing-Model draining toward its floor  ▁▂▃▅█
  Traceability   0 dangling anchors
  Freshness      models past their last-regen window
  ──────────────────────────────────────────────────────────
  example reading — trust the model? mostly; refresh any stale first
```

### The soft-gap read

**Freshness** has no declared metric — no dashboard number says how recently each model was regenerated
against its source. Read the row green / yellow / red on regen recency: green within the sync window, yellow
one window stale, red never regenerated since a source edit. No invented freshness number.

### What this projects

Model-sync efficacy (drift) and the Missing-Model Metric (coverage) from the dashboard; the symbol-anchored
traceability graph, the drift-and-parity gates, and the executable-source-of-truth mechanisms (traceability);
the keeping-models-in-sync discipline of [Chapter 2.8](2.8-keeping-models-in-sync.html) (freshness).
