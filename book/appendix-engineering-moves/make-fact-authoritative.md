**Problem.** Consequential facts scatter because several consumers need them. A service relationship shows up in deployment config, in policy, in docs, and in tests; a timeout shows up in callers, workers, and orchestration. Once several copies can change on their own, disagreement stops being an incident and becomes an ordinary system state.

**Move.** Choose one representation to carry the fact, make it machine-readable, and derive the consequential consumers from it. Make the authority architectural, not conventional — downstream artifacts should have less freedom to disagree than upstream intent grants them.

[ref:fig-move01] contrasts the scattered before-state with the single-authority after-state.

<!-- label: fig-move01 -->
<!-- figure: assets/c1-make-fact-authoritative.svg | *One authoritative representation.* BEFORE — copies A, B, C each feed a consumer and can drift apart, so disagreement is possible. AFTER — one authoritative representation, with A, B, C derived or queried from it, so disagreement becomes detectable or impossible. -->

**Example — Service policy.** DocAble represents permitted service flows as a structured service model. Network policy and wiring generate from that representation rather than living as independent accounts of which services may talk. A service relationship becomes an engineering fact with downstream consequences, not a convention several artifacts must each remember and keep aligned by hand.

**Example — Timeout ordering.** A second instance governs time, not architecture. Scattered wall-clock budgets collapse into one timeout-budget model whose nesting relation gets checked mechanically. The representation does more than document the timeouts. It exposes an ordering property — inner budgets must fit inside outer ones — that would otherwise stay smeared across implementations and untested.

**Explore:** Service-flow / API model · Executable Source of Truth · Model-driven codegen · Timeout-budget ordering model · Required-configuration-per-role manifest · Synchronization model. (MAGE Mechanism Catalog.)
