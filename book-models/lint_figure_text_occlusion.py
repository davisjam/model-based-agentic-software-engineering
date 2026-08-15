"""LINT `figure-text-occlusion` — the z-order text-on-top SENSOR for the hand-authored house SVGs.

THE CONSTRAINT (the invariant this enforces). In a flat, painter's-model SVG a later element paints OVER
an earlier one. So a figure's labels must obey one structural rule: **a `<text>` must be drawn AFTER every
filled element it overlaps.** Draw the box first, then its label on top, and the label is always legible —
the box can never hide it. That authoring order is the constraint; it makes box-over-text occlusion
impossible by construction, and it gives a clean parse invariant a machine can check.

THE SENSOR (this file — the violation detector). The constraint half asks authors to paint text last; this
half catches the miss the constraint did not prevent — an OPAQUE filled element that appears LATER in
document order than a `<text>` whose glyphs it overlaps. That element paints over the earlier label, so the
reader sees a box sitting on top of half a row-label. The pair mirrors the book's own constraint/sensor
thesis: the drawing rule makes the fault unlikely, the sensor catches it before it ships.

Document order is the whole point. A label painted ON its own box (box first, `<text>` after) is CORRECT —
the text is on top, exactly as intended — and never flags. Only the inverted case flags: a filled element
drawn AFTER a text it covers.

How it measures (no browser, no font library at runtime):
  * Text width. Reused from the overflow sibling's per-glyph advance table (`glyph-advances.json`, emitted
    offline from the bundled Source Sans 3 faces) — a MODEL of the print renderer, not a heuristic. Each
    visual line (a `<text>` or a positioned `<tspan>` within it) becomes a glyph QUAD spanning the readable
    cap-to-descender band, `[x-anchor·w] × [y − CAP·fs, y + DESC·fs]`, transformed into place.
  * Occluder shape. Every `<rect>`/`<path>`/`<circle>`/`<ellipse>`/`<polygon>` with an OPAQUE solid fill
    (fill parses to a colour, is not `none`, and effective alpha — group `opacity` × `fill-opacity` — is
    ≥ 0.90) contributes its TRUE boundary polygon (a diamond stays a diamond, a wedge a wedge), transformed
    into place. `<defs>` subtrees are skipped (markers, gradients, symbols paint by reference, not in place).
  * Overlap by sampling, not bounding boxes. The label's glyph quad is sampled on a grid; a violation fires
    when ≥ `MIN_COVER` of those samples fall INSIDE a later opaque occluder's real polygon. Sampling the
    true shapes is what keeps false positives out — a decision diamond's bbox brushes a nearby label, its
    actual body does not, so the bbox test would misfire and this one does not.

LANDING: BLOCKING. Any opaque element drawn later than a text it overlaps increments the shared validator's
issue count and reddens `catalog.py validate`, exactly like the sibling overflow sensor. The corpus is clean
at 0 violations; this gate holds the tree there.

    python3 book-models/lint_figure_text_occlusion.py            # print violations (audit view, exits 0)
    python3 book-models/lint_figure_text_occlusion.py --strict   # exit 1 on any violation (the gate)
    python3 book-models/lint_figure_text_occlusion.py <file.svg> # check specific figure(s)
"""
from __future__ import annotations

import argparse
import math
import pathlib
import sys
import xml.parsers.expat
from dataclasses import dataclass

HERE = pathlib.Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

# Reuse the sibling sensors' vetted machinery (unify, don't re-derive):
#   * the per-glyph advance model + face table from the overflow sensor (accurate text width);
#   * the affine-transform + path-flatten + colour helpers from the label-collision sensor.
import lint_figure_overflow as lfo  # noqa: E402 — Face + load_faces (per-glyph width model)
import lint_figure_label_collision as lflc  # noqa: E402 — parse_transform/mat_mul/apply/flatten_path/parse_color

ASSETS = HERE.parent / "book" / "assets"

# Glyph box vertical band, as a fraction of font-size: cap-height above the baseline, descender below.
CAP = 0.72
DESC = 0.20
# A later opaque shape covering >= this fraction of a label's glyph-quad samples is a violation. Low on
# purpose: any real box-into-glyph intrusion is a defect; the floor only rejects a hairline edge graze.
MIN_COVER = 0.12
# Effective alpha (group opacity x fill-opacity) at or above this counts the fill as opaque enough to hide.
OPAQUE_ALPHA = 0.90
# Sampling grid over each label's glyph quad (u across, v down).
GRID_U = 9
GRID_V = 5

