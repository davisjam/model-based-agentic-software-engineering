// V26 — a guard's value must be in the domain its ref resolves to.
//
// The failure class: `{ ref: worker.state, op: eq, value: idel }` is a typo, and nothing about the
// model looks wrong afterwards. The guard never holds, so the transition is dead, the reachable set
// is smaller than the author believes, and every query over it comes back SOUND about a different
// system. A rule that fires here is worth more than one that fires on an unparseable file.
//
// Each test names what it pins, including the three things V26 deliberately stays out of: an
// unresolvable reference, a multiply-instantiated one, and an order comparison on an unordered
// domain. A rule that reports everything is as useless as one that reports nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { checkMeaning, validate } from "../src/validator/rules.ts";
import type { Finding } from "../src/ir/types.ts";

const base = { mage: 1, system: { id: "t" } };

const findings = (doc: unknown): readonly Finding[] => checkMeaning(canonicalize(doc));
const v26 = (doc: unknown): readonly Finding[] => findings(doc).filter((f) => f.rule === "V26");

/** Two machines: `worker` holds the states, `m` carries the guarded transition. */
const twoMachines = (requires: unknown): unknown => ({
  ...base,
  machines: {
    worker: { initial: "idle", states: { idle: null, held: null }, transitions: [] },
    m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", requires }] },
  },
});

const withVariable = (variable: unknown, requires: unknown): unknown => ({
  ...base,
  machines: {
    m: {
      initial: "a", states: { a: null, b: null },
      variables: { v: variable },
      transitions: [{ from: "a", to: "b", requires }],
    },
  },
});

test("a guard naming a value outside an enum domain is reported, at the transition", () => {
  const found = v26(withVariable({ type: "enum", values: ["low", "high"] }, { v: "medium" }));
  assert.equal(found.length, 1);
  assert.equal(found[0]?.where, "machines.m.transitions[0].requires");
  assert.match(found[0]?.message ?? "", /'medium' is not in the domain of variable 'm.v'/);
  // The message lists the legal values, because the author's next action is to pick one.
  assert.match(found[0]?.message ?? "", /Declared: low, high/);
});

test("a guard naming a legal value is not reported", () => {
  // The negative control. A rule that fires on everything buys nothing.
  assert.deepEqual(v26(withVariable({ type: "enum", values: ["low", "high"] }, { v: "high" })), []);
  assert.deepEqual(v26(withVariable({ type: "boolean" }, { v: true })), []);
  assert.deepEqual(v26(withVariable({ type: "integer", range: [0, 3] }, { v: 2 })), []);
  assert.deepEqual(v26(twoMachines({ "worker.state": "held" })), []);
});

test("a guard against a control state resolves against that machine's declared states", () => {
  // `worker.state` names no declared VARIABLE anywhere; it is the machine's control, and the
  // domain is its state set.
  const found = v26(twoMachines({ "worker.state": "busy" }));
  assert.equal(found.length, 1);
  assert.match(found[0]?.message ?? "", /not in the domain of control state of 'worker'/);
  assert.match(found[0]?.message ?? "", /Declared: held, idle/);

  // The bare machine name addresses the same control state (SEMANTICS.md §4.1 reference forms).
  assert.equal(v26(twoMachines({ worker: "busy" })).length, 1);
});

test("an integer's domain is an interval, so the comparand is range-checked", () => {
  // `retry_count: { gt: 9 }` on range [0, 3] is decided before the model runs: the transition can
  // never fire. `lt: 9` is the mirror case and equally dead-on-arrival — vacuously true.
  const over = v26(withVariable({ type: "integer", range: [0, 3] }, { v: { gt: 9 } }));
  assert.equal(over.length, 1);
  assert.match(over[0]?.message ?? "", /outside the range of variable 'm.v' \(0\.\.3\)/);
  assert.equal(v26(withVariable({ type: "integer", range: [0, 3] }, { v: { lt: -1 } })).length, 1);
  // An equality comparand is a list membership test on the same enumerated domain.
  assert.equal(v26(withVariable({ type: "integer", range: [0, 3] }, { v: 7 })).length, 1);
});

test("an order comparison on an unordered domain is somebody else's finding", () => {
  // V20's discipline, enforced by the engine when it compiles the guard. V26 reports membership;
  // claiming this one would send the author looking for a bad value rather than a bad operator.
  assert.deepEqual(v26(withVariable({ type: "enum", values: ["low", "high"] }, { v: { lt: 2 } })), []);
});

test("V26 does not double-report a reference that never resolved", () => {
  // A dangling head, an undeclared member, and a name two machines both declare. Each is a
  // REFERENCE error with its own refusal from the engine's resolver, not a domain mismatch.
  assert.deepEqual(v26(twoMachines({ "ghost.state": "idle" })), []);
  assert.deepEqual(v26(twoMachines({ "worker.spin": "fast" })), []);
  assert.deepEqual(v26(twoMachines({ nothing_at_all: "x" })), []);
  assert.deepEqual(v26({
    ...base,
    machines: {
      a: { initial: "s", states: { s: null }, variables: { v: { type: "enum", values: ["x"] } }, transitions: [] },
      b: { initial: "s", states: { s: null }, variables: { v: { type: "enum", values: ["y"] } }, transitions: [] },
      m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", requires: { v: "z" } }] },
    },
  }), []);
});

test("V11 owns the multiply-instantiated case alone", () => {
  // `w.state` is ambiguous once there are two workers, so the guard's VALUE is not the problem
  // and a second finding at the same site would just make the author read twice.
  const doc = {
    ...base,
    machines: {
      w: { instances: 2, initial: "idle", states: { idle: null, held: null }, transitions: [] },
      m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", requires: { "w.state": "busy" } }] },
    },
  };
  assert.deepEqual(findings(doc).map((f) => f.rule), ["V11"]);
});

test("a variable with no finite domain stays V17's finding, not V26's", () => {
  // An integer with no range enumerates to nothing, and nothing is a member of nothing.
  const found = findings(withVariable({ type: "integer" }, { v: 5 })).map((f) => f.rule);
  assert.deepEqual(found, ["V17"]);
});

test("V25 still runs first and exclusively, so a coerced model reports no V26", () => {
  // A coerced id means the loaded model is not the written one, and a domain complaint about it
  // would blame the author's value for the loader's edit.
  const rules = validate(canonicalize({
    ...base,
    machines: {
      worker: { initial: "idle", states: { idle: null, off: null }, transitions: [] },
      m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", requires: { "worker.state": "busy" } }] },
    },
  })).map((f) => f.rule);
  assert.deepEqual([...new Set(rules)], ["V25"]);
});
