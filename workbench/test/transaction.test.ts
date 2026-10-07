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
import { validate } from "../src/validator/rules.ts";
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

  assert.ok(declared.length >= 16, `found only ${declared.length} ops in the schema`);
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
    // FOUR ops, not three, since V40. The cascade took the old id out of `service-flow`'s
    // membership along with the relations naming it, so the substitute has to put the new id back
    // — and before V40 it did not, which made the repo's own rename recipe produce a model
    // asserting an edge to an entity it no longer declared. The rule found that, not a reader.
    { op: "add-model-entity", model: "service-flow", id: "repair_engine" },
    { op: "add-relation", model: "service-flow", from: "remediation", to: "repair_engine", type: "owns" });

  const s = e.system();
  assert.equal(s.entities.has("repair-engine"), false);
  assert.equal(s.entities.get("repair_engine")?.label, "Repair Engine");
  // The consequence is visible: the old containment entry went with the cascade rather than being
  // silently rewritten, which is exactly what makes the change legible in a diff.
  assert.deepEqual(s.entities.get("remediation")?.contains, ["parser"]);
  // And the rename is COMPLETE rather than half-done: the model that asserts the edge declares the
  // endpoint, so every consumer of this revision — the engine's adjacency, the scene, the RDF
  // projection — describes the same system.
  assert.ok(s.models.get("service-flow")?.entities.includes("repair_engine"),
    "a rename substitute that drops the model membership leaves the model asserting an undeclared edge");
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
// Models and notes
//
// The three operations UX-I1 was waiting on. Each had no affordance on EITHER side, which was the
// diagnosis rather than a UI gap: there was no op to bind.
// ------------------------------------------------------------------------------------------------

test("add-model carries no purpose, and composes with the op that owns one", () => {
  // Two ops in one transaction rather than one op with a purpose block. `set-purpose` already
  // writes question/represents/omits and V24 already checks `omits` against the model's real
  // vocabulary; a second writer of those fields would be the duplication this project removes
  // elsewhere. Atomicity is what makes the pair indistinguishable from a combined op.
  const e = engine();
  commits(e,
    { op: "add-model", id: "ownership", label: "Ownership", entities: ["remediation", "parser"] },
    { op: "set-purpose", scope: "model", id: "ownership", question: "Who owns the parser?" });

  const m = e.system().models.get("ownership");
  assert.equal(m?.label, "Ownership");
  assert.equal(m?.purpose.question, "Who owns the parser?");
  assert.deepEqual(m?.entities, ["remediation", "parser"]);
  // `type: graph` is written for the author rather than asked for: it is the only model type the
  // schema allows, so a field for it would be a question with one answer.
  const block = e.toText().slice(e.toText().indexOf("  ownership:"));
  assert.match(block, /^ {2}ownership:\n(?: {4}.*\n)* {4}type: graph\n/);
});

test("add-model refuses an id that is taken, because ids are immutable", () => {
  const r = rejects(engine(), { op: "add-model", id: "service-flow", label: "Second" });
  assert.match(r.rejection?.message ?? "", /already exists; ids are immutable \(V2\)/);
});

test("add-model leaves unknown entity ids to V3, exactly as add-relation does", () => {
  // Not pre-checked in the op. Models reference system-level entities and never redeclare them, and
  // V3 is the rule that says so -- duplicating the check here would be a second place to fix it.
  const r = rejects(engine(), { op: "add-model", id: "ghosts", entities: ["api", "phantom"] });
  assert.equal(r.rejection?.kind, "validation-failed");
  assert.ok(r.rejection?.findings.some((f) => f.rule === "V3" && f.where === "models.ghosts.entities"));
});

test("a purpose that lies takes the whole model with it", () => {
  // The composition's real test: when set-purpose fails validation, add-model is discarded too. A
  // combined op would have the same outcome; two ops in one transaction must not be weaker.
  const e = engine();
  const r = rejects(e,
    { op: "add-model", id: "ownership", entities: ["remediation", "parser"] },
    { op: "add-relation", model: "ownership", from: "remediation", to: "parser", type: "owns" },
    { op: "set-purpose", scope: "model", id: "ownership", omits: ["owns"] });
  assert.equal(r.rejection?.kind, "validation-failed");
  assert.ok(r.rejection?.findings.some((f) => f.rule === "V24"));
  assert.equal(e.system().models.has("ownership"), false, "the model survived a rejected transaction");
});

