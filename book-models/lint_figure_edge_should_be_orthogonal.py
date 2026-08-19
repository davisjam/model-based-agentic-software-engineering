"""LINT `figure-edge-should-be-orthogonal` — a declared box-to-box edge should route orthogonally.

THE DEFECT CLASS. A curved or sloped connector between two boxes seats its arrowhead — and any mid-edge
glyph — at whatever angle its end tangent happens to hit the border. That angle is almost never the
border's perpendicular, so the head skims flat along the box edge and reads as landing *in* the node, not
*arriving at* it; a decision-gate glyph riding the diagonal tilts the same way. The dangling-edge sensor
proves an edge TOUCHES its nodes and (for a directed head) that the head points in; this one proves the
prior, stronger claim the house notation now defaults to: the ROUTE itself is orthogonal — a straight
horizontal/vertical segment when the two rects are axis-alignable, else a single right-angled elbow — so
heads and glyphs seat perpendicular by construction (the correct-by-construction fix the router applies).

WHAT IT FLAGS (declared edges only — `<!-- edge: SRC -> DST -->` / `.. -->`; un-annotated figures skipped):

  * **SLOPE-BETWEEN-ALIGNABLE.** The two rects share a vertical corridor (x-spans overlap and the boxes are
    stacked) or a horizontal corridor (y-spans overlap and the boxes sit side by side), yet the edge is drawn
    as a curve, a slope, or an elbow. It should be one straight axis-aligned segment.
  * **CURVE-SHOULD-ELBOW.** The rects are NOT axis-alignable (the edge must turn), yet it turns with a curve
    or a diagonal instead of a single right angle. It should be one orthogonal elbow.
  * **HEAD-NOT-PERPENDICULAR.** A directed head whose end-travel is not perpendicular to the border it enters
    (the geometric residue when neither route case above already fired) — the head skims the border.

THE OPT-OUT. A figure whose edges are DELIBERATELY diagonal — a decision-tree whose branch labels ride the
slope, a one-to-many fan an elbow would clutter — carries a standalone `<!-- edge-grammar: keep-angles -->`
marker; this sensor skips it wholesale, exactly as the router and the dangling-edge angle check do.

THE FIX. `python3 book-models/lint_figure_dangling_edge.py --orthogonalize <file.svg>` re-routes every
eligible edge; render-and-look confirms; `keep-angles` opts out the genuine exceptions.

LANDING: AUDIT-ONLY. It prints the book-wide offender set and returns 0 from the shared validator; it does
not gate. A new geometric sensor over a hand-authored corpus earns its blocking flip only after a fix-wave
drains the corpus to zero, so it lands audit-only first per the repo's blocking-lint discipline.

  python3 book-models/lint_figure_edge_should_be_orthogonal.py            # print offenders (audit-only, exits 0)
  python3 book-models/lint_figure_edge_should_be_orthogonal.py --strict   # exit 1 on any finding (the flip)
  python3 book-models/lint_figure_edge_should_be_orthogonal.py <file.svg> # check specific figure(s)
"""
from __future__ import annotations

import argparse
import os
import pathlib
import re
import sys
from dataclasses import dataclass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lint_figure_dangling_edge as _dedge  # noqa: E402 — sibling; reuse its node/edge parsing + geometry

HERE = pathlib.Path(__file__).resolve().parent
ASSETS = HERE.parent / "book" / "assets"

# Out-of-scope, matching the sibling figure sensors: decorative cover art + data charts (axis lines
# legitimately meet at non-perpendicular angles).
EXCLUDE_PREFIXES = ("cover", "velocity-")

_HEAD_TOL = 3.0     # degrees a directed head may deviate from the border normal (the sibling's _ANGLE_TOL)

# The drawn-shape classifier lives in the sibling router module so this sensor and the router's straights-only
# gate share ONE definition of "straight-v/straight-h/slope/curve/…" — the two can never disagree on which
# drawn edges are already correctly straight.
_classify = _dedge._classify


@dataclass
class Finding:
    svg: str
    edge: str
    kind: str      # SLOPE_ALIGNABLE | CURVE_TURN | HEAD_SKEW
    detail: str


