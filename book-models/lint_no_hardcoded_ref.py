"""LINT `no-hardcoded-ref` — a cross-reference in the narrative names its target SYMBOLICALLY, never by a
literal number or letter typed into the prose.

The book resolves every renumber-prone cross-reference at build time from a stable id: a figure or
table by `[ref:<label>]`, an appendix by `[appendix:<slug>]`, a CHAPTER by `{{chapter:<label>}}` and a
SECTION by `{{sec:<label>}}` (both resolve a frozen identity → its number at build). The rendered
letter/number is DERIVED — so a reorder (a re-lettering of the appendices, a float that moves, a chapter
renumber) updates every reference with no prose edit. A letter or number typed straight into a sentence
("see Appendix E", "in Figure 3-1", "Chapter 4 showed", "§6.3 argued") defeats that: it silently rots the
moment the target moves. This check flags the literal forms so the author reaches for the symbolic marker
instead.

Flagged literal patterns (in running prose):
  * `Appendix <A-Z>`         → use `[appendix: <page-slug>]`   (resolves to "Appendix <letter>" + link)
  * `Figure/Table <N-N>`     → use `[ref: <label>]`            (a section-relative float locator)
  * `Chapter(s)/Ch(s). <N>`  → use `{{chapter: <label>}}`      (the number resolves from _CHAPTER_LABELS)
  * `§<N>` / `Section(s)/Sect(s). <N>` → use `{{sec: <label>}}` (the locator resolves from chapter_identity)

The chapter/section FAMILIES here are kept in parity with the SE Handbook's own hardcoded-number lint
(`handbook/scripts/lint.py`) by the cross-book corpus test in `catalog_tests.py`
(`check_hardcoded_ref_parity`, in `tests/book_models.py`): a literal family added to one book's ban must be
added to the other. The two lints stay SEPARATE (a text scan here vs. the Handbook's AST scan over a
different tree); the test holds the shared vocabulary without merging them.

Scope — the authored book prose that ships as narrative. Chapter/section references proliferate across
EVERY narrative + appendix page (including the `_`-prefixed opening prose), so those two patterns scan the
full set. The appendix-letter / figure-number patterns keep the original narrative scope (their drain in
the extra appendix dirs is a separate follow-up). `book/_design/` design docs are NOT book prose and are
out of scope. Build directives are skipped: fenced code blocks and HTML comments (the `<!-- part-title:
Appendix E … -->` / `<!-- figure: … -->` metadata that DEFINES a target names it by letter legitimately;
and `<!-- point: … -->` texts, read raw by the outline/spine models, keep their literal numbers) and
inline code spans are stripped before matching, with line numbers preserved.

Escape — `# noqa: no-hardcoded-ref — <reason>` (or `<!-- noqa: no-hardcoded-ref — <reason> -->`) on the
same line, for a genuine exception: quoting a source that uses the literal, or a deliberate non-link
mention. A reason token after the em-dash (or whitespace-flanked hyphen) is REQUIRED.

    python3 book-models/lint_no_hardcoded_ref.py            # print findings (exit 1 on any) [BLOCKING]
"""
from __future__ import annotations

import argparse
import os
import pathlib
import re
from dataclasses import dataclass

HERE = pathlib.Path(__file__).resolve().parent
BOOK = HERE.parent / "book"

# LEGACY scope — the narrative dirs the appendix-letter / figure-number patterns govern (unchanged: their
# drain in the extra appendix dirs is a separate follow-up). `book/_design/` (design docs) excluded by omission.
LEGACY_DIRS = (
    "frontmatter", "part1", "part2", "part3", "part4", "part5", "part6", "conclusion", "backmatter",
    "appendix-fills", "appendix-stacks", "appendix-skill-recipe",
)
# Back-compat alias (external callers may import PROSE_DIRS).
PROSE_DIRS = LEGACY_DIRS

# XREF scope — every shipped narrative + appendix dir (the chapter/section patterns scan the full set,
# `_`-prefixed opening prose included). Appendix dirs are globbed so a new one is covered automatically.
_NARRATIVE_DIRS = ("frontmatter", "part1", "part2", "part3", "interlude", "part4", "part5", "part6",
                   "part7", "conclusion", "backmatter")
XREF_DIRS = _NARRATIVE_DIRS + tuple(sorted(p.name for p in BOOK.glob("appendix-*") if p.is_dir()))

