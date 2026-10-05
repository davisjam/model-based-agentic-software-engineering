/**
 * The agent surface's coverage gate: every operation the API advertises is DRIVEN, in a browser.
 *
 * **The asymmetry this closes.** The human surface has a real coverage gate — `npm run check:parity`
 * reports "UX-I1: 0 violations over 26 capabilities" and fails on a one-sided change. The agent
 * surface had nothing equivalent. `describe()` advertises an operation list, the browser tier drove
 * a couple of dozen `window.mage` paths, and nothing measured the difference. So an operation could
 * be advertised to agents and never once executed by a test, which is how an FR-AGENT regression
 * ships silently: the registry says the capability is machine-wired, `describe()` repeats it, and no
 * run ever calls it.
 *
 * **Model-based, which here means the DENOMINATOR IS DERIVED AT RUNTIME.** The expected set is
 * `window.mage.describe().operations`, read out of the served page. Not a literal array in this
 * file: a hand-written list is the hand-maintained brochure this project keeps refusing, and it
 * would go stale in exactly the direction that matters — an operation added to the registry would
 * join `describe()` and never join the list, so the gate would report full coverage of a smaller
 * surface. `describe()` projects the capability registry, which is the model; this file compares the
 * page's own self-description against what it drove.
 *
 * **Two axes, because one of them cannot see the other's hole.**
 *
 *  - The OPERATION axis asks whether every advertised capability was exercised. Its expected set is
 *    `describe().operations`, and its measurement is a table of drives keyed by the same names —
 *    table-driven, so a newly advertised operation fails this gate until it is given a drive. That
 *    failure mode is the point of the shape.
 *  - The CALLABLE axis asks whether every function on `window.mage` was actually called. Its
 *    expected set is the live object, walked. It exists because `describe().operations` names
 *    CAPABILITIES, and the API has callables that belong to no capability row at all: the four
 *    `view.*` methods are non-semantic by construction and therefore in no census, `debug.sparql` is
 *    fenced OUTSIDE the semantic interface by a ruling, and `analysis.inFlight` / `analysis.cancel`
 *    are the reporting half of a capability rather than the capability. An operation-only gate reads
 *    26 of 26 while nine callables go untouched.
 *
 *    It also catches a SECOND spelling of a row that IS driven, which is the M5 case: the five
 *    `model.*` facade methods all belong to capability rows the operation axis already covers, so
 *    `describe().operations` could not have noticed them arriving. The callable axis reported all
 *    five as undriven the moment they landed. Their drives therefore live inside the `inspect`,
 *    `query` and `validate` drivers — beside the spellings they are twins of, where the assertion
 *    that matters is that the two agree.
 *
 * The second axis is measured by INSTRUMENTATION rather than declaration: the suite wraps every
 * function on `window.mage` in a recorder before the drives run, and reads back the set that was
 * called. A declared mapping from drive to path would be a third list to maintain, and it would
 * record what the author believed a drive calls rather than what it called.
 *
 * **Exemptions are deliberate, reasoned, and capped.** Both maps are EMPTY today, and the numbers
 * this run reports are 26 of 26 operations and every callable on the surface. A gate that exempts
 * its way to zero is worse than no gate, because it reports coverage that does not exist — so an
 * exemption needs a reason over a floor, the count is held under a named ceiling that has to be
 * edited deliberately, and the negative control at the foot of this file drives every way the audit
 * is supposed to fire.
 *
 * **What this does not claim.** A drive asserts an OBSERVABLE EFFECT — a count moved, an id appears,
 * an outcome arrived, a hash advanced — and that is coverage, not conformance. The deep semantics of
 * each operation stay where they are: the node tier's seven hundred tests over the engine, the
 * validator and the services facade. This gate's subject is reachability through the published
 * agent surface in a real browser.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  startServerOnFreePort, launchBrowser, shutdown, openWorkbench, writeReceipt,
  WORKBENCH_DIR, AGENT_COVERAGE_RECEIPT_PATH,
} from "./harness.mjs";
import { CAPABILITIES } from "../../src/app/capabilities.ts";
import { entityIri, relationTypeIri } from "../../src/rdf/iri.ts";
import { VALIDATION_AUTHORITY } from "../../src/validator/result.ts";

// ----------------------------------------------------------------------------------------------
// The audit: a pure function, so the negative control can drive it with the defects
// ----------------------------------------------------------------------------------------------

/**
 * A reason floor, the same one `test/gate-reachability.test.ts` uses and for the same cause: an
 * unjustified declaration is how a control becomes decoration. "hard to drive" is a note; a
 * mechanism, a dependency or a ruling is a decision someone else can review.
 */
const MIN_REASON = 40;

/**
 * How many entries either exemption map may hold. **ZERO, measured.**
 *
 * Every operation `describe()` advertises and every callable on `window.mage` is driven at this
 * commit, so the honest ceiling is zero and raising it is a deliberate edit to a named constant —
 * the discipline `PARITY_VIOLATION_CEILING` already holds for UX-I1. The alternative is an
 * open-ended exemption map, and an open-ended exemption map is how a coverage number stops being a
 * coverage number.
 */
const EXEMPTION_CEILING = 0;

/**
 * Compare what an interface ADVERTISES against what a run DROVE.
 *
 * Four findings, and the last two are what keep the map from rotting: something advertised and
 * neither driven nor excused; an entry naming something the interface does not advertise, which has
 * outlived its subject; an excuse with no reason; and the same thing both driven and excused, which
 * is a claim and its own contradiction.
 */
function auditCoverage({ subject, advertised, driven, exemptions, ceiling = EXEMPTION_CEILING }) {
  const issues = [];
  if (advertised.length === 0) {
    issues.push(`nothing is advertised as ${subject}, so this gate has no denominator. Either the `
      + `interface lost its self-description or the reader is looking in the wrong place — and an `
      + `empty denominator must never read as full coverage.`);
    return issues;
  }
  const drivenSet = new Set(driven);
  const names = Object.keys(exemptions);
  for (const name of advertised) {
    const reason = exemptions[name];
    if (drivenSet.has(name)) {
      if (reason !== undefined) {
        issues.push(`\`${name}\` is exempted from the ${subject} gate and this run drove it. Delete `
          + `the exemption: a declaration that something is not covered, when it is, misreports the `
          + `gate in the direction that costs the next reader their trust in the number.`);
      }
      continue;
    }
    if (reason === undefined) {
      issues.push(`\`${name}\` is advertised as ${subject} and nothing drove it. Add a drive, or `
        + `declare the exemption with the reason it cannot be driven. An advertised operation no `
        + `test executes is how an FR-AGENT regression ships: the registry says it is wired, `
        + `\`describe()\` repeats it, and no run ever calls it.`);
      continue;
    }
    if (reason.trim().length < MIN_REASON) {
      issues.push(`\`${name}\` is exempted from the ${subject} gate with a ${reason.trim().length}-`
        + `character reason; at least ${MIN_REASON} are required. State the mechanism, the `
        + `dependency, or the ruling.`);
    }
  }
  const advertisedSet = new Set(advertised);
  for (const name of [...names, ...driven].sort()) {
    if (advertisedSet.has(name)) continue;
    issues.push(`the ${subject} gate names \`${name}\`, which the interface does not advertise. A `
      + `drive or an exemption for something that no longer exists outlives its subject, and it `
      + `inflates the covered count against a denominator that has shrunk.`);
  }
  if (names.length > ceiling) {
    issues.push(`${names.length} ${subject} exemption(s) are declared and the ceiling is ${ceiling}. `
      + `Raising the ceiling is the sanctioned move and it is a deliberate edit — but a gate that `
      + `exempts its way to green reports coverage that does not exist, so the number has to be `
      + `argued rather than grown.`);
  }
  return [...new Set(issues)];
}

