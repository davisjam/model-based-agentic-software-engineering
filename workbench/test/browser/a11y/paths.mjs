/**
 * The machinery a declared navigation path is DRIVEN with. A keyboard, the page's own structure,
 * and nothing that could make a path pass without a person being able to walk it.
 *
 * `DESIGN-shell-261002.md` §2.3 rung 2, and `DECISIONS-RULED-shell-261002.md` G1's condition: "the
 * load-bearing half is the drive, not the declaration." So the walk is GENERATED from the `path`
 * field — no route is written here, and this module contains no list of affordances, surfaces or
 * controls. It reads the registry's declaration and the served page, and the only thing it knows
 * how to do is take a step.
 *
 * **The argument that a path cannot pass this drive unless a human can walk it.** Three
 * assertions, each closing one way a declaration could be true on paper and false in the page:
 *
 *   1. CONTAINMENT. Every step's surface resolves through the shell's SURFACES table to an element,
 *      and that element must CONTAIN the terminal and must not be inside anything `hidden`. A path
 *      naming a region the control does not live in fails; a path whose region is still hidden
 *      because its precondition was not declared fails.
 *   2. EXACTNESS of the disclosures. The collapsed `<details>` on the terminal's ancestor chain are
 *      COUNTED on the page after the preconditions are established, and that count must equal the
 *      number of `disclose`/`menu` steps declared. Under-declare and the terminal sits inside
 *      something closed, which `reachBySelector` reports as keyboard-unreachable. Over-declare and
 *      the count disagrees. This is the assertion that makes the declaration exact rather than
 *      merely consistent.
 *   3. ARRIVAL by keyboard. Each collapsed disclosure is opened outermost-first with Tab and Enter
 *      on its own `<summary>`, and the terminal is then reached with Tab. Nothing here calls
 *      `click()`, `focus()`, or an application handler — `keyboard.mjs`'s own header says why each
 *      is excluded, and this module imports its verbs rather than inventing softer ones.
 *
 * Together: the declaration cannot be satisfied by a control that exists, only by one the keyboard
 * arrives at from the state the declaration itself names. A sentence an author wrote cannot pass.
 *
 * The one sanctioned non-keyboard act is a PRECONDITION the requirement itself assigns to an agent:
 * `hypothesis-open` needs an agent to open a hypothesis, exactly as §19's "review an agent
 * hypothesis" does. It is named at its routine, not hidden here.
 */
import assert from "node:assert/strict";
import { reachBySelector, activateByKeyboard, typeInto, chooseByKeyboard, settle } from "./keyboard.mjs";

/**
 * What each precondition needs first. Declared rather than baked into the routines, so a routine is
 * one act and the ORDER is data a reader can check against the page.
 */
const DEPENDS = {
  loaded: [],
  "property-exists": ["loaded"],
  edited: ["loaded"],
  undone: ["edited"],
  /**
   * An answer with a TRACK offer needs a selection first, and the drive discovered that.
   *
   * `askbar.ts` unhides the Track box only for a catalogue item whose `savedId` is null
   * (`trackBox.hidden = item.savedId !== null`) — tracking a claim the system already saves would
   * be an offer to do nothing. With nothing selected the catalogue is exactly the saved questions,
   * so every option is already tracked and the box never opens. The CONTEXTUAL questions, which are
   * the untracked ones, appear only once an entity is selected. First measured run: pressing Ask on
   * the default option answered and left the box hidden, and the drive reported it rather than
   * reaching for `.hidden = false`.
   */
  "answer-present": ["selection:relation"],
  "selection:element": ["loaded"],
  "selection:relation": ["loaded"],
  /**
   * NEW IN WAVE 3, and the reason it can exist is a row rather than a harness trick.
   *
   * This precondition had no routine for a wave because the page had no act that produced a model
   * selection — the finding `WIRED_WITHOUT_A_WALKED_PATH` carried. The contents tree's subject row
   * produces one now, so the routine is the ordinary tree-selection one against a different
   * encoding, and `inspector.delete-model` walks like every other inspector action.
   */
  "selection:model": ["loaded"],
  "selection:machine": ["loaded"],
  "hypothesis-open": ["loaded"],
};

