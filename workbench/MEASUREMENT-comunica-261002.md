# Q7 — can Comunica ship on a static Pages site?

Answers `DESIGN-sparql-261002.md` §6 Q7. Measurement, not a build. Nothing under `src/` changed.

Every number below is marked **[measured]** or **[inferred]**. Nothing was estimated and then
reported as observed.

---

## Verdict

Comunica runs on a static site. It clears every structural blocker Q7 raised: no
`SharedArrayBuffer`, no cross-origin isolation, no WASM, no Worker, no `eval`, zero off-origin
requests at load. The z3-shaped hard blocker is not here.

Two findings decide it anyway.

**Size.** The smallest configuration that covers the §11.1 subset adds **+390 KB gzipped**
[measured] to a site whose entire current JavaScript is 116 KB gzipped. The standard package adds
+674 KB. Minifying — which `build.mjs` does not do today — brings the floor to +273 KB [measured].
The engine outweighs the application by 2.4× to 5.8×.

**Correctness.** Inside a `GRAPH <g> { … }` block, Comunica 5.4.1 **drops every forward branch of
an alternative property path.** Inverted branches survive; `(p|q)` returns nothing at all
[measured — one quad reproduces it, without a bundler, on all three engine packages, on the latest
published version]. §2 of the design prescribes exactly that construct —
`(mage:rel|^mage:rel)` for a symmetric relation type — over exactly that scoping, since each model's
relations live in its own named graph. The two decisions the design already made intersect on the
defect. The failure is silent: `ASK { GRAPH <g> { <a> (<p>|^<p>) <b> } }` returns `false` while
`<a> <p> <b>` sits in `<g>`.

**Recommendation: do not adopt Comunica for layer 2.** Write the evaluator over the subset, reusing
`sparqljs` for the parse that §3 requires regardless. Sizing in §7.

The size alone would have been a trade worth arguing. The wrong answer is not.

---

## 1. Method and environment

| | |
|---|---|
| Machine | Apple M3 Pro, 36 GB, macOS 15.8.1 (24H32) [measured] |
| Node | v24.21.0, npm 11.19.0 |
| Bundler | esbuild 0.25.12, the version `workbench/package.json` pins |
| Bundler settings | `bundle`, `format: "esm"`, `target: "es2022"`, `sourcemap: true`, default (browser) platform — read off `workbench/build.mjs`, not invented |
| Browser | Google Chrome, driven by `playwright-core`, `channel: "chrome"` |
| Comunica | `@comunica/query-sparql-rdfjs` 5.4.1, `@comunica/query-sparql-rdfjs-lite` 5.4.1, `@comunica/query-sparql` 5.4.1 — all the latest published versions |
| Scratch | `/tmp/q7-comunica-scratch`, its own `package.json` and `node_modules` |

Every install ran in the scratch directory. No package manager ran inside the worktree: in a
multi-worktree session `workbench/node_modules` is a symlink into the main checkout, so an install
there mutates every other agent's tree at once. This worktree had no `workbench/node_modules` at
all, which is why the application baseline below was built by pointing esbuild at the worktree's
`src/` with `nodePaths` aimed at the scratch `node_modules` — the source was read, never written to.

**The baseline numbers come from the real application.** `dist/workbench.js` and
`dist/analysis.worker.js` were built from this worktree's `src/` with `build.mjs`'s exact settings,
so the comparison is against the app as it ships. It came out at 405,558 raw, confirming the brief's
"~400 KB".

**The test query set is the §11.1 subset, not one token query.** `ASK` with a `+` path inside a
`GRAPH` block, and a `SELECT` with `OPTIONAL`, `FILTER`, `!BOUND`, `ORDER BY` and `LIMIT`. Both run
over hand-written quads shaped like the layer-1 projection: `urn:mage:` IRIs, system-level facts in
the default graph, one model's `calls` edges in its named graph.

**Two source shapes were measured, because the integration cost differs.** `src/rdf/terms.ts` is
hand-written and holds a `readonly Quad[]`, not an n3 `Store`. So the realistic path is a ~40-line
RDF/JS `Source` adapter over the quad array, and that is what the headline numbers use. An n3
`Store` variant was also built, to cross-check results against a trusted RDF/JS implementation and
to price the alternative.

