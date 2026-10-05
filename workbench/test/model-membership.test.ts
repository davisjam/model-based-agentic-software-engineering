// A model's membership: what declares it, what extends it, and the half-landed edit V40 forbids.
//
// This file exists because of a measured soundness hole, and it is written to stay about that hole
// rather than about its neighbourhood. The sequence it reconstructs is the one a student performs
// when a modification task says "add a service and subscribe it to a topic":
//
//   1. `add-entity` reaches the IDENTITY namespace. It commits, and it adds the entity to no model.
//   2. `add-relation` names the new entity as an endpoint of a model that does not declare it. It
//      used to commit with no finding on either implementation.
//   3. The exported bytes reloaded CLEAN, so nothing downstream could notice.
//
// The engine builds its adjacency from `system.relations`, so after step 2 it answered
// `predecessors` and `direct` questions with a witness naming the new entity — while the model's
// `entities:` list, which is what the inspector shows as the model's selection and what the RDF
// projection emits `mage:includes` for, did not contain it. A confident answer about a system the
// model does not describe is worse than a refusal, which is why V40 is a refusal.
//
// ## Why these cases and not more
//
// Three assertions carry the weight: the refusal exists, the refusal is V40's and nobody else's,
// and the export/reload round trip declares exactly what the engine answers about. The second is
// what makes the first mean something — a rejection proves only that SOMETHING refused, and the
// rule id is what distinguishes "the hole is closed" from "an adjacent rule happened to fire on my
// fixture." The third is the clause that passed silently before, and it is asserted against the
// ANSWER rather than against the IR, because "the engine answers using an entity the model does not
// declare" is a claim about the answer.
//
// The rest fix the rule's BOUNDARIES: where V3 owns the defect instead, where a cascade must not
// re-open the hole from the other end, and that the shipped corpus already satisfies the property,
// so the rule is a fence rather than a backlog.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TransactionEngine } from "../src/transaction/engine.ts";
import { validate } from "../src/validator/rules.ts";
import { MageDocument } from "../src/yaml/document.ts";
import { runQuery } from "../src/engine/index.ts";
import type { CanonicalSystem, Finding } from "../src/ir/types.ts";
import type { Operation, TransactionResult } from "../src/transaction/types.ts";

// message-bus rather than docable, because this is the example §9.4 Q5 is written against and its
// `event-flow` model is the one whose membership the activity extends.
const EXAMPLE = "examples/message-bus/system.mage.yaml";
const MODEL = "event-flow";
const NEW_ENTITY = "debug-service";
/** `payment-completed` carries the restricted payload, which is what makes Q5's question bite. */
const TOPIC = "payment-completed";

const engine = (): TransactionEngine => {
  const r = TransactionEngine.load(readFileSync(EXAMPLE, "utf8"));
  assert.ok(r.engine, `load failed: ${JSON.stringify(r.findings)}`);
  // The baseline matters to every assertion here: the engine rejects on findings the base did not
  // already have, so a dirty baseline would make V40 unenforceable on this file and the whole
  // sequence below would prove nothing about the rule.
  assert.deepEqual(r.findings, [], "message-bus must load clean for these cases to mean anything");
  return r.engine;
};

const submit = (e: TransactionEngine, ...operations: readonly Operation[]): TransactionResult =>
  e.apply({ transaction: { base: e.hash(), operations, semantics: { atomic: true } } });

const commits = (e: TransactionEngine, ...ops: readonly Operation[]): TransactionResult => {
  const r = submit(e, ...ops);
  assert.equal(r.outcome, "committed", `expected a commit, got: ${r.rejection?.message}`);
  return r;
};

const declareDebugService: Operation = {
  op: "add-entity", id: NEW_ENTITY, type: "service", label: "Debug Service",
};
const subscribeToTopic: Operation = {
  op: "add-relation", model: MODEL, from: NEW_ENTITY, to: TOPIC, type: "subscribes",
};

/** Endpoints a model asserts an edge to without declaring them. The property V40 holds at zero. */
const undeclaredEndpoints = (
  s: CanonicalSystem,
): readonly string[] => {
  const out: string[] = [];
  for (const r of s.relations) {
    const owner = s.models.get(r.model);
    if (owner === undefined) continue;
    for (const [side, id] of [["from", r.from], ["to", r.to]] as const) {
      if (!owner.entities.includes(id)) out.push(`models.${r.model}.relations ${side}: ${id}`);
    }
  }
  return out;
};

// ------------------------------------------------------------------------------------------------
// The sequence, refused
// ------------------------------------------------------------------------------------------------

