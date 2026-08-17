"""A typed intermediate representation of the book — a stdlib parse into typed blocks that analyses
*walk*, instead of every lint re-deriving structure with its own regexes (the N-walkers smell).

WHY THIS EXISTS.  `build_book` parses the book several times over — float numbering, concept-tag
harvest, glossary, the notation-leak gate, and every structural check in `tests/book.py` — each pass with
its own regexes and each able to drift. This module is the one typed model those walks share. See
`book/IR-DESIGN.md` for the design and the C→A migration plan.

FOUNDATION — directive registry on our OWN stdlib parser (not a third-party engine).  `catalog.py` is
clone-and-run stdlib-only, so we cannot pull in `markdown-it-py` / MyST. Instead we adopt the *schema* of a
pluggable-markdown engine — a registry of `directive name → typed node` — while keeping our own runtime and
our degradation-friendly HTML-comment notation (`<!-- figure: … -->` is invisible in a plain MD viewer;
`:::figure` is not). Adding notation = one `_DIRECTIVES` row. This is the A.9 "adopt the schema, skip the
runtime" move, and it is on the path to a real engine later, not off it (IR-DESIGN.md §"If clone-and-run
is ever relaxed").

A-READY RULE (do not break).  Every `Block` carries its raw source slice, so the IR is never lossy and the
renderer can later emit *from* it (the C→A step) without re-adding detail. The block taxonomy mirrors the
renderer's own block handling 1:1 for the same reason.

TOKENIZER SSOT.  Block splitting, chapter discovery, and the marker regexes are imported from
`build_book` — there is exactly ONE tokenizer; this module is a typed layer over it, never a copy.
"""
from __future__ import annotations

import re
from collections.abc import Iterator
from dataclasses import dataclass, field
from enum import Enum

import build_book as bb  # SSOT: _split_blocks, _discover_chapters, _load_metrics, _is_pipe_table, _XREF_RE, _INSET_RE


class BlockKind(Enum):
    HEADING = "heading"
    PARA = "para"
    LIST = "list"              # unordered `- ` list
    TABLE = "table"            # a numbered float
    FIGURE = "figure"          # <!-- figure: … --> SVG/img — a numbered float
    MERMAID = "mermaid"        # a standalone ```mermaid fence — a numbered float
    CODE = "code"              # any other standalone fenced block
    CODE_INSET = "code-inset"  # <!-- inset: … --> + fence — NOT numbered
    BLOCKQUOTE = "blockquote"  # concept insets live here; their inner mermaid is NOT numbered
    ORDERED_LIST = "ordered-list"  # `N. ` list — a distinct render kind (<ol> vs <ul>)
    EQ = "eq"
    DIRECTIVE = "directive"    # a lone marker comment (label / index / gloss / noqa …) — renders no structure
    OTHER = "other"            # figure-iframe (catalogue embed) and anything unmatched


#: The three block kinds the build numbers as "Figure N." / "Table N." — the floats an author cross-refs.
FLOAT_KINDS = frozenset({BlockKind.FIGURE, BlockKind.TABLE, BlockKind.MERMAID})

#: One marker comment on its own line: `<!-- keyword: arg -->` or `<!-- keyword -->`.
_MARKER_LINE = re.compile(r"^<!--\s*([a-z0-9-]+)\s*(?::\s*(.*?))?\s*-->$", re.I)

#: The directive registry — the pluggable-notation SSOT. `arms` directives set state for the NEXT float
#: (label, caption); `emits` directives produce a block of the named kind; the rest are inert markers the
#: IR records as DIRECTIVE. `build_book.MARKER_KEYWORDS` is the render-side twin; the notation-leak
#: gate reads that. Keep the two in step when adding notation (IR-DESIGN.md §"Adding a directive").
#: `point` is a drain-phase inert DIRECTIVE — `<!-- point: <slug> | <claim> | terms: <t1>, <t2> -->` — the
#: induced canonical point of the paragraph it heads. It renders NOTHING (like an index tag), and
#: `_parse_chapter` fills its `point_slug` / `point_text` / `point_terms` fields so the outline can derive
#: paragraph points from the decorator. The 3rd `terms:` segment is OPTIONAL (a 2-segment `slug | claim`
#: still parses, with `point_terms = []`); it names the tier-2 LOCAL term slugs the paragraph deploys.
#: `section-terms` is the tier-1 sibling — `<!-- section-terms: <t1>, <t2> -->` — an inert DIRECTIVE placed
#: under an H2/H3 that names the 1–3 major concepts the section develops; `_parse_chapter` fills `section_terms`.
_ARMS = {"label", "table"}                       # arm state consumed by the next float
# `stack-legend` / `brick-grid` (appendix-restructure v2, flag ON) emit a build-generated block — the linked
# constituent legend / the packed brick grid. They carry BlockKind.OTHER + a `directive` tag; the render
# twins (`book_typst.render_typst` OTHER branch, `build_book._consume_leading_marker`) key off the tag.
_EMITS = {"figure": BlockKind.FIGURE, "figure-iframe": BlockKind.OTHER, "eq": BlockKind.EQ,
          "stack-legend": BlockKind.OTHER, "brick-grid": BlockKind.OTHER}

