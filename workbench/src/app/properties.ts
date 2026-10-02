/**
 * Properties — a persistent engineering claim, its current verdict, and what established it.
 *
 * ## A property is not a saved query, and it is not a new IR object either
 *
 * A saved query is a question. A property is a question PLUS its current verdict PLUS the grounding
 * of that verdict (§3.3, §9). The question is already semantic and already persisted:
 * `CanonicalSystem.queries`. What this module adds is the other two, and the decision that governs
 * the whole design is **where they are allowed to live**.
 *
 * Nowhere. A verdict is derived state, so it is recomputed on every read and stored in no file, no
 * field of the IR, and no cache. The project already settled this twice:
 *
 *   - **V18** — derived values are recomputed, never stored. `modelMetrics` is a function over the
 *     system rather than a field of it, for the stated reason that storing a count would put it in
 *     the hash twice, once as the structure and once as the count.
 *   - **View positions** were deliberately kept out of the IR so they could not affect a result
 *     (`ViewState` says so where it is declared).
 *
 * A verdict is subject to BOTH arguments at once, and the second is the sharper one. Put a verdict
 * in the IR and it enters `systemHash`; then recording the answer changes the system the answer was
 * about, every property goes stale the moment one is evaluated, and the fixed point the hash exists
 * to pin is gone. So an `EvaluatedProperty` is a projection — built on demand from (the IR's saved
 * query) x (a `QueryResult`) — and it is never written back. `Workspace.properties()` recomputes;
 * there is no setter and no field to set.
 *
 * The grounding travels the same way, and for a second reason: it is computed FROM the result, so a
 * stored copy could disagree with the verdict it grounds. UX-I5 is only worth having if the models
 * it names are the models that produced the status now on screen.
 *
 * ## Status is five words over four outcomes
 *
 * §9.1 asks for ESTABLISHED / REFUTED / CONDITIONAL / NOT ANSWERABLE / INCONCLUSIVE. The engine has
 * four outcomes, deliberately (`holds | refuted | inconclusive | unlicensed`), and CONDITIONAL is
 * not a fifth one waiting to be added. It is a conclusive outcome that carries a disclosed
 * condition — and the one condition this workbench can actually detect is V23's rewrite: when the
 * engine had to compile the question into a different one to answer it, "holds" holds of the
 * rewritten system. That is reported as CONDITIONAL rather than as ESTABLISHED, because a reader
 * who is told "established" will not go looking for the disclosure.
 *
 * Nothing else is mapped there. Inventing a condition the engine did not report would be the
 * fabrication this project refuses, and an unused status word is cheaper than a wrong one.
 */
import { checkExpectation, parseBehaviorQuery, parseGraphQuery } from "../engine/index.ts";
import type { Predicate } from "../engine/index.ts";
import { modelsDeclaring } from "../engine/graph.ts";
import type { CanonicalSystem, Coverage, Evidence, QueryResult } from "../ir/types.ts";
import type { UxViolation } from "./capabilities.ts";

/** §9.1's vocabulary. A word, never an icon: the icons there are explicitly nonnormative. */
export type PropertyStatus =
  | "established" | "refuted" | "conditional" | "not-answerable" | "inconclusive" | "not-evaluated";

/**
 * The word shown, and what it MEANS, because "refuted" alone is jargon to a student and
 * "inconclusive" is the one every reader mistakes for a no.
 */
export const STATUS_TEXT: Readonly<Record<PropertyStatus, string>> = {
  established: "ESTABLISHED — this claim holds",
  refuted: "REFUTED — this claim does not hold",
  conditional: "CONDITIONAL — it holds of a rewritten question, and the rewrite is disclosed below",
  "not-answerable": "NOT ANSWERABLE — the models deliberately do not represent what this asks",
  inconclusive: "INCONCLUSIVE — the search was bounded, so this is not a 'no'",
  "not-evaluated": "NOT EVALUATED — no result has been computed for this revision",
};

/**
 * One model or machine the status derives from, and WHY it is cited (UX-I5).
 *
 * `why` is the field that makes this an answer rather than a list. §9.2 prints bare model names;
 * a bare name leaves the reader to guess whether the model supplied the vocabulary, an endpoint or
 * a step of the evidence, and those are different kinds of dependence. It is also what makes the
 * derivation auditable — a `why` nobody could have written from the result is a bug in this file.
 *
 * Machines are cited alongside models because a behavioural property derives from a MACHINE, and
 * §3.2's "purposeful model" covers it: a machine carries its own `purpose` block and is drawn as
 * its own subject. Naming only `CanonModel`s would leave every behavioural property ungrounded.
 */
export interface Ground {
  readonly kind: "model" | "machine";
  readonly id: string;
  readonly label: string;
  readonly why: string;
}

