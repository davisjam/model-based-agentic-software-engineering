"""Shared SVG id-namespacing for the two book renderers (catalog.py + book/build_book.py).

When a figure's `<svg>` is spliced INLINE into a page, its internal ids must be prefixed so a figure's
node / marker / title id cannot collide with a same-page heading slug or a sibling figure (a duplicate
element id fails the no-dup-id gate). Both the catalogue renderer and the book renderer need this move, so
it lives here ONCE — previously each carried its own copy, and they had drifted (the book renderer rewrote
`aria-labelledby` while the catalogue renderer did not, leaving a namespaced figure's aria pointing at the
renamed title ids: a broken reference and an a11y regression). Stdlib-only, matching the clone-and-run
constraint of both tools.
"""
from __future__ import annotations

import re


def namespace_svg_ids(svg: str, prefix: str) -> str:
    """Prefix every internal id in an inlined SVG with `prefix-`, plus every reference to it: `id="x"`,
    `url(#x)`, `href`/`xlink:href="#x"`, and the space-separated id lists in `aria-labelledby` /
    `aria-describedby`. Returns the rewritten SVG (unchanged if it carries no ids)."""
    ids = set(re.findall(r'\bid="([^"]+)"', svg))
    if not ids:
        return svg
    for i in sorted(ids, key=len, reverse=True):
        esc = re.escape(i)
        svg = re.sub(rf'\bid="{esc}"', f'id="{prefix}-{i}"', svg)
        svg = re.sub(rf'url\(#{esc}\)', f'url(#{prefix}-{i})', svg)
        svg = re.sub(rf'(xlink:href|href)="#{esc}"', rf'\1="#{prefix}-{i}"', svg)

    def _fix_aria(m: "re.Match[str]") -> str:
        toks = " ".join(f"{prefix}-{t}" if t in ids else t for t in m.group(2).split())
        return f'{m.group(1)}="{toks}"'

    return re.sub(r'\b(aria-labelledby|aria-describedby)="([^"]*)"', _fix_aria, svg)
