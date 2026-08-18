"""LINT `figure-dangling-edge` — every declared graph edge must physically terminate on its named nodes.

THE DEFECT CLASS. A node-edge diagram asserts relationships: an edge is a claim that two *named* things are
connected. When a connector terminates in open space, grazes a field, or merely "points toward" a node, the
claim is unverifiable and the figure misreads — the reader cannot tell what connects to what. The overflow,
font-band, occlusion, and label-collision sensors all watch TEXT; none watches whether an EDGE reaches its
endpoints. This closes that gap.

THE SCHEMA (opt-in per figure; see plugin/mage/skills/self-communicate/drawing/diagrams.md).
  * NODES carry a native SVG `id` — `<circle id="p1-assurance" cx cy r>` or a box `<rect id="p1-eng" x y w h>`.
    The element's geometry is the source of truth (no duplicated coordinates to drift).
  * EDGES are declared by an inert comment on the line BEFORE the drawable:
        <!-- edge: SRC -> DST -->     established (solid)
        <!-- edge: SRC .. DST -->     emerging   (dotted)
    ('->' not '--': the sequence "--" is illegal inside an XML comment.)
  * CONNECT GRAMMAR (default, strict). An edge's two endpoints must each land INSIDE their declared node
    (circle: dist <= r; box: within the rect), NOT merely graze its rim. Pair this with drawing edges
    UNDERNEATH the nodes and running each endpoint to the node CENTER: the node's opaque fill then caps the
    line end, so the edge plugs in with no floating gap at any angle. The failure this rejects is the endpoint
    that stops in the thin gap just OUTSIDE a hollow node — geometrically "near" but visibly floating, the
    "terminates in space" defect in a busy figure.
  * FLOAT-OK GRAMMAR (opt-in). A simpler figure may accept a line that stops a little short of its node. A
    figure carrying an "edge-grammar: float-ok" marker comment is checked with the looser rim/box + TOL slack
    instead. (Swoop/curve shape is never a defect here — a curved body is a stylistic choice, not a float.)

WHAT IT REPORTS: an endpoint that does not land inside its declared node under the figure's grammar
("declared target vs reality" divergence); an `edge:` comment naming an id the SVG does not define; a declared
edge whose paired drawable is missing.

SCOPE. Only figures that have adopted the schema (contain at least one `<!-- edge: ... -->` comment) are
checked; un-annotated figures are skipped, so adoption is incremental (H.9-1 first).

LANDING: AUDIT-ONLY. Prints findings and exits 0; it does not gate. Promote to blocking once the annotated
corpus reads clean (rule-#55-style AUDIT-ONLY-first). Usage:
  python3 book-models/lint_figure_dangling_edge.py                       # scan book/assets/*.svg (audit-only)
  python3 book-models/lint_figure_dangling_edge.py path/to/one.svg       # one file
"""
from __future__ import annotations

import glob
import math
import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ASSETS = os.path.normpath(os.path.join(_HERE, "..", "book", "assets"))
_TOL = 7.0  # px slack for the opt-in FLOAT-OK grammar only; the strict default requires 0 slack (inside)
_FIX_DOC = "plugin/mage/skills/self-communicate/drawing/diagrams.md (edge-terminates-on-named-node)"

_NUM = r"-?\d*\.?\d+(?:[eE][-+]?\d+)?"
_CIRCLE_RE = re.compile(r'<circle\b[^>]*\bid="([^"]+)"[^>]*>')
_RECT_RE = re.compile(r'<rect\b[^>]*\bid="([^"]+)"[^>]*>')
_ATTR = lambda tag, name: (m.group(1) if (m := re.search(rf'\b{name}="({_NUM})"', tag)) else None)
# an `edge:` comment, then (lazily) the next <line ...> or <path ... d="...">
_EDGE_RE = re.compile(
    r'<!--\s*edge:\s*([A-Za-z0-9_.-]+)\s*(->|\.\.)\s*([A-Za-z0-9_.-]+)\s*-->'
    r'.*?(?:<line\b[^>]*>|<path\b[^>]*\bd="[^"]*"[^>]*>)',
    re.S)
# the FLOAT-OK opt-out is a distinct standalone marker comment, matched whole so prose can't trip it
_FLOAT_OK_RE = re.compile(r'<!--\s*edge-grammar:\s*float-ok\s*-->')


