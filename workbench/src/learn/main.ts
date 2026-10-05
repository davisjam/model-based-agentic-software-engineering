/**
 * The Learn page: three kinds of engineering question, every fact derived (UX-I9), every visual the
 * workbench's own renderer over a shipped example.
 *
 * ## The page's job, and what it is NOT
 *
 * Not "here are the model forms the workbench supports". The page teaches three QUESTIONS — what is
 * connected to what, what behaviour can occur over time, what an execution costs — and each model
 * form follows because it is the appropriate purposeful reduction for its question. So a model
 * form's section leads with its question, not its name, and every section uses the same four-part
 * progression: the question, the model, what the model lets you ask, what it leaves out. The
 * repetition is the pedagogy (`PART` below declares the labels once for that reason).
 *
 * The questions and the forms come from the model-type registry, which has carried a `question`
 * field all along; the reframe is which of a section's facts leads, not a new source.
 *
 * ## Three kinds of section, and the distinction is which source derives them
 *
 *   - **TYPE and USE sections** (`content.ts`) — the model-type registry and its declared uses, one
 *     per registry row, the count owned by the registry.
 *   - **QUESTION sections** (`questions.ts`) — the reframe's own: evidence, properties,
 *     requirements, agents, omissions. Declared anchors, BUILT content: each one runs the kernel
 *     over shipped examples and renders what comes back, so it cannot claim a verdict the engine
 *     stopped producing.
 *   - **GUIDE sections** (`workbench-guide.ts`) — how the application is laid out. Nothing in a
 *     model kernel knows how a pane reads, so these are declared rather than derived, and the
 *     suite polices the surfaces they vacated instead of a registry row.
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
  type LearnTypeSection, type LearnUseSection, type SavedStatement,
} from "./content.ts";
import { fixturePathFor, readFixture, type ExampleFixture } from "./fixtures.ts";
import { buildQuestionSections, type BuiltQuestionSection } from "./questions.ts";
import { WORKBENCH_GUIDE, type GuideSection } from "./workbench-guide.ts";

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

function statementList(statements: readonly SavedStatement[]): HTMLElement {
  const ul = el("ul", undefined, "notes");
  for (const s of statements) ul.append(el("li", s.label));
  return ul;
}

function bulletList(items: readonly string[]): HTMLElement {
  const ul = el("ul", undefined, "notes");
  for (const item of items) ul.append(el("li", item));
  return ul;
}

const sub = (text: string): HTMLElement => el("p", text, "sublabel");

/**
 * A table in a horizontal-scroll container, with its header row.
 *
 * Extracted on the second site, not the third: the quantitative section built one inline and the
 * question sections need the same thing. Two copies would be two answers to "how does a table on
 * this page scroll at 320px", and the a11y tier pins that it does not overflow the page.
 *
 * `tabindex="0"` is not decoration: a region that scrolls must be reachable by keyboard, or a
 * keyboard-only reader cannot see the columns past the fold (WCAG 2.1.1, axe
 * `scrollable-region-focusable`). It is set UNCONDITIONALLY because whether this container actually
 * overflows depends on viewport and font metrics — CI's headless browser overflowed it while a
 * local run did not, which is precisely why the structural invariant is pinned by
 * `learn-scroll-focusable.test.ts` rather than left to the viewport-dependent axe tier to catch.
 */
function rowsTable(columns: readonly string[], rows: readonly (readonly string[])[]): HTMLElement {
  const scroll = el("div", undefined, "scroll");
  scroll.setAttribute("tabindex", "0");
  const table = el("table");
  const head = el("thead");
  const hr = el("tr");
  for (const col of columns) hr.append(el("th", col));
  head.append(hr);
  const body = el("tbody");
  for (const row of rows) {
    const tr = el("tr");
    for (const cell of row) tr.append(el("td", cell));
    body.append(tr);
  }
  table.append(head, body);
  scroll.append(table);
  return scroll;
}

/**
 * The four-part progression every model form's section uses, in the same order and under the same
 * labels (the author's §3).
 *
 * Furniture, and deliberately identical across the three sections: the repetition is the pedagogy,
 * so the labels are declared once here rather than written three times. What goes UNDER each label
 * is derived; the label itself names a slot.
 */
