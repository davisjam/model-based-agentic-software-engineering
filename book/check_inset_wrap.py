#!/usr/bin/env python3
"""Sensor: does every reading-weight ASIDE actually wrap body text alongside it?

A `box-weight: aside` renders a narrow box floated to the outside (right) edge with the
main prose flowing down the LEFT strip beside it. The failure this catches: the box
renders but the left strip is BLANK — prose dumped below instead of wrapping (a broken
wrap / the wrap-it fallback). This is invisible to the schema / console / content gates;
only page GEOMETRY reveals it, so we look at the rendered PDF.

Two-stage, so we never rasterize all pages:
  1. `pdftotext -bbox` finds candidate aside pages cheaply — an "Inset —" title whose box
     starts well right of the text margin (a right-floated narrow box, not a full-width
     callout/deep-dive).
  2. Only those pages are rasterized (`pdftoppm`). The box is found by its panel FILL
     (a light tint, distinct from the white page and the black text); the strip LEFT of the
     box, over the box's vertical span, is checked for text ink. A box that towers over a
     mostly-blank left strip did not wrap.

Metric: `coverage` = fraction of the box's height whose left strip carries body-text ink.
FAIL when coverage < --min-coverage (default 0.45). Needs `pdftotext`, `pdftoppm`, PIL, numpy.

Exit 0 = every aside wraps (or none exist); exit 1 = at least one aside failed to wrap.
Usage: python3 book/check_inset_wrap.py <pdf> [--min-coverage 0.45] [--dpi 110] [--json]
"""
from __future__ import annotations

import html
import re
import subprocess
import sys
import tempfile

_PAGE_RE = re.compile(r'<page width="([\d.]+)" height="([\d.]+)">(.*?)</page>', re.S)
_WORD_RE = re.compile(
    r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>'
)


def _candidate_pages(pdf: str) -> list[dict]:
    """Pages holding a right-floated 'Inset —' title → likely an aside. One dict per hit."""
    out = subprocess.run(["pdftotext", "-bbox", pdf, "-"],
                         capture_output=True, text=True, check=True).stdout
    hits = []
    for pno, pm in enumerate(_PAGE_RE.finditer(out), start=1):
        pw = float(pm.group(1))
        words = [(float(a), float(b), html.unescape(t).strip())
                 for a, b, c, d, t in _WORD_RE.findall(pm.group(3)) if html.unescape(t).strip()]
        for i, (x, y, t) in enumerate(words):
            if t == "Inset" and i + 1 < len(words) and words[i + 1][2] in ("—", "–", "-") \
                    and x >= pw * 0.30:
                title = " ".join(w[2] for w in words[i:i + 8])[:60]
                hits.append({"page": pno, "page_w_pts": pw, "title": title})
    return hits


def _wrap_coverage(pdf: str, page: int, dpi: int) -> "tuple[float, dict] | None":
    """Rasterize one page; find the aside's filled box + measure left-strip ink coverage."""
    import numpy as np
    from PIL import Image
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["pdftoppm", "-f", str(page), "-l", str(page), "-r", str(dpi),
                        "-png", pdf, f"{td}/pg"], check=True, capture_output=True)
        import os
        pngs = [f for f in os.listdir(td) if f.endswith(".png")]
        if not pngs:
            return None
        im = np.asarray(Image.open(f"{td}/{pngs[0]}").convert("L"))
    H, W = im.shape
    fill = (im >= 235) & (im <= 249)     # panel tint (excludes white ~252 and text ~26)
    text = im < 120
    tcols = np.where(text.sum(axis=0) > 0)[0]
    if not len(tcols):
        return None
    text_margin = int(tcols.min())
    # Box = the tallest right-side fill band. Rows whose fill run is substantial:
    rowfill = fill.sum(axis=1)
    rows = np.where(rowfill > W * 0.10)[0]
    if not len(rows):
        return 0.0, {"reason": "no filled box found"}
    # contiguous band containing the largest run
    bt, bb = int(rows.min()), int(rows.max())
    band = fill[bt:bb + 1]
    bcols = np.where(band.sum(axis=0) > (bb - bt) * 0.15)[0]
    if not len(bcols):
        return 0.0, {"reason": "no box columns"}
    box_left = int(bcols.min())
    if box_left - text_margin < W * 0.15:
        return None  # full-width box (callout/deep-dive), not a right-floated aside
    strip = text[bt:bb + 1, text_margin:box_left - 4]
    span = max(1, bb - bt)
    rows_with_ink = int((strip.sum(axis=1) > 3).sum())
    cov = rows_with_ink / span
    return cov, {"box_top_px": bt, "box_bot_px": bb, "box_left_frac": round(box_left / W, 2),
                 "strip_px": [text_margin, box_left - 4], "rows_with_ink": rows_with_ink,
                 "box_span_px": span}


def check(pdf: str, min_coverage: float = 0.45, dpi: int = 110) -> list[dict]:
    seen: set[int] = set()
    fails: list[dict] = []
    for cand in _candidate_pages(pdf):
        pg = cand["page"]
        if pg in seen:
            continue
        seen.add(pg)
        res = _wrap_coverage(pdf, pg, dpi)
        if res is None:
            continue
        cov, info = res
        if cov < min_coverage:
            fails.append({"page": pg, "title": cand["title"], "coverage": round(cov, 2), **info})
    return fails


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 2
    pdf = args[0]
    mc = 0.45
    dpi = 110
    for a in argv:
        if a.startswith("--min-coverage"):
            mc = float(a.split("=")[1]) if "=" in a else mc
        if a.startswith("--dpi"):
            dpi = int(a.split("=")[1]) if "=" in a else dpi
    fails = check(pdf, min_coverage=mc, dpi=dpi)
    if "--json" in argv:
        import json
        print(json.dumps({"fails": fails}, indent=2))
    elif fails:
        print(f"INSET-WRAP SENSOR: {len(fails)} aside(s) NOT wrapping in {pdf}:")
        for f in fails:
            print(f"  p{f['page']} '{f['title']}' — left strip {f['coverage']:.0%} covered "
                  f"(box left edge at {f.get('box_left_frac')}, {f.get('rows_with_ink')} inked rows "
                  f"of {f.get('box_span_px')})")
    else:
        print(f"INSET-WRAP SENSOR: all asides wrap OK in {pdf}")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