test("the half-landed membership edit is impossible: add-relation to a non-member refuses", () => {
  const e = engine();

  // Step 1 commits, exactly as it did before, and that is not the defect. `add-entity` reaches the
  // identity namespace by design — models reference entities and never redeclare them (V3), so an
  // op that silently put the new id into every model's membership would be guessing which
  // purposeful reductions should now see it.
  commits(e, declareDebugService);
  const afterIdentity = e.system();
  assert.ok(afterIdentity.entities.has(NEW_ENTITY), "add-entity must reach the identity namespace");
  assert.ok(!afterIdentity.models.get(MODEL)?.entities.includes(NEW_ENTITY),
    "add-entity must NOT quietly extend a model's membership");

  // Step 2 is the one that used to commit silently.
  const before = e.toText();
  const r = submit(e, subscribeToTopic);
  assert.equal(r.outcome, "rejected",
    "add-relation named an endpoint the model does not declare and the transaction committed");
  assert.ok(r.rejection);
  assert.equal(r.rejection.kind, "validation-failed");
  // The refusal is total, which is what makes "half-landed" the right word for the old behaviour.
  assert.equal(e.toText(), before, "a rejected transaction changed the document");
  assert.equal(e.hash(), r.baseHash);

  // THE NEGATIVE-CONTROL ASSERTION, held in the suite rather than only performed by hand. A
  // rejection proves that something refused; this proves V40 refused, and that no neighbouring
  // rule fired on the fixture. Delete the rule and this file goes green-by-absence at the line
  // above, which is the manual control — but a rule that merely MOVED, or a fixture that tripped
  // V3 or V24 by accident, would be caught here and nowhere else.
  assert.deepEqual([...new Set(r.rejection.findings.map((f) => f.rule))], ["V40"],
    `expected V40 alone, got ${JSON.stringify(r.rejection.findings)}`);
  const v40 = r.rejection.findings[0] as Finding;
  assert.equal(v40.where, `models.${MODEL}.relations`, "the finding must name the site to edit");
  assert.match(v40.message, /not a member of model 'event-flow'/);
  // The repair, named in the message, and named as an OPERATION. A refusal that does not say what
  // to do instead sends a student to the schema, and the whole activity is a model-change loop —
  // so the sentence has to reach the vocabulary they are already working in.
  assert.match(v40.message, /add-model-entity/);
});

test("atomicity is not a way around it: the two ops in ONE transaction refuse together", () => {
  // Worth its own case because the ops apply in order and each sees its predecessors' effects, so
  // `add-entity` DOES make the endpoint resolvable before `add-relation` runs. V3 is therefore
  // satisfied inside the candidate, and V40 is the only rule standing between this transaction and
  // a commit. If the rule were implemented on the operation instead of on the resulting system,
  // this is the case that would slip through.
  const e = engine();
  const r = submit(e, declareDebugService, subscribeToTopic);
  assert.equal(r.outcome, "rejected", "a single atomic transaction smuggled the edit through");
  assert.deepEqual([...new Set(r.rejection?.findings.map((f) => f.rule) ?? [])], ["V40"]);
});

test("V3 still owns an endpoint that resolves nowhere, and V40 declines", () => {
  // The boundary between the two rules, which neither one's own case can pin. One defect gets one
  // sentence at one site: a misspelled endpoint is a dangling reference, not a membership decision,
  // and telling the author it is "not a member" would send them to the wrong field.
  const e = engine();
  const r = submit(e, { op: "add-relation", model: MODEL, from: "ghost-service", to: TOPIC, type: "subscribes" });
  assert.equal(r.outcome, "rejected");
  const rules = [...new Set(r.rejection?.findings.map((f) => f.rule) ?? [])];
  assert.deepEqual(rules, ["V3"], `expected V3 alone, got ${JSON.stringify(r.rejection?.findings)}`);
});

test("cascade-delete leaves the invariant intact — it removes the membership AND the edge", () => {
  // The dual direction, and the reason no removal op is needed to keep V40 true today: the only
  // path that drops a membership entry is `delete-entity --cascade`, and it drops every relation
  // naming the entity in the same pass. Without that pairing, a cascade would re-open this hole
  // from the other end — a model asserting an edge to an id it had just stopped declaring.
  const e = engine();
  assert.ok(e.system().models.get(MODEL)?.entities.includes("analytics"));
  commits(e, { op: "delete-entity", id: "analytics", cascade: true });
  const s = e.system();
  assert.ok(!s.entities.has("analytics"));
  assert.ok(!s.models.get(MODEL)?.entities.includes("analytics"));
  assert.deepEqual(undeclaredEndpoints(s), [], "a cascade left an edge to a non-member");
  assert.deepEqual(validate(s), []);
});

