/**
 * Behavioral queries: `reach`, `invariant`, `recurrence`, `deadend`, `transition-live`.
 *
 * Safety and reachability only. Fairness is unsupported, so "can it reach published?" is in scope
 * and "will it eventually publish?" is not — the latter is not established without fairness
 * assumptions, and the workbench says so rather than guessing (§7.3). There is no past-time
 * operator here either; a past-time question compiles to a safety property first (history.ts).
 *
 * Evidence by form, per §7.2:
 *
 *   reach            a finite TRACE from the initial configuration
 *   invariant        a COUNTEREXAMPLE trace to a violating configuration
 *   recurrence       a LASSO — a finite prefix plus the repeating segment
 *   deadend          a TRACE to a configuration with no enabled step
 *   transition-live  a TRACE whose final step is the named transition
 *
 * ## Coverage, and the one place V22 needs reading rather than quoting
 *
 * V22 says a BOUNDED result must read `inconclusive` and must never render as "no". Its own
 * rationale is about ABSENCE: "no such trace exists" is sound only under exhaustive coverage.
 * A concrete witness or counterexample, by contrast, is sound however little of the space was
 * walked — §7's evidence table asks for no coverage at all in those two cells.
 *
 * So the rule implemented here is: coverage is `bounded` only when the search was truncated AND no
 * settling evidence was found, and that is the only case that reads `inconclusive`. When evidence
 * settles the claim the walk stops immediately and coverage reads `exhaustive` — exhaustive with
 * respect to the question, because a witness needs no further search. `statesExplored` always
 * reports the truth about the walk. This matches `validate.py`, which reports exhaustive coverage
 * for a BFS that found a path after visiting a handful of nodes.
 */
import type { CanonicalSystem, Compilation, Evidence, Step } from "../ir/types.ts";
import { evidenceSteps } from "../ir/types.ts";
import {
  compileSystem, cycleThrough, DEFAULT_STATE_LIMIT, defaultOptions, exploreSpace, pathBetween,
  traceTo, type CompiledSystem, type ExploreOptions, type StateSpace,
} from "./explore.ts";
import {
  compilePredicate, describePredicate, satisfiability, type CompiledPredicate,
} from "./predicate.ts";
import type { RefScope } from "./refs.ts";
import { omissionCovering, omissionProse } from "./omission.ts";
import {
  bounded, detail, exhaustive, refusedAdmission as refused, result, unlicensed, verdict,
  type Admission, type BehaviorForm, type BehaviorQuery, type Fail, type Predicate,
  type Quantifier, type TransitionSelector, type Verdict,
} from "./types.ts";

/**
 * The quantifier each form takes.
 *
 * The quantifier determines what counts as evidence, and conflating existential with universal is
 * "the single most common modeling error the workbench exists to make visible" (§7). A mismatch is
 * therefore REFUSED and the right pairing named — not silently reinterpreted, which would answer a
 * question the user did not ask.
 */
const NATURAL_QUANTIFIER: Readonly<Record<BehaviorForm, Quantifier>> = {
  reach: "exists",
  recurrence: "exists",
  "repeatable-cycle": "exists",
  deadend: "exists",
  "transition-live": "exists",
  invariant: "forall",
};

const trace = (steps: readonly Step[], role: Evidence["role"]): Evidence =>
  ({ shape: "trace", role, steps: evidenceSteps(steps), cycle: null, nodes: null });

const lasso = (prefix: readonly Step[], cycle: readonly Step[]): Evidence =>
  ({ shape: "lasso", role: "witness", steps: evidenceSteps(prefix), cycle: evidenceSteps(cycle), nodes: null });

const asCompilation = (notes: readonly string[]): readonly Compilation[] =>
  notes.map((explanation) => ({ kind: "other", explanation }));

const disclose = (kind: Compilation["kind"], explanation: string): Compilation => ({ kind, explanation });

