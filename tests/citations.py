"""Citation-subsystem gates — the enforcement half of the bibliography design
(book/_design/bibliography-subsystem-260801.md §8-§9). Each gate pins one invariant (BIB-N) and reads the
build's OWN single sources of truth (the cite-marker regexes, references.bib, citations.json) so it cannot
drift from what the build parses/renders.

The gates:
  CITE-RESOLVE  (BIB-2, BLOCKING) — every `[cite: key]` resolves to a references.bib entry.
  CITE-FRESH    (BIB-6, BLOCKING) — citations.json is in sync with references.bib (stamp hash) and covers
                                    every key (no partial render).
  CITE-ORPHAN   (decision #4, AUDIT-ONLY) — a .bib entry nothing cites is a warning, never fatal.
  CITE-MIRROR   (BIB-4, BLOCKING) — in built HTML, each citation superscript links to a Works-Cited entry
                                    that exists, and a chapter's entries are numbered 1..K contiguously.
  CITE-SYMBOLOGY(BIB-7, BLOCKING) — citation markers render as digits, editorial notes as symbols; the
                                    two glyph sets are disjoint.
  SCHOLAR-META  (BIB-8, BLOCKING) — every chapter page's <head> carries the required highwire citation_*
                                    tags.
"""
from __future__ import annotations

import glob
import hashlib
import os
import re
import sys as _sys

from tests.common import FAIL, PASS, ROOT, rel

_BOOK = os.path.join(ROOT, "book")
if _BOOK not in _sys.path:
    _sys.path.insert(0, _BOOK)
import build_book as bb  # noqa: E402 — the build owns the cite-marker vocabulary + slug discovery
import render_citations as rc  # noqa: E402 — the renderer owns the BibTeX parse + freshness hash

_REFERENCES_BIB = os.path.join(_BOOK, "references.bib")
_CITATIONS_JSON = os.path.join(_BOOK, "data", "citations.json")
# The generated (non-chapter) book pages — excluded from the chapter-scoped Scholar-meta gate.
_GENERATED = {"index", "book-index", "catalogue-figure", "figures", "bibliography", "list-of-figures"}


def _all_book_md_files() -> list[str]:
    """Every book chapter-source markdown — front matter, the six numbered parts, AND back matter. (The
    data-claims lint's helper globs only `part*`; citations also live in the preface, the Reflections
    chapters, and the colophon, so this covers all chapter dirs.)"""
    out: list[str] = []
    for sub in ("frontmatter", "part1", "part2", "part3", "part4", "part5", "part6", "part7"):
        out += glob.glob(os.path.join(_BOOK, sub, "*.md"))
    return sorted(out)


def _bib_keys() -> set[str]:
    if not os.path.isfile(_REFERENCES_BIB):
        return set()
    text = open(_REFERENCES_BIB, encoding="utf-8").read()
    return {e["key"] for e in rc.parse_bib(text)}


def _built_chapter_pages() -> list[str]:
    """Every built book chapter/appendix HTML page (the pages that carry citation markers + Scholar meta) —
    the build's own slug discovery minus the generated index/figure/bibliography pages."""
    try:
        slugs = bb.expected_page_slugs() - _GENERATED
    except Exception:  # noqa: BLE001 — discovery needs the tree; a bare checkout returns nothing to scan
        return []
    return [os.path.join(_BOOK, f"{s}.html") for s in sorted(slugs)
            if os.path.isfile(os.path.join(_BOOK, f"{s}.html"))]


def check_cite_resolve():
    """BIB-2 (BLOCKING). Every `[cite: key]` across all chapter sources names a key present in
    references.bib. An unknown key fails the build loud (the pattern the `[data:]` / `{{token}}` resolvers
    use) — a rotted citation must stop the build, not ship a dead reference. (The build itself also fails
    loud at render time; this is the source-side backstop that also covers keys behind a not-yet-rendered
    surface.)"""
    keys = _bib_keys()
    if not keys:
        return PASS, ["no references.bib — nothing to resolve"]
    issues: list[str] = []
    for f in _all_book_md_files():
        text = open(f, encoding="utf-8").read()
        for k in bb.iter_cite_keys(text):
            if k not in keys:
                issues.append(f"{rel(f)}: [cite: {k}] names no entry in references.bib")
    return (FAIL if issues else PASS), issues


