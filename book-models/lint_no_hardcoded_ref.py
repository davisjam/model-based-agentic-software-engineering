"""LINT `no-hardcoded-ref` — a cross-reference in the narrative names its target SYMBOLICALLY, never by a
literal number or letter typed into the prose.

The book resolves every cross-reference at build time from a stable id: a Part by `{{part:N}}`, a figure or
table by `[ref:<label>]`, an appendix by `[appendix:<slug>]`. The rendered letter/number is DERIVED — so a
renumber (a re-lettering of the appendices, a chapter that moves) updates every reference with no prose
edit. A letter or number typed straight into a sentence ("see Appendix E", "in Figure 3-1") defeats that:
it silently rots the moment the target moves. This check flags the literal forms so the author reaches for
the symbolic marker instead.

Flagged literal patterns (in running prose):
  * `Appendix <A-Z>`      → use `[appendix: <page-slug>]`   (resolves to "Appendix <letter>" + link)
  * `Chapter <N>`         → use a descriptive link to the chapter page
  * `Figure/Table <N-N>`  → use `[ref: <label>]`            (a chapter-relative float locator)
  * `§<N>`                → use `[ref: <label>]` or a descriptive link

Scope — the authored book prose that ships as narrative: front/back matter, the five parts, and the
authored appendix content (fills, stacks, the skill recipe). The `book/_design/` design docs are NOT book
prose and are out of scope. Build directives are skipped: fenced code blocks and HTML comments (the
`<!-- part-title: Appendix E … -->` / `<!-- figure: … -->` metadata that DEFINES a target names it by
letter legitimately) and inline code spans are stripped before matching, with line numbers preserved.

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

# The authored-prose dirs that ship as book narrative. `book/_design/` (design docs) is excluded by omission.
PROSE_DIRS = (
    "frontmatter", "part1", "part2", "part3", "part4", "part5", "part6", "conclusion", "backmatter",
    "appendix-fills", "appendix-stacks", "appendix-skill-recipe",
)

# ── The literal cross-reference patterns a symbolic marker should replace ─────────────────────────────
# Each (name, regex, remedy) is a class of hardcoded reference. `Appendix <L>` matches a lone capital letter
# (a word boundary after it), so "Appendix Explains…" (a capital word) does NOT trip. `Figure/Table` require
# a chapter-relative `N-N`/`N.N` locator, so a bare "Figure" in prose is fine — only a typed float NUMBER is
# a finding. `Chapter <N>` and `§<N>` catch the numeric forms.
_PATTERNS: tuple[tuple[str, re.Pattern[str], str], ...] = (
    ("appendix", re.compile(r"\bAppendix\s+[A-Z]\b"),
     "use `[appendix: <page-slug>]` (the letter resolves at build)"),
    ("chapter", re.compile(r"\bChapter\s+[0-9]+"),
     "use a descriptive markdown link to the chapter page"),
    ("float", re.compile(r"\b(?:Figure|Table)\s+[0-9]+[.\-][0-9]"),
     "use `[ref: <label>]` (a chapter-relative float locator)"),
    ("section", re.compile(r"§\s?[0-9]"),
     "use `[ref: <label>]` or a descriptive link"),
)

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
    out: list[pathlib.Path] = []
    for d in PROSE_DIRS:
        dp = BOOK / d
        if dp.is_dir():
            # `_`-prefixed files are build-support opening prose (front-door openings lifted out of the
            # build tool), not chapter/appendix content pages — skip them here.
            out.extend(sorted(p for p in dp.glob("*.md") if not p.name.startswith("_")))
    return out


def findings() -> list[Finding]:
    """Every (file, line) where a literal cross-reference appears un-suppressed. Scans the SOURCE markdown,
    with fenced code / HTML comments blanked and inline code stripped per line; the raw line supplies the
    `noqa` check (a suppression token lives in the raw text)."""
    out: list[Finding] = []
    for path in _prose_files():
        rel = os.path.relpath(path, BOOK.parent)
        raw_lines = path.read_text(encoding="utf-8").splitlines()
        scrubbed_lines = _scrub("\n".join(raw_lines)).splitlines()
        for i, (raw, scrubbed) in enumerate(zip(raw_lines, scrubbed_lines), 1):
            if _NOQA_RE.search(raw):
                continue
            probe = _INLINE_CODE_RE.sub(" ", scrubbed)
            for kind, pat, remedy in _PATTERNS:
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
    print(f"== no-hardcoded-ref — symbolic cross-references over {len(PROSE_DIRS)} prose dirs [BLOCKING] ==")
    if not fs:
        print("  clean — every cross-reference is a symbolic marker (or a justified noqa)")
        return 0
    print(f"  {summary_line(fs)}:")
    for f in sorted(fs, key=lambda x: (x.file, x.line)):
        print(f"    {f.file}:{f.line}: [{f.kind}] literal {f.text!r} — {f.remedy}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
