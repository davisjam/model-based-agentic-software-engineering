"""LINT `canonical-vocab` — enforce the book's canonical vocabulary in the narrative chapters.

The book settled on a house term for its central artifact: a **structured model** (structured data),
not a *typed model* (typed data). "Typed" is fine where it is technically load-bearing — a typed enum, a
typed step, a reference to a type system — so this is NOT a blanket "typed" ban. It targets exactly the
2-word phrases that name the MBSE artifact, where the house term now applies.

The rule is mechanized so the settled term cannot silently drift back: this lint dogfoods the book's own
audit-to-lint discipline (a recurring wording slip becomes a check, not a re-read).

SINGLE SOURCE OF TRUTH.  `DEPRECATED_VOCAB` maps each deprecated phrase to its canonical replacement. A
future term-shift is one new row here — the regexes and the report are derived from it, so the map is the
only thing an author edits.

SCOPE.  The book's numbered narrative body chapters (`book/part*/`). Deliberately excluded, each for a
reason the reader can state:
  * Figure SVGs under `book/assets/` — hand-authored assets with their own established node labels,
    governed by the figure lints; a label change is a figure edit, not a prose edit.
  * The appendix reference fills (`book/appendix-*/`) — these mirror catalogue mechanism entries, whose
    lexicon RESERVES "typed model / typed data" as a canonical compound; the book adopts that vocabulary
    verbatim there.
  * Front / back matter — narrative that connects to the same catalogue lexicon.

ESCAPE.  A genuine exception (a deliberate contrast, a quotation) suppresses with a same-line comment
`<!-- noqa: canonical-vocab — <reason> -->` (or `# noqa: canonical-vocab — <reason>`). A reason token
after the em-dash or whitespace-flanked hyphen is REQUIRED — a bare `noqa: canonical-vocab` does not
suppress.

LANDING: BLOCKING in `catalog.py validate` — a fix-wave drove the tree to 0 findings before the flip
(the repo's blocking-lint landing discipline: audit-only-first only while findings remain).

    python3 book-models/lint_canonical_vocab.py            # print findings (exit 1 on any)
    python3 book-models/lint_canonical_vocab.py --list     # print the DEPRECATED->CANONICAL map
"""
from __future__ import annotations

import argparse
import os
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
BOOK = HERE.parent / "book"

# ── SINGLE SOURCE OF TRUTH ────────────────────────────────────────────────────────────────────────
# Deprecated 2-word phrase -> canonical replacement. Add a row to shift a term; the regex + report follow.
DEPRECATED_VOCAB: dict[str, str] = {
    "typed model": "structured model",
    "typed data": "structured data",
}

# The scanned scope: the numbered narrative body chapters (Parts 1–6) plus the top-level Conclusion —
# real narrative held to the house term. Front matter, the terminal back matter apparatus (`backmatter/` —
# About-the-Author, Colophon), appendix fills, and figure SVGs are out of scope (see the module docstring).
_PART_GLOBS = ("part*/*.md", "conclusion/*.md")

# `backmatter/` (About-the-Author, Colophon) is apparatus, not narrative argument, so it stays out of scope —
# the terminal book-object pages the reader meets after the argument is over.
_EXCLUDED_PART_DIRS = ("backmatter",)

# A deprecated phrase is matched as its two words joined by whitespace (so the hyphenated slug form
# `typed-model` in a `<!-- point: … -->` id is NOT a hit), case-insensitive, with an optional plural on
# the trailing noun and a leading/trailing word boundary. Built from DEPRECATED_VOCAB so the map stays sole.
def _phrase_re(phrase: str) -> re.Pattern[str]:
    w1, w2 = phrase.split()
    return re.compile(rf"\b{re.escape(w1)}\s+{re.escape(w2)}s?\b", re.IGNORECASE)


_PATTERNS: dict[str, re.Pattern[str]] = {p: _phrase_re(p) for p in DEPRECATED_VOCAB}

# A same-line suppression: `noqa: canonical-vocab` followed by an em-dash or whitespace-flanked hyphen and
# a reason token (at least one non-space char). Mirrors the repo's `# noqa: <name> — <reason>` convention.
_NOQA_RE = re.compile(r"noqa:\s*canonical-vocab\s*(?:—|\s-\s)\s*\S")


def _chapter_files() -> list[pathlib.Path]:
    return sorted(p for g in _PART_GLOBS for p in BOOK.glob(g)
                  if p.parent.name not in _EXCLUDED_PART_DIRS)


def findings() -> list[str]:
    """Every (file, line) where a deprecated phrase appears un-suppressed, as a formatted message. Scans
    the SOURCE markdown line by line (never the generated HTML)."""
    out: list[str] = []
    for path in _chapter_files():
        rel = os.path.relpath(path, BOOK.parent)
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if _NOQA_RE.search(line):
                continue
            for phrase, pat in _PATTERNS.items():
                if pat.search(line):
                    out.append(f"{rel}:{i}: deprecated {phrase!r} — say "
                               f"{DEPRECATED_VOCAB[phrase]!r} (the book's canonical term)")
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--list", action="store_true", help="print the DEPRECATED->CANONICAL map and exit")
    args = ap.parse_args(argv)
    if args.list:
        print("== canonical-vocab — DEPRECATED -> CANONICAL (single source of truth) ==")
        for dep, canon in DEPRECATED_VOCAB.items():
            print(f"  {dep!r} -> {canon!r}")
        return 0
    fs = findings()
    print(f"== canonical-vocab — house-term enforcement over {', '.join(_PART_GLOBS)} [BLOCKING] ==")
    if not fs:
        print(f"  clean — {len(DEPRECATED_VOCAB)} deprecated phrase(s) watched; none appear un-suppressed")
        return 0
    print(f"  {len(fs)} finding(s):")
    for f in fs:
        print(f"    {f}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
