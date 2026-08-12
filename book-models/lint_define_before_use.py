"""LINT `define-before-use` — a glossary/concept TERM must be DEFINED no later than the page that first USES it.

WHAT IT EXTENDS.  The claims model already holds a `C1` site-resolution check: every `home` / `asserted_at`
claim site must resolve to a real outline unit. That check governs the CLAIMS class and asks "does this site
exist?". This lint carries the same discipline to the glossary/concept TERM class and to the next question —
ORDERING: "is the term defined before the chapter that uses it?" A term whose canonical definition sits in a
LATER page than a page that already uses it strands the reader (the "middle-range theory" case: used in the
theory chapter's opening while defined only later, until the front glossary reconciled it).

DEFINITION SITE.  A concept's canonical `index-def`, OR the FRONT GLOSSARY when the term is registered there
(`_GLOSS_TERM_SLUGS`). The front glossary is front matter, which precedes every chapter, so a front-glossary
term is always define-first — the earliest of the two definition positions wins. This is why registering
"middle-range theory" in the glossary reconciled its stranding: a body-chapter definition is no longer the
term's earliest one.

USE SITE — TRACKED USES ONLY (honest scope).  Uses come from the book's own `index-example` tags, harvested
by the same reading-order walk the site build uses (`_harvest_concept_tags`). We key off these AUTHORED use
markers, never a raw-prose grep: a raw first-mention scan false-positives on every passing mention, and a
fuzzy match cannot tell a definition from a use. So a term's FIRST undecorated prose mention is OUT OF SCOPE —
the same tracked-only limitation the concepts model already accepts. The lint catches a stranding only where
the book has tagged the earlier use.

ORDERING GRANULARITY.  Position is the page's reading-order ordinal — the `_discover_chapters` filename-prefix
order (front matter → body → back matter), with the projected appendix appended last, exactly the sequence
`build()` walks. A use in the SAME page as the definition is fine (the comparison is `def_pos ≤ use_pos`);
within-page paragraph order is not arbitrated here.

The lint imports nothing beyond the standard library and the book renderer (which owns the harvest + the
reading order), matching `catalog.py`'s clone-and-run posture. Run `python3 book-models/lint_define_before_use.py`
for the full report (exit 1 on any finding).
"""
from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass

_HERE = os.path.dirname(os.path.abspath(__file__))
_BOOK = os.path.join(os.path.dirname(_HERE), "book")
if _BOOK not in sys.path:
    sys.path.insert(0, _BOOK)
import build_book as bbh  # noqa: E402 — the renderer owns the index-def/-example harvest + reading order


@dataclass
class Finding:
    """One term used before it is defined: its canonical definition page sits LATER in reading order than the
    page carrying its earliest tracked use."""
    slug: str
    display: str
    def_page: str
    def_pos: int
    use_page: str
    use_pos: int


def _ordered_chapters() -> "list[dict]":
    """The book's pages in READING ORDER — front matter → body → back matter → the projected appendix — exactly
    the sequence `build()` harvests. A page's index in this list IS its book-position (the ordinal the ordering
    check compares), so definition and use positions read off the same order the reader experiences."""
    metrics = bbh._load_metrics()
    chapters = bbh._discover_chapters(metrics)
    max_part = max(c["part"] for c in chapters)
    chapters = chapters + bbh.build_appendix_chapters(next_part=max_part + 1)
    return chapters


def findings() -> "list[Finding]":
    """Every tracked concept whose canonical DEFINITION page follows a page that already USES it.

    Keys off the same `_harvest_concept_tags` registry the site build consumes: `def` is the concept's
    canonical `index-def` `(page, anchor)`; `examples` are its `index-example` tags (the tracked use sites).
    A concept with a front-glossary entry is credited a definition at the glossary's (front-matter) position,
    so it can never strand. Only concepts carrying ≥1 tracked use are considered."""
    chapters = _ordered_chapters()
    pos = {c["slug"]: i for i, c in enumerate(chapters)}
    registry, _ = bbh._harvest_concept_tags(chapters)
    glossary_slugs = set(bbh._GLOSS_TERM_SLUGS.values())
    # The glossary chapter is named by its identity LABEL now; resolve it to the numbered stem `pos` keys on.
    _glossary_stem = bbh._chapter_stem_for(bbh.GLOSSARY_CHAPTER_LABEL)
    glossary_pos = pos.get(_glossary_stem)

    out: "list[Finding]" = []
    for slug, slot in sorted(registry.items()):
        uses = slot.get("examples") or []
        if not uses:
            continue  # no tracked use → nothing to order

        # Candidate definition sites, each (position, page). The earliest wins — a front-glossary entry is a
        # front-matter definition that outranks any later `index-def`.
        candidates: "list[tuple[int, str]]" = []
        if slug in glossary_slugs and glossary_pos is not None:
            candidates.append((glossary_pos, _glossary_stem))
        if slot.get("def"):
            def_page = slot["def"][0]["slug"]
            candidates.append((pos[def_page], def_page))
        if not candidates:
            continue  # unreachable in practice: the harvest fails loud on a use with no def

        def_pos, def_page = min(candidates, key=lambda t: t[0])
        use_page_rec, _anchor = min(uses, key=lambda e: pos[e[0]["slug"]])
        use_page = use_page_rec["slug"]
        use_pos = pos[use_page]
        if def_pos > use_pos:
            out.append(Finding(slug=slug, display=slot["display"], def_page=def_page, def_pos=def_pos,
                               use_page=use_page, use_pos=use_pos))
    return out


def summary_line(fs: "list[Finding]") -> str:
    return (f"{len(fs)} term(s) used before defined "
            f"(a tracked index-example precedes the canonical index-def / front-glossary definition)")


def main(argv: "list[str] | None" = None) -> int:
    argparse.ArgumentParser(description=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter).parse_args(argv)
    fs = findings()
    print("== define-before-use — a glossary/concept term is defined no later than the page that first uses it ==")
    if not fs:
        print("  clean — every tracked concept is defined at or before its earliest tracked use")
        return 0
    print(f"  {summary_line(fs)}:")
    for f in sorted(fs, key=lambda x: x.use_pos):
        print(f"    {f.slug!r} ({f.display}) — used in {f.use_page} (page {f.use_pos}) "
              f"but defined later in {f.def_page} (page {f.def_pos})")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
