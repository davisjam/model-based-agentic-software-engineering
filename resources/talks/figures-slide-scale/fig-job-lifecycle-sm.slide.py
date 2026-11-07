#!/usr/bin/env python3
"""Slide-scale variant of book/assets/fig-job-lifecycle-sm.svg (McAfee deck, slide 18 left).

Same wording.  The book figure runs seven states down one column; at this slot a single
column puts the type under 10 pt, so the chain serpentines over two columns — the order
and the single FAILED terminal are unchanged.  viewBox units are POINTS at the placed
width, so font-size == native pt.  Slot comes from argv (width_in height_in).
Never touches book/assets/.
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _svgkit as k  # noqa: E402

W_IN = float(sys.argv[1]) if len(sys.argv) > 1 else 3.630
H_IN = float(sys.argv[2]) if len(sys.argv) > 2 else 3.060
W, H = round(W_IN * 72, 1), round(H_IN * 72, 1)

PAGE, INK, MUTED = "#fdfcf9", "#1c1917", "#57534e"
DARK, BRICK, DGREEN, RAIL = "#2b2825", "#b23b3b", "#155c38", "#d9b3ae"
STATES = ["QUEUED", "CLAIMED", "PLAN + DISPATCH", "WAITING",
          "MERGING", "FINALIZING", "COMPLETED"]
COLA, COLB = STATES[:4], STATES[4:]
QUESTION = "Question: Which transitions exist — and which do not?"
TERMINAL = "terminal — no re-entry into processing"


def build(F: float) -> tuple[list[str], k.Fit]:
    fit = k.Fit("fig-job-lifecycle-sm", W, H)
    o: list[str] = []
    lead = F * 1.2
    BH = lead + 7
    VG = 6.0

    def txt(x, y, s, size, colour, *, anchor="middle", bold=False, maxw=1e9, where=""):
        fit.text(s, size, maxw, bold=bold, where=where or s[:24])
        wt = ' font-weight="700"' if bold else ""
        an = f' text-anchor="{anchor}"' if anchor != "start" else ""
        o.append(f'  <text x="{x:.1f}" y="{y:.1f}"{an} font-size="{size}"{wt} '
                 f'fill="{colour}">{s}</text>')

    o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
             f'width="{W}" height="{H}" role="group" aria-labelledby="jlTitle jlDesc" '
             f'font-family="\'Source Sans 3\', -apple-system, \'Segoe UI\', sans-serif">')
    o.append('  <title id="jlTitle">The remediation job lifecycle — explicit states, and a failure terminal with no re-entry</title>')
    o.append('''  <desc id="jlDesc">A remediation job descends a fixed column of states: QUEUED, then CLAIMED, then PLAN
    and DISPATCH, then WAITING, then MERGING, then FINALIZING, then COMPLETED. Every active state also
    routes to a single terminal state, FAILED. FAILED has no edge back into processing:
    a failed job surfaces, it does not quietly re-enter the pipeline. The legal transitions are an
    enforcement mechanism — one guarded operator is the only writer of state, and it refuses any edge the
    table does not list. Failure is a dead end, not a detour.</desc>''')
    o.append(f'''  <defs>
    <marker id="jl-ar" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L10,5 L0,10 z" fill="{DARK}"/>
    </marker>
    <marker id="jl-arR" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L10,5 L0,10 z" fill="{BRICK}"/>
    </marker>
  </defs>''')
    o.append(f'  <rect x="0" y="0" width="{W}" height="{H}" fill="{PAGE}"/>')

    # ---- the question, above the chain ---------------------------------------
    y = 0.0
    for line in k.wrap(QUESTION, F, W - 4):
        y += lead
        txt(W / 2, y, line, F, MUTED, bold=True, maxw=W - 4, where=f"q:{line[:20]}")
    chain_top = y + 8

    GAPX = 14.0
    bw = (W - GAPX) / 2
    need = max(k.adv(s, F, True) for s in STATES) + 14
    if need > bw:
        fit.errors.append(f"  STATE BOX TOO NARROW: need {need:.1f} > {bw:.1f} at size {F}")
    xa, xb = 0.0, bw + GAPX

    def state(x, y, label, stroke, sw, nid):
        fit.box(x, y, bw, BH, nid)
        o.append(f'  <rect id="{nid}" x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" '
                 f'height="{BH:.1f}" rx="6" fill="#f6f4ef" stroke="{stroke}" '
                 f'stroke-width="{sw}"/>')
        txt(x + bw / 2, y + BH / 2 + F * 0.35, label, F, INK, bold=True, maxw=bw - 12,
            where=f"state:{label}")

    def vdown(x, y1, y2):
        o.append(f'  <line x1="{x:.1f}" y1="{y1:.1f}" x2="{x:.1f}" y2="{y2:.1f}" '
                 f'stroke="{DARK}" stroke-width="1.8" marker-end="url(#jl-ar)"/>')

    ya = chain_top
    for i, s in enumerate(COLA):
        nid = s.lower().replace(" + ", "-").replace(" ", "-")
        state(xa, ya, s, DARK, 1.8, nid)
        if i < len(COLA) - 1:
            vdown(xa + bw / 2, ya + BH, ya + BH + VG)
        ya += BH + VG
    a_bot = ya - VG

    # serpentine link: last of column A across to the first of column B
    link_y = a_bot + VG + 3
    gx = xa + bw + GAPX / 2
    first_b_cy = chain_top + BH / 2
    o.append(f'  <path d="M{xa + bw / 2:.1f},{a_bot:.1f} L{xa + bw / 2:.1f},{link_y:.1f} '
             f'L{gx:.1f},{link_y:.1f} L{gx:.1f},{first_b_cy:.1f} L{xb - 2:.1f},'
             f'{first_b_cy:.1f}" fill="none" stroke="{DARK}" stroke-width="1.8" '
             f'marker-end="url(#jl-ar)"/>')

    yb = chain_top
    for i, s in enumerate(COLB):
        nid = s.lower()
        state(xb, yb, s, DGREEN if s == "COMPLETED" else DARK,
              2.4 if s == "COMPLETED" else 1.8, nid)
        if i < len(COLB) - 1:
            vdown(xb + bw / 2, yb + BH, yb + BH + VG)
        yb += BH + VG
    b_bot = yb - VG

    # ---- the FAILED terminal, fed by a rail from every active state ----------
    fy = max(a_bot + VG + 3, b_bot) + 16
    fw = k.adv("FAILED", F, True) + 34
    fx = (W - fw) / 2
    fit.box(fx, fy, fw, BH, "failed")
    o.append(f'  <rect id="failed" x="{fx:.1f}" y="{fy:.1f}" width="{fw:.1f}" '
             f'height="{BH:.1f}" rx="6" fill="#fbeaea" stroke="{BRICK}" stroke-width="2.2"/>')
    txt(W / 2, fy + BH / 2 + F * 0.35, "FAILED", F, BRICK, bold=True, maxw=fw - 10,
        where="FAILED")
    rail = fy - 11
    o.append(f'  <line x1="{xa + 8:.1f}" y1="{rail:.1f}" x2="{xb + bw - 8:.1f}" '
             f'y2="{rail:.1f}" stroke="{RAIL}" stroke-width="1.6"/>')
    for cx, bot in ((xa + 8, a_bot), (xb + 8, b_bot)):
        o.append(f'  <line x1="{cx:.1f}" y1="{bot:.1f}" x2="{cx:.1f}" y2="{rail:.1f}" '
                 f'stroke="{RAIL}" stroke-width="1.6"/>')
    o.append(f'  <line x1="{W / 2:.1f}" y1="{rail:.1f}" x2="{W / 2:.1f}" y2="{fy - 1:.1f}" '
             f'stroke="{BRICK}" stroke-width="1.8" marker-end="url(#jl-arR)"/>')
    txt(0.0, fy + BH / 2 + F * 0.35, "any active state", F, BRICK, anchor="start",
        maxw=fx - 6, where="any active state")

    ty = fy + BH
    for line in k.wrap(TERMINAL, F, W - 4):
        ty += lead
        txt(W / 2, ty, line, F, BRICK, maxw=W - 4, where=f"t:{line[:20]}")
    if ty > H - 1:
        fit.errors.append(f"  TERMINAL CAPTION OVERFLOWS: {ty:.1f} > {H:.1f} at size {F}")
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
