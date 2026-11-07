#!/usr/bin/env python3
"""Slide-scale variant of book/assets/component-model-structure.svg (McAfee deck, slide 18 right).

Same wording, re-laid-out for the right half of the two-up.  viewBox units are POINTS at
the placed width, so font-size == native pt.  Slot comes from argv (width_in height_in).
Never touches book/assets/.
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _svgkit as k  # noqa: E402

W_IN = float(sys.argv[1]) if len(sys.argv) > 1 else 5.270
H_IN = float(sys.argv[2]) if len(sys.argv) > 2 else 3.060
W, H = round(W_IN * 72, 1), round(H_IN * 72, 1)

PAGE, INK, MUTED = "#fdfcf9", "#1c1917", "#57534e"
RUST, FLEET = "#9a3f12", "#2f5169"
CONSUMERS = ["Boundary lints", "Dispatch", "Context injection"]


def build(F: float) -> tuple[list[str], k.Fit]:
    fit = k.Fit("component-model-structure", W, H)
    o: list[str] = []
    lead = F * 1.2

    def txt(x, y, s, size, colour, *, bold=True, maxw=1e9, where=""):
        fit.text(s, size, maxw, bold=bold, where=where or s[:24])
        wt = ' font-weight="700"' if bold else ""
        o.append(f'  <text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" '
                 f'font-size="{size}"{wt} fill="{colour}">{s}</text>')

    o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
             f'width="{W}" height="{H}" role="group" aria-labelledby="cmTitle cmDesc" '
             f'font-family="\'Source Sans 3\', -apple-system, \'Segoe UI\', sans-serif">')
    o.append('  <title id="cmTitle">One component registry, every tool reading the same ownership answer</title>')
    o.append('''  <desc id="cmDesc">The component registry feeds the boundary lints, the agent dispatch, and the
    dynamic context injection, so every tool reads the same ownership answer. A reverse-mapping
    test joins the registry to the real directory tree and fails the build if the declared zones
    and the tree disagree in either direction.</desc>''')
    o.append(f'''  <defs>
    <marker id="cm-ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L10,5 L0,10 z" fill="{INK}"/>
    </marker>
  </defs>''')
    o.append(f'  <rect x="0" y="0" width="{W}" height="{H}" fill="{PAGE}"/>')

    GAPX = 26.0
    rw = max(k.adv(c, F, True) for c in CONSUMERS) + 22      # consumer column
    lw = W - rw - GAPX                                        # cylinder column
    reg_rows = k.wrap("Component registry", F, lw - 24)
    tree_rows = k.wrap("Real directory tree", F, lw - 24)
    rmt_rows = k.wrap("Reverse-mapping test", F, min(lw, rw) + GAPX - 50)
    if lw < 70:
        fit.errors.append(f"  LEFT COLUMN TOO NARROW: {lw:.1f} at size {F}")
    xr = lw + GAPX

    def cylinder(x, y, w, rows, fill, stroke, nid):
        body = len(rows) * lead + 16
        ry = max(6.0, w * 0.075)
        fit.box(x, y - ry, w, body + 2 * ry + 5, nid)
        o.append(f'  <path id="{nid}" d="M {x:.1f},{y:.1f} v {body:.1f} '
                 f'a {w/2:.1f},{ry:.1f} 0 0 0 {w:.1f},0 v -{body:.1f}" '
                 f'fill="{fill}" stroke="{stroke}" stroke-width="1.8"/>')
        o.append(f'  <ellipse cx="{x + w/2:.1f}" cy="{y:.1f}" rx="{w/2:.1f}" '
                 f'ry="{ry:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="1.8"/>')
        ty = y + ry + lead * 0.95
        for r in rows:
            txt(x + w / 2, ty, r, F, INK, maxw=w - 18, where=f"{nid}:{r}")
            ty += lead
        return y + body + ry

    BH = lead + 14
    VG = 10.0
    # consumer stack on the right
    ytop = 2.0
    cys = []
    for i, c in enumerate(CONSUMERS):
        yy = ytop + i * (BH + VG)
        fit.box(xr, yy, rw, BH, f"consumer-{i}")
        o.append(f'  <rect id="consumer-{i}" x="{xr:.1f}" y="{yy:.1f}" width="{rw:.1f}" '
                 f'height="{BH:.1f}" rx="6" fill="#e7edf3" stroke="{FLEET}" '
                 f'stroke-width="1.8"/>')
        txt(xr + rw / 2, yy + BH / 2 + F * 0.35, c, F, INK, maxw=rw - 14,
            where=f"consumer:{c}")
        cys.append(yy + BH / 2)
    cons_bot = ytop + 3 * BH + 2 * VG

    # registry cylinder, vertically centred against the consumer stack
    reg_h = len(reg_rows) * lead + 16 + 2 * max(6.0, lw * 0.075)
    reg_y = ytop + max(6.0, lw * 0.075) + (cons_bot - ytop - reg_h) / 2
    reg_bot = cylinder(0.0, reg_y, lw, reg_rows, "#faf1e6", RUST, "registry")
    for cy in cys:
        o.append(f'  <path d="M{lw:.1f},{(reg_y + reg_bot) / 2:.1f} '
                 f'C{lw + GAPX * 0.5:.1f},{(reg_y + reg_bot) / 2:.1f} '
                 f'{xr - GAPX * 0.5:.1f},{cy:.1f} {xr - 2:.1f},{cy:.1f}" fill="none" '
                 f'stroke="{INK}" stroke-width="1.6" marker-end="url(#cm-ah)"/>')

    # the real directory tree, below the registry
    tree_y = cons_bot + 16 + max(6.0, lw * 0.075)
    tree_bot = cylinder(0.0, tree_y, lw, tree_rows, "#f6f4ef", MUTED, "tree")

    # the reverse-mapping test, a hexagon to the right of the tree
    hh = len(rmt_rows) * lead + 18
    notch = 12.0
    hw = max(k.adv(r, F, True) for r in rmt_rows) + 2 * notch + 14
    if hw > W - lw - 6:
        fit.errors.append(f"  HEXAGON TOO WIDE: {hw:.1f} > {W - lw - 6:.1f} at size {F}")
    hx = W - hw - 2
    hcy = (tree_y + tree_bot) / 2
    fit.box(hx, hcy - hh / 2, hw, hh, "reverse-mapping-test")
    o.append(f'  <polygon id="reverse-mapping-test" points="'
             f'{hx:.1f},{hcy:.1f} {hx + notch:.1f},{hcy - hh/2:.1f} '
             f'{hx + hw - notch:.1f},{hcy - hh/2:.1f} {hx + hw:.1f},{hcy:.1f} '
             f'{hx + hw - notch:.1f},{hcy + hh/2:.1f} {hx + notch:.1f},{hcy + hh/2:.1f}" '
             f'fill="#e7edf3" stroke="{FLEET}" stroke-width="1.8"/>')
    ry0 = hcy - (len(rmt_rows) - 1) * lead / 2 + F * 0.35
    for i, r in enumerate(rmt_rows):
        txt(hx + hw / 2, ry0 + i * lead, r, F, INK, maxw=hw - 2 * notch - 4,
            where=f"rmt:{r}")
    o.append(f'  <line x1="{lw:.1f}" y1="{hcy:.1f}" x2="{hx - 2:.1f}" y2="{hcy:.1f}" '
             f'stroke="{INK}" stroke-width="1.6" marker-end="url(#cm-ah)"/>')
    o.append(f'  <path d="M{lw * 0.80:.1f},{reg_bot:.1f} '
             f'C{lw * 0.95:.1f},{tree_y - 6:.1f} {hx - 26:.1f},{hcy - hh/2 - 14:.1f} '
             f'{hx + notch + 6:.1f},{hcy - hh/2 - 2:.1f}" fill="none" stroke="{INK}" '
             f'stroke-width="1.6" marker-end="url(#cm-ah)"/>')
    if tree_bot > H - 3:
        fit.errors.append(f"  TREE OVERFLOWS: {tree_bot:.1f} > {H:.1f} at size {F}")
    if hcy + hh / 2 > H - 3:
        fit.errors.append(f"  HEXAGON OVERFLOWS at size {F}")
    o.append("</svg>")
    return o, fit


best, f = None, 22.0
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
