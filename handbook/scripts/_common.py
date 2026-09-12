"""Shared helpers for the Handbook build and lint scripts.

The canonical manuscript is semantic Pandoc-flavored Markdown. Every chapter is parsed once by
Pandoc into its JSON AST — the typed intermediate representation both the linter and the renderers
work against. This module centralizes paths, metadata loading, and the Pandoc invocation so build.py
and lint.py cannot drift on how a chapter is read.

Requires: pandoc (>=3) on PATH, and PyYAML (for book.yaml). The renderers additionally need typst and
the project's mkdocs; see README.md for pinned versions.
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys

import yaml

HANDBOOK = pathlib.Path(__file__).resolve().parent.parent
GC_ROOT = HANDBOOK.parent
FONT_PATH = GC_ROOT / "book" / "fonts"  # reuse the MAGE book's self-hosted faces

CHAPTERS = HANDBOOK / "chapters"
FIGURES = HANDBOOK / "figures"
FILTERS = HANDBOOK / "filters"
BIB_DIR = HANDBOOK / "bibliography"
TYPST_SRC = HANDBOOK / "typst"
WEB_SRC = HANDBOOK / "web"
GENERATED = HANDBOOK / "generated"
DIST = HANDBOOK / "dist"

# The one reader format. Pandoc's `markdown` already enables fenced_divs, citations, and the
# header/inline/link attribute extensions we rely on.
PANDOC_FROM = "markdown"

# The closed semantic vocabulary (keep in sync with filters/handbook-components.lua CALLOUTS).
CALLOUT_BLOCKS = {
    "definition", "example", "case-study", "decision", "tradeoff", "warning", "note",
    "exercise", "code-example", "quotation", "key-idea", "mage-moment",
}
STRUCTURAL_BLOCKS = {"figure", "table"}
ESCAPE_BLOCKS = {"raw-typst", "raw-html"}
# The curated end-of-chapter reading list (keep in sync with handbook-components.lua READ_FURTHER).
# Both spellings are accepted; `read_further` is canonical.
READ_FURTHER_BLOCKS = {"read_further", "read-further"}
KNOWN_BLOCKS = CALLOUT_BLOCKS | STRUCTURAL_BLOCKS | ESCAPE_BLOCKS | READ_FURTHER_BLOCKS

ALLOWED_STATUS = {"outline", "draft", "review", "stable"}
REQUIRED_META = {"id", "title", "short_title", "order", "status", "description"}
# Front matter (Preface, etc.) is unnumbered and outside the chapter sequence, so it carries neither
# `order:` nor a `short_title:`. It still needs a stable `id`, a `title` for the rendered heading, and
# a `kind:` (which also drives the chapter-ending drift lint's exemption for non-chapter material).
REQUIRED_FRONTMATTER_META = {"id", "title", "kind"}

# Cross-reference prefixes (keep in sync with filters/crossrefs.lua CROSSREF_PREFIX). `ch` is the
# chapter-level cross-reference (@ch-<chapter-id>) used to link across chapters; it resolves to the
# chapter's opening, by the chapter's short title, in both renderers.
CROSSREF_PREFIXES = {"sec", "fig", "tbl", "def", "decision", "tradeoff", "ex", "example", "case", "note", "key", "ch"}


def die(msg: str) -> None:
    sys.stderr.write(f"error: {msg}\n")
    sys.exit(1)


def load_book() -> dict:
    with open(HANDBOOK / "book.yaml", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def chapter_files(book: dict) -> list[pathlib.Path]:
    return [HANDBOOK / rel for rel in book["chapters"]]


def frontmatter_entries(book: dict) -> list[dict]:
    """The book.yaml `frontmatter:` list (Preface, etc.); empty when the book declares none.

    Each entry is a map: `file` (path under the book root) and `views` (the projections it renders
    into). Returned as-is so callers can filter on `views` — the web projection ignores this list
    entirely, so front matter never leaks into the web edition."""
    return list(book.get("frontmatter", []))


def frontmatter_files(book: dict) -> list[pathlib.Path]:
    return [HANDBOOK / e["file"] for e in frontmatter_entries(book)]


def pandoc_ast(md_path: pathlib.Path) -> dict:
    """Parse a chapter to its Pandoc JSON AST — no filters, no citeproc. This is the source-level
    structure the linter inspects."""
    out = subprocess.run(
        ["pandoc", str(md_path), "-f", PANDOC_FROM, "-t", "json"],
        capture_output=True, text=True, check=False,
    )
    if out.returncode != 0:
        die(f"pandoc failed to parse {md_path.name}:\n{out.stderr}")
    return json.loads(out.stdout)


def meta_to_py(meta: dict) -> dict:
    """Flatten Pandoc's MetaValue tree into plain Python scalars/lists for the fields we validate."""
    def flat(node):
        t = node.get("t")
        c = node.get("c")
        if t in ("MetaString",):
            return c
        if t == "MetaBool":
            return bool(c)
        if t in ("MetaInlines", "MetaBlocks"):
            return _stringify(c)
        if t == "MetaList":
            return [flat(x) for x in c]
        if t == "MetaMap":
            return {k: flat(v) for k, v in c.items()}
        return _stringify(c) if c is not None else None

    return {k: flat(v) for k, v in meta.items()}


def _stringify(inlines) -> str:
    """Minimal inline→text for metadata and heading titles."""
    parts: list[str] = []

    def walk(node):
        if isinstance(node, list):
            for x in node:
                walk(x)
            return
        if not isinstance(node, dict):
            return
        t = node.get("t")
        c = node.get("c")
        if t == "Str":
            parts.append(c)
        elif t == "Space" or t == "SoftBreak" or t == "LineBreak":
            parts.append(" ")
        elif isinstance(c, list):
            walk(c)

    walk(inlines)
    return "".join(parts).strip()


def attrs_to_dict(attr_list) -> dict:
    """Pandoc attribute key/value pairs -> dict."""
    return {k: v for k, v in attr_list}


def bib_keys(bib_path: pathlib.Path) -> set[str]:
    """Citation keys defined in a BibTeX file (the @type{key, ... header line)."""
    import re
    keys: set[str] = set()
    text = bib_path.read_text(encoding="utf-8")
    for m in re.finditer(r"@\w+\s*\{\s*([^,\s]+)\s*,", text):
        keys.add(m.group(1))
    return keys
