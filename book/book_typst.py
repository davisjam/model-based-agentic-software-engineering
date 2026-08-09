"""IR → Typst emitter — the print-native projection of the book (the PRODUCTION PDF path).

WHAT THIS IS.  A print-native projection of the book's typed IR (`book/book_ir.py`): it walks the same
`Document → Chapter → Block` model the HTML build walks and emits **Typst** markup instead of HTML. The
Typst binary then compiles that to PDF. This is the "one model, many projections" the book preaches —
HTML (the web book) and Typst (the PDF) are two emitters over one IR, neither derived from the other.

WHY (the decision this settled).  The PDF used to be HTML → Paged.js (headless browser) → PDF, which
inherited browser artifacts, bloat, imperfect print typography, and a headless-browser dependency.
`IR → Typst → PDF` is the print-native path now in production (recorded in `book/IR-DESIGN.md`
§"PDF generation"): the Typst binary lays out the whole book in ~2 s and emits a small, tagged PDF with no
browser in the loop. The whole-book render is driven by `build_book_html.build_pdf` (the `--pdf` flag).

DISCIPLINE — OUTPUT ONLY.  This module is stdlib (it emits text) and READS `build_book_html` / `book_ir`
for the tokenizer, the IR, mermaid-SVG rendering, figure-asset resolution, and metrics — it does NOT modify
either. The web `build()` path is untouched: this emitter is the SECOND projection, invoked only by `--pdf`.

ANNOTATION MAPPING (the crux).  Each of our HTML-comment directives maps to a Typst native construct:

    our directive                       Typst construct
    ----------------------------------  --------------------------------------------------
    <!-- label: k --> + [ref:k]         #figure(...) <k>   +   @k   (a linked "Figure N")
    <!-- figure: path | cap -->         #figure(image(path), caption: [...])
    standalone ```mermaid ```           #figure(image(<cached SVG>), caption: [...])
    pipe table                          #figure(table(...), caption: [...])   (numbered "Table N")
    ``` fenced code ```                 ```lang ... ``` raw block
    heading / list / ordered / quote    =/==, list.item, enum.item, #quote
    <!-- eq: … -->                      $ … $  (block equation)
    {{token}} metric                    value substitution (data/metrics.json)  — done in the IR text
    <!-- index-def: slug -->            #metadata((slug, kind: "index-def")) + typst query
    <!-- point: … -->  (planned)        #metadata((slug, kind: "point", text)) + typst query

The `#metadata` + `typst query` pair is Typst's purpose-built mechanism for embedded, tool-queryable data —
so mapping our two model-annotation directives to it proves Typst can hold the whole model, queryable by an
external tool exactly as our HTML anchors are.
"""
from __future__ import annotations

import hashlib
import html as _htmlmod
import json
import pathlib
import re

import build_book_html as bb
import book_ir as ir
import design_tokens as _dtokens  # bb already put book-models on sys.path — the design-token projector

HERE = pathlib.Path(__file__).resolve().parent

# The Typst projection of the design-token SSOT (Umber Monograph): a `#let dt = (…)` preamble prepended
# to every compiled document so the header + box renderers look up dt.ink / dt.box-thesis-rule / dt.fs-*
# instead of literal hexes and grey values. One typed model, three surfaces (site / web book / PDF).
_TOKENS = _dtokens.load()
_TYPST_PREAMBLE = _dtokens.typst_preamble(_TOKENS)
_DEF_SLUGS = frozenset({"model", "agent", "engineering", "software-engineering"})

# ── Output-mode axis (single source of truth for every print-vs-screen typesetting decision) ────────
# The PDF projection targets ONE output medium. `OUTPUT_TYPE` names it, and every choice that differs
# between a screen PDF and a bound print edition branches on this ONE constant — so enabling a print
# edition later is a config flip here, not a rewrite spread across the emitter.
#   "screen" (default, the shipped output): a continuously-scrolled PDF read on a device. It has no
#            recto/verso and no facing pages, so part/appendix openers take a PLAIN page break — never a
#            recto-forcing `to: "odd"`, which would strand a blank verso the screen reader only sees as a
#            gratuitous empty page.
#   "print"  (future): a bound edition. Openers force a recto (odd) page, accepting a blank verso where
#            the prior section ends on an odd page — the standard print convention. Kept as a recoverable
#            branch so the print behaviour is a one-line flip, but NOT active.
OUTPUT_TYPE = "screen"

# Appendix chapter/note headings repeat many times (one per entry), so they read as a per-entry head, not
# a part-opener. The general H1 show rule sizes chapter titles at 1.5em (16.5pt on the 11pt body) — too
# large for a heading that recurs 29× down Appendix B. Appendix chapter titles override to this smaller
# absolute size: bigger than the 13.2pt H2 subsection heads below them (so the hierarchy stays legible),
# well under the 16.5pt part-opener scale. Absolute pt (not em) because inside the fired H1 show rule an
# `em` would resolve against the already-scaled 16.5pt heading size, not the body.
_APPENDIX_HEADING_SIZE = "14.5pt"
_MERMAID_CACHE = HERE / ".mermaid-svg-cache"
_MERMAID_CONFIG = HERE / "assets" / "mermaid-config.json"


# ── Inline markdown → Typst inline ─────────────────────────────────────────────────────────────────
# The HTML renderer's `inline()` handles: `code`, **bold**, *italic*, [+intra-word+], [text](href),
# [[abbr|text]] abstraction cites, [ref:key] cross-refs. We mirror it, emitting Typst inline markup.
# `[ref:key]` is handled specially — it becomes a Typst `@key` reference, the whole point of the mapping.

# Characters Typst treats as markup that must be escaped in body text.
_TYPST_ESCAPE = {
    "\\": "\\\\", "#": "\\#", "$": "\\$", "*": "\\*", "_": "\\_", "`": "\\`",
    "@": "\\@", "<": "\\<", ">": "\\>", "[": "\\[", "]": "\\]", "~": "\\~",
}


def _esc(text: str) -> str:
    """Escape Typst markup metacharacters in a run of plain body text."""
    return "".join(_TYPST_ESCAPE.get(ch, ch) for ch in text)


_XREF_RE = bb._XREF_RE                                   # SSOT: the same [ref:key] regex the HTML build uses
_CODE_SPAN_RE = re.compile(r"`([^`]+)`")
_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
_ITALIC_RE = re.compile(r"(?<![\w*])\*(?!\s)([^*]+?)(?<!\s)\*(?![\w*])")
_INTRAWORD_RE = re.compile(r"\[\+(.+?)\+\]")
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_ABBR_RE = re.compile(r"\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]")


def inline_typst(s: str) -> str:
    """Convert one run of the book's inline-markdown subset to Typst inline markup. Mirrors the branch order
    of `build_book_html.inline` (code spans stashed first so no bold/italic runs inside them), but the
    `[ref:key]` token becomes a Typst `@key` reference rather than an <a>. Everything else that is plain body
    text is escaped so a stray `#`/`*`/`@`/`_` in prose does not trigger Typst markup."""
    return _inline(s, [])


def _inline(s: str, stash: list[str]) -> str:
    """The worker for `inline_typst`. A SINGLE `stash` list is threaded through every recursion (bold/italic
    whose content itself holds a stashed code-span or link), so a placeholder index is globally unique and a
    nested run never restores against a shorter inner stash — the full-corpus bug a per-call stash caused."""
    def _hold(frag: str) -> str:
        stash.append(frag)
        return f"\x00S{len(stash) - 1}\x00"

    # 1. Cross-references FIRST — `[ref:key]` → a Typst `@key`. Held so later escaping leaves the `@` alone.
    s = _XREF_RE.sub(lambda m: _hold(f"@{m.group(1)}"), s)
    # 1b. Citations `[cite: key(, loc); key2]` → Typst `#cite(<key>)` (chicago-notes → a numbered footnote
    #     citation). Multiple keys emit multiple #cite; a locator becomes the citation supplement. The
    #     #bibliography emit_document appends renders these — Typst's own engine, the SAME references.bib
    #     that generated citations.json, so the PDF's reference strings equal the web book's (BIB-5 parity).
    def _cite(m: "re.Match[str]") -> str:
        frags = []
        for key, loc in bb.parse_cite_spec(m.group(1)):
            frags.append(f"#cite(<{key}>, supplement: [{_esc(loc)}])" if loc else f"#cite(<{key}>)")
        return _hold("".join(frags))
    s = bb._CITE_MARKER_RE.sub(_cite, s)
    # 1c. Editorial notes `[note: text]` → a Tufte MARGIN note (symbolic mark, web `.editorial-note`
    #     parity). A note too tall for the margin falls back to the old page-bottom `#footnote`.
    def _note(m: "re.Match[str]") -> str:
        inner = _inline(m.group(1).strip(), stash)
        return _hold(f"#sidenote([{inner}], footnote[{inner}], marked: true)")
    s = bb._NOTE_MARKER_RE.sub(_note, s)
    # 2. Intra-word emphasis `[+X+]` → emphasised run.
    s = _INTRAWORD_RE.sub(lambda m: _hold(f"#emph[{_esc(m.group(1))}]"), s)
    # 3. Code spans `` `x` `` → raw inline; content is literal, no further passes run inside it.
    s = _CODE_SPAN_RE.sub(lambda m: _hold(f"#raw({_typst_str(m.group(1))})"), s)
    # 4. Abstraction cites `[[slug|text]]` → a link into the rendered abstractions glossary (one dir up).
    def _abbr(m: "re.Match[str]") -> str:
        slug = m.group(1).strip()
        text = (m.group(2) or slug).strip()
        return _hold(f'#link("../ABSTRACTIONS.html#{slug}")[{_esc(text)}]')
    s = _ABBR_RE.sub(_abbr, s)
    # 5. Markdown links `[text](href)` → `#link(href)[text]`.
    s = _LINK_RE.sub(lambda m: _hold(f"#link({_typst_str(m.group(2))})[{_esc(m.group(1))}]"), s)
    # 6. Bold / italic → strong / emph. Non-greedy bold so an inner *italic* survives. The recursion threads
    #    the SAME stash so an already-held placeholder inside the span is never re-restored out of range.
    s = _BOLD_RE.sub(lambda m: _hold(f"#strong[{_inline(m.group(1), stash)}]"), s)
    s = _ITALIC_RE.sub(lambda m: _hold(f"#emph[{_inline(m.group(1), stash)}]"), s)
    # 7. Escape everything still plain, then restore the held Typst fragments (repeatedly — a held fragment
    #    may itself contain a placeholder from a later-numbered hold, e.g. a link nested in bold).
    s = _esc(s)
    while "\x00S" in s:
        s = re.sub(r"\x00S(\d+)\x00", lambda m: stash[int(m.group(1))], s)
    return s


