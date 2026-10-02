// Bundle the workbench into self-contained static assets.
//
// esbuild rather than Vite deliberately: one binary, one script, no dev server and no plugin
// surface to maintain. The artifact must be self-contained anyway -- the Artifact CSP and the
// Pages host both forbid external fetches -- so a bundler's dev-time conveniences buy nothing
// here, and every dependency is one more thing to upgrade.
import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";

const outdir = "dist";
await mkdir(outdir, { recursive: true });

const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  logLevel: "info",
};

// Two entry points, because the analysis engine runs in a Worker: the UI bundle must not be able
// to import the explorer directly, which is the component model's kernel/host boundary made
// physical rather than merely declared.
await build({ ...common, entryPoints: ["src/ui/main.ts"], outfile: `${outdir}/workbench.js` });
await build({ ...common, entryPoints: ["src/worker/analysis.worker.ts"], outfile: `${outdir}/analysis.worker.js` });

await copyFile("index.html", `${outdir}/index.html`);
console.log(`build: ${outdir}/workbench.js + ${outdir}/analysis.worker.js + index.html`);
