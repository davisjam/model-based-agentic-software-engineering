"""The THEORY-OF-MAGE projection model — the chapter's Eight-Hypotheses table PROJECTED from the declared
theory source, so the page and the model cannot drift. A sibling of the other declared -> generated book
models (metrics-dashboard / claims / spine): the hand-authored source of truth is
`book-models/theory_of_mage_declared.json`; this module derives a typed model over it, projects the
hypotheses table into the 'Toward a Theory of MAGE' chapter, and holds that page's table byte-equal to the
projection with a parity check.

ONE SOURCE, TWO CONSUMERS.
  - `render_hypotheses_table_md()` — the 3-column markdown table (`ID | Hypothesis | Key falsifier`) the
    chapter shows: one row per top-level hypothesis, and for a hypothesis that DECOMPOSES into
    `sub_hypotheses` (H4 -> H4a/H4b) the Hypothesis and Key-falsifier cells are composed from the sub-rows
    with a fixed, deterministic fold (so the two-sub-hypothesis cell reaches byte parity). Author the table
    into the page from `... hypotheses-table`; the page and the model cannot then diverge without the parity
    check reddening.
  - `all_findings()` — structural + parity + the ratified-count guard. The STRUCTURAL half delegates to the
    existing `theory_model_check.check()` (extract-on-second-site: do not re-implement the internal
    well-formedness invariants TM1-TM7). The PARITY half reuses the dashboard's contiguous-`|`-run extractor
    idiom. The COUNT guard (`EXPECT_HYPOTHESES` / `EXPECT_SUBHYP`) reddens on a silent add/drop/reclassify of
    a hypothesis or sub-hypothesis — the exact H-table drift the chapter fears.

Reads the meta-file at check-time (rule-#33 best form — stable, no codegen, no snapshot). BLOCKING: a
chapter<->model drift gates. `verify` exits non-zero on any finding, and `catalog.py validate` increments its
issue count for each `[theory]` finding. Landed AUDIT-ONLY-first, promoted to BLOCKING once a clean session
confirmed parity holds (the repo's blocking-lint landing discipline).

Run `python3 book-models/theory_of_mage_model.py verify` to drift-check (structural + parity + count);
`... hypotheses-table` to print the markdown table for the page; `... show` to list every hypothesis.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass

import chapter_identity_model as chapter_identity  # sibling in book-models/; the chapter surrogate-key model
import theory_model_check as _tmc  # sibling in book-models/; the internal well-formedness check (TM1-TM7)
from _projection_parity import page_block_parity  # shared authored-page table-parity check (extract-on-3rd-site)

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)  # the governance-catalog repo root (book-models/ is one level down)
_BOOK = os.path.join(_ROOT, "book")
_DECLARED = os.path.join(_HERE, "theory_of_mage_declared.json")

#: The page the hypotheses table is authored into (parity target).
# The theory chapter, resolved through the chapter-identity model — a renumber of 6.1 updates this
# automatically (the label is frozen; the filename is the one field a reorg edits).
_PAGE_REL = chapter_identity.filename("education-research-open-problems")

#: The ratified counts — encode the author's set so a silent add/drop/reclassify reddens (the dashboard
#: model's C5-analogue: the count guard is the backstop against silent H-table drift).
EXPECT_HYPOTHESES = 8
EXPECT_SUBHYP = 2

#: The hypotheses-table columns (the header the projection emits and the page carries; parity is exact).
#: R47: the §6.6 research-program summary table — Family / Hypothesis / Core quantity, no falsifier cell
#: (the falsifiers stay on the model, internal). The Hypothesis cell numbers by POSITION (H1..H8), so the
#: reader-facing H-number is the row's place in the three-family order, not the frozen join-key id's number.
_COLUMNS = ("Family", "Hypothesis", "Core quantity")
_TABLE_HEADER = "| " + " | ".join(_COLUMNS) + " |"
_TABLE_RULE = "|" + "---|" * len(_COLUMNS)

_EMDASH = "—"  # the chapter renders `**H1 — name**` with a real em-dash, spaced; reproduce it exactly


# ---- typed model ------------------------------------------------------------------------------------

@dataclass
class SubHypothesis:
    """A named hypothesis a parent decomposes into (H4a/H4b under H4)."""
    id: str
    name: str
    statement: str
    falsifier: str

    @property
    def short(self) -> str:
        return _short_id(self.id)


@dataclass
class Hypothesis:
    """One top-level falsifiable hypothesis. `sub_hypotheses` is non-empty only for a decomposed hypothesis
    (H4), whose Hypothesis/Key-falsifier cells are composed from the sub-rows rather than its own body."""
    id: str
    name: str
    statement: str
    falsifier: str
    sub_hypotheses: "list[SubHypothesis]"
    family: str = ""
    core_quantity: str = ""

    @property
    def short(self) -> str:
        return _short_id(self.id)


@dataclass
class TheoryModel:
    hypotheses: "list[Hypothesis]"

    def sub_count(self) -> int:
        return sum(len(h.sub_hypotheses) for h in self.hypotheses)


# ---- load + build -----------------------------------------------------------------------------------

def _load_declared() -> dict:
    with open(_DECLARED, encoding="utf-8") as fh:
        return json.load(fh)


def _short_id(full_id: str) -> str:
    """The short form the chapter uses — the leading token of the JSON id up to the first `-`
    (`H4-representation-leverage` -> `H4`, `H4a-representation-efficiency` -> `H4a`). Derived, never re-keyed."""
    return str(full_id).split("-", 1)[0]


def derive_model(raw: "dict | None" = None) -> TheoryModel:
    """Build the typed model from the hand-authored declarations — the single derivation the projection and
    the checks share."""
    if raw is None:
        raw = _load_declared()
    hyps: "list[Hypothesis]" = []
    for h in raw.get("hypotheses", []):
        subs = [
            SubHypothesis(
                id=sh.get("id", ""), name=sh.get("name", ""),
                statement=sh.get("statement", ""), falsifier=sh.get("falsifier", ""),
            )
            for sh in (h.get("sub_hypotheses", []) or [])
        ]
        hyps.append(Hypothesis(
            id=h.get("id", ""), name=h.get("name", ""),
            statement=h.get("statement", ""), falsifier=h.get("falsifier", ""),
            sub_hypotheses=subs,
            family=h.get("family", ""), core_quantity=h.get("core_quantity", ""),
        ))
    return TheoryModel(hypotheses=hyps)


# ---- projection: the markdown table -----------------------------------------------------------------

def _hypothesis_cell(h: Hypothesis) -> str:
    """The Hypothesis cell. A plain hypothesis renders its statement; a decomposed one folds its sub-rows as
    `**H4a — <name>.** <statement> **H4b — <name>.** <statement>` (fixed separator + bold pattern, so the
    two-sub fold is deterministic and reaches byte parity)."""
    if not h.sub_hypotheses:
        return h.statement
    return " ".join(
        f"**{s.short} {_EMDASH} {s.name}.** {s.statement}" for s in h.sub_hypotheses
    )


def _falsifier_cell(h: Hypothesis) -> str:
    """The Key-falsifier cell. A plain hypothesis renders its falsifier; a decomposed one folds its sub-rows
    as `**H4a:** <falsifier> **H4b:** <falsifier>`."""
    if not h.sub_hypotheses:
        return h.falsifier
    return " ".join(f"**{s.short}:** {s.falsifier}" for s in h.sub_hypotheses)


def _hypothesis_row(h: Hypothesis) -> str:
    """One top-level hypothesis as a markdown table row — `| **H1 — name** | <hyp> | <falsifier> |`."""
    lead = f"**{h.short} {_EMDASH} {h.name}**"
    return f"| {lead} | {_hypothesis_cell(h)} | {_falsifier_cell(h)} |"


def render_table_rows(model: "TheoryModel | None" = None) -> "list[str]":
    """The hypotheses as markdown table lines (no header) — the page carries exactly these. R47: one row per
    top-level hypothesis as `| <family> | H<n> <name> | <core quantity> |`, numbered by POSITION in the
    three-family order (the reader-facing H1..H8), not by the frozen join-key id's own number."""
    if model is None:
        model = derive_model()
    return [
        f"| {h.family} | H{n} {h.name} | {h.core_quantity} |"
        for n, h in enumerate(model.hypotheses, 1)
    ]


