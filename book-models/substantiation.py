"""The SUBSTANTIATION aggregator — nests the three evidence legs (DATA ledger, LITERATURE positioning, and
FIELD-NOTE ledger) UNDER a claim universe and, per claim, surfaces what backs it. The query the author asked
for: "where we cite in the text, back those cites in the model (ref, claims-from-it), nested under the
claims, so we can query for under-substantiated-or-situated — and outright SOAPBOX — claims about reality."

THE CLAIM UNIVERSE — spine + theory + discussion. The argument spine is the book's backbone claims; the
'Toward a Theory of MAGE' chapter adds reality-asserting THEORY nodes (the nine hypotheses H1-H9 + their
sub-hypotheses, the corollaries, and the research-agenda proposals) that are NOT spine claims; and the
DISCUSSION-claims ledger adds the reality-asserting sentences that live in the book's Discussion /
Implications / Future prose and belong to no ordered spine step and no theory node. All three are appended to
one universe so the report reaches every registered claim, and a datum or citation may bind to ANY by id (the
id set simply grows — no new binding machinery).

It reads meta-files at query time (rule-#33 best form — stable, no codegen, no snapshot):
  - book-models/argument_spine_declared.json — the spine claims + their `quantifiable` / `reality_claim`
    (asserts something about reality) / optional `frame` flags.
  - book-models/theory_of_mage_declared.json — the theory reality-nodes. The chapter globally frames all of
    them as offered-for-replication (its `hedge` + the table caption 'offered for replication, not proven'),
    so they register with frame=offered-for-replication and never SOAPBOX — honestly SITUATED, not asserted.
  - book-models/discussion-claims.json — the DISCUSSION-claim ledger: reality-claims asserted in the book's
    Discussion / Implications / Future prose that belong to no other model. Each registers with a `frame`,
    default `reality` (a Discussion reality-claim owes backing — it does NOT inherit the theory's
    offered-for-replication hedge). Robust to its absence. The prose-audit pass (writing/audit.md Pass 7) is
    what FINDS the claims to register here; registration hands them to this check, which holds them thereafter.
  - book/data/data-claims.json — the metric->claim ledger (each datum's `spine_claim`/`spine_claims` +
    observable + data_source + limitation). The DATA leg.
  - book-models/lit-positioning.json — the literature-positioning citations, each `{key, backs_claims,
    relation}`. The LITERATURE leg. Robust to its absence.
  - book-models/field-notes.json — the FIELD-NOTE leg: lived DocAble incidents narrated in the book, each
    `{id, incident, chapter_slug, backs_claims, limitation}`. First-hand experience, not a datum and not a
    citation. Robust to its absence.

Per claim it aggregates `data_backing` + `literature_backing` + `field_note_backing`, carries the claim's
`frame ∈ {reality, offered-for-replication, single-case, possibility, conjecture}` (default `reality` — an
unframed assertion IS a reality-claim needing backing), then computes three reports:
  - DL3 UNDERQUANTIFIED — a `quantifiable:true` claim with ZERO data_backing.
  - UNDER-SUBSTANTIATED-OR-SITUATED — a `reality_claim:true` claim with NONE of the three backings (no
    evidence of any kind — the broad gap; includes honestly-framed theory nodes).
  - SOAPBOX — the sharp one: a reality-claim with NO backing of any kind AND frame=="reality" (NOT hedged as
    offered/single-case/possibility/conjecture). SOAPBOX ⊆ UNDER-SUBSTANTIATED-OR-SITUATED (the framed ones
    are situated, not soapbox).
DL3 UNDERQUANTIFIED + UNDER-SUBSTANTIATED-OR-SITUATED REPORT (worklists). SOAPBOX GATES — a non-empty band
exits 1 here and increments the `catalog.py validate` issue count. Landed audit-only-first, promoted to
BLOCKING once a clean session confirmed the band empty (the repo's blocking-lint landing discipline).

Honest boundary: the check only sees REGISTERED claims. Unregistered Discussion prose (a sentence in no
model) is invisible to it — finding those is the human audit. A clean SOAPBOX report means every registered
reality-claim is backed or honestly framed, not that no over-claim exists anywhere in the prose.

Run `python3 book-models/substantiation.py` to print the per-claim backing + the three reports; `... json`
for the machine form. Also the engine behind `catalog.py substantiation`.
"""
from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, field

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
_SPINE_DECLARED = os.path.join(_HERE, "argument_spine_declared.json")
_THEORY_DECLARED = os.path.join(_HERE, "theory_of_mage_declared.json")
_LIT_POSITIONING = os.path.join(_HERE, "lit-positioning.json")
_FIELD_NOTES = os.path.join(_HERE, "field-notes.json")
_DISCUSSION_DECLARED = os.path.join(_HERE, "discussion-claims.json")
_DATA_CLAIMS = os.path.join(_ROOT, "book", "data", "data-claims.json")

