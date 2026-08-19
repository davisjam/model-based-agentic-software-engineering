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
edge whose paired drawable is missing; AND a directed ARROWHEAD whose end-travel direction is not parallel to
(target-node-center - endpoint) — i.e. the head skims the border instead of pointing INTO the node
(_ANGLE_TOL degrees). `--fix` auto-repairs the angle on curved (cubic) edges: it re-aims the control point
adjacent to the head so orient="auto" points the head in, preserving the endpoint and the curve's sweep.

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
_AXIS_TOL = 1.0  # px: a segment whose shorter-axis delta is <= this counts as axis-aligned (H or V)
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
# KEEP-ANGLES opt-out: a figure whose directed heads MUST stay at a non-perpendicular angle — e.g. a
# decision-tree whose diagonal branch would, if bent perpendicular, route its curve THROUGH an on-edge label
# ("no"/"yes"). `--fix` cannot see label collisions, so such a figure carries a standalone
# `<!-- edge-grammar: keep-angles -->` marker: the angle CHECK and `--fix` both leave its angles alone
# (seating is still enforced). The straight diagonal that clears the label beats a perpendicular curve through it.
_KEEP_ANGLES_RE = re.compile(r'<!--\s*edge-grammar:\s*keep-angles\s*-->')


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


def _polyline_points(d: str) -> list:
    """Points of an M/L/H/V-only path (a straight segment or an orthogonal elbow). Curves are classified
    before this is called, so only line commands need handling."""
    toks = re.findall(r"[MmLlHhVvZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?", d)
    pts: list = []
    cur = (0.0, 0.0)
    i = 0
    cmd = None
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t
            i += 1
            continue
        if cmd is None:
            i += 1
            continue
        rel, C = cmd.islower(), cmd.upper()
        if C in ("M", "L"):
            x, y = float(toks[i]), float(toks[i + 1])
            i += 2
            cur = (cur[0] + x, cur[1] + y) if rel else (x, y)
            pts.append(cur)
        elif C == "H":
            x = float(toks[i]); i += 1
            cur = (cur[0] + x if rel else x, cur[1]); pts.append(cur)
        elif C == "V":
            y = float(toks[i]); i += 1
            cur = (cur[0], cur[1] + y if rel else y); pts.append(cur)
        else:
            i += 1
    return pts


def _classify(tag: str) -> str:
    """The drawn shape of an edge: 'straight-v' | 'straight-h' | 'slope' | 'curve' | 'ortho-elbow' |
    'nonortho-elbow' | 'degenerate'. Shared by the should-be-orthogonal sensor and the straights-only
    router gate, so the two agree on which drawn edges are already correctly straight."""
    if tag.startswith("<line"):
        ep = _endpoints(tag)
        if ep is None:
            return "degenerate"
        (x1, y1), (x2, y2) = ep
        if abs(x2 - x1) <= _AXIS_TOL:
            return "straight-v"
        if abs(y2 - y1) <= _AXIS_TOL:
            return "straight-h"
        return "slope"
    dm = re.search(r'\bd="([^"]*)"', tag)
    if not dm:
        return "degenerate"
    d = dm.group(1)
    if re.search(r"[CcSsQqTtAa]", d):
        return "curve"
    pts = _polyline_points(d)
    if len(pts) < 2:
        return "degenerate"
    segs = list(zip(pts, pts[1:]))
    all_axis = all(abs(a[0] - b[0]) <= _AXIS_TOL or abs(a[1] - b[1]) <= _AXIS_TOL for a, b in segs)
    if not all_axis:
        return "nonortho-elbow" if len(pts) > 2 else "slope"
    if len(pts) == 2:
        (x1, y1), (x2, y2) = pts
        if abs(x2 - x1) <= _AXIS_TOL:
            return "straight-v"
        if abs(y2 - y1) <= _AXIS_TOL:
            return "straight-h"
        return "slope"
    return "ortho-elbow"


_DIR_OUT = 7.0   # a DIRECTED end (arrowhead) may sit up to this many px OUTSIDE the rim: the head body then
                 # stays outside the fill and the tip reaches in. Seating it inside would BURY the arrowhead.
_DIR_BURY = 6.0  # ...but no deeper than this many px INSIDE — a head swallowed further than this reads buried.


