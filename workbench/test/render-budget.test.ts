// The quantitative projection: a resource budget drawn against a declared ceiling.
//
// The assertion that matters most here is not that the picture is correct — it is that no figure
// reaches the picture without reaching the twin, IN THE SAME UNIT. For a graph view the twin
// restates relationships; for a budget the numbers ARE the content, so a bar whose figure lives only
// in geometry conveys nothing to a reader who does not get the picture. Two tests below walk the
// serialized SVG for every number it draws and require each one in the twin.
//
// Every assertion is viewport-independent by construction: the projection emits a fixed `viewBox`
// and scales by `preserveAspectRatio`, so nothing here measures a rendered width. An assertion that
// depended on one would pass or fail according to the window that happened to be open.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { serialize } from "../src/render/svg.ts";
import { renderBudget } from "../src/render/budget.ts";
import type { BudgetFigures, BudgetView } from "../src/render/budget.ts";
import { budgetFigures, budgetViews, renderBudgetView } from "../src/app/budget.ts";
import { budgetReadoutFor } from "../src/quant/budget.ts";
import { DIMENSIONS } from "../src/ir/types.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import type { SvgNode } from "../src/render/types.ts";

const SENSOR_NODE = "test/fixtures/examples/embedded-sensor-node/system.mage.yaml";

const load = (src: string): CanonicalSystem => canonicalize(parse(src));
const sensorSource = (): string => readFileSync(SENSOR_NODE, "utf8");

function view(system: CanonicalSystem): BudgetView {
  const v = renderBudgetView(system, "memory");
  assert.ok(v.ok, v.ok ? "" : v.refusal);
  return v.value;
}

/** Every node in the tree, so a test can count marks instead of matching a serialized string. */
function walk(node: SvgNode): readonly SvgNode[] {
  return [node, ...node.children.flatMap(walk)];
}

const texts = (node: SvgNode): readonly string[] =>
  walk(node).map((n) => n.text).filter((t): t is string => t !== null);

/** Every distinct number appearing in drawn TEXT. Attribute geometry is not a figure. */
function drawnNumbers(node: SvgNode): readonly string[] {
  const out = new Set<string>();
  for (const t of texts(node)) for (const m of t.matchAll(/-?\d+(?:\.\d+)?/g)) out.add(m[0]);
  return [...out];
}

// --------------------------------------------------------------------------------------------
// The contract it inherits
// --------------------------------------------------------------------------------------------

test("the picture is unobtainable without its twin, field by field", () => {
  const v = view(load(sensorSource()));
  // Adding a visual output without a semantic one would have to change this line — the same
  // discipline `renderView`'s return shape is pinned by.
  assert.deepEqual(Object.keys(v).sort(), ["accessible", "svg"]);
  assert.equal(v.svg.tag, "svg");
  assert.equal(typeof v.accessible.verdict, "string");
  assert.notEqual(v.accessible.verdict, "");
});

test("the view carries the hash of the system it depicts, so it cannot outlive its model", () => {
  const system = load(sensorSource());
  assert.equal(view(system).accessible.systemHash, systemHash(system));
});

test("the subject is the quantitative model, not a model or a machine standing in for it", () => {
  const system = load(sensorSource());
  const v = view(system);
  assert.deepEqual(v.accessible.subject, { kind: "quantitative-model", id: "memory" });
  // The host is cited, and it is a declared model — the ceiling's own `model:` ref, not a position.
  assert.ok(system.models.has(v.accessible.host ?? ""));
});

// --------------------------------------------------------------------------------------------
// Every drawn figure reaches the twin
// --------------------------------------------------------------------------------------------

