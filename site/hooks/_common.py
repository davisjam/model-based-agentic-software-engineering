"""Shared helpers for the MkDocs build hooks (labs / exercises / materials / readings / modules).

Several hooks need to (a) recognize a lecture *module* page, (b) read a page's YAML front matter off disk,
(c) read a front-matter MANIFEST as a validated list of mappings, and (d) find the lecture-unit sections in
the nav so they can hang children under them. Keeping one copy of each here means the module-path shape,
the manifest contract, and the nav walk are defined once — a lockstep edit across several hooks (the drift
hazard) becomes a single edit.

`manifest`, `unit_index` and `nest_under_units` were extracted when the EXERCISES hook became the second
consumer of each: two copies of a validator is the point at which the copies start to diverge.
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


def manifest(meta: dict, key: str, fields: "tuple[str, ...]", where: str, declares: str) -> "list[dict]":
    """A front-matter manifest (`labs:`, `exercises:`) as a validated list of mappings; [] when absent.

    Malformed entries raise rather than render partially — an item nobody can reach is the failure these
    hooks exist to remove, and a silently dropped entry reintroduces it. A repeated slug raises for the
    same reason: the section anchor and the inline pointer both key on it, so a second entry under one
    slug makes every pointer to it ambiguous and the earlier anchor unreachable.

    `declares` closes the missing-field message by saying what an entry of this kind declares, which is
    the only part of the contract that differs between the two consumers."""
    raw = (meta or {}).get(key) or []
    if not isinstance(raw, list):
        raise ValueError(f"{key}: {where}: `{key}:` must be a list of mappings, "
                         f"got {type(raw).__name__}")
    out: list[dict] = []
    for i, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"{key}: {where}: entry {i} is {item!r} — expected a "
                             f"{{{', '.join(fields)}}} mapping")
        missing = [f for f in fields if not str(item.get(f) or "").strip()]
        if missing:
            raise ValueError(f"{key}: {where}: entry {i} is missing {', '.join(missing)} — {declares}")
        out.append({f: str(item[f]).strip() for f in fields})
    if "slug" in fields:
        seen: list[str] = []
        for entry in out:
            if entry["slug"] in seen:
                raise ValueError(f"{key}: {where}: slug {entry['slug']!r} is declared twice — the section "
                                 f"anchor and the inline pointer both key on the slug, so a repeat makes "
                                 f"a reference ambiguous")
            seen.append(entry["slug"])
    return out


def unit_index(section) -> "object | None":
    """A lecture unit's own index page, read off the nav section's children; None for any other section
    (the same `NN-<topic>/index.md` shape the nav-numbering hook and the readings guide recognize)."""
    for child in section.children:
        if child.is_page and child.file is not None and MODULE_RE.match(child.file.src_uri):
            return child
    return None


def nest_under_units(nav, nest) -> int:
    """Call `nest(index_page, section)` for every lecture-unit nav section; return what they report summed.

    Recurses BEFORE nesting, since the children a nester appends are Links that carry none of their own."""
    def walk(section) -> int:
        below = sum(walk(c) for c in section.children if c.is_section)
        index = unit_index(section)
        return below + (nest(index, section) if index is not None else 0)
    return sum(walk(item) for item in nav.items if item.is_section)
