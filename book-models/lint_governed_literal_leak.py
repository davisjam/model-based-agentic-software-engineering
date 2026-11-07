"""LINT `governed-literal-leak` — AUDIT-ONLY. Flag a KNOWN governed value (a `metrics.json` displayed
value or a `data-claims.json` `holds[]` literal or a canonical stale word-form) appearing RAW in AUTHORED
book prose, outside a `{{token}}` / `[data:slug]` marker. This is the deterministic mirror image of the
renderer's fail-loud-on-unknown-token: fail-loud-on-known-value-typed-raw.

IT POLICES THE SOURCE, NOT THE PROJECTION. The manuscript is authored in LaTeX; the chapter Markdown is a
generated compatibility view (`tools/mage_latex.py sync`, whose `--check` mode gates staleness at
pre-commit). An earlier shape of this lint globbed `book/part*/*.md` — the generated surface — which cost
it two ways: it could not see a literal an author typed into a `.tex` at all, the appendix chapters were
outside the glob entirely, and the remedy it printed named a line nobody can edit in place, because the
next projection discards the edit. So the scanned set is DERIVED FROM `book/latex/native-sources.json`,
the build's own source-versus-projection declaration, plus the hand-authored Markdown that has no LaTeX
source (`book/appendix-fills/**`, `book/appendix-notes/**` — the builder splices these into the
appendices). Reading the manifest rather than hardcoding a second glob is what keeps the lint and the
build agreeing about which surface an author edits; the hardcoded glob is how the blind spot arose.

LATEX ESCAPING HID HALF THE SITES, so the source text is NORMALIZED before matching (see
`_latex_to_scannable`). `56\\%` and `56%` are one literal and only the second used to match. The landing measurement attributes the
29 findings precisely: 7 were visible to the old projection glob, +16 came from scanning every declared
source (the appendices, chiefly), and +6 came from the `\\%` unescape. Non-rendering `%` comments
are stripped, but the structured `% <!-- … -->` decorator comments are KEPT — their text renders (a
`point:` gloss, a `slogan:`, a `gloss:` definition), and 3 of the measured findings live in one.

WHY THIS SHAPE (the honest-feasibility split, evidence-ledger design §4). The general question — "is this
raw number a governed metric that SHOULD be a token?" — is NOT a deterministic signal (prose is full of
legitimate raw numerals: "three views", "Stage 7", "42 findings"), the same reason the parent method's
queryable-value lint was assessed infeasible. So invert it: do not guess which raw numbers should be
tokens; flag raw numbers that are KNOWN governed values appearing outside a marker. That closes the
RECURRENCE class (a governed value drifting into raw prose — exactly how the 501,094 / forty-seven-fold /
56% drifts happened), not the INVENTION class (a writer typing a brand-new wrong number stays a
human / Final-Opus-DoD check).

DENYLIST (mechanically derived from the ledger at lint time — stable-lint-reads-meta-file):
  * every DISTINCTIVE `metrics.json` displayed value (comma-grouped / decimal / percent / currency) →
    owed token `{{key}}`;
  * every DISTINCTIVE `data-claims.json` `holds[]` literal → owed `[data:slug]`;
  * a curated set of canonical STALE word-forms the design names (forty-seven-fold, two years, …) → the
    token that should replace them.

THE REMEDY IS PER-SITE, NOT PER-LITERAL (ANCHOR-AWARE). A `[data:slug]` marker renders a footnote-style
cross-ref INTO the chapter that reports the datum, so it only reads as a reference from a chapter that is
NOT that one. Inside the anchoring chapter itself — the chapter the claim's `source` names — the marker
would cross-reference its own section, and the finding would close on a nonsense link. So a holds[] leak
is reported two ways: `[data:slug]` when the leak sits in a CONSUMING chapter (a genuine cross-ref), and
"tokenize via metrics.json" when it sits in the ANCHORING chapter, where pinning delegates to the token
registry instead. Both the scanned path and the claim's source chapter are known at lint time, so the
split is deterministic; the chapter path for a `source` label resolves through the chapter-identity
meta-file. A refactor-cost leak in §5.2 was closed the wrong way once by following the unconditional
`[data:]` suggestion, which is what earned this split.
Bare small integers and common single words are deliberately EXCLUDED (they are indistinguishable from
legitimate prose numerals) — that keeps the gate deterministic and low-false-positive, so it can graduate
to BLOCKING once the current sites drain.

LANDS AUDIT-ONLY FIRST (rule-#55 discipline): it finds >0 on the current tree (the D1-D6 raw-literal sites
whose `{{token}}` placeholder insertion is deferred to Part-5 assembly), so it PRINTS but does not gate.
A follow-up promotes it to BLOCKING once the placeholders land and the count drains to 0.

Run `python3 book-models/lint_governed_literal_leak.py` for the full report (always exits 0 — audit-only).
`--survey-escapes` re-measures the LaTeX escaping forms in the authored sources, so the normalization
table below can be re-derived rather than guessed at when the manuscript gains a new one.
"""
from __future__ import annotations

