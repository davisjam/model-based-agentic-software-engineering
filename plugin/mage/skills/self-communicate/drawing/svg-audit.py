# Copyright (c) 2026 James C. Davis, PhD (davisjam@purdue.edu). MIT License — see LICENSE.
"""svg-audit.py — GENERIC STARTER (self-communicate / drawing).

A dependency-free audit for hand-authored SVG figures, shipped with the skill so you can drop it into
any project. Two AUDIT-ONLY heuristics:
  - text-fit: a <text> label estimated to overflow its <rect> box or the viewBox.
  - drawing hygiene: a <marker orient="auto"> arrowhead NOT in the +x convention (lands off-axis
    after rotation), a hand-stitched arrowhead outside a <marker>, or a <line> stroke through a
    <text> glyph box.

Run:  python3 svg-audit.py <dir-of-svgs>   (defaults to ./). Prints candidates; exit 0 always.
Reusable logic behind diagrams.md ("Use the native construct, not stitched primitives"). Adapt freely.
"""
from __future__ import annotations

import os
import re
import sys
import xml.etree.ElementTree as ET

PASS = "PASS"
# NOTE: this file shares its text-fit / drawing-hygiene check logic with tests/svg_fit.py — a known
# duplication to consolidate later.
# argv[1] may be a single .svg FILE, a directory of SVGs, or absent (default cwd). A file arg scans just
# that file; a dir arg scans every *.svg in it. `_SCAN_DIR` is the dir the report paths are relative to.
_ARG = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
_SCAN_FILE = _ARG if os.path.isfile(_ARG) else None
_SCAN_DIR = os.path.dirname(_ARG) if _SCAN_FILE else _ARG
ROOT = _SCAN_DIR
def rel(p):
    return os.path.relpath(p, ROOT)


def _scan_svgs():
    """Filenames to scan: a single file when argv[1] named one, else every *.svg in the scan dir. Returns
    a possibly-empty list of basenames (resolved against `_SCAN_DIR`) — empty means nothing to scan."""
    if _SCAN_FILE is not None:
        return [os.path.basename(_SCAN_FILE)]
    if not os.path.isdir(_SCAN_DIR):
        return None  # neither a file nor a dir — signal "nothing to scan"
    return sorted(fn for fn in os.listdir(_SCAN_DIR) if fn.endswith(".svg"))

# Where an agent goes when a figure is flagged. Repo-relative; the check echoes it on every finding.
RUNBOOK = "book/_design/figure-text-fit-runbook.md"

# Average glyph width as a fraction of the font-size (em). A crude but serviceable mean across a
# mixed-case sans-serif label; bold runs a touch wider. Deliberately conservative-low to keep the
# audit's false-positive rate down — a too-eager ratio floods the report with non-overflows.
GLYPH_RATIO = 0.55
GLYPH_RATIO_BOLD = 0.60

# Inner-width padding: a box's text area is narrower than its rect by this fraction of the box width on
# EACH side (labels are inset from the stroke, not flush to it). 0.06 => 12% of width reserved as margin.
BOX_INNER_PAD_FRAC = 0.06

# Overflow must clear a margin before it counts, so a marginal estimation error (a glyph or two of slop in
# the average-ratio guess) doesn't flood the audit. A candidate must overflow by at least this many
# font-size ems — roughly two glyphs — OR this fraction of the reference width, whichever is larger.
MIN_OVERFLOW_EMS = 1.5
MIN_OVERFLOW_FRAC = 0.10

# A box only "holds" a label when the label's anchor sits in the box's central band, not hugging an edge.
# A caption whose baseline grazes a box's bottom stroke is an annotation BELOW the box, not text inside it;
# measuring it against that box is a false positive. Require the anchor's y to sit within this central
# fraction of the box height (0.15..0.85), and its x within the inner x-range.
BOX_CENTRAL_BAND = (0.15, 0.85)

# A rect that fills a large fraction of the canvas is a background or a PANEL — a container for other
# shapes and multi-line prose, not a label box that tightly wraps one string. Measuring a caption against
# a panel's inner width flags every intentionally-wide prose line; a panel's contents are meant to run
# near its edges. So a rect wider than this fraction of the viewBox width is treated as a container and
# skipped for box-overflow (its text is still checked against the CANVAS). Label boxes are much narrower.
PANEL_WIDTH_FRAC = 0.45

