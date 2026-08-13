"""LINT lint_operator_card_page_span — the post-render ONE-PAGE-FIT sensor for the Appendix-D operator cards.

Each operator card is one page. A card fits iff its rendered title and the NEXT card's title land on
adjacent pdftotext pages (gap of one). A gap greater than one means the earlier card overflowed onto a
continuation page. Iterates the DECLARED card set (operator-cards.json), NOT a hardcoded list — the
stable-lint-reads-the-SSOT posture the caption lint uses.

Coverage note: this sensor is the backstop for LANDSCAPE cards, which render breakable and can overflow
silently. PORTRAIT cards get the compile-time keep-together assert (operator_cards_model.HARD_PAGE_ASSERT)
at the Phase-3 flip; the last card in the deck is portrait, so its overflow is caught at compile time, not
here (this sensor bounds a card by the NEXT card's page, which the last card lacks).

LANDING: AUDIT-ONLY-first (the repo's blocking-lint discipline). It PRINTS its worklist without gating; a
fit-pass drains offenders; a follow-up flips BLOCKING = True AND turns on
operator_cards_model.HARD_PAGE_ASSERT (the ordering guard couples the two). Needs a compiled PDF, so it is a
no-op when book/mage-book.pdf is absent (returns []).

    python3 book-models/lint_operator_card_page_span.py           # print worklist (exit 0, audit-only)
    python3 book-models/lint_operator_card_page_span.py --strict  # exit 1 on any span>1 (Phase-3 mode)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
_SOURCE = os.path.join(HERE, "operator-cards.json")
_DEFAULT_PDF = os.path.join(ROOT, "book", "mage-book.pdf")

#: Phase-3 flip flag — the single source of truth the model's _ordering_guard reads. OFF during the audit
#: window; set True at the BLOCKING commit (paired with operator_cards_model.HARD_PAGE_ASSERT). FLIPPED True
#: once the deck drained to zero spans (App-D v2 tuning, M2): a card overflowing one page now reddens validate.
BLOCKING = True


def _declared_cards() -> "list[tuple[str, str, str]]":
    """(card-id, title, operator_question) in declared deck order."""
    with open(_SOURCE, encoding="utf-8") as fh:
        data = json.load(fh)
    return [(c["card-id"], c.get("title", c["card-id"]), c.get("operator_question", ""))
            for c in data["cards"]]


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def _per_page_text(pdf_path: str) -> "list[str]":
    """Per-page normalized text via pdftotext (form-feed split). Mirrors the book's orphan-heading sensor
    without importing the heavy builder module."""
    out = subprocess.run(["pdftotext", "-layout", pdf_path, "-"],
                         capture_output=True, text=True, check=True).stdout
    return [_norm(page) for page in out.split("\x0c")]


#: A card page opens with its title heading (title within the first N chars) AND carries the card's unique
#: operator question in its opening line. Requiring BOTH pins each card to exactly its page — a title phrase
#: that recurs as a body-chapter heading elsewhere lacks the operator question, so it never false-matches.
_HEADING_WINDOW = 80


def _card_page(pages: "list[str]", title: str, question: str) -> "int | None":
    """1-indexed page that is this card's page: the title is heading-anchored (within the first
    _HEADING_WINDOW chars) AND the card's operator question appears on the same page. None if not found."""
    t, q = _norm(title), _norm(question)
    if not t:
        return None
    for i, txt in enumerate(pages, 1):
        pos = txt.find(t)
        if pos != -1 and pos < _HEADING_WINDOW and (not q or q in txt):
            return i
    return None


def _physical_entries() -> "list[tuple[str, str, str]]":
    """(slug, display-title, operator_question) for EVERY physical Appendix-D page in print order — the
    card deck PLUS the non-card pages (the Operator's Dashboard, the Brownfield Migration Drill) — read
    from the builder's page list, the single source of truth for physical order. A card's question comes
    from operator-cards.json; a non-card page has none (empty string, so it is located by its heading title
    alone). The heavy builder module is imported lazily, only when a span computation actually needs it."""
    import sys  # noqa: local — the physical page list is the builder's SSOT; keep the import off module load
    book_dir = os.path.join(ROOT, "book")
    if book_dir not in sys.path:
        sys.path.insert(0, book_dir)
    import build_book  # noqa: E402 — imported here so the sensor module itself stays cheap to import
    q_by_slug = {cid: q for cid, _t, q in _declared_cards()}
    return [(slug, title, q_by_slug.get(slug, "")) for slug, title in build_book._OPERATORS_REFERENCE_PAGES]


def findings(pdf_path: "str | None" = None) -> "list[tuple[str, int, int]]":
    """(card-id, start_page, end_page) for every card whose rendered span exceeds one page. A card's span
    ends one page before the NEXT PHYSICAL page in print order — card OR non-card — not merely the next
    deck card. WHY physical, not card, adjacency: a card can be followed in the printed appendix by a
    multi-page non-card section (the Brownfield Migration Drill runs several pages); the next *card* then
    sits several pages later, and bounding by it would charge those non-card pages to the earlier card as a
    false overflow. Bounding by the next physical page still catches a card that genuinely spills onto the
    following page. The last physical entry is bounded by the compile-time assert, not here. Empty when the
    PDF is absent (nothing to sense)."""
    pdf = pdf_path or _DEFAULT_PDF
    if not os.path.isfile(pdf):
        return []
    pages = _per_page_text(pdf)
    entries = _physical_entries()
    card_ids = {cid for cid, _t, _q in _declared_cards()}
    located = [(slug, _card_page(pages, title, q)) for slug, title, q in entries]
    out: "list[tuple[str, int, int]]" = []
    for idx, (slug, start) in enumerate(located):
        if slug not in card_ids or start is None:
            continue  # only cards overflow; non-card pages serve as bounds, never as subjects
        # bound by the NEXT located PHYSICAL entry (card OR non-card)
        nxt = next((p for _, p in located[idx + 1:] if p is not None), None)
        if nxt is None:
            continue  # last physical entry — compile-time assert owns portrait overflow
        end = nxt - 1
        if end > start:
            out.append((slug, start, end))
    return out


def orphan_rows() -> "list[str]":
    """Reverse join: a declared card whose title never appears in the rendered PDF (a projection drift).
    Empty when the PDF is absent."""
    if not os.path.isfile(_DEFAULT_PDF):
        return []
    pages = _per_page_text(_DEFAULT_PDF)
    return [f"card {cid!r} page not found in the rendered PDF"
            for cid, title, q in _declared_cards() if _card_page(pages, title, q) is None]


def summary_line(fs: "list[tuple[str, int, int]]") -> str:
    if not fs:
        return "every operator card fits one page"
    return (f"{len(fs)} operator card(s) span >1 page: "
            + ", ".join(f"{c}(p{s}->p{e})" for c, s, e in fs))


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--strict", action="store_true", help="exit 1 on any card spanning >1 page")
    args = ap.parse_args(argv)
    print("== operator-card page-span — post-render one-page-fit sensor "
          f"[{'BLOCKING' if BLOCKING else 'AUDIT-ONLY'}] ==")
    if not os.path.isfile(_DEFAULT_PDF):
        print("  no compiled PDF (book/mage-book.pdf) — render with `catalog.py deploy local --pdf`; nothing to sense")
        return 0
    fs = findings()
    orphans = orphan_rows()
    print(f"  {summary_line(fs)}")
    for cid, s, e in fs:
        print(f"    {cid}: title on p{s}, content continues to p{e}")
    for o in orphans:
        print(f"    {o}")
    return 1 if (fs and args.strict) else 0


if __name__ == "__main__":
    raise SystemExit(main())
