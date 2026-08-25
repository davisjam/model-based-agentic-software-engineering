"""LINT `part-opener-traceability` — every claim a Part opener foreshadows must trace to the book's spine.

THE CLASS.  A Part opener is a promise: "here is the argument this Part will convince you of." That promise
is prose, so today nothing checks that the Part actually keeps it — an opener can foreshadow a claim no
chapter advances, or a claim that connects to none of the book's Big Ideas, and the drift is invisible until
a reader notices the Part never delivered. This lint makes the promise mechanically traceable.

THE DECLARATION.  Each `book/part<N>/00-part-intro.md` carries a `<!-- part-foreshadows: <spine-id>, … -->`
decorator naming the argument-spine claim ids the opener foreshadows. The ids are the join key: they resolve
in the spine, the chapters advance them, and the spine reconciles them to the Big Ideas.

THE CHECK — the loop must CLOSE for every declared id:
  (a) RESOLVES — the id is a real node in `argument_spine_declared.json` `spine[]`.
  (b) ADVANCED-IN-PART — at least one chapter WITHIN that same Part advances it (intersect the chapter's
      `spine_advances` from `chapter-shape.json` with the Part's chapter slugs, keyed by the `N.` prefix).
  (c) TRACES-TO-AN-ARGUMENT-ANCHOR — the spine node reconciles to at least one of the book's headline
      arguments: either a Big Idea via `reconciles.big_ideas` (each slug resolving in
      `landing-big-ideas.json`), OR a "What This Book Argues" claim via `reconciles.argues_claims` (each
      slug resolving in `argues_claims_declared.json`). A Part opener may foreshadow an argument PREMISE
      that headlines the argument on the What-This-Book-Argues page but is not a landing Big Idea; that
      premise still closes the loop by reconciling to its WTBA-claim id. There is no transitive
      claim→anchor path in the models, so this is the direct spine→anchor join.

A declared id that fails any leg is a finding, reported as `part<N>: <id> — <which leg failed>`. The lint
reads the three models at lint-time (the stable-lint-reads-the-SSOT discipline); a spine or chapter-shape
edit re-derives the answer with no second copy to maintain. Stdlib-only, matching `catalog.py`'s
clone-and-run posture.

Run `python3 book-models/lint_part_opener_traceability.py` (audit-only, exit 0) or `--strict` (exit 1 on any
finding). Landed audit-only while several openers foreshadowed argument premises that reconciled to no
anchor. Four distinct spine nodes were involved; three (`abundant-implementation`, `sync-cost-reduced`,
`mage-becomes-practical`) now reconcile to their What-This-Book-Argues claim, and the fourth
(`grounded-in-one-case`, an evidence-status caveat that faithfully anchors to no WTBA claim) was dropped from
its Part-5 opener's foreshadows rather than force-closed. The loop now closes for every declared id and this
lint is BLOCKING (0 findings).
"""
from __future__ import annotations

import json
import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
_BOOK_DIR = os.path.join(_ROOT, "book")

#: One `<!-- part-foreshadows: a, b, c -->` decorator on its own line (the traceability notation).
_FORESHADOWS_RE = re.compile(r"<!--\s*part-foreshadows:\s*(?P<ids>.*?)\s*-->", re.S)
#: A chapter slug's Part number is its leading `N.` prefix (`5.3-the-built-system` → part 5).
_PART_PREFIX_RE = re.compile(r"^(?P<part>\d+)\.")


def _load(name: str) -> dict:
    with open(os.path.join(_HERE, name), encoding="utf-8") as fh:
        return json.load(fh)


def _opener_declarations() -> "dict[int, list[str]]":
    """Map each Part number to the spine ids its `book/part<N>/00-part-intro.md` declares. A Part with no
    decorator (or no opener file) is absent from the map — the loop cannot fail on ids that were not made."""
    out: "dict[int, list[str]]" = {}
    for entry in sorted(os.listdir(_BOOK_DIR)):
        m = re.fullmatch(r"part(\d+)", entry)
        if not m:
            continue
        opener = os.path.join(_BOOK_DIR, entry, "00-part-intro.md")
        if not os.path.isfile(opener):
            continue
        with open(opener, encoding="utf-8") as fh:
            text = fh.read()
        dm = _FORESHADOWS_RE.search(text)
        if not dm:
            continue
        ids = [s.strip() for s in dm.group("ids").split(",") if s.strip()]
        out[int(m.group(1))] = ids
    return out


