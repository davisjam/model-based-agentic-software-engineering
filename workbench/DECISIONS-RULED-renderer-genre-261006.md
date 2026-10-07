# Ruled: adopt the UML notation; keep dagre + the in-house painter (renderer genre check)

**Date:** 261006. **Trigger:** the author, on being told the capacity bound lives in a transition
guard the picture withholds: *"If there are guards etc. we need a richer visual notation"*, and
*"This is probably the cue to use a Mermaid renderer or something … are we currently hand-rendering?
if so, not a good choice at this point."*

## The question, split on its real axis

"Use Mermaid" bundles two different adoptions. The **notation** — UML's `event [guard] / effect`
transition text, which is also exactly Mermaid's `stateDiagram-v2` label syntax — and the
**runtime** — Mermaid painting the SVG. The genre check evaluates each on its own.

## What is already a library, measured at base commit

Layout is **not** hand-rolled: `src/render/layout-dagre.ts` routes through `@dagrejs/dagre` — the
same Sugiyama engine Mermaid's own flowchart/state layouts are built on. That file's header already
records a derived elimination: layout here must be synchronous and DOM-free (the shell's paint
callbacks return `void`; a gate asserts one `renderView` per paint), and Mermaid "measures text
against a DOM". Swapping to Mermaid would therefore not buy a better layout engine — it would wrap
the engine we already call directly. What IS in-house is the painter (`svg.ts`) and the notation,
which is the actual gap the author found.

## The pilot (measurement, not opinion)

Rendered the simple-worker-queue machine through the vendored Mermaid 11.16.0
(`book/node_modules/mermaid`, headless Chromium), as `stateDiagram-v2` with both self-loops in the
UML form:

```
stateDiagram-v2
  [*] --> ready
  ready --> ready : arrival [occupancy < 4] / occupancy := occupancy + 1
  ready --> ready : processing [occupancy > 0] / occupancy := occupancy - 1
```

Measured results:

1. **Fidelity — disqualifying on this very machine.** Mermaid dropped one of the two parallel
   self-loop transitions entirely: the output contains the `processing` label and **zero**
   occurrences of `arrival`; only one self-loop `<path class="…transition">` is emitted for the
   two declared. The transition whose guard holds the capacity bound — the one the author asked to
   see — is not in the picture at all.
2. **Notation.** The `event [guard] / effect` text renders verbatim as a label; Mermaid attaches no
   semantics to it. The notation is adoptable without the runtime.
3. **Accessible twin.** The output's accessibility surface is `role="graphics-document"` +
   `aria-roledescription="stateDiagram"` on the `<svg>` — no per-node/per-edge structured facts,
   nothing equivalent to `AccessibleScene`. The twin-parity invariant (FR-A11Y-2) would have to be
   rebuilt from scratch around Mermaid's DOM.
4. **Hooks.** Mermaid emits its own `data-edge`/`data-id`/`data-points`, not the
   `data-node-id`/`data-emphasis`/`data-reading-index` contract the Inspector binding, emphasis
   layering (counterexample traces), and the pixel-level a11y gates all join on.

## Ruling

**Option 2 of the three put to us: adopt the convention, keep the runtime.** The UML transition
syntax and a variables compartment are inherited as notation, painted by the existing
dagre-plus-`svg.ts` stack, which keeps the four capabilities that are the product — the structured
twin, emphasis-marked evidence, click-to-inspect identity, and the geometry gates — and keeps the
renderer synchronous and DOM-free. What a Mermaid runtime would have bought: a maintained painter
and its theme system. What it measurably costs today: a dropped transition on the flagship example,
the whole twin, and every `data-*` join the UI and gates depend on.

Pilot script and raw SVG: session scratchpad (`mermaid-pilot/`); the numbers above are from its
single run at base `105ed3d7b`. Re-run cost ≈ 30 s if Mermaid's multigraph handling improves.
