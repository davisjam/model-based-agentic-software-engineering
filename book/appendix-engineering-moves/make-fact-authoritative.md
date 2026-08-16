**Problem.** Consequential facts are duplicated across consumers. A service relationship may appear in deployment configuration, policy, documentation, and tests; a timeout may appear in callers, workers, and orchestration. Once those copies can change independently, disagreement becomes a normal system state.

**Move.** Choose one machine-readable representation as the authoritative source of the fact. Downstream consumers should query it or derive from it rather than maintain independently editable copies.

[ref:fig-move01] contrasts the two states.

<!-- label: fig-move01 -->
<!-- figure: assets/c1-make-fact-authoritative.svg | *One authoritative representation.* BEFORE — copies A, B, C each feed a consumer and can drift apart, so disagreement is possible. AFTER — one authoritative representation, with A, B, C derived or queried from it, so disagreement becomes detectable or impossible. -->

**Example — Service policy.** DocAble represents permitted service flows in a structured service model. Network policy and wiring derive from that model rather than maintaining independent accounts of permitted communication. A service relationship is authored once and propagated to its consumers.

**Example — Timeout ordering.** Scattered wall-clock budgets are represented in one timeout-budget model whose nesting relation is checked mechanically. The model exposes an ordering property—inner budgets must fit inside outer ones—that would otherwise remain distributed across implementations.

**Explore:** Service-flow / API model · Executable Source of Truth · Model-driven codegen · Timeout-budget ordering model · Required-configuration-per-role manifest · Synchronization model. (MAGE Mechanism Catalog.)
