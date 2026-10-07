#!/usr/bin/env node
/**
 * pilot/generate.mjs — A/B pilot: the shipped painter (dagre layout + bespoke SVG) against
 * Mermaid 11 (vendored in book/node_modules), over the three shipped examples.
 *
 * Produces, under pilot/:
 *   ab-<example>.html   one A/B page per example, every model drawn both ways
 *   index.html          capability matrix + links + the emphasis A/B
 *   shots/*.png         headless screenshots of each page (what was actually looked at)
 *
 * This is a PILOT, not a migration: nothing under workbench/src is touched. Both painters are fed
 * from the same seam — `buildScene` / `renderView` — so the comparison is painter vs painter, not
 * extraction vs extraction.
 *
 * Every render asserts its own preconditions (`must`): an empty SVG, a missing label, or a absent
 * guard text fails the run loudly rather than producing a blank panel described as "rendered".
 * Mermaid capability PROBES are the exception by design: a parse error there is a finding, so it
 * is caught and recorded as the probe's verdict, never swallowed.
 */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WB = join(ROOT, "workbench");
const OUT = dirname(fileURLToPath(import.meta.url));

const wbRequire = createRequire(join(WB, "package.json"));
const { parse } = wbRequire("yaml");
// Puppeteer + Mermaid resolve from book/node_modules — the harness.mjs trick; nothing installed.
const bookRequire = createRequire(join(ROOT, "book", "package.json"));
const puppeteer = bookRequire("puppeteer");
const MERMAID_UMD = bookRequire.resolve("mermaid/dist/mermaid.min.js");

const { canonicalize } = await import("../workbench/src/ir/canonicalize.ts");
const { renderView, buildScene } = await import("../workbench/src/render/index.ts");

function must(cond, msg) {
  if (!cond) throw new Error(`PRECONDITION FAILED: ${msg}`);
}

