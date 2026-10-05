/**
 * The Learn page: a short lesson, a clickable construct-by-construct walkthrough, and the derived
 * reference material — every fact derived (UX-I9), every visual the workbench's own renderer over
 * a shipped example.
 *
 * ## The page's shape
 *
 * Learn is a lesson first. It opens with a few paragraphs on what a model is, then walks the
 * student through the modeling constructs one at a time — entity, relationship, purpose, state
 * machine, question, evidence, property, requirement, change, quantity, multiple models, binding,
 * composition, boundary, agent — each step over a real shipped example, with one thing to do and
 * one observable consequence. The constructs emerge through the examples; the page does not define
 * an ontology first.
 *
 * The material that used to BE the page is still here, after the walkthrough, as reference: the
 * model gallery (one section per registry type and declared use), the capability sections, and the
 * workbench guide. Each walkthrough step links into it.
 *
 * ## Four kinds of section, and the distinction is which source derives them
 *
 *   - **LESSON and WALKTHROUGH sections** (`walkthrough.ts` + `walkthrough-view.ts`) — the lesson
 *     prose and step framing are declared furniture; every fact a step shows is computed by
 *     running the kernel, the renderer or a real `Workspace` over the shipped examples.
 *   - **TYPE and USE sections** (`content.ts`) — the model-type registry and its declared uses, one
 *     per registry row, the count owned by the registry.
 *   - **QUESTION sections** (`questions.ts`) — capability sections with declared anchors and BUILT
 *     content: each one runs the kernel over shipped examples and renders what comes back, so it
 *     cannot claim a verdict the engine stopped producing.
 *   - **GUIDE sections** (`workbench-guide.ts`) — how the application is laid out. Nothing in a
 *     model kernel knows how a pane reads, so these are declared rather than derived, and the
 *     suite polices the surfaces they vacated instead of a registry row.
 *
 * Composition root only. The content comes from the modules above; the pictures come from
 * `renderView` — the same seam the workbench binds, returning the SVG and its accessible twin
 * together, so a Learn visual cannot show a fact assistive technology does not get. The DOM
 * binders are the workbench's own (`src/ui/render-dom.ts`): reused, not copied, so a fix to how a
 * diagram or its twin paints reaches this page without anyone remembering to port it.
 *
 * Source-code citations — schema authorities, derivation citations, kernel-feature lists — are
 * rendered behind a disclosure ("Implementation and provenance"). They are auditability, not
 * teaching; a student learning what a model is does not need `src/engine/model-types.ts` in the
 * reading path, and an auditor still gets every citation by opening the disclosure.
 */
import { parse } from "yaml";
import { Workspace } from "../app/services.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../app/examples.ts";
import { learnHrefForType, type LearnEntry } from "../app/learn.ts";
import type { CanonicalSystem } from "../ir/types.ts";
import type { SchemaAuthority } from "../engine/model-types.ts";
import { budgetFigure, bulletList, el, figure, pairsList, rowsTable, sub } from "./dom.ts";
import {
  buildTypeSections, buildUseSections,
  type LearnTypeSection, type LearnUseSection, type SavedStatement,
} from "./content.ts";
import { fixturePathFor, readFixture, type ExampleFixture } from "./fixtures.ts";
import { buildQuestionSections, type BuiltQuestionSection } from "./questions.ts";
import { WORKBENCH_GUIDE, type GuideSection } from "./workbench-guide.ts";
import { LESSON_ANCHOR, REFERENCE_ANCHOR, WALKTHROUGH_ANCHORS } from "./walkthrough.ts";
import { renderLesson, renderWalkthroughNav, renderWalkthroughSteps } from "./walkthrough-view.ts";

// --------------------------------------------------------------------------------------------
// Shared section fragments
// --------------------------------------------------------------------------------------------

function statementList(statements: readonly SavedStatement[]): HTMLElement {
  const ul = el("ul", undefined, "notes");
  for (const s of statements) ul.append(el("li", s.label));
  return ul;
}

/**
 * A citation block, closed by default.
 *
 * `file:symbol` citations are the page's audit trail — a capability claim is checkable at a file
 * and a symbol, not asserted — and they stay on the page for exactly that reason. They are behind
 * a disclosure because they are provenance, not pedagogy: the reading path teaches the construct,
 * and the disclosure holds the receipts.
 */
function provenanceDetails(citations: readonly SchemaAuthority[], lead?: string): HTMLElement {
  const details = el("details", undefined, "walk-provenance");
  details.append(el("summary", "Implementation and provenance"));
  if (lead !== undefined) details.append(el("p", lead, "intro"));
  const dl = el("dl", undefined, "prov");
  for (const c of citations) dl.append(el("dt", `${c.file} — ${c.symbol}`), el("dd", c.role));
  details.append(dl);
  return details;
}