#: The honesty-frame vocabulary. `reality` is the honest default — an unframed assertion IS a reality-claim
#: that owes backing. The other four are honest hedges that keep a claim off the SOAPBOX report:
#: `offered-for-replication` (a hypothesis offered for others to test), `single-case` (scoped to the DocAble
#: case), `possibility` (an offered reading, not asserted), and `conjecture` (a claim the author keeps LOUD
#: but OWNS as speculation rather than established fact — kept-loud-but-owned).
_FRAMES = ("reality", "offered-for-replication", "single-case", "possibility", "conjecture")

#: The theory chapter globally frames ALL its predictions as offered-for-replication (the theory JSON `hedge`
#: + the Seven-Hypotheses table caption). So theory nodes register with this frame by default — honestly
#: SITUATED, never SOAPBOX — unless a node carries its own explicit `frame`.
_THEORY_DEFAULT_FRAME = "offered-for-replication"


# ---- typed rows ------------------------------------------------------------------------------------

@dataclass
class DataBacking:
    slug: str
    status: str
    observable: str
    data_source: str
    limitation: str


@dataclass
class LiteratureBacking:
    key: str
    relation: str
    section: str


@dataclass
class FieldNoteBacking:
    """The third evidence leg — a lived DocAble incident (not a datum, not a citation) that backs a claim."""
    id: str
    incident: str
    chapter_slug: str
    limitation: str


@dataclass
class ClaimSubstantiation:
    id: str
    statement: str
    quantifiable: bool
    reality_claim: bool
    frame: str = "reality"
    kind: str = "spine"  # provenance: `spine` claim or a `theory` node (hypothesis / corollary / agenda)
    data_backing: list[DataBacking] = field(default_factory=list)
    literature_backing: list[LiteratureBacking] = field(default_factory=list)
    field_note_backing: list[FieldNoteBacking] = field(default_factory=list)

    @property
    def has_backing(self) -> bool:
        """Any evidence of any kind — data, literature, or a field note."""
        return bool(self.data_backing or self.literature_backing or self.field_note_backing)

    @property
    def underquantified(self) -> bool:
        """DL3 — a quantifiable claim no metric yet bears weight for."""
        return self.quantifiable and not self.data_backing

    @property
    def under_substantiated(self) -> bool:
        """A reality-claim with none of the three backings behind it — the broad gap (SITUATED or SOAPBOX)."""
        return self.reality_claim and not self.has_backing

    @property
    def soapbox(self) -> bool:
        """The sharp one — a reality-claim asserted with NO backing of any kind AND no honest speculative
        frame (frame=='reality'). SOAPBOX ⊆ under_substantiated: the framed ones are situated, not soapbox."""
        return self.under_substantiated and self.frame == "reality"


# ---- load the meta-files ---------------------------------------------------------------------------

def _load(path: str) -> "dict | None":
    return json.load(open(path, encoding="utf-8")) if os.path.isfile(path) else None


def _slug(text: str) -> str:
    """A stable kebab id for a theory node that carries no id of its own (corollary / research-agenda)."""
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:60]


def _spine_claims() -> "list[dict]":
    data = _load(_SPINE_DECLARED) or {}
    return data.get("spine", [])