/**
 * V41 — the vacuity disclosure for a behavioural verdict decided by the PREDICATE rather than by the
 * transition structure.
 *
 * `outcome` cannot carry this. A `reach` whose target contradicts itself is `refuted`, and so is a
 * `reach` the design genuinely prevents; an `invariant` whose violation is unsatisfiable `holds`, and
 * so does one the design genuinely maintains. The pairs are indistinguishable in the result, and the
 * first member of each is a modelling error wearing the second's verdict. The `vacuous` arm of
 * `Compilation.kind` already exists for exactly this and already binds forward by its own
 * declaration (`src/ir/types.ts`), so the disclosure travels there rather than in a new dialect.
 *
 * Only `unsatisfiable` discloses. `satisfiable` is the earned verdict and needs no caveat, and
 * `unknown` — the projection exceeded its budget — must stay silent rather than claim either, because
 * a disclosure that fires on "not computed" trains readers to ignore it.
 */
function vacuityOf(
  plan: BehaviorPlan, subject: CompiledPredicate, form: PredicateForm,
): readonly Compilation[] {
  if (plan.subject.on !== "configurations") return [];
  const verdict = satisfiability(plan.compiled.scope, plan.subject.raw, subject, plan.compiled.initial);
  if (verdict !== "unsatisfiable") return [];
  const described = describePredicate(plan.subject.raw);
  return [disclose("vacuous", form === "invariant"
    ? `No configuration the state vector admits can violate '${described}', so the claim holds ` +
      `VACUOUSLY: it was decided by the predicate, and no transition structure was consulted. A ` +
      `machine cannot occupy two control states at once, and a variable cannot hold two values at ` +
      `once — a conjunction that asks for either is a contradiction, not a property the design ` +
      `maintains. If this was meant to be a safety property the design earns, the predicate is the ` +
      `finding.`
    : `No configuration the state vector admits satisfies '${described}', so the refutation is ` +
      `VACUOUS: it was decided by the predicate, and no transition structure was consulted. The ` +
      `sound reading is that this model cannot REPRESENT the situation, which is stronger than ` +
      `"it does not happen here" and weaker than "it was searched for and not found".`)];
}

// --------------------------------------------------------------------------------------------
// Admission — every pre-evaluation decision, in one place, consumed by the evaluator
// --------------------------------------------------------------------------------------------

/** The four forms whose subject is a set of CONFIGURATIONS picked out by a compiled predicate. */
type PredicateForm = "reach" | "invariant" | "recurrence" | "repeatable-cycle";

/**
 * What the question turned out to be about, once admission resolved it.
 *
 * The three arms partition `BEHAVIOR_FORMS`. `invariant` sits beside `reach` because both compile
 * ONE predicate over configurations; the difference — whether a satisfying configuration is a
 * witness or a counterexample — is the evaluator's, and it is not a licensing decision.
 */
export type BehaviorSubject =
  | {
      readonly on: "configurations"; readonly form: PredicateForm;
      readonly predicate: CompiledPredicate;
      /** The predicate as authored. Carried so vacuity can project onto the coordinates it reads (V41). */
      readonly raw: Predicate;
    }
  | { readonly on: "whole-space"; readonly form: "deadend" }
  | {
      readonly on: "transition"; readonly form: "transition-live";
      readonly selector: TransitionSelector;
      readonly matches: (step: Step) => boolean;
    };

/**
 * What a licensed behavioural question gets to use.
 *
 * `compiled` is the compiled configuration space — admission already had to build it to know
 * whether the system was explorable at all, so handing it on is what stops the evaluator compiling
 * a second time from the same declarations. `options` carries the state limit and the `avoid`
 * predicate; the per-form STOP condition stays the evaluator's, because stopping early is a search
 * strategy and not a licensing decision.
 */
export interface BehaviorPlan {
  readonly query: BehaviorQuery;
  readonly interpretedAs: string;
  readonly compiled: CompiledSystem;
  readonly options: ExploreOptions;
  readonly subject: BehaviorSubject;
}

/**
 * Admit one behavioural question: the quantifier pairing, the system's explorability, and every
 * field the chosen form requires — decided before a single configuration is walked.
 *
 * The function `check` calls and `runBehaviorQuery` calls first (`DESIGN-model-query-261002.md`
 * §5.2). `evaluateBehavior` below is not exported, so the only route into evaluation is through the
 * admission.
 */