#: The optional 3rd point segment (`terms: <t1>, <t2>`) — a `terms:` prefix then a comma list. The leading
#: `terms:` keyword is matched case-insensitively; the captured group is the raw comma-separated slug list.
_POINT_TERMS_SEG = re.compile(r"^\s*terms:\s*(.*)$", re.I)


def _split_term_list(raw: str) -> "list[str]":
    """Parse a comma-separated term-slug list (`t1, t2, t3`) into a clean list, dropping empty entries. The
    shared parser for both a point's `terms:` segment and a `section-terms:` marker's whole argument."""
    return [t.strip() for t in raw.split(",") if t.strip()]


def _parse_point(arg: str) -> "tuple[str, str, list[str]] | None":
    """Split a `<!-- point: <slug> | <claim> [| terms: <t1>, <t2>] -->` argument into (slug, claim, terms).
    Returns None when the first `|` separator is absent (a malformed decorator the drain audit reports as a
    finding, not a crash). The 3rd `terms:` segment is optional — a 2-segment `slug | claim` yields `[]`
    terms; a 3-segment form parses the trailing comma list. A 3rd segment that is NOT a `terms:` list is
    ignored for `terms` (its words still count toward the claim only if before the first `|`)."""
    if "|" not in arg:
        return None
    parts = [p.strip() for p in arg.split("|")]
    slug, claim = parts[0], parts[1] if len(parts) > 1 else ""
    terms: "list[str]" = []
    if len(parts) > 2:
        m = _POINT_TERMS_SEG.match(parts[2])
        if m:
            terms = _split_term_list(m.group(1))
    return slug, claim, terms


# ── Worked-Examples gallery (the GoF "Known Uses" directive) ─────────────────────────────────────────
# A significant section closes with a gallery bracketed by `<!-- worked-examples: <construct-key> -->` …
# `<!-- worked-examples-end -->`. Inside, each `### Example — <Source>` heads a 2-4-sentence HAND-AUTHORED
# gloss; a `<!-- takeaway -->` marker introduces the closing Takeaway line that names the shared abstraction.
# The ROSTER (which sources, in what order) PROJECTS from the industry-cases matrix; the PROSE stays authored
# (never machine-composed). Both render targets collect the bracketed span and hand its raw inner markdown to
# `parse_worked_examples`, so an author's blank-line placement inside the block never matters — the parser
# line-scans for the `### Example` heads and the takeaway divider. These regexes are the SSOT; the join lint
# (book-models/lint_worked_examples_join.py) mirrors them for its stdlib-standalone scan.
WEX_OPEN_RE = re.compile(r"^<!--\s*worked-examples:\s*(?P<key>[a-z0-9-]+)\s*-->\s*$", re.I)
WEX_END_RE = re.compile(r"^<!--\s*worked-examples-end\s*-->\s*$", re.I)
_WEX_TAKEAWAY_RE = re.compile(r"^<!--\s*takeaway\s*-->\s*$", re.I)
#: `### Example — <Source>` (em-dash house style; hyphen/en-dash accepted). An optional trailing `{other}` /
#: `{counter-example}` brace tag types the slot explicitly — the join lint checks `industry-case` slots
#: against the matrix (WE1) and EXEMPTS `other`; `counter-example` is the sanctioned below-partial opt-in.
WEX_EXAMPLE_RE = re.compile(r"^#{3,4}\s+Example\s*[—–-]\s*(?P<label>.+?)\s*$", re.I)
_WEX_TAG_RE = re.compile(r"^(?P<label>.*?)\s*\{(?P<tag>other|counter-example)\}\s*$", re.I)
#: A literal "Takeaway." label at the head of the takeaway prose. Both renderers auto-prepend the label
#: (PDF `#strong[Takeaway.]`, HTML `<span class="wex-tk-label">`), so a source that writes its own leading
#: `**Takeaway.**` renders it DOUBLED ("Takeaway. Takeaway."). This sensor fails the build fast on that.
_WEX_TAKEAWAY_LABEL_RE = re.compile(r"^\s*(\*\*|__)?\s*takeaway[.:]", re.I)


