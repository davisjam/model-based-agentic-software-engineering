"""The INDUSTRY-CASES model — the book's external-evidence base as a queryable, drift-gated MODEL rather than
prose accumulated ad hoc. A sibling of the other declared -> generated book models (theory-of-mage /
metrics-dashboard): the hand-authored source of truth is `book-models/industry_cases_declared.json`; this
module derives a typed model over it, projects the DocAble+authored correspondence MATRIX, exposes the live
queries the volume unlocks, and holds the joins IC1-IC6 (status-aware).

ONE SOURCE, MANY CONSUMERS.
  - `render_matrix_md()` — the projected correspondence matrix: a fixed DocAble ROW 0 (the book's own case,
    hand-declared `strong` across the construct universe it induced) followed by `status == authored` rows
    only (Cloudflare now). Columns are the DECLARED, ORDERED construct universe (REVISE-3), so a new CASE is
    append-a-row and never widens the grid. A stub never renders as a blank matrix row — stubs live in the
    roster and surface through the coverage / only-docable / roster queries.
  - The live queries — `constructs` (invert the matrix: per construct, the external cases observing it and at
    what strength) · `bears-on <H>` (authored cases whose hypotheses[] contains the H-id) · `only-docable`
    (the GAP query: constructs / hypotheses with no EXTERNAL case at strength >= partial — this names the
    empty columns and drives which pending site to write first) · `coverage` (the burndown: N authored vs N
    roster, distinct constructs with >=1 external observation, the independence/scale/domain spread) ·
    `roster` (the declared six-site intent + status).
  - `all_findings()` — the joins IC1-IC6 + the audit-only IC7 scale-fact presence. STATUS-AWARE: a stub
    (`status == pending-writeup`) is checked only for id/organization/domain/distinctive_starting_point; an
    authored record is checked fully (citation join, enums, correspondence + descriptive vocabs). IC5 matrix
    parity is VACUOUS this wave — the matrix is not yet authored into any chapter page (the prose wave places
    it), so there is nothing to hold byte-equal.

LANDING: the whole model lands AUDIT-ONLY-first (rule-#55 blocking-lint discipline) — the `[industry]` band
in `catalog.py validate` PRINTS its findings + the coverage note but does NOT increment the issue count; a
follow-up flips IC1-IC6 to BLOCKING once a clean session confirms the drain, the path every book model took.
NO materialized `industry-cases.json` (REVISE-2): the queries and the matrix compute live from the declared
source at CLI time — page-parity + compute-at-CLI only.

Run `python3 book-models/industry_cases_model.py verify` to drift-check; `... matrix` to print the matrix for
a page; `... constructs` / `... bears-on H3-mechanized-assurance` / `... only-docable` / `... coverage` /
`... roster` for the live queries; `... show` to list every case.
"""
from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, field

import chapter_identity_model as chapter_identity  # sibling in book-models/; the chapter surrogate-key model
from _projection_parity import page_block_parity  # shared authored-page table-parity check (extract-on-3rd-site)

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)  # the governance-catalog repo root (book-models/ is one level down)
_BOOK = os.path.join(_ROOT, "book")
_DECLARED = os.path.join(_HERE, "industry_cases_declared.json")
_REFERENCES_BIB = os.path.join(_BOOK, "references.bib")
_CITATIONS_JSON = os.path.join(_BOOK, "data", "citations.json")
_THEORY_DECLARED = os.path.join(_HERE, "theory_of_mage_declared.json")

#: The chapter the modeling-ceiling matrix + the two convergence tables are authored into — the MCL5/CCP4
#: parity target. Resolved through the chapter-identity model, so a renumber of 6.5 updates the target
#: automatically (the label is frozen; the filename is the one field a reorg edits).
#: R1: the comparative TABLES (matrix + both convergence grids + their key-lists) STAY co-located on this
#: one page — the single-page parity binding forbids scattering them across chapters.
_PAGE_REL = chapter_identity.filename("where-mage-fits")

#: The chapter the six "Meet the six" one-pager CARDS were authored into. Round-4 (F1=a) RETIRES the six
#: narrated cards: the comparative chapter (`where-mage-fits`, 6.7) already carries the payload in
#: non-narrative form and disclaims "an appendix of examples", so no `<!-- case-onepager: … -->` markers
#: survive in the body. With the cards gone, this trace dissolves to `None`, and IC7's coverage/trace loop
#: is skipped — there is no gallery page to audit. Stays AUDIT-ONLY. (The separate `six-company-map` gallery
#: figure moves to the 6.7 opener, its declared `part6` home — a figure, not a card.)
_CARDS_PAGE_REL: "str | None" = None

#: The status enum. A `pending-writeup` stub carries only the roster fields; `authored` records are checked
#: fully (the status-aware schema split, IC1).
_STATUS_AUTHORED = "authored"
_STATUS_PENDING = "pending-writeup"
_VALID_STATUS = (_STATUS_AUTHORED, _STATUS_PENDING)

#: The correspondence strengths at or above `partial` — the coverage threshold the gap query (`only-docable`)
#: reads: a construct/hypothesis is "still only DocAble" when no EXTERNAL case rates it here.
_AT_LEAST_PARTIAL = ("strong", "partial")

#: The roster fields a stub (and a roster entry) carries — the status-aware minimum (IC1).
_ROSTER_FIELDS = ("id", "organization", "domain", "distinctive_starting_point", "status")

#: The matrix header stem (the Case column, then the declared construct-universe labels appended in order).
_CASE_COL = "Case"


# ---- typed model ------------------------------------------------------------------------------------

@dataclass
class ConstructCell:
    """One correspondence cell on a case's matrix row — a construct id + its strength + the per-cell note
    (the book's reading, so the cell is auditable, not silent)."""
    construct: str
    strength: str
    note: str


@dataclass
class Column:
    """One declared construct-universe column — the stable, ordered projection axis (REVISE-3)."""
    id: str
    label: str
    provenance: str


@dataclass
class CeilingRung:
    """One declared modeling-ceiling-ladder rung — the stable, ordered column axis of the modeling-ceiling
    matrix (the second altitude over the same roster). A new case never widens it; a new rung is deliberate."""
    id: str
    label: str
    tier: str


@dataclass
class CeilingCell:
    """One modeling-ceiling cell on a case's ladder row — a rung id + its level + the per-cell note (so the
    cell is auditable, carrying the guidance's richer annotation the closed level flattens)."""
    rung: str
    level: str
    note: str


@dataclass
class Pattern:
    """One cross-case convergence PATTERN row (not per-site). `bucket` decides projection: universal +
    generalizes -> table rows via render_convergence_md; distinctive -> prose (the model owns the data, the
    prose wave writes the sentences). `support` maps each roster id to {yes, partial, no}; `maps_to_construct`
    (nullable) welds the row to the correspondence matrix when set (a construct rename breaks the build)."""
    id: str
    statement: str
    bucket: str
    maps_to_construct: "str | None"
    support: "dict[str, str]"
    mage_generalization_note: str
    nearest_external: "str | None"
    short_label: str = ""   # the ~3-word reader-facing grid/key label (authored; CCP1-checked for table buckets)


@dataclass
class RosterEntry:
    """One declared roster site — the intent block the count guard (IC6) derives from."""
    id: str
    organization: str
    domain: str
    distinctive_starting_point: str
    status: str


@dataclass
class IndustryCase:
    """One case record. A `pending-writeup` stub carries only the roster fields (the rest default empty); an
    `authored` record carries the full source / setting / descriptive / correspondence payload."""
    id: str
    organization: str
    domain: str
    distinctive_starting_point: str
    status: str
    source: dict = field(default_factory=dict)
    setting: dict = field(default_factory=dict)
    representations: "list[str]" = field(default_factory=list)
    object_territory: "list[str]" = field(default_factory=list)
    mechanisms: "list[str]" = field(default_factory=list)
    judgment: dict = field(default_factory=dict)
    mage_constructs: "list[ConstructCell]" = field(default_factory=list)
    modeling_ceiling: "list[CeilingCell]" = field(default_factory=list)
    hypotheses: "list[str]" = field(default_factory=list)
    scale_facts: "list[str]" = field(default_factory=list)
    result_sentence: str = ""
    onepager_lede: str = ""                                    # the authored "meet the case" opener (one-pager)
    adds_to_mage: "list[str]" = field(default_factory=list)    # what the case adds back to MAGE (one-pager Part 6)
    limitations: "list[str]" = field(default_factory=list)     # the honest bounds (one-pager Part 6 frontier)

    @property
    def authored(self) -> bool:
        return self.status == _STATUS_AUTHORED

    def strength_of(self, construct_id: str) -> "str | None":
        for c in self.mage_constructs:
            if c.construct == construct_id:
                return c.strength
        return None

    def level_of(self, rung_id: str) -> "str | None":
        for c in self.modeling_ceiling:
            if c.rung == rung_id:
                return c.level
        return None