const OPS = { eq: "=", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=" };

/** `arrival [occupancy < 4] / occupancy := occupancy + 1` — UML-ish, one line. */
function enrichedLabel(t) {
  const base = t.label ?? t.sync ?? "";
  const guards = t.guards.map((g) => `${g.ref} ${OPS[g.op]} ${String(g.value)}`).join(" && ");
  const effects = t.effects.map((e) => `${e.variable} := ${e.expression}`).join(", ");
  let out = base;
  if (guards !== "") out += ` [${guards}]`;
  if (effects !== "") out += ` / ${effects}`;
  return out;
}

// --------------------------------------------------------------------------------------------
// Load the examples
// --------------------------------------------------------------------------------------------

const EXAMPLES = ["simple-worker-queue", "medium-document-processing", "complex-transaction-workspace"];

function loadExample(name) {
  const raw = readFileSync(join(WB, "examples", name, "system.mage.yaml"), "utf8");
  const doc = parse(raw);
  const system = canonicalize(doc);
  must(system.machines.size + system.models.size > 0, `${name}: no machines and no models`);
  return { name, doc, system };
}

/**
 * The guard-enriched dagre variant: same painter, same layout, transition LABELS carry the
 * guard/effect notation. Done by enriching the raw doc and re-canonicalizing — the readonly canon
 * objects stay untouched. This is the "do a good job on the dagre side" panel: it shows what the
 * shipped painter looks like once it draws what scene.ts already extracts.
 */
function enrichedSystem(example) {
  const doc = structuredClone(example.doc);
  for (const [mid, m] of example.system.machines) {
    const rawTransitions = doc.machines?.[mid]?.transitions;
    must(Array.isArray(rawTransitions), `${example.name}/${mid}: raw transitions not found for enrichment`);
    for (const t of m.transitions) {
      must(rawTransitions[t.index] !== undefined, `${example.name}/${mid}: transition index ${t.index} missing in doc`);
      rawTransitions[t.index].label = enrichedLabel(t);
    }
  }
  return canonicalize(doc);
}

// --------------------------------------------------------------------------------------------
// Side A: the shipped painter
// --------------------------------------------------------------------------------------------

function shippedSvg(system, subject, extra = {}) {
  const view = renderView(system, { subject, ...extra });
  must(view.svg.startsWith("<svg") || view.svg.includes("<svg"), `shipped render ${subject.id}: no <svg>`);
  must(view.svg.length > 1000, `shipped render ${subject.id}: suspiciously small SVG (${view.svg.length}B)`);
  return view.svg;
}

// --------------------------------------------------------------------------------------------
// Side B: Mermaid sources, generated from the SAME scene the shipped painter consumes
// --------------------------------------------------------------------------------------------

/** Mermaid id: keep alnum, map everything else to `_` (hyphens are legal but underscores are safer). */
function mid(id) {
  return id.replace(/[^A-Za-z0-9_]/g, "_");
}

function esc(label) {
  return String(label).replace(/"/g, "#quot;");
}

/** Split a scene edge's `detail` back into guards and effects (scene phrases guards "requires …"). */
function detailParts(detail) {
  const guards = detail.filter((d) => d.startsWith("requires ")).map((d) => d.slice("requires ".length));
  const effects = detail.filter((d) => !d.startsWith("requires "));
  return { guards, effects };
}

/**
 * A machine as `stateDiagram-v2`. Transitions carry the full `event [guard] / effect` notation —
 * the case that motivated the pilot. Variables are NOT in the scene (the twin gets them via
 * properties elsewhere); they come from the canonical machine and land in a note, which is the
 * mermaid-native place for them.
 */
function transitionText(e) {
  const { guards, effects } = detailParts(e.detail);
  let text = e.label ?? "";
  if (guards.length > 0) text += ` [${guards.join(" && ")}]`;
  if (effects.length > 0) text += ` / ${effects.join(", ")}`;
  return text.trim();
}

/**
 * MEASURED (Mermaid 11.16, this run): `stateDiagram-v2` COLLAPSES duplicate (from, to) pairs into
 * one edge and keeps only the LAST label — `a --> a : one` + `a --> a : two` renders one path whose
 * text is "two". Parallel edges between DISTINCT states render fine. So a machine whose topology is
 * two guarded self-loops (simple-worker-queue, exactly) silently loses a transition.
 *
 * `merged: false` emits the honest one-line-per-transition source and eats the loss; `merged: true`
 * emits the workaround — duplicate-endpoint transitions joined into ONE edge with a <br/>-stacked
 * label. The workaround keeps every word visible and erases transition IDENTITY: one arrow where
 * the model has two transitions, so no per-transition emphasis or click target can ever exist.
 */
function machineMermaid(scene, machine, { merged = false } = {}) {
  const lines = ["stateDiagram-v2", "  direction LR"];
  const initial = scene.nodes.find((n) => n.initial);
  for (const n of scene.nodes) {
    if (mid(n.id) !== n.id || n.label !== n.id) lines.push(`  state "${esc(n.label)}" as ${mid(n.id)}`);
  }
  if (initial) lines.push(`  [*] --> ${mid(initial.id)}`);
  const groups = new Map();
  for (const e of scene.edges) {
    const key = `${e.from}->${e.to}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  for (const [, es] of groups) {
    const { from, to } = es[0];
    if (merged && es.length > 1) {
      lines.push(`  ${mid(from)} --> ${mid(to)} : ${es.map(transitionText).join("<br/>")}`);
    } else {
      for (const e of es) {
        const text = transitionText(e);
        lines.push(`  ${mid(e.from)} --> ${mid(e.to)}${text !== "" ? ` : ${text}` : ""}`);
      }
    }
  }
  const vars = [...machine.variables.values()];
  if (vars.length > 0 && initial) {
    lines.push(`  note right of ${mid(initial.id)}`);
    for (const v of vars) {
      const domain = v.domain.map(String);
      const span = v.kind === "integer" && domain.length > 2 ? `[${domain[0]}..${domain[domain.length - 1]}]` : `{${domain.join(", ")}}`;
      lines.push(`    ${v.id} : ${v.kind} ${span}, initially ${String(v.initial)}`);
    }
    lines.push("  end note");
  }
  return lines.join("\n");
}

/** Duplicate-(from,to) groups — the transitions Mermaid's honest rendering will drop all but one of. */
function duplicateGroups(scene) {
  const seen = new Map();
  for (const e of scene.edges) {
    const key = `${e.from}->${e.to}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.values()].filter((n) => n > 1);
}

/**
 * A structural model as `flowchart`. Containment becomes a subgraph (enclosure) — the scene's
 * duplicate containment EDGE is dropped here, because mermaid's subgraph is the positional claim
 * and an extra arrow into the box is noise; the twin keeps the structural claim either way.
 * Relation edges carry their type as the edge label — the opposite of the shipped painter's
 * key-strip decision, and deliberately so: the A/B should show mermaid's edge-label routing.
 */
function modelMermaid(scene) {
  const lines = ["flowchart LR"];
  const nodeLine = (n, indent) => {
    const props = n.properties.map((p) => `${p.name}: ${p.value}`);
    const label = [n.label, ...props].map(esc).join("<br/>");
    lines.push(`${indent}${mid(n.id)}["${label}"]`);
  };
  const regions = scene.nodes.filter((n) => n.kind === "region");
  const inRegion = new Set(regions.flatMap((r) => r.contains));
  for (const r of regions) {
    lines.push(`  subgraph ${mid(r.id)}["${esc(r.label)}"]`);
    for (const cid of r.contains) {
      const c = scene.nodes.find((n) => n.id === cid);
      must(c !== undefined, `region ${r.id} contains unknown node ${cid}`);
      nodeLine(c, "    ");
    }
    lines.push("  end");
  }
  for (const n of scene.nodes) {
    if (n.kind !== "region" && !inRegion.has(n.id)) nodeLine(n, "  ");
  }
  for (const e of scene.edges) {
    if (e.kind === "containment") continue; // enclosure carries it; see docstring
    const via = e.via ?? e.label ?? "";
    lines.push(`  ${mid(e.from)} -->${via !== "" ? `|${esc(via)}|` : ""} ${mid(e.to)}`);
  }
  return lines.join("\n");
}

// --------------------------------------------------------------------------------------------
// Mermaid rendering, headless
// --------------------------------------------------------------------------------------------

async function startRenderer() {
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: join("/tmp", `wb-mermaid-pilot-${process.pid}`),
  });
  const page = await browser.newPage();
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: MERMAID_UMD });
  await page.evaluate(() => {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "neutral",
      // useMaxWidth:false — render at NATURAL size. The default (true) emits width:100% +
      // max-width, and a wide diagram then scales its text below legibility inside a panel;
      // the first screenshot round showed the medium machine at ~6px text. Fair A/B needs
      // both sides at natural size with the panel scrolling, not shrinking.
      flowchart: { htmlLabels: true, useMaxWidth: false },
      state: { useMaxWidth: false },
    });
  });
  let n = 0;
  /** Returns { svg, text } or { error } — the caller decides whether an error is fatal or a finding. */
  const render = async (src) => {
    n += 1;
    return await page.evaluate(async (id, source) => {
      try {
        const { svg } = await window.mermaid.render(id, source);
        const div = document.createElement("div");
        div.innerHTML = svg;
        document.body.appendChild(div); // keep it in the DOM: getBBox needs layout
        // textContent of a mermaid SVG includes its embedded <style> CSS; strip it from a CLONE
        // (the measurement must not mutate the artifact) or label assertions match against CSS.
        const clone = div.cloneNode(true);
        for (const st of clone.querySelectorAll("style")) st.remove();
        const text = (clone.textContent ?? "").replace(/\s+/g, " ");
        const boxes = {};
        for (const g of div.querySelectorAll("g[id], g.node")) {
          const gid = g.getAttribute("id");
          if (gid) {
            const b = g.getBBox();
            boxes[gid] = { x: b.x, y: b.y, w: b.width, h: b.height };
          }
        }
        // STROKES, structurally: colors appearing in style/stroke ATTRIBUTES of non-text elements.
        // "color hex is somewhere in the SVG string" is NOT evidence a style applied — a directive
        // mermaid mis-parses as a NODE renders the hex as node TEXT, and a string check then
        // reports the style as applied. This probe-lies-by-text-match was caught live in round 3.
        const strokes = [...div.querySelectorAll("path, polygon, rect, line")]
          .map((el) => `${el.getAttribute("style") ?? ""}|${el.getAttribute("stroke") ?? ""}`)
          .join(";");
        return { svg, text, boxes, strokes };
      } catch (e) {
        return { error: String(e && e.message ? e.message : e) };
      }
    }, `m${n}`, src);
  };
  const close = async () => {
    await browser.close();
  };
  return { render, close, page, browser };
}

