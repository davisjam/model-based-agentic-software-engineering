**Problem.** An obligation can be checked too early, before the relevant property even exists, or too late, after avoidable work or consequence has already been paid. Evidence can also spoil in between: a check that passed can no longer justify an action once intervening change has moved the state it examined.

**Move.** Enforce at the earliest boundary that can honestly decide the property. When later work can invalidate that evidence, re-establish it at the last boundary before consequence.[^toctou]

[ref:fig-move05] places the earliest-legible and last-safe boundaries on one timeline.

<!-- label: fig-move05 -->
<!-- figure: assets/c5-earliest-legible-last-safe.svg | *Earliest legible, last safe.* A timeline runs from where work begins to consequence. Too-early sits where the property is still invisible; the earliest-legible boundary carries the first check; the last-safe boundary carries a re-check just before the point of no return. -->

**Example — Abort early.** The sentinel first-commit mechanism inspects a newly dispatched agent at its first meaningful commit. That is early enough to avoid paying for a long invalid trajectory, and late enough that an artifact now exists against which the relevant rules can actually be evaluated. Earlier, there would be nothing to judge.

**Example — Re-prove at completion.** Epic completion sits at the other end. Earlier tests may all have passed when they ran, yet intervening integration can invalidate them. The final Definition-of-Done re-runs the required checks against HEAD before closure. The later gate does not replace early feedback; it re-establishes evidence at the consequential boundary.

**Explore:** Sentinel first-commit early-abort · Pre-commit hook · Staged deploy gates · Epic Definition-of-Done (Final-Opus rerun) · Enforce at the right semantic level. (MAGE Mechanism Catalog.)

[^toctou]: The analogy to time-of-check / time-of-use (TOCTOU) is useful: a correct check does not justify a later action if the relevant state can change between the check and the use. Here the concern runs broader than concurrency — the intervening state change may be another commit, an integration step, a generated artifact, or a deployment transition. Part IV develops this footnote in full; this page only names the shape.