export function admitBehaviorQuery(
  system: CanonicalSystem, q: BehaviorQuery, quantifier: Quantifier, systemHash: string,
): Admission<BehaviorPlan> {
  const interpretedAs = interpretation(q);

  const expected = NATURAL_QUANTIFIER[q.form];
  if (quantifier !== expected) {
    const other = q.form === "invariant" ? "reach" : "invariant";
    return refused(unlicensed(systemHash,
      `form '${q.form}' is ${expected === "exists" ? "existential" : "universal"}: it is ` +
      `established by ${expected === "exists" ? "a witness, and refuted by exhaustive absence" :
        "exhaustive satisfaction, and refuted by a counterexample"}. Declared quantifier ` +
      `'${quantifier}' asks for the other kind of evidence entirely, so the engine will not ` +
      `reinterpret it. Use quantifier: ${expected}, or form: ${other}.`,
      interpretedAs, detail("quantifier-mismatch")));
  }

  const compiled = compileSystem(system);
  // A system the engine cannot explore — a reserved feature, an unsupported expression, an id that
  // resolves to nothing — refuses with the cause the compiler named, structured where it knew it.
  if (!compiled.ok) return refused(unlicensed(systemHash, compiled.refusal, interpretedAs, compiled.detail));
  const scope = compiled.value.scope;

  const avoid = compileOptional(scope, q.avoid);
  if (!avoid.ok) return refused(unlicensed(systemHash, `avoid: ${avoid.refusal}`, interpretedAs, avoid.detail));

  const limit = q.limit ?? DEFAULT_STATE_LIMIT;
  const options: ExploreOptions = { ...defaultOptions(limit), avoid: avoid.value };
  const plan = (subject: BehaviorSubject): Admission<BehaviorPlan> =>
    ({ admitted: true, plan: { query: q, interpretedAs, compiled: compiled.value, options, subject } });

  /** The `target`/`predicate` rung: the field the form requires, compiled against this system. */
  const onPredicate = (
    form: PredicateForm, field: "target" | "predicate", raw: Predicate | null,
  ): Admission<BehaviorPlan> => {
    if (raw === null) {
      return refused(unlicensed(systemHash,
        `a '${form}' query must carry a '${field}' predicate.`, interpretedAs));
    }
    // The sentence gains the field prefix; the TYPED cause passes through untouched. Dropping
    // `detail` here is how the capstone's charge-remaining refusal shipped `unknown-vocabulary`
    // with empty arrays while its prose named the declared omission and two models.
    const compiledPredicate = compilePredicate(scope, raw);
    if (!compiledPredicate.ok) {
      return refused(unlicensed(
        systemHash, `${field}: ${compiledPredicate.refusal}`, interpretedAs, compiledPredicate.detail));
    }
    return plan({ on: "configurations", form, predicate: compiledPredicate.value, raw });
  };

  switch (q.form) {
    case "reach":
    case "recurrence":
    case "repeatable-cycle":
      return onPredicate(q.form, "target", q.target);
    case "invariant":
      return onPredicate(q.form, "predicate", q.predicate);
    case "deadend":
      return plan({ on: "whole-space", form: q.form });
    case "transition-live": {
      const selector = q.transition;
      if (selector === null || (selector.machine === null && selector.from === null
        && selector.to === null && selector.sync === null)) {
        return refused(unlicensed(systemHash,
          "a 'transition-live' query must name the transition it is about, by machine, from, to " +
          "or sync.", interpretedAs));
      }
      if (!declaresMatching(system, selector)) {
        // Not `refuted`: refuting would claim the transition is never executable, when in fact the
        // model declares no such transition for the claim to be about.
        //
        // And when a PURPOSE says the distinction was deliberately left out, say so. The graph path
        // has done this through `undeclared()` since it shipped; this path said only "not about
        // this model's vocabulary", which reads to a student as a weak engine rather than as a
        // modelling decision. Same sentence structure as `undeclared()`: the structural clause is
        // kept verbatim and the omission is APPENDED, because both facts are true and a reader
        // needs both — the selector matches nothing, AND that is a choice with a place to go.
        const need = describeSelector(selector);
        const omitted = omissionCovering(system, need);
        if (omitted !== null) {
          // Same sentence as the graph path, from the one place it is worded; only the WRAPPER
          // differs -- that path returns a Fail, this one a Verdict through `unlicensed`.
          const said = omissionProse(`no declared transition matches ${need}`, omitted);
          return refused(unlicensed(systemHash, said.prose, interpretedAs,
            detail("missing-distinction", said.missing, said.models)));
        }
        return refused(unlicensed(systemHash,
          `no declared transition matches ${need}. The question is not ` +
          `about this model's vocabulary.`,
          interpretedAs, detail("unknown-vocabulary", [need])));
      }
      return plan({
        on: "transition", form: q.form, selector,
        matches: (step: Step): boolean => stepMatches(scope, selector, step),
      });
    }
  }
}

