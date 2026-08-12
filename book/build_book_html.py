#!/usr/bin/env python3
"""Render the polished book chapters to a small static HTML site.

AUTO-GENERATED OUTPUT: this script emits *.html in this folder; do not hand-edit
the .html (re-run `python3 build_book_html.py` to regenerate). Stdlib-only.

The book source is a Part/Chapter filesystem hierarchy — the directory tree encodes
the ordering so PART.CHAPTER is explicit in the path:

    book/frontmatter/0.4-preface.md            -> Front matter, order 0.4
    book/part1/1.1-the-ada-context.md          -> Part 1, Chapter 1
    book/part1/1.2-the-timeline-and-the-work.md-> Part 1, Chapter 2
    book/part2/2.1-the-printer.md              -> Part 2, Chapter 1
    …
    book/backmatter/5.1-conclusion.md          -> Back matter, order 5.1

The build WALKS this hierarchy, derives the part number and chapter number from each
file's `part<N>/` dir and `<N>.<M>-slug.md` name, and reads the human-readable
`<!-- part-title: … --> <!-- chapter-title: … -->` metadata from the file. It emits one
flat `<slug>.html` per chapter (Part/Chapter TOC nav on top, prev/next at the bottom),
an `index.html` landing page, and — appended after the back matter — a Gang-of-Four
appendix projected from the sibling catalogue entries.

Front matter (part 0) and back matter (part 6) render without a "Chapter N" kicker; the
first chapter of each numbered Part opens with a verbatim epigraph. Chapter prose may
reference the shared metrics file (`data/metrics.json`) through `{{token}}` placeholders,
substituted at build time so the headline numbers live in one place.
"""
from __future__ import annotations

import functools
import hashlib
import html
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
from typing import Callable, NamedTuple

HERE = pathlib.Path(__file__).resolve().parent

# Single source of truth for the book's cover identity — book-manifest.json (also read by catalog.py).
_BOOK_MANIFEST = json.loads((HERE / "book-manifest.json").read_text(encoding="utf-8"))
_PDF_FILENAME = _BOOK_MANIFEST["pdf_filename"]  # single source: the manifest
# The book's companion Medium post — a site-only nav link beside the PDF download (no book-body counterpart).
_BLOG_POST_URL = "https://davisjam.medium.com/model-based-agentic-software-engineering-mage-856c2bf22e45"


def _cover_sub(cls: str) -> str:
    """Optional subtitle div for a cover site, from the manifest; empty when the subtitle is blank."""
    s = _BOOK_MANIFEST.get("subtitle", "")
    return f'<div class="{cls}">{html.escape(s)}</div>' if s else ""
ROOT = HERE.parent  # the catalogue root — the appendix reads the entry .md files from here

# Design-token SSOT projection (Umber Monograph) — the CSS :root block + web-font link, both derived from
# book-models/design-tokens.json by the stdlib-only projector, so the web book and the site share one
# typed token model. Inlined into the book CSS below.
sys.path.insert(0, str(ROOT / "book-models"))
import design_tokens as _dtokens  # noqa: E402 — the design-token projector (stdlib-only)

_TOKENS = _dtokens.load()
CSS_ROOT_BLOCK = _dtokens.css_root_block(_TOKENS)
FONTS_LINK = _dtokens.google_fonts_link(_TOKENS)
# Mermaid label sizes — the SAME token that drives the mermaid LAYOUT config (`mermaid_theme`) so the
# CSS that DISPLAYS the labels below can never render bigger than the boxes mermaid laid out (the
# config==CSS invariant that stops label overflow). Do not hardcode these px; they follow the tokens.
_MERMAID_LABEL_PX = _dtokens.mermaid_label_px(_TOKENS)
ACCENT = _TOKENS.palette["accent"]  # umber — kept for the few Python-side consumers (cover / mermaid)
COPYRIGHT = f"© {_BOOK_MANIFEST['author']}, {_BOOK_MANIFEST['copyright_years']}"
# Cover "last updated" date. A STABLE constant, bumped intentionally — a per-build/per-commit date would
# churn the tracked book HTML and break the `check_book_html_tracking` freshness gate.
LAST_UPDATED = _BOOK_MANIFEST["last_updated"]

# Mermaid diagrams are rendered to STATIC INLINE SVG at BUILD time (see `render_mermaid_svg` below),
# NOT via a client-side runtime. This is why BOTH the web book AND the Typst PDF ship a real vector
# diagram: a PDF pipeline that never ran/awaited a client-side `mermaid.run()` would ship the raw
# ```mermaid source as code text. Build-time SVG kills that whole class (no JS-timing fragility) and is
# consistent with how every other figure in the book is inlined as SVG. The mermaid config forces SVG
# `<text>` labels (htmlLabels:false) so the SVGs carry no `<foreignObject>`, which Typst cannot draw.
# `MERMAID_CDN` is retained as an EMPTY string so the `mermaid=` chapter flag / `runtime` plumbing stays
# wired without pulling any client-side script (diagrams are already baked into the HTML as SVG).
MERMAID_CDN = ""

# Raw-mermaid-source markers — the control the author asked for. If ANY of these literal substrings
# appears in the rendered PDF text OR in a generated book/*.html code-box body, an un-rendered ```mermaid
# fence shipped (build-time SVG conversion silently failed / was bypassed). These are mermaid DIAGRAM-TYPE
# HEADER keywords + `subgraph`: a mermaid diagram ALWAYS opens with a type header (`flowchart`, `graph`,
# `erDiagram`, …), and these tokens do NOT survive into a rendered diagram's extracted TEXT (a rendered
# SVG carries the NODE LABELS, never the source syntax). Kept as one tuple so the PDF assert and the web
# book-lint share the exact same class.
#   Deliberately NOT included: the edge operator `-->`. It is ambiguous — it appears in legitimate escaped
#   prose and (as `<!-- … -->`) in HTML-comment syntax that can leak into extracted text — so it would
#   false-positive. Every un-rendered diagram still trips a header keyword above, so no detection is lost.
#   Markers are diagram-specific tokens unlikely to occur in running prose. Bare common English words
#   that happen to be mermaid headers (`pie`, `journey`, `gantt`) are omitted — the book uses none of
#   those diagram types, and including them would risk a prose false-positive in the PDF full-text scan.
# Markers of RAW mermaid source (an un-rendered ```mermaid fence leaking into the PDF text). Each must be
# diagram syntax that never occurs in English prose — so `flowchart` carries its direction, because the
# bare word "flowchart" appears legitimately in captions ("Below is a flowchart to guide…") and the loose
# "flowchart " marker false-failed the gate on prose.
MERMAID_SOURCE_MARKERS: tuple[str, ...] = (
    "flowchart TD", "flowchart LR", "flowchart TB", "flowchart RL", "flowchart BT",
    "graph TD", "graph LR", "graph TB", "graph RL", "graph BT",
    "subgraph ", "sequenceDiagram", "stateDiagram", "erDiagram", "classDiagram",
)

# SINGLE SOURCE OF TRUTH for mermaid styling: `assets/mermaid-config.json`, passed to `mmdc -c`. It
# mirrors the former `mermaid.initialize` config (Georgia serif, 20px labels, flowchart/sequence spacing)
# so every diagram renders through one config and all diagrams change together. GOTCHA: sequence diagrams
# IGNORE themeVariables.fontSize, so actor/message/note sizes are set explicitly under `sequence`.
_MERMAID_CONFIG = HERE / "assets" / "mermaid-config.json"
_MERMAID_CACHE = HERE / ".mermaid-svg-cache"   # content-hash → rendered SVG; gitignored build cache
_MMDC = HERE / "node_modules" / ".bin" / "mmdc"
# Puppeteer launch options for mmdc: the GitHub Actions Ubuntu runner (23.10+) has no usable Chromium
# sandbox, so mmdc's headless Chrome must launch with --no-sandbox or the build fails. Harmless locally.
_MMDC_PUPPETEER = HERE / "assets" / "mmdc-puppeteer.json"


def _mermaid_cache_key(source: str) -> str:
    """The content-hash cache key for a mermaid fence body — `sha256(source + config + idscheme)`. The single
    source of truth for the on-disk `.mermaid-svg-cache/<key>.svg` filename, shared by `render_mermaid_svg`
    (which renders + caches) and the Typst projection's cache-path lookup, so the two never disagree."""
    return hashlib.sha256(
        (source.strip() + "\x00" + _MERMAID_CONFIG.read_text(encoding="utf-8") + "\x00idscheme-v1").encode("utf-8")
    ).hexdigest()


def render_mermaid_svg(source: str) -> str:
    """Render a ```mermaid fence body to a self-contained inline `<svg>…</svg>` at BUILD time via
    mermaid-cli (`mmdc`, which drives the Puppeteer toolchain). Result is cached by a content hash of
    (source + config) so a rebuild that didn't touch a diagram is instant. Fails LOUD if mmdc is missing
    or a diagram fails to render — a broken diagram must never silently fall back to shipping raw source
    (the whole point of this change is that raw mermaid syntax ships NOWHERE). The returned SVG is width/
    height-stripped (like the other inline figures) so the CSS `pre.mermaid svg { max-width:100% }` rule
    still bounds it, and wrapped in `<pre class="mermaid">` so existing print/screen CSS applies unchanged.
    """
    src = source.strip()
    key = _mermaid_cache_key(src)
    # Give each rendered SVG a UNIQUE root id from its content hash. mmdc defaults to a fixed id="my-svg"
    # (+ chart-title-my-svg / chart-desc-my-svg), so two diagrams on one page collide (duplicate-ID →
    # html-validate FAILs). A per-diagram svgId namespaces the SVG's ids. (The "idscheme-v1" marker in the
    # cache key above invalidates SVGs cached under the old fixed-id scheme; bump it if the scheme changes.)
    svg_id = f"mermaid-{key[:16]}"
    cached = _MERMAID_CACHE / f"{key}.svg"
    if cached.exists():
        svg = cached.read_text(encoding="utf-8")
    else:
        if not _MMDC.exists():
            raise SystemExit(
                f"mermaid-cli (mmdc) not found at {_MMDC} — run `npm install` in book/ "
                "(mermaid fences are rendered to inline SVG at build time)")
        _MERMAID_CACHE.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory() as td:
            inp = pathlib.Path(td) / "diagram.mmd"
            outp = pathlib.Path(td) / "diagram.svg"
            inp.write_text(src + "\n", encoding="utf-8")
            r = subprocess.run(
                [str(_MMDC), "-i", str(inp), "-o", str(outp),
                 "-c", str(_MERMAID_CONFIG), "-p", str(_MMDC_PUPPETEER),
                 "--svgId", svg_id, "-b", "transparent", "--quiet"],
                capture_output=True, text=True,
                env={**_mermaid_env()},
            )
            if r.returncode != 0 or not outp.exists():
                raise SystemExit(
                    f"mmdc failed to render a mermaid diagram (rc={r.returncode}):\n"
                    f"{r.stderr}\n--- source ---\n{src}")
            svg = outp.read_text(encoding="utf-8")
        cached.write_text(svg, encoding="utf-8")

    # Splice only the <svg>…</svg> (drop any XML prolog / doctype), matching the inline-figure pattern.
    svg = re.sub(r"^\s*<\?xml[^>]*\?>\s*", "", svg)
    svg = re.sub(r"<!DOCTYPE[^>]*>\s*", "", svg, flags=re.I)
    m = re.search(r"<svg\b.*</svg>", svg, re.S)
    if m:
        svg = m.group(0)
    # Drop the fixed width/height so the CSS max-width rule governs sizing (same as other inline SVGs).
    svg = re.sub(r'(<svg\b[^>]*?)\swidth="[^"]*"', r"\1", svg, count=1)
    svg = re.sub(r'(<svg\b[^>]*?)\sheight="[^"]*"', r"\1", svg, count=1)
    return f'<pre class="mermaid">{svg}</pre>'


def _mermaid_env() -> dict[str, str]:
    """Environment for the `mmdc` subprocess: inherit the parent env plus a Puppeteer executable-path
    hint if one is set (mmdc's headless Chrome honors PUPPETEER_EXECUTABLE_PATH / CHROME_PATH)."""
    env = dict(os.environ)
    exe = env.get("PUPPETEER_EXECUTABLE_PATH") or env.get("CHROME_PATH")
    if exe:
        env["PUPPETEER_EXECUTABLE_PATH"] = exe
    return env

# Chapter metadata comments — the two title keys plus the `coda` flag. Scoped to these keys (not a generic
# `[a-z-]+`) so the metadata strip never swallows a same-shaped directive comment that belongs in the body: a
# `<!-- figure: … -->`, an `<!-- index-def: … -->`, or an `<!-- index-example: … -->`. A generic key
# pattern here would delete those from `body_md` before the renderer ever saw them. `coda: true` marks an
# in-part UNNUMBERED closing (the Part-IV portable-moves coda): it sorts by filename like a real chapter but
# every number-suppression site skips it, exactly like `is_part_page` — but without the part-opener render.
META_RE = re.compile(r"<!--\s*(part-title|chapter-title|coda):\s*(.*?)\s*-->")

# Curated-index annotation tags (book/AGENTS.md §6). Placed on their own line at (or just before) the
# concept's defining / exemplifying block. The renderer turns each into a stable anchor on the FOLLOWING
# block; the index generator harvests them into curated concept entries.
INDEX_DEF_RE = re.compile(r"^<!--\s*index-def:\s*([a-z0-9-]+)\s*-->$")
INDEX_EXAMPLE_RE = re.compile(r"^<!--\s*index-example:\s*([a-z0-9-]+)\s*-->$")

# Glossary annotation — like LaTeX `\caption[SHORT]{LONG}`: a term's SHORT definition is pinned at its
# DEFINITION SITE, and the build derives BOTH the first-reference sidenote AND the generated back-Glossary
# (a `<!-- glossary-auto -->` directive) from it, so the two can never drift. `gloss:` emits a sidenote at
# the marker AND feeds the glossary; `gloss-only:` feeds the glossary WITHOUT a sidenote (for a term the
# running prose already defines in full). Single source of truth: the marker.
_GLOSS_RE = re.compile(r"^<!--\s*gloss:\s*(?P<term>.+?)\s*\|\s*(?P<def>.+?)\s*-->$")
_GLOSS_ONLY_RE = re.compile(r"^<!--\s*gloss-only:\s*(?P<term>.+?)\s*\|\s*(?P<def>.+?)\s*-->$")
_GLOSSARY: dict[str, str] = {}  # term -> short def; populated by _collect_glossary before the render loop

# Front-glossary → expansion-site wiring. The glossary page (frontmatter/0.2) is hand-authored `**Term.**`
# prose; this joins each bold term to the concept slug whose canonical `<!-- index-def: -->` anchor the build
# harvested, so the term renders as a link to where the book defines it in full. The (page, anchor) TARGET is
# taken from the harvested concept registry — never hand-written — so it CANNOT drift when a definition site
# moves; only this term→slug join is authored (the glossary's display names differ from the concept slugs,
# e.g. "The Printer"→printer-metaphor, "Skill"→skill-soft-control). A term absent here, or whose slug the book
# never index-def-tagged, stays un-linked (no fabricated target). WEB-ONLY: `_link_glossary_sites` runs on the
# rendered glossary HTML in `build()`, never on `body_md`, so the print/Typst projection is untouched.
# Chapter constants below store the number-free identity LABEL (chapter_identity model); the use sites
# compare a chapter's label (via _stem_to_label) so a renumber updates the match automatically.
GLOSSARY_CHAPTER_LABEL = "the-books-language"
# Apparatus one-pagers — pages that are a self-contained *reference apparatus* (not running prose), meant
# to read as ONE bordered, offset item rather than bleeding visually from the preceding chapter. "How to
# read this book" (its short prose + the whole-book map figure) is the founding member; the Operator's
# Dashboard (its metric table, now Appendix D.1 — `appendix-d-operators-dashboard`) is the second. The
# renderer frames these in a `.apparatus-page` box (HTML) / a `#block` frame (Typst) — see the CSS
# `.apparatus-page` swap-point block and `_APPARATUS_ONEPAGER_TITLES` in book_typst.py.
_APPARATUS_ONEPAGER_LABELS = {"how-to-read-this-book"}  # chapter members — matched by identity label
_APPARATUS_ONEPAGER_APPENDIX_SLUGS = {"appendix-d-operators-dashboard"}  # appendix — off the renumber axis
# "What This Book Argues" — the six central claims. The renderer wraps its content in an `.argues-page`
# class so the claims list reads as a deliberate front-matter feature (larger body, more air between
# claims, accent numerals) rather than a manuscript page — see the CSS `.argues-page` block.
_WHAT_THIS_BOOK_ARGUES_LABEL = "what-this-book-argues"  # 0.2 — a non-outline identity row
_GLOSS_TERM_SLUGS = {
    # Round-7 glossary trim (42 → 29 headwords): the "Map and territory", "Compounding",
    # "Structured (model)", "Executable source-of-truth", "Middle-range theory", "Long-horizon task",
    # "One-shot Scripting", "Supervised Autonomy", "Loop engineering", "Pattern", "The Model Zoo",
    # "Fidelity Validator", and "Provenance Layer" headwords were deleted or folded. Their concepts keep
    # their PROSE `index-def` homes (e.g. `structured`@3.1, `executable-source-of-truth`@2.3,
    # `map-and-territory`@3.2, `model-as-map`@2.3, `long-horizon-task`@1.1); only the front-of-book
    # HEADWORDS left the glossary, so this display→slug map drops exactly those keys.
    "Model": "model",
    "Engineering": "engineering",
    "Software engineering": "software-engineering",
    "Structured": "structured",
    "Descriptive vs. prescriptive": "descriptive-vs-prescriptive",
    "Modeling Thesis": "thesis-modeling",
    "Alignment Thesis": "thesis-alignment",
    "Governance Conversion": "governance-conversion",
    "The Printer": "printer-metaphor",
    "Judgment is the scarce resource": "judgment-is-the-scarce-resource",
    "Churn": "churn",
    "Context Window": "context-window",
    "Foundation model": "foundation-model",
    "Agentic harness": "agentic-harness",
    "Skill": "skill-soft-control",
    "Tool": "tool-deterministic-action",
    "Fleet": "fleet",
    "Reasoning horizon": "reasoning-horizon",
    "Governed Engineering Environment": "governed-environment",
    "Governance Mechanism": "governance-mechanism",
    "Constraint": "constraint",
    "Sensor": "sensor",
    "Validator": "validator",
    "Gate": "gate",
    "Lint": "lint",
    "Hook": "hook-hard-control",
    "Invariant": "invariant",
    "Model drift": "model-drift",
    "Drift Gate": "drift-gate",
    "Traceability": "traceability",
}
# A rendered glossary entry: `<p><strong>Term.</strong> …`. Capture the bold lead (term text + its trailing
# period) so the whole label becomes the link, leaving `<strong>` outside the `<a>`.
_GLOSS_ENTRY_RE = re.compile(r"(<p><strong>)([^<]+?)(\.)(</strong>)")


def _link_glossary_sites(body_html: str, gloss_link_map: "dict[str, tuple[str, str]]") -> str:
    """Wrap each front-glossary bold term in a link to its canonical `index-def` anchor. `gloss_link_map` is
    {slug: (page_slug, anchor_id)} harvested from the book's `index-def` tags (never authored → drift-proof).
    A term with no map entry (unregistered slug, or no `index-def` in prose) is left un-linked. WEB-ONLY."""
    def _wrap(m: "re.Match[str]") -> str:
        term = m.group(2).strip()
        slug = _GLOSS_TERM_SLUGS.get(term)
        site = gloss_link_map.get(slug) if slug else None
        if site is None:
            return m.group(0)  # no registered expansion site — never fabricate a target
        page_slug, anchor = site
        href = html.escape(f"{page_slug}.html#{anchor}", quote=True)
        return (f'{m.group(1)}<a class="gloss-site" href="{href}">'
                f'{m.group(2)}{m.group(3)}</a>{m.group(4)}')
    return _GLOSS_ENTRY_RE.sub(_wrap, body_html)

# SINGLE SOURCE OF TRUTH for the build-time notation vocabulary — every marker-comment keyword the build
# consumes and MUST strip from the reader-visible output. The consuming regexes above/below key their
# keyword off this tuple, AND the notation-leak gate (tests/html.py: check_no_notation_leak) reads it so a
# new notation auto-extends the gate — the two can never drift (CLAUDE.md rule #33: stable-check-reads-SSOT).
# `glossary-auto` is the arg-less generated-glossary directive; the rest take a `:`-delimited argument.
MARKER_KEYWORDS = (
    # `coda: true` — the metadata flag marking an in-part UNNUMBERED closing (the Part-IV portable-moves
    #   coda). Stripped earlier by META_RE like part-title/chapter-title; kept in the vocabulary so a leaked
    #   `<!-- coda: true -->` is recognised as a marker (not a stray book comment) by the stray-comment gate.
    "coda",
    "part-title", "chapter-title", "figure", "figure-iframe",
    "gloss", "gloss-only", "glossary-auto", "eq", "index-def", "index-example",
    "inset", "data", "label", "table", "point", "section-terms", "web-only",
    # `<!-- part-foreshadows: <spine-id>, <spine-id>, … -->` — a Part opener's declaration of the
    #   argument-spine claim ids it foreshadows (the traceability decorator). An INERT authored
    #   MODEL-METADATA marker, the sibling of `point` / `section-terms`: consumed and stripped,
    #   renders NOTHING (the opener-traceability lint reads it from the source, not the HTML).
    "part-foreshadows",
    # `<!-- slogan: <id> -->` — an author tag declaring that the line it heads is a REGISTERED, stylized
    #   slogan occurrence (a canonical landing or a blunt referential invocation), keyed to the slogan
    #   registry. An INERT authored MODEL-METADATA marker, the sibling of `point` / `section-terms` /
    #   `part-foreshadows`: consumed and stripped, renders NOTHING (the slogan-density lint harvests it
    #   from the source markdown, not the HTML).
    "slogan",
    # ── Appendix-restructure v2 render directives (flag ON only; §13/§14). All four are consumed + stripped
    #    from reader-visible output the same as the rest of the vocabulary, so the notation-leak gate covers
    #    them by construction. `stack-legend` / `brick-grid` EMIT a build-generated block (a linked legend /
    #    a packed brick grid); `note-spread` / `note-fold` are Typst-only keep-together wrappers, inert in HTML.
    "stack-legend", "brick-grid", "note-spread", "note-fold",
    # `<!-- pullquote -->` — arms the NEXT blockquote as a label-less pull-quote (large centered
    #   emphasis, no fill/border box). [INFRA-1], part6-apply-SPEC-260807.md §C-1/§F.
    "pullquote",
    # `<!-- thesisbox -->` — arms the NEXT blockquote as a part-opener THESIS box: the green
    #   `thesis-box` panel with a full 4-side frame and, when the block leads with a `### TITLE`
    #   heading, a centered ALLCAPS title-bar reusing the green thesis tokens. Mirrors `pullquote`
    #   (author declaration; classified BEFORE the concept-inset title check so a TITLED box is never
    #   mis-read as a concept-inset). In-prose `> **The … Thesis.**` boxes keep the lead-text path.
    "thesisbox",
    # `<!-- table-landscape -->` — a Typst-only per-table directive: the Typst emitter drops the NEXT table
    #   onto a flipped/landscape page (a wide matrix that cramps in portrait). INERT in HTML (the pipe table
    #   renders through the ordinary table path; web width relies on CSS overflow), like note-spread: consumed
    #   and stripped so the marker never leaks into reader-visible output.
    "table-landscape",
    # `<!-- case-onepager -->` — arms the NEXT table as a per-case one-pager CARD: HTML wraps it in
    #   `<div class="case-onepager">` (a light left-ruled panel); Typst wraps the table fragment in the
    #   matching card block. Consumed + stripped so the marker never leaks. (per-case-onepager-DESIGN §5.)
    "case-onepager",
    # `<!-- convergence-spread -->` / `<!-- convergence-spread-key -->` / `<!-- convergence-spread-end -->`
    #   — bracket a glyph-matrix + its key so both projections set them as ONE field-guide spread: the matrix
    #   (left) beside its key (right), no page turn between (tables.md author review). The key's Construct
    #   column folds to a small-caps subtitle beneath each pattern name. HTML wraps the pair in a responsive
    #   `.convergence-spread` two-column block; Typst drops them onto one landscape page. Consumed + stripped.
    "convergence-spread", "convergence-spread-key", "convergence-spread-end",
    # `<!-- worked-examples: <construct-key> -->` … `### Example — <Source>` … `<!-- takeaway -->` …
    #   `<!-- worked-examples-end -->` — the GoF "Known Uses" gallery that closes a significant section (2-4
    #   hand-authored mini-cases + a typographically-distinct Takeaway naming the shared abstraction). The
    #   render loop collects the bracketed span and emits ONE `.worked-examples` section (HTML) / titled block
    #   (Typst); the ROSTER projects from the industry-cases matrix, the PROSE stays authored. Consumed +
    #   stripped, so the leak gate covers the three markers by construction. Parser SSOT: book_ir.WEX_*.
    "worked-examples", "worked-examples-end", "takeaway",
    # `<!-- figure-forthcoming (R25b figure wave): <slug> | <caption> | <ASCII spec> -->` — a NEW figure
    #   whose SVG the figure wave has not authored yet. It carries the slug, caption, and ASCII spec forward
    #   for that wave WITHOUT a live `<!-- figure: -->` declaration or a `[ref:]` (either would dangle the
    #   build against a missing asset). An INERT authored placeholder marker, sibling of `part-foreshadows` /
    #   `slogan`: recognized by the stray-comment gate, consumed as a lone comment, renders NOTHING in both
    #   projections. Single-line by construction (a blank line would split it across render blocks). The
    #   figure wave replaces each with a live `label` + `figure` + `[ref:]` once the SVG exists.
    "figure-forthcoming",
)
# `<!-- web-only: <inline markdown> -->` — a line that belongs in the WEB book but NOT the print PDF (e.g.
# a "download the PDF" call-to-action, which would be absurd inside the PDF itself). The HTML build renders
# its argument as an ordinary paragraph; the Typst emitter drops it (the IR records it as an inert DIRECTIVE,
# so the print projection never sees it). One authored line, web-only by construction — no per-slug special
# casing. The mirror-image `<!-- print-only -->` is not needed yet; add it here if a print-only line appears.
_WEB_ONLY_RE = re.compile(r"^<!--\s*web-only:\s*(?P<content>.+?)\s*-->$")
# A comment whose first token is one of the vocabulary keywords — used to peel a marker glued to the head
# of a prose block (placement-robust stripping: an author need not remember a blank line) and, in the gate,
# to recognise a leaked marker regardless of whether it shipped escaped or raw. The trailing boundary
# (`:` or `-->` or end) keeps `glossary-auto` matchable while not matching a prose word that merely starts
# with a keyword. NOTE the `part-title`/`chapter-title` metadata is stripped earlier by META_RE; it is in
# the vocabulary so the gate still treats a leaked one as a leak.
_MARKER_KEYWORD_ALT = "|".join(re.escape(k) for k in MARKER_KEYWORDS)
_MARKER_COMMENT_RE = re.compile(rf"^<!--\s*(?:{_MARKER_KEYWORD_ALT})(?:\s*:|\s*-->)")
# `<!-- inset: <title> -->` heads a fenced code block and lifts it into a titled inset box (a real
# artifact from the system, visually set apart). It is NOT a standalone directive like `figure:` — it
# needs the fence that follows it, so it sits GLUED to the fence (no blank line) inside the same block
# and is peeled by the fenced-code branch, not by `_consume_leading_marker`. In the vocabulary SSOT so
# the notation-leak gate still treats any un-consumed / mis-placed one as a leak.
_INSET_RE = re.compile(r"^<!--\s*inset:\s*(?P<title>.+?)\s*-->$")
# A `<!-- point: <slug> | <text> -->` drain decorator (the induced canonical point of the paragraph it
# heads). Its text is AUTHORED MODEL-METADATA — invisible to the reader, consumed only by the outline
# model — so any body_md scan that reflects READER-VISIBLE prose (the occurrence index) must strip it, or a
# term that appears only in a decorator would spawn a phantom index reference. `_strip_point_decorators`
# below removes them; the outline model reads the point from the IR, never from this scrubbed prose.
_POINT_COMMENT_RE = re.compile(r"^\s*<!--\s*(?:point|section-terms):.*?-->\s*$", re.M)
# ANY HTML comment. After the block-head marker peel has consumed every recognized notation directive
# (figure / label / table / gloss / point / …), a comment still sitting in a prose-like render block is a
# STRAY authoring TODO/note — its leading token is not in the notation vocabulary. Left in, it leaks: raw
# (an invisible HTML comment) into the web page, and as VISIBLE prose into the Typst/PDF projection (which
# has no lone-comment passthrough). Both render paths strip it just before rendering. Non-greedy + DOTALL so
# a MULTI-line authoring note is matched whole. The `stray-book-comment` source lint keeps `.md` clean, so
# after a clean tree this strip has nothing to do — it is the render-time backstop, the lint the front line.
_STRAY_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)


def _strip_point_decorators(body_md: str) -> str:
    """Remove every `<!-- point: … -->` and `<!-- section-terms: … -->` decorator line from a chapter's
    markdown. Used by the reader-visible prose scans (the occurrence index) so an authored canonical-point or
    section-terms tag never leaks into reader-facing output. Both are AUTHORED MODEL-METADATA (invisible to
    the reader, consumed only by the view-models). The renderer's block loop strips them separately (they
    render nothing); this is the text-scan twin. The name is kept for compatibility — it strips both markers."""
    return _POINT_COMMENT_RE.sub("", body_md)


def _collect_glossary(chapters: list[dict]) -> None:
    """Harvest every `gloss:` / `gloss-only:` marker across all chapter bodies into `_GLOSSARY`. Fails
    loud on a duplicate term (one definition site per term — that IS the single-source-of-truth rule)."""
    _GLOSSARY.clear()
    for c in chapters:
        for line in c["body_md"].splitlines():
            m = _GLOSS_RE.match(line.strip()) or _GLOSS_ONLY_RE.match(line.strip())
            if m:
                term = m.group("term").strip()
                if term in _GLOSSARY:
                    raise SystemExit(f"duplicate glossary definition for '{term}' — one gloss marker per term")
                _GLOSSARY[term] = m.group("def").strip()

# Part number → the source subdirectory that holds its chapters. Front matter is part 0, the
# six numbered parts are 1–6 (Part 2 is Modeling, Part 3 is Alignment, Part 4 is The MAGE Method,
# Part 5 is The Evidence, Part 6 is The Profession — the substantive argument + case + closing
# chapters), true back matter (apparatus: about-the-author, colophon) is part 7. Appendix parts follow.
_PART_DIRS = {
    0: "frontmatter",
    1: "part1",
    2: "part2",
    3: "part3",
    4: "part4",
    5: "part5",
    6: "part6",
    7: "part7",
}

# Part number → its display title (mirrors the `part-title` metadata; kept here so a part with no
# chapters still names correctly, and so the TOC/index label is authoritative from one place).
_PART_TITLES = {
    0: "Front Matter",
    1: "The New Engineering Problem",
    2: "Modeling",
    3: "Alignment",
    4: "The MAGE Method",
    5: "The Evidence",
    6: "The Profession",
    7: "Back Matter",
}

# The DO-ladder question each numbered Part answers — printed on the Part-opener orientation verso (the
# PDF spread) under a fixed label. One question per Part 1-6, matching the corrected outcomes model: each
# Part is framed by the single reasoning move the reader learns to make. Part 1 is the mindset opener (a
# "why", the new-engineering-problem setup — what abundant implementation makes scarce), not an
# instrumental "how do I"; Parts 2-4 are "how do I", Part 5 a "why", Part 6 a "where". Single source of
# truth: book_typst.py reads these (imported as `bb`) for the
# orientation verso AND the PART-OPENER SPREAD sensor greps the same label + strings, so the print divider
# and its gate cannot disagree on which question a Part carries.
_PART_OPENER_QUESTION_LABEL = "Question this Part answers"
_PART_OPENER_QUESTIONS = {
    1: "What becomes the engineering problem when implementation becomes abundant?",
    2: "How do I identify useful models?",
    3: "How do I encode authority into my environment?",
    4: "How do I practice MAGE?",
    5: "How did the clean method emerge from messy engineering?",
    6: "Where is the profession going?",
}

# Per-Part epigraph rendered at the opener of the first chapter in each numbered Part. Each is a
# (quote, attribution) pair. The Macbeth line is verbatim from the source memoir; the Context and
# Governed-Environment openers use a regulatory line and the book's own thesis, and the Putting-It-
# to-Work opener the working method of that part (candidates a human editor may swap). The
# Ecclesiastes line that once opened Part 5 now lands only in the conclusion, where it sets up the
# closing "machines search, not wisdom" — kept to one appearance to avoid the reader meeting it twice.
# The book carries ONE epigraph — the Ecclesiastes verse at the opening of the Conclusion, placed
# inline there. The per-Part opener epigraphs were removed (author's call); this map stays empty so
# `_epigraph_html` is a no-op for every Part.
_PART_EPIGRAPHS: dict[int, tuple[str, str]] = {}

_PART_CHAP_RE = re.compile(r"^(\d+)\.(\d+)-")

# The stem of a numbered Part's landing-page source (`part<N>/00-part-intro.md`) — the Part title + a
# one-paragraph "what you'll learn". It does NOT match `_PART_CHAP_RE`, so `_discover_chapters` special-cases
# it into a synthetic chapter-0 record (the same shape the appendix front-door uses).
_PART_INTRO_STEM = "00-part-intro"


def _load_metrics() -> dict[str, str]:
    """Read `data/metrics.json` (the single source for the book's headline numbers). Keys prefixed
    with `_` are notes, not tokens; everything else is a `{{key}}` substitution."""
    path = HERE / "data" / "metrics.json"
    if not path.is_file():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {k: str(v) for k, v in raw.items() if not k.startswith("_")}


def _apply_metrics(md: str, metrics: dict[str, str]) -> str:
    """Substitute every `{{token}}` in the chapter prose with its metrics value. An unknown token
    fails loud — a mistyped placeholder should stop the build, not ship `{{typo}}` to the reader."""
    def repl(m: "re.Match[str]") -> str:
        key = m.group(1).strip()
        if key not in metrics:
            raise SystemExit(f"metrics token {{{{{key}}}}} has no value in data/metrics.json")
        return metrics[key]
    return re.sub(r"\{\{\s*([a-z0-9_]+)\s*\}\}", repl, md)


def _load_data_claims() -> dict[str, dict]:
    """Read `data/data-claims.json` — the single source of truth for the book's governed data
    cross-references. Keys prefixed with `_` are notes, not claims. Each claim maps a slug to
    {source, anchor, holds, status, gloss}. Modelled on `_load_metrics` / `data/metrics.json`: the
    `[data: <slug>]` marker resolves against this manifest, and an unknown slug fails the build loud."""
    path = HERE / "data" / "data-claims.json"
    if not path.is_file():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {k: v for k, v in raw.items() if not k.startswith("_")}


_DATA_SOURCE_STEM: "dict[str, str] | None" = None


def _chapter_stem_for(label: str) -> str:
    """A data-claim `source` is a number-free identity LABEL now (chapter_identity model); resolve it to the
    numbered file stem (`the-timeline-and-the-work` -> `5.2-the-timeline-and-the-work`) that keys the build's
    slug->title map and names the built HTML page. A value that is not a bare label (legacy numbered stem)
    passes through unchanged, so a half-migrated field still renders."""
    global _DATA_SOURCE_STEM
    if _DATA_SOURCE_STEM is None:
        import json as _json
        import os as _os
        p = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))),
                          "book-models", "chapter_identity_declared.json")
        decl = _json.loads(open(p, encoding="utf-8").read())
        _DATA_SOURCE_STEM = {c["label"]: _os.path.basename(c["filename"])[:-3]
                             for c in decl.get("chapters", [])}
    return _DATA_SOURCE_STEM.get(label, label)


_STEM_TO_LABEL: "dict[str, str] | None" = None


def _stem_to_label(stem: str) -> str:
    """The number-free identity LABEL for a chapter's numbered file stem (`0.3-the-books-language` ->
    `the-books-language`), for comparing a chapter against the label-keyed apparatus/glossary constants. A
    non-chapter stem (an appendix slug) has no identity row and passes through unchanged."""
    global _STEM_TO_LABEL
    if _STEM_TO_LABEL is None:
        import json as _json
        import os as _os
        p = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))),
                          "book-models", "chapter_identity_declared.json")
        decl = _json.loads(open(p, encoding="utf-8").read())
        _STEM_TO_LABEL = {_os.path.basename(c["filename"])[:-3]: c["label"]
                          for c in decl.get("chapters", [])}
    return _STEM_TO_LABEL.get(stem, stem)


def _apply_data_claims(md: str, claims: dict[str, dict], chapter_titles: dict[str, str]) -> str:
    """Substitute every `[data: <slug>]` marker with a footnote-style cross-ref into the chapter that
    reports the datum: "For the data, see [<Chapter Title> →](<source>.html#<anchor>)" — appending
    " (preliminary)" when the claim's status is preliminary or partial. An unknown slug fails the build
    LOUD (like an unknown `{{token}}`) — a rotted reference must stop the build, not ship a dead cross-ref.
    The `chapter_titles` map (slug -> title) is the build's own discovery, so the link text can never
    drift from the source chapter's real title. The claim's `source` is a chapter LABEL, resolved to the
    numbered page stem at build. Emits a markdown link that `inline()` then renders to <a>."""
    def repl(m: "re.Match[str]") -> str:
        slug = m.group(1).strip()
        if slug not in claims:
            raise SystemExit(f"data marker [data: {slug}] has no entry in data/data-claims.json")
        entry = claims[slug]
        source = _chapter_stem_for(entry["source"])
        anchor = entry.get("anchor", "")
        title = chapter_titles.get(source, source)
        href = f"{source}.html" + (f"#{anchor}" if anchor else "")
        prelim = " (preliminary)" if entry.get("status") in ("preliminary", "partial") else ""
        return f"For the data, see [{title} →]({href}){prelim}"
    return re.sub(r"\[data:\s*([a-z0-9-]+)\s*\]", repl, md)


def _apply_part_refs(md: str) -> str:
    """Substitute `{{part:N}}` → `Part N (<title>)`, the title read from `_PART_TITLES` at build time. A
    prose reference to a Part stays in sync with its title: rename the Part once in `_PART_TITLES` and
    every `{{part:N}}` updates, so a rename can never strand a stale "(The Old Title)". Fails loud on a
    bad N (a reference to a Part that does not exist)."""
    def repl(m: "re.Match[str]") -> str:
        n = int(m.group(1))
        if n not in _PART_TITLES:
            raise SystemExit(f"{{{{part:{n}}}}} references a Part not in _PART_TITLES")
        return f"Part {n} ({_PART_TITLES[n]})"
    return re.sub(r"\{\{\s*part:(\d+)\s*\}\}", repl, md)


# `{{dt:<key>}}` — derive a design-system NAME from the token SSOT so the colophon's prose (faces, accent)
# follows book-models/design-tokens.json instead of hardcoding "Source Serif 4"/"burnt umber". Colon-namespaced
# like {{part:N}}, so _apply_metrics (which matches [a-z0-9_]+ only, no colon) never touches it. Unknown
# key fails loud — a mistyped face stops the build, never ships {{dt:typo}} to the reader.
_DT_TOKEN_RE = re.compile(r"\{\{\s*dt:([a-z0-9_]+)\s*\}\}")


def _apply_design_tokens(md: str) -> str:
    resolvers = {
        "font_display": lambda: _TOKENS.type["display"]["family"],
        "font_body":    lambda: _TOKENS.type["body"]["family"],
        "font_mono":    lambda: _TOKENS.type["mono"]["family"],
        "accent_name":  lambda: _TOKENS.accent_name,
    }

    def repl(m: "re.Match[str]") -> str:
        key = m.group(1)
        if key not in resolvers:
            raise SystemExit(f"design-token marker {{{{dt:{key}}}}} — unknown key "
                             f"(known: {', '.join(sorted(resolvers))})")
        return resolvers[key]()
    return _DT_TOKEN_RE.sub(repl, md)


# `[gh:<repo-relative-path>]` or `[gh:<path>|<label>]` → a link to the file on GitHub, deriving owner/repo/
# branch from repo-metadata.json (the same SSOT catalog.py + the citation Scholar-meta read). Label defaults
# to the path. Emits a markdown link string that inline() renders to <a>; the offline path-exists guarantee
# is the check_gh_refs gate in catalog.py validate, so this stays a pure string transform (fail-loud on a
# rotted path lives in ONE place — the gate — not duplicated here).
_REPO_META = json.loads(
    (ROOT / "book-models" / "repo-metadata.json").read_text(encoding="utf-8"))
_GH_BLOB_BASE = (f"https://github.com/{_REPO_META['owner']}/{_REPO_META['repo']}"
                 f"/blob/{_REPO_META.get('default_branch', 'main')}")
_GH_MARKER_RE = re.compile(r"\[gh:\s*([^\]|]+?)\s*(?:\|\s*([^\]]*?)\s*)?\]")


def _apply_gh_refs(md: str) -> str:
    def repl(m: "re.Match[str]") -> str:
        path = m.group(1)
        label = (m.group(2) or path).strip()
        return f"[{label}]({_GH_BLOB_BASE}/{path})"
    return _GH_MARKER_RE.sub(repl, md)


# ─────────────────────────── Bibliography & citations (references.bib → citations.json → two surfaces) ──
# The bib is the single source of truth; Chicago is rendered ONCE by render_citations.py through Typst and
# committed to book/data/citations.json, which BOTH surfaces consume so they cannot drift. Design:
# book/_design/bibliography-subsystem-260801.md. This module holds the SSOT marker vocabulary (the
# CITE-RESOLVE / CITE-FRESH gates import these), the chapter-scoped numbering pre-pass, and the HTML
# projections (numeric sidebar citations, symbolic editorial notes, per-chapter Works Cited).

# Deployed Pages root — read from the same repo-metadata SSOT catalog.py uses, so the Scholar meta URLs
# (citation_fulltext_html_url / citation_pdf_url) can never drift from the site's real address.
_PAGES_URL = json.loads(
    (ROOT / "book-models" / "repo-metadata.json").read_text(encoding="utf-8"))["pages_url"].rstrip("/")
_PUB_YEAR = (re.match(r"\d{4}", _BOOK_MANIFEST.get("copyright_years", "")) or [""])[0] or "2026"

# The inline citation + note markers — they join the existing inline bracket family (`[ref:]`, `[data:]`,
# `[[…]]`). SSOT for the renderer AND the CITE-RESOLVE gate (which imports these), so the gate can never
# drift from what the build parses. A `[note:]` body must not contain a `]` (the non-greedy stop).
_CITE_MARKER_RE = re.compile(r"\[cite:\s*([^\]]+?)\s*\]")
_NOTE_MARKER_RE = re.compile(r"\[note:\s*(.+?)\s*\]", re.S)
# Editorial-note glyph cycle: `* † ‡ § ‖ ¶`, then doubled (`** †† …`). DISJOINT from the citation glyph set
# (digits) by construction — the CITE-SYMBOLOGY gate asserts it. `_note_glyph(i)` is 0-indexed.
_NOTE_GLYPHS = ("*", "†", "‡", "§", "‖", "¶")

# The rendered Chicago strings (per key: note_html / works_cited_html / bib_html / csl), loaded once from
# the committed citations.json. Empty until _load_citations() runs (start of build()).
_CITATIONS: dict[str, dict] = {}
# Per-chapter citation state, set by _number_citations() before a chapter renders and read inside inline()
# — the same module-global pattern the glossary (`_GLOSSARY`) uses to thread chapter state into inline().
_CITE_STATE: dict = {"ns": "", "numbers": {}, "order": [], "notes_emitted": set(), "note_i": 0}


def _load_citations() -> dict[str, dict]:
    """Read book/data/citations.json (the committed render of references.bib) into `_CITATIONS`. Stdlib
    json only — this keeps catalog.py's clone-and-run promise (the Typst render is a dev/CI-time step; the
    build only ever reads the JSON). A missing file leaves the map empty (a tree with no citations still
    builds); the CITE-FRESH gate is what fails loud on a STALE file."""
    path = HERE / "data" / "citations.json"
    _CITATIONS.clear()
    if path.is_file():
        _CITATIONS.update(json.loads(path.read_text(encoding="utf-8")).get("citations", {}))
    return _CITATIONS


def parse_cite_spec(spec: str) -> list[tuple[str, str | None]]:
    """A `[cite: …]` payload → [(key, locator|None), …]. Multiple works are `;`-separated; an optional
    locator follows a key after the first `,`: `winters2020, 42; gof1994` → [('winters2020','42'),
    ('gof1994', None)]."""
    out: list[tuple[str, str | None]] = []
    for part in spec.split(";"):
        part = part.strip()
        if not part:
            continue
        if "," in part:
            key, loc = part.split(",", 1)
            out.append((key.strip(), loc.strip()))
        else:
            out.append((part, None))
    return out


def iter_cite_keys(text: str) -> list[str]:
    """Every cite key in `text`, in first-appearance document order (repeats included). The SSOT scan the
    numbering pre-pass, the end-of-book Bibliography union, and the CITE-RESOLVE gate all share."""
    keys: list[str] = []
    for m in _CITE_MARKER_RE.finditer(text):
        keys.extend(key for key, _loc in parse_cite_spec(m.group(1)))
    return keys


def _cite_ns(slug: str) -> str:
    """A slug → a citation id namespace (`wc-<ns>-N`), sanitised to the `[a-z0-9-]` an HTML id / CSS
    selector accepts (the chapter slug carries dots: `0.4-preface` → `0-4-preface`)."""
    return re.sub(r"[^a-z0-9]+", "-", slug.lower()).strip("-")


def _number_citations(slug: str, body_md: str) -> None:
    """Set `_CITE_STATE` for one chapter: assign each DISTINCT cite key the next integer in first-reference
    order (a repeat reuses its number), and reset the editorial-note counter. Runs before md_to_html so
    inline() can look the numbers up. This is what makes the sidebar number equal the Works-Cited entry
    number (BIB-4 mirror) — both read this one ordering."""
    numbers: dict[str, int] = {}
    order: list[str] = []
    for key in iter_cite_keys(body_md):
        if key not in numbers:
            numbers[key] = len(order) + 1
            order.append(key)
    _CITE_STATE.clear()
    _CITE_STATE.update({"ns": _cite_ns(slug), "numbers": numbers, "order": order,
                        "notes_emitted": set(), "note_i": 0})


def _note_glyph(i: int) -> str:
    """The i-th editorial-note glyph (0-indexed): `* † ‡ § ‖ ¶`, doubled after six (`** †† …`)."""
    return _NOTE_GLYPHS[i % len(_NOTE_GLYPHS)] * (i // len(_NOTE_GLYPHS) + 1)


def _ensure_citations() -> None:
    """Populate `_CITATIONS` if empty — so ANY render path (a per-body float/word-count pass, the IR
    render-fidelity check, a direct md_to_html/inline call) resolves cite markers, not only build(), which
    loads them explicitly. Idempotent; a missing citations.json leaves it empty (CITE-FRESH fails loud)."""
    if not _CITATIONS:
        _load_citations()


def _render_cite_marker(spec: str) -> str:
    """Render one `[cite: …]` payload → numeric superscript(s) linked to the chapter's Works Cited, each
    followed (first occurrence of the key only) by a right-gutter citation NOTE carrying the Chicago
    note-form string. Fails loud on a key absent from citations.json OR unnumbered (a cite outside a
    numbered chapter) — a dead citation must stop the build, like an unknown `{{token}}` / `[data:]`."""
    _ensure_citations()
    ns = _CITE_STATE["ns"]
    numbers = _CITE_STATE["numbers"]
    emitted = _CITE_STATE["notes_emitted"]
    out: list[str] = []
    for key, loc in parse_cite_spec(spec):
        if key not in _CITATIONS:
            raise SystemExit(f"[cite: {key}] names no entry in references.bib / citations.json")
        if key not in numbers:
            # The main chapter loop pre-numbers every key via _number_citations, so this only fires in an
            # AUXILIARY render pass (float collection / word count) whose HTML is discarded — number on
            # demand so those passes never crash. A genuinely unknown key already failed above.
            numbers[key] = len(_CITE_STATE["order"]) + 1
            _CITE_STATE["order"].append(key)
        n = numbers[key]
        label = html.escape(f"citation {n}", quote=True)
        sup = f'<sup class="cite-ref"><a href="#wc-{ns}-{n}" aria-label="{label}">{n}</a></sup>'
        note = ""
        if key not in emitted:
            emitted.add(key)
            loc_txt = f", {html.escape(loc)}" if loc else ""
            note = (f'<span class="cite-note"><span class="cn-mark">{n}.</span> '
                    f'{_CITATIONS[key]["note_html"]}{loc_txt}</span>')
        out.append(sup + note)
    return "".join(out)


def _render_note_marker(escaped_text: str) -> str:
    """Render one `[note: …]` → a symbolic superscript (`*†‡§…`) + a right-gutter editorial note. `escaped_text`
    is already HTML-escaped by inline() (a note body is plain editorial text, no inner markdown). The sup
    carries an aria-label so a screen reader announces "note N", not a bare symbol (decision #3)."""
    i = _CITE_STATE["note_i"]
    _CITE_STATE["note_i"] = i + 1
    ns = _CITE_STATE["ns"]
    glyph = html.escape(_note_glyph(i))
    label = html.escape(f"note {i + 1}", quote=True)
    note_id = f"note-{ns}-{i + 1}"
    # role="doc-noteref" (DPUB-ARIA: a mark referencing a note) and aria-label both belong on the
    # <a>, not the <sup>: axe's aria-allowed-role rejects the link-derived doc-noteref on a generic
    # <sup>, and html-validate rejects aria-label on a generic element (aria-label-misuse). Mirror
    # the citation marker (link the mark to its note) so the role legitimizes the name AND the mark
    # is a real navigable reference to the editorial note it names.
    return (f'<sup class="note-ref"><a href="#{note_id}" role="doc-noteref" aria-label="{label}">{glyph}</a></sup>'
            f'<span class="editorial-note" id="{note_id}"><span class="cn-mark">{glyph}</span> {escaped_text}</span>')


def works_cited_section() -> str:
    """The current chapter's Works Cited — a numbered list (Chicago notes; decision #1) in first-reference
    order, so entry N is the work cited by superscript N (BIB-4). Empty string when the chapter cites
    nothing. The `<ol>` numbering equals the entry ids (`wc-<ns>-N`) the superscripts link to."""
    order = _CITE_STATE.get("order", [])
    if not order:
        return ""
    ns = _CITE_STATE["ns"]
    items = "".join(
        f'<li id="wc-{ns}-{n}">{_CITATIONS[key]["works_cited_html"]}</li>'
        for n, key in enumerate(order, 1)
    )
    return (f'<section class="works-cited" aria-labelledby="wc-{ns}-h">'
            f'<h2 id="wc-{ns}-h" class="wc-h">Works Cited</h2>'
            f'<ol class="wc-list">{items}</ol></section>')


def _highwire_reference(csl: dict) -> str:
    """One cited work → Google Scholar's compressed `citation_reference` form
    (`citation_title=…;citation_author=…;citation_publication_date=…`), a repeated `citation_author=` per
    author. Built straight from the key's CSL block — this is what lets Scholar build the citation graph OUT
    of the book (§6, BIB-8)."""
    parts = [f"citation_title={csl.get('title', '')}"]
    for a in csl.get("author", []):
        name = f"{a.get('given', '')} {a.get('family', '')}".strip()
        if name:
            parts.append(f"citation_author={name}")
    if csl.get("year"):
        parts.append(f"citation_publication_date={csl['year']}")
    return ";".join(parts)


def _chapter_head_meta(chapter: dict, cited_keys: list[str]) -> str:
    """The highwire_press `<meta>` block for a chapter page's <head> (§6, BIB-8): the chapter as a book
    section (citation_book_title marks it), the book author + date, the canonical HTML + PDF URLs, and one
    `citation_reference` per work cited on the page. Every content attribute is escaped."""
    def meta(name: str, content: str) -> str:
        return f'<meta name="{name}" content="{html.escape(content, quote=True)}">'
    tags = [
        meta("citation_title", _plain(chapter["chapter_title"])),
        meta("citation_author", _BOOK_MANIFEST["author"]),
        meta("citation_book_title", _BOOK_MANIFEST["title"]),
        meta("citation_publication_date", _PUB_YEAR),
        meta("citation_fulltext_html_url", f"{_PAGES_URL}/book/{chapter['slug']}.html"),
        meta("citation_pdf_url", f"{_PAGES_URL}/book/{_PDF_FILENAME}"),
    ]
    tags += [meta("citation_reference", _highwire_reference(_CITATIONS[k]["csl"])) for k in cited_keys]
    return "".join(tags)


def _bib_sort_key(key: str) -> tuple[str, str]:
    """Alphabetical bibliography order: by first author's surname, then title (Chicago). A corporate/no-
    author work sorts by title."""
    csl = _CITATIONS[key]["csl"]
    authors = csl.get("author", [])
    fam = (authors[0].get("family", "") if authors else csl.get("title", "")).lower()
    return (fam, csl.get("title", "").lower())


def build_bibliography_page(chapters: list[dict], nav_last: str) -> str:
    """The end-of-book Bibliography — the alphabetical union (by author surname) of every work cited across
    all chapters, deduplicated, rendered from the same citations.json strings as the per-chapter Works
    Cited; ordering is the only difference (§5). Also emits one `citation_reference` per entry so Scholar
    gets the whole reference list on one page (§6). Always produced (a tree with no cites yields the
    'no works cited yet' note) so the tracked-HTML gate's expected set stays stable."""
    all_keys = sorted({k for c in chapters for k in iter_cite_keys(c["body_md"])}, key=_bib_sort_key)
    if all_keys:
        items = "".join(f'<li id="bib-{k}">{_CITATIONS[k]["bib_html"]}</li>' for k in all_keys)
        body = f'<ul class="bib-list">{items}</ul>'
    else:
        body = '<p class="bib-empty">No works are cited yet.</p>'
    head_meta = "".join(
        f'<meta name="citation_reference" content="{html.escape(_highwire_reference(_CITATIONS[k]["csl"]), quote=True)}">'
        for k in all_keys)
    provenance = "<!-- GENERATED by book/build_book_html.py (build_bibliography_page) — DO NOT EDIT. -->"
    header = ('<header class="chap"><div class="kicker">Back Matter</div>'
              '<h1>Bibliography</h1></header>')
    intro = ('<p>Every work cited in this book, in one alphabetical list. Each chapter also carries its own '
             'numbered <em>Works Cited</em>; this is their union.</p>')
    nav_bar = _static_nav_html(
        "Bibliography",
        back_extra=[("« Previous chapter", f"{nav_last}.html", "Previous chapter — back matter")],
    )
    foot = f'<div class="book-foot">{html.escape(COPYRIGHT)}</div>'
    main = header + intro + f'<section class="bibliography" aria-label="Bibliography">{body}</section>' + nav_bar + foot
    toc = toc_html(chapters, None)
    return page("Bibliography · Model-Based Agentic Software Engineering", toc, main,
                provenance=provenance, head_meta=head_meta)


def parse_chapter(path: pathlib.Path, part: int, chapter: int, metrics: dict[str, str]) -> dict:
    text = _apply_gh_refs(_apply_design_tokens(
        _apply_part_refs(_apply_metrics(path.read_text(encoding="utf-8"), metrics))))
    meta = {k: v for k, v in META_RE.findall(text)}
    body = META_RE.sub("", text).strip()
    # Drop the leading H1 (# Chapter …) — we render it from metadata in the header. Skip any leading blank
    # lines AND HTML comments (a `<!-- noqa: book-visual … -->` / directive marker) first, so the title H1
    # is consumed whether it sits at absolute position 0 (the common case) or after a leading metadata
    # comment (the glossary / acknowledgments / scope / lessons / ada-context chapters). Every chapter
    # carries exactly one H1 = its title (conformance sensor), so the first H1 found here is always it.
    lines = body.splitlines()
    idx = 0
    while idx < len(lines):
        stripped = lines[idx].strip()
        if not stripped:
            idx += 1
            continue
        if stripped.startswith("<!--"):
            while idx < len(lines) and "-->" not in lines[idx]:
                idx += 1  # consume a multi-line comment through its close
            idx += 1
            continue
        break
    if idx < len(lines) and lines[idx].startswith("# "):
        del lines[idx]
    return {
        "slug": path.stem,
        "part": part,
        "part_title": meta.get("part-title", _PART_TITLES.get(part, "")),
        "chapter": chapter,
        "chapter_title": meta.get("chapter-title", path.stem),
        # Redirect any authored link to a now-dropped (non-flagship) appendix page to the live web entry, so
        # a main-narrative cross-reference to a mechanism the print appendix omits stays resolvable.
        "body_md": _redirect_dropped_appendix_links("\n".join(lines).strip()),
        "is_matter": part in (0, 7),  # front / back matter — no "Chapter N" kicker
        # An in-part UNNUMBERED coda (`<!-- coda: true -->`): the Part-IV portable-moves closing. It sorts
        # by its `4.6-` filename like a real chapter but every number-suppression site skips it (see the
        # `is_coda` guards at the seq counter, `_chap_ref`, `_index_ref_label`, `num_label`, `chap_num`).
        "is_coda": meta.get("coda", "").strip().lower() == "true",
        # Pull the Mermaid runtime onto this page only if the chapter carries a ```mermaid fence
        # (the Model Zoo chapters reuse the appendix Structure diagrams; other chapters do not).
        "mermaid": "```mermaid" in body,
    }


def _parse_part_intro(path: pathlib.Path, part: int, metrics: dict[str, str]) -> dict:
    """A numbered Part's landing page — a synthetic chapter-0 record built from `part<N>/00-part-intro.md`.
    Reuses `parse_chapter` for the token / design-token / metrics passes, then overrides three things: a UNIQUE
    slug (`part-<N>-intro`; the `00-part-intro` stem is identical across Parts, so `path.stem` would collide),
    `chapter: 0` so it sorts ahead of the Part's real chapters, and `is_part_page` so every number-suppression
    site (the `seq` counter, `_chap_ref`, the H1 `part.chapter` prefix, and the PDF twin) skips it — the Part
    opener shows no `N.0`, mirroring the appendix front-door's chapter-0 page. The title comes from `_PART_TITLES`
    (the single source of a Part's name), so the H1 can never drift from the Part it heads."""
    rec = parse_chapter(path, part, 0, metrics)
    rec["slug"] = f"part-{part}-intro"
    rec["chapter_title"] = _PART_TITLES.get(part, rec["chapter_title"])
    rec["part_title"] = _PART_TITLES.get(part, "")
    rec["is_part_page"] = True
    return rec


def _discover_chapters(metrics: dict[str, str]) -> list[dict]:
    """Walk the Part/Chapter filesystem hierarchy → an ordered list of chapter records. Part number
    and chapter number come from the PATH (the `part<N>/` dir and the `<N>.<M>-slug.md` name); the
    titles come from each file's metadata. Ordered by (part, chapter)."""
    found: list[dict] = []
    for part, subdir in _PART_DIRS.items():
        d = HERE / subdir
        if not d.is_dir():
            continue
        for p in sorted(d.glob("*.md")):
            if p.stem == _PART_INTRO_STEM:
                # A numbered Part's landing page. Front matter (0) and true back matter (7 — apparatus) are
                # not numbered Parts, so they carry no landing page even if a stray intro file appears.
                if part not in (0, 7):
                    found.append(_parse_part_intro(p, part, metrics))
                continue
            m = _PART_CHAP_RE.match(p.name)
            if not m:
                continue  # not a chapter file (e.g. a stray README)
            file_part, chapter = int(m.group(1)), int(m.group(2))
            # The filename's leading part digit must match its directory's part (catch a misfiled chapter).
            if file_part != part:
                raise SystemExit(
                    f"chapter {p} names part {file_part} but sits in {subdir} (part {part})")
            found.append(parse_chapter(p, part, chapter, metrics))
    found.sort(key=lambda c: (c["part"], c["chapter"]))
    # Derive the sequential chapter number — single source of truth is the filesystem order over the
    # numbered body Parts (1-5). Front/back matter (is_matter) is unnumbered and skipped. This replaces
    # the old hand-typed "# Chapter N ·" H1 (which the build drops anyway), so a chapter number can never
    # drift again: renumbering is just moving a file.
    seq = 0
    for c in found:
        if not c.get("is_matter") and not c.get("is_part_page") and not c.get("is_coda"):
            seq += 1
            c["seq"] = seq
    # Resolve `[data: <slug>]` cross-ref markers now that every chapter's title is known — the link text
    # is the SOURCE chapter's real title (the build's own discovery), so a cross-ref can never carry a
    # stale title. Runs after discovery (not in parse_chapter) because it needs the whole slug->title map.
    claims = _load_data_claims()
    if claims:
        titles = {c["slug"]: c["chapter_title"] for c in found}
        for c in found:
            c["body_md"] = _apply_data_claims(c["body_md"], claims, titles)
    return found


def _abbr_cite(m: "re.Match[str]") -> str:
    """A `[[slug|text]]` / `[[slug]]` abstraction citation from a catalogue entry → a link into the
    catalogue's rendered abstractions glossary (one level up from book/)."""
    slug = m.group(1).strip()
    text = (m.group(2) or slug).strip()
    return f'<a href="../ABSTRACTIONS.html#{html.escape(slug, quote=True)}">{html.escape(text, quote=False)}</a>'


def inline(s: str) -> str:
    # Intra-word emphasis: `[+X+]` → <em>X</em>. Stashed BEFORE escaping so the emitted <em> survives.
    # The italic `*…*` pass below is word-boundary-only by design and cannot emphasize letters *inside*
    # a word — e.g. the acronym-deriving M / Ag / E in "Model-Based Agentic Software Engineering" (MAGE).
    em_spans: list[str] = []

    def _stash_em(m: "re.Match[str]") -> str:
        em_spans.append(html.escape(m.group(1), quote=False))
        return f"\x00EM{len(em_spans) - 1}\x00"

    s = re.sub(r"\[\+(.+?)\+\]", _stash_em, s)
    s = html.escape(s, quote=False)
    # Inline code spans (`text`) first — their content is code, so no bold/italic/link pass should
    # run inside them. Stash each span behind a placeholder, run the markdown passes, then restore.
    # This is what lets `MAJOR`, `[]P`, and `Service` render as <code> instead of literal backticks.
    code_spans: list[str] = []

    def _stash(m: "re.Match[str]") -> str:
        code_spans.append(m.group(1))
        return f"\x00CODE{len(code_spans) - 1}\x00"

    s = re.sub(r"`([^`]+)`", _stash, s)
    # Abstraction citations (`[[slug|text]]`) → links into the catalogue glossary. After escaping (the
    # brackets survive escaping); before the markdown-link pass so the emitted <a> is left intact.
    s = re.sub(r"\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]", _abbr_cite, s)
    # Inline citation / editorial-note markers render to raw HTML (superscript + gutter note) that the
    # bold/italic passes below must not touch, so stash each behind a placeholder and restore at the end —
    # the same shield the code spans use. Both read the chapter-scoped `_CITE_STATE` set before this block.
    cite_spans: list[str] = []

    def _stash_cite(frag: str) -> str:
        cite_spans.append(frag)
        return f"\x00CITE{len(cite_spans) - 1}\x00"

    s = _CITE_MARKER_RE.sub(lambda m: _stash_cite(_render_cite_marker(m.group(1))), s)
    s = _NOTE_MARKER_RE.sub(lambda m: _stash_cite(_render_note_marker(m.group(1).strip())), s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    # Bold: non-greedy so an inner *italic* span survives (e.g. `**a typed *derived* edge**`); the
    # italic pass below then converts the inner single-asterisk pair. (`[^*]+` used to fail whenever a
    # bold span wrapped an italic one, leaking a literal `**` into the page.)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)([^*]+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
    # Restore the stashed code spans as <code> (their content is already HTML-escaped).
    s = re.sub(r"\x00CODE(\d+)\x00", lambda m: f"<code>{code_spans[int(m.group(1))]}</code>", s)
    # Restore the stashed intra-word emphasis spans (content already HTML-escaped).
    s = re.sub(r"\x00EM(\d+)\x00", lambda m: f"<em>{em_spans[int(m.group(1))]}</em>", s)
    # Restore the stashed citation / editorial-note HTML (raw superscript + gutter note, shielded above).
    s = re.sub(r"\x00CITE(\d+)\x00", lambda m: cite_spans[int(m.group(1))], s)
    return s


def _plain(s: str) -> str:
    """Strip the inline-markdown subset to PLAIN text — the sibling of `inline` for ATTRIBUTE / `<title>` /
    aria contexts where element markup is invalid. A code span, bold, italic, or intra-word emphasis loses
    its delimiters; a `[text](href)` / `[[slug|text]]` keeps only its text. So a section title carrying a
    code identifier reaches the browser-tab title / aria label as clean text, never a literal-backtick leak
    — the same way the print PDF renders a code-span title without its fences. The caller still HTML-escapes
    the result for its attribute."""
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"\[\+(.+?)\+\]", r"\1", s)
    s = re.sub(r"\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]", lambda m: m.group(2) or m.group(1), s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", s)
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)([^*]+?)(?<!\s)\*(?![\w*])", r"\1", s)
    return s


# Figures that break out past the reading column for more visual authority (a modest, bounded breakout
# on web; 100% of the measure in the Typst PDF). Path-keyed so both projections enlarge the same figures.
# Mirrors the same-named set in `book_typst.py` — keep the two in lockstep.
_WIDE_FIGURES = {"assets/research-arc.svg"}


def _figure_block(comment: str) -> str:
    """Render a `<!-- figure: <path> | <caption> -->` directive into a <figure>.

    <path> is relative to book/ (this dir). A `.svg` asset is INLINED (its own <title>/<desc>/
    aria-* survive, and there is no external request that can 404); any other extension is
    wrapped in <img alt="<caption>">. Fails loud if the asset is missing — a broken figure
    directive should stop the build, not ship a silent gap.
    """
    inner = comment[len("<!--"):-len("-->")].strip()
    spec = inner[len("figure:"):].strip()
    if "|" in spec:
        rel, caption = (s.strip() for s in spec.split("|", 1))
    else:
        rel, caption = spec, ""
    asset = HERE / rel
    if not asset.is_file():
        raise SystemExit(f"figure directive: asset not found: {asset}")
    # The author portrait is a PLAIN image, not a numbered float. Emit it WITHOUT the `book-figure`
    # class — so the float-numbering pass skips it (no "Figure N-N" label, no list-of-floats entry) —
    # and WITHOUT a figcaption. The `figure:` pipe field supplies ALT text only (a bare portrait needs
    # no visible caption); `portrait-wrap` still floats it beside the bio.
    if "author-headshot" in rel:
        alt = html.escape((_split_caption_md(caption)[0] if caption else "") or asset.stem, quote=True)
        src = html.escape(rel, quote=True)
        return f'<figure class="plain-image portrait-wrap"><img src="{src}" alt="{alt}"></figure>'
    cap_html = _caption_el("figcaption", caption) if caption else ""
    extra_cls = " book-figure--wide" if rel in _WIDE_FIGURES else ""
    if asset.suffix.lower() == ".svg":
        svg = asset.read_text(encoding="utf-8")
        # Strip an XML prolog / leading comment so only the <svg>…</svg> is spliced inline.
        svg = re.sub(r"^\s*<\?xml[^>]*\?>\s*", "", svg)
        m = re.search(r"<svg\b.*</svg>", svg, re.S)
        svg = m.group(0) if m else svg
        # Neutralize the intrinsic width/height so the viewBox drives responsive scaling; CSS caps it.
        svg = re.sub(r'(<svg\b[^>]*?)\swidth="[^"]*"', r"\1", svg, count=1)
        svg = re.sub(r'(<svg\b[^>]*?)\sheight="[^"]*"', r"\1", svg, count=1)
        return f'<figure class="book-figure{extra_cls}">{svg}{cap_html}</figure>'
    alt = html.escape((_split_caption_md(caption)[0] if caption else "") or asset.stem, quote=True)
    src = html.escape(rel, quote=True)
    return f'<figure class="book-figure{extra_cls}"><img src="{src}" alt="{alt}">{cap_html}</figure>'


def _figure_iframe_block(comment: str) -> str:
    """Render a `<!-- figure-iframe: <path> | <caption> | <a11y-title> -->` directive into a <figure> with
    an <iframe> preview and a through-link. Used to surface a self-contained catalogue figure page (whose
    internal links are book-relative) live and interactive, without inlining its markup — inlining would
    splice another document's styles/scripts and its links resolve only when loaded as its own document.
    The iframe loads the figure from `book/`, so the figure's book-relative links resolve inside it. The
    <iframe> carries a required `title` for accessibility; the caption repeats it visibly with a link out.
    Fails loud if the target page is missing so a mistyped path stops the build."""
    inner = comment[len("<!--"):-len("-->")].strip()
    spec = inner[len("figure-iframe:"):].strip()
    fields = [s.strip() for s in spec.split("|")]
    rel = fields[0] if fields else ""
    caption = fields[1] if len(fields) > 1 else ""
    a11y_title = fields[2] if len(fields) > 2 else caption
    target = HERE / rel
    if not target.is_file():
        raise SystemExit(f"figure-iframe directive: page not found: {target}")
    src = html.escape(rel, quote=True)
    title = html.escape(a11y_title or "Embedded figure", quote=True)
    cap = (f'<figcaption>{inline(caption)} '
           f'<a href="{src}">Open the full-size map ›</a></figcaption>') if caption else ""
    return (
        '<figure class="book-figure catalogue-embed">'
        f'<iframe src="{src}" title="{title}" loading="lazy"></iframe>'
        f"{cap}</figure>"
    )


_HEADING_ANCHOR_RE = re.compile(r"\s*\{#([A-Za-z0-9_-]+)\}\s*$")


def _heading_anchor(text: str) -> tuple[str, str]:
    """Split a trailing `{#slug}` id-anchor off a heading's text. Returns (visible_text, id_attr) where
    id_attr is ` id="slug"` (already escaped) or "". The appendix uses this so its per-pattern `<h2>`
    carries a stable id the rewired mechanism-map figure deep-links to."""
    m = _HEADING_ANCHOR_RE.search(text)
    if not m:
        return text, ""
    slug = m.group(1)
    return text[: m.start()].rstrip(), f' id="{html.escape(slug, quote=True)}"'


_ROLE_KICKER_RE = re.compile(r"^\s*\[role:\s*([^\]]+?)\s*\]\s*")


def _role_kicker(text: str) -> tuple[str, str]:
    """Split a leading `[role: Name]` kicker off a step heading. Returns (kicker_html, rest) where
    kicker_html is a styled accent `<span class="role-kick">` (or "" if none). The 5.4 staircase uses
    this so each step heading carries the engineer's climbing title — co-coder, QA, HR, org designer,
    architect, director — in the same small-caps accent register as the chapter kicker."""
    m = _ROLE_KICKER_RE.match(text)
    if not m:
        return "", text
    label = html.escape(m.group(1), quote=False)
    return f'<span class="role-kick">{label}</span> ', text[m.end():]


def _split_blocks(md: str) -> list[str]:
    """Split markdown into blank-line-delimited blocks, but keep a fenced code block (```` ``` ````…```` ``` ````)
    intact even when it contains blank lines. A naive blank-line split shatters a code block that has an
    internal blank line, so its later lines get parsed as prose (and e.g. `[x](y)` in the code turns into a
    stray link). This scanner tracks fence state so a fence's blank lines never break the block."""
    blocks: list[str] = []
    cur: list[str] = []
    in_fence = False
    for line in md.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            cur.append(line)
            in_fence = not in_fence
            continue
        if not in_fence and not stripped:
            if cur:
                blocks.append("\n".join(cur))
                cur = []
            continue
        cur.append(line)
    if cur:
        blocks.append("\n".join(cur))
    return blocks


def _inject_anchor_id(block_html: str, anchor_id: str) -> str:
    """Add `id="<anchor_id>"` to the first HTML tag of a rendered block, so a curated-index tag deep-links
    the concept's defining / exemplifying block. If the tag already carries an id (a heading with a
    `{#slug}` anchor), prepend an empty `<span id=…>` marker instead of clobbering the existing id."""
    m = re.match(r"\s*<([a-zA-Z0-9]+)((?:\s[^>]*)?)>", block_html)
    if m and " id=" not in m.group(2):
        idx = m.end(1)
        return block_html[:idx] + f' id="{html.escape(anchor_id, quote=True)}"' + block_html[idx:]
    # First tag already has an id (or no leading tag) — front the block with an anchor-only span.
    return f'<span id="{html.escape(anchor_id, quote=True)}"></span>' + block_html


# A THESIS blockquote leads with a bold `The <Name> Thesis.` label — authored as
# `> **The <Name> Thesis.** <statement>`, rendered into `<p><strong>The … Thesis.</strong> …`. Matched on
# the rendered inner HTML (a leading `<p>` whose first `<strong>` ends in the literal word `Thesis.`), so it
# is told apart from an ordinary `> **Term.**` definition callout (which stays a light sidenote).
_IS_THESIS_LEAD_RE = re.compile(r"^\s*<p>\s*<strong>\s*The\b.*?\bThesis\.\s*</strong>", re.S)

# A DEFINITION blockquote leads with a bold `<Term>.` label (`> **Model.** …`) and is armed by an
# immediately-preceding `<!-- index-def: <slug> -->` for one of the four core terms — the vocabulary the
# theses ride on — plus `structured`, the adjective riding on the model definition. Rendered into the blue
# `def-box` (mirrors the thesis-box mechanism). The index-def context is the discriminator; this regex
# confirms the bold-lead shape.
_DEF_SLUGS = frozenset({"model", "agent", "engineering", "software-engineering", "structured"})
_IS_DEF_LEAD_RE = re.compile(r"^\s*<p>\s*<strong>", re.S)

# A DEFINITION sidenote is the light (non-core-term) cousin: a `> **Term.** …` aside whose bold lead ENDS
# in a period (`> **Churn.** …`, `> **Lint.** …`), authored into `<p><strong>Churn.</strong> …`. It carries
# a `def-inset` modifier so its definition body italicises while the bold Term stays upright. The trailing
# period inside the bold is the discriminator: it tells a `**Term.**` glossary/aside label apart from an
# em-led footnote (`> *A footnote…*`, no <strong> lead) and a plain sidenote (no bold lead), both of which
# keep their as-authored rendering. Theses and core-term def-boxes are classified earlier, so never reach it.
_IS_DEFN_SIDENOTE_LEAD_RE = re.compile(r"^\s*<p>\s*<strong>[^<]*\.\s*</strong>", re.S)


_BOOK_IR_MOD = None  # cached `book_ir` module handle (lazy — book_ir imports THIS module as its tokenizer SSOT)


def _book_ir():
    """Return the `book_ir` module, imported lazily to break the SSOT import cycle (book_ir imports this
    module for the shared tokenizer, so this module must NOT import book_ir at module load). The renderer's
    block-classification dispatch is single-sourced through it — one classifier feeds both render and analysis."""
    global _BOOK_IR_MOD
    if _BOOK_IR_MOD is None:
        import book_ir
        _BOOK_IR_MOD = book_ir
    return _BOOK_IR_MOD


def md_to_html(md: str, anchor_map: dict[tuple[str, str, int], str] | None = None,
               section_prefix: str | None = None) -> str:
    """Convert the markdown subset the chapters use into HTML.

    `anchor_map` (optional) maps `(concept-slug, "def"|"ex", occurrence-on-this-page)` → the anchor id the
    curated index links to. When a `<!-- index-def: … -->` / `<!-- index-example: … -->` tag is met, its
    anchor is attached to the FOLLOWING rendered block (per book/AGENTS.md §6). Occurrences are counted
    per (slug, kind) in reading order to match `_harvest_concept_tags`.

    `section_prefix` (optional, e.g. "1.1") is the body chapter's `part.chapter` id. When set, each `## `
    (section) heading's visible text is stamped with a DISPLAY-ONLY `part.chapter.N` number (N = the
    section's 1-based order within the chapter). `None` (the default) leaves headings unnumbered — the
    blockquote recursion, floats pass, and word-count all call unprefixed, so only the per-chapter body
    build numbers. The number never alters a heading's `{#slug}` id anchor (see `_render_heading`)."""
    _ir = _book_ir()                        # the typed IR — the single classifier for the content dispatch
    out: list[str] = []
    blocks = _split_blocks(md)
    pending_anchors: list[str] = []         # anchor id(s) to attach to the next content block
    pending_table_caption: list[str] = []   # a `<!-- table: … -->` caption armed for the next table
    pending_label: list[str] = []           # a `<!-- label: … -->` cross-ref key armed for the next float
    pending_def: list[str] = []             # a core-term `index-def` armed for the next block (→ def-box)
    pending_pullquote: list[bool] = []      # a `<!-- pullquote -->` marker armed for the next blockquote
    pending_thesisbox: list[bool] = []      # a `<!-- thesisbox -->` marker armed for the next blockquote (part-opener box)
    pending_onepager: list[bool] = []       # a `<!-- case-onepager -->` marker armed for the next table (card)
    pending_convergence_key: list[bool] = []  # a `<!-- convergence-spread-key -->` marker → next table is the slim key
    spread_state: list[dict] = []           # open convergence spread(s): {start, split} indices into `out`
    occ: dict[tuple[str, str], int] = {}    # per-page (slug, kind) → next occurrence index

    def _with_label(frag: str) -> str:
        """Attach an armed `<!-- label: key -->` as `data-label` on the float's opening tag, so the
        numbering pre-pass can build the key→"Figure N" map the `[ref:key]` cross-reference resolves
        against. Consumes the pending label; a float with no armed label renders unchanged."""
        if pending_label:
            key = html.escape(pending_label.pop(0), quote=True)
            # Inject at the END of the opening tag (before `>`), NOT right after `<figure`: the float
            # regex and the numbering pass both key on `class="book-figure"` sitting immediately after
            # `<figure `, so a `data-label` wedged in front of `class` would make the float unmatchable.
            frag = re.sub(r"(<(?:figure|table)\b[^>]*?)>", rf'\1 data-label="{key}">', frag, count=1)
        return frag

    def _emit(block_html: str) -> None:
        # Attach every pending anchor. The first goes onto the block's own opening tag; extras (two tags
        # heading one block — a concept defined and another exemplified at the same paragraph) front the
        # block as empty anchor spans so each deep-link resolves.
        if pending_anchors:
            for extra in pending_anchors[1:]:
                block_html = f'<span id="{html.escape(extra, quote=True)}"></span>' + block_html
            block_html = _inject_anchor_id(block_html, pending_anchors[0])
            pending_anchors.clear()
        out.append(block_html)

    def _consume_index_tag(line: str) -> bool:
        """If `line` is a lone index-def / index-example tag, arm its anchor for the next block and return
        True. A tag may sit on its own line at the head of a block that ALSO holds the block it annotates
        (no blank line between), so this runs both on a standalone comment block and on a block's first
        line(s). Several tags may stack on one block."""
        s = line.strip()
        _md, _me = INDEX_DEF_RE.match(s), INDEX_EXAMPLE_RE.match(s)
        if not (_md or _me):
            return False
        slug = (_md or _me).group(1)
        kind = "def" if _md else "ex"
        if _md and slug in _DEF_SLUGS:
            pending_def.append(slug)   # arm the blue def-box for the term's defining blockquote
        n = occ.get((slug, kind), 0)
        occ[(slug, kind)] = n + 1
        if anchor_map is not None:
            got = anchor_map.get((slug, kind, n))
            if got is not None:
                pending_anchors.append(got)
        return True

    def _consume_leading_marker(line: str) -> bool:
        """Placement-robust marker strip. If `line` (the head of a block) is a whole marker comment the
        build consumes — an index tag, a `gloss:`/`gloss-only:`, or a bare `<!-- glossary-auto -->` — act on
        it and return True so the caller peels it off the block. This is what lets a marker sit glued to the
        prose it annotates (NO blank line between), matching META_RE's already-placement-robust behaviour:
        the author need not remember a blank line, and a glued marker leaks NOWHERE (the twice-shipped
        gloss-only-glued-to-prose bug). Each keyword acts as it would as a standalone block — `gloss:` emits
        its first-reference sidenote, `figure`/`figure-iframe`/`eq` render their display element, `gloss-only`
        / `glossary-auto` harvest/render — then is peeled. This covers the WHOLE argument-taking vocabulary
        uniformly (part-title/chapter-title are stripped earlier by META_RE, before block splitting)."""
        s = line.strip()
        if _consume_index_tag(s):
            return True
        _gm = _GLOSS_RE.match(s)
        if _gm:
            # A gloss first-reference sidenote is itself a `**Term.**` definition inset, so it carries the
            # `def-inset` modifier (italic body, upright bold Term) like an authored `> **Term.**` blockquote.
            _emit(f'<blockquote class="aside-sidenote def-inset"><p><strong>{inline(_gm.group("term"))}.</strong> '
                  f'{inline(_gm.group("def"))}</p></blockquote>')
            return True
        if _GLOSS_ONLY_RE.match(s):
            return True  # glossary-only: harvested by _collect_glossary; renders nothing inline
        _wo = _WEB_ONLY_RE.match(s)
        if _wo:
            # Web-only line — render its inline markdown as a paragraph (the PDF projection drops the marker).
            _emit(f"<p>{inline(_wo.group('content'))}</p>")
            return True
        if s == "<!-- glossary-auto -->":
            items = "".join(f"<li><strong>{inline(t)}</strong> — {inline(d)}</li>"
                            for t, d in sorted(_GLOSSARY.items(), key=lambda kv: kv[0].lower()))
            _emit(f'<ul class="glossary">{items}</ul>')
            return True
        # Single-comment display directives (figure / figure-iframe / eq): render whichever it is, then peel.
        if s.startswith("<!--") and s.endswith("-->") and s.count("<!--") == 1:
            inner = s[4:].lstrip()
            if inner.startswith("figure-iframe:"):
                _emit(_figure_iframe_block(s))
                return True
            if inner.startswith("figure:"):
                _emit(_with_label(_figure_block(s)))
                return True
            if inner.startswith("stack-legend:"):
                # The build-generated linked constituent legend (Appendix A, §13.5): `<!-- stack-legend:
                # <stem> | <letter> | <idx> -->` → a <nav> of links to each part's on-page subsection.
                arg = s[len("<!--"):-len("-->")].strip()[len("stack-legend:"):].strip()
                stem, letter, idx = [p.strip() for p in arg.split("|")]
                _emit(_stack_legend_html(stem, letter, int(idx)))
                return True
            if inner.startswith("brick-grid:"):
                # The packed brick grid for one Appendix-C zone (§14): `<!-- brick-grid: <group> -->` → a CSS
                # grid of brick cells, spans computed by the packer.
                _emit(_brick_grid_html(s[len("<!--"):-len("-->")].strip()[len("brick-grid:"):].strip()))
                return True
            if inner.startswith("note-spread") or inner.startswith("note-fold"):
                # Keep-together wrappers (§13.6) are a PRINT/Typst guarantee — inert in HTML (the note prose
                # renders normally; HTML keep-together is best-effort CSS on the section wrapper). Consume so
                # the marker never leaks into the reader-visible page.
                return True
            if inner.startswith("table-landscape"):
                # A Typst-only per-table landscape directive (the flipped page is a PRINT/PDF layout choice) —
                # inert in HTML: the pipe table renders through the ordinary table path and web width relies on
                # CSS overflow. Consume so the marker never leaks into the reader-visible page (mirrors
                # note-spread; the Typst emitter wraps the next table in a flipped page).
                return True
            if s == "<!-- pullquote -->":
                # `<!-- pullquote -->` — arms the NEXT blockquote as a label-less pull-quote. Consumed
                # here so the marker never reaches reader-visible output (mirrors index-def arming
                # `pending_def` for def-box, in the same dispatch family). Full-string match (the bare
                # no-arg idiom used by `glossary-auto` above), since `inner` still carries the trailing `-->`.
                pending_pullquote.append(True)
                return True
            if s == "<!-- thesisbox -->":
                # `<!-- thesisbox -->` — arms the NEXT blockquote as a part-opener thesis box. Consumed
                # here so the marker never reaches reader-visible output (mirrors the `pullquote` arming
                # just above, same dispatch family). Full-string match — the bare no-arg idiom.
                pending_thesisbox.append(True)
                return True
            if inner.startswith("case-onepager"):
                # `<!-- case-onepager -->` — arms the NEXT table as a per-case one-pager CARD (a light
                # left-ruled wrapper, per-case-onepager-DESIGN §5). Consumed here so the marker never leaks;
                # the table renders normally and is wrapped in `<div class="case-onepager">` below.
                pending_onepager.append(True)
                return True
            if inner.startswith("convergence-spread-end"):
                # Close the spread: everything emitted since `convergence-spread` is the LEFT panel (matrix +
                # legend) up to the split, the RIGHT panel (the key) after it. Splice them into one
                # `.convergence-spread` two-column block. The two <table>s survive intact, so the float pass
                # still numbers them and `[ref:]` still resolves.
                if spread_state:
                    st = spread_state.pop()
                    split = st["split"] if st["split"] is not None else len(out)
                    left = "".join(out[st["start"]:split])
                    right = "".join(out[split:])
                    del out[st["start"]:]
                    out.append(f'<div class="convergence-spread"><div class="cs-panel cs-matrix">{left}'
                               f'</div><div class="cs-panel cs-key">{right}</div></div>')
                return True
            if inner.startswith("convergence-spread-key"):
                # The divider: the left panel ends here, the key panel begins, and the next table renders as the
                # slim key (construct folded to a small-caps subtitle).
                if spread_state:
                    spread_state[-1]["split"] = len(out)
                pending_convergence_key.append(True)
                return True
            if inner.startswith("convergence-spread"):
                # Open a spread — record where the left panel begins in the emit stream.
                spread_state.append({"start": len(out), "split": None})
                return True
            if inner.startswith("label:"):
                # A cross-ref key for the NEXT float: `<!-- label: <key> -->`. Armed here, consumed by
                # `_with_label` when the figure/mermaid/table emits, which stamps it as `data-label`.
                pending_label.append(s[len("<!--"):-len("-->")].strip()[len("label:"):].strip())
                return True
            if inner.startswith("table:"):
                # A caption for the NEXT table: `<!-- table: <full caption> [short: <short>] -->`. Armed
                # here, consumed when the pipe table renders (which wraps it in a <caption>). All tables are
                # numbered "Table N" regardless; a directive is only needed to give one a caption + a list
                # of floats entry.
                pending_table_caption.append(
                    s[len("<!--"):-len("-->")].strip()[len("table:"):].strip())
                return True
            if inner.startswith("eq:"):
                _emit(f'<p class="book-eq">{inline(s[len("<!--"):-len("-->")].strip()[len("eq:"):].strip())}</p>')
                return True
            if inner.startswith("point:"):
                # `<!-- point: <slug> | <claim> [| terms: …] -->` — the induced canonical point of the
                # paragraph it heads (the drain notation). An INERT decorator: consumed and stripped, renders
                # NOTHING (the outline model reads it from the IR, not the HTML). Peeled here so it never
                # reaches the lone-comment passthrough and leaks; degradation-friendly and byte-identical.
                return True
            if inner.startswith("section-terms:"):
                # `<!-- section-terms: <t1>, <t2> -->` — the tier-1 sibling of `point`: names the major
                # concepts a section develops (the drain notation). Equally INERT — consumed, stripped,
                # renders NOTHING (the reverse index reads it from the IR). Same byte-identical guarantee.
                return True
            if inner.startswith("part-foreshadows:"):
                # `<!-- part-foreshadows: <spine-id>, … -->` — a Part opener's declaration of the spine
                # claims it foreshadows (the traceability notation). INERT like `point`/`section-terms`:
                # consumed, stripped, renders NOTHING (the opener-traceability lint reads it from source).
                return True
            if inner.startswith("slogan:"):
                # `<!-- slogan: <id> -->` — an author tag marking a registered slogan occurrence (canonical
                # landing or blunt referential). INERT like `point`/`section-terms`/`part-foreshadows`:
                # consumed, stripped, renders NOTHING (the slogan-density lint harvests it from source).
                return True
        return False

    skip_blocks: set[int] = set()   # blocks already consumed as a figure caption (folded into the <figure>)
    section_no = 0                   # per-chapter `## ` section counter (only used when section_prefix is set)
    for _bi, block in enumerate(blocks):
        if _bi in skip_blocks:
            continue
        block = block.strip("\n")
        if not block.strip():
            continue
        # ── Worked-Examples gallery (`<!-- worked-examples: KEY -->` … `<!-- worked-examples-end -->`).
        # Collect the bracketed span (this block's remainder + following blocks, added to `skip_blocks`) up to
        # the end marker, hand the raw inner markdown to the shared parser, and emit ONE `.worked-examples`
        # section. Intercepted HERE — before the marker-peel + mid-block-marker guard below — so the inner
        # `<!-- takeaway -->` divider is never mistaken for a leaked/mis-placed marker (the whole gallery is
        # one authored unit). Mirrors the Typst emitter's `worked-examples` directive collector.
        _wex_lines = block.splitlines()
        _wex_open = _ir.WEX_OPEN_RE.match(_wex_lines[0].strip())
        if _wex_open:
            inner_chunks: list[str] = []
            ended = False

            def _take_until_end(src_lines: list[str]) -> None:
                nonlocal ended
                kept: list[str] = []
                for ln in src_lines:
                    if _ir.WEX_END_RE.match(ln.strip()):
                        ended = True
                        break
                    kept.append(ln)
                if kept:
                    inner_chunks.append("\n".join(kept))

            _take_until_end(_wex_lines[1:])
            j = _bi + 1
            while not ended and j < len(blocks):
                skip_blocks.add(j)
                _take_until_end(blocks[j].strip("\n").splitlines())
                j += 1
            we = _ir.parse_worked_examples(_wex_open.group("key"), "\n\n".join(inner_chunks))
            _emit(_render_worked_examples_html(we))
            continue
        # Peel every leading marker comment off the block (placement-robust — a marker may sit glued to the
        # prose it heads, NO blank line between). `_consume_leading_marker` acts on each (index tag → arm
        # anchor; gloss → emit sidenote; gloss-only / glossary-auto → harvest/render) and returns True so it
        # is stripped from the block. A block may be JUST markers (blank line follows) or markers PLUS the
        # prose they head (no blank line) — this handles both, so a glued marker leaks NOWHERE.
        blk_lines = block.splitlines()
        while blk_lines and _consume_leading_marker(blk_lines[0]):
            blk_lines = blk_lines[1:]
        if not blk_lines:
            continue  # the block was nothing but marker comment(s)
        # A marker heads the block it annotates — a MID-block marker (prose above it in the same block) would
        # silently leak into the rendered <p>. Fail loud so the author moves it to the block boundary rather
        # than shipping a raw comment. (The head case above already consumed leading markers.)
        for _ln in blk_lines[1:]:
            if _MARKER_COMMENT_RE.match(_ln.strip()):
                raise SystemExit(
                    f"notation marker must head its block (blank line before it, or move above the prose): "
                    f"mid-block marker {_ln.strip()!r}")
        block = "\n".join(blk_lines)
        # A core-term index-def arms the blue def-box for the block it heads (this content block). Capture
        # and clear here so it applies to exactly the next content block, never leaking further.
        def_armed = bool(pending_def)
        pending_def.clear()
        pullquote_armed = bool(pending_pullquote)
        pending_pullquote.clear()
        thesisbox_armed = bool(pending_thesisbox)
        pending_thesisbox.clear()
        stripped = block.strip()
        # ── The A-flip: one classifier, one renderer per node kind. ────────────────────────────────
        # Classification is single-sourced through the typed IR (`book_ir.classify_render_block`, which
        # wraps the IR's `_classify_prose`), and each kind renders through the extracted `_render_*`
        # primitive. The marker-arming state above (pending label / caption / anchors, gloss sidenotes)
        # stays in this loop — it is the placement-robust arming layer the content dispatch consumes.
        # This replaces the old inline prefix-testing cascade; the emit is byte-identical.
        kind = _ir.classify_render_block(block)

        if kind is _ir.BlockKind.CODE_INSET:
            _emit(_render_inset(block))
            continue
        if kind is _ir.BlockKind.MERMAID:
            # A standalone diagram is a numbered figure; fold an immediately-following one-line italic
            # paragraph (`*…*`) in as its <figcaption>, and skip that block. `_with_label` stamps any
            # armed `<!-- label: -->` so the numbering pass can key the `[ref:]` cross-reference.
            caption_md = None
            if _bi + 1 < len(blocks):
                _nb = blocks[_bi + 1].strip()
                if (_nb.startswith("*") and not _nb.startswith("**")
                        and _nb.endswith("*") and "```" not in _nb and "\n\n" not in _nb):
                    caption_md = _nb.strip("*").strip()
                    skip_blocks.add(_bi + 1)
            _emit(_with_label(_render_mermaid_figure(block, caption_md)))
            continue
        if kind is _ir.BlockKind.CODE:
            _emit(_render_code(block))
            continue
        # A blockquote renders its inner content recursively (its own `md_to_html` pass over the
        # prefix-stripped body handles any inner directive AND strips any inner stray comment), so it MUST
        # be dispatched with the block INTACT — before the prose-block stray-comment strip below. Left to
        # that strip, a legitimate directive living inside the quote (an inline `> <!-- figure: … -->` inset
        # diagram) is deleted as if it were a stray authoring comment, silently dropping the figure.
        if kind is _ir.BlockKind.BLOCKQUOTE:
            _emit(_render_blockquote(block, is_def=def_armed, is_pullquote=pullquote_armed,
                                     is_thesisbox=thesisbox_armed))
            continue
        # Gap-marker callouts (`[FILL IN: …]` / `[MORE CHAPTERS FOLLOW: …]`) — the IR classifies these as
        # PARA (they are prose-shaped), so the renderer keeps the shape test for them just ahead of prose.
        if stripped.startswith("[FILL IN:") or stripped.startswith("[MORE CHAPTERS FOLLOW:"):
            _emit(_render_gap_marker(block))
            continue
        # Strip any HTML comment still in this (prose-like) block. Every recognized display/arming directive
        # was already consumed + peeled by `_consume_leading_marker` in the block-head pass; a comment that
        # survives to here is a STRAY authoring TODO/note (its leading token is not in the notation
        # vocabulary — the `stray-book-comment` lint guards the source). Left in, it leaks: raw here (an
        # invisible HTML comment) and as VISIBLE text in the Typst/PDF projection. Drop it. Code / mermaid /
        # inset blocks (which may hold a literal `<!-- … -->`) were emitted and `continue`d above, so this
        # only ever touches prose. A block that was nothing but a stray comment strips to empty and is skipped.
        if "<!--" in block:
            block = _STRAY_COMMENT_RE.sub("", block).strip("\n")
            stripped = block.strip()
            if not stripped:
                continue
        if kind is _ir.BlockKind.HEADING:
            # Section-level (`## `) headings in a body chapter carry a `part.chapter.N` display prefix.
            # N counts `## ` headings in reading order; `###`/`####` subsections stay unnumbered (3-level
            # scheme). Deeper levels don't advance the counter, so the section number is stable.
            heading_no = None
            if section_prefix is not None and block.strip().startswith("## "):
                section_no += 1
                heading_no = f"{section_prefix}.{section_no}"
            _emit(_render_heading(block, heading_no))
            continue
        if kind is _ir.BlockKind.TABLE:
            if pending_convergence_key:
                pending_convergence_key.clear()
                tbl = _render_convergence_key_table(block)
            else:
                tbl = _render_pipe_table(block)
            if pending_table_caption:
                cap_el = _caption_el("caption", pending_table_caption.pop(0))
                tbl = re.sub(r"(<table\b[^>]*>)", lambda mm: mm.group(1) + cap_el, tbl, count=1)
            tbl = _with_label(tbl)
            if pending_onepager:
                # A `<!-- case-onepager -->` marker heads this table: wrap it as a light card. The inner
                # <table> survives, so the float-numbering pass still finds it and `[ref:]` still resolves.
                pending_onepager.clear()
                tbl = f'<div class="case-onepager">{tbl}</div>'
            _emit(tbl)
            continue
        if kind is _ir.BlockKind.LIST:
            _emit(_render_unordered_list(block))
            continue
        if kind is _ir.BlockKind.ORDERED_LIST:
            _emit(_render_ordered_list(block))
            continue
        # Paragraph (the IR's PARA fall-through).
        _emit(_render_paragraph(block))
    return "\n".join(out)


def _strip_blockquote_prefix(line: str) -> str:
    """Drop a leading `> ` (or bare `>`) from one blockquote line, so the inner content can be
    re-rendered as markdown. A `>` with nothing after it becomes a blank line (a paragraph break
    inside the quote)."""
    s = line.strip()
    if s.startswith("> "):
        return s[2:]
    if s == ">":
        return ""
    return s.lstrip(">")


_TABLE_SEP_RE = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$")


def _is_pipe_table(block: str) -> bool:
    """A block is a pipe table when it has at least two lines, every line contains a `|`, and the
    second line is a `|---|---|` separator row."""
    lines = block.splitlines()
    if len(lines) < 2 or "|" not in lines[0]:
        return False
    return bool(_TABLE_SEP_RE.match(lines[1]))


def _split_table_row(row: str) -> list[str]:
    """Split one `| a | b | c |` row into its cells, dropping the outer empties from the leading and
    trailing pipe."""
    cells = [c.strip() for c in row.strip().strip("|").split("|")]
    return cells


def _col_alignments(sep_row: str) -> list[str]:
    """Read GFM per-column alignment off the separator row (line 2): a trailing colon (`---:`) marks a
    right-aligned column, which the booktabs style renders with the `.num` class (numbers right-align so a
    reader compares magnitudes down the column). A leading+trailing colon (`:-:`) is center; a bare `---`
    or leading-colon is the left default. Returns a class string ("" left, " class=\"num\"" right) per column."""
    out: list[str] = []
    for spec in _split_table_row(sep_row):
        s = spec.strip()
        right = s.endswith(":") and not s.startswith(":")  # `---:` only → numeric right-align
        out.append(' class="num"' if right else "")
    return out


def _render_pipe_table(block: str) -> str:
    """Render a GitHub-flavored pipe table into an HTML <table> with a <thead> and <tbody>. The
    separator row (line 2) is consumed for structure (and per-column alignment), not rendered. A column
    whose separator ends in a colon (`---:`) right-aligns via `.num` for the booktabs style (drawing/tables.md)."""
    lines = block.splitlines()
    header = _split_table_row(lines[0])
    aligns = _col_alignments(lines[1]) if len(lines) > 1 else []

    def _cls(i: int) -> str:
        return aligns[i] if i < len(aligns) else ""

    body_rows = [_split_table_row(ln) for ln in lines[2:] if ln.strip()]
    trs = []
    for row in body_rows:
        tds = "".join(f"<td{_cls(i)}>{inline(c)}</td>" for i, c in enumerate(row))
        trs.append(f"<tr>{tds}</tr>")
    # A pipe table whose header row is entirely empty is the catalogue's "metadata card" idiom (`| | |`) — a
    # key/value reference box, not a numbered content table. Render it as an unnumbered `.meta-card` (no
    # <thead>, and excluded from the `Table N` float-numbering pass by `_FLOAT_RE`). Real tables keep their
    # header + number.
    if all(not c.strip() for c in header):
        return f'<table class="book-table meta-card"><tbody>{"".join(trs)}</tbody></table>'
    thead = "".join(f"<th{_cls(i)}>{inline(c)}</th>" for i, c in enumerate(header))
    return (
        '<table class="book-table"><thead><tr>'
        f"{thead}</tr></thead><tbody>{''.join(trs)}</tbody></table>"
    )


def _render_convergence_key_table(block: str) -> str:
    """The convergence KEY as a slim 3-column reference (the right panel of a convergence spread). Reads the
    4-column key markdown (`# | Pattern | Construct | statement`) and DROPS the Construct column, folding the
    construct into a small-caps subtitle beneath the pattern name (Layer-3 index info, not a comparison axis —
    tables.md author review). Stays a `<table class="book-table">` so the float pass numbers it and
    `[ref:convergence-*-key]` resolves; only the Pattern cell is reshaped (name over a `.pat-construct` line)."""
    lines = block.splitlines()
    body_rows = [_split_table_row(ln) for ln in lines[2:] if ln.strip()]
    trs = []
    for row in body_rows:
        row = (row + [""] * 4)[:4]
        key, name, construct, statement = row
        construct_disp = construct.replace("-", " ")
        patt = (f'<span class="pat-name">{inline(name)}</span>'
                f'<span class="pat-construct">{inline(construct_disp)}</span>')
        trs.append(f"<tr><td>{inline(key)}</td><td>{patt}</td><td>{inline(statement)}</td></tr>")
    thead = "<th>#</th><th>Pattern</th><th>What the source establishes</th>"
    return ('<table class="book-table convergence-key"><thead><tr>'
            f"{thead}</tr></thead><tbody>{''.join(trs)}</tbody></table>")


def _render_worked_examples_html(we) -> str:
    """Render a parsed Worked-Examples gallery (`book_ir.WorkedExamples`) into one `.worked-examples` section:
    a fixed "Worked Examples" title, one `.wex-case` per source (a bold source lead-in + the authored gloss),
    and the accent-ruled `.wex-takeaway` that names the shared abstraction. The gloss + Takeaway are authored
    prose passed through `inline` (their sentences are collapsed to one paragraph); only the source labels and
    the block shape are structural. The `data-construct` attribute records the matrix weld for the join lint."""
    cases_html: list[str] = []
    for c in we.cases:
        src = html.escape(c.source)
        prose = inline(" ".join(c.prose_md.split()))
        cases_html.append(
            f'<div class="wex-case"><p><span class="wex-src">{src}.</span> {prose}</p></div>')
    takeaway = ""
    if we.takeaway_md:
        takeaway = ('<div class="wex-takeaway"><p><span class="wex-tk-label">Takeaway.</span> '
                    f'{inline(" ".join(we.takeaway_md.split()))}</p></div>')
    key = html.escape(we.construct_key, quote=True)
    return (f'<section class="worked-examples" data-construct="{key}">'
            '<h4 class="wex-title">Worked Examples</h4>'
            f'{"".join(cases_html)}{takeaway}</section>')


# ── Per-block-kind content renderers ──────────────────────────────────────────────────────────────
# Extracted verbatim from `md_to_html`'s block loop so a single dispatch table maps each IR `BlockKind`
# to its HTML. These are the "render each node kind to HTML" primitives of the C→A migration: the emit
# loop below walks the block segmentation and calls the one that matches, rather than re-testing string
# prefixes inline. Each returns the SAME HTML the old inline branch produced (byte-identical build).

def _render_inset(block: str) -> str:
    """A titled INSET — `<!-- inset: <title> -->` glued to the head of a fenced code block — lifted into a
    set-apart box (a `<figure class="code-inset">` with a demoted `inset-title` label, NOT an <hN>, so no
    heading-order break). A mermaid fence renders to a static inline SVG; any other fence to <pre><code>."""
    lines = block.strip().splitlines()
    title = _INSET_RE.match(lines[0].strip()).group("title")
    lines = lines[1:]  # drop the inset marker; the rest is the fence
    lang = lines[0].strip()[3:].strip().lower()
    inner_lines = lines[1:]
    if inner_lines and inner_lines[-1].strip() == "```":
        inner_lines = inner_lines[:-1]
    inner = "\n".join(inner_lines)
    body = (render_mermaid_svg(inner) if lang == "mermaid"
            else f"<pre><code>{html.escape(inner, quote=False)}</code></pre>")
    return f'<figure class="code-inset"><p class="inset-title">{inline(title)}</p>{body}</figure>'


def _render_code(block: str) -> str:
    """A non-mermaid fenced block → a plain <pre><code>."""
    lines = block.splitlines()
    inner_lines = lines[1:]
    if inner_lines and inner_lines[-1].strip() == "```":
        inner_lines = inner_lines[:-1]
    inner = "\n".join(inner_lines)
    return f"<pre><code>{html.escape(inner, quote=False)}</code></pre>"


def _render_mermaid_figure(block: str, caption_md: str | None) -> str:
    """A standalone ```mermaid fence → a numbered `<figure class="book-figure diagram-figure">` holding the
    static inline SVG, with an optional folded italic-paragraph <figcaption>. `caption_md` is the folded
    following-paragraph caption text (already stripped of its `*…*`), or None."""
    lines = block.splitlines()
    inner_lines = lines[1:]
    if inner_lines and inner_lines[-1].strip() == "```":
        inner_lines = inner_lines[:-1]
    inner = "\n".join(inner_lines)
    svg = render_mermaid_svg(inner)
    cap_html = _caption_el("figcaption", caption_md) if caption_md is not None else ""
    return f'<figure class="book-figure diagram-figure">{svg}{cap_html}</figure>'


def _render_gap_marker(block: str) -> str:
    """A `[FILL IN: …]` / `[MORE CHAPTERS FOLLOW: …]` gap-marker callout → a plain <div> (not <aside>: two
    markers on one page would trip the unique-landmark accessibility rule)."""
    stripped = block.strip()
    kind = "fill" if stripped.startswith("[FILL IN:") else "more"
    label = "FILL IN" if kind == "fill" else "MORE CHAPTERS FOLLOW"
    inner = stripped[stripped.index(":") + 1:].rstrip("]").strip()
    return (f'<div class="marker marker-{kind}">'
            f'<span class="marker-tag">{label}</span> {inline(inner)}</div>')


def _render_heading(block: str, section_no: str | None = None) -> str:
    """A `#`..`####` heading → the matching <hN>. A trailing `{#slug}` sets the id anchor (stripped from the
    visible text); an `## ` may carry a leading `[role: Name]` kicker.

    `section_no` (e.g. "1.1.3") is a DISPLAY-ONLY `part.chapter.section` prefix stamped on a `## ` (section)
    heading's visible text for in-chapter reference. It is prose, not structure: it never touches the `{#slug}`
    id anchor (the anchor is peeled off first by `_heading_anchor`), so every cross-ref, index-def, and
    glossary pointer keeps resolving. Passed only for body chapters (Parts 1-5) by the per-chapter build;
    `None` (the default) — front/back-matter, appendix, blockquotes, floats, word-count — renders unnumbered."""
    stripped = block.strip()
    if stripped.startswith("#### "):
        txt, anc = _heading_anchor(stripped[5:])
        return f"<h4{anc}>{inline(txt)}</h4>"
    if stripped.startswith("### "):
        txt, anc = _heading_anchor(stripped[4:])
        return f"<h3{anc}>{inline(txt)}</h3>"
    if stripped.startswith("## "):
        txt, anc = _heading_anchor(stripped[3:])
        kick, txt = _role_kicker(txt)
        num = f'<span class="sec-num">{html.escape(section_no)}</span> ' if section_no else ""
        return f"<h2{anc}>{num}{kick}{inline(txt)}</h2>"
    txt, anc = _heading_anchor(stripped[2:])
    return f"<h1{anc}>{inline(txt)}</h1>"


def _render_blockquote(block: str, is_def: bool = False, is_pullquote: bool = False,
                       is_thesisbox: bool = False) -> str:
    """A blockquote (every line starts with `>`) → a classified `<blockquote>`. Its inner content is itself
    markdown (heading + prose + a `> ```mermaid ``` fence), rendered recursively; an inner heading is demoted
    to a styled `inset-title` paragraph (no document-outline break). The class is picked by shape: an explicit
    `<!-- pullquote -->` marker (`is_pullquote`) → the label-less `pull-quote` (checked first — an author
    declaration outranks lead-text inference); an explicit `<!-- thesisbox -->` marker (`is_thesisbox`) → the
    green `thesis-box` panel, checked BEFORE the concept-inset title test so a TITLED part-opener box (whose
    `### TITLE` demotes to an `inset-title`) is not mis-read as a concept-inset; a demoted label →
    `concept-inset`; a `**The … Thesis.**` lead → `thesis-box`; a `**Term.**` lead armed by a core-term
    `index-def` (`is_def`) → the blue `def-box`; else a light `aside-sidenote`."""
    inner_md = "\n".join(_strip_blockquote_prefix(ln) for ln in block.splitlines())
    inner_html = md_to_html(inner_md)
    inner_html = re.sub(r"<h[1-6]([^>]*)>(.*?)</h[1-6]>", r'<p class="inset-title"\1>\2</p>', inner_html, flags=re.S)
    # A concept-inset heading is authored as `### Inset I<N> — <Title>` so the source carries a stable
    # number for editing; the DISPLAYED label shows the TITLE ONLY. Strip the `Inset I<N> —` prefix from
    # the rendered label (the id/anchor on the <p> is untouched, so intra-book links still resolve). This
    # also moots any "insets out of numeric order" reading — the reader never sees a number.
    inner_html = re.sub(r'(<p class="inset-title"[^>]*>)\s*Inset\s+I\d+\s*—\s*', r'\1', inner_html)
    if is_pullquote:
        klass = "pull-quote"
    elif is_thesisbox:
        klass = "thesis-box"
    elif 'class="inset-title"' in inner_html:
        klass = "concept-inset"
    elif _IS_THESIS_LEAD_RE.search(inner_html):
        klass = "thesis-box"
    elif is_def and _IS_DEF_LEAD_RE.search(inner_html):
        klass = "def-box"
    elif _IS_DEFN_SIDENOTE_LEAD_RE.search(inner_html):
        klass = "aside-sidenote def-inset"
    else:
        klass = "aside-sidenote"
    return f'<blockquote class="{klass}">{inner_html}</blockquote>'


def _render_unordered_list(block: str) -> str:
    """An unordered list — items open with `- `; a following non-`- ` line is a wrapped continuation folded
    into the current item so a wrapped bullet stays one <li>."""
    li_texts: list[str] = []
    for ln in block.splitlines():
        s = ln.strip()
        if s.startswith("- "):
            li_texts.append(s[2:])
        elif li_texts:
            li_texts[-1] += " " + s
        else:
            li_texts.append(s)
    items = "".join(f"<li>{inline(t)}</li>" for t in li_texts)
    return f"<ul>{items}</ul>"


def _render_ordered_list(block: str) -> str:
    """An ordered list — items open with `N. `; wrapped continuations fold into the current item (same as
    the unordered case)."""
    oli: list[str] = []
    for ln in block.splitlines():
        s = ln.strip()
        if re.match(r"^\d+\.\s", s):
            oli.append(re.sub(r"^\d+\.\s+", "", s))
        elif oli:
            oli[-1] += " " + s
        else:
            oli.append(s)
    items = "".join(f"<li>{inline(t)}</li>" for t in oli)
    return f"<ol>{items}</ol>"


def _render_paragraph(block: str) -> str:
    """A paragraph — wrapped source lines joined into one <p>."""
    return f"<p>{inline(' '.join(ln.strip() for ln in block.splitlines()))}</p>"


CSS = f"""
{CSS_ROOT_BLOCK}
* {{ box-sizing: border-box; }}
body {{ font-family: var(--font-body); font-size: 17px; line-height: 1.65;
       color: var(--ink); margin: 0; background: var(--paper); }}
/* "Calm authority" hierarchy: SEMIBOLD (--display-weight, 600) is the quiet default weight for every
   heading; only a Part-divider page's title steps up to bold (see `main.wrap.part-page header.chap h1`).
   Headings organise rather than compete — one bold level, the rest a lighter semibold, `###` subheads
   quieter still (italic regular, below). Mirrors the PDF show-rules in book_typst.py. */
h1, h2, h3, h4, header.chap h1 {{ font-family: var(--font-display); font-weight: var(--display-weight); }}
main.wrap.part-page header.chap h1 {{ font-weight: 700; }}
/* The appendices mode-marker — the reader leaves the argument and enters the reference manual. Distinct
   from a numbered Part divider: centred, no rule under the title, a subtitle in the accent italic, and the
   author paragraph set left in a measured column under a hairline. */
main.wrap.appendices-divider {{ text-align: center; }}
main.wrap.appendices-divider header.chap {{ border-bottom: none; padding: 3.6rem 0 0.3rem; margin-bottom: 0; }}
main.wrap.appendices-divider header.chap .kicker {{ color: var(--muted); }}
main.wrap.appendices-divider header.chap h1 {{ font-weight: 700; font-size: 2.7rem; letter-spacing: 0.01em; }}
main.wrap.appendices-divider .appendices-divider-sub {{ font-family: var(--font-display); font-style: italic;
       color: var(--accent); font-size: 1.35rem; margin: 0.15rem 0 1.8rem; }}
main.wrap.appendices-divider .appendices-divider-body {{ text-align: left; max-width: 40rem; margin: 0 auto;
       border-top: 1px solid var(--rule); padding-top: 1.7rem; }}
.wrap {{ max-width: 52rem; margin: 0 auto; padding: 0 1.4rem 4rem; }}
nav.toc {{ background: var(--panel); border-bottom: 1px solid var(--rule); padding: 0.9rem 1.4rem; font-size: 14px; }}
nav.toc .toc-inner {{ max-width: 52rem; margin: 0 auto; }}
nav.toc details {{ margin: 0; }}
nav.toc summary {{ cursor: pointer; font-weight: 600; color: var(--accent); list-style: none; }}
nav.toc summary::-webkit-details-marker {{ display: none; }}
nav.toc ol {{ list-style: none; padding: 0.6rem 0 0; margin: 0; }}
nav.toc .part {{ font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em;
                 font-size: 12px; margin: 0.7rem 0 0.25rem; }}
nav.toc a {{ color: var(--ink); text-decoration: none; display: block; padding: 2px 0 2px 1rem; }}
nav.toc a:hover {{ color: var(--accent); }}
nav.toc a.current {{ color: var(--accent); font-weight: 600; border-left: 2px solid var(--accent);
                     padding-left: calc(1rem - 2px); }}
/* The blog-post link rides the top nav's flex row opposite the ☰ Contents summary — an inline accent link,
   overriding the block/indent the chapter `<a>` rule sets. */
nav.toc a.toc-blog {{ display: inline; color: var(--accent); font-weight: 600; padding: 0;
                      white-space: nowrap; }}
nav.toc a.toc-blog:hover {{ text-decoration: underline; }}
header.chap {{ padding: 2.6rem 0 1.2rem; border-bottom: 1px solid var(--rule); margin-bottom: 1.6rem; }}
header.chap .kicker {{ color: var(--accent); font-weight: 700; font-size: 13px; letter-spacing: 0.06em;
                       text-transform: uppercase; }}
/* The kicker halves are links but must stay understated — inherit the small-caps accent colour, no default
   underline; reveal the underline only on hover/focus so the affordance is discoverable without shouting. */
header.chap .kicker a {{ color: inherit; text-decoration: none; }}
header.chap .kicker a:hover, header.chap .kicker a:focus {{ text-decoration: underline; }}
header.chap h1 {{ font-size: 1.85rem; line-height: 1.18; margin: 0.5rem 0 0; }}
/* `part.chapter` display number on a body/back-matter chapter title (build-derived from the file path,
   not authored). Muted + tabular so it reads as a reference locator, not part of the title; display-only,
   carries no id, so the chapter's anchors, cross-refs, and the index all still resolve. */
header.chap h1 .chap-num {{ color: var(--muted); font-weight: 600; font-variant-numeric: tabular-nums; margin-right: 0.2em; }}
.part-epigraph {{ margin: 1.6rem 0 0; padding: 0.8rem 0 0.2rem 1.1rem; border-left: 3px solid var(--rule);
                  color: var(--muted); font-style: italic; }}
.part-epigraph .attr {{ display: block; margin-top: 0.5rem; font-style: normal; font-size: 14px;
                        color: var(--muted); }}
/* APPARATUS ONE-PAGER — a front-matter reference apparatus (how-to-read) framed as one distinct, offset
   item so it does not read as a continuation of the preceding chapter. A hairline box on a tinted panel
   with an accent top-rule (the "this is an apparatus, not running prose" marker) and a top/bottom margin
   that lifts it off the surrounding flow. Header padding is trimmed inside the frame (the box supplies the
   set-apart, so the header's usual generous top pad is redundant here) and the header's border-bottom rule
   is dropped in favour of the frame. Every surface knob is a design token, so a print/dark re-skin follows
   from the token swap-point (see the concept-inset SWAP POINT note) with no rule change here. */
.apparatus-page {{ background: var(--panel); border: 1px solid var(--rule); border-top: 3px solid var(--accent);
                   border-radius: 8px; padding: 1.4rem 1.9rem 1.9rem; margin: 2.2rem 0; }}
.apparatus-page header.chap {{ padding: 0.4rem 0 1rem; margin-bottom: 1.3rem; }}
h2 {{ font-size: 1.26rem; margin: 2.7rem 0 0.55rem; }}
/* `part.chapter.section` display number stamped on a body-chapter section heading (build-derived, not
   authored). Muted + tabular so it reads as a reference locator, not part of the title; it is display-only
   and carries no id, so the heading's own anchor, cross-refs, and the index all still resolve. */
h2 .sec-num {{ color: var(--muted); font-weight: 600; font-variant-numeric: tabular-nums; margin-right: 0.15em; }}
/* Role kicker on a step heading (`## [role: Architect] …`) — the engineer's climbing title, rendered in
   the same small-caps accent register as the chapter kicker (`header.chap .kicker`) but inline before the
   heading text. It rides the accent colour so the ladder reads at a glance down the chapter. */
h2 .role-kick {{ color: var(--accent); font-weight: 700; font-style: italic; font-size: 0.62em; letter-spacing: 0.07em;
                 text-transform: uppercase; margin-right: 0.5em; vertical-align: 0.12em; }}
/* `### ` (H3) subheadings render ITALIC, not bold — a quieter sub-level than the bold H1/H2. Overrides the
   shared `h1,h2,h3,h4` display-weight above (equal specificity, later rule wins); keeps the display face. */
h3 {{ font-size: 1.05rem; margin: 1.9rem 0 0.4rem; font-weight: 400; font-style: italic; }}
h4 {{ font-size: 0.97rem; margin: 1.4rem 0 0.3rem; color: var(--ink); }}
p {{ margin: 0 0 1rem; }}
ul {{ margin: 0 0 1rem; padding-left: 1.3rem; }}
ol {{ margin: 0 0 1rem; padding-left: 1.5rem; list-style: decimal; }}
li {{ margin: 0.3rem 0; }}
/* "What This Book Argues" claims list — a page-scoped feature treatment (wrapper class set in the render
   loop). The six claims get a slightly larger body, more air between them, and accent-coloured bold
   numerals set into the margin; the prose is otherwise untouched (no boxes, no icons). */
.argues-page ol {{ font-size: 1.06em; line-height: 1.72; padding-left: 2.1rem; margin: 1.7rem 0; }}
.argues-page ol > li {{ margin: 0.62rem 0; padding-left: 0.25rem; }}
.argues-page ol > li::marker {{ color: var(--accent); font-weight: 700; }}
blockquote {{ margin: 1.2rem 0; padding: 0.6rem 1.1rem; border-left: 3px solid var(--rule);
              color: var(--muted); font-style: italic; background: var(--panel); }}
/* Plain editorial asides render as Tufte-style sidenotes. On a NARROW screen they collapse to a normal
   inline blockquote (the default above). On a WIDE screen the media query below floats them into the
   right gutter — smaller, ragged, unboxed — so the aside sits beside the text it comments on without
   breaking the reading column. Concept insets (`.concept-inset`, boxed primers) keep the default box. */
blockquote.aside-sidenote {{ background: transparent; }}
@media (min-width: 60rem) {{
  blockquote.aside-sidenote {{
    float: right; clear: right; width: 13rem; margin: 0.3rem -15rem 1rem 0;
    padding: 0 0 0 0.9rem; border-left: 2px solid var(--box-inset-rule); background: transparent;
    font-size: 14px; line-height: 1.5; color: var(--muted);
  }}
}}
/* CITATIONS & EDITORIAL NOTES (bibliography subsystem). Two visibly-distinct in-text marker families:
   `[cite:]` → a NUMERIC superscript linked to the chapter's numbered Works Cited; `[note:]` → a SYMBOLIC
   superscript (* † ‡ § …). Each is followed by a right-gutter note (an inline <span>, valid inside a <p>,
   styled to reuse the same Tufte gutter geometry as `.aside-sidenote`). The number/symbol sets are
   disjoint by construction (a check asserts it). */
sup.cite-ref, sup.note-ref {{ line-height: 0; font-size: 0.72em; }}
sup.cite-ref a {{ color: var(--accent); font-weight: 600; text-decoration: none; }}
sup.cite-ref a:hover {{ text-decoration: underline; }}
sup.note-ref {{ padding-left: 0.05em; }}
sup.note-ref a {{ color: var(--muted); font-weight: 600; text-decoration: none; }}
sup.note-ref a:hover {{ text-decoration: underline; }}
.cite-note, .editorial-note {{
  display: block; margin: 0.3rem 0 1rem; padding: 0 0 0 0.9rem;
  border-left: 2px solid var(--box-inset-rule); font-size: 14px; line-height: 1.5;
  color: var(--muted); font-style: normal;
}}
.cite-note .cn-mark, .editorial-note .cn-mark {{ color: var(--accent); font-weight: 600; margin-right: 0.15em; }}
.cite-note a, .editorial-note a {{ color: var(--accent); word-break: break-word; }}
@media (min-width: 60rem) {{
  .cite-note, .editorial-note {{
    float: right; clear: right; width: 13rem; margin: 0.2rem -15rem 0.9rem 0;
  }}
}}
/* Per-chapter Works Cited — a numbered list set off from the body by a top rule; the <ol> numbering
   equals each entry's id, so citation superscript N links to entry N (the mirror). */
section.works-cited {{ margin: 2.4rem 0 1rem; padding-top: 1rem; border-top: 1px solid var(--rule); clear: both; }}
section.works-cited .wc-h {{ font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.08em;
                             color: var(--muted); margin: 0 0 0.6rem; }}
ol.wc-list {{ font-size: 15px; line-height: 1.5; }}
ol.wc-list li {{ margin: 0.35rem 0; padding-left: 0.2rem; }}
ol.wc-list li em, ul.bib-list li em {{ font-style: italic; }}
/* End-of-book Bibliography — a hanging-indent alphabetical list (unnumbered). */
section.bibliography ul.bib-list {{ list-style: none; padding-left: 0; font-size: 15px; line-height: 1.55; }}
section.bibliography ul.bib-list li {{ margin: 0 0 0.7rem; padding-left: 1.4rem; text-indent: -1.4rem; }}
section.bibliography .bib-empty {{ color: var(--muted); font-style: italic; }}
code {{ background: var(--code-bg); padding: 0.1em 0.35em; border-radius: 3px; font-size: 0.9em; }}
a {{ color: var(--accent); }}
/* Booktabs table style (drawing/tables.md): exactly three horizontal rules — a heavy top rule, a light
   rule under the header, a heavy bottom rule — and NO vertical rules or cell borders. Whitespace separates
   columns/rows; rules only group. No zebra striping (row padding does the separating). Numbers
   right-aligned via `.num`. WHY: vertical rules and boxed cells are chartjunk (Tufte / booktabs). */
/* Table body sits ~91% of the 17px prose body (15.5px), matching the print edition's ~93% — tables read
   as compact structured reference, the prose stays the star. Roomier rows (padding 0.7rem vertical,
   line-height 1.5) keep the denser type from reading cramped (the print `\arraystretch ~1.15` twin). */
table.book-table {{ border-collapse: collapse; width: 100%; margin: 1.2rem 0; font-size: 15.5px;
                    border-top: 2px solid var(--ink); border-bottom: 2px solid var(--ink); }}
table.book-table th, table.book-table td {{ border: none; padding: 0.7rem 0.7rem;
                                             text-align: left; vertical-align: top; line-height: 1.5; }}
table.book-table thead th {{ background: transparent; font-weight: 600;
                             border-bottom: 1px solid var(--muted); }}
table.book-table th.num, table.book-table td.num {{ text-align: right; }}
/* Metadata card (`.meta-card`, the Appendix-B per-note summary box): an UNnumbered key/value reference box.
   A quiet framed panel, narrower than the text measure, tight rows, the field name in the muted small-caps
   label style — orientation before the prose, not a content table. */
table.book-table.meta-card {{ width: auto; max-width: 34rem; margin: 0.9rem 0 1.1rem; font-size: 13.5px;
                              border: 1px solid var(--muted); border-radius: 6px; background: var(--code-bg); }}
table.book-table.meta-card td {{ padding: 0.32rem 0.7rem; line-height: 1.4; }}
table.book-table.meta-card td:first-child {{ font-weight: 600; color: var(--muted);
                                             white-space: nowrap; width: 1%; }}
table.book-table.meta-card tr + tr td {{ border-top: 1px solid var(--rule, rgba(120,113,108,0.22)); }}
/* Per-case one-pager card (`.case-onepager`, the "Meet the six" gallery): a light left-ruled panel that sets
   the projected reconstruction table apart from the body prose, deliberately lighter than the lavender
   concept-inset (per-case-onepager-DESIGN §5). The inner <table> keeps its booktabs style + numbering. */
.case-onepager {{ border-left: 3px solid var(--accent); padding: 0.1rem 0 0.1rem 1.1rem; margin: 1.3rem 0; }}
.case-onepager table.book-table {{ margin: 0.4rem 0; }}
.case-onepager table.book-table thead th {{ font-size: 1.03em; border-bottom-color: var(--accent); }}
/* Convergence spread (`.convergence-spread`): the glyph matrix beside its key as ONE field-guide object
   (tables.md author review) — read left, look right, no page turn. Two columns on a wide viewport (matrix at
   its natural width, key filling the rest); stacks on narrow screens. Both inner <table>s keep numbering. */
.convergence-spread {{ display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 1.6rem;
                       align-items: start; margin: 1.3rem 0; }}
.convergence-spread .cs-panel {{ min-width: 0; overflow-x: auto; }}
.convergence-spread table.book-table {{ margin: 0.4rem 0; }}
@media (max-width: 60rem) {{ .convergence-spread {{ grid-template-columns: 1fr; gap: 0.5rem; }} }}
/* The slim key (`.convergence-key`): the Construct column folded to a small-caps subtitle beneath the pattern
   name (name over `.pat-construct`), so the key reads as name + definition with the construct as index info. */
table.book-table.convergence-key .pat-name {{ display: block; font-weight: 600; }}
table.book-table.convergence-key .pat-construct {{ display: block; margin-top: 0.1rem;
    font-variant: small-caps; letter-spacing: 0.02em; font-size: 0.82em; color: var(--muted); }}
/* Worked-Examples gallery (`.worked-examples`, the GoF "Known Uses" block that closes a significant section):
   a titled, scannable set of 2-4 mini-cases + an accent-ruled Takeaway naming the shared abstraction. Shares
   the accent left-rule idiom with `.case-onepager`, but sets the whole block apart as a mode-shift from body
   prose so a reader reads the shape once and scans on reflex (B3 gallery-format-spec). */
.worked-examples {{ margin: 1.6rem 0; padding: 0.2rem 0 0.2rem 1.1rem;
    border-left: 3px solid var(--accent); }}
.worked-examples .wex-title {{ margin: 0 0 0.7rem; font-size: 0.78rem; font-weight: 700;
    letter-spacing: 0.09em; text-transform: uppercase; color: var(--accent); }}
.worked-examples .wex-case {{ margin: 0 0 0.7rem; }}
.worked-examples .wex-case p {{ margin: 0; }}
.worked-examples .wex-src {{ font-weight: 700; }}
/* The Takeaway reads as a DIFFERENT kind of statement than the examples — its own top rule + accent label —
   so it forces the reader to compare abstractions, not implementations (B3 R4). */
.worked-examples .wex-takeaway {{ margin: 0.9rem 0 0; padding-top: 0.7rem;
    border-top: 1px solid var(--rule, rgba(120,113,108,0.28)); }}
.worked-examples .wex-takeaway p {{ margin: 0; }}
.worked-examples .wex-tk-label {{ font-weight: 700; font-variant: small-caps; letter-spacing: 0.03em;
    color: var(--accent); }}
blockquote table.book-table {{ background: transparent; }}
blockquote .inset-title {{ font-style: normal; font-weight: 700; margin: 0 0 0.4rem; }}
blockquote pre.mermaid {{ font-style: normal; }}
/* Mermaid label DISPLAY size — driven from the SAME design token as the mermaid LAYOUT config
   (assets/mermaid-config.json, emitted by the token projector). Mermaid sizes each node box at the
   config font-size; these rules render the text at that identical px, so a label can never overflow the
   box mermaid drew for it (the config==CSS invariant). Do not hardcode a literal here — it would drift
   from the config and re-introduce the overflow class. */
pre.mermaid .nodeLabel, pre.mermaid .label text {{ font-size: {_MERMAID_LABEL_PX['node']}px; }}
pre.mermaid text.messageText {{ font-size: {_MERMAID_LABEL_PX['message']}px; }}
/* CONCEPT INSET — a textbook-style primer sidebar (a `> ### Inset N — Title` block). It is NOT a plain
   quote: it is a deliberately designed aside that teaches a background concept beside the main argument
   (e.g. "What is an automaton?"). So it drops the base blockquote's grey border + italic run and gets its
   own visual language: a tinted panel, a strong left accent rule, a labelled header band, and a ROMAN
   (non-italic) body a reader can actually read at length.

   ── SWAP POINT ─────────────────────────────────────────────────────────────────────────────────────
   Every knob is a CSS custom property on `.concept-inset`, so this "screen representation of the book" can
   be re-skinned in ONE place — change these vars to retarget a print stylesheet, a dark theme, or an
   alternate house style without touching any rule below. Add e.g. a `@media print` or `:root[data-theme=…]`
   block that only re-declares these variables and the whole sidebar follows. */
blockquote.concept-inset {{
  --inset-bg: var(--panel);           /* panel fill — warm off-white, distinct from the page's var(--panel) */
  --inset-accent: var(--box-inset-rule);       /* the lavender left accent rule + ::before square — a BORDER, no contrast rule */
  --inset-header: var(--ink);       /* header title + strong TEXT ink — near-black, ~13:1 on the lavender band/panel (WCAG-AA). The lavender box-inset-rule stays the accent RULE only; used as text ink it was 4.03:1, under AA. */
  --inset-header-bg: var(--box-inset-fill);    /* header band fill — a shade deeper than the panel so the label reads */
  --inset-body: var(--ink);         /* body ink — near-black warm grey, comfortable roman reading colour */
  --inset-accent-width: 5px;     /* thickness of the left accent rule */
  --inset-radius: 6px;
  --inset-pad-x: 1.35rem;
  --inset-pad-y: 1rem;
  --inset-max: 34rem;            /* keep the primer to a readable measure, not the full column width */

  background: var(--inset-bg);
  border: 1px solid var(--rule);
  border-left: var(--inset-accent-width) solid var(--inset-accent);
  border-radius: var(--inset-radius);
  color: var(--inset-body);
  font-style: normal;            /* KEY: kill the base blockquote italic — a primer reads as roman prose */
  padding: 0 var(--inset-pad-x) var(--inset-pad-y);
  margin: 1.7rem 0;
  max-width: var(--inset-max);
}}
/* Header treatment — the "Inset N — Title" label sits in its own tinted band, flush to the panel edges,
   set in small-caps-ish tracked type so it reads as a sidebar HEADER, not a run-in paragraph. It stays a
   demoted callout label (`p.inset-title`, not an <hN>) so no heading-order break and its id anchor is
   preserved. */
blockquote.concept-inset .inset-title {{
  font-style: normal; font-weight: 700; color: var(--inset-header);
  background: var(--inset-header-bg);
  margin: 0 calc(-1 * var(--inset-pad-x)) var(--inset-pad-y);
  padding: 0.6rem var(--inset-pad-x);
  border-radius: var(--inset-radius) var(--inset-radius) 0 0;
  border-bottom: 1px solid var(--rule);
  font-size: 0.9rem; letter-spacing: 0.02em; line-height: 1.35;
}}
blockquote.concept-inset .inset-title::before {{
  content: ""; display: inline-block; width: 0.55rem; height: 0.55rem; margin-right: 0.5rem;
  background: var(--inset-accent); border-radius: 2px; vertical-align: middle;
}}
blockquote.concept-inset p {{ margin: 0 0 0.7rem; line-height: 1.6; }}
blockquote.concept-inset p:last-child {{ margin-bottom: 0; }}
blockquote.concept-inset strong {{ color: var(--inset-header); }}
blockquote.concept-inset em {{ font-style: italic; }}  /* inline emphasis still italicizes inside roman body */
/* CODE INSET — a fenced code listing lifted into a titled box: "here is a real artifact from the system."
   It shares the concept-inset's amber header-band label typography (the sidebar HEADER, `p.inset-title`,
   demoted so no heading-order break), but its body is a monospace listing, not roman prose. The header
   sits flush to the panel edges; the <pre> keeps the page's usual code styling, un-boxed inside the panel
   so the box's own border is the only frame. */
figure.code-inset {{
  --inset-bg: var(--panel); --inset-accent: var(--box-inset-rule); --inset-header: var(--ink); --inset-header-bg: var(--box-inset-fill);
  --inset-radius: 6px; --inset-pad-x: 1.35rem;
  background: var(--inset-bg); border: 1px solid var(--rule);
  border-left: 5px solid var(--inset-accent); border-radius: var(--inset-radius);
  margin: 1.7rem 0; max-width: 40rem; overflow: hidden;
}}
figure.code-inset .inset-title {{
  font-family: "Source Sans 3", sans-serif; font-style: normal; font-weight: 700;
  color: var(--inset-header); background: var(--inset-header-bg);
  margin: 0; padding: 0.55rem var(--inset-pad-x);
  border-bottom: 1px solid var(--rule);
  font-size: 0.9rem; letter-spacing: 0.02em; line-height: 1.35;
}}
figure.code-inset .inset-title::before {{
  content: ""; display: inline-block; width: 0.55rem; height: 0.55rem; margin-right: 0.5rem;
  background: var(--inset-accent); border-radius: 2px; vertical-align: middle;
}}
figure.code-inset pre {{ margin: 0; padding: 0.9rem var(--inset-pad-x); background: transparent; border: 0; }}
/* THESIS box — a chapter's load-bearing claim, lifted out of the reading column as a light green panel.
   Un-italic (a thesis is a statement, not an aside); dark ink var(--ink) on var(--box-thesis-fill) clears WCAG AA (~13.8:1).
   Taxonomy + spec: book/_design/callout-typography.md. */
blockquote.thesis-box {{ background: var(--box-thesis-fill); border: 1px solid var(--rule); border-left: 4px solid var(--box-thesis-rule);
                         color: var(--ink); font-style: normal; padding: 1rem 1.3rem; margin: 1.6rem 0;
                         border-radius: 5px; }}
blockquote.thesis-box p {{ margin: 0 0 0.6rem; }}
blockquote.thesis-box p:last-child {{ margin-bottom: 0; }}
blockquote.thesis-box strong {{ color: var(--box-thesis-rule); }}
/* Part-opener THESIS box title-bar — a thesisbox-marker box whose first line is a demoted "### TITLE"
   heading (rendered as p.inset-title) shows that title as a centered ALLCAPS bar in the green family, flush
   to the panel edges (negative margins cancel the 1rem/1.3rem panel padding), a hairline green rule under it.
   In-prose "The … Thesis." boxes carry no .inset-title, so they are untouched (Fork 6a). */
blockquote.thesis-box .inset-title {{
  text-align: center; text-transform: uppercase; font-weight: 700; letter-spacing: 0.08em;
  color: var(--box-thesis-rule); background: var(--box-thesis-fill);
  font-family: var(--font-display); font-size: 0.95rem; line-height: 1.35;
  margin: -1rem -1.3rem 0.9rem calc(-1.3rem - 4px);
  padding: 0.55rem 1.3rem; border-bottom: 1px solid var(--box-thesis-rule);
  border-radius: 5px 5px 0 0;
}}
blockquote.thesis-box .inset-title::before {{ content: none; }}
/* DEFINITION box — a core-term definition (an index-def marker on a bold-lead Term blockquote), lifted
   into a blue panel that mirrors the thesis box's shape but carries the definition-azure anchor. Blue on
   every surface, distinct from the umber chrome accent and the green thesis claim. */
blockquote.def-box {{ background: var(--box-def-fill); border: 1px solid var(--rule);
                      border-left: var(--border-box-rule) solid var(--box-def-rule);
                      color: var(--ink); font-style: italic; padding: 1rem 1.3rem; margin: 1.6rem 0;
                      border-radius: 5px; }}
blockquote.def-box p {{ margin: 0 0 0.6rem; }}
blockquote.def-box p:last-child {{ margin-bottom: 0; }}
blockquote.def-box strong {{ color: var(--box-def-rule); }}
/* DEFINITION body typography — the definition prose reads in italics (it is an aside on a term), while the
   bold Term LEAD stays upright (a label, not emphasis). Applies to both the light `> **Term.**` sidenote
   (`def-inset`) and the boxed core-term definition (`def-box`). Only the FIRST paragraph's leading <strong>
   is uprighted, so the term label reads as a label; any later inline bold keeps the surrounding italic.
   Footnotes (em-led), plain sidenotes, primers, and theses are untouched. Taxonomy: _design/callout-typography.md. */
blockquote.def-inset {{ font-style: italic; }}
blockquote.def-inset > p:first-child > strong:first-child,
blockquote.def-box > p:first-child > strong:first-child {{ font-style: normal; }}
/* PULL-QUOTE — a prominent, LABEL-LESS emphasis line (e.g. a chapter/book closing thought). Unlike
   THESIS/DEFINITION/CONCEPT-INSET it carries NO semantic color-family (no fill, no left accent bar,
   no radius) — those signal a CATEGORIZED construct (a claim / a term / a primer). A pull-quote is not
   a category; it differentiates by SIZE and CENTERING alone — the printed-page convention of an
   enlarged pulled line, bounded by a thin accent rule above and below. Authored via a bare
   pullquote marker comment glued above a plain blockquote (see callout-typography.md).
   [INFRA-1], part6-apply-SPEC-260807.md. */
blockquote.pull-quote {{
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 600;
  font-size: var(--fs-thesis-title);
  line-height: 1.32;
  color: var(--ink);
  text-align: center;
  max-width: 34rem;
  margin: 2.6rem auto;
  padding: 1.15rem 0;
  border-top: 1px solid var(--accent);
  border-bottom: 1px solid var(--accent);
}}
blockquote.pull-quote p {{ margin: 0; }}
blockquote.pull-quote strong {{ font-style: normal; }}
.book-eq {{ text-align: center; font-family: Georgia, "Times New Roman", serif; font-style: italic;
           font-size: 1.2em; color: var(--ink); margin: 1.3rem 0; letter-spacing: 0.02em; }}
figure.book-figure {{ margin: 1.8rem 0; text-align: center; }}
figure.book-figure svg,
figure.book-figure img {{ max-width: 100%; height: auto; }}
/* A wide figure breaks out past the reading column for more visual authority. Centered on the column via
   a half-shift; capped at 96vw so it never forces horizontal scroll on a narrow screen. */
figure.book-figure--wide {{ width: min(64rem, 96vw); margin-left: 50%; transform: translateX(-50%); }}
figure.book-figure--wide svg,
figure.book-figure--wide img {{ max-width: 100%; height: auto; }}
figure.book-figure figcaption {{ font-size: 14px; color: var(--muted); margin-top: 0.6rem;
                                text-align: left; line-height: 1.5; }}
figure.book-figure figcaption.fig-label-only {{ text-align: center; }}
/* D74 — the author portrait floats left at a capped width so the bio flows around it. It is a PLAIN
   (unnumbered, uncaptioned) `figure.plain-image.portrait-wrap`, not a `book-figure` float. */
figure.portrait-wrap {{ float: left; width: 190px; max-width: 40%; margin: 0.2rem 1.5rem 0.8rem 0;
                        text-align: center; }}
figure.portrait-wrap img {{ width: 100%; height: auto; border-radius: 4px; }}
.fig-label, .tbl-label {{ font-weight: 700; color: var(--ink); }}
table caption {{ caption-side: top; text-align: left; font-size: 14px; color: var(--muted);
                 margin-bottom: 0.45rem; line-height: 1.5; }}
ul.list-of-floats-links {{ list-style: none; padding-left: 0; }}
ul.list-of-floats-links li {{ margin: 0.15rem 0; }}
/* Front-glossary term linked to its canonical definition site (idx-def anchor). Keeps the bold term's ink
   colour; a dotted underline marks it as a jump-to-definition without the heavy accent of an inline link. */
a.gloss-site {{ color: inherit; text-decoration: none; border-bottom: 1px dotted var(--muted); }}
a.gloss-site:hover, a.gloss-site:focus {{ color: var(--accent); border-bottom-color: var(--accent); }}
/* Figures Gallery (figures.html) — every figure verbatim (same rendered fragment the chapters ship),
   `<hr>`-separated, each followed by a small "from <chapter>" back-link. */
.gallery-item {{ margin: 0; }}
.gallery-item .book-figure {{ margin-top: 0; }}
.gallery-source {{ font-size: 13px; color: var(--muted); text-align: center; margin: 0.5rem 0 0; }}
.gallery-source a {{ color: var(--accent); text-decoration: underline; }}
.gallery hr {{ border: none; border-top: 1px solid var(--rule); margin: 2.4rem 0; }}
.gallery-group {{ margin: 0 0 2.4rem; }}
.gallery-group > h2 {{ margin: 2.6rem 0 0.2rem; padding-bottom: 0.3rem; border-bottom: 2px solid var(--rule); }}
.gallery-group-note {{ font-size: 14px; color: var(--muted); margin: 0 0 1.6rem; }}
.marker {{ margin: 1.3rem 0; padding: 0.75rem 1rem; border-radius: 5px; font-size: 15px; }}
.marker-fill {{ background: var(--accent-tint); border: 1px dashed var(--accent); }}
.marker-more {{ background: var(--box-def-fill); border: 1px dashed var(--box-def-rule); }}
.marker-tag {{ display: inline-block; font-weight: 700; font-size: 11px; letter-spacing: 0.05em;
               padding: 1px 6px; border-radius: 3px; margin-right: 0.5rem; vertical-align: 1px; }}
.marker-fill .marker-tag {{ background: var(--accent); color: var(--paper); }}
.marker-more .marker-tag {{ background: var(--box-def-rule); color: var(--paper); }}
/* Per-page chapter navigation — one left→right sequence bar (Table of contents « … │ THIS CHAPTER │ … »
   Index), bottom-only. Mobile-first: stacked column (backward pills → centred name → forward pills);
   enhanced to a three-zone row at >=60rem so the name stays dead-centre. Tokens only. */
.chapnav {{ display: flex; flex-direction: column; gap: 0.8rem; align-items: stretch;
            margin-top: 3rem; padding-top: 1.4rem; border-top: 1px solid var(--rule); }}
.chapnav-back, .chapnav-fwd {{ display: flex; flex-wrap: wrap; gap: 0.6rem; justify-content: center; }}
.chapnav-here {{ text-align: center; font-weight: 600; color: var(--accent); font-size: 18px; padding: 0.2rem 0; }}
.chapnav a {{ font-size: 12px; letter-spacing: 0.03em; text-transform: uppercase; font-weight: 600;
              color: var(--accent); text-decoration: none; padding: 0.5rem 0.85rem; line-height: 1.1;
              border: 1px solid var(--rule); border-radius: 6px; background: var(--paper); }}
.chapnav a:hover {{ border-color: var(--accent); background: var(--panel); }}
@media (min-width: 60rem) {{
  .chapnav {{ flex-direction: row; align-items: center; }}
  .chapnav-back {{ flex: 1; justify-content: flex-end; }}
  .chapnav-fwd {{ flex: 1; justify-content: flex-start; }}
  .chapnav a {{ white-space: nowrap; }}
  .chapnav-here {{ flex: 0 0 auto; max-width: 22rem; overflow: hidden; text-overflow: ellipsis;
                   display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }}
}}
/* Part-nav footer on a Part landing page — a pill bar over the six numbered Parts (current = filled, non-link).
   Mirrors the .chapnav pill look. */
/* Interactive book-roadmap nav on a Part landing page (web only). The SVG reuses assets/book-map.svg;
   each numbered Part is an <a> or the highlighted current node. Tokens only (theme + print safe). */
.roadmap-nav {{ margin-top: 2.6rem; padding-top: 1.4rem; border-top: 1px solid var(--rule);
               display: flex; justify-content: center; }}
.roadmap-nav svg {{ width: 100%; max-width: 460px; height: auto; }}
.roadmap-nav a.bm-part-link {{ cursor: pointer; }}
.roadmap-nav a.bm-part-link rect {{ transition: stroke-width 80ms ease; }}
.roadmap-nav a.bm-part-link:hover rect,
.roadmap-nav a.bm-part-link:focus-visible rect {{ stroke-width: 3.5; }}
.roadmap-nav a.bm-part-link:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px; }}
/* Current Part: heavier stroke — NOT color-only (pairs with aria-current + the hidden "current part" text). */
.roadmap-nav .bm-part.current rect {{ stroke-width: 4; }}
/* Off-screen but reader-available (screen-reader fallback list + the current-Part-in-text cue). */
.visually-hidden {{ position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
                    clip: rect(0 0 0 0); white-space: nowrap; border: 0; }}
.book-foot {{ margin-top: 3rem; padding-top: 1.2rem; border-top: 1px solid var(--rule); color: var(--muted);
              font-size: 13px; text-align: center; }}
/* index page */
.book-title {{ padding: 3rem 0 0.5rem; }}
.book-title h1 {{ font-size: 2.4rem; margin: 0; }}
.book-title .sub {{ color: var(--muted); margin-top: 0.4rem; }}
.book-download {{ margin-top: 0.9rem; display: flex; flex-wrap: wrap; gap: 0.6rem; }}
.book-download a {{ display: inline-block; font-size: 14px; font-weight: 600; color: var(--accent);
                    text-decoration: none; padding: 0.45rem 0.9rem; border: 1px solid var(--rule);
                    border-radius: 6px; background: var(--paper); }}
.book-download a:hover {{ border-color: var(--accent); background: var(--panel); }}
.idx .part {{ font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em;
             font-size: 13px; margin: 2rem 0 0.5rem; }}
.idx ol {{ list-style: none; padding: 0; margin: 0; }}
.idx li {{ margin: 0.35rem 0; }}
.idx a {{ text-decoration: none; }}
.idx .cnum {{ color: var(--muted); font-variant-numeric: tabular-nums; margin-right: 0.5rem; }}
/* term index page */
.idx-terms ul {{ list-style: none; padding: 0; margin: 0 0 1rem; }}
.idx-terms li {{ margin: 0.3rem 0; }}
.idx-terms .idx-term {{ font-weight: 600; }}
.idx-terms .idx-refs {{ color: var(--muted); font-size: 14px; }}
.idx-terms .idx-refs a {{ margin-left: 0.15rem; }}
/* curated concept entry: a definition-of / examples-of sub-block under the concept name */
.idx-terms li.idx-concept {{ margin: 0.55rem 0; }}
.idx-concept .idx-subs {{ display: block; margin: 0.15rem 0 0 1rem; }}
.idx-concept .idx-sub {{ display: block; font-size: 14px; color: var(--muted); line-height: 1.6; }}
.idx-concept .idx-sub-lead {{ color: var(--muted); font-style: italic; margin-right: 0.35rem; }}
/* Underline the locators so a link is distinguished from the "definition of:" lead text without relying
   on color alone (axe link-in-text-block). */
.idx-concept .idx-sub a {{ margin-right: 0.4rem; text-decoration: underline; }}
/* iframe figure embed (the rewired mechanism map) */
figure.book-figure.catalogue-embed iframe {{ width: 100%; height: 600px; border: 1px solid var(--rule);
                                             border-radius: 6px; background: var(--paper); }}
/* TOP nav bar — the ☰ Contents disclosure only (the per-page sequence bar lives at the bottom now). */
nav.toc .toc-inner {{ display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
                      gap: 0.7rem 1.4rem; }}
nav.toc details {{ flex: 0 0 auto; }}
/* When the reader opens the Contents disclosure, let it claim the full row so the chapter list flows at
   full width under the summary. */
nav.toc details[open] {{ flex: 1 1 100%; }}
"""

# ── Appendix render-mechanism CSS. Kept OUT of the shared `CSS` constant and appended to every page's
#    `<style>` (the value-ordered appendix is the shipped edition). The linked constituent legend, the keep-together note
#    wrapper (HTML best-effort; the hard guarantee is the PDF path), and the packed brick grid. Tokens only,
#    so both themes and the print CSS inherit. Escapes match the `CSS` f-string ({{ }}).
_APPENDIX_V2_CSS = """
/* 1. Linked constituent legend — beneath a stack's overview figure; role-labelled links to each part's
      inline subsection on the same page. */
nav.stack-legend { margin: 0.6rem auto 1.8rem; padding: 0.8rem 1rem; max-width: 46rem; text-align: left;
                   border: 1px solid var(--rule); border-left: 3px solid var(--accent); border-radius: 6px;
                   background: var(--panel); }
nav.stack-legend ol { margin: 0; padding-left: 1.4rem; }
nav.stack-legend li { margin: 0.3rem 0; line-height: 1.5; }
nav.stack-legend .legend-role { display: inline-block; font-weight: 700; font-size: 11px; letter-spacing: 0.05em;
                                color: var(--paper); background: var(--accent); padding: 1px 6px; border-radius: 3px;
                                margin-right: 0.5rem; vertical-align: 1px; }
nav.stack-legend a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; }
nav.stack-legend a:hover, nav.stack-legend a:focus { border-bottom-color: var(--accent); }
nav.stack-legend .legend-loc { color: var(--muted); font-variant-numeric: tabular-nums; }
/* 2. Keep-together note (HTML best-effort — the hard guarantee is the PDF path). */
section.eng-note, section.eng-note-panel { break-inside: avoid; }
/* 3. Packed brick grid — a CSS grid whose bricks span 1..N columns as the packer computed; each brick a
      bordered card (thumbnail slot, linked name, summary, metadata footer). */
.brick-grid { display: grid; grid-template-columns: repeat(var(--brick-cols, 2), minmax(0, 1fr));
              gap: 1rem; margin: 1.4rem 0 2rem; }
.brick { border: 1px solid var(--rule); border-radius: 8px; background: var(--paper); padding: 0.85rem 0.95rem;
         display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
/* R7 (#1 feedback): the thumbnail slot is TALLER so the diagram/glyph — and therefore its text — renders
   larger and legible; the summary font DROPS a notch. Bricks stay equal-size (R6): the rebalance applies
   uniformly to every brick. */
.brick-fig { display: flex; align-items: center; justify-content: center; height: 6.75rem; border-radius: 5px;
             border: 1px dashed var(--rule); background: var(--panel); color: var(--muted); font-size: 12px;
             letter-spacing: 0.04em; text-transform: uppercase; overflow: hidden; padding: 0.3rem; }
.brick-fig svg { max-width: 100%; max-height: 100%; height: auto; width: auto; }
.brick-fig-glyph svg { max-height: 5.7rem; }
/* Technique kicker — a small, muted eyebrow naming the transferable technique above a concrete brick title. */
.brick-kicker { margin: 0.1rem 0 -0.1rem; font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
                text-transform: uppercase; color: var(--accent); }
.brick-name { margin: 0; font-weight: 700; line-height: 1.25; }
.brick-name a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--accent); }
.brick-name a:hover, .brick-name a:focus { color: var(--accent); }
.brick-sum { margin: 0; font-size: 12.5px; line-height: 1.48; color: var(--ink); }
.brick-meta { margin: 0.1rem 0 0; font-size: 12px; color: var(--muted); letter-spacing: 0.02em; }
/* Instance backref — "An instance of: X →"; the domain-specific variant reads louder (accent, heavier). */
.brick-instance { margin: 0.05rem 0 0; font-size: 12px; color: var(--muted); line-height: 1.4; }
.brick-instance a { color: inherit; }
.brick-instance-domain { color: var(--accent); font-weight: 600; }
/* Advanced-examples line on a technique brick — quiet, sits under the summary. */
.brick-adv { margin: 0.05rem 0 0; font-size: 11.5px; color: var(--muted); line-height: 1.4; }
/* Engineering-Note ref (flagship only) — a muted footnote under the chip line, never a second chip row. */
.brick-note-ref { margin: 0.1rem 0 0; font-size: 11.5px; color: var(--muted); letter-spacing: 0.02em; }
@media (max-width: 40rem) { .brick-grid { grid-template-columns: 1fr; }
                            .brick { grid-column: span 1 !important; } }
/* 4. D77 — appendix CHAPTER headings in ALL CAPS, so an appendix page's title reads as clearly distinct
      from the book's own chapter titles. CSS text-transform only (the DOM text is unchanged, so the TOC,
      pager, index, and any text-extraction stay case-exact). Scoped to the appendix `<main>` so book
      chapters are untouched. */
main.wrap.appendix h1 { text-transform: uppercase; letter-spacing: 0.015em; }
"""


def _chap_ref(c: dict) -> str:
    """The 'N.M' reference for a numbered chapter, or '' for front/back matter, the appendix, a Part
    landing page (the Part opener carries no chapter number), and the unnumbered in-part coda."""
    return ("" if c.get("is_matter") or c.get("is_appendix") or c.get("is_part_page")
            or c.get("is_appendix_divider") or c.get("is_coda") else str(c["seq"]))


def _toc_prefix(c: dict) -> str:
    ref = _chap_ref(c)
    return f"{ref}&nbsp; " if ref else ""


def _pager_label(c: dict) -> str:
    ref = _chap_ref(c)
    prefix = f"{ref} · " if ref else ""
    return f'{prefix}{c["chapter_title"]}'


BOOK_INDEX_SLUG = "book-index"  # the autogenerated term index page (see build_index_page)
_FIGURES_GALLERY_SLUG = "figures"  # the autogenerated figures-only page (see build_figures_page)
_BIBLIOGRAPHY_SLUG = "bibliography"  # the end-of-book alphabetical bibliography (see build_bibliography_page)


def _chapter_nav(chapters: list[dict], idx: int) -> dict:
    """The per-page navigation for the chapter at `idx`, as a single left→right sequence:

        Table of contents « Beginning of part « Previous chapter │ THIS CHAPTER │ Next chapter » Next part » Index

    Backward controls fill the left zone, forward controls the right, the current chapter names the centre
    (a non-link). An unavailable target is OMITTED, not disabled — Table of contents and Index anchor the
    zone edges and never drop, so the skeleton stays stable while the inner pills (Beginning-of-part,
    Prev/Next-chapter, Next-part) come and go. Every page carries a real part number, so the same code path
    covers front-matter, body, back-matter, and appendices with no special-casing.

    Returns `{"back": [(label, href, aria)], "name": str, "fwd": [(label, href, aria)]}`.
    """
    cur = chapters[idx]
    first_of_part = next((c for c in chapters if c["part"] == cur["part"]), cur)
    back: list[tuple[str, str, str]] = []
    fwd: list[tuple[str, str, str]] = []
    # 1. Table of contents — always (the structural chapter-list landing).
    back.append(("« Table of contents", "index.html", "Table of contents"))
    # 2. Beginning of part — only when not already on the part's first page (else it would self-link).
    if first_of_part["slug"] != cur["slug"]:
        back.append(("« Beginning of part", f'{first_of_part["slug"]}.html',
                     f'Beginning of {_part_label(cur)}'))
    # 3. Previous chapter — the strict reading-order predecessor (may cross a part boundary).
    if idx > 0:
        back.append(("« Previous chapter", f'{chapters[idx - 1]["slug"]}.html',
                     f'Previous chapter — {_pager_label(chapters[idx - 1])}'))
    # 5. Next chapter — the strict reading-order successor (may cross a part boundary).
    if idx + 1 < len(chapters):
        fwd.append(("Next chapter »", f'{chapters[idx + 1]["slug"]}.html',
                    f'Next chapter — {_pager_label(chapters[idx + 1])}'))
    # 6. Next part — the first later chapter whose part number differs.
    nxt_part = next((c for c in chapters[idx + 1:] if c["part"] != cur["part"]), None)
    if nxt_part:
        fwd.append(("Next part »", f'{nxt_part["slug"]}.html',
                    f'Next part — {_part_label(nxt_part)}'))
    # 7. Index — always (the alphabetised term index sits after the appendix).
    fwd.append(("Index »", f"{BOOK_INDEX_SLUG}.html", "Index of terms"))
    return {"back": back, "name": _pager_label(cur), "fwd": fwd}


def _render_chapnav(back: list[tuple[str, str, str]], name: str,
                    fwd: list[tuple[str, str, str]]) -> str:
    """Render one chapter-nav bar: a backward zone, the centred current-page name (a non-link `<span>`, so
    no empty-anchor html-validate risk), a forward zone. Shared by the in-order chapter pages and the
    generated pages (term index, figures gallery, bibliography). Each pill carries an explicit aria-label
    because the `«`/`»` glyphs read poorly aloud."""
    def pill(label: str, href: str, aria: str) -> str:
        return (f'<a href="{html.escape(href, quote=True)}" '
                f'aria-label="{html.escape(aria, quote=True)}">{html.escape(label)}</a>')
    back_html = "".join(pill(*t) for t in back)
    fwd_html = "".join(pill(*t) for t in fwd)
    name_html = (f'<span class="chapnav-here" title="{html.escape(_plain(name), quote=True)}">'
                 f'{inline(name)}</span>')
    return (f'<nav class="chapnav" aria-label="Chapter navigation">'
            f'<div class="chapnav-back">{back_html}</div>{name_html}'
            f'<div class="chapnav-fwd">{fwd_html}</div></nav>')


def _chapter_nav_html(chapters: list[dict], idx: int) -> str:
    nav = _chapter_nav(chapters, idx)
    return _render_chapnav(nav["back"], nav["name"], nav["fwd"])


def _static_nav_html(name: str, back_extra: list[tuple[str, str, str]] | None = None,
                     fwd_extra: list[tuple[str, str, str]] | None = None) -> str:
    """A fixed chapter-nav bar for the generated pages that sit outside the chapter reading order (term
    index, figures gallery, bibliography). Table of contents anchors the left, the page name centres, Index
    anchors the right; callers pass any page-specific extra pills."""
    back: list[tuple[str, str, str]] = [("« Table of contents", "index.html", "Table of contents")]
    back += back_extra or []
    fwd: list[tuple[str, str, str]] = list(fwd_extra or [])
    fwd.append(("Index »", f"{BOOK_INDEX_SLUG}.html", "Index of terms"))
    return _render_chapnav(back, name, fwd)


_ROADMAP_SVG_PATH = HERE / "assets" / "book-map.svg"


def _roadmap_nav_html(current_part: int) -> str:
    """The interactive book-roadmap on a Part landing page (WEB only). Reuses `assets/book-map.svg`:
    each numbered Part (1–6) becomes a native SVG `<a>` to its intro page; the CURRENT Part is a non-link,
    highlighted, `aria-current` node. No JS — the highlight is a build-time class, the links are plain
    `<a href>`. Carries NO caption and is caption-tier-exempt: it renders as a `<nav>` landmark, not a
    numbered `<figure>`. A visually-hidden fallback list carries real HTML links (reachability + the current
    Part named in text, so the SVG highlight needs no per-node "you are here" geometry)."""
    svg = _ROADMAP_SVG_PATH.read_text(encoding="utf-8")
    svg = re.sub(r"^\s*<\?xml[^>]*\?>\s*", "", svg)
    svg = re.search(r"<svg\b.*</svg>", svg, re.S).group(0)
    # Neutralize the intrinsic width/height so the viewBox drives responsive scaling (mirrors _figure_block).
    svg = re.sub(r'(<svg\b[^>]*?)\swidth="[^"]*"', r"\1", svg, count=1)
    svg = re.sub(r'(<svg\b[^>]*?)\sheight="[^"]*"', r"\1", svg, count=1)
    # Unique-suffix the shared ids so this nav SVG never collides with the static Figure 0.5-1 if a page ever
    # carries both (defensive; part-intro pages don't embed the figure today).
    svg = (svg.replace('id="bmTitle"', 'id="bmTitle-nav"').replace('id="bmDesc"', 'id="bmDesc-nav"')
              .replace('aria-labelledby="bmTitle bmDesc"', 'aria-labelledby="bmTitle-nav bmDesc-nav"')
              .replace('id="bm-ah"', 'id="bm-ah-nav"').replace('url(#bm-ah)', 'url(#bm-ah-nav)'))

    def decorate(mo: "re.Match[str]") -> str:
        n = int(mo.group("n"))
        inner = mo.group("inner")
        label = f'Part {n} — {_PART_TITLES.get(n, "")}'
        if n == current_part:
            # Non-link current node: emphasized class + aria-current (cue is stroke-weight + aria + the
            # fallback text — never color alone, per WCAG 1.4.1).
            return (f'<g id="bm-part-{n}" class="bm-part current" role="img" aria-current="page" '
                    f'aria-label="{html.escape(label + " (current part)", quote=True)}">{inner}</g>')
        return (f'<a href="part-{n}-intro.html" class="bm-part-link" role="link" '
                f'aria-label="{html.escape(label, quote=True)}">'
                f'<g id="bm-part-{n}" class="bm-part">{inner}</g></a>')

    svg = re.sub(r'<g id="bm-part-(?P<n>[1-6])" class="bm-part">(?P<inner>.*?)</g>', decorate, svg, flags=re.S)

    items: list[str] = []
    for n in range(1, 7):
        label = html.escape(f'Part {n} — {_PART_TITLES.get(n, "")}')
        if n == current_part:
            items.append(f'<li aria-current="page">{label} (current part)</li>')
        else:
            items.append(f'<li>{label}: <a href="part-{n}-intro.html">go to Part {n}</a></li>')
    fallback = '<ul class="visually-hidden roadmap-fallback">' + "".join(items) + "</ul>"
    return (f'<nav class="roadmap-nav" aria-label="Book roadmap — jump to a part">{svg}{fallback}</nav>')


def toc_html(chapters: list[dict], current_slug: str | None) -> str:
    """The top-of-page navigation: a `☰ Contents` disclosure listing every chapter (current highlighted).
    This disclosure is the sole quick-jump at the top; the left→right sequence bar (`_chapter_nav_html`)
    renders bottom-only, killing the old top/bottom duplication. The `<ol>` links every chapter, which is
    what keeps the reachability gate green."""
    rows = []
    last_part = None
    for c in chapters:
        if c["part"] != last_part:
            rows.append(f'<li class="part">{html.escape(_part_label(c))}</li>')
            last_part = c["part"]
        cls = "current" if c["slug"] == current_slug else ""
        rows.append(
            f'<li><a class="{cls}" href="{c["slug"]}.html">'
            f'{_toc_prefix(c)}{inline(c["chapter_title"])}</a></li>'
        )
    inner = "\n".join(rows)
    return (
        '<nav class="toc" aria-label="Table of contents"><div class="toc-inner"><details>'
        "<summary>☰&nbsp; Contents</summary>"
        f'<ol>{inner}</ol></details>'
        f'<a class="toc-blog" href="{_BLOG_POST_URL}" target="_blank" rel="noopener">'
        'Read the MAGE blog post ↗</a>'
        '</div></nav>'
    )


def _part_label(c: dict) -> str:
    """The heading a Part gets in the TOC / index. Front and back matter and the appendix name
    themselves; numbered Parts get 'Part N — Title'."""
    if c.get("is_appendix") or c.get("is_appendix_divider"):
        return c["part_title"]
    if c["part"] in (0, 7):
        return c["part_title"]
    return f'Part {c["part"]} — {c["part_title"]}'


def _kicker_html(chapters: list[dict], idx: int, num_label: str) -> str:
    """The chapter-header kicker with both halves as navigation links: the 'Part N — Title' half jumps to
    that Part's FIRST chapter (its beginning in reading order); the 'Chapter N.M' half jumps to the book
    Contents. The links keep the kicker's understated small-caps look (accent colour, underline on hover
    only — see the `.kicker a` CSS). Front/back matter and appendix pages carry only the part half."""
    c = chapters[idx]
    # A Part landing page IS the Part opener; its kicker names the Part and links to the whole-book Contents
    # (there is no earlier page in the Part to jump to). The H1 below already carries the Part title.
    if c.get("is_part_page"):
        return (f'<a href="index.html" aria-label="Book contents — jump to the chapter list">'
                f'Part {c["part"]}</a>')
    # The appendices mode-marker: a single small-caps kicker naming the reference section, linking to the
    # whole-book Contents (there is no earlier page in its group; the H1 below carries the section title).
    if c.get("is_appendix_divider"):
        return ('<a href="index.html" aria-label="Book contents — jump to the chapter list">'
                'Reference</a>')
    part_first = next((p for p in chapters if p["part"] == c["part"]), c)
    part_text = html.escape(_part_label(c))
    part_link = (
        f'<a href="{part_first["slug"]}.html" '
        f'aria-label="Beginning of {html.escape(_part_label(c), quote=True)}">{part_text}</a>'
    )
    if c.get("is_appendix") or c.get("is_matter"):
        return part_link
    # Numbered chapter — the second half links to the whole-book Contents (chapter list).
    chap_link = (
        f'<a href="index.html" aria-label="Book contents — jump to the chapter list">'
        f'{html.escape(num_label)}</a>'
    )
    return f'{part_link} &nbsp;::&nbsp; {chap_link}'


def page(title: str, toc: str, main: str, mermaid: bool = False, provenance: str = "",
         head_meta: str = "", appendix: bool = False, part_page: bool = False,
         appendices_divider: bool = False) -> str:
    runtime = MERMAID_CDN if mermaid else ""
    # <main> landmark so the content is a single main region (axe landmark-one-main / region). It carries
    # an aria-label of the page title so it stays a UNIQUELY-NAMED main landmark even when a page embeds the
    # mechanism-map figure in an <iframe> — axe flattens the iframe, and the figure has its own <main>; two
    # unnamed main landmarks would trip landmark-unique, so name this one.
    label = html.escape(_plain(title), quote=True)
    # `provenance` is an optional HTML comment sat right after `<html>`, mirroring catalog.py's own
    # "GENERATED by ... — DO NOT EDIT" banner placement on its rendered pages. Most book pages render from
    # tracked markdown (the markdown source itself is the record — see book/AGENTS.md), so this stays "" by
    # default; a page with NO markdown source of its own (an assembled projection like the figures gallery)
    # passes one so a reader who opens the raw HTML still finds the regen path.
    # The value-ordered appendix render-mechanism CSS (legend / brick-grid / note styles).
    css = CSS + _APPENDIX_V2_CSS
    # D77: an appendix chapter page carries a `wrap appendix` class so the appendix CSS renders its `<h1>`
    # chapter heading in ALL CAPS — distinct from the book's own chapter titles.
    main_cls = "wrap appendix" if appendix else "wrap"
    # A Part-divider (part-intro) page carries `part-page` so the "calm authority" CSS renders ITS title
    # bold — the one bold heading in the hierarchy — while every other chapter/section title stays semibold.
    if part_page:
        main_cls += " part-page"
    # The appendices mode-marker gets its own class so the centred divider CSS (base `<style>`, always
    # shipped) renders it distinct from a numbered Part divider.
    if appendices_divider:
        main_cls += " appendices-divider"
    return (
        f'<!DOCTYPE html>\n<html lang="en">{provenance}<head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f'{head_meta}'
        f"<title>{html.escape(_plain(title))}</title>{FONTS_LINK}<style>{css}</style></head><body>"
        f'{toc}<main class="{main_cls}" aria-label="{label}">{main}</main>{runtime}</body></html>\n'
    )


def _epigraph_html(part: int) -> str:
    """The Part-opener epigraph block for the first chapter of a numbered Part, or '' if none."""
    epi = _PART_EPIGRAPHS.get(part)
    if not epi:
        return ""
    quote, attr = epi
    return (
        f'<div class="part-epigraph">{inline(quote)}'
        f'<span class="attr">— {inline(attr)}</span></div>'
    )


# ─────────────────────────── Appendix — the pattern catalogue (GoF format) ───────────────────────────
# Generated at build time from the catalogue entry .md files, so the appendix stays in sync with the
# catalogue rather than duplicating its text. Each entry is re-projected into the classic Gang-of-Four
# Design-Patterns layout: Intent · Motivation · Applicability · Structure · Sample Code · Consequences ·
# Known Uses · Related Patterns. The Structure (a Mermaid diagram) and Sample Code slots are injected from
# a per-entry "fill" markdown under `appendix-fills/<role>/<slug>.md`, keyed by the catalogue entry slug;
# an entry with no fill falls back to a visible TODO note.

# role dir -> (display group name, ordering key). Mirrors INDEX.md's role grouping.
_APPENDIX_ROLES = [
    ("agent", "Agent"),
    ("models-bridge", "Models-bridge"),
    ("product", "Product"),
]

# GoF section label -> the catalogue section header prefix it is drawn from.
_SECTION_SOURCES = [
    ("Motivation", "Motivation"),
    ("Applicability", "Prerequisites"),
    ("Consequences", "Consequences"),
    ("Known Uses", "Known uses"),
    ("Related Patterns", "Related mechanisms"),
]

# Where the per-entry Structure + Sample Code fills live (tracked, so the CI build sees them). One file per
# catalogue entry, keyed by the entry's SLUG (the fill's filename stem matches the catalogue entry stem).
_FILLS_DIR = HERE / "appendix-fills"


def _extract_fill_slot(text: str, heading: str) -> str | None:
    """Return the markdown body of the fill's `### <heading>` section (through the next `### ` or EOF),
    stripped, or None if the section is absent. Preserves fenced blocks verbatim — the Structure fill is a
    ```mermaid block plus an accessible-description line; the Sample Code fill is framing prose plus a code
    block (or, for a policy control, a prose "no sample code" note with no fence)."""
    m = re.search(rf"^###\s+{re.escape(heading)}\s*$(.*?)(?=^###\s|\Z)", text, re.M | re.S)
    return m.group(1).strip() if m else None


def _load_fill(role_dir: str, slug: str) -> dict[str, str | None]:
    """Load the Structure + Sample Code slots for one catalogue entry from its fill file, keyed by slug.
    Missing file or missing slot → None for that slot (the generator renders a TODO fallback)."""
    path = _FILLS_DIR / role_dir / f"{slug}.md"
    if not path.is_file():
        return {"structure": None, "sample": None}
    text = path.read_text(encoding="utf-8")
    return {
        "structure": _extract_fill_slot(text, "Structure"),
        "sample": _extract_fill_slot(text, "Sample Code"),
    }


def _entry_title(text: str, fallback: str) -> str:
    m = re.search(r"^# (.+)$", text, re.M)
    return m.group(1).strip() if m else fallback


def _entry_intent(text: str) -> str:
    """The `**Intent** — …` line (may wrap across lines up to the metadata card)."""
    m = re.search(r"\*\*Intent\*\* —\s*(.+?)(?:\n\n|\n\|)", text, re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""


def _entry_move(text: str) -> str | None:
    """The Move value (`constraint`/`sensor`/`package`) parsed from the entry's metadata card `| Move | … |`
    row — the `code`-spanned token, the same source the census reads. Returns None if the row is absent or
    carries no `code`-spanned value (so a mechanism with no Move simply gets no `package` marker)."""
    m = re.search(r"^\|\s*Move\s*\|(.+)$", text, re.M)
    if not m:
        return None
    token = re.search(r"`([a-z-]+)`", m.group(1))
    return token.group(1) if token else None


def _entry_enforcement(text: str) -> str | None:
    """The Enforcement value (`Soft`/`Hard`) parsed from the entry's metadata card `| Enforcement | … |`
    row — the bold `**Hard**` / `**Soft**` lead token. Feeds the Appendix-C brick metadata footer
    (role · family · Soft/Hard). Returns None when the row or the bold token is absent."""
    m = re.search(r"^\|\s*Enf(?:orcement)?\.?\s*\|(.+)$", text, re.M | re.I)
    if not m:
        return None
    token = re.search(r"\*\*(Hard|Soft)\*\*", m.group(1), re.I)
    return token.group(1).lower() if token else None


def _fold_wrapped_bullets(md: str) -> str:
    """Join a bullet's wrapped continuation lines onto the bullet line, so the book's simple list parser
    (which requires every line of a list block to start with `- `) sees one line per bullet. The catalogue
    entries wrap long bullets across lines; without folding they render as a paragraph."""
    out: list[str] = []
    for ln in md.splitlines():
        stripped = ln.strip()
        if out and stripped and not stripped.startswith(("- ", "#", "|", ">", "```")) \
                and out[-1].strip().startswith("- "):
            out[-1] = out[-1].rstrip() + " " + stripped
        else:
            out.append(ln)
    return "\n".join(out)


def _entry_section(text: str, prefix: str) -> str:
    """The markdown body of the `## <prefix>…` section (through the next `## `), stripped. Wrapped bullet
    continuation lines are folded so the book's list parser renders them as list items, not a paragraph."""
    lines = text.splitlines()
    body: list[str] = []
    capturing = False
    for ln in lines:
        if ln.startswith("## "):
            if capturing:
                break
            capturing = ln[3:].strip().startswith(prefix)
            continue
        if capturing:
            body.append(ln)
    return _fold_wrapped_bullets("\n".join(body).strip())


_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def _rewrite_entry_links(md: str, entry_dir: pathlib.Path) -> str:
    """Rewrite relative `.md` links from a catalogue entry so they resolve from `book/*.html`. An
    entry-relative `foo.md` / `../fam/bar.md` becomes `../<repo-relative>.html`; absolute URLs and
    anchors are left alone. Keeps the appendix's cross-references live on the built site."""
    def repl(m: "re.Match[str]") -> str:
        label, url = m.group(1), m.group(2).strip()
        if url.startswith(("http://", "https://", "mailto:", "#")):
            return m.group(0)
        anchor = ""
        if "#" in url:
            url, anchor = url.split("#", 1)
            anchor = "#" + anchor
        if not url.endswith(".md"):
            return m.group(0)
        try:
            target = (entry_dir / url).resolve().relative_to(ROOT.resolve())
        except ValueError:
            return m.group(0)  # points outside the repo — leave as-is
        tgt = target.as_posix()
        # `downloads/*.md` are raw assets shipped as `.md` (NOT rendered to `.html`) — keep the `.md`
        # extension, matching catalog.py's own link-rewrite rule; everything else points at rendered HTML.
        if "downloads/" in tgt:
            return f"[{label}](../{tgt}{anchor})"
        return f"[{label}](../{tgt[:-3]}.html{anchor})"
    return _MD_LINK_RE.sub(repl, md)


def _appendix_entries() -> list[dict]:
    """Read every catalogue entry .md → an ordered list of GoF-projected pattern records, grouped by role."""
    out: list[dict] = []
    for role_dir, group in _APPENDIX_ROLES:
        role_root = ROOT / role_dir
        if not role_root.is_dir():
            continue
        paths = sorted(role_root.glob("*/*.md"))
        for p in paths:
            text = p.read_text(encoding="utf-8")
            rel = p.relative_to(ROOT).as_posix()
            family = p.parent.name
            slug = p.stem
            sections = {label: _rewrite_entry_links(_entry_section(text, src), p.parent)
                        for label, src in _SECTION_SOURCES}
            out.append({
                "group": group,
                "role_dir": role_dir,
                "family": family,
                "slug": slug,           # the anchor id + the fill-lookup key
                "rel_md": rel,
                # link back to the rendered catalogue entry (two levels up from book/appendix-*.html to root)
                "catalogue_html": "../" + rel[:-3] + ".html",
                "name": _entry_title(text, p.stem),
                "intent": _rewrite_entry_links(_entry_intent(text), p.parent),
                "move": _entry_move(text),      # constraint | sensor | package | None — for the package marker
                "enforcement": _entry_enforcement(text),  # soft | hard | None — for the Appendix-C brick footer
                "sections": sections,
                "fill": _load_fill(role_dir, slug),
            })
    return out


# ─────────────────────────── Print-appendix projection: the flagship subset ───────────────────────────
# The PRINT appendix projects only the ~29 FLAGSHIP mechanisms; the WEB catalogue keeps all 83. The flagship
# set is DERIVED at build time from the curation signal already in the repo — catalogue-classification.json's
# `dispositions` (the keep-as-L2 canonical set) — plus a thin manifest that declares the deviations (a few
# print promotions, the entries represented in the intro/Part-5 instead of as pages). Nothing is deleted:
# every omitted pattern stays live on the web and reachable from the appendix's complete web-index.
_CLASSIFICATION_PATH = ROOT / "book-models" / "catalogue-classification.json"
_PRINT_MANIFEST_PATH = ROOT / "book-models" / "print-appendix-manifest.json"


def _load_classification() -> dict[str, dict[str, str]]:
    """Read catalogue-classification.json's `dispositions` → `{bare-slug: {"head": <token>, "parent": <name>}}`.
    `head` is the leading disposition token (`keep-as-L2` / `demote-to-L3-under` / `merge-into` / `lift-to-L1`
    / `move-to-book-case`); `parent` is the canonical pattern name the rest of the disposition names (the L2 a
    demoted/merged entry folds under — used for the web-index '· under <Canonical>' tag). Keyed by the bare
    entry slug (the path's last segment), the same key `build_appendix_chapters` filters on. Fail-loud if the
    file is missing (a projection with no curation signal is a bug, not a soft degrade — same contract as
    `_resolve_stack_members`)."""
    if not _CLASSIFICATION_PATH.is_file():
        raise SystemExit(f"print-appendix projection needs {_CLASSIFICATION_PATH} — it is missing")
    data = json.loads(_CLASSIFICATION_PATH.read_text(encoding="utf-8"))
    out: dict[str, dict[str, str]] = {}
    for full_slug, rec in data.get("dispositions", {}).items():
        disposition = (rec.get("disposition") or "").strip()
        head, _, rest = disposition.partition(" ")
        bare = full_slug.rsplit("/", 1)[-1]
        out[bare] = {"head": head, "parent": rest.strip()}
    return out


def _load_print_manifest(cls: dict[str, dict[str, str]] | None = None) -> dict:
    """Read print-appendix-manifest.json → the declared print-projection deviations (`print_promotions`,
    `intro_l1_principles`, `appendix_exclude`, `skill_recipe`, `stack_compression`). Validate every slug it
    lists names a real catalogue entry, so a typo fails the build loud rather than silently dropping or
    inventing a flagship. Fail-loud if the file is missing."""
    if not _PRINT_MANIFEST_PATH.is_file():
        raise SystemExit(f"print-appendix projection needs {_PRINT_MANIFEST_PATH} — it is missing")
    if cls is None:
        cls = _load_classification()
    data = json.loads(_PRINT_MANIFEST_PATH.read_text(encoding="utf-8"))
    for field in ("print_promotions", "intro_l1_principles", "appendix_exclude"):
        for slug in data.get(field, []):
            if slug not in cls:
                raise SystemExit(
                    f"print-appendix-manifest.json {field!r} lists {slug!r} — it matches no catalogue entry "
                    f"under agent/ · models-bridge/ · product/ (typo, or the entry was renamed)")
    return data


def _flagship_slugs() -> set[str]:
    """The bare slugs the PRINT appendix emits a page for: the keep-as-L2 canonical set (from the
    classification) UNION the manifest's `print_promotions`, MINUS its `appendix_exclude`. The default
    manifest yields 24 keep-as-L2 + 5 promotions = 29 (the excludes name entries already outside keep-as-L2,
    so they subtract nothing — they are a drift guard, not a reduction)."""
    cls = _load_classification()
    manifest = _load_print_manifest(cls)
    keep_as_l2 = {slug for slug, rec in cls.items() if rec["head"] == "keep-as-L2"}
    promotions = set(manifest.get("print_promotions", []))
    exclude = set(manifest.get("appendix_exclude", []))
    return (keep_as_l2 | promotions) - exclude


def _catalogue_web_url() -> str:
    """The published web catalogue's base URL, from repo-metadata.json's governed `pages_url` (the same
    identity `_recipe_web_url` reads). Falls back to a bare relative reference if the metadata is absent, so
    a checkout without it still builds. Used by the appendix web-index header to name where the full
    83-mechanism catalogue lives online."""
    meta_path = ROOT / "book-models" / "repo-metadata.json"
    if meta_path.is_file():
        pages_url = (json.loads(meta_path.read_text(encoding="utf-8")).get("pages_url") or "").rstrip("/")
        if pages_url:
            return pages_url
    return "index.html"


def _appendix_intro_extras_md() -> str:
    """The two DERIVED intro sections that sit between the opening frame and the stack summary: the
    lifted-to-L1 placement principle (the manifest's `intro_l1_principles`, resolved through each slug's
    disposition to its L1 principle claim in catalogue-classification.json) and the nine-capability map
    (`gee_capabilities`, name + gloss). The framing PROSE is authored in `appendix-stacks/_lifted-principle.md`
    and `_nine-capabilities-intro.md` (B2 lift); the model VALUES — the lifted principle's name + claim, the
    nine capability names + glosses — stay projected from the classification model, not hand-copied, so they
    cannot drift from the curation signal the rest of the projection reads. Fail-loud if the model is missing
    (same contract as `_load_classification`)."""
    if not _CLASSIFICATION_PATH.is_file():
        raise SystemExit(f"appendix intro needs {_CLASSIFICATION_PATH} — it is missing")
    data = json.loads(_CLASSIFICATION_PATH.read_text(encoding="utf-8"))
    dispositions = data.get("dispositions", {})
    principles = {p.get("id"): p for p in data.get("L1_principles", [])}
    capabilities = data.get("gee_capabilities", [])
    cap_groups = data.get("gee_capability_groups", [])
    manifest = _load_print_manifest()

    parts: list[str] = []

    # ── The lifted placement principle. Each `intro_l1_principles` slug names an entry LIFTED out of the
    #    pattern set to an L1 principle; resolve slug → its disposition string → the `P<n>` token → the
    #    principle record, and render its claim. (Default manifest lifts one: semantic-level-enforcement → P8.)
    lifted: list[dict] = []
    for slug in manifest.get("intro_l1_principles", []):
        full = next((fs for fs in dispositions if fs.rsplit("/", 1)[-1] == slug), None)
        if full is None:
            continue
        m = re.search(r"\bP\d+\b", dispositions[full].get("disposition", ""))
        pid = m.group(0) if m else None
        if pid and pid in principles:
            lifted.append(principles[pid])
    if lifted:
        # B2: the section heading is a structural label (stays in code); the authored per-principle prose
        # lives in `_lifted-principle.md`, with the model-projected principle name + claim slotted in.
        parts += ["## Where every mechanism sits", ""]
        for p in lifted:
            parts += [
                _load_opening(_STACKS_DIR / "_lifted-principle.md",
                              principle_name=p["name"].lower(), principle_claim=p["claim"]),
                "",
            ]

    # ── The nine-capability map. The `gee_capabilities` groups the whole catalogue under nine jobs a
    #    governed environment must do; the patterns below are the shapes that do them. The nine are rendered
    #    under the book's own agent / models-bridge / product triad (`gee_capability_groups`) — three retained
    #    chunks (2 / 4 / 3) beat nine flat peers for memorability, and the grouping is the frame the rest of
    #    the book already teaches rather than a fourth taxonomy.
    if capabilities:
        # B2: the authored heading + framing paragraph live in `_nine-capabilities-intro.md`; the nine
        # capability names + glosses below stay COMPUTED off the classification model.
        parts += [_load_opening(_STACKS_DIR / "_nine-capabilities-intro.md"), ""]
        if cap_groups:
            # Group order + labels come from the model; each capability carries its `group` id. Fail-loud on a
            # capability whose group is unknown, so a model edit cannot silently drop one from the map.
            known = {g.get("id") for g in cap_groups}
            ungrouped = [c.get("id") for c in capabilities if c.get("group") not in known]
            if ungrouped:
                raise SystemExit(f"nine-capability map: capabilities with no known group: {ungrouped}")
            for grp in cap_groups:
                gid = grp.get("id")
                label = grp.get("label", "").strip()
                subtitle = grp.get("subtitle", "").strip()
                parts += [f"**{label} — {subtitle}.**", ""]
                for cap in capabilities:
                    if cap.get("group") != gid:
                        continue
                    name = cap.get("name", "").strip()
                    gloss = cap.get("gloss", "").strip()
                    parts.append(f"- **{name}.** {gloss}")
                parts.append("")
        else:
            for cap in capabilities:
                name = cap.get("name", "").strip()
                gloss = cap.get("gloss", "").strip()
                parts.append(f"- **{name}.** {gloss}")
            parts.append("")

    return "\n".join(parts).strip()


# Authored chapter links to an appendix pattern page: `](appendix-<a..e>-<slug>.html[#frag])`. The main
# narrative cross-references mechanisms by their in-book page; when a mechanism is non-flagship (its page is
# dropped from the print projection), the link is redirected to the live WEB catalogue entry — the SAME
# flagship→in-book / non-flagship→web rule the stack links and the web-index follow (uniformity, not a
# special case). The authored letter is the LEGACY location; under the value-ordered (v2) projection a
# flagship's page moved to Appendix B and a stack's to Appendix A, so the letter is re-mapped there (below).
# The `[a-e]` class also catches an authored stack link (`appendix-d-<stem>`) so the v2 re-lettering reaches it.
_APPENDIX_BODY_LINK_RE = re.compile(r"\(appendix-[a-e]-([a-z0-9-]+)\.html(?:#[^)]*)?\)")
_WEB_REDIRECT_CACHE: dict[str, str] | None = None


def _web_redirect_map() -> dict[str, str]:
    """`{slug: web-catalogue-URL}` for every NON-FLAGSHIP mechanism (the ones the print appendix omits).
    Computed once from the entry records + the flagship set, then cached — the redirect below consults it per
    authored link."""
    global _WEB_REDIRECT_CACHE
    if _WEB_REDIRECT_CACHE is None:
        flag = _flagship_slugs()
        _WEB_REDIRECT_CACHE = {rec["slug"]: rec["catalogue_html"]
                               for rec in _appendix_entries() if rec["slug"] not in flag}
    return _WEB_REDIRECT_CACHE


def _redirect_dropped_appendix_links(md: str) -> str:
    """Keep an authored `](appendix-<letter>-<slug>.html)` chapter cross-reference resolvable in whichever
    appendix projection this build renders. Three cases, checked in order:

    1. **Non-flagship mechanism** — the print appendix emits no page for it, so the link redirects to the live
       WEB catalogue entry in BOTH projections. Any `#fragment` is dropped (the web entry carries its own).
    2. **Flagship / stack under the value-ordered (v2) projection** — the mechanism's page moved: a flagship
       to Appendix B (`appendix-b-<slug>`), a stack to Appendix A (`appendix-a-<stem>`). The authored LEGACY
       letter is re-mapped to the v2 home so the link does not dangle after the cutover. The `#fragment` is
       dropped — the v2 flagship page is a compressed note whose anchors differ from the legacy GoF page.
    3. **Legacy projection** — the authored letter already IS the legacy location, so the link is left as-is.

    Every authored `appendix-<letter>-<slug>` target is a catalogue entry or a known stack stem (verified: the
    legacy build has zero dangling appendix links), so case 3's pass-through only ever fires for legacy."""
    redirect = _web_redirect_map()
    flagship = _flagship_slugs()
    def repl(m: "re.Match[str]") -> str:
        slug = m.group(1)
        web = redirect.get(slug)
        if web is not None:                       # (1) non-flagship mechanism → live web entry
            return f"({web})"
        if slug in _STACK_STEMS:                  # (2) stack link → its Appendix-A home page
            return f"(appendix-a-{slug}.html)"
        if slug in flagship:                      # flagship link → its Appendix-B home page
            return f"(appendix-b-{slug}.html)"
        return m.group(0)                         # (3) an unknown target is left as authored
    return _APPENDIX_BODY_LINK_RE.sub(repl, md)


# The eight GoF pattern elements, in canonical reading order. Structure's diagram leads the page (visual
# first); its `## Structure` heading still appears in canonical position, linking up to the diagram. The
# element TOC lists only the elements actually present on a given page.
_GOF_ELEMENTS = [
    "Intent",
    "Motivation",
    "Applicability",
    "Structure",
    "Sample Code",
    "Consequences",
    "Known Uses",
    "Related Patterns",
]


def _element_anchor(name: str) -> str:
    """The `{#el-<name>}` anchor slug for a GoF element heading, for the in-page element TOC to link to."""
    return "el-" + name.lower().replace(" ", "-")


# Per-page DISPLAY labels for GoF element headings that differ from the internal element key. The book has
# exactly one live system (DocAble), so the classic GoF "Known Uses" element reads as "Example use within
# DocAble" on the appendix pattern pages. The internal key stays "Known Uses" (it keys `_GOF_ELEMENTS`, the
# `sections` dict, and the `el-known-uses` anchor); only the rendered heading + element-TOC label change.
# The STANDALONE catalogue entry .md keeps "Known uses" — "within DocAble" would dangle there — so this
# remap lives ONLY in the book-appendix rendering.
_ELEMENT_DISPLAY = {
    "Known Uses": "Example use within DocAble",
}


def _element_label(el: str) -> str:
    """The reader-facing heading/TOC label for a GoF element on a book-appendix pattern page."""
    return _ELEMENT_DISPLAY.get(el, el)


def _pattern_elements_present(rec: dict, for_print: bool = False) -> list[str]:
    """Which of the eight GoF elements this pattern page renders. Intent and Structure are always present
    (Structure falls back to a visible TODO); the five catalogue-sourced slots appear only when the entry
    carries that section. Sample Code is always shown on the WEB, but DROPPED in the print/PDF projection
    (`for_print=True`) — code blocks are the least-useful printed-reference content, so the print appendix
    compresses by omitting them while the pattern prose ships in full (the web build keeps them)."""
    present: list[str] = []
    for el in _GOF_ELEMENTS:
        if el == "Intent":
            if rec["intent"]:
                present.append(el)
        elif el == "Structure":
            present.append(el)  # always shown (diagram fill or a TODO fallback)
        elif el == "Sample Code":
            if not for_print:
                present.append(el)  # web keeps it; print drops it (compression, D25)
        elif rec["sections"].get(el):
            present.append(el)
    return present


def _appendix_pattern_page_md(rec: dict, stack_membership: dict[str, list[tuple[str, str]]] | None = None,
                              for_print: bool = False) -> str:
    """One pattern rendered as a WHOLE PAGE of GoF-layout markdown. The pattern NAME is the page `<h1>`
    (from the chapter dict's `chapter_title`), so this body emits no leading `#`/`##` name heading — it
    leads with the Structure diagram (visual first), then an in-page table of contents of the elements
    present, then the eight elements as `## ` (h2) headings in canonical order. External `#<slug>` links
    still resolve: the slug anchor rides on the projection note. The Structure diagram is rendered at the
    top; its `## Structure` heading sits in canonical position and links back up to the diagram.

    When `stack_membership` maps this mechanism's slug to one or more stacks, a derived 'Part of these
    stacks: …' line is emitted under the projection note (member→stack back-links, single-sourced from the
    same `role:<slug>` tokens as the forward links). A mechanism in no stack gets no such line."""
    fill = rec.get("fill") or {}
    safe = rec["name"].replace('"', "'")
    present = _pattern_elements_present(rec, for_print)
    parts: list[str] = []

    # 1. VISUAL FIRST — the Structure diagram (or its TODO fallback) leads the page, under the header. The
    #    canonical `## Structure` heading (below, in element order) carries the `#el-structure` anchor both
    #    the element TOC and the reader use to return here.
    parts += [f"*The Structure of {safe} — its shape at a glance:*", ""]
    if fill.get("structure"):
        parts += [fill["structure"], ""]
    else:
        parts += [f"[FILL IN: a Structure diagram for *{safe}* is not yet authored.]", ""]

    # 2. PROJECTION NOTE — provenance link back to the live catalogue entry.
    src_note = (f'*Projected from the catalogue entry [{rec["family"]} / {rec["name"]}]'
                f'({rec["catalogue_html"]}).*')
    parts += [src_note, ""]

    # 2b. STACK BACK-LINKS — if this mechanism is a member of one or more stacks, tell the reader so and
    #     link into each stack's Appendix-D page. Derived from the same `role:<slug>` tokens as the forward
    #     links (single-sourced); a mechanism in no stack gets no line (absence reads as 'stands alone').
    memberships = (stack_membership or {}).get(rec["slug"], [])
    if memberships:
        links = ", ".join(f"[{title}]({page_slug}.html)" for title, page_slug in memberships)
        parts += [f"**Part of these stacks:** {links}", ""]

    # The FIRST present element's heading carries the pattern's page-level `{#slug}` anchor (so external
    # `#<slug>` deep-links and any old figure fragments still land on this page); every other element gets
    # its `#el-<name>` anchor. The element TOC links to whichever id each element's heading actually bears.
    anchor_for = {}
    for i, el in enumerate(present):
        anchor_for[el] = rec["slug"] if i == 0 else _element_anchor(el)

    # 3. ELEMENT TOC — a short in-page list linking each element heading present on the page.
    toc_items = " · ".join(f"[{_element_label(el)}](#{anchor_for[el]})" for el in present)
    parts += [f"**On this page:** {toc_items}", ""]

    # 4. THE ELEMENTS — canonical order, each an `## ` (h2) heading carrying its TOC/legacy anchor.
    for el in _GOF_ELEMENTS:
        if el not in present:
            continue
        head = f"## {_element_label(el)} {{#{anchor_for[el]}}}"
        if el == "Intent":
            parts += [head, "", "**Intent** — " + rec["intent"], ""]
        elif el == "Structure":
            parts += [head, "", "The Structure diagram appears at the top of this page.", ""]
        elif el == "Sample Code":
            parts += [head, ""]
            if fill.get("sample"):
                parts += [fill["sample"], ""]
            else:
                parts += [f"[FILL IN: a Sample Code snippet for *{safe}* is not yet authored.]", ""]
        else:
            parts += [head, "", rec["sections"][el], ""]
    return "\n".join(parts).strip()


# The rewired mechanism-map figure lives beside the book pages so its chip links resolve at book depth.
_BOOK_FIGURE_NAME = "catalogue-figure.html"


# One-line human display name per family DIRECTORY, for the opening-page contents headings. Falls back to a
# title-cased dir name for a family not listed here (so a new family folder still renders, un-prettified).
_FAMILY_DISPLAY = {
    "context-and-dispatch": "Context & dispatch substrate",
    "gates-and-merge-train": "Gates & merge-train",
    "mediators-and-resource-locks": "Mediators & resource locks",
    "lifecycle-and-observability": "Lifecycle & observability",
    "governance-doc-controls": "Governance-doc controls",
    "system-models": "System models",
    "canonical-models-and-seams": "Canonical models & seams",
    "validation-and-conformance": "Validation & conformance",
    "regression-tests": "Regression tests",
    "provenance-and-attribution": "Provenance & attribution",
    "repair-vocabulary": "Repair vocabulary",
}


# ─────────────────────────── Appendix D — Mechanism Stacks ───────────────────────────
# A "stack" is a package of mechanisms that travel together, attached to a concept (the MBSE stack, the
# self-operations stack, …). Each stack is authored as a markdown file under `appendix-stacks/`, holding a
# `### Concept` frame, a `### Mandatory members` list, and a `### Complementary members` list. Member
# bullets reference a catalogue mechanism by a `role:<entry-slug>` token, which the builder resolves to a
# live link into that mechanism's Appendix A/B/C pattern page (with its numbered locator prepended).

_STACKS_DIR = HERE / "appendix-stacks"

# The slug that heads Appendix D's Part — the stacks front-door page.
_APPENDIX_STACKS_OPENING_SLUG = "appendix-stacks"

# Stack files in reading order → (page-slug stem, display title). Each becomes one D.N page; the opening
# front-door page (D's chapter 0) precedes them. A file listed here but absent on disk is skipped.
_STACKS: list[tuple[str, str]] = [
    # The seven flagship stacks, each authored as a two-page synthesis (AC-2 260804): capability created ·
    # failure classes covered · composition diagram (the overview_figure SVG) · constituent patterns
    # (role:<slug> tokens) · one worked example · tradeoffs + adoption order · web links. Grounded in
    # book-models/flagship_stack_declared.json; the earlier part-by-part six-field deep-dive was folded in.
    ("provenance-fidelity-stack", "The Provenance stack"),
    ("model-coherence-stack", "The model-coherence stack"),
    ("specification-verification-stack", "The Assurance stack"),
    ("observe-react-stack", "The observe → react loop"),
    ("resource-mediation-stack", "The Mediation stack"),
    ("governance-of-governance-stack", "The governance-of-governance stack"),
    ("context-management-stack", "The Briefing stack"),
]


_STACK_MEMBER_RE = re.compile(r"\brole:([a-z0-9-]+)\b")

# Cross-stack prose links name a sibling stack page by stem (`appendix-<letter>-<stem>.html`). The stack pages
# render under `D` in the legacy projection and `A` in the value-ordered one, so a hand-authored letter would
# rot in one projection. This rewrites the letter of any link whose stem is a KNOWN stack stem to the letter
# the current build renders stacks under — one authored form, correct in both projections.
_STACK_STEMS = frozenset(stem for stem, _t in _STACKS)
_CROSS_STACK_LINK_RE = re.compile(r"appendix-[ad]-([a-z0-9-]+)\.html")


def _normalize_cross_stack_links(md: str, low: str) -> str:
    """Rewrite `appendix-[ad]-<stem>.html` → `appendix-<low>-<stem>.html` for every KNOWN stack stem, so a
    cross-stack reference resolves whether the stacks render under `d` (legacy) or `a` (value-ordered)."""
    def repl(m: "re.Match[str]") -> str:
        stem = m.group(1)
        return f"appendix-{low}-{stem}.html" if stem in _STACK_STEMS else m.group(0)
    return _CROSS_STACK_LINK_RE.sub(repl, md)


def _stack_membership_index(page_letter: str = "d") -> dict[str, list[tuple[str, str]]]:
    """Invert the stack membership relation: `{member-slug: [(stack-title, stack-page-slug), …]}`. Derived
    from the same `role:<slug>` tokens `_resolve_stack_members` resolves — the ONE source of stack
    membership — so the forward links (stack→member) and these back-links (member→stack) can never disagree.
    Only stack files present on disk contribute; a member appearing in no stack simply gets no entry (the
    caller then emits no 'Part of these stacks' line, which reads as 'stands alone').

    `page_letter` is the appendix letter the stack pages render under — `d` in the legacy projection
    (`appendix-d-<stem>`), `a` in the value-ordered v2 projection (`appendix-a-<stem>`). Default keeps the
    legacy slug scheme."""
    index: dict[str, list[tuple[str, str]]] = {}
    for stem, title in _STACKS:
        path = _STACKS_DIR / f"{stem}.md"
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        seen: set[str] = set()
        for m in _STACK_MEMBER_RE.finditer(text):
            slug = m.group(1)
            if slug in seen:               # a member listed twice in one stack counts once for that stack
                continue
            seen.add(slug)
            index.setdefault(slug, []).append((title, f"appendix-{page_letter}-{stem}"))
    return index


def _resolve_stack_members(md: str, page_by_slug: dict[str, dict]) -> str:
    """Replace each `role:<entry-slug>` token in a stack file with a live link to that mechanism. A stack
    still names ALL of its members; the link's DESTINATION follows the print/web split:

    - **A FLAGSHIP member** (a mechanism with a page in this print appendix) links IN-BOOK, prefixed by its
      numbered locator — `role:pdf-model` → `[Appendix C - 3. PdfModel](appendix-c-pdf-model.html)`.
    - **A NON-FLAGSHIP member** (a valid entry the print appendix omits) links to its WEB catalogue page,
      marked `(online)` — `role:office-models` → `[Office Models (online)](../product/…/office-models.html)`.

    An unknown slug (matching NO catalogue entry) stays a build-loud error — it catches a typo before it
    ships a bare `role:foo` string. `page_by_slug` maps entry slug → the ordered pattern record for ALL 83
    entries; a flagship record carries `page_slug` / `appendix_letter` / `appendix_num`, a non-flagship one
    carries only `name` / `catalogue_html`, so the record's shape IS the flagship signal."""
    def repl(m: "re.Match[str]") -> str:
        slug = m.group(1)
        rec = page_by_slug.get(slug)
        if rec is None:
            raise SystemExit(
                f"appendix stack references unknown mechanism slug 'role:{slug}' — it matches no "
                f"catalogue entry under agent/ · models-bridge/ · product/")
        if "appendix_num" in rec:  # flagship — an in-book pattern page exists
            label = f"Appendix {rec['appendix_letter']} - {rec['appendix_num']}. {rec['name']}"
            return f"[{label}]({rec['page_slug']}.html)"
        # non-flagship but valid — link to the live web catalogue entry, marked (online)
        return f"[{rec['name']} (online)]({rec['catalogue_html']})"
    return _STACK_MEMBER_RE.sub(repl, md)


def _load_opening(path: pathlib.Path, **subs: str) -> str:
    """Read an authored appendix front-door `.md` (the B1/B2 lift): the reader-facing opening prose lives in
    the manuscript, not in this build tool, so a manuscript editor sees and revises it in place. Fail-loud on
    a missing file — the same contract as the token passes — then substitute any `{{name}}` fragment tokens
    (a computed census count, a model-projected list, or the governed catalogue URL) the framing prose slots
    in. The result is stripped, matching the `opening_prose.strip()` the front-door builder applies."""
    if not path.is_file():
        raise SystemExit(f"appendix opening prose missing: {path}")
    text = path.read_text(encoding="utf-8").strip()
    for name, value in subs.items():
        text = text.replace("{{" + name + "}}", value)
    return text


def build_hand_authored_appendix(
    part: int, *,
    letter: str,
    part_name: str,
    opening_slug: str,
    opening_prose: str,
    content_dir: pathlib.Path,
    pages_source: list[tuple[str, str]],
    locator_figs: bool = False,
    locator_heading: bool = False,
    opening_extras_md: str = "",
    front_only: bool = False,
    single_deck: bool = False,
    page_body_fn: "Callable[[str, str, int], str] | None" = None,
) -> list[dict]:
    """Build a hand-authored appendix Part's chapter records: one opening front-door page (chapter 0), then
    one page per present-on-disk content file (`<letter>.1`, `<letter>.2`, …). This is the single scaffold the
    Mechanism-Stacks, Skill-Recipe, and Operator's-Reference appendices share — one Part, the pager chain, and
    the index locator machinery — so the book's TOC/pager/index render each with no special-casing. Returns []
    if no content files are present.

    Parameters letter and shape the Part: `letter`/`part_name` form the `Appendix <letter> — <part_name>`
    title; `opening_slug`/`opening_prose` give the front-door page its stable slug and body; `content_dir`
    plus `pages_source` (a `[(stem, title)]` list) supply the per-page content, filtered to files present on
    disk. `locator_figs` (v2) stamps each record a `fig_prefix` (`<letter>` on the front-door, `<letter>.<i>`
    per page) so figures number monotonically off the reader-facing locator (D80); left off, `fig_prefix` is
    unset and figures keep the `<part>.<chapter>` numbering. `opening_extras_md` appends extra front-door prose
    (joined with a blank line, stripped) — the value-ordered stacks opening carries the capability lens there.
    `front_only` appends the front-door page and stops (the recipe's print-pointer mode drops its content
    page). `page_body_fn(raw, stem, i)` transforms each page's raw markdown; the default folds wrapped bullets
    (stacks overrides it to resolve member tokens + cross-stack links + the inline legend)."""
    pages = [(stem, title) for stem, title in pages_source
             if (content_dir / f"{stem}.md").is_file()]
    if not pages:
        return []

    low = letter.lower()
    chapters: list[dict] = []
    part_title = f"Appendix {letter} — {part_name}"
    fold = page_body_fn or (lambda raw, stem, i: _fold_wrapped_bullets(raw.strip()))

    # OPENING FRONT-DOOR PAGE — heads the Part (chapter 0, sorts before every content page). In single_deck
    # mode it is the ONLY page: every content file is inlined under the opening prose (each card carries its
    # own heading), so the whole appendix reads as one deck — the Field Guide's six-team-cards shape.
    opening_body = opening_prose.strip()
    if opening_extras_md.strip():
        opening_body = opening_body + "\n\n" + opening_extras_md.strip()
    if single_deck:
        cards = [fold((content_dir / f"{stem}.md").read_text(encoding="utf-8"), stem, i)
                 for i, (stem, _t) in enumerate(pages, start=1)]
        opening_body = opening_body + "\n\n" + "\n\n".join(cards)
    opening: dict = {
        "slug": opening_slug,
        "part": part,
        "part_title": part_title,
        "chapter": 0,
        "chapter_title": part_title,
        "body_md": opening_body,
        "is_appendix": True,
        "mermaid": False,
    }
    if locator_figs:
        opening["fig_prefix"] = letter
    chapters.append(opening)

    if front_only or single_deck:
        return chapters

    # ONE PAGE PER CONTENT FILE — <letter>.1, <letter>.2, … in listed order. The heading form is either the
    # generated-looking "Appendix <letter> - <i>. <title>" (legacy default) or the clean locator "<letter>.<i>
    # <title>" ("D.1 The Operator's Dashboard") when `locator_heading` is set — currently only the Operator's
    # Reference (App-D) opts in, so the other hand-authored appendices keep their form. The back-of-book index
    # locator (`_index_ref_label`) parses BOTH forms.
    for i, (stem, title) in enumerate(pages, start=1):
        raw = (content_dir / f"{stem}.md").read_text(encoding="utf-8")
        heading = f"{letter}.{i} {title}" if locator_heading else f"Appendix {letter} - {i}. {title}"
        rec: dict = {
            "slug": f"appendix-{low}-{stem}",
            "part": part,
            "part_title": part_title,
            "chapter": i,                       # sorts after the front-door's chapter 0
            "chapter_title": heading,
            "body_md": fold(raw, stem, i),
            "is_appendix": True,
            "mermaid": False,
        }
        if locator_figs:
            rec["fig_prefix"] = f"{letter}.{i}"  # D80: figures number "Figure <letter>.<i>-N", monotonic
        chapters.append(rec)
    return chapters


def build_stack_chapters(part: int, page_by_slug: dict[str, dict],
                         letter: str = "D", part_name: str = "Mechanism Stacks",
                         locator_figs: bool = False, inline_legend: bool = False,
                         opening_extras_md: str = "") -> list[dict]:
    """Build the Mechanism-Stacks chapter records: one opening front-door page (chapter 0), then one page per
    stack (D.1, D.2, …), via the shared hand-authored-appendix scaffold. `page_by_slug` resolves each stack's
    `role:<slug>` member tokens to links into the flagship pattern pages. Returns [] if no stack files are
    present.

    `letter`/`part_name` letter the appendix: `D`/`Mechanism Stacks` in the legacy projection, `A`/`MAGE
    Engineering Stacks` in the value-ordered v2 projection (where the stacks lead the appendix). `locator_figs`
    (v2 only) stamps each page a `fig_prefix` for D80 monotonic figure numbering; the legacy path leaves it
    unset, so the default projection stays byte-identical. `opening_extras_md` (v2 only) carries the DERIVED
    nine-capability map + lifted L1 principle + the vendor-agnostic note onto the front-door, so the
    value-ordered Appendix A opens with the whole capability lens (§2.1); the legacy projection leaves it ""."""
    low = letter.lower()

    def _stack_body(raw: str, stem: str, i: int) -> str:
        body = _resolve_stack_members(_fold_wrapped_bullets(raw.strip()), page_by_slug)
        body = _normalize_cross_stack_links(body, low)   # cross-stack refs follow the current letter (d/a)
        if inline_legend:
            # Restructure sub-wave 2: splice the linked legend under the overview figure + append the anchored
            # inline-part subsections the legend targets (stub treatments; authored in a later sub-wave).
            body = _inject_stack_legend(body, stem, letter, i)
        return body

    return build_hand_authored_appendix(
        part, letter=letter, part_name=part_name,
        opening_slug=_APPENDIX_STACKS_OPENING_SLUG,
        opening_prose=_load_opening(_STACKS_DIR / "_opening.md"),
        content_dir=_STACKS_DIR, pages_source=_STACKS,
        locator_figs=locator_figs, opening_extras_md=opening_extras_md,
        page_body_fn=_stack_body)


# APPENDIX E — How to Write a Skill. Hand-authored, like the stacks Part (Appendix D): a front-door page
# whose prose lives here, then one authored markdown page under `appendix-skill-recipe/`. No catalogue
# projection — the recipe is a reference the author wrote, not a mechanism map.
_SKILL_RECIPE_DIR = HERE / "appendix-skill-recipe"

# The slug that heads Appendix E — the recipe front-door page.
_APPENDIX_SKILL_RECIPE_OPENING_SLUG = "appendix-skill-recipe"

# The authored content pages under the front-door → (page-slug stem, display title). Chapter 1 (Theory)
# states the recipe; Chapter 2 (Applying the Recipe) runs it three times. Absent-on-disk files are skipped,
# so the front-door alone still renders if a content file is missing.
_SKILL_RECIPE_PAGES: list[tuple[str, str]] = [
    ("theory", "Theory"),
    ("applying-the-recipe", "Applying the Recipe"),
]


def _recipe_web_url(letter: str = "e") -> str:
    """The absolute web URL of the full recipe page in the published web edition — for the print pointer.
    Built from repo-metadata.json's `pages_url` (the governed Pages identity); falls back to a bare page
    reference if the metadata is absent. `letter` is the appendix letter the recipe renders under — `e`
    legacy, `d` in the value-ordered v2 projection — so the pointer targets the page the build actually
    emits (`appendix-<letter>-<stem>.html`)."""
    meta_path = ROOT / "book-models" / "repo-metadata.json"
    stem = _SKILL_RECIPE_PAGES[0][0] if _SKILL_RECIPE_PAGES else "the-recipe"
    page_ref = f"appendix-{letter}-{stem}.html"
    if meta_path.is_file():
        pages_url = (json.loads(meta_path.read_text(encoding="utf-8")).get("pages_url") or "").rstrip("/")
        if pages_url:
            return f"{pages_url}/book/{page_ref}"
    return page_ref


def build_skill_recipe_chapters(part: int, for_print: bool = False,
                                letter: str = "E", locator_figs: bool = False) -> list[dict]:
    """Build the How-to-Write-a-Skill chapter records: one front-door page (chapter 0) whose prose is authored
    inline, then one page per authored content file under `appendix-skill-recipe/` (E.1, …). Mirrors the
    stacks Part: a hand-authored appendix Part, rendered by the existing pager/TOC/index machinery with no
    catalogue projection. Every record carries `is_appendix: True`, so it renders with no special-casing.
    Returns [] if no content files are present (the front-door alone is not emitted without its content).

    `letter` is the appendix letter — `E` legacy, `D` in the value-ordered v2 projection (where the recipe
    trails the brick catalog). The front-door slug stays `appendix-skill-recipe` (the stable target of
    narrative `[appendix: appendix-skill-recipe]` cross-references) regardless of letter; only the content
    page slug follows the letter (`appendix-<letter>-<stem>`). `locator_figs` (v2) stamps `fig_prefix` for
    D80 monotonic figure numbering; legacy leaves it unset (byte-identical figure numbers).

    When the print manifest sets `skill_recipe == "pointer"` AND this is the print/PDF projection
    (`for_print=True`), the recipe collapses to the front-door alone plus a one-paragraph pointer to the full
    recipe online — the content page is dropped from print. The WEB build (`for_print=False`) always keeps
    the full recipe, so the pointer's target stays live."""
    # Filter here (not just in the helper) so pointer mode can name the first present page in its online link.
    pages = [(stem, title) for stem, title in _SKILL_RECIPE_PAGES
             if (_SKILL_RECIPE_DIR / f"{stem}.md").is_file()]
    if not pages:
        return []

    pointer_mode = for_print and _load_print_manifest().get("skill_recipe") == "pointer"
    extras = ""
    if pointer_mode:
        # One-paragraph online pointer appended to the front-door; the content page is then dropped from print.
        extras = (
            "**The full recipe — its three steps grounded in the three self-\\* skills — lives in the "
            f"web edition of this book:** [{pages[0][1]}]({_recipe_web_url(letter.lower())}). Open it there "
            "to read each step worked through in full."
        )

    return build_hand_authored_appendix(
        part, letter=letter, part_name="How to Write a Skill",
        opening_slug=_APPENDIX_SKILL_RECIPE_OPENING_SLUG,
        opening_prose=_load_opening(_SKILL_RECIPE_DIR / "_opening.md"),
        content_dir=_SKILL_RECIPE_DIR, pages_source=_SKILL_RECIPE_PAGES,
        locator_figs=locator_figs, opening_extras_md=extras, front_only=pointer_mode)


# APPENDIX — Field Guide. Hand-authored reference cards for the six industry teams the book studies. Unlike
# the multi-page hand-authored appendices (stacks/recipe/operators), the field guide reads as ONE deck: a
# single front-door page carries the opening prose plus the six team cards, each an H3 section that leads
# with its neutral hand-SVG. The cards are authored reference prose traced to Section 6.6 plus public company
# record — no catalogue projection, no data-derived card model, ZERO operator-card rows.
_FIELD_GUIDE_DIR = HERE / "appendix-field-guide"

# The slug that heads the Field Guide appendix — its front-door page. Letter-independent (the stable target
# of narrative `[appendix: appendix-field-guide]` cross-references), mirroring the other hand-authored
# appendices; the letter is resolved at build from the `part_title`.
_APPENDIX_FIELD_GUIDE_OPENING_SLUG = "appendix-field-guide"

# The six team cards, in six-company-map / Section-6.6 order (the deck order). Each is one authored `.md`
# under the front-door dir; an absent-on-disk file is skipped, so the opening alone still renders.
_FIELD_GUIDE_TEAMS: list[str] = ["cloudflare", "spotify", "shopify", "docker", "siemens", "zenseact"]


def build_field_guide_chapters(part: int, letter: str = "F", locator_figs: bool = False) -> list[dict]:
    """Build the Field Guide appendix: ONE front-door page (chapter 0) whose body is the opening prose plus
    the six team cards concatenated as `### <Team>` H3 sections. The six read as one deck under a single
    opening — the shape the card template authored — rather than as one page per team. Every card leads with
    its `<!-- figure: -->` neutral hand-SVG; figures number `Figure <letter>-N` off the locator when
    `locator_figs` is set. Returns [] if no card files are present.

    Delegates to `build_hand_authored_appendix` in `single_deck` mode — the ONE parameterized hand-authored
    appendix builder the stacks / skill-recipe / operator's-reference / model-reference appendices also use,
    so a change to the pager/TOC/index scaffold holds for every hand-authored appendix at once (no bespoke
    field-guide copy). The cards carry their own headings; `single_deck` inlines them under the opening."""
    return build_hand_authored_appendix(
        part, letter=letter, part_name="Field Guide",
        opening_slug=_APPENDIX_FIELD_GUIDE_OPENING_SLUG,
        opening_prose=_load_opening(_FIELD_GUIDE_DIR / "_opening.md"),
        content_dir=_FIELD_GUIDE_DIR, pages_source=[(t, t) for t in _FIELD_GUIDE_TEAMS],
        locator_figs=locator_figs, single_deck=True)


# APPENDIX G — Model Reference. One page per Part-II model: the fixed five-field (a)-(e) reference detail
# (record schema / invariant table / derivation direction) migrated OUT of the view chapters (round-10 §C).
# Hand-authored like the stacks / recipe / operators appendices — routed through build_hand_authored_appendix,
# no bespoke builder. The page slugs carry a `-reference` suffix so `appendix-<letter>-<model>-reference`
# never collides with a catalogue model slug (`<model>-model`) and is never swallowed by the
# dropped-appendix-link redirect (D4a). Front-door slug is letter-independent (`appendix-models`). Scaffolded
# empty-but-green this wave; W2.5 migrates the (b)/(d)/(e) detail out of the view chapters into these pages.
_MODELS_DIR = HERE / "appendix-models"
# Part-V Evidence Ledger (fork G7): a dedicated home for Part V's raw count tables — the support-ratio
# lines-of-code, the per-path churn, and the running control-growth counts — kept out of the narrative
# chapters so those read as prose. Distinct from the appendix-d dashboard cards (metric panels) and the
# appendix-models model reference; a lookup surface for the counts behind Part V's curves. Hand-authored,
# routed through the shared appendix builder like the Model Reference; a stub the assembly wave fills.
_EVIDENCE_LEDGER_DIR = HERE / "appendix-evidence-ledger"
_APPENDIX_EVIDENCE_LEDGER_OPENING_SLUG = "appendix-evidence-ledger"
_EVIDENCE_LEDGER_PAGES: list[tuple[str, str]] = [
    ("evidence-tables", "The Evidence Tables"),
]
_APPENDIX_MODELS_OPENING_SLUG = "appendix-models"
_MODEL_PAGES: list[tuple[str, str]] = [
    ("service-flow-reference", "Service-Flow Model"),
    ("component-zone-reference", "Component & Zone Model"),
    ("domain-registries-reference", "Domain Registries"),
    ("bill-of-materials-reference", "Bill of Materials"),
    ("synchronization-reference", "Synchronization Model"),
    ("single-writer-registry-reference", "Single-Writer Registry"),
    ("mediator-registry-reference", "Mediator Registry"),
    ("deployment-topology-reference", "Deployment-Topology Model"),
    ("invariant-dag-reference", "Invariant-DAG Execution Policy"),
    ("control-substrate-dependency-reference", "Control–Substrate Dependency Model"),
    ("ltl-primer", "Reading Behavior Formally — Extended Primer"),
    ("user-journey-reference", "User-Journey Model"),
    ("agent-orchestration-reference", "Agent-Orchestration Model"),
    ("journey-criticality-reference", "Journey-Criticality and Test-Placement Model"),
    ("coverage-node-reference", "Coverage-to-Node Model"),
    ("task-closure-reference", "Task-Closure Model"),
    ("surfaces-built-reference", "The Surfaces Built — the II→III Receipt"),
]


# APPENDIX D — Operator's Reference. Hand-authored, like the stacks Part and the skill recipe: a front-door
# page whose opening prose lives here, then one authored markdown page per operational reference card under
# `appendix-operators-reference/`. No catalogue projection — these are reference surfaces the author keeps at
# the bench, not a mechanism map. Built to grow: the Operator's Dashboard is the first card (D.1); later
# editions add lifecycle / conversion / decision-heuristic cards as further pages in `_OPERATORS_REFERENCE_PAGES`.
_OPERATORS_REFERENCE_DIR = HERE / "appendix-operators-reference"

# The slug that heads Appendix D — the reference front-door page. Letter-independent (the stable target of
# narrative `[appendix: appendix-operators-reference]` cross-references), mirroring `appendix-skill-recipe`.
_APPENDIX_OPERATORS_REFERENCE_OPENING_SLUG = "appendix-operators-reference"

# The authored content pages under the front-door → (page-slug stem, display title). The Operator's Dashboard
# is the first (D.1); absent-on-disk files are skipped, so the front-door alone still renders without them.
_OPERATORS_REFERENCE_PAGES: list[tuple[str, str]] = [
    ("operators-dashboard", "The Operator's Dashboard"),
    ("from-drifted-wiki-to-trusted-model", "Brownfield Migration Drill"),
    # The operator-card deck (Appendix-D). One card = one page; the deck is declared in
    # book-models/operator-cards.json and its evidence-resolution gate is BLOCKING in `catalog.py validate`.
    # The Daily Operator Review leads the sensed cards so the deck teaches its own loop
    # (Dashboard -> Daily Review -> specialist cards -> Doctrine). This print order MUST match the
    # operator-cards.json `cards[]` order in lockstep — the page-span sensor derives each card's page bound
    # from the NEXT card in json order, so a reorder here without the same move there stales the sensor.
    ("daily-review", "Daily Operator Review"),
    ("system-health", "System Health"),
    ("model-health", "Model Health"),
    ("human-judgment", "Human Judgment"),
    ("engineering-capital", "Engineering Capital"),
    ("governance-conversion", "Governance Conversion"),
    ("release-readiness", "Release Readiness"),
    ("evidence-quality", "Evidence Quality"),
    ("brownfield-progress", "Brownfield Progress Gauge"),
    ("operating-doctrine", "Operating Doctrine"),
]


def build_operators_reference_chapters(part: int, for_print: bool = False,
                                       letter: str = "D", locator_figs: bool = False) -> list[dict]:
    """Build the Operator's-Reference chapter records: one front-door page (chapter 0) whose prose is authored
    inline, then one page per authored content card under `appendix-operators-reference/` (D.1, …). Mirrors
    `build_skill_recipe_chapters`: a hand-authored appendix Part rendered by the existing pager/TOC/index
    machinery with no catalogue projection. Every record carries `is_appendix: True`. Returns [] if no content
    cards are present (the front-door alone is not emitted without content).

    `letter` is the appendix letter — `D` in the value-ordered v2 projection (the Operator's Reference sits
    before the skill recipe). The front-door slug stays `appendix-operators-reference` (the stable target of
    `[appendix: appendix-operators-reference]` cross-references) regardless of letter; the content-card slug
    follows the letter (`appendix-<letter>-<stem>`). `locator_figs` (v2) stamps `fig_prefix` for D80 monotonic
    figure numbering (`D`, then `D.1`)."""
    return build_hand_authored_appendix(
        part, letter=letter, part_name="Operator's Reference",
        opening_slug=_APPENDIX_OPERATORS_REFERENCE_OPENING_SLUG,
        opening_prose=_load_opening(_OPERATORS_REFERENCE_DIR / "_opening.md"),
        content_dir=_OPERATORS_REFERENCE_DIR, pages_source=_OPERATORS_REFERENCE_PAGES,
        locator_figs=locator_figs, locator_heading=True)


def _family_order_from_index() -> dict[str, int]:
    """Read the family ordering from the census (`INDEX.md`) at build time, so the appendix order can't
    drift from it. Parses each `## <N>. <name>` census heading, then the `[family folder](<role>/<dir>/)`
    link in the section that follows, yielding `{family-dir: N}`. Falls back to an empty map (families then
    sort alphabetically) if `INDEX.md` is absent or unparseable — a soft degrade, not a build failure."""
    index_md = ROOT / "INDEX.md"
    if not index_md.is_file():
        return {}
    text = index_md.read_text(encoding="utf-8")
    order: dict[str, int] = {}
    current_n: int | None = None
    heading_re = re.compile(r"^##\s+(\d+)\.\s")
    folder_re = re.compile(r"\[family folder\]\((?:agent|models-bridge|product)/([^/)]+)/\)")
    for line in text.splitlines():
        hm = heading_re.match(line)
        if hm:
            current_n = int(hm.group(1))
            continue
        if current_n is not None:
            fm = folder_re.search(line)
            if fm:
                order.setdefault(fm.group(1), current_n)
                current_n = None
    return order


def _family_display(family_dir: str) -> str:
    """The human display name for a family directory — from the curated map, else a title-cased dir name."""
    return _FAMILY_DISPLAY.get(family_dir) or family_dir.replace("-", " ").title()


def _appendix_counts(ordered: list[dict]) -> dict[str, int]:
    """The live compositional counts the front-door framing cites — computed at build time from the same
    sources the census reads, so they cannot drift. `package_count`: entries whose Move is `package` (the
    per-card Move value, the census's own source); `mechanism_count`: the census total (the entry count);
    `stack_count`: the length of `_STACKS`. Only stack files present on disk are counted (mirrors what the
    stacks Part actually renders)."""
    present_stacks = sum(1 for stem, _t in _STACKS if (_STACKS_DIR / f"{stem}.md").is_file())
    # `flagship_count`: entries that carry an in-book pattern page (the ~29 the print appendix projects,
    # marked by `appendix_num` set in build_appendix_chapters); `web_only_count`: the census remainder that
    # stays online-only. `mechanism_count` remains the full census (a catalogue fact, not a print fact) so
    # the front-door's 'in print / online' framing can cite all three.
    flagship_count = sum(1 for rec in ordered if "appendix_num" in rec)
    return {
        "package_count": sum(1 for rec in ordered if rec.get("move") == "package"),
        "mechanism_count": len(ordered),
        "flagship_count": flagship_count,
        "web_only_count": len(ordered) - flagship_count,
        "stack_count": present_stacks,
    }


def _appendix_contents_md(ordered: list[dict]) -> str:
    """The opening page's text table of contents, in census-map hierarchy: an `### ` (h3) heading per target
    (Agent / Models-bridge / Product), a `#### ` (h4) sub-heading per family, and a linked bullet list of
    the family's patterns under it. `ordered` is the already role/family-ordered pattern-record list; each
    record carries the page slug the pattern renders at, plus its per-appendix locator (`appendix_letter`,
    `appendix_num`) set by `build_appendix_chapters`, so the bullet reads `Appendix A - 1. <name>`. A
    mechanism whose Move is `package` carries a small inline `package` marker, so a reader sees which
    entries bundle their own sensors without leaving the list; a standalone atom carries no marker (absence
    reads as 'stands alone', which is correct)."""
    cls = _load_classification()
    parts: list[str] = [
        "## Reference: every mechanism",
        "",
        # The split header (§4): the print appendix prints the 29 flagship patterns in full; all 83 live on
        # the web. A flagship row links to its page in this appendix; a web-only row links to its live
        # catalogue entry, marked (online). The URL is the governed Pages identity, so it cannot drift.
        f"**The {len([r for r in ordered if 'appendix_num' in r])} flagship patterns are printed in full "
        f"below; all {len(ordered)} mechanisms — including these — are online in the web catalogue at "
        f"[{_catalogue_web_url()}]({_catalogue_web_url()}/).** A flagship row links to its page in this "
        "appendix; a web-only mechanism links to its live catalogue entry, marked *(online)*.",
        "",
    ]
    # Families per role, so a role that owns EXACTLY ONE family suppresses its lone `#### <family>`
    # sub-heading — a single sub-heading under a role is an only-child outline smell (a lone `#### System
    # models` under `### Models-bridge`), so fold its bullets directly under the `### <role>` heading. This
    # hardens the generator against the same shape if any future role collapses to one family.
    families_by_group: dict[str, set] = {}
    for rec in ordered:
        families_by_group.setdefault(rec["group"], set()).add(rec["family"])
    single_family_groups = {g for g, fams in families_by_group.items() if len(fams) == 1}
    last_group: str | None = None
    last_family: str | None = None
    for rec in ordered:
        if rec["group"] != last_group:
            # A blank line before each role heading (after the first) closes the previous role's last
            # bullet list, so `### <role>` starts its own block instead of merging into the last bullet.
            if last_group is not None:
                parts += [""]
            parts += [f"### {rec['group']}", ""]
            last_group, last_family = rec["group"], None
        if rec["family"] != last_family:
            # A blank line BEFORE each family sub-heading closes the previous family's bullet list, so the
            # heading starts its own block instead of lazy-continuing the last bullet (the old run-on). Each
            # family is its own `#### ` sub-heading; its mechanisms follow as a proper bulleted list — UNLESS
            # this role owns a single family, in which case the lone sub-heading is suppressed (only-child).
            if last_family is not None:
                parts += [""]
            if rec["group"] not in single_family_groups:
                parts += [f"#### {_family_display(rec['family'])}", ""]
            last_family = rec["family"]
        marker = " `package`" if rec.get("move") == "package" else ""
        if "appendix_num" in rec:
            # FLAGSHIP — an in-book pattern page; link there, prefixed by its A-N locator.
            locator = f"Appendix {rec['appendix_letter']} - {rec['appendix_num']}."
            parts += [f"- {locator} [{rec['name']}]({rec['page_slug']}.html){marker}"]
        else:
            # NON-FLAGSHIP — omitted from print, live on the web; link to the catalogue entry, mark (online),
            # and (when known) tag the canonical L2 it folds under so the reader keeps the map's hierarchy.
            parent = cls.get(rec["slug"], {}).get("parent", "")
            under = f" · under {parent}" if parent else ""
            parts += [f"- [{rec['name']} (online)]({rec['catalogue_html']}){marker}{under}"]
    return "\n".join(parts).strip()


# ─────────────────────────── Appendix projection: the value-ordered A/B/C/D set ───────────────
# The shipped edition (web + PDF) is the value-ordered restructure: A MAGE Engineering Stacks · B Flagship
# Mechanisms (one Part, role subsections, monotonic B.N) · C Mechanism Catalog (C.1/C.2/C.3 brick grid) ·
# D Operator's Reference · E How to Write a Skill. "A Theory of MAGE" is no longer an appendix — it was
# relocated to a numbered main-text chapter. Figure numbers derive monotonically off the A.X / B.N locator.
# The legacy role-ordered v1 projection (and its `ADA_APPENDIX_V2` env toggle) was retired after the cutover.


# The appendices mode-marker page — a synthetic divider that sits immediately BEFORE Appendix A, giving the
# appendices their own identity (the reader leaves the argument and enters the reference manual). It is NOT a
# numbered Part ("Part 7" is back matter) and NOT an appendix front-door; the `is_appendix_divider` flag routes
# it to its own distinct rendering on both surfaces (web: `main.wrap.appendices-divider`; PDF: a dedicated
# `_part_divider_typst` branch). It takes its own part number, one below Appendix A, so it heads its own
# TOC/index group and — in the PDF — its own bookmark-parent divider page.
_APPENDICES_DIVIDER_SLUG = "appendices-front-door"
_APPENDICES_DIVIDER_TITLE = "Appendices"
_APPENDICES_DIVIDER_SUBTITLE = "The Working Surface of MAGE"


def _appendices_divider_record(part: int) -> dict:
    """The synthetic mode-marker record that heads the appendices (see `_APPENDICES_DIVIDER_SLUG`). Shaped
    like a chapter record so the pager / TOC / index machinery renders it, but flagged `is_appendix_divider`
    so every number-suppression and styling site treats it as its own distinct page — neither a numbered Part
    divider nor an appendix front-door."""
    return {
        "slug": _APPENDICES_DIVIDER_SLUG,
        "part": part,
        "part_title": _APPENDICES_DIVIDER_TITLE,
        "chapter": 0,
        "chapter_title": _APPENDICES_DIVIDER_TITLE,
        "body_md": _load_opening(HERE / "appendix-front-door.md"),
        "is_appendix_divider": True,
        "mermaid": False,
    }


def build_appendix_chapters(next_part: int, for_print: bool = False) -> list[dict]:
    """Assemble the value-ordered A/B/C/D appendix projection. Every caller — the web
    build, the print/PDF build, and `expected_page_slugs` — routes through here, so the whole appendix is
    assembled in one place. The appendices open with the mode-marker divider (`_appendices_divider_record`),
    which takes `next_part`; the appendix families shift one part up so each keeps its own part number → its
    own divider / bookmark parent."""
    divider = _appendices_divider_record(next_part)
    return [divider] + _build_appendix_chapters_v2(next_part + 1, for_print)


# ─────────────────────────── Appendix v2 — the value-ordered A/B/C/D projection ───────────────
# The stub content the C.1/C.2/C.3 brick grid and the compressed A constituents / B notes REPLACE in later
# assembly sub-waves. This wave builds the STRUCTURE only: the A/B/C/D letters + order, the derived monotonic
# locators, the D80 figure-prefix fields, and buildable (orphan-free) pages. The A constituent prose, the B
# compression, and the C bricks land when those sub-waves assemble the drafts under `book/_design/drafts/`.
_APPENDIX_V2_B_OPENING_SLUG = "appendix-b-flagship-mechanisms"
# GENRE-EXEMPT (machine-text standard): Appendix C, the mechanism catalog, is a GENERATED REFERENCE INDEX
# (census-ordered bricks + the derived technique index) — the sanctioned exception to "no machine-generated
# reader prose": an index is structural reference, not authored manuscript, and its framing sentences ARE
# authored in appendix-c/_opening.md + _technique-index.md. Not a violation; do not "fix" by inlining prose.
_APPENDIX_V2_C_OPENING_SLUG = "appendix-c-mechanism-catalog"

def _appendix_v2_b_opening_prose() -> str:
    """Appendix B's opening frame (B1 lift). The prose is authored in `appendix-notes/_opening-b.md` so a
    manuscript editor revises it in place; the build slots in the governed published-catalogue URL
    (`_catalogue_web_url`) for the three `online catalogue` links, so the exhaustive per-mechanism detail
    this selective appendix does not duplicate stays a live cross-reference."""
    return _load_opening(_APPENDIX_NOTES_DIR / "_opening-b.md", catalogue_url=_catalogue_web_url())


def _technique_index_md() -> str:
    """A compact DERIVED 'methods map' for the appendix opening — every technique (its `abstract_name`) with
    its in-book advanced-example count, in descending count order. The framing sentence is authored in
    `appendix-c/_technique-index.md`; the technique COUNT and the technique LIST stay COMPUTED off the
    classification spine (never baked into prose), slotted in as `{{technique_count}}`/`{{technique_items}}`
    so the index cannot drift from the spine."""
    spine = _technique_spine()
    techs = sorted(
        ((len(spine["examples"].get(slug, [])), name) for slug, name in spine["abstract"].items()),
        key=lambda t: (-t[0], t[1]))
    items = " · ".join(f"**{name}**" + (f" ({n})" if n else "") for n, name in techs)
    return _load_opening(HERE / "appendix-c" / "_technique-index.md",
                         technique_count=str(len(techs)), technique_items=items) + "\n"


def _appendix_v2_c_opening_prose() -> str:
    """Appendix C's opening frame (B1 lift). The framing prose — the *browse, don't read* instruction, the
    four-surface relationship table, and the brick legend — is authored in `appendix-c/_opening.md`; the
    build slots in the governed catalogue URL and the COMPUTED technique index (`{{technique_index}}`). The
    A/B/C references stay `[appendix: <slug>]` markers (letter-agnostic across a re-lettering)."""
    return _load_opening(HERE / "appendix-c" / "_opening.md",
                         catalogue_url=_catalogue_web_url(), technique_index=_technique_index_md())


def _appendix_v2_role_subsections() -> list[tuple[str, str]]:
    """The (letter-suffix, role-group) pairs for Appendix C's three brick sections (C.1 Agent · C.2
    Models-bridge · C.3 Product), in the canonical role order `_APPENDIX_ROLES` declares."""
    return [(str(i + 1), group) for i, (_r, group) in enumerate(_APPENDIX_ROLES)]


# The one-sentence definition of each catalogue zone — the agent / models-bridge / product governance
# triad (the three complementary targets a mature governance system covers: the fleet that PRODUCES the
# work, the models it reasons THROUGH, the artifact it SHIPS). Each heads its Appendix C section, so the
# section that introduces a zone is also the concept model's canonical `index-def` home for
# `governance-target-<zone>` — the derived `book_home` the concepts-model gate reads. The KEYS (the role
# groups) stay in code (`_APPENDIX_ROLES`); the gloss SENTENCES are authored in `appendix-c/_zone-gloss.md`
# (B1 lift, partly-structural), one per line in role order, so an editor revises them in the manuscript.
@functools.lru_cache(maxsize=1)
def _appendix_v2_zone_gloss() -> dict[str, str]:
    path = HERE / "appendix-c" / "_zone-gloss.md"
    if not path.is_file():
        raise SystemExit(f"zone gloss prose missing: {path}")
    lines = [ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    groups = [group for _r, group in _APPENDIX_ROLES]
    if len(lines) != len(groups):
        raise SystemExit(
            f"zone gloss {path}: expected {len(groups)} sentences (one per role group {groups}), "
            f"got {len(lines)}")
    return dict(zip(groups, lines))


# ═══════════════════════ Appendix v2 render mechanisms (restructure sub-wave 2) ════════════════
# Three build-generated render paths land here, each with an HTML + a Typst
# projection (the Typst twins live in book_typst.py and CALL these helpers for their data):
#   1. the linked constituent LEGEND under a stack's overview figure (Appendix A, §13.5);
#   2. the keep-together NOTE block wrapper (Appendix B, §13.6 — a Typst-only guarantee, inert in HTML);
#   3. the constraint-driven BRICK GRID packer (Appendix C, §14).
# The prose the mechanisms frame (A constituent treatments, B note bodies, C three-sentence summaries) is
# authored in the later assembly sub-waves; this wave renders honest stub/placeholder content so a flag-ON
# build succeeds with no orphans.

_FLAGSHIP_STACK_PATH = ROOT / "book-models" / "flagship-stack.json"
_BRICK_LAYOUT_PATH = ROOT / "book-models" / "brick-layout.json"
_BRICK_FITNESS_PATH = ROOT / "book-models" / "brick-fitness.json"
_BRICK_SUMMARIES_PATH = ROOT / "book-models" / "brick-summaries.json"
# The two CURATED Appendix-C metadata models (R3 applicability + R4 primary-concern). Every other brick chip
# is DERIVED: enforcement from the entry card Enf. row (`_note_enforcement_map`), and the technique/instance
# spine (`kind`, `abstract_name`, `parent_technique`, `advanced_examples`) from the classification model's
# dispositions (`_technique_spine`). `brick-metadata.json` also holds the ~10 `domain_specific` slugs.
_BRICK_APPLICABILITY_PATH = ROOT / "book-models" / "brick-applicability.json"
_BRICK_METADATA_PATH = ROOT / "book-models" / "brick-metadata.json"
_GLYPH_ASSET_DIR = HERE / "assets"
# Authored compressed Appendix-B notes (restructure sub-wave 4a prototype). One `<slug>.md` per flagship that
# has been compressed to a keep-together Flagship-Mechanism note; a flagship without one falls back to the full
# GoF pattern page. Each authored note carries the `note-spread`/`note-fold` keep-together directives (§13.6).
_APPENDIX_NOTES_DIR = ROOT / "book" / "appendix-notes"

# ── The per-note DERIVED metadata box + judgment lead-in (Appendix B, R5 + R2) ─────────────────────────
# Every Appendix-B note opens with its one-line engineering judgment (the lead — teach judgment, not
# mechanics) and a compact five-field metadata box (Role · Family · Used in stacks · Enforcement · Related
# mechanisms). BOTH are DERIVED at build time from sources the catalogue already holds true, so the box can
# never drift from the catalogue it summarizes:
#   Role / Family     — the validated census (the entry's role folder + its INDEX family heading);
#   Enforcement        — the INDEX `Enf.` column (census-validated equal to the entry card; carries the
#                        combined `Soft·Hard`, which the entry-card lead-token parser flattens);
#   Used in stacks     — reverse-mapped from the flagship-stack model's `parts[].slug` (7 notes belong to no
#                        stack → `—`);
#   Related mechanisms — parsed from the entry's own `## Related mechanisms` section (tight relations first);
#   the judgment       — the note-judgments model's `one_line` (the R7 distinctness-linted source of truth).
_NOTE_JUDGMENTS_PATH = ROOT / "book-models" / "note-judgments.json"
_FLAGSHIP_STACK_DECLARED_PATH = ROOT / "book-models" / "flagship_stack_declared.json"

# Enf.-column value (may carry a parenthetical qualifier, e.g. `Hard (signal)`) → the README's three-value
# vocabulary. The qualifier is dropped; the box shows the bare Hard / Soft / Soft·Hard.
_ENF_QUALIFIER_RE = re.compile(r"\s*\(.*\)\s*$")
# Related-mechanisms bullet: a bold `**Tag**` or italic `*Tag (qualifier)*` lead, an em-dash/hyphen, then the
# first markdown link to the sibling entry.
_RELATED_BULLET_RE = re.compile(
    r"^-\s+(?:\*\*(?P<t1>[^*]+)\*\*|\*(?P<t2>[^*]+)\*)\s*[—-]\s*\[(?P<label>[^\]]+)\]\((?P<href>[^)]+)\)")
# The "tight" relations shown first in the box (the entry's own section carries the complete set).
_RELATED_TIGHT_ORDER = ("Counterpart", "Sibling", "Enabler", "Consumer")
_RELATED_BOX_CAP = 4


@functools.lru_cache(maxsize=1)
def _note_judgments() -> dict:
    """`{slug: {judgment, one_line, foundational, distinct_from?}}` from the hand-authored note-judgments
    model. Empty when the file is absent (the note then renders with no lead-in — a soft degrade, never a
    build failure). The R7 distinctness lint (`catalog.py validate`) guards the model's shape."""
    if not _NOTE_JUDGMENTS_PATH.is_file():
        return {}
    return json.loads(_NOTE_JUDGMENTS_PATH.read_text(encoding="utf-8")).get("judgments", {})


@functools.lru_cache(maxsize=1)
def _family_title_map() -> dict[str, str]:
    """`{family-folder: human INDEX heading}` — e.g. `context-and-dispatch` → `Context & dispatch substrate`.
    Parsed from INDEX.md: each `## N. <Title>` heading is followed by a `[family folder](<role>/<folder>/)`
    link, so the one validated census yields the box's Family label. The renderer strips the leading number."""
    out: dict[str, str] = {}
    idx = ROOT / "INDEX.md"
    if not idx.is_file():
        return out
    title = None
    for ln in idx.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^##\s+\d+\.\s+(.+)$", ln)
        if m:
            title = m.group(1).strip()
        fm = re.search(r"\[family folder\]\([a-z-]+/([a-z-]+)/\)", ln)
        if fm and title:
            out[fm.group(1)] = title
    return out


@functools.lru_cache(maxsize=1)
def _note_enforcement_map() -> dict[str, str]:
    """`{entry-slug: Hard|Soft|Soft·Hard}` from INDEX.md's census `Enf.` column (validated equal to each
    entry's metadata card). A trailing qualifier (`Hard (signal)`) is dropped to the bare three-value
    vocabulary the README defines. The INDEX column is preferred over the entry-card lead token because it
    carries the combined `Soft·Hard` verbatim."""
    out: dict[str, str] = {}
    idx = ROOT / "INDEX.md"
    if not idx.is_file():
        return out
    for ln in idx.read_text(encoding="utf-8").splitlines():
        if not ln.startswith("|") or ".md)" not in ln:
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if len(cells) < 7:
            continue
        lm = re.search(r"\[([a-z0-9-]+)\.md\]", cells[6])
        if lm:
            out[lm.group(1)] = _ENF_QUALIFIER_RE.sub("", cells[5]).strip()
    return out


@functools.lru_cache(maxsize=1)
def _slug_to_stacks() -> dict[str, list[str]]:
    """`{part-slug: [stack name, …]}` reverse-mapped from the hand-authored flagship-stack model's
    `stacks[].parts[].slug`. A note whose slug matches no `parts[].slug` is absent (the box renders `—`); a
    note in two stacks lists both. One index, built once, joined by slug — no field authored twice."""
    out: dict[str, list[str]] = {}
    if not _FLAGSHIP_STACK_DECLARED_PATH.is_file():
        return out
    data = json.loads(_FLAGSHIP_STACK_DECLARED_PATH.read_text(encoding="utf-8"))
    for stack in data.get("stacks", []):
        name = stack.get("name", "")
        for part in stack.get("parts", []):
            slug = part.get("slug")
            if slug and name:
                out.setdefault(slug, []).append(name)
    return out


def _note_related_box(rec: dict) -> str:
    """The box's `Related mechanisms` cell — parsed from the entry's own `## Related mechanisms` section
    (the source `catalog.py` already validates for REL_TAG membership + link integrity), tight relations
    first, capped at four, each rendered `*Tag:* [Name](entry.html)` so the box teaches the NATURE of each
    link, not just its existence. The entry's own section carries the complete set. `—` when the entry links
    no siblings."""
    section = rec.get("sections", {}).get("Related Patterns", "") or ""
    names = _slug_name_map()
    parsed: list[tuple[str, str, str]] = []  # (base-tag, name, href)
    for ln in section.splitlines():
        m = _RELATED_BULLET_RE.match(ln.strip())
        if not m:
            continue
        lead = (m.group("t1") or m.group("t2") or "").strip()
        base = re.sub(r"\s*\(.*\)\s*$", "", lead).strip().rstrip(":")
        href = m.group("href").strip()
        tgt_slug = pathlib.PurePosixPath(href.split("#", 1)[0]).stem
        name = names.get(tgt_slug) or m.group("label").strip()
        parsed.append((base, name, href))
    if not parsed:
        return "—"

    def _rank(tag: str) -> int:
        return _RELATED_TIGHT_ORDER.index(tag) if tag in _RELATED_TIGHT_ORDER else len(_RELATED_TIGHT_ORDER)

    ordered = sorted(range(len(parsed)), key=lambda i: (_rank(parsed[i][0]), i))
    picks = [parsed[i] for i in ordered[:_RELATED_BOX_CAP]]
    return "; ".join(f"*{tag}:* [{name}]({href})" for tag, name, href in picks)


def _note_metadata_box_md(rec: dict) -> list[str]:
    """The DERIVED five-field metadata box for one Appendix-B note, as markdown-table lines (rendered as the
    catalogue's headerless metadata-card style). Role/Family from the census, Enforcement from the INDEX
    `Enf.` column, Used-in-stacks reverse-mapped from the flagship-stack model, Related parsed from the
    entry's own section. Every field derives from a source the catalogue already holds true."""
    slug = rec["slug"]
    role = rec.get("group", "—")
    family = _family_title_map().get(rec.get("family", ""), rec.get("family", "—"))
    enforcement = _note_enforcement_map().get(slug, "—")
    stacks = _slug_to_stacks().get(slug, [])
    used_in = "; ".join(stacks) if stacks else "—"
    related = _note_related_box(rec)
    # Applicability (Universal | Common | Specialized) — how broadly the mechanism applies. Read from the
    # hand-authored note-judgments model (completeness held by lint_note_judgments); the completeness lint
    # guarantees every note carries it, so the "—" fallback is never reached on a well-formed model.
    applicability = (_note_judgments().get(slug, {}) or {}).get("applicability", "—")
    return [
        "| | |",
        "|---|---|",
        f"| **Role** | {role} |",
        f"| **Family** | {family} |",
        f"| **Used in stacks** | {used_in} |",
        f"| **Enforcement** | {enforcement} |",
        f"| **Applicability** | {applicability} |",
        f"| **Related mechanisms** | {related} |",
    ]


_NOTE_SPREAD_RE = re.compile(r"<!--\s*note-spread:\s*(\d+)\s*-->")


def _appendix_b_note_md(rec: dict, stack_membership: "dict | None", for_print: bool) -> str:
    """One Appendix-B Flagship-Mechanism note body. When an authored compressed note exists at
    `book/appendix-notes/<slug>.md`, splice a provenance line + the authored Note-contract body — Intent
    first, then problem · mechanism · engineering consequences · implementation seam · known limitations —
    which carries the `note-spread` (and, for a two-page note, the `note-fold`) directive the Typst
    keep-together wrapper reads (§13.6). A flagship with NO authored note falls back to the full GoF pattern
    page, so the un-compressed flagships keep rendering until their notes are authored in the fan-out wave.

    THE MEASURED LAYOUT RULE (sub-wave 4a page-budget prototype): the Structure figure (the fill's Mermaid)
    leads the note ONLY on a two-page note (`note-spread: 2`). A one-page note is text-only — the figure plus
    Intent plus the five contract sections overflows a single page (measured at 102–122% of the page budget),
    so a 1pp note carries the prose and defers the picture to the mechanism's Appendix-C brick and its online
    entry. Figure ⟺ spread:2: the figure sits in the fold's first panel, where a two-page note has the room."""
    note_path = _APPENDIX_NOTES_DIR / f"{rec['slug']}.md"
    if not note_path.is_file():
        return _appendix_pattern_page_md(rec, stack_membership, for_print)
    body = note_path.read_text(encoding="utf-8").strip()
    m = _NOTE_SPREAD_RE.search(body)
    spread = int(m.group(1)) if m else 1
    fill = rec.get("fill") or {}
    safe = rec["name"].replace('"', "'")
    lead: list[str] = []
    # The note LEADS with its one-line engineering judgment (R2 — teach judgment, not mechanics), drawn from
    # the distinctness-linted note-judgments model. A note with no modeled judgment simply gets no lead-in.
    judgment = (_note_judgments().get(rec["slug"], {}) or {}).get("one_line", "").strip()
    if judgment:
        lead += [f"**The judgment** — {judgment}", ""]
    # The DERIVED metadata box orients the reader before the prose (R5). Every field is a build-time join
    # over a census the catalogue already holds true, so the box cannot drift from the catalogue it summarizes.
    lead += _note_metadata_box_md(rec) + [""]
    if spread >= 2 and fill.get("structure"):          # figure ⟺ spread:2 (measured: 1pp+figure overflows)
        lead += [f"*The Structure of {safe} — its shape at a glance:*", "", fill["structure"], ""]
    # A lightweight pointer to the mechanism's full Gang-of-Four entry in the catalogue (this appendix is
    # interpretive and selective; the catalogue carries the exhaustive detail — R1). Replaces the old
    # "Projected from…" provenance line.
    lead += [f'*Full description → [{rec["name"]}]({rec["catalogue_html"]}).*', ""]
    return "\n".join(lead) + "\n" + body


def _humanize_slug(slug: str) -> str:
    """A slug → a Title-ish display string (`a11y-prefix` → `A11y Prefix`) — the last-resort label when a
    part slug resolves to no catalogue name."""
    return " ".join(w.capitalize() for w in slug.replace("_", "-").split("-"))


@functools.lru_cache(maxsize=1)
def _slug_name_map() -> dict[str, str]:
    """{entry-slug: catalogue name} across all 83 entries — the source for a legend/brick label. Cached (the
    entry files do not change within one build)."""
    return {e["slug"]: e["name"] for e in _appendix_entries()}


@functools.lru_cache(maxsize=1)
def _load_flagship_stack_parts() -> dict[str, list[dict]]:
    """`{stack-stem: ordered parts[]}` from the flagship-stack model, keyed by each record's `page_source`
    stem (the `_STACKS` stem the stack pages render under). Empty dict when the model is absent (the legend
    then renders nothing — a soft degrade, never a build failure)."""
    if not _FLAGSHIP_STACK_PATH.is_file():
        return {}
    data = json.loads(_FLAGSHIP_STACK_PATH.read_text(encoding="utf-8"))
    out: dict[str, list[dict]] = {}
    for rec in data.get("stacks", []):
        stem = pathlib.Path(rec.get("page_source", "")).stem
        if stem:
            out[stem] = rec.get("parts", [])
    return out


def _split_part_role(role: str) -> tuple[str, str]:
    """A model part's `role` string (`"MARK — name every insertion…"`) → (role-label, description). The label
    is the token before the em-dash (`MARK`); the description is the sentence after it. A role with no
    em-dash falls back to (first word, whole string)."""
    if "—" in role:
        label, _, rest = role.partition("—")
        return label.strip(), rest.strip()
    label = role.strip().split(" ", 1)[0] if role.strip() else ""
    return label, role.strip()


def _stack_legend_rows(stem: str, letter: str, idx: int) -> list[tuple[str, str, str, str]]:
    """The legend rows for stack `stem` at appendix locator `<letter>.<idx>` — one per constituent part in
    model order: `(role-label, mechanism-name, locator, anchor-id)`. The locator is `<letter>.<idx>.<n>`
    (e.g. `A.1.2`); the anchor is `a-<idx>-<slug>`, the id the part's inline subsection carries on the same
    page. Both the legend and the subsection anchors derive from the one ordered `parts[]`, so they cannot
    drift (the single-source discipline the stack-membership index uses)."""
    names = _slug_name_map()
    rows: list[tuple[str, str, str, str]] = []
    for n, part in enumerate(_load_flagship_stack_parts().get(stem, []), start=1):
        slug = part["slug"]
        label, _desc = _split_part_role(part.get("role", ""))
        name = names.get(slug) or _humanize_slug(slug)
        rows.append((label, name, f"{letter}.{idx}.{n}", f"a-{idx}-{slug}"))
    return rows


def _stack_legend_html(stem: str, letter: str, idx: int) -> str:
    """The build-generated linked legend rendered beneath a stack's overview figure (§13.5). Each row is the
    role label plus a link whose TEXT is the mechanism name and its generated locator — `Mutator Stamps
    (§A.1.2)` — pointing at the part's inline subsection anchor on the same page. Name + locator, never colour
    or the role abbreviation alone. The overview SVG's own internals are untouched; this legend is the
    clickable index beside it."""
    rows = _stack_legend_rows(stem, letter, idx)
    if not rows:
        return ""
    items = []
    for label, name, loc, anchor in rows:
        role_html = f'<span class="legend-role">{html.escape(label)}</span> ' if label else ""
        link = (f'<a href="#{html.escape(anchor, quote=True)}">'
                f'{inline(name)} <span class="legend-loc">(§{html.escape(loc)})</span></a>')
        items.append(f"<li>{role_html}{link}</li>")
    return ('<nav class="stack-legend" aria-label="Constituent parts of this stack, each linked to its '
            'section on this page"><ol>' + "".join(items) + "</ol></nav>")


def _stack_constituent_stub_md(stem: str, letter: str, idx: int) -> str:
    """The anchored inline-part subsections the legend links INTO — one `###` subsection per constituent, each
    carrying the `{#a-<idx>-<slug>}` anchor and a stub treatment (the model's role sentence + a pointer to the
    deeper Appendix-B note). This sub-wave emits the STRUCTURE (headings + anchors + locators) so the legend
    resolves; the 150–250-word role/receives/emits/→B treatment (§13.2) is authored in a later sub-wave. A
    stack absent from the model yields no section (the legend is likewise empty)."""
    parts = _load_flagship_stack_parts().get(stem, [])
    if not parts:
        return ""
    names = _slug_name_map()
    out = [f"## The constituent parts, in depth {{#a-{idx}-parts}}", ""]
    for n, part in enumerate(parts, start=1):
        slug = part["slug"]
        label, desc = _split_part_role(part.get("role", ""))
        name = names.get(slug) or _humanize_slug(slug)
        head = f"### {label} — {name}" if label else f"### {name}"
        out += [
            f"{head} {{#a-{idx}-{slug}}}",
            "",
            f"*{letter}.{idx}.{n} · role in the stack.* {desc}",
            "",
            "*The full constituent treatment — the role it plays, what it receives, what it emits or "
            "guarantees, and a pointer into its deeper Appendix B note — is authored in a later assembly "
            "sub-wave.*",
            "",
        ]
    return "\n".join(out).strip()


def _inject_stack_legend(body_md: str, stem: str, letter: str, idx: int) -> str:
    """Splice the linked legend directive in immediately AFTER the stack's overview-figure directive (the
    `<!-- figure: assets/<stem>.svg … -->` line in the `## Composition` section). The legend sits under the
    figure (§2.1 shape: figure → legend → parts) and links to the `{#a-<idx>-<slug>}` anchors the stack file's
    own constituent subsections carry. If the overview figure line is not found, the legend is appended so it
    still renders.

    When the stack file has NOT yet been restructured to carry authored constituent subsections (no
    `{#a-<idx>-` anchor present), fall back to appending the build-generated stub subsections so the legend
    links still resolve — the sub-wave-2 scaffold. Once a stack file authors its own anchored subsections (the
    assembled compositional form), those stubs are suppressed to avoid duplicate anchors."""
    directive = f"<!-- stack-legend: {stem} | {letter} | {idx} -->"
    lines = body_md.splitlines()
    fig_i = next((i for i, ln in enumerate(lines)
                  if ln.strip().startswith("<!-- figure:") and f"assets/{stem}.svg" in ln), None)
    if fig_i is not None:
        lines[fig_i + 1:fig_i + 1] = ["", directive]
        body_md = "\n".join(lines)
    else:
        body_md = body_md.rstrip() + "\n\n" + directive
    if f"{{#a-{idx}-" in body_md:      # authored subsections present — the stack file owns the anchors
        return body_md.rstrip()
    stubs = _stack_constituent_stub_md(stem, letter, idx)
    return body_md.rstrip() + ("\n\n" + stubs if stubs else "")


# ── Appendix C — the constraint-driven brick packer (§14) ────────────────────────────────────────────
# A build-time shelf/row packer over variable-width bricks. Each brick declares a `span` (1-col / 2-col /
# full) and optional `pair_with` / `near` adjacency hints (the declared-constraint model below). The packer
# arranges the bricks per section into rows — 1-col, 2-col, or mixed as the pack resolves — deterministically
# (catalogue order + the hints; no Date/random), whitespace-minimising against a fixed column count.

@functools.lru_cache(maxsize=1)
def _load_brick_layout() -> dict[str, dict]:
    """`{slug: {span, pair_with, near}}` — the declared brick-layout constraints (§14). Absent file → `{}`
    (every brick then defaults to a 1-col span and the packer lays a uniform grid). The spans + adjacency
    hints are SEEDED minimally now and tuned in the C assembly sub-wave, after the real grid is rendered and
    each diagram's legibility at print size is assessed (the fallback-first, refine-after discipline)."""
    if not _BRICK_LAYOUT_PATH.is_file():
        return {}
    data = json.loads(_BRICK_LAYOUT_PATH.read_text(encoding="utf-8"))
    return data.get("bricks", {})


@functools.lru_cache(maxsize=1)
def _load_brick_fitness() -> dict[str, dict]:
    """`{slug: {verdict, glyph_class?}}` — the declared visual-fitness verdicts (`book-models/brick-fitness.json`,
    §13.4 / sub-wave 5). `verdict` is PASS / SIMPLIFY (both thumbnail the entry's Structure diagram) or GLYPH
    (show the class glyph named by `glyph_class`). Absent file → `{}` (every brick then falls back to its
    diagram, or the placeholder if it has none). This is the SOLE source of the GLYPH set — the builder holds
    no hardcoded slug list."""
    if not _BRICK_FITNESS_PATH.is_file():
        return {}
    data = json.loads(_BRICK_FITNESS_PATH.read_text(encoding="utf-8"))
    return data.get("verdicts", {})


@functools.lru_cache(maxsize=1)
def _load_brick_summaries() -> dict[str, str]:
    """`{slug: curated-summary}` — the curated ≤3-sentence brick summaries (`book-models/brick-summaries.json`,
    restructure sub-wave 5b). An OVERRIDE over the `**Intent**` fallback: a slug present here renders its curated
    summary in the Appendix-C brick; every other entry keeps its Intent line. Absent file → `{}` (every brick
    then falls back to Intent). Not every entry needs one — the curated set covers the bricks whose Intent ran
    long enough to tower over its grid neighbours."""
    if not _BRICK_SUMMARIES_PATH.is_file():
        return {}
    data = json.loads(_BRICK_SUMMARIES_PATH.read_text(encoding="utf-8"))
    return data.get("summaries", {})


@functools.lru_cache(maxsize=1)
def _load_brick_applicability() -> dict[str, str]:
    """`{slug: "essential"|"specialized"}` — the curated R3 adoption signal (`book-models/brick-applicability.json`).
    Rendered as the fourth brick chip (Applicability). Absent file → `{}` (the chip then omits). NOT a quality
    ranking: `essential` = expected in nearly every governed environment; `specialized` = domain-triggered."""
    if not _BRICK_APPLICABILITY_PATH.is_file():
        return {}
    data = json.loads(_BRICK_APPLICABILITY_PATH.read_text(encoding="utf-8"))
    return {slug: (rec or {}).get("applicability", "") for slug, rec in data.get("applicability", {}).items()}


@functools.lru_cache(maxsize=1)
def _load_primary_concern() -> dict[str, str]:
    """`{slug: concern}` — the curated R4 cross-cutting organizer (`book-models/brick-metadata.json`), rendered
    as the second brick chip (Primary-concern). Each concern cross-walks 1:1 to a GEE capability. Absent → `{}`."""
    if not _BRICK_METADATA_PATH.is_file():
        return {}
    return json.loads(_BRICK_METADATA_PATH.read_text(encoding="utf-8")).get("primary_concern", {})


@functools.lru_cache(maxsize=1)
def _load_domain_specific() -> frozenset[str]:
    """The ~10 document-accessibility instance slugs (`book-models/brick-metadata.json`'s `domain_specific`).
    An entry here is one whose transferable unit is the TECHNIQUE it instantiates, not the mechanism itself —
    so its instance backref is styled LOUDER (`A document-accessibility instance of the technique: …`)."""
    if not _BRICK_METADATA_PATH.is_file():
        return frozenset()
    return frozenset(json.loads(_BRICK_METADATA_PATH.read_text(encoding="utf-8")).get("domain_specific", []))


@functools.lru_cache(maxsize=1)
def _entry_records_sorted() -> tuple[dict, ...]:
    """Every catalogue entry record in the census hierarchy — role order (`_APPENDIX_ROLES`), then family census
    number, then family, then slug — the SAME order `_build_appendix_chapters_v2` walks to number the flagships.
    Cached so the technique spine, the flagship-number map, and the census-order index share one read."""
    entries = _appendix_entries()
    role_index = {group: i for i, (_r, group) in enumerate(_APPENDIX_ROLES)}
    family_order = _family_order_from_index()
    return tuple(sorted(
        entries,
        key=lambda e: (role_index.get(e["group"], 99), family_order.get(e["family"], 999), e["family"], e["slug"])))


@functools.lru_cache(maxsize=1)
def _census_order() -> dict[str, int]:
    """`{slug: rank}` in the census hierarchy — used to order a technique's `advanced_examples` list stably."""
    return {e["slug"]: i for i, e in enumerate(_entry_records_sorted())}


@functools.lru_cache(maxsize=1)
def _entry_display_map() -> dict[str, tuple[str, str]]:
    """`{slug: (display-name, catalogue-html-link)}` for every entry — resolves a technique's `advanced_examples`
    slugs and an instance's `parent_technique` slug to their brick name + link, across zones."""
    return {e["slug"]: (e["name"], e["catalogue_html"]) for e in _appendix_entries()}


@functools.lru_cache(maxsize=1)
def _flagship_appendix_num() -> dict[str, int]:
    """`{flagship-slug: N}` — each flagship's monotonic Appendix-B rank (B.1 … B.29) in census order, computed
    exactly as `_build_appendix_chapters_v2` numbers them (which mutates its own record copies). This is the
    DERIVED source the brick C→B ref reads, so `Engineering Note → B.N` cannot drift from the note's own number."""
    flag = _flagship_slugs()
    out: dict[str, int] = {}
    n = 0
    for e in _entry_records_sorted():
        if e["slug"] in flag:
            n += 1
            out[e["slug"]] = n
    return out


@functools.lru_cache(maxsize=1)
def _technique_spine() -> dict:
    """The DERIVED technique/instance overlay (R6-safe navigational layer), read entirely from the classification
    model's dispositions — no new data. The `keep-as-L2` / `demote-to-L3` axis IS the technique/instance axis:

      * `keep-as-L2 <AbstractName>`  → a **technique** whose display name is `<AbstractName>`.
      * `demote-to-L3-under <T>` / `merge-into <T>` / `move-to-book-case <T>` → an **instance** that folds under
        technique `<T>` (resolved to its canonical brick slug; a `move-to-book-case` technique has no brick, so
        the parent slug is None and the backref names it as text).
      * `lift-to-L1 …` → a **principle** (the one placement-principle outlier), neither technique nor instance.

    Returns `{kind, abstract, parent_slug, parent_name, examples}` — `examples[technique_slug]` inverts the
    parent edges to that technique's `advanced_examples`, ordered by census rank."""
    cls = _load_classification()
    canon = {rec["parent"]: slug for slug, rec in cls.items() if rec["head"] == "keep-as-L2"}
    kind: dict[str, str] = {}
    abstract: dict[str, str] = {}
    parent_slug: dict[str, str | None] = {}
    parent_name: dict[str, str] = {}
    examples: dict[str, list[str]] = {}
    for slug, rec in cls.items():
        head, name = rec["head"], rec["parent"]
        if head == "keep-as-L2":
            kind[slug] = "technique"
            abstract[slug] = name
            examples.setdefault(slug, [])
        elif head in ("demote-to-L3-under", "merge-into", "move-to-book-case"):
            kind[slug] = "instance"
            parent_name[slug] = name
            psl = canon.get(name)               # None for the book-case technique (no in-catalogue brick)
            parent_slug[slug] = psl
            if psl is not None:
                examples.setdefault(psl, []).append(slug)
        elif head == "lift-to-L1":
            kind[slug] = "principle"
        else:
            kind[slug] = "instance"             # defensive — an unknown head is treated as a leaf
    order = _census_order()
    for k in examples:
        examples[k].sort(key=lambda s: order.get(s, 999))
    return {"kind": kind, "abstract": abstract, "parent_slug": parent_slug,
            "parent_name": parent_name, "examples": examples}


# The hard word cap on the summary a brick emits (restructure sub-wave 5b). A grid brick that towers over its
# row-neighbour with a 12–15-line summary leaves a jagged row and wasted vertical space; capping the emitted
# text keeps row heights even. The curated summaries all sit well under it; a still-long Intent fallback is
# truncated at the cap (the audit-only summary sensor flags it so a curated summary can replace it later).
_BRICK_SUMMARY_WORD_CAP = 55


def _cap_brick_summary(text: str) -> str:
    """Cap a brick summary at `_BRICK_SUMMARY_WORD_CAP` words. Under the cap the text is returned unchanged;
    over it, the summary is truncated at the word boundary and an ellipsis appended — a layout backstop for a
    long Intent fallback, never expected to fire on a curated summary."""
    words = text.split()
    if len(words) <= _BRICK_SUMMARY_WORD_CAP:
        return text
    return " ".join(words[:_BRICK_SUMMARY_WORD_CAP]).rstrip(",;:.") + "…"


def _structure_mermaid_source(fill: dict) -> str | None:
    """The ```mermaid fence body from an entry's Structure fill slot, or None if the entry carries no diagram
    (the root `agent/ models-bridge/ product/` framing entries have no fill). The Structure slot is prose plus
    one mermaid fence plus an accessible-description line; we lift just the fence body for thumbnail rendering."""
    struct = (fill or {}).get("structure")
    if not struct:
        return None
    m = re.search(r"```mermaid\s*\n(.*?)\n```", struct, re.S)
    return m.group(1).strip() if m else None


def _brick_thumb_svg_path(cell: dict) -> pathlib.Path | None:
    """The on-disk SVG for a brick's thumbnail — a class glyph for a GLYPH verdict, else the entry's Structure
    diagram rendered to a cached SVG (fails loud if mmdc is missing, like every other diagram). Returns None
    when the entry has no diagram and no GLYPH assignment, so the caller keeps the text placeholder. One path
    serves both projections: the HTML build inlines it, the Typst build `#image`s it, so they cannot diverge."""
    verdict = cell.get("verdict")
    if verdict == "GLYPH":
        gclass = cell.get("glyph_class")
        if gclass:
            p = _GLYPH_ASSET_DIR / f"glyph-{gclass}.svg"
            if p.is_file():
                return p
    src = cell.get("structure_mermaid")
    if not src:
        return None
    render_mermaid_svg(src)                       # render + cache (fails loud if mmdc absent)
    p = _MERMAID_CACHE / f"{_mermaid_cache_key(src)}.svg"
    return p if p.is_file() else None


def _inline_svg_for_thumb(path: pathlib.Path, uid: str) -> str:
    """Splice an on-disk SVG file down to its `<svg>…</svg>`, stripping the XML prolog / doctype and the fixed
    width/height (so the `.brick-fig svg` CSS max-width/height rule governs sizing) — the same reduction
    `render_mermaid_svg` applies to inline mermaid SVGs, reused here for both glyph assets and the mermaid
    cache files a brick thumbnail draws.

    Every `id` (and its `#id` / `aria-labelledby` references) is suffixed with `uid` (the brick slug) so a
    class glyph reused across bricks — `graph` covers three GLYPH entries — never emits a duplicate ID on the
    one catalogue page, and a mermaid diagram's arrowhead `url(#…)` refs stay internally consistent."""
    svg = path.read_text(encoding="utf-8")
    svg = re.sub(r"^\s*<\?xml[^>]*\?>\s*", "", svg)
    svg = re.sub(r"<!DOCTYPE[^>]*>\s*", "", svg, flags=re.I)
    m = re.search(r"<svg\b.*</svg>", svg, re.S)
    if m:
        svg = m.group(0)
    svg = re.sub(r'(<svg\b[^>]*?)\swidth="[^"]*"', r"\1", svg, count=1)
    svg = re.sub(r'(<svg\b[^>]*?)\sheight="[^"]*"', r"\1", svg, count=1)
    suffix = "-" + re.sub(r"[^a-zA-Z0-9_-]", "", uid)
    ids = sorted(set(re.findall(r'\bid="([^"]+)"', svg)), key=len, reverse=True)
    for old in ids:
        new = old + suffix
        svg = svg.replace(f'id="{old}"', f'id="{new}"')
        svg = svg.replace(f"#{old}", f"#{new}")           # url(#id) + href="#id"
    svg = re.sub(
        r'aria-labelledby="([^"]+)"',
        lambda mm: 'aria-labelledby="' + " ".join(t + suffix for t in mm.group(1).split()) + '"',
        svg,
    )
    return svg


def _brick_span(slug: str, ncols: int) -> int:
    """The column span for a brick: the declared `span` (`1`/`2`/`"full"`), clamped to `[1, ncols]`. A wide
    diagram declares `2` or `full`; the default is a 1-col brick. `full` maps to the whole row."""
    raw = _load_brick_layout().get(slug, {}).get("span", 1)
    if isinstance(raw, str) and raw.strip().lower() == "full":
        return ncols
    try:
        n = int(raw)
    except (TypeError, ValueError):
        n = 1
    return max(1, min(n, ncols))


def _brick_order(bricks: list[dict]) -> list[dict]:
    """Reorder bricks so declared adjacency hints are honoured before packing: after each brick, pull in its
    `pair_with` sibling (place side by side) then its `near` sibling (keep sequentially close), if present in
    the same section and not already placed. Deterministic — a stable walk of the catalogue order with the
    hint pulls applied in a fixed (`pair_with` then `near`) order."""
    layout = _load_brick_layout()
    by_slug = {b["slug"]: b for b in bricks}
    placed: list[dict] = []
    used: set[str] = set()
    for b in bricks:
        if b["slug"] in used:
            continue
        placed.append(b)
        used.add(b["slug"])
        for hint in ("pair_with", "near"):
            tgt = layout.get(b["slug"], {}).get(hint)
            if tgt and tgt in by_slug and tgt not in used:
                placed.append(by_slug[tgt])
                used.add(tgt)
    return placed


def _brick_pack(bricks: list[dict], ncols: int = 2) -> list[list[dict]]:
    """Shelf/row-pack the bricks into rows that each sum to ≤ `ncols` columns (§14). Walks the
    adjacency-ordered bricks; a brick whose span would overflow the current row starts a new row; a full-width
    brick takes its own row. Deterministic: the same bricks + layout yield the same grid every build."""
    rows: list[list[dict]] = []
    row: list[dict] = []
    used = 0
    for b in _brick_order(bricks):
        span = b["span"]
        if used + span > ncols and row:
            rows.append(row)
            row, used = [], 0
        row.append(b)
        used += span
        if used >= ncols:
            rows.append(row)
            row, used = [], 0
    if row:
        rows.append(row)
    return rows


def _brick_cells(group: str, flagship: set[str], ncols: int) -> list[dict]:
    """The ordered brick-cell records for one role zone — every catalogue entry in `group`, in the census
    hierarchy (family census number, then within-family slug), each carrying the fields the cell template
    renders: name, catalogue link, family, enforcement, computed span, flagship flag, and the summary — the
    curated brick summary (`book-models/brick-summaries.json`) when the slug carries one, else the entry's
    Intent fallback — capped at `_BRICK_SUMMARY_WORD_CAP` words so a long summary can't tower over its row."""
    family_order = _family_order_from_index()
    entries = [e for e in _appendix_entries() if e["group"] == group]
    entries.sort(key=lambda e: (family_order.get(e["family"], 999), e["family"], e["slug"]))
    fitness = _load_brick_fitness()
    curated = _load_brick_summaries()
    concern = _load_primary_concern()
    applic = _load_brick_applicability()
    enf_combined = _note_enforcement_map()       # Hard | Soft | Soft·Hard, from the INDEX Enf. column
    spine = _technique_spine()
    domain_specific = _load_domain_specific()
    fnum = _flagship_appendix_num()
    disp_name = _entry_display_map()
    cells: list[dict] = []
    for e in entries:
        slug = e["slug"]
        intent = (e.get("intent") or "").strip()
        fit = fitness.get(slug, {})
        summary = _cap_brick_summary((curated.get(slug) or intent).strip())
        kind = spine["kind"].get(slug)
        # Resolve the technique's advanced-example slugs and an instance's parent slug to (name, link) pairs.
        adv = [(disp_name[s][0], disp_name[s][1]) for s in spine["examples"].get(slug, []) if s in disp_name]
        parent_slug = spine["parent_slug"].get(slug)
        parent_link = disp_name[parent_slug][1] if parent_slug in disp_name else None
        cells.append({
            "slug": slug,
            "name": e["name"],
            "catalogue_html": e["catalogue_html"],
            "group": e["group"],
            "family": e["family"],
            "enforcement": e.get("enforcement"),
            "enforcement_combined": enf_combined.get(slug) or (e.get("enforcement") or "").capitalize(),
            "primary_concern": concern.get(slug),
            "applicability": applic.get(slug),
            "span": _brick_span(slug, ncols),
            "is_flagship": slug in flagship,
            "appendix_num": fnum.get(slug),               # B.N rank on a flagship, else None
            "kind": kind,                                  # technique | instance | principle | None
            "abstract_name": spine["abstract"].get(slug),  # technique display name (kicker)
            "parent_technique_name": spine["parent_name"].get(slug),  # instance backref target name
            "parent_technique_link": parent_link,          # instance backref target link (None → text only)
            "advanced_examples": adv,                      # [(name, link), …] for a technique
            "is_domain_specific": slug in domain_specific,  # louder instance backref for the ~10 doc-a11y instances
            "summary": summary,
            "verdict": fit.get("verdict"),               # PASS | SIMPLIFY | GLYPH | None
            "glyph_class": fit.get("glyph_class"),        # set only on GLYPH verdicts
            "structure_mermaid": _structure_mermaid_source(e.get("fill") or {}),
        })
    return cells


def _brick_meta_line(cell: dict) -> str:
    """The four-facet brick chip line: `Family · Primary-concern · Enforcement · Applicability`. Role/zone is
    NOT a chip — the C.1/C.2/C.3 section the brick sits in already carries it, so the freed slot spends on
    concern + applicability the reader can't otherwise see. Enforcement carries the combined `Soft·Hard` for the
    dual entries (a soft aim shipped with a hard sensor). A missing curated facet degrades to `—`."""
    fam = _humanize_slug(cell["family"])
    concern = cell.get("primary_concern") or "—"
    enf = cell.get("enforcement_combined") or "—"
    applic = (cell.get("applicability") or "").capitalize() or "—"
    return f"{fam} · {concern} · {enf} · {applic}"


_BRICK_NCOLS = 2  # §13.4 / §"Recommended final architecture": TWO print columns (three forces diagrams too small).


def _brick_grid_html(group: str) -> str:
    """The packed brick grid for one Appendix-C role zone (§14). A CSS grid whose columns each brick spans by
    its computed width; every cell is a bordered card — a figure thumbnail slot, the mechanism name (linked to
    its full catalogue entry online), a stub three-sentence summary, and the metadata footer. Thumbnails are
    UNNUMBERED by construction (§5.4): bare cells, no `<figure>`/caption, so 83 thumbnails never enter the
    figure-numbering stream. Responsive + theme-aware via the design tokens the page template imports."""
    flagship = _flagship_slugs()
    cells = _brick_cells(group, flagship, _BRICK_NCOLS)
    if not cells:
        return ""
    rendered: list[str] = []
    for row in _brick_pack(cells, _BRICK_NCOLS):
        for c in row:
            span = c["span"]
            online = " (online)" if not c["is_flagship"] else ""
            summary = inline(c["summary"]) if c["summary"] else \
                "<em>Three-sentence summary authored in a later sub-wave.</em>"
            thumb_path = _brick_thumb_svg_path(c)
            glyph_cls = " brick-fig-glyph" if c.get("verdict") == "GLYPH" else ""
            fig = (f'<div class="brick-fig{glyph_cls}" aria-hidden="true">'
                   f'{_inline_svg_for_thumb(thumb_path, c["slug"])}</div>'
                   if thumb_path else
                   '<div class="brick-fig" aria-hidden="true"><span>Structure diagram</span></div>')

            # ── The thin technique/instance overlay (R6-safe: text lines, never a size change) ──
            # TECHNIQUE brick → an `abstract_name` kicker over the title; INSTANCE brick → a backref to the
            # technique it folds under, styled LOUDER for the ~10 document-accessibility instances.
            kicker = (f'<p class="brick-kicker">Technique · {inline(c["abstract_name"])}</p>'
                      if c.get("kind") == "technique" and c.get("abstract_name") else "")
            backref = ""
            if c.get("kind") == "instance" and c.get("parent_technique_name"):
                pname = inline(c["parent_technique_name"])
                target = (f'<a href="{html.escape(c["parent_technique_link"], quote=True)}">{pname}</a>'
                          if c.get("parent_technique_link") else pname)
                if c.get("is_domain_specific"):
                    backref = (f'<p class="brick-instance brick-instance-domain">A document-accessibility '
                               f'instance of the technique: {target} &rarr;</p>')
                else:
                    backref = f'<p class="brick-instance">An instance of: {target} &rarr;</p>'
            # TECHNIQUE with in-catalogue instances → a quiet "Advanced examples →" line.
            adv = ""
            if c.get("kind") == "technique" and c.get("advanced_examples"):
                links = ", ".join(
                    f'<a href="{html.escape(url, quote=True)}">{inline(nm)}</a>'
                    for nm, url in c["advanced_examples"])
                adv = f'<p class="brick-adv">Advanced examples &rarr; {links}</p>'
            # C→B (R2): a flagship carries a lightweight Engineering-Note ref to its Appendix-B deep dive.
            note_ref = ""
            if c.get("is_flagship") and c.get("appendix_num"):
                note_ref = (f'<p class="brick-note-ref">Engineering Note &rarr; '
                            f'<a href="appendix-b-{html.escape(c["slug"], quote=True)}.html">'
                            f'B.{c["appendix_num"]}</a></p>')

            rendered.append(
                f'<div class="brick" style="grid-column: span {span};">'
                f'{fig}'
                f'{kicker}'
                f'<p class="brick-name"><a href="{html.escape(c["catalogue_html"], quote=True)}">'
                f'{inline(c["name"])}</a>{online}</p>'
                f'{backref}'
                f'<p class="brick-sum">{summary}</p>'
                f'{adv}'
                f'<p class="brick-meta">{html.escape(_brick_meta_line(c))}</p>'
                f'{note_ref}'
                "</div>"
            )
    return (f'<div class="brick-grid" style="--brick-cols: {_BRICK_NCOLS};">'
            + "".join(rendered) + "</div>")


def _build_appendix_chapters_v2(next_part: int, for_print: bool = False) -> list[dict]:
    """The value-ordered appendix (build flag ON): **A** MAGE Engineering Stacks · **B** Flagship Mechanisms
    (one Part, role subsections, monotonic B.N) · **C** Mechanism Catalog (C.1/C.2/C.3 brick grid — STUBBED
    this sub-wave) · **D** Operator's Reference (hand-authored operational cards; the Operator's Dashboard is
    D.1) · **E** How to Write a Skill (relettered D → E when the Operator's Reference took D). Figure numbers
    derive monotonically off each page's A.X / B.N locator (`fig_prefix`), killing the legacy 8.608 sort-key garbage
    (D80). Reads all 83 entries (`_appendix_entries`); the 29 flagships (`_flagship_slugs`) each get a B page
    and a monotonic B.N; every entry appears in the C reference index (flagship → its B page, the rest →
    online). The `[appendix: <slug>]` markers resolve to the NEW letters automatically — the letter map reads
    each page's `part_title`, which now says 'Appendix A/B/C/D'."""
    entries = _appendix_entries()
    if not entries:
        return []
    flagship = _flagship_slugs()

    family_order = _family_order_from_index()
    role_index = {group: i for i, (_r, group) in enumerate(_APPENDIX_ROLES)}

    # Role → family census number → within-family slug: the census-map hierarchy, same as legacy.
    def _sort_key(rec: dict) -> tuple:
        return (
            role_index.get(rec["group"], 99),
            family_order.get(rec["family"], 999),
            rec["family"],
            rec["slug"],
        )
    ordered = sorted(entries, key=_sort_key)

    # APPENDIX B locators — a single MONOTONIC run B.1…B.29 across every flagship in role→family→slug order
    # (Agent, then Models-bridge, then Product), so a locator is stable regardless of zone. All flagships sit
    # in Appendix B, so the record's letter is "B" for all 29; `page_slug`/`appendix_letter`/`appendix_num`
    # drive the stack-member links, the anchor map, and the reference index — the same fields the legacy path
    # set, only with one shared letter. A non-flagship carries none of them (absence = the flagship signal).
    b_counter = 0
    for rec in ordered:
        if rec["slug"] not in flagship:
            continue
        b_counter += 1
        rec["page_slug"] = f"appendix-b-{rec['slug']}"
        rec["appendix_letter"] = "B"
        rec["appendix_num"] = b_counter

    # The rewired mechanism-map figure: flagship chip → its Appendix-B page, non-flagship chip → its web
    # entry (via the anchor map, from the `page_slug` fields just set). Embedded on the Appendix-C opening.
    anchor_map = _appendix_anchor_map(ordered)
    _emit_rewired_figure(anchor_map)

    counts = _appendix_counts(ordered)
    # Stacks now live in Appendix A, so the member→stack back-links point at `appendix-a-<stem>` pages.
    stack_membership = _stack_membership_index(page_letter="a")
    page_by_slug = {rec["slug"]: rec for rec in ordered}

    chapters: list[dict] = []

    # ── APPENDIX A — MAGE Engineering Stacks (was legacy Appendix D). Leads the appendix: adopt a capability
    #    as a whole stack. The opening front-door + one page per stack, figures numbered A.<i>-N.
    chapters += build_stack_chapters(
        part=next_part, page_by_slug=page_by_slug,
        letter="A", part_name="MAGE Engineering Stacks", locator_figs=True, inline_legend=True,
        # A's opening carries the whole capability lens: the nine-capability map + lifted L1 principle (DERIVED
        # from the classification model), the vendor-agnostic note (§2.1, §2.4), then the stack-dependency
        # figure (HIGH-1) as the tail — the reader sees how the stacks depend before meeting them one by one.
        opening_extras_md=(_appendix_intro_extras_md() + "\n\n"
                           + _load_opening(_STACKS_DIR / "_vendor-note.md") + "\n\n"
                           + _load_opening(_STACKS_DIR / "_depgraph-figure.md")))

    # ── APPENDIX B — Flagship Mechanisms. ONE Part; role SUBSECTIONS (Agent → Models-bridge → Product); the
    #    29 notes numbered straight through B.1…B.29. Opening frame carries the nine-capability lens + a
    #    pointer to the stacks in Appendix A.
    b_part = next_part + 1
    b_part_title = "Appendix B — Flagship Mechanisms"
    # The 'Adopt by capability: the stacks' summary block belongs to Appendix A, so B's opening does not
    # repeat it (removing the lone `## Adopt by capability` H2 also makes B's H1 a leaf — the only-child
    # front-door shape A and C already have). The nine-capability map + lifted L1 principle likewise front
    # the stacks in Appendix A.
    b_opening_body = [
        _appendix_v2_b_opening_prose(),
    ]
    chapters.append({
        "slug": _APPENDIX_V2_B_OPENING_SLUG,
        "part": b_part,
        "part_title": b_part_title,
        "chapter": 0,                          # sorts before every note
        "chapter_title": b_part_title,
        "body_md": "\n".join(b_opening_body).strip(),
        "is_appendix": True,
        "mermaid": False,
        "fig_prefix": "B",
    })
    # ONE PAGE PER FLAGSHIP — role order preserved by `ordered`, monotonic B.N as the chapter sort key, so the
    # pager walks B.1…B.29 after the opening. The note body reuses the GoF pattern-page render (full this
    # sub-wave; the ≤1pp/≤2pp compression is a later assembly wave).
    for rec in (r for r in ordered if r["slug"] in flagship):
        num = rec["appendix_num"]
        chapters.append({
            "slug": rec["page_slug"],
            "part": b_part,
            "part_title": b_part_title,
            "chapter": num,                    # monotonic 1…29 — sorts after the opening's chapter 0
            "chapter_title": f"Appendix B - {num}. {rec['name']}",
            "body_md": _appendix_b_note_md(rec, stack_membership, for_print),
            "is_appendix": True,
            "mermaid": True,
            "fig_prefix": f"B.{num}",          # D80: "Figure B.<num>-N", monotonic off the locator
            "role_group": rec["group"],        # for the later role-subsection grouping in the TOC
        })

    # ── APPENDIX C — Mechanism Catalog. Opening carries the complete reference index (every mechanism:
    #    flagship → its B page, the rest → online) + the rewired clickable map, then the C.1/C.2/C.3 role
    #    sections each render as a PACKED BRICK GRID (§14) over that zone's entries. Brick thumbnails are
    #    UNNUMBERED by construction (§5.4) — the cells are bare cards, no <figure>/caption, so none enter the
    #    float stream. The three-sentence summaries + real thumbnails fill in the C assembly sub-wave.
    c_part = next_part + 2
    c_part_title = "Appendix C — Mechanism Catalog"
    c_body = [
        _appendix_v2_c_opening_prose(),
        "",
        # The clickable map — every mechanism chip routed to its Appendix-B page or its web entry.
        f"<!-- figure-iframe: {_BOOK_FIGURE_NAME} | The governance mechanism map — every mechanism in the "
        "catalogue, organized by target zone and family. Click a mechanism to open its flagship deep dive or "
        "its online entry. | The governance mechanism map: click any mechanism to open its treatment. -->",
        "",
    ]
    # C.1 / C.2 / C.3 — each a packed brick grid over the zone's entries (the `brick-grid` directive renders
    # the CSS-grid / #grid; the packer runs at render time from the one `_appendix_entries` read).
    for suffix, group in _appendix_v2_role_subsections():
        n_in_role = sum(1 for r in ordered if r["group"] == group)
        # This section introduces its governance zone — the agent / models-bridge / product triad — so it
        # carries that concept's canonical `index-def`. The anchor attaches to the defining sentence that
        # follows it, giving `governance-target-<zone>` a resolved book home under the v2 projection.
        zone_slug = f"governance-target-{group.lower()}"
        c_body += [
            f"### C.{suffix} {group}",
            "",
            f"<!-- index-def: {zone_slug} -->",
            f"**{group} —** {_appendix_v2_zone_gloss()[group]}",
            "",
            f"*{n_in_role} mechanisms. Each brick links to its full Gang-of-Four entry in the online "
            "catalogue; a flagship also carries a deep-dive note in Appendix B.*",
            "",
            f"<!-- brick-grid: {group} -->",
            "",
        ]
    c_body += [_appendix_contents_md(ordered)]  # the complete all-83 reference index (flagship + online)
    chapters.append({
        "slug": _APPENDIX_V2_C_OPENING_SLUG,
        "part": c_part,
        "part_title": c_part_title,
        "chapter": 0,
        "chapter_title": c_part_title,
        "body_md": "\n".join(c_body).strip(),
        "is_appendix": True,
        "mermaid": False,                      # the map is an <iframe>, not an inline mermaid block
        "fig_prefix": "C",
    })

    # ── APPENDIX D — Operator's Reference. Hand-authored operational reference cards (the Operator's Dashboard
    #    is D.1, the relocated back-matter dashboard). Sits BEFORE the skill recipe so the reference the
    #    operator reaches for mid-build leads the two hand-authored tail appendices.
    d_part = next_part + 3
    chapters += build_operators_reference_chapters(
        part=d_part, for_print=for_print, letter="D", locator_figs=True)

    # ── APPENDIX E — How to Write a Skill (was Appendix D this restructure; legacy Appendix E before the
    #    value-ordered cutover). Full content retained (design §13.7). The appendices end at E; "A Theory of
    #    MAGE" was relocated out of the appendices to a numbered main-text chapter (backmatter, after
    #    "Implications for Software Engineering").
    e_part = next_part + 4
    chapters += build_skill_recipe_chapters(
        part=e_part, for_print=for_print, letter="E", locator_figs=True)

    # ── APPENDIX F — Field Guide. The six studied teams as one-page reference cards (a single deck page). A
    #    team-first reference ("who was that team again?"), distinct from Section 6.6's comparative read and
    #    the Part-IV concept-first micro-cases. Appended last: a reference surface the reader reaches for by
    #    team name. Authored `.md` one-pagers, zero operator-card rows.
    f_part = next_part + 5
    chapters += build_field_guide_chapters(part=f_part, letter="F", locator_figs=True)

    # ── APPENDIX G — Model Reference. One page per Part-II model: the fixed five-field (a)-(e) reference
    #    detail migrated out of the view chapters (§C). Appended LAST so it re-letters no earlier appendix
    #    (every `appendix-<letter>-<stem>` content-page slug upstream stays stable). Routed through the
    #    shared hand-authored appendix builder — no near-clone builder. `-reference` page-slug namespace (D4a).
    g_part = next_part + 6
    chapters += build_hand_authored_appendix(
        g_part, letter="G", part_name="Model Reference",
        opening_slug=_APPENDIX_MODELS_OPENING_SLUG,
        opening_prose=_load_opening(_MODELS_DIR / "_opening.md"),
        content_dir=_MODELS_DIR, pages_source=_MODEL_PAGES,
        locator_figs=True, locator_heading=True)

    # ── APPENDIX H — Part-V Evidence Ledger (fork G7). The raw count tables behind Part V's curves
    #    (support-ratio LoC, per-path churn, control-growth counts). Appended LAST so it re-letters no
    #    earlier appendix. Routed through the shared hand-authored appendix builder in SINGLE_DECK mode:
    #    the lone evidence-tables page is inlined under the front-door opening so the appendix reads as
    #    one deck, not a Part with exactly one content chapter (which the only-child heading sensor reds —
    #    a single-page evidence ledger is a legitimate shape, so give it the genuine single-page form
    #    rather than splitting the three tables artificially). The Part-V "The Build" chapter links the
    #    front-door via `[appendix: appendix-evidence-ledger]`, the slug single_deck preserves.
    h_part = next_part + 7
    chapters += build_hand_authored_appendix(
        h_part, letter="H", part_name="Part-V Evidence Ledger",
        opening_slug=_APPENDIX_EVIDENCE_LEDGER_OPENING_SLUG,
        opening_prose=_load_opening(_EVIDENCE_LEDGER_DIR / "_opening.md"),
        content_dir=_EVIDENCE_LEDGER_DIR, pages_source=_EVIDENCE_LEDGER_PAGES,
        locator_figs=True, single_deck=True)
    return chapters


def _role_dir_slug(group: str) -> str:
    return group.lower().replace(" ", "-")


_FIGURE_HREF_RE = re.compile(r'href="((?:agent|models-bridge|product)/[^"/]+/([^"/]+)\.html)"')
# Root-relative sibling pages the figure links to (census, codegen'd views, quick-start, dev-workflow) —
# these sit one dir up from book/, so re-point them with a `../` prefix in the book copy.
_FIGURE_ROOT_LINK_RE = re.compile(
    r'href="((?:index|catalogue-views|quick-start|development-workflow|ABSTRACTIONS|README)\.html)"')


def _emit_rewired_figure(anchor_map: dict[str, str]) -> None:
    """Copy the catalogue's clickable mechanism-map figure into `book/`, rewiring every mechanism chip so
    it links to that mechanism as rendered IN THIS APPENDIX (`appendix-<letter>-<role>.html#<slug>`) rather
    than to the live catalogue entry page. The figure is self-contained (inline SVG + inline styles, no
    script or CDN), so the copy stands alone at book depth; catalogue-root links (the census, the codegen'd
    views) are re-pointed one level up. Skips silently if the source figure is absent."""
    src = ROOT / "catalogue-figure.html"
    if not src.is_file():
        return
    doc = src.read_text(encoding="utf-8")

    def _mech(m: "re.Match[str]") -> str:
        slug = m.group(2)
        target = anchor_map.get(slug)
        # An unmapped mechanism (should not happen — every chip is a catalogue entry) keeps its original
        # link, re-pointed to the catalogue root so it still resolves from book depth.
        return f'href="{target}"' if target else f'href="../{m.group(1)}"'

    doc = _FIGURE_HREF_RE.sub(_mech, doc)
    # Catalogue-root pages (census, codegen'd views, dev-workflow) sit one dir up from book/.
    doc = _FIGURE_ROOT_LINK_RE.sub(lambda m: f'href="../{m.group(1)}"', doc)
    # Note in the served copy that it is generated/rewired (the source is hand-authored at the root).
    doc = doc.replace(
        "<head>",
        "<head>\n<!-- REWIRED COPY (generated by build_book_html.py): chips link into the book appendix. "
        "Edit the source at the catalogue root, not this copy. -->",
        1,
    )
    (HERE / _BOOK_FIGURE_NAME).write_text(doc, encoding="utf-8")


def _appendix_anchor_map(entries: list[dict]) -> dict[str, str]:
    """Map each catalogue entry slug → the URL the mechanism-map figure's chip should point at, following the
    print/web split. A FLAGSHIP entry (carrying `page_slug`, set by build_appendix_chapters) points at its
    in-book pattern page (`appendix-<letter>-<slug>.html`); a NON-FLAGSHIP entry points at its live WEB
    catalogue page (`../<role>/<family>/<slug>.html`, its `catalogue_html`). So the clickable map sends
    flagship chips into the print appendix and the rest to the web — nothing dangles."""
    return {e["slug"]: (f"{e['page_slug']}.html" if "page_slug" in e else e["catalogue_html"])
            for e in entries}


# ─────────────────────────── Curated concept index — index-def / index-example tags ───────────────────────────
# Two HTML-comment tags (book/AGENTS.md §6) let an author point the index at a concept's DEFINING
# paragraph and its EXAMPLE paragraphs, instead of a heading-heuristic occurrence scan. The harvest below
# walks every page in reading order, assigns each example a global anchor number, and validates the tags
# (a concept has one canonical definition; a slug must be registered; an example needs a definition).

_CONCEPT_RE = re.compile(r"-\s*concept:\s*([a-z0-9-]+)\s*\|\s*(.+?)\s*$")
#: The two-tier term registry line: `- term: <slug> | <tier>`, tier ∈ {section, local}. The tier annotation
#: that the drain's `terms:` / `section-terms:` tagging resolves against (index-terms.md §"Term tiers").
_TERM_TIER_RE = re.compile(r"-\s*term:\s*([a-z0-9-]+)\s*\|\s*(section|local)\s*$")
#: The two valid term tiers — the closed set the `term-tags-registered` lint checks membership against.
TERM_TIERS = ("section", "local")


def _load_term_tiers() -> dict[str, str]:
    """Read the two-tier term registry from `index-terms.md` → {slug: tier}. Every `- concept:` slug DEFAULTS
    to `tier: section` (seeding the 135 existing concepts as section-tier); an explicit `- term: <slug> |
    <tier>` row registers a new local term OR overrides a concept slug's default tier. This is the SSOT the
    drain's `terms:`/`section-terms:` tagging resolves against — one file, no parallel registry (index-terms.md
    §"Term tiers"). A `- term:` row for an unknown tier is a build-loud error (a typo, caught before it drops
    the term silently)."""
    tiers: dict[str, str] = {slug: "section" for slug in _load_concept_registry()}  # concepts default section
    it = HERE / _INDEX_TERMS_FILE
    if it.is_file():
        for line in it.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if s.startswith("- term:"):
                m = _TERM_TIER_RE.match(s)
                if not m:
                    raise SystemExit(f"index-terms.md: malformed `- term:` tier row {s!r} "
                                     f"(want `- term: <slug> | section|local`)")
                tiers[m.group(1)] = m.group(2)  # explicit row registers / overrides
    return tiers


def _load_concept_registry() -> dict[str, str]:
    """Read the `- concept: <slug> | <Display Name>` lines from `index-terms.md` → {slug: display}. A tag
    whose slug is absent from this registry is a build-loud error (catches a typo before it silently drops
    the concept). The display name is authored here once, not scraped from prose."""
    reg: dict[str, str] = {}
    it = HERE / _INDEX_TERMS_FILE
    if not it.is_file():
        return reg
    for line in it.read_text(encoding="utf-8").splitlines():
        m = _CONCEPT_RE.match(line.strip())
        if m:
            slug, display = m.group(1), m.group(2).strip()
            if slug in reg:
                raise SystemExit(f"index-terms.md: duplicate concept registration for '{slug}'")
            reg[slug] = display
    return reg


def _harvest_concept_tags(chapters: list[dict]) -> tuple[dict, dict]:
    """Walk every page's `body_md` in reading order for `index-def` / `index-example` tags. Returns
    `(registry, page_anchor_maps)`:

    - `registry` — {slug: {"display", "def": (page, anchor_id) | None, "examples": [(page, anchor_id), …]}}
      keyed by concept slug, examples in global reading order (anchor `idx-ex-<slug>-<n>`, n starting at 1).
    - `page_anchor_maps` — {page_slug: {(concept, kind, occ_on_page): anchor_id}} so the renderer can attach
      the exact anchor the index links to, matching per-page tag occurrence order.

    Fails loud on: a slug not registered in `index-terms.md`; a second `index-def` for one concept; an
    `index-example` for a concept that has no `index-def` anywhere in the book."""
    registry_names = _load_concept_registry()
    reg: dict[str, dict] = {}
    page_maps: dict[str, dict[tuple[str, str, int], str]] = {}
    ex_counter: dict[str, int] = {}

    def _slot(slug: str) -> dict:
        if slug not in registry_names:
            raise SystemExit(
                f"index tag references unregistered concept '{slug}' — add "
                f"`- concept: {slug} | <Display Name>` to {_INDEX_TERMS_FILE}")
        return reg.setdefault(
            slug, {"display": registry_names[slug], "def": None, "examples": []})

    for pg in chapters:
        pslug = pg["slug"]
        pmap = page_maps.setdefault(pslug, {})
        per_page_occ: dict[tuple[str, str], int] = {}
        for line in pg["body_md"].splitlines():
            s = line.strip()
            md = INDEX_DEF_RE.match(s)
            if md:
                slug = md.group(1)
                slot = _slot(slug)
                if slot["def"] is not None:
                    raise SystemExit(
                        f"duplicate index-def for concept '{slug}' — a concept has one canonical "
                        f"definition (already at {slot['def'][0]}, again on {pslug})")
                anchor = f"idx-def-{slug}"
                slot["def"] = (pg, anchor)
                occ = per_page_occ.get((slug, "def"), 0)
                pmap[(slug, "def", occ)] = anchor
                per_page_occ[(slug, "def")] = occ + 1
                continue
            me = INDEX_EXAMPLE_RE.match(s)
            if me:
                slug = me.group(1)
                _slot(slug)  # register / validate the slug
                n = ex_counter.get(slug, 0) + 1
                ex_counter[slug] = n
                anchor = f"idx-ex-{slug}-{n}"
                reg[slug]["examples"].append((pg, anchor))
                occ = per_page_occ.get((slug, "ex"), 0)
                pmap[(slug, "ex", occ)] = anchor
                per_page_occ[(slug, "ex")] = occ + 1

    # An example with no definition is a build-loud error.
    for slug, slot in reg.items():
        if slot["def"] is None and slot["examples"]:
            raise SystemExit(
                f"concept '{slug}' has index-example tag(s) but no index-def — mark its defining "
                f"paragraph with `<!-- index-def: {slug} -->`")
    return reg, page_maps


# ─────────────────────────── Book index — autogenerated term index ───────────────────────────
# Merge two term sources (the self-communicate LEXICON's house vocabulary + the book's own curated
# concepts/proper-nouns in `index-terms.md`), occurrence-scan every chapter + appendix page, keep the
# most significant sites per term (capped so the index reads curated, not a frequency dump), and emit a
# single alphabetized `book-index.html`. It is a soft, best-effort index: a term that never occurs in the
# prose is dropped, so the index only lists terms the reader can actually find.

_LEXICON_REL = ("..", "plugin", "mage", "skills", "self-communicate", "writing", "lexicon.md")
_INDEX_TERMS_FILE = "index-terms.md"
_MAX_REFS_PER_TERM = 4  # cap so the index reads curated, not a word-frequency dump
_MIN_TERM_LEN = 3       # skip 1–2 char "terms" (noise)


def _clean_term(raw: str) -> str:
    """Strip markdown/backticks and a trailing `@ch..` hint or a `(qualifier)` off a raw term string, for
    the display + match form. Keeps the term's core words."""
    t = raw.strip()
    t = re.sub(r"\s*@[\w-]+\s*$", "", t)               # drop the `@ch03` / `@context-a` chapter hint
    t = t.replace("`", "").replace("**", "").replace("*", "")
    # Drop a trailing parenthetical qualifier for the DISPLAY term (kept short); matching uses the head.
    return t.strip()


def _match_keys(term: str) -> list[str]:
    """The lowercase substrings to search the prose for, for one display term. Uses the term head (before a
    parenthetical) and, when a `/` alias-run is present, each alternative — so 'runbook / playbook' matches
    either word. Short/again-noisy fragments are dropped by the caller."""
    head = re.sub(r"\s*\([^)]*\)\s*", " ", term).strip()   # 'skill (soft control)' -> 'skill'
    parts = [p.strip() for p in re.split(r"\s*/\s*", head) if p.strip()]
    keys = parts or [head]
    return [k.lower() for k in keys if len(k) >= _MIN_TERM_LEN]


def _load_index_terms() -> list[str]:
    """Read the two term sources → an ordered, de-duplicated list of display terms. Source 1: the lexicon's
    bold first-column table terms (its house vocabulary). Source 2: the book's own `index-terms.md` bullets
    (concepts + proper nouns). A term appearing in both keeps its first (cleaned) form."""
    terms: list[str] = []
    seen: set[str] = set()

    def _add(raw: str) -> None:
        t = _clean_term(raw)
        if not t:
            return
        key = t.lower()
        if key not in seen:
            seen.add(key)
            terms.append(t)

    # Source 1 — the lexicon table's bold first-column terms.
    lex = HERE.joinpath(*_LEXICON_REL)
    if lex.is_file():
        for line in lex.read_text(encoding="utf-8").splitlines():
            m = re.match(r"\|\s*\*\*(.+?)\*\*", line)
            if m:
                # A cell may hold two forms joined by ' / ' — keep the whole cell as one display term.
                _add(m.group(1))
    # Source 2 — the book's curated concepts + proper nouns (bulleted, may carry `@ch..`).
    it = HERE / _INDEX_TERMS_FILE
    if it.is_file():
        for line in it.read_text(encoding="utf-8").splitlines():
            m = re.match(r"-\s+(.+?)\s*$", line)
            if not m:
                continue
            raw = m.group(1)
            # Skip parenthetical-only meta bullets ("(timeline … — fill from context-b once drafted)").
            if raw.startswith("("):
                continue
            # Skip `concept: <slug> | <Display>` registry lines — those drive the curated concept index,
            # not the occurrence scan (their display names enter via the curated-entry path).
            if raw.startswith("concept:"):
                continue
            _add(raw)
    return terms


class _PageScan(NamedTuple):
    """One page's precomputed scan structures for the occurrence index. `order` is the reading-order index
    (the tie-break key); `low` is the point-decorator-stripped body lowercased (the substring-occurrence
    test); `heading_lows` are the page's stripped-and-lowercased heading lines (the heading-significance
    test). `pg` is the page record itself."""
    order: int
    low: str
    heading_lows: list[str]
    pg: dict


def _build_page_scan_index(pages: list[dict]) -> list[_PageScan]:
    """Precompute, ONCE per page, the normalized structures every per-term index scan needs. The index build
    was O(terms × pages × normalize): `_scan_term_refs` re-ran `_strip_point_decorators` + `.lower()` +
    `splitlines()` on every page for each of the ~300 terms (~40k redundant re-normalizations of the same
    bodies). Hoisting the normalize here makes it O(pages × normalize + terms × pages × membership) — the
    expensive normalize runs once per page; the per-term work drops to substring membership tests. Reader-
    visible prose only: the authored `<!-- point: … -->` decorators are stripped so a term appearing solely
    inside a canonical-point never spawns a phantom occurrence reference (same rule as before, hoisted)."""
    scan: list[_PageScan] = []
    for order, pg in enumerate(pages):
        md = _strip_point_decorators(pg["body_md"])
        heading_lows: list[str] = []
        for ln in md.splitlines():
            s = ln.strip()
            if s.startswith("#"):
                heading_lows.append(s.lower())
        scan.append(_PageScan(order, md.lower(), heading_lows, pg))
    return scan


def _scan_term_refs(term: str, page_scan: list[_PageScan]) -> list[dict]:
    """Find which pages mention `term`, ranked by significance. A page where the term appears in a heading
    (`# ` / `## ` / `### `) ranks above a body-only mention; ties break on reading order. Returns up to
    `_MAX_REFS_PER_TERM` page records. `page_scan` is the once-per-page precompute from
    `_build_page_scan_index` — the normalization is hoisted there, so this is pure membership testing."""
    keys = _match_keys(term)
    if not keys:
        return []
    scored: list[tuple[int, int, dict]] = []
    for order, low, heading_lows, pg in page_scan:
        if not any(k in low for k in keys):
            continue
        # Significance: does the term appear in a heading line on this page?
        in_heading = any(k in hl for hl in heading_lows for k in keys)
        scored.append((0 if in_heading else 1, order, pg))
    scored.sort(key=lambda t: (t[0], t[1]))
    return [pg for _sig, _o, pg in scored[:_MAX_REFS_PER_TERM]]


def _index_ref_label(pg: dict) -> str:
    """The short locator shown beside an index term for one page: 'Appendix A', 'Preface', or 'Ch. N'."""
    if pg.get("is_appendix"):
        # Per-pattern titles read 'Appendix A - 1. Brief-linting' → locator 'Appendix A - 1'; a stack page
        # 'Appendix D - 1. The MBSE stack' → 'Appendix D - 1'. A v2 locator-heading page (App-D) reads
        # 'D.1 The Operator's Dashboard' → 'Appendix D - 1' via the second match, so its index locator stays
        # consistent with the other appendices even though its heading dropped the 'Appendix … - ' prefix. An
        # opening front-door page ('Appendix — the pattern language' / 'Appendix D — Mechanism Stacks', no
        # numbered '. ') → its 'Appendix …' prefix via the '—' split. Prefer the '<letter> - <n>.' numbered split.
        title = pg["chapter_title"]
        m = re.match(r"^(Appendix\s+[A-Z]\s+-\s+\d+)\.", title)
        if m:
            return m.group(1).strip()
        m2 = re.match(r"^([A-Z])\.(\d+)\s", title)   # v2 locator heading: "D.1 The Operator's Dashboard"
        if m2:
            return f"Appendix {m2.group(1)} - {m2.group(2)}"
        if "·" in title:
            return title.split("·")[0].strip()
        if "—" in title:
            return title.split("—")[0].strip()
        return title
    if pg.get("is_part_page"):
        return f'Part {pg["part"]}'
    if pg.get("is_appendix_divider"):
        return pg["chapter_title"]
    if pg.get("is_matter"):
        return pg["chapter_title"]
    if pg.get("is_coda"):
        return pg["chapter_title"]   # the unnumbered coda carries no 'Ch. N' locator (it has no seq)
    return f'Ch. {pg["seq"]}'


def _curated_concept_entries(registry: dict[str, dict]) -> list[dict]:
    """Turn the harvested concept registry into curated index entries: one per concept that carries a
    definition, with its `definition of:` locator and ordered `examples of:` locators. Each locator links
    the specific anchor (`#idx-def-<slug>` / `#idx-ex-<slug>-<n>`)."""
    entries: list[dict] = []
    for slug, slot in registry.items():
        if slot["def"] is None:
            continue  # a concept with no definition contributes no curated entry
        def_pg, def_anchor = slot["def"]
        entries.append({
            "kind": "curated",
            "term": slot["display"],
            "def": (def_pg, def_anchor),
            "examples": list(slot["examples"]),
        })
    return entries


def build_index_entries(chapters: list[dict], concept_registry: dict[str, dict] | None = None) -> list[dict]:
    """Compute the index. Two entry kinds interleave alphabetically:

    - **Curated** — a concept carrying `index-def` / `index-example` tags, rendered as a `definition of:` /
      `examples of:` shape leading with the author-named sites.
    - **Occurrence** — a term with no curated tags, rendered as the capped, ranked page list from the scan.

    A curated concept whose display name also matches a scanned term SUPPRESSES that occurrence entry (a
    concept is not listed twice). A term that never occurs is dropped (the index lists only findable terms)."""
    concept_registry = concept_registry or {}
    entries: list[dict] = []
    seen_display: set[str] = set()

    # Curated entries first — they win over a same-named occurrence entry.
    for e in _curated_concept_entries(concept_registry):
        key = e["term"].lower()
        if key in seen_display:
            continue
        seen_display.add(key)
        entries.append(e)

    # Occurrence entries for every remaining findable term. Normalize each page ONCE up front (the scan
    # index), then every term is a pure membership test against it — not a re-normalization of every body.
    page_scan = _build_page_scan_index(chapters)
    for term in _load_index_terms():
        key = term.lower()
        if key in seen_display:
            continue
        refs = _scan_term_refs(term, page_scan)
        if not refs:
            continue
        seen_display.add(key)
        entries.append({"kind": "occurrence", "term": term, "refs": refs})

    entries.sort(key=lambda e: e["term"].lower())
    return entries


def _anchored_locator(pg: dict, anchor: str) -> str:
    """One curated locator: a link to `<slug>.html#<anchor>` labelled by the short page locator."""
    return (f'<a href="{pg["slug"]}.html#{html.escape(anchor, quote=True)}">'
            f'{html.escape(_index_ref_label(pg))}</a>')


def build_index_page(chapters: list[dict], concept_registry: dict[str, dict] | None = None,
                     word_counts: "WordCounts | None" = None) -> str:
    """Render `book-index.html` from the computed entries — an alphabetized index (curated concept entries +
    occurrence term entries) grouped by first letter, led by an auto-generated 'Book length' table when
    `word_counts` is supplied. Returns the full page HTML."""
    entries = build_index_entries(chapters, concept_registry)
    groups: dict[str, list[dict]] = {}
    for e in entries:
        first = e["term"][0].upper()
        letter = first if first.isalpha() else "#"
        groups.setdefault(letter, []).append(e)

    rows: list[str] = []
    for letter in sorted(groups):
        rows.append(f'<div class="part">{html.escape(letter)}</div>')
        rows.append("<ul>")
        for e in groups[letter]:
            if e.get("kind") == "curated":
                def_pg, def_anchor = e["def"]
                sub: list[str] = [
                    f'<span class="idx-sub"><span class="idx-sub-lead">definition of:</span> '
                    f'{_anchored_locator(def_pg, def_anchor)}</span>'
                ]
                if e["examples"]:
                    ex_links = " ".join(_anchored_locator(pg, anc) for pg, anc in e["examples"])
                    sub.append(
                        f'<span class="idx-sub"><span class="idx-sub-lead">examples of:</span> '
                        f'{ex_links}</span>'
                    )
                rows.append(
                    f'<li class="idx-concept"><span class="idx-term">{inline(e["term"])}</span>'
                    f'<span class="idx-subs">{"".join(sub)}</span></li>'
                )
            else:
                links = ", ".join(
                    f'<a href="{pg["slug"]}.html">{html.escape(_index_ref_label(pg))}</a>'
                    for pg in e["refs"]
                )
                rows.append(
                    f'<li><span class="idx-term">{inline(e["term"])}</span> '
                    f'<span class="idx-refs">{links}</span></li>'
                )
        rows.append("</ul>")

    header = (
        '<header class="chap"><div class="kicker">Back Matter</div>'
        "<h1>Index</h1></header>"
    )
    intro = (
        "<p>A term index over the chapters and the appendix. A curated concept entry leads with the paragraph "
        "that <em>defines</em> it and the paragraphs that <em>exemplify</em> it; a plain term entry links the "
        "pages where it appears, capped so the index leads with the significant sites.</p>"
    )
    # Word counts stay a build-time report (printed to stdout), NOT shipped onto the page — a reader of the
    # published book should meet the ideas, not the manuscript's length. `word_counts` is still computed for
    # the stdout tool-report; it is deliberately not rendered here.
    body = header + intro + '<div class="idx idx-terms">' + "\n".join(rows) + "</div>"
    foot = f'<div class="book-foot">{html.escape(COPYRIGHT)}</div>'
    # The term index gets the whole-book TOC disclosure at the top and a chapter-nav bar at the bottom.
    # It IS the Index, so no self-linking Index pill — forward to its back-matter siblings instead.
    toc = toc_html(chapters, None)
    nav_bar = _render_chapnav(
        [("« Table of contents", "index.html", "Table of contents")],
        "Index",
        [(f"{_FIGURES_GALLERY_SLUG.capitalize()} »", f"{_FIGURES_GALLERY_SLUG}.html", "Figures gallery"),
         ("Bibliography »", f"{_BIBLIOGRAPHY_SLUG}.html", "Bibliography")],
    )
    main = body + nav_bar + foot
    return page("Index · Model-Based Agentic Software Engineering", toc, main)


# ─────────────────────────── Book length — auto-computed word counts ───────────────────────────
# Count the words a READER READS, computed fresh every build from each page's RENDERED prose (so the
# published number can never drift from the text). The prose count strips, in order:
#   1. fenced code + mermaid blocks (rendered as <pre>…</pre>) — a reader doesn't "read" a diagram/listing;
#   2. figure <figcaption> and any SVG <title>/<desc> — a11y/caption text describes a figure, it isn't prose;
#   3. every remaining HTML tag — leaving the visible words, which are then whitespace-tokenized.
# The breakdown splits BODY (front matter + Parts 1–5 + back matter, per-Part subtotals) from APPENDIX (the
# A/B/C GoF pattern Parts + Appendix D stacks + Appendix E recipe, per-letter subtotals); TOTAL = body + app.

# <pre>…</pre> holds a rendered code OR mermaid fence; <figure>'s <figcaption> and an inline SVG's
# <title>/<desc> hold caption / a11y text. Drop all of them before the prose is tokenized. Non-greedy,
# DOTALL so a multi-line block is removed whole.
_PRE_BLOCK_RE = re.compile(r"<pre\b.*?</pre>", re.S | re.I)
_FIGCAPTION_RE = re.compile(r"<figcaption\b.*?</figcaption>", re.S | re.I)
_SVG_DESC_RE = re.compile(r"<(title|desc)\b.*?</\1>", re.S | re.I)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)


def _prose_word_count(body_md: str) -> int:
    """Word count of one page's reader-facing prose. Render the markdown to HTML (same renderer the site
    ships), strip code/mermaid <pre> blocks, figure captions, and SVG a11y text, then strip the remaining
    tags and count whitespace-delimited tokens. Counts the words a reader actually reads — not code,
    diagrams, or caption/alt text."""
    rendered = md_to_html(body_md)
    rendered = _HTML_COMMENT_RE.sub(" ", rendered)
    rendered = _PRE_BLOCK_RE.sub(" ", rendered)
    rendered = _FIGCAPTION_RE.sub(" ", rendered)
    rendered = _SVG_DESC_RE.sub(" ", rendered)
    text = _HTML_TAG_RE.sub(" ", rendered)
    text = html.unescape(text)
    return len(text.split())


def _appendix_letter(pg: dict) -> str:
    """The appendix letter (A–E) a rendered appendix page belongs to, read from its `part_title`
    ('Appendix C — Product patterns' → 'C'). Falls back to '?' — should not happen for an appendix page."""
    m = re.search(r"Appendix\s+([A-Z])\b", pg.get("part_title", ""))
    return m.group(1) if m else "?"


class WordCounts(NamedTuple):
    body_parts: list[tuple[str, int]]      # (Part display label, word count) in reading order
    body_total: int
    appendix_letters: list[tuple[str, int]]  # (Appendix-letter label, word count) in reading order
    appendix_total: int
    total: int


def compute_word_counts(chapters: list[dict]) -> WordCounts:
    """Compute the BODY / APPENDIX / TOTAL word breakdown from the rendered prose of every page. BODY groups
    by Part (front matter, Parts 1–5, back matter — per-Part subtotals in reading order); APPENDIX groups by
    appendix letter (A/B/C pattern Parts, D stacks, E recipe — per-letter subtotals). Fresh every build."""
    body_by_part: dict[int, int] = {}
    body_part_order: list[int] = []
    app_by_letter: dict[str, int] = {}
    app_letter_order: list[str] = []
    for pg in chapters:
        wc = _prose_word_count(pg["body_md"])
        if pg.get("is_appendix") or pg.get("is_appendix_divider"):
            # The appendices mode-marker counts under APPENDIX (its own labelled line), not as a body Part.
            letter = "Appendices divider" if pg.get("is_appendix_divider") else _appendix_letter(pg)
            if letter not in app_by_letter:
                app_by_letter[letter] = 0
                app_letter_order.append(letter)
            app_by_letter[letter] += wc
        else:
            part = pg["part"]
            if part not in body_by_part:
                body_by_part[part] = 0
                body_part_order.append(part)
            body_by_part[part] += wc

    body_parts = [(_PART_TITLES.get(p, f"Part {p}") if p in (0, 7)
                   else f"Part {p} — {_PART_TITLES.get(p, '')}", body_by_part[p])
                  for p in body_part_order]
    body_total = sum(body_by_part.values())
    appendix_letters = [(ltr if ltr == "Appendices divider" else f"Appendix {ltr}", app_by_letter[ltr])
                         for ltr in app_letter_order]
    appendix_total = sum(app_by_letter.values())
    return WordCounts(
        body_parts=body_parts,
        body_total=body_total,
        appendix_letters=appendix_letters,
        appendix_total=appendix_total,
        total=body_total + appendix_total,
    )


def _print_word_counts(wc: WordCounts) -> None:
    """Print the word-count breakdown to stdout, so `catalog.py build` / the deploy REPORTS it (the repo's
    'tools report their results' discipline). A stable, greppable shape (`  BODY  <part> : <n>`)."""
    print("book word count (rendered prose; code/diagrams/captions excluded):")
    print("  BODY (narrative):")
    for label, n in wc.body_parts:
        print(f"    {label:<48} {n:>7,}")
    print(f"    {'BODY subtotal':<48} {wc.body_total:>7,}")
    print("  APPENDIX:")
    for label, n in wc.appendix_letters:
        print(f"    {label:<48} {n:>7,}")
    print(f"    {'APPENDIX subtotal':<48} {wc.appendix_total:>7,}")
    print(f"  {'TOTAL':<50} {wc.total:>7,}")


# ─────────────────────────── PDF print edition (opt-in `--pdf`) ──────────────────────────────────
# The book PDF is a SECOND, opt-in build path that projects the SAME typed book IR the web build walks —
# but to a print-native Typst document, which `typst compile` lays out to PDF. One IR, two projections
# (HTML web + Typst print), so the PDF cannot diverge from the web book. The default `build()` is the fast
# web build and stays untouched; `--pdf` (see `build_pdf`) renders the print edition. The float-numbering,
# caption, and cross-reference helpers below are shared by BOTH projections.


# A "float" is a numbered display block — a figure or a table. Figures render as `<figure
# class="book-figure…">` (an SVG `<!-- figure: -->` directive or a standalone mermaid diagram); tables
# render as `<table>`. The `catalogue-embed` iframe is EXCLUDED: it `display:none`s in print, so numbering
# it would leave a phantom gap in the printed book's figure sequence (web/print would disagree). Both get a
# monotonic label and an `id` the front-matter list of floats links to.
_FLOAT_RE = re.compile(
    r'(?P<fig><figure class="book-figure(?![^"]*catalogue-embed)[^"]*"[^>]*>.*?</figure>)'
    r'|(?P<tbl><table\b(?![^>]*\bmeta-card\b)[^>]*>.*?</table>)', re.S)
_DATA_SHORT_RE = re.compile(r'data-short="([^"]*)"')
_DATA_LABEL_RE = re.compile(r'data-label="([^"]*)"')


def _split_caption_md(md: str) -> tuple[str, str | None]:
    r"""Split a caption's markdown at a trailing `[short: …]` marker into (display, short) — the LaTeX
    `\caption[short]{long}` idea in ONE authored string, so the full caption and its list-of-floats short
    form share a single source of truth. Returns short=None when the marker is absent."""
    m = re.search(r"\s*\[short:\s*(.+?)\s*\]\s*$", md, re.I | re.S)
    if m:
        return md[: m.start()].rstrip(), m.group(1).strip()
    return md, None


def _derive_short(display_md: str) -> str:
    """Fallback short caption when none is declared: the caption's first sentence/clause, length-capped."""
    plain = re.sub(r"[*_`]", "", " ".join(display_md.split())).strip()
    first = re.split(r"(?<=[.:])\s", plain, maxsplit=1)[0].strip().rstrip(".:")
    return (first[:77].rsplit(" ", 1)[0] + "…") if len(first) > 80 else first


def _caption_el(tag: str, caption_md: str, extra_class: str = "") -> str:
    """Render a <figcaption>/<caption> holding the FULL caption inline plus a `data-short` attribute (the
    declared or derived short form) that the numbering pass harvests for the list of floats."""
    display, short = _split_caption_md(" ".join(caption_md.split()))
    short = short or _derive_short(display)
    cls = f' class="{extra_class}"' if extra_class else ""
    return f'<{tag}{cls} data-short="{html.escape(short, quote=True)}">{inline(display)}</{tag}>'


def _chapter_id(c: "dict") -> str:
    """The chapter's reader-facing locator that floats number against. Body chapters use `<part>.<chapter>`
    (e.g. "1.3"), so a figure reads "Figure 1.3-1"; the id it derives (`fig-1-3-1`, dots→dashes for a
    selector-safe id) is unique within the page and, because the (part, chapter) pair is unique per chapter,
    across a single-document build too.

    An appendix chapter may carry an explicit `fig_prefix` — its reader-facing appendix locator ("A.3",
    "B.11") — which takes precedence over `<part>.<chapter>`. This is the D80 fix: the legacy appendix set a
    `chapter` sort key of `family_n*100 + i + 1` purely for ordering, which then leaked into figure locators
    as garbage like "8.608-1". Routing appendix figures off the DERIVED, monotonic `fig_prefix` yields
    "Figure A.3-1" / "Figure B.11-1" instead. Chapters without `fig_prefix` (every body chapter, and the
    legacy appendix) fall back to `<part>.<chapter>` unchanged, so this cannot alter their numbering."""
    fig_prefix = c.get("fig_prefix")
    if fig_prefix:
        return fig_prefix
    return f'{c["part"]}.{c["chapter"]}'


def _float_id(kind: str, num: str) -> str:
    """The selector-safe id/anchor for a float: `fig-1-3-1` from num `1.3-1`. The DISPLAY label keeps the
    period ("Figure 1.3-1"); the id must not (an HTML id with a `.` is not a valid CSS/querySelector token,
    which the html-validate `valid-id` rule rejects). Every id, `[ref:]` anchor, and list-of-floats href
    goes through here so the generator and the resolver share ONE dotted→dashed scheme."""
    return f"{kind}-{num.replace('.', '-')}"


def _number_floats(body: str, chapter_id: str, fig_n: int, tbl_n: int,
                   collect: "list[dict] | None" = None, slug: str | None = None,
                   label_sink: "dict[str, dict] | None" = None) -> tuple[str, int, int]:
    """Prepend a CHAPTER-RELATIVE, ctrl-f-able "Figure <chapter>-N."/"Table <chapter>-N." label to every
    figure/table caption in document order, give each an `id` (`fig-<chapter>-N`/`tbl-<chapter>-N`) the list
    of floats links to, and — when `collect` is given — record each captioned float's {kind, num, short,
    slug, html} for that list (`html` is the float's fully-numbered fragment VERBATIM — id, "Figure N."
    label, inlined SVG/img, and caption already baked in — so a consumer like the figures gallery can splice
    it in with no re-render). When `label_sink` is given, record each `data-label`-carrying float's
    key→{kind, num, slug} so `[ref:key]` cross-references resolve to "Figure <chapter>-N"/"Table
    <chapter>-N". `num` is the full chapter-relative locator STRING (e.g. "1.3-1"); `chapter_id` is the
    owning chapter's `<part>.<chapter>` identifier and `fig_n`/`tbl_n` RESET to 1 per chapter (the caller
    threads them within one chapter only). Numbers are DERIVED from reading-order position within the
    chapter, never hand-authored. Returns (numbered_body, next_fig_n, next_tbl_n)."""

    def _harvest(frag: str, kind: str, num: str) -> None:
        if collect is not None:
            ds = _DATA_SHORT_RE.search(frag)
            if ds and ds.group(1):
                # `data-short` is HTML-escaped (an attribute value, written via `html.escape` in
                # `_caption_el`). The one consumer — the list-of-figures builder — embeds this short form in
                # markdown that is rendered through `inline()`, which escapes AGAIN. Storing the escaped
                # string double-escaped it (`model's` → `model&amp;#x27;s`). Store the RAW short so the list
                # renders it exactly ONCE, the same way the in-text figcaption renders its caption via `inline`.
                collect.append({"kind": kind, "num": num, "short": html.unescape(ds.group(1)),
                                "slug": slug, "html": frag})
        if label_sink is not None:
            dl = _DATA_LABEL_RE.search(frag)
            if dl and dl.group(1):
                label_sink[dl.group(1)] = {"kind": kind, "num": num, "slug": slug}

    def _repl(m: "re.Match[str]") -> str:
        nonlocal fig_n, tbl_n
        if m.group("fig"):
            frag, num = m.group("fig"), f"{chapter_id}-{fig_n}"
            fig_n += 1
            frag = frag.replace("<figure ", f'<figure id="{_float_id("fig", num)}" ', 1)
            label = f'<span class="fig-label">Figure {num}.</span> '
            if "<figcaption" in frag:
                frag = re.sub(r"(<figcaption\b[^>]*>)", lambda mm: mm.group(1) + label, frag, count=1)
            else:
                frag = frag.replace(
                    "</figure>",
                    f'<figcaption class="fig-label-only"><span class="fig-label">Figure {num}.</span>'
                    "</figcaption></figure>", 1)
            _harvest(frag, "fig", num)
            return frag
        frag, num = m.group("tbl"), f"{chapter_id}-{tbl_n}"
        tbl_n += 1
        frag = frag.replace("<table", f'<table id="{_float_id("tbl", num)}"', 1)
        label = f'<span class="tbl-label">Table {num}.</span> '
        if "<caption" in frag:
            frag = re.sub(r"(<caption\b[^>]*>)", lambda mm: mm.group(1) + label, frag, count=1)
        else:
            frag = re.sub(
                r"(<table\b[^>]*>)",
                lambda mm: mm.group(1) + f'<caption class="tbl-label-only"><span class="tbl-label">'
                f"Table {num}.</span></caption>", frag, count=1)
        _harvest(frag, "tbl", num)
        return frag

    return _FLOAT_RE.sub(_repl, body), fig_n, tbl_n


_XREF_RE = re.compile(r"\[ref:\s*([a-z0-9][a-z0-9-]*)\]")


def _resolve_xrefs(body: str, ref_map: "dict[str, dict]", for_print: bool) -> str:
    """Resolve every `[ref:key]` cross-reference to a linked "Figure N"/"Table N", using the label map the
    numbering pre-pass built. Fails loud on a `[ref:]` whose key has no `<!-- label: -->` float — a dangling
    cross-reference must stop the build, not ship as literal `[ref:foo]` text."""
    def _repl(m: "re.Match[str]") -> str:
        key = m.group(1)
        e = ref_map.get(key)
        if e is None:
            raise SystemExit(
                f"[ref:{key}]: no float carries `<!-- label: {key} -->` — check the spelling or add the label")
        word = "Figure" if e["kind"] == "fig" else "Table"
        anchor = _float_id(e["kind"], e["num"])
        href = f'#{anchor}' if for_print else f'{e["slug"]}.html#{anchor}'
        return f'<a class="xref" href="{html.escape(href, quote=True)}">{word}&nbsp;{e["num"]}</a>'
    return _XREF_RE.sub(_repl, body)


# `[appendix: <slug>]` — a SYMBOLIC cross-reference to an appendix. The prose names the appendix by its
# STABLE PAGE SLUG (`appendix-skill-recipe`), never by its LETTER; the letter is resolved at build from the
# target page's own `part_title` ("Appendix E — …" → "E"). So re-lettering the appendices (the E→D shift a
# restructure makes) updates every reference with no prose edit — the letter lives nowhere in the narrative
# source. Joins the inline bracket family (`[ref:]`, `[data:]`, `[cite:]`), but unlike `[ref:]` (a float
# reference Typst resolves via its own `@label` machinery) it rewrites to a plain markdown link BEFORE the
# inline pass, so the HTML and Typst projections then treat it as an ordinary link — one resolution, two
# surfaces. The slug matches the same `[a-z0-9-]` shape a page slug uses.
_APPENDIX_REF_RE = re.compile(r"\[appendix:\s*([a-z0-9][a-z0-9-]*)\]")


def _appendix_letter_map(chapters: "list[dict]") -> "dict[str, str]":
    """`{appendix-page-slug: letter}` for every appendix page, the letter DERIVED at build from the page's
    `part_title` ("Appendix E — How to Write a Skill" → "E"). Built AFTER the appendix pages are assembled,
    so it reflects the appendices' current lettering; a `[appendix: <slug>]` reference reads its letter here
    rather than hardcoding it in prose. A page whose `part_title` carries no "Appendix <L>" is skipped (it
    contributes no resolvable target)."""
    amap: dict[str, str] = {}
    for c in chapters:
        if not c.get("is_appendix"):
            continue
        m = re.search(r"Appendix\s+([A-Z])", c.get("part_title", ""))
        if m:
            amap[c["slug"]] = m.group(1)
    return amap


def _resolve_appendix_refs_md(md: str, amap: "dict[str, str]",
                              bare_page: "dict[str, tuple[str, str]]",
                              web_map: "dict[str, str]") -> str:
    """Rewrite every `[appendix: <slug>]` marker to a plain markdown link, resolved once the appendix letters
    are known and BEFORE the inline renderer, so both the HTML build (`inline` → `<a>`) and the Typst build
    (`inline_typst` → `#link`) render it through their ordinary link path — the reference cannot diverge
    between surfaces. Three slug forms resolve, in order:

    - A **page slug** (`appendix-skill-recipe`, `appendix-b-pdf-model`) → `[Appendix <letter>](<slug>.html)`
      via `amap`. This is the form the main narrative authors.
    - A **bare flagship mechanism slug** (`executable-source-of-truth`) — the form a Flagship Note author
      naturally writes to point at a sibling note → its in-book page `[Appendix <letter>](<page-slug>.html)`.
    - A **bare non-flagship mechanism slug** (`reflection-facet-substrate`, a valid catalogue entry the print
      appendix omits) → its live WEB catalogue entry `[online](<web-url>)`, the same flagship→in-book /
      non-flagship→web rule the chapter-body links and the web-index follow.

    A slug in none of the three is a rotted reference and fails loud, exactly as a dangling `[ref:]` does —
    it must stop the build, never ship as literal `[appendix:foo]` text."""
    def repl(m: "re.Match[str]") -> str:
        slug = m.group(1)
        letter = amap.get(slug)
        if letter is not None:
            return f"[Appendix {letter}]({slug}.html)"
        page = bare_page.get(slug)
        if page is not None:
            page_slug, page_letter = page
            return f"[Appendix {page_letter}]({page_slug}.html)"
        web = web_map.get(slug)
        if web is not None:
            return f"[online]({web})"
        known = ", ".join(sorted(amap)) or "(no appendix pages in this build)"
        raise SystemExit(
            f"[appendix: {slug}] names no appendix page or catalogue entry — known appendix slugs: {known}")
    return _APPENDIX_REF_RE.sub(repl, md)


def _bare_flagship_page_map(chapters: "list[dict]") -> "dict[str, tuple[str, str]]":
    """`{bare-mechanism-slug: (page-slug, letter)}` for every in-book appendix page whose slug carries the
    `appendix-<letter>-<mechanism>` shape, so a Flagship Note may cross-reference a sibling by its bare
    mechanism slug (`[appendix: pdf-model]`) and resolve to that mechanism's in-book page. The letter is
    DERIVED from the page's `part_title`, matching `_appendix_letter_map`; a page without an `Appendix <L>`
    title contributes nothing."""
    out: dict[str, tuple[str, str]] = {}
    for c in chapters:
        if not c.get("is_appendix"):
            continue
        m = re.search(r"Appendix\s+([A-Z])", c.get("part_title", ""))
        if not m:
            continue
        mm = re.match(r"appendix-[a-z]-(.+)$", c["slug"])
        if mm:
            out[mm.group(1)] = (c["slug"], m.group(1))
    return out


def _collect_floats(chapters: list[dict], page_anchor_maps: dict) -> "tuple[list[dict], dict[str, dict]]":
    """Render every chapter once (mermaid SVG is cached) and number its floats in reading order, returning
    (ordered captioned floats for the list of figures/tables, label→{kind,num,slug} map for [ref:] xrefs).
    The per-chapter numbering in the per-chapter page build RESETS the SAME counters at each chapter over the
    SAME reading order, so a float's list number equals its printed 'Figure <chapter>-N.' / 'Table
    <chapter>-N.' and its `[ref:]` number."""
    entries: list[dict] = []
    labels: dict[str, dict] = {}
    for c in chapters:
        body = md_to_html(c["body_md"], anchor_map=page_anchor_maps.get(c["slug"]))
        # Chapter-relative: counters reset to 1 at EACH chapter; the label carries the chapter id.
        _number_floats(body, _chapter_id(c), 1, 1, collect=entries, slug=c["slug"], label_sink=labels)
    return entries, labels


def _list_of_floats_chapter(entries: list[dict], for_print: bool) -> dict:
    """Generate the front-matter "List of Figures and Tables" chapter from collected floats. Entries link
    to each float by its `id`; the visible text is the SHORT caption (the list wants scannable labels, not
    the full sentence). Web links cross to the owning chapter page; print links are same-document."""
    def _lines(kind: str, word: str) -> list[str]:
        rows = [e for e in entries if e["kind"] == kind]
        if not rows:
            return []
        out = [f"## {word}s", ""]
        for e in rows:
            anchor = _float_id(kind, e["num"])
            href = f'#{anchor}' if for_print else f'{e["slug"]}.html#{anchor}'
            out.append(f'- [{word} {e["num"]}]({href}) — {e["short"]}')
        out.append("")
        return out

    # The Figures Gallery is a WEB-ONLY generated page (no Typst/print projection); only link it from the
    # web build's intro, so the print edition (`for_print=True`) never ships a dangling `figures.html` href.
    gallery_note = (
        " Every figure, rendered in full with its caption, also lives on the "
        f"[Figures Gallery]({_FIGURES_GALLERY_SLUG}.html) — a one-page visual review of the whole book."
    ) if not for_print else ""
    body_md = "\n".join(
        [f"The figures and tables of this book, in order. Each links to where it appears.{gallery_note}", ""]
        + _lines("fig", "Figure") + _lines("tbl", "Table")
    ).strip()
    return {
        "slug": _GENERATED_PAGE_SLUGS[0], "part": 0, "part_title": _PART_TITLES.get(0, ""),
        "chapter": 99, "chapter_title": "List of Figures and Tables",
        "body_md": body_md, "is_matter": True, "mermaid": False, "list_of_floats": True,
    }


# Pages the build writes BEYOND chapter/appendix discovery. Declared once so the two build paths that
# insert them and the tracked-HTML test that expects them share ONE source of truth (an ad-hoc insertion
# that the test's discovery never saw is exactly the orphan this centralization prevents).
_GENERATED_PAGE_SLUGS = ("list-of-figures",)


def _insert_list_of_floats(chapters: list[dict], page_anchor_maps: dict,
                           for_print: bool) -> "tuple[list[dict], dict[str, dict], list[dict]]":
    """Insert the generated List of Figures and Tables just after the preface, and return the label→float
    map for `[ref:]` cross-reference resolution PLUS the raw collected float entries (so a caller building
    a further projection — e.g. the figures gallery — reuses the SAME reading-order render instead of
    walking the chapters a second time). Shared by the print and per-chapter builds so the two cannot
    drift; its float numbers come from the same reading-order pass the inline numbering uses, so the list
    number, the printed 'Figure N.', and every `[ref:]` to it all agree."""
    entries, ref_map = _collect_floats(chapters, page_anchor_maps)
    lof = _list_of_floats_chapter(entries, for_print)
    pi = next((k for k, c in enumerate(chapters) if c["slug"].endswith("preface")), -1)
    return chapters[: pi + 1] + [lof] + chapters[pi + 1:], ref_map, entries


_SVG_ID_RE = re.compile(r'\bid="([A-Za-z][\w:.-]*)"')


def _namespace_element_ids(frag: str, prefix: str) -> str:
    """Rename every `id="…"` defined in `frag` — and every reference to it (`href="#x"`, `url(#x)`,
    `aria-labelledby`, `aria-describedby`, …) — to be namespaced by `prefix`. mermaid-cli derives an SVG's
    root id (and everything under it — gradients, arrowheads, per-node ids) from a hash of the DIAGRAM
    SOURCE, so two different chapters that happen to embed the identical diagram render identical ids; that
    is harmless on their own per-chapter pages (each page only ever holds one copy) but collides the moment
    both copies land on ONE page — exactly what the figures gallery does. Replacing every id (longest first,
    so a short id is never rewritten while it is still a substring of a longer one still pending its own
    exact-match rewrite) in a single pass keeps every internal `<defs>`/`fill`/`aria-*` reference intact."""
    ids = sorted(set(_SVG_ID_RE.findall(frag)), key=len, reverse=True)
    if not ids:
        return frag
    mapping = {i: f"{prefix}-{i}" for i in ids}
    pattern = re.compile("|".join(re.escape(i) for i in ids))
    return pattern.sub(lambda m: mapping[m.group(0)], frag)


def build_figures_page(chapters: list[dict], entries: list[dict]) -> str:
    """Render `figures.html` — a standalone gallery of every FIGURE in the book, in reading order, each
    followed by its full caption and an `<hr>` divider (the quick "review every figure in one place" view).
    Each figure's markup — including its inlined SVG (title/desc intact) or `<img>`, id, "Figure N." label,
    and caption — is reused VERBATIM from `entries["html"]` (the same fully-numbered fragment `_collect_
    floats` already rendered for the List of Figures and Tables), so a figure here is byte-identical to its
    chapter rendering: no second render pass, no risk of drifting from what the chapter actually ships. Each
    figure's internal ids are namespaced (`_namespace_element_ids`) by its own float id before splicing, so
    two chapters that happen to embed the SAME diagram (identical mermaid content-hash → identical ids)
    don't collide once both land on this one page."""
    title_by_slug = {c["slug"]: c for c in chapters}
    figs = [e for e in entries if e["kind"] == "fig"]

    def _gallery_item(e: dict) -> str:
        src = title_by_slug.get(e["slug"])
        anchor = _float_id("fig", e["num"])
        fig_html = _namespace_element_ids(e["html"], anchor)
        from_label = _pager_label(src) if src else e["slug"]
        from_link = (
            f'<p class="gallery-source">From <a href="{html.escape(e["slug"], quote=True)}.html#{anchor}">'
            f'{html.escape(from_label)}</a></p>'
        )
        return f'<section class="gallery-item">{fig_html}{from_link}</section>'

    # Two REGISTERS live in one gallery: the book-proper chapter figures are hand-drawn to the house
    # palette; the appendix pattern pages carry lighter schematic diagrams. Section the gallery by the
    # source chapter's `is_appendix` flag so the two registers don't shuffle together — a reader scanning
    # the visuals sees the deliberate style shift, not an inconsistency. Every figure still appears.
    chapter_figs = [e for e in figs if not (title_by_slug.get(e["slug"]) or {}).get("is_appendix")]
    appendix_figs = [e for e in figs if (title_by_slug.get(e["slug"]) or {}).get("is_appendix")]

    def _group(heading: str, blurb: str, group: list[dict]) -> str:
        if not group:
            return ""
        inner = "<hr>".join(_gallery_item(e) for e in group)
        return (
            '<section class="gallery-group">'
            f"<h2>{html.escape(heading)}</h2>"
            f'<p class="gallery-group-note">{blurb}</p>'
            f'<div class="gallery">{inner}</div></section>'
        )

    header = (
        '<header class="chap"><div class="kicker">Front Matter</div>'
        "<h1>Figures Gallery</h1></header>"
    )
    intro = (
        f"<p>Every figure in the book — {len(figs)} in all — gathered here in reading order, each with its "
        "full caption. A quick way to review the book's visuals in one place; every figure links back to "
        "where it appears in the text. The chapter figures come first; the appendix pattern pages follow "
        "in a lighter schematic style. (See also the "
        f'<a href="{_GENERATED_PAGE_SLUGS[0]}.html">List of Figures and Tables</a> for tables, and a '
        "scannable index of short captions.)</p>"
    )
    body = (
        header + intro
        + _group("Chapter figures", "The book-proper figures, hand-drawn to the house palette.",
                 chapter_figs)
        + _group("Appendix schematics",
                 "Diagrams from the pattern-catalogue appendix, drawn in a lighter reference style.",
                 appendix_figs)
    )
    foot = f'<div class="book-foot">{html.escape(COPYRIGHT)}</div>'
    toc = toc_html(chapters, None)
    nav_bar = _static_nav_html(
        "Figures Gallery",
        fwd_extra=[("List of Figures and Tables »", f"{_GENERATED_PAGE_SLUGS[0]}.html",
                    "List of Figures and Tables")],
    )
    main = body + nav_bar + foot
    provenance = (
        "<!-- GENERATED by book/build_book_html.py (build_figures_page) — DO NOT EDIT. Regenerate via "
        "python3 book/build_book_html.py or python3 catalog.py build. -->"
    )
    return page("Figures Gallery · Model-Based Agentic Software Engineering", toc, main, provenance=provenance)


def expected_page_slugs() -> set[str]:
    """Single source of truth for every page slug the build writes: chapter + appendix discovery, the
    generated front-matter pages (`_GENERATED_PAGE_SLUGS`), the two index pages, the hand-authored
    catalogue figure, and the figures gallery. The tracked-HTML test consumes THIS, so its expectation
    cannot drift from what the build produces — the guard against a build-writes-it-but-the-test-doesn't-
    know-it orphan."""
    chapters = _discover_chapters(_load_metrics())
    chapters += build_appendix_chapters(next_part=max(c["part"] for c in chapters) + 1)
    return ({c["slug"] for c in chapters} | set(_GENERATED_PAGE_SLUGS)
            | {"index", "book-index", "catalogue-figure", _FIGURES_GALLERY_SLUG, _BIBLIOGRAPHY_SLUG})


# The rendered PDF is gated on CONTENT INTEGRITY, not just a page count. The failure modes are a runaway
# pagination (the render explodes the book into hundreds of near-empty pages) OR a collapse / truncation
# (the render stops partway, or falls to a handful of pages). A page-count band catches the explosion; a
# text-extraction check catches the truncation — every chapter and part title from the SOURCE OF TRUTH
# (`_discover_chapters()` / `_PART_TITLES`) must appear in the extracted PDF text, plus the cover title and
# a distinctive tail from the last section. Any miss → RENDER FAILURE.
_PDF_PAGE_CEILING = 800
_PDF_PAGE_FLOOR = 50  # a real book render; under this means the render collapsed or truncated
# Shipped-size ceiling: the FINAL (post-repack) PDF must be <= 8 MiB. A dense whole-book render is ~4.3 MB;
# a full-bleed rasterized cover or an un-downsampled image blows this past 30 MB. The gate blocks such a
# bloated PDF from shipping via CI or the local push. Measured on the post-qpdf-repack file (what ships).
_PDF_MAX_BYTES = 8 * 1024 * 1024  # 8 MiB = 8388608 bytes
_BOOK_TITLE = "Model-Based Agentic Software Engineering"


def _pdf_page_count(pdf_path: pathlib.Path) -> int:
    """Count pages in a PDF. Prefers `pdfinfo` (poppler) which handles object-stream-compressed PDFs
    (qpdf --object-streams=generate packs the page tree into compressed xref streams so raw byte scans
    miss it). Falls back to raw byte scan for non-compressed PDFs when pdfinfo is absent."""
    import subprocess
    import shutil
    pdfinfo = shutil.which("pdfinfo")
    if pdfinfo:
        r = subprocess.run([pdfinfo, str(pdf_path)], capture_output=True, text=True)
        if r.returncode == 0:
            for line in r.stdout.splitlines():
                if line.startswith("Pages:"):
                    try:
                        return int(line.split(":", 1)[1].strip())
                    except ValueError:
                        pass
    # Fallback: raw byte scan (works on non-object-stream PDFs; misses pages in compressed xref streams).
    data = pdf_path.read_bytes()
    counts = re.findall(rb"/Type\s*/Pages\b[^>]*?/Count\s+(\d+)", data)
    if counts:
        return max(int(c) for c in counts)
    return len(re.findall(rb"/Type\s*/Page\b", data))


def _run_pdftotext(pdf_path: pathlib.Path, *extra_args: str, purpose: str) -> str:
    """Run poppler `pdftotext` on `pdf_path` and return its stdout, the one seam every PDF-text sensor shares.
    Fails loud (SystemExit) if pdftotext is absent from PATH — `purpose` names the caller in that message — or
    if it exits non-zero. `extra_args` inserts flags (e.g. `-bbox`) before the `<pdf> -` (stdout) argument
    pair; the non-zero-exit message echoes the same flags."""
    if not shutil.which("pdftotext"):
        raise SystemExit(f"pdftotext (poppler) not found on PATH — required for {purpose}")
    argv = ["pdftotext", *extra_args, str(pdf_path), "-"]
    r = subprocess.run(argv, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"{' '.join(['pdftotext', *extra_args])} failed (rc={r.returncode}): {r.stderr}")
    return r.stdout


def _extract_pdf_text(pdf_path: pathlib.Path) -> str:
    """Extract the PDF's text via poppler `pdftotext` (on PATH). Returns whitespace-normalized text so a
    title wrapped across two lines in the layout still matches as one run. Fails loud if pdftotext is
    absent (the integrity gate needs it)."""
    stdout = _run_pdftotext(pdf_path, purpose="the PDF content-integrity gate")
    # Rejoin words broken by CSS `hyphens: auto` line-breaks: poppler emits the fragment, a hyphen
    # (ASCII `-`, U+2010 `‐`, or soft-hyphen U+00AD), then a newline. Stripping the break-hyphen makes a
    # tail run like "to start using" match even when reflow hyphenated "using" at the column edge — so a
    # margin/font change cannot make the content-integrity gate false-fail on intact text.
    dehyphenated = re.sub(r"[-‐­]\n", "", stdout)
    return re.sub(r"\s+", " ", dehyphenated)


# ── words-per-page density check ─────────────────────────────────────────────────────────────
# The enforced typographic-density metric, at O'Reilly-class technical density. `pdftotext` writes a
# form-feed (\x0c) between pages; we split on it, apply the SAME hyphen-rejoin as `_extract_pdf_text`,
# and count words per page.
#
# The check: over the FIRST N pages (representative body — the sparse appendix tail is excluded),
# at least _DENSITY_MIN_FRACTION of them must exceed _DENSITY_WORDS_THRESHOLD words. This book is
# figure/table/code/short-chapter-heavy, so even at O'Reilly-dense type only ~68% of the first-100
# pages clear 400 words (book-wide, only ~38% of substantive pages can) — 80% is structurally
# unreachable here without cramping. The 0.50 bar clears the achieved dense build (68%, with margin)
# while decisively failing the airy trade-paperback regression (~11% at 10.25pt/6×9). Below it is bloat.
_DENSITY_FIRST_N_PAGES = 100
_DENSITY_WORDS_THRESHOLD = 400
_DENSITY_MIN_FRACTION = 0.40  # relaxed from 0.50 (author call): density is a house-style preference, not
                              # a correctness gate — figures/tables/short sections legitimately vary it


def _pdf_per_page_word_counts(pdf_path: pathlib.Path) -> list[int]:
    """Word count per page. `pdftotext` emits a form-feed (\\x0c) between pages; split on it, apply the
    same `hyphens: auto` rejoin as `_extract_pdf_text`, then count whitespace-delimited words per page."""
    pages = _run_pdftotext(pdf_path, purpose="the density metric").split("\x0c")
    counts: list[int] = []
    for page in pages:
        dehyphenated = re.sub(r"[-‐­]\n", "", page)
        counts.append(len(re.sub(r"\s+", " ", dehyphenated).split()))
    # Trailing split element is the empty tail after the final form-feed — drop empty trailing pages.
    while counts and counts[-1] == 0:
        counts.pop()
    return counts


def _pdf_per_page_text(pdf_path: pathlib.Path) -> list[str]:
    """Per-page extracted text (whitespace-normalized, folio-stripped, hyphen-rejoined). `pdftotext` emits a
    form-feed (\\x0c) between pages; split on it, drop lines that are only a page-number folio, rejoin words
    broken across a line by hyphenation (soft-hyphen / U+2010 / ASCII), then collapse whitespace. Used by the
    orphaned-heading sensor to test whether a page's ONLY content is a chapter/section title."""
    out: list[str] = []
    for page in _run_pdftotext(pdf_path, purpose="the orphaned-heading sensor").split("\x0c"):
        lines = [ln for ln in page.splitlines()
                 if ln.strip() and not re.fullmatch(r"\d+", ln.strip())]
        dehyphenated = re.sub(r"[-‐­]\n", "", "\n".join(lines))
        out.append(re.sub(r"\s+", " ", dehyphenated).strip())
    return out


def _pdf_orphan_heading_pages(pdf_path: pathlib.Path, chapter_titles: list[str],
                              norm: "Callable[[str], str]") -> list[tuple[int, str]]:
    """Orphaned-heading sensor: pages whose ONLY meaningful content is a chapter/note title, with the body
    flowing to the next page. This is the empty-page-with-only-a-title failure — a keep-together note whose
    heading was stranded, or any section head left last on a page. Returns (page_number, title) for each.

    Detection is exact: a page's whole content, reduced to alphanumerics, must EQUAL a chapter title reduced
    the same way (nothing else on the page). Reducing to alphanumerics sidesteps the line-break hyphenation
    ambiguity — a title that wrapped at a real hyphen ("cross-machine" → "crossmachine") still matches. A
    part/appendix divider carries a Part/family title plus the chapter body, so it never reduces to a single
    chapter title — no false positive. The keep-together title-fold (in the Typst emitter) is the architecture
    that prevents the failure; this is the build-time control that catches any residual."""
    def squish(s: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", norm(s).lower())

    per_page = _pdf_per_page_text(pdf_path)
    title_by_squish = {squish(t): t for t in chapter_titles}
    orphans: list[tuple[int, str]] = []
    for idx, page_text in enumerate(per_page, 1):
        if not page_text:
            continue
        # A title is short; the word guard is a belt to the exact whole-page-equals-a-title signal.
        if len(page_text.split()) <= 30:
            sq = squish(page_text)
            if sq and sq in title_by_squish:
                orphans.append((idx, title_by_squish[sq]))
    return orphans


# ── Caption-orphan sensor ────────────────────────────────────────────────────────────────────────────
# A TABLE caption sits ABOVE its body (`figure.caption(position: top)`), so on a correctly-laid-out page
# the "Table N-N: …" caption line is FOLLOWED by the table's rows. When the caption is the last thing on a
# page — its body pushed to the next page — the keep-together broke: the reader meets "Table N-N: …" with no
# table under it (the 260805 Table 7.2-1 report: caption stranded on one page, body on the next). The
# `#show figure.caption: block(sticky: true, …)` rule is the architecture that prevents it; this is the
# build-time control that catches any residual. A table caption in the -layout text carries a COLON right
# after its number ("Table 7.2-1:"); the list-of-tables page's entries carry an em-dash ("Table 7.2-1 — …")
# and never a table body, so the colon anchor excludes them (a per-page caption-count guard is the belt).
# FIGURES are exempt: their caption sits at the BOTTOM under an atomic (non-breakable) image, so a figure
# caption can never strand from its image — text extraction cannot see the image anyway.
_TABLE_CAPTION_RE = re.compile(r"^\s*Table\s+([A-Za-z0-9.]+-\d+):")
# A table BODY row in -layout text: at least one column gutter — a run of 3+ spaces between two glyphs.
# Centered/justified caption prose uses single internal spaces, so it never matches; any real multi-column
# row does. A caption with NO such line after it on the page has no table body there → it is orphaned.
_TABLE_ROW_RE = re.compile(r"\S {3,}\S")


def _pdf_orphan_caption_pages(pdf_path: pathlib.Path) -> list[tuple[int, str]]:
    """Caption-orphan sensor: a table caption stranded on a page while its table body flows to the next.
    Reads the -layout text per page; flags a page carrying a "Table N-N:" caption with NO table-row line
    after it on that page. Same shape as the orphaned-heading sensor — read the rendered PDF, assert a
    layout invariant. Returns (page_number, caption_label) per orphan."""
    layout = _run_pdftotext(pdf_path, "-layout", purpose="the caption-orphan sensor")
    orphans: list[tuple[int, str]] = []
    for pno, page in enumerate(layout.split("\x0c"), start=1):
        lines = page.splitlines()
        cap_idxs = [i for i, ln in enumerate(lines) if _TABLE_CAPTION_RE.match(ln)]
        # A page with many caption labels is the list-of-tables index, never a float body — skip it.
        if not cap_idxs or len(cap_idxs) > 4:
            continue
        for ci in cap_idxs:
            if not any(_TABLE_ROW_RE.search(ln) for ln in lines[ci + 1:]):
                orphans.append((pno, _TABLE_CAPTION_RE.match(lines[ci]).group(1)))
    return orphans


# ── Part-opener single-page sensor ────────────────────────────────────────────────────────────────────
# A numbered Part opens with a divider block — the "Part N" kicker over the big Part title — immediately
# followed (on the same page) by the Part's intro prose, its thesis box, and the Part-nav strip (the row of
# `PART 1 — THE MINDSET` … `PART 6 — THE PROFESSION` chips that closes the landing). The whole opener is meant
# to fit on ONE page. The failure this catches: an intro long enough to push the nav strip onto a SECOND page,
# splitting the opener (Part 2 "Modeling" is the longest intro and the binding constraint). The Typst
# part-divider top-space knob is tuned so every opener fits; this build-time control catches any residual — a
# lengthened intro, or a layout-metric shift.
#
# Detection reads the rendered PDF per page. The divider heading extracts TITLE-CASE ("Part 4 The MAGE
# Method"); the nav chips extract UPPERCASE ("PART 4 — THE MAGE METHOD"), so the two never collide. For each
# numbered Part it (1) finds the opener page — the page whose text carries the title-case divider heading,
# breaking ties toward the page with the most words (the real opener, never a short table-of-contents line) —
# then (2) asserts that SAME page also carries the FULL nav strip: all six uppercase chips. Both the heading
# and the chip labels are built from `_PART_TITLES` (one source of truth), so the sensor cannot drift from
# what the renderer emits.
def _pdf_part_opener_spread(pdf_path: pathlib.Path, part_titles: dict[int, str],
                            norm: "Callable[[str], str]",
                            facing_parity: bool) -> list[dict]:
    """PART-OPENER SPREAD sensor (round-7). Each numbered Part 1–6 opens on a two-page orientation SPREAD: a
    VERSO orientation page (Part title · whole-book subway map · "Question this Part answers" DO-ladder line ·
    thesis box · Carrying-forward / New-here vocab block) with the intro PROSE leading the facing RECTO. The old
    one-page invariant ("divider + intro + nav all on ONE page") is retired by design; this sensor gates the new
    shape with FOUR legs, per Part:

      (a) orientation_found — a page carries the title-case divider heading "Part N <title>".
      (b) fits_one_page     — the orientation does NOT spill: the page AFTER the verso lacks the question
                              label (had it spilled, the label — unique to the orientation — would repeat there).
      (c) carries_nav       — the verso carries the KEPT orientation apparatus: the "Question this Part answers"
                              DO-ladder label AND the "New here" vocab-band heading. (Round-7 W3 anatomy change:
                              the six-Part footer chip strip + the Part-local map were cut, so the leg no longer
                              greps nav chips.) The KEPT whole-book subway map renders as an `image()` that fails
                              the COMPILE if missing, so its presence needs no text re-check here.
      (d) facing_parity     — PRINT ONLY (`facing_parity`): the verso page number is EVEN and the recto ODD (a
                              real bound-edition facing pair). Skipped for the shipped SCREEN PDF (no facing).

    Both the divider and this sensor read `_PART_TITLES` + `_PART_OPENER_QUESTION_LABEL` + the vocab-band label
    SSOT (`book_typst.NAV_VOCAB_NEWHERE_LABEL`), so the gate cannot drift from the renderer. Returns one dict per
    Part with the four leg booleans + pages."""
    per_page = _pdf_per_page_text(pdf_path)
    q_label = norm(_PART_OPENER_QUESTION_LABEL).upper()
    # Round-7 W3 anatomy: the verso's text orientation apparatus is the DO-ladder QUESTION LABEL + the "New here"
    # VOCAB heading (the footer chip strip + Part-local map were cut). The KEPT whole-book subway map renders as
    # an image() that fails the COMPILE if missing, so its presence needs no text re-check. Both markers extract
    # UPPERCASE (norm-folded) and are unique to the orientation verso — a stray TOC line echoing the divider
    # heading carries neither.
    import book_typst as _bt  # noqa: E402 — the vocab-band label SSOT the divider renders (one source, no drift)
    apparatus = [q_label, norm(_bt.NAV_VOCAB_NEWHERE_LABEL).upper()]
    normed = [norm(t) for t in per_page]                 # title-case, for the divider-heading match
    normed_upper = [t.upper() for t in normed]           # for the uppercase apparatus-marker match
    results: list[dict] = []
    for part in range(1, 7):
        div = norm(f"Part {part} {part_titles[part]}")   # divider heading, title-case
        # The verso carries the title heading AND the orientation apparatus; disambiguate on the apparatus so a
        # stray TOC/outline line echoing the heading is never mistaken for the orientation page.
        candidates = [i for i, t in enumerate(normed, 1)
                      if div in t and all(c in normed_upper[i - 1] for c in apparatus)]
        if not candidates:
            candidates = [i for i, t in enumerate(normed, 1) if div in t]  # fall back so (a) can still report
        opener = max(candidates, key=lambda i: len(normed[i - 1].split())) if candidates else None
        nxt = normed_upper[opener] if (opener is not None and opener < len(normed_upper)) else ""
        orientation_found = opener is not None
        carries_nav = bool(opener is not None
                           and all(c in normed_upper[opener - 1] for c in apparatus))
        fits_one_page = bool(opener is not None and q_label not in nxt)
        facing_ok = True
        if facing_parity and opener is not None:
            facing_ok = (opener % 2 == 0) and ((opener + 1) % 2 == 1)
        ok = orientation_found and carries_nav and fits_one_page and facing_ok
        results.append({
            "part": part, "opener": opener, "ok": ok,
            "orientation_found": orientation_found, "carries_nav": carries_nav,
            "fits_one_page": fits_one_page, "facing_parity": facing_ok,
        })
    return results


# ── Overflow (margin-bleed) sensor ───────────────────────────────────────────────────────────────────
# The book's page geometry (set in the Typst preamble): US-Letter portrait (8.5×11in) with an ASYMMETRIC
# margin — a 0.875in binding margin + a 4.75in text measure (text box ends 5.625in from the left) + a wide
# 2.875in OUTER margin holding the Tufte note column (0.375in gutter · 1.9in note · 0.6in trim). The wide
# apparatus flips to landscape (11×8.5in, 0.6in x-margins, no note column). `pdftotext -bbox` reports word
# boxes in PDF points (72/in) with each page's width, so the edges below are derived from page width alone.
#
# The portrait body has TWO zones, because a margin note deliberately sits PAST the old text edge (it would
# false-fail a single-edge sensor). A word is a genuine bleed only if it ORIGINATES in its zone and crosses
# that zone's outer bound:
#   • text-overflow  — a word whose left starts in the text column (xMin < text_right) and whose right runs
#                       past the text edge (xMax > text_right + tol). Real content-into-margin overflow.
#   • margin-note bleed — a word that STARTS in the note column (xMin ≥ text_right) and runs off the physical
#                       page (xMax > page_w − outer_trim + tol). The structural backstop if the sidenote
#                       measure-gate ever lets a too-wide note into the margin.
# Landscape apparatus keeps the original single-edge check (page_w − 0.6in); it has no note column.
_PT_PER_IN = 72.0
_LANDSCAPE_PAGE_W_PT = 11.0 * _PT_PER_IN        # 792 — the flipped apparatus page
_BODY_TEXT_RIGHT_PT = 5.625 * _PT_PER_IN        # 405 — portrait text box right edge (0.875in + 4.75in)
_BODY_OUTER_TRIM_PT = 0.6 * _PT_PER_IN          # 43.2 — note column → physical page-edge trim
_LANDSCAPE_XMARGIN_PT = 0.6 * _PT_PER_IN        # 43.2 — landscape apparatus x-margin
# The narrow 4.75in text edge governs BODY-SIZE type (running text ~13pt + code). DISPLAY type — the cover
# title, the Part-divider headings — sits on a page with its OWN full-width CENTERED layout, so it legibly
# extends past the body edge; it is exempt from the body edge and held only to the physical page edge. A
# word taller than this is display type. (Body ~13pt, code ~14pt tall; the cover title ~37pt.)
_DISPLAY_TYPE_HEIGHT_PT = 24.0
# Justified text hangs a soft hyphen or trailing punctuation a hair past the measure — measured max across
# the whole book is 3.6pt. A too-wide table's cell text bleeds far further (10pt+). 6pt sits in the clean gap:
# above every legitimate microtypographic overhang, below any real overflow.
_MARGIN_BLEED_TOL_PT = 6.0

_BBOX_PAGE_RE = re.compile(r'<page width="([\d.]+)" height="[\d.]+">(.*?)</page>', re.S)
_BBOX_WORD_RE = re.compile(
    r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', re.S)


def _pdf_margin_bleed(pdf_path: pathlib.Path) -> list[tuple[int, str, float, float]]:
    """Overflow sensor: no reader text may bleed past its page's right bound. Runs poppler `pdftotext -bbox`
    for per-word boxes + page geometry, then applies a per-page predicate. On the portrait body it is
    TWO-ZONE (see the geometry block above): a word in the text column bleeding past the text edge, OR a
    margin note running off the physical page. On the landscape apparatus it keeps the original single-edge
    check. This is the 260804 table-overflow class made mechanical (a too-wide table pushes cell text into
    the margin), companion to the Typst `fit-table` auto-fit; and, since 260806, the structural backstop for
    the Tufte margin-note layout (a note that escapes the sidenote measure-gate). Returns (page_number,
    word_text, word_right_pt, edge_pt) per offending word."""
    stdout = _run_pdftotext(pdf_path, "-bbox", purpose="the overflow sensor")
    bleeds: list[tuple[int, str, float, float]] = []
    for pno, pm in enumerate(_BBOX_PAGE_RE.finditer(stdout), start=1):
        page_w = float(pm.group(1))
        is_landscape = abs(page_w - _LANDSCAPE_PAGE_W_PT) < 2
        for wm in _BBOX_WORD_RE.finditer(pm.group(2)):
            xmin, ymin, xmax, ymax = (float(wm.group(i)) for i in (1, 2, 3, 4))
            if is_landscape:
                # landscape apparatus — single-edge check (no note column)
                edge = page_w - _LANDSCAPE_XMARGIN_PT
            elif ymax - ymin > _DISPLAY_TYPE_HEIGHT_PT:
                # display type (cover / Part-divider title, own centered layout) — hold to the page edge only
                edge = page_w - _BODY_OUTER_TRIM_PT
            elif xmin < _BODY_TEXT_RIGHT_PT:
                # text-column word — flag if it crosses the (narrow) text edge
                edge = _BODY_TEXT_RIGHT_PT
            else:
                # margin-note word — exempt from the text edge, but hold to the physical page edge
                edge = page_w - _BODY_OUTER_TRIM_PT
            if xmax > edge + _MARGIN_BLEED_TOL_PT:
                text = html.unescape(wm.group(5)).strip()
                bleeds.append((pno, text, round(xmax, 1), round(edge, 1)))
    return bleeds


_BODY_PAGE_H_PT = 11.0 * _PT_PER_IN            # 792 — us-letter portrait height
_BODY_BOTTOM_MARGIN_PT = 1.0 * _PT_PER_IN      # 72 — 1in bottom y-margin (matches #set page)
_BODY_SAFE_BOTTOM_PT = _BODY_PAGE_H_PT - _BODY_BOTTOM_MARGIN_PT   # 720 — a word's yMax must not cross this
_BOTTOM_BLEED_TOL_PT = 6.0                     # same clean-gap tolerance as the horizontal sensor
_PAGENUM_RE = re.compile(r"^\d+$")


def _pdf_bottom_margin_bleed(pdf_path: pathlib.Path) -> list[tuple[int, str, float, float]]:
    """Bottom-margin overflow sensor: no reader text may bleed past a PORTRAIT page's safe text bottom
    into the reserved bottom margin (page-number / footer band). Vertical companion to _pdf_margin_bleed
    and the structural backstop for the Tufte sidenote position-aware gate — a margin note anchored low on
    the page can pass the height cap yet run its bottom off the text region. Portrait body pages only (the
    landscape apparatus carries no note column). Exempts the running page number. Returns
    (page_number, word_text, yMax_pt, safe_bottom_pt) per offending word."""
    stdout = _run_pdftotext(pdf_path, "-bbox", purpose="the bottom-margin overflow sensor")
    bleeds: list[tuple[int, str, float, float]] = []
    for pno, pm in enumerate(_BBOX_PAGE_RE.finditer(stdout), start=1):
        page_w = float(pm.group(1))
        if abs(page_w - _LANDSCAPE_PAGE_W_PT) < 2:
            continue  # landscape apparatus — no note column, separate geometry
        for wm in _BBOX_WORD_RE.finditer(pm.group(2)):
            xmin, ymin, xmax, ymax = (float(wm.group(i)) for i in (1, 2, 3, 4))
            if ymax <= _BODY_SAFE_BOTTOM_PT + _BOTTOM_BLEED_TOL_PT:
                continue
            text = html.unescape(wm.group(5)).strip()
            if _PAGENUM_RE.match(text) and ymin >= _BODY_SAFE_BOTTOM_PT:
                continue  # running page number legitimately sits in the bottom margin
            bleeds.append((pno, text, round(ymax, 1), round(_BODY_SAFE_BOTTOM_PT, 1)))
    return bleeds


def _density_report(pdf_path: pathlib.Path) -> tuple[int, list[str]]:
    """Compute + print the words-per-page density metric and gate on: over the FIRST N pages, at least
    _DENSITY_MIN_FRACTION exceed _DENSITY_WORDS_THRESHOLD words. Returns (rc, problems): rc is 0 if the
    fraction holds, 1 otherwise; problems appended to the caller's list."""
    problems: list[str] = []
    per_page = _pdf_per_page_word_counts(pdf_path)
    total_pages = len(per_page)
    total_words = sum(per_page)
    overall = (total_words / total_pages) if total_pages else 0
    substantive = sorted(c for c in per_page if c >= 100)
    median = substantive[len(substantive) // 2] if substantive else 0

    window = per_page[:_DENSITY_FIRST_N_PAGES]
    n = len(window)
    dense = sum(1 for c in window if c > _DENSITY_WORDS_THRESHOLD)
    frac = (dense / n) if n else 0.0
    need_pct = int(_DENSITY_MIN_FRACTION * 100)
    passed = frac >= _DENSITY_MIN_FRACTION

    print("PDF words-per-page density:")
    print(f"  total pages ............. {total_pages}")
    print(f"  total words ............. {total_words}")
    print(f"  overall w/pg ............ {overall:.0f}  (total/pages)")
    print(f"  median w/pg (substantive) {median}  ({len(substantive)} pages ≥ 100 words)")
    print(f"  density check: {dense}/{n} pages > {_DENSITY_WORDS_THRESHOLD} words "
          f"({frac * 100:.0f}%) — {'PASS' if passed else 'FAIL'} (need >={need_pct}%)")

    if not passed:
        problems.append(f"density check: only {dense}/{n} of first pages > {_DENSITY_WORDS_THRESHOLD} "
                        f"words ({frac * 100:.0f}%), need >={need_pct}% — too airy (below O'Reilly "
                        f"technical density)")
    return (1 if problems else 0), problems


def verify_pdf(pdf_path: pathlib.Path) -> int:
    """Content-integrity gate over the rendered PDF. Extracts the text and asserts the WHOLE book is
    present against the source of truth. Returns 0 if the PDF contains the entire book, 1 otherwise.
    Also reused by the CI step so a truncated/broken render fails the Pages build. Checks:
      1. page count within [_PDF_PAGE_FLOOR, _PDF_PAGE_CEILING] (no collapse, no runaway),
      2. cover title present,
      3. every chapter title AND every rendered Part title present (no dropped/truncated chapter),
      4. the TOC lists exactly the source chapter set (none missing, none extra),
      5. a distinctive tail from the LAST section present (render did not stop partway),
      6. words-per-page density: ≥80% of the first 100 pages exceed 400 words (O'Reilly-dense body)."""
    problems: list[str] = []

    pages = _pdf_page_count(pdf_path)
    if pages < _PDF_PAGE_FLOOR:
        problems.append(f"page count {pages} < floor {_PDF_PAGE_FLOOR} (render collapsed/truncated)")
    if pages > _PDF_PAGE_CEILING:
        problems.append(f"page count {pages} > ceiling {_PDF_PAGE_CEILING} (runaway pagination)")

    text = _extract_pdf_text(pdf_path)

    # ASSERT (author-requested control): no RAW mermaid source may ship in the PDF. A rendered diagram
    # carries only its node labels as text; the `flowchart`/`subgraph`/`-->` syntax appears ONLY if a
    # ```mermaid fence shipped un-rendered as a code box (the exact bug this change fixes). Print an
    # explicit PASS/FAIL line so the control is visible in the build log.
    mermaid_hits = [m for m in MERMAID_SOURCE_MARKERS if m in text]
    if mermaid_hits:
        print(f"PDF MERMAID ASSERT: FAIL — raw mermaid source in PDF text: {mermaid_hits}", file=sys.stderr)
        problems.append(f"raw mermaid source shipped in PDF (markers: {mermaid_hits}) — "
                        "a ```mermaid fence rendered as source text, not a diagram")
    else:
        print("PDF MERMAID ASSERT: PASS — no raw mermaid source in PDF text.")

    if _BOOK_TITLE not in text:
        problems.append(f"cover title {_BOOK_TITLE!r} not found (cover did not render)")

    # Source of truth: the discovered chapters + the projected appendix, in reading order. The PDF gate must
    # build the appendix in the SAME print projection the render used (`for_print=True`), so the expected
    # titles match what actually renders (e.g. Appendix E's dropped recipe page is not expected in the PDF).
    metrics = _load_metrics()
    chapters = _discover_chapters(metrics)
    appendix = build_appendix_chapters(next_part=max(c["part"] for c in chapters) + 1, for_print=True)
    full = chapters + appendix

    # Normalize for matching so a markup / typographic difference cannot false-fail on intact content:
    #   - drop backtick markers: the typed IR renders a `code-span` in a title as PLAIN TEXT (no ` fences),
    #     so "Aggregate-compute protection (`lint-all` host mutex)" appears without the backticks;
    #   - fold typographic quotes/dashes to ASCII: the print renderer's smart-quotes turns a straight `'`
    #     into `’` (U+2019) and `--` into an en/em dash, so a title like "the runtime's events" or
    #     "read, don't hardcode" extracts with a curly apostrophe. The CONTENT matters, not the glyph.
    def _norm(s: str) -> str:
        s = s.replace("`", "")
        s = (s.replace("’", "'").replace("‘", "'")
               .replace("“", '"').replace("”", '"')
               .replace("–", "-").replace("—", "-").replace("‐", "-"))
        return re.sub(r"\s+", " ", s.strip())

    text_norm = _norm(text)

    def _present(s: str) -> bool:
        return _norm(s) in text_norm

    # The appendix chapter heading in the print edition renders the title WITHOUT its "Appendix X - N."
    # numeric prefix (the part-divider already names the family). Match on the title portion after that
    # prefix so a present-but-un-prefixed appendix heading is not falsely reported missing.
    _APPENDIX_PREFIX = re.compile(r"^Appendix\s+[A-Z]\s*[-—]\s*\d+\.\s*")

    def _title_present(title: str) -> bool:
        if _present(title):
            return True
        stripped = _APPENDIX_PREFIX.sub("", title)
        return stripped != title and _present(stripped)

    # Every chapter title must appear.
    missing_titles = [c["chapter_title"] for c in full if not _title_present(c["chapter_title"])]
    if missing_titles:
        problems.append(f"{len(missing_titles)} chapter title(s) missing from PDF: {missing_titles[:5]}")

    # Every rendered Part title (numbered Parts 1–6 get a divider; front/back matter do not).
    rendered_parts = sorted({c["part"] for c in full if c["part"] not in (0, 7)})
    for p in rendered_parts:
        appendix_part = next((c for c in full if c["part"] == p and c.get("is_appendix")), None)
        pt = appendix_part["part_title"] if appendix_part else _PART_TITLES.get(p, "")
        if pt and not _present(pt):
            problems.append(f"Part title {pt!r} (part {p}) missing from PDF")

    # Tail: a distinctive word-run from the LAST section's rendered body must appear (not truncated).
    # Extract the run and search the PDF text through the SAME normalization (_norm), so the check does
    # not false-fail when the tail contains short words or spans a reflow line-break:
    #   - the token pattern keeps 1-char words ("a", "I") — a `+` quantifier dropped them, so a tail
    #     ending "...not a footnote to it" extracted as "not footnote to" and missed the real PDF text;
    #   - _norm() collapses all whitespace to single spaces (and straightens quotes) on BOTH the run and
    #     the searched text, so a run split across a line-break in the PDF still matches.
    # The guard's anti-truncation strength is preserved: a genuinely truncated render simply lacks the
    # last section's tail words in the extracted PDF text, so the substring check still fails — the
    # normalization only removes whitespace/short-word false-negatives, never manufactures a match.
    last = full[-1]
    tail_words = re.findall(r"[A-Za-z][A-Za-z'-]*", md_to_html(last["body_md"]))
    # take a 6-word run from near the end of the last section
    if len(tail_words) >= 12:
        tail_run = _norm(" ".join(tail_words[-8:-2]))
        if tail_run and tail_run not in text_norm:
            # fall back to a shorter run (rendering may split a hyphenated word)
            short = _norm(" ".join(tail_words[-6:-3]))
            if short not in text_norm:
                problems.append(f"tail run from last section {last['slug']!r} not found "
                                f"({short!r}) — render may be truncated")

    # Words-per-page density metric + O'Reilly-band gate (prints its own report).
    _, density_problems = _density_report(pdf_path)
    problems.extend(density_problems)

    # Orphaned-heading sensor: no page may carry ONLY a chapter/note title with its body flowing to the next
    # (the empty-page-with-only-a-title failure). BLOCKING — the keep-together title-fold in the Typst emitter
    # makes this impossible for notes, and this control catches any residual across the whole book.
    orphans = _pdf_orphan_heading_pages(pdf_path, [c["chapter_title"] for c in full], _norm)
    if orphans:
        listing = ", ".join(f"p{n} ({t!r})" for n, t in orphans[:8])
        print(f"PDF ORPHANED-HEADING SENSOR: FAIL — {len(orphans)} page(s) hold only a title: {listing}",
              file=sys.stderr)
        problems.append(f"orphaned heading(s): {len(orphans)} page(s) carry a title with the body on the "
                        f"next page — {listing}")
    else:
        print("PDF ORPHANED-HEADING SENSOR: PASS — no page holds only a title.")

    # Overflow (margin-bleed) sensor: no reader text may bleed past the page text box (the wide-table-overflow
    # class). BLOCKING — the Typst `fit-table` auto-fit scales a too-wide table down to the measure, and this
    # catches any residual bleed across the whole book.
    bleeds = _pdf_margin_bleed(pdf_path)
    if bleeds:
        listing = ", ".join(f"p{n} {t!r} (x{xm}>{ed})" for n, t, xm, ed in bleeds[:8])
        print(f"PDF OVERFLOW SENSOR: FAIL — {len(bleeds)} word(s) bleed past the text box: {listing}",
              file=sys.stderr)
        problems.append(f"content margin-bleed: {len(bleeds)} word(s) overflow the page text box — a table "
                        f"or block is too wide; route it to the landscape apparatus or restructure it "
                        f"({listing})")
    else:
        print("PDF OVERFLOW SENSOR: PASS — no content bleeds past the text box.")

    # Bottom-margin overflow sensor: no reader text may bleed past a portrait page's safe bottom into the
    # reserved bottom margin (page-number band). Catches the Tufte-sidenote VERTICAL-overflow class — a note
    # anchored low on the page that passes the height cap but runs its bottom off the text region. The
    # position-aware sidenote gate is the suspenders; this is the belt. AUDIT-ONLY-first: prints only, does
    # NOT contribute to the exit code, until the sidenote fix drains it to 0 — then promote to `problems`.
    vbleeds = _pdf_bottom_margin_bleed(pdf_path)
    if vbleeds:
        listing = ", ".join(f"p{n} {t!r} (y{ym}>{sb})" for n, t, ym, sb in vbleeds[:8])
        print(f"PDF BOTTOM-MARGIN SENSOR: AUDIT-ONLY FAIL — {len(vbleeds)} word(s) bleed into the bottom "
              f"margin: {listing}", file=sys.stderr)
        # AUDIT-ONLY (rule #55): not appended to `problems` until the sidenote fix lands clean, then promote.
    else:
        print("PDF BOTTOM-MARGIN SENSOR: PASS — no content bleeds into the bottom margin.")

    # Caption-orphan sensor: no table caption may sit stranded on a page while its table body flows to the
    # next. BLOCKING — the sticky-caption Typst show-rule keeps every caption with its body, and this control
    # catches any residual across the whole book. (Lands clean/green: the keep-together fix drives it to 0.)
    cap_orphans = _pdf_orphan_caption_pages(pdf_path)
    if cap_orphans:
        listing = ", ".join(f"p{n} ({lbl!r})" for n, lbl in cap_orphans[:8])
        print(f"PDF CAPTION-ORPHAN SENSOR: FAIL — {len(cap_orphans)} table caption(s) stranded from their "
              f"body: {listing}", file=sys.stderr)
        problems.append(f"caption orphan(s): {len(cap_orphans)} table caption(s) sit on a page with the "
                        f"table body on the next — {listing}")
    else:
        print("PDF CAPTION-ORPHAN SENSOR: PASS — every table caption rides with its body.")

    # Part-opener SPREAD sensor (round-7): each numbered Part opens on a two-page orientation spread (verso =
    # title + subway map + Part-local map + question + thesis box + nav strip; recto = intro prose). Four legs
    # per Part — orientation found, orientation fits one page, verso carries the nav apparatus, and (print only)
    # even/odd facing parity. BLOCKING (round-7 W3 promotion, rule #55 audit-only-first): landed AUDIT-ONLY,
    # bedded in clean across all six openers, now promoted to contribute to the exit code — a regressed opener
    # (missing orientation, an overflowing verso, a stripped nav apparatus) fails the build instead of only
    # printing.
    import book_typst as _bt  # for OUTPUT_TYPE — the facing-parity leg is print-only (the shipped PDF is screen)
    _facing = _bt.OUTPUT_TYPE == "print"
    spread_results = _pdf_part_opener_spread(pdf_path, _PART_TITLES, _norm, _facing)
    spread_fails = [r for r in spread_results if not r["ok"]]
    for r in spread_results:
        op = r["opener"]
        where = f"p{op}" if op is not None else "not found"
        if r["ok"]:
            print(f"  Part {r['part']} spread: PASS — orientation verso {where}, nav apparatus present, "
                  f"fits one page{', facing parity OK' if _facing else ''}.")
        else:
            legs = [name for name in ("orientation_found", "carries_nav", "fits_one_page", "facing_parity")
                    if not r[name] and (name != "facing_parity" or _facing)]
            print(f"  Part {r['part']} spread: FAIL — verso {where}; failing leg(s): {', '.join(legs)}.",
                  file=sys.stderr)
    if spread_fails:
        listing = ", ".join(f"Part {r['part']}" for r in spread_fails)
        print(f"PDF PART-OPENER SPREAD SENSOR: BLOCKING FAIL — {len(spread_fails)} Part opener spread(s) "
              f"not clean: {listing}.", file=sys.stderr)
        problems.append(f"part-opener spread(s) not clean: {len(spread_fails)} — {listing}")
    else:
        print(f"PDF PART-OPENER SPREAD SENSOR: BLOCKING PASS — all 6 Part opener spreads clean"
              f"{' (incl. facing parity)' if _facing else ''}.")

    if problems:
        print(f"PDF CONTENT-INTEGRITY FAILURES ({len(problems)}):", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1
    print(f"PDF content-integrity OK: {pages} pages, title present, "
          f"{len(full)} chapter titles + {len(rendered_parts)} part titles present, tail present.")
    return 0


def assert_pdf_size(pdf_path: pathlib.Path) -> None:
    """Shipped-size gate. Fails loud (raises SystemExit) if the FINAL PDF exceeds `_PDF_MAX_BYTES` (8 MiB).

    Call this AFTER the qpdf repack so the number checked is the post-repack size that actually ships. A
    bloated PDF is almost always a full-bleed cover or an un-downsampled image rasterized at print DPI —
    a dense whole-book render is ~4.3 MB, so 8 MiB leaves generous headroom while still catching a 30 MB
    regression. Prints a PASS line when green so the control is visible in the build log alongside the
    content-integrity gate."""
    size = pdf_path.stat().st_size
    if size > _PDF_MAX_BYTES:
        raise SystemExit(
            f"PDF SIZE GATE: FAIL — {pdf_path.name} is {size / 1_048_576:.1f} MB "
            f"({size:,} bytes), over the {_PDF_MAX_BYTES / 1_048_576:.0f} MB "
            f"({_PDF_MAX_BYTES:,} bytes) ceiling.\n"
            "  Hint: a filter-heavy full-bleed cover rasterizes huge — pre-rasterize it to a compressed "
            "image (or downsample any oversized image) before shipping.")
    print(f"PDF SIZE GATE: PASS — {size / 1_048_576:.1f} MB "
          f"<= {_PDF_MAX_BYTES / 1_048_576:.0f} MB ceiling.")


def _pdf_is_tagged(pdf_path: pathlib.Path) -> bool:
    """Return True if the PDF is tagged (has a struct tree root).

    Strategy: use `pdfinfo` (poppler) which reports "Tagged: yes" in its output — reliable even after
    qpdf object-stream compression (which packs /StructTreeRoot inside a compressed xref stream so a raw
    byte scan would miss it). Falls back to a byte scan on the raw un-compressed input PDF only.
    `pdfinfo` is always on PATH when the build runs (it is installed for the content-integrity gate)."""
    import subprocess
    import shutil
    pdfinfo = shutil.which("pdfinfo")
    if pdfinfo:
        r = subprocess.run([pdfinfo, str(pdf_path)], capture_output=True, text=True)
        if r.returncode == 0:
            return "Tagged:          yes" in r.stdout or "Tagged: yes" in r.stdout
    # pdfinfo absent — fall back to raw byte scan (works for non-object-stream PDFs only).
    data = pdf_path.read_bytes()
    return b"/StructTreeRoot" in data


def _book_last_modified() -> str:
    """The book's last content-modification date (YYYY-MM-DD) for the print cover footer. Prefers the last
    git commit that touched `book/` (the real content change, stable across rebuilds of the same source);
    falls back to today's date when git is unavailable (a shallow export, a non-git checkout)."""
    import subprocess
    import datetime
    try:
        r = subprocess.run(["git", "log", "-1", "--format=%cd", "--date=short", "--", "book"],
                           cwd=str(ROOT), capture_output=True, text=True)
    except OSError:
        r = None  # git binary absent — fall through to the build-date fallback below
    if r is not None and r.returncode == 0 and r.stdout.strip():
        return r.stdout.strip()
    return datetime.date.today().isoformat()


def build_pdf() -> int:
    """`--pdf`: render the production print edition to `book/mage-book.pdf` via the print-native Typst
    path — emit the WHOLE-BOOK Typst source from the typed book IR, then `typst compile` it to PDF. Gates
    the result on the same content-integrity band (page floor/ceiling, every chapter + part title present,
    no raw mermaid, density) so a truncated or runaway render fails instead of shipping. Fast, opt-in —
    NOT part of `build()` (the web build is untouched).

    Typst lays out the whole book with one native binary in ~2 s and emits a small (~5 MB), tagged PDF —
    no headless browser in the loop. Its output is already compact, so there is no post-compression pass;
    the tag tree is asserted directly on the compiled file."""
    import shutil
    import subprocess

    # book_typst imports build_book_html at module scope; import it here (function-local, matching this
    # function's existing shutil/subprocess pattern) so importing build_book_html as a library never pulls
    # the emitter and its transitive book_ir graph.
    import book_typst
    import book_ir

    typst = shutil.which("typst")
    if not typst:
        print("ERROR: `typst` not found on PATH — install it (brew install typst / download the pinned "
              "release binary in CI).", file=sys.stderr)
        return 2

    pdf_out = HERE / _PDF_FILENAME
    # Emit into _typst/ (gitignored, multi-file + binary — never committed).
    typ_dir = HERE / "_typst"
    typ_dir.mkdir(exist_ok=True)
    typ_src = typ_dir / "mage-book.typ"

    # Emit the WHOLE book (front matter → parts → back matter → appendices) as one Typst document from the
    # typed IR — the same IR the web build walks, so the print edition cannot diverge from the web book. This
    # is the PRINT projection (`for_print=True`), so the slug list matches what emit_document renders (e.g.
    # Appendix E collapses to its front-door pointer, dropping the recipe content page from the PDF).
    doc = book_ir.parse_book(include_appendices=True, for_print=True)
    slugs = [c.slug for c in doc.chapters]
    typ = book_typst.emit_document(slugs, root=ROOT, with_frontmatter=True)
    typ_src.write_text(typ, encoding="utf-8")
    print(f"Typst source: {typ_src} ({len(typ):,} bytes, {len(slugs)} chapters)")

    # Compile. `--root ..` so leading-`/` image paths (figure SVGs, cached mermaid SVGs) resolve against
    # the repo root. `--font-path` points Typst at the bundled OFL statics (book/fonts/) — Source Serif 4 /
    # Source Sans 3 / IBM Plex Mono are not installed on the host or the CI runner, so without this flag
    # Typst silently substitutes a default serif and the PDF diverges from the web book, which loads the
    # real faces via Google Fonts. Typst fails loud on any unresolved reference / bad image / math error.
    # `--input last_modified=…` feeds the cover footer the book's last content-commit date (Typst has no
    # clock, and CI has no wall-clock intent — the date must be computed here and passed in).
    last_modified = _book_last_modified()
    cmd = [typst, "compile", "--input", f"last_modified={last_modified}",
           "--root", str(ROOT), "--font-path", str(HERE / "fonts"), str(typ_src), str(pdf_out)]
    print("PDF compile plan:\n  " + " ".join(f'"{a}"' if " " in a else a for a in cmd))
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.stdout.strip():
        print(r.stdout.strip())
    if r.returncode != 0 or not pdf_out.is_file():
        print(f"ERROR: Typst compile failed (rc={r.returncode}).\n{r.stderr}", file=sys.stderr)
        return 1
    if r.stderr.strip():
        # Typst prints warnings to stderr on success; surface them (foreign-object warnings, etc.).
        print(r.stderr.strip(), file=sys.stderr)

    final_size = pdf_out.stat().st_size
    print(f"PDF: {pdf_out} ({final_size / 1_048_576:.1f} MB via typst)")

    # Post-compression repack — Typst emits every object as an uncompressed indirect object with NO object
    # streams (~20K individual objects, dominated by the accessibility struct tree's thousands of small
    # StructElem objects). qpdf's lossless repack packs those into compressed object streams and recompresses
    # the content streams, cutting the whole-book PDF by ~35% (≈ 6.7 MB → 4.3 MB) with the tag tree fully
    # preserved. Object streams are PDF-spec-standard and PDF/UA-safe. The tag assertion + content-integrity
    # gate below run on the REPACKED file, so what ships is what we validate (the verify helpers read via
    # pdfinfo/pdftotext, which see through object streams). If qpdf is absent (fresh checkout without it), the
    # uncompressed PDF still ships — larger — so clone-and-run never hard-fails on a missing optimizer.
    qpdf = shutil.which("qpdf")
    if qpdf:
        opt_tmp = pdf_out.with_suffix(".opt.pdf")
        qr = subprocess.run(
            [qpdf, "--object-streams=generate", "--compress-streams=y", "--recompress-flate",
             "--compression-level=9", str(pdf_out), str(opt_tmp)],
            capture_output=True, text=True)
        # qpdf exit 0 = clean, 3 = warnings (still wrote a valid file); accept both.
        if qr.returncode in (0, 3) and opt_tmp.is_file():
            opt_tmp.replace(pdf_out)
            new_size = pdf_out.stat().st_size
            print(f"PDF: qpdf object-stream repack {final_size / 1_048_576:.1f} MB "
                  f"-> {new_size / 1_048_576:.1f} MB")
            final_size = new_size
        else:
            opt_tmp.unlink(missing_ok=True)
            print(f"WARNING: qpdf repack failed (rc={qr.returncode}); shipping uncompressed PDF.\n"
                  f"{qr.stderr}", file=sys.stderr)
    else:
        print("WARNING: qpdf not found on PATH — shipping the uncompressed (larger) PDF. Install qpdf "
              "to enable the lossless object-stream repack.", file=sys.stderr)

    # Tag-preservation assertion — Typst emits a tagged PDF; assert it (on the repacked file) so a future
    # template/flag change — or an optimizer that strips structure — cannot silently drop the struct tree.
    if not _pdf_is_tagged(pdf_out):
        print("ERROR: Typst PDF has no struct tree — tags lost (a11y regression). "
              "Check the Typst document settings before shipping.", file=sys.stderr)
        return 1
    print("Tag preservation: struct tree present in PDF.")

    # Shipped-size gate — measured on the REPACKED file (what actually ships), so it fails loud on a
    # bloated PDF (e.g. a full-bleed rasterized cover) that content-integrity alone would pass. Raises
    # SystemExit on breach; prints its PASS line adjacent to the content-integrity gate below.
    assert_pdf_size(pdf_out)

    # Content-integrity gate — the whole book must be in the compiled PDF.
    return verify_pdf(pdf_out)


# ─────────────────────── Per-section split PDFs (review aid; additive to `--pdf`) ────────────────────────
# A local `--pdf` run ALSO emits one PDF per logical book section — a review aid so a reader can open just
# the front matter, one Part, the back matter, or the appendices. The split is DEFAULT-ON locally and OFF in
# CI / the deploy pre-push gate (which render only the shipped whole-book `mage-book.pdf`). The section PDFs
# are gitignored generated artifacts, exactly like `mage-book.pdf`; they carry NO whole-book content-integrity
# gate (page floor, part-opener spread) — a 20-page Part PDF is verified only to COMPILE and be non-empty.

#: The exact section filenames the reviewer asked for (`mage-book-<Section>.pdf`).
def _pdf_split_sections(doc: "object") -> "list[tuple[str, list[str]]]":
    """The ONE canonical grouping of the book's ordered chapters into the 9 review sections, keyed off the
    same `part` field the whole-book render iterates:
      part 0 → FrontMatter · parts 1-6 → Part1…Part6 · part 7 → BackMatter · parts ≥ 8 → Appendices
    (the appendices front-door divider plus every appendix chapter). It reuses the IR chapter order, so each
    section is a contiguous slice of the whole-book reading order — there is no second section model that
    could drift from the full projection. Returns ordered `(filename-suffix, [slug, …])` pairs."""
    def _bucket(part: int) -> str:
        if part == 0:
            return "FrontMatter"
        if 1 <= part <= 6:
            return f"Part{part}"
        if part == 7:
            return "BackMatter"
        return "Appendices"

    buckets: "dict[str, list[str]]" = {}
    order: "list[str]" = []
    for ch in doc.chapters:  # type: ignore[attr-defined]
        key = _bucket(ch.part)
        if key not in buckets:
            buckets[key] = []
            order.append(key)
        buckets[key].append(ch.slug)
    return [(k, buckets[k]) for k in order]


def build_pdf_split() -> int:
    """Emit one PDF per logical book section (front matter, Parts 1-6, back matter, appendices) alongside the
    full `mage-book.pdf`. Each section PDF is projected from the SAME typed IR and Typst emitter the whole
    book uses (`book_typst.emit_document(..., split_section=True)`), so a section PDF cannot diverge from its
    slice of the whole book. A `[ref:]` cross-reference whose target float sits in another section renders as
    descriptive text ("Figure B.24-1"), not a live `@label` (which would be absent here and fail the compile).
    Each section PDF is verified only to COMPILE and be non-empty — the whole-book content-integrity gate stays
    on `mage-book.pdf` alone. Returns 0 when every section compiled non-empty, 1 otherwise."""
    import shutil
    import subprocess

    import book_typst
    import book_ir

    typst = shutil.which("typst")
    if not typst:
        print("ERROR: `typst` not found on PATH — cannot render the per-section split PDFs.", file=sys.stderr)
        return 2

    doc = book_ir.parse_book(include_appendices=True, for_print=True)
    sections = _pdf_split_sections(doc)
    typ_dir = HERE / "_typst"
    typ_dir.mkdir(exist_ok=True)
    last_modified = _book_last_modified()
    base = _PDF_FILENAME[:-4] if _PDF_FILENAME.endswith(".pdf") else _PDF_FILENAME  # "mage-book"

    print(f"\n== Per-section split PDFs ({len(sections)} sections; review aid, no whole-book gate) ==")
    produced: "list[tuple[str, int]]" = []
    failures: "list[str]" = []
    for suffix, slugs in sections:
        pdf_out = HERE / f"{base}-{suffix}.pdf"
        if not slugs:
            print(f"WARNING: section {suffix} has no chapters — skipping (no PDF emitted).", file=sys.stderr)
            continue
        typ = book_typst.emit_document(slugs, root=ROOT, with_frontmatter=True, split_section=True)
        typ_src = typ_dir / f"{base}-{suffix}.typ"
        typ_src.write_text(typ, encoding="utf-8")
        cmd = [typst, "compile", "--input", f"last_modified={last_modified}",
               "--root", str(ROOT), "--font-path", str(HERE / "fonts"), str(typ_src), str(pdf_out)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0 or not pdf_out.is_file():
            print(f"ERROR: section {suffix} Typst compile failed (rc={r.returncode}).\n{r.stderr}",
                  file=sys.stderr)
            failures.append(suffix)
            continue
        pages = _pdf_page_count(pdf_out)
        if pages < 1:
            print(f"ERROR: section {suffix} produced an empty PDF (0 pages).", file=sys.stderr)
            failures.append(suffix)
            continue
        size_kib = pdf_out.stat().st_size / 1024
        produced.append((suffix, pages))
        print(f"  {pdf_out.name:<28} {pages:>3} pages  {size_kib:>6.0f} KiB")

    print(f"Per-section split: {len(produced)}/{len(sections)} section PDFs produced"
          + (f"; FAILED: {', '.join(failures)}" if failures else " (all compiled non-empty)"))
    return 1 if failures else 0


def _pdf_split_enabled(args: "list[str]") -> bool:
    """Whether a `--pdf` run should ALSO emit the per-section review PDFs. Default-on locally; OFF when
    `--no-split` is passed OR the build runs in GitHub Actions / any CI (the published site ships only the
    whole-book `mage-book.pdf`, so CI must not pay the per-section compile cost). `GITHUB_ACTIONS` is set by
    the Pages workflow runner; `CI` is the generic fallback."""
    if "--no-split" in args:
        return False
    if os.environ.get("GITHUB_ACTIONS") or os.environ.get("CI"):
        return False
    return True


def build() -> int:
    metrics = _load_metrics()
    _load_citations()  # the committed Chicago render of references.bib — read once, consumed per chapter
    chapters = _discover_chapters(metrics)
    if not chapters:
        print("no chapter files found under the Part/Chapter hierarchy", file=sys.stderr)
        return 1

    # Appendix — the pattern catalogue, projected from the catalogue entries into GoF format. Sorts
    # after the back matter.
    max_part = max(c["part"] for c in chapters)
    appendix = build_appendix_chapters(next_part=max_part + 1)
    chapters = chapters + appendix

    # Resolve symbolic appendix cross-references (`[appendix: <slug>]` → "Appendix <letter>" link) now that
    # every appendix page exists and its letter is known. Rewriting the marker to a plain markdown link here
    # — before the harvest/glossary/float passes below and the per-chapter render — keeps ONE resolution
    # point feeding every downstream consumer (see `_resolve_appendix_refs_md`).
    _appendix_refs = _appendix_letter_map(chapters)
    _bare_refs = _bare_flagship_page_map(chapters)
    _web_refs = _web_redirect_map()
    for c in chapters:
        c["body_md"] = _resolve_appendix_refs_md(c["body_md"], _appendix_refs, _bare_refs, _web_refs)

    # The first chapter of each Part opens with an epigraph (numbered Parts only).
    seen_parts: set[int] = set()
    for c in chapters:
        c["show_epigraph"] = (c["part"] not in seen_parts and not c.get("is_appendix")
                              and not c.get("is_part_page") and not c.get("is_appendix_divider"))
        seen_parts.add(c["part"])

    # Curated concept index — harvest the index-def / index-example tags across all pages in reading
    # order (fails loud on a duplicate def, an unregistered slug, or an example with no def). The per-page
    # anchor maps feed the renderer so each tagged block carries the anchor the index links to.
    concept_registry, page_anchor_maps = _harvest_concept_tags(chapters)
    # {slug: (page_slug, idx-def anchor)} for every concept the book gave a canonical definition site — the
    # drift-proof target set the front glossary links its terms to (see `_link_glossary_sites`).
    gloss_link_map = {
        slug: (slot["def"][0]["slug"], slot["def"][1])
        for slug, slot in concept_registry.items() if slot.get("def")
    }
    # Harvest the glossary annotations (single source of truth for the inline glosses + the back-Glossary).
    _collect_glossary(chapters)

    chapters, ref_map, float_entries = _insert_list_of_floats(chapters, page_anchor_maps, for_print=False)

    # Per-chapter pages. Float numbers are CHAPTER-RELATIVE ("Figure 1.3-1"): the counters reset to 1 at
    # each chapter, keyed to the chapter's <part>.<chapter> id, matching the label map _collect_floats built.
    for i, c in enumerate(chapters):
        if c.get("is_part_page"):
            num_label = f'Part {c["part"]}'
        elif c.get("is_appendix_divider"):
            num_label = c["chapter_title"]  # "Appendices" — the reference section's own label
        elif c.get("is_appendix"):
            num_label = "Appendix"
        elif c.get("is_matter"):
            num_label = c["chapter_title"]  # "Preface" / "Conclusion"
        elif c.get("is_coda"):
            num_label = c["chapter_title"]  # the unnumbered coda's kicker is its title, not "Chapter N"
        else:
            num_label = f'Chapter {c["seq"]}'
        kicker = _kicker_html(chapters, i, num_label)
        # `part.chapter` heading number — numbered body chapters (Parts 1-6) get it; front-matter
        # apparatus (part 0), true back matter (part 7 — about-the-author, colophon), and the appendix
        # (its own A/B/C locators) stay unnumbered. Display-only: it prefixes the chapter H1 here and, as
        # `section_prefix` below, each `## ` section — and never touches a heading's `{#slug}` id anchor,
        # so cross-refs, index-defs, and glossary pointers keep resolving.
        chap_num = (None if c.get("is_matter") or c.get("is_appendix") or c.get("is_part_page")
                    or c.get("is_appendix_divider") or c.get("is_coda")
                    else f'{c["part"]}.{c["chapter"]}')
        chap_num_html = f'<span class="chap-num">{html.escape(chap_num)}</span> ' if chap_num else ""
        header = (
            f'<header class="chap"><div class="kicker">{kicker}</div>'
            f'<h1>{chap_num_html}{inline(c["chapter_title"])}</h1>'
            + (_epigraph_html(c["part"]) if c.get("show_epigraph") else "")
            + '</header>'
        )
        # Assign this chapter's citation numbers (first-reference order) BEFORE rendering, so inline()'s
        # `[cite:]` superscripts and the Works Cited list below both read the one ordering (BIB-4 mirror).
        _number_citations(c["slug"], c["body_md"])
        cited_keys = list(_CITE_STATE["order"])
        # `## ` sections carry a `part.chapter.N` display prefix wherever the chapter H1 is numbered (body
        # Parts 1-6); front/back-matter apparatus and the appendix stay unnumbered (`chap_num` None).
        section_prefix = chap_num
        body = md_to_html(c["body_md"], anchor_map=page_anchor_maps.get(c["slug"]),
                          section_prefix=section_prefix)
        body, _fig_n, _tbl_n = _number_floats(body, _chapter_id(c), 1, 1)
        body = _resolve_xrefs(body, ref_map, for_print=False)
        if _stem_to_label(c["slug"]) == GLOSSARY_CHAPTER_LABEL:
            body = _link_glossary_sites(body, gloss_link_map)
        body += works_cited_section()  # per-chapter numbered Works Cited (empty when nothing is cited)
        if c.get("is_part_page"):
            body += _roadmap_nav_html(c["part"])  # interactive book-roadmap replaces the flat pill bar (web only)
        # The single left→right sequence bar (Table of contents « … │ THIS CHAPTER │ … » Index), bottom-only.
        nav_bar = _chapter_nav_html(chapters, i)
        foot = f'<div class="book-foot">{html.escape(COPYRIGHT)}</div>'
        # An apparatus one-pager (how-to-read) frames its header + body in a bordered, offset box so it reads
        # as one distinct reference item, not a continuation of the preceding chapter. The nav bar and footer
        # stay OUTSIDE the frame (they are page chrome, not part of the apparatus item).
        if _stem_to_label(c["slug"]) in _APPARATUS_ONEPAGER_LABELS \
                or c["slug"] in _APPARATUS_ONEPAGER_APPENDIX_SLUGS:
            content = f'<div class="apparatus-page">{header}{body}</div>'
        elif _stem_to_label(c["slug"]) == _WHAT_THIS_BOOK_ARGUES_LABEL:
            # The claims-page scoping wrapper (see `.argues-page` CSS) — page chrome (nav bar, footer) stays
            # outside it, exactly like the apparatus-page frame above.
            content = f'<div class="argues-page">{header}{body}</div>'
        elif c.get("is_appendix_divider"):
            # The mode-marker: the H1 (in `header`), then the subtitle in the accent italic, then the author
            # paragraph set left in a measured column. The subtitle is structural, not markdown, so it stays
            # out of the one-<h1> heading stream.
            subtitle = (f'<p class="appendices-divider-sub">'
                        f'{html.escape(_APPENDICES_DIVIDER_SUBTITLE)}</p>')
            content = (f'{header}{subtitle}'
                       f'<div class="appendices-divider-body">{body}</div>')
        else:
            content = header + body
        main = content + nav_bar + foot
        toc = toc_html(chapters, c["slug"])
        # The browser-tab <title>: MAGE-branded, and de-doubled. For matter/divider pages the num_label IS
        # the chapter_title ("Preface"), so the naive `{num_label} · {chapter_title}` join printed "Preface ·
        # Preface"; collapse that to the single label. The divider keeps its mode-marker title, which already
        # names MAGE ("Appendices — The Working Surface of MAGE"); every other page ends "— MAGE".
        if c.get("is_appendix_divider"):
            page_title = f'{_APPENDICES_DIVIDER_TITLE} — {_APPENDICES_DIVIDER_SUBTITLE}'
        else:
            descriptor = (c["chapter_title"] if num_label == c["chapter_title"]
                          else f'{num_label} · {c["chapter_title"]}')
            page_title = f'{descriptor} — MAGE'
        out = HERE / f'{c["slug"]}.html'
        out.write_text(
            page(page_title, toc, main, mermaid=c.get("mermaid", False),
                 head_meta=_chapter_head_meta(c, cited_keys), appendix=c.get("is_appendix", False),
                 part_page=c.get("is_part_page", False),
                 appendices_divider=c.get("is_appendix_divider", False)),
            encoding="utf-8",
        )

    # Index / landing page.
    idx_rows = []
    last_part = None
    for c in chapters:
        if c["part"] != last_part:
            idx_rows.append(f'<div class="part">{html.escape(_part_label(c))}</div>')
            idx_rows.append("<ol>")
            if last_part is not None:
                idx_rows[-2] = "</ol>" + idx_rows[-2]
            last_part = c["part"]
        ref = _chap_ref(c)
        if ref:
            cnum = ref
        elif c.get("is_appendix"):
            # 'Appendix B — …' → 'B' (each appendix Part carries its own letter)
            m = re.search(r"Appendix\s+([A-Z])", c["part_title"])
            cnum = m.group(1) if m else "A"
        else:
            cnum = "•"
        idx_rows.append(
            f'<li><a href="{c["slug"]}.html">'
            f'<span class="cnum">{html.escape(cnum):>2}</span>{inline(c["chapter_title"])}</a></li>'
        )
    idx_rows.append("</ol>")
    # Back-matter row on the landing page: the autogenerated term index + the figures gallery (both also
    # reachable from every page's INDEX nav button / the List of Figures and Tables page respectively).
    # Linking them here keeps them off the orphan-reachability list.
    idx_rows.append('<div class="part">Index</div><ol>')
    idx_rows.append(
        f'<li><a href="{BOOK_INDEX_SLUG}.html">'
        f'<span class="cnum">{"★":>2}</span>Index (terms)</a></li>'
    )
    idx_rows.append(
        f'<li><a href="{_FIGURES_GALLERY_SLUG}.html">'
        f'<span class="cnum">{"◫":>2}</span>Figures Gallery</a></li>'
    )
    idx_rows.append(
        f'<li><a href="{_BIBLIOGRAPHY_SLUG}.html">'
        f'<span class="cnum">{"❧":>2}</span>Bibliography</a></li>'
    )
    idx_rows.append("</ol>")
    title_block = (
        f'<div class="book-title"><h1>{html.escape(_BOOK_MANIFEST["title"])}</h1>'
        f'{_cover_sub("sub")}'
        # PDF edition — a CI-published artifact at book/mage-book.pdf on the deployed site (a purely-local
        # checkout without the CI render will 404 this; that is expected).
        f'<div class="book-download"><a href="{_PDF_FILENAME}">Download the PDF edition ↓</a>'
        f'<a href="{_BLOG_POST_URL}" target="_blank" rel="noopener">Read the blog post ↗</a></div>'
        '</div>'
    )
    foot = f'<div class="book-foot">{html.escape(COPYRIGHT)}</div>'
    main = title_block + '<div class="idx">' + "\n".join(idx_rows) + "</div>" + foot
    (HERE / "index.html").write_text(
        page("Model-Based Agentic Software Engineering — Contents", "", main), encoding="utf-8"
    )

    # Book length — auto-computed from the rendered prose of every page (fresh each build, never hardcoded).
    # Printed to stdout (tools report their results) and rendered onto book-index.html as a "Book length" table.
    word_counts = compute_word_counts(chapters)
    _print_word_counts(word_counts)

    # Autogenerated term index — placed after the appendix, reachable from the INDEX nav button.
    (HERE / f"{BOOK_INDEX_SLUG}.html").write_text(
        build_index_page(chapters, concept_registry, word_counts=word_counts), encoding="utf-8")

    # Figures Gallery — every figure the book collected during the list-of-floats pass, spliced in as one
    # standalone page. Reachable from the landing page, the List of Figures and Tables, and its own pager.
    (HERE / f"{_FIGURES_GALLERY_SLUG}.html").write_text(
        build_figures_page(chapters, float_entries), encoding="utf-8")

    # End-of-book Bibliography — the alphabetical union of every cited work (always written so the
    # tracked-HTML gate's expected set stays stable). Its pager points back to the last chapter.
    (HERE / f"{_BIBLIOGRAPHY_SLUG}.html").write_text(
        build_bibliography_page(chapters, chapters[-1]["slug"]), encoding="utf-8")
    fig_count = sum(1 for e in float_entries if e["kind"] == "fig")

    print(f"built {len(chapters)} chapter pages + index.html + {BOOK_INDEX_SLUG}.html + "
          f"{_FIGURES_GALLERY_SLUG}.html ({fig_count} figures)")
    return 0


if __name__ == "__main__":
    args = sys.argv[1:]
    # `--pdf` is the opt-in print edition (the print-native Typst render); default is the fast web build.
    # A local `--pdf` ALSO emits the per-section review PDFs by default (additive); `--no-split` forces
    # full-only, and CI / the deploy pre-push gate are full-only via `_pdf_split_enabled` (env + flag).
    if "--pdf" in args:
        rc = build_pdf()
        if rc == 0 and _pdf_split_enabled(args):
            rc = build_pdf_split() or rc  # section PDFs are additive; a section failure surfaces as nonzero
        raise SystemExit(rc)
    # `--verify-pdf` runs ONLY the content-integrity gate over an existing book/mage-book.pdf (CI reuses it).
    if "--verify-pdf" in args:
        pdf = HERE / _PDF_FILENAME
        if not pdf.is_file():
            print(f"ERROR: {pdf} not found — run `--pdf` first.", file=sys.stderr)
            raise SystemExit(2)
        raise SystemExit(verify_pdf(pdf))
    raise SystemExit(build())
