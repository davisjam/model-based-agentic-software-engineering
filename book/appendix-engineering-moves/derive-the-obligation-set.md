**Problem.** Measures of existing evidence—tests written, lines covered, checks passing—cannot reveal obligations that were never encoded. Before measuring coverage, establish what evidence should exist.

**Move.** Derive what must be assured from the engineering model, then compare that required set with the evidence that exists.

[ref:fig-move04] traces the required set against the evidence.

<!-- label: fig-move04 -->
<!-- figure: assets/c4-derive-obligation-set.svg | *Required set minus present evidence.* The model derives what must be assured; that required set is compared against existing evidence; the intersection is covered, and the remainder is a gap that raises a finding. -->

**Example — Test obligations.** Structured models expose seams, failure edges, and invariants. Those elements generate a census of what should be tested. Compare that census with the existing suite, and every missing test becomes mechanically visible and can block the gate.

**Example — Governance obligations.** The same move applies to controls. When governance targets are explicit, the environment classifies controls by what they protect and surfaces every target with no control — or only advisory guidance. Here the evidence is governance mechanisms rather than tests, but the move is the same: derive the required set, compare it with what exists, and report what is missing.

**Related mechanisms:** Model-derived test-obligation census · Coverage → model-node mapping · Control-coverage census · Governance Graph · Journey-criticality → test-tier placement.