/**
 * Evaluate one behavioural query: admit, then walk.
 *
 * Two statements, and the walk is unreachable for a question the admission declined — MQ-I1 on this
 * path, held by the call graph rather than by a brand (§5.2: there is no second caller for a brand
 * to defend against, because `evaluateBehavior` has no second caller at all).
 */
export function runBehaviorQuery(
  system: CanonicalSystem, q: BehaviorQuery, quantifier: Quantifier, systemHash: string,
): Verdict {
  const admission = admitBehaviorQuery(system, q, quantifier, systemHash);
  return admission.admitted ? evaluateBehavior(admission.plan, systemHash) : admission.verdict;
}

/** NOT exported: the only route in is `runBehaviorQuery`, which admits first. */
function evaluateBehavior(p: BehaviorPlan, systemHash: string): Verdict {
  const { compiled, options: base, interpretedAs, subject } = p;

  switch (subject.on) {
    case "configurations": {
      const target = subject.predicate;
      switch (subject.form) {
        case "reach": {
          const space = exploreSpace(compiled, { ...base, stopAtConfig: target });
          const at = space.hit?.kind === "config" ? space.hit.config : null;
          if (at !== null) {
            return settled(space, systemHash, interpretedAs, "holds", trace(traceTo(space, at), "witness"));
          }
          return unsettled(space, systemHash, interpretedAs, "refuted", vacuityOf(p, target, "reach"));
        }

        case "invariant": {
          const violates: CompiledPredicate = (cfg) => !target(cfg);
          const space = exploreSpace(compiled, { ...base, stopAtConfig: violates });
          const at = space.hit?.kind === "config" ? space.hit.config : null;
          if (at !== null) {
            // A counterexample refutes a universal claim on its own evidence.
            return settled(space, systemHash, interpretedAs, "refuted",
              trace(traceTo(space, at), "counterexample"));
          }
          return unsettled(space, systemHash, interpretedAs, "holds",
            vacuityOf(p, violates, "invariant"));
        }

        case "repeatable-cycle":
          return repeatableCycle(exploreSpace(compiled, base), target, systemHash, interpretedAs,
            vacuityOf(p, target, "repeatable-cycle"));
        case "recurrence":
          return recurrence(exploreSpace(compiled, base), target, systemHash, interpretedAs,
            vacuityOf(p, target, "recurrence"));
      }
    }

    case "whole-space": {
      const space = exploreSpace(compiled, { ...base, stopAtDeadEnd: true });
      const at = space.deadEnds[0];
      if (at !== undefined) {
        return settled(space, systemHash, interpretedAs, "holds", trace(traceTo(space, at), "witness"));
      }
      return unsettled(space, systemHash, interpretedAs, "refuted");
    }

    case "transition": {
      const space = exploreSpace(compiled, { ...base, stopAtEdge: subject.matches });
      const hit = space.hit;
      if (hit?.kind === "edge" && hit.edge !== null) {
        const steps = [...traceTo(space, hit.config), hit.edge.step];
        return settled(space, systemHash, interpretedAs, "holds", trace(steps, "witness"));
      }
      return unsettled(space, systemHash, interpretedAs, "refuted");
    }
  }
}

// --------------------------------------------------------------------------------------------

function compileOptional(scope: RefScope, pred: Predicate | null): { ok: true; value: CompiledPredicate | null } | Fail {
  if (pred === null) return { ok: true, value: null };
  const compiled = compilePredicate(scope, pred);
  return compiled.ok ? { ok: true, value: compiled.value } : compiled;
}

