# Reflection-facet substrate (tempo-gated policy nudges)

**Intent** — Consolidate the operator's policy-reflection nudges into ONE tempo-gated substrate: a registry
of Template-Method **facets**, each reflecting the running context against a single repo-policy dimension it
*references* (never copies), the whole family emitting **at most one reflection per window**, so several
soft reflections can't compound into the alarm fatigue that would kill them all (our instance: a
`ReflectionFacet` base + facet registry with four facets over a shared turn-end window: failure→mechanism,
knowledge-routing, structural-drift, operations).

| | |
|---|---|
| Summary | Many policy-reflection nudges as one facet registry over a shared tempo budget — ≤1 emission/window. |
| Target | Agent · **Lifecycle & observability** |
| Form | `quality-gate` |
| Move | `package` — a constraint shipped with its sensors |
| Model | — |
| Enforcement | **Soft·Hard** — the reflections are *soft* (they aim the operator, default-silent, never block); the substrate is held *hard* — a closed-surface lint on every facet, a pointer-resolve lint on each facet's policy material, the ≤1-per-window budget gate, and per-firing telemetry on a measured leash |

*Its place in the environment — a **variant / known-use** of **Point-of-Action Policy Delivery**, under **MANAGE · Manage work, state, and resources**. Preserved here for its technical texture.*

## Motivation — the failure it kills

A single [lifecycle hook](lifecycle-hooks.md) that re-arms one omitted reflex is cheap and clear. The
trouble starts at the **second** one. Once you want the operator to reflect on more than one recurring
policy (*convert this recurrence into a mechanism*, *route this lesson to the right store*, *this looks like a
second copy*, *this runbook is stale*), the naive path is N independent hooks, each firing on its own event.

Three failures follow, and they compound:

- **Alarm fatigue kills the whole family.** N soft nudges a turn is noise; the operator learns to tune them
  *all* out, and every facet dies together, the tower-of-governance the nudges were meant to prevent.
- **The machinery duplicates.** Each hook re-implements the same tempo gate, default-silence bias, dedupe
  window, and telemetry: N twins that drift apart.
- **The policy rots inside the hook.** Each hook bakes its rule into a payload string, so when the canonical
  policy doc moves or changes, the nudge silently reflects a stale rule.

## Why it's not just "N lifecycle hooks"

This *is* [lifecycle hooks](lifecycle-hooks.md), built past the first one. The single hook is the
primitive: one script on one event. This is the **substrate you build on the second reflection hook**, and
it varies four named axes an independent hook can't:

- **A shared tempo budget.** All facets of a tempo class compete for **one** window's single reflection:
  round-robin, ≤1 emission per window across the whole family. N independent hooks each own their own window
  and cannot share a ceiling; only a substrate can cap the *aggregate*.
- **A closed specialization surface.** A facet is a Template-Method subclass that fills exactly the
  sanctioned virtual steps and touches nothing else; it *cannot* re-implement or bypass the shared
  tempo / silence / telemetry machinery. A lint enforces the closed surface, so uniformity holds by
  construction rather than by each hook author re-deriving it.
- **Policy by reference, not by copy.** Each facet declares a *pointer* into the canonical policy material
  (a resolvable `path#anchor`), and a lint verifies every pointer resolves. A moved policy doc trips the
  lint instead of rotting inside a hook string: single-source, not N snapshots.
- **A typed facet registry + a measured leash.** One place says which facets exist (a typed key set, not
  free strings); per-firing telemetry and a yield query make a dead or over-firing facet *visible*.

A single hook works, for exactly one reflex. Add a second and the independent-hook path starts
destroying itself: N nudges a turn, N copies of the tempo machinery, N policy strings rotting in place.
The consolidation into a registry over one shared budget is the mechanism, and it earns its keep the
moment there is a second soft reflection to hold.

## Mechanism

- **A Template-Method base fixes the algorithm.** The reflect sequence is `final`: *classify* (is this
  facet's moment?) → *snapshot* (read the substrate into a frozen, I/O-free payload) → *check policy* (does
  the context clearly warrant a reflection, biased hard toward silence) → *build payload* (word the
  conservative nudge, or decline) → *route follow-up*. A facet overrides only the virtual steps and declares
  four properties: its key, its tempo (which event makes it eligible), its policy-material pointer(s), and
  the closed vocabulary of follow-ups it may emit.
