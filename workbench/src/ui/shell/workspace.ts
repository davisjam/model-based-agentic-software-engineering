/**
 * The `workspace` region: the principal model — its purpose, its picture, its structured reading.
 *
 * This is the region correction 10 is about. The flat page put the canvas last in the document as
 * an epilogue after the whole textual database; the shell makes the diagram the visual centre
 * while keeping the structured reading first in DOM and in AT order. Those are two different
 * orderings of the same facts, and conflating them is how the old page ended up exhaustive.
 *
 * **The inversion is a stylesheet declaration, not a move.** `#workspace` is a one-column grid of
 * named rows and the figure takes the row under the model's question; `#model-reading` keeps its
 * place in the source, before the figure. Nothing here reorders a node, because reordering nodes is
 * the one way to make the visual fix an accessibility regression.
 *
 * **The canvas keeps `aria-hidden`** and the reading beneath it keeps being the accessible
 * representation: every fact in the picture is in the tree, so un-hiding the figure would duplicate
 * the model into the announcement storm FR-A11Y-3 exists to prevent. What the figure gains instead
 * is INPUT: a pointer selects a node or an edge, a right-click offers that object's operations, and
 * a right-click on blank canvas opens the additive `+ Add` menu. No drag gestures — ruled, G4.
 *
 * **Keyboard parity does not come from the canvas, and is not meant to.** Every act the figure
 * offers is reachable from the contents tree (selection), the Inspector's action bar (the declared
 * affordance for each operation) and ⌘K. §3.4 is explicit that the figure is a pointer surface
 * whose keyboard analogue is the tree, which is also why SH-I4 can hold: nothing focusable is
 * inside an `aria-hidden` subtree, so no caret can land where a screen reader says nothing.
 */
import type { CanonicalSystem, QueryResult } from "../../ir/types.ts";
import { modelsDeclaring } from "../../engine/graph.ts";
import { parseGraphQuery } from "../../engine/index.ts";
import type {
  AccessibleEdge, AccessibleNode, AccessibleScene, Point, RenderedView, SceneSubject,
} from "../../render/types.ts";
import { paintBudget, paintDiagram, paintPrincipal, fillSelect, svgElement } from "../render-dom.ts";
import { budgetViews } from "../../app/budget.ts";
import { bindingWords } from "../../app/services.ts";
import type { ComposedCrossModelView, ComposedPropertyView } from "../../app/services.ts";
import type { ComposedFocus } from "../../app/agent-api.ts";
import {
  resolveSelection, resolveSelections, resolveSubject, sceneNodeIdFor, selectionValue, subjectValue,
} from "../view-model.ts";
import type { SelectionRef } from "../view-model.ts";
import { byId, mountIf, sel } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { contextualActions } from "./edit-dialogs.ts";
import type { OpenDialog } from "./edit-dialogs.ts";
import { regionHost } from "./surfaces.ts";

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, text?: string, className?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className !== undefined) node.className = className;
  return node;
};

// --------------------------------------------------------------------------------------------
// Scene ids -> selection values
// --------------------------------------------------------------------------------------------

/**
 * What selecting this scene node means, in the encoding `ViewState.selection` already uses.
 *
 * The scene's node id is the entity id for a model and the state name for a machine, so the prefix
 * is all that has to be added — and it IS added rather than relying on the bare-name fallback in
 * `selectionKind`, because a state name and an entity id can collide and the bare form resolves to
 * the entity. Colons are safe as separators for the same reason the rest of the shell assumes: a
 * legal id cannot contain one.
 */
function nodeSelection(subject: SceneSubject, node: AccessibleNode): SelectionRef | null {
  if (node.role === "entity") return { kind: "entity", id: node.id };
  if (subject.kind === "machine") return { kind: "state", machine: subject.id, state: node.id };
  return null;
}

/**
 * What selecting this scene edge means, or null when the encoding cannot address it.
 *
 * Resolved against the SYSTEM rather than parsed out of the edge id. `buildScene` synthesises an id
 * for a relation the source left unnamed (`r:<type>:<from>:<to>`), so the id's shape would tell us
 * which encoding to use — but only by trusting that no author ever names a relation `r:…`, and a
 * wrong guess here deletes a different edge than the one the user clicked. The (model, from, to,
 * type) lookup answers the question the encoding actually asks.
 *
 * Containment and transition edges return null: `selectionKind` has no member for either, so there
 * is nothing to select them AS. They are read in the tree and are not activatable there.
 */
function edgeSelection(
  system: CanonicalSystem, subject: SceneSubject, edge: AccessibleEdge,
): SelectionRef | null {
  if (edge.kind !== "relation" || subject.kind !== "model") return null;
  const match = system.relations.find((r) =>
    r.model === subject.id && r.from === edge.from && r.to === edge.to && r.type === edge.via);
  if (match === undefined) return null;
  return {
    kind: "relation",
    ref: match.id !== null
      ? { kind: "id", model: subject.id, id: match.id }
      : { kind: "ends", model: subject.id, from: match.from, to: match.to, type: match.type },
  };
}

