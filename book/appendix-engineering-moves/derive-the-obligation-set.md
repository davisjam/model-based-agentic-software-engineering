**Problem.** Measures of existing evidence—tests written, lines covered, checks passing—cannot reveal obligations that were never encoded. Assurance requires first establishing what evidence should exist.

**Move.** Derive the required assurance obligations from the engineering representation, then compare that set with the evidence present.

[ref:fig-move04] traces the required set against the evidence.

<!-- label: fig-move04 -->
<!-- figure: assets/c4-derive-obligation-set.svg | *Required set minus present evidence.* The model derives what must be assured; that required set is compared against existing evidence; the intersection is covered, and the remainder is a gap that raises a finding. -->

**Example — Test obligations.** Structured models expose seams, failure edges, and invariants. Those elements generate a census of what should be tested. Comparing the census with the existing suite makes each uncovered modeled obligation mechanically visible and available to a gate.

**Example — Governance obligations.** The same move applies to controls. When governance targets are explicit, the environment classifies controls by what they protect and surfaces every target with no control — or only advisory guidance. The evidence type has changed from tests to governance mechanisms; the move is the same: derive the required set, compare it with present evidence, and report the remainder.

**Explore:** Model-derived test-obligation census · Coverage → model-node mapping · Control-coverage census · Governance Graph · Journey-criticality → test-tier placement. (MAGE Mechanism Catalog.)
