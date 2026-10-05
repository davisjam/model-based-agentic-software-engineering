// The agreement cross-check: where LTL and a shipped behavior form answer the same question, they
// must agree.
//
// This is the strongest oracle available to the LTL work, and the reason is not that it is clever.
// The six behavior forms were implemented independently, are tested independently -- including
// mutation controls that flip each verdict -- and are governed by the one-denotation rule, which
// says a query denotes a QUESTION rather than a search strategy. So where a bridge equation makes
// an LTL formula and a shipped form the same question, a disagreement is a defect in one of them by
// fiat. No judgement call, no tolerance, no "well, they measure slightly different things".
//
// What it catches that nothing else can: trace-domain mistakes, stutter-closure leaks, polarity and
// quantifier inversions, and product-construction errors that change WHICH EXECUTIONS EXIST. Those
// are the silent-authoritative class. Phase 1's differential oracle cannot see them, because it
// compares two implementations over WORDS and never reads a model; the fixtures in
// `test/ltl-product.test.ts` can only see the ones somebody thought to write a machine for. This
// file runs the comparison over every bridgeable saved query in every shipped model and example --
// so the subjects are real models with real questions somebody cared about, and the set grows when
// a model does rather than when this file is edited.
//
// ## The bridge equations, and the three forms deliberately left out
//
//   invariant p            ==  G p                       outcomes EQUAL
//   reach p holds          <=> G not-p refuted           and p holds somewhere on the lasso
//   repeatable-cycle t     <=> F G not-t refuted  OR  a reachable dead end satisfies t
//
//   recurrence             no bridge. Re-entry is reachability-class, not omega; asserting one
//                          would re-conflate what the one-denotation rule separates.
//   transition-live        no bridge. Atomic propositions range over configurations, so a
//                          step-labelled proposition is a later question and not a gap here.
//   deadend                its positive row needs an atom true at exactly one configuration, which
//                          a saved query cannot express. Pinned on a fixture instead, in
//                          `test/ltl-product.test.ts`.
//
// A query carrying `avoid` is EXCLUDED and counted: `avoid` restricts the graph the shipped form
// walks, and no bridge equation in the foundation covers it. A query whose limit left either side
// `inconclusive` is excluded and counted too -- comparing a settled verdict against an unsettled one
// tests nothing. Both counts are asserted small, so an exclusion cannot quietly become the rule.
//
// ## The negation self-check, and the asymmetry not to "fix"
//
// Classically, phi holds implies not-phi is refuted, and the two can never both hold. Both REFUTED
// is legitimate at the model level and must not be asserted against: one execution violates phi
// while a different one violates not-phi, and a universal claim about a set of traces can fail in
// both directions. That differs from the word level, where Phase 1's oracle requires exact
// complements because a single word settles both. The sweep below asserts the two implications and
// COUNTS the both-refuted cases, asserting there is at least one -- so the legitimate asymmetry is
// pinned as a measured fact rather than left looking like a contradiction nobody noticed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import type { CanonicalSystem, Configuration, Evidence, Outcome } from "../src/ir/types.ts";
import { compileSystem, defaultOptions, exploreSpace } from "../src/engine/explore.ts";
import { runBehaviorQuery } from "../src/engine/behavior.ts";
import { compilePredicate } from "../src/engine/predicate.ts";
import { runLtlProperty } from "../src/engine/ltl-product.ts";
import {
  alwaysOf, eventuallyOf, notOf, proposition, type ParsedFormula,
} from "../src/engine/ltl.ts";
import { parseQuery, type BehaviorQuery, type Predicate, type Quantifier } from "../src/engine/types.ts";

// ----------------------------------------------------------------------------------------------
// The subjects: every shipped model and example, discovered rather than listed
// ----------------------------------------------------------------------------------------------

interface Subject {
  readonly name: string;
  readonly system: CanonicalSystem;
  readonly hash: string;
}

/**
 * Discovered from the directory and from the app layer's shipped-example list, NOT from a copy.
 *
 * A snapshot of today's filenames would stop covering a model added tomorrow, and a cross-check
 * that silently narrows its own subject set is the vacuous pass this repo keeps rediscovering. The
 * example ids come from `SHIPPED_EXAMPLE_IDS`, which is what the human's file picker reads.
 */