def analyze(path: pathlib.Path) -> list:
    svg = open(path, encoding="utf-8").read()
    if "<!-- edge:" not in svg or _dedge._KEEP_ANGLES_RE.search(svg):
        return []                       # not adopted, or opted out of orthogonality
    nodes = _dedge._nodes(svg)
    findings: list = []
    for m in _dedge._EDGE_RE.finditer(svg):
        src, op, dst = m.group(1), m.group(2), m.group(3)
        if src not in nodes or dst not in nodes:
            continue
        drawable = m.group(0)[m.group(0).rfind("<"):]
        ep = _dedge._endpoints(drawable)
        if ep is None:
            continue
        label = f"{src} {op} {dst}"
        na, nb = nodes[src], nodes[dst]
        # Obstacle-aware alignability, shared verbatim with the router: two rects are straight-alignable only
        # when a straight corridor connects them AND clears every other node — a feedback/skip edge that would
        # run over an intervening box is NOT SLOPE_ALIGNABLE (it must route around), so the router leaves it for
        # a later pass and this sensor classifies it CURVE_TURN, never straightening it over the stack.
        obstacles = [_dedge._bounds(v) for k, v in nodes.items() if k not in (src, dst)]
        axis = _dedge._straight_axis(na, nb, obstacles)
        vertical_alignable = axis == "v"
        horizontal_alignable = axis == "h"
        shape = _classify(drawable)

        flagged = False
        if vertical_alignable and shape != "straight-v":
            findings.append(Finding(path.name, label, "SLOPE_ALIGNABLE",
                                    f"drawn {shape}; nodes share a vertical corridor — want a straight vertical"))
            flagged = True
        elif horizontal_alignable and shape != "straight-h":
            findings.append(Finding(path.name, label, "SLOPE_ALIGNABLE",
                                    f"drawn {shape}; nodes share a horizontal corridor — want a straight horizontal"))
            flagged = True
        elif not vertical_alignable and not horizontal_alignable and shape in ("curve", "slope", "nonortho-elbow"):
            findings.append(Finding(path.name, label, "CURVE_TURN",
                                    f"drawn {shape}; nodes are not axis-alignable — want a single right-angled elbow"))
            flagged = True

        if flagged:
            continue
        # HEAD-NOT-PERPENDICULAR — the residue: geometry looked orthogonal but a directed head still skims.
        a, b = ep
        drawable_start = m.start() + m.group(0).rfind("<")
        g_start, g_end = _dedge._enclosing_markers(svg, drawable_start)
        d_first = "marker-start" in drawable or g_start
        d_last = "marker-end" in drawable or g_end
        node_a, node_b = _dedge._seat_assignment(a, b, na, nb)
        for pt, node, directed, at_last, side in ((a, node_a, d_first, False, src),
                                                  (b, node_b, d_last, True, dst)):
            if not directed:
                continue
            trav = _dedge._travel(drawable, at_last)
            if trav is None:
                continue
            dev = _dedge._ang_between(trav, _dedge._aim(node, pt))
            if dev is not None and dev > _HEAD_TOL:
                findings.append(Finding(path.name, label, "HEAD_SKEW",
                                        f"head into {side} aims {dev:.0f} deg off the border normal"))
    return findings


def _in_scope(name: str) -> bool:
    return not name.startswith(EXCLUDE_PREFIXES)


def findings() -> list:
    out: list = []
    for svg in sorted(ASSETS.glob("*.svg")):
        if _in_scope(svg.name):
            try:
                out.extend(analyze(svg))
            except Exception:  # pragma: no cover — a parse hiccup must not mask other lints
                continue
    return out


def summary_line(fs: list) -> str:
    figs = len({f.svg for f in fs})
    return f"{len(fs)} non-orthogonal declared edge(s) across {figs} figure(s)"


def main(argv: list | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*", help="specific .svg files (default: all book/assets/*.svg in scope)")
    ap.add_argument("--strict", action="store_true", help="exit 1 on any finding (the blocking flip)")
    args = ap.parse_args(argv)
    if args.paths:
        fs: list = []
        for p in args.paths:
            try:
                fs.extend(analyze(pathlib.Path(p)))
            except Exception as e:  # pragma: no cover
                print(f"  [ERROR] {p}: {e}")
    else:
        fs = findings()
    mode = "STRICT (exit 1 on any finding)" if args.strict else "AUDIT-ONLY (prints, exits 0)"
    print(f"== figure-edge-should-be-orthogonal — declared edges route orthogonally over book/assets/*.svg "
          f"[{mode}] ==")
    print(f"  excluded: {', '.join(EXCLUDE_PREFIXES)}* · skips keep-angles + un-annotated figures")
    if not fs:
        print("  clean — every declared edge routes orthogonally (straight when alignable, else a right angle)")
        return 0
    print(f"  {summary_line(fs)}:")
    by: dict = {}
    for f in fs:
        by.setdefault(f.svg, []).append(f)
    for svg in sorted(by):
        print(f"    {svg}  ({len(by[svg])}):")
        for f in by[svg]:
            print(f"      [{f.kind}] {f.edge} — {f.detail}")
    return 1 if args.strict else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