test("delete-model refuses while the model still asserts a relation, and names every one", () => {
  // The decision this op exists to get right. Relations are flattened across models and carry the
  // model that asserts them, so a relation is a CLAIM rather than a pointer: deleting it and
  // declining to delete it assert different things, and only the author can say which. So there is
  // no cascade to offer -- unlike delete-entity, where dropping a dangling reference is mechanical.
  const e = engine();
  const r = rejects(e, { op: "delete-model", id: "service-flow" });
  assert.equal(r.rejection?.kind, "operation-failed");
  assert.equal(r.rejection?.findings.length, 3, "one finding per claim, so the author sees the cost");
  for (const id of ["api-remediation", "remediation-gateway", "remediation-owns-parser"]) {
    assert.ok(r.rejection?.findings.some((f) => f.message.includes(id)), `${id} was not named`);
  }
  assert.match(r.rejection?.message ?? "", /Delete that relation explicitly/);
  assert.doesNotMatch(r.rejection?.message ?? "", /cascade/,
    "delete-model has no cascade, so its refusal must not suggest one");
});

test("delete-model succeeds once the claims are gone", () => {
  const e = engine();
  commits(e,
    { op: "delete-relation", model: "service-flow", id: "api-remediation" },
    { op: "delete-relation", model: "service-flow", id: "remediation-gateway" },
    { op: "delete-relation", model: "service-flow", id: "remediation-owns-parser" },
    { op: "delete-model", id: "service-flow" });

  const s = e.system();
  assert.equal(s.models.has("service-flow"), false);
  assert.equal(s.relations.some((r) => r.model === "service-flow"), false);
  // Entities are system-level: models reference them, so a deleted model leaves every one standing.
  for (const id of ["api", "remediation", "gateway", "parser", "repair-engine"]) {
    assert.ok(s.entities.has(id), `deleting a model took entity '${id}' with it`);
  }
  assert.ok(!e.toText().includes("service-flow"), `a dangling reference survived:\n${e.toText()}`);
});

test("delete-model on a model that is not there says so", () => {
  assert.match(rejects(engine(), { op: "delete-model", id: "no-such-model" }).rejection?.message ?? "",
    /no model 'no-such-model'/);
});

test("add-note commits WITHOUT advancing the semantic revision (A1)", () => {
  // The invariant, pinned. `systemHash` projects semantics and annotation is not in the projection,
  // so two systems differing only in notes are the SAME system. If this assertion ever fails, the
  // symptom in the product is that attaching a note invalidates every pending agent transaction.
  const e = engine();
  const before = e.hash();
  const r = commits(e, {
    op: "add-note", scope: "entity", id: "api",
    note: { kind: "assumption", text: "Gateway latency is probably 200 ms." },
  });

  assert.equal(e.hash(), before, "a note moved the system hash: A1 is broken");
  assert.equal(r.systemHash, before);
  assert.equal(r.baseHash, before);
  assert.equal(r.revision?.hash, before);
  // Committed, though — the file changed and the note is in the IR. "No new revision identity" is
  // not "nothing happened".
  assert.equal(r.outcome, "committed");
  assert.notEqual(e.toText(), raw());
  const notes = e.system().entities.get("api")?.annotation.notes ?? [];
  assert.equal(notes.length, 1);
  assert.equal(notes[0]?.kind, "assumption");
  assert.equal(notes[0]?.id, "note-1");
});

test("a note does not invalidate a pending agent transaction", () => {
  // The consequence that makes A1 worth holding structurally. An agent computes against a hash, a
  // person annotates the model while it thinks, and the agent's work still applies -- the same
  // argument that kept view positions out of the IR.
  const e = engine();
  const pending = e.hash();
  commits(e, {
    op: "add-note", scope: "model", id: "service-flow",
    note: { kind: "question", text: "Should the repair engine be in this reduction at all?" },
  });
  const r = e.apply({ transaction: { base: pending, operations: [{ op: "set-label", id: "api", value: "Doc API" }] } });
  assert.equal(r.outcome, "committed", `a note invalidated a pending transaction: ${r.rejection?.message}`);
  assert.equal(e.system().entities.get("api")?.label, "Doc API");
  // And the note survived the later commit.
  assert.equal(e.system().models.get("service-flow")?.annotation.notes.length, 1);
});

