"""Render a figure-legibility FEEDBACK PDF — one figure per page, at the book's TRUE render width, with a
12pt body-text reference strip above it and, beneath it, the worklist of that figure's below-floor labels
(their real printed size vs the floor). So a human doing a bulk label-editing pass can see, per figure,
exactly which text is too small and how far, at the real page geometry.

This is the qualitative companion to `lint_figure_font_band.py`: the lint measures whether a label is IN the
reference-width band; this target shows what that looks like at the book's real column, where the band's
floor is a fraction of body — and lists the offenders so the edit is informed.

Book geometry (book_typst.py preamble, kept in sync): us-letter, symmetric 1.125in margins, so the text
measure is 8.5 − 2·1.125 = 6.25in = 450pt; body is 12pt; figures render at 94% of the measure (≈5.875in).
The below-floor worklist reports each label's TRUE printed size: a font of `f` user units in a viewBox `w`
wide renders at `f · (5.875·72) / w` pt, and the floor (18px normalized at the 1000px reference) prints at
18 · (5.875·72)/1000 ≈ 7.6pt — about 0.63× the 12pt body, the house rule's edge-label floor.

    python3 tools/render_figures_feedback.py                 # figures WITH below-floor labels, worst-first
    python3 tools/render_figures_feedback.py --all           # every in-scope figure (clean ones too)
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

sys.path.insert(0, str(ROOT / "book-models"))
import lint_figure_font_band as band  # noqa: E402 — reuse its per-label below-floor findings + the band SSOT

# The book's real geometry (book_typst.py preamble): us-letter, symmetric 1.125in margins.
MEASURE_IN = 8.5 - 2 * 1.125       # 6.25in text measure
BOOK_FIG_FRAC = 0.94               # _render_figure default width (fraction of the measure)
BOOK_FIG_IN = MEASURE_IN * BOOK_FIG_FRAC   # ≈5.875in — the width figures ACTUALLY render at in the book
BODY_PT = 12                       # book_typst.py: #set text(size: 12pt)

# Same out-of-scope set the band sensor + rescale codemod use.
_EXCLUDE_PREFIXES = ("cover", "velocity-")

_REFERENCE = ("Body-text reference (12pt): the quick brown fox jumps over the lazy dog, and the engineer "
              "reads this line at the same size as the running text around every figure.")


def _printed_pt(font_size_u: float, viewbox_w: float) -> float:
    """A label's true printed size in pt: `font_u` user units in a `viewbox_w`-wide figure rendered at
    BOOK_FIG_IN inches (72pt/in)."""
    return font_size_u * (BOOK_FIG_IN * 72.0) / viewbox_w


def _escape(s: str) -> str:
    """Neutralize Typst markup in a raw label so it prints verbatim in the worklist."""
    for ch in ("\\", "#", "*", "_", "`", "$", "@", "<", ">", "[", "]"):
        s = s.replace(ch, "\\" + ch)
    return s


def _figures(only: list[str] | None, include_all: bool) -> tuple[list[pathlib.Path], dict[str, list]]:
    """Return (figures-to-render, {svg-name: [below-floor Findings]}). Default: only figures with a
    below-floor label, worst (most offenders) first. --all adds the clean figures after, alphabetically."""
    by_svg: dict[str, list] = {}
    for f in band.findings():
        if f.end == band.TOO_SMALL:
            by_svg.setdefault(f.svg, []).append(f)

    all_figs = sorted(p for p in ASSETS.glob("*.svg") if not p.name.startswith(_EXCLUDE_PREFIXES))
    if only:
        want = {o.removesuffix(".svg") for o in only}
        return [p for p in all_figs if p.stem in want], by_svg

    with_floor = [p for p in all_figs if p.name in by_svg]
    with_floor.sort(key=lambda p: (-len(by_svg[p.name]), p.stem))  # worst-first, then alpha
    if include_all:
        clean = [p for p in all_figs if p.name not in by_svg]
        return with_floor + clean, by_svg
    return with_floor, by_svg


def _floor_pt(viewbox_w: float) -> float:
    floor_px, _ = band._band()
    return floor_px * (BOOK_FIG_IN * 72.0) / viewbox_w


def _typst_doc(figs: list[pathlib.Path], by_svg: dict[str, list]) -> str:
    lines = [
        '#set page(paper: "us-letter", margin: (x: 0.875in, y: 0.85in))',
        f'#set text(font: "Source Sans 3", size: {BODY_PT}pt)',
        '#set par(justify: true)',
        "",
    ]
    for i, p in enumerate(figs):
        rel = "/" + p.relative_to(ROOT).as_posix()  # leading-/ so it resolves against --root
        offenders = sorted(by_svg.get(p.name, []), key=lambda f: f.rendered_px)
        if i:
            lines.append("#pagebreak()")
        lines += [
            f'#text(size: 13pt, weight: "bold")[{p.stem}]  '
            f'#text(size: 10pt, fill: gray)[— {len(offenders)} below-floor label(s)]',
            "",
            _REFERENCE,
            "",
            f'#align(center)[#image("{rel}", width: {BOOK_FIG_IN:.3f}in)]',
            "",
        ]
        if offenders:
            floor_pt = _floor_pt(offenders[0].viewbox_w)
            lines.append(f"#text(size: 10pt, fill: gray)[Below-floor labels (floor ≈ {floor_pt:.1f}pt at "
                         f"this figure's width; body is {BODY_PT}pt) — shorten or give more room so they "
                         f"clear the floor:]")
            lines.append("")
            rows = []
            for f in offenders:
                pt = _printed_pt(f.font_size, f.viewbox_w)
                rows.append(f'  #box[#text(size: 9pt)[`{pt:4.1f}pt`  “{_escape(f.text[:70])}”]]')
            lines.append(" \\\n".join(rows))
            lines.append("")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="figure stems to include (default: below-floor figures only)")
    ap.add_argument("--all", action="store_true", help="include clean figures too (after the below-floor ones)")
    ap.add_argument("--open", action="store_true", help="open the PDF after rendering (macOS)")
    args = ap.parse_args()

    figs, by_svg = _figures(args.only, args.all)
    if not figs:
        print("no figures matched", file=sys.stderr)
        return 1

    src = _typst_doc(figs, by_svg)
    typ = OUT_PDF.with_suffix(".typ")
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    typ.write_text(src, encoding="utf-8")

    n_offenders = sum(len(by_svg.get(p.name, [])) for p in figs)
    print(f"[plan] rendering {len(figs)} figure(s) at true book width {BOOK_FIG_IN:.3f}in "
          f"({n_offenders} below-floor labels) -> {OUT_PDF.relative_to(ROOT)}")
    rc = subprocess.run(["typst", "compile", "--root", str(ROOT),
                         "--font-path", str(ROOT / "book" / "fonts"), str(typ), str(OUT_PDF)]).returncode
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