/** The engineer's declaration that satisfaction matters (§13) — a saved query's `expect`. */
export interface Expectation {
  readonly declared: string;
  readonly met: boolean;
  /** Set when `expect` did not survive YAML as an outcome word — a coercion bug (V25), not a verdict. */
  readonly problem: string | null;
}

export interface EvaluatedProperty {
  /** The saved-query id. Immutable, and how every other surface addresses this property. */
  readonly id: string;
  /** What the claim SAYS, in the author's words. The query's `name`, or the id when it has none. */
  readonly proposition: string;
  /** A requirement is a property whose satisfaction the engineer declared matters (§13). */
  readonly kind: "property" | "requirement";
  readonly status: PropertyStatus;
  /** The engine's own word, kept beside the §9.1 status so neither has to be reverse-engineered. */
  readonly outcome: QueryResult["outcome"] | null;
  readonly coverage: Coverage | null;
  readonly evidence: Evidence | null;
  readonly refusal: string | null;
  /** Disclosed rewrites (V23). Non-empty is what makes a conclusive outcome CONDITIONAL. */
  readonly compilation: readonly string[];
  readonly grounds: readonly Ground[];
  readonly expectation: Expectation | null;
  /** The revision the status describes. §9.3's "last evaluation revision". */
  readonly evaluatedAt: string | null;
  /** The revision the model system is at NOW. */
  readonly currentRevision: string;
  /**
   * The verdict was computed against a different revision than the one now loaded.
   *
   * When this is true the verdict is NOT the property's status, and every surface must lead with
   * the mismatch rather than the word. See `evaluateProperties` for why it is reachable at all.
   */
  readonly stale: boolean;
}

// --------------------------------------------------------------------------------------------
// Grounding
// --------------------------------------------------------------------------------------------

const atoms = (p: Predicate | null, out: string[] = []): readonly string[] => {
  if (p === null) return out;
  if (p.kind === "atoms") { for (const a of p.atoms) out.push(a.ref); return out; }
  if (p.kind === "not") return atoms(p.operand, out);
  for (const operand of p.operands) atoms(operand, out);
  return out;
};

/**
 * The instance or machine a reference names, as a machine id.
 *
 * The head token only. `worker[1].retry_count` and `worker.state` and a bare `worker` all ground in
 * the same machine, and which coordinate of a configuration the reference picks out is not a fact
 * about which model the property depends on. A bare variable name that no instance shares its
 * spelling with yields nothing — guessing which machine declared it would be inventing a
 * dependence, and `resolveRef` already refuses the ambiguous case for the same reason.
 */
function machineOfRef(system: CanonicalSystem, ref: string): string | null {
  const head = (ref.split(".")[0] ?? "").split("[")[0] ?? "";
  if (head === "") return null;
  if (system.machines.has(head)) return head;
  return system.instances.find((i) => i.id === head || i.machine === head)?.machine ?? null;
}

class Grounds {
  readonly #system: CanonicalSystem;
  /** Keyed by `<kind>:<id>`, so the FIRST reason a model is cited is the one kept. */
  readonly #seen = new Map<string, Ground>();

