// The capability registry and the UX invariants it enforces.
//
// UX-I1 reports ONE violation over twenty-five capabilities, and the one is `explore-space`: no
// human control walks the configuration space. The baseline was empty for two waves and goes back to
// one here, which is the gate working rather than a regression. Walking the configuration space was
// reachable by an agent and by nobody else for as long as the registry declined to declare it; the
// zero was true of the rows that existed and silent about the one that did not.
//
// An empty baseline alone would be a weak test — a registry with no capabilities at all would pass
// it. `FULLY_WIRED` is the positive control that closes that hole: every capability must be PRESENT
// and wired on both sides, so deleting one to silence a violation fails here instead. `BASELINE_GAP`
// is its counterpart for a capability that is declared and honestly incomplete: it must be present
// AND still violating, so closing the gap without updating the baseline fails too. Progress and
// regression both have to be deliberate.
//
// And a hole all of those leave open, which the §20 coverage test at the end closes: a capability
// the registry never DECLARES cannot violate UX-I1. `load-example` and `inspect-provenance` sat in
// the specification's capability table for two waves while the gate read zero, because the gate can
// only check rows it has been told about. The specification is now the list — for the rows it has.
// `explore-space` is not among them, which is the §20 table's own gap and recorded as such below.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAPABILITIES, boundHumanAffordances, checkAffordanceParity, checkRegistryClosure,
  generateAffordanceModel,
} from "../src/app/capabilities.ts";
import type { Affordance, CapabilityId } from "../src/app/capabilities.ts";
import { ExampleCatalog } from "../src/app/examples.ts";

/**
 * Capabilities with NO wired human affordance.
 *
 * It was empty for two waves. `explore-space` puts one back, and the reason is worth stating because
 * it is not the reason the previous entries were here: the earlier three — create-model,
 * delete-model, add-note — had no MACHINE affordance either, and that identity was the diagnosis
 * (the transaction schema had no op, so there was nothing to bind on either side). This one is
 * one-sided. An agent can walk the configuration space and a person cannot, because the facade
 * offers `explore()` and nothing in the UI calls it.
 */
const NO_HUMAN: readonly CapabilityId[] = ["explore-space"];

/**
 * Capabilities with no wired machine affordance. Empty.
 *
 * It used to be IDENTICAL to NO_HUMAN, and that identity carried a claim — no gap is one-sided.
 * The claim no longer holds, and the lists diverging is how the registry says so: the asymmetry
 * UX-I1 exists to catch is exactly the one now present.
 */
const NO_MACHINE: readonly CapabilityId[] = [];

/**
 * Every capability asserted present AND wired on both sides.
 *
 * An empty baseline on its own is a weak test: a capability DELETED from the registry also
 * disappears from the violation list, so silence can mean "fixed" or "removed". This list names the
 * twenty-four that are whole, so removing one to quieten UX-I1 fails here. A capability wired two
 * waves ago needs guarding just as much as one wired today, so none is kept apart.
 */
const FULLY_WIRED: readonly CapabilityId[] = [
  "import", "export", "inspect", "validate", "query", "analyze", "inspect-evidence", "undo", "redo",
  "create-element", "delete-element", "create-relation", "delete-relation", "edit-property",
  "create-hypothesis", "commit-hypothesis", "discard-hypothesis",
  "create-model", "delete-model", "add-note",
  "load-example", "inspect-provenance",
  // Saving a query's result as a persistent proposition, and retracting one. §23's scenario ends
  // with the first of these, and `delete-query` existed with no way for a person to reach it.
  "save-property", "retract-property",
];

/**
 * Capabilities declared and honestly incomplete, each asserted PRESENT and STILL VIOLATING.
 *
 * The mirror of `FULLY_WIRED`, and it exists for the mirror reason. `FULLY_WIRED` stops a violation
 * being silenced by deleting its row; this stops a gap being closed — or appearing to close — without
 * anyone editing the baseline that records it. A registry entry can be wrong in two directions and
 * only one of them was watched.
 */
