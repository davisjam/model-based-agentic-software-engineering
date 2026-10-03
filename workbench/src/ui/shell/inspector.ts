/**
 * The `inspector` region: whatever is selected, and the semantics that belong to it.
 *
 * Correction 3 is this region's reason to exist. The author called the global Entities and Relations
 * tables "the clearest symptom" of the debug-console page: useful inspection surfaces, and a
 * terrible home page. So the rich semantics are asked for by SELECTING the thing they concern, and
 * this pane answers the selection — an entity with its properties, the models it appears in and the
 * relations that name it; a relation with what its type asserts, what its absence asserts, and
 * whether its edges compose.
 *
 * **Two halves, and the split is what makes the semantics checkable.** `inspectSelection` is a pure
 * function from the authoritative system plus the selection to a typed reading; `mountInspector`
 * turns that reading into elements. The node tier drives the first half with no DOM at all, which is
 * the arrangement `view-model.ts` exists for and the reason FR-A11Y-2 holds here: every semantic
 * line is TEXT in a typed structure before any element exists, so a test asserts the product rather
 * than a stylesheet.
 *
 * **The relation reading is DERIVED, never restated.** A relation type declares what its absence
 * means and whether a multi-hop question over it is licensed; this pane reads that declaration, and
 * for a forbidden composition it reads the refusal the SPARQL seam gives the same question, word for
 * word (`unlicensedByModel`, over `licensesTraversal` — the V7/V32 predicate both interfaces share).
 * A hand-written "absence means" sentence beside the declared one would be two copies of one fact,
 * and the copy would start lying the first time an author edited the model. Where a declaration is
 * genuinely absent this pane says so, which is the `purposeBlock` precedent: silence and "nothing is
 * declared here" look identical on screen and only one of them is a fact about the model.
 *
 * **Nothing in this pane is a command, so nothing in this pane is a button.** Every control here
 * navigates: an appears-in row moves the workspace to that model, a relation row moves the selection
 * to that relation. Selection and target are non-semantic view state (§4), so these are links to
 * places, and `<a href>` is what a place is reached by. The contextual EDITING actions correction 4
 * sketches — Rename, Set property, Connect, Delete — are commands, they are wave 2a's, and each will
 * need a capability-registry entry before it can land: the browser tier reads an unstamped `<button>`
 * as a control nobody declared. Keeping this wave's surface to navigation is what lets it land while
 * the registry wave is still in flight, and it is also simply what the sketch asks for.
 *
 * **Provenance lives here now.** §7's ledger records that the old page-length Provenance section is
 * superseded by correction 9: discoverability is answered by PLACEMENT — one disclosure from the
 * object it belongs to — rather than by prominence. Notes and Provenance are therefore `<details>`,
 * which SH-I2 requires of every collapsed semantic region: a real disclosure control, in the tab
 * order, announcing its own expanded state, so a keyboard user and a sighted user open the same
 * things by the same act.
 */
import { modelsDeclaring } from "../../engine/graph.ts";
import { provenanceFields } from "../../app/provenance.ts";
import { licensesTraversal } from "../../sparql/licensing.ts";
import { unlicensedByModel } from "../../sparql/refusal.ts";
import type { Annotated, CanonRelation, CanonTransition, CanonicalSystem } from "../../ir/types.ts";
import { CAVEAT as ASSUMPTION_CAVEAT, parseElementValue, parseRelationValue, relationValue } from "../view-model.ts";
import type { RelationRef } from "../view-model.ts";
import { byId, mountIf } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";

// --------------------------------------------------------------------------------------------
// The reading
// --------------------------------------------------------------------------------------------

/**
 * What activating a line does. Closed, because the renderer has to know where the link GOES, and a
 * third kind of navigation would be a third destination somebody has to declare.
 */
export type InspectorAction =
  /** Make this model or machine the workspace's subject — `subjectValue`'s encoding. */
  | { readonly kind: "target"; readonly subject: string }
  /** Move the selection, so this pane inspects something else. One encoded selection value. */
  | { readonly kind: "select"; readonly selection: string };

export interface InspectorLine {
  readonly text: string;
  /** Null for a line that is only read. Most semantic lines are. */
  readonly action: InspectorAction | null;
}

/**
 * One labelled group of lines.
 *
 * `empty` carries the sentence for a block with nothing in it, and a null `empty` means the block is
 * dropped when empty instead. The distinction is semantic rather than cosmetic: an entity that no
 * model selects is a FACT a reader needs (and a validation finding waiting to be written), while a
 * "Containment" heading over "not contained by anything" is furniture. A block whose emptiness
 * means something says what it means.
 */