import argparse
import collections
import glob
import json
import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
_BOOK = os.path.join(_ROOT, "book")
_DATA = os.path.join(_BOOK, "data")
#: The build's source-versus-projection declaration. Read at lint time (stable-lint-reads-meta-file), so a
#: chapter added, renamed or migrated to LaTeX enters this lint's scope without a second edit here.
_MANIFEST = os.path.join(_BOOK, "latex", "native-sources.json")

#: Canonical STALE word-forms the evidence-ledger design names as raw-prose leaks, mapped to the token that
#: should carry them. These have no comma/decimal/percent to key off, so they are curated explicitly.
_STALE_WORD_FORMS: "dict[str, str]" = {
    "forty-seven-fold": "{{prod_growth_multiple}}",
    "two years' depth": "{{project_elapsed_period}}",
    "two years": "{{project_elapsed_period}}",
    "low-fifties": "{{missing_model_pilot_percent}}",
    "high-thirties": "{{orphan_after_first_epic}}",
    "a hundred commits a day": "{{commits_per_day}}",
    "a thousand commits a week": "{{commits_per_week}}",
}

#: A metrics/holds value is DISTINCTIVE (worth denylisting) when it carries a thousands-comma, a decimal,
#: a percent, a currency mark, or an explicit x-multiplier / -fold — the shapes a governed quantity takes
#: and a stray prose integer does not.
_DISTINCTIVE_RE = re.compile(r"\d[,.]\d|\d\s*%|\$\s*\d|\d\s*[×x]\b|-fold")

_MARKER_RE = re.compile(r"\{\{[^}]*\}\}|\[data:[^\]]*\]")

#: LaTeX character escapes that hide a governed literal from a plain-text match. MEASURED in the 129
#: declared sources (`--survey-escapes`, 2026-11-06): `\%` 32 occurrences across 6 files, `\$` 14 across 2,
#: `\_` 16 across 3, `\&` 11 across 7, `\#` 5 across 3. The denylist carries 11 percent literals and 6
#: currency literals, so the first two were live blind spots; the rest ride along, same escape family.
_CHAR_ESCAPES = (("\\%", "%"), ("\\$", "$"), ("\\&", "&"), ("\\#", "#"), ("\\_", "_"))

#: `\href{…}` percent-ENCODES a `{{token}}` (`\%7B\%7Bproduct_url\%7D\%7D`), so after the `\%` unescape a
#: live marker reads `%7B%7Bproduct_url%7D%7D` and no longer looks like a marker. Decode it back, or the
#: unescape above turns protected tokens into apparent raw prose. 3 occurrences across 2 files.
_URL_ENCODED_BRACES = (("%7B%7B", "{{"), ("%7D%7D", "}}"))

#: A thin space between digits is a thousands separator (`371\,855` renders as `371,855`). ZERO incidence
#: in the sources today; carried as forward-policing, since normalizing a spacing macro to the character it
#: renders as can only REVEAL a literal, never invent one.
_DIGIT_THIN_SPACE_RE = re.compile(r"(?<=\d)(?:\\,|\\thinspace\b)(?=\d)")

#: The remaining LaTeX spacing forms, all rendering as a space — `~` (non-breaking, which can sit between
#: a figure and its unit in a multi-word literal like `208 commits`), `\,` `\;` `\:` `\!` and `\ `. Also
#: zero digit-adjacent incidence today; same forward-policing rationale.
_SPACING_MACRO_RE = re.compile(r"~|\\[ ,;:!]")

#: An unescaped `%` opens a LaTeX comment. 1,785 of them across all 129 sources — mostly `mage-auto-heading`
#: metadata and the bridge notice, which do not render and must not be scanned.
_COMMENT_RE = re.compile(r"(?<!\\)%")

