/**
 * The view model — everything the UI shows, as data, before any DOM exists.
 *
 * Two reasons it is separated from the DOM binding, and the second is the important one:
 *
 *  1. It is testable in `node:test` with no jsdom and no browser.
 *  2. **FR-A11Y-2 becomes checkable.** The requirement is that nothing is conveyed by colour,
 *     position, line style or shape alone. If the thing the UI renders is a typed structure of
 *     labels, roles and states, then a test can assert that every status carries TEXT — and that is
 *     an assertion about the product, not about a stylesheet. A canvas-first design cannot be
 *     checked this way, which is part of why it fails accessibility in practice.
 *
 * The structured model view is the PRIMARY editing surface here, not a fallback. FR-A11Y-2 requires
 * that model editing and query execution be possible without touching the diagram, so the diagram
 * is the second view and this is the first.
 */
import type { Annotated, CanonicalSystem, Finding, QueryResult, Scalar } from "../ir/types.ts";
import type { SceneSubject } from "../render/types.ts";
import { NOTE_KINDS, isNoteKind } from "../transaction/types.ts";
import type { Operation } from "../transaction/types.ts";

export interface ViewModel {
  readonly title: string;
  readonly summary: string;
  /** The hypothesis label, repeated out of the banner so the document title can carry it too. */
  readonly hypothesis: string | null;
  readonly banner: Banner | null;
  readonly sections: readonly Section[];
  readonly findings: readonly FindingRow[];
  readonly questions: readonly QuestionRow[];
  /** What the editing forms may offer. Derived from the model, so a control cannot offer a lie. */
  readonly edit: EditOptions;
  /** Drawable subjects for the diagram: one per purposeful model and per machine. */
  readonly subjects: readonly Choice[];
}

/** The hypothesis / validity banner. Never colour alone — `text` always says it. */
export interface Banner {
  readonly tone: "info" | "warning" | "danger";
  readonly text: string;
}

export interface Section {
  readonly id: string;
  readonly heading: string;
  /** A short sentence a screen-reader user hears before the rows. */
  readonly intro: string;
  readonly rows: readonly Row[];
}

export interface Row {
  readonly id: string;
  readonly label: string;
  readonly kind: string;
  readonly detail: string;
  /** Textual status badges. "initial", "selected", "evidence", "violation" — words, not hues. */
  readonly states: readonly string[];
  /**
   * Human context attached to this object. Deliberately NOT findings: a finding is validation
   * output, and rendering someone's comment in the findings list would tell them their note is a
   * problem. Kept a separate field so the two can never be merged by accident downstream.
   */
  readonly notes: readonly NoteLine[];
  readonly provenance: ProvenanceBlock | null;
  /**
   * Set when a note on this row claims an assumption. The A1 boundary is the point of the whole
   * annotation feature and it is counter-intuitive, so the row that carries an assumption is where
   * it has to be said.
   */
  readonly notesCaveat: string | null;
}

export interface NoteLine {
  readonly id: string;
  /** "comment", "rationale", "assumption", "question", "todo" — a word, shown as a word. */
  readonly kind: string;
  readonly text: string;
  /** "human" / "agent", already phrased, or null when the note does not say. */
  readonly author: string | null;
  /** Set when the note object carried keys that are not a note's — usually a truncated note. */
  readonly warning: string | null;
}

/**
 * Provenance as label/value pairs, `prompt` first.
 *
 * `prompt` leads because it is the field that answers the question a reader of an agent-authored
 * model actually has — why does this object have this shape, and what was the agent asked to
 * preserve — which reading the model cannot tell you.
 */
export interface ProvenanceBlock {
  readonly fields: readonly { readonly label: string; readonly value: string }[];
  /**
   * The source declares provenance but the IR could read nothing out of it. Reported rather than
   * dropped: "this object records where it came from, in a spelling we do not understand" is a
   * different fact from "this object records nothing".
   */
  readonly unreadable: boolean;
}

export interface FindingRow {
  readonly rule: string;
  readonly where: string;
  readonly message: string;
}

export interface QuestionRow {
  readonly id: string;
  readonly question: string;
  /** The outcome word, verbatim. Deliberately not a tick or a colour. */
  readonly outcome: string;
  /** "exhaustive, 37 configurations" / "bounded at 1000000 — INCONCLUSIVE". */
  readonly coverage: string;
  readonly evidence: readonly string[];
  readonly refusal: string | null;
  /** Disclosed rewrites, e.g. an added history variable (V23). */
  readonly compilation: readonly string[];
  readonly stale: boolean;
}