def _signed(pt: tuple, node: tuple) -> float:
    """Signed distance from pt to the node boundary: NEGATIVE inside (depth to nearest edge), POSITIVE
    outside (gap). Zero on the boundary."""
    px, py = pt
    if node[0] == "circle":
        _, cx, cy, r = node
        return math.hypot(px - cx, py - cy) - r
    _, x, y, w, h = node
    if x <= px <= x + w and y <= py <= y + h:
        return -min(px - x, x + w - px, py - y, y + h - py)
    dx = max(x - px, 0.0, px - (x + w))
    dy = max(y - py, 0.0, py - (y + h))
    return math.hypot(dx, dy)


def _ok_end(pt: tuple, node: tuple, directed: bool, tol: float) -> bool:
    """Is `pt` an acceptable landing on `node`?
      * UNDIRECTED end — must sit on/inside the node (signed <= tol; tol=0 strict, _TOL under float-ok).
      * DIRECTED end (arrowhead) — must seat AT the perimeter with the head body OUTSIDE the fill, so its
        base straddles the boundary: buried no deeper than _DIR_BURY, floating no farther than _DIR_OUT."""
    s = _signed(pt, node)
    if directed:
        return -_DIR_BURY <= s <= _DIR_OUT
    return s <= tol


# ---- arrowhead-angle check (a directed head must POINT AT its target node's center) ----
# THE DEFECT CLASS. A directed marker is `orient="auto"`, so the head follows the edge's END TANGENT. When a
# curved edge approaches its target at a shallow angle, that tangent runs nearly PARALLEL to the target's
# border and the head skims flat along the edge instead of arriving head-on. Every head in these figures is
# hand-set to arrive head-on, so the invariant is exact: the end-travel direction (line: x2-x1,y2-y1 ; path:
# endpoint - adjacent control point) must be PARALLEL to the inward aim — RADIAL for a circle, the inward
# NORMAL of the entered edge for a box (a head drops PERPENDICULAR into the border it crosses; see _aim).
_ANGLE_TOL = 3.0  # degrees. Correctly-aimed heads in the migrated corpus deviate <=0.5 deg (1-decimal
                  # coordinate rounding + fan hubs sharing a source point). 3 deg sits ~6x above that floor,
                  # so no correct head trips it, yet it still catches a visibly skimming head: the smallest
                  # real misaim found was 3.2 deg and flat heads ran 16-70 deg. Tighten toward the 0.5 floor
                  # only if a future correct figure never exceeds it.


def _aim(node: tuple, pt: tuple) -> tuple:
    """Ideal INWARD aim direction for a directed head landing at `pt` on `node` — the direction the head
    should travel to arrive head-on.
      * circle: RADIAL, toward the center (center − pt).
      * rect: the inward NORMAL of the border the head crosses (the nearest edge). A head must arrive
        PERPENDICULAR to the border it enters, which for a WIDE box is NOT the same as aiming at the box
        center: an arrow dropping straight into the top of a wide box is correct even though the centre lies
        far to one side. Aiming at the centre would wrongly flag (and tilt) every perpendicular off-centre head."""
    if node[0] == "circle":
        return (node[1] - pt[0], node[2] - pt[1])
    _, x, y, w, h = node
    px, py = pt
    cands = [(abs(py - y), (0.0, 1.0)), (abs(py - (y + h)), (0.0, -1.0)),
             (abs(px - x), (1.0, 0.0)), (abs(px - (x + w)), (-1.0, 0.0))]
    return min(cands, key=lambda c: c[0])[1]


def _ang_between(u: tuple, v: tuple):
    """Unsigned angle in degrees between vectors u and v; None if either is ~zero-length."""
    if math.hypot(*u) < 1e-9 or math.hypot(*v) < 1e-9:
        return None
    d = math.degrees(math.atan2(u[1], u[0]) - math.atan2(v[1], v[0])) % 360.0
    return d if d <= 180.0 else 360.0 - d


def _travel(tag: str, at_last: bool):
    """Outward end-travel vector at one end (endpoint minus the adjacent interior point). This is the
    direction `orient="auto"` points the head. line: the far endpoint is the adjacent point; path: the
    neighbouring control point in the d list."""
    if tag.startswith("<line"):
        vals = [_ATTR(tag, a) for a in ("x1", "y1", "x2", "y2")]
        if None in vals:
            return None
        x1, y1, x2, y2 = (float(v) for v in vals)
        return (x2 - x1, y2 - y1) if at_last else (x1 - x2, y1 - y2)
    d = re.search(r'\bd="([^"]*)"', tag)
    if not d:
        return None
    nums = [float(n) for n in re.findall(_NUM, d.group(1))]
    if len(nums) < 4:
        return None
    if at_last:
        return (nums[-2] - nums[-4], nums[-1] - nums[-3])
    return (nums[0] - nums[2], nums[1] - nums[3])


