"""SVG text-fit check (AUDIT-ONLY): does a hand-authored figure's text overflow its box or the canvas?

Some `book/assets/*.svg` figures render with a label spilling past its `<rect>` box, or past the
`viewBox` edge — the author has seen both. This check estimates each `<text>`'s rendered width from a
cheap average-glyph heuristic and flags the two priority cases:

  - **box overflow** — a `<text>` that sits inside a `<rect>` whose estimated horizontal extent exceeds
    the box's inner width (box width minus a small padding); the label likely spills its box.
  - **canvas overflow** — a `<text>` whose estimated horizontal extent runs past the `viewBox` width;
    the label likely spills the whole figure.

**This is a HEURISTIC, and a crude one.** Rendered glyph width varies by font, kerning, and glyph mix, so an
average-ratio estimate (`len(text) * font-size * ~0.55`, `~0.6` bold) over-reads real width by ~30-50%
(measured against the per-glyph model) and WILL produce false positives. It runs **AUDIT-ONLY**: it reports
candidates and returns exit-neutral (never contributes to the fail count). It is NOT the box-overflow gate —
box-overflow is owned by the accurate per-glyph sensor (`book-models/lint_figure_overflow.py`, a model of
the print renderer at ~0.8% error, wired blocking into `catalog.py validate`). The flat ratio cannot be
promoted to a real box gate: the true per-string ratio varies 0.36-0.43, so no single constant separates
phantoms from genuine overruns. This pass is retained only as a low-harm pre-filter for the CANVAS-edge case
the per-glyph gate does not cover. Label-over-arrow overlap is a known gap.

When it flags a figure, the report points the reader at the fix runbook so an agent knows where to go.
"""
from __future__ import annotations

import math
import os
import re
import xml.etree.ElementTree as ET

from tests.common import FAIL, PASS, ROOT, rel

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


def _text_extent(text: str, size: float, bold: bool, anchor: str, ratio: float | None = None) -> tuple[float, float]:
    """(left_x_offset, right_x_offset) of the estimated text run relative to the element's x.

    Width ~= len * size * ratio. `text-anchor` decides how the run sits about the x point:
    `start` runs rightward, `middle` centers, `end` runs leftward. `ratio` overrides the default
    glyph-width fraction — a caller testing whether text CROSSES INTO a box passes a lower, truer ratio so
    the audit's deliberately-high default can't manufacture a phantom overlap.
    """
    if ratio is None:
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
    assets_dir = os.path.join(ROOT, "book", "assets")
    if not os.path.isdir(assets_dir):
        return PASS, ["no book/assets/ dir — nothing to scan"]

    issues: list[str] = []
    flagged_files: set[str] = set()
    for fn in sorted(os.listdir(assets_dir)):
        if not fn.endswith(".svg"):
            continue
        path = os.path.join(assets_dir, fn)
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


# ---- page-fit sensor: a figure taller than the page (AUDIT-ONLY) -------------------------------------
# The print build sizes each `<!-- figure: -->` image to IMAGE_WIDTH_FRAC of the text measure and applies
# no height cap, so a pathologically tall viewBox projects past the page bottom and clips (the folio
# collision the messy-timeline figure hit at 11.6in). This reads each asset's viewBox aspect and flags any
# whose projected print height exceeds the text page minus a caption budget. Deterministic — a pure function
# of the viewBox — unlike the glyph-width heuristics above; detect-and-fail beats silent auto-scale for a
# print book (auto-scaling to fit shrinks the text quietly instead). Promoted to BLOCKING (the tree is
# drained to 0), so a newly-added too-tall figure fails the gate rather than only reporting.
TEXT_WIDTH_IN = 6.3        # book text-measure width (US-Letter) — the figure's 100% reference
PAGE_HEIGHT_IN = 9.0       # text-area height on the page
IMAGE_WIDTH_FRAC = 0.85    # a `<!-- figure: -->` renders at image(width: 85%) of the measure
CAPTION_BUDGET_IN = 0.5    # vertical room a figure must leave below itself for its caption
PAGE_FIT_LIMIT_IN = PAGE_HEIGHT_IN - CAPTION_BUDGET_IN