export interface InspectorBlock {
  readonly label: string;
  readonly lines: readonly InspectorLine[];
  /** True for Notes and Provenance: collapsed behind a disclosure control (SH-I2). */
  readonly disclosed: boolean;
  readonly empty: string | null;
}

export interface Inspection {
  /** The selected thing, named: "Analytics", or "Analytics —subscribes→ OrderCreated". */
  readonly title: string;
  /** Its declared type, as a word — `service`, `subscribes`, `purposeful model`. */
  readonly type: string;
  /** Selected objects this pane is not showing, because one pane inspects one thing. */
  readonly alsoSelected: readonly string[];
  readonly blocks: readonly InspectorBlock[];
}

/**
 * What the pane shows.
 *
 * `unresolved` is the user-visible half of SH-I5. A transaction can delete the selected element, and
 * an agent can `view.select` a name this system never had; both arrive here as a selection that
 * resolves to nothing. Reporting it as "nothing is selected" would describe the pane instead of the
 * model, which is the absence-is-two-things confusion the evidence ruling spent a document on.
 */
export type InspectorView =
  | { readonly state: "empty"; readonly message: string }
  | { readonly state: "unresolved"; readonly message: string }
  | { readonly state: "object"; readonly inspection: Inspection };

const line = (text: string): InspectorLine => ({ text, action: null });

const navigate = (text: string, action: InspectorAction): InspectorLine => ({ text, action });

const block = (
  label: string, lines: readonly InspectorLine[],
  opts: { readonly disclosed?: boolean; readonly empty?: string | null } = {},
): InspectorBlock => ({
  label,
  lines,
  disclosed: opts.disclosed ?? false,
  empty: opts.empty ?? null,
});

const entityName = (system: CanonicalSystem, id: string): string =>
  system.entities.get(id)?.label ?? id;

const modelName = (system: CanonicalSystem, id: string): string =>
  system.models.get(id)?.label ?? id;

/**
 * A relation in words, in ONE spelling.
 *
 * The author's sketch titles the relation inspector "Analytics subscribes to OrderCreated". The
 * preposition is the problem: nothing in the model declares it, and the same template reads wrong
 * for the sibling types this example ships — "Checkout publishes to OrderCreated" is not what
 * `publishes` asserts. So the type goes between the endpoints as the declared word it is, and the
 * same phrase names the relation in the entity's Relations block, in the title of its own
 * inspection, and in the announcement when it is selected.
 */
const relationPhrase = (system: CanonicalSystem, r: CanonRelation): string =>
  `${entityName(system, r.from)} —${r.type}→ ${entityName(system, r.to)}`;

const refOf = (r: CanonRelation): RelationRef =>
  r.id !== null
    ? { kind: "id", model: r.model, id: r.id }
    : { kind: "ends", model: r.model, from: r.from, to: r.to, type: r.type };

/** Notes and Provenance, disclosed. The one derivation both blocks come from. */
function annotationBlocks(a: Annotated): readonly InspectorBlock[] {
  const notes: InspectorLine[] = a.notes.map((n) =>
    line(`${n.kind}: ${n.text}${n.author === null ? "" : ` — ${n.author}`}`));
  // The A1 boundary, said where the assumption is. A note CLAIMING something is an assumption does
  // not make it part of analysis, which is counter-intuitive enough that the surface carrying the
  // note is where it has to be stated. The sentence is imported rather than written again: the model
  // tables already say it, and two wordings of one boundary is how a reader learns to distrust both.
  if (a.notes.some((n) => n.kind === "assumption")) notes.push(line(ASSUMPTION_CAVEAT));

  const provenance: InspectorLine[] = [];
  if (a.provenance !== null) {
    const p = provenanceFields(a.provenance);
    // "Records an origin in a spelling we cannot read" is a different fact from "records nothing",
    // and dropping the block would report the first as the second.
    if (p.unreadable) {
      provenance.push(line("The source records provenance, but none of its fields could be read."));
    }
    for (const f of p.fields) provenance.push(line(`${f.label}: ${f.value}`));
  }

  return [
    block("Notes", notes, {
      disclosed: true,
      empty: "No notes are attached to this object.",
    }),
    block("Provenance", provenance, {
      disclosed: true,
      // Said rather than omitted: with agent-authored models, whether an object records where it
      // came from is itself what a reader came to find out.
      empty: "No origin is recorded for this object.",
    }),
  ];
}

