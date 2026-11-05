# `_shared/` — the styling the six interactive laboratories have in common

Two files, one job: hold the shared CSS once and inline it into every shipped page at build time.

| File | Role |
|---|---|
| `instrument-core.css` | The source of truth. Hand-authored. |
| `sync_css.py` | Inlines it into each `course/interactive/<exercise>/index.html`. Stdlib only. |

```bash
python3 course/interactive/_shared/sync_css.py            # propagate
python3 course/interactive/_shared/sync_css.py --check     # report drift, write nothing
```

## Why the CSS is inlined rather than linked

Each instrument ships as one self-contained file. A student opens it from a `file://` URL, and the
Download HTML control hands over the same bytes. A `<link rel=stylesheet>` breaks both, and each
exercise's packaging suite asserts that neither an external stylesheet nor an `@import` appears
anywhere in the file. So the duplication comes out at the source and goes back in at build time —
the only form of sharing the self-containment contract allows.

Each `index.html` therefore carries **two** `<style>` elements:

1. the generated region, delimited by markers that name this emitter and say not to edit there;
2. the exercise's own hand-authored block.

The core comes **first**. At equal specificity the later declaration wins, so a local rule beats a
core rule without needing `!important` and without reordering anything.

## Membership rule

**A rule belongs in the core when it is byte-identical in all six shipped pages.** Everything else
stays local. Three consequences, each measured rather than assumed:

- **The token block is split, not shared whole.** The six `:root` blocks are not byte-identical.
  Each exercise adds its own vocabulary — `--model` / `--model-fill` in the five simulators,
  `--refs` in storage-cost, `--must` / `--maybe` in the workbench. So the declarations common to
  all six live in the core, and each page keeps a local `:root` holding only its own. Custom
  properties make this exact: same selector, same specificity, last declaration per property wins.

  **A token the core declares must never be overridden by a page, and the parity test enforces it.**
  A half-override leaks across colour schemes, silently. The page's local light `:root` follows the
  core's `@media (prefers-color-scheme: dark)` block in source order, so a token overridden in light
  but not in dark wins in **dark** mode too. Measured during the extraction: redos darkens `--warn`
  to `#8a5a00` because `#9a6500` as text on `--warn-fill` measures 4.45:1 and axe-core flagged it —
  and with `--warn` in the core, that light-only override displaced the core's dark `#d2a24a` on a
  dark page. The rule that removes the class rather than the instance: **a token that is not
  identical in all six pages in BOTH schemes stays entirely local in both.** That is why `--warn`
  is declared six times and `--warn-fill`, which every page agrees on, only once.
- **Rules that look shared and are not stay out.** `.ctl`, `.ctl-row`, `.seg`, `.seg button`,
  `.btn-row`, `dl.readout`, `.badge`, `.legend`, `.canvas-wrap`, `canvas` and the
  `@media (min-width: 1100px) .grid2` column template all differ between exercises today — the
  duplication was already mid-divergence when it was extracted. Reconciling any of them is
  deliberate work on the rules themselves. It is not done by moving text into the core.
- **Order is preserved.** The core emits its rules in the relative order they held in all six pages
  before extraction. That is what makes the extraction a rendering no-op rather than a cascade
  reshuffle, and it is why a new core rule should be placed by where it has to win, not by where it
  reads nicely.

## The gate

Each exercise's `tests/test-packaging.mjs` asserts that the inlined region is byte-equal to
`instrument-core.css`, that both markers are present exactly once, and that the core `<style>`
precedes the local one. Those suites run as legs of the publishing workflow's
`interactive-exercises` matrix, so a stale inline turns that exercise red and the matrix names which
one.

Edit a generated block in a shipped page and the fix is mechanical: move the edit to
`instrument-core.css`, re-run the sync, commit. The provenance comment inside the block says so in
place.

## Not wired into `pre-commit`

Deliberately. That hook already force-stages `*.html` at any depth — the sweep hazard CLAUDE.md
documents — and a hook that also *rewrote* hand-authored exercise HTML during an unrelated commit
would widen it. The sync is run by hand, like the repo's other source-to-view syncs; the parity
assertion in CI is what carries the discipline.
