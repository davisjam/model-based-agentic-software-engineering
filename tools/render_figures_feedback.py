"""Render a figure-legibility FEEDBACK PDF — one figure per page, at the book's true render width, with an
11pt body-text reference strip above it, so a human (or a VLM reading the page image) can eyeball whether
each figure's text lands near body size. This is the qualitative companion to `lint_figure_font_band.py`:
the lint measures whether a label is IN the reference-width band; this target shows what that actually looks
like at the book's real column geometry, where the band's effective size is a fraction of body.

The book (book_typst.py) sets `us-letter`, margins left 0.875in / right 2.875in / y 1in, so the text column
is 4.75in = 342pt and figures render at 85% of it (~291pt). We reproduce that exactly, plus render each
figure a second time at a WIDE width (the full 7.5in measure, into the note margin) so the render-width
lever is visible side by side.

    python3 tools/render_figures_feedback.py                 # all figures -> book/_design/rendered-figures.pdf
    python3 tools/render_figures_feedback.py --only book-map task-closure-tree
    python3 tools/render_figures_feedback.py --open          # also open the PDF (macOS)

No dependency beyond `typst` (already required for the book PDF); the output is gitignored like mage-book.pdf.
"""
from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
ASSETS = ROOT / "book" / "assets"
OUT_PDF = ROOT / "book" / "_design" / "rendered-figures.pdf"

# The book's real geometry (book_typst.py preamble): us-letter, column = 8.5 - 0.875 - 2.875 = 4.75in.
COLUMN_IN = 4.75
BOOK_FIG_FRAC = 0.85          # _render_figure default width
BOOK_FIG_IN = COLUMN_IN * BOOK_FIG_FRAC   # ~4.04in — the width figures ACTUALLY render at in the book
WIDE_FIG_IN = 7.5            # a full-measure alternative, to show the render-width lever
BODY_PT = 11                 # book_typst.py: #set text(size: 11pt)

# Same out-of-scope set the band sensor + rescale codemod use.
_EXCLUDE_PREFIXES = ("cover", "velocity-")

_REFERENCE = ("Body-text reference (11pt): the quick brown fox jumps over the lazy dog, and the engineer "
              "reads this line at the same size as the running text around every figure.")


def _figures(only: list[str] | None) -> list[pathlib.Path]:
    figs = sorted(p for p in ASSETS.glob("*.svg")
                  if not p.name.startswith(_EXCLUDE_PREFIXES))
    if only:
        want = {o.removesuffix(".svg") for o in only}
        figs = [p for p in figs if p.stem in want]
    return figs


def _typst_doc(figs: list[pathlib.Path]) -> str:
    lines = [
        '#set page(paper: "us-letter", margin: (x: 0.875in, y: 0.9in))',
        f'#set text(font: "Source Serif 4", size: {BODY_PT}pt)',
        '#set par(justify: true)',
        "",
    ]
    for i, p in enumerate(figs):
        rel = p.relative_to(ROOT).as_posix()
        if i:
            lines.append("#pagebreak()")
        lines += [
            f'#text(size: 13pt, weight: "bold")[{p.stem}]',
            "",
            _REFERENCE,
            "",
            f'#text(fill: gray)[— at the book render width ({BOOK_FIG_IN:.2f}in, 85% of column): —]',
            f'#align(center)[#image("{rel}", width: {BOOK_FIG_IN:.2f}in)]',
            "",
            f'#text(fill: gray)[— at a full-measure width ({WIDE_FIG_IN:.1f}in), for the render-width comparison: —]',
            f'#align(center)[#image("{rel}", width: {WIDE_FIG_IN:.1f}in)]',
            "",
        ]
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="figure stems to include (default: all)")
    ap.add_argument("--open", action="store_true", help="open the PDF after rendering (macOS)")
    args = ap.parse_args()

    figs = _figures(args.only)
    if not figs:
        print("no figures matched", file=sys.stderr)
        return 1

    src = _typst_doc(figs)
    typ = OUT_PDF.with_suffix(".typ")
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    typ.write_text(src, encoding="utf-8")

    print(f"[plan] rendering {len(figs)} figure(s) -> {OUT_PDF.relative_to(ROOT)}")
    rc = subprocess.run(["typst", "compile", "--root", str(ROOT), str(typ), str(OUT_PDF)]).returncode
    typ.unlink(missing_ok=True)
    if rc:
        print("typst compile FAILED", file=sys.stderr)
        return rc
    print(f"[result] wrote {OUT_PDF.relative_to(ROOT)} ({OUT_PDF.stat().st_size // 1024} KiB, {len(figs)} pages)")
    if args.open:
        subprocess.run(["open", str(OUT_PDF)])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
