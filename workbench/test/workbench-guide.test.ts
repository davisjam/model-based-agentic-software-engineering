// The explanatory prose MOVED. It was not copied, and it does not come back.
//
// THE FAILURE THIS CLOSES. "Move the verbose prose into Learn" is the kind of instruction a wave
// satisfies by writing the new page and forgetting the old paragraph, which leaves both surfaces
// verbose and the reader with two accounts of one thing that are free to disagree. Nothing in a
// type system notices: the Learn page compiles, the panes compile, and every existing gate stays
// green because no gate reads prose.
//
// So the move is declared and then CHECKED in both directions. `src/learn/workbench-guide.ts`
// records, per section, the surface it took prose off and a phrase that must no longer be in that
// surface. This file reads those files. A copy fails it on the day it lands; a later wave putting
// the verbose sentence back fails it then, while the Learn page is still claiming to own it.
//
// WHAT IT DOES NOT CLAIM. It does not check that the moved sentence ARRIVED — the section's blocks
// are what arrived, and comparing prose to prose would pin wording that is meant to be edited. It
// checks the half that rots silently: the surface that was supposed to go quiet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { GUIDE_ANCHORS, WORKBENCH_GUIDE } from "../src/learn/workbench-guide.ts";
import { anchorForType, anchorForUse, MODEL_TYPE_USES } from "../src/app/learn.ts";
import { MODEL_TYPES } from "../src/engine/model-types.ts";

test("every surface a guide section vacated no longer carries the prose", () => {
  // The scan's own breadth first. A declaration table nobody reads passes by policing nothing, and
  // this one would read as a pass if the sections ever stopped declaring what they took.
  const claims = WORKBENCH_GUIDE.flatMap((s) => s.movedFrom.map((m) => ({ section: s.anchor, ...m })));
  assert.ok(claims.length >= 4,
    `only ${claims.length} vacated-prose claim(s) — the guide holds prose from four surfaces`);

  const stillThere = claims.filter((c) => readFileSync(c.from, "utf8").includes(c.vacated));
  assert.deepEqual(stillThere.map((c) => `${c.from}: "${c.vacated}" (claimed by ${c.section})`), [],
    "a guide section claims prose a surface still carries. Either the move was a copy, or a later "
    + "change put the verbose sentence back while Learn went on claiming to own it.");
});

test("a vacated phrase that is still in its surface is caught — negative control", () => {
  // The predicate, driven against a claim that is false by construction. Without this the check
  // above passes for a table whose phrases match nothing in any file — which is also what a typo in
  // a phrase produces, and a typo would silently un-guard that surface.
  const liar = { from: "src/learn/workbench-guide.ts", vacated: "WORKBENCH_GUIDE" };
  assert.ok(readFileSync(liar.from, "utf8").includes(liar.vacated),
    "the fixture's phrase must really be in the file, or this control proves nothing");
});

test("each vacated phrase is specific enough to mean something", () => {
  // A one-word phrase would match somewhere in almost any file, so the check above would go red on
  // an unrelated edit and get deleted for crying wolf. A clause is the unit.
  for (const section of WORKBENCH_GUIDE) {
    for (const moved of section.movedFrom) {
      assert.ok(moved.vacated.length >= 25,
        `${section.anchor} claims "${moved.vacated}" (${moved.vacated.length} chars) from `
        + `${moved.from}; a phrase that short matches by accident`);
      assert.ok(moved.vacated.trim().split(/\s+/).length >= 4,
        `${section.anchor}'s claim on ${moved.from} is not a clause: "${moved.vacated}"`);
    }
  }
});

test("the guide is declared content, and its anchors collide with no registry anchor", () => {
  // The guide is the one thing on the Learn page the kernel does NOT derive — nothing in a model
  // kernel knows how a pane reads. That makes an anchor collision the way its sections could
  // silently replace a gallery entry's, so the two namespaces are checked to be disjoint and the
  // smoke tier builds its expected section set from both.
  const registry = new Set([
    ...MODEL_TYPES.map((t) => anchorForType(t.id)),
    ...MODEL_TYPE_USES.map((u) => anchorForUse(u.id)),
  ]);
  const collisions = GUIDE_ANCHORS.filter((a) => registry.has(a));
  assert.deepEqual(collisions, [], `guide anchor(s) collide with registry anchors: ${collisions.join(", ")}`);
  assert.equal(new Set(GUIDE_ANCHORS).size, GUIDE_ANCHORS.length, "a guide anchor is declared twice");
  assert.ok(GUIDE_ANCHORS.length > 0, "the guide declares no sections");
});

test("every guide section has a heading, an intro and something to say", () => {
  for (const section of WORKBENCH_GUIDE) {
    assert.ok(section.heading.trim().length > 0, `${section.anchor} has no heading`);
    assert.ok(section.intro.trim().length > 0, `${section.anchor} has no intro sentence`);
    assert.ok(section.blocks.length > 0, `${section.anchor} is a heading over nothing`);
    for (const block of section.blocks) {
      if (block.kind === "prose") {
        assert.ok(block.text.trim().length > 0, `${section.anchor} holds an empty paragraph`);
        continue;
      }
      assert.ok(block.label.trim().length > 0, `${section.anchor} holds an unlabelled list`);
      assert.ok(block.items.length > 1,
        `${section.anchor}'s "${block.label}" is a list of ${block.items.length} — write it as prose`);
    }
  }
});

test("learn.html still carries no guide prose of its own", () => {
  // The sibling of `test/learn-content.test.ts`'s shell check, for the same reason: the Learn shell
  // is markup, and markup is where content goes to drift. The guide is built from the module above,
  // so a hand-edited paragraph in the page would be a second, unpoliced account.
  const html = readFileSync("learn.html", "utf8");
  for (const anchor of GUIDE_ANCHORS) {
    assert.ok(!html.includes(anchor),
      `learn.html contains '${anchor}' — guide sections are built from src/learn/workbench-guide.ts`);
  }
  for (const section of WORKBENCH_GUIDE) {
    assert.ok(!html.includes(section.intro),
      `learn.html hand-authors ${section.anchor}'s intro sentence`);
  }
});
