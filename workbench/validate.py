#!/usr/bin/env python3
"""Validate a MAGE model system against the schemas AND the semantic rules JSON Schema cannot express.

Usage:
    python3 workbench/validate.py workbench/examples/docable.mage.yaml
    python3 workbench/validate.py --self-test

Three layers, in order:

  1. SHAPE  -- mage-model.schema.json (JSON Schema Draft 2020-12).
  2. MEANING -- the numbered rules in SEMANTICS.md that reference resolution, graph acyclicity, or
     loader behaviour put beyond a schema's reach. Each finding cites its rule id, so an error
     message, a test, and the spec all say the same thing.
  3. ANNOTATION -- malformed notes. Last and separate because A1 holds that annotation never alters
     semantic interpretation; folding it into layer 2 would file it among the rules that fix meaning.

Exit codes: 0 clean, 1 findings, 2 missing dependency.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
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

# Guard comparison operators, in the order canonicalize.ts reads them, so a `{lt: 1, gt: 9}` guard
# yields the same two comparisons on both sides and the parity test compares like with like.
GUARD_OPS = ("eq", "ne", "lt", "le", "gt", "ge")
ORDER_OPS = frozenset({"lt", "le", "gt", "ge"})

# Keys that belong on a note. Anything else is the stray key an unquoted comma leaves behind.
NOTE_KEYS = frozenset({"id", "kind", "text", "author", "at"})

SCALAR_TYPES = (str, bool, int, float)

# The dimension table, mirroring src/ir/types.ts DIMENSIONS. Duplicated across the language boundary
# the way GUARD_OPS and YAML_COERCED already are -- a small closed table is the cheapest thing to
# copy, and a drifted factor shows up as a parity mismatch because a reversed `[1 GB, 1 MB]` range
# only fires when both sides agree that GB exceeds MB.
#
# Every factor is an integer multiple of a power of two (1, 1000, 1024, 2**-10), so normalizing an
# exactly-representable magnitude introduces no rounding and `128 KB + 1 MB` is 1.125 on the nose.
# That is why a normalized magnitude is a plain float on both sides instead of a rational.
DIMENSIONS: dict[str, dict] = {
    "duration": {"base": "ms", "units": {"ms": 1.0, "s": 1000.0}, "scope": "execution", "maximum": None},
    "memory": {"base": "MB", "units": {"KB": 0.0009765625, "MB": 1.0, "GB": 1024.0},
               "scope": "configuration", "maximum": None},
    "cost": {"base": "usd", "units": {"usd": 1.0}, "scope": "execution", "maximum": None},
    "ratio": {"base": None, "units": {}, "scope": "structural", "maximum": 1.0},
    "count": {"base": None, "units": {}, "scope": "structural", "maximum": None},
}

DIMENSION_IDS = ("duration", "memory", "cost", "ratio", "count")
UNIT_DIMENSIONS = {u: d for d in DIMENSION_IDS for u in DIMENSIONS[d]["units"]}

TARGET_KINDS = ("transition", "relation", "entity", "state", "parameter", "model")

# Kinds an accounting rule has an opinion about: the ones that occur INSIDE an execution or a
# configuration. `model` addresses a whole model, so it is a declared TOTAL that a requirement is
# compared against rather than an occurrence something accumulates; `parameter` resolves to nothing
# (V27). Mirrors src/ir/types.ts ACCOUNTABLE_TARGET_KINDS / AGGREGATE_TARGET_KIND.
ACCOUNTABLE_TARGET_KINDS = ("transition", "relation", "entity", "state")
AGGREGATE_TARGET_KIND = "model"

# The declared accounting model (SEMANTICS.md §5.3). Mirrors src/ir/types.ts.
#
# A metric is not a dimension: the ruling writes `accounting.latency` over quantities whose dimension
# is `duration`, because `latency` names the ANALYSIS and `duration` the unit algebra. Membership is
# DERIVED -- a metric is path-aggregated exactly when its dimension's scope is `execution` -- and
# test/quantities.test.ts walks DIMENSIONS to assert the two agree.
ACCOUNTED_METRICS = {"latency": "duration", "cost": "cost"}
ACCOUNTED_METRIC_IDS = ("latency", "cost")

# Both vocabularies are CLOSED at one member for v0.1, and closed is the point: adding `transitions`
# accounting, or a second residency, is then a deliberate act. The ruling rejected a permissive `all`
# basis because "double counting then becomes an authoring problem with no principled answer", and a
# permissive vocabulary cannot be narrowed later without breaking every model that relied on it.
ACCOUNTING_BASES = ("entities",)
BASIS_TARGET_KINDS = {"entities": ("entity",)}
RESIDENCIES = ("resident",)

# The only key a `when` block carries in v0.1.
WHEN_KEYS = frozenset({"state"})

# The entity property naming the lifecycle state during whose occupancy that entity runs. Mirrors
# src/ir/types.ts EXECUTES_IN_STATE -- the validator resolves it (V38) and the quantitative
# evaluator joins a trace step through it, so a second spelling anywhere is a join that stops
# joining.
EXECUTES_IN_STATE = "executes_in_state"

METRIC_NAMESPACE = "metrics"
METRIC_NAMES = ("state_count", "transition_count", "entity_count", "relation_count")

EXPR_OPS = frozenset({"+", "-", "*", "/"})

# A plain decimal, and deliberately nothing else. Exotic spellings are where the two loaders this
# project runs disagree, measured: PyYAML reads `017` as 15, `1_000` as 1000 and `1:30` as 90, while
# the `yaml` package reads 17, "1_000" and "1:30". A unit-bearing literal arrives as a STRING, so the
# magnitude is parsed here rather than by a loader and the class is closed outright.
_DECIMAL = re.compile(r"^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$")
_ID_SHAPE = re.compile(r"^[A-Za-z_][A-Za-z0-9_.-]*$")
_INDEX = re.compile(r"^(?:0|[1-9][0-9]*)$")


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


def _numeric(value: object) -> bool:
    """A number, and not a bool. Python makes `True` an int; the IR and the schema do not."""
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _num(x: float) -> str:
    """Format like JavaScript's String(number), so both validators print a magnitude identically."""
    return str(int(x)) if x == int(x) and abs(x) < 1e21 else repr(x)


def _in_domain(value: object, values: list[object]) -> bool:
    """Membership that matches JavaScript's.

    Python holds `True == 1`, so a plain `in` would accept a boolean guard against an integer
    domain here and reject it in the TypeScript validator. The two implementations have to agree on
    the SAME finding, not merely on the rule number.
    """
    return any(isinstance(v, bool) == isinstance(value, bool) and v == value for v in values)


def _int_at(seq: object, i: int) -> int | None:
    return seq[i] if isinstance(seq, list) and len(seq) > i and _numeric(seq[i]) else None


def _domain_values(spec: dict, domains: dict) -> tuple[list[object], bool] | None:
    """The enumerated domain of one raw variable declaration, plus whether it is ordered.

    Mirrors canonicalize.ts: an inline `type` wins, a named domain fills in what the inline
    declaration omits, and the answer is a LIST because finiteness is a list rather than a hope
    (V17). None means the declaration is not finitely bounded, which is V15/V17's finding -- V26
    stays silent on it.
    """
    named = domains.get(spec.get("domain")) if isinstance(spec.get("domain"), str) else None
    named = named if isinstance(named, dict) else {}
    vtype = spec.get("type")
    if vtype == "boolean" or named.get("type") == "boolean":
        return [False, True], False
    if vtype == "integer" or named.get("type") == "integer":
        lo = _int_at(spec.get("range"), 0)
        hi = _int_at(spec.get("range"), 1)
        lo = lo if lo is not None else _int_at(named.get("range"), 0)
        hi = hi if hi is not None else _int_at(named.get("range"), 1)
        if lo is None or hi is None or hi < lo:
            return None
        return list(range(int(lo), int(hi) + 1)), True
    inline = [v for v in (spec.get("values") or []) if isinstance(v, str)] if isinstance(spec.get("values"), list) else []
    values = inline or [v for v in (named.get("values") or []) if isinstance(v, str)]
    return (values, False) if values else None


def _guard_domain(machines: dict, domains: dict, ref: str) -> tuple[list[object], bool, str] | None:
    """What a guard reference can hold, for V26 -- or None, meaning V26 declines to speak.

    None covers every case that belongs to another finding: a head naming no machine, a member the
    machine does not declare, a multiply-instantiated machine (V11), and a variable with no finite
    domain (V15/V17). The engine refuses all of them when it compiles the guard, with the cause
    named, so reporting them here would blame domain membership for a reference error.
    """
    def single(mid: str) -> dict | None:
        m = machines.get(mid)
        if not isinstance(m, dict) or int(m.get("instances", 1) or 1) != 1:
            return None
        return m

    def control(mid: str, m: dict) -> tuple[list[object], bool, str] | None:
        # A machine with no declared states has an empty domain, and nothing is a member of
        # nothing. The machine is already malformed; saying so again under V26 would be noise.
        states: list[object] = sorted(str(s) for s in _ids_of(m.get("states")))
        return (states, False, f"control state of '{mid}'") if states else None

    def member(mid: str, m: dict, name: str) -> tuple[list[object], bool, str] | None:
        if name == "state":
            return control(mid, m)
        variables = m.get("variables") if isinstance(m.get("variables"), dict) else {}
        if name in variables:
            spec = variables[name] if isinstance(variables[name], dict) else {}
            resolved = _domain_values(spec, domains)
            if resolved is None:
                return None
            values, ordered = resolved
            return values, ordered, f"variable '{mid}.{name}'"
        derived = m.get("derived") if isinstance(m.get("derived"), dict) else {}
        if name in derived:
            return [False, True], False, f"derived value '{mid}.{name}'"
        return None

    # Dotted form first, split at the LAST dot: ids may contain dots, member names may not. A head
    # naming no machine falls through, because the whole string may be a bare variable name.
    dot = ref.rfind(".")
    if 0 < dot < len(ref) - 1 and ref[:dot] in machines:
        head = ref[:dot]
        m = single(head)
        return member(head, m, ref[dot + 1:]) if m is not None else None
    bare = single(ref)
    if bare is not None:
        return control(ref, bare)
    if ref in machines:
        return None
    owners = [mid for mid, m in machines.items() if isinstance(m, dict)
              and (ref in (m.get("variables") or {} if isinstance(m.get("variables"), dict) else {})
                   or ref in (m.get("derived") or {} if isinstance(m.get("derived"), dict) else {}))]
    if len(owners) != 1:
        return None
    owner = single(owners[0])
    return member(owners[0], owner, ref) if owner is not None else None