test("every number the picture draws appears in the twin, in the same unit", () => {
  const system = load(sensorSource());
  const v = view(system);
  const twin = v.accessible;

  const stated = new Set<string>();
  const add = (n: number | null): void => {
    if (n === null) return;
    const rounded = Math.round(n * 10) / 10;
    stated.add(Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1));
    stated.add(String(Math.abs(rounded)));
  };
  add(twin.total);
  add(twin.budget);
  add(twin.margin);
  add(twin.marginPercent);
  for (const a of twin.allocations) add(a.amount);
  // The ceiling's declared text is quoted verbatim in both, so its digits are stated too.
  for (const m of (twin.budgetDeclared ?? "").matchAll(/-?\d+(?:\.\d+)?/g)) stated.add(m[0]);
  for (const a of twin.allocations) for (const m of a.declared.matchAll(/-?\d+(?:\.\d+)?/g)) stated.add(m[0]);

  for (const n of drawnNumbers(v.svg)) {
    assert.ok(stated.has(n), `the picture draws ${n} and the twin does not state it`);
  }
});

test("figures are in the declared unit, not the dimension's base, and the unit is drawn too", () => {
  const system = load(sensorSource());
  const v = view(system);
  const readout = budgetReadoutFor(system, "memory");
  assert.ok(readout.ok);

  assert.notEqual(v.accessible.unit, DIMENSIONS.memory.base);
  assert.equal(v.accessible.unit, readout.value.unit);
  // The whole point of the conversion: whole numbers rather than a fraction of a megabyte.
  assert.ok(Number.isInteger(v.accessible.total));
  for (const a of v.accessible.allocations) assert.ok(Number.isInteger(a.amount));
  // And the unit travels with the numbers in the picture, so no figure is a bare quantity.
  assert.ok(texts(v.svg).some((t) => t.includes(v.accessible.unit)));
});

test("the twin's figures are the quantity layer's, converted and not recomputed", () => {
  const system = load(sensorSource());
  const readout = budgetReadoutFor(system, "memory");
  assert.ok(readout.ok);
  const twin = view(system).accessible;

  const factor = DIMENSIONS.memory.units[twin.unit];
  assert.ok(factor !== undefined);
  // Exact equality in base units: the adapter does units and renaming, no arithmetic of its own.
  assert.equal(twin.total * factor, readout.value.total);
  assert.equal((twin.budget ?? 0) * factor, readout.value.budget?.value);
  assert.equal(twin.allocations.length, readout.value.allocations.length);
  assert.equal(twin.largest?.quantity, readout.value.largest?.quantity);
});

// --------------------------------------------------------------------------------------------
// The threshold, the margin, and the overrun
// --------------------------------------------------------------------------------------------

test("the ceiling is a drawn line with its own label, not an implied edge of the bar", () => {
  const v = view(load(sensorSource()));
  const nodes = walk(v.svg);
  const ceiling = nodes.filter((n) => n.tag === "line" && String(n.attrs["class"] ?? "").includes("mage-budget-ceiling"));
  assert.equal(ceiling.length, 1, "exactly one threshold is drawn");
  assert.ok(String(ceiling[0]?.attrs["stroke-dasharray"] ?? "") !== "", "the threshold is dashed, so it is not another bar");
  assert.ok(texts(v.svg).some((t) => t.startsWith("ceiling ")), "the threshold names itself");
});

test("a configuration within budget states its margin and draws no overrun", () => {
  const v = view(load(sensorSource()));
  const twin = v.accessible;

  assert.equal(twin.overBudget, false);
  assert.ok((twin.margin ?? 0) > 0);
  assert.match(twin.verdict, /margin remains/);
  assert.match(twin.verdict, new RegExp(`${twin.marginPercent}% free`));
  assert.equal(walk(v.svg).filter((n) => String(n.attrs["class"] ?? "").includes("mage-budget-overrun")).length, 0);
  assert.ok(!texts(v.svg).some((t) => t.startsWith("! ")), "no alarm glyph when nothing is wrong");
});