def _viewbox_dims(root: ET.Element) -> tuple[float, float] | None:
    """(width, height) from the viewBox (preferred) or the width/height attributes; None if neither gives both."""
    vb = root.get("viewBox")
    if vb:
        parts = re.split(r"[\s,]+", vb.strip())
        if len(parts) == 4:
            return float(parts[2]), float(parts[3])
    w, h = _num(root.get("width")), _num(root.get("height"))
    return (w, h) if (w and h) else None


def check_svg_page_fit():
    """Scan every `book/assets/*.svg`; flag any whose projected print height overflows the page.

    projected_height = IMAGE_WIDTH_FRAC * TEXT_WIDTH_IN * (viewBox_h / viewBox_w). A figure clearing
    PAGE_FIT_LIMIT_IN (page height minus a caption budget) will clip on the page. BLOCKING: FAIL on any
    overflow (deterministic — a pure function of the viewBox; the tree is drained to 0 at promotion).
    """
    assets_dir = os.path.join(ROOT, "book", "assets")
    if not os.path.isdir(assets_dir):
        return PASS, ["no book/assets/ dir — nothing to scan"]

    issues: list[str] = []
    for fn in sorted(os.listdir(assets_dir)):
        if not fn.endswith(".svg"):
            continue
        try:
            root = ET.parse(os.path.join(assets_dir, fn)).getroot()
        except ET.ParseError:
            continue  # parse errors are already reported by the text-fit pass
        dims = _viewbox_dims(root)
        if not dims:
            continue
        w, h = dims
        if w <= 0:
            continue
        projected = IMAGE_WIDTH_FRAC * TEXT_WIDTH_IN * (h / w)
        if projected > PAGE_FIT_LIMIT_IN:
            issues.append(
                f"book/assets/{fn}: projected height {projected:.2f}in exceeds page-fit limit "
                f"{PAGE_FIT_LIMIT_IN:.2f}in (viewBox {w:.0f}x{h:.0f}, aspect {h / w:.2f}) — densify the "
                f"figure (cut vertical slack, keep the viewBox width so text stays legible) or split it")

    if issues:
        issues.insert(0, f"{len(issues)} figure(s) taller than the page (limit {PAGE_FIT_LIMIT_IN:.2f}in = "
                         f"{PAGE_HEIGHT_IN:.1f}in page - {CAPTION_BUDGET_IN:.1f}in caption):")
    return (FAIL if issues else PASS), issues  # BLOCKING: a figure taller than the page fails the gate


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


# ---- shaftless-arrow (C5) constants + marker/connector helpers --------------------------------------
# A `marker-end` triangle renders `markerWidth` units long, scaled by the line's stroke-width when
# `markerUnits` is the SVG default `strokeWidth`. If the connector's final segment is barely longer than
# that, the arrowhead eats the whole shaft and the connector reads as a bare floating triangle (the
# 20px/stroke-3/markerWidth-7 down-arrows that rendered shaft-less). Flag when the visible remainder falls
# below a minimum.
MIN_VISIBLE_SHAFT = 8.0        # user units of shaft that must remain visible behind the arrowhead
DEFAULT_MARKER_WIDTH = 3.0     # SVG spec default markerWidth when the attribute is absent
DEFAULT_STROKE_WIDTH = 1.0     # SVG spec default stroke-width when the attribute is absent


def _marker_end_id(el: ET.Element) -> str | None:
    """The referenced marker id from `marker-end="url(#id)"` (attribute or inline `style`); None if absent."""
    v = el.get("marker-end") or ""
    if not v:
        style = el.get("style") or ""
        m = re.search(r"marker-end\s*:\s*url\(#([^)]+)\)", style)
        return m.group(1) if m else None
    m = re.search(r"url\(#([^)]+)\)", v)
    return m.group(1) if m else None


def _collect_markers(root: ET.Element) -> dict[str, tuple[float, str]]:
    """Map each `<marker id=...>` to (markerWidth, markerUnits). Defaults per SVG spec: width 3,
    units `strokeWidth`."""
    out: dict[str, tuple[float, str]] = {}
    for el in root.iter():
        if _local(el.tag) != "marker":
            continue
        mid = el.get("id")
        if not mid:
            continue
        mw = _num(el.get("markerWidth"))
        units = (el.get("markerUnits") or "strokeWidth").strip()
        out[mid] = (mw if mw is not None else DEFAULT_MARKER_WIDTH, units)
    return out


