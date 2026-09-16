#!/usr/bin/env python3
"""Finish the `/book/<name>/` publish layout inside the assembled `_site` artifact: legacy redirect
stubs for the MAGE book's old flat URLs, plus the PDF / ePub download copies.

Since the C3 publish swap the MAGE book web edition is the MkDocs-built site the Pages workflow
copies into `_site/book/mage-book/` BEFORE this runs (`use_directory_urls: false`, so every page is a
flat `<slug>.html` at the same stem the retired hand-rolled edition served). The pre-relocation era
also served every page at the flat `_site/book/<slug>.html`; GitHub Pages has no server redirects, so
this script keeps those old URLs alive by writing a static HTML meta-refresh stub at each — one per
page of the built book. A `.pdf`/`.epub` URL cannot carry an HTML redirect (wrong content type), so
the old download paths keep working copies instead:

    _site/book/<slug>.html                    meta-refresh stub -> book/mage-book/<slug>.html
    _site/book/mage-book/mage-book.pdf        copy of _site/book/mage-book.pdf (old path kept)
    _site/book/mage-book/mage-book.epub       copy of _site/book/mage-book.epub (flat path kept)
    _site/book/se-handbook/<handbook>.{pdf,epub}  copies of _site/se-handbook/* (old paths kept)

The hand-rolled flat pages' move/rewrite branch retired with the C3 swap — nothing generates flat
book HTML anymore, so there is nothing to move; the stub set now derives from the built book itself
(the emitted stems ARE the published URL set). Runs from `.github/workflows/pages.yml` AFTER the
site is assembled AND the MkDocs book site is copied in; exercisable locally against a
locally-assembled `_site`. Stdlib-only (the repo's clone-and-run posture); no shell.

Exit codes: 0 success; 1 runtime error; 2 expected input missing (the built book at book/mage-book/).
"""
from __future__ import annotations

import json
import os
import shutil
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)

#: Top-level files of the built MkDocs site that are NOT book pages (never pre-swap URLs, so no
#: legacy stub): Material's error page. Non-.html siblings (sitemap.xml[.gz]) never match anyway.
_NON_PAGE_HTML = {"404.html"}


def _pages_url() -> str:
    meta = json.loads((open(os.path.join(_ROOT, "book-models", "repo-metadata.json"), encoding="utf-8")).read())
    return meta["pages_url"].rstrip("/")


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
    mage = os.path.join(book, "mage-book")
    if not os.path.isdir(mage):
        print(f"ERROR: {mage} not found — run this AFTER the assembled site gains the MkDocs-built "
              f"book (cp book/web/site/. -> _site/book/mage-book/).", file=sys.stderr)
        return 2
    pages_url = _pages_url()

    # The built book's flat pages (use_directory_urls: false — one <slug>.html per published page).
    # Subdirs (assets/, fonts/, search/) are site chrome, not pages; 404.html is Material's error page.
    page_names = sorted(n for n in os.listdir(mage)
                        if n.endswith(".html") and n not in _NON_PAGE_HTML
                        and os.path.isfile(os.path.join(mage, n)))
    if not page_names:
        print(f"ERROR: no built book pages found in {mage}.", file=sys.stderr)
        return 2

    print("== publish_book_layout plan ==")
    print(f"  site           : {site}")
    print(f"  legacy stubs   : {len(page_names)} book/<slug>.html -> meta-refresh to book/mage-book/<slug>.html")
    print(f"  book PDF+ePub  : book/mage-book.{{pdf,epub}} -> book/mage-book/ (old paths kept as copies)")
    print(f"  handbook PDF+ePub : se-handbook/ -> book/se-handbook/ (old paths kept as copies)")

    stubbed = 0
    for name in page_names:
        old = os.path.join(book, name)
        if os.path.exists(old):
            # Nothing writes flat book HTML anymore; a collision means the assembled tree carries an
            # unexpected page at a legacy URL — fail loud rather than silently shadow either file.
            print(f"ERROR: {old} already exists — refusing to overwrite it with a redirect stub.",
                  file=sys.stderr)
            return 1
        canonical = f"{pages_url}/book/mage-book/{name}"
        open(old, "w", encoding="utf-8").write(_stub(f"mage-book/{name}", canonical, name))
        stubbed += 1

    # Whole-book PDF + ePub: copy each into the book's home (where the home page's relative download
    # links resolve); keep the old flat path as a working copy (a .pdf/.epub URL cannot carry an HTML
    # meta-refresh, so a copy — not a stub — is how the old download link keeps resolving).
    pdf_copies = 0
    for edition in ("mage-book.pdf", "mage-book.epub"):
        old_edition = os.path.join(book, edition)
        if os.path.isfile(old_edition):
            shutil.copy2(old_edition, os.path.join(mage, edition))
            pdf_copies += 1
        else:
            print(f"WARNING: {old_edition} absent — no {edition} to relocate.", file=sys.stderr)

    # Supplementary handbook editions (PDF + ePub — both binary download artifacts, same posture):
    # canonical home under book/se-handbook/; keep the old top-level copies too.
    hb_copies = 0
    old_hb_dir = os.path.join(site, "se-handbook")
    if os.path.isdir(old_hb_dir):
        new_hb_dir = os.path.join(book, "se-handbook")
        os.makedirs(new_hb_dir, exist_ok=True)
        for n in sorted(os.listdir(old_hb_dir)):
            if n.endswith((".pdf", ".epub")) and os.path.isfile(os.path.join(old_hb_dir, n)):
                shutil.copy2(os.path.join(old_hb_dir, n), os.path.join(new_hb_dir, n))
                hb_copies += 1
    else:
        print(f"WARNING: {old_hb_dir} absent — no handbook PDF/ePub to relocate.", file=sys.stderr)

    print("== publish_book_layout results ==")
    print(f"  legacy stubs written      : {stubbed}")
    print(f"  book PDF/ePub copies      : {pdf_copies}")
    print(f"  handbook PDF/ePub copies  : {hb_copies}")
    if stubbed == 0:
        print("ERROR: wrote 0 stubs.", file=sys.stderr)
        return 1
    return 0


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: publish_book_layout.py <site_dir>", file=sys.stderr)
        return 1
    return relocate(argv[1])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
