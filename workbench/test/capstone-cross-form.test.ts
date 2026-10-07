// The capstone's cross-form claims, pinned — the ones its fixture cannot carry.
//
// `test/fixtures/examples/autonomous-delivery` exists to show that structure, behavior and quantity supply each
// other PREMISES rather than sitting beside each other. Its central claim is a number that changes
// sign: the autonomy payload's peak RAM is 1,984 MB with no behavior model and 1,088 MB with one, so
// the same ceiling query reads `refuted` in the first case and `holds` in the second.
//
// Three of the claims behind that sentence have no home in `expected-results.yaml`:
//
//   the COUNTERFACTUAL   no transaction operation rewrites a quantity's `when:` into
//                        `residency:`, so no `modifications:` entry can express "model it without
//                        the machine". The fixture states 1,984 MB in prose and arithmetic.
//   the DISCLOSURE       `QueryExpectation` carries outcome, coverage, refusal and evidence and has
//                        no field for a `vacuous` compilation — so the fixture can pin that
//                        `planning-and-driving-at-once` is refuted and NOT that the refutation is
//                        vacuous, which is the half that licenses taking a maximum over a sum.
//   the DISCRIMINATOR    that the structurally identical `motion-inhibited-whenever-faulted` is
//                        earned rather than vacuous. Same shape, opposite reading.
//
// So they are pinned here. The precedent and the reason: `test/multi-machine-vacuity.test.ts` landed
// for exactly this motive — "it was unverified prose; it is now a test."
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { Workspace } from "../src/app/services.ts";
import { compileSystem, defaultOptions, exploreSpace } from "../src/engine/explore.ts";
import type { CompiledSystem } from "../src/engine/explore.ts";
import { compilePredicate, satisfiability } from "../src/engine/predicate.ts";
import { parseQuery } from "../src/engine/types.ts";
import type { Predicate } from "../src/engine/types.ts";
import { realPorts } from "../scripts/gen-example-coverage.ts";
import type { CanonicalSystem, QueryResult } from "../src/ir/types.ts";

/** One `<ref> eq <value>` atom, spelled the way the compiled predicate layer takes it. */
const atom = (ref: string, value: string): Predicate =>
  ({ kind: "atoms", atoms: [{ ref, op: "eq", value }] });

const compiledOf = (system: CanonicalSystem): CompiledSystem => {
  const c = compileSystem(system);
  assert.ok(c.ok, c.ok ? "" : c.refusal);
  return c.value;
};

/** A point magnitude in base units. Fails loudly rather than defaulting a missing one to zero. */
function baseMagnitude(system: CanonicalSystem, id: string): number {
  const q = system.quantities.get(id);
  assert.ok(q !== undefined, `the example does not declare quantity '${id}'`);
  assert.equal(q.value.kind, "point", `'${id}' is not a point magnitude`);
  assert.ok(q.value.kind === "point");
  const base = q.value.magnitude.base;
  assert.ok(base !== null, `'${id}' did not reach base units`);
  return base;
}

const EXAMPLE = "test/fixtures/examples/autonomous-delivery/system.mage.yaml";
const source = (): string => readFileSync(EXAMPLE, "utf8");

/** The three `when:` clauses, as authored. Declared once so a rewrite cannot silently miss one. */
const WHEN_CLAUSES: readonly string[] = [
  "    when:\n      state: mission.planning\n",
  "    when:\n      state: mission.driving\n",
  "    when:\n      state: mission.recovering\n",
];

/**
 * The example with every `when:`-charged allocation made resident.
 *
 * This is not an arbitrary edit — it is the ONLY thing an author could write if no machine existed,
 * and the "FORCED by V37" test below establishes that rather than leaving it asserted. A rewrite that
 * missed a clause would quietly produce a third number, so each replacement is checked both ways.
 */
function allResident(): string {
  let text = source();
  for (const clause of WHEN_CLAUSES) {
    assert.ok(text.includes(clause),
      `the authored '${clause.trim()}' is gone, so this counterfactual is rewriting something else`);
    text = text.replace(clause, "    residency: resident\n");
  }
  for (const clause of WHEN_CLAUSES) {
    assert.ok(!text.includes(clause), "a when: clause survived the rewrite");
  }
  return text;
}

