/**
 * The walkthrough's interactive rendering — the BUILT half of `walkthrough.ts`.
 *
 * Every fact a step shows is computed here through the workbench's own seams, at the moment the
 * student acts:
 *
 *   - diagrams and budgets come from `renderView` / `renderBudgetView` via the shared Learn
 *     figures (`dom.ts`), which reuse the workbench's DOM binders;
 *   - outcomes, coverage, evidence and magnitudes come from running the example's own SAVED
 *     questions through `runSaved` — the page cannot show a verdict the engine stopped producing;
 *   - the what-if steps drive a real `Workspace` through `openHypothesis` / `discardHypothesis`
 *     with the fixture's declared modification, which is the same drive `test/examples.test.ts`
 *     performs — a flip shown here is a flip the engine computed just now, not a quote;
 *   - the agent step reads the capability registry, so the operations it names are the ones the
 *     parity gate holds.
 *
 * The walkthrough EMBEDS the model views rather than linking into the Workspace page. That is a
 * ruled decision, not a shortcut: the Workspace has no routable state to link into, and the
 * walkthrough renders through the same exported seams the Workspace binds (`renderView`,
 * `paintDiagram`, `Workspace`), so there is no second rendering or evaluation path to diverge —
 * the uniformity is held by the imports, which the import-graph gate checks.
 */
import type { CanonicalSystem, Coverage, Evidence, QueryResult } from "../ir/types.ts";
import { runQuery } from "../engine/index.ts";
import { BINDINGS, MODEL_TYPES } from "../engine/model-types.ts";
import { renderView } from "../render/index.ts";
import type { AccessibleNode } from "../render/types.ts";
import { Workspace, type Ports } from "../app/services.ts";
import { CAPABILITIES } from "../app/capabilities.ts";
import type { ShippedExampleId } from "../app/examples.ts";
import { declaredUnitOf, quantityRows, savedStatements, type LoadedSystems } from "./content.ts";
import type { LoadedFixtures, FixtureModification } from "./fixtures.ts";
import { magnitudeText, runSaved } from "./questions.ts";
import {
  bulletList, el, liveBudget, liveFigure, pairsList, rowsTable,
} from "./dom.ts";
import {
  LESSON, REFERENCE_ANCHOR, WALKTHROUGH_STEPS, WALK_DP, WALK_ESN, WALK_TW,
  type WalkStep,
} from "./walkthrough.ts";

export interface WalkthroughDeps {
  readonly systems: LoadedSystems;
  /** Raw YAML text per example — what a what-if step loads into its own Workspace. */
  readonly texts: ReadonlyMap<ShippedExampleId, string>;
  readonly fixtures: LoadedFixtures;
}

// --------------------------------------------------------------------------------------------
// Small readers
// --------------------------------------------------------------------------------------------

const must = <T>(value: T | undefined | null, what: string): T => {
  if (value === undefined || value === null) throw new Error(`walkthrough: ${what}`);
  return value;
};

const systemOf = (deps: WalkthroughDeps, id: ShippedExampleId): CanonicalSystem =>
  must(deps.systems.get(id), `example '${id}' is not loaded`);

/** A purpose's question, read defensively: the IR admits a model that states none. */
const questionOf = (purpose: { readonly question: string | null }): string =>
  purpose.question?.trim() ?? "(no stated question)";

/** A saved question's authored name, or its id — one spelling for every step that shows one. */
const nameOf = (system: CanonicalSystem, id: string): string =>
  savedStatements(system, kindOfSaved(system, id)).find((s) => s.id === id)?.label ?? id;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const kindOfSaved = (system: CanonicalSystem, id: string): "graph" | "behavior" | "quantity" => {
  const raw: unknown = system.queries.get(id)?.raw;
  const kind = isObject(raw) ? raw["kind"] : undefined;
  return kind === "graph" || kind === "quantity" ? kind : "behavior";
};

const mustRun = (system: CanonicalSystem, id: string): QueryResult =>
  must(runSaved(system, id), `saved question '${id}' is not declared`);