@dataclass
class WexCase:
    """One gallery slot — a named source, an optional explicit type tag, and the hand-authored gloss. A
    projected stub carries an empty `prose_md` for the author to fill; `explicit_tag` is None unless the
    author braces the head `{other}`/`{counter-example}` (else the join lint resolves the type by name)."""
    source: str                    # display label, any `{tag}` stripped ("Cloudflare", "Siemens (near-miss)")
    explicit_tag: "str | None"     # "other" | "counter-example" | None
    prose_md: str                  # the authored gloss (empty in a projected stub)


@dataclass
class WorkedExamples:
    """A parsed Worked-Examples gallery — the construct-key weld, the ordered source slots, and the Takeaway."""
    construct_key: str
    cases: "list[WexCase]"
    takeaway_md: str


def _split_wex_example_head(label_raw: str) -> "tuple[str, str | None]":
    """Split a `### Example — <Source> {tag}` head's label from its optional `{other}`/`{counter-example}`
    brace tag. Returns (display-label, tag|None)."""
    m = _WEX_TAG_RE.match(label_raw)
    if m:
        return m.group("label").strip(), m.group("tag").lower()
    return label_raw.strip(), None


def parse_worked_examples(construct_key: str, inner_md: str) -> WorkedExamples:
    """Parse the raw markdown BETWEEN `<!-- worked-examples: KEY -->` and `<!-- worked-examples-end -->`
    (both markers excluded) into the typed gallery. Line-scans for `### Example — <Source>` heads and the
    `<!-- takeaway -->` divider, so blank-line placement inside the block does not matter. Prose under a head
    is that slot's authored gloss; prose after the takeaway divider is the Takeaway line."""
    cases: "list[WexCase]" = []
    takeaway_lines: "list[str]" = []
    cur_prose: "list[str]" = []
    in_takeaway = False
    for raw in inner_md.splitlines():
        s = raw.strip()
        if _WEX_TAKEAWAY_RE.match(s):
            in_takeaway = True
            continue
        if in_takeaway:
            takeaway_lines.append(raw)
            continue
        me = WEX_EXAMPLE_RE.match(s)
        if me:
            label, tag = _split_wex_example_head(me.group("label"))
            cur_prose = []
            cases.append(WexCase(source=label, explicit_tag=tag, prose_md=""))
            continue
        if cases:
            cur_prose.append(raw)
            cases[-1].prose_md = "\n".join(cur_prose).strip()
    takeaway_md = "\n".join(takeaway_lines).strip()
    # Fail-loud: the source must NOT write its own "Takeaway." label — both renderers auto-prepend it,
    # so a literal label doubles it. Blocks both the PDF and HTML build paths on any regression.
    if _WEX_TAKEAWAY_LABEL_RE.match(takeaway_md):
        raise ValueError(
            f"Worked-examples takeaway for construct '{construct_key.strip()}' begins with a literal "
            f"'Takeaway.' label; the renderer auto-prepends the label, so remove the leading "
            f"'**Takeaway.**' from the source. Offending text: {takeaway_md[:80]!r}")
    return WorkedExamples(construct_key=construct_key.strip(), cases=cases,
                          takeaway_md=takeaway_md)


@dataclass
class Ref:
    """A `[ref:key]` cross-reference found in prose, with where it sits (for the before-its-float rule)."""
    key: str
    chapter_slug: str
    block_index: int