/** Load through the facade a user loads through, refusing anything that does not validate clean. */
function load(text: string): Workspace {
  const ws = new Workspace(realPorts);
  const loaded = ws.load(text);
  assert.ok(loaded.ok, `did not load: ${loaded.findings.map((f) => f.message).join("; ")}`);
  assert.deepEqual(loaded.findings, [], "a counterfactual that loads with findings proves nothing");
  return ws;
}

function ask(ws: Workspace, id: string): QueryResult {
  const saved = ws.state.system.queries.get(id);
  assert.ok(saved !== undefined, `the example does not declare query '${id}'`);
  return ws.query(saved.raw);
}

/** The computed figure, in the metric's base unit. Null when the result carries no magnitude. */
const figure = (res: QueryResult): number | null => res.magnitude?.value ?? null;

// ----------------------------------------------------------------------------------------------
// 1. The claim the example exists to make: a verdict that changes because a form is modeled
// ----------------------------------------------------------------------------------------------

test("the peak RAM verdict changes sign when the behavior model is removed", () => {
  // The shipped reading. 448 MB resident, plus the largest single `when:` charge, because a machine
  // occupies one control state at a time.
  const shipped = ask(load(source()), "compute-payload-fits-onboard-ram");
  assert.equal(shipped.outcome, "holds", "the shipped payload must fit");
  assert.equal(shipped.coverage.kind, "exhaustive");
  assert.equal(figure(shipped), 1088, "the shipped peak is 192 + 256 + 640");

  // The same query, same ceiling, same five allocations — and the machine's premise withdrawn.
  const counterfactual = ask(load(allResident()), "compute-payload-fits-onboard-ram");
  assert.equal(figure(counterfactual), 1984, "all-resident, the peak is the sum of all five");
  assert.equal(counterfactual.outcome, "refuted",
    "with no state to scope a charge to, the same payload must breach the same ceiling");
  assert.equal(counterfactual.coverage.kind, "exhaustive",
    "and it must breach it conclusively — an inconclusive counterfactual would prove nothing");

  // The sentence the capstone is for, as arithmetic rather than as prose.
  assert.equal((figure(counterfactual) ?? 0) - (figure(shipped) ?? 0), 896,
    "the premise the behavior model supplies is worth exactly this much worst case");
});

test("the counterfactual is FORCED by V37, not chosen — so the comparison is fair", () => {
  // The claim under test: "with no machine, every allocation MUST be resident." If an author could
  // instead declare neither, the counterfactual would be a strawman — so this pins that declaring
  // neither is a finding, which is what leaves `residency: resident` as the only writable option.
  let text = source();
  for (const clause of WHEN_CLAUSES) text = text.replace(clause, "");
  const ws = new Workspace(realPorts);
  const loaded = ws.load(text);
  const findings = loaded.ok ? ws.state.findings : loaded.findings;
  assert.ok(findings.length > 0,
    "a memory quantity declaring neither residency: nor when: must be a finding (V37); if it is " +
    "not, the all-resident counterfactual is not the only alternative and the 896 MB claim is weaker");
  assert.ok(findings.some((f) => /residency|when/i.test(f.message)),
    `the finding must name the declaration pair, and said: ${findings.map((f) => f.message).join("; ")}`);
});

// ----------------------------------------------------------------------------------------------
// 2. The license for taking a maximum, and the discriminator that keeps it honest
// ----------------------------------------------------------------------------------------------

test("the premise licensing a maximum is disclosed as vacuous, which the fixture cannot pin", () => {
  const res = ask(load(source()), "planning-and-driving-at-once");
  assert.equal(res.outcome, "refuted");
  const disclosure = res.compilation.find((c) => c.kind === "vacuous");
  assert.ok(disclosure !== undefined,
    "the refutation is decided by the predicate, so V41 requires the disclosure; without it this " +
    "answer is byte-identical to a target the design merely prevents");
  assert.match(disclosure.explanation, /cannot REPRESENT|no transition structure/,
    `the disclosure must say the model cannot represent it: ${disclosure.explanation}`);
});

