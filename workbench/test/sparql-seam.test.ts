// The SPARQL seam: the licensing gate (V32) and the structured refusals (V33, V34).
//
// The agreement tests are the ones that matter, and they are fourth onward: the seam and
// `src/engine/graph.ts` decide one licensing rule, so a disagreement between them is worse than
// either implementation alone. The rest of the file guards the ways that decision can rot — a gate
// that refuses everything, a refusal that declines without direction, a scope that acquires a
// default, and the collapse of "the model declines" into "ask the other interface".
//
// Agreement on WHICH answer was never the whole of it. The v0.1 audit's DEFECT-3 was agreement on
// the answer and disagreement on the REASON: a purposeful omission refused here as a lookup miss and
// in the engine as a recorded decision, so a reader who asked both went hunting a typo that does not
// exist. §7.6's omission rung is therefore swept too, over docable and over every shipped example,
// and the sentence is compared by byte equality rather than by substring — the gap was two
// explanations of one absence, and a substring match is blind to exactly that.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { runQuery, runSavedQueries } from "../src/engine/index.ts";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { GRAPH_FORMS, type GraphForm } from "../src/engine/types.ts";
import {
  admit, answerSparql, directionsOf, licensesTraversal, traversalOf,
  type LicensedQuestion, type QueryScope, type SeamQuestion, type SubsetVerdict, type Traversal,
} from "../src/sparql/index.ts";
import { entityIri, modelGraphIri, relationTypeIri } from "../src/rdf/iri.ts";
import { project } from "../src/rdf/project.ts";
import { EXAMPLE_IDS, exampleText } from "../scripts/gen-example-coverage.ts";
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
  // Two allowed types, one forbidden, one the system does not declare at all, and one it declares
  // OMITTED. `ghost` is in the sweep because agreeing about a misspelled relation type is as
  // load-bearing as agreeing about a forbidden one: both interfaces must reach for the same word.
  // `call_frequency` is the omission rung — `service-flow` declares `omits: [call frequency]`, and
  // this seam used to call that a lookup miss while the engine called it a decision.
  const relations = ["may_invoke", "data_flow", "owns", "ghost", "call_frequency"];
  const seen = new Set<string>();
  for (const relation of relations) {
    for (const form of GRAPH_FORMS) {
      const engine = engineDecision(s, form, relation);
      const seam = seamDecision(s, form, relation);
      assert.equal(seam, engine, `disagreement on ${form} over '${relation}'`);
      seen.add(engine);
    }
  }
  // The sweep must actually have exercised every refusal and the licensed case, or it agrees about
  // nothing. This is the assertion that makes the loop above a test rather than a formality.
  assert.deepEqual([...seen].sort(), [
    "licensed", "refused:composition-forbidden", "refused:missing-distinction",
    "refused:unknown-vocabulary",
  ]);
});

// --------------------------------------------------------------------------------------------
// The omission rung (§7.6) — the audit's DEFECT-3
// --------------------------------------------------------------------------------------------

/** The engine's refusal to a question naming `relation`, or null when it answered. */
const engineRefusalFor = (s: CanonicalSystem, raw: unknown): { reason: string; prose: string } => {
  const answer = runQuery(s, raw);
  assert.ok(answer.refusal !== null, `the engine answered ${JSON.stringify(raw)}; expected a refusal`);
  return { reason: answer.refusal.reason, prose: answer.refusal.prose };
};

/** The seam's refusal to the same question, or a failure if it licensed one. */
const seamRefusalFor = (s: CanonicalSystem, question: SeamQuestion) => {
  const admission = admit(s, question);
  assert.equal(admission.kind, "refused", `the seam admitted ${JSON.stringify(question)}`);
  if (admission.kind !== "refused") throw new Error("unreachable");
  return admission.refusal;
};