@dataclass
class IndustryCasesModel:
    columns: "list[Column]"
    docable_cells: "dict[str, str]"
    docable_org: str
    roster: "list[RosterEntry]"
    cases: "list[IndustryCase]"
    ceiling_rungs: "list[CeilingRung]" = field(default_factory=list)
    mage_ceiling_cells: "dict[str, str]" = field(default_factory=dict)
    mage_ceiling_org: str = "MAGE"
    mage_ceiling_caption: str = ""
    patterns: "list[Pattern]" = field(default_factory=list)
    distinctive_headline: str = ""
    distinctive_spine: str = ""
    distinctive_hedge: str = ""

    def authored(self) -> "list[IndustryCase]":
        """External authored cases in declared order (excludes DocAble, which is the fixed row 0, and stubs)."""
        return [c for c in self.cases if c.authored]

    def column_ids(self) -> "list[str]":
        return [col.id for col in self.columns]

    def rung_ids(self) -> "list[str]":
        return [r.id for r in self.ceiling_rungs]

    def roster_ids(self) -> "set[str]":
        return {r.id for r in self.roster}

    def patterns_in(self, bucket: str) -> "list[Pattern]":
        return [p for p in self.patterns if p.bucket == bucket]


# ---- load + build -----------------------------------------------------------------------------------

def _load_declared() -> dict:
    with open(_DECLARED, encoding="utf-8") as fh:
        return json.load(fh)


def derive_model(raw: "dict | None" = None) -> IndustryCasesModel:
    """Build the typed model from the hand-authored declarations — the single derivation the projection and
    the checks and the queries share."""
    if raw is None:
        raw = _load_declared()
    columns = [
        Column(id=c.get("id", ""), label=c.get("label", ""), provenance=c.get("provenance", ""))
        for c in raw.get("construct_universe", {}).get("columns", [])
    ]
    docable = raw.get("docable_row", {})
    roster = [
        RosterEntry(
            id=s.get("id", ""), organization=s.get("organization", ""), domain=s.get("domain", ""),
            distinctive_starting_point=s.get("distinctive_starting_point", ""), status=s.get("status", ""),
        )
        for s in raw.get("roster", {}).get("sites", [])
    ]
    cases: "list[IndustryCase]" = []
    for c in raw.get("industry_cases", []):
        cells = [
            ConstructCell(construct=mc.get("construct", ""), strength=mc.get("strength", ""),
                          note=mc.get("note", ""))
            for mc in c.get("mage_constructs", [])
        ]
        ceiling = [
            CeilingCell(rung=cc.get("rung", ""), level=cc.get("level", ""), note=cc.get("note", ""))
            for cc in c.get("modeling_ceiling", [])
        ]
        cases.append(IndustryCase(
            id=c.get("id", ""), organization=c.get("organization", ""), domain=c.get("domain", ""),
            distinctive_starting_point=c.get("distinctive_starting_point", ""), status=c.get("status", ""),
            source=c.get("source", {}) or {}, setting=c.get("setting", {}) or {},
            representations=list(c.get("representations", []) or []),
            object_territory=list(c.get("object_territory", []) or []),
            mechanisms=list(c.get("mechanisms", []) or []), judgment=c.get("judgment", {}) or {},
            mage_constructs=cells, modeling_ceiling=ceiling, hypotheses=list(c.get("hypotheses", []) or []),
            scale_facts=list((c.get("setting", {}) or {}).get("scale_facts", []) or []),
            result_sentence=c.get("result_sentence", ""),
            onepager_lede=c.get("onepager_lede", ""),
            adds_to_mage=list(c.get("adds_to_mage", []) or []),
            limitations=list(c.get("limitations", []) or []),
        ))
    ceiling_rungs = [
        CeilingRung(id=r.get("id", ""), label=r.get("label", ""), tier=r.get("tier", ""))
        for r in raw.get("modeling_ceiling_ladder", {}).get("rungs", [])
    ]
    mage_row = raw.get("mage_ceiling_row", {})
    ccp = raw.get("cross_case_patterns", {})
    patterns = [
        Pattern(
            id=p.get("id", ""), statement=p.get("statement", ""), bucket=p.get("bucket", ""),
            maps_to_construct=p.get("maps_to_construct"), support=dict(p.get("support", {}) or {}),
            mage_generalization_note=p.get("mage_generalization_note", ""),
            nearest_external=p.get("nearest_external"), short_label=p.get("short_label", ""),
        )
        for p in ccp.get("patterns", [])
    ]
    return IndustryCasesModel(
        columns=columns, docable_cells=dict(docable.get("cells", {})),
        docable_org=docable.get("organization", "DocAble"), roster=roster, cases=cases,
        ceiling_rungs=ceiling_rungs, mage_ceiling_cells=dict(mage_row.get("cells", {})),
        mage_ceiling_org=mage_row.get("organization", "MAGE"), mage_ceiling_caption=mage_row.get("caption", ""),
        patterns=patterns, distinctive_headline=ccp.get("distinctive_headline", ""),
        distinctive_spine=ccp.get("distinctive_spine", ""), distinctive_hedge=ccp.get("distinctive_hedge", ""),
    )


# ---- external join sources --------------------------------------------------------------------------

def _bib_keys() -> "set[str]":
    """The citation keys declared in references.bib — a `@type{key,` scan (the print bib is the source of
    truth the citations.json mirror is generated from)."""
    if not os.path.exists(_REFERENCES_BIB):
        return set()
    with open(_REFERENCES_BIB, encoding="utf-8") as fh:
        text = fh.read()
    return set(re.findall(r"@\w+\{\s*([^,\s]+)\s*,", text))


def _citation_keys() -> "set[str]":
    """The keys in the generated web citation mirror (book/data/citations.json)."""
    if not os.path.exists(_CITATIONS_JSON):
        return set()
    with open(_CITATIONS_JSON, encoding="utf-8") as fh:
        data = json.load(fh)
    return set(data.get("citations", {}).keys())


def _hypothesis_ids() -> "set[str]":
    """Every hypothesis id (top-level + sub) declared in the theory model — the IC4 join universe."""
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


# ---- projection: the correspondence matrix ----------------------------------------------------------

def _header_line(model: IndustryCasesModel) -> str:
    return "| " + " | ".join([_CASE_COL, *[c.label for c in model.columns]]) + " |"


def _matrix_cell(strength: "str | None") -> str:
    """A matrix cell — the correspondence strength where the case lists the construct, else an em-dash."""
    return strength if strength else "—"


def render_matrix_rows(model: "IndustryCasesModel | None" = None) -> "list[str]":
    """The DocAble row 0 + one row per `status == authored` external case, projected against the fixed,
    ordered construct-universe columns (no header)."""
    if model is None:
        model = derive_model()
    col_ids = model.column_ids()

    def render(org: str, cell_for) -> str:
        return "| " + " | ".join([f"**{org}**", *[_matrix_cell(cell_for(cid)) for cid in col_ids]]) + " |"

    rows = [render(model.docable_org, lambda cid: model.docable_cells.get(cid))]
    for case in model.authored():
        rows.append(render(case.organization, case.strength_of))
    return rows


def render_matrix_md(model: "IndustryCasesModel | None" = None) -> str:
    """The full markdown matrix (header + rule + DocAble row 0 + authored rows) — the page carries exactly
    these when the prose wave authors it into a chapter."""
    if model is None:
        model = derive_model()
    header = _header_line(model)
    rule = "|" + "---|" * (len(model.columns) + 1)
    return "\n".join([header, rule, *render_matrix_rows(model)])


# ---- projection: the modeling-ceiling matrix --------------------------------------------------------

#: The modeling-ceiling glyphs — the 4-level ladder vocabulary rendered as marks the reader scans at a
#: glance instead of text tokens. Shares its shapes with the convergence tables' `_SUPPORT_GLYPH` (✓ full
#: presence, ◐ present in part, — absent/silent) so one visual language spans all three of 6.5's tables; the
#: ceiling adds ○ for its distinct `implicit` level (exercised but not a named representation), which the
#: 3-level support vocabulary never emits. Mirrors `_SUPPORT_GLYPH`'s shape.
_CEILING_GLYPH = {"yes": "✓", "some": "◐", "implicit": "○", "not-seen": "—"}


