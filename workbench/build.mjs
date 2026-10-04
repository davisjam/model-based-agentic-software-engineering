// Bundle the workbench into self-contained static assets.
//
// esbuild rather than Vite deliberately: one binary, one script, no dev server and no plugin
// surface to maintain. The artifact must be self-contained anyway -- the Artifact CSP and the
// Pages host both forbid external fetches -- so a bundler's dev-time conveniences buy nothing
// here, and every dependency is one more thing to upgrade.
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
// The hash is DEFINED there, not here. This file writes the manifest; the browser harness and the
// published-site check read it, and all three must agree to the character — a producer slicing 16 hex
// digits and a consumer slicing 12 would report drift in every file forever and blame the tree. One
// definition, three importers, and `test/published-currency.test.ts` asserts no copy grows back.
import { hashInput, MANIFEST_PATH } from "./scripts/build-manifest.ts";

// DERIVED from the manifest path, not spelled twice. The manifest must land beside the bundles —
// the browser harness and the published-site check both resolve it as `<package>/dist/…` — so a
// second literal here could put the bundles somewhere the manifest does not describe.
const outdir = dirname(MANIFEST_PATH);
await mkdir(outdir, { recursive: true });

const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  // Asked for so the build can RECORD what it read. See the manifest section at the foot of this
  // file: the browser tier verifies the bundle against its own inputs before it serves the page.
  metafile: true,
  // MINIFIED, measured rather than assumed. The SPARQL wave reported that minifying recovers most of
  // its 55 KB gzipped delta -- 98220 -> 137064 for the same before/after where the unminified build
  // read 141349 -> 196422 -- and left it as "one flag in a file this wave does not own". This is that
  // file and that flag. Every visitor pays the main bundle on first load, so the recovery is not a
  // micro-optimisation; it is most of a feature's cost handed back.
  //
  // Safe because the gates check the SERVED artifact rather than the source: the browser tier loads
  // the built page in Chromium and the a11y tier runs axe over it, so a minifier that broke a name
  // the page depends on would fail those rather than ship.
  minify: true,
  logLevel: "info",
};

// Two entry points, because the analysis engine runs in a Worker: the UI bundle must not be able
// to import the explorer directly, which is the component model's kernel/host boundary made
// physical rather than merely declared.
const ui = await build({ ...common, entryPoints: ["src/ui/main.ts"], outfile: `${outdir}/workbench.js` });
const worker = await build({ ...common, entryPoints: ["src/worker/analysis.worker.ts"], outfile: `${outdir}/analysis.worker.js` });

// The Learn page (learn.html) is its own entry: documentation and exploration, not another editing
// surface, so it must not ride in the workbench bundle every workspace visitor pays for. It runs
// no Worker — its renders are small exemplar scenes on the main thread.
const learn = await build({ ...common, entryPoints: ["src/learn/main.ts"], outfile: `${outdir}/learn.js` });

// dist/ holds bundles ONLY. The served page is workbench/index.html, which loads
// `./dist/workbench.js`; a copy of that file inside dist/ resolves the same relative src to
// dist/dist/workbench.js, so the copy is a page that cannot work. It was also a second .html under
// workbench/, which the site's reachability gate reads as an orphan once workbench/ enters the walk.
console.log(`build: ${outdir}/workbench.js + ${outdir}/analysis.worker.js + ${outdir}/learn.js`);

// -- the input manifest -------------------------------------------------------------------------
//
// WHY a build records what it read. The browser tier compares two things that come from different
// places: it imports the capability registry from TYPESCRIPT SOURCE and it drives a page running
// `dist/workbench.js`. Any divergence between the two is reported as a drift in the PRODUCT, and
// the report is specific and convincing — on 261002 a bundle one wave old made the UX-I1 gate say
// "2 unregistered button(s): #ask-submit | #ask-track-go" about a page whose source stamps both.
// A false RED that names a defect sends someone to fix correct code, and the plausible fix is to
// put a real defect into a correct module. The ordering `npm run build && npm run test:browser`
// was documented in the harness header and in three CI steps, and documentation is not a gate.
//
// CONTENT, not mtime. A `git worktree add`, a branch switch or a checkout rewrites source mtimes
// without changing a byte, so an mtime comparison would invent the same false RED this manifest
// exists to kill. Hashing what esbuild actually read says whether the bundle corresponds to the
// tree, which is the real question.
//
// Only inputs inside the workbench tree are recorded. A `node_modules` path resolves through a
// symlink shared by every parallel agent worktree, so its hash is a fact about the shared install
// rather than about this tree, and a dependency bump is `npm ci`'s business, not this gate's.
const inputs = {};
for (const result of [ui, worker, learn]) {
  for (const path of Object.keys(result.metafile.inputs)) {
    if (path.includes("node_modules/") || path in inputs) continue;
    inputs[path] = hashInput(await readFile(path));
  }
}
await writeFile(
  MANIFEST_PATH,
  `${JSON.stringify({ builtAt: new Date().toISOString(), inputs }, null, 1)}\n`,
);
console.log(`build: ${MANIFEST_PATH} over ${Object.keys(inputs).length} source inputs`);
