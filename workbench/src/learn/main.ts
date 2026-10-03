/**
 * The Learn page: a gallery of model types, every fact derived (UX-I9), every visual the
 * workbench's own renderer over a shipped example.
 *
 * Composition root only. The content comes from `content.ts`; the pictures come from
 * `renderView` — the same seam the workbench binds, returning the SVG and its accessible twin
 * together, so a Learn visual cannot show a fact assistive technology does not get. The DOM
 * binders are the workbench's own (`src/ui/render-dom.ts`): reused, not copied, so a fix to how a
 * diagram or its twin paints reaches this page without anyone remembering to port it.
 *
 * Interaction dogfoods the representation rather than decorating it: selecting a node — by the
 * named picker or by clicking the picture — re-renders through `renderView` with a `selection`
 * emphasis and position hints, and the status line quotes the accessible twin's description of
 * the node, never a tooltip of its own.
 */
import { parse } from "yaml";
import { Workspace } from "../app/services.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../app/examples.ts";
import { learnHrefForType } from "../app/learn.ts";
import type { CanonicalSystem } from "../ir/types.ts";
import { renderView } from "../render/index.ts";
import type { Point, RenderedView, SceneSubject } from "../render/types.ts";
import { paintDiagram } from "../ui/render-dom.ts";
import {
  buildTypeSections, buildUseSections,
  type LearnTypeSection, type LearnUseSection, type SavedQuestion,
} from "./content.ts";

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, text?: string, className?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className !== undefined) node.className = className;
  return node;
};

// --------------------------------------------------------------------------------------------
// The figure: one real render, with selection
// --------------------------------------------------------------------------------------------

let figureCount = 0;

/**
 * Re-scope the embedded SVG's `aria-labelledby` pair to this figure.
 *
 * The renderer derives those ids from the SUBJECT: `mage-title-<subjectId>` and
 * `mage-desc-<subjectId>` (src/render/svg.ts). That is right for the standalone export, and it is
 * unique on the Workspace page, which draws one subject at a time. This page draws four figures
 * and two of them draw the same subject — the structural-graph exemplar and the data-policy use
 * are both `data-policy` — so both SVGs carried the same `<title id>`/`<desc id>` and both
 * `aria-labelledby` references resolved to whichever came FIRST. axe reports it `duplicate-id-aria`
 * at CRITICAL. The name happened to be right here because the two figures share a subject; the
 * mechanism was broken either way, and a future pair that does not share one would read the wrong
 * diagram's description.
 *
 * Fixed at the embedder, because the embedder is what makes it ambiguous: a page that drops N
 * standalone SVGs into one document owns uniqueness within that document. The durable fix belongs
 * in the renderer, which already has the right pattern next door — `ariaId` in src/ui/render-dom.ts
 * counts instead of deriving, for this exact reason, and says so in its comment.
 */
function scopeDiagramAriaIds(canvas: HTMLElement, figureIndex: number): void {
  const svg = canvas.querySelector("svg");
  if (svg === null) return;
  const referenced: string[] = [];
  // Order is the claim: title then desc, the order the renderer puts in `aria-labelledby`.
  for (const tag of ["title", "desc"]) {
    const node = svg.querySelector(`:scope > ${tag}`);
    if (node === null) continue;
    node.id = `learn-figure-${figureIndex}-${tag}`;
    referenced.push(node.id);
  }
  if (referenced.length > 0) svg.setAttribute("aria-labelledby", referenced.join(" "));
}

/**
 * One rendered subject with a keyboard-operable node picker.
 *
 * The picker is a `<select>` rather than making SVG shapes focusable: the twin below the picture
 * is the accessible representation, and selection drives a re-render whose emphasis reaches both
 * the picture and the twin. Clicking a drawn node sets the same picker, so pointer and keyboard
 * share one code path.
 */