#: …EXCEPT the structured decorator comments, whose text DOES render (a `point:` gloss becomes a margin
#: note, a `gloss:` an entry in the book's language section). 1,222 of these carry authored prose, 828 of
#: them `point:` glosses, and 3 of the measured findings sit in one — so stripping the whole comment class
#: would blind the lint to exactly the sites the evidence ledger cares most about.
_RENDERED_COMMENT_PREFIX = "% <!--"

#: A code listing shows values as EXAMPLES; a governed literal inside one is a sample, not a claim. Zero
#: denylist hits in these interiors today — forward-policing, and the Markdown analogue of the fenced-code
#: blanking the stray-comment lint already does.
_VERBATIM_BEGIN_RE = re.compile(r"\\begin\{(?:verbatim|lstlisting|minted|Verbatim)\}")
_VERBATIM_END_RE = re.compile(r"\\end\{(?:verbatim|lstlisting|minted|Verbatim)\}")

#: Hand-authored Markdown with NO LaTeX source — the appendix brick fills and flagship notes, which
#: `book/build_book.py` splices into the appendices. These ARE source, so they are scanned. Every
#: `book/part*/` and `book/appendix-*/` chapter `.md` is a declared PROJECTION and is not.
_AUTHORED_MD_GLOBS = ("appendix-fills/**/*.md", "appendix-notes/*.md")

#: An inline code span in Markdown — same "a value shown as code is an example" rule as `verbatim`.
_MD_INLINE_CODE_RE = re.compile(r"`[^`]*`")

#: The LaTeX spelling of the `{{token}}` marker (319 live sites). Blanked for the same reason `_MARKER_RE`
#: blanks `{{…}}`: an already-governed site must not read as a leak. Its argument is a token NAME, so this
#: is structural rather than load-bearing today — but it makes "an already-macro'd value does not trip"
#: a property of the normalizer instead of an accident of how token names are spelled.
_LATEX_MARKER_RE = re.compile(r"\\magevalue\{[^}]*\}")


def _load_json(rel: str) -> dict:
    with open(os.path.join(_DATA, rel), encoding="utf-8") as fh:
        return json.load(fh)


def _is_distinctive(value: str) -> bool:
    return bool(_DISTINCTIVE_RE.search(value))


def _anchor_paths() -> "dict[str, str]":
    """data-claim slug → the repo-relative chapter path its `source` label anchors. Resolved through the
    chapter-identity meta-file, the same map the renderer walks, so a renamed chapter cannot strand this.
    A `source` that names no declared label drops out — the claims model polices that separately."""
    decl_path = os.path.join(_ROOT, "book-models", "chapter_identity_declared.json")
    with open(decl_path, encoding="utf-8") as fh:
        decl = json.load(fh)
    by_label = {c["label"]: "book/" + c["filename"] for c in decl.get("chapters", [])}
    paths: "dict[str, str]" = {}
    for slug, entry in _load_json("data-claims.json").items():
        if slug.startswith("_") or not isinstance(entry, dict):
            continue
        path = by_label.get(entry.get("source", ""))
        if path:
            paths[slug] = path
    return paths


def build_denylist_with_owners() -> "tuple[dict[str, str], dict[str, str]]":
    """`(deny, holds_owner)`. `deny` maps literal → the token/slug that should carry it: distinctive
    metrics values + distinctive data-claims holds[] + the curated stale word-forms. `holds_owner` maps
    each HOLDS-derived literal to its claim slug, so the report can swap the `[data:]` remedy for the
    tokenize remedy when the leak sits in that claim's own anchoring chapter."""
    deny: "dict[str, str]" = {}
    holds_owner: "dict[str, str]" = {}
    metrics = _load_json("metrics.json")
    for key, value in metrics.items():
        if key.startswith("_") or not isinstance(value, str):
            continue
        if _is_distinctive(value):
            deny.setdefault(value, "{{" + key + "}}")
    claims = _load_json("data-claims.json")
    for slug, entry in claims.items():
        if slug.startswith("_") or not isinstance(entry, dict):
            continue
        for literal in entry.get("holds", []) or []:
            if isinstance(literal, str) and (_is_distinctive(literal) or " " in literal):
                if literal not in deny:  # a metrics value already owns it — that token wins
                    deny[literal] = f"[data:{slug}]"
                    holds_owner.setdefault(literal, slug)
    for form, owed in _STALE_WORD_FORMS.items():
        deny.setdefault(form, owed)
    return deny, holds_owner


