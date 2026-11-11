#!/usr/bin/env python3
"""wordcount.py — the book's word count in seconds, without a full build.

WHAT THIS IS.  A thin front end over the word count the build already computes. It assembles the same
page set `build_book.build_pages()` assembles, then hands it to `build_book.compute_word_counts` and
prints the result through `build_book._print_word_counts`. Nothing here counts anything: the counting
rule lives in `build_book._prose_word_count` and stays there, so this tool tracks the build instead of
drifting from it.

WHAT IS COUNTED.  Printed words only — the rendered prose a reader reads, with code and mermaid blocks,
figure captions, SVG alt text, and HTML comment metadata removed. `build_book._prose_word_count` is the
definition; read it there rather than trusting a restatement here.

WHY IT EXISTS.  The figures are reported by the full build, which renders and writes the whole site.
Asking "how long is the book now?" should not cost a build. This path skips the emitters and the
writing-style export and runs in roughly half the time (~8 s against ~12 s), with output identical to
the build's own — verified line for line.

THE HEADLINE. TOTAL, including both appendices, stated against the author's 110,000-word target:
over or under, and by how much. The JSON preserves BODY and APPENDIX subtotals and per-chapter counts.
BODY includes every non-appendix page: front matter, chapters, conclusion, and back matter.

COUPLING, STATED PLAINLY.  The counting delegates; the page ASSEMBLY is mirrored from `build_pages`
(discover → appendix → back matter → appendix-reference resolution → concept/glossary harvest → List of
Figures). A change to that assembly must be mirrored here, and the fix that would remove the mirror is
to lift the assembly out of `build_pages` into a function both callers share.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent      # book/

sys.path.insert(0, str(HERE))
import build_book as bb  # noqa: E402 — the canonical build; this tool reports its word count

# Shared with the build report; --band changes only the CLI comparison target.
RECOMMENDED_TOTAL_WORDS = bb.RECOMMENDED_TOTAL_WORDS


def book_word_counts() -> "bb.WordCounts":
    """The build's word counts, computed over the build's page set.

    Mirrors the assembly in `build_book.build_pages` up to its own `compute_word_counts` call, minus
    every step that only matters to rendering or to writing files. Each step below changes the count, so
    none can be dropped: the appendix and back-matter builders add pages, the appendix-reference pass
    rewrites `[appendix: …]` markers into links, and the List-of-Figures insertion adds a front-matter
    page worth ~1,270 words."""
    metrics = bb._load_metrics()
    bb._load_citations()
    chapters = bb._discover_chapters(metrics)
    if not chapters:
        raise SystemExit("no chapter files found under the Part/Chapter hierarchy")

    max_part = max(c["part"] for c in chapters)
    appendix = bb.build_appendix_chapters(next_part=max_part + 1)
    backmatter = bb.build_backmatter_chapters(next_part=max(c["part"] for c in appendix) + 1)
    chapters = chapters + appendix + backmatter

    appendix_refs = bb._appendix_letter_map(chapters)
    bare_refs = bb._bare_flagship_page_map(chapters)
    web_refs = bb._web_redirect_map()
    for c in chapters:
        c["body_md"] = bb._resolve_appendix_refs_md(c["body_md"], appendix_refs, bare_refs, web_refs)

    _registry, page_anchor_maps = bb._harvest_concept_tags(chapters)
    bb._collect_glossary(chapters)
    chapters, _ref_map, _floats = bb._insert_list_of_floats(chapters, page_anchor_maps, for_print=False)

    # `compute_word_counts` renders each page through the shared renderer, and the renderer's citation
    # state is module-global: a cite key whose note has already been emitted renders as a bare superscript
    # the second time, which counts shorter. The build's own count runs on a freshly reset state (the last
    # iteration of its render loop leaves one behind), so reset here too — without this the totals come in
    # several thousand words light.
    last = chapters[-1]
    bb._number_citations(last["slug"], last["body_md"])
    return bb.compute_word_counts(chapters)


def band_verdict(total: int, band: int) -> str:
    """One line: total including appendices against the author's target."""
    delta = total - band
    pct = 100.0 * delta / band
    direction = "OVER" if delta > 0 else "UNDER" if delta < 0 else "EXACTLY AT"
    if delta == 0:
        return f"TOTAL (including appendices): {total:,} words — EXACTLY AT the {band:,}-word target."
    return (f"TOTAL (including appendices): {total:,} words — {abs(delta):,} {direction} "
            f"the {band:,}-word target ({pct:+.1f}%).")


def as_json(wc: "bb.WordCounts", band: int) -> dict:
    """The build's report schema, with an optional CLI target override."""
    return bb.word_counts_as_json(wc, band)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--json", action="store_true",
                    help="emit the counts as JSON instead of the printed breakdown")
    ap.add_argument("--headline", action="store_true",
                    help="print only the TOTAL-against-target line, no breakdown")
    ap.add_argument("--band", type=int, default=RECOMMENDED_TOTAL_WORDS, metavar="N",
                    help=f"total-word target including appendices (default {RECOMMENDED_TOTAL_WORDS:,})")
    args = ap.parse_args(argv)
    if args.band <= 0:
        ap.error("--band must be a positive total-word target")

    wc = book_word_counts()
    if args.json:
        print(json.dumps(as_json(wc, args.band), indent=2, ensure_ascii=False))
        return 0
    print(band_verdict(wc.total, args.band))
    if not args.headline:
        print()
        bb._print_word_counts(wc, args.band)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
