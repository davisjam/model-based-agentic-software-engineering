"""MkDocs build hook — generate the 16-week at-a-glance table from lecture front matter.

No duplication: the schedule is DERIVED from each `reference-course/lectures/week-*.md` page's YAML
front matter (title, week, mage_readings), so adding a lecture updates the table automatically with no
edits to the schedule page or site config. The reference-course index page marks the injection point with
`<!-- SCHEDULE-TABLE -->`.
"""
from __future__ import annotations
import pathlib, re

_FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)


def _scalar(block: str, key: str) -> str:
    m = re.search(rf"^{key}:\s*(.*)$", block, re.M)
    return (m.group(1).strip().strip('"').strip("'") if m else "")


def _list(block: str, key: str) -> list[str]:
    """A tiny YAML block-list reader: `key:` followed by `  - item` lines (our front-matter convention)."""
    m = re.search(rf"^{key}:\s*(\[\])?\s*$\n((?:\s+-\s.*\n?)*)", block, re.M)
    if not m or m.group(1) == "[]":
        return []
    return [ln.strip()[2:].strip().strip('"').strip("'") for ln in m.group(2).splitlines() if ln.strip().startswith("- ")]


def _rows(docs_dir: pathlib.Path) -> list[tuple[int, str, str, str]]:
    out: list[tuple[int, str, str, str]] = []
    lect = docs_dir / "reference-course" / "lectures"
    for p in sorted(lect.glob("week-*.md")):
        m = _FM_RE.match(p.read_text())
        if not m:
            continue
        fm = m.group(1)
        wk = _scalar(fm, "week")
        if not wk.isdigit():
            continue
        title = _scalar(fm, "title") or p.stem
        title = re.sub(r"^Week\s+\d+:\s*", "", title)  # the table's own column carries the number
        readings = " · ".join(_list(fm, "mage_readings")) or "—"
        href = f"lectures/{p.stem}.md"  # source-relative; MkDocs rewrites to the final directory URL
        out.append((int(wk), title, readings, href))
    return sorted(out)


def _table(rows) -> str:
    head = "| Week | Topic | MAGE readings |\n|---:|---|---|\n"
    if not rows:
        return head + "| — | _no lecture pages yet_ | — |\n"
    body = "".join(f"| {wk} | [{title}]({href}) | {readings} |\n" for wk, title, readings, href in rows)
    return head + body


def on_page_markdown(markdown: str, *, page, config, files):
    if "<!-- SCHEDULE-TABLE -->" not in markdown:
        return markdown
    docs_dir = pathlib.Path(config["docs_dir"])
    return markdown.replace("<!-- SCHEDULE-TABLE -->", _table(_rows(docs_dir)))