def _guard_comparisons(cond: object) -> list[tuple[str, object]]:
    """One guard entry's (op, value) pairs, exactly as canonicalize.ts builds them."""
    if isinstance(cond, SCALAR_TYPES):
        return [("eq", cond)]
    if isinstance(cond, dict):
        return [(op, cond[op]) for op in GUARD_OPS if op in cond and isinstance(cond[op], SCALAR_TYPES)]
    return []


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


def check_meaning(doc: dict, f: Findings, verbose: bool = True) -> None:
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

    # V26 -- a guard's value must be something its reference can actually hold. A guard against an
    # impossible value is dead: the transition never fires, the reachable set is smaller than the
    # author believes, and every query over it answers a question about a different system.
    for mname, m in machines.items():
        for i, t in enumerate(m.get("transitions") or []):
            requires = t.get("requires") if isinstance(t.get("requires"), dict) else {}
            where = f"machines.{mname}.transitions[{i}].requires"
            for key in sorted(requires, key=str):
                resolved = _guard_domain(machines, domains, str(key))
                if resolved is None:
                    continue
                values, ordered, subject = resolved
                for op, value in _guard_comparisons(requires[key]):
                    if op in ORDER_OPS:
                        # An order comparison on an unordered reference is a typing question, not a
                        # membership one. The engine refuses it with V20's message.
                        nums = [v for v in values if _numeric(v)]
                        if not ordered or not nums:
                            continue
                        lo, hi = min(nums), max(nums)
                        if not _numeric(value) or not lo <= value <= hi:
                            f.add("V26", where,
                                  f"guard '{key} {op} {value}' compares against a value outside the "
                                  f"range of {subject} ({lo}..{hi}), so it is decided before the model runs.")
                    elif not _in_domain(value, values):
                        f.add("V26", where,
                              f"guard '{key} {op} {value}': '{value}' is not in the domain of "
                              f"{subject}. Declared: {', '.join(str(v) for v in values)}.")

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

    # V7 -- a composing query over a relation whose composition forbids paths must be REFUSED.
    # GRAPH_COMPOSING, not a local copy: this list and the evaluator's used to be two literals, and
    # a form added to one and not the other would note nothing while refusing, or refuse nothing
    # while noting.
    for qid, q in (doc.get("queries") or {}).items():
        g = q.get("graph") or {}
        if g.get("form") in GRAPH_COMPOSING:
            rt = rel_types.get(g.get("relation")) or {}
            if ((rt.get("composition") or {}).get("path")) == "forbidden" and verbose:
                print(f"  [note V7] queries.{qid}: composing '{g.get('form')}' over "
                      f"'{g.get('relation')}' is UNLICENSED by design -- the engine must return "
                      f"outcome=unlicensed with a refusal, not an answer.")

    # V27-V31, V35-V37 -- quantities. Last, and through this one entry point so every caller gets
    # them; the pass stays a separate function because it has its own subject and its own tests.
    check_quantities(doc, f)

    # V24 -- omits is checked against the model's real vocabulary, not merely asserted.
    for mid, model in models.items():
        vocab = {rel.get("type") for rel in (model.get("relations") or [])}
        for eid in (model.get("entities") or []):
            vocab |= set(((entities.get(eid) or {}).get("properties") or {}).keys())
        for omitted in ((model.get("purpose") or {}).get("omits") or []):
            if omitted in vocab:
                f.add("V24", f"models.{mid}.purpose.omits",
                      f"'{omitted}' is declared omitted but appears in this model -- the declaration would lie to a reader.")


# ---------------------------------------------------------------------------------------------
# V27-V31, V35-V37 -- quantities. Mirrors src/validator/rules.ts checkQuantities.
#
# Eight subjects, one each: the references resolve (V27), the dimension and the literals are readable
# (V28), the magnitudes are in bounds (V29), the dimensions agree (V30), the reserved `metrics`
# namespace is not shadowed (V31), the accounting basis is declared (V35), each quantity contributes
# through that basis (V36), and a configuration-scoped quantity declares when it is charged (V37).
# ---------------------------------------------------------------------------------------------


def _split_literal(raw: object) -> tuple[str, str, str | None, bool]:
    """(text, number_text, unit, plain) -- a written literal, before any dimension is consulted."""
    if _numeric(raw):
        # str(1e21) is '1e+21', which _DECIMAL refuses, so an absurd magnitude is reported rather
        # than carried downstream in a spelling no author wrote.
        text = str(raw)
        return text, text, None, bool(_DECIMAL.match(text))
    if not isinstance(raw, str):
        return "", "", None, False
    text = raw.strip()
    if not text:
        return "", "", None, False
    words = text.split()
    if len(words) > 2:
        return text, words[0], None, False
    unit = words[1] if len(words) == 2 else None
    return text, words[0], unit, bool(_DECIMAL.match(words[0]))


def _magnitude(raw: object, dimension: str | None) -> tuple[str, str | None, float | None, str | None]:
    """(raw, unit, base, fault) -- one written magnitude, normalized against its declared dimension.

    `base is None` exactly when `fault is not None`: §7's "a quantity reaches anything downstream in
    base units or not at all". The fault is recorded rather than re-derived so both implementations
    produce the same message from the same classification.
    """
    text, number_text, unit, plain = _split_literal(raw)
    if not text:
        return "", None, None, "absent"
    if dimension is None:
        return text, unit, None, "dimension-unknown"
    if not plain:
        return text, unit, None, "spelling"
    spec = DIMENSIONS[dimension]
    dimensionless = spec["base"] is None
    if unit is None:
        if dimensionless:
            return text, None, float(number_text), None
        return text, None, None, "unit-missing"
    if dimensionless:
        return text, unit, None, "unit-forbidden"
    factor = spec["units"].get(unit)
    if factor is None:
        return text, unit, None, "unit-foreign" if unit in UNIT_DIMENSIONS else "unit-unknown"
    return text, unit, float(number_text) * factor, None


def _list_units(dimension: str) -> str:
    return ", ".join(DIMENSIONS[dimension]["units"])


def _fault_message(mag: tuple, dimension: str, part: str) -> str | None:
    """V28's account of a literal that did not reach base units. None when the fault is V30's."""
    raw, unit, _base, fault = mag
    if fault in (None, "unit-foreign", "dimension-unknown"):
        return None
    if fault == "absent":
        return f"{part} has no value. Declare 'value:' or 'range:'."
    if fault == "spelling":
        return (f"{part} '{raw}' is not a plain decimal with an optional unit. Loaders disagree on "
                f"every other spelling -- PyYAML reads '017' as 15 and '1:30' as 90 where the 'yaml' "
                f"package reads 17 and '1:30' -- so the workbench accepts only digits with at most "
                f"one decimal point.")
    if fault == "unit-missing":
        return (f"{part} '{raw}' is a bare number, and {dimension} is measured in "
                f"{_list_units(dimension)}. Write '{raw} {DIMENSIONS[dimension]['base']}' if that is "
                f"what you meant: a silently assumed unit is the dimension error this feature exists "
                f"to prevent.")
    if fault == "unit-forbidden":
        return f"{part} '{raw}' carries a unit, but {dimension} is dimensionless. Write the number alone."
    return (f"{part} '{raw}': '{unit}' is not a unit this workbench knows. {dimension} accepts "
            f"{_list_units(dimension)}.")


def _foreign_message(mag: tuple, dimension: str, part: str) -> str | None:
    """V30's account of the same literal: the unit is real, and it measures something else."""
    raw, unit, _base, fault = mag
    if fault != "unit-foreign":
        return None
    return (f"{part} '{raw}' is measured in {UNIT_DIMENSIONS.get(unit)}, but this quantity declares "
            f"{dimension}. §7 forbids silently coercing one dimension into another.")


def _class_of(d: str | None) -> str:
    """What arithmetic sees. `ratio` and `count` both collapse to dimensionless -- a proportion and a
    tally are both pure numbers, which is what lets `metrics.state_count * 2 ms` be a duration
    without making `ms * ms` legal."""
    return "dimensionless" if d is None or d in ("ratio", "count") else d


