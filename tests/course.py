"""Course module-page checks — the module-description model, enforced from a schema.

`course/module-schema.json` is the single source of truth for the shape of a lecture module page (the
Premise line, the framing paragraph, the sectioned model list). This check READS that schema at lint
time and applies each rule to every module page — so the model lives as DATA, not as prose a author must
remember, and a new predicate of an existing rule type is a schema edit, not a code change.

Stdlib only (the suite runs on a fresh checkout with nothing installed) — front matter is scanned with a
minimal line reader rather than PyYAML.
"""
from __future__ import annotations

import glob
import json
import os
import re

from tests.common import FAIL, PASS, ROOT, rel

_SCHEMA_PATH = os.path.join(ROOT, "course", "module-schema.json")
#: A leading bold statement (`**…**`) or a leading italic question/phrase (`*…*`, not `**`). Bold is tried
#: first because `**bold**` also begins with `*`.
_LEADIN_RE = re.compile(r"^\s*(?:\*\*[^*].*?\*\*|\*[^*].*?\*)")
_LIST_ITEM_RE = re.compile(r"^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$")
_H2_RE = re.compile(r"^##\s+\S")


def _load_schema() -> dict:
    with open(_SCHEMA_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def _split_front_matter(text: str) -> "tuple[str, str]":
    """Return (front_matter, body). A page with no `---`-delimited front matter yields ("", text)."""
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    return (m.group(1), m.group(2)) if m else ("", text)


def _status(front_matter: str, key: str) -> "str | None":
    m = re.search(rf"^{re.escape(key)}:\s*(\S+)", front_matter, re.M)
    return m.group(1).strip().strip("\"'") if m else None


def _body_lines(body: str) -> "list[str]":
    return body.splitlines()


def _first_nonblank(lines: "list[str]") -> "str | None":
    for ln in lines:
        if ln.strip():
            return ln
    return None


def _first_section_idx(lines: "list[str]") -> int:
    for i, ln in enumerate(lines):
        if _H2_RE.match(ln):
            return i
    return len(lines)


def _list_blocks(lines: "list[str]") -> "list[list[str]]":
    """Contiguous runs of list-item *lead* lines (each item's first line). A blank line ends a block."""
    blocks: list[list[str]] = []
    cur: list[str] = []
    for ln in lines:
        m = _LIST_ITEM_RE.match(ln)
        if m:
            cur.append(m.group(1))
        elif not ln.strip():
            if cur:
                blocks.append(cur)
            cur = []
        # a non-blank, non-list line (e.g. an item's wrapped continuation) neither extends nor breaks the
        # run of item leads — we only collect the first line of each item, which is what carries the lead-in
    if cur:
        blocks.append(cur)
    return blocks


# ── rule evaluators: (rule, body, lines) -> list[str] of violation messages ──────────────────────────

def _rule_opening_line_regex(rule, body, lines):
    first = _first_nonblank(lines)
    if first is None or not re.search(rule["regex"], first):
        return [rule["message"]]
    return []


def _rule_paragraph_before_first_section(rule, body, lines):
    sec = _first_section_idx(lines)
    # a prose paragraph = a non-blank line that is not the premise opener, a heading, or a list item
    first_nb = _first_nonblank(lines)
    for ln in lines[:sec]:
        if not ln.strip() or ln is first_nb:
            continue
        if _H2_RE.match(ln) or _LIST_ITEM_RE.match(ln) or ln.startswith("#"):
            continue
        return []
    return [rule["message"]]


def _rule_min_sections(rule, body, lines):
    n = sum(1 for ln in lines if _H2_RE.match(ln))
    return [] if n >= rule.get("min", 1) else [rule["message"]]


def _rule_section_list_with_leadins(rule, body, lines):
    need = rule.get("min_items", 2)
    for block in _list_blocks(lines):
        if len(block) >= need and all(_LEADIN_RE.match(item) for item in block):
            return []
    return [rule["message"]]


def _rule_forbidden_line_regex(rule, body, lines):
    pat = re.compile(rule["regex"])
    if any(pat.search(ln) for ln in lines):
        return [rule["message"]]
    return []


_EVALUATORS = {
    "opening_line_regex": _rule_opening_line_regex,
    "paragraph_before_first_section": _rule_paragraph_before_first_section,
    "min_sections": _rule_min_sections,
    "section_list_with_leadins": _rule_section_list_with_leadins,
    "forbidden_line_regex": _rule_forbidden_line_regex,
}


def check_course_module_schema():
    """Validate every lecture module page against course/module-schema.json."""
    schema = _load_schema()
    fm = schema["front_matter"]
    status_key = fm["status_key"]
    status_enum = set(fm["status_enum"])
    enforce_when = set(fm["enforce_body_when_status_in"])
    pages = sorted(glob.glob(os.path.join(ROOT, schema["applies_to"]["path_glob"])))
    issues: list[str] = []
    if not pages:
        return FAIL, [f"course module-schema: no module pages matched {schema['applies_to']['path_glob']} "
                      "— glob or tree moved; schema can silently pass over an empty set otherwise"]
    for page in pages:
        r = rel(page)
        text = open(page, encoding="utf-8").read()
        front, body = _split_front_matter(text)
        status = _status(front, status_key)
        if status is None:
            issues.append(f"{r}: missing `{status_key}:` front-matter key (one of {sorted(status_enum)})")
            continue
        if status not in status_enum:
            issues.append(f"{r}: {status_key}={status!r} not in {sorted(status_enum)}")
        if status not in enforce_when:
            continue  # placeholder/draft: still an outline, body rules do not yet apply
        lines = _body_lines(body)
        for rule in schema["rules"]:
            ev = _EVALUATORS.get(rule["type"])
            if ev is None:
                issues.append(f"{r}: schema rule {rule['id']!r} has unknown type {rule['type']!r} "
                              "(no evaluator) — the schema references a rule the lint cannot apply")
                continue
            for msg in ev(rule, body, lines):
                issues.append(f"{r}: [{rule['id']}] {msg}")
    return (FAIL if issues else PASS), issues