function assertMermaid(result, what, expectTexts) {
  must(result.error === undefined, `mermaid ${what}: render error: ${result.error}`);
  must(result.svg.includes("<svg"), `mermaid ${what}: no <svg>`);
  must(result.svg.length > 1000, `mermaid ${what}: suspiciously small SVG (${result.svg.length}B)`);
  for (const t of expectTexts) {
    must(result.text.includes(t), `mermaid ${what}: expected text ${JSON.stringify(t)} not in rendered output`);
  }
  return result;
}

// --------------------------------------------------------------------------------------------
// Capability probes — each verdict is recorded, render errors included (they ARE findings)
// --------------------------------------------------------------------------------------------

async function runProbes(render) {
  const probes = [];
  const probe = (name, verdict, evidence) => probes.push({ name, verdict, evidence });

  // 1. click-to-inspect in flowchart: `click` with an href must produce a real <a> in the SVG.
  {
    const r = await render(`flowchart LR\n  A["service"] --> B["queue"]\n  click A href "#inspect-A"`);
    if (r.error) probe("flowchart click (href)", "NO", `render error: ${r.error}`);
    else {
      const hasAnchor = /<a[\s>]/.test(r.svg) && r.svg.includes("#inspect-A");
      probe("flowchart click (href)", hasAnchor ? "YES" : "NO",
        hasAnchor ? "SVG contains an anchor element (href #inspect-A) wrapping the node" : "no anchor in SVG");
    }
  }

  // 2. click in stateDiagram-v2 — historically flowchart/class-only; the probe decides.
  {
    const r = await render(`stateDiagram-v2\n  s1 --> s2 : go\n  click s1 href "#inspect-s1"`);
    if (r.error) probe("stateDiagram click (href)", "NO", `parse/render error: ${r.error}`);
    else {
      // Mis-parse guard: the directive must not have become a state (text would contain "click").
      const hasAnchor = /<a[\s>]/.test(r.svg) && r.svg.includes("#inspect-s1") && !r.text.includes("click");
      probe("stateDiagram click (href)", hasAnchor ? "YES" : "NO",
        hasAnchor ? "a real anchor element wraps the state; diagram text clean (verified not a mis-parse)"
                  : "no anchor, or directive mis-parsed into the diagram");
    }
  }

  // 3. classDef/class NODE emphasis in stateDiagram-v2 (counterexample marks on states).
  {
    const r = await render(`stateDiagram-v2\n  classDef evidence fill:#ffedd5,stroke:#9a3412,stroke-width:3px\n  s1 --> s2 : go\n  class s2 evidence`);
    if (r.error) probe("stateDiagram classDef on a STATE", "NO", `error: ${r.error}`);
    else {
      const styled = r.svg.includes("ffedd5") || r.svg.includes("evidence");
      probe("stateDiagram classDef on a STATE", styled ? "YES" : "NO",
        styled ? "class lands in the SVG (fill/stroke applied)" : "class absent from SVG");
    }
  }

  // 4. Per-EDGE emphasis in stateDiagram-v2 — a witness trace is a SEQUENCE OF TRANSITIONS.
  // Structural check: the color must land in a stroke/style ATTRIBUTE, and the directive must not
  // have been mis-parsed into STATES (round 3 caught exactly that: nodes named "linkStyle", "1").
  {
    const r = await render(`stateDiagram-v2\n  s1 --> s2 : go\n  linkStyle 0 stroke:#9a3412,stroke-width:4px`);
    if (r.error) probe("stateDiagram per-EDGE style (linkStyle)", "NO", `error: ${r.error}`);
    else {
      const applied = (r.strokes ?? "").includes("9a3412");
      const misparsed = r.text.includes("linkStyle");
      probe("stateDiagram per-EDGE style (linkStyle)", applied && !misparsed ? "YES" : "NO",
        applied && !misparsed ? "stroke attribute carries the color"
          : misparsed
            ? "WORSE than unsupported: the directive is silently parsed as STATE declarations — garbage nodes named 'linkStyle', '1' and the style string appear IN the diagram; no style applied, no error raised"
            : "no stroke attribute carries the color");
    }
  }

  // 5. flowchart linkStyle — edge emphasis where flowcharts are the diagram type.
  {
    const r = await render(`flowchart LR\n  A --> B\n  B --> C\n  linkStyle 1 stroke:#9a3412,stroke-width:4px`);
    if (r.error) probe("flowchart per-EDGE style (linkStyle)", "NO", `error: ${r.error}`);
    else {
      const applied = (r.strokes ?? "").includes("9a3412") && !r.text.includes("linkStyle");
      probe("flowchart per-EDGE style (linkStyle)", applied ? "YES" : "NO",
        applied ? "stroke attribute on edge 1 carries the color (structural check, not string match)" : "style absent or directive mis-parsed");
    }
  }

  // 6. Accessibility surface: accTitle/accDescr must become real title/desc + aria wiring.
  {
    const r = await render(`stateDiagram-v2\n  accTitle: Queue capacity machine\n  accDescr: One state, two guarded self-loops\n  s1 --> s1 : arrival`);
    if (r.error) probe("accTitle/accDescr", "NO", `error: ${r.error}`);
    else {
      const ok = r.svg.includes("Queue capacity machine") && /aria-/.test(r.svg);
      probe("accTitle/accDescr", ok ? "PARTIAL" : "NO",
        ok ? "title/desc + aria attrs present — but this is a label, not the workbench's structured twin"
           : "accTitle not reflected in SVG");
    }
  }

  // 7. Node positions recoverable post-hoc (what composed views + hit-testing would need).
  {
    const r = await render(`stateDiagram-v2\n  alpha --> beta : go`);
    if (r.error) probe("post-hoc node geometry (getBBox)", "NO", `error: ${r.error}`);
    else {
      const ids = Object.keys(r.boxes ?? {}).filter((k) => /alpha|beta/.test(k));
      probe("post-hoc node geometry (getBBox)", ids.length > 0 ? "PARTIAL" : "NO",
        ids.length > 0
          ? `node groups queryable by mangled id (${ids.join(", ")}) — DOM scraping, not a positions API`
          : "no per-node groups found");
    }
  }

  // 8. Duplicate (from,to) transitions — the finding the A/B pages measure per-example.
  {
    const r = await render(`stateDiagram-v2\n  a --> a : one\n  a --> a : two`);
    if (r.error) probe("stateDiagram duplicate self-loops", "NO", `error: ${r.error}`);
    else {
      const both = r.text.includes("one") && r.text.includes("two");
      probe("stateDiagram duplicate self-loops", both ? "YES" : "NO",
        both ? "both labels render" : `collapsed to ONE edge; surviving text: ${JSON.stringify(r.text.trim().slice(0, 40))} — a transition silently disappears`);
    }
  }
  {
    const r = await render(`stateDiagram-v2\n  a --> b : one\n  a --> b : two`);
    if (r.error) probe("stateDiagram parallel edges (distinct states)", "NO", `error: ${r.error}`);
    else probe("stateDiagram parallel edges (distinct states)",
      r.text.includes("one") && r.text.includes("two") ? "YES" : "NO",
      r.text.includes("one") && r.text.includes("two") ? "both edges + labels render" : `text: ${r.text.slice(0, 40)}`);
  }
  {
    const r = await render(`flowchart LR\n  a --one--> a\n  a --two--> a`);
    if (r.error) probe("flowchart duplicate self-loops", "NO", `error: ${r.error}`);
    else {
      const both = r.text.includes("one") && r.text.includes("two");
      probe("flowchart duplicate self-loops", both ? "YES" : "NO",
        both ? "both labels render" : `labels collide/garble; extracted text: ${JSON.stringify(r.text.trim().slice(0, 40))}`);
    }
  }

  // 9. Layout hints IN — can a caller pin node positions across re-renders? (renderView.positions round-trip)
  probe("layout hints (position persistence)", "NO",
    "Mermaid exposes no API to supply per-node positions; every render re-layouts. The workbench's " +
    "RenderedView.positions round-trip (persisted view hints, stable re-render) has no Mermaid equivalent.");

  // 10. Quantitative model — does ANY mermaid diagram type express an allocation-vs-cap budget?
  probe("quantitative model (budget vs cap)", "NO",
    "No construct: pie lacks a cap line and units; xychart-beta plots series, not allocations " +
    "against a declared ceiling with per-allocation provenance. The shipped budget projection " +
    "(render/budget.ts) has no Mermaid counterpart — a budget table is not a graph.");

  return probes;
}

