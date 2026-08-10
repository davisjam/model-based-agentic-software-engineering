**A capability-architecture reference**

Design patterns solved recurring object-oriented design problems one pattern at a time. MAGE engineering stacks solve recurring agentic-engineering problems one capability at a time. A stack is larger than a mechanism: it is the smallest reusable architecture that reliably delivers an engineering capability. This appendix is not a catalog and not a pattern language — it is a capability-architecture reference.

**Three levels: pattern, stack, environment**

The appendix is built in three rungs, and it helps to name them before the stacks begin.

- A **pattern** removes one recurring failure.
- A **stack** assembles patterns into one reusable engineering capability.
- The **stacks together** form the governed engineering environment.

The appendices that follow are the first rung, one pattern per page. This appendix is the second: each stack is the capability a cluster of those patterns makes when they travel together. The nine capabilities and the dependency figure below are the third — the shape of the whole environment they compose.

**Stacks: mechanisms that travel together**

A single pattern in the appendices that follow kills one failure class. In practice, though, mechanisms arrive in *clusters* — a concept you want to adopt (model-based engineering, a self-operating orchestrator, an auditable format seam) is not one mechanism but several that reinforce each other. This appendix names those clusters. Each **stack** attaches to a concept, lists the mechanisms that make it up, and says which of them you can leave out.

A stack composes at a different grain than a `package` move. A **package** is composition *inside* one mechanism — a constraint shipped already welded to its own dedicated sensors, still one catalogue entry. A **stack** is composition *across* several distinct mechanisms — many entries that together make one governed capability. Both travel together; the package is the intra-mechanism weld, the stack the inter-mechanism cluster.

Every stack sorts its members into two kinds:

- **Mandatory** — the stack *fails* without this member. Model-based engineering needs both the typed models AND the drift control that keeps them equal to the code; adopt the models alone and you ship a map the fleet will trust while it quietly lies. A self-operating orchestrator needs its work-templates. These are the members you cannot skip without breaking the concept.
- **Complementary** — layers on top for extra value, not required for correctness. Dynamic context-injection can sit on top of a semantic-lint stack to *prevent* the violation the lint already *catches*; heartbeats sharpen an observability stack that already sees and responds. Worth adopting, but the stack stands without them.

**Mandatory members are load-bearing: without them the capability is not reliably achieved. Complementary members improve cost, ergonomics, or robustness, but they are not part of the minimal architecture.**

Each member links to its own pattern page in the appendices that follow. Read a stack to see which mechanisms you must adopt as a set, and which you can add later.
