"""LINT `figure-text-intrusion` — the text-flows-INTO-a-foreign-box SENSOR for the hand-authored house SVGs.

THE INVARIANT (the inverse of the overflow sibling). The overflow sensor catches a label spilling OUT of
its own frame. This one catches its mirror image: a label whose glyphs flow INTO a box that is not its own —
an edge label wedged into a gap too narrow for it, so its text lands on top of a neighbouring node's body
and collides with that node's label. The mage-method "changes the economics" edge label sitting across the
Commodity-intelligence box, and the gloss-core-ideas "expands the semantic surface for" label bleeding into
both principle boxes, are the motivating cases. Text flowing OUT of a box and text flowing INTO a foreign
box are the two halves of the same measurable defect: a label's readable rectangle landing where it should
not.

NOT the z-order sensor. The sibling `figure-text-occlusion` sensor asks a DOCUMENT-ORDER question — is an
opaque box painted AFTER a label it covers, hiding it? That fault is about paint order and legibility. This
sensor asks a GEOMETRY question that ignores paint order entirely: does a label's readable quad sit inside a
box it does not belong to? A perfectly legible label (painted last, on top) is still a defect if it is lying
across the wrong box. The two sensors are complementary; neither subsumes the other.

Which box is "foreign". A box's OWN label is centred in it — its quad's centre point falls inside the box.
An intruding edge label's centre falls OUTSIDE the box it bleeds into (in the gap, or over a neighbour). So
for each (label, box) pair the box is foreign iff the label quad's CENTRE is not inside it; only then can the
label's glyphs landing inside it be an intrusion rather than the box's own caption. The page-background rect
is never foreign — every label's centre lies inside it — so it never flags.

How it measures (reuses the occlusion sibling's vetted machinery — unify, don't re-derive):
  * Label quads + box polygons come from the occlusion sensor's `_Walker` (the per-glyph advance model from
    the overflow sensor; the affine-transform + path-flatten helpers from the label-collision sensor). Same
    opaque-fill test (effective alpha >= OPAQUE_ALPHA), same `<defs>` skip, same true-shape polygons.
  * Intrusion by sampling, not bounding boxes. A label's glyph quad is sampled on a grid; an intrusion fires
    when the label quad's centre is outside a box AND >= `MIN_COVER` of its samples fall inside that box's
    real polygon. Sampling the true shapes keeps a diamond's bbox from misfiring, exactly as in the sibling.

LANDING: AUDIT-ONLY first (rule: a new sensor that finds > 0 on the current tree lands non-gating; a fix
wave drains it to 0; a follow-up promotes it to BLOCKING alongside the overflow / occlusion siblings). Run:

    python3 book-models/lint_figure_text_intrusion.py            # print intrusions (audit view, exits 0)
    python3 book-models/lint_figure_text_intrusion.py --strict   # exit 1 on any intrusion (the future gate)
    python3 book-models/lint_figure_text_intrusion.py <file.svg> # check specific figure(s)
"""
from __future__ import annotations

import argparse
import pathlib
import sys
import xml.etree.ElementTree as ET
import xml.parsers.expat
from dataclasses import dataclass

HERE = pathlib.Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

# Reuse the occlusion sibling's walker + geometry wholesale; only the violation RULE differs.
import lint_figure_overflow as lfo  # noqa: E402 — load_faces (per-glyph width model)
import lint_figure_text_occlusion as lfto  # noqa: E402 — _Walker/_point_in_poly/Occluder/TextLine + grid consts

ASSETS = HERE.parent / "book" / "assets"

# A label whose centre is outside every node box but >= this fraction of whose glyph-quad samples land inside
# node boxes (UNION, so a label straddling two boxes at <12% each still trips) is intruding. Reuses the
# occlusion sibling's floor: real intrusions clear it; a hairline edge graze does not.
MIN_COVER = lfto.MIN_COVER
# A backdrop / container rect (page background, a grouping frame like a Governed-Environment box) is NOT a
# node a label can "intrude" into — a label legibly inside its own small box that merely straddles a
# container edge is not a defect. Exclude any occluder whose area exceeds this fraction of the page.
MAX_NODE_AREA_FRAC = 0.40

# Out of scope: decorative cover art + data charts — the set the sibling sensors skip.
EXCLUDE_PREFIXES = lfto.EXCLUDE_PREFIXES


@dataclass
class Violation:
    svg: str
    text: str
    text_line: int
    box_kind: str
    box_line: int
    cover: float


def _centre(quad: list[tuple[float, float]]) -> tuple[float, float]:
    xs = sum(p[0] for p in quad) / len(quad)
    ys = sum(p[1] for p in quad) / len(quad)
    return xs, ys


def _poly_area(poly: list[tuple[float, float]]) -> float:
    """Shoelace area (absolute) of a transformed polygon."""
    n = len(poly)
    s = 0.0
    for i in range(n):
        x0, y0 = poly[i]
        x1, y1 = poly[(i + 1) % n]
        s += x0 * y1 - x1 * y0
    return abs(s) / 2.0


