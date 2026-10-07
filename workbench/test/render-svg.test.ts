/**
 * SVG emission: self-contained output, non-colour emphasis channels, and stable serialization.
 *
 * The two tests that earn their keep here are `the SVG fetches nothing` and `every emphasis kind is
 * distinguishable without colour`. The first pins a deployment constraint that fails silently — the
 * artifact is served under a policy that blocks external requests, so a CDN reference does not
 * error in development, it just renders wrong for a user. The second pins FR-A11Y-2's hardest
 * clause: colour must not be the sole carrier, and the only way to keep that true under later edits
 * is to assert that the non-colour channels really are distinct.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { METRICS, MARKS, PLAIN_MARK, SUBLABEL_PITCH, inNodeLines, renderView, serialize, textExtent } from "../src/render/index.ts";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import type { EmphasisKind, LayoutEngine, MarkStyle, Point, SvgNode } from "../src/render/index.ts";
import { BOUNDED, EXHAUSTIVE, docableSystem, publishTrace } from "./render-fixtures.ts";

const walk = (n: SvgNode, out: SvgNode[] = []): SvgNode[] => {
  out.push(n);
  for (const c of n.children) walk(c, out);
  return out;
};

const machineView = () => renderView(docableSystem(), { subject: { kind: "machine", id: "document" } });
const graphView = () =>
  renderView(docableSystem(), {
    subject: { kind: "model", id: "service-flow" },
    showProperties: ["classification", "accepts"],
  });

// -------------------------------------------------------------------------------------------
// Self-contained output
// -------------------------------------------------------------------------------------------

test("the SVG fetches nothing: no CDN, no webfont, no remote image", () => {
  for (const view of [machineView(), graphView()]) {
    const svg = view.svg;
    // The SVG namespace declaration is the ONLY permitted absolute URL. Strip it, then there must
    // be no scheme left anywhere.
    const stripped = svg.replaceAll('xmlns="http://www.w3.org/2000/svg"', "");
    assert.equal(/https?:/.test(stripped), false, "an absolute URL survived outside xmlns");
    assert.equal(/\bhref=/.test(svg), false, "href would be a fetch");
    assert.equal(/xlink:/.test(svg), false);
    assert.equal(/\bsrc=/.test(svg), false);
    assert.equal(/@import/.test(svg), false);
    assert.equal(/<image\b/.test(svg), false);
    // The only url() permitted is a same-document fragment, for the arrowhead marker.
    for (const m of svg.matchAll(/url\(([^)]*)\)/g)) {
      assert.ok(m[1]?.startsWith("#"), `url(${m[1] ?? ""}) is not a same-document reference`);
    }
    // Font families are local generic names, never a fetched face.
    assert.match(svg, /font-family: system-ui, sans-serif/);
  }
});

test("the inline stylesheet survives XML escaping", () => {
  // Regression: quoted font names in the stylesheet serialize as &quot;, which is not reliably
  // decoded back when the markup is inlined into an HTML document — it silently breaks the rule.
  const style = walk(machineView().tree).find((n) => n.tag === "style");
  assert.ok(style?.text);
  assert.equal(style.text.includes('"'), false, "the stylesheet must contain no quote characters");
  // Scoped to the style element: `&quot;` in a <desc> is correct escaping of text content, but in
  // a CSS declaration it is a broken rule.
  assert.equal(serialize(style).includes("&quot;"), false);
  assert.match(style.text, /\.mage-evidence-inconclusive/);
});

// -------------------------------------------------------------------------------------------
// FR-A11Y-2: colour is never the sole carrier
// -------------------------------------------------------------------------------------------

test("every emphasis kind is distinguishable without colour", () => {
  const entries: readonly (readonly [string, MarkStyle])[] = [
    ["plain", PLAIN_MARK],
    ...(Object.keys(MARKS) as EmphasisKind[]).map((k) => [k, MARKS[k]] as const),
  ];
  // `evidence` carries the step NUMBER as its glyph rather than a fixed one, so compare it on the
  // channels it does fix.
  const channels = (m: MarkStyle): string => `${m.strokeWidth}|${m.dashArray ?? "solid"}|${m.glyph ?? ""}|${m.opacity}`;
  const seen = new Map<string, string>();
  for (const [name, mark] of entries) {
    const key = channels(mark);
    const clash = seen.get(key);
    assert.equal(clash, undefined, `${name} is indistinguishable from ${clash ?? ""} without colour`);
    seen.set(key, name);
  }
});

test("MarkStyle declares no colour at all, so a colour-only treatment cannot be added", () => {
  for (const mark of Object.values(MARKS)) {
    for (const forbidden of ["colour", "color", "fill", "stroke", "hue"]) {
      assert.equal(forbidden in mark, false, `MarkStyle must not carry ${forbidden}`);
    }
  }
});

test("hue appears only as a redundant extra channel, in the stylesheet", () => {
  // Every class named in MARKS must exist in the stylesheet (so colour is available), and the
  // stylesheet must not be the only place the distinction lives — which the test above pins.
  const style = walk(machineView().tree).find((n) => n.tag === "style")?.text ?? "";
  for (const mark of Object.values(MARKS)) {
    if (mark.className === "mage-evidence") continue; // shares a stroke rule with mage-added
    assert.ok(style.includes(`.${mark.className}`), `${mark.className} has no stylesheet rule`);
  }
});

// -------------------------------------------------------------------------------------------
// Emphasis in the picture
// -------------------------------------------------------------------------------------------

test("evidence emphasis is numbered, and the number is the marker", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    evidence: publishTrace(),
    coverage: EXHAUSTIVE,
    outcome: "holds",
  });
  const glyphs = walk(view.tree)
    .filter((n) => n.tag === "text" && String(n.attrs["class"] ?? "").includes("mage-glyph"))
    .map((n) => n.text ?? "");
  // Step numbers, not a colour: the numbers on the diagram are the join key to the step list.
  assert.ok(glyphs.some((g) => g.includes("1")), "step 1 must be marked with its number");
  assert.ok(glyphs.some((g) => g.includes("3")), "step 3 must be marked with its number");
  // And each emphasized element says WHY in an attribute a non-visual reader can reach.
  const emphasized = walk(view.tree).filter((n) => n.attrs["data-emphasis"] !== undefined);
  assert.ok(emphasized.length > 0);
  for (const n of emphasized) {
    if (n.tag === "g") continue; // the group labels; the shape carries the reason
    assert.ok(
      String(n.attrs["data-emphasis-reason"] ?? "").length > 0,
      `${n.tag} is emphasized without a stated reason`,
    );
  }
});

test("bounded coverage draws evidence as inconclusive, never as a counterexample", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    evidence: { ...publishTrace(), role: "counterexample" },
    coverage: BOUNDED,
    outcome: "refuted",
  });
  const kinds = new Set(
    walk(view.tree)
      .map((n) => n.attrs["data-emphasis"])
      .filter((v): v is string => typeof v === "string"),
  );
  assert.ok(kinds.has("evidence-inconclusive"));
  assert.equal(kinds.has("violation"), false, "a truncated exploration must not be drawn as a disproof");
  assert.equal(view.tree.attrs["data-coverage"], "bounded");
});

test("selection is a treatment of its own and survives alongside evidence", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    selection: ["published"],
  });
  const node = walk(view.tree).find((n) => n.attrs["data-node-id"] === "published");
  assert.equal(node?.attrs["data-emphasis"], "selected");
  assert.equal(view.accessible.legend.map((l) => l.kind).includes("selected"), true);
});

test("de-emphasis dims by opacity and weight, not by washing out a colour", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    emphasis: [{ target: "failed", kind: "deemphasized", reason: "outside the current focus", step: null }],
  });
  const shape = walk(view.tree).find(
    (n) => n.tag === "rect" && String(n.attrs["data-emphasis"] ?? "") === "deemphasized",
  );
  assert.ok(shape, "the de-emphasized node must carry the treatment on its shape");
  assert.equal(shape.attrs["opacity"], MARKS.deemphasized.opacity);
  assert.equal(shape.attrs["stroke-width"], MARKS.deemphasized.strokeWidth);
  // Still fully present in the twin: de-emphasis is a visual focus device, not a removal.
  const node = view.accessible.nodes.find((n) => n.id === "failed");
  assert.ok(node);
  assert.match(node.description, /outside the current focus/);
});

test("an unnumbered evidence assignment still gets a non-colour channel", () => {
  // A caller may emphasize without an ordinal; stroke weight must still carry the distinction.
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    emphasis: [{ target: "reviewed", kind: "evidence", reason: "named in the result", step: null }],
  });
  const shape = walk(view.tree).find(
    (n) => n.tag === "rect" && String(n.attrs["data-emphasis"] ?? "") === "evidence",
  );
  assert.equal(shape?.attrs["stroke-width"], MARKS.evidence.strokeWidth);
  assert.notEqual(MARKS.evidence.strokeWidth, PLAIN_MARK.strokeWidth);
});

test("the legend is drawn only when a treatment is in use, and matches the twin", () => {
  const plain = machineView();
  assert.equal(plain.accessible.legend.length, 0);
  assert.equal(walk(plain.tree).some((n) => n.attrs["data-layer"] === "legend"), false);

  const marked = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    evidence: publishTrace(),
    coverage: EXHAUSTIVE,
  });
  const drawn = walk(marked.tree)
    .map((n) => n.attrs["data-legend-kind"])
    .filter((v): v is string => typeof v === "string");
  assert.deepEqual(drawn, marked.accessible.legend.map((l) => l.kind));
});

// -------------------------------------------------------------------------------------------
// Structure and stability of the emitted markup
// -------------------------------------------------------------------------------------------

test("the root carries role=img with a title and a description it actually points at", () => {
  const view = graphView();
  assert.equal(view.tree.attrs["role"], "img");
  const labelled = String(view.tree.attrs["aria-labelledby"] ?? "").split(" ");
  assert.equal(labelled.length, 2);
  const ids = walk(view.tree)
    .filter((n) => n.tag === "title" || n.tag === "desc")
    .map((n) => String(n.attrs["id"] ?? ""));
  for (const id of labelled) assert.ok(ids.includes(id), `aria-labelledby points at missing id ${id}`);
  assert.equal(walk(view.tree).find((n) => n.tag === "desc")?.text, view.accessible.summary);
});

test("the view carries the system hash it depicts", () => {
  const view = graphView();
  assert.equal(view.tree.attrs["data-system-hash"], view.accessible.systemHash);
  assert.match(String(view.tree.attrs["data-system-hash"]), /^fnv1a64:[0-9a-f]{16}$/);
});

test("serialization is byte-stable", () => {
  assert.equal(machineView().svg, machineView().svg);
  assert.equal(graphView().svg, graphView().svg);
  // Attribute order is sorted rather than insertion-dependent.
  const svg = serialize({ tag: "g", attrs: { z: "1", a: "2" }, text: null, children: [] });
  assert.equal(svg, '<g a="2" z="1"/>');
});

test("text content is XML-escaped", () => {
  const svg = serialize({ tag: "text", attrs: { d: 'a"b' }, text: "<&>", children: [] });
  assert.equal(svg, '<text d="a&quot;b">&lt;&amp;&gt;</text>');
});

test("properties requested for display appear as a sub-label, in the box", () => {
  const view = graphView();
  const texts = walk(view.tree)
    .filter((n) => n.tag === "text")
    .map((n) => n.text ?? "");
  assert.ok(texts.includes("classification: restricted"));
  assert.ok(texts.includes("accepts: public"));
});

test("every node and edge in the layout reaches the markup", () => {
  const view = machineView();
  const drawnNodes = new Set(
    walk(view.tree)
      .map((n) => n.attrs["data-node-id"])
      .filter((v): v is string => typeof v === "string"),
  );
  assert.deepEqual([...drawnNodes].sort(), [...view.layout.nodes.keys()].sort());
  const drawnEdges = new Set(
    walk(view.tree)
      .map((n) => n.attrs["data-edge-id"])
      .filter((v): v is string => typeof v === "string"),
  );
  const routable = view.layout.edges.filter((e) => e.points.length >= 2).map((e) => e.id);
  assert.deepEqual([...drawnEdges].sort(), [...routable].sort());
});

test("the initial state is marked in the picture as well as stated in the twin", () => {
  const view = machineView();
  const group = walk(view.tree).find((n) => n.attrs["data-node-id"] === "waiting");
  assert.equal(group?.attrs["data-initial"], "true");
  assert.ok(group?.children.some((c) => c.tag === "circle"), "an initial marker must be drawn");
  assert.equal(view.accessible.nodes.find((n) => n.id === "waiting")?.initial, true);
});

// -------------------------------------------------------------------------------------------
// The legend ruling: type semantics in a key, not repeated on every edge
//
// Nothing held any of this before. The author's complaint — `may_propagate_to` written on all six
// edges of a diagram — was true of a tree whose whole suite was green, and the three node shapes
// had been drawn since Wave 0 with nothing anywhere saying what they mean. A ruling with no gate
// behind it is a ruling the next wave reverts by accident, so these pin the shape of the fix in
// BOTH directions: the type labels must stay off the edges, and the event names must stay on.
// -------------------------------------------------------------------------------------------

const edgeTexts = (view: ReturnType<typeof renderView>, kind: string): readonly string[] =>
  walk(view.tree)
    .filter((n) => n.attrs["data-edge-kind"] === kind)
    .flatMap((g) => walk(g))
    .filter((n) => n.tag === "text" && typeof n.attrs["class"] === "string" && String(n.attrs["class"]).includes("mage-edge-label"))
    .map((n) => n.text ?? "");

test("a relation's TYPE is not written on the edge — it is one key row", () => {
  const view = renderView(docableSystem(), { subject: { kind: "model", id: "service-flow" } });
  const types = [...new Set(view.layout.edges.filter((e) => e.kind === "relation").map((e) => e.via))];
  assert.ok(types.length > 0, "service-flow must actually have relation types to key");

  assert.deepEqual(edgeTexts(view, "relation"), [], "a relation edge must carry no text");
  // Removed from the picture, NOT from the representation: the type is still the join key on the
  // edge, still in the key strip, and still in every edge's own description.
  for (const e of view.layout.edges.filter((x) => x.kind === "relation")) {
    assert.ok(e.via !== null, `relation ${e.id} lost its type`);
  }
  for (const t of types) {
    assert.ok(
      view.accessible.key.some((k) => k.channel === "relation" && k.id === t),
      `relation type ${String(t)} has no key row`,
    );
    assert.ok(
      view.accessible.edges.some((e) => e.kind === "relation" && e.via === t && e.description.includes(String(t))),
      `relation type ${String(t)} is not stated in any edge description`,
    );
  }
});

test("a transition's EVENT NAME is kept on the edge, because it is not a repeated type label", () => {
  // The correction to the ruling's premise. `acquire` and `retry` name different events on
  // different transitions: the text is topology-bearing, a key strip has nothing to say once, and
  // two states joined by two transitions are distinguishable only by these words.
  const view = machineView();
  const labelled = view.layout.edges.filter((e) => e.kind === "transition" && e.label !== null);
  assert.ok(labelled.length >= 2, "the document machine must have labelled transitions");
  const painted = edgeTexts(view, "transition");
  assert.deepEqual([...painted].sort(), labelled.map((e) => e.label as string).sort());
});

test("edge text is placed where the engine reserved room for it, not at a polyline vertex", () => {
  // "Text participates in layout" made checkable, and it took two attempts. Asserting this against
  // the real engine proves NOTHING: dagre reserves a label's box by inserting a dummy NODE into
  // the edge, so its label position IS the polyline's middle vertex and the two readings agree by
  // construction. Reverting the painter to the midpoint left this green — watched, on purpose.
  //
  // So the painter is tested against a STUB engine that puts the label somewhere the polyline
  // never goes. That is the contract that matters: the painter obeys the engine rather than
  // re-deriving a position, which is what makes a future engine's spacing decisions effective.
  const away: Point = { x: 4242, y: 2424 };
  const stub: LayoutEngine = (scene) => ({
    direction: "left-to-right",
    nodes: new Map(
      scene.nodes.map((n, i) => [
        n.id,
        { id: n.id, kind: n.kind, label: n.label, rect: { x: i * 200, y: 0, w: 110, h: 46 }, rank: i, order: 0, parent: n.parent, initial: n.initial, pinned: false },
      ]),
    ),
    edges: scene.edges
      .filter((e) => e.kind === "transition")
      .map((e) => ({
        id: e.id,
        kind: e.kind,
        from: e.from,
        to: e.to,
        label: e.label,
        via: e.via,
        backedge: false,
        selfLoop: false,
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }],
        labelPoint: away,
        subLabel: null,
      })),
    bounds: { x: 0, y: 0, w: 5000, h: 3000 },
    ranks: scene.nodes.map((n) => [n.id]),
  });
  const view = renderView(docableSystem(), { subject: { kind: "machine", id: "document" } }, { engine: stub });
  const labelled = view.layout.edges.filter((e) => e.label !== null);
  assert.ok(labelled.length >= 2, "the fixture must have labelled transitions to place");
  for (const e of labelled) {
    const group = walk(view.tree).find((n) => n.attrs["data-edge-id"] === e.id);
    const text = walk(group as SvgNode).find((n) => n.tag === "text" && String(n.attrs["class"] ?? "").includes("mage-edge-label"));
    assert.ok(text, `${e.id} has a label but paints no text`);
    assert.equal(Number(text.attrs["x"]), away.x, `${e.id}'s text ignored the reserved spot`);
    assert.ok(Math.abs(Number(text.attrs["y"]) - away.y) <= 6, `${e.id}'s text is not on the reserved baseline`);
  }

  // And against the real engine: every labelled edge gets a reserved spot at all. An engine that
  // returned `labelPoint: null` would silently fall back to the midpoint for every edge.
  for (const e of machineView().layout.edges) {
    if (e.label === null || e.points.length < 2) continue;
    assert.ok(e.labelPoint !== null, `${e.id} carries text but the engine reserved no spot for it`);
  }
});

test("the key explains the vocabulary in the picture AND in the twin, and is drawn without emphasis", () => {
  for (const view of [machineView(), graphView()]) {
    assert.ok(view.accessible.key.length > 0, "every diagram with shapes has a vocabulary to key");
    const layer = walk(view.tree).find((n) => n.attrs["data-layer"] === "key");
    assert.ok(layer, "the key must be DRAWN, not only carried in the twin");
    assert.deepEqual(
      layer.children.map((g) => `${String(g.attrs["data-key-channel"])}:${String(g.attrs["data-key-id"])}`),
      view.accessible.key.map((k) => `${k.channel}:${k.id}`),
      "the drawn key and the twin's key must be the same list, in the same order",
    );
    // Every node shape actually used gets a row; an unused shape must not be keyed.
    const kinds = new Set([...view.layout.nodes.values()].map((n) => n.kind));
    assert.deepEqual(
      view.accessible.key.filter((k) => k.channel === "shape").map((k) => k.id).sort(),
      [...kinds].sort(),
    );
    // The EMPHASIS legend is a different key with a different lifetime: absent until something is
    // emphasised, which is the property the a11y tier uses to prove a change reached its render.
    assert.equal(view.accessible.legend.length, 0);
    assert.equal(walk(view.tree).some((n) => n.attrs["data-layer"] === "legend"), false);
  }
});

test("relation types are distinguished by arrowhead FORM, so colour is never the only channel", () => {
  const view = renderView(docableSystem(), { subject: { kind: "model", id: "service-flow" } });
  const rows = view.accessible.key.filter((k) => k.channel === "relation");
  assert.ok(rows.length >= 2, "service-flow must have at least two relation types to confuse");
  // Distinct form AND distinct class per type: either channel alone identifies the type.
  assert.equal(new Set(rows.map((r) => r.form)).size, rows.length, "two relation types share an arrowhead form");
  assert.equal(new Set(rows.map((r) => r.className)).size, rows.length, "two relation types share a stroke class");
  // And the form the key advertises is the form the edge is actually drawn with.
  for (const row of rows) {
    const edge = view.layout.edges.find((e) => e.kind === "relation" && e.via === row.id);
    const group = walk(view.tree).find((n) => n.attrs["data-edge-id"] === edge?.id);
    assert.equal(group?.attrs["data-arrow-form"], row.form);
    assert.ok(
      String(walk(group as SvgNode).find((n) => n.tag === "polyline" && String(n.attrs["class"]).includes("mage-edge"))?.attrs["marker-end"]).includes(String(row.form)),
      `the ${row.id} edge does not use the ${row.form} head its key row promises`,
    );
  }
});

test("every class the renderer emits has a stylesheet rule, including the new key and relation ones", () => {
  // The 'class: null' incident shipped black boxes because a class reached no element; the mirror
  // failure is an element reaching no rule. Both directions now have a gate.
  const view = renderView(docableSystem(), {
    subject: { kind: "model", id: "service-flow" },
    emphasis: [{ target: "api", kind: "violation", reason: "r", step: null }],
  });
  const style = walk(view.tree).find((n) => n.tag === "style")?.text ?? "";
  const emitted = new Set(
    walk(view.tree)
      .flatMap((n) => String(n.attrs["class"] ?? "").split(/\s+/))
      .filter((c) => c.startsWith("mage-")),
  );
  // `mage-plain` is the ONE deliberate exception, and this gate found it. `PLAIN_MARK` exists so
  // `MARKS` can be compared against a named baseline; its class carries no treatment on purpose,
  // so an empty rule would be noise. Exempted by name rather than by a loose predicate, so a
  // SECOND unstyled class still fails here.
  assert.equal(PLAIN_MARK.className, "mage-plain");
  for (const c of [...emitted].sort()) {
    if (c === PLAIN_MARK.className) continue;
    assert.ok(style.includes(`.${c}`), `class ${c} is emitted but has no stylesheet rule`);
  }
  assert.ok(emitted.has("mage-key"), "the key's text class must actually be emitted");
  assert.ok([...emitted].some((c) => /^mage-rel-[a-d]$/.test(c)), "a relation stroke class must be emitted");
});

// -------------------------------------------------------------------------------------------
// Declared attributes reach the picture (the device-memory channel gap)
// -------------------------------------------------------------------------------------------

/**
 * The author's case, reproduced: three threads, memory quantities, one qualifying clause too long
 * for a box. The twin always carried these attributes; the picture used to show bare labels unless
 * a caller opted in, which made the visual channel the poorer one.
 */
