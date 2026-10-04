# MAGE Model Workbench

A browser page that opens a MAGE model system, checks it against the semantics, and runs saved
questions over it. Everything runs client-side: no server, no account, no install, and the model never
leaves the machine. It publishes with the catalogue site at `/workbench/`.

`index.html` is a hand-authored app shell. `npm run build` bundles `src/` into the gitignored `dist/`,
which the shell loads as an ES module — so the page needs a build before it does anything, and it needs
a real HTTP origin (`file://` blocks module scripts).

## Running the gates

Node 24, from `.nvmrc`. `nvm use` takes no argument — it reads the pin from that file:

    export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use

    npx tsc --noEmit     # strict, + noUncheckedIndexedAccess, exactOptionalPropertyTypes, erasableSyntaxOnly
    npm test             # node:test, over test/*.test.ts + test/*.test.mjs
    npm run build        # esbuild -> dist/workbench.js + dist/analysis.worker.js
    npm run all          # the preflight below, then the three above, in that order

### The Node preflight

    npm run check:node   # the Node running these gates can run them, and says so when it cannot

Two numbers, each in one file. The **floor** is `engines.node` in `package.json` — `>=22`, the oldest
Node that works. The **pin** is `.nvmrc` at the repo root — `24`, what `nvm use` selects and what CI
installs via `node-version-file: .nvmrc`. The preflight reads both from their own files, hardcodes
neither, and reports a pin that does not satisfy the floor as the contradiction it would be.

Below the floor it refuses and names the fix. Above the floor but off the pin it warns and continues.
It is wired into `npm run all` and into an npm `pre` hook on every gate that loads a `.ts` entry
point, so npm runs it whether or not anyone remembered to — under Node 20 those gates otherwise die
with `ERR_UNKNOWN_FILE_EXTENSION`, a module-load error that reads exactly like broken code and cost
two people time on 261003.

### The published-site probe

One gate is MANUAL, because it reads the network:

    npm run check:published                    # liveness + currency of the deployed site
    npm run check:published -- --strict         # a deploy still in flight counts as a failure
    npm run check:published -- --base <url>     # probe somewhere else; says loudly that it did

It refuses to guess its target: the base comes from the `origin` remote (a `CNAME` wins if one is ever
published), never from an argument, because a hand-typed base once returned 404 on all five pages of a
healthy site.

It reports **two verdicts, separately**, because neither implies the other:

- **Liveness** — every declared URL answers 200 carrying the content shape that identifies that page.
- **Currency** — what answered was built from the sources at `HEAD`, compared against the `inputs`
  map in the `dist/build-manifest.json` the site itself serves, plus a byte comparison of the two
  hand-authored shells. Not `builtAt`: a timestamp dates a build, not a source, so it cannot tell a
  stale deploy from a rebuilt-unchanged tree.

On 261003 liveness read `6/6 declared pages live` while every page served was the previous build.
Currency has three states and the exit code reflects the caller's intent: `current` passes; `lagging`
(drift whose newest commit is inside the 20-minute deploy window) passes by default and fails under
`--strict`; `stale` and `unknown` always fail. The window is `--grace-minutes`-adjustable. The
comparison is against committed bytes, so a dirty working tree cannot read as a stale deploy —
uncommitted inputs are reported as a note beside the verdict.

Both `npm run all` and the Pages workflow exclude this gate deliberately — it measures the deploy that
already shipped rather than the tree being gated, and a hermetic tier must not go red on a DNS
failure. Those exclusions are declared in `test/gate-reachability.test.ts`; the URL list and the
base-URL derivation live in `scripts/published-pages.ts`, and adding a published page means adding a
row there, including whether the page is served verbatim from a committed file.

Two more gates live outside npm. `validate.py --self-test` asserts that each semantic rule still fires
on a model that violates it; `validate.py <model>` validates one `.mage.yaml`. The `pre-push` hook runs
all of them when a push touches `workbench/`, and the Pages workflow runs them on every push to main.

## Where the authority lives

- [SEMANTICS.md](SEMANTICS.md) — what a model system means and what each numbered rule requires. The
  authoritative specification. Read it before changing anything under `src/engine/` or `src/validator/`.
- [PLAN.md](PLAN.md) — the phased plan of work, and which phase owns what.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) — questions still unruled. A decision taken here before it is
  ruled there is a decision taken twice.

This file does not restate the semantics. A second copy of the rules goes stale within the week.