_IDENTITY = os.path.join(_HERE, "chapter_identity_declared.json")
_LABEL_TO_PART: "dict[str, int] | None" = None


def _part_of(slug: str) -> "int | None":
    """The Part number for a chapter key. chapter-shape.json keys chapters by the number-free identity LABEL
    now, so resolve the label to its filename's N.M- prefix (via the identity table); fall back to the `N.`
    prefix for a still-numbered slug (half-migration). A key with neither is None (skipped)."""
    m = _PART_PREFIX_RE.match(slug)
    if m:
        return int(m.group("part"))
    global _LABEL_TO_PART
    if _LABEL_TO_PART is None:
        decl = json.loads(open(_IDENTITY, encoding="utf-8").read())
        _LABEL_TO_PART = {}
        for c in decl.get("chapters", []):
            pm = _PART_PREFIX_RE.match(os.path.basename(c["filename"]))
            if pm:
                _LABEL_TO_PART[c["label"]] = int(pm.group("part"))
    return _LABEL_TO_PART.get(slug)


def findings() -> "list[str]":
    """Every declared foreshadow id whose traceability loop does not close, as `part<N>: <id> — <reason>`."""
    spine_model = _load("argument_spine_declared.json")
    spine_by_id = {n["id"]: n for n in spine_model["spine"]}
    big_ideas = _load("landing-big-ideas.json")
    # The book's argument-vocabulary slugs (`_argument_big_ideas`), decoupled from the six LANDING claims
    # in `_order` (website-v3, 260825). A spine node may reconcile to one of these nine.
    big_idea_slugs = set(big_ideas.get("_argument_big_ideas", []))
    argues_claims = _load("argues_claims_declared.json")
    argues_claim_slugs = set(argues_claims.get("_order", []))

    # spine id -> the set of Part numbers whose chapters advance it (from chapter-shape's spine_advances).
    shape = _load("chapter-shape.json")
    advanced_in_part: "dict[str, set[int]]" = {}
    for ch in shape.get("chapters", []):
        part = _part_of(ch.get("slug", ""))
        if part is None:
            continue
        for sid in ch.get("spine_advances", []):
            advanced_in_part.setdefault(sid, set()).add(part)

    out: "list[str]" = []
    for part, ids in sorted(_opener_declarations().items()):
        for sid in ids:
            node = spine_by_id.get(sid)
            if node is None:
                out.append(f"part{part}: {sid} — (a) UNRESOLVED: not a node in argument_spine_declared.json")
                continue
            if part not in advanced_in_part.get(sid, set()):
                out.append(f"part{part}: {sid} — (b) NOT-ADVANCED-IN-PART: no part-{part} chapter advances it")
            reconciles = node.get("reconciles", {})
            bis = [b for b in reconciles.get("big_ideas", []) if b in big_idea_slugs]
            acs = [a for a in reconciles.get("argues_claims", []) if a in argues_claim_slugs]
            if not bis and not acs:
                out.append(f"part{part}: {sid} — (c) NO-ARGUMENT-ANCHOR: spine node reconciles to no Big "
                           f"Idea and no What-This-Book-Argues claim")
    return out


def main(argv: "list[str]") -> int:
    strict = "--strict" in argv[1:]
    fs = findings()
    mode = "STRICT (exit 1 on any finding)" if strict else "AUDIT-ONLY (prints, exits 0)"
    print(f"== part-opener-traceability — every foreshadowed spine id must resolve, be advanced in its Part, "
          f"and trace to an argument anchor (Big Idea or What-This-Book-Argues claim) [{mode}] ==")
    if not fs:
        print("  clean — every declared foreshadow id closes the loop (spine ✓ chapter ✓ anchor ✓)")
        return 0
    print(f"  {len(fs)} finding(s):")
    for f in fs:
        print(f"    {f}")
    return 1 if strict else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
