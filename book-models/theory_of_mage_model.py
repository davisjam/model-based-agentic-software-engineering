"""Project and validate Chapter 6's four active theoretical propositions.

Native prose and the declared model must agree on the summary table. The guard
checks the exact P1–P4 set, structural links, and byte-equal Markdown projection.
Historical IDs are crosswalk data only; they are not extra claims or table rows.
"""
from __future__ import annotations
import json
import os
import sys
from dataclasses import dataclass
import chapter_identity_model as chapter_identity
import theory_model_check as _tmc
from _projection_parity import page_block_parity

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
_BOOK = os.path.join(_ROOT, "book")
_DECLARED = os.path.join(_HERE, "theory_of_mage_declared.json")
_PAGE_REL = chapter_identity.filename("what-the-theory-predicts")
EXPECTED_IDS = (
    "P1-representation-leverage",
    "P2-representation-enabled-enforcement",
    "P3-governance-conversion-and-engineering-capital",
    "P4-governable-acceleration",
)
EXPECT_PROPOSITIONS = 4
_COLUMNS = ("Proposition", "Mechanism", "What a comparison must establish")
_TABLE_HEADER = "| " + " | ".join(_COLUMNS) + " |"
_TABLE_RULE = "|" + "---|" * len(_COLUMNS)

@dataclass
class Proposition:
    id: str
    short_id: str
    name: str
    statement: str
    mechanism: str
    core_quantity: str

@dataclass
class TheoryModel:
    propositions: list[Proposition]
    raw: dict

def _load_declared() -> dict:
    with open(_DECLARED, encoding="utf-8") as fh:
        return json.load(fh)

def derive_model(raw: dict | None = None) -> TheoryModel:
    if raw is None:
        raw = _load_declared()
    return TheoryModel([
        Proposition(**{field: p.get(field, "") for field in
            ("id", "short_id", "name", "statement", "mechanism", "core_quantity")})
        for p in raw.get("propositions", [])
    ], raw)

def derive_propositions(raw: dict | None = None) -> list[Proposition]:
    return derive_model(raw).propositions

def render_table_rows(model: TheoryModel | None = None) -> list[str]:
    if model is None:
        model = derive_model()
    return [f"| {p.short_id} {p.name} | {p.mechanism} | {p.core_quantity} |"
            for p in model.propositions]

def render_propositions_table_md(model: TheoryModel | None = None) -> str:
    return "\n".join([_TABLE_HEADER, _TABLE_RULE, *render_table_rows(model)])

def render_hypotheses_table_md(model: TheoryModel | None = None) -> str:
    """Compatibility name for callers; always returns the four-proposition table."""
    return render_propositions_table_md(model)

def parity_findings(model: TheoryModel | None = None) -> list[str]:
    return page_block_parity(
        os.path.join(_BOOK, _PAGE_REL), _TABLE_HEADER,
        render_propositions_table_md(model).splitlines(),
        display=_PAGE_REL, label="four-proposition table", regen_hint="propositions-table")

def structural_findings(model: TheoryModel | None = None) -> list[str]:
    if model is None:
        model = derive_model()
    return [f"[{f.code}] {f.message}" for f in _tmc.check(model.raw)]

def count_guard_findings(model: TheoryModel | None = None) -> list[str]:
    if model is None:
        model = derive_model()
    ids = tuple(p.id for p in model.propositions)
    shorts = tuple(p.short_id for p in model.propositions)
    findings = []
    if ids != EXPECTED_IDS:
        findings.append(f"count/set: expected exactly ordered P1–P4 IDs {EXPECTED_IDS!r}; found {ids!r}")
    if shorts != ("P1", "P2", "P3", "P4"):
        findings.append(f"numbering: expected P1–P4, found {shorts!r}")
    return findings

def proposition_findings(raw: dict | None = None) -> list[str]:
    model = derive_model(raw)
    return structural_findings(model) + count_guard_findings(model)

def all_findings(model: TheoryModel | None = None) -> list[str]:
    if model is None:
        model = derive_model()
    return structural_findings(model) + count_guard_findings(model) + parity_findings(model)

def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else "verify"
    if cmd in {"propositions-table", "hypotheses-table"}:
        print(render_propositions_table_md())
        return 0
    if cmd == "show":
        for p in derive_propositions():
            print(f"{p.short_id} — {p.name}: {p.statement}")
        return 0
    if cmd == "verify":
        findings = all_findings()
        if findings:
            print("Theory-of-MAGE drift:")
            for finding in findings:
                print("  " + finding)
            return 1
        print("theory-of-mage is in sync (four propositions; strict joins and table parity)")
        return 0
    print(f"usage: {argv[0]} [verify|propositions-table|show]")
    return 2

if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
