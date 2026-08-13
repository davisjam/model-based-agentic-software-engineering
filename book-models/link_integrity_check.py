"""WHOLE-BOOK link-integrity check — the primary correctness net for a chapter renumber.

A chapter cross-reference in the book is a hardcoded href to a built page: `](5.4-the-built-system.html)`.
When a chapter is renumbered (`5.3-…` → `5.4-…`) every inbound link that still names the old number
DANGLES. No other standing gate catches this at the SOURCE: the build's reachability gate finds ORPHANS
(a built page nothing links to), the reverse of a dangling link, and the whole-site HTML link scanner only
runs after a full rebuild. This check scans the markdown SOURCE across the WHOLE book and asserts every
number-bearing chapter link — and every `{{part:N}}` token — resolves to a live chapter slug or part.

WHY WHOLE-BOOK, NOT PART-SCOPED. A renumber in Part 1/4/5 is linked INTO from Part 3 and Part 6 (and the
appendices). A grep scoped to the renumbered Parts misses those cross-facet inbound links, so this walks
every `book/frontmatter/*.md`, `book/part*/*.md`, and `book/appendix*/**/*.md`.

RESOLUTION MODEL (matches the flat build layout — `build_book.py` renders `book/<basename>.html`):
  - A NUMBERED target (`^\\d+\\.\\d+-…` — every body chapter 1.x–6.x, the frontmatter 0.x, the backmatter
    7.x) must match a chapter SOURCE basename stem on disk. Deriving the valid set from the *sources* (not
    the built `.html`) makes the check RENUMBER-AWARE: a link to a stale number fails even while the stale
    `.html` still sits on disk before the next rebuild. This is exactly the class a renumber breaks.
  - A `{{part:N}}` token must name a numbered Part that exists (`book/partN/`).

SCOPE — numbered chapters only, on purpose. A renumber moves only numbered chapters; appendix / stack /
mechanism cross-references (`appendix-<a..e>-<slug>.html`) are NOT renumbered and are REWRITTEN by the
build (`_redirect_dropped_appendix_links` sends a non-flagship mechanism link to its live web entry), so a
source-side literal check would false-flag every one of them. Those links are validated post-build by the
whole-site HTML link scanner (`tests/html.py::check_html_links`, BLOCKING). This check owns the one class
that gate cannot see at the source and that the renumber actually endangers.

SECOND FINDINGS-FUNCTION — NAMED-REFERENCE INTEGRITY (C5, round-8 W1, AUDIT-ONLY).  `findings()` above
proves an HREF resolves; `close_label_findings()` below proves a NAMED conceptual destination in the Part-IV
"portable moves" close still MATCHES the destination's CURRENT identity — a chapter TITLE (via
`chapter_identity_model`) or an operator-card TITLE (`operator-cards.json`). The close cites destinations by
name — `[The Governed Environment](3.3-…)`, `[Brownfield Progress](appendix-d-…)` — and a renamed chapter or
card leaves the label stale: the nav representation disagrees with the book (map::territory drift IN the
manuscript). This is the anchor check's analogue for named conceptual destinations. It CONSUMES the two
existing identity resolvers (builds no new one, §G-5) and sanctions legitimate short-forms through a small
alias registry. Landed AUDIT-ONLY-first (rule #55 — findings open at W1 landing); the round-8 W3 fix-wave
drained the one open finding (the 'Brownfield Progress' → 'Brownfield Progress Gauge' card rename) to 0, so
it is now PROMOTED TO BLOCKING. Scope: the "Closing the Part" close only (widen to the Engineer's Day card
refs later).

Run `python3 book-models/link_integrity_check.py` — exit 0 (clean) or 1; it lists every dangling anchor ref
AND folds any stale close-label finding into the non-zero exit (BLOCKING as of round-8 W3). Wired into
`catalog.py test` as a BLOCKING chapter-link check (tests/book_models.py::check_link_integrity) plus the
now-BLOCKING close-label check (tests/book_models.py::check_close_label_integrity).
"""
from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
_BOOK = os.path.join(_ROOT, "book")

#: A numbered-chapter slug stem: `5.4-the-built-system`, `0.1-the-mage-method-at-a-glance`, `7.2-colophon`.
_NUMBERED_RE = re.compile(r"^\d+\.\d+-")
#: The part-intro landing stem the build emits — `00-part-intro.md` is NOT a linkable chapter slug.
_PART_INTRO_STEM = "00-part-intro"

#: An href/src markdown link or raw attribute to a `.html` page. Captures the target (minus the `#anchor`).
#: Matches `](target.html)`, `](target.html#a)`, `href="target.html"`, `src="target.html"`. Skips absolute
#: URLs (they carry `://`).
_LINK_RE = re.compile(r'(?:\]\(|href="|src=")\s*(?!https?:|mailto:|#)([A-Za-z0-9][\w./-]*?)\.html(?:#[^)"\s]*)?(?:\)|")')
#: A `{{part:N}}` substitution token.
_PART_TOKEN_RE = re.compile(r"\{\{\s*part:\s*(\d+)\s*\}\}")


