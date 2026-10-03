// `validate(model)` — the operation, its result shape, and the two invariants it owes.
//
// MQ-I6: it RECOMPUTES. Its `hash` is the current revision, and a transaction changes its answer
// with no cache to prime. MQ-I9: the severity table is total over every rule the validator emits —
// held by the compiler through `ValidationRule`, and held again here as the net under a cast.
//
// The rest of this file is about whether the result is ACTIONABLE rather than descriptive, which is
// the ruling's word: a finding must identify the violated rule, the affected model elements, the
// severity, and evidence sufficient to repair the problem. So the tests below ask what an agent
// would ask — can I select the objects to edit without reading the sentence, can I tell a blocking
// finding from an advisory one, can I find the rule in the spec, and do I know which implementation
// decided any of it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { runQuery } from "../src/engine/index.ts";
import { renderView } from "../src/render/index.ts";
import { Workspace } from "../src/app/services.ts";
import type { Ports } from "../src/app/services.ts";
import { createAgentApi } from "../src/app/agent-api.ts";
import { ExampleCatalog } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { validate, validateModel } from "../src/validator/rules.ts";
import {
  SEVERITY, SPEC_SECTION, VALIDATION_AUTHORITY, wellFormed,
} from "../src/validator/result.ts";
import type { ValidationFinding } from "../src/validator/result.ts";
import { CAPABILITIES } from "../src/app/capabilities.ts";

const ports: Ports = {
  engine: {
    graphQuery: (system, query) => runQuery(system, query).result,
    behaviorQuery: (system, query) => runQuery(system, query).result,
    explore: () => ({ configurations: [], exhaustive: false }),
  },
  render: { render: (system, request) => renderView(system, request) },
};

const assets: AssetReader = (path) => Promise.resolve(readFileSync(path, "utf8"));

const attached = () => {
  const ws = new Workspace(ports);
  const r = ws.load(readFileSync("examples/docable.mage.yaml", "utf8"));
  assert.ok(r.ok, "the worked example must load");
  return { ws, api: createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets)) };
};

const findings = (doc: unknown): readonly ValidationFinding[] => validateModel(canonicalize(doc));

const base = { mage: 1, system: { id: "t" } };

/**
 * Deliberate violations, one per rule family this file reasons about plus a sweep.
 *
 * Shared with the severity-totality test below, which is why it is a corpus rather than a case: the
 * totality claim is about every rule the validator can emit, and a corpus is the only way to drive
 * rules whose rung this file has no individual opinion about.
 */
