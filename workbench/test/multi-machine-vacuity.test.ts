// Multi-machine composition, and the vacuity of a verdict decided by the predicate (V41, V42).
//
// Two jobs, and they are the same job. §6.8 of the v0.2 examples design asks whether the engine
// composes independent machines implicitly — an "undefined asynchronous product" it forbids by name.
// It does not: it builds an EXPLICIT interleaved product whose semantics §4.2, §4.3 and §6 state.
// These tests give that composition the stable ID it lacked (V42) so the claim is walked rather than
// asserted, and they pin the discriminator the composition makes necessary (V41).
//
// The discriminator is the point. Once a predicate can name two machines, it can also name one
// machine twice — and `job-lease.state: held-by-0 AND job-lease.state: held-by-1` is a contradiction,
// not a property. The engine refutes both a target the design prevents and a target no state vector
// admits, with the same `refuted / exhaustive / no evidence`. Only the disclosure tells them apart.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import {
  compileSystem, defaultOptions, exploreSpace, type CompiledSystem,
} from "../src/engine/explore.ts";
import { compilePredicate, satisfiability } from "../src/engine/predicate.ts";
import { runBehaviorQuery } from "../src/engine/behavior.ts";
import { parseQuery } from "../src/engine/types.ts";
import type { BehaviorQuery, Predicate } from "../src/engine/types.ts";
import type { CanonicalSystem, Compilation, QueryResult } from "../src/ir/types.ts";

const workerQueue = (): CanonicalSystem =>
  canonicalize(parse(readFileSync("test/fixtures/examples/worker-queue/system.mage.yaml", "utf8")));

const compiled = (system: CanonicalSystem): CompiledSystem => {
  const c = compileSystem(system);
  assert.ok(c.ok, c.ok ? "" : c.refusal);
  return c.value;
};

/** A saved query, parsed through the same entry point every surface uses. */
const behavior = (
  system: CanonicalSystem, id: string,
): { readonly q: BehaviorQuery; readonly quantifier: "exists" | "forall" } => {
  const saved = system.queries.get(id);
  assert.ok(saved !== undefined, `the example does not declare query '${id}'`);
  const parsed = parseQuery(saved.raw);
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.refusal);
  assert.equal(parsed.value.kind, "behavior", `'${id}' is not a behavioural query`);
  assert.ok(parsed.value.kind === "behavior");
  return { q: parsed.value.behavior, quantifier: parsed.value.quantifier };
};

const run = (system: CanonicalSystem, id: string): QueryResult => {
  const { q, quantifier } = behavior(system, id);
  const v = runBehaviorQuery(system, q, quantifier, systemHash(system));
  assert.ok(v.result !== null, `'${id}' was refused: ${String(v.refusal)}`);
  return v.result;
};

const vacuityNote = (res: QueryResult): Compilation | undefined =>
  res.compilation.find((c) => c.kind === "vacuous");

// --------------------------------------------------------------------------------------------
// V42 — the composition is an EXPLICIT interleaved product, not an implicit one
// --------------------------------------------------------------------------------------------

test("V42: the configuration spans EVERY declared machine, so a cross-machine predicate has a subject", () => {
  const system = workerQueue();
  const cs = compiled(system);
  // Two machines are declared; both are coordinates of one vector. This is what makes
  // `job-lifecycle.state: processing AND job-lease.state: free` a predicate about a single
  // configuration rather than a question about two unrelated diagrams.
  assert.deepEqual(
    [...cs.initial.control.keys()].sort(),
    [...system.machines.keys()].sort(),
    "a machine missing from the control vector would make its atoms unsatisfiable, and every " +
    "predicate naming it would answer vacuously while looking exhaustive",
  );
  assert.deepEqual([...cs.initial.control.entries()].sort(),
    [["job-lease", "free"], ["job-lifecycle", "queued"]]);
});

test("V42: both machines' states vary across the walk — neither is pinned at its initial state", () => {
  const system = workerQueue();
  const space = exploreSpace(compiled(system), defaultOptions());
  assert.ok(space.complete, "the walk must be exhaustive for the counts below to mean anything");

  // The negative this rules out: a product that enumerates one machine and carries the other along
  // frozen. Such a space is a real product by construction and a single machine in effect, and every
  // foreign atom in it is decided by the initial state.
  for (const machine of system.machines.keys()) {
    const reached = new Set(space.configs.map((c) => c.control.get(machine)));
    assert.ok(reached.size > 1,
      `'${machine}' never leaves '${[...reached][0]}' in ${space.statesExplored} configurations, ` +
      `so the product only looks like one`);
  }
});