def _theory_claims() -> "list[dict]":
    """The theory chapter's reality-asserting nodes as claim dicts, in a stable order: the nine hypotheses
    (each followed by its sub-hypotheses), the named propositions, the corollaries, then the research-agenda
    proposals. Each is a reality-claim; each defaults to frame=offered-for-replication (the chapter's global
    hedge) unless the node carries its own `frame`. Hypotheses + propositions use their JSON id; corollaries +
    agenda points carry no id, so a stable slug is synthesized. Robust to the theory file's absence
    (returns [])."""
    m = _load(_THEORY_DECLARED)
    if m is None:
        return []
    out: "list[dict]" = []

    def _node(cid: str, statement: str, frame: str) -> dict:
        return {"id": cid, "statement": statement, "reality_claim": True, "quantifiable": False,
                "frame": frame if frame in _FRAMES else _THEORY_DEFAULT_FRAME, "kind": "theory"}

    for h in m.get("hypotheses", []):
        if not isinstance(h, dict) or "id" not in h:
            continue
        out.append(_node(h["id"], h.get("statement", ""), h.get("frame", _THEORY_DEFAULT_FRAME)))
        for sh in h.get("sub_hypotheses", []) or []:
            if isinstance(sh, dict) and sh.get("id"):
                out.append(_node(sh["id"], sh.get("statement", ""), sh.get("frame", _THEORY_DEFAULT_FRAME)))
    for p in m.get("propositions", []):
        if isinstance(p, dict) and p.get("id"):
            out.append(_node(p["id"], p.get("statement", ""), p.get("frame", _THEORY_DEFAULT_FRAME)))
    for c in m.get("corollaries", []):
        if isinstance(c, dict) and c.get("claim"):
            out.append(_node(f"corollary-{_slug(c['claim'])}", c["claim"],
                             c.get("frame", _THEORY_DEFAULT_FRAME)))
    for r in m.get("research_agenda", []):
        if isinstance(r, dict) and r.get("study_design"):
            out.append(_node(f"research-agenda-{_slug(r['study_design'])}", r["study_design"],
                             r.get("frame", _THEORY_DEFAULT_FRAME)))
    return out


def _theory_ids() -> "set[str]":
    return {c["id"] for c in _theory_claims()}


def _discussion_claims() -> "list[dict]":
    """The DISCUSSION-claim ledger's reality-claims as claim dicts — a mirror of `_theory_claims()`, but each
    defaults to frame=`reality` (a Discussion reality-claim owes backing; it does NOT inherit the theory's
    offered-for-replication hedge) unless the entry carries its own `frame`. Each entry is a reality-claim.
    Robust to the file's absence (returns [])."""
    m = _load(_DISCUSSION_DECLARED)
    if m is None:
        return []
    out: "list[dict]" = []
    for c in m.get("discussion_claims", []):
        if not isinstance(c, dict) or not c.get("id"):
            continue
        frame = c.get("frame", "reality")
        out.append({"id": c["id"], "statement": c.get("statement", ""), "reality_claim": True,
                    "quantifiable": bool(c.get("quantifiable", False)),
                    "frame": frame if frame in _FRAMES else "reality", "kind": "discussion"})
    return out


def _discussion_ids() -> "set[str]":
    return {c["id"] for c in _discussion_claims()}


def _data_bindings() -> "dict[str, list[DataBacking]]":
    """claim id -> the data-claims bound to it. A datum binds via `spine_claim` (str) or `spine_claims`
    (list); both are read and unioned so a datum bearing weight for several claims reaches each."""
    raw = _load(_DATA_CLAIMS) or {}
    out: "dict[str, list[DataBacking]]" = {}
    for slug, e in raw.items():
        if slug.startswith("_") or not isinstance(e, dict):
            continue
        ids: "list[str]" = []
        if e.get("spine_claim"):
            ids.append(e["spine_claim"])
        ids.extend(e.get("spine_claims", []) or [])
        for cid in dict.fromkeys(ids):  # de-dup, keep order
            out.setdefault(cid, []).append(DataBacking(
                slug=slug, status=e.get("status", "?"),
                observable=e.get("observable", ""), data_source=e.get("data_source", ""),
                limitation=e.get("limitation", ""),
            ))
    return out


def _lit_bindings() -> "tuple[dict[str, list[LiteratureBacking]], bool]":
    """(claim id -> the citations that back it, lit_present). Reads lit-positioning.json; robust to its
    absence — returns ({}, False) so the aggregator degrades to data-only with a note."""
    art = _load(_LIT_POSITIONING)
    if art is None:
        return {}, False
    out: "dict[str, list[LiteratureBacking]]" = {}
    for iv in art.get("interventions", []):
        section = iv.get("section", "")
        for c in iv.get("citations", []):
            for cid in c.get("backs_claims", []):
                out.setdefault(cid, []).append(LiteratureBacking(
                    key=c.get("key", ""), relation=c.get("relation", ""), section=section,
                ))
    return out, True