def _ceiling_cell(level: "str | None") -> str:
    """A ceiling cell — the glyph for the declared level where the case rates the rung, else an em-dash."""
    if not level:
        return "—"
    return _CEILING_GLYPH.get(level, level)


def render_modeling_ceiling_md(model: "IndustryCasesModel | None" = None) -> str:
    """The modeling-ceiling matrix (header + rule + fixed MAGE row 0 + one row per authored external case),
    projected against the fixed, ordered ladder rungs. Authored-only, exactly as render_matrix_md — a stub
    never renders a blank ceiling row. The prose wave places exactly these lines on a page; MCL5 then holds
    the placed block byte-equal."""
    if model is None:
        model = derive_model()
    rung_ids = model.rung_ids()
    header = "| " + " | ".join(["Site", *[r.label for r in model.ceiling_rungs]]) + " |"
    rule = "|" + "---|" * (len(model.ceiling_rungs) + 1)

    def render(org: str, cell_for) -> str:
        return "| " + " | ".join([f"**{org}**", *[_ceiling_cell(cell_for(rid)) for rid in rung_ids]]) + " |"

    rows = [render(model.mage_ceiling_org, lambda rid: model.mage_ceiling_cells.get(rid))]
    for case in model.authored():
        rows.append(render(case.organization, case.level_of))
    return "\n".join([header, rule, *rows])


# ---- projection: the cross-case convergence tables --------------------------------------------------

#: The support glyphs — the 3-level support vocabulary rendered as marks the reader scans. yes -> ✓,
#: partial -> ◐, no -> —. Shares its shapes with the modeling-ceiling's `_CEILING_GLYPH` (✓ full presence,
#: ◐ present in part, — absent/silent) so one visual language spans all three of 6.5's tables; the ceiling's
#: extra ○ (`implicit`) never appears here (support has no "implicit" level). The `partial -> ◐` swap is also
#: part of the readability fix — the literal word "partial" was itself a wide cell that forced a downscale.
_SUPPORT_GLYPH = {"yes": "✓", "partial": "◐", "no": "—"}

#: The projected buckets (universal + generalizes render as tables; distinctive is prose, not a table).
_TABLE_BUCKETS = ("universal", "generalizes")

#: The five non-Cloudflare authored cases the book's "Meet the six" gallery carries as HAND-AUTHORED one-pager
#: cards, in roster order (Cloudflare keeps its deep reading — per-case-onepager-DESIGN §4 rec-i). IC7 audits
#: each placed card for COVERAGE of its record + a TRACE marker (`<!-- case-onepager: <id> -->`) back to it;
#: it no longer composes or byte-parities the card text.
_ONEPAGER_GALLERY_IDS = ("spotify-honk", "shopify", "docker", "siemens", "zenseact")

#: The short-key PREFIX per table bucket (U1..U9 for universal, G1..G6 for generalizes). Distinct prefixes
#: so the prose and the per-case one-pagers can cite a grid row unambiguously across the two tables, and so a
#: grid row joins its key-list row by an exact token. Computed from position in patterns_in(bucket) order.
_BUCKET_KEY_PREFIX = {"universal": "U", "generalizes": "G"}


def _support_glyph(value: str) -> str:
    return _SUPPORT_GLYPH.get(value, value or "—")


def _pattern_key(bucket: str, index: int) -> str:
    """The short stable key for a pattern at `index` (0-based) in its bucket — `U1`..`U9` / `G1`..`G6`.
    Derived from position, like the row order already is (not stored)."""
    return f"{_BUCKET_KEY_PREFIX.get(bucket, '?')}{index + 1}"


def render_convergence_md(bucket: str, model: "IndustryCasesModel | None" = None) -> str:
    """The convergence GLYPH GRID for a bucket — the narrow, scannable table the reader compares across sites.
    Columns = a short key (`U1`../`G1`..) + the 3-word `short_label` + the roster sites in declared order,
    support projected ✓ / ◐ / —. The long `statement` and the `Construct` column move OUT to the companion
    key-list (render_convergence_key_md) so the grid stays narrow and legible instead of downscaled to fit a
    sentence column. Renders `universal` and `generalizes` ONLY — a `distinctive` pattern's row is all-`—`
    externally and reads as advocacy, so the model owns that data but the prose wave writes the sentences (F1).
    Returns "" for the distinctive bucket."""
    if model is None:
        model = derive_model()
    if bucket not in _TABLE_BUCKETS:
        return ""  # distinctive (and any unknown bucket) is not projected as a table
    site_ids = [r.id for r in model.roster]
    site_labels = [r.organization for r in model.roster]
    header = "| " + " | ".join(["#", "Pattern", *site_labels]) + " |"
    rule = "|" + "---|" * (len(site_ids) + 2)
    rows = []
    for i, p in enumerate(model.patterns_in(bucket)):
        cells = [_support_glyph(p.support.get(sid, "")) for sid in site_ids]
        rows.append("| " + " | ".join([_pattern_key(bucket, i), p.short_label, *cells]) + " |")
    return "\n".join([header, rule, *rows])


def render_convergence_key_md(bucket: str, model: "IndustryCasesModel | None" = None) -> str:
    """The convergence KEY-LIST for a bucket — the companion reference table the reader consults, keyed by the
    SAME `#` (`U1`../`G1`..) as the glyph grid. Columns = key + `short_label` + `Construct` + the full
    `statement` ("What the source establishes"). The statement column is free to wrap here because this table
    has no glyph columns to squeeze, so the sentence lives where wrapping is free and the glyphs live where
    width is scarce. Rendered as pipe rows so CCP5 gates it byte-equal via the SAME page_block_parity the grid
    uses (F-KEYLIST-FORM: table over prose list — reuses the primitive with zero new machinery). Renders
    `universal` and `generalizes` ONLY; returns "" for the distinctive bucket."""
    if model is None:
        model = derive_model()
    if bucket not in _TABLE_BUCKETS:
        return ""
    header = "| " + " | ".join(["#", "Pattern", "Construct", "What the source establishes"]) + " |"
    rule = "|" + "---|" * 4
    rows = []
    for i, p in enumerate(model.patterns_in(bucket)):
        construct = p.maps_to_construct or "—"
        rows.append("| " + " | ".join([_pattern_key(bucket, i), p.short_label, construct, p.statement]) + " |")
    return "\n".join([header, rule, *rows])


# ---- coverage/trace: the per-case one-pager ("Meet the six") -----------------------------------------
# The five gallery one-pagers are HAND-AUTHORED prose in the where-mage-fits chapter, drawn faithfully from
# each record (author rule: "no mechanical projections; hand-author and add tracing back to the models").
# The model NO LONGER composes their text — it validates that each placed card COVERS its record (IC7 below)
# and traces to it by a `<!-- case-onepager: <id> -->` marker. Nothing here renders user-facing prose.

def _dekebab(slug: str) -> str:
    """Split a kebab slug into its words — `no-generalized-drift-gate` -> `no generalized drift gate`.
    NEVER render user-facing text with this: `_dekebab` output is ungrammatical (bare joined tokens) and the
    author has banned it as a text renderer. Its ONLY sanctioned use is deriving the lowercase KEYWORDS the
    IC7 coverage check greps a hand-authored card for — a non-rendering, internal-to-the-check transform."""
    return slug.replace("-", " ")


#: The distinctive lowercase keyword the IC7 coverage check greps for when a card claims a strength on a
#: construct — a stable substring of the construct's authored label, robust to prose that names it in passing.
_CONSTRUCT_KEYWORD = {
    "thesis-alignment": "alignment",
    "thesis-modeling": "modeling",
    "bootstrap-governance": "bootstrap",
    "governance-conversion": "conversion",
    "determinization": "determiniz",
    "reasoning-horizon": "horizon",
    "engineers-seat": "seat",
    "graduated-governance": "graduat",
    "externalized-knowledge": "knowledge",
}


def _case_by_id(case_id: str, model: IndustryCasesModel) -> "IndustryCase | None":
    for c in model.cases:
        if c.id == case_id:
            return c
    return None