def _stroke_width(el: ET.Element) -> float:
    n = _num(el.get("stroke-width")) if el.get("stroke-width") else None
    return n if n is not None else DEFAULT_STROKE_WIDTH


def _transformed_ids(root: ET.Element) -> set[int]:
    """`id()` of every element that carries a `transform` OR sits under an ancestor that does. Those
    elements' x/y are NOT absolute canvas coordinates, so the flat-coordinate collision/shaft geometry
    would be wrong for them — the checks skip them (a documented conservative limitation, not a silent gap;
    the hand-authored glossary figures are flat, transform-free)."""
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


def _final_segment(el: ET.Element) -> tuple[tuple[float, float], tuple[float, float]] | None:
    """The last drawn segment (the one bearing a `marker-end`) of a `<line>`, `<polyline>`, or pure
    absolute M/L `<path>`; None for curves/arcs or degenerate geometry. The visible shaft the reader sees
    behind the arrowhead is this segment's length."""
    tag = _local(el.tag)
    if tag == "line":
        x1, y1 = _num(el.get("x1")), _num(el.get("y1"))
        x2, y2 = _num(el.get("x2")), _num(el.get("y2"))
        if None in (x1, y1, x2, y2):
            return None
        return (x1, y1), (x2, y2)  # type: ignore[return-value]
    if tag == "polyline":
        nums = re.findall(r"-?[0-9.]+", el.get("points") or "")
        if len(nums) < 4:
            return None
        pts = [(float(nums[i]), float(nums[i + 1])) for i in range(0, len(nums) - 1, 2)]
        return (pts[-2], pts[-1])
    if tag == "path":
        d = el.get("d") or ""
        if not d or re.search(r"[csqtahvCSQTAHV]|[mlz]", d):
            return None  # curves / arcs / relative — don't reason about it
        if _triangle_from_path_d(d) is not None:
            return None  # an arrowhead triangle, not a connector
        nums = re.findall(r"-?[0-9.]+", d)
        if len(nums) < 4:
            return None
        pts = [(float(nums[i]), float(nums[i + 1])) for i in range(0, len(nums) - 1, 2)]
        return (pts[-2], pts[-1])
    return None


