"""operator_cards_model.py — the Appendix-D operator-card model.

AUTHORED source: book-models/operator-cards.json (10 cards; NOT generated — the single-file
metrics-dashboard precedent, not the *_declared split). Its projection is card PAGES under
book/appendix-operators-reference/, not a second JSON. Mirrors the sibling *_model.py (loader +
verifier + page projection); wired BLOCKING into `catalog.py validate`.

Four obligations:

  * resolution_findings()  — THE evidence-resolution GATE: every evidence_refs join key resolves to a
                             live entry in its namespace's _resolution_targets file; a dangling ref is a
                             finding. assessment_signals[] are explicitly NO-registry (never resolved,
                             never invented). This is the mechanization of "derive, never hallucinate".
  * structural_findings()  — schema shape (required fields, family in _families, page_geometry in
                             {portrait,landscape}, one_page bool, status in the closed set) plus the
                             ratified deck counts (10 cards; the family + geometry split).
  * parity_findings()      — every declared card has a page under appendix-operators-reference/ AND every
                             card page in that dir has a declared row (forward+reverse existence join).
  * all_findings()         — resolution + structural + parity + the page-fit ordering guard (the full
                             check catalog.py validate runs).

Page-fit: the projector emits a scaffold per card (non-destructive — an authored page is left alone);
the hard compile-time one-page assert stays OFF until the Phase-3 flip (HARD_PAGE_ASSERT), paired to the
page-span sensor's BLOCKING flag by _ordering_guard so the two halves cannot flip out of order.

Run `python3 book-models/operator_cards_model.py verify`   -> drift-check (all_findings; exit 1 on any).
Run `python3 book-models/operator_cards_model.py project`  -> (re)emit any missing card-page scaffolds.
Run `python3 book-models/operator_cards_model.py show`     -> list every card, family, and geometry.
"""
from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, field
from functools import lru_cache

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)  # the governance-catalog repo root (book-models/ is one level down)
_BOOK = os.path.join(_ROOT, "book")
_SOURCE = os.path.join(_HERE, "operator-cards.json")

#: The dir the card pages live in (the parity target). Each card = one file = one page.
_CARD_DIR = os.path.join(_BOOK, "appendix-operators-reference")

#: Pages in _CARD_DIR that are NOT operator cards (the two hand-authored reference surfaces). Excluded from
#: the reverse-orphan parity join, and a valid target for a PAGE: evidence_ref.
_NON_CARD_PAGES = ("operators-dashboard", "from-drifted-wiki-to-trusted-model")

#: Card geometry axis + the closed derive-status set (a new status is a deliberate schema edit, not a typo).
_VALID_GEOMETRY = ("portrait", "landscape")
_VALID_STATUS = (
    "derive", "derive-scorecard", "derive-assessment", "derive-checklist",
    "derive-pyramid", "derive-meta", "derive-synthesis",
)
_REQUIRED_FIELDS = (
    "card-id", "title", "family", "operator_question", "evidence_refs",
    "assessment_signals", "page_geometry", "one_page", "status",
)

#: The ratified deck shape — encode the author's set so a silent add/drop/reclassify reddens.
EXPECT_TOTAL = 10
EXPECT_FAMILY = {"steering": 3, "compounding": 2, "shipping": 2, "doctrine": 3}
EXPECT_GEOMETRY = {"portrait": 7, "landscape": 3}

#: Phase-3 flip constant. OFF during the audit window; set True at the BLOCKING commit (and ONLY then, once
#: the page-span sensor is BLOCKING — enforced by _ordering_guard). FLIPPED True with the page-span sensor
#: (App-D v2 tuning, M2), once the deck drained to zero spans. The two halves move in lockstep via
#: _ordering_guard: HARD_PAGE_ASSERT may be True only while lint_operator_card_page_span.BLOCKING is True.
HARD_PAGE_ASSERT = True


# ---- typed model ------------------------------------------------------------------------------------

