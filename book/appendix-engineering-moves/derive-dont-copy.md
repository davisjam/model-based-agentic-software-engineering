**Problem.** A source of truth does not help if every consumer immediately copies values out of it. The model stays nominally authoritative while the real engineering decisions run against snapshots. This failure hides well: the organization believes it already solved the authority problem, so no one looks for the drift.

**Move.** Consume authoritative representations by query or derivation. Never create a second editable truth for convenience.

[ref:fig-move02] sets the copied snapshot against the live query.

<!-- label: fig-move02 -->
<!-- figure: assets/c2-derive-dont-copy.svg | *Query, don't snapshot.* BAD — the model is copied into a snapshot that a check reads; the model changes, the snapshot does not. GOOD — the check queries the model directly, so the next check sees the change. -->

**Example — Live model consumption.** Model-aware lints, tests, and agent briefs query the live representation instead of embedding values lifted from it. A rule that depends on the modeled architecture changes when the architecture changes. The consumer couples to the model's interface, not to yesterday's answer, so a structural edit propagates without a hunt for stale copies.

**Example — Generated artifacts.** Some consumers should not query at run time. Configuration, documentation, or policy can instead generate from the authoritative model at build time. The important property holds either way: the downstream artifact stays a derivative, not an independently maintained restatement of the same fact that a later editor can quietly contradict.

**Explore:** Meta-model consumption discipline (Read the Model, Don't Copy It) · Model query surface · Model-driven codegen · Doc-hygiene provenance. (MAGE Mechanism Catalog.)
