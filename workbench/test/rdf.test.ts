// RDF projection: the IRI scheme is injective, the projection is total and deterministic, the
// named graphs hold the model-relative facts, and nothing invites a reasoner in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { DIMENSIONS } from "../src/ir/types.ts";
import type { Quad } from "../src/rdf/terms.ts";
import {
  MAGE, MAGE_CLASSES, RDF_TYPE, RESOURCE_KINDS, URN_PREFIX, VOCABULARY_TAG, XSD,
  derivedIri, dimensionIri, domainIri, domainValueIri, effectIri, entityIri, eventIri, guardIri,
  instanceIri, iri, machineIri, modelGraphIri, modelIri, project, projectedGraphs, propertyIri,
  quantityIri, queryIri, relationTypeIri, serializeQuad, stateIri, str, systemIri, toNQuads,
  transitionIri, variableIri,
} from "../src/rdf/index.ts";

const load = (p: string) => canonicalize(parse(readFileSync(p, "utf8")));
const docable = () => load("examples/docable.mage.yaml");
const nquads = (p: string) => toNQuads(project(load(p)));

const SYSTEM_FILES = [
  "examples/docable.mage.yaml",
  "models/workbench-components.mage.yaml",
  "models/workbench-affordances.mage.yaml",
];

/** Terms that would hand a reasoner licence to add facts MAGE never asserted. */
const FORBIDDEN = ["rdf-schema", "2002/07/owl", "rdfs:", "owl:", "subClassOf", "inverseOf", "TransitiveProperty"];

/** The only IRIs the projection may emit from outside MAGE's own space. */
const ALLOWED_FOREIGN = new Set<string>([RDF_TYPE.value, XSD.string, XSD.integer, XSD.boolean, XSD.double]);

/** Every IRI mentioned anywhere in a quad, including the graph name and the literal datatypes. */
function allIris(quads: readonly Quad[]): Set<string> {
  const out = new Set<string>();
  for (const q of quads) {
    out.add(q.subject.value);
    out.add(q.predicate.value);
    out.add(q.object.kind === "iri" ? q.object.value : q.object.datatype);
    if (q.graph !== null) out.add(q.graph.value);
  }
  return out;
}

/**
 * The object literal of a one-quad serialization, decoded by `JSON.parse`.
 *
 * JSON is the oracle on purpose: every escape the serializer emits (backslash, quote, \n, \r, \t,
 * \b, \f, \uXXXX) is also a JSON escape, so JSON's decoder is an independent check on ours. A
 * round-trip through our own parser would prove only that two bugs agree.
 */
function decodeLiteral(line: string): string {
  const open = line.indexOf("\"");
  assert.notEqual(open, -1, `no literal found in: ${line}`);
  let i = open + 1;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "\"") break;
    i += 1;
  }
  return JSON.parse(line.slice(open, i + 1)) as string;
}

/** One quad carrying `text` as a plain literal, serialized. */
const literalLine = (text: string): string =>
  serializeQuad({ subject: entityIri("t", "e"), predicate: MAGE.label, object: str(text), graph: null });

const roundTrips = (text: string): void => {
  const line = literalLine(text);
  assert.equal(decodeLiteral(line), text);
  // The format is line-oriented, so a quad that spans two lines is unparseable regardless of
  // whether its escaping decodes.
  assert.equal(line.split("\n").length, 1, `quad broke across lines: ${JSON.stringify(line)}`);
};

// ------------------------------------------------------------------------------------------------
// Totality and determinism
// ------------------------------------------------------------------------------------------------

test("every model in the repo projects without throwing, and the quad count is reported", (t) => {
  for (const file of SYSTEM_FILES) {
    const dataset = project(load(file));
    assert.ok(dataset.length > 0, `${file} projected to nothing`);
    t.diagnostic(`${file}: ${dataset.length} quads, ${projectedGraphs(dataset).length} named graphs`);
  }
  // Pinned so a projection change has to be deliberate rather than noticed later by a count drift.
  assert.equal(project(docable()).length, 261);
});

test("canonicalize's garbage inputs project too -- the projection is total, like canonicalize", () => {
  for (const junk of [null, undefined, 42, "text", [], { mage: 1 }, { machines: { m: 7 } }]) {
    assert.doesNotThrow(() => toNQuads(project(canonicalize(junk))));
  }
});

test("the same system projects to byte-identical N-Quads twice", () => {
  // Determinism is the precondition for every downstream pin. Map iteration order, a Set, or an
  // unsorted serialization would each break it silently and only sometimes.
  const s = docable();
  assert.equal(toNQuads(project(s)), toNQuads(project(s)));
  assert.equal(nquads("examples/docable.mage.yaml"), toNQuads(project(docable())));
});

