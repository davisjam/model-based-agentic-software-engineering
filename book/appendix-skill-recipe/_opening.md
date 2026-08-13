**Modeling a domain for an agent**

Skills come in two broad kinds. A *tool-skill* gives an agent access to a capability: a CLI, API, MCP server, or other tool. A *mastery-skill* gives an agent a way to reason about a domain: the abstractions, distinctions, and engineering judgment it should bring to the work.

This appendix focuses on mastery-skills.

Tool-skill guidance is necessarily more provisional. The mechanisms by which agents discover and invoke tools continue to evolve — from command-line wrappers and vendor-specific tool interfaces to MCP and whatever follows them. Current platform documentation is therefore the right source for the mechanics of packaging a tool for an agent. The durable engineering problem is not how today's agent calls a tool. It is how to represent what an engineer knows so that an agent can reason through it.

That is a MAGE modeling activity.

Much engineering knowledge begins in an inconvenient form: an experienced engineer knows how to do something. The knowledge may be scattered across conventions, examples, repeated instructions, documentation, and judgment acquired through practice. Giving an agent more instructions does not necessarily give it a model of the domain.

Writing a mastery-skill makes that knowledge explicit. You identify the fundamental abstraction through which the domain makes sense, separate the domain into independent facets, and connect those facets with a governing principle. The result is a representation an agent can load and reason through. In miniature, this is the Modeling activity from the rest of MAGE: externalizing engineering knowledge into models that extend the agent's reasoning horizon.

A mastery-skill remains a soft mechanism. It can teach an agent how to reason and guide the choices it makes; it cannot guarantee that the agent follows that guidance. Where a property must hold, the corresponding knowledge must cross into Alignment: constraints, types, validators, gates, or other mechanisms that do not depend on agent cooperation.

The three mastery-skills introduced earlier in the book provide the worked examples. They model how the fleet communicates, how it governs its engineering environment, and how it operates itself. Despite their different domains, all three were constructed in the same way: find the domain's fundamental model, layer independent facets onto it, and tie them together with a governing principle.

This appendix turns that pattern into a construction method. [Chapter 1](appendix-e-theory.html) states the method and its quality bar; [Chapter 2](appendix-e-applying-the-recipe.html) applies it to the three skills. Read the [Skills chapter](4.5-packaging-the-method-as-skills.html) for what those skills *do*; read on here for how they were *built*. By the end, you should be able to recognize when a mastery-skill is appropriate, extract a model from recurring engineering judgment, and package that model so an agent can reason through it.