const coveragePhrase = (coverage: Coverage): string =>
  coverage.kind === "not-applicable"
    ? "coverage not applicable"
    : `${coverage.kind} over ${coverage.statesExplored} configuration${coverage.statesExplored === 1 ? "" : "s"}`;

/** An outcome, with `unlicensed` shown under the name the interface uses for it. */
const outcomeWord = (result: QueryResult): string =>
  result.outcome === "unlicensed" ? "NOT ANSWERABLE" : result.outcome;

const evidencePhrase = (evidence: Evidence | null): string =>
  evidence === null
    ? "no evidence — the claim has no single configuration to point at"
    : `${evidence.role}: a ${evidence.shape} of ${evidence.steps.length} step${evidence.steps.length === 1 ? "" : "s"}`;

/** The legend's reading of a relation-type id — `hands_to` prints as "hands to" (render layer's rule). */
const legendSpelling = (id: string): string => id.replace(/[_-]+/g, " ").trim();

/**
 * A Workspace over one shipped example, for the steps that open a what-if branch.
 *
 * The ports are the same bindings the Workspace page's composition root makes: the synchronous
 * in-process engine and the real renderer. The analysis port fails loud — the walkthrough runs no
 * long exploration, and a stub that pretended to would report an empty space as a finding.
 */
function learnWorkspace(text: string): Workspace {
  const noAnalysis = (): never => {
    throw new Error("the Learn walkthrough does not run background analyses");
  };
  const ports: Ports = {
    engine: {
      graphQuery: (system, query) => runQuery(system, query).result,
      behaviorQuery: (system, query) => runQuery(system, query).result,
      explore: () => ({ configurations: [], exhaustive: false }),
    },
    analysis: { explore: noAnalysis, evaluateQuestion: noAnalysis, inFlight: () => [], cancel: () => {} },
    render: { render: (system, request) => renderView(system, request) },
  };
  const ws = new Workspace(ports);
  const loaded = ws.load(text);
  if (!loaded.ok) throw new Error("a shipped example failed to load into the walkthrough workspace");
  return ws;
}

const modificationOf = (
  deps: WalkthroughDeps, example: ShippedExampleId, id: string,
): FixtureModification =>
  must(
    deps.fixtures.get(example)?.modifications.find((m) => m.id === id),
    `example '${example}' declares no modification '${id}'`,
  );

/** The fixture modification as the hypothesis transaction the service seam takes. */
const hypothesisOf = (ws: Workspace, mod: FixtureModification): unknown => ({
  transaction: {
    base: ws.state.hash,
    ...(mod.rationale === null ? {} : { rationale: mod.rationale }),
    operations: mod.operations,
  },
});

// --------------------------------------------------------------------------------------------
// Page furniture
// --------------------------------------------------------------------------------------------

const button = (label: string, onClick: () => void): HTMLButtonElement => {
  const b = el("button", label, "walk-run");
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
};

/** A step's observable-consequence line. A live region, because buttons rewrite it. */
const outcomeLine = (initial: string): HTMLElement => {
  const p = el("p", initial, "walk-outcome");
  p.setAttribute("aria-live", "polite");
  return p;
};

export function renderLesson(): HTMLElement {
  const section = el("section");
  section.id = LESSON.anchor;
  const h = el("h2", LESSON.heading);
  h.id = `${LESSON.anchor}-h`;
  section.setAttribute("aria-labelledby", h.id);
  section.append(h);
  for (const p of LESSON.paragraphs) section.append(el("p", p));

  // The one graphic: a labelled flow, plain text so assistive technology reads the same four words.
  const flow = el("p", undefined, "lesson-flow");
  LESSON.flow.forEach((term, i) => {
    if (i > 0) flow.append(el("span", "→", "lesson-flow-arrow"));
    flow.append(el("span", term, "lesson-flow-term"));
  });
  section.append(flow);

  const start = el("p");
  const a = el("a", "Start the walkthrough →", "walk-start");
  a.href = `#${must(WALKTHROUGH_STEPS[0], "no steps").anchor}`;
  start.append(a);
  section.append(start);
  return section;
}

