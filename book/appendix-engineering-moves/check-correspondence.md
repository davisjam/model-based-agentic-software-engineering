**Problem.** A useful model earns trust. That makes a stale model more dangerous, not less: engineers and agents reason with confidence from a representation that no longer describes the system. The better the model, the harder its lies land.

**Move.** Treat correspondence as an invariant. Check that modeled claims stay true of reality, and that consequential reality has not slipped outside the model's declared scope. Run the check in both directions.

[ref:fig-move03] shows the two directions the check must run.

<!-- label: fig-move03 -->
<!-- figure: assets/c3-bidirectional-correspondence.svg | *Correspondence runs both ways.* A two-way loop joins MODEL and REALITY. One arrow asks whether reality still satisfies the model, catching a wrong modeled fact; the other asks whether something important appeared outside the model, catching unmodeled reality. -->

**Example — Architecture drift.** A component-and-zone model declares where code belongs and which dependencies it may take. A gate compares the declared architecture against the imports the implementation actually makes. A change that violates the modeled structure surfaces as a build finding, caught at the commit rather than in a future architecture review that may never happen.

**Example — Governance coverage.** The same correspondence idea runs the other way. An orphan-coverage walk starts from code and asks what model or control governs it. The uncovered remainder is not automatically wrong. It stands as a visible claim that some implementation surface currently sits outside the represented governance estate, waiting for a decision.

**Explore:** Component & zone model · Drift & parity gates · Cross-source coherence lints · Orphan-coverage metric · Symbol-anchored traceability. (MAGE Mechanism Catalog.)
