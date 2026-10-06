// The derived facade — MQ-I8's machine half, and the `elements` operation it is built on.
//
// `DESIGN-model-query-261002.md` §2.3 and §2.4; §G1 ruled (a) on 261004. The facade gives the model
// query interface a noun vocabulary — `elements`, `count`, `related`, `reachable`, `path`,
// `violations` — instead of asking an agent to think in serialized query-document syntax, with
// `count` added by `DESIGN-v02-quantification-261004.md` Phase 1 and pinned in
// `test/element-count.test.ts`. Everything below exists
// to hold the one property that makes it a FACADE rather than a second interface:
//
//   MQ-I8 — every facade operation maps onto a declaration the kernel already carries, so the facade
//   cannot offer what the kernel refuses.
//
// Three checks, because one of them cannot see the others' holes:
//
//   STATIC — every row of `MODEL_FACADE` resolves against the model-type registry: a `query-form`
//     derivation names a member of that type's own `forms`, a `query-subject` derivation names a
//     `{noun, selector}` pair in its own `subjects`, and the one `validation-authority` row names the
//     implementation `VALIDATION_AUTHORITY` declares. A facade method cannot DECLARE a form the
//     kernel does not have.
//
//   TOTAL, BOTH WAYS — the table covers every callable `window.mage.model` presents and names none
//     the facade does not implement, and its sites are exactly the `window.mage.model.*` machine
//     affordances the capability registry declares. The drained-list direction is the one that found
//     three dead allowances in the hatch's own closure check (§15(4)), so it is asserted rather than
//     assumed here too.
//
//   DYNAMIC — the document each constructor emits is admitted by the published `parseQuery`, carries
//     the form its row declared, and gets from the engine the SAME verdict the hand-written document
//     gets. Including the refusals: a relation declaring `composition.path: forbidden` refuses
//     `reachable` and `path` here exactly as it refuses a typed document, object-equal.
//
// Each predicate is applied to a sabotaged input in the negative control at the foot of this file,
// because a derivation check that passes whatever it is handed is decoration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AGENT_API_VERSION, MODEL_FACADE, createAgentApi, facadeSite,
  pathQuery, reachableQuery, relatedQuery,
} from "../src/app/agent-api.ts";
import type { FacadeOperation, MageAgentApi } from "../src/app/agent-api.ts";
import { CAPABILITIES } from "../src/app/capabilities.ts";
import { Workspace } from "../src/app/services.ts";
import { ExampleCatalog } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { MODEL_TYPES } from "../src/engine/model-types.ts";
import type { ModelType } from "../src/engine/model-types.ts";
import { parseQuery } from "../src/engine/types.ts";
import { selectElements } from "../src/engine/elements.ts";
import { runQuery } from "../src/engine/index.ts";
import { canonicalize } from "../src/ir/canonicalize.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { VALIDATION_AUTHORITY } from "../src/validator/result.ts";
import { realPorts, exampleText } from "../scripts/gen-example-coverage.ts";
import { parse } from "yaml";