@dataclass
class Card:
    card_id: str
    title: str
    family: str
    operator_question: str
    evidence_refs: "list[str]"
    assessment_signals: "list[str]"
    page_geometry: str
    one_page: bool
    status: str
    pending_refs: "list[str]" = field(default_factory=list)


@dataclass
class DeckModel:
    resolution_targets: dict
    families: dict
    cards: "list[Card]"


def _load() -> dict:
    with open(_SOURCE, encoding="utf-8") as fh:
        return json.load(fh)


def derive_model() -> DeckModel:
    raw = _load()
    cards = [
        Card(
            card_id=c["card-id"], title=c.get("title", ""), family=c["family"],
            operator_question=c["operator_question"], evidence_refs=list(c["evidence_refs"]),
            assessment_signals=list(c.get("assessment_signals", [])),
            page_geometry=c["page_geometry"], one_page=bool(c["one_page"]), status=c["status"],
            pending_refs=list(c.get("pending_refs", [])),
        )
        for c in raw["cards"]
    ]
    return DeckModel(
        resolution_targets=raw.get("_resolution_targets", {}),
        families=raw.get("_families", {}),
        cards=cards,
    )


# ---- substrate readers (memoized; each id-space per _resolution_targets) -----------------------------

def _bm(name: str) -> dict:
    with open(os.path.join(_HERE, name), encoding="utf-8") as fh:
        return json.load(fh)


def _bookdata(name: str) -> dict:
    with open(os.path.join(_BOOK, "data", name), encoding="utf-8") as fh:
        return json.load(fh)


@lru_cache(maxsize=1)
def _dash_slugs() -> "frozenset[str]":
    return frozenset(m["slug"] for m in _bm("metrics-dashboard.json")["metrics"])


@lru_cache(maxsize=1)
def _theory_ids() -> "frozenset[str]":
    th = _bm("theory_of_mage_declared.json")
    ids: "set[str]" = set(th.keys())  # top-level keys (e.g. apparatus_measures_caveat)
    for grp in ("loops", "hypotheses", "relations", "outcomes", "propositions", "constructs", "moderators"):
        v = th.get(grp)
        if isinstance(v, list):
            ids |= {x.get("id") for x in v if isinstance(x, dict)}
        elif isinstance(v, dict):
            ids |= set(v.keys())
    return frozenset(i for i in ids if i)


@lru_cache(maxsize=1)
def _cat_slugs() -> "frozenset[str]":
    return frozenset(_bm("catalogue-cards.json")["entries"].keys())


@lru_cache(maxsize=1)
def _conc_keys() -> "frozenset[str]":
    return frozenset(_bookdata("concepts.json").keys())


@lru_cache(maxsize=1)
def _outline_slugs() -> "frozenset[str]":
    return frozenset(c["slug"] for c in _bm("outline.json")["chapters"])


@lru_cache(maxsize=1)
def _life_ids() -> "frozenset[str]":
    ex = os.path.join(_ROOT, "plugin", "mage", "skills", "self-operations", "examples")
    if not os.path.isdir(ex):
        return frozenset()
    return frozenset(
        fn[len("lifecycle-"):-len(".md")]
        for fn in os.listdir(ex)
        if fn.startswith("lifecycle-L") and fn.endswith(".md")
    )


def _life_principle_exists() -> bool:
    return os.path.isfile(os.path.join(
        _ROOT, "plugin", "mage", "skills", "self-operations", "principles.md"))


@lru_cache(maxsize=1)
def _claim_ids() -> "frozenset[str]":
    return frozenset(c.get("id") for c in _bm("claims.json")["claims"] if isinstance(c, dict))


@lru_cache(maxsize=1)
def _dataclaim_anchors() -> "frozenset[str]":
    return frozenset(k for k in _bookdata("data-claims.json") if not k.startswith("_"))