def _typst_str(s: str) -> str:
    """A Typst string literal for `s` (double-quoted, backslash/quote-escaped)."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


# Heading anchors promoted to a Typst label (see `_render_heading`) — the intra-document `#link` targets.
# Two families: the Appendix-A legend's constituent parts (`a-<idx>-<slug>`), and a numbered Part's landing
# anchor (`part-<N>`) so the Part-nav strip can `#link(<part-N>)` to any Part. Scoped so no other heading grows
# a document-wide label that could collide.
_LEGEND_ANCHOR_RE = re.compile(r"^(a-\d+-|part-\d+$)")


# ── Appendix v2 render-mechanism Typst twins (flag ON; restructure sub-wave 2) ──────────────────────
# Each mirrors an `build_book_html` HTML render path, CALLING that module for its data (the one source of the
# legend rows / packed brick rows), so the two projections cannot disagree on membership, order, or labels.

def _render_stack_legend(directive_line: str) -> str:
    """`<!-- stack-legend: <stem> | <letter> | <idx> -->` → the Typst linked legend beneath a stack's overview
    figure (§13.5). One enumerated row per constituent part: the role label, then a `#link(<a-idx-slug>)` whose
    text is the mechanism name + its generated locator (`Mutator Stamps (§A.1.2)`). The label resolves to the
    part's inline subsection heading (see `_render_heading`); the SVG's own internals are untouched."""
    arg = directive_line[len("<!--"):-len("-->")].strip()[len("stack-legend:"):].strip()
    stem, letter, idx = [p.strip() for p in arg.split("|")]
    rows = bb._stack_legend_rows(stem, letter, int(idx))
    if not rows:
        return ""
    lines = []
    for label, name, loc, anchor in rows:
        role = f"#strong[{_esc(label)}] " if label else ""
        link = f"#link(<{anchor}>)[{inline_typst(name)} (§{_esc(loc)})]"
        lines.append(f"+ {role}{link}")
    body = "\n".join(lines)
    return ("#block(width: 100%, inset: (x: 10pt, y: 8pt), radius: 6pt, "
            "stroke: (left: 2pt + dt.accent, rest: 0.5pt + dt.rule), fill: dt.panel)[\n"
            + _indent(body) + "\n]")


def _render_brick_grid(directive_line: str) -> str:
    """`<!-- brick-grid: <group> -->` → the packed Typst brick grid for one Appendix-C zone (§14). The packer
    (`build_book_html._brick_pack`) resolves the rows and per-brick spans; here each row becomes a `#grid` of
    two columns whose cells use `grid.cell(colspan: …)` for a wide brick. Each cell is a bordered block —
    a thumbnail slot, the linked name, a stub summary, the metadata footer. Thumbnails are UNNUMBERED (§5.4):
    plain cells, never a `#figure`, so no brick enters the PDF's figure stream."""
    group = directive_line[len("<!--"):-len("-->")].strip()[len("brick-grid:"):].strip()
    ncols = bb._BRICK_NCOLS
    flagship = bb._flagship_slugs()
    cells = bb._brick_cells(group, flagship, ncols)
    if not cells:
        return ""
    out: list[str] = []
    for row in bb._brick_pack(cells, ncols):
        typst_cells = []
        for c in row:
            span = c["span"]
            online = " (online)" if not c["is_flagship"] else ""
            summary = inline_typst(c["summary"]) if c["summary"] else \
                "#emph[Three-sentence summary authored in a later sub-wave.]"
            meta = _esc(bb._brick_meta_line(c))
            thumb = bb._brick_thumb_svg_path(c)
            if thumb:
                rel = _root_rel(thumb, _EmitCtx.root)
                # R7 (#1 feedback): a TALLER thumbnail slot so the diagram/glyph text reads larger; the
                # summary font drops in step. Uniform across bricks, so equal-size (R6) is untouched.
                fig_block = (
                    "#block(width: 100%, height: 5.4em, radius: 4pt, stroke: 0.5pt + dt.rule, "
                    "fill: dt.panel, inset: 4pt, clip: true)[#align(center + horizon)["
                    f"#image({_typst_str(rel)}, fit: \"contain\", width: 100%, height: 100%)]]"
                )
            else:
                fig_block = (
                    "#block(width: 100%, height: 5.4em, radius: 4pt, stroke: (paint: dt.rule, dash: \"dashed\"), "
                    "fill: dt.panel, inset: 6pt)[#align(center + horizon)[#text(size: 8pt, fill: dt.muted)[STRUCTURE DIAGRAM]]]"
                )

            # ── The technique/instance overlay (mirror of the HTML renderer; print shows NAMES, not links) ──
            kicker = ""
            if c.get("kind") == "technique" and c.get("abstract_name"):
                kicker = (f"#text(size: 7.5pt, weight: \"bold\", tracking: 0.08em, fill: dt.accent)"
                          f"[TECHNIQUE · {inline_typst(c['abstract_name'])}]\n\n")
            backref = ""
            if c.get("kind") == "instance" and c.get("parent_technique_name"):
                pname = inline_typst(c["parent_technique_name"])
                if c.get("is_domain_specific"):
                    backref = (f"\n\n#text(size: 8pt, weight: \"semibold\", fill: dt.accent)"
                               f"[A document-accessibility instance of the technique: {pname} →]")
                else:
                    backref = f"\n\n#text(size: 8pt, fill: dt.muted)[An instance of: {pname} →]"
            adv = ""
            if c.get("kind") == "technique" and c.get("advanced_examples"):
                names = ", ".join(inline_typst(nm) for nm, _url in c["advanced_examples"])
                adv = f"\n\n#text(size: 7.5pt, fill: dt.muted)[Advanced examples → {names}]"
            note_ref = ""
            if c.get("is_flagship") and c.get("appendix_num"):
                note_ref = (f"\n\n#text(size: 7.5pt, fill: dt.muted)"
                            f"[Engineering Note → B.{c['appendix_num']}]")

            cell_body = (
                fig_block + "\n"
                + kicker
                + f"#link({_typst_str(c['catalogue_html'])})[#strong[{inline_typst(c['name'])}]]{_esc(online)}"
                + backref + "\n\n"
                f"#text(size: 9pt)[{summary}]"
                + adv + "\n\n"
                f"#text(size: 8.5pt, fill: dt.muted)[{meta}]"
                + note_ref
            )
            cell = ("#block(width: 100%, radius: 8pt, stroke: 0.5pt + dt.rule, inset: 9pt, breakable: false)[\n"
                    + _indent(cell_body) + "\n]")
            colspan = f"grid.cell(colspan: {span})[{cell}]" if span > 1 else f"[{cell}]"
            typst_cells.append(colspan)
        out.append(
            f"#grid(\n  columns: {ncols}, gutter: 10pt,\n  "
            + ",\n  ".join(typst_cells) + "\n)")
    return "\n\n".join(out)


# ── Asset resolution — mermaid SVG cache + figure directives ───────────────────────────────────────

def _mermaid_svg_path(source: str) -> pathlib.Path:
    """The on-disk cached SVG for a mermaid fence body — the SAME content-hash key `render_mermaid_svg`
    uses, so we reuse its cache instead of re-rendering. If the cache miss, we drive the HTML renderer's
    `render_mermaid_svg` (which renders + caches) then return the path."""
    src = source.strip()
    cached = _MERMAID_CACHE / f"{bb._mermaid_cache_key(src)}.svg"
    if not cached.exists():
        bb.render_mermaid_svg(src)                       # renders + writes the cache file (fails loud if mmdc absent)
    return cached


def _root_rel(path: pathlib.Path, root: pathlib.Path) -> str:
    """A Typst root-absolute image path (`/…`) for `path` relative to the compilation `root`. Typst reads a
    leading-`/` image path relative to `--root`; a plain relative path is relative to the .typ file."""
    return "/" + str(path.resolve().relative_to(root.resolve()))


def _fence_body(block: str) -> tuple[str, str]:
    """Split a ```lang … ``` fence into (lang, inner)."""
    lines = block.splitlines()
    lang = lines[0].strip()[3:].strip()
    inner = lines[1:]
    if inner and inner[-1].strip() == "```":
        inner = inner[:-1]
    return lang, "\n".join(inner)


# ── Block-kind renderers — a `render_typst(block)` sibling to `Block.render_html()` ─────────────────

def _render_heading(raw: str, section_no: str | None = None) -> str:
    """`#`..`####` → Typst `==`..`=====` (one level DEEPER than the markdown depth). The `+1` offset makes
    room for the Part divider at Typst level-1, so the PDF bookmark tree nests Part → Chapter → section: a
    chapter title emits at level-2 (see `render_chapter`), a `##` section at level-3, a `###` subsection at
    level-4. The show-rules in `_PREAMBLE` are keyed to the shifted levels so the rendered sizes still
    descend. A trailing `{#slug}` id-anchor and an `## [role: X]` kicker are folded into the heading text (the
    kicker as an emphasised lead). Level logic below keys on the RAW markdown depth (`##` == level 2), not the
    emitted depth, so the kicker/section-number stamping is unaffected by the offset.

    `section_no` (e.g. "1.1.3") is the DISPLAY-ONLY `part.chapter.section` locator the driving walk stamps
    on a `## ` (level-2) section heading — the Typst twin of the web build's `sec-num` span. Muted so it
    reads as a reference number, not part of the title; it never touches the `{#slug}` anchor (peeled first),
    so `@ref`/index queries still resolve. Passed only for numbered body/back-matter chapters."""
    stripped = raw.strip()
    level = len(stripped) - len(stripped.lstrip("#"))
    text = stripped[level:].strip()
    text, anchor_attr = bb._heading_anchor(text)
    # A constituent-part anchor (`{#a-<idx>-<slug>}`, the Appendix-A legend targets) becomes a Typst label on
    # the heading, so the legend's `#link(<a-idx-slug>)` resolves as an intra-document jump in the PDF (the
    # HTML twin is the heading's `id`). Scoped to this anchor family so no other heading grows a label (which
    # could collide document-wide); these ids are unique by (stack idx, slug).
    label = ""
    am = re.search(r'id="([^"]+)"', anchor_attr)
    if am and _LEGEND_ANCHOR_RE.match(am.group(1)):
        label = f" <{am.group(1)}>"
    kicker = ""
    if level == 2:
        kick, text = bb._role_kicker(text)
        if kick:
            m = re.search(r">([^<]+)</span>", kick)
            if m:
                kicker = f"#emph[{_esc(m.group(1).strip())}] "
    num = f"#text(fill: dt.muted)[{section_no}] " if (level == 2 and section_no) else ""
    return "=" * (level + 1) + " " + num + kicker + inline_typst(text) + label


def _render_paragraph(raw: str) -> str:
    # Strip any stray HTML comment (an authoring TODO/note whose keyword is not in the notation vocabulary).
    # The IR peels every RECOGNIZED marker into a DIRECTIVE (rendered as nothing); a comment that reaches a
    # PARA block is stray and would otherwise print as VISIBLE text in the PDF (the leak this closes). Removed
    # here, mirroring the web renderer's block-level strip; both share `build_book_html._STRAY_COMMENT_RE`. A
    # block that was nothing but a stray comment renders empty and is dropped by `render_chapter`'s `if frag`.
    raw = bb._STRAY_COMMENT_RE.sub("", raw)
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    if not lines:
        return ""
    return inline_typst(" ".join(lines))


def _render_unordered_list(raw: str) -> str:
    items: list[str] = []
    for ln in raw.splitlines():
        s = ln.strip()
        if s.startswith("- "):
            items.append(s[2:])
        elif items:
            items[-1] += " " + s
    return "\n".join(f"- {inline_typst(t)}" for t in items)


def _render_ordered_list(raw: str) -> str:
    items: list[str] = []
    for ln in raw.splitlines():
        s = ln.strip()
        if re.match(r"^\d+\.\s", s):
            items.append(re.sub(r"^\d+\.\s+", "", s))
        elif items:
            items[-1] += " " + s
    return "\n".join(f"+ {inline_typst(t)}" for t in items)


def _render_argues_claims(raw: str) -> str:
    """Page-scoped print treatment for the six central claims on "What This Book Argues" — the Typst twin of
    the web `.argues-page ol` (larger claim text, more air between claims, accent-coloured bold numerals).
    Scoped to a single content block via `#[ … ]` so no other numbered list in the book changes. The claim
    prose (each led by a `**bold.**` lead-in) renders exactly as an ordinary ordered list would; only the
    enum's size, item spacing, and numeral style differ. The page's HEADING is left as the ordinary (now
    semibold) chapter title — confidence through clarity, no decorative treatment."""
    items: list[str] = []
    for ln in raw.splitlines():
        s = ln.strip()
        if re.match(r"^\d+\.\s", s):
            items.append(re.sub(r"^\d+\.\s+", "", s))
        elif items:
            items[-1] += " " + s
    body = "\n".join(f"+ {inline_typst(t)}" for t in items)
    return (
        "#[\n"
        "  #set text(size: 1.06em)\n"
        "  #set enum(spacing: 1.15em, numbering: n => text(fill: dt.accent, weight: \"bold\")[#n.])\n"
        f"{_indent(body)}\n"
        "]"
    )


def _render_code(raw: str) -> str:
    """A non-mermaid fence → a Typst raw block. Language-tagged so Typst can highlight (unknown langs are
    fine — Typst falls back to plain). We emit an explicit `#raw(..., block: true)` so arbitrary body text
    (which may contain ``` sequences) never breaks the fence."""
    lang, inner = _fence_body(raw)
    lang_arg = f", lang: {_typst_str(lang)}" if lang else ""
    # fit-block scales a code block wider than the (narrow Tufte) text measure down to fit — a raw block
    # must not wrap, so wide ASCII art is uniformly shrunk rather than mangled. Narrow blocks are untouched.
    return f"#fit-block(raw({_typst_str(inner)}, block: true{lang_arg}))"


# A thesis blockquote leads with a bold `The <Name> Thesis.` label (`> **The Modeling Thesis.** …`). The
# HTML book lifts these into a coloured `thesis-box` panel; the print projection mirrors that by boxing them
# instead of typesetting them as a plain quote. Matched on the raw markdown lead (the HTML twin matches the
# rendered `<p><strong>…Thesis.</strong>`); the two stay in step by construction of the same authored shape.
_THESIS_LEAD_RE = re.compile(r"^\*\*The\b.*?\bThesis\.\*\*", re.S)

# A DEFINITION lead: a bold `**Term.**` label whose bold text ENDS in a period (`> **Churn.** …`). Mirrors
# the web book's `def-inset` — the definition body italicises while the bold Term stays upright. The trailing
# period inside the bold is the discriminator (an em-led footnote or a plain sidenote has no such lead), and
# theses / core-term def-boxes are matched earlier, so this only ever fires on a light glossary/aside label.
_DEFN_LEAD_RE = re.compile(r"^\*\*[^*]+\.\*\*")

# An EM-LED aside: an italic lead (`> *A footnote on "waterfall."* …`), NOT a `**bold**` lead. On the web
# these are the light `.aside-sidenote` Tufte gutter notes; in print they go to the right margin via
# `#sidenote` (a too-tall one falls back in-column). Bold-led theses/def-boxes are matched earlier, so this
# only fires on the italic-lead catch-all.
_EMLED_RE = re.compile(r"^\*[^*].*?\*")

# Definition typography, injected at the head of a def-inset / def-box block: italicise the body, but reset
# every `strong` to upright so the bold Term LEAD reads as a label, not emphasis. (Definitions are short
# glossary asides, so a body-wide strong-reset matches the web's "leading term upright" without a first-only
# selector.) Mirrors `blockquote.def-inset`/`.def-box` typography in the web stylesheet.
_DEFN_ITALIC_PRELUDE = '#show strong: set text(style: "normal")\n  #set text(style: "italic")\n  '

