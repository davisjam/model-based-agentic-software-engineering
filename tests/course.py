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

#: A lecture module directory: a number-prefixed dir with an index.md under a `course/lectures/<act>/`
#: tree (e.g. `course/lectures/act-1-foundations/07-design/`). awesome-pages turns each into a sidebar
#: section whose label it takes from the dir's `.pages` `title:`.
_MODULE_INDEX_GLOB = "course/lectures/*/[0-9]*-*/index.md"
_PAGES_TITLE_RE = re.compile(r"^title:\s*(.+?)\s*$", re.M)
#: Strip an optional leading "NN " module-number prefix so we test the first word of the actual label.
_NUM_PREFIX_RE = re.compile(r"^\d+\s+")

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


def _fm_scalar(front_matter: str, key: str) -> "str | None":
    """A whole-line scalar value (e.g. `title:` — which may contain spaces), quotes stripped."""
    m = re.search(rf"^{re.escape(key)}:\s*(.+?)\s*$", front_matter, re.M)
    return m.group(1).strip().strip("\"'") if m else None


def _fm_sessions(front_matter: str) -> "list[str] | None":
    """The `sessions:` block list (session titles), or None when the key is absent.

    Minimal line reader (no PyYAML): the items are the indented `- ...` lines directly under the
    `sessions:` key, ending at the first line that is not one."""
    lines = front_matter.splitlines()
    for i, ln in enumerate(lines):
        if re.match(r"^sessions:\s*$", ln):
            items: list[str] = []
            for follower in lines[i + 1:]:
                m = re.match(r"^\s+-\s+(.+?)\s*$", follower)
                if not m:
                    break
                items.append(m.group(1).strip().strip("\"'"))
            return items
        if re.match(r"^sessions:\s*\S", ln):
            return []  # inline form — unsupported; parity check reports it as malformed
    return None


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


_CALENDAR = os.path.join(ROOT, "course", "reference-course", "calendar.md")
_MODULE_TOKEN_RE = re.compile(r"\{module:([^}]+)\}")


def check_course_sessions_calendar_parity():
    """Declared `sessions:` lists agree with the reference calendar's `{module:…}` tokens.

    A multi-session module declares its session titles in front matter so the calendar's per-session
    tokens resolve to it (site/hooks/modules.py); the session COUNT is derived as the list's length.
    This check holds the join: a declared list must be >=2 unique non-empty titles, every declared
    session title must appear exactly once as a calendar token, the module's own title must not ALSO
    appear (the calendar lists a multi-session unit by its sessions, not twice over), and no two module
    pages may expose the same resolvable title (last-write-wins in the hook would silently mislink)."""
    cal_tokens = [t.strip() for t in _MODULE_TOKEN_RE.findall(open(_CALENDAR, encoding="utf-8").read())]
    counts: dict = {}
    for t in cal_tokens:
        counts[t] = counts.get(t, 0) + 1
    pages = sorted(glob.glob(os.path.join(ROOT, "course", "lectures", "act-*", "[0-9][0-9]-*", "index.md")))
    if not pages:
        return FAIL, ["course sessions-parity: no module pages matched — glob or tree moved"]
    issues: list[str] = []
    exposed: dict = {}  # resolvable title -> first page exposing it
    for page in pages:
        r = rel(page)
        front, _ = _split_front_matter(open(page, encoding="utf-8").read())
        title = _fm_scalar(front, "title")
        for t in filter(None, [title]):
            if t in exposed:
                issues.append(f"{r}: title {t!r} already exposed by {exposed[t]} — tokens would mislink")
            exposed[t] = r
        sessions = _fm_sessions(front)
        if sessions is None:
            continue
        if len(sessions) < 2 or any(not s for s in sessions) or len(set(sessions)) != len(sessions):
            issues.append(f"{r}: `sessions:` must be a block list of >=2 unique non-empty session titles "
                          f"(got {sessions!r}); a single-session module omits the key")
            continue
        for s in sessions:
            if s in exposed:
                issues.append(f"{r}: session title {s!r} already exposed by {exposed[s]} — tokens would mislink")
            exposed[s] = r
            n = counts.get(s, 0)
            if n != 1:
                issues.append(f"{r}: declared session {s!r} appears {n}x as a calendar {{module:…}} token "
                              f"(expected exactly 1) — sessions and {rel(_CALENDAR)} have drifted")
        if title and counts.get(title, 0):
            issues.append(f"{r}: module title {title!r} appears as a calendar token in addition to its "
                          f"declared sessions — the calendar should list the sessions only")
    return (FAIL if issues else PASS), issues


def check_course_lander_prose_word_band():
    """AUDIT-ONLY: a ready module description lands in its session-scaled prose-word band.

    The band is schema data (course/module-schema.json `sessions.per_session_prose_word_band`,
    750–1,000 words per session); a module's session count derives from its `sessions:` list (absent =
    1). Words = body after the front matter, whitespace-split — headings, tables, and figure lines
    included, matching the convention the landers were budgeted under. Audit-only per the
    first-landing discipline: several existing landers predate the band; promote once they are drained."""
    schema = _load_schema()
    lo_per, hi_per = schema["sessions"]["per_session_prose_word_band"]
    pages = sorted(glob.glob(os.path.join(ROOT, schema["applies_to"]["path_glob"])))
    if not pages:
        return FAIL, ["course word-band: no module pages matched — glob or tree moved"]
    issues: list[str] = []
    for page in pages:
        text = open(page, encoding="utf-8").read()
        front, body = _split_front_matter(text)
        if _status(front, schema["front_matter"]["status_key"]) != "ready":
            continue  # placeholder/draft: still an outline, no budget yet
        n_sessions = len(_fm_sessions(front) or []) or 1
        words = len(body.split())
        lo, hi = lo_per * n_sessions, hi_per * n_sessions
        if not lo <= words <= hi:
            issues.append(f"{rel(page)}: {words} prose words, outside the {n_sessions}-session band "
                          f"{lo}–{hi}")
    return (FAIL if issues else PASS), issues