@dataclass
class Block:
    kind: BlockKind
    raw: str                                   # the raw source slice — A-ready, never lossy
    index: int                                 # position within the chapter's flat block list
    label: str | None = None                   # a float's cross-ref key (from a <!-- label: … --> arming it)
    caption: str | None = None                 # a float's caption text, if any
    heading_level: int = 0                     # 1..6 for HEADING
    directive: str | None = None               # for DIRECTIVE/OTHER: the marker keyword
    refs: list[Ref] = field(default_factory=list)  # [ref:key] tokens in this block's prose
    point_slug: str | None = None              # for a `point` DIRECTIVE: the decorator's kebab slug
    point_text: str | None = None              # for a `point` DIRECTIVE: the induced canonical-point CLAIM
    point_terms: list[str] = field(default_factory=list)   # for a `point`: tier-2 LOCAL term slugs (`terms:`)
    section_terms: list[str] = field(default_factory=list)  # for a `section-terms` DIRECTIVE: tier-1 term slugs

    @property
    def is_float(self) -> bool:
        return self.kind in FLOAT_KINDS

    #: Block kinds this node can render from its raw slice with NO cross-block or arming state — the
    #: render-complete subset (the C→A enrich step). The stateful kinds a full flip must still thread
    #: through the renderer's arming loop are excluded: MERMAID (a following italic paragraph may fold in
    #: as its caption), FIGURE / EQ / OTHER / DIRECTIVE (emitted by an arming marker, may carry a
    #: `data-label`), and TABLE (a `<!-- table: -->` caption / label may arm it). See `render_html`.
    _RENDER_COMPLETE = frozenset({
        BlockKind.HEADING, BlockKind.PARA, BlockKind.LIST, BlockKind.ORDERED_LIST,
        BlockKind.CODE, BlockKind.CODE_INSET, BlockKind.BLOCKQUOTE,
    })

    @property
    def is_render_complete(self) -> bool:
        """True when `render_html()` can produce this block's HTML from its raw slice alone — no arming
        marker (label/caption/anchor) and no cross-block fold participates. The C→A enrich step made the IR
        render-complete for this subset; a full flip renders these from the node and threads only the rest.

        A block carrying standard-markdown footnote markup (`[^label]` reference or `[^label]:` definition)
        is EXCLUDED: md_to_html resolves a footnote against CROSS-BLOCK state (the chapter's definitions are
        pulled out of the flow and referenced from other blocks), so `_render_paragraph` on the raw slice in
        isolation cannot mirror it — the same cross-block-state reason floats/armed blocks are excluded."""
        return self.kind in Block._RENDER_COMPLETE and not bb._FOOTNOTE_REF_RE.search(self.raw)

    def render_html(self) -> str:
        """Render this block's HTML from its raw slice — byte-identical to `md_to_html`'s emit for the
        render-complete kinds (the enrich step's proof that the IR node holds enough to render). Delegates
        to the renderer's extracted per-kind primitives (the ONE renderer, never a copy). Raises for a kind
        that needs the renderer's arming/fold state, so a caller cannot silently drop a float's label."""
        if not self.is_render_complete:
            raise ValueError(
                f"{self.kind.value} is not render-complete: it needs the renderer's arming/fold state "
                f"(label / caption / anchor / mermaid-caption fold); render it through md_to_html")
        import build_book as _bb
        k = self.kind
        if k is BlockKind.HEADING:
            return _bb._render_heading(self.raw)
        if k is BlockKind.PARA:
            # A standalone HTML comment (an authoring TODO not in the notation vocabulary — so not peeled as
            # a DIRECTIVE) renders RAW, not wrapped in <p>. `classify_render_block` reports it PARA because
            # it is prose-shaped; the renderer keeps a lone-comment passthrough just ahead of prose, and this
            # mirrors it so `render_html` on such a block equals the emit.
            s = self.raw.strip()
            if s.startswith("<!--") and s.endswith("-->") and s.count("<!--") == 1:
                # A lone HTML comment emits nothing — `md_to_html` strips standalone comments to '',
                # so this mirror returns '' too. (Returning the comment verbatim was a stale mirror
                # that produced a render-complete IR byte-identity divergence.)
                return ''
            return _bb._render_paragraph(self.raw)
        if k is BlockKind.LIST:
            return _bb._render_unordered_list(self.raw)
        if k is BlockKind.ORDERED_LIST:
            return _bb._render_ordered_list(self.raw)
        if k is BlockKind.CODE:
            return _bb._render_code(self.raw)
        if k is BlockKind.CODE_INSET:
            return _bb._render_inset(self.raw)
        return _bb._render_blockquote(self.raw)  # BLOCKQUOTE