def _render_blockquote(raw: str, is_def: bool = False, is_pullquote: bool = False,
                       is_thesisbox: bool = False) -> str:
    """A `>`-prefixed blockquote → a Typst block. An explicit `<!-- pullquote -->` marker (`is_pullquote`)
    becomes a label-less pull-quote — large centered italic display type, a thin accent rule above and below,
    NO fill (checked first, since an author declaration outranks lead-text-shape inference). An explicit
    `<!-- thesisbox -->` marker (`is_thesisbox`) becomes a part-opener GREEN box with a full 4-side frame and,
    when the block leads with a `### TITLE` heading, a centered ALLCAPS title-bar in the green family (the
    print twin of the web `blockquote.thesis-box .inset-title`); checked before the lead-text thesis test so a
    TITLED box is boxed, not typeset as a plain heading. A thesis blockquote (`> **The … Thesis.** …`) becomes
    a GREEN boxed callout; a core-term definition blockquote (armed by a preceding index-def, `is_def`) a BLUE
    def-box; any other blockquote stays a plain `#quote(block: true)[…]`. All mirror the web book's constructs
    and draw their colours from the shared `dt` tokens. Inner content is itself markdown; we recurse the whole
    emitter over it so an inner heading/list/mermaid renders."""
    inner_md = "\n".join(bb._strip_blockquote_prefix(ln) for ln in raw.splitlines())
    inner = _render_markdown_body(inner_md, _EmitCtx.inert())
    stripped = inner_md.strip()
    if is_thesisbox:
        # A part-opener thesis box: full 4-side green frame. A leading `### TITLE` line becomes a centered
        # ALLCAPS title-bar (green rule/ink); the rest renders as the box body. Mirrors the web title-bar.
        lines = inner_md.splitlines()
        title = None
        body_md = inner_md
        if lines and lines[0].lstrip().startswith("#"):
            title = re.sub(r"^\s*#+\s*", "", lines[0]).strip()
            body_md = "\n".join(lines[1:]).strip()
        body = _render_markdown_body(body_md, _EmitCtx.inert())
        title_bar = ""
        if title:
            title_bar = (
                "#align(center)[#text(font: dt.font-display, weight: 700, size: dt.fs-card-title, "
                "fill: dt.box-thesis-rule, tracking: 0.08em)[#upper[" + inline_typst(title) + "]]]\n"
                "  #v(2pt)\n  #line(length: 100%, stroke: dt.border-hairline + dt.box-thesis-rule)\n"
                "  #v(8pt)\n  "
            )
        return (f'#block(fill: dt.box-thesis-fill, stroke: dt.border-hairline + dt.box-thesis-rule, '
                f"inset: 12pt, radius: 4pt, width: 100%)[\n  {title_bar}{_indent(body).lstrip()}\n]")
    if is_pullquote:
        # An explicit-marker pull-quote — mirrors the web `.pull-quote` CSS token-for-token: display serif,
        # italic, thesis-title size, umber hairline rule top+bottom, centered, NO fill (absence of a fill is
        # what keeps it visually distinct from the box family).
        return (
            "#align(center)[\n"
            "  #block(width: 82%, "
            "stroke: (top: dt.border-hairline + dt.accent, bottom: dt.border-hairline + dt.accent), "
            "inset: (y: 14pt))[\n"
            "    #set text(font: dt.font-display, style: \"italic\", weight: 600, "
            "size: dt.fs-thesis-title, fill: dt.ink)\n"
            "    #set par(justify: false, leading: 0.62em)\n"
            f"{_indent(inner, 4)}\n"
            "  ]\n"
            "]"
        )
    if _THESIS_LEAD_RE.match(stripped):
        return (f'#block(fill: dt.box-thesis-fill, stroke: (left: dt.border-box-rule + dt.box-thesis-rule), '
                f"inset: 12pt, radius: 4pt, width: 100%)[\n{_indent(inner)}\n]")
    if is_def:
        # A core-term def-box: blue panel, definition body italic with the bold Term lead upright.
        return (f'#block(fill: dt.box-def-fill, stroke: (left: dt.border-box-rule + dt.box-def-rule), '
                f"inset: 12pt, radius: 4pt, width: 100%)[\n  {_DEFN_ITALIC_PRELUDE}{_indent(inner).lstrip()}\n]")
    if stripped.startswith("#"):
        # A titled concept-inset primer (`> ### Inset N — Title`) → a LAVENDER box, mirroring the web book's
        # `concept-inset` (an inner heading heads the primer). The heading renders bold inside the panel.
        return (f'#block(fill: dt.box-inset-fill, stroke: (left: dt.border-box-rule + dt.box-inset-rule), '
                f"inset: 12pt, radius: 4pt, width: 100%)[\n{_indent(inner)}\n]")
    if _DEFN_LEAD_RE.match(stripped):
        # A light `> **Term.** …` definition aside: plain quote, body italic, bold Term lead upright.
        return (f"#quote(block: true)[\n  {_DEFN_ITALIC_PRELUDE}{_indent(inner).lstrip()}\n]")
    if _EMLED_RE.match(stripped):
        # An em-led aside → a right-margin Tufte sidenote (web `.aside-sidenote` parity), no reference
        # mark. A note too tall for the margin falls back to the in-column quote by the measure-gate.
        # fallback is a call ARGUMENT (code mode) → no leading `#`
        quote_fallback = f"quote(block: true)[\n{_indent(inner)}\n]"
        return f"#sidenote([\n{_indent(inner)}\n], {quote_fallback})"
    return f"#quote(block: true)[\n{_indent(inner)}\n]"


def _render_inset(raw: str) -> str:
    """A titled inset (`<!-- inset: T -->` glued to a fence) → a bordered block with the title as a bold
    lead and the fence body below (mermaid → the cached SVG image, else a raw code block)."""
    lines = raw.strip().splitlines()
    title = bb._INSET_RE.match(lines[0].strip()).group("title")
    lang, inner = _fence_body("\n".join(lines[1:]))
    if lang.lower() == "mermaid":
        p = _mermaid_svg_path(inner)
        body = f'#image("{_root_rel(p, _EmitCtx.root)}", width: 90%)'
    else:
        body = f"#raw({_typst_str(inner)}, block: true)"
    return (f"#block(fill: dt.box-inset-fill, inset: 10pt, "
            f"stroke: (left: dt.border-box-rule + dt.box-inset-rule), radius: 3pt, width: 100%)[\n"
            f"  #text(fill: dt.ink)[#strong[{inline_typst(title)}]]\n\n  {body}\n]")


def _render_table(block: Block_t) -> str:
    """A pipe table → a Typst `#figure(table(...))` so it is NUMBERED "Table N" and cross-referenceable.
    A `<!-- table: caption -->` arms the caption; a `<!-- label: k -->` arms the `<k>` label for `@k`."""
    lines = block.raw.splitlines()
    header = bb._split_table_row(lines[0])
    ncol = len(header)
    body_rows = [bb._split_table_row(ln) for ln in lines[2:] if ln.strip()]
    aligns = bb._col_alignments(lines[1]) if len(lines) > 1 else []
    align_arg = ""
    if any(a for a in aligns):                           # a `---:` column right-aligns (numeric), else left
        cols = ", ".join("right" if (i < len(aligns) and aligns[i]) else "left" for i in range(ncol))
        align_arg = f"\n    align: ({cols}),"
    # A pipe table with an entirely empty header row is the catalogue's "metadata card" idiom (`| | |`) — a
    # key/value reference box, NOT a numbered content float. Render it as a bare `fit-table` grid (no
    # `#figure` wrapper, so no "Table N" number, no caption, no list-of-floats entry), matching the HTML
    # `.meta-card` twin. Real tables keep the header + booktabs rules + numbering below.
    meta_card = all(not c.strip() for c in header)
    if meta_card:
        cells = ["table.hline(stroke: 1pt)"]
        for row in body_rows:
            row = (row + [""] * ncol)[:ncol]
            cells.append(", ".join(f"[{inline_typst(c)}]" for c in row))
        cells.append("table.hline(stroke: 1pt)")
        tbl = f"table(\n    columns: {ncol},{align_arg}\n    " + ",\n    ".join(cells) + "\n  )"
        return f"#fit-table({tbl})"
    # Booktabs rules: heavy top, light under-header, heavy bottom — the three-rule Tufte style.
    cells = ["table.hline(stroke: 1pt)",
             "table.header(" + ", ".join(f"[{inline_typst(c)}]" for c in header) + ")",
             "table.hline(stroke: 0.5pt)"]
    for row in body_rows:
        # pad/truncate to header width so Typst's fixed column count never desyncs
        row = (row + [""] * ncol)[:ncol]
        cells.append(", ".join(f"[{inline_typst(c)}]" for c in row))
    cells.append("table.hline(stroke: 1pt)")
    tbl = f"table(\n    columns: {ncol},{align_arg}\n    " + ",\n    ".join(cells) + "\n  )"
    caption = _caption_block(block.caption)
    label = f" <{block.label}>" if block.label else ""
    # Route the table through `fit-table` (preamble): a table too wide to wrap under the measure is scaled
    # down uniformly so it never overflows the text block; a wrappable one is untouched. The caption sits
    # OUTSIDE the fit wrapper so it always renders at body size (only the grid scales).
    return f"#figure(\n  fit-table({tbl}),\n  kind: table,{caption}\n){label}"


def _render_figure(block: Block_t, width: str = "85%", bare: bool = False) -> str:
    """A `<!-- figure: path | caption -->` → `#figure(image(path), caption: […])`, numbered + labelled.
    `width` sizes the image (default 85% of the measure; the wrapped author portrait passes a small width so
    it sits beside the bio, see `render_chapter`). `bare=True` renders just the image — no `#figure`
    wrapper, so no "Figure N" number and no caption — for a plain picture like the author portrait."""
    spec = block.raw[len("<!--"):-len("-->")].strip()[len("figure:"):].strip()
    rel = spec.split("|", 1)[0].strip()
    asset = HERE / rel
    if not asset.is_file():
        raise SystemExit(f"figure directive: asset not found: {asset}")
    img = f'image("{_root_rel(asset, _EmitCtx.root)}", width: {width})'
    if bare:
        return f"#{img}"
    caption = _caption_block(block.caption)
    label = f" <{block.label}>" if block.label else ""
    return f"#figure(\n  {img},{caption}\n){label}"


def _render_mermaid(block: Block_t, caption_md: str | None) -> str:
    """A standalone ```mermaid fence → `#figure(image(<cached SVG>), caption)`, numbered + labelled. The SVG
    is the one the HTML build already rendered/cached — we include it, we do not re-render."""
    _lang, inner = _fence_body(block.raw)
    p = _mermaid_svg_path(inner)
    caption = _caption_block(caption_md)
    label = f" <{block.label}>" if block.label else ""
    img = f'image("{_root_rel(p, _EmitCtx.root)}", width: 78%)'
    return f"#figure(\n  {img},{caption}\n){label}"


def _render_eq(raw: str) -> str:
    """An `<!-- eq: … -->` display equation → a Typst block math `$ … $`. The body is math-ish plain text
    (our equations are simple: `P(wrong) = 1 − (1 − p)ⁿ`); we pass it through as Typst math, mapping a few
    unicode operators. Awkward by design — see the mapping report; a real migration would author math in
    Typst's own math language."""
    body = raw[len("<!--"):-len("-->")].strip()[len("eq:"):].strip()
    return f"$ {_math_ish(body)} $"


def _math_ish(s: str) -> str:
    """Best-effort map of our simple unicode-equation prose into Typst math atoms. Multi-letter alphabetic
    runs (e.g. `wrong` in `P(wrong)`) are quoted so Typst renders them as upright text rather than reading
    each as an undefined variable — the failure the whole-corpus compile surfaced. This is a best-effort
    bridge; a real migration would author equations in Typst's own math language (see the mapping report)."""
    repl = {"−": "-", "×": " times ", "·": " dot ", "≤": " <= ", "≥": " >= ", "≠": " != ", "ⁿ": "^n"}
    for k, v in repl.items():
        s = s.replace(k, v)
    # Quote multi-letter alphabetic words (2+ letters) as upright text; leave single letters as variables
    # (the usual math convention: `p`, `n`, `P` stay italic variables, `wrong` becomes text).
    return re.sub(r"[A-Za-z]{2,}", lambda m: f'"{m.group(0)}"', s)


def _caption_block(caption_md: str | None) -> str:
    """The `caption: [...]` argument for a `#figure`, or "" when there is none. Strips a trailing
    `[short: …]` marker (the list-of-floats short form has no Typst analogue in this spike)."""
    if not caption_md:
        return ""
    display, _short = bb._split_caption_md(" ".join(caption_md.split()))
    return f"\n  caption: [{inline_typst(display)}],"


# ── Metadata (index-def / point) → #metadata + query ───────────────────────────────────────────────

def _render_index_metadata(slug: str, kind: str, text: str | None = None) -> str:
    """A curated-index / point annotation → a queryable `#metadata((...))` node with a stable label. This is
    the Typst-native analogue of our HTML anchor: `typst query` (or `typst eval query(metadata)`) extracts
    every one, so an external tool reads the model annotations exactly as it reads our HTML index anchors."""
    fields = f'slug: "{slug}", kind: "{kind}"'
    if text is not None:
        fields += f", text: {_typst_str(text)}"
    return f"#metadata(({fields})) <meta-{kind}-{slug}>"


# ── The emit context + the driving walk ────────────────────────────────────────────────────────────