/** One option in a select. `value` is machine-readable; `label` is what a person reads or hears. */
export interface Choice {
  readonly value: string;
  readonly label: string;
}

/**
 * The licensed choices for every editing control.
 *
 * Derived from the model on every repaint rather than typed by the user, which is the UI half of
 * the affordance-licensing idea: a control cannot offer a relation type the model never declared,
 * or an endpoint the chosen model does not contain. The transaction engine still validates — this
 * narrows what can be asked, it does not replace the check.
 */
export interface EditOptions {
  readonly entities: readonly Choice[];
  readonly machines: readonly Choice[];
  readonly models: readonly Choice[];
  readonly relationTypes: readonly Choice[];
  readonly domains: readonly Choice[];
  /** Model id -> the entities that model contains. A relation may only join two of them. */
  readonly modelEntities: ReadonlyMap<string, readonly Choice[]>;
  /** Deletable elements: entities and machine states in one list, encoded by `elementValue`. */
  readonly elements: readonly Choice[];
  /**
   * What `set-label` may address, by bare id: entities, models and machines.
   *
   * Three namespaces rather than one, because the operation takes a bare id and no scope, so an id
   * naming both an entity and a machine is genuinely ambiguous and the engine refuses it. The list
   * says which namespace each choice came from, so a user can see the collision before they hit it.
   */
  readonly labelled: readonly Choice[];
  /** Existing relations, encoded by `relationValue`. */
  readonly relations: readonly Choice[];
  /** Property names already in use somewhere, offered as a hint beside the free-text field. */
  readonly propertyNames: readonly string[];
  /**
   * What a note may be attached to: entities, models and relations, encoded by
   * `annotationTargetValue`.
   *
   * Those three and no more, because those three are the objects the IR gives an `annotation` field.
   * Offering a machine or a transition would be offering to write a note the loader then drops.
   */
  readonly annotatable: readonly Choice[];
  /** Entity ids, offered as a datalist beside the free-text entity list on the model form. */
  readonly entityIds: readonly string[];
  /** The note vocabulary, derived from the closed set the transaction layer declares. */
  readonly noteKinds: readonly Choice[];
}

// --------------------------------------------------------------------------------------------
// Form input -> transaction operation
// --------------------------------------------------------------------------------------------

/**
 * What a person filled in. One variant per form in the editing section.
 *
 * Separating this from the DOM is what makes Group A testable in `node:test`: a test builds the
 * exact record a click produces and asserts on the operation that comes out, with no browser. The
 * fields are strings because that is what an `<input>` yields; coercion and refusal happen in
 * `planEdit`, where they can be checked.
 */
export type EditRequest =
  | { readonly form: "add-entity"; readonly id: string; readonly type: string; readonly label: string }
  | { readonly form: "add-state"; readonly machine: string; readonly state: string }
  | { readonly form: "delete-element"; readonly element: string; readonly cascade: boolean }
  | {
      readonly form: "add-relation"; readonly model: string; readonly from: string;
      readonly to: string; readonly type: string;
    }
  | { readonly form: "delete-relation"; readonly relation: string }
  | { readonly form: "set-label"; readonly id: string; readonly label: string }
  | {
      readonly form: "set-property"; readonly id: string; readonly name: string;
      readonly value: string; readonly valueKind: "string" | "integer" | "boolean";
      readonly domain: string; readonly unset: boolean;
    }
  | {
      readonly form: "add-model"; readonly id: string; readonly label: string;
      /** Required by this form, though `add-model` itself does not carry one. See `planEdit`. */
      readonly question: string;
      /** Comma-separated entity ids, as the free-text field yields them. */
      readonly entities: string;
    }
  | { readonly form: "delete-model"; readonly model: string }
  | {
      readonly form: "add-note"; readonly target: string;
      readonly kind: string; readonly text: string;
    };

