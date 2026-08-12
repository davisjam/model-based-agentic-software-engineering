"""LINT `slogan-density` — the AUDIT-ONLY worklist that rations the book's polished slogans. Reads the
metaphor + slogan registry (`metaphor-spans.json`), the derived occurrence-index (`metaphor-slogan-index.json`),
and the book's own `<!-- slogan: id -->` author tags, and reports four density classes so the Part-1
net-subtractive revision has a mechanical to-do list.

WHAT IS BLOCKING VS AUDIT-ONLY.  The two born-blocking density classes live in `metaphor_spans_model.py`,
gated by `catalog.py validate`: class (a) competing-canonical (more than one invoke-by-name slogan on one
declared idea) and class (f) dangling-elaboration (an `elaborates` that resolves to no declared idea). This
lint carries the remaining four, AUDIT-ONLY-first (rule-#55 discipline — the current Part-1 prose is
over-sloganed, so a blocking landing would redden every commit until the fix-wave drains it):

  (b) COMPETITOR-AT-FULL-STRENGTH — a registered competitor phrasing still occurs in the built book; blunt
      it to a referential invocation ("the printer posture applies here") and the finding clears. The
      fix-wave driver.
  (c) OVER-USE / CLUSTERING — an invoke-by-name canonical occurs more than its `ration_budget`, OR two full
      occurrences (canonical or a metaphor image) sit within CLUSTER_WINDOW anchors of each other.
  (d) USED-ONCE VIOLATION — a `scope: used-once` slogan, or a `used_once` metaphor, appears more than once.
  (e) TAG ↔ REGISTRY CONSISTENCY — a `<!-- slogan: id -->` tag whose id is not registered, OR a registered
      slogan with zero tagged occurrences (an unlanded canonical). This mechanizes "confirm slogan-y
      language is REGISTERED, not ad-hoc." The tags enter the model by being MARKED, never guessed — the
      same honest limitation `lint_define_before_use` accepts (an untagged paraphrase is out of scope).

The lint imports only the standard library, the two book-models, and the book renderer (which owns the tag
harvest + reading order), matching `catalog.py`'s clone-and-run posture. Run
`python3 book-models/lint_slogan_density.py` for the full report (always exits 0 — audit-only).
"""
from __future__ import annotations

import argparse
import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import metaphor_spans_model as msm  # noqa: E402 — the registry
import metaphor_slogan_index_model as msi  # noqa: E402 — the derived occurrence-index

_BOOK = os.path.join(os.path.dirname(_HERE), "book")
if _BOOK not in sys.path:
    sys.path.insert(0, _BOOK)
import build_book as bbh  # noqa: E402 — owns the reading-order walk + body_md harvest

#: The clustering window (class c): two full occurrences within this many anchors of each other on one page
#: are "clustered" — a rationed slogan/image repeated too close. Ratified default.
CLUSTER_WINDOW = 2

_SLOGAN_TAG_RE = re.compile(r"<!--\s*slogan:\s*([a-z0-9-]+)\s*-->")


# ---- the `<!-- slogan: id -->` author tag harvest ---------------------------------------------------

def _ordered_chapters() -> "list[dict]":
    """The book's pages in reading order — the same sequence `lint_define_before_use` walks (front matter →
    body → back matter → projected appendix), so the slogan tags are harvested exactly where the reader meets
    them."""
    metrics = bbh._load_metrics()
    chapters = bbh._discover_chapters(metrics)
    max_part = max(c["part"] for c in chapters)
    return chapters + bbh.build_appendix_chapters(next_part=max_part + 1)


def harvest_slogan_tags() -> "dict[str, list[str]]":
    """`{slogan-id: [page_slug, …]}` — every `<!-- slogan: id -->` marker, in reading order. The AUTHORED
    declaration that an occurrence is intentional (canonical landing or blunt referential invocation), the
    same register-by-tag discipline `index-example` uses. Empty today; the net-subtractive fix-wave places
    the tags as it canonicalizes each occurrence."""
    tags: "dict[str, list[str]]" = {}
    for pg in _ordered_chapters():
        for m in _SLOGAN_TAG_RE.finditer(pg.get("body_md", "")):
            tags.setdefault(m.group(1), []).append(pg["slug"])
    return tags


# ---- index helpers ----------------------------------------------------------------------------------

def _index() -> "dict[str, dict]":
    return (msi.load_artifact() or {}).get("index", {})


def _page_slug(rel: str) -> str:
    """'book/1.1-the-printer.html' -> '1.1-the-printer' (the key the chapter-anchor walk uses)."""
    return os.path.splitext(os.path.basename(rel))[0]


def _sites(entry: "dict | None", variant_pred) -> "list[dict]":
    if not entry:
        return []
    return [s for s in entry["sites"] if variant_pred(s["variant"])]


def _total_occ(sites: "list[dict]") -> int:
    return sum(s["occ"] for s in sites)


# ---- class b — competitor at full strength ----------------------------------------------------------

def competitor_findings(index: "dict[str, dict] | None" = None) -> "list[str]":
    if index is None:
        index = _index()
    findings: "list[str]" = []
    for slug, entry in sorted(index.items()):
        if entry["kind"] != "slogan":
            continue
        for site in entry["sites"]:
            if site["variant"].startswith("competitor:"):
                phrase = site["variant"].split(":", 1)[1]
                findings.append(f"(b) COMPETITOR-AT-FULL-STRENGTH: slogan {slug!r} competitor {phrase!r} still "
                                f"occurs in {site['file']}#{site['anchor'] or '(top)'} (x{site['occ']}) — blunt "
                                f"it to a referential invocation")
    return findings