def _relations(doc: dict) -> list[dict]:
    """Every relation, flattened across models -- the IR's own shape."""
    out = []
    for model in (doc.get("models") or {}).values():
        if isinstance(model, dict):
            out += [r for r in (model.get("relations") or []) if isinstance(r, dict)]
    return out


def _target(raw: object) -> tuple[str, str | None, str]:
    """(raw, kind, ref). kind is None when the prefix is not one of the six."""
    text = raw.strip() if isinstance(raw, str) else ""
    colon = text.find(":")
    if colon <= 0:
        return text, None, text
    head = text[:colon]
    return text, head if head in TARGET_KINDS else None, text[colon + 1:].strip()


def _state_fault(doc: dict, subject: str, ref: str, qualify_prefix: str) -> str | None:
    """Where a state reference points, or the reason it points nowhere.

    ONE resolver for both of a quantity's state references -- its `target: state:...` and its
    `when: { state: ... }`. They are the same question, so a second resolver would be two rules
    drifting apart: the bare-name ambiguity refusal would be fixed in one and not the other.
    """
    machines = doc.get("machines") or {}
    dot = ref.rfind(".")
    if 0 < dot < len(ref) - 1:
        head, name = ref[:dot], ref[dot + 1:]
        if head not in machines:
            return f"{subject}: '{head}' is not a declared machine."
        states = _ids_of((machines[head] or {}).get("states"))
        return None if name in states else f"{subject}: '{head}' declares no state '{name}'."
    # A bare state name resolves only when unambiguous, which is how src/engine/refs.ts treats a
    # bare variable: refuse the ambiguity rather than pick a machine.
    owners = [mid for mid, m in machines.items()
              if isinstance(m, dict) and ref in _ids_of(m.get("states"))]
    if len(owners) == 1:
        return None
    if not owners:
        return f"{subject}: no machine declares a state '{ref}'."
    return (f"{subject}: {len(owners)} machines declare a state '{ref}'. Qualify it as "
            f"{qualify_prefix}<machine>.{ref}.")


def _target_fault(doc: dict, target: tuple[str, str | None, str]) -> str | None:
    """Where a quantity's target points, or the reason it points nowhere (V27)."""
    raw, kind, ref = target
    machines = doc.get("machines") or {}
    if kind is None:
        return f"target '{raw}' names no kind. Write one of {' '.join(k + ':' for k in TARGET_KINDS)}."
    if not ref:
        return f"target '{raw}' names a kind but no object."
    if kind == "entity":
        return None if ref in (doc.get("entities") or {}) else f"target '{raw}': '{ref}' is not a declared entity."
    if kind == "model":
        return None if ref in (doc.get("models") or {}) else f"target '{raw}': '{ref}' is not a declared model."
    if kind == "relation":
        # By id, never by endpoints. §9 requires a STABLE semantic id, and `a->b` is not one: a second
        # edge between the same pair would silently make the annotation ambiguous.
        if any(r.get("id") == ref for r in _relations(doc)):
            return None
        return (f"target '{raw}': no relation declares id '{ref}'. A quantity addresses a relation "
                f"through its own 'id:', which an unidentified relation does not have.")
    if kind == "state":
        return _state_fault(doc, f"target '{raw}'", ref, "state:")
    if kind == "transition":
        # Transitions carry no id, and label: carries no semantics (V1) -- addressing one by label
        # would make a documentation string load-bearing. Machine plus index is the stable handle,
        # which is already how a transaction deletes one.
        hashed = ref.rfind("#")
        if hashed <= 0 or hashed == len(ref) - 1:
            return (f"target '{raw}': address a transition as transition:<machine>#<index>. A "
                    f"transition has no id, and 'label:' carries no semantics (V1), so an index is "
                    f"the only stable handle.")
        head, text = ref[:hashed], ref[hashed + 1:]
        if head not in machines:
            return f"target '{raw}': '{head}' is not a declared machine."
        count = len([t for t in ((machines[head] or {}).get("transitions") or []) if isinstance(t, dict)])
        if not _INDEX.match(text) or int(text) >= count:
            return (f"target '{raw}': '{head}' declares {count} transition(s), so index '{text}' "
                    f"addresses none.")
        return None
    return (f"target '{raw}': 'parameter:' is a reserved future shape. v0.1 represents no parameters, "
            f"so no parameter target can resolve -- annotate the transition or entity instead.")


def _classify_operand(text: str) -> tuple:
    """('literal', magnitude, dimension) | ('metric', name) | ('quantity', id) | ('unreadable', text)."""
    _t, number_text, unit, plain = _split_literal(text)
    if unit is not None:
        # A recognised unit makes this a LITERAL even when its decimal is misspelled, so `017 ms` is
        # reported as a spelling the loaders disagree on rather than as an unrecognisable name.
        owner = UNIT_DIMENSIONS.get(unit)
        if owner is not None:
            return "literal", _magnitude(text, owner), owner
    elif plain:
        return "literal", (text.strip(), None, float(number_text), None), None
    if text == METRIC_NAMESPACE:
        return "metric", ""
    if text.startswith(METRIC_NAMESPACE + "."):
        return "metric", text[len(METRIC_NAMESPACE) + 1:]
    if _ID_SHAPE.match(text):
        return "quantity", text
    return "unreadable", text


def _parse_expression(source: str) -> list[tuple[str, list[tuple[str, tuple]]]]:
    """`metrics.state_count * 2 ms` -> a sum of products. Mirrors canonicalize.ts parseExpression.

    An operator MUST stand alone between spaces, because an id may contain `-` and splitting on the
    character would cut a reference in half. Parentheses are not v0.1 syntax, so a token carrying one
    becomes an unreadable operand that V28 reports instead of being dropped from the dimension check.
    """
    words = source.split()
    terms: list[tuple[str, list[tuple[str, tuple]]]] = []
    term_op, factor_op = "+", "*"
    factors: list[tuple[str, tuple]] = []
    pending: list[str] = []

    def flush_factor() -> None:
        nonlocal pending
        if pending:
            factors.append((factor_op, _classify_operand(" ".join(pending))))
            pending = []

    def flush_term() -> None:
        nonlocal factors
        flush_factor()
        if factors:
            terms.append((term_op, factors))
            factors = []

    for w in words:
        if w not in EXPR_OPS:
            pending.append(w)
        elif w in ("+", "-"):
            flush_term()
            term_op, factor_op = w, "*"
        else:
            flush_factor()
            factor_op = w
    # A trailing operator would otherwise vanish and the expression would check clean while meaning
    # something the author did not write.
    if words and words[-1] in EXPR_OPS:
        factors.append((factor_op, ("unreadable", words[-1])))
    flush_term()
    return terms


def _operand_dimension(quantities: dict, operand: tuple) -> str | None:
    kind = operand[0]
    if kind == "literal":
        return operand[2]
    if kind == "metric":
        return "count"
    if kind == "quantity":
        spec = quantities.get(operand[1])
        declared = (spec or {}).get("dimension")
        return declared if declared in DIMENSION_IDS else None
    return None


def _check_expression(doc: dict, f: Findings, qid: str, dimension: str, source: str) -> None:
    """V27/V28 then V30 over one expression. Nothing is evaluated: §7 makes dimensional agreement a
    VALIDATION question, and a dimension is a property of the operands rather than of their values."""
    where = f"quantities.{qid}"
    quantities = doc.get("quantities") or {}
    terms = _parse_expression(source)
    if not terms:
        f.add("V28", where, f"expression '{source}' has no operands.")
        return

    unresolved = 0
    for _op, factors in terms:
        for _fop, operand in factors:
            kind = operand[0]
            if kind == "unreadable":
                unresolved += 1
                f.add("V28", where,
                      f"expression operand '{operand[1]}' is not a magnitude, a model metric, or a "
                      f"declared quantity. Operators stand alone between spaces, parentheses are not "
                      f"v0.1 syntax, and an expression may not end with an operator.")
            elif kind == "metric":
                if operand[1] == "":
                    unresolved += 1
                    f.add("V27", where, f"'{METRIC_NAMESPACE}' names a namespace, not a value. Write "
                                        f"{METRIC_NAMESPACE}.{METRIC_NAMES[0]}.")
                elif operand[1] not in METRIC_NAMES:
                    unresolved += 1
                    f.add("V27", where, f"'{METRIC_NAMESPACE}.{operand[1]}' is not a model metric. "
                                        f"Declared: {', '.join(METRIC_NAMES)}.")
            elif kind == "quantity":
                if operand[1] not in quantities:
                    unresolved += 1
                    f.add("V27", where,
                          f"expression references '{operand[1]}', which is not a declared quantity.")
                elif (quantities[operand[1]] or {}).get("dimension") not in DIMENSION_IDS:
                    # Its own V28 already names the cause; a dimension complaint here would send the
                    # author to the wrong quantity.
                    unresolved += 1
            else:
                mag = operand[1]
                if mag[3] is not None:
                    unresolved += 1
                    msg = _fault_message(mag, operand[2] or dimension, "expression operand")
                    if msg is not None:
                        f.add("V28", where, msg)
    # Every dimension below would be a guess if one operand did not resolve, and a guessed dimension
    # mismatch sends the author hunting for the wrong defect.
    if unresolved:
        return

    classes: list[str] = []
    for _op, factors in terms:
        carried = [o for _fop, o in factors if _class_of(_operand_dimension(quantities, o)) != "dimensionless"]
        # The divisor check runs FIRST: `10 ms / 2 ms` is two dimensioned operands too, and "you
        # divided by a duration" sends the author to the operator rather than counting operands.
        divisors = [o for fop, o in factors
                    if fop == "/" and _class_of(_operand_dimension(quantities, o)) != "dimensionless"]
        if divisors:
            f.add("V30", where,
                  f"expression '{source}' divides by a "
                  f"{_class_of(_operand_dimension(quantities, divisors[0]))} operand; a divisor must "
                  f"be dimensionless.")
            return
        if len(carried) > 1:
            shown = " x ".join(_class_of(_operand_dimension(quantities, o)) for o in carried)
            f.add("V30", where,
                  f"expression '{source}' multiplies {len(carried)} dimensioned operands ({shown}); "
                  f"v0.1 has no compound dimensions.")
            return
        classes.append(_class_of(_operand_dimension(quantities, carried[0])) if carried else "dimensionless")

    first = classes[0]
    clash = next((d for d in classes if d != first), None)
    if clash is not None:
        f.add("V30", where, f"expression '{source}' adds {first} to {clash}. §7 forbids silently "
                            f"coercing one dimension into another.")
        return
    if first != _class_of(dimension):
        f.add("V30", where,
              f"expression '{source}' has dimension {first}, but the quantity declares {dimension}.")


