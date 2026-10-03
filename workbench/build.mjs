// Bundle the workbench into self-contained static assets.
//
// esbuild rather than Vite deliberately: one binary, one script, no dev server and no plugin
// surface to maintain. The artifact must be self-contained anyway -- the Artifact CSP and the
// Pages host both forbid external fetches -- so a bundler's dev-time conveniences buy nothing
// here, and every dependency is one more thing to upgrade.
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

const outdir = "dist";
await mkdir(outdir, { recursive: true });

const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
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
await build({ ...common, entryPoints: ["src/ui/main.ts"], outfile: `${outdir}/workbench.js` });
await build({ ...common, entryPoints: ["src/worker/analysis.worker.ts"], outfile: `${outdir}/analysis.worker.js` });

// dist/ holds bundles ONLY. The served page is workbench/index.html, which loads
// `./dist/workbench.js`; a copy of that file inside dist/ resolves the same relative src to
// dist/dist/workbench.js, so the copy is a page that cannot work. It was also a second .html under
// workbench/, which the site's reachability gate reads as an orphan once workbench/ enters the walk.
console.log(`build: ${outdir}/workbench.js + ${outdir}/analysis.worker.js`);