# ── The literal cross-reference patterns a symbolic marker should replace ─────────────────────────────
# Each (name, regex, remedy) is a class of hardcoded reference. `Appendix <L>` matches a lone capital letter
# (a word boundary after it), so "Appendix Explains…" (a capital word) does NOT trip. `Figure/Table` require
# a chapter-relative `N-N`/`N.N` locator, so a bare "Figure" in prose is fine — only a typed float NUMBER is
# a finding (this float family is deliberately NOT shared with the Handbook, which bans a bare "Figure N").
# `chapter` catches the word (singular + span plural) AND the "Ch."/"Chs." abbreviation; `section` catches
# the "§"/"§§" glyph AND the "Section(s)"/"Sect(s)." word — the shared families the parity corpus pins.
_PATTERNS: tuple[tuple[str, re.Pattern[str], str], ...] = (
    ("appendix", re.compile(r"\bAppendix\s+[A-Z]\b"),
     "use `[appendix: <page-slug>]` (the letter resolves at build)"),
    ("float", re.compile(r"\b(?:Figure|Table)\s+[0-9]+[.\-][0-9]"),
     "use `[ref: <label>]` (a section-relative float locator)"),
    ("chapter", re.compile(r"\b(?:Chapters?|Chs?\.)\s+\d"),
     "use {{chapter:<label>}} (the number resolves at build)"),
    ("section", re.compile(r"§+\s*\d|\b(?:Sections?|Sects?\.)\s+\d"),
     "use {{sec:<label>}} (the locator resolves at build)"),
)
# The stable-id patterns that scan the full XREF scope; the rest keep the LEGACY narrative scope.
_XREF_KINDS = frozenset({"chapter", "section"})

# `# noqa: no-hardcoded-ref — <reason>` / `<!-- noqa: no-hardcoded-ref — <reason> -->`. A reason token after
# an em-dash or a whitespace-flanked hyphen is required (a bare `noqa: no-hardcoded-ref` does not suppress).
_NOQA_RE = re.compile(r"noqa:\s*no-hardcoded-ref\s*(?:—|\s-\s)\s*\S")

# Build directives / literal spans stripped before matching (line numbers preserved by blanking to newlines).
_FENCE_RE = re.compile(r"```.*?```", re.S)          # fenced code blocks
_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)       # HTML comments (part-title / figure / index directives)
_INLINE_CODE_RE = re.compile(r"`[^`]*`")            # inline code spans


@dataclass(frozen=True)
class Finding:
    file: str
    line: int
    kind: str
    text: str
    remedy: str


def _blank_span(m: "re.Match[str]") -> str:
    """Replace a stripped span with newlines only, so every following line keeps its original number."""
    return "\n" * m.group(0).count("\n")


def _scrub(text: str) -> str:
    """Blank fenced code + HTML comments so a literal inside a build directive or code sample never trips the
    check; line count is preserved so a finding still cites the right source line."""
    text = _FENCE_RE.sub(_blank_span, text)
    text = _COMMENT_RE.sub(_blank_span, text)
    return text


def _prose_files() -> list[pathlib.Path]:
    """Every scanned source page across the XREF scope. `_`-prefixed opening prose is INCLUDED (it ships
    narrative and carries chapter/section refs); the per-kind gate in `findings()` re-applies the legacy
    `_`-skip to the appendix-letter / figure-number patterns only."""
    out: list[pathlib.Path] = []
    for d in XREF_DIRS:
        dp = BOOK / d
        if dp.is_dir():
            out.extend(sorted(dp.glob("*.md")))
    return out


def findings() -> list[Finding]:
    """Every (file, line) where a literal cross-reference appears un-suppressed. Scans the SOURCE markdown,
    with fenced code / HTML comments blanked and inline code stripped per line; the raw line supplies the
    `noqa` check (a suppression token lives in the raw text). Chapter/section patterns scan the full XREF
    scope; the appendix-letter / figure-number patterns keep the legacy narrative scope and skip
    `_`-prefixed front-door prose (build-support openings, not content pages)."""
    out: list[Finding] = []
    for path in _prose_files():
        rel = os.path.relpath(path, BOOK.parent)
        in_legacy = path.parent.name in LEGACY_DIRS
        is_under = path.name.startswith("_")
        raw_lines = path.read_text(encoding="utf-8").splitlines()
        scrubbed_lines = _scrub("\n".join(raw_lines)).splitlines()
        for i, (raw, scrubbed) in enumerate(zip(raw_lines, scrubbed_lines), 1):
            if _NOQA_RE.search(raw):
                continue
            probe = _INLINE_CODE_RE.sub(" ", scrubbed)
            for kind, pat, remedy in _PATTERNS:
                if kind not in _XREF_KINDS and not (in_legacy and not is_under):
                    continue  # legacy pattern outside its narrative scope (or a `_`-front-door)
                m = pat.search(probe)
                if m:
                    out.append(Finding(rel, i, kind, m.group(0), remedy))
    return out


def summary_line(fs: list[Finding]) -> str:
    return f"{len(fs)} hardcoded cross-reference(s) — make them symbolic markers"


def main(argv: list[str] | None = None) -> int:
    argparse.ArgumentParser(description=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter).parse_args(argv)
    fs = findings()
    print(f"== no-hardcoded-ref — symbolic cross-references over {len(XREF_DIRS)} prose dirs "
          f"({len(LEGACY_DIRS)} in legacy appendix/figure scope) [BLOCKING] ==")
    if not fs:
        print("  clean — every cross-reference is a symbolic marker (or a justified noqa)")
        return 0
    print(f"  {summary_line(fs)}:")
    for f in sorted(fs, key=lambda x: (x.file, x.line)):
        print(f"    {f.file}:{f.line}: [{f.kind}] literal {f.text!r} — {f.remedy}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
