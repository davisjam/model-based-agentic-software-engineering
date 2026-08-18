[ref:fig-h-lifecycle] places the product amid the engineering activities that shape it.

<!-- label: fig-h-lifecycle -->
<!-- figure: assets/h1-product-lifecycle.svg | *MAGE across the product lifecycle.* A software product is shaped through recurring engineering activities that ask different questions and therefore benefit from different purposeful representations. The horizontal sequence shows a dominant lifecycle flow, not a waterfall: operational experience, maintenance, assurance, and new product knowledge continually feed earlier activities. Assurance and compliance span the lifecycle because their obligations and evidence can originate in, constrain, and draw upon every other surface. MAGE can be applied to any surface independently. -->

The representations differ along five dimensions.

1. **Purpose.** Each representation is a purposeful reduction that preserves the information needed to answer a particular engineering question while suppressing detail the question does not need. A product hypothesis supports reasoning about what should be built; an architectural model supports reasoning about how a system should be structured; an incident timeline supports reasoning about what happened. They need not share a common form merely because they concern the same product.

2. **Lifetime.** Models can be episode-scoped, change-scoped, system-lived, or organizational. An experiment may last for one investigation; a ticket may govern one change; an architectural boundary may survive hundreds of changes; a regulatory policy may govern several products.

3. **Claimed correspondence.** Age alone does not establish model drift. A 2022 ticket can remain a faithful representation of the intent governing a 2022 change without describing the product in 2026. MAGE rejects “keep the model equal to the code” as a universal synchronization rule because different models claim different relations to the realized system.

4. **Authority.** Representation does not imply authority. A discovery hypothesis may deserve preservation without enforcement, while an accepted security invariant may deserve both. Modeling makes knowledge available for reasoning; Alignment determines what authority is received by selected obligations.

5. **Reasoning posture.** Some representations primarily support semantic and situational reasoning; others expose stable properties that can migrate into deterministic procedures or predicates. MAGE seeks neither maximal agent use nor maximal determinization, but an economical allocation among representations, autonomous reasoning, and mechanisms.

The five surfaces configure these dimensions differently. The sections that follow examine each in turn.
