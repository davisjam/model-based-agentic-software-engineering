**Problem.** Once work has propagated through commits, generated artifacts, and transformations, the final state shows what changed but loses why it changed. Reconstructing the cause afterward runs expensive and often ambiguous — the diff is legible, the intent behind it is gone.

**Move.** Capture provenance at the causal event and carry it forward with the resulting change. Prefer provenance you can check for completeness, so a missing link becomes a finding rather than an accepted blind spot.

[ref:fig-move08] follows an identity minted at the cause through to the reconstructed why.

<!-- label: fig-move08 -->
<!-- figure: assets/c8-cause-travels-with-consequence.svg | *Cause travels with consequence.* A cause mints an identity; the identity rides action to change to artifact; from the final artifact the identity lets a reader reconstruct why, not just what. -->

**Example — Agent changes.** Agent-side provenance mints a typed caused-by relation connecting a change to its originating task or reason, then gates that relation at commit. The provenance travels with the work instead of leaving a later investigator to infer intent from the diff. The reason is recorded where and when it is still known.

**Example — Artifact remediation.** Document mutation uses a different carrier. Individual mutators stamp their changes, and tooling reconstructs a changelog from those stamps. A wiring lint fails when a sanctioned mutation verb lacks attribution. Provenance completeness becomes an engineering invariant the build enforces, not a convention a busy author can quietly skip.

**Explore:** Caused-by provenance · Per-mutator attribution stamps · Derive-changelog · The `a11y_` inserted-artifact convention · F10 mutator-stamp-wiring lint. (MAGE Mechanism Catalog.)