@dataclass
class Chapter:
    slug: str
    part: int
    title: str
    blocks: list[Block]
    chapter: int = 0   # the within-part chapter number; `<part>.<chapter>` is the float-numbering prefix
    #: The reader-facing appendix locator ("D", "D.1", "B.29") the web build stamps for D80 monotonic figure
    #: numbering. When set (appendix chapters only), the Typst float-numbering prefix uses it instead of the
    #: numeric `<part>.<chapter>` — so App-D tables read "Table D.1-1", not "Table 12.1-1". None for body
    #: chapters, which keep `<part>.<chapter>`.
    fig_prefix: "str | None" = None
    #: True for an UNNUMBERED matter chapter (front matter, the top-level Conclusion, the synthetic back
    #: matter). The Typst projection reads this to suppress the chapter number and to give the synthetic
    #: post-appendix back matter its own "Back Matter" divider (its part number is dynamic).
    is_matter: bool = False
    #: The chapter's part display title ("Back Matter" for the synthetic tail) — carried so the divider text
    #: for a matter part whose number is not in `_PART_TITLES` is available on the record.
    part_title: str = ""

    def floats(self) -> list[Block]:
        return [b for b in self.blocks if b.is_float]

    def refs(self) -> list[Ref]:
        return [r for b in self.blocks for r in b.refs]


@dataclass
class Document:
    chapters: list[Chapter]

    def floats(self) -> "list[tuple[Chapter, Block]]":
        return [(c, b) for c in self.chapters for b in c.floats()]

    def refs(self) -> list[Ref]:
        return [r for c in self.chapters for r in c.refs()]

    def labels(self) -> "dict[str, tuple[Chapter, Block]]":
        """key → (chapter, float) for every labelled float — the resolve target set for `[ref:]`."""
        return {b.label: (c, b) for c in self.chapters for b in c.floats() if b.label}


def blocks_outside_worked_examples(blocks: "list[Block]") -> "Iterator[Block]":
    """Yield every block that is NOT inside a worked-examples gallery span — the span from a
    `<!-- worked-examples: KEY -->` DIRECTIVE block through the `<!-- worked-examples-end -->` close marker
    (inclusive). The gallery is a single directive-managed unit that both emitters collect and render whole
    (`build_book.md_to_html` intercepts the open marker and hands the bracketed inner markdown to
    `parse_worked_examples`); its inner `### Example` heads, `<!-- takeaway -->` divider, and close marker are
    DIRECTIVE SYNTAX, not standalone narrative blocks. So per-block checks (O2 topic-sentence over headings,
    the C→A isolated-render fidelity net) must skip the whole span — an inner block rendered in isolation
    would mis-classify (a `### Example` head as an L3 section) or crash the renderer's mid-block-marker guard
    (the close marker glues onto the takeaway PARA's raw). The close marker is detected by raw-substring on
    any block, not a standalone directive, because it glues onto the takeaway paragraph. `WEX_OPEN_RE` /
    `WEX_END_RE` are the SSOT for these markers."""
    in_wex = False
    for b in blocks:
        if b.kind is BlockKind.DIRECTIVE and b.directive == "worked-examples":
            in_wex = True
        if in_wex:
            if b.raw and "worked-examples-end" in b.raw:
                in_wex = False
            continue  # everything from the open marker through the close marker is directive syntax
        yield b


def _fig_caption(arg: str) -> "str | None":
    """The caption of a `<!-- figure: <src> | <caption> -->` directive (the part after `|`), or None."""
    return arg.split("|", 1)[1].strip() if "|" in arg else None


def _classify_prose(text: str) -> BlockKind:
    """Classify a block's non-marker remainder. Mirrors the renderer's block dispatch order so the IR block
    taxonomy equals what gets rendered (the A-migration 1:1 rule)."""
    s = text.lstrip()
    if s.startswith("```"):
        lang = s[3:].split("\n", 1)[0].strip().lower()
        return BlockKind.MERMAID if lang == "mermaid" else BlockKind.CODE
    if bb._is_pipe_table(text):
        return BlockKind.TABLE
    if s.startswith("#"):
        return BlockKind.HEADING
    if s.startswith(">"):
        return BlockKind.BLOCKQUOTE  # concept insets; an inner `> ```mermaid` is NOT a standalone float
    if s.startswith("- "):
        return BlockKind.LIST
    if re.match(r"^\d+\.\s", s):
        return BlockKind.ORDERED_LIST  # `N. ` list → <ol> (distinct from the `- ` unordered <ul>)
    return BlockKind.PARA