# ---------------------------------------------------------------------------------------------
# V35-V37 -- the declared accounting model. Mirrors src/validator/rules.ts.
#
# One principle runs through all three: a quantitative annotation that cannot participate
# unambiguously in the accounting semantics of its metric is INVALID, rather than silently inert. If
# MAGE accepts a quantity as meaningful there must be a defined route from it to the analyses its
# dimension is intended for; otherwise the type system claims more than the semantics provide.
#
# Nothing here evaluates anything. Participation is a property of a quantity's DECLARATION -- its
# dimension, its target kind, its residency -- so these rules read declared data and never sum a
# trace, which is what keeps them in the validator and out of the analysis layer.
# ---------------------------------------------------------------------------------------------


def _metric_for(dimension: str) -> str | None:
    """The metric that accounts for a dimension, or None when it is not path-aggregated."""
    return next((m for m in ACCOUNTED_METRIC_IDS if ACCOUNTED_METRICS[m] == dimension), None)


def _is_accountable_target(kind: str | None) -> bool:
    """True when an accounting rule has an opinion about this target.

    False for `model:` (an aggregate, not an occurrence) and for every kind that does not resolve,
    where V27 has already named the real defect and a second finding would send the author to the
    wrong line.
    """
    return kind in ACCOUNTABLE_TARGET_KINDS


def _declared_basis(doc: dict, metric: str) -> str | None:
    """The readable basis declared for a metric. None when absent OR unreadable -- V35 owns both."""
    entry = (doc.get("accounting") or {}).get(metric)
    basis = entry.get("basis") if isinstance(entry, dict) else None
    basis = basis.strip() if isinstance(basis, str) else ""
    return basis if basis in ACCOUNTING_BASES else None


def _residency_raw(spec: dict) -> str | None:
    """`residency:` as written, or None when the key is ABSENT.

    Presence and readability are separate facts: `residency: transient` is a declaration the author
    made and got wrong, which is a different V37 finding from declaring nothing.
    """
    if "residency" not in spec:
        return None
    value = spec["residency"]
    return value.strip() if isinstance(value, str) else ""


def _when(spec: dict) -> tuple[str | None, list[str]] | None:
    """(state, unexpected_keys), or None when the key is absent. Mirrors canonicalize.ts."""
    if "when" not in spec:
        return None
    block = spec["when"] if isinstance(spec["when"], dict) else {}
    state = block.get("state")
    state = state.strip() if isinstance(state, str) else ""
    return (state or None), sorted(str(k) for k in block if str(k) not in WHEN_KEYS)


def check_accounting(doc: dict, f: Findings) -> None:
    """V35 -- each path-aggregated metric with annotations declares exactly one accounting basis.

    The requirement is triggered by the PRESENCE of a quantity the basis would charge, not declared
    unconditionally: a system with no duration annotation has nothing that could over-claim, and a
    mandatory declaration about nothing is noise rather than a control.
    """
    declared = doc.get("accounting") or {}
    for metric, spec in declared.items():
        spec = spec if isinstance(spec, dict) else {}
        where = f"accounting.{metric}"
        if metric not in ACCOUNTED_METRIC_IDS:
            tail = ""
            if metric in DIMENSION_IDS:
                tail = (f" '{metric}' names a DIMENSION, and a metric is not a dimension -- only the "
                        f"execution-scoped dimensions are summed along a path. A {metric} quantity "
                        f"declares where it is charged with 'residency:' or 'when:' instead (V37).")
            f.add("V35", where,
                  f"'{metric}' is not a path-aggregated metric. Declared: "
                  f"{', '.join(ACCOUNTED_METRIC_IDS)}.{tail}")
            continue
        basis = spec.get("basis")
        basis = basis.strip() if isinstance(basis, str) else ""
        if basis not in ACCOUNTING_BASES:
            f.add("V35", where,
                  f"basis '{basis}' is not one of {', '.join(ACCOUNTING_BASES)}. The vocabulary is "
                  f"closed at one member for v0.1, so adding transition or relation accounting later "
                  f"is a deliberate act rather than a permissive union that cannot be narrowed again.")

    for metric in ACCOUNTED_METRIC_IDS:
        if metric in declared:
            continue
        dimension = ACCOUNTED_METRICS[metric]
        subjects = sorted(
            qid for qid, spec in (doc.get("quantities") or {}).items()
            if isinstance(spec, dict) and spec.get("dimension") == dimension
            and _is_accountable_target(_target(spec.get("target"))[1]))
        if not subjects:
            continue
        one = len(subjects) == 1
        f.add("V35", "accounting",
              f"{len(subjects)} {dimension} quantit{'y' if one else 'ies'} "
              f"({', '.join(subjects)}) {'is' if one else 'are'} annotated, but no accounting basis "
              f"is declared for '{metric}'. Write "
              f"'accounting: {{ {metric}: {{ basis: entities }} }}'. Until it is declared those "
              f"quantities reach no analysis, and a quantity that validates and then reaches nothing "
              f"is the type system claiming more than the semantics provide.")


def check_participation(doc: dict, f: Findings, qid: str, spec: dict, dimension: str) -> None:
    """V36 -- a quantity contributes to its metric only through the declared basis.

    Why this is not merely tidier: summing every kind indiscriminately "makes the meaning of a model
    depend on whether the author happened to represent the same operation in multiple linked models.
    Shared identity should let us connect purposeful models, not cause their annotations to be
    accumulated." A retry is charged twice because the behavioral trace visits the operation twice,
    never because a state duration and a transition duration were added up.
    """
    metric = _metric_for(dimension)
    raw, kind, _ref = _target(spec.get("target"))
    if metric is None or not _is_accountable_target(kind):
        return
    basis = _declared_basis(doc, metric)
    # V35 already said the declaration is missing or unreadable; a participation complaint on top of
    # it would describe a basis nobody chose.
    if basis is None:
        return
    charged = BASIS_TARGET_KINDS[basis]
    if kind in charged:
        return
    f.add("V36", f"quantities.{qid}",
          f"target '{raw}' is a {kind}, and '{metric}' declares basis '{basis}', which charges only "
          f"{', '.join(k + ':' for k in charged)} targets. An execution's {metric} is the sum over "
          f"each occurrence of an accounted entity along it, so this annotation contributes to "
          f"nothing -- move it to the entity whose occurrence it costs, or declare a basis that "
          f"accounts for {kind} targets.")


def check_executes_in_state(doc: dict, f: Findings) -> None:
    """V38 -- an entity's `executes_in_state` resolves to a declared state.

    This is the join entity accounting runs on: the property names the lifecycle state during whose
    occupancy the entity runs, and a trace step entering that state charges the entity. It decides
    every latency number the evaluator reports, and it was checked only by one example's own test
    suite -- a property naming no state in any other model got no finding and then charged nothing.

    Resolution goes through `_state_fault`, the resolver V27 uses for a `state:` target and for
    `when.state`. Three reference rules, one resolver: a third copy is how the bare-name ambiguity
    refusal gets fixed in two of them and forgotten in the third.

    Its own number rather than V27's: V27's subject is a QUANTITY's references and its remedy is to
    fix the annotation. This reference is made by an ENTITY, and an author whose `executes_in_state`
    is wrong is not editing a quantity at all.
    """
    for eid, spec in (doc.get("entities") or {}).items():
        if not isinstance(spec, dict):
            continue
        props = spec.get("properties") or {}
        if not isinstance(props, dict) or EXECUTES_IN_STATE not in props:
            continue
        value = props[EXECUTES_IN_STATE]
        if isinstance(value, dict):
            value = value.get("value")
        # Mirrors canonicalize.ts `properties`: a non-scalar is not a property at all, so it never
        # reaches the IR and TypeScript has nothing to report. Shape is the schema's subject.
        if not isinstance(value, SCALAR_TYPES):
            continue
        where = f"entities.{eid}.properties.{EXECUTES_IN_STATE}"
        if not isinstance(value, str) or not value:
            f.add("V38", where,
                  f"declares {EXECUTES_IN_STATE} as {json.dumps(value)}, which names no state. The "
                  f"value is a state reference -- '<machine>.<state>', or a bare state name exactly "
                  f"one machine declares.")
            continue
        fault = _state_fault(doc, f"{EXECUTES_IN_STATE} '{value}'", value, "")
        if fault is not None:
            f.add("V38", where,
                  f"{fault} This property is the join entity accounting charges through, so a "
                  f"reference that resolves nowhere means no execution ever visits '{eid}' and every "
                  f"quantity charging it reaches no analysis.")


