"""The design-token PROJECTOR — one typed SSOT (`design-tokens.json`), three renderer projections.

The repo's own thesis, applied to its own styling: project the artifact from a typed model, then gate
drift. `design-tokens.json` is the single source of truth for the Umber-Monograph visual system (warm
paper, burnt-umber accent, a Source Serif 4 display face, one 8-step type scale addressed by ROLE, and the
decided semantic-box anchors — thesis GREEN, definition BLUE, inset LAVENDER). This module reads it and
emits each renderer's native form so the three surfaces (site / web book / PDF) cannot diverge:

    css_root_block()   -> ":root { --ink:#1c1917; --fs-body:18px; … }"   (site + web book inline this)
    typst_preamble()   -> "#let dt = (ink: rgb(\"#1c1917\"), fs-body: 13.5pt, …)" (PDF prepends this)
    mermaid_theme()     -> themeVariables dict for book/assets/mermaid-config.json (emitted artifact)
    svg_palette()       -> frozenset of every sanctioned hex (the hand-drawn-SVG membership set)
    google_fonts_link() -> the <link> that loads the display/body/mono web fonts

STDLIB-ONLY (`json`, `pathlib`, `argparse`) so `python3 catalog.py …` stays clone-and-run. Sits beside
the other model tooling (`outline_model.py`, `outcomes_model.py`).

CLI:
    python3 book-models/design_tokens.py css            # print the CSS :root block
    python3 book-models/design_tokens.py typst          # print the Typst #let dt preamble
    python3 book-models/design_tokens.py palette        # print the SVG palette allow-list
    python3 book-models/design_tokens.py emit-mermaid    # regenerate book/assets/mermaid-config.json
    python3 book-models/design_tokens.py check-mermaid   # verify the config equals the emitter (exit 1 if stale)
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from dataclasses import dataclass

HERE = pathlib.Path(__file__).resolve().parent
TOKENS_JSON = HERE / "design-tokens.json"
MERMAID_CONFIG = HERE.parent / "book" / "assets" / "mermaid-config.json"

# px → pt conversion for the print projection (96px == 72pt, so 1px == 0.75pt). Keeps screen and print
# proportional: re-ratio the scale once and both surfaces follow.
_PX_TO_PT = 0.75


@dataclass(frozen=True)
class Tokens:
    """Typed accessors over the SSOT. `palette` and the type/space/radius/border groups are raw dicts;
    the `px`/`pt`/`hex_` helpers resolve role names so call sites never index the scale array directly."""

    raw: dict

    @property
    def option(self) -> str:
        return self.raw["option"]

    @property
    def palette(self) -> dict:
        return self.raw["palette"]

    @property
    def type(self) -> dict:
        return self.raw["type"]

    @property
    def accent_name(self) -> str:
        """Human name of palette.accent (#9a3f12) — for prose that says the color as a word.
        Prose-only; not a render token (never enters css_root_block / typst_preamble)."""
        return self.raw["accent_name"]

    def hex_(self, role: str) -> str:
        return self.palette[role]

    def _scale(self) -> list[int]:
        return self.type["scale-px"]

    def _role_index(self, role: str) -> int:
        return self.type["roles"][role]

    def px(self, role: str) -> int:
        """Font-size in px for a type ROLE (`body`, `card-title`, `display`, …)."""
        return self._scale()[self._role_index(role)]

    def pt(self, role: str) -> float:
        return round(self.px(role) * _PX_TO_PT, 2)

    def space(self, i: int) -> int:
        return self.raw["space-px"][i]

    def radius(self, name: str) -> int:
        return self.raw["radius-px"][name]

    def border(self, name: str) -> int:
        return self.raw["border-px"][name]

    def css_stack(self, kind: str) -> str:
        return self.type[kind]["css-stack"]

    def typst_stack(self, kind: str) -> list[str]:
        return self.type[kind]["typst-stack"]

    @property
    def figure_styles(self) -> dict:
        return self.raw["figure_styles"]

    def figure_pad_min(self) -> int:
        """Min horizontal breathing room (px, at reference width) a glyph must keep from its box
        edge. The one number the overflow sensor imports so its padding threshold is never hardcoded."""
        return self.figure_styles["box"]["text_pad_min_px"]

    def figure_font_px(self, role: str) -> int:
        """Font-size in px for a figure text ROLE (`figure_title`, `box_title`, `label`, …)."""
        return self.figure_styles["font"]["role_px"][role]

    def figure_band_px(self) -> tuple[int, int]:
        """The (floor, ceiling) px band figure text must render within at the figure reference width.
        Floor survives print shrinkage (a below-16 label is ~<8px in the PDF); ceiling is the type
        scale's section/H2 step, so figure text never out-shouts a heading. The one SSOT the band
        sensor imports so its thresholds are never hardcoded."""
        band = self.figure_styles["font"]["band_px"]
        return int(band["floor"]), int(band["ceiling"])


def load(path: pathlib.Path = TOKENS_JSON) -> Tokens:
    with open(path, encoding="utf-8") as fh:
        return Tokens(json.load(fh))


# ── CSS projection ──────────────────────────────────────────────────────────────────────────────────
# Custom-property names are the cross-renderer contract. Palette keys map 1:1 to `--<key>`; type roles
# become `--fs-<role>`; spacing/radii/borders/line-heights get stable names. Both catalog.py (site) and
# build_book.py (web book) inline this block at the top of their style, then reference var(--…).

_ROLE_ORDER = ["micro", "meta", "card-body", "body", "card-title", "section", "thesis-title", "display"]


def css_root_block(t: Tokens | None = None) -> str:
    t = t or load()
    lines: list[str] = [
        "  /* GENERATED by book-models/design_tokens.py from design-tokens.json — do not hand-edit. */",
        "  :root {",
    ]
    for key, val in t.palette.items():
        lines.append(f"    --{key}: {val};")
    lines.append(f"    --font-display: {t.css_stack('display')};")
    lines.append(f"    --font-body: {t.css_stack('body')};")
    lines.append(f"    --font-mono: {t.css_stack('mono')};")
    disp = t.type["display"]
    lines.append(f"    --display-weight: {disp['display-weight']};")
    lines.append(f"    --display-tracking: {disp['display-tracking-em']}em;")
    for role in _ROLE_ORDER:
        lines.append(f"    --fs-{role}: {t.px(role)}px;")
    lh = t.type["line-height"]
    lines.append(f"    --lh-body: {lh['body']};")
    lines.append(f"    --lh-display: {lh['display']};")
    lines.append(f"    --lh-card: {lh['card']};")
    for i, _ in enumerate(t.raw["space-px"]):
        lines.append(f"    --space-{i}: {t.space(i)}px;")
    for name in t.raw["radius-px"]:
        lines.append(f"    --radius-{name}: {t.radius(name)}px;")
    for name in t.raw["border-px"]:
        lines.append(f"    --border-{name}: {t.border(name)}px;")
    lines.append("  }")
    return "\n".join(lines) + "\n"


def google_fonts_link(t: Tokens | None = None, rel_root: str = "") -> str:
    """Emit a self-hosted <style> block of @font-face rules for the display (Source Serif 4),
    body (Source Sans 3), and mono (IBM Plex Mono) faces.

    Self-hosted (NOT Google Fonts): every face is served from the in-artifact `book/fonts/` tree,
    so there is zero external font dependency — Google rotating a versioned woff2 URL can no longer
    404 a served page (the console-error CI gate).

    `rel_root` is the caller's per-page `../`-string back to the SITE ROOT (the dir that contains
    both `book/` and the catalogue). The font `src` is emitted RELATIVE — `url('{rel_root}book/fonts/…')`
    — NOT absolute `/book/fonts/…`: GitHub Pages serves a project repo under a subpath
    (`/<repo>/`), so an absolute `/book/fonts/…` would resolve to the domain root and 404 exactly
    like the old CDN URL did. A relative src resolves correctly under root, under a project subpath,
    AND in local preview. Callers: catalogue pages pass their per-page rel_root (`../`×depth); the
    flattened book pages (all one level deep in `book/`) pass `"../"`; root pages pass `""`.

    Face coverage mirrors the weights the site actually uses:
      Source Serif 4 — 400/600/700 upright + 400/600/700 italic (all TTFs bundled).
      Source Sans 3  — 400/700 upright + 400/700 italic. NO Semibold (600) TTF is bundled, so the
                       600 face is omitted; the CSS font stack falls back to the nearest weight.
      IBM Plex Mono  — 400 upright; 500 (Medium) is NOT bundled, so 500 maps to the Regular TTF."""
    faces: list[tuple[str, str, int, str]] = [
        # (family, style, weight, file under book/fonts/<dir>/)
        ("Source Serif 4", "normal", 400, "SourceSerif4/SourceSerif4-Regular.ttf"),
        ("Source Serif 4", "normal", 600, "SourceSerif4/SourceSerif4-Semibold.ttf"),
        ("Source Serif 4", "normal", 700, "SourceSerif4/SourceSerif4-Bold.ttf"),
        ("Source Serif 4", "italic", 400, "SourceSerif4/SourceSerif4-It.ttf"),
        ("Source Serif 4", "italic", 600, "SourceSerif4/SourceSerif4-SemiboldIt.ttf"),
        ("Source Serif 4", "italic", 700, "SourceSerif4/SourceSerif4-BoldIt.ttf"),
        ("Source Sans 3", "normal", 400, "SourceSans3/SourceSans3-Regular.ttf"),
        ("Source Sans 3", "normal", 700, "SourceSans3/SourceSans3-Bold.ttf"),
        ("Source Sans 3", "italic", 400, "SourceSans3/SourceSans3-It.ttf"),
        ("Source Sans 3", "italic", 700, "SourceSans3/SourceSans3-BoldIt.ttf"),
        # IBM Plex Mono 500 (Medium) is not bundled → map to Regular to avoid a 404.
        ("IBM Plex Mono", "normal", 400, "IBMPlexMono/IBMPlexMono-Regular.ttf"),
        ("IBM Plex Mono", "normal", 500, "IBMPlexMono/IBMPlexMono-Regular.ttf"),
    ]
    rules: list[str] = []
    for family, style, weight, path in faces:
        rules.append(
            "@font-face{"
            f"font-family:'{family}';"
            f"font-style:{style};"
            f"font-weight:{weight};"
            "font-stretch:normal;"
            "font-display:swap;"
            f"src:url('{rel_root}book/fonts/{path}') format('truetype');"
            "}"
        )
    return "<style>" + "".join(rules) + "</style>"


# ── Typst projection ────────────────────────────────────────────────────────────────────────────────
# `#let dt = ( … )` — colors as rgb("#…"), sizes as pt, font stacks as ("A", "B"). book_typst.py prepends
# this and looks up dt.ink / dt.fs-body / dt.box-thesis-rule … instead of literal hexes and luma() grays.


def _typst_font_tuple(stack: list[str]) -> str:
    return "(" + ", ".join(f'"{f}"' for f in stack) + ")"


def typst_preamble(t: Tokens | None = None) -> str:
    t = t or load()
    lines: list[str] = [
        "// GENERATED by book-models/design_tokens.py from design-tokens.json — do not hand-edit.",
        "#let dt = (",
    ]
    for key, val in t.palette.items():
        lines.append(f'  "{key}": rgb("{val}"),')
    lines.append(f'  "font-display": {_typst_font_tuple(t.typst_stack("display"))},')
    lines.append(f'  "font-body": {_typst_font_tuple(t.typst_stack("body"))},')
    lines.append(f'  "font-mono": {_typst_font_tuple(t.typst_stack("mono"))},')
    for role in _ROLE_ORDER:
        lines.append(f'  "fs-{role}": {t.pt(role)}pt,')
    for i, _ in enumerate(t.raw["space-px"]):
        lines.append(f'  "space-{i}": {round(t.space(i) * _PX_TO_PT, 2)}pt,')
    for name in t.raw["radius-px"]:
        lines.append(f'  "radius-{name}": {round(t.radius(name) * _PX_TO_PT, 2)}pt,')
    for name in t.raw["border-px"]:
        lines.append(f'  "border-{name}": {round(t.border(name) * _PX_TO_PT, 2)}pt,')
    disp = t.type["display"]
    lines.append(f'  "display-weight": {disp["display-weight"]},')
    lines.append(f'  "display-tracking": {disp["display-tracking-em"]}em,')
    lines.append(")")
    return "\n".join(lines) + "\n"


# ── Mermaid projection ──────────────────────────────────────────────────────────────────────────────
# The interior mermaid figures theme from the tokens (body sans, not Georgia serif). Emitted artifact,
# provenance-keyed — the freshness gate re-emits and compares.
#
# LAYOUT == DISPLAY invariant. Mermaid lays out its node boxes at the config font-size below; the
# web-book CSS then RENDERS the label text. If the CSS renders bigger than the config laid out, the text
# overflows the box on every figure. To make that impossible, the SAME token roles below drive BOTH the
# config (here) AND the CSS mermaid rules in the web build — a single source, so layout and display can
# never drift. `mermaid_label_px()` is the accessor the web build imports for its CSS literals.
#   node label  = `body`      (flowchart node labels + `.label text`)
#   message     = `card-body` (sequence `text.messageText`)
# Both are legible reading sizes; `body` is the book's body-text floor. Bumping either grows the boxes
# mermaid draws, so these stay at the scale steps that fit dense appendix schematics without ballooning.
_MERMAID_NODE_LABEL_ROLE = "body"
_MERMAID_MESSAGE_ROLE = "card-body"


def mermaid_label_px(t: Tokens | None = None) -> dict[str, int]:
    """The two mermaid label sizes (px) that MUST match between the layout config and the web-book CSS.
    The web build imports this so its `pre.mermaid` font-size rules derive from the SAME tokens the
    `mermaid_theme()` config uses — the config==CSS invariant that stops label overflow."""
    t = t or load()
    return {"node": t.px(_MERMAID_NODE_LABEL_ROLE), "message": t.px(_MERMAID_MESSAGE_ROLE)}


def mermaid_theme(t: Tokens | None = None) -> dict:
    t = t or load()
    body_family = t.css_stack("body")
    label = mermaid_label_px(t)
    return {
        "_provenance": "GENERATED by book-models/design_tokens.py (emit-mermaid) from design-tokens.json — do not hand-edit.",
        "startOnLoad": False,
        "securityLevel": "loose",
        "theme": "base",
        "htmlLabels": False,
        "themeVariables": {
            "fontFamily": body_family,
            # Global layout font == the CSS node-label font (see LAYOUT == DISPLAY note above).
            "fontSize": f"{label['node']}px",
            "primaryColor": t.hex_("panel"),
            "primaryTextColor": t.hex_("ink"),
            "primaryBorderColor": t.hex_("muted"),
            "lineColor": t.hex_("muted"),
            "secondaryColor": t.hex_("diagram-governed-fill"),
            "tertiaryColor": t.hex_("accent-tint"),
        },
        "flowchart": {"htmlLabels": False, "nodeSpacing": 55, "rankSpacing": 60, "padding": 12},
        # Sequence message spacing is laid out at messageFontSize; it MUST equal the CSS messageText size.
        "sequence": {"actorFontSize": label["node"], "messageFontSize": label["message"],
                     "noteFontSize": label["message"], "width": 170, "height": 55},
        "state": {"titleTopMargin": 12},
        "er": {"fontSize": t.px("micro")},
        "class": {},
    }


def emit_mermaid(t: Tokens | None = None) -> str:
    payload = json.dumps(mermaid_theme(t), indent=2) + "\n"
    MERMAID_CONFIG.write_text(payload, encoding="utf-8")
    return payload


def mermaid_is_fresh(t: Tokens | None = None) -> bool:
    if not MERMAID_CONFIG.exists():
        return False
    want = json.dumps(mermaid_theme(t), indent=2) + "\n"
    return MERMAID_CONFIG.read_text(encoding="utf-8") == want


# ── SVG palette allow-list ──────────────────────────────────────────────────────────────────────────
# Every fill/stroke hex in a hand-drawn figure must be a member of this set. Includes the semantic
# palette plus a small neutrals set the drawings use for text/outlines (all lowercase, both #rrggbb and
# the pure ink/paper/white).


def svg_palette(t: Tokens | None = None) -> frozenset[str]:
    t = t or load()
    members = {v.lower() for v in t.palette.values()}
    # Neutrals the figures may use for hairlines, text, and page ground.
    members.update({"#ffffff", "#fff", "none", "#000000"})
    return frozenset(members)


# ── Figure-style projection ───────────────────────────────────────────────────────────────────────────
# The enforceable geometry for hand-authored house SVGs (padding floor, stroke ladder, type ramp, arrow
# spec). Two consumers read the SAME numbers: the authoring guidance and the overflow sensor's threshold.
# The sensor imports `figure_pad_min()` so re-tuning the budget in the token file re-tunes the sensor —
# the same one-token discipline the drift lint uses with `svg_palette()`.


def figure_styles(t: Tokens | None = None) -> dict:
    """The raw `figure_styles` block (padding/stroke/type/arrow geometry for house SVGs)."""
    t = t or load()
    return t.figure_styles


def figure_pad_min(t: Tokens | None = None) -> int:
    """Min horizontal padding (px, at reference width) between a glyph and its box edge — the single
    declared budget the overflow sensor keys off. Never hardcode 16 in the lint; import this."""
    t = t or load()
    return t.figure_pad_min()


def figure_arrow_marker(marker_id: str, color: str, t: Tokens | None = None) -> str:
    """Emit the canonical `<marker>` string so authors paste a correct-by-construction arrowhead
    (the `markerUnits="userSpaceOnUse"` fix that renders the head at figure scale) instead of
    re-deriving it. `color` should be a connector stroke color from the SVG palette."""
    t = t or load()
    a = t.figure_styles["arrow"]
    return (
        f'<marker id="{marker_id}" viewBox="{a["viewbox"]}" '
        f'markerWidth="{a["marker_wh_px"]}" markerHeight="{a["marker_wh_px"]}" '
        f'refX="{a["refX"]}" refY="{a["refY"]}" orient="{a["orient"]}" '
        f'markerUnits="{a["marker_units"]}">'
        f'<path d="{a["path"]}" fill="{color}"/></marker>'
    )


# ── Figure-semantics projection (INV-SEM) ─────────────────────────────────────────────────────────────
# The house colour LANGUAGE for scientific figures: a thin SEMANTIC-ALIAS layer over the palette. A figure
# author picks a colour BY ROLE ("the governance colour"), not by the render-oriented palette key ("accent").
# Each family aliases a palette reference-token by KEY, so the semantic layer never owns a hex — it points at
# one. `role_to_family()` is the author's forward index; `family_of_hex()` the reverse index the family-budget
# lint leans on; `semantics_check()` asserts the language can't silently collapse two roles onto one colour.


def figure_semantics(t: Tokens | None = None) -> dict:
    """The raw `figure_semantics` block (families + supporting neutrals) — the INV-SEM SSOT."""
    t = t or load()
    return t.raw["figure_semantics"]


def _families(t: Tokens | None = None) -> dict:
    return figure_semantics(t)["families"]


def semantic_families(t: Tokens | None = None) -> frozenset[str]:
    """The closed set of role-family names: {modeling, governance, agent, neutral, failure}."""
    return frozenset(_families(t).keys())


def _family_hexes(fam: dict) -> set[str]:
    """The stroke / emphasis / fill hexes a family owns (lowercased), skipping absent slots."""
    return {fam[k].lower() for k in ("stroke", "emphasis", "fill") if k in fam}


def semantic_hexes(family: str, t: Tokens | None = None) -> frozenset[str]:
    """Every hex (stroke/emphasis/fill, lowercased) owned by one family."""
    return frozenset(_family_hexes(_families(t)[family]))


def role_to_family(t: Tokens | None = None) -> dict[str, str]:
    """Invert each family's `roles` list into the flat {role_word: family} lookup an author (or a lint)
    uses to answer 'is `environment` modeling-green?'."""
    out: dict[str, str] = {}
    for name, fam in _families(t).items():
        for role in fam.get("roles", []):
            out[role] = name
    return out


def family_of_hex(hex_: str, t: Tokens | None = None) -> str | None:
    """Reverse index: which family owns this hex, or None for supporting neutrals / non-family colours.
    The family-budget lint keys off this — a hex that maps to a family must sit in a figure that declares it."""
    h = hex_.lower()
    for name, fam in _families(t).items():
        if h in _family_hexes(fam):
            return name
    return None


def semantics_check(t: Tokens | None = None) -> list[str]:
    """Assert the colour LANGUAGE is well-formed: every family's convenience hex equals its palette
    reference-token (the join-check — the copy beside `*_key` can never drift), and the family STROKE hexes
    are pairwise distinct (so the language can't silently collapse two roles onto one colour). Returns a list
    of problem strings; empty == clean."""
    t = t or load()
    pal = t.palette
    problems: list[str] = []
    fams = _families(t)
    for name, fam in fams.items():
        for slot, key_field in (("stroke", "stroke_key"), ("emphasis", "emphasis_key"), ("fill", "fill_key")):
            if slot not in fam:
                continue
            key = fam.get(key_field)
            if key is None:
                problems.append(f"family {name!r}: has {slot!r} hex but no {key_field!r}")
                continue
            if key not in pal:
                problems.append(f"family {name!r}: {key_field}={key!r} is not a palette key")
                continue
            if fam[slot].lower() != pal[key].lower():
                problems.append(f"family {name!r}: {slot} copy {fam[slot]!r} != palette[{key!r}] {pal[key]!r} "
                                f"(the convenience hex drifted from its reference token)")
    # Pairwise-distinct family stroke hexes — the language must not put two roles on one colour.
    seen: dict[str, str] = {}
    for name, fam in fams.items():
        stroke = fam.get("stroke", "").lower()
        if stroke in seen:
            problems.append(f"families {seen[stroke]!r} and {name!r} share stroke hex {stroke!r} — "
                            f"a colour must not mean two roles")
        else:
            seen[stroke] = name
    return problems


def semantics_table(t: Tokens | None = None) -> str:
    """A one-command role→colour reference so an author drafting a figure need not guess which palette key
    is the governance one."""
    t = t or load()
    lines = ["family        token            stroke     roles"]
    for name, fam in _families(t).items():
        roles = ", ".join(fam.get("roles", []))
        lines.append(f"{name:<13} {fam['token']:<16} {fam.get('stroke',''):<10} {roles}")
    return "\n".join(lines) + "\n"


# ── CLI ─────────────────────────────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["css", "typst", "palette", "figure-styles",
                                    "emit-mermaid", "check-mermaid", "semantics", "check"])
    args = ap.parse_args(argv)
    t = load()
    if args.cmd == "css":
        sys.stdout.write(css_root_block(t))
    elif args.cmd == "typst":
        sys.stdout.write(typst_preamble(t))
    elif args.cmd == "palette":
        sys.stdout.write("\n".join(sorted(svg_palette(t))) + "\n")
    elif args.cmd == "figure-styles":
        sys.stdout.write(json.dumps(figure_styles(t), indent=2) + "\n")
        sys.stdout.write(f"# figure_pad_min() = {figure_pad_min(t)}px\n")
    elif args.cmd == "emit-mermaid":
        emit_mermaid(t)
        sys.stdout.write(f"wrote {MERMAID_CONFIG}\n")
    elif args.cmd == "check-mermaid":
        if not mermaid_is_fresh(t):
            sys.stderr.write("mermaid-config.json is STALE — run: design_tokens.py emit-mermaid\n")
            return 1
        sys.stdout.write("mermaid-config.json is fresh\n")
    elif args.cmd == "semantics":
        sys.stdout.write(semantics_table(t))
    elif args.cmd == "check":
        problems = semantics_check(t)
        if problems:
            sys.stderr.write("figure_semantics is MALFORMED:\n")
            for p in problems:
                sys.stderr.write(f"  {p}\n")
            return 1
        sys.stdout.write("figure_semantics is well-formed — 5 families, hexes match palette keys, distinct\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