def classify_render_block(block: str) -> BlockKind:
    """Classify one whole render block EXACTLY as `build_book.md_to_html`'s emit loop dispatches it —
    the single classifier the renderer's content dispatch now calls, so one parse feeds both render and
    analysis (the C→A flip). Mirrors the renderer's precise branch order and tests (a space-delimited
    heading, an all-lines `>` blockquote, a `_is_pipe_table` table), NOT the looser `_classify_prose` shape
    tests. Returns CODE_INSET / MERMAID / CODE / HEADING / BLOCKQUOTE / TABLE / LIST / ORDERED_LIST / PARA.

    Two shapes render-loop-inline that this reports as PARA (they are prose-shaped and the renderer keeps a
    literal test for them just ahead of prose): a `[FILL IN: …]` / `[MORE CHAPTERS FOLLOW: …]` gap marker,
    and a standalone HTML comment. The renderer's own conditionals catch those before falling through to the
    PARA renderer; the classifier need not distinguish them."""
    stripped = block.strip()
    lines = stripped.splitlines()
    first = lines[0].strip() if lines else ""
    # Inset: `<!-- inset: <title> -->` glued to the head of a fenced code block.
    if bb._INSET_RE.match(first) and len(lines) > 1 and lines[1].strip().startswith("```"):
        return BlockKind.CODE_INSET
    # Fenced code — a ```mermaid fence is a numbered figure; any other fence is a plain code block.
    if first.startswith("```"):
        lang = first[3:].strip().lower()
        return BlockKind.MERMAID if lang == "mermaid" else BlockKind.CODE
    # Heading (space-delimited `# ` … `#### `).
    if any(stripped.startswith(h) for h in ("#### ", "### ", "## ", "# ")):
        return BlockKind.HEADING
    # Blockquote — EVERY line starts with `>` (matches the renderer's `all(...)` test).
    if lines and all(ln.strip().startswith(">") for ln in block.splitlines()):
        return BlockKind.BLOCKQUOTE
    # Pipe table.
    if bb._is_pipe_table(block):
        return BlockKind.TABLE
    # Unordered / ordered list (keyed on the first line, as the renderer does).
    if first.startswith("- "):
        return BlockKind.LIST
    if re.match(r"^\d+\.\s", first):
        return BlockKind.ORDERED_LIST
    return BlockKind.PARA


def _find_refs(text: str, slug: str, index: int) -> list[Ref]:
    return [Ref(m.group(1), slug, index) for m in bb._XREF_RE.finditer(text)]


