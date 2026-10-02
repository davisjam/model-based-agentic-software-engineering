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
import type { FindingRow, QuestionRow, Row, Section, ViewModel } from "./view-model.ts";

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

function rowCells(row: Row): HTMLTableRowElement {
  const tr = el("tr");
  const idCell = el("td", row.id, "id");
  const label = el("td");
  label.append(el("strong", row.label));
  if (row.states.length > 0) {
    label.append(document.createTextNode(" "));
    label.append(stateChips(row.states));
  }
  tr.append(idCell, label, el("td", row.kind), el("td", row.detail));
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

export function paint(vm: ViewModel, roots: {
  readonly summary: HTMLElement;
  readonly banner: HTMLElement;
  readonly sections: HTMLElement;
  readonly questions: HTMLElement;
  readonly findings: HTMLElement;
}): void {
  document.title = `${vm.title} — MAGE Model Workbench`;
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
