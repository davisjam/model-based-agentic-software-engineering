/**
 * G1, driven: every declared navigation path walked by a keyboard, and the count held shut.
 *
 * `DECISIONS-RULED-shell-261002.md` G1 ratifies that a human affordance is wired only if it
 * declares a route from the default workspace and the browser tier walks that route keyboard-only
 * to a live control — and records the condition this file exists to meet: "the load-bearing half is
 * the drive, not the declaration. A declared path that nothing walks is the same defect F-3 was —
 * a sentence an author wrote."
 *
 * So no route is written here. The drives are GENERATED from `navPaths()`, one per declared path,
 * and `paths.mjs` holds the three assertions that make a walk falsifiable (its header carries the
 * argument). This file is the generator, the known-set assertion, and the receipt.
 *
 * **What it does NOT replace.** `keyboard.test.mjs` drives §19's thirteen operations end to end —
 * reach the control, operate it, assert the MODEL moved. These drives stop at arrival: reached,
 * focusable, enabled. The thirteen stay as a verbatim floor because arrival is the weaker claim,
 * and §2.3 asks the generated walks to cover the FULL registry rather than to replace the deep
 * ones. Two tiers of one requirement, and the thirteen are the stronger tier.
 *
 * **Why the count is an assertion rather than a report.** `node --test` over a file that generates
 * zero drives prints a green tier, and a registry that lost its `path` fields would generate
 * exactly that. So the last test compares the walked count against the registry's own arithmetic,
 * by derivation, and the receipt carries it into the CI log — the pattern
 * `test/capabilities.test.ts` already uses for the operation count.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServerOnFreePort, launchBrowser, shutdown, openWorkbench, writeReceipt,
  WORKBENCH_DIR, PATHS_RECEIPT_PATH,
} from "../harness.mjs";
import { walkDeclaredPath } from "./paths.mjs";
import {
  CAPABILITIES, navPaths, WIRED_WITHOUT_A_WALKED_PATH, checkNavPaths,
} from "../../../src/app/capabilities.ts";
import { SURFACES, surfaceElement } from "../../../src/ui/shell/surfaces.ts";

let ORIGIN;
let server;
let browser;
let page;

/** What this run actually walked, which is what the receipt reports and the census asserts. */
const walked = [];

/** Every declared path, read once. The generator's input and the census's denominator. */
const DECLARED = navPaths();

before(async () => {
  ({ server, origin: ORIGIN } = await startServerOnFreePort(WORKBENCH_DIR));
  browser = await launchBrowser();
  ({ page } = await openWorkbench(browser, ORIGIN));
  // Tall enough that focus scrolls a control at the foot of the page into view rather than leaving
  // it outside the layout viewport — the same reason `keyboard.test.mjs` sets it.
  await page.setViewport({ width: 1280, height: 1400 });
}, { timeout: 180_000 });

after(async () => {
  if (walked.length > 0) {
    const path = await writeReceipt({
      origin: ORIGIN, ranAt: new Date().toISOString(),
      pathsDeclared: DECLARED.length,
      pathsWalked: walked.length,
      withoutAWalkedPath: WIRED_WITHOUT_A_WALKED_PATH.map((e) => e.at),
      walks: walked,
    }, PATHS_RECEIPT_PATH);
    console.log(`G1 declared-path receipt: ${path}`);
  }
  await shutdown({ browser, server });
});

describe("the static rung, re-checked against the served page's own registry", () => {
  it("every wired human affordance declares a path or is enumerated as not having one", () => {
    // Rung 1 runs in the node tier too. It runs HERE as well because this file's generator reads
    // the same registry, and a generator over a registry that fails rung 1 would silently produce
    // fewer drives — the shrunk-coverage failure the census below exists to catch, caught one layer
    // earlier with a message that names the capability.
    assert.deepEqual(checkNavPaths().map((v) => `${v.capability}: ${v.problem}`), []);
  });

  it("every surface a path names resolves to an element the page declares", async () => {
    // §2.3's companion closure check, at the rung that can see the served DOM. The node tier
    // asserts the ids are in `index.html`; this asserts the SERVED page presents them, which is the
    // direction a build step or a template could break.
    const cited = new Set(DECLARED.flatMap((d) => d.path.map((s) => s.surface)));
    assert.ok(cited.size > 0, "no declared path names any surface — the registry lost its paths");
    const ids = [...cited].map((surface) => {
      const id = surfaceElement(surface);
      assert.ok(id !== null, `a path cites '${surface}', which SURFACES declares planned`);
      return { surface, id };
    });
    const missing = await page.evaluate((rows) =>
      rows.filter((r) => document.getElementById(r.id) === null), ids);
    assert.deepEqual(missing, [], "the served page is missing a surface host a path names");
  });

  it("the surfaces table and the citing paths agree about what is built", () => {
    // The other direction, and it is deliberately NOT "every surface is cited". A built region
    // nobody routes through is an ordinary state — `nav-models` and `palette` host no affordance
    // site of their own — so the check is that nothing CITED is planned, which is the failure.
    const planned = new Set(SURFACES.filter((s) => s.status === "planned").map((s) => s.surface));
    const citedPlanned = [...new Set(DECLARED.flatMap((d) => d.path.map((s) => s.surface)))]
      .filter((s) => planned.has(s));
    assert.deepEqual(citedPlanned, []);
  });
});