// --------------------------------------------------------------------------------------------
// The model contents tree (§3.2)
// --------------------------------------------------------------------------------------------

/**
 * One row of the contents tree, as a reading — before any element exists.
 *
 * The same arrangement `navRails` uses: the semantic content is TEXT in a typed value, so a test
 * asserts the product in `node:test` rather than asserting a stylesheet in a browser. `select` is
 * null for a row the selection encoding cannot address, which is a fact about the kernel and is
 * therefore a field rather than an omission.
 */
// --------------------------------------------------------------------------------------------
// The witness focus
// --------------------------------------------------------------------------------------------

/**
 * The resolved witness focus: which model to draw it over, and the answer whose evidence it is.
 *
 * Both fields come from running the question again, which is the whole posture: a focus names a
 * saved question, never a verdict, so an edit re-derives the picture instead of re-drawing a stale
 * one. That is step 8 of the structural loop — modify a relationship and the highlight moves — and
 * it is only free because nothing here is stored.
 */
export interface WitnessFocus {
  readonly subject: SceneSubject;
  readonly result: QueryResult;
}

/**
 * Where a saved question's witness can be drawn, or null when it cannot be drawn anywhere.
 *
 * **The model is DERIVED from the question, not chosen.** A graph question traverses one relation
 * type, and the models declaring that type are the models whose scene carries its hops —
 * `modelsDeclaring` is the same derivation `groundsFor` cites when it says a model "declares the
 * relations this statement traverses", and the same one a refusal uses to name the models that
 * would have to represent an absent relation. Picking any other model would put the emphasis on a
 * picture that did not produce it, which the renderer now declines to draw hops for anyway.
 *
 * Four nulls, each a real state rather than a failure:
 *
 *   - the focus names a question this revision does not save (an agent retracted it, or a paint
 *     raced a retraction);
 *   - the answer carries no evidence — a refusal, or a conclusive absence. "No witness" is a
 *     result, and a view that highlighted nothing while claiming a focus would say otherwise;
 *   - the question is not a graph question. Behavioral evidence is drawn over a MACHINE and the
 *     subject is already the machine being viewed, so a focus adds nothing there;
 *   - no model declares the relation, which is the refusal case: there is no picture to draw it on.
 */
export function witnessFocus(
  system: CanonicalSystem,
  queryId: string | null | undefined,
  run: (raw: unknown) => QueryResult,
): WitnessFocus | null {
  if (queryId === null || queryId === undefined) return null;
  const saved = system.queries.get(queryId);
  if (saved === undefined) return null;

  const raw = saved.raw;
  const q = typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  if (q["kind"] !== "graph") return null;
  const parsed = parseGraphQuery(q["graph"]);
  if (!parsed.ok) return null;

  const result = run(raw);
  if (result.evidence === null) return null;

  const model = modelsDeclaring(system, parsed.value.relation)[0];
  if (model === undefined) return null;
  return { subject: { kind: "model", id: model }, result };
}

export interface ContentsRow {
  readonly label: string;
  readonly detail: string;
  /**
   * What activating the row selects, or null for a row the selection encoding cannot address —
   * which is a fact about the kernel and is therefore a field rather than an omission.
   *
   * A `SelectionRef`, so a row cannot be built with a half-encoded value. `selectionValue` turns
   * it into the `data-select` attribute and into what the click handler sends, which is one
   * spelling by construction rather than two by habit.
   */
  readonly select: SelectionRef | null;
}

/** The principal model as structure: the subject itself, then its nodes, then its edges. */
export interface ModelContents {
  /**
   * The drawn subject, as a selectable row — the model or machine the tree is the contents OF.
   *
   * **This row exists because wave 1d found a control nobody could reach.**
   * `inspector.delete-model`'s button is enabled only for a `selection:model`, and until this row
   * there was no human act that produced one: the tree encoded entities, states and relations and
   * null for everything else, so a person could delete an entity, a relation or a note and could
   * not delete a model, while an agent could through `view.select("model:x")`. That asymmetry was
   * the single member of the registry's path-less set (`DESIGN-shell-261002.md` §9f).
   *
   * It is the FIRST row, not an appendix, because the tree is a containment reading and the
   * container is what it is a reading of — "this model, and here is what is in it". Selecting it
   * also reaches the machine case (`selection:machine`), which the editing catalogue's rename
   * action already declared a precondition for and no route established.
   */
  readonly subject: ContentsRow;
  readonly subjectHeading: string;
  readonly nodeHeading: string;
  readonly edgeHeading: string;
  readonly nodes: readonly ContentsRow[];
  readonly edges: readonly ContentsRow[];
}