test("a purposeful omission refuses the same way through both interfaces, down to the sentence", () => {
  // The defect this closes: `cache_hit_frequency` asked of the engine said "the model decided not to
  // represent this" and asked of this seam said "that name is not declared", which reads as a typo.
  // One model, two interfaces, two different answers to WHY it cannot be answered — the thing V32
  // exists to prevent, open at the seam while §7.6 carried the warning.
  //
  // Two rungs, because both interfaces have both subjects. docable's `service-flow` declares
  // `omits: [call frequency]` and its `worker` machine declares `omits: [queue depth]`.
  const s = docable();

  const rel = engineRefusalFor(s,
    { kind: "graph", quantifier: "exists", graph: { form: "direct", relation: "call_frequency", from: "api", to: "gateway" } });
  const relSeam = seamRefusalFor(s, relational("call_frequency", "direct"));
  assert.equal(rel.reason, "missing-distinction", "fixture drift: the engine should reach the rung");
  assert.equal(relSeam.cause, "missing-distinction");
  assert.equal(relSeam.reason, rel.reason);
  assert.deepEqual(relSeam.missing, ["call frequency"], "the omission is quoted in the author's words");
  assert.deepEqual(relSeam.models, ["service-flow"], "and says where the distinction would go");
  // "Down to the refusal sentence" (§7.5, V32), taken literally. This is byte equality and not a
  // substring match, because the gap it closes was two different EXPLANATIONS of one absence.
  assert.equal(relSeam.prose, rel.prose);

  const ent = engineRefusalFor(s,
    { kind: "graph", quantifier: "exists", graph: { form: "containment", relation: "owns", to: "queue_depth" } });
  const entSeam = seamRefusalFor(s,
    { kind: "containment", entity: "queue_depth", scope: UNION, subset: WITHIN });
  assert.equal(ent.reason, "missing-distinction");
  assert.equal(entSeam.cause, "missing-distinction");
  assert.deepEqual(entSeam.missing, ["queue depth"]);
  assert.equal(entSeam.prose, ent.prose);

  // And the remedy is a DECISION, not a lookup. The other three causes send the author to a
  // declaration; this one sends them to the question of what the model is for.
  assert.match(entSeam.wouldLicense, /decide whether this model should represent 'queue depth'/);
  assert.match(entSeam.wouldLicense, /purpose\.omits/);
});

test("the seam declines to guess, on exactly the boundary §8 draws", () => {
  // The negative control, and the reason there must be ONE coverage predicate: the rule is word
  // coverage in one direction, so `encryption_at_rest` against `omits: [encryption in transit]`
  // contributes `rest`, which the omission does not have. A looser rule would tell an author the
  // model decided something it never considered, which is the same wrong-reason defect inverted.
  //
  // `src/engine/omission.ts` owns that predicate and this seam calls it rather than carrying a
  // second copy. A second copy is how the engine and this seam drifted apart to begin with.
  const s = docable();
  const uncovered = engineRefusalFor(s,
    { kind: "graph", quantifier: "exists", graph: { form: "direct", relation: "encryption_at_rest", from: "api", to: "gateway" } });
  const seam = seamRefusalFor(s, relational("encryption_at_rest", "direct"));
  assert.equal(uncovered.reason, "unknown-vocabulary", "the omission must not cover this need");
  assert.equal(seam.cause, "unknown-vocabulary");
  assert.equal(seam.prose, uncovered.prose, "the honest absence is one sentence too");

  // And the covered spelling of the SAME omission does fire, so the control above is a boundary
  // rather than a rung that never runs.
  assert.equal(seamRefusalFor(s, relational("encryption_in_transit", "direct")).cause,
    "missing-distinction");
});