/**
 * Either the operations to send, or a sentence explaining what is missing.
 *
 * The UI refuses an empty id itself rather than forwarding it, because the transaction parser's
 * answer — "'id' is required and must be a string" — is written for an agent reading a schema, and
 * a person who left a box blank deserves to be told that instead.
 *
 * A LIST, because one form produces one transaction and a transaction is a list of operations.
 * Every form but one sends a single operation; `add-model` sends `add-model` plus `set-purpose`,
 * composing with the op that already owns the purpose block instead of duplicating it. Atomicity
 * then makes the pair indivisible, so a question-less model is never committed.
 */
export type EditPlan =
  | { readonly ok: true; readonly operations: readonly Operation[] }
  | { readonly ok: false; readonly problem: string };

const no = (problem: string): EditPlan => ({ ok: false, problem });
const yes = (...operations: readonly Operation[]): EditPlan => ({ ok: true, operations });

/** `entity:<id>` / `state:<machine>:<state>`. Legal ids cannot contain a colon, so this is unambiguous. */
export type ElementRef =
  | { readonly kind: "entity"; readonly id: string }
  | { readonly kind: "state"; readonly machine: string; readonly state: string };

export const elementValue = (ref: ElementRef): string =>
  ref.kind === "entity" ? `entity:${ref.id}` : `state:${ref.machine}:${ref.state}`;

export function parseElementValue(value: string): ElementRef | null {
  const parts = value.split(":");
  if (parts.length === 2 && parts[0] === "entity" && parts[1] !== undefined && parts[1] !== "") {
    return { kind: "entity", id: parts[1] };
  }
  if (parts.length === 3 && parts[0] === "state" && parts[1] !== undefined && parts[2] !== undefined) {
    return { kind: "state", machine: parts[1], state: parts[2] };
  }
  return null;
}

/**
 * `rel:id:<model>:<id>` / `rel:ends:<model>:<from>:<to>:<type>`.
 *
 * Two forms because a relation in the source may or may not have been given an id, and
 * `delete-relation` addresses it either by id or by the (from, to, type) triple. Encoding which
 * form applies keeps the UI from guessing, which would silently delete the wrong edge when two
 * relations share endpoints.
 */
export type RelationRef =
  | { readonly kind: "id"; readonly model: string; readonly id: string }
  | {
      readonly kind: "ends"; readonly model: string; readonly from: string;
      readonly to: string; readonly type: string;
    };

export const relationValue = (ref: RelationRef): string =>
  ref.kind === "id"
    ? `rel:id:${ref.model}:${ref.id}`
    : `rel:ends:${ref.model}:${ref.from}:${ref.to}:${ref.type}`;

export function parseRelationValue(value: string): RelationRef | null {
  const p = value.split(":");
  if (p[0] !== "rel") return null;
  if (p[1] === "id" && p.length === 4 && p[2] !== undefined && p[3] !== undefined) {
    return { kind: "id", model: p[2], id: p[3] };
  }
  if (p[1] === "ends" && p.length === 6
      && p[2] !== undefined && p[3] !== undefined && p[4] !== undefined && p[5] !== undefined) {
    return { kind: "ends", model: p[2], from: p[3], to: p[4], type: p[5] };
  }
  return null;
}

/**
 * What a note may be attached to: `entity:<id>`, `model:<id>`, or either relation encoding above.
 *
 * One select rather than a scope select plus a target select whose contents depend on it. A
 * dependent pair is two controls to keep in step and a repaint that can empty the second one under
 * the user's caret; a single list of everything annotatable has neither problem.
 */
export type AnnotationTarget =
  | { readonly kind: "entity"; readonly id: string }
  | { readonly kind: "model"; readonly id: string }
  | { readonly kind: "relation"; readonly ref: RelationRef };

export const annotationTargetValue = (target: AnnotationTarget): string =>
  target.kind === "relation" ? relationValue(target.ref) : `${target.kind}:${target.id}`;

export function parseAnnotationTarget(value: string): AnnotationTarget | null {
  if (value.startsWith("rel:")) {
    const ref = parseRelationValue(value);
    return ref === null ? null : { kind: "relation", ref };
  }
  const parts = value.split(":");
  const id = parts[1];
  if (parts.length !== 2 || id === undefined || id === "") return null;
  if (parts[0] === "entity") return { kind: "entity", id };
  if (parts[0] === "model") return { kind: "model", id };
  return null;
}

/** An integer literal and nothing else. V17 forbids reals, so a decimal point is a refusal. */
const INTEGER = /^-?[0-9]+$/;

