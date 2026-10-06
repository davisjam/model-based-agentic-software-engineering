// The perturbation runner: delete a declaration, see which recorded answers move, put it back.
//
// SHARED, deliberately, and this file exists rather than the logic sitting inside one gate because
// two gates need the same predicate core and two copies of it would be the extract-on-the-second-site
// defect this repo names:
//
//   - **SEMANTIC-LIVE** (`test/semantic-live.test.ts`) asks whether ANY recorded answer moves, over
//     a denominator derived from the sweep itself. It owns the highlighted-declaration inventory and
//     the moved-anything verdict.
//   - **TRUTH** (designed 261005, not yet landed) asks whether a NAMED query's answer moves, over a
//     registry of declared prose-to-declaration claims. It owns the claim registry, the TOUCH check
//     — does the cited transaction address the cited declaration at all — and the named-query
//     verdicts.
//
// So the runner returns a PER-QUERY DELTA rather than a boolean or a digest. "Did anything move" is
// `moved.length > 0`; "did `lease-held-while-processing` move from holds to refuted" is a lookup in
// the same array. A runner that answered only the first question would have forced the second gate
// to re-evaluate the query set for itself, which is how two gates come to disagree about what an
// answer is.
//
// ## What it inherits rather than reimplements
//
// `Workspace.openHypothesis` / `discardHypothesis`, which is the seam the declared-modification
// harness already drives (`test/examples.test.ts`). Three disciplines come with it:
//
//   1. `base` is the LIVE hash, never a fixture value — a written-down hash is stale the moment the
//      example changes.
//   2. Discard is ASSERTED to restore the exact identity. The hypothesis branch is a separate engine
//      loaded from the same text precisely so a what-if cannot re-identify the authoritative model,
//      and a probe that left the workspace perturbed would poison every later measurement in the
//      sweep.
//   3. A REFUSED transaction is reported as refused. It is neither live nor inert: reading it as
//      inert invents a finding and reading it as live hides one.
//
// ## What an ANSWER is
//
// Every saved query's outcome, coverage kind and reason, refusal, magnitude and presented evidence
// (shape, role, graph nodes, step labels), plus every derived requirement verdict. Deliberately NOT
// `coverage.statesExplored`: the fixture discipline refuses to pin the configuration count because
// it moves when a state is added anywhere, and a liveness probe that counted it would call almost
// every perturbation live and measure nothing. Measured over the shipped corpus: with the explore
// count included, 95 of 97 perturbations read live; without it, 40.
import assert from "node:assert/strict";
import { Workspace } from "../src/app/services.ts";
import { verifySystemRequirements } from "../src/engine/index.ts";
import { exampleText, realPorts } from "../scripts/gen-example-coverage.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";

// ----------------------------------------------------------------------------------------------
// Subject locators — one addressing scheme, exported so a second gate joins rather than re-derives
// ----------------------------------------------------------------------------------------------

/**
 * `guard:<machine>/<from>-><to>` — the guards on one transition, addressed as a unit.
 *
 * A unit because there is no delete-guard operation and inventing one for a gate would put a
 * mutation in the transaction vocabulary no user asked for. The perturbation re-adds the transition
 * without its `requires`, preserving `sync`, `label` and `effects`, so the only thing that changed
 * is the guard.
 */
export const guardSubject = (machine: string, from: string, to: string): string =>
  `guard:${machine}/${from}->${to}`;

/** `relation:<model>/<type>` — every relation of one type asserted by one model. */
export const relationSubject = (model: string, type: string): string => `relation:${model}/${type}`;

/** `property:<name>` — every entity property of one name. Properties are system-level, not per-model. */
export const propertySubject = (name: string): string => `property:${name}`;