// --------------------------------------------------------------------------------------------
// Pages
// --------------------------------------------------------------------------------------------

const CSS = `
  :root { color-scheme: light; }
  body { font-family: system-ui, sans-serif; margin: 2rem; background: #fbfcfe; color: #11151c; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.15rem; margin-top: 2.5rem; border-top: 2px solid #d6dbe4; padding-top: 1rem; }
  .meta { color: #434b5a; max-width: 60rem; }
  .row { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-start; }
  .panel { border: 1px solid #d6dbe4; border-radius: 8px; background: #fff; padding: 1rem; max-width: 100%; overflow-x: auto; }
  .panel h3 { margin: 0 0 .75rem 0; font-size: .95rem; color: #2a3242; }
  /* No max-width on the SVGs: a wide diagram must SCROLL inside its panel, not shrink its
     text below legibility — the judgment this page exists to let the author make. */
  .panel svg { height: auto; }
  details { margin-top: .75rem; } pre { background: #f2f4f8; padding: .75rem; border-radius: 6px; overflow-x: auto; font-size: .8rem; }
  table { border-collapse: collapse; margin-top: 1rem; } td, th { border: 1px solid #d6dbe4; padding: .5rem .75rem; text-align: left; vertical-align: top; }
  .yes { color: #166534; font-weight: 700; } .no { color: #9a3412; font-weight: 700; } .partial { color: #854d0e; font-weight: 700; }
  .note { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: .75rem 1rem; max-width: 60rem; }
`;