/**
 * The reading, derived from the scene the renderer returned for the SVG in the same paint.
 *
 * Pure, and the per-row sentence is the scene's own `description` — assembled by the component that
 * knows what it drew and why, rather than re-phrased here, which is the rule `AccessibleScene`'s
 * own header sets. Nothing in this function knows about the picture's geometry, and nothing in it
 * invents a fact the scene does not carry.
 */
export function modelContents(
  scene: AccessibleScene, system: CanonicalSystem,
): ModelContents {
  const subject = scene.subject;
  const machine = subject.kind === "machine";
  // The label comes from the system rather than from the scene, because the scene names what it
  // DREW and the row names what the reader may act ON — and the one act the row licenses, deleting
  // a model, is addressed by id. Falling back to the id keeps the row selectable for a subject the
  // renderer drew from a revision the system has since left.
  const subjectLabel = machine
    ? system.machines.get(subject.id)?.id ?? subject.id
    : system.models.get(subject.id)?.label ?? subject.id;
  const question = (machine ? system.machines.get(subject.id) : system.models.get(subject.id))
    ?.purpose.question ?? "";
  return {
    subjectHeading: machine ? "This machine" : "This model",
    subject: {
      label: subjectLabel,
      // The engineering question, which is the one fact about a model that is not in any row below
      // it. UX-I4's claim is that a model viewed is a model whose purpose is visible; the row says
      // it again in the place a reader is deciding whether to act on the whole model.
      detail: question,
      select: { kind: subject.kind, id: subject.id },
    },
    nodeHeading: `${machine ? "States" : "Entities"} — ${scene.nodes.length}`,
    edgeHeading: `${machine ? "Transitions" : "Relations"} — ${scene.edges.length}`,
    nodes: scene.nodes.map((n) => {
      const marks = n.emphasis.map((a) => a.kind).join(", ");
      return {
        label: marks === "" ? n.label : `${n.label} (${marks})`,
        detail: n.description,
        select: nodeSelection(subject, n),
      };
    }),
    edges: scene.edges.map((e) => ({
      label: `${e.fromLabel} — ${e.via === null ? e.kind : e.via} → ${e.toLabel}`,
      detail: e.description,
      select: edgeSelection(system, subject, e),
    })),
  };
}

/**
 * One activatable row of the tree.
 *
 * A `button` inside a list item, not a `role="treeitem"` inside a `role="tree"`. A real tree widget
 * owes arrow-key navigation, a roving `tabindex`, `aria-expanded` on every branch and
 * `aria-selected` management, all hand-written and all able to drift; a nested list of buttons and
 * `details` gets list semantics, disclosure semantics and tab order from the browser. The tree is
 * an interaction surface because activating a row SELECTS — which is the claim §3.2 makes — not
 * because it reproduces a desktop control.
 */
function treeRow(
  label: string, detail: string, ref: SelectionRef | null, selected: boolean,
  onSelect: (ref: SelectionRef) => void,
): HTMLElement {
  const li = el("li");
  const value = ref === null ? null : selectionValue(ref);
  if (value === null || ref === null) {
    li.append(el("span", label, "sublabel"));
  } else {
    const button = el("button", label);
    button.type = "button";
    // The ENCODING, stamped where a reader of the page can see it. Not decoration: the generated
    // path drive has to establish `selection:element`, `selection:relation` and `selection:model`,
    // and before this attribute its only handles were the row's INDEX (the first button) and its
    // rendered prose (an edge row was the one containing "→"). Both are the parse-the-presentation
    // failure `checkModelPlurality` was written about, and both break the day a row is added —
    // which adding the subject row above is exactly the case of. One attribute, and the routines
    // read structure.
    button.dataset.select = value;
    // `aria-current` rather than `aria-selected`: the latter is only meaningful inside a widget
    // role this list deliberately does not claim. A screen reader announces "current" here.
    if (selected) {
      button.setAttribute("aria-current", "true");
      button.className = "selected";
    }
    button.addEventListener("click", () => { onSelect(ref); });
    li.append(button);
  }
  if (detail !== "") {
    const d = el("details");
    d.append(el("summary", "What this says"), el("p", detail));
    li.append(d);
  }
  return li;
}