@lru_cache(maxsize=1)
def _operators_reference_card_ids() -> "frozenset[str]":
    return frozenset(set(_NON_CARD_PAGES) | {c.card_id for c in derive_model().cards})


# ---- the evidence-resolution gate (the make-or-break) -----------------------------------------------

def _resolve(ref: str) -> "str | None":
    """Return a finding string if the ref dangles, else None. The namespaces mirror _resolution_targets."""
    ns, _, ident = ref.partition(":")
    if ns == "DASH":
        return None if ident in _dash_slugs() else f"DASH ref {ident!r} not a metrics-dashboard slug"
    if ns == "THEORY":
        return None if ident in _theory_ids() else f"THEORY ref {ident!r} not a declared id/top-level key"
    if ns == "CAT":
        return None if ident in _cat_slugs() else f"CAT ref {ident!r} not a catalogue-cards entry slug"
    if ns == "CONC":
        return None if ident in _conc_keys() else f"CONC ref {ident!r} not a concepts.json key"
    if ns == "CH":
        return None if ident in _outline_slugs() else f"CH ref {ident!r} not an outline chapter slug"
    if ns == "LIFE":
        if ident.startswith("principle:"):
            return None if _life_principle_exists() else "LIFE principle source (principles.md) missing"
        return None if ident in _life_ids() else f"LIFE ref {ident!r} not a plugin self-operations lifecycle"
    if ns == "EVID":
        # claims.json id | data-claims anchor | 'substantiation:<concept>' apparatus-concept (no-registry).
        if ident in ("claims.json", "data-claims.json"):
            return None  # substrate-level population refs
        if ident.startswith("substantiation:"):
            return None  # apparatus-concept, explicitly no-registry
        if ident in _claim_ids() or ident in _dataclaim_anchors():
            return None
        return f"EVID ref {ident!r} not a claim id / data-claim anchor / substantiation concept"
    if ns == "PAGE":
        return (None if ident in _operators_reference_card_ids()
                else f"PAGE ref {ident!r} not an operators-reference card")
    return f"unknown namespace {ns!r} in ref {ref!r}"


def resolution_findings(model: "DeckModel | None" = None) -> "list[str]":
    """Every evidence_ref must resolve; every assessment_signal must NOT collide with a DASH metric (a
    soft-gap silently promoted to a metric). pending_refs[] are NOT gated (a source not yet on main)."""
    if model is None:
        model = derive_model()
    out: "list[str]" = []
    for card in model.cards:
        for ref in card.evidence_refs:
            f = _resolve(ref)
            if f:
                out.append(f"[{card.card_id}] {f}")
        # assessment_signals[] are NEVER resolved and NEVER treated as metrics — the explicit no-registry
        # escape valve (the ratified soft-gaps). The ONE thing to flag: a signal that IS a DASH slug, which
        # would mean a soft-gap silently became a declared metric.
        for sig in card.assessment_signals:
            if sig in _dash_slugs():
                out.append(f"[{card.card_id}] assessment_signal {sig!r} collides with a DASH metric — "
                           f"either declare it (make it an evidence_ref) or it is a soft-gap (rename)")
    return out


# ---- structural / schema invariants -----------------------------------------------------------------