export function renderWalkthroughNav(): HTMLElement {
  const nav = el("nav");
  nav.setAttribute("aria-label", "Walkthrough");
  const list = el("ol", undefined, "walk-cards");
  WALKTHROUGH_STEPS.forEach((step, i) => {
    const li = el("li", undefined, "walk-card");
    const a = el("a");
    a.href = `#${step.anchor}`;
    a.append(el("span", `${i + 1}. ${step.title}`, "walk-card-title"));
    li.append(a);
    list.append(li);
  });
  nav.append(list);
  return nav;
}

function stepSection(step: WalkStep, index: number, body: readonly Node[]): HTMLElement {
  const section = el("section");
  section.id = step.anchor;
  const h = el("h2", `${index + 1}. ${step.title}`);
  h.id = `${step.anchor}-h`;
  section.setAttribute("aria-labelledby", h.id);
  section.append(h, el("p", step.definition, "walk-define"));
  if (step.instruction !== null) section.append(el("p", step.instruction, "walk-do"));
  section.append(...body);

  const links = el("p", undefined, "walk-links");
  const next = WALKTHROUGH_STEPS[index + 1];
  const forward = el("a", next === undefined
    ? "Done — on to the reference material →"
    : `Next: ${next.title} →`, "walk-next");
  forward.href = `#${next === undefined ? REFERENCE_ANCHOR : next.anchor}`;
  links.append(forward);
  for (const m of step.more) {
    const a = el("a", `${m.label} ▸`, "walk-more");
    a.href = `#${m.anchor}`;
    links.append(a);
  }
  section.append(links);
  return section;
}

// --------------------------------------------------------------------------------------------
// The steps
// --------------------------------------------------------------------------------------------

export function renderWalkthroughSteps(deps: WalkthroughDeps): readonly HTMLElement[] {
  const builders: readonly ((step: WalkStep) => readonly Node[])[] = [
    (s) => stepEntities(deps, s),
    (s) => stepRelationships(deps, s),
    (s) => stepPurpose(deps, s),
    (s) => stepStateMachines(deps, s),
    (s) => stepQuestions(deps, s),
    (s) => stepEvidence(deps, s),
    (s) => stepProperties(deps, s),
    (s) => stepRequirements(deps, s),
    (s) => stepChanges(deps, s),
    (s) => stepQuantities(deps, s),
    (s) => stepQuantitativeQuestions(deps, s),
    (s) => stepMultipleModels(deps, s),
    (s) => stepBindings(deps, s),
    (s) => stepComposition(deps, s),
    (s) => stepBoundaries(deps, s),
    () => stepAgents(),
  ];
  if (builders.length !== WALKTHROUGH_STEPS.length) {
    throw new Error("every declared walkthrough step needs a builder");
  }
  return WALKTHROUGH_STEPS.map((step, i) =>
    stepSection(step, i, must(builders[i], `no builder for step ${i + 1}`)(step)));
}

const groundingModel = (step: WalkStep): string =>
  must(
    step.grounding.find((g): g is Extract<typeof g, { kind: "model" }> => g.kind === "model"),
    `step '${step.anchor}' grounds no model`,
  ).model;

const groundingMachine = (step: WalkStep): string =>
  must(
    step.grounding.find((g): g is Extract<typeof g, { kind: "machine" }> => g.kind === "machine"),
    `step '${step.anchor}' grounds no machine`,
  ).machine;

const groundingQueries = (step: WalkStep): readonly { example: ShippedExampleId; query: string }[] =>
  step.grounding.flatMap((g) => (g.kind === "query" ? [{ example: g.example, query: g.query }] : []));

const groundingModification = (step: WalkStep): { example: ShippedExampleId; modification: string } =>
  must(
    step.grounding.flatMap((g) => (g.kind === "modification" ? [g] : []))[0],
    `step '${step.anchor}' grounds no modification`,
  );

function stepEntities(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const system = systemOf(deps, WALK_TW);
  const modelId = groundingModel(step);
  const out = outcomeLine("Nothing selected yet.");
  const fig = liveFigure(system, { kind: "model", id: modelId },
    `model '${modelId}' from “${system.name}”, drawn by the workbench's renderer.`, {
      onSelect: (node: AccessibleNode | null) => {
        out.textContent = node === null ? "Nothing selected yet." : `Selected: ${node.description}`;
      },
    });
  return [fig.root, button("Select Transaction Engine", () => fig.select("transaction-engine")), out];
}

