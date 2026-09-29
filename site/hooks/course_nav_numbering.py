"""MkDocs build hook — prepend a lecture unit's ordinal to its nav label, derived from its directory name.

A unit directory already carries its number (`03-alignment`). Writing that number a SECOND time into the
unit's `.pages` `title:` made one fact live in two places, so reordering or renumbering a unit silently
desynchronized the sidebar from the tree. The `.pages` now stores only the LABEL; this hook supplies the
number at build time, and the rendered nav reads exactly as before.

The number is derivable; the label is not. A unit's nav label may legitimately differ from its page title
— `01-engineering-and-genai` renders as "Engineering and GenAI" in the sidebar while the page itself is
titled "Engineering & GenAI" — so the label stays authored in `.pages` and only the ordinal is computed.

Scope: lecture-unit directories under `course/lectures/act-*/`. A directory whose name carries no leading
`NN-` prefix keeps its label unnumbered, and no other nav section is touched (the act titles themselves —
"Act II — Delegation and Control" — are authored content, not mechanically derivable from
`act-2-delegation-and-control`).
"""
from __future__ import annotations
import logging
import re

log = logging.getLogger(f"mkdocs.hooks.{__name__}")

#: A lecture unit: a `NN-<topic>` directory directly under an act. Matched against the src_uri of the
#: unit's own index page, the same shape site/hooks/_common.py's MODULE_RE recognizes.
_UNIT_INDEX_RE = re.compile(r"^lectures/act-[^/]+/(\d+)-[^/]+/index\.md$")


def _ordinal(section) -> "str | None":
    """The unit number for a nav section, read off its index page's directory prefix; None when the
    section is not a lecture unit (or its directory carries no `NN-` prefix)."""
    for child in section.children:
        if child.is_page and child.file is not None:
            m = _UNIT_INDEX_RE.match(child.file.src_uri)
            if m:
                return m.group(1)
    return None


def _number(section) -> int:
    n = _ordinal(section)
    if n is not None and section.title:
        section.title = f"{n} {section.title}"
    return (1 if n is not None else 0) + sum(_number(c) for c in section.children if c.is_section)


def on_nav(nav, *, config, files):
    numbered = sum(_number(item) for item in nav.items if item.is_section)
    log.info("course_nav_numbering: numbered %d lecture-unit nav label(s) from directory prefixes", numbered)
    return nav
