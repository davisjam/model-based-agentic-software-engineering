"""The two-tier CONCEPT model — the landing BRICK projector's typed source + the concept-ENTRY parity
checks, over the declared landing model so brick and entry cannot drift from it.

MODULE-NAME NOTE. The file mirrors its declared source `landing-big-ideas.json` (the repo's
`X.json <-> X_model.py` pairing), so the module keeps the "big-ideas" name even though the RENDERED
vocabulary is "Concept" — the six ideas are the site's Concepts section, rebranded from "Big Ideas."
A sibling of `metrics_dashboard_model.py` / `theory_of_mage_model.py`: the hand-authored source of truth
is `book-models/landing-big-ideas.json`; this module derives a typed model over the six idea records
(the `gateway` is not a concept) and reports the two-tier drift with a non-overlapping check.

TWO-TIER SPLIT (the ratified re-scope). The landing BRICK (rendered by `catalog.py`) shows four elements
only — figure · title · one-line claim · a '→ read the concept' link. The rich material — the `more`
intuition, the extra figures, the mechanism edge, the related concepts, the book hand-off — lives on the
standalone `concept-<slug>.html` ENTRY, a hand-authored markdown file (`concept-<slug>.md`) the way a
mechanism catalogue entry is authored + validated (NOT projected whole). This module no longer renders the
entry BODY; it owns the typed model + the projectors the entry-author and the checks share, plus the drift
check. `catalog.py:cmd_build` renders each `concept-<slug>.md` to `.html`, projecting the model's `more`
into the entry's opening and the model's figures into the entry's `<!-- fig: N -->` slots.

PROJECTORS (model owns data; the entry author + the renderer + CC6 all read these, so the card and figures
cannot drift):
  - `concept_figures(c)` — the ordered figure list `[(asset, caption)]`: fig[0] is the shared brick
    `figure` (caption ""), fig[1..] are the entry-only `entry_figures`. The renderer resolves each
    `<!-- fig: N -->` positional directive against this list.
  - `concept_card_lines(c, model)` — the entry's 5-row Concept-card table as markdown `|`-rows; CC6 pins
    the authored card against this projection with `page_block_parity`.

DRIFT CHECK (`all_findings()`, CC1-CC6; non-overlapping with `check_big_ideas`, which keeps brick/band
drift — book_home / figure / word-cap / id-on-landing). CC1 brick-field + edge-type schema; CC2/CC3 the
two edges resolve; CC4 the entry page exists + the landing links it; CC5 each entry declares 1–3 figures
that RESOLVE under book/assets AND the built entry page RENDERS 1–3 figures; CC6 the entry's Concept card
table + `# <title>` + `**Claim** —` line equal the model (the gate that makes the hand-authored entry
safe). Reads the meta-file at check time (no codegen, no snapshot). AUDIT-ONLY-first landing: `catalog.py
validate` prints the findings under an AUDIT-ONLY banner without gating; a follow-up flips them BLOCKING
once a clean session confirms the drain (the repo's blocking-lint landing discipline).

Run `python3 book-models/landing_big_ideas_model.py verify` to drift-check (CC1-CC6, audit-only);
`... show` to list every concept, its declared mechanism edge, and its figures.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field

from _projection_parity import (
    catalogue_entry_paths,
    catalogue_entry_slugs,
    page_block_parity,
    require_fields,
    resolve_edges,
)

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)  # the governance-catalog repo root (book-models/ is one level down)
_DECLARED = os.path.join(_HERE, "landing-big-ideas.json")

#: The record that is NOT a concept — it fronts the catalogue's By-model view and gets no card
#: (consistent with check_big_ideas excluding it from projection).
_NON_CONCEPT = "gateway"

#: The brick fields every Concept needs non-empty (CC1a). `intuition` maps to the JSON's `more` — KEPT
#: (it renders on the ENTRY now, not the brick, and the reasoning-horizon reframe lands in it), not dropped.
#: `figure`/`book_home` are resolved elsewhere (check_big_ideas owns their on-disk resolution).
_REQUIRED_RENDERED = ("title", "kicker", "claim", "figure", "book_home", "intuition")


# ---- typed model ------------------------------------------------------------------------------------

@dataclass
class Concept:
    """One of the six Concepts. `slug` is the JSON key (== the `concept-<slug>.html` page slug), distinct
    from the existing `bi-<slug>` site id (`id`, the projection-drift join key). `intuition` is the `more`
    prose (rendered on the ENTRY's opening); `mechanisms` is the hand-declared Concept->mechanism edge;
    `related_ideas` is the optional Related-concepts override ([] => the _order-adjacency seed);
    `entry_figures` are the entry-only figures fig[1..] ({asset, caption} dicts) beyond the shared brick
    figure fig[0] (=`figure`)."""
    slug: str
    id: str
    title: str
    kicker: str
    claim: str
    figure: str
    intuition: str
    book_home: str
    mechanisms: "list[str]" = field(default_factory=list)
    related_ideas: "list[str]" = field(default_factory=list)
    entry_figures: "list[dict]" = field(default_factory=list)


@dataclass
class ConceptModel:
    word_cap: int
    order: "list[str]"
    concepts: "list[Concept]"   # the six, in _order; gateway excluded


# ---- load + build -----------------------------------------------------------------------------------

def _load_declared() -> dict:
    with open(_DECLARED, encoding="utf-8") as fh:
        return json.load(fh)


def _concept_records(raw: "dict | None" = None) -> "list[tuple[str, dict]]":
    """The (slug, record) pairs for the six concepts in `_order` — `_`-keys and the gateway excluded."""
    if raw is None:
        raw = _load_declared()
    recs = {k: v for k, v in raw.items() if not k.startswith("_") and k != _NON_CONCEPT}
    order = raw.get("_order", [])
    return [(slug, recs[slug]) for slug in order if slug in recs]


def derive_model(raw: "dict | None" = None) -> ConceptModel:
    """Build the typed model from the hand-authored declarations — the single derivation the projection and
    the checks share. Skips `_`-prefixed keys and the gateway; orders by `_order`."""
    if raw is None:
        raw = _load_declared()
    concepts = [
        Concept(
            slug=slug, id=rec.get("id", ""), title=rec.get("title", ""), kicker=rec.get("kicker", ""),
            claim=rec.get("claim", ""), figure=rec.get("figure", ""),
            intuition=rec.get("more", ""), book_home=rec.get("book_home", ""),
            mechanisms=list(rec.get("mechanisms", []) or []),
            related_ideas=list(rec.get("related_ideas", []) or []),
            entry_figures=list(rec.get("entry_figures", []) or []),
        )
        for slug, rec in _concept_records(raw)
    ]
    return ConceptModel(word_cap=raw.get("_word_cap", 26), order=raw.get("_order", []), concepts=concepts)


# ---- relationships seed -----------------------------------------------------------------------------

def _related_slugs(model: ConceptModel, c: Concept) -> "list[str]":
    """The Relationships targets: the curated `related_ideas` override if present, else the `_order`-
    adjacency seed (predecessor + successor; an endpoint links its one neighbour)."""
    if c.related_ideas:
        return c.related_ideas
    order = [x.slug for x in model.concepts]
    i = order.index(c.slug)
    seed = []
    if i > 0:
        seed.append(order[i - 1])
    if i < len(order) - 1:
        seed.append(order[i + 1])
    return seed


# ---- projectors: the shared figure list + the entry Concept-card table ------------------------------
# The entry markdown is hand-authored, but the FIGURES and the CONCEPT-CARD table are projected from the
# model so they cannot drift: the entry positions figures with `<!-- fig: N -->` directives the renderer
# resolves against `concept_figures`, and pastes the card table `concept_card_lines` emits (CC6 pins it).

def concept_figures(c: Concept) -> "list[tuple[str, str]]":
    """The concept's ordered `(asset, caption)` figures: fig[0] is the shared brick `figure` (caption ""),
    fig[1..] are the entry-only `entry_figures`. The entry renderer resolves each positional
    `<!-- fig: N -->` directive by indexing this list, so the model stays the figure SSOT."""
    figs: "list[tuple[str, str]]" = []
    if c.figure:
        figs.append((c.figure, ""))
    for f in c.entry_figures:
        if isinstance(f, dict) and f.get("asset"):
            figs.append((str(f.get("asset")), str(f.get("caption", ""))))
    return figs


# ---- human-readable names for the Mechanisms + Related card cells -----------------------------------
# The card is reader-facing, so it shows names a person reads, never the kebab slugs that key the model.
# A mechanism's name is its catalogue ENTRY title (the authoritative human name), minus the parenthetical
# gloss and any code-span backticks; a related concept's name is that concept's own title, cut at its
# em-dash subtitle so the cell stays a short noun phrase.

_MECH_NAME_CACHE: "dict[str, str] | None" = None


def _dekebab(slug: str) -> str:
    """Fallback human name when an entry title cannot be read: hyphens to spaces, first letter capital."""
    s = slug.replace("-", " ").strip()
    return s[:1].upper() + s[1:] if s else s


def mechanism_display_name(slug: str) -> str:
    """The mechanism's reader-facing name — its catalogue entry's `# <title>` with the trailing
    `(qualifier)` gloss and any `code` backticks stripped, so the concept card reads 'Self-governance', not
    the `self-governance` slug. Falls back to a de-kebabbed slug if the entry title cannot be read."""
    global _MECH_NAME_CACHE
    if _MECH_NAME_CACHE is None:
        _MECH_NAME_CACHE = {}
        for s, html in catalogue_entry_paths().items():
            md_path = os.path.join(_ROOT, html[:-5] + ".md")  # <role>/<family>/<slug>.html -> .md
            try:
                first = open(md_path, encoding="utf-8").readline().strip()
            except OSError:
                continue
            if first.startswith("# "):
                title = first[2:].split(" (", 1)[0].replace("`", "").strip()
                if title:
                    _MECH_NAME_CACHE[s] = title
    return _MECH_NAME_CACHE.get(slug) or _dekebab(slug)


def concept_display_name(slug: str, model: ConceptModel) -> str:
    """The related concept's reader-facing name — its `title`, cut at the ' — ' subtitle so a long
    two-part title ('Engineering Capital — Churn vs. Compounding') shows its short head in the card."""
    for c in model.concepts:
        if c.slug == slug:
            return c.title.split(" — ", 1)[0].strip()
    return _dekebab(slug)


def _card_mechanisms_cell(c: Concept) -> str:
    if not c.mechanisms:
        return "— none yet"
    return " · ".join(mechanism_display_name(s) for s in c.mechanisms)


def concept_card_lines(c: Concept, model: ConceptModel) -> "list[str]":
    """The entry's 5-row Concept-card as markdown table rows (header + rule + 5 body rows). The entry pastes
    these verbatim; CC6 pins the authored table against this projection with `page_block_parity`, so the
    card identity (claim / mechanisms / book_home) cannot drift from the model."""
    return [
        f"| Concept | {c.kicker} |",
        "| --- | --- |",
        f"| Claim | {c.claim} |",
        f"| Mechanisms | {_card_mechanisms_cell(c)} |",
        f"| Related | {' · '.join(concept_display_name(s, model) for s in _related_slugs(model, c)) or '—'} |",
        f"| In the book | {_book_home_href(c.book_home)} |",
    ]


def _book_home_href(book_home: str) -> str:
    """`book_home` stores a number-free identity LABEL (+ optional #anchor) now; project it to the chapter's
    built-HTML href `book/<N.M-slug>.html[#anchor]` so the concept card's 'In the book' cell keeps pointing
    at the page (a renumber updates it). A non-label value passes through unchanged."""
    import chapter_identity_model as chapter_identity  # noqa: E402 — sibling book-model
    label, sep, anchor = book_home.partition("#")
    if label in chapter_identity.labels():
        return chapter_identity.html_href(label) + (sep + anchor if sep else "")
    return book_home


# ---- the drift check (CC1-CC6; non-overlapping with check_big_ideas) ---------------------------------

def schema_findings(model: "ConceptModel | None" = None) -> "list[str]":
    """CC1a — every concept carries the brick fields non-empty (title/kicker/claim/figure/book_home +
    `intuition`, KEPT for the entry). CC1b — the two edge fields are lists of strings and `entry_figures`
    is a list of {asset, caption} objects."""
    if model is None:
        model = derive_model()
    findings = require_fields(model.concepts, _REQUIRED_RENDERED, "CC1a concept")
    for slug, rec in _concept_records():
        for key in ("mechanisms", "related_ideas"):
            val = rec.get(key, [])
            if not isinstance(val, list) or not all(isinstance(x, str) for x in val):
                findings.append(f"CC1b concept {slug!r} field {key!r} must be a list of strings")
        figs = rec.get("entry_figures", [])
        if not isinstance(figs, list) or not all(
                isinstance(f, dict) and isinstance(f.get("asset"), str) for f in figs):
            findings.append(f"CC1b concept {slug!r} field 'entry_figures' must be a list of "
                            f"{{asset, caption}} objects")
    return findings


def edge_findings(model: "ConceptModel | None" = None) -> "list[str]":
    """CC2 — every declared mechanism slug resolves to a real catalogue entry. CC3 — every related-ideas
    override slug (when used) resolves to one of the six concept slugs."""
    if model is None:
        model = derive_model()
    cc2 = resolve_edges(model.concepts, "mechanisms", catalogue_entry_slugs(), "CC2 concept→mechanism")
    concept_slugs = {c.slug for c in model.concepts}
    cc3 = resolve_edges(model.concepts, "related_ideas", concept_slugs, "CC3 concept→related-idea")
    return cc2 + cc3


def reachability_findings(model: "ConceptModel | None" = None) -> "list[str]":
    """CC4 — for each concept, `concept-<slug>.html` was written AND the landing carries a link to it
    (the model->site page-existence join). Best-effort: skips silently when the site is not built yet, so
    a pre-build `verify` does not false-fire (mirrors check_big_ideas's landing-scan best-effort)."""
    if model is None:
        model = derive_model()
    idx = os.path.join(_ROOT, "index.html")
    if not os.path.isfile(idx):
        return []
    landing = open(idx, encoding="utf-8").read()
    findings: "list[str]" = []
    for c in model.concepts:
        page = os.path.join(_ROOT, f"concept-{c.slug}.html")
        if not os.path.isfile(page):
            findings.append(f"CC4 concept {c.slug!r}: concept-{c.slug}.html was not written")
        if f'href="concept-{c.slug}.html"' not in landing:
            findings.append(f"CC4 concept {c.slug!r}: the landing carries no link to concept-{c.slug}.html")
    return findings


def figure_findings(model: "ConceptModel | None" = None) -> "list[str]":
    """CC5 — each concept declares 1–3 figures (fig[0] the brick figure + `entry_figures`), every declared
    asset resolves under book/assets/, AND (post-build, best-effort) the built entry page RENDERS 1–3
    figure blocks. Counting the RENDERED figures — not just the model field — is what makes CC5 gate what it
    claims: the model count and the page's real figure count must agree (reviewer R2)."""
    if model is None:
        model = derive_model()
    findings: "list[str]" = []
    for c in model.concepts:
        figs = concept_figures(c)
        if not 1 <= len(figs) <= 3:
            findings.append(f"CC5 concept {c.slug!r}: declares {len(figs)} figures (want 1–3)")
        for asset, _cap in figs:
            if asset and not os.path.isfile(os.path.join(_ROOT, "book", "assets", asset)):
                findings.append(f"CC5 concept {c.slug!r}: figure asset {asset!r} not found under book/assets/")
        page = os.path.join(_ROOT, f"concept-{c.slug}.html")
        if os.path.isfile(page):  # best-effort: only once the entry is built
            n_rendered = open(page, encoding="utf-8").read().count('class="cc-body-fig"')
            if not 1 <= n_rendered <= 3:
                findings.append(f"CC5 concept {c.slug!r}: entry page renders {n_rendered} figure(s) "
                                f"(want 1–3) — check the `<!-- fig: N -->` directives")
    return findings


def parity_findings(model: "ConceptModel | None" = None) -> "list[str]":
    """CC6 — the brick↔entry parity gate that makes the hand-authored entry safe. For each concept: the
    entry's Concept-card table equals the model projection (`page_block_parity`), its `# <title>` heading
    equals the model title, and its `**Claim** —` intent line equals the model claim. Best-effort: a
    missing `concept-<slug>.md` is one finding, not a crash."""
    if model is None:
        model = derive_model()
    findings: "list[str]" = []
    for c in model.concepts:
        md_path = os.path.join(_ROOT, f"concept-{c.slug}.md")
        display = f"concept-{c.slug}.md"
        if not os.path.isfile(md_path):
            findings.append(f"CC6 concept {c.slug!r}: {display} does not exist")
            continue
        lines = concept_card_lines(c, model)
        findings += page_block_parity(md_path, lines[0], lines, display=display, label="concept card")
        md_lines = [ln.rstrip() for ln in open(md_path, encoding="utf-8").read().splitlines()]
        if f"# {c.title}" not in md_lines:
            findings.append(f"CC6 concept {c.slug!r}: `# {c.title}` title heading missing or drifted")
        if f"**Claim** — {c.claim}" not in "\n".join(md_lines):
            findings.append(f"CC6 concept {c.slug!r}: `**Claim** —` line drifted from the model claim")
    return findings


def all_findings(model: "ConceptModel | None" = None) -> "list[str]":
    """CC1-CC6 — the full two-tier Concept drift check `catalog.py validate` runs (audit-only).
    Non-overlapping with `check_big_ideas` (which keeps brick/band drift)."""
    if model is None:
        model = derive_model()
    return (schema_findings(model) + edge_findings(model) + reachability_findings(model)
            + figure_findings(model) + parity_findings(model))


# ---- CLI --------------------------------------------------------------------------------------------

def _cmd_show() -> int:
    model = derive_model()
    for c in model.concepts:
        edge = ", ".join(c.mechanisms) if c.mechanisms else "(thin — no edge)"
        figs = ", ".join(a for a, _ in concept_figures(c))
        print(f"{c.slug:20} {c.title}")
        print(f"                     mechanisms: {edge}")
        print(f"                     related:    {', '.join(_related_slugs(model, c))}")
        print(f"                     figures:    {figs}")
    print(f"\n{len(model.concepts)} concepts (gateway excluded)")
    return 0


def _cmd_verify() -> int:
    model = derive_model()
    findings = all_findings(model)
    if findings:
        print(f"concept-cards: {len(findings)} finding(s) "
              f"(audit-only — review candidates, not build stops):")
        for f in findings:
            print(f"  {f}")
        return 0  # audit-only: report, never gate
    print(f"concept entries in sync ({len(model.concepts)} concepts; schema clean; every mechanism edge "
          f"resolves; pages reachable; figures + card parity clean)")
    return 0


def main(argv: "list[str]") -> int:
    cmd = argv[1] if len(argv) > 1 else "verify"
    if cmd == "verify":
        return _cmd_verify()
    if cmd == "show":
        return _cmd_show()
    print(f"usage: {argv[0]} [verify|show]")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