def check_query_quantities(doc: dict, f: Findings) -> None:
    """V39 -- a quantity query's ceiling resolves to a declared quantity.

    The dangling-reference class V27 handles for a quantity's own references, applied to the one
    reference a QUERY now makes into the quantities map: `quantity.within` names the model:-targeted
    total the query decides against. A saved query naming a deleted ceiling re-runs on every model
    change and refuses every time; this says why at authoring time. Resolution is a lookup against
    the declared map, the machinery every V27 reference uses. What the resolved quantity must BE
    (model:-targeted, the metric's dimension) is the engine's refusal, because it depends on the
    metric asked.
    """
    quantities = doc.get("quantities") or {}
    for qid, q in (doc.get("queries") or {}).items():
        if not isinstance(q, dict) or q.get("kind") != "quantity":
            continue
        inner = q.get("quantity")
        if not isinstance(inner, dict):
            continue
        within = inner.get("within")
        if not isinstance(within, str) or not within:
            continue
        if within not in quantities:
            f.add("V39", f"queries.{qid}.quantity.within",
                  f"names quantity '{within}', which this system does not declare. A ceiling is a "
                  f"declared 'model:'-targeted quantity; declare it, or name one that exists.")


def check_residency(doc: dict, f: Findings, qid: str, spec: dict, dimension: str) -> None:
    """V37 -- a configuration-scoped quantity declares exactly one of `residency:` or `when:`.

    memory(c) is the sum of resident quantities plus the sum of those whose behavioral thing is
    active in c. Both summands are keyed on a declaration, and the ruling refused to supply a default
    for either: "I would not say 'idle service memory stays resident' or 'idle service memory
    disappears.' Neither is something MAGE can infer from 'service.'" A memory quantity declaring
    neither enters no summand, so it is invalid rather than inert.

    The last stage resolves `when.state` through the SAME resolver as a `state:` target and reports
    it as V27 -- a reference that does not resolve is V27's subject whichever field carries it.
    """
    where = f"quantities.{qid}"
    scope = DIMENSIONS[dimension]["scope"]
    residency = _residency_raw(spec)
    when = _when(spec)
    both = ("Declare exactly one of 'residency: resident' or "
            "'when: { state: <machine>.<state> }'.")

    if scope != "configuration":
        if residency is not None or when is not None:
            f.add("V37", where,
                  f"declares residency, but {dimension} is {scope}-scoped. Residency says which "
                  f"configurations a quantity is charged in, which is a question only a "
                  f"configuration-scoped dimension asks -- a {dimension} is aggregated along an "
                  f"execution and its accounting is the declared basis (V35).")
        return

    raw, kind, _ref = _target(spec.get("target"))
    if kind == AGGREGATE_TARGET_KIND:
        if residency is not None or when is not None:
            f.add("V37", where,
                  f"target '{raw}' addresses a whole model, so this is a declared TOTAL rather than a "
                  f"charge on one entity. memory(c) sums over entities; a model-level total is "
                  f"compared against it, never a summand of it. Drop the residency declaration, or "
                  f"target the entity it charges.")
        return
    # An unresolvable target leaves the requirement itself undecidable: whether a residency is wanted
    # depends on what the quantity annotates. V27 has named that, and it is the thing to fix first.
    if not _is_accountable_target(kind):
        return

    if residency is not None and when is not None:
        f.add("V37", where,
              f"declares both 'residency: {residency}' and a 'when:' clause. They are the two "
              f"summands of memory(c) and a quantity enters one of them: resident means charged in "
              f"every configuration where the entity exists, 'when' means charged exactly while the "
              f"named state is active. {both}")
        return
    if residency is None and when is None:
        f.add("V37", where,
              f"is a {dimension} quantity with no declared residency, so it enters neither summand of "
              f"memory(c) and no configuration charges it. Residency is not inferred from the kind of "
              f"thing annotated -- \"idle service memory stays resident\" and \"idle service memory "
              f"disappears\" are both guesses MAGE refuses to make. {both}")
        return
    if residency is not None and residency not in RESIDENCIES:
        f.add("V37", where,
              f"residency '{residency}' is not one of {', '.join(RESIDENCIES)}. The vocabulary is "
              f"closed at one member for v0.1; a quantity charged only while something is active says "
              f"so with 'when:' instead.")
        return
    if when is not None and when[0] is None:
        stray = ""
        if when[1]:
            stray = f" It carries {', '.join(repr(k) for k in when[1])} instead."
        f.add("V37", where,
              f"the 'when:' clause declares no 'state:', so nothing identifies the behavioral thing "
              f"whose activation charges this quantity -- and activation is never inferred.{stray} "
              f"Write 'when: {{ state: <machine>.<state> }}'.")
        return
    if when is not None and when[0] is not None:
        fault = _state_fault(doc, f"when.state '{when[0]}'", when[0], "")
        # Reported at `.when` rather than at the quantity, so a broken target and a broken `when` are
        # two distinguishable V27 findings instead of two lines about the same place.
        if fault is not None:
            f.add("V27", f"{where}.when", fault)


def check_quantities(doc: dict, f: Findings) -> None:
    machines = doc.get("machines") or {}

    # V31 -- `metrics` is reserved. A user id shadowing it would make `metrics.state_count` read as
    # that object's member, so §10's distinction between a fact FROM the model and a fact ABOUT the
    # modeled system would stop being visible on the page.
    def reserve(scope: str, ids: object) -> None:
        for key in _ids_of(ids) if isinstance(ids, dict) else (ids or []):
            if key == METRIC_NAMESPACE:
                f.add("V31", scope,
                      f"'{METRIC_NAMESPACE}' is the reserved model-metric namespace "
                      f"({', '.join(METRIC_NAMES)}); it cannot also name a {scope.split('.')[0]} "
                      f"object. Rename it.")

    for scope in ("entities", "machines", "events", "models", "relation-types", "domains", "quantities"):
        reserve(scope, doc.get(scope) or {})
    for mid, m in machines.items():
        if not isinstance(m, dict):
            continue
        reserve(f"machines.{mid}.variables", m.get("variables") or {})
        reserve(f"machines.{mid}.derived", m.get("derived") or {})
        reserve(f"machines.{mid}.states", m.get("states") or {})

    # V35 -- the accounting declaration itself, before any quantity is read against it.
    check_accounting(doc, f)

    # V38 -- the join the basis charges through, before the quantities that ride on it.
    check_executes_in_state(doc, f)

    # V39 -- the one reference a saved QUERY makes into the quantities map.
    check_query_quantities(doc, f)

    for qid, spec in (doc.get("quantities") or {}).items():
        spec = spec if isinstance(spec, dict) else {}
        where = f"quantities.{qid}"

        # V27 -- no dangling annotations (§9). A quantity pointing at a deleted transition is not
        # invalid, it is WRONG, and nothing says so unless a rule does.
        fault = _target_fault(doc, _target(spec.get("target")))
        if fault is not None:
            f.add("V27", where, fault)

        declared = spec.get("dimension") if isinstance(spec.get("dimension"), str) else ""
        if declared not in DIMENSION_IDS:
            f.add("V28", where,
                  f"dimension '{declared}' is not one of {', '.join(DIMENSION_IDS)}. The dimension is "
                  f"the quantity's type, so nothing else about it can be checked without one.")
            continue
        dimension = declared

        # V36 / V37 -- can this annotation reach the analysis its dimension is for? Both read the
        # DECLARATION only, so neither needs a trace or a sum.
        check_participation(doc, f, qid, spec, dimension)
        check_residency(doc, f, qid, spec, dimension)

        def literal(mag: tuple, part: str) -> bool:
            v28 = _fault_message(mag, dimension, part)
            if v28 is not None:
                f.add("V28", where, v28)
            v30 = _foreign_message(mag, dimension, part)
            if v30 is not None:
                f.add("V30", where, v30)
            return mag[2] is not None

        # V29 -- the magnitude is admissible. Negatives are refused across the board: §29 ⑥ grants
        # safety to "monotone nonnegative interval expressions", and a memory of -1 MB models nothing.
        def bounds(mag: tuple, part: str) -> None:
            base = mag[2]
            if base is None:
                return
            if base < 0:
                f.add("V29", where, f"{part} normalizes to {_num(base)}; no v0.1 dimension admits a "
                                    f"negative magnitude.")
            maximum = DIMENSIONS[dimension]["maximum"]
            if maximum is not None and base > maximum:
                f.add("V29", where,
                      f"{part} normalizes to {_num(base)}, above the maximum {_num(maximum)} for "
                      f"{dimension} -- a ratio is a proportion of one, so 80% is 0.8.")

        rng = spec.get("range")
        value = spec.get("value")
        if isinstance(rng, list) and rng:
            low = _magnitude(rng[0], dimension)
            high = _magnitude(rng[1] if len(rng) > 1 else None, dimension)
            low_ok, high_ok = literal(low, "range low"), literal(high, "range high")
            if low_ok:
                bounds(low, "range low")
            if high_ok:
                bounds(high, "range high")
            if low_ok and high_ok and low[2] > high[2]:
                f.add("V29", where,
                      f"range [{low[0]}, {high[0]}] is reversed: {_num(low[2])} > {_num(high[2])} in "
                      f"{DIMENSIONS[dimension]['base'] or dimension}.")
        elif isinstance(value, dict):
            source = value.get("expression") if isinstance(value.get("expression"), str) else ""
            _check_expression(doc, f, qid, dimension, source)
        elif value is None:
            f.add("V28", where, "has no value. Declare 'value:' or 'range:'.")
        else:
            mag = _magnitude(value, dimension)
            if literal(mag, "value"):
                bounds(mag, "value")


