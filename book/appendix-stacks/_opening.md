A single mechanism often kills a single failure class. Engineering capabilities usually take more.

A provenance record tells us who changed an artifact. It cannot tell us whether every mutation was recorded.
A model externalizes an engineering fact, yet nothing in the model guarantees its consumers read the current
version, or that the implementation still matches it. A sensor detects a failure; detection alone does not
restore service. So mechanisms compose.

## What a stack is

An **engineering stack is a recurring composition of mechanisms that together provide a useful engineering
capability.** The definition is deliberately loose. These compositions are reference architectures, not
prescriptions — a different substrate may reach the same capability with fewer, different, or stronger
mechanisms. Some systems will need none of the stacks here; others will want variants this appendix never
shows.

That framing matters. Read "seven stacks" as a checklist of things to install and you have rebuilt the kind
of ontology this material works hard to avoid. The useful question is not

> Which stacks have I installed?

but

> What capability does the environment need, and which guarantees must compose to provide it?

The stacks that follow answer that question for seven recurring concerns.

## The seven, and how they relate

<!-- label: appendix-a-capability-map -->
<!-- figure: assets/appendix-a-capability-map.svg | Seven reference engineering stacks and their common relationships. The arrows show relationships among capabilities that recurred in one real system — not a required architecture, and not an adoption order. Resource mediation and context delivery sit detached at the bottom because they are useful independently of the other stacks. -->

The arrows record relationships that showed up in one real system. They are not architecture laws. Model
Coherence is not a mandatory floor the others rest on; resource mediation and context delivery earn their
keep on their own. Treat the map as a picture of how capabilities *can* reinforce one another, then compose
what your environment actually needs.

## Where to look

A mechanism addresses a specific engineering obligation or failure. A move names the transferable judgment
behind related mechanisms. A stack composes mechanisms into a reusable engineering capability. The stacks
together form a governed engineering environment.

This appendix starts from capabilities and works downward: what mechanisms must travel together to provide
one useful engineering property? Appendix B looks from the opposite direction. It starts with recurring
problems and uses worked examples to show how the same engineering move can produce different mechanisms in
different settings.

Appendix A stays above implementation detail on purpose. Each stack gets a capability, a composition diagram,
a compact table of its constituent moves, and an argument for why those guarantees depend on one another. The
individual mechanisms named in each stack are treated in full in the companion web catalogue.

## Why stacks exist

A stack is often what accumulated engineering capital looks like at capability scale. One failure may motivate
a sensor. Another may expose a bypass that warrants a gate. A third may reveal missing provenance that warrants
attribution. Mechanisms introduced separately, over time, can settle into a coherent architecture — because
the guarantees they provide come to depend on one another.

So mechanisms are the accumulated units of engineering capital, and a stack is the useful composition that
becomes visible once several of those units jointly provide a capability. That is the relationship to hold.
Not: the theory consists of seven stacks. Rather: stacks are what the theory's mechanisms compose into when
a capability needs more than one of them.