def build_denylist() -> "dict[str, str]":
    """literal → the token/slug that should carry it (the denylist half of
    `build_denylist_with_owners`)."""
    return build_denylist_with_owners()[0]


def native_sources() -> "dict[str, str]":
    """Declared LaTeX source → its Markdown projection, both repo-relative, read from the native-source
    manifest. The manifest is what `tools/mage_latex.py sync` writes and what its `--check` mode gates at
    pre-commit, so deriving the scanned set from it means this lint and the build cannot disagree about
    which surface an author edits. Fails loud on an empty manifest rather than silently scanning nothing —
    a lint that reports 0 because it opened the wrong file is worse than no lint."""
    with open(_MANIFEST, encoding="utf-8") as fh:
        rows = json.load(fh)["sources"]
    mapping = {row["source"]: row["projection"] for row in rows}
    if not mapping:
        raise SystemExit(f"governed-literal-leak: {_MANIFEST} declares no sources — "
                         "the manifest is the scanned set, so an empty one means the scan is blind.")
    return mapping


def authored_files() -> "list[tuple[str, str]]":
    """Every AUTHORED prose surface, as sorted `(repo-relative path, "tex" | "md")` pairs: the declared
    LaTeX manuscripts, then the hand-authored appendix Markdown that has no LaTeX source. Generated
    projections, drafts (`book/_design/**`), the emitted web tree and the data files are all out of scope —
    a finding in a generated file names a line the next regeneration overwrites."""
    out = [(src, "tex") for src in native_sources()]
    projections = set(native_sources().values())
    for pattern in _AUTHORED_MD_GLOBS:
        for path in glob.glob(os.path.join(_BOOK, pattern), recursive=True):
            rel = os.path.relpath(path, _ROOT)
            if rel not in projections:
                out.append((rel, "md"))
    return sorted(out)


def _strip_latex_comment(line: str) -> str:
    """Drop a non-rendering LaTeX comment; keep a structured `% <!-- … -->` decorator, whose text renders."""
    match = _COMMENT_RE.search(line)
    if match is None or line[match.start():].startswith(_RENDERED_COMMENT_PREFIX):
        return line
    return line[:match.start()]


def _latex_to_scannable(line: str) -> str:
    """One authored LaTeX line, normalized to the text a reader sees — so `56\\%` and `56%` match as the one
    literal they are. Order matters: comment-stripping keys off an UNESCAPED `%`, so it runs before the
    `\\%` unescape; the URL-decode runs after it, because the encoded braces only appear once `\\%7B` has
    become `%7B`; and markers are blanked last so a decoded `{{token}}` is still recognized as protected."""
    text = _LATEX_MARKER_RE.sub(" ", _strip_latex_comment(line))
    for escaped, plain in _CHAR_ESCAPES:
        text = text.replace(escaped, plain)
    for encoded, plain in _URL_ENCODED_BRACES:
        text = text.replace(encoded, plain)
    text = _DIGIT_THIN_SPACE_RE.sub(",", text)
    text = _SPACING_MACRO_RE.sub(" ", text)
    return _MARKER_RE.sub(" ", text)


def _markdown_to_scannable(line: str) -> str:
    """One authored Markdown line, normalized the same way: code spans blanked, markers blanked."""
    return _MARKER_RE.sub(" ", _MD_INLINE_CODE_RE.sub(" ", line))


def scannable_lines(rel: str, kind: str) -> "list[tuple[int, str]]":
    """`(1-based line number, normalized text)` for one authored file, with code-listing interiors blanked.
    Line numbers survive the blanking so every finding cites the line the author must edit."""
    with open(os.path.join(_ROOT, rel), encoding="utf-8") as fh:
        raw = fh.read().splitlines()
    out: "list[tuple[int, str]]" = []
    in_listing = False
    for lineno, line in enumerate(raw, 1):
        if kind == "tex":
            if _VERBATIM_BEGIN_RE.search(line):
                in_listing = True
                continue
            if _VERBATIM_END_RE.search(line):
                in_listing = False
                continue
            out.append((lineno, "" if in_listing else _latex_to_scannable(line)))
            continue
        if line.lstrip().startswith("```"):
            in_listing = not in_listing
            continue
        out.append((lineno, "" if in_listing else _markdown_to_scannable(line)))
    return out