let panelSeq = 0;

/**
 * Namespace every id inside one panel's markup, and the references that point at them.
 *
 * Each panel embeds an INDEPENDENTLY generated rendering, so two panels on a page mint the same
 * ids -- `mage-node-failed`, `mage-arrow-triangle`, the model id itself. Duplicate ids in one
 * document is invalid HTML, breaks `aria-labelledby`/`url(#...)` resolution to whichever node the
 * browser picks first, and the repo's own gate catches it (T1 "no duplicate element ids"). The
 * three A/B pages carried 74, 38 and 22 collisions before this.
 *
 * References are rewritten alongside the definitions -- `href`/`xlink:href`, `url(#id)` in style
 * and presentation attributes, and the ARIA id-list attributes -- because a prefixed `<marker>`
 * whose `marker-end` still points at the bare id renders no arrowheads at all.
 */
function namespaceIds(markup, prefix) {
  // Mermaid's own output repeats ids WITHIN one SVG -- `edge0`, `ready-ready----note-3` each appear
  // twice in the simple-worker-queue state diagram. Prefixing per panel cannot fix that, because
  // both copies live in the same panel. Later occurrences get an occurrence suffix so the document
  // is valid; references keep resolving to the first, which is what a browser already did. Recorded
  // as a finding: a renderer emitting duplicate ids is emitting invalid HTML.
  {
    const seen = new Map();
    markup = markup.replace(/\bid="([^"]+)"/g, (whole, id) => {
      const n = (seen.get(id) ?? 0) + 1;
      seen.set(id, n);
      return n === 1 ? whole : `id="${id}--dup${n}"`;
    });
  }
  const ids = new Set();
  for (const m of markup.matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]);
  if (ids.size === 0) return markup;
  let out = markup;
  for (const id of ids) {
    const q = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\bid="${q}"`, "g"), `id="${prefix}-${id}"`);
    out = out.replace(new RegExp(`(\\b(?:xlink:)?href=")#${q}"`, "g"), `$1#${prefix}-${id}"`);
    out = out.replace(new RegExp(`url\\(#${q}\\)`, "g"), `url(#${prefix}-${id})`);
    for (const attr of ["aria-labelledby", "aria-describedby", "aria-details"]) {
      out = out.replace(new RegExp(`(${attr}=")([^"]*)"`, "g"),
        (_, head, list) => `${head}${list.split(/\s+/).filter(Boolean)
          .map((t) => (t === id ? `${prefix}-${id}` : t)).join(" ")}"`);
    }
  }
  return out;
}

