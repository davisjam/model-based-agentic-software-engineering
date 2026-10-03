/**
 * The `nav-models` and `nav-properties` rails: the two principal navigation objects.
 *
 * Corrections 2 and 6 are this module's reason to exist. `Models: 3 row(s) / Id / Label / Kind /
 * Detail` was a debug representation of a navigation surface; each model's NAME over its PURPOSE
 * QUESTION is the human one, and activating it draws that model. The properties rail is the place
 * the author asked for MORE rather than less: a mark and a status word beside every tracked claim,
 * with the claim's full reading one disclosure down, and each claim linking to a model it derives
 * from.
 *
 * **The §9a decision, recorded because the design asked whoever took this wave to make it.** The
 * view-model-to-DOM binder wrote all four readouts including the property list, and wave 3 owns
 * that file; a rail cannot change how a property row reads without either growing a renderer here
 * or editing the binder. BOTH, in one direction:
 *
 *   - the rail's ROW is a new rendering — a mark, a word, a claim, a disclosure — not a restyled
 *     `propertyBlock`, so there was nothing to lift out of the binder and the renderer is here;
 *   - the binder gave up the one root it no longer writes. Leaving it writing `#question-list`
 *     would make two authors race on paint order, and which one won would be a fact about the
 *     order of two statements in the composition root rather than a decision anybody made.
 *
 * A removal is also the direction wave 3's work in that file already runs (it deletes the dead form
 * code); a SPLIT — four readouts into four regions — is what wave 0 refused and what would have
 * collided. The full reading is still rendered by `propertyBlock`, imported from the binder, so one
 * module still decides how a property reads in full and the rail decides only what is visible first.
 *
 * **Nothing here is a command, so nothing here is a button** — the rule `shell/inspector.ts` set
 * for the same reason. Every control in the rails navigates: a model link draws that model, a claim
 * link moves the workspace to a model the claim derives from, and the two `+` rows go to the
 * control that performs the operation, resolved from the capability registry's own declaration of
 * where that control is. A rail that minted its own Add button would be a control the registry does
 * not declare, which the browser tier reads as an unregistered site — correctly. The `+ Add` MENUS
 * correction 4 sketches are the editing wave's, and they will re-site those affordances rather than
 * add new ones.
 *
 * **The member sets are derived, never enumerated.** The models rail walks `vm.subjects`, which is
 * the one list of drawable purposeful models — one per model AND one per machine, because a machine
 * carries its own purpose and a rail built from `system.models` alone would report worker-queue as
 * having one model and be wrong. The properties rail walks `vm.properties`. Neither list is
 * reconstructed here, so neither can disagree with the surface that already has it.
 */
import type { CapabilityId } from "../../app/capabilities.ts";
import { CAPABILITIES } from "../../app/capabilities.ts";
import type { PropertyStatus } from "../../app/properties.ts";
import type { CanonicalSystem } from "../../ir/types.ts";
import { propertyBlock } from "../render-dom.ts";
import { purposeBlock, resolveSubject, subjectValue } from "../view-model.ts";
import type { PropertyRow, ViewModel } from "../view-model.ts";
import { byId, mountIf } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost, surfaceElement } from "./surfaces.ts";

// --------------------------------------------------------------------------------------------
// The reading
// --------------------------------------------------------------------------------------------

/** One model in the rail: what it is called, what it asks, and whether it is the one being drawn. */
export interface ModelRailRow {
  /** The `kind:id` subject value — what activating the row assigns to `ViewState.target`. */
  readonly subject: string;
  readonly name: string;
  /** The purpose question, or the sentence saying the model states none. Never empty. */
  readonly question: string;
  /** The model declares no question, so `question` is a statement about that absence. */
  readonly unstated: boolean;
  readonly current: boolean;
}

/**
 * The three-valued mark the author drew as `✓ / ✗ / ?`.
 *
 * A GLYPH and a WORD together. The glyph is the three-valued summary a sighted reader takes in at a
 * glance; the word is the six-valued truth, because `?` over four different statuses would say less
 * than the status does and the house rule refuses a glyph carrying a status alone.
 */
export interface RailMark {
  readonly glyph: string;
  readonly word: string;
}