@dataclass
class DanglingRef:
    file: str      # book-relative path
    line: int
    target: str    # the unresolved slug (e.g. `5.3-the-built-system`) or `{{part:7}}`
    kind: str      # "chapter" | "part"


# ---- the valid-target universe ----------------------------------------------------------------------

def _source_chapter_dirs() -> "list[str]":
    dirs = [os.path.join(_BOOK, "frontmatter")]
    for n in range(1, 8):
        d = os.path.join(_BOOK, f"part{n}")
        if os.path.isdir(d):
            dirs.append(d)
    return [d for d in dirs if os.path.isdir(d)]


def valid_chapter_slugs() -> "set[str]":
    """Every live chapter slug — the basename stem of each chapter SOURCE `.md` under frontmatter/ + partN/,
    excluding the per-Part intro. Derived from sources, so it tracks a renumber the instant a file moves."""
    slugs: "set[str]" = set()
    for d in _source_chapter_dirs():
        for fn in os.listdir(d):
            if fn.endswith(".md") and fn[:-3] != _PART_INTRO_STEM:
                slugs.add(fn[:-3])
    return slugs


def valid_parts() -> "set[int]":
    """The numbered Parts a `{{part:N}}` token may name — a `book/partN/` dir that exists (1..6 in the book)."""
    return {n for n in range(1, 8) if os.path.isdir(os.path.join(_BOOK, f"part{n}"))}


# ---- the scan ---------------------------------------------------------------------------------------

def _scanned_files() -> "list[str]":
    """Every markdown source the whole-book scan covers: frontmatter, all Parts, and the appendix trees."""
    files: "list[str]" = []
    for d in _source_chapter_dirs():
        for fn in sorted(os.listdir(d)):
            if fn.endswith(".md"):
                files.append(os.path.join(d, fn))
    for entry in sorted(os.listdir(_BOOK)):
        p = os.path.join(_BOOK, entry)
        if os.path.isdir(p) and entry.startswith("appendix"):
            for root_, _dirs, fns in os.walk(p):
                for fn in sorted(fns):
                    if fn.endswith(".md"):
                        files.append(os.path.join(root_, fn))
    return files


def findings() -> "list[DanglingRef]":
    """Walk every scanned source and return one DanglingRef per unresolved chapter link or `{{part:N}}`
    token. Empty ⇒ the whole book's number-bearing links resolve."""
    chapters = valid_chapter_slugs()
    parts = valid_parts()
    out: "list[DanglingRef]" = []
    for path in _scanned_files():
        rel = os.path.relpath(path, _BOOK)
        text = open(path, encoding="utf-8").read()
        for m in _LINK_RE.finditer(text):
            # A link may carry a path prefix (rare in the flat book) — resolve on the basename stem.
            target = os.path.basename(m.group(1).lstrip("./"))
            if _NUMBERED_RE.match(target) and target not in chapters:
                line = text.count("\n", 0, m.start()) + 1
                out.append(DanglingRef(rel, line, target, "chapter"))
        for m in _PART_TOKEN_RE.finditer(text):
            n = int(m.group(1))
            if n not in parts:
                line = text.count("\n", 0, m.start()) + 1
                out.append(DanglingRef(rel, line, f"{{{{part:{n}}}}}", "part"))
    return out


# ---- C5: named-reference -> current-identity, for the Part-IV "portable moves" close (AUDIT-ONLY) ----

#: The close whose named destinations are audited. The span runs from the close heading to end-of-file, so it
#: covers BOTH the portable-moves close (patterns / anti-patterns / heuristics / checklists) AND the trailing
#: Engineer's Day section. The former bound stopped at '## The Engineer', which SILENTLY skipped the
#: Engineer's Day card refs (that is where the `[Daily Review]` label drifted from its card's 'Daily Operator
#: Review' title unchecked); widening to EOF label-checks every named card/appendix destination in Part IV's tail.
_CLOSE_FILE = "part4/4.6-portable-moves.md"
_CLOSE_START = "# Closing"
_CLOSE_END = None  # None ⇒ scan to end-of-file (the close is Part IV's last region)
#: A `[label](slug.html[#anchor])` link whose slug is a numbered chapter stem or an appendix-D card page.
_CLOSE_LINK_RE = re.compile(r"\[([^\]]+)\]\((appendix-d-[a-z0-9-]+|\d+\.\d+-[a-z0-9-]+)\.html(?:#[^)\s]*)?\)")
#: `appendix-d-<card-id>.html` names an operator card; the id is the slug after this prefix.
_APPENDIX_D_PREFIX = "appendix-d-"
#: SANCTIONED short-forms — a close label that legitimately abbreviates its destination's full identity,
#: keyed by (label, destination-slug). The Governed Environment's title carries a ": Ex-Ante and Ex-Post"
#: subtitle; the base name is the canonical short reference. Everything else that mismatches is a finding for
#: the W3 fix-wave (e.g. 'Brownfield Progress' -> the 'Brownfield Progress Gauge' operator card).
_CLOSE_LABEL_ALIASES: "frozenset[tuple[str, str]]" = frozenset()