#: A SECTION LOCATOR, never a measured quantity. `§3.5` is a cross-reference to §3.5, so the `3.5` in it
#: cannot be the support-ratio token typed raw — and once a one-decimal value enters the ledger, every
#: `§N.M` in the manuscript starts tripping on it. Measured 261106: `support_ratio_rounded` landed as `3.5`
#: and immediately produced one finding on the `§3.5` inside a `% <!-- point: … -->` gloss, the exact false
#: positive the evidence-ledger design predicted for a bare one-decimal value. Narrowing the MATCHER is the
#: fix rather than exempting the site: the next `§N.M` collision is a different line, and a per-site
#: exemption would leave the class open. A noisy audit channel is one nobody reads.
_LOCATOR_PREFIXES = ("§",)

#: The characters that, immediately before a literal, make it part of a LARGER token rather than a value in
#: its own right: word chars and the punctuation a number is built from, plus the locator marks above.
#: Composed as an explicit class with the hyphen ESCAPED, because appending to a class whose last member was
#: a trailing literal `-` silently turns that hyphen into a RANGE operator — `[\w.,%$-§]` is `$`..`§`, which
#: swallows `(`, every digit and every letter. That is what the first attempt at this narrowing did, and
#: the real-tree count still read 21 -> 20 because almost every finding happens to follow a space; only
#: `tests/book_models.py`'s pinned normalization corpus refuted it, on `\(3.8\)`. Hence the escaped form.
_PRECEDING_BLOCKERS = r"\w.,%$\-" + "".join(re.escape(p) for p in _LOCATOR_PREFIXES)


def _find_raw(literal: str, stripped: str) -> bool:
    """The literal occurs in `stripped` not glued to an adjacent digit/word char that would make it part of
    a larger token (so '56%' does not match inside '156%'), and not immediately behind a section-locator
    mark (so '3.5' does not match inside '§3.5')."""
    pat = re.compile(rf"(?<![{_PRECEDING_BLOCKERS}])" + re.escape(literal) + r"(?![\w%])")
    return bool(pat.search(stripped))


def scan_authored_prose(deny: "dict[str, str]",
                        holds_owner: "dict[str, str] | None" = None) -> "list[str]":
    findings: "list[str]" = []
    holds_owner = holds_owner or {}
    anchors = _anchor_paths()
    projection_of = native_sources()
    # Longest literals first so a superstring form is reported over its substring.
    ordered = sorted(deny.items(), key=lambda kv: len(kv[0]), reverse=True)
    for rel, kind in authored_files():
        # `_anchor_paths` resolves a claim's source label to its MARKDOWN chapter path, so a `.tex` finding
        # has to be compared through the projection the manifest declares for it — otherwise the
        # anchoring-chapter remedy never fires on the surface the author actually edits.
        chapter = projection_of.get(rel, rel)
        for lineno, text in scannable_lines(rel, kind):
            seen: "set[str]" = set()
            for literal, owed in ordered:
                if literal in seen:
                    continue
                if any(literal in s and literal != s for s in seen):
                    continue  # already covered by a longer superstring literal on this line
                if _find_raw(literal, text):
                    slug = holds_owner.get(literal)
                    if slug and anchors.get(slug) == chapter:
                        remedy = (f"a {{{{token}}}} in metrics.json — this chapter ANCHORS "
                                  f"[data:{slug}], so that marker would cross-ref itself")
                    else:
                        remedy = owed
                    findings.append(f"{rel}:{lineno} — raw governed value {literal!r} — should be {remedy}")
                    seen.add(literal)
    return findings


def scan_data_claims_glosses() -> "list[str]":
    """Forward-police the fields that are NOT token-protected (`gloss` / `observable` render into cross-ref
    text, never through the token substituter — that is where the stale 47x hid). Only the curated stale
    word-forms are scanned here, so an entry's own series values are not mis-flagged."""
    findings: "list[str]" = []
    claims = _load_json("data-claims.json")
    for slug, entry in claims.items():
        if slug.startswith("_") or not isinstance(entry, dict):
            continue
        for field in ("gloss", "observable"):
            text = entry.get(field, "")
            if not isinstance(text, str):
                continue
            for form, owed in _STALE_WORD_FORMS.items():
                if _find_raw(form, text):
                    findings.append(f"book/data/data-claims.json [{slug}].{field} — stale form {form!r} — should be {owed}")
    return findings