def _seat_assignment(a, b, na, nb):
    """Which physical endpoint plugs into which declared node — the pairing with least total boundary
    distance. Returns (node_of_a, node_of_b)."""
    p1 = abs(_signed(a, na)) + abs(_signed(b, nb))
    p2 = abs(_signed(a, nb)) + abs(_signed(b, na))
    return (na, nb) if p1 <= p2 else (nb, na)


def _angle_findings(drawable, a, b, node_a, node_b, d_first, d_last, label, src, dst):
    """Angle findings for the directed end(s) of one edge: a head whose travel deviates > _ANGLE_TOL from
    (target-center - endpoint)."""
    out = []
    for pt, node, directed, at_last, side in ((a, node_a, d_first, False, "src"),
                                              (b, node_b, d_last, True, "dst")):
        if not directed:
            continue
        trav = _travel(drawable, at_last)
        if trav is None:
            continue
        aim = _aim(node, pt)
        dev = _ang_between(trav, aim)
        if dev is not None and dev > _ANGLE_TOL:
            out.append(f"edge {label}: {side}-side head ({pt[0]:.0f},{pt[1]:.0f}) aims {dev:.0f} deg off "
                       f"perpendicular into the {dst if side == 'dst' else src} border (head skims instead of pointing in)")
    return out


# ---- auto-repair (--fix): re-aim the control point adjacent to a misaimed directed head ----
_CUBIC_RE = re.compile(
    r'^\s*M\s*(' + _NUM + r')[ ,]+(' + _NUM + r')\s*'
    r'C\s*(' + _NUM + r')[ ,]+(' + _NUM + r')\s+'
    r'(' + _NUM + r')[ ,]+(' + _NUM + r')\s+'
    r'(' + _NUM + r')[ ,]+(' + _NUM + r')\s*$')


def _fmt(v: float) -> str:
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def _reaim_cubic(d: str, aim: tuple, at_last: bool, L: float = 30.0):
    """Re-aim the control point ADJACENT to the directed end so the end tangent points in the inward `aim`
    direction; keep the endpoint and the far control point (preserves the curve's sweep). Returns the new d,
    or None if d is not a single cubic (leave those for a human)."""
    m = _CUBIC_RE.match(d.strip())
    if not m:
        return None
    x0, y0, x1, y1, x2, y2, x3, y3 = (float(g) for g in m.groups())
    n = math.hypot(*aim) or 1.0
    ux, uy = aim[0] / n, aim[1] / n
    if at_last:
        x2, y2 = x3 - L * ux, y3 - L * uy   # control OPPOSITE the inward aim -> tangent (endpoint-control) = aim
    else:
        x1, y1 = x0 - L * ux, y0 - L * uy
    return f"M{_fmt(x0)},{_fmt(y0)} C{_fmt(x1)},{_fmt(y1)} {_fmt(x2)},{_fmt(y2)} {_fmt(x3)},{_fmt(y3)}"


_STRAIGHT_D_RE = re.compile(
    r'^\s*M\s*(' + _NUM + r')[ ,]+(' + _NUM + r')\s*L\s*(' + _NUM + r')[ ,]+(' + _NUM + r')\s*$')


def _perp_cubic_d(a: tuple, b: tuple, node_b: tuple, L: float = 30.0):
    """A cubic `d` from a to b that departs along the chord and ARRIVES PERPENDICULAR into node_b's border —
    the fix for a straight directed segment (line or M-L path) whose head skims. None if b already aims in."""
    aim = _aim(node_b, b)
    dev = _ang_between((b[0] - a[0], b[1] - a[1]), aim)
    if dev is None or dev <= _ANGLE_TOL:
        return None
    n = math.hypot(*aim) or 1.0
    ux, uy = aim[0] / n, aim[1] / n
    cp2 = (b[0] - L * ux, b[1] - L * uy)                                   # arrive perpendicular
    cp1 = (a[0] + 0.35 * (b[0] - a[0]), a[1] + 0.35 * (b[1] - a[1]))       # depart along the chord
    return (f"M{_fmt(a[0])},{_fmt(a[1])} C{_fmt(cp1[0])},{_fmt(cp1[1])} "
            f"{_fmt(cp2[0])},{_fmt(cp2[1])} {_fmt(b[0])},{_fmt(b[1])}")