def render_hypotheses_table_md(model: "TheoryModel | None" = None) -> str:
    """The full markdown table (header + rule + one row per top-level hypothesis) the chapter shows."""
    return "\n".join([_TABLE_HEADER, _TABLE_RULE, *render_table_rows(model)])


# ---- parity: the page carries the projection --------------------------------------------------------

def parity_findings(model: "TheoryModel | None" = None) -> "list[str]":
    """The page's table must equal the model's projection — the authored-content + parity-validator idiom.
    A mismatch means the page and the model drifted; regenerate the table from `... hypotheses-table`.
    Delegates the extract-and-diff to the shared `page_block_parity` harness (extract-on-3rd-site DRY)."""
    if model is None:
        model = derive_model()
    return page_block_parity(
        os.path.join(_BOOK, _PAGE_REL), _TABLE_HEADER, render_hypotheses_table_md(model).splitlines(),
        display=_PAGE_REL, label="hypotheses table", regen_hint="hypotheses-table")


# ---- structural + count guard -----------------------------------------------------------------------

def structural_findings(model: "TheoryModel | None" = None) -> "list[str]":
    """The internal well-formedness invariants (TM1-TM7) — delegated to `theory_model_check.check()` rather
    than re-implemented (extract-on-second-site). Each Finding is rendered as `[TM_] message`."""
    return [f"[{f.code}] {f.message}" for f in _tmc.check()]


