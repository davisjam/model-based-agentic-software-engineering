// The BINDING census is TOTAL over the cross-type references the tracked models actually author.
//
// ## Why this file exists rather than a fourth entry
//
// The registry's cross-model census under-reported by exactly one edge, and the edge it dropped was
// the one entity accounting charges through (`executes_in_state`, V38). Adding the missing entry
// fixes the instance. It does not fix the defect, because the census drifted for a structural
// reason: nothing related it to the cross-model references that exist. A census with no totality
// control reports whatever it last remembered, and a reader cannot tell a deliberate narrowing from
// a forgotten edge — which is the same claim `test/model-types.test.ts` makes about the primitive
// classification ("a deliberate exclusion and a forgotten one look the same"), applied one field
// over. So this file holds PRESENCE: every cross-type reference the models author must be named by
// a registered BINDING.
//
// Presence is what is holdable here, and the limit is deliberate. `DESIGN-v02-semantics-261004.md`
// §35 draws the line for the sibling case: presence is enforceable and should be enforced, while
// correspondence — that the entry's prose *describes* the edge correctly — is `asserted`, read by a
// person. Nothing below claims an entry means what it says.
//
// ## What the 261004 binding/composition split changed here, and why it is a STRENGTHENING
//
// The census this file was written against was one overloaded `joins` array per model type. The
// ruling split it (spec §4, §23): *bindings connect denotations, compositions operate on
// denotations*, and there is no generic semantic join. Three of the four old rows were
// correspondences and one consumed a query result, so the split needed no forcing.
//
// The obligation below got SHARPER in three ways as a direct consequence, and each closes something
// the original header named as a limit:
//
//   1. **The obligation is now against BINDINGS alone, not against either kind.** A composition is
//      declared against the query AST — a behavioural predicate entering a quantitative question —
//      so no model document can author one, and admitting compositions as satisfiers would let the
//      one composition cover a model-authored reference it has nothing to do with.
//   2. **Hole 1 is closed.** Every cross-domain binding declares the authored KEYS its references
//      are spelled with (`BindingWitness`), plus `MODEL_LOCAL_SPELLINGS` below for the names a
//      single model uses and the kernel does not resolve — so the obligation is per
//      (fromType, toType, key) and a second reference cannot ride on the first. It was riding:
//      `holds_lease_as` in the worker-queue example resolved into the state-machine namespace from
//      an entity and was covered by `state-of-entity`'s pair without being named anywhere.
//   3. **Both directions are now asserted.** The original could not require census ⊆ derived
//      because `executions-selected-by-behaviour` is unwitnessable; that row is a COMPOSITION now
//      and is out of this obligation by type rather than by exception, so a declared key that no
//      model authors is a stale declaration and fails.
//
// ## What the derivation reads, stated so a reader can attack it
//
// It reads the TRACKED MODEL DOCUMENTS and the id namespaces the kernel canonicalizes them into.
// It does not read `BINDINGS`. Concretely, per `git ls-files -- *.mage.yaml`:
//
//   1. canonicalize the document, and build one id namespace PER MODEL TYPE from the IR —
//      graph: entity, model and relation-type ids; machine: machine ids, bare state names and
//      qualified `machine.state`; quantity: quantity ids.
//   2. walk every string leaf under the MODEL-ELEMENT constructs (`WALKED` below), generically —
//      no list of reference fields, so a NEW authored field carrying a cross-type reference is
//      picked up without anyone editing this file.
//   3. a leaf under a construct of type A whose value resolves in the namespace of a DIFFERENT
//      type B is a cross-type reference, and yields (A→B, the authored key it sits under) — where
//      the key is NORMALISED through the property bag's two spellings (see `authoredKey`).
//   4. every derived (pair, key) must be named by a `BindingSemantics` whose `from`/`to` are that
//      pair and whose `witness` declares that key — and every declared key must be derived.
//
// ## Why step 3 normalises, stated so it is not "simplified" back
//
// `$defs/propertyBag` is a `oneOf`: a property is authored as a scalar (`executes_in_state:
// parsing`) or as an object (`executes_in_state: { value: parsing }`). The walk reaches STRING
// LEAVES, so the object spelling arrives one segment deeper, under the bag's generic `value`
// wrapper. Keyed as given, one authored fact becomes two keys and the census demands a declaration
// for `value` — the schema's wrapper, which is nobody's binding and which every object-form
// property in any model would answer to. `authoredKey` therefore keys on the property NAME under
// both spellings, scoped to the bag's POSITION rather than to the key name, because a `domain`
// segment elsewhere (`machines.<id>.variables.<var>.domain`) is a different fact and collapsing by
// name would file it under the variable. That function's doc comment carries the full reasoning.
//
// Found the way the under-reporting was: only after a merge. A sibling wave landed a conformance
// fixture authoring `executes_in_state` in the object form, and the control went red on a model
// that did not exist when this file was written — which is the second time in one day a control
// here caught something invisible on either branch alone.
//
// ## What would defeat it — the four holes, named rather than left for a reader to find
//
//   - **Key granularity, which is what pair granularity became.** The obligation is per
//     (fromType, toType, authored key). Two references under ONE key that mean different things
//     still ride on each other — `executes_in_state` on two entities in two models is one key — and
//     finer granularity would need the census to cite per-entity paths, which it does not. What the
//     original hole allowed and this does not is a different FIELD hiding behind an existing pair.
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
//   - **Same-domain bindings are outside the obligation entirely.** The walk yields cross-TYPE
//     pairs only, so `appears-in` — one entity across two purposeful models of the same type — can
//     never be witnessed here, in either direction. That is why `BindingWitness` has a
//     `shared-membership` arm carrying the reason as a declared field: the exemption is structural,
//     and a reader can see it without inferring it from an absence. A same-domain binding's
//     correspondence is held by `test/model-types.test.ts`'s closure checks and by nothing stronger.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import {
  BINDINGS, COMPOSITIONS, MODEL_TYPES, type ModelTypeId,
} from "../src/engine/model-types.ts";

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
  queries: "saved QUESTIONS. A query's cross-domain COMPOSITION is real and the registry names it " +
    "(`executions-selected-by-behaviour`), but it is declared against the query AST rather than " +
    "against a model element, so walking it here would attribute it to the wrong place — and after " +
    "the 261004 split it is out of this file's obligation by TYPE, since the obligation runs " +
    "against bindings and a composition is not one",
  requirements: "authored OBLIGATIONS. A requirement declares no model element — it PRESCRIBES over " +
    "a saved question — and its one reference, `expressed_as`, names a saved query by id, which " +
    "this walk already declines one entry above. The exclusion is not a judgement that could " +
    "quietly be wrong, either: `verifyDeclaration` resolves `expressed_as` against the system's " +
    "declared query ids and nothing else, so the key cannot come to carry a reference into another " +
    "model type without that function changing first. Unclassified until 261005, and invisibly so " +
    "— the construct landed on 261004 and this gate reads only the keys TRACKED MODELS USE, so it " +
    "stayed silent for a day until the examples authored one. That is the gap this classification " +
    "closes, and it is the same gap in miniature that the migration closed: a construct nothing " +
    "authors is invisible to the governance over it, not merely unused",
  views: "presentation — which machines and models a diagram draws, asserting nothing about the model",
};