test("authoring order does not reach the projection", () => {
  // The same argument as the hash's: a reordered mapping is the same system, so a reformat must not
  // produce a different dataset for an agent to diff against.
  const raw = parse(readFileSync("examples/docable.mage.yaml", "utf8")) as Record<string, unknown>;
  const flipped = Object.fromEntries(Object.entries(raw).reverse());
  assert.equal(toNQuads(project(canonicalize(flipped))), nquads("examples/docable.mage.yaml"));
});

test("annotation does not reach the projection", () => {
  // Invariant A1: a note must not alter interpretation or analysis. The hash holds that by
  // excluding annotation; the projection has to hold it the same way, or a SPARQL result could
  // depend on a comment.
  const raw = parse(readFileSync("examples/docable.mage.yaml", "utf8")) as Record<string, unknown>;
  const entities = raw["entities"] as Record<string, Record<string, unknown>>;
  const api = entities["api"] as Record<string, unknown>;
  api["notes"] = [{ kind: "assumption", text: "the gateway is public-only" }];
  api["provenance"] = { created_by: "agent", prompt: "add the API" };
  assert.equal(toNQuads(project(canonicalize(raw))), nquads("examples/docable.mage.yaml"));
});

test("the empty system projects to the system resource and nothing else", () => {
  // A projection that invented a quad for an absent model would make every count unreadable.
  const lines = toNQuads(project(canonicalize(null))).trimEnd().split("\n");
  assert.equal(lines.length, 3);
  for (const line of lines) assert.ok(line.startsWith("<urn:mage:sys:unnamed> "), line);
});

// ------------------------------------------------------------------------------------------------
// The IRI scheme
// ------------------------------------------------------------------------------------------------

test("one id reused across every kind yields distinct IRIs", () => {
  // The collision this catches merges two objects in every downstream query and reports nothing:
  // an entity named `idle` and a state named `idle` would become one resource.
  const minted = [
    systemIri("idle"), entityIri("s", "idle"), propertyIri("s", "idle"), relationTypeIri("s", "idle"),
    domainIri("s", "idle"), domainValueIri("s", "d", "idle"), modelIri("s", "idle"),
    modelGraphIri("s", "idle"), machineIri("s", "idle"), instanceIri("s", "idle"),
    stateIri("s", "m", "idle"), variableIri("s", "m", "idle"), derivedIri("s", "m", "idle"),
    transitionIri("s", "m", 0), guardIri("s", "m", 0, 0), effectIri("s", "m", 0, 0),
    eventIri("s", "idle"), queryIri("s", "idle"), quantityIri("s", "idle"), dimensionIri("idle"),
  ].map((t) => t.value);

  assert.equal(new Set(minted).size, minted.length, `collision among:\n  ${minted.join("\n  ")}`);
  // Every kind must be exercised, or the test passes by not minting the colliding pair.
  assert.equal(minted.length, RESOURCE_KINDS.length);
});

test("the vocabulary tag is not a resource kind", () => {
  // If a model could be named so that its IRI landed in the vocabulary space, an author could
  // redefine `mage:label`.
  assert.ok(!(RESOURCE_KINDS as readonly string[]).includes(VOCABULARY_TAG));
  assert.ok(MAGE.id.value.startsWith(`${URN_PREFIX}${VOCABULARY_TAG}:`));
  for (const kind of RESOURCE_KINDS) {
    assert.ok(!MAGE.id.value.startsWith(`${URN_PREFIX}${kind}:`));
  }
});

test("an id containing the segment separator cannot forge a different address", () => {
  // Without percent-encoding, machine `m:x` state `y` and machine `m` state `x:y` are one IRI.
  assert.notEqual(stateIri("s", "m:x", "y").value, stateIri("s", "m", "x:y").value);
  assert.ok(stateIri("s", "m:x", "y").value.includes("m%3Ax"));
  // `instances: N` ids carry brackets, which must survive as part of one segment.
  assert.ok(instanceIri("s", "w[0]").value.includes("w%5B0%5D"));
});

test("a domain value that looks like a number is not the number", () => {
  // Five defects in this project came from YAML implicit typing. A projection that let `5` and
  // `"5"` name one domain value would be the sixth, and it would merge two values of one domain.
  assert.notEqual(domainValueIri("s", "d", 5).value, domainValueIri("s", "d", "5").value);
  assert.notEqual(domainValueIri("s", "d", true).value, domainValueIri("s", "d", "true").value);
});