/** One tracked claim in the rail. */
export interface PropertyRailRow {
  readonly id: string;
  readonly mark: RailMark;
  readonly claim: string;
  /** "requirement" or "property" — §13's distinction, as the word it already is. */
  readonly kind: string;
  /**
   * Where activating the claim takes the workspace, or null when the claim grounds in nothing.
   *
   * Null is a fact, not a gap: a status with no grounding is UX-I5's honest-empty case, and a link
   * to nowhere would be the unverifiable navigation §2.1 refuses.
   */
  readonly explains: string | null;
  /** The full reading, disclosed. The same row the binder renders in full. */
  readonly full: PropertyRow;
}

export interface NavRails {
  readonly models: readonly ModelRailRow[];
  /** What to say instead, when there is nothing to list. Null when the list is non-empty. */
  readonly modelsEmpty: string | null;
  readonly properties: readonly PropertyRailRow[];
  readonly propertiesEmpty: string | null;
}

/**
 * The glyph, per status, exhaustively.
 *
 * A `Record<PropertyStatus, …>` rather than a switch with a default: adding a status to the
 * vocabulary then fails to compile here, which is the point of taking the typed status rather than
 * reading the word out of the sentence.
 *
 * `conditional` takes `?` and not `✓`. It holds of a REWRITTEN question, so a tick would claim the
 * question as asked was answered; the word beside it says which, and the disclosure says what the
 * rewrite was.
 */
const GLYPH: Readonly<Record<PropertyStatus, string>> = {
  established: "✓",
  refuted: "✗",
  conditional: "?",
  "not-answerable": "?",
  inconclusive: "?",
  "not-evaluated": "?",
};

/**
 * The status as a short word, DERIVED from the status key rather than written again.
 *
 * `STATUS_TEXT` leads with exactly this word and then explains it; the rail has room for the word
 * only. Copying the six leading words into a second table would be the drift this repo keeps
 * writing up, so the key is uppercased instead and `test/shell-nav.test.ts` pins that the long form
 * still opens with the short one.
 */
export const statusWord = (status: PropertyStatus): string =>
  status.replace(/-/g, " ").toUpperCase();

/**
 * A stale verdict is marked `?`, whatever the verdict was.
 *
 * The verdict describes a revision the system has moved past, so neither `✓` nor `✗` would be a
 * claim about what is loaded. `PropertyRow` demotes the verdict out of `status` for the same reason;
 * the mark follows it rather than deciding separately.
 */
const markOf = (row: PropertyRow): RailMark => row.stale
  ? { glyph: "?", word: "NOT CURRENT" }
  : { glyph: GLYPH[row.statusKey], word: statusWord(row.statusKey) };

/**
 * Both rails, as data, before any element exists.
 *
 * Takes the view model and the system rather than reaching for services: every projection paints
 * from one observation (UX-I3), and a pure function of the frame is how that is held here as well
 * as asserted.
 */
export function navRails(
  vm: ViewModel, system: CanonicalSystem, target: string | null,
): NavRails {
  const principal = resolveSubject(system, target);
  const current = principal === null ? null : subjectValue(principal);

  const models: ModelRailRow[] = vm.subjects.flatMap((choice) => {
    const subject = resolveSubject(system, choice.value);
    // `subjects` is built from the system's own models and machines, so this resolves for every
    // member. Dropping an unresolvable one rather than falling back: `resolveSubject` answers a
    // missing target with the FIRST model, which is right for a navigation default and would be a
    // duplicate row here.
    if (subject === null || subjectValue(subject) !== choice.value) return [];
    const purpose = subject.kind === "model"
      ? system.models.get(subject.id)?.purpose
      : system.machines.get(subject.id)?.purpose;
    if (purpose === undefined) return [];
    const block = purposeBlock(purpose);
    return [{
      subject: choice.value,
      name: subject.kind === "model"
        ? system.models.get(subject.id)?.label ?? subject.id
        : subject.id,
      question: block.question,
      unstated: block.unstated,
      current: choice.value === current,
    }];
  });

  const properties: PropertyRailRow[] = vm.properties.map((row) => ({
    id: row.id,
    mark: markOf(row),
    claim: row.proposition,
    kind: row.kind,
    explains: row.groundSubjects[0] ?? null,
    full: row,
  }));

  return {
    models,
    modelsEmpty: models.length > 0
      ? null
      : "No purposeful model yet. Add one, and state the engineering question it answers.",
    properties,
    propertiesEmpty: properties.length > 0
      ? null
      // The lifecycle the author drew, named where the user is standing: ask, then track. The old
      // sentence said "above", which stopped being true when the ask bar moved to the bottom.
      : "This model system asserts no claims yet. Ask a question in the ask bar, then track the "
        + "answer, and it becomes a property evaluated against every later revision.",
  };
}