const PART = {
  model: "The model",
  ask: "What this model lets you ask",
  omits: "What this model leaves out",
  next: "Try next",
  missing: "When this model is missing",
} as const;

// --------------------------------------------------------------------------------------------
// Sections
// --------------------------------------------------------------------------------------------

function typeSection(s: LearnTypeSection, systems: ReadonlyMap<ShippedExampleId, CanonicalSystem>): HTMLElement {
  const section = el("section");
  section.id = s.anchor;
  // PART 1 — the engineering question. It is the heading, which is the reframe: a reader chooses a
  // model form by the question they need answered, not by a format name.
  const h = el("h2", s.entry.question);
  h.id = `${s.anchor}-h`;
  section.setAttribute("aria-labelledby", h.id);
  section.append(h, el("p",
    `A ${s.entry.label} is the purposeful reduction that answers it.`, "intro"));

  // PART 2 — the model. A real subject from a shipped example, drawn by the workbench's renderer.
  if (s.visual !== null) {
    const system = systems.get(s.visual.example);
    if (system !== undefined) {
      section.append(sub(PART.model));
      const what = s.visual.subject.kind === "model" ? "model" : "machine";
      section.append(figure(system, s.visual.subject,
        `${what} '${s.visual.subject.id}' from the shipped example “${system.name}”, drawn by the workbench's renderer.`));
      if (s.purpose !== null && s.purpose.represents.length > 0) {
        section.append(el("p", "What this exemplar preserves, in its own words:", "intro"));
        section.append(bulletList(s.purpose.represents));
      }
    }
  }

  if (s.quantities.length > 0) {
    section.append(el("p", "The quantities themselves: annotations over the subject above.", "intro"));
    section.append(rowsTable(
      ["Quantity", "Annotates", "Dimension", "Declared value"],
      s.quantities.map((q) => [q.id, q.target, q.dimension, q.value]),
    ));
  }

  // PART 3 — what the model lets you ask.
  section.append(sub(PART.ask));
  section.append(el("p", `Question forms the engine decides over a ${s.entry.label}: ${s.entry.forms.join(", ")}.`, "intro"));
  // The OTHER arm of the registry's query semantics, and the one that carried `select` and `count`
  // invisibly: a form is a question the engine decides, a subject is a thing a question names. Each
  // row's third cell is the registry's own `declaredBy` role, so a noun that cannot be selected on
  // its own says so here in the words the registry already uses.
  if (s.entry.subjects.length > 0) {
    section.append(el("p", "And what a question of this kind can name and select:", "intro"));
    section.append(rowsTable(
      ["What you can name", "How you name it", "What it is"],
      s.entry.subjects.map((x) => [x.noun, x.selector, x.declaredBy.role]),
    ));
  }
  if (s.statements.length > 0) {
    section.append(el("p", "Asked of this exemplar, as its authors stated them:", "intro"));
    section.append(statementList(s.statements));
  }

  // PART 4 — what the model leaves out. The purposeful-reduction half, and the transition to the
  // next form: each omission here is a question some other form answers.
  section.append(sub(PART.omits));
  section.append(bulletList(s.entry.omits));
  if (s.purpose !== null && s.purpose.omits.length > 0) {
    section.append(el("p", "And this exemplar's own declared omissions:", "intro"));
    section.append(bulletList(s.purpose.omits));
  }

  // The pairing, DEMOTED to navigation (the author's §15: "combineWith is navigation/pedagogy", not
  // semantic terminology a student has to learn). It used to sit between parts 3 and 4 under the
  // field's own name, which read as one more thing the model system declares. It is now a "try
  // next" pointer after the progression, and the registry field is unchanged — renaming it is a
  // registry change this wave does not own.
  section.append(sub(PART.next));
  const combine = el("div", undefined, "learn-combine");
  combine.append(el("p", `Add a ${s.entry.combineWith.partnerLabel} to this system.`, "outcome"));
  combine.append(el("p", `Then you can ask: “${s.entry.combineWith.richerQuestion}”`));
  if (s.combinedIn.length > 0) {
    const where = el("p", undefined, "intro");
    where.append(document.createTextNode("Both are declared in "));
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

  section.append(sub(PART.missing));
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
    section.append(sub(PART.model));
    section.append(el("p", "What this exemplar preserves, in its own words:", "intro"));
    section.append(bulletList(s.purpose.represents));
  }

  section.append(sub("The kernel features that make it work"));
  const dl = el("dl", undefined, "prov");
  for (const c of s.use.enabledBy) {
    dl.append(el("dt", `${c.file} — ${c.symbol}`), el("dd", c.role));
  }
  section.append(dl);

  if (s.statements.length > 0) {
    section.append(sub(PART.ask));
    section.append(statementList(s.statements));
  }
  if (s.purpose !== null && s.purpose.omits.length > 0) {
    section.append(sub(PART.omits));
    section.append(bulletList(s.purpose.omits));
  }
  return section;
}