/** The reading, as DOM. The structure is `modelContents`'s; this decides only how it looks. */
function paintContents(
  scene: AccessibleScene | null, system: CanonicalSystem | null, selection: readonly string[],
  root: HTMLElement, onSelect: (ref: SelectionRef) => void,
): void {
  root.replaceChildren();
  if (scene === null || system === null) {
    // "No model is loaded" was wrong here for the reason `paintPrincipal`'s note gives: the state
    // that reaches this branch is a loaded system declaring no model. The purpose block above
    // already names the next act, so this says only why the reading is empty.
    root.append(el("p", "No model is being viewed, so there are no contents to read.", "intro"));
    return;
  }
  const contents = modelContents(scene, system);
  // Compared as the ENCODED value, which is the whole point of there being one encoder: the row
  // marked current is the row whose ref spells the same thing the wire holds, whichever surface
  // wrote it. The bare agent spelling resolves through `resolveSelection` first, so
  // `view.select(["analytics"])` lights the tree row the human click would have lit.
  const selected = resolveSelection(system, selection[0]);
  const current = selected.kind === "none" || selected.kind === "unresolved"
    ? null
    : selectionValue(selected);
  const group = (heading: string, rows: readonly ContentsRow[]): void => {
    root.append(el("p", heading, "sublabel"));
    const ul = el("ul", undefined, "notes");
    for (const r of rows) {
      const value = r.select === null ? null : selectionValue(r.select);
      ul.append(treeRow(r.label, r.detail, r.select, value !== null && value === current, onSelect));
    }
    root.append(ul);
  };
  // The subject first: the thing the tree is a reading OF, before the things in it.
  group(contents.subjectHeading, [contents.subject]);
  group(contents.nodeHeading, contents.nodes);
  group(contents.edgeHeading, contents.edges);
}

// --------------------------------------------------------------------------------------------
// The composed view — composition made perceptible (§23)
// --------------------------------------------------------------------------------------------

/**
 * What the workspace paints when composition is the thing being looked at: a cross-model property
 * over the models that state it, or one binding over the two subjects it corresponds.
 *
 * Normal browsing keeps the clean one-model view; this branch exists for exactly the moments where
 * hiding the composition would conceal the inference — a claim like the Worker Queue's lease
 * invariant draws `processing` from one machine and `free` from another, and a workspace that
 * showed either machine alone would present a verdict whose vocabulary is not on screen.
 *
 * Everything semantic on this surface is QUOTED: the registry's `interpretation`, `licensing` and
 * `witness` sentences arrive through `bindingWords`, the constraint's reading is the engine's own
 * `describePredicate` sentence, and the panels are the per-type renderers' own views composed by
 * `src/app/cross-model.ts`. This module decides placement and disclosure, never wording.
 */
type ComposedPaint =
  | { readonly kind: "property"; readonly view: ComposedPropertyView }
  | {
      readonly kind: "element";
      readonly element: string;
      readonly focus: string | null;
      readonly view: ComposedCrossModelView;
    };

/** The derived composed views, as subject-chooser choices. The value a choice carries. */
export const composedChoiceValue = (element: string): string => `composed:${element}`;

/**
 * Resolve the composed focus against the live frame, or null when it no longer resolves — the
 * property was retracted, a subject deleted, or the claim stopped being cross-model after an edit.
 * Null falls back to the one-model paint; the focus itself is left for the next navigation act to
 * clear, the same posture `witnessFocus` takes toward a retracted question.
 */
function resolveComposed(
  ctx: ShellContext, focus: ComposedFocus | null | undefined,
): ComposedPaint | null {
  if (focus === null || focus === undefined) return null;
  if (focus.kind === "property") {
    const view = ctx.workspace.composePropertyView(focus.id);
    return view === null || view.base.panels.length < 2 ? null : { kind: "property", view };
  }
  const derived = ctx.workspace.derivedComposedViews()
    .find((d) => d.elements.includes(focus.id));
  if (derived === undefined) return null;
  const panels = derived.subjects.map((s) => ({
    type: s.kind === "machine" ? ("state-machine" as const) : ("structural-graph" as const),
    id: s.id,
  }));
  if (panels.length < 2) return null;
  const view = ctx.workspace.composeCrossModelView({ panels, selection: [...derived.elements] });
  // The canonical element keys the subject-chooser option, so the chooser reflects the view even
  // when it was reached through a sibling element of the same subject set.
  return {
    kind: "element", element: derived.elements[0] ?? focus.id,
    focus: focus.focus ?? null, view,
  };
}

/** One registry row's reading, as a disclosure. The words are `bindingWords`' quotations. */
function bindingDisclosure(
  view: ComposedCrossModelView, name: string, openByDefault: boolean,
): HTMLElement | null {
  const members = view.connections.filter((c) => c.relation.entry.name === name);
  const first = members[0];
  if (first === undefined) return null;
  const words = bindingWords(first.relation);
  const details = el("details");
  details.dataset["binding"] = name;
  if (openByDefault) details.open = true;
  const pairs = members.map((c) => `${c.from.label} and ${c.to.label}`).join("; ");
  details.append(el("summary", `${words.label} — ${pairs}`));
  const body = el("div");
  body.append(el("p", words.interpretation, "purpose"));
  body.append(el("p", words.licensing));
  body.append(el("p", words.witness));
  if (words.byConstruction) {
    // The honest answer for `appears-in`: nothing declares it, and SAYING SO is the lesson. No
    // link is offered, because there is no declaration to land on.
    body.append(el("p",
      "There is no declaration to navigate to: the correspondence follows from the construction "
      + "above, not from anything an author wrote.", "caveat"));
  } else {
    for (const c of members) {
      // The declaration lives on the SOURCE side of the correspondence — the machine whose
      // authored `entity:` key, or the entity whose authored property, establishes it. The link
      // draws that subject alone, where the Inspector shows the authored key.
      const link = document.createElement("a");
      link.href = "#workspace";
      link.dataset["composedDraw"] = c.from.panel;
      link.textContent = `See the declaration on ${c.from.label}`;
      const p = el("p");
      p.append(link);
      body.append(p);
    }
  }
  details.append(body);
  return details;
}

