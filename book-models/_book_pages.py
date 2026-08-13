"""Shared book-page resolver for the declared book-models validators.

The book's chapter pages live under `book/<subdir>/<N>.<M>-slug.md`. Two declared models resolve a
`page_slug` against that set — the metrics dashboard (`defined_in.page_slug`) and the metaphor-spans
model (`introduced_at`/`pays_off_at.page_slug`). This module is the single derivation both consume, per
the extract-on-the-second-site rule: the page-slug set lives in ONE place, so a chapter added or renamed
updates every model at once.

`book_page_slugs()` — every chapter page slug the book currently defines.
`chapter_md_path(page_slug)` — the on-disk `.md` for a slug (or None), for the anchor walk.
`book_dir()` — the `book/` root.
"""
from __future__ import annotations

import os
import re

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)  # the governance-catalog repo root (book-models/ is one level down)
_BOOK = os.path.join(_ROOT, "book")

#: The DISCOVERED chapter-bearing subdirectories, in reading order: the numbered Parts plus the top-level
#: Conclusion (`conclusion/`). The synthetic back matter (`backmatter/` — Colophon, About-the-Author) carries
#: no `N.M-` chapter files, so it is not enumerated here (it is assembled after the appendices at build time).
_SUBDIRS = ("frontmatter", "part1", "part2", "part3", "part4", "part5", "part6", "conclusion")

#: A chapter file name is `<N>.<M>-slug.md`.
_CHAPTER_RE = re.compile(r"\d+\.\d+-")


def book_dir() -> str:
    return _BOOK


def book_page_slugs() -> "set[str]":
    """The chapter resolve set for a declared model's chapter reference. DUAL: the numbered file stems
    (`1.1-the-printer`) AND the number-free identity labels (`the-printer`), so both a legacy numbered value
    and a migrated label resolve (the migration to the chapter_identity model is per-model, so a half-migrated
    tree must resolve both). The new canonical reference is the label."""
    slugs: "set[str]" = set()
    for sub in _SUBDIRS:
        d = os.path.join(_BOOK, sub)
        if not os.path.isdir(d):
            continue
        for fn in os.listdir(d):
            if fn.endswith(".md") and _CHAPTER_RE.match(fn):
                slugs.add(fn[:-3])
    import chapter_identity_model as chapter_identity  # noqa: E402 — sibling book-model
    slugs |= chapter_identity.labels()
    return slugs


def chapter_md_path(page_slug: str) -> "str | None":
    """The on-disk `.md` path for a chapter reference, or None if it names no chapter. Accepts EITHER a
    number-free identity label (resolved via chapter_identity.filename — the new canonical form) OR a legacy
    numbered file stem (globbed across the chapter subdirs). Used to walk a chapter's anchors."""
    import chapter_identity_model as chapter_identity  # noqa: E402 — sibling book-model
    if page_slug in chapter_identity.labels():
        p = os.path.join(_BOOK, chapter_identity.filename(page_slug))
        return p if os.path.isfile(p) else None
    for sub in _SUBDIRS:
        p = os.path.join(_BOOK, sub, f"{page_slug}.md")
        if os.path.isfile(p):
            return p
    return None
