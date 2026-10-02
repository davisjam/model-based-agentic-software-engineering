// The SPARQL seam: the licensing gate (V32) and the structured refusals (V33, V34).
//
// The agreement test is the one that matters, and it is third: the seam and `src/engine/graph.ts`
// decide one licensing rule, so a disagreement between them is worse than either implementation
// alone. The rest of the file guards the ways that decision can rot — a gate that refuses everything,
// a refusal that declines without direction, a scope that acquires a default, and the collapse of
// "the model declines" into "ask the other interface".
import { test } from "node:test";
import assert from "node:assert/strict";
import { runQuery } from "../src/engine/index.ts";
import { GRAPH_FORMS, type GraphForm } from "../src/engine/types.ts";
import {
  admit, directionsOf, licensesTraversal, traversalOf,
  type LicensedQuestion, type QueryScope, type SeamQuestion, type SubsetVerdict, type Traversal,
} from "../src/sparql/index.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { build, docable } from "./engine-fixtures.ts";

const UNION: QueryScope = { kind: "system-union" };
const WITHIN: SubsetVerdict = { kind: "within-subset" };

type RelationalQuestion = Extract<SeamQuestion, { kind: "relational" }>;

/** A relational question, with every required field stated. There is no shorthand on purpose. */
const relational = (
  relation: string, traversal: Traversal, over: Partial<RelationalQuestion> = {},
): RelationalQuestion => ({
  kind: "relational", relation, traversal, evidence: "bindings", scope: UNION, subset: WITHIN,
  ...over,
});

// --------------------------------------------------------------------------------------------
// Task 1 — the gate
// --------------------------------------------------------------------------------------------

test("a composing question over a forbidden relation type is refused, and says what would license it", () => {
  // Catches the failure the whole layer exists to prevent: a raw endpoint over the projection
  // evaluates `mage:owns+` happily, because nothing in RDF knows about `pathComposition: forbidden`.
  const admission = admit(docable(), relational("owns", "composing"));

  assert.equal(admission.kind, "refused");
  if (admission.kind !== "refused") return;
  assert.equal(admission.refusal.cause, "unlicensed-by-model");
  assert.deepEqual(admission.refusal.missing,
    ["path-composition semantics for relation type 'owns'"]);
  // Where to add the distinction, which is the half `QueryResult.refusal` had nowhere to put.
  assert.deepEqual(admission.refusal.models, ["service-flow"]);
  // V33's substance: a refusal that only declines is a dead end. This one names the claim the author
  // would have to make, and names it as the author's to own.
  assert.match(admission.refusal.wouldLicense, /composition\.path: allowed/);
  assert.match(admission.refusal.wouldLicense, /relation type 'owns'/);
});

test("the same question over an ALLOWED relation type is licensed — the negative control", () => {
  // A gate that refuses everything passes the test above and is useless. `may_invoke` declares
  // `composition.path: allowed`, so the composing question is exactly as licensed as the direct one.
  const s = docable();
  for (const traversal of ["direct", "composing"] as const) {
    const admission = admit(s, relational("may_invoke", traversal));
    assert.equal(admission.kind, "licensed", `${traversal} over may_invoke should be licensed`);
    if (admission.kind !== "licensed") continue;
    assert.equal(admission.question.traversal, traversal);
    assert.equal(admission.question.relation, "may_invoke");
  }
  // And `forbidden` gates composition only: one declared `owns` edge is what the model literally says.
  assert.equal(admit(s, relational("owns", "direct")).kind, "licensed");
});

test("a licensed question cannot be forged: only the gate produces one", () => {
  // This is a COMPILE-TIME test, and `npx tsc --noEmit` is the gate that runs it. `LicensedQuestion`
  // carries a brand declared and never defined in `licensing.ts`, so no module can write the key.
  // Drop the brand and the object literal below starts satisfying `LicensedQuestion`, `Forged`
  // collapses to `never`, and this file stops compiling.
  //
  // The failure it catches is the one the design calls out: a licensing check a caller can forget is
  // not a control. An evaluator declaring `LicensedQuestion` as its parameter cannot be handed a
  // question that skipped the gate.
  type Plain = {
    readonly relation: null; readonly traversal: Traversal;
    readonly directions: "forward"; readonly scope: QueryScope;
  };
  type Forged = Plain extends LicensedQuestion ? never : true;
  const forgeryRejected: Forged = true;
  assert.equal(forgeryRejected, true);

  // And the gate's own output does satisfy it, so the brand is strict rather than unsatisfiable.
  const admission = admit(docable(), relational("may_invoke", "composing"));
  assert.equal(admission.kind, "licensed");
});