/**
 * MODEL-LOCAL spellings of a registered binding: an authored property that makes the binding's
 * cross-domain reference under a name the KERNEL does not resolve.
 *
 * **Why they are declared here and not on the binding.** `state-of-entity`'s `declaredBy` already
 * says a model may spell the correspondence under its own key, "and then only that model's own
 * suite holds the reference". The registry cannot carry those keys: EX-I1 forbids an engine, kernel,
 * validator or renderer source from naming an example, and a model-local property name is that
 * example's. Corpus facts live in this file — `WALKED` and `DECLINED` are the same genre — so this
 * is where the third one goes.
 *
 * **Why they are declared at all, rather than the obligation simply allowing extra keys.** Allowing
 * them is the hole: a new entity→state property would ride on `executes_in_state` and nothing would
 * say so. Declaring each one forces the decision the hole hid — is this a SPELLING of an existing
 * correspondence, or a correspondence the registry does not yet name? The first belongs here with
 * its reason; the second is a new `BindingSemantics`.
 *
 * Keys are the authored property; `binding` names the registered binding it spells, so the pair it
 * discharges is the binding's own `from`/`to` and not a second place to get that wrong.
 */
const MODEL_LOCAL_SPELLINGS: Readonly<Record<string, { binding: string; why: string }>> = {
  holds_lease_as: {
    binding: "state-of-entity",
    why: "worker-queue spells the entity→state correspondence as custody: a worker's `holds_lease_as` " +
      "names the lease-machine state that represents its custody. Same shape, different name, and " +
      "the kernel resolves nothing from it — `test/examples.test.ts` checks that every non-free " +
      "lease state is claimed by exactly one worker, which is the suite holding the reference",
  },
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

/** The obligation's key: a cross-type pair AND the authored field the reference sits under. */
const ref = (from: ModelTypeId, to: ModelTypeId, key: string): string => `${pair(from, to)} @ ${key}`;

/**
 * The segment a property bag's keys sit one level under. The schema puts a bag at two authored
 * positions and both are under a key of this name; the premise test asserts that rather than
 * trusting it, so a schema that moved a bag elsewhere goes red here.
 */
const BAG_AT = "properties";

/** The bag's object-form key holding the property's OWN value (`$defs/propertyBag`). */
const BAG_VALUE = "value";

const isIndex = (seg: string): boolean => /^[0-9]+$/.test(seg);

/**
 * The authored key a leaf sits under, with the property bag's object form NORMALISED to the
 * property name.
 *
 * **Two things this handles, and one it deliberately does not.**
 *
 * Numeric segments are array indices the generic walk produces (`relations.0.to`), and an index is
 * not a field name. Taking the last segment blindly would make every element of a list its own key
 * and the obligation unstatable.
 *
 * `$defs/propertyBag` is a `oneOf`, so ONE authored fact has TWO spellings — `executes_in_state:
 * parsing` and `executes_in_state: { value: parsing }` — and the walk reaches a string leaf, so the
 * object spelling arrives one segment deeper under the bag's generic `value` wrapper. Left
 * unnormalised they are different keys, and the census then demands a declaration for `value`: a
 * key that is the schema's wrapper rather than anyone's binding, and one that every object-form
 * property in any model would answer to. So the key is the property NAME under both spellings. This
 * is why the normalisation exists and why "simplifying" it back would break the control: it is not
 * tidying, it is the difference between keying on an authored fact and keying on a syntax.
 *
 * **Scoped to POSITION, never to the key name**, which is the part that took a check. A segment
 * named `value` or `domain` is only a bag wrapper when it sits directly under a property name that
 * sits directly under `properties`. Collapsing by name instead would reach
 * `machines.<id>.variables.<var>.domain` — a variable's domain declaration, which the tracked models
 * author five times today — and report it under the VARIABLE's name, attributing a domain reference
 * to a correspondence that is not one. That is the wrong-attribution direction this file refuses
 * everywhere else, so it is refused here.
 *
 * **`domain` is not normalised, and the asymmetry is the point.** `value` IS the property's own
 * value, so attributing it to the property name renames one fact. `domain` is a different fact — a
 * pointer into `domains:`, which `DECLINED` already excludes as "a type-level vocabulary properties
 * range over, not elements" — so folding it into the property name would file a domain reference as
 * a property correspondence. It keeps its own key, unchanged, which loses no coverage: a domain id
 * that ever resolved into another type's namespace would still surface, as `… @ domain`, for
 * someone to classify.
 */
function authoredKey(path: readonly string[]): string {
  const segs = path.filter((seg) => !isIndex(seg));
  const n = segs.length;
  if (n >= 3 && segs[n - 1] === BAG_VALUE && segs[n - 3] === BAG_AT) return segs[n - 2] ?? "";
  return segs[n - 1] ?? path[0] ?? "";
}

/** Each derived (cross-type pair, authored key), mapped to the sites that witness it. */
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
          const k = ref(from, to, authoredKey(leaf.path));
          const sites = out.get(k) ?? [];
          sites.push(`${file}: ${leaf.path.join(".")} = '${leaf.value}'`);
          out.set(k, sites);
        }
      }
    }
  }
  return out;
}

