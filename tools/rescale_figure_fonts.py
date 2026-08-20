"""Codemod: re-scale hand-authored figure font-sizes into the design-token legibility band.

THE DEFECT (see book/_design/drafts/figure-minfont-review-260805.md). The house SVGs under book/assets/
author font-sizes in ABSOLUTE viewBox user units, but their viewBoxes span ~380 → 1300 (a ~3.4× spread).
So identical role intent renders up to 3× different: a 13u sub-label in a 1250-wide figure renders ~10px
(too small to read against body), while a 15u label in a 380-wide figure renders ~40px (louder than a
section heading). The `figure-font-band` sensor flags both ends; this codemod fixes the cause.

Two stages, applied per figure, changing ONLY font-size numbers (no XML round-trip — the raw text is edited
in place, so comments, formatting, boxes, arrows, paths, positions and colors are never touched):

  STAGE 1 — band-snap (the review's formula). A label's rendered size at the figure reference width is
  `font_u · reference_width / viewBox_width`. Every font-size that renders OUTSIDE the band [floor, ceiling]
  (both from the design tokens) is rewritten to the nearest in-band design-token role, converted back to
  user units for THIS figure's viewBox:

      rendered   = size_u · reference_width / viewBox_w
      role_px    = nearest of {sub_label, label, box_title, figure_title} to rendered   (ties -> larger)
      target_px  = clamp(role_px, floor, ceiling)          # in-band role: {16, 18, 24}
      new_size_u = target_px · viewBox_w / reference_width

  In-band font-sizes are LEFT UNTOUCHED. Too-small labels grow to the floor role (16px); too-big labels
  shrink to the figure-title role (24px). The map depends only on (size, viewBox), so every occurrence of a
  given font-size in a file transforms identically.

  STAGE 2 — overflow-fit (the box wins over the floor). Growing a too-small label can push it past its box,
  which the (blocking) overflow sensor forbids. So after the snap, any `<text>` whose new size STRAINS or
  OVERFLOWS its box is reduced to the largest size that clears the sensor — even below the band floor if the
  box genuinely cannot hold floor-size text. A sub-floor result is reported as a residual to flag (the box,
  not the font, is then the thing to fix). Overflow (blocking) always wins; the band sensor is audit-only.

Excluded: `cover*` (decorative) and `velocity-*` (data charts) — the same out-of-scope set the sensors use.

    python3 tools/rescale_figure_fonts.py --dry-run                       # plan every file, write nothing
    python3 tools/rescale_figure_fonts.py --dry-run --only printer-loop mage-loop-2-churn
    python3 tools/rescale_figure_fonts.py --only printer-loop.svg         # apply to one figure
    python3 tools/rescale_figure_fonts.py                                 # apply to the whole corpus
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
ASSETS = ROOT / "book" / "assets"

sys.path.insert(0, str(ROOT / "book-models"))
import design_tokens as dtk  # noqa: E402 — the band + role + reference-width SSOT
import lint_figure_overflow as ovf  # noqa: E402 — reuse its box-finder + glyph-advance width estimator

EXCLUDE_PREFIXES = ("cover", "velocity-")

# A font-size occurrence in either form: attribute `font-size="14.5"` or CSS decl `font-size: 14px`.
_FONT_SIZE_RE = re.compile(r"(font-size\s*[:=]\s*)(['\"]?)\s*([0-9]*\.?[0-9]+)\s*(px)?")
# The opening tag of a <text> element, in document order (SVG text does not nest).
_TEXT_OPEN_RE = re.compile(r"<text\b[^>]*>")
# A font-size attribute inside a single opening tag (double-quoted, as the house SVGs author it).
_FONT_SIZE_ATTR_RE = re.compile(r'font-size\s*=\s*"([0-9]*\.?[0-9]+)(px)?"')

# Fit below this ratio so the label clears BOTH the sensor's strain (0.90) and overflow (1.00) verdicts.
_FIT_TARGET_RATIO = 0.88


def _fmt(v: float) -> str:
    """Shortest faithful string for a size: integers stay integers, else 2dp with trailing zeros trimmed."""
    r = round(v, 2)
    if abs(r - round(r)) < 1e-9:
        return str(int(round(r)))
    return f"{r:.2f}".rstrip("0").rstrip(".")


def _nearest_role(rendered: float, roles: list[float]) -> float:
    """The role px nearest to a rendered size; a tie resolves to the LARGER role (favor legibility)."""
    return min(roles, key=lambda role: (abs(role - rendered), -role))


def _viewbox_width(text: str) -> float | None:
    m = re.search(r'viewBox\s*=\s*["\']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+[0-9.]+', text)
    return float(m.group(1)) if m else None


class Rescaler:
    """Per-corpus font-size band-rescaler. Holds the design-token band/roles/reference-width and the
    overflow sensor's glyph-advance faces (both loaded once)."""

    def __init__(self) -> None:
        t = dtk.load()
        self.floor, self.ceiling = (float(x) for x in t.figure_band_px())
        self.ref_w = float(t.figure_styles["canvas"]["reference_width_px"])
        role_px = t.figure_styles["font"]["role_px"]
        self.roles = sorted({float(role_px[k]) for k in ("sub_label", "label", "box_title", "figure_title")})
        self.faces = ovf.load_faces()

    # ---- stage 1: band-snap -------------------------------------------------------------------------
    def target_size(self, size_u: float, vb_w: float) -> float | None:
        """New user-unit size for an authored size in a viewBox of width vb_w, or None to leave as-is."""
        rendered = size_u * self.ref_w / vb_w
        if self.floor <= rendered <= self.ceiling:
            return None
        role_px = _nearest_role(rendered, self.roles)
        target_px = max(self.floor, min(self.ceiling, role_px))
        return target_px * vb_w / self.ref_w

    def band_snap(self, text: str, vb_w: float) -> tuple[str, list[tuple[float, float, float, float]]]:
        """Return (new_text, changes) where each change is (old_u, new_u, old_render, new_render)."""
        changes: list[tuple[float, float, float, float]] = []

        def repl(m: re.Match[str]) -> str:
            size_u = float(m.group(3))
            new_u = self.target_size(size_u, vb_w)
            if new_u is None or abs(new_u - size_u) < 1e-6:
                return m.group(0)
            changes.append((size_u, new_u, size_u * self.ref_w / vb_w, new_u * self.ref_w / vb_w))
            return f"{m.group(1)}{m.group(2)}{_fmt(new_u)}{m.group(4) or ''}"

        return _FONT_SIZE_RE.sub(repl, text), changes

    # ---- stage 2: overflow-fit ----------------------------------------------------------------------
    def _fit(self, t: ovf.TextEl, box: ovf.Rect) -> float | None:
        """Largest font-size ≤ t.font_size whose box-fit ratio clears the sensor, or None if already clear.
        May return below the band floor when the box cannot hold floor-size text."""
        face = self.faces.get(t.face_key) or self.faces["normal|normal"]

        def ratio(fs: float) -> float:
            inner = max(box.w - 2 * ovf.PAD_EM_PER_SIDE * fs, 1.0)
            return face.width(t.text, fs, t.letter_spacing) / inner

        if ratio(t.font_size) < ovf.STRAIN_RATIO:
            return None
        lo, hi = 1.0, t.font_size
        for _ in range(40):
            mid = (lo + hi) / 2
            if ratio(mid) <= _FIT_TARGET_RATIO:
                lo = mid
            else:
                hi = mid
        return round(lo, 2)

    def overflow_fits(self, text: str, vb_w: float) -> tuple[str, list[tuple[str, float, float, float]]]:
        """Reduce every straining/overflowing <text> to a fitting size. Returns (new_text, reports) where
        each report is (label, old_u, new_u, new_render_px). A fit-needing <text> with an own `font-size`
        has its value replaced; one that INHERITS its size gets an explicit `font-size` inserted on itself
        (still only a font-size change — the geometry guard permits it)."""
        try:
            root = ET.fromstring(text)
        except ET.ParseError:
            return text, []
        texts, rects = _parse_texts_rects(root)
        opens = list(_TEXT_OPEN_RE.finditer(text))
        if len(opens) != len(texts):
            return text, []  # alignment unsafe — skip stage 2 (stage-1 result stands)

        edits: list[tuple[int, int, str]] = []  # (start, end, replacement); start==end means insertion
        reports: list[tuple[str, float, float, float]] = []
        for t, m in zip(texts, opens):
            box = ovf.find_box(t, rects)
            if box is None:
                continue
            fitted = self._fit(t, box)
            if fitted is None or fitted >= t.font_size:
                continue
            attr = _FONT_SIZE_ATTR_RE.search(m.group(0))
            if attr:  # replace the existing value in place
                edits.append((m.start() + attr.start(1), m.start() + attr.end(1), _fmt(fitted)))
            else:  # inherited size — insert an explicit font-size on this <text> only
                edits.append((m.start() + len("<text"), m.start() + len("<text"), f' font-size="{_fmt(fitted)}"'))
            reports.append((t.text, t.font_size, fitted, fitted * self.ref_w / vb_w))

        for a0, a1, rep in sorted(edits, key=lambda e: e[0], reverse=True):
            text = text[:a0] + rep + text[a1:]
        return text, reports


