## The capability

**Put the relevant engineering knowledge and obligations in front of an actor while they can still affect the
action.** Knowledge that arrives after the decision is worthless; this stack delivers the right slice of it
in time to matter.

## When this stack earns its keep

Reach for it when:

- **An actor must reason from engineering knowledge it does not carry** — models, rules, prior decisions.
- **The whole environment will not fit** in the actor's working horizon, so dumping all of it just relocates
  the navigation problem.
- **Some obligations are critical and decidable**, and leaning on the actor to remember them is not good
  enough.

## The composition

<!-- label: context-delivery-stack -->
<!-- figure: assets/context-delivery-stack.svg | The context-delivery composition. Engineering knowledge — models, rules, decisions — splits into a STANDING POLICY that is always seen and a TASK SLICE retrieved as needed; both feed the actor's context, which drives the action. A dashed POINT-OF-ACTION attachment reasserts important obligations at the moment of action, and for critical decidable obligations becomes a deterministic gate rather than a reminder. Solid path: the load-bearing composition. Dashed attachment: a useful enhancement, not required for the capability. -->

A small standing substrate the actor always sees, plus a task-specific slice retrieved on demand, both
delivered into the reasoning horizon — with a point-of-action reinforcement where obligations are softer, and
a hard gate where they are critical.

## Constituent moves

| Move | Role |
|---|---|
| **STANDING** | Supply compact policy that applies broadly. |
| **SLICE** | Retrieve the task-relevant model and engineering context. |
| **DELIVER** | Put that context into the actor's reasoning horizon. |
| **REINFORCE** | *(strengthens)* Reassert important obligations at the point of action where useful. |
| **GATE** | For critical decidable obligations, do not rely on delivery at all — enforce them. |

## Why these travel together

An actor cannot reason through knowledge it never sees. But loading the entire engineered environment into
every context only moves the navigation problem downstream — now the actor must find the relevant fact in a
wall of them.

So context delivery pairs a small standing substrate with task-specific retrieval. Point-of-action reminders
help with the softer obligations, the ones a nudge can carry. Critical decidable properties should graduate
out of delivery entirely and become deterministic controls. **That last transition is the essential one:
context is a reasoning aid, not authority.** Where a property can be decided and must hold, a gate enforces
it — a reminder never should.

Boot files, dynamic snippets, hooks, and nudges are today's implementations. The durable architecture is
standing knowledge, the relevant slice, and authority where it is warranted.

**Mechanisms:** standing context · dynamic context injection · point-of-action guidance
**Deep dives:** companion web catalogue — the MAGE Mechanism Catalog.
