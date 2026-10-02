// Configuration-space construction. The guard-versus-sync tests are the ones to read first: that
// distinction is the single most likely semantic bug in this layer.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compileSystem, defaultOptions, exploreSpace, findConfigurationCycle,
} from "../src/engine/explore.ts";
import type { CompiledSystem, StateSpace } from "../src/engine/explore.ts";
import type { Step } from "../src/ir/types.ts";
import { build, docable, saturating } from "./engine-fixtures.ts";

const compiled = (): CompiledSystem => {
  const c = compileSystem(docable());
  assert.ok(c.ok, c.ok ? "" : c.refusal);
  return c.value;
};

const space = (limit = 10_000): StateSpace => exploreSpace(compiled(), defaultOptions(limit));

const everyStep = (s: StateSpace): readonly Step[] => s.edges.flatMap((es) => es.map((e) => e.step));

test("the initial configuration is control states plus variables, and nothing else", () => {
  const s = space();
  const initial = s.configs[0];
  assert.ok(initial);
  assert.deepEqual([...initial.control.entries()].sort(), [["document", "waiting"], ["worker", "idle"]]);
  // retry_count is in the vector; `exhausted` (derived, V18) and entity properties (V16) are not.
  assert.deepEqual([...initial.values.entries()], [["document.retry_count", 0]]);
});

test("a declared event moves EVERY participant in one step, atomically", () => {
  const acquire = everyStep(space()).find((st) => st.sync === "acquire");
  assert.ok(acquire, "no step fired the declared event");
  assert.deepEqual([...acquire.instances].sort(), ["document", "worker"]);
  assert.equal(acquire.from.control.get("document"), "waiting");
  assert.equal(acquire.from.control.get("worker"), "idle");
  assert.equal(acquire.to.control.get("document"), "processing");
  assert.equal(acquire.to.control.get("worker"), "held");
});

test("a guard READS another machine without making it step", () => {
  // `processing -> reviewed` requires worker.state: held. One instance moves; the worker it read
  // stays exactly where it was. `sync:` makes two machines move together; `requires:` does not.
  const review = everyStep(space()).find((st) =>
    st.sync === null && st.label === "review" && st.from.control.get("document") === "processing");
  assert.ok(review, "the guarded transition never fired");
  assert.deepEqual(review.instances, ["document"]);
  assert.equal(review.to.control.get("document"), "reviewed");
  assert.equal(review.from.control.get("worker"), "held");
  assert.equal(review.to.control.get("worker"), "held");
});

test("a guard that does not hold in the pre-state disables the step", () => {
  // No configuration has the document reviewing out of `processing` while the worker is idle,
  // because the guard is evaluated against the pre-state of that very step.
  for (const st of everyStep(space())) {
    if (st.label !== "review") continue;
    assert.equal(st.from.control.get("worker"), "held");
  }
});

test("effects apply from the pre-state and the counter advances", () => {
  const retry = everyStep(space()).find((st) => st.label === "retry");
  assert.ok(retry);
  assert.equal(retry.from.values.get("document.retry_count"), 0);
  assert.equal(retry.to.values.get("document.retry_count"), 1);
});

test("a configuration with no enabled step is reported as a dead end, not an error", () => {
  const s = space();
  assert.ok(s.deadEnds.length > 0);
  for (const at of s.deadEnds) {
    assert.deepEqual(s.edges[at], []);
  }
  // (published, idle) is the canonical one: the document is terminal and the worker cannot acquire.
  const terminal = s.deadEnds.map((at) => s.configs[at]?.control.get("document"));
  assert.ok(terminal.includes("published"));
});

test("the whole reachable space is enumerated and the walk reports itself complete", () => {
  const s = space();
  assert.equal(s.stopReason, "complete");
  assert.equal(s.complete, true);
  assert.equal(s.statesExplored, s.configs.length);
  // Finite and small: 5 document states x 2 worker states x 4 retry values is the ceiling, and
  // the reachable subset is strictly smaller.
  assert.ok(s.configs.length > 1 && s.configs.length < 40, `unexpected size ${s.configs.length}`);
});

test("the state limit trips and is reported, not silently ignored", () => {
  const s = exploreSpace(compiled(), defaultOptions(3));
  assert.equal(s.stopReason, "state-limit");
  assert.equal(s.complete, false);
  assert.ok(s.statesExplored <= 3);
});

test("an effect outside the tiny grammar is REFUSED rather than evaluated", () => {
  for (const expression of ["n * 2", "n + m", "f(n)", "(n + 1) - 2"]) {
    const c = compileSystem(build({
      machines: {
        m: {
          initial: "s", states: { s: null },
          variables: { n: { type: "integer", range: [0, 3], initial: 0 } },
          transitions: [{ from: "s", to: "s", effects: { n: expression } }],
        },
      },
    }));
    assert.equal(c.ok, false, `'${expression}' was accepted`);
    if (c.ok) return;
    assert.match(c.refusal, /does not contain an expression evaluator/);
    assert.equal(c.detail?.reason, "unsupported-expression");
  }
});