- **A registry + a shared emitter enforce the budget.** Facets self-register into a typed registry. The
  emitter, bound to a lifecycle event, enumerates the facets of that tempo class, round-robins among them,
  and emits **at most one** reflection per window: the anti-overwhelm ceiling the family shares.
- **Follow-ups are a closed vocabulary.** A non-silent result routes one of a fixed set (inject the nudge,
  surface a question to the user, add to a standing backlog), and a facet emitting a follow-up it never
  declared fails loud, not silently.
- **The substrate is measured.** A per-firing log plus a yield query correlate each facet's firings against
  the action it was meant to provoke (see the [measured leash](lifecycle-hooks.md)), so the family lives on
  an evidence leash: over-fire or near-zero yield → pull the facet.

## Prerequisites

- **The single-hook primitive.** A runtime with lifecycle-event hooks for the emitter to bind to
  ([lifecycle-hooks](lifecycle-hooks.md)).
- **A canonical, referenceable policy corpus.** The docs or registries each facet points at, with a
  resolvable ref grammar, so a facet can *reference* its rule rather than restate it.
- **More than one reflection policy worth nudging.** A single facet does not need a registry or a shared
  budget; the substrate earns its keep at the *second* facet (extract-on-the-second-site). Built for one
  nudge, it is pure overhead.

## Consequences & costs

- **Facets compete for the window.** The shared budget means no facet is guaranteed to fire on every
  eligible event: a busy tempo class round-robins. That is the anti-overwhelm working, but it trades
  per-facet promptness for aggregate calm.
- **The closed surface is a real constraint.** A facet that genuinely needs a new capability can't hack it
  locally: it needs a new *declared* virtual on the base. Deliberate (it keeps every facet uniform), but it
  makes the base a coordination point.
- **It is over-engineering at N=1.** The registry, the Template Method, and the shared budget are all
  overhead until there are at least two facets to consolidate; do not stand it up speculatively.

## Known uses

- A `ReflectionFacet` Template-Method base + a typed facet registry, with four facets on it: *failure→mechanism*
  (convert a recurring failure into a mechanism), *knowledge-routing* (a lesson belongs in memory vs a durable
  runbook), *structural-drift* (a second copy, i.e. DRY), *operations* (a runbook/playbook gap). Two are
  built, two interface-ready.
- A shared turn-end emitter that round-robins the facets of a tempo class and emits ≤1 reflection per window;
  a separate memory-write emitter for the routing facet.
- A closed-surface lint (each facet implements exactly the sanctioned steps), a pointer-resolve lint (every
  facet's policy-material pointer resolves), and a per-firing telemetry log + yield query (the measured
  leash). The facet registry is itself modeled as a typed node behind a drift gate (model = territory).
- A runnable, portable form of the whole substrate ships as a stdlib-only, copy-and-adapt library with this
  catalogue's operating skill: the Template-Method base, the once-per-window emitter, two generic example
  facets, and the measured-leash query. It is the runnable complement to the pattern described here.

## Related mechanisms

- **Generalization** — [lifecycle-hooks](lifecycle-hooks.md): the single-hook primitive this is built on. That
  entry's *measured leash* is where the family's evidence discipline lives; this entry is the registry-of-
  facets you reach for once a *second* reflection hook appears and N independent nudges would fatigue.
- **Counterpart** — [dynamic-context-injection](../context-and-dispatch/dynamic-context-injection.md):
  injection pushes policy *into* an agent at entry (feed-forward); a reflection facet pulls the operator back
  to policy at tempo (feed-back). The per-facet policy-material pointer is the concrete form of "both are
  modalities over one policy source of truth."
- *See also* — [meta-model-consumption](../../models-bridge/system-models/meta-model-consumption.md): a facet
  *references* its canonical policy material through a resolved pointer rather than copying it: read-don't-
  hardcode applied to the reflection substrate.
