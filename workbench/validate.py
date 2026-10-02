#!/usr/bin/env python3
"""Validate a MAGE model system against the schemas AND the semantic rules JSON Schema cannot express.

Usage:
    python3 workbench/validate.py workbench/examples/docable.mage.yaml
    python3 workbench/validate.py --self-test

Two layers, in order:

  1. SHAPE  -- mage-model.schema.json (JSON Schema Draft 2020-12).
  2. MEANING -- the numbered rules in SEMANTICS.md that reference resolution, graph acyclicity, or
     loader behaviour put beyond a schema's reach. Each finding cites its rule id, so an error
     message, a test, and the spec all say the same thing.

Exit codes: 0 clean, 1 findings, 2 missing dependency.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

try:
    import yaml
    from jsonschema import Draft202012Validator
except ImportError as exc:  # pragma: no cover - dependency surface
    print(f"missing dependency: {exc}. pip install pyyaml jsonschema", file=sys.stderr)
    sys.exit(2)

HERE = pathlib.Path(__file__).parent

# YAML 1.1 implicit-types these bare scalars; an id among them is read as a bool/null and the
# loaded model silently differs from the written one (V25). Refused rather than quoted-and-hoped.
YAML_COERCED = {
    "y", "n", "yes", "no", "true", "false", "on", "off", "null", "~",
    "Y", "N", "Yes", "No", "True", "False", "On", "Off", "Null", "NULL", "TRUE", "FALSE",
    "YES", "NO", "ON", "OFF",
}


class Findings:
    def __init__(self) -> None:
        self.rows: list[tuple[str, str, str]] = []

    def add(self, rule: str, where: str, message: str) -> None:
        self.rows.append((rule, where, message))

    def __bool__(self) -> bool:
        return bool(self.rows)

    def report(self) -> None:
        for rule, where, message in self.rows:
            print(f"  [{rule}] {where}: {message}")


def _ids_of(obj: object) -> list[str]:
    return list(obj.keys()) if isinstance(obj, dict) else []


def check_shape(doc: object, f: Findings) -> None:
    schema = json.loads((HERE / "mage-model.schema.json").read_text())
    for err in sorted(Draft202012Validator(schema).iter_errors(doc), key=lambda e: list(e.path)):
        path = "/" + "/".join(str(p) for p in err.path) if err.path else "(root)"
        f.add("SCHEMA", path, err.message)


def check_coercion(doc: dict, f: Findings) -> None:
    """V25 -- ids a YAML 1.1 loader would coerce.

    Runs BEFORE the shape pass on purpose. A coerced id reaches the schema as a boolean, and the
    schema's honest complaint ("True does not match pattern ...") is precisely the unhelpful message
    V25 exists to replace. If this fires, the loaded model differs from the written one and every
    downstream finding is suspect.
    """
    for scope in ("entities", "machines", "events", "models", "relation-types", "domains"):
        for key in (doc.get(scope) or {}):
            if isinstance(key, bool) or key is None:
                f.add("V25", scope, f"id loaded as {key!r} -- a YAML 1.1 loader coerced it "
                                    "(you probably wrote `on`, `off`, `yes` or `no`). Rename it; the "
                                    "workbench refuses to load a different model than you wrote.")
            elif str(key) in YAML_COERCED:
                f.add("V25", f"{scope}.{key}", "id is in YAML's implicit-boolean/null set; rename it.")
    for mname, m in (doc.get("machines") or {}).items():
        if not isinstance(m, dict):
            continue
        for sname in _ids_of(m.get("states")):
            if isinstance(sname, bool) or sname is None or str(sname) in YAML_COERCED:
                f.add("V25", f"machines.{mname}.states",
                      f"state id {sname!r} would be coerced by a YAML loader; rename it. "
                      "A machine with states `on` and `off` is the canonical example and the canonical casualty.")
        for i, t in enumerate(m.get("transitions") or []):
            if isinstance(t, dict) and (True in t or False in t):
                f.add("V25", f"machines.{mname}.transitions[{i}]",
                      "a boolean key is present -- you almost certainly wrote `on:`, which YAML reads "
                      "as `true`. The synchronization key is `sync:`.")


def check_meaning(doc: dict, f: Findings) -> None:
    entities = doc.get("entities") or {}
    machines = doc.get("machines") or {}
    events = doc.get("events") or {}
    models = doc.get("models") or {}
    rel_types = doc.get("relation-types") or {}
    domains = doc.get("domains") or {}

    # V3 -- models reference system-level entities; they never redeclare them.
    for mid, model in models.items():
        for eid in (model.get("entities") or []):
            if eid not in entities:
                f.add("V3", f"models.{mid}.entities", f"'{eid}' is not a declared system entity.")
        for rel in (model.get("relations") or []):
            for side in ("from", "to"):
                if rel.get(side) not in entities:
                    f.add("V3", f"models.{mid}.relations", f"{side}: '{rel.get(side)}' is not a declared entity.")
            if rel.get("type") not in rel_types:
                f.add("V3", f"models.{mid}.relations", f"type: '{rel.get('type')}' is not a declared relation-type.")

    # V4 / V5 -- containment acyclic, single-parent.
    parent: dict[str, str] = {}
    for eid, ent in entities.items():
        for child in ((ent or {}).get("contains") or []):
            if child not in entities:
                f.add("V3", f"entities.{eid}.contains", f"'{child}' is not a declared entity.")
            elif child in parent:
                f.add("V5", f"entities.{eid}.contains", f"'{child}' already contained by '{parent[child]}' -- containment is single-parent.")
            else:
                parent[child] = eid
    for eid in entities:
        seen, cur = set(), eid
        while cur in parent:
            cur = parent[cur]
            if cur in seen or cur == eid:
                f.add("V4", f"entities.{eid}", "containment cycle.")
                break
            seen.add(cur)

    # V6 / V9 / V10 / V1 -- machine-level reference resolution.
    for mname, m in machines.items():
        states = set(_ids_of(m.get("states")))
        if (ent := m.get("entity")) is not None and ent not in entities:
            f.add("V6", f"machines.{mname}.entity", f"'{ent}' is not a declared entity.")
        if (init := m.get("initial")) not in states:
            f.add("V9", f"machines.{mname}.initial", f"'{init}' is not a declared state of this machine.")
        for i, t in enumerate(m.get("transitions") or []):
            for side in ("from", "to"):
                if t.get(side) not in states:
                    f.add("V10", f"machines.{mname}.transitions[{i}]", f"{side}: '{t.get(side)}' is not a declared state.")
            if (ev := t.get("sync")) is not None:
                if ev not in events:
                    f.add("V1", f"machines.{mname}.transitions[{i}].sync", f"'{ev}' is not a declared event.")
                elif mname not in (events[ev].get("participants") or []):
                    f.add("V12", f"machines.{mname}.transitions[{i}].sync",
                          f"machine is not listed among '{ev}' participants.")

    # V12 -- every declared participant actually participates; V14 -- no multiplicity in sync.
    for ev, spec in events.items():
        for part in (spec.get("participants") or []):
            if part not in machines:
                f.add("V12", f"events.{ev}.participants", f"'{part}' is not a declared machine.")
                continue
            if int(machines[part].get("instances", 1)) > 1:
                f.add("V14", f"events.{ev}.participants",
                      f"'{ev}' synchronizes with multiply-instantiated machine '{part}'. Participant "
                      "selection is not supported by this version. Model the participants explicitly, "
                      "or use a single instance.")
            offers = any(t.get("sync") == ev for t in (machines[part].get("transitions") or []))
            if not offers:
                f.add("V12", f"events.{ev}.participants",
                      f"'{part}' never declares a transition with sync: {ev} -- a participant that never participates.")

    # V11 -- guards may not reference a multiply-instantiated machine.
    multi = {n for n, m in machines.items() if int(m.get("instances", 1)) > 1}
    for mname, m in machines.items():
        for i, t in enumerate(m.get("transitions") or []):
            for key in (t.get("requires") or {}):
                head = str(key).split(".")[0]
                if head in multi:
                    f.add("V11", f"machines.{mname}.transitions[{i}].requires",
                          f"guard references multiply-instantiated machine '{head}'; there is no participant selection in v0.1.")

    # V15 / V17 -- reserved ref type; every variable finitely bounded.
    for mname, m in machines.items():
        for vname, v in (m.get("variables") or {}).items():
            vtype = (v or {}).get("type")
            if vtype == "ref":
                f.add("V15", f"machines.{mname}.variables.{vname}",
                      "variables of type 'ref' are a reserved future shape and are not v0.1 semantics.")
            elif vtype == "integer" and "range" not in v and "domain" not in v:
                f.add("V17", f"machines.{mname}.variables.{vname}", "integer variable needs a finite range or a domain.")
            if (dom := (v or {}).get("domain")) is not None and dom not in domains:
                f.add("V17", f"machines.{mname}.variables.{vname}", f"domain '{dom}' is not declared.")

    # V19 -- derived dependency graph acyclic (token-level, which is enough to catch self/mutual reference).
    for mname, m in machines.items():
        derived = m.get("derived") or {}
        deps = {k: {tok for tok in str(expr).replace("(", " ").replace(")", " ").split() if tok in derived}
                for k, expr in derived.items()}
        for start in derived:
            seen, stack = set(), [start]
            while stack:
                cur = stack.pop()
                for nxt in deps.get(cur, ()):
                    if nxt == start:
                        f.add("V19", f"machines.{mname}.derived.{start}", "derived value participates in a cycle.")
                        stack = []
                        break
                    if nxt not in seen:
                        seen.add(nxt)
                        stack.append(nxt)

    # V20 -- order comparisons need the same ordered domain on both sides.
    def prop_domain(eid: str, name: str) -> str | None:
        prop = ((entities.get(eid) or {}).get("properties") or {}).get(name)
        return prop.get("domain") if isinstance(prop, dict) else None

    ordered = {d for d, spec in domains.items() if (spec or {}).get("type") == "ordered-enum"}
    for qid, q in (doc.get("queries") or {}).items():
        for cmp_ in (((q.get("graph") or {}).get("where") or {}).get("compare") or []):
            if cmp_.get("op") not in {"lt", "le", "gt", "ge"}:
                continue
            doms = set()
            for side in ("left", "right"):
                ref = str(cmp_.get(side, ""))
                name = ref.split(".", 1)[1] if "." in ref else ref
                doms |= {prop_domain(eid, name) for eid in entities if prop_domain(eid, name)}
            if not doms:
                f.add("V20", f"queries.{qid}", f"order comparison {cmp_.get('left')} {cmp_.get('op')} {cmp_.get('right')}: neither side declares a domain.")
            elif len(doms) > 1:
                f.add("V20", f"queries.{qid}", f"order comparison spans different domains {sorted(doms)}.")
            elif not (doms & ordered):
                f.add("V20", f"queries.{qid}", f"domain {doms.pop()!r} is not an ordered-enum; <,>,<=,>= are not defined on it.")

    # V7 -- a multi-hop query over a relation whose composition forbids paths must be REFUSED.
    multihop = {"reachability", "path", "shortest-path", "all-paths"}
    for qid, q in (doc.get("queries") or {}).items():
        g = q.get("graph") or {}
        if g.get("form") in multihop:
            rt = rel_types.get(g.get("relation")) or {}
            if ((rt.get("composition") or {}).get("path")) == "forbidden":
                print(f"  [note V7] queries.{qid}: multi-hop '{g.get('form')}' over "
                      f"'{g.get('relation')}' is UNLICENSED by design -- the engine must return "
                      f"outcome=unlicensed with a refusal, not an answer.")

    # V24 -- omits is checked against the model's real vocabulary, not merely asserted.
    for mid, model in models.items():
        vocab = {rel.get("type") for rel in (model.get("relations") or [])}
        for eid in (model.get("entities") or []):
            vocab |= set(((entities.get(eid) or {}).get("properties") or {}).keys())
        for omitted in ((model.get("purpose") or {}).get("omits") or []):
            if omitted in vocab:
                f.add("V24", f"models.{mid}.purpose.omits",
                      f"'{omitted}' is declared omitted but appears in this model -- the declaration would lie to a reader.")


def validate(path: pathlib.Path) -> int:
    print(f"mage-validate: {path}")
    try:
        doc = yaml.safe_load(path.read_text())
    except yaml.YAMLError as exc:
        print(f"  [YAML] {exc}")
        return 1
    f = Findings()
    if isinstance(doc, dict):
        check_coercion(doc, f)
    if f:
        print(f"mage-validate: {len(f.rows)} finding(s) -- the loader changed your model; nothing else was checked")
        f.report()
        return 1
    check_shape(doc, f)
    if not f and isinstance(doc, dict):
        check_meaning(doc, f)
    elif f:
        print("  (meaning checks skipped -- fix the shape findings first)")
    if f:
        print(f"mage-validate: {len(f.rows)} finding(s)")
        f.report()
        return 1
    print("mage-validate: clean -- shape and meaning")
    return 0


def self_test() -> int:
    """Each case must produce the cited finding. A validator nobody tested is a validator nobody trusts."""
    base = {"mage": 1, "system": {"id": "t"}}
    cases: list[tuple[str, dict]] = [
        ("V9", {**base, "machines": {"m": {"initial": "nope", "states": {"a": None}, "transitions": []}}}),
        ("V10", {**base, "machines": {"m": {"initial": "a", "states": {"a": None},
                                            "transitions": [{"from": "a", "to": "ghost"}]}}}),
        ("V25", {**base, "machines": {"m": {"initial": "a", "states": {"a": None, True: None},
                                            "transitions": []}}}),
        ("V14", {**base,
                 "events": {"e": {"participants": ["m", "w"]}},
                 "machines": {"m": {"initial": "a", "states": {"a": None, "b": None},
                                    "transitions": [{"from": "a", "to": "b", "sync": "e"}]},
                              "w": {"instances": 2, "initial": "a", "states": {"a": None, "b": None},
                                    "transitions": [{"from": "a", "to": "b", "sync": "e"}]}}}),
        ("V11", {**base, "machines": {"w": {"instances": 2, "initial": "a", "states": {"a": None}, "transitions": []},
                                      "m": {"initial": "a", "states": {"a": None, "b": None},
                                            "transitions": [{"from": "a", "to": "b", "requires": {"w.state": "a"}}]}}}),
        ("V12", {**base, "events": {"e": {"participants": ["m", "w"]}},
                 "machines": {"m": {"initial": "a", "states": {"a": None, "b": None},
                                    "transitions": [{"from": "a", "to": "b", "sync": "e"}]},
                              "w": {"initial": "a", "states": {"a": None}, "transitions": []}}}),
        ("V15", {**base, "machines": {"m": {"initial": "a", "states": {"a": None}, "transitions": [],
                                            "variables": {"h": {"type": "ref", "target": "m"}}}}}),
        ("V19", {**base, "machines": {"m": {"initial": "a", "states": {"a": None}, "transitions": [],
                                            "derived": {"x": "y + 1", "y": "x + 1"}}}}),
        ("V24", {**base,
                 "relation-types": {"calls": {"description": "d", "composition": {"path": "allowed"}}},
                 "entities": {"a": {"type": "s"}, "b": {"type": "s"}},
                 "models": {"g": {"type": "graph", "entities": ["a", "b"],
                                  "purpose": {"omits": ["calls"]},
                                  "relations": [{"from": "a", "to": "b", "type": "calls"}]}}}),
    ]
    failures = 0
    for expect, doc in cases:
        f = Findings()
        check_coercion(doc, f)
        if not f:
            check_shape(doc, f)
            if not [r for r in f.rows if r[0] == "SCHEMA"]:
                check_meaning(doc, f)
        rules = {r[0] for r in f.rows}
        if expect in rules:
            print(f"  [ok  ] {expect} detected")
        else:
            failures += 1
            print(f"  [FAIL] {expect} NOT detected; got {sorted(rules) or 'nothing'}")
    example = HERE / "examples" / "docable.mage.yaml"
    if example.exists():
        f = Findings()
        doc = yaml.safe_load(example.read_text())
        check_coercion(doc, f)
        check_shape(doc, f)
        check_meaning(doc, f)
        if f:
            failures += 1
            print(f"  [FAIL] the worked example should be clean; {len(f.rows)} finding(s)")
            f.report()
        else:
            print("  [ok  ] worked example is clean under both layers")
    print(f"self-test: {'PASS' if not failures else f'{failures} FAILURE(S)'}")
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path", nargs="?", type=pathlib.Path, help="a .mage.yaml model system")
    ap.add_argument("--self-test", action="store_true", help="check that each rule fires on a model that violates it")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not args.path:
        ap.error("give a path, or --self-test")
    return validate(args.path)


if __name__ == "__main__":
    sys.exit(main())