// ----------------------------------------------------------------------------------------------
// The fixture
// ----------------------------------------------------------------------------------------------

let server;
let origin;
let browser;
let page;
let diagnostics;
let flagshipYaml;
/** `describe().operations`, read out of the served page. The operation axis's denominator. */
let advertisedOperations = [];
/** What the drives below reported, for the receipt. One entry per operation driven. */
const drives = [];
const measured = {};

/** Load the flagship system, so each drive starts from a known revision rather than its sibling's. */
const loadFlagship = () => page.evaluate((text) => window.mage.load(text), flagshipYaml);

/**
 * Walk `window.mage` and wrap every function in a recorder.
 *
 * Installed in `before`, read by the callable-axis test at the foot of this file — so the file's
 * declaration order is load-bearing, and the readout asserts the recorder is still in place rather
 * than trusting it. Each wrapper is tagged, so a callable installed AFTER this ran is reported as
 * unwrapped instead of quietly counting as uncovered for the wrong reason.
 *
 * `window.mage` itself is non-configurable (`main.ts` defines it that way deliberately), which is
 * why this wraps its MEMBERS in place rather than proxying the object.
 */
const installRecorder = () => page.evaluate(() => {
  const invoked = new Set();
  const wrap = (owner, prefix, depth) => {
    for (const key of Object.keys(owner)) {
      const path = prefix === "" ? key : `${prefix}.${key}`;
      const value = owner[key];
      if (typeof value === "function") {
        const recorded = (...args) => {
          invoked.add(path);
          return value.apply(owner, args);
        };
        recorded.mageRecordedPath = path;
        owner[key] = recorded;
        continue;
      }
      if (value !== null && typeof value === "object" && depth < 3) wrap(value, path, depth + 1);
    }
  };
  wrap(window.mage, "", 0);
  window.mageInvoked = invoked;
  return invoked instanceof Set;
});

/** The live callable surface, the recorder's verdict on each member, and the data members. */
const readSurface = () => page.evaluate(() => {
  const callables = [];
  const unwrapped = [];
  const data = [];
  const walk = (owner, prefix, depth) => {
    for (const key of Object.keys(owner)) {
      const path = prefix === "" ? key : `${prefix}.${key}`;
      const value = owner[key];
      if (typeof value === "function") {
        callables.push(path);
        if (value.mageRecordedPath !== path) unwrapped.push(path);
        continue;
      }
      if (value !== null && typeof value === "object" && depth < 3) { walk(value, path, depth + 1); continue; }
      data.push(path);
    }
  };
  walk(window.mage, "", 0);
  return {
    callables: callables.sort(),
    unwrapped: unwrapped.sort(),
    data: data.sort(),
    invoked: [...(window.mageInvoked ?? [])].sort(),
    recorderInstalled: window.mageInvoked instanceof Set,
  };
});

before(async () => {
  ({ server, origin } = await startServerOnFreePort());
  browser = await launchBrowser();
  ({ page, diagnostics } = await openWorkbench(browser, origin));
  flagshipYaml = await readFile(join(WORKBENCH_DIR, "examples", "message-bus", "system.mage.yaml"), "utf8");
  assert.ok(await installRecorder(), "the invocation recorder did not install");
  advertisedOperations = await page.evaluate(() => window.mage.describe().operations.map((o) => o.name));
}, { timeout: 180_000 });

after(async () => {
  if (drives.length > 0) {
    const path = await writeReceipt({
      origin, ranAt: new Date().toISOString(), ...measured, drives, diagnostics,
    }, AGENT_COVERAGE_RECEIPT_PATH);
    console.log(`agent-coverage receipt: ${path}`);
  }
  await shutdown({ browser, server });
});

// ----------------------------------------------------------------------------------------------
// The drives: one per capability `describe()` advertises, keyed by the name it advertises
// ----------------------------------------------------------------------------------------------
//
// Keyed by capability id, because that is what `describe().operations[].name` carries. Ten of the
// rows share one machine affordance — `window.mage.transact` — and each still earns its own drive,
// because the capability is the OPERATION the transaction carries: a single `transact` call would
// cover `create-element` and leave `delete-model` as untested as if nothing had run.
//
// Every drive starts by reloading the flagship system, so the set is order-independent and each
// drive establishes its own precondition. `undo` therefore makes an edit before undoing one, which
// is what a self-contained drive of `undo` looks like.
//
// Fixture values are LOOKED UP, never spelled: the entity to annotate, the model to add a relation
// to, the relation type that licenses composition, the saved question to read evidence for, and the
// example that declares a state machine all come out of `inspect()`, `savedQueries()` or
// `examples()` at run time. A spelled id makes the drive a claim about the example file.

