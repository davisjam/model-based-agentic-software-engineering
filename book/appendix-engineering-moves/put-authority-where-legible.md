**Problem.** An obligation can be checked too early, before the relevant property is observable, or too late, after avoidable cost or consequence has occurred. Evidence can also become stale when intervening changes alter the state that was checked.

**Move.** Enforce at the earliest boundary where the property is decidable. If later work can invalidate that evidence, re-establish it at the last safe boundary before consequence.[^toctou]

[ref:fig-move05] places both boundaries on one timeline.

<!-- label: fig-move05 -->
<!-- figure: assets/c5-earliest-legible-last-safe.svg | *Earliest legible, last safe.* A timeline runs from where work begins to consequence. Too-early sits where the property is still invisible; the earliest-legible boundary carries the first check; the last-safe boundary carries a re-check just before the point of no return. -->

**Example — Abort early.** The sentinel first-commit mechanism inspects a newly dispatched agent at its first meaningful commit. That point is early enough to avoid a long invalid trajectory and late enough that an artifact exists against which the relevant rules can be evaluated.

**Example — Re-prove at completion.** Epic completion sits at the other end. Earlier tests may have passed before subsequent integration invalidated their evidence. The final Definition-of-Done re-runs the required checks against HEAD before closure, re-establishing evidence at the consequential boundary.

**Explore:** Sentinel first-commit early-abort · Pre-commit hook · Staged deploy gates · Epic Definition-of-Done (Final-Opus rerun) · Enforce at the right semantic level. (MAGE Mechanism Catalog.)

[^toctou]: The analogy to time-of-check/time-of-use (TOCTOU) is useful: a valid check does not justify a later action if the relevant state can change between check and use. Here the intervening change may be another commit, an integration step, a generated artifact, or a deployment transition. See Part IV for the fuller treatment.