/**
 * What may hold an inert declaration's correctness instead of the engine. CLOSED, and declared HERE.
 *
 * The structured half of the inert label, settled 261005 with the TRUTH gate's design. It lives in
 * this shared module rather than in either gate because THREE readers need the same vocabulary:
 * SEMANTIC-LIVE validates a row against it, EPISTEMIC-BOUNDARY treats it as the renderable substrate
 * for "explanation, not machinery", and TRUTH's `inert:` claims carry it. A copy in each would be
 * three vocabularies, and a row legal in one gate would be illegal in the next.
 *
 * Unified rather than held by a parity check, deliberately: the compiler holds a shared import and a
 * cross-file text scan does not. The first draft of this join WAS a scan — each gate declared its own
 * set and a test asserted the sibling file mentioned every member — and sabotaging it proved the scan
 * toothless: the renamed member was still mentioned in the sibling's own fixtures, so a diverged
 * vocabulary passed.
 *
 * A closed set rather than free text because the point of the field is to be machine-readable: a
 * surface can render "rationale, held by a parity check — not consumed by the engine" from a member
 * and cannot render it from a sentence. The `reason` beside it carries the prose.
 *
 *   `parity-control`         a sibling test derives the same value and fails on a difference
 *   `stronger-declaration`   another declaration already carries the bound (a finite domain, a sync)
 *   `model-shape`            it makes a set of edges total or disjoint; a property of the model
 *   `the-reader`             a human reads it; the model states a fact no shipped question asks
 */
export const HELD_BY: ReadonlySet<string> =
  new Set(["parity-control", "stronger-declaration", "model-shape", "the-reader"]);

// ----------------------------------------------------------------------------------------------
// The enumeration
// ----------------------------------------------------------------------------------------------

/** One deletable declaration, with the subject locator a fixture row must carry to claim it. */
export interface Perturbation {
  readonly subject: string;
  /** Which instance of the subject this is — for a message that names what was deleted. */
  readonly instance: string;
  readonly operations: readonly unknown[];
}

const guardPerturbations = (sys: CanonicalSystem): readonly Perturbation[] => {
  const out: Perturbation[] = [];
  for (const machine of sys.machines.values()) {
    for (const t of machine.transitions) {
      if (t.guards.length === 0) continue;
      out.push({
        subject: guardSubject(machine.id, t.from, t.to),
        instance: t.guards.map((g) => `${g.ref} ${g.op} ${String(g.value)}`).join(" and "),
        operations: [
          { op: "delete-transition", machine: machine.id, index: t.index },
          {
            op: "add-transition", machine: machine.id, from: t.from, to: t.to,
            ...(t.label === null ? {} : { label: t.label }),
            ...(t.sync === null ? {} : { sync: t.sync }),
            ...(t.effects.length === 0 ? {} : {
              effects: Object.fromEntries(t.effects.map((e) => [e.variable, e.expression])),
            }),
          },
        ],
      });
    }
  }
  return out;
};

const relationPerturbations = (sys: CanonicalSystem): readonly Perturbation[] =>
  sys.relations.map((r) => ({
    subject: relationSubject(r.model, r.type),
    instance: `${r.from} -> ${r.to}`,
    operations: [{
      op: "delete-relation", model: r.model, from: r.from, to: r.to, type: r.type,
      ...(r.id === null ? {} : { id: r.id }),
    }],
  }));

const propertyPerturbations = (sys: CanonicalSystem): readonly Perturbation[] => {
  const out: Perturbation[] = [];
  for (const e of sys.entities.values()) {
    for (const name of e.properties.keys()) {
      out.push({
        subject: propertySubject(name),
        instance: e.id,
        operations: [{ op: "set-property", id: e.id, name, unset: true }],
      });
    }
  }
  return out;
};

/**
 * Every single-declaration deletion the transaction vocabulary can express over one system.
 *
 * Guards, relations and entity properties. States, entities and whole models are excluded: deleting
 * one makes most questions `unlicensed`, so the probe would report "an answer moved" for every one
 * of them and establish nothing about whether the declaration carried a result.
 */
export const perturbationsOf = (sys: CanonicalSystem): readonly Perturbation[] =>
  [...guardPerturbations(sys), ...relationPerturbations(sys), ...propertyPerturbations(sys)];

// ----------------------------------------------------------------------------------------------
// The answer set, and the diff
// ----------------------------------------------------------------------------------------------

/** One recorded answer, as the comparable string the diff is over. */
interface Answers { readonly byKey: ReadonlyMap<string, string>; }