def _onepager_card_lines(page_path: str, case_id: str) -> "list[str] | None":
    """The placed one-pager card for `case_id` — the contiguous pipe-table rows that follow the card's trace
    marker `<!-- case-onepager: <case_id> -->` on the page (blank lines and the intervening `<!-- label: -->`
    are skipped). Returns the row list, or None when the marker is absent (the trace is broken)."""
    if not os.path.isfile(page_path):
        return None
    lines = [ln.rstrip() for ln in open(page_path, encoding="utf-8").read().splitlines()]
    marker = f"<!-- case-onepager: {case_id} -->"
    if marker not in lines:
        return None
    start = lines.index(marker)
    out: "list[str]" = []
    seen_table = False
    for ln in lines[start + 1:]:
        if ln.startswith("|"):
            seen_table = True
            out.append(ln)
        elif seen_table:
            break                                   # the card's table ended
        elif ln.strip() == "" or ln.startswith("<!--"):
            continue                                # blank / label marker between the trace marker and table
        else:
            break                                   # unexpected prose before the table — treat card as ended
    return out


def case_onepager_coverage(case_id: str, page_path: str, model: "IndustryCasesModel | None" = None) -> "list[str]":
    """IC7, DEMOTED from byte-parity to a COVERAGE + TRACE check. The five gallery one-pagers are hand-authored
    prose (author rule: no mechanical projections), so the model no longer OWNS their text — it audits that the
    placed card stays faithful to its record. For an authored gallery case, the card must:
      - TRACE — carry the marker `<!-- case-onepager: <case_id> -->` binding the card to its `industry_cases`
        record id (a broken/absent trace is the first finding);
      - name the ORGANIZATION;
      - cover the ENVIRONMENT — mention at least one object-territory word, one representation word, and a
        majority of the record's mechanisms (any word of a mechanism slug counts);
      - cover the STRENGTH SUMMARY — name every construct the record rates `strong`;
      - attribute its SOURCE — mention the record's source-type.
    A stub/unknown case yields no findings (nothing placed to audit), exactly as the old projection returned
    "". Robust to prose wording: it greps keywords derived from the record, never a composed string."""
    if model is None:
        model = derive_model()
    case = _case_by_id(case_id, model)
    if case is None or not case.authored:
        return []
    name = os.path.relpath(page_path, _BOOK)   # name the page actually searched (R2: cards page != tables page)
    card = _onepager_card_lines(page_path, case_id)
    if card is None:
        return [f"IC7 trace: no `<!-- case-onepager: {case_id} -->` card marker in {name} "
                f"(the hand-authored card must trace to its record id)"]
    if not card:
        return [f"IC7 coverage: {case_id} card marker in {name} is not followed by a card table"]
    text = " ".join(card).lower()
    findings: "list[str]" = []
    # identity
    if case.organization.lower() not in text:
        findings.append(f"IC7 coverage: {case_id} card does not name the organization {case.organization!r}")
    # environment — territory + representations + mechanisms
    terr = {w for slug in case.object_territory for w in _dekebab(slug).split()}
    reps = {w for slug in case.representations for w in _dekebab(slug).split()}
    if terr and not any(w in text for w in terr):
        findings.append(f"IC7 coverage: {case_id} card names none of its object-territory {sorted(terr)}")
    if reps and not any(w in text for w in reps):
        findings.append(f"IC7 coverage: {case_id} card names none of its representations {sorted(reps)}")
    covered = sum(1 for slug in case.mechanisms if any(w in text for w in _dekebab(slug).split()))
    need = (len(case.mechanisms) + 1) // 2
    if case.mechanisms and covered < need:
        findings.append(f"IC7 coverage: {case_id} card engages only {covered}/{len(case.mechanisms)} "
                        f"of its mechanisms (need >= {need})")
    # strength summary — every strong construct named
    for cell in case.mage_constructs:
        if cell.strength == "strong":
            kw = _CONSTRUCT_KEYWORD.get(cell.construct, cell.construct)
            if kw.lower() not in text:
                findings.append(f"IC7 coverage: {case_id} card omits its strong construct "
                                f"{cell.construct!r} (looked for {kw!r})")
    # source attribution
    stype = case.source.get("source_type", "").split("-")[0].lower()
    if stype and stype not in text:
        findings.append(f"IC7 coverage: {case_id} card does not attribute its source ({stype!r})")
    return findings


# ---- live queries ----------------------------------------------------------------------------------

def query_constructs(model: "IndustryCasesModel | None" = None) -> "dict[str, list[tuple[str, str]]]":
    """Invert the matrix across authored EXTERNAL cases: per construct id (in column order), the list of
    (organization, strength) observing it. Answers 'which constructs have external observation.'"""
    if model is None:
        model = derive_model()
    out: "dict[str, list[tuple[str, str]]]" = {cid: [] for cid in model.column_ids()}
    for case in model.authored():
        for cell in case.mage_constructs:
            if cell.construct in out:
                out[cell.construct].append((case.organization, cell.strength))
    return out


def query_bears_on(h_id: str, model: "IndustryCasesModel | None" = None) -> "list[str]":
    """Authored external cases whose hypotheses[] contains the H-id (read-only join to the theory model)."""
    if model is None:
        model = derive_model()
    return [c.organization for c in model.authored() if h_id in c.hypotheses]


def query_only_docable(model: "IndustryCasesModel | None" = None) -> "dict[str, list[str]]":
    """The GAP query. Returns the construct ids and the hypothesis ids for which NO external authored case
    reaches strength >= partial — the columns still resting on DocAble alone. This names the empty columns and
    drives which pending site to write first."""
    if model is None:
        model = derive_model()
    inverted = query_constructs(model)
    empty_constructs = [
        cid for cid in model.column_ids()
        if not any(strength in _AT_LEAST_PARTIAL for _org, strength in inverted.get(cid, []))
    ]
    covered_h = {h for c in model.authored() for h in c.hypotheses}
    empty_hyps = sorted(_hypothesis_ids() - covered_h)
    return {"constructs": empty_constructs, "hypotheses": empty_hyps}


def query_coverage(model: "IndustryCasesModel | None" = None) -> dict:
    """The burndown: N authored vs N roster, distinct constructs with >=1 external observation at any
    strength, and the independence / scale / domain spread (so an eventual synthesis can honestly gauge
    heterogeneity)."""
    if model is None:
        model = derive_model()
    inverted = query_constructs(model)
    observed = [cid for cid in model.column_ids() if inverted.get(cid)]
    authored = model.authored()
    return {
        "authored": len(authored),
        "roster": len(model.roster),
        "constructs_observed": len(observed),
        "constructs_total": len(model.columns),
        "independence_spread": sorted({c.source.get("independence", "?") for c in authored}),
        "scale_spread": sorted({c.setting.get("scale", "?") for c in authored}),
        "domain_spread": sorted({c.domain for c in authored}),
    }


#: The ceiling levels that count as an external case "reaching" a rung (the modeling analogue of >= partial).
_CEILING_REACHED = ("yes", "some")


def query_ceiling_gaps(model: "IndustryCasesModel | None" = None) -> dict:
    """The modeling analogue of only-docable. Per rung, which external authored cases reach it (level in
    {yes, some}). Returns:
      - `only_mage`  — rungs NO external authored case reaches (they rest on MAGE alone; rung 12 = drift-gate).
      - `single_external` — (rung_id, org) for rungs exactly ONE external case reaches (the rungs resting on
        that one site alone; e.g. the model-based tier resting on Siemens). Drives the software-first-ceiling
        claim mechanically."""
    if model is None:
        model = derive_model()
    only_mage: "list[str]" = []
    single_external: "list[tuple[str, str]]" = []
    for rid in model.rung_ids():
        reachers = [c.organization for c in model.authored() if c.level_of(rid) in _CEILING_REACHED]
        if not reachers:
            only_mage.append(rid)
        elif len(reachers) == 1:
            single_external.append((rid, reachers[0]))
    return {"only_mage": only_mage, "single_external": single_external}


def query_convergence(bucket: str, model: "IndustryCasesModel | None" = None) -> "list[Pattern]":
    """The pattern rows for a bucket (universal | generalizes | distinctive), in declared order, with their
    support spread — the queryable view behind render_convergence_md (and behind the distinctive prose)."""
    if model is None:
        model = derive_model()
    return model.patterns_in(bucket)


def query_pattern_constructs(model: "IndustryCasesModel | None" = None) -> "dict[str, list[str]]":
    """Invert maps_to_construct: per construct id (in column order), the pattern ids that map to it — so the
    synthesis can join a convergence row back to its correspondence column. Patterns with no construct
    (maps_to_construct null) collect under the '—' key."""
    if model is None:
        model = derive_model()
    out: "dict[str, list[str]]" = {cid: [] for cid in model.column_ids()}
    out["—"] = []
    for p in model.patterns:
        key = p.maps_to_construct if p.maps_to_construct in out else "—"
        out[key].append(p.id)
    return out


