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
import type { Choice, FindingRow, QuestionRow, Row, Section, ViewModel } from "./view-model.ts";

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, text?: string, className?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className !== undefined) node.className = className;
  return node;
};

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
  detail.append(annotationBlock(row));
  tr.append(idCell, label, el("td", row.kind), detail);
  return tr;
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

function questionBlock(q: QuestionRow): HTMLElement {
  const article = el("article");
  article.setAttribute("aria-label", q.question);
  article.append(el("h3", q.question));

  const outcome = el("p", q.outcome, "outcome");
  if (q.stale) {
    // A result describing a model the user has already changed must say so before it says anything
    // else -- presenting it as current is the failure the hash in every result exists to prevent.
    const warn = el("span", " — STALE: this describes an earlier revision of the model", "stale");
    outcome.append(warn);
  }
  article.append(outcome);

  if (q.coverage !== "") article.append(el("p", q.coverage, "coverage"));
  if (q.refusal !== null) article.append(el("p", q.refusal, "refusal"));
  for (const c of q.compilation) article.append(el("p", `To answer this: ${c}`, "compilation"));
  if (q.evidence.length > 0) {
    const list = el("ol", undefined, "evidence");
    for (const line of q.evidence) list.append(el("li", line));
    article.append(list);
  }
  return article;
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
  readonly questions: HTMLElement;
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

  roots.sections.replaceChildren(...vm.sections.map(sectionTable));
  roots.questions.replaceChildren(
    ...(vm.questions.length === 0
      ? [el("p", "This model saves no questions.", "intro")]
      : vm.questions.map(questionBlock)),
  );
  roots.findings.replaceChildren(findingTable(vm.findings));
}
