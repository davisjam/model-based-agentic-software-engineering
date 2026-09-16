#!/usr/bin/env python3
"""book_epub.py — the EPUB3 (reflowable ebook) projection of the MAGE book: the 4th IR projection.

Peer of `book_typst.py` (print PDF) and `book_mkdocs.py` (published web edition): one typed book IR,
four projections. Like the MkDocs emitter this re-renders nothing — `build_book.build_pages()` runs
every content pass and returns each page's rendered body (header + content + chapter nav + foot);
this emitter makes those bodies ePub-safe and packs an EPUB3 container:

  book/mage-book.epub      gitignored (binary — created, never committed; CI publishes it at
                           /book/mage-book.epub, beside the PDF, like the handbook's ePub)
    mimetype               application/epub+zip — first entry, STORED uncompressed (OCF requirement)
    META-INF/container.xml points at the package document
    OEBPS/content.opf      Dublin Core metadata (from book-manifest.json, the cover-identity SSOT)
                           + the manifest + the SPINE in reading order (front matter -> parts ->
                           chapters -> appendices -> back matter, exactly as build_pages() orders)
    OEBPS/nav.xhtml        EPUB3 nav (toc + landmarks); the Part hierarchy comes from the SAME
                           nav-grouping helper the web edition uses (book_mkdocs._nav_entries)
    OEBPS/cover.xhtml
    OEBPS/cover.jpg        the TITLED cover: the print edition's own Typst cover page (artwork +
                           live title/author type) rendered to a raster — not the bare art layer —
                           so the shelf cover can never drift from the PDF's (the handbook lesson)
    OEBPS/<slug>.xhtml     one page per build_pages() record
    OEBPS/epub.css         reflowable-first stylesheet (the tracked book/epub/epub.css; no embedded
                           fonts — the reader's device face applies, like the handbook ePub)
    OEBPS/assets/...       rasters the included pages reference

ePub-safety per page (fail-loud, asserted by a real XML parse of every page):
  - void elements self-closed, HTML named entities -> numeric character references, an inline
    <svg> missing its namespace declaration gains it;
  - sibling links `<slug>.html` -> `<slug>.xhtml`; `index.html` (the web landing) -> `nav.xhtml`;
    any link that leaves the book (`../…`, the PDF-download link) becomes absolute at the
    published site, so nothing dangles inside the container;
  - the citation/editorial note-follower mark (`cn-follow`) is applied by the same emitter helper
    the web edition uses, so the two projections' note presentation cannot drift.

Page-set pin: emitted slugs == `build_book.expected_page_slugs()` (asserted). The web landing
(slug `index`) is the one record excluded from the SPINE: it is web navigation chrome — the
download buttons and the contents list — whose two ePub jobs the container itself carries (the
cover page and nav.xhtml). Every in-book `index.html` link is rewritten to nav.xhtml accordingly.

Usage:
  python3 book/book_epub.py            # build_pages + emit book/mage-book.epub

Deps beyond stdlib: `typst` on PATH + Pillow — the same opt-in toolset the `--pdf` path already
requires (Pillow via book/requirements-pdf.txt); both back the cover render only.
"""
from __future__ import annotations

import argparse
import html.entities
import json
import pathlib
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

HERE = pathlib.Path(__file__).resolve().parent      # book/
ROOT = HERE.parent                                  # catalogue root

sys.path.insert(0, str(HERE))
import build_book    # noqa: E402 — the canonical build; this emitter projects its page records
import book_mkdocs   # noqa: E402 — shared nav grouping + the cn-follow note-marker helper

_EPUB_FILENAME = build_book._PDF_FILENAME[: -len(".pdf")] + ".epub"  # mage-book.epub — one stem, per edition suffix
EPUB_OUT = HERE / _EPUB_FILENAME
EPUB_CSS = HERE / "epub" / "epub.css"
_PAGES_URL = json.loads((ROOT / "book-models" / "repo-metadata.json").read_text(encoding="utf-8"))[
    "pages_url"].rstrip("/")

_XHTML_NS = "http://www.w3.org/1999/xhtml"
_SVG_NS = "http://www.w3.org/2000/svg"
_EPUB_NS = "http://www.idpf.org/2007/ops"

# Deterministic container: every zip entry is stamped with the manifest's stable `last_updated`
# date (bumped intentionally), the same discipline that keeps the web emit and the PDF reproducible.
_LAST_UPDATED = build_book._BOOK_MANIFEST["last_updated"]


