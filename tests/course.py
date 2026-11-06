"""Course module-page checks — the module-description model, enforced from a schema.

`course/module-schema.json` is the single source of truth for the shape of a lecture module page (the
Premise line, the framing paragraph, the sectioned model list). This check READS that schema at lint
time and applies each rule to every module page — so the model lives as DATA, not as prose a author must
remember, and a new predicate of an existing rule type is a schema edit, not a code change.

Stdlib only (the suite runs on a fresh checkout with nothing installed) — front matter is scanned with a
minimal line reader rather than PyYAML.
"""
from __future__ import annotations

import ast
import glob
import json
import os
import re
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile

from tests.common import FAIL, PASS, ROOT, rel

sys.path.insert(0, os.path.join(ROOT, "tools"))
import pptx_validate  # noqa: E402 — the tool owns the one OPC part-name resolver; this wraps it

#: A lecture module directory: a number-prefixed dir with an index.md under a `course/lectures/<act>/`
#: tree (e.g. `course/lectures/act-1-foundations/07-design/`). awesome-pages turns each into a sidebar
#: section whose label it takes from the dir's `.pages` `title:`.
_MODULE_INDEX_GLOB = "course/lectures/*/[0-9]*-*/index.md"
_PAGES_TITLE_RE = re.compile(r"^title:\s*(.+?)\s*$", re.M)
#: A hardcoded "NN " module-number prefix — no longer authored (the build hook derives the ordinal from
#: the directory name), so its reappearance in a stored title is itself the finding.
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


def check_course_front_matter_parses():
    """Every course page's front matter is parseable YAML — specifically, no unquoted colon-space.

    WHY THIS EXISTS. On 261029 a unit title was retitled to `Agentic technical debt: Architecture
    and supply chains` and written unquoted. YAML reads the second colon as a nested mapping, the
    block fails to parse, and MkDocs renders the ENTIRE front matter as body text — the readings
    YAML lands on the published page as literal prose. A second, older instance was found the same
    day in `Course in Review: Engineering Controlled Change`.

    What makes it worth a check rather than care: the page still LOOKS populated, so every existing
    gate passed on it. validate was clean, the full tier1 suite was green, CI was green, and a
    live-page fetch confirmed the title, premise and readings were present — all true, because they
    were present as text. Nothing asked whether the block parses. It reached the published site.

    Scope is deliberately this one failure, not YAML validity in general: gc is stdlib-only (no
    pyyaml), and colon-space in an unquoted scalar is the whole observed class. Quoted values, block
    scalars, and URLs (`://`, no space) are all fine and must not be flagged."""
    pages = sorted(glob.glob(os.path.join(ROOT, "course/**/*.md"), recursive=True))
    if not pages:
        return FAIL, ["course front-matter: no pages matched — tree moved"]
    issues: list[str] = []
    for page in pages:
        front, _ = _split_front_matter(open(page, encoding="utf-8").read())
        if not front:
            continue
        for n, line in enumerate(front.split("\n"), start=2):  # +2: the opening `---` is line 1
            m = re.match(r"^(\s*-?\s*)([A-Za-z_][\w-]*):\s+(.+?)\s*$", line)
            if not m:
                continue
            value = m.group(3)
            if value[:1] in "\"'|>[{#":        # quoted, block scalar, flow collection, comment
                continue
            if ": " in value:
                issues.append(f"{rel(page)}:{n}: unquoted `{m.group(2)}:` value contains a "
                              f"colon-space, which YAML reads as a nested mapping — quote it. "
                              f"Value: {value[:60]}")
    return (FAIL if issues else PASS), issues


def check_course_nav_titles():
    """Every lecture module directory must carry a `.pages` file whose nav `title:` is capitalized.

    awesome-pages derives a section's sidebar label from its directory's `.pages` `title:`, and falls
    back to the directory name (lowercased, hyphens → spaces) when the file is absent — which is exactly
    how `07-design` shipped in the navbar as "07 design" instead of "07 Design". This check requires the
    `.pages` to exist and its title to begin with an uppercase letter, so a missing file or a lowercase
    label cannot reach the published nav.

    It inspects the STORED title, not the rendered one. The stored title is now the LABEL alone — the
    unit's ordinal is derived from its `NN-` directory prefix at build time (site/hooks/
    course_nav_numbering.py) — so the label's own first character is the thing to test. Requiring an
    uppercase LETTER (not merely the first alphabetic character anywhere in the string) also rejects a
    re-hardcoded "03 " prefix, the duplication the numbering hook removed: a leading digit fails here
    rather than rendering as "03 03 Alignment"."""
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
        label = m.group(1).strip().strip("\"'")
        if _NUM_PREFIX_RE.match(label):
            issues.append(f"{rel(pages)}: nav title {label!r} hardcodes the unit number — the ordinal is "
                          "derived from the `NN-` directory prefix at build time, so storing it here "
                          "duplicates the fact and renders twice. Keep the label only (e.g. 'Alignment')")
        elif not label[:1].isupper():
            issues.append(f"{rel(pages)}: nav title {label!r} is not capitalized — the label should "
                          "begin with an uppercase letter (e.g. 'Design', not 'design')")
    return (FAIL if issues else PASS), issues