const blank = (s: string): string | undefined => (s.trim() === "" ? undefined : s.trim());

export function planEdit(req: EditRequest): EditPlan {
  switch (req.form) {
    case "add-entity": {
      const id = req.id.trim();
      if (id === "") return no("An entity needs an id. Ids are immutable, so choose it deliberately.");
      return yes({ op: "add-entity", id, type: blank(req.type), label: blank(req.label) });
    }

    case "add-state": {
      const machine = req.machine.trim();
      const state = req.state.trim();
      if (machine === "") return no("Choose the machine the state belongs to.");
      if (state === "") return no("A state needs a name.");
      return yes({ op: "add-state", machine, state, label: undefined });
    }

    case "delete-element": {
      const ref = parseElementValue(req.element);
      if (ref === null) return no("Choose the element to delete.");
      return ref.kind === "entity"
        ? yes({ op: "delete-entity", id: ref.id, cascade: req.cascade })
        : yes({ op: "delete-state", machine: ref.machine, state: ref.state, cascade: req.cascade });
    }

    case "add-relation": {
      const model = req.model.trim();
      const from = req.from.trim();
      const to = req.to.trim();
      const type = req.type.trim();
      if (model === "") return no("Choose the model the relation belongs to.");
      if (from === "" || to === "") return no("A relation needs both a source and a target.");
      if (type === "") return no("Choose the relation type. Only types this model system declares are offered.");
      return yes({ op: "add-relation", model, from, to, type, id: undefined, label: undefined });
    }

    case "delete-relation": {
      const ref = parseRelationValue(req.relation);
      if (ref === null) return no("Choose the relation to remove.");
      return ref.kind === "id"
        ? yes({ op: "delete-relation", model: ref.model, id: ref.id, from: undefined, to: undefined, type: undefined })
        : yes({
            op: "delete-relation", model: ref.model, id: undefined,
            from: ref.from, to: ref.to, type: ref.type,
          });
    }

    case "set-label": {
      const id = req.id.trim();
      if (id === "") return no("Choose the element to relabel.");
      const label = req.label.trim();
      if (label === "") return no("A label needs text. Clearing identity is not a relabel; ids are immutable.");
      return yes({ op: "set-label", id, value: label });
    }

    case "set-property": {
      const id = req.id.trim();
      const name = req.name.trim();
      if (id === "") return no("Choose the element whose property changes.");
      if (name === "") return no("A property needs a name.");
      if (req.unset) {
        return yes({ op: "set-property", id, name, value: undefined, domain: undefined, unset: true });
      }
      const raw = req.value.trim();
      if (raw === "") return no("A property needs a value, or tick 'clear it instead'.");
      let value: Scalar = raw;
      if (req.valueKind === "integer") {
        if (!INTEGER.test(raw)) return no(`'${raw}' is not a whole number. Values are finite and exact.`);
        value = Number.parseInt(raw, 10);
      } else if (req.valueKind === "boolean") {
        if (raw !== "true" && raw !== "false") return no(`A true/false property is 'true' or 'false', not '${raw}'.`);
        value = raw === "true";
      }
      return yes({ op: "set-property", id, name, value, domain: blank(req.domain), unset: undefined });
    }

    case "add-model": {
      const id = req.id.trim();
      if (id === "") return no("A model needs an id. Ids are immutable, so choose it deliberately.");
      // The question is required HERE and optional in the op, and that asymmetry is the point: an
      // agent may build a model in stages, but a person creating one is being taught the habit the
      // workbench exists to teach. A reduction with no question cannot say what it may leave out.
      const question = req.question.trim();
      if (question === "") {
        return no("A model needs the engineering question it answers. Without one it is a container, "
          + "not a purposeful reduction, and nothing can say which facts it may leave out.");
      }
      const entities = req.entities.split(",").map((s) => s.trim()).filter((s) => s !== "");
      return yes(
        {
          op: "add-model", id, label: blank(req.label),
          entities: entities.length === 0 ? undefined : entities,
        },
        { op: "set-purpose", scope: "model", id, question, represents: undefined, omits: undefined },
      );
    }

    case "delete-model": {
      const model = req.model.trim();
      if (model === "") return no("Choose the model to remove.");
      return yes({ op: "delete-model", id: model });
    }

    case "add-note": {
      const target = parseAnnotationTarget(req.target);
      if (target === null) return no("Choose what the note is about.");
      if (!isNoteKind(req.kind)) return no("Choose what kind of note this is.");
      const text = req.text.trim();
      if (text === "") {
        return no("A note needs text. An empty one is dropped when the file loads rather than stored.");
      }
      // `author: human` is stamped rather than asked for: the field records WHICH SIDE wrote the
      // note, not who, and this side is known. `at` is left unset — reading the clock here would
      // make the same form produce different bytes on every click and this function untestable.
      const note = { kind: req.kind, text, author: "human", id: undefined, at: undefined };
      if (target.kind === "relation") {
        const ref = target.ref;
        return yes(ref.kind === "id"
          ? { op: "add-note", scope: "relation", model: ref.model, id: ref.id, note }
          : {
              op: "add-note", scope: "relation", model: ref.model,
              from: ref.from, to: ref.to, type: ref.type, note,
            });
      }
      return yes({ op: "add-note", scope: target.kind, id: target.id, note });
    }
  }
}

