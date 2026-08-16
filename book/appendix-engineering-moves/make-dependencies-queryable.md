**Problem.** Cross-cutting mechanisms depend on assumptions about the substrate they inspect. When those dependencies remain implicit, a substrate change can either break many controls at once or silently invalidate part of their coverage.

**Move.** Represent consequential dependencies explicitly so the impact of a proposed change can be queried before it lands.

[ref:fig-move10] fans a change out to its dependents.

<!-- label: fig-move10 -->
<!-- figure: assets/c10-dependencies-queryable.svg | *Impact as a graph query.* A proposed change reaches a substrate node; typed dependency edges identify the controls and models that depend on it, and their union defines the affected set. -->

**Example — Control blast radius.** Each control declares its substrate dependencies as structured metadata. A query identifies which controls depend on a proposed substrate change and how each relation should be interpreted.

**Example — Traceability.** Symbol-anchored traceability applies the same move across engineering artifacts. Model elements, lints, code, proofs, and registries join through derived, re-checked edges. The resulting graph supports both change-impact analysis and review by making those dependencies queryable.

**Explore:** Control ↔ substrate dependency · Computed Control Blast Radius · Governance Graph · Symbol-anchored traceability · Derived Traceability. (MAGE Mechanism Catalog.)
