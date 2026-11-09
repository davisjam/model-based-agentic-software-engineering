"""The three Chapter 6 research directions as a typed, drift-checked index.

Active joins resolve only against the four theoretical propositions. RA1–RA4
check schema, proposition and source joins, and the authored count. RA5 checks
each direction's heading exactly once in its actual source page. The optional
index-table and node-manifest renderers remain available to tooling; neither is
a separate authored book surface or a parity target.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field

import chapter_identity_model as chapter_identity  # sibling in book-models/; the chapter surrogate-key model
import _book_pages  # sibling in book-models/; the shared chapter-page resolver (RA3 section join)

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)  # the governance-catalog repo root (book-models/ is one level down)
_BOOK = os.path.join(_ROOT, "book")
_DECLARED = os.path.join(_HERE, "research_agenda_declared.json")
_THEORY_DECLARED = os.path.join(_HERE, "theory_of_mage_declared.json")

#: The ratified count — encode the author's set so a silent add/drop reddens (the theory model's
#: EXPECT_PROPOSITIONS analogue: the count guard is the backstop against silent agenda drift).
EXPECT_AGENDA_ITEMS = 3

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
    taxonomies; `related_propositions` are ids that resolve against the theory model (the weld to the testable
    substrate); `source_section` is the home chapter that expands it."""
    id: str
    title: str
    kind: str
    status: str
    one_line: str
    source_section: str
    related_propositions: "list[str]" = field(default_factory=list)

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
            related_propositions=list(a.get("related_propositions", []) or []),
        )
        for a in raw.get("agenda", [])
    ]
    return AgendaModel(kinds=_taxa(raw, "kinds"), statuses=_taxa(raw, "statuses"), items=items)


def _proposition_ids() -> "set[str]":
    """Every active proposition id declared in the theory model — the RA2 join universe (IC4's
    analogue: the agenda references P1–P4, single-sourced in the theory model)."""
    if not os.path.exists(_THEORY_DECLARED):
        return set()
    with open(_THEORY_DECLARED, encoding="utf-8") as fh:
        raw = json.load(fh)
    ids: "set[str]" = set()
    for h in raw.get("propositions", []):
        if h.get("id"):
            ids.add(h["id"])
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
    related_propositions: "list[str]"
    source_section: str


def render_agenda_nodes(model: "AgendaModel | None" = None) -> "list[AgendaNode]":
    """The figure's node manifest — a stable ordered list `(id, title, kind, status, related_propositions,
    source_section)`, in declared order. Consumed by the later figure wave as the node contract; the
    surface RA5 figure-parity checks once the SVG lands (VACUOUS until then)."""
    if model is None:
        model = derive_model()
    return [
        AgendaNode(id=it.id, title=it.title, kind=it.kind, status=it.status,
                   related_propositions=list(it.related_propositions), source_section=it.source_section)
        for it in model.items
    ]


# ---- invariants (RA1-RA5, AUDIT-ONLY-first) ---------------------------------------------------------

def structural_findings(model: "AgendaModel | None" = None) -> "list[str]":
    """RA1 schema + RA2 proposition join + RA3 section join.

    RA1 schema — every item has a kebab-unique id, a non-empty title / one_line / source_section, a `kind`
        in the declared kinds taxonomy, and a `status` in the declared statuses taxonomy.
    RA2 proposition join — every related_propositions[] id resolves in theory_of_mage_declared.json (the weld;
        a proposition rename reddens the agenda build — the analogue of the industry model's IC4).
    RA3 section join — every source_section resolves to a real book chapter page (via the shared
        _book_pages resolver); a chapter rename can't silently orphan an index row.
    """
    if model is None:
        model = derive_model()
    kind_ids = model.kind_ids()
    status_ids = model.status_ids()
    hyp_ids = _proposition_ids()
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
        # RA2 — proposition join.
        for h in it.related_propositions:
            if h not in hyp_ids:
                findings.append(f"RA2 item {label!r} proposition {h!r} resolves to no theory proposition id")
        # RA3 — section join.
        if it.source_section and _book_pages.chapter_md_path(it.source_section) is None:
            findings.append(f"RA3 item {label!r} source_section {it.source_section!r} resolves to no book chapter page")
    return findings


def count_guard_findings(model: "AgendaModel | None" = None) -> "list[str]":
    """RA4 — the ratified-count guard. A silent add/drop of an agenda item reddens (the theory model's
    EXPECT_PROPOSITIONS analogue): the parity check holds the index TEXT equal, the count guard holds the SET
    size equal."""
    if model is None:
        model = derive_model()
    n = len(model.items)
    if n != EXPECT_AGENDA_ITEMS:
        return [f"RA4 count: {n} agenda items, expected {EXPECT_AGENDA_ITEMS} (an item was added or removed)"]
    return []


def parity_findings(model: "AgendaModel | None" = None) -> "list[str]":
    """Each active research direction must occur exactly once as a heading in its actual home.

    The retired coda table and unused seven-topic SVG are no longer projection targets.
    The active three-direction index follows the native-source Markdown projection.
    """
    import re
    if model is None:
        model = derive_model()
    findings = []
    for item in model.items:
        page = _book_pages.chapter_md_path(item.source_section)
        if not page or not os.path.isfile(page):
            findings.append(f"RA5 research direction {item.id!r} has no source page")
            continue
        with open(page, encoding="utf-8") as source:
            content = source.read()
        matches = re.findall(r"^#{1,6} +" + re.escape(item.title) + r"(?: \{[^}]*\})? *$", content, re.M)
        if len(matches) != 1:
            findings.append(f"RA5 research direction {item.id!r} heading {item.title!r} occurs {len(matches)} times")
    return findings


def all_findings(model: "AgendaModel | None" = None) -> "list[str]":
    """Schema, strict joins, count, and actual source-heading parity."""
    if model is None:
        model = derive_model()
    return structural_findings(model) + count_guard_findings(model) + parity_findings(model)


def coverage_note(model: "AgendaModel | None" = None) -> str:
    """A one-line summary for the validate band — item count by kind + status spread, and the parity state."""
    if model is None:
        model = derive_model()
    by_kind = ", ".join(f"{len(model.items_in(k.id))} {k.id}" for k in model.kinds)
    statuses = sorted({it.status for it in model.items})
    return (f"{len(model.items)} research directions ({by_kind}) · statuses: {', '.join(statuses)} · "
            "RA5 source-heading parity active")


# ---- CLI --------------------------------------------------------------------------------------------

def _cmd_agenda_prose() -> int:
    print(render_frontier_prose_md())
    return 0


def _cmd_nodes() -> int:
    for n in render_agenda_nodes():
        anchors = ", ".join(n.related_propositions) or "—"
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
        print(f"research-agenda: {len(findings)} finding(s):")
        for f in findings:
            print(f"  {f}")
        return 1
    print("research-agenda: schema + joins clean (RA1 schema + RA2 proposition-join + RA3 section-join + "
          "RA4 count; RA5 source-heading parity)")
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