test("every shipped model already declares every endpoint it asserts an edge to", () => {
  // The property at its real baseline. V40 landed on a corpus that satisfies it, so this asserts
  // the rule is a FENCE rather than a backlog — and it is the assertion that fails first if someone
  // authors the breach by hand instead of through a transaction.
  const s = TransactionEngine.load(readFileSync(EXAMPLE, "utf8")).engine?.system();
  assert.ok(s !== undefined);
  assert.ok(s.relations.length > 10, `only ${s.relations.length} relations — the fixture is wrong`);
  assert.deepEqual(undeclaredEndpoints(s), []);
});


// ------------------------------------------------------------------------------------------------
// The extending operation, and the clause that silently passed
// ------------------------------------------------------------------------------------------------

test("export and reload: the reloaded model declares exactly what the engine answers about", () => {
  // The clause that passed silently. Reloading the bytes is the only check a student's exported
  // file ever gets, so a rule that held in memory and not across the round trip would be no rule.
  const e = engine();
  commits(e, declareDebugService, { op: "add-model-entity", model: MODEL, id: NEW_ENTITY }, subscribeToTopic);

  const reloaded = MageDocument.load(e.toText()).document;
  assert.ok(reloaded !== null, "the exported bytes did not reload");
  const s = reloaded.seal().system();
  assert.deepEqual(validate(s), [], "the reloaded system must be clean");

  const membership = s.models.get(MODEL)?.entities ?? [];
  assert.ok(membership.includes(NEW_ENTITY), "the reloaded model must declare the new member");
  assert.deepEqual(undeclaredEndpoints(s), []);

  // And the join the hole was about: the entity the engine names in its witness is one the
  // reloaded model declares. Asserted against the ANSWER rather than against the IR, because
  // "the engine answers using an entity the model does not declare" is a claim about the answer.
  const answer = runQuery(s, {
    kind: "graph", quantifier: "exists",
    graph: { form: "predecessors", relation: "subscribes", to: TOPIC },
  });
  assert.equal(answer.result.outcome, "holds");
  const named = answer.result.evidence?.nodes ?? [];
  assert.ok(named.includes(NEW_ENTITY), `the witness should name ${NEW_ENTITY}, got ${JSON.stringify(named)}`);
  for (const id of named) {
    if (id === TOPIC) continue;
    assert.ok(membership.includes(id),
      `the engine answered with '${id}', which the reloaded model does not declare`);
  }
});

test("add-model-entity extends the membership and nothing else", () => {
  const e = engine();
  const before = e.system().models.get(MODEL)?.entities ?? [];
  commits(e, declareDebugService, { op: "add-model-entity", model: MODEL, id: NEW_ENTITY });
  const after = e.system().models.get(MODEL)?.entities ?? [];
  assert.deepEqual([...after], [...before, NEW_ENTITY], "membership must grow by exactly the one id");
  // The other models are untouched: membership is per-model, which is what makes a model a
  // purposeful reduction rather than a view of one global set.
  for (const m of e.system().models.values()) {
    if (m.id === MODEL) continue;
    assert.ok(!m.entities.includes(NEW_ENTITY), `${m.id} gained a member it was not asked for`);
  }
});

test("add-model-entity refuses a duplicate, and refuses a model that does not exist", () => {
  const e = engine();
  const dup = submit(e, { op: "add-model-entity", model: MODEL, id: "analytics" });
  assert.equal(dup.outcome, "rejected");
  assert.equal(dup.rejection?.kind, "operation-failed");
  assert.match(dup.rejection?.message ?? "", /already a member/);

  const ghost = submit(e, { op: "add-model-entity", model: "no-such-model", id: "analytics" });
  assert.equal(ghost.outcome, "rejected");
  assert.equal(ghost.rejection?.kind, "operation-failed");
  assert.match(ghost.rejection?.message ?? "", /no model 'no-such-model'/);
});

test("add-model-entity leaves an unknown entity id to V3, as add-relation and add-model do", () => {
  // Not an operation failure: the op's target is the MODEL, and the id it writes is a reference the
  // validator resolves over the whole resulting system. Checking it twice would put the reference
  // rule in two places, and the stage that owns references is stage 4.
  const e = engine();
  const r = submit(e, { op: "add-model-entity", model: MODEL, id: "ghost-service" });
  assert.equal(r.outcome, "rejected");
  assert.equal(r.rejection?.kind, "validation-failed");
  assert.deepEqual([...new Set(r.rejection?.findings.map((f) => f.rule) ?? [])], ["V3"]);
  assert.equal(r.rejection?.findings[0]?.where, `models.${MODEL}.entities`);
});