test("V14: an event synchronizing a multiply-instantiated machine is refused as reserved", () => {
  const c = compileSystem(build({
    events: { acquire: { participants: ["doc", "worker"] } },
    machines: {
      doc: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", sync: "acquire" }] },
      worker: {
        instances: 2, initial: "i", states: { i: null, h: null },
        transitions: [{ from: "i", to: "h", sync: "acquire" }],
      },
    },
  }));
  assert.equal(c.ok, false);
  if (c.ok) return;
  assert.match(c.refusal, /Participant selection is not supported by this version/);
  assert.equal(c.detail?.reason, "reserved-feature");
});

test("V13: two participants assigning one variable in one atomic step is refused", () => {
  const c = compileSystem(build({
    events: { e: { participants: ["a", "b"] } },
    machines: {
      a: {
        initial: "s", states: { s: null, t: null },
        variables: { n: { type: "integer", range: [0, 3], initial: 0 } },
        transitions: [{ from: "s", to: "t", sync: "e", effects: { n: "1" } }],
      },
      b: {
        initial: "s", states: { s: null, t: null },
        transitions: [{ from: "s", to: "t", sync: "e", effects: { n: "2" } }],
      },
    },
  }));
  assert.equal(c.ok, false);
  if (c.ok) return;
  assert.match(c.refusal, /both assign 'n' in the single atomic step/);
  assert.match(c.refusal, /V13/);
});

test("V12: a participant that never participates is refused", () => {
  const c = compileSystem(build({
    events: { e: { participants: ["a", "b"] } },
    machines: {
      a: { initial: "s", states: { s: null, t: null }, transitions: [{ from: "s", to: "t", sync: "e" }] },
      b: { initial: "s", states: { s: null }, transitions: [] },
    },
  }));
  assert.equal(c.ok, false);
  if (c.ok) return;
  assert.match(c.refusal, /a participant that never participates/);
});

test("V1: `sync:` naming an undeclared event is refused", () => {
  const c = compileSystem(build({
    machines: {
      a: { initial: "s", states: { s: null, t: null }, transitions: [{ from: "s", to: "t", sync: "ghost" }] },
    },
  }));
  assert.equal(c.ok, false);
  if (c.ok) return;
  assert.match(c.refusal, /not a declared event/);
});

test("V17: a variable without a finite domain refuses exploration", () => {
  const c = compileSystem(build({
    machines: {
      a: { initial: "s", states: { s: null }, variables: { n: { type: "integer" } }, transitions: [] },
    },
  }));
  assert.equal(c.ok, false);
  if (c.ok) return;
  assert.match(c.refusal, /no finite domain \(V17\)/);
});

test("nondeterminism is explored: `processing` offers both review and fail", () => {
  const s = space();
  const fromProcessing = s.configs.flatMap((cfg, i) =>
    cfg.control.get("document") === "processing" ? (s.edges[i] ?? []) : []);
  const labels = new Set(fromProcessing.map((e) => e.step.label));
  assert.ok(labels.has("review"), "review never fired");
  assert.ok(labels.has("fail"), "fail never fired");
});

test("an effect that would leave the finite domain disables the step and DISCLOSES it", () => {
  const c = compileSystem(saturating());
  assert.ok(c.ok, c.ok ? "" : c.refusal);
  if (!c.ok) return;
  const s = exploreSpace(c.value, defaultOptions(100));
  // Two configurations only: n = 0 and n = 1. From n = 1 the bump would produce 2.
  assert.equal(s.configs.length, 2);
  assert.equal(s.stopReason, "complete");
  assert.equal(s.notes.length, 1);
  assert.match(s.notes[0] ?? "", /would leave the variable's declared finite domain/);
  assert.match(s.notes[0] ?? "", /skipped rather than clamped/);
});

test("a loop over a strictly advancing bounded variable is not a repeatable cycle", () => {
  const c = compileSystem(saturating());
  assert.ok(c.ok);
  if (!c.ok) return;
  // The control state returns to `s` every step, but no CONFIGURATION repeats, so there is no
  // cycle witness -- which is exactly the distinction a path-aggregation analysis needs.
  assert.equal(findConfigurationCycle(exploreSpace(c.value, defaultOptions(100))), null);
});

test("a genuinely repeatable loop yields a cycle witness with a prefix", () => {
  const c = compileSystem(build({
    machines: {
      m: {
        initial: "a", states: { a: null, b: null, c: null },
        transitions: [
          { from: "a", to: "b", label: "enter" },
          { from: "b", to: "c", label: "around" },
          { from: "c", to: "b", label: "back" },
        ],
      },
    },
  }));
  assert.ok(c.ok);
  if (!c.ok) return;
  const witness = findConfigurationCycle(exploreSpace(c.value, defaultOptions(100)));
  assert.ok(witness, "no cycle witness for a model that plainly loops");
  assert.ok(witness.cycle.length >= 1);
  assert.deepEqual(witness.cycle.map((st) => st.label).sort(), ["around", "back"]);
});

test("T4: instances interleave independently and are addressed by ordinal", () => {
  const c = compileSystem(build({
    machines: { w: { instances: 2, initial: "i", states: { i: null, h: null }, transitions: [{ from: "i", to: "h" }] } },
  }));
  assert.ok(c.ok);
  if (!c.ok) return;
  const s = exploreSpace(c.value, defaultOptions(100));
  // 2 x 2: both idle, either held, both held.
  assert.equal(s.configs.length, 4);
  const movers = new Set(everyStep(s).flatMap((st) => st.instances));
  assert.deepEqual([...movers].sort(), ["w[0]", "w[1]"]);
});
