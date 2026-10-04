/**
 * View model -> DOM. A thin, dumb binder.
 *
 * All judgement lives in view-model.ts, which is tested without a browser. This file only turns a
 * typed structure into elements, which is why it is boring on purpose: anything clever here would be
 * untested, because testing it needs jsdom.
 *
 * Everything is built with createElement and textContent. No innerHTML anywhere — model content is
 * author-supplied text, and interpolating it as markup would be an injection in an application
 * whose whole purpose is loading files other people wrote.
 */
import type { AccessibleScene, SvgNode } from "../render/types.ts";
import { MARK_MEANINGS } from "../render/types.ts";
import type { ExampleDescription } from "../app/examples.ts";
import type { ProvenanceRecord } from "../app/provenance.ts";
import type {
  Choice, FindingRow, PrincipalModel, PropertyRow, PurposeBlock, Row, Section, ViewModel,
} from "./view-model.ts";

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, text?: string, className?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className !== undefined) node.className = className;
  return node;
};

/**
 * A unique DOM id, for an element that must be referenced by an ARIA attribute.
 *
 * Counted rather than derived from the model, because a model id is author-supplied text and two
 * blocks can legitimately carry the same one — the ad-hoc answer panel renders through the same
 * `propertyBlock` as the saved list, and its id is the statement the user typed. Duplicate ids
 * under an `aria-labelledby` resolve to whichever came first, which is an accessibility defect axe
 * reports and a reader cannot see. A counter cannot collide with anything a user writes.
 */
const ariaId = (() => {
  let n = 0;
  return (prefix: string): string => {
    n += 1;
    return `${prefix}-${n}`;
  };
})();

const stateChips = (states: readonly string[]): DocumentFragment => {
  const frag = document.createDocumentFragment();
  for (const s of states) frag.append(el("span", s, "state"));
  return frag;
};

/**
 * Notes and provenance, under a visible label.
 *
 * The label is not decoration. A note rendered as bare text beside a model fact is indistinguishable
 * from the fact, and a note rendered in the findings list would tell its author that their comment
 * is a problem. Saying "Notes" is what keeps human context and validation output apart on screen.
 */
function annotationBlock(row: Row): DocumentFragment {
  const frag = document.createDocumentFragment();
  if (row.notes.length > 0) {
    frag.append(el("p", "Notes", "sublabel"));
    const list = el("ul", undefined, "notes");
    for (const n of row.notes) {
      const li = el("li");
      li.append(el("span", n.kind, "state"), document.createTextNode(n.text));
      if (n.author !== null) li.append(el("span", ` — ${n.author}`, "coverage"));
      if (n.warning !== null) li.append(el("p", n.warning, "note-warning"));
      list.append(li);
    }
    frag.append(list);
  }
  if (row.notesCaveat !== null) frag.append(el("p", row.notesCaveat, "caveat"));
  if (row.provenance !== null) {
    frag.append(el("p", "Provenance", "sublabel"));
    if (row.provenance.unreadable) {
      frag.append(el("p",
        "The source records provenance, but none of its fields could be read.", "coverage"));
    } else {
      const dl = el("dl", undefined, "prov");
      for (const f of row.provenance.fields) dl.append(el("dt", f.label), el("dd", f.value));
      frag.append(dl);
    }
  }
  return frag;
}

/**
 * A purpose, under its own headings (UX-I4).
 *
 * "Asks" leads and is marked `purpose` rather than `coverage`, because the question is what the
 * model is FOR and what every refusal cites. Represents and omits follow as a definition list —
 * §5.1 permits them to be inspectable rather than always on screen, and a `<dl>` nested in the row
 * is inspectable without navigating away, which is the condition it actually sets.
 */
/** The question, which stays visible wherever a purpose is shown (UX-I4 §5.1). */
function purposeQuestion(p: PurposeBlock): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.append(el("p", "Asks", "sublabel"));
  frag.append(el("p", p.question, p.unstated ? "caveat" : "purpose"));
  return frag;
}