def check_svg_drawing_hygiene():
    """Scan every `book/assets/*.svg` for native-construct violations (AUDIT-ONLY). Four checks, each a
    real bug the text-fit heuristic can't see:
      - **marker not +x** — a `<marker orient="auto">` arrowhead triangle drawn pointing up/down/backward
        instead of along +x; `orient` rotates it, so it lands perpendicular/off-target (the semantic-gap
        bug). The apex must point +x.
      - **stitched arrowhead** — a small filled triangle used as an arrowhead OUTSIDE a `<marker>`
        (hand-composed; use a native marker so it can't drift off the line).
      - **stroke through glyph** — a `<line>` OR a straight-segment `<path>` polyline whose stroke passes
        through a `<text>`'s estimated bbox.
      - **shaftless arrow (C5)** — a `<line>`/`<polyline>`/pure-M/L `<path>` whose final segment is so
        short the `marker-end` arrowhead consumes the whole shaft, so the connector reads as a bare
        floating triangle. Exact geometry: visible = segment_len - marker_len, flagged below MIN_VISIBLE_SHAFT.
    Heuristic; audit-only. Fix guidance -> the drawing style doc."""
    assets_dir = os.path.join(ROOT, "book", "assets")
    if not os.path.isdir(assets_dir):
        return PASS, ["no book/assets/ dir — nothing to scan"]

    issues: list[str] = []
    flagged: set[str] = set()
    for fn in sorted(os.listdir(assets_dir)):
        if not fn.endswith(".svg"):
            continue
        path = os.path.join(assets_dir, fn)
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

        # (3b) a straight-segment <path> stroke must not run through a <text> glyph box either. Many
        # connectors are polyline paths (`M x,y L x,y L x,y`), not <line>s — the <line>-only test above is
        # blind to them (this is the class that hid the input-spine-through-lane-label collision). Only
        # reason about pure M/L polylines (skip curves/arcs/relative/H-V per _triangle_from_path_d's guard),
        # skip marker-internal shapes, and skip the tiny closed triangles the stitched-arrowhead check owns.
        for el in root.iter():
            if _local(el.tag) != "path" or id(el) in in_marker:
                continue
            d = el.get("d") or ""
            if not d or re.search(r"[csqtahvCSQTAHV]|[mlz]", d):
                continue  # not a pure absolute M/L polyline — don't reason about it
            if _triangle_from_path_d(d) is not None:
                continue  # an arrowhead triangle, not a connector
            nums = re.findall(r"-?[0-9.]+", d)
            if len(nums) < 4:
                continue
            pts = [(float(nums[i]), float(nums[i + 1])) for i in range(0, len(nums) - 1, 2)]
            hit = False
            for (ax, ay), (bx, by) in zip(pts, pts[1:]):
                if ax == bx and ay == by:
                    continue  # zero-length segment
                for (tl, tt, tr, tb) in texts:
                    for k in range(2, 19):  # sample the segment interior (skip endpoints)
                        tt_ = k / 20.0
                        px = ax + tt_ * (bx - ax)
                        py = ay + tt_ * (by - ay)
                        if tl < px < tr and tt < py < tb:
                            hit = True
                            break
                    if hit:
                        break
                if hit:
                    issues.append(
                        f"{rel(path)}: STROKE through glyph — a <path> segment passes through a text box "
                        f"(~x{tl:.0f}-{tr:.0f}, y{tt:.0f}-{tb:.0f}); route it aside, break it, or move the text")
                    flagged.add(fn)
                    break

        # (4) shaftless arrow (C5): a marker-end connector whose final segment is shorter than the
        # rendered arrowhead, so the arrowhead swallows the shaft. Exact connector/marker geometry — no
        # text-width estimate, so essentially no false positives. Skips transformed connectors (coords not
        # absolute) and unresolvable marker refs.
        markers = _collect_markers(root)
        transformed = _transformed_ids(root)
        if markers:
            for el in root.iter():
                if _local(el.tag) not in ("line", "polyline", "path"):
                    continue
                if id(el) in transformed:
                    continue
                mid = _marker_end_id(el)
                if not mid or mid not in markers:
                    continue
                seg = _final_segment(el)
                if seg is None:
                    continue
                (ax, ay), (bx, by) = seg
                shaft = math.hypot(bx - ax, by - ay)
                if shaft <= 0:
                    continue
                mw, units = markers[mid]
                strokescaled = units in ("", "strokeWidth")
                marker_len = mw * _stroke_width(el) if strokescaled else mw
                visible = shaft - marker_len
                if visible < MIN_VISIBLE_SHAFT:
                    issues.append(
                        f"{rel(path)}: SHAFTLESS arrow — a <{_local(el.tag)}> carrying "
                        f"marker-end=url(#{mid}) has final segment {shaft:.0f}u but the arrowhead renders "
                        f"~{marker_len:.0f}u ({'markerWidth ' + format(mw, '.0f') + ' x stroke ' + format(_stroke_width(el), '.0f') if strokescaled else 'markerWidth ' + format(mw, '.0f') + ' userSpace'}), "
                        f"leaving {visible:.0f}u visible (< {MIN_VISIBLE_SHAFT:.0f}u) — lengthen the shaft, "
                        f"shrink the marker, or set markerUnits=userSpaceOnUse")
                    flagged.add(fn)

    if issues:
        issues.insert(0, f"{len(flagged)} figure(s) with native-construct / stroke-through-glyph issues:")
        issues.append("")
        issues.append(f"AUDIT-ONLY (heuristic; false positives expected). Fix guidance -> {DRAWING_DOC}")
    return PASS, issues  # AUDIT-ONLY: never FAIL


