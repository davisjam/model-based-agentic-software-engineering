#!/usr/bin/env python3
"""Slide-scale variant of book/assets/engineering-leverage.svg (McAfee deck, slide 14).

Same wording, re-laid-out for a 9.340 x 3.840 in placement so the type clears the
legibility floor.  viewBox units are POINTS at that placement, so font-size == native pt.
Writes engineering-leverage.slide.svg beside this file.  Never touches book/assets/.
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _svgkit as k  # noqa: E402

W, H = 672.5, 276.5          # 9.340 x 3.840 in, in points
F = 16.0                     # body size == native pt
FB = 17.0                    # node labels
FT = 18.0                    # title band
PAGE, INK, MUTED = "#fdfcf9", "#1c1917", "#57534e"
RUST, FLEET, GREEN, DGREEN = "#9a3f12", "#2f5169", "#1f7a4d", "#155c38"

fit = k.Fit("engineering-leverage", W, H)
out: list[str] = []


def node(x, y, w, h, fill, stroke, sw, lines, size, colour, nid):
    fit.box(x, y, w, h, nid)
    out.append(f'  <rect id="{nid}" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" '
               f'height="{h:.1f}" rx="7" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
    n = len(lines)
    first = y + h / 2 - (n - 1) * (size * 1.18) / 2 + size * 0.35
    for i, s in enumerate(lines):
        fit.text(s, size, w - 14, bold=True, where=f"{nid}:{s}")
        out.append(f'  <text x="{x + w / 2:.1f}" y="{first + i * size * 1.18:.1f}" '
                   f'text-anchor="middle" font-size="{size}" font-weight="700" '
                   f'fill="{colour}">{s}</text>')


def arrow(x1, y, x2):
    out.append(f'  <path d="M{x1:.1f},{y:.1f} L{x2:.1f},{y:.1f}" fill="none" '
               f'stroke="{MUTED}" stroke-width="2.2" marker-end="url(#lev-k)"/>')


out.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
           f'width="{W}" height="{H}" role="img" aria-labelledby="levTitle levDesc" '
           f'font-family="\'Source Sans 3\', -apple-system, \'Segoe UI\', sans-serif">')
out.append('  <title id="levTitle">Where engineering leverage acts</title>')
out.append('''  <desc id="levDesc">Two pipelines are stacked for contrast. In the classical pipeline the engineer builds
    the implementation directly, so the implementation is the primary engineered object: Engineer, then
    Implementation, then Product. In the agentic pipeline agents build the implementation inside an
    engineered environment the engineer constructs, so the environment becomes the primary engineered
    lever: Engineer, then Engineered Environment, then Agents, then Implementation, then Product. A rust
    badge marks the primary node in each row; it moves upstream from the implementation to the environment.
    A footer strip unpacks the environment into models, obligations, evidence, controls, and
    infrastructure.</desc>''')
out.append(f'''  <defs>
    <marker id="lev-k" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8"
            orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L10,5 L0,10 z" fill="{MUTED}"/>
    </marker>
  </defs>''')
out.append(f'  <rect x="0" y="0" width="{W}" height="{H}" fill="{PAGE}"/>')

# ---- title band -------------------------------------------------------------
TB = 26.0
out.append(f'  <rect x="0" y="0" width="{W}" height="{TB}" fill="#f6f4ef"/>')
s = fit.text("WHERE ENGINEERING LEVERAGE ACTS", FT, W - 24, bold=True, ls=1.8,
             where="title")
out.append(f'  <text x="{W/2:.1f}" y="{TB*0.70:.1f}" text-anchor="middle" font-size="{FT}" '
           f'font-weight="700" letter-spacing="1.8" fill="{INK}">{s}</text>')

# ---- CLASSICAL row ----------------------------------------------------------
y = TB + 6
hdr = y + F
s1 = fit.text("CLASSICAL", F, 110, bold=True, ls=1.4, where="classical")
out.append(f'  <text x="6" y="{hdr:.1f}" font-size="{F}" font-weight="700" '
           f'letter-spacing="1.4" fill="{MUTED}">{s1}</text>')
lx = 6 + k.adv(s1, F, True, letter_spacing=1.4) + 12
s2 = fit.text("engineer writes the implementation", F, W - lx - 6, italic=True,
              where="classical-sub")
out.append(f'  <text x="{lx:.1f}" y="{hdr:.1f}" font-size="{F}" font-style="italic" '
           f'fill="{MUTED}">{s2}</text>')

BH = 32.0
by = hdr + 8
cy = by + BH / 2
PAD = 24
w_eng = k.adv("Engineer", FB, True) + PAD
w_imp = k.adv("Implementation", FB, True) + PAD
w_pro = k.adv("Product", FB, True) + PAD
GAP = 46
tot = w_eng + w_imp + w_pro + 2 * GAP
x0 = (W - tot) / 2
arrow(x0 + w_eng + 6, cy, x0 + w_eng + GAP - 4)
arrow(x0 + w_eng + GAP + w_imp + 6, cy, x0 + w_eng + GAP + w_imp + GAP - 4)
node(x0, by, w_eng, BH, "#e7edf3", FLEET, 2.4, ["Engineer"], FB, INK, "c-engineer")
xi = x0 + w_eng + GAP
node(xi, by - 2, w_imp, BH + 4, "#f3efe7", RUST, 3.0, ["Implementation"], FB, INK, "c-impl")
node(xi + w_imp + GAP, by, w_pro, BH, "#e3f0e7", GREEN, 2.4, ["Product"], FB, INK, "c-product")
badge = by + BH + 16
s = fit.text("primary engineered object", F, W - 20, bold=True, where="c-badge")
out.append(f'  <text x="{xi + w_imp/2:.1f}" y="{badge:.1f}" text-anchor="middle" '
           f'font-size="{F}" font-weight="700" fill="{RUST}">{s}</text>')

# ---- divider ----------------------------------------------------------------
dy = badge + 9
out.append(f'  <line x1="8" y1="{dy:.1f}" x2="{W-8:.1f}" y2="{dy:.1f}" stroke="#e4e0d8" '
           f'stroke-width="1.4" stroke-dasharray="5 6"/>')

# ---- AGENTIC row ------------------------------------------------------------
hdr2 = dy + 4 + F
s1 = fit.text("AGENTIC", F, 110, bold=True, ls=1.4, where="agentic")
out.append(f'  <text x="6" y="{hdr2:.1f}" font-size="{F}" font-weight="700" '
           f'letter-spacing="1.4" fill="{DGREEN}">{s1}</text>')
lx = 6 + k.adv(s1, F, True, letter_spacing=1.4) + 12
s2 = fit.text("agents write the implementation", F, W - lx - 6, italic=True,
              where="agentic-sub")
out.append(f'  <text x="{lx:.1f}" y="{hdr2:.1f}" font-size="{F}" font-style="italic" '
           f'fill="{MUTED}">{s2}</text>')

BH2 = 40.0
by2 = hdr2 + 7
cy2 = by2 + BH2 / 2
w_e2 = k.adv("Engineer", FB, True) + PAD
w_env = max(k.adv("Engineered", FB, True), k.adv("Environment", FB, True)) + PAD
w_ag = k.adv("Agents", FB, True) + PAD
w_i2 = k.adv("Implementation", FB, True) + PAD
w_p2 = k.adv("Product", FB, True) + PAD
G2 = 30
tot2 = w_e2 + w_env + w_ag + w_i2 + w_p2 + 4 * G2
x = (W - tot2) / 2
xs = []
for w in (w_e2, w_env, w_ag, w_i2, w_p2):
    xs.append(x)
    x += w + G2
for i, w in enumerate((w_e2, w_env, w_ag, w_i2)):
    arrow(xs[i] + w + 5, cy2, xs[i + 1] - 4)
node(xs[0], by2 + 4, w_e2, BH2 - 8, "#e7edf3", FLEET, 2.4, ["Engineer"], FB, INK, "a-engineer")
node(xs[1], by2, w_env, BH2, "#e3f0e7", RUST, 3.0, ["Engineered", "Environment"], FB,
     DGREEN, "a-env")
node(xs[2], by2 + 4, w_ag, BH2 - 8, "#e7edf3", FLEET, 2.4, ["Agents"], FB, INK, "a-agents")
node(xs[3], by2 + 4, w_i2, BH2 - 8, "#f3efe7", MUTED, 2.2, ["Implementation"], FB, INK, "a-impl")
node(xs[4], by2 + 4, w_p2, BH2 - 8, "#e3f0e7", GREEN, 2.4, ["Product"], FB, INK, "a-product")
badge2 = by2 + BH2 + 15
s = fit.text("primary engineered lever", F, W - 20, bold=True, where="a-badge")
out.append(f'  <text x="{xs[1] + w_env/2:.1f}" y="{badge2:.1f}" text-anchor="middle" '
           f'font-size="{F}" font-weight="700" fill="{RUST}">{s}</text>')

# ---- footer strip: the environment, unpacked --------------------------------
fy = badge2 + 8
fh = H - fy - 3
fw = 620.0
fx = (W - fw) / 2
fit.box(fx, fy, fw, fh, "footer")
out.append(f'  <line x1="{xs[1]:.1f}" y1="{by2 + BH2:.1f}" x2="{fx:.1f}" y2="{fy:.1f}" '
           f'stroke="#a8a29e" stroke-width="1.1" stroke-dasharray="3 4"/>')
out.append(f'  <line x1="{xs[1] + w_env:.1f}" y1="{by2 + BH2:.1f}" x2="{fx + fw:.1f}" '
           f'y2="{fy:.1f}" stroke="#a8a29e" stroke-width="1.1" stroke-dasharray="3 4"/>')
out.append(f'  <rect x="{fx:.1f}" y="{fy:.1f}" width="{fw:.1f}" height="{fh:.1f}" rx="9" '
           f'fill="#eef7f0" stroke="{GREEN}" stroke-width="1.8"/>')
rows = [("Governed Engineering Environment", True, False, DGREEN),
        ("the engineered instructions around autonomous realization", False, True, MUTED),
        ("models · obligations · evidence · controls · infrastructure", False, False, MUTED)]
block = (len(rows) - 1) * F * 1.22 + F
ty = fy + (fh - block) / 2 + F * 0.86
for s, b, i, c in rows:
    fit.text(s, F, fw - 16, bold=b, italic=i, where=f"footer:{s[:20]}")
    st = ' font-weight="700"' if b else (' font-style="italic"' if i else "")
    out.append(f'  <text x="{W/2:.1f}" y="{ty:.1f}" text-anchor="middle" font-size="{F}"'
               f'{st} fill="{c}">{s}</text>')
    ty += F * 1.22
out.append("</svg>")

smallest = fit.done()
p = Path(str(Path(__file__))[:-3] + ".svg")
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"wrote {p.name}  canvas {W}x{H} pt  smallest label {smallest:.1f} pt native")