function subjects(): readonly Subject[] {
  const paths: readonly (readonly [string, string])[] = [
    ...readdirSync("models")
      .filter((f) => f.endsWith(".mage.yaml"))
      .map((f) => [`models/${f}`, `models/${f}`] as const),
    ...SHIPPED_EXAMPLE_IDS.map((id) => [id, `examples/${id}/system.mage.yaml`] as const),
    ...readdirSync("examples")
      .filter((f) => f.endsWith(".mage.yaml"))
      .map((f) => [`examples/${f}`, `examples/${f}`] as const),
  ];
  const out: Subject[] = [];
  for (const [name, path] of paths) {
    const system = canonicalize(parse(readFileSync(path, "utf8")));
    if (!compileSystem(system).ok) continue;
    out.push({ name, system, hash: systemHash(system) });
  }
  return out;
}

interface SavedBehavior {
  readonly id: string;
  readonly query: BehaviorQuery;
  readonly quantifier: Quantifier;
}

const behaviorQueries = (subject: Subject): readonly SavedBehavior[] => {
  const out: SavedBehavior[] = [];
  for (const [id, saved] of subject.system.queries) {
    const parsed = parseQuery(saved.raw);
    if (!parsed.ok || parsed.value.kind !== "behavior") continue;
    out.push({ id, query: parsed.value.behavior, quantifier: parsed.value.quantifier });
  }
  return out;
};

// ----------------------------------------------------------------------------------------------
// Running the two sides
// ----------------------------------------------------------------------------------------------

const shipped = (subject: Subject, saved: SavedBehavior): Outcome =>
  runBehaviorQuery(subject.system, saved.query, saved.quantifier, subject.hash).result.outcome;

interface LtlAnswer {
  readonly outcome: Outcome;
  readonly evidence: Evidence | null;
}

const ltl = (subject: Subject, formula: ParsedFormula): LtlAnswer => {
  const v = runLtlProperty(subject.system, formula, "forall", subject.hash);
  return { outcome: v.result.outcome, evidence: v.result.evidence };
};

/** Every configuration the lasso visits, prefix and cycle together. */
const configurationsOn = (evidence: Evidence | null): readonly Configuration[] => {
  if (evidence === null) return [];
  const steps = [...evidence.steps, ...(evidence.cycle ?? [])];
  return [...steps.map((s) => s.from), ...(steps.length > 0 ? [steps[steps.length - 1]?.to] : [])]
    .filter((c): c is Configuration => c !== undefined);
};

/** Whether some reachable dead end satisfies the predicate — the second disjunct of the cycle row. */
function deadEndSatisfying(subject: Subject, predicate: Predicate): boolean {
  const compiled = compileSystem(subject.system);
  if (!compiled.ok) return false;
  const holds = compilePredicate(compiled.value.scope, predicate);
  if (!holds.ok) return false;
  const space = exploreSpace(compiled.value, defaultOptions());
  return space.deadEnds.some((i) => {
    const cfg = space.configs[i];
    return cfg !== undefined && holds.value(cfg);
  });
}

// ----------------------------------------------------------------------------------------------
// The cross-check
// ----------------------------------------------------------------------------------------------

interface Tally {
  compared: number;
  skippedAvoid: number;
  skippedUnsettled: number;
  /**
   * Pairs where BOTH sides refused the question, which is agreement rather than a verdict.
   *
   * `unlicensed` reports that the model does not authorize the question — it is not a third truth
   * value, so no duality between `reach p` and `G not p` has content when `p` itself does not
   * resolve. Expecting the LTL side to answer `holds` there would be expecting it to claim the
   * target never occurs, which is precisely the claim a refusal exists to withhold.
   *
   * Counted separately from `skippedUnsettled` because the two exclusions mean different things: an
   * unsettled pair was SEARCHED and truncated, an unlicensed pair was never a question. And this one
   * is not a bare skip — the guard below disagrees when only ONE side refuses, which is a real
   * defect (one implementation answering a question the other will not accept) and was unreachable
   * while no shipped model carried a refusing `reach`.
   */
  skippedUnlicensed: number;
  noBridge: number;
}

/**
 * The sabotages the negative control drives, each a bridge equation bent in one specific way.
 *
 * Post-hoc, against the comparison rather than against the source: the check must be shown to be
 * SENSITIVE, and bending the equation it asserts is the cheapest honest way to show it. Each one
 * corresponds to a real way the product layer could be wrong -- a formula read with the wrong
 * temporal operator, a polarity inverted, a stutter self-loop leaked into the shared graph -- so a
 * sabotage that fails to go red names a blind spot and not a style preference.
 */
