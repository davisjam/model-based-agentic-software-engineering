## The Capability

**Turn recurring failures and judgments into durable engineering structure while keeping the control machinery legible.** Model how controls relate, expose gaps and coupling, and convert recurring failures into new or stronger controls.

## When This Stack Earns Its Keep

Reach for it when:

- **The controls have grown their own complexity** — they overlap, depend on one another, go stale, and
  carry blast radius nobody has mapped.
- **The same failure keeps recurring**, and each fix is a one-off patch rather than a durable control.
- **Lessons live in institutional memory** instead of in the environment, so they leave when the person who
  learned them does.

## The Composition

<!-- label: governance-conversion-stack -->
<!-- figure: assets/governance-conversion-stack.svg | The governance-conversion composition, a loop. The CONTROL MACHINERY — rules, gates, models, sensors — is inspected and queried to expose GAPS / COUPLING: where control is weak, stale, or entangled. When a failure recurs there, INTERPRET converts the failure class into a durable control, and UPDATE MACHINERY folds it in; a solid feedback edge returns to the machinery for the next iteration. The four moves form the load-bearing loop. -->

## Constituent Moves

| Move | Role |
|---|---|
| **MODEL** | Make the control machinery explicit — rules, gates, models, sensors. |
| **EXPOSE** | Query the machinery for gaps, staleness, and coupling. |
| **CONVERT** | Interpret a recurring failure class into a new or strengthened control. |
| **UPDATE** | Fold the control back into the machinery; the model changes with it. |

## Why These Travel Together

As a governed environment grows, its controls overlap, depend on one another, go stale, and acquire blast radius. Eventually the control machinery itself becomes difficult to reason about. When that happens, model it explicitly.

Once the machinery is explicit, interpret recurring failures against it. A failure worth converting becomes a new or stronger mechanism, and the machinery model updates with it. This creates engineering capital: the environment changes so future work no longer depends on someone remembering the lesson. Rule registries, dependency graphs, indexes, and metadata are possible implementations.

**Mechanisms:** control census · control-dependency graph · governance conversion