def _operator_card_titles() -> "dict[str, str]":
    """card-id -> title, from operator-cards.json (the operator-card identity source C5 consumes)."""
    with open(os.path.join(_HERE, "operator-cards.json"), encoding="utf-8") as fh:
        return {c["card-id"]: c["title"] for c in json.load(fh).get("cards", [])}


def _appendix_d_page_titles() -> "dict[str, str]":
    """slug -> display title for EVERY Appendix-D page — the 10-card operator deck AND the non-card reference
    pages (the Operator's Dashboard, the Brownfield Migration Drill). Read from the renderer's
    `_OPERATORS_REFERENCE_PAGES`, the authoritative slug->title list both the web and print projections share.
    Resolving an `appendix-d-*` close label against THIS (not just the 10 cards) stops a link to a NON-card
    Appendix-D page from resolving to None and being silently skipped — the operators-dashboard silent-skip class."""
    if _BOOK not in sys.path:
        sys.path.insert(0, _BOOK)
    import build_book as bbh  # noqa: E402 — the renderer owns _OPERATORS_REFERENCE_PAGES (slug->title SSOT)
    return {slug: title for slug, title in bbh._OPERATORS_REFERENCE_PAGES}


def close_label_findings() -> "list[str]":
    """Every close label whose named destination no longer matches its CURRENT identity (a chapter title or
    an operator-card title), minus the sanctioned short-forms. AUDIT-ONLY. Empty ⇒ every named destination in
    the close still names its target by the target's current identity."""
    if _HERE not in sys.path:
        sys.path.insert(0, _HERE)
    import chapter_identity_model as ci  # noqa: E402 — sibling identity resolver (consumed, not rebuilt)

    cards = _operator_card_titles()
    ad_pages = _appendix_d_page_titles()
    path = os.path.join(_BOOK, _CLOSE_FILE)
    lines = open(path, encoding="utf-8").read().split("\n")
    start = next((i for i, l in enumerate(lines) if l.startswith(_CLOSE_START)), None)
    if start is None:
        return []
    end = len(lines) if _CLOSE_END is None else next(
        (i for i, l in enumerate(lines) if i > start and l.startswith(_CLOSE_END)), len(lines))

    out: "list[str]" = []
    for off in range(start, end):
        for m in _CLOSE_LINK_RE.finditer(lines[off]):
            label, slug = m.group(1), m.group(2)
            if slug.startswith(_APPENDIX_D_PREFIX):
                stem = slug[len(_APPENDIX_D_PREFIX):]
                ident = cards.get(stem) or ad_pages.get(stem)   # card title, else non-card Appendix-D page title
                kind = "operator card" if stem in cards else "Appendix-D page"
            else:
                lab = ci.label_for_slug(slug)
                ident = ci.title(lab) if lab else None
                kind = "chapter"
            if ident is None or label == ident or (label, slug) in _CLOSE_LABEL_ALIASES:
                continue
            out.append(f"{_CLOSE_FILE}:{off + 1}: close label {label!r} names the {kind} whose current "
                       f"identity is {ident!r} — update the label to the current name, point it at the "
                       f"named card/appendix, or register a sanctioned short-form alias")
    return out


def _print_close_label_audit() -> None:
    """Print the C5 close-label findings. BLOCKING as of round-8 W3 — folded into main()'s exit code."""
    cl = close_label_findings()
    if not cl:
        print("close-label integrity (BLOCKING): 0 stale named destinations in the Part-IV close")
        return
    print(f"close-label integrity (BLOCKING): {len(cl)} stale named destination(s) in the Part-IV close:")
    for f in cl:
        print(f"  {f}")


def main(argv: "list[str]") -> int:
    fs = findings()
    cl = close_label_findings()
    n_files = len(_scanned_files())
    if not fs:
        print(f"link-integrity: 0 dangling refs across {n_files} book source files "
              f"({len(valid_chapter_slugs())} live chapter slugs)")
    else:
        print(f"link-integrity: {len(fs)} DANGLING ref(s) across {n_files} book source files:")
        for f in fs:
            print(f"  {f.file}:{f.line} -> {f.target} ({f.kind})")
    _print_close_label_audit()
    # Both nets are BLOCKING (close-label promoted round-8 W3): non-zero exit if EITHER has a finding.
    return 1 if (fs or cl) else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