const DRIVERS = {
  async import() {
    const context = await loadFlagship();
    assert.equal(context.systemId, "message-bus");
    assert.ok(context.counts.entities > 0, "load() reported a system with no entities");
    return { systemId: context.systemId, entities: context.counts.entities };
  },

  async "load-example"() {
    const result = await page.evaluate(async () => {
      const catalogue = await window.mage.examples();
      const context = await window.mage.loadExample(catalogue[0].id);
      return { offered: catalogue.length, id: catalogue[0].id, systemId: context.systemId, counts: context.counts };
    });
    assert.ok(result.offered > 0, "`examples()` describes nothing, so `loadExample` has no subject");
    assert.equal(result.systemId, result.id, "the loaded system is not the example that was asked for");
    return result;
  },

  async export() {
    await loadFlagship();
    const round = await page.evaluate(() => {
      const text = window.mage.export();
      const before = window.mage.context().hash;
      // Re-loading the export is the assertion that matters: a serializer that drops a section
      // returns a plausible string and a different system.
      const after = window.mage.load(text).hash;
      return { length: text.length, before, after };
    });
    assert.ok(round.length > 0, "export() returned nothing");
    assert.equal(round.after, round.before, "the exported text does not reload as the same system");
    return { length: round.length };
  },

  async inspect() {
    await loadFlagship();
    const inspection = await page.evaluate(() => {
      const i = window.mage.inspect();
      return {
        hash: i.hash, entities: i.entities.length, models: i.models.length,
        relationTypes: i.relationTypes.length,
        purposeful: i.models.filter((m) => m.question !== null).length,
      };
    });
    assert.ok(inspection.entities > 0 && inspection.models > 0, "inspect() reported an empty system");
    assert.equal(inspection.purposeful, inspection.models,
      "a model came back with no question, so inspect() is not carrying purpose");

    // `window.mage.model.elements` is the second machine affordance of this row — the same
    // `workspace.state` read, filtered by the model rather than by the caller. Driven against the
    // unfiltered `inspect()` above, which is the comparison that matters: `elements` exists because
    // an agent's only route to these ids was to pull the whole table over and filter it itself, so
    // the two must agree about what the system declares.
    const selected = await page.evaluate(() => {
      const all = window.mage.model.elements();
      const type = window.mage.inspect().entities.find((e) => e.type !== null).type;
      const byType = window.mage.model.elements({ type });
      return { all, byType, type, declared: window.mage.inspect().entities.map((e) => e.id).sort() };
    });
    assert.equal(selected.all.selected, true,
      `an enumeration over the flagship was refused: ${JSON.stringify(selected.all)}`);
    assert.deepEqual(selected.all.ids, selected.declared,
      "`elements` and `inspect` disagree about which entities this system declares");
    assert.equal(selected.all.hash, inspection.hash, "`elements` names a revision `inspect` is not on");
    assert.ok(selected.byType.ids.length > 0 && selected.byType.ids.length < selected.all.ids.length,
      `the '${selected.type}' filter selected ${selected.byType.ids.length} of ${selected.all.ids.length}`
      + " — selecting all or none would not show it filtering");

    // `window.mage.model.count` is this row's THIRD machine affordance — the same `workspace.state`
    // read, reported as a cardinality instead of a list. Driven against the enumeration above
    // rather than against a number written here: a recorded figure would pass while agreeing with
    // nothing, and the property worth holding over the served bundle is that the two spellings of
    // one read do not disagree about how many.
    const counted = await page.evaluate(() => {
      const type = window.mage.inspect().entities.find((e) => e.type !== null).type;
      return {
        all: window.mage.model.count(),
        byType: window.mage.model.count({ type }),
        refused: window.mage.model.count("not-a-selector"),
      };
    });
    assert.equal(counted.all.counted, true,
      `a count over the flagship was refused: ${JSON.stringify(counted.all)}`);
    assert.deepEqual(counted.all.count, { exact: true, value: selected.all.ids.length, basis: "entity-table" },
      "`count` and `elements` disagree about how many entities this system declares");
    assert.equal(counted.byType.counted && counted.byType.count.value, selected.byType.ids.length,
      "the filtered count disagrees with the filtered enumeration");
    assert.equal(counted.all.hash, inspection.hash, "`count` names a revision `inspect` is not on");
    // The §3.2 holding, over the served bundle: a refusal reports no figure at all, so a caller
    // reading the field without branching finds nothing to misread as a total.
    assert.equal(counted.refused.counted, false, "an unreadable selector was counted anyway");
    assert.equal(Object.hasOwn(counted.refused, "count"), false,
      "a refused count carried a figure; the engine established no selection to count");

    return {
      ...inspection, selected: selected.all.ids.length, byType: selected.byType.ids.length,
      counted: counted.all.count.value,
    };
  },

  async validate() {
    await loadFlagship();
    const result = await page.evaluate(() => window.mage.validate());
    assert.equal(typeof result.ok, "boolean");
    // The authority, compared against the module that declares it rather than spot-checked for
    // non-emptiness: the ruling is that a validation result must say which implementation decided
    // it, and the one failure worth catching is a served bundle whose answer has drifted from the
    // one constant that writes it.
    assert.deepEqual(result.authority, VALIDATION_AUTHORITY,
      "the served page reports a different validation authority than the module that declares it");
    assert.equal(result.hash, await page.evaluate(() => window.mage.context().hash),
      "validate() describes a revision the workspace is not on");

    // `window.mage.model.violations` is the facade's noun for this operation and the row's second
    // machine affordance. Object equality is the assertion: a facade that re-decided anything would
    // be the second party the authority declaration exists to forbid.
    const bySpelling = await page.evaluate(() => ({
      operation: window.mage.validate(), noun: window.mage.model.violations(),
    }));
    assert.deepEqual(bySpelling.noun, bySpelling.operation,
      "`model.violations` and `validate` disagree about the same model at the same revision");
    return { ok: result.ok, findings: result.findings.length,
      authority: result.authority.implementation };
  },

  async query() {
    await loadFlagship();
    const answers = await page.evaluate(() => {
      // A question the flagship licenses, derived from the system rather than spelled: the first
      // saved question's own shape is not reachable from the agent API, so this asks the simplest
      // licensed form over a relation type an existing edge uses.
      const inspection = window.mage.inspect();
      const model = inspection.models.find((m) => m.relations.length > 0);
      const edge = model.relations[0];
      const document = {
        kind: "graph", quantifier: "exists",
        graph: { form: "direct", relation: edge.type, from: edge.from, to: edge.to },
      };
      // `ask` is the second machine affordance of this row — the same service, returning the verdict
      // WITH its grounding — so the row is not covered until both have run.
      return { result: window.mage.query(document), property: window.mage.ask(document), edge };
    });
    assert.equal(answers.result.outcome, "holds",
      `a question over an edge the model asserts came back ${answers.result.outcome}`);
    assert.equal(answers.property.outcome, answers.result.outcome,
      "`ask` and `query` disagree about the same question over the same system");
    assert.ok(answers.property.grounds.length > 0, "`ask` returned a verdict with no grounding (UX-I5)");

    // The three facade spellings of this row — `model.related`, `model.reachable`, `model.path`.
    // Each is driven against the typed document it constructs, and the assertion is OBJECT EQUALITY:
    // the facade is a vocabulary over `workspace.query`, so a difference here is the facade having
    // acquired semantics of its own, which is what MQ-I8 exists to forbid. The node tier holds the
    // derivation statically; this holds it in the served bundle.
    const facade = await page.evaluate(() => {
      const inspection = window.mage.inspect();
      const allowed = inspection.relationTypes.find((r) => r.pathComposition === "allowed");
      const forbidden = inspection.relationTypes.find((r) => r.pathComposition === "forbidden");
      const edge = (type) => inspection.models
        .flatMap((m) => m.relations).find((e) => e.type === type);
      const open = edge(allowed.id);
      const shut = edge(forbidden.id);
      return {
        related: window.mage.model.related(open.from, allowed.id, "outgoing"),
        relatedDocument: window.mage.query({
          kind: "graph", quantifier: "exists",
          graph: { form: "successors", relation: allowed.id, from: open.from },
        }),
        reachable: window.mage.model.reachable(open.from, allowed.id, open.to),
        reachableDocument: window.mage.query({
          kind: "graph", quantifier: "exists",
          graph: { form: "reachability", relation: allowed.id, from: open.from, to: open.to },
        }),
        path: window.mage.model.path(open.from, open.to, allowed.id),
        pathDocument: window.mage.query({
          kind: "graph", quantifier: "exists",
          graph: { form: "path", relation: allowed.id, from: open.from, to: open.to },
        }),
        // V7, through the facade: a relation declared without path semantics must refuse the
        // composing spelling here exactly as it refuses a typed document.
        refusedByV7: window.mage.model.reachable(shut.from, forbidden.id, shut.to),
        steppedByV7: window.mage.model.related(shut.from, forbidden.id, "outgoing"),
        neighbour: open.to,
      };
    });
    assert.deepEqual(facade.related, facade.relatedDocument,
      "`model.related` and the typed document it builds disagree about one question");
    assert.deepEqual(facade.reachable, facade.reachableDocument, "`model.reachable` disagrees with its document");
    assert.deepEqual(facade.path, facade.pathDocument, "`model.path` disagrees with its document");
    assert.equal(facade.related.outcome, "holds",
      `one step along a declared edge answered ${facade.related.outcome}`);
    assert.ok(facade.related.evidence?.nodes?.includes(facade.neighbour),
      "the traversal's witness does not name the neighbour the model declares");
    assert.equal(facade.refusedByV7.outcome, "unlicensed",
      `composing a path-forbidden relation answered ${facade.refusedByV7.outcome}; V7 refuses it`);
    assert.equal(facade.steppedByV7.outcome, "holds",
      "one step along a path-forbidden relation is licensed; only composition is not");
    return { outcome: answers.result.outcome, grounds: answers.property.grounds.length,
      facade: { related: facade.related.outcome, reachable: facade.reachable.outcome,
        path: facade.path.outcome, refusedByV7: facade.refusedByV7.outcome } };
  },

  async "check-query"() {
    await loadFlagship();
    const report = await page.evaluate(() => {
      // A multi-hop question over a type that forbids composition: the V7 refusal, which is the
      // case that makes `check` more than a weak answer.
      const inspection = window.mage.inspect();
      const forbidden = inspection.relationTypes.find((r) => r.pathComposition === "forbidden");
      const model = inspection.models.find((m) => m.relations.some((e) => e.type === forbidden.id));
      const edge = model.relations.find((e) => e.type === forbidden.id);
      return window.mage.check({
        kind: "graph", quantifier: "exists",
        graph: { form: "reachability", relation: forbidden.id, from: edge.from, to: edge.to },
      });
    });
    assert.equal(report.outcome, "refused",
      `a composing question over a forbidden type reported ${report.outcome}`);
    assert.ok(report.alternatives.length > 0,
      "a refusal with no alternatives is the half of `check` that justifies its own row");
    return { outcome: report.outcome, alternatives: report.alternatives.length };
  },

  async analyze() {
    await loadFlagship();
    const read = await page.evaluate(() => {
      const results = window.mage.savedQueries();
      const properties = window.mage.properties();
      return {
        saved: Object.keys(results).length,
        properties: properties.length,
        outcomes: Object.values(results).map((r) => r.outcome),
        grounded: properties.filter((p) => p.grounds.length > 0).length,
      };
    });
    assert.ok(read.saved > 0, "the flagship system saves questions; savedQueries() returned none");
    assert.equal(read.properties, read.saved,
      "properties() and savedQueries() disagree about how many statements this system holds");
    assert.ok(read.outcomes.every((o) => typeof o === "string" && o.length > 0),
      "a saved question came back with no outcome");
    return read;
  },

  async "explore-space"() {
    // The one drive that cannot use the flagship: exploring a configuration space needs a state
    // machine, and the flagship declares none — so this LOOKS UP a shipped example that does
    // rather than naming one. A spelled id here would make the drive a claim about the catalogue.
    const space = await page.evaluate(async () => {
      for (const described of await window.mage.examples()) {
        const context = await window.mage.loadExample(described.id);
        if (context.counts.machines === 0) continue;
        const pending = await window.mage.analysis.explore(500);
        return { id: described.id, status: pending.status, space: pending.space ?? null };
      }
      return { id: null, status: "no-machine-example", space: null };
    });
    assert.ok(space.id !== null, "no shipped example declares a machine, so exploration has no subject");
    assert.equal(space.status, "ok-space",
      `exploration came back ${space.status} over ${space.id}: ${JSON.stringify(space)}`);
    assert.ok(space.space.statesExplored > 0, "the walk reported no states");
    assert.equal(typeof space.space.complete, "boolean", "the summary does not say whether it finished");
    return { example: space.id, statesExplored: space.space.statesExplored, complete: space.space.complete };
  },

  async "inspect-evidence"() {
    await loadFlagship();
    const readings = await page.evaluate(() => {
      const ids = Object.keys(window.mage.savedQueries());
      return {
        // Every saved question, so the drive covers the found arm AND whichever absence arms this
        // example reaches, rather than the first id's arm alone.
        readings: ids.map((id) => {
          const reading = window.mage.evidence(id);
          return { id, found: reading.found, cause: reading.cause ?? null };
        }),
        // The absence arm no system can avoid, and the one the nullable used to collapse.
        missing: window.mage.evidence("no-question-is-named-this"),
      };
    });
    assert.ok(readings.readings.some((r) => r.found),
      `no saved question yielded a witness: ${JSON.stringify(readings.readings)}`);
    assert.equal(readings.missing.found, false);
    assert.equal(readings.missing.cause, "no-such-question");
    assert.equal(readings.missing.result, null, "a question nobody asked came back carrying an answer");
    assert.ok(readings.missing.savedQuestions.length > 0,
      "the absence does not report what this system does save, which is the field that fixes the diagnosis");
    return { read: readings.readings.length, found: readings.readings.filter((r) => r.found).length };
  },

  async undo() {
    await loadFlagship();
    const moved = await page.evaluate(() => {
      const before = window.mage.context().hash;
      window.mage.transact({
        transaction: { base: before, operations: [{ op: "add-entity", id: "undo-drive" }] },
      });
      const edited = window.mage.context().hash;
      const undone = window.mage.undo();
      const after = window.mage.context();
      return { before, edited, undone, after: after.hash, canRedo: after.canRedo,
        present: window.mage.inspect().entities.some((e) => e.id === "undo-drive") };
    });
    assert.ok(moved.undone, "undo() returned false with an edit in the history");
    assert.equal(moved.after, moved.before, "undo() did not return the system to the prior revision");
    assert.equal(moved.present, false, "the undone entity is still in the system");
    assert.ok(moved.canRedo, "undo() left nothing to redo");
    return { returnedTo: moved.before };
  },

  async redo() {
    await loadFlagship();
    const moved = await page.evaluate(() => {
      window.mage.transact({
        transaction: { base: window.mage.context().hash, operations: [{ op: "add-entity", id: "redo-drive" }] },
      });
      const edited = window.mage.context().hash;
      window.mage.undo();
      const redone = window.mage.redo();
      return { edited, redone, after: window.mage.context().hash,
        present: window.mage.inspect().entities.some((e) => e.id === "redo-drive") };
    });
    assert.ok(moved.redone, "redo() returned false with an undone edit to replay");
    assert.equal(moved.after, moved.edited, "redo() did not restore the edited revision");
    assert.ok(moved.present, "the redone entity is not in the system");
    return { restoredTo: moved.edited };
  },

  async "create-element"() {
    await loadFlagship();
    const made = await page.evaluate(() => {
      const before = window.mage.context().counts.entities;
      const outcome = window.mage.transact({
        transaction: {
          base: window.mage.context().hash,
          operations: [{ op: "add-entity", id: "coverage-entity", label: "Coverage entity" }],
        },
      });
      return { outcome, before, after: window.mage.context().counts.entities,
        entity: window.mage.inspect().entities.find((e) => e.id === "coverage-entity") ?? null };
    });
    assert.ok(made.outcome.ok, `add-entity was refused: ${JSON.stringify(made.outcome.findings)}`);
    assert.equal(made.after, made.before + 1);
    assert.equal(made.entity?.label, "Coverage entity");
    return { entities: made.after };
  },

  async "delete-element"() {
    await loadFlagship();
    const removed = await page.evaluate(() => {
      // Its own subject, added and then removed: deleting a fixture entity would couple the drive
      // to which of the example's entities nothing else references.
      window.mage.transact({
        transaction: { base: window.mage.context().hash, operations: [{ op: "add-entity", id: "doomed" }] },
      });
      const before = window.mage.context().counts.entities;
      const outcome = window.mage.transact({
        transaction: { base: window.mage.context().hash, operations: [{ op: "delete-entity", id: "doomed" }] },
      });
      return { outcome, before, after: window.mage.context().counts.entities,
        present: window.mage.inspect().entities.some((e) => e.id === "doomed") };
    });
    assert.ok(removed.outcome.ok, `delete-entity was refused: ${JSON.stringify(removed.outcome.findings)}`);
    assert.equal(removed.after, removed.before - 1);
    assert.equal(removed.present, false);
    return { entities: removed.after };
  },

  async "create-relation"() {
    await loadFlagship();
    const made = await page.evaluate(() => {
      const model = window.mage.inspect().models.find((m) => m.relations.length > 0);
      const type = model.relations[0].type;
      const [from, to] = [model.entities[0], model.entities[1]];
      const before = model.relations.length;
      const outcome = window.mage.transact({
        transaction: {
          base: window.mage.context().hash,
          operations: [{ op: "add-relation", model: model.id, id: "coverage-edge", from, to, type }],
        },
      });
      const after = window.mage.inspect().models.find((m) => m.id === model.id).relations.length;
      return { outcome, model: model.id, type, before, after };
    });
    assert.ok(made.outcome.ok, `add-relation was refused: ${JSON.stringify(made.outcome.findings)}`);
    assert.equal(made.after, made.before + 1);
    return made;
  },

  async "delete-relation"() {
    await loadFlagship();
    const removed = await page.evaluate(() => {
      const model = window.mage.inspect().models.find((m) => m.relations.length > 0);
      const edge = model.relations[0];
      const before = model.relations.length;
      const outcome = window.mage.transact({
        transaction: {
          base: window.mage.context().hash,
          operations: [{ op: "delete-relation", model: model.id, from: edge.from, to: edge.to, type: edge.type }],
        },
      });
      const after = window.mage.inspect().models.find((m) => m.id === model.id).relations.length;
      return { outcome, before, after };
    });
    assert.ok(removed.outcome.ok, `delete-relation was refused: ${JSON.stringify(removed.outcome.findings)}`);
    assert.equal(removed.after, removed.before - 1);
    return removed;
  },

  async "edit-property"() {
    await loadFlagship();
    const changed = await page.evaluate(() => {
      const id = window.mage.inspect().entities[0].id;
      const outcome = window.mage.transact({
        transaction: {
          base: window.mage.context().hash,
          operations: [
            { op: "set-property", id, name: "coverage_flag", value: "driven" },
            // `value`, not `label`: the op's own field name, and the gate caught the guess.
            { op: "set-label", id, value: "Relabelled by the coverage gate" },
          ],
        },
      });
      const entity = window.mage.inspect().entities.find((e) => e.id === id);
      return { outcome, id, value: entity.properties.coverage_flag?.value ?? null, label: entity.label };
    });
    assert.ok(changed.outcome.ok, `set-property was refused: ${JSON.stringify(changed.outcome.findings)}`);
    assert.equal(changed.value, "driven");
    assert.equal(changed.label, "Relabelled by the coverage gate");
    return { id: changed.id };
  },

  async "create-model"() {
    await loadFlagship();
    const made = await page.evaluate(() => {
      const before = window.mage.context().counts.models;
      // `add-model` plus `set-purpose` in ONE transaction, which is what the human form sends: a
      // question-less model is the habit the workbench exists to refuse, so atomicity is the drive.
      const outcome = window.mage.transact({
        transaction: {
          base: window.mage.context().hash,
          operations: [
            { op: "add-model", id: "coverage-model", label: "Coverage model" },
            { op: "set-purpose", scope: "model", id: "coverage-model",
              question: "Does every advertised operation get driven?" },
          ],
        },
      });
      const model = window.mage.inspect().models.find((m) => m.id === "coverage-model") ?? null;
      return { outcome, before, after: window.mage.context().counts.models, question: model?.question ?? null };
    });
    assert.ok(made.outcome.ok, `add-model was refused: ${JSON.stringify(made.outcome.findings)}`);
    assert.equal(made.after, made.before + 1);
    assert.equal(made.question, "Does every advertised operation get driven?",
      "the model committed without the question the same transaction set");
    return { models: made.after };
  },

  async "delete-model"() {
    await loadFlagship();
    const removed = await page.evaluate(() => {
      window.mage.transact({
        transaction: {
          base: window.mage.context().hash,
          operations: [
            { op: "add-model", id: "doomed-model", label: "Doomed" },
            { op: "set-purpose", scope: "model", id: "doomed-model", question: "Is this model removable?" },
          ],
        },
      });
      const before = window.mage.context().counts.models;
      const outcome = window.mage.transact({
        transaction: { base: window.mage.context().hash, operations: [{ op: "delete-model", id: "doomed-model" }] },
      });
      return { outcome, before, after: window.mage.context().counts.models,
        present: window.mage.inspect().models.some((m) => m.id === "doomed-model") };
    });
    assert.ok(removed.outcome.ok, `delete-model was refused: ${JSON.stringify(removed.outcome.findings)}`);
    assert.equal(removed.after, removed.before - 1);
    assert.equal(removed.present, false);
    return { models: removed.after };
  },

  async "add-note"() {
    await loadFlagship();
    const noted = await page.evaluate(() => {
      const id = window.mage.inspect().entities[0].id;
      const before = window.mage.context().hash;
      const outcome = window.mage.transact({
        transaction: {
          base: before, operations: [
            { op: "add-note", scope: "entity", id, note: { kind: "comment", text: "driven by the coverage gate" } },
          ],
        },
      });
      return { outcome, before, after: window.mage.context().hash };
    });
    assert.ok(noted.outcome.ok, `add-note was refused: ${JSON.stringify(noted.outcome.findings)}`);
    // The one capability whose successful use leaves the revision where it was: annotation sits
    // outside the semantic projection, so a note must NOT invalidate a pending agent transaction.
    // Asserting the hash held is therefore the drive, and a moved hash is the regression.
    assert.equal(noted.after, noted.before,
      "a note advanced the system hash, which would invalidate every pending transaction");
    return { hashHeld: true };
  },

  async "save-property"() {
    await loadFlagship();
    const saved = await page.evaluate(() => {
      const model = window.mage.inspect().models.find((m) => m.relations.length > 0);
      const edge = model.relations[0];
      const before = Object.keys(window.mage.savedQueries());
      const outcome = window.mage.transact({
        transaction: {
          base: window.mage.context().hash,
          operations: [{
            op: "save-query", id: "coverage-claim",
            query: {
              kind: "graph", quantifier: "exists",
              graph: { form: "direct", relation: edge.type, from: edge.from, to: edge.to },
            },
          }],
        },
      });
      const after = window.mage.savedQueries();
      return { outcome, before: before.length, after: Object.keys(after).length,
        outcomeOfClaim: after["coverage-claim"]?.outcome ?? null };
    });
    assert.ok(saved.outcome.ok, `save-query was refused: ${JSON.stringify(saved.outcome.findings)}`);
    assert.equal(saved.after, saved.before + 1);
    // Saved as a STATEMENT, not as a stored verdict: the status is recomputed, so reading it back
    // immediately is the assertion that something re-evaluated rather than that a field was written.
    assert.equal(saved.outcomeOfClaim, "holds", "the saved claim was not re-evaluated on read");
    return { saved: saved.after };
  },

  async "retract-property"() {
    await loadFlagship();
    const retracted = await page.evaluate(() => {
      const ids = Object.keys(window.mage.savedQueries());
      const target = ids[0];
      const outcome = window.mage.transact({
        transaction: { base: window.mage.context().hash, operations: [{ op: "delete-query", id: target }] },
      });
      const after = Object.keys(window.mage.savedQueries());
      return { outcome, target, before: ids.length, after: after.length, present: after.includes(target) };
    });
    assert.ok(retracted.outcome.ok, `delete-query was refused: ${JSON.stringify(retracted.outcome.findings)}`);
    assert.equal(retracted.after, retracted.before - 1);
    assert.equal(retracted.present, false);
    return { saved: retracted.after };
  },

  async "inspect-provenance"() {
    await loadFlagship();
    const records = await page.evaluate(() => {
      const before = window.mage.context().hash;
      const read = window.mage.provenance();
      return { count: read.length, shapes: read.map((r) => ({ object: r.object, kind: r.kind })),
        hashAfter: window.mage.context().hash, before };
    });
    assert.ok(records.count > 0, "the flagship system declares provenance; provenance() returned none");
    assert.ok(records.shapes.every((r) => typeof r.object === "string" && r.object.length > 0),
      "a provenance record names no object");
    // Read-only: provenance cannot alter semantics (UX-I6), so reading it must not move the revision.
    assert.equal(records.hashAfter, records.before, "reading provenance advanced the system hash");
    return { records: records.count };
  },

  async "create-hypothesis"() {
    await loadFlagship();
    const opened = await page.evaluate(() => {
      const outcome = window.mage.hypothesis.open("coverage-hypothesis", {
        transaction: {
          base: window.mage.context().hash,
          operations: [{ op: "add-entity", id: "hypothetical", label: "Hypothetical" }],
        },
      });
      const comparison = window.mage.hypothesis.compare();
      return { outcome, label: window.mage.context().hypothesis,
        compared: Object.keys(comparison).length,
        present: window.mage.inspect().entities.some((e) => e.id === "hypothetical") };
    });
    assert.ok(opened.outcome.ok, `opening a hypothesis was refused: ${JSON.stringify(opened.outcome.findings)}`);
    assert.equal(opened.label, "coverage-hypothesis", "context() does not report the open hypothesis");
    assert.ok(opened.present, "the hypothetical edit is not visible on the branch that holds it");
    assert.ok(opened.compared > 0, "compare() offered no saved question to compare, so the branch shows nothing");
    return { label: opened.label, compared: opened.compared };
  },

  async "commit-hypothesis"() {
    await loadFlagship();
    const applied = await page.evaluate(() => {
      window.mage.hypothesis.open("to-apply", {
        transaction: { base: window.mage.context().hash, operations: [{ op: "add-entity", id: "kept" }] },
      });
      const ok = window.mage.hypothesis.apply();
      return { ok, hypothesis: window.mage.context().hypothesis,
        present: window.mage.inspect().entities.some((e) => e.id === "kept") };
    });
    assert.ok(applied.ok, "apply() returned false with a hypothesis open");
    assert.equal(applied.hypothesis, null, "the hypothesis is still open after being applied");
    assert.ok(applied.present, "the applied edit is not in the authoritative system");
    return { applied: true };
  },

  async "discard-hypothesis"() {
    await loadFlagship();
    const discarded = await page.evaluate(() => {
      window.mage.hypothesis.open("to-discard", {
        transaction: { base: window.mage.context().hash, operations: [{ op: "add-entity", id: "dropped" }] },
      });
      const ok = window.mage.hypothesis.discard();
      return { ok, hypothesis: window.mage.context().hypothesis,
        present: window.mage.inspect().entities.some((e) => e.id === "dropped") };
    });
    assert.ok(discarded.ok, "discard() returned false with a hypothesis open");
    assert.equal(discarded.hypothesis, null, "the hypothesis is still open after being discarded");
    assert.equal(discarded.present, false, "the discarded edit survived into the authoritative system");
    return { discarded: true };
  },
};