def check_annotation(doc: dict, f: Findings) -> None:
    """ANNOTATION -- a note that lost half its text.

    A pass of its own, and that separation is the point rather than tidiness: A1 holds that
    annotation never alters semantic interpretation, so an annotation finding does not belong among
    the rules that fix meaning, and it carries a named id instead of a V-number for the same reason.

    The failure is YAML flow style ending an unquoted value at a comma, so
    `{ kind: comment, text: one thing, and another }` loads as `text: "one thing"` plus a stray KEY.
    The note is half gone and nothing looks wrong, which is worse than one that failed to load. The
    finding names the stray key because the fix is to quote the value and the author has to know
    which text got cut.
    """
    def sweep(scope: str, holder: object) -> None:
        notes = (holder or {}).get("notes") if isinstance(holder, dict) else None
        for i, n in enumerate(notes or []):
            # Mirrors canonicalize.ts: a note with no text is DROPPED, so there is nothing to report.
            if not isinstance(n, dict) or not isinstance(n.get("text"), str) or not n["text"]:
                continue
            stray = sorted(str(k) for k in n if str(k) not in NOTE_KEYS)
            if not stray:
                continue
            nid = n["id"] if isinstance(n.get("id"), str) else f"note-{i + 1}"
            keys = ", ".join(f"'{k}'" for k in stray)
            f.add("ANNOTATION", f"{scope}.notes.{nid}",
                  f"unexpected key(s) {keys}: the signature of an unquoted comma in YAML flow style, "
                  f"which ends the value and makes the rest a key. The text reads '{n['text']}' and "
                  f"the remainder is gone. Quote it.")

    for eid, ent in (doc.get("entities") or {}).items():
        sweep(f"entities.{eid}", ent)
    for mid, model in (doc.get("models") or {}).items():
        sweep(f"models.{mid}", model)
        # Keyed by relation id, falling back to its endpoints, because the IR flattens and re-sorts
        # relations across models: a positional index would name a different edge on each side.
        for rel in ((model or {}).get("relations") or []) if isinstance(model, dict) else []:
            if not isinstance(rel, dict):
                continue
            key = rel["id"] if isinstance(rel.get("id"), str) else f"{rel.get('from')}->{rel.get('to')}"
            sweep(f"models.{mid}.relations.{key}", rel)


# ---------------------------------------------------------------------------------------------
# Graph query evaluation. Enough of the engine to make an architectural invariant a CI gate
# before any workbench code exists -- the component-dependency model is enforceable on day one.
#
# Behavioral (state-space) queries are NOT evaluated here; they belong in the workbench's own
# engine, in a Web Worker. This covers six graph forms -- direct, predecessors, successors,
# reachability, path, shortest-path -- and says so when asked for more.
#
# Where this tool and the engine both answer, they must answer the SAME. `test/parity.test.ts`
# compares the two tools' outcomes over every model in the repo, which is the gate that now holds
# the agreement; it used to compare findings only, and three shipped `predecessors` queries got two
# different answers under a green build.
# ---------------------------------------------------------------------------------------------

# Forms whose answer is DERIVED BY COMPOSING EDGES, and which `composition.path` therefore gates
# (V7). The test is the derivation, not the hop count.
#
# This is the same set as the engine's `GRAPH_COMPOSING` in src/engine/types.ts, deliberately,
# because a licensing decision the two tools make differently is a licensing decision neither tool
# can be trusted on. `components` is in it: a connected component is a reachability class, which is
# exactly the inference `forbidden` declines to authorize. `cycles` is out, licensed by V8's
# `properties.acyclic` independently of V7; `containment` is out, walking the entity tree rather
# than a relation type; and `predecessors`/`successors` are out because they read the adjacency ONE
# STEP and compose nothing -- a declaration about PATHS has no purchase on a one-hop question.
#
# Three of these five are gated here and evaluated by the engine alone. Gating is cheaper than
# evaluating, and refusing for the licensing reason beats refusing for the scope reason.
GRAPH_COMPOSING = {"reachability", "path", "shortest-path", "all-paths", "components"}

# Refusal causes, spelled as the engine's `RefusalReason` spells them, so the parity test can
# compare the CAUSE of a refusal and not merely the word `unlicensed`. The two scope refusals below
# both read `unsupported-form` -- "the form exists in the schema but this version does not evaluate
# it" -- which covers a form this tool skips and a form carrying a feature it skips.
CAUSE_UNKNOWN_VOCABULARY = "unknown-vocabulary"
CAUSE_COMPOSITION_FORBIDDEN = "composition-forbidden"
CAUSE_UNSUPPORTED_FORM = "unsupported-form"
CAUSE_MISSING_DISTINCTION = "missing-distinction"
CAUSE_MISSING_MODEL_TYPE = "missing-model-type"

# The substrate-absence sentence, for a system declaring no structural model.
#
# This tool answered such a question instead of refusing it, and the answer was a confident NO: with
# `relation-types:` and `entities:` declared and `models:` empty -- the ordinary middle of an
# authoring session -- `direct`, `reachability` and `successors` all returned `refuted` and the run
# printed `clean`. "No, api does not reach gateway" about a system that models no structure is the
# same class as the `where`-clause bug above, reached from a different direction: a definite answer
# computed over nothing. The engine's own report of the same defect was a latency of 0 ms over an
# empty charge table.
#
# The words are the engine's `absentSubstrateProse` for the structural-model entry of its model-type
# registry (src/engine/model-types.ts), reproduced because neither tool can import the other's, and
# rendered in this file's dash convention. That registry is the authority a drift would be measured
# against; what `test/parity.test.ts` holds is the CAUSE, as it does for every other cause here.
#
# Only the STRUCTURAL arm can arise in this tool. It evaluates graph queries and nothing else, so an
# absent `machines:` or `quantities:` section has no question here to be absent for -- `check_queries`
# skips both dialects and says so.
ABSENT_STRUCTURAL_MODEL = (
    "this system declares no structural model, and a 'graph' question is answered over one -- it "
    'asks "What is connected to what?", which only a structural model represents. To make it '
    "answerable, declare a model under `models:` with its purpose and relations; the structural "
    "query forms read the typed edges it asserts."
)


def _refuse(cause: str, sentence: str) -> dict:
    """A refusal is a SUCCESSFUL outcome (V7). `cause` says which kind, in the engine's vocabulary."""
    return {"outcome": "unlicensed", "coverage": {"kind": "not-applicable"},
            "refusal": sentence, "cause": cause}


def _words(text: str) -> list[str]:
    """Lowercased alphanumeric words. `cache_hit_frequency` and `cache hit frequency` agree here."""
    return [w for w in re.split(r"[^a-z0-9]+", text.lower()) if w]


def _omission_covering(doc: dict, need: str) -> tuple[str, list[str]] | None:
    """The declared omission covering `need`, and every purpose that declared one.

    Mirrors src/engine/omission.ts, including the coverage direction: an omission covers a need when
    EVERY word of the need appears among the omission's words. An omission is prose and a need is an
    identifier, so equality would never fire; requiring every need word is what stops it guessing.
    Machines count alongside models -- §8 gives both a `purpose`.
    """
    purposes = []
    for key in ("models", "machines"):
        for mid, spec in sorted((doc.get(key) or {}).items()):
            if isinstance(spec, dict):
                purposes.append((mid, (spec.get("purpose") or {}).get("omits") or []))
    purposes.sort(key=lambda row: row[0])

    want = _words(need)
    text: str | None = None
    declared_by: list[str] = []
    for mid, omits in purposes:
        hit = next((o for o in omits
                    if isinstance(o, str) and want and set(want) <= set(_words(o))), None)
        if hit is None:
            continue
        if text is None:
            text = hit
        declared_by.append(mid)
    return None if text is None else (text, declared_by)


def _refuse_undeclared(doc: dict, absence: str, need: str) -> dict:
    """Refuse a name this system does not declare, as a purposeful omission where a purpose says so.

    The structural clause is kept verbatim and the omission sentence APPENDED: both facts are true
    and a reader needs both -- the name resolves nowhere, and that is a decision rather than an
    oversight. Only the CAUSE changes, which is what the parity test compares.
    """
    omitted = _omission_covering(doc, need)
    if omitted is None:
        return _refuse(CAUSE_UNKNOWN_VOCABULARY, f"{absence}.")
    text, declared_by = omitted
    one = len(declared_by) == 1
    who = (f"model '{declared_by[0]}'" if one
           else "models " + ", ".join(f"'{m}'" for m in declared_by))
    return _refuse(CAUSE_MISSING_DISTINCTION,
                   f"{absence}, and the absence is a declared modelling decision: {who} "
                   f"deliberately {'omits' if one else 'omit'} '{text}'. There is no misspelling to "
                   f"hunt for -- the model represents what its purpose says it represents, and this "
                   f"is outside it. Answering would mean adding the distinction to a model that "
                   f"chose to leave it out.")