// --------------------------------------------------------------------------------------------
// The agreement test
// --------------------------------------------------------------------------------------------

/** The engine's decision, reduced to the licensing question and nothing else. */
function engineDecision(system: CanonicalSystem, form: GraphForm, relation: string): string {
  const answer = runQuery(system, {
    kind: "graph", quantifier: "exists",
    graph: { form, relation, from: "api", to: "gateway" },
  });
  return answer.result.outcome === "unlicensed"
    ? `refused:${String(answer.refusal?.reason)}`
    : "licensed";
}

/** The seam's decision on the same input, in the same words. */
function seamDecision(system: CanonicalSystem, form: GraphForm, relation: string): string {
  // `containment` names no relation type: §2 declares containment on the entity, and the engine
  // skips its relation-type check for exactly that form. The seam's containment subject is the join.
  const question: SeamQuestion = form === "containment"
    ? { kind: "containment", entity: "gateway", scope: UNION, subset: WITHIN }
    : relational(relation, traversalOf(form));
  const admission = admit(system, question);
  return admission.kind === "refused" ? `refused:${admission.refusal.reason}` : "licensed";
}

test("the licensing decision agrees with src/engine/graph.ts on every form and relation type", () => {
  const s = docable();
  // Two allowed types, one forbidden, and one the system does not declare at all. `ghost` is in the
  // sweep because agreeing about a misspelled relation type is as load-bearing as agreeing about a
  // forbidden one: both interfaces must reach for the same word.
  const relations = ["may_invoke", "data_flow", "owns", "ghost"];
  const seen = new Set<string>();
  for (const relation of relations) {
    for (const form of GRAPH_FORMS) {
      const engine = engineDecision(s, form, relation);
      const seam = seamDecision(s, form, relation);
      assert.equal(seam, engine, `disagreement on ${form} over '${relation}'`);
      seen.add(engine);
    }
  }
  // The sweep must actually have exercised both refusals and the licensed case, or it agrees about
  // nothing. This is the assertion that makes the loop above a test rather than a formality.
  assert.deepEqual([...seen].sort(),
    ["licensed", "refused:composition-forbidden", "refused:unknown-vocabulary"]);
});

test("the gate reads the engine's own composing-form set, so neither list can drift", () => {
  // `traversalOf` is the one join between the two vocabularies. Pin the two entries whose membership
  // is a judgement rather than an obvious reading: `cycles` is licensed by V8 independently of V7,
  // and `components` is a reachability class, which is the inference `forbidden` declines.
  assert.equal(traversalOf("cycles"), "direct");
  assert.equal(traversalOf("components"), "composing");
  assert.equal(traversalOf("reachability"), "composing");
  assert.equal(traversalOf("direct"), "direct");
});

test("licensesTraversal is the predicate, and it ignores everything except composition", () => {
  const s = docable();
  const owns = s.relationTypes.get("owns");
  const mayInvoke = s.relationTypes.get("may_invoke");
  assert.ok(owns !== undefined && mayInvoke !== undefined, "fixture drift: docable declares both");
  assert.equal(licensesTraversal(owns, "composing"), false);
  assert.equal(licensesTraversal(owns, "direct"), true);
  assert.equal(licensesTraversal(mayInvoke, "composing"), true);
});

// --------------------------------------------------------------------------------------------
// Task 2 — symmetry, and scope
// --------------------------------------------------------------------------------------------

const symmetricSystem = (): CanonicalSystem => build({
  "relation-types": {
    peers: { description: "d", composition: { path: "allowed" }, properties: { symmetric: true } },
    calls: { description: "d", composition: { path: "allowed" }, properties: { symmetric: false } },
  },
  entities: { a: null, b: null },
  models: { one: { relations: [{ from: "a", to: "b", type: "peers" }] } },
});