/** Every cross-domain binding paired with the kernel keys it declares. */
const keyedBindings = (): readonly { readonly name: string; readonly pairKey: string; readonly keys: readonly string[] }[] =>
  BINDINGS
    .filter((b) => b.from !== b.to && b.witness.kind === "authored-property")
    .map((b) => ({
      name: b.name,
      pairKey: pair(b.from, b.to),
      keys: b.witness.kind === "authored-property" ? b.witness.keys : [],
    }));

/**
 * Each declared cross-domain (pair, key), mapped to the binding that claims it — the registry's
 * kernel keys plus this file's model-local spellings, resolved through the binding they spell.
 *
 * The ONLY place below that reads the registry, and it reads `BINDINGS` alone: a composition cannot
 * satisfy a model-authored reference, because no model document authors one.
 */
function declaredReferences(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  const byName = new Map(keyedBindings().map((b) => [b.name, b] as const));
  for (const b of byName.values()) for (const key of b.keys) out.set(`${b.pairKey} @ ${key}`, b.name);
  for (const [key, spelling] of Object.entries(MODEL_LOCAL_SPELLINGS)) {
    const b = byName.get(spelling.binding);
    // A spelling naming no keyed binding is a dangling declaration, and the premise test below
    // refuses it; skipping here keeps that failure as the one a reader sees.
    if (b !== undefined) out.set(`${b.pairKey} @ ${key}`, b.name);
  }
  return out;
}

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