// ------------------------------------------------------------------------------------------------
// Named graphs and shared identity
// ------------------------------------------------------------------------------------------------

test("a model's relations land in that model's named graph, never the default", () => {
  const dataset = project(docable());
  const relationTypes = new Set([...docable().relationTypes.keys()].map((id) => relationTypeIri("docable", id).value));

  const edges = dataset.filter((q) => relationTypes.has(q.predicate.value));
  assert.equal(edges.length, 5, "docable declares five relations");
  for (const e of edges) {
    assert.notEqual(e.graph, null, `relation edge in the default graph: ${serializeQuad(e)}`);
  }
  assert.deepEqual(projectedGraphs(dataset), [
    modelGraphIri("docable", "data-classification").value,
    modelGraphIri("docable", "service-flow").value,
  ]);

  // And the complement: the default graph holds no edge of any relation type, so a default-graph
  // basic graph pattern cannot be read as "the system's edges" and silently answer with a subset.
  const defaultEdges = dataset.filter((q) => q.graph === null && relationTypes.has(q.predicate.value));
  assert.deepEqual(defaultEdges, []);
});

test("the relation-type predicates are the ONLY ones that leave the default graph", () => {
  // The converse of the rule above, and the sharper half of it: entity existence, type, properties,
  // containment, the machines, and a model's own metadata are not model-relative. If any of them
  // moved into a named graph, a cross-model join would have to union graphs to learn that an entity
  // exists at all. The check is over predicates rather than subjects because `api` is BOTH an
  // entity with default-graph properties and the subject of relation edges in two named graphs.
  const RT = `${URN_PREFIX}rt:`;
  for (const file of SYSTEM_FILES) {
    for (const q of project(load(file))) {
      const where = `${file}: ${serializeQuad(q)}`;
      if (q.predicate.value.startsWith(RT)) assert.notEqual(q.graph, null, where);
      else assert.equal(q.graph, null, where);
      // And every predicate belongs to one of the three families the vocabulary admits:
      // `rdf:type`, a MAGE term, or an author-declared relation type or property key.
      assert.ok(
        q.predicate.value === RDF_TYPE.value
        || q.predicate.value.startsWith(`${URN_PREFIX}${VOCABULARY_TAG}:`)
        || q.predicate.value.startsWith(RT)
        || q.predicate.value.startsWith(`${URN_PREFIX}prop:`),
        where,
      );
    }
  }

  // And the model-metadata case specifically, since it is the one judgement call in the rule.
  const dataset = project(docable());
  for (const subject of [machineIri("docable", "document"), eventIri("docable", "acquire"), modelIri("docable", "service-flow")]) {
    const about = dataset.filter((q) => q.subject.value === subject.value);
    assert.ok(about.length > 0, `nothing projected about ${subject.value}`);
    for (const f of about) assert.equal(f.graph, null, serializeQuad(f));
  }
});

test("an entity in two models has ONE identity, and the join across graphs finds it", () => {
  // This is the modeling principle made mechanical: different questions take different reductions,
  // and shared identity is what lets a conclusion come from the join rather than from one model.
  const dataset = project(docable());
  const remediation = entityIri("docable", "remediation").value;

  const graphsMentioning = new Set(
    dataset
      .filter((q) => q.graph !== null && (q.subject.value === remediation || (q.object.kind === "iri" && q.object.value === remediation)))
      .map((q) => q.graph?.value),
  );
  assert.deepEqual([...graphsMentioning].sort(), [
    modelGraphIri("docable", "data-classification").value,
    modelGraphIri("docable", "service-flow").value,
  ]);

  // The join the security question needs: `remediation` is classified restricted in the default
  // graph, may_invoke-reaches the gateway in one named graph, and data_flow-reaches it in another.
  // One IRI carries all three, so no mapping step stands between them.
  const classification = dataset.find((q) =>
    q.subject.value === remediation && q.predicate.value === propertyIri("docable", "classification").value);
  assert.ok(classification, "remediation has no classification property");
  assert.equal(classification.graph, null);
  assert.equal(
    classification.object.kind === "iri" ? classification.object.value : null,
    domainValueIri("docable", "sensitivity", "restricted").value,
  );
});

// ------------------------------------------------------------------------------------------------
// RDF is not OWL
// ------------------------------------------------------------------------------------------------