/**
 * The contents-tree row whose selection carries one of these encodings, as a selector.
 *
 * Read off `data-select`, which `treeRow` stamps from the same value the click handler sends. The
 * two earlier spellings of this lookup were the row's INDEX (`#model-contents button`, the first
 * one) and its rendered prose (the edge row was the one containing "→"), and wave 3 broke the first
 * of those by adding a row above it — which is the positional-handle failure arriving on schedule.
 */
const treeRowWithSelection = (page, prefixes) => page.evaluate((wanted) => {
  const path = (el) => {
    const parts = [];
    for (let n = el; n !== null && n !== document.documentElement; n = n.parentElement) {
      const parent = n.parentElement;
      if (parent === null) break;
      parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${[...parent.children].indexOf(n) + 1})`);
    }
    return parts.join(" > ");
  };
  const found = [...document.querySelectorAll("#model-contents button[data-select]")]
    .find((b) => wanted.some((p) => (b.dataset.select ?? "").startsWith(p)));
  return found === undefined ? null : { selector: path(found), select: found.dataset.select };
}, prefixes);

/** Open the collapsed structured reading, activate the row carrying one of `prefixes`, assert it. */
async function selectInTree(page, prefixes, what) {
  await activateByKeyboard(page, "model-reading-summary", { settleMs: 200 });
  const row = await treeRowWithSelection(page, prefixes);
  assert.ok(row !== null,
    `the contents tree renders no row whose data-select starts with one of `
    + `${JSON.stringify(prefixes)}, so no keyboard route selects ${what}`);
  await reachBySelector(page, row.selector);
  await page.keyboard.press("Enter");
  await settle(400);
  const selection = await page.evaluate(() => window.mage.view.selection());
  assert.ok(selection.some((v) => prefixes.some((p) => v.startsWith(p))),
    `Enter on the ${what} row (data-select="${row.select}") left the selection at `
    + `${JSON.stringify(selection)}`);
}

/** A `<summary>`'s own selector, so a disclosure with no id is still reachable by Tab. */
const cssPathOfSummary = (page, detailsPath) => page.evaluate((p) => {
  const path = (el) => {
    const parts = [];
    for (let n = el; n !== null && n !== document.documentElement; n = n.parentElement) {
      const parent = n.parentElement;
      if (parent === null) break;
      const i = [...parent.children].indexOf(n) + 1;
      parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${i})`);
    }
    return parts.join(" > ");
  };
  const details = document.querySelector(p);
  if (details === null) return null;
  const summary = details.querySelector(":scope > summary");
  return summary === null ? null : path(summary);
}, detailsPath);

/**
 * The collapsed `<details>` between the document and the terminal, outermost first, as selectors.
 *
 * Read off the PAGE rather than off the declaration, which is what lets the count be an assertion
 * about the declaration instead of a restatement of it.
 */