/**
 * What the kernel declares between a card's type and its pairing partner — §23.2's display rule.
 *
 * A description list, which is the page's existing spelling for "a term and what it means"
 * (`dl.prov`): the term is the registered kind in §23.2's own form, and the definition is the
 * registry entry's `interpretation`, so the student learns the name and the sentence together and
 * this function words neither. The empty case gets a sentence rather than silence — see the call
 * site for why that is the informative branch rather than a missing one.
 */
function relationshipKinds(pair: LearnEntry["combineWith"]): HTMLElement {
  if (pair.bindings.length === 0 && pair.compositions.length === 0) {
    return el("p", "The workbench declares no binding and no composition between these two model "
      + "forms. Pairing them is a route through this page, not a relationship the model system "
      + "states — the relationships it does state are below.", "intro");
  }
  const pairs: (readonly [string, string])[] = [];
  for (const b of pair.bindings) pairs.push([`bound by: ${b.name}`, b.interpretation]);
  for (const c of pair.compositions) pairs.push([`composed by: ${c.name}`, c.interpretation]);
  return pairsList(pairs);
}

/**
 * The per-section labels, declared once so the three reference section kinds use the same
 * spellings in the same order. What goes UNDER each label is derived; the label names a slot.
 */
const PART = {
  model: "The model",
  ask: "What this model lets you ask",
  omits: "What this model leaves out",
  next: "Try next",
  missing: "When this model is missing",
} as const;

// --------------------------------------------------------------------------------------------
// Reference sections
// --------------------------------------------------------------------------------------------

function typeSection(s: LearnTypeSection, systems: ReadonlyMap<ShippedExampleId, CanonicalSystem>): HTMLElement {
  const section = el("section");
  section.id = s.anchor;
  // The heading names the thing; the registry's engineering question sits directly under it. Both
  // strings are the registry's own.
  const h = el("h2", `${s.entry.label}s`);
  h.id = `${s.anchor}-h`;
  section.setAttribute("aria-labelledby", h.id);
  section.append(h, el("p", `Answers: ${s.entry.question}`, "intro"));

  // The model: a real subject from a shipped example, drawn by the workbench's renderer. Two
  // picture kinds, because the kernel has two kinds of subject — a scene, or a budget projection.
  if (s.visual !== null) {
    const system = systems.get(s.visual.example);
    const picture = s.visual.picture;
    if (system !== undefined) {
      section.append(sub(PART.model));
      if (picture.kind === "scene") {
        const what = picture.subject.kind === "model" ? "model" : "machine";
        section.append(figure(system, picture.subject,
          `${what} '${picture.subject.id}' from the shipped example “${system.name}”, drawn by the workbench's renderer.`));
      } else {
        section.append(budgetFigure(system, picture.dimension,
          `the ${picture.dimension} budget of the shipped example “${system.name}”, drawn by the workbench's own quantitative projection.`));
      }
      if (s.purpose !== null && s.purpose.represents.length > 0) {
        section.append(el("p", "What this model preserves", "intro"));
        section.append(bulletList(s.purpose.represents));
      }
    }
  }

  if (s.quantities.length > 0) {
    section.append(el("p", "Every quantity the example declares, as written:", "intro"));
    section.append(rowsTable(
      ["Quantity", "Annotates", "Dimension", "Declared value"],
      s.quantities.map((q) => [q.id, q.target, q.dimension, q.value]),
    ));
  }

  // What the model lets you ask.
  section.append(sub(PART.ask));
  section.append(el("p", `Question forms the engine decides over a ${s.entry.label}: ${s.entry.forms.join(", ")}.`, "intro"));
  // The OTHER arm of the registry's query semantics: a form is a question the engine decides, a
  // subject is a thing a question names. Each row's third cell is the registry's own `declaredBy`
  // role, so a noun that cannot be selected on its own says so here in the registry's words.
  if (s.entry.subjects.length > 0) {
    section.append(el("p", "What a question of this kind can name", "intro"));
    section.append(rowsTable(
      ["What you can name", "How", "What it means"],
      // `means`, never `declaredBy.role`. The role is provenance -- what a cited SYMBOL is
      // authoritative for -- and rendering it here put invariant ids and implementation detail
      // where a reader expects a definition. The role still ships, under the provenance disclosure.
      s.entry.subjects.map((x) => [x.noun, x.selector.replace(/-/g, " "), x.means]),
    ));
  }
  if (s.statements.length > 0) {
    section.append(el("p", "Questions asked of this model", "intro"));
    section.append(statementList(s.statements));
  }

  // What the model leaves out — and the transition to the next form: each omission here is a
  // question some other form answers.
  section.append(sub(PART.omits));
  section.append(bulletList(s.entry.omits));
  if (s.purpose !== null && s.purpose.omits.length > 0) {
    section.append(el("p", "What this model deliberately omits", "intro"));
    section.append(bulletList(s.purpose.omits));
  }

  // The pairing, as navigation (the registry's own framing: `combineWith` routes, it does not
  // declare semantics). The KIND rendered beside it from `BINDINGS` / `COMPOSITIONS` is §23.2's
  // other half: once a relationship is established, display its actual semantic kind — and an
  // empty pair is rendered too, because "the kernel declares nothing between these two domains"
  // is the informative case.
  section.append(sub(PART.next));
  const combine = el("div", undefined, "learn-combine");
  combine.append(el("p", `Add a ${s.entry.combineWith.partnerLabel} to this system.`, "outcome"));
  combine.append(el("p", `Then you can ask: “${s.entry.combineWith.richerQuestion}”`));
  combine.append(relationshipKinds(s.entry.combineWith));
  if (s.combinedIn.length > 0) {
    // ONE LINK PER VISUAL ROW, and that is an accessibility decision rather than a layout taste:
    // a wrapped inline run of links puts several tab stops on one visual row, which is where
    // reading order and focus order can disagree (WCAG 2.4.3 — caught at 576px on this page). A
    // one-column list cannot invert: every visual row holds exactly one stop.
    combine.append(el("p", "Both are declared in these shipped examples — load one in the Workspace and ask.", "intro"));
    const where = el("ul", undefined, "learn-example-links");
    for (const id of s.combinedIn) {
      const item = el("li");
      const a = el("a", systems.get(id)?.name ?? id);
      a.href = "index.html";
      item.append(a);
      where.append(item);
    }
    combine.append(where);
  }
  section.append(combine);

  section.append(sub(PART.missing));
  // The sentence is the kernel's own `missing-model-type` refusal, generated from the same
  // registry entry this section renders — the NOT ANSWERABLE panel links back here.
  section.append(el("p", `Ask without one and the workbench answers NOT ANSWERABLE with: “${s.refusalProse}”`, "refusal"));
  section.append(provenanceDetails(s.entry.schema,
    "To add one, the shape is defined at:"));
  return section;
}

