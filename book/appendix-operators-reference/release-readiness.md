*Can I trust this release?*

A release is ready when every obligation that has been assigned blocking authority is backed by current
evidence and every blocking gate is green. The checklist gathers those obligations onto one face; it does not
invent new ones at release time. A pilot does not certify a plane from feel, and a MAGE operator does not
certify a release from feel — the preflight reads the instruments the earlier chapters already installed.

The exact boxes depend on the system. A model-based obligation requires current correspondence only if the
release relies on that model. A sandboxed action may require no system model at all. Fidelity may be
load-bearing for a document transformer and irrelevant to another product. The universal rule is obligation →
evidence → authority, not a universal set of six mechanisms.

### The preflight

Read each box as a per-release obligation, not a fixed requirement. Instantiate the checklist for the system
in front of you: list the obligations that carry blocking authority for this release, confirm each has fresh
evidence, and confirm every blocking gate is green. An unfilled box is a release that waits.

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
  Otherwise  →  wait, override explicitly, or change the policy.
```

### The override note

An override is itself an engineering event. Record who accepted it, what evidence was available, what
obligation was bypassed, and whether the exception exposes a recurring class worth reconsidering later. Do not
silently inherit yesterday's exception into tomorrow's release.