function answersOf(ws: Workspace, sys: CanonicalSystem): Answers {
  const byKey = new Map<string, string>();
  for (const id of [...sys.queries.keys()].sort()) {
    const res = ws.query(sys.queries.get(id)?.raw);
    const ev = res.evidence;
    byKey.set(`query:${id}`, [
      res.outcome, res.coverage.kind, String(res.coverage.reason), String(res.refusal),
      res.magnitude === null ? "-" : `${String(res.magnitude.value)} ${res.magnitude.unit}`,
      ev === null ? "-" : [
        ev.shape, ev.role, (ev.nodes ?? []).join(">"),
        [...ev.steps, ...(ev.cycle ?? [])].map((s) => s.label ?? "_").join(","),
      ].join("/"),
    ].join(" | "));
  }
  for (const [id, verification] of verifySystemRequirements(sys)) {
    byKey.set(`requirement:${id}`, JSON.stringify(verification));
  }
  return { byKey };
}

/** One recorded answer that moved: its key, and the two readings. */
export interface AnswerDelta {
  /** `query:<id>` or `requirement:<id>` — the recorded answer, by its own name. */
  readonly key: string;
  /** The saved-query id, for a query delta; null for a requirement. */
  readonly query: string | null;
  readonly before: string;
  readonly after: string;
}

const diff = (before: Answers, after: Answers): readonly AnswerDelta[] => {
  const out: AnswerDelta[] = [];
  for (const [key, was] of before.byKey) {
    const now = after.byKey.get(key) ?? "(the answer is gone)";
    if (now === was) continue;
    out.push({ key, query: key.startsWith("query:") ? key.slice("query:".length) : null, before: was, after: now });
  }
  return out;
};

// ----------------------------------------------------------------------------------------------
// The runner
// ----------------------------------------------------------------------------------------------

/** One measured perturbation. `refusal` non-null means nothing was measured, which is a finding. */
export interface Measured extends Perturbation {
  readonly moved: readonly AnswerDelta[];
  readonly refusal: string | null;
}

/** True when some recorded answer moved. `moved.length > 0`, named so a caller reads intent. */
export const isLive = (m: Measured): boolean => m.refusal === null && m.moved.length > 0;

/**
 * Apply one perturbation as a hypothesis, diff the recorded answers, discard and verify restored.
 *
 * The workspace is left exactly as it was handed over, which is what lets a caller run a whole
 * sweep against one loaded workspace. Asserted rather than assumed: a probe that leaked its
 * hypothesis would make every later measurement a measurement of the wrong system.
 */
export function perturb(
  ws: Workspace, p: Perturbation, baseline: Answers = answersOf(ws, ws.state.system),
): Measured {
  const before = ws.state.hash;
  const opened = ws.openHypothesis(`perturbation: ${p.subject}`, {
    transaction: { base: before, operations: p.operations },
  });
  if (!opened.ok) {
    return { ...p, moved: [], refusal: opened.findings.map((f) => f.message).join("; ") };
  }
  const moved = diff(baseline, answersOf(ws, ws.state.system));
  assert.ok(ws.discardHypothesis(), `${p.subject}: the probe must restore the model`);
  assert.equal(ws.state.hash, before, `${p.subject}: discarding must restore the exact identity`);
  return { ...p, moved, refusal: null };
}

/**
 * Every perturbation of one shipped example, measured.
 *
 * Measured 2.0–2.5 s for all six shipped examples (97 perturbations), so the full cross-product is
 * cheap enough to be a default-tier denominator and no sampling is needed.
 */
export function sweepExample(exampleId: string): readonly Measured[] {
  const ws = new Workspace(realPorts);
  const loaded = ws.load(exampleText(exampleId));
  assert.ok(loaded.ok, `${exampleId}: did not load, so nothing measured below means anything`);
  const baseline = answersOf(ws, ws.state.system);
  return perturbationsOf(ws.state.system).map((p) => perturb(ws, p, baseline));
}

/**
 * The sweep, memoized per example.
 *
 * The measurement is a pure function of the shipped bytes and nothing here mutates them, so several
 * rules reading it would otherwise multiply two seconds by the rule count for an identical answer.
 * Cached rather than computed at module load so importing this file for its locators does no engine
 * work.
 */
const SWEPT = new Map<string, readonly Measured[]>();

export const sweep = (exampleId: string): readonly Measured[] => {
  const cached = SWEPT.get(exampleId);
  if (cached !== undefined) return cached;
  const fresh = sweepExample(exampleId);
  SWEPT.set(exampleId, fresh);
  return fresh;
};
