"""Measured-layout helpers for slide-scale SVG figure variants.

DESIGN RULE (the thing that makes these auditable): a variant's viewBox is
expressed in POINTS AT THE PLACED WIDTH.  viewBox width == placed width in pt,
so `font-size="15"` renders at exactly 15.0 pt native on the slide and
  effective pt = font-size x (placed width pt / viewBox width) = font-size.
Every fit assertion below is therefore an assertion about NATIVE POINTS.

Text advances come from the real Source Sans 3 TTFs, so a layout that passes
`fit()` cannot silently overflow under the renderer that uses the same faces.
"""
from __future__ import annotations
from PIL import ImageFont
from pathlib import Path

_FONTDIR = Path(__file__).resolve().parents[3] / "book" / "fonts" / "SourceSans3"
_FILES = {
    (False, False): "SourceSans3-Regular.ttf",
    (True, False): "SourceSans3-Bold.ttf",
    (False, True): "SourceSans3-It.ttf",
    (True, True): "SourceSans3-BoldIt.ttf",
}
_EM = 1000
_cache: dict[tuple[bool, bool], ImageFont.FreeTypeFont] = {}


def _font(bold: bool, italic: bool) -> ImageFont.FreeTypeFont:
    key = (bold, italic)
    if key not in _cache:
        p = _FONTDIR / _FILES[key]
        if not p.exists():
            raise SystemExit(f"FATAL: font missing: {p}")
        _cache[key] = ImageFont.truetype(str(p), _EM)
    return _cache[key]


def adv(text: str, size: float, bold: bool = False, italic: bool = False,
        letter_spacing: float = 0.0) -> float:
    """Advance width in user units (== native pt) for `text` at `size`."""
    w = _font(bold, italic).getlength(text) / _EM * size
    if letter_spacing:
        w += letter_spacing * len(text)
    return w


def wrap(text: str, size: float, maxw: float, bold: bool = False,
         italic: bool = False) -> list[str]:
    """Greedy word wrap to `maxw` user units. Never splits a word."""
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if cur and adv(trial, size, bold, italic) > maxw:
            lines.append(cur)
            cur = w
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


class Fit:
    """Collects fit assertions so a generator fails loud instead of overflowing."""

    def __init__(self, name: str, w: float, h: float) -> None:
        self.name, self.w, self.h = name, w, h
        self.errors: list[str] = []
        self.texts: list[tuple[str, float]] = []

    def text(self, s: str, size: float, maxw: float, *, bold=False, italic=False,
             ls: float = 0.0, where: str = "") -> str:
        a = adv(s, size, bold, italic, ls)
        self.texts.append((s, size))
        if a > maxw + 0.01:
            self.errors.append(
                f"  OVERFLOW {where or s[:28]!r}: {a:.1f} > {maxw:.1f} pt "
                f"(size {size}, {len(s)} ch)")
        return s

    def box(self, x: float, y: float, w: float, h: float, where: str) -> None:
        if x < -0.01 or y < -0.01 or x + w > self.w + 0.01 or y + h > self.h + 0.01:
            self.errors.append(
                f"  OUTSIDE CANVAS {where}: x{x:.1f} y{y:.1f} w{w:.1f} h{h:.1f} "
                f"vs canvas {self.w:.1f}x{self.h:.1f}")

    def done(self) -> float:
        if self.errors:
            raise SystemExit(f"FIT FAILED for {self.name}:\n" + "\n".join(self.errors))
        smallest = min(s for _, s in self.texts)
        return smallest