describe("every operation window.mage.describe() advertises, driven in a browser", () => {
  for (const [name, drive] of Object.entries(DRIVERS)) {
    it(`drives ${name}`, async () => {
      const detail = await drive();
      drives.push({ operation: name, ...detail });
    });
  }
});

// ----------------------------------------------------------------------------------------------
// The surfaces that belong to no capability row — reached through the API, censused by nothing
// ----------------------------------------------------------------------------------------------
//
// These three drives cover callables the operation axis structurally cannot reach, and each is in
// that position for its own stated reason rather than by oversight. They are declared here, after
// the operation table, because they are not operations: nothing in `describe().operations` names
// them, and adding a row for any of them would make the capability census say the workbench gained
// a semantic capability it did not.

describe("the API surface outside the capability census", () => {
  it("view state is readable and writable, and changes no model state", async () => {
    // Non-semantic BY CONSTRUCTION: selection and focus are deliberately not in the IR, not hashed
    // and not in undo history (the shell's §4 ruling), so there is no capability row to drive them
    // from — and that is exactly why the callable axis exists.
    await loadFlagship();
    const view = await page.evaluate(() => {
      const target = window.mage.inspect().entities[0].id;
      const before = window.mage.context().hash;
      window.mage.view.select([target]);
      window.mage.view.focus(target);
      return { selection: window.mage.view.selection(), target: window.mage.view.target(),
        before, after: window.mage.context().hash };
    });
    assert.deepEqual(view.selection, [view.target], "select() and selection() disagree");
    assert.equal(view.after, view.before,
      "moving the view advanced the system hash, so view state has leaked into semantic state");
    drives.push({ operation: "view.*", target: view.target });
  });

  it("a witness focus is view state too, and it names a saved question rather than a verdict", async () => {
    // The witness focus joins `select` and `focus` on the non-semantic side, and for the same
    // reason: it moves which picture carries the highlight and changes nothing the model asserts.
    // What it adds over the two above is that it must survive a re-read — a focus names a saved
    // QUESTION, so the next paint recomputes the answer rather than redrawing a stored verdict.
    await loadFlagship();
    const focus = await page.evaluate(() => {
      const saved = Object.keys(window.mage.savedQueries());
      // The first saved question whose answer carries a witness. Chosen from the live answers, not
      // written down: a hardcoded id would pin this test to one example's authoring.
      const withWitness = saved.find((id) => window.mage.evidence(id).found) ?? null;
      const before = window.mage.context().hash;
      window.mage.view.witness(withWitness);
      const held = window.mage.view.witnessing();
      window.mage.view.witness(null);
      return {
        withWitness, held, cleared: window.mage.view.witnessing(),
        before, after: window.mage.context().hash,
      };
    });
    assert.notEqual(focus.withWitness, null,
      "the flagship example must save at least one question whose answer carries a witness");
    assert.equal(focus.held, focus.withWitness, "witness() and witnessing() disagree");
    assert.equal(focus.cleared, null, "null must clear the focus, or there is no way back to no focus");
    assert.equal(focus.after, focus.before,
      "focusing a witness advanced the system hash, so view state has leaked into semantic state");
    drives.push({ operation: "view.witness", target: focus.withWitness });
  });

  it("the fenced SPARQL console answers, and reports itself as fenced", async () => {
    // `debug.sparql` is OUTSIDE the semantic interface by a ruling, so it is in no capability row —
    // and a debugging surface nobody drives is the next false green. Driven here, with the fence
    // itself asserted: `describe()` must publish the hatch, its reason and the ruling that fenced
    // it, which is how an agent learns the boundary from the API rather than from a code review.
    await loadFlagship();
    const system = await page.evaluate(() => window.mage.context().systemId);
    const { relation, from } = await page.evaluate(() => {
      const inspection = window.mage.inspect();
      const type = inspection.relationTypes.find((r) => r.pathComposition === "allowed");
      const model = inspection.models.find((m) => m.relations.some((e) => e.type === type.id));
      return { relation: type.id, from: model.relations.find((e) => e.type === type.id).from };
    });
    const text = `SELECT ?x WHERE { GRAPH ?g { <${entityIri(system, from).value}> `
      + `<${relationTypeIri(system, relation).value}>+ ?x } }`;
    const answered = await page.evaluate((query) => {
      const full = window.mage.debug.sparql(query);
      return { kind: full.answer.kind, rows: full.answer.rows?.length ?? null, hash: full.systemHash,
        hatches: window.mage.describe().outsideSemanticInterface };
    }, text);
    assert.equal(answered.kind, "select-result", `the console answered ${answered.kind}`);
    assert.ok(answered.rows > 0, "the console answered nothing, so it proves nothing");
    assert.ok(answered.hatches.length > 0, "describe() publishes no fenced surface");
    for (const hatch of answered.hatches) {
      assert.ok(hatch.reason.length > 0, `${hatch.at} is fenced with no stated reason`);
      assert.ok(hatch.fencedBy.length > 0, `${hatch.at} names no ruling that fenced it`);
    }
    drives.push({ operation: "debug.sparql", rows: answered.rows, fenced: answered.hatches.map((h) => h.at) });
  });

  it("an exhausted question escalates to the Worker, and in-flight work can be reported and cancelled", async () => {
    // `analysis.resolveExhausted` is registered as a machine affordance of `query` — a bigger budget
    // for the same question, not a capability of its own — so the operation axis covers the row
    // through `query()` and never touches this method. Its handle is obtainable ONLY from an
    // exhausted answer, which is what makes the escalation reachable only downstream of a deliberate
    // hatch use; driving it therefore starts by exhausting a question on purpose.
    await loadFlagship();
    const system = await page.evaluate(() => window.mage.context().systemId);
    const { relation, from } = await page.evaluate(() => {
      const inspection = window.mage.inspect();
      const type = inspection.relationTypes.find((r) => r.pathComposition === "allowed");
      const model = inspection.models.find((m) => m.relations.some((e) => e.type === type.id));
      return { relation: type.id, from: model.relations.find((e) => e.type === type.id).from };
    });
    const text = `SELECT ?x WHERE { GRAPH ?g { <${entityIri(system, from).value}> `
      + `<${relationTypeIri(system, relation).value}>+ ?x } }`;
    const escalated = await page.evaluate(async (query) => {
      const bounded = window.mage.debug.sparql(query, 1);
      if (bounded.escalation === null) return { kind: bounded.answer.kind, escalated: null, inFlight: [] };
      const pending = window.mage.analysis.resolveExhausted(bounded.escalation);
      const inFlight = window.mage.analysis.inFlight();
      const settled = await pending;
      return { kind: bounded.answer.kind, escalated: settled.status, inFlight };
    }, text);
    assert.equal(escalated.kind, "exhausted",
      `a one-step budget answered ${escalated.kind}; the escalation handle only exists on the exhausted arm`);
    assert.equal(escalated.escalated, "ok-evaluation",
      `the Worker returned ${escalated.escalated} for a question the interactive budget could not finish`);
    assert.ok(escalated.inFlight.length > 0,
      "inFlight() reported nothing while an analysis was running, so an agent cannot report or cancel one");

    // Cancellation, driven against a walk big enough to still be running: the pair exists so an
    // agent can abandon work, and `cancel` is a no-op that a caller cannot distinguish from success
    // unless the cancelled request reports it.
    const cancelled = await page.evaluate(async () => {
      for (const described of await window.mage.examples()) {
        const context = await window.mage.loadExample(described.id);
        if (context.counts.machines === 0) continue;
        const pending = window.mage.analysis.explore(1_000_000);
        const ids = window.mage.analysis.inFlight();
        for (const id of ids) window.mage.analysis.cancel(id);
        const settled = await pending;
        return { ids, status: settled.status };
      }
      return { ids: [], status: "no-machine-example" };
    });
    assert.ok(cancelled.ids.length > 0, "nothing was in flight to cancel");
    drives.push({ operation: "analysis.resolveExhausted", escalated: escalated.escalated,
      cancelled: cancelled.status });
  });
});

