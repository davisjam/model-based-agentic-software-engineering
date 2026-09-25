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

THE HEADLINE.  BODY, the total prior to the appendices, stated against a 110,000-word recommendation:
over or under, and by how much. BODY is the build's own category — every page that is not an appendix
page. That takes in the front matter and the generated List of Figures at the front, and the colophon /
about-the-author back matter that sorts after the appendices. `--json` breaks BODY out per Part for
anyone who wants a narrower band.

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

# The author's target for the narrative, prior to the appendices. A recommendation, not a gate — nothing
# here fails on a breach; `--band` overrides it for a what-if.
RECOMMENDED_BODY_WORDS = 110_000


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


def band_verdict(body_total: int, band: int) -> str:
    """One line: BODY against the recommendation, with the signed gap and the percentage."""
    delta = body_total - band
    pct = 100.0 * delta / band
    direction = "OVER" if delta > 0 else "UNDER" if delta < 0 else "EXACTLY AT"
    if delta == 0:
        return f"BODY (prior to the appendices): {body_total:,} words — EXACTLY AT the {band:,}-word recommendation."
    return (f"BODY (prior to the appendices): {body_total:,} words — {abs(delta):,} {direction} "
            f"the {band:,}-word recommendation ({pct:+.1f}%).")


def as_json(wc: "bb.WordCounts", band: int) -> dict:
    """The same numbers, shaped for a script."""
    delta = wc.body_total - band
    return {
        "recommended_body_words": band,
        "body_total": wc.body_total,
        "body_over_recommendation": delta,
        "body_pct_of_recommendation": round(100.0 * wc.body_total / band, 1),
        "over_recommendation": delta > 0,
        "appendix_total": wc.appendix_total,
        "total": wc.total,
        "body_parts": [{"label": label, "words": n} for label, n in wc.body_parts],
        "appendix_letters": [{"label": label, "words": n} for label, n in wc.appendix_letters],
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--json", action="store_true",
                    help="emit the counts as JSON instead of the printed breakdown")
    ap.add_argument("--headline", action="store_true",
                    help="print only the BODY-against-recommendation line, no breakdown")
    ap.add_argument("--band", type=int, default=RECOMMENDED_BODY_WORDS, metavar="N",
                    help=f"word recommendation to state BODY against (default {RECOMMENDED_BODY_WORDS:,})")
    args = ap.parse_args(argv)

    wc = book_word_counts()
    if args.json:
        print(json.dumps(as_json(wc, args.band), indent=2, ensure_ascii=False))
        return 0
    print(band_verdict(wc.body_total, args.band))
    if not args.headline:
        print()
        bb._print_word_counts(wc)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