test("the safety invariant has the same predicate SHAPE and the opposite reading — earned", () => {
  // The pair a check keyed on predicate shape would destroy. Both are a conjunction of two
  // control-state atoms; one is a contradiction and one is the property the example exists to ask.
  const system = canonicalize(parse(source()));
  const res = ask(load(source()), "motion-inhibited-whenever-faulted");
  assert.equal(res.outcome, "holds");
  assert.equal(res.coverage.kind, "exhaustive");
  assert.equal(res.compilation.find((c) => c.kind === "vacuous"), undefined,
    "this one must NOT disclose vacuity — its violation is representable, and reporting it as " +
    "vacuous would discard the example's climax");

  // Satisfiable in the vector, by the engine's own mechanism rather than by a hand count.
  const violation: Predicate = {
    kind: "all-of",
    operands: [atom("mission.state", "fault"), atom("motion-interlock.state", "enabled")],
  };
  const cs = compiledOf(system);
  const parsed = compilePredicate(cs.scope, violation);
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.refusal);
  assert.equal(satisfiability(cs.scope, violation, parsed.value, cs.initial), "satisfiable",
    "the violating situation must be representable, or the invariant holds for the wrong reason");

  // And unreachable. Counted over the walked space, which is the other half of "earned".
  const space = exploreSpace(cs, defaultOptions());
  assert.equal(space.stopReason, "complete", "the census needs a complete walk");
  assert.equal(space.configs.length, 20,
    "20 reachable configurations; a changed count means re-census, including the fixture's note");
  assert.equal(space.configs.filter((c) => parsed.value(c)).length, 0,
    "no reachable configuration may violate it");

  // The vector's own size, cross-checked against the projection above: 7 mission states x 2
  // interlock states x 4 values of recovery_count = 56, of which the violation fixes both control
  // coordinates and leaves one per counter value. These are the two numbers the fixture's note
  // ships, so they are DERIVED from the declarations here rather than copied into prose.
  const mission = system.machines.get("mission");
  const interlock = system.machines.get("motion-interlock");
  assert.ok(mission !== undefined && interlock !== undefined);
  const counter = mission.variables.get("recovery_count");
  assert.ok(counter !== undefined, "the bounded counter is what makes the space finite (V17)");
  const vector = mission.states.length * interlock.states.length * counter.domain.length;
  assert.equal(vector, 56, "the state vector admits 56 configurations");
  assert.equal(counter.domain.length, 4,
    "and the violation fixes both control coordinates, leaving 4 — one per counter value");
  assert.ok(space.configs.length < vector,
    "satisfiable-but-unreachable requires the reachable set to be a strict subset");
});

// ----------------------------------------------------------------------------------------------
// 3. The other direction of the integration: behavior SELECTS, quantity CHARGES
// ----------------------------------------------------------------------------------------------

test("the duration ceiling is decided by the executions a behavioral predicate selects", () => {
  const ws = load(source());

  // Unselected: the retry-free delivery, identified by the counter rather than by trace length.
  const nominal = ask(ws, "nominal-mission-duration");
  assert.equal(figure(nominal), 645_000, "45 s of planning plus one 600 s drive segment");
  assert.equal(nominal.outcome, "holds", "a measurement is established by the witness attaining it");

  // Selected and bounded: every delivery, against the declared battery.
  const budget = ask(ws, "delivering-missions-within-the-duration-budget");
  assert.equal(budget.outcome, "refuted");
  assert.equal(figure(budget), 2_715_000,
    "45 s planning + four 600 s drive segments + three 90 s scan-matches");
  assert.ok(budget.evidence !== null, "a refuted ceiling must carry the execution that breaches it");
  assert.equal(budget.evidence.role, "counterexample");

  // The recovery policy is the whole difference, and it is charged per OCCURRENCE: four drive
  // segments for three recoveries, because resuming re-enters `driving` and the trace charges it
  // again. Both figures are recomposed from the MODEL's own magnitudes, so a retuned charge fails
  // here rather than leaving two stale numbers in a note.
  const system = ws.state.system;
  const plan = baseMagnitude(system, "route-planning-duration");
  const drive = baseMagnitude(system, "drive-segment-duration");
  const relocalize = baseMagnitude(system, "relocalization-duration");
  assert.equal(plan + drive, figure(nominal), "the nominal figure is the model's own two charges");
  assert.equal(plan + drive + 3 * (relocalize + drive), figure(budget),
    "and the worst delivery is that plus three (scan-match + drive) rounds");
});

