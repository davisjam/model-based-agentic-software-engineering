**Problem.** Teams measure the evidence they happen to hold: tests written, lines covered, checks passing. None of those quantities can reveal an obligation nobody thought to encode. A count of what exists says nothing about what should. Assurance gets stronger when the system can first state what evidence ought to exist.

**Move.** Derive the assurance obligation from the engineering representation, then compare the required set against the evidence actually present.

[ref:fig-move04] traces the required set past the evidence to the gap it exposes.

<!-- label: fig-move04 -->
<!-- figure: assets/c4-derive-obligation-set.svg | *Required set minus present evidence.* The model derives what must be assured; that required set is compared against existing evidence; the intersection is covered, and the remainder is a gap that raises a finding. -->

**Example — Test obligations.** Structured models expose seams, failure edges, and invariants. Those elements generate a census of what should be tested. Matching the census against the existing suite turns "we forgot to test this modeled obligation" from a silent hole into a mechanically visible gap that a gate can name.

**Example — Governance obligations.** The same move applies to controls. When governance targets are explicit, the environment classifies controls by what they protect and surfaces every target with no control — or only advisory guidance. The artifact being counted has shifted from tests to governance mechanisms. The move has not: derive the obligation, subtract the evidence, report the difference.

**Explore:** Model-derived test-obligation census · Coverage → model-node mapping · Control-coverage census · Governance Graph · Journey-criticality → test-tier placement. (MAGE Mechanism Catalog.)
