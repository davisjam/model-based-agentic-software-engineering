// Transaction engine: the pipeline is fixed, the failure is total, and the history is systems.
//
// The assertions that matter are the negative ones. A transaction that commits is easy to get
// right; a transaction that fails must leave the file byte-identical, and a delete that would
// dangle a reference must refuse rather than quietly produce a model that means something else.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TransactionEngine } from "../src/transaction/engine.ts";
import { OP_NAMES } from "../src/transaction/parse.ts";
import { parseTransaction } from "../src/transaction/parse.ts";
import type { Operation, TransactionResult } from "../src/transaction/types.ts";

const EXAMPLE = "examples/docable.mage.yaml";
const raw = (): string => readFileSync(EXAMPLE, "utf8");

const engine = (): TransactionEngine => {
  const r = TransactionEngine.load(raw());
  assert.ok(r.engine, `load failed: ${JSON.stringify(r.findings)}`);
  return r.engine;
};

/** Submit ops against the engine's current hash — the ordinary case. */
const submit = (e: TransactionEngine, ...operations: readonly Operation[]): TransactionResult =>
  e.apply({ transaction: { base: e.hash(), operations, semantics: { atomic: true } } });

const commits = (e: TransactionEngine, ...ops: readonly Operation[]): TransactionResult => {
  const r = submit(e, ...ops);
  assert.equal(r.outcome, "committed", `expected commit, got: ${r.rejection?.message}`);
  return r;
};

const rejects = (e: TransactionEngine, ...ops: readonly Operation[]): TransactionResult => {
  const before = e.toText(); const beforeHash = e.hash();
  const r = submit(e, ...ops);
  assert.equal(r.outcome, "rejected", "expected a rejection");
  assert.ok(r.rejection);
  // The whole point: a failure leaves the current system byte-identical.
  assert.equal(e.toText(), before, "a rejected transaction changed the document");
  assert.equal(e.hash(), beforeHash);
  assert.equal(r.revision, null);
  // Every result carries the hash it describes, and a rejection's is unmoved.
  assert.equal(r.systemHash, beforeHash);
  assert.equal(r.baseHash, beforeHash);
  // Human sentence AND structured twin (FR-A11Y-2).
  assert.ok(r.rejection.message.length > 0);
  assert.ok(r.rejection.findings.length > 0, "a rejection with no structured findings");
  return r;
};

// ------------------------------------------------------------------------------------------------
// Stage 1 — parse
// ------------------------------------------------------------------------------------------------

test("the op table and the schema's op list cannot drift apart", () => {
  // Read the schema rather than restating it: a snapshot copy would pass forever after the schema
  // gained an op (rule #42).
  const schema: unknown = JSON.parse(readFileSync("mage-transaction.schema.json", "utf8"));
  const defs = (schema as { $defs: Record<string, { properties?: { op?: { const?: string } } }> }).$defs;
  const declared = Object.entries(defs)
    .filter(([name]) => name.startsWith("op"))
    .map(([, d]) => d.properties?.op?.const)
    .filter((v): v is string => typeof v === "string");

  assert.ok(declared.length >= 13, `found only ${declared.length} ops in the schema`);
  assert.deepEqual([...declared].sort(), [...OP_NAMES].sort());
});

test("there is no rename op, and asking for one says why", () => {
  const r = parseTransaction({
    transaction: { base: "fnv1a64:0000000000000000", operations: [{ op: "rename", id: "api", to: "api2" }] },
  });
  assert.equal(r.transaction, null);
  const msg = r.findings.map((f) => f.message).join(" ");
  assert.match(msg, /unknown op 'rename'/);
  assert.match(msg, /Ids are immutable \(V2\)/);
  assert.match(msg, /set-label/);
});