# ---- edge-label <-> node-box collision (C3) (AUDIT-ONLY) ---------------------------------------------
# The PAGE-level PDF sensors treat an embedded figure as one opaque image, so an edge-verb label
# overrunning a node box INSIDE the figure's own coordinate space is invisible to them. This parses the
# SVG DOM and tests, per figure, whether a free connector label crowds a node box it does not own.
#
# The formulation is an ASYMMETRIC INFLATE, not a naive bbox-intersection. A label can clear a box
# vertically by a few pixels in the narrow render metrics yet cross it in the wider print metrics — a
# strict "label bbox intersects box" test misses exactly that near-miss (why the compiled-PDF gate passed
# the "compounds into" overhang falsely). So: require real horizontal overlap (>= C3_H_OVERLAP_MIN_FRAC of
# the font size — a label merely adjacent is not flagged) AND less than a full line-height of vertical
# clearance (C3_V_CLEAR_FRAC). The vertical band swamps any glyph-width estimation error, so the crude
# `_text_extent` ratio suffices here (unlike the box-fit gate, which needs the accurate per-glyph model).
C3_H_OVERLAP_MIN_FRAC = 0.5   # horizontal overlap floor: a free label must cover >= 0.5*fs of the box's x
# The trigger is a NEAR-crossing, not a comfortable clearance: the confirmed defect ("compounds into") sat
# ~7px above a box top (< 0.5*fs at fs16) and crossed it in the wider print metrics, while the accepted
# grazes elsewhere clear by ~12-13px (~0.8*fs). Calibrated to that boundary so accepted grazes don't flag.
C3_V_CLEAR_FRAC = 0.5         # a free label must clear the box vertically by >= 0.5 line-height, else flag
# For the horizontal CROSS-INTO decision, use the high end of the measured true per-string ratio
# (0.36-0.43), NOT the audit's deliberately-high 0.55 default — a 30-50% over-read would otherwise
# manufacture a phantom overlap for a label whose true glyphs clear the box edge.
C3_GLYPH_RATIO = 0.42

# Conservative fill-scoping (the DoD's high-precision form). The failure class — a floating verb-on-edge
# label crowding a node box — lives in the concept-map / vocabulary figure family, which paints edge-verb
# labels in a muted stone grey and node boxes in a light/dark card fill. Scoping the check to those fills
# keeps it precise: a bar-chart bar, an axis tick, a triangle vertex, or a prose caption in any other
# figure carries neither fill, so it is never tested and never false-flagged. A label INSIDE its own box
# (a node title) is dark on the card and is separately exempted by the anchor-inside-box test.
C3_EDGE_LABEL_FILLS = {"#78716c"}            # floating connector-verb label colour
C3_NODE_BOX_FILLS = {"#f6f4ef", "#1c1917"}   # light card / dark card node-box fills


def _fill(el: ET.Element) -> str:
    """Resolve an element's fill (attribute or inline `style`), lower-cased; '' if none."""
    v = (el.get("fill") or "").strip().lower()
    if v:
        return v
    m = re.search(r"fill\s*:\s*([^;]+)", el.get("style") or "")
    return m.group(1).strip().lower() if m else ""


def _collect_node_box_rects(root: ET.Element, transformed: set[int]) -> list[_Rect]:
    """Every `<rect>` painted a node-box fill and not under a transform — the boxes a floating edge-label
    must not crowd. Narrower scope than `_collect_rects` (fill-typed), so chart bars / panels / frames
    (other fills) are excluded by construction."""
    rects: list[_Rect] = []
    for el in root.iter():
        if _local(el.tag) != "rect" or id(el) in transformed:
            continue
        if _fill(el) not in C3_NODE_BOX_FILLS:
            continue
        x, y = _num(el.get("x")), _num(el.get("y"))
        w, h = _num(el.get("width")), _num(el.get("height"))
        if None in (x, y, w, h) or w <= 0 or h <= 0:
            continue
        rects.append(_Rect(x, y, w, h))  # type: ignore[arg-type]
    return rects