def _fieldnote_bindings() -> "tuple[dict[str, list[FieldNoteBacking]], bool]":
    """(claim id -> the field notes that back it, notes_present). Reads field-notes.json; robust to its
    absence — returns ({}, False), mirroring _lit_bindings. A note binds via its `backs_claims` list (a spine
    claim id OR a theory node id)."""
    art = _load(_FIELD_NOTES)
    if art is None:
        return {}, False
    out: "dict[str, list[FieldNoteBacking]]" = {}
    for n in art.get("field_notes", []):
        if not isinstance(n, dict) or not n.get("id"):
            continue
        backing = FieldNoteBacking(
            id=n["id"], incident=n.get("incident", ""),
            chapter_slug=n.get("chapter_slug", ""), limitation=n.get("limitation", ""),
        )
        for cid in n.get("backs_claims", []) or []:
            out.setdefault(cid, []).append(backing)
    return out, True


# ---- aggregate -------------------------------------------------------------------------------------

def _normalize_frame(raw: "str | None") -> str:
    """A claim's honesty frame — the declared value if in the vocabulary, else the honest default `reality`
    (an unframed reality-claim owes backing)."""
    return raw if raw in _FRAMES else "reality"


def aggregate() -> "tuple[list[ClaimSubstantiation], bool]":
    """(per-claim substantiation over the spine + theory + discussion universe, lit_present). Spine claims first (in spine
    order), then the theory reality-nodes, then the discussion claims; each claim binds its data / literature
    / field-note backing by id."""
    data_by_claim = _data_bindings()
    lit_by_claim, lit_present = _lit_bindings()
    note_by_claim, _ = _fieldnote_bindings()
    rows: "list[ClaimSubstantiation]" = []

    def _row(c: dict, kind: str, default_frame: str) -> ClaimSubstantiation:
        return ClaimSubstantiation(
            id=c["id"], statement=c.get("statement", ""),
            quantifiable=bool(c.get("quantifiable", False)),
            reality_claim=bool(c.get("reality_claim", False)),
            frame=_normalize_frame(c.get("frame", default_frame)),
            kind=kind,
            data_backing=data_by_claim.get(c["id"], []),
            literature_backing=lit_by_claim.get(c["id"], []),
            field_note_backing=note_by_claim.get(c["id"], []),
        )

    for c in sorted(_spine_claims(), key=lambda d: d.get("order", 0)):
        rows.append(_row(c, "spine", "reality"))
    for c in _theory_claims():
        rows.append(_row(c, "theory", _THEORY_DEFAULT_FRAME))
    for c in _discussion_claims():
        rows.append(_row(c, "discussion", "reality"))
    return rows, lit_present


def dl_findings() -> "list[str]":
    """DL1 (join-integrity) + DL2 (four-fields-present) over the data-claims — the structural half the
    extended check_data_claims surfaces. DL1: every datum's `spine_claim`(s) resolve to a real claim id in
    the universe (a SPINE claim, a THEORY node, OR a DISCUSSION claim — a datum may bind to any). DL2: every
    datum carries non-empty observable + data_source + limitation. Deterministic; audit-only."""
    claim_ids = {c["id"] for c in _spine_claims()} | _theory_ids() | _discussion_ids()
    raw = _load(_DATA_CLAIMS) or {}
    findings: "list[str]" = []
    for slug, e in raw.items():
        if slug.startswith("_") or not isinstance(e, dict):
            continue
        ids: "list[str]" = ([e["spine_claim"]] if e.get("spine_claim") else []) + list(e.get("spine_claims", []) or [])
        if not ids:
            findings.append(f"DL1 data-claim {slug!r} binds to no spine_claim (add spine_claim or spine_claims)")
        for cid in ids:
            if cid not in claim_ids:
                findings.append(f"DL1 data-claim {slug!r} spine_claim {cid!r} resolves to no spine claim, theory node, or discussion claim")
        for f_name in ("observable", "data_source", "limitation"):
            if not str(e.get(f_name, "")).strip():
                findings.append(f"DL2 data-claim {slug!r} has an empty {f_name!r} field")
    return findings


def underquantified() -> "list[ClaimSubstantiation]":
    rows, _ = aggregate()
    return [r for r in rows if r.underquantified]


def under_substantiated() -> "list[ClaimSubstantiation]":
    rows, _ = aggregate()
    return [r for r in rows if r.under_substantiated]


def soapbox() -> "list[ClaimSubstantiation]":
    """The SOAPBOX report — reality-claims asserted with no backing of any kind and no honest speculative
    frame. The author's 'no-soapboxing' worry, made mechanical. GATES: a non-empty band reddens `render()`
    (exit 1) and the `[soapbox]` band in `catalog.py validate`."""
    rows, _ = aggregate()
    return [r for r in rows if r.soapbox]


# ---- CLI -------------------------------------------------------------------------------------------

