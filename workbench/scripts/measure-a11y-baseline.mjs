// Measure the workbench's keyboard accessibility, capability by capability, and emit JSON.
//
// This script produced `BASELINE-a11y-261002.md`. It exists so that record can be RE-MEASURED
// against a later shell -- the progressive-disclosure redesign replaces the flat page, and
// "equivalent keyboard/AT access" is a comparison that needs a number on both sides.
//
// What it measures, and why each is separate:
//
//   REACHABLE   -- Tab, from a fresh load, visits the control. Pressed keys only. No `.focus()`,
//                  no `.click()`: programmatic focus skips the tab sequence, so a control that is
//                  focusABLE but not tabbable would pass.
//   OPERABLE    -- Enter (or Space / type-ahead) on the focused control produces an OBSERVABLE
//                  change: the system hash moves, a refusal appears, the live region writes, or a
//                  named readout's text changes. A key the page accepted and ignored is not
//                  operable.
//   NAMED       -- Chrome's own accessibility tree computes the name and role. Not the markup's
//                  spelling. A control AT announces as an unnamed "button" is reachable and
//                  unusable, and that is the distinction this script exists to keep apart.
//
// Three capability affordances are READOUTS, not controls -- a table or a list a person reads.
// They cannot be "reached by Tab" and it is not a defect that they cannot. They are measured as
// `kind: "readout"`: present, non-empty, and carrying real structure.
//
// Puppeteer is RESOLVED, never installed. `workbench/node_modules` is a symlink shared across
// parallel agent worktrees, so an install there mutates every live agent at once. The absolute
// path below reaches the copy the Pages workflow already installed under `book/`.
//
// Usage:
//   node scripts/measure-a11y-baseline.mjs                      # own server + own headless browser
//   node scripts/measure-a11y-baseline.mjs --browser-url=http://127.0.0.1:9222
//   node scripts/measure-a11y-baseline.mjs --port=8149 --out=/tmp/baseline.json
//
// Requires `node build.mjs` first: the page loads ./dist/workbench.js.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { join, normalize, extname, dirname } from "node:path";
import { createRequire } from "node:module";

const HERE = import.meta.dirname;
const WORKBENCH_DIR = join(HERE, "..");
const REPO_ROOT = join(WORKBENCH_DIR, "..");

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const PORT = Number(arg("port", "8149"));
const ORIGIN = arg("origin", `http://127.0.0.1:${PORT}`);
const BROWSER_URL = arg("browser-url", "");
const OUT = arg("out", "/tmp/wb-a11y-baseline.json");

const MIME = new Map(Object.entries({
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8", ".yml": "text/yaml; charset=utf-8",
  ".svg": "image/svg+xml",
}));

async function startServer(root, port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    const path = join(root, rel === "/" ? "index.html" : rel);
    if (!path.startsWith(root)) { res.writeHead(403).end("forbidden"); return; }
    readFile(path).then(
      (body) => res.writeHead(200, { "content-type": MIME.get(extname(path)) ?? "application/octet-stream" }).end(body),
      () => res.writeHead(404, { "content-type": "text/plain" }).end("not found"),
    );
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}

// `book/node_modules` holds the Chromium the Pages workflow installs. A git WORKTREE of this repo
// has no `book/node_modules` of its own -- it is gitignored -- so a worktree run resolves against
// the main checkout, which `--puppeteer-root` names. Nothing is ever installed either place.
const loadPuppeteer = async () => {
  const roots = [join(REPO_ROOT, "book"), arg("puppeteer-root", "")].filter((r) => r !== "");
  const tried = [];
  for (const root of roots) {
    try {
      const require = createRequire(join(root, "package.json"));
      // Absolute, because a relative specifier resolves against THIS file's directory.
      const entry = join(dirname(require.resolve("puppeteer/package.json")),
        "lib", "esm", "puppeteer", "puppeteer.js");
      const mod = await import(entry);
      return mod.default ?? mod;
    } catch (e) { tried.push(`${root}: ${e.message}`); }
  }
  throw new Error(`no puppeteer resolvable. Tried:\n  ${tried.join("\n  ")}\n`
    + "Pass --puppeteer-root=<dir containing a package.json whose node_modules has puppeteer>.");
};