def check_course_nav_titles():
    """Every lecture module directory must carry a `.pages` file whose nav `title:` is capitalized.

    awesome-pages derives a section's sidebar label from its directory's `.pages` `title:`, and falls
    back to the directory name (lowercased, hyphens → spaces) when the file is absent — which is exactly
    how `07-design` shipped in the navbar as "07 design" instead of "07 Design". This check requires the
    `.pages` to exist and its title, after an optional leading "NN " module-number prefix, to begin with
    an uppercase letter, so a missing file or a lowercase label cannot reach the published nav."""
    mods = sorted(glob.glob(os.path.join(ROOT, _MODULE_INDEX_GLOB)))
    if not mods:
        return FAIL, [f"course nav-titles: no module pages matched {_MODULE_INDEX_GLOB} — glob or tree "
                      "moved; the check would silently pass over an empty set otherwise"]
    issues: list[str] = []
    for idx in mods:
        d = os.path.dirname(idx)
        pages = os.path.join(d, ".pages")
        if not os.path.exists(pages):
            issues.append(f"{rel(d)}: no `.pages` file — the navbar label falls back to the lowercased "
                          "directory name (e.g. '07 design'); add `.pages` with a capitalized `title:`")
            continue
        m = _PAGES_TITLE_RE.search(open(pages, encoding="utf-8").read())
        if not m:
            issues.append(f"{rel(pages)}: no `title:` — awesome-pages will auto-title from the "
                          "lowercased directory name")
            continue
        title = m.group(1).strip().strip("\"'")
        label = _NUM_PREFIX_RE.sub("", title)
        first = next((ch for ch in label if ch.isalpha()), "")
        if first and not first.isupper():
            issues.append(f"{rel(pages)}: nav title {title!r} is not capitalized — the first word should "
                          "begin with an uppercase letter (e.g. 'Design', not 'design')")
    return (FAIL if issues else PASS), issues


# ── Reading citations — the course side of the bibliography subsystem (BIB-12) ───────────────────────
# A lander reading references a work by cite key (`- cite: <key>` in its readings front matter); the
# teach-site build projects the formatted citation from book/data/citations.json (site/hooks/readings.py).
# This gate holds the join from the course side: every key resolves in references.bib, and no lander
# carries a hand-written "Full citation:" sentence — the SSOT violation the key form replaced. The line
# reader is anchored to the block-mapping spelling the landers use (`- cite: <key>`); the hook's loud
# failure on an unknown key at site-build time backstops any spelling this reader misses.

_CITE_ITEM_RE = re.compile(r"^\s*-\s*cite:\s*(\S+)\s*$")


def iter_course_reading_cite_keys() -> "list[tuple[str, int, str]]":
    """Every `cite:` key referenced by a course-lander reading, as (page, line, key). Also consumed by
    the book-side CITE-ORPHAN audit, which counts a lander reference as a use of a .bib entry."""
    out: list[tuple[str, int, str]] = []
    for page in sorted(glob.glob(os.path.join(ROOT, _MODULE_INDEX_GLOB))):
        front, _ = _split_front_matter(open(page, encoding="utf-8").read())
        for i, ln in enumerate(front.splitlines(), start=2):  # +1 for the opening `---`
            m = _CITE_ITEM_RE.match(ln)
            if m:
                out.append((page, i, m.group(1).strip("\"'")))
    return out


def check_course_reading_citations():
    """BIB-12 (BLOCKING; drained to 0 at landing). (a) Every lander `cite:` key names an entry in
    book/references.bib — a rotted key must fail here, not at site-build time on a machine with the
    toolchain. (b) No lander front matter contains a hand-written "Full citation:" string — bibliographic
    fact is projected from the one backend, never re-authored as prose (the drift this subsystem
    removed). Non-empty rendering of every referenced entry is already held globally by CITE-NONEMPTY
    (BIB-10) over citations.json, and citations.json ⊇ bib keys by CITE-FRESH (BIB-6) — not re-checked
    here."""
    from tests.citations import _bib_keys  # deferred: avoids a module-import cycle with tests.citations
    keys = _bib_keys()
    issues: list[str] = []
    refs = iter_course_reading_cite_keys()
    for page, line, key in refs:
        if keys and key not in keys:
            issues.append(f"{rel(page)}:{line}: cite key {key!r} names no entry in book/references.bib")
    for page in sorted(glob.glob(os.path.join(ROOT, _MODULE_INDEX_GLOB))):
        front, _ = _split_front_matter(open(page, encoding="utf-8").read())
        for i, ln in enumerate(front.splitlines(), start=2):
            if "Full citation:" in ln:
                issues.append(f"{rel(page)}:{i}: hand-written 'Full citation:' prose — reference the "
                              f"work by key (`- cite: <key>` + annotation) so the citation is projected "
                              f"from book/references.bib, not re-authored per lander")
    if not refs and not issues:
        return FAIL, ["course reading-citations: no `cite:` references found in any lander — the "
                      "readings tree or item spelling moved; the gate would silently pass otherwise"]
    return (FAIL if issues else PASS), issues