#: A `nav:` block entry in a `.pages` file — the indented `- <entry>` lines under the key.
_PAGES_NAV_ITEM_RE = re.compile(r"^\s+-\s+(.+?)\s*$")
#: awesome-pages' rest token: "everything not named explicitly, in natural sort order".
_REST_TOKEN = "..."


def _pages_nav_entries(pages_path: str) -> "list[str] | None":
    """The act `.pages` `nav:` block entries, or None when the file declares no `nav:` key.

    None means auto-discovery — awesome-pages lists every child. Stdlib line reader (the suite runs on a
    fresh checkout with nothing installed), anchored to the block-list spelling the act files use."""
    if not os.path.exists(pages_path):
        return None
    lines = open(pages_path, encoding="utf-8").read().splitlines()
    for i, ln in enumerate(lines):
        if re.match(r"^nav:\s*$", ln):
            entries: list[str] = []
            for follower in lines[i + 1:]:
                m = _PAGES_NAV_ITEM_RE.match(follower)
                if not m:
                    break
                entries.append(m.group(1).strip().strip("\"'"))
            return entries
    return None


def check_course_act_nav_covers_every_unit():
    """BLOCKING. Every lecture-unit directory under an act reaches that act's built nav.

    awesome-pages auto-discovers an act's children, but an explicit `nav:` allowlist in the act's
    `.pages` OVERRIDES discovery — so a unit absent from the allowlist is authored, built, and served,
    yet invisible in the sidebar. `03-alignment` shipped that way for four days: a hand-grown act
    allowlist gained `04`, then `01`, then `02`, and nobody went back for `03`.

    The acts now pin `index.md` and delegate the rest to the `...` token, so this check passes
    trivially today. It exists for the reintroduction: the moment someone re-enumerates an act's units
    by hand and forgets one, the omission fails here instead of shipping.

    Stdlib twin of the awesome-pages rule (mkdocs lives in the site-only toolchain): a bare `...` covers
    every child not named explicitly. Any other entry counts as a literal name, so an unrecognized
    rest-glob spelling fails loud rather than passing silently."""
    acts = sorted(d for d in glob.glob(os.path.join(ROOT, "course", "lectures", "act-*")) if os.path.isdir(d))
    if not acts:
        return FAIL, ["course act-nav: no course/lectures/act-* directories matched — the lectures tree "
                      "moved; the check would silently pass over an empty set otherwise"]
    issues: list[str] = []
    units_seen = 0
    for act in acts:
        units = sorted(d for d in glob.glob(os.path.join(act, "*"))
                       if os.path.isfile(os.path.join(d, "index.md")))
        units_seen += len(units)
        entries = _pages_nav_entries(os.path.join(act, ".pages"))
        if entries is None or _REST_TOKEN in entries:
            continue  # auto-discovery (no `nav:`, or the rest token) — every unit is reachable
        listed = set(entries)
        for unit in units:
            if os.path.basename(unit) not in listed:
                issues.append(
                    f"{rel(unit)}: authored but absent from {rel(os.path.join(act, '.pages'))}'s `nav:` "
                    f"allowlist — an explicit list overrides awesome-pages discovery, so this unit "
                    f"builds and serves but never appears in the sidebar. Add it, or replace the "
                    f"enumeration with `- ...` so units are discovered.")
    if not units_seen:
        return FAIL, ["course act-nav: no lecture-unit directories (act-*/<dir>/index.md) found — the "
                      "unit layout moved; the check would silently pass otherwise"]
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


# ── MAGE book-reference token integrity (MAGE-TOKEN) ─────────────────────────────────────────────────
#: The site hook's exact token grammar (site/hooks/readings.py `_MAGE_TOKEN`) — mirrored, not imported:
#: the hook lives in the mkdocs-only toolchain and this suite stays stdlib clone-and-run.
_MAGE_TOKEN_RE = re.compile(r"\{mage:(\d+(?:\.\d+)?)\}")
_CHAPTER_TITLE_RE = re.compile(r"<!--\s*chapter-title:\s*.+?\s*-->")
_CHAPTER_FILE_RE = re.compile(r"(\d+(?:\.\d+)?)-.+\.md$")