// ------------------------------------------------------------------------------------------------
// The capability -> DOM map.
//
// `capabilities.ts` declares each affordance as a logical SITE string (`header.file-input`,
// `edit-section.add-entity`). Nothing in the codebase binds those strings to DOM ids -- the
// registry's `wired` is an author's assertion, and `checkRegistryClosure` is only ever called with
// literals in a unit test. This table is that binding, written by reading the page, and it is the
// weakest link in this measurement: a wrong row measures the wrong element. Each row therefore
// names the site verbatim so a reader can check it against the registry.
// ------------------------------------------------------------------------------------------------

const SITES = {
  "header.file-input": { id: "file", kind: "control", key: "Enter", skipActivate: "a native file picker cannot be driven by any automation protocol; reachability is measured, activation is not" },
  "header.new-system": { id: "new-system", kind: "control", key: "Enter" },
  "start.load-example": { id: "example-load", kind: "control", key: "Enter" },
  "header.export": { id: "export", kind: "control", key: "Enter" },
  "model-section.tables": { id: "sections", kind: "readout" },
  "validation-section.table": { id: "finding-list", kind: "readout" },
  "header.run-all": { id: "run", kind: "control", key: "Enter" },
  "properties-section.ask": { id: "ask-go", kind: "control", key: "Enter" },
  "properties-section.list": { id: "question-list", kind: "readout" },
  // `.evidence`, not `ul.evidence`: the renderer emits an ORDERED list, because a witness is a
  // sequence of steps. The first run of this script asked for `ul.evidence`, got nothing, and
  // recorded the evidence list as not AT-readable -- a wrong selector reported as a page defect.
  "properties-section.evidence-list": { id: "question-list", kind: "readout", within: ".evidence" },
  "analysis-section.explore": { id: null, kind: "declared-absent" },
  "header.undo": { id: "undo", kind: "control", key: "Enter" },
  "header.redo": { id: "redo", kind: "control", key: "Enter" },
  "edit-section.add-entity": { id: "add-entity-go", kind: "control", key: "Enter" },
  "edit-section.add-state": { id: "add-state-go", kind: "control", key: "Enter" },
  "edit-section.delete-element": { id: "delete-element-go", kind: "control", key: "Enter" },
  "edit-section.add-relation": { id: "add-relation-go", kind: "control", key: "Enter" },
  "edit-section.delete-relation": { id: "delete-relation-go", kind: "control", key: "Enter" },
  "edit-section.set-label": { id: "set-label-go", kind: "control", key: "Enter" },
  "edit-section.set-property": { id: "set-property-go", kind: "control", key: "Enter" },
  "edit-section.add-model": { id: "add-model-go", kind: "control", key: "Enter" },
  "edit-section.delete-model": { id: "delete-model-go", kind: "control", key: "Enter" },
  "edit-section.add-note": { id: "add-note-go", kind: "control", key: "Enter" },
  "properties-section.save": { id: "save-property-go", kind: "control", key: "Enter" },
  "properties-section.retract": { id: "retract-property-go", kind: "control", key: "Enter" },
  "provenance-section.records": { id: "provenance-list", kind: "readout" },
  "edit-section.hypothesis-target": { id: "target-hypothesis", kind: "radio", group: "edit-target" },
  "hypothesis-bar.accept": { id: "hypothesis-apply", kind: "control", key: "Enter", needs: "hypothesis" },
  "hypothesis-bar.discard": { id: "hypothesis-discard", kind: "control", key: "Enter", needs: "hypothesis" },
};

// ------------------------------------------------------------------------------------------------
// Keyboard primitives. Pressed keys only.
// ------------------------------------------------------------------------------------------------

const settle = (ms) => new Promise((r) => setTimeout(r, ms));
const TYPEAHEAD_RESET_MS = 1200;

const releaseFocus = (page) =>
  page.evaluate(() => { const e = document.activeElement; if (e instanceof HTMLElement) e.blur(); });

/**
 * Drive focus OFF the top of the document, so the next Tab starts stop 1.
 *
 * `blur()` alone does not do this. Chromium keeps a "sequential focus navigation starting point"
 * where focus last was, so a walk after a blur resumes mid-document and wraps -- which is how the
 * first run of this script reported a 55-stop tab order that began in the middle of the Edit
 * section. Shift+Tab past the first control leaves the document, and Tab then re-enters at the top.
 */
async function rewindToTop(page, max = 200) {
  await releaseFocus(page);
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.down("Shift"); await page.keyboard.press("Tab"); await page.keyboard.up("Shift");
    const out = await page.evaluate(() =>
      document.activeElement === null || document.activeElement === document.body);
    if (out) return i + 1;
  }
  return null;
}