/** The grounds, flat. The System Browser's rows read a purpose in full, in one cell. */
function purposeGrounds(p: PurposeBlock): HTMLElement | null {
  if (p.represents.length === 0 && p.omits.length === 0) return null;
  const dl = el("dl", undefined, "prov");
  if (p.represents.length > 0) dl.append(el("dt", "Represents"), el("dd", p.represents.join(", ")));
  // Omits is the half a diagram cannot draw, and the half that licenses a refusal. Rendered even
  // when represents is empty, for that reason.
  if (p.omits.length > 0) dl.append(el("dt", "Deliberately omits"), el("dd", p.omits.join(", ")));
  return dl;
}

/**
 * The grounds, one disclosure deep — correction 2's "▸ What this model represents / ▸ omits".
 *
 * `details`/`summary`, which is SH-I2's one spelling: the control is in the tab order and announces
 * its own expanded state with no ARIA, so a sighted user and a keyboard user open the same thing by
 * the same act. Two disclosures rather than one, because the author numbered them separately and
 * because "what it omits" is the half that licenses a refusal — a reader hunting that sentence
 * should not have to open a block named after its opposite.
 */
export function purposeDisclosures(p: PurposeBlock): DocumentFragment {
  const frag = document.createDocumentFragment();
  const block = (label: string, items: readonly string[]): HTMLElement => {
    const d = el("details");
    d.append(el("summary", label));
    const ul = el("ul", undefined, "notes");
    for (const item of items) ul.append(el("li", item));
    d.append(ul);
    return d;
  };
  if (p.represents.length > 0) frag.append(block("What this model represents", p.represents));
  if (p.omits.length > 0) frag.append(block("What this model deliberately omits", p.omits));
  return frag;
}

function purposeDisplay(p: PurposeBlock): DocumentFragment {
  const frag = purposeQuestion(p);
  const grounds = purposeGrounds(p);
  if (grounds !== null) frag.append(grounds);
  return frag;
}

function rowCells(row: Row): HTMLTableRowElement {
  const tr = el("tr");
  const idCell = el("td", row.id, "id");
  const label = el("td");
  label.append(el("strong", row.label));
  if (row.states.length > 0) {
    label.append(document.createTextNode(" "));
    label.append(stateChips(row.states));
  }
  const detail = el("td", row.detail);
  if (row.purpose !== null) detail.append(purposeDisplay(row.purpose));
  detail.append(annotationBlock(row));
  tr.append(idCell, label, el("td", row.kind), detail);
  return tr;
}

/**
 * The principal model's purpose, beside the picture (§5.1).
 *
 * Plain DOM rather than a live region: it changes when the user changes the drawn subject, which is
 * a navigation and not a consequence, and `#live` already announces the things that are.
 */
export function paintPrincipal(
  principal: PrincipalModel | null, root: HTMLElement, detail?: HTMLElement,
): void {
  root.replaceChildren();
  detail?.replaceChildren();
  if (principal === null) {
    // CONCRETE, and corrected. The old sentence read "No model is loaded, so no model is being
    // viewed", which is false in the one state that reaches it: `resolveSubject` falls back to the
    // first model or machine the system declares, so a null principal means a model system IS
    // loaded and declares neither. That is the state a reader lands in after Create new model
    // system — the empty state the ruling is about — and the pane told them nothing to do in it.
    //
    // What the pane owes here is the next act, with the control that performs it named. What a
    // model IS, and why its question is required, is Learn's (`src/learn/workbench-guide.ts`).
    root.append(el("p", "This model system declares no model yet. Add one under + Add above, and it "
      + "appears here with the engineering question it answers.", "intro"));
    return;
  }
  root.append(el("h3", `${principal.label} — the model being viewed`));
  root.append(el("p", `${principal.kind} ${principal.id}`, "id"));
  // With a `detail` root the grounds go there, behind disclosures; without one they stay flat
  // beneath the question. ONE module still decides how a purpose reads — the caller chooses the
  // depth, not the wording — which is the arrangement wave 1a settled on for a property row.
  if (detail === undefined) {
    root.append(purposeDisplay(principal.purpose));
    return;
  }
  root.append(purposeQuestion(principal.purpose));
  detail.append(purposeDisclosures(principal.purpose));
}

