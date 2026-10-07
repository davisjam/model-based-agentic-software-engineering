/**
 * The UML statechart notation: `event [guard] / effect` on transitions, and the variables
 * compartment — the semantics that decide a property, rendered rather than withheld.
 *
 * The finding this pins: the worker-queue example's saved property "occupancy never exceeds 4"
 * is HELD by the arrival guard, and the picture drew one bubble with two bare words on its
 * self-loops. The model file says in its own voice that "the guards and effects are what make the
 * capacity question checkable"; these tests hold the renderer to drawing them, the key to
 * decoding them, and the twin to carrying them (twin parity).
 *
 * Every probe asserts its own preconditions: a fixture without the declared guard FAILS here
 * rather than letting an assertion pass over an empty set.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { renderView } from "../src/render/index.ts";
import { buildMachineScene, variableLine } from "../src/render/scene.ts";
import {
  EDGE_SUBLABEL_WRAP_W,
  textExtent,
  transitionSubLabel,
  transitionSubLabelLines,
} from "../src/render/layout.ts";
import type { SvgNode } from "../src/render/types.ts";

const workerQueue = () =>
  canonicalize(parse(readFileSync("examples/simple-worker-queue/system.mage.yaml", "utf8")));

/** Depth-first text runs with their class, so assertions name what the reader actually sees. */
function textRuns(n: SvgNode, out: { cls: string; text: string }[] = []): { cls: string; text: string }[] {
  if (n.tag === "text" && n.text !== null) out.push({ cls: String(n.attrs["class"] ?? ""), text: n.text });
  for (const c of n.children) textRuns(c, out);
  return out;
}

/**
 * Per edge GROUP, its sublabel runs in paint order — the wrapped stack one transition carries.
 * Grouped by `data-edge-id` so two edges' stacks cannot be conflated into one phrase by accident.
 */
function edgeSubLabelStacks(tree: SvgNode): string[][] {
  const out: string[][] = [];
  const walk = (n: SvgNode): void => {
    if (n.tag === "g" && n.attrs["data-edge-id"] !== undefined) {
      const stack = textRuns(n)
        .filter((r) => r.cls === "mage-edge-sublabel")
        .map((r) => r.text);
      if (stack.length > 0) out.push(stack);
      return;
    }
    for (const c of n.children) walk(c);
  };
  walk(tree);
  return out;
}

function layers(n: SvgNode): string[] {
  const out: string[] = [];
  const walk = (x: SvgNode): void => {
    const l = x.attrs["data-layer"];
    if (l !== undefined) out.push(String(l));
    for (const c of x.children) walk(c);
  };
  walk(n);
  return out;
}

test("a transition's declared guard and effect render on its edge in UML notation", () => {
  const system = workerQueue();
  // PRECONDITION: the fixture must still hold the semantics this test is about. The arrival
  // guard is what holds the capacity bound; if it is gone, the finding has changed, not passed.
  const m = system.machines.get("queue-capacity");
  assert.ok(m, "probe precondition: machine queue-capacity absent from fixture");
  const arrival = m.transitions.find((t) => t.label === "arrival");
  assert.ok(arrival !== undefined && arrival.guards.length > 0,
    "probe precondition: the arrival transition no longer declares a guard");

  const view = renderView(system, { subject: { kind: "machine", id: "queue-capacity" } });
  // The notation WRAPS (the Mermaid pilot's one visual win, taken): each guarded self-loop paints
  // its `[guard] / effect` as a stack of sublabel runs inside one edge group, broken at the
  // notation's structural seam. Joined back together, the stack reads as the whole phrase.
  const stacks = edgeSubLabelStacks(view.tree);
  assert.ok(stacks.length >= 2, `expected a notation stack per guarded self-loop, found ${stacks.length}`);
  assert.ok(stacks.some((s) => s.join(" ") === "[occupancy < 4] / occupancy := occupancy + 1"),
    `the arrival guard that HOLDS the bound must be in the picture; saw ${JSON.stringify(stacks)}`);
  assert.ok(stacks.some((s) => s.join(" ") === "[occupancy > 0] / occupancy := occupancy - 1"),
    "the processing guard must be in the picture");
  // The break lands at the `[guard]` / `/ effect` seam — never inside a token.
  const arrivalStack = stacks.find((s) => s[0] === "[occupancy < 4]");
  assert.ok(arrivalStack, "the arrival notation must break after the bracketed guard");
  assert.deepEqual(arrivalStack, ["[occupancy < 4]", "/ occupancy := occupancy + 1"]);
});