/** The composed reading: panels, bindings, the constraint, and what was not drawn. */
function paintComposedContents(paint: ComposedPaint, root: HTMLElement): void {
  root.replaceChildren();
  const view = paint.kind === "property" ? paint.view.base : paint.view;

  root.append(el("p", "The models shown together", "sublabel"));
  const panelList = el("ul", undefined, "notes");
  for (const panel of view.panels) {
    const li = el("li");
    const link = document.createElement("a");
    link.href = "#workspace";
    link.dataset["composedDraw"] = panel.key;
    link.textContent = panel.view.accessible.title;
    li.append(link, el("p", `${panel.type.label} — shown in its own boundary; activate to view it `
      + "alone.", "purpose"));
    panelList.append(li);
  }
  root.append(panelList);

  root.append(el("p", "Where their meanings meet", "sublabel"));
  const names = [...new Set(view.connections.map((c) => c.relation.entry.name))];
  if (names.length === 0) {
    root.append(el("p",
      "The kernel declares no correspondence these panels witness, so no line is drawn between "
      + "them.", "caveat"));
  }
  const bindingList = el("ul", undefined, "notes");
  for (const name of names) {
    const disclosure = bindingDisclosure(
      view, name, paint.kind === "element" && paint.focus === name);
    if (disclosure === null) continue;
    const li = el("li");
    li.append(disclosure);
    bindingList.append(li);
  }
  root.append(bindingList);

  if (paint.kind === "property") {
    root.append(el("p", "The constraint being checked", "sublabel"));
    const constraint = paint.view.accessible.constraint;
    const block = el("div");
    block.dataset["constraint"] = paint.view.accessible.property.id;
    block.append(el("p", constraint.text));
    block.append(el("p", constraint.drawn
      ? "Drawn as the dotted line beside the machines — the property's own obligation, not a "
        + "binding."
      : constraint.why ?? "", constraint.drawn ? "purpose" : "caveat"));
    if (constraint.ends.length > 0) {
      block.append(el("p", "It constrains "
        + constraint.ends.map((e) => `${e.state} (in ${e.machine})`).join(" and ") + ".", "purpose"));
    }
    root.append(block);
  }

  if (view.undrawn.length > 0) {
    const undrawn = el("details");
    undrawn.append(el("summary",
      `Registered correspondences not drawn here — ${view.undrawn.length}`));
    const ul = el("ul", undefined, "notes");
    for (const u of view.accessible.undrawn) {
      const li = el("li");
      li.append(el("span", u.label, "state"), document.createTextNode(` ${u.why}`));
      ul.append(li);
    }
    undrawn.append(ul);
    root.append(undrawn);
  }

  for (const refusal of view.accessible.refusals) {
    root.append(el("p", refusal, "caveat"));
  }
}

// --------------------------------------------------------------------------------------------
// The canvas as an input surface (G4)
// --------------------------------------------------------------------------------------------

/** What the pointer landed on, in the SVG's own data attributes. */
function hit(target: EventTarget | null): { kind: "node" | "edge"; id: string } | null {
  if (!(target instanceof Element)) return null;
  const node = target.closest("[data-node-id]");
  if (node !== null) {
    const id = node.getAttribute("data-node-id");
    if (id !== null) return { kind: "node", id };
  }
  const edge = target.closest("[data-edge-id]");
  if (edge !== null) {
    const id = edge.getAttribute("data-edge-id");
    if (id !== null) return { kind: "edge", id };
  }
  return null;
}