test("an overrun is carried by three channels, none of them colour", () => {
  const system = load(sensorSource().replace("value: 32 KB", "value: 64 KB"));
  const v = view(system);
  const twin = v.accessible;

  assert.equal(twin.overBudget, true);
  assert.ok((twin.margin ?? 0) < 0);
  // 1. The twin's own sentence, which is the channel a reader without the picture gets.
  assert.match(twin.verdict, /^Over budget by /);
  // 2. A hatched band, so the overrun is a shape and not a hue.
  const band = walk(v.svg).filter((n) => String(n.attrs["class"] ?? "").includes("mage-budget-overrun"));
  assert.equal(band.length, 1);
  assert.match(String(band[0]?.attrs["fill"] ?? ""), /^url\(#/, "the band is a pattern fill, not a colour");
  // 3. A glyph on the threshold label, which survives a greyscale print and a high-contrast theme.
  assert.ok(texts(v.svg).some((t) => t.startsWith("! ceiling ")));
  // And the key says what the band means, rather than leaving the reader to infer it.
  assert.ok(twin.key.some((k) => k.channel.includes("hatched") && k.meaning.includes("overrun")));
});

test("the overrun sticks out past a fixed threshold rather than rescaling the whole picture", () => {
  // The threshold's x must not move when the total changes, or an overrun would read as a smaller
  // bar set rather than as an excess.
  const within = view(load(sensorSource()));
  const over = view(load(sensorSource().replace("value: 32 KB", "value: 64 KB")));
  const lineX = (v: BudgetView): string | number | undefined =>
    walk(v.svg).find((n) => n.tag === "line" && String(n.attrs["class"] ?? "").includes("mage-budget-ceiling"))?.attrs["x1"];
  assert.equal(lineX(within), lineX(over));
});

// --------------------------------------------------------------------------------------------
// What the projection refuses to smooth over
// --------------------------------------------------------------------------------------------

test("an allocation charging nothing gets a row and no bar, and is named in the twin", () => {
  const system = load(`
system: { id: t }
entities: { a: { label: Alpha }, b: { label: Beta } }
models:
  m: { type: graph, label: M, purpose: { question: "?" }, entities: [a, b] }
quantities:
  a-mem:   { target: entity:a, dimension: memory, value: 10 MB, residency: resident }
  b-mem:   { target: entity:b, dimension: memory, value: 90 MB }
  mem-cap: { target: model:m,  dimension: memory, value: 100 MB }
`);
  const v = view(system);
  const twin = v.accessible;

  // The arithmetic a silent drop would have got wrong: 10 of 100, not 100 of 100.
  assert.equal(twin.total, 10);
  assert.equal(twin.margin, 90);
  assert.equal(twin.overBudget, false);
  assert.equal(twin.unaccounted.length, 1);
  assert.equal(twin.unaccounted[0]?.quantity, "b-mem");
  assert.match(String(twin.unaccounted[0]?.inertReason), /charges it/);
  assert.match(twin.summary, /charged nowhere and excluded from the total/);

  // One bar, for the one allocation that charges. A zero-width bar for the other would read as
  // "approximately nothing" when the fact is "not counted at all".
  assert.equal(walk(v.svg).filter((n) => n.tag === "rect" && String(n.attrs["class"] ?? "").includes("mage-budget-bar")).length, 1);
  assert.ok(texts(v.svg).some((t) => t.includes("charged nowhere")));
  // Its share is withheld rather than reported as 90%: it has no share of a total it never enters.
  assert.equal(twin.allocations.find((a) => a.quantity === "b-mem")?.share, null);
});

test("with no declared ceiling the view says so and reports a total, not a budget", () => {
  const system = load(`
system: { id: t }
entities: { a: { label: Alpha } }
models:
  m: { type: graph, label: M, purpose: { question: "?" }, entities: [a] }
quantities:
  a-mem: { target: entity:a, dimension: memory, value: 8 MB, residency: resident }
`);
  const v = view(system);
  assert.equal(v.accessible.budget, null);
  assert.equal(v.accessible.margin, null);
  assert.equal(v.accessible.marginPercent, null);
  assert.equal(v.accessible.overBudget, false);
  assert.match(v.accessible.verdict, /No ceiling is declared/);
  // No threshold is drawn, because there is none to draw.
  assert.equal(walk(v.svg).filter((n) => n.tag === "line" && String(n.attrs["class"] ?? "").includes("ceiling")).length, 0);
  assert.ok(!v.accessible.key.some((k) => k.channel.includes("ceiling")));
});

test("a system declaring nothing in the dimension refuses with the quantity layer's own sentence", () => {
  const system = load(sensorSource());
  const refusal = renderBudgetView(system, "cost");
  assert.ok(!refusal.ok);
  const readout = budgetReadoutFor(system, "cost");
  assert.ok(!readout.ok);
  // Forwarded, not paraphrased: one place names the authoring move.
  assert.equal(refusal.refusal, readout.refusal);
});

test("budgetViews reports what refused alongside what rendered, never a silent partial set", () => {
  const system = load(`
system: { id: t }
entities: { a: { label: Alpha } }
models:
  m: { type: graph, label: M, purpose: { question: "?" }, entities: [a] }
quantities:
  a-mem:   { target: entity:a, dimension: memory,   value: 8 MB, residency: resident }
  a-time:  { target: entity:a, dimension: duration, value: 20 ms }
  bad-cap: { target: model:m,  dimension: duration, range: [1 s, 2 s] }
`);
  const set = budgetViews(system);
  assert.equal(set.views.length + set.refused.length, system.quantitativeModels.size);
  assert.deepEqual(set.views.map((v) => v.accessible.subject.id), ["memory"]);
  assert.deepEqual(set.refused.map((r) => r.dimension), ["duration"]);
  assert.match(String(set.refused[0]?.refusal), /bad-cap/);
});

// --------------------------------------------------------------------------------------------
// Determinism and viewport independence
// --------------------------------------------------------------------------------------------

test("rendering is deterministic and byte-stable across runs", () => {
  const system = load(sensorSource());
  assert.equal(serialize(view(system).svg), serialize(view(system).svg));
});

test("the drawing is viewport-independent: a fixed viewBox and no measured width", () => {
  const v = view(load(sensorSource()));
  assert.match(String(v.svg.attrs["viewBox"]), /^0 0 \d+(\.\d+)? \d+(\.\d+)?$/);
  assert.equal(v.svg.attrs["preserveAspectRatio"], "xMinYMin meet");
  // No absolute width or height, so the region decides the size and the content never reflows.
  assert.equal(v.svg.attrs["width"], undefined);
  assert.equal(v.svg.attrs["height"], undefined);
});

test("the canvas grows with the row count, so a long allocation list cannot overflow its own box", () => {
  const one = renderBudget(
    { subjectId: "memory", host: null, unit: "MB", total: 1, ceiling: null,
      allocations: [bar("a", 1)] } satisfies BudgetFigures, "h");
  const many = renderBudget(
    { subjectId: "memory", host: null, unit: "MB", total: 5, ceiling: null,
      allocations: [bar("a", 1), bar("b", 1), bar("c", 1), bar("d", 1), bar("e", 1)] } satisfies BudgetFigures, "h");
  const heightOf = (s: SvgNode): number => Number(String(s.attrs["viewBox"]).split(" ")[3]);
  assert.ok(heightOf(many.svg) > heightOf(one.svg));
  // Width is fixed, so only one axis ever changes and nothing is clipped horizontally.
  assert.equal(String(one.svg.attrs["viewBox"]).split(" ")[2], String(many.svg.attrs["viewBox"]).split(" ")[2]);
});

function bar(id: string, amount: number): BudgetFigures["allocations"][number] {
  return { id, label: id, target: `entity:${id}`, amount, declared: `${amount} MB`, charge: "resident", whenState: null, inertReason: null };
}

test("the adapter converts and renames, and invents no field the readout did not carry", () => {
  const system = load(sensorSource());
  const readout = budgetReadoutFor(system, "memory");
  assert.ok(readout.ok);
  const figures = budgetFigures(readout.value);
  assert.deepEqual(Object.keys(figures).sort(), ["allocations", "ceiling", "host", "subjectId", "total", "unit"]);
  assert.equal(figures.subjectId, readout.value.dimension);
  assert.equal(figures.host, readout.value.host);
  assert.equal(figures.allocations.length, readout.value.allocations.length);
  for (const [i, a] of figures.allocations.entries()) {
    assert.equal(a.id, readout.value.allocations[i]?.quantity);
    assert.equal(a.declared, readout.value.allocations[i]?.raw);
    assert.equal(a.inertReason, readout.value.allocations[i]?.inertReason);
  }
});
