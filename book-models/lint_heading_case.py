"""LINT `heading-case` — the headings-are-Title-Case SENSOR over the book's two heading sources.

The author has ratified a heading convention for DISPLAY headings — `#` chapter titles and `##` sections
(x.y.z): they use **Title Case** — first word, last word, and every "major" word capitalized; the short
"minor" words (articles, coordinating conjunctions, short prepositions) lowercased unless they fall first or
last. A `###`+ fourth-level heading is a RUN-IN naming an expository subtopic; run-ins read as sentence-case
inline lead-ins, not Title Case, and are EXEMPT (author-ratified 260821). This lint is the SENSOR that
CHECKS the Title-Case convention on display headings, and for each violation emits the SUGGESTED Title-Case form
(`current → suggested`). It is the constraint/sensor thesis applied to prose: the convention is the rule an
author aims for, this is the smoke detector that catches the heading that drifted.

The corpus was normalized to the ratified convention by a one-shot pass that applied `title_case()` across
both heading sources, so the sensor now reads **clean** and lands **BLOCKING** — a heading off Title Case
increments `catalog.py validate`'s issue count and this CLI exits 1. That normalization pass reused
`title_case()` from this module (it does NOT modify headings itself) — `title_case()` is the single source
of truth for the casing rule, and this file is its design note. Genuine code-identifier / proper-noun
exceptions the algorithm cannot express are parked in `heading-case-overrides.json`.

── THE CONVENTION (what `title_case()` encodes) ──────────────────────────────────────────────────────────
  * Capitalize the first word, the last word, and every major word.
  * Lowercase the minor words unless first/last — the standard stop-word list lives in ONE constant,
    `STOP_WORDS` (a, an, the, and, but, or, nor, for, so, yet, of, to, in, on, at, by, as, up, off, per,
    via, vs, from, into, with, over, than).
  * Hyphenated compounds: capitalize the first and last part; apply the stop-word rule to interior parts
    ("Model-First", "End-to-End", "Follow-Up").
  * Proper nouns / acronyms keep their authored casing. Two mechanisms preserve them:
      1. a structural rule — a token that (ignoring edge punctuation) already carries an INTERNAL capital or
         is entirely upper-case is treated as FIXED (DocAble, SysML, GenAI, iText, veraPDF, PDF, PDF/UA, AI);
      2. an ALLOWLIST constant (`PROPER_NOUNS`) mapping a lower-cased token to its canonical casing, so a
         known proper noun authored in the wrong case is normalized TO the canon rather than flagged as a
         generic word (e.g. "genai" → "GenAI", "redis" → "Redis").
  * Override registry: `book-models/heading-case-overrides.json` — a list of
    `{ "heading": "<exact current heading text>", "reason": "<why>" }` for genuinely intentional exceptions
    the algorithm would otherwise flag. A heading whose cleaned text matches an override is never reported.

── THE TWO HEADING SOURCES (both checked) ────────────────────────────────────────────────────────────────
  1. Markdown headings — `^#{1,6} ` lines in `book/part*/*.md` and `book/appendix-*/*.md`. Before casing,
     each is stripped of a leading section number (`N` / `N.N` / `N.N.N` with optional trailing dot) and a
     trailing Pandoc attribute block (`{#anchor}` / `{tag}`) and any ATX closing `#`s.
  2. `book/build_book.py` page-list titles — the appendix ENTRY titles live as the 2nd tuple element in the
     module-level `_*_PAGES` / `_STACKS` lists annotated `list[tuple[str, str]]` (`_MODEL_PAGES`,
     `_ENGINEERING_MOVES_PAGES`, `_OPERATORS_REFERENCE_PAGES`, `_STACKS`, `_SKILL_RECIPE_PAGES`,
     `_EVIDENCE_LEDGER_PAGES`). Parsed with the `ast` module (no regex over Python source), each title
     checked and reported as `build_book.py:<line> _LIST`.

LANDING: BLOCKING (audit -> drain -> promote, rule #55) — the normalization wave drained the corpus to 0,
so this sensor now GATES: any finding exits 1 here, and `catalog.py validate` adds the finding count to its
issues. `--strict` is retained as a no-op alias (blocking is now the default behavior).

    python3 book-models/lint_heading_case.py            # print findings; exit 1 on any finding (blocking)
    python3 book-models/lint_heading_case.py --strict   # same as default (retained alias)
"""
from __future__ import annotations

import argparse
import ast
import json
import pathlib
import re
import sys
from dataclasses import dataclass

HERE = pathlib.Path(__file__).resolve().parent
BOOK = HERE.parent / "book"
BUILD_BOOK = BOOK / "build_book.py"
OVERRIDES_PATH = HERE / "heading-case-overrides.json"

# The standard Title-Case stop-word list — the "minor" words lowercased unless first/last. ONE constant.
STOP_WORDS: frozenset[str] = frozenset({
    "a", "an", "the",
    "and", "but", "or", "nor", "for", "so", "yet",
    "of", "to", "in", "on", "at", "by", "as", "up", "off", "per", "via", "vs",
    "from", "into", "with", "over", "than",
})