test("the omission rung reaches the scope subject too, which the engine has no counterpart for", () => {
  // §7.6: "the ruling binds every rung, not the one a bug report named." The seam has three rungs
  // where a name fails to resolve and the audit named two; V34's model scope is the third, and it is
  // the one asymmetry worth recording — the engine and validate.py union across every model by
  // construction, so neither has a model name to fail to resolve. There is therefore no engine
  // sentence to match here, and the invariant is the cause plus the quoted omission.
  const s = docable();
  const scoped = seamRefusalFor(s, relational("may_invoke", "direct",
    { scope: { kind: "model", model: "queue_depth" } }));
  assert.equal(scoped.cause, "missing-distinction");
  assert.deepEqual(scoped.missing, ["queue depth"]);
  assert.match(scoped.prose, /model 'queue_depth' is not declared by this system/);
  assert.match(scoped.prose, /deliberately omits 'queue depth'/);

  // A scope that names nothing anybody spoke about still reports the bare absence.
  assert.equal(seamRefusalFor(s, relational("may_invoke", "direct",
    { scope: { kind: "model", model: "ghost-model" } })).cause, "unknown-vocabulary");
});

test("no shipped example's saved graph query gets two different refusal causes", () => {
  // The audit's defect was found in one query of one example. This is the sweep that would have
  // found it: every saved graph query of every shipped example, asked of both interfaces, compared
  // on the CAUSE. Two of them refuse as `missing-distinction` (document-processing's flagship §5.6
  // cache question and message-bus's `observed_delivery`), and before this landed the seam called
  // both of those lookup misses.
  let compared = 0;
  const causes = new Set<string>();
  for (const id of EXAMPLE_IDS) {
    const system = canonicalize(parse(exampleText(id)));
    for (const [qid, answer] of runSavedQueries(system)) {
      const raw = system.queries.get(qid)?.raw;
      const q = raw as { kind?: string; graph?: { form: GraphForm; relation: string; from?: string; to?: string } };
      if (q?.kind !== "graph" || q.graph === undefined) continue;
      const g = q.graph;
      const question: SeamQuestion = g.form === "containment"
        ? { kind: "containment", entity: g.to ?? g.from ?? "", scope: UNION, subset: WITHIN }
        : relational(g.relation, traversalOf(g.form));
      const admission = admit(system, question);
      // The engine's endpoints are a subject the seam does not have (`parse.ts` cannot produce one),
      // so an engine refusal ABOUT an endpoint would be a licensed question here. No shipped example
      // has one; if one lands, this is the assertion that says so rather than quietly excusing it.
      const engine = answer.result.outcome === "unlicensed" ? String(answer.refusal?.reason) : "answered";
      const seam = admission.kind === "refused" ? admission.refusal.reason : "answered";
      assert.equal(seam, engine, `${id}/${qid} ('${g.form}'): the engine says '${engine}', the seam says '${seam}'`);
      causes.add(engine);
      compared += 1;
    }
  }
  assert.ok(compared > 0, "the sweep compared nothing; a vacuous agreement test is the defect itself");
  assert.ok(causes.has("missing-distinction"),
    `no shipped example exercised the omission rung, so this sweep proves nothing about it: ${[...causes]}`);
});

// --------------------------------------------------------------------------------------------
// The substrate-absence rung — the model-type registry, at the second seam
// --------------------------------------------------------------------------------------------

/**
 * A system that declares relation types and entities and NO models.
 *
 * The natural intermediate state of an authoring session, and the one the rung is about: every name
 * the question uses resolves, the relation type licenses composition, the subset accepts the query,
 * and there is no structural model for any of it to be true of.
 */
const modelless = (): CanonicalSystem => build({
  "relation-types": {
    may_invoke: { description: "d", composition: { path: "allowed" } },
  },
  entities: { api: null, gateway: null },
});

test("a relational question over a system declaring no model is refused, not answered false", () => {
  // What this seam did before the rung: `admit` LICENSED it, the evaluator ran over a dataset with
  // no relation edge in it, and `ASK` came back `false`. A confident NO about a system that models
  // no structure is the `latency: 0 ms` defect wearing relational clothes — an answer that looks
  // measured and was computed over nothing. The engine refused the same question.
  const s = modelless();
  for (const traversal of ["direct", "composing"] as const) {
    const refusal = seamRefusalFor(s, relational("may_invoke", traversal));
    assert.equal(refusal.cause, "missing-model-type", `${traversal} should reach the rung`);
    assert.deepEqual(refusal.missing, ["structural model"]);
    assert.match(refusal.wouldLicense, /declare a model under `models:`/);
  }
});

