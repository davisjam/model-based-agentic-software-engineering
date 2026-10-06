/**
 * The claims channel: tracked claims drawn as node sub-lines, twinned, caller-supplied.
 *
 * Pins the contract the viewer surface depends on — a claim passed on the request reaches the
 * node's box as a `glyph statement` sub-line AND the structured twin, under the same fit rule
 * declared attributes obey: a line too wide for the box renders NOWHERE in the picture while the
 * twin still carries the whole claim. The renderer computes no verdict; what the caller passes is
 * what both channels say.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderView } from "../src/render/index.ts";
import type { NodeClaim, SvgNode } from "../src/render/types.ts";
import { docableSystem } from "./render-fixtures.ts";

const CLAIM: NodeClaim = {
  target: "processing",
  property: "no-message-lost",
  glyph: "✗",
  word: "REFUTED",
  statement: "No message is lost",
};

const texts = (n: SvgNode, out: string[] = []): string[] => {
  if (n.tag === "text" && n.text !== null) out.push(n.text);
  for (const c of n.children) texts(c, out);
  return out;
};

test("a node claim renders as a sub-line in the box AND in the twin", () => {
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    claims: [CLAIM],
  });
  // Precondition: the subject actually has the target state — a claim against a node the scene
  // does not draw would make every assertion below vacuous.
  const node = view.accessible.nodes.find((n) => n.id === "processing");
  assert.ok(node !== undefined, "the document machine must draw a 'processing' state");
  assert.deepEqual(node.claims, [CLAIM], "the twin carries the claim verbatim");
  assert.match(node.description, /participates in claim "No message is lost" — REFUTED/);
  assert.ok(
    texts(view.tree).includes("✗ No message is lost"),
    "the picture carries the glyph-plus-statement sub-line",
  );
  // The key names the convention, so the small text is not a private code.
  const stateRow = view.accessible.key.find((k) => k.channel === "shape" && k.id === "state");
  assert.ok(stateRow !== undefined, "the key has a row for the state shape");
  assert.match(stateRow.meaning, /tracked claims/);
});

test("an over-wide claim renders nowhere in the picture and whole in the twin", () => {
  const wide: NodeClaim = {
    ...CLAIM,
    statement:
      "No message accepted by the bus is ever lost before a consumer has successfully processed "
      + "it, under every interleaving the models license",
  };
  const view = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    claims: [wide],
  });
  const node = view.accessible.nodes.find((n) => n.id === "processing");
  assert.ok(node !== undefined, "the document machine must draw a 'processing' state");
  assert.deepEqual(node.claims, [wide], "the twin still carries the whole claim");
  assert.ok(
    !texts(view.tree).some((t) => t.includes("No message accepted")),
    "no truncated fragment of the claim reaches the picture",
  );
});

test("without claims the request renders exactly as before", () => {
  const bare = renderView(docableSystem(), { subject: { kind: "machine", id: "document" } });
  const withEmpty = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    claims: [],
  });
  assert.equal(bare.svg, withEmpty.svg, "an empty claim set is the absent claim set");
  for (const n of bare.accessible.nodes) assert.deepEqual(n.claims, []);
});