# ── XHTML-ification of the rendered bodies ───────────────────────────────────────────────────────

# HTML void elements, self-closed for XML. The lookahead keeps `<meta` from swallowing an inlined
# SVG's `<metadata>` element (matplotlib figures carry one).
_VOID_RE = re.compile(
    r"<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)"
    r"(?=[\s/>])((?:\"[^\"]*\"|'[^']*'|[^>\"'])*?)\s*/?>")
# A named character reference. The XML-native five stay; every other HTML5 name becomes numeric.
_ENT_RE = re.compile(r"&([a-zA-Z][a-zA-Z0-9]*);")
_XML_ENTS = {"amp", "lt", "gt", "quot", "apos"}
_SVG_OPEN_RE = re.compile(r"<svg\b((?:\"[^\"]*\"|'[^']*'|[^>\"'])*)>")
# An inlined SVG's <metadata> block (matplotlib emits RDF generator provenance there). EPUB's XHTML
# profile rejects foreign attributes in w3.org namespaces (epubcheck HTM_054), and the block carries
# no content — strip it.
_SVG_METADATA_RE = re.compile(r"<metadata\b[^>]*>.*?</metadata>", re.S)


def _entity_to_numeric(m: "re.Match[str]") -> str:
    name = m.group(1)
    if name in _XML_ENTS:
        return m.group(0)
    expansion = html.entities.html5.get(name + ";")
    if expansion is None:
        raise SystemExit(f"book_epub: unknown HTML entity &{name}; in a rendered body")
    return "".join(f"&#{ord(ch)};" for ch in expansion)


def _xhtmlify(body: str, slug: str) -> str:
    """One rendered HTML body -> well-formed XHTML: void elements self-closed, named entities made
    numeric, a namespace-less inline <svg> gains xmlns. The result is asserted by an actual XML
    parse — a page that cannot parse fails the build here, not in a reader."""
    x = _SVG_METADATA_RE.sub("", body)
    x = _VOID_RE.sub(lambda m: f"<{m.group(1)}{m.group(2)}/>", x)
    x = _ENT_RE.sub(_entity_to_numeric, x)
    x = _SVG_OPEN_RE.sub(
        lambda m: m.group(0) if "xmlns=" in m.group(1)
        else f'<svg xmlns="{_SVG_NS}"{m.group(1)}>', x)
    try:
        ET.fromstring(f'<div xmlns="{_XHTML_NS}">{x}</div>')
    except ET.ParseError as e:
        raise SystemExit(f"book_epub: {slug}: body is not well-formed XHTML after conversion: {e}")
    return x


# ── link rewriting: keep in-book links inside the container, point the rest at the site ──────────

_URL_ATTR_RE = re.compile(r'((?:href|src)=")([^"]+)(")')
_SIBLING_RE = re.compile(r"([^/#?]+)\.html(#.*)?\Z")


def _rewrite_url(url: str, slugset: "set[str]") -> str:
    if url.startswith(("#", "http://", "https://", "mailto:", "data:")):
        return url
    if url.startswith("../"):
        # Bodies are rendered for the book's own directory, one level below the site root (the
        # same fact book_mkdocs' depth bump encodes) — absolute at the published site root.
        return f"{_PAGES_URL}/{url[3:]}"
    if url == "index.html" or url.startswith("index.html#"):
        # The web landing's ePub role is carried by the nav document (see module docstring).
        return "nav.xhtml" + url[len("index.html"):]
    m = _SIBLING_RE.match(url)
    if m and m.group(1) in slugset:
        return f"{m.group(1)}.xhtml{m.group(2) or ''}"
    if url.startswith("assets/"):
        return url  # embedded alongside the pages (fail-loud copy below)
    # Anything else leaves the book (e.g. the preface's PDF-download link): absolute at the page's
    # published home, exactly where the relative link resolves on the web.
    return f"{_PAGES_URL}/book/mage-book/{url}"


def _rewrite_links(body: str, slugset: "set[str]") -> str:
    return _URL_ATTR_RE.sub(lambda m: m.group(1) + _rewrite_url(m.group(2), slugset) + m.group(3), body)


# ── page documents ───────────────────────────────────────────────────────────────────────────────

