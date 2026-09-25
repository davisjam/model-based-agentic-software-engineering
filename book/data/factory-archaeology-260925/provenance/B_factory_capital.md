# Provenance — B: Building the factory / engineering capital

## Datasets
- `data/loc_weekly.csv` — **the dense per-project-week production-vs-support LoC
  series** (R2). One row per ISO week, counted at that week's LAST commit tree;
  columns `prod_loc`, `test_loc`, `controls_loc`, `orchestration_loc`,
  `infra_loc`, `docs_loc`, `system_model_loc`, `support_loc`, `support_ratio`,
  `support_ratio_excl_docs` (+ `project_week`/`week_start`/`sha`). Emitted by
  `factory_archaeology.py capital-weekly`. See "The weekly LoC series" below for
  the exact definition + path-map + the book delta.
- `data/loc_snapshots.csv` — the book's four dated LoC-category snapshots +
  support ratio (curated from `book/data/metrics.json` + §5.2). Retained as the
  authored reference overlay on F6 (the diamonds), NOT as the primary series.
- `data/control_growth_weekly.csv` (produced by section C) — the WEEKLY
  control-accumulation signal: lint files, gate scripts, typed model files.
  Reused rather than re-globbed (rule #33).

## Figures
- **F5 + F6** `f5_f6_capital_and_support_ratio.py` — F5 stacks the weekly
  LoC-by-category series; F6 plots the weekly support ratio (two definitions)
  with the book's 4 snapshot ratios overlaid as reference markers.
- **F7** (section C figure) — controls/models accumulate weekly.
- **F8** (models accumulate by target) — the weekly by-target split is NOT
  retained (control_growth counts model .py files, not their target); the
  point-in-time by-target split IS available (section F: 77/51/1). A weekly
  by-target model series is now provided as F21b (see section F provenance).

## The weekly LoC series (R2) — definition, path-map, and the book delta
`loc_weekly.csv` is the "heavy weekly cloc" Phase-1 deferred, now computed.

- **Definition of "a line":** newline count of every tracked text SOURCE file at
  the week's last-commit tree, read via `git cat-file --batch` (blob line-counts
  are memoized across weeks — a blob never changes — so the 29-week sweep is
  cheap). "Source" = code extensions (`.py .cs .ts .tsx .js .jsx .go .rs .java
  .rb .css .scss .html .sql .sh .mjs .cjs .csproj .props .targets`) + markdown
  (`.md .rst`). Config/data (`.json .yaml .xml .txt .csv`) are **excluded** to
  keep this a code+docs measure (data files, incl. this deliverable's own CSVs,
  would swamp the signal).
- **Vendored/generated excluded:** paths under `node_modules/`, `vendor/`,
  `.venv/`, `site-packages/`, `dist/`, `build/`, `bin/`, `obj/`, `__pycache__/`,
  `.min.js/.min.css` are dropped (standard cloc discipline). **Why this matters:**
  a committed `test/e2e/node_modules/` otherwise inflated "tests" by ~700k lines
  in the early weeks and made the ratio meaningless.
- **Category path-map** (first match wins): `tests` = paths with `/test(s)/`,
  `test_*`, `*_test.*`, `*.test.*`, `.Tests/`, `/e2e/`, `/test_simworld/`;
  `controls` = `tools/lint/`, `.githooks/`; `orchestration` = `tools/agents/`;
  `system_models` = `system-models/`; `infra` = `deploy/`, other `tools/`,
  `.claude/`, `setup*`, Dockerfiles; `docs` = `docs/`, `talks-and-notes/`,
  `standards/`, any `*.md`; **`production` = everything else** (`backend/src/`,
  non-test `web/`, `shared/`, `services/`, `assets/`).
  `support_loc` = sum of all non-`production` categories.
- **Classification: INDEPENDENT RE-DERIVATION, not the book's cloc numbers.**
  The book's exact cloc config is unrecovered. At the Aug-3 SHA (`ce0bde110fbb`)
  our `prod_loc` ≈ **557k** vs the book's **491,090** (our "production" bucket is
  a bit broader). Our folded `support_ratio` runs ~**6.5** at HEAD vs the book's
  Aug-3 **3.0**, because we fold markdown docs + all of `tools/`+`deploy/` into
  support. The **`support_ratio_excl_docs`** column (docs pulled out, closer to
  the book's engineering-support framing) lands near **~3.9 at Aug-3 / ~3.5 at
  HEAD** and reproduces the book's *below-parity → ~3× TREND*: it starts
  sub-parity in the prototype weeks, crosses parity around W5-W6, and climbs.
  **Treat the levels as our own definition; the trend is the book-comparable
  claim.** F6 overlays the book's authored snapshot ratios (diamonds) so the
  definitional gap is visible, not hidden.

## Classification
- **LoC snapshots**: the two populated snapshots (prototype prod 26,956;
  Aug-3 prod 491,090 / support 1,501,907 / iac 35,323 / system-model 28,507 /
  ratio 3.0) are **exact** (book's categorized line-count tool at named SHAs).
  The mechanization + hardening snapshots' full category LoC are **not in
  metrics.json** — left as empty cells (missing, not interpolated). Support
  ratio: 0.85x (prototype) → ~3.0x (Aug-3); the mechanization/hardening
  intermediate ratios are described qualitatively in §5.2 (crosses parity, then
  peaks) but not given as numbers — retained missing.
- **Weekly control accumulation** (F7): **exact** for lint files (validated
  against the book's window counts), reconstructed for gate scripts (our
  definition) and model files.

## The support-ratio note (preserve the book's framing)
The support ratio is **descriptive, not a target**. Support code (tests,
modeling, orchestration, docs, governance tooling) is capital only while future
work inherits capacity from it — the snapshot shows the *stock*, not its return.
The book's four-snapshot curve is preserved as marked checks in `events.csv`
(book_snapshot rows) and `loc_snapshots.csv`.

## Requested-but-unsupported (section B)
- **Weekly production/test/support LoC broken down by category** — **NOW
  PROVIDED** (`loc_weekly.csv`, F5/F6; see "The weekly LoC series" above). The
  one caveat the book's `_loc_provenance` flags — an iac/system-model category
  re-partition on 2026-07-23 — does not affect our series because our category
  boundaries are our own fixed path-map applied uniformly across all weeks (a
  path is classified the same way in every week), so there is no mid-history
  re-partition discontinuity in *our* definition; the trade-off is that our
  category boundaries are not the book's.
- **Blocking vs advisory controls per week (history)** — the registry's
  blocking/audit_only split is a HEAD property; historical per-week blocking
  status is not cleanly reconstructable (a lint's severity flips over time via the
  AUDIT-ONLY-first→BLOCKING discipline). HEAD counts are in
  `governance_tag_counts.csv`; the weekly split is not fabricated.