const deviceMemorySystem = (): ReturnType<typeof docableSystem> =>
  canonicalize(
    parse(`
mage: 1
system:
  name: Device Memory
entities:
  thread-a:
    type: thread
    label: Thread A
    properties:
      holds: { value: held while thread-a-exec.running is active }
  thread-b:
    type: thread
    label: Thread B
  thread-c:
    type: thread
    label: Thread C
models:
  device-memory:
    type: graph
    label: Device Memory
    purpose:
      question: Which thread holds how much memory?
      represents: [each thread's declared memory]
      omits: [allocator fragmentation]
    entities: [thread-a, thread-b, thread-c]
quantities:
  thread-a-sram:
    target: entity:thread-a
    dimension: memory
    value: 20 KB
    residency: resident
  thread-b-sram:
    target: entity:thread-b
    dimension: memory
    value: 20 KB
    when: { state: thread-b-exec.running }
`),
  );

const deviceMemoryView = () => renderView(deviceMemorySystem(), { subject: { kind: "model", id: "device-memory" } });

test("declared attributes render in the node by default, from the same list the twin carries", () => {
  const view = deviceMemoryView();
  const texts = walk(view.tree)
    .filter((n) => n.tag === "text" && String(n.attrs["class"]) === "mage-sublabel")
    .map((n) => n.text ?? "");
  assert.ok(texts.length > 0, "no sub-labels rendered at all — the probe found nothing to measure");
  // Parity: every rendered line IS a `name: value` from the twin's own property list. The twin is
  // the source of truth for WHAT to show; a line with no twin fact behind it would be drift.
  const twinLines = new Set(view.accessible.nodes.flatMap((n) => n.properties.map((p) => `${p.name}: ${p.value}`)));
  for (const t of texts) assert.ok(twinLines.has(t), `sub-label "${t}" states a fact the twin does not carry`);
  // The declared quantity literals, verbatim — never re-rounded, never re-united.
  assert.ok(texts.includes("memory: 20 KB"));
});

