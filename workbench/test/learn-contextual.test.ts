// The two CONTEXTUAL routes from the workbench into Learn.
//
// THE FAILURE CLASS, and it is the reason this file exists rather than an extra assertion in two
// others: `requirements-learn-261002.md` asks for four routes into Learn, and the shell shipped
// two. The persistent header entry and the NOT ANSWERABLE refusal link were both wired and both
// pinned; the `+ Model` picker and the "About <Type>s / Possible combinations" route from the
// object were specified, went unbuilt through an entire redesign, and nothing anywhere went red.
// A requirement no test states is a requirement a redesign drops silently — so these are stated
// here, named for the requirement, where someone looking for them can find them.
//
// THE ORACLE IS THE REGISTRY, never a string typed into this file. UX-I9 says a Learn surface
// derives from the same model-type definition the workbench uses, and the author's objection to the
// alternative is specific: a hand-maintained surface "will drift away from what MAGE actually
// supports." A test with the questions pinned as literals drifts in exactly that way — it would go
// on passing while the picker showed a question the kernel no longer gates on, which is the defect
// rather than the check. So every expectation below is read out of `MODEL_TYPES`,
// `MODEL_TYPE_USES`, or `src/app/learn.ts`'s address functions, and §3 scans the SOURCE to assert
// the product does the same.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { MODEL_TYPES, modelTypeForQueryKind } from "../src/engine/model-types.ts";
import type { ModelTypeId } from "../src/engine/model-types.ts";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import {
  LEARN_PAGE, MODEL_TYPE_USES, anchorForType, anchorForUse, deriveLearnEntries, learnHrefForType,
} from "../src/app/learn.ts";
import {
  EDIT_ACTIONS, LEARN_GALLERY_HREF, MODEL_TYPE_CHOICES,
} from "../src/ui/shell/edit-dialogs.ts";
import { LEARN_ROUTE_FOR, inspectSelection } from "../src/ui/shell/inspector.ts";
import type { Inspection, InspectorBlock, InspectorLine, InspectorView } from "../src/ui/shell/inspector.ts";
import { resolveSelection } from "../src/ui/view-model.ts";

const load = (path: string): CanonicalSystem => canonicalize(parse(readFileSync(path, "utf8")));

/** Every shipped system, from the id list the application owns rather than a list typed here. */
const everySystem = (): readonly CanonicalSystem[] =>
  SHIPPED_EXAMPLE_IDS.map((id) => load(`examples/${id}/system.mage.yaml`));

const addModel = (): (typeof EDIT_ACTIONS)[number] => {
  const a = EDIT_ACTIONS.find((x) => x.form === "add-model");
  assert.ok(a, "the editing catalogue no longer declares 'add-model'");
  return a;
};

function object(view: InspectorView): Inspection {
  assert.equal(view.state, "object", `expected an inspection, got ${view.state}`);
  if (view.state !== "object") throw new Error("unreachable");
  return view.inspection;
}

/** The Learn block of an inspection, or null — the distinction the "no dangling heading" rule needs. */
const learnBlockOf = (i: Inspection): InspectorBlock | null =>
  i.blocks.find((b) => b.label === "Learn") ?? null;

/** The href a Learn line routes to, or null for any other kind of line. */
const learnHref = (l: InspectorLine): string | null =>
  l.action !== null && l.action.kind === "learn" ? l.action.href : null;

// ---------------------------------------------------------------------------------------------
// (1) Route one: the Add-model picker, by question
// ---------------------------------------------------------------------------------------------

test("the add-model picker offers every registered model type, each by its registry question", () => {
  // Field by field against the registry, in registry order, and BY IDENTITY on the question — the
  // sketch's rows are "<type> <question>" and the question is the half that must not be authored
  // twice. `assert.equal` on two strings is `===`, so a hand-typed copy with the same characters
  // would pass here; §3 below is the scan that catches that, and the two together are what make
  // "derived" a checked claim rather than a comment.
  assert.equal(MODEL_TYPE_CHOICES.length, MODEL_TYPES.length,
    "the picker does not offer exactly the registered model types — a new type must appear here "
    + "with no edit to the dialog, which is what UX-I9 asks of a Learn surface");
  MODEL_TYPES.forEach((t, n) => {
    const c = MODEL_TYPE_CHOICES[n];
    assert.ok(c, `no picker row for registered type '${t.id}'`);
    assert.equal(c.id, t.id, "the picker's rows are not in registry order");
    assert.equal(c.label, t.label, `'${t.id}': the picker's label is not the registry's`);
    assert.equal(c.question, t.question, `'${t.id}': the picker's question is not the registry's`);
  });
});