test("malformed input is rejected with a located SCHEMA finding, never thrown", () => {
  for (const input of [null, 42, "transaction", [], {}, { transaction: {} },
    { transaction: { base: "nope", operations: [] } },
    { transaction: { base: "fnv1a64:00", operations: [{ op: "set-label", id: "api" }] } },
    { transaction: { base: "fnv1a64:00", operations: [{ op: "set-property", id: "api", name: "p", value: 1, unset: true }] } },
    { transaction: { base: "fnv1a64:00", operations: [{ op: "set-purpose", id: "m", scope: "galaxy" }] } },
    { transaction: { base: "fnv1a64:00", operations: [{ op: "add-entity", id: "9lives" }] } },
    { transaction: { base: "fnv1a64:00", operations: [{ op: "set-label", id: "api", value: "x" }], semantics: { atomic: false } } },
  ]) {
    const r = parseTransaction(input);
    assert.equal(r.transaction, null, `accepted ${JSON.stringify(input)}`);
    assert.ok(r.findings.length > 0);
    assert.ok(r.findings.every((f) => f.rule === "SCHEMA" && f.where.startsWith("transaction")));
  }
});

test("a bare transaction body is accepted; the envelope is clerical, not semantic", () => {
  const e = engine();
  const r = e.apply({ base: e.hash(), operations: [{ op: "set-label", id: "api", value: "Doc API" }] });
  assert.equal(r.outcome, "committed");
});

// ------------------------------------------------------------------------------------------------
// Stage 2 — base verification
// ------------------------------------------------------------------------------------------------

test("a base mismatch is a loud rejection, never a merge", () => {
  const e = engine();
  const r = e.apply({
    transaction: { base: "fnv1a64:deadbeefdeadbeef", operations: [{ op: "set-label", id: "api", value: "x" }] },
  });
  assert.equal(r.outcome, "rejected");
  assert.equal(r.rejection?.kind, "base-mismatch");
  assert.equal(r.rejection?.where, "transaction.base");
  assert.match(r.rejection?.message ?? "", /recompute/);
  assert.equal(e.toText(), raw());
});

test("a base computed before someone else's commit is refused", () => {
  const e = engine();
  const stale = e.hash();
  commits(e, { op: "set-label", id: "api", value: "First" });
  const r = e.apply({ transaction: { base: stale, operations: [{ op: "set-label", id: "api", value: "Second" }] } });
  assert.equal(r.rejection?.kind, "base-mismatch");
  assert.equal(e.system().entities.get("api")?.label, "First");
});

test("the base is the IR hash, so a cosmetic edit does not invalidate a pending transaction", () => {
  const pending = engine().hash();
  const reformatted = TransactionEngine.load(`# someone added a remark\n${raw()}`);
  assert.ok(reformatted.engine);
  assert.equal(reformatted.engine.hash(), pending);
  assert.equal(submit(reformatted.engine, { op: "set-label", id: "api", value: "x" }).outcome, "committed");
});

// ------------------------------------------------------------------------------------------------
// Stage 3 — application, and atomicity
// ------------------------------------------------------------------------------------------------

test("one failing op discards the whole transaction, including the ops that worked", () => {
  const e = engine();
  const r = rejects(e,
    { op: "set-label", id: "api", value: "Would Have Worked" },
    { op: "delete-query", id: "no-such-query" });
  assert.equal(r.rejection?.kind, "operation-failed");
  assert.equal(r.rejection?.where, "transaction.operations[1]");
  assert.equal(e.system().entities.get("api")?.label, "Document API");
});

test("later ops see earlier ops, so delete-plus-add substitutes for the rename V2 forbids", () => {
  const e = engine();
  commits(e,
    { op: "delete-entity", id: "repair-engine", cascade: true },
    { op: "add-entity", id: "repair_engine", type: "component", label: "Repair Engine" },
    { op: "add-relation", model: "service-flow", from: "remediation", to: "repair_engine", type: "owns" });

  const s = e.system();
  assert.equal(s.entities.has("repair-engine"), false);
  assert.equal(s.entities.get("repair_engine")?.label, "Repair Engine");
  // The consequence is visible: the old containment entry went with the cascade rather than being
  // silently rewritten, which is exactly what makes the change legible in a diff.
  assert.deepEqual(s.entities.get("remediation")?.contains, ["parser"]);
});

