A single mechanism can eliminate one failure class. A useful engineering capability often requires several mechanisms.

A provenance record tells us who changed an artifact, but not whether every mutation was recorded.
A model can make an engineering fact explicit, but nothing guarantees that consumers read the current
version or that the implementation still matches it. A sensor detects a failure; detection alone does not
restore service. So mechanisms compose.

## What a Stack Is

An **engineering stack is a recurring set of mechanisms that together provide a useful engineering
capability.** The stacks here are reference architectures, not prescriptions: a different substrate may
provide the same capability with fewer, different, or stronger mechanisms.

Start with the capability:

> What must the environment be able to do, and which guarantees are required to make that claim true?

The seven stacks that follow answer that question for recurring engineering concerns.

## The Seven, and How They Relate

<!-- label: appendix-a-capability-map -->
<!-- figure: assets/appendix-a-capability-map.svg | Seven reference engineering stacks and their common relationships. Arrows show relationships among capabilities that recurred in one system, not a required architecture or adoption order. Resource Mediation and Context Delivery are shown separately because they provide useful capabilities independently. -->

## Where to Look

A mechanism addresses a specific obligation or failure. A move names the transferable engineering judgment
behind related mechanisms. A stack combines mechanisms into a reusable capability. Together, the stacks
contribute to a governed engineering environment.

This appendix starts from a capability and asks which mechanisms must work together to provide it. Appendix
B starts from recurring problems and shows how the same engineering move can produce different mechanisms in
different settings. Each stack gives its capability, constituent moves, dependencies, and load-bearing
composition. Concrete implementations of these moves appear in the companion MAGE Mechanism Catalog.

## Why Stacks Exist

A stack is one form engineering capital can take when several mechanisms are needed to provide a capability.
One failure may motivate a sensor. Another may expose a bypass that warrants a gate. A third may reveal
missing provenance that warrants attribution. Mechanisms introduced separately can eventually depend on one
another strongly enough to form a coherent stack.