def _line_to_perp_cubic(tag: str, a: tuple, b: tuple, node_b: tuple, d_last: bool):
    """Convert a misaimed directed straight <line> into a <path> cubic (a straight line has no control point
    to re-aim, so it must become a curve). Handles the common marker-end (last) directed head. Returns the
    new <path ...> tag, or None if nothing to do."""
    if not d_last:
        return None
    d = _perp_cubic_d(a, b, node_b)
    if d is None:
        return None
    core = re.sub(r'\s(x1|y1|x2|y2)="[^"]*"', '', tag).replace("<line", "<path", 1)
    # a <line> carries no fill (it is a stroke); a <path> defaults to fill="black" and would fill the curve
    # as a solid blob — so declare fill="none" unless the source already sets a fill.
    if "fill=" not in core:
        core = core.replace("<path", '<path fill="none"', 1)
    return core.replace("/>", f' d="{d}"/>', 1)


def fix(path: str) -> int:
    """Re-aim every misaimed directed CUBIC head in `path` perpendicular into its target's border and write
    the SVG back. Straight <line>s are left alone: a seated endpoint already lies on its aim ray, and moving
    the other end risks un-seating it. Idempotent — a second run finds nothing to re-aim."""
    svg = open(path, encoding="utf-8").read()
    if "<!-- edge:" not in svg or _KEEP_ANGLES_RE.search(svg):
        return 0                         # keep-angles: leave this figure's (intentionally non-perpendicular) heads alone
    nodes = _nodes(svg)
    replacements = []
    for m in _EDGE_RE.finditer(svg):
        src, dst = m.group(1), m.group(3)
        if src not in nodes or dst not in nodes:
            continue
        drawable = m.group(0)[m.group(0).rfind("<"):]
        ep = _endpoints(drawable)
        if ep is None:
            continue
        a, b = ep
        na, nb = nodes[src], nodes[dst]
        g_start, g_end = _enclosing_markers(svg, m.start() + m.group(0).rfind("<"))
        d_first = "marker-start" in drawable or g_start
        d_last = "marker-end" in drawable or g_end
        node_a, node_b = _seat_assignment(a, b, na, nb)
        if drawable.startswith("<path"):
            dm = re.search(r'\bd="([^"]*)"', drawable)
            if not dm:
                continue
            d = dm.group(1)
            new_d = d
            for pt, node, directed, at_last in ((a, node_a, d_first, False), (b, node_b, d_last, True)):
                if not directed:
                    continue
                trav = _travel(f'<path d="{new_d}"/>', at_last)
                aim = _aim(node, pt)
                dev = _ang_between(trav, aim) if trav else None
                if dev is None or dev <= _ANGLE_TOL:
                    continue
                cand = _reaim_cubic(new_d, aim, at_last)
                if cand is not None:
                    new_d = cand
            if new_d == d and d_last:                       # a straight M-L path: bend it to arrive perpendicular
                sm = _STRAIGHT_D_RE.match(d.strip())
                if sm:
                    a2 = (float(sm.group(1)), float(sm.group(2)))
                    b2 = (float(sm.group(3)), float(sm.group(4)))
                    cand = _perp_cubic_d(a2, b2, node_b)
                    if cand is not None:
                        new_d = cand
            if new_d != d:
                replacements.append((drawable, drawable.replace(f'd="{d}"', f'd="{new_d}"', 1)))
        elif drawable.startswith("<line"):
            new_tag = _line_to_perp_cubic(drawable, a, b, node_b, d_last)
            if new_tag is not None:
                replacements.append((drawable, new_tag))
    for old, new in replacements:
        svg = svg.replace(old, new, 1)
    if replacements:
        open(path, "w", encoding="utf-8").write(svg)
    return len(replacements)


# ---- orthogonal auto-router (--orthogonalize): re-route a declared edge to a straight H/V segment (when
#      the two node rects are axis-alignable) or a single right-angled elbow (when it must turn), seated
#      PERPENDICULAR on each rect's mid-border. This is the correct-by-construction fix behind the heuristic
#      "a box-to-box edge should be orthogonal": a straight edge cannot skim a border, and an elbow's final
#      segment drops perpendicular into the entered side so orient="auto" seats the head — and any marker-mid
#      glyph — square. Deterministic + idempotent: the route derives from node geometry alone, not the
#      current (possibly wrong) drawn coordinates, so a second run reproduces it byte-for-byte. ----
_ALIGN_MIN = 12.0    # min shared-span overlap (px) for two rects to be axis-alignable -> a straight segment
_GAP_DIR = 2.0       # a directed end seats this many px OUTSIDE the entered border (head tip lands ~on it)
_CLEAR_INSET = 3.0   # shrink an obstacle node by this when testing whether an elbow segment clears it