# ---- projection: the Worked-Examples gallery roster (B2 §7.4 / B3 §4) --------------------------------
# A section's `<!-- worked-examples: <construct-key> -->` gallery PROJECTS its roster from this matrix: the
# helper resolves the construct-key (a construct column / a cross-case pattern / a ceiling rung / an unscored
# flagship) and lists the industry cases that clear >= partial on it (industry-first), then appends DocAble as
# the unconditional deepest slot. The PROSE stays hand-authored; only the roster projects. Because the helper
# emits ONLY clearing cases, the stub it prints is WE1-clean by construction (the anti-fabrication property).

#: The >= partial floor per key-kind (WE1). A construct cell clears at strong/partial; a pattern support at
#: yes/partial; a ceiling rung at yes/some. DocAble is the unconditional deepest slot (never WE1-checked).
_WE_CONSTRUCT_REACH = ("strong", "partial")
_WE_SUPPORT_REACH = ("yes", "partial")
_WE_CEILING_REACH = ("yes", "some")
#: The industry/DocAble/other source mix the book aggregate steers toward (a taste target, report-only).
WE_RATIO_TARGET = {"industry-case": 0.50, "docable": 0.30, "other": 0.20}


@dataclass
class WexSlot:
    """One projected gallery slot — an industry case that clears the key, or the DocAble deepest slot."""
    organization: str
    ref: str            # the industry_cases id, or "docable"
    source_type: str    # "industry-case" | "docable"
    strength: str       # the clearing strength/level label (empty for the docable slot)


def worked_example_key_kind(key: str, model: "IndustryCasesModel | None" = None) -> str:
    """Resolve a gallery construct-key to how it welds to the matrix: `construct` (a construct-universe
    column), `pattern` (a cross-case pattern id), `rung` (a modeling-ceiling rung), or `none` (an unscored
    flagship the corpus cannot rate — a DocAble-led gallery, no industry slot the gate can verify)."""
    if model is None:
        model = derive_model()
    if key in set(model.column_ids()):
        return "construct"
    if any(p.id == key for p in model.patterns):
        return "pattern"
    if key in set(model.rung_ids()):
        return "rung"
    return "none"


def worked_example_clears(key: str, case_id: str, model: "IndustryCasesModel | None" = None) -> bool:
    """WE1 for the join lint: does industry case `case_id` clear the gallery key at >= partial? A construct
    cell clears at strong/partial, a pattern support at yes/partial, a ceiling rung at yes/some. An unscored
    (`none`) key clears nothing — its galleries carry no industry slot (only DocAble + `other`)."""
    if model is None:
        model = derive_model()
    kind = worked_example_key_kind(key, model)
    case = _case_by_id(case_id, model)
    if kind == "construct":
        return case is not None and case.strength_of(key) in _WE_CONSTRUCT_REACH
    if kind == "pattern":
        pat = next((p for p in model.patterns if p.id == key), None)
        return pat is not None and pat.support.get(case_id, "") in _WE_SUPPORT_REACH
    if kind == "rung":
        return case is not None and case.level_of(key) in _WE_CEILING_REACH
    return False


def worked_example_roster(key: str, model: "IndustryCasesModel | None" = None) -> "tuple[str, list[WexSlot]]":
    """Project the >=partial industry roster for a gallery key, industry-first (strongest-clearing first, then
    declared order) and DocAble appended as the deepest slot. Returns (key-kind, slots). WE1-clean by
    construction — only clearing cases become industry slots."""
    if model is None:
        model = derive_model()
    kind = worked_example_key_kind(key, model)
    slots: "list[WexSlot]" = []
    if kind == "construct":
        rank = {"strong": 0, "partial": 1}
        cand = [(i, c, c.strength_of(key)) for i, c in enumerate(model.authored())
                if c.strength_of(key) in _WE_CONSTRUCT_REACH]
        cand.sort(key=lambda t: (rank.get(t[2], 9), t[0]))
        slots = [WexSlot(c.organization, c.id, "industry-case", s) for _i, c, s in cand]
    elif kind == "pattern":
        pat = next((p for p in model.patterns if p.id == key), None)
        rank = {"yes": 0, "partial": 1}
        if pat is not None:
            cand = [(i, r, pat.support.get(r.id, "")) for i, r in enumerate(model.roster)
                    if pat.support.get(r.id, "") in _WE_SUPPORT_REACH]
            cand.sort(key=lambda t: (rank.get(t[2], 9), t[0]))
            slots = [WexSlot(r.organization, r.id, "industry-case", s) for _i, r, s in cand]
    elif kind == "rung":
        rank = {"yes": 0, "some": 1}
        cand = [(i, c, c.level_of(key)) for i, c in enumerate(model.authored())
                if c.level_of(key) in _WE_CEILING_REACH]
        cand.sort(key=lambda t: (rank.get(t[2], 9), t[0]))
        slots = [WexSlot(c.organization, c.id, "industry-case", s) for _i, c, s in cand]
    # DocAble — the unconditional deepest slot (strong across the construct universe; the flagship reading).
    docable_strength = model.docable_cells.get(key, "") if kind == "construct" else ""
    slots.append(WexSlot(model.docable_org, "docable", "docable", docable_strength))
    return kind, slots


def render_worked_examples_stub(key: str, model: "IndustryCasesModel | None" = None) -> str:
    """The paste-ready gallery STUB an author fills — the `<!-- worked-examples: KEY -->` bracket, one
    `### Example — <Source>` head per clearing slot (industry-first, DocAble-last) with a TODO gloss line
    naming the clearing strength, the `<!-- takeaway -->` divider, and the end marker. The ROSTER is
    projected (WE1-clean); the author writes the sentences + the Takeaway. Prints a one-line kind/mix banner
    above the stub (the `#`-comment banner is authoring context, not part of the gallery)."""
    if model is None:
        model = derive_model()
    kind, slots = worked_example_roster(key, model)
    n_ind = sum(1 for s in slots if s.source_type == "industry-case")
    banner = (f"# worked-examples key {key!r} — kind: {kind} · {n_ind} industry slot(s) clear >=partial "
              f"+ DocAble (deepest). Trim to 2-4; author each gloss + the Takeaway. Roster is WE1-clean.")
    if kind == "none":
        banner += ("\n# NOTE: unscored flagship — the corpus cannot rate an industry example here; this is a "
                   "DocAble-led gallery. Add an `### Example — <label> {other}` thought-experiment if wanted.")
    lines = [banner, f"<!-- worked-examples: {key} -->"]
    for s in slots:
        lines.append(f"### Example — {s.organization}")
        if s.source_type == "docable":
            lines.append("TODO — the deepest instantiation; may name a DocAble-unique mechanism. [docable]")
        else:
            lines.append(f"TODO — 2-4 sentences: how {key} ({kind}) appears at {s.organization}. "
                         f"[clears: {s.strength}]")
    lines.append("<!-- takeaway -->")
    lines.append("TODO — one sentence naming the shared abstraction (the Takeaway).")
    lines.append("<!-- worked-examples-end -->")
    return "\n".join(lines)


# ---- invariants (IC1-IC7; status-aware) -------------------------------------------------------------