def _parse_texts_rects(root: ET.Element) -> tuple[list[ovf.TextEl], list[ovf.Rect]]:
    """Document-order (texts, rects) — mirrors lint_figure_overflow.parse_svg but from an in-memory root."""
    texts: list[ovf.TextEl] = []
    rects: list[ovf.Rect] = []

    def walk(el: ET.Element, ancestors: list[ET.Element]) -> None:
        tag = ovf._tag(el)
        if tag == "rect":
            rects.append(ovf.Rect(ovf._f(el, "x"), ovf._f(el, "y"), ovf._f(el, "width"), ovf._f(el, "height")))
        elif tag == "text":
            content = "".join(el.itertext()).strip()
            if content:
                fs_raw = ovf._inherited(el, ancestors, "font-size", "16")
                try:
                    fs = float(fs_raw.replace("px", ""))
                except ValueError:
                    fs = 16.0
                fw = ovf._inherited(el, ancestors, "font-weight", "normal")
                weight = "bold" if fw in ovf._BOLD_WEIGHTS else "normal"
                style = "italic" if ovf._inherited(el, ancestors, "font-style", "normal") == "italic" else "normal"
                ls_raw = ovf._inherited(el, ancestors, "letter-spacing", "0")
                try:
                    ls = float(ls_raw.replace("px", ""))
                except ValueError:
                    ls = 0.0
                texts.append(ovf.TextEl(content, ovf._f(el, "x"), ovf._f(el, "y"), fs, f"{weight}|{style}", ls))
        for child in el:
            walk(child, [*ancestors, el])

    walk(root, [])
    return texts, rects