type Sabotage =
  | "none"
  /** `invariant p` compared against `F p`: the wrong temporal operator entirely. */
  | "invariant-as-eventually"
  /** `reach p` compared without the dual: the polarity inversion. */
  | "reach-wrong-polarity"
  /** The cycle row with its halt disjunct dropped: what a stutter-closure leak looks like. */
  | "cycle-ignores-halts";

interface CrossCheck {
  readonly disagreements: readonly string[];
  readonly tally: Tally;
  readonly perForm: ReadonlyMap<string, number>;
}

function crossCheck(sabotage: Sabotage = "none"): CrossCheck {
  const tally: Tally = {
    compared: 0, skippedAvoid: 0, skippedUnsettled: 0, skippedUnlicensed: 0, noBridge: 0,
  };
  const disagreements: string[] = [];
  const perForm = new Map<string, number>();

  /**
   * Whether this pair is a refusal rather than a comparison, recording a disagreement if the two
   * sides disagree about REFUSING. Called by all three form rows before their duality is applied.
   */
  const refusalHandled = (where: string, left: Outcome, right: Outcome): boolean => {
    if (left !== "unlicensed" && right !== "unlicensed") return false;
    if (left !== right) {
      disagreements.push(
        `${where}: one side refused and the other answered — ${left} against ${right}. A question ` +
        `the model does not license must be refused by both implementations, or one of them is ` +
        `answering from vocabulary the other does not have`);
    }
    tally.skippedUnlicensed += 1;
    return true;
  };

  for (const subject of subjects()) {
    for (const saved of behaviorQueries(subject)) {
      const where = `${subject.name} / ${saved.id} (${saved.query.form})`;
      const { form, target, predicate } = saved.query;

      if (form === "recurrence" || form === "transition-live" || form === "deadend") {
        tally.noBridge += 1;
        continue;
      }
      if (saved.query.avoid !== null) {
        tally.skippedAvoid += 1;
        continue;
      }

      const subjectPredicate = form === "invariant" ? predicate : target;
      if (subjectPredicate === null) {
        tally.noBridge += 1;
        continue;
      }

      // The bridge asks LTL about the SAVED predicate object, nested combinators and all -- not
      // about a re-typed approximation of it. A transcription would make a disagreement ambiguous
      // between the two implementations and the retyping, which is the one thing an oracle may not
      // be.
      const atom = proposition(subjectPredicate);

      if (form === "invariant") {
        const left = shipped(subject, saved);
        const right = ltl(subject,
          sabotage === "invariant-as-eventually" ? eventuallyOf(atom) : alwaysOf(atom));
        if (refusalHandled(where, left, right.outcome)) continue;
        if (left === "inconclusive" || right.outcome === "inconclusive") {
          tally.skippedUnsettled += 1;
          continue;
        }
        tally.compared += 1;
        perForm.set(form, (perForm.get(form) ?? 0) + 1);
        if (left !== right.outcome) {
          disagreements.push(`${where}: invariant says ${left}, G says ${right.outcome}`);
        }
        continue;
      }

      if (form === "reach") {
        const left = shipped(subject, saved);
        const right = ltl(subject, alwaysOf(notOf(atom)));
        if (refusalHandled(where, left, right.outcome)) continue;
        if (left === "inconclusive" || right.outcome === "inconclusive") {
          tally.skippedUnsettled += 1;
          continue;
        }
        tally.compared += 1;
        perForm.set(form, (perForm.get(form) ?? 0) + 1);
        // reach holds <=> G not-p refuted. The duals, written as the equivalence rather than as
        // two one-way implications, because a one-way check passes on a side that always refutes.
        const expected: Outcome = sabotage === "reach-wrong-polarity"
          ? left
          : (left === "holds" ? "refuted" : "holds");
        if (right.outcome !== expected) {
          disagreements.push(
            `${where}: reach says ${left}, so G not-p must say ${expected}, and it said ` +
            `${right.outcome}`);
          continue;
        }
        if (left === "holds") {
          // The counterexample is a reach witness: the target really occurs on the trace. Without
          // this the equivalence could hold while the lasso pointed at something else entirely.
          const compiled = compileSystem(subject.system);
          assert.ok(compiled.ok, where);
          const holdsHere = compilePredicate(compiled.value.scope, subjectPredicate);
          assert.ok(holdsHere.ok, where);
          const reached = configurationsOn(right.evidence).some((c) => holdsHere.value(c));
          if (!reached) {
            disagreements.push(
              `${where}: G not-p was refuted, but no configuration on the returned lasso satisfies ` +
              `p -- the counterexample is to some other claim`);
          }
        }
        continue;
      }

      // repeatable-cycle t. The full row, as a biconditional against the un-closed graph's dead
      // ends: F G not-t is refuted exactly when the target lies on a real cycle OR on a halt, since
      // the stutter self-loop makes a halt satisfy t forever. Asserting only the forward
      // implication would miss a stutter-closure LEAK, which is the error this row exists to catch.
      const left = shipped(subject, saved);
      const right = ltl(subject, eventuallyOf(alwaysOf(notOf(atom))));
      if (refusalHandled(where, left, right.outcome)) continue;
      if (left === "inconclusive" || right.outcome === "inconclusive") {
        tally.skippedUnsettled += 1;
        continue;
      }
      tally.compared += 1;
      perForm.set(form, (perForm.get(form) ?? 0) + 1);
      const expectRefuted = left === "holds"
        || (sabotage !== "cycle-ignores-halts" && deadEndSatisfying(subject, subjectPredicate));
      const expected: Outcome = expectRefuted ? "refuted" : "holds";
      if (right.outcome !== expected) {
        disagreements.push(
          `${where}: repeatable-cycle says ${left} and dead-end-satisfying is ` +
          `${deadEndSatisfying(subject, subjectPredicate)}, so F G not-t must say ${expected}, ` +
          `and it said ${right.outcome}`);
      }
    }
  }

  return { disagreements, tally, perForm };
}

