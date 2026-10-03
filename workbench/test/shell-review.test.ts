// REVIEW CHANGE: what the surface shows, and the line G3 draws about when it shows it.
//
// Everything asserted here is a PURE function of two revisions — two systems for the change list,
// two property evaluations for the impact — which is what lets correction 8's substance be checked
// in `node:test` with no browser. The DOM halves that cannot be (the modal's focus trap, the
// refusal of Escape, focus return) belong to the a11y tier.
//
// **The oracle is the engine's own evaluation, never a transcript of what the surface says.** The
// before-and-after property readings come from a real `Workspace` running real saved queries over a
// real transaction, so a test here fails when the DECISION would change, not when a sentence is
// reworded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import { STATUS_TEXT } from "../src/app/properties.ts";
import type { EvaluatedProperty, PropertyStatus } from "../src/app/properties.ts";
import { Workspace } from "../src/app/services.ts";
import { runQuery } from "../src/engine/index.ts";
import { CAPABILITIES } from "../src/app/capabilities.ts";
import { SURFACES } from "../src/ui/shell/surfaces.ts";
import {
  STATUS_WORD, changeGroups, changeHeadline, propertyImpact, requirementsReading,
} from "../src/ui/shell/review.ts";

const load = (path: string): CanonicalSystem => canonicalize(parse(readFileSync(path, "utf8")));
const messageBus = (): CanonicalSystem => load("examples/message-bus/system.mage.yaml");
const html = (): string => readFileSync("index.html", "utf8");

/**
 * A workspace over the real engine, with no Worker and no renderer that matters here.
 *
 * The same ports the page wires for the synchronous paths, so `properties()` re-runs the saved
 * queries exactly as it does in the browser. A fake engine would make every assertion below about
 * the fake.
 */
const workspace = (text: string): Workspace => {
  const ws = new Workspace({
    engine: {
      graphQuery: (system, query) => runQuery(system, query).result,
      behaviorQuery: (system, query) => runQuery(system, query).result,
      explore: () => ({ configurations: [], exhaustive: false }),
    },
    render: { render: () => { throw new Error("no view is rendered in this test"); } },
  });
  const loaded = ws.load(text);
  assert.ok(loaded.ok, `the fixture did not load: ${loaded.findings.map((f) => f.message).join("; ")}`);
  return ws;
};

/**
 * Two entities, one relation, one SAVED QUESTION WITH AN EXPECTATION — a requirement.
 *
 * Hand-written rather than taken from `examples/`, and the reason is itself a finding this file
 * pins below: no shipped example declares an `expect:`, so none of them has a requirement, so on
 * shipped content G3's interposition never fires. The fixture is the smallest system where it can.
 */
const WITH_REQUIREMENT = [
  "mage: 1",
  "system:",
  "  id: obligations",
  "  name: One obligation",
  "relation-types:",
  "  publishes:",
  "    description: The design permits the service to emit this event type.",
  "    absence: No permission to publish is represented.",
  "    composition:",
  "      path: forbidden",
  "entities:",
  "  checkout:",
  "    type: service",
  "    label: Checkout",
  "  orders:",
  "    type: event-type",
  "    label: Orders",
  "  analytics:",
  "    type: service",
  "    label: Analytics",
  "models:",
  "  flow:",
  "    type: graph",
  "    label: Event Flow",
  "    purpose:",
  "      question: Which services may publish which event types?",
  "      represents: [service identity, permitted publication]",
  "      omits: [observed runtime delivery]",
  "    entities: [checkout, orders, analytics]",
  "    relations:",
  "      - id: checkout-publishes-orders",
  "        from: checkout",
  "        to: orders",
  "        type: publishes",
  "queries:",
  "  analytics-publishes-nothing:",
  "    name: Analytics publishes nothing",
  "    kind: graph",
  "    quantifier: exists",
  "    expect: refuted",
  "    graph:",
  "      form: successors",
  "      relation: publishes",
  "      from: analytics",
  "",
].join("\n");

/** The one operation that breaks it: give Analytics something to publish. */
const BREAKS_IT = (base: string): unknown => ({
  transaction: {
    base, target: "main",
    operations: [{ op: "add-relation", model: "flow", from: "analytics", to: "orders", type: "publishes" }],
  },
});