test("a notation line wider than the wrap width breaks at the guard/effect seam, inside reserved space", () => {
  const system = workerQueue();
  const scene = buildMachineScene(system, "queue-capacity");
  const arrival = scene.edges.find((e) => e.label === "arrival");
  assert.ok(arrival !== undefined && arrival.guard !== null && arrival.effect !== null,
    "probe precondition: the arrival transition no longer declares both guard and effect");
  const whole = transitionSubLabel(arrival.guard, arrival.effect);
  assert.ok(whole !== null && textExtent(whole, "mage-edge-sublabel").w > EDGE_SUBLABEL_WRAP_W,
    "probe precondition: the arrival notation no longer exceeds the wrap width — the wrap is untested");

  const lines = transitionSubLabelLines(arrival.guard, arrival.effect);
  assert.deepEqual(lines, [`[${arrival.guard}]`, `/ ${arrival.effect}`],
    "the first break belongs at the notation's structural seam");
  for (const line of lines) {
    assert.ok(textExtent(line, "mage-edge-sublabel").w <= EDGE_SUBLABEL_WRAP_W,
      `a wrapped line must fit the wrap width: ${line}`);
  }
  // Wrapping is a VISUAL affordance: the twin still reads the semantics as whole phrases, never
  // as the painter's fragments (the twin-parity posture of UX-I11).
  const view = renderView(system, { subject: { kind: "machine", id: "queue-capacity" } });
  const twinArrival = view.accessible.edges.find((e) => e.label === "arrival");
  assert.ok(twinArrival, "probe precondition: no arrival edge in the twin");
  assert.match(twinArrival.description, /requires occupancy < 4/);
  for (const line of lines) {
    assert.ok(!twinArrival.description.includes(line) || line === twinArrival.description,
      `the twin must not carry the painter's wrapped fragment verbatim: ${line}`);
  }
});

test("a notation line that would exceed the line cap renders nowhere — whole in the title and twin", () => {
  // Whole-or-nowhere, restated for the wrapped world: wrapping is bounded, not unbounded growth
  // that swallows the canvas. Past the cap the picture shows nothing, the hover title and the
  // twin carry the full phrase, and the key stops advertising notation the picture does not have.
  const guard = Array.from({ length: 9 }, (_, i) => `very_long_variable_name_${i} = ${i}`).join(" and ");
  const lines = transitionSubLabelLines(guard, null);
  assert.ok(transitionSubLabel(guard, null) !== null, "probe precondition: the composer refused the guard");
  assert.deepEqual(lines, [], "an over-cap notation must render nowhere, never as an ellipsis");

  const system = canonicalize(
    parse(`
mage: 1
system: { id: cap, name: Cap, description: A machine whose guard exceeds the line cap. }
machines:
  lifecycle:
    initial: idle
    purpose:
      question: Does the lifecycle reach done?
      represents: [steps]
      omits: [timing]
    variables:
      ${Array.from({ length: 9 }, (_, i) => `very_long_variable_name_${i}: { type: integer, range: [0, 9], initial: ${i} }`).join("\n      ")}
    states:
      idle: { label: Idle }
      done: { label: Done }
    transitions:
      - from: idle
        to: done
        label: finish
        requires:
          ${Array.from({ length: 9 }, (_, i) => `very_long_variable_name_${i}: { eq: ${i} }`).join("\n          ")}
`),
  );
  const m = system.machines.get("lifecycle");
  assert.ok(m, "probe precondition: the cap fixture failed to canonicalize");
  const t = m.transitions.find((x) => x.label === "finish");
  assert.ok(t !== undefined && t.guards.length === 9,
    `probe precondition: the cap fixture must declare 9 guards, got ${t?.guards.length ?? 0}`);

  const view = renderView(system, { subject: { kind: "machine", id: "lifecycle" } });
  const runs = textRuns(view.tree);
  assert.ok(!runs.some((r) => r.cls === "mage-edge-sublabel"),
    "an over-cap notation must not paint any sublabel run");
  assert.equal(view.accessible.key.filter((k) => k.channel === "notation" && k.id === "guard").length, 0,
    "the key must not decode a guard mark the picture does not carry");
  const twinFinish = view.accessible.edges.find((e) => e.label === "finish");
  assert.ok(twinFinish, "probe precondition: no finish edge in the twin");
  assert.match(twinFinish.description, /requires very_long_variable_name_8 = 8/,
    "the twin must carry the full semantics the picture declined to paint");
});