test("V42: the step relation offers BOTH interleaved local moves and joint synchronized events", () => {
  const space = exploreSpace(compiled(workerQueue()), defaultOptions());
  const steps = space.edges.flatMap((es) => es.map((e) => e.step));

  const local = steps.filter((s) => s.sync === null);
  const joint = steps.filter((s) => s.sync !== null);
  assert.ok(local.length > 0, "no local step: §4.2's interleaving is not exercised");
  assert.ok(joint.length > 0, "no event step: §4.3's synchronization is not exercised");

  // §4.2: one enabled transition of ONE machine executes per local step.
  for (const s of local) {
    assert.equal(s.instances.length, 1,
      `a local step moved ${s.instances.length} instances; §4.2 says exactly one`);
  }
  // §4.3: a declared event is ONE system transition involving ALL its participants.
  for (const s of joint) {
    const declared = s.sync === null ? undefined : workerQueue().events.get(s.sync);
    assert.ok(declared !== undefined, `step fired undeclared event '${String(s.sync)}'`);
    assert.deepEqual([...s.instances].sort(), [...declared.participants].sort(),
      `event '${String(s.sync)}' moved a participant set other than the one it declares`);
  }
});

// --------------------------------------------------------------------------------------------
// V41 — satisfiability in the state vector, and the disclosure it drives
// --------------------------------------------------------------------------------------------

const satOf = (system: CanonicalSystem, pred: Predicate): string => {
  const cs = compiled(system);
  const cp = compilePredicate(cs.scope, pred);
  assert.ok(cp.ok, cp.ok ? "" : cp.refusal);
  return satisfiability(cs.scope, pred, cp.value, cs.initial);
};

const atom = (ref: string, value: string): Predicate =>
  ({ kind: "atoms", atoms: [{ ref, op: "eq", value }] });

test("V41: one machine in two control states at once is UNSATISFIABLE in the state vector", () => {
  const system = workerQueue();
  assert.equal(
    satOf(system, {
      kind: "all-of",
      operands: [atom("job-lease.state", "held-by-0"), atom("job-lease.state", "held-by-1")],
    }),
    "unsatisfiable",
    "a single machine occupies one control state; a conjunction asking for two is a contradiction",
  );
});

test("V41: the SAME shape across TWO machines is satisfiable — the discriminator is not 'two atoms'", () => {
  // The pair that matters. Structurally these two predicates are identical: a conjunction of two
  // control-state atoms. One is a contradiction and one is the cross-model safety question §6.8
  // exists to protect. A check that keyed on shape rather than on the state vector would call both
  // vacuous and destroy the only cross-machine property the example ships.
  const system = workerQueue();
  assert.equal(
    satOf(system, {
      kind: "all-of",
      operands: [atom("job-lifecycle.state", "processing"), atom("job-lease.state", "free")],
    }),
    "satisfiable",
    "two DIFFERENT machines can hold these states simultaneously in the vector, whether or not " +
    "any execution reaches it — reachability is the walk's question, not satisfiability's",
  );
});

test("V41: satisfiable-but-unreachable is the EARNED verdict, and is not disclosed as vacuous", () => {
  const system = workerQueue();
  const res = run(system, "lease-held-while-processing");
  assert.equal(res.outcome, "holds");
  assert.equal(res.coverage.kind, "exhaustive");

  // The property holds because the design maintains it: the violation is representable and no
  // execution reaches it. That is the claim the example makes, and it must carry no vacuity caveat.
  const space = exploreSpace(compiled(system), defaultOptions());
  const cs = compiled(system);
  const violation: Predicate = {
    kind: "all-of",
    operands: [atom("job-lifecycle.state", "processing"), atom("job-lease.state", "free")],
  };
  const cp = compilePredicate(cs.scope, violation);
  assert.ok(cp.ok);
  assert.equal(space.configs.filter(cp.value).length, 0,
    "the violation must be unreachable, or the example's safety property is refuted");
  assert.equal(vacuityNote(res), undefined,
    "an earned safety property must NOT be disclosed as vacuous — crying wolf here teaches " +
    "readers to ignore the one disclosure that matters");
});

test("V41: a reach refuted by an UNSATISFIABLE target discloses its vacuity", () => {
  const system = workerQueue();
  const res = run(system, "two-workers-own-one-job");

  // The outcome is correct and stays correct. V41 changes nothing about it.
  assert.equal(res.outcome, "refuted");
  assert.equal(res.coverage.kind, "exhaustive");

  const note = vacuityNote(res);
  assert.ok(note !== undefined,
    "`refuted` here was decided by the predicate, not by the transition structure; without the " +
    "disclosure it is indistinguishable from a target the design prevents");
  assert.match(note.explanation, /VACUOUS/);
  assert.match(note.explanation, /no transition structure was consulted/);
});