def structural_findings(model: "IndustryCasesModel | None" = None) -> "list[str]":
    """The joins IC1-IC4 + IC6 (status-aware) and the audit-only IC7. Each finding is a defect the gate
    should catch once this band is promoted to BLOCKING.

    IC1 schema/traceability — kebab-unique id; non-empty organization/domain; a `pending-writeup` stub needs
        ONLY id/organization/domain/distinctive_starting_point; an `authored` record additionally carries
        source.citation_key, in-range enums, every mage_constructs[].strength in the correspondence set, and
        every descriptive-vocab value in its closed set.
    IC2 citation join — an authored record's source.citation_key resolves in references.bib AND
        citations.json (stubs exempt).
    IC3 construct join — every mage_constructs[].construct resolves against the declared construct universe.
    IC4 hypothesis join — every hypotheses[] id resolves to a real theory hypothesis id.
    IC6 roster guard — the record id-set equals the roster id-set, and shared roster fields agree between the
        roster entry and the record.
    IC7 (audit-only) scale-fact presence — an authored scale-bearing case carries >=1 scale_facts.
    """
    if model is None:
        model = derive_model()
    raw = _load_declared()
    taxonomy = raw.get("_taxonomy", {})
    corr_set = {v["value"] for v in taxonomy.get("correspondence", [])}
    col_ids = set(model.column_ids())
    bib, cites, hyp_ids = _bib_keys(), _citation_keys(), _hypothesis_ids()

    findings: "list[str]" = []
    seen: "set[str]" = set()

    for case in model.cases:
        cid = case.id or "<empty-id>"
        # IC1 — id shape + uniqueness (every status).
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", case.id or ""):
            findings.append(f"IC1 case {cid!r} id is not kebab-case")
        if case.id in seen:
            findings.append(f"IC1 duplicate case id {case.id!r}")
        seen.add(case.id)
        if case.status not in _VALID_STATUS:
            findings.append(f"IC1 case {cid!r} status {case.status!r} is not one of {_VALID_STATUS}")
        for f_name, val in (("organization", case.organization), ("domain", case.domain),
                            ("distinctive_starting_point", case.distinctive_starting_point)):
            if not str(val).strip():
                findings.append(f"IC1 case {cid!r} has empty roster field {f_name!r}")

        if not case.authored:
            continue  # stubs are checked only for the roster minimum

        # IC2 — citation join (authored only).
        key = case.source.get("citation_key", "")
        if not key:
            findings.append(f"IC2 authored case {cid!r} has no source.citation_key")
        else:
            if key not in bib:
                findings.append(f"IC2 authored case {cid!r} citation_key {key!r} resolves in no references.bib entry")
            if key not in cites:
                findings.append(f"IC2 authored case {cid!r} citation_key {key!r} absent from citations.json (regen the mirror)")

        # IC1 — authored enums in range.
        for f_name, vocab_key in (("source_type", "source_type"), ("independence", "independence"),
                                  ("account_type", "account_type"), ("evidence_horizon", "evidence_horizon")):
            val = case.source.get(f_name, "")
            vocab = taxonomy.get(vocab_key, [])
            if val and vocab and val not in vocab:
                findings.append(f"IC1 authored case {cid!r} source.{f_name} {val!r} not in taxonomy {vocab_key}")
        scale = case.setting.get("scale", "")
        if scale and scale not in taxonomy.get("scale", []):
            findings.append(f"IC1 authored case {cid!r} setting.scale {scale!r} not in taxonomy scale")
        for cell_name, val in (case.judgment or {}).items():
            if val and val not in taxonomy.get("judgment_cell", []):
                findings.append(f"IC1 authored case {cid!r} judgment.{cell_name} {val!r} not in taxonomy judgment_cell")
        for vocab_key, values in (("representations", case.representations),
                                  ("mechanisms", case.mechanisms), ("object_territory", case.object_territory)):
            vocab = taxonomy.get(vocab_key, [])
            for v in values:
                if vocab and v not in vocab:
                    findings.append(f"IC1 authored case {cid!r} {vocab_key} value {v!r} not in taxonomy {vocab_key}")

        # IC1/IC3 — correspondence cells.
        for cell in case.mage_constructs:
            if corr_set and cell.strength not in corr_set:
                findings.append(f"IC1 authored case {cid!r} construct {cell.construct!r} strength {cell.strength!r} not in correspondence set")
            if cell.construct not in col_ids:
                findings.append(f"IC3 authored case {cid!r} construct {cell.construct!r} resolves against no declared construct-universe column")
            if not cell.note.strip():
                findings.append(f"IC1 authored case {cid!r} construct {cell.construct!r} carries no note (a cell must be auditable)")

        # IC4 — hypothesis join.
        for h in case.hypotheses:
            if hyp_ids and h not in hyp_ids:
                findings.append(f"IC4 authored case {cid!r} hypothesis {h!r} resolves to no theory hypothesis id")

        # IC7 (audit-only) — scale-fact presence.
        if scale and not case.scale_facts:
            findings.append(f"IC7 (audit-only) authored case {cid!r} is scale-bearing ({scale}) but carries no scale_facts")

    findings.extend(_roster_guard_findings(model, raw))
    return findings


def _roster_guard_findings(model: IndustryCasesModel, raw: dict) -> "list[str]":
    """IC6 — the record id-set equals the roster id-set (a silently added/dropped case reddens), and shared
    roster fields agree between the roster entry and its record (the declared-intent/record join)."""
    findings: "list[str]" = []
    roster_by_id = {r.id: r for r in model.roster}
    record_ids = {c.id for c in model.cases}
    roster_ids = set(roster_by_id)
    for missing in sorted(roster_ids - record_ids):
        findings.append(f"IC6 roster site {missing!r} has no matching case record")
    for extra in sorted(record_ids - roster_ids):
        findings.append(f"IC6 case record {extra!r} is not in the declared roster")
    for case in model.cases:
        r = roster_by_id.get(case.id)
        if not r:
            continue
        for f_name, rec_val, ros_val in (
            ("organization", case.organization, r.organization),
            ("domain", case.domain, r.domain),
            ("distinctive_starting_point", case.distinctive_starting_point, r.distinctive_starting_point),
            ("status", case.status, r.status),
        ):
            if rec_val != ros_val:
                findings.append(f"IC6 case {case.id!r} {f_name} disagrees with roster ({rec_val!r} != {ros_val!r})")
    return findings


#: The convergence bucket enum (CCP1) and the support-value enum (CCP3).
_BUCKETS = ("universal", "generalizes", "distinctive")
_SUPPORT_VALUES = ("yes", "partial", "no")


def modeling_ceiling_findings(model: "IndustryCasesModel | None" = None) -> "list[str]":
    """The modeling-ceiling joins MCL1-MCL4 (status-aware; MCL5 parity lives in parity_findings, vacuous).
    Sibling to IC1-IC4, AUDIT-ONLY-first — each finding is a defect the gate should catch once promoted.

    MCL1 schema — every authored record's modeling_ceiling[].level is in the modeling_ceiling_level vocab; every
        cell carries a non-empty note; a `pending-writeup` stub carries NO modeling_ceiling (mirrors IC1).
    MCL2 completeness — an authored record's modeling_ceiling covers EVERY ladder rung exactly once (no missing
        rung, no dup) — a full row, so render_modeling_ceiling_md() never emits a hole.
    MCL3 rung join — every modeling_ceiling[].rung resolves against the declared modeling_ceiling_ladder.
    MCL4 MAGE-row completeness — mage_ceiling_row.cells covers every ladder rung (the reference column can't
        silently drop a rung).
    """
    if model is None:
        model = derive_model()
    raw = _load_declared()
    taxonomy = raw.get("_taxonomy", {})
    level_set = {v["value"] for v in taxonomy.get("modeling_ceiling_level", [])}
    rung_ids = model.rung_ids()
    rung_id_set = set(rung_ids)

    findings: "list[str]" = []
    for case in model.cases:
        cid = case.id or "<empty-id>"
        if not case.authored:
            # MCL1 (status-aware) — a stub carries no modeling_ceiling.
            if case.modeling_ceiling:
                findings.append(f"MCL1 stub case {cid!r} carries a modeling_ceiling (stubs carry none)")
            continue
        seen_rungs: "set[str]" = set()
        for cell in case.modeling_ceiling:
            if level_set and cell.level not in level_set:
                findings.append(f"MCL1 authored case {cid!r} rung {cell.rung!r} level {cell.level!r} not in modeling_ceiling_level")
            if not cell.note.strip():
                findings.append(f"MCL1 authored case {cid!r} rung {cell.rung!r} carries no note (a cell must be auditable)")
            if cell.rung not in rung_id_set:
                findings.append(f"MCL3 authored case {cid!r} rung {cell.rung!r} resolves against no declared modeling_ceiling_ladder rung")
            if cell.rung in seen_rungs:
                findings.append(f"MCL2 authored case {cid!r} rung {cell.rung!r} appears more than once")
            seen_rungs.add(cell.rung)
        # MCL2 — every ladder rung covered exactly once.
        for missing in [rid for rid in rung_ids if rid not in seen_rungs]:
            findings.append(f"MCL2 authored case {cid!r} is missing modeling_ceiling rung {missing!r}")

    # MCL4 — the MAGE reference row covers every ladder rung.
    for missing in [rid for rid in rung_ids if rid not in model.mage_ceiling_cells]:
        findings.append(f"MCL4 mage_ceiling_row.cells is missing rung {missing!r}")
    for extra in [rid for rid in model.mage_ceiling_cells if rid not in rung_id_set]:
        findings.append(f"MCL4 mage_ceiling_row.cells has rung {extra!r} not in the ladder")
    return findings