test("no RDFS or OWL term is ever emitted", () => {
  // MAGE fixes the meaning of its own vocabulary. A single `rdfs:subClassOf` would hand a reasoner
  // licence to add facts the model never asserted -- the same failure the engine's `unlicensed`
  // outcome refuses one layer up.
  for (const file of SYSTEM_FILES) {
    const text = nquads(file);
    for (const needle of FORBIDDEN) {
      assert.ok(!text.includes(needle), `${file} emitted ${needle}`);
    }
    const foreign = [...allIris(project(load(file)))].filter((v) => !v.startsWith(URN_PREFIX));
    for (const v of foreign) assert.ok(ALLOWED_FOREIGN.has(v), `${file} emitted a foreign IRI: ${v}`);
    assert.ok(foreign.includes(RDF_TYPE.value), `${file} emitted no rdf:type`);
  }
});

test("derived state adjacency is one hop, and declares itself non-composing", () => {
  // `canTransitionTo` restates declared structure; it says nothing about enabledness, because a
  // guard may make every such step infeasible. Multi-hop over it would be a reachability claim the
  // machine never made, so it carries the same `pathComposition: forbidden` the licensing gate
  // already reads for an author-declared relation type.
  const dataset = project(docable());
  const policy = dataset.filter((q) =>
    q.subject.value === MAGE.canTransitionTo.value && q.predicate.value === MAGE.pathComposition.value);
  assert.equal(policy.length, 1);
  assert.equal(policy[0]?.object.value, "forbidden");

  // One edge per declared transition, and each is backed by a reified transition that carries the
  // guards -- the representation that keeps identity.
  const edges = dataset.filter((q) => q.predicate.value === MAGE.canTransitionTo.value);
  assert.equal(edges.length, 7, "docable's two machines declare seven transitions over distinct state pairs");
  const guards = dataset.filter((q) => q.predicate.value === MAGE.guard.value);
  assert.equal(guards.length, 2, "the review and the retry transition each carry one guard");
});

// ------------------------------------------------------------------------------------------------
// Faithfulness of the parts that are easy to get wrong
// ------------------------------------------------------------------------------------------------

test("a property with a declared domain gets identity; one without gets a literal", () => {
  // Two domains may spell a value alike. Joining on the literal `public` would cross them and
  // answer a question about an unrelated vocabulary; the domain is baked into the value's IRI.
  const dataset = project(load("examples/docable.mage.yaml"));
  const accepts = dataset.find((q) =>
    q.subject.value === entityIri("docable", "gateway").value
    && q.predicate.value === propertyIri("docable", "accepts").value);
  assert.equal(accepts?.object.kind, "iri");
  assert.equal(accepts?.object.value, domainValueIri("docable", "sensitivity", "public").value);

  const components = project(load("models/workbench-components.mage.yaml"));
  const layer = components.find((q) =>
    q.subject.value === entityIri("mage-workbench", "model-ir").value
    && q.predicate.value === propertyIri("mage-workbench", "layer").value);
  assert.equal(layer?.object.kind, "literal");
  assert.equal(layer?.object.value, "kernel");
});

test("ordinals are emitted for an ordered enum and withheld from an unordered one", () => {
  // Declaration order is the order only where the author declared it so. An ordinal on a plain enum
  // would license `>` between two values the model never ranked.
  const ordered = project(canonicalize({
    mage: 1, system: { id: "s" },
    domains: { sensitivity: { type: "ordered-enum", values: ["public", "restricted"] } },
  }));
  assert.equal(ordered.filter((q) => q.predicate.value === MAGE.ordinal.value).length, 2);

  const unordered = project(canonicalize({
    mage: 1, system: { id: "s" },
    domains: { colour: { type: "enum", values: ["red", "green"] } },
  }));
  assert.deepEqual(unordered.filter((q) => q.predicate.value === MAGE.ordinal.value), []);
  // Membership is still projected -- the values exist, they are simply not ranked.
  assert.equal(unordered.filter((q) => q.predicate.value === MAGE.domainValue.value).length, 2);
});

test("a dangling reference mints its IRI and gets no type", () => {
  // The projection must not depend on validation, or the two drift. So a transition naming an
  // undeclared state still projects: the state appears as an untyped resource, which is exactly
  // what it is, and the validator is the one that calls it a finding.
  const dataset = project(canonicalize({
    mage: 1, system: { id: "s" },
    machines: { m: { initial: "a", states: { a: null }, transitions: [{ from: "a", to: "ghost" }] } },
  }));
  const ghost = stateIri("s", "m", "ghost").value;
  assert.deepEqual(dataset.filter((q) => q.subject.value === ghost), []);
  assert.ok(dataset.some((q) => q.object.kind === "iri" && q.object.value === ghost), "ghost is referenced");
  assert.ok(!dataset.some((q) => q.subject.value === ghost && q.predicate.value === RDF_TYPE.value),
    "an undeclared state must not be typed as a State");
  assert.ok(dataset.some((q) => q.subject.value === stateIri("s", "m", "a").value && q.predicate.value === RDF_TYPE.value),
    "a declared state must be typed");
});

