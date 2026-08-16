## The capability

**Put relevant engineering knowledge and obligations in front of an actor while they can still affect the action.** Deliver the relevant subset into the actor's reasoning horizon before the decision it must inform.

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

Context delivery pairs a small standing substrate with task-specific retrieval. Point-of-action reminders can reinforce obligations that remain matters of judgment. Critical decidable obligations should instead become deterministic controls. **Context is a reasoning aid, not authority.**

Boot files, dynamic snippets, hooks, and nudges are current implementations. The portable structure is standing knowledge, task-specific retrieval, and deterministic authority where warranted.

**Mechanisms:** standing context · dynamic context injection · point-of-action guidance
**Deep dives:** companion web catalogue — the MAGE Mechanism Catalog.