test("every bridgeable saved query agrees with its LTL formula", () => {
  const { disagreements, tally, perForm } = crossCheck();

  assert.deepEqual(disagreements, [],
    `the two implementations disagree, which the one-denotation rule makes a defect in one of ` +
    `them:\n  ${disagreements.join("\n  ")}`);

  // A cross-check that compared nothing passes. These floors are the defence, and they are stated
  // as minima rather than as today's exact counts so a new model raises coverage without reddening
  // the gate.
  assert.ok(tally.compared >= 15,
    `the cross-check must actually compare: ${JSON.stringify(tally)}`);
  assert.ok((perForm.get("reach") ?? 0) >= 10, `reach coverage: ${JSON.stringify([...perForm])}`);
  assert.ok((perForm.get("invariant") ?? 0) >= 3, `invariant coverage: ${JSON.stringify([...perForm])}`);
  assert.ok((perForm.get("repeatable-cycle") ?? 0) >= 2,
    `repeatable-cycle coverage: ${JSON.stringify([...perForm])}`);
  // The refusal row is exercised by shipped data, which is what keeps `refusalHandled`'s
  // disagreement arm from being a branch nothing reaches. `autonomous-delivery` ships a `reach` whose
  // target names no declared machine, and both implementations refuse it; before that example there
  // was no refusing behavior query in the corpus and this guard could not have been written against
  // anything. A floor rather than an exact count, so a later example raises it without reddening.
  assert.ok(tally.skippedUnlicensed >= 1,
    `no shipped behavior query is refused, so the both-sides-refuse row is untested: ` +
    `${JSON.stringify(tally)}`);

  // And the exclusions stay exceptional. If `avoid`, an unsettled limit or a refused question ever
  // became the common case, the floors above would be met by a shrinking minority of the real
  // questions. All three exclusions count against the same ceiling for that reason.
  assert.ok(tally.skippedAvoid + tally.skippedUnsettled + tally.skippedUnlicensed <= tally.compared / 2,
    `too much was excluded to call this a cross-check: ${JSON.stringify(tally)}`);
});

test("the cross-check fires — each bent bridge equation the shipped models can see goes red", () => {
  // The green run above says the two implementations agree. On its own that is also what a
  // comparison of nothing against nothing looks like, so each sabotage bends ONE equation and the
  // cross-check must notice.
  const silent: string[] = [];
  for (const sabotage of ["invariant-as-eventually", "reach-wrong-polarity"] as const) {
    const { disagreements } = crossCheck(sabotage);
    if (disagreements.length === 0) silent.push(sabotage);
  }
  assert.deepEqual(silent, [],
    `these sabotages left the cross-check green, so it does not test those rows: ${silent.join(", ")}`);
});