// ------------------------------------------------------------------------------------------------
// Quantities: structured resources, never flattened (DESIGN-sparql-261002.md §5)
// ------------------------------------------------------------------------------------------------

/**
 * One quantity per value shape and per failure mode, with a model and a relation so the named-graph
 * assertion has something to contrast against.
 *
 * Built inline rather than added to a repo example on purpose: `docable`'s quad count is pinned, and
 * the negative control below depends on every repo model having no quantities at all.
 */
const quantified = (parseLatency: string = "250 ms") => canonicalize({
  mage: 1,
  system: { id: "s" },
  entities: { api: null, cache: null },
  "relation-types": { may_invoke: { composition: { path: "allowed" } } },
  models: {
    flow: {
      entities: ["api", "cache"],
      relations: [{ id: "api-cache", from: "api", to: "cache", type: "may_invoke" }],
    },
  },
  quantities: {
    "cache-memory": { target: "entity:cache", dimension: "memory", value: "128 KB" },
    "gateway-latency": { target: "relation:api-cache", dimension: "duration", range: ["100 ms", "500 ms"] },
    "hit-rate": { target: "entity:cache", dimension: "ratio", value: 0.8 },
    "parse-latency": { target: "transition:parse", dimension: "duration", value: parseLatency },
    "path-latency": { target: "model:flow", dimension: "duration", value: { expression: "metrics.state_count * 2 ms" } },
    "unnormalized": { target: "entity:cache", dimension: "duration", value: "250 millisec" },
    "unmeasured": { target: "entity:cache", dimension: "count" },
    "exotic": { target: "entity:cache", dimension: "furlongs", value: "7 fl" },
  },
});

/** Every object of `<subject> <predicate> ?o`, as written in the dataset. */
const objects = (dataset: readonly Quad[], subject: string, predicate: { readonly value: string }): string[] =>
  dataset
    .filter((q) => q.subject.value === subject && q.predicate.value === predicate.value)
    .map((q) => q.object.value);

const quantObjects = (dataset: readonly Quad[], id: string, predicate: { readonly value: string }): string[] =>
  objects(dataset, quantityIri("s", id).value, predicate);

test("a quantity projects as a structured resource, with its dimension beside its number", () => {
  // The failure this catches is the flattened `gateway latencyMs 250`: the number arrives with no
  // dimension, and SPARQL can then add milliseconds to megabytes -- which V30 refuses at the
  // validation layer. A projection that silently permits what validation forbids is the layering
  // mistake where each layer looks correct alone.
  const dataset = project(quantified());
  const memory = quantityIri("s", "cache-memory").value;

  assert.deepEqual(objects(dataset, memory, RDF_TYPE), [MAGE_CLASSES.Quantity.value]);
  assert.deepEqual(objects(dataset, memory, MAGE.id), ["cache-memory"]);
  assert.deepEqual(objects(dataset, memory, MAGE.dimension), [dimensionIri("memory").value]);
  assert.deepEqual(objects(dataset, memory, MAGE.target), ["entity:cache"]);
  assert.deepEqual(objects(dataset, memory, MAGE.targetKind), ["entity"]);
  // `128 KB` in base units. The lexical form is pinned too: canonical xsd:double, since a magnitude
  // is legitimately non-integral and `0.125` is not an integer the way every other number here is.
  assert.deepEqual(objects(dataset, memory, MAGE.magnitude), ["1.25E-1"]);
  assert.equal(Number("1.25E-1"), 0.125);
  // And the system declares it, so "which quantities does this system assert?" is one pattern.
  assert.ok(dataset.some((q) =>
    q.subject.value === systemIri("s").value
    && q.predicate.value === MAGE.declares.value
    && q.object.value === memory));
});

test("the dimension is a term a FILTER can see, and it carries the unit the magnitude is in", () => {
  // A dimension spelled as a string literal on each quantity would be filterable too -- but then the
  // base unit has nowhere to live, and `mage:magnitude 250` is a number whose unit a consumer has to
  // know out of band. One resource per dimension states the unit once, where it cannot disagree with
  // itself.
  const dataset = project(quantified());
  const duration = dimensionIri("duration").value;
  assert.deepEqual(objects(dataset, duration, RDF_TYPE), [MAGE_CLASSES.Dimension.value]);
  assert.deepEqual(objects(dataset, duration, MAGE.id), ["duration"]);
  assert.deepEqual(objects(dataset, duration, MAGE.baseUnit), [DIMENSIONS.duration.base]);

  // `ratio` is dimensionless, so there is no unit token to project -- and it carries V29's ceiling.
  const ratio = dimensionIri("ratio").value;
  assert.deepEqual(objects(dataset, ratio, MAGE.baseUnit), []);
  assert.deepEqual(objects(dataset, ratio, MAGE.rangeMax), [String(DIMENSIONS.ratio.maximum)]);

  // Only the dimensions a quantity actually used: `cost` is one of the five and this system never
  // names it, so projecting the whole table would put facts about MAGE in a dataset about a system.
  assert.deepEqual(objects(dataset, dimensionIri("cost").value, RDF_TYPE), []);
});