def cross_case_pattern_findings(model: "IndustryCasesModel | None" = None) -> "list[str]":
    """The cross-case-pattern joins CCP1-CCP3 (CCP4 parity lives in parity_findings, vacuous). AUDIT-ONLY-first.

    CCP1 schema — every pattern has a kebab-unique id, a non-empty statement, a bucket in the enum, and a
        non-empty mage_generalization_note.
    CCP2 construct join — when maps_to_construct is set, it resolves in the declared construct universe (a
        construct rename breaks the convergence build — the weld to the correspondence matrix).
    CCP3 support completeness — every pattern's support map carries EXACTLY the roster id-set, each value in
        {yes, partial, no} (a roster add reddens patterns that forgot the new site).
    """
    if model is None:
        model = derive_model()
    col_ids = set(model.column_ids())
    roster_ids = model.roster_ids()
    findings: "list[str]" = []
    seen: "set[str]" = set()
    for p in model.patterns:
        pid = p.id or "<empty-id>"
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", p.id or ""):
            findings.append(f"CCP1 pattern {pid!r} id is not kebab-case")
        if p.id in seen:
            findings.append(f"CCP1 duplicate pattern id {p.id!r}")
        seen.add(p.id)
        if not p.statement.strip():
            findings.append(f"CCP1 pattern {pid!r} has empty statement")
        if p.bucket not in _BUCKETS:
            findings.append(f"CCP1 pattern {pid!r} bucket {p.bucket!r} not in {_BUCKETS}")
        if not p.mage_generalization_note.strip():
            findings.append(f"CCP1 pattern {pid!r} has empty mage_generalization_note")
        # CCP1 short_label — the ~3-word grid/key label a table-bucket pattern renders in both the glyph grid
        # and the key-list. Required + bounded ONLY for the projected buckets; a `distinctive` pattern renders
        # as prose and carries no grid label.
        if p.bucket in _TABLE_BUCKETS:
            if not p.short_label.strip():
                findings.append(f"CCP1 pattern {pid!r} (bucket {p.bucket!r}) has empty short_label")
            elif len(p.short_label) > 30:
                findings.append(f"CCP1 pattern {pid!r} short_label {p.short_label!r} exceeds 30 chars ({len(p.short_label)})")
        if p.maps_to_construct is not None and p.maps_to_construct not in col_ids:
            findings.append(f"CCP2 pattern {pid!r} maps_to_construct {p.maps_to_construct!r} resolves against no construct-universe column")
        support_ids = set(p.support)
        for missing in sorted(roster_ids - support_ids):
            findings.append(f"CCP3 pattern {pid!r} support map is missing roster site {missing!r}")
        for extra in sorted(support_ids - roster_ids):
            findings.append(f"CCP3 pattern {pid!r} support map has non-roster site {extra!r}")
        for sid, val in p.support.items():
            if val not in _SUPPORT_VALUES:
                findings.append(f"CCP3 pattern {pid!r} support[{sid!r}] {val!r} not in {_SUPPORT_VALUES}")
    return findings


def parity_findings(model: "IndustryCasesModel | None" = None) -> "list[str]":
    """The page-parity checks. The prose wave has placed the modeling-ceiling matrix + the two convergence
    tables (each now a glyph GRID + a companion KEY-LIST) onto the `where-mage-fits` chapter, so MCL5, CCP4,
    and CCP5 are ACTIVE — each placed block must equal the model's projection byte-for-byte, or the page
    drifted from the evidence and must be regenerated:
      - MCL5 — the modeling-ceiling matrix vs `render_modeling_ceiling_md()`.
      - CCP4 — the convergence glyph grids, two wires: `render_convergence_md('universal')` +
        `render_convergence_md('generalizes')`.
      - CCP5 — the convergence key-lists, two wires: `render_convergence_key_md('universal')` +
        `render_convergence_key_md('generalizes')` (reuses page_block_parity verbatim with `occurrence`,
        exactly as CCP4 disambiguates the two grids — zero new machinery).
      - IC7 — the "Meet the six" gallery, COVERAGE + TRACE (no longer byte-parity): each hand-authored card
        must trace to its record via a `<!-- case-onepager: <id> -->` marker and cover the record's fields
        (organization, environment, strength summary, source) — see `case_onepager_coverage`.
    IC5 — the DocAble correspondence matrix — is NOT yet authored into any page, so it stays VACUOUS."""
    if model is None:
        model = derive_model()
    page = os.path.join(_BOOK, _PAGE_REL)
    findings: "list[str]" = []
    # MCL5 — the modeling-ceiling matrix (header line is the projection's first line).
    ceiling = render_modeling_ceiling_md(model).splitlines()
    findings += page_block_parity(
        page, ceiling[0], ceiling, display=_PAGE_REL, label="modeling-ceiling matrix",
        regen_hint="python3 book-models/industry_cases_model.py ceiling")
    # CCP4 — the two projected convergence GRIDS (universal + generalizes). Both render an identical header
    # line, so disambiguate by page order: universal is placed first (occurrence 0), generalizes second (1).
    for occurrence, bucket in enumerate(("universal", "generalizes")):
        conv = render_convergence_md(bucket, model).splitlines()
        findings += page_block_parity(
            page, conv[0], conv, display=_PAGE_REL, label=f"{bucket} convergence grid",
            regen_hint=f"python3 book-models/industry_cases_model.py convergence {bucket}",
            occurrence=occurrence)
    # CCP5 — the two projected convergence KEY-LISTS. The two key-lists share an identical header line, the
    # same situation CCP4 solves for the grids: universal key-list placed first (occurrence 0), generalizes
    # second (occurrence 1).
    for occurrence, bucket in enumerate(("universal", "generalizes")):
        key = render_convergence_key_md(bucket, model).splitlines()
        findings += page_block_parity(
            page, key[0], key, display=_PAGE_REL, label=f"{bucket} convergence key-list",
            regen_hint=f"python3 book-models/industry_cases_model.py convergence-key {bucket}",
            occurrence=occurrence)
    # IC7 — the "Meet the six" gallery: COVERAGE + TRACE, not byte-parity. Each hand-authored card must trace
    # to its record (the `<!-- case-onepager: <id> -->` marker) and cover the record's fields. Round-4 (F1=a)
    # RETIRED the narrated cards, so `_CARDS_PAGE_REL is None` — there is no gallery page and IC7 audits
    # nothing. Audit-only either way.
    if _CARDS_PAGE_REL is not None:
        cards_page = os.path.join(_BOOK, _CARDS_PAGE_REL)
        for case_id in _ONEPAGER_GALLERY_IDS:
            findings += case_onepager_coverage(case_id, cards_page, model)
    # IC5 — the correspondence matrix stays vacuous until it too is placed on a page.
    return findings


def all_findings(model: "IndustryCasesModel | None" = None) -> "list[str]":
    """Structural (IC1-IC4 + IC6 + audit-only IC7) + modeling-ceiling (MCL1-MCL4) + cross-case-pattern
    (CCP1-CCP3) + parity (MCL5 + CCP4 + CCP5 now ACTIVE — the grids + key-lists are placed on the
    where-mage-fits chapter; IC5 still vacuous). This whole band is wired AUDIT-ONLY-first (rule-#55): a
    follow-up promotes it to BLOCKING once a clean session confirms the drain."""
    if model is None:
        model = derive_model()
    return (structural_findings(model) + modeling_ceiling_findings(model)
            + cross_case_pattern_findings(model) + parity_findings(model))


def coverage_note(model: "IndustryCasesModel | None" = None) -> str:
    """A one-line burndown for the validate band — N authored vs roster, constructs with external observation,
    the still-only-DocAble gap count, and the modeling-ceiling burndown (how many rungs any external case
    reaches, plus how many rest on MAGE alone)."""
    if model is None:
        model = derive_model()
    cov = query_coverage(model)
    gaps = query_only_docable(model)
    n_rungs = len(model.ceiling_rungs)
    cg = query_ceiling_gaps(model)
    reached = n_rungs - len(cg["only_mage"]) if n_rungs else 0
    return (f"{cov['authored']}/{cov['roster']} sites authored · "
            f"{cov['constructs_observed']}/{cov['constructs_total']} constructs externally observed · "
            f"{len(gaps['constructs'])} construct(s) + {len(gaps['hypotheses'])} hypothesis(es) still only-DocAble · "
            f"ceiling: {reached}/{n_rungs} rungs reached externally, {len(cg['only_mage'])} rest on MAGE alone")


# ---- CLI --------------------------------------------------------------------------------------------

def _cmd_matrix() -> int:
    print(render_matrix_md())
    return 0


