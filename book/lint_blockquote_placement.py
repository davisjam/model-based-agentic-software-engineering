#!/usr/bin/env python3
"""LINT `blockquote-placement` — no blockquote may reach the HTML right rail by IMPLICIT inference.

THE FAILURE CLASS.  The web renderer routes a plain `>` blockquote — no marker, no recognized lead —
to the right-rail `aside-sidenote` as a silent fallback, while the print projection sets the same quote
in-column. A quote the surrounding prose grammatically depends on ("shifts from *[quote]* to *[quote]*")
then breaks mid-sentence on wide viewports: the argument's clause floats away as marginalia. Nine such
argument quotes shipped rail-floated before this gate existed.

THE PRINCIPLE.  Nothing lands in the right rail by inference — every rail-bound blockquote must be
EXPLICITLY declared. An author arms each quote with the routing it means:

  `<!-- inline-quote -->` / `<!-- epigraph -->`  — the MAIN reading column (part of the argument);
  `<!-- sidenote -->`                            — a DECLARED right-rail aside;
  a recognized lead — `**Term.**` (def-inset), `**The … Thesis.**` (thesis-box), a `### title`
  (concept-inset), or an em-led `*A footnote on …*` aside — is an explicit authored signal and passes;
  the box grammar (`box-family`, `pullquote`, `principlebox`) likewise.

SINGLE SOURCE OF TRUTH.  This lint re-implements NONE of that classification. The renderer's own
`_render_blockquote` (build_book.py) stamps its implicit-fallback path with the `quote-implicit` class;
this lint scans the BUILT chapter pages for that sentinel. The renderer's decision IS the lint's input,
so the two can never drift — a new arming marker or lead rule added to the renderer is honored here with
zero lint changes. (The web build itself calls `findings()` as a BLOCKING gate after rendering, so a
regression fails `build_book.py` / `catalog.py build` / the pre-commit hook / CI at the source.)

SCOPE.  Book prose only: the scan walks the rendered chapter pages the build emits (front matter, the
Parts, interlude, conclusion, appendices, back matter). `_design/**`, `transcripts/**`, runbooks and
READMEs are never rendered, so they are out of scope by construction.

Run `python3 book/lint_blockquote_placement.py` (audit report, exit 0; `--strict` exits 1 on findings —
mirroring `book-models/lint_stray_comments.py`). `--census` additionally reports the em-lead census: how
many rail sidenotes still rely on the em-lead convention rather than an explicit `<!-- sidenote -->`
(the count a future promote-to-explicit pass would need to re-mark).
"""
from __future__ import annotations

import argparse
import html as _htmlmod
import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))

#: The renderer's implicit-fallback sentinel (see `_render_blockquote` in build_book.py). The class list
#: opens with `aside-sidenote quote-implicit`; a `bw-*` reading-weight class may follow.
_IMPLICIT_RE = re.compile(
    r'<blockquote class="aside-sidenote quote-implicit[^"]*">(?P<body>.*?)</blockquote>', re.S)
#: The em-lead-convention rail sidenote: the EXACT bare class (declared `sidenote-declared`, `def-inset`,
#: and the implicit sentinel all carry a second class, so the bare form is exactly the em-led survivors).
_EM_LEAD_RAIL_RE = re.compile(r'<blockquote class="aside-sidenote">')
_TAG_RE = re.compile(r"<[^>]+>")

#: Source dirs searched (best-effort) to attribute a finding back to its authoring `.md`.
_SOURCE_DIR_PREFIXES = ("frontmatter", "part", "interlude", "conclusion", "appendix-", "backmatter")


def _page_files() -> "list[str]":
    """Every built book page: the flat `<slug>.html` set the build writes into `book/`. All of them are
    generated (the build overwrites each), so scanning the whole flat set is exactly the rendered book;
    the sentinel class can appear nowhere else."""
    return sorted(
        os.path.join(_HERE, f) for f in os.listdir(_HERE)
        if f.endswith(".html") and os.path.isfile(os.path.join(_HERE, f)))


def _source_hit(snippet: str) -> "str | None":
    """Best-effort source attribution: grep the book-source dirs for the finding's leading words and
    return `relpath:line` of the first `>`-prefixed hit. Purely advisory — the finding stands (with its
    page + snippet) even when the source line is not found."""
    words = snippet.split()[:5]
    if not words:
        return None
    needle = " ".join(words)
    for entry in sorted(os.listdir(_HERE)):
        if not entry.startswith(_SOURCE_DIR_PREFIXES) or not os.path.isdir(os.path.join(_HERE, entry)):
            continue
        for dirpath, _dirs, files in os.walk(os.path.join(_HERE, entry)):
            for f in sorted(files):
                if not f.endswith(".md"):
                    continue
                p = os.path.join(dirpath, f)
                with open(p, encoding="utf-8") as fh:
                    for n, line in enumerate(fh, 1):
                        if line.lstrip().startswith(">") and needle in line:
                            return f"{os.path.relpath(p, _HERE)}:{n}"
    return None


def _snippet(body_html: str) -> str:
    """The quote's opening text, tags stripped, for the finding message."""
    text = _htmlmod.unescape(_TAG_RE.sub(" ", body_html))
    text = re.sub(r"\s+", " ", text).strip()
    return text[:100] + ("…" if len(text) > 100 else "")


def findings(pages: "list[str] | None" = None) -> "list[str]":
    """One finding per implicit-fallback blockquote in the built book pages. `pages` overrides the page
    set (the build's own gate passes the pages it just wrote; tests pass a scratch page)."""
    out: "list[str]" = []
    for path in (pages if pages is not None else _page_files()):
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
        for m in _IMPLICIT_RE.finditer(text):
            snip = _snippet(m.group("body"))
            src = _source_hit(snip)
            where = f"{os.path.basename(path)}" + (f" (source {src})" if src else "")
            out.append(
                f"{where} — implicit plain blockquote (would rail-float): \"{snip}\" — arm it: "
                f"`<!-- inline-quote -->`/`<!-- epigraph -->` for the reading column, "
                f"`<!-- sidenote -->` for the rail")
    return out


def em_lead_census(pages: "list[str] | None" = None) -> int:
    """How many rail sidenotes still ride the em-lead convention (bare `aside-sidenote` class) rather
    than an explicit `<!-- sidenote -->` declaration — the re-mark count should the author later require
    explicit declaration for the em-lead family too."""
    n = 0
    for path in (pages if pages is not None else _page_files()):
        with open(path, encoding="utf-8") as fh:
            n += len(_EM_LEAD_RAIL_RE.findall(fh.read()))
    return n


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--strict", action="store_true", help="exit 1 on any finding (gate mode)")
    ap.add_argument("--census", action="store_true",
                    help="also report the em-lead-convention census (advisory)")
    args = ap.parse_args()
    fs = findings()
    for f in fs:
        print(f"blockquote-placement: {f}")
    if args.census:
        print(f"blockquote-placement: em-lead census — {em_lead_census()} rail sidenote(s) still ride "
              f"the em-lead convention (no explicit <!-- sidenote --> declaration)")
    print(f"blockquote-placement: {len(fs)} finding(s)")
    return 1 if (fs and args.strict) else 0


if __name__ == "__main__":
    sys.exit(main())
