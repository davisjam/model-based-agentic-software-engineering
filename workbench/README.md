# MAGE Model Workbench

A browser page that opens a MAGE model system, checks it against the semantics, and runs saved
questions over it. Everything runs client-side: no server, no account, no install, and the model never
leaves the machine. It publishes with the catalogue site at `/workbench/`.

`index.html` is a hand-authored app shell. `npm run build` bundles `src/` into the gitignored `dist/`,
which the shell loads as an ES module — so the page needs a build before it does anything, and it needs
a real HTTP origin (`file://` blocks module scripts).

## Running the gates

Node 24, from `.nvmrc`:

    export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24

    npx tsc --noEmit     # strict, + noUncheckedIndexedAccess, exactOptionalPropertyTypes, erasableSyntaxOnly
    npm test             # node:test, over test/*.test.ts
    npm run build        # esbuild -> dist/workbench.js + dist/analysis.worker.js
    npm run all          # the three above, in that order

One gate is MANUAL, because it reads the network:

    npm run check:published   # every URL we publish serves, at the base DERIVED from `origin`

It refuses to guess its target: the base comes from the `origin` remote (a `CNAME` wins if one is ever
published), never from an argument, because a hand-typed base once returned 404 on all five pages of a
healthy site. `--base <url>` overrides it for a preview and says loudly that the result is not about
the published site. Both `npm run all` and the Pages workflow exclude it deliberately — it measures
the deploy that already shipped rather than the tree being gated, and a hermetic tier must not go red
on a DNS failure. Those exclusions are declared in `test/gate-reachability.test.ts`; the URL list and
the base-URL derivation live in `scripts/published-pages.ts`, and adding a published page means adding
a row there.

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