test("the absent-type refusal is the engine's sentence, not a second wording of it", () => {
  // V32 taken literally again, and the byte comparison is the same instrument the omission rung
  // uses. The arrangement is stronger here than there: the engine EXPORTS this sentence from the
  // model-type registry, so there is no copy to drift — this test pins that the seam generates it
  // rather than retyping it, which a `prose` edit on either side would otherwise hide.
  const s = modelless();
  const engine = engineRefusalFor(s,
    { kind: "graph", quantifier: "exists", graph: { form: "direct", relation: "may_invoke", from: "api", to: "gateway" } });
  const seam = seamRefusalFor(s, relational("may_invoke", "direct"));
  assert.equal(engine.reason, "missing-model-type", "fixture drift: the engine should reach the rung");
  assert.equal(seam.reason, engine.reason);
  assert.equal(seam.prose, engine.prose);
  // And the sentence does the two jobs the rung exists for: it names the absent TYPE rather than a
  // name to go hunting for, and it names the authoring move.
  assert.match(seam.prose, /declares no structural model/);
  assert.doesNotMatch(seam.prose, /is not declared by this system/);
});

test("a behavioral question over a machineless system is refused, not routed to the engine", () => {
  // Rung 4's objection pointed at rung 1. Routing says "the analysis engine answers it", and over a
  // machineless system the engine refuses in the next breath — so the route would send a reader to
  // collect an answer that does not exist. The sentence is the state-machine entry's, so the two
  // interfaces say one thing about the absent machine too.
  const s = modelless();
  const admission = admit(s, { kind: "behavioral", asked: "can the document reach published?" });
  assert.equal(admission.kind, "refused");
  if (admission.kind !== "refused") return;
  assert.equal(admission.refusal.cause, "missing-model-type");
  assert.deepEqual(admission.refusal.missing, ["state machine"]);

  const engine = engineRefusalFor(s, { kind: "behavior", quantifier: "exists", behavior: { form: "deadend" } });
  assert.equal(admission.refusal.prose, engine.prose);

  // The negative control: a system WITH a machine still routes, so the rung has not swallowed the
  // route it sits above.
  const routed = admit(docable(), { kind: "behavioral", asked: "can the document reach published?" });
  assert.equal(routed.kind, "routed");
});

test("a containment question follows the engine into the refusal, rather than answering alone", () => {
  // The seam COULD answer this: `project.ts` puts the entity `contains` tree in the default graph,
  // which a system with no models still has. The engine cannot, because `containment` is one of its
  // graph forms and its registry rung declines the whole dialect. One decision, two interfaces
  // (V32) — so the nicer answer loses to the agreeing one, and `QUERY_KIND` says so in code.
  const s = build({
    "relation-types": { may_invoke: { description: "d", composition: { path: "allowed" } } },
    entities: { api: { contains: ["handler"] }, handler: null },
  });
  const seam = seamRefusalFor(s, { kind: "containment", entity: "handler", scope: UNION, subset: WITHIN });
  const engine = engineRefusalFor(s,
    { kind: "graph", quantifier: "exists", graph: { form: "containment", relation: "may_invoke", to: "handler" } });
  assert.equal(seam.cause, "missing-model-type");
  assert.equal(seam.prose, engine.prose);
});