function useSection(s: LearnUseSection, systems: ReadonlyMap<ShippedExampleId, CanonicalSystem>): HTMLElement {
  const section = el("section");
  section.id = s.anchor;
  const h = el("h2", s.use.label);
  h.id = `${s.anchor}-h`;
  section.setAttribute("aria-labelledby", h.id);
  section.append(h);
  // The ruling: a use card says what it is underneath.
  const under = el("p", undefined, "intro");
  under.append(document.createTextNode(`${s.use.question} Underneath, a ${s.ofTypeLabel}. `));
  const back = el("a", `See ${s.ofTypeLabel}s`);
  back.href = learnHrefForType(s.use.ofType);
  under.append(back);
  section.append(under);

  const system = systems.get(s.visual.example);
  // A use's exemplar is always a declared MODEL -- `buildUseSections` constructs the picture from
  // `use.exemplar`, which names one. The narrowing is here rather than asserted because the compiler
  // can hold it: a use that ever gained a budget exemplar would be a type error at this line.
  if (system !== undefined && s.visual.picture.kind === "scene") {
    const subject = s.visual.picture.subject;
    section.append(figure(system, subject,
      `model '${subject.id}' from the shipped example “${system.name}” — the use's exemplar, drawn by the workbench's renderer.`,
      s.showProperties));
  }
  if (s.purpose !== null && s.purpose.represents.length > 0) {
    section.append(sub(PART.model));
    section.append(el("p", "What this model preserves", "intro"));
    section.append(bulletList(s.purpose.represents));
  }

  if (s.statements.length > 0) {
    section.append(sub(PART.ask));
    section.append(statementList(s.statements));
  }
  if (s.purpose !== null && s.purpose.omits.length > 0) {
    section.append(sub(PART.omits));
    section.append(bulletList(s.purpose.omits));
  }
  section.append(provenanceDetails(s.use.enabledBy, "The kernel features that make it work:"));
  return section;
}