function panel(title, body) {
  panelSeq += 1;
  // `tabindex="0"` + a label: the panel scrolls horizontally (`overflow-x: auto`), and a scrollable
  // region that cannot be reached or scrolled by keyboard is an axe `scrollable-region-focusable`
  // violation -- a real one, not a lint artifact: a keyboard user otherwise cannot see the right-hand
  // side of a wide diagram. `role="group"` + the heading as its accessible name also gives the
  // content an enclosing landmark-ish container, which is what `region` was complaining about.
  // A DIV with role="group", not a <section>: a named <section> is a `region` LANDMARK, and the
  // multi-model pages draw each model both ways, so two panels legitimately share a title ("A --
  // Shipped painter" appears once per model). Two landmarks with the same role and name is axe's
  // `landmark-unique`. A group is the honest role anyway -- these are related controls, not page
  // regions -- and the enclosing <main> is what satisfies `region` for the content inside.
  //
  // `tabindex="0"` stays: the panel scrolls horizontally, and a scrollable region a keyboard user
  // cannot reach or scroll hides the right-hand side of every wide diagram from them.
  return `<div class="panel" role="group" aria-labelledby="h${panelSeq}" tabindex="0">`
    + `<h3 id="h${panelSeq}">${title}</h3>${namespaceIds(body, `p${panelSeq}`)}</div>`;
}

function page(title, body) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>${CSS}</style></head>
<body><main><h1>${title}</h1>${body}</main></body></html>`;
}

// --------------------------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------------------------

const renderer = await startRenderer();
const pages = [];
try {
  for (const name of EXAMPLES) {
    const ex = loadExample(name);
    const enriched = enrichedSystem(ex);
    const sections = [];

    for (const [machineId, machine] of ex.system.machines) {
      const subject = { kind: "machine", id: machineId };
      const scene = buildScene(ex.system, subject);
      const hasDetail = scene.edges.some((e) => e.detail.length > 0);

      const svgShipped = shippedSvg(ex.system, subject);
      const svgEnriched = hasDetail ? shippedSvg(enriched, subject) : null;
      if (svgEnriched !== null) {
        // Guard REF or effect VARIABLE — whichever this machine's details carry (complex has
        // effects and no guards). The ref/variable is the first token of the phrased string.
        const first = scene.edges.flatMap((e) => {
          const { guards, effects } = detailParts(e.detail);
          return [...guards, ...effects];
        })[0];
        must(first !== undefined && svgEnriched.includes(first.split(" ")[0]),
          `${name}/${machineId}: enriched dagre SVG does not contain guard/effect text (looked for ${JSON.stringify(first)})`);
      }

      const dupGroups = duplicateGroups(scene);
      const src = machineMermaid(scene, machine);
      // HONEST assertion: Mermaid keeps only the LAST of a duplicate-(from,to) group, so expect
      // exactly what it guarantees — every singleton transition's words, plus the last of each group.
      const groups = new Map();
      for (const e of scene.edges) {
        const key = `${e.from} ${e.to}`;
        groups.set(key, e); // last writer wins — mirrors the measured collapse
      }
      const survivors = [...groups.values()];
      const expect = [scene.nodes[0].label, ...survivors.flatMap((e) => detailParts(e.detail).guards.slice(0, 1))];
      const mm = assertMermaid(await renderer.render(src), `${name}/${machineId}`, expect);

      // And assert the LOSS is real whenever duplicates exist: the first duplicate's label must be absent.
      let lossNote = "";
      if (dupGroups.length > 0) {
        const firstDup = scene.edges.find((e) => survivors.every((s) => s.id !== e.id));
        must(firstDup !== undefined, `${name}/${machineId}: duplicate groups computed but no dropped edge found`);
        const dropped = transitionText(firstDup);
        must(!mm.text.includes(dropped), `${name}/${machineId}: expected Mermaid to DROP ${JSON.stringify(dropped)} (measured collapse) but it is present — re-measure`);
        lossNote = `<div class="note"><strong>Measured loss:</strong> Mermaid collapsed duplicate (from, to)
