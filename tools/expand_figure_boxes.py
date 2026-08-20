"""Codemod: widen figure boxes so floor-size labels fit — the geometric complement to rescale_figure_fonts.

THE PROBLEM. After the font hard-floor wave, many hand-authored boxes are too NARROW to hold their now
floor-size label: the label overruns the box's right border (the blocking `lint_figure_overflow` sensor).
The house rule forbids shrinking the type back, so the BOX is the thing to widen. This tool does the
mechanical, safe majority of that widening; the rest (grids that must stay column-aligned, boxes hemmed in
on both sides) it SKIPS and reports for hand work.

WHAT IT DOES, per figure (changes ONLY `<rect>` x + width — never text, never other geometry):

  1. Parse the SVG (reusing the overflow sensor's text/rect parser + glyph-advance width estimator).
  2. For each visible box, find the widest label it contains (find_box). Compute the box's fit ratio the
     sensor's way (`face.width / (box.w − 2·PAD·fs)`). A box at ratio ≥ STRAIN (0.90) needs widening.
  3. Target ratio 0.85 (clears both strain 0.90 and overflow 1.00): new inner = label_width / 0.85, new box
     width = new_inner + 2·PAD·fs. Widen SYMMETRICALLY about the box's current center (labels are centered,
     so the label stays put); never shrink.
  4. SAFETY GATES — skip (and report) a widen that would:
       * overlap a SIBLING rect (a rect that neither contains nor is contained by the box), or
       * spill past the canvas (new x < 0 or new x+width > viewBox width), or
       * act on a near-full-width panel/background rect (≥ 0.9·viewBox wide).
     A skipped box is left for hand widening (shorten a label, restack, or widen the whole figure).

    python3 tools/expand_figure_boxes.py --dry-run --only system-overview
    python3 tools/expand_figure_boxes.py --only system-overview mage-method   # apply to these
    python3 tools/expand_figure_boxes.py                                       # whole corpus
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
ASSETS = ROOT / "book" / "assets"

sys.path.insert(0, str(ROOT / "book-models"))
import lint_figure_overflow as ovf  # noqa: E402 — reuse its parser, box-finder, and glyph-advance faces

EXCLUDE_PREFIXES = ("cover", "velocity-")
_TARGET_RATIO = 0.85          # widen until label/inner ≤ this (clears strain 0.90 + overflow 1.00)
_MIN_GAIN = 2.0               # ignore sub-2u widenings (noise)
_PANEL_FRAC = 0.9             # a rect ≥ this fraction of viewBox width is a panel/background — never widen


def _viewbox_w(text: str) -> float | None:
    m = re.search(r'viewBox\s*=\s*["\']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+[0-9.]+', text)
    return float(m.group(1)) if m else None


def _overlaps(a: ovf.Rect, b: ovf.Rect) -> bool:
    """True if a and b share interior area."""
    return (a.x < b.x + b.w and b.x < a.x + a.w and a.y < b.y + b.h and b.y < a.y + a.h)


def _contains(outer: ovf.Rect, inner: ovf.Rect) -> bool:
    return (outer.x <= inner.x + 0.5 and outer.y <= inner.y + 0.5
            and outer.x + outer.w >= inner.x + inner.w - 0.5
            and outer.y + outer.h >= inner.y + inner.h - 0.5)


def _face(faces: dict, key: str):
    return faces.get(key) or faces["normal|normal"]


def plan_figure(text: str, vb_w: float, faces: dict) -> tuple[list[tuple[ovf.Rect, float, float]], list[str]]:
    """Return (widenings, skips). Each widening is (box, new_x, new_w). skips are human-readable reasons."""
    texts, rects = _parse(text)

    # texts keyed by their owning box (so a widen never swallows a label that belongs to a DIFFERENT box or
    # to no box — an edge annotation): a widened box may cover only the labels it already contained.
    def owner(t: ovf.TextEl) -> ovf.Rect | None:
        return ovf.find_box(t, rects)

    # widest label per box + that label's font size (for the strain-ratio gate)
    box_need: dict[int, tuple[ovf.Rect, float, float]] = {}
    for t in texts:
        box = ovf.find_box(t, rects)
        if box is None or box.w >= _PANEL_FRAC * vb_w:
            continue
        label_w = _face(faces, t.face_key).width(t.text, t.font_size, t.letter_spacing)
        need_w = label_w / _TARGET_RATIO + 2 * ovf.PAD_EM_PER_SIDE * t.font_size
        cur = box_need.get(id(box))
        if cur is None or need_w > cur[1]:
            box_need[id(box)] = (box, need_w, t.font_size)

    widenings: list[tuple[ovf.Rect, float, float]] = []
    skips: list[str] = []
    for box, need_w, fs in box_need.values():
        cur_inner = max(box.w - 2 * ovf.PAD_EM_PER_SIDE * fs, 1.0)
        cur_ratio = (need_w - 2 * ovf.PAD_EM_PER_SIDE * fs) * _TARGET_RATIO / cur_inner
        if cur_ratio < ovf.STRAIN_RATIO or need_w <= box.w + _MIN_GAIN:
            continue  # box is comfortable (below strain) — leave it exactly as authored
        cx = box.x + box.w / 2
        new_x = cx - need_w / 2
        new_box = ovf.Rect(new_x, box.y, need_w, box.h)
        label = f"box@({box.x:.0f},{box.y:.0f}) {box.w:.0f}->{need_w:.0f}u"
        if new_x < 0 or new_x + need_w > vb_w:
            skips.append(f"{label}: would spill canvas")
            continue
        clash = next((r for r in rects
                      if r is not box and not _contains(box, r) and not _contains(r, box)
                      and not _contains(new_box, r) and _overlaps(new_box, r)
                      and r.w < _PANEL_FRAC * vb_w), None)
        if clash is not None:
            skips.append(f"{label}: would hit sibling @({clash.x:.0f},{clash.y:.0f})")
            continue
        occl = next((t for t in texts if owner(t) is not box
                     and new_box.contains(t.x, t.y) and not box.contains(t.x, t.y)), None)
        if occl is not None:
            skips.append(f"{label}: would cover label '{occl.text[:24]}'")
            continue
        widenings.append((box, new_x, need_w))
    return widenings, skips


def _parse(text: str):
    """Parse (texts, rects) from raw SVG text — mirrors lint_figure_overflow.parse_svg but off a string."""
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False, encoding="utf-8") as f:
        f.write(text)
        p = pathlib.Path(f.name)
    try:
        return ovf.parse_svg(p)
    finally:
        p.unlink(missing_ok=True)


def _apply(text: str, widenings: list[tuple[ovf.Rect, float, float]]) -> tuple[str, int]:
    """Rewrite each widened box's <rect> x + width in the raw SVG. Match by original x/y/w/h attrs."""
    n = 0
    for box, new_x, new_w in widenings:
        # Match this rect's opening tag by its four coordinate attributes (5 capture groups: the literal
        # attribute-name chunks around each value), then rewrite only x and width.
        pat = re.compile(
            r'(<rect\b[^>]*?\bx=")' + _num_re(box.x) + r'("[^>]*?\by=")' + _num_re(box.y)
            + r'("[^>]*?\bwidth=")' + _num_re(box.w) + r'("[^>]*?\bheight=")' + _num_re(box.h) + r'(")',
        )
        m = pat.search(text)
        if not m:
            continue  # attribute order differs from x,y,width,height — leave for hand work
        new = (m.group(1) + _fmt(new_x) + m.group(2) + _fmt(box.y)
               + m.group(3) + _fmt(new_w) + m.group(4) + _fmt(box.h) + m.group(5))
        text = text[:m.start()] + new + text[m.end():]
        n += 1
    return text, n


