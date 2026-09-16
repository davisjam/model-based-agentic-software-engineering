#!/usr/bin/env python3
"""book_mkdocs.py — the MkDocs (family web-shell) projection of the MAGE book: the PUBLISHED web edition.

Peer of `book_typst.py`: one typed book IR, two projections — this MkDocs site (the web edition,
published at `/book/mage-book/`) and Typst (the print PDF). Since the C3 publish swap the hand-rolled
HTML shell is retired: `build_book.build_pages()` runs every content pass and returns each page's
rendered BODY (header + content + sequence bar + foot) plus its wrap classes / tab title / Scholar
meta, and this emitter projects those records into a Material-shell site:

  book/web/            (gitignored — a generated tree, like the handbook's generated/web + dist)
    mkdocs.yml           generated config: shared web-theme custom_dir, generated Part-hierarchy nav
    docs/<slug>.md       one page per record, stem == the pre-swap published stem → with
                         `use_directory_urls: false` every published URL + #anchor is unchanged
    docs/assets/         composed mage-book.css + self-hosted fonts + referenced raster assets
    site/                `mkdocs build` output (published into `_site/book/mage-book/` by CI)

C0-spike requirements folded in (spike/VERDICT.md, webbook-phaseC0-mage-spike-260916):
  1. chapter headings are interleaved as MARKDOWN `##`/`###` lines (carrying their `{#id}` anchors)
     between raw-HTML body chunks — Material's section-level search anchors populate ONLY from
     markdown headings; a raw <h2> is invisible to search. (The right-TOC rail the spike also fed
     is dropped since the web-polish pass — see the sidenote note below — but search keeps needing
     the interleave.) Attribute-carrying headings (the spike's 3.3.6 miss) are handled; only
     TOP-LEVEL headings are lifted (a heading nested in a blockquote / works-cited section /
     apparatus frame stays raw HTML).
  2. each page body is wrapped in a `<div class="wrap …">` carrying the record's `main_cls` (Material
     supplies <main>; nested mains are invalid HTML). The div is closed/reopened around each
     interleaved markdown heading so every chunk stays balanced and the page-class CSS hooks
     (`div.wrap.appendix`, `.part-page`, `.appendices-divider`) keep matching.
  3. @font-face URLs are rewritten to a docs-served fonts dir (Source Serif 4 / Source Sans 3 /
     IBM Plex Mono self-hosted under docs/assets/fonts/).
  4. the nav expresses the Part hierarchy (navigation.sections; single-page parts — dividers, the
     Conclusion — stay top-level items).
  5. URL/anchor parity: emitted stems == `expected_page_slugs()` == the pre-swap published stems
     (asserted at emit time — the C3 URL-continuity guarantee, no redirects needed).
  6. the home page is the book landing's own content (cover beside contents + the PDF-download /
     companion-SE-Handbook top row); the cover art is wrapped in a link to the PDF edition
     (`_link_cover_to_pdf` — a web-only affordance; the print/ePub projections never see it).
  7. per-page Scholar head-meta: each record's `citation_*` tags ride the page front matter
     (`citation_head`) and the shared web-theme `main.html` renders them into `<head>` via its
     `extrahead` block.
  8. referenced raster assets are scanned out of the emitted bodies and copied in; everything else
     (figures, mermaid, brick thumbs) is already inlined SVG.

Identity (DESIGN §7, ratified): rust stays the family accent; MAGE identity = its title +
Source Serif 4 reading column + component vocabulary + the ≈52rem measure
(`.md-grid { max-width: 76rem }`).

Phase C2 (dark mode + identity CSS, per the C0 spike Q1/Q3 verdicts) lives in the stylesheet:
  - DARK reading plane: `design_tokens.css_book_dark_block()` re-declares every book token var from
    the SSOT's `palette-dark` set under `[data-md-color-scheme="slate"]` — the content CSS colors
    only through var(--…), so the whole plane follows the family dark scheme with zero hand hex.
  - LIGHT PLATES: light-baked inlined SVGs sit on a light-paper plate under slate
    (`_dark_extras_css`); the plate is slate-scoped, so light mode is untouched by construction.
  - MARGIN SIDENOTES (web-polish 260916, superseding the C0 Q1 variant (a) in-column-only call):
    every page front-matters `hide: [toc]` — the per-page right-TOC rail is DROPPED (author
    decision 260916) and the freed right margin goes to Tufte-style sidenotes: on a wide viewport
    the cite/editorial notes float into the margin beside their reference marks; below the margin
    breakpoint they collapse back to the compact in-column cards (never clipped). A citation
    marker whose note card directly precedes it is emitter-marked `cn-follow`
    (`_mark_note_followers`) and visually hidden ONLY in the in-column fallback, where the card
    breaks the line; in margin mode every mark stays inline.

The content CSS is COMPOSED at emit time (`_compose_css`): the TRACKED, hand-owned
`book/web-assets/mage-book.css` (frozen at C3 from the former inline strings) plus the projected
token segments — @font-face, the :root block, the slate remap, the SVG light plates — from
book-models/design-tokens.json. Tokens keep one home; the composition fail-louds if the tracked
sheet's mermaid label sizes drift from the token SSOT (the config==CSS invariant).

Usage:
  python3 book/book_mkdocs.py                     # the web build (build_pages + emit book/web/)
  python3 book/build_book.py                      # same (the builder delegates here)
  python3 book/book_mkdocs.py --check-determinism # emit twice from one build, assert byte-identical
Then: site/.venv/bin/mkdocs build --strict -f book/web/mkdocs.yml
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent      # book/
ROOT = HERE.parent                                  # catalogue root
WEB = HERE / "web"
TRACKED_CSS = HERE / "web-assets" / "mage-book.css"

sys.path.insert(0, str(HERE))
import build_book  # noqa: E402 — the canonical build; this emitter projects its page records
import lint_blockquote_placement as _bq_lint  # noqa: E402 — the blockquote-placement gate (scans the emitted bodies for the renderer's own `quote-implicit` sentinel)
import design_tokens as _dtokens  # noqa: E402 — resolvable via build_book's book-models sys.path entry

# ── rendered-body intake: markdown-heading interleave ────────────────────────────────────────────

# One token per comment or tag; quoted attribute values may contain ">". The attrs group is LAZY so
# a trailing "/" is claimed by the self-close group, not swallowed as an attribute character.
_TOKEN_RE = re.compile(
    r"<!--.*?-->|<(/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\"[^\"]*\"|'[^']*'|[^>\"'])*?)(/?)>", re.S)
_VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
         "meta", "param", "source", "track", "wbr"}
_HEAD_EL_RE = re.compile(
    r"<h([23])((?:\"[^\"]*\"|'[^']*'|[^>\"'])*)>(.*)</h\1>", re.S)
_ID_ATTR_RE = re.compile(r'\bid="([^"]+)"')
# Markdown-active characters neutralized (as numeric entities) in heading TEXT nodes, so python-
# markdown re-processes nothing inside an interleaved heading line; the trailing `{#id}` attr_list
# block is appended AFTER escaping and stays live.
_MD_ESCAPES = {"*": "&#42;", "_": "&#95;", "`": "&#96;", "[": "&#91;", "]": "&#93;",
               "{": "&#123;", "}": "&#125;"}


def _escape_md_text(fragment: str) -> str:
    """Neutralize markdown-active characters in the TEXT nodes of an inline-HTML fragment (tags and
    their attributes pass through untouched)."""
    parts = re.split(r"(<[^>]+>)", fragment)
    for i in range(0, len(parts), 2):
        for ch, ent in _MD_ESCAPES.items():
            parts[i] = parts[i].replace(ch, ent)
    return "".join(parts)


def _heading_to_md(el_html: str, slug: str) -> str:
    """One rendered <h2>/<h3> element → its markdown heading line (inline HTML kept, text nodes
    markdown-escaped, the id carried as a trailing `{#id}` attr_list block)."""
    m = _HEAD_EL_RE.fullmatch(el_html.strip())
    if not m:
        raise SystemExit(f"book_mkdocs: {slug}: unparseable heading element: {el_html[:120]!r}")
    level, attrs, inner = int(m.group(1)), m.group(2), m.group(3)
    text = " ".join(_escape_md_text(inner).split())  # a markdown heading is one line
    idm = _ID_ATTR_RE.search(attrs)
    anchor = f" {{#{idm.group(1)}}}" if idm else ""
    return f"{'#' * level} {text}{anchor}"


def _interleave(inner: str, wrap_open: str, slug: str) -> str:
    """Split the page body at every TOP-LEVEL <h2>/<h3>, re-emitting each as a markdown heading with
    the wrap div closed before it and reopened after — so Material's toc extension (the right rail +
    search section anchors) sees every section heading, while every raw-HTML chunk stays a balanced
    block. Headings nested deeper (blockquote titles, the works-cited <section> h2, apparatus-page
    frames) are structural to their container and stay raw."""
    # Inlined SVGs carry <style> elements whose CSS text must not confuse the tag walk: blank the
    # CONTENT of every style/script block in a same-length shadow copy (offsets stay aligned), and
    # token-walk the shadow while slicing headings from the real body.
    scan_src = re.sub(
        r"(<(style|script)\b[^>]*>)(.*?)(</\2>)",
        lambda m: m.group(1) + " " * len(m.group(3)) + m.group(4),
        inner, flags=re.S | re.I)
    spans: list[tuple[int, int]] = []
    depth = 0
    pending: tuple[int, str] | None = None
    for m in _TOKEN_RE.finditer(scan_src):
        if m.group(0).startswith("<!--"):
            continue
        closing, name, selfclose = m.group(1), m.group(2).lower(), m.group(4)
        if selfclose or name in _VOID:
            continue
        if not closing:
            if depth == 0 and name in ("h2", "h3"):
                pending = (m.start(), name)
            depth += 1
        else:
            depth -= 1
            if depth < 0:
                raise SystemExit(f"book_mkdocs: {slug}: unbalanced HTML near offset {m.start()}")
            if depth == 0 and pending is not None:
                if name != pending[1]:
                    raise SystemExit(f"book_mkdocs: {slug}: heading close mismatch at {m.start()}")
                spans.append((pending[0], m.end()))
                pending = None
    if depth != 0:
        raise SystemExit(f"book_mkdocs: {slug}: unbalanced HTML (depth {depth} at end of body)")
    out: list[str] = []
    last = 0
    for s, e in spans:
        out.append(inner[last:s])
        out.append(f"\n</div>\n\n{_heading_to_md(inner[s:e], slug)}\n\n{wrap_open}\n")
        last = e
    out.append(inner[last:])
    return "".join(out)


_NOTE_OPEN_RE = re.compile(r'<span class="(?:cite-note|editorial-note)">')
_SPAN_TOK_RE = re.compile(r"<span\b[^>]*>|</span>")
_FOLLOW_SUP_RE = re.compile(r'\s*<sup class="(?:cite-ref|note-ref)')


def _mark_note_followers(inner: str) -> str:
    """Mark every citation/editorial marker whose gutter-note card DIRECTLY precedes it (whitespace
    only between) with an extra `cn-follow` class. In the NARROW in-column fallback presentation
    the notes are display:block cards, so a marker sandwiched between two cards would render as a
    one-glyph debris line — its own note is the very next block and carries its number. The CSS
    visually hides `sup.cn-follow` below the margin-sidenote breakpoint (still in the a11y tree
    and anchor order) and restores it in margin mode, where the notes float out of the line and
    every mark reads inline; markers with running prose after the preceding note keep their inline
    place at every width. An adjacent-sibling CSS selector cannot express this (`+` ignores
    intervening TEXT nodes), hence the emitter-side mark."""
    inserts: list[int] = []  # offsets (into the original string) where " cn-follow" is added
    for m in _NOTE_OPEN_RE.finditer(inner):
        depth = 1
        close_end = -1
        for t in _SPAN_TOK_RE.finditer(inner, m.end()):
            depth += 1 if t.group(0).startswith("<span") else -1
            if depth == 0:
                close_end = t.end()
                break
        if close_end < 0:
            raise SystemExit(f"book_mkdocs: unbalanced <span> inside a note at offset {m.start()}")
        fm = _FOLLOW_SUP_RE.match(inner, close_end)
        if fm:
            inserts.append(fm.end())  # right after `cite-ref` / `note-ref` inside the class value
    out: list[str] = []
    last = 0
    for pos in inserts:
        out.append(inner[last:pos])
        out.append(" cn-follow")
        last = pos
    out.append(inner[last:])
    return "".join(out)


# In-body figures: every `figure.book-figure` holding an inlined SVG gets a `--fig-natural` CSS
# custom property carrying the SVG's natural width (its viewBox width — the coordinate space the
# diagram was laid out in, where mermaid label px == CSS px). The stylesheet sizes the SVG
# `min(100%, var(--fig-natural))`: a wide diagram fills the reading column, a small one centers at
# its natural size instead of being upscaled past the size it was designed at. The viewBox is the
# only width signal these SVGs carry (no width/height attrs), and CSS cannot read it — hence the
# emitter-side annotation.
_FIG_SVG_RE = re.compile(
    r'(?P<fig><figure\b[^>]*class="book-figure[^"]*"[^>]*)>\s*(?=<svg\b)'
    r'(?P<svg><svg\b(?:"[^"]*"|\'[^\']*\'|[^>])*>)', re.S)
_VIEWBOX_W_RE = re.compile(r'\bviewBox="[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+[-\d.]+"')


def _annotate_figure_widths(inner: str) -> str:
    """Stamp `style="--fig-natural:<viewBox-width>px"` onto every book-figure that opens with an
    inlined SVG (raster `<img>` figures and the catalogue-embed iframe pass untouched — `<img>`
    already has intrinsic dimensions and never upscales)."""
    def _stamp(m: re.Match[str]) -> str:
        fig, svg = m.group("fig"), m.group("svg")
        vb = _VIEWBOX_W_RE.search(svg)
        if not vb:
            return m.group(0)  # no viewBox → no natural width to declare; CSS falls back to 100%
        if 'style="' in fig:
            raise SystemExit(f"book_mkdocs: figure tag already carries a style attribute — "
                             f"fold --fig-natural into it: {fig[:120]!r}")
        return f'{fig} style="--fig-natural:{vb.group(1)}px">{svg}'
    return _FIG_SVG_RE.sub(_stamp, inner)


# Site-root refs in a page body (`href="../models-bridge/…"` — a link that LEAVES the book, e.g. the
# web-redirect to an online catalogue entry). The bodies are rendered for the book's own directory,
# one level below the site root; the PUBLISHED pages serve at `/book/mage-book/<slug>.html`, two
# below. The retired hand-rolled pipeline bumped these at publish time (the relocate's rewrite);
# since the C3 swap the emitter owns the published depth, so it applies the same one-level bump.
# Sibling links (`<slug>.html`) and in-book assets (`assets/…`) carry no `../` and pass untouched.
_UPREF_RE = re.compile(r'((?:href|src)=")\.\./')


def _page_md(rec: dict, nav_title: str) -> str:
    """One build_pages() record → the MkDocs page markdown: front matter (nav/tab title + the
    `hide: [toc]` that drops Material's right-TOC rail + the Scholar `citation_head` block the
    theme's extrahead renders) + wrap div + interleaved body."""
    wrap_open = f'<div class="{rec["main_cls"]}">'
    main = _UPREF_RE.sub(r"\1../../", rec["main"].strip())
    body = _interleave(_annotate_figure_widths(_mark_note_followers(main)), wrap_open, rec["slug"])
    # `hide: [toc]` — Material's native per-page switch for the right-TOC rail. The rail is
    # dropped on every page (author decision 260916: the margin belongs to the Tufte sidenotes,
    # not an in-chapter TOC); the top nav + in-page headings still give structure, and search
    # keeps its section anchors from the interleaved markdown headings.
    fm = [f"title: {json.dumps(nav_title)}", "hide:", "  - toc"]
    if rec.get("head_meta"):
        # One-line JSON string — valid YAML, no block-scalar indentation pitfalls; the shared
        # web-theme main.html renders it verbatim into <head> (Scholar reads meta only from <head>).
        fm.append(f"citation_head: {json.dumps(rec['head_meta'])}")
    return "---\n" + "\n".join(fm) + f"\n---\n\n{wrap_open}\n{body}\n</div>\n"


_COVER_IMG_RE = re.compile(r'<img class="book-cover-side"[^>]*>')


def _link_cover_to_pdf(main: str) -> str:
    """Wrap the landing page's cover art in a link to the PDF edition — the same target as the
    "Download the PDF edition" button (the manifest's `pdf_filename`). Web-only: this emitter is
    the only consumer of the landing record, so the print/ePub projections are untouched. The
    anchor carries the accessible label; the stylesheet moves the cover's flex/sticky geometry
    onto it (`a.book-cover-link`)."""
    def _wrap(m: re.Match[str]) -> str:
        return (f'<a class="book-cover-link" href="{build_book._PDF_FILENAME}" '
                f'title="Download the PDF edition" aria-label="Download the PDF edition">'
                f'{m.group(0)}</a>')
    out, n = _COVER_IMG_RE.subn(_wrap, main)
    if n != 1:
        raise SystemExit(f"book_mkdocs: expected exactly 1 landing cover image to link to the "
                         f"PDF, found {n}")
    return out


# ── content CSS: tracked hand-owned sheet + projected token segments ─────────────────────────────


def _dark_extras_css() -> str:
    """Slate-scoped rules that are NOT plain token remaps: the light plates behind light-baked
    inlined SVGs (the C0 spike Q3 mitigation). Figures are rendered light-baked once and shared
    with the print path, so under slate they sit on a light-paper plate instead of being
    re-colored; the plate ground + hairline are the LIGHT tokens, projected from the SSOT. Scoped
    to the slate scheme, so light mode is untouched by construction."""
    paper = build_book._TOKENS.hex_("paper")
    rule = build_book._TOKENS.hex_("rule")
    return f"""
/* ── C2 dark extras (book_mkdocs.py) — light plates for light-baked SVGs (C0 spike Q3) ──────── */
[data-md-color-scheme="slate"] .md-typeset figure.book-figure svg,
[data-md-color-scheme="slate"] .md-typeset nav.roadmap-nav svg {{
  background: {paper}; border-radius: 8px; padding: 0.7rem 0.9rem; box-sizing: border-box;
}}
/* Brick thumbnails (the v2 appendix front doors, whenever that flag lands): plate the slot itself
   and solidify its dashed border; a textual placeholder slot (no SVG) stays on the dark panel. */
[data-md-color-scheme="slate"] .md-typeset .brick-fig:has(> svg) {{
  background: {paper}; border: 1px solid {rule}; color: {build_book._TOKENS.hex_("muted")};
}}
"""


def _assert_mermaid_px_parity(tracked_css: str) -> None:
    """config==CSS invariant: the tracked sheet's mermaid label sizes must equal the token SSOT's
    `mermaid_label_px()` (the same values the mermaid LAYOUT config uses), so the CSS can never
    render a label bigger than the box mermaid laid out. Fail loud on drift — the fix is a one-line
    edit to book/web-assets/mage-book.css."""
    px = _dtokens.mermaid_label_px(build_book._TOKENS)
    want = {
        "node": rf"pre\.mermaid \.nodeLabel[^{{]*\{{\s*font-size:\s*{px['node']}px",
        "message": rf"pre\.mermaid text\.messageText\s*\{{\s*font-size:\s*{px['message']}px",
    }
    for name, pat in want.items():
        if not re.search(pat, tracked_css):
            raise SystemExit(
                f"book_mkdocs: {TRACKED_CSS.relative_to(ROOT)} mermaid {name}-label font-size "
                f"disagrees with design_tokens.mermaid_label_px() ({px[name]}px) — update the "
                f"tracked sheet to match the token SSOT (config==CSS invariant)")


def _compose_css() -> str:
    """The served mage-book.css: the projected @font-face block (URLs rewritten to the docs-served
    fonts dir) + the projected :root token block + the TRACKED hand-owned content sheet
    (book/web-assets/mage-book.css) + the projected slate token remap (dark reading plane) + the
    slate-scoped SVG light plates. Token segments come from book-models/design-tokens.json at emit
    time, so tokens keep one home and dark mode follows a token edit with no CSS change."""
    if not TRACKED_CSS.is_file():
        raise SystemExit(f"book_mkdocs: {TRACKED_CSS} missing — the tracked content sheet is "
                         "the hand-owned source of truth for the book's content-plane rules")
    tracked = TRACKED_CSS.read_text(encoding="utf-8")
    _assert_mermaid_px_parity(tracked)
    # Strip the tracked sheet's hand-owned header comment; the composed sheet carries its own banner.
    rules = tracked.split("*/", 1)[1] if tracked.lstrip().startswith("/*") else tracked

    fonts = _dtokens.google_fonts_link(build_book._TOKENS, rel_root="../")
    m = re.fullmatch(r"\s*<style>(.*)</style>\s*", fonts, re.S)
    if not m:
        raise SystemExit("book_mkdocs: google_fonts_link is not a single <style> block — update _compose_css")
    fontface = m.group(1)
    if "../book/fonts/" not in fontface:
        raise SystemExit("book_mkdocs: expected ../book/fonts/ URLs in the @font-face block")
    fontface = fontface.replace("../book/fonts/", "fonts/")

    return (
        "/* GENERATED by book/book_mkdocs.py — do not hand-edit (regenerate: python3 "
        "book/book_mkdocs.py).\n   Composed from the TRACKED hand-owned "
        "book/web-assets/mage-book.css (the book content plane) plus\n   the projected token "
        "segments (@font-face, :root block, dark-scheme remap, SVG light plates) from\n   "
        "book-models/design-tokens.json. Edit the tracked sheet or the token SSOT, never this "
        "file. */\n"
        + fontface + "\n" + _dtokens.css_root_block(build_book._TOKENS) + rules
        + _dtokens.css_book_dark_block(build_book._TOKENS) + _dark_extras_css()
    )


# ── assets ───────────────────────────────────────────────────────────────────────────────────────

_ASSET_REF_RE = re.compile(r'(?:src|href)="(assets/[^"]+)"')
_FONT_URL_RE = re.compile(r"url\('fonts/([^']+)'\)")


def _copy_assets(docs: pathlib.Path, bodies: dict[str, str], css: str) -> list[str]:
    """Copy every asset the emitted pages / stylesheet actually reference: `assets/…` rasters from
    the page bodies, `fonts/…` faces from the rewritten @font-face block. Fail loud on a dangling
    reference."""
    copied: list[str] = []
    refs = sorted({r for body in bodies.values() for r in _ASSET_REF_RE.findall(body)})
    for rel in refs:
        src = HERE / rel
        if not src.is_file():
            raise SystemExit(f"book_mkdocs: page body references missing asset {src}")
        dst = docs / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(src, dst)
        copied.append(rel)
    for rel in sorted(set(_FONT_URL_RE.findall(css))):
        src = HERE / "fonts" / rel
        if not src.is_file():
            raise SystemExit(f"book_mkdocs: @font-face references missing font {src}")
        dst = docs / "assets" / "fonts" / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(src, dst)
        copied.append(f"assets/fonts/{rel}")
    return copied


# ── nav + config generation ──────────────────────────────────────────────────────────────────────


def _nav_label(c: dict) -> str:
    return build_book._plain(build_book._pager_label(c))


def _nav_entries(records: list[dict], extras: list[dict]) -> list[tuple[str, object]]:
    """The Part-hierarchy nav: consecutive same-part runs become sections labelled by the Part
    (`navigation.sections`); a single-page part (the appendix dividers, the Conclusion) stays a
    top-level item. The generated pages (term index / figures gallery / bibliography) group under
    a trailing Index section; the landing is Home."""
    entries: list[tuple[str, object]] = [("Home", "index.md")]
    i = 0
    while i < len(records):
        j = i
        while j < len(records) and records[j]["part"] == records[i]["part"]:
            j += 1
        run = records[i:j]
        if len(run) == 1:
            entries.append((_nav_label(run[0]), f'{run[0]["slug"]}.md'))
        else:
            entries.append((build_book._plain(build_book._part_label(run[0])),
                            [(_nav_label(c), f'{c["slug"]}.md') for c in run]))
        i = j
    entries.append(("Index", [(e["nav_title"], f'{e["slug"]}.md')
                              for e in extras if e["slug"] != "index"]))
    return entries


def _nav_yaml(entries: list[tuple[str, object]]) -> str:
    lines = ["nav:"]
    for label, target in entries:
        if isinstance(target, str):
            lines.append(f"  - {json.dumps(label)}: {json.dumps(target)}")
        else:
            lines.append(f"  - {json.dumps(label)}:")
            for sub_label, sub_target in target:
                lines.append(f"      - {json.dumps(sub_label)}: {json.dumps(sub_target)}")
    return "\n".join(lines)


def _mkdocs_yml(nav_yaml: str) -> str:
    """The generated MkDocs config: the shared family shell (web-theme custom_dir + mage-family.css,
    the same palette seed / features / family_links the Handbook web edition uses), the composed
    MAGE content CSS, and the generated nav. `use_directory_urls: false` + the pre-swap stems = URL
    parity with the retired hand-rolled pages."""
    return f"""# GENERATED by book/book_mkdocs.py — do not hand-edit (regenerate: python3 book/book_mkdocs.py).
# The MkDocs projection of the MAGE book — the PUBLISHED web edition (CI builds it into
# _site/book/mage-book/; the hand-rolled shell retired at the C3 publish swap).
site_name: {json.dumps(build_book._BOOK_MANIFEST["title"])}
site_description: {json.dumps(build_book._BOOK_MANIFEST.get("subtitle", "") + " — web edition.")}
repo_url: https://github.com/davisjam/model-based-agentic-software-engineering

docs_dir: docs
site_dir: site

# Flat <slug>.html pages, stems identical to the pre-swap published pages — every published URL and
# #anchor is unchanged across the C3 swap (the decisive constraint; no redirects needed).
use_directory_urls: false
strict: true

theme:
  name: material
  # The shared MAGE-family shell (header partial + mage-family.css) — path-relative to THIS file.
  custom_dir: ../../web-theme/overrides
  icon:
    logo: material/book-open-page-variant
  # No toc.* features: every page front-matters `hide: [toc]` (the right margin belongs to the
  # Tufte sidenotes, not a per-page TOC rail — author decision 260916).
  features:
    - navigation.sections
    - navigation.top
  # Neutral palette seed only; mage-family.css (projected from book-models/design-tokens.json)
  # overrides both schemes with the family tokens, and mage-book.css carries the book CONTENT
  # plane's slate remap + SVG light plates (Phase C2, projected from the same token SSOT).
  palette:
    - media: "(prefers-color-scheme: light)"
      scheme: default
      primary: black
      accent: brown
      toggle:
        icon: material/weather-night
        name: Switch to dark mode
    - media: "(prefers-color-scheme: dark)"
      scheme: slate
      primary: black
      accent: brown
      toggle:
        icon: material/weather-sunny
        name: Switch to light mode
  font: false  # no webfont fetch — the composed mage-book.css self-hosts the faces

extra_css:
  - assets/stylesheets/mage-family.css  # shared family shell (served from the theme custom_dir)
  - assets/mage-book.css                # MAGE content plane (tracked sheet + projected token segments)

plugins:
  - search

extra:
  family_links:
    - label: MAGE homepage
      url: https://davisjam.github.io/model-based-agentic-software-engineering/
    - label: Teach with MAGE
      url: https://davisjam.github.io/model-based-agentic-software-engineering/teach/

markdown_extensions:
  - attr_list
  - md_in_html
  - tables
  - toc:
      permalink: false

{nav_yaml}
"""


# ── emit ─────────────────────────────────────────────────────────────────────────────────────────


def emit(chapters: list[dict], extras: list[dict],
         web_dir: pathlib.Path = WEB) -> dict[str, str]:
    """Emit the whole MkDocs tree (docs/ + mkdocs.yml) from the build's page records.
    Returns a {relative path: sha256} manifest (the determinism check compares two of these).
    The emit is destructive over docs/ + mkdocs.yml only — a previously built site/ is left for
    mkdocs to overwrite."""
    emitted_slugs = {c["slug"] for c in chapters} | {e["slug"] for e in extras}
    expected = build_book.expected_page_slugs()
    if emitted_slugs != expected:
        missing = sorted(expected - emitted_slugs)
        extra = sorted(emitted_slugs - expected)
        raise SystemExit("book_mkdocs: URL-parity FAIL — emitted slug set != expected_page_slugs()"
                         f"\n  missing: {missing}\n  extra: {extra}")

    docs = web_dir / "docs"
    if docs.exists():
        shutil.rmtree(docs)
    docs.mkdir(parents=True)

    bodies: dict[str, str] = {}
    for c in chapters:
        bodies[c["slug"]] = _page_md(c, _nav_label(c))
    for e in extras:
        title = build_book._BOOK_MANIFEST["title"] if e["slug"] == "index" else e["nav_title"]
        if e["slug"] == "index":
            e = {**e, "main": _link_cover_to_pdf(e["main"])}
        bodies[e["slug"]] = _page_md(e, title)
    for slug, md in bodies.items():
        (docs / f"{slug}.md").write_text(md, encoding="utf-8")

    css = _compose_css()
    (docs / "assets").mkdir(exist_ok=True)
    (docs / "assets" / "mage-book.css").write_text(css, encoding="utf-8")
    assets = _copy_assets(docs, bodies, css)

    yml = _mkdocs_yml(_nav_yaml(_nav_entries(chapters, extras)))
    (web_dir / "mkdocs.yml").write_text(yml, encoding="utf-8")

    manifest: dict[str, str] = {}
    for p in sorted(docs.rglob("*")):
        if p.is_file():
            manifest[str(p.relative_to(web_dir))] = hashlib.sha256(p.read_bytes()).hexdigest()
    manifest["mkdocs.yml"] = hashlib.sha256(yml.encode()).hexdigest()

    interleaved = sum(1 for md in bodies.values() if "\n## " in md or "\n### " in md)
    print(f"book_mkdocs: emitted {len(bodies)} pages ({interleaved} with interleaved markdown "
          f"headings), {len(assets)} assets, mkdocs.yml ({len(manifest)} files) -> {web_dir}")
    return manifest


def _blockquote_gate(chapters: list[dict]) -> int:
    """BLOCKQUOTE-PLACEMENT GATE (BLOCKING). Nothing lands in the right rail by implicit inference:
    the renderer stamps its plain-fallback path with the `quote-implicit` class (see
    `_render_blockquote`), and this gate scans the bodies just emitted for that sentinel — the lint
    reads the renderer's own decision, so the two cannot drift. A finding means an un-armed plain
    blockquote would rail-float in HTML while the print projection sets it in-column; the author
    arms it (`<!-- inline-quote -->` / `<!-- epigraph -->` for the reading column,
    `<!-- sidenote -->` for the rail). Standalone audit + em-lead census:
    `python3 book/lint_blockquote_placement.py [--census]`."""
    pages = [str(WEB / "docs" / f'{c["slug"]}.md') for c in chapters]
    findings = _bq_lint.findings(pages=pages)
    if findings:
        for f in findings:
            print(f"BLOCKQUOTE-PLACEMENT GATE: {f}", file=sys.stderr)
        print(f"BLOCKQUOTE-PLACEMENT GATE: BLOCKING FAIL — {len(findings)} implicit plain "
              f"blockquote(s) would rail-float; arm each with its intended routing marker.",
              file=sys.stderr)
        return 1
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check-determinism", action="store_true",
                    help="emit twice from one build and fail unless the two trees are byte-identical")
    args = ap.parse_args(argv)

    chapters, extras = build_book.build_pages()
    first = emit(chapters, extras)
    if args.check_determinism:
        second = emit(chapters, extras)
        if first != second:
            diff = {k for k in first.keys() | second.keys() if first.get(k) != second.get(k)}
            print(f"book_mkdocs: DETERMINISM FAIL — {len(diff)} file(s) differ between two emits:\n  "
                  + "\n  ".join(sorted(diff)), file=sys.stderr)
            return 1
        print(f"book_mkdocs: determinism OK — two emits byte-identical ({len(first)} files)")
    return _blockquote_gate(chapters)


if __name__ == "__main__":
    raise SystemExit(main())