/** An edit that touches the model and moves no claim at all. */
const HARMLESS = (base: string): unknown => ({
  transaction: {
    base, target: "main",
    operations: [{ op: "set-label", id: "orders", value: "Order Service" }],
  },
});

const requirements = (ps: readonly EvaluatedProperty[]): readonly EvaluatedProperty[] =>
  ps.filter((p) => p.kind === "requirement");

// --------------------------------------------------------------------------------------------
// The words
// --------------------------------------------------------------------------------------------

test("every status word opens the sentence the properties layer writes for it", () => {
  // The join between two spellings of one fact. `STATUS_WORD` exists because splitting
  // `STATUS_TEXT` at its dash to recover a word is the defect an invariant that read prose already
  // was; this is the check that keeps the two from drifting without making one parse the other.
  for (const key of Object.keys(STATUS_WORD) as readonly PropertyStatus[]) {
    assert.ok(STATUS_TEXT[key].startsWith(STATUS_WORD[key]),
      `STATUS_TEXT['${key}'] is "${STATUS_TEXT[key]}", which does not begin with "${STATUS_WORD[key]}"`);
  }
  // Both directions: a status the properties layer gains and this surface does not know would
  // render as `undefined` in a line a reviewer reads before committing.
  assert.deepEqual(Object.keys(STATUS_WORD).sort(), Object.keys(STATUS_TEXT).sort());
});

// --------------------------------------------------------------------------------------------
// What the surface shows: the changes, grouped
// --------------------------------------------------------------------------------------------

test("an unchanged revision produces no groups, and says so rather than showing an empty list", () => {
  const system = messageBus();
  const groups = changeGroups(system, system);
  assert.deepEqual(groups, []);
  assert.match(changeHeadline(groups), /No change/);
});

test("a relation lands under the model that asserts it, named with the entities' labels", () => {
  const ws = workspace(WITH_REQUIREMENT);
  const before = ws.state.system;
  assert.ok(ws.transact(BREAKS_IT(ws.state.hash)).ok);
  const groups = changeGroups(before, ws.state.system);

  // Grouped by the model, which is the grouping correction 8 sketches ("Event Flow / + Analytics
  // subscribes to OrderCreated"). A relation is asserted BY a model, so the model is the group.
  assert.deepEqual(groups.map((g) => g.title), ["Event Flow"]);
  assert.deepEqual(groups[0]?.lines, [{ mark: "+", text: "Analytics publishes Orders" }]);
  assert.equal(changeHeadline(groups), "1 change across 1 group");
});

test("an entity rename lands under the system, with both labels, because no model scopes it", () => {
  const ws = workspace(WITH_REQUIREMENT);
  const before = ws.state.system;
  const applied = ws.transact(HARMLESS(ws.state.hash));
  assert.ok(applied.ok, applied.findings.map((f) => f.message).join("; "));
  const groups = changeGroups(before, ws.state.system);
  assert.deepEqual(groups.map((g) => g.title), ["The model system"]);
  const line = groups[0]?.lines[0];
  assert.equal(line?.mark, "~");
  assert.match(line?.text ?? "", /orders renamed from "Orders" to "Order Service"/);
});

test("the diff is symmetric: reversing the revisions turns every addition into a removal", () => {
  const ws = workspace(WITH_REQUIREMENT);
  const before = ws.state.system;
  assert.ok(ws.transact(BREAKS_IT(ws.state.hash)).ok);
  const after = ws.state.system;
  // Not a cosmetic property. The surface diffs the remembered authoritative revision against the
  // branch, and a diff that only noticed additions would show a deletion as no change at all —
  // which is the one change a reviewer most needs to see before committing.
  assert.deepEqual(changeGroups(after, before)[0]?.lines, [
    { mark: "-", text: "Analytics publishes Orders" },
  ]);
});

// --------------------------------------------------------------------------------------------
// What the surface shows: the property impact
// --------------------------------------------------------------------------------------------

test("an unmoved conclusive claim is COUNTED; an unmoved unanswerable one is LISTED", () => {
  // The author's own sketch distinguishes these two: "✓ 5 unchanged" beside "? Runtime-delivery
  // property / unchanged: NOT ANSWERABLE". Folding the second into the count would read as five
  // answers where there are four and a declined question.
  const base: readonly EvaluatedProperty[] = [
    property("answered", "established"),
    property("declined", "not-answerable"),
  ];
  const impact = propertyImpact(base, base);
  assert.equal(impact.unchangedCount, 1);
  assert.deepEqual(impact.notable.map((c) => c.id), ["declined"]);
  assert.equal(impact.notable[0]?.reading, "unchanged: NOT ANSWERABLE");
  assert.equal(impact.notable[0]?.moved, false);
});

