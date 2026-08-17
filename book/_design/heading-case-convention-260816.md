# Heading-case convention + sensor (260816)

The author ratified a book-wide heading convention: **all headings use Title Case.** This note records the
convention and the sensor that checks it. The sensor is `book-models/lint_heading_case.py`; its module
docstring is the fuller design note, and `title_case()` in that module is the **single source of truth** for
the rule — the later normalization pass imports and reuses it rather than reimplementing the casing.

## Status

- **Sensor: landed AUDIT-ONLY** (repo blocking-lint landing discipline, rule #55). It prints every heading
  off Title Case as `current → suggested` plus a count, and **exits 0** — it never gates a build.
- **Normalization: NOT done.** A separate later pass applies the suggestions. The sensor does not modify any
  heading text.

## The convention

- Capitalize the first word, the last word, and every "major" word.
- Lowercase the "minor" words unless first/last — the standard stop-word list, held in ONE constant
  `STOP_WORDS`: `a, an, the, and, but, or, nor, for, so, yet, of, to, in, on, at, by, as, up, off, per, via,
  vs, from, into, with, over, than`.
- Hyphenated compounds: capitalize the first and last part, apply the stop-word rule to interior parts
  ("Model-First", "End-to-End", "Follow-Up").
- Proper nouns / acronyms keep authored casing, via two mechanisms in the sensor:
  1. a **structural** rule — a token that (ignoring edge punctuation) already carries an internal capital or
     is all-caps is FIXED (DocAble, SysML, GenAI, iText, veraPDF, PDF, PDF/UA, AI);
  2. a **`PROPER_NOUNS` allowlist** mapping a lower-cased token to its canonical casing, so a known proper
     noun in the wrong case is normalized to canon rather than flagged as a generic word.
- **Override registry:** `book-models/heading-case-overrides.json` — `{ "heading": "<exact cleaned heading
  text>", "reason": "..." }` for intentional exceptions the algorithm would otherwise flag. Seeded empty.

## The two heading sources (both checked)

1. **Markdown headings** — `^#{1,6} ` lines in `book/part*/*.md` and `book/appendix-*/*.md`. Before casing,
   each is stripped of a leading section number (`N` / `N.N` / `N.N.N`, optional trailing dot) and a trailing
   Pandoc attribute block (`{#anchor}` / `{tag}`).
2. **`book/build_book.py` page-list titles** — the appendix entry titles are the 2nd element of the tuples in
   the module-level `list[tuple[str, str]]` page lists (`_MODEL_PAGES`, `_ENGINEERING_MOVES_PAGES`,
   `_OPERATORS_REFERENCE_PAGES`, `_STACKS`, `_SKILL_RECIPE_PAGES`, `_EVIDENCE_LEDGER_PAGES`). Parsed with the
   `ast` module — no regex over Python source.

## Wiring

`catalog.py build` calls `lint_heading_case.findings()` and prints a `[heading-case] AUDIT-ONLY: … (does not
gate)` line; it does not increment `n_issues`, so the build exit code is unchanged.
