"""LINT `stray-book-comment` — every `<!-- … -->` in the book source must be a RECOGNIZED notation marker.

THE LEAK CLASS.  The book source uses an HTML-comment notation the build consumes and renders (a
`<!-- figure: … -->`, a `<!-- point: … -->`, a `<!-- table: … -->`, …). A comment whose leading token is
NOT in that vocabulary — a stray authoring `<!-- TODO(…) … -->`, a bare note, a typo'd `<!-- pont: … -->` —
is consumed by NOTHING. It then leaks: into the web page as an invisible raw HTML comment, and into the
Typst/PDF projection (which has no lone-comment passthrough) as VISIBLE prose text the reader sees. Two such
strays shipped visible in the print edition before this gate existed.

THE CHECK.  Scan every rendered book-source `.md` (front matter, the five Parts, back matter, and the
appendix content dirs), skipping fenced + inline code so a comment SHOWN as an example is never flagged. For
each `<!-- … -->`, take its leading token and require it to be a recognized decorator. A stray is a finding
— pointing the author at the exact `file:line` to delete or fix BEFORE it reaches the reader.

SINGLE SOURCE OF TRUTH.  The recognized set is `build_book.MARKER_KEYWORDS` (the render vocabulary SSOT
the notation-leak gate also reads — CLAUDE.md's stable-check-reads-the-SSOT discipline), plus `noqa`, the
lint-suppression directive that is deliberately outside the render vocabulary (it is consumed as an inert
directive and must never be flagged). A notation added to the build auto-extends this gate; there is no
second hand-maintained copy.

Run `python3 book-models/lint_stray_comments.py` (audit-only, exit 0) or `--strict` (exit 1 on any finding).
The render-time strip in `build_book`/`book_typst` is the backstop; this lint is the front line that
keeps the source clean, so on a clean tree it reports nothing and can gate blocking.
"""
from __future__ import annotations

import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
_BOOK_DIR = os.path.join(_ROOT, "book")
if _BOOK_DIR not in sys.path:
    sys.path.insert(0, _BOOK_DIR)

import build_book as bb  # noqa: E402 — path set above; the render-vocabulary SSOT (MARKER_KEYWORDS)

#: The recognized decorator vocabulary: the render SSOT plus `noqa`. A comment whose leading token is not in
#: this set is a stray. `noqa` is a lint-suppression directive consumed as an inert marker — outside the
#: render vocabulary by design (the notation-leak gate excludes it too), so it is named here, not in the SSOT.
RECOGNIZED: "frozenset[str]" = frozenset(bb.MARKER_KEYWORDS) | {"noqa"}

#: One whole HTML comment, non-greedy + DOTALL so a MULTI-line authoring note is captured whole.
_COMMENT_RE = re.compile(r"<!--(.*?)-->", re.S)
#: An inline code span — its contents may SHOW comment syntax as an example and must not be scanned.
_INLINE_CODE_RE = re.compile(r"`[^`]*`")
#: The leading identifier token of a comment's inner text (a decorator keyword is `[a-z0-9-]+`; a stray like
#: `TODO(data)` yields `todo`, a prose note like `The concept-primer…` yields `the` — both unrecognized).
_LEAD_TOKEN_RE = re.compile(r"[A-Za-z0-9_-]+")

#: The book-source content roots — front/Parts/back (from the build's `_PART_DIRS` SSOT) plus the appendix
#: content dirs. NON-rendered trees (node_modules, drafts, transcripts, top-level docs) are out of scope.
_APPENDIX_DIRS = ("appendix-fills", "appendix-stacks", "appendix-skill-recipe")


def _content_files() -> "list[str]":
    """Every rendered book-source `.md`, sorted. Chapter dirs come from `build_book._PART_DIRS` (the
    render SSOT for which dir holds each Part); the appendix content dirs are walked recursively."""
    out: "list[str]" = []
    for d in bb._PART_DIRS.values():
        root = os.path.join(_BOOK_DIR, d)
        if os.path.isdir(root):
            out += [os.path.join(root, f) for f in os.listdir(root) if f.endswith(".md")]
    for d in _APPENDIX_DIRS:
        for dirpath, _dirs, files in os.walk(os.path.join(_BOOK_DIR, d)):
            out += [os.path.join(dirpath, f) for f in files if f.endswith(".md")]
    return sorted(out)


def _strip_code(text: str) -> str:
    """Blank out fenced code blocks (line-based, preserving line numbers) and inline code spans, so a comment
    shown as an example inside code is never scanned as a live marker."""
    out_lines: "list[str]" = []
    in_fence = False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            out_lines.append("")
            continue
        out_lines.append("" if in_fence else _INLINE_CODE_RE.sub("", line))
    return "\n".join(out_lines)


def _lead_token(inner: str) -> str:
    """The comment's leading identifier token, lowercased (or "" if the comment opens on punctuation)."""
    m = _LEAD_TOKEN_RE.match(inner.strip())
    return m.group(0).lower() if m else ""


def findings() -> "list[str]":
    """Every stray comment in the book source: a `<!-- … -->` whose leading token is not a recognized
    decorator. Reports `file:line — <token>: <preview>` so the author can act on the exact site."""
    out: "list[str]" = []
    for path in _content_files():
        with open(path, encoding="utf-8") as fh:
            raw = fh.read()
        scan = _strip_code(raw)
        rel = os.path.relpath(path, _ROOT)
        for m in _COMMENT_RE.finditer(scan):
            inner = m.group(1).strip()
            token = _lead_token(inner)
            if token in RECOGNIZED:
                continue
            line = scan.count("\n", 0, m.start()) + 1
            preview = " ".join(inner.split())[:70]
            out.append(f"STRAY {rel}:{line} — <!-- {token or '?'}: … -->  {preview!r}")
    return out


def main(argv: "list[str]") -> int:
    strict = "--strict" in argv[1:]
    fs = findings()
    mode = "STRICT (exit 1 on any finding)" if strict else "AUDIT-ONLY (prints, exits 0)"
    print(f"== stray-book-comment — every book-source <!-- … --> must be a recognized decorator [{mode}] ==")
    if not fs:
        print("  clean — no stray comments; every marker is a recognized decorator")
        return 0
    print(f"  {len(fs)} finding(s):")
    for f in fs:
        print(f"    {f}")
    return 1 if strict else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
