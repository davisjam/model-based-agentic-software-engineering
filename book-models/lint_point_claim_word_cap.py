"""LINT `point-claim-word-cap` — a `point` decorator's `<claim>` segment must be ≤20 words.

THE NEW POINT FORM.  The drain's canonical points changed shape: a verbose paragraph paraphrase is WRONG;
the new form is `<!-- point: <slug> | <claim> | terms: <t1>, <t2> -->` where `<claim>` is a SHORT
declarative sentence — capped at **20 words**. This lint makes the cap machine-checkable: a word is a
whitespace-separated token in the `<claim>` segment ONLY (deterministic; the `terms:` segment does not
count), and a claim over 20 words is a finding.

CAP SET FROM THE CORPUS, NOT BY TASTE (260920).  Measured over all 833 points: min 5, median 18, mean
20.2, max 56 words. The original cap of 10 flagged 747 points (90%) — it was measuring an undone reform,
not a drifting corpus. The cap is now 20: the claims still read as short declaratives, and the finding
count halves to ~303 (36%). Re-measure before moving it again; the distribution is the argument.

STILL AUDIT-ONLY, AND THE REMAINDER IS A WORKLIST.  The ~303 findings at cap 20 are NOT false positives.
They are the points still carrying the OLD verbose paragraph-paraphrase form this decorator replaced — the
reform pass that was to drain them never ran (the lint landed against 175 points; the book now has 833).
This lint PRINTS findings and exits 0, never reddening a commit. Promote it to blocking only after that
drain, not by loosening the cap until the tree happens to be clean.

Run `python3 book-models/lint_point_claim_word_cap.py` to see the findings (audit-only, exit 0).
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import book_symbols as bs  # noqa: E402 — read-only over book_ir (the point decorators live in the IR)

#: The claim-word cap. A `<claim>` segment with more whitespace-separated tokens than this is a finding.
CLAIM_WORD_CAP = 20


def claim_word_count(claim: str) -> int:
    """The claim's word count — whitespace-separated tokens in the claim segment. Deterministic: the same
    definition `book_ir` fills into `Block.point_text` (the 2nd `|`-segment), split on whitespace."""
    return len(claim.split())


def findings() -> "list[str]":
    """Every `point` decorator whose `<claim>` segment exceeds `CLAIM_WORD_CAP` words. The claim is
    `Block.point_text` (the 2nd `|`-segment `book_ir` parsed); a malformed decorator with no claim (point_text
    None) is NOT this lint's job — the reverse index's `point_findings` reports that. Structural +
    deterministic (a token count), so it lives on the same footing as the other mechanical drift walks."""
    out: "list[str]" = []
    doc = bs.book_ir.parse_book()
    for c in doc.chapters:
        for b in c.blocks:
            if b.directive == "point" and b.point_slug and b.point_text is not None:
                n = claim_word_count(b.point_text)
                if n > CLAIM_WORD_CAP:
                    out.append(f"CLAIM-TOO-LONG point {b.point_slug!r} in {c.slug}::block-{b.index} — "
                               f"claim is {n} words (cap {CLAIM_WORD_CAP}): {b.point_text!r}")
    return out


def main(argv: "list[str]") -> int:
    strict = "--strict" in argv[1:]
    fs = findings()
    mode = "STRICT (exit 1 on any finding)" if strict else "AUDIT-ONLY (prints, exits 0)"
    print(f"== point-claim-word-cap — claim segment must be ≤{CLAIM_WORD_CAP} words [{mode}] ==")
    if not fs:
        print("  clean — every point claim is within the word cap")
        return 0
    print(f"  {len(fs)} finding(s):")
    for f in fs:
        print(f"    {f}")
    return 1 if strict else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