# Proper-noun / acronym ALLOWLIST: lower-cased token → canonical casing. The structural internal-capital /
# all-caps test (`_is_fixed`) already preserves most proper nouns automatically; this map exists so a KNOWN
# proper noun authored in the wrong case is normalized to its canon (not merely capitalized as a plain word),
# and to document the book's vocabulary. Multi-word names (Cloud Run) are single tokens per word — each word
# is listed. Extend as new proper nouns appear.
PROPER_NOUNS: dict[str, str] = {
    "mage": "MAGE", "docable": "DocAble", "sysml": "SysML", "cad": "CAD", "ecu": "ECU",
    "genai": "GenAI", "pdf": "PDF", "vpat": "VPAT", "wcag": "WCAG", "pdf/ua": "PDF/UA",
    "svg": "SVG", "mbse": "MBSE", "ai": "AI", "se": "SE", "llm": "LLM", "mcp": "MCP",
    "diátaxis": "Diátaxis", "leveson": "Leveson", "kumar": "Kumar", "redis": "Redis",
    "postgres": "Postgres", "cloud": "Cloud", "run": "Run", "itext": "iText",
    "openxml": "OpenXml", "verapdf": "veraPDF", "gof": "GoF", "docx": "DOCX", "pptx": "PPTX",
    "xlsx": "XLSX", "html": "HTML", "css": "CSS", "json": "JSON", "api": "API", "cli": "CLI",
    "ocr": "OCR", "tla": "TLA", "adatool": "ADATool", "sapir–whorf": "Sapir–Whorf",
}

# A leading section number: N / N.N / N.N.N ... with an optional trailing dot, then whitespace. Not a "word".
_SECNUM_RE = re.compile(r"^\d+(?:\.\d+)*\.?\s+")
# A trailing Pandoc attribute block: {#anchor} or {tag}. Also strip trailing ATX close `#`s.
_ATTR_RE = re.compile(r"\s*\{[^}]*\}\s*$")
_ATX_CLOSE_RE = re.compile(r"\s+#+\s*$")
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")


# ── the casing rule (single source of truth) ──────────────────────────────────────────────────────────────

def _split_affix(token: str) -> tuple[str, str, str]:
    """Peel leading/trailing non-alphanumeric punctuation off a token, keeping the core to re-attach.
    Internal punctuation (apostrophes, hyphens) stays in the core."""
    i = 0
    while i < len(token) and not token[i].isalnum():
        i += 1
    j = len(token)
    while j > i and not token[j - 1].isalnum():
        j -= 1
    return token[:i], token[i:j], token[j:]


def _is_fixed(core: str) -> bool:
    """A token whose authored casing must be preserved: an acronym (all-caps, len>1) or a CamelCase/internal-
    capital proper noun (iText, DocAble, GenAI, veraPDF, PDF/UA)."""
    letters = [c for c in core if c.isalpha()]
    if len(letters) > 1 and all(c.isupper() for c in letters):
        return True
    return any(c.isupper() for c in core[1:])


def _cap(word: str) -> str:
    """Capitalize the first alphabetic char, lower-case the rest. (Fixed/allowlisted tokens never reach here.)"""
    for idx, ch in enumerate(word):
        if ch.isalpha():
            return word[:idx] + ch.upper() + word[idx + 1:].lower()
    return word


def _case_part(part: str, is_first: bool, is_last: bool) -> str:
    """Case one word (or one hyphen-part), honoring allowlist, fixed-token, and the first/last/stop-word rule."""
    if not part:
        return part
    canon = PROPER_NOUNS.get(part.lower())
    if canon is not None:
        return canon
    if _is_fixed(part):
        return part
    if is_first or is_last:
        return _cap(part)
    if part.lower() in STOP_WORDS:
        return part.lower()
    return _cap(part)


def _case_token(token: str, is_first: bool, is_last: bool) -> str:
    """Case a whitespace-delimited token, preserving edge punctuation and handling hyphenated compounds."""
    lead, core, trail = _split_affix(token)
    if not core:
        return token
    # Allowlist / fixed acronym decided on the whole core first (so "PDF/UA", "GenAI" stay whole).
    canon = PROPER_NOUNS.get(core.lower())
    if canon is not None:
        return lead + canon + trail
    if _is_fixed(core):
        return token
    if "-" in core:
        parts = core.split("-")
        n = len(parts)
        cased = [_case_part(p, is_first=(i == 0), is_last=(i == n - 1)) for i, p in enumerate(parts)]
        return lead + "-".join(cased) + trail
    return lead + _case_part(core, is_first, is_last) + trail


