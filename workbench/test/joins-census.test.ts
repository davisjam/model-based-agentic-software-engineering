// The joins census is TOTAL over the cross-type references the tracked models actually author.
//
// ## Why this file exists rather than a fourth entry
//
// The registry's `joins` census under-reported by exactly one edge, and the edge it dropped was the
// one entity accounting charges through (`executes_in_state`, V38). Adding the missing entry fixes
// the instance. It does not fix the defect, because the census drifted for a structural reason:
// nothing related it to the cross-model references that exist. A census with no totality control
// reports whatever it last remembered, and a reader cannot tell a deliberate narrowing from a
// forgotten edge — which is the same claim `test/model-types.test.ts` makes about the primitive
// classification ("a deliberate exclusion and a forgotten one look the same"), applied one field
// over. So this file holds PRESENCE: every cross-type reference the models author must be named by
// some dialect's census.
//
// Presence is what is holdable here, and the limit is deliberate. `DESIGN-v02-semantics-261004.md`
// §35 draws the line for the sibling case: presence is enforceable and should be enforced, while
// correspondence — that the entry's prose *describes* the edge correctly — is `asserted`, read by a
// person. Nothing below claims an entry means what it says.
//
// ## What the derivation reads, stated so a reader can attack it
//
// It reads the TRACKED MODEL DOCUMENTS and the id namespaces the kernel canonicalizes them into.
// It does not read `joins`. Concretely, per `git ls-files -- *.mage.yaml`:
//
//   1. canonicalize the document, and build one id namespace PER MODEL TYPE from the IR —
//      graph: entity, model and relation-type ids; machine: machine ids, bare state names and
//      qualified `machine.state`; quantity: quantity ids.
//   2. walk every string leaf under the MODEL-ELEMENT constructs (`WALKED` below), generically —
//      no list of reference fields, so a NEW authored field carrying a cross-type reference is
//      picked up without anyone editing this file.
//   3. a leaf under a construct of type A whose value resolves in the namespace of a DIFFERENT
//      type B is a cross-type reference, and yields the pair A→B.
//   4. every derived pair must be named by some `JoinSemantics` whose `with` is the partner.
//
// ## What would defeat it — the four holes, named rather than left for a reader to find
//
//   - **Pair granularity.** The obligation is per (fromType, toType), because `with` is what the
//     type itself declares and what the comment on `JoinSemantics` says a facade must know. A
//     SECOND, semantically different reference between an already-named pair therefore satisfies
//     the test by riding on the first. Finer granularity would need the census to cite authored
//     field paths, which it does not.
//   - **The walked set.** A cross-type reference authored under a construct this walk declines is
//     invisible to it. That is why `WALKED` and `DECLINED` are declared together and asserted TOTAL
//     over the keys the tracked documents actually use: a new top-level construct cannot land
//     unwalked and unnoticed, which is the "declare the exclusions" discipline this repo already
//     applies to gate wiring.
//   - **Resolution by spelling.** A reference is recognised because its value spells an id in
//     another type's namespace. Two consequences: a reference written in a PREFIXED form
//     (`entity:remediation`) is not recognised, which is one reason the quantity constructs are
//     declined rather than walked; and an entity id that also spells a state name would manufacture
//     a pair that is not one. The second is checked as a premise below rather than hoped for.
//   - **One direction only.** Derived ⊆ census is asserted; census ⊆ derived is NOT. A census entry
//     may legitimately describe a join no model exercises or that lives above the documents
//     entirely — `executions-selected-by-behaviour` is declared against the query AST, so no model
//     document can witness it. Requiring the converse would delete that entry.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { MODEL_TYPES, type ModelTypeId } from "../src/engine/model-types.ts";

/**
 * The authored constructs that DECLARE model elements, by the model type each belongs to.
 *
 * Keys are top-level keys of a model document; a leaf's owning construct is its first path segment.
 */
const WALKED: Readonly<Record<string, ModelTypeId>> = {
  entities: "structural-graph",
  models: "structural-graph",
  "relation-types": "structural-graph",
  machines: "state-machine",
  events: "state-machine",
};