  constructor(system: CanonicalSystem) { this.#system = system; }

  model(id: string, why: string): void {
    const m = this.#system.models.get(id);
    if (m === undefined) return;
    const key = `model:${id}`;
    if (!this.#seen.has(key)) this.#seen.set(key, { kind: "model", id, label: m.label, why });
  }

  machine(id: string, why: string): void {
    const m = this.#system.machines.get(id);
    if (m === undefined) return;
    const key = `machine:${id}`;
    if (!this.#seen.has(key)) this.#seen.set(key, { kind: "machine", id, label: id, why });
    // A machine MAY correspond to an entity (V6), and that entity's models are a genuine second
    // dependence: the machine says how the thing behaves, the model says what it is connected to.
    // §9.2's cross-model property is exactly this shape.
    if (m.entity !== null) {
      for (const model of this.#modelsContaining(m.entity)) {
        this.model(model, `contains ${m.entity}, the entity machine ${id} describes the behaviour of`);
      }
    }
  }

  entity(id: string, why: (model: string) => string): void {
    for (const model of this.#modelsContaining(id)) this.model(model, why(model));
  }

  #modelsContaining(entity: string): readonly string[] {
    return [...this.#system.models.values()].filter((m) => m.entities.includes(entity)).map((m) => m.id);
  }

  /** Sorted, so two runs over the same system cite the same models in the same order. */
  list(): readonly Ground[] {
    return [...this.#seen.values()].sort((a, b) =>
      a.kind === b.kind ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.kind < b.kind ? -1 : 1);
  }
}

/**
 * Which models and machines the status derives from (UX-I5).
 *
 * Two sources, deliberately both: the QUESTION'S vocabulary and the EVIDENCE. The question alone
 * would name models the answer never touched; the evidence alone would ground nothing at all for a
 * refusal or an exhaustive absence, which are the two results where a reader most needs to know
 * which reduction produced them.
 *
 * Everything here is model-level, which is §11's constraint read as a rule for this function:
 * solver variables and implementation artifacts may not substitute for model-level evidence. So no
 * configuration counts, no instance indices, no internal rewrite names — the citations are model
 * ids, machine ids and entity ids, every one of them a thing the author wrote.
 */
export function groundsFor(
  system: CanonicalSystem, raw: unknown, result: QueryResult | undefined,
): readonly Ground[] {
  const g = new Grounds(system);
  const q = typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};

  if (q["kind"] === "graph") {
    const parsed = parseGraphQuery(q["graph"]);
    if (parsed.ok) {
      const relation = parsed.value.relation;
      const declaring = new Set(modelsDeclaring(system, relation));
      for (const model of declaring) {
        g.model(model, `declares the ${relation} relations this question traverses`);
      }
      // An endpoint's models are cited too, and the reason SAYS which kind of dependence it is. A
      // model that declares the relation carries the answer; a model that merely contains the
      // endpoint does not, and conflating the two would make the citation list look stronger than
      // it is. The second case is also §12's "Relevant models" for a refusal: when NO model declares
      // the relation type, these are the models that would have to represent it, which is the
      // explanation of the refusal rather than a consolation list.
      for (const [side, id] of [["from", parsed.value.from], ["to", parsed.value.to]] as const) {
        if (id === null) continue;
        g.entity(id, (model) => declaring.has(model)
          ? `contains ${id}, the '${side}' endpoint of the question`
          : `contains ${id}, the '${side}' endpoint, but declares no ${relation} relations`);
      }
    }
  } else if (q["kind"] === "behavior") {
    const parsed = parseBehaviorQuery(q["behavior"]);
    if (parsed.ok) {
      const b = parsed.value;
      const refs = [
        ...atoms(b.target), ...atoms(b.predicate), ...atoms(b.avoid),
      ];
      for (const ref of refs) {
        const machine = machineOfRef(system, ref);
        if (machine !== null) g.machine(machine, `the question constrains ${ref}`);
      }
      if (b.transition?.machine !== null && b.transition?.machine !== undefined) {
        g.machine(b.transition.machine, "the question names a transition of this machine");
      }
    }
  }

  const ev = result?.evidence ?? null;
  if (ev !== null) {
    for (const node of ev.nodes ?? []) {
      g.entity(node, () => `contains ${node}, which the ${ev.role} traverses`);
    }
    for (const step of ev.steps) {
      for (const instance of step.instances) {
        const machine = machineOfRef(system, instance);
        if (machine !== null) g.machine(machine, `takes a step in the ${ev.role}`);
      }
    }
  }
  return g.list();
}

// --------------------------------------------------------------------------------------------
// Evaluation
// --------------------------------------------------------------------------------------------

function statusOf(result: QueryResult | undefined): PropertyStatus {
  if (result === undefined) return "not-evaluated";
  const conditional = result.compilation.length > 0;
  switch (result.outcome) {
    case "holds": return conditional ? "conditional" : "established";
    case "refuted": return conditional ? "conditional" : "refuted";
    case "unlicensed": return "not-answerable";
    default: return "inconclusive";
  }
}

function expectationOf(raw: unknown, result: QueryResult | undefined): Expectation | null {
  if (result === undefined) return null;
  const v = checkExpectation(raw, result);
  switch (v.kind) {
    case "exploratory": return null;
    case "met": return { declared: v.outcome, met: true, problem: null };
    case "unmet": return { declared: v.expected, met: false, problem: null };
    // A coerced `expect` is not an unmet requirement — it is a claim nobody managed to state. Held
    // as a requirement with `met: false` and the reason, so it cannot read as satisfied.
    case "coerced": return { declared: "(unreadable)", met: false, problem: v.message };
  }
}

/**
 * Every persistent property of the system, with its current verdict and grounding.
 *
 * `results` is passed IN rather than computed here, which is what keeps this function pure and
 * testable and keeps the engine out of the dependency edge. It is also the reason `stale` is
 * reachable: every production caller hands over results it just computed against `currentHash`, so
 * the hashes agree and no property is ever stale through `Workspace.properties()` — but
 * `window.mage.evidence(id)` hands out a cached result that outlives its system, and the first
 * person to "optimise" the UI by caching verdicts will hand a stale map here. On that day this
 * reports a mismatch instead of the UI quietly presenting last revision's answer as this one's.
 *
 * Order follows the saved-query key order, which is the order the author wrote them in.
 */
export function evaluateProperties(
  system: CanonicalSystem,
  results: ReadonlyMap<string, QueryResult>,
  currentRevision: string,
): readonly EvaluatedProperty[] {
  return [...system.queries].map(([id, saved]) =>
    evaluateOne(system, id, saved.raw, results.get(id), currentRevision));
}

/**
 * One property, from one query and one result.
 *
 * Exported because a question that has not been SAVED yet is still a proposition with a verdict and
 * a grounding, and §10.3's "Save as Property" only makes sense if what gets saved reads exactly as
 * it did before it was saved. The ad-hoc answer panel and the persistent property list therefore go
 * through this same function: saving a property changes how long the claim lasts, not how it reads.
 *
 * `result` is `undefined` for a property nobody has evaluated — a saved query the caller did not
 * run. That is `not-evaluated`, which is a status and not an error.
 */
export function evaluateOne(
  system: CanonicalSystem,
  id: string,
  raw: unknown,
  result: QueryResult | undefined,
  currentRevision: string,
): EvaluatedProperty {
  const name = typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)["name"]
    : undefined;
  const expectation = expectationOf(raw, result);
  return {
    id,
    proposition: typeof name === "string" && name.trim() !== "" ? name : id,
    kind: expectation === null ? "property" : "requirement",
    status: statusOf(result),
    outcome: result?.outcome ?? null,
    coverage: result?.coverage ?? null,
    evidence: result?.evidence ?? null,
    refusal: result?.refusal ?? null,
    compilation: (result?.compilation ?? []).map((c) => c.explanation),
    grounds: groundsFor(system, raw, result),
    expectation,
    evaluatedAt: result?.systemHash ?? null,
    currentRevision,
    stale: result !== undefined && result.systemHash !== currentRevision,
  };
}

// --------------------------------------------------------------------------------------------
// UX-I5, as a function
// --------------------------------------------------------------------------------------------

/**
 * UX-I5 — every evaluated property identifies the models and evidence its status derives from.
 *
 * Returns violations rather than throwing, the same shape `checkAffordanceParity` uses, so a caller
 * reports the whole picture at once.
 *
 * Three things are violations, and the third is the one worth stating:
 *
 *   1. A CONCLUSION with no model or machine cited. A property reading "holds" with nothing to say
 *      about what established it is the claim this project exists to refuse.
 *   2. A citation with no reason. A bare model name does not identify a dependence; it names a
 *      neighbour.
 *   3. A STALE property presented with a status at all. A verdict computed against another revision
 *      is not this revision's status, and `QueryResult.systemHash` exists precisely so that this is
 *      detectable rather than invisible. `not-evaluated` is the honest status for it, and anything
 *      else is a number refreshed silently.
 *
 * Two statuses are exempt from the citation requirement, and both for the same reason — citing
 * nothing is the true answer:
 *
 *   - `not-evaluated` derives its status from nothing because it has no status.
 *   - `not-answerable` derives its status from the ABSENCE of vocabulary. `is-the-scheduler-fair`
 *     in the Worker Queue example asks about a machine the system does not declare; there is no
 *     model-level handle to cite, and naming the models that happen to be nearby would dress a
 *     refusal up as a dependence. Running this check against the shipped examples is what surfaced
 *     it — the first version reported that property as ungrounded, which was the CHECK being wrong
 *     rather than the example. What a refusal owes instead is the REFUSAL SENTENCE, so one carrying
 *     neither a citation nor a reason is still a violation: then nothing identifies anything.
 */
export function checkPropertyGrounding(
  properties: readonly EvaluatedProperty[],
): readonly UxViolation[] {
  const out: UxViolation[] = [];
  for (const p of properties) {
    if (p.status === "not-evaluated") continue;
    if (p.stale) {
      out.push({
        invariant: "UX-I5", subject: p.id,
        problem: `status '${p.status}' was computed against ${p.evaluatedAt ?? "no revision"} but the `
          + `system is at ${p.currentRevision}; a stale verdict is not a current status`,
      });
      continue;
    }
    if (p.grounds.length === 0) {
      if (p.status !== "not-answerable") {
        out.push({
          invariant: "UX-I5", subject: p.id,
          problem: `status '${p.status}' names no model or machine it derives from`,
        });
      } else if ((p.refusal ?? "").trim() === "") {
        out.push({
          invariant: "UX-I5", subject: p.id,
          problem: "refuses the question, cites no model, and gives no reason, so nothing identifies "
            + "what the status derives from",
        });
      }
    }
    for (const g of p.grounds) {
      if (g.why.trim() === "") {
        out.push({
          invariant: "UX-I5", subject: p.id,
          problem: `cites ${g.kind} '${g.id}' without saying how the status depends on it`,
        });
      }
    }
  }
  return out;
}
