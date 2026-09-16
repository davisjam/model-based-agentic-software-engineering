#!/usr/bin/env python3
"""book_mkdocs.py — the MkDocs (family web-shell) projection of the MAGE book.

Peer of `book_typst.py`: one typed book IR, three projections — hand-rolled HTML (the canonical,
published web edition), Typst (the print PDF), and this MkDocs site (Phase C1, parallel-run,
NON-published). The emitter changes NO content pass: it consumes the pages the canonical web build
just wrote (each page body is `md_to_html`'s output — float numbering, xrefs, citations, glosses,
mermaid→SVG all already applied) and re-projects them into a Material-shell site:

  book/web/            (gitignored — a generated tree, like the handbook's generated/web + dist)
    mkdocs.yml           generated config: shared web-theme custom_dir, generated Part-hierarchy nav
    docs/<slug>.md       one page per tracked book/<slug>.html, SAME stem → with
                         `use_directory_urls: false` every published URL + #anchor is unchanged
    docs/assets/         derived mage-book.css + self-hosted fonts + referenced raster assets
    site/                `mkdocs build` output (never published in C1)

C0-spike requirements folded in (spike/VERDICT.md, webbook-phaseC0-mage-spike-260916):
  1. chapter headings are interleaved as MARKDOWN `##`/`###` lines (carrying their `{#id}` anchors)
     between raw-HTML body chunks — Material's right-TOC rail and section-level search anchors
     populate ONLY from markdown headings; a raw <h2> is invisible to both. Attribute-carrying
     headings (the spike's 3.3.6 miss) are handled; only TOP-LEVEL headings are lifted (a heading
     nested in a blockquote / works-cited section / apparatus frame stays raw HTML).
  2. the book's `<main class="wrap …">` wrapper becomes a `<div class="wrap …">` (Material supplies
     <main>; nested mains are invalid HTML). The div is closed/reopened around each interleaved
     markdown heading so every chunk stays balanced and the page-class CSS hooks
     (`div.wrap.appendix`, `.part-page`, `.appendices-divider`) keep matching.
  3. @font-face URLs are rewritten to a docs-served fonts dir (Source Serif 4 / Source Sans 3 /
     IBM Plex Mono self-hosted under docs/assets/fonts/).
  4. the nav expresses the Part hierarchy (navigation.sections; single-page parts — dividers, the
     Conclusion — stay top-level items, mirroring the hand-rolled TOC's dedup rule).
  5. URL/anchor parity: emitted stems == `expected_page_slugs()` == the tracked book/*.html stems
     (asserted at emit time — the drift gate between this projection and the canonical build).
  6. the home page is the hand-rolled landing's own content (cover beside contents + the
     PDF-download / companion-SE-Handbook top row).
  7. no brick-grid front doors are assumed — the emitter projects exactly what the canonical build
     wrote at HEAD (the v2-appendix brick grid is flag-OFF and appears in no tracked page).
  8. referenced raster assets are scanned out of the emitted bodies and copied in; everything else
     (figures, mermaid, brick thumbs) is already inlined SVG.

Identity (DESIGN §7, ratified): rust stays the family accent; MAGE identity = its title +
Source Serif 4 reading column + component vocabulary + the ≈52rem measure
(`.md-grid { max-width: 76rem }`).

Phase C2 (dark mode + identity CSS, per the C0 spike Q1/Q3 verdicts) lives entirely in the derived
stylesheet + one emitter pass:
  - DARK reading plane: `design_tokens.css_book_dark_block()` re-declares every book token var from
    the SSOT's `palette-dark` set under `[data-md-color-scheme="slate"]` — the content CSS colors
    only through var(--…), so the whole plane (body ink, asides, semantic boxes, apparatus frames,
    appendix cards, sequence bar) follows the family dark scheme with zero hand-authored hex.
  - LIGHT PLATES: light-baked inlined SVGs (figures, mermaid, the roadmap nav, brick thumbs) sit on
    a light-paper plate under slate (`_dark_extras_css`); the plate is slate-scoped, so light mode
    is untouched by construction.
  - IN-COLUMN ASIDES (C0 Q1 variant (a)): sidenotes and cite/editorial notes keep one compact
    in-column presentation at every width, coexisting with Material's TOC rail; a citation marker
    whose note card directly precedes it is emitter-marked `cn-follow` (`_mark_note_followers`) and
    visually hidden — it would otherwise render as a one-glyph debris line between note cards.

The content CSS is DERIVED at emit time from `build_book.py`'s inline `CSS` / `_APPENDIX_V2_CSS`
strings (rescoped under `.md-typeset`), not duplicated into a tracked file — so during the whole
C1→C3 parallel run the two shells cannot drift; C3 freezes the derived sheet into a tracked
`mage-book.css` when it deletes the inline strings.

Usage:
  python3 book/book_mkdocs.py                     # canonical web build, then emit book/web/
  python3 book/book_mkdocs.py --no-build          # emit from the pages already on disk (CI)
  python3 book/book_mkdocs.py --check-determinism # emit twice, assert byte-identical trees
  python3 book/build_book.py --mkdocs [...]       # same, invoked through the build's target hook
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

sys.path.insert(0, str(HERE))
import build_book  # noqa: E402 — the canonical build; this emitter is a projection over its output
import design_tokens as _dtokens  # noqa: E402 — resolvable via build_book's book-models sys.path entry

# ── page inventory (mirror of build()'s discovery block; expected_page_slugs() pins parity) ──────


def _ordered_records() -> list[dict]:
    """The full reading-order page list — chapters + appendix + back matter + the generated
    List-of-Figures — exactly as `build()` assembles it (same discovery calls, same insertion
    point). Drift between this mirror and the build is caught by the `expected_page_slugs()`
    parity assert in `emit()`."""
    metrics = build_book._load_metrics()
    chapters = build_book._discover_chapters(metrics)
    chapters = chapters + build_book.build_appendix_chapters(
        next_part=max(c["part"] for c in chapters) + 1)
    chapters = chapters + build_book.build_backmatter_chapters(
        next_part=max(c["part"] for c in chapters) + 1)
    # The List of Figures and Tables sits just after the preface (same rule as
    # `_insert_list_of_floats`); an empty entry list yields the record without a body — only the
    # slug/title/part are needed here (the BODY comes from the rendered page like every other).
    lof = build_book._list_of_floats_chapter([], for_print=False)
    pi = next((k for k, c in enumerate(chapters) if c["slug"].endswith("preface")), -1)
    return chapters[: pi + 1] + [lof] + chapters[pi + 1:]


# ── rendered-page intake: <main> unwrap + markdown-heading interleave ────────────────────────────

_MAIN_RE = re.compile(r'<main class="([^"]*)"[^>]*>')
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


def _extract_main(page_html: str, slug: str) -> tuple[str, str]:
    """(main classes, inner HTML) of the page's single <main> landmark. The top `nav.toc` disclosure
    and the <head> shell sit outside <main> and are deliberately dropped — Material supplies the
    chrome."""
    b = page_html.find("<body")
    if b < 0:
        raise SystemExit(f"book_mkdocs: {slug}.html has no <body>")
    m = _MAIN_RE.search(page_html, b)
    if not m:
        raise SystemExit(f"book_mkdocs: {slug}.html has no <main class=…>")
    if _MAIN_RE.search(page_html, m.end()):
        raise SystemExit(f"book_mkdocs: {slug}.html has more than one <main> — unwrap is ambiguous")
    j = page_html.rfind("</main>")
    if j < m.end():
        raise SystemExit(f"book_mkdocs: {slug}.html has no </main>")
    return m.group(1), page_html[m.end(): j]


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
    only between) with an extra `cn-follow` class. In the in-column aside presentation the notes are
    display:block cards, so a marker sandwiched between two cards would render as a one-glyph debris
    line — its own note is the very next block and carries its number. The CSS visually hides
    `sup.cn-follow` (still in the a11y tree and anchor order); markers with running prose after the
    preceding note keep their inline place. An adjacent-sibling CSS selector cannot express this
    (`+` ignores intervening TEXT nodes), hence the emitter-side mark."""
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