def structural_findings(model: "DeckModel | None" = None) -> "list[str]":
    """Schema shape + the ratified deck counts. S1 required fields; S2 family/geometry/status enums;
    S3 kebab-case + unique card-id; S4 the ratified total + family split + geometry split."""
    if model is None:
        model = derive_model()
    out: "list[str]" = []
    raw_cards = _load()["cards"]
    families = model.families
    seen: "set[str]" = set()

    for c, rawc in zip(model.cards, raw_cards):
        cid = c.card_id or "<no-id>"
        # S1 — required fields present + non-empty (lists may be empty; scalars may not).
        for f in _REQUIRED_FIELDS:
            if f not in rawc:
                out.append(f"S1 card {cid!r} missing field {f!r}")
            elif f not in ("evidence_refs", "assessment_signals") and str(rawc[f]).strip() == "":
                out.append(f"S1 card {cid!r} has empty field {f!r}")
        # S2 — enums.
        if c.family not in families:
            out.append(f"S2 card {cid!r} family {c.family!r} not in _families")
        if c.page_geometry not in _VALID_GEOMETRY:
            out.append(f"S2 card {cid!r} page_geometry {c.page_geometry!r} not in {_VALID_GEOMETRY}")
        if c.status not in _VALID_STATUS:
            out.append(f"S2 card {cid!r} status {c.status!r} not in the closed status set")
        if not isinstance(c.one_page, bool):
            out.append(f"S2 card {cid!r} one_page is not a bool")
        # S3 — id shape + uniqueness.
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", c.card_id):
            out.append(f"S3 card {cid!r} card-id is not kebab-case")
        if c.card_id in seen:
            out.append(f"S3 duplicate card-id {cid!r}")
        seen.add(c.card_id)
        if not c.evidence_refs:
            out.append(f"S3 card {cid!r} has no evidence_refs (a card must derive from a source)")

    # S4 — the ratified deck shape.
    total = len(model.cards)
    if total != EXPECT_TOTAL:
        out.append(f"S4 {total} cards, expected {EXPECT_TOTAL} (a card was added or removed)")
    for fam, n in EXPECT_FAMILY.items():
        got = sum(1 for c in model.cards if c.family == fam)
        if got != n:
            out.append(f"S4 {got} {fam} cards, expected {n} (a card was reclassified or moved)")
    for geo, n in EXPECT_GEOMETRY.items():
        got = sum(1 for c in model.cards if c.page_geometry == geo)
        if got != n:
            out.append(f"S4 {got} {geo} cards, expected {n} (a card's geometry changed)")
    return out


# ---- parity: each card has a page; each card page has a card ----------------------------------------

def _card_page_path(card_id: str) -> str:
    return os.path.join(_CARD_DIR, f"{card_id}.md")


def parity_findings(model: "DeckModel | None" = None) -> "list[str]":
    """Forward+reverse existence join over the card-page dir (like a caption-lint orphan check).
    Forward: each declared card owes a `<card-id>.md`. Reverse: each `.md` that is neither a declared
    card nor one of the two hand-authored reference pages is an orphan page (no declared row)."""
    if model is None:
        model = derive_model()
    out: "list[str]" = []
    declared = {c.card_id for c in model.cards}
    for cid in sorted(declared):
        if not os.path.isfile(_card_page_path(cid)):
            out.append(f"P1 declared card {cid!r} has no page appendix-operators-reference/{cid}.md "
                       f"(run `operator_cards_model.py project`)")
    if os.path.isdir(_CARD_DIR):
        known = declared | set(_NON_CARD_PAGES)
        for fn in sorted(os.listdir(_CARD_DIR)):
            # `_`-prefixed files are build-support opening prose (e.g. `_opening.md`, the Appendix-D
            # front-door), not operator cards — skip them so they need no declared row.
            if fn.endswith(".md") and not fn.startswith("_") and fn[:-3] not in known:
                out.append(f"P2 orphan card page appendix-operators-reference/{fn} has no declared row")
    return out


# ---- page-fit ordering guard ------------------------------------------------------------------------

def _page_span_sensor_is_blocking() -> bool:
    """True iff the post-render page-span sensor is registered BLOCKING. Read from the sensor module's own
    BLOCKING flag (single source of truth), so the two flip-halves stay coupled. Absent (pre-sensor commit)
    reads as not-blocking."""
    bm = _HERE
    if bm not in sys.path:
        sys.path.insert(0, bm)
    try:
        import lint_operator_card_page_span as ocps  # noqa: E402 — sibling sensor; flip flag SSOT
    except ImportError:
        return False
    return bool(getattr(ocps, "BLOCKING", False))