function figure(
  system: CanonicalSystem,
  subject: SceneSubject,
  caption: string,
  showProperties: readonly string[] = [],
): HTMLElement {
  const n = (figureCount += 1);
  const fig = el("figure", undefined, "learn-figure");
  const cap = el("figcaption", caption);
  cap.id = `learn-figure-caption-${n}`;
  const canvas = el("div", undefined, "canvas");
  const status = el("p", "", "intro");
  status.id = `learn-figure-status-${n}`;

  const pickerLabel = el("label", "Highlight a node");
  const picker = el("select");
  picker.id = `learn-figure-picker-${n}`;
  pickerLabel.htmlFor = picker.id;

  const twin = el("details");
  const twinSummary = el("summary", "Text view of this diagram");
  const twinBody = el("div");
  twin.append(twinSummary, twinBody);

  let hints: ReadonlyMap<string, Point> | undefined;
  const paint = (selection: readonly string[]): RenderedView => {
    const view = renderView(system, {
      subject,
      ...(hints !== undefined ? { hints } : {}),
      ...(selection.length > 0 ? { selection } : {}),
      ...(showProperties.length > 0 ? { showProperties } : {}),
    });
    hints = view.positions;
    paintDiagram(view.accessible, view.tree, { text: twinBody, canvas });
    scopeDiagramAriaIds(canvas, n);
    canvas.querySelectorAll("[data-node-id]").forEach((g) => {
      const id = g.getAttribute("data-node-id");
      const node = view.accessible.nodes.find((x) => x.id === id);
      if (id === null || node === undefined) return;
      g.addEventListener("click", () => { picker.value = id; picker.dispatchEvent(new Event("change")); });
      g.addEventListener("pointerenter", () => { status.textContent = node.description; });
    });
    return view;
  };

  const first = paint([]);
  const none = el("option", "(none)");
  none.value = "";
  picker.append(none);
  for (const node of first.accessible.nodes) {
    const opt = el("option", node.label);
    opt.value = node.id;
    picker.append(opt);
  }
  picker.addEventListener("change", () => {
    const id = picker.value;
    const view = paint(id === "" ? [] : [id]);
    const node = view.accessible.nodes.find((x) => x.id === id);
    status.textContent = node === undefined ? "" : node.description;
  });

  const controls = el("p", undefined, "learn-figure-controls");
  controls.append(pickerLabel, picker);
  fig.append(cap, canvas, controls, status, twin);
  return fig;
}

// --------------------------------------------------------------------------------------------
// Shared section fragments
// --------------------------------------------------------------------------------------------

function questionList(questions: readonly SavedQuestion[]): HTMLElement {
  const ul = el("ul", undefined, "notes");
  for (const q of questions) ul.append(el("li", q.label));
  return ul;
}

function bulletList(items: readonly string[]): HTMLElement {
  const ul = el("ul", undefined, "notes");
  for (const item of items) ul.append(el("li", item));
  return ul;
}

const sub = (text: string): HTMLElement => el("p", text, "sublabel");

// --------------------------------------------------------------------------------------------
// Sections
// --------------------------------------------------------------------------------------------

function typeSection(s: LearnTypeSection, systems: ReadonlyMap<ShippedExampleId, CanonicalSystem>): HTMLElement {
  const section = el("section");
  section.id = s.anchor;
  const h = el("h2", s.entry.question);
  h.id = `${s.anchor}-h`;
  section.setAttribute("aria-labelledby", h.id);
  section.append(h, el("p", `The ${s.entry.label} answers it.`, "intro"));

  if (s.visual !== null) {
    const system = systems.get(s.visual.example);
    if (system !== undefined) {
      const what = s.visual.subject.kind === "model" ? "model" : "machine";
      section.append(figure(system, s.visual.subject,
        `${what} '${s.visual.subject.id}' from the shipped example “${system.name}”, drawn by the workbench's renderer.`));
      if (s.purpose !== null && s.purpose.represents.length > 0) {
        section.append(sub("What this exemplar preserves — its own declaration"));
        section.append(bulletList(s.purpose.represents));
      }
    }
  }

  if (s.quantities.length > 0) {
    section.append(sub("The quantitative model itself: annotations over the subject above"));
    const scroll = el("div", undefined, "scroll");
    const table = el("table");
    const head = el("thead");
    const hr = el("tr");
    for (const col of ["Quantity", "Annotates", "Dimension", "Declared value"]) hr.append(el("th", col));
    head.append(hr);
    const body = el("tbody");
    for (const q of s.quantities) {
      const tr = el("tr");
      tr.append(el("td", q.id, "id"), el("td", q.target, "id"), el("td", q.dimension), el("td", q.value));
      body.append(tr);
    }
    table.append(head, body);
    scroll.append(table);
    section.append(scroll);
  }

  section.append(sub("Properties you can measure"));
  section.append(el("p", `Question forms the engine answers over a ${s.entry.label}: ${s.entry.propertyFamilies.join(", ")}.`, "intro"));
  if (s.questions.length > 0) {
    section.append(el("p", "Asked of this exemplar, as its authors saved them:", "intro"));
    section.append(questionList(s.questions));
  }

  section.append(sub("What it deliberately does not tell you"));
  section.append(bulletList(s.entry.omits));
  if (s.purpose !== null && s.purpose.omits.length > 0) {
    section.append(el("p", "And this exemplar's own declared omissions:", "intro"));
    section.append(bulletList(s.purpose.omits));
  }

  section.append(sub("Combine with"));
  const combine = el("div", undefined, "learn-combine");
  combine.append(el("p", s.entry.combineWith.partnerLabel, "outcome"));
  combine.append(el("p", `Together you can ask: “${s.entry.combineWith.richerQuestion}”`));
  if (s.combinedIn.length > 0) {
    const where = el("p", undefined, "intro");
    where.append(document.createTextNode("Both declared in "));
    s.combinedIn.forEach((id, i) => {
      if (i > 0) where.append(document.createTextNode(", "));
      const a = el("a", systems.get(id)?.name ?? id);
      a.href = "index.html";
      where.append(a);
    });
    where.append(document.createTextNode(" — load it in the Workspace and ask."));
    combine.append(where);
  }
  section.append(combine);

  section.append(sub("When this model is missing"));
  // The sentence is the kernel's own `missing-model-type` refusal, generated from the same
  // registry entry this section renders — the NOT ANSWERABLE panel links back here.
  section.append(el("p", `Ask without one and the workbench answers NOT ANSWERABLE with: “${s.refusalProse}”`, "refusal"));

  section.append(el("p", `To add one: ${firstEntrySchemaSentence(s)}`, "intro"));
  return section;
}