test("a note reaches each of the three objects that carry annotation", () => {
  // Entities, models and relations, and no others: those are the three the IR gives an `annotation`
  // field, so offering a machine or a transition would be offering to write something the loader
  // drops on the next read.
  const e = engine();
  commits(e,
    { op: "add-note", scope: "entity", id: "gateway", note: { kind: "todo", text: "Confirm what it accepts." } },
    { op: "add-note", scope: "model", id: "data-classification", note: { kind: "rationale", text: "Flow only." } },
    {
      op: "add-note", scope: "relation", model: "service-flow", id: "remediation-owns-parser",
      note: { kind: "comment", text: "Ownership, not invocation." },
    });

  const s = e.system();
  assert.equal(s.entities.get("gateway")?.annotation.notes[0]?.text, "Confirm what it accepts.");
  assert.equal(s.models.get("data-classification")?.annotation.notes[0]?.kind, "rationale");
  const owns = s.relations.find((r) => r.id === "remediation-owns-parser");
  assert.equal(owns?.annotation.notes[0]?.text, "Ownership, not invocation.");
  // Three notes, and the hash still has not moved.
  assert.equal(e.hash(), engine().hash());
});

test("a relation note is addressed by id or by endpoints, and refuses to guess", () => {
  const e = engine();
  commits(e, { op: "add-relation", model: "service-flow", from: "api", to: "remediation", type: "may_invoke" });
  // Two relations now share endpoints and type, so the triple no longer identifies one. Annotating
  // the wrong edge is the quiet failure, so the op refuses and asks for an id.
  const r = rejects(e, {
    op: "add-note", scope: "relation", model: "service-flow",
    from: "api", to: "remediation", type: "may_invoke",
    note: { kind: "comment", text: "Which one?" },
  });
  assert.match(r.rejection?.message ?? "", /2 items match/);

  commits(e, {
    op: "add-note", scope: "relation", model: "service-flow", id: "api-remediation",
    note: { kind: "comment", text: "The one that was written first." },
  });
  const named = e.system().relations.find((x) => x.id === "api-remediation");
  assert.equal(named?.annotation.notes[0]?.text, "The one that was written first.");
});

test("add-note refuses a note the loader would silently drop", () => {
  const e = engine();
  for (const note of [{ kind: "comment", text: "" }, { kind: "comment", text: "   " }]) {
    const r = rejects(e, { op: "add-note", scope: "entity", id: "api", note } as never);
    assert.equal(r.rejection?.kind, "malformed");
    assert.match(r.rejection?.findings.map((f) => f.message).join(" ") ?? "", /dropped on load/);
  }
  // And a kind outside the vocabulary, which would canonicalize to `comment` and mean something
  // the caller did not write.
  const bad = rejects(e, {
    op: "add-note", scope: "entity", id: "api", note: { kind: "warning", text: "Careful." },
  } as never);
  assert.ok(bad.rejection?.findings.some((f) => f.where === "transaction.operations[0].note.kind"));
});

test("add-note refuses to shadow a note id a finding could cite", () => {
  const e = engine();
  commits(e, {
    op: "add-note", scope: "entity", id: "api", note: { id: "latency", kind: "assumption", text: "200 ms." },
  });
  const r = rejects(e, {
    op: "add-note", scope: "entity", id: "api", note: { id: "latency", kind: "comment", text: "Or 300." },
  });
  assert.match(r.rejection?.message ?? "", /already carries a note with id 'latency'/);

  // A generated id steps over a taken name rather than colliding with it, and stays deterministic.
  commits(e, { op: "add-note", scope: "entity", id: "api", note: { kind: "comment", text: "Second." } });
  commits(e, { op: "add-note", scope: "entity", id: "api", note: { kind: "comment", text: "Third." } });
  assert.deepEqual((e.system().entities.get("api")?.annotation.notes ?? []).map((n) => n.id),
    ["latency", "note-2", "note-3"]);
});