def _mage_resolvable_sections() -> "set[str]":
    """Section numbers a `{mage:N.M}` token can resolve to: every `book/part*/N.M-*.md` that carries a
    `<!-- chapter-title: -->` marker — the same predicate the site build's resolver applies."""
    nums: set[str] = set()
    for f in glob.glob(os.path.join(ROOT, "book", "part*", "*.md")):
        m = _CHAPTER_FILE_RE.match(os.path.basename(f))
        if m and _CHAPTER_TITLE_RE.search(open(f, encoding="utf-8").read()):
            nums.add(m.group(1))
    return nums


def check_course_mage_tokens_resolve():
    """MAGE-TOKEN (BLOCKING; 0 findings at landing). Every `{mage:N.M}` token in a served markdown
    source resolves to an existing book chapter — `book/part*/N.M-*.md` carrying a chapter-title
    marker. The resolver that expands these tokens (site/hooks/readings.py) runs ONLY in CI's
    teach-site mkdocs step, so a book-side chapter renumbering that strands a course reading
    reference passes every local gate and dies on the Pages build (the stale `{mage:2.8}` after the
    Chapter 2 consolidation renamed 2.8 -> 2.5). This Tier-1 twin applies the resolver's own
    predicate at test time: glob the tokens, glob the chapters, diff the sets."""
    import catalog  # deferred: mirrors tests.common's use of the shared model without a load-time cycle

    sections = _mage_resolvable_sections()
    if not sections:
        return FAIL, ["mage-token: no book/part*/N.M-*.md carries a chapter-title marker — the book "
                      "tree or its marker grammar moved; the gate would silently pass otherwise"]
    prune = catalog.site_prune_dirs()
    issues: list[str] = []
    found = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in prune
                        and not catalog.is_native_build_path(os.path.join(dirpath, d))]
        for fn in filenames:
            if not fn.endswith(".md"):
                continue
            path = os.path.join(dirpath, fn)
            for i, ln in enumerate(open(path, encoding="utf-8").read().splitlines(), start=1):
                for m in _MAGE_TOKEN_RE.finditer(ln):
                    found += 1
                    if m.group(1) not in sections:
                        issues.append(f"{rel(path)}:{i}: {m.group(0)} resolves to no "
                                      f"book/part*/{m.group(1)}-*.md with a chapter-title marker — "
                                      f"repoint the reference or restore the chapter")
    if not found and not issues:
        return FAIL, ["mage-token: no {mage:N.M} tokens found in any served markdown — the course "
                      "readings moved or the token grammar changed; the gate would silently pass "
                      "otherwise"]
    return (FAIL if issues else PASS), issues


#: Predict-then-reveal deck exercises, declared as DATA. A slide asks students to anticipate a system's
#: failures; a LATER slide reveals what actually happened. The exercise tests TRANSFER — reasoning from a
#: method to an unfamiliar system — and leaking the outcome onto any earlier slide silently converts it
#: into RECALL. Nothing about the OOXML is wrong when that happens, so no validity check sees it, and the
#: damage is invisible until a room full of students has already read the answer.
#: Each entry: deck path -> (reveal-slide title prefix, outcome-detail phrases). The phrases are
#: OUTCOME detail only — never the system's description (the worksheet needs that) and never a lesson the
#: deck teaches earlier from a different incident.
_REVEAL_EXERCISES = {
    "course/lectures/act-2-delegation-and-control/04-failure-aware-engineering/"
    "2-4-Failure-Aware-Engineering.pptx": (
        "What actually happened?",
        # Deliberately NOT "no staged rollout": the deck establishes that lesson from CrowdStrike on
        # slide 7, six slides before Cloudflare is named. The first draft of this declaration included
        # it and the check refused the deck — the control correcting the declaration, which is the
        # order it should happen in.
        ("backtracking", "13:42", "14:07", "cpu exhaustion", "555 steps", "23 steps", "27 minutes"),
    ),
}

