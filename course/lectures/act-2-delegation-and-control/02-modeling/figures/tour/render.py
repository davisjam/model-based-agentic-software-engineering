#!/usr/bin/env python3
"""Render the 2-2-Modeling-1 tour diagrams from their PlantUML sources.

U-OV-DIAG, Wave 1 of the modeling-deck1 overhaul. Q1 is ratified as GENERATED-FROM-TEXT,
so `src/*.puml` are the authored artifacts and everything under `render/` is derived.

    python3 render.py            # re-render every diagram + the thumbnails composite

Host tools required:
  plantuml      (brew install plantuml)   — needs java; `-DPLANTUML_SECURITY_PROFILE=UNSECURE`
                                            is what lets a source `!include _theme.puml`
  rsvg-convert  (brew install librsvg)    — SVG -> PNG
  Source Sans 3 installed in ~/Library/Fonts (it is) — without it the render substitutes a
                                            wider face and every box grows.

Sizing policy. Legibility when projected is the binding constraint. Each PNG is rendered so
its long edge is LONG_EDGE_PX, which is >= 300 dpi for a 9 in placement on the deck's
10 x 7.5 in slide. The sources are themselves written so that the SMALLEST glyph in any
diagram is at least 1/30 of the figure's width, which keeps on-screen type above ~20 pt.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
OUT = HERE / "render"

LONG_EDGE_PX = 2800
THUMB_LONG_EDGE_PX = 3000

# PlantUML leaves almost no margin, so a box or an arrowhead can sit hard against the PNG edge
# and read as clipped once PowerPoint draws a picture border. Pad every render on the paper
# colour instead of fighting the layout engine.
MARGIN_FRACTION = 0.035

# Tour order. The caption is the short form of the slide's engineering question; the deck
# supplies the full question as the slide title, so the composite only needs the stub.
DIAGRAMS: list[tuple[str, str]] = [
    ("1-what-exists-class", "What exists?"),
    ("2-who-talks-sequence", "Who talks to whom?"),
    ("3-what-states-state-machine", "What states?"),
    ("4-what-paths-activity", "What paths?"),
    ("5-who-needs-what-usecase", "Who needs what?"),
]

COMPOSITE = "6-same-territory-thumbnails"

INK = "#2f5169"
INK2 = "#41586c"
PAPER = "#fdfcf9"
CARD = PAPER  # same ground as the diagrams, so a card reads as figure margin, not a panel


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.stderr.write(f"FAILED: {' '.join(cmd)}\n{proc.stdout}\n{proc.stderr}\n")
        raise SystemExit(1)


def viewbox(svg: Path) -> tuple[float, float]:
    head = svg.read_text(encoding="utf-8")[:2000]
    marker = 'viewBox="'
    i = head.index(marker) + len(marker)
    _, _, w, h = head[i : head.index('"', i)].split()
    return float(w), float(h)


def render_one(stem: str) -> tuple[float, float]:
    run(
        [
            "plantuml",
            "-DPLANTUML_SECURITY_PROFILE=UNSECURE",
            "-tsvg",
            "-o",
            str(OUT),
            str(SRC / f"{stem}.puml"),
        ]
    )
    svg = OUT / f"{stem}.svg"
    w, h = viewbox(svg)
    flag = "-w" if w >= h else "-h"
    png = OUT / f"{stem}.png"
    run(["rsvg-convert", flag, str(LONG_EDGE_PX), str(svg), "-o", str(png)])
    pad(png)
    im = Image.open(png)
    print(f"  {stem:34s} {w:6.0f} x {h:6.0f}   aspect {w / h:4.2f}   -> {im.width} x {im.height} px")
    return float(im.width), float(im.height)


def pad(png: Path) -> None:
    im = Image.open(png).convert("RGB")
    m = round(max(im.width, im.height) * MARGIN_FRACTION)
    out = Image.new("RGB", (im.width + 2 * m, im.height + 2 * m), PAPER)
    out.paste(im, (m, m))
    out.save(png)


def build_composite(dims: dict[str, tuple[float, float]]) -> None:
    """Five thumbnails over one territory — the 'same territory, different questions' punchline.

    Laid out 3 over 2 on a 1400 x 950 canvas, bottom row centred. Captions are set at 44 px in that space, which
    projects at roughly 21 pt from a 9 in placement; the diagrams inside the cards only have
    to be RECOGNISABLE, since the slide's claim is about their difference, not their detail.
    """
    W, H = 1400, 950
    cap_h, gap = 66, 26
    cell_w, cell_h = 430, 372
    pad = 18

    cols_top, cols_bot = 3, 2
    x0_top = (W - (cols_top * cell_w + (cols_top - 1) * gap)) / 2
    x0_bot = (W - (cols_bot * cell_w + (cols_bot - 1) * gap)) / 2
    y_top, y_bot = 74, 74 + cell_h + gap

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" '
        f"aria-labelledby=\"ttTitle ttDesc\" font-family=\"'Source Sans 3', sans-serif\">",
        "<title id=\"ttTitle\">Same territory, different questions</title>",
        "<desc id=\"ttDesc\">Five models of one course-registration system, shown together: a "
        "class diagram, a sequence diagram, a state machine, an activity diagram and a use-case "
        "diagram. The territory is held constant; each diagram answers a different engineering "
        "question and preserves different distinctions.</desc>",
        f'<rect x="0" y="0" width="{W}" height="{H}" fill="{PAPER}"/>',
        f'<text x="{W / 2}" y="46" text-anchor="middle" font-size="42" font-weight="700" '
        f'letter-spacing="2.5" fill="{INK2}">ONE TERRITORY: COURSE REGISTRATION</text>',
    ]

    for idx, (stem, caption) in enumerate(DIAGRAMS):
        if idx < cols_top:
            cx = x0_top + idx * (cell_w + gap)
            cy = y_top
        else:
            cx = x0_bot + (idx - cols_top) * (cell_w + gap)
            cy = y_bot

        parts.append(
            f'<rect x="{cx}" y="{cy}" width="{cell_w}" height="{cell_h}" rx="12" '
            f'fill="{CARD}" stroke="{INK}" stroke-width="2.5"/>'
        )

        box_w, box_h = cell_w - 2 * pad, cell_h - cap_h - 2 * pad
        w, h = dims[stem]
        scale = min(box_w / w, box_h / h)
        dw, dh = w * scale, h * scale
        dx = cx + pad + (box_w - dw) / 2
        dy = cy + pad + (box_h - dh) / 2
        parts.append(
            f'<image xlink:href="{stem}.png" x="{dx:.1f}" y="{dy:.1f}" '
            f'width="{dw:.1f}" height="{dh:.1f}"/>'
        )

        parts.append(
            f'<line x1="{cx + pad}" y1="{cy + cell_h - cap_h}" x2="{cx + cell_w - pad}" '
            f'y2="{cy + cell_h - cap_h}" stroke="{INK}" stroke-width="1.5" opacity="0.45"/>'
        )
        parts.append(
            f'<text x="{cx + cell_w / 2}" y="{cy + cell_h - 20}" text-anchor="middle" '
            f'font-size="44" font-weight="700" fill="{INK}">{caption}</text>'
        )

    parts.append("</svg>")
    svg = OUT / f"{COMPOSITE}.svg"
    svg.write_text("\n".join(parts), encoding="utf-8")
    run(["rsvg-convert", "-w", str(THUMB_LONG_EDGE_PX), str(svg), "-o", str(OUT / f"{COMPOSITE}.png")])
    print(f"  {COMPOSITE:34s} {W:6d} x {H:6d}   aspect {W / H:4.2f}")


def main() -> int:
    OUT.mkdir(exist_ok=True)
    print("rendering tour diagrams:")
    dims = {stem: render_one(stem) for stem, _ in DIAGRAMS}
    print("composing thumbnails:")
    build_composite(dims)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