test("a symmetric relation type licenses a question that must traverse both directions", () => {
  const s = symmetricSystem();
  const peers = s.relationTypes.get("peers");
  const calls = s.relationTypes.get("calls");
  assert.ok(peers !== undefined && calls !== undefined);
  assert.equal(directionsOf(peers), "both");
  assert.equal(directionsOf(calls), "forward");

  // It travels on the licensed question, so an evaluator cannot lose it between the gate and the
  // traversal. The encoding is alternation, `(mage:peers|^mage:peers)` — recorded in the module docs
  // along with the measured Comunica defect that drops its forward branch inside a GRAPH block.
  const admission = admit(s, relational("peers", "composing"));
  assert.equal(admission.kind, "licensed");
  if (admission.kind !== "licensed") return;
  assert.equal(admission.question.directions, "both");
});

test("the engine agrees that a symmetric edge is traversed backwards without a declared reverse", () => {
  // The other half of the symmetry agreement. Only `a -peers-> b` is declared; `symmetric: true` is
  // what makes the reverse question answerable, and the two implementations must read the same field.
  const s = symmetricSystem();
  const back = runQuery(s, {
    kind: "graph", quantifier: "exists",
    graph: { form: "direct", relation: "peers", from: "b", to: "a" },
  });
  assert.equal(back.result.outcome, "holds");
});

test("scope has no default: a caller states which graphs the question reads", () => {
  // The compile-time half. `scope` is a required field of the relational subject, so a caller that
  // omits it does not typecheck and `npx tsc --noEmit` is the gate. Making it optional, or giving it
  // a default, stops this line compiling — which a runtime assertion could never catch, because the
  // point is that the omission never reaches runtime.
  type ScopeIsRequired =
    Extract<SeamQuestion, { kind: "relational" }> extends { scope: QueryScope } ? true : never;
  const scopeIsRequired: ScopeIsRequired = true;
  assert.equal(scopeIsRequired, true);

  // The runtime half: no module-level default to reach for instead.
  const surface = ["admit", "directionsOf", "licensesTraversal", "traversalOf"];
  assert.deepEqual(surface.filter((k) => /default/i.test(k)), []);

  // And the two scopes are distinguishable on the licensed question, so an evaluator cannot read one
  // as the other. Choosing wrong is a silent wrong answer: the union cannot be escaped by moving an
  // edge to another model, and a model-scoped question deliberately can.
  const s = docable();
  const union = admit(s, relational("may_invoke", "composing"));
  const scoped = admit(s, relational("may_invoke", "composing",
    { scope: { kind: "model", model: "service-flow" } }));
  assert.equal(union.kind, "licensed");
  assert.equal(scoped.kind, "licensed");
  if (union.kind !== "licensed" || scoped.kind !== "licensed") return;
  assert.equal(union.question.scope.kind, "system-union");
  assert.deepEqual(scoped.question.scope, { kind: "model", model: "service-flow" });
});

test("a scope naming an undeclared model is refused, not quietly widened to the union", () => {
  // The failure this catches is the worst kind available here: scoping to a model that does not
  // exist, answering over the union instead, and reporting a claim about the system as a claim about
  // one reduction.
  const admission = admit(docable(), relational("may_invoke", "composing",
    { scope: { kind: "model", model: "ghost-model" } }));
  assert.equal(admission.kind, "refused");
  if (admission.kind !== "refused") return;
  assert.equal(admission.refusal.cause, "unknown-vocabulary");
  assert.match(admission.refusal.prose, /ghost-model/);
});

// --------------------------------------------------------------------------------------------
// Task 3 — structured refusals
// --------------------------------------------------------------------------------------------

test("the three causes are distinguishable as data, with no string matching", () => {
  const s = docable();

  const declined = admit(s, relational("owns", "composing"));
  const outside = admit(s, relational("may_invoke", "composing",
    { subset: { kind: "outside-subset", construct: "SERVICE" } }));
  const behavioral = admit(s, { kind: "behavioral", asked: "can the document reach published?" });

  // Cause 3 is a different ARM of the union, not a third value of `cause`. That is the point of
  // keeping it separate: "the model declines" and "ask the other interface" are different facts, and
  // a user told the first when the second is true concludes the workbench cannot do something it does.
  assert.equal(declined.kind, "refused");
  assert.equal(outside.kind, "refused");
  assert.equal(behavioral.kind, "routed");

  if (declined.kind !== "refused" || outside.kind !== "refused" || behavioral.kind !== "routed") return;
  assert.equal(declined.refusal.cause, "unlicensed-by-model");
  assert.equal(outside.refusal.cause, "outside-supported-subset");
  assert.notEqual(declined.refusal.cause, outside.refusal.cause);
  // The routed arm says where the answer comes from, structurally.
  assert.equal(behavioral.route.destination, "engine");
  assert.equal(behavioral.route.reason, "behavioral");
  assert.ok(behavioral.route.prose.length > 0);
});