def _fmt(v: float) -> str:
    r = round(v, 2)
    return str(int(round(r))) if abs(r - round(r)) < 1e-9 else f"{r:.2f}".rstrip("0").rstrip(".")


def _num_re(v: float) -> str:
    """Match a numeric attr value equal to v whether written as int or 1-2dp float."""
    return r'-?' + re.escape(_fmt(v)) + r'(?:\.0+)?'


def _targets(only: list[str] | None) -> list[pathlib.Path]:
    out = []
    for svg in sorted(ASSETS.glob("*.svg")):
        if svg.name.startswith(EXCLUDE_PREFIXES):
            continue
        if only and not any(svg.name == o or svg.stem == pathlib.Path(o).stem for o in only):
            continue
        out.append(svg)
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", nargs="*")
    args = ap.parse_args(argv)

    faces = ovf.load_faces()
    n_files = n_boxes = n_skip = 0
    print(f"== expand-figure-boxes — widen overflowing boxes to fit floor-size labels "
          f"[{'DRY-RUN' if args.dry_run else 'APPLY'}] ==")
    for svg in _targets(args.only):
        text = svg.read_text(encoding="utf-8")
        vb_w = _viewbox_w(text)
        if not vb_w:
            continue
        widenings, skips = plan_figure(text, vb_w, faces)
        if not widenings and not skips:
            continue
        new_text, applied = (text, len(widenings)) if args.dry_run else _apply(text, widenings)
        n_files += 1 if (widenings or skips) else 0
        n_boxes += applied
        n_skip += len(skips)
        print(f"  [{'plan' if args.dry_run else 'edit'}] {svg.name}: {applied} widened, {len(skips)} skipped")
        for s in skips:
            print(f"      SKIP {s}")
        if not args.dry_run and applied:
            svg.write_text(new_text, encoding="utf-8")
    print(f"  {'would widen' if args.dry_run else 'widened'} {n_boxes} box(es) across {n_files} figure(s); "
          f"{n_skip} skipped for hand work")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
