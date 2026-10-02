/**
 * FR-A11Y-2: the structured twin states everything the picture shows.
 *
 * The parity test (`nothing reaches the picture without reaching the twin`) is the one that keeps
 * this honest as the renderer grows: it walks the emitted markup, collects every node and edge the
 * SVG actually draws, and demands the twin account for each one. A later edit that adds a visual
 * element without a semantic counterpart fails here rather than at a screen-reader audit.
 *
 * V22 gets its own group. Bounded coverage must not be presented as a disproof, and that rule
 * belongs in the component that writes the sentence, not in the UI that displays it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeEvidence, evidenceEmphasisKind, presentableOutcome, renderView } from "../src/render/index.ts";
import type { SvgNode } from "../src/render/index.ts";
import {
  BOUNDED,
  EXHAUSTIVE,
  docableSystem,
  flowCounterexample,
  publishTrace,
  retryLasso,
} from "./render-fixtures.ts";

const walk = (n: SvgNode, out: SvgNode[] = []): SvgNode[] => {
  out.push(n);
  for (const c of n.children) walk(c, out);
  return out;
};

const machine = () => renderView(docableSystem(), { subject: { kind: "machine", id: "document" } });
const graph = () => renderView(docableSystem(), { subject: { kind: "model", id: "service-flow" } });

// -------------------------------------------------------------------------------------------
// Parity
// -------------------------------------------------------------------------------------------

test("nothing reaches the picture without reaching the twin", () => {
  for (const view of [machine(), graph()]) {
    const drawn = walk(view.tree);
    const twinNodes = new Set(view.accessible.nodes.map((n) => n.id));
    const twinEdges = new Set(view.accessible.edges.map((e) => e.id));
    for (const n of drawn) {
      const nodeId = n.attrs["data-node-id"];
      if (typeof nodeId === "string") assert.ok(twinNodes.has(nodeId), `${nodeId} is drawn but not described`);
      const edgeId = n.attrs["data-edge-id"];
      if (typeof edgeId === "string") assert.ok(twinEdges.has(edgeId), `${edgeId} is drawn but not described`);
    }
    for (const n of view.accessible.nodes) assert.ok(n.description.length > 0, `${n.id} has no description`);
    for (const e of view.accessible.edges) assert.ok(e.description.length > 0, `${e.id} has no description`);
  }
});

test("the renderer cannot hand back a picture without its twin", () => {
  // Structural, not conventional: RenderedView has no variant that omits `accessible`, and the
  // module exports no function returning a bare string.
  const view = machine();
  assert.equal(typeof view.svg, "string");
  assert.ok(view.accessible.nodes.length > 0);
  assert.ok(view.accessible.summary.length > 0);
  assert.equal(Object.keys(view).sort().join(","), "accessible,layout,svg,tree");
});

test("containment is restated as a relation, not carried by enclosure alone", () => {
  const view = graph();
  const region = view.accessible.nodes.find((n) => n.id === "remediation");
  assert.ok(region);
  assert.deepEqual(region.contains, ["parser", "repair-engine"]);
  assert.match(region.description, /contains "parser", "repair-engine"/);
  for (const child of ["parser", "repair-engine"]) {
    const c = view.accessible.nodes.find((n) => n.id === child);
    assert.equal(c?.parent, "remediation");
    assert.match(c?.description ?? "", /contained in "remediation"/);
  }
  // And as an explicit edge, so a tree view can be built without reading geometry.
  const edges = view.accessible.edges.filter((e) => e.kind === "containment");
  assert.deepEqual(edges.map((e) => e.to).sort(), ["parser", "repair-engine"]);
});

test("direction of an arrow is available as a from/to pair, not as geometry", () => {
  const view = machine();
  const retry = view.accessible.edges.find((e) => e.label === "retry");
  assert.ok(retry);
  assert.equal(retry.from, "failed");
  assert.equal(retry.to, "waiting");
  assert.equal(retry.backedge, true, "the routing decision is reported, not inferred from points");
  assert.match(retry.description, /Transition from "failed" to "waiting"/);
});

test("guards and effects reach the twin, not only the edge label", () => {
  const view = machine();
  const retry = view.accessible.edges.find((e) => e.label === "retry");
  assert.match(retry?.description ?? "", /requires retry_count < 3/);
  assert.match(retry?.description ?? "", /retry_count := retry_count \+ 1/);
  const review = view.accessible.edges.find((e) => e.label === "review");
  assert.match(review?.description ?? "", /requires worker\.state = held/);
});

test("properties reach the twin even when nothing asks to display them", () => {
  const view = graph(); // no showProperties
  const api = view.accessible.nodes.find((n) => n.id === "api");
  assert.deepEqual(api?.properties, [{ name: "accepts", value: "restricted", domain: "sensitivity" }]);
  assert.match(api?.description ?? "", /accepts is restricted/);
});

test("the model's purpose and omissions reach the summary", () => {
  const view = graph();
  assert.match(view.accessible.summary, /Which services may invoke which other services\?/);
  // V24: what the model deliberately does NOT represent is part of reading it correctly.
  assert.match(view.accessible.summary, /Deliberately omits: observed runtime calls/);
});

test("reading order is stated as an index and never as the meaning", () => {
  const view = machine();
  const indices = view.accessible.nodes.map((n) => n.readingIndex);
  assert.deepEqual(indices, [...indices].sort((a, b) => a - b));
  assert.deepEqual(indices, Array.from({ length: indices.length }, (_, i) => i + 1));
  // The initial state leads the reading order because it leads the ranking, and it is ALSO flagged.
  assert.equal(view.accessible.nodes[0]?.id, "waiting");
  assert.equal(view.accessible.nodes[0]?.initial, true);
});

test("the twin carries the system hash, so a stale view is detectable", () => {
  const view = machine();
  assert.match(view.accessible.systemHash, /^fnv1a64:/);
  assert.match(view.accessible.summary, /System: fnv1a64:/);
});

// -------------------------------------------------------------------------------------------
// Evidence as a list of steps
// -------------------------------------------------------------------------------------------

test("a witness is a numbered list of steps before it is a coloured path", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    evidence: publishTrace(),
    coverage: EXHAUSTIVE,
    outcome: "holds",
  });
  const ev = view.accessible.evidence;
  assert.ok(ev);
  assert.equal(ev.shape, "trace");
  assert.equal(ev.role, "witness");
  assert.deepEqual(ev.steps.map((s) => s.index), [1, 2, 3]);
  // Step 1 is the synchronized event, and says so, with both participants' changes.
  assert.match(ev.steps[0]?.description ?? "", /synchronized event "acquire" fires/);
  assert.deepEqual(ev.steps[0]?.changes, ["document: waiting -> processing", "worker: idle -> held"]);
  assert.match(ev.steps[1]?.description ?? "", /takes "review"/);
  assert.deepEqual(ev.steps[2]?.changes, ["document: reviewed -> published"]);
  assert.equal(ev.cycleStartIndex, null);
});

test("each step of the witness is joined to the diagram by its number", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    evidence: publishTrace(),
    coverage: EXHAUSTIVE,
  });
  const publish = view.accessible.edges.find((e) => e.label === "publish");
  assert.ok(publish);
  assert.deepEqual(publish.emphasis.map((a) => a.step), [3]);
  assert.equal(publish.emphasis[0]?.kind, "evidence");
  assert.match(publish.emphasis[0]?.reason ?? "", /step 3 of the witness/);
  // The states the trace occupies are emphasized too, with the same step numbers.
  const processing = view.accessible.nodes.find((n) => n.id === "processing");
  assert.deepEqual(
    processing?.emphasis.map((a) => a.step),
    [1, 2],
  );
});

test("a lasso names where the repeating suffix begins", () => {
  const ev = describeEvidence(retryLasso(), EXHAUSTIVE);
  assert.equal(ev.shape, "lasso");
  assert.equal(ev.cycleStartIndex, 3);
  assert.deepEqual(ev.steps.map((s) => s.inCycle), [false, false, true]);
  assert.match(ev.steps[2]?.description ?? "", /inside the repeating cycle/);
  assert.match(ev.description, /2 steps then a cycle of 1/);
});

test("graph evidence emphasizes the path AND the hops that carried it", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "model", id: "data-classification" },
    evidence: flowCounterexample(),
    coverage: EXHAUSTIVE,
    outcome: "refuted",
  });
  const path = view.accessible.nodes.filter((n) => n.emphasis.length > 0).map((n) => n.id);
  assert.deepEqual(path, ["api", "remediation", "gateway"]);
  const hops = view.accessible.edges.filter((e) => e.emphasis.length > 0).map((e) => e.id);
  assert.deepEqual(hops, ["flow-api-remediation", "flow-remediation-gateway"]);
  // Exhaustive coverage + counterexample is the one case that earns the violation treatment.
  assert.equal(view.accessible.edges.find((e) => e.id === "flow-api-remediation")?.emphasis[0]?.kind, "violation");
});

test("evidence for another machine does not leak into this machine's view", () => {
  // The trace moves `worker` as well as `document`; the document view must emphasize only states
  // that exist in it.
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "worker" },
    evidence: publishTrace(),
    coverage: EXHAUSTIVE,
  });
  const emphasized = view.accessible.nodes.filter((n) => n.emphasis.length > 0).map((n) => n.id).sort();
  assert.deepEqual(emphasized, ["held", "idle"]);
  const acquire = view.accessible.edges.find((e) => e.via === "acquire");
  assert.deepEqual(acquire?.emphasis.map((a) => a.step), [1]);
});

// -------------------------------------------------------------------------------------------
// V22 — bounded coverage never reads as a disproof
// -------------------------------------------------------------------------------------------

test("bounded coverage is never presented as refuted", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    evidence: { ...publishTrace(), role: "counterexample" },
    coverage: BOUNDED,
    outcome: "refuted",
  });
  // The engine's own value is preserved verbatim — the renderer does not rewrite its input...
  assert.equal(view.accessible.outcome, "refuted");
  // ...but nothing this view SAYS presents it as a disproof.
  assert.equal(presentableOutcome("refuted", BOUNDED), "inconclusive");
  assert.equal(/refut/i.test(view.accessible.summary), false, `summary read as a disproof: ${view.accessible.summary}`);
  assert.match(view.accessible.summary, /Result: inconclusive/);
  assert.match(view.accessible.summary, /absence of evidence proves nothing/);
  assert.match(view.accessible.summary, /stopped at the state limit after 1000 configurations/);
  // And no element anywhere gets the counterexample treatment.
  for (const item of [...view.accessible.nodes, ...view.accessible.edges]) {
    for (const a of item.emphasis) assert.notEqual(a.kind, "violation");
  }
  assert.equal(view.accessible.legend.map((l) => l.kind).includes("evidence-inconclusive"), true);
});

test("the evidence description itself carries the caveat", () => {
  const ev = describeEvidence(publishTrace(), BOUNDED);
  assert.match(ev.description, /candidate rather than a proof/);
  assert.equal(describeEvidence(publishTrace(), EXHAUSTIVE).description.includes("candidate"), false);
});

test("the coverage downgrade applies to witnesses and counterexamples alike", () => {
  assert.equal(evidenceEmphasisKind("witness", EXHAUSTIVE), "evidence");
  assert.equal(evidenceEmphasisKind("counterexample", EXHAUSTIVE), "violation");
  assert.equal(evidenceEmphasisKind("witness", BOUNDED), "evidence-inconclusive");
  assert.equal(evidenceEmphasisKind("counterexample", BOUNDED), "evidence-inconclusive");
  assert.equal(evidenceEmphasisKind("witness", null), "evidence");
});

test("exhaustive coverage is reported as such, with its count", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    outcome: "holds",
    coverage: EXHAUSTIVE,
  });
  assert.match(view.accessible.summary, /Coverage: exhaustive over 24 configurations/);
  assert.match(view.accessible.summary, /Result: holds/);
});

// -------------------------------------------------------------------------------------------
// Refusal is a result, not an error
// -------------------------------------------------------------------------------------------

test("an unlicensed result reaches the twin as a refusal with its reason", () => {
  const refusal =
    "`owns` is declared as a direct relation without path-composition semantics. A multi-hop `owns` query is refused.";
  const view = renderView(docableSystem(), {
    subject: { kind: "model", id: "service-flow" },
    outcome: "unlicensed",
    refusal,
    coverage: { kind: "not-applicable", statesExplored: 0, reason: null },
  });
  assert.equal(view.accessible.outcome, "unlicensed");
  assert.equal(view.accessible.refusal, refusal);
  assert.match(view.accessible.summary, /Result: unlicensed/);
  assert.ok(view.accessible.summary.includes(refusal));
  assert.match(view.accessible.summary, /Coverage: not applicable/);
  assert.equal(view.tree.attrs["data-outcome"], "unlicensed");
  // A refusal is a successful result: there is still a diagram.
  assert.ok(view.accessible.nodes.length > 0);
});

test("a view with no result at all states no outcome rather than inventing one", () => {
  const view = machine();
  assert.equal(view.accessible.outcome, null);
  assert.equal(view.accessible.coverage, null);
  assert.equal(view.accessible.evidence, null);
  assert.equal(/Result:/.test(view.accessible.summary), false);
  assert.equal(/Coverage:/.test(view.accessible.summary), false);
});

// -------------------------------------------------------------------------------------------
// Legend
// -------------------------------------------------------------------------------------------

test("the legend explains the non-colour channels it actually used", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    selection: ["published"],
    emphasis: [{ target: "failed", kind: "added", reason: "added by the hypothesis", step: null }],
  });
  const kinds = view.accessible.legend.map((l) => l.kind);
  assert.deepEqual(kinds, ["selected", "added"]);
  for (const entry of view.accessible.legend) {
    assert.ok(entry.meaning.length > 0);
    assert.ok(entry.strokeWidth > 0, "a legend entry must name a non-colour channel");
  }
  assert.match(
    view.accessible.legend.find((l) => l.kind === "added")?.meaning ?? "",
    /present in the hypothesis but not in the current model/,
  );
});

test("a hypothesis diff renders on the same layout with each change stated", () => {
  const base = machine();
  const hints = new Map([...base.layout.nodes.values()].map((n) => [n.id, { x: n.rect.x, y: n.rect.y }]));
  const hypothesis = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    hints,
    emphasis: [
      { target: "published", kind: "changed", reason: "the hypothesis adds a guard on publish", step: null },
      { target: "t:document:4", kind: "removed", reason: "the hypothesis deletes the retry transition", step: null },
    ],
  });
  // Same layout: the comparison is readable because nothing moved.
  for (const [id, p] of hints) {
    assert.deepEqual({ x: hypothesis.layout.nodes.get(id)?.rect.x, y: hypothesis.layout.nodes.get(id)?.rect.y }, p);
  }
  assert.match(
    hypothesis.accessible.nodes.find((n) => n.id === "published")?.description ?? "",
    /the hypothesis adds a guard on publish/,
  );
  assert.match(
    hypothesis.accessible.edges.find((e) => e.id === "t:document:4")?.description ?? "",
    /the hypothesis deletes the retry transition/,
  );
});