def title_case(heading: str) -> str:
    """Return the Title-Case form of a CLEAN heading (no section number, no `{anchor}`). SINGLE SOURCE OF
    TRUTH for the rule — the later normalization pass imports and reuses this, so it is never reimplemented.

    Splits on whitespace, cases each token by position (first/last/major/minor), preserves proper nouns and
    acronyms, and lower-cases interior stop-words. Idempotent: `title_case(title_case(s)) == title_case(s)`.
    """
    tokens = heading.split()
    if not tokens:
        return heading
    n = len(tokens)
    out = [_case_token(tok, is_first=(i == 0), is_last=(i == n - 1)) for i, tok in enumerate(tokens)]
    return " ".join(out)


def clean_heading(raw: str) -> str:
    """Strip a heading's non-word decoration before casing: leading section number, trailing `{attr}` block,
    trailing ATX `#`s. Returns the cased-against text (the `current` shown in findings)."""
    text = _ATTR_RE.sub("", raw).strip()
    text = _ATX_CLOSE_RE.sub("", text).strip()
    text = _SECNUM_RE.sub("", text).strip()
    return text


# ── findings ──────────────────────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Finding:
    source: str        # "markdown" | "page-list"
    loc: str           # "book/part1/1.1-x.md:12" | "book/build_book.py:3545 _MODEL_PAGES"
    current: str
    suggested: str


def _load_overrides() -> set[str]:
    if not OVERRIDES_PATH.is_file():
        return set()
    data = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    return {row["heading"] for row in data.get("overrides", []) if "heading" in row}


def _rel(path: pathlib.Path) -> str:
    try:
        return str(path.relative_to(BOOK.parent))
    except ValueError:
        return str(path)


def _markdown_findings(overrides: set[str]) -> list[Finding]:
    out: list[Finding] = []
    md_files = sorted(BOOK.glob("part*/*.md")) + sorted(BOOK.glob("appendix-*/*.md"))
    for path in md_files:
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            m = _HEADING_RE.match(line)
            if not m:
                continue
            # The Title-Case convention governs DISPLAY headings — `#` chapter title and `##` section
            # (x.y.z). A `###`+ heading is a fourth-level RUN-IN naming an expository subtopic; run-ins read
            # as sentence-case inline lead-ins ("The productivity answer is incomplete"), not Title Case, so
            # they are exempt. (Author-ratified 260821: level-4 run-ins are sentence-case.)
            if len(m.group(1)) >= 3:
                continue
            current = clean_heading(m.group(2))
            if not current or current in overrides:
                continue
            suggested = title_case(current)
            if suggested != current:
                out.append(Finding("markdown", f"{_rel(path)}:{lineno}", current, suggested))
    return out


def _page_list_findings(overrides: set[str]) -> list[Finding]:
    """Parse `build_book.py` for module-level `list[tuple[str, str]]` assignments (the page/stack title lists)
    with the `ast` module and check each title (the 2nd tuple element). No regex over Python source."""
    out: list[Finding] = []
    if not BUILD_BOOK.is_file():
        return out
    tree = ast.parse(BUILD_BOOK.read_text(encoding="utf-8"))
    for node in tree.body:  # module-level only
        if not isinstance(node, ast.AnnAssign) or not isinstance(node.target, ast.Name):
            continue
        if ast.unparse(node.annotation) != "list[tuple[str, str]]":
            continue
        if not isinstance(node.value, ast.List):
            continue
        listname = node.target.id
        for elt in node.value.elts:
            if not isinstance(elt, ast.Tuple) or len(elt.elts) < 2:
                continue
            title_node = elt.elts[1]
            if not (isinstance(title_node, ast.Constant) and isinstance(title_node.value, str)):
                continue
            current = clean_heading(title_node.value)
            if not current or current in overrides:
                continue
            suggested = title_case(current)
            if suggested != current:
                loc = f"{_rel(BUILD_BOOK)}:{title_node.lineno} {listname}"
                out.append(Finding("page-list", loc, current, suggested))
    return out


def findings() -> list[Finding]:
    overrides = _load_overrides()
    return _markdown_findings(overrides) + _page_list_findings(overrides)


def summary_line(fs: list[Finding]) -> str:
    n_md = sum(1 for f in fs if f.source == "markdown")
    n_pl = sum(1 for f in fs if f.source == "page-list")
    return f"{len(fs)} heading(s) off Title Case — markdown={n_md}, page-lists={n_pl}"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--strict", action="store_true",
                    help="retained no-op alias — blocking (exit 1 on any finding) is now the default")
    ap.parse_args(argv)
    fs = findings()
    print("== heading-case — Title-Case sensor over markdown + build_book.py page-lists [BLOCKING (exit 1 on "
          "any finding)] ==")
    print(f"  stop-words: {len(STOP_WORDS)} · proper-noun allowlist: {len(PROPER_NOUNS)} · "
          f"overrides: {len(_load_overrides())}")
    if not fs:
        print("  clean — every heading is Title Case")
        return 0
    print(f"  {summary_line(fs)}:")
    for f in fs:
        print(f'    {f.loc}\n      "{f.current}" → "{f.suggested}"')
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