def _page_area(raw: bytes) -> float:
    """Page area from the <svg> viewBox (else width*height); 0.0 if unknowable (disables the backdrop filter)."""
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return 0.0
    vb = root.get("viewBox")
    if vb:
        nums = [float(v) for v in vb.replace(",", " ").split() if lfto._is_num(v)]
        if len(nums) == 4:
            return abs(nums[2] * nums[3])
    w = _num_str(root.get("width"))
    h = _num_str(root.get("height"))
    return abs(w * h)


def _num_str(v: str | None) -> float:
    if not v:
        return 0.0
    try:
        return float(str(v).replace("px", "").strip())
    except ValueError:
        return 0.0


def _union_intrusion(quad: list[tuple[float, float]], boxes: list[lfto.Occluder]) -> tuple[float, lfto.Occluder | None, float]:
    """Fraction of the label's glyph-quad samples that land inside ANY box (union), plus the single box with
    the largest individual share (for the report). Sampling grid matches the occlusion sibling's."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = quad
    per: dict[int, int] = {}
    inside_any = 0
    total = 0
    for iv in range(lfto.GRID_V):
        v = (iv + 0.5) / lfto.GRID_V
        for iu in range(lfto.GRID_U):
            u = (iu + 0.5) / lfto.GRID_U
            top_x = x0 + (x1 - x0) * u
            top_y = y0 + (y1 - y0) * u
            bot_x = x3 + (x2 - x3) * u
            bot_y = y3 + (y2 - y3) * u
            px = top_x + (bot_x - top_x) * v
            py = top_y + (bot_y - top_y) * v
            total += 1
            hit = False
            for bi, box in enumerate(boxes):
                if lfto._point_in_poly(px, py, box.poly):
                    per[bi] = per.get(bi, 0) + 1
                    hit = True
            if hit:
                inside_any += 1
    if not total:
        return 0.0, None, 0.0
    best_bi = max(per, key=lambda k: per[k]) if per else None
    best_box = boxes[best_bi] if best_bi is not None else None
    best_frac = per[best_bi] / total if best_bi is not None else 0.0
    return inside_any / total, best_box, best_frac


def analyze(path: pathlib.Path, faces: dict[str, "lfo.Face"]) -> list[Violation]:
    raw = path.read_bytes()
    walker = lfto._Walker(faces)
    walker.parser.Parse(raw, True)
    page = _page_area(raw)
    # Node boxes only: drop the page background + any large grouping container (a label inside its own box
    # that merely straddles a container edge is not intruding into the container).
    nodes = [b for b in walker.occluders
             if page <= 0 or _poly_area(b.poly) <= MAX_NODE_AREA_FRAC * page]
    out: list[Violation] = []
    for t in walker.texts:
        cx, cy = _centre(t.quad)
        # A label with a HOME node (its centre inside some node box) is that box's caption — its spill is the
        # overflow sibling's concern, not an intrusion. Only a label anchored OUTSIDE every node can intrude.
        if any(lfto._point_in_poly(cx, cy, b.poly) for b in nodes):
            continue
        union, best, best_frac = _union_intrusion(t.quad, nodes)
        if union >= MIN_COVER and best is not None:
            flat = " ".join(t.text.split())
            out.append(Violation(path.name, flat, t.line, best.kind, best.line, round(union, 2)))
    return out


def _in_scope(name: str) -> bool:
    return not name.startswith(EXCLUDE_PREFIXES)


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
    return f"{len(vs)} text-into-foreign-box intrusion(s) across {figs} figure(s)"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*", help="specific .svg files (default: all book/assets/*.svg in scope)")
    ap.add_argument("--strict", action="store_true", help="exit 1 on any intrusion (the future blocking gate)")
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
    mode = "STRICT (exit 1 on any intrusion)" if args.strict else "AUDIT view (prints, exits 0)"
    print(f"== figure-text-intrusion — text-into-foreign-box sensor over book/assets/*.svg [{mode}] ==")
    print("  invariant: a label's readable quad must not sit inside a box that is not its own (the inverse of overflow).")
    print(f"  intrusion: label centre outside a box but >= {MIN_COVER:.0%} of its glyph quad inside it; "
          f"excluded: {', '.join(EXCLUDE_PREFIXES)}*")
    if not vs:
        print("  clean — no label flows into a foreign box")
        return 0
    print(f"  {summary_line(vs)}:")
    by: dict[str, list[Violation]] = {}
    for v in vs:
        by.setdefault(v.svg, []).append(v)
    for svg in sorted(by):
        for v in sorted(by[svg], key=lambda x: -x.cover):
            label = v.text if len(v.text) <= 52 else v.text[:49] + "..."
            print(f"    {svg}:{v.text_line} — text '{label}' intrudes into <{v.box_kind}> "
                  f"(line {v.box_line}, covers {v.cover:.0%})")
    return 1 if args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