/** Evidence settles the claim: coverage is exhaustive with respect to the question (see the header). */
function settled(
  space: StateSpace, systemHash: string, interpretedAs: string,
  outcome: "holds" | "refuted", evidence: Evidence,
): Verdict {
  return verdict(result({
    outcome, coverage: exhaustive(space.statesExplored), systemHash, evidence, interpretedAs,
    compilation: asCompilation(space.notes),
  }));
}

/**
 * No settling evidence. A complete walk gives the exhaustive answer; a truncated one gives
 * `inconclusive` under BOUNDED coverage, which is V22 and must never be rendered as "no".
 */
function unsettled(
  space: StateSpace, systemHash: string, interpretedAs: string, exhaustiveOutcome: "holds" | "refuted",
  disclosures: readonly Compilation[] = [],
): Verdict {
  if (space.stopReason === "state-limit") {
    return verdict(result({
      outcome: "inconclusive",
      coverage: bounded(space.statesExplored, "state-limit"),
      systemHash, interpretedAs,
      // The vacuity disclosure rides along under a bound too. Unsatisfiability is a fact about the
      // predicate, so the truncation cannot weaken it — and a predicate no configuration can satisfy
      // is the better finding of the two.
      compilation: [...asCompilation([
        ...space.notes,
        `Exploration stopped at the ${space.statesExplored}-configuration limit with work ` +
        `outstanding, so the answer covers only the explored region. The sound statement is ` +
        `"not within the explored region", never "not at all".`,
      ]), ...disclosures],
    }));
  }
  return verdict(result({
    outcome: exhaustiveOutcome, coverage: exhaustive(space.statesExplored), systemHash, interpretedAs,
    compilation: [...asCompilation(space.notes), ...disclosures],
  }));
}

/**
 * Recurrence, in two passes.
 *
 * A true lasso is a prefix plus a cycle back to the SAME configuration, and that is tried first.
 * `recurrence` means exactly ONE thing: the target is RE-ENTERED. A target configuration, at least
 * one step, another target configuration. Nothing more.
 *
 * It deliberately does NOT look for a true repeated configuration first and fall back to re-entry.
 * That earlier design let the same query mean different things depending on what the search happened
 * to find, which is a search strategy masquerading as a denotation. Ruled 261002: "queries should
 * denote questions, not search strategies."
 *
 * "Can it loop indefinitely?" is a different and sharper engineering question than "can it come
 * back", so it is a different form: `repeatable-cycle`, below. The retry example — where returning to
 * `waiting` advances `retry_count`, so no configuration ever repeats — therefore answers `holds` for
 * `recurrence` and `refuted` for `repeatable-cycle`, which is the honest pair of answers.
 */
function recurrence(
  space: StateSpace, target: CompiledPredicate, systemHash: string, interpretedAs: string,
  disclosures: readonly Compilation[] = [],
): Verdict {
  const hits: number[] = [];
  space.configs.forEach((cfg, i) => {
    if (target(cfg)) hits.push(i);
  });

  let best: { readonly at: number; readonly segment: readonly Step[] } | null = null;
  for (const from of hits) {
    for (const to of hits) {
      const segment = pathBetween(space, from, to);
      if (segment === null || segment.length === 0) continue;
      if (best === null || segment.length < best.segment.length) best = { at: from, segment };
    }
  }
  if (best !== null) {
    // The reported `cycle` is the target-to-target segment. That IS the answer to the question
    // asked, so there is nothing to disclose — a disclosure here would be apologising for giving
    // the right answer.
    return settled(space, systemHash, interpretedAs, "holds",
      lasso(traceTo(space, best.at), best.segment));
  }
  return unsettled(space, systemHash, interpretedAs, "refuted", disclosures);
}

/**
 * `repeatable-cycle` — is there an execution that can repeat forever from the target?
 *
 * This is the strict reading: a genuinely repeated CONFIGURATION, which is what makes a cycle
 * actually repeatable. A loop whose bounded variable strictly advances is not one, and answers
 * `refuted` here while `recurrence` answers `holds` — the two forms exist precisely so those two
 * questions have different names.
 *
 * Same distinction as the path-aggregation rule: a positive repeatable cycle makes an additive
 * maximum unbounded, and a strictly-advancing loop does not.
 */