# Out of scope: decorative cover art + data charts — the same set the overflow / label-collision siblings skip.
EXCLUDE_PREFIXES = ("cover", "velocity-")

_BOLD_WEIGHTS = {"bold", "600", "700", "800", "900"}


def _num_str(v: str | None, default: float = 0.0) -> float:
    if v is None:
        return default
    try:
        return float(str(v).replace("px", "").strip())
    except ValueError:
        return default


def _num(attrs: dict[str, str], key: str, default: float = 0.0) -> float:
    return _num_str(attrs.get(key), default)


def _point_in_poly(px: float, py: float, poly: list[tuple[float, float]]) -> bool:
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi):
            inside = not inside
        j = i
    return inside


def _opaque_fill(fill: str | None, alpha: float) -> bool:
    if alpha < OPAQUE_ALPHA:
        return False
    if not fill:
        return False
    f = fill.strip().lower()
    if f in ("none", "transparent") or f.startswith("url("):
        return False
    return lflc.parse_color(f) is not None


@dataclass
class TextLine:
    text: str
    quad: list[tuple[float, float]]   # 4 corners TL, TR, BR, BL (transformed)
    order: int
    line: int


@dataclass
class Occluder:
    kind: str                         # rect / path / circle / ellipse / polygon
    poly: list[tuple[float, float]]   # true boundary polygon (transformed)
    order: int
    line: int


@dataclass
class Violation:
    svg: str
    text: str
    text_line: int
    occ_kind: str
    occ_line: int
    cover: float