Block_t = ir.Block


class _EmitCtx:
    """Carries the compilation root (for image paths) and the arming state the walk threads across blocks
    (pending index-def anchors → #metadata; the mermaid caption-fold). A tiny mutable holder — the HTML
    renderer keeps the same arming state in `md_to_html`'s closure; we make it explicit."""
    root: pathlib.Path = HERE.parent           # class-level default so the pure `_render_*` helpers can read it

    def __init__(self, root: pathlib.Path):
        _EmitCtx.root = root
        self.root = root
        self.metadata_emitted = 0
        self.pending_def: list[str] = []   # a core-term index-def armed for the next block (→ blue def-box)
        self.pending_pullquote = False     # a `<!-- pullquote -->` marker armed for the next block
        self.pending_thesisbox = False     # a `<!-- thesisbox -->` marker armed for the next block (part-opener box)

    @classmethod
    def inert(cls) -> "_EmitCtx":
        """A context for a recursive sub-render (blockquote inner) that reuses the current root."""
        c = cls.__new__(cls)
        c.root = cls.root
        c.metadata_emitted = 0
        c.pending_def = []
        c.pending_pullquote = False
        c.pending_thesisbox = False
        return c


def _indent(text: str, n: int = 2) -> str:
    pad = " " * n
    return "\n".join(pad + ln if ln else ln for ln in text.split("\n"))


# The whole notation vocabulary the peel step consumes off a block head (mirrors the IR's `_parse_chapter`
# and the renderer's `_consume_leading_marker`). We recognise index-def/index-example (→ #metadata),
# point (planned → #metadata), and the display/arming directives handled by the IR parser already.
_INDEX_DEF_RE = bb.INDEX_DEF_RE
_INDEX_EXAMPLE_RE = bb.INDEX_EXAMPLE_RE
_POINT_RE = re.compile(r"^<!--\s*point:\s*(?P<slug>[a-z0-9-]+)\s*\|\s*(?P<text>.+?)\s*-->$")


def render_typst(block: Block_t, caption_md: str | None = None, is_def: bool = False,
                 is_pullquote: bool = False, is_thesisbox: bool = False,
                 section_no: str | None = None) -> str:
    """Render ONE IR block to Typst markup — the sibling to `Block.render_html()`, reusing the SAME
    `book_ir.BlockKind` taxonomy and `classify_render_block` classification (the blocks arrive already
    classified from the IR parse). `caption_md` is the folded mermaid caption when the driving walk detects a
    following italic paragraph (the HTML renderer's mermaid caption-fold). `section_no` is the
    `part.chapter.section` locator stamped on a level-2 heading (see `_render_heading`)."""
    k = block.kind
    K = ir.BlockKind
    if k is K.HEADING:
        return _render_heading(block.raw, section_no)
    if k is K.PARA:
        return _render_paragraph(block.raw)
    if k is K.LIST:
        return _render_unordered_list(block.raw)
    if k is K.ORDERED_LIST:
        return _render_ordered_list(block.raw)
    if k is K.CODE:
        return _render_code(block.raw)
    if k is K.CODE_INSET:
        return _render_inset(block.raw)
    if k is K.BLOCKQUOTE:
        return _render_blockquote(block.raw, is_def=is_def, is_pullquote=is_pullquote,
                                  is_thesisbox=is_thesisbox)
    if k is K.TABLE:
        return _render_table(block)
    if k is K.FIGURE:
        return _render_figure(block)
    if k is K.MERMAID:
        return _render_mermaid(block, caption_md)
    if k is K.EQ:
        return _render_eq(block.raw)
    if k in (K.DIRECTIVE, K.OTHER):
        # The two build-generated appendix-v2 directives render a block; every other marker (index / iframe /
        # keep-together wrapper) is inert in the flat block stream (the note wrapper is applied in render_chapter).
        if block.directive == "stack-legend":
            return _render_stack_legend(block.raw.strip())
        if block.directive == "brick-grid":
            return _render_brick_grid(block.raw.strip())
        return ""                                        # inert markers / catalogue iframe — no print output
    return _render_paragraph(block.raw)                  # defensive fall-through


def _render_markdown_body(md: str, ctx: _EmitCtx) -> str:
    """Render a raw markdown body (used for the blockquote recursion) by re-parsing its blocks through the
    IR's classifier and emitting each. Kept parallel to the chapter walk so nested content renders the same."""
    out: list[str] = []
    for raw in bb._split_blocks(md):
        raw = raw.strip("\n")
        if not raw.strip():
            continue
        # peel lone index/point markers → metadata; ignore other leading markers in nested context
        lines = raw.splitlines()
        while lines:
            frag = _peel_metadata_marker(lines[0].strip(), ctx)
            if frag is None:
                break
            if frag:
                out.append(frag)
            lines = lines[1:]
        rem = "\n".join(lines).strip("\n")
        if not rem.strip():
            continue
        kind = ir.classify_render_block(rem)
        out.append(render_typst(ir.Block(kind, rem, 0)))
    return "\n\n".join(x for x in out if x)


def _peel_metadata_marker(line: str, ctx: _EmitCtx) -> "str | None":
    """If `line` is an index-def / index-example / point marker, return its `#metadata(...)` emission (and
    count it); if it is any OTHER lone notation marker the IR already consumed, return "" (drop it). Return
    None when it is not a marker at all, so the caller stops peeling."""
    s = line.strip()
    md = _INDEX_DEF_RE.match(s)
    if md:
        ctx.metadata_emitted += 1
        if md.group(1) in _DEF_SLUGS:
            ctx.pending_def.append(md.group(1))   # arm the blue def-box for the term's defining blockquote
        return _render_index_metadata(md.group(1), "index-def")
    me = _INDEX_EXAMPLE_RE.match(s)
    if me:
        ctx.metadata_emitted += 1
        return _render_index_metadata(me.group(1), "index-example")
    mp = _POINT_RE.match(s)
    if mp:
        ctx.metadata_emitted += 1
        return _render_index_metadata(mp.group("slug"), "point", mp.group("text"))
    mline = ir._MARKER_LINE.match(s)
    if mline:
        if mline.group(1).lower() == "pullquote":
            ctx.pending_pullquote = True   # arm the pull-quote render for the block this marker heads
        if mline.group(1).lower() == "thesisbox":
            ctx.pending_thesisbox = True   # arm the part-opener thesis-box render for the next block
        return ""                                        # a consumed notation marker with no print output
    return None


# Apparatus one-pagers — reference apparatus (not running prose) framed as ONE distinct page item in the
# print projection, mirroring the web book's `.apparatus-page` box. Matched by TITLE (like the relocated
# acknowledgments) so the source slug can change without silently un-framing it; the match tolerates an
# appendix locator prefix (see `_matches_apparatus_title`), so the Operator's Dashboard keeps its frame after
# moving to an appendix card whose title reads "D.1 The Operator's Dashboard". "How to read this book" (its
# short prose + the whole-book map) is the founding member; the Operator's Dashboard (now D.1) is the second.
def _how_to_read_title() -> str:
    """The 'How to read this book' chapter title, resolved THROUGH its identity label so a retitle updates
    the apparatus-frame match automatically (chapter_identity model). Falls back to the known literal if the
    identity model is unavailable during a partial build — the literal is the current title, so the frame
    still matches; this is a convenience derivation, not a correctness dependency."""
    try:
        import chapter_identity_model as _cim  # book-models is on sys.path (bb imported above)
        return _cim.title("how-to-read-this-book").lower()
    except Exception:  # noqa: BLE001 — see docstring: derivation is a convenience; the literal is the truth
        return "how to read this book"


_APPARATUS_ONEPAGER_TITLES = {_how_to_read_title(), "the operator's dashboard"}

# A subset of the apparatus one-pagers that carry a WIDE table: typeset on a single LANDSCAPE page so a
# 6-column reference fits without cramping.
_APPARATUS_LANDSCAPE_TITLES = {"the operator's dashboard"}

# Apparatus one-pagers whose framed body EXCEEDS one portrait page, so the frame is made BREAKABLE — it
# flows across pages rather than clipping. The landscape dashboard (a tall 6-column reference) qualifies, as
# does the how-to-read chapter: its two reading modes, the five-appendix reference map, and the resource
# table outgrew the single page the tiny founding card once fit on. A genuinely short one-pager keeps the
# non-breaking default so it stays intact on one page.
_APPARATUS_BREAKABLE_TITLES = {"how to read this book", "the operator's dashboard"}


def _matches_apparatus_title(title_norm: str, titles: "set[str]") -> bool:
    """Whether a normalized chapter title names one of the apparatus one-pagers. Matches the exact title OR a
    title carrying ANY appendix locator prefix — the `endswith` tolerates the current "d.1 the operator's
    dashboard" as well as the older "appendix d - 1. the operator's dashboard" form — so the Operator's
    Dashboard keeps its landscape/frame treatment after it moved from a back-matter chapter (bare title) to an
    appendix card (locator-prefixed title). The founding how-to-read page has no prefix and still matches
    exactly."""
    return any(title_norm == t or title_norm.endswith(t) for t in titles)


def _landscape_wrap_typst(body: str) -> str:
    """Wrap a rendered fragment in a flipped/landscape `#page`, so a wide table gets full landscape width
    without `fit-table` cramping it into the portrait measure. `#page(flipped: true)[…]` starts its own
    page and resumes portrait immediately after, so wrapping ONE table's fragment mid-chapter drops that
    table alone onto a landscape page. The tighter margins + 8.5pt body + tight inset widen the measure
    further; the table figure stays breakable as a safety valve. Shared by two sites (extract-on-the-second
    -site): the apparatus landscape path (emit_document) and the per-table `<!-- table-landscape -->` marker
    (render_chapter)."""
    return (
        "#page(flipped: true, margin: (x: 0.6in, y: 0.7in))[\n"
        "#set text(size: 8.5pt)\n"
        "#show table.cell: set text(size: 8.5pt)\n"
        "#set table(inset: (x: 6pt, y: 3pt))\n"
        "#show figure.where(kind: table): set block(breakable: true)\n"
        + body + "\n]"
    )


def _render_convergence_key_typst(block: Block_t) -> str:
    """The convergence KEY as a slimmed 3-column reference (the right panel of a convergence spread). Reads the
    4-column key markdown (`# | Pattern | Construct | statement`) but DROPS the Construct column, folding the
    construct into a small-caps subtitle beneath the pattern name (Layer-3 index info, not a comparison axis —
    tables.md author review). The glyph grid it faces is untouched; this only reshapes the key. Still a numbered
    `#figure(kind: table) <label>` so `@convergence-*-key` cross-references and the list-of-floats resolve."""
    lines = block.raw.splitlines()
    body_rows = [bb._split_table_row(ln) for ln in lines[2:] if ln.strip()]
    cells = ["table.hline(stroke: 1pt)",
             "table.header([\\#], [Pattern], [What the source establishes])",
             "table.hline(stroke: 0.5pt)"]
    for row in body_rows:
        row = (row + [""] * 4)[:4]
        key, name, construct, statement = row
        construct_disp = construct.replace("-", " ")
        # name over a small-caps construct subtitle — the fold that removes the Construct column.
        patt = (f"[#strong[{inline_typst(name)}]#linebreak()"
                f"#text(size: 0.78em, fill: dt.muted)[#smallcaps[{inline_typst(construct_disp)}]]]")
        cells.append(f"[{inline_typst(key)}], {patt}, [{inline_typst(statement)}]")
    cells.append("table.hline(stroke: 1pt)")
    tbl = ("table(\n    columns: 3,\n    align: (left, left, left),\n    "
           + ",\n    ".join(cells) + "\n  )")
    caption = _caption_block(block.caption)
    label = f" <{block.label}>" if block.label else ""
    return f"#figure(\n  fit-table({tbl}),\n  kind: table,{caption}\n){label}"


def _convergence_spread_typst(left: "list[str]", right: "list[str]") -> str:
    """The convergence SPREAD: a single flipped/landscape page holding the glyph matrix (left) beside its key
    (right), so a reader reads the matrix and looks right to the key with no page turn (the field-guide spread
    the author asked for — tables.md §"strongest recommendation"). The shipped PDF is a scrolled screen edition
    with no recto/verso, so a two-page facing spread has no meaning here; the faithful realization is one
    landscape page split left/right, which also gives the 8-column matrix the width its Pattern column needs.
    Landscape mirrors the existing per-table `table-landscape` convention already used in this chapter."""
    left_body = "\n\n".join(f for f in left if f)
    right_body = "\n\n".join(f for f in right if f)
    return (
        "#page(flipped: true, margin: (x: 0.55in, y: 0.6in))[\n"
        "#set text(size: 8.5pt)\n"
        "#show table.cell: set text(size: 8.5pt)\n"
        "#set table(inset: (x: 5pt, y: 2.5pt))\n"
        "#show figure.where(kind: table): set block(breakable: false)\n"
        # Equal fixed fractions, NOT `auto`: an `auto` column sizes to its content's unwrapped natural width,
        # which the long figure caption blows out — starving the facing panel. Fixed fractions make each
        # panel's caption + table wrap inside its own half.
        "#grid(\n  columns: (1.15fr, 0.85fr),\n  column-gutter: 20pt,\n  align: (left + top, left + top),\n"
        f"  [\n{_indent(left_body)}\n  ],\n  [\n{_indent(right_body)}\n  ],\n)\n"
        "]"
    )