test("250 ms and 0.25 s are one quantity: base units, and the projection agrees with the hash", () => {
  // The property that keeps the dataset and the hash describing one system. Were the authored unit
  // projected instead, a unit rewrite would move the quad set while `systemHash` stood still -- and
  // a consumer diffing datasets would read a cosmetic edit as a semantic change.
  const ms = quantified("250 ms");
  const s = quantified("0.25 s");
  assert.equal(systemHash(ms), systemHash(s));
  assert.equal(toNQuads(project(ms)), toNQuads(project(s)));
  assert.deepEqual(quantObjects(project(s), "parse-latency", MAGE.magnitude), ["250"]);
});

test("a range projects as two distinct bounds", () => {
  // Collapsed to one number, `[100 ms, 500 ms]` becomes a wrong answer with no symptom: a maximum
  // analysis reading the lower bound reports a latency the model never claimed.
  const dataset = project(quantified());
  assert.deepEqual(quantObjects(dataset, "gateway-latency", MAGE.rangeMin), ["100"]);
  assert.deepEqual(quantObjects(dataset, "gateway-latency", MAGE.rangeMax), ["500"]);
  assert.deepEqual(quantObjects(dataset, "gateway-latency", MAGE.valueKind), ["range"]);
  assert.deepEqual(quantObjects(dataset, "gateway-latency", MAGE.magnitude), [], "a range is not also a point");
});

test("every quantity's aggregation scope is reachable, and it is stated in exactly one place", () => {
  // Scope is not decoration: a consumer that cannot see it could sum a hit rate along a path, which
  // is the category error the field exists to refuse. It hangs on the DIMENSION because that is
  // where the IR derives it from -- copied onto each quantity, a later bug could emit a `ratio`
  // quantity scoped `execution`, and the dataset would carry a contradiction with no symptom.
  const dataset = project(quantified());
  const scopeOf = (id: string): string[] =>
    quantObjects(dataset, id, MAGE.dimension).flatMap((d) => objects(dataset, d, MAGE.aggregationScope));

  assert.deepEqual(scopeOf("cache-memory"), [DIMENSIONS.memory.scope]);
  assert.deepEqual(scopeOf("parse-latency"), [DIMENSIONS.duration.scope]);
  assert.deepEqual(scopeOf("hit-rate"), [DIMENSIONS.ratio.scope]);
  assert.deepEqual(scopeOf("unmeasured"), [DIMENSIONS.count.scope]);

  const onQuantity = dataset.filter((q) =>
    q.predicate.value === MAGE.aggregationScope.value && q.subject.value.startsWith(`${URN_PREFIX}quant:`));
  assert.deepEqual(onQuantity, [], "the scope must have one home, not two");
});

test("a magnitude that did not reach base units projects no magnitude, and stays distinguishable", () => {
  // Section 7 of the quantities design: a quantity reaches anything downstream in base units or not
  // at all. Emitting `"250 millisec"` where a query reads a number would put a dimensionless string
  // in the one place the dimension is the whole point; V28 is what quotes the author's text back at
  // them. `valueKind` is what keeps this apart from a quantity that declared no value whatsoever.
  const dataset = project(quantified());
  assert.deepEqual(quantObjects(dataset, "unnormalized", MAGE.valueKind), ["point"]);
  assert.deepEqual(quantObjects(dataset, "unnormalized", MAGE.magnitude), []);
  assert.deepEqual(quantObjects(dataset, "unmeasured", MAGE.valueKind), ["absent"]);
  assert.deepEqual(quantObjects(dataset, "unmeasured", MAGE.magnitude), []);
  assert.ok(!toNQuads(dataset).includes("millisec"), "the authored spelling is the validator's, not the dataset's");
});

