# DocAble longitudinal measurements acquired 2026-10-28

Frozen source: `/Users/davisjam/Downloads/icse-seip-2027-docable/data/engineering/`.
The SEIP export freezes revision `9fb6b111497cc14ef27931936f7e8aeff645bfec`;
its manifest was generated October 19. No new repository mining was performed.

The plotted window contains **31 complete seven-day periods from March 12 through
October 14, 2026**. The final full-week snapshot is
`7bfc9e59982be67395fa10fb169956cbdd041a60`. `weekly.csv` retains the incomplete
week 32 for provenance, but the plotter filters it out. Consequently the full-week
macros total 36,578 work commits, 428 completion claims and 14,392 dispatch IDs;
the larger manifest totals include the partial week and must not replace them.

## Contents and regeneration

`weekly.csv`, `manifest.json`, `macros.tex`, `size_ratios.csv` and
`code_size_manifest.json` are exact copies. `source_hashes.json` identifies the
upstream inputs and extraction scripts by SHA-256. `source_size_data.py` is the
exact upstream grouping function, kept as a record (it expects the SEIP directory
layout, not this acquisition directory).

`code_size_mapped.csv` is a compact lossless projection onto plotted categories,
produced by calling that grouping function on the upstream `code_size.csv` and
`code_size_files.csv`. It includes the function's reassignment of uncategorized
report rows. The 12 MB file-level census is retained upstream rather than copied
here. `size_groups.json` preserves the category labels and group membership.

Regenerate four SVG/PDF pairs from these frozen inputs with:

```
python3 book/figures/docable-seip-261028/generate.py
```

The script uses the book's Source Serif 4 font and grayscale fills, patterns and
line styles. SVG and PDF are generated from the same figure. Outputs are
`book/assets/docable-seip-{work,activity,analyses,capital}-261028.svg` and matching
PDFs under `book/latex/assets/`. The capital chart retains production components,
tests, lints, tools/helpers, agent infrastructure, infrastructure-as-code, models,
and indexed documentation. Ten measured snapshots are joined by interpolation,
not treated as daily observations. The ratio comes from exactly those categories.

## Definitions and limits

- Work commits expand squash source lists, deduplicate hashes, exclude merges,
  empty commits and bookkeeping, and use landing dates. Thirty-three source
  objects are missing and one squash lacks a source list; this is incomplete
  reconstruction, not a productivity measurement.
- Epic completions are dated affirmative completion claims, including scoped
  research, not directory moves or independent outcome audits. Of 638 roots,
  448 have dated completion evidence (428 within complete weeks), 74 are
  administrative retirements and 116 unresolved. Weeks 1–10 lack recovered
  completion records; later coverage is also uneven.
- Agent starts deduplicate explicit startup/dispatch dates from retained and
  Git-preserved records. Weeks 1–11 lack recovered records. Neither series
  supports interpreting weekly differences as changes in underlying throughput.
- Models are top-level modules declaring MODEL_KIND at any sampled snapshot;
  earlier existence is reconstructed by module path. Never-declared models are
  omitted. Multi-model consumers read at least two models; this is not a count
  of individual joins. Static/dynamic inventories count existing registered
  referenced paths, not all tests, executions or proof of successful checks.
- Code size uses fixed final run-cloc scope, separates code from comments and
  blanks, normalizes historical source locations, and excludes dependency,
  generated, historical worktree and snapshot-document copies. Indexed live
  documentation membership may itself change. The apparatus ratio is descriptive,
  not a target or a measure of return on investment.

## Relationship to September archaeology

These plots replace the comparable September plots wholesale. The old directory
`factory-archaeology-260925` remains an archival record, not a competing
measurement authority for the revised chapter.
Its weeks begin Monday March 9 rather than Thursday March 12; its commits count
landings, its Epic series uses directory moves, and its source-size series counts
newlines over broader source/document categories. Its model directory counts
include helpers; its form census is a separate 129-model September snapshot.
Those curves cannot be spliced into or numerically compared as a continuous series
with this acquisition. The distinct tests/models/infrastructure information is
preserved here under the new, consistent definitions.

## Remediation and cost evidence

The `benchmark/` directory preserves the SEIP generated comparison, cohort, rubric,
evaluation and provenance summaries used by the Economics section. Runtime covers
63 validation attempts; inference-cost and rubric summaries cover 62 completed
outputs. The ten-document agent comparison has its own completion denominator.

The manuscript's `data/data.tex` supplies the author-reported undergraduate
corpus (42 workers, approximately six months, 1,303.4 billed hours, 382 identifiable
pairs, 20 courses) and approximate development estimates ($110,000 total,
$90,000 engineering labor, $20,000 cloud). These are separate from mined
repository measurements and are not independently audited.