def _bounds(node: tuple) -> tuple:
    """(x0, y0, x1, y1) axis-aligned bounds of a node — a rect as-is, a circle by its bounding square."""
    if node[0] == "rect":
        _, x, y, w, h = node
        return (x, y, x + w, y + h)
    _, cx, cy, r = node
    return (cx - r, cy - r, cx + r, cy + r)


def _ctr(node: tuple) -> tuple:
    x0, y0, x1, y1 = _bounds(node)
    return ((x0 + x1) / 2.0, (y0 + y1) / 2.0)


def _span_overlap(a0: float, a1: float, b0: float, b1: float) -> tuple:
    """(overlap_length, overlap_midpoint) of intervals [a0,a1] and [b0,b1]; length<=0 means no overlap."""
    lo, hi = max(a0, b0), min(a1, b1)
    return (hi - lo, (lo + hi) / 2.0)


def _seg_hits_rect(p: tuple, q: tuple, rect: tuple, inset: float) -> bool:
    """Does the axis-aligned segment p->q pass through `rect`'s interior (shrunk by `inset` so a segment
    grazing a border does not count)?"""
    rx0, ry0, rx1, ry1 = rect[0] + inset, rect[1] + inset, rect[2] - inset, rect[3] - inset
    if rx1 <= rx0 or ry1 <= ry0:
        return False
    sx0, sx1 = min(p[0], q[0]), max(p[0], q[0])
    sy0, sy1 = min(p[1], q[1]), max(p[1], q[1])
    return sx0 <= rx1 and sx1 >= rx0 and sy0 <= ry1 and sy1 >= ry0


def _straight_axis(start_node: tuple, end_node: tuple, obstacles: list) -> str | None:
    """Can a CLEAN straight segment connect the two rects? Returns 'v' (a vertical corridor: x-spans overlap
    by >= _ALIGN_MIN, rects y-separated) or 'h' (a horizontal corridor), else None. The corridor must ALSO
    clear every obstacle rect — a straight edge that would run THROUGH a third node (a feedback/skip edge over
    a stack of boxes) is NOT axis-alignable; it genuinely has to route around, so it is left for a later pass
    rather than drawn straight over the intervening nodes. This is the single alignability predicate the
    should-be-orthogonal sensor and the router share, so the two agree on SLOPE_ALIGNABLE by construction."""
    sx0, sy0, sx1, sy1 = _bounds(start_node)
    dx0, dy0, dx1, dy1 = _bounds(end_node)
    xov, xmid = _span_overlap(sx0, sx1, dx0, dx1)
    yov, ymid = _span_overlap(sy0, sy1, dy0, dy1)
    v_sep = (sy1 <= dy0) or (dy1 <= sy0)
    h_sep = (sx1 <= dx0) or (dx1 <= sx0)
    if xov >= _ALIGN_MIN and v_sep:
        ylo, yhi = (sy1, dy0) if sy1 <= dy0 else (dy1, sy0)
        if not any(_seg_hits_rect((xmid, ylo), (xmid, yhi), ob, _CLEAR_INSET) for ob in obstacles):
            return "v"
    if yov >= _ALIGN_MIN and h_sep:
        xlo, xhi = (sx1, dx0) if sx1 <= dx0 else (dx1, sx0)
        if not any(_seg_hits_rect((xlo, ymid), (xhi, ymid), ob, _CLEAR_INSET) for ob in obstacles):
            return "h"
    return None