def count_guard_findings(model: "TheoryModel | None" = None) -> "list[str]":
    """The ratified-count guard — a silent add/drop/reclassify of a hypothesis or sub-hypothesis reddens
    (the dashboard model's C5-analogue). This is the backstop against the exact H-table drift the chapter
    fears: the parity check holds the TEXT equal, the count guard holds the SET size equal."""
    if model is None:
        model = derive_model()
    findings: "list[str]" = []
    n_hyp = len(model.hypotheses)
    n_sub = model.sub_count()
    if n_hyp != EXPECT_HYPOTHESES:
        findings.append(f"count: {n_hyp} hypotheses, expected {EXPECT_HYPOTHESES} "
                        f"(a hypothesis was added or removed)")
    if n_sub != EXPECT_SUBHYP:
        findings.append(f"count: {n_sub} sub-hypotheses, expected {EXPECT_SUBHYP} "
                        f"(a sub-hypothesis was added or removed)")
    return findings


def all_findings(model: "TheoryModel | None" = None) -> "list[str]":
    """Structural + parity + count guard — the BLOCKING check `catalog.py validate`'s [theory] band runs.
    Deliberately EXCLUDES `proposition_findings()`: the named-proposition node landed AUDIT-ONLY-first (the
    repo's blocking-lint landing discipline), so it must not contribute to this gating set on first landing."""
    if model is None:
        model = derive_model()
    return structural_findings(model) + parity_findings(model) + count_guard_findings(model)


# ---- named theory PROPOSITIONS (AUDIT-ONLY — kept out of all_findings) -------------------------------

#: The honest-frame vocabulary a proposition may carry (mirrors substantiation.py's frame set). A theory
#: reality-claim owes an honest frame; a `reality`/empty frame would soapbox once registered, so it is a
#: (non-gating) finding here — an early warning ahead of the substantiation soapbox gate.
_PROPOSITION_FRAMES = ("reality", "offered-for-replication", "single-case", "possibility", "conjecture")


@dataclass
class Proposition:
    """A named theory PROPOSITION — the quotable theory STATEMENT a hypothesis encodes (the Reasoning-Horizon
    Proposition is H4's). NOT a hypothesis (it stays out of the ratified count guard), but a first-class
    queryable node: id + name + statement + falsifier + honest frame, cross-referencing the hypothesis that
    formalizes it."""
    id: str
    name: str
    statement: str
    falsifier: str
    frame: str
    formalized_by: str


def derive_propositions(raw: "dict | None" = None) -> "list[Proposition]":
    """The declared named propositions as a typed list (empty when the key is absent)."""
    if raw is None:
        raw = _load_declared()
    props: "list[Proposition]" = []
    for p in raw.get("propositions", []) or []:
        if not isinstance(p, dict):
            continue
        props.append(Proposition(
            id=str(p.get("id", "")), name=str(p.get("name", "")),
            statement=str(p.get("statement", "")), falsifier=str(p.get("falsifier", "")),
            frame=str(p.get("frame", "")), formalized_by=str(p.get("formalized_by", "")),
        ))
    return props