function stepRelationships(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const system = systemOf(deps, WALK_TW);
  const modelId = groundingModel(step);
  const relations = system.relations.filter((r) => r.model === modelId);
  const entityLabel = (id: string): string => system.entities.get(id)?.label ?? id;

  const label = el("label", "Relationship");
  const picker = el("select");
  picker.id = "walk-relationship-picker";
  label.htmlFor = picker.id;
  relations.forEach((r, i) => {
    const opt = el("option",
      `${entityLabel(r.from)} — ${legendSpelling(r.type)} → ${entityLabel(r.to)}`);
    opt.value = String(i);
    picker.append(opt);
  });

  const out = outcomeLine("");
  const describe = (): void => {
    const r = relations[Number(picker.value)];
    if (r === undefined) { out.textContent = ""; return; }
    const type = system.relationTypes.get(r.type);
    out.textContent = type === undefined
      ? `'${r.type}' — no declared relation type.`
      : `${legendSpelling(r.type)}: ${type.description}`
        + (type.absence === null ? "" : ` Absence means: ${type.absence}`);
  };
  picker.addEventListener("change", describe);
  describe();

  const controls = el("p", undefined, "learn-figure-controls");
  controls.append(label, picker);
  return [
    el("p", "The diagram in step 1 draws each relationship type with its own arrowhead; the key "
      + "under “Text view of this diagram” names them.", "intro"),
    controls, out,
  ];
}

function stepPurpose(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const system = systemOf(deps, WALK_TW);
  const model = must(system.models.get(groundingModel(step)), "change-pipeline is not declared");
  const q = el("p");
  q.append(el("strong", "The question this model answers: "),
    document.createTextNode(questionOf(model.purpose)));

  const represents = el("details");
  represents.append(el("summary", "What this model represents"), bulletList(model.purpose.represents));
  const omits = el("details");
  omits.append(el("summary", "What this model deliberately omits"), bulletList(model.purpose.omits));
  const after = el("p", "Every question the walkthrough asks of this model draws only on what it "
    + "preserves. The omitted facts are what the next model exists for.", "intro");
  return [q, represents, omits, after];
}

function stepStateMachines(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const system = systemOf(deps, WALK_TW);
  const machineId = groundingMachine(step);
  const machine = must(system.machines.get(machineId), `machine '${machineId}' is not declared`);

  const out = outcomeLine("No state selected yet.");
  const transitionPhrase = (t: (typeof machine.transitions)[number]): string => {
    const guard = t.guards.map((g) => ` (requires ${g.ref} ${g.op} ${String(g.value)})`).join("");
    return `${t.label ?? t.sync ?? `${t.from}→${t.to}`}${guard}`;
  };
  const fig = liveFigure(system, { kind: "machine", id: machineId },
    `state machine '${machineId}' from “${system.name}”.`, {
      onSelect: (node: AccessibleNode | null) => {
        if (node === null || !machine.states.includes(node.id)) {
          out.textContent = "No state selected yet.";
          return;
        }
        const incoming = machine.transitions.filter((t) => t.to === node.id && t.from !== node.id);
        const outgoing = machine.transitions.filter((t) => t.from === node.id);
        out.textContent = `'${node.id}' — in: `
          + (incoming.length === 0 ? "none" : incoming.map((t) => `${transitionPhrase(t)} from ${t.from}`).join("; "))
          + ". Out: "
          + (outgoing.length === 0 ? "none — a terminal state" : outgoing.map((t) => `${transitionPhrase(t)} to ${t.to}`).join("; "))
          + ".";
      },
    });
  return [fig.root, button("Select “valid”", () => fig.select("valid")), out];
}

function stepQuestions(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const system = systemOf(deps, WALK_TW);
  const { query } = must(groundingQueries(step)[0], "step 5 grounds no query");
  const out = outcomeLine("Not run yet.");
  const run = button(`Run: “${nameOf(system, query)}”`, () => {
    const result = mustRun(system, query);
    out.textContent = `Outcome: ${outcomeWord(result)} — ${coveragePhrase(result.coverage)}.`;
  });
  return [el("p", `This example saves the question “${nameOf(system, query)}”.`, "intro"), run, out];
}