def check_cite_fresh():
    """BIB-6 (BLOCKING). citations.json is in sync with references.bib: its stored stamp hash equals a
    fresh sha256 of the .bib, AND every .bib key is present (no partial render). A mismatch means someone
    edited references.bib without re-running the renderer — fail with the regenerate instruction, mirroring
    the committed-HTML / mermaid-cache freshness discipline."""
    if not os.path.isfile(_REFERENCES_BIB):
        return PASS, ["no references.bib — nothing to check"]
    if not os.path.isfile(_CITATIONS_JSON):
        return FAIL, ["book/data/citations.json missing — run `python3 book/render_citations.py`"]
    import json
    bib_text = open(_REFERENCES_BIB, encoding="utf-8").read()
    fresh = hashlib.sha256(bib_text.encode("utf-8")).hexdigest()
    payload = json.load(open(_CITATIONS_JSON, encoding="utf-8"))
    stored = payload.get("_stamp", {}).get("bib_sha256")
    issues: list[str] = []
    if stored != fresh:
        issues.append(f"citations.json is STALE (stamp {str(stored)[:12]}… != references.bib "
                      f"{fresh[:12]}…) — run `python3 book/render_citations.py`")
    rendered = set(payload.get("citations", {}))
    missing = _bib_keys() - rendered
    for k in sorted(missing):
        issues.append(f"citations.json is missing rendered strings for {k!r} (partial render — re-run "
                      f"render_citations.py)")
    return (FAIL if issues else PASS), issues


def check_cite_orphans():
    """Decision #4 (AUDIT-ONLY). A references.bib entry that nothing cites is a warning, not a failure — a
    bibliography may legitimately carry a work only its end-of-book list references. Reports the uncited
    keys so an author can prune a tight bib or ignore the note."""
    keys = _bib_keys()
    if not keys:
        return PASS, []
    cited: set[str] = set()
    for f in _all_book_md_files():
        cited.update(bb.iter_cite_keys(open(f, encoding="utf-8").read()))
    orphans = sorted(keys - cited)
    return (FAIL if orphans else PASS), [f"WARN {k!r} is in references.bib but nothing cites [cite: {k}]"
                                         for k in orphans]


_CITE_SUP_RE = re.compile(r'<sup class="cite-ref"><a href="#(wc-[a-z0-9-]+)"[^>]*>(\d+)</a></sup>')
_WC_ID_RE = re.compile(r'<li id="(wc-[a-z0-9-]+)">')
_NOTE_SUP_RE = re.compile(r'<sup class="note-ref"[^>]*>([^<]+)</sup>')


def check_cite_mirror():
    """BIB-4 (BLOCKING). In every built chapter page: each citation superscript links to a Works-Cited
    entry id that exists on the page, and the page's Works-Cited entries are numbered 1..K contiguously (so
    superscript N always addresses entry N). Walks the rendered HTML."""
    issues: list[str] = []
    for f in _built_chapter_pages():
        html = open(f, encoding="utf-8").read()
        entry_ids = set(_WC_ID_RE.findall(html))
        ns_nums: dict[str, set[int]] = {}
        for target, num in _CITE_SUP_RE.findall(html):
            if target not in entry_ids:
                issues.append(f"{rel(f)}: citation superscript → #{target} but no Works-Cited entry has that id")
            ns = target.rsplit("-", 1)[0]
            ns_nums.setdefault(ns, set())
            ns_nums[ns].add(int(target.rsplit("-", 1)[1]))
        # Contiguity: the entry ids present must be exactly 1..K for their namespace.
        by_ns: dict[str, set[int]] = {}
        for eid in entry_ids:
            ns, n = eid.rsplit("-", 1)
            by_ns.setdefault(ns, set()).add(int(n))
        for ns, nums in by_ns.items():
            if nums and nums != set(range(1, max(nums) + 1)):
                issues.append(f"{rel(f)}: Works-Cited entries for {ns} are not 1..K contiguous: {sorted(nums)}")
    return (FAIL if issues else PASS), issues


