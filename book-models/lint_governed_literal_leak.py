"""LINT `governed-literal-leak` — AUDIT-ONLY. Flag a KNOWN governed value (a `metrics.json` displayed
value or a `data-claims.json` `holds[]` literal or a canonical stale word-form) appearing RAW in chapter
prose, outside a `{{token}}` / `[data:slug]` marker. This is the deterministic mirror image of the
renderer's fail-loud-on-unknown-token: fail-loud-on-known-value-typed-raw.

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
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
_BOOK = os.path.join(_ROOT, "book")
_DATA = os.path.join(_BOOK, "data")

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


def _chapter_md_files() -> "list[str]":
    """The numbered chapter sources (book/partN/*.md) — where governed prose numerals live. Drafts
    (book/_design/**) and the data files themselves are out of scope."""
    return sorted(glob.glob(os.path.join(_BOOK, "part*", "*.md")))


def _find_raw(literal: str, stripped: str) -> bool:
    """The literal occurs in `stripped` not glued to an adjacent digit/word char that would make it part of
    a larger token (so '56%' does not match inside '156%')."""
    pat = re.compile(r"(?<![\w.,%$-])" + re.escape(literal) + r"(?![\w%])")
    return bool(pat.search(stripped))


def scan_chapter_prose(deny: "dict[str, str]",
                       holds_owner: "dict[str, str] | None" = None) -> "list[str]":
    findings: "list[str]" = []
    holds_owner = holds_owner or {}
    anchors = _anchor_paths()
    # Longest literals first so a superstring form is reported over its substring.
    ordered = sorted(deny.items(), key=lambda kv: len(kv[0]), reverse=True)
    for path in _chapter_md_files():
        rel = os.path.relpath(path, _ROOT)
        with open(path, encoding="utf-8") as fh:
            for lineno, line in enumerate(fh, 1):
                stripped = _MARKER_RE.sub(" ", line)
                seen: "set[str]" = set()
                for literal, owed in ordered:
                    if literal in seen:
                        continue
                    if any(literal in s and literal != s for s in seen):
                        continue  # already covered by a longer superstring literal on this line
                    if _find_raw(literal, stripped):
                        slug = holds_owner.get(literal)
                        if slug and anchors.get(slug) == rel:
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
    return scan_chapter_prose(deny, holds_owner) + scan_data_claims_glosses()


def summary_line(findings: "list[str]") -> str:
    return f"{len(findings)} governed-literal-leak finding(s) (a known ledger value typed raw in prose, outside a token/data marker)"


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description="AUDIT-ONLY governed-literal-leak gate.")
    ap.parse_args(argv)
    deny, _ = build_denylist_with_owners()
    print(f"governed-literal-leak: scanning {len(_chapter_md_files())} chapter file(s) + "
          f"data-claims gloss/observable against {len(deny)} denylist literal(s) "
          f"(AUDIT-ONLY — never gates).")
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