/** The full focus sequence Tab visits, from the top of the document. */
async function fullTabWalk(page, max = 400) {
  await rewindToTop(page);
  const seq = [];
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    const here = await page.evaluate(() => {
      const e = document.activeElement;
      if (e === null || e === document.body) return { id: "", tag: "body" };
      return { id: e.id ?? "", tag: e.tagName.toLowerCase() };
    });
    if (here.tag === "body" && seq.length > 0) break;      // walked out of the document
    seq.push(here);
    // A wrap: the first entry seen again at the same index.
    if (seq.length > 2 && here.tag === seq[0].tag && here.id === seq[0].id) { seq.pop(); break; }
  }
  return seq;
}

/**
 * Tab until `id` has focus. Returns the press count, or null with the reason it never arrived.
 *
 * The count is NOT a tab position. It starts from wherever Chromium's sequential-focus point
 * happens to sit and may wrap, so a control early in the document can cost 60 presses to re-reach.
 * Positions come from `fullTabWalk`; this answers reachable-or-not.
 */
async function reachByTab(page, id, max = 400) {
  await releaseFocus(page);
  for (let i = 1; i <= max; i += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.id ?? "") === id) return { presses: i };
  }
  const why = await page.evaluate((t) => {
    const e = document.getElementById(t);
    if (e === null) return "no such element in the DOM";
    const cs = getComputedStyle(e);
    return JSON.stringify({
      tabIndex: e.tabIndex, disabled: e.disabled ?? null,
      hiddenAncestor: e.closest("[hidden]")?.id ?? null,
      disabledFieldset: e.closest("fieldset[disabled]")?.id ?? null,
      display: cs.display, visibility: cs.visibility,
    });
  }, id);
  return { presses: null, why };
}

/** Chrome's OWN computed name and role for one element. Not the markup's spelling. */
async function computedAx(page, id) {
  const el = await page.evaluateHandle((t) => document.getElementById(t), id);
  const asElement = el.asElement?.() ?? null;
  if (asElement === null) return { name: null, role: null, note: "element not found" };
  const snap = await page.accessibility.snapshot({ root: asElement, interestingOnly: false });
  if (snap === null) return { name: null, role: null, note: "no node in the accessibility tree" };
  return { name: snap.name ?? "", role: snap.role ?? "", ...(snap.disabled ? { disabled: true } : {}) };
}

/** Everything that could show a control did something. One round trip. */
const observable = (page) => page.evaluate(() => ({
  hash: window.mage?.context?.().hash ?? null,
  revision: window.mage?.context?.().revision ?? null,
  editResult: (document.getElementById("edit-result")?.textContent ?? "").replace(/\s+/g, " ").trim(),
  askAnswer: (document.getElementById("ask-answer")?.textContent ?? "").replace(/\s+/g, " ").trim(),
  live: (document.getElementById("live")?.textContent ?? "").trim(),
  summary: (document.getElementById("summary")?.textContent ?? "").replace(/\s+/g, " ").trim(),
  questionList: (document.getElementById("question-list")?.textContent ?? "").length,
  banner: (document.getElementById("banner")?.textContent ?? "").replace(/\s+/g, " ").trim(),
  hypothesisBarHidden: document.getElementById("hypothesis-bar")?.hidden ?? null,
  undoDisabled: document.getElementById("undo")?.disabled ?? null,
}));

const diff = (before, after) =>
  Object.keys(after).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));

async function typeInto(page, id, text) {
  const r = await reachByTab(page, id);
  if (r.presses === null) return false;
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift"); await page.keyboard.press("End"); await page.keyboard.up("Shift");
  if (text === "") await page.keyboard.press("Delete"); else await page.keyboard.type(text);
  return await page.evaluate((i) => document.getElementById(i).value, id) === text;
}