test("a moved claim reads as the two words and an arrow, in the direction it moved", () => {
  const impact = propertyImpact([property("p", "established")], [property("p", "refuted")]);
  assert.deepEqual(impact.notable.map((c) => c.reading), ["ESTABLISHED → REFUTED"]);
  assert.equal(impact.notable[0]?.moved, true);
  assert.equal(impact.unchangedCount, 0);
});

test("a claim that appears or disappears is reported as that, not as a status change", () => {
  const appeared = propertyImpact([], [property("p", "established")]);
  assert.equal(appeared.notable[0]?.reading, "newly tracked: ESTABLISHED");
  assert.equal(appeared.notable[0]?.before, null);
  const gone = propertyImpact([property("p", "established")], []);
  assert.equal(gone.notable[0]?.reading, "no longer tracked; was ESTABLISHED");
  assert.equal(gone.notable[0]?.after, null);
});

test("declaring an expectation on an existing claim MOVES it, because it becomes an obligation", () => {
  // The lifecycle's last step — "Make requirement" — is a kind change with no status change, and it
  // is the one edit that turns a thing you watch into a thing you asked to be told about. A diff
  // that compared only statuses would wave it through.
  const before = property("p", "established");
  const after: EvaluatedProperty = {
    ...before, kind: "requirement", expectation: { declared: "holds", met: true, problem: null },
  };
  const impact = propertyImpact([before], [after]);
  assert.equal(impact.notable[0]?.moved, true);
  assert.equal(impact.movedRequirements.length, 1);
});

// --------------------------------------------------------------------------------------------
// G3's line: property versus requirement
// --------------------------------------------------------------------------------------------

test("G3: a moved PROPERTY is not a moved requirement, so nothing is interposed for it", () => {
  const impact = propertyImpact([property("p", "established")], [property("p", "refuted")]);
  assert.equal(impact.notable.length, 1, "the surface would still show it, if it were open");
  assert.deepEqual(impact.movedRequirements, [],
    "a plain property moving must not interpose: G3 rules commit-and-announce for it");
  assert.match(requirementsReading(impact), /declares no requirements/);
});

test("G3: a moved REQUIREMENT is what interposes, and the reading says it is no longer satisfied", () => {
  const before = requirement("obligation", "refuted", "refuted", true);
  const after = requirement("obligation", "established", "refuted", false);
  const impact = propertyImpact([before], [after]);
  assert.equal(impact.movedRequirements.length, 1);
  assert.equal(impact.movedRequirements[0]?.breaks, true);
  assert.match(requirementsReading(impact), /1 requirement\(s\) move, 1 of them no longer satisfied/);
});

test("G3 over the real engine: the edit that breaks an obligation is the edit that interposes", () => {
  // The whole decision, end to end, with the engine answering. `properties()` re-runs the saved
  // query on whichever branch is current, which is the machinery the pre-evaluation uses: a
  // consequential edit transparently becomes a short-lived hypothesis and the branch is read.
  const ws = workspace(WITH_REQUIREMENT);
  const base = ws.properties();
  assert.equal(requirements(base).length, 1, "the fixture must declare exactly one obligation");
  assert.equal(base[0]?.expectation?.met, true, "the obligation holds before the edit");

  const opened = ws.openHypothesis("pending review", BREAKS_IT(ws.state.hash));
  assert.ok(opened.ok, opened.findings.map((f) => f.message).join("; "));
  const impact = propertyImpact(base, ws.properties());
  assert.equal(impact.movedRequirements.length, 1,
    "giving Analytics something to publish must move the obligation that says it publishes nothing");
  assert.equal(impact.movedRequirements[0]?.breaks, true);

  // And the authoritative model was never touched, which is what makes the probe safe to run on
  // every consequential edit rather than something to ask permission for.
  assert.ok(ws.discardHypothesis());
  assert.equal(ws.properties()[0]?.expectation?.met, true);
});