# SVG namespace — the assets declare xmlns="http://www.w3.org/2000/svg", so ET tags come back namespaced.
_SVG_NS = "http://www.w3.org/2000/svg"


def _local(tag: str) -> str:
    """Strip the `{namespace}` prefix ElementTree prepends, so `{...}text` -> `text`."""
    return tag.rsplit("}", 1)[-1]


def _parse_style_font_sizes(root: ET.Element) -> dict[str, tuple[float, bool]]:
    """Map each CSS class in a `<style>` block to (font_size_px, is_bold).

    Figures declare font sizing two ways: a `font-size` attribute on the `<text>`, or a CSS class whose
    rule lives in an SVG `<style>` block (e.g. `.btitle { font-size:32px; font-weight:700; }`). Parse the
    class rules so a class-styled label resolves its size the same as an attribute-styled one.
    """
    classes: dict[str, tuple[float, bool]] = {}
    for el in root.iter():
        if _local(el.tag) != "style" or not el.text:
            continue
        # Each rule: `.name { ...decls... }`. Pull font-size + font-weight out of the decl block.
        for cls, body in re.findall(r"\.([A-Za-z0-9_-]+)\s*\{([^}]*)\}", el.text):
            m = re.search(r"font-size\s*:\s*([0-9.]+)", body)
            if not m:
                continue
            size = float(m.group(1))
            bold = bool(re.search(r"font-weight\s*:\s*(bold|[6-9]00)", body))
            classes[cls] = (size, bold)
    return classes


def _font_size_and_weight(el: ET.Element, style_classes: dict[str, tuple[float, bool]]) -> tuple[float, bool] | None:
    """Resolve a `<text>` element's (font_size, is_bold) from its attribute or its CSS class; None if
    neither supplies a size (can't estimate width without one)."""
    size: float | None = None
    bold = False
    fs = el.get("font-size")
    if fs:
        m = re.match(r"([0-9.]+)", fs)
        if m:
            size = float(m.group(1))
    fw = el.get("font-weight")
    if fw and re.match(r"(bold|[6-9]00)", fw):
        bold = True
    # A class can supply the size (and boldness) when the attribute doesn't.
    cls_attr = el.get("class")
    if cls_attr:
        for name in cls_attr.split():
            if name in style_classes:
                c_size, c_bold = style_classes[name]
                if size is None:
                    size = c_size
                bold = bold or c_bold
    if size is None:
        return None
    return size, bold


def _text_content(el: ET.Element) -> str:
    """Flatten a `<text>` (and any `<tspan>` children) to its visible string."""
    return "".join(el.itertext()).strip()


def _num(v: str | None) -> float | None:
    if v is None:
        return None
    m = re.match(r"(-?[0-9.]+)", v)
    return float(m.group(1)) if m else None


def _viewbox_width(root: ET.Element) -> float | None:
    vb = root.get("viewBox")
    if vb:
        parts = re.split(r"[\s,]+", vb.strip())
        if len(parts) == 4:
            return float(parts[2])
    return _num(root.get("width"))


class _Rect:
    """A `<rect>` box: outer x/y/width/height plus the inner (padded) x-range a label should stay within."""

    def __init__(self, x: float, y: float, w: float, h: float):
        self.x, self.y, self.w, self.h = x, y, w, h
        pad = w * BOX_INNER_PAD_FRAC
        self.inner_left = x + pad
        self.inner_right = x + w - pad
        self.inner_w = self.inner_right - self.inner_left

    def contains_point(self, px: float, py: float) -> bool:
        return self.x <= px <= self.x + self.w and self.y <= py <= self.y + self.h

    def holds_label(self, px: float, py: float) -> bool:
        """True when the anchor sits in the box's central band — text meant to live INSIDE the box, not a
        caption grazing an edge (which is an annotation beside/below the box, not bounded by it)."""
        if not (self.x <= px <= self.x + self.w):
            return False
        lo, hi = BOX_CENTRAL_BAND
        return self.y + self.h * lo <= py <= self.y + self.h * hi


