// YAML adapter: comments survive a tool write, and nothing we write comes back as a different type.
//
// The round-trip test is the load-bearing one. `examples/docable.mage.yaml` carries the argument for
// why `worker` has one instance and why `owns` forbids path composition; a tool that drops that
// prose has broken the format's advertised contract, not merely annoyed someone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MageDocument } from "../src/yaml/document.ts";
import { coercionHazard } from "../src/yaml/coercion.ts";

const EXAMPLE = "examples/docable.mage.yaml";
const raw = (): string => readFileSync(EXAMPLE, "utf8");

const load = (text: string): MageDocument => {
  const r = MageDocument.load(text);
  assert.ok(r.document, `load failed: ${JSON.stringify(r.findings)}`);
  return r.document;
};

const changedLines = (before: string, after: string): string[] => {
  const a = before.split("\n"); const b = after.split("\n");
  const out: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) if (a[i] !== b[i]) out.push(b[i] ?? "(removed)");
  return out;
};

// ------------------------------------------------------------------------------------------------
// The requirement
// ------------------------------------------------------------------------------------------------

test("a commented file round-trips byte-for-byte", () => {
  const text = raw();
  const out = load(text).toText();
  assert.equal(out, text);
  // Guard against the test passing vacuously on an example that lost its comments.
  assert.ok(text.split("\n").filter((l) => l.trimStart().startsWith("#")).length > 30);
});

test("every comment survives a structural write", () => {
  const text = raw();
  const doc = load(text);
  doc.pushIn(["machines", "worker", "transitions"], { from: "held", to: "idle", label: "force-release" });
  const out = doc.toText();

  assert.equal(doc.fidelity, "reserialized");
  // Sample the load-bearing prose rather than counting: these are the comments that carry the
  // model's argument, and each sits at a different nesting depth.
  for (const comment of [
    "Comments in this file are preserved across tool writes",
    "DELIBERATELY one instance",
    "Ownership does not compose",
    "Nondeterminism is required, not merely tolerated",
    "Never stored, never part of state identity (V18)",
    "Checked against the model's actual vocabulary",
    "quoted: YAML 1.1 would hand the loader a date object",
  ]) {
    assert.ok(out.includes(comment), `lost comment: ${comment}`);
  }
  // Key order is preserved too, which is the other half of the §10 promise.
  assert.deepEqual(load(out).keysAt(["entities"]), load(text).keysAt(["entities"]));
  assert.equal(load(out).system().machines.get("worker")?.transitions.length, 3);
});

test("a scalar rewrite is byte-exact outside the one scalar it rewrote", () => {
  const text = raw();
  const doc = load(text);
  doc.setScalar(["entities", "api", "label"], "Document API v2");

  assert.equal(doc.fidelity, "surgical");
  assert.deepEqual(changedLines(text, doc.toText()), ["    label: Document API v2"]);
  assert.equal(doc.system().entities.get("api")?.label, "Document API v2");
});

test("fidelity downgrades monotonically and never climbs back", () => {
  const doc = load(raw());
  assert.equal(doc.fidelity, "verbatim");
  doc.setScalar(["entities", "api", "label"], "x");
  assert.equal(doc.fidelity, "surgical");
  doc.setIn(["entities", "api", "type"], "component");
  assert.equal(doc.fidelity, "reserialized");
  // A later surgical edit must NOT claim the document is byte-exact again.
  doc.setScalar(["entities", "api", "label"], "y");
  assert.equal(doc.fidelity, "reserialized");
});

// ------------------------------------------------------------------------------------------------
// YAML 1.1 implicit typing, on the WRITE side
// ------------------------------------------------------------------------------------------------

// Each of these, written bare, is read back as something other than the string we meant. The npm
// `yaml` package is YAML 1.2 core and will happily emit `off` unquoted; PyYAML -- which
// `workbench/validate.py` uses -- then reads boolean `false`. Measured, not assumed.
const COERCIBLE = [
  "off", "on", "yes", "no", "true", "false", "Off", "ON", "NO", "TRUE",
  "null", "Null", "~", "",
  "017", "0x1f", "0b101", "1_000", "1:30", "1:30:00",
  "1.5", ".inf", "-.INF", ".nan", "1e3",
  "2026-10-02", "2026-10-02T10:00:00Z",
  " padded", "trailing ",
  "=", "<<",
] as const;

