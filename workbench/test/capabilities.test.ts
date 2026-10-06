// The capability registry and the UX invariants it enforces.
//
// UX-I1 reports ZERO violations over twenty-five capabilities, and the zero is the one nobody had to
// hold up. It read one for a wave — `explore-space`, reachable by an agent and by nobody else — and
// the baseline below recorded that rather than hiding it. The gap is closed by a control in the
// System Browser that walks the configuration space and renders the summary, which is what the
// violation named when it was filed. Two zeroes are possible here and only one is worth having: the
// zero of a census that declares every capability and wires both sides of each, and the zero of a
// census that omits the row it cannot answer. This is the first.
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
  CAPABILITIES, CHROME_CONTROLS, affordanceParityGate, boundHumanAffordances,
  checkAffordanceParity, checkRegistryClosure, generateAffordanceModel,
} from "../src/app/capabilities.ts";
import type { AffordanceSite, CapabilityId } from "../src/app/capabilities.ts";
import { ExampleCatalog } from "../src/app/examples.ts";

/**
 * Capabilities with NO wired human affordance. Empty.
 *
 * `check-query` was here for the length of one review: M2 declared it machine-only, and the answer
 * was to build the control rather than to record the absence. The Check control sits beside Ask in
 * the Advanced query surface, which is the surface where a person can compose a question the models
 * decline — so the capability a person was missing was a real one.
 *
 * This list held `explore-space` before, and that entry was unlike the three before it:
 * create-model, delete-model and add-note had no MACHINE affordance either, and the identity of the
 * two lists WAS the diagnosis (the transaction schema had no op, so there was nothing to bind on
 * either side). `explore-space` was one-sided, and it closed the only way a one-sided gap honestly
 * can: a control, not a re-reading of what counts. `check-query` was the same shape and took the
 * same closure.
 *
 * `FULLY_WIRED` below names the twenty-five that are whole, so a capability deleted to silence a
 * violation fails there rather than vanishing from this list unnoticed.
 */
const NO_HUMAN: readonly CapabilityId[] = [];

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
  // The model query interface's `check`: `window.mage.check` and the Check control beside Ask in
  // the Advanced query surface, both ending at `workspace.check`.
  "check-query",
  // Walking the configuration space, wired in the System Browser. It is in this list rather than in
  // `BASELINE_GAP` because the control exists, Tab reaches it, and it ends at `workspace.explore` —
  // the same seam `window.mage.analysis.explore` calls.
  "explore-space",
  "create-element", "delete-element", "create-relation", "delete-relation", "edit-property",
  "create-hypothesis", "commit-hypothesis", "discard-hypothesis",
  "create-model", "delete-model", "add-note",
  "load-example", "inspect-provenance",
  // Saving a query's result as a persistent statement, and retracting one. §23's scenario ends
  // with the first of these, and `delete-query` existed with no way for a person to reach it.
  "save-property", "retract-property",
];

/**
 * Capabilities declared and honestly incomplete, each asserted PRESENT and STILL VIOLATING. Empty.
 *
 * The mirror of `FULLY_WIRED`, and it exists for the mirror reason. `FULLY_WIRED` stops a violation
 * being silenced by deleting its row; this stops a gap being closed — or appearing to close — without
 * anyone editing the baseline that records it. A registry entry can be wrong in two directions and
 * only one of them was watched.
 *
 * Empty, and it has now been empty across two capabilities that could have sat here. The list stays,
 * because the next capability someone declares before it is buildable belongs here rather than in a
 * comment — and because an empty list is the shape that says "nothing is owed", which a deleted list
 * cannot say. What it is NOT is a place to park a capability whose affordance is merely inconvenient
 * to build: `check-query` was moved out of it by building the control.
 */
const BASELINE_GAP: readonly CapabilityId[] = [];

test("UX-I1 violations match the recorded baseline exactly", () => {
  const violations = checkAffordanceParity();
  const human = violations.filter((v) => v.problem.includes("HUMAN")).map((v) => v.capability).sort();
  const machine = violations.filter((v) => v.problem.includes("MACHINE")).map((v) => v.capability).sort();

  assert.deepEqual(human, [...NO_HUMAN].sort(),
    "a capability gained or lost a human affordance; update NO_HUMAN deliberately");
  assert.deepEqual(machine, [...NO_MACHINE].sort(),
    "a capability gained or lost a machine affordance; update NO_MACHINE deliberately");
  // The verdict, read from the gate rather than re-decided here.
  //
  // It used to be `assert.deepEqual(violations.map((v) => v.capability), [])` — the publishing step's
  // assertion "spelled the same way", which is exactly the trouble: spelled the same is not the same.
  // The baselines above are a RATCHET and could accept a standing violation; the CI step was a hard
  // zero. Both claims were defensible and only one could be the threshold, so the threshold moved
  // into `PARITY_VIOLATION_CEILING` and both runners now call `affordanceParityGate()`. Admitting a
  // standing violation is still possible — it means raising that ceiling, in one place, which raises
  // it for CI in the same edit. That is the property the two literals could not have.
  //
  // The baselines stay, because they say WHICH capability is one-sided and in which direction, and
  // `FULLY_WIRED` is the positive control that stops a violation being silenced by deletion. What
  // they no longer are is a second way to pass.
  const gate = affordanceParityGate();
  assert.ok(gate.passed, `${gate.headline}\n  ${gate.violations.map((v) => `${v.capability}: ${v.problem}`).join("\n  ")}`);
  assert.deepEqual(gate.violations, violations, "the gate must report the checker's findings, unfiltered");
});