describe("the known set: wired human affordances with no walked path", () => {
  it("is exactly the declared one, and each member says why and who drains it", () => {
    // §2.4's migration shape. The field lands optional, the path-less wired affordances are
    // asserted as an EXACT set, and the final wave flips the checker hard. An exact set is what
    // makes the number a work list: a new path-less site fails here rather than joining a tolerance.
    const pathless = CAPABILITIES.flatMap((c) => c.human)
      .filter((a) => a.status === "wired" && a.path === undefined)
      .map((a) => a.at)
      .sort();
    assert.deepEqual(pathless, WIRED_WITHOUT_A_WALKED_PATH.map((e) => e.at).sort(),
      "the registry's path-less wired sites are not the enumerated set");
    for (const entry of WIRED_WITHOUT_A_WALKED_PATH) {
      assert.ok(entry.why.length > 80,
        `${entry.at}: a one-line reason is an aspiration — say what the page cannot do`);
      assert.ok(entry.drainedBy.length > 20, `${entry.at}: no wave is named as draining it`);
    }
  });

  it("the capabilities those sites belong to are still reachable some other way", () => {
    // The finding is at SITE level, and this is what bounds it. `inspector.delete-model` is
    // unreachable; `delete-model` the capability keeps a second site that declares a walked path, so
    // UX-I1's zero is honest rather than laundered. The day a capability's LAST site goes path-less,
    // this fails and the parity count should fail with it.
    const excused = new Set(WIRED_WITHOUT_A_WALKED_PATH.map((e) => e.at));
    const stranded = CAPABILITIES.filter((c) => {
      const wired = c.human.filter((a) => a.status === "wired");
      return wired.length > 0 && wired.every((a) => excused.has(a.at));
    }).map((c) => c.id);
    assert.deepEqual(stranded, [],
      "a capability's every wired human site is excused from declaring a path, so nothing a person "
      + "can walk reaches it — that is a UX-I1 violation wearing a known-set costume");
  });
});

describe("the generated drives — one per declared path, walked by keyboard", () => {
  // The generator. One `it` per declared path, named by the site, so a failure names the affordance
  // in the test title before anyone reads an assertion message.
  for (const declared of DECLARED) {
    const route = declared.path.length === 0
      ? "the default workspace"
      : declared.path.map((s) => `${s.surface}/${s.via}${s.requires === undefined ? "" : `[${s.requires}]`}`).join(" → ");
    it(`${declared.at}: ${route}`, async () => {
      walked.push(await walkDeclaredPath(page, ORIGIN, declared, surfaceElement));
    }, { timeout: 180_000 });
  }
});

describe("rung 3: the receipt's count, by derivation", () => {
  it("every declared path was walked in this run", () => {
    // The assertion a skipped drive reads as red rather than as shrunk coverage. Derived twice over:
    // the denominator comes from the registry and the numerator from what the walks recorded, so
    // neither is a number anybody typed.
    const seen = new Set(walked.map((w) => w.at));
    const missed = DECLARED.map((d) => d.at).filter((at) => !seen.has(at));
    assert.deepEqual(missed, [],
      "declared paths with no walk in this run — a drive was skipped, renamed or threw before "
      + "recording");
    assert.equal(walked.length, DECLARED.length);
  });

  it("the walked count plus the known set equals every wired human affordance site", () => {
    // The closure. A site cannot escape both the drive and the known set, which is the hole a
    // count-without-a-denominator leaves: 35 walks reads as complete whether the registry declares
    // 35 sites or 50.
    const sites = new Set(
      CAPABILITIES.flatMap((c) => c.human).filter((a) => a.status === "wired").map((a) => a.at),
    );
    assert.equal(DECLARED.length + WIRED_WITHOUT_A_WALKED_PATH.length, sites.size,
      `the registry declares ${sites.size} wired human affordance sites; ${DECLARED.length} declare `
      + `a path and ${WIRED_WITHOUT_A_WALKED_PATH.length} are enumerated as not having one`);
  });

  it("the drives covered every surface a path names, and both terminal kinds", () => {
    // A census of the DRIVE rather than of the registry: the readout branch and the control branch
    // are two different assertions, and a run that exercised only one would leave the other
    // unmeasured while reporting a full count. Five sites are readouts, so both arms have work.
    const kinds = new Set(walked.map((w) => w.kind));
    assert.deepEqual([...kinds].sort(), ["control", "readout"],
      "this run exercised only one terminal kind, so the other assertion is unmeasured");
    const walkedSurfaces = new Set(DECLARED.flatMap((d) => d.path.map((s) => s.surface)));
    const openedAny = walked.filter((w) => w.opened.length > 0);
    assert.ok(openedAny.length > 0,
      "no drive opened a disclosure, so the keyboard-disclosure arm of the walk is unmeasured");
    assert.ok(walkedSurfaces.size >= 6,
      `the declared paths reach only ${walkedSurfaces.size} surfaces: ${[...walkedSurfaces].join(", ")}`);
  });
});