function stepEvidence(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const system = systemOf(deps, WALK_TW);
  const { query } = must(groundingQueries(step)[0], "step 6 grounds no query");
  const machineId = groundingMachine(step);
  const out = outcomeLine("Not run yet.");
  const fig = liveFigure(system, { kind: "machine", id: machineId },
    `the same state machine; running the question draws its witness as numbered steps.`);
  const run = button("Show the witness", () => {
    const result = mustRun(system, query);
    fig.update(system, {
      evidence: result.evidence, outcome: result.outcome, coverage: result.coverage,
    });
    out.textContent = `${outcomeWord(result)} — ${evidencePhrase(result.evidence)}. `
      + "The steps are numbered on the diagram; the text view lists the same steps.";
  });
  return [fig.root, run, out];
}

function stepProperties(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  void step;
  const system = systemOf(deps, WALK_TW);
  const ids = [...system.queries.keys()];

  const label = el("label", "Property");
  const picker = el("select");
  picker.id = "walk-property-picker";
  label.htmlFor = picker.id;
  for (const id of ids) {
    const opt = el("option", nameOf(system, id));
    opt.value = id;
    picker.append(opt);
  }
  const out = outcomeLine("");
  const show = (): void => {
    const id = picker.value;
    if (!system.queries.has(id)) { out.textContent = ""; return; }
    const result = mustRun(system, id);
    out.textContent = `${outcomeWord(result)} — ${coveragePhrase(result.coverage)}; ${evidencePhrase(result.evidence)}.`;
  };
  picker.addEventListener("change", show);
  show();
  const controls = el("p", undefined, "learn-figure-controls");
  controls.append(label, picker);
  return [
    el("p", `“${systemOf(deps, WALK_TW).name}” saves ${ids.length} properties. Each result below is `
      + "computed now, against the model as loaded.", "intro"),
    controls, out,
  ];
}

function stepRequirements(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  void step;
  const system = systemOf(deps, WALK_TW);
  const fixture = must(deps.fixtures.get(WALK_TW), "no fixture for transaction-workspace");
  const rows = fixture.requirements.map((r) => {
    const live = r.expressedAs === null ? null : mustRun(system, r.expressedAs);
    return [
      r.statement.trim(),
      r.expressedAs === null ? "—" : nameOf(system, r.expressedAs),
      r.satisfiedWhen ?? "—",
      live === null ? "—" : outcomeWord(live),
      r.status,
    ];
  });
  return [
    rowsTable(["Requirement", "Decided by", "Satisfied when", "Current outcome", "Recorded status"], rows),
    el("p", "The first requirement forbids something, so its deciding question states the breach "
      + "and the requirement is satisfied while that question is refuted. The second states an "
      + "obligation directly and is satisfied while its question holds.", "intro"),
  ];
}

function stepChanges(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const base = systemOf(deps, WALK_TW);
  const machineId = groundingMachine(step);
  const { modification } = groundingModification(step);
  const mod = modificationOf(deps, WALK_TW, modification);
  const watched = mod.changes.map((c) => c.query);

  const fig = liveFigure(base, { kind: "machine", id: machineId },
    `the lifecycle again; applying the change adds the shortcut edge to the drawing.`);
  const out = outcomeLine("");
  let ws: Workspace | null = null;

  const report = (system: CanonicalSystem, note: string): void => {
    const verdicts = watched.map((q) => `“${nameOf(base, q)}”: ${outcomeWord(mustRun(system, q))}`);
    out.textContent = `${note} ${verdicts.join(". ")}.`;
  };
  report(base, "Before any change —");

  const apply = button(`Apply: ${mod.label}`, () => {
    ws ??= learnWorkspace(must(deps.texts.get(WALK_TW), "no source text for transaction-workspace"));
    if (ws.state.hypothesis !== null) return;
    const opened = ws.openHypothesis(mod.label, hypothesisOf(ws, mod));
    if (!opened.ok) {
      out.textContent = "The change was rejected: "
        + opened.findings.map((f) => f.message).join("; ");
      return;
    }
    fig.update(ws.state.system);
    report(ws.state.system, "With the shortcut applied, the same saved questions re-evaluate —");
  });
  const discard = button("Discard the change", () => {
    if (ws === null || !ws.discardHypothesis()) return;
    fig.update(ws.state.system);
    report(ws.state.system, "Discarded. The model is back as it was —");
  });
  const controls = el("p", undefined, "walk-buttons");
  controls.append(apply, discard);
  return [fig.root, controls, out];
}

