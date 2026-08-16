A single mechanism often kills a single failure class. Engineering capabilities usually take more.

A provenance record tells us who changed an artifact. It cannot tell us whether every mutation was recorded.
A model externalizes an engineering fact, yet nothing in the model guarantees its consumers read the current
version, or that the implementation still matches it. A sensor detects a failure; detection alone does not
restore service. So mechanisms compose.

## What a stack is

An **engineering stack is a recurring composition of mechanisms that together provide a useful engineering
capability.** The stacks here are reference architectures, not prescriptions: a different substrate may
provide the same capability with fewer, different, or stronger mechanisms.

Start with the capability rather than the stack:

> What capability does the environment need, and which guarantees must compose to provide it?

The seven stacks that follow answer that question for recurring engineering concerns.

## The seven, and how they relate

<!-- label: appendix-a-capability-map -->
<!-- figure: assets/appendix-a-capability-map.svg | Seven reference engineering stacks and their common relationships. Arrows show relationships among capabilities that recurred in one system, not a required architecture or adoption order. Resource Mediation and Context Delivery are shown separately because they provide useful capabilities independently. -->

## Where to look

A mechanism addresses a specific engineering obligation or failure. A move names the transferable judgment
behind related mechanisms. A stack composes mechanisms into a reusable engineering capability. The stacks
together form a governed engineering environment.

This appendix starts from capabilities and works downward: which mechanisms must travel together to provide
one useful engineering capability? Appendix B starts from recurring problems and shows how the same
engineering move can produce different mechanisms in different settings. Each stack here gives its
capability, composition, constituent moves, and the dependencies among its guarantees. Implementation
details appear in the companion web catalogue.

## Why stacks exist

A stack is often what accumulated engineering capital looks like at capability scale. One failure may motivate
a sensor. Another may expose a bypass that warrants a gate. A third may reveal missing provenance that warrants
attribution. Mechanisms introduced separately, over time, can settle into a coherent architecture — because
the guarantees they provide come to depend on one another.

Mechanisms are units of accumulated engineering capital; a stack is their composition when a capability requires several guarantees.
