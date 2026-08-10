"""LINT `note-judgments` — every Appendix-B flagship note teaches one distinct engineering judgment.

THE R7 INVARIANT.  The appendix earns its keep by teaching a *repertoire of engineering judgments*, not a
repertoire of mechanisms — so each flagship note must carry exactly one transferable judgment, and no two
notes may teach the same one. This lint holds that invariant over the hand-authored model
`book-models/note-judgments.json` (one record per note: `judgment`, `one_line`, `applicability` (one of a
closed Universal/Common/Specialized slate), `foundational`, and an optional curated `distinct_from` map of
confusable-sibling → differentiator phrase).

WHAT IS MECHANICAL, WHAT IS CURATED.  Near-duplicate detection over free prose is not deterministic — two
judgments can share most words yet mean different things, or share few and mean the same. So the lint does
not try to *prove* distinctness. It does two tractable jobs:

  * COMPLETENESS (A) + CURATION SHAPE (B1) — fully mechanical, BLOCKING.  Every note has a well-formed
    judgment record; every `distinct_from` edge resolves to a real sibling and carries a non-empty
    differentiator that is not a restatement of the note's own one-liner. These cannot false-positive on
    well-formed data, so they gate `catalog.py validate`.
  * LEXICAL SUGGESTION (B2) + FOUNDATIONAL CEILING (C) — heuristic, AUDIT-ONLY.  A shallow one-liner
    overlap score surfaces *candidate* collisions as one-liners drift (silenced by a curated `distinct_from`
    edge in either direction), and a soft ceiling flags a runaway foundational set. Both PRINT and never
    gate — they are the two things a blocking gate must not arbitrate (prose similarity and editorial
    weight). The semantic call — are two judgments genuinely distinct? — stays with the editor + the Final
    DoD review, exactly as the catalogue treats its "every example instantiates its own mechanism" rule.

The lint imports nothing beyond the standard library and the model file — the same clone-and-run posture as
`catalog.py`.  Run `python3 book-models/lint_note_judgments.py` for the full report (`--strict` exits 1 on
any AUDIT-ONLY finding too; default exits 1 only on a BLOCKING finding).
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

_HERE = pathlib.Path(__file__).resolve().parent
_MODEL_PATH = _HERE / "note-judgments.json"
_NOTES_DIR = _HERE.parent / "book" / "appendix-notes"

#: A one-liner over this many characters is not the crisp memorable form R7 asks for. BLOCKING (A4).
ONE_LINE_MAX = 90
#: The closed applicability slate — how broadly a mechanism applies. Every note declares exactly one.
#: BLOCKING (A5): a missing or off-slate value would render a "—" box row or an unknown tier.
APPLICABILITY_TIERS = frozenset({"Universal", "Common", "Specialized"})
#: Beyond ~a third of the notes, "foundational" stops discriminating and R4's "approximately equal editorial
#: importance" collapses back into uniformity. AUDIT-ONLY (C) — an editorial call, not a mechanical fact.
FOUNDATIONAL_CEILING = 10
#: Jaccard overlap over content words above this flags a candidate collision. AUDIT-ONLY (B2), tuned on the
#: real corpus; it proposes, the curated `distinct_from` set disposes.
OVERLAP_THRESHOLD = 0.5

_STOPWORDS = frozenset(
    "a an and the of to in on at for it its is are be by or not no you your with "
    "that this than then them they their as into onto over out up down off so but "
    "one two both each every any all more most only just can cannot never always".split()
)


def _note_slugs() -> "set[str]":
    """The authoritative flagship-note roster — every `book/appendix-notes/<slug>.md` stem. Enumerated at
    check time (read-don't-copy): the lint never hardcodes the count, so adding or renaming a note is caught
    by the completeness check, not silently tolerated."""
    if not _NOTES_DIR.is_dir():
        return set()
    # `_`-prefixed files are build-support opening prose (e.g. `_opening-b.md`, the Appendix-B front-door),
    # not flagship notes — skip them so they need no judgment entry.
    return {p.stem for p in _NOTES_DIR.glob("*.md") if not p.name.startswith("_")}


def _load_model() -> dict:
    """The hand-authored judgment model, or `{}` when the file is absent (a checkout mid-migration still
    runs — completeness then reports every note as missing a judgment)."""
    if not _MODEL_PATH.is_file():
        return {}
    return json.loads(_MODEL_PATH.read_text(encoding="utf-8"))


def _content_words(one_line: str) -> "set[str]":
    """The lowercase content-word set of a one-liner: punctuation dropped, stopwords removed. The token set
    the B2 lexical overlap is computed over."""
    toks = re.findall(r"[a-z][a-z-]*", one_line.lower())
    return {t for t in toks if t not in _STOPWORDS and len(t) > 2}


def blocking_findings() -> "list[str]":
    """Every BLOCKING violation: completeness (A) + curated-distinctness shape (B1). An empty list means the
    model is in one-to-one, well-formed correspondence with the note set."""
    out: "list[str]" = []
    slugs = _note_slugs()
    model = _load_model()
    judgments = model.get("judgments", {})

    # A1 — every note has a judgment.
    for slug in sorted(slugs - set(judgments)):
        out.append(f"NO-JUDGMENT note {slug!r} has no entry in note-judgments.json 'judgments'")
    # A2 — no judgment without a note (guards a stray/renamed placeholder).
    for slug in sorted(set(judgments) - slugs):
        out.append(f"ORPHAN-JUDGMENT 'judgments.{slug}' maps to no book/appendix-notes/{slug}.md")

    for slug, rec in sorted(judgments.items()):
        if slug not in slugs:
            continue  # already reported as an orphan; skip shape checks on a non-note record
        one_line = (rec.get("one_line") or "").strip()
        # A3 — well-formed record.
        if not (rec.get("judgment") or "").strip():
            out.append(f"EMPTY-JUDGMENT {slug!r} has an empty 'judgment'")
        if not one_line:
            out.append(f"EMPTY-ONE-LINE {slug!r} has an empty 'one_line'")
        if not isinstance(rec.get("foundational"), bool):
            out.append(f"BAD-FOUNDATIONAL {slug!r} 'foundational' is not a boolean")
        # A5 — a closed applicability tier (drives the note metadata box's Applicability row).
        applic = (rec.get("applicability") or "").strip()
        if applic not in APPLICABILITY_TIERS:
            out.append(f"BAD-APPLICABILITY {slug!r} applicability {applic!r} not in "
                       f"{sorted(APPLICABILITY_TIERS)}")
        # A4 — crisp one-liner.
        if len(one_line) > ONE_LINE_MAX:
            out.append(f"ONE-LINE-TOO-LONG {slug!r} one_line is {len(one_line)} chars "
                       f"(cap {ONE_LINE_MAX}) — tighten it to the crisp memorable form")
        # B1 — curated distinct_from shape.
        for tgt, phrase in (rec.get("distinct_from") or {}).items():
            if tgt == slug:
                out.append(f"SELF-EDGE {slug!r} declares itself in its own distinct_from")
            elif tgt not in slugs:
                out.append(f"DANGLING-EDGE {slug!r} distinct_from names {tgt!r}, not a real note slug")
            phrase = (phrase or "").strip()
            if not phrase:
                out.append(f"EMPTY-DIFFERENTIATOR {slug!r} -> {tgt!r} has an empty differentiator phrase")
            elif phrase == one_line or (one_line and phrase in one_line):
                out.append(f"RESTATED-DIFFERENTIATOR {slug!r} -> {tgt!r} differentiator merely restates "
                           f"the note's own one_line")
    return out


def audit_findings() -> "list[str]":
    """The AUDIT-ONLY heuristics: B2 lexical-overlap SUGGESTions + the C foundational-ceiling warning. These
    surface candidates and editorial drift; they never gate."""
    out: "list[str]" = []
    model = _load_model()
    judgments = model.get("judgments", {})
    slugs = _note_slugs()

    # B2 — shallow one-liner overlap, only for pairs NOT already curated as distinct.
    def _curated(a: str, b: str) -> bool:
        ja, jb = judgments.get(a, {}), judgments.get(b, {})
        return b in (ja.get("distinct_from") or {}) or a in (jb.get("distinct_from") or {})

    words = {s: _content_words((r.get("one_line") or "")) for s, r in judgments.items() if s in slugs}
    keys = sorted(words)
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            wa, wb = words[a], words[b]
            if not wa or not wb:
                continue
            j = len(wa & wb) / len(wa | wb)
            if j >= OVERLAP_THRESHOLD and not _curated(a, b):
                out.append(f"SUGGEST {a!r} and {b!r} one-liners overlap {j:.2f} — confirm they are "
                           f"distinct or add a distinct_from edge")

    # C — foundational ceiling.
    n_found = sum(1 for s, r in judgments.items() if s in slugs and r.get("foundational"))
    if n_found > FOUNDATIONAL_CEILING:
        out.append(f"FOUNDATIONAL-CEILING {n_found} notes marked foundational (soft ceiling "
                   f"{FOUNDATIONAL_CEILING}) — 'foundational' should stay a discriminating minority")
    return out


def main(argv: "list[str]") -> int:
    strict = "--strict" in argv[1:]
    blk = blocking_findings()
    aud = audit_findings()
    print("== note-judgments — one distinct engineering judgment per flagship note "
          "(completeness + curation shape BLOCKING; overlap + foundational ceiling AUDIT-ONLY) ==")
    n_notes = len(_note_slugs())
    if not blk:
        print(f"  BLOCKING: clean — {n_notes} note(s), each with a well-formed, distinct-curated judgment")
    else:
        print(f"  BLOCKING: {len(blk)} finding(s):")
        for f in blk:
            print(f"    {f}")
    if aud:
        print(f"  AUDIT-ONLY: {len(aud)} suggestion(s) (do not gate):")
        for f in aud:
            print(f"    {f}")
    else:
        print("  AUDIT-ONLY: none")
    if blk:
        return 1
    return 1 if (strict and aud) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