/**
 * The top-level keys this walk declines, each with the reason — so an undeclared exclusion and a
 * forgotten one cannot look the same.
 *
 * The quantity constructs are the judgement call, and it is `SEMANTICS.md` §5.2's: a quantity
 * ANNOTATES the model and is not part of it, so a quantity naming its target names what it
 * annotates rather than corresponding two purposeful reductions. Those references are V27's
 * subject. `DESIGN-v02-semantics-261004.md` §14 reads the same way — it classes `appears-in` and
 * `machine-of-entity` as bindings "among model elements", and a quantity is not one.
 */
const DECLINED: Readonly<Record<string, string>> = {
  mage: "the format version — a scalar, not a construct",
  system: "the system's own identity block; it declares no model element",
  domains: "declared value domains — a type-level vocabulary properties range over, not elements",
  quantities: "annotations, not model elements (SEMANTICS.md §5.2); their references are V27's",
  accounting: "the declared accounting model, which names metrics and a basis rather than elements",
  queries: "saved QUESTIONS. A query's cross-form composition is real and the census names it " +
    "(`executions-selected-by-behaviour`), but it is declared against the query AST rather than " +
    "against a model element, so walking it here would attribute it to the wrong place",
  views: "presentation — which machines and models a diagram draws, asserting nothing about the model",
};

/** Every tracked `*.mage.yaml`, package-relative. Fails loud: there is no empty-is-fine path. */
const trackedModels = (): readonly string[] =>
  execFileSync("git", ["ls-files", "-z", "--", "*.mage.yaml"], { encoding: "utf8" })
    .split("\0").filter((path) => path.length > 0).sort();

/**
 * One id namespace per model type, read off the canonical IR.
 *
 * State names are admitted both bare and qualified, which is the reference form V38 and V27 accept
 * (`<machine>.<state>`, or a bare name exactly one machine declares).
 */
function namespaces(s: CanonicalSystem): ReadonlyMap<ModelTypeId, ReadonlySet<string>> {
  const graph = new Set<string>([...s.entities.keys(), ...s.models.keys(), ...s.relationTypes.keys()]);
  const machine = new Set<string>(s.machines.keys());
  for (const m of s.machines.values()) {
    for (const st of m.states) { machine.add(st); machine.add(`${m.id}.${st}`); }
  }
  return new Map<ModelTypeId, ReadonlySet<string>>([
    ["structural-graph", graph],
    ["state-machine", machine],
    ["quantitative-model", new Set(s.quantities.keys())],
  ]);
}

interface Leaf { readonly path: readonly string[]; readonly value: string }

/** Every string leaf of an authored subtree, with its dotted path. Generic: no field list. */
function* leaves(node: unknown, path: readonly string[]): Generator<Leaf> {
  if (typeof node === "string") { yield { path, value: node }; return; }
  if (Array.isArray(node)) {
    for (const [i, item] of node.entries()) yield* leaves(item, [...path, String(i)]);
    return;
  }
  if (typeof node === "object" && node !== null) {
    for (const [key, child] of Object.entries(node)) yield* leaves(child, [...path, key]);
  }
}

const pair = (from: ModelTypeId, to: ModelTypeId): string => `${from} -> ${to}`;

/** Each derived cross-type pair, mapped to the authored sites that witness it. */
function derivedReferences(): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, string[]>();
  for (const file of trackedModels()) {
    const raw = parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const ns = namespaces(canonicalize(raw));
    for (const [construct, from] of Object.entries(WALKED)) {
      const block = raw[construct];
      if (block === undefined) continue;
      for (const leaf of leaves(block, [construct])) {
        for (const [to, ids] of ns) {
          if (to === from || !ids.has(leaf.value)) continue;
          const sites = out.get(pair(from, to)) ?? [];
          sites.push(`${file}: ${leaf.path.join(".")} = '${leaf.value}'`);
          out.set(pair(from, to), sites);
        }
      }
    }
  }
  return out;
}

/** Every cross-type pair the census names. The ONLY place below that reads `joins`. */
const censusPairs = (): ReadonlySet<string> => new Set(
  MODEL_TYPES.flatMap((t) => t.query.joins
    .filter((j) => j.with !== null)
    .map((j) => pair(t.id, j.with as ModelTypeId))),
);