def _nodes(svg: str) -> dict:
    """id -> ('circle', cx, cy, r) | ('rect', x, y, w, h). Reads geometry from the id-bearing element."""
    out = {}
    for m in re.finditer(r'<circle\b[^>]*>', svg):
        tag = m.group(0)
        i = re.search(r'\bid="([^"]+)"', tag)
        if not i:
            continue
        cx, cy, r = _ATTR(tag, "cx"), _ATTR(tag, "cy"), _ATTR(tag, "r")
        if None not in (cx, cy, r):
            out[i.group(1)] = ("circle", float(cx), float(cy), float(r))
    for m in re.finditer(r'<rect\b[^>]*>', svg):
        tag = m.group(0)
        i = re.search(r'\bid="([^"]+)"', tag)
        if not i:
            continue
        x, y, w, h = _ATTR(tag, "x"), _ATTR(tag, "y"), _ATTR(tag, "width"), _ATTR(tag, "height")
        if None not in (x, y, w, h):
            out[i.group(1)] = ("rect", float(x), float(y), float(w), float(h))
    return out


def _endpoints(tag: str) -> tuple | None:
    """The two endpoints of a <line> or <path>. Line: (x1,y1)-(x2,y2). Path: first M point + last point."""
    if tag.startswith("<line"):
        x1, y1, x2, y2 = (_ATTR(tag, a) for a in ("x1", "y1", "x2", "y2"))
        if None in (x1, y1, x2, y2):
            return None
        return ((float(x1), float(y1)), (float(x2), float(y2)))
    d = re.search(r'\bd="([^"]*)"', tag)
    if not d:
        return None
    nums = [float(n) for n in re.findall(_NUM, d.group(1))]
    if len(nums) < 4:
        return None
    return ((nums[0], nums[1]), (nums[-2], nums[-1]))


def _touches(pt: tuple, node: tuple, tol: float) -> bool:
    """True if pt lands on/inside `node` allowing `tol` px of external slack. Strict grammar passes tol=0
    (must be inside the disc / rect); float-ok passes tol=_TOL (a small graze outside the rim counts)."""
    px, py = pt
    if node[0] == "circle":
        _, cx, cy, r = node
        return math.hypot(px - cx, py - cy) <= r + tol
    _, x, y, w, h = node
    return (x - tol) <= px <= (x + w + tol) and (y - tol) <= py <= (y + h + tol)


def analyze(path: str) -> list:
    svg = open(path, encoding="utf-8").read()
    if "<!-- edge:" not in svg:
        return []                       # figure has not adopted the schema — skip
    nodes = _nodes(svg)
    # strict connect-inside is the default; opt out only with a real standalone marker COMMENT
    # (a distinct `<!-- edge-grammar: float-ok -->`), not prose that merely names the token.
    tol = _TOL if _FLOAT_OK_RE.search(svg) else 0.0
    findings = []
    for m in _EDGE_RE.finditer(svg):
        src, op, dst = m.group(1), m.group(2), m.group(3)
        drawable = m.group(0)[m.group(0).rfind("<"):]
        label = f"{src} {op} {dst}"
        missing = [n for n in (src, dst) if n not in nodes]
        if missing:
            findings.append(f"edge {label}: undefined node id(s) {missing}")
            continue
        ep = _endpoints(drawable)
        if ep is None:
            findings.append(f"edge {label}: could not read endpoints of its drawable")
            continue
        a, b = ep
        na, nb = nodes[src], nodes[dst]
        # each endpoint must land on/inside one distinct declared node (src<->one end, dst<->other end)
        ok = (_touches(a, na, tol) and _touches(b, nb, tol)) or (_touches(a, nb, tol) and _touches(b, na, tol))
        if not ok:
            verb = "grazes past" if tol else "floats outside"
            bad = []
            if not (_touches(a, na, tol) or _touches(a, nb, tol)):
                bad.append(f"end ({a[0]:.0f},{a[1]:.0f}) {verb} both {src} and {dst}")
            if not (_touches(b, na, tol) or _touches(b, nb, tol)):
                bad.append(f"end ({b[0]:.0f},{b[1]:.0f}) {verb} both {src} and {dst}")
            findings.append(f"edge {label}: " + ("; ".join(bad) or "endpoints do not cover both nodes"))
    return findings


def main() -> int:
    argv = sys.argv[1:]
    files = [os.path.abspath(argv[0])] if argv else sorted(glob.glob(os.path.join(_ASSETS, "*.svg")))
    total = 0
    print("== figure-dangling-edge — every declared edge must touch its named nodes "
          "[AUDIT-ONLY, exits 0] ==")
    for f in files:
        try:
            fs = analyze(f)
        except Exception as exc:  # pragma: no cover — a parse hiccup must not mask other lints
            print(f"  {os.path.basename(f)}: could not analyze ({exc})")
            continue
        for finding in fs:
            print(f"  {os.path.basename(f)} — {finding}")
        total += len(fs)
    if total:
        print(f"  {total} finding(s) — fix guidance -> {_FIX_DOC}")
    else:
        print("  clean — every declared edge terminates on its named nodes (annotated figures only)")
    return 0  # AUDIT-ONLY


if __name__ == "__main__":
    sys.exit(main())
