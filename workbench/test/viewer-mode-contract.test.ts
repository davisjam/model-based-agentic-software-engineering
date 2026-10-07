/**
 * The viewer-default contract, as facts about the shipped page.
 *
 * The page SHIPS as a viewer: body[data-mode="viewer"] plus a stylesheet rule hides every
 * authoring surface before any script runs, and the Advanced toggle is the one way a human opts
 * back in. These are markup facts, so they are pinned here in the node tier where no state has to
 * be reached; the live toggle behaviour is the browser probe's (viewer-mode.test.mjs).
 *
 * The hidden SET is pinned too, member by member. A surface dropped from the set silently would
 * re-offer a mutation affordance to the viewer; one added silently would hide an inspection
 * surface. Either direction is a decision somebody should make on purpose.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8").replace(/<!--[\s\S]*?-->/g, "");

/** Every element the viewer default withholds from the human surface. */
const ADVANCED_ONLY = [
  "new-system",
  "undo",
  "redo",
  "palette-open",
  "whatif-arm",
  "askbar",
  "edit",
  "system-browser",
  "add-menu",
  "inspector-actions",
] as const;

test("the page ships in viewer mode", () => {
  assert.match(html, /<body data-mode="viewer">/);
  assert.match(
    html,
    /body\[data-mode="viewer"\] \.advanced-only \{ display: none !important; \}/,
    "the stylesheet rule that makes the default a viewer",
  );
  assert.match(html, /<button id="advanced-toggle" type="button" aria-pressed="false">/);
});

test("every authoring surface carries the advanced-only class", () => {
  for (const id of ADVANCED_ONLY) {
    const tag = new RegExp(`<[a-z]+ id="${id}"[^>]*>`).exec(html)?.[0];
    assert.ok(tag !== undefined, `#${id} must exist — the viewer hides it, nothing deletes it`);
    assert.match(tag, /class="[^"]*advanced-only[^"]*"/, `#${id} must carry advanced-only`);
  }
});

test("Refresh ships in the header, left of Advanced, disabled until something is loaded", () => {
  const refresh = /<button id="refresh"[^>]*>/.exec(html)?.[0];
  assert.ok(refresh !== undefined, "#refresh must exist");
  assert.match(refresh, /\bdisabled\b/, "nothing loaded means nothing to re-read");
  assert.doesNotMatch(refresh, /advanced-only/, "Refresh is the viewer's own control");
  const refreshAt = html.indexOf('<button id="refresh"');
  const toggleAt = html.indexOf('<button id="advanced-toggle"');
  assert.ok(refreshAt !== -1 && toggleAt !== -1 && refreshAt < toggleAt,
    "Refresh precedes Advanced in document order — the wireframe's '↻ Refresh  ⚙ Advanced'");
  // The glyph rides in the visible text; the clean accessible name is the aria-label.
  assert.match(html, /<button id="refresh"[^>]*aria-label="Refresh"[^>]*>↻ Refresh</);
});

test("the inspection surfaces do NOT carry the advanced-only class", () => {
  // The viewer's own surfaces: navigation, the workspace, the inspector's reading, properties,
  // status, Start, and the header's read-side controls.
  for (const id of ["nav", "workspace", "inspector", "question-list", "statusbar", "start",
    "export", "run", "reset", "refresh", "learn"]) {
    const tag = new RegExp(`<[a-z]+ id="${id}"[^>]*>`).exec(html)?.[0];
    assert.ok(tag !== undefined, `#${id} must exist`);
    assert.doesNotMatch(tag, /advanced-only/, `#${id} is an inspection surface and stays offered`);
  }
});