def _page_md(slug: str, title: str) -> str:
    """One tracked book/<slug>.html → the MkDocs page markdown (front-matter title + wrap div +
    interleaved body)."""
    src = HERE / f"{slug}.html"
    if not src.is_file():
        raise SystemExit(f"book_mkdocs: {src} missing — run the canonical web build first")
    classes, inner = _extract_main(src.read_text(encoding="utf-8"), slug)
    wrap_open = f'<div class="{classes}">'
    body = _interleave(_mark_note_followers(inner.strip()), wrap_open, slug)
    return f"---\ntitle: {json.dumps(title)}\n---\n\n{wrap_open}\n{body}\n</div>\n"


# ── content CSS, derived from the canonical build's inline strings (no tracked twin to drift) ────

_SHIM_CSS = """
/* ── C1/C2 shim (book_mkdocs.py) — the book components fitted to the family shell ─────────────
   Q2 measure: Material's default 61rem grid yields a ~37rem content column — too tight for the
   book's voice. 76rem restores the book's ≈52rem reading measure (C0 spike, VERDICT Q2). */
.md-grid { max-width: 76rem; }
/* The page wrap div keeps its CLASSES (the appendix / part-page / divider CSS hooks) but cedes its
   geometry — Material's grid owns the measure now. */
.md-typeset div.wrap { max-width: none; margin: 0; padding: 0; }
/* Q1 sidenote strategy, variant (a), finalized: ONE compact in-column presentation at every width,
   coexisting with Material's TOC rail. The `.md-typeset`-prefixed selectors out-rank the base
   sheet's wide-screen gutter floats (whose -15rem right margins would land the notes under the
   rail), so no media query is needed — float-neutralization + presentation hold everywhere.
   Colors ride the token vars; the slate remap below restyles them for dark for free. */
.md-typeset blockquote.aside-sidenote {
  float: none; clear: none; width: auto; margin: 0.5rem 0 1.1rem;
  background: transparent; border-left: 2px solid var(--box-inset-rule);
  padding: 0.1rem 0 0.1rem 0.95rem; font-size: 14px; line-height: 1.55; color: var(--muted);
}
.md-typeset .cite-note, .md-typeset .editorial-note {
  float: none; clear: none; width: auto; max-width: 34rem; margin: 0.45rem 0 0.9rem;
  background: var(--panel); border-left: 3px solid var(--box-inset-rule);
  border-radius: 0 6px 6px 0; padding: 0.5rem 1rem 0.5rem 0.95rem;
  font-size: 13.5px; line-height: 1.55;
}
/* A citation marker whose note card DIRECTLY precedes it (emitter-marked `cn-follow`) would render
   as a one-glyph debris line between two cards — its number already leads the next card. Keep it in
   the a11y tree and anchor order; remove it from visual flow. */
.md-typeset sup.cn-follow {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); clip-path: inset(50%);
}
/* The wide-figure breakout (min(64rem,96vw), half-shift) centers on the VIEWPORT in the hand-rolled
   shell; inside Material's grid it would ride over the nav/TOC rails. Cap it to the column. */
.md-typeset figure.book-figure--wide { width: 100%; margin-left: 0; transform: none; }
/* The lifted bottom sequence bar sits inside .md-typeset now; keep its pills un-underlined. */
.md-typeset .chapnav a { text-decoration: none; }
"""


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