// ----------------------------------------------------------------------------------------------
// The gate itself
// ----------------------------------------------------------------------------------------------

/**
 * Operations advertised to agents that this tier does not drive. **EMPTY, and measured.**
 *
 * Every one of the capabilities `describe()` advertises is driven above, so there is nothing to
 * declare — which is the outcome an exemption map is supposed to be arguing towards rather than
 * away from. A future entry carries the mechanism, the dependency or the ruling that makes the
 * operation undrivable, over the reason floor, and raising `EXEMPTION_CEILING` is the second,
 * deliberate half of adding one.
 */
const OPERATION_EXEMPTIONS = {};

/** The same, for the callable surface. Also empty: all of it is reached. */
const CALLABLE_EXEMPTIONS = {};

describe("the agent-coverage gate", () => {
  it("the denominator is the page's own self-description, and it projects the registry", () => {
    // A probe that finds nothing is usually the probe, so the denominator is asserted before the
    // gate reads it. The comparison against the imported registry is the same one
    // `workbench.test.mjs` makes: `describe().operations` IS the registry projected into the page,
    // so a projection that drops or invents an operation is caught at any registry size.
    assert.ok(advertisedOperations.length > 20,
      `the page advertised ${advertisedOperations.length} operation(s) — describe() is not being read`);
    assert.equal(advertisedOperations.length, CAPABILITIES.length,
      `the page advertises ${advertisedOperations.length} operations and the registry declares `
      + `${CAPABILITIES.length}; the gate's denominator would be the wrong number`);
    assert.deepEqual([...advertisedOperations].sort(), CAPABILITIES.map((c) => c.id).sort());
  });

  it("every advertised operation was driven, or carries a reasoned exemption", () => {
    const driven = drives.map((d) => d.operation).filter((name) => advertisedOperations.includes(name));
    const issues = auditCoverage({
      subject: "an operation", advertised: advertisedOperations, driven,
      exemptions: OPERATION_EXEMPTIONS,
    });
    assert.deepEqual(issues, [], `agent operation coverage:\n  ${issues.join("\n  ")}\n`);
    measured.operations = {
      described: advertisedOperations.length,
      covered: new Set(driven).size,
      exempt: Object.keys(OPERATION_EXEMPTIONS).length,
      exemptions: OPERATION_EXEMPTIONS,
    };
    console.log(`FR-AGENT coverage — operations described ${measured.operations.described}, `
      + `driven ${measured.operations.covered}, exempt ${measured.operations.exempt}`);
  });

  it("every callable on window.mage was invoked, or carries a reasoned exemption", async () => {
    // Declared LAST on purpose: it reads what the drives above recorded, so this file's order is
    // load-bearing. Rather than trust that, it asserts the recorder is still installed and that
    // every callable the page now presents is one the recorder wrapped — a method installed after
    // the recorder ran would otherwise look like an ordinary coverage gap.
    const surface = await readSurface();
    assert.ok(surface.recorderInstalled, "the invocation recorder is gone, so the recorded set means nothing");
    assert.deepEqual(surface.unwrapped, [],
      "a callable the recorder never wrapped cannot be measured; it was installed after the recorder ran");
    assert.ok(surface.callables.length > 25,
      `walked ${surface.callables.length} callable(s) on window.mage — the walk is wrong`);
    // The non-function members, pinned as an exact set: a new data member would otherwise escape
    // both axes, being neither an advertised operation nor a callable.
    assert.deepEqual(surface.data, ["version"],
      "window.mage grew a data member; decide whether it is API and give it a reader either way");

    const issues = auditCoverage({
      subject: "a callable", advertised: surface.callables, driven: surface.invoked,
      exemptions: CALLABLE_EXEMPTIONS,
    });
    assert.deepEqual(issues, [], `agent callable coverage:\n  ${issues.join("\n  ")}\n`);
    measured.callables = {
      described: surface.callables.length,
      covered: surface.invoked.length,
      exempt: Object.keys(CALLABLE_EXEMPTIONS).length,
      exemptions: CALLABLE_EXEMPTIONS,
      surface: surface.callables,
    };
    console.log(`FR-AGENT coverage — callables on window.mage ${measured.callables.described}, `
      + `invoked ${measured.callables.covered}, exempt ${measured.callables.exempt}`);
  });

  it("thirty drives left a clean console", () => {
    // The drives above assert their own effects, which catches a THROWN error — `page.evaluate`
    // rejects and the drive reds. What it cannot catch is an asynchronous one: a repaint that threw
    // after the call returned, a Worker rejection nobody awaited, a 404 for an asset a drive pulled
    // in. Those land in the recorders `openServedPage` attaches before navigation and nowhere else,
    // so the gate reads them once at the end rather than reporting coverage over a page that was
    // failing while it was measured.
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.notFound, []);
    assert.deepEqual(diagnostics.requestFailures, []);
  });
});