test("the property-bag normalisation matches the schema, in position and in key set", () => {
  // The normalisation's two premises, read off `mage-model.schema.json` rather than off the one
  // example that exposed the need for it. Both are the kind of fact a schema edit moves silently:
  // a bag at a third position, or a third wrapper key, would make `authoredKey` key some authored
  // references on a syntax again, and nothing else in this file would notice.
  const schema: unknown = JSON.parse(readFileSync("mage-model.schema.json", "utf8"));

  // (a) POSITION — every reference to the bag sits under a key named BAG_AT.
  const positions: string[][] = [];
  const walk = (node: unknown, path: readonly string[]): void => {
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, [...path, String(i)])); return; }
    if (typeof node !== "object" || node === null) return;
    const rec = node as Record<string, unknown>;
    if (rec["$ref"] === "#/$defs/propertyBag") { positions.push([...path]); return; }
    for (const [k, v] of Object.entries(rec)) walk(v, [...path, k]);
  };
  walk(schema, []);
  assert.ok(positions.length > 0,
    "the schema references no property bag, so the normalisation in `authoredKey` has no basis");
  for (const p of positions) {
    assert.equal(p[p.length - 1], BAG_AT,
      `a property bag sits at '${p.join(".")}', whose last segment is not '${BAG_AT}'. `
      + `\`authoredKey\` recognises the bag's object form BY POSITION, so a bag somewhere else is `
      + `unnormalised and its references will be keyed on the wrapper instead of the property.`);
  }

  // (b) KEY SET — the object spelling permits exactly `value` (required) and `domain`.
  const defs = (schema as Record<string, unknown>)["$defs"];
  const bag = typeof defs === "object" && defs !== null
    ? (defs as Record<string, unknown>)["propertyBag"] : undefined;
  assert.ok(typeof bag === "object" && bag !== null, "$defs/propertyBag is gone");
  const additional = (bag as Record<string, unknown>)["additionalProperties"];
  const arms = typeof additional === "object" && additional !== null
    ? (additional as Record<string, unknown>)["oneOf"] : undefined;
  assert.ok(Array.isArray(arms), "the bag is no longer a oneOf over a scalar and an object spelling");
  const objectArm = arms.find((a): a is Record<string, unknown> =>
    typeof a === "object" && a !== null && (a as Record<string, unknown>)["type"] === "object");
  assert.ok(objectArm !== undefined,
    "the bag declares no OBJECT spelling — if it is scalar-only the normalisation is dead code, and "
    + "if the spelling moved the normalisation is keying on the wrong thing");
  assert.deepEqual(Object.keys((objectArm["properties"] ?? {}) as Record<string, unknown>).sort(),
    ["domain", BAG_VALUE].sort(),
    "the object spelling's keys are no longer {value, domain}. A third wrapper key needs a decision "
    + "in `authoredKey`: normalise it like `value` if it carries the property's own value, or leave "
    + "it keyed on itself like `domain` if it is a different fact.");
  assert.deepEqual(objectArm["required"], [BAG_VALUE],
    `the object spelling no longer requires '${BAG_VALUE}', so it is not the value wrapper this normalises`);
  assert.equal(objectArm["additionalProperties"], false,
    "the object spelling admits open keys, so the wrapper set above is not closed and the key-set "
    + "assertion cannot bound what `authoredKey` must handle");
});