/** The registry's own authoring move — the sentence the refusal ends with, shown once more here. */
const firstEntrySchemaSentence = (s: LearnTypeSection): string => {
  // The refusal prose already embeds `wouldLicense`; the entry page leads with the citations so a
  // reader can open the authority rather than trust this page.
  const cites = s.entry.schema.map((c) => `${c.file} (${c.symbol})`).join("; ");
  return `the shape is defined at ${cites}.`;
};

function useSection(s: LearnUseSection, systems: ReadonlyMap<ShippedExampleId, CanonicalSystem>): HTMLElement {
  const section = el("section");
  section.id = s.anchor;
  const h = el("h2", s.use.question);
  h.id = `${s.anchor}-h`;
  section.setAttribute("aria-labelledby", h.id);
  section.append(h);
  // The ruling: a use card says what it is underneath.
  const under = el("p", undefined, "intro");
  under.append(document.createTextNode(`${s.use.label} — underneath, a ${s.ofTypeLabel}. `));
  const back = el("a", `See ${s.ofTypeLabel}s`);
  back.href = learnHrefForType(s.use.ofType);
  under.append(back);
  section.append(under);

  const system = systems.get(s.visual.example);
  if (system !== undefined) {
    section.append(figure(system, s.visual.subject,
      `model '${s.visual.subject.id}' from the shipped example “${system.name}” — the use's exemplar, drawn by the workbench's renderer.`,
      s.showProperties));
  }
  if (s.purpose !== null && s.purpose.represents.length > 0) {
    section.append(sub("What this exemplar preserves — its own declaration"));
    section.append(bulletList(s.purpose.represents));
  }

  section.append(sub("The kernel features that make it work"));
  const dl = el("dl", undefined, "prov");
  for (const c of s.use.enabledBy) {
    dl.append(el("dt", `${c.file} — ${c.symbol}`), el("dd", c.role));
  }
  section.append(dl);

  if (s.questions.length > 0) {
    section.append(sub("A property join, shipped and answerable"));
    section.append(questionList(s.questions));
  }
  if (s.purpose !== null && s.purpose.omits.length > 0) {
    section.append(sub("What it deliberately does not tell you"));
    section.append(bulletList(s.purpose.omits));
  }
  return section;
}

// --------------------------------------------------------------------------------------------
// Gallery
// --------------------------------------------------------------------------------------------

function galleryCard(href: string, question: string, label: string): HTMLElement {
  const li = el("li", undefined, "learn-card");
  const a = el("a");
  a.href = `#${href}`;
  a.append(el("span", question, "learn-card-question"), el("span", label, "learn-card-label"));
  li.append(a);
  return li;
}

async function boot(): Promise<void> {
  const main = document.getElementById("learn-main");
  if (main === null) throw new Error("learn.html did not provide #learn-main");

  const systems = new Map<ShippedExampleId, CanonicalSystem>();
  await Promise.all(SHIPPED_EXAMPLE_IDS.map(async (id) => {
    const res = await fetch(`examples/${id}/system.mage.yaml`);
    if (!res.ok) throw new Error(`examples/${id}/system.mage.yaml: HTTP ${res.status}`);
    systems.set(id, Workspace.canonicalizeOnly(parse(await res.text())));
  }));

  const typeSections = buildTypeSections(systems);
  const useSections = buildUseSections(systems);

  const nav = el("nav");
  nav.setAttribute("aria-label", "Model gallery");
  const cards = el("ul", undefined, "learn-cards");
  for (const s of typeSections) cards.append(galleryCard(s.anchor, s.entry.question, s.entry.label));
  for (const s of useSections) {
    cards.append(galleryCard(s.anchor, s.use.question, `${s.use.label} — a ${s.ofTypeLabel}`));
  }
  nav.append(cards);
  main.append(nav);

  for (const s of typeSections) main.append(typeSection(s, systems));
  for (const s of useSections) main.append(useSection(s, systems));

  // The browser tier waits on this rather than on network idle: it marks the derivation complete.
  (window as unknown as Record<string, unknown>)["mageLearn"] = {
    ready: true,
    types: typeSections.map((s) => s.entry.id),
    uses: useSections.map((s) => s.use.id),
  };
}

boot().catch((e: unknown) => {
  const main = document.getElementById("learn-main");
  main?.append(el("p", `The Learn page failed to build: ${String(e)}`, "refusal"));
  throw e;
});
