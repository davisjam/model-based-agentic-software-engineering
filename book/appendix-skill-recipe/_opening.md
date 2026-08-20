**Modeling a domain for an agent**

Skills come in two broad kinds. A *tool-skill* gives an agent access to a capability: a CLI, API, MCP server, or other tool. A *mastery-skill* gives an agent a way to reason about a domain: the abstractions, distinctions, and engineering judgment an experienced engineer would bring to the work.

This appendix focuses on mastery-skills.

Tool-skill guidance is necessarily more provisional. The mechanisms by which agents discover and invoke tools continue to evolve — from command-line wrappers and vendor-specific tool interfaces to MCP and whatever follows them. Current platform documentation is therefore the right source for the mechanics of packaging a tool for an agent. The durable problem is not how today's agent calls a tool, but how to represent what an engineer knows so an agent can reason through it.

Much engineering knowledge begins in an inconvenient form: an experienced engineer knows how to do something. The knowledge may be scattered across conventions, examples, repeated instructions, documentation, and judgment acquired through practice. Giving an agent more instructions does not necessarily give it a model of the domain.

Writing a mastery-skill makes that knowledge explicit. Identify the domain's fundamental model, separate it into orthogonal facets, and connect them with a governing principle. The result is a model an agent can load and reason through. This is Modeling in miniature: make engineering knowledge explicit so the agent does not have to reconstruct it.

A mastery-skill remains a soft mechanism. It can teach an agent how to reason and guide the choices it makes; it cannot guarantee that the agent follows that guidance. Where a property must hold, encode it in Alignment: constraints, types, validators, gates, or other mechanisms that do not depend on agent cooperation.

The three mastery-skills introduced earlier in the book provide the worked examples: self-communicate models how the fleet communicates, self-governance how it applies the engineering method to its own work, and self-operate how it runs its operational lifecycles. Despite their different domains, all three were constructed in the same way: find the domain's fundamental model, layer independent facets onto it, and tie them together with a governing principle.

[Chapter 1](appendix-e-theory.html) gives the construction method and quality bar; [Chapter 2](appendix-e-applying-the-recipe.html) applies them to the three skills. By the end, you should be able to recognize when a mastery-skill is appropriate, extract a model from recurring engineering judgment, and package that model so an agent can reason through it.
