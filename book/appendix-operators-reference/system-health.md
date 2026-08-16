*Is the environment operating correctly right now?*

Begin with outcomes. Check whether accepted work is landing, governed obligations are
holding, validators and gates are exercising their intended surfaces, and human intervention
or rollback has risen unexpectedly. Use churn, coverage, drift, and other local measures only
to diagnose changes in those outcomes.

### Three readings

- **Durable throughput.** Accepted work remains accepted without reopening, rollback, or
  repeated repair.
- **Defect and policy escape.** Incorrect or policy-violating work passes the boundary
  intended to prevent it.
- **Intervention burden.** Humans get pulled back into repeated reconstruction, review, or
  emergency repair.

Use churn, validator coverage, correspondence failures, and queue pressure only when they
explain movement in the primary readings.

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

Churn measures code motion, not system health. A migration or architectural rewrite can
produce high churn in a healthy environment, while a quiet repository can still contain stale
representations or repeated human adjudication. Appendix G records the churn observed in
DocAble.