def _ortho_route(start_node: tuple, end_node: tuple, directed_start: bool, directed_end: bool,
                 obstacles: list) -> list | None:
    """The orthogonal poly-line [start_pt, (corner,) end_pt] from `start_node` to `end_node`:
      * STRAIGHT H/V when the rects overlap on an axis by >= _ALIGN_MIN and are separated on the other —
        seated on the shared-span midpoint of each rect's facing border;
      * a single ELBOW when the target sits in a diagonal quadrant — the orientation (H-then-V / V-then-H)
        chosen so it clears every obstacle rect, preferring the one whose long run matches the dominant axis.
    A directed end seats _GAP_DIR px OUTSIDE its border (head body stays outside the fill); an undirected end
    sits on its border. Returns None when no clean route exists (overlapping rects, or both elbow orientations
    blocked) — the caller then LEAVES the edge for a hand pass rather than emit a bad route."""
    sx0, sy0, sx1, sy1 = _bounds(start_node)
    dx0, dy0, dx1, dy1 = _bounds(end_node)
    scx, scy = _ctr(start_node)
    dcx, dcy = _ctr(end_node)
    _, xmid = _span_overlap(sx0, sx1, dx0, dx1)
    _, ymid = _span_overlap(sy0, sy1, dy0, dy1)
    g_s = _GAP_DIR if directed_start else 0.0
    g_e = _GAP_DIR if directed_end else 0.0

    axis = _straight_axis(start_node, end_node, obstacles)   # obstacle-aware: a straight run over a third node
    if axis == "v":                        # STRAIGHT VERTICAL
        if scy <= dcy:
            return [(xmid, sy1 + g_s), (xmid, dy0 - g_e)]
        return [(xmid, sy0 - g_s), (xmid, dy1 + g_e)]
    if axis == "h":                        # STRAIGHT HORIZONTAL
        if scx <= dcx:
            return [(sx1 + g_s, ymid), (dx0 - g_e, ymid)]
        return [(sx0 - g_s, ymid), (dx1 + g_e, ymid)]

    # ELBOW — a clean single right angle needs the target in a diagonal quadrant (separated on both axes)
    hdir = "right" if dx0 >= sx1 else "left" if dx1 <= sx0 else None
    vdir = "down" if dy0 >= sy1 else "up" if dy1 <= sy0 else None
    if hdir is None or vdir is None:
        return None   # rects overlap on one axis but by < _ALIGN_MIN -> ambiguous; leave for a hand pass

    def h_then_v() -> list:
        ax = sx1 + g_s if hdir == "right" else sx0 - g_s        # exit start on its horizontal side
        by = dy0 - g_e if vdir == "down" else dy1 + g_e         # enter end top/bottom (perpendicular)
        return [(ax, scy), (dcx, scy), (dcx, by)]

    def v_then_h() -> list:
        ay = sy1 + g_s if vdir == "down" else sy0 - g_s         # exit start on its vertical side
        bx = dx0 - g_e if hdir == "right" else dx1 + g_e        # enter end left/right (perpendicular)
        return [(scx, ay), (scx, dcy), (bx, dcy)]

    prefer_h = abs(dcx - scx) >= abs(dcy - scy)
    for build in ([h_then_v, v_then_h] if prefer_h else [v_then_h, h_then_v]):
        route = build()
        if not any(_seg_hits_rect(route[i], route[i + 1], ob, _CLEAR_INSET)
                   for i in range(len(route) - 1) for ob in obstacles):
            return route
    return None   # both elbow orientations cross a third node -> leave for a hand pass


def _emit_ortho(tag: str, route: list) -> str:
    """Rewrite drawable `tag`'s geometry to the orthogonal `route`, preserving stroke/marker/style attrs.
    A 2-point route is a straight segment; a 3-point route is an elbow. A <line> stays a <line> for a
    straight route and becomes a <path> (fill=none) for an elbow; a <path> is rewritten in place."""
    d = "M" + _fmt(route[0][0]) + "," + _fmt(route[0][1]) + "".join(
        f" L{_fmt(x)},{_fmt(y)}" for x, y in route[1:])
    if tag.startswith("<line"):
        if len(route) == 2:
            new = tag
            for attr, val in (("x1", route[0][0]), ("y1", route[0][1]),
                              ("x2", route[1][0]), ("y2", route[1][1])):
                if re.search(rf'\b{attr}="', new):
                    new = re.sub(rf'\b{attr}="[^"]*"', f'{attr}="{_fmt(val)}"', new, count=1)
                else:
                    new = new.replace("<line", f'<line {attr}="{_fmt(val)}"', 1)
            return new
        core = re.sub(r'\s(x1|y1|x2|y2)="[^"]*"', "", tag).replace("<line", "<path", 1)
        if "fill=" not in core:
            core = core.replace("<path", '<path fill="none"', 1)
        return core.replace("/>", f' d="{d}"/>', 1)
    if re.search(r'\bd="', tag):
        return re.sub(r'\bd="[^"]*"', f'd="{d}"', tag, count=1)
    return tag.replace("/>", f' d="{d}"/>', 1)