def _onepager_card_typst(body: str) -> str:
    """Wrap a rendered one-pager table in a light, left-ruled card — the Typst twin of the web
    `.case-onepager` panel (per-case-onepager-DESIGN §5). Lighter than the framed apparatus and the lavender
    concept-inset: just an accent left rule + inset, so the projected reconstruction table reads as set-apart
    without a heavy box. Breakable, so a tall card flows rather than clipping."""
    return ("#block(stroke: (left: 2pt + dt.accent), inset: (left: 12pt, top: 3pt, bottom: 3pt), "
            f"width: 100%, breakable: true)[\n{body}\n]")


def _render_worked_examples_typst(we) -> str:
    """The Typst twin of the web `.worked-examples` gallery — a titled block holding 2-4 mini-cases (a bold
    source lead-in + the authored gloss, each `breakable: false` so an example never splits across a page,
    B3 §3) closed by the accent left-ruled Takeaway card (reuses `_onepager_card_typst`). The block sits set
    apart on the accent left-rule so it reads as a mode-shift from body prose. Roster projects; prose authored."""
    parts: list[str] = [
        '#text(size: 7.5pt, weight: "bold", tracking: 0.09em, fill: dt.accent)[WORKED EXAMPLES]',
    ]
    for c in we.cases:
        src = inline_typst(c.source)
        prose = inline_typst(" ".join(c.prose_md.split()))
        parts.append(f"#block(breakable: false, above: 0.65em, below: 0.2em)[#strong[{src}.] {prose}]")
    if we.takeaway_md:
        tk = inline_typst(" ".join(we.takeaway_md.split()))
        parts.append(_onepager_card_typst(f"#strong[Takeaway.] {tk}"))
    body = "\n".join(parts)
    return ("#block(stroke: (left: 3pt + dt.accent), inset: (left: 12pt, top: 6pt, bottom: 6pt), "
            f"width: 100%, above: 1em, below: 1em, breakable: true)[\n{_indent(body)}\n]")


def _frame_apparatus_typst(body: str, breakable: bool = False) -> str:
    """Wrap a rendered apparatus chapter in a bordered `#block` — a hairline box on the panel tint with an
    accent top-rule, mirroring the web `.apparatus-page`. `breakable: false` (the default) keeps the whole
    apparatus on the single page the pagebreak-before hands it; a wide/tall reference passes `breakable:
    True` so it flows rather than clips. Surfaces are design tokens, so the frame follows the token palette
    exactly as the semantic boxes do."""
    breakable_lit = "true" if breakable else "false"
    return (
        "#block(fill: dt.panel, "
        "stroke: (top: dt.border-accent-bar + dt.accent, rest: dt.border-hairline + dt.rule), "
        f"radius: 8pt, inset: (x: 14pt, top: 10pt, bottom: 12pt), width: 100%, breakable: {breakable_lit})[\n"
        f"{body}\n]"
    )


# The float block kinds a preceding intro paragraph binds to (D71a keep-with-next).
_FLOAT_KINDS = frozenset({ir.BlockKind.FIGURE, ir.BlockKind.TABLE, ir.BlockKind.MERMAID})


def _note_spread_info(blocks: "list[Block_t]") -> "tuple[int | None, int | None]":
    """Scan a note's blocks for the keep-together declaration. Returns `(spread, fold_index)`: `spread` is the
    `note-spread: N` value (1 or 2) or None when the chapter is not a keep-together note; `fold_index` is the
    block index of the `note-fold` divider (spread:2's author-chosen fold) or None."""
    spread: "int | None" = None
    fold_i: "int | None" = None
    for i, b in enumerate(blocks):
        if b.kind is ir.BlockKind.DIRECTIVE and b.directive == "note-spread":
            m = re.search(r"note-spread:\s*(\d+)", b.raw)
            spread = int(m.group(1)) if m else 1
        elif b.kind is ir.BlockKind.DIRECTIVE and b.directive == "note-fold":
            fold_i = i
    return spread, fold_i


def _render_note_spread(blocks: "list[Block_t]", spread_n: int, fold_i: "int | None",
                        name: str = "spread-1", title_frag: str = "") -> str:
    """Render a keep-together note's body (§13.6). `spread:1` → the whole body inside `#keep-together[…]` (one
    indivisible page block); `spread:2` → the blocks before/after the `note-fold` divider inside
    `#note-spread2([panel-a], [panel-b])` (two named panels, each held to one page). `name` labels the panels
    in the rendered-height assertion so an overflow message names the note it overflowed on. The preamble
    helpers carry the assertion, so an overflowing panel fails the compile.

    `title_frag` (the chapter/note heading) is folded INTO the first measured block, so the title and its
    body form one indivisible unit — the title is never stranded alone on a page — and the assertion budgets
    title+body against one page (an over-long note fails the compile)."""
    def render_range(bs: "list[Block_t]") -> str:
        frags = [render_typst(b) for b in bs if b.kind is not ir.BlockKind.DIRECTIVE]
        return "\n\n".join(f for f in frags if f)

    head = f"{title_frag}\n\n" if title_frag else ""
    qname = json.dumps(name)
    if spread_n >= 2 and fold_i is not None:
        panel_a = render_range(blocks[:fold_i])
        panel_b = render_range(blocks[fold_i + 1:])
        return (f"#note-spread2({qname}, [\n{_indent(head + panel_a)}\n], [\n{_indent(panel_b)}\n])")
    return f"#keep-together({qname}, [\n{_indent(head + render_range(blocks))}\n])"


def _float_prefix(chapter: "ir.Chapter", is_appendix: bool) -> str:
    """The chapter-relative float-numbering prefix — the `<X>` in a `<X>-N` figure/table number. For an
    appendix chapter, use the reader-facing locator the web build already stamped (`chapter.fig_prefix`:
    "D", "D.1", "B.29"), so App-D tables read "Table D.1-1" and match the web edition. For every body chapter
    (no `fig_prefix`) keep the numeric `<part>.<chapter>`. This is the M1 fix: the numeric pair rendered as
    "12.x" inside Appendix D because the Typst path recomputed it from `part.chapter` and ignored the locator
    the web build had already derived."""
    if is_appendix and chapter.fig_prefix:
        return chapter.fig_prefix
    return f"{chapter.part}.{chapter.chapter}"


def render_chapter(chapter: ir.Chapter, ctx: _EmitCtx) -> str:
    """Walk one IR chapter → its Typst body. The IR already parsed labels/captions onto floats and classified
    every block; here we (a) peel index-def/point markers off the RAW source into #metadata (the IR records
    them as DIRECTIVE, so we re-read the raw slice for the slug), (b) fold a mermaid's following italic
    caption, and (c) emit each block."""
    # `part.chapter` chapter number + `part.chapter.N` section numbers — the print twin of the web build's
    # `chap-num`/`sec-num` (D67a). Numbered body chapters (Parts 1-6) get numbers; front matter (part 0),
    # true back matter (part 7 — apparatus), and the appendix (its own A/B/C locators) do not. This keeps
    # the PDF in step with the web build's `is_matter = part in (0, 7)`. Numbers are display-only — they
    # never touch a heading anchor, so `@ref`/metadata queries keep resolving.
    is_appendix = chapter.slug.startswith("appendix")
    is_part_page = _is_part_page(chapter)
    is_appendix_divider = _is_appendix_divider(chapter)
    # A Part landing page (chapter-0 synthetic record) is unnumbered — like front/back matter and the appendix,
    # it never prints an `N.0`. Suppressing on `is_part_page` keeps the number off the Part opener; the
    # appendices mode-marker is likewise unnumbered.
    numbered = (chapter.part not in (0, 7) and not is_appendix and not is_part_page
                and not is_appendix_divider)
    chap_num = f"{chapter.part}.{chapter.chapter}" if numbered else None
    title_num = f"#text(fill: dt.muted)[{chap_num}] " if chap_num else ""
    title_body = f"{title_num}{inline_typst(chapter.title)}"
    # Chapter titles emit at Typst LEVEL-2 (`==`), one below the Part divider's level-1 heading, so the PDF
    # bookmark tree nests the chapter under its Part. The level-2 show-rule (see _PREAMBLE) carries the
    # chapter-title size that the level-1 H1 used to. Appendix chapter/note titles keep the smaller per-entry
    # head size (see _APPENDIX_HEADING_SIZE), inline-overriding the level-2 show rule.
    title_line = (f"== #text(size: {_APPENDIX_HEADING_SIZE})[{title_body}]" if is_appendix
                  else f"== {title_body}")
    # The Part landing page renders NO H1: the part-divider page ahead of it already carries the Part title
    # (and the `<part-N>` nav-target label), so a heading here would duplicate it. The page contributes the
    # intro paragraph + the Part-nav strip only.
    # The Part landing page and the appendices mode-marker render NO H1 in the body: the divider page ahead
    # already carries the title, so a heading here would duplicate it. Each contributes its prose only.
    out: list[str] = [] if (is_part_page or is_appendix_divider) else [title_line, ""]
    blocks = chapter.blocks
    # Keep-together note (appendix v2, §13.6): a note declaring `note-spread` renders as an indivisible
    # one-page card — but ONLY in print mode, where a page boundary is a hard reading seam. On a SCREEN PDF
    # (continuously scrolled, the shipped output) there is no page-card: forcing the body into one indivisible
    # page block is what stranded the title on its own near-empty page (the orphaned-heading failure) once the
    # body neared a full page. So in screen mode a note flows like any chapter — its title is a sticky heading
    # (kept-with-next by the preamble show rule) and its body breaks naturally — which removes the orphan with
    # no content change. Print mode keeps the rigid asserted card (the seam is recoverable via OUTPUT_TYPE).
    spread_n, fold_i = _note_spread_info(blocks)
    if spread_n and OUTPUT_TYPE == "print":
        chap_id = _float_prefix(chapter, is_appendix)
        num_setup = (f"#set figure(numbering: (n) => [{chap_id}-#n])\n"
                     "#counter(figure.where(kind: image)).update(0)\n"
                     "#counter(figure.where(kind: table)).update(0)\n")
        # Fold the note TITLE into the measured keep-together block. The title heading and its body then form
        # ONE indivisible unit — the title can never be stranded on a page while the body flows to the next —
        # and the rendered-height assertion now measures title+body against one page's budget, so an over-long
        # note fails the compile naming itself (the fatal sensor). Print-only; screen notes flow (see above).
        return (num_setup + "\n"
                + _render_note_spread(blocks, spread_n, fold_i, name=chapter.slug, title_frag=title_line))
    skip: set[int] = set()
    section_no = 0                     # per-chapter `## ` counter (advanced only when the chapter is numbered)
    pending_landscape = False          # a `<!-- table-landscape -->` marker armed for the next TABLE block
    pending_onepager = False           # a `<!-- case-onepager -->` marker armed for the next TABLE block
    _title_norm = chapter.title.strip().lower()
    for i, b in enumerate(blocks):
        if i in skip:
            continue
        # Suppress a body-leading H1 that duplicates the chapter title. `parse_chapter` drops the leading
        # `# Title` for `body_md`, but a marker comment glued above it (a `<!-- noqa -->`) defeats that drop,
        # so the H1 survives into the IR. In a single-flow print doc that duplicates the chapter title we
        # already emit as the header; the HTML page carries it twice (header + body) but the print book wants
        # one. Skip only the FIRST heading, only when it matches the title, before any prose has emitted.
        if (b.kind is ir.BlockKind.HEADING and len(out) <= 2
                and b.raw.strip().lstrip("#").strip().lower() == _title_norm):
            continue
        # DIRECTIVE blocks carry index-def / index-example / point markers → #metadata.
        if b.kind is ir.BlockKind.DIRECTIVE:
            if b.directive == "table-landscape":
                pending_landscape = True   # arm the flipped-page wrap for the next TABLE block (inert in HTML)
                continue
            if b.directive == "case-onepager":
                pending_onepager = True    # arm the one-pager card wrap for the next TABLE block
                continue
            if b.directive == "worked-examples":
                # A Worked-Examples gallery: collect forward to `worked-examples-end`, join the bracketed
                # blocks' raw markdown (the `### Example` heads, their gloss, and the `<!-- takeaway -->`
                # divider all survive in `.raw`), hand it to the shared parser, and emit ONE titled block.
                # Mirrors the convergence-spread collector; the HTML twin is `md_to_html`'s intercept.
                key_m = ir.WEX_OPEN_RE.match(b.raw.strip())
                inner_chunks: list[str] = []
                ended = False
                j = i + 1
                while not ended and j < len(blocks):
                    skip.add(j)
                    # Line-scan the block's raw for the end marker — the marker may be GLUED inside a prose
                    # block (no blank line before it), so block-granular detection misses it (the takeaway
                    # prose + end marker land in one PARA block). Mirrors the HTML collector's `_take_until_end`.
                    kept: list[str] = []
                    for ln in blocks[j].raw.splitlines():
                        if ir.WEX_END_RE.match(ln.strip()):
                            ended = True
                            break
                        kept.append(ln)
                    if kept:
                        inner_chunks.append("\n".join(kept))
                    j += 1
                we = ir.parse_worked_examples(key_m.group("key") if key_m else "",
                                              "\n\n".join(inner_chunks))
                out.append(_render_worked_examples_typst(we))
                continue
            if b.directive and b.directive.startswith("worked-examples"):
                continue                             # a stray end marker outside a bracket — inert
            if b.directive == "convergence-spread":
                # A convergence spread: collect forward to `convergence-spread-end`, splitting at
                # `convergence-spread-key` into the LEFT panel (glyph matrix + legend) and the RIGHT panel
                # (its key, construct folded to a small-caps subtitle), then emit both on one landscape page.
                left: list[str] = []
                right: list[str] = []
                target = left
                j = i + 1
                while j < len(blocks):
                    bj = blocks[j]
                    if bj.kind is ir.BlockKind.DIRECTIVE and bj.directive == "convergence-spread-end":
                        skip.add(j)
                        break
                    skip.add(j)
                    if bj.kind is ir.BlockKind.DIRECTIVE and bj.directive == "convergence-spread-key":
                        target = right
                        j += 1
                        continue
                    if bj.kind is ir.BlockKind.DIRECTIVE:
                        j += 1                       # label/caption already folded onto the table block
                        continue
                    if bj.kind is ir.BlockKind.TABLE:
                        frag = (_render_convergence_key_typst(bj) if target is right
                                else _render_table(bj))
                    else:
                        frag = render_typst(bj)      # the legend paragraph rides under the matrix
                    if frag:
                        target.append(frag)
                    j += 1
                out.append(_convergence_spread_typst(left, right))
                continue
            if b.directive and b.directive.startswith("convergence-spread"):
                continue                             # a stray spread divider outside a bracket — inert
            frag = _peel_metadata_marker(b.raw.strip(), ctx)
            if frag:
                out.append(frag)
            continue
        # D74 — the author portrait wraps: render it SMALL in the left column of a two-column grid with the
        # following bio paragraphs beside it, instead of a full-measure figure. Consumes the rest of the
        # chapter's content blocks into the text column (the about-the-author chapter is portrait + bio only).
        if b.kind is ir.BlockKind.FIGURE and "author-headshot" in b.raw:
            # A PLAIN portrait, not a numbered float: `bare=True` → no "Figure N-N" number, no caption.
            left = _render_figure(b, width="100%", bare=True)
            bio: list[str] = []
            for j in range(i + 1, len(blocks)):
                if j in skip:
                    continue
                skip.add(j)
                bj = blocks[j]
                if bj.kind is ir.BlockKind.DIRECTIVE:
                    mf = _peel_metadata_marker(bj.raw.strip(), ctx)
                    if mf:
                        bio.append(mf)
                    continue
                bf = render_typst(bj)
                if bf:
                    bio.append(bf)
            bio_body = "\n\n".join(bio)
            out.append(
                "#grid(\n"
                "  columns: (1.5in, 1fr),\n"
                "  column-gutter: 18pt,\n"
                "  align: (left + top, left + top),\n"
                f"  [{left}],\n"
                f"  [\n{_indent(bio_body)}\n  ],\n"
                ")"
            )
            continue
        caption_md = None
        if b.kind is ir.BlockKind.MERMAID and i + 1 < len(blocks):
            nb = blocks[i + 1]
            s = nb.raw.strip()
            if (nb.kind is ir.BlockKind.PARA and s.startswith("*") and not s.startswith("**")
                    and s.endswith("*") and "```" not in s):
                caption_md = s.strip("*").strip()
                skip.add(i + 1)
        # A core-term index-def (a DIRECTIVE handled above) arms the blue def-box for the block it heads —
        # this content block. Capture and clear so it applies to exactly the next content block.
        is_def = bool(ctx.pending_def)
        ctx.pending_def.clear()
        is_pullquote = ctx.pending_pullquote
        ctx.pending_pullquote = False
        is_thesisbox = ctx.pending_thesisbox
        ctx.pending_thesisbox = False
        # A top-level `## ` section heading advances the per-chapter counter → `part.chapter.N` (mirrors the
        # web build's `section_no`; `###`/`####` subsections do not advance it). Only when the chapter is numbered.
        sec = None
        if chap_num and b.kind is ir.BlockKind.HEADING and b.raw.strip().startswith("## "):
            section_no += 1
            sec = f"{chap_num}.{section_no}"
        # Page-scoped: the six central claims on "What This Book Argues" get the print twin of the web
        # `.argues-page ol` feature treatment (larger text, more air, accent-bold numerals). Only that page's
        # ordered list is rerouted; every other numbered list in the book renders through _render_ordered_list.
        if bb._stem_to_label(chapter.slug) == bb._WHAT_THIS_BOOK_ARGUES_LABEL and b.kind is ir.BlockKind.ORDERED_LIST:
            frag = _render_argues_claims(b.raw)
        else:
            frag = render_typst(b, caption_md, is_def=is_def, is_pullquote=is_pullquote,
                                is_thesisbox=is_thesisbox, section_no=sec)
        # D71(a) keep-with-next: a paragraph that immediately introduces a figure/table/diagram sticks to it,
        # so the introducing sentence ("… in Table 4.2-1.", "… shown below.") is never split from its float
        # across a page break. Systematic — every paragraph that directly precedes a float, not one-off.
        if (frag and b.kind is ir.BlockKind.PARA and i + 1 < len(blocks)
                and (i + 1) not in skip and blocks[i + 1].kind in _FLOAT_KINDS):
            frag = f"#block(sticky: true)[{frag}]"
        # A `<!-- table-landscape -->` marker preceding this TABLE drops it alone onto a flipped page.
        if frag and pending_landscape and b.kind is ir.BlockKind.TABLE:
            frag = _landscape_wrap_typst(frag)
            pending_landscape = False
        # A `<!-- case-onepager -->` marker preceding this TABLE wraps it as a light left-ruled card.
        if frag and pending_onepager and b.kind is ir.BlockKind.TABLE:
            frag = _onepager_card_typst(frag)
            pending_onepager = False
        if frag:
            out.append(frag)
    if is_part_page:
        out.append(_part_nav_typst(chapter.part))  # the Part-nav strip closes a Part landing page
    # CHAPTER-RELATIVE float numbering (mirrors the web `_number_floats` scheme): figures/tables read
    # "<part>.<chapter>-N" and N resets to 1 per chapter. The chapter's `<part>.<chapter>` id is baked as
    # a literal into a per-chapter `#set figure(numbering: …)` closure (no state/context coupling — set
    # rules are location-scoped, so @refs and the lists of figures/tables resolve each float's number at
    # the float's own position). The image/table counters reset at the chapter boundary so the first float
    # is N=1. Image and table sequences are independent, matching the web's separate fig_n/tbl_n.
    chap_id = _float_prefix(chapter, is_appendix)
    num_setup = (
        f"#set figure(numbering: (n) => [{chap_id}-#n])\n"
        "#counter(figure.where(kind: image)).update(0)\n"
        "#counter(figure.where(kind: table)).update(0)\n"
    )
    return num_setup + "\n" + "\n\n".join(out)