const BASELINE_GAP: readonly CapabilityId[] = ["explore-space"];

test("UX-I1 violations match the recorded baseline exactly", () => {
  const violations = checkAffordanceParity();
  const human = violations.filter((v) => v.problem.includes("HUMAN")).map((v) => v.capability).sort();
  const machine = violations.filter((v) => v.problem.includes("MACHINE")).map((v) => v.capability).sort();

  assert.deepEqual(human, [...NO_HUMAN].sort(),
    "a capability gained or lost a human affordance; update NO_HUMAN deliberately");
  assert.deepEqual(machine, [...NO_MACHINE].sort(),
    "a capability gained or lost a machine affordance; update NO_MACHINE deliberately");
  // The whole picture, as one list, so a reader sees the shape and not just the counts. One
  // violation, and it is the one the baselines above name — no capability fails for want of a named
  // service, and nothing is unreachable by a machine.
  assert.deepEqual(violations.map((v) => v.capability), ["explore-space"]);
  assert.match(violations[0]?.problem ?? "", /no wired HUMAN affordance/);
  assert.match(violations[0]?.problem ?? "", /analysis-section\.explore: absent/,
    "the violation must name the site that is missing, not merely that one is");
});

test("the one agent-only capability is the one the baseline declares", () => {
  // The asymmetry UX-I1 exists to catch, computed directly rather than inferred from two lists. A
  // capability with a machine affordance and no human one means an agent can do something the user
  // has no control for — which is TRUE of `explore-space` and is why it has a row.
  //
  // Asserted against the baseline rather than against zero. Zero was the right assertion while it
  // was true; asserting it now would mean either omitting the capability from the registry or
  // pretending a control exists, and both of those make the gate report a product that does not
  // exist. The list is the work item.
  const violations = checkAffordanceParity();
  const noHuman = new Set(violations.filter((v) => v.problem.includes("HUMAN")).map((v) => v.capability));
  const noMachine = new Set(violations.filter((v) => v.problem.includes("MACHINE")).map((v) => v.capability));
  const agentOnly = [...noHuman].filter((id) => !noMachine.has(id)).sort();
  assert.deepEqual(agentOnly, [...BASELINE_GAP].sort(),
    `agent-only capabilities: ${agentOnly.join(", ")} — an agent can do these and a person cannot`);
});

test("every declared capability is either fully wired or a declared gap", () => {
  const violating = new Set(checkAffordanceParity().map((v) => v.capability));
  const declared = new Set(CAPABILITIES.map((c) => c.id));
  for (const id of FULLY_WIRED) {
    assert.ok(declared.has(id), `${id} is no longer in the registry; the baseline cannot vouch for it`);
    assert.ok(!violating.has(id), `${id} should be wired on both sides but is not`);
  }
  // The mirror. A declared gap must be PRESENT and still violating, so closing it — or deleting it —
  // fails here until someone edits the baseline that records it.
  for (const id of BASELINE_GAP) {
    assert.ok(declared.has(id), `${id} is no longer in the registry; a gap cannot be closed by deletion`);
    assert.ok(violating.has(id),
      `${id} no longer violates UX-I1 — move it from BASELINE_GAP to FULLY_WIRED and say what wired it`);
  }
  // Both directions: a capability ADDED to the registry and left out of both lists would otherwise
  // be wired-or-not with nothing watching.
  const accounted = new Set([...FULLY_WIRED, ...BASELINE_GAP]);
  assert.deepEqual([...declared].filter((id) => !accounted.has(id)), [],
    "a new capability must be added to FULLY_WIRED, or declared in BASELINE_GAP");
  assert.deepEqual(FULLY_WIRED.filter((id) => BASELINE_GAP.includes(id)), [],
    "a capability cannot be both whole and a gap");
});