_XHTML_SHELL = (
    '<?xml version="1.0" encoding="utf-8"?>\n'
    "<!DOCTYPE html>\n"
    f'<html xmlns="{_XHTML_NS}" xmlns:epub="{_EPUB_NS}" xml:lang="en" lang="en">\n'
    "<head>\n<title>{title}</title>\n"
    '<link rel="stylesheet" type="text/css" href="epub.css"/>\n'
    "</head>\n<body{body_attrs}>\n{body}\n</body>\n</html>\n"
)


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _page_xhtml(rec: dict, slugset: "set[str]") -> str:
    body = book_mkdocs._mark_note_followers(rec["main"].strip())
    body = _rewrite_links(body, slugset)
    body = _xhtmlify(body, rec["slug"])
    return _XHTML_SHELL.format(
        title=_esc(rec["page_title"]), body_attrs="",
        body=f'<div class="{rec["main_cls"]}">\n{body}\n</div>')


# ── cover: the print edition's own Typst cover page, rendered to a raster ────────────────────────


def _render_cover_jpg(work_dir: pathlib.Path) -> bytes:
    """Compile the SAME Typst cover page the PDF opens with (artwork + live title/author lockup —
    the TITLED cover, not the bare art layer) to a one-page PNG, then recompress it to JPEG (the
    artwork is photographic; PNG would quadruple the container). 180 ppi on a US-letter page ->
    1530x1980 px, comfortably above e-reader cover-view resolution."""
    import book_typst  # noqa: E402 — deferred: pulls the whole print emitter; cover-only use
    book_typst._EmitCtx(ROOT)
    typst = shutil.which("typst")
    if not typst:
        raise SystemExit("book_epub: `typst` not found on PATH — the cover render reuses the print "
                         "cover (install typst, as the --pdf path requires)")
    work_dir.mkdir(parents=True, exist_ok=True)
    cover_typ = work_dir / "epub-cover.typ"
    cover_png = work_dir / "epub-cover.png"
    cover_typ.write_text(book_typst._PREAMBLE + "\n" + book_typst._cover_typst() + "\n",
                         encoding="utf-8")
    r = subprocess.run(
        [typst, "compile", "--format", "png", "--ppi", "180", "--root", str(ROOT),
         "--font-path", str(HERE / "fonts"), str(cover_typ), str(cover_png)],
        capture_output=True, text=True)
    if r.returncode != 0 or not cover_png.is_file():
        raise SystemExit(f"book_epub: cover Typst compile failed (rc={r.returncode}):\n{r.stderr}")
    try:
        from PIL import Image  # noqa: E402 — the --pdf toolset (book/requirements-pdf.txt)
    except ImportError:
        raise SystemExit("book_epub: Pillow missing — install book/requirements-pdf.txt (the cover "
                         "recompress needs PIL.Image)")
    cover_jpg = work_dir / "epub-cover.jpg"
    Image.open(cover_png).convert("RGB").save(cover_jpg, "JPEG", quality=88, optimize=True)
    return cover_jpg.read_bytes()


_COVER_XHTML = _XHTML_SHELL.format(
    title="Cover", body_attrs=' epub:type="cover"',
    body=('<div style="text-align:center; margin:0; padding:0;">\n'
          '<img src="cover.jpg" alt="{alt}" style="max-width:100%; height:auto;"/>\n</div>'))


# ── nav document (EPUB3 toc + landmarks) ─────────────────────────────────────────────────────────


def _nav_xhtml(chapters: "list[dict]", extras: "list[dict]") -> str:
    """The nav doc, from the SAME Part-hierarchy grouping the web edition's nav uses
    (book_mkdocs._nav_entries) — one grouping helper, two projections, no drift. The web 'Home'
    entry is dropped (this document is the ePub's own contents page); `.md` targets become the
    container's `.xhtml` pages."""
    entries = book_mkdocs._nav_entries(chapters, extras)
    li: list[str] = []
    for label, target in entries:
        if isinstance(target, str):
            if target == "index.md":
                continue  # the web landing — excluded from the container (see module docstring)
            li.append(f'<li><a href="{target[:-3]}.xhtml">{_esc(label)}</a></li>')
        else:
            sub = "".join(f'<li><a href="{t[:-3]}.xhtml">{_esc(lbl)}</a></li>' for lbl, t in target)
            li.append(f"<li><span>{_esc(label)}</span><ol>{sub}</ol></li>")
    first_body = next((c["slug"] for c in chapters if not c["slug"].startswith("0.")),
                      chapters[0]["slug"])
    body = (
        '<nav epub:type="toc" role="doc-toc" id="toc">\n'
        "<h1>Table of Contents</h1>\n<ol>\n" + "\n".join(li) + "\n</ol>\n</nav>\n"
        '<nav epub:type="landmarks" id="landmarks" hidden="hidden">\n<h2>Landmarks</h2>\n<ol>\n'
        '<li><a epub:type="cover" href="cover.xhtml">Cover</a></li>\n'
        '<li><a epub:type="toc" href="nav.xhtml">Table of Contents</a></li>\n'
        f'<li><a epub:type="bodymatter" href="{first_body}.xhtml">Begin Reading</a></li>\n'
        "</ol>\n</nav>")
    title = _esc(build_book._BOOK_MANIFEST["title"])
    return _XHTML_SHELL.format(title=f"Table of Contents — {title}", body_attrs="", body=body)