_A_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
_P_NS = "{http://schemas.openxmlformats.org/presentationml/2006/main}"
_R_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def _deck_slide_texts(fs_path: str) -> "list[str]":
    """Each slide's visible text in PRESENTATION order, one joined string per slide.

    Stdlib only (zipfile + ElementTree) — the suite runs on a fresh checkout. Two OOXML facts drive the
    shape: zip entry `slideN.xml` is a PART number, not a position, so order comes from presentation.xml's
    `<p:sldIdLst>` through the rels; and PowerPoint splits one sentence across arbitrarily many `<a:t>`
    runs, re-splitting them on every save, so runs are joined within each `<a:p>` before any comparison.
    A phrase straddling a run boundary is invisible to a per-run scan.

    A third fact, learned the hard way: a relationship `Target` is not a path fragment to prefix. It may
    be package-root-ABSOLUTE, and `ada-tool deck-slide insert` writes that form for every slide it adds,
    so resolution goes through the one OPC part-name resolver rather than string arithmetic here — see
    `pptx_validate.resolve_part`."""
    with zipfile.ZipFile(fs_path) as z:
        rels = ET.fromstring(z.read("ppt/_rels/presentation.xml.rels"))
        target = {r.get("Id"): r.get("Target") for r in rels}
        order = [target[e.get(f"{_R_NS}id")]
                 for e in ET.fromstring(z.read("ppt/presentation.xml")).iter(f"{_P_NS}sldId")]
        texts = []
        for t in order:
            part = pptx_validate.resolve_part("ppt", t)
            paras = [
                "".join(n.text or "" for n in p.iter(f"{_A_NS}t"))
                for p in ET.fromstring(z.read(part)).iter(f"{_A_NS}p")
            ]
            texts.append(" ".join(x for x in paras if x.strip()))
    return texts


def check_course_reveal_not_leaked():
    """REVEAL-LEAK (BLOCKING; 0 findings at landing). For each declared predict-then-reveal deck
    exercise, no outcome-detail phrase appears on any slide BEFORE the reveal slide.

    Three preconditions fail loudly rather than returning a clean verdict, because each of them, left
    unasserted, makes the check pass over a deck it is no longer reading: the deck must exist at the
    declared path; the reveal title must match exactly one slide; and every declared phrase must appear
    ON that reveal slide. The last is the anti-vacuity assert — a phrase the deck has since reworded
    protects nothing, and silent decay is the failure mode a pedagogical invariant is most prone to,
    since no reader of the OOXML can tell a retired phrase from a working one."""
    issues: list[str] = []
    for disp, (title, phrases) in sorted(_REVEAL_EXERCISES.items()):
        fs_path = os.path.join(ROOT, disp)
        if not os.path.exists(fs_path):
            issues.append(f"reveal-leak: {disp} is declared but absent — repoint the declaration or "
                          f"drop it; the gate would silently pass otherwise")
            continue
        slides = _deck_slide_texts(fs_path)
        at = [i for i, s in enumerate(slides) if s.lstrip().startswith(title)]
        if len(at) != 1:
            issues.append(f"reveal-leak: {disp}: reveal title {title!r} matches {len(at)} slides "
                          f"(need exactly 1) — the deck was retitled; re-anchor the declaration")
            continue
        reveal = at[0]
        body = slides[reveal].lower()
        for ph in phrases:
            if ph not in body:
                issues.append(f"reveal-leak: {disp}: declared phrase {ph!r} is absent from the reveal "
                              f"slide {reveal + 1} — it was reworded, so it now guards nothing; "
                              f"update the declaration to the deck's current wording")
        for i in range(reveal):
            early = slides[i].lower()
            for ph in phrases:
                if ph in early:
                    issues.append(f"reveal-leak: {disp}: slide {i + 1} states {ph!r}, revealed on "
                                  f"slide {reveal + 1} — students read the outcome before predicting "
                                  f"it, which turns a transfer exercise into recall")
    return (FAIL if issues else PASS), issues


#: A three-slide package whose `presentation.xml.rels` names its slides in all three OPC target forms —
#: root-absolute, source-relative, parent-relative — one form per slide, so a resolver that handles only
#: some of them fails on an identifiable slide rather than ambiguously. Built in a temp dir, never written
#: into the tree: pinning this on a real deck's current rels would make the pin decay silently the first
#: time PowerPoint re-saves that deck and normalizes the absolute form away.
_TARGET_FORM_FIXTURE = (
    ("/ppt/slides/slide1.xml", "ABSOLUTE FORM"),       # what `ada-tool deck-slide insert` writes
    ("slides/slide2.xml", "RELATIVE FORM"),            # what PowerPoint writes
    ("../ppt/slides/slide3.xml", "PARENT RELATIVE"),   # legal, and normalizes back into `ppt/`
)