// ----------------------------------------------------------------------------------------------
// The human half of the shared-state claim
// ----------------------------------------------------------------------------------------------

describe("UX-I3: a human edit is the state the agent surface reports", () => {
  it("a person's control, then the agent's read", async () => {
    // FR-AGENT-1 claims agent and human "share the same application services and authoritative
    // client-side state". The agent-to-human direction is pinned in `workbench.test.mjs`, where
    // `window.mage.transact` is asserted to move the `#live` announcer. The reverse was not pinned
    // anywhere, and a shared-state claim is two-directional: a UI that wrote through a second path
    // would pass every agent-to-human assertion in the suite.
    //
    // Driven through a REAL control — the workspace's `+ Add` disclosure, its menu item, and the
    // dialog's Apply — rather than through a service call, which would be the agent path wearing a
    // human name. Three elements, which is also the route the registry declares for this site.
    await loadFlagship();
    const before = await page.evaluate(() => window.mage.context());
    const clicked = await page.evaluate(() => {
      const menu = document.getElementById("add-menu-entity");
      menu.closest("details").open = true;
      menu.click();
      const dialogOpened = document.getElementById("edit-dialog").open;
      const fill = (id, value) => {
        const el = document.getElementById(id);
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      fill("edit-dialog-add-entity-id", "person-added-this");
      fill("edit-dialog-add-entity-label", "Typed into the dialog");
      document.getElementById("edit-dialog-confirm").click();
      return { dialogOpened, dialogClosed: !document.getElementById("edit-dialog").open };
    });
    assert.ok(clicked.dialogOpened, "the + Add menu item opened no dialog, so nothing was driven");
    assert.ok(clicked.dialogClosed, "the dialog is still open, so Apply did not commit");

    const after = await page.evaluate(() => ({
      context: window.mage.context(),
      entity: window.mage.inspect().entities.find((e) => e.id === "person-added-this") ?? null,
    }));
    assert.equal(after.context.counts.entities, before.counts.entities + 1,
      "the agent's `context()` does not count the entity a person just added");
    assert.notEqual(after.context.hash, before.hash,
      "a committed human edit left the revision where it was, so the agent's premise is stale and says it is current");
    assert.equal(after.entity?.label, "Typed into the dialog",
      "the agent's `inspect()` does not carry what the person typed");
    assert.ok(after.context.canUndo,
      "the agent cannot undo a human edit, so the two surfaces do not share one history");
    drives.push({ operation: "human-to-agent", entities: after.context.counts.entities });
  });
});

// ----------------------------------------------------------------------------------------------
// The negative control
// ----------------------------------------------------------------------------------------------

describe("the coverage audit fires on each defect it exists to catch", () => {
  it("reports an advertised operation nothing drove, and clears when a drive arrives", () => {
    // A control nobody has watched fail is a control nobody knows works — and the specific thing
    // that must not happen here is a gate whose numbers look right because its audit reports
    // nothing whatever it is handed.
    const advertised = ["query", "transact", "explore-space"];
    const undriven = auditCoverage({
      subject: "an operation", advertised, driven: ["query", "transact"], exemptions: {},
    });
    assert.equal(undriven.length, 1, `one finding expected, got ${undriven.length}: ${undriven.join("; ")}`);
    assert.match(undriven[0] ?? "", /explore-space/, "the finding must name the operation");
    assert.match(undriven[0] ?? "", /nothing drove it/);
    assert.deepEqual(
      auditCoverage({ subject: "an operation", advertised, driven: advertised, exemptions: {} }), [],
      "a fully driven surface must pass, or every assertion above is about a broken baseline");
  });

  it("accepts a reasoned exemption, and refuses a thin one", () => {
    const advertised = ["query", "explore-space"];
    const reason = "The Worker is resolved from a sibling package this tier does not install, so the "
      + "walk cannot run here; CI covers it.";
    assert.ok(reason.length >= MIN_REASON);
    assert.deepEqual(auditCoverage({
      subject: "an operation", advertised, driven: ["query"],
      exemptions: { "explore-space": reason }, ceiling: 1,
    }), [], "a declared exemption whose reason clears the floor must pass");
    const thin = auditCoverage({
      subject: "an operation", advertised, driven: ["query"],
      exemptions: { "explore-space": "hard to drive" }, ceiling: 1,
    });
    assert.match(thin[0] ?? "", /at least \d+ are required/,
      "a reason under the floor must be reported — an unexplained exemption is how a gate rots into decoration");
  });

  it("refuses to let the exemption map grow past its ceiling", () => {
    // The failure this gate is most likely to suffer is not a missing drive. It is an author with a
    // red gate and a five-line exemption that makes it green.
    const advertised = ["query", "explore-space"];
    const reason = "A stated mechanism, a dependency and a ruling, comfortably over the floor.";
    const grown = auditCoverage({
      subject: "an operation", advertised, driven: [],
      exemptions: { query: reason, "explore-space": reason }, ceiling: 1,
    });
    assert.ok(grown.some((m) => /the ceiling is 1/.test(m)),
      `growing the map past the ceiling must be reported: ${grown.join("; ")}`);
  });

  it("reports an exemption over something that was driven, and one for something that is gone", () => {
    const reason = "A stated mechanism, a dependency and a ruling, comfortably over the floor.";
    const stale = auditCoverage({
      subject: "an operation", advertised: ["query"], driven: ["query"],
      exemptions: { query: reason }, ceiling: 1,
    });
    assert.match(stale[0] ?? "", /and this run drove it/,
      "an exemption over a driven operation must be reported");
    const ghost = auditCoverage({
      subject: "an operation", advertised: ["query"], driven: ["query"],
      exemptions: { "window.mage.retired": reason }, ceiling: 1,
    });
    assert.ok(ghost.some((m) => /does not advertise/.test(m)),
      `an exemption naming nothing advertised must be reported: ${ghost.join("; ")}`);
    const retiredDrive = auditCoverage({
      subject: "a callable", advertised: ["query"], driven: ["query", "sparql"], exemptions: {},
    });
    assert.ok(retiredDrive.some((m) => /does not advertise/.test(m)),
      "a drive of something the interface no longer presents must be reported");
  });

  it("an empty denominator is a finding, never full coverage", () => {
    // The glob hazard, one layer in: a `describe()` that returned nothing would make every
    // comparison above trivially true, and the gate would print a green tier having measured
    // nothing. `node --test` over a glob that matches no file does exactly this one level up.
    const empty = auditCoverage({ subject: "an operation", advertised: [], driven: [], exemptions: {} });
    assert.equal(empty.length, 1);
    assert.match(empty[0] ?? "", /no denominator/);
  });
});
