"""A THIN helper over the book IR — the symbol-extraction the view-models need but `book/book_ir.py` does
not yet expose. Read-only over `book_ir`. The accessors below are the `book_ir` extensions still wanted for
reconciliation (surfacing `{#slug}` ids and the topic-sentence pairing as first-class IR accessors) —
see `book-models/DESIGN.md` §6. Bug B1 (marker-glued heading read level 0) is now FIXED in book_ir, so this
helper reads `Block.heading_level` directly rather than re-deriving it.

WHAT IT COMPUTES (that book_ir does not, today):
  1. Heading `{#slug}` id + id-stripped text, parsed with the renderer's OWN `_HEADING_ANCHOR_RE` SSOT.
  2. The topic-sentence pairing: a heading → the first paragraph block that follows it.
  3. A stable section id: the explicit `{#slug}` when present, else a slug derived from the heading text.

TOKENIZER SSOT.  Heading-anchor parsing imports the renderer's `_HEADING_ANCHOR_RE` rather than re-typing
it, so there is exactly one heading-anchor grammar in the repo (the same discipline book_ir uses for its
block tokenizer). Slugification is the only local rule (no renderer counterpart exists to borrow).
"""
from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass, field

_BOOK_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "book")
if _BOOK_DIR not in sys.path:
    sys.path.insert(0, _BOOK_DIR)

import book_ir  # noqa: E402 — path set above; the book IR is the read-only data source
import build_book_html as bb  # noqa: E402 — the SSOT for the heading-anchor grammar (_HEADING_ANCHOR_RE)

#: The renderer's own heading-anchor grammar — imported, never re-typed (tokenizer SSOT).
_HEADING_ANCHOR_RE = bb._HEADING_ANCHOR_RE
#: One sentence terminator run — a `.`/`?`/`!` followed by whitespace or end. Kept simple on purpose:
#: a topic sentence is a coarse signal (does this section open on a stated point?), not a parse target.
_SENTENCE_END = re.compile(r"(?<=[.?!])\s")
_SLUG_STRIP = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    """A stable, lowercase, hyphen-joined slug of heading text — the derived section id when a heading
    carries no explicit `{#slug}`. Deterministic so the same heading always yields the same id."""
    return _SLUG_STRIP.sub("-", text.lower()).strip("-")


def heading_id_and_text(block: "book_ir.Block") -> "tuple[str | None, str]":
    """Split a heading block's raw `## Title {#slug}` into (explicit_id_or_None, visible_text). Uses the
    renderer's `_HEADING_ANCHOR_RE` SSOT to peel the `{#slug}`, then strips the leading `#`s. This is the
    `book_ir.Block.heading_id` / `.heading_text` extension wanted for reconciliation (DESIGN §6.1)."""
    raw = block.raw.strip()
    body = raw.lstrip("#").strip()  # drop the `##`/`###` prefix; heading_level() carries the depth
    m = _HEADING_ANCHOR_RE.search(body)
    if m:
        return m.group(1), body[: m.start()].rstrip()
    return None, body


def first_sentence(text: str) -> str:
    """The first sentence of a paragraph block — the topic sentence. A coarse split on `.?!`-then-space;
    a paragraph with no terminator returns whole (a one-clause topic sentence)."""
    flat = " ".join(text.split())
    parts = _SENTENCE_END.split(flat, maxsplit=1)
    return parts[0].strip()


@dataclass
class PointRow:
    """One `<!-- point: <slug> | <text> -->` decorator — the induced canonical point of the paragraph it
    heads. Paired to its owning section by document order (the decorator sits between one heading and the
    next). A drained section carries a list of these; an un-drained section carries none."""
    slug: str
    text: str
    block_index: int                   # index of the decorator's DIRECTIVE block in the chapter


@dataclass
class HeadingRow:
    """A heading joined to its stable id, visible text, and the topic sentence that follows it."""
    chapter_slug: str
    part: int
    level: int
    heading_text: str
    section_id: str                    # explicit {#slug} if present, else slugify(heading_text)
    id_source: str                     # "explicit" | "derived"
    topic_sentence: str | None         # first sentence of the following paragraph, or None (an O2 finding)
    block_index: int
    points: "list[PointRow]" = field(default_factory=list)  # canonical points under this section (drained)