def _write_target_form_deck(path: str, targets: "list[tuple[str, str]]") -> None:
    """A minimal readable package whose slide relationships use the given (Target, text) pairs."""
    rels = "".join(
        f'<Relationship Id="rId{i}" Target="{tgt}" Type="http://schemas.openxmlformats.org/'
        f'officeDocument/2006/relationships/slide"/>' for i, (tgt, _t) in enumerate(targets, 1))
    sld_ids = "".join(f'<p:sldId id="{255 + i}" r:id="rId{i}"/>' for i in range(1, len(targets) + 1))
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",
                   '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats'
                   '.org/package/2006/content-types"><Default Extension="rels" ContentType='
                   '"application/vnd.openxmlformats-package.relationships+xml"/><Default Extension='
                   '"xml" ContentType="application/xml"/></Types>')
        z.writestr("ppt/_rels/presentation.xml.rels",
                   '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas'
                   f'.openxmlformats.org/package/2006/relationships">{rels}</Relationships>')
        z.writestr("ppt/presentation.xml",
                   '<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="http://schemas'
                   '.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas'
                   '.openxmlformats.org/officeDocument/2006/relationships">'
                   f'<p:sldIdLst>{sld_ids}</p:sldIdLst></p:presentation>')
        for i, (_tgt, text) in enumerate(targets, 1):
            z.writestr(f"ppt/slides/slide{i}.xml",
                       '<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:p="http://schemas'
                       '.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas'
                       '.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody>'
                       f'<a:p><a:r><a:t>{text}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree>'
                       '</p:cSld></p:sld>')


def check_course_rel_targets_resolve_all_forms(strict: bool):
    """CONTROL (BLOCKING). The deck reader resolves an OPC relationship target in every form OPC
    allows — ABSOLUTE included — and still fails loudly on a target naming a part that is absent.

    The class this pins: a relationship `Target` is not a path fragment, and treating it as one
    (`"ppt/" + target`) is correct for exactly the one form PowerPoint happens to write. On 261106
    `ada-tool deck-slide insert` authored four section dividers into a course deck and wrote the
    ROOT-ABSOLUTE form for each — `/ppt/slides/slide30.xml` — whereupon the prefixing reader asked
    the package for `ppt//ppt/slides/slide30.xml`, raised `KeyError`, and took the whole Tier-1 gate
    red, blocking every push. The deck was valid throughout; the reader was wrong. Every deck that
    verb touches from here on carries the shape, so this is a standing property of the corpus rather
    than one deck's quirk.

    Both directions are asserted, because the cheap wrong fix to a `KeyError` is to swallow it: a
    target naming a part the package does not contain must STILL raise. A reader that silently drops
    unresolvable slides would turn the reveal-leak gate it feeds into a check over a subset of the
    deck, which passes for the wrong reason and says nothing.

    Stdlib, temp-dir, 78 ms measured. No dependency on any committed deck's rels — see the fixture."""
    issues: list[str] = []

    # Leg 1 — the resolver's own table, including the exact measured target.
    for base, target, want in (
            ("ppt", "/ppt/slides/slide30.xml", "ppt/slides/slide30.xml"),
            ("ppt", "slides/slide30.xml", "ppt/slides/slide30.xml"),
            ("ppt", "../ppt/slides/slide30.xml", "ppt/slides/slide30.xml"),
            ("ppt/slides", "../notesSlides/notesSlide4.xml", "ppt/notesSlides/notesSlide4.xml"),
            ("ppt/slides", "/customXml/item.xml", "customXml/item.xml")):
        got = pptx_validate.resolve_part(base, target)
        if got != want:
            issues.append(f"rel-target: resolve_part({base!r}, {target!r}) = {got!r}, expected {want!r}")

    # Leg 2 — the reader, end to end, over a package using one form per slide.
    with tempfile.TemporaryDirectory(prefix="rel-target-forms-") as td:
        deck = os.path.join(td, "forms.pptx")
        _write_target_form_deck(deck, list(_TARGET_FORM_FIXTURE))
        with zipfile.ZipFile(deck) as z:  # anti-vacuity: the fixture carries what it claims
            if b'Target="/ppt/slides/slide1.xml"' not in z.read("ppt/_rels/presentation.xml.rels"):
                return FAIL, ["rel-target: the fixture does not carry an absolute target — it would "
                              "pass against a prefixing reader, so it pins nothing"]
        want = [text for _tgt, text in _TARGET_FORM_FIXTURE]
        try:
            got = _deck_slide_texts(deck)
        except KeyError as exc:
            got, want_desc = None, ", ".join(t for t, _ in _TARGET_FORM_FIXTURE)
            issues.append(f"rel-target: the reader raised KeyError({exc}) over a package whose slide "
                          f"targets are {want_desc} — all three forms are valid OPC")
        if got is not None and got != want:
            issues.append(f"rel-target: the reader returned {got!r} over the three-form package, "
                          f"expected {want!r} (one slide per target form, in sldIdLst order)")

        absent = os.path.join(td, "absent.pptx")
        _write_target_form_deck(absent, [("/ppt/slides/slide1.xml", "PRESENT"),
                                         ("slides/slide404.xml", "ABSENT")])
        try:
            _deck_slide_texts(absent)
            issues.append("rel-target: the reader resolved a target naming a part the package does "
                          "not contain — an unresolvable slide must fail loudly, not vanish from the "
                          "list and leave the gates downstream reading a subset of the deck")
        except KeyError:
            pass

    return (FAIL if issues else PASS), issues