test("both shipped obligations that FAIL are refuted by evidence, not by an absent search", () => {
  // The capstone ships two violated requirements on purpose, and a violated requirement is only
  // worth shipping if something concrete refutes it. Both are existential `holds` or a ceiling
  // `refuted`, so both carry a witness or a counterexample.
  const ws = load(source());

  const strand = ask(ws, "mission-can-strand-without-an-outcome");
  assert.equal(strand.outcome, "holds", "a mission can stop with neither outcome");
  assert.ok(strand.evidence !== null, "and the refutation of termination is a concrete trace");
  assert.equal(strand.evidence.role, "witness");
  assert.equal(strand.evidence.shape, "trace");

  // The dead end is genuine on BOTH machines: the configuration offers no step at all. Pinned
  // through the walk's own `deadEnds` rather than through the trace, because that is where "no
  // enabled step" is decided — a trace ending at `fault` would look identical if some step remained.
  const system = canonicalize(parse(source()));
  const cs = compiledOf(system);
  const space = exploreSpace(cs, defaultOptions());
  assert.equal(space.stopReason, "complete");
  const faulted = compilePredicate(cs.scope, atom("mission.state", "fault"));
  assert.ok(faulted.ok, faulted.ok ? "" : faulted.refusal);
  const faultedDeadEnds = space.deadEnds.filter((i) => faulted.value(space.configs[i]!));
  assert.ok(faultedDeadEnds.length > 0,
    "fault must be a reachable DEAD END, or the witness above is about something else");
  // And it is neither promised outcome, which is what makes the obligation breached rather than met.
  for (const name of ["delivered", "aborted"]) {
    const p = compilePredicate(cs.scope, atom("mission.state", name));
    assert.ok(p.ok, p.ok ? "" : p.refusal);
    assert.equal(faultedDeadEnds.filter((i) => p.value(space.configs[i]!)).length, 0,
      `a faulted dead end must not also be '${name}'`);
  }

  // And the companion progress question still answers refuted, so the strand is NOT a livelock in
  // disguise. The pair is the honest answer the example ships.
  assert.equal(ask(ws, "recovery-can-repeat-forever").outcome, "refuted",
    "recovery is bounded by a declared guard; stranding in fault is a different failure");
  assert.equal(ask(ws, "recovery-can-recur").outcome, "holds",
    "and re-entry is possible, which is what makes the bounded-progress answer non-trivial");
});

test("no shipped requirement names a quantity query that cannot decide it", () => {
  // The sound-shape discipline, checked at the example rather than at the corpus: both
  // quantity-decided requirements here must declare a ceiling query and `satisfied_when: holds`.
  // A measurement-decided requirement would read satisfied at every magnitude forever.
  const system = canonicalize(parse(source()));
  let quantityDecided = 0;
  for (const req of system.requirements.values()) {
    const raw = req.raw as Record<string, unknown>;
    const decider = system.queries.get(String(raw["expressed_as"]));
    assert.ok(decider !== undefined, `'${req.id}' names a query the system does not declare`);
    const parsed = parseQuery(decider.raw);
    assert.ok(parsed.ok, parsed.ok ? "" : parsed.refusal);
    if (parsed.value.kind !== "quantity") continue;
    quantityDecided += 1;
    assert.notEqual(parsed.value.quantity.within, null,
      `'${req.id}' is decided by a MEASUREMENT, which has no refuting arm and discharges nothing`);
    assert.equal(raw["satisfied_when"], "holds",
      `'${req.id}' decides a ceiling, so a breach must VIOLATE it rather than discharge it`);
  }
  assert.equal(quantityDecided, 2, "two quantity-decided requirements ship in this example");
});
