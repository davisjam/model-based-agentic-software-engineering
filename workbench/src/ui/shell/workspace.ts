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
import { paintBudget, paintDiagram, paintPrincipal, fillSelect } from "../render-dom.ts";
import { budgetViews } from "../../app/budget.ts";
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

  const closeMenu = (): void => { canvasMenu.hidden = true; canvasMenu.replaceChildren(); };

  const select = (ref: SelectionRef): void => {
    // The WIRE is strings — `view.selection()` returns them and an agent passes them — so the one
    // encoder runs here, at the single boundary between the shell's typed refs and that wire.
    ctx.viewState.selection = [selectionValue(ref)];
    closeMenu();
    ctx.repaint();
  };

  subjectChoice.addEventListener("change", () => {
    ctx.viewState.target = subjectChoice.value;
    // Drop the hints: they describe the previous subject's layout, and a state id that happens to
    // match an entity id would pin an unrelated node to a position from a different picture.
    positionHints = new Map();
    closeMenu();
    ctx.repaint();
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
  canvas.addEventListener("click", (event) => {
    const value = hitSelection(event.target);
    closeMenu();
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

  return {
    paint: (frame: ShellFrame) => {
      // SH-I1's other half. Read from the same field Start reads, so the two regions cannot both
      // claim the page.
      mountIf(region, frame.state.loaded);

      fillSelect(subjectChoice, frame.vm.subjects);
      const subject = resolveSubject(frame.state.system, ctx.viewState.target);
      if (subject !== null) subjectChoice.value = subjectValue(subject);

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