def check_svg_edge_label_box_collision():
    """Scan every `book/assets/*.svg`; flag a free connector label that crowds a node box it does not own.

    For each `<text>` whose anchor sits OUTSIDE every node `<rect>` (a free edge/verb label floating in the
    connector band — an anchor INSIDE a rect is that node's own title/subtitle and is exempt; the accurate
    box-fit gate owns those), estimate its bbox and test the ASYMMETRIC INFLATE against every node rect:
    horizontal overlap >= C3_H_OVERLAP_MIN_FRAC*fs AND vertical clearance < C3_V_CLEAR_FRAC*fs => collision.
    Skips transformed elements (coords not absolute) — the hand-authored figures are flat.

    AUDIT-ONLY: always returns (PASS, issues) — reports candidates, never contributes to the fail count.
    """
    assets_dir = os.path.join(ROOT, "book", "assets")
    if not os.path.isdir(assets_dir):
        return PASS, ["no book/assets/ dir — nothing to scan"]

    issues: list[str] = []
    flagged: set[str] = set()
    for fn in sorted(os.listdir(assets_dir)):
        if not fn.endswith(".svg"):
            continue
        path = os.path.join(assets_dir, fn)
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError:
            continue  # the text-fit pass already reports parse errors
        style_classes = _parse_style_font_sizes(root)
        transformed = _transformed_ids(root)
        rects = _collect_node_box_rects(root, transformed)
        if not rects:
            continue

        for el in root.iter():
            if _local(el.tag) != "text" or id(el) in transformed:
                continue
            if _fill(el) not in C3_EDGE_LABEL_FILLS:
                continue  # only floating connector-verb labels are candidates (fill-scoped, low-FP)
            text = _text_content(el)
            if not text:
                continue
            x, y = _num(el.get("x")), _num(el.get("y"))
            if x is None or y is None:
                continue
            fw = _font_size_and_weight(el, style_classes)
            if fw is None:
                continue
            size, bold = fw
            # A label whose anchor lies inside a node box is that box's own title/subtitle — exempt.
            if any(r.contains_point(x, y) for r in rects):
                continue
            anchor = (el.get("text-anchor") or "start").strip()
            lo, ro = _text_extent(text, size, bold, anchor, ratio=C3_GLYPH_RATIO)
            left, right = x + lo, x + ro
            top, bottom = y - size * 0.72, y + size * 0.22
            h_floor = C3_H_OVERLAP_MIN_FRAC * size
            v_clr = C3_V_CLEAR_FRAC * size
            label = text if len(text) <= 42 else text[:39] + "..."
            for r in rects:
                # The anchor point must sit OUTSIDE the box's x-span: a label anchored WITHIN a box's
                # column is that column's own connector label (it shares the box x-range by construction —
                # a vertical-flow verb in the gap between two stacked boxes), NOT a label crossing into a
                # box it doesn't belong to. The real defect anchors beside/above an offset box and its tail
                # crosses in (compounds-into anchored at x=828, left of the box at 844-984).
                if r.x <= x <= r.x + r.w:
                    continue
                h_ov = min(right, r.x + r.w) - max(left, r.x)
                if h_ov < h_floor:
                    continue  # not horizontally over the box (merely adjacent) — no crowding
                # inflate the label band vertically by a full line-height; does it now reach the box?
                if bottom + v_clr < r.y or top - v_clr > r.y + r.h:
                    continue  # clears the box vertically by more than a line-height — safe
                gap = min(abs(r.y - bottom), abs(top - (r.y + r.h)))
                issues.append(
                    f"{rel(path)}: EDGE-LABEL over box — free label {label!r} (x{left:.0f}-{right:.0f}, "
                    f"font {size:.0f}u) horizontally overlaps node rect x={r.x:.0f} w={r.w:.0f} y={r.y:.0f} "
                    f"h={r.h:.0f} by ~{h_ov:.0f}u with only ~{gap:.0f}u vertical clearance (< {v_clr:.0f}u "
                    f"line-height) — reposition the label clear of the box")
                flagged.add(fn)
                break

    if issues:
        issues.insert(0, f"{len(flagged)} figure(s) with an edge-label crowding a node box:")
        issues.append("")
        issues.append(f"AUDIT-ONLY. Fix guidance -> {DRAWING_DOC}")
    return PASS, issues  # AUDIT-ONLY: never FAIL