def _collect_rects(root: ET.Element, vb_w: float | None) -> list[_Rect]:
    """Every `<rect>` that is a plausible label box: has x/y/w/h and is NARROWER than PANEL_WIDTH_FRAC of
    the canvas (a wider rect is a background/panel container, not a per-label box — see PANEL_WIDTH_FRAC)."""
    panel_cap = vb_w * PANEL_WIDTH_FRAC if vb_w else None
    rects: list[_Rect] = []
    for el in root.iter():
        if _local(el.tag) != "rect":
            continue
        x, y = _num(el.get("x")), _num(el.get("y"))
        w, h = _num(el.get("width")), _num(el.get("height"))
        if None in (x, y, w, h) or w <= 0 or h <= 0:
            continue
        if panel_cap is not None and w > panel_cap:
            continue  # background or panel — its contents are checked against the canvas, not this rect
        rects.append(_Rect(x, y, w, h))  # type: ignore[arg-type]
    return rects


def _text_extent(text: str, size: float, bold: bool, anchor: str) -> tuple[float, float]:
    """(left_x_offset, right_x_offset) of the estimated text run relative to the element's x.

    Width ~= len * size * ratio. `text-anchor` decides how the run sits about the x point:
    `start` runs rightward, `middle` centers, `end` runs leftward.
    """
    ratio = GLYPH_RATIO_BOLD if bold else GLYPH_RATIO
    width = len(text) * size * ratio
    if anchor == "middle":
        return -width / 2.0, width / 2.0
    if anchor == "end":
        return -width, 0.0
    return 0.0, width  # start (default)


def _innermost_holding_rect(rects: list[_Rect], px: float, py: float) -> _Rect | None:
    """The tightest box whose central band holds the text anchor — smallest-area wins, so a label inside a
    panel is measured against the panel, not the page-background rect that also contains it."""
    hits = [r for r in rects if r.holds_label(px, py)]
    if not hits:
        return None
    return min(hits, key=lambda r: r.w * r.h)


def _over_threshold(overflow: float, size: float, reference_w: float) -> bool:
    """A candidate counts only if it clears the noise floor: at least MIN_OVERFLOW_EMS font-ems OR
    MIN_OVERFLOW_FRAC of the reference width, whichever is larger."""
    floor = max(MIN_OVERFLOW_EMS * size, MIN_OVERFLOW_FRAC * reference_w)
    return overflow >= floor


def check_svg_text_fit():
    """Scan every `book/assets/*.svg`; flag `<text>` estimated to overflow its box or the canvas.

    AUDIT-ONLY: always returns PASS (exit-neutral). Findings print as guidance, each pointing at the
    runbook. Returns (PASS, issues) — `issues` is the human-readable candidate list.
    """
    targets = _scan_svgs()
    if not targets:
        return PASS, ["no book/assets/ dir — nothing to scan"]

    issues: list[str] = []
    flagged_files: set[str] = set()
    for fn in targets:
        path = os.path.join(_SCAN_DIR, fn)
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError as e:
            issues.append(f"{rel(path)}: XML parse error ({e}) — cannot scan")
            continue

        vb_w = _viewbox_width(root)
        style_classes = _parse_style_font_sizes(root)
        rects = _collect_rects(root, vb_w)

        for el in root.iter():
            if _local(el.tag) != "text":
                continue
            text = _text_content(el)
            if not text:
                continue
            x, y = _num(el.get("x")), _num(el.get("y"))
            if x is None or y is None:
                continue  # dx/dy-positioned or tspan-driven; skip (can't anchor it cheaply)
            fw = _font_size_and_weight(el, style_classes)
            if fw is None:
                continue
            size, bold = fw
            anchor = (el.get("text-anchor") or "start").strip()
            left_off, right_off = _text_extent(text, size, bold, anchor)
            text_left, text_right = x + left_off, x + right_off
            est_w = right_off - left_off
            label = text if len(text) <= 42 else text[:39] + "..."

            # Canvas overflow: the estimated run runs off the left edge (<0) or past the viewBox width.
            if vb_w is not None:
                over = max(text_right - vb_w, -text_left)
                if over > 0 and _over_threshold(over, size, vb_w):
                    issues.append(
                        f"{rel(path)}: CANVAS overflow — text {label!r} (est width {est_w:.0f}u, "
                        f"font {size:.0f}u) extends to x={text_right:.0f} past viewBox width {vb_w:.0f} "
                        f"(over by ~{over:.0f}u)")
                    flagged_files.add(fn)
                    continue  # a canvas overflow is the more serious of the two; report it and move on

            # Box overflow: the run exceeds the inner width of the tightest box holding it.
            box = _innermost_holding_rect(rects, x, y)
            if box is not None:
                over = est_w - box.inner_w
                if over > 0 and _over_threshold(over, size, box.inner_w):
                    issues.append(
                        f"{rel(path)}: BOX overflow — text {label!r} (est width {est_w:.0f}u, font "
                        f"{size:.0f}u) exceeds box inner width {box.inner_w:.0f}u "
                        f"(rect x={box.x:.0f} w={box.w:.0f}, over by ~{over:.0f}u)")
                    flagged_files.add(fn)

    if issues:
        issues.append("")
        issues.append(f"AUDIT-ONLY (heuristic; false positives expected). Fix guidance -> {RUNBOOK}")
        issues.insert(0, f"{len(flagged_files)} figure(s) with candidate overflow "
                         f"(est. glyph ratio {GLYPH_RATIO}/{GLYPH_RATIO_BOLD} bold):")
    return PASS, issues  # AUDIT-ONLY: never FAIL