# ── Preamble + document assembly ───────────────────────────────────────────────────────────────────

_PREAMBLE = _TYPST_PREAMBLE + """\
// GENERATED by book/book_typst.py — the IR→Typst emitter (the production PDF path). Do not hand-edit;
// regenerate via `python3 book/build_book_html.py --pdf` (whole book) or
//   python3 book/book_typst.py <chapter-slug> [<slug> …]   (a subset).
// The compiled PDF and the emitted .typ live under book/_typst/ (gitignored — created, never committed).
// Type/colour/surface come from the design-token `dt` preamble above. Body stays at a print-native 11pt
// (the token body step is screen-sized; print density is protected here) while the faces + palette follow
// the tokens: Source Serif 4 display headings, a quiet body face, umber accent, and the semantic-box anchors.
#set document(title: "Model-Based Agentic Software Engineering")
// Asymmetric geometry: a narrow binding margin + a wide OUTER margin that holds the Tufte note column.
// Text box = left 0.875in + measure 4.75in; note column = 0.375in gutter + 1.9in note + 0.6in trim.
// 0.875 + 4.75 + 2.875 = 8.5in. The `#sidenote` helper (end of this preamble) places short editorial
// notes + em-led asides into that outer margin; long ones fall back in-column via a measure-gate.
#set page(paper: "us-letter", margin: (left: 0.875in, right: 2.875in, y: 1in), numbering: "1", fill: dt.paper)
#set text(font: dt.font-body, size: 11pt, lang: "en", fill: dt.ink)
#set par(justify: true, leading: 0.62em, first-line-indent: 0pt, spacing: 0.9em)
#set heading(numbering: none)
// "Calm authority" hierarchy: SEMIBOLD is the quiet default weight for every heading; only the Part
// divider steps up to bold. Headings then ORGANISE rather than compete — one bold level, the rest a
// lighter semibold, subsections quieter still.
#show heading: set text(font: dt.font-display, weight: "semibold")
// Heading levels shifted down one so the Part divider owns level-1 (the bookmark parent) — see
// `_render_heading`/`render_chapter`/`_part_divider_typst`. The sizes below track the shift so the rendered
// hierarchy still DESCENDS: Part (level-1) > chapter (level-2) > `##` section (level-3) > `###` subsection
// (level-4). Level-1 (the dividers) gets NO size rule on purpose: each divider inline-sizes its own kicker +
// title (1.1em / 2em) against the body em, so a level-1 `set text(size: …)` here would COMPOUND with those
// inline ems and blow the divider titles up past their intended scale. It DOES get the bold WEIGHT (a weight
// rule doesn't compound), so a Part title is the one bold thing in the ladder.
#show heading.where(level: 1): set text(weight: "bold")     // Part divider — the only bold heading
#show heading.where(level: 2): set text(size: 1.4em)    // chapter title (semibold via the general rule; nudged down)
#show heading.where(level: 3): set text(size: 1.15em)   // `## ` section (semibold via the general rule; nudged down)
// `### ` (H3) subheadings — now Typst level-4 after the shift — render ITALIC regular, not semibold: a quieter
// sub-level (D67b). Overrides the general semibold above (later same-target show rule wins); keeps the display
// face at body size. `#### ` (level-5) inherits the general semibold display at body size.
#show heading.where(level: 4): set text(weight: "regular", style: "italic")
// Keep-with-next: a heading STICKS to the content after it, so a heading can never be the last meaningful
// thing on a page (the orphaned-title failure — a chapter/section head alone on a page with its body flowing
// to the next). `sticky` moves the heading to the following block's page rather than stranding it. The
// build-time orphaned-heading sensor (in build_book_html.verify_pdf) is the belt to this suspenders.
// More air ABOVE a heading than below (2.0em / 0.75em) — the calmer rhythm sets each section off from the
// prose above it while keeping the heading tied to its own body.
#show heading: set block(above: 2.0em, below: 0.75em, sticky: true)
#set figure(gap: 0.6em)
// D71(b) — more air between body text and a figure/table than the 0.9em paragraph spacing, so a float
// reads as set apart from the prose above and below it (systematic, every figure/table).
#show figure: set block(above: 1.5em, below: 1.5em)
#show figure.caption: set text(size: 0.9em, style: "italic", fill: dt.muted)
// Keep-together (caption-orphan fix): a figure/table caption is `sticky`, so it can NEVER be the last
// thing on a page while its item's body flows onto the next. The caption always rides with its float
// across a page break. Table captions sit at the top (below); a breakable table then keeps the caption +
// its first rows together and flows the rest on. Image figures are atomic, so their caption is glued
// regardless. Mirrors the `#block(sticky: true)` keep-with-next used for float-introducing prose.
#show figure.caption: it => block(sticky: true, it)
#show figure.where(kind: table): set figure.caption(position: top)
// A dense table (e.g. the seven-hypotheses table) can exceed one page; let a TABLE figure break across
// pages so its rows flow to the next page instead of bleeding past the bottom margin. Image figures stay
// atomic (unset), so a diagram is never split. The `fit-table` wrapper only scales genuinely-wide tables.
#show figure.where(kind: table): set block(breakable: true)
// Booktabs table style (matches the HTML book's Tufte/booktabs tables): a heavy top rule, a light rule
// under the header, a heavy bottom rule — NO vertical rules or cell boxes. Whitespace separates columns.
// Table body sits ~0.8pt under the 11pt body (10.2pt ≈ 93%): tables read as compact structured reference
// while the prose stays the star, and the tighter measure removes awkward mid-cell wraps. The vertical
// inset (y: 6pt, up from 5pt) keeps the row stretch comfortable — the LaTeX `\arraystretch ~1.15` feel —
// so denser type does not read as cramped.
#set table(stroke: none, inset: (x: 8pt, y: 6pt))
#show table.cell: set text(size: 10.2pt)
#show table.cell.where(y: 0): set text(weight: "bold")
#show raw.where(block: true): set block(fill: dt.code-bg, inset: 8pt, radius: 3pt, width: 100%)
#show raw: set text(font: dt.font-mono)
#set raw(tab-size: 2)
// ── Keep-together note blocks (appendix-restructure v2, §13.6). A note declared `spread: 1` renders as ONE
//    indivisible block; `spread: 2` as two named panels with an author-chosen fold. Each panel is measured
//    against one page's text budget; a panel that overflows makes `assert` PANIC — the compile fails, so a
//    bad mid-note break can never ship. The authored word cap is only an early sensor; rendered height is the
//    real invariant (figures/headings/lists distort a word estimate). `layout` reports the page text region,
//    the budget a `breakable:false` block must fit within.
#let _keep-together-panel(name, body) = context {
  layout(size => {
    let h = measure(box(width: size.width, body)).height
    assert(h <= size.height,
      message: "keep-together overflow: note panel '" + name + "' rendered " + repr(h)
        + " > one-page budget " + repr(size.height) + " — split it or shorten it (appendix section 13.6).")
    block(breakable: false, width: 100%, body)
  })
}
#let keep-together(name, body) = _keep-together-panel(name, body)
#let note-spread2(name, panel-a, panel-b) = {
  _keep-together-panel(name + " panel 1", panel-a)
  pagebreak(weak: true)
  _keep-together-panel(name + " panel 2", panel-b)
}
// ── General table auto-fit (260804). A pipe table renders with `auto` columns; Typst WRAPS their prose to
//    the text measure, so almost every table fits at full size. The exception is a grid of short, UNBREAKABLE
//    cells (a code-token matrix) that cannot wrap under the measure — it would overflow the right margin.
//    `fit-table` measures the table: within the measure → rendered untouched; wider but WRAPPABLE (constraining
//    to the measure grows its height) → rendered at full size (legible, never crushed); wider and UNwrappable
//    (height unchanged) → scaled down UNIFORMLY to the measure. `layout` makes it region-aware, so it fits the
//    body pages and the wider landscape apparatus alike. General rule — no per-table size. The post-compile
//    margin-bleed sensor (verify_pdf) is the belt to this suspenders: it fails the build on any residual
//    text that still bleeds past the text box (e.g. one unbreakable token among wrapping cells).
#let fit-table(body) = context {
  layout(size => {
    let nat = measure(body).width
    if nat <= size.width {
      body
    } else {
      let wrapped = measure(box(width: size.width, body)).height
      let natural = measure(box(width: nat, body)).height
      if wrapped > natural + 0.5pt {
        body
      } else {
        scale(x: size.width / nat * 100%, y: size.width / nat * 100%, reflow: true, body)
      }
    }
  })
}

// fit-block: the code-block analogue of fit-table. A raw block must NOT wrap (wrapping mangles ASCII-art
// alignment), so — unlike fit-table's wrappability branch — this UNCONDITIONALLY scales a too-wide block
// down to the measure. Needed since the Tufte narrow text measure (4.75in) is tighter than the old 6.3in,
// so a wide ASCII dashboard that once fit now overflows. The raw-block show rule forces `width: 100%`,
// which makes a wide block WRAP (and `measure` report the full region width, hiding the overflow); so the
// natural width is probed against a `width: auto` copy. A block that fits keeps its full-width background
// (unchanged look); only a genuinely-too-wide block is rendered at natural width and scaled down.
#let fit-block(body) = context {
  let probe = { show raw.where(block: true): set block(width: auto); body }
  layout(size => {
    let nat = measure(probe).width
    if nat <= size.width { body }
    else { scale(x: size.width / nat * 100%, y: size.width / nat * 100%, reflow: true, probe) }
  })
}

// ── Tufte margin notes (custom; offline — no @preview package, so a fresh clone compiles with no
//    network). Short editorial [note: …] marks and em-led `> *Title.* …` asides render as right-margin
//    sidenotes matching the web `.editorial-note` / `.aside-sidenote`; a note too tall for the margin
//    falls back to its in-column render (footnote / quote) by construction. See §"Tufte margin-note
//    layout" design. `_mn-cursor` is a per-page anti-collision cursor holding the previous note's bottom.
#let _mn-cursor = state("mn-cursor", (page: 0, bottom: 0pt))
#let _MN-WIDTH  = 1.9in          // note-column width
#let _MN-DX     = 4.75in + 0.375in   // text measure + gutter — flow-region left origin → note column
#let _MN-TOP    = 1in            // page y-margin; `place(top+left)` anchors here, so dy = base - _MN-TOP
#let _MN-BUDGET = 3.2in          // max note height allowed in the margin; taller → in-column fallback
#let _MN-VGAP   = 6pt            // min vertical gap between two stacked notes on one page (absolute, not em)
// Editorial-note mark cycle — mirrors the web `_note_glyph`: * † ‡ § ‖ ¶, doubled after six.
#let _MN-GLYPHS = ("*", "†", "‡", "§", "‖", "¶")
#let _mn-glyph(n) = _MN-GLYPHS.at(calc.rem(n - 1, 6)) * (calc.div-euclid(n - 1, 6) + 1)

// marked: false for em-led asides (no reference symbol, web parity); true for editorial [note:] marks,
// which draw a symbolic glyph from a dedicated counter (independent of Typst's citation footnotes).
#let sidenote(body, fallback, marked: false) = {
  if marked { counter("mn-editnote").step() }   // step only when marked, so the glyph cycle stays gapless
  context {
    let mark = if marked { _mn-glyph(counter("mn-editnote").get().first()) } else { none }
    // The measured proxy neutralises INTROSPECTION (cite/footnote/ref): measuring live citations breaks
    // Typst's citation locator ("cannot be located — caused by measurement"). It matches the placed box's
    // width/size/leading so the gate height still tracks the rendered height (a `[?]` cite stand-in is ~a
    // real superscript). The PLACED box below keeps the live cite/footnote so it still renders + numbers.
    let measurebox = box(width: _MN-WIDTH, inset: (left: 0.55em))[
      #set text(size: 8.5pt)
      #set par(justify: false, leading: 0.5em)
      #show cite: _ => [ [?] ]
      #show footnote: _ => []
      #if mark != none [#text(weight: "bold")[#mark] ]#body
    ]
    let m = measure(measurebox)
    if m.height > _MN-BUDGET { return fallback }  // long note → stay in-column, never overflow the margin
    let notebox = box(width: _MN-WIDTH, inset: (left: 0.55em), stroke: (left: 1pt + dt.box-inset-rule))[
      #set text(size: 8.5pt, fill: dt.muted)
      #set par(justify: false, leading: 0.5em)
      #if mark != none [#text(fill: dt.accent, weight: "bold")[#mark] ]#body
    ]
    let loc  = here()
    let pg   = loc.page()
    let natY = loc.position().y                   // page-absolute y of the reference line
    let cur  = _mn-cursor.at(loc)
    // push this note below the previous one on the same page; reset the cursor when the page turns
    let base = if cur.page == pg { calc.max(natY, cur.bottom + _MN-VGAP) } else { natY }
    _mn-cursor.update(_ => (page: pg, bottom: base + m.height))
    if mark != none { super(text(size: 0.72em, fill: dt.muted, weight: "bold")[#mark]) }  // inline mark
    // `place(top+left)` anchors at the flow-region TOP (the y-margin), so dy is measured from _MN-TOP.
    place(top + left, dx: _MN-DX, dy: base - _MN-TOP, notebox)
  }
}
"""