def orthogonalize(path: str, straights_only: bool = False) -> tuple:
    """Re-route every declared edge in `path` to an orthogonal segment/elbow and write the SVG back.
    Returns (n_rerouted, [left-for-hand-pass edge labels]). A keep-angles figure is skipped wholesale.
    Idempotent: routes derive from node geometry, so a second run reproduces them and changes nothing.

    STRAIGHTS-ONLY (the "safe straights first" pass). With `straights_only=True` the router touches ONLY the
    edges the should-be-orthogonal sensor classifies SLOPE_ALIGNABLE — endpoints axis-alignable, so the fix is
    a single straight H/V segment — and LEAVES every CURVE_TURN edge (one needing a right-angled elbow) exactly
    as drawn for a later pass. The gate reuses the same primitives as the sensor: `_ortho_route` yields a
    2-point route precisely when the rects are axis-alignable (same `_ALIGN_MIN`/`_span_overlap`/separation
    test the sensor's `analyze` runs), and a drawn edge already in the correct straight orientation
    (`_classify`) is left alone — exactly the sensor's "flag only when shape != the wanted straight" rule. So
    "straightened by this pass" == "was SLOPE_ALIGNABLE", by construction."""
    svg = open(path, encoding="utf-8").read()
    if "<!-- edge:" not in svg or _KEEP_ANGLES_RE.search(svg):
        return (0, [])
    nodes = _nodes(svg)
    replacements = []
    skipped = []
    for m in _EDGE_RE.finditer(svg):
        src, op, dst = m.group(1), m.group(2), m.group(3)
        if src not in nodes or dst not in nodes:
            continue
        drawable = m.group(0)[m.group(0).rfind("<"):]
        ep = _endpoints(drawable)
        if ep is None:
            continue
        a, b = ep
        na, nb = nodes[src], nodes[dst]
        drawable_start = m.start() + m.group(0).rfind("<")
        g_start, g_end = _enclosing_markers(svg, drawable_start)
        d_first = "marker-start" in drawable or g_start
        d_last = "marker-end" in drawable or g_end
        start_node, end_node = _seat_assignment(a, b, na, nb)   # physical a<->start_node, b<->end_node
        obstacles = [_bounds(v) for k, v in nodes.items() if k not in (src, dst)]
        route = _ortho_route(start_node, end_node, d_first, d_last, obstacles)
        if route is None:
            if not straights_only:      # a curve-turn with no clean elbow -> hand pass; straights-only defers it
                skipped.append(f"{src} {op} {dst}")
            continue
        if straights_only:
            if len(route) != 2:
                continue                # would need an elbow (CURVE_TURN) — leave exactly as-is for a later pass
            want = "straight-v" if abs(route[0][0] - route[1][0]) <= _AXIS_TOL else "straight-h"
            if _classify(drawable) == want:
                continue                # already the correct straight — the sensor would not flag it
        new_tag = _emit_ortho(drawable, route)
        if new_tag and new_tag != drawable:
            replacements.append((drawable, new_tag))
    for old, new in replacements:
        svg = svg.replace(old, new, 1)
    if replacements:
        open(path, "w", encoding="utf-8").write(svg)
    return (len(replacements), skipped)


def _enclosing_markers(svg: str, pos: int) -> tuple:
    """(has_marker_start, has_marker_end) contributed by any <g> still OPEN at byte `pos`. A marker can be set
    on an enclosing group instead of the drawable itself (e.g. `<g marker-end=...><line/></g>`), so directed
    detection must look up the group stack, not only the drawable's own attributes."""
    opens = []
    for gm in re.finditer(r'<g\b[^>]*>|</g\s*>', svg[:pos]):
        if gm.group(0).startswith("</g"):
            if opens:
                opens.pop()
        else:
            opens.append(gm.group(0))
    return (any("marker-start" in g for g in opens), any("marker-end" in g for g in opens))


