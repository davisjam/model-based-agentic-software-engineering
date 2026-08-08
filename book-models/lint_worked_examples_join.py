"""LINT `worked-examples-join` — every gallery slot joins to the evidence, and the source mix is on target.

THE ANTI-FABRICATION INVARIANT (WE1).  A significant section closes with a Worked-Examples gallery bracketed
by `<!-- worked-examples: <construct-key> -->` … `<!-- worked-examples-end -->`, holding 2-4
`### Example — <Source>` mini-cases + a Takeaway. The roster PROJECTS from the industry-cases matrix; the
prose stays hand-authored. This lint holds the weld: every `industry-case` slot must rate its gallery's
construct-key at strength >= partial in `industry_cases_model.py`'s matrix (WE1), so a gallery cannot claim an
industry example the record does not support. A slot the author brace-tags `{other}` (a thought-experiment or
a near-miss contrast) is WE1-EXEMPT; a `{counter-example}` slot is the sanctioned below-partial opt-in (shown
AS a tension, deliberately). DocAble is the unconditional deepest slot.

WHAT IS MECHANICAL, WHAT IS AUDIT.  Two jobs:

  * JOIN (WE1 + WE2) — the construct-key resolves in the matrix (a construct column / a cross-case pattern /
    a ceiling rung); every `industry-case` slot's named source resolves to a case AND clears >= partial. These
    are deterministic joins over the model.
  * RATIO — the running book-aggregate source mix (industry / DocAble / other) against the 50/30/20 taste
    target. A ratio is a taste target, not a correctness invariant, so it PRINTS and never gates.

LANDING: AUDIT-ONLY-first (the repo's blocking-lint discipline).  Wave-0 lands the directive INERT — no real
section declares a gallery yet — so this lint finds 0 galleries today; `catalog.py validate` PRINTS the band
but does NOT increment its issue count. A later wave, after galleries are authored and a clean session
confirms the drain, flips WE1/WE2 to BLOCKING.

The lint imports nothing beyond the standard library and the sibling `industry_cases_model` — the same
clone-and-run posture as `catalog.py`.  Run `python3 book-models/lint_worked_examples_join.py` for the report
(`--strict` exits 1 on any finding; default exits 0 while AUDIT-ONLY).
"""
from __future__ import annotations

import pathlib
import re
import sys
from dataclasses import dataclass

import industry_cases_model as icm  # sibling; the matrix the gallery roster projects from + WE1 resolution

_HERE = pathlib.Path(__file__).resolve().parent
_BOOK = _HERE.parent / "book"

#: The gallery markers — the SSOT for these lives in `book/book_ir.py` (WEX_OPEN_RE / WEX_END_RE /
#: WEX_EXAMPLE_RE); mirrored here so the lint scans stdlib-standalone without importing the render tree.
_OPEN_RE = re.compile(r"^<!--\s*worked-examples:\s*([a-z0-9-]+)\s*-->\s*$", re.I)
_END_RE = re.compile(r"^<!--\s*worked-examples-end\s*-->\s*$", re.I)
_EXAMPLE_RE = re.compile(r"^#{3,4}\s+Example\s*[—–-]\s*(.+?)\s*$", re.I)
_TAG_RE = re.compile(r"^(?P<label>.*?)\s*\{(?P<tag>other|counter-example)\}\s*$", re.I)

#: The book-aggregate source mix the author steers toward (industry / DocAble / other). Report-only.
_RATIO_TARGET = icm.WE_RATIO_TARGET


@dataclass
class Slot:
    label: str            # display label, `{tag}` stripped
    tag: "str | None"     # "other" | "counter-example" | None
    line_no: int


@dataclass
class Gallery:
    page: str             # display path (relative to the repo root)
    key: str
    slots: "list[Slot]"
    line_no: int


def _chapter_files() -> "list[pathlib.Path]":
    """Every significant-section chapter file — the flat `book/part<N>/<N>.<M>-slug.md` markdown a gallery can
    live in (galleries close Parts 2-4 sections, but scan all parts so a stray gallery anywhere is caught)."""
    out: "list[pathlib.Path]" = []
    for part_dir in sorted(_BOOK.glob("part*")):
        if part_dir.is_dir():
            out.extend(sorted(part_dir.glob("*.md")))
    return out


def _scan_page(path: pathlib.Path) -> "list[Gallery]":
    """Scan one chapter for `<!-- worked-examples: KEY -->` … `<!-- worked-examples-end -->` galleries,
    collecting each gallery's key + its `### Example — <Source>` slots (with any `{tag}`)."""
    rel = str(path.relative_to(_BOOK.parent))
    galleries: "list[Gallery]" = []
    cur: "Gallery | None" = None
    for i, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        s = raw.strip()
        mo = _OPEN_RE.match(s)
        if mo:
            cur = Gallery(page=rel, key=mo.group(1), slots=[], line_no=i)
            galleries.append(cur)
            continue
        if _END_RE.match(s):
            cur = None
            continue
        if cur is not None:
            me = _EXAMPLE_RE.match(s)
            if me:
                label_raw = me.group(1)
                mt = _TAG_RE.match(label_raw)
                if mt:
                    cur.slots.append(Slot(mt.group("label").strip(), mt.group("tag").lower(), i))
                else:
                    cur.slots.append(Slot(label_raw.strip(), None, i))
    return galleries


