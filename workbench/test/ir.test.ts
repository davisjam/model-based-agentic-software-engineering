// Kernel tests: canonicalize is total and deterministic, and the hash tracks semantics only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash, matchesBase } from "../src/ir/hash.ts";

const load = (p: string) => canonicalize(parse(readFileSync(p, "utf8")));
const docable = () => load("examples/docable.mage.yaml");
const components = () => load("models/workbench-components.mage.yaml");

test("canonicalize survives garbage without throwing", () => {
  for (const junk of [null, undefined, 42, "text", [], { mage: 1 }, { machines: { m: 7 } }]) {
    const s = canonicalize(junk);
    assert.equal(typeof s.systemId, "string");
  }
});

test("worked example canonicalizes to the expected shape", () => {
  const s = docable();
  assert.equal(s.systemId, "docable");
  assert.deepEqual([...s.machines.keys()], ["document", "worker"]);
  // instances defaults to 1 and stays invisible: the bare name addresses the single instance.
  assert.deepEqual(s.instances.map((i) => i.id), ["document", "worker"]);
  const doc = s.machines.get("document");
  assert.ok(doc);
  assert.equal(doc.initial, "waiting");
  // A finite domain is a LIST, not a promise: retry_count [0,3] enumerates to four values.
  assert.deepEqual(doc.variables.get("retry_count")?.domain, [0, 1, 2, 3]);
  // `sync:` resolved as a string -- not a boolean key, which is what `on:` would have produced.
  assert.equal(doc.transitions[0]?.sync, "acquire");
});

test("relation types default to forbidding path composition", () => {
  // An undeclared or malformed composition must NOT license transitive reasoning.
  const s = canonicalize({ mage: 1, system: { id: "t" }, "relation-types": { r: { description: "d" } } });
  assert.equal(s.relationTypes.get("r")?.pathComposition, "forbidden");
});

test("multiplicity expands to addressable instances", () => {
  const s = canonicalize({
    mage: 1, system: { id: "t" },
    machines: { w: { instances: 3, initial: "a", states: { a: null }, transitions: [] } },
  });
  assert.deepEqual(s.instances.map((i) => i.id), ["w[0]", "w[1]", "w[2]"]);
});

test("containment resolves parents in both directions", () => {
  const s = docable();
  assert.equal(s.entities.get("parser")?.parent, "remediation");
  assert.equal(s.entities.get("remediation")?.parent, null);
});

test("quantities canonicalize into base units, or not at all", () => {
  // `canonicalize` is total and non-validating, so a literal that cannot be read must still produce
  // a value. The `base: null` is §7's "in base units or not at all" held as a type, and the fault
  // tells the validator what to say instead of leaving it to re-derive the cause.
  const s = canonicalize({
    mage: 1, system: { id: "t" }, entities: { cache: {} },
    quantities: {
      good: { target: "entity:cache", dimension: "memory", value: "128 KB" },
      bad: { target: "entity:cache", dimension: "memory", value: "128 whatsits" },
    },
  });
  const good = s.quantities.get("good");
  assert.equal(good?.target.kind, "entity");
  assert.equal(good?.target.ref, "cache");
  assert.equal(good?.scope, "configuration");
  assert.ok(good?.value.kind === "point");
  assert.deepEqual(good.value.magnitude, { raw: "128 KB", unit: "KB", base: 0.125, fault: null });

  const bad = s.quantities.get("bad");
  assert.ok(bad?.value.kind === "point");
  assert.deepEqual(bad.value.magnitude, { raw: "128 whatsits", unit: "whatsits", base: null, fault: "unit-unknown" });
});

test("a residency declaration survives canonicalization as presence AND readability", () => {
  // Two facts, and V37 needs both: `residency: transient` is a declaration the author made and got
  // wrong, which is a different finding from declaring nothing. Collapsing them to one nullable
  // field would make the two indistinguishable downstream, so the IR carries the written text beside
  // the parsed value -- the same arrangement `dimension` / `dimensionRaw` already uses.
  const s = canonicalize({
    mage: 1, system: { id: "t" }, entities: { cache: {} },
    accounting: { latency: { basis: "entities" } },
    machines: { document: { initial: "idle", states: { idle: null, busy: null }, transitions: [] } },
    quantities: {
      absent: { target: "entity:cache", dimension: "memory", value: "1 MB" },
      resident: { target: "entity:cache", dimension: "memory", value: "1 MB", residency: "resident" },
      unreadable: { target: "entity:cache", dimension: "memory", value: "1 MB", residency: "transient" },
      active: { target: "entity:cache", dimension: "memory", value: "1 MB", when: { state: "document.busy" } },
      empty: { target: "entity:cache", dimension: "memory", value: "1 MB", when: { configuration: "c" } },
    },
  });
  const q = (id: string) => s.quantities.get(id);
  assert.deepEqual([q("absent")?.residencyRaw, q("absent")?.residency, q("absent")?.when], [null, null, null]);
  assert.deepEqual([q("resident")?.residencyRaw, q("resident")?.residency], ["resident", "resident"]);
  assert.deepEqual([q("unreadable")?.residencyRaw, q("unreadable")?.residency], ["transient", null]);
  assert.deepEqual(q("active")?.when, { state: "document.busy", unexpectedKeys: [] });
  // A `when` block that declares nothing is PRESENT with a null state, so V37 can say the charge is
  // declared nowhere instead of this guessing that the stray key was the state.
  assert.deepEqual(q("empty")?.when, { state: null, unexpectedKeys: ["configuration"] });

  assert.equal(s.accounting.get("latency")?.dimension, "duration");
  assert.equal(s.accounting.get("latency")?.basis, "entities");
});

test("hash is stable across cosmetic change and moves on semantic change", () => {
  const raw = readFileSync("examples/docable.mage.yaml", "utf8");
  const base = systemHash(canonicalize(parse(raw)));

  // Comments and blank lines are cosmetic: the hash must not move, or every pending transaction
  // would be invalidated by reformatting.
  const recommented = raw.replace(/^# .*$/gm, "# (rewritten comment)") + "\n\n";
  assert.equal(systemHash(canonicalize(parse(recommented))), base);

  // Authoring ORDER within a mapping is cosmetic too.
  const reordered = parse(raw) as Record<string, unknown>;
  const flipped = Object.fromEntries(Object.entries(reordered).reverse());
  assert.equal(systemHash(canonicalize(flipped)), base);

  // A new transition is semantic.
  const changed = parse(raw) as any;
  changed.machines.document.transitions.push({ from: "published", to: "waiting", label: "reopen" });
  assert.notEqual(systemHash(canonicalize(changed)), base);
});

test("matchesBase is the concurrency token", () => {
  const s = components();
  assert.ok(matchesBase(s, systemHash(s)));
  assert.ok(!matchesBase(s, "fnv1a64:0000000000000000"));
});