test("an unrecognized dimension mints no dimension resource", () => {
  // The projection must not depend on validation, so the quantity still projects in full -- but
  // there is no sixth dimension, and `urn:mage:dim:furlongs` would advertise one with a base unit
  // and a scope it does not have. The dataset says only that this quantity has no dimension.
  const dataset = project(quantified());
  assert.deepEqual(quantObjects(dataset, "exotic", RDF_TYPE), [MAGE_CLASSES.Quantity.value]);
  assert.deepEqual(quantObjects(dataset, "exotic", MAGE.dimension), []);
  assert.deepEqual(quantObjects(dataset, "exotic", MAGE.target), ["entity:cache"]);
  assert.ok(!toNQuads(dataset).includes("furlongs"), "the authored dimension word is not projected");
});

test("an expression is projected verbatim, and its operands are not resolved", () => {
  // Same rule as a guard's `mage:ref` and an effect's `mage:expression`: the engine owns the grammar,
  // and a second resolver in the projection is how two resolvers come to disagree.
  const dataset = project(quantified());
  assert.deepEqual(quantObjects(dataset, "path-latency", MAGE.expression), ["metrics.state_count * 2 ms"]);
  assert.deepEqual(quantObjects(dataset, "path-latency", MAGE.valueKind), ["expression"]);
  assert.deepEqual(quantObjects(dataset, "path-latency", MAGE.magnitude), []);
});

test("quantities and dimensions never leave the default graph", () => {
  // A quantity asserts something about the modeled system, not about a reduction of it, and nothing
  // in the IR attaches one to a model. In a named graph, a quantity on a relation would have to pick
  // one of the models that relation appears in, and a cross-model query would miss the others.
  const dataset = project(quantified());
  assert.deepEqual(projectedGraphs(dataset), [modelGraphIri("s", "flow").value],
    "the fixture must have a named graph, or this test proves nothing");

  const QUANTITATIVE = [`${URN_PREFIX}quant:`, `${URN_PREFIX}dim:`];
  const mentions = (q: Quad): boolean => QUANTITATIVE.some((p) =>
    q.subject.value.startsWith(p) || (q.object.kind === "iri" && q.object.value.startsWith(p)));
  const quantitative = dataset.filter(mentions);
  assert.ok(quantitative.length > 0);
  for (const q of quantitative) assert.equal(q.graph, null, serializeQuad(q));
});

test("a quantity-bearing projection is deterministic and still invites no reasoner in", () => {
  // A quantity is exactly where someone reaches for `owl:DatatypeProperty`. MAGE fixes the meaning
  // of `mage:magnitude` itself, in RDF-VOCABULARY.md, and borrows nothing to do it.
  const text = toNQuads(project(quantified()));
  assert.equal(text, toNQuads(project(quantified())));
  for (const needle of FORBIDDEN) assert.ok(!text.includes(needle), `emitted ${needle}`);
  const foreign = [...allIris(project(quantified()))].filter((v) => !v.startsWith(URN_PREFIX));
  for (const v of foreign) assert.ok(ALLOWED_FOREIGN.has(v), `emitted a foreign IRI: ${v}`);
});

test("a system with no quantities projects exactly what it projected before quantities existed", () => {
  // The negative control. An empty `quantities:` map must add nothing at all -- no dimension table,
  // no class declaration, no stray `declares` edge -- or every existing count becomes unreadable.
  const raw = parse(readFileSync("examples/docable.mage.yaml", "utf8")) as Record<string, unknown>;
  assert.equal(raw["quantities"], undefined, "docable declares none, which is what makes it the control");
  raw["quantities"] = {};
  assert.equal(toNQuads(project(canonicalize(raw))), nquads("examples/docable.mage.yaml"));

  for (const file of SYSTEM_FILES) {
    const text = nquads(file);
    assert.ok(!text.includes(`${URN_PREFIX}quant:`), file);
    assert.ok(!text.includes(`${URN_PREFIX}dim:`), file);
  }
});

// ------------------------------------------------------------------------------------------------
// N-Quads escaping
// ------------------------------------------------------------------------------------------------

test("a literal containing a double quote round-trips", () => {
  // Unescaped, the quote closes the literal early and the rest of the label becomes syntax.
  roundTrips("a label with a \" in it");
  assert.ok(literalLine("say \"hi\"").includes("\\\""));
});

test("a literal containing a backslash round-trips", () => {
  // The escape character must be escaped first, or `\"` in the data turns into an escaped quote.
  roundTrips("a path c:\\temp\\x");
  roundTrips("\\");
  roundTrips("\\\"");
});

test("a literal containing a newline round-trips and stays on one line", () => {
  // N-Quads is line-oriented: a raw newline splits one quad into two unparseable fragments.
  roundTrips("first\nsecond");
  roundTrips("crlf\r\nand a tab\there");
  assert.ok(literalLine("first\nsecond").includes("\\n"));
});