const CORPUS: readonly { readonly label: string; readonly doc: unknown }[] = [
  { label: "V3 dangling relation endpoint", doc: {
    ...base, entities: { a: { type: "s" } }, "relation-types": { calls: null },
    models: { m: { kind: "graph", entities: ["a"], relations: [{ from: "a", to: "ghost", type: "calls" }] } },
  } },
  { label: "V5 two parents", doc: {
    ...base,
    entities: { p: { type: "s", contains: ["kid"] }, q: { type: "s", contains: ["kid"] }, kid: { type: "s" } },
  } },
  { label: "V9/V10 unknown states", doc: {
    ...base, machines: { m: { initial: "ghost", states: { a: null }, transitions: [{ from: "a", to: "x" }] } },
  } },
  { label: "V1 unknown event", doc: {
    ...base,
    machines: { m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", sync: "nope" }] } },
  } },
  { label: "V13 conflicting writes in one step", doc: {
    ...base, events: { tick: { participants: ["m", "w"] } },
    machines: {
      m: { initial: "a", states: { a: null, b: null }, variables: { n: { range: [0, 1] } },
        transitions: [{ from: "a", to: "b", sync: "tick", effects: { n: 1 } }] },
      w: { initial: "a", states: { a: null, b: null }, variables: { n: { range: [0, 1] } },
        transitions: [{ from: "a", to: "b", sync: "tick", effects: { n: 1 } }] },
    },
  } },
  { label: "V14 multiplicity in synchronization", doc: {
    ...base, events: { e: { participants: ["m", "w"] } },
    machines: {
      m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", sync: "e" }] },
      w: { instances: 2, initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", sync: "e" }] },
    },
  } },
  { label: "V25 coercible state id", doc: {
    ...base, machines: { m: { initial: "a", states: { a: null, off: null }, transitions: [] } },
  } },
  { label: "V24 omits what it represents", doc: {
    ...base, entities: { a: { type: "s" }, b: { type: "s" } }, "relation-types": { calls: null },
    models: { m: { kind: "graph", purpose: { question: "who calls whom?", omits: ["calls"] },
      entities: ["a", "b"], relations: [{ from: "a", to: "b", type: "calls" }] } },
  } },
  { label: "V27/V28 quantity faults", doc: {
    ...base, entities: { a: { type: "s" } },
    quantities: { bad: { target: "entity:ghost", dimension: "duration", value: "5 ms" },
      worse: { target: "entity:a", dimension: "furlongs", value: "5 ms" } },
  } },
  { label: "V31 reserved namespace", doc: { ...base, entities: { metrics: { type: "s" } } } },
  { label: "V35 undeclared accounting basis", doc: {
    ...base, entities: { a: { type: "s", properties: { executes_in_state: "m.a" } } },
    machines: { m: { initial: "a", states: { a: null }, transitions: [] } },
    quantities: { d: { target: "entity:a", dimension: "duration", value: "5 ms" } },
  } },
  { label: "V38 executes_in_state resolves nowhere", doc: {
    ...base, entities: { a: { type: "s", properties: { executes_in_state: "m.ghost" } } },
    machines: { m: { initial: "a", states: { a: null }, transitions: [] } },
  } },
  { label: "V39 dangling query ceiling", doc: {
    ...base, entities: { a: { type: "s" } },
    queries: { q: { kind: "quantity", quantity: { metric: "latency", within: "ghost" } } },
  } },
  { label: "ANNOTATION truncated note", doc: {
    ...base,
    entities: { a: { type: "s", notes: [{ id: "n1", kind: "comment", text: "one thing", "and another": null }] } },
  } },
];

const corpusFindings = (): readonly ValidationFinding[] => CORPUS.flatMap((c) => findings(c.doc));

// ---------------------------------------------------------------------------------------------
// MQ-I6 — the operation recomputes
// ---------------------------------------------------------------------------------------------

test("MQ-I6: validate() describes the CURRENT revision, and nothing primes it", () => {
  const { ws } = attached();
  const first = ws.validate();
  assert.equal(first.hash, ws.state.hash, "the result must name the revision it describes");
  assert.ok(first.ok, "the worked example ships well formed");
  assert.deepEqual(first.findings, [], "and with no findings");

  // An edit through the ordinary seam. Nothing calls validate() in between -- which is the point:
  // the old affordance was a snapshot an agent had to provoke, and this one is an operation.
  const r = ws.transact({
    transaction: {
      base: first.hash,
      operations: [{ op: "set-label", id: "gateway", value: "Model Gateway (public only)" }],
    },
  });
  assert.ok(r.ok, `expected a commit, got: ${r.findings.map((f) => f.message).join("; ")}`);

  const second = ws.validate();
  assert.notEqual(second.hash, first.hash, "a committed edit must move the revision the result names");
  assert.equal(second.hash, ws.state.hash);
});

test("MQ-I6: two calls at one revision agree, and an undo moves the answer back", () => {
  const { ws } = attached();
  const a = ws.validate();
  const b = ws.validate();
  assert.deepEqual(b, a, "a recomputed result at one revision is the same result");

  ws.transact({ transaction: { base: a.hash, operations: [{ op: "set-label", id: "gateway", value: "x" }] } });
  assert.notEqual(ws.validate().hash, a.hash);
  assert.ok(ws.undo());
  assert.equal(ws.validate().hash, a.hash, "undo returns the revision, so it returns the answer");
});

test("the agent API and the facade are one operation, not two", () => {
  const { ws, api } = attached();
  assert.deepEqual(api.validate(), ws.validate());
  // And it is the SAME rule set the load-time side effect runs, not a second pass over the model.
  const text = readFileSync("examples/docable.mage.yaml", "utf8");
  assert.deepEqual(
    validateModel(canonicalize(parse(text))).map((f) => `${f.rule} @ ${f.where}`),
    validate(canonicalize(parse(text))).map((f) => `${f.rule} @ ${f.where}`),
  );
});

// ---------------------------------------------------------------------------------------------
// MQ-I9 — severity is total, and `ok` derives
// ---------------------------------------------------------------------------------------------

test("MQ-I9: every rule the validator emits has a severity and a spec section", () => {
  const all = corpusFindings();
  assert.ok(all.length >= 20, `the corpus must actually drive rules; it produced ${all.length} findings`);
  const seen = new Set<string>();
  for (const f of all) {
    seen.add(f.rule);
    // `ValidationRule` makes this a compile-time property. Asserted anyway because a cast at any
    // future call site would erase that guarantee silently, and this is what would catch it.
    assert.ok(f.rule in SEVERITY, `${f.rule} has no severity row`);
    assert.ok(f.rule in SPEC_SECTION, `${f.rule} has no spec section`);
    assert.equal(f.severity, SEVERITY[f.rule as keyof typeof SEVERITY]);
    assert.equal(f.spec, SPEC_SECTION[f.rule as keyof typeof SPEC_SECTION]);
  }
  assert.ok(seen.size >= 12, `the corpus covered only ${seen.size} rules: ${[...seen].sort().join(", ")}`);
});

test("`ok` is derived from the findings, never stored", () => {
  for (const c of CORPUS) {
    const fs = findings(c.doc);
    assert.ok(fs.length > 0, `${c.label}: the case must produce a finding or it proves nothing`);
    assert.equal(wellFormed(fs), false, `${c.label}: an error-severity finding is not well formed`);
  }
  assert.equal(wellFormed([]), true, "a model with no findings is well formed");
});

test("the severity vocabulary is closed, and every row uses a member of it", () => {
  for (const [rule, severity] of Object.entries(SEVERITY)) {
    assert.ok(severity === "error" || severity === "warning", `${rule}: '${severity}' is not a severity`);
  }
});

// ---------------------------------------------------------------------------------------------
// `subjects` — populated by the rungs, not parsed out of prose
// ---------------------------------------------------------------------------------------------

test("every finding names the model ids it is about", () => {
  for (const f of corpusFindings()) {
    assert.ok(f.subjects.length > 0,
      `${f.rule} @ ${f.where} names no subject. A rung that considered its subjects and found none ` +
      `is allowed to say so with [], but every rung in this corpus is about named objects.`);
    for (const s of f.subjects) {
      assert.equal(typeof s, "string", `${f.rule}: a subject must be an id`);
      assert.ok(s.length > 0, `${f.rule}: an empty subject is not an id`);
    }
  }
});

test("subjects are not recoverable from `where`, which is why they are a field", () => {
  // V5 is reported at the CLAIMING entity, and it is about the child it claims and the parent that
  // claimed it first -- two ids `where` does not contain. An agent repairing a double-parent needs
  // all three, and `entities.q.contains` carries one of them.
  const v5 = findings(CORPUS[1]!.doc).filter((f) => f.rule === "V5");
  assert.equal(v5.length, 1, "the fixture must produce exactly one V5");
  const f = v5[0]!;
  assert.ok(f.subjects.includes("kid"), "the child the finding is about");
  assert.ok(f.subjects.includes("p"), "the parent that claimed it first");
  assert.ok(!f.where.includes("kid"), "and `where` is the site to edit, which is a different fact");
});

test("subjects are not the quoted tokens of the message either", () => {
  // V13's subjects include the EVENT, which the sentence never names: the message is about the two
  // machines and the variable, and the event is in `where`. So the set is neither a parse of the
  // prose nor a parse of the address -- it is what the rung was holding.
  const v13 = findings(CORPUS[4]!.doc).filter((x) => x.rule === "V13");
  assert.ok(v13.length > 0, "the fixture must produce a V13");
  const f = v13[0]!;
  assert.ok(f.subjects.includes("tick"), "the event whose atomic step the two writes share");
  assert.ok(!f.message.includes("tick"), "which the sentence does not name");
  assert.ok(f.subjects.includes("n"), "and the variable both machines assign");
});

test("a dangling reference contributes the name as written", () => {
  // The unresolved name is the thing to repair. If `subjects` held only declared ids, the one id a
  // reader needs would be reachable only by reading the sentence.
  const v3 = findings(CORPUS[0]!.doc).filter((f) => f.rule === "V3");
  assert.ok(v3.some((f) => f.subjects.includes("ghost")), "the endpoint that resolves nowhere");
  const v38 = findings(CORPUS[11]!.doc).filter((f) => f.rule === "V38");
  assert.ok(v38.some((f) => f.subjects.includes("m.ghost")), "the state reference, exactly as authored");
});

// ---------------------------------------------------------------------------------------------
// `spec` — the join to SEMANTICS.md, checked against SEMANTICS.md
// ---------------------------------------------------------------------------------------------

/**
 * Each heading of the spec with the lines it governs — INCLUDING its subsections.
 *
 * The nesting is the substance rather than tidiness: V27-V31 are stated under `#### The rules`,
 * which sits inside §5.2, and a flat reading of the file reports them as filed under the wrong
 * section. A citation names the section a reader would go to, and a reader goes to §5.2.
 */
interface SpecSection { readonly heading: string; readonly level: number; readonly body: readonly string[] }

const specSections = (): readonly SpecSection[] => {
  const lines = readFileSync("SEMANTICS.md", "utf8").split("\n");
  const heads: { heading: string; level: number; at: number }[] = [];
  lines.forEach((line, at) => {
    const m = /^(#{1,6}) /.exec(line);
    if (m !== null) heads.push({ heading: line.trim(), level: m[1]!.length, at });
  });
  return heads.map((h, i) => {
    let end = lines.length;
    for (const later of heads.slice(i + 1)) {
      if (later.level <= h.level) { end = later.at; break; }
    }
    return { heading: h.heading, level: h.level, body: lines.slice(h.at + 1, end) };
  });
};

test("every cited section exists in SEMANTICS.md, verbatim", () => {
  const headings = new Set(specSections().map((s) => s.heading));
  for (const [rule, section] of Object.entries(SPEC_SECTION)) {
    assert.ok(headings.has(section),
      `${rule} cites "${section}", which is not a heading in SEMANTICS.md. A renamed heading is a ` +
      `broken join, and the point of the field is that the join holds.`);
  }
});

test("every rule is stated under the section it cites", () => {
  const sections = specSections();
  const mentions = (rule: string): RegExp =>
    // The id as a token: `**V25 —`, `(V19)`, `V9);`. Not a prefix match, or V3 would match V35.
    new RegExp(`(^|[^A-Za-z0-9])${rule}($|[^A-Za-z0-9])`);

  for (const [rule, section] of Object.entries(SPEC_SECTION)) {
    const owner = sections.find((s) => s.heading === section);
    assert.ok(owner !== undefined, `${rule}: ${section} is missing`);
    const here = owner.body.some((l) => mentions(rule).test(l));
    // A rule may be INTRODUCED outside its section by a line that cites the section by number --
    // which is how `ANNOTATION` is introduced, in the preamble, as "reports a malformed note (§5.1)".
    const number = section.replace(/^#+ /, "").split(/[ .]/)[0] ?? "";
    const subsection = /^#{3,} /.test(section) ? (section.match(/^#+ ([0-9]+\.[0-9]+)/)?.[1] ?? number) : number;
    const citedElsewhere = sections.some((s) => s.body.some(
      (l) => mentions(rule).test(l) && l.includes(`§${subsection}`)));
    assert.ok(here || citedElsewhere,
      `${rule} cites "${section}", but SEMANTICS.md never mentions ${rule} under it (nor in a line ` +
      `citing §${subsection}). Either the rule moved or the table is wrong.`);
  }
});

// ---------------------------------------------------------------------------------------------
// The authority declaration — §G3, PROVISIONAL
// ---------------------------------------------------------------------------------------------

test("the result says which implementation decided it", () => {
  const { ws } = attached();
  const r = ws.validate();
  assert.equal(r.authority, VALIDATION_AUTHORITY, "one declaration, carried by reference");
  assert.equal(r.authority.implementation, "src/validator/rules.ts");
  assert.ok(r.authority.crossCheckedBy.includes("validate.py"));
  assert.ok(r.authority.crossCheckedBy.includes("parity.test.ts"),
    "naming the second implementation without naming the control that holds it is half a claim");
  assert.equal(r.authority.ratified, false, "§G3 is recommended, not ruled");
  assert.ok(r.authority.declaredBy.includes("G3"), "and the value says where to go and read why");
});

test("the fields the cross-check does not compare are the fields that are declared", () => {
  // The rule that keeps parity TWO-party: an enrichment field enters the compared surface only when
  // validate.py implements it too. A fourth enrichment added without declaring it fails here.
  const f = findings(CORPUS[0]!.doc)[0]!;
  const wire = new Set(["rule", "where", "message"]);
  const enrichment = Object.keys(f).filter((k) => !wire.has(k)).sort();
  assert.deepEqual(enrichment, [...VALIDATION_AUTHORITY.outsideCrossCheck].sort(),
    "every field beyond the wire three is an enrichment, and each must be declared uncompared");
});

test("`validate` is the three wire fields, so the parity surface did not move", () => {
  // `Finding` is the shape validate.py emits and parity.test.ts compares. The operation's extra
  // fields must not leak into it, or three uncompared fields join that comparison by accident.
  const legacy = validate(canonicalize(CORPUS[0]!.doc));
  for (const f of legacy) {
    assert.deepEqual(Object.keys(f).sort(), ["message", "rule", "where"]);
  }
});

// ---------------------------------------------------------------------------------------------
// The registry row
// ---------------------------------------------------------------------------------------------

test("the validate capability names the operation, not a field of another result", () => {
  const row = CAPABILITIES.find((c) => c.id === "validate");
  assert.ok(row !== undefined);
  assert.ok(row.machine.some((m) => m.at === "window.mage.validate" && m.status === "wired"),
    "the machine affordance must be the operation");
  assert.ok(!row.machine.some((m) => m.at.includes("context")),
    "a field of a context read is not an affordance of this capability -- that registration is what " +
    "let the gap sit inside a green registry");
  assert.ok(row.human.every((h) => h.status === "wired"),
    "and the human side had no gap to close: the findings table recomputes on every paint");
});

test("window.mage.validate is reachable through the API's own description", () => {
  const { api } = attached();
  const d = api.describe();
  assert.ok(d.operations.some((o) => o.name === "validate"),
    "an agent must learn the operation from describe(), not from a document");
  assert.deepEqual(d.affordanceGaps, [], "and the registry must report no parity gap");
});
