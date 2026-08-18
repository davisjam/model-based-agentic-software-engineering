"""LINT `figure-overflow` — the text-fits-its-box SENSOR for the hand-authored house SVGs.

The constraint half of figure governance (the `figure_styles` token block + authoring rules) gives an
author correct defaults so a clean figure is the one they draw. This lint is the SENSOR half: it catches
the mistake the constraint did not prevent — a `<text>` label that overruns its `<rect>`. Together they
mirror the book's own constraint/sensor thesis: a firewall makes the fault unlikely, a smoke detector
catches it before it ships.

How it measures (no browser, no font library at runtime):
  * Per-glyph width. Each label's rendered width is estimated as `Σ advance_em[c]·font_size +
    (n−1)·letter_spacing`, with advances read from the committed `glyph-advances.json` table (emitted
    offline from the bundled Source Sans 3 faces by `gen_glyph_advances.py`). Because it reads the same
    metrics the print renderer uses, it is a MODEL of the renderer, not a heuristic — a prototype measured
    it at 0.8% mean error and zero verdict misclassifications against headless-Chrome ground truth.
  * Geometric box↔text association. These SVGs are flat: `<rect>` and `<text>` are siblings, never
    parent/child. A text associates to the smallest-area `<rect>` that contains its anchor point AND is a
    plausible container (`h ≥ 1.1·fs ∧ w ≥ 1.5·fs`) — which discards full-canvas backgrounds, thin rules,
    and small icon rects. A text with no container is free-floating (tick labels, captions) and is skipped.
  * Fit test. `inner_width = box_width − 0.70·font_size`; ratio = est_width / inner_width. OVERFLOW at
    ratio ≥ 1.00 (does not fit the padded box), STRAIN at ratio ≥ 0.90 (within its last 10% of room).

The 0.70·fs rejection budget is the render-validated threshold; it is deliberately more lenient than the
`figure_pad_min()` authoring target the constraint half asks authors to aim for (the constraint sets a
generous budget, the sensor fires only when text is genuinely cramped). The authoring budget is read from
the design-token SSOT so the two live in one place.

Excluded: `velocity-*.svg` (data charts — no `<text>` labels) and `cover*.svg` (decorative tracked-caps
cover art). Everything else in `book/assets/*.svg` is in scope.

LANDING: this lint's severity in `catalog.py validate` follows the repo's blocking-lint landing
discipline — BLOCKING when the current tree is clean (0 findings), AUDIT-ONLY-first when it is not (prints
its worklist, does not gate) until a fix-wave drains it and a follow-up flips it blocking.

    python3 book-models/lint_figure_overflow.py            # print findings (audit-only, exit 0)
    python3 book-models/lint_figure_overflow.py --strict   # exit 1 on any finding (the blocking flip)
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import design_tokens as dtk  # noqa: E402 — the padding-budget SSOT lives in the projector

HERE = pathlib.Path(__file__).resolve().parent
ASSETS = HERE.parent / "book" / "assets"
GLYPH_TABLE = HERE / "glyph-advances.json"

# Rejection padding: horizontal breathing room required inside a box, as a fraction of font-size PER SIDE.
# 0.35·fs each side (0.70·fs total) is the render-validated threshold — a prototype confirmed it
# reproduces headless-Chrome verdicts with zero misclassifications. It is intentionally smaller than the
# constraint half's authoring budget `figure_pad_min()`: authors AIM for that generous floor; the sensor
# only REJECTS when text falls below this tighter line.
PAD_EM_PER_SIDE = 0.35
OVERFLOW_RATIO = 1.00   # >= this -> OVERFLOW (does not fit the padded box)
STRAIN_RATIO = 0.90     # >= this (and < overflow) -> strain (tight)

# Figures out of scope for a text-fit test.
EXCLUDE_PREFIXES = ("velocity-", "cover")

SVG_NS = "http://www.w3.org/2000/svg"
_BOLD_WEIGHTS = {"bold", "600", "700", "800", "900"}


@dataclass(frozen=True)
class Face:
    advance_em: dict[str, float]
    fallback_em: float

    def width(self, text: str, font_size: float, letter_spacing: float) -> float:
        total = sum(self.advance_em.get(ch, self.fallback_em) for ch in text)
        w = total * font_size
        if letter_spacing and len(text) > 1:
            w += (len(text) - 1) * letter_spacing
        return w


def load_faces(path: pathlib.Path = GLYPH_TABLE) -> dict[str, Face]:
    """Read the committed per-glyph advance table (stdlib json — no font library)."""
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        key: Face(advance_em=face["advance_em"], fallback_em=face["fallback_em"])
        for key, face in data["faces"].items()
    }


def _tag(el: ET.Element) -> str:
    return el.tag.split("}", 1)[-1]


def _f(el: ET.Element, attr: str, default: float = 0.0) -> float:
    v = el.get(attr)
    if v is None:
        return default
    try:
        return float(v)
    except ValueError:
        return default


@dataclass
class Rect:
    x: float
    y: float
    w: float
    h: float

    @property
    def area(self) -> float:
        return self.w * self.h

    def contains(self, px: float, py: float) -> bool:
        return self.x <= px <= self.x + self.w and self.y <= py <= self.y + self.h


@dataclass
class TextEl:
    text: str
    x: float
    y: float
    font_size: float
    face_key: str
    letter_spacing: float


@dataclass
class Finding:
    svg: str
    text: str
    verdict: str
    ratio: float
    font_size: float
    box_w: float
    inner: float


def _inherited(el: ET.Element, ancestors: list[ET.Element], attr: str, default: str) -> str:
    for node in [el, *reversed(ancestors)]:
        v = node.get(attr)
        if v is not None:
            return v
    return default


def parse_svg(path: pathlib.Path) -> tuple[list[TextEl], list[Rect]]:
    root = ET.parse(path).getroot()
    texts: list[TextEl] = []
    rects: list[Rect] = []

    def walk(el: ET.Element, ancestors: list[ET.Element]) -> None:
        tag = _tag(el)
        if tag == "rect":
            # An invisible anchor rect (fill:none AND stroke:none) is not a visible box — it is the
            # text-label-node convention (a transparent <rect> carrying an id so a graph edge can target a
            # bare <text> label; see the connect-grammar note in the drawing skill). It has no border a
            # label could overrun, so it must not be treated as a box the overflow sensor strains against.
            fill = _inherited(el, ancestors, "fill", "black").strip()
            stroke = _inherited(el, ancestors, "stroke", "none").strip()
            if not (fill == "none" and stroke == "none"):
                rects.append(Rect(_f(el, "x"), _f(el, "y"), _f(el, "width"), _f(el, "height")))
        elif tag == "text":
            content = "".join(el.itertext()).strip()
            if content:
                fs_raw = _inherited(el, ancestors, "font-size", "16")
                try:
                    fs = float(fs_raw.replace("px", ""))
                except ValueError:
                    fs = 16.0
                fw = _inherited(el, ancestors, "font-weight", "normal")
                weight = "bold" if fw in _BOLD_WEIGHTS else "normal"
                style = "italic" if _inherited(el, ancestors, "font-style", "normal") == "italic" else "normal"
                ls_raw = _inherited(el, ancestors, "letter-spacing", "0")
                try:
                    ls = float(ls_raw.replace("px", ""))
                except ValueError:
                    ls = 0.0
                texts.append(TextEl(content, _f(el, "x"), _f(el, "y"), fs,
                                    f"{weight}|{style}", ls))
        for child in el:
            walk(child, [*ancestors, el])

    walk(root, [])
    return texts, rects


def find_box(t: TextEl, rects: list[Rect]) -> Rect | None:
    """Smallest-area plausible container whose bounds hold the text's anchor point."""
    candidates = [
        r for r in rects
        if r.contains(t.x, t.y) and r.h >= 1.1 * t.font_size and r.w >= 1.5 * t.font_size
    ]
    return min(candidates, key=lambda r: r.area) if candidates else None