test("add-note writes a note's own keys and nothing else, so ANNOTATION stays quiet", () => {
  // `Note.unexpectedKeys` and the ANNOTATION rule exist for a hand-written note an unquoted comma
  // truncated. An op builds the note, so a stray key would be this module's bug -- the parser
  // refuses one rather than writing it and then reporting it.
  const e = engine();
  commits(e, {
    op: "add-note", scope: "entity", id: "api",
    note: { kind: "rationale", text: "One service deliberately.", author: "agent", at: "2026-10-02T14:32:00-04:00" },
  });
  const note = e.system().entities.get("api")?.annotation.notes[0];
  assert.deepEqual(note?.unexpectedKeys, []);
  assert.equal(note?.author, "agent");
  assert.equal(note?.at, "2026-10-02T14:32:00-04:00");
  // A bare timestamp is a date to a YAML 1.1 loader, so it must have gone out quoted (SEMANTICS 10.1).
  assert.ok(e.toText().includes('at: "2026-10-02T14:32:00-04:00"'), `the timestamp went out bare:\n${e.toText()}`);
  assert.equal(validate(e.system()).filter((f) => f.rule === "ANNOTATION").length, 0);
});

test("add-note on something that is not there says what it looked for", () => {
  const e = engine();
  assert.match(
    rejects(e, { op: "add-note", scope: "entity", id: "phantom", note: { kind: "comment", text: "x" } })
      .rejection?.message ?? "", /no entity 'phantom'/);
  assert.match(
    rejects(e, { op: "add-note", scope: "model", id: "phantom", note: { kind: "comment", text: "x" } })
      .rejection?.message ?? "", /no model 'phantom'/);
  assert.match(
    rejects(e, {
      op: "add-note", scope: "relation", model: "phantom", id: "a-b", note: { kind: "comment", text: "x" },
    }).rejection?.message ?? "", /no model 'phantom'/);
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

// ------------------------------------------------------------------------------------------------
// set-description — "Model in words" as STORED model data (UX doctrine §1)
// ------------------------------------------------------------------------------------------------

test("set-description stores the authored sentence, and export -> load round-trips it", () => {
  const e = engine();
  // PRECONDITION of the whole suite: the fixture model must START without a description, or the
  // "stored, not synthesized" assertions below measure the fixture rather than the op.
  assert.equal(e.system().models.get("service-flow")?.description, null,
    "fixture drift: service-flow already carries a description; this suite's baseline is wrong");
  const words = "Models which services may invoke one another; permission, not observed traffic.";
  commits(e, { op: "set-description", scope: "model", id: "service-flow", value: words });
  assert.equal(e.system().models.get("service-flow")?.description, words);
  // Round-trip: the field is part of the ARTIFACT, so a reload of the exported text preserves it.
  const reloaded = TransactionEngine.load(e.toText());
  assert.ok(reloaded.engine, "exported document failed to reload");
  assert.equal(reloaded.engine.system().models.get("service-flow")?.description, words,
    "the description did not survive export() -> load(); it is render-state, not model data");
});

test("a description is prose: writing it does not advance the semantic revision", () => {
  const e = engine();
  const before = e.hash();
  commits(e, { op: "set-description", scope: "model", id: "service-flow", value: "A sentence." });
  assert.equal(e.hash(), before,
    "writing 'Model in words' re-identified the system; prose must stay out of the canonical "
    + "hash the way a label does");
});

test("set-description reaches a machine, and an empty value retracts the field", () => {
  const e = engine();
  const words = "Tracks the document through its processing states.";
  commits(e, { op: "set-description", scope: "machine", id: "document", value: words });
  assert.equal(e.system().machines.get("document")?.description, words);
  commits(e, { op: "set-description", scope: "machine", id: "document", value: "  " });
  assert.equal(e.system().machines.get("document")?.description, null,
    "an all-whitespace value must RETRACT the description — absent means absent, never blank");
});

test("set-description refuses an id that names nothing, atomically", () => {
  const e = engine();
  const r = rejects(e, { op: "set-description", scope: "model", id: "no-such-model", value: "x" });
  assert.match(r.rejection?.message ?? "", /set-description/);
});