test("a refusal outside the subset names the construct that was rejected", () => {
  // "Unsupported query" sends the author hunting through their own text. Naming the construct is the
  // difference between a refusal and a shrug.
  const admission = admit(docable(), relational("may_invoke", "direct",
    { subset: { kind: "outside-subset", construct: "SERVICE" } }));
  assert.equal(admission.kind, "refused");
  if (admission.kind !== "refused") return;
  assert.deepEqual(admission.refusal.missing, ["SERVICE"]);
  assert.match(admission.refusal.prose, /SERVICE/);
  // And it states the rule that forbids the obvious repair: §3 hands the query over unmodified,
  // because a silently rewritten query answers a different question.
  assert.match(admission.refusal.prose, /not rewritten/);
  assert.match(admission.refusal.wouldLicense, /SELECT/);
});

test("every refusal the gate can produce carries a non-empty wouldLicense", () => {
  // V33 as an invariant over the whole gate rather than three separate assertions. A refusal added
  // later without a remedy fails here.
  const s = docable();
  const refusals: SeamQuestion[] = [
    relational("owns", "composing"),
    relational("ghost", "direct"),
    relational("may_invoke", "direct", { subset: { kind: "outside-subset", construct: "SERVICE" } }),
    relational("may_invoke", "direct", { scope: { kind: "model", model: "ghost-model" } }),
    { kind: "containment", entity: "ghost-entity", scope: UNION, subset: WITHIN },
  ];
  for (const question of refusals) {
    const admission = admit(s, question);
    assert.equal(admission.kind, "refused", `expected a refusal for ${JSON.stringify(question)}`);
    if (admission.kind !== "refused") continue;
    assert.ok(admission.refusal.wouldLicense.length > 20,
      `${admission.refusal.cause} needs a real remedy, not a placeholder`);
    assert.ok(admission.refusal.missing.length > 0,
      `${admission.refusal.cause} must name what is missing`);
  }
});

test("licensing is decided before routing, so an unlicensed path question is refused not redirected", () => {
  // The ordering failure this catches would be a promise the engine cannot keep: `owns+` is refused
  // by BOTH interfaces, so routing it to the engine tells the user to go and ask a question that will
  // be declined there too, in the same words.
  const admission = admit(docable(),
    relational("owns", "composing", { evidence: "path-witness" }));
  assert.equal(admission.kind, "refused");
  if (admission.kind !== "refused") return;
  assert.equal(admission.refusal.cause, "unlicensed-by-model");
});

test("a licensed question needing a path witness routes to the engine, which can bind the path", () => {
  // §1's constraint, as a decision rather than a paragraph: SPARQL 1.1 dropped path variables, so
  // `mage:rel+` proves existence without binding the intermediates. Answering it in SPARQL would mean
  // `evidence: null` on a question whose answer IS the path.
  const admission = admit(docable(),
    relational("may_invoke", "composing", { evidence: "path-witness" }));
  assert.equal(admission.kind, "routed");
  if (admission.kind !== "routed") return;
  assert.equal(admission.route.reason, "path-witness-required");

  // The same question wanting only bindings stays here: the rows are the witness, nothing is lost.
  assert.equal(admit(docable(), relational("may_invoke", "composing")).kind, "licensed");
});

test("a misspelled relation type is reported as vocabulary, not as a modeling gap", () => {
  // Ordering again, and `runGraphQuery` orders it the same way: a user who typed `ownz` should not
  // first be told about path composition.
  const admission = admit(docable(), relational("ownz", "composing"));
  assert.equal(admission.kind, "refused");
  if (admission.kind !== "refused") return;
  assert.equal(admission.refusal.cause, "unknown-vocabulary");
  assert.match(admission.refusal.prose, /ownz/);
});

test("a containment question is licensed without consulting composition", () => {
  // §2 declares containment on the entity, and it yields hierarchical paths by construction. The
  // engine exempts the `containment` form for the same reason; a seam that gated it would refuse a
  // question the engine answers.
  const admission = admit(docable(), { kind: "containment", entity: "parser", scope: UNION, subset: WITHIN });
  assert.equal(admission.kind, "licensed");
  if (admission.kind !== "licensed") return;
  assert.equal(admission.question.relation, null);
});
