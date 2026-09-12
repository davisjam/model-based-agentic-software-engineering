#!/usr/bin/env python3
"""Relocate the built MAGE book + supplementary handbook into their `/book/<name>/` homes inside the
published `_site` artifact, and leave HTML meta-refresh stubs at every old path.

WHY a publish-time relocation (not a source/build-path change): the book HTML edition is generated flat as
`book/<slug>.html` by `book/build_book.py`, with sibling-relative nav between pages and depth-1
root-relative refs (`href="../index.html"`, `url('../book/fonts/…')`). Moving the *source* would mean
re-deriving depth across a 7k-line generator and moving 130+ tracked files. Instead this operates on the
already-assembled `_site` tree: it moves the flat book pages one level deeper into `_site/book/mage-book/`,
rewrites their root-relative refs by one extra `../`, copies the whole-book PDF and the handbook PDF into
their new homes, and writes meta-refresh stubs at the old page URLs so external links never 404. GitHub
Pages has no server redirects, so a static meta-refresh page IS the redirect mechanism for HTML; a `.pdf`
URL cannot carry an HTML redirect (wrong content type), so the old PDF path keeps a working copy instead.

Runs from `.github/workflows/pages.yml` AFTER the site is assembled, and is exercisable locally against a
locally-assembled `_site`. Stdlib-only (the repo's clone-and-run posture); no shell.

Target layout produced:
    _site/book/mage-book/<slug>.html         (was _site/book/<slug>.html)   + meta-refresh stub at old path
    _site/book/mage-book/mage-book.pdf        (copy of _site/book/mage-book.pdf; old path kept as a copy)
    _site/book/se-handbook/<handbook>.pdf     (copy of _site/se-handbook/<handbook>.pdf; old path kept)

Exit codes: 0 success; 1 runtime error; 2 expected input missing (the assembled book HTML).
"""
from __future__ import annotations

import json
import os
import re
import shutil
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)

# Rewrites applied to a book page as it moves one level deeper (book/<slug>.html -> book/mage-book/<slug>.html):
#   - root-relative attribute refs gain one `../`   (href="../index.html" -> "../../index.html")
#   - root-relative CSS url() refs gain one `../`    (url('../book/fonts/…') -> url('../../book/fonts/…'))
#   - the one bare sibling-asset img ref             (src="assets/…" -> src="../assets/…", assets/ stays put)
# Sibling page links (index.html, <slug>.html) and the sibling PDF link (mage-book.pdf) need NO rewrite —
# every book page and the PDF move together into mage-book/, so those stay valid.
_REWRITE_ATTR_DOTDOT = re.compile(r'((?:href|src)=")\.\./')
_REWRITE_URL_DOTDOT = re.compile(r"""(url\(['"]?)\.\./""")
_REWRITE_ATTR_ASSETS = re.compile(r'((?:href|src)=")assets/')


def _pages_url() -> str:
    meta = json.loads((open(os.path.join(_ROOT, "book-models", "repo-metadata.json"), encoding="utf-8")).read())
    return meta["pages_url"].rstrip("/")


def _rewrite_book_page(html: str) -> str:
    html = _REWRITE_ATTR_DOTDOT.sub(r"\1../../", html)
    html = _REWRITE_URL_DOTDOT.sub(r"\1../../", html)
    html = _REWRITE_ATTR_ASSETS.sub(r"\1../assets/", html)
    return html


def _stub(rel_target: str, canonical_abs: str, title: str) -> str:
    """A static HTML meta-refresh redirect (the only redirect GitHub Pages supports): instant refresh to the
    new path, a rel=canonical to the absolute new URL, noindex so search engines follow the canonical, and a
    visible fallback link. No JavaScript — the site's console-error gate must stay clean."""
    return (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        f"<title>Moved — {title}</title>\n"
        f'<link rel="canonical" href="{canonical_abs}">\n'
        '<meta name="robots" content="noindex">\n'
        f'<meta http-equiv="refresh" content="0; url={rel_target}">\n'
        "</head>\n<body>\n"
        f'<p>This page has moved to <a href="{rel_target}">{canonical_abs}</a>.</p>\n'
        "</body>\n</html>\n"
    )


def relocate(site: str) -> int:
    book = os.path.join(site, "book")
    if not os.path.isdir(book):
        print(f"ERROR: {book} not found — run this AFTER the site is assembled.", file=sys.stderr)
        return 2
    pages_url = _pages_url()
    mage = os.path.join(book, "mage-book")
    os.makedirs(mage, exist_ok=True)

    # Flat top-level book pages only (not book/assets, book/fonts, book/data, book/_design — those stay put).
    page_names = sorted(n for n in os.listdir(book)
                        if n.endswith(".html") and os.path.isfile(os.path.join(book, n)))
    if not page_names:
        print(f"ERROR: no book HTML pages found in {book}.", file=sys.stderr)
        return 2

    print("== publish_book_layout plan ==")
    print(f"  site           : {site}")
    print(f"  book pages     : {len(page_names)} -> book/mage-book/ (+ meta-refresh stub at each old path)")
    print(f"  book PDF       : book/mage-book.pdf -> book/mage-book/mage-book.pdf (old path kept as copy)")
    print(f"  handbook PDF   : se-handbook/ -> book/se-handbook/ (old path kept as copy)")

    moved = 0
    for name in page_names:
        src = os.path.join(book, name)
        html = open(src, encoding="utf-8").read()
        open(os.path.join(mage, name), "w", encoding="utf-8").write(_rewrite_book_page(html))
        canonical = f"{pages_url}/book/mage-book/{name}"
        open(src, "w", encoding="utf-8").write(_stub(f"mage-book/{name}", canonical, name))
        moved += 1

    # Whole-book PDF: copy into the new home; keep the old path as a working copy (a .pdf URL cannot carry an
    # HTML meta-refresh, so a copy — not a stub — is how the old PDF link keeps resolving).
    pdf_copies = 0
    old_pdf = os.path.join(book, "mage-book.pdf")
    if os.path.isfile(old_pdf):
        shutil.copy2(old_pdf, os.path.join(mage, "mage-book.pdf"))
        pdf_copies += 1
    else:
        print(f"WARNING: {old_pdf} absent — no book PDF to relocate.", file=sys.stderr)

    # Supplementary handbook PDF: canonical home under book/se-handbook/; keep the old top-level copy too.
    hb_copies = 0
    old_hb_dir = os.path.join(site, "se-handbook")
    if os.path.isdir(old_hb_dir):
        new_hb_dir = os.path.join(book, "se-handbook")
        os.makedirs(new_hb_dir, exist_ok=True)
        for n in sorted(os.listdir(old_hb_dir)):
            if n.endswith(".pdf") and os.path.isfile(os.path.join(old_hb_dir, n)):
                shutil.copy2(os.path.join(old_hb_dir, n), os.path.join(new_hb_dir, n))
                hb_copies += 1
    else:
        print(f"WARNING: {old_hb_dir} absent — no handbook PDF to relocate.", file=sys.stderr)

    print("== publish_book_layout results ==")
    print(f"  pages relocated + stubbed : {moved}")
    print(f"  book PDF copies           : {pdf_copies}")
    print(f"  handbook PDF copies       : {hb_copies}")
    if moved == 0:
        print("ERROR: relocated 0 pages.", file=sys.stderr)
        return 1
    return 0


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: publish_book_layout.py <site_dir>", file=sys.stderr)
        return 1
    return relocate(argv[1])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