/**
 * Which model or machine the diagram draws.
 *
 * Accepts the prefixed form the subject select emits AND a bare id, because `window.mage.view.focus`
 * takes a bare id and both must land on the same subject. A bare id is resolved against models
 * first, then machines; the prefixed form removes that ambiguity when an id is used for both.
 */
export function resolveSubject(system: CanonicalSystem, target: string | null): SceneSubject | null {
  if (target !== null && target !== "") {
    if (target.startsWith("model:")) {
      const id = target.slice("model:".length);
      if (system.models.has(id)) return { kind: "model", id };
    } else if (target.startsWith("machine:")) {
      const id = target.slice("machine:".length);
      if (system.machines.has(id)) return { kind: "machine", id };
    } else {
      if (system.models.has(target)) return { kind: "model", id: target };
      if (system.machines.has(target)) return { kind: "machine", id: target };
    }
  }
  const firstModel = [...system.models.keys()][0];
  if (firstModel !== undefined) return { kind: "model", id: firstModel };
  const firstMachine = [...system.machines.keys()][0];
  return firstMachine === undefined ? null : { kind: "machine", id: firstMachine };
}

export const subjectValue = (subject: SceneSubject): string => `${subject.kind}:${subject.id}`;

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

// --------------------------------------------------------------------------------------------
// Annotation
// --------------------------------------------------------------------------------------------

function noteLines(a: Annotated): readonly NoteLine[] {
  return a.notes.map((n) => ({
    id: n.id,
    kind: n.kind,
    text: n.text,
    author: n.author,
    warning: n.unexpectedKeys.length === 0
      ? null
      : `This note also carried ${n.unexpectedKeys.join(", ")}, which a note has no place for — `
        + "usually an unquoted comma in flow style, which truncates the text.",
  }));
}

const CAVEAT = "An assumption written as a note is context, not a constraint: analysis does not use "
  + "it. To make an assumption bind a result, represent it as a property, a variable or a guard.";

function provenanceBlock(a: Annotated): ProvenanceBlock | null {
  const p = a.provenance;
  if (p === null) return null;
  const fields: { label: string; value: string }[] = [];
  if (p.prompt !== null) fields.push({ label: "Asked for", value: p.prompt });
  if (p.rationale !== null) fields.push({ label: "Rationale", value: p.rationale });
  if (p.createdBy !== null) fields.push({ label: "Created by", value: p.createdBy });
  if (p.createdAt !== null) fields.push({ label: "Created at", value: p.createdAt });
  for (const h of p.history) {
    const parts = [h.actor, h.action, h.prompt === null ? null : `asked: ${h.prompt}`, h.revision, h.at]
      .filter((s): s is string => s !== null && s !== "");
    if (parts.length > 0) fields.push({ label: "History", value: parts.join(" · ") });
  }
  return { fields, unreadable: fields.length === 0 };
}

/** The three annotation-bearing fields of a row, assembled once so no call site forgets one. */
function annotated(a: Annotated): Pick<Row, "notes" | "provenance" | "notesCaveat"> {
  const notes = noteLines(a);
  return {
    notes,
    provenance: provenanceBlock(a),
    notesCaveat: notes.some((n) => n.kind === "assumption") ? CAVEAT : null,
  };
}