test("add-state writes the empty-value idiom the file already uses, not an explicit null", () => {
  const e = engine();
  commits(e, { op: "add-state", machine: "worker", state: "draining" });
  assert.ok(e.toText().includes("      draining:\n"), `wrote an explicit null:\n${e.toText()}`);
  assert.ok(!e.toText().includes("draining: null"));
  assert.deepEqual(e.system().machines.get("worker")?.states, ["draining", "held", "idle"]);

  // With a label it is a map, which is also the file's idiom where a state carries one.
  commits(e, { op: "add-state", machine: "worker", state: "paused", label: "Paused" });
  assert.ok(e.toText().includes("label: Paused"));
});

test("delete-transition refuses an ambiguous match and asks for an index", () => {
  const e = engine();
  // `processing` offers both review and fail; add a second fail so from/to alone is ambiguous.
  commits(e, { op: "add-transition", machine: "document", from: "processing", to: "failed", label: "fail-again" });
  const r = rejects(e, { op: "delete-transition", machine: "document", from: "processing", to: "failed" });
  assert.match(r.rejection?.message ?? "", /2 items match/);
  assert.match(r.rejection?.message ?? "", /address one by 'index'/);

  // By index it is unambiguous.
  const n = e.system().machines.get("document")?.transitions.length ?? 0;
  commits(e, { op: "delete-transition", machine: "document", index: n - 1 });
  assert.equal(e.system().machines.get("document")?.transitions.length, n - 1);
});

test("set-property keeps a declared domain on a value-only write, and is byte-local", () => {
  const e = engine();
  const before = e.toText();
  commits(e, { op: "set-property", id: "api", name: "accepts", value: "internal" });

  const p = e.system().entities.get("api")?.properties.get("accepts");
  assert.equal(p?.value, "internal");
  // Untyping it would silently break the `classification > accepts` ordered comparison (V20).
  assert.equal(p?.domain, "sensitivity");
  assert.ok(e.toText().includes("accepts: { value: internal, domain: sensitivity }"));

  const changed = before.split("\n").filter((l, i) => l !== e.toText().split("\n")[i]);
  assert.equal(changed.length, 1, `expected a one-line diff, got ${changed.length}`);
});

test("set-label refuses an id that names two namespaces rather than picking one", () => {
  // Entities and machines are separate namespaces (SEMANTICS §2), so one id can name both and the
  // schema's bare `id` cannot say which was meant.
  const r = TransactionEngine.load([
    "system:", "  id: t",
    "entities:", "  thing:", "    label: An Entity",
    "machines:", "  thing:", "    initial: a", "    states:", "      a:", "    transitions: []",
  ].join("\n") + "\n");
  assert.ok(r.engine);
  const rejected = submit(r.engine, { op: "set-label", id: "thing", value: "Which?" });
  assert.match(rejected.rejection?.message ?? "", /names both a entity and a machine/);
  assert.match(rejected.rejection?.message ?? "", /'scope'/);
});

// ------------------------------------------------------------------------------------------------
// Dangling references — the no-cascade contract
// ------------------------------------------------------------------------------------------------

test("delete-entity without cascade fails and names every site that still points at it", () => {
  const e = engine();
  const r = rejects(e, { op: "delete-entity", id: "parser" });
  assert.equal(r.rejection?.kind, "operation-failed");
  const sites = r.rejection?.findings.map((f) => f.where) ?? [];
  assert.ok(sites.includes("entities.remediation.contains"), `missing containment site: ${sites.join(", ")}`);
  assert.ok(sites.includes("models.service-flow.relations"));
  assert.ok(sites.includes("models.service-flow.entities"));
  assert.match(r.rejection?.message ?? "", /cascade: true/);
});

test("delete-entity with cascade removes every reference, and the result still validates", () => {
  const e = engine();
  commits(e, { op: "delete-entity", id: "parser", cascade: true });

  const s = e.system();
  assert.equal(s.entities.has("parser"), false);
  assert.deepEqual(s.entities.get("remediation")?.contains, ["repair-engine"]);
  assert.equal(s.relations.some((r) => r.from === "parser" || r.to === "parser"), false);
  assert.equal(s.models.get("service-flow")?.entities.includes("parser"), false);
  // The sibling relations are untouched -- cascade removed what pointed at `parser`, not the list.
  assert.equal(s.relations.filter((r) => r.model === "service-flow").length, 2);
});