test("the rung outranks vocabulary and licensing, which is the order the engine uses", () => {
  // Precedence, and it is not cosmetic: the engine consults the registry ahead of its evaluators
  // AND ahead of resolving any name, so a seam that checked names first would answer a misspelling
  // where the engine answers an absent type — one model, two explanations, which is the whole of
  // what V32 forbids. Three questions that each have a SECOND thing wrong with them; all three must
  // still report the type.
  const s = modelless();
  const cases: [string, SeamQuestion][] = [
    ["a misspelled relation type", relational("ownz", "direct")],
    ["a scope naming no model", relational("may_invoke", "direct", { scope: { kind: "model", model: "ghost" } })],
    ["an undeclared entity", { kind: "containment", entity: "ghost", scope: UNION, subset: WITHIN }],
  ];
  for (const [label, question] of cases) {
    assert.equal(seamRefusalFor(s, question).cause, "missing-model-type", label);
  }

  // The subset verdict is the one thing that still wins, and `translate` is why: a clause the walker
  // rejected is a fault in the TEXT, and the author can point at it without knowing anything about
  // the model. `admit` keeps the same order the engine does for everything that IS about the model.
  const engineSaysSame = engineRefusalFor(s,
    { kind: "graph", quantifier: "exists", graph: { form: "direct", relation: "ownz", from: "api", to: "gateway" } });
  assert.equal(engineSaysSame.reason, "missing-model-type",
    "if the engine ever reports vocabulary first here, this seam must follow it, not lead");
});

test("the text path refuses before it resolves a graph IRI, so a scoped query hears the type", () => {
  // The site `admit` alone could not reach. `translate` derives the scope from the query's named
  // graphs BEFORE admitting anything, and over a system with no models every graph IRI names an
  // undeclared model — so the author of an empty `models:` section got "model 'x' is not declared",
  // a misspelling to hunt for. Both spellings of the question now hear the same thing.
  const s = modelless();
  const dataset = project(s);
  const P = relationTypeIri(s.systemId, "may_invoke").value;
  const [api, gateway] = [entityIri(s.systemId, "api").value, entityIri(s.systemId, "gateway").value];
  const scoped = modelGraphIri(s.systemId, "service-flow").value;

  for (const [label, text] of [
    ["unscoped ASK", `ASK { GRAPH ?g { <${api}> <${P}> <${gateway}> } }`],
    ["unscoped SELECT", `SELECT ?x WHERE { GRAPH ?g { <${api}> <${P}> ?x } }`],
    ["model-scoped ASK", `ASK { GRAPH <${scoped}> { <${api}> <${P}> <${gateway}> } }`],
  ] as const) {
    const { answer } = answerSparql(s, dataset, text);
    assert.equal(answer.kind, "refused", `${label}: answered instead of refusing`);
    if (answer.kind !== "refused") continue;
    assert.equal(answer.refusal.cause, "missing-model-type", label);
  }

  // The negative control, and it is the one that matters most: a system that DOES declare a model
  // answers. A rung that refused every SPARQL question would pass every assertion above.
  const live = docable();
  const liveP = relationTypeIri(live.systemId, "may_invoke").value;
  const { answer } = answerSparql(live, project(live),
    `SELECT ?x WHERE { GRAPH ?g { <${entityIri(live.systemId, "api").value}> <${liveP}> ?x } }`);
  assert.equal(answer.kind, "select-result");
  if (answer.kind !== "select-result") return;
  assert.ok(answer.rows.length > 0, "the control answered nothing, so it controls nothing");
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

test("the causes are distinguishable as data, with no string matching", () => {
  const s = docable();

  const declined = admit(s, relational("owns", "composing"));
  const outside = admit(s, relational("may_invoke", "composing",
    { subset: { kind: "outside-subset", construct: "SERVICE" } }));
  const behavioral = admit(s, { kind: "behavioral", asked: "can the document reach published?" });

  // The vocabulary rungs are two causes and not one, and the whole of DEFECT-3 is that a caller must
  // be able to tell them apart without reading English: `unknown-vocabulary` sends a reader to a
  // spell-check and `missing-distinction` sends them to a modelling decision.
  assert.equal(seamRefusalFor(s, relational("ghost", "direct")).cause, "unknown-vocabulary");
  assert.equal(seamRefusalFor(s, relational("call_frequency", "direct")).cause, "missing-distinction");

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
    // The omission rung, at all three of its subjects. Its remedy is a decision rather than a
    // declaration, so it is the one most likely to land as a placeholder.
    relational("call_frequency", "direct"),
    relational("may_invoke", "direct", { scope: { kind: "model", model: "queue_depth" } }),
    { kind: "containment", entity: "queue_depth", scope: UNION, subset: WITHIN },
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