def _flag_tag(r: "ClaimSubstantiation") -> str:
    tags = []
    if r.soapbox:
        tags.append("SOAPBOX")
    elif r.under_substantiated:
        tags.append("UNDER-SUBSTANTIATED-OR-SITUATED")
    elif r.underquantified:
        tags.append("UNDERQUANTIFIED")
    if r.reality_claim:
        tags.append("reality")
    if r.quantifiable:
        tags.append("quantifiable")
    tags.append(f"frame={r.frame}")
    return f"  [{'; '.join(tags)}]" if tags else ""


def _to_jsonable() -> dict:
    rows, lit_present = aggregate()
    from dataclasses import asdict
    return {
        "_note": ("Substantiation aggregate — data-claims + lit-positioning citations + field notes nested "
                  "under each claim (spine + theory + discussion). UNDERQUANTIFIED = quantifiable claim with no data; "
                  "UNDER-SUBSTANTIATED-OR-SITUATED = reality-claim with no data/lit/field-note; "
                  "SOAPBOX = under-substantiated AND frame=='reality' (unhedged) — GATES (exit 1); the other "
                  "two REPORT."),
        "lit_positioning_present": lit_present,
        "claims": [{**asdict(r), "underquantified": r.underquantified,
                    "under_substantiated": r.under_substantiated, "soapbox": r.soapbox} for r in rows],
        "underquantified": [r.id for r in rows if r.underquantified],
        "under_substantiated_or_situated": [r.id for r in rows if r.under_substantiated],
        "soapbox": [r.id for r in rows if r.soapbox],
    }


def render(as_json: bool = False) -> int:
    rows, lit_present = aggregate()
    if as_json:
        print(json.dumps(_to_jsonable(), ensure_ascii=False, indent=2))
        return 0
    n_spine = sum(1 for r in rows if r.kind == "spine")
    n_theory = sum(1 for r in rows if r.kind == "theory")
    n_discussion = sum(1 for r in rows if r.kind == "discussion")
    print(f"== substantiation — data + literature + field notes nested under the claim universe "
          f"({n_spine} spine + {n_theory} theory + {n_discussion} discussion) ==")
    if not lit_present:
        print("  (note: book-models/lit-positioning.json absent — literature half empty; run the "
              "lit_positioning model's regenerate)")
    for r in rows:
        print(f"\n{r.id}{_flag_tag(r)}")
        print(f"  {r.statement}")
        if r.data_backing:
            for d in r.data_backing:
                print(f"  data: {d.slug} [{d.status}] — {d.observable}")
        else:
            print("  data: — none")
        if r.literature_backing:
            keys = ", ".join(f"{l.key}({l.relation})" for l in r.literature_backing)
            print(f"  lit:  {keys}")
        else:
            print("  lit:  — none")
        if r.field_note_backing:
            keys = ", ".join(n.id for n in r.field_note_backing)
            print(f"  note: {keys}")
        else:
            print("  note: — none")
    uq = [r for r in rows if r.underquantified]
    us = [r for r in rows if r.under_substantiated]
    sb = [r for r in rows if r.soapbox]
    print("\n== DL3 UNDERQUANTIFIED (quantifiable claim, no data yet — seeds future collection) ==")
    print("  " + (", ".join(r.id for r in uq) if uq else "none — every quantifiable claim has bound data"))
    print("== UNDER-SUBSTANTIATED-OR-SITUATED (reality-claim with no data / lit / field-note) ==")
    print("  " + (", ".join(r.id for r in us) if us
                  else "none — every reality-claim has data, literature, or a field note behind it"))
    print("== SOAPBOX (reality-claim, no backing of any kind, unhedged frame=='reality') ==")
    print("  " + (", ".join(r.id for r in sb) if sb
                  else "none — every unbacked reality-claim carries an honest speculative frame"))
    # BLOCKING: SOAPBOX gates. DL3 UNDERQUANTIFIED + UNDER-SUBSTANTIATED-OR-SITUATED stay REPORTS (worklists —
    # the latter includes honestly-framed theory nodes), but a reality-claim asserted with NO backing and NO
    # honest speculative frame reddens (exit 1). Landed audit-only-first, promoted once a clean session
    # confirmed the band empty. A future unregistered/unbacked reality-claim now BLOCKS.
    return 1 if sb else 0


def main(argv: "list[str]") -> int:
    if len(argv) > 1 and argv[1] == "json":
        return render(as_json=True)
    return render(as_json=False)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