/**
 * A question section: a capability section whose every block is BUILT rather than declared.
 *
 * Same visual grammar as a gallery section — a labelled `<section>`, the same `sublabel` / `notes`
 * / `scroll` spellings — because to a reader it is one more entry on this page. What distinguishes
 * it is that its content comes from running the kernel rather than from prose, which is why the
 * citations are rendered (behind the provenance disclosure): a reader can open the authority
 * instead of trusting this page.
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
      // A readout is a description list, not a two-column table: a table whose header cells have
      // nothing to say reports `empty-table-header` (axe), because the markup claims a data grid
      // for what is a term-and-value list.
      section.append(sub(block.label), pairsList(block.pairs));
      continue;
    }
    section.append(sub(block.label), rowsTable(block.columns, block.rows));
  }

  section.append(provenanceDetails(s.section.derivedFrom));
  return section;
}

/**
 * A guide section: the explanatory prose the operational panes used to carry.
 *
 * Built exactly like a gallery section, because to a reader it IS one more entry on this page.
 * What distinguishes it is that nothing in the kernel derives it, which is why its anchors are
 * declared rather than computed and why the suite polices the surfaces it vacated instead of a
 * registry row.
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
  // The source texts ride along with the systems: the walkthrough's what-if steps load one into a
  // real Workspace, so the branch they open is over the same bytes the page parsed.
  const texts = new Map<ShippedExampleId, string>();
  // And the fixtures — same directory, same fetch wave. The question sections and the walkthrough
  // read the requirement statements and the declared modifications out of them; see `fixtures.ts`
  // for why that is a derivation rather than a copy.
  const fixtures = new Map<ShippedExampleId, ExampleFixture>();
  await Promise.all(SHIPPED_EXAMPLE_IDS.map(async (id) => {
    const [system, fixture] = await Promise.all([
      fetch(`examples/${id}/system.mage.yaml`),
      fetch(fixturePathFor(id)),
    ]);
    if (!system.ok) throw new Error(`examples/${id}/system.mage.yaml: HTTP ${system.status}`);
    if (!fixture.ok) throw new Error(`${fixturePathFor(id)}: HTTP ${fixture.status}`);
    const text = await system.text();
    texts.set(id, text);
    systems.set(id, Workspace.canonicalizeOnly(parse(text)));
    fixtures.set(id, readFixture(id, await fixture.text()));
  }));

  const typeSections = buildTypeSections(systems);
  const useSections = buildUseSections(systems);
  const questionSections = buildQuestionSections(systems, fixtures);

  // The lesson, then the walkthrough: the page's primary path.
  main.append(renderLesson(), renderWalkthroughNav(),
    ...renderWalkthroughSteps({ systems, texts, fixtures }));

  // The reference material. The gallery nav carries the reference anchor, so the walkthrough's
  // "done" link and the multiple-models step can land here.
  const refHeading = el("h2", "Reference", "walk-reference-heading");
  refHeading.id = REFERENCE_ANCHOR;
  main.append(refHeading);

  const nav = el("nav");
  nav.setAttribute("aria-label", "Model gallery");
  nav.append(el("p", "One entry per model form the kernel registers, led by the engineering "
    + "question it answers.", "intro"));
  const cards = el("ul", undefined, "learn-cards");
  for (const s of typeSections) cards.append(galleryCard(s.anchor, s.entry.question, s.entry.label));
  for (const s of useSections) {
    cards.append(galleryCard(s.anchor, s.use.question, `${s.use.label} — a ${s.ofTypeLabel}`));
  }
  nav.append(cards);

  // The capability sections, routed BESIDE the model gallery rather than inside it: the cards
  // answer "which model form do I need"; these answer "what can I do with one once I have it".
  const questionNav = el("nav");
  questionNav.setAttribute("aria-label", "Working with a model");
  questionNav.append(el("p", "What you can do with a model once you have one, in depth:", "intro"));
  const questionList = el("ul", undefined, "notes");
  for (const s of questionSections) {
    const li = el("li");
    const a = el("a", s.section.heading);
    a.href = `#${s.section.anchor}`;
    li.append(a);
    questionList.append(li);
  }
  questionNav.append(questionList);

  // The route to the guide, beside the gallery and not inside it: the guide answers "how does
  // this application work", which is not a kernel question. A list of links rather than a sentence
  // with one link in it, so a keyboard user reaches each by Tab.
  const guideNav = el("nav");
  guideNav.setAttribute("aria-label", "About the workbench");
  guideNav.append(el("p", "How the application itself is laid out:", "intro"));
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

  // Reading order: the three model forms first, in the registry's own order — structure,
  // behaviour, quantity — because each form's omissions are the next form's question. Then the
  // uses, which are purposes OF those forms. Then the capability sections. The guide stays last,
  // because it explains the application rather than the modelling.
  for (const s of typeSections) main.append(typeSection(s, systems));
  for (const s of useSections) main.append(useSection(s, systems));
  for (const s of questionSections) main.append(questionSection(s));
  for (const s of WORKBENCH_GUIDE) main.append(guideSection(s));

  // The browser tier waits on this rather than on network idle: it marks the derivation complete.
  (window as unknown as Record<string, unknown>)["mageLearn"] = {
    ready: true,
    lesson: LESSON_ANCHOR,
    walkthrough: [...WALKTHROUGH_ANCHORS],
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