test("the machine's declared variable is first-class ink: the variables compartment", () => {
  const system = workerQueue();
  const scene = buildMachineScene(system, "queue-capacity");
  assert.ok(scene.variables.length === 1 && scene.variables[0]?.id === "occupancy",
    "probe precondition: the fixture no longer declares exactly the occupancy variable");

  const view = renderView(system, { subject: { kind: "machine", id: "queue-capacity" } });
  assert.ok(layers(view.tree).includes("variables"), "the variables compartment layer is missing");
  const runs = textRuns(view.tree);
  assert.ok(runs.some((r) => r.cls === "mage-var-title" && r.text === "variables"),
    "the compartment must be titled, or it is an unexplained box");
  // The declared domain [-1, 5] — deliberately one notch wider than the policy [0, 4] so the
  // invariant is not vacuous — and the initial value, in the declaration row.
  assert.ok(runs.some((r) => r.cls === "mage-var" && r.text === "occupancy : integer [-1..5] = 2"),
    `the declaration row must carry type, declared domain and initial; saw ${JSON.stringify(runs.filter((r) => r.cls === "mage-var"))}`);
});

test("the key decodes the new marks; the twin carries whatever the visual gained", () => {
  const system = workerQueue();
  const view = renderView(system, { subject: { kind: "machine", id: "queue-capacity" } });

  // Key: one row per notation mark actually in the picture — decoding the convention, never
  // interpreting the model (no row mentions occupancy or the number 4).
  const notation = view.accessible.key.filter((k) => k.channel === "notation");
  assert.deepEqual(notation.map((k) => k.id).sort(), ["effect", "guard", "variables"]);
  for (const row of notation) {
    assert.ok(!/occupancy|[0-9]/.test(row.meaning),
      `a key row must decode the mark, not interpret the model: ${row.meaning}`);
  }

  // Twin parity: the variable reaches the twin with the SAME declaration the compartment draws,
  // and the summary states it.
  assert.equal(view.accessible.variables.length, 1);
  const v = view.accessible.variables[0];
  assert.ok(v !== undefined);
  assert.equal(v.declaration, variableLine({ id: "occupancy", kind: "integer", domain: "[-1..5]", initial: "2" }));
  assert.match(view.accessible.summary, /Variables: occupancy : integer \[-1\.\.5\] = 2\./);

  // Twin parity on the edges: the guard a sighted user reads must be hearable. The edge
  // descriptions already phrase it for speech.
  const arrival = view.accessible.edges.find((e) => e.label === "arrival");
  assert.ok(arrival, "probe precondition: no arrival edge in the twin");
  assert.match(arrival.description, /requires occupancy < 4/);
  assert.match(arrival.description, /occupancy := occupancy \+ 1/);
});

test("a machine declaring no guards, effects or variables renders without the new marks", () => {
  const system = canonicalize(
    parse(`
mage: 1
system: { id: plain, name: Plain, description: A machine with bare transitions. }
machines:
  lifecycle:
    initial: idle
    purpose:
      question: Does the lifecycle reach done?
      represents: [steps]
      omits: [timing]
    states:
      idle: { label: Idle }
      done: { label: Done }
    transitions:
      - { from: idle, to: done, label: finish }
`),
  );
  const m = system.machines.get("lifecycle");
  assert.ok(m, "probe precondition: lifecycle machine failed to canonicalize");
  assert.ok(m.transitions.every((t) => t.guards.length === 0 && t.effects.length === 0) && m.variables.size === 0,
    "probe precondition: the guard-free fixture is not guard-free");
  assert.equal(transitionSubLabel(null, null), null);

  const view = renderView(system, { subject: { kind: "machine", id: "lifecycle" } });
  const runs = textRuns(view.tree);
  assert.ok(!runs.some((r) => r.cls === "mage-edge-sublabel"), "no notation line without declared semantics");
  assert.ok(!layers(view.tree).includes("variables"), "no variables compartment without declared variables");
  assert.equal(view.accessible.key.filter((k) => k.channel === "notation").length, 0,
    "the key must not decode marks the picture does not carry");
  assert.equal(view.accessible.variables.length, 0);
  assert.ok(!/Variables:/.test(view.accessible.summary));
});
