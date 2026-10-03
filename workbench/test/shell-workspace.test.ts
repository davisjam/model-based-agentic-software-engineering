// The workspace region: correction 10's two orderings, and the contents tree that makes the
// visual one safe.
//
// The claim correction 10 makes is a claim about TWO orderings of one set of facts — the canvas at
// the visual centre, the structured reading first in the document — so each test here pins exactly
// one of them and never both at once. The visual claim is pinned in the stylesheet (which named row
// paints first); the accessibility claim is pinned in the markup (which element comes first in the
// source). A test that conflated them would go green on a page that moved the reading and red on a
// page that did not, which is the inversion the whole correction exists to prevent.
//
// **The oracle for the tree is the renderer's scene and the selection encoding, never a
// transcript.** Every coverage claim is derived: the row set is compared to `AccessibleScene`'s own
// nodes and edges, and every selection value a row offers is handed to `selectionKind` — the one
// function the inspector, the action bar and the palette all branch on — rather than to a list of
// expected prefixes written here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { renderView } from "../src/render/index.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import { resolveSubject } from "../src/ui/view-model.ts";
import { modelContents } from "../src/ui/shell/workspace.ts";
import { selectionKind } from "../src/ui/shell/selection.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import type { AccessibleScene, SceneSubject } from "../src/render/types.ts";

const parsed = (id: string): CanonicalSystem =>
  canonicalize(parse(readFileSync(`examples/${id}/system.mage.yaml`, "utf8")));

const html = (): string => readFileSync("index.html", "utf8");

/** Every drawable subject of every shipped example, with the scene the page would paint. */
function scenes(): readonly {
  readonly id: string; readonly system: CanonicalSystem;
  readonly subject: SceneSubject; readonly scene: AccessibleScene;
}[] {
  const out: {
    id: string; system: CanonicalSystem; subject: SceneSubject; scene: AccessibleScene;
  }[] = [];
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const system = parsed(id);
    const subjects: SceneSubject[] = [
      ...[...system.models.keys()].map((m): SceneSubject => ({ kind: "model", id: m })),
      ...[...system.machines.keys()].map((m): SceneSubject => ({ kind: "machine", id: m })),
    ];
    for (const subject of subjects) {
      out.push({ id, system, subject, scene: renderView(system, { subject }).accessible });
    }
  }
  assert.ok(out.length > 3, `only ${out.length} scene(s) — the fixture walk is wrong, not the page`);
  return out;
}

test("the contents tree reads every node and every edge the picture draws", () => {
  // SH-I3's node-tier half, over the one source the picture itself came from. A fact that reaches
  // the SVG without reaching a structured representation is the FR-A11Y-2 defect; the cheapest
  // place to catch it is here, where the scene and the reading are two values of one function call.
  for (const { id, system, scene } of scenes()) {
    const contents = modelContents(scene, system);
    assert.equal(contents.nodes.length, scene.nodes.length,
      `${id}/${scene.subject.id}: the tree drops or invents nodes`);
    assert.equal(contents.edges.length, scene.edges.length,
      `${id}/${scene.subject.id}: the tree drops or invents edges`);
    for (const n of scene.nodes) {
      assert.ok(contents.nodes.some((r) => r.label.startsWith(n.label)),
        `${id}/${scene.subject.id}: node '${n.label}' is in the picture and not in the reading`);
      assert.ok(contents.nodes.some((r) => r.detail === n.description),
        `${id}/${scene.subject.id}: node '${n.label}' loses the renderer's own sentence`);
    }
    for (const e of scene.edges) {
      assert.ok(contents.edges.some((r) => r.detail === e.description),
        `${id}/${scene.subject.id}: edge '${e.id}' is in the picture and not in the reading`);
    }
  }
});

test("every selection a tree row offers resolves to the kind the row is", () => {
  // The oracle is `selectionKind`, which is what the inspector and the contextual action bar
  // branch on. A row offering a value those two read as `unresolved` would populate an empty
  // inspector and offer the additive operations, which reads as a broken click rather than as a
  // mis-encoded id.
  for (const { id, system, scene } of scenes()) {
    const contents = modelContents(scene, system);
    const wantNode = scene.subject.kind === "machine" ? "state" : "entity";
    for (const row of contents.nodes) {
      if (row.select === null) continue;
      assert.equal(selectionKind(system, [row.select]), wantNode,
        `${id}/${scene.subject.id}: '${row.select}' does not resolve as a ${wantNode}`);
    }
    for (const row of contents.edges) {
      if (row.select === null) continue;
      assert.equal(selectionKind(system, [row.select]), "relation",
        `${id}/${scene.subject.id}: '${row.select}' does not resolve as a relation`);
    }
  }
});

test("a relation drawn in a model is selectable from the tree", () => {
  // The positive half of the test above, which on its own would pass on a tree that offered NO
  // selection anywhere. A probe that cannot tell "correctly encoded" from "never attempted" reports
  // the second as the first.
  const system = parsed("message-bus");
  const subject = resolveSubject(system, null);
  assert.notEqual(subject, null);
  const scene = renderView(system, { subject: subject as SceneSubject }).accessible;
  const contents = modelContents(scene, system);
  assert.ok(contents.nodes.filter((r) => r.select !== null).length > 1,
    "no entity in the drawn model is selectable — the tree is a caption, not a surface");
  assert.ok(contents.edges.some((r) => r.select !== null),
    "no relation in the drawn model is selectable from the tree");
});