test("the two 'property' capabilities are not the entity-attribute one", () => {
  // "Property" is overloaded in this workbench and the two meanings sit three registry entries
  // apart: `edit-property` changes an ENTITY ATTRIBUTE, `save-property` and `retract-property`
  // keep and withdraw an ENGINEERING CLAIM. A reader who conflates them will wire a control to the
  // wrong service, so the distinction is asserted rather than left to the comment beside it.
  const byId = new Map(CAPABILITIES.map((c) => [c.id, c]));
  const attribute = byId.get("edit-property");
  assert.match(attribute?.summary ?? "", /property or label/);

  for (const id of ["save-property", "retract-property"] as const) {
    const c = byId.get(id);
    assert.ok(c, `${id} must be declared`);
    assert.equal(c.service, "transactions.apply",
      "a property is saved by the ordinary transaction seam, not a privileged one");
    assert.equal(c.producesEvidence, false,
      "saving a claim produces no evidence; EVALUATING it does, and that is `analyze`");
  }
  // And what is saved is the question: nothing in the registry promises to store a verdict.
  assert.match(byId.get("save-property")?.summary ?? "", /re-evaluated on every later revision/);
});

test("the property surfaces are reachable from both interfaces, over one service each", () => {
  // UX-I5's machine half. The property list's whole content is a semantic result, so a human-only
  // grounding would be a UX-I2 violation that UX-I1 cannot see: `analyze` would still look wired.
  const analyze = CAPABILITIES.find((c) => c.id === "analyze");
  assert.ok(analyze);
  assert.ok(analyze.machine.some((a) => a.at === "window.mage.properties"),
    "the grounded property read must have a machine affordance");
  assert.ok(analyze.human.some((a) => a.at === "properties-section.list"));

  const query = CAPABILITIES.find((c) => c.id === "query");
  assert.ok(query);
  assert.ok(query.human.some((a) => a.at === "properties-section.ask"),
    "§10.1: a person must be able to execute a query without writing one");
  assert.ok(query.machine.some((a) => a.at === "window.mage.ask"),
    "the ad-hoc answer panel shows a grounding, so a machine client must be able to read it");
  // Both affordances of `query` resolve to the one service; that is what UX-I1 checks by comparing
  // the string, and a second service here would make the two interfaces diverge invisibly.
  assert.equal(query.service, "workspace.query");
});

test("every wired affordance names ONE site, not a description of several", () => {
  // `canvas / inspector` was an absent-affordance placeholder, and a placeholder left behind on a
  // wired entry would defeat the closure check in §26, which compares these strings against the
  // sites that actually reach the model. One site means no spaces and no slashes.
  for (const c of CAPABILITIES) {
    for (const a of [...c.human, ...c.machine]) {
      if (a.status !== "wired") continue;
      assert.doesNotMatch(a.at, /[ /]/,
        `${c.id}: '${a.at}' describes several places; a wired affordance is one addressable site`);
    }
  }
});

test("every capability names exactly one application service", () => {
  // UX-I1's "both SHALL invoke the same underlying service" is only checkable if the service is
  // named. A capability with no service cannot be shown to converge, so it is a violation in itself.
  for (const c of CAPABILITIES) {
    assert.ok(c.service.length > 0, `${c.id} names no service`);
    assert.match(c.service, /^[a-z][A-Za-z]*\.[a-zA-Z]+$/, `${c.id}: service '${c.service}' should be <module>.<operation>`);
  }
});

/** An affordance is honest if it works, or says why it does not. */
const explained = (a: Affordance): boolean => a.status === "wired" || (a.note ?? "").length > 8;

test("anything not wired must explain itself", () => {
  // An unexplained gap is indistinguishable from an oversight. A note is what makes a baseline
  // reviewable rather than just long.
  for (const c of CAPABILITIES) {
    for (const a of [...c.human, ...c.machine]) {
      assert.ok(explained(a), `${c.id} affordance '${a.at}' is ${a.status} with no explanation`);
    }
  }
  // The loop above is vacuous now that nothing is unwired, so the predicate is driven directly too.
  // A check that can only pass is not a check, and this one has to still work for the next
  // capability someone declares before building it.
  assert.equal(explained({ at: "nowhere", status: "absent" }), false);
  assert.equal(explained({ at: "nowhere", status: "absent", note: "soon" }), false,
    "a token note is not an explanation");
  assert.equal(explained({ at: "window.mage.transact", status: "refusing", note: "no such op in the schema" }), true);
});

