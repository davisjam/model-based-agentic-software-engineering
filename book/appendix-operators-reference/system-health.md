*Is the environment operating correctly right now?*

Begin with outcomes, not mechanism counts. Is accepted work landing? Are governed
obligations holding? Are validators and gates still exercising the surfaces they claim to
protect? Has human intervention or rollback risen unexpectedly? Only then reach for churn,
coverage, drift, and other local measures to diagnose the change.

### Three readings

- **Durable throughput.** Work reaches a durable accepted state — it lands without
  reopening, rollback, or repeated repair.
- **Defect and policy escape.** An obligation crossed the boundary meant to catch it.
- **Intervention burden.** Humans get pulled back into repeated reconstruction, review, or
  emergency repair.

A local diagnostic — churn, validator coverage, a correspondence failure, queue pressure —
earns attention when it explains movement in one of those three readings, not on its own.

```
  SYSTEM HEALTH               "Is the environment healthy right now?"
  ───────────────────────────────────────────────────────────────────
  Durable throughput       accepted work survives
  Defect / policy escape   governed obligations hold
  Human intervention       repeated attention is bounded
  ───────────────────────────────────────────────────────────────────
  Diagnose with:
  churn · correspondence · validator reach · resource pressure
```

### Read churn as motion, not health

A green environment need not have low churn. A deliberate migration or architectural rewrite
throws off enormous code motion while the system stays healthy. A quiet repository can hide
stale representations or repeated human adjudication behind its calm. Read churn as motion,
not health. Appendix H shows the particular churn shape observed during DocAble; this card
does not generalize that silhouette into a law.