def _scope_bare_selectors(css: str) -> str:
    """Prefix TRULY BARE element selectors with `.md-typeset` so book typography never leaks into
    Material chrome (the exact scoping move the C0 spike validated). At-rules and class/id/attr/
    pseudo-led selectors pass through."""
    def _scope(match: re.Match) -> str:
        sels = match.group(1)
        if sels.lstrip().startswith("@"):
            return match.group(0)
        out = []
        for s in sels.split(","):
            first = s.strip().split(" ")[0]
            bare = bool(first) and not any(c in first for c in ".#[:") and re.match(r"^[a-z]", first)
            out.append(f".md-typeset {s.strip()}" if bare else s.strip())
        return ", ".join(out) + "{"
    return re.sub(r"([^{}]+)\{", _scope, css)


def _derive_css() -> str:
    """mage-book.css, derived from the canonical build's own style constants: the self-hosted
    @font-face block (URLs rewritten to the docs-served fonts dir), the token :root + content CSS
    (`body` rule rescoped to `.md-typeset`, bare selectors scoped, `main.wrap` → `div.wrap`), the
    appendix CSS, the C1/C2 shim, the projected slate token remap (dark reading plane), and the
    slate-scoped SVG light plates."""
    fonts = build_book.FONTS_LINK
    m = re.fullmatch(r"\s*<style>(.*)</style>\s*", fonts, re.S)
    if not m:
        raise SystemExit("book_mkdocs: FONTS_LINK is not a single <style> block — update _derive_css")
    fontface = m.group(1)
    if "../book/fonts/" not in fontface:
        raise SystemExit("book_mkdocs: expected ../book/fonts/ URLs in the @font-face block")
    fontface = fontface.replace("../book/fonts/", "fonts/")

    css = build_book.CSS + "\n" + build_book._APPENDIX_V2_CSS
    # The page-level `body` rule becomes the `.md-typeset` content-plane rule: keep the typography
    # declarations, drop the page-ground ones (Material owns <body>).
    bm = re.search(r"(?m)^body \{(.*?)\}", css, re.S)
    if not bm:
        raise SystemExit("book_mkdocs: no `body {` rule found in build_book.CSS — update _derive_css")
    decls = [d.strip() for d in bm.group(1).split(";") if d.strip()]
    keep = [d for d in decls if not d.startswith(("margin", "background"))]
    css = css[: bm.start()] + ".md-typeset { " + "; ".join(keep) + "; }" + css[bm.end():]
    if "* { box-sizing: border-box; }" not in css:
        raise SystemExit("book_mkdocs: box-sizing reset not found — update _derive_css")
    css = css.replace("* { box-sizing: border-box; }", "")
    if "main.wrap" not in css:
        raise SystemExit("book_mkdocs: no main.wrap selectors found — update _derive_css")
    css = css.replace("main.wrap", "div.wrap")  # the emitted pages carry a div, not a nested <main>
    css = _scope_bare_selectors(css)
    return (
        "/* GENERATED by book/book_mkdocs.py — do not hand-edit (regenerate: python3 "
        "book/book_mkdocs.py).\n   MAGE content plane inside the family Material shell: the "
        "canonical build's inline CSS, rescoped,\n   plus the projected dark-scheme token remap "
        "and the slate-only SVG light plates (Phase C2). */\n"
        + fontface + "\n" + css + "\n" + _SHIM_CSS
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


def _nav_entries(records: list[dict]) -> list[tuple[str, object]]:
    """The Part-hierarchy nav: consecutive same-part runs become sections labelled by the Part
    (`navigation.sections`); a single-page part (the appendix dividers, the Conclusion) stays a
    top-level item — the same dedup rule the hand-rolled TOC applies."""
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
    entries.append(("Index", [
        ("Index (terms)", f"{build_book.BOOK_INDEX_SLUG}.md"),
        ("Figures Gallery", f"{build_book._FIGURES_GALLERY_SLUG}.md"),
        ("Bibliography", f"{build_book._BIBLIOGRAPHY_SLUG}.md"),
    ]))
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
    the same palette seed / features / family_links the Handbook web edition uses), the derived
    MAGE content CSS, and the generated nav. `use_directory_urls: false` + tracked stems = URL
    parity with the hand-rolled pages."""
    return f"""# GENERATED by book/book_mkdocs.py — do not hand-edit (regenerate: python3 book/book_mkdocs.py).