/**
 * A question section: the reframe's own sections, every block BUILT rather than declared.
 *
 * Same visual grammar as a gallery section — a labelled `<section>`, an `h2` that is the engineering
 * question, the same `sublabel` / `notes` / `scroll` spellings — because to a reader it is one more
 * answer to "what can I ask here". What distinguishes it from a guide section is that its content
 * comes from running the kernel rather than from prose, which is why the citations are rendered:
 * a reader can open the authority instead of trusting this page.
 */
function questionSection(s: BuiltQuestionSection): HTMLElement {
  const section = el("section");
  section.id = s.section.anchor;
  const h = el("h2", s.section.heading);
  h.id = `${s.section.anchor}-h`;
  section.setAttribute("aria-labelledby", h.id);
  section.append(h, el("p", s.section.lede, "intro"));

  for (const block of s.blocks) {
    if (block.kind === "prose") { section.append(el("p", block.text)); continue; }
    if (block.kind === "bullets") {
      section.append(sub(block.label), bulletList(block.items));
      continue;
    }
    if (block.kind === "pairs") {
      // A readout is a description list, not a two-column table. The a11y tier settled this: a
      // table whose header cells have nothing to say reports `empty-table-header`, because the
      // markup claims a data grid for what is a term-and-value list. `dl.prov` is the spelling this
      // page already uses for exactly that shape.
      section.append(sub(block.label));
      const dl = el("dl", undefined, "prov");
      for (const [term, value] of block.pairs) dl.append(el("dt", term), el("dd", value));
      section.append(dl);
      continue;
    }
    section.append(sub(block.label), rowsTable(block.columns, block.rows));
  }

  // WHERE IT COMES FROM, rendered. The `derivedFrom` citations are this section's answer to the
  // question a type card answers with its schema authorities: a capability claim on this page is
  // checkable at a file and a symbol, not asserted.
  section.append(sub("Where this comes from"));
  const dl = el("dl", undefined, "prov");
  for (const c of s.section.derivedFrom) {
    dl.append(el("dt", `${c.file} — ${c.symbol}`), el("dd", c.role));
  }
  section.append(dl);
  return section;
}

/**
 * A guide section: the explanatory prose the operational panes used to carry.
 *
 * Built exactly like a gallery section — a labelled `<section>`, an `h2` that names it, the same
 * `sublabel` and `notes` spellings — because to a reader it IS one more entry on this page, and
 * giving it a second visual grammar would say it came from somewhere else. What distinguishes it is
 * that nothing in the kernel derives it, which is why its anchors are declared rather than computed
 * and why the suite polices the surfaces it vacated instead of a registry row.
 */