test("V41: NEGATIVE CONTROL — a reach refuted by the DESIGN carries no vacuity note", () => {
  // `dead_letter` while the lease is still held: both conjuncts are individually reachable and the
  // combination is representable, so the vector admits it. No execution reaches it, because
  // `release` returns the lease to free before the lifecycle can give up. Refuted, and EARNED.
  const system = workerQueue();
  const target: Predicate = {
    kind: "all-of",
    operands: [atom("job-lifecycle.state", "dead_letter"), atom("job-lease.state", "held-by-0")],
  };
  assert.equal(satOf(system, target), "satisfiable",
    "if this became unsatisfiable the test would pass for the wrong reason");

  const res = runBehaviorQuery(
    system, { form: "reach", target, predicate: null, transition: null, avoid: null, limit: null },
    "exists", systemHash(system),
  );
  assert.ok(res.result !== null);
  assert.equal(res.result.outcome, "refuted", "the design must prevent this for the test to mean anything");
  assert.equal(vacuityNote(res.result), undefined,
    "a design-refuted reach must read differently from a contradiction-refuted one");
});

test("V41: an invariant whose VIOLATION is unsatisfiable holds vacuously, and says so", () => {
  // The universal dual, and the shape §6.8 worried about: a safety property that cannot fail
  // because no configuration can break it. `not(lease=held-by-0 and lease=held-by-1)` is a
  // tautology over the vector — green, exhaustive, and about nothing.
  const system = workerQueue();
  const predicate: Predicate = {
    kind: "not",
    operand: {
      kind: "all-of",
      operands: [atom("job-lease.state", "held-by-0"), atom("job-lease.state", "held-by-1")],
    },
  };
  const res = runBehaviorQuery(
    system, { form: "invariant", target: null, predicate, transition: null, avoid: null, limit: null },
    "forall", systemHash(system),
  );
  assert.ok(res.result !== null);
  assert.equal(res.result.outcome, "holds");
  const note = vacuityNote(res.result);
  assert.ok(note !== undefined,
    "a tautological invariant reports a PROVED SAFETY PROPERTY that is about nothing; the " +
    "disclosure is the only thing standing between that and a reader who believes it");
  assert.match(note.explanation, /VACUOUS/);
});

test("V41: the disclosure travels on the typed `vacuous` arm, not in prose", () => {
  // The arm already existed and already bound forward (`Compilation.kind` in src/ir/types.ts).
  // This pins that the behavioural evaluator reaches for it rather than inventing a dialect — a
  // note under `kind: "other"` is invisible to a consumer branching on the enum.
  const note = vacuityNote(run(workerQueue(), "two-workers-own-one-job"));
  assert.ok(note !== undefined);
  assert.equal(note.kind, "vacuous");
});

test("V41: a derived ref does not get an independent coordinate, so a real vacuity is not missed", () => {
  // `retries_exhausted` is `retry_count == 3`. Treating it as a free coordinate would call this
  // conjunction satisfiable; it is not, because the derived value is a FUNCTION of the variable
  // (V18). The failure direction matters: an independent coordinate would silently stop disclosing.
  const system = workerQueue();
  assert.equal(
    satOf(system, {
      kind: "all-of",
      operands: [
        { kind: "atoms", atoms: [{ ref: "job-lifecycle.retry_count", op: "eq", value: 0 }] },
        { kind: "atoms", atoms: [{ ref: "job-lifecycle.retries_exhausted", op: "eq", value: true }] },
      ],
    }),
    "unsatisfiable",
    "retry_count == 0 and retries_exhausted cannot both hold; a derived value must be recomputed " +
    "from the coordinates it reads, never enumerated beside them",
  );
});

test("V41: satisfiability projects onto the predicate's own refs, not the configuration space", () => {
  // The cost argument, pinned. A predicate naming one machine must not pay for the product: if this
  // enumerated the whole vector it would still answer correctly here and would stop being usable
  // the first time a system carried a wide variable. The budget is what the projection buys.
  const system = workerQueue();
  // One coordinate, three states. A budget below the full vector (72) but at or above 3 must still
  // decide the one-machine contradiction.
  const cs = compiled(system);
  const pred: Predicate = {
    kind: "all-of",
    operands: [atom("job-lease.state", "held-by-0"), atom("job-lease.state", "held-by-1")],
  };
  const cp = compilePredicate(cs.scope, pred);
  assert.ok(cp.ok);
  assert.equal(satisfiability(cs.scope, pred, cp.value, cs.initial, 3), "unsatisfiable",
    "a 3-state projection decides this; needing more means the check is enumerating the product");
  // And below the projection's own size it declines rather than guessing.
  assert.equal(satisfiability(cs.scope, pred, cp.value, cs.initial, 2), "unknown",
    "over budget must read `unknown`; reporting `satisfiable` would be a silent false negative " +
    "and reporting `unsatisfiable` would be an unearned finding");
});
