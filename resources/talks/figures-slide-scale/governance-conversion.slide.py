#!/usr/bin/env python3
"""Slide-scale variant of book/assets/governance-conversion.svg (McAfee deck, slide 15).

Same wording, re-laid-out for a 9.340 x 3.880 in placement.  viewBox units are POINTS
at that placement, so font-size == native pt.

The book figure is a tall funnel (aspect 1.35); the slide strip is 2.4:1, so the two
middle levels — the diagnostic category ("what was missing") and the encoded answer —
share one two-part cell with an internal rule rather than sitting on separate rows.
Both readings survive: the blue category on top, the encoded answer below.
Never touches book/assets/.
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _svgkit as k  # noqa: E402

W, H = 672.5, 279.4          # 9.340 x 3.880 in, in points
PAGE, INK, MUTED = "#fdfcf9", "#1c1917", "#57534e"
FLEET, BRICK, DRED, AMBER = "#2f5169", "#b23b3b", "#8a2f2f", "#a6801f"
DGREEN, CAPITAL = "#3d6b4a", "#2f5137"

BRANCHES = [("representation", "model"), ("obligation", "invariant"),
            ("evidence", "sensor"), ("evaluation", "validator"),
            ("enforcement", "constraint / gate")]
CAPTION = ("a failure is not a request for another gate — "
           "diagnose what was missing, then encode it")


def build(F: float) -> tuple[list[str], k.Fit]:
    FH = F + 1.0
    fit = k.Fit("governance-conversion", W, H)
    o: list[str] = []
    lead = F * 1.2

    def rect(x, y, w, h, fill, stroke, sw, nid, rx=7):
        fit.box(x, y, w, h, nid)
        o.append(f'  <rect id="{nid}" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" '
                 f'height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" '
                 f'stroke-width="{sw}"/>')

    def centred(x, w, y, s, size, colour, bold=True, italic=False, ls=0.0, where=""):
        fit.text(s, size, w - 15, bold=bold, italic=italic, ls=ls, where=where or s[:22])
        st = ' font-weight="700"' if bold else (' font-style="italic"' if italic else "")
        lsa = f' letter-spacing="{ls}"' if ls else ""
        o.append(f'  <text x="{x + w/2:.1f}" y="{y:.1f}" text-anchor="middle" '
                 f'font-size="{size}"{st}{lsa} fill="{colour}">{s}</text>')

    def vline(x, y1, y2, colour=FLEET):
        o.append(f'  <line x1="{x:.1f}" y1="{y1:.1f}" x2="{x:.1f}" y2="{y2:.1f}" '
                 f'stroke="{colour}" stroke-width="2" marker-end="url(#gc-ah)"/>')

    o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
             f'width="{W}" height="{H}" role="img" aria-labelledby="gcTitle gcDesc" '
             f'font-family="\'Source Sans 3\', -apple-system, \'Segoe UI\', sans-serif">')
    o.append('''  <title id="gcTitle">Governance conversion: a failure is diagnosed for what was missing, and the missing
    piece is encoded as durable structure that future work benefits from inheriting as engineering capital</title>''')
    o.append('''  <desc id="gcDesc">A failure or surprise flows down into one question — what was missing — which fans
    into five branches: missing representation/semantics, obligation, evidence, evaluation, or consequence.
    Each branch encodes a durable answer: a model, an invariant, a sensor, a validator, or a constraint or
    gate. The five converge into durable engineering structure, which future work benefits from inheriting,
    accumulating as engineering capital. The figure's point: a recurring failure is not automatically a request for another
    gate — you diagnose what the environment lacked and encode that.</desc>''')
    o.append(f'''  <defs>
    <marker id="gc-ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L10,5 L0,10 z" fill="{FLEET}"/>
    </marker>
  </defs>''')
    o.append(f'  <rect x="0" y="0" width="{W}" height="{H}" fill="{PAGE}"/>')

    BH1 = lead + 10          # one-line box
    ARR = 8.0
    y = 2.0

    # level 1 — failure
    wf = k.adv("FAILURE / SURPRISE", FH, True) + 34
    rect((W - wf) / 2, y, wf, BH1, "#f6ece9", BRICK, 2.0, "gc-failure")
    centred((W - wf) / 2, wf, y + BH1 / 2 + FH * 0.35, "FAILURE / SURPRISE", FH, DRED)
    vline(W / 2, y + BH1 + 1, y + BH1 + ARR)
    y += BH1 + ARR + 1

    # level 2 — the diagnosis question
    wq = k.adv("What was missing?", FH, True) + 40
    rect((W - wq) / 2, y, wq, BH1, "#fbf6e9", AMBER, 2.0, "gc-diagnosis")
    centred((W - wq) / 2, wq, y + BH1 / 2 + FH * 0.35, "What was missing?", FH, "#7a5c12")
    qbot = y + BH1
    y += BH1 + ARR + 1

    # level 3 — five two-part cells: the missing category over the encoded answer
    GAP, MGN = 9.0, 2.0
    cw = (W - 2 * MGN - 4 * GAP) / 5
    ch = 2 * lead + 12
    fanx = []
    for i, (cat, ans) in enumerate(BRANCHES):
        x = MGN + i * (cw + GAP)
        fanx.append(x + cw / 2)
        rect(x, y, cw, ch, "#e7edf3", FLEET, 2.0, f"gc-branch-{cat}")
        o.append(f'  <line x1="{x+6:.1f}" y1="{y + lead + 5:.1f}" x2="{x+cw-6:.1f}" '
                 f'y2="{y + lead + 5:.1f}" stroke="{FLEET}" stroke-width="1" '
                 f'stroke-dasharray="3 3" opacity="0.55"/>')
        centred(x, cw, y + lead - 1, cat, F, FLEET, where=f"cat:{cat}")
        centred(x, cw, y + 2 * lead + 6, ans, F, INK, bold=False, where=f"ans:{ans}")
    # fan from the question down to each cell
    mid = qbot + (ARR - 2) / 2
    o.append(f'  <path d="M{W/2:.1f},{qbot:.1f} L{W/2:.1f},{mid:.1f}" fill="none" '
             f'stroke="{FLEET}" stroke-width="2"/>')
    o.append(f'  <path d="M{fanx[0]:.1f},{mid:.1f} L{fanx[-1]:.1f},{mid:.1f}" fill="none" '
             f'stroke="{FLEET}" stroke-width="2"/>')
    for fx in fanx:
        vline(fx, mid, y - 1)
    y += ch + ARR + 1

    # converge into durable structure
    for fx in fanx:
        o.append(f'  <path d="M{fx:.1f},{y - ARR - 1:.1f} L{fx:.1f},{y - ARR + 4:.1f} '
                 f'L{W/2:.1f},{y - ARR + 4:.1f}" fill="none" stroke="{FLEET}" '
                 f'stroke-width="1.6"/>')
    o.append(f'  <line x1="{W/2:.1f}" y1="{y - ARR + 4:.1f}" x2="{W/2:.1f}" y2="{y-1:.1f}" '
             f'stroke="{FLEET}" stroke-width="2" marker-end="url(#gc-ah)"/>')

    wd = k.adv("DURABLE ENGINEERING STRUCTURE", F, True) + 40
    rect((W - wd) / 2, y, wd, BH1, "#e7edf3", FLEET, 2.2, "gc-durable")
    centred((W - wd) / 2, wd, y + BH1 / 2 + F * 0.35, "DURABLE ENGINEERING STRUCTURE", F, INK)
    vline(W / 2, y + BH1 + 1, y + BH1 + ARR)
    y += BH1 + ARR + 1

    wu = k.adv("FUTURE WORK BENEFITS FROM INHERITING IT", F, True) + 40
    rect((W - wu) / 2, y, wu, BH1, "#eef3ee", DGREEN, 2.0, "gc-future")
    centred((W - wu) / 2, wu, y + BH1 / 2 + F * 0.35,
            "FUTURE WORK BENEFITS FROM INHERITING IT", F, CAPITAL)
    vline(W / 2, y + BH1 + 1, y + BH1 + ARR)
    y += BH1 + ARR + 1

    wc = k.adv("ENGINEERING CAPITAL", FH, True) + 46
    rect((W - wc) / 2, y, wc, BH1 + 2, DGREEN, CAPITAL, 2.0, "gc-capital", rx=9)
    centred((W - wc) / 2, wc, y + (BH1 + 2) / 2 + FH * 0.35, "ENGINEERING CAPITAL",
            FH, "#ffffff")
    y += BH1 + 2

    rows = k.wrap(CAPTION, F, W - 24, italic=True)
    cy = y + F + 5
    if cy + (len(rows) - 1) * lead > H - 3:
        fit.errors.append(f"  CAPTION BELOW CANVAS at size {F}")
    for i, s in enumerate(rows):
        centred(0, W, cy + i * lead, s, F, MUTED, bold=False, italic=True, where="caption")
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