def _ordering_guard() -> "list[str]":
    """HARD_PAGE_ASSERT may be True ONLY once the page-span sensor is BLOCKING — flipping the compile-time
    assert before the sensor gates would panic `typst compile` while the audit sequencing still runs."""
    if HARD_PAGE_ASSERT and not _page_span_sensor_is_blocking():
        return ["ordering: HARD_PAGE_ASSERT is True but lint_operator_card_page_span is still AUDIT-ONLY "
                "— flip the sensor BLOCKING first, then the assert"]
    return []


def all_findings(model: "DeckModel | None" = None) -> "list[str]":
    """Resolution + structural + parity + ordering — the full check catalog.py validate runs."""
    if model is None:
        model = derive_model()
    return (resolution_findings(model) + structural_findings(model)
            + parity_findings(model) + _ordering_guard())


# ---- projection: emit a scaffold for any missing card page (non-destructive) ------------------------

def _ref_prose(ref: str) -> str:
    """A human-readable one-line gloss of an evidence_ref for the scaffold's Sources list."""
    ns, _, ident = ref.partition(":")
    label = {"DASH": "dashboard metric", "THEORY": "theory node", "CAT": "catalogue mechanism",
             "CONC": "concept", "CH": "chapter", "EVID": "evidence apparatus", "LIFE": "self-operations",
             "PAGE": "operator-reference page"}.get(ns, ns)
    return f"`{ref}` ({label})"


def _scaffold(card: Card) -> str:
    sources = "\n".join(f"- {_ref_prose(r)}" for r in card.evidence_refs)
    return (
        f"*{card.operator_question}*\n\n"
        f"This operator card is a projection of the sources below — a one-page reading of a standing "
        f"operational question. The body is authored on top of this scaffold; nothing here is invented "
        f"beyond what the sources carry.\n\n"
        f"### Sources this card projects\n\n"
        f"{sources}\n"
    )


def project() -> "list[str]":
    """Emit a scaffold page for any card that has none. Non-destructive: an existing (authored) page is
    left untouched. Returns the list of pages written."""
    os.makedirs(_CARD_DIR, exist_ok=True)
    written: "list[str]" = []
    for card in derive_model().cards:
        path = _card_page_path(card.card_id)
        if not os.path.exists(path):
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(_scaffold(card))
            written.append(os.path.relpath(path, _ROOT))
    return written


# ---- CLI --------------------------------------------------------------------------------------------

def _cmd_verify() -> int:
    model = derive_model()
    findings = all_findings(model)
    if findings:
        print(f"operator-cards: {len(findings)} finding(s):")
        for f in findings:
            print(f"  {f}")
        return 1
    print(f"operator-cards in sync ({len(model.cards)} cards; every evidence_ref resolves; "
          f"schema clean; every card has a page)")
    return 0


def _cmd_project() -> int:
    written = project()
    if written:
        print(f"wrote {len(written)} scaffold page(s):")
        for p in written:
            print(f"  {p}")
    else:
        print("all card pages present — nothing to scaffold")
    return 0


def _cmd_show() -> int:
    model = derive_model()
    for c in model.cards:
        print(f"[{c.family:>12} · {c.page_geometry:>9}] {c.card_id:<22} {c.operator_question}")
        print(f"               refs: {', '.join(c.evidence_refs)}")
        if c.assessment_signals:
            print(f"               soft-gaps: {', '.join(c.assessment_signals)}")
    print(f"\n{len(model.cards)} cards · "
          + " · ".join(f"{fam} {sum(1 for c in model.cards if c.family == fam)}" for fam in EXPECT_FAMILY))
    return 0


def main(argv: "list[str]") -> int:
    cmd = argv[1] if len(argv) > 1 else "verify"
    if cmd == "verify":
        return _cmd_verify()
    if cmd == "project":
        return _cmd_project()
    if cmd == "show":
        return _cmd_show()
    print(f"usage: {argv[0]} [verify|project|show]")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