test("the picker fills a field the add-model action itself declares", () => {
  // The structural half of the UX-I9 claim: the renderer writes the chosen question into the field
  // named by `questionField`, so if that name is not one of the action's own fields the picker is a
  // control that cannot work. The dialog throws at click time; this says so before anyone clicks.
  const a = addModel();
  assert.equal(typeof a.questionField, "string",
    "add-model declares no questionField, so the picker would not be offered at all");
  assert.ok(a.fields.some((f) => f.name === a.questionField && f.kind === "text"),
    `add-model declares questionField '${String(a.questionField)}', which is not one of its own `
    + `text fields (${a.fields.map((f) => f.name).join(", ")})`);
});

test("only the operation that asks for an engineering question offers the picker", () => {
  // The inverse claim, and it is the one that keeps the picker honest: the other nine operations
  // take no question, so a model-type row above their fields would suggest a choice their
  // transaction cannot carry.
  const offering = EDIT_ACTIONS.filter((a) => a.questionField !== undefined).map((a) => a.form);
  assert.deepEqual(offering, ["add-model"],
    "an operation that does not ask for an engineering question offers the model-type picker");
});

test("the Learn escape goes to the gallery, not to one type's section", () => {
  // "Not sure?" is answered by the page that lays all the types side by side. A per-type deep link
  // would send the one reader who cannot choose to the one place that does not help them choose.
  assert.equal(LEARN_GALLERY_HREF, LEARN_PAGE);
  assert.ok(!LEARN_GALLERY_HREF.includes("#"),
    `the escape resolves to '${LEARN_GALLERY_HREF}', a section anchor rather than the gallery`);
  for (const t of MODEL_TYPES) {
    assert.notEqual(LEARN_GALLERY_HREF, learnHrefForType(t.id),
      `the escape is '${t.id}'s deep link; "Not sure?" must reach the gallery`);
  }
});

test("index.html ships the escape, resolving where src/app/learn.ts says Learn lives", () => {
  // The header entry's own discipline, applied to this link: the markup carries the href so the
  // escape works before the bundle evaluates, and the module re-assigns it from `LEARN_PAGE` so the
  // two cannot be two values. Checked against the page because `byId` throwing at mount is a blank
  // application, not a broken link, and nothing else catches that headlessly.
  const html = readFileSync("index.html", "utf8");
  const anchor = /<a id="edit-dialog-learn" href="([^"]+)">([^<]+)<\/a>/.exec(html);
  assert.ok(anchor, "index.html ships no #edit-dialog-learn inside the edit dialog");
  assert.equal(anchor[1], LEARN_PAGE,
    `the shipped escape points at '${String(anchor[1])}' and src/app/learn.ts says '${LEARN_PAGE}'`);
  assert.match(anchor[2] ?? "", /Learn about model types/,
    "the escape's text is not the requirement's own link text");
  // And the host is hidden, because nine of the ten operations must not show it.
  assert.match(html, /<div id="edit-dialog-types" hidden>/,
    "the picker host does not ship hidden, so every dialog would open with model types above it");
});

// ---------------------------------------------------------------------------------------------
// (2) Route two: from the object you are looking at
// ---------------------------------------------------------------------------------------------

/** The registry's own answer to "what type is a subject you ask <kind> questions of?". */
const typeOf = (kind: "graph" | "behavior" | "quantity"): ModelTypeId =>
  modelTypeForQueryKind(kind).id;

test("a selected model routes to the Learn section of the type that answers graph questions", () => {
  for (const system of everySystem()) {
    for (const id of system.models.keys()) {
      const i = object(inspectSelection(system, resolveSelection(system, `model:${id}`)));
      const b = learnBlockOf(i);
      assert.ok(b, `model '${id}' offers no Learn route — the requirement's "About <Type>s" entry`);
      const expected = typeOf("graph");
      assert.equal(learnHref(b.lines[0] as InspectorLine), learnHrefForType(expected),
        `model '${id}' does not link to the '${expected}' section`);
      assert.equal(b.lines[0]?.text, `About ${modelTypeForQueryKind("graph").label}s`,
        "the route is not labelled with the registry's own name for the type");
      assert.equal(b.disclosed, false, "the Learn route is not a collapsed region");
    }
  }
});

