"""MkDocs build hook — readings as a property of each module, plus an auto-generated Reading Guide.

A reading has pedagogical meaning in relation to the material it supports, so readings live on the
lecture/module page (Act → Module → {readings, slides}) rather than in a parallel readings/ hierarchy.
Front-matter shape:

    readings:
      before:
        - "MAGE — Part 1: The new engineering problem"
      optional:
        - "Boehm, A Spiral Model of Software Development and Enhancement"

Two renderings:
- On any page that declares `readings:`, append a **Readings** section (Before class / Optional).
- A `<!-- READING-GUIDE -->` marker (on the Calendar) is replaced with an auto-generated
  Module | Core reading | Additional reading table, aggregated from every module's front matter — so an
  adopter can see what to assign from the book without readings competing with lectures as the backbone.
"""
from __future__ import annotations
import os
import re

import yaml  # MkDocs already depends on PyYAML

_GUIDE_MARKER = "<!-- READING-GUIDE -->"
#: A lecture module page: course/lectures/act-<name>/NN-<topic>.md (the numbered topic files).
_MODULE_RE = re.compile(r"^lectures/act-[^/]+/\d\d-[^/]+\.md$")


def _readings_section(readings: dict) -> str:
    before = readings.get("before") or []
    optional = readings.get("optional") or []
    if not before and not optional:
        return ""
    out = ["", "## Readings", ""]
    if before:
        out.append("**Before class**")
        out += [f"- {r}" for r in before]
        out.append("")
    if optional:
        out.append("**Optional / further reading**")
        out += [f"- {r}" for r in optional]
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
        core = " · ".join(readings.get("before") or []) or "—"
        add = " · ".join(readings.get("optional") or []) or "—"
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