def check_cite_symbology():
    """BIB-7 (BLOCKING). Citation superscripts render as DIGITS; editorial-note superscripts render as
    SYMBOLS from the note glyph set (* † ‡ § ‖ ¶, possibly doubled). The two sets are disjoint — a reader
    can never confuse a citation for a note. Asserts it over the built HTML."""
    note_glyphs = set(bb._NOTE_GLYPHS)
    issues: list[str] = []
    for f in _built_chapter_pages():
        html = open(f, encoding="utf-8").read()
        for _target, num in _CITE_SUP_RE.findall(html):
            if not num.isdigit():
                issues.append(f"{rel(f)}: citation superscript {num!r} is not numeric")
        for glyph in _NOTE_SUP_RE.findall(html):
            if any(ch.isdigit() for ch in glyph) or not set(glyph) <= note_glyphs:
                issues.append(f"{rel(f)}: editorial-note superscript {glyph!r} is not a note glyph "
                              f"(must be from {''.join(bb._NOTE_GLYPHS)})")
    return (FAIL if issues else PASS), issues


def check_cite_parity():
    """BIB-5 (BLOCKING). The two surfaces render the SAME reference data. It holds by construction — the
    HTML reads citations.json, which render_citations.py produced from references.bib via Typst, and the
    PDF renders the SAME references.bib natively through the SAME Typst engine, so the PDF's strings equal
    the JSON strings (which CITE-FRESH pins to the .bib). This gate asserts the two structural preconditions
    of that guarantee: the emitted Typst document (a) cites every corpus key via `#cite(<key>)`, and (b)
    draws its bibliography from the same references.bib. A key cited in prose but absent from the Typst
    projection — or a Typst bibliography pointed at a different file — would break parity."""
    corpus_keys = sorted({k for f in _all_book_md_files()
                          for k in bb.iter_cite_keys(open(f, encoding="utf-8").read())})
    if not corpus_keys:
        return PASS, ["no [cite:] markers — parity holds vacuously"]
    try:
        import book_typst  # noqa: PLC0415 — heavy import; only needed when the corpus cites
        # PRINT projection (for_print=True) — the slug list must match what emit_document renders internally
        # (also the print projection), so an appendix page the print edition drops (e.g. the Appendix E
        # recipe under the pointer collapse) is not requested as an unknown chapter.
        doc = book_typst.ir.parse_book(include_appendices=True, for_print=True)
        typ = book_typst.emit_document([c.slug for c in doc.chapters], with_frontmatter=True)
    except Exception as e:  # noqa: BLE001 — a Typst-emit failure is itself a parity finding
        return FAIL, [f"could not emit the Typst projection to check parity: {e}"]
    issues: list[str] = []
    for k in corpus_keys:
        if f"#cite(<{k}>)" not in typ and f"#cite(<{k}>," not in typ:
            issues.append(f"key {k!r} is cited in prose but the Typst (PDF) projection has no #cite(<{k}>) "
                          f"— the surfaces would diverge")
    if "references.bib" not in typ:
        issues.append("the Typst projection cites works but its #bibliography does not draw from "
                      "references.bib — the PDF would render from a different source than the web book")
    return (FAIL if issues else PASS), issues


_REQUIRED_META = ("citation_title", "citation_author", "citation_book_title",
                  "citation_publication_date", "citation_fulltext_html_url", "citation_pdf_url")


def check_scholar_meta():
    """BIB-8 (BLOCKING). Every built chapter page's <head> carries the required highwire_press citation_*
    tags, so Google Scholar can index the book and build its citation graph. Reads the page's <head> and
    asserts each required tag is present."""
    issues: list[str] = []
    for f in _built_chapter_pages():
        html = open(f, encoding="utf-8").read()
        head = html.split("</head>", 1)[0]
        names = set(re.findall(r'<meta name="(citation_[a-z_]+)"', head))
        for req in _REQUIRED_META:
            if req not in names:
                issues.append(f"{rel(f)}: <head> missing highwire meta {req!r}")
    return (FAIL if issues else PASS), issues