test("UX-I1 fires when a capability loses an affordance — negative control", () => {
  const broken = CAPABILITIES.map((c) =>
    c.id === "query" ? { ...c, human: [{ at: "gone", status: "absent" as const, note: "removed for the test" }] } : c);
  const v = checkAffordanceParity(broken);
  assert.ok(v.some((x) => x.capability === "query" && x.problem.includes("HUMAN")),
    "removing query's human affordance must be caught");
});

// ----------------------------------------------------------------------------------------------
// The DOM binding — F-3. `wired` stops being an author's assertion.
// ----------------------------------------------------------------------------------------------

/**
 * Every element id a human affordance claims must exist in `index.html`.
 *
 * This is the cheap rung of the three that hold F-3 shut, and the one that fires without a browser:
 * the compiler already refuses a wired human affordance with no element, and the browser tier
 * compares the SERVED page's stamped set against the registry. This catches the common motion —
 * someone renames a control — at commit time, in a second.
 */
test("every human affordance site names an element index.html declares", () => {
  const html = readFileSync("index.html", "utf8");
  const present = new Set([...html.matchAll(/id="([a-zA-Z0-9-]+)"/g)].map((m) => m[1] as string));
  const bound = boundHumanAffordances();
  assert.ok(bound.length > CAPABILITIES.length / 2,
    `only ${bound.length} human affordances declare an element — the registry scan is wrong`);
  const missing = bound
    .filter((a) => !present.has(a.element.id))
    .map((a) => `${a.at} → #${a.element.id}`);
  assert.deepEqual(missing, [], `index.html declares no element for: ${missing.join(", ")}`);
});

test("a renamed control is caught — negative control", () => {
  // The predicate, driven against a registry whose element was renamed out from under it. Without
  // this the test above passes for a registry that declares nothing.
  const html = readFileSync("index.html", "utf8");
  const present = new Set([...html.matchAll(/id="([a-zA-Z0-9-]+)"/g)].map((m) => m[1] as string));
  const renamed = CAPABILITIES.map((c) => c.id === "export"
    ? { ...c, human: [{ at: "header.export", status: "wired" as const, element: { id: "export-v2" } }] }
    : c);
  assert.deepEqual(
    boundHumanAffordances(renamed).filter((a) => !present.has(a.element.id)).map((a) => a.at),
    ["header.export"],
    "renaming the element a wired site claims must be caught",
  );
});

/**
 * No `<section>` in the markup is an unnamed landmark, and no label points at nothing.
 *
 * The cheap rung under F-5. A named `<section>` computes as a `region` landmark and an unnamed one
 * collapses to `generic`, which AT does not list under any name — so an unlabelled section is a
 * region a screen-reader user cannot navigate to, and a label whose IDREF is absent is the same
 * defect wearing correct-looking markup. Both are mechanically visible in the file, in a
 * millisecond, without a browser.
 *
 * It does not replace the browser pass, which is what asserts the name COMPUTES to something. A
 * heading that exists in the markup and is emptied by a renderer passes here and fails there.
 */