def _cover_typst() -> str:
    """The cover — a FULL-BLEED charcoal cover: the cover art (`book/assets/cover-charcoal.svg`, portrait
    8.5:11 so it fills the US-Letter page exactly) bleeds to every page edge on a margin-0 page, and a LIGHT
    title lockup overlays the upper dark title band in cream. The eyebrow, title, optional subtitle, and
    author all read from the manifest (single source of truth), so the three cover surfaces (site hero, web
    book, print) can never disagree on the words.

    The lockup colours draw from the token palette: the display title is the brightest element (dt.paper —
    cream), the eyebrow + byline a warm cream (dt.accent-tint), so the single warm FOCAL accent stays the
    red maquette in the art below. The title is sized down from fs-display (39pt, too large for the band) to
    hold two lines within the near-black title band.

    Its own page, no folio. The imprint line + last-modified date do NOT sit on the art — a full-bleed cover
    has no clean seat for them; they move to the copyright page that follows (see `_copyright_page_typst`)."""
    m = bb._BOOK_MANIFEST
    title = _esc(m["title"])
    # The full-bleed cover applies an OPTIONAL soft line-break HINT from the manifest. `cover_title_break_after`
    # names the substring after which the cover title should break (e.g. "Model-Based" → line 1 "Model-Based",
    # line 2 "Agentic Software Engineering"). We insert Typst's forced linebreak (` \ `) right after that
    # substring — AFTER _esc so the backslash is not itself escaped — and only when the substring is actually
    # found. Absent / empty / not-found ⇒ no forced break, the title auto-wraps. `title` itself stays SSOT
    # (used verbatim by the site hero and the web book); only the cover consults the hint.
    title_cover = title
    break_after = str(m.get("cover_title_break_after", "")).strip()
    if break_after:
        break_after_esc = _esc(break_after)
        idx = title_cover.find(break_after_esc)
        if idx != -1:
            cut = idx + len(break_after_esc)
            title_cover = title_cover[:cut] + r" \ " + title_cover[cut:].lstrip()
    author = _esc(m["author"].upper())
    kicker = _esc(m.get("kicker", "")).upper()
    subtitle = _esc(m.get("subtitle", ""))
    # The cover art embeds as a PRE-RASTERIZED JPEG, not the SVG. The SVG stacks feTurbulence /
    # feDisplacementMap / blur filters the print engine cannot vectorize, so it would rasterize the whole
    # page at high DPI (~26 MB embedded). `cover-charcoal.svg` stays the tracked SOURCE; regenerate the JPEG
    # from it when the art changes with (175 DPI for 8.5x11, quality-88 4:2:0):
    #   rsvg-convert -w 1487 -h 1925 assets/cover-charcoal.svg -o /tmp/cc.png
    #   magick /tmp/cc.png -quality 88 -sampling-factor 4:2:0 assets/cover-charcoal.jpg
    # The title text below stays live Typst (crisp); only the art is a raster.
    cover_img = _root_rel(HERE / "assets" / "cover-charcoal.jpg", _EmitCtx.root)
    # The eyebrow renders only when the manifest carries a kicker; the subtitle only when it carries one
    # (empty string = omitted, per the manifest contract).
    eyebrow_block = (
        "        #text(font: dt.font-display, weight: dt.display-weight, size: 11pt, tracking: 0.34em, "
        f"fill: dt.accent-tint)[{kicker}]\n"
        "        #v(1.0em)\n"
    ) if kicker else ""
    subtitle_block = (
        "        #v(0.8em)\n"
        f"        #text(font: dt.font-body, size: 13pt, fill: dt.accent-tint)[{subtitle}]\n"
    ) if subtitle else ""
    return (
        "// FULL-BLEED cover: the charcoal art fills the page (margin 0); the light title lockup overlays the\n"
        "// upper dark band. The imprint line + date move to the copyright page that follows.\n"
        '#page(paper: "us-letter", margin: 0pt, numbering: none, header: none, footer: none)[\n'
        f'  #place(top + left, image("{cover_img}", width: 100%, height: 100%))\n'
        "  #place(top + center, dy: 42pt)[\n"
        "    #block(width: 74%)[\n"
        "      #align(center)[\n"
        + eyebrow_block +
        "        #par(justify: false, leading: 0.36em)[\n"
        "          #text(font: dt.font-display, weight: dt.display-weight, size: 27pt, "
        f"tracking: -0.02em, fill: dt.paper)[{title_cover}]\n"
        "        ]\n"
        + subtitle_block +
        "        #v(1.3em)\n"
        "        #line(length: 26%, stroke: 1pt + dt.accent-tint)\n"
        "        #v(1.1em)\n"
        f"        #text(font: dt.font-body, size: 12pt, tracking: 0.3em, fill: dt.accent-tint)[{author}]\n"
        "      ]\n"
        "    ]\n"
        "  ]\n"
        "]"
    )


def _copyright_page_typst(ack_chapter: ir.Chapter, default_mod: str) -> str:
    """The copyright / imprint page — a normal margined page (dt.paper ground) right after the full-bleed
    cover. It seats what the art cannot: the copyright line (© author, years — DERIVED from the manifest, the
    same derivation the web cover used), the edition / last-modified date (injected at compile time via
    `--input last_modified=…` and read with `sys.inputs`, falling back to the manifest `last_updated` when
    the emitter runs standalone), and the consolidated ACKNOWLEDGMENTS.

    The acknowledgments prose is RELOCATED here from the front-matter acknowledgments chapter (the NSF
    funding line lives in it already), so the print edition states them ONCE. The chapter's source file is
    unchanged — the web book still renders it as a front-matter chapter; this print projection simply seats
    the same prose on the imprint page and skips the standalone chapter (see `emit_document`), so nothing is
    duplicated and the two projections read from one source."""
    m = bb._BOOK_MANIFEST
    copyright_txt = _esc(f'© {m["author"]}, {m["copyright_years"]}')
    # Acknowledgments body: the PARA blocks of the front-matter acknowledgments chapter, rendered inline with
    # a little air between them. The heading is provided below (we skip the chapter's own H1).
    ack_paras = [render_typst(b) for b in ack_chapter.blocks if b.kind is ir.BlockKind.PARA]
    ack_body = "\n\n  #v(0.6em)\n\n  ".join(p for p in ack_paras if p.strip())
    return (
        "// COPYRIGHT / IMPRINT page — margined, dt.paper ground. The © line + last-modified date + the\n"
        "// acknowledgments relocated from the front-matter acknowledgments chapter (print states them once).\n"
        f'#let last_modified = sys.inputs.at("last_modified", default: "{default_mod}")\n'
        "#page(numbering: none)[\n"
        "  #v(0.4in)\n"
        "  #set par(justify: false, leading: 0.6em)\n"
        f"  #text(size: 11pt, fill: dt.ink)[{copyright_txt}]\n"
        "  #v(0.35em)\n"
        "  #text(size: 9.5pt, fill: dt.muted)[Edition — last modified #last_modified]\n"
        "  #v(2.0em)\n"
        "  #text(font: dt.font-display, weight: \"bold\", size: 13pt, fill: dt.ink)[Acknowledgments]\n"
        "  #v(0.8em)\n"
        "  #set text(size: 10pt, fill: dt.muted)\n"
        f"  {ack_body}\n"
        "]"
    )