# ---- class c — over-use / clustering ----------------------------------------------------------------

def _clustered_pairs(sites: "list[dict]") -> "list[tuple[str, str, str]]":
    """(file, anchor_a, anchor_b) for two canonical/image occurrences within CLUSTER_WINDOW anchors on one
    page. Anchor positions come from the same chapter-anchor walk the overlap metric uses."""
    pairs: "list[tuple[str, str, str]]" = []
    by_file: "dict[str, list[str]]" = {}
    for s in sites:
        by_file.setdefault(s["file"], []).append(s["anchor"])
    for rel, anchors in by_file.items():
        order = msm.chapter_anchors(_page_slug(rel))
        positioned = sorted((order.index(a), a) for a in anchors if a in order)
        for (pa, a), (pb, b) in zip(positioned, positioned[1:]):
            if pb - pa <= CLUSTER_WINDOW:
                pairs.append((rel, a, b))
    return pairs


def overuse_findings(model: "msm.MetaphorModel | None" = None, index: "dict[str, dict] | None" = None) -> "list[str]":
    if model is None:
        model = msm.derive_model()
    if index is None:
        index = _index()
    findings: "list[str]" = []
    # Over-budget: an invoke-by-name canonical past its ration_budget.
    for s in model.invoke_by_name():
        canon = _sites(index.get(s.slug), lambda v: v == "canonical")
        total = _total_occ(canon)
        if total > s.ration_budget:
            findings.append(f"(c) OVER-USE: slogan {s.slug!r} canonical occurs {total}x across the book "
                            f"(> ration_budget {s.ration_budget}) — thin to referential invocations")
    # Clustering: two canonical (or metaphor-image) occurrences within CLUSTER_WINDOW anchors on one page.
    for slug, entry in sorted(index.items()):
        sites = _sites(entry, lambda v: v in ("canonical", "image"))
        for rel, a, b in _clustered_pairs(sites):
            findings.append(f"(c) CLUSTERING: {entry['kind']} {slug!r} has two full occurrences within "
                            f"{CLUSTER_WINDOW} anchors in {rel} ({a!r}, {b!r}) — space them out")
    return findings


# ---- class d — used-once violation ------------------------------------------------------------------

def used_once_findings(model: "msm.MetaphorModel | None" = None, index: "dict[str, dict] | None" = None) -> "list[str]":
    if model is None:
        model = msm.derive_model()
    if index is None:
        index = _index()
    findings: "list[str]" = []
    for s in model.used_once():
        total = _total_occ(_sites(index.get(s.slug), lambda v: v == "canonical"))
        if total > 1:
            findings.append(f"(d) USED-ONCE: slogan {s.slug!r} appears {total}x but is scope:used-once — "
                            f"keep exactly one occurrence")
    for m in model.local():
        if not m.used_once:
            continue
        total = _total_occ(_sites(index.get(m.slug), lambda v: v == "image"))
        if total > 1:
            findings.append(f"(d) USED-ONCE: metaphor {m.slug!r} image appears {total}x but is used_once — "
                            f"keep exactly one occurrence")
    return findings


# ---- class e — tag ↔ registry consistency -----------------------------------------------------------

def tag_findings(model: "msm.MetaphorModel | None" = None, tags: "dict[str, list[str]] | None" = None) -> "list[str]":
    if model is None:
        model = msm.derive_model()
    if tags is None:
        tags = harvest_slogan_tags()
    slogan_slugs = {s.slug for s in model.slogans}
    findings: "list[str]" = []
    for tag_id, pages in sorted(tags.items()):
        if tag_id not in slogan_slugs:
            findings.append(f"(e) UNREGISTERED-TAG: `<!-- slogan: {tag_id} -->` in {', '.join(pages)} names no "
                            f"registered slogan — register it in metaphor-spans.json or fix the id")
    for s in model.slogans:
        if s.slug not in tags:
            findings.append(f"(e) UNLANDED: slogan {s.slug!r} carries no `<!-- slogan: {s.slug} -->` tag in the "
                            f"prose — the fix-wave marks its canonical landing")
    return findings


# ---- aggregate --------------------------------------------------------------------------------------

def audit_findings() -> "list[str]":
    """Every AUDIT-ONLY density finding (classes b/c/d/e) — the Part-1 net-subtractive worklist. Classes a
    and f are BLOCKING and live in metaphor_spans_model.structural_findings, not here."""
    model = msm.derive_model()
    index = _index()
    tags = harvest_slogan_tags()
    return [
        *competitor_findings(index),
        *overuse_findings(model, index),
        *used_once_findings(model, index),
        *tag_findings(model, tags),
    ]


def summary_line(findings: "list[str]") -> str:
    return (f"{len(findings)} slogan-density finding(s) (classes b competitor / c over-use / d used-once / "
            f"e tag-consistency — the Part-1 net-subtractive worklist)")


def main(argv: "list[str] | None" = None) -> int:
    argparse.ArgumentParser(description=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter).parse_args(argv)
    findings = audit_findings()
    print("== slogan density — ration polished slogans (AUDIT-ONLY) ==")
    if not findings:
        print("  clean — no competitor at full strength, ration within budget, used-once respected, tags consistent")
    else:
        print(f"  {summary_line(findings)}:")
        for f in findings:
            print(f"    {f}")
    return 0  # AUDIT-ONLY — never gates


if __name__ == "__main__":
    raise SystemExit(main())
