"""LINT `appendix-b-note-word-cap` — an authored Appendix-B Flagship-Mechanism note must fit its declared
spread's word budget.

THE EARLY SENSOR.  Each authored note under `book/appendix-notes/<slug>.md` declares a keep-together spread
via `<!-- note-spread: N -->` (N = 1 or 2). The real invariant is the keep-together renderer's rendered-height
assertion in the PDF build — a panel that overflows its page fails the Typst compile (§13.6). That assertion
is exact but LATE: you only see it after a full render. This lint is the cheap, EARLY sensor: it counts the
note's prose words and flags one that has outgrown its spread's budget before the PDF reveals a bad break.

WHAT COUNTS.  Prose only. Fenced code blocks (the leading Structure Mermaid a note may carry) and
HTML-comment directives (`<!-- note-spread -->`, `<!-- note-fold -->`) do NOT count — they are figures and
markers, not the running text that fills a page. A `spread: 2` note is measured as ONE budget across both its
panels (the fold splits layout, not the word count).

WHY WORD-COUNT IS ONLY A SENSOR.  Figures, headings, lists, and captions distort a words→height estimate, so
a green word count does not PROVE the note fits — the rendered-height assertion does. A red word count is a
reliable EARLY warning; a green one is a "probably fits, confirm in the PDF" (§13.6, the feedback's "rendered
height is the actual invariant" note).

LANDS AUDIT-ONLY (the repo's blocking-lint landing discipline).  It PRINTS findings and exits 0, so it never
reddens a commit; `--strict` exits 1 on any finding, the flip a follow-up wires in once the note corpus is
stable. Run `python3 book-models/lint_appendix_b_note_word_cap.py` to see the findings.
"""
from __future__ import annotations

import pathlib
import re
import sys

#: The per-spread prose word budgets (§13.6 / restructure §4.2). `spread: 1` targets one printed page,
#: `spread: 2` a two-page fold. Tuned to the page geometry; the rendered-height assertion is the exact gate.
WORD_CAP = {1: 520, 2: 1040}
DEFAULT_SPREAD = 1  #: a note with no `note-spread` directive is measured against the 1-page budget.

_NOTES_DIR = pathlib.Path(__file__).resolve().parent.parent / "book" / "appendix-notes"
_FENCE_RE = re.compile(r"^```")
_COMMENT_LINE_RE = re.compile(r"^\s*<!--.*-->\s*$")
_SPREAD_RE = re.compile(r"<!--\s*note-spread:\s*(\d+)\s*-->")


def _declared_spread(text: str) -> int:
    """The note's declared spread (`<!-- note-spread: N -->`), or `DEFAULT_SPREAD` when none is present."""
    m = _SPREAD_RE.search(text)
    return int(m.group(1)) if m else DEFAULT_SPREAD


def prose_word_count(text: str) -> int:
    """The note's running-prose word count: whitespace-separated tokens outside fenced code blocks and
    HTML-comment directive lines. Deterministic — a fenced ```…``` block (the Structure Mermaid) and any
    full-line `<!-- … -->` marker are dropped, then the remainder is `split()`-counted."""
    words = 0
    in_fence = False
    for line in text.splitlines():
        if _FENCE_RE.match(line.strip()):
            in_fence = not in_fence
            continue
        if in_fence or _COMMENT_LINE_RE.match(line):
            continue
        words += len(line.split())
    return words


def findings() -> "list[str]":
    """Every authored Appendix-B note whose prose word count exceeds its declared spread's budget. No notes
    directory yet (or an empty one) yields no findings — the prototype ships a handful of notes and the
    fan-out fills the rest."""
    out: "list[str]" = []
    if not _NOTES_DIR.is_dir():
        return out
    for path in sorted(p for p in _NOTES_DIR.glob("*.md") if not p.name.startswith("_")):
        text = path.read_text(encoding="utf-8")
        spread = _declared_spread(text)
        cap = WORD_CAP.get(spread, WORD_CAP[DEFAULT_SPREAD])
        n = prose_word_count(text)
        if n > cap:
            out.append(f"NOTE-TOO-LONG {path.name} — {n} prose words over the spread:{spread} budget "
                       f"(cap {cap}); tighten the note or split it to a wider spread")
    return out


def main(argv: "list[str]") -> int:
    strict = "--strict" in argv[1:]
    fs = findings()
    mode = "STRICT (exit 1 on any finding)" if strict else "AUDIT-ONLY (prints, exits 0)"
    print(f"== appendix-b-note-word-cap — each note within its spread's word budget "
          f"(1pp≤{WORD_CAP[1]}, 2pp≤{WORD_CAP[2]}) [{mode}] ==")
    n_notes = len([p for p in _NOTES_DIR.glob("*.md") if not p.name.startswith("_")]) if _NOTES_DIR.is_dir() else 0
    if not fs:
        print(f"  clean — {n_notes} authored note(s), each within its spread budget")
        return 0
    print(f"  {len(fs)} finding(s) across {n_notes} authored note(s):")
    for f in fs:
        print(f"    {f}")
    return 1 if strict else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
