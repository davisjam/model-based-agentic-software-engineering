*Can I trust this release?*

A release is ready when every obligation assigned blocking authority has current supporting evidence and
every blocking gate passes. The checklist gathers those obligations at release time; it does not create new
ones.

The specific checks depend on the system. A model-based obligation requires current correspondence only when
the release relies on that model; a locally enforced property may require no system model. The general rule
is obligation → evidence → authority.

### The preflight

Instantiate the checklist for each release. List the obligations carrying blocking authority, confirm that
each has current evidence, and confirm that every blocking gate passes.

```
  RELEASE READINESS  ·  PREFLIGHT              "Can I trust this release?"
  ═══════════════════════════════════════════════════════════════════════
  [ ]  Blocking obligations identified and current
  [ ]  Required evidence present and fresh
  [ ]  Trusted representations satisfy their correspondence contracts
       — where this release relies on them
  [ ]  Validators / assurance checks exercised and green
  [ ]  Admission / deployment gates green
  [ ]  Overrides and accepted residual risks reviewed
  ═══════════════════════════════════════════════════════════════════════
  All blocking obligations discharged  →  ship.
  Otherwise  →  wait, record an explicit override, or revise the governing policy.
```

### The override note

Treat an override as an engineering event. Record who accepted it, the available evidence, the bypassed
obligation, and whether the exception reveals a recurring class that warrants later review. Do not carry the
exception into future releases implicitly.