def _following_topic_sentence(blocks: "list[book_ir.Block]", i: int) -> "str | None":
    """The topic sentence for the heading at blocks[i]: the first sentence of the first PARA block after it,
    skipping inert DIRECTIVE markers (a `<!-- index-def -->` glued under a heading). None if the heading is
    followed by a float/list/code/heading with no intervening paragraph — the O2 finding."""
    j = i + 1
    while j < len(blocks) and blocks[j].kind is book_ir.BlockKind.DIRECTIVE:
        j += 1
    if j < len(blocks) and blocks[j].kind is book_ir.BlockKind.PARA:
        return first_sentence(blocks[j].raw)
    return None


def _section_points(blocks: "list[book_ir.Block]", i: int) -> "list[PointRow]":
    """The canonical points under the heading at blocks[i]: every `point` DIRECTIVE from just after the
    heading up to (but not including) the NEXT heading. Document-order pairing — a decorator belongs to the
    most-recent heading before it. An un-drained section returns an empty list (falls back to topic-sentence
    behavior in the outline)."""
    points: "list[PointRow]" = []
    j = i + 1
    while j < len(blocks) and blocks[j].kind is not book_ir.BlockKind.HEADING:
        b = blocks[j]
        if b.directive == "point" and b.point_slug and b.point_text is not None:
            points.append(PointRow(slug=b.point_slug, text=b.point_text, block_index=b.index))
        j += 1
    return points


def chapter_preamble_points(include_appendices: bool = False) -> "dict[str, list[PointRow]]":
    """Per chapter slug, the canonical points that head a paragraph BEFORE the chapter's first heading — a
    chapter opener that belongs to no section. Empty (absent) for an un-drained chapter. Kept separate from
    `heading_rows` so the outline can attach them at chapter scope, not force them onto a section."""
    doc = book_ir.parse_book(include_appendices=include_appendices)
    out: "dict[str, list[PointRow]]" = {}
    for c in doc.chapters:
        pts: "list[PointRow]" = []
        for b in c.blocks:
            if b.kind is book_ir.BlockKind.HEADING:
                break  # reached the first heading — the rest belong to sections
            if b.directive == "point" and b.point_slug and b.point_text is not None:
                pts.append(PointRow(slug=b.point_slug, text=b.point_text, block_index=b.index))
        if pts:
            out[c.slug] = pts
    return out


def heading_rows(include_appendices: bool = False) -> list[HeadingRow]:
    """Every narrative heading (H2–H4; the H1 chapter title is rendered separately by the build and is not a
    block) as a typed row with its stable id, id-source, topic sentence, and — for a DRAINED section — the
    canonical points its `<!-- point: … -->` decorators induce. The outline view's raw material. Derived
    fresh from `book_ir.parse_book()` on every call — never snapshotted (DESIGN §4).

    A worked-examples gallery's `### Example — <name>` heads are DIRECTIVE SYNTAX, not narrative L3 sections:
    the block between a `<!-- worked-examples: KEY -->` open marker and the `<!-- worked-examples-end -->`
    close marker is skipped whole, so the gallery's example-heads never become sections (and so never draw a
    spurious O2 'no topic sentence' / O3 / O4 finding). The close marker glues into the takeaway paragraph,
    so we detect it by raw-substring on any block, not by a standalone directive."""
    doc = book_ir.parse_book(include_appendices=include_appendices)
    rows: list[HeadingRow] = []
    for c in doc.chapters:
        in_worked_examples = False
        for i, b in enumerate(c.blocks):
            if b.kind is book_ir.BlockKind.DIRECTIVE and b.directive == "worked-examples":
                in_worked_examples = True
            if in_worked_examples:
                # The close marker glues onto the takeaway PARA's raw, so key off the substring, not a block.
                if b.raw and "worked-examples-end" in b.raw:
                    in_worked_examples = False
                continue  # everything from the open marker through the close marker is directive syntax
            if b.kind is not book_ir.BlockKind.HEADING:
                continue
            explicit_id, text = heading_id_and_text(b)
            rows.append(HeadingRow(
                chapter_slug=c.slug,
                part=c.part,
                level=b.heading_level,  # book_ir.Block.heading_level (B1 fixed — correct through marker-peel)
                heading_text=text,
                section_id=explicit_id or slugify(text),
                id_source="explicit" if explicit_id else "derived",
                topic_sentence=_following_topic_sentence(c.blocks, i),
                block_index=b.index,
                points=_section_points(c.blocks, i),
            ))
    return rows