# ---- drawing hygiene: the native-construct discipline (arrowheads via <marker>, +x geometry, no
#      stroke-through-glyph). Enforces the self-communicate drawing rule "use the native construct, not
#      stitched primitives" that a text-width heuristic is blind to. -------------------------------------

DRAWING_DOC = "plugin/mage/skills/self-communicate/drawing/diagrams.md"
_ARROWHEAD_BBOX_MAX = 30.0  # a filled triangle smaller than this (user units) reads as an arrowhead


def _triangle_from_path_d(d: str) -> list[tuple[float, float]] | None:
    """Vertices of a straight-segment triangle path (`M x,y L x,y L x,y [Z]`). None for curves, relative
    commands, or non-triangles — we only reason about the simple triangles used as arrowheads."""
    if re.search(r"[csqtahvCSQTAHV]|[mlz]", d):  # curves / relative / lowercase — don't reason about it
        return None
    nums = re.findall(r"-?[0-9.]+", d)
    if len(nums) < 6:
        return None
    pts = [(float(nums[i]), float(nums[i + 1])) for i in range(0, len(nums) - 1, 2)]
    # a closed triangle may repeat the first point; dedupe a trailing repeat
    if len(pts) == 4 and pts[0] == pts[3]:
        pts = pts[:3]
    return pts if len(pts) == 3 else None


def _triangle_from_points(points: str) -> list[tuple[float, float]] | None:
    nums = re.findall(r"-?[0-9.]+", points)
    if len(nums) < 6:
        return None
    pts = [(float(nums[i]), float(nums[i + 1])) for i in range(0, len(nums) - 1, 2)]
    if len(pts) == 4 and pts[0] == pts[3]:
        pts = pts[:3]
    return pts if len(pts) == 3 else None