def analyze(path: str) -> list:
    svg = open(path, encoding="utf-8").read()
    if "<!-- edge:" not in svg:
        return []                       # figure has not adopted the schema — skip
    nodes = _nodes(svg)
    # strict connect-inside is the default; opt out only with a real standalone marker COMMENT
    # (a distinct `<!-- edge-grammar: float-ok -->`), not prose that merely names the token.
    tol = _TOL if _FLOAT_OK_RE.search(svg) else 0.0
    check_angles = not _KEEP_ANGLES_RE.search(svg)   # keep-angles figures accept non-perpendicular heads
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
        # `marker-end` makes the LAST point an arrowhead; `marker-start` the FIRST. A directed end seats at
        # the perimeter (head outside), an undirected end sits inside — so each end is checked by its kind.
        # The marker may sit on the drawable OR on an enclosing <g>, so check both.
        drawable_start = m.start() + m.group(0).rfind("<")
        g_start, g_end = _enclosing_markers(svg, drawable_start)
        d_first = "marker-start" in drawable or g_start
        d_last = "marker-end" in drawable or g_end
        # each endpoint must land on one distinct declared node; try both first/last <-> src/dst pairings
        ok = ((_ok_end(a, na, d_first, tol) and _ok_end(b, nb, d_last, tol))
              or (_ok_end(a, nb, d_first, tol) and _ok_end(b, na, d_last, tol)))
        if not ok:
            def _describe(pt: tuple, directed: bool) -> str:
                s = min(_signed(pt, na), _signed(pt, nb))
                where = f"floats {s:.0f}px outside" if s > 0 else f"is buried {-s:.0f}px inside"
                return f"{'arrowhead' if directed else 'end'} ({pt[0]:.0f},{pt[1]:.0f}) {where} both {src} and {dst}"
            bad = []
            if not (_ok_end(a, na, d_first, tol) or _ok_end(a, nb, d_first, tol)):
                bad.append(_describe(a, d_first))
            if not (_ok_end(b, na, d_last, tol) or _ok_end(b, nb, d_last, tol)):
                bad.append(_describe(b, d_last))
            findings.append(f"edge {label}: " + ("; ".join(bad) or "endpoints do not cover both nodes"))
        # ANGLE check — independent of seating: a directed head must POINT AT the node it plugs into.
        if check_angles:
            node_a, node_b = _seat_assignment(a, b, na, nb)
            findings.extend(_angle_findings(drawable, a, b, node_a, node_b, d_first, d_last, label, src, dst))
    return findings


def main() -> int:
    argv = sys.argv[1:]
    do_fix = "--fix" in argv
    straights_only = "--straights-only" in argv
    do_orth = ("--orthogonalize" in argv) or straights_only   # --straights-only implies orthogonalize
    argv = [a for a in argv if a not in ("--fix", "--orthogonalize", "--straights-only")]
    files = [os.path.abspath(argv[0])] if argv else sorted(glob.glob(os.path.join(_ASSETS, "*.svg")))
    if do_orth:
        total_routed = 0
        left = []
        mode = "straights-only (SLOPE_ALIGNABLE edges only; curve-turns deferred)" if straights_only \
            else "straight + elbow"
        print(f"== figure-orthogonal-router --orthogonalize [{mode}] — re-route declared edges to orthogonal, "
              "heads seated perpendicular ==")
        for f in files:
            try:
                n, sk = orthogonalize(f, straights_only=straights_only)
            except Exception as exc:  # pragma: no cover
                print(f"  {os.path.basename(f)}: could not orthogonalize ({exc})")
                continue
            if n:
                print(f"  {os.path.basename(f)} — re-routed {n} edge(s)")
            for s in sk:
                print(f"  {os.path.basename(f)} — LEFT '{s}' for a hand pass (no clean orthogonal route)")
            total_routed += n
            left += sk
        print(f"  {total_routed} edge(s) re-routed"
              + (f"; {len(left)} left for a hand pass" if left else "")
              if total_routed or left else "  nothing to route — every declared edge already orthogonal")
        print()  # fall through to a verification pass over the (now orthogonal) files
    if do_fix:
        total_fixed = 0
        print("== figure-arrowhead-angle --fix — re-aim misaimed directed heads at their target center ==")
        for f in files:
            try:
                n = fix(f)
            except Exception as exc:  # pragma: no cover
                print(f"  {os.path.basename(f)}: could not fix ({exc})")
                continue
            if n:
                print(f"  {os.path.basename(f)} — re-aimed {n} directed head(s)")
            total_fixed += n
        print(f"  {total_fixed} head(s) re-aimed"
              if total_fixed else "  nothing to fix — every head already aims at its target center")
        print()  # then fall through to a verification pass over the (now repaired) files
    total = 0
    print("== figure-dangling-edge + arrowhead-angle — declared edges touch their nodes AND heads aim in "
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
