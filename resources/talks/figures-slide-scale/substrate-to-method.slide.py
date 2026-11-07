#!/usr/bin/env python3
"""Slide-scale variant of book/assets/substrate-to-method.svg (McAfee deck, slide 13).

Same wording, re-laid-out for a 9.340 x 3.780 in placement.  viewBox units are POINTS
at that placement, so font-size == native pt.  Searches for the largest body size that
still fits, capped at the 20 pt target.  Never touches book/assets/.
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _svgkit as k  # noqa: E402

W, H = 672.5, 272.2          # 9.340 x 3.780 in, in points
PAGE, INK, MUTED = "#fdfcf9", "#1c1917", "#57534e"
RUST, FLEET, DGREEN = "#9a3f12", "#2f5169", "#155c38"

CAPTION = ("Chapter 1 derives the two core activities; "
           "Chapter 4 puts them in motion as the MAGE method.")


def build(F: float) -> tuple[list[str], k.Fit]:
    FH = F + 1.0                 # column headers
    FT = F + 4.0                 # figure title
    fit = k.Fit("substrate-to-method", W, H)
    o: list[str] = []

    def box(x, y, w, h, fill, stroke, sw, nid):
        fit.box(x, y, w, h, nid)
        o.append(f'  <rect id="{nid}" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" '
                 f'height="{h:.1f}" rx="8" fill="{fill}" stroke="{stroke}" '
                 f'stroke-width="{sw}"/>')

    def lines_in(x, w, ytop, h, rows, nid):
        n = len(rows)
        lead = F * 1.2
        first = ytop + h / 2 - (n - 1) * lead / 2 + F * 0.35
        for i, (s, size, bold, colour) in enumerate(rows):
            fit.text(s, size, w - 14, bold=bold, where=f"{nid}:{s[:22]}")
            wt = ' font-weight="700"' if bold else ""
            o.append(f'  <text x="{x + w/2:.1f}" y="{first + i*lead:.1f}" '
                     f'text-anchor="middle" font-size="{size}"{wt} '
                     f'fill="{colour}">{s}</text>')

    def arrow(x1, y, x2):
        o.append(f'  <line x1="{x1:.1f}" y1="{y:.1f}" x2="{x2:.1f}" y2="{y:.1f}" '
                 f'stroke="{MUTED}" stroke-width="2.2" marker-end="url(#sm-k)"/>')

    o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
             f'width="{W}" height="{H}" role="img" aria-labelledby="smTitle smDesc" '
             f'font-family="\'Source Sans 3\', -apple-system, \'Segoe UI\', sans-serif">')
    o.append('  <title id="smTitle">From substrate to method</title>')
    o.append('''  <desc id="smDesc">Two derivations run left to right. In the first, a finite working state raises the
    representation problem, which the method of modeling answers. In the second, probabilistic productive
    work over observable, interposable seams raises the enforcement problem, which the method of alignment
    answers. These are the two core activities Chapter 1 derives; Chapter 4 puts them in motion as the MAGE method.</desc>''')
    o.append(f'''  <defs>
    <marker id="sm-k" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L10,5 L0,10 z" fill="{MUTED}"/>
    </marker>
  </defs>''')
    o.append(f'  <rect x="0" y="0" width="{W}" height="{H}" fill="{PAGE}"/>')

    s = fit.text("From substrate to method", FT, W - 20, bold=True, where="title")
    o.append(f'  <text x="{W/2:.1f}" y="{FT + 6:.1f}" text-anchor="middle" '
             f'font-size="{FT}" font-weight="700" fill="{INK}">{s}</text>')

    # ---- column widths, driven by the longest string each column must carry ----
    PAD, ARR = 20.0, 25.0
    c1 = max(k.adv("finite working state", F),
             k.adv("probabilistic productive work", F),
             k.adv("observable, interposable seams", F)) + PAD
    c2 = max(k.adv("Representation problem", F, True),
             k.adv("Enforcement problem", F, True)) + PAD
    c3 = max(k.adv("Modeling", F + 1, True), k.adv("Alignment", F + 1, True),
             k.adv("represent relevant", F), k.adv("properties compactly", F),
             k.adv("enforce selected obligations", F)) + PAD
    total = c1 + c2 + c3 + 2 * ARR
    x0 = (W - total) / 2
    x1, x2, x3 = x0, x0 + c1 + ARR, x0 + c1 + ARR + c2 + ARR
    if x0 < 0:
        fit.errors.append(f"  ROW TOO WIDE: {total:.1f} > {W:.1f} pt at size {F}")
        x0 = x1 = 0

    hy = FT + 6 + FH + 12
    for cx, cw, lab, col in ((x1, c1, "SUBSTRATE TRAIT", MUTED),
                             (x2, c2, "PROBLEM", RUST),
                             (x3, c3, "METHOD", DGREEN)):
        s = fit.text(lab, FH, cw + 20, bold=True, ls=1.3, where=f"hdr:{lab}")
        o.append(f'  <text x="{cx + cw/2:.1f}" y="{hy:.1f}" text-anchor="middle" '
                 f'font-size="{FH}" font-weight="700" letter-spacing="1.3" '
                 f'fill="{col}">{s}</text>')

    lead = F * 1.2
    def bh(n):      # box height for n text lines
        return n * lead + 18

    # ---- ROW A ---------------------------------------------------------------
    ay = hy + 14
    hA = bh(3)
    cyA = ay + hA / 2
    arrow(x1 + c1 + 4, cyA, x2 - 4)
    arrow(x2 + c2 + 4, cyA, x3 - 4)
    box(x1, ay + (hA - bh(1)) / 2, c1, bh(1), "#f6f4ef", MUTED, 2.0, "trait-a")
    lines_in(x1, c1, ay + (hA - bh(1)) / 2, bh(1),
             [("finite working state", F, False, INK)], "trait-a")
    box(x2, ay + (hA - bh(1)) / 2, c2, bh(1), "#fbeee6", RUST, 2.6, "representation-problem")
    lines_in(x2, c2, ay + (hA - bh(1)) / 2, bh(1),
             [("Representation problem", F, True, RUST)], "representation-problem")
    box(x3, ay, c3, hA, "#e7edf3", FLEET, 2.8, "modeling")
    lines_in(x3, c3, ay, hA, [("Modeling", F + 1, True, INK),
                              ("represent relevant", F, False, MUTED),
                              ("properties compactly", F, False, MUTED)], "modeling")

    # ---- ROW B ---------------------------------------------------------------
    by = ay + hA + 20
    hB = bh(2)
    cyB = by + hB / 2
    arrow(x1 + c1 + 4, cyB, x2 - 4)
    arrow(x2 + c2 + 4, cyB, x3 - 4)
    box(x1, by, c1, hB, "#f6f4ef", MUTED, 2.0, "trait-b")
    lines_in(x1, c1, by, hB, [("probabilistic productive work", F, False, INK),
                              ("observable, interposable seams", F, False, INK)], "trait-b")
    box(x2, by + (hB - bh(1)) / 2, c2, bh(1), "#fbeee6", RUST, 2.6, "authority-problem")
    lines_in(x2, c2, by + (hB - bh(1)) / 2, bh(1),
             [("Enforcement problem", F, True, RUST)], "authority-problem")
    box(x3, by, c3, hB, "#e3f0e7", DGREEN, 2.8, "alignment")
    lines_in(x3, c3, by, hB, [("Alignment", F + 1, True, DGREEN),
                              ("enforce selected obligations", F, False, MUTED)], "alignment")

    # ---- caption -------------------------------------------------------------
    cy = by + hB + F + 14
    rows = k.wrap(CAPTION, F, W - 24, italic=True)
    if cy + (len(rows) - 1) * lead > H - 4:
        fit.errors.append(f"  CAPTION BELOW CANVAS at size {F}")
    for i, s in enumerate(rows):
        fit.text(s, F, W - 24, italic=True, where="caption")
        o.append(f'  <text x="{W/2:.1f}" y="{cy + i*lead:.1f}" text-anchor="middle" '
                 f'font-size="{F}" font-style="italic" fill="{MUTED}">{s}</text>')
    o.append("</svg>")
    return o, fit


best = None
f = 20.0
while f >= 12.0:
    try:
        o, fit = build(f)
        fit.done()
        best = (f, o)
        break
    except SystemExit:
        f -= 0.25
if best is None:
    raise SystemExit("no size fits")
F, out = best
p = Path(str(Path(__file__))[:-3] + ".svg")
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"wrote {p.name}  canvas {W}x{H} pt  smallest label {F:.1f} pt native")
