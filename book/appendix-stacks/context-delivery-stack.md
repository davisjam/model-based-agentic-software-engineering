## The Capability

**Put relevant engineering knowledge and obligations into the actor's context before the decision they must inform.**

## When This Stack Earns Its Keep

Reach for it when:

- **An actor must reason from engineering knowledge it does not carry** — models, rules, prior decisions.
- **The whole environment will not fit** in the actor's working state, and dumping all of it into context merely relocates
  the navigation problem.
- **Some obligations are critical and decidable**, and leaning on the actor to remember them is not good
  enough.

## The Composition

<!-- label: context-delivery-stack -->
<!-- figure: assets/context-delivery-stack.svg | The context-delivery composition. Engineering knowledge — models, rules, decisions — splits into a STANDING POLICY that is always seen and a TASK SLICE retrieved as needed; both feed the actor's context, which drives the action. A dashed POINT-OF-ACTION attachment reasserts important obligations at the moment of action, and for critical decidable obligations becomes a deterministic gate rather than a reminder. Solid path: the load-bearing composition. Dashed attachment: a useful enhancement, not required for the capability. -->

## Constituent Moves

| Move | Role |
|---|---|
| **STANDING** | Supply compact policy that applies broadly. |
| **SLICE** | Retrieve the task-relevant model and engineering context. |
| **DELIVER** | Put that context into the actor's reasoning horizon. |
| **REINFORCE** | *(strengthens)* Reassert important obligations at the point of action where useful. |
| **GATE** | For critical decidable obligations, do not rely on delivery at all — enforce them. |

## Why These Travel Together

An actor cannot reason through knowledge it never sees. But loading the entire engineered environment into every context only moves the navigation problem downstream: now the actor must find the relevant fact in a wall of them. Context delivery therefore combines compact standing policy with task-specific retrieval.

Point-of-action reminders can reinforce obligations that still require judgment. Critical decidable obligations should instead become deterministic controls: context is a reasoning aid, not authority. Boot files, dynamic snippets, hooks, and nudges are current implementations; the portable pattern is standing policy, task-specific retrieval, and deterministic enforcement where warranted.

**Mechanisms:** standing context · dynamic context injection · point-of-action guidance