function sectionTable(section: Section): HTMLElement {
  const wrap = el("section");
  wrap.setAttribute("aria-labelledby", `h-${section.id}`);
  const h = el("h3", section.heading);
  h.id = `h-${section.id}`;
  wrap.append(h, el("p", section.intro, "intro"));

  const scroll = el("div", undefined, "scroll");
  const table = el("table");
  const caption = el("caption", `${section.heading}: ${section.rows.length} row(s)`, "sr-only");
  const head = el("thead");
  const hrow = el("tr");
  for (const label of ["Id", "Label", "Kind", "Detail"]) {
    const th = el("th", label);
    th.scope = "col";
    hrow.append(th);
  }
  head.append(hrow);
  const body = el("tbody");
  for (const row of section.rows) body.append(rowCells(row));
  table.append(caption, head, body);
  scroll.append(table);
  wrap.append(scroll);
  return wrap;
}

/**
 * One persistent property (§9.1, §9.3).
 *
 * The order is the reading order §9.3 asks for: statement, status, models used, evidence,
 * coverage, bounds, last evaluation revision. The revision is rendered for EVERY property, not only
 * a stale one, because "which revision does this status describe" is unanswerable from a status
 * word and is the first thing anyone auditing a claim needs.
 *
 * The kind chip is a WORD. §13 permits requirements to be distinguished visually; a visual-only
 * distinction is one a screen-reader user never receives, so the word carries it and the stylesheet
 * may do whatever it likes on top.
 */
export function propertyBlock(p: PropertyRow): HTMLElement {
  const article = el("article");
  article.setAttribute("aria-label", `${p.kind}: ${p.statement}`);
  const heading = el("h3");
  heading.append(el("span", p.kind, "state"), document.createTextNode(` ${p.statement}`));
  article.append(heading);

  // `status` already carries the mismatch when the verdict describes another revision -- the view
  // model demotes the verdict out of it, so this renderer cannot accidentally lead with a stale one.
  article.append(el("p", p.status, p.stale ? "outcome stale" : "outcome"));
  if (p.verdict !== null) article.append(el("p", p.verdict, "coverage"));
  if (p.expectation !== null) article.append(el("p", p.expectation, "outcome"));

  // UX-I5. Immediately under the status, because what established a claim is not supplementary to
  // the claim -- a status with its grounding three paragraphs down is a status read without it.
  if (p.grounds.length > 0) {
    article.append(el("p", "Derived from", "sublabel"));
    const uses = el("ul", undefined, "notes");
    for (const line of p.grounds) uses.append(el("li", line));
    article.append(uses);
  }
  if (p.groundsMissing !== null) article.append(el("p", p.groundsMissing, "caveat"));

  if (p.coverage !== "") article.append(el("p", p.coverage, "coverage"));
  if (p.refusal !== null) article.append(el("p", p.refusal, "refusal"));
  for (const c of p.compilation) article.append(el("p", `To answer this: ${c}`, "compilation"));
  if (p.evidence.length > 0) {
    // The witness list is a declared readout site of its own (`properties-section.evidence-list`),
    // so it carries a name rather than relying on the sublabel happening to sit above it. The name
    // IS the sublabel: one visible word, read by both audiences, and a screen-reader user jumping
    // by list lands on something that says what it holds.
    const label = el("p", "Evidence", "sublabel");
    label.id = ariaId("evidence-label");
    const list = el("ol", undefined, "evidence");
    list.setAttribute("aria-labelledby", label.id);
    for (const line of p.evidence) list.append(el("li", line));
    article.append(label, list);
  }
  article.append(el("p", p.revision, "id"));
  return article;
}