test("the parity gate's verdict tracks the registry it is given — negative control", () => {
  // The threshold has one home now, so it has to be watched there. A gate that cannot go red is
  // worth nothing to either of the two runners that depend on it.
  const broken = CAPABILITIES.map((c) =>
    c.id === "import" ? { ...c, machine: [{ at: "gone", status: "absent" as const, note: "removed for the test", parameters: [] }] } : c);
  const red = affordanceParityGate(broken);
  assert.equal(red.passed, false, "a one-sided capability must fail the gate");
  assert.match(red.headline, /UX-I1: 1 violation\(s\) over \d+ capabilities/);
  assert.ok(affordanceParityGate().passed, "and the real registry must pass it");
});

test("no capability is agent-only", () => {
  // The asymmetry UX-I1 exists to catch, computed directly rather than inferred from two lists. A
  // capability with a machine affordance and no human one means an agent can do something the user
  // has no control for, and `explore-space` was exactly that for a wave.
  //
  // Asserted against the baseline rather than against a literal zero, and that stays true now the
  // baseline is empty: the comparison is what lets the next declared-before-buildable capability be
  // recorded instead of pretended away. A literal here would have to be edited twice — once to open
  // the gap and once to close it — and the second edit is the one people forget.
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
const explained = (a: AffordanceSite): boolean => a.status === "wired" || (a.note ?? "").length > 8;

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

/**
 * And the other direction, in the markup: every `<button>` the page ships is a declared site.
 *
 * **Why this is not already covered.** The three rungs the binder's header names run
 * declared-to-element: the compiler refuses a wired site with no element, the test above checks the
 * id against the markup, the browser tier compares the served page's stamped set to the registry.
 * The reverse — an element reaching the model that NO capability declares — had one rung only, the
 * browser tier's button sweep, and a browser sweep sees the states its fixture drives. That sweep
 * is total today by the coincidence of two unrelated facts: every control is static markup, and
 * `mountIf` hides a region with the `hidden` attribute instead of removing it, so a hidden
 * region's buttons are still in the document. Either fact could change in a wave that had no idea
 * it was holding a gate up — and the gate would go on passing, over a page it no longer sees all of.
 *
 * So the correspondence is asserted here too, where it is a fact about the FILE and no state has to
 * be reached to see it. A button that is genuinely not a capability — navigation chrome, a
 * disclosure toggle — fails this and the browser sweep together, which makes declaring it or naming
 * it an exemption a decision somebody makes on purpose rather than an omission nobody notices.
 */
test("every button index.html ships is a declared affordance site", () => {
  // Comments stripped, for the reason the section scan below learned the hard way: this file argues
  // for its own structure in HTML comments that quote the markup they argue about.
  const html = readFileSync("index.html", "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const buttons = [...html.matchAll(/<button\b([^>]*)>/g)].map((m) => m[1] as string);
  assert.ok(buttons.length > 10, `only ${buttons.length} <button> found — the scan is wrong, not the page`);

  const declared = new Set([
    ...boundHumanAffordances().map((a) => a.element.id),
    // The named exemption, read from the registry rather than listed here: the browser sweep reads
    // the same constant, so the two tiers cannot disagree about what is chrome.
    ...CHROME_CONTROLS.map((c) => c.id),
  ]);
  const undeclared = buttons
    .map((attrs) => /\bid="([a-zA-Z0-9-]+)"/.exec(attrs)?.[1] ?? null)
    // A button with no id cannot be stamped at all — the binder reaches an element by id — so it is
    // reported under its attributes rather than silently skipped.
    .filter((id) => id === null || !declared.has(id))
    .map((id) => id ?? "(no id)");
  assert.deepEqual(undeclared, [],
    `${undeclared.length} button(s) no capability declares: ${undeclared.join(", ")}. Declare the `
    + "capability, or add it to CHROME_CONTROLS with a reason.");
});

test("an undeclared button is caught — negative control", () => {
  // The predicate against markup carrying the defect, so the test above cannot pass on a scan that
  // matches nothing or a registry that declares everything.
  const broken = '<button id="export" type="button"></button><button id="chrome-menu"></button><button></button>';
  const declared = new Set(["export"]);
  const found = [...broken.matchAll(/<button\b([^>]*)>/g)]
    .map((m) => /\bid="([a-zA-Z0-9-]+)"/.exec(m[1] as string)?.[1] ?? null)
    .filter((id) => id === null || !declared.has(id))
    .map((id) => id ?? "(no id)");
  assert.deepEqual(found, ["chrome-menu", "(no id)"], "an undeclared button and an id-less one must both be reported");
});

test("a renamed control is caught — negative control", () => {
  // The predicate, driven against a registry whose element was renamed out from under it. Without
  // this the test above passes for a registry that declares nothing.
  const html = readFileSync("index.html", "utf8");
  const present = new Set([...html.matchAll(/id="([a-zA-Z0-9-]+)"/g)].map((m) => m[1] as string));
  // The fixture carries a `path`, which it did not have to before wave 3 flipped SH-I8 hard. That
  // is the flip's first consequence and it is the one worth having: a fabricated affordance cannot
  // be written without a route either, so a test can no longer construct a shape the registry is
  // forbidden to hold.
  const renamed = CAPABILITIES.map((c) => c.id === "export"
    ? {
        ...c,
        human: [{
          at: "header.export", status: "wired" as const, element: { id: "export-v2" },
          path: [{ surface: "header" as const, via: "activate" as const }],
        }],
      }
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
  // Empty, and the emptiness is the claim FR-AGENT-2 wanted: there is no capability an agent can use
  // that the user cannot see or reverse, so there is no divergence for this list to warn about. It
  // held `explore-space` for a wave, and `check-query` for one review.
  assert.deepEqual(d.affordanceGaps, []);

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