def _org_index(model: "icm.IndustryCasesModel") -> "dict[str, str]":
    """A lowercased organization/id → case-id map, so a `### Example — Docker` head resolves to the record."""
    idx: "dict[str, str]" = {}
    for c in model.cases:
        idx[c.organization.strip().lower()] = c.id
        idx[c.id.strip().lower()] = c.id
    return idx


def _slot_type(slot: "Slot", org_idx: "dict[str, str]", docable_org: str) -> str:
    """Resolve a slot to its source type: explicit `{other}`/`{counter-example}` wins; else DocAble by name;
    else a known industry org/id → industry-case; else a free label → other (a thought-experiment)."""
    if slot.tag == "other":
        return "other"
    if slot.tag == "counter-example":
        return "counter-example"
    if slot.label.strip().lower() == docable_org.strip().lower():
        return "docable"
    if slot.label.strip().lower() in org_idx or slot.label.split()[0].strip().lower() in org_idx:
        return "industry-case"
    return "other"


def findings() -> "tuple[list[str], dict[str, int], list[Gallery]]":
    """The WE1/WE2 join findings + the running source-mix tally + the discovered galleries."""
    model = icm.derive_model()
    org_idx = _org_index(model)
    docable_org = model.docable_org
    tally = {"industry-case": 0, "docable": 0, "other": 0}
    out: "list[str]" = []
    galleries: "list[Gallery]" = []
    for path in _chapter_files():
        galleries.extend(_scan_page(path))
    for g in galleries:
        where = f"{g.page}:{g.line_no}"
        kind = icm.worked_example_key_kind(g.key, model)
        # WE2 — the construct-key resolves in the matrix (or is an unscored flagship, DocAble-led by design).
        if kind == "none":
            out.append(f"WE2 {where}: construct-key {g.key!r} resolves to no matrix construct/pattern/rung "
                       f"(unscored — the gallery must be DocAble/other-only; no industry slot can be verified)")
        n = len(g.slots)
        if n < 2 or n > 4:
            out.append(f"WE2 {where}: gallery {g.key!r} has {n} slot(s) (a gallery is 2-4 examples)")
        for slot in g.slots:
            st = _slot_type(slot, org_idx, docable_org)
            tally_key = "industry-case" if st in ("industry-case", "counter-example") else st
            tally[tally_key] = tally.get(tally_key, 0) + 1
            if st == "industry-case":
                case_id = org_idx.get(slot.label.strip().lower()) or org_idx.get(slot.label.split()[0].lower())
                if not case_id:
                    out.append(f"WE1 {g.page}:{slot.line_no}: slot {slot.label!r} names no industry record")
                elif not icm.worked_example_clears(g.key, case_id, model):
                    out.append(f"WE1 {g.page}:{slot.line_no}: {slot.label!r} does NOT clear >=partial on "
                               f"{g.key!r} ({kind}) — fabricated example; re-pick, move it, or tag it "
                               f"`{{other}}`/`{{counter-example}}`")
    return out, tally, galleries


def _ratio_line(tally: "dict[str, int]") -> str:
    total = sum(tally.values())
    if total == 0:
        return ("source mix: 0 slots across 0 galleries (directive INERT this wave) — "
                "target 50% industry / 30% DocAble / 20% other")
    parts = []
    for st, label in (("industry-case", "industry"), ("docable", "DocAble"), ("other", "other")):
        got = tally.get(st, 0)
        parts.append(f"{label} {got}/{total} ({100 * got / total:.0f}%; target {100 * _RATIO_TARGET[st]:.0f}%)")
    return "source mix: " + " · ".join(parts)


def main(argv: "list[str]") -> int:
    strict = "--strict" in argv[1:]
    out, tally, galleries = findings()
    print("== worked-examples-join — every gallery slot joins to the matrix (WE1/WE2 BLOCKING once galleries "
          "exist); source mix vs 50/30/20 (AUDIT-ONLY) ==")
    print(f"  AUDIT-ONLY (Wave-0, directive INERT): {len(galleries)} gallery/galleries scanned")
    print(f"  {_ratio_line(tally)}")
    if out:
        print(f"  {len(out)} join finding(s):")
        for f in out:
            print(f"    {f}")
    else:
        print("  join: clean — every industry slot clears >=partial on its construct-key (WE1); "
              "every key resolves (WE2)")
    return 1 if (strict and out) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