def _parse_chapter(rec: dict) -> Chapter:
    slug = rec["slug"]
    blocks: list[Block] = []
    pending_label: "str | None" = None      # a <!-- label: --> waiting for its float
    pending_caption: "str | None" = None    # a <!-- table: --> caption waiting for its table

    for raw in bb._split_blocks(rec["body_md"]):
        raw = raw.strip("\n")
        if not raw.strip():
            continue
        lines = raw.splitlines()
        first = lines[0].strip()

        # A titled inset (`<!-- inset: … -->` glued to a fence) is a set-apart box, NOT a numbered float —
        # detect it BEFORE peeling so its inner mermaid never counts as a "Figure N".
        if bb._INSET_RE.match(first) and len(lines) > 1 and lines[1].strip().startswith("```"):
            blocks.append(Block(BlockKind.CODE_INSET, raw, len(blocks), directive="inset"))
            continue

        # Peel leading marker comments (placement-robust — a marker may sit glued to the prose/float it
        # heads). `label`/`table` arm the next float; `figure`/`eq` emit; the rest are inert DIRECTIVEs.
        while lines:
            m = _MARKER_LINE.match(lines[0].strip())
            if not m:
                break
            kw, arg = m.group(1).lower(), (m.group(2) or "").strip()
            if kw == "label":
                pending_label = arg
            elif kw == "table":
                pending_caption = arg
            elif kw == "figure":
                blocks.append(Block(BlockKind.FIGURE, lines[0].strip(), len(blocks),
                                    label=pending_label, caption=_fig_caption(arg)))
                pending_label = None
            elif kw in _EMITS:
                blocks.append(Block(_EMITS[kw], lines[0].strip(), len(blocks), directive=kw))
            elif kw == "point":
                # An inert DIRECTIVE carrying the induced canonical point of the paragraph it heads. `arg` is
                # `<slug> | <claim> [| terms: <t1>, <t2>]`; a missing first `|` leaves slug/text None (the
                # drain audit flags it). The optional 3rd `terms:` segment lists the tier-2 LOCAL term slugs
                # the paragraph deploys. The outline pairs the point with the following prose block
                # positionally (document order).
                pt = _parse_point(arg)
                blocks.append(Block(BlockKind.DIRECTIVE, lines[0].strip(), len(blocks), directive="point",
                                    point_slug=pt[0] if pt else None,
                                    point_text=pt[1] if pt else None,
                                    point_terms=pt[2] if pt else []))
            elif kw == "section-terms":
                # A tier-1 inert DIRECTIVE placed under a heading: `<!-- section-terms: <t1>, <t2> -->` names
                # the 1–3 major concepts the section develops. Renders NOTHING; the reverse index inverts it
                # into term→section edges (tier-1). Its whole argument is a comma list of term slugs.
                blocks.append(Block(BlockKind.DIRECTIVE, lines[0].strip(), len(blocks),
                                    directive="section-terms", section_terms=_split_term_list(arg)))
            else:
                blocks.append(Block(BlockKind.DIRECTIVE, lines[0].strip(), len(blocks), directive=kw))
            lines = lines[1:]

        remaining = "\n".join(lines).strip("\n")
        if not remaining.strip():
            continue  # block was nothing but marker comment(s)

        kind = _classify_prose(remaining)
        idx = len(blocks)
        b = Block(kind, remaining, idx)
        if kind in (BlockKind.MERMAID, BlockKind.TABLE):   # a float armed by the pending state
            b.label, pending_label = pending_label, None
            if kind is BlockKind.TABLE:
                b.caption, pending_caption = pending_caption, None
        elif kind is BlockKind.HEADING:
            # B1 fix: compute the depth from the REMAINING heading line (after leading markers were peeled),
            # not the block's original `first` line. When a marker comment is glued above the heading (e.g.
            # `<!-- index-def: … -->` on the line before `## …`), `first` is the peeled marker and its `#`
            # run is 0 — so the level must come from the surviving heading text.
            head = remaining.lstrip()
            b.heading_level = len(head) - len(head.lstrip("#"))
        else:  # prose — the only place a [ref:] introduces a float
            b.refs = _find_refs(remaining, slug, idx)
        blocks.append(b)

    return Chapter(slug=slug, part=rec["part"],
                   title=rec.get("chapter_title") or rec.get("part_title", ""), blocks=blocks,
                   chapter=rec.get("chapter", 0), fig_prefix=rec.get("fig_prefix"),
                   is_matter=bool(rec.get("is_matter")), part_title=rec.get("part_title", ""))


def parse_book(include_appendices: bool = False, for_print: bool = False) -> Document:
    """Parse the main-narrative chapters (front / parts 1–5 / back) into the typed IR. Appendices are
    reference entries with their own float conventions; opt in with `include_appendices=True`. `for_print`
    selects the print/PDF projection of the appendix (e.g. Appendix E collapses to an online pointer)."""
    metrics = bb._load_metrics()
    chapters = bb._discover_chapters(metrics)
    if include_appendices:
        chapters = chapters + bb.build_appendix_chapters(
            next_part=max(c["part"] for c in chapters) + 1, for_print=for_print)
        # The terminal book-object apparatus (Colophon, About-the-Author) rides after the appendices, the
        # mirror of the appendix append — so the PDF projection carries it; the structure-only views
        # (outline, include_appendices=False) leave it out, keeping the back matter out of the outline.
        chapters = chapters + bb.build_backmatter_chapters(
            next_part=max(c["part"] for c in chapters) + 1)
        # Resolve symbolic appendix cross-references BEFORE parsing each chapter into the IR, using the same
        # build-time letter derivation the HTML build uses (bb._appendix_letter_map /
        # bb._resolve_appendix_refs_md) — so the print projection's `[appendix: <slug>]` markers become the
        # SAME "Appendix <letter>" links the web book carries. Only meaningful when the appendix pages are in
        # this parse (their letters are what a reference resolves against); the structure-only views that
        # parse the narrative WITHOUT appendices never render these markers, so they leave them untouched.
        amap = bb._appendix_letter_map(chapters)
        bare_page = bb._bare_flagship_page_map(chapters)
        web_map = bb._web_redirect_map()
        for c in chapters:
            c["body_md"] = bb._resolve_appendix_refs_md(c["body_md"], amap, bare_page, web_map)
    return Document([_parse_chapter(c) for c in chapters])
