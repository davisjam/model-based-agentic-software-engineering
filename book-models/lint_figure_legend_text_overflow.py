"""LINT `figure-legend-text-overflow` — a boxed label must clear the RIGHT border of the box it sits in.

THE DEFECT CLASS. The sibling text-fit sensor (`lint_figure_overflow`) asks whether a label is wider than
its box — it measures the label against the box width and assumes the label starts at the left edge. A
LEGEND row breaks that assumption. Its label is left-anchored and starts PART WAY across the box, after a
swatch or a sample stroke, so the label can be narrower than the whole box yet still run past the box's
right border. A legend row reading `enhancement (not required)` at font-size 14 starts ~70px into a 230px
legend box and overshoots the right edge, even though its width alone fits. The whole-box sensor cannot see
this; it needs the label's actual starting x and its text-anchor.

WHAT IT MEASURES (no browser, no font library at runtime):

  * **Rendered width — the SAME model the overflow sensor uses.** It reuses that sibling's per-glyph
    advance table (`glyph-advances.json`, emitted offline from the bundled Source Sans 3 faces): a label's
    width is `Σ advance_em[c]·font_size + (n−1)·letter_spacing`. One width model across both sensors, so
    the two can never disagree on how wide a string renders.
  * **Horizontal extent from the anchor.** SVG text is positioned by an anchor point plus a `text-anchor`
    rule, so the label's right edge is `x + width` for `start` (the default), `x + width/2` for `middle`,
    and `x` for `end`. The extent — not the width — is what a right border must contain.
  * **The enclosing box.** These SVGs are flat: `<rect>` and `<text>` are siblings. A label associates to
    the smallest-area VISIBLE `<rect>` (fill or stroke present) that holds its anchor point and is a
    plausible container (`h ≥ 1.1·fs`), excluding the full-canvas background. A label with no such box is
    free-floating (a caption, a tick) and is skipped — it has no border to overrun.
  * **The fit test.** OVERFLOW when the label's rendered right extent passes the box's VISIBLE right border
    `box_right` by more than a 1px noise tolerance (the width model's residual error on a short string). The
    sensor flags a label that crosses the drawn border, not one that merely sits close to it — a label
    comfortably inside the box is fine, so there is no second "tight" tier to add noise. The fix restores
    real clearance, driving the crossing to zero.

THE FIX. Widen the enclosing box (and the viewBox if the box now runs off-canvas) so the label clears the
right border with margin — preferred, because it keeps the label legible — or shorten the label.

LANDING: AUDIT-ONLY. A new geometric sensor over a hand-authored corpus lands audit-only first per the
repo's blocking-lint discipline: it prints the book-wide offender set and returns 0 from the shared
validator, so it does not gate. A fix-wave drains the corpus, then a follow-up flips it blocking.

    python3 book-models/lint_figure_legend_text_overflow.py            # print findings (audit-only, exit 0)
    python3 book-models/lint_figure_legend_text_overflow.py --strict   # exit 1 on any finding (the flip)
    python3 book-models/lint_figure_legend_text_overflow.py <file.svg>  # check specific figure(s)
"""
from __future__ import annotations

import argparse
import os
import pathlib
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
# Reuse the overflow sensor's glyph-advance width model + rect/text helpers so the two sensors share ONE
# definition of "how wide does this string render" and "what counts as a container box".
import lint_figure_overflow as _lfo  # noqa: E402

HERE = pathlib.Path(__file__).resolve().parent
ASSETS = HERE.parent / "book" / "assets"

# The same out-of-scope set the sibling text sensors carry: decorative cover art + data charts.
EXCLUDE_PREFIXES = ("cover", "velocity-")

# Noise tolerance (px) the label's right extent may pass the visible right border before the sensor flags
# it — the glyph-advance width model's residual error on a short string is ~1px, so a crossing must exceed
# this to be a real overflow rather than estimator jitter.
BORDER_TOL_PX = 1.0

SVG_NS = _lfo.SVG_NS


@dataclass
class BoxedText:
    text: str
    x: float
    y: float
    right: float          # rendered right extent, resolving text-anchor
    font_size: float
    anchor: str


@dataclass
class Finding:
    svg: str
    text: str
    overshoot: float      # px the label's right extent passes the visible box right border
    font_size: float
    box_right: float
    text_right: float


def _viewbox_area(root: ET.Element) -> float:
    vb = root.get("viewBox")
    if vb:
        parts = vb.replace(",", " ").split()
        if len(parts) == 4:
            try:
                return float(parts[2]) * float(parts[3])
            except ValueError:
                pass
    try:
        return _lfo._f(root, "width") * _lfo._f(root, "height")
    except Exception:  # pragma: no cover — malformed root; treat as unbounded
        return float("inf")