test("cascade drops a machine's optional entity correspondence rather than blocking on it", () => {
  const e = engine();
  commits(e, { op: "delete-entity", id: "remediation", cascade: true });
  assert.equal(e.system().machines.get("document")?.entity, null);
  assert.ok(e.system().machines.has("document"), "the machine itself must survive");
});

test("delete-state refuses the initial state even with cascade", () => {
  const e = engine();
  const r = rejects(e, { op: "delete-state", machine: "worker", state: "idle", cascade: true });
  assert.match(r.rejection?.message ?? "", /initial state/);
  assert.match(r.rejection?.message ?? "", /set a different one/);
});

test("delete-state refuses when a guard elsewhere tests it, even with cascade", () => {
  // `document.transitions[1]` has `requires: {worker.state: held}`. No V-rule checks a guard's
  // value against the referenced machine's state set, so without this refusal the delete would
  // PASS validation and leave a guard that can never hold -- wrong rather than invalid.
  const e = engine();
  for (const cascade of [false, true]) {
    const r = rejects(e, { op: "delete-state", machine: "worker", state: "held", cascade });
    assert.ok(
      (r.rejection?.findings ?? []).some((f) => f.where === "machines.document.transitions[1].requires"),
      `guard reference not reported (cascade: ${cascade}): ${JSON.stringify(r.rejection?.findings)}`);
  }
  assert.match(
    rejects(e, { op: "delete-state", machine: "worker", state: "held", cascade: true }).rejection?.message ?? "",
    /cascade cannot repair a guard/);
});

// ------------------------------------------------------------------------------------------------
// Stage 4 — whole-system validation
// ------------------------------------------------------------------------------------------------

test("an op that breaks a reference in a DIFFERENT part of the system is refused", () => {
  const e = engine();
  const r = rejects(e, { op: "add-relation", model: "service-flow", from: "api", to: "ghost", type: "may_invoke" });
  assert.equal(r.rejection?.kind, "validation-failed");
  assert.ok(r.rejection?.findings.some((f) => f.rule === "V3"));
});

test("an id a YAML loader would coerce is refused, at whichever stage catches it first", () => {
  const e = engine();

  // `off`, `yes`, `null` all satisfy the schema's id pattern (`^[A-Za-z_]…`), so the schema cannot
  // see them. V25 at the whole-system validation stage is what stops them.
  for (const id of ["off", "yes", "no", "null", "true", "On"]) {
    const r = rejects(e, { op: "add-entity", id, label: "hazard" });
    assert.equal(r.rejection?.kind, "validation-failed", `'${id}' was refused at the wrong stage`);
    assert.ok(r.rejection?.findings.some((f) => f.rule === "V25"), `no V25 finding for '${id}'`);
  }

  // A numeric id is caught one stage EARLIER: the id pattern requires a leading letter or
  // underscore, so parse refuses it before any system is built. Same refusal, cheaper.
  for (const id of ["42", "0x1f", "-1"]) {
    const r = rejects(e, { op: "add-entity", id, label: "hazard" });
    assert.equal(r.rejection?.kind, "malformed", `'${id}' was refused at the wrong stage`);
    assert.ok(r.rejection?.findings.some((f) => f.rule === "SCHEMA"));
  }
});

test("a purpose that declares an omission the model contradicts is refused (V24)", () => {
  const e = engine();
  const r = rejects(e, { op: "set-purpose", scope: "model", id: "service-flow", omits: ["may_invoke"] });
  assert.equal(r.rejection?.kind, "validation-failed");
  assert.ok(r.rejection?.findings.some((f) => f.rule === "V24"));
});

