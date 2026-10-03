#!/usr/bin/env python3
"""Render a favicon SVG at 16/32/64 px and assemble one legibility sheet.

The only requirement a 16x16 favicon has is to stay recognizable at 16x16, and the only way to
check that is to LOOK at the rendered raster, not the SVG source. This renders the icon at each
real size, then nearest-neighbor-upscales each render (x8 / x4 / x2) so the sheet shows all three
at a comparable inspection size without resampling away the truth. The book's favicon was judged
the same way (book/_design/drafts/book-favicon-cover-260916).

Needs `rsvg-convert` and ImageMagick (`magick`) on PATH; exits 2 if either is missing.

Usage:
    python3 workbench/scripts/favicon_legibility.py workbench/assets/favicon.svg \
        [-o workbench/_design/favicon-261002/favicon-legibility-16-32-64.png]
"""
from __future__ import annotations

import argparse
import pathlib
import shutil
import subprocess
import sys
import tempfile

SIZES = (16, 32, 64)
INSPECT_PX = 128  # every cell is upscaled (point filter) to this edge


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("svg", type=pathlib.Path)
    ap.add_argument("-o", "--out", type=pathlib.Path,
                    default=pathlib.Path("workbench/_design/favicon-261002/favicon-legibility-16-32-64.png"))
    args = ap.parse_args(argv)
    for tool in ("rsvg-convert", "magick"):
        if shutil.which(tool) is None:
            print(f"ERROR: {tool} not on PATH", file=sys.stderr)
            return 2
    if not args.svg.is_file():
        print(f"ERROR: {args.svg} not found", file=sys.stderr)
        return 1
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        cells: list[str] = []
        for size in SIZES:
            raw = pathlib.Path(td) / f"raw-{size}.png"
            subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size),
                            str(args.svg), "-o", str(raw)], check=True)
            cell = pathlib.Path(td) / f"cell-{size}.png"
            # -filter point = nearest neighbor: the upscale shows the real pixels, nothing smoothed
            # in. Cells read left to right as 16, 32, 64 (no text labels: this ImageMagick build has
            # no default font, and the ascending pixel-block size says which cell is which anyway).
            subprocess.run(["magick", str(raw), "-filter", "point",
                            "-resize", f"{INSPECT_PX}x{INSPECT_PX}",
                            "-bordercolor", "white", "-border", "8",
                            str(cell)], check=True)
            cells.append(str(cell))
        subprocess.run(["magick", *cells, "+append", "-bordercolor", "white", "-border", "12",
                        str(args.out)], check=True)
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
