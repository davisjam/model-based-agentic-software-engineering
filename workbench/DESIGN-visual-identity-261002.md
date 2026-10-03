# DESIGN — Workbench visual identity: shared family tokens + adoption plan (261002)

The Workbench should feel like part of Teach with MAGE, not a separately branded application that
happens to be linked from it. It did not: `workbench/index.html` carried its own near-miss token set
(`--bg: #fbfaf7` beside the family's `#fdfcf9`, an ochre `#8e6f3e` accent beside the family rust
`#9a3f12`). This note records the factoring that stops the fork, the full token correspondence, and
the exact adoption edits. A follow-up applies §5 to `index.html`; nothing here edits that file.

## 1. Where the shared tokens live — the ruling

The family already has the factoring seam: `book-models/design-tokens.json` is the single source of
truth, and every surface consumes a **projection** of it with a freshness gate (`emit-material` into
`mage-family.css`, `emit-mermaid`, the Typst preamble, the SVG palette). The workbench forked because
it consumed no projection — not because the primitives were unfactored.

So the shared artifact for the workbench is a **fourth projection**: `design_tokens.py
emit-workbench` writes `workbench/assets/mage-tokens.css`, a Material-free stylesheet of `--mage-*`
custom properties (light in `:root`, dark under `prefers-color-scheme`, `data-theme` overrides that
win in both directions — the workbench's existing theme contract). `catalog.py validate` blocks when
the emitted file is stale, the same discipline that already guards `mage-family.css`.

**Why the emitted file lives under `workbench/assets/`, not beside `mage-family.css`:** the
workbench page is self-contained by requirement — a published copy of `workbench/` serves with no
sibling trees, so a `<link>` up into `web-theme/` would 404 on any standalone copy and on a local
server rooted at `workbench/`. `web-theme/` is also the MkDocs `custom_dir`, a Material-specific
home; a Material-free artifact does not belong there.

**Why not one runtime-shared CSS file that `mage-family.css` also imports:** that would be the
weaker rung. The consumers must each stay independently serveable, so a single runtime file is
structurally unavailable; file-level `var()` sharing would add a load-order dependency plus an
`extra_css` edit in three `mkdocs.yml` files, and would guarantee nothing the freshness gate does
not already guarantee. One SSOT, N gated projections is how this repo already shares tokens across
surfaces that cannot load each other's files.

**The Material split**, concretely: `design-tokens.json` holds the values; `css_material_block()`
maps them onto `--md-*`/`--family-*` for the three MkDocs sites; `css_workbench_block()` maps the
same values onto `--mage-*` for standalone pages. `mage-family.css` is untouched apart from a
header pointer to the sibling projection.

## 2. The shared contract (`--mage-*`)

Colors (light + dark): `ink, paper, panel, rule, muted, accent, accent-tint, link, code-bg`, plus
`--mage-on-accent` — a projection-level alias of `paper` (cream text on the rust accent in light;
dark paper on the lifted accent in dark). The family spells that relationship through Material's
`--md-primary-bg-color`; the alias names it for consumers without Material's vocabulary.

Non-color: `--mage-font-body`, `--mage-font-mono`, `--mage-lh-body`, `--mage-radius-{chip,code,card}`,
`--mage-border-{hairline,accent-bar}`.

Deliberately **excluded**: the `box-*` / `diagram-*` figure palette (a figure language, incompletely
dark-themed — emitting it would invite half-themed use) and the `header` near-black (family-shell
only).

## 3. Token correspondence — complete audit of the inline block

Every custom property `workbench/index.html` declares, light / dark:

| workbench var | current (light / dark) | family token (light / dark) | ruling |
|---|---|---|---|
| `--bg` | `#fbfaf7` / `#17160f` | `paper` `#fdfcf9` / `#17130f` | **adopt** `var(--mage-paper)` — near-miss |
| `--panel` | `#ffffff` / `#201e16` | `panel` `#f6f4ef` / `#211a13` | **adopt** `var(--mage-panel)` — light pane goes pure-white → warm panel |
| `--ink` | `#1d1b16` / `#f2eee4` | `ink` `#1c1917` / `#ece7df` | **adopt** `var(--mage-ink)` — near-miss |
| `--muted` | `#5c5750` / `#b3aa98` | `muted` `#57534e` / `#a69c8f` | **adopt** `var(--mage-muted)` — near-miss |
| `--rule` | `#ddd6c7` / `#3a362a` | `rule` `#e4e0d8` / `#3a3128` | **adopt** `var(--mage-rule)` — near-miss |
| `--accent` | `#8e6f3e` / `#c8a564` | `accent` `#9a3f12` / `#d98a5c` | **adopt** `var(--mage-accent)` — the real divergence; see §4 note on the dark gold |
| `--accent-ink` | `#ffffff` / `#17160f` | (unnamed; paper-on-accent) | **adopt** `var(--mage-on-accent)` — resolves correctly in both schemes |
| `--warn-bg`/`--warn-ink` | `#fff6e0`,`#6b4a00` / `#3a2f12`,`#f0d9a0` | none | **keep** — §4 |
| `--danger-bg`/`--danger-ink` | `#fdeceb`,`#8a1c13` / `#3d1a16`,`#f6bdb6` | none | **keep** — §4 |
| `--focus` | `#0b5fff` / `#8ab4ff` | none | **keep** — §4 |
| `--mono` | `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace` | `--family-font-mono` | **adopt** `var(--mage-font-mono)` — degrades to the same system mono without webfonts |

Values styled by literal, with no workbench var (the fork's quieter half):

| literal in `index.html` | family token | ruling |
|---|---|---|
| body font `system-ui, -apple-system, "Segoe UI", sans-serif` | `--mage-font-body` (`"Source Sans 3", -apple-system, …`) | **adopt** — identical rendering unless Source Sans 3 is available, in which case the page joins the family face |
| body line-height `1.5` | `--mage-lh-body` (`1.62`) | **keep 1.5** — §4 |
| border-radius `4px` (buttons, panes, fieldsets, inputs, figure) | `--mage-radius-chip` (4px) | **adopt** — zero visible change; do NOT move panes to `radius-card` (10px): that is the book's card vocabulary, and forcing it would be a new look, not adoption |
| border-radius `3px` (`.caveat`) | `--mage-radius-chip` (4px) | **adopt** — sub-pixel change |
| border-radius `999px` (`.state` chips) | none | **keep** — the pill is a deliberate chip shape with no family counterpart |
| `1px` borders throughout | `--mage-border-hairline` | **adopt** — zero visible change (optional; literal `1px` is also fine) |
| `3px` accent bars (`p.purpose`, `p.prompt`) | `--mage-border-accent-bar` | **adopt** — zero visible change, and it is exactly the family's accent-bar idiom |

## 4. Tokens ruled legitimately workbench-specific

- **`--focus`** (blue ring). A focus indicator must stay visible against accent-colored controls;
  an accent-colored ring on an accent button vanishes. The blue ring is the correct accessibility
  call and the family names no focus token (the MkDocs sites lean on Material's). Keep.
- **`--warn-*` / `--danger-*`**. Semantic status colors, AA-tuned ink-on-fill pairs in both schemes.
  The family's nearest neighbor (`diagram-churn` failure-red) is a figure language with no AA text
  pairing. Keep — and if a second property ever needs status colors, promote these into the SSOT
  then, not before.
- **Body line-height 1.5**. The family's 1.62 is reading-column rhythm for long-form prose; the
  workbench is an application shell with tables and forms, where 1.5 is the denser, correct
  register. Keep — now as a named decision instead of an accident.
- **The `.state` pill radius (999px)** — no family counterpart; a chip shape, not a drift.

The renderer's theme-invariant SVG palette (`src/render/svg.ts`) is out of scope on purpose: the
exported SVG cannot read page custom properties, and its fixed-light ground is a WCAG fix
(`index.html` comment at `figure svg`).

## 5. Adoption plan — the exact edits (apply to `workbench/index.html` in a follow-up)

1. **Wire the tokens** — in `<head>`, before the inline `<style>`:
   `<link rel="stylesheet" href="assets/mage-tokens.css">`
2. **Favicon** — replace the data-URI `<link rel="icon" …>` with:
   `<link rel="icon" href="assets/favicon.svg">`
   (The data URI's ochre `M` both wore the forked accent and collided with the book's M-monogram
   identity. The committed mallet is the Workbench's own mark; see
   `workbench/_design/favicon-261002/` for the 16/32/64 legibility baseline.)
3. **Rewrite the `:root` block** to aliases — the page keeps its own var names, so none of the ~60
   `var(--bg)`-style references below change:
   ```css
   :root {
     color-scheme: light dark;
     --bg: var(--mage-paper);
     --panel: var(--mage-panel);
     --ink: var(--mage-ink);
     --muted: var(--mage-muted);
     --rule: var(--mage-rule);
     --accent: var(--mage-accent);
     --accent-ink: var(--mage-on-accent);
     --mono: var(--mage-font-mono);
     /* workbench-specific (§4): */
     --warn-bg: #fff6e0;  --warn-ink: #6b4a00;
     --danger-bg: #fdeceb; --danger-ink: #8a1c13;
     --focus: #0b5fff;
   }
   ```
4. **Delete the three per-scheme re-declarations** of the adopted vars: in
   `@media (prefers-color-scheme: dark)`, `:root[data-theme="dark"]`, and `:root[data-theme="light"]`,
   keep ONLY the workbench-specific vars (`--warn-*`, `--danger-*`, `--focus`). The shared file
   carries the scheme switching for the adopted ones, with the same data-theme-wins contract.
5. **Body font**: `font: 16px/1.5 var(--mage-font-body);`
6. **Optional literal cleanups** (zero visible change): `4px`/`3px` radii →
   `var(--mage-radius-chip)`; accent-bar `3px` → `var(--mage-border-accent-bar)`; `1px` borders →
   `var(--mage-border-hairline)`.

Note for the applier: step 1 softens the page's "self-contained" comment from "no external requests"
to "no requests off this directory tree" — same-tree assets were already the norm (`dist/workbench.js`,
`examples/*.yaml`); update that comment's wording in the same edit.

## 6. What visibly changes on adoption

- **Accent, light**: ochre `#8e6f3e` → family rust `#9a3f12` — primary buttons, skip-link, the
  `p.purpose`/`p.prompt` bars. The intended change; the point of the exercise.
- **Accent, dark**: gold `#c8a564` → soft rust `#d98a5c`. The gold is the teach site's superseded
  slate-gold — the family already re-tinted it to rust (`palette-dark` note in `design-tokens.json`);
  the workbench fork had preserved the superseded decision.
- **Panel, light**: pure white → warm `#f6f4ef` on header, panes, buttons, fieldsets. The most
  noticeable non-accent change; it is what seats the page on the family's warm paper.
- **`--accent-ink` dark-on-accent** becomes `#17130f` (was `#17160f`) — imperceptible.
- **Paper/ink/muted/rule**: 1–2-step warm nudges in both schemes — side-by-side only.
- **Fonts**: identical for visitors without Source Sans 3 / IBM Plex Mono installed; family faces
  for those with them. (The workbench loads no webfonts; if it ever self-hosts the family faces the
  tokens already name them.)

## 7. Publication routing

No routing work. The Pages workflow's assemble step rsyncs the whole tree into `_site/` (excluding
only source trees rebuilt elsewhere), so committed `workbench/assets/*` ships exactly like
`workbench/examples/*.yaml`, which the shell already fetches in production. The emitted
`mage-tokens.css` is committed (not build-generated in CI), and `catalog.py validate` — which the
Pages workflow runs — fails the build if it is stale. Relative `assets/…` links hold under the
project subpath, locally, and in a standalone copy of `workbench/`.

## 8. Family-shell findings (first second-consumer read of `mage-family.css`)

- **The on-accent color is a Material pun.** The shell spells "text on the accent/header" as
  `--md-primary-bg-color` — a *background* variable used as a foreground color. It works inside
  Material's vocabulary and is unreadable outside it; `--mage-on-accent` names it for the second
  consumer. Candidate: name it in the SSOT (`palette.on-accent`) and let both projections map it.
- **The family has no focus token.** The MkDocs properties inherit Material's focus treatment; the
  first non-Material consumer had to invent one (`#0b5fff`). If the family ever states a focus
  policy, the workbench adopts it; until then the blue ring stands.
- **No semantic status colors in the SSOT.** warn/danger exist only in the workbench. One consumer
  is not a pattern; two would be — promote on the second need.
- **The shell's hand-authored rules lean on Material-computed vars** (`--md-default-fg-color--light`,
  `--md-default-fg-color--lightest`) that no projection owns. Fine for MkDocs consumers, but it means
  the tokens file does not capture the whole family voice — a future non-Material consumer of the
  *shell* (not just the palette) would need those derived grays named in the SSOT.
- **The dark gold** (§6) — the fork had frozen a decision the family had already reversed. The
  freshness gate now makes that class of quiet divergence a build failure rather than an archaeology
  find.
