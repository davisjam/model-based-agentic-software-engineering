*Which recurring failures are still waiting to become infrastructure?*

Every recurring failure recognized as a class, converted into a mechanism, then retired from human attention
for good. Read the pipeline, not a rate: the state that matters is not how fast conversions happen but which
classes are still waiting — a failure that has recurred three times and nobody has converted it.

Where engineering capital asks whether the stock is growing, this card shows the engine that grows it: the
failure-to-mechanism-to-retired-forever pipeline.

Healthy direction: the Observed and Classified queues stay short — failures convert into infrastructure faster
than new classes appear.
*DocAble reference:* controls accreted 0 → 747 lints, 0 → 102 gates — one observed run; each control is one
class that stopped recurring.

### What to read

- **The three queues.** Where each recurring failure sits: seen but unnamed, named but not yet built, or converted into a durable control.
- **Oldest unresolved class.** The failure that has recurred longest without a mechanism — the next conversion owed.

```
  GOVERNANCE CONVERSION   "Which failures are still waiting to become infrastructure?"
  ──────────────────────────────────────────────────────────────────────────────────
  Observed    ▸ failures seen recurring, not yet named as a class
  Classified  ▸ recognized as one structural class, mechanism not yet built
  Converted   ▸ lint / gate / typed seam / test — retired from human attention
  ──────────────────────────────────────────────────────────────────────────────────
  Oldest unresolved class → the failure that has recurred longest un-converted
```

### The soft-gap read

The **conversion queues** are a ratified soft-gap — a rich loop-and-hypothesis construct with no declared rate
metric. Read green / yellow / red: green when classes convert steadily and the Observed queue stays short; red
when the same failures recur un-converted. Anchor it on the control-growth proxy, never a fabricated rate.

### What this projects

The *governance-conversion* concept — the loop by which the environment evolves, each recurring failure
converted into a durable mechanism (see [Chapter 3.4](3.4-governance-conversion.html)) — plus the
governance-adaptation loop, the failure-class-exposure hypothesis (how fast a class is recognized), and the
conversion-conditions hypothesis (conversions stick when diagnosis capability and change authority sit together).