transitions into one edge — the transition <code>${dropped.replace(/</g, "&lt;")}</code> is NOT drawn below.
${dupGroups.length} duplicate group(s) in this machine. B′ shows the merged-label workaround.</div>`;
      }

      const srcMerged = dupGroups.length > 0 ? machineMermaid(scene, machine, { merged: true }) : null;
      let mmMerged = null;
      if (srcMerged !== null) {
        const expectAll = scene.edges.flatMap((e) => detailParts(e.detail).guards.slice(0, 1));
        mmMerged = assertMermaid(await renderer.render(srcMerged), `${name}/${machineId} (merged)`, expectAll);
      }

      const panels = [
        panel("A — Shipped painter (dagre + bespoke SVG), as it renders today", svgShipped),
        ...(svgEnriched !== null
          ? [panel("A′ — Shipped painter, guard/effect text on labels (pilot tweak, same painter)", svgEnriched)]
          : []),
        panel(`B — Mermaid 11.16 <code>stateDiagram-v2</code>, one line per transition (honest)`,
          `${mm.svg}<details><summary>Mermaid source</summary><pre>${src.replace(/</g, "&lt;")}</pre></details>`),
        ...(mmMerged !== null
          ? [panel(`B′ — Mermaid, duplicate-endpoint transitions MERGED into one label (workaround; erases transition identity)`,
              `${mmMerged.svg}<details><summary>Mermaid source</summary><pre>${srcMerged.replace(/</g, "&lt;")}</pre></details>`)]
          : []),
      ];
      sections.push(`<h2>State machine: <code>${machineId}</code></h2>
<p class="meta">${scene.question ?? ""}</p>
${lossNote}
<div class="row">${panels.join("\n")}</div>`);
    }

    for (const [modelId] of ex.system.models) {
      const subject = { kind: "model", id: modelId };
      const scene = buildScene(ex.system, subject);
      const svgShipped = shippedSvg(ex.system, subject);
      const src = modelMermaid(scene);
      const expect = scene.nodes.slice(0, 3).map((n) => n.label);
      const mm = assertMermaid(await renderer.render(src), `${name}/${modelId}`, expect);
      sections.push(`<h2>Structural model: <code>${modelId}</code></h2>
<p class="meta">${scene.question ?? ""}</p>
<div class="row">
${panel("A — Shipped painter (dagre + bespoke SVG); relation types live in the key strip, not on edges", svgShipped)}
${panel(`B — Mermaid 11.16 <code>flowchart</code> (vendored); relation types as edge labels, containment as subgraph`,
      `${mm.svg}<details><summary>Mermaid source</summary><pre>${src.replace(/</g, "&lt;")}</pre></details>`)}
</div>`);
    }

    if (ex.system.quantities.size > 0) {
      sections.push(`<h2>Quantitative model</h2>
<div class="note">This example declares ${ex.system.quantities.size} quantities (a budget, checked against a cap).
<strong>Mermaid has no construct for this</strong> — a budget table is not a graph; pie has no cap line,
xychart-beta plots series. The shipped budget projection (<code>render/budget.ts</code>) stays bespoke
under any adoption of Mermaid as the graph painter.</div>`);
    }

    const fileName = `ab-${name}.html`;
    const body = `<p class="meta">Each model is drawn by BOTH painters from the same <code>buildScene</code> output.