test("a value a YAML 1.1 loader would re-type is written quoted, and reloads as itself", () => {
  const text = raw();
  for (const value of COERCIBLE) {
    assert.notEqual(coercionHazard(value), null, `coercionHazard missed '${value}'`);

    const doc = load(text);
    doc.setScalar(["entities", "api", "label"], value);
    const back = load(doc.toText());
    assert.equal(back.get(["entities", "api", "label"]), value, `'${value}' did not survive a round trip`);
    assert.equal(back.system().entities.get("api")?.label, value);
  }
});

test("the coercion guard reaches values nested inside a structural write", () => {
  const doc = load(raw());
  doc.pushIn(["machines", "worker", "transitions"], {
    from: "held", to: "idle", label: "force",
    requires: { "document.state": "off" },
    effects: { counter: "1:30" },
  });
  const out = doc.toText();
  assert.ok(out.includes('document.state: "off"'), `nested 'off' written bare:\n${out.slice(-400)}`);
  assert.ok(out.includes('counter: "1:30"'), "nested sexagesimal written bare");

  const added = load(out).system().machines.get("worker")?.transitions[2];
  assert.equal(added?.guards[0]?.value, "off");
  assert.equal(added?.effects[0]?.expression, "1:30");
});

test("coercionHazard names which rule bites, and leaves ordinary strings alone", () => {
  assert.equal(coercionHazard("off")?.rule, "implicit-bool");
  assert.equal(coercionHazard("~")?.rule, "implicit-null");
  assert.equal(coercionHazard("")?.rule, "implicit-null");
  assert.equal(coercionHazard("017")?.rule, "implicit-int");
  assert.equal(coercionHazard("1:30")?.rule, "implicit-int");
  assert.equal(coercionHazard("2026-10-02")?.rule, "implicit-timestamp");
  assert.equal(coercionHazard(".nan")?.rule, "implicit-float");
  assert.equal(coercionHazard(" x")?.rule, "whitespace-significant");

  // Over-quoting is only cheap if it stays rare: real model vocabulary must pass through plain.
  for (const safe of [
    "waiting", "Document API", "may_invoke", "retry_count + 1", "retry_count == 3",
    "ordered-enum", "left-to-right", "docable/remediation/parser", "switch_off", "v1.2.3",
    "Remediation Engine", "on-call", "offset", "no_retry", "3 workers",
  ]) {
    assert.equal(coercionHazard(safe), null, `over-quoted '${safe}'`);
  }
});

// ------------------------------------------------------------------------------------------------
// Load failures, the hash, and the sealing invariant
// ------------------------------------------------------------------------------------------------

test("a syntax error is reported as a finding, not thrown and not swallowed", () => {
  const r = MageDocument.load("entities:\n  api:\n   - bad\n  : : :\n");
  assert.equal(r.document, null);
  assert.ok(r.findings.length > 0);
  assert.ok(r.findings.every((f) => f.rule === "SYNTAX"));
  assert.ok(r.findings.every((f) => f.where.length > 0 && f.message.length > 0));
});

test("two documents in one file is refused -- a model system is exactly one", () => {
  const r = MageDocument.load("system:\n  id: a\n---\nsystem:\n  id: b\n");
  assert.ok(r.findings.some((f) => f.message.includes("exactly one")));
});

test("the hash is over the IR, so a cosmetic edit does not invalidate a pending transaction", () => {
  const text = raw();
  const before = load(text).hash();
  const commented = `# a fresh remark a human added\n${text.replace("  api:", "  api:   # and a trailing one")}`;
  assert.notEqual(commented, text);
  assert.equal(load(commented).hash(), before);

  // And it DOES move on a semantic edit, or it would not be a usable concurrency token.
  const doc = load(text);
  doc.setScalar(["entities", "api", "label"], "Changed");
  assert.notEqual(doc.hash(), before);
});

test("a sealed document refuses edits, so a committed revision cannot be mutated underneath", () => {
  const doc = load(raw()).seal();
  assert.equal(doc.sealed, true);
  assert.throws(() => doc.setScalar(["entities", "api", "label"], "x"), /sealed/);
  assert.throws(() => doc.deleteIn(["entities", "api"]), /sealed/);
  assert.throws(() => doc.pushIn(["models", "service-flow", "relations"], { from: "a", to: "b" }), /sealed/);
  // clone() is the sanctioned way through, and it is unsealed.
  const c = doc.clone();
  assert.equal(c.sealed, false);
  c.setScalar(["entities", "api", "label"], "x");
  assert.equal(doc.toText(), raw(), "editing a clone reached back into the sealed original");
});