test("a transaction may still be applied to a model that was already invalid", () => {
  // Judged on findings it ADDS, not on findings it inherits -- otherwise a broken file could never
  // be fixed, which is precisely when transactions have to work.
  const broken = [
    "system:", "  id: t",
    "entities:", "  api:", "    label: API",
    "models:", "  m:", "    entities: [api, ghost]",   // V3 at the baseline
  ].join("\n") + "\n";
  const r = TransactionEngine.load(broken);
  assert.ok(r.engine);
  assert.ok(r.engine.baselineFindings.some((f) => f.rule === "V3"), "fixture is not actually invalid");

  assert.equal(submit(r.engine, { op: "set-label", id: "api", value: "API v2" }).outcome, "committed");
  // But a NEW violation of the same rule is still refused.
  const second = submit(r.engine, { op: "add-relation", model: "m", from: "api", to: "phantom", type: "x" });
  assert.equal(second.outcome, "rejected");
  assert.equal(second.rejection?.kind, "validation-failed");
});

// ------------------------------------------------------------------------------------------------
// Stage 5 — commit, and undo/redo as a stack of systems
// ------------------------------------------------------------------------------------------------

test("a commit advances the hash, keeps the comments, and records its rationale", () => {
  const e = engine();
  const before = e.hash();
  const r = e.apply({
    transaction: {
      base: before, rationale: "the label was stale",
      operations: [{ op: "set-label", id: "api", value: "Document API v2" }],
    },
  });
  assert.equal(r.outcome, "committed");
  assert.notEqual(r.systemHash, before);
  assert.equal(r.baseHash, before);
  assert.equal(r.revision?.hash, r.systemHash);
  assert.equal(r.revision?.rationale, "the label was stale");
  assert.equal(r.revision?.operations.length, 1);
  assert.ok(e.toText().includes("DELIBERATELY one instance"), "a commit dropped the comments");
  // The committed document reparses to the system the result claims.
  assert.equal(e.system().entities.get("api")?.label, "Document API v2");
});

test("undo and redo walk a stack of systems and restore bytes exactly", () => {
  const e = engine();
  const text0 = e.toText(); const hash0 = e.hash();
  commits(e, { op: "set-label", id: "api", value: "One" });
  const hash1 = e.hash(); const text1 = e.toText();
  commits(e, { op: "set-label", id: "api", value: "Two" });
  const hash2 = e.hash();

  assert.equal(e.history().length, 3);
  assert.equal(e.canUndo, true);
  assert.equal(e.canRedo, false);

  assert.equal(e.undo()?.hash, hash1);
  assert.equal(e.toText(), text1);
  assert.equal(e.undo()?.hash, hash0);
  // Byte-exact, not merely semantically equal: the whole point of keeping revisions.
  assert.equal(e.toText(), text0);
  assert.equal(e.undo(), null);
  assert.equal(e.canUndo, false);

  assert.equal(e.redo()?.hash, hash1);
  assert.equal(e.redo()?.hash, hash2);
  assert.equal(e.redo(), null);
  assert.equal(e.system().entities.get("api")?.label, "Two");
});

test("committing after an undo clears the redo future", () => {
  const e = engine();
  commits(e, { op: "set-label", id: "api", value: "One" });
  commits(e, { op: "set-label", id: "api", value: "Two" });
  e.undo();
  assert.equal(e.canRedo, true);

  commits(e, { op: "set-label", id: "api", value: "Three" });
  assert.equal(e.canRedo, false, "a divergent commit left a stale redo branch reachable");
  assert.equal(e.system().entities.get("api")?.label, "Three");
});

test("an undone revision's document is unreachable for mutation", () => {
  const e = engine();
  commits(e, { op: "set-label", id: "api", value: "One" });
  const [baseline] = e.history();
  assert.ok(baseline);
  // Every revision in the history is sealed, so no caller can edit the past out from under undo.
  assert.equal(baseline.document.sealed, true);
  assert.equal(e.current.document.sealed, true);
});

test("undo does not resurrect a stale result: the hash travels with the system", () => {
  const e = engine();
  const r1 = commits(e, { op: "set-label", id: "api", value: "One" });
  e.undo();
  // A result minted against revision 1 no longer names the current system, which is how the UI
  // knows not to present it as current.
  assert.notEqual(r1.systemHash, e.hash());
  assert.equal(r1.systemHash, r1.revision?.hash);
});