test("the halt disjunct of the cycle row is UNEXERCISED by shipped data, and the reason still holds", () => {
  // `cycle-ignores-halts` is the third sabotage and it stays GREEN. Declared rather than dropped,
  // because an undeclared exclusion and a forgotten one look identical from a test list.
  //
  // The measured reason: both shipped `repeatable-cycle` queries name a state that is never a dead
  // end (document-processing's `remediating` and worker-queue's `queued`, each in a model with five
  // dead ends, none of which satisfies the target). So the halt disjunct changes no verdict here
  // and bending it changes nothing to notice. The row IS covered -- by the terminating fixture in
  // `test/ltl-product.test.ts`, where `F G not-t` is refuted at a halt while `repeatable-cycle t`
  // is refuted on the un-closed graph.
  //
  // What this test holds is the PREMISE. If a model ever ships a cycle target that sits on a halt,
  // the exclusion stops being true and the sabotage should be promoted into the control above.
  const { disagreements } = crossCheck("cycle-ignores-halts");
  const overlaps: string[] = [];
  let cycleQueries = 0;
  for (const subject of subjects()) {
    for (const saved of behaviorQueries(subject)) {
      if (saved.query.form !== "repeatable-cycle" || saved.query.target === null) continue;
      cycleQueries += 1;
      if (deadEndSatisfying(subject, saved.query.target)) {
        overlaps.push(`${subject.name} / ${saved.id}`);
      }
    }
  }
  assert.ok(cycleQueries >= 2, `the premise is about real queries: ${cycleQueries} found`);
  assert.deepEqual(overlaps, [],
    `a shipped repeatable-cycle target now sits on a reachable dead end (${overlaps.join(", ")}), ` +
    `so the halt disjunct IS exercised: move 'cycle-ignores-halts' into the sabotage control above`);
  assert.equal(disagreements.length, 0,
    "with no overlap, bending the halt disjunct must change nothing — if it did, the premise above " +
    "is measuring the wrong thing");
});

// ----------------------------------------------------------------------------------------------
// The negation self-check, at the model level
// ----------------------------------------------------------------------------------------------

test("phi and not-phi never both hold, and phi holding refutes not-phi", () => {
  let checked = 0;
  let bothRefuted = 0;
  const problems: string[] = [];

  for (const subject of subjects()) {
    for (const saved of behaviorQueries(subject)) {
      const subjectPredicate = saved.query.predicate ?? saved.query.target;
      if (subjectPredicate === null) continue;
      const atom = proposition(subjectPredicate);
      const shapes: readonly (readonly [string, ParsedFormula])[] = [
        ["G p", alwaysOf(atom)],
        ["F p", eventuallyOf(atom)],
        ["G F p", alwaysOf(eventuallyOf(atom))],
        ["F G p", eventuallyOf(alwaysOf(atom))],
      ];
      for (const [shape, formula] of shapes) {
        const direct = ltl(subject, formula);
        const negated = ltl(subject, notOf(formula));
        if (direct.outcome === "inconclusive" || negated.outcome === "inconclusive") continue;
        if (direct.outcome === "unlicensed" || negated.outcome === "unlicensed") continue;
        checked += 1;
        const where = `${subject.name} / ${saved.id} / ${shape}`;
        if (direct.outcome === "holds" && negated.outcome !== "refuted") {
          problems.push(`${where}: phi holds but not-phi says ${negated.outcome}`);
        }
        if (direct.outcome === "holds" && negated.outcome === "holds") {
          problems.push(`${where}: phi and not-phi BOTH hold, which is a contradiction`);
        }
        if (direct.outcome === "refuted" && negated.outcome === "refuted") bothRefuted += 1;
      }
    }
  }

  assert.deepEqual(problems, [], `the negation self-check found:\n  ${problems.join("\n  ")}`);
  assert.ok(checked >= 60, `the sweep must cover real ground: ${checked} pairs`);
  assert.ok(bothRefuted > 0,
    "both-refuted must OCCUR, or this file is silently asserting a complementarity the model " +
    "level does not have -- different executions witness each, and that is not a defect to fix");
});
