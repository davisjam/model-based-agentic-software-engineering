# Agent mechanisms — governing the fleet

<!-- summary: Mechanisms that govern the agent fleet and the substrate that produces its work. -->

*One of three roles in the [catalogue](../README.md). Agent mechanisms govern the **fleet and the
substrate that produces work**: how briefs are composed, how agents are dispatched and isolated, how
their commits are gated and merged, how shared host compute is rationed, and how the fleet's lifecycle
is observed. (What the fleet reasons *through* is the [models-bridge](../models-bridge/); what it
*produces* is the [product](https://davisjam.github.io/model-based-agentic-software-engineering/product/).)*

## The five families — the path an agent's work travels

1. **[Context & dispatch substrate](context-and-dispatch/)** — what an agent *knows* and how it is
   *launched*: brief-linting, the rule index, dynamic context injection, role-typed dispatch.
2. **[Gates & merge-train](gates-and-merge-train/)** — the path-to-production **staircase**
   (pre-commit → sentinel → merge-train → deploy): defense in depth, each stair a backstop for the last.
3. **[Mediators & resource locks](mediators-and-resource-locks/)** — host-level wrappers that ration
   shared compute across concurrent worktrees, each enforced so the raw call is impossible.
4. **[Lifecycle & observability](lifecycle-and-observability/)** — live signal surfaces over the fleet:
   the agent-registry, the typed event bus, heartbeats, tombstones, the cron-alerts gate.
5. **[Governance-doc mechanisms](governance-doc-controls/)** — documentation treated as enforced
   infrastructure, including the **CLAUDE.md rule index** — the *meta-mechanism* that records and delivers
   every other mechanism.

## The pattern that recurs here

**Soft aims, hard holds.** Of the agent mechanisms, only [dynamic context
injection](context-and-dispatch/dynamic-context-injection.md) is purely *soft* (it injects context but
blocks nothing); two are *soft·hard* (a document kept honest by a lint); the rest are *hard*
deterministic gates. Probabilistic guidance is used to *aim* agents at the right work; deterministic
machinery *holds the line*. See the umbrella README's
[move and form axes](../README.md#two-independent-axes-move-and-form).

The census, forms, soft/hard axis, relationships, and entry template are documented once in the
[umbrella README](../README.md).