function guideSection(s: GuideSection): HTMLElement {
  const section = el("section");
  section.id = s.anchor;
  const h = el("h2", s.heading);
  h.id = `${s.anchor}-h`;
  section.setAttribute("aria-labelledby", h.id);
  section.append(h, el("p", s.intro, "intro"));
  for (const block of s.blocks) {
    if (block.kind === "prose") { section.append(el("p", block.text)); continue; }
    section.append(sub(block.label), bulletList(block.items));
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
  // The fixtures ride along with the systems — same directory, same fetch wave. The question
  // sections read the requirement statements and the declared modifications out of them; see
  // `fixtures.ts` for why that is a derivation rather than a copy.
  const fixtures = new Map<ShippedExampleId, ExampleFixture>();
  await Promise.all(SHIPPED_EXAMPLE_IDS.map(async (id) => {
    const [system, fixture] = await Promise.all([
      fetch(`examples/${id}/system.mage.yaml`),
      fetch(fixturePathFor(id)),
    ]);
    if (!system.ok) throw new Error(`examples/${id}/system.mage.yaml: HTTP ${system.status}`);
    if (!fixture.ok) throw new Error(`${fixturePathFor(id)}: HTTP ${fixture.status}`);
    systems.set(id, Workspace.canonicalizeOnly(parse(await system.text())));
    fixtures.set(id, readFixture(id, await fixture.text()));
  }));

  const typeSections = buildTypeSections(systems);
  const useSections = buildUseSections(systems);
  const questionSections = buildQuestionSections(systems, fixtures);

  const nav = el("nav");
  nav.setAttribute("aria-label", "Model gallery");
  const cards = el("ul", undefined, "learn-cards");
  for (const s of typeSections) cards.append(galleryCard(s.anchor, s.entry.question, s.entry.label));
  for (const s of useSections) {
    cards.append(galleryCard(s.anchor, s.use.question, `${s.use.label} — a ${s.ofTypeLabel}`));
  }
  nav.append(cards);

  // The reframe's own sections, routed BESIDE the model gallery rather than inside it. The cards
  // answer "which model form do I need"; these answer "what can I do with one once I have it", and
  // offering the two as one card grid would say they are the same kind of choice. The questions are
  // the link text, for the same reason the cards lead with theirs.
  const questionNav = el("nav");
  questionNav.setAttribute("aria-label", "Asking, evidence and properties");
  questionNav.append(el("p", "Once you have a model, these are the questions that make it "
    + "engineering knowledge rather than a diagram.", "intro"));
  const questionList = el("ul", undefined, "notes");
  for (const s of questionSections) {
    const li = el("li");
    const a = el("a", s.section.heading);
    a.href = `#${s.section.anchor}`;
    li.append(a);
    questionList.append(li);
  }
  questionNav.append(questionList);

  // The route to the guide, beside the gallery and not inside it. The cards answer "which model do
  // I need", which is a question about the kernel; the guide answers "how does this application
  // work", which is not — mixing them into one card grid would offer the two as the same kind of
  // choice. A list of links rather than a sentence with one link in it, so a reader can go straight
  // to the part they want and a keyboard user reaches each by Tab.
  const guideNav = el("nav");
  guideNav.setAttribute("aria-label", "About the workbench");
  guideNav.append(el("p", "New to the workbench? These explain the panes, what a property is, and "
    + "how asking works — the account the operational panes used to carry inline.", "intro"));
  const guideList = el("ul", undefined, "notes");
  for (const s of WORKBENCH_GUIDE) {
    const li = el("li");
    const a = el("a", s.heading);
    a.href = `#${s.anchor}`;
    li.append(a);
    guideList.append(li);
  }
  guideNav.append(guideList);

  main.append(nav, questionNav, guideNav);

  // READING ORDER, and it is the author's §16. The three model forms first, in the registry's own
  // order — structure, behaviour, quantity — because each form's omissions are the next form's
  // question. Then the uses, which are purposes OF those forms. Then the question sections: how you
  // know, what happens when the model changes, what must be true, whether an agent can join, and
  // what the whole thing leaves out. The guide stays last, because it explains the application
  // rather than the modelling.
  for (const s of typeSections) main.append(typeSection(s, systems));
  for (const s of useSections) main.append(useSection(s, systems));
  for (const s of questionSections) main.append(questionSection(s));
  for (const s of WORKBENCH_GUIDE) main.append(guideSection(s));

  // The browser tier waits on this rather than on network idle: it marks the derivation complete.
  (window as unknown as Record<string, unknown>)["mageLearn"] = {
    ready: true,
    types: typeSections.map((s) => s.entry.id),
    uses: useSections.map((s) => s.use.id),
    questions: questionSections.map((s) => s.section.anchor),
    guide: WORKBENCH_GUIDE.map((s) => s.anchor),
  };
}

boot().catch((e: unknown) => {
  const main = document.getElementById("learn-main");
  main?.append(el("p", `The Learn page failed to build: ${String(e)}`, "refusal"));
  throw e;
});
