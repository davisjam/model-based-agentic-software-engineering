#!/usr/bin/env python3
"""Slide-scale variant of book/assets/specified-region.svg (McAfee deck, slide 10).

Same wording, re-laid-out for a 9.340 x 3.220 in placement.  viewBox units are POINTS
at that placement, so font-size == native pt.  The book figure is 2:1; the slide strip
is 2.9:1, so the three side annotations gain width and the stacked region narrows.
Never touches book/assets/.
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _svgkit as k  # noqa: E402

W, H = 672.5, 231.8          # 9.340 x 3.220 in, in points
PAGE, INK, MUTED = "#fdfcf9", "#1c1917", "#57534e"
RUST, FLEET = "#9a3f12", "#2f5169"

LCOL, CCOL, RCOL = 110.0, 357.0, 172.0      # left annot / centre stack / right annot
LGAP, RGAP = 12.0, 14.0


def build(F: float) -> tuple[list[str], k.Fit]:
    FH = F + 2.0                 # box headers (caps)
    fit = k.Fit("specified-region", W, H)
    o: list[str] = []
    lead = F * 1.2
    cx = LCOL + LGAP                       # centre column left edge
    rx = cx + CCOL + RGAP                  # right column left edge
    if rx + RCOL > W + 0.01:
        fit.errors.append("  COLUMNS WIDER THAN CANVAS")

    def txt(x, y, s, size, colour, *, anchor="start", bold=False, italic=False,
            ls=0.0, maxw=1e9, where=""):
        fit.text(s, size, maxw, bold=bold, italic=italic, ls=ls, where=where or s[:24])
        st = ' font-weight="700"' if bold else (' font-style="italic"' if italic else "")
        lsa = f' letter-spacing="{ls}"' if ls else ""
        an = f' text-anchor="{anchor}"' if anchor != "start" else ""
        o.append(f'  <text x="{x:.1f}" y="{y:.1f}"{an} font-size="{size}"{st}{lsa} '
                 f'fill="{colour}">{s}</text>')

    def block(x, ytop, w, title, tcol, body, *, anchor="start"):
        """A side annotation: bold title line, then wrapped body. Returns bottom y."""
        y = ytop + F
        ax = x if anchor == "start" else x + w
        txt(ax, y, title, F, tcol, anchor=anchor, bold=True, maxw=w,
            where=f"annot:{title}")
        for line in k.wrap(body, F, w):
            y += lead
            txt(ax, y, line, F, MUTED, anchor=anchor, maxw=w, where=f"annot:{line[:20]}")
        return y + 3

    o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
             f'width="{W}" height="{H}" role="img" aria-labelledby="srTitle srDesc" '
             f'font-family="\'Source Sans 3\', -apple-system, \'Segoe UI\', sans-serif">')
    o.append('  <title id="srTitle">Obligation, scaffolding, and degrees of freedom</title>')
    o.append('''  <desc id="srDesc">A stacked diagram. The specified region groups two layers: the engineering
    obligation, holding consequential distinctions that must be preserved, and scaffolding, the
    additional structure this agent needs to interpret and satisfy the obligation reliably. The
    obligation boundary between them is set by the engineering problem and does not move with
    capability. The specification boundary below the scaffolding is set by the obligation and by this
    agent's capability. Below it sit the degrees of freedom: implementation choices left to the agent.
    An upward arrow shows that greater agent capability can reduce required scaffolding.</desc>''')
    o.append(f'''  <defs>
    <marker id="sr-a" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0 0 L10 5 L0 10 z" fill="{FLEET}"/>
    </marker>
  </defs>''')
    o.append(f'  <rect x="0" y="0" width="{W}" height="{H}" fill="{PAGE}"/>')

    # ---- centre stack geometry ------------------------------------------------
    PADV = 7.0
    ob_body = k.wrap("consequential distinctions that must be preserved", F, CCOL - 26)
    sc_body = k.wrap("additional structure this agent needs to interpret and satisfy "
                     "the obligation reliably", F, CCOL - 26)
    df_body = k.wrap("implementation choices left to the agent", F, CCOL - 26)
    h_ob = FH + len(ob_body) * lead + 2 * PADV
    h_sc = FH + len(sc_body) * lead + 2 * PADV
    h_df = FH + len(df_body) * lead + 2 * PADV

    region_lab_h = F + 7
    SEP = 15.0                      # room for a boundary rule between the blocks
    total = region_lab_h + h_ob + SEP + h_sc + SEP + h_df
    y0 = (H - total) / 2
    if y0 < 1:
        fit.errors.append(f"  STACK TOO TALL: {total:.1f} > {H:.1f} pt at size {F}")
        y0 = 1

    # dashed SPECIFIED REGION container wraps the obligation + scaffolding blocks
    reg_top = y0
    reg_h = region_lab_h + h_ob + SEP + h_sc + 7
    fit.box(cx - 10, reg_top, CCOL + 20, reg_h, "specified-region")
    o.append(f'  <rect x="{cx - 10:.1f}" y="{reg_top:.1f}" width="{CCOL + 20:.1f}" '
             f'height="{reg_h:.1f}" rx="11" fill="#f6f4ef" stroke="{MUTED}" '
             f'stroke-width="1.4" stroke-dasharray="7 5"/>')
    txt(cx + CCOL / 2, reg_top + F + 3, "SPECIFIED REGION", F, MUTED, anchor="middle",
        bold=True, ls=1.1, maxw=CCOL, where="SPECIFIED REGION")

    def stack_box(y, h, header, hcol, body, fill, stroke, nid):
        fit.box(cx, y, CCOL, h, nid)
        o.append(f'  <rect id="{nid}" x="{cx:.1f}" y="{y:.1f}" width="{CCOL:.1f}" '
                 f'height="{h:.1f}" rx="8" fill="{fill}" stroke="{stroke}" '
                 f'stroke-width="2"/>')
        ty = y + PADV + FH * 0.82
        txt(cx + CCOL / 2, ty, header, FH, hcol, anchor="middle", bold=True,
            maxw=CCOL - 20, where=header)
        for line in body:
            ty += lead
            txt(cx + CCOL / 2, ty, line, F, MUTED, anchor="middle", maxw=CCOL - 20,
                where=f"{nid}:{line[:20]}")

    y_ob = reg_top + region_lab_h
    stack_box(y_ob, h_ob, "ENGINEERING OBLIGATION", RUST, ob_body, "#faf1e6", RUST,
              "engineering-obligation")
    y_ob_bound = y_ob + h_ob + SEP / 2
    y_sc = y_ob + h_ob + SEP
    stack_box(y_sc, h_sc, "SCAFFOLDING", FLEET, sc_body, "#e7edf3", FLEET, "scaffolding")
    y_spec_bound = y_sc + h_sc + SEP / 2
    y_df = y_sc + h_sc + SEP
    stack_box(y_df, h_df, "DEGREES OF FREEDOM", MUTED, df_body, PAGE, MUTED,
              "degrees-of-freedom")

    # ---- the two named boundaries --------------------------------------------
    o.append(f'  <line x1="{cx:.1f}" y1="{y_ob_bound:.1f}" x2="{cx + CCOL:.1f}" '
             f'y2="{y_ob_bound:.1f}" stroke="{RUST}" stroke-width="1.6"/>')
    o.append(f'  <line x1="{cx - 10:.1f}" y1="{y_spec_bound:.1f}" x2="{cx + CCOL + 10:.1f}" '
             f'y2="{y_spec_bound:.1f}" stroke="{INK}" stroke-width="2.4"/>')
    o.append(f'  <line x1="{cx + CCOL:.1f}" y1="{y_ob_bound:.1f}" x2="{rx - 5:.1f}" '
             f'y2="{y_ob_bound:.1f}" stroke="{RUST}" stroke-width="1" '
             f'stroke-dasharray="3 3"/>')
    o.append(f'  <line x1="{cx + CCOL + 10:.1f}" y1="{y_spec_bound:.1f}" x2="{rx - 5:.1f}" '
             f'y2="{y_spec_bound:.1f}" stroke="{INK}" stroke-width="1" '
             f'stroke-dasharray="3 3"/>')

    # ---- right annotations, each centred on its boundary ----------------------
    n1 = 1 + len(k.wrap("set by the engineering problem; does not move with capability",
                        F, RCOL))
    b1_top = y_ob_bound - (n1 * lead) / 2 - 2
    b1_bot = block(rx, max(1.0, b1_top), RCOL, "obligation boundary", RUST,
                   "set by the engineering problem; does not move with capability")
    n2 = 1 + len(k.wrap("set by the obligation and by this agent's capability", F, RCOL))
    b2_top = max(b1_bot + 4, y_spec_bound - (n2 * lead) / 2 - 2)
    b2_bot = block(rx, b2_top, RCOL, "specification boundary", INK,
                   "set by the obligation and by this agent's capability")
    if b2_bot > H - 1:
        fit.errors.append(f"  RIGHT ANNOTATIONS OVERFLOW: {b2_bot:.1f} > {H:.1f}")

    # ---- left annotation + capability arrow -----------------------------------
    ax = LCOL
    o.append(f'  <line x1="{ax + 6:.1f}" y1="{y_df - 4:.1f}" x2="{ax + 6:.1f}" '
             f'y2="{y_sc + 8:.1f}" stroke="{FLEET}" stroke-width="2" '
             f'marker-end="url(#sr-a)"/>')
    lbody = k.wrap("greater agent capability can reduce required scaffolding", F, LCOL - 14)
    ltop = y_spec_bound - (len(lbody) * lead) / 2 - lead * 0.2
    ltop = min(max(ltop, 1.0), H - len(lbody) * lead - 2)
    ly = ltop
    for line in lbody:
        ly += lead
        txt(ax - 8, ly, line, F, MUTED, anchor="end", maxw=LCOL - 14,
            where=f"left:{line[:18]}")
    o.append("</svg>")
    return o, fit


best, f = None, 20.0
while f >= 11.0:
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
