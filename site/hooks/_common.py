"""Shared helpers for the MkDocs build hooks (materials / readings / modules).

Both the readings hook and the modules hook need to (a) recognize a lecture *module* page and (b) read a
page's YAML front matter off disk. Keeping one copy here means the module-path shape is defined once — a
lockstep edit across two hooks (the drift hazard) becomes a single edit.
"""
from __future__ import annotations
import re

import yaml  # MkDocs already depends on PyYAML

#: A lecture module page: course/lectures/act-<name>/NN-<topic>/index.md — each module is its own
#: directory (holding index.md + slides/ + readings/), so the page is the directory's index.
MODULE_RE = re.compile(r"^lectures/act-[^/]+/\d\d-[^/]+/index\.md$")


def front_matter(abs_path: str) -> dict:
    """Parse a page's leading `---`-delimited YAML front matter; {} if absent or unreadable."""
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