const assets: AssetReader = (path: string) => Promise.resolve(readFileSync(path.replace(/^\.\//, ""), "utf8"));

/** A loaded shipped example and its agent API, through the ONE seam a person and an agent share. */
function loaded(id: string): { readonly ws: Workspace; readonly api: MageAgentApi } {
  const ws = new Workspace(realPorts);
  const out = ws.load(exampleText(id));
  assert.ok(out.ok, `${id} must load: ${out.findings.map((f) => f.message).join("; ")}`);
  return { ws, api: createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets)) };
}

/** The flagship shipped example: three structural models, both licensing readings, typed entities. */
const FLAGSHIP = "message-bus";

const docable = (): CanonicalSystem =>
  canonicalize(parse(readFileSync("examples/docable.mage.yaml", "utf8")) as Record<string, unknown>);

/** Build a system from a plain object, through the real canonicalizer rather than a hand-built IR. */
const build = (doc: Record<string, unknown>): CanonicalSystem =>
  canonicalize({ mage: 1, system: { id: "t" }, ...doc });

/** docable's relation types, by the licensing that matters here. Looked up, never spelled. */
const relationWith = (system: CanonicalSystem, composition: "allowed" | "forbidden"): string => {
  const found = [...system.relationTypes.values()]
    .find((r) => r.pathComposition === composition
      && system.relations.some((e) => e.type === r.id));
  assert.ok(found !== undefined, `the fixture declares no '${composition}' relation type carrying an edge`);
  return found.id;
};

const edgeOf = (system: CanonicalSystem, relation: string): { readonly from: string; readonly to: string } => {
  const edge = system.relations.find((r) => r.type === relation);
  assert.ok(edge !== undefined, `the fixture declares no '${relation}' edge`);
  return { from: edge.from, to: edge.to };
};

// ----------------------------------------------------------------------------------------------
// The derivation audit: a pure function, so the negative control can drive it with the defects
// ----------------------------------------------------------------------------------------------

/**
 * Resolve every facade derivation against the kernel's own declarations.
 *
 * Returns findings rather than throwing, so one call reports the whole picture and the negative
 * control can hand it a sabotaged table and read what it says.
 */
function auditDerivations(
  facade: readonly FacadeOperation[],
  registry: readonly ModelType[] = MODEL_TYPES,
  authority: string = VALIDATION_AUTHORITY.implementation,
): readonly string[] {
  const issues: string[] = [];
  if (facade.length === 0) {
    issues.push("the facade declares no operations, so this audit has no subject — an empty table "
      + "must never read as a derived facade.");
    return issues;
  }
  const byId = new Map(registry.map((t) => [t.id, t]));
  for (const op of facade) {
    if (op.derivesFrom.length === 0) {
      issues.push(`\`${op.operation}\` declares no derivation. An operation that derives from `
        + "nothing is a capability the facade added, which is the one thing MQ-I8 forbids it to do.");
      continue;
    }
    for (const d of op.derivesFrom) {
      if (d.from === "validation-authority") {
        if (d.implementation !== authority) {
          issues.push(`\`${op.operation}\` derives from validation authority '${d.implementation}', `
            + `and the one declared authority is '${authority}'. A second authority is the third `
            + "party the authority declaration exists to forbid.");
        }
        continue;
      }
      const type = byId.get(d.modelType);
      if (type === undefined) {
        issues.push(`\`${op.operation}\` names model type '${d.modelType}', which the registry does `
          + "not declare.");
        continue;
      }
      if (d.from === "query-form") {
        if (!type.query.forms.includes(d.form)) {
          issues.push(`\`${op.operation}\` derives from form '${d.form}', which '${type.id}' does `
            + `not declare. Its forms are: ${type.query.forms.join(", ")}. A facade method naming a `
            + "form the kernel does not have is a capability change wearing a facade.");
        }
        continue;
      }
      const subject = type.query.subjects
        .find((s) => s.noun === d.noun && s.selector === d.selector);
      if (subject === undefined) {
        issues.push(`\`${op.operation}\` derives from the '${d.noun}' subject selected by `
          + `'${d.selector}', and '${type.id}' declares no such pair. Its subjects are: `
          + `${type.query.subjects.map((s) => `${s.noun}/${s.selector}`).join(", ")}.`);
      }
    }
  }
  return [...new Set(issues)];
}

// ----------------------------------------------------------------------------------------------
// MQ-I8 — static: every derivation resolves against the registry
// ----------------------------------------------------------------------------------------------

test("MQ-I8: every facade derivation resolves against the model-type registry", () => {
  assert.ok(MODEL_TYPES.length > 0, "an empty registry would make every resolution below vacuous");
  const issues = auditDerivations(MODEL_FACADE);
  assert.deepEqual(issues, [], `facade derivations:\n  ${issues.join("\n  ")}\n`);
});

test("MQ-I8: the facade table is TOTAL over the callables the namespace presents, both ways", () => {
  const { api } = loaded(FLAGSHIP);
  const callables = Object.keys(api.model)
    .filter((k) => typeof (api.model as unknown as Record<string, unknown>)[k] === "function")
    .sort();
  assert.ok(callables.length > 0, "`window.mage.model` presents no callable, so the walk is wrong");
  const declared = MODEL_FACADE.map((o) => o.operation).sort();
  // Both directions in one assertion: a method with no row would be an undeclared derivation, and a
  // row with no method is an allowance for nothing — the shape §15(4) found three of.
  assert.deepEqual(declared, callables,
    "`MODEL_FACADE` and the live `window.mage.model` namespace disagree about which operations exist");

  // The operation set, named, because §G5 holds the composition line: a new operation is a
  // deliberate edit to this assertion rather than a method that quietly appeared. `count` is the
  // one such edit so far — `DESIGN-v02-quantification-261004.md` Phase 1, authorized as the
  // cardinality of the enumeration `elements` already performs. It clears §G5 because it pipes
  // nothing: `countElements` re-derives the selection rather than consuming `elements`' result, so
  // no intermediate answer crosses between two operations.
  // `explainType` is the second such edit — SEMANTICS §3.3's establishment record, specified by
  // the shadow-types design (§5.3) at the author's D7 ruling. It clears §G5's line the way
  // `count` does: it pipes nothing — one read of the entity table and the relation-type
  // declarations, no intermediate answer crossing between operations — and its verdict vocabulary
  // is the validation authority's own, so no second opinion enters the interface.
  assert.deepEqual(callables,
    ["count", "elements", "explainType", "path", "reachable", "related", "violations"],
    "the facade's operation set changed; §4.1's line and §G5's hold make that an author's decision");
});

test("MQ-I8: every facade site is a declared machine affordance, and every such affordance is in the table", () => {
  const sites = new Set(MODEL_FACADE.map((o) => facadeSite(o.operation)));
  const registered = CAPABILITIES
    .flatMap((c) => c.machine.map((a) => ({ capability: c.id, at: a.at, status: a.status })))
    .filter((a) => a.at.startsWith("window.mage.model."));
  assert.equal(registered.length, sites.size,
    `the registry declares ${registered.length} facade affordance(s) and the table has ${sites.size}`);
  for (const a of registered) {
    assert.ok(sites.has(a.at), `the registry declares '${a.at}', which the facade table does not name`);
    assert.equal(a.status, "wired", `${a.at} is registered ${a.status}; a facade method is wired or absent`);
  }
  // The row each one landed on, asserted rather than left to a reader: `elements` reaches
  // `workspace.state` and the other four reach the seams their rows name, which is what UX-I1
  // compares. §7.1's table put `elements` on `query`, and that would have made `workspace.query` a
  // service only some of the row's affordances reach.
  const rowOf = (at: string): string =>
    registered.find((a) => a.at === at)?.capability ?? "(unregistered)";
  assert.equal(rowOf(facadeSite("elements")), "inspect");
  // `explainType` joins the same row: it reads `workspace.state` — the entity table plus the
  // relation-type declarations — and runs no validate pass. Its DERIVATION names the validation
  // authority (the verdict vocabulary is V48's); the registry names the seam. Different questions.
  assert.equal(rowOf(facadeSite("explainType")), "inspect");
  // `count` joins `elements` on the `inspect` row rather than earning one of its own: it reaches
  // the same `workspace.state` read, and a second row has to report a capability the product
  // GAINED, which reading `ids.length` was never blocked on.
  assert.equal(rowOf(facadeSite("count")), "inspect");
  assert.equal(rowOf(facadeSite("related")), "query");
  assert.equal(rowOf(facadeSite("reachable")), "query");
  assert.equal(rowOf(facadeSite("path")), "query");
  assert.equal(rowOf(facadeSite("violations")), "validate");
});

// ----------------------------------------------------------------------------------------------
// MQ-I8 — dynamic: the document the facade emits is the document the kernel admits
// ----------------------------------------------------------------------------------------------

test("MQ-I8: each constructor emits a document the published parser admits, carrying its declared form", () => {
  const system = docable();
  const relation = relationWith(system, "allowed");
  const { from, to } = edgeOf(system, relation);

  const declaredForms = (operation: string): readonly string[] =>
    MODEL_FACADE.find((o) => o.operation === operation)?.derivesFrom
      .flatMap((d) => (d.from === "query-form" ? [d.form] : [])) ?? [];

  const emitted = [
    { operation: "related", document: relatedQuery(from, relation, "outgoing") },
    { operation: "related", document: relatedQuery(to, relation, "incoming") },
    { operation: "reachable", document: reachableQuery(from, relation, to) },
    { operation: "reachable", document: reachableQuery(from, relation, null) },
    { operation: "path", document: pathQuery(from, to, relation) },
  ];
  for (const { operation, document } of emitted) {
    const parsed = parseQuery(document);
    assert.ok(parsed.ok, `${operation} emitted a document the parser rejects: ${JSON.stringify(document)}`);
    if (!parsed.ok) continue;
    assert.equal(parsed.value.kind, "graph");
    if (parsed.value.kind !== "graph") continue;
    // The form the PARSER read, against the form the TABLE declared. Comparing the constructor's own
    // literal would be comparing the facade with itself.
    assert.ok(declaredForms(operation).includes(parsed.value.graph.form),
      `${operation} emitted form '${parsed.value.graph.form}', which its derivation row does not declare`);
    assert.equal(parsed.value.graph.relation, relation);
  }
  // `related`'s two directions must be DIFFERENT forms, or the direction parameter is decoration.
  const out = parseQuery(relatedQuery(from, relation, "outgoing"));
  const into = parseQuery(relatedQuery(from, relation, "incoming"));
  assert.ok(out.ok && into.ok && out.value.kind === "graph" && into.value.kind === "graph");
  if (out.ok && into.ok && out.value.kind === "graph" && into.value.kind === "graph") {
    assert.notEqual(out.value.graph.form, into.value.graph.form,
      "both traversal directions emitted one form, so `direction` changes nothing");
  }
});

test("MQ-I8: the facade's answer IS the typed document's answer, object-equal", () => {
  const { ws, api } = loaded(FLAGSHIP);
  const system = ws.state.system;
  const relation = relationWith(system, "allowed");
  const { from, to } = edgeOf(system, relation);

  // Three operations, each against the hand-written document it is a spelling of. Object equality
  // rather than a matching outcome: a second implementation that agreed on `holds` could still
  // differ on coverage, on `interpretedAs`, or on which witness it found.
  assert.deepEqual(api.model.related(from, relation, "outgoing"),
    api.query(relatedQuery(from, relation, "outgoing")));
  assert.deepEqual(api.model.reachable(from, relation, to),
    api.query(reachableQuery(from, relation, to)));
  assert.deepEqual(api.model.path(from, to, relation), api.query(pathQuery(from, to, relation)));
  assert.deepEqual(api.model.violations(), api.validate());

  // And the answers are real, not two matching refusals: an edge the model asserts holds, and the
  // traversal names the neighbour it found.
  const step = api.model.related(from, relation, "outgoing");
  assert.equal(step.outcome, "holds", `a declared ${relation} edge from ${from} answered ${step.outcome}`);
  assert.ok(step.evidence?.nodes?.includes(to),
    `the traversal's witness does not name ${to}: ${JSON.stringify(step.evidence)}`);
  assert.equal(step.systemHash, ws.state.hash, "the facade's answer does not name the revision it describes");
});

test("MQ-I8: the facade cannot ask what the kernel refuses — V7 refuses both spellings identically", () => {
  const { ws, api } = loaded(FLAGSHIP);
  const system = ws.state.system;
  const forbidden = relationWith(system, "forbidden");
  const { from, to } = edgeOf(system, forbidden);

  for (const composing of [
    { name: "reachable", facade: api.model.reachable(from, forbidden, to), document: reachableQuery(from, forbidden, to) },
    { name: "path", facade: api.model.path(from, to, forbidden), document: pathQuery(from, to, forbidden) },
  ]) {
    assert.equal(composing.facade.outcome, "unlicensed",
      `${composing.name} over a '${forbidden}' relation answered ${composing.facade.outcome}; V7 refuses it`);
    assert.deepEqual(composing.facade, api.query(composing.document),
      `${composing.name}'s refusal differs from the typed document's refusal for one question`);
    // `check` sees the same thing, from the engine's own admission rather than from the evaluator.
    const report = api.check(composing.document);
    assert.equal(report.outcome, "refused");
    if (report.outcome !== "refused") continue;
    assert.equal(report.refusal.reason, "composition-forbidden");
    assert.ok(report.alternatives.length > 0,
      "the refusal offers no alternatives, which is the half that lets a caller revise");
  }

  // The non-composing spelling of the SAME relation stays answerable, so the refusal above is V7
  // biting rather than the fixture having no such edge.
  assert.equal(api.model.related(from, forbidden, "outgoing").outcome, "holds",
    "one step along a path-forbidden relation is licensed; only composition is not");
});

// ----------------------------------------------------------------------------------------------
// `elements` — the one new operation (§2.4)
// ----------------------------------------------------------------------------------------------

test("elements lists what the system declares, sorted, against the revision it names", () => {
  const { ws, api } = loaded(FLAGSHIP);
  const all = api.model.elements();
  assert.ok(all.selected, `an enumeration over a system with models was refused: ${JSON.stringify(all)}`);
  if (!all.selected) return;
  assert.deepEqual(all.ids, [...ws.state.system.entities.keys()].sort(),
    "the enumeration is not the entity table, sorted");
  assert.equal(all.hash, ws.state.hash, "elements names a revision the workspace is not on");
  assert.match(all.interpretedAs, /Which entities does this system declare\?/);
  assert.ok(all.declaredTypes.length > 0, "docable types its entities; declaredTypes reports none");
});

test("elements filters by declared type and by the property-constraint grammar", () => {
  const { ws, api } = loaded(FLAGSHIP);
  const system = ws.state.system;
  // The type and the property are LOOKED UP, so the test is about the grammar rather than about
  // which words docable happens to use.
  const type = [...system.entities.values()].find((e) => e.type !== null)?.type;
  assert.ok(type !== undefined && type !== null);
  const byType = api.model.elements({ type });
  assert.ok(byType.selected);
  if (!byType.selected) return;
  assert.deepEqual(byType.ids,
    [...system.entities.values()].filter((e) => e.type === type).map((e) => e.id).sort());
  assert.ok(byType.ids.length > 0 && byType.ids.length < system.entities.size,
    "the type filter selected everything or nothing, so it has not been shown to filter");
  assert.match(byType.interpretedAs, new RegExp(`entities of type '${type}'`));

  const entity = [...system.entities.values()].find((e) => e.properties.size > 0);
  assert.ok(entity !== undefined);
  const [property, value] = [...entity.properties.entries()][0] ?? [];
  assert.ok(property !== undefined && value !== undefined);
  const matching = (predicate: (v: unknown) => boolean): readonly string[] =>
    [...system.entities.values()]
      .filter((e) => { const v = e.properties.get(property)?.value; return v !== undefined && predicate(v); })
      .map((e) => e.id).sort();

  for (const probe of [
    { where: { [property]: value.value }, expected: matching((v) => v === value.value) },
    { where: { [property]: { ne: value.value } }, expected: matching((v) => v !== value.value) },
    { where: { [property]: { in: [value.value] } }, expected: matching((v) => v === value.value) },
  ]) {
    const got = api.model.elements({ where: probe.where });
    assert.ok(got.selected, `a readable selector was refused: ${JSON.stringify(probe.where)}`);
    if (!got.selected) continue;
    assert.deepEqual(got.ids, probe.expected, `the ${JSON.stringify(probe.where)} selector mismatched`);
  }
  // An entity that does not DECLARE the property fails `ne` as well as `eq`: absence is not
  // inequality, and the other reading would report entities as satisfying a constraint over a
  // property they say nothing about.
  const undeclared = api.model.elements({ where: { "no-entity-declares-this": { ne: 1 } } });
  assert.ok(undeclared.selected);
  if (undeclared.selected) assert.deepEqual(undeclared.ids, []);
});

test("elements and a graph question's `where` clause agree about one constraint", () => {
  // The DRY join. `satisfiesConstraints` moved out of `graph.ts` so that an enumeration and a
  // traversal's endpoint narrowing read one matcher; this is what makes that a checked claim rather
  // than a code-review observation. A copied matcher would pass every test above.
  const system = docable();
  const relation = relationWith(system, "allowed");
  const property = [...system.entities.values()]
    .flatMap((e) => [...e.properties.keys()])
    .find((p) => p !== undefined);
  assert.ok(property !== undefined);
  const value = [...system.entities.values()]
    .map((e) => e.properties.get(property)?.value).find((v) => v !== undefined);
  assert.ok(value !== undefined);

  const selected = selectElements(system, { where: { [property]: value } });
  assert.ok(selected.selected);
  if (!selected.selected) return;
  assert.ok(selected.ids.length > 0, "the shared-matcher probe selected nothing, so it proves nothing");

  // The same constraint as a graph question's SOURCE clause. A `direct` question whose sources are
  // narrowed to entities the enumeration excluded must not find an edge out of one of them.
  const answer = runQuery(system, {
    kind: "graph", quantifier: "exists",
    graph: { form: "direct", relation, where: { source: { [property]: value } } },
  });
  const witnessed = answer.result.evidence?.nodes?.[0];
  if (witnessed !== undefined) {
    assert.ok(selected.ids.includes(witnessed),
      `the traversal narrowed to a source ('${witnessed}') the enumeration of the same constraint excluded`);
  }
});

test("elements refuses an unreadable selector rather than answering with the whole table", () => {
  const system = docable();
  for (const unreadable of [[1, 2, 3], "service", { where: "classification" }, { where: [1] }]) {
    const got = selectElements(system, unreadable);
    assert.equal(got.selected, false, `'${JSON.stringify(unreadable)}' was read as a selector`);
    if (got.selected) continue;
    assert.equal(got.refusal.reason, "unsupported-expression");
    assert.match(got.refusal.prose, /not an empty one/);
    assert.ok(got.declaredTypes.length > 0,
      "a refusal still reports what the system declares, so the diagnosis costs no second call");
  }
  // And an ABSENT selector is not an unreadable one: no argument means no constraint.
  for (const absent of [undefined, null, {}, { where: {} }]) {
    assert.equal(selectElements(system, absent).selected, true,
      `'${JSON.stringify(absent)}' must read as an unconstrained selector`);
  }
});

test("elements consults the registry's substrate rung, with the registry's own sentence", () => {
  // §2.4 licenses `elements` by the structural-graph type's presence rung. The empty system is the
  // case that matters: an empty list there is indistinguishable from a model whose entities failed
  // to match, where the refusal names the absent type AND the authoring move.
  const empty = build({});
  const refused = selectElements(empty, undefined);
  assert.equal(refused.selected, false, "a system declaring no structural model must not enumerate");
  if (refused.selected) return;
  assert.equal(refused.refusal.reason, "missing-model-type");
  const structural = MODEL_TYPES.find((t) => t.id === "structural-graph");
  assert.ok(structural);
  // The sentence comes from the registry, not from this operation: a second wording would be a
  // second description of one capability.
  assert.match(refused.refusal.prose, new RegExp(`declares no ${structural.label}`));
  assert.ok(refused.refusal.prose.includes(structural.wouldLicense),
    "the refusal does not carry the authoring move the registry declares");

  // THE RECORDED RESIDUE, pinned so that changing it is a decision rather than a drift. The IR
  // declares entities at system level and `presentIn` reads `models`, so a system holding entities
  // and no purposeful model refuses an enumeration of entities `inspect()` will list. §2.4's two
  // sentences pull opposite ways here — "reads the IR directly" against "licensed by the
  // structural-graph presence rung" — and the author owns which one wins
  // (`DESIGN-shell-261002.md` §9s).
  const entitiesOnly = build({ entities: { lone: { type: "service", label: "Lone" } } });
  assert.equal(entitiesOnly.entities.size, 1, "the fixture must declare the entity it is about");
  assert.equal(entitiesOnly.models.size, 0, "the fixture must declare no model");
  const residue = selectElements(entitiesOnly, undefined);
  assert.equal(residue.selected, false,
    "RESIDUE: entities declared with no model currently refuse. If this flipped, it was a decision — "
    + "record it; if it flipped by accident, this is the gate that said so.");

  // A system WITH a model still enumerates, so the rung has not swallowed the operation.
  assert.equal(selectElements(docable(), undefined).selected, true);
});

// ----------------------------------------------------------------------------------------------
// §G2's ratification, read from the surface that carries it
// ----------------------------------------------------------------------------------------------

test("the agent API version is the one the ratified rename declares", () => {
  // Read from the declaration rather than spelled: the version and the site are one record, and a
  // literal here would put this test inside the record's revert surface.
  const { api } = loaded(FLAGSHIP);
  assert.equal(api.version, AGENT_API_VERSION);
  assert.equal(api.describe().version, AGENT_API_VERSION);
});

// ----------------------------------------------------------------------------------------------
// The negative control
// ----------------------------------------------------------------------------------------------

test("the derivation audit fires on each defect it exists to catch", () => {
  const structural = { modelType: "structural-graph" } as const;

  // A form the kernel does not declare — the capability-change-wearing-a-facade case.
  const invented = auditDerivations([
    { operation: "related", derivesFrom: [{ from: "query-form", ...structural, form: "join" }] },
  ]);
  assert.equal(invented.length, 1, `one finding expected: ${invented.join("; ")}`);
  assert.match(invented[0] ?? "", /'join', which 'structural-graph' does not declare/);

  // A subject pair the type does not declare. The noun is real and the SELECTOR is not, which is the
  // half a membership check over nouns alone would miss.
  const wrongSelector = auditDerivations([
    { operation: "elements",
      derivesFrom: [{ from: "query-subject", ...structural, noun: "entity", selector: "predicate" }] },
  ]);
  assert.ok(wrongSelector.some((m) => /declares no such pair/.test(m)),
    `a mismatched selector must be reported: ${wrongSelector.join("; ")}`);

  // A second validation authority.
  const secondAuthority = auditDerivations([
    { operation: "violations",
      derivesFrom: [{ from: "validation-authority", implementation: "validate.py" }] },
  ]);
  assert.ok(secondAuthority.some((m) => /third party/.test(m)),
    `a second authority must be reported: ${secondAuthority.join("; ")}`);

  // An operation deriving from nothing, which is how a real capability would enter through the
  // facade: no declaration to resolve, so every check above would have nothing to say.
  const undeclared = auditDerivations([{ operation: "path", derivesFrom: [] }]);
  assert.ok(undeclared.some((m) => /derives from nothing/.test(m)),
    `an underived operation must be reported: ${undeclared.join("; ")}`);

  // A model type the registry does not carry.
  const noType = auditDerivations([
    { operation: "reachable",
      // eslint-disable-next-line  — a deliberate cast: the point is a value the union forbids.
      derivesFrom: [{ from: "query-form", modelType: "allocation-model" as never, form: "path" }] },
  ]);
  assert.ok(noType.some((m) => /the registry does not declare/.test(m)),
    `an unregistered model type must be reported: ${noType.join("; ")}`);

  // An empty table is a finding, never a derived facade — the empty-denominator hazard one layer in.
  const empty = auditDerivations([]);
  assert.equal(empty.length, 1);
  assert.match(empty[0] ?? "", /no operations/);

  // And the real table passes, or every assertion here is about a broken baseline.
  assert.deepEqual(auditDerivations(MODEL_FACADE), []);
});
