"""MkDocs build hook — resolve `{module:Exact Title}` tokens to a link to that lecture module page.

The calendar is the curriculum's visual table of contents. A topic that already has a module page should
link to it; a topic whose module has not been authored yet renders as plain text. Rather than hand-maintain
those links, a topic cell carries a `{module:<title>}` token and this hook resolves it from the module
pages themselves — each module's `title:` front matter is the single source of truth. So a link appears
automatically the moment a matching module lands, and never dangles before then.
"""
from __future__ import annotations
import os
import re

from _common import MODULE_RE, front_matter

_TOKEN = re.compile(r"\{module:([^}]+)\}")


def _module_index(files) -> dict:
    """Map a module page's `title` -> its source uri (the module's own front matter is the SSOT)."""
    idx: dict = {}
    for f in files:
        if MODULE_RE.match(f.src_uri):
            title = str(front_matter(f.abs_src_path).get("title") or "").strip()
            if title:
                idx[title] = f.src_uri
    return idx


def on_page_markdown(markdown: str, *, page, config, files):
    if "{module:" not in markdown:
        return markdown
    idx = _module_index(files)
    page_dir = os.path.dirname(page.file.src_uri)

    def repl(m: "re.Match") -> str:
        title = m.group(1).strip()
        src = idx.get(title)
        if not src:
            return title  # no module yet — plain text; the link appears once a module with this title lands
        rel = os.path.relpath(src, page_dir) if page_dir else src
        return f"[{title}]({rel})"

    return _TOKEN.sub(repl, markdown)