---

## 2. Bundle size [measured]

All figures are bytes of the emitted `.js`, `gzip -9`, `brotli -q 11`. Unminified unless the name
says otherwise, matching `build.mjs`.

| Artifact | raw | gzip | brotli |
|---|---:|---:|---:|
| `workbench.js` (the app today) | 405,558 | **95,143** | 79,657 |
| `analysis.worker.js` (the app today) | 81,165 | **20,444** | 17,789 |
| RDF/JS adapter + queries, **no engine** (the Comunica path's floor) | 76,803 | 16,220 | 14,273 |
| `sparqljs` parser + queries, **no evaluator** (the fallback's floor) | 174,795 | 33,938 | 26,926 |
| adapter + `query-sparql-rdfjs-lite` | 2,869,920 | **406,607** | 308,721 |
| adapter + `query-sparql-rdfjs` | 4,502,471 | **690,123** | 458,293 |
| n3 `Store` + `query-sparql-rdfjs` | 4,518,832 | 694,080 | 459,953 |
| adapter + `query-sparql` (full engine) | 6,149,391 | 1,003,715 | 617,573 |
| minified: adapter + `-lite` | 1,215,993 | 280,942 | 224,259 |
| minified: adapter + `query-sparql-rdfjs` | 1,933,738 | 467,456 | 336,108 |
| minified: `sparqljs` parser only | 98,923 | 27,198 | 22,192 |

### What the delta is

The app serves **115,587 bytes gzipped** of JavaScript today [measured]. Against that:

| Configuration | gzip delta over the no-engine floor | multiple of all current app JS |
|---|---:|---:|
| `-lite`, unminified (today's `build.mjs`) | **+390,387** | 3.4× |
| `query-sparql-rdfjs`, unminified | **+673,903** | 5.8× |
| `-lite`, minified | +272,558 | 2.4× |
| `query-sparql-rdfjs`, minified | +459,072 | 4.0× |
| full `query-sparql`, unminified | +987,495 | 8.5× |

The `-lite` package covers the whole §11.1 subset (§6), so it is the honest floor rather than the
standard one. `query-sparql` buys HTTP sources and SPARQL endpoints, which a client-side workbench
over an in-memory projection will never use; it is listed to show what the obvious import costs.

Two secondary costs, both [measured]:

- **Source maps.** `build.mjs` sets `sourcemap: true`, so an adopted engine emits a **7.3 MB**
  `.map` beside the bundle (4.6 MB for `-lite`). Chrome does not fetch it with devtools closed
  [measured — the test server logged two requests per page load], so it costs repository and Pages
  storage, not page weight.
- **Install footprint.** `@comunica/query-sparql-rdfjs` resolves **530 packages, 271 of them
  `@comunica/*`, 113 MB** on disk. `-lite` resolves 475 packages, 244 `@comunica/*`, 90 MB. The
  workbench's entire current dependency set is four dev packages and one runtime package (`yaml`).

---

## 3. Does it need a header or an API the site cannot provide? [measured]

**No.** Every item Q7 named came back clear.

| Requirement | Result | Evidence |
|---|---|---|
| `SharedArrayBuffer` | not needed | Page ran correctly with `typeof SharedArrayBuffer !== "undefined"` → `true` but `crossOriginIsolated` → `false`. The bundle's one reference is a guarded `typeof` branch inside the bundled `buffer` shim's `Buffer.from` dispatcher. |
| Cross-origin isolation | not needed | `self.crossOriginIsolated === false` on every passing run. |
| WASM | not used | Zero occurrences of `WebAssembly` in the 4.5 MB bundle. |
| Worker | not spawned | Zero occurrences of `new Worker`. One `context.importScripts` reference, inside a guarded environment sniff. |
| `eval` / `new Function` | not used | Zero occurrences of either. Confirmed behaviourally: ran under `default-src 'none'; script-src 'self'; connect-src 'none'` with **zero** `securitypolicyviolation` events and correct results. |
| Network fetch at load | none | The test server logged exactly two requests per page load: the HTML and the bundle. Playwright recorded **zero** off-origin requests across all 30 browser runs. |

The subtle one — an engine that quietly reaches for a remote service at startup — is clear, and the
CSP run is what makes that claim behavioural rather than a grep. The bundle does carry an
`XMLHttpRequest`-based `fetch` polyfill and an `lru-cache` whose `fetch` method is a cache primitive
with no network in it; neither is reached when the only source is an RDF/JS object.

Node built-ins appear in the bundle (`Buffer`, `process`, `node:*` references, one lodash
`require("util")` behind a module guard). esbuild's browser platform resolves them through
Comunica's `browser` fields. They are dead weight, not a blocker.

---

## 4. Cold start [measured]

`performance.now()` inside the page. Since it reads as milliseconds from `timeOrigin`, the marks are
navigation-relative. Five runs per scenario, each in a **fresh browser context** so no HTTP cache
carries over. `navToFirstResult` = navigation start → the `ASK` result.

| Scenario | navToFirstResult (min / median / max) | module eval | engine ctor | first `ASK` | `SELECT` |
|---|---|---:|---:|---:|---:|
| http, ESM, `query-sparql-rdfjs` | 121.8 / **135.2** / 398.7 ms | 38–53 ms | 61–64 ms | 13 ms | 13–14 ms |
| http, ESM, strict CSP | 132.4 / **140.1** / 148.6 ms | 33–35 ms | 60–68 ms | 13 ms | 14 ms |
| http, classic script (IIFE) | 125.6 / **130.1** / 539.6 ms | — | 62–67 ms | 14 ms | 14–15 ms |
| `file://`, classic script | 131.2 / **135.7** / 146.3 ms | — | 60–64 ms | 13 ms | 14 ms |
| http, ESM, `-lite` | 96.4 / **108.3** / 1366.1 ms | 22–24 ms | 51–59 ms | 11–12 ms | 12–13 ms |

**Engine construction dominates**, at 51–68 ms, and it is a one-time cost: with one engine reused
across six queries, per-query time settles at 2–12 ms on small data [measured, Node]. Parsing and
evaluating the 4.5 MB script costs 33–53 ms. The queries themselves are cheap.

**Two caveats, and the first matters more than the measurement.**

- **This excludes network transfer.** The server was localhost. On a real Pages deployment the
  browser must first download 390–690 KB gzipped, and that term dominates: ~550 ms at 10 Mbit/s,
  ~3.7 s at 1.5 Mbit/s [inferred — arithmetic on the measured gzip size, not observed]. The 135 ms
  is the floor, not the experience.
- **The per-scenario maximum is a first-run artifact.** Runs showing 399 ms, 540 ms and 1366 ms are
  each the first load of a multi-megabyte file in that browser session — a cold OS page-cache read.
  Runs 2–5 are tight. I report the outliers rather than dropping them, but the median is the number.

Property-path scale, since the design worries about it [measured, Node, `query-sparql-rdfjs`, engine
reused]: `ASK { <e0> p+ <eN-1> }` over a chain of 1,000 entities (1,999 quads) runs in 50–80 ms;
over 5,000 entities (9,999 quads), 188–214 ms. That is Q8's question, not Q7's, but it prices the
thing Q8 is deciding where to run.

---

## 5. `file://` and plain http [measured]

A free port was needed. `lsof` confirms 8080 and 8137 both hold a listening Python process on this
machine, so neither was used. **Port 8291.**

| | http | `file://` |
|---|---|---|
| ESM (`<script type="module">`) | works | **fails** |
| Classic script (IIFE bundle) | works | works |

Over http, both module formats work, with and without a strict CSP.

From `file://`, the ESM build fails on all five runs:

```
Access to script at 'file:///.../dist/comunica-rdfjs.js' from origin 'null' has been blocked by
CORS policy: Cross origin requests are only supported for protocol schemes: chrome, ...
TypeError: Failed to fetch dynamically imported module
```

**That is a property of module scripts, not of Comunica.** Chrome gives a `file://` page the opaque
origin `null` and refuses module fetches. The same bundle built as a classic IIFE script runs from
`file://` at the same speed (135.7 ms median) with identical results. So `file://` is reachable; it
costs a second output format. The published site is http, so nothing here is decisive — the brief
asked because a divergence would be diagnostic, and the divergence turned out to be the bundler's,
not the engine's.

One harness note, so the numbers are not misread: Playwright's `waitForFunction` never resolved on
the CSP page even though the page had finished, so the CSP runs read `window.__result` after a fixed
wait instead. The first CSP attempt looked like a timeout and was not one. That is a measurement
artifact and it is why §3's CSP row reports zero violations rather than a failure.

---

## 6. Subset conformance — and a wrong answer

Thirteen queries, one per construct §11.1 names, against both candidate engines. Grouped into nine
rows below.

| Construct | `query-sparql-rdfjs` | `-lite` |
|---|---|---|
| `ASK`, `SELECT`, BGP | ok | ok |
| named graph `GRAPH <g> {}` / `GRAPH ?g` | ok | ok |
| default-graph union | ok | ok |
| `FILTER` + comparison | ok | ok |
| `OPTIONAL` + `!BOUND` | ok | ok |
| property path `+`, `*`, `/` | ok | ok |
| inverse path `^` | ok | ok |
| `COUNT` + `GROUP BY`, `MIN`/`MAX`/`SUM` | ok | ok |
| `ORDER BY` + `LIMIT` | ok | ok |

13 of 13 on both. `-lite` loses nothing from the subset, which is why §2's floor uses it.

### The defect

Then the row *counts* were checked rather than only the absence of an exception, and the
symmetric-path case returned one row where SPARQL 1.1 requires two.

Isolating it took three quads in one named graph `<urn:g>`: `a -p-> b`, `a -q-> c`, `d -r-> a`.
Every row below asks for `?x` in `<a> «pattern» ?x`, under the two scopings, over that one store.
`FROM <urn:g>` promotes the named graph to the default graph; the data is identical, so the columns
differ only in scoping.

| Pattern from `a` | inside `GRAPH <urn:g> {}` | with `FROM <urn:g>` | correct |
|---|---|---|---|
| `p` | `[b]` | `[b]` | ✓ |
| `^r` | `[d]` | `[d]` | ✓ |
| `!(q)` | `[b]` | `[b]` | ✓ |
| `(p\|q)` | **`[]`** | `[b, c]` | **both forward branches dropped** |
| `(p\|^r)` | **`[d]`** | `[b, d]` | **forward dropped, inverse kept** |
| `(^r\|p)` | **`[d]`** | `[b, d]` | **same — written order is irrelevant** |
| `(^r\|^r)` | `[d, d]` | `[d, d]` | both scopings agree; two inverted branches both get evaluated |
| `(p\|q\|^r)` | **`[d]`** | `[b, c, d]` | **three-way: both forwards dropped** |
| `(p/p\|q)` | **`[]`** | `[c]` | **a forward *sequence* branch is dropped too** |
| `(p\|q)*` | **`[]`** | `[a, b, c]` | **closure over a broken alt loses even `?x = a`** |

**One rule accounts for every row: inside a `GRAPH` block, Comunica drops each non-inverted branch
of an alternative path.** An `^`-led branch survives, a forward one vanishes, and the order they are
written in makes no difference. Plain predicates, inverse paths, negated property sets, and `+` /
`*` / `/` over a single predicate are all correct in the same position — on the larger
four-entity-chain fixture, `p+`, `p*` and `p/p` inside `GRAPH` matched the `FROM` column exactly,
and `p*` there did bind the subject, so the missing `a` above belongs to the alternative, not to the
closure [measured]. **`{ … } UNION { … }` inside `GRAPH` is also correct** — the chain fixture's
`{<orders> p ?x} UNION {?x p <orders>}` returned both rows under both scopings [measured]. Only the
`|` operator is affected.

SPARQL 1.1 §18.2.2.4 translates `elt1|elt2` into the union of the two paths, so these are not a
reading of an ambiguous spec. `(p|q)` over `a -p-> b` must bind `b`.

**The `ASK` form is what makes it dangerous.** One quad reproduces it:

```sparql
# store: <urn:a> <urn:p> <urn:b> in GRAPH <urn:g>
ASK { GRAPH <urn:g> { <urn:a> (<urn:p>|^<urn:p>) <urn:b> } }  -- false   WRONG
ASK FROM <urn:g>    { <urn:a> (<urn:p>|^<urn:p>) <urn:b> }    -- true    correct
ASK { GRAPH <urn:g> { <urn:a>  <urn:p>           <urn:b> } }  -- true    correct
```

No error, no warning, no empty-result hint. A false denial of a fact the model asserts, on the exact
construct §2 V8 prescribes for a symmetric relation type.

**Scope of the finding, each point checked:**

- Reproduces on `@comunica/query-sparql-rdfjs`, `@comunica/query-sparql-rdfjs-lite` and
  `@comunica/query-sparql`, all 5.4.1 — the latest published versions. One shared path actor.
- Reproduces **without esbuild**, importing straight from `node_modules`. Not a bundling artifact.
- Reproduces against both source implementations: the n3 `Store` and the hand-written array adapter.
  Not an adapter bug; the two agree on the wrong answer.
- With both ends variable, `GRAPH <g> { ?s (p|^p) ?x }` returns 2 rows where 4 are required, and the
  2 are the inverse branch — the same rule, seen from the other side.
- A brief search turned up no upstream issue matching this. I did not establish that it is
  unreported, and I did not test earlier majors.

### Why this decides the layer rather than adding a workaround

The design already fixed two things that put every symmetric query into the failing cell.

- **§2, cross-model union:** each model's relations live in its named graph, and a query about one
  purposeful reduction scopes to that graph. `GRAPH <g>` is the normal case, not an edge.
- **§2, V8 symmetry:** no inverse term is materialized, so the builder emits `(mage:rel|^mage:rel)`
  for a relation type declared symmetric. The alternative path is the chosen mechanism.

A query builder could emit `{…} UNION {…}` instead of `(p|^p)`, and the measurement shows that
works. But the builder is not the only thing that reaches the engine: §11 has agents issuing SPARQL,
and §3's rule is to hand the **unmodified** query text to the engine after walking it — never to
rewrite a user's query. An engine that silently mis-answers a construct the subset accepts cannot be
guarded by a validator that is forbidden from rewriting. The subset would have to shrink to exclude
`|`, and then V8's symmetry decision loses the mechanism it was decided on.

Comunica was going to cost 2.4×–5.8× the application's weight to evaluate a thirteen-construct
subset. Paying that for an engine that needs a construct removed from the subset, over the scoping
the design made standard, is the wrong trade.

---

## 7. Sizing the fallback

The brief asks for a rough size if the answer is "do not adopt". Line counts of the existing code
are [measured]; the estimate of new code is [inferred] and should be read as an order of magnitude.

**Do not write the parser.** §3 already requires parsing every query to walk it and reject
out-of-subset constructs, so the parse is paid whether or not Comunica evaluates. `sparqljs` 3.7.4
does it for **27,198 bytes gzipped minified** [measured] and produces a usable algebra. One caveat:
npm marks it deprecated ("Package no longer supported"), and Comunica 5.4.1 depends on it anyway.
Vendoring or replacing it later is a bounded job; re-authoring a SPARQL grammar now is not the place
to spend the budget.

**Easy over an in-memory quad set.** The dataset is one model system's projection — small, fully
materialized, never streamed. That removes most of what makes a SPARQL engine hard.

- **BGP** — nested-loop join over the quad array with a binding environment. No cardinality
  estimation, no join ordering, no streaming. ~150 lines.
- **Graph scoping** — a graph predicate on the match step: default-graph query unions, `GRAPH <g>`
  restricts. ~20 lines, and one code path, which is where Comunica went wrong.
- **`FILTER` + comparison** — `src/engine/expr.ts` (145 lines) already evaluates guard expressions.
  SPARQL needs xsd-aware comparison on typed literals, which §5 wants anyway so a `FILTER` can see a
  quantity's dimension. ~80 lines on top.
- **`OPTIONAL`** — left join: evaluate the right side per left binding, emit unmatched rows with the
  variables unbound. Cheap because nothing streams. ~40 lines.
- **`ORDER BY` / `LIMIT` / `DISTINCT`** — sort and slice a materialized array. ~40 lines.
- **`GROUP BY` + `COUNT`/`MIN`/`MAX`/`SUM`** — group the rows by key, fold four accumulators.
  ~60 lines.
- **`ASK`** — BGP evaluation, then `rows.length > 0`.

**The interesting ones are the paths, and they are the cheapest of all here.** `p`, `^p`, `p/q` and
`p|q` rewrite to BGP, join and union before evaluation — ~60 lines of rewriting. `p+` and `p*` need
a fixpoint, and `src/engine/graph.ts` (610 lines) already does reachability and path enumeration
over an adjacency structure. The `+` path reuses it rather than reinventing it.

That reuse pays a second time, and it is the part worth noticing. §1 says SPARQL 1.1 dropped path
variables, so `mage:rel+` proves existence without binding the intermediates — the reason D3 ruled
SPARQL an interface rather than the foundation. A BFS over our own adjacency *has* the intermediates
in hand. A hand-written evaluator can return the path witness that `evidence` wants, where Comunica
structurally cannot. Adopting Comunica would have locked in `evidence: null` for every path query;
writing the evaluator does not.

**Rough total: 600–900 lines of new TypeScript** [inferred] over `sparqljs` and the existing
`graph.ts` and `expr.ts`. For scale, the whole workbench `src/` is 10,304 lines and `src/engine/` is
2,900 [measured]. Served cost: **+27 KB gzipped** for the parser [measured] plus a few KB for the
evaluator [inferred], against +273 KB at Comunica's minified floor.

The one thing the fallback owes that Comunica would have supplied free is **conformance confidence**.
Comunica runs the W3C SPARQL test suite; a hand-written evaluator does not. The mitigation is that
the subset runs to thirteen constructs, so §6's table covers it and should land as a test file
against whatever ends up evaluating. **With one condition, learned here: assert the row set, never
just the absence of an exception.** The first pass of that table reported 13 of 13 ok on an engine
that was answering `false` to a modelled fact. Adding the expected rows is what surfaced it.

---

## 8. Reproducing this

Scratch tree at `/tmp/q7-comunica-scratch` (ephemeral). To rebuild from scratch:

1. A directory outside any worktree, with its own `package.json`. Install `esbuild@0.25.12`,
   `@comunica/query-sparql-rdfjs`, `@comunica/query-sparql-rdfjs-lite`, `n3`, `sparqljs`,
   `playwright-core`. **Never install into `workbench/node_modules`** — in a multi-worktree session
   it is a symlink into the main checkout, so one install mutates every agent's tree.
2. Bundle with `build.mjs`'s settings: `bundle`, `format: "esm"`, `target: "es2022"`,
   `sourcemap: true`, default platform. For the `file://` scenario, `format: "iife"`.
3. Serve over http on a free port — 8080 and 8137 are taken on this machine; 8291 was used.
4. Drive Chrome with `playwright-core` (`channel: "chrome"`), a fresh context per run, reading
   `window.__result` after a fixed wait rather than `waitForFunction`.

The §6 defect needs none of that. One quad, two `ASK`s, plain Node, no bundler. Run as written and
verified to print `false` then `true`:

```js
import { QueryEngine } from "@comunica/query-sparql-rdfjs";
import { DataFactory, Store } from "n3";
const { namedNode: N, quad: Q } = DataFactory;
// Direction matters: the FORWARD branch is the dropped one, so the subject must be the quad's
// subject. Swap a and b and the surviving inverse branch answers correctly, hiding the bug.
const store = new Store([Q(N("urn:a"), N("urn:p"), N("urn:b"), N("urn:g"))]);
const e = new QueryEngine();
const pattern = "<urn:a> (<urn:p>|^<urn:p>) <urn:b>";
console.log(await e.queryBoolean(`ASK { GRAPH <urn:g> { ${pattern} } }`, { sources: [store] }));
// => false   WRONG: <urn:a> <urn:p> <urn:b> is in <urn:g>
console.log(await e.queryBoolean(`ASK FROM <urn:g> { ${pattern} }`, { sources: [store] }));
// => true    correct
```