def proposition_findings(raw: "dict | None" = None) -> "list[str]":
    """AUDIT-ONLY structural check on the named theory PROPOSITIONS (rule-#55 audit-only-first landing — a new
    node type is REPORTED, never gated, on first landing). Each proposition must carry a non-empty, unique id
    plus a non-empty name / statement / falsifier, an honest speculative frame (a theory reality-claim owes
    one), and a `formalized_by` that resolves to a real hypothesis id. NOT part of `all_findings()`, so it
    never contributes to the BLOCKING [theory] band."""
    if raw is None:
        raw = _load_declared()
    hyp_ids = {str(h.get("id", "")) for h in raw.get("hypotheses", []) if isinstance(h, dict) and h.get("id")}
    findings: "list[str]" = []
    seen: "set[str]" = set()
    for i, p in enumerate(derive_propositions(raw)):
        label = p.id or f"#{i}"
        if not p.id:
            findings.append(f"PR1 proposition {label!r} has an empty `id`")
        elif p.id in seen:
            findings.append(f"PR1 duplicate proposition id {p.id!r}")
        seen.add(p.id)
        for f_name, val in (("name", p.name), ("statement", p.statement), ("falsifier", p.falsifier)):
            if not val.strip():
                findings.append(f"PR1 proposition {label!r} has an empty `{f_name}`")
        if not p.frame.strip():
            findings.append(f"PR2 proposition {label!r} has an empty `frame` (a theory reality-claim owes an honest frame)")
        elif p.frame not in _PROPOSITION_FRAMES:
            findings.append(f"PR2 proposition {label!r} frame {p.frame!r} is not one of {_PROPOSITION_FRAMES}")
        elif p.frame == "reality":
            findings.append(f"PR2 proposition {label!r} is framed `reality` (unhedged) — a theory proposition should be offered-for-replication, not asserted")
        if p.formalized_by and p.formalized_by not in hyp_ids:
            findings.append(f"PR3 proposition {label!r} formalized_by {p.formalized_by!r} resolves to no hypothesis id")
    return findings


# ---- CLI --------------------------------------------------------------------------------------------

def _cmd_hypotheses_table() -> int:
    print(render_hypotheses_table_md())
    return 0


def _cmd_show() -> int:
    model = derive_model()
    for h in model.hypotheses:
        print(f"{h.short:>4} {h.name}")
        print(f"       {h.statement}")
        for s in h.sub_hypotheses:
            print(f"       - {s.short} {s.name}: {s.statement}")
    print(f"\n{len(model.hypotheses)} hypotheses · {model.sub_count()} sub-hypotheses")
    return 0


def _print_proposition_audit() -> None:
    """AUDIT-ONLY: the named-proposition structural check (rule-#55 first landing — reported, never gating)."""
    props = derive_propositions()
    prop_findings = proposition_findings()
    if prop_findings:
        print(f"  proposition check (AUDIT-ONLY): {len(prop_findings)} finding(s):")
        for f in prop_findings:
            print(f"    {f}")
    else:
        print(f"  proposition check (AUDIT-ONLY): {len(props)} named proposition(s) well-formed "
              f"(non-gating on first landing)")


def _cmd_verify() -> int:
    model = derive_model()
    findings = all_findings(model)
    if findings:
        print(f"theory-of-mage: {len(findings)} drift finding(s) — regenerate the chapter table from "
              f"`... hypotheses-table` (BLOCKING):")
        for f in findings:
            print(f"  {f}")
        _print_proposition_audit()
        return 1  # BLOCKING: a chapter<->model drift gates
    print(f"theory-of-mage is in sync ({len(model.hypotheses)} hypotheses, {model.sub_count()} "
          f"sub-hypotheses; structural clean; page table matches the model)")
    _print_proposition_audit()
    return 0


def main(argv: "list[str]") -> int:
    cmd = argv[1] if len(argv) > 1 else "verify"
    if cmd == "verify":
        return _cmd_verify()
    if cmd == "hypotheses-table":
        return _cmd_hypotheses_table()
    if cmd == "show":
        return _cmd_show()
    print(f"usage: {argv[0]} [verify|hypotheses-table|show]")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