def _verdict(ratio: float) -> str:
    if ratio >= OVERFLOW_RATIO:
        return "OVERFLOW"
    if ratio >= STRAIN_RATIO:
        return "strain"
    return "ok"


def analyze(path: pathlib.Path, faces: dict[str, Face]) -> list[Finding]:
    texts, rects = parse_svg(path)
    findings: list[Finding] = []
    for t in texts:
        box = find_box(t, rects)
        if box is None:
            continue  # free-floating label — no box to strain against
        face = faces.get(t.face_key) or faces["normal|normal"]
        est = face.width(t.text, t.font_size, t.letter_spacing)
        inner = max(box.w - 2 * PAD_EM_PER_SIDE * t.font_size, 1.0)
        ratio = est / inner
        v = _verdict(ratio)
        if v != "ok":
            findings.append(Finding(path.name, t.text, v, ratio, t.font_size, box.w, inner))
    return findings


def _in_scope(name: str) -> bool:
    return not name.startswith(EXCLUDE_PREFIXES)


def findings() -> list[Finding]:
    faces = load_faces()
    out: list[Finding] = []
    for svg in sorted(ASSETS.glob("*.svg")):
        if _in_scope(svg.name):
            out.extend(analyze(svg, faces))
    return out


def summary_line(fs: list[Finding]) -> str:
    n_over = sum(1 for f in fs if f.verdict == "OVERFLOW")
    n_strain = sum(1 for f in fs if f.verdict == "strain")
    figs = len({f.svg for f in fs})
    return (f"{len(fs)} finding(s) — OVERFLOW={n_over}, strain={n_strain} "
            f"across {figs} figure(s); authoring budget figure_pad_min()={dtk.figure_pad_min()}px")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--strict", action="store_true", help="exit 1 on any finding (the blocking flip)")
    args = ap.parse_args(argv)
    fs = findings()
    mode = "STRICT (exit 1 on any finding)" if args.strict else "AUDIT-ONLY (prints, exits 0)"
    print(f"== figure-overflow — text-fits-its-box sensor over book/assets/*.svg [{mode}] ==")
    print(f"  threshold: inner = box − {2 * PAD_EM_PER_SIDE:.2f}·fs · OVERFLOW ≥ {OVERFLOW_RATIO:.2f} · "
          f"strain ≥ {STRAIN_RATIO:.2f} · excluded: {', '.join(EXCLUDE_PREFIXES)}*")
    if not fs:
        print("  clean — every boxed label fits its padded box")
        return 0
    print(f"  {summary_line(fs)}:")
    for f in sorted(fs, key=lambda f: (f.svg, -f.ratio)):
        print(f"    [{f.verdict:>8} {f.ratio:.2f}] {f.svg} — fs={f.font_size:g} box_w={f.box_w:g} "
              f'inner={f.inner:.0f}  "{f.text[:52]}"')
    return 1 if args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