def _tip_vector(verts: list[tuple[float, float]]) -> tuple[float, float]:
    """Vector from the base midpoint to the tip — the tip is the vertex farthest from the midpoint of the
    other two. This is the direction the arrowhead points in its own (un-rotated) coordinate system."""
    best_d2, best_vec = -1.0, (0.0, 0.0)
    for i in range(3):
        tip = verts[i]
        a, b = verts[(i + 1) % 3], verts[(i + 2) % 3]
        mid = ((a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0)
        vec = (tip[0] - mid[0], tip[1] - mid[1])
        d2 = vec[0] ** 2 + vec[1] ** 2
        if d2 > best_d2:
            best_d2, best_vec = d2, vec
    return best_vec


def _bbox_max_dim(verts: list[tuple[float, float]]) -> float:
    xs = [v[0] for v in verts]
    ys = [v[1] for v in verts]
    return max(max(xs) - min(xs), max(ys) - min(ys))


def check_svg_drawing_hygiene():
    """Scan every `book/assets/*.svg` for native-construct violations (AUDIT-ONLY). Three checks, each a
    real bug the text-fit heuristic can't see:
      - **marker not +x** — a `<marker orient="auto">` arrowhead triangle drawn pointing up/down/backward
        instead of along +x; `orient` rotates it, so it lands perpendicular/off-target (the semantic-gap
        bug). The apex must point +x.
      - **stitched arrowhead** — a small filled triangle used as an arrowhead OUTSIDE a `<marker>`
        (hand-composed; use a native marker so it can't drift off the line).
      - **stroke through glyph** — a `<line>` whose stroke passes through a `<text>`'s estimated bbox.
    Heuristic; audit-only. Fix guidance -> the drawing style doc."""
    targets = _scan_svgs()
    if not targets:
        return PASS, ["no book/assets/ dir — nothing to scan"]

    issues: list[str] = []
    flagged: set[str] = set()
    for fn in targets:
        path = os.path.join(_SCAN_DIR, fn)
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError:
            continue  # the text-fit pass already reports parse errors
        style_classes = _parse_style_font_sizes(root)

        # element ids that live inside a <marker> — so the stitched-arrowhead check skips marker contents.
        in_marker: set[int] = set()
        for el in root.iter():
            if _local(el.tag) == "marker":
                for d in el.iter():
                    in_marker.add(id(d))

        # (1) marker orient=auto arrowhead must be drawn in the +x convention.
        for el in root.iter():
            if _local(el.tag) != "marker":
                continue
            if "auto" not in (el.get("orient") or ""):
                continue
            for shape in el.iter():
                verts = None
                if _local(shape.tag) == "path" and shape.get("d"):
                    verts = _triangle_from_path_d(shape.get("d"))
                elif _local(shape.tag) == "polygon" and shape.get("points"):
                    verts = _triangle_from_points(shape.get("points"))
                if not verts:
                    continue
                vx, vy = _tip_vector(verts)
                if abs(vy) > abs(vx) or vx <= 0:  # points vertical or backward, not +x
                    issues.append(
                        f"{rel(path)}: MARKER not +x — arrowhead in <marker id={el.get('id')!r}> points "
                        f"({vx:+.1f},{vy:+.1f}); orient=auto expects apex along +x, so this lands off-axis")
                    flagged.add(fn)

        # (2) a small filled triangle used as an arrowhead OUTSIDE a marker = hand-stitched.
        for el in root.iter():
            if id(el) in in_marker:
                continue
            fill = (el.get("fill") or "").strip().lower()
            if fill in ("none", ""):
                continue  # unfilled = a connector/bracket outline, not an arrowhead
            verts = None
            if _local(el.tag) == "path" and el.get("d"):
                verts = _triangle_from_path_d(el.get("d"))
            elif _local(el.tag) == "polygon" and el.get("points"):
                verts = _triangle_from_points(el.get("points"))
            if verts and _bbox_max_dim(verts) <= _ARROWHEAD_BBOX_MAX:
                issues.append(
                    f"{rel(path)}: STITCHED arrowhead — a filled triangle ({_local(el.tag)}, "
                    f"~{_bbox_max_dim(verts):.0f}u) outside any <marker>; use a native marker so it can't drift")
                flagged.add(fn)

        # (3) a <line> stroke must not run through a <text> glyph box.
        texts: list[tuple[float, float, float, float]] = []  # (left, top, right, bottom)
        for el in root.iter():
            if _local(el.tag) != "text":
                continue
            t = _text_content(el)
            x, y = _num(el.get("x")), _num(el.get("y"))
            if not t or x is None or y is None:
                continue
            fw = _font_size_and_weight(el, style_classes)
            if fw is None:
                continue
            size, bold = fw
            lo, ro = _text_extent(t, size, bold, (el.get("text-anchor") or "start").strip())
            texts.append((x + lo, y - size * 0.72, x + ro, y + size * 0.22))
        for el in root.iter():
            if _local(el.tag) != "line":
                continue
            x1, y1 = _num(el.get("x1")), _num(el.get("y1"))
            x2, y2 = _num(el.get("x2")), _num(el.get("y2"))
            if None in (x1, y1, x2, y2):
                continue
            for (tl, tt, tr, tb) in texts:
                # sample the segment interior (skip the endpoints, where a line legitimately meets a label)
                hit = False
                for k in range(2, 19):  # t in ~0.10..0.95
                    tt_ = k / 20.0
                    px = x1 + tt_ * (x2 - x1)  # type: ignore[operator]
                    py = y1 + tt_ * (y2 - y1)  # type: ignore[operator]
                    if tl < px < tr and tt < py < tb:
                        hit = True
                        break
                if hit:
                    issues.append(
                        f"{rel(path)}: STROKE through glyph — a <line> passes through a text box "
                        f"(~x{tl:.0f}-{tr:.0f}, y{tt:.0f}-{tb:.0f}); route it aside, break it, or move the text")
                    flagged.add(fn)
                    break

    if issues:
        issues.insert(0, f"{len(flagged)} figure(s) with native-construct / stroke-through-glyph issues:")
        issues.append("")
        issues.append(f"AUDIT-ONLY (heuristic; false positives expected). Fix guidance -> {DRAWING_DOC}")
    return PASS, issues  # AUDIT-ONLY: never FAIL


# ---- text-label overlap + stroke-cross-through-unrelated-element -------------------------------------
# Two blind spots the checks above miss, each a real defect on a rendered figure:
#   - text-label overlap: two <text> boxes colliding, printing on top of each other ("...inertno").
#   - stroke cross-through: a stroked <path>/<line> (CURVES included — the drawing-hygiene stroke-through
#     reasons only about straight segments) running through a <text> or node <rect> it neither starts nor
#     ends at. Endpoint-connection exempts the arrowhead's own target, so only pass-through flags.
# Both use the conservative low glyph ratio so an over-read can't manufacture a phantom collision.

TEXT_OVERLAP_H_MIN_FRAC = 0.5
TEXT_OVERLAP_V_MIN_FRAC = 0.25
_CROSS_GLYPH_RATIO = 0.42
CROSS_CONNECT_MARGIN = 12.0
_CROSS_RECT_INSET = 1.5
_CROSS_TEXT_INSET = 0.5
_CROSS_CURVE_SAMPLES = 18


def _transformed_ids(root: ET.Element) -> set[int]:
    """`id()` of every element carrying a `transform` or under an ancestor that does — its x/y are not
    absolute canvas coordinates, so the flat-coordinate geometry would be wrong; the checks skip them."""
    parent = {c: p for p in root.iter() for c in p}
    out: set[int] = set()
    for el in root.iter():
        node: ET.Element | None = el
        while node is not None:
            if node.get("transform"):
                out.add(id(el))
                break
            node = parent.get(node)
    return out


def _text_bbox(el: ET.Element, style_classes: dict[str, tuple[float, bool]],
               ratio: float | None = None) -> tuple[float, float, float, float] | None:
    t = _text_content(el)
    x, y = _num(el.get("x")), _num(el.get("y"))
    if not t or x is None or y is None:
        return None
    fw = _font_size_and_weight(el, style_classes)
    if fw is None:
        return None
    size, bold = fw
    ratio = _CROSS_GLYPH_RATIO if ratio is None else ratio
    width = len(t) * size * ratio
    anchor = (el.get("text-anchor") or "start").strip()
    if anchor == "middle":
        lo, ro = -width / 2.0, width / 2.0
    elif anchor == "end":
        lo, ro = -width, 0.0
    else:
        lo, ro = 0.0, width
    return (x + lo, y - size * 0.72, x + ro, y + size * 0.22)


def check_svg_text_overlap():
    """Flag a pair of <text> labels whose estimated glyph boxes overlap in BOTH axes (past a per-axis
    floor) — two captions printing on top of each other. AUDIT-ONLY (always PASS)."""
    targets = _scan_svgs()
    if not targets:
        return PASS, ["no book/assets/ dir — nothing to scan"]
    issues: list[str] = []
    flagged: set[str] = set()
    for fn in targets:
        path = os.path.join(_SCAN_DIR, fn)
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError:
            continue
        style_classes = _parse_style_font_sizes(root)
        transformed = _transformed_ids(root)
        labels: list[tuple[str, tuple[float, float, float, float], float]] = []
        for el in root.iter():
            if _local(el.tag) != "text" or id(el) in transformed:
                continue
            fw = _font_size_and_weight(el, style_classes)
            bbox = _text_bbox(el, style_classes)
            if fw is None or bbox is None:
                continue
            txt = _text_content(el)
            labels.append((txt if len(txt) <= 34 else txt[:31] + "...", bbox, fw[0]))
        for i in range(len(labels)):
            for j in range(i + 1, len(labels)):
                (li, (al, at, ar, ab), si) = labels[i]
                (lj, (bl, bt, br, bb), sj) = labels[j]
                h_ov = min(ar, br) - max(al, bl)
                v_ov = min(ab, bb) - max(at, bt)
                if h_ov <= 0 or v_ov <= 0:
                    continue
                fs = min(si, sj)
                if h_ov < TEXT_OVERLAP_H_MIN_FRAC * fs or v_ov < TEXT_OVERLAP_V_MIN_FRAC * fs:
                    continue
                issues.append(
                    f"{rel(path)}: TEXT overlap — {li!r} and {lj!r} render on top of each other "
                    f"(~{h_ov:.0f}u x ~{v_ov:.0f}u overlap) — separate the labels")
                flagged.add(fn)
    if issues:
        issues.insert(0, f"{len(flagged)} figure(s) with overlapping text labels:")
        issues.append("")
        issues.append(f"AUDIT-ONLY (heuristic; false positives expected). Fix guidance -> {DRAWING_DOC}")
    return PASS, issues


def _flatten_path_points(d: str) -> list[tuple[float, float]] | None:
    """Flatten an absolute-command <path> (M L H V C Q Z) to a polyline, sampling Béziers; None (skip) for
    relative / arc / smooth commands we do not reason about."""
    tokens = re.findall(r"-?\d*\.?\d+(?:[eE][-+]?\d+)?|[A-Za-z]", d)
    pts: list[tuple[float, float]] = []
    i, n = 0, len(tokens)
    cur = (0.0, 0.0)
    sub_start = (0.0, 0.0)
    cmd: str | None = None

    def _take() -> float:
        nonlocal i
        v = float(tokens[i])
        i += 1
        return v

    try:
        while i < n:
            tok = tokens[i]
            if tok.isalpha():
                cmd = tok
                i += 1
                if cmd not in "MLHVCQZ":
                    return None
                if cmd == "Z":
                    cur = sub_start
                    pts.append(cur)
                    cmd = None
                    continue
            if cmd is None:
                return None
            if cmd == "M":
                cur = (_take(), _take())
                sub_start = cur
                pts.append(cur)
                cmd = "L"
            elif cmd == "L":
                cur = (_take(), _take())
                pts.append(cur)
            elif cmd == "H":
                cur = (_take(), cur[1])
                pts.append(cur)
            elif cmd == "V":
                cur = (cur[0], _take())
                pts.append(cur)
            elif cmd == "C":
                p1 = (_take(), _take())
                p2 = (_take(), _take())
                p3 = (_take(), _take())
                for k in range(1, _CROSS_CURVE_SAMPLES + 1):
                    t = k / _CROSS_CURVE_SAMPLES
                    mt = 1 - t
                    pts.append((mt**3 * cur[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0],
                                mt**3 * cur[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1]))
                cur = p3
            elif cmd == "Q":
                p1 = (_take(), _take())
                p2 = (_take(), _take())
                for k in range(1, _CROSS_CURVE_SAMPLES + 1):
                    t = k / _CROSS_CURVE_SAMPLES
                    mt = 1 - t
                    pts.append((mt * mt * cur[0] + 2 * mt * t * p1[0] + t * t * p2[0],
                                mt * mt * cur[1] + 2 * mt * t * p1[1] + t * t * p2[1]))
                cur = p2
    except (ValueError, IndexError):
        return None
    return pts if len(pts) >= 2 else None


def _connector_points(el: ET.Element) -> list[tuple[float, float]] | None:
    tag = _local(el.tag)
    if tag == "line":
        x1, y1 = _num(el.get("x1")), _num(el.get("y1"))
        x2, y2 = _num(el.get("x2")), _num(el.get("y2"))
        if None in (x1, y1, x2, y2):
            return None
        return [(x1, y1), (x2, y2)]  # type: ignore[list-item]
    if tag == "path":
        d = el.get("d") or ""
        if not d or _triangle_from_path_d(d) is not None:
            return None
        return _flatten_path_points(d)
    return None


def _near_box(px: float, py: float, box: tuple[float, float, float, float], margin: float) -> bool:
    l, t, r, b = box
    return (l - margin) <= px <= (r + margin) and (t - margin) <= py <= (b + margin)


def check_svg_stroke_crossthrough():
    """Flag a stroked <path>/<line> (curves included) that runs THROUGH a <text> or node <rect> it neither
    starts nor ends at (endpoint-connection exempts the arrowhead's own target). AUDIT-ONLY (always PASS)."""
    targets_files = _scan_svgs()
    if not targets_files:
        return PASS, ["no book/assets/ dir — nothing to scan"]
    issues: list[str] = []
    flagged: set[str] = set()
    for fn in targets_files:
        path = os.path.join(_SCAN_DIR, fn)
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError:
            continue
        style_classes = _parse_style_font_sizes(root)
        transformed = _transformed_ids(root)
        vb_w = _viewbox_width(root)
        in_marker: set[int] = set()
        for el in root.iter():
            if _local(el.tag) == "marker":
                for d in el.iter():
                    in_marker.add(id(d))
        targets: list[tuple[str, tuple[float, float, float, float], float]] = []
        for r in _collect_rects(root, vb_w):
            targets.append((f"rect x={r.x:.0f} w={r.w:.0f} y={r.y:.0f} h={r.h:.0f}",
                            (r.x, r.y, r.x + r.w, r.y + r.h), _CROSS_RECT_INSET))
        for el in root.iter():
            if _local(el.tag) != "text" or id(el) in transformed:
                continue
            bbox = _text_bbox(el, style_classes)
            if bbox is None:
                continue
            txt = _text_content(el)
            targets.append((f"text {(txt if len(txt) <= 30 else txt[:27] + '...')!r}", bbox, _CROSS_TEXT_INSET))
        for el in root.iter():
            if _local(el.tag) not in ("path", "line") or id(el) in transformed or id(el) in in_marker:
                continue
            fill = (el.get("fill") or "").strip().lower()
            stroke = (el.get("stroke") or "").strip().lower()
            if stroke in ("", "none") and fill not in ("", "none"):
                continue
            pts = _connector_points(el)
            if not pts or len(pts) < 3:
                continue
            p0, pN = pts[0], pts[-1]
            interior = pts[1:-1]
            for name, box, inset in targets:
                if _near_box(*p0, box, CROSS_CONNECT_MARGIN) or _near_box(*pN, box, CROSS_CONNECT_MARGIN):
                    continue
                l, t, r, b = box
                for (px, py) in interior:
                    if (l + inset) < px < (r - inset) and (t + inset) < py < (b - inset):
                        issues.append(
                            f"{rel(path)}: STROKE cross-through — a <{_local(el.tag)}> passes through "
                            f"{name} it does not start or end at — reroute it clear of the element")
                        flagged.add(fn)
                        break
                else:
                    continue
                break
    if issues:
        issues.insert(0, f"{len(flagged)} figure(s) with a stroke crossing through an unrelated element:")
        issues.append("")
        issues.append(f"AUDIT-ONLY (heuristic; false positives expected). Fix guidance -> {DRAWING_DOC}")
    return PASS, issues


if __name__ == "__main__":
    for _fn in (check_svg_text_fit, check_svg_drawing_hygiene, check_svg_text_overlap,
                check_svg_stroke_crossthrough):
        _status, _msgs = _fn()
        for _m in _msgs:
            print(_m)
        print()