test("a selected machine routes to the Learn section of the type that answers behavioural questions", () => {
  // The sketch's own case, verbatim: "when looking at a state machine: About State Machines /
  // Possible combinations". The label is the registry's, so it reads "About state machines".
  let machines = 0;
  for (const system of everySystem()) {
    for (const id of system.machines.keys()) {
      machines += 1;
      const i = object(inspectSelection(system, resolveSelection(system, `machine:${id}`)));
      const b = learnBlockOf(i);
      assert.ok(b, `machine '${id}' offers no Learn route`);
      const expected = typeOf("behavior");
      assert.equal(learnHref(b.lines[0] as InspectorLine), learnHrefForType(expected),
        `machine '${id}' does not link to the '${expected}' section`);
      assert.equal(b.lines[0]?.text, `About ${modelTypeForQueryKind("behavior").label}s`);
    }
  }
  assert.ok(machines > 0, "no shipped example declares a machine, so this test proved nothing");
});

test("Possible combinations names the registry's declared partner and the question the pair answers", () => {
  const entries = deriveLearnEntries();
  for (const system of everySystem()) {
    for (const [kind, ids] of [
      ["graph", [...system.models.keys()].map((id) => `model:${id}`)],
      ["behavior", [...system.machines.keys()].map((id) => `machine:${id}`)],
    ] as const) {
      const entry = entries.find((e) => e.id === typeOf(kind));
      assert.ok(entry, `no Learn entry for the type answering '${kind}' questions`);
      for (const selection of ids) {
        const b = learnBlockOf(object(inspectSelection(system, resolveSelection(system, selection))));
        assert.ok(b);
        const combinations = b.lines[1];
        assert.ok(combinations, `'${selection}' offers no combinations line`);
        assert.equal(learnHref(combinations), learnHrefForType(entry.combineWith.partner),
          `'${selection}' does not point at its declared composition partner`);
        // Both derived halves appear: who to combine with, and what the PAIR can then ask. A line
        // naming only the partner would be a route with no reason to follow it.
        assert.match(combinations.text, new RegExp(escapeRe(entry.combineWith.partnerLabel)));
        assert.match(combinations.text, new RegExp(escapeRe(entry.combineWith.richerQuestion)));
      }
    }
  }
});

test("every declared USE of the type is offered too, at the anchor the Learn page renders it on", () => {
  // The gallery's second axis. A use is a recognisable purpose of a registered type, so from a
  // model of that type it is a combination worth reaching — and the anchor comes from
  // `anchorForUse`, the spelling the Learn page's own sections are built with.
  let checked = 0;
  for (const system of everySystem()) {
    for (const id of system.models.keys()) {
      const b = learnBlockOf(object(inspectSelection(system, resolveSelection(system, `model:${id}`))));
      assert.ok(b);
      const hrefs = b.lines.map(learnHref);
      for (const u of MODEL_TYPE_USES.filter((x) => x.ofType === typeOf("graph"))) {
        assert.ok(hrefs.includes(`${LEARN_PAGE}#${anchorForUse(u.id)}`),
          `model '${id}' does not offer the '${u.id}' use of its own type`);
        checked += 1;
      }
    }
  }
  assert.ok(checked > 0, "no declared use is of a type any shipped model has — nothing was checked");
});

test("every Learn href this pane emits addresses a section the Learn page declares", () => {
  // The hrefs are compared against the ANCHOR SET the page is built from, not against a shape. A
  // route whose href looks right and lands nowhere is the defect, and `test/browser/smoke.test.mjs`
  // holds the other half: that each of those anchors is a section the served page really renders.
  const anchors = new Set([
    ...MODEL_TYPES.map((t) => `${LEARN_PAGE}#${anchorForType(t.id)}`),
    ...MODEL_TYPE_USES.map((u) => `${LEARN_PAGE}#${anchorForUse(u.id)}`),
  ]);
  for (const system of everySystem()) {
    const selections = [
      ...[...system.models.keys()].map((id) => `model:${id}`),
      ...[...system.machines.keys()].map((id) => `machine:${id}`),
    ];
    for (const selection of selections) {
      const b = learnBlockOf(object(inspectSelection(system, resolveSelection(system, selection))));
      assert.ok(b);
      for (const l of b.lines) {
        const href = learnHref(l);
        assert.ok(href !== null, `'${selection}': "${l.text}" is in the Learn block and is not a route`);
        assert.ok(anchors.has(href),
          `'${selection}' links to '${href}', which is not a section the Learn page declares`);
      }
    }
  }
});

