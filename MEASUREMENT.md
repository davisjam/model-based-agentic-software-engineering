# `catalog.py build` profile — the incremental-render idea is killed by measurement (a negative result)

**TL;DR.** Per-chapter `.md`→`.html` render is **~17 %** of the ~9.75 s build — far below the
~60 % decision-gate threshold that would justify building a sound incremental render graph.
The build is dominated by a **single aggregate page**, `book/book-index.html`, whose term-index
computation takes **~4.4 s (≈46 % of the whole build)**. Aggregates must always regenerate for
soundness, so incrementality cannot touch this cost. Per the brief's task-1 decision gate we
**STOP** the incremental effort. The real, sound, zero-risk lever is an **algorithmic fix to the
index builder** (below) — a straight optimization of an always-run pass, no build graph, no
staleness risk.

## How this was measured

- Worktree: `buildopt-incremental` (submodule worktree off `ef13ed1b`), stdlib-only.
- The book subprocess (`book/build_book.py`) renders 130 of the ~145 pages and is where the
  real per-chapter render lives. Its mermaid diagrams are rendered to inline SVG via `mmdc` and
  **cached** at `book/.mermaid-svg-cache/` (gitignored). A fresh worktree has no cache, so the book
  build aborts ("`mmdc` not found"). I populated the cache from the primary checkout's gitignored
  cache (read-only on the primary; write into this worktree only) to reproduce the normal *warm*
  dev/CI state. With a warm cache the book builds cleanly (rc 0) and mermaid is just file reads
  (`render_mermaid_svg` = 0.1 s total — negligible).
- Phase timing via non-invasive monkeypatch wrappers around the build's functions
  (`/tmp/bookprof.py`, `/tmp/idxprof.py`), two runs each, warm caches.

## The split (warm-cache, representative run; total book build ≈ 7.2–7.9 s)

| Bucket | Time | Kind | Incremental-eligible? |
|---|---|---|---|
| `build_index_page` → `build_index_entries` → `_scan_term_refs` | **~4.4 s** | **aggregate** (`book-index.html`) | No — must always rebuild |
| `md_to_html` (per-chapter render, all ~133 chapters) | ~1.3 s | per-chapter | yes, but small |
| `_number_floats` (per-chapter, in render loop) | ~0.25 s | per-chapter | yes |
| `_insert_list_of_floats` (whole-book float/figure numbering) | ~0.6 s | whole-book setup | No |
| `compute_word_counts` (re-renders every page a 2nd time) | ~0.43 s | whole-book aggregate | No |
| `build_appendix_chapters` / `_discover_chapters` / other setup | ~0.4 s | whole-book setup | No |
| `render_mermaid_svg` (cache hits) | ~0.1 s | per-chapter | n/a |

Outside the book subprocess:

| Bucket | Time |
|---|---|
| `bundle_skill.py` subprocess | ~0.28 s |
| `catalog.py` catalogue render (`render_md` over 102 `.md`) | **~0.044 s** |
| `catalog.py` aggregates + orphan/leak gates | ~0.15 s |

**Per-chapter render, whole build:** book render-loop (`md_to_html`+`_number_floats`+`_resolve_xrefs`+`page`)
≈ 1.6 s **+** catalogue `render_md` ≈ 0.04 s ≈ **~1.65 s ≈ 17 % of ~9.75 s.**

## Decision-gate verdict: STOP

The brief gates the whole effort on "per-chapter render is the dominant cost (≥ ~60 %)." It is not
(~17 %). A sound incremental render graph would, at best, shave ~1.6 s off a ~9.75 s build while
leaving the 4.4 s index-scan and the ~1.5 s of whole-book setup/aggregates untouched — and it would
add a content-hash cache, a dependency graph, and a parity gate to defend against staleness on the
correctness-critical pre-commit hook. **Poor payoff, real added risk. Do not build it.**

There is also a soundness landmine that makes incremental render *especially* unattractive here: the
per-chapter render loop consumes cross-chapter derived state — chapter-relative float/figure numbers
(`_insert_list_of_floats`), the concept registry/glossary link map, symbolic xref resolution
(`_resolve_xrefs` against a global `ref_map`), and neighbor chapter titles (kicker/nav). A figure
added in chapter A renumbers floats referenced in chapter B; a heading/title change shifts B's nav.
Any sound cache key must fold this global state in — which means a *structural* edit already forces a
near-full rebuild, and only the common *prose-only* edit would benefit. Not worth it for ~1.6 s.

## The real lever (recommended follow-up — sound, always-runs, no incrementality)

`_scan_term_refs(term, pages)` is called **once per index term (311×)** and, for **each** call,
re-normalizes **every** page: `_strip_point_decorators(pg["body_md"])` + `.lower()` + `splitlines()`
— ~311 × ~133 ≈ **41,000 redundant re-normalizations** of the same page bodies. The scan itself is
then a substring membership test.

**Fix (O(terms×pages) work stays, but the per-page normalization is hoisted out of the term loop):**
precompute, once per page, `(stripped_lowered_body, set_of_lowered_heading_lines)`; then each term's
scan is pure membership tests over the precomputed structures. This is expected to cut the ~4.4 s by
~1–2 orders of magnitude (toward tens of ms), taking the whole build from ~9.75 s toward ~5 s — and
because `book-index.html` is a deterministic always-run aggregate, the output is **byte-identical**;
a golden-HTML assertion in `catalog_tests.py` (build once, capture `book-index.html`, optimize,
assert identical) is the entire soundness obligation. Secondary, similar win: `compute_word_counts`
re-renders every page through `md_to_html` a second time (~0.43 s) purely for a stdout word-count
report — reuse the already-rendered bodies or drop the re-render.

These are ordinary optimizations of always-run aggregate passes, not a build graph — they capture the
dominant cost the incremental idea could never reach, with no staleness surface.
