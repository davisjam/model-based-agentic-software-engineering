**Problem.** Cross-cutting mechanisms encode assumptions about the substrate they inspect. Those assumptions stay invisible until the substrate changes — at which point a control may fail everything at once or, worse, silently stop checking part of the system while still reporting green.

**Move.** Represent the consequential dependencies explicitly enough that change impact can be queried before the change lands.

[ref:fig-move10] fans a proposed change out to its dependents to compute the blast radius.

<!-- label: fig-move10 -->
<!-- figure: assets/c10-dependencies-queryable.svg | *Impact as a graph query.* A proposed change hits a substrate node; edges fan out to the controls and models that depend on it — one blocks, one is neutral, one derives from it — and the union is the computed blast radius. -->

**Example — Control blast radius.** Each control declares the substrate assumption it relies on as structured metadata. A query then computes which controls depend on a proposed substrate change and how each interprets it. "What will this migration invalidate?" turns into a graph query instead of a grep-and-read exercise that misses the control nobody remembered.

**Example — Traceability.** Symbol-anchored traceability applies the same move across engineering artifacts. Model elements, lints, code, proofs, and registries join through derived, re-checked edges. The resulting graph makes otherwise implicit dependencies navigable — usable both for change-impact analysis and for review, where the question "what rests on this?" now has an answer.

**Explore:** Control ↔ substrate dependency · Computed Control Blast Radius · Governance Graph · Symbol-anchored traceability · Derived Traceability. (MAGE Mechanism Catalog.)
