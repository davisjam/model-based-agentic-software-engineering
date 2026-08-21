"""LINT `paragraph-runs` — the wall-of-text sensor: unbroken runs of body paragraphs within one x.y.z section.

A chapter file is 'x.y'; each `##` within is a section 'x.y.z'. The book breaks a section below that with a
fourth-level `###` run-in heading (a new expository subtopic), a bold-lead paragraph, a list, a figure, or an
inset. A long run of PLAIN paragraphs with none of those is a wall the typography is hiding — the place a
`###` run-in belongs. This measures the longest such run in each section, as it RENDERS: invisible metadata
comments (`<!-- point: … -->`, `<!-- section-terms: … -->`, `<!-- label: … -->`) are transparent (they emit
nothing), while a `<!-- figure: … -->` / `<!-- table: … -->` renders and breaks the run.

TWO TIERS (per the author's rule):
  * WARN  — a run of >= WARN_RUN paragraphs. Audit-only: printed so the author sees the wall, does not gate.
  * BLOCK — a run of >= BLOCK_RUN paragraphs. Simply not readable; reddens validate — EXCEPT the Conclusion,
    whose closing peroration earns its unbroken short-paragraph cadence (exempt from BLOCK).

    python3 book-models/lint_paragraph_runs.py            # print WARN+BLOCK findings (audit view, exits 0)
    python3 book-models/lint_paragraph_runs.py --strict   # exit 1 if any BLOCK finding (the gate)
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent

WARN_RUN = 6          # > 5 paragraphs unbroken -> warn
BLOCK_RUN = 11        # > 10 paragraphs unbroken -> block (not readable)


def _chapter_files() -> list[pathlib.Path]:
    d = json.loads((HERE / "chapter_identity.json").read_text())

    def find(o):
        if isinstance(o, list):
            if any(isinstance(x, dict) and "filename" in x for x in o):
                return o
            for x in o:
                r = find(x)
                if r:
                    return r
        if isinstance(o, dict):
            for v in o.values():
                r = find(v)
                if r:
                    return r
        return None

    return [REPO / "book" / e["filename"] for e in find(d)]


def _is_conclusion(path: pathlib.Path) -> bool:
    return "conclusion/" in str(path).replace("\\", "/")


def _blocks(md: str) -> list[str]:
    out, cur = [], []
    for line in md.splitlines():
        if line.strip() == "":
            if cur:
                out.append("\n".join(cur))
                cur = []
        else:
            cur.append(line)
    if cur:
        out.append("\n".join(cur))
    return out


def _kind(block: str) -> str:
    first = block.lstrip().splitlines()[0] if block.strip() else ""
    if first.startswith("#"):
        return "heading"
    if first.startswith("<!--"):
        low = block.lower()
        if "<!-- figure:" in low or "<!-- table:" in low:
            return "figure"     # renders -> breaks a run
        return "meta"           # invisible metadata -> transparent
    if first.startswith(("- ", "* ", "> ", "|")):
        return "list"
    if first.startswith("[^"):
        return "footnote"
    if first.startswith("**"):
        return "bold-lead"
    if first.startswith("```") or first.startswith("    "):
        return "code"
    return "para"


class Finding:
    __slots__ = ("xy", "z", "heading", "run", "total", "block")

    def __init__(self, xy, z, heading, run, total, block):
        self.xy, self.z, self.heading, self.run, self.total, self.block = xy, z, heading, run, total, block


def findings() -> list[Finding]:
    out: list[Finding] = []
    for path in _chapter_files():
        if not path.exists():
            continue
        exempt = _is_conclusion(path)
        xy = path.stem.split("-")[0]
        sec = None
        z = 0
        run = max_run = total = 0

        def flush():
            if sec is not None and max_run >= WARN_RUN:
                out.append(Finding(xy, z, sec, max_run, total,
                                   block=(max_run >= BLOCK_RUN and not exempt)))

        for b in _blocks(path.read_text()):
            k = _kind(b)
            if k == "heading":
                hashes = len(b.lstrip().split(" ")[0])
                if hashes == 2:
                    flush()
                    sec = b.lstrip("# ").strip()
                    z += 1
                    run = max_run = total = 0
                elif hashes == 1:
                    flush()
                    sec = None
                    run = max_run = total = 0
                else:
                    run = 0     # ### run-in or deeper breaks the run
                continue
            if k == "meta":
                continue
            if sec is None:
                continue
            if k == "para":
                run += 1
                total += 1
                max_run = max(max_run, run)
            else:
                run = 0         # bold-lead / list / figure / footnote / code break the run
        flush()
    out.sort(key=lambda f: -f.run)
    return out


def summary_line(fs: list[Finding]) -> str:
    blocks = sum(1 for f in fs if f.block)
    warns = len(fs) - blocks
    return f"{blocks} BLOCK (>{BLOCK_RUN - 1}-paragraph) + {warns} WARN (>{WARN_RUN - 1}-paragraph) unbroken-run finding(s)"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--strict", action="store_true", help="exit 1 if any BLOCK finding (the gate)")
    args = ap.parse_args(argv)
    fs = findings()
    print(f"== paragraph-runs — unbroken body-paragraph runs within one x.y.z section "
          f"[WARN >={WARN_RUN}, BLOCK >={BLOCK_RUN}; Conclusion exempt from BLOCK] ==")
    if not fs:
        print("  clean — no section runs past the warn threshold")
        return 0
    print(f"  {summary_line(fs)}:\n")
    print(f"  {'tier':<6} {'run':>3} {'total':>5}  section")
    for f in fs:
        tier = "BLOCK" if f.block else ("warn*" if _is_conclusion_run(f) else "warn")
        print(f"  {tier:<6} {f.run:>3} {f.total:>5}  §{f.xy}.{f.z}  {f.heading}")
    if any(f.block for f in fs):
        return 1 if args.strict else 0
    return 0


def _is_conclusion_run(f: Finding) -> bool:
    return f.run >= BLOCK_RUN and not f.block   # a >=BLOCK run that is exempt (Conclusion)


if __name__ == "__main__":
    raise SystemExit(main())