/**
 * The ad-hoc question's answer (§10.2).
 *
 * Rendered with `propertyBlock`, which is the point: a transient result and a persistent property
 * are the same thing displayed, differing only in whether the question is saved. Writing a second
 * renderer for the answer panel would let the two drift, and then "Save as property" would change
 * how a result reads rather than only how long it lasts.
 */
export function paintAnswer(answer: PropertyRow | null, problem: string, root: HTMLElement): void {
  root.replaceChildren();
  if (problem !== "") { root.append(el("p", problem, "caveat")); return; }
  if (answer === null) return;
  root.append(propertyBlock(answer));
}

function findingTable(findings: readonly FindingRow[]): HTMLElement {
  if (findings.length === 0) return el("p", "No validation findings.", "intro");
  const scroll = el("div", undefined, "scroll");
  const table = el("table");
  const head = el("thead");
  const hrow = el("tr");
  for (const label of ["Rule", "Where", "Problem"]) {
    const th = el("th", label);
    th.scope = "col";
    hrow.append(th);
  }
  head.append(hrow);
  const body = el("tbody");
  for (const f of findings) {
    const tr = el("tr");
    tr.append(el("td", f.rule, "id"), el("td", f.where, "id"), el("td", f.message));
    body.append(tr);
  }
  table.append(head, body);
  scroll.append(table);
  return scroll;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * The renderer's node tree -> real SVG elements.
 *
 * Built element by element rather than assigned as `innerHTML`. The serialized string is what the
 * renderer produces for tests and for export; handing a markup string back to the parser in the
 * page would reintroduce exactly the injection surface this file avoids everywhere else, for a
 * document whose whole job is opening files other people wrote.
 */
export function svgElement(node: SvgNode): SVGElement {
  const e = document.createElementNS(SVG_NS, node.tag);
  for (const [k, v] of Object.entries(node.attrs)) e.setAttribute(k, String(v));
  if (node.text !== null) e.textContent = node.text;
  for (const child of node.children) e.append(svgElement(child));
  return e;
}

/**
 * The diagram's accessible twin, as DOM (FR-A11Y-2).
 *
 * Deliberately NOT a second copy of the model tables. What goes here is what the PICTURE adds and
 * the tables cannot: which subject is drawn, the reading order the layout produced, what each
 * emphasis marker means, and which nodes and edges carry one. Those are the facts a sighted user
 * reads off stroke weight and position, so they are the facts that otherwise reach nobody else.
 */
export function paintDiagram(
  scene: AccessibleScene | null,
  tree: SvgNode | null,
  roots: { readonly text: HTMLElement; readonly canvas: HTMLElement },
): void {
  roots.canvas.replaceChildren();
  roots.text.replaceChildren();
  if (scene === null || tree === null) {
    roots.text.append(el("p", "No model is loaded, so there is nothing to draw.", "intro"));
    return;
  }
  roots.canvas.append(svgElement(tree));

  roots.text.append(el("p", scene.summary, "intro"));

  const emphasised = [...scene.nodes, ...scene.edges].filter((x) => x.emphasis.length > 0);
  if (emphasised.length > 0) {
    roots.text.append(el("p", "Marked in the picture", "sublabel"));
    const marks = el("ul", undefined, "notes");
    for (const x of emphasised) {
      const li = el("li");
      for (const a of x.emphasis) li.append(el("span", a.kind, "state"));
      li.append(document.createTextNode(`${x.description} — ${x.emphasis.map((a) => a.reason).join("; ")}`));
      marks.append(li);
    }
    roots.text.append(marks);
  }

  // The VOCABULARY key, before the emphasis legend: a reader needs to know what an arrow means
  // before being told which arrows are highlighted. This is the half of the legend ruling that
  // FR-A11Y-2 actually bites on — the relation type left the edges, so if it did not arrive here
  // the picture would carry a distinction (four arrowheads) that the text view never explains.
  if (scene.key.length > 0) {
    roots.text.append(el("p", "What the shapes and arrows mean", "sublabel"));
    const dl = el("dl", undefined, "prov");
    for (const entry of scene.key) {
      const how =
        entry.channel === "relation"
          ? `drawn as an arrow with a ${entry.form} head`
          : `drawn as a ${entry.form === "state" ? "pill" : entry.form === "region" ? "large enclosing frame" : "box"}`;
      dl.append(el("dt", entry.id), el("dd", `${entry.meaning} — ${how}`));
    }
    roots.text.append(dl);
  }

  if (scene.legend.length > 0) {
    roots.text.append(el("p", "What the markers mean", "sublabel"));
    const dl = el("dl", undefined, "prov");
    for (const entry of scene.legend) {
      // The glyph and the dash pattern ARE the non-colour channels, so they are named rather than
      // only shown: a user who cannot see the stroke still learns which word the marker carries.
      const how = [
        entry.glyph === null ? null : `marker '${entry.glyph}'`,
        entry.dashArray === null ? "solid stroke" : `dashed stroke (${entry.dashArray})`,
        `stroke width ${entry.strokeWidth}`,
      ].filter((s): s is string => s !== null).join(", ");
      dl.append(el("dt", entry.kind), el("dd", `${MARK_MEANINGS[entry.kind]} — drawn with ${how}`));
    }
    roots.text.append(dl);
  }

  if (scene.evidence !== null) {
    roots.text.append(el("p", "Evidence", "sublabel"));
    roots.text.append(el("p", scene.evidence.description, "coverage"));
    const steps = el("ol", undefined, "evidence");
    for (const s of scene.evidence.steps) steps.append(el("li", s.description));
    roots.text.append(steps);
  }

  roots.text.append(el("p", "Reading order", "sublabel"));
  const order = el("ol", undefined, "notes");
  for (const n of scene.nodes) order.append(el("li", n.description));
  roots.text.append(order);
  if (scene.refusal !== null) roots.text.append(el("p", scene.refusal, "refusal"));
}

/**
 * Refill a select from the model, keeping the user's choice when it still exists.
 *
 * Rebuilding the options is unavoidable — they are derived from the model, and the model changes —
 * but losing the selection on every repaint would make a two-field form unusable: pick the model,
 * the repaint fires, the endpoint list resets. So the previous value wins if it is still offered.
 */
export function fillSelect(select: HTMLSelectElement, choices: readonly Choice[]): void {
  const wanted = select.value;
  select.replaceChildren(...choices.map((c) => {
    const option = document.createElement("option");
    option.value = c.value;
    option.textContent = c.label;
    return option;
  }));
  if (choices.some((c) => c.value === wanted)) select.value = wanted;
}

/**
 * The Provenance section.
 *
 * The prompt is rendered as a headline paragraph, above and apart from the metadata list, because it
 * is the field a reader of an agent-authored model actually came for. The separation is structural:
 * `ProvenanceRecord` keeps `prompt` out of `fields`, so no stylesheet change can quietly demote it
 * back into a row of a table.
 */
export function paintProvenance(records: readonly ProvenanceRecord[], root: HTMLElement): void {
  root.replaceChildren();
  if (records.length === 0) {
    root.append(el("p", "No object in this model system records where it came from.", "intro"));
    return;
  }
  for (const r of records) {
    const article = el("article");
    const heading = `${r.kind}: ${r.label}`;
    article.setAttribute("aria-label", `Provenance of ${heading}`);
    const h = el("h3", heading);
    article.append(h, el("p", r.object, "id"));

    if (r.unreadable) {
      article.append(el("p",
        "The source records provenance, but none of its fields could be read.", "coverage"));
      root.append(article);
      continue;
    }
    if (r.prompt !== null) {
      article.append(el("p", "Asked for", "sublabel"), el("p", r.prompt, "prompt"));
    }
    if (r.fields.length > 0) {
      const dl = el("dl", undefined, "prov");
      for (const f of r.fields) dl.append(el("dt", f.label), el("dd", f.value));
      article.append(dl);
    }
    root.append(article);
  }
}

/**
 * An example's description, shown before it loads (section 3).
 *
 * Every string here comes from the example's own files. Nothing is phrased in this function except
 * the two sub-headings, which is what keeps the panel honest about the thing it describes.
 */
export function paintExampleDescription(
  description: ExampleDescription | null, root: HTMLElement,
): void {
  root.replaceChildren();
  if (description === null) return;
  root.append(el("h3", description.title), el("p", description.summary, "intro"));

  root.append(el("p", "Models", "sublabel"));
  const models = el("ul", undefined, "notes");
  for (const m of description.models) {
    const li = el("li");
    // The space is a real text node, not a margin. A screen reader reads the concatenated text, so
    // the kind chip and the label would otherwise arrive as "graphData Policy".
    li.append(el("span", m.kind, "state"), document.createTextNode(" "), el("strong", m.label));
    // The question comes with the model because it is what the model is FOR -- and because a list of
    // model names teaches a reader nothing about why there is more than one.
    if (m.question !== null) li.append(document.createTextNode(` — ${m.question}`));
    models.append(li);
  }
  root.append(models);

  root.append(el("p", "Try asking", "sublabel"));
  const asking = el("ul", undefined, "notes");
  for (const q of description.tryAsking) asking.append(el("li", q));
  root.append(asking);
}

/** The example chooser's own failure report. A fetch that fails must say so, not render nothing. */
export function paintExampleProblem(problem: string, root: HTMLElement): void {
  root.replaceChildren(el("p", problem, "caveat"));
}

/** The rejected-edit report. Plain DOM: `announce()` is the one live region, and it says the gist. */
export function paintEditResult(root: HTMLElement, headline: string, findings: readonly FindingRow[]): void {
  root.replaceChildren();
  if (headline === "") return;
  root.append(el("strong", headline));
  if (findings.length === 0) return;
  const list = el("ul", undefined, "notes");
  for (const f of findings) list.append(el("li", `${f.rule} at ${f.where}: ${f.message}`));
  root.append(list);
}

export function paint(vm: ViewModel, roots: {
  readonly summary: HTMLElement;
  readonly banner: HTMLElement;
  readonly sections: HTMLElement;
  readonly findings: HTMLElement;
}): void {
  // The tab title carries the hypothesis too. A user who switched tabs and came back needs to know
  // they are not looking at the authoritative model before they read anything else.
  const prefix = vm.hypothesis === null ? "" : `HYPOTHESIS "${vm.hypothesis}" — `;
  document.title = `${prefix}${vm.title} — MAGE Model Workbench`;
  roots.summary.textContent = vm.summary;

  roots.banner.replaceChildren();
  if (vm.banner !== null) {
    roots.banner.append(el("p", vm.banner.text, `banner ${vm.banner.tone}`));
  }

  // The empty state is a sentence, not nothing. `#sections` now sits under its own visible heading
  // so a reader can name the region it lands in; a named heading over blank space reads as a
  // rendering failure, and the other three readouts already say what their emptiness means.
  roots.sections.replaceChildren(
    ...(vm.sections.length === 0
      ? [el("p", "No model system is loaded. Create one, open a file, or load an example above.", "intro")]
      : vm.sections.map(sectionTable)),
  );
  // The property list is NOT written here any more. Wave 1a turned the flat list into the
  // properties RAIL — a status word and the claim, with the full reading one disclosure down — and
  // a rail row is a different rendering, not a restyled `propertyBlock`. So `shell/nav.ts` renders
  // the rows and `propertyBlock` stays this file's, with `paintAnswer` as its remaining caller.
  //
  // Dropping the root rather than leaving it written is the half that matters: two writers of
  // `#question-list` would race on paint order, and which one won would be a fact about the order
  // of two statements in the composition root.
  roots.findings.replaceChildren(findingTable(vm.findings));
}