def _edges(doc: dict, rel_type: str) -> dict[str, set[str]]:
    """Adjacency for one relation type, across EVERY model in the system.

    Union rather than per-model: an architectural invariant about the system is not escapable by
    declaring the offending edge in a different model.
    """
    sym = (((doc.get("relation-types") or {}).get(rel_type) or {}).get("properties") or {}).get("symmetric", False)
    adj: dict[str, set[str]] = {}
    for model in (doc.get("models") or {}).values():
        for rel in (model.get("relations") or []):
            if rel.get("type") != rel_type:
                continue
            adj.setdefault(rel["from"], set()).add(rel["to"])
            if sym:
                adj.setdefault(rel["to"], set()).add(rel["from"])
    return adj


def _shortest_path(adj: dict[str, set[str]], src: str, dst: str) -> list[str] | None:
    """BFS, so the witness returned is the shortest one -- the most legible counterexample."""
    if src == dst:
        return [src]
    seen, frontier = {src}, [[src]]
    while frontier:
        nxt = []
        for route in frontier:
            for peer in sorted(adj.get(route[-1], ())):
                if peer == dst:
                    return route + [peer]
                if peer not in seen:
                    seen.add(peer)
                    nxt.append(route + [peer])
        frontier = nxt
    return None


def run_graph_query(doc: dict, q: dict) -> dict:
    """Evaluate one graph query. Returns a result object shaped per mage-query.schema.json."""
    g = q.get("graph") or {}
    form, rel = g.get("form"), g.get("relation")

    # The substrate-absence rung, ahead of every other check including the vocabulary one. The
    # engine orders it the same way (`runTypedQuery` consults the registry before it resolves any
    # name), and the order is what keeps the two tools from explaining one absence two ways: asked
    # about a misspelled relation type over a modelless system, a vocabulary-first tool reports a
    # typo to hunt where the engine reports the absent type.
    if not (doc.get("models") or {}):
        return _refuse(CAUSE_MISSING_MODEL_TYPE, ABSENT_STRUCTURAL_MODEL)

    rel_spec = (doc.get("relation-types") or {}).get(rel)

    if rel_spec is None:
        # The omission rung, before the bare-absence one. SEMANTICS.md §7.6: within one subject a
        # declared decision outranks an absence, so a relation type nowhere in the system that some
        # purpose declares omitted refuses as `missing-distinction`.
        return _refuse_undeclared(doc, f"relation type '{rel}' is not declared by this system", str(rel))

    # V7 -- a question whose answer composes edges, over a relation that forbids path composition,
    # is refused rather than answered. Being told a question is not licensed is a result, not an
    # error. This runs BEFORE the scope guards below so a forbidden query refuses for the licensing
    # reason, which is the reason the author needs to hear.
    if form in GRAPH_COMPOSING and ((rel_spec.get("composition") or {}).get("path")) == "forbidden":
        return _refuse(CAUSE_COMPOSITION_FORBIDDEN,
                       f"'{rel}' is declared as a direct relation without path-composition "
                       f"semantics. A multi-hop '{rel}' query is not licensed by this model.")

    # A `where` clause is a JOIN over entity properties, and this tool has no join evaluator. It is
    # refused for scope, once, for every form -- not ignored.
    #
    # Ignoring it is what used to happen, and the shape of the bug is worth keeping written down.
    # `direct` with a where clause and no endpoints evaluated `None in adj.get(None, set())`, which
    # is False, and returned a confident `refuted`. On message-bus that query is "can an event
    # carrying restricted data reach a service not permitted to process it?" -- so the tool answered
    # NO about a system where the answer is YES. The multi-hop branch grew a guard for the same
    # class when the Phase C agent found it on docable's security query; `direct` was the site that
    # guard missed. One check above the dispatch now covers every form, including the forms this
    # tool does not yet evaluate.
    if g.get("where"):
        return _refuse(CAUSE_UNSUPPORTED_FORM,
                       f"a '{form}' query with a `where` clause is not evaluated here; the "
                       f"where-clause join belongs to the workbench engine.")

    adj = _edges(doc, rel)
    src, dst = g.get("from"), g.get("to")

    # A named endpoint that is not a declared entity is refused, not answered about. The alternative
    # is a confident `refuted` on a misspelling -- "no, api does not reach gatewya" -- which is the
    # same class of wrong answer as the `where` case above, and the engine refuses it too.
    for label, named in (("from", src), ("to", dst)):
        if named is not None and named not in (doc.get("entities") or {}):
            return _refuse_undeclared(
                doc, f"{label}: '{named}' is not a declared entity of this system", str(named))

    # Every form below needs the endpoints it reads. The engine lets a query name ONE endpoint and
    # range the other over the universe; this tool does not, and refuses rather than guessing. The
    # outcome-parity test compares answers over every repo model, so the day a shipped model asks a
    # one-endpoint question the gap fails the build instead of hiding.
    if form == "direct":
        if src is None or dst is None:
            return _refuse(CAUSE_UNKNOWN_VOCABULARY,
                           f"a '{form}' query must name both endpoints.")
        hit = dst in adj.get(src, set())
        res = {"outcome": "holds" if hit else "refuted", "coverage": {"kind": "exhaustive"}}
        if hit:
            res["evidence"] = {"shape": "path", "role": "witness", "nodes": [src, dst]}
        return res

    if form in {"predecessors", "successors"}:
        # One hop, and the reason this tool answers them: `composition.path` governs composition,
        # these compose nothing, and the adjacency `_edges` already built is the whole answer.
        #
        # `successors` reads `from` and `predecessors` reads `to`; each falls back to the other
        # because "predecessors, from: X" is the natural writing and still means the predecessors OF
        # X. The engine resolves the two spellings the same way.
        focus = (src or dst) if form == "successors" else (dst or src)
        if focus is None:
            return _refuse(CAUSE_UNKNOWN_VOCABULARY, f"a {form} query must name the entity it is about.")
        nodes = sorted(adj.get(focus, set())) if form == "successors" \
            else sorted(peer for peer, outs in adj.items() if focus in outs)
        res = {"outcome": "holds" if nodes else "refuted",
               "coverage": {"kind": "exhaustive", "states_explored": len(adj)}}
        if nodes:
            res["evidence"] = {"shape": "path", "role": "witness", "nodes": [focus, *nodes]}
        return res

    if form in {"reachability", "path", "shortest-path"}:
        if src is None or dst is None:
            return _refuse(CAUSE_UNKNOWN_VOCABULARY,
                           f"a '{form}' query must name both endpoints.")
        route = _shortest_path(adj, src, dst)
        res = {"outcome": "holds" if route else "refuted",
               "coverage": {"kind": "exhaustive", "states_explored": len(adj)}}
        if route:
            res["evidence"] = {"shape": "path", "role": "witness", "nodes": route}
        return res

    return _refuse(CAUSE_UNSUPPORTED_FORM,
                   f"graph form '{form}' is not evaluated by this tool; it belongs to the workbench "
                   f"engine. Evaluated here: direct, predecessors, successors, reachability, path, "
                   f"shortest-path.")