const collapsedAncestors = (page, terminal) => page.evaluate((sel) => {
  const path = (el) => {
    const parts = [];
    for (let n = el; n !== null && n !== document.documentElement; n = n.parentElement) {
      const parent = n.parentElement;
      if (parent === null) break;
      const i = [...parent.children].indexOf(n) + 1;
      parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${i})`);
    }
    return parts.join(" > ");
  };
  const el = document.querySelector(sel);
  if (el === null) return null;
  const out = [];
  for (let n = el.parentElement; n !== null; n = n.parentElement) {
    if (n.tagName === "DETAILS" && !n.open) out.unshift({ path: path(n), id: n.id });
  }
  return out;
}, terminal);

/** Everything a terminal assertion needs, in one round trip. */
const terminalFacts = (page, terminal, hosts) => page.evaluate((sel, hostIds) => {
  const el = document.querySelector(sel);
  if (el === null) return null;
  const CONTROL = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A", "SUMMARY"]);
  const name = (host) => {
    const ids = (host.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter((s) => s !== "");
    const text = ids.map((i) => document.getElementById(i)?.textContent ?? "").join(" ").trim();
    return text !== "" ? text : (host.getAttribute("aria-label") ?? "").trim();
  };
  return {
    tag: el.tagName,
    isControl: CONTROL.has(el.tagName),
    disabled: el.disabled ?? null,
    hiddenAncestor: el.closest("[hidden]")?.id ?? null,
    textLength: (el.textContent ?? "").trim().length,
    hosts: hostIds.map((id) => {
      const host = document.getElementById(id);
      if (host === null) return { id, present: false };
      return {
        id, present: true, contains: host === el || host.contains(el),
        hiddenAncestor: host.closest("[hidden]")?.id ?? null,
        accessibleName: name(host), tag: host.tagName,
      };
    }),
  };
}, terminal, hosts);

/** `#id`, or `#id <descendant>` for a site declared with a `within` selector. */
export const terminalSelector = (element) =>
  element.within === undefined ? `#${element.id}` : `#${element.id} ${element.within}`;

/**
 * Establish one precondition, and its prerequisites, on a page that is otherwise pristine.
 *
 * Every routine is keyboard-only but one, and that one is named where it is. A precondition with no
 * routine throws naming itself: the vocabulary gaining a member nothing can set up is a path
 * nothing can walk, and this is where that fails rather than passing silently.
 */
export async function establish(page, want, done = new Set()) {
  if (done.has(want)) return done;
  const depends = DEPENDS[want];
  assert.ok(depends !== undefined,
    `the precondition '${want}' has no routine and no declared prerequisites — the NavPrecondition `
    + "vocabulary gained a member nothing in this harness can establish, so no drive can walk a path "
    + "that requires it. Add a routine in test/browser/a11y/paths.mjs beside the others.");
  for (const first of depends) await establish(page, first, done);
  await ROUTINE[want](page);
  done.add(want);
  return done;
}

const ROUTINE = {
  /**
   * Load a system BY KEYBOARD, through Start's own example control.
   *
   * The agent path (`window.mage.load`, which `loadFlagshipExample` uses) would have been one line.
   * It is not used, because this is the precondition every other path depends on and establishing
   * it through the agent would mean the whole suite ran against a state no keyboard produced. The
   * example id is read off the first option rather than named here.
   */
  loaded: async (page) => {
    const first = await page.evaluate(() => {
      const select = document.getElementById("example-choice");
      return select !== null && select.options.length > 0 ? select.options[0].value : null;
    });
    assert.ok(first !== null && first !== "",
      "#example-choice offers no example, so no keyboard route loads a system");
    await chooseByKeyboard(page, "example-choice", first);
    await activateByKeyboard(page, "example-load", { settleMs: 200 });
    await page.waitForFunction(
      () => document.getElementById("workspace")?.hasAttribute("hidden") === false,
      { timeout: 30_000 },
    );
  },

  /** A saved question exists. Asserted off the loaded example rather than created. */
  "property-exists": async (page) => {
    const saved = await page.evaluate(() => Object.keys(window.mage.savedQueries()).length);
    assert.ok(saved > 0,
      `the loaded example declares ${saved} saved questions, so the property rail has no claim row `
      + "and nothing declares a path through it. An example with a saved question is the fixture "
      + "this precondition needs.");
  },

  /** An edit is committed, so Undo has something to undo. Through the pinned fieldset, by keyboard. */
  edited: async (page) => {
    await typeInto(page, "add-entity-id", "path-drive-probe");
    await typeInto(page, "add-entity-type", "service");
    await typeInto(page, "add-entity-label", "Path Drive Probe");
    await activateByKeyboard(page, "add-entity-go", { settleMs: 400 });
    const disabled = await page.evaluate(() => document.getElementById("undo").disabled);
    assert.equal(disabled, false,
      "an entity was added by keyboard and #undo is still disabled — there is no undo history, so "
      + `nothing can walk a path requiring 'edited'. #edit-result says `
      + `"${await page.evaluate(() => document.getElementById("edit-result").textContent?.trim())}"`);
  },

  /** And undone, so Redo has something to redo. */
  undone: async (page) => {
    await activateByKeyboard(page, "undo", { settleMs: 400 });
    const disabled = await page.evaluate(() => document.getElementById("redo").disabled);
    assert.equal(disabled, false, "Enter on #undo left #redo disabled — nothing to redo");
  },

  /**
   * An UNTRACKED answer is on screen, which is what unhides the ask bar's Track box.
   *
   * The option is chosen by its value's prefix rather than by its text: `askbar.ts` keys a
   * contextual item `ctx:<form>:<relation>:<entity>` and a saved one `saved:<id>`, so the prefix IS
   * the untracked/tracked distinction, read off the substrate instead of guessed from a label.
   */
  "answer-present": async (page) => {
    // ONE MORE KEYBOARD ACT, and the reason it is needed is a DEFECT this drive found rather than a
    // property of the design. `askCatalogue` resolves the selected entity with
    // `selection.find((id) => system.entities.has(id))` — a BARE entity id. The contents tree
    // writes the prefixed encoding `entity:<id>` (`nodeSelection`, wave 2b), so a tree selection
    // matches no entity and the contextual half of the catalogue stays empty. The inspector's own
    // navigate links still carry bare ids (`{ kind: "select", selection: r.from }`), so activating
    // one re-selects the same object in the encoding the ask bar understands. That is the route a
    // person has, and it is the route walked here; the two encodings are the finding, reported in
    // `DESIGN-shell-261002.md` §9f rather than smoothed over by setting `.hidden` from a probe.
    const bare = await page.evaluate(() => {
      const link = [...document.querySelectorAll("#inspector a[data-action='select']")]
        .find((a) => !(a.dataset.arg ?? "").includes(":"));
      if (link === undefined) return null;
      const parts = [];
      for (let n = link; n !== null && n !== document.documentElement; n = n.parentElement) {
        const parent = n.parentElement;
        if (parent === null) break;
        parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${[...parent.children].indexOf(n) + 1})`);
      }
      return { selector: parts.join(" > "), arg: link.dataset.arg };
    });
    assert.ok(bare !== null,
      "the inspector offers no link that selects an entity by its bare id, so no keyboard route "
      + "produces a selection the ask bar's catalogue recognises (the two-encoding defect, §9f)");
    await reachBySelector(page, bare.selector);
    await page.keyboard.press("Enter");
    await settle(400);
    const untracked = await page.evaluate(() => {
      const select = document.getElementById("ask-choice");
      const option = [...select.options].find((o) => o.value.startsWith("ctx:"));
      return option === undefined ? null : option.value;
    });
    assert.ok(untracked !== null,
      "the ask catalogue offers no contextual (untracked) question with an entity selected, so no "
      + "keyboard route produces an answer the Track control is offered for");
    await chooseByKeyboard(page, "ask-choice", untracked);
    await activateByKeyboard(page, "ask-submit", { settleMs: 800 });
    const answer = await page.evaluate(() =>
      (document.getElementById("ask-answer").textContent ?? "").replace(/\s+/g, " ").trim());
    assert.notEqual(answer, "", "Enter on #ask-submit produced no answer");
    await page.waitForFunction(
      () => document.getElementById("ask-track-box")?.hasAttribute("hidden") === false,
      { timeout: 10_000 },
    ).catch(() => {
      assert.fail(`an answer is on screen ("${answer.slice(0, 80)}") and #ask-track-box is still `
        + "hidden, so no keyboard route reaches askbar.track");
    });
  },

  /**
   * An element is selected, through the contents tree — the one surface that writes
   * `ViewState.selection` from a human act. The reading is collapsed by default, so the disclosure
   * is opened first, by keyboard.
   */
  "selection:element": async (page) => {
    await selectInTree(page, ["entity:", "state:"], "an element");
  },

  /** A relation is selected, through the tree's edge rows. */
  "selection:relation": async (page) => {
    await selectInTree(page, ["rel:"], "a relation");
  },

  /**
   * A MODEL is selected, through the row wave 3 added — the one act that unblocked SH-I8.
   *
   * Nothing here special-cases the model: the subject row is a tree row like any other, which is
   * the whole point of draining the path-less set with a row instead of an exception.
   */
  "selection:model": async (page) => {
    await selectInTree(page, ["model:"], "a model");
  },

  /**
   * A MACHINE is selected. The subject row carries whichever kind is drawn, so this needs the
   * workspace pointed at a machine first — through `#diagram-subject`, by keyboard.
   */
  "selection:machine": async (page) => {
    const machine = await page.evaluate(() => {
      const select = document.getElementById("diagram-subject");
      const option = [...(select?.options ?? [])].find((o) => o.value.startsWith("machine:"));
      return option === undefined ? null : option.value;
    });
    assert.ok(machine !== null,
      "#diagram-subject offers no machine, so no keyboard route draws one and the subject row "
      + "cannot carry a machine selection");
    await chooseByKeyboard(page, "diagram-subject", machine);
    await settle(400);
    await selectInTree(page, ["machine:"], "a machine");
  },

  /**
   * AN AGENT opens the hypothesis, and this is the sanctioned exception.
   *
   * `requirements-human-ux-261002.md` §19's eleventh operation is "review an AGENT hypothesis", so
   * an agent has to open one — the same reading `keyboard.test.mjs` 13.13 works from. Everything the
   * drive then does inside the review dialog is Tab and Enter. The G3 route (a consequential edit
   * becoming a branch by itself) is not usable here: no shipped example declares an expectation, so
   * on shipped content the interposition is latent (§9e).
   */
  "hypothesis-open": async (page) => {
    await page.evaluate(() => window.mage.hypothesis.open("path-drive-review", {
      transaction: {
        base: window.mage.context().hash,
        target: "path-drive-review",
        operations: [{ op: "add-entity", id: "path-drive-proposal", label: "Path Drive Proposal" }],
      },
    }));
    await page.waitForFunction(
      () => document.getElementById("hypothesis-bar").hidden === false, { timeout: 30_000 },
    );
  },
};

/**
 * Walk one declared path and return what the walk proved, for the receipt.
 *
 * Throws on the first thing that is not true, naming the affordance, the step and the page's own
 * state — the failure message is the whole value of a reachability gate, because "unreachable" and
 * "reachable but disabled" and "I looked in the wrong place" are three different bugs.
 */
export async function walkDeclaredPath(page, origin, { at, element, path }, surfaceElement) {
  await page.goto(`${origin}/index.html`, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.waitForFunction(() => typeof window.mage === "object", { timeout: 30_000 });

  const done = new Set();
  for (const s of path) {
    if (s.requires !== undefined) await establish(page, s.requires, done);
  }

  const terminal = terminalSelector(element);
  const hosts = [];
  for (const s of path) {
    const id = surfaceElement(s.surface);
    assert.ok(id !== null,
      `${at}: its path names the surface '${s.surface}', which SURFACES declares planned — a path `
      + "cannot cite a surface nobody built");
    hosts.push(id);
  }

  const facts = await terminalFacts(page, terminal, hosts);
  assert.ok(facts !== null,
    `${at}: nothing in the served page matches '${terminal}' after establishing `
    + `${JSON.stringify([...done])}. The declared element is absent, which is UX-I1's element half `
    + "failing rather than its path half.");

  // 1. CONTAINMENT. Every declared surface holds the control and is itself not hidden.
  for (let i = 0; i < path.length; i += 1) {
    const host = facts.hosts[i];
    const step = path[i];
    assert.ok(host.present,
      `${at}: step ${i + 1} names '${step.surface}', whose element #${host.id} is not in the page`);
    assert.equal(host.hiddenAncestor, null,
      `${at}: step ${i + 1}'s surface '${step.surface}' (#${host.id}) is inside hidden `
      + `#${host.hiddenAncestor} after establishing ${JSON.stringify([...done])} — the path is `
      + "missing a precondition, or declares a region that is not open in this state");
    assert.ok(host.contains,
      `${at}: step ${i + 1} names '${step.surface}' (#${host.id}), which does not contain `
      + `'${terminal}'. The route passes through a region the control does not live in.`);
  }

  // 2. EXACTNESS. Declared disclosures against the page's own collapsed ancestors.
  const collapsed = await collapsedAncestors(page, terminal);
  const declaredDisclosures = path.filter((s) => s.via === "disclose" || s.via === "menu").length;
  assert.equal(collapsed.length, declaredDisclosures,
    `${at}: the page has ${collapsed.length} collapsed disclosure(s) between the document and `
    + `'${terminal}' (${JSON.stringify(collapsed.map((c) => c.id || "(no id)"))}) and the path `
    + `declares ${declaredDisclosures}. Under-declaring hides a step a person has to take; `
    + "over-declaring describes an act the page does not have.");

  // 3. ARRIVAL. Open each disclosure outermost-first, by Tab and Enter on its own summary.
  const opened = [];
  for (const details of collapsed) {
    const summary = await cssPathOfSummary(page, details.path);
    assert.ok(summary !== null,
      `${at}: the collapsed <details> ${details.id || "(no id)"} has no <summary>, so no keyboard `
      + "act opens it — SH-I2 requires a disclosure control in the tab order");
    await reachBySelector(page, summary);
    await page.keyboard.press("Enter");
    await settle(200);
    const isOpen = await page.evaluate((p) => document.querySelector(p)?.open === true, details.path);
    assert.ok(isOpen,
      `${at}: Enter on the summary of ${details.id || "(no id)"} did not open it`);
    opened.push(details.id || "(no id)");
  }

  // The terminal, asserted by the kind the declaration claims for it.
  const last = path.length === 0 ? null : path[path.length - 1];
  const kind = last !== null && last.via === "read" ? "readout" : "control";
  if (kind === "control") {
    assert.ok(facts.isControl,
      `${at}: declared as a control and the page renders a <${facts.tag.toLowerCase()}>, which a `
      + "keyboard cannot focus. A readout declares `via: \"read\"`.");
    const presses = await reachBySelector(page, terminal);
    const disabled = await page.evaluate((sel) => document.querySelector(sel).disabled ?? false, terminal);
    assert.equal(disabled, false,
      `${at}: reached by Tab and DISABLED — a control a person arrives at and cannot use is not a `
      + "wired affordance. Its path is missing the precondition that enables it.");
    return { at, terminal, kind, presses, opened, established: [...done] };
  }

  assert.equal(facts.isControl, false,
    `${at}: declared 'read' and the page renders a focusable <${facts.tag.toLowerCase()}>. A control `
    + "declared as a readout is never reached by Tab in this drive, which would be coverage lost "
    + "silently — declare `via: \"activate\"`.");
  assert.equal(facts.hiddenAncestor, null,
    `${at}: the readout is inside hidden #${facts.hiddenAncestor}, so it is absent to assistive `
    + "technology as well as to a sighted reader");
  assert.ok(facts.textLength > 0,
    `${at}: the readout is empty after establishing ${JSON.stringify([...done])} — a region with no `
    + "content is not a representation of a semantic result (UX-I2)");
  const region = facts.hosts[facts.hosts.length - 1];
  assert.ok(region.accessibleName !== "",
    `${at}: the readout's region #${region.id} has no accessible name, so it does not appear in an `
    + "AT's landmark list by any name — which is how a screen-reader user navigates to it (F-5)");
  return {
    at, terminal, kind, opened, established: [...done],
    region: region.id, regionName: region.accessibleName, contentLength: facts.textLength,
  };
}