/** Pick a `<select>` option the way a keyboard user does: type-ahead on the option's visible text. */
async function chooseByKeyboard(page, id, index = 0) {
  const options = await page.evaluate((i) => {
    const s = document.getElementById(i);
    return s === null ? [] : [...s.options].map((o) => ({ value: o.value, text: (o.textContent ?? "").trim() }));
  }, id);
  const target = options.filter((o) => o.value !== "")[index];
  if (target === undefined) return { ok: false, why: `no option at index ${index} of ${options.length}` };
  let prefix = null;
  const others = options.filter((o) => o.text !== target.text).map((o) => o.text.toLowerCase());
  for (let n = 1; n <= target.text.length; n += 1) {
    const p = target.text.slice(0, n);
    if (!others.some((t) => t.startsWith(p.toLowerCase()))) { prefix = p; break; }
  }
  if (prefix === null) return { ok: false, why: `no prefix identifies "${target.text}" uniquely -- a keyboard user cannot select it either` };
  const r = await reachByTab(page, id);
  if (r.presses === null) return { ok: false, why: `#${id} unreachable by Tab` };
  await settle(TYPEAHEAD_RESET_MS);
  await page.keyboard.type(prefix);
  await settle(200);
  const got = await page.evaluate((i) => document.getElementById(i).value, id);
  return got === target.value
    ? { ok: true, value: got, prefix }
    : { ok: false, why: `type-ahead "${prefix}" landed on "${got}", not "${target.value}"` };
}

// ------------------------------------------------------------------------------------------------
// The sweep
// ------------------------------------------------------------------------------------------------

async function open(browser) {
  const page = await browser.newPage();
  const diagnostics = { pageErrors: [], consoleErrors: [] };
  page.on("pageerror", (e) => diagnostics.pageErrors.push(String(e).slice(0, 300)));
  page.on("console", (m) => { if (m.type() === "error") diagnostics.consoleErrors.push(m.text().slice(0, 300)); });
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.waitForFunction(() => typeof window.mage === "object", { timeout: 30_000 });
  return { page, diagnostics };
}

/** Measure one site: reach, name/role, then activate and look for a change. */
async function measureSite(page, site, spec, { activate = true, walk = [] } = {}) {
  const row = { site, kind: spec.kind, id: spec.id };
  const positionIn = (id) => {
    const i = walk.findIndex((s) => s.id === id);
    return i === -1 ? null : i + 1;
  };

  if (spec.kind === "declared-absent") {
    row.reachable = false; row.operable = false; row.name = null; row.role = null;
    row.notes = "the registry declares no human affordance; nothing to measure";
    return row;
  }

  if (spec.kind === "readout") {
    const r = await page.evaluate((s) => {
      const host = document.getElementById(s.id);
      if (host === null) return { exists: false };
      const scope = s.within ? host.querySelector(s.within) : host;
      return {
        exists: true,
        textLength: (scope?.textContent ?? "").replace(/\s+/g, " ").trim().length,
        tables: host.querySelectorAll("table").length,
        headers: host.querySelectorAll("th").length,
        headings: host.querySelectorAll("h3,h4,h5").length,
        lists: host.querySelectorAll("ul,ol,dl").length,
        ariaHiddenAncestor: host.closest("[aria-hidden='true']") !== null,
      };
    }, { id: spec.id, within: spec.within ?? null });
    row.reachable = "n/a (readout)";
    row.operable = "n/a (readout)";
    const ax = await computedAx(page, spec.id);
    row.name = ax.name; row.role = ax.role;
    row.readout = r;
    row.atReadable = r.exists === true && r.textLength > 0 && r.ariaHiddenAncestor === false;
    return row;
  }

  // A radio group exposes ONE tab stop -- the checked member -- so Tab alone can never reach an
  // unchecked radio, and calling that unreachable would be a measurement artefact rather than a
  // finding. Reachability for a radio means: the group has a tab stop, and an arrow key moves from
  // it to this member. That is the native keyboard contract, and it is what a keyboard user does.
  if (spec.kind === "radio") {
    const ax0 = await computedAx(page, spec.id);
    row.name = ax0.name; row.role = ax0.role;
    const checked = await page.evaluate((g) =>
      document.querySelector(`input[name="${g}"]:checked`)?.id ?? null, spec.group);
    row.groupTabStop = checked;
    row.groupTabStopPosition = checked === null ? null : positionIn(checked);
    if (checked === null) {
      row.reachable = false; row.operable = false;
      row.whyUnreachable = `radio group "${spec.group}" has no checked member, so it has no tab stop`;
      return row;
    }
    const stop = await reachByTab(page, checked);
    if (stop.presses === null) {
      row.reachable = false; row.operable = false;
      row.whyUnreachable = `the group's tab stop #${checked} is itself unreachable: ${stop.why}`;
      return row;
    }
    let arrived = checked === spec.id;
    for (let i = 0; i < 6 && !arrived; i += 1) {
      await page.keyboard.press("ArrowDown"); await settle(80);
      arrived = await page.evaluate((t) => document.getElementById(t).checked, spec.id);
    }
    row.reachable = arrived;
    row.reachedBy = "Tab to the group's checked member, then ArrowDown";
    row.operable = arrived;
    row.observedChange = arrived ? [`#${spec.id} became checked, by ArrowDown`] : [];
    row.tabPosition = positionIn(spec.id);
    if (arrived && checked !== spec.id) { await page.keyboard.press("ArrowUp"); await settle(80); }
    return row;
  }

  const reach = await reachByTab(page, spec.id);
  row.reachable = reach.presses !== null;
  row.tabPosition = positionIn(spec.id);
  row.pressesToReReach = reach.presses ?? null;
  if (reach.why !== undefined) row.whyUnreachable = reach.why;

  const ax = await computedAx(page, spec.id);
  row.name = ax.name; row.role = ax.role;
  if (ax.disabled) row.axDisabled = true;
  if (ax.note !== undefined) row.axNote = ax.note;

  if (!row.reachable || !activate) {
    row.operable = row.reachable ? "UNMEASURED" : false;
    if (spec.skipActivate !== undefined) row.notes = spec.skipActivate;
    return row;
  }
  if (spec.skipActivate !== undefined) {
    row.operable = "UNMEASURED"; row.notes = spec.skipActivate;
    return row;
  }

  const before = await observable(page);
  await page.keyboard.press(spec.key ?? "Enter");
  await settle(500);
  const after = await observable(page);
  const moved = diff(before, after);
  row.operable = moved.length > 0;
  row.observedChange = moved.map((k) => `${k}: ${JSON.stringify(before[k])} -> ${JSON.stringify(after[k])}`.slice(0, 220));
  return row;
}