test("G3 over the real engine: a harmless edit moves no obligation, so it commits unreviewed", () => {
  const ws = workspace(WITH_REQUIREMENT);
  const base = ws.properties();
  const opened = ws.openHypothesis("pending review", HARMLESS(ws.state.hash));
  assert.ok(opened.ok, opened.findings.map((f) => f.message).join("; "));
  const impact = propertyImpact(base, ws.properties());
  assert.deepEqual(impact.movedRequirements, [],
    "renaming a label must not make the user stare at a review surface");
  // The author's limit, as the surface's own sentence.
  assert.match(requirementsReading(impact), /read exactly as they did/);
});

test("no shipped example declares a requirement, so the interposition is latent on all of them", () => {
  // Not a defect and not an aspiration — a measured fact about the shipped content, recorded because
  // it decides what a reader meets. With no obligation declared there is nothing to interpose for,
  // so every human edit to a shipped example commits and announces, and the review surface's live
  // callers there are an agent's hypothesis and a what-if the user armed on purpose. The moment an
  // example gains an `expect:`, this test fails and the interposition starts firing for it.
  const declared = SHIPPED_EXAMPLE_IDS.flatMap((id) => {
    const ws = workspace(readFileSync(`examples/${id}/system.mage.yaml`, "utf8"));
    return requirements(ws.properties()).map((p) => `${id}:${p.id}`);
  });
  assert.deepEqual(declared, []);
});

// --------------------------------------------------------------------------------------------
// The page contract for this surface
// --------------------------------------------------------------------------------------------

test("the radios correction 8 deletes are gone from the markup, and so is the mode fieldset", () => {
  const markup = html();
  for (const id of ["edit-mode", "target-main", "target-hypothesis", "hypothesis-label", "edit-rationale"]) {
    assert.doesNotMatch(markup, new RegExp(`id="${id}"`),
      `#${id} is still in index.html — correction 8 deletes the per-edit branch choice`);
  }
});

test("the review surface is a dialog at the id the design pinned, carrying both ways out", () => {
  const markup = html();
  const review = SURFACES.find((s) => s.surface === "review");
  assert.equal(review?.status, "built");
  assert.equal(review?.status === "built" ? review.element : null, "hypothesis-bar",
    "DESIGN-shell-261002.md §5 pins the review surface's ids; a rename breaks drives this wave does not own");
  assert.match(markup, /<dialog id="hypothesis-bar"/,
    "the review surface must be a native dialog — the platform's focus trap, not a second hand-rolled modal");
  for (const id of ["hypothesis-apply", "hypothesis-discard", "review-headline", "review-changes",
    "review-impact", "review-requirements", "review-evidence"]) {
    assert.match(markup, new RegExp(`id="${id}"`), `the review surface is missing #${id}`);
  }
});

test("create-hypothesis's human affordance moved to a control that exists and is a toggle", () => {
  const capability = CAPABILITIES.find((c) => c.id === "create-hypothesis");
  const human = capability?.human[0];
  assert.equal(human?.status, "wired");
  const element = human !== undefined && human.status === "wired" ? human.element.id : null;
  assert.equal(element, "whatif-arm");
  const markup = html();
  assert.match(markup, /id="whatif-arm"[^>]*aria-pressed="false"/,
    "the what-if control must declare its pressed state: a toggle whose state is styling only is a "
    + "state half the users never receive");
  assert.match(markup, /id="whatif-arm"[^>]*disabled/,
    "it must ship disabled, so the pristine tab walk does not grow a stop");
});

// --------------------------------------------------------------------------------------------
// fixtures
// --------------------------------------------------------------------------------------------

/** A minimal evaluated property. Only the fields the impact function reads are meaningful. */
function property(id: string, status: PropertyStatus): EvaluatedProperty {
  return {
    id, proposition: id, kind: "property", status, outcome: null, coverage: null, evidence: null,
    refusal: null, compilation: [], grounds: [], expectation: null,
    evaluatedAt: "r1", currentRevision: "r1", stale: false,
  };
}

/** The same, declared as an obligation: an expectation, and whether this revision meets it. */
function requirement(
  id: string, status: PropertyStatus, declared: string, met: boolean,
): EvaluatedProperty {
  return { ...property(id, status), kind: "requirement", expectation: { declared, met, problem: null } };
}
