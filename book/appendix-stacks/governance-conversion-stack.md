## The capability

**Turn recurring failure into durable engineering capital while keeping the control estate legible.** As controls accumulate, model their relationships and convert recurring failures into new or strengthened controls.

## When this stack earns its keep

Reach for it when:

- **The controls have grown their own complexity** — they overlap, depend on one another, go stale, and
  carry blast radius nobody has mapped.
- **The same failure keeps recurring**, and each fix is a one-off patch rather than a durable control.
- **Lessons live in institutional memory** instead of in the environment, so they leave when the person who
  learned them does.

## The composition

<!-- label: governance-conversion-stack -->
<!-- figure: assets/governance-conversion-stack.svg | The governance-conversion composition, a loop. The CONTROL ESTATE — rules, gates, models, sensors — is inspected and queried to expose GAP / IMPACT: where control is weak or coupled. When a failure recurs there, INTERPRET converts the failure class into a durable control, and UPDATE ESTATE folds it in; a solid feedback edge returns to the estate for the next iteration. The four moves form the load-bearing loop. -->

## Constituent moves

| Move | Role |
|---|---|
| **MODEL** | Make the control estate explicit — rules, gates, models, sensors. |
| **EXPOSE** | Query the estate for gaps, staleness, and coupling. |
| **CONVERT** | Interpret a recurring failure class into a new or strengthened control. |
| **UPDATE** | Fold the control back into the estate; the model changes with it. |

## Why these travel together

As a governed environment grows, its controls overlap, depend on one another, go stale, and acquire blast radius. Eventually the control estate itself becomes difficult to reason about.

The answer is the move applied everywhere else in this material: model the thing that has become hard to
reason about. Once the control estate is explicit, a recurring failure can be interpreted against it — a
failure worth converting becomes a new or strengthened mechanism, and the model of the estate updates to
match.

This stack is most directly tied to engineering capital: once a recurring lesson changes the environment itself, future work no longer depends on someone remembering it. Rule registries, dependency graphs, indexes, and metadata are possible implementations of these moves.

**Mechanisms:** control census · control-dependency graph · governance conversion
**Deep dives:** companion web catalogue — the MAGE Mechanism Catalog.
