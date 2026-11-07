#!/usr/bin/env python3
"""Slide-scale variant of book/assets/docable-glimpse.svg (McAfee deck, slide 3).

Same wording, re-laid-out for the slot left of the pull-quote card.  viewBox units are
POINTS at the placed width, so font-size == native pt.  The slot is the tightest in the
deck, so this script takes the placement as argv (width_in height_in) and reports the
largest body size that fits — run it for a candidate slot before committing the slide
geometry.  Defaults to the shipped slot.  Never touches book/assets/.
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _svgkit as k  # noqa: E402

W_IN = float(sys.argv[1]) if len(sys.argv) > 1 else 6.150
H_IN = float(sys.argv[2]) if len(sys.argv) > 2 else 2.500
W, H = round(W_IN * 72, 1), round(H_IN * 72, 1)

PAGE, INK, MUTED = "#fdfcf9", "#1c1917", "#57534e"
BRICK, FLEET, GREEN, BAR = "#b23b3b", "#2f5169", "#1f7a4d", "#cfc9c0"


def build(F: float) -> tuple[list[str], k.Fit]:
    FT = F + 3.0                 # figure title / DocAble wordmark
    fit = k.Fit("docable-glimpse", W, H)
    o: list[str] = []
    lead = F * 1.2

    def txt(x, y, s, size, colour, *, bold=False, italic=False, maxw=1e9, where=""):
        fit.text(s, size, maxw, bold=bold, italic=italic, where=where or s[:24])
        st = ' font-weight="700"' if bold else (' font-style="italic"' if italic else "")
        o.append(f'  <text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" '
                 f'font-size="{size}"{st} fill="{colour}">{s}</text>')

    o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
             f'width="{W}" height="{H}" role="group" aria-labelledby="dgTitle dgDesc" '
             f'font-family="\'Source Sans 3\', -apple-system, \'Segoe UI\', sans-serif">')
    o.append('  <title id="dgTitle">A running glimpse of DocAble — one object in, one object back</title>')
    o.append('''  <desc id="dgDesc">A single input-to-output panel with no internal structure. On the left, an inaccessible
    document: a page with unlabeled images, no reading order, and no tags, marked not accessible. An arrow
    labelled the upload leads into DocAble, drawn as one closed box — the production system at
    scholaccess.com — with a note that this shows what it does, not yet how. An arrow labelled the file,
    remediated leads out to the right, to an accessible document with described images, reading order, and
    tags, carrying an evidence record in which every fix is explained. The caption reads: here is the kind
    of production system these ideas govern — what it does, not yet how.</desc>''')
    o.append(f'''  <defs>
    <marker id="dg-ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L10,5 L0,10 z" fill="{INK}"/>
    </marker>
  </defs>''')
    o.append(f'  <rect x="0" y="0" width="{W}" height="{H}" fill="{PAGE}"/>')

    # ---- heading -------------------------------------------------------------
    y = FT * 0.95 + 1
    txt(W / 2, y, "A running glimpse of DocAble", FT, INK, bold=True, maxw=W - 12,
        where="title")
    y += lead + 1
    txt(W / 2, y, "One object in, one object back.", F, MUTED, italic=True, maxw=W - 12,
        where="subtitle")
    top = y + 6

    # ---- column widths -------------------------------------------------------
    # the arrow gap must HOLD its label — an overhanging label lands on a panel
    ARR = max(k.adv("upload", F, italic=True), k.adv("remediated", F, italic=True),
              k.adv("file", F, italic=True)) + 10
    sys_rows = k.wrap("the production system", F, 0.30 * W)
    C = max(k.adv("DocAble", FT, True), k.adv("scholaccess.com", F),
            *[k.adv(r, F) for r in sys_rows]) + 18
    S = (W - C - 2 * ARR) / 2
    if S < 60:
        fit.errors.append(f"  SIDE COLUMNS TOO NARROW: {S:.1f} pt at size {F}")
        S = 60
    xL, xC, xR = 0.0, S + ARR, S + ARR + C + ARR

    # ---- side panels ---------------------------------------------------------
    def panel(x, inner_italic, inner_pill, stroke, fillpill, pillfill, barcol, nid):
        ital = k.wrap(inner_italic, F, S - 14)
        rows = len(ital) + len(k.wrap(inner_pill, F, S - 16))
        ph = rows * lead + 17
        fit.box(x, top, S, ph, nid)
        o.append(f'  <rect id="{nid}" x="{x:.1f}" y="{top:.1f}" width="{S:.1f}" '
                 f'height="{ph:.1f}" rx="5" fill="#ffffff" stroke="{stroke}" '
                 f'stroke-width="2.2"/>')
        # three text bars, standing for the page's body copy
        bw = [S * 0.40, S * 0.52, S * 0.30]
        for i, w in enumerate(bw):
            o.append(f'  <rect x="{x + 7:.1f}" y="{top + 6 + i * 4.6:.1f}" '
                     f'width="{w:.1f}" height="2.6" rx="1.2" fill="{barcol}"/>')
        iy = top + 8 + 3 * 4.6 + lead * 0.75
        o.append(f'  <rect x="{x + 5:.1f}" y="{iy - lead * 0.78:.1f}" '
                 f'width="{S - 10:.1f}" height="{len(ital) * lead + 3:.1f}" rx="2.5" '
                 f'fill="{fillpill}" stroke="{stroke}" stroke-width="1.1"'
                 f'{" stroke-dasharray=\"3.5 2.5\"" if nid == "dg-input" else ""}/>')
        for j, line in enumerate(ital):
            txt(x + S / 2, iy + j * lead, line, F, stroke, italic=True, maxw=S - 14,
                where=f"{nid}:{line}")
        iy += (len(ital) - 1) * lead
        py = iy + lead + 4
        pill = k.wrap(inner_pill, F, S - 16)
        pw = min(max(k.adv(r, F, True) for r in pill) + 14, S - 4)
        phh = len(pill) * lead + 2
        o.append(f'  <rect x="{x + (S - pw) / 2:.1f}" y="{py - lead * 0.76:.1f}" '
                 f'width="{pw:.1f}" height="{phh:.1f}" rx="{min(lead + 2, phh) / 2:.1f}" '
                 f'fill="{pillfill}" stroke="{stroke}" stroke-width="1.1"/>')
        for j, r in enumerate(pill):
            txt(x + S / 2, py + j * lead, r, F, stroke, bold=True, maxw=S - 16,
                where=f"{nid}:{r}")
        return max(top + ph, py + (len(pill) - 1) * lead + 5)

    bl = panel(xL, "image — no alt text", "not accessible", BRICK, "#f6f4ef",
               "#fbeaea", BAR, "dg-input")
    br = panel(xR, "image — described", "✓ evidence record", GREEN, "#eef7ee",
               "#e3f0e7", MUTED, "dg-output")
    pbot = max(bl, br)

    # ---- the closed box ------------------------------------------------------
    ch = FT * 1.15 + (len(sys_rows) + 1) * lead + 14
    cy = top + (pbot - top - ch) / 2
    fit.box(xC, cy, C, ch, "dg-docable")
    o.append(f'  <rect id="dg-docable" x="{xC:.1f}" y="{cy:.1f}" width="{C:.1f}" '
             f'height="{ch:.1f}" rx="9" fill="#e7edf3" stroke="{FLEET}" stroke-width="2.6"/>')
    ty = cy + 9 + FT * 0.80
    txt(xC + C / 2, ty, "DocAble", FT, FLEET, bold=True, maxw=C - 12, where="DocAble")
    for r in sys_rows:
        ty += lead
        txt(xC + C / 2, ty, r, F, MUTED, italic=True, maxw=C - 12, where=f"sys:{r}")
    ty += lead
    txt(xC + C / 2, ty, "scholaccess.com", F, MUTED, maxw=C - 12, where="scholaccess.com")

    # ---- arrows, labels riding above them ------------------------------------
    amid = cy + ch / 2
    for x1, x2, labels in ((xL + S + 3, xC - 3, ["upload"]),
                           (xC + C + 3, xR - 3, ["remediated", "file"])):
        o.append(f'  <path d="M{x1:.1f},{amid:.1f} L{x2:.1f},{amid:.1f}" fill="none" '
                 f'stroke="{INK}" stroke-width="2.2" marker-end="url(#dg-ah)"/>')
        ly = amid - 6 - (len(labels) - 1) * lead
        for s in labels:
            txt((x1 + x2) / 2, ly, s, F, MUTED, italic=True, maxw=ARR - 2,
                where=f"arrow:{s}")
            ly += lead

    # ---- captions under each panel -------------------------------------------
    def caption(x, bold_s, body_s, colour, ystart, cw):
        yy = ystart
        for line in k.wrap(bold_s, F, cw):
            yy += lead
            txt(x + cw / 2, yy, line, F, colour, bold=True, maxw=cw,
                where=f"cap:{line[:18]}")
        for line in k.wrap(body_s, F, cw):
            yy += lead
            txt(x + cw / 2, yy, line, F, MUTED, italic=True, maxw=cw,
                where=f"cap:{line[:18]}")
        return yy

    c0 = pbot + 1
    HALF = (W - 10) / 2
    e1 = caption(0.0, "inaccessible document",
                 "unlabeled images · untagged · no reading order", BRICK, c0, HALF)
    e2 = caption(HALF + 10, "accessible document + evidence",
                 "tagged · reading order · every fix explained", GREEN, c0, HALF)
    if max(e1, e2) > H - 2:
        fit.errors.append(f"  CAPTIONS OVERFLOW: {max(e1, e2):.1f} > {H:.1f} at size {F}")
    o.append("</svg>")
    return o, fit


best, f = None, 20.0
while f >= 9.0:
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
print(f"wrote {p.name}  slot {W_IN}x{H_IN} in  canvas {W}x{H} pt  "
      f"smallest label {F:.1f} pt native")