/**
 * The entity reading: what it is, what it carries, where it appears, what names it.
 *
 * `Appears in` is the §8 cross-model navigation the design asks for, and it is the pane's reason to
 * exist for an entity: identity is shared across reductions, so the fact that one service is in all
 * three models is a fact no single diagram shows.
 */
function entityInspection(system: CanonicalSystem, id: string): Inspection {
  const e = system.entities.get(id);
  if (e === undefined) throw new Error(`entityInspection called for '${id}', which this system does not declare`);

  const properties = [...e.properties.entries()].map(([name, v]) =>
    line(`${name} = ${String(v.value)}${v.domain === null ? "" : ` (domain ${v.domain})`}`));

  const containment: InspectorLine[] = [];
  if (e.parent !== null) containment.push(line(`inside ${entityName(system, e.parent)}`));
  for (const child of e.contains) {
    containment.push(navigate(`contains ${entityName(system, child)}`, { kind: "select", selection: child }));
  }

  const appearsIn = [...system.models.values()]
    .filter((m) => m.entities.includes(e.id))
    .map((m) => navigate(m.label, { kind: "target", subject: `model:${m.id}` }));

  const relations = system.relations
    .filter((r) => r.from === e.id || r.to === e.id)
    .map((r) => navigate(
      `${relationPhrase(system, r)} · in ${modelName(system, r.model)}`,
      { kind: "select", selection: relationValue(refOf(r)) },
    ));

  const machines = [...system.machines.values()]
    .filter((m) => m.entity === e.id)
    .map((m) => navigate(`${m.id} — behaviour`, { kind: "target", subject: `machine:${m.id}` }));

  return {
    title: e.label === e.id ? e.id : `${e.label} (${e.id})`,
    type: e.type ?? "entity",
    alsoSelected: [],
    blocks: [
      block("Properties", properties, {
        empty: "No properties are declared on this entity.",
      }),
      block("Appears in", appearsIn, {
        // An entity no model selects is in the namespace and in no reduction, which is a fact about
        // the system rather than an empty list.
        empty: "No purposeful model selects this entity, so no model says anything about it.",
      }),
      block("Relations", relations, {
        // Carefully NOT "nothing connects to it": what a missing edge asserts is declared per
        // relation type, and this pane does not get to generalise over those declarations.
        empty: "No declared relation names this entity. What a missing edge means is declared by "
          + "each relation type, under Absence means.",
      }),
      ...(containment.length > 0 ? [block("Containment", containment)] : []),
      ...(machines.length > 0 ? [block("Behaviour", machines)] : []),
      ...annotationBlocks(e.annotation),
    ],
  };
}

/**
 * The relation reading — the semantically interesting one.
 *
 * Four of its five lines come straight off the declaration (`description`, `absence`) or off the
 * licensing predicate the engine and the SPARQL seam share (`licensesTraversal`). The fifth is
 * UX-I7's: a relation says WHICH model asserts it, because adjacency is the union across every
 * model, and dropping that line is how a linked view over two reductions would come to look like one
 * unified semantic model.
 */
function relationInspection(system: CanonicalSystem, r: CanonRelation): Inspection {
  const rt = system.relationTypes.get(r.type);

  const meaning = rt === undefined
    ? `This system declares no relation type named '${r.type}', so what this edge asserts is not `
      + "readable. Validation reports the undeclared type."
    : rt.description.trim() === ""
      ? `Relation type '${r.type}' declares no description, so what an edge of it asserts is unstated.`
      : rt.description;

  // The declared sentence, verbatim. The null case is the one place this pane writes a sentence
  // about absence, and it says only that nothing was declared — which is the fact.
  const absence = rt?.absence ?? null;
  const absenceLine = absence !== null
    ? absence
    : `Relation type '${r.type}' declares no absence meaning, so a missing edge of it licenses no `
      + "conclusion.";

  const composition: InspectorLine[] = [];
  if (rt === undefined) {
    composition.push(line("An undeclared relation type has no composition semantics to read."));
  } else if (licensesTraversal(rt, "composing")) {
    // No interface refuses this, so there is no refusal sentence to quote; the claim is the declared
    // `composition.path: allowed`, stated in the same terms its refusal uses.
    composition.push(line(`Path composition is allowed: a multi-hop '${r.type}' question is `
      + "licensed by this model."));
  } else {
    // The seam's own words for the question a user would actually be refused, plus the change that
    // would license it — the house habit of never handing back a refusal with no direction.
    const refusal = unlicensedByModel(r.type, modelsDeclaring(system, r.type));
    composition.push(line(refusal.prose));
    composition.push(line(`What would license it: ${refusal.wouldLicense}`));
  }

  return {
    title: relationPhrase(system, r),
    type: r.type,
    alsoSelected: [],
    blocks: [
      block("Meaning", [line(meaning)]),
      block("Absence means", [line(absenceLine)]),
      block("Composition", composition),
      block("Asserted by", [
        navigate(modelName(system, r.model), { kind: "target", subject: `model:${r.model}` }),
      ]),
      block("Endpoints", [
        navigate(`from ${entityName(system, r.from)}`, { kind: "select", selection: r.from }),
        navigate(`to ${entityName(system, r.to)}`, { kind: "select", selection: r.to }),
      ]),
      ...annotationBlocks(r.annotation),
    ],
  };
}

