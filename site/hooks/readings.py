"""MkDocs build hook — readings as a property of each module, plus an auto-generated Reading Guide.

A reading has pedagogical meaning in relation to the material it supports, so readings live on the
lecture/module page (Act → Module → {readings, slides}) rather than in a parallel readings/ hierarchy.
Front-matter shape:

    readings:
      before:
        - "MAGE — Part 1: The new engineering problem"
      groups:                       # named subheadings, for topics with several readings
        - heading: "Process models"
          items:
            - "Royce (1970), Managing the Development of Large Software Systems"
          note: "An optional contextual note rendered after this group's list."
      optional:
        - "Boehm, A Spiral Model of Software Development and Enhancement"

A reading may cite a MAGE book section with a `{mage:N.M}` token (e.g. `{mage:7.1} Davis, 2026. …`); the
token expands at build time to `[MAGE §N.M, "<chapter title>."](<book url>)`, with the title and URL read
from the book source — so a MAGE reference is a reference, never a hand-typed title that can drift.

Two renderings:
- On any page that declares `readings:`, append a **Readings** section (Before class / Optional).
- A `<!-- READING-GUIDE -->` marker (on the Calendar) is replaced with an auto-generated
  Module | Core reading | Additional reading table, aggregated from every module's front matter — so an
  adopter can see what to assign from the book without readings competing with lectures as the backbone.
"""
from __future__ import annotations
import functools
import glob
import json
import os
import re

import yaml  # MkDocs already depends on PyYAML

_GUIDE_MARKER = "<!-- READING-GUIDE -->"
#: A lecture module page: course/lectures/act-<name>/NN-<topic>.md (the numbered topic files).
_MODULE_RE = re.compile(r"^lectures/act-[^/]+/\d\d-[^/]+\.md$")

#: Reduce a markdown link to its text. The Reading Guide aggregates module readings onto the Calendar page;
#: a module-relative link (e.g. a hosted PDF under `materials/`) would not resolve from there, so the
#: summary table shows plain text and readers follow the live links on the module page itself.
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")


def _strip_links(s: str) -> str:
    return _MD_LINK_RE.sub(r"\1", s)

# ── MAGE book references (SSOT) ──────────────────────────────────────────────────────────────────────
# A reading cites a MAGE book section as `{mage:7.1}` rather than a hand-typed link. Its title and URL are
# RESOLVED at build time from the book itself — the chapter's `<!-- chapter-title: -->` marker and its file
# slug — so a reference can never drift from the book (the "wrong title baked in" bug). The published base
# URL comes from book-models/repo-metadata.json (pages_url), the same SSOT the book build uses.
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_BOOK_DIR = os.path.join(_REPO_ROOT, "book")
_MAGE_TOKEN = re.compile(r"\{mage:(\d+(?:\.\d+)?)\}")


@functools.lru_cache(maxsize=1)
def _book_base_url() -> str:
    path = os.path.join(_REPO_ROOT, "book-models", "repo-metadata.json")
    pages = json.load(open(path, encoding="utf-8"))["pages_url"].rstrip("/")
    return f"{pages}/book/"


@functools.lru_cache(maxsize=1)
def _mage_index() -> dict:
    """Map a book section number ("7.1") to (chapter_title, page_slug), read from the book source — the
    single source of truth for both a reference's title and its URL."""
    idx: dict = {}
    for f in glob.glob(os.path.join(_BOOK_DIR, "part*", "*.md")):
        base = os.path.basename(f)
        m = re.match(r"(\d+(?:\.\d+)?)-(.+)\.md$", base)
        if not m:
            continue
        num, slug = m.group(1), base[:-3]  # filename stem == published HTML slug
        try:
            text = open(f, encoding="utf-8").read()
        except OSError:
            continue
        tm = re.search(r"<!--\s*chapter-title:\s*(.+?)\s*-->", text)
        if tm:
            idx[num] = (tm.group(1).strip(), slug)
    return idx


def _resolve_mage(text: str) -> str:
    """Replace every `{mage:N.M}` token with a link to that book section, titled + located from the book."""
    def repl(m: "re.Match") -> str:
        num = m.group(1)
        entry = _mage_index().get(num)
        if entry is None:
            raise ValueError(f"readings: unknown MAGE section {{mage:{num}}} — no book/part*/{num}-*.md "
                             f"carries a chapter-title. Fix the reference or the book.")
        title, slug = entry
        return f'[MAGE §{num}, "{title}."]({_book_base_url()}{slug}.html)'
    return _MAGE_TOKEN.sub(repl, text)


def _readings_section(readings: dict) -> str:
    before = readings.get("before") or []
    groups = readings.get("groups") or []
    optional = readings.get("optional") or []
    if not before and not groups and not optional:
        return ""
    out = ["", "## Readings", ""]
    # A bold label needs a BLANK LINE before its bullet list, or Python-Markdown folds the `- item` lines
    # into the label's paragraph (readings crammed onto one line instead of one bullet each).
    if before:
        out.append("**Before class**")
        out.append("")
        out += [f"- {_resolve_mage(r)}" for r in before]
        out.append("")
    # `groups` renders each named subheading in the SAME grammar as before/optional — a bold label followed
    # by its bullet list — so a topic with several readings stays a plain reading list, just longer. An
    # optional per-group `note` prints as a paragraph after that group's bullets (e.g. a caveat).
    for g in groups:
        heading = (g.get("heading") or "").strip()
        items = g.get("items") or []
        note = (g.get("note") or "").strip()
        if heading:
            out.append(f"**{heading}**")
            out.append("")
        out += [f"- {_resolve_mage(r)}" for r in items]
        out.append("")
        if note:
            out.append(_resolve_mage(note))
            out.append("")
    if optional:
        out.append("**Optional / further reading**")
        out.append("")
        out += [f"- {_resolve_mage(r)}" for r in optional]
        out.append("")
    return "\n".join(out)


def _front_matter(abs_path: str) -> dict:
    try:
        text = open(abs_path, encoding="utf-8").read()
    except OSError:
        return {}
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return {}


def _reading_guide(files) -> str:
    rows = []
    for f in sorted(files, key=lambda x: x.src_uri):
        if not _MODULE_RE.match(f.src_uri):
            continue
        fm = _front_matter(f.abs_src_path)
        title = str(fm.get("title") or f.src_uri)
        readings = fm.get("readings") or {}
        # Core = before-class readings plus every grouped reading (flattened); additional = optional.
        core_items = list(readings.get("before") or [])
        for g in readings.get("groups") or []:
            core_items += g.get("items") or []
        core = " · ".join(_strip_links(_resolve_mage(r)) for r in core_items) or "—"
        add = " · ".join(_strip_links(_resolve_mage(r)) for r in readings.get("optional") or []) or "—"
        rows.append(f"| {title} | {core} | {add} |")
    if not rows:
        return "_No readings assigned yet._"
    return "| Module | Core reading | Additional reading |\n|---|---|---|\n" + "\n".join(rows)


def on_page_markdown(markdown: str, *, page, config, files):
    md = markdown
    readings = (page.meta or {}).get("readings")
    if isinstance(readings, dict):
        md = md + _readings_section(readings)
    if _GUIDE_MARKER in md:
        md = md.replace(_GUIDE_MARKER, _reading_guide(files))
    return md