export function mountWorkspace(ctx: ShellContext, openDialog?: OpenDialog): ShellRegion {
  const region = regionHost("workspace");
  const subjectChoice = sel("diagram-subject");
  const principalPurpose = byId("principal-purpose");
  const modelDetail = byId("model-detail");
  const modelContents = byId("model-contents");
  const diagramText = byId("diagram-text");
  const modelBudget = byId("model-budget");
  const canvas = byId("canvas");
  const canvasMenu = byId("canvas-menu");
  const addMenu = byId<HTMLDetailsElement>("add-menu");

  /**
   * Node positions from the last render, fed back in as hints.
   *
   * Incremental layout never moves a hinted node, so adding one state perturbs the picture locally
   * instead of re-ranking the world. Comparing a model against a hypothetical variant is the core
   * interaction, and it is unreadable if everything shifts.
   */
  let positionHints: ReadonlyMap<string, Point> = new Map();

  /** The scene of the last paint, so a pointer event can resolve what it hit without re-rendering. */
  let painted: { scene: AccessibleScene; system: CanonicalSystem } | null = null;

  /** Whether the last paint drew a composition — the canvas click dispatches on it. */
  let composedActive = false;

  const closeMenu = (): void => { canvasMenu.hidden = true; canvasMenu.replaceChildren(); };

  const select = (ref: SelectionRef): void => {
    // The WIRE is strings — `view.selection()` returns them and an agent passes them — so the one
    // encoder runs here, at the single boundary between the shell's typed refs and that wire.
    ctx.viewState.selection = [selectionValue(ref)];
    closeMenu();
    ctx.repaint();
  };

  subjectChoice.addEventListener("change", () => {
    const value = subjectChoice.value;
    if (value.startsWith("composed:")) {
      // A derived composed view, offered in the same list as the one-model subjects (author
      // ruling, 261006): choosing it draws the composition the model itself encodes. The
      // one-model target is untouched, so choosing a model again returns to it.
      ctx.viewState.composed = { kind: "element", id: value.slice("composed:".length) };
    } else {
      ctx.viewState.target = value;
      // Choosing a subject is asking for the one-model view of it, so a standing composition ends.
      ctx.viewState.composed = null;
    }
    // Drop the hints: they describe the previous subject's layout, and a state id that happens to
    // match an entity id would pin an unrelated node to a position from a different picture.
    positionHints = new Map();
    closeMenu();
    ctx.repaint();
  });

  /**
   * The composed view's own navigation, delegated to the region so the links the paint rebuilds
   * carry only data. Two acts: leave the composition, or draw one of its panels alone — both
   * plain navigations, which is why they are anchors and not buttons.
   */
  region.addEventListener("click", (event) => {
    const from = event.target;
    if (!(from instanceof Element)) return;
    if (from.closest("a[data-composed-exit]") !== null) {
      ctx.viewState.composed = null;
      ctx.announce("Back to the one-model view.");
      ctx.repaint();
      return;
    }
    const draw = from.closest<HTMLAnchorElement>("a[data-composed-draw]");
    if (draw !== null) {
      const arg = draw.dataset["composedDraw"];
      if (arg === undefined) return;
      ctx.viewState.composed = null;
      ctx.viewState.target = arg;
      ctx.announce(`Workspace now draws ${draw.textContent ?? arg} alone. The Inspector shows `
        + "the selected object's declarations.");
      ctx.repaint();
    }
  });

  /** The selection value for whatever the pointer hit, or null for blank canvas. */
  const hitSelection = (target: EventTarget | null): SelectionRef | null => {
    const h = hit(target);
    if (h === null || painted === null) return null;
    if (h.kind === "node") {
      const node = painted.scene.nodes.find((n) => n.id === h.id);
      return node === undefined ? null : nodeSelection(painted.scene.subject, node);
    }
    const edge = painted.scene.edges.find((e) => e.id === h.id);
    return edge === undefined ? null : edgeSelection(painted.system, painted.scene.subject, edge);
  };

  // A left click selects. Nothing else: G4 forecloses drag-to-connect, and a click that also
  // navigated would steal the target the user chose in the rail (SH-I6's spirit, one level down).
  //
  // On a COMPOSED canvas the click's object is a binding line or the constraint, and the act is
  // disclosure rather than selection: the pointer reaches the same reading the keyboard reaches
  // through "The composition in words" — §3.4's rule, a pointer surface whose keyboard analogue
  // is the structured reading.
  canvas.addEventListener("click", (event) => {
    closeMenu();
    if (composedActive) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const reading = byId<HTMLDetailsElement>("model-reading");
      const name = target.closest("[data-xmodel]")?.getAttribute("data-xmodel")
        ?? target.closest("[data-xmodel-label]")?.getAttribute("data-xmodel-label");
      if (name !== undefined && name !== null) {
        reading.open = true;
        const details = modelContents.querySelector<HTMLDetailsElement>(
          `details[data-binding="${name}"]`);
        if (details !== null) {
          details.open = true;
          details.querySelector<HTMLElement>("summary")?.focus();
        }
        ctx.announce(`Binding ${name}. The composition reading states what it asserts and why `
          + "it is licensed.");
        return;
      }
      if (target.closest('[data-layer="property-constraint"]') !== null) {
        reading.open = true;
        const block = modelContents.querySelector<HTMLElement>("[data-constraint]");
        if (block !== null) {
          block.tabIndex = -1;
          block.focus();
        }
        ctx.announce("The property's own constraint — not a binding. The reading states it in "
          + "words.");
      }
      return;
    }
    const value = hitSelection(event.target);
    if (value !== null) select(value);
  });

  /**
   * Right-click: this object's operations, or `+ Add` on blank canvas.
   *
   * Blank canvas DISCLOSES THE EXISTING MENU rather than rendering a second additive one. `#add-menu`
   * already holds the five additive operations as their declared affordance sites; a cloned menu
   * would be five more buttons offering the same capability, and the one thing §9c's palette note
   * establishes is that a surface deriving from the catalogue must not also claim the catalogue's
   * sites. So the gesture opens the real menu and moves focus there, which is also the keyboard
   * route a user who never right-clicks takes.
   */
  canvas.addEventListener("contextmenu", (event) => {
    const value = hitSelection(event.target);
    event.preventDefault();
    if (value === null) {
      closeMenu();
      addMenu.open = true;
      byId("add-menu-summary").focus();
      ctx.announce("Blank canvas: the Add menu is open.");
      return;
    }
    select(value);
    ctx.repaint();
    if (painted === null) return;
    const actions = contextualActions(value);
    canvasMenu.replaceChildren();
    canvasMenu.append(el("p", selectionValue(value), "id"));
    if (actions.length === 0 || openDialog === undefined) {
      canvasMenu.append(el("p", "No operation applies to this object.", "hint"));
    }
    for (const action of actions) {
      if (openDialog === undefined) break;
      const button = el("button", action.label);
      button.type = "button";
      button.addEventListener("click", () => {
        closeMenu();
        openDialog(action.form, action.prefill);
      });
      canvasMenu.append(button);
    }
    canvasMenu.style.left = `${event.clientX}px`;
    canvasMenu.style.top = `${event.clientY}px`;
    canvasMenu.hidden = false;
  });

  // Dismissal, both ways out. A menu that survived the next click would sit over the picture it
  // describes; one that survived Escape would be the only surface on the page that does.
  document.addEventListener("click", (event) => {
    if (canvasMenu.hidden) return;
    if (event.target instanceof Node && canvasMenu.contains(event.target)) return;
    closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !canvasMenu.hidden) closeMenu();
  });

  /** The composed paint: the three central hosts carry the composition instead of one model. */
  const paintComposedFrame = (composed: ComposedPaint, frame: ShellFrame): void => {
    const view = composed.kind === "property" ? composed.view.base : composed.view;

    principalPurpose.replaceChildren();
    const head = el("p");
    if (composed.kind === "property") {
      const facts = composed.view.accessible.property;
      head.append(el("strong", facts.statement));
      principalPurpose.append(head);
      const row = frame.vm.properties.find((p) => p.id === facts.id);
      if (row !== undefined) {
        const state = el("p");
        state.append(el("span", row.kind, "state"), document.createTextNode(" "),
          el("span", row.status, "state"));
        principalPurpose.append(state);
      }
      principalPurpose.append(el("p",
        "A cross-model claim: no single model states it. The workspace shows the models its "
        + "vocabulary spans, the bindings that establish they concern the same element, and the "
        + "constraint being checked.", "purpose"));
    } else {
      head.append(el("strong",
        `${view.accessible.panels.map((p) => p.scene.title).join(" + ")} — bound on `
        + composed.element));
      principalPurpose.append(head);
      principalPurpose.append(el("p",
        "A composed view the model itself encodes: these reductions all name "
        + `${composed.element}, and the registered bindings between them are drawn. Each model `
        + "remains its own reduction; the reading below quotes what each binding asserts and why "
        + "it is licensed.", "purpose"));
    }
    const back = document.createElement("a");
    back.href = "#workspace";
    back.dataset["composedExit"] = "";
    back.textContent = "Back to the one-model view";
    const backRow = el("p");
    backRow.append(back);
    principalPurpose.append(backRow);

    modelDetail.replaceChildren();
    modelBudget.replaceChildren();
    paintComposedContents(composed, modelContents);

    diagramText.replaceChildren();
    diagramText.append(el("p", view.accessible.summary, "intro"));
    if (composed.kind === "property") {
      diagramText.append(el("p", composed.view.accessible.constraint.text));
    }

    canvas.replaceChildren(
      svgElement(composed.kind === "property" ? composed.view.tree : composed.view.tree));
  };

  return {
    paint: (frame: ShellFrame) => {
      // SH-I1's other half. Read from the same field Start reads, so the two regions cannot both
      // claim the page.
      mountIf(region, frame.state.loaded);

      // The subject list offers the one-model views AND the composed views the model's bindings
      // license — "it just shows what the underlying model already encodes as modeled". The
      // composed choices are derived per paint, so an edit that severs a binding withdraws its
      // view from the list on the next frame.
      const derivedViews = frame.state.loaded ? ctx.workspace.derivedComposedViews() : [];
      fillSelect(subjectChoice, [
        ...frame.vm.subjects,
        ...derivedViews.map((d) => ({
          value: composedChoiceValue(d.elements[0] ?? ""),
          label: `${d.subjects.map((s) => s.id).join(" + ")} — bound on `
            + (d.elements.length <= 2
              ? d.elements.join(", ")
              : `${d.elements.length} shared elements`),
        })),
      ]);
      const subject = resolveSubject(frame.state.system, ctx.viewState.target);
      if (subject !== null) subjectChoice.value = subjectValue(subject);

      // Composition first: when a composed view or a cross-model property is the thing being
      // looked at, the composed canvas replaces the one-model view — and every act that
      // re-targets the one-model view clears it, so normal browsing never meets this branch.
      const composed = frame.state.loaded
        ? resolveComposed(ctx, ctx.viewState.composed)
        : null;
      composedActive = composed !== null;
      byId("model-reading-summary").textContent = composedActive
        ? "The composition in words"
        : "The model in words";
      if (composed !== null) {
        if (composed.kind === "element") {
          subjectChoice.value = composedChoiceValue(composed.element);
        }
        paintComposedFrame(composed, frame);
        painted = null;
        return;
      }

      // One subject at a time, chosen by the user or by `window.mage.view.focus`.
      //
      // EVIDENCE IS PASSED ONLY FOR A FOCUS SOMEBODY ASKED FOR. The property list answers every
      // saved question at once, so there is no single "current result" to emphasise, and picking one
      // would be the UI inventing a focus the user did not ask for. `ViewState.witness` is that ask,
      // from a person (the answer's "Show on the diagram") or from an agent
      // (`window.mage.view.witness`) — so the default paint is unchanged and the focused paint is a
      // navigation state like `target` and `selection` beside it.
      //
      // The focus is RE-RUN here rather than carried from wherever it was set, which is what makes
      // step 8 of the structural loop work: edit a relation, and the next paint re-derives the
      // witness over the new revision. A stored evidence object would highlight last revision's
      // answer, which is the one failure mode a view must never have.
      //
      // It applies only while the drawn subject IS the model that carried the answer. Switching the
      // subject picker therefore drops the emphasis instead of projecting a witness onto a picture
      // that did not produce it — the same leak `deriveEvidenceEmphasis` now refuses hops for, held
      // here as well because the two guards answer to different readers.
      const focus = witnessFocus(
        frame.state.system, ctx.viewState.witness, (raw) => ctx.workspace.query(raw));
      const focused = focus !== null && subject !== null
        && focus.subject.kind === subject.kind && focus.subject.id === subject.id
        ? focus.result
        : null;

      let view: RenderedView | null = null;
      if (subject !== null) {
        // The renderer's `selection` is SCENE NODE IDS, a different vocabulary from the wire
        // encoding — so it is converted rather than forwarded. Forwarding is what used to happen,
        // and a tree selection arrived as `entity:analytics`, matched no node, and drew no
        // emphasis at all.
        const nodeIds = resolveSelections(frame.state.system, ctx.viewState.selection)
          .map(sceneNodeIdFor)
          .filter((id): id is string => id !== null);
        view = ctx.workspace.renderView({
          subject,
          selection: nodeIds,
          hints: positionHints,
          // Outcome and coverage travel WITH the evidence, never without it: V22 downgrades a
          // treatment under bounded coverage, and the renderer cannot apply that rule to evidence
          // whose coverage it was not given.
          evidence: focused?.evidence ?? null,
          outcome: focused?.outcome ?? null,
          coverage: focused?.coverage ?? null,
        });
        positionHints = view.positions;
      }
      painted = view === null ? null : { scene: view.accessible, system: frame.state.system };
      // §5.1: the model being viewed states its purpose beside the picture, above the picture, in
      // text. Correction 2 puts the represents/omits grounds one disclosure deeper, in `#model-detail`.
      paintPrincipal(frame.vm.principal, principalPurpose, modelDetail);
      // ONE `RenderedView`, THREE projections. The renderer's contract makes the SVG unobtainable
      // without its structured twin, and this call site is the reason that matters: the picture, the
      // reading and the contents tree come from one return value, so they cannot describe different
      // revisions (SH-I7).
      paintContents(
        view?.accessible ?? null, frame.state.loaded ? frame.state.system : null,
        ctx.viewState.selection, modelContents, select,
      );
      paintDiagram(view?.accessible ?? null, view?.tree ?? null, { text: diagramText, canvas });

      // The resource budget, beside the picture rather than instead of it. A quantitative model is
      // its own subject with its own projection, so it is NOT selected by the subject chooser and
      // does not compete with the principal model for the canvas: a budget and a dependency graph
      // answer different questions about the same components, and showing one at a time would make
      // the student choose which to look at.
      //
      // Empty when the system declares no quantitative model, which is why the region's CSS keys on
      // `:not(:empty)`. A refusal is NOT painted here: a declared model that cannot be read is a
      // defect in the source, and validation is the surface that reports it — a second report in the
      // workspace would be the same finding twice, in the place with the least context for it.
      paintBudget(
        frame.state.loaded ? budgetViews(frame.state.system).views : [],
        modelBudget,
      );
    },
  };
}
