// check_responsive.mjs — deploy-blocking responsive-layout gate for the landing page.
//
// WHY this exists — and why it measures a FAMILY, not one selector:
//
// The landing's deliverable is a responsive layout: at desktop width the page lays prose beside
// figures in multi-column bands, and at phone width those bands collapse toward a single stacked
// column. This check turns that deliverable into a mechanical, deploy-blocking assertion — load the
// built index.html in headless Chrome, measure the column counts of the landing's responsive grid
// containers at a wide (2560px) and a phone (390px) viewport, and assert the layout is structurally
// different: multi-column wide, collapsing on phone.
//
// The failure this design guards against is SELECTOR-RENAME BRITTLENESS. An earlier gate keyed on a
// single hardcoded class (`.masonry`, then `.hero-grid`). When an approved landing redraft renamed or
// removed that one class, the gate HARD-ERRORED on the missing element — a green, genuinely-responsive
// landing failed the deploy purely because the probe pointed at a class that no longer existed. That is
// backwards: the gate should fail a NON-RESPONSIVE landing, not a RENAMED one.
//
// The fix: assert the SUCCESS METRIC across a family of the landing's responsive containers, and degrade
// gracefully per selector. The family (enumerated from the built landing CSS — website-v3, 260825):
//   - `.v3-cards-3` — grid, 3 cols (Learn / Use resource cards) → 1 col at max-width:820px   [PRIMARY]
//   - `.v3-cards-2` — grid, 2 cols (Evidence cards)             → 1 col at max-width:820px
// (The six-claim sequence `.claims` is a single stacked column by design — no grid to collapse — and the
// `.v3-nav-groups` flex nav is a handful of small links that need not wrap at phone width, so neither is a
// member. The card grids are the deterministic responsive demonstrators.)
//
// The contract (aggregate, not per-selector):
//   PASS  when the landing demonstrates responsive collapse — at least one present grid member goes
//         >= 2 cols wide → exactly 1 col phone (the "collapse toward single column" metric; the hero is
//         the primary demonstrator when present), AND every present member that is multi-column wide
//         reduces its column count on phone (the reinforcement).
//   FAIL  only on the AGGREGATE metric: NONE of the family is present (a landing with no responsive
//         container at all), OR a present multi-column member does NOT reduce on phone (a genuinely
//         non-responsive / flattened landing — a dropped media query, `grid-template-columns:1fr`
//         everywhere). A single ABSENT selector never fails the gate — the other members carry it.
//
// Column measurement is mode-aware so it is robust across container types:
//   - grid mode  → count distinct left-edge buckets of the direct children (grid items in one column
//                  share a left-x regardless of vertical alignment, so distinct lefts == columns).
//   - flex mode  → count the most children that share a row (same top-edge bucket); flex-wrap rows
//                  stretch to a shared top, so the widest row's child count == columns.
// Both bucket with an 8px tolerance to absorb sub-pixel rounding.
//
// This is NOT part of `catalog.py validate` (that gate is stdlib-only, clone-and-run, no browser dep).
// It is a non-stdlib deploy-time check that needs a browser — so it lives here in book/ and reuses the
// Puppeteer dep that the build-time mermaid-SVG pre-render already installs.
//
// Invoked by `python3 catalog.py check-responsive` and by the Pages CI. Chrome comes from Puppeteer's
// bundled Chromium (installed by `npm ci` in book/) unless PUPPETEER_EXECUTABLE_PATH / CHROME_PATH
// overrides it. Exit 0 = PASS (prints the measured per-selector column counts); exit 1 = FAIL (prints
// why); exit 2 = usage error (missing/absent index.html argument).

import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer";

const indexHtml = process.argv[2];
if (!indexHtml) {
  console.error("usage: node check_responsive.mjs <abs-path-to-index.html>");
  process.exit(2);
}
if (!existsSync(indexHtml)) {
  console.error(`ERROR: index.html not found at ${indexHtml} — run \`python3 catalog.py build\` first`);
  process.exit(2);
}

const WIDE_VIEWPORT = 2560;
const PHONE_VIEWPORT = 390;

// The responsive-container family, enumerated from the built landing CSS. Each member declares:
//   mode        — "grid" (left-edge column count) or "flex" (widest-row child count).
//   primary     — the lead demonstrator; reported as the primary demonstrator when present.
//   reachSingle — whether a full collapse for this member means exactly 1 column on phone. Grids that
//                 flip to `grid-template-columns:1fr` reach single; flex-wrap only needs to REDUCE.
const FAMILY = [
  { sel: ".v3-cards-3", mode: "grid", primary: true,  reachSingle: true, desc: "Learn / Use resource cards (3-up)" },
  { sel: ".v3-cards-2", mode: "grid", primary: false, reachSingle: true, desc: "Evidence cards (2-up)" },
];

const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || undefined;