test("a non-ASCII literal round-trips, including outside the BMP", () => {
  // Emitted raw, because N-Quads is UTF-8 and escaping would only cost legibility. The astral case
  // is the one that breaks: escaping per UTF-16 code unit splits a surrogate pair into two
  // characters that decode to replacement characters.
  roundTrips("café");
  roundTrips("naïve ✓ ordered-enum");
  roundTrips(`astral ${String.fromCodePoint(0x1f600)} tail`);
  assert.ok(literalLine("café").includes("café"), "non-ASCII should not be escaped");
});

test("a control character is escaped rather than emitted", () => {
  // Built numerically: a literal control byte in this file would fail the source-hygiene check, and
  // the agent harness screens commands for those bytes too.
  const text = `a${String.fromCharCode(1)}b${String.fromCharCode(0x7f)}c`;
  const line = literalLine(text);
  assert.ok(line.includes("\\u0001"), line);
  assert.ok(line.includes("\\u007F"), line);
  assert.equal(decodeLiteral(line), text);
});

test("a datatype other than xsd:string is written out; xsd:string is not", () => {
  // RDF 1.1 makes a plain quoted literal an xsd:string, so stating it would add a third of the
  // bytes to say nothing -- but a consumer must never have to guess at an integer or a boolean.
  const dataset = project(docable());
  const ordinal = dataset.find((q) => q.predicate.value === MAGE.ordinal.value);
  assert.ok(ordinal);
  assert.ok(serializeQuad(ordinal).includes(`^^<${XSD.integer}>`));

  const symmetric = dataset.find((q) => q.predicate.value === MAGE.symmetric.value);
  assert.ok(symmetric);
  assert.ok(serializeQuad(symmetric).includes(`^^<${XSD.boolean}>`));

  assert.ok(!toNQuads(dataset).includes(XSD.string));
});

test("a retry_count of 3 is an integer and the string \"3\" is not", () => {
  // The YAML-implicit-typing instinct, one layer down: a consumer must not be able to read a
  // permitted value of `3` and a permitted value of `"3"` as the same thing.
  const dataset = project(canonicalize({
    mage: 1, system: { id: "s" },
    machines: {
      m: {
        initial: "a", states: { a: null }, transitions: [],
        variables: { n: { type: "integer", range: [0, 1] }, s: { type: "enum", values: ["0", "1"] } },
      },
    },
  }));
  const permitted = (v: string) => dataset
    .filter((q) => q.subject.value === variableIri("s", "m", v).value && q.predicate.value === MAGE.permittedValue.value)
    .map((q) => (q.object.kind === "literal" ? q.object.datatype : "iri"));
  assert.deepEqual(permitted("n"), [XSD.integer, XSD.integer]);
  assert.deepEqual(permitted("s"), [XSD.string, XSD.string]);
});

// ------------------------------------------------------------------------------------------------
// The vocabulary and its documentation are one artifact
// ------------------------------------------------------------------------------------------------

test("every vocabulary term is defined in RDF-VOCABULARY.md", () => {
  // A term nobody defined is a term that will be queried with a meaning the projection did not
  // intend. Keeping the join mechanical is cheaper than keeping it by habit.
  //
  // The needle is the BACKTICKED spelling, which is how the doc writes every term. A bare substring
  // search is satisfied by a longer term that contains the shorter one -- `mage:targetVariable`
  // documents `mage:target` for free -- so the join would pass while the term stayed undefined.
  const doc = readFileSync("RDF-VOCABULARY.md", "utf8");
  const missing: string[] = [];
  for (const term of [...Object.keys(MAGE_CLASSES), ...Object.keys(MAGE)]) {
    if (!doc.includes(`\`mage:${term}\``)) missing.push(term);
  }
  assert.deepEqual(missing, [], `undefined in RDF-VOCABULARY.md: ${missing.join(", ")}`);
});

test("the documented IRI scheme matches the one the code mints", () => {
  const doc = readFileSync("RDF-VOCABULARY.md", "utf8");
  assert.ok(doc.includes(URN_PREFIX), "the doc does not state the URN prefix the code uses");
  for (const kind of RESOURCE_KINDS) {
    assert.ok(doc.includes(`${URN_PREFIX}${kind}:`), `resource kind ${kind} is undocumented`);
  }
  // A sanity check on the test itself: a kind that does not exist must not appear to be documented.
  assert.ok(!doc.includes(`${URN_PREFIX}nonesuch:`));
  assert.equal(iri(URN_PREFIX).value, URN_PREFIX);
});