# ── unit manifests: the `labs:` / `exercises:` front matter and its inline pointers (MANIFEST) ────────
#: The two unit manifests and the fields an entry declares. A NUMBER is absent from both on purpose:
#: the hooks derive it from the entry's POSITION, so the section heading, the nav label and the inline
#: pointer always agree and reordering the list moves all three. An authored number would be a fourth
#: copy, free to disagree with the other three — which is why an unexpected field is a finding here.
_UNIT_MANIFESTS = {
    "labs": ("title", "slug", "about"),
    "exercises": ("title", "slug", "about"),
}
#: The hooks' own token grammars (site/hooks/labs.py `_LAB_TOKEN`, site/hooks/exercises.py
#: `_EXERCISE_TOKEN`) — mirrored, not imported: the hooks live in the mkdocs-only toolchain and this
#: suite stays stdlib clone-and-run.
_UNIT_TOKEN_RE = {
    "labs": re.compile(r"\{lab:([a-z0-9][a-z0-9-]*)\}"),
    "exercises": re.compile(r"\{exercise:([a-z0-9][a-z0-9-]*)\}"),
}
_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
#: A field name an author might reach for to number an entry by hand. Named so the finding can say why
#: it is refused rather than only that it is unexpected.
_AUTHORED_NUMBER_FIELDS = ("number", "n", "index", "ordinal", "num")
_HOOKS_CONFIG = os.path.join(ROOT, "site", "mkdocs.yml")
_EXERCISES_HOOK = os.path.join(ROOT, "site", "hooks", "exercises.py")
#: The rendered order of the appended tail sections IS the hook registration order in mkdocs.yml,
#: because every one of these hooks APPENDS its section to the page markdown. Stored as the contract so
#: a reordering has to change this line too.
_TAIL_HOOK_ORDER = ("hooks/labs.py", "hooks/exercises.py", "hooks/materials.py", "hooks/readings.py")


def _fm_manifest(front_matter: str, key: str) -> "list[dict[str, str]] | None":
    """A front-matter manifest block's entries, each as {field: first-line value}; None when absent.

    Minimal line reader (no PyYAML): the block is the lines indented under `<key>:`, each entry opening
    `  - <field>: …` and continuing `    <field>: …`. A field whose value opens a BLOCK SCALAR (`|`/`>`)
    swallows every more-indented line that follows, so prose inside an `about:` body cannot be misread as
    a field — which matters because a sentence can legitimately contain `Word: text`."""
    lines = front_matter.splitlines()
    try:
        start = next(i for i, ln in enumerate(lines) if re.match(rf"^{re.escape(key)}:\s*$", ln))
    except StopIteration:
        return None
    entries: list[dict[str, str]] = []
    scalar_indent: "int | None" = None
    for ln in lines[start + 1:]:
        if ln.strip() and not ln.startswith(" "):
            break                                        # a new top-level key ends the block
        indent = len(ln) - len(ln.lstrip())
        if scalar_indent is not None:
            if not ln.strip() or indent > scalar_indent:
                continue                                 # still inside the block scalar's body
            scalar_indent = None
        m = re.match(r"^\s{2}-\s+([A-Za-z_][\w-]*):\s*(.*?)\s*$", ln)
        if m:
            entries.append({})
        else:
            m = re.match(r"^\s{4,}([A-Za-z_][\w-]*):\s*(.*?)\s*$", ln)
        if not m or not entries:
            continue
        entries[-1][m.group(1)] = m.group(2).strip().strip("\"'")
        if m.group(2)[:1] in "|>":
            scalar_indent = indent
    return entries