function repeatableCycle(
  space: StateSpace, target: CompiledPredicate, systemHash: string, interpretedAs: string,
  disclosures: readonly Compilation[] = [],
): Verdict {
  for (let i = 0; i < space.configs.length; i += 1) {
    const cfg = space.configs[i];
    if (cfg === undefined || !target(cfg)) continue;
    const cycle = cycleThrough(space, i);
    if (cycle !== null) {
      return settled(space, systemHash, interpretedAs, "holds", lasso(traceTo(space, i), cycle));
    }
  }
  return unsettled(space, systemHash, interpretedAs, "refuted", disclosures);
}

// --------------------------------------------------------------------------------------------
// Transition selection
// --------------------------------------------------------------------------------------------

function declaresMatching(system: CanonicalSystem, sel: TransitionSelector): boolean {
  for (const m of system.machines.values()) {
    if (sel.machine !== null && m.id !== sel.machine) continue;
    for (const t of m.transitions) {
      if (sel.from !== null && t.from !== sel.from) continue;
      if (sel.to !== null && t.to !== sel.to) continue;
      if (sel.sync !== null && t.sync !== sel.sync) continue;
      return true;
    }
  }
  return false;
}

/**
 * Whether a step executed the selected transition.
 *
 * Matched from the step alone: which instances moved, what their control state was before and
 * after, and which event (if any) fired. For a multiply-instantiated machine, ANY of its instances
 * taking the transition makes the transition live — occupancy, not binding (V14).
 */
function stepMatches(scope: RefScope, sel: TransitionSelector, step: Step): boolean {
  if (sel.sync !== null && step.sync !== sel.sync) return false;
  const movers = sel.machine === null
    ? step.instances
    : step.instances.filter((id) => scope.instances.get(id)?.machine === sel.machine);
  if (movers.length === 0) return false;
  return movers.some((id) => {
    const before = step.from.control.get(id);
    const after = step.to.control.get(id);
    if (sel.from !== null && before !== sel.from) return false;
    if (sel.to !== null && after !== sel.to) return false;
    return true;
  });
}

function describeSelector(sel: TransitionSelector): string {
  const parts: string[] = [];
  if (sel.machine !== null) parts.push(`machine ${sel.machine}`);
  if (sel.from !== null) parts.push(`from ${sel.from}`);
  if (sel.to !== null) parts.push(`to ${sel.to}`);
  if (sel.sync !== null) parts.push(`sync ${sel.sync}`);
  return parts.length === 0 ? "any transition" : parts.join(", ");
}

/** The question actually evaluated, in plain language (V21) and non-visually (FR-A11Y-2). */
export function interpretation(q: BehaviorQuery): string {
  const avoiding = q.avoid === null ? "" : `, without ever passing through a configuration where ${describePredicate(q.avoid)}`;
  switch (q.form) {
    case "repeatable-cycle":
      return `Does there exist an execution that reaches a configuration where ` +
        `${q.target === null ? "(no target given)" : describePredicate(q.target)}` +
        ` and can then repeat that configuration forever` +
        `${avoiding}? (A loop that advances a bounded variable is NOT repeatable; ` +
        `ask 'recurrence' for whether the state is merely re-entered.)`;
    case "reach":
      return `Does there exist an execution reaching a configuration where ` +
        `${q.target === null ? "the target holds" : describePredicate(q.target)}${avoiding}?`;
    case "invariant":
      return `Does every reachable configuration satisfy ` +
        `${q.predicate === null ? "the predicate" : describePredicate(q.predicate)}${avoiding}?`;
    case "recurrence":
      return `Can the system re-enter a configuration where ` +
        `${q.target === null ? "the target holds" : describePredicate(q.target)}${avoiding}?`;
    case "deadend":
      return `Is there a reachable configuration with no enabled step${avoiding}?`;
    case "transition-live":
      return `Is ${q.transition === null ? "the named transition" : describeSelector(q.transition)} ` +
        `executable in some reachable configuration${avoiding}?`;
  }
}