/**
 * A model's reading, kept thin ON PURPOSE.
 *
 * The models rail and the workspace header are where a model is presented — its purpose, what it
 * represents, what it omits, its history (corrections 2 and 9). A model selection reaches this pane
 * only from an agent's `view.select` or from the entity pane's reverse links, so what it owes is
 * identification and a way onward, not a second copy of the workspace.
 */
function modelInspection(system: CanonicalSystem, id: string): Inspection {
  const m = system.models.get(id);
  if (m === undefined) throw new Error(`modelInspection called for '${id}', which this system does not declare`);
  return {
    title: m.label === m.id ? m.id : `${m.label} (${m.id})`,
    type: "purposeful model",
    alsoSelected: [],
    blocks: [
      block("Asks", [line(m.purpose.question ?? "States no engineering question, so nothing can "
        + "say which facts it may leave out.")]),
      block("Draw it", [navigate(`Show ${m.label} in the workspace`,
        { kind: "target", subject: `model:${m.id}` })]),
      block("Selects", m.entities.map((e) =>
        navigate(entityName(system, e), { kind: "select", selection: e })), {
        empty: "This model selects no entity, so it reduces nothing.",
      }),
      ...annotationBlocks(m.annotation),
    ],
  };
}

/** A machine's reading. Thin for the same reason a model's is: it is a drawable subject of its own. */
function machineInspection(system: CanonicalSystem, id: string): Inspection {
  const m = system.machines.get(id);
  if (m === undefined) throw new Error(`machineInspection called for '${id}', which this system does not declare`);
  return {
    title: id,
    type: m.instances > 1 ? `machine (${m.instances} instances)` : "machine",
    alsoSelected: [],
    blocks: [
      block("Asks", [line(m.purpose.question ?? "States no engineering question, so nothing can "
        + "say which facts it may leave out.")]),
      block("Draw it", [navigate(`Show ${id} in the workspace`,
        { kind: "target", subject: `machine:${id}` })]),
      block("States", m.states.map((s) => navigate(
        s === m.initial ? `${s} — initial` : s,
        { kind: "select", selection: `state:${id}:${s}` },
      ))),
      ...(m.entity === null ? [] : [block("Models", [
        navigate(entityName(system, m.entity), { kind: "select", selection: m.entity }),
      ])]),
      // No Notes or Provenance: `CanonMachine` carries no `annotation` field, so a machine has
      // nowhere to record either, and a disclosure over a structural absence is a dead control.
    ],
  };
}

/** One state of one machine. The transitions that reach it and leave it, in words. */
function stateInspection(system: CanonicalSystem, machine: string, state: string): Inspection | null {
  const m = system.machines.get(machine);
  if (m === undefined || !m.states.includes(state)) return null;
  const describe = (t: CanonTransition): string =>
    `${t.from} → ${t.to}`
    + (t.sync !== null ? ` · fires together with the other participants of ${t.sync}` : "")
    + (t.label !== null ? ` · ${t.label}` : "");
  return {
    title: `${machine} / ${state}`,
    type: state === m.initial ? "initial state" : "state",
    alsoSelected: [],
    blocks: [
      block("Machine", [navigate(machine, { kind: "target", subject: `machine:${machine}` })]),
      block("Leaves by", m.transitions.filter((t) => t.from === state).map((t) => line(describe(t))), {
        empty: "No transition leaves this state, so it is terminal in this machine.",
      }),
      block("Reached by", m.transitions.filter((t) => t.to === state).map((t) => line(describe(t))), {
        empty: state === m.initial
          ? "No transition reaches this state; it is where the machine starts."
          : "No transition reaches this state, so no execution enters it.",
      }),
    ],
  };
}