def _cover_fraction(quad: list[tuple[float, float]], poly: list[tuple[float, float]]) -> float:
    """Fraction of the label's glyph-quad grid samples that land inside the occluder polygon."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = quad
    inside = 0
    total = 0
    for iv in range(GRID_V):
        v = (iv + 0.5) / GRID_V
        for iu in range(GRID_U):
            u = (iu + 0.5) / GRID_U
            top_x = x0 + (x1 - x0) * u
            top_y = y0 + (y1 - y0) * u
            bot_x = x3 + (x2 - x3) * u
            bot_y = y3 + (y2 - y3) * u
            px = top_x + (bot_x - top_x) * v
            py = top_y + (bot_y - top_y) * v
            total += 1
            if _point_in_poly(px, py, poly):
                inside += 1
    return inside / total if total else 0.0


class _Walker:
    """Expat walker: document order, source line, resolved transform + inherited text/fill style."""

    def __init__(self, faces: dict[str, "lfo.Face"]) -> None:
        self.faces = faces
        self.texts: list[TextLine] = []
        self.occluders: list[Occluder] = []
        self._order = 0
        self._defs_depth = 0
        # Inheritance stacks (SVG: opacity multiplies through groups; fill/fill-opacity/font-* inherit).
        self._mtx = [lflc.IDENT]
        self._opacity = [1.0]
        self._fill = ["black"]        # SVG default fill is black
        self._fill_op = [1.0]
        self._font_size = [16.0]
        self._weight = ["normal"]
        self._style = ["normal"]
        self._anchor = ["start"]
        self._ls = [0.0]
        # Active <text>: a list of per-line segments (a positioned <tspan> starts a new visual line).
        self._text_stack: list[dict] = []
        self.parser = xml.parsers.expat.ParserCreate()
        self.parser.StartElementHandler = self._start
        self.parser.EndElementHandler = self._end
        self.parser.CharacterDataHandler = self._chars

    def _tag(self, name: str) -> str:
        return name.split(":")[-1].split("}")[-1]

    def _push_style(self, attrs: dict[str, str]) -> tuple:
        mtx = lflc.mat_mul(self._mtx[-1], lflc.parse_transform(attrs.get("transform")))
        self._mtx.append(mtx)
        self._opacity.append(self._opacity[-1] * _num(attrs, "opacity", 1.0))
        self._fill.append(attrs.get("fill", self._fill[-1]))
        self._fill_op.append(_num(attrs, "fill-opacity", self._fill_op[-1]))
        self._font_size.append(_num(attrs, "font-size", self._font_size[-1]) if attrs.get("font-size") else self._font_size[-1])
        self._weight.append(attrs.get("font-weight", self._weight[-1]))
        self._style.append(attrs.get("font-style", self._style[-1]))
        self._anchor.append(attrs.get("text-anchor", self._anchor[-1]))
        self._ls.append(_num(attrs, "letter-spacing", self._ls[-1]))
        return mtx

    def _start(self, name: str, attrs: dict[str, str]) -> None:
        tag = self._tag(name)
        line = self.parser.CurrentLineNumber
        self._order += 1
        order = self._order
        mtx = self._push_style(attrs)

        if tag == "defs":
            self._defs_depth += 1
            return
        if self._defs_depth > 0:
            return  # inside <defs>: symbols/markers/gradients paint by reference, not in place

        if tag == "text":
            base = self._new_line(attrs, mtx, order, line, is_root=True)
            self._text_stack.append({"lines": [base], "cur": base})
            return
        if self._text_stack:
            if tag == "tspan":
                self._handle_tspan(attrs, mtx, order, line)
            return  # any other child of a text: its chardata rides the current line

        alpha = self._opacity[-1] * self._fill_op[-1]
        if not _opaque_fill(self._fill[-1], alpha):
            return
        poly = self._shape_poly(tag, attrs, mtx)
        if poly is not None and len(poly) >= 3:
            self.occluders.append(Occluder(tag, poly, order, line))

    def _new_line(self, attrs: dict[str, str], mtx: tuple, order: int, line: int, *, is_root: bool) -> dict:
        return {
            "content": [], "x": _num(attrs, "x", self._text_stack[-1]["cur"]["x"] if (not is_root and self._text_stack) else 0.0),
            "y": _num(attrs, "y", self._text_stack[-1]["cur"]["y"] if (not is_root and self._text_stack) else 0.0),
            "fs": self._font_size[-1], "weight": self._weight[-1], "style": self._style[-1],
            "anchor": self._anchor[-1], "ls": self._ls[-1], "mtx": mtx, "order": order, "line": line,
        }

    def _handle_tspan(self, attrs: dict[str, str], mtx: tuple, order: int, line: int) -> None:
        ctx = self._text_stack[-1]
        cur = ctx["cur"]
        has_x = attrs.get("x") is not None
        has_y = attrs.get("y") is not None
        has_dy = attrs.get("dy") is not None
        positioned = has_y or has_dy or (has_x and not cur["content"])
        if positioned:
            x = _num(attrs, "x", cur["x"])
            if has_y:
                y = _num(attrs, "y")
            elif has_dy:
                y = cur["y"] + _num(attrs, "dy")
            else:
                y = cur["y"]
            seg = {
                "content": [], "x": x, "y": y, "fs": self._font_size[-1], "weight": self._weight[-1],
                "style": self._style[-1], "anchor": self._anchor[-1], "ls": self._ls[-1],
                "mtx": mtx, "order": order, "line": line,
            }
            ctx["lines"].append(seg)
            ctx["cur"] = seg

    def _shape_poly(self, tag: str, attrs: dict[str, str], mtx: tuple) -> list[tuple[float, float]] | None:
        if tag == "rect":
            x, y = _num(attrs, "x"), _num(attrs, "y")
            w, h = _num(attrs, "width"), _num(attrs, "height")
            if w <= 0 or h <= 0:
                return None
            corners = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
        elif tag in ("circle", "ellipse"):
            cx, cy = _num(attrs, "cx"), _num(attrs, "cy")
            rx = _num(attrs, "r") or _num(attrs, "rx")
            ry = _num(attrs, "r") or _num(attrs, "ry")
            if rx <= 0 or ry <= 0:
                return None
            corners = [(cx + rx * math.cos(t), cy + ry * math.sin(t))
                       for t in (2 * math.pi * k / 32 for k in range(32))]
        elif tag == "polygon":
            raw = attrs.get("points", "")
            nums = [float(v) for v in raw.replace(",", " ").split() if _is_num(v)]
            if len(nums) < 6:
                return None
            corners = list(zip(nums[0::2], nums[1::2]))
        elif tag == "path":
            d = attrs.get("d")
            if not d:
                return None
            corners = lflc.flatten_path(d)
            if len(corners) < 3:
                return None
        else:
            return None
        return [lflc.apply(mtx, cx, cy) for cx, cy in corners]

    def _chars(self, data: str) -> None:
        if self._text_stack:
            self._text_stack[-1]["cur"]["content"].append(data)

    def _end(self, name: str) -> None:
        tag = self._tag(name)
        if tag == "defs" and self._defs_depth > 0:
            self._defs_depth -= 1
        elif tag == "text" and self._text_stack:
            ctx = self._text_stack.pop()
            if self._defs_depth == 0:
                for seg in ctx["lines"]:
                    content = "".join(seg["content"]).strip()
                    if content:
                        self._emit_line(seg, content)
        for stack in (self._mtx, self._opacity, self._fill, self._fill_op,
                      self._font_size, self._weight, self._style, self._anchor, self._ls):
            if len(stack) > 1:
                stack.pop()

    def _emit_line(self, seg: dict, content: str) -> None:
        fs = seg["fs"]
        weight = "bold" if str(seg["weight"]) in _BOLD_WEIGHTS else "normal"
        style = "italic" if seg["style"] == "italic" else "normal"
        face = self.faces.get(f"{weight}|{style}") or self.faces["normal|normal"]
        w = face.width(content, fs, seg["ls"])
        x, y = seg["x"], seg["y"]
        if seg["anchor"] == "middle":
            x0, x1 = x - w / 2, x + w / 2
        elif seg["anchor"] == "end":
            x0, x1 = x - w, x
        else:
            x0, x1 = x, x + w
        y0, y1 = y - CAP * fs, y + DESC * fs
        corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]  # TL, TR, BR, BL
        quad = [lflc.apply(seg["mtx"], cx, cy) for cx, cy in corners]
        self.texts.append(TextLine(content, quad, seg["order"], seg["line"]))


def analyze(path: pathlib.Path, faces: dict[str, "lfo.Face"]) -> list[Violation]:
    walker = _Walker(faces)
    walker.parser.Parse(path.read_bytes(), True)
    out: list[Violation] = []
    for t in walker.texts:
        best: Occluder | None = None
        best_cover = 0.0
        for occ in walker.occluders:
            if occ.order <= t.order:
                continue  # drawn BEFORE the text -> text is on top -> correct, not a violation
            cover = _cover_fraction(t.quad, occ.poly)
            if cover >= MIN_COVER and cover > best_cover:
                best, best_cover = occ, cover
        if best is not None:
            flat = " ".join(t.text.split())
            out.append(Violation(path.name, flat, t.line, best.kind, best.line, round(best_cover, 2)))
    return out


def _in_scope(name: str) -> bool:
    return not name.startswith(EXCLUDE_PREFIXES)


def _is_num(v: str) -> bool:
    try:
        float(v)
        return True
    except ValueError:
        return False


def findings() -> list[Violation]:
    faces = lfo.load_faces()
    out: list[Violation] = []
    for svg in sorted(ASSETS.glob("*.svg")):
        if _in_scope(svg.name):
            try:
                out.extend(analyze(svg, faces))
            except xml.parsers.expat.ExpatError:
                continue
    return out


def summary_line(vs: list[Violation]) -> str:
    figs = len({v.svg for v in vs})
    return f"{len(vs)} z-order text-occlusion violation(s) across {figs} figure(s)"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*", help="specific .svg files (default: all book/assets/*.svg in scope)")
    ap.add_argument("--strict", action="store_true", help="exit 1 on any violation (the blocking gate)")
    args = ap.parse_args(argv)
    faces = lfo.load_faces()
    if args.paths:
        vs: list[Violation] = []
        for p in args.paths:
            try:
                vs.extend(analyze(pathlib.Path(p), faces))
            except xml.parsers.expat.ExpatError as e:
                print(f"  [ERROR] {p}: {e}")
    else:
        vs = findings()
    mode = "STRICT (exit 1 on any violation)" if args.strict else "AUDIT view (prints, exits 0)"
    print(f"== figure-text-occlusion — z-order text-on-top sensor over book/assets/*.svg [{mode}] ==")
    print("  constraint: a <text> must be drawn AFTER every filled element it overlaps (text on top).")
    print(f"  violation: an opaque fill drawn LATER than a text it covers (>= {MIN_COVER:.0%} of glyph quad); "
          f"excluded: {', '.join(EXCLUDE_PREFIXES)}*")
    if not vs:
        print("  clean — every label is painted on top of the boxes it overlaps")
        return 0
    print(f"  {summary_line(vs)}:")
    by: dict[str, list[Violation]] = {}
    for v in vs:
        by.setdefault(v.svg, []).append(v)
    for svg in sorted(by):
        for v in sorted(by[svg], key=lambda x: -x.cover):
            label = v.text if len(v.text) <= 52 else v.text[:49] + "..."
            print(f"    {svg}:{v.text_line} — text '{label}' occluded by <{v.occ_kind}> "
                  f"drawn later (line {v.occ_line}, covers {v.cover:.0%})")
    return 1 if args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