def _in_scope(name: str) -> bool:
    return not name.startswith(EXCLUDE_PREFIXES)


def _targets(only: list[str] | None) -> list[pathlib.Path]:
    out: list[pathlib.Path] = []
    for svg in sorted(ASSETS.glob("*.svg")):
        if not _in_scope(svg.name):
            continue
        if only and not any(svg.name == o or svg.stem == pathlib.Path(o).stem for o in only):
            continue
        out.append(svg)
    return out


# A whole font-size occurrence WITH any leading whitespace, so stripping it neutralizes a changed value, an
# inserted attribute, and its separating space alike — the geometry guard compares the strip remainders.
_FONT_SIZE_STRIP_RE = re.compile(r"\s*font-size\s*[:=]\s*['\"]?\s*[0-9]*\.?[0-9]+\s*(?:px)?['\"]?")


def _geometry_unchanged(before: str, after: str) -> bool:
    """Assert the only textual difference is font-size — changing, adding, or removing a font-size (with its
    separating whitespace) is the ONLY edit allowed; every other byte, everywhere, must be identical."""
    strip = lambda s: _FONT_SIZE_STRIP_RE.sub("", s)
    return strip(before) == strip(after)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="plan only; write nothing")
    ap.add_argument("--only", nargs="*", help="restrict to these figures (name or stem)")
    ap.add_argument("--hard-floor", action="store_true",
                    help="skip Stage-2 overflow-fit: labels stay AT the band floor rather than being shrunk "
                         "below it to fit a too-small box (the house rule forbids solving density by "
                         "shrinking type — the box, not the font, is then the thing to widen)")
    args = ap.parse_args(argv)

    r = Rescaler()
    print(f"== rescale-figure-fonts — snap out-of-band font-sizes to nearest role in "
          f"[{r.floor:.0f}, {r.ceiling:.0f}]px (roles {[int(x) for x in r.roles]}, ref {r.ref_w:.0f}px), then "
          f"overflow-fit [{'DRY-RUN' if args.dry_run else 'APPLY'}] ==")
    n_files = n_grown = n_shrunk = n_fitted = n_subfloor = 0
    for svg in _targets(args.only):
        text0 = svg.read_text(encoding="utf-8")
        vb_w = _viewbox_width(text0)
        if not vb_w:
            print(f"  [skip] {svg.name}: no viewBox width")
            continue
        text1, changes = r.band_snap(text0, vb_w)
        # --hard-floor: keep Stage-1's floor-snap; SKIP Stage-2 overflow-fit (which would shrink a label
        # below the floor to fit a too-small box — the house rule forbids solving density by shrinking type).
        text2, fits = (text1, []) if args.hard_floor else r.overflow_fits(text1, vb_w)
        if not changes and not fits:
            continue
        if not _geometry_unchanged(text0, text2):
            print(f"  [ERROR] {svg.name}: non-font-size bytes changed — refusing to write")
            return 2
        grown = sum(1 for o, n, _, _ in changes if n > o)
        shrunk = sum(1 for o, n, _, _ in changes if n < o)
        n_grown += grown
        n_shrunk += shrunk
        n_fitted += len(fits)
        n_files += 1
        distinct = sorted({(round(o, 2), round(n, 2), round(orr, 1), round(nr, 1)) for o, n, orr, nr in changes},
                          key=lambda c: c[2])
        remap = ", ".join(f"{_fmt(o)}u->{_fmt(n)}u ({orr:.0f}->{nr:.0f}px)" for o, n, orr, nr in distinct)
        print(f"  [{'plan' if args.dry_run else 'edit'}] {svg.name} (vb {vb_w:.0f}): "
              f"{len(changes)} snap, {grown} grown / {shrunk} shrunk :: {remap or '(none)'}")
        for label, ou, nu, npx in fits:
            flag = "  ⚠ SUB-FLOOR (box too small for floor-size text)" if npx < r.floor - 0.05 else ""
            if npx < r.floor - 0.05:
                n_subfloor += 1
            print(f"      fit: '{label[:40]}' {_fmt(ou)}u->{_fmt(nu)}u ({npx:.1f}px){flag}")
        if not args.dry_run:
            svg.write_text(text2, encoding="utf-8")
    verb = "would change" if args.dry_run else "changed"
    print(f"  {verb} {n_files} figure(s): {n_grown} grown, {n_shrunk} shrunk, "
          f"{n_fitted} overflow-fitted ({n_subfloor} sub-floor)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