/** A row with no annotation-bearing object behind it: a transition, a machine, a derived heading. */
const UNANNOTATED: Pick<Row, "notes" | "provenance" | "notesCaveat"> =
  { notes: [], provenance: null, notesCaveat: null };

/** Outcome word plus what it MEANS, because "refuted" alone is jargon to a student. */
function outcomeText(r: QueryResult): string {
  switch (r.outcome) {
    case "holds": return "HOLDS — established";
    case "refuted": return "REFUTED — does not hold";
    case "inconclusive": return "INCONCLUSIVE — the search was bounded, so this is not a 'no'";
    case "unlicensed": return "NOT ANSWERABLE from this model";
    default: return r.outcome;
  }
}

function coverageText(r: QueryResult): string {
  const c = r.coverage;
  if (c.kind === "not-applicable") return "coverage not applicable";
  if (c.kind === "bounded") {
    return `bounded after ${plural(c.statesExplored, "configuration")}` +
      `${c.reason === null ? "" : ` (${c.reason})`} — no conclusion is licensed`;
  }
  return `exhaustive over ${plural(c.statesExplored, "configuration")}`;
}

function evidenceText(r: QueryResult): readonly string[] {
  const ev = r.evidence;
  if (ev === null) return [];
  if (ev.shape === "path" && ev.nodes !== null) {
    return [`${ev.role}: ${ev.nodes.join(" → ")}`];
  }
  const lines = ev.steps.map((s, i) => {
    const who = s.instances.join(" + ");
    const via = s.sync !== null ? ` on ${s.sync}` : s.label !== null ? ` (${s.label})` : "";
    return `${i + 1}. ${who}${via}`;
  });
  if (ev.shape === "lasso" && ev.cycle !== null) {
    lines.push(`then repeating: ${ev.cycle.map((s) => s.instances.join(" + ")).join(" → ")}`);
  }
  return [`${ev.role} (${ev.shape}):`, ...lines];
}

