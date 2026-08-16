**Problem.** A model becomes dangerous when engineers and agents continue to trust it after it no longer corresponds to the system it represents.

**Move.** Treat correspondence as an invariant. Check both that reality still satisfies modeled claims and that consequential implementation elements have not appeared outside the model's declared scope.

[ref:fig-move03] shows the two directions.

<!-- label: fig-move03 -->
<!-- figure: assets/c3-bidirectional-correspondence.svg | *Correspondence runs both ways.* A two-way loop joins MODEL and REALITY. One arrow asks whether reality still satisfies the model, catching a wrong modeled fact; the other asks whether something important appeared outside the model, catching unmodeled reality. -->

**Example — Architecture drift.** A component-and-zone model declares where code belongs and which dependencies it may take. A gate compares the declared architecture against the imports the implementation actually makes. A change that violates the modeled structure surfaces as a build finding at commit time.

**Example — Governance coverage.** The same correspondence idea runs the other way. An orphan-coverage walk starts from code and asks what model or control governs it. The uncovered remainder is not automatically incorrect; it identifies implementation surfaces that currently sit outside the represented governance estate and require an explicit decision.

**Explore:** Component & zone model · Drift & parity gates · Cross-source coherence lints · Orphan-coverage metric · Symbol-anchored traceability. (MAGE Mechanism Catalog.)