def _is_part_page(ch: "ir.Chapter") -> bool:
    """A numbered Part's landing page — the chapter-0 synthetic record `_parse_part_intro` builds (slug
    `part-<N>-intro`). The web twin is the record's `is_part_page` flag; the IR carries no flags, so match the
    slug the build minted."""
    return ch.slug == f"part-{ch.part}-intro"


def _is_appendix_divider(ch: "ir.Chapter") -> bool:
    """The appendices mode-marker — the synthetic divider `build_appendix_chapters` prepends before Appendix A
    (web twin: the record's `is_appendix_divider` flag). The IR carries no flags, so match on the minted slug."""
    return ch.slug == bb._APPENDICES_DIVIDER_SLUG


def _appendices_divider_typst() -> str:
    """The appendices mode-marker divider page — distinct from a numbered Part divider: a muted 'Reference'
    kicker over the big 'Appendices' title, then the subtitle in the accent italic, marking the reader's shift
    out of the argument and into the reference manual. A LEVEL-1 heading, so it becomes the PDF-bookmark PARENT
    the appendix families would otherwise sit beside; the author paragraph flows after via `render_chapter`."""
    opener = "#pagebreak(to: \"odd\")\n" if OUTPUT_TYPE == "print" else "#pagebreak()\n"
    title = inline_typst(bb._APPENDICES_DIVIDER_TITLE)
    sub = inline_typst(bb._APPENDICES_DIVIDER_SUBTITLE)
    heading = (
        f"  = #text(size: 1.05em, fill: dt.muted, tracking: 0.08em)[#upper[Reference]~]"
        f"#linebreak()#text(size: 2.4em, weight: \"bold\")[{title}]\n"
        f"  #v(0.35em)\n"
        f"  #text(size: 1.35em, fill: dt.accent, style: \"italic\")[{sub}]\n"
    )
    return (
        opener +
        "#block(breakable: false)[\n"
        f"  #v(2.4in)\n"
        + heading +
        "  #v(0.5em) #line(length: 30%, stroke: 1pt + dt.rule)\n"
        "]"
    )


def _part_nav_typst(current_part: int) -> str:
    """The Part-nav strip closing a Part landing page in the PDF — a row of separate boxed chips, one per
    numbered Part, matching the web pill bar (`_part_nav_html`) button-for-button. Each chip is an inline
    `#box(...)`, so Typst's own paragraph line-breaking wraps the row across lines exactly the way the web's
    `flex-wrap` does — no manual line math. The current Part renders as a filled, bold, non-link chip
    (`#strong`, no `#link`); every other Part is an outline chip wrapping a `#link(<part-N>)` that jumps to
    that Part's divider page (labeled in `_part_divider_typst`). Both projections read
    `build_book_html._PART_TITLES` restricted to Parts 1–6 — one list, two renderings, so they cannot
    disagree on which Parts exist or what they're called."""
    titles = bb._PART_TITLES
    chips: list[str] = []
    for n in range(1, 7):
        raw_label = f"Part {n} — {titles.get(n, '')}"
        label = f"#upper[{inline_typst(raw_label)}]"
        if n == current_part:
            text = f"#text(size: 8pt, tracking: 0.02em, fill: dt.ink, weight: \"bold\")[{label}]"
            chips.append(
                "#box(inset: (x: 8pt, y: 5pt), radius: 4pt, stroke: 1pt + dt.accent, "
                f"fill: dt.panel)[{text}]"
            )
        else:
            text = f"#text(size: 8pt, tracking: 0.02em, fill: dt.accent, weight: \"semibold\")[{label}]"
            chips.append(
                "#box(inset: (x: 8pt, y: 5pt), radius: 4pt, stroke: 0.5pt + dt.rule, "
                f"fill: dt.paper)[#link(<part-{n}>)[{text}]]"
            )
    row = " ".join(chips)  # a plain space between inline boxes is the wrap point Typst breaks lines on
    return (
        "#v(0.6em)\n"
        "#line(length: 100%, stroke: 0.5pt + dt.rule)\n"
        "#v(0.9em)\n"
        f"{row}\n"
    )


def _part_divider_typst(part: int, ch: ir.Chapter) -> "str | None":
    """A part-divider page before the first chapter of a numbered Part, the back-matter Part, or an appendix
    Part. Only front matter (0) gets no divider — its chapters open the book and sit at the OUTLINE root, so
    a "Front Matter" parent would be redundant. Returns the Typst for the divider, or None. The divider's
    title is a Typst LEVEL-1 heading, so it becomes the PDF-bookmark PARENT the demoted chapters (level-2)
    nest under. Numbered parts use the web book's `_PART_TITLES`; the back-matter part titles as "Back Matter"
    (a parent node so its apparatus does not mis-nest under the last numbered Part); an appendix part reuses
    its own family name (e.g. "Appendix A — the pattern language")."""
    if part == 0:
        return None
    # The appendices mode-marker takes its own part (one below Appendix A); render its distinct divider.
    if _is_appendix_divider(ch):
        return _appendices_divider_typst()
    part_titles = bb._PART_TITLES
    label = ""
    if part == 7:
        # True back matter (apparatus). A bare title heading (no "Part N" kicker, no nav label) — it is a
        # bookmark PARENT so About-the-Author / Colophon nest under it instead of under the last numbered Part.
        kicker, title = "", part_titles.get(7, "Back Matter")
    elif part in part_titles and part <= 6:
        kicker, title = f"Part {part}", part_titles[part]
        # The divider page is the Part opener, so it carries the `<part-N>` label the Part-nav strip links to
        # (`#link(<part-N>)`). Numbered Parts only — the appendix families are not Part-nav targets.
        label = f" <part-{part}>"
    else:
        # Appendix part: the chapter title carries the family (e.g. "Appendix A - 9. …" / "Appendix D — …").
        mm = re.match(r"\s*(Appendix\s+[A-Z])\b[\s—:-]*(.*)", ch.title)
        if mm:
            kicker, title = mm.group(1), (mm.group(2).split(".", 1)[-1].strip() if "." in mm.group(2) else mm.group(2).strip())
            title = title or kicker
        else:
            return None
    # Screen mode opens a part/appendix divider on a plain page break (no recto-forcing → no blank verso);
    # print mode forces a recto (odd) page per the bound-edition convention. Branches on the OUTPUT_TYPE seam.
    opener = "#pagebreak(to: \"odd\")\n" if OUTPUT_TYPE == "print" else "#pagebreak()\n"
    # The title is a real Typst LEVEL-1 heading — the bookmark PARENT the demoted chapters (level-2) nest
    # under. When a kicker is present it renders on its own muted line above the big title (the two-tier
    # divider look), with a non-breaking space closing the kicker line so the flattened OUTLINE text keeps a
    # separator ("Part 1 The Mindset", not "Part 1The Mindset"). `sticky` + block-spacing from the general
    # heading show-rule stay contained inside the breakable:false block, so the divider still fills its own
    # page. The `<part-N>` label (the Part-nav `#link(<part-N>)` target) attaches to the block, unchanged.
    if kicker:
        heading = (f"  = #text(size: 1.1em, fill: dt.muted)[{inline_typst(kicker)}~]"
                   f"#linebreak()#text(size: 2em, weight: \"bold\")[{inline_typst(title)}]\n")
    else:
        heading = f"  = #text(size: 2em, weight: \"bold\")[{inline_typst(title)}]\n"
    return (
        opener +
        "#block(breakable: false)[\n"
        f"  #v(2.4in)\n"
        + heading +
        "  #v(0.5em) #line(length: 30%, stroke: 1pt + dt.rule)\n"
        "]" + label
    )


def emit_document(slugs: list[str], root: pathlib.Path | None = None, *, with_frontmatter: bool = False) -> str:
    """Emit a standalone Typst document for the named chapter slugs. When `with_frontmatter` is set (the
    whole-book production render), a title-page cover leads and a part-divider page precedes the first
    chapter of each numbered Part and each appendix Part — the same structure the web book carries, so the
    print edition does not diverge. `root` is the Typst compilation root the image paths resolve against
    (defaults to the repo dir, the parent of book/)."""
    root = root or HERE.parent
    ctx = _EmitCtx(root)
    doc = ir.parse_book(include_appendices=True, for_print=True)
    by_slug = {c.slug: c for c in doc.chapters}
    parts: list[str] = [_PREAMBLE]
    # The front-matter acknowledgments chapter — relocated onto the copyright page in the PRINT projection
    # (its source file is untouched, so the web book still renders it as a chapter). Matched by title so the
    # slug can change without silently un-relocating it. Skipped in the chapter loop below when found, so the
    # PDF states the acknowledgments once (on the copyright page), never twice.
    ack_chapter = next((c for c in doc.chapters if c.title.strip().lower() == "acknowledgments"), None)
    if with_frontmatter:
        default_mod = _esc(bb._BOOK_MANIFEST.get("last_updated", ""))
        parts.append(_cover_typst())
        if ack_chapter is not None:
            parts.append(_copyright_page_typst(ack_chapter, default_mod))
    seen_parts: set[int] = set()
    for n, slug in enumerate(slugs):
        if slug not in by_slug:
            raise SystemExit(f"unknown chapter slug: {slug} (have {sorted(by_slug)[:5]}…)")
        ch = by_slug[slug]
        if with_frontmatter and ack_chapter is not None and ch.slug == ack_chapter.slug:
            continue  # acknowledgments were relocated to the copyright page — do not also render the chapter
        _title_norm = ch.title.strip().lower()
        # A landscape apparatus is wrapped in `#page(flipped: true)[…]`, which starts its own fresh page, so
        # the usual preceding `#pagebreak()` would strand a blank portrait page — suppress it for that case.
        is_landscape = _matches_apparatus_title(_title_norm, _APPARATUS_LANDSCAPE_TITLES)
        if with_frontmatter and ch.part not in seen_parts:
            seen_parts.add(ch.part)
            divider = _part_divider_typst(ch.part, ch)
            if divider:
                parts.append(divider)
            elif n and not is_landscape:
                parts.append("#pagebreak()")
        elif n and not is_landscape:
            parts.append("#pagebreak()")
        rendered = render_chapter(ch, ctx)
        if _matches_apparatus_title(_title_norm, _APPARATUS_ONEPAGER_TITLES):
            breakable = _matches_apparatus_title(_title_norm, _APPARATUS_BREAKABLE_TITLES)
            rendered = _frame_apparatus_typst(rendered, breakable=breakable)
        if is_landscape:
            # A flipped/landscape page so the wide 6-column reference gets full landscape width without
            # cramping; tighter margins than the body pages widen the measure further. The whole apparatus
            # (opener prose + both mode bands + midrule + all rows + the bordered frame) is sized DOWN from
            # the 11pt body to a print-native small step so it fits on ONE landscape page rather than
            # spilling onto a second — a page-scoped `#set text(size:)` plus a tighter table inset, applied
            # only inside this flipped page (the body size and the portrait apparatus pages are untouched).
            # The table figure stays breakable as a safety valve (its header row repeats), so an accidental
            # overflow flows rather than clips, but at this size the dashboard lands on the single page.
            rendered = _landscape_wrap_typst(rendered)
        parts.append(rendered)
    # End-of-book Bibliography — Chicago notes, rendered by Typst from the SAME references.bib that
    # generated citations.json, so the PDF's reference strings equal the web book's by construction
    # (CITE-PARITY / BIB-5). Emitted only when the book actually cites something (an empty #bibliography is
    # a bare heading). Path is Typst-root-absolute (`/book/references.bib`), resolved against `--root ..`.
    if _any_cites(doc):
        bib_rel = _root_rel(bb.HERE / "references.bib", root)
        parts.append("#pagebreak()")
        parts.append(f'#bibliography({_typst_str(bib_rel)}, style: "chicago-notes", title: "Bibliography")')
    return "\n\n".join(parts) + "\n"


def _any_cites(doc: "ir.Document") -> bool:
    """True when any chapter carries a `[cite:]` marker — the guard for whether to emit the #bibliography."""
    return any(bb.iter_cite_keys(b.raw) for c in doc.chapters for b in c.blocks)


def _main(argv: list[str]) -> int:
    import argparse
    ap = argparse.ArgumentParser(description="IR→Typst spike emitter: emit Typst markup for book chapters.")
    ap.add_argument("slugs", nargs="+", help="chapter slug(s), e.g. 3.1-the-executable-zoo")
    ap.add_argument("--out", help="write to this .typ path (default: stdout)")
    args = ap.parse_args(argv)
    typ = emit_document(args.slugs)
    if args.out:
        p = pathlib.Path(args.out)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(typ, encoding="utf-8")
        print(f"wrote {p} ({len(typ)} bytes)")
    else:
        print(typ)
    return 0


if __name__ == "__main__":
    import sys
    raise SystemExit(_main(sys.argv[1:]))