function stepQuantities(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  void step;
  const system = systemOf(deps, WALK_ESN);
  const budget = liveBudget(system, "memory",
    `the memory budget of “${system.name}”, drawn by the workbench's quantitative projection.`);
  const rows = quantityRows(system);
  const ceiling = rows.find((r) => r.target.startsWith("model:"));
  const all = el("details");
  all.append(el("summary", "Every quantity the example declares, as written"),
    rowsTable(["Quantity", "Annotates", "Dimension", "Declared value"],
      rows.map((q) => [q.id, q.target, q.dimension, q.value])));
  return [
    budget.root,
    el("p", ceiling === undefined
      ? "This example declares no model-level ceiling."
      : `The declared ceiling: ${ceiling.id} — ${ceiling.value}, written against the model itself. `
        + "The other quantities annotate individual allocations.", "intro"),
    all,
  ];
}

function stepQuantitativeQuestions(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const base = systemOf(deps, WALK_ESN);
  const { query } = must(groundingQueries(step)[0], "step 11 grounds no query");
  const { modification } = groundingModification(step);
  const mod = modificationOf(deps, WALK_ESN, modification);

  const budget = liveBudget(base, "memory", `the same budget; the bars move with the model.`);
  const out = outcomeLine("Not run yet.");
  let ws: Workspace | null = null;
  const current = (): CanonicalSystem => ws?.state.system ?? base;

  const runIt = (): void => {
    const system = current();
    const result = mustRun(system, query);
    const unit = declaredUnitOf(system, "sram-budget");
    out.textContent = `“${nameOf(base, query)}”: ${outcomeWord(result)} — computed total `
      + `${magnitudeText(result, unit)}.`;
  };
  const run = button(`Run: “${nameOf(base, query)}”`, runIt);
  const apply = button(`Apply: ${mod.label}`, () => {
    ws ??= learnWorkspace(must(deps.texts.get(WALK_ESN), "no source text for embedded-sensor-node"));
    if (ws.state.hypothesis !== null) return;
    const opened = ws.openHypothesis(mod.label, hypothesisOf(ws, mod));
    if (!opened.ok) {
      out.textContent = "The change was rejected: "
        + opened.findings.map((f) => f.message).join("; ");
      return;
    }
    budget.update(ws.state.system);
    runIt();
  });
  const discard = button("Discard the change", () => {
    if (ws === null || !ws.discardHypothesis()) return;
    budget.update(ws.state.system);
    runIt();
  });
  const controls = el("p", undefined, "walk-buttons");
  controls.append(run, apply, discard);
  return [budget.root, controls, out];
}

function stepMultipleModels(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  void step;
  const system = systemOf(deps, WALK_DP);
  const quantQuestion =
    MODEL_TYPES.find((t) => t.id === "quantitative-model")?.question ?? "what does an execution cost?";
  const options: readonly { readonly label: string; readonly question: string }[] = [
    ...[...system.models.values()].map((m) => ({
      label: `${m.label} — a structural model`, question: questionOf(m.purpose),
    })),
    ...[...system.machines.values()].map((m) => ({
      label: `${m.id} — a state machine`, question: questionOf(m.purpose),
    })),
    ...[...system.quantitativeModels.values()].map((q) => ({
      label: `${q.dimension} — a quantitative model`, question: quantQuestion,
    })),
  ];
  const label = el("label", "Model");
  const picker = el("select");
  picker.id = "walk-multi-model-picker";
  label.htmlFor = picker.id;
  options.forEach((o, i) => {
    const opt = el("option", o.label);
    opt.value = String(i);
    picker.append(opt);
  });
  const out = outcomeLine("");
  const show = (): void => {
    const o = options[Number(picker.value)];
    out.textContent = o === undefined ? "" : `Answers: ${o.question}`;
  };
  picker.addEventListener("change", show);
  show();
  const controls = el("p", undefined, "learn-figure-controls");
  controls.append(label, picker);
  return [
    el("p", `“${system.name}” declares ${options.length} purposeful models over one identity `
      + "namespace.", "intro"),
    controls, out,
  ];
}