/**
 * The selection, resolved.
 *
 * **The encoding is the one the model already had.** `ViewState.selection` is untyped ids, and
 * `view.select` takes entity ids because that is what the agent examples pass. The shell widens
 * internally rather than changing the API or minting ids for relations: a legal id cannot contain a
 * colon, so `rel:…`, `model:…`, `machine:…` and `state:…` are unambiguous prefixes over the bare
 * entity id, and `parseRelationValue` / `parseElementValue` are the parsers the editing selects
 * already use. Relations therefore stay addressed by the composite `RelationRef` the view model
 * defines, which is what the design meant by refusing to invent relation ids.
 *
 * One pane inspects one thing. A multi-selection is resolved from its FIRST member, and the rest are
 * named — hiding them would make the pane disagree with `view.selection()` silently.
 */
export function inspectSelection(
  system: CanonicalSystem, selection: readonly string[],
): InspectorView {
  const first = selection[0];
  if (first === undefined) {
    return {
      state: "empty",
      message: "Nothing is selected. Select an entity or a relation — in the models rail, the "
        + "workspace, or through the agent API — and this pane shows what it is, what it carries, "
        + "the models it appears in, and what its absence would mean.",
    };
  }
  const rest = selection.slice(1);
  const inspection = resolve(system, first);
  if (inspection === null) {
    return {
      state: "unresolved",
      message: `"${first}" is selected and this model system declares nothing by that name. An edit `
        + "may have deleted it, or the name may be a misspelling; either way nothing is being "
        + "inspected. Select something the system declares.",
    };
  }
  return { state: "object", inspection: prune({ ...inspection, alsoSelected: rest }) };
}

/**
 * Drop the blocks that have nothing to say AND nothing to say about saying nothing.
 *
 * Done on the reading rather than in the renderer, so what a test asserts is what a reader gets. A
 * block with a null `empty` and no lines is one whose emptiness carries no information — the author
 * of the block said so by leaving `empty` null — and rendering its heading over a blank line is the
 * rendering fault an empty region always reads as.
 */
const prune = (i: Inspection): Inspection => ({
  ...i,
  blocks: i.blocks.filter((b) => b.lines.length > 0 || b.empty !== null),
});

function resolve(system: CanonicalSystem, value: string): Inspection | null {
  if (value.startsWith("rel:")) {
    const ref = parseRelationValue(value);
    if (ref === null) return null;
    const found = system.relations.find((r) =>
      r.model === ref.model
      && (ref.kind === "id"
        ? r.id === ref.id
        : r.from === ref.from && r.to === ref.to && r.type === ref.type));
    return found === undefined ? null : relationInspection(system, found);
  }
  if (value.startsWith("state:")) {
    const ref = parseElementValue(value);
    return ref === null || ref.kind !== "state" ? null : stateInspection(system, ref.machine, ref.state);
  }
  if (value.startsWith("entity:")) {
    const ref = parseElementValue(value);
    return ref === null || ref.kind !== "entity" || !system.entities.has(ref.id)
      ? null
      : entityInspection(system, ref.id);
  }
  const colon = value.indexOf(":");
  if (colon !== -1) {
    const kind = value.slice(0, colon);
    const id = value.slice(colon + 1);
    if (kind === "model") return system.models.has(id) ? modelInspection(system, id) : null;
    if (kind === "machine") return system.machines.has(id) ? machineInspection(system, id) : null;
    return null;
  }
  // A bare name. Entities are what an agent selects and what the canvas will select, so they win the
  // unprefixed form; a machine id is accepted too, because `subjects` numbers machines beside models
  // and a caller that passed one meant it.
  if (system.entities.has(value)) return entityInspection(system, value);
  if (system.machines.has(value)) return machineInspection(system, value);
  if (system.models.has(value)) return modelInspection(system, value);
  return null;
}

// --------------------------------------------------------------------------------------------
// The DOM
// --------------------------------------------------------------------------------------------

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, text?: string, className?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className !== undefined) node.className = className;
  return node;
};

/** Where a navigation link LANDS. A link needs a real destination, not a handler and a dead href. */
const DESTINATION: Readonly<Record<InspectorAction["kind"], string>> = {
  target: "workspace",
  select: "inspector",
};

