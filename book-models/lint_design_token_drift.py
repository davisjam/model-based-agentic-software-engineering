"""LINT `design-token-drift` — the styling drift gate for the one-token / three-surface design system.

The repo's own thesis applied to its styling: `design-tokens.json` is the SSOT, `design_tokens.py`
projects it into each renderer's native form, and THIS lint bans anything that would let a surface drift
off the tokens. It scans the three renderers' style regions and the hand-drawn figures for raw literals
that should be `var(--…)` / `dt.…` lookups, checks the emitted mermaid config is fresh, and pins the
decided semantic-box anchors by hue band (thesis GREEN, definition BLUE, inset LAVENDER).

Checks:
  1. No raw color in a style region. `#hex` / `rgb(` / `rgba(` / `hsl(` / `luma(` in the site CSS blocks
     (`PAGE_CSS`/`LANDING_CSS`/`FONT_CSS`/`VIEWS_CSS` in catalog.py), the web-book `CSS` f-string in
     build_book.py, or the Typst helpers in book_typst.py — anything outside a `var(--…)` / `dt.…`
     lookup is a finding. Escape (sparingly): a `token-exempt` marker on the line.
  2. No off-scale font-size. Any `font-size`/`text(size:` literal in those regions must be a `var(--fs-*)`
     / `dt.fs-*` lookup or resolve to a scale step; a bare px/pt/rem font-size is a finding.
  3. SVG palette membership. Every fill/stroke hex in book/assets/*.svg must be in `svg_palette()`, and
     any `font-family` must name the figure-font token stack.
  4. Mermaid config freshness. book/assets/mermaid-config.json must equal `design_tokens.mermaid_theme()`.
  5. Decided-anchor hue pin. `box-thesis-rule` green-hued, `box-def-rule` blue-hued, `box-inset-rule`
     lavender-hued — a hue-band assertion so a future option swap cannot silently un-decide the mapping.

LANDS AUDIT-ONLY-FIRST (the repo's blocking-lint landing discipline): it PRINTS findings and exits 0, so
it never reddens an in-flight commit. `--strict` exits 1 on any finding — the flip a follow-up wires into
`validate` once the migration drains the seed literals to 0.

Run `python3 book-models/lint_design_token_drift.py` to see the findings (audit-only, exit 0).
"""
from __future__ import annotations

import argparse
import os
import pathlib
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import design_tokens as dtk  # noqa: E402 — the projector is this lint's source of truth

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG_PY = ROOT / "catalog.py"
BOOK_HTML_PY = ROOT / "book" / "build_book.py"
BOOK_TYPST_PY = ROOT / "book" / "book_typst.py"
ASSETS = ROOT / "book" / "assets"

# A hex color literal (3/6/8 digit). rgb()/rgba()/hsl()/luma() are matched as function tokens.
_HEX_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b")
_COLOR_FN_RE = re.compile(r"\b(?:rgb|rgba|hsl|hsla|luma)\s*\(")
_FONT_SIZE_RE = re.compile(r"font-size\s*:\s*([^;]+);")
_TYPST_SIZE_RE = re.compile(r"\btext\(size:\s*([^,)\]]+)")
_FONT_FAMILY_RE = re.compile(r'font-family\s*[:=]\s*["\']?([^"\';}>]+)')
_EXEMPT = "token-exempt"


def _extract_triple_quoted(src: str, name: str) -> str | None:
    """The body of a `NAME = \"\"\"…\"\"\"` (or f-string) assignment, or None if absent."""
    m = re.search(rf'{name}\s*=\s*f?"""(.*?)"""', src, re.DOTALL)
    return m.group(1) if m else None


def _extract_paren_concat(src: str, name: str) -> str | None:
    """The body of a `NAME = ( '…' '…' )` paren-joined string-literal assignment."""
    m = re.search(rf"{name}\s*=\s*\((.*?)\)\n", src, re.DOTALL)
    return m.group(1) if m else None


def _style_regions() -> list[tuple[str, str]]:
    """(label, text) for every style region the color/size bans police. Bounded to the named style
    blocks so hex elsewhere in the renderers (SVG path data, HTML) is out of scope."""
    regions: list[tuple[str, str]] = []
    cat = CATALOG_PY.read_text(encoding="utf-8")
    for name in ("PAGE_CSS", "LANDING_CSS", "VIEWS_CSS"):
        body = _extract_triple_quoted(cat, name)
        if body is not None:
            regions.append((f"catalog.py:{name}", body))
    font_css = _extract_paren_concat(cat, "FONT_CSS")
    if font_css is not None:
        regions.append(("catalog.py:FONT_CSS", font_css))
    book = BOOK_HTML_PY.read_text(encoding="utf-8")
    book_css = _extract_triple_quoted(book, "CSS")
    if book_css is not None:
        regions.append(("build_book.py:CSS", book_css))
    # book_typst.py: the whole module — its color literals live in scattered `_render_*` helpers, and
    # after migration all become dt.… lookups (the runtime-prepended preamble is not in this source).
    regions.append(("book_typst.py", BOOK_TYPST_PY.read_text(encoding="utf-8")))
    return regions