def _parse(path: pathlib.Path, faces: dict) -> tuple[list[BoxedText], list["_lfo.Rect"], float]:
    root = ET.parse(path).getroot()
    canvas_area = _viewbox_area(root)
    texts: list[BoxedText] = []
    rects: list[_lfo.Rect] = []

    def walk(el: ET.Element, ancestors: list[ET.Element]) -> None:
        tag = _lfo._tag(el)
        if tag == "rect":
            fill = _lfo._inherited(el, ancestors, "fill", "black").strip()
            stroke = _lfo._inherited(el, ancestors, "stroke", "none").strip()
            if not (fill == "none" and stroke == "none"):
                rects.append(_lfo.Rect(_lfo._f(el, "x"), _lfo._f(el, "y"),
                                       _lfo._f(el, "width"), _lfo._f(el, "height")))
        elif tag == "text":
            content = "".join(el.itertext()).strip()
            if content:
                fs_raw = _lfo._inherited(el, ancestors, "font-size", "16")
                try:
                    fs = float(fs_raw.replace("px", ""))
                except ValueError:
                    fs = 16.0
                fw = _lfo._inherited(el, ancestors, "font-weight", "normal")
                weight = "bold" if fw in _lfo._BOLD_WEIGHTS else "normal"
                style = "italic" if _lfo._inherited(el, ancestors, "font-style", "normal") == "italic" else "normal"
                ls_raw = _lfo._inherited(el, ancestors, "letter-spacing", "0")
                try:
                    ls = float(ls_raw.replace("px", ""))
                except ValueError:
                    ls = 0.0
                anchor = _lfo._inherited(el, ancestors, "text-anchor", "start").strip()
                x = _lfo._f(el, "x")
                y = _lfo._f(el, "y")
                face = faces.get(f"{weight}|{style}") or faces["normal|normal"]
                w = face.width(content, fs, ls)
                if anchor == "middle":
                    right = x + w / 2.0
                elif anchor == "end":
                    right = x
                else:
                    right = x + w
                texts.append(BoxedText(content, x, y, right, fs, anchor))
        for child in el:
            walk(child, [*ancestors, el])

    walk(root, [])
    # Drop the full-canvas background: a caption over bare canvas has no BOX border to overrun, only the
    # page edge, which the overflow sensor already governs. Keep every genuine box/legend/chip.
    rects = [r for r in rects if r.area < 0.85 * canvas_area]
    return texts, rects, canvas_area


def _enclosing_box(t: BoxedText, rects: list["_lfo.Rect"]) -> "_lfo.Rect | None":
    """Smallest-area plausible box holding the label's anchor point (mirrors the overflow sensor's find_box,
    minus the width floor — a legend row's anchor sits well inside a box far wider than 1.5·fs)."""
    candidates = [
        r for r in rects
        if r.contains(t.x, t.y) and r.h >= 1.1 * t.font_size and (r.x + r.w) > t.x
    ]
    return min(candidates, key=lambda r: r.area) if candidates else None


def analyze(path: pathlib.Path, faces: dict | None = None) -> list[Finding]:
    faces = faces or _lfo.load_faces()
    texts, rects, _ = _parse(path, faces)
    findings: list[Finding] = []
    for t in texts:
        box = _enclosing_box(t, rects)
        if box is None:
            continue
        box_right = box.x + box.w
        if t.right > box_right + BORDER_TOL_PX:
            findings.append(Finding(path.name, t.text, t.right - box_right,
                                    t.font_size, box_right, t.right))
    return findings


def _in_scope(name: str) -> bool:
    return not name.startswith(EXCLUDE_PREFIXES)


def findings() -> list[Finding]:
    faces = _lfo.load_faces()
    out: list[Finding] = []
    for svg in sorted(ASSETS.glob("*.svg")):
        if _in_scope(svg.name):
            try:
                out.extend(analyze(svg, faces))
            except ET.ParseError:
                continue  # the sibling text sensors already report parse errors
    return out


def summary_line(fs: list[Finding]) -> str:
    figs = len({f.svg for f in fs})
    return f"{len(fs)} boxed-label(s) overrun their box right border across {figs} figure(s)"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*", help="specific .svg files (default: all book/assets/*.svg in scope)")
    ap.add_argument("--strict", action="store_true", help="exit 1 on any finding (the blocking flip)")
    args = ap.parse_args(argv)
    if args.paths:
        faces = _lfo.load_faces()
        fs: list[Finding] = []
        for p in args.paths:
            try:
                fs.extend(analyze(pathlib.Path(p), faces))
            except Exception as e:  # pragma: no cover
                print(f"  [ERROR] {p}: {e}")
    else:
        fs = findings()
    mode = "STRICT (exit 1 on any finding)" if args.strict else "AUDIT-ONLY (prints, exits 0)"
    print(f"== figure-legend-text-overflow — boxed label clears its box RIGHT border over book/assets/*.svg "
          f"[{mode}] ==")
    print(f"  threshold: right extent > box_right + {BORDER_TOL_PX:.0f}px · resolves text-anchor · "
          f"excluded: {', '.join(EXCLUDE_PREFIXES)}*")
    if not fs:
        print("  clean — every boxed label clears its box right border")
        return 0
    print(f"  {summary_line(fs)}:")
    for f in sorted(fs, key=lambda f: (f.svg, -f.overshoot)):
        print(f"    [OVERFLOW] {f.svg} — fs={f.font_size:g} box_right={f.box_right:g} "
              f'text_right={f.text_right:.0f} (+{f.overshoot:.0f}px past border)  "{f.text[:52]}"')
    return 1 if args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