def check_queries(doc: dict, f: Findings, verbose: bool = True) -> None:
    """Run every saved query that declares `expect`, and fail on a mismatch.

    A query WITHOUT `expect` is exploratory: reported, never failed. A query WITH `expect` is an
    assertion about the architecture, and a mismatch is a build failure.
    """
    asserted = 0
    for qid, q in (doc.get("queries") or {}).items():
        if q.get("kind") != "graph":
            if verbose and "expect" in q:
                print(f"  [skip] {qid}: behavioral and quantity queries are evaluated by the workbench engine, not here")
            continue
        res = run_graph_query(doc, q)
        outcome, expect = res["outcome"], q.get("expect")
        if isinstance(expect, bool):
            # YAML 1.1 again: a bare `expect: false` arrives as a Python bool, never matching an
            # outcome string. Caught here with the cause named rather than as a silent mismatch.
            f.add("V25", qid, f"expect loaded as boolean {expect!r} -- a YAML loader coerced it. "
                              f"Use 'refuted' or 'holds'; the outcome vocabulary is deliberately "
                              f"not true/false.")
            continue
        if expect is None:
            if verbose:
                print(f"  [info] {qid}: {outcome}")
            continue
        asserted += 1
        if outcome == expect:
            if verbose:
                print(f"  [ok  ] {qid}: {outcome}")
        else:
            detail = ""
            if (ev := res.get("evidence")) and ev.get("nodes"):
                detail = " via " + " -> ".join(ev["nodes"])
            if res.get("refusal"):
                detail = " (" + res["refusal"] + ")"
            f.add("QUERY", qid, f"expected {expect}, got {outcome}{detail}")
    if verbose and asserted:
        print(f"  {asserted} asserted query(ies) evaluated")


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
        check_annotation(doc, f)
    elif f:
        print("  (meaning checks skipped -- fix the shape findings first)")
    if f:
        print(f"mage-validate: {len(f.rows)} finding(s)")
        f.report()
        return 1
    if doc.get("queries"):
        print("mage-validate: asserted queries")
        check_queries(doc, f)
    if f:
        print(f"mage-validate: {len(f.rows)} finding(s)")
        f.report()
        return 1
    print("mage-validate: clean -- shape, meaning, and asserted queries")
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
        # V26: `w.state: busy` where w declares idle and held. The guard never holds, so the
        # transition is dead and every query over the machine describes a smaller system.
        ("V26", {**base, "machines": {
            "w": {"initial": "idle", "states": {"idle": None, "held": None}, "transitions": []},
            "m": {"initial": "a", "states": {"a": None, "b": None},
                  "transitions": [{"from": "a", "to": "b", "requires": {"w.state": "busy"}}]}}}),
        # V26 again, the interval case: retry_count is [0, 3], so `gt: 9` is decided before the
        # model runs. An integer declares a range rather than a list.
        ("V26", {**base, "machines": {
            "m": {"initial": "a", "states": {"a": None, "b": None},
                  "variables": {"retry_count": {"type": "integer", "range": [0, 3]}},
                  "transitions": [{"from": "a", "to": "b", "requires": {"retry_count": {"gt": 9}}}]}}}),
        ("ANNOTATION", {**base, "entities": {
            "e": {"notes": [{"kind": "comment", "text": "one thing", "and another": None}]}}}),
        # V27: a quantity pointing at an entity nobody declared. Not invalid -- WRONG, and silent
        # unless a rule says so.
        ("V27", {**base, "entities": {"cache": {}},
                 "quantities": {"q": {"target": "entity:ghost", "dimension": "memory", "value": "1 MB"}}}),
        # V28: `250` with dimension duration. The unit the author meant is not written down, and a
        # silently assumed one is the dimension bug this feature exists to prevent.
        ("V28", {**base, "entities": {"cache": {}},
                 "quantities": {"q": {"target": "entity:cache", "dimension": "duration", "value": 250}}}),
        # V28 again: `017 ms` reads as 15 here and as 17 in the TypeScript loader, so the spelling is
        # refused rather than silently meaning two different things in two tools.
        ("V28", {**base, "entities": {"cache": {}},
                 "quantities": {"q": {"target": "entity:cache", "dimension": "duration", "value": "017 ms"}}}),
        # V29: a hit rate above one. The [0, 1] constraint is a rule, not a comment.
        ("V29", {**base, "entities": {"cache": {}},
                 "quantities": {"q": {"target": "entity:cache", "dimension": "ratio", "value": 1.3}}}),
        # V29 again, and it exercises the GB and MB factors on both sides: the range only reads as
        # reversed if 1 GB really does normalize above 1 MB.
        ("V29", {**base, "entities": {"cache": {}},
                 "quantities": {"q": {"target": "entity:cache", "dimension": "memory",
                                      "range": ["1 GB", "1 MB"]}}}),
        # V30: `250 ms + 128 MB`. §7's own invalid example, and the defect class that yields a
        # plausible number nobody questions.
        ("V30", {**base, "models": {"g": {"type": "graph", "entities": []}},
                 "quantities": {"q": {"target": "model:g", "dimension": "duration",
                                      "value": {"expression": "250 ms + 128 MB"}}}}),
        # V31: a user entity named `metrics` would shadow the reserved namespace, and §10's
        # distinction between a fact FROM the model and one ABOUT the system stops being visible.
        ("V31", {**base, "entities": {"metrics": {}}}),
        # V35: a duration annotation with no declared accounting basis reaches no analysis, and the
        # governing principle makes that invalid rather than inert.
        ("V35", {**base, "entities": {"parse": {}},
                 "quantities": {"q": {"target": "entity:parse", "dimension": "duration",
                                      "value": "50 ms"}}}),
        # V36: entity accounting charges entity targets. A duration on a transition contributes to
        # nothing, and summing it anyway would make meaning depend on representational accident.
        ("V36", {**base, "entities": {"parse": {}},
                 "accounting": {"latency": {"basis": "entities"}},
                 "machines": {"document": {"initial": "a", "states": {"a": None, "b": None},
                                           "transitions": [{"from": "a", "to": "b"}]}},
                 "quantities": {"q": {"target": "transition:document#0", "dimension": "duration",
                                      "value": "50 ms"}}}),
        # V37: a memory quantity with neither residency nor when enters neither summand of memory(c).
        # Residency is declared, never inferred from the kind of thing annotated.
        ("V37", {**base, "entities": {"cache": {}},
                 "quantities": {"q": {"target": "entity:cache", "dimension": "memory",
                                      "value": "128 MB"}}}),
        # V39: a quantity query whose ceiling names no declared quantity. The query re-runs on every
        # model change and refuses every time; the rule says why at authoring time.
        ("V39", {**base, "queries": {"under-ceiling": {
            "kind": "quantity", "quantifier": "forall",
            "quantity": {"metric": "latency", "within": "ghost"}}}}),
    ]
    failures = 0
    for expect, doc in cases:
        f = Findings()
        check_coercion(doc, f)
        if not f:
            check_shape(doc, f)
            if not [r for r in f.rows if r[0] == "SCHEMA"]:
                check_meaning(doc, f)
                check_annotation(doc, f)
        rules = {r[0] for r in f.rows}
        if expect in rules:
            print(f"  [ok  ] {expect} detected")
        else:
            failures += 1
            print(f"  [FAIL] {expect} NOT detected; got {sorted(rules) or 'nothing'}")
    # The evaluator must FAIL when the kernel grows a dependency on a view -- the whole point.
    comp = HERE / "models" / "workbench-components.mage.yaml"
    if comp.exists():
        doc = yaml.safe_load(comp.read_text())
        f = Findings()
        check_coercion(doc, f); check_shape(doc, f)
        if not f:
            check_meaning(doc, f); check_annotation(doc, f); check_queries(doc, f, verbose=False)
        if f:
            failures += 1
            print(f"  [FAIL] component model should be clean; {len(f.rows)} finding(s)")
            f.report()
        else:
            print("  [ok  ] component model clean, all asserted queries hold")
        violated = yaml.safe_load(comp.read_text())
        violated["models"]["dependencies"]["relations"].append(
            {"id": "SMUGGLED", "from": "model-ir", "to": "ui", "type": "depends-on"})
        f2 = Findings()
        check_queries(violated, f2, verbose=False)
        caught = [r for r in f2.rows if "kernel-must-not-reach-ui" in r[1]]
        if caught:
            print(f"  [ok  ] injected kernel->ui edge CAUGHT: {caught[0][2]}")
        else:
            failures += 1
            print("  [FAIL] injected kernel->ui dependency NOT caught -- the gate does not gate")

    example = HERE / "examples" / "docable.mage.yaml"
    if example.exists():
        f = Findings()
        doc = yaml.safe_load(example.read_text())
        check_coercion(doc, f)
        check_shape(doc, f)
        check_meaning(doc, f)
        check_annotation(doc, f)
        if f:
            failures += 1
            print(f"  [FAIL] the worked example should be clean; {len(f.rows)} finding(s)")
            f.report()
        else:
            print("  [ok  ] worked example is clean under both layers")
    print(f"self-test: {'PASS' if not failures else f'{failures} FAILURE(S)'}")
    return 1 if failures else 0


def graph_outcomes(doc: dict) -> list[dict]:
    """Every graph query's ANSWER, for the parity test. Behavioral queries are not evaluated here.

    Findings alone were not enough. Both tools reported examples/message-bus clean while disagreeing
    about the answer to three of its six questions, because no example declares `expect`, so no
    disagreement became a finding and the parity test compared findings. An outcome is a result in
    its own right and now travels on the wire as one.

    `refusal` travels beside the cause because a cause is a bucket and a sentence is what the reader
    gets. The two interfaces of the TypeScript side are already held to one WORDING for an absence
    (test/sparql-seam.test.ts compares byte for byte), and nothing held this side to anything but the
    bucket -- so a drifted explanation of a shared cause had no gate at all.
    """
    out = []
    for qid, q in (doc.get("queries") or {}).items():
        if q.get("kind") != "graph":
            continue
        res = run_graph_query(doc, q)
        out.append({"id": qid, "form": (q.get("graph") or {}).get("form"),
                    "outcome": res["outcome"], "cause": res.get("cause"),
                    "refusal": res.get("refusal"),
                    "where": bool((q.get("graph") or {}).get("where"))})
    return sorted(out, key=lambda r: r["id"])


def emit_json(path: pathlib.Path) -> int:
    """Machine-readable findings and query outcomes, for the TypeScript parity test.

    Two independent implementations of one numbered specification are only worth having if their
    disagreement is detectable, which needs a stable wire format rather than printed prose.
    """
    doc = yaml.safe_load(path.read_text())
    f = Findings()
    queries: list[dict] = []
    if isinstance(doc, dict):
        check_coercion(doc, f)
        if not f:
            check_shape(doc, f)
            if not [r for r in f.rows if r[0] == "SCHEMA"]:
                check_meaning(doc, f, verbose=False)
                check_annotation(doc, f)
                check_queries(doc, f, verbose=False)
                queries = graph_outcomes(doc)
    print(json.dumps({"findings": [{"rule": r, "where": w, "message": m} for r, w, m in f.rows],
                      "queries": queries}, indent=2, sort_keys=True))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path", nargs="?", type=pathlib.Path, help="a .mage.yaml model system")
    ap.add_argument("--self-test", action="store_true", help="check that each rule fires on a model that violates it")
    ap.add_argument("--json", action="store_true", help="emit findings as JSON (for the parity test); always exits 0")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not args.path:
        ap.error("give a path, or --self-test")
    if args.json:
        return emit_json(args.path)
    return validate(args.path)


if __name__ == "__main__":
    sys.exit(main())