# The MkDocs projection of the MAGE book (parallel-run, NON-published): the canonical
# hand-rolled book/*.html stays the published web edition until the C3 publish swap.
site_name: {json.dumps(build_book._BOOK_MANIFEST["title"])}
site_description: {json.dumps(build_book._BOOK_MANIFEST.get("subtitle", "") + " — web edition (MkDocs projection).")}
repo_url: https://github.com/davisjam/model-based-agentic-software-engineering

docs_dir: docs
site_dir: site

# Flat <slug>.html pages, stems identical to the tracked book/*.html — every published URL and
# #anchor is unchanged (the decisive C-phase constraint; no redirects needed).
use_directory_urls: false
strict: true

theme:
  name: material
  # The shared MAGE-family shell (header partial + mage-family.css) — path-relative to THIS file.
  custom_dir: ../../web-theme/overrides
  icon:
    logo: material/book-open-page-variant
  features:
    - navigation.sections
    - navigation.top
    - toc.follow
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
  font: false  # no webfont fetch — the derived mage-book.css self-hosts the faces

extra_css:
  - assets/stylesheets/mage-family.css  # shared family shell (served from the theme custom_dir)
  - assets/mage-book.css                # MAGE content plane, derived from build_book.py's CSS

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


def emit(web_dir: pathlib.Path = WEB) -> dict[str, str]:
    """Emit the whole MkDocs tree (docs/ + mkdocs.yml) from the canonical build's rendered pages.
    Returns a {relative path: sha256} manifest (the determinism check compares two of these).
    The emit is destructive over docs/ + mkdocs.yml only — a previously built site/ is left for
    mkdocs to overwrite."""
    records = _ordered_records()
    generated = [
        ("index", build_book._BOOK_MANIFEST["title"]),
        (build_book.BOOK_INDEX_SLUG, "Index (terms)"),
        (build_book._FIGURES_GALLERY_SLUG, "Figures Gallery"),
        (build_book._BIBLIOGRAPHY_SLUG, "Bibliography"),
    ]
    emitted_slugs = {c["slug"] for c in records} | {slug for slug, _ in generated}
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
    for c in records:
        bodies[c["slug"]] = _page_md(c["slug"], _nav_label(c))
    for slug, title in generated:
        bodies[slug] = _page_md(slug, title)
    for slug, md in bodies.items():
        (docs / f"{slug}.md").write_text(md, encoding="utf-8")

    css = _derive_css()
    (docs / "assets").mkdir(exist_ok=True)
    (docs / "assets" / "mage-book.css").write_text(css, encoding="utf-8")
    assets = _copy_assets(docs, bodies, css)

    yml = _mkdocs_yml(_nav_yaml(_nav_entries(records)))
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


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--no-build", action="store_true",
                    help="skip the canonical web build; emit from the book/*.html already on disk "
                         "(CI runs catalog.py build first)")
    ap.add_argument("--check-determinism", action="store_true",
                    help="emit twice and fail unless the two trees are byte-identical")
    args = ap.parse_args(argv)

    if not args.no_build:
        rc = build_book.build()
        if rc != 0:
            print("book_mkdocs: canonical web build failed — not emitting", file=sys.stderr)
            return rc

    first = emit()
    if args.check_determinism:
        second = emit()
        if first != second:
            diff = {k for k in first.keys() | second.keys() if first.get(k) != second.get(k)}
            print(f"book_mkdocs: DETERMINISM FAIL — {len(diff)} file(s) differ between two emits:\n  "
                  + "\n  ".join(sorted(diff)), file=sys.stderr)
            return 1
        print(f"book_mkdocs: determinism OK — two emits byte-identical ({len(first)} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