# ── package document ─────────────────────────────────────────────────────────────────────────────


def _content_opf(spine_recs: "list[dict]", page_docs: "dict[str, str]",
                 asset_names: "list[str]") -> str:
    m = build_book._BOOK_MANIFEST
    title = _esc(m["title"])
    subtitle = m.get("subtitle", "")
    author = _esc(m["author"])
    items: list[str] = [
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
        '<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="cover-img" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>',
        '<item id="css" href="epub.css" media-type="text/css"/>',
    ]
    spine: list[str] = ['<itemref idref="cover-page"/>', '<itemref idref="nav" linear="no"/>']
    for rec in spine_recs:
        slug = rec["slug"]
        props = [p for p, tok in (("svg", "<svg"), ("mathml", "<math")) if tok in page_docs[slug]]
        prop_attr = f' properties="{" ".join(props)}"' if props else ""
        items.append(f'<item id="pg-{slug}" href="{slug}.xhtml" '
                     f'media-type="application/xhtml+xml"{prop_attr}/>')
        spine.append(f'<itemref idref="pg-{slug}"/>')
    _MEDIA = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
              ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp"}
    for i, rel in enumerate(asset_names):
        ext = pathlib.Path(rel).suffix.lower()
        if ext not in _MEDIA:
            raise SystemExit(f"book_epub: no media-type mapping for referenced asset {rel}")
        items.append(f'<item id="asset-{i}" href="{rel}" media-type="{_MEDIA[ext]}"/>')
    rights = _esc(f'© {m["author"]}, {m["copyright_years"]}')
    subtitle_meta = (
        f'<meta property="title-type" refines="#subtitle">subtitle</meta>' if subtitle else "")
    subtitle_dc = f'<dc:title id="subtitle">{_esc(subtitle)}</dc:title>' if subtitle else ""
    return f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="en">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="pub-id">{_PAGES_URL}/book/mage-book</dc:identifier>