test("a value too long for the box renders nowhere in the picture and stays whole in the twin", () => {
  const view = deviceMemoryView();
  const texts = walk(view.tree)
    .filter((n) => n.tag === "text")
    .map((n) => n.text ?? "");
  assert.ok(texts.length > 0, "no text rendered at all — the probe found nothing to measure");
  // Never an ellipsis, never a prefix: the qualifying clause is absent from the picture entirely…
  for (const t of texts) assert.equal(t.includes("held while"), false, `clause leaked into the picture as "${t}"`);
  // …and whole in the accessible description, where it keeps its meaning.
  const a = view.accessible.nodes.find((n) => n.id === "thread-a");
  assert.match(a?.description ?? "", /holds is held while thread-a-exec\.running is active/);
  // The rule is the substrate's own fit test, not a hand-copied character count.
  const line = "holds: held while thread-a-exec.running is active";
  assert.ok(
    2 * METRICS.padX + textExtent(line, "mage-sublabel").w > METRICS.nodeMaxWidth,
    "fixture rot: the long clause now fits a node, so this test no longer exercises the rule",
  );
  assert.deepEqual(inNodeLines([{ name: "holds", value: "held while thread-a-exec.running is active" }], null), []);
});

test("an entity declaring nothing renders exactly as today, and the box grows only under its lines", () => {
  const view = deviceMemoryView();
  const bare = view.layout.nodes.get("thread-c");
  assert.ok(bare !== undefined, "thread-c missing from the layout — the probe found nothing to measure");
  assert.equal(bare.rect.h, METRICS.nodeHeight);
  const annotated = view.layout.nodes.get("thread-a");
  assert.ok(annotated !== undefined);
  // thread-a's long `holds` clause reserves nothing; only the one line that RENDERS adds height.
  assert.equal(annotated.rect.h, METRICS.nodeHeight + SUBLABEL_PITCH);
});

test("the key names the attribute lines when they render, and stays quiet when they do not", () => {
  const annotated = deviceMemoryView();
  const entityRow = annotated.accessible.key.find((k) => k.channel === "shape" && k.id === "entity");
  assert.match(entityRow?.meaning ?? "", /small text inside lists its declared attributes/);
  // Narrowed to nothing, the channel is absent and the key must not promise it.
  const quiet = renderView(deviceMemorySystem(), {
    subject: { kind: "model", id: "device-memory" },
    showProperties: [],
  });
  const quietRow = quiet.accessible.key.find((k) => k.channel === "shape" && k.id === "entity");
  assert.equal(quietRow?.meaning.includes("small text"), false);
  const quietSubs = walk(quiet.tree).filter((n) => n.tag === "text" && String(n.attrs["class"]) === "mage-sublabel");
  assert.deepEqual(quietSubs, []);
});