// --------------------------------------------------------------------------------------------
// Where a `+` row goes
// --------------------------------------------------------------------------------------------

/**
 * The element that performs a capability, read out of the registry that declares it.
 *
 * The rails offer `+ Model` and `+ Property`, and the operations behind them already have declared
 * human sites. Linking to the registry's own declaration rather than to an id typed here means the
 * rail follows the control when a later wave re-sites it, and that a rail row can never point at a
 * control the registry does not know about — the two failures a hand-typed `href="#add-model-go"`
 * would invite one after the other.
 *
 * Resolved at PAINT, and the first site that is present and enabled wins. A capability can declare
 * more than one site (saving a property is reachable from the ask bar's Track and from the standalone
 * save form), and which of them a user can actually use right now is a fact about the live page.
 */
function operationHref(capability: CapabilityId): string | null {
  const declared = CAPABILITIES.find((c) => c.id === capability);
  if (declared === undefined) return null;
  for (const affordance of declared.human) {
    if (affordance.status === "absent") continue;
    const node = document.getElementById(affordance.element.id);
    if (node === null) continue;
    if (node instanceof HTMLButtonElement && node.disabled) continue;
    return affordance.element.id;
  }
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

/**
 * The two things a rail link does, and the surface each lands on.
 *
 * `draw` moves the drawn subject; `explain` does the same thing for the model a claim derives from,
 * and is a separate action only so the announcement can say which of the two just happened.
 * `invoke` goes to a control rather than a region, so it carries its own destination id.
 */
type RailAction = "draw" | "explain" | "invoke";

/** Resolved through the table, so the workspace's element id is not written here as well. */
function workspaceHref(): string {
  const id = surfaceElement("workspace");
  if (id === null) throw new Error("the rails link to surface 'workspace', which SURFACES declares planned");
  return `#${id}`;
}

function railLink(action: RailAction, arg: string, href: string): HTMLAnchorElement {
  const link = el("a");
  link.href = href;
  link.dataset["rail"] = action;
  link.dataset["arg"] = arg;
  return link;
}

function modelNode(row: ModelRailRow): HTMLLIElement {
  const li = el("li");
  const link = railLink("draw", row.subject, workspaceHref());
  link.append(el("strong", row.name));
  if (row.current) {
    // `aria-current` is the announced half and a chip is the seen half. Neither alone: the attribute
    // is invisible without a stylesheet this module does not own, and a styled border is invisible
    // to a screen reader.
    link.setAttribute("aria-current", "true");
    link.append(document.createTextNode(" "), el("span", "being viewed", "state"));
  }
  // The question, under the name and inside the link, because the question is what the model IS and
  // a rail of bare names teaches a reader nothing about why there is more than one. A model that
  // states none says so, in the `caveat` voice the purpose block already uses for that fact.
  link.append(el("p", row.question, row.unstated ? "caveat" : "purpose"));
  li.append(link);
  return li;
}

function propertyNode(row: PropertyRailRow): HTMLLIElement {
  const li = el("li");
  const head = el("p");
  // The glyph is hidden from the accessibility tree. A screen reader announces "✓" as "check mark"
  // or as nothing at all depending on the pairing, and the word beside it already carries the
  // status — so the glyph is decoration for the eye and is marked as such.
  const glyph = el("span", row.mark.glyph, "mark");
  glyph.setAttribute("aria-hidden", "true");
  head.append(glyph, document.createTextNode(" "), el("span", row.mark.word, "state"));
  head.append(document.createTextNode(" "), el("span", row.kind, "state"), document.createTextNode(" "));

  if (row.explains === null) {
    head.append(el("span", row.claim));
  } else {
    const link = railLink("explain", row.explains, workspaceHref());
    link.textContent = row.claim;
    head.append(link);
  }
  li.append(head);

  // SH-I2: a real disclosure control, in the tab order, announcing its own expanded state, so a
  // keyboard user and a sighted user open the same thing by the same act. UX-I8's other half is
  // here too — every field the flat list showed at once is still reachable, and the summary says
  // what is behind it rather than leaving a reader to guess whether anything is.
  const details = el("details");
  details.append(
    el("summary", "Status, grounding and evidence"),
    propertyBlock(row.full),
  );
  li.append(details);
  return li;
}

/**
 * A `+` row: the operation's name, linking to the control that performs it.
 *
 * When the registry's sites are all absent from the page the row is TEXT saying so rather than a
 * link to nothing. That is the `purposeBlock` precedent — silence and "nothing is declared here"
 * look identical on screen and only one of them is a fact.
 */
function addNode(label: string, capability: CapabilityId, missing: string): HTMLLIElement {
  const li = el("li", undefined, "rail-add");
  const id = operationHref(capability);
  if (id === null) {
    li.append(el("span", missing, "caveat"));
    return li;
  }
  const link = railLink("invoke", id, `#${id}`);
  link.textContent = label;
  li.append(link);
  return li;
}

export function mountNav(ctx: ShellContext): ShellRegion {
  const rail = byId("nav");
  const models = regionHost("nav-models");
  const properties = regionHost("nav-properties");

  /**
   * ONE listener per rail, bound once to markup the page ships, reading the link it was given.
   *
   * Delegation for the reason `shell/inspector.ts` gives: the rows are rebuilt whenever the reading
   * changes, and a handler attached to a rebuilt element is a handler re-bound on every paint. The
   * link carries its own argument, so nothing closes over the frame it was built in.
   *
   * The default is not prevented for a navigation: the href is a real in-page destination, so the
   * browser moves the reader to the region that is about to change while the handler changes what
   * it shows. For `invoke` the default IS prevented, because a fragment jump scrolls a control into
   * view without focusing it — and an affordance you have to find again after arriving is the
   * reachability §2.2 declines to call reachable.
   */
  const navigate = (host: HTMLElement): void => {
    host.addEventListener("click", (event) => {
      const from = event.target;
      if (!(from instanceof Element)) return;
      const link = from.closest<HTMLAnchorElement>("a[data-rail]");
      if (link === null) return;
      const arg = link.dataset["arg"];
      if (arg === undefined) return;
      const action = link.dataset["rail"];
      if (action === "invoke") {
        event.preventDefault();
        const control = document.getElementById(arg);
        if (control === null) return;
        control.focus();
        ctx.announce(`Focus moved to ${control.textContent?.trim() ?? arg}.`);
        return;
      }
      ctx.viewState.target = arg;
      ctx.announce(action === "explain"
        ? `Workspace now shows a model this claim derives from: ${arg}.`
        : `Workspace now draws ${link.querySelector("strong")?.textContent ?? arg}.`);
      ctx.repaint();
    });
  };
  navigate(models);
  navigate(properties);

  /**
   * The reading last rendered, as data.
   *
   * Rebuilt only when the READING changes, which is what keeps a disclosure the user opened open
   * across the repaints its neighbours cause — the inspector's argument, and it bites harder here
   * because every property row owns a `<details>`. The signature covers the `+` rows' resolved
   * destinations too, since those depend on the live page rather than on the frame.
   */
  let rendered: string | null = null;

  return {
    paint: (frame: ShellFrame) => {
      // The rail navigates a loaded system. With nothing loaded, Start occupies the page and two
      // empty rails beside it are furniture — SH-I1's reasoning applied to the surfaces that have
      // nothing to navigate.
      mountIf(rail, frame.state.loaded);
      if (!frame.state.loaded) { rendered = null; return; }

      const reading = navRails(frame.vm, frame.state.system, ctx.viewState.target);
      const addModel = operationHref("create-model");
      const addProperty = operationHref("save-property");
      const signature = JSON.stringify([reading, addModel, addProperty]);
      if (signature === rendered) return;
      rendered = signature;

      const modelList = el("ul", undefined, "rail");
      if (reading.modelsEmpty !== null) modelList.append(el("li", reading.modelsEmpty, "intro"));
      for (const row of reading.models) modelList.append(modelNode(row));
      modelList.append(addNode(
        "+ Model", "create-model",
        "Adding a model has no control on this page right now.",
      ));
      models.replaceChildren(modelList);

      const propertyList = el("ul", undefined, "rail");
      if (reading.propertiesEmpty !== null) {
        propertyList.append(el("li", reading.propertiesEmpty, "intro"));
      }
      for (const row of reading.properties) propertyList.append(propertyNode(row));
      propertyList.append(addNode(
        "+ Property", "save-property",
        "Tracking a claim has no control on this page right now.",
      ));
      properties.replaceChildren(propertyList);
    },
  };
}