def _scan_colors_and_sizes() -> list[str]:
    out: list[str] = []
    for label, text in _style_regions():
        for i, line in enumerate(text.splitlines(), 1):
            if _EXEMPT in line:
                continue
            for m in _HEX_RE.finditer(line):
                out.append(f"RAW-COLOR {label}:{i} — raw hex {m.group(0)!r} (use var(--…) / dt.…): "
                           f"{line.strip()[:90]!r}")
            fn = _COLOR_FN_RE.search(line)
            if fn:
                out.append(f"RAW-COLOR {label}:{i} — raw {fn.group(0).strip()}…) color function "
                           f"(use var(--…) / dt.…): {line.strip()[:90]!r}")
            for m in _FONT_SIZE_RE.finditer(line):
                val = m.group(1).strip()
                if "var(--fs" not in val and "var(--" not in val:
                    out.append(f"OFF-SCALE {label}:{i} — font-size {val!r} not a scale var (--fs-*): "
                               f"{line.strip()[:90]!r}")
            for m in _TYPST_SIZE_RE.finditer(line):
                val = m.group(1).strip()
                if "dt." not in val and val not in ("1em", "0.9em", "1.1em"):
                    out.append(f"OFF-SCALE {label}:{i} — Typst text size {val!r} not a dt.fs-* lookup: "
                               f"{line.strip()[:90]!r}")
    return out


def _scan_svgs() -> list[str]:
    out: list[str] = []
    palette = dtk.svg_palette()
    body_stack = {f.strip().strip('"').lower() for f in dtk.load().css_stack("body").split(",")}
    for svg in sorted(ASSETS.glob("*.svg")):
        text = svg.read_text(encoding="utf-8")
        for m in _HEX_RE.finditer(text):
            hx = m.group(0).lower()
            if hx not in palette:
                out.append(f"SVG-COLOR {svg.name} — hex {hx!r} not in svg_palette() (re-map to nearest token)")
        for m in _FONT_FAMILY_RE.finditer(text):
            fams = {f.strip().strip('"\'').lower() for f in m.group(1).split(",")}
            if not (fams & body_stack):
                out.append(f"SVG-FONT {svg.name} — font-family {m.group(1).strip()!r} is not the figure "
                           f"body-font token stack")
    return out


def _hue_of(hex_str: str) -> float:
    """Hue in degrees (0–360) from a #rrggbb literal."""
    h = hex_str.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return 0.0
    if mx == r:
        hue = ((g - b) / d) % 6
    elif mx == g:
        hue = (b - r) / d + 2
    else:
        hue = (r - g) / d + 4
    return hue * 60


def _scan_anchor_hues() -> list[str]:
    out: list[str] = []
    pal = dtk.load().palette
    # (token, human band, [(lo, hi) allowed hue ranges in degrees])
    bands = [
        ("box-thesis-rule", "green", [(90, 170)]),
        ("box-def-rule", "blue", [(190, 260)]),
        ("box-inset-rule", "lavender/violet", [(240, 300)]),
    ]
    for token, band, ranges in bands:
        hue = _hue_of(pal[token])
        if not any(lo <= hue <= hi for lo, hi in ranges):
            out.append(f"ANCHOR-HUE {token}={pal[token]} hue≈{hue:.0f}° is outside the decided {band} band "
                       f"{ranges} — the semantic-box mapping must not drift")
    return out


def findings() -> list[str]:
    out: list[str] = []
    out.extend(_scan_colors_and_sizes())
    out.extend(_scan_svgs())
    if not dtk.mermaid_is_fresh():
        out.append("MERMAID-STALE book/assets/mermaid-config.json != mermaid_theme() "
                   "(run: design_tokens.py emit-mermaid)")
    out.extend(_scan_anchor_hues())
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--strict", action="store_true", help="exit 1 on any finding (the post-drain flip)")
    args = ap.parse_args(argv)
    fs = findings()
    mode = "STRICT (exit 1 on any finding)" if args.strict else "AUDIT-ONLY (prints, exits 0)"
    print(f"== design-token-drift — raw literals / off-scale sizes / SVG palette / anchor hues [{mode}] ==")
    if not fs:
        print("  clean — every style region references tokens; SVGs ⊆ palette; anchors in band; mermaid fresh")
        return 0
    print(f"  {len(fs)} finding(s):")
    for f in fs:
        print(f"    {f}")
    return 1 if args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