// ---------------------------------------------------------------------------------------------
// The premises the derivation rests on. Checked, because an unsound derivation reports a gap that
// is not there, and that direction of error condemns working code.
// ---------------------------------------------------------------------------------------------

test("the walk's construct set is total over the keys the tracked models use", () => {
  const observed = new Set<string>();
  for (const file of trackedModels()) {
    for (const key of Object.keys(parse(readFileSync(file, "utf8")) as Record<string, unknown>)) {
      observed.add(key);
    }
  }
  assert.ok(observed.size > 0, "no tracked model yielded a key — the enumeration read nothing");
  const classified = new Set([...Object.keys(WALKED), ...Object.keys(DECLINED)]);
  for (const key of observed) {
    assert.ok(classified.has(key),
      `top-level construct '${key}' is neither walked nor declined. Decide which: if it can carry ` +
      `a reference into another model type, add it to WALKED; if it cannot, add it to DECLINED ` +
      `with the reason. An unclassified construct is a hole in the totality claim below.`);
  }
  for (const key of classified) {
    assert.ok(observed.has(key),
      `'${key}' is classified but no tracked model uses it — the classification has gone stale`);
  }
});

test("no entity id spells a state name, so a derived pair is a reference and not a collision", () => {
  // SEMANTICS.md §5.3 records this disjointness as the condition under which the identity route is
  // unexercised. The derivation needs it for a second reason: resolution is by spelling, so an
  // overlap would manufacture a structural-graph -> state-machine pair out of an ordinary id.
  for (const file of trackedModels()) {
    const s = canonicalize(parse(readFileSync(file, "utf8")) as Record<string, unknown>);
    const states = new Set<string>();
    for (const m of s.machines.values()) for (const st of m.states) states.add(st);
    for (const id of s.entities.keys()) {
      assert.ok(!states.has(id),
        `${file}: '${id}' is both an entity and a state name. The spelling-based derivation in ` +
        `this file can no longer tell a reference from a coincidence; qualify the references or ` +
        `narrow the walk before trusting the totality assertion.`);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// The control
// ---------------------------------------------------------------------------------------------

test("every cross-type reference the tracked models author is named by some dialect's census", () => {
  const derived = derivedReferences();
  const census = censusPairs();

  // Three vacuity guards. Without them an empty walk, an empty census, or a walk that happened to
  // derive only uncheckable pairs would all pass: the hole found in this repo's
  // `transaction-engine-is-the-mutator` test, which held four prohibitions and no positive control,
  // so emptying the relation satisfied every one.
  assert.ok(derived.size >= 2,
    `the walk derived ${derived.size} cross-type pair(s); fewer than two means it has stopped ` +
    `reading the models and the totality assertion below is vacuous`);
  assert.ok(census.size >= 2, `the census names ${census.size} cross-type join(s) — too few to check`);
  assert.ok([...derived.keys()].some((p) => census.has(p)),
    "no derived pair is named by the census, so the covered branch never ran");

  for (const [p, sites] of [...derived].sort()) {
    assert.ok(census.has(p),
      `no dialect's census names the cross-type reference ${p}, which ${sites.length} authored ` +
      `site(s) make: ${sites.join("; ")}. Either declare it as a JoinSemantics on the '${p.split(" -> ")[0]}' ` +
      `type with 'with' naming the partner, or change the model — a reference nothing names is the ` +
      `census reporting something other than what it measures.`);
  }
});

test("the census's own cross-type joins name registered partners and distinct pairs", () => {
  // Closure, at the pair granularity this file's obligation uses. `test/model-types.test.ts` holds
  // per-entry closure (partner registered, never self); this holds that two entries on one type do
  // not quietly claim one pair, which would let one of them satisfy the totality check for both.
  const ids = new Set(MODEL_TYPES.map((t) => t.id));
  for (const t of MODEL_TYPES) {
    const pairs = t.query.joins.filter((j) => j.with !== null).map((j) => pair(t.id, j.with as ModelTypeId));
    assert.equal(new Set(pairs).size, pairs.length,
      `${t.id}: two cross-type joins claim one partner pair, so one covers the other's obligation`);
    for (const j of t.query.joins) {
      if (j.with !== null) assert.ok(ids.has(j.with), `${t.id}/${j.name}: unregistered partner`);
    }
  }
});