test("a selection that is not a model of one registered type offers no Learn route", () => {
  // The requirement's own restraint — "if nothing is selected, this offers nothing" — widened to
  // the objects that are not of one type. An entity is the sharp case: identity is shared across
  // every reduction, so an entity belongs to all three types and to none, and a block claiming one
  // would contradict the `Appears in` list directly above it.
  for (const system of everySystem()) {
    for (const id of system.entities.keys()) {
      const i = object(inspectSelection(system, resolveSelection(system, id)));
      assert.equal(learnBlockOf(i), null,
        `entity '${id}' offers a Learn route; an entity is not of one model type`);
    }
  }
  // And the two empty readings, which have no blocks at all to put one in.
  const system = everySystem()[0] as CanonicalSystem;
  assert.equal(inspectSelection(system, resolveSelection(system, undefined)).state, "empty");
  assert.equal(inspectSelection(system, resolveSelection(system, "no-such-thing")).state, "unresolved");
});

test("the Learn route table is the one declaration of which selections have a type", () => {
  // The table is read at exactly one site, so it is checkable as the whole of the policy: every
  // kind it names gets a block and every kind it omits does not. A second judgement inside one of
  // the five inspection functions would be invisible to this.
  assert.deepEqual(Object.keys(LEARN_ROUTE_FOR).sort(), ["machine", "model"],
    "the kinds with a Learn route changed; the reasons for the omissions are on learnBlock");
  for (const [kind, queryKind] of Object.entries(LEARN_ROUTE_FOR)) {
    assert.ok(queryKind !== undefined);
    assert.equal(modelTypeForQueryKind(queryKind).queryKind, queryKind,
      `'${kind}' is routed through query kind '${queryKind}', which no registered type answers`);
  }
});

// ---------------------------------------------------------------------------------------------
// (3) The drift pin: no capability prose in the surfaces that present it
// ---------------------------------------------------------------------------------------------

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("no registry question is typed into the dialog, its markup, or this test", () => {
  // THE CHECK THE REQUIREMENT ACTUALLY ASKS FOR. The tests above compare values, and values agree
  // whether they were derived or copied. This reads the sources and asserts that no registered
  // type's question or label appears in any of them — so the only way the picker can put a
  // question in front of a user is by reading `MODEL_TYPES`, and a fourth registered type cannot
  // leave the dialog behind.
  //
  // COMMENTS ARE IN SCOPE, which was a finding rather than a choice: the first run flagged three
  // sites, all of them prose quoting the requirement's sketch, and the sketch's wording is already
  // behind the registry's for two of the three types. A stale question in a comment beside the
  // live host is the same hazard one step quieter, so the comments say the SHAPE and cite the
  // requirements file for the words.
  //
  // This file is in scope for its own rule too, which is why every expectation above is built from
  // the registry rather than written out. A test with the question pinned would be a second
  // hand-maintained copy of the thing under test, one that goes green while the product drifts.
  const scanned = [
    "src/ui/shell/edit-dialogs.ts",
    "src/ui/shell/inspector.ts",
    "index.html",
    "test/learn-contextual.test.ts",
  ];
  const offenders: string[] = [];
  for (const path of scanned) {
    const text = readFileSync(path, "utf8");
    for (const t of MODEL_TYPES) {
      if (text.includes(t.question)) offenders.push(`${path}: '${t.id}'s question, verbatim`);
      // The labels too: "About state machines" is derived from `ModelType.label`, and a literal
      // would drift on a rename exactly as a question would.
      if (new RegExp(`["'>]\\s*${escapeRe(t.label)}`).test(text)) {
        offenders.push(`${path}: '${t.id}'s label, as a literal`);
      }
    }
  }
  assert.deepEqual(offenders, [], "a model type's registry prose is copied into a surface that "
    + "presents it — the hand-maintained-brochure drift UX-I9 exists to prevent:\n"
    + offenders.join("\n"));
});