<dc:title id="title">{title}</dc:title>
{subtitle_dc}{subtitle_meta}
<dc:creator id="creator">{author}</dc:creator>
<meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
<dc:language>en</dc:language>
<dc:date>{_esc(m.get("first_published", _LAST_UPDATED))}</dc:date>
<dc:rights>{rights}</dc:rights>
<meta property="dcterms:modified">{_LAST_UPDATED}T00:00:00Z</meta>
<meta property="schema:accessMode">textual</meta>
<meta property="schema:accessMode">visual</meta>
<meta property="schema:accessModeSufficient">textual,visual</meta>
<meta property="schema:accessibilityFeature">structuralNavigation</meta>
<meta property="schema:accessibilityFeature">tableOfContents</meta>
<meta property="schema:accessibilityHazard">none</meta>
<meta property="schema:accessibilitySummary">Reflowable edition; figures are inline vector graphics with textual context.</meta>
<meta name="cover" content="cover-img"/>
</metadata>
<manifest>
{chr(10).join(items)}
</manifest>
<spine>
{chr(10).join(spine)}
</spine>
</package>
"""


_CONTAINER_XML = """<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"""


# ── emit ─────────────────────────────────────────────────────────────────────────────────────────


def emit(chapters: "list[dict]", extras: "list[dict]",
         out: pathlib.Path = EPUB_OUT) -> "tuple[int, int]":
    """Emit the EPUB3 container from the build's page records. Returns (spine page count, bytes)."""
    emitted = {c["slug"] for c in chapters} | {e["slug"] for e in extras}
    expected = build_book.expected_page_slugs()
    if emitted != expected:
        raise SystemExit("book_epub: page-set pin FAIL — build_pages() slugs != expected_page_slugs()"
                         f"\n  missing: {sorted(expected - emitted)}\n  extra: {sorted(emitted - expected)}")

    # Reading order = the build's own order: chapters (front matter -> parts -> appendices -> back
    # matter), then the generated back-matter pages. The web landing is web chrome — excluded (its
    # ePub jobs are the cover + nav.xhtml; see module docstring).
    spine_recs = chapters + [e for e in extras if e["slug"] != "index"]
    slugset = {r["slug"] for r in spine_recs}

    print("== book_epub emit plan ==")
    print(f"  spine pages : {len(spine_recs)} (chapters {len(chapters)} + generated {len(spine_recs) - len(chapters)}; web landing excluded)")
    print(f"  cover       : Typst print cover -> cover.jpg (titled; 180 ppi)")
    print(f"  stylesheet  : {EPUB_CSS.relative_to(ROOT)} (reflowable-first, no embedded fonts)")
    print(f"  out         : {out}")

    page_docs = {rec["slug"]: _page_xhtml(rec, slugset) for rec in spine_recs}

    # Raster assets the INCLUDED pages reference (`assets/…` — figures/mermaid are inline SVG).
    asset_names = sorted({m.group(1) for doc in page_docs.values()
                          for m in re.finditer(r'(?:src|href)="(assets/[^"]+)"', doc)})
    for rel in asset_names:
        if not (HERE / rel).is_file():
            raise SystemExit(f"book_epub: a page references missing asset {HERE / rel}")

    cover_jpg = _render_cover_jpg(HERE / "_typst")
    cover_xhtml = _COVER_XHTML.replace("{alt}", _esc(
        f'{build_book._BOOK_MANIFEST["title"]} — {build_book._BOOK_MANIFEST["author"]} (cover)'))
    nav = _nav_xhtml(chapters, extras)
    for name, doc in (("nav.xhtml", nav), ("cover.xhtml", cover_xhtml)):
        try:
            ET.fromstring(doc[doc.index("<html"):])
        except ET.ParseError as e:
            raise SystemExit(f"book_epub: generated {name} is not well-formed: {e}")
    opf = _content_opf(spine_recs, page_docs, asset_names)
    ET.fromstring(opf)  # the package document must itself be well-formed

    y, mo, d = (int(p) for p in _LAST_UPDATED.split("-"))
    stamp = (y, mo, d, 0, 0, 0)

    def _entry(zf: zipfile.ZipFile, name: str, data: bytes,
               compress: int = zipfile.ZIP_DEFLATED) -> None:
        zi = zipfile.ZipInfo(name, date_time=stamp)
        zi.compress_type = compress
        zi.external_attr = 0o644 << 16
        zf.writestr(zi, data)

    with zipfile.ZipFile(out, "w") as zf:
        _entry(zf, "mimetype", b"application/epub+zip", compress=zipfile.ZIP_STORED)
        _entry(zf, "META-INF/container.xml", _CONTAINER_XML.encode("utf-8"))
        _entry(zf, "OEBPS/content.opf", opf.encode("utf-8"))
        _entry(zf, "OEBPS/nav.xhtml", nav.encode("utf-8"))
        _entry(zf, "OEBPS/cover.xhtml", cover_xhtml.encode("utf-8"))
        _entry(zf, "OEBPS/cover.jpg", cover_jpg)
        _entry(zf, "OEBPS/epub.css", EPUB_CSS.read_bytes())
        for slug in sorted(page_docs):
            _entry(zf, f"OEBPS/{slug}.xhtml", page_docs[slug].encode("utf-8"))
        for rel in asset_names:
            _entry(zf, f"OEBPS/{rel}", (HERE / rel).read_bytes())

    size = out.stat().st_size
    print("== book_epub results ==")
    print(f"  {out.name}: {size / 1_048_576:.1f} MB — {len(spine_recs)} spine pages, "
          f"{len(asset_names)} raster assets, cover {len(cover_jpg) // 1024} KiB")
    return len(spine_recs), size


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", type=pathlib.Path, default=EPUB_OUT,
                    help=f"output path (default: {EPUB_OUT})")
    args = ap.parse_args(argv)
    chapters, extras = build_book.build_pages()
    emit(chapters, extras, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
