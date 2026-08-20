[ref:fig-h-lifecycle] places the product amid the engineering activities that shape it.

<!-- label: fig-h-lifecycle -->
<!-- figure: assets/h1-product-lifecycle.svg | *MAGE across the product lifecycle.* Different lifecycle surfaces ask different engineering questions and therefore benefit from different representations. The horizontal flow is not a waterfall: experience and evidence feed earlier activities, while Assurance & Compliance spans the lifecycle. Each surface can adopt MAGE independently. -->

The representations differ along five dimensions.

1. **Purpose.** Each representation preserves what a particular engineering question needs. A product hypothesis helps decide what to build; an architectural model exposes system structure; an incident timeline reconstructs what happened. They need not share a form merely because they concern the same product.

2. **Lifetime.** A model may be episode-scoped, change-scoped, system-lived, or organizational. An experiment may last for one investigation; a ticket may govern one change; an architectural boundary may survive hundreds of changes; a regulatory policy may govern several products.

3. **Claimed correspondence.** Age alone does not establish model drift. A 2022 ticket can remain a faithful representation of the intent governing a 2022 change without describing the product in 2026. MAGE rejects “keep the model equal to the code” as a universal synchronization rule because different models claim different relations to the realized system.

4. **Authority.** Representation does not imply authority. A discovery hypothesis may deserve preservation without enforcement; an accepted security invariant may deserve both.

5. **Reasoning posture.** Some representations support semantic or situational judgment; others expose stable properties that can become deterministic procedures or predicates. The appropriate mix depends on cost and consequence.

The five surfaces configure these dimensions differently. The sections that follow examine each in turn.
