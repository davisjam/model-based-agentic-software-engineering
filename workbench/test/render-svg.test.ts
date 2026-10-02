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
import { MARKS, PLAIN_MARK, renderView, serialize } from "../src/render/index.ts";
import type { EmphasisKind, MarkStyle, SvgNode } from "../src/render/index.ts";
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
