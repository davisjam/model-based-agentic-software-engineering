**Problem.** After work propagates through commits, generated artifacts, and transformations, the final state may preserve what changed while losing why it changed. Reconstructing causation afterward is expensive and often ambiguous.

**Move.** Capture provenance at the causal event and carry it forward with the resulting change. Where possible, check it for completeness so missing links are detected.

[ref:fig-move08] follows the identity from cause to consequence.

<!-- label: fig-move08 -->
<!-- figure: assets/c8-cause-travels-with-consequence.svg | *Cause travels with consequence.* A cause mints an identity; the identity rides action to change to artifact; from the final artifact the identity lets a reader reconstruct why, not just what. -->

**Example — Agent changes.** When an agent makes a change, the environment records a typed caused-by relation to the originating task or reason and requires that relation at commit. The reason is recorded at the causal event rather than inferred later from the diff.

**Example — Artifact remediation.** Document mutation uses a different carrier. Individual mutators stamp their changes, and tooling reconstructs a changelog from those stamps. A wiring lint fails when a sanctioned mutation verb lacks attribution. Provenance completeness becomes a build-enforced invariant rather than a convention.

**Related mechanisms:** Caused-by provenance · Per-mutator attribution stamps · Derive-changelog · The `a11y_` inserted-artifact convention · F10 mutator-stamp-wiring lint.