function stepBindings(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const system = systemOf(deps, WALK_TW);
  const machineId = groundingMachine(step);
  const machine = must(system.machines.get(machineId), `machine '${machineId}' is not declared`);
  const entityId = must(machine.entity, `machine '${machineId}' declares no entity`);
  const entity = must(system.entities.get(entityId), `entity '${entityId}' is not declared`);
  const binding = must(BINDINGS.find((b) => b.name === "machine-of-entity"),
    "the kernel declares no machine-of-entity binding");
  return [
    pairsList([
      ["The declaration", `machine '${machineId}' declares entity: ${entityId}`],
      ["The binding", `${binding.name} — ${binding.interpretation}`],
      ["One side", `the state machine, answering: ${questionOf(machine.purpose)}`],
      ["The other", `the entity ${entity.label}, which the structural model places in its pipeline`],
    ]),
    el("p", "Neither model gains the other's content. The pipeline still cannot say in what order "
      + "the states occur, and the machine still cannot say which components exist.", "intro"),
  ];
}

function stepComposition(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const system = systemOf(deps, WALK_DP);
  const queries = groundingQueries(step);
  const out = outcomeLine("Not run yet.");
  const run = button("Run both questions", () => {
    const parts = queries.map(({ query }) => {
      const result = mustRun(system, query);
      return `“${nameOf(system, query)}”: ${magnitudeText(result, null)}`;
    });
    out.textContent = `${parts.join(". ")}. The second question measures only the executions its `
      + "behavioural predicate selects; the selection is the composition.";
  });
  return [
    el("p", `“${system.name}” saves the uncomposed and the composed question side by side.`, "intro"),
    run, out,
  ];
}

function stepBoundaries(deps: WalkthroughDeps, step: WalkStep): readonly Node[] {
  const system = systemOf(deps, WALK_TW);
  const [unlicensedQ, contrastQ] = groundingQueries(step);
  const q = must(unlicensedQ, "step 15 grounds no query");
  const contrast = must(contrastQ, "step 15 grounds no contrast query");
  const out = outcomeLine("Not asked yet.");
  const ask = button(`Ask: “${nameOf(system, q.query)}”`, () => {
    const result = mustRun(system, q.query);
    out.textContent = result.outcome === "unlicensed"
      ? `NOT ANSWERABLE — ${result.refusal ?? "the model does not license the question"}`
      : `Outcome: ${outcomeWord(result)}.`;
  });
  const contrastResult = mustRun(system, contrast.query);
  return [
    ask, out,
    el("p", `For contrast, “${nameOf(system, contrast.query)}” answers ${outcomeWord(contrastResult)}: `
      + "the model decides that question, and the decided answer is no. A refusal is not a verdict; "
      + "it reports that the model carries no reading of the question.", "intro"),
  ];
}

function stepAgents(): readonly Node[] {
  const services = ["workspace.query", "workspace.openHypothesis"];
  const rows = services.flatMap((service) => {
    const caps = CAPABILITIES.filter((c) => c.service === service);
    return caps.map((c): readonly [string, string] => [
      c.service,
      `${c.summary} Human: ${c.human.map((h) => h.at).join(", ") || "—"}. `
        + `Machine: ${c.machine.map((m) => m.at).join(", ") || "—"}.`,
    ]);
  });
  return [
    el("p", "Each operation the walkthrough used is one capability with two affordances — a "
      + "control on the page and a call on the agent surface. Asking an agent to “add a shortcut "
      + "from Proposed to Committed and re-check the saved properties” performs step 9 through the "
      + "same service calls.", "intro"),
    pairsList(rows),
  ];
}