def audit_findings() -> "list[str]":
    deny, holds_owner = build_denylist_with_owners()
    return scan_authored_prose(deny, holds_owner) + scan_data_claims_glosses()


def summary_line(findings: "list[str]") -> str:
    return f"{len(findings)} governed-literal-leak finding(s) (a known ledger value typed raw in prose, outside a token/data marker)"


#: The escaping and spacing forms `_latex_to_scannable` normalizes, as `(name, pattern)` — the survey
#: corpus behind the incidence counts in those constants' comments. Re-run it (`--survey-escapes`) rather
#: than guessing when the manuscript gains a new form: a form at 0 incidence is normalized as
#: forward-policing, and one that climbs off 0 is a blind spot worth re-checking against the denylist.
_ESCAPE_SURVEY: "tuple[tuple[str, str], ...]" = (
    (r"\% (escaped percent)", r"\\%"),
    (r"\$ (escaped currency)", r"\\\$"),
    (r"\& (escaped ampersand)", r"\\&"),
    (r"\# (escaped hash)", r"\\#"),
    (r"\_ (escaped underscore)", r"\\_"),
    ("%7B%7B (URL-encoded marker brace)", r"\\%7B\\%7B"),
    (r"digit \, digit (thin-space thousands separator)", r"\d\\,\d"),
    ("digit ~ (non-breaking space after a figure)", r"\d~"),
    (r"\num{ / \SI{ (siunitx number)", r"\\(?:num|SI)\{"),
    (r"\textminus / \percent / \textdollar", r"\\(?:textminus|percent|textdollar)"),
    ("U+2212 minus sign", "\u2212"),
    ("unescaped % (comment open)", r"(?<!\\)%"),
    ("structured % <!-- … --> comment", r"%\s<!--"),
    ("verbatim-family listing", r"\\begin\{(?:verbatim|lstlisting|minted|Verbatim)\}"),
    (r"\magevalue{ (the marker)", r"\\magevalue\{"),
    (r"inline math \( … \)", r"\\\("),
)


def survey_escapes() -> "list[str]":
    """One row per surveyed LaTeX form: occurrences and how many authored sources carry it. The table that
    justifies the normalization set, so the next author extends it from measurement, not from guesswork."""
    occurrences: "collections.Counter[str]" = collections.Counter()
    files: "collections.Counter[str]" = collections.Counter()
    for rel, kind in authored_files():
        if kind != "tex":
            continue
        with open(os.path.join(_ROOT, rel), encoding="utf-8") as fh:
            text = fh.read()
        for name, pattern in _ESCAPE_SURVEY:
            hits = len(re.findall(pattern, text))
            if hits:
                occurrences[name] += hits
                files[name] += 1
    rows = [f"{occurrences[name]:6d} occurrence(s) / {files[name]:3d} file(s)   {name}"
            for name, _pattern in _ESCAPE_SURVEY]
    return rows


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description="AUDIT-ONLY governed-literal-leak gate.")
    ap.add_argument("--survey-escapes", action="store_true",
                    help="re-measure the LaTeX escaping forms in the authored sources and exit")
    args = ap.parse_args(argv)
    if args.survey_escapes:
        print("governed-literal-leak: LaTeX escaping survey over the declared authored sources")
        for row in survey_escapes():
            print(f"  {row}")
        return 0
    deny, _ = build_denylist_with_owners()
    authored = authored_files()
    n_tex = sum(1 for _rel, kind in authored if kind == "tex")
    print(f"governed-literal-leak: scanning {len(authored)} authored file(s) "
          f"({n_tex} declared LaTeX manuscript(s) from book/latex/native-sources.json + "
          f"{len(authored) - n_tex} hand-authored appendix markdown) + data-claims gloss/observable "
          f"against {len(deny)} denylist literal(s) (AUDIT-ONLY — never gates).")
    findings = audit_findings()
    if findings:
        print(f"  {summary_line(findings)}:")
        for f in findings:
            print(f"    {f}")
    else:
        print("  clean — no governed value typed raw outside a marker.")
    print(f"governed-literal-leak: {len(findings)} finding(s).")
    return 0  # AUDIT-ONLY — never gates


if __name__ == "__main__":
    sys.exit(main())