export function buildViewModel(
  system: CanonicalSystem,
  findings: readonly Finding[],
  results: ReadonlyMap<string, QueryResult>,
  options: { readonly hypothesis: string | null; readonly currentHash: string; readonly selection: readonly string[] },
): ViewModel {
  const selected = new Set(options.selection);

  const banner: Banner | null =
    options.hypothesis !== null
      ? { tone: "warning", text: `Hypothesis "${options.hypothesis}" is active. The authoritative model is unchanged until you apply it.` }
      : findings.length > 0
        ? { tone: "danger", text: `${plural(findings.length, "validation finding")}. Analysis is still available, but conclusions may not be meaningful.` }
        : null;

  const entityRows: Row[] = [...system.entities.values()].map((e) => {
    const props = [...e.properties.entries()].map(([k, v]) => `${k} = ${String(v.value)}`);
    const where = [...system.models.values()].filter((m) => m.entities.includes(e.id)).map((m) => m.label);
    return {
      id: e.id,
      label: e.label,
      kind: e.type ?? "entity",
      // Containment and cross-model appearance are stated in words. In the diagram these are an
      // enclosing region and a highlight; here they are sentences, which is the point.
      detail: [
        e.parent !== null ? `inside ${e.parent}` : null,
        e.contains.length > 0 ? `contains ${e.contains.join(", ")}` : null,
        props.length > 0 ? props.join("; ") : null,
        where.length > 0 ? `appears in ${where.join(", ")}` : null,
      ].filter((s): s is string => s !== null).join(" · ") || "no further detail",
      states: selected.has(e.id) ? ["selected"] : [],
      ...annotated(e.annotation),
    };
  });

  const machineRows: Row[] = [...system.machines.values()].flatMap((m) => {
    const head: Row = {
      id: m.id,
      label: m.id,
      kind: m.instances > 1 ? `machine (${m.instances} instances)` : "machine",
      detail: [
        `starts in ${m.initial}`,
        `${plural(m.states.length, "state")}: ${m.states.join(", ")}`,
        m.entity !== null ? `models ${m.entity}` : null,
        m.variables.size > 0
          ? `variables: ${[...m.variables.values()].map((v) => `${v.id} ∈ {${v.domain.join(", ")}}`).join("; ")}`
          : null,
        // Purpose is what licenses or refuses a question, so it belongs beside the machine rather
        // than only inside a refusal message the user may never provoke.
        m.purpose.question !== null ? `asks: ${m.purpose.question}` : null,
        m.purpose.omits.length > 0 ? `deliberately omits ${m.purpose.omits.join(", ")}` : null,
      ].filter((s): s is string => s !== null).join(" · "),
      states: selected.has(m.id) ? ["selected"] : [],
      ...UNANNOTATED,
    };
    const transitions: Row[] = m.transitions.map((t) => ({
      id: `${m.id}.t${t.index}`,
      label: `${t.from} → ${t.to}`,
      kind: t.sync !== null ? "synchronized transition" : "transition",
      detail: [
        t.sync !== null ? `fires together with the other participants of ${t.sync}` : null,
        t.label,
        t.guards.length > 0 ? `requires ${t.guards.map((g) => `${g.ref} ${g.op} ${String(g.value)}`).join(" and ")}` : null,
        t.effects.length > 0 ? `sets ${t.effects.map((e) => `${e.variable} := ${e.expression}`).join(", ")}` : null,
      ].filter((s): s is string => s !== null).join(" · ") || "unconditional",
      states: t.from === m.initial ? ["from initial state"] : [],
      ...UNANNOTATED,
    }));
    return [head, ...transitions];
  });

  const relationRows: Row[] = system.relations.map((r, i) => {
    const rt = system.relationTypes.get(r.type);
    return {
      id: r.id ?? `relation-${i}`,
      label: `${r.from} → ${r.to}`,
      kind: r.type,
      detail: [
        rt?.description ?? null,
        // The ABSENCE is often the more important half, and it is invisible in a diagram.
        rt?.absence !== null && rt?.absence !== undefined ? `Absence means: ${rt.absence}` : null,
        rt?.pathComposition === "forbidden" ? "multi-hop questions over this relation are NOT licensed" : null,
        `in model ${r.model}`,
      ].filter((s): s is string => s !== null).join(" · "),
      states: [],
      ...annotated(r.annotation),
    };
  });

  const modelRows: Row[] = [...system.models.values()].map((m) => ({
    id: m.id,
    label: m.label,
    kind: "purposeful model",
    detail: [
      // The question comes first because it is what the model is FOR, and what a refusal cites.
      m.purpose.question !== null ? `asks: ${m.purpose.question}` : "states no engineering question",
      m.purpose.represents.length > 0 ? `represents ${m.purpose.represents.join(", ")}` : null,
      m.purpose.omits.length > 0 ? `deliberately omits ${m.purpose.omits.join(", ")}` : null,
      `over ${plural(m.entities.length, "entity", "entities")}`,
    ].filter((s): s is string => s !== null).join(" · "),
    states: selected.has(m.id) ? ["selected"] : [],
    ...annotated(m.annotation),
  }));

  const sections: Section[] = [
    { id: "models", heading: "Models", intro: "Each model is a purposeful reduction: what it asks, what it represents, and what it declines to say.", rows: modelRows },
    { id: "entities", heading: "Entities", intro: "The one identity namespace. Every model refers to these.", rows: entityRows },
    { id: "relations", heading: "Relations", intro: "Typed edges, with what each type asserts and what its absence asserts.", rows: relationRows },
    { id: "machines", heading: "Machines and transitions", intro: "Behaviour. A synchronized transition fires together with its event's other participants.", rows: machineRows },
  ].filter((s) => s.rows.length > 0);

  const questions: QuestionRow[] = [...system.queries.keys()].map((id) => {
    const r = results.get(id);
    const name = (system.queries.get(id)?.raw as { name?: unknown } | undefined)?.name;
    if (r === undefined) {
      return { id, question: typeof name === "string" ? name : id, outcome: "not yet run", coverage: "", evidence: [], refusal: null, compilation: [], stale: false };
    }
    return {
      id,
      question: typeof name === "string" ? name : id,
      outcome: outcomeText(r),
      coverage: coverageText(r),
      evidence: evidenceText(r),
      refusal: r.refusal,
      compilation: r.compilation.map((c) => c.explanation),
      // A result whose hash no longer matches describes a model the user has already changed.
      stale: r.systemHash !== options.currentHash,
    };
  });

  return {
    title: system.name,
    summary: `${plural(system.models.size, "model")}, ` +
      `${plural(system.entities.size, "entity", "entities")}, ` +
      `${plural(system.machines.size, "machine")}, ` +
      `${plural(system.instances.length, "machine instance")}, ` +
      `${plural(system.relations.length, "relation")}, ` +
      `${plural(system.queries.size, "saved question")}.`,
    hypothesis: options.hypothesis,
    banner,
    sections,
    findings: findings.map((f) => ({ rule: f.rule, where: f.where, message: f.message })),
    questions,
    edit: buildEditOptions(system),
    subjects: [
      ...[...system.models.values()].map((m) => ({ value: `model:${m.id}`, label: `Model: ${m.label}` })),
      ...[...system.machines.keys()].map((id) => ({ value: `machine:${id}`, label: `Machine: ${id}` })),
    ],
  };
}