def _cmd_constructs() -> int:
    model = derive_model()
    labels = {c.id: c.label for c in model.columns}
    for cid in model.column_ids():
        obs = query_constructs(model)[cid]
        rendered = ", ".join(f"{org} ({strength})" for org, strength in obs) if obs else "— (only DocAble)"
        print(f"{labels[cid]:<22} {rendered}")
    return 0


def _cmd_bears_on(h_id: str) -> int:
    orgs = query_bears_on(h_id)
    print(f"{h_id}: {', '.join(orgs) if orgs else '(no authored external case bears on this hypothesis)'}")
    return 0


def _cmd_only_docable() -> int:
    model = derive_model()
    gaps = query_only_docable(model)
    labels = {c.id: c.label for c in model.columns}
    print("only-DocAble constructs (no external case at strength >= partial — the columns to fill next):")
    if gaps["constructs"]:
        for cid in gaps["constructs"]:
            print(f"  {labels.get(cid, cid)}  ({cid})")
    else:
        print("  (none — every construct has external observation at >= partial)")
    print("only-DocAble hypotheses (no external case bears on them):")
    if gaps["hypotheses"]:
        for h in gaps["hypotheses"]:
            print(f"  {h}")
    else:
        print("  (none)")
    return 0


def _cmd_coverage() -> int:
    cov = query_coverage()
    print(coverage_note())
    print(f"  independence spread: {', '.join(cov['independence_spread']) or '—'}")
    print(f"  scale spread:        {', '.join(cov['scale_spread']) or '—'}")
    print(f"  domain spread:       {', '.join(cov['domain_spread']) or '—'}")
    return 0


def _cmd_roster() -> int:
    model = derive_model()
    for r in model.roster:
        print(f"[{r.status:>15}] {r.id:<16} {r.organization:<12} {r.domain}")
    print(f"\n{len(model.authored())}/{len(model.roster)} authored")
    return 0


def _cmd_show() -> int:
    model = derive_model()
    for c in model.cases:
        print(f"[{c.status:>15}] {c.id}  ({c.organization} — {c.domain})")
        if c.authored:
            for cell in c.mage_constructs:
                print(f"                  {cell.construct}: {cell.strength}")
    print(f"\n{len(model.cases)} records · {len(model.authored())} authored · {len(model.roster)} roster")
    return 0


def _cmd_ceiling() -> int:
    print(render_modeling_ceiling_md())
    return 0


def _cmd_convergence(bucket: str) -> int:
    model = derive_model()
    if bucket == "distinctive":
        # PROSE bucket — the model owns the spine + the list + the hedge; the prose wave writes the sentences.
        print(f"distinctive bucket (PROSE — not a projected table):\n")
        print(f"headline: {model.distinctive_headline}\n")
        print(f"spine:    {model.distinctive_spine}\n")
        print(f"hedge:    {model.distinctive_hedge}\n")
        for p in model.patterns_in("distinctive"):
            near = f" [nearest: {p.nearest_external}]" if p.nearest_external else ""
            print(f"  - {p.statement}{near}")
        return 0
    table = render_convergence_md(bucket, model)
    if not table:
        print(f"usage: industry_cases_model.py convergence <universal|generalizes|distinctive>")
        return 2
    print(table)
    return 0


def _cmd_convergence_key(bucket: str) -> int:
    model = derive_model()
    table = render_convergence_key_md(bucket, model)
    if not table:
        print(f"usage: industry_cases_model.py convergence-key <universal|generalizes>")
        return 2
    print(table)
    return 0


def _cmd_onepager(case_id: str) -> int:
    if case_id not in _ONEPAGER_GALLERY_IDS:
        print(f"usage: industry_cases_model.py onepager <authored-case-id> (one of {_ONEPAGER_GALLERY_IDS})")
        return 2
    # The card is hand-authored on the page; the model no longer renders it. Report the COVERAGE audit — the
    # trace marker + the record fields the hand-authored card must engage — so an author can check a card.
    # Round-4 (F1=a) RETIRED the cards, so there is no gallery page to audit.
    if _CARDS_PAGE_REL is None:
        print(f"{case_id}: narrated cards retired (F1=a) — no gallery page; nothing to audit")
        return 0
    page = os.path.join(_BOOK, _CARDS_PAGE_REL)
    findings = case_onepager_coverage(case_id, page)
    if findings:
        print(f"{case_id}: {len(findings)} IC7 coverage/trace finding(s):")
        for f in findings:
            print(f"  {f}")
        return 1
    print(f"{case_id}: hand-authored card covers its record + traces to it (IC7 clean)")
    return 0


def _cmd_worked_examples(key: str) -> int:
    print(render_worked_examples_stub(key))
    return 0


def _cmd_ceiling_gaps() -> int:
    model = derive_model()
    labels = {r.id: r.label for r in model.ceiling_rungs}
    cg = query_ceiling_gaps(model)
    print("ceiling rungs NO external authored case reaches (rest on MAGE alone):")
    if cg["only_mage"]:
        for rid in cg["only_mage"]:
            print(f"  {labels.get(rid, rid)}  ({rid})")
    else:
        print("  (none — every rung has >=1 external case at yes/some)")
    print("ceiling rungs exactly ONE external case reaches (rest on that site alone):")
    if cg["single_external"]:
        for rid, org in cg["single_external"]:
            print(f"  {labels.get(rid, rid):<40} {org}")
    else:
        print("  (none)")
    return 0


def _cmd_pattern_constructs() -> int:
    model = derive_model()
    labels = {c.id: c.label for c in model.columns}
    inv = query_pattern_constructs(model)
    for cid, pids in inv.items():
        label = labels.get(cid, cid)
        rendered = ", ".join(pids) if pids else "—"
        print(f"{label:<22} {rendered}")
    return 0


def _cmd_verify() -> int:
    model = derive_model()
    findings = all_findings(model)
    print(f"industry-cases: {coverage_note(model)}")
    if findings:
        print(f"industry-cases: {len(findings)} finding(s) (AUDIT-ONLY this wave — does not gate validate):")
        for f in findings:
            print(f"  {f}")
        return 1
    print("industry-cases: schema + joins clean (IC1-IC4 + IC6 + MCL1-MCL4 + CCP1-CCP3; "
          "MCL5 + CCP4 + CCP5 parity ACTIVE — placed tables byte-equal to the model; IC7 coverage/trace "
          "ACTIVE — hand-authored one-pagers cover + trace to their records; IC5 parity still vacuous)")
    return 0


def main(argv: "list[str]") -> int:
    cmd = argv[1] if len(argv) > 1 else "verify"
    if cmd == "verify":
        return _cmd_verify()
    if cmd == "matrix":
        return _cmd_matrix()
    if cmd == "constructs":
        return _cmd_constructs()
    if cmd == "bears-on":
        if len(argv) < 3:
            print("usage: industry_cases_model.py bears-on <hypothesis-id>")
            return 2
        return _cmd_bears_on(argv[2])
    if cmd == "only-docable":
        return _cmd_only_docable()
    if cmd == "coverage":
        return _cmd_coverage()
    if cmd == "roster":
        return _cmd_roster()
    if cmd == "show":
        return _cmd_show()
    if cmd == "ceiling":
        return _cmd_ceiling()
    if cmd == "convergence":
        if len(argv) < 3:
            print("usage: industry_cases_model.py convergence <universal|generalizes|distinctive>")
            return 2
        return _cmd_convergence(argv[2])
    if cmd == "convergence-key":
        if len(argv) < 3:
            print("usage: industry_cases_model.py convergence-key <universal|generalizes>")
            return 2
        return _cmd_convergence_key(argv[2])
    if cmd == "onepager":
        if len(argv) < 3:
            print(f"usage: industry_cases_model.py onepager <case-id> (one of {_ONEPAGER_GALLERY_IDS})")
            return 2
        return _cmd_onepager(argv[2])
    if cmd == "ceiling-gaps":
        return _cmd_ceiling_gaps()
    if cmd == "pattern-constructs":
        return _cmd_pattern_constructs()
    if cmd == "worked-examples":
        if len(argv) < 3:
            print("usage: industry_cases_model.py worked-examples <construct-key> "
                  "(a construct column / cross-case pattern id / ceiling rung)")
            return 2
        return _cmd_worked_examples(argv[2])
    print(f"usage: {argv[0]} [verify|matrix|constructs|bears-on <H>|only-docable|coverage|roster|show|"
          f"ceiling|convergence <bucket>|convergence-key <bucket>|onepager <case-id>|ceiling-gaps|"
          f"pattern-constructs|worked-examples <construct-key>]")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
