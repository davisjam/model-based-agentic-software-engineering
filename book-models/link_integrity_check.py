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

RESOLUTION MODEL (matches the flat build layout — `build_book_html.py` renders `book/<basename>.html`):
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

Run `python3 book-models/link_integrity_check.py` — exit 0 (clean) or 1 (lists every dangling ref).
Wired into `catalog.py test` as a BLOCKING check (tests/book_models.py::check_link_integrity).
"""
from __future__ import annotations

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


def main(argv: "list[str]") -> int:
    fs = findings()
    n_files = len(_scanned_files())
    if not fs:
        print(f"link-integrity: 0 dangling refs across {n_files} book source files "
              f"({len(valid_chapter_slugs())} live chapter slugs)")
        return 0
    print(f"link-integrity: {len(fs)} DANGLING ref(s) across {n_files} book source files:")
    for f in fs:
        print(f"  {f.file}:{f.line} -> {f.target} ({f.kind})")
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