test("every section in index.html is labelled, and every label resolves", () => {
  // COMMENTS STRIPPED FIRST. `index.html` argues for its own structure in long HTML comments, and
  // those comments quote the markup they argue about — so a naive scan read `<section>` out of a
  // sentence and reported three unnamed landmarks that do not exist. The file's prose is not its
  // markup.
  const html = readFileSync("index.html", "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const ids = new Set([...html.matchAll(/id="([a-zA-Z0-9-]+)"/g)].map((m) => m[1] as string));
  const sections = [...html.matchAll(/<section\b([^>]*)>/g)].map((m) => m[1] as string);
  assert.ok(sections.length > 1, `only ${sections.length} <section> found — the scan is wrong, not the page`);

  const unlabelled = sections
    .filter((attrs) => !/\baria-labelledby="/.test(attrs) && !/\baria-label="/.test(attrs))
    .map((attrs) => attrs.trim().slice(0, 60));
  assert.deepEqual(unlabelled, [],
    `${unlabelled.length} <section> is an unnamed landmark: ${unlabelled.join(" | ")}`);

  const dangling = [...html.matchAll(/aria-labelledby="([a-zA-Z0-9-]+)"/g)]
    .map((m) => m[1] as string)
    .filter((ref) => !ids.has(ref));
  assert.deepEqual(dangling, [],
    `aria-labelledby points at ids index.html never declares: ${dangling.join(", ")}`);
});

test("an unlabelled section is caught — negative control", () => {
  // The predicate, driven against markup that has the defect. Without this the test above passes
  // for a scan that matches nothing.
  const broken = '<section id="x" aria-labelledby="x-h"></section><section id="y"></section>';
  const found = [...broken.matchAll(/<section\b([^>]*)>/g)]
    .map((m) => m[1] as string)
    .filter((attrs) => !/\baria-labelledby="/.test(attrs) && !/\baria-label="/.test(attrs));
  assert.equal(found.length, 1, "an unnamed section must be reported");
});

test("index.html authors no data-affordance of its own", () => {
  // The attribute has exactly ONE author: the binder, reading the registry. A hand-typed
  // `data-affordance="header.export"` beside the registry's own `"header.export"` would be two
  // copies of one fact — the registry's failure class reproduced one layer down — and a closure
  // check comparing one copy to the other would pass on a page whose button had moved.
  const html = readFileSync("index.html", "utf8");
  assert.ok(!/\sdata-affordance\s*=/.test(html),
    "index.html hand-authors a data-affordance attribute; the registry is the only source for it");
});

test("§26 closure: an affordance reaching the model without a capability is a violation", () => {
  // The direction that catches drift. A button or an API method that touches the model without
  // being a declared semantic capability is exactly how a UI-only or agent-only path appears.
  const clean = checkRegistryClosure(["header.export"], ["window.mage.query"]);
  assert.deepEqual(clean, [], "sites that ARE registered must not be reported");

  const drifted = checkRegistryClosure(["header.secret-button"], ["window.mage.backdoor"]);
  assert.equal(drifted.length, 2, "both unregistered sites must be caught");
  assert.ok(drifted.some((v) => v.problem.includes("header.secret-button")));
  assert.ok(drifted.some((v) => v.problem.includes("window.mage.backdoor")));
});

// ----------------------------------------------------------------------------------------------
// §20 coverage — the specification's table is the list, not this file
// ----------------------------------------------------------------------------------------------

/**
 * Rows whose capability name does not slugify to a registry id. Each needs a reason, not an entry.
 *
 * Three, and all three are the specification writing one row where the registry has one or two
 * capabilities. Nothing here may map a row to a capability that does something else — that would
 * turn this test from a gate into a rubber stamp.
 */
const ROW_ALIASES: Record<string, readonly CapabilityId[]> = {
  // The registry splits these, because undo and redo are separately reachable and separately
  // breakable: `canUndo` and `canRedo` are different bits of state and either button can rot alone.
  "Undo/redo": ["undo", "redo"],
  // Likewise. Reading a model system and writing one back are different services, and export is the
  // one that has to preserve comments and key order.
  "Import/export": ["import", "export"],
  // "Inspect model" is the registry's `inspect`. The spec names the OBJECT; the registry names the
  // act, and every other row names the act.
  "Inspect model": ["inspect"],
};

/** Capability names from the §20 table, read out of the specification. */
function specificationRows(): readonly string[] {
  const spec = readFileSync("requirements-human-ux-261002.md", "utf8");
  const header = "Capability\tHuman affordance\tMachine affordance";
  const start = spec.indexOf(header);
  assert.notEqual(start, -1, "the §20 capability table has moved; this test reads it by its header");
  const rows: string[] = [];
  for (const line of spec.slice(start + header.length).split("\n").slice(1)) {
    // The table ends at the first line that is not three tab-separated cells.
    if (line.split("\t").length !== 3) break;
    rows.push((line.split("\t")[0] ?? "").trim());
  }
  return rows;
}

/** §20 rows the registry does not declare. Takes the registry, so a control can shrink it. */
function uncoveredRows(registry: readonly CapabilityId[]): readonly string[] {
  const declared = new Set(registry);
  const out: string[] = [];
  for (const row of specificationRows()) {
    const ids = ROW_ALIASES[row] ?? [row.toLowerCase().replace(/ /g, "-") as CapabilityId];
    for (const id of ids) {
      if (!declared.has(id)) out.push(`§20 row "${row}" expects capability '${id}'`);
    }
  }
  return out;
}

test("every capability in the §20 table is declared in the registry", () => {
  // The hole UX-I1 cannot see. A capability the registry does not declare has no affordances to
  // check, so the gate reads zero violations and the capability is simply missing — which is how
  // `load-example` and `inspect-provenance` stayed unbuilt while the registry looked complete.
  // Reading the specification's own table is what turns "we think we covered it" into a check.
  const rows = specificationRows();
  assert.ok(rows.length >= 16, `read ${rows.length} rows from the §20 table; the parse is wrong`);
  assert.ok(rows.includes("Load example") && rows.includes("Inspect provenance"),
    "the two rows this wave closed must be readable from the table");

  const uncovered = uncoveredRows(CAPABILITIES.map((c) => c.id));
  assert.deepEqual(uncovered, [],
    `the §20 table names capabilities the registry does not:\n  ${uncovered.join("\n  ")}`);

  // The direction this test does NOT check, named so a reader does not take its silence for cover.
  // `explore-space` is declared by the registry and absent from the table: the spec's `Analyze` row
  // says "analysis API", which is `window.mage.analysis` — both methods on it, under one name. The
  // registry splits them, because one is a spelling of `query` and the other answers a question
  // nothing else answers. A registry row with no spec row is a finding about the SPECIFICATION, and
  // the specification is not this unit's file to edit.
  assert.ok(!rows.includes("Explore configuration space"),
    "if §20 grew the row, delete this assertion and let the coverage check above carry it");
  assert.ok(CAPABILITIES.some((c) => c.id === "explore-space"),
    "the registry declares it regardless: a capability the registry hides cannot violate UX-I1");
});

test("§20 coverage fires on a dropped capability — negative control", () => {
  // The real predicate, against the registry this wave inherited: without `load-example` and
  // `inspect-provenance` it must report exactly those two rows. A check that could only pass is not
  // a check, and this one has to still work for the next row someone adds to the specification.
  const before = CAPABILITIES.map((c) => c.id)
    .filter((id) => id !== "load-example" && id !== "inspect-provenance");
  assert.deepEqual(uncoveredRows(before), [
    "§20 row \"Inspect provenance\" expects capability 'inspect-provenance'",
    "§20 row \"Load example\" expects capability 'load-example'",
  ], "dropping a capability must surface the specification row it leaves unanswered");
});

test("the generated affordance model is in sync with the registry", () => {
  // The model is GENERATED, so a stale committed copy is the drift the registry exists to prevent.
  // Regenerating and comparing is how the single source of truth stays single.
  const onDisk = readFileSync("models/workbench-affordances.mage.yaml", "utf8");
  assert.equal(onDisk, generateAffordanceModel(),
    "models/workbench-affordances.mage.yaml is stale — run `npm run affordances`");
});

test("the generated model declares every capability and both interfaces", () => {
  const yaml = generateAffordanceModel();
  for (const c of CAPABILITIES) {
    assert.ok(yaml.includes(`  ${c.id}:`), `${c.id} missing from the generated model`);
    assert.ok(yaml.includes(`from: ${c.id}, to: service.`), `${c.id} has no implemented-by edge`);
  }
  assert.ok(yaml.includes("human-interface:") && yaml.includes("machine-interface:"));
  // afforded-by must declare its absence meaning: a missing edge is a UX-I1 violation, not a
  // design choice, and that distinction is invisible unless the relation type says so.
  assert.match(yaml, /absence: >/);
  assert.match(yaml, /UX-I1 violation, not a design choice/);
});

test("describe() derives its operations from the registry, and reports the gaps", async () => {
  // The registry drives describe() (UX section 22). Before this, agent-api.ts hand-listed eight
  // operations while the registry held nineteen -- the second source of truth the registry exists
  // to remove, sitting in the file that advertises the API.
  const { createAgentApi } = await import("../src/app/agent-api.ts");
  const { Workspace } = await import("../src/app/services.ts");
  const { renderView } = await import("../src/render/index.ts");
  const noop = {
    engine: { graphQuery: () => { throw new Error("unused"); }, behaviorQuery: () => { throw new Error("unused"); },
      explore: () => ({ configurations: [], exhaustive: false }) },
    render: { render: renderView },
  };
  const ws = new Workspace(noop as never);
  const catalogue = new ExampleCatalog(ws, (path) => Promise.resolve(readFileSync(path, "utf8")));
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, catalogue);
  const d = api.describe();

  assert.equal(d.operations.length, CAPABILITIES.length,
    "describe() must report exactly the registry's capabilities");
  const names = new Set(d.operations.map((o) => o.name));
  for (const c of CAPABILITIES) assert.ok(names.has(c.id), `${c.id} missing from describe()`);

  // And it must admit where the workbench falls short of its own registry. What is pinned is the
  // DERIVATION: describe() reports exactly what checkAffordanceParity() reports, whatever that is.
  assert.deepEqual(d.affordanceGaps, checkAffordanceParity().map((v) => `${v.capability}: ${v.problem}`));
  // The list is non-empty again, and an agent reading it learns the one thing it must: that walking
  // the configuration space is reachable from here and from no human control. FR-AGENT-2 is why that
  // has to be in the API — an agent that uses a capability the user cannot see has created a
  // divergence the user cannot inspect, and this is the sentence that warns it.
  assert.deepEqual(d.affordanceGaps.map((g) => g.split(":")[0]), ["explore-space"]);

  // The other half of the same obligation, and the one `affordanceGaps` cannot discharge: an agent
  // that reads this API must learn exploration EXISTS. A capability omitted from the registry to
  // keep the gap list empty would be absent from both, and the thing that exists to inform an agent
  // would have misinformed it.
  const explore = d.operations.find((o) => o.name === "explore-space");
  assert.ok(explore, "describe() must advertise exploration, which window.mage.analysis.explore runs");
  assert.match(explore.summary, /configuration space/);
  assert.equal(explore.returns, "a result carrying outcome, coverage and evidence",
    "a space summary is a semantic result, so UX-I2 governs it");
  // add-note is the surprising one, so the agent must be able to learn its A1 consequence from the
  // API rather than from a hash that did not move.
  const note = d.operations.find((o) => o.name === "add-note");
  assert.ok(note, "describe() must advertise add-note now that both interfaces can reach it");
  assert.match(note.summary, /without changing what the model asserts/);

  // The two this wave added. They are advertised because the registry declares them, not because
  // anything here lists them -- which is the derivation the test above pins, checked at the two
  // names a reader would go looking for.
  assert.ok(d.operations.some((o) => o.name === "load-example"),
    "adding the capability must advertise it, with no edit to agent-api.ts");
  assert.ok(d.operations.some((o) => o.name === "inspect-provenance"));
});