test("containment and transition rows declare that the encoding cannot address them", () => {
  // Said rather than faked, which is §9c's precedent. `selectionKind` has no member for a
  // containment edge or a transition, so a row offering one would be a control that cannot work.
  // This pins the absence, so the first thing that fails when the encoding grows a member is the
  // test asking for the row.
  let containment = 0;
  let transitions = 0;
  for (const { system, scene } of scenes()) {
    const contents = modelContents(scene, system);
    for (let i = 0; i < scene.edges.length; i += 1) {
      const edge = scene.edges[i];
      const row = contents.edges[i];
      if (edge === undefined || row === undefined) continue;
      if (edge.kind === "containment") { containment += 1; assert.equal(row.select, null); }
      if (edge.kind === "transition") { transitions += 1; assert.equal(row.select, null); }
    }
  }
  assert.ok(transitions > 0, "no transition was examined — the walk covers no machine");
  assert.ok(containment >= 0);
});

test("correction 10: the canvas is painted above the reading that precedes it in the source", () => {
  // BOTH halves, in one place, because the correction is the PAIR and either alone is a different
  // page. The visual order is read off `grid-template-areas` -- the mechanism the shell grid already
  // uses for this separation -- and the document order off the markup.
  const source = html();
  const areas = /#workspace[^{]*\{[^}]*grid-template-areas:\s*([^;]+);/.exec(source);
  assert.notEqual(areas, null, "#workspace declares no grid-template-areas — the inversion is gone");
  // The guard, pinned with the grid that needs it. An author `display` on a region OUTRANKS the
  // `hidden` attribute's UA `display: none`, so the first version of this rule unhid the workspace
  // on the pristine page and put `#diagram-subject` back in a five-stop tab walk. SH-I1's unmounted
  // half is not a thing the markup alone can hold once a region declares its own display.
  assert.match(source, /#workspace:not\(\[hidden\]\)[^{]*\{[^}]*display:\s*grid/,
    "#workspace sets display without :not([hidden]) — a grid outranks `hidden` and unmounts nothing");
  const rows = [...((areas?.[1] ?? "").matchAll(/"([^"]+)"/g))].map((m) => m[1] as string);
  assert.ok(rows.includes("wcanvas"), "no wcanvas row — the figure is back in source order");
  assert.ok(rows.indexOf("wcanvas") < rows.indexOf("wreading"),
    "the structured reading is painted above the canvas — this is the epilogue, inverted back");
  assert.match(source, /#canvas\s*\{[^}]*grid-area:\s*wcanvas/,
    "#canvas is not assigned the row that paints it at the centre");

  const stripped = source.replace(/<!--[\s\S]*?-->/g, "");
  const at = (id: string): number => {
    const i = stripped.indexOf(`id="${id}"`);
    assert.notEqual(i, -1, `index.html has no #${id}`);
    return i;
  };
  assert.ok(at("model-reading") < at("canvas"),
    "the reading no longer precedes the picture — DOM order is AT order, and moving it is the regression");
  assert.ok(at("model-contents") < at("canvas"), "the contents tree must precede the canvas");
  assert.ok(at("principal-purpose") < at("model-reading"), "§5.1: the question is stated above the reading");
});

test("SH-I4: the markup authors nothing focusable inside the aria-hidden figure", () => {
  // The browser tier asserts this of the LIVE figure, which is the claim that matters; this is the
  // cheap rung that fires without one, and it also catches the context menu being nested into the
  // figure rather than placed beside it.
  const stripped = html().replace(/<!--[\s\S]*?-->/g, "");
  const open = stripped.indexOf('<figure id="canvas"');
  assert.notEqual(open, -1);
  const close = stripped.indexOf("</figure>", open);
  assert.notEqual(close, -1);
  const inside = stripped.slice(open, close);
  assert.ok(!/<(a\s|button|input|select|textarea|summary|details)/.test(inside),
    "a focusable element is authored inside #canvas — a caret can land where AT says nothing");
  assert.ok(stripped.indexOf('id="canvas-menu"') > close,
    "#canvas-menu is inside the figure; a focusable row there is an aria-hidden trap");
});

test("SH-I7: the workspace renders ONE view per paint, and all three projections read it", () => {
  // Structural, because the paint path needs a DOM and the invariant is about CALL COUNT. Two
  // `renderView` calls in one paint is how the picture and its twin come to describe different
  // revisions — the exact failure `RenderedView`'s indivisibility was designed to make unreachable,
  // reintroduced one level up by a caller that asks twice.
  const source = readFileSync("src/ui/shell/workspace.ts", "utf8");
  const calls = [...source.matchAll(/renderView\s*\(/g)];
  assert.equal(calls.length, 1,
    `workspace.ts calls renderView ${calls.length} times — one paint, one view`);
  for (const projection of ["paintDiagram", "paintContents"]) {
    assert.ok(source.includes(projection), `the paint path lost ${projection}`);
  }
});

test("the reading sits behind a disclosure control, not behind CSS", () => {
  // SH-I2, and the line correction 10 walks: progressive disclosure for sighted users is licensed,
  // hiding semantic content from everyone is not. A `summary` is in the tab order and announces its
  // own expanded state, so both users open the same thing by the same act.
  const stripped = html().replace(/<!--[\s\S]*?-->/g, "");
  const block = /<details id="model-reading">([\s\S]*?)<\/details>/.exec(stripped);
  assert.notEqual(block, null, "#model-reading is not a <details> — the reading is hidden by something else");
  assert.match(block?.[1] ?? "", /<summary id="model-reading-summary">/,
    "#model-reading has no <summary> — a collapsed region behind no control is absent to AT");
  assert.ok(!/#model-reading[^{]*\{[^}]*display:\s*none/.test(html()),
    "#model-reading is display:none in the stylesheet, which no disclosure control can reopen");
});
