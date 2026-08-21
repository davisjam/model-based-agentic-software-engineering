# D2 figure pilot — house-style mapping + assessment (260820)

A pilot to test whether [d2](https://d2lang.com) (declarative diagram source → SVG) can imitate the
book's hand-authored SVG house style well enough to migrate figure authoring onto it. Five figures,
five genres, one shared style include.

## What's here

| File | Genre it exercises |
|---|---|
| `_house-style.d2` | the shared include — palette + type mapped to d2 classes |
| `open-frontiers.d2` | **grid** — 4 program columns + 2 full-width bands (a full recompose of the book figure) |
| `system-pipeline.d2` | **linear pipeline** — left-to-right flow with arrows |
| `governance-loop.d2` | **cycle** — a labelled dashed return edge |
| `model-invariants-checker.d2` | **linear + feedback branch** |
| `governance-targets.d2` | **nested containers** — three role-tinted groups holding mechanism cells |

Each `<fig>.d2` compiles to a sibling `<fig>.svg` (committed, so the pilot is reviewable without d2).

## Compile

```
d2 --font-regular book/fonts/SourceSans3/SourceSans3-Regular.ttf \
   --font-bold    book/fonts/SourceSans3/SourceSans3-Bold.ttf \
   --font-italic  book/fonts/SourceSans3/SourceSans3-It.ttf \
   book/d2-pilot/<fig>.d2 book/d2-pilot/<fig>.svg
```

The vendored Source Sans 3 faces (`book/fonts/`) make the type match the book; d2 embeds them in the SVG.

## House-style → d2 mapping

The "Umber Monograph" tokens (`book-models/design-tokens.json`) become d2 **classes** in `_house-style.d2`:

| Token family | d2 class | fill / stroke |
|---|---|---|
| `diagram-fleet` (agent, blue) | `fleet` / `fleet-head` | `#e7edf3` / `#2f5169` |
| `diagram-governed` (modeling, green) | `modeling` / `modeling-head` | `#e3f0e7` / `#1f7a4d` |
| `accent` (governance, rust) | `rust` / `rust-head` | `#faf1e6` / `#9a3f12` |
| `diagram-trust` (deep green) | `trust` | `#eef7f0` / `#155c38` |
| `diagram-churn` (failure, red) | `churn` | `#fbeaea` / `#b23b3b` |
| `panel` / `paper` (neutral) | `panel` / `paperbox` | `#f6f4ef` / `#fdfcf9` |
| conjectural (dashed) | `conj` / `conj-head` / `conjedge` | dashed `#57534e` / `#9a3f12` |

Type: Source Sans 3 (body), headers bold + tinted, edge labels italic muted — passed at compile via `--font-*`.

### d2 0.8 gotchas found in the pilot
- `stroke-width` and `font-size` must be **integers** (0–15 and 8–100); decimals are rejected.
- Unconnected top-level blocks are spread **horizontally** by dagre — force a vertical stack with a root
  `grid-columns: 1`. Grid layout (rows/columns) is deterministic and bypasses the layout engine.
- Font styling (`font-size`, `bold`) belongs on **cells/classes**, not on a grid **container's** own style.

## Assessment — d2 vs. hand-SVG

**The headline win: d2 auto-sizes every box to its text.** The entire failure class this repo's figure
tooling fights — sub-floor labels, box overflow, the `lint_figure_overflow` / `_occlusion` / `_label_collision`
gates, manual box-widening and 2-line wrapping — **does not exist** in d2. You set a font size; the box grows
to fit. That alone is a large maintenance saving.

**Fidelity: high.** All five render convincingly in the house style (see the committed SVGs). Palette,
type, rounded role-colored boxes, dashed-conjectural styling, labelled edges, and nested tinted containers
all reproduce.

**What you give up:**
- **Pixel control.** Layout is the engine's call, not hand-placed coordinates. Grid gives back column/row
  determinism; free-form edge figures look good but you steer them less precisely than hand-SVG.
- **A build dependency.** d2 is a Go binary (dev-only here — compiled SVG ships).
- **The existing gate suite** (`lint_figure_*`) reads hand-SVG conventions; a d2-sourced figure would need
  the SVG regenerated on each `.d2` edit (a codegen-provenance concern, cf. auto-gen provenance headers).

**Recommendation shape (for discussion, not decided here):** d2 is a strong fit for **structured** figures
— tables, grids, pipelines, container maps (exactly the dense grids that cost the most hand-effort). It is
a weaker fit where a figure's meaning lives in **bespoke geometry** (the staircase, the frontier plots,
anything with hand-tuned spatial encoding). A migration would likely be **selective**, not wholesale: move
the grid/pipeline/container figures to d2 source; keep the geometric ones hand-authored.