test("the normalisation reads the bag's object form, and nothing that merely looks like it", () => {
  // Permanent coverage for BOTH spellings, independent of what the corpus happens to author — the
  // object form entered the walk's reach only when a conformance fixture landed, and this is what
  // stops it leaving again. The negative cases are the masking risk, checked rather than argued.
  const key = (...p: string[]): string => authoredKey(p);

  // One authored fact, two spellings, one key.
  assert.equal(key("entities", "stage-a", "properties", "executes_in_state"), "executes_in_state");
  assert.equal(key("entities", "stage-a", "properties", "executes_in_state", BAG_VALUE), "executes_in_state");
  // The bag's other position, under a relation, and through an array index.
  assert.equal(key("models", "m", "relations", "0", "properties", "weight", BAG_VALUE), "weight");
  assert.equal(key("models", "m", "relations", "0", "to"), "to");

  // POSITION, not key name. A variable's `domain` is not a bag wrapper and must keep its own key,
  // or a domain reference would be reported under the variable's name.
  assert.equal(key("machines", "transaction", "variables", "base", "domain"), "domain");
  // A property's `domain` is in bag position and still keeps its own key, deliberately: it points
  // into `domains:` rather than carrying the property's value.
  assert.equal(key("entities", "x", "properties", "classification", "domain"), "domain");
  // A property named `value`, in both spellings. The outer `value` is a property name here, not a
  // wrapper, because the segment two above it is not `properties`.
  assert.equal(key("entities", "x", "properties", BAG_VALUE), BAG_VALUE);
  assert.equal(key("entities", "x", "properties", BAG_VALUE, BAG_VALUE), BAG_VALUE);
});