// Measure every family member at one viewport. Returns { "<sel>": {present, matched, cols} }.
// `cols` is the max column count across all elements matching the selector (conservative: a selector
// that matches several instances "stayed wide" if ANY instance stayed wide).
async function measureFamily(page, viewportWidth) {
  await page.setViewport({ width: viewportWidth, height: 1400, deviceScaleFactor: 1 });
  // Give layout a tick to reflow after the viewport change.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const probes = FAMILY.map((f) => ({ sel: f.sel, mode: f.mode }));
  return page.evaluate((probes) => {
    const TOL = 8; // px bucket tolerance for sub-pixel rounding
    const columnsOf = (el, mode) => {
      const kids = Array.from(el.children).filter((n) => n.nodeType === 1);
      if (kids.length === 0) return 0;
      if (mode === "flex") {
        // Widest row: bucket child top-edges; the fullest top-bucket is the widest row's child count.
        const tops = kids.map((k) => k.getBoundingClientRect().top).sort((a, b) => a - b);
        const rows = [];
        for (const t of tops) {
          if (rows.length === 0 || Math.abs(t - rows[rows.length - 1].top) > TOL) rows.push({ top: t, n: 1 });
          else rows[rows.length - 1].n += 1;
        }
        return rows.reduce((m, r) => Math.max(m, r.n), 0);
      }
      // grid: distinct left-edge buckets == column tracks occupied.
      const lefts = kids.map((k) => k.getBoundingClientRect().left).sort((a, b) => a - b);
      const buckets = [];
      for (const x of lefts) {
        if (buckets.length === 0 || Math.abs(x - buckets[buckets.length - 1]) > TOL) buckets.push(x);
      }
      return buckets.length;
    };
    const out = {};
    for (const { sel, mode } of probes) {
      const els = Array.from(document.querySelectorAll(sel));
      if (els.length === 0) {
        out[sel] = { present: false, matched: 0, cols: 0 };
        continue;
      }
      out[sel] = { present: true, matched: els.length, cols: Math.max(...els.map((el) => columnsOf(el, mode))) };
    }
    return out;
  }, probes);
}

const browser = await puppeteer.launch({
  headless: "new",
  executablePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

let exitCode = 0;
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
  await page.goto(pathToFileURL(indexHtml).href, { waitUntil: "networkidle0", timeout: 60000 });

  const wide = await measureFamily(page, WIDE_VIEWPORT);
  const phone = await measureFamily(page, PHONE_VIEWPORT);

  // Fold the two viewports into a per-member verdict.
  const members = FAMILY.map((f) => {
    const w = wide[f.sel];
    const p = phone[f.sel];
    const present = w.present && p.present;
    const isMultiWide = present && w.cols >= 2;
    const reduces = present && p.cols < w.cols;
    const reachesSingle = present && p.cols === 1;
    // A "demonstrator" shows the full success metric: multi-column wide, collapsing to a single column
    // on phone. A "flat" member is present and multi-column wide but did NOT reduce — a non-responsive
    // regression (dropped media query). reachSingle:false members (flex) can demonstrate by reducing.
    const demonstrates = isMultiWide && (f.reachSingle ? reachesSingle : reduces);
    const flat = isMultiWide && !reduces;
    return { ...f, present, wideCols: w.cols, phoneCols: p.cols, matched: w.matched, isMultiWide, reduces, demonstrates, flat };
  });

  console.log("Responsive-layout gate — landing responsive-container family (wide → phone columns):");
  for (const m of members) {
    if (!m.present) {
      console.log(`  ${m.sel.padEnd(11)} ABSENT — skipped (${m.desc})`);
      continue;
    }
    const tag = m.demonstrates ? "collapses" : m.flat ? "FLAT (did not reduce)" : "n/a (not multi-col wide)";
    const star = m.primary ? " [primary]" : "";
    console.log(
      `  ${m.sel.padEnd(11)} wide ${m.wideCols} → phone ${m.phoneCols}` +
        `  (${m.matched} instance${m.matched === 1 ? "" : "s"}, ${m.mode}) — ${tag}${star}`
    );
  }

  const present = members.filter((m) => m.present);
  const demonstrators = members.filter((m) => m.demonstrates);
  const flats = members.filter((m) => m.flat);
  // Prefer the hero band as the named primary demonstrator; else the first grid that collapses to single.
  const primaryDemo =
    demonstrators.find((m) => m.primary) ||
    demonstrators.find((m) => m.reachSingle) ||
    demonstrators[0];

  const failReasons = [];
  if (present.length === 0) {
    failReasons.push(
      "no responsive-container family member is present on the landing — none of " +
        FAMILY.map((f) => f.sel).join(", ") +
        " was found. The landing has no responsive grid to measure."
    );
  } else {
    // Success requires at least one full collapse to a single column somewhere in the family.
    const singleDemo = demonstrators.some((m) => m.reachSingle && m.phoneCols === 1);
    if (!singleDemo) {
      failReasons.push(
        "no present grid member collapsed to a single column on phone — the landing does not demonstrate " +
          "the single-column collapse (checked " +
          present.map((m) => `${m.sel}:${m.wideCols}→${m.phoneCols}`).join(", ") +
          "). A flattened or non-responsive landing."
      );
    }
    // Reinforcement: every present multi-column member must reduce on phone.
    if (flats.length > 0) {
      failReasons.push(
        "present multi-column member(s) did NOT reduce on phone: " +
          flats.map((m) => `${m.sel} (wide ${m.wideCols} == phone ${m.phoneCols})`).join(", ") +
          " — a non-responsive regression (likely a dropped media query)."
      );
    }
  }

  if (failReasons.length > 0) {
    for (const r of failReasons) console.error(`FAIL: ${r}`);
    exitCode = 1;
  } else {
    const primaryStr = primaryDemo
      ? `${primaryDemo.sel} (wide ${primaryDemo.wideCols} → phone ${primaryDemo.phoneCols})`
      : "(none)";
    const reinforce = present.filter((m) => m.isMultiWide && m.reduces && m !== primaryDemo).map((m) => m.sel);
    console.log(
      `PASS: primary demonstrator ${primaryStr} collapses toward a single column on phone` +
        (reinforce.length ? `, reinforced by ${reinforce.join(", ")}` : "") +
        " — the landing renders a structurally different layout at wide vs phone width."
    );
  }
} finally {
  await browser.close();
}

process.exit(exitCode);
