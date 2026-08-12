"""The RESEARCH-AGENDA model — the book's forward program as a queryable, drift-gated INDEX rather than
prose scattered across finished chapters with nothing indexing it. A sibling of the other declared ->
generated book models (theory-of-mage / industry-cases): the hand-authored source of truth is
`book-models/research_agenda_declared.json`; this module derives a typed model over it, projects the
'Where the frontier goes next' coda index AND the figure node manifest, and holds the joins RA1-RA5.

ONE SOURCE, TWO PROJECTIONS.
  - `render_frontier_prose_md()` — the coda's index TABLE: one row per agenda item, grouped by kind (the
    kind label leads each group, blank on continuation rows), each row `**title.** one_line` + a `§home`
    pointer derived from the item's source_section. The block RA5 prose-parity gates byte-equal once the
    'Where the frontier goes next' section lands on a page (a pipe table so page_block_parity holds it
    exactly, the same primitive the theory table and the industry matrices use — zero new machinery).
  - `render_agenda_nodes()` — the stable ordered node manifest `(id, title, kind, status,
    related_hypotheses, source_section)` the later figure wave consumes as the node contract, AND the
    surface the RA5 figure-parity check reads against the SVG's `<desc>` node enumeration once it lands.

The related_hypotheses on each item are IDS that resolve against `theory_of_mage_declared.json` (RA2) —
the hypotheses are single-sourced in the theory model and referenced here, never copied (IC4-style). A
hypothesis rename breaks the agenda build rather than silently orphaning an anchor.

Reads the meta-files at check-time (rule-#33 best form — stable, no codegen, no snapshot). LANDING:
AUDIT-ONLY-first (rule-#55 blocking-lint discipline) — the `[agenda]` band in `catalog.py validate`
PRINTS RA1-RA4 findings but does NOT increment the issue count; a follow-up flips them to BLOCKING once a
clean session confirms the drain, the path every book model took. RA5 prose-parity activates once the
coda section is placed; RA5 figure-parity activates once the open-frontiers map SVG lands.

Run `python3 book-models/research_agenda_model.py verify` to drift-check (RA1-RA5); `... agenda-prose`
to print the coda index table for the page; `... nodes` to print the figure node manifest; `... show` to
list every agenda item.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field

import chapter_identity_model as chapter_identity  # sibling in book-models/; the chapter surrogate-key model
import _book_pages  # sibling in book-models/; the shared chapter-page resolver (RA3 section join)
from _projection_parity import page_block_parity  # shared authored-page table-parity check (extract-on-3rd-site)

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)  # the governance-catalog repo root (book-models/ is one level down)
_BOOK = os.path.join(_ROOT, "book")
_DECLARED = os.path.join(_HERE, "research_agenda_declared.json")
_THEORY_DECLARED = os.path.join(_HERE, "theory_of_mage_declared.json")

#: The page the coda index table is authored into (RA5 prose-parity target). Resolved through the
#: chapter-identity model, so a renumber of the home chapter updates the target automatically. The coda is
#: placed in the 'Education, Research, and Open Problems' chapter (the research handoff before the
#: Conclusion — every agenda home precedes it, so every back-reference resolves).
_CODA_PAGE_REL = chapter_identity.filename("education-research-open-problems")

#: The ratified count — encode the author's set so a silent add/drop reddens (the theory model's
#: EXPECT_HYPOTHESES analogue: the count guard is the backstop against silent agenda drift).
EXPECT_AGENDA_ITEMS = 7

#: The research-program map the figure wave placed (RA5 FIGURE-parity target). Its accessible `<desc>` node
#: enumeration must name every render_agenda_nodes() title — the softer figure analogue of the prose parity,
#: run against the enumeration a screen reader reaches rather than against the drawn boxes. Book-relative.
_FIGURE_SVG_REL = os.path.join("assets", "open-frontiers.svg")

#: The coda index columns (the header the projection emits and the page carries; parity is exact).
_COLUMNS = ("Kind", "Open direction", "Home")
_TABLE_HEADER = "| " + " | ".join(_COLUMNS) + " |"
_TABLE_RULE = "|" + "---|" * len(_COLUMNS)


# ---- typed model ------------------------------------------------------------------------------------

@dataclass
class Taxon:
    """One closed-taxonomy member (a kind or a status) — id + label + gloss."""
    id: str
    label: str
    gloss: str


@dataclass
class AgendaItem:
    """One agenda item — a piece of the forward program. `kind` and `status` resolve against the two closed
    taxonomies; `related_hypotheses` are ids that resolve against the theory model (the weld to the testable
    substrate); `source_section` is the home chapter that expands it."""
    id: str
    title: str
    kind: str
    status: str
    one_line: str
    source_section: str
    related_hypotheses: "list[str]" = field(default_factory=list)

    @property
    def home_title(self) -> str:
        """The home pointer as the chapter's DESCRIPTIVE display title (the book names sections narratively,
        never by a `§N` literal — a bare `§6.5` reddens the blocking no-hardcoded-ref gate). Derived via the
        chapter-identity model from the source_section stem, so a retitle re-projects here and RA5 forces the
        placed table to follow. Falls back to the raw stem when the section resolves to no chapter (RA3
        reports that separately)."""
        lab = chapter_identity.label_for_slug(self.source_section)
        if lab is None:
            return self.source_section
        return chapter_identity.title(lab)


@dataclass
class AgendaModel:
    kinds: "list[Taxon]"
    statuses: "list[Taxon]"
    items: "list[AgendaItem]"

    def kind_ids(self) -> "set[str]":
        return {k.id for k in self.kinds}

    def status_ids(self) -> "set[str]":
        return {s.id for s in self.statuses}

    def kind_label(self, kind_id: str) -> str:
        for k in self.kinds:
            if k.id == kind_id:
                return k.label
        return kind_id

    def items_in(self, kind_id: str) -> "list[AgendaItem]":
        """Items of one kind, in declared order — the coda groups by this."""
        return [it for it in self.items if it.kind == kind_id]


# ---- load + build -----------------------------------------------------------------------------------

def _load_declared() -> dict:
    with open(_DECLARED, encoding="utf-8") as fh:
        return json.load(fh)


def _taxa(raw: dict, key: str) -> "list[Taxon]":
    return [
        Taxon(id=t.get("id", ""), label=t.get("label", t.get("id", "")), gloss=t.get("gloss", ""))
        for t in raw.get(key, [])
    ]


def derive_model(raw: "dict | None" = None) -> AgendaModel:
    """Build the typed model from the hand-authored declarations — the single derivation the two projections
    and the checks share."""
    if raw is None:
        raw = _load_declared()
    items = [
        AgendaItem(
            id=a.get("id", ""), title=a.get("title", ""), kind=a.get("kind", ""),
            status=a.get("status", ""), one_line=a.get("one_line", ""),
            source_section=a.get("source_section", ""),
            related_hypotheses=list(a.get("related_hypotheses", []) or []),
        )
        for a in raw.get("agenda", [])
    ]
    return AgendaModel(kinds=_taxa(raw, "kinds"), statuses=_taxa(raw, "statuses"), items=items)


def _hypothesis_ids() -> "set[str]":
    """Every hypothesis id (top-level + sub) declared in the theory model — the RA2 join universe (IC4's
    analogue: the agenda references H1-H8, single-sourced in the theory model)."""
    if not os.path.exists(_THEORY_DECLARED):
        return set()
    with open(_THEORY_DECLARED, encoding="utf-8") as fh:
        raw = json.load(fh)
    ids: "set[str]" = set()
    for h in raw.get("hypotheses", []):
        if h.get("id"):
            ids.add(h["id"])
        for sh in h.get("sub_hypotheses", []) or []:
            if sh.get("id"):
                ids.add(sh["id"])
    return ids


# ---- projection 1: the coda index table -------------------------------------------------------------

def render_index_rows(model: "AgendaModel | None" = None) -> "list[str]":
    """The agenda as coda-index table rows (no header) — grouped by kind in declared order, the kind label
    leading each group and blank on continuation rows. The page carries exactly these lines."""
    if model is None:
        model = derive_model()
    rows: "list[str]" = []
    for kind in model.kinds:
        group = model.items_in(kind.id)
        for i, it in enumerate(group):
            lead = kind.label if i == 0 else ""
            rows.append(f"| {lead} | **{it.title}.** {it.one_line} | {it.home_title} |")
    return rows


def render_frontier_prose_md(model: "AgendaModel | None" = None) -> str:
    """The full coda index table (header + rule + one row per item, grouped by kind) the 'Where the frontier
    goes next' section carries. Named for the coda it projects; a pipe table so RA5 prose-parity holds the
    placed block byte-equal via page_block_parity (the theory table's idiom)."""
    return "\n".join([_TABLE_HEADER, _TABLE_RULE, *render_index_rows(model)])


# ---- projection 2: the figure node manifest ---------------------------------------------------------

@dataclass
class AgendaNode:
    """One figure node — the stable contract the later figure wave consumes and the RA5 figure-parity check
    reads against the SVG's `<desc>` node enumeration."""
    id: str
    title: str
    kind: str
    status: str
    related_hypotheses: "list[str]"
    source_section: str


def render_agenda_nodes(model: "AgendaModel | None" = None) -> "list[AgendaNode]":
    """The figure's node manifest — a stable ordered list `(id, title, kind, status, related_hypotheses,
    source_section)`, in declared order. Consumed by the later figure wave as the node contract; the
    surface RA5 figure-parity checks once the SVG lands (VACUOUS until then)."""
    if model is None:
        model = derive_model()
    return [
        AgendaNode(id=it.id, title=it.title, kind=it.kind, status=it.status,
                   related_hypotheses=list(it.related_hypotheses), source_section=it.source_section)
        for it in model.items
    ]


# ---- invariants (RA1-RA5, AUDIT-ONLY-first) ---------------------------------------------------------

def structural_findings(model: "AgendaModel | None" = None) -> "list[str]":
    """RA1 schema + RA2 hypothesis join + RA3 section join.

    RA1 schema — every item has a kebab-unique id, a non-empty title / one_line / source_section, a `kind`
        in the declared kinds taxonomy, and a `status` in the declared statuses taxonomy.
    RA2 hypothesis join — every related_hypotheses[] id resolves in theory_of_mage_declared.json (the weld;
        a hypothesis rename reddens the agenda build — the analogue of the industry model's IC4).
    RA3 section join — every source_section resolves to a real book chapter page (via the shared
        _book_pages resolver); a chapter rename can't silently orphan an index row.
    """
    if model is None:
        model = derive_model()
    kind_ids = model.kind_ids()
    status_ids = model.status_ids()
    hyp_ids = _hypothesis_ids()
    import re

    findings: "list[str]" = []
    seen: "set[str]" = set()
    for i, it in enumerate(model.items):
        label = it.id or f"#{i}"
        # RA1 — id shape + uniqueness.
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", it.id or ""):
            findings.append(f"RA1 item {label!r} id is not kebab-case")
        if it.id in seen:
            findings.append(f"RA1 duplicate item id {it.id!r}")
        seen.add(it.id)
        for f_name, val in (("title", it.title), ("one_line", it.one_line),
                            ("source_section", it.source_section)):
            if not str(val).strip():
                findings.append(f"RA1 item {label!r} has empty {f_name!r}")
        if it.kind not in kind_ids:
            findings.append(f"RA1 item {label!r} kind {it.kind!r} is not in the declared kinds taxonomy")
        if it.status not in status_ids:
            findings.append(f"RA1 item {label!r} status {it.status!r} is not in the declared statuses taxonomy")
        # RA2 — hypothesis join.
        for h in it.related_hypotheses:
            if hyp_ids and h not in hyp_ids:
                findings.append(f"RA2 item {label!r} hypothesis {h!r} resolves to no theory hypothesis id")
        # RA3 — section join.
        if it.source_section and _book_pages.chapter_md_path(it.source_section) is None:
            findings.append(f"RA3 item {label!r} source_section {it.source_section!r} resolves to no book chapter page")
    return findings


def count_guard_findings(model: "AgendaModel | None" = None) -> "list[str]":
    """RA4 — the ratified-count guard. A silent add/drop of an agenda item reddens (the theory model's
    EXPECT_HYPOTHESES analogue): the parity check holds the index TEXT equal, the count guard holds the SET
    size equal."""
    if model is None:
        model = derive_model()
    n = len(model.items)
    if n != EXPECT_AGENDA_ITEMS:
        return [f"RA4 count: {n} agenda items, expected {EXPECT_AGENDA_ITEMS} (an item was added or removed)"]
    return []


def parity_findings(model: "AgendaModel | None" = None) -> "list[str]":
    """RA5 — the two parity surfaces.
      - PROSE parity — the placed 'Where the frontier goes next' index table must equal
        render_frontier_prose_md() byte-for-byte. VACUOUS until the coda section lands: guarded on the
        projection's header line being present on the target page, so before placement this contributes
        nothing (and after placement a drift reddens).
      - FIGURE parity — the map SVG's `<desc>` must name every render_agenda_nodes() title. ACTIVE once the
        open-frontiers map SVG lands: guarded on the file being present, so it contributes nothing before the
        figure wave places it, and after placement a title the `<desc>` fails to name reddens (the softer
        figure analogue of the industry model's parity, run on the accessible enumeration a reader reaches
        rather than the drawn boxes).
    """
    if model is None:
        model = derive_model()
    findings: "list[str]" = []
    page = os.path.join(_BOOK, _CODA_PAGE_REL)
    # PROSE parity — active only once the coda index table is placed (header line present on the page).
    if os.path.isfile(page):
        page_md = open(page, encoding="utf-8").read()
        if _TABLE_HEADER in page_md:
            findings += page_block_parity(
                page, _TABLE_HEADER, render_frontier_prose_md(model).splitlines(),
                display=_CODA_PAGE_REL, label="research-agenda coda index",
                regen_hint="python3 book-models/research_agenda_model.py agenda-prose")
    # FIGURE parity — active once the open-frontiers map SVG lands; each node title must appear in its <desc>.
    desc = _svg_desc_text(os.path.join(_BOOK, _FIGURE_SVG_REL))
    if desc is not None:
        ndesc = _norm_node_title(desc)
        for n in render_agenda_nodes(model):
            if _norm_node_title(n.title) not in ndesc:
                findings.append(
                    f"RA5 figure-parity: node {n.id!r} title {n.title!r} is not named in "
                    f"{_FIGURE_SVG_REL}'s <desc> node enumeration (name it in the figure desc, or reconcile)")
    return findings


def _svg_desc_text(path: str) -> "str | None":
    """The visible text of an SVG's `<desc>` element, nested tags stripped and entities unescaped; None when
    the file is absent (parity stays vacuous) or carries no `<desc>`."""
    if not os.path.isfile(path):
        return None
    import html
    import re
    m = re.search(r"<desc\b[^>]*>(.*?)</desc>", open(path, encoding="utf-8").read(), re.S)
    if not m:
        return None
    return html.unescape(re.sub(r"<[^>]+>", " ", m.group(1)))


def _norm_node_title(s: str) -> str:
    """Normalize a node title / desc for the substring match: lowercase, `&`/`+` spelled as `and`, whitespace
    collapsed. Lets a title's `&`/`+` (`Development completeness & supply chain`) match a `<desc>` that spells
    it out, without the figure author restating the exact glyph."""
    import re
    return re.sub(r"\s+", " ", s.lower().replace("&", " and ").replace("+", " and ")).strip()


def all_findings(model: "AgendaModel | None" = None) -> "list[str]":
    """RA1-RA5 — the whole `[agenda]` band. Wired AUDIT-ONLY-first (rule-#55): the band PRINTS these but does
    NOT gate `catalog.py validate` on first landing; a follow-up promotes RA1-RA4 to BLOCKING once a clean
    session confirms the drain. RA5 prose-parity activates once the coda is placed; RA5 figure-parity
    activates once the open-frontiers map SVG lands."""
    if model is None:
        model = derive_model()
    return structural_findings(model) + count_guard_findings(model) + parity_findings(model)


def coverage_note(model: "AgendaModel | None" = None) -> str:
    """A one-line summary for the validate band — item count by kind + status spread, and the parity state."""
    if model is None:
        model = derive_model()
    by_kind = ", ".join(f"{len(model.items_in(k.id))} {k.id}" for k in model.kinds)
    statuses = sorted({it.status for it in model.items})
    page = os.path.join(_BOOK, _CODA_PAGE_REL)
    placed = os.path.isfile(page) and _TABLE_HEADER in open(page, encoding="utf-8").read()
    prose = "ACTIVE" if placed else "vacuous (coda not yet placed)"
    fig = "ACTIVE" if os.path.isfile(os.path.join(_BOOK, _FIGURE_SVG_REL)) else "vacuous (SVG not yet placed)"
    return (f"{len(model.items)} agenda items ({by_kind}) · statuses: {', '.join(statuses)} · "
            f"RA5 prose-parity {prose}, figure-parity {fig}")


# ---- CLI --------------------------------------------------------------------------------------------

def _cmd_agenda_prose() -> int:
    print(render_frontier_prose_md())
    return 0


def _cmd_nodes() -> int:
    for n in render_agenda_nodes():
        anchors = ", ".join(n.related_hypotheses) or "—"
        print(f"{n.id:<32} [{n.kind:<14} {n.status:<12}] {n.title}")
        print(f"{'':<32}  anchors: {anchors}  home: {n.source_section}")
    return 0


def _cmd_show() -> int:
    model = derive_model()
    for kind in model.kinds:
        group = model.items_in(kind.id)
        if not group:
            continue
        print(f"{kind.label}:")
        for it in group:
            print(f"  [{it.status:<12}] {it.title}  ({it.home_title})")
            print(f"                 {it.one_line}")
    print(f"\n{len(model.items)} agenda items · {len(model.kinds)} kinds · {len(model.statuses)} statuses")
    return 0


def _cmd_verify() -> int:
    model = derive_model()
    findings = all_findings(model)
    print(f"research-agenda: {coverage_note(model)}")
    if findings:
        print(f"research-agenda: {len(findings)} finding(s) (AUDIT-ONLY this wave — does not gate validate):")
        for f in findings:
            print(f"  {f}")
        return 1
    print("research-agenda: schema + joins clean (RA1 schema + RA2 hypothesis-join + RA3 section-join + "
          "RA4 count; RA5 prose-parity + figure-parity per coverage note)")
    return 0


def main(argv: "list[str]") -> int:
    cmd = argv[1] if len(argv) > 1 else "verify"
    if cmd == "verify":
        return _cmd_verify()
    if cmd == "agenda-prose":
        return _cmd_agenda_prose()
    if cmd == "nodes":
        return _cmd_nodes()
    if cmd == "show":
        return _cmd_show()
    print(f"usage: {argv[0]} [verify|agenda-prose|nodes|show]")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
