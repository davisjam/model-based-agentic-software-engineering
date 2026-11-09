"""Validate the active four-proposition theory schema and its dynamic-model joins.

TM1 checks proposition bodies/IDs; TM2 resolves loops/moderators; TM3 keeps any
corollary status explicit; TM4 resolves moderator endpoints; TM5 resolves relations;
TM6 preserves loop typing; TM7 checks direct archival crosswalk targets. The active
projection model combines these findings with the exact P1–P4 set and table parity.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass

_HERE = os.path.dirname(os.path.abspath(__file__))
_THEORY_DECLARED = os.path.join(_HERE, "theory_of_mage_declared.json")


@dataclass
class Finding:
    code: str
    message: str


def _load() -> dict:
    return json.load(open(_THEORY_DECLARED, encoding="utf-8"))


# ---- id universes (derived from the model, never hardcoded) ----------------------------------------

def _construct_ids(m: dict) -> "set[str]":
    return {c["id"] for c in m.get("constructs", []) if isinstance(c, dict) and "id" in c}


def _loop_refs(m: dict) -> "set[str]":
    """Every token that resolves a loop: its `id` AND its `number` (as a string), since propositions and the
    typing both reference loops, and some fields use the id while others use the number."""
    out: "set[str]" = set()
    for lp in m.get("loops", []):
        if not isinstance(lp, dict):
            continue
        if "id" in lp:
            out.add(str(lp["id"]))
        if "number" in lp:
            out.add(str(lp["number"]))
    return out


def _loop_ids(m: dict) -> "list[str]":
    return [lp["id"] for lp in m.get("loops", []) if isinstance(lp, dict) and "id" in lp]


def _outcome_ids(m: dict) -> "set[str]":
    return {o["id"] for o in m.get("outcomes", []) if isinstance(o, dict) and "id" in o}


def _proposition_ids(m: dict) -> "set[str]":
    return {h["id"] for h in m.get("propositions", []) if isinstance(h, dict) and "id" in h}


def _aggregate_endpoints(m: dict) -> "set[str]":
    """Non-construct endpoints the model declares as first-class nodes elsewhere, so a moderator may name
    them: `outcomes` (the outcomes collection) when an outcomes array exists; `apparatus` when the model
    declares the apparatus-measures caveat (apparatus is the count of controls/gates/models — a driver node
    the model discusses but does not enumerate among the constructs)."""
    out: "set[str]" = set()
    if isinstance(m.get("outcomes"), list) and m["outcomes"]:
        out.add("outcomes")
    if "apparatus_measures_caveat" in m:
        out.add("apparatus")
    return out


# ---- checks ----------------------------------------------------------------------------------------

def check(m: "dict | None" = None) -> "list[Finding]":
    if m is None:
        m = _load()
    findings: "list[Finding]" = []
    construct_ids = _construct_ids(m)
    loop_refs = _loop_refs(m)
    outcome_ids = _outcome_ids(m)
    proposition_ids = _proposition_ids(m)
    aggregate = _aggregate_endpoints(m)
    moderator_endpoints = construct_ids | outcome_ids | loop_refs | aggregate
    tie_universe = construct_ids | loop_refs | outcome_ids | proposition_ids

    # TM1 + TM2 — active proposition bodies and joins.
    seen_ids: set[str] = set()
    for h in m.get("propositions", []):
        hid = h.get("id", "<no-id>")
        if not h.get("id") or h["id"] in seen_ids:
            findings.append(Finding("TM1", f"missing or duplicate proposition id {hid!r}"))
        seen_ids.add(hid)
        for field in ("name", "short_id", "mechanism", "scope_conditions", "core_quantity"):
            if not h.get(field):
                findings.append(Finding("TM1", f"proposition {hid!r} has empty {field!r}"))
        if h.get("frame") != "offered-for-replication":
            findings.append(Finding("TM1", f"proposition {hid!r} must retain its offered-for-replication frame"))

        if not str(h.get("statement", "")).strip():
            findings.append(Finding("TM1", f"proposition {hid!r} has an empty `statement`"))
        if not str(h.get("potential_disconfirmation", "")).strip():
            findings.append(Finding("TM1", f"proposition {hid!r} has an empty `potential_disconfirmation` (not falsifiable)"))
        loops = h.get("loops", [])
        if not loops:
            findings.append(Finding("TM2", f"proposition {hid!r} names no `loops`"))
        for lref in loops:
            if str(lref) not in loop_refs:
                findings.append(Finding("TM2", f"proposition {hid!r} loop ref {lref!r} resolves to no loop"))
        for mref in h.get("moderated_by", []) or []:
            if mref not in {mod.get("id") for mod in m.get("moderators", [])}:
                findings.append(Finding("TM2", f"proposition {hid!r} moderated_by {mref!r} resolves to no moderator"))

    # TM3 — corollaries.
    for i, c in enumerate(m.get("corollaries", [])):
        if not str(c.get("status", "")).strip():
            label = c.get("claim", f"#{i}")
            findings.append(Finding("TM3", f"corollary {label!r} has an empty `status`"))

    # TM4 — moderator operates_on endpoints.
    for mod in m.get("moderators", []):
        mid = mod.get("id", "<no-id>")
        expr = str(mod.get("operates_on", ""))
        if not expr.strip():
            findings.append(Finding("TM4", f"moderator {mid!r} has an empty `operates_on`"))
            continue
        endpoints = [e.strip() for e in expr.split("->")]
        for ep in endpoints:
            if ep and ep not in moderator_endpoints:
                findings.append(Finding("TM4", f"moderator {mid!r} operates_on endpoint {ep!r} resolves to no construct/outcome/loop/declared node"))

    # TM5 — relation ties_to.
    for r in m.get("relations", []):
        rid = r.get("id", "<no-id>")
        for tie in r.get("ties_to", []):
            if tie not in tie_universe:
                findings.append(Finding("TM5", f"relation {rid!r} ties_to {tie!r} resolves to no declared id"))

    # TM6 — loop_typing partitions the loops exactly.
    declared_loops = _loop_ids(m)
    typing = m.get("loop_typing", {})
    seen: "dict[str, int]" = {}
    for group, spec in typing.items():
        if group.startswith("_") or not isinstance(spec, dict):
            continue
        for lref in spec.get("loops", []):
            if lref not in declared_loops:
                findings.append(Finding("TM6", f"loop_typing group {group!r} names loop {lref!r} which is not a declared loop"))
            seen[lref] = seen.get(lref, 0) + 1
    for lid in declared_loops:
        if lid not in seen:
            findings.append(Finding("TM6", f"loop {lid!r} is declared but named in no loop_typing group (gap)"))
    for lref, n in seen.items():
        if n > 1 and lref in declared_loops:
            findings.append(Finding("TM6", f"loop {lref!r} appears in {n} loop_typing groups (overlap — a loop has one type)"))

    # Historical IDs document the migration; they cannot create additional active claims.
    for old, target in m.get("legacy_id_crosswalk", {}).items():
        if old in proposition_ids or target not in proposition_ids:
            findings.append(Finding("TM7", f"legacy ID {old!r} has invalid active target {target!r}"))
    return findings


def _shape(m: dict) -> dict:
    return {
        "propositions": len(m.get("propositions", [])),
        "proposition_ids": [h.get("id") for h in m.get("propositions", [])],
        "loops": len(m.get("loops", [])),
        "constructs": len(m.get("constructs", [])),
        "moderators": len(m.get("moderators", [])),
        "outcomes": len(m.get("outcomes", [])),
        "corollaries": len(m.get("corollaries", [])),
        "relations": len(m.get("relations", [])),
    }


# ---- CLI -------------------------------------------------------------------------------------------

def render(as_json: bool = False) -> int:
    m = _load()
    findings = check(m)
    shape = _shape(m)
    if as_json:
        print(json.dumps({
            "_note": ("Theory-model completeness — internal well-formedness of theory_of_mage_declared.json. "
                      "Audit-only (REPORT, never gate); a finding is a review candidate for the author."),
            "shape": shape,
            "complete": not findings,
            "findings": [{"code": f.code, "message": f.message} for f in findings],
        }, ensure_ascii=False, indent=2))
        return 0
    print("== theory-model completeness — theory_of_mage_declared.json ==")
    print(f"  shape: {shape['propositions']} propositions ({', '.join(str(x) for x in shape['proposition_ids'])}), "
          f"{shape['loops']} loops, {shape['constructs']} constructs, {shape['moderators']} moderators, "
          f"{shape['outcomes']} outcomes, {shape['corollaries']} corollaries, {shape['relations']} relations")
    if findings:
        print(f"\n== {len(findings)} finding(s) (audit-only — review candidates, not build stops) ==")
        for f in findings:
            print(f"  [{f.code}] {f.message}")
    else:
        print("  complete — every proposition has a statement + potential_disconfirmation, every loop/moderator/relation "
              "ref resolves, corollaries carry a status, and loop_typing partitions the loops exactly.")
    return 0


def main(argv: "list[str]") -> int:
    if len(argv) > 1 and argv[1] == "json":
        return render(as_json=True)
    return render(as_json=False)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
