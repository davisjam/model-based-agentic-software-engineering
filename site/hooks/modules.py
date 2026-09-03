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

import yaml  # MkDocs already depends on PyYAML

_TOKEN = re.compile(r"\{module:([^}]+)\}")
#: A lecture module page: course/lectures/act-<name>/NN-<topic>/index.md — each module is its own
#: directory (holding index.md + slides/ + readings/), so the page is the directory's index.
_MODULE_RE = re.compile(r"^lectures/act-[^/]+/\d\d-[^/]+/index\.md$")


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


def _module_index(files) -> dict:
    """Map a module page's `title` -> its source uri (the module's own front matter is the SSOT)."""
    idx: dict = {}
    for f in files:
        if _MODULE_RE.match(f.src_uri):
            title = str(_front_matter(f.abs_src_path).get("title") or "").strip()
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