def check_course_unit_manifests():
    """MANIFEST (BLOCKING; 0 findings at landing). Every lecture unit's `labs:` and `exercises:` front
    matter declares exactly the fields its hook reads, with a unique, token-grammar slug, and every
    inline `{lab:…}` / `{exercise:…}` pointer names a slug declared on ITS OWN page.

    Both hooks render one manifest into three places — a section heading, a nav child, and whatever
    inline pointers the prose carries — and all three take the entry's NUMBER from its position in the
    list. So the failures worth catching are an authored number (a fourth copy of a derived fact, free
    to disagree), a slug the token grammar cannot match, a repeated slug (two headings, one anchor, an
    ambiguous pointer), and a pointer to a slug that was renamed or removed. The hooks raise on most of
    these, but they run ONLY in CI's teach-site mkdocs step, so without this twin the first report is a
    red Pages build.

    Two preconditions fail loudly rather than returning a clean verdict: some page must declare each
    manifest, and some page must carry each token kind. A check that has stopped finding its own inputs
    reports an empty corpus as a clean one."""
    mods = sorted(glob.glob(os.path.join(ROOT, _MODULE_INDEX_GLOB)))
    if not mods:
        return FAIL, [f"unit-manifests: no module pages matched {_MODULE_INDEX_GLOB} — glob or tree "
                      "moved; the gate would silently pass over an empty set otherwise"]
    issues: list[str] = []
    declared_any = {key: 0 for key in _UNIT_MANIFESTS}
    tokens_any = {key: 0 for key in _UNIT_MANIFESTS}
    for page in mods:
        front, body = _split_front_matter(open(page, encoding="utf-8").read())
        for key, fields in _UNIT_MANIFESTS.items():
            entries = _fm_manifest(front, key)
            slugs: list[str] = []
            if entries is not None:
                declared_any[key] += len(entries)
                if not entries:
                    issues.append(f"{rel(page)}: `{key}:` is declared with no entries — drop the key, "
                                  f"since an absent manifest renders no section and an empty one is "
                                  f"indistinguishable from a manifest that failed to parse")
                for i, entry in enumerate(entries, start=1):
                    extra = sorted(set(entry) - set(fields))
                    numbered = [f for f in extra if f.lower() in _AUTHORED_NUMBER_FIELDS]
                    if numbered:
                        issues.append(f"{rel(page)}: {key} entry {i} declares {', '.join(numbered)} — "
                                      f"an entry's number is DERIVED from its position, so an authored "
                                      f"one is a second source of truth that a reorder breaks")
                    for f in extra:
                        if f.lower() not in _AUTHORED_NUMBER_FIELDS:
                            issues.append(f"{rel(page)}: {key} entry {i} declares unknown field {f!r} — "
                                          f"the hook reads {', '.join(fields)} and ignores the rest, so "
                                          f"this field's content never reaches the page")
                    for f in sorted(set(fields) - set(entry)):
                        issues.append(f"{rel(page)}: {key} entry {i} is missing {f!r} — the hook refuses "
                                      f"a partial entry rather than rendering an item nobody can use")
                    slug = entry.get("slug", "")
                    if slug and not _SLUG_RE.match(slug):
                        issues.append(f"{rel(page)}: {key} entry {i} slug {slug!r} is outside the token "
                                      f"grammar [a-z0-9][a-z0-9-]* — no inline pointer can name it")
                    if slug in slugs:
                        issues.append(f"{rel(page)}: {key} slug {slug!r} is declared twice — the anchor "
                                      f"and the pointer both key on it, so the repeat is unreachable")
                    slugs.append(slug)
            for m in _UNIT_TOKEN_RE[key].finditer(body):
                tokens_any[key] += 1
                if m.group(1) not in slugs:
                    issues.append(f"{rel(page)}: {m.group(0)} names no {key} entry on this page "
                                  f"(declared: {', '.join(slugs) or 'none'}) — a pointer resolves within "
                                  f"its own unit, so this one would fail the teach-site build")
            if key == "labs":
                for slug in slugs:
                    if slug and not os.path.isfile(os.path.join(ROOT, "course", "interactive", slug,
                                                                "index.html")):
                        issues.append(f"{rel(page)}: lab slug {slug!r} has no "
                                      f"course/interactive/{slug}/index.html — fix the slug, or add the "
                                      f"instrument before declaring the lab")
    for key, n in declared_any.items():
        if not n:
            issues.append(f"unit-manifests: no lecture unit declares `{key}:` — the manifest key or the "
                          f"front-matter shape moved; the gate would silently pass otherwise")
    for key, n in tokens_any.items():
        if not n:
            issues.append(f"unit-manifests: no lecture unit body carries a {key} pointer token — the "
                          f"token grammar moved, so the resolver half of this gate guards nothing")
    return (FAIL if issues else PASS), issues