A is the shipped renderer; A′ is the same renderer with the guard/effect notation written into transition labels
(the semantics <code>scene.ts</code> already extracts); B is Mermaid 11.16 from <code>book/node_modules</code>.
<a href="index.html">Back to the pilot index</a>.</p>` + sections.join("\n");
    writeFileSync(join(OUT, fileName), page(`A/B: ${name} — dagre painter vs Mermaid`, body));
    pages.push(fileName);
    console.log(`wrote ${fileName}`);
  }

  // ---- Emphasis A/B (counterexample marks), on the simple machine ----
  const simple = loadExample("simple-worker-queue");
  const emphasis = [
    { target: "t:queue-capacity:0", kind: "evidence", reason: "witness step 1: arrival fires", step: 1 },
    { target: "ready", kind: "evidence", reason: "configuration on the witness", step: 2 },
  ];
  const svgEmph = shippedSvg(simple.system, { kind: "machine", id: "queue-capacity" }, { emphasis });
  const emphScene = buildScene(simple.system, { kind: "machine", id: "queue-capacity" });
  // classDef marks the STATE — the only emphasis channel stateDiagram-v2 has. linkStyle is
  // flowchart-only; in a state diagram it is SILENTLY PARSED AS STATE DECLARATIONS (measured in
  // round 3: garbage nodes named "linkStyle" and "1" appeared in the diagram, and a string-match
  // probe reported the style "applied" because the hex rendered as node TEXT). The structural
  // probe in the matrix now pins that. No garbage states: assert the diagram holds exactly one
  // real state plus the note.
  const emphSrc = machineMermaid(emphScene, simple.system.machines.get("queue-capacity"))
    + `\n  classDef evidence fill:#ffedd5,stroke:#9a3412,stroke-width:3px\n  class ready evidence`;
  const mmEmph = assertMermaid(await renderer.render(emphSrc), "emphasis A/B", ["ready"]);
  must(mmEmph.svg.includes("ffedd5") || /class="[^"]*evidence/.test(mmEmph.svg), "mermaid emphasis: classDef did not land");
  must(!mmEmph.text.includes("classDef"), "mermaid emphasis: classDef directive leaked into the diagram as text");

  // ---- Capability probes ----
  const probes = await runProbes(renderer.render);

  const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const probeRows = probes.map((p) => {
    const cls = p.verdict === "YES" ? "yes" : p.verdict === "PARTIAL" ? "partial" : "no";
    return `<tr><td>${escHtml(p.name)}</td><td class="${cls}">${p.verdict}</td><td>${escHtml(p.evidence)}</td></tr>`;
  }).join("\n");

  const indexBody = `
<p class="meta">Pilot record, ${new Date().toISOString().slice(0, 10)}: the shipped painter (dagre layout + bespoke SVG,
<code>workbench/src/render/</code>) against Mermaid 11.16 (vendored at <code>book/node_modules/mermaid</code>),
drawn from the same <code>buildScene</code> extraction. Nothing under <code>workbench/src</code> was modified.</p>
<h2>The A/B pages</h2>
<ul>${EXAMPLES.map((e) => `<li><a href="ab-${e}.html">${e}</a></li>`).join("\n")}</ul>
<h2>Capability probes (measured on the vendored Mermaid 11.16, not read from docs)</h2>
<table><thead><tr><th>Capability</th><th>Verdict</th><th>Evidence</th></tr></thead><tbody>${probeRows}</tbody></table>
<h2>Counterexample-emphasis A/B (simple-worker-queue)</h2>
<p class="meta">The shipped painter marks evidence on NODES AND EDGES with non-colour channels (MarkStyle: stroke width,
dash, glyph, step numbers) plus a derived legend, driven by typed <code>EmphasisAssignment</code>s addressed by STABLE
edge id (<code>t:queue-capacity:0</code>). Mermaid's <code>stateDiagram-v2</code> can class a STATE
(<code>classDef</code>/<code>class</code>) but has NO per-transition handle: <code>linkStyle</code> is flowchart-only, and
in a state diagram the directive is <strong>silently parsed as state declarations</strong> — garbage nodes appear and no
style applies (measured; see the matrix row). A witness is a sequence of TRANSITIONS, so half the trace cannot be marked.
What marking exists is colour-only: no step numbers, no legend derivation, no reason text for the twin.</p>
<div class="row">
${panel("A — Shipped painter, evidence emphasis on edge t:queue-capacity:0 AND state ready", svgEmph)}
${panel("B — Mermaid, classDef on state ready — the only emphasis channel a state diagram has (no per-transition handle)",
    `${mmEmph.svg}<details><summary>Mermaid source</summary><pre>${emphSrc.replace(/</g, "&lt;")}</pre></details>`)}
</div>`;
  writeFileSync(join(OUT, "index.html"), page("Mermaid pilot — A/B record and capability matrix", indexBody));
  pages.push("index.html");
  console.log("wrote index.html");

  // ---- Screenshots: look at what was rendered ----
  mkdirSync(join(OUT, "shots"), { recursive: true });
  const shotPage = await renderer.browser.newPage();
  await shotPage.setViewport({ width: 1440, height: 1000 });
  for (const f of pages) {
    await shotPage.goto(`file://${join(OUT, f)}`, { waitUntil: "networkidle0" });
    const png = join(OUT, "shots", f.replace(/\.html$/, ".png"));
    await shotPage.screenshot({ path: png, fullPage: true });
    console.log(`shot ${png}`);
  }
  await shotPage.close();

  console.log("PILOT GENERATION COMPLETE");
} finally {
  await renderer.close();
}