test("the tracked corpus exercises both property spellings, so neither drifts out of coverage", () => {
  // The unit test above holds the normalisation; this holds that the WALK still meets both
  // spellings, so a corpus that quietly lost one would be visible rather than leaving a branch
  // exercised only by a fixture written here.
  let scalar = 0;
  let object = 0;
  for (const file of trackedModels()) {
    const raw = parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    for (const [construct] of Object.entries(WALKED)) {
      const block = raw[construct];
      if (block === undefined) continue;
      for (const leaf of leaves(block, [construct])) {
        const segs = leaf.path.filter((s) => !isIndex(s));
        if (segs[segs.length - 2] === BAG_AT) scalar += 1;
        else if (segs[segs.length - 1] === BAG_VALUE && segs[segs.length - 3] === BAG_AT) object += 1;
      }
    }
  }
  assert.ok(scalar > 0, "no tracked model authors a property in the SCALAR spelling");
  assert.ok(object > 0,
    "no tracked model authors a property in the OBJECT spelling (`p: { value: … }`), so the "
    + "normalisation in `authoredKey` is exercised by this file's unit test alone. Either a model "
    + "lost the spelling or the walk stopped reaching it — the second is the one that matters.");
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

test("the model-local spellings name real bindings and claim no kernel key", () => {
  // A premise, not the control: the spellings resolve a (pair, key) through the binding they name,
  // so a dangling `binding` would silently drop a reference out of the obligation below. And the
  // two sets must stay DISJOINT — a key declared both as the kernel's spelling and as a model's own
  // would make the "the kernel resolves this one" distinction unreadable from either side.
  const byName = new Map(keyedBindings().map((b) => [b.name, b] as const));
  const kernelKeys = new Set(keyedBindings().flatMap((b) => b.keys));
  for (const [key, spelling] of Object.entries(MODEL_LOCAL_SPELLINGS)) {
    assert.ok(byName.has(spelling.binding),
      `'${key}' is declared a spelling of '${spelling.binding}', which is no cross-domain binding `
      + `with authored keys. Name the binding it spells, or register the binding.`);
    assert.ok(!kernelKeys.has(key),
      `'${key}' is declared BOTH as a kernel key on a binding and as a model-local spelling — one `
      + `of the two is wrong, and the pair makes "does the kernel resolve this?" unanswerable`);
    assert.ok(spelling.why.length > 40, `'${key}': a model-local spelling owes a real reason`);
  }
});

test("every cross-type reference the tracked models author is named by a registered BINDING", () => {
  const derived = derivedReferences();
  const declared = declaredReferences();

  // Three vacuity guards. Without them an empty walk, an empty registry, or a walk that happened to
  // derive only uncheckable references would all pass: the hole found in this repo's
  // `transaction-engine-is-the-mutator` test, which held four prohibitions and no positive control,
  // so emptying the relation satisfied every one.
  assert.ok(derived.size >= 2,
    `the walk derived ${derived.size} cross-type reference(s); fewer than two means it has stopped ` +
    `reading the models and the totality assertion below is vacuous`);
  assert.ok(declared.size >= 2,
    `the bindings declare ${declared.size} cross-domain reference(s) — too few to check`);
  assert.ok([...derived.keys()].some((r) => declared.has(r)),
    "no derived reference is declared by a binding, so the covered branch never ran");

  for (const [r, sites] of [...derived].sort()) {
    assert.ok(declared.has(r),
      `no registered BINDING names the cross-type reference ${r}, which ${sites.length} authored `
      + `site(s) make: ${sites.join("; ")}. Three ways to discharge it, and picking one is the `
      + `decision this check exists to force: add '${r.split(" @ ")[1]}' to the 'witness.keys' of the `
      + `binding covering ${r.split(" @ ")[0]} when the KERNEL resolves it; declare it in `
      + `MODEL_LOCAL_SPELLINGS when it is one model's own name for a correspondence already `
      + `registered; or register a NEW binding when it means something different. A composition `
      + `cannot discharge it — a composition is declared against the query AST and no model `
      + `document authors one (spec §4.1).`);
  }

  // The converse, newly assertable. Under the overloaded census it could not be required: one row
  // (`executions-selected-by-behaviour`) was unwitnessable by construction. That row is a
  // COMPOSITION now and is out of this set by type, so every remaining declaration is one some
  // model is supposed to make — and a declared key no model authors is a stale census entry, the
  // same staleness `the walk's construct set is total` refuses one field over.
  for (const [r, name] of [...declared].sort()) {
    assert.ok(derived.has(r),
      `'${name}' declares the reference ${r}, and no tracked model authors it. Either the key was `
      + `renamed or removed — drop it from 'witness.keys' or from MODEL_LOCAL_SPELLINGS — or the `
      + `binding has landed ahead of the model that exercises it, in which case ship that model: a `
      + `declaration nothing witnesses widens the census's permitted set silently.`);
  }
});

test("a composition claims no model-authored reference, which is why it is exempt not excused", () => {
  // The exemption in `DECLINED.queries` and in the obligation above rests on a claim about the one
  // composition: that it is declared against the query AST. Asserted rather than trusted, because
  // if a composition ever did correspond two model ELEMENTS it would be a binding under §4.1's own
  // definition, and leaving it in `COMPOSITIONS` would move a real reference out of the obligation.
  assert.ok(COMPOSITIONS.length > 0, "no composition at all — this check ran on nothing");
  const authored = new Set(Object.keys(WALKED));
  for (const c of COMPOSITIONS) {
    assert.ok(!authored.has(c.declaredBy.symbol),
      `${c.name} is declared by '${c.declaredBy.symbol}', an authored MODEL construct. A `
      + `relationship between two model elements that consumes no result is a BINDING (§4.1), and `
      + `registering it as a composition exempts it from the totality obligation in this file.`);
    assert.ok(c.declaredBy.file.startsWith("src/engine/") || c.declaredBy.file.startsWith("src/quant/"),
      `${c.name} is declared in '${c.declaredBy.file}', outside the query layer — if the composition `
      + `now lives in the IR it is corresponding elements, not operating on denotations`);
  }
});

test("every registered binding's witness arm matches whether its domains differ", () => {
  // Closure over the field that closes hole 1. A same-domain binding cannot be witnessed by this
  // file's walk, so claiming `authored-property` would put it under an obligation no walk can
  // discharge; a cross-domain binding claiming `shared-membership` would exempt itself from the
  // obligation by declaring it unwitnessable, which is the hole wearing a new field's name.
  assert.ok(BINDINGS.length > 0, "no bindings at all — this check ran on nothing");
  const ids = new Set(MODEL_TYPES.map((t) => t.id));
  for (const b of BINDINGS) {
    assert.ok(ids.has(b.from) && ids.has(b.to), `${b.name}: unregistered domain`);
    if (b.from === b.to) {
      assert.equal(b.witness.kind, "shared-membership",
        `${b.name} runs between models of one type, which this file's cross-TYPE walk can never `
        + `witness — its witness must be 'shared-membership' and carry the reason`);
    } else {
      assert.equal(b.witness.kind, "authored-property",
        `${b.name} crosses domains, so a model document authors its reference and the authored keys `
        + `must be declared — 'shared-membership' here exempts it from the totality obligation`);
      if (b.witness.kind === "authored-property") {
        assert.ok(b.witness.keys.length > 0, `${b.name}: no authored key declared`);
        assert.equal(new Set(b.witness.keys).size, b.witness.keys.length,
          `${b.name}: a key is declared twice`);
      }
    }
  }
  // Both arms in use, so neither is a shape nothing holds.
  assert.ok(BINDINGS.some((b) => b.witness.kind === "shared-membership"));
  assert.ok(BINDINGS.some((b) => b.witness.kind === "authored-property"));

  // No two cross-domain bindings claim one (pair, key): that would let either satisfy the totality
  // check for both, which is the pair-granularity hole reconstructed one level down.
  const claimed = keyedBindings().flatMap((b) => b.keys.map((k) => `${b.pairKey} @ ${k}`));
  assert.equal(new Set(claimed).size, claimed.length,
    "two bindings claim one (domain pair, authored key), so one covers the other's obligation");
});
