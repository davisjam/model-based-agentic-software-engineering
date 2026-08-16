**Problem.** An authoritative source loses authority when consumers copy its values into independently maintained snapshots. The model may remain nominally authoritative while engineering decisions operate on stale copies.

**Move.** Consume authoritative representations by query or derivation rather than creating a second editable copy.

[ref:fig-move02] sets the snapshot against the query.

<!-- label: fig-move02 -->
<!-- figure: assets/c2-derive-dont-copy.svg | *Query, don't snapshot.* BAD — the model is copied into a snapshot that a check reads; the model changes, the snapshot does not. GOOD — the check queries the model directly, so the next check sees the change. -->

**Example — Live model consumption.** Model-aware lints, tests, and agent briefs query the current representation instead of embedding copied values. When the modeled architecture changes, consumers observe the new state through the model interface without requiring stale copies to be found and updated.

**Example — Generated artifacts.** Consumers that should not query at run time can instead be generated from the authoritative model at build time. The downstream artifact remains derivative rather than becoming an independently maintained copy.

**Explore:** Meta-model consumption discipline · Model query surface · Model-driven codegen · Doc-hygiene provenance. (MAGE Mechanism Catalog.)