def _exercises_hook_namespace() -> dict:
    """The EXERCISES hook's pure parts, exec'd in isolation — no mkdocs, no PyYAML.

    The hook imports `mkdocs.structure.nav` at module scope, which this stdlib suite cannot, so the
    rendering and token functions are selected out of the parsed source and executed on their own. That
    runs the SHIPPED code rather than a restatement of it, which is the whole value: a mirrored copy of
    the numbering rule would keep passing after the hook stopped obeying it."""
    want = {"anchor", "_exercises_section", "_resolve_tokens", "_EXERCISE_TOKEN"}
    with open(_EXERCISES_HOOK, encoding="utf-8") as fh:
        tree = ast.parse(fh.read(), filename=_EXERCISES_HOOK)
    selected = [n for n in tree.body
                if (isinstance(n, ast.FunctionDef) and n.name in want)
                or (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id in want
                                                      for t in n.targets))]
    namespace: dict = {"re": re}
    exec(compile(ast.Module(body=selected, type_ignores=[]), _EXERCISES_HOOK, "exec"), namespace)
    missing = sorted(want - set(namespace))
    if missing:
        raise AssertionError(f"exercises hook no longer defines {', '.join(missing)} — re-anchor this "
                             f"check on the hook's current shape rather than weakening it")
    return namespace


def check_course_exercises_hook_invariants():
    """EXERCISES-HOOK (BLOCKING; 0 findings at landing). Four invariants of the EXERCISES section, three
    exercised against the hook's own shipped code and one against its registration.

      - **Position-derived numbering.** The headings read Exercise 1..N in manifest order, and swapping
        two entries swaps their numbers. This is what lets a prose pointer stay correct through a
        reorder; the moment a number is read from anywhere but the position, it can disagree.
      - **An absent manifest renders nothing.** A unit whose deck is still settling declares no
        `exercises:` key, and must get no heading — not an empty section. Several units are in that
        state by design, so this is the common case, not the edge.
      - **A pointer resolves to its own heading's number.** The token and the heading are two renderings
        of one entry; a divergence sends a student to the wrong exercise, which no build error catches.
      - **Tail-section order.** Labs, Exercises, Materials, Readings — held by the hook REGISTRATION
        order in site/mkdocs.yml, since each hook appends. Nothing in the hooks themselves expresses
        the order, so reordering that list silently moves the section on every unit page."""
    issues: list[str] = []
    ns = _exercises_hook_namespace()
    section, resolve, anchor = ns["_exercises_section"], ns["_resolve_tokens"], ns["anchor"]

    entries = [{"title": f"Title {s}", "slug": s, "about": f"About {s}."} for s in ("alpha", "beta", "gamma")]
    for n, entry in enumerate(entries, start=1):
        head = f"### Exercise {n} — {entry['title']} {{#{anchor(entry['slug'])}}}"
        if head not in section(entries):
            issues.append(f"exercises-hook: rendered section lacks {head!r} — the heading number is no "
                           "longer the entry's position in the manifest")
    reordered = section(list(reversed(entries)))
    if f"### Exercise 1 — Title gamma {{#{anchor('gamma')}}}" not in reordered:
        issues.append("exercises-hook: reversing the manifest did not renumber the headings — a number "
                      "is being taken from somewhere other than the position")
    if section([]) != "":
        issues.append("exercises-hook: an empty manifest renders "
                      f"{section([])!r} — a unit that declares no exercises must render no section, not "
                      "an empty heading")
    for n, entry in enumerate(entries, start=1):
        slug = entry["slug"]
        got = resolve(f"see {{exercise:{slug}}}.", entries, "t")
        want = f"see [Exercise {n}](#{anchor(slug)})."
        if got != want:
            issues.append(f"exercises-hook: pointer to {slug!r} resolved to {got!r}, expected {want!r} — "
                          "the inline number and the heading number disagree")
    try:
        resolve("see {exercise:absent}.", entries, "t")
        issues.append("exercises-hook: a pointer to an undeclared slug resolved silently — a rotted "
                      "reference must stop the build rather than ship as a link to nothing")
    except ValueError:
        pass

    with open(_HOOKS_CONFIG, encoding="utf-8") as fh:
        config = fh.read()
    at = [(config.index(h), h) for h in _TAIL_HOOK_ORDER if h in config]
    if len(at) != len(_TAIL_HOOK_ORDER):
        issues.append(f"exercises-hook: site/mkdocs.yml registers only {len(at)} of the "
                      f"{len(_TAIL_HOOK_ORDER)} appending hooks — an unregistered hook renders nothing, "
                      f"and this check cannot see the order of a hook that is not there")
    elif [h for _, h in sorted(at)] != list(_TAIL_HOOK_ORDER):
        issues.append(f"exercises-hook: site/mkdocs.yml registers the appending hooks as "
                      f"{[h for _, h in sorted(at)]}, which renders the tail sections in that order; "
                      f"the contract is {list(_TAIL_HOOK_ORDER)}")
    return (FAIL if issues else PASS), issues
