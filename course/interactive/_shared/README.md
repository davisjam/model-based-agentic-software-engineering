# `_shared/` — the styling the six interactive laboratories have in common

Hold what the six exercises have in common once: the shared stylesheet, the tool that inlines it,
and the gate that holds the hand-authored figures to their geometry.

| File | Role |
|---|---|
| `instrument-core.css` | The source of truth for shared styling, including the laboratory handout. Hand-authored. |
| `sync_css.py` | Inlines it into each `course/interactive/<exercise>/index.html`. Stdlib only. |
| `check_figure_geometry.mjs` | Browser check: no figure label clipped by its viewBox, sitting on another, or painted under a later filled rect. |

```bash
python3 course/interactive/_shared/sync_css.py            # propagate
python3 course/interactive/_shared/sync_css.py --check     # report drift, write nothing
node course/interactive/_shared/check_figure_geometry.mjs  # all six; add a name for one
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
stays local. One addition the rule did not anticipate: the **laboratory handout** — the engineering
question, the system-model figure, the model assumptions, the parameter table, Predict/Run/Explain
and the `svg.fig` figure vocabulary — is in the core because it is a shared design REQUIREMENT, so
it is authored once and identical by construction rather than by coincidence. It is delimited by
`BEGIN LAB SHELL` / `END LAB SHELL` markers inside the generated region, and its header comment
carries the measurements that set the 350-450px opening budget.

Three consequences of the membership rule, each measured rather than assumed:

- **The token block is split, not shared whole.** The six `:root` blocks are not byte-identical.
  Each exercise adds its own vocabulary — `--model` / `--model-fill` in the five simulators,
  `--refs` in storage-cost, `--must` / `--maybe` in the workbench. So the declarations common to
  all six live in the core, and each page keeps a local `:root` holding only its own. Custom
  properties make this exact: same selector, same specificity, last declaration per property wins.

  **A token the core declares must never be overridden by a page, and the parity test enforces it.**
  A half-override leaks across colour schemes, silently. The page's local light `:root` follows the
  core's `@media (prefers-color-scheme: dark)` block in source order, so a token overridden in light
  but not in dark wins in **dark** mode too. The rule that removes the class rather than the
  instance: **a token that is not identical in all six pages in BOTH schemes stays entirely local in
  both.** `--model` / `--model-fill` are the live example — the five simulators declare them, the
  workbench does not.

  **`--warn` was the first example and is no longer one, which is worth recording.** Five pages used
  `#9a6500` and redos darkened it to `#8a5a00` for contrast, so the token stayed local. Then the
  shared handout gave every page a required honesty statement in `--warn` on `--warn-fill`, and that
  pairing measures **4.46:1** at `#9a6500` — axe-core fails it, so the divergence was about to
  become five contrast violations rather than one deliberate exception. `#8a5a00` measures 5.33:1 on
  `--warn-fill` and 5.39:1 on `--panel`, dark mode never diverged, and taking redos's value
  everywhere both fixed the contrast and dissolved the reason the token was local. It is now in the
  core, declared once. **The lesson generalises: when a page-local divergence exists only because one
  page was right, reconcile UP rather than keeping the exception.**
- **Rules that look shared and are not stay out.** `.ctl`, `.ctl-row`, `.seg`, `.seg button`,
  `.btn-row`, `dl.readout`, `.badge`, `.legend`, `.canvas-wrap`, `canvas`, the horizontal-scroll
  wrapper (`.table-scroll` in one page, `.scroll-x` in two, absent from three) and the
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

**`check_figure_geometry.mjs` runs as a tier of every exercise's `run-all.mjs`**, named in the
output as `figure geometry`, so it rides the same matrix. It is a browser check — it needs laid-out
geometry — so the placement rule keeps it out of the pre-push hook, and it skips itself with exit 0
when Puppeteer is absent. It found 24 real defects across four figures on its first run: labels cut
mid-word by the viewBox, labels stacked on one another, and labels painted under a box that hid
them. None of the text-reading tiers, and neither axe-core nor a token sweep, can see any of those:
the string is present and correct in every one of them.

## Not wired into `pre-commit`

Deliberately. That hook already force-stages `*.html` at any depth — the sweep hazard CLAUDE.md
documents — and a hook that also *rewrote* hand-authored exercise HTML during an unrelated commit
would widen it. The sync is run by hand, like the repo's other source-to-view syncs; the parity
assertion in CI is what carries the discipline.