async function main() {
  const puppeteer = await loadPuppeteer();
  const server = await startServer(WORKBENCH_DIR, PORT).catch((e) => {
    console.error(`could not serve ${WORKBENCH_DIR} on ${PORT}: ${e.message}`);
    return null;
  });
  const browser = BROWSER_URL !== ""
    ? await puppeteer.connect({ browserURL: BROWSER_URL })
    : await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

  const result = { measuredAt: new Date().toISOString(), origin: ORIGIN, phases: {} };

  try {
    // -- Phase 1: pristine. No model loaded. This is the state a first visitor is in. ------------
    {
      const { page, diagnostics } = await open(browser);
      result.phases.pristine = {
        tabWalk: await fullTabWalk(page),
        domOrder: await page.evaluate(() => [...document.querySelectorAll(
          'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]
          .map((e) => `${e.tagName.toLowerCase()}#${e.id || ""}`)),
        sections: await page.evaluate(() => [...document.querySelectorAll("main > section")]
          .map((s) => ({ id: s.id, ariaHidden: s.getAttribute("aria-hidden") }))),
        canvas: await page.evaluate(() => {
          const c = document.getElementById("canvas");
          return { ariaHidden: c?.getAttribute("aria-hidden") ?? null, focusables: c?.querySelectorAll('a,button,[tabindex]').length ?? 0 };
        }),
        live: await page.evaluate(() => {
          const l = document.getElementById("live");
          return l === null ? null : {
            role: l.getAttribute("role"), ariaLive: l.getAttribute("aria-live"),
            ariaAtomic: l.getAttribute("aria-atomic"), ariaRelevant: l.getAttribute("aria-relevant"),
            className: l.className, tabIndex: l.tabIndex, count: document.querySelectorAll('[aria-live],[role="status"],[role="alert"],[role="log"]').length,
          };
        }),
        diagnostics,
      };
      // Settle the open question: is the example-loading control keyboard-reachable AND operable?
      const choose = await chooseByKeyboard(page, "example-choice", 0);
      const before = await observable(page);
      const reach = await reachByTab(page, "example-load");
      let activated = null;
      if (reach.presses !== null) {
        await page.keyboard.press("Enter");
        await page.waitForFunction(
          (prior) => (document.getElementById("summary")?.textContent ?? "").replace(/\s+/g, " ").trim() !== prior,
          { timeout: 20_000 }, before.summary,
        ).catch(() => {});
        await settle(700);
        activated = diff(before, await observable(page));
      }
      const pristineWalk = result.phases.pristine.tabWalk;
      result.phases.pristine.loadExampleByKeyboard = {
        selectReachable: choose.ok, selectDetail: choose,
        buttonReachable: reach.presses !== null,
        // The POSITION, from the pristine walk. `reach.presses` is a re-reach cost, not a position.
        buttonTabPosition: pristineWalk.findIndex((s) => s.id === "example-load") + 1 || null,
        selectTabPosition: pristineWalk.findIndex((s) => s.id === "example-choice") + 1 || null,
        pressesToReReach: reach.presses ?? null, whyUnreachable: reach.why ?? null,
        observedChange: activated,
        ax: await computedAx(page, "example-load"),
        selectAx: await computedAx(page, "example-choice"),
        modelLoaded: await page.evaluate(() => window.mage.context().counts),
      };
      await page.close();
    }

    // -- Phase 2: a model loaded, BY KEYBOARD. Then sweep every site. ----------------------------
    {
      const { page, diagnostics } = await open(browser);
      await chooseByKeyboard(page, "example-choice", 0);
      const pre = await observable(page);
      const r = await reachByTab(page, "example-load");
      if (r.presses === null) throw new Error("cannot load a model by keyboard; the sweep needs one");
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        (prior) => (document.getElementById("summary")?.textContent ?? "").replace(/\s+/g, " ").trim() !== prior,
        { timeout: 20_000 }, pre.summary,
      );
      await settle(900);

      const loaded = {
        tabWalk: await fullTabWalk(page),
        sites: {},
        diagnostics,
        counts: await page.evaluate(() => window.mage.context().counts),
      };

      // Fill the forms the sweep activates, so a refusal is a REAL refusal rather than an
      // empty-field one -- and so a success is a real commit. Keyboard only.
      await typeInto(page, "add-entity-id", "baseline-probe-entity");
      await chooseByKeyboard(page, "add-note-target", 0);
      await chooseByKeyboard(page, "add-note-kind", 0);
      await typeInto(page, "add-note-text", "baseline probe note");
      await chooseByKeyboard(page, "ask-form", 0);
      await chooseByKeyboard(page, "ask-relation", 0);

      const walk = loaded.tabWalk;
      for (const [site, spec] of Object.entries(SITES)) {
        if (spec.needs === "hypothesis") continue;
        try {
          loaded.sites[site] = await measureSite(page, site, spec, { walk });
        } catch (e) {
          loaded.sites[site] = { site, kind: spec.kind, id: spec.id, error: String(e).slice(0, 300) };
        }
      }

      // -- undo / redo, re-measured AFTER the edit wave. The first run measured them before any
      //    edit had been applied and reported them unreachable-because-disabled, which says
      //    nothing about the capability. Both are meant to light up once a revision exists.
      loaded.undoRedoAfterEdits = { walk: await fullTabWalk(page) };
      for (const site of ["header.undo", "header.redo"]) {
        loaded.undoRedoAfterEdits[site] =
          await measureSite(page, site, SITES[site], { walk: loaded.undoRedoAfterEdits.walk });
      }
      loaded.sites["header.undo"] = loaded.undoRedoAfterEdits["header.undo"];
      loaded.sites["header.redo"] = loaded.undoRedoAfterEdits["header.redo"];

      // -- the evidence list, probed where it actually lives. A saved query with a witness renders
      //    `ul.evidence` inside its entry; the first run looked for one and found an empty string,
      //    which does not distinguish "no such element" from "an element with no text".
      loaded.evidenceProbe = await page.evaluate(() => {
        const host = document.getElementById("question-list");
        const lists = [...(host?.querySelectorAll(".evidence") ?? [])];
        return {
          evidenceLists: lists.length,
          itemCounts: lists.map((l) => l.querySelectorAll("li").length),
          firstText: (lists[0]?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300),
          allLists: host?.querySelectorAll("ul").length ?? 0,
          classesSeen: [...new Set([...(host?.querySelectorAll("ul,ol") ?? [])].map((l) => l.className || "(none)"))],
        };
      });

      // -- the AT-representation seam, DRIVEN. The page renders `RenderedView.accessible` into
      //    #diagram-text; a stub renderer would leave it empty or structureless.
      const subj = await chooseByKeyboard(page, "diagram-subject", 0);
      await settle(600);
      loaded.atSeam = {
        subjectChosenByKeyboard: subj,
        diagramText: await page.evaluate(() => {
          const d = document.getElementById("diagram-text");
          return {
            exists: d !== null,
            textLength: (d?.textContent ?? "").replace(/\s+/g, " ").trim().length,
            excerpt: (d?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 600),
            lists: d?.querySelectorAll("ul,ol").length ?? 0,
            items: d?.querySelectorAll("li").length ?? 0,
            headings: d?.querySelectorAll("h3,h4,h5,p.sublabel,.sublabel").length ?? 0,
            ariaHiddenAncestor: d?.closest("[aria-hidden='true']") !== null,
          };
        }),
        // The renderer's own return, through the agent facade. If the SVG has N nodes and the
        // accessible twin has 0, the twin is a stand-in.
        viaFacade: await page.evaluate(() => {
          const subjects = [...document.getElementById("diagram-subject").options].map((o) => o.value);
          return { subjects: subjects.slice(0, 6) };
        }),
      };

      // -- live region under an AGENT mutation (UX-I3's own scenario). ------------------------
      await page.evaluate(() => {
        window.__lw = [];
        const live = document.getElementById("live");
        window.__lo?.disconnect();
        window.__lo = new MutationObserver(() => window.__lw.push(live.textContent ?? ""));
        window.__lo.observe(live, { childList: true, characterData: true, subtree: true });
      });
      const agentBefore = await observable(page);
      // The envelope is `{ transaction: { base, operations } }` -- `base` is the hash the ops were
      // computed against and a mismatch is a loud refusal, which is what the first run hit.
      const agentTx = await page.evaluate(() => window.mage.transact({
        transaction: {
          base: window.mage.context().hash,
          operations: [{ op: "add-entity", id: "agent-probe-entity", type: "service" }],
        },
      })).catch((e) => ({ error: String(e) }));
      await settle(1500);
      loaded.liveRegion = {
        agentTransaction: {
          ok: agentTx?.ok ?? agentTx?.outcome ?? null,
          findings: (agentTx?.findings ?? agentTx?.rejection?.findings ?? [])
            .map((f) => `${f.rule}: ${f.message}`.slice(0, 200)),
          raw: JSON.stringify(agentTx ?? {}).slice(0, 400),
        },
        humanSurfaceMoved: diff(agentBefore, await observable(page)),
        liveWrites: await page.evaluate(() => [...(window.__lw ?? [])]),
        // Does the announcement SAY something, or re-read a number? Both are measured: the text,
        // and whether it names the operation that happened.
        liveTextAfter: await page.evaluate(() => document.getElementById("live").textContent ?? ""),
      };

      // -- hypothesis bar: open one through the agent, then measure its two controls. ----------
      //    `openHypothesis(label, transaction)` takes two POSITIONAL arguments.
      const hyp = await page.evaluate(() => window.mage.hypothesis.open("baseline probe", {
        transaction: {
          base: window.mage.context().hash,
          operations: [{ op: "add-entity", id: "hypothetical-entity" }],
        },
      })).catch((e) => ({ error: String(e) }));
      await settle(1000);
      loaded.hypothesis = {
        ok: hyp?.ok ?? null,
        findings: (hyp?.findings ?? []).map((f) => `${f.rule}: ${f.message}`.slice(0, 200)),
        barHidden: await page.evaluate(() => document.getElementById("hypothesis-bar")?.hidden ?? null),
        banner: await page.evaluate(() =>
          (document.getElementById("banner")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300)),
      };
      loaded.tabWalkWithHypothesis = await fullTabWalk(page);
      for (const [site, spec] of Object.entries(SITES)) {
        if (spec.needs !== "hypothesis") continue;
        try {
          loaded.sites[site] = await measureSite(page, site, spec,
            { activate: site === "hypothesis-bar.discard", walk: loaded.tabWalkWithHypothesis });
        } catch (e) {
          loaded.sites[site] = { site, kind: spec.kind, id: spec.id, error: String(e).slice(0, 300) };
        }
      }

      // -- every focusable control's computed name and role, in one pass. A control AT cannot
      //    name is reachable and unusable, and nothing else in the suite measures this.
      loaded.allControls = await (async () => {
        // Address every control by INDEX in the focusable list, so a control with no id -- the skip
        // link has none -- is measured rather than skipped. The first run reported it as
        // "cannot address", which is a gap in the instrument, not in the page.
        const n = await page.evaluate(() => document.querySelectorAll(
          'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length);
        const out = [];
        for (let i = 0; i < n; i += 1) {
          const el = await page.evaluateHandle((k) => document.querySelectorAll(
            'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')[k], i);
          const asEl = el.asElement?.() ?? null;
          const meta = await page.evaluate((k) => {
            const e = document.querySelectorAll(
              'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')[k];
            return { id: e.id || "", tag: e.tagName.toLowerCase(), type: e.getAttribute("type") };
          }, i);
          if (asEl === null) { out.push({ ...meta, name: null, role: null, note: "no handle" }); continue; }
          const snap = await page.accessibility.snapshot({ root: asEl, interestingOnly: false });
          out.push({
            ...meta,
            name: snap?.name ?? null, role: snap?.role ?? null,
            ...(snap === null ? { note: "no node in the accessibility tree" } : {}),
            ...(snap?.disabled ? { disabled: true } : {}),
          });
        }
        return out;
      })();

      result.phases.loaded = loaded;
      await page.close();
    }

    // -- Phase 3: the agent path, on a page nothing else has touched. ----------------------------
    //
    // The sweep above leaves a trail of human announcements in `#live`, so an agent write that
    // happened to repeat the last human one would be invisible (Chromium emits no mutation record
    // for an identical assignment). A fresh page removes that ambiguity: the only text in `#live`
    // is the boot message, so ANY agent announcement would be a visible change.
    {
      const { page } = await open(browser);
      const yaml = await readFile(join(WORKBENCH_DIR, "examples", "message-bus", "system.mage.yaml"), "utf8");
      const liveAtBoot = await page.evaluate(() => document.getElementById("live").textContent ?? "");
      await page.evaluate((t) => window.mage.load(t), yaml);
      await settle(1500);
      const afterAgentLoad = await page.evaluate(() => ({
        live: document.getElementById("live").textContent ?? "",
        summary: (document.getElementById("summary")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      }));
      await page.evaluate(() => {
        window.__w = [];
        const l = document.getElementById("live");
        window.__o?.disconnect();
        window.__o = new MutationObserver(() => window.__w.push(l.textContent ?? ""));
        window.__o.observe(l, { childList: true, characterData: true, subtree: true });
      });
      const tx = await page.evaluate(() => window.mage.transact({
        transaction: {
          base: window.mage.context().hash,
          operations: [{ op: "add-entity", id: "agent-probe", type: "service" }],
        },
      }));
      await settle(2000);
      const afterAgentTransact = await page.evaluate(() => ({
        writes: [...(window.__w ?? [])],
        live: document.getElementById("live").textContent ?? "",
        summary: (document.getElementById("summary")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      }));
      // The same page, same observer, driven by a HUMAN control, as the contrast case.
      await page.evaluate(() => { window.__w = []; });
      for (let i = 0; i < 40; i += 1) {
        await page.keyboard.press("Tab");
        if (await page.evaluate(() => document.activeElement?.id ?? "") === "run") break;
      }
      await page.keyboard.press("Enter");
      await settle(1500);
      result.phases.agentPath = {
        liveAtBoot,
        agentLoad: { ok: true, ...afterAgentLoad },
        agentTransact: { ok: tx?.ok ?? null, ...afterAgentTransact },
        humanContrastWrites: await page.evaluate(() => [...(window.__w ?? [])]),
        liveRegions: await page.evaluate(() => [...document.querySelectorAll(
          '[aria-live],[role="status"],[role="alert"],[role="log"]')]
          .map((e) => ({ id: e.id, role: e.getAttribute("role"), ariaLive: e.getAttribute("aria-live") }))),
        evidenceLists: await page.evaluate(() => {
          const lists = [...document.querySelectorAll("#question-list .evidence")];
          return {
            count: lists.length, tags: lists.map((l) => l.tagName.toLowerCase()),
            items: lists.map((l) => l.querySelectorAll("li").length),
            first: (lists[0]?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 240),
          };
        }),
      };
      await page.close();
    }
  } finally {
    if (BROWSER_URL === "") await browser.close(); else await browser.disconnect();
    if (server !== null) await new Promise((r) => server.close(r));
  }

  await writeFile(OUT, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`wrote ${OUT}`);

  const sites = result.phases.loaded?.sites ?? {};
  const controls = Object.values(sites).filter((s) => s.kind === "control" || s.kind === "radio");
  const reachable = controls.filter((s) => s.reachable === true).length;
  const operable = controls.filter((s) => s.operable === true).length;
  const named = controls.filter((s) => typeof s.name === "string" && s.name.trim() !== "").length;
  console.log(`control affordances: ${controls.length}; reachable ${reachable}; operable ${operable}; named ${named}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
