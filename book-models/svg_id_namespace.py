"""Shared SVG id-namespacing for the two book renderers (catalog.py + book/build_book.py).

When a figure's `<svg>` is spliced INLINE into a page, its internal ids must be prefixed so a figure's
node / marker / title id cannot collide with a same-page heading slug or a sibling figure (a duplicate
element id fails the no-dup-id gate). Both the catalogue renderer and the book renderer need this move, so
it lives here ONCE — previously each carried its own copy, and they had drifted (the book renderer rewrote
`aria-labelledby` while the catalogue renderer did not, leaving a namespaced figure's aria pointing at the
renamed title ids: a broken reference and an a11y regression). Stdlib-only, matching the clone-and-run
constraint of both tools.

## Why one pass, not one pass per id

The first implementation looped over the SVG's ids and ran three `re.sub` calls per id, each scanning the
whole document: O(ids x len(svg)). Matplotlib-exported figures carry hundreds of ids, so the book build
spent 11.2 s of its 14 s scanning 703 MB of text to rewrite 4.5 MB of SVG (261002 profile). The rewrite
below does ONE scan with a single alternation and decides per match, which is both ~100x faster and
strictly safer: the per-id loop mutated the string it was still scanning, so it depended on processing
longer ids first to avoid double-prefixing an id that happened to be another id's suffix.
"""
from __future__ import annotations

import re

# Every place an internal id can appear: its declaration, a paint/clip reference, a link target, and the
# space-separated id lists in the two aria attributes. The alternatives are mutually exclusive (no input
# can satisfy two at one position), so one left-to-right pass handles them all.
#
# Deliberately NOT anchored tighter than the original per-id patterns, so the rewrite stays
# behaviour-identical: `\bid="` also matches inside `data-id="` / `xml:id="`, and the href alternative
# carries no leading `\b` (it also matches inside `data-href="`). `xlink:href` precedes `href` in the
# alternation so the qualified form wins when both could start at the same offset.
_DECL = re.compile(r'\bid="([^"]+)"')
_REFS = re.compile(
    r'\bid="(?P<decl>[^"]+)"'
    r'|url\(#(?P<url>[^)]*)\)'
    r'|(?P<hattr>xlink:href|href)="#(?P<href>[^"]*)"'
    r'|\b(?P<ariaattr>aria-labelledby|aria-describedby)="(?P<aria>[^"]*)"'
)


def namespace_svg_ids(svg: str, prefix: str) -> str:
    """Prefix every internal id in an inlined SVG with `prefix-`, plus every reference to it: `id="x"`,
    `url(#x)`, `href`/`xlink:href="#x"`, and the space-separated id lists in `aria-labelledby` /
    `aria-describedby`. Returns the rewritten SVG (unchanged if it carries no ids).

    A reference whose target is not a declared id in THIS SVG is left alone — an external `href="#foo"`
    into the surrounding page must keep pointing at the page, not at a figure-local name that does not
    exist."""
    ids = set(_DECL.findall(svg))
    if not ids:
        return svg

    def _rewrite(m: "re.Match[str]") -> str:
        decl = m.group("decl")
        if decl is not None:
            return f'id="{prefix}-{decl}"' if decl in ids else m.group(0)
        url = m.group("url")
        if url is not None:
            return f"url(#{prefix}-{url})" if url in ids else m.group(0)
        href = m.group("href")
        if href is not None:
            return f'{m.group("hattr")}="#{prefix}-{href}"' if href in ids else m.group(0)
        toks = " ".join(f"{prefix}-{t}" if t in ids else t for t in m.group("aria").split())
        return f'{m.group("ariaattr")}="{toks}"'

    return _REFS.sub(_rewrite, svg)