function buildEditOptions(system: CanonicalSystem): EditOptions {
  const entityChoice = (id: string): Choice => {
    const e = system.entities.get(id);
    return { value: id, label: e === undefined || e.label === id ? id : `${e.label} (${id})` };
  };

  const modelEntities = new Map<string, readonly Choice[]>();
  for (const m of system.models.values()) {
    modelEntities.set(m.id, m.entities.filter((id) => system.entities.has(id)).map(entityChoice));
  }

  const elements: Choice[] = [
    ...[...system.entities.keys()].map((id): Choice => ({
      value: elementValue({ kind: "entity", id }),
      label: `Entity: ${entityChoice(id).label}`,
    })),
    ...[...system.machines.values()].flatMap((m) => m.states.map((state): Choice => ({
      value: elementValue({ kind: "state", machine: m.id, state }),
      label: `State: ${m.id} / ${state}`,
    }))),
  ];

  const relations: Choice[] = system.relations.map((r) => ({
    value: relationValue(r.id !== null
      ? { kind: "id", model: r.model, id: r.id }
      : { kind: "ends", model: r.model, from: r.from, to: r.to, type: r.type }),
    label: `${r.model}: ${r.from} → ${r.to} (${r.type})`,
  }));

  const propertyNames = [...new Set(
    [...system.entities.values()].flatMap((e) => [...e.properties.keys()]),
  )].sort();

  const annotatable: Choice[] = [
    ...[...system.entities.keys()].map((id): Choice => ({
      value: annotationTargetValue({ kind: "entity", id }),
      label: `Entity: ${entityChoice(id).label}`,
    })),
    ...[...system.models.values()].map((m): Choice => ({
      value: annotationTargetValue({ kind: "model", id: m.id }),
      label: `Model: ${m.label}`,
    })),
    ...system.relations.map((r): Choice => ({
      value: annotationTargetValue({
        kind: "relation",
        ref: r.id !== null
          ? { kind: "id", model: r.model, id: r.id }
          : { kind: "ends", model: r.model, from: r.from, to: r.to, type: r.type },
      }),
      label: `Relation: ${r.model}: ${r.from} → ${r.to} (${r.type})`,
    })),
  ];

  return {
    entities: [...system.entities.keys()].map(entityChoice),
    machines: [...system.machines.keys()].map((id) => ({ value: id, label: id })),
    models: [...system.models.values()].map((m) => ({ value: m.id, label: m.label })),
    // Only declared types. Offering a type the model system never declared would produce a
    // transaction the validator refuses under V3, which is a worse answer than not offering it.
    relationTypes: [...system.relationTypes.values()].map((t) => ({
      value: t.id,
      label: t.description === "" ? t.id : `${t.id} — ${t.description}`,
    })),
    domains: [...system.domains.keys()].map((id) => ({ value: id, label: id })),
    modelEntities,
    elements,
    labelled: [
      ...[...system.entities.keys()].map((id): Choice => ({ value: id, label: `Entity: ${id}` })),
      ...[...system.models.keys()].map((id): Choice => ({ value: id, label: `Model: ${id}` })),
      ...[...system.machines.keys()].map((id): Choice => ({ value: id, label: `Machine: ${id}` })),
    ],
    relations,
    propertyNames,
    annotatable,
    entityIds: [...system.entities.keys()],
    // Derived from the closed record the transaction layer declares, so the form cannot offer a
    // kind the parser would refuse, and a new kind reaches the select without an edit here.
    noteKinds: Object.keys(NOTE_KINDS).map((kind) => ({ value: kind, label: kind })),
  };
}