function lineNode(l: InspectorLine): HTMLLIElement {
  const li = el("li");
  if (l.action === null) {
    li.textContent = l.text;
    return li;
  }
  const link = el("a", l.text);
  link.href = `#${DESTINATION[l.action.kind]}`;
  link.dataset["action"] = l.action.kind;
  link.dataset["arg"] = l.action.kind === "target" ? l.action.subject : l.action.selection;
  li.append(link);
  return li;
}

function blockNode(b: InspectorBlock): DocumentFragment {
  const frag = document.createDocumentFragment();
  const body = ((): HTMLElement => {
    if (b.lines.length === 0) return el("p", b.empty ?? "", "coverage");
    const list = el("ul", undefined, "notes");
    for (const l of b.lines) list.append(lineNode(l));
    return list;
  })();
  if (!b.disclosed) {
    frag.append(el("p", b.label, "sublabel"), body);
    return frag;
  }
  // A `<details>` rather than a class that hides: SH-I2 wants a control that is in the tab order and
  // announces its own expanded state, and `<summary>` is that control without any ARIA to maintain.
  const details = el("details");
  details.append(el("summary", b.label), body);
  frag.append(details);
  return frag;
}

function viewNode(view: InspectorView): DocumentFragment {
  const frag = document.createDocumentFragment();
  if (view.state !== "object") {
    frag.append(el("p", view.message));
    return frag;
  }
  const i = view.inspection;
  // Focusable, and reachable only programmatically. Activating a link inside the pane destroys the
  // link, so a keyboard user would be dropped on the document body with no idea where they are;
  // focus lands on the heading of what they just chose instead. `tabindex="-1"` keeps it out of the
  // tab sequence, so this adds no stop to the walk.
  const heading = el("h3", i.title);
  heading.tabIndex = -1;
  frag.append(heading);
  frag.append(el("p", "Type", "sublabel"), el("p", i.type));
  if (i.alsoSelected.length > 0) {
    frag.append(el("p",
      `Also selected, and not shown here: ${i.alsoSelected.join(", ")}. One pane inspects one thing.`,
      "coverage"));
  }
  for (const b of i.blocks) frag.append(blockNode(b));
  return frag;
}

export function mountInspector(ctx: ShellContext): ShellRegion {
  const region = regionHost("inspector");
  const body = byId("inspector-body");

  /**
   * ONE listener, bound once to markup the page ships, reading the link it was given.
   *
   * Delegation rather than a handler per link: the pane's content is rebuilt whenever the selection
   * moves, and a listener attached to a rebuilt element is a listener re-bound on every paint. The
   * link carries its own argument, so the handler needs no closure over the frame it was built in —
   * which also means it cannot act on a stale one.
   *
   * The default is NOT prevented. The href is a real in-page destination, so the browser moves the
   * reader to the region that just changed while the handler changes what the region shows.
   */
  body.addEventListener("click", (event) => {
    const from = event.target;
    if (!(from instanceof Element)) return;
    const link = from.closest<HTMLAnchorElement>("a[data-action]");
    if (link === null) return;
    const arg = link.dataset["arg"];
    if (arg === undefined) return;
    const name = link.textContent ?? arg;
    if (link.dataset["action"] === "target") {
      ctx.viewState.target = arg;
      ctx.announce(`Workspace now shows ${name}.`);
    } else {
      ctx.viewState.selection = [arg];
      ctx.announce(`Inspecting ${name}.`);
    }
    ctx.repaint();
  });

  /**
   * The content last rendered, as data.
   *
   * The pane is rebuilt only when its READING changes, which is what keeps an open disclosure open
   * and the caret where the user left it across the repaints its neighbours cause. Comparing the
   * typed reading rather than the system hash is deliberate: annotation does not advance the hash
   * (A1), so a note attached to the selected object is exactly the change a hash comparison would
   * miss — and notes are rendered here.
   */
  let rendered: string | null = null;

  return {
    paint: (frame: ShellFrame) => {
      mountIf(region, frame.state.loaded);
      const view = inspectSelection(frame.state.system, ctx.viewState.selection);
      const signature = JSON.stringify(view);
      if (signature === rendered) return;
      rendered = signature;
      const held = document.activeElement !== null && body.contains(document.activeElement);
      body.replaceChildren(viewNode(view));
      if (held) body.querySelector<HTMLElement>("h3")?.focus();
    },
  };
}
