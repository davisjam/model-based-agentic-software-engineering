# Audit: the Workbench's own system-models — 261004

Commissioned question: are the Workbench's self-models well chosen, accompanied by suitable
invariants/properties, aligned with the code, and measurably covered per-model and per-property?
Audited at published tip `8cfd5c0f`. Every load-bearing claim below was verified by running the
gate or mutating the artifact, not by reading prose; mutations are marked **[mutation-proven]**
and the tree was restored clean after each.

**Gates re-run at this tree:** `tsc --noEmit` clean; node tier **921/921** pass (903 `.ts` + 18
`.mjs`, matches baseline); `check:parity` **0 violations over 26 capabilities**; smoke tier **3/3**
after `npm run build`. Browser (114) and a11y (112) tiers were NOT re-run — machine load from
concurrent agents makes the known `keyboard.test.mjs` debounce flake likely, and no finding below
depends on those tiers. That is the honest scope of "gates green."

---

## Verdicts, one per commissioned question

### Q1 — Are these the right models? MOSTLY, with one dead claim and one earned addition

The three-model decomposition — components (hand-written architecture constraint), affordances
(generated projection of the capability registry), example-coverage (generated capability×example
matrix) — is defensible and matches what the Workbench demonstrably is. The two generated models
are the right kind of artifact: derived, staleness-gated, and in example-coverage's case
self-asserting. The components model asks the right question; its problem is alignment (Q3), not
choice.

**"This is model (1) of the eight" is drift with no referent.**
`models/workbench-components.mage.yaml:3` is the only occurrence of "the eight" in the repo; the
phrase was present verbatim in the founding commit `a13084b3` (261002, "before any code exists")
and no enumeration of eight models exists in any tracked file, any design doc, or any commit
reachable from `--all`. (`DONE-phase-E.md:228` says "the eight example models," a different set:
example systems, which number three plus docable.) Verdict: a planned-set framing that was never
written down, now indistinguishable from a false census. If eight were ever intended, the built
ones are (1) components, (2) affordances, (3) example-coverage, and the natural unbuilt candidates
visible in the code are: a transaction/hypothesis lifecycle machine (below), a gate-reachability
model (currently derived inside `test/gate-reachability.test.ts`), an agent-surface coverage model
(currently a receipt from `test/browser/agent-coverage.test.mjs`), a requirements-coverage model
(Q2's prose-invariant → holder map), and a quantities model (judged correctly omitted, below). Do
not keep the phrase on faith — either declare the set where it can be judged (PLAN.md) or delete
the sentence.

**The no-state-machine hypothesis: one machine is genuinely missing; the rest are correctly
structural.** Tested against the code:

- The **transaction lifecycle** (`src/transaction/engine.ts` — explicitly state-bearing: "a mutable
  current pointer, two stacks"; propose → validate → commit/refuse against a base hash) composed
  with the **hypothesis branch** (`src/app/services.ts:160-213` — authoritative engine parked,
  separate engine per branch, dispose/commit) and the **shared human/agent workspace state**
  (SH-I5 dangling selection, SH-I6 mutation-never-navigates) is a real cross-component stateful
  system whose invariants are today pinned only point-wise by node tests. This is the one candidate
  where a machine self-model with behavior queries (`forall`/`invariant`, exists-reach for the
  refusal paths) would assert something no current single test states — e.g. "a disposed hypothesis
  never reaches the authoritative engine," "a stale-base transaction is refused in every
  interleaving." Recommend building it — because the lifecycle is dynamics-shaped, not because
  docable has machines.
- The **hypothesis lifecycle alone** (2–3 states) and the **outcome vocabulary**
  (`holds | refuted | inconclusive | unlicensed | exhausted`) do not earn machines: the first is
  held by types and the facade, the second is an enum, not a lifecycle.

**The no-quantitative-model hypothesis: correctly omitted — record it as reasoned.** The project
measures real quantities (bundle floor 51200 bytes asserted in `.github/workflows/pages.yml`, tier
counts, a11y durations) and MAGE now has the quantity construct (V27–V39, exercised by
document-processing). But the enforcement lives in CI shell assertions the workflow could not read
out of a model, so a quantities self-model would be a second source of truth with no consumer.
Omission is right until a gate can derive its threshold from the model; note it, don't build it.

**Modelled-but-unneeded check:** nothing qualifies. Affordances is the closest call (it asserts
nothing — Q2), but as a generated projection it is cheap, current, and the RDF/SPARQL tier and
docs read it. Keep.

### Q2 — Are the invariants/properties suitable? The queries present are good; the model that asserts nothing and the invariants that live only in prose are the gaps

The components model's 9 queries are well designed as written: four kernel-isolation reachability
assertions split so a failure names the edge, an engine≠yaml assertion, two mutation-authority
assertions, a **positive control** (`ui-can-reach-kernel`, guarding against vacuous pass on an
empty graph) and a **refusal control** (`transitive-mutation-is-unlicensed`). docable's 5 are the
pedagogical set and are verdict-pinned (Q4). example-coverage's 24 are generated, each carries
`expect`, and CI re-derives them through the engine. All conform to the §9j ruling (statements,
not questions) — `DESIGN-shell-261002.md:1200` landed; `src/app/properties.ts` holds the boundary.

**`workbench-affordances` has 44 entities, 81 edges, and zero queries — a model that cannot be
refuted.** Its faithfulness *to the registry* is held (byte-exact staleness gate,
`test/capabilities.test.ts:533-537`), and UX-I1 is enforced — but from the registry directly
(`scripts/check-parity.ts`, `affordanceParityGate()`), *beside* the model rather than through it.
Legitimate as a projection, but the fix is cheap and matches the example-coverage precedent:
have `generateAffordanceModel()` (`src/app/capabilities.ts`) also emit per-capability queries
(`exists` / `predecessors` over `afforded-by`, one per interface, `expect: holds` — exactly the
shape `gen-example-coverage.ts` emits). The model then asserts UX-I1 itself and the Q4 measure
covers it.

**Prose invariants vs model properties — the census.** Of the invariant families UX-I1…I9,
SH-I1…I8, EX-I1–3, FR-A11Y-1/3, FR-AGENT-1/2, MQ-I1/I2: **exactly one** is expressed through a
self-model (EX-I3, via example-coverage's queries). UX-I1 is enforced in code from the registry
(hard CI step) but not stated in any model. The SH-I family is pinned by the tests named in
`DESIGN-shell-261002.md:368-380`; MQ-I1/I2 by compiler brands + `test/engine-check.test.ts`
(`DESIGN-model-query-261002.md:593-594`); UX-I4/I7 by `src/ui/invariants.ts` checkers. These are
all *real* holders — the gap is not enforcement, it is that the model layer claims to be "the
architectural constraint the implementation answers to" while carrying none of these. That is
acceptable IF the models stop claiming otherwise (Q3's false-prose findings); a
requirements-coverage model (invariant → holder, generated the way example-coverage is) is the
principled close but is an earned addition, not a defect.

### Q3 — Alignment between models and code: THE central failure. The components model is enforced against itself, on the author's laptop, and against the code by nothing at all

What each model is actually held to, enumerated honestly:

| model | held to its generator | held to its own assertions | held to the code |
|---|---|---|---|
| workbench-components | n/a (hand-written) | `validate.py` `check_queries` (`validate.py:1536`) — **pre-push hook only** (`hooks/pre-push:32,194-196`), NOT CI | **nothing** |
| workbench-affordances | byte-exact regen gate, CI (`test/capabilities.test.ts:533`) | no assertions exist | transitively: registry→code via `check:parity` (CI), SH-I8 keyboard walk + agent-coverage gate (browser tier) |
| example-coverage | byte-exact regen gate, CI (`test/examples.test.ts:877`) | outcome===expect per query, CI (`test/examples.test.ts:893-902`), denominator derived | by construction — generated FROM the examples' loaded IR |

Three mutation experiments establish the components row:

1. **[mutation-proven] A `model-ir → ui` edge injected into the model file passes the entire CI
   gate set.** `npm test` (the exact command `.github/workflows/pages.yml:73-97` runs): exit 0,
   921/921. The `QUERY` expect-mismatch finding is declared Python-only ASYMMETRIC
   (`test/parity.test.ts:79`) and `inParity` filters it from the cleanliness assertion
   (`test/parity.test.ts:150,183`); the answers-comparison holds TS≡Python but never compares
   either against `expect`. Only `validate.py --self-test` (pre-push, author's laptop) went red.
   The founding commit's title ("make the architecture invariant a CI gate") is not true of
   today's CI.
2. **[mutation-proven] A real kernel→UI **code** import — `import { checkPurposeVisibility } from
   "../ui/invariants.ts"` added to `src/ir/types.ts` — passes everything everywhere:** `tsc`
   clean, node tier 921/921, `validate.py --self-test` PASS, model validates clean. The model's
   queries evaluate the model's *declared* relations; no gate derives the import graph from
   `src/`. The claim in `src/ir/types.ts:4-6` ("That is enforced by
   `workbench-components.mage.yaml`, whose asserted queries fail the build if the kernel grows a
   dependency on a view") is false on both halves; so is its twin at `src/engine/types.ts:4-6`.
3. **`validate.py --queries` never existed.** Absent from today's argparse (`validate.py:1817-1820`:
   `path`, `--self-test`, `--json`) and absent from the founding commit's
   (`a13084b3:workbench/validate.py:509-510`). The header claim
   (`models/workbench-components.mage.yaml:4`) was born false.

**And the model has drifted from the code it was supposed to constrain.** The model's `absence`
clause is explicit ("an edge that is not drawn here is an edge the implementation may not
create"). Against today's imports, for the nine *modeled* entities alone:

- `analysis-worker` is declared to depend only on `query-engine`
  (`workbench-components.mage.yaml:143`). Actually: `src/worker/analysis.worker.ts:20` imports
  `../yaml/document.ts` (the YAML adapter — the exact adjacency `engine-must-not-reach-yaml`
  exists to forbid near analysis), `:27` imports `../rdf/project.ts`, `:28` `../sparql/index.ts`;
  `src/worker/port.ts:29` imports `../app/ports.ts`.
- `ui` has no declared edge to `query-engine`; `src/ui/main.ts:23` imports `runQuery` from
  `../engine/index.ts` and `src/ui/view-model.ts:28-29` imports `../transaction/types.ts`.
- The prose on `ui` ("nothing depends on it", `workbench-components.mage.yaml:118`) is
  contradicted by `src/app/capabilities.ts:33` (type-import of `../ui/shell/surfaces.ts` — a type
  reference IS a dependency by the model's own `depends-on` definition, `:25-27`) and
  `src/learn/main.ts:23` (value import of `../ui/render-dom.ts`).
- Six of today's thirteen `src/` modules have no entity at all: `app` (the services facade and
  capability registry — the architectural center of the shell), `transaction`, `learn`, `rdf`,
  `sparql`, `quant`.
- `engine` and `quant` import each other (`src/engine/index.ts:25`, `src/engine/check.ts:41-42`,
  `src/engine/model-types.ts:48` ↔ `src/quant/*.ts`) — legal only if `quant` is declared part of
  the `query-engine` component; at module granularity it violates `depends-on`'s `acyclic: true`.
- The mutation-authority story predates the transaction engine: the model names `yaml-adapter` as
  sole IR mutator (`:146-149`), while as built the committed-system swap runs through
  `TransactionEngine` (`src/transaction/engine.ts`) behind the facade.

None of this says the code is wrong — the code may well have evolved legitimately. It says the
model and code have no join, so neither can correct the other. The notation already has the join
point: docable demonstrates per-entity `provenance.subject.ref` with a `correspondence` record
(`examples/docable.mage.yaml:79-86`); the components model uses none of it.

### Q4 — Per-model, per-property coverage measure: none exists today; here is the measure, its definition, and its first run

No artifact measures, per model and per property, whether a test would fail if the property's
verdict changed. Today's "coverage" artifacts measure different axes: example-coverage measures
example→capability; the agent-coverage gate measures drives→advertised operations. The first-run
table below was produced manually with the strong definition, grounded by mutation where marked;
the design for the durable measure follows.

**Definition of covered (strong form):** a property P in model M is covered iff some gate that a
protected landing path actually runs fails when P's verdict changes. "A test mentions the id" does
not qualify. Where only the weak form holds I say so.

**First run — per model:**

| model | properties | covered (CI) | covered (pre-push only) | uncovered | code-alignment |
|---|---|---|---|---|---|
| workbench-components | 9 | **0/9** | 9/9 (`validate.py`, hooks/pre-push:32,194) | — | **0/9** [mutation-proven] |
| workbench-affordances | 0 | n/a — nothing assertable | — | — | via registry gates, not via model |
| example-coverage | 24 | **24/24** (`examples.test.ts:877,893`) | — | — | by construction (generated from examples) |
| docable (exemplar) | 5 | **5/5** (hand-pinned literals) | — | — | n/a (models a fictional system; correspondence `asserted` only) |

**Per-property, workbench-components (9):** `kernel-must-not-reach-ui`, `-renderer`, `-yaml`,
`-agent`, `engine-must-not-reach-yaml`, `renderer-must-not-mutate-ir`, `agent-must-not-mutate-ir`,
`ui-can-reach-kernel`, `transitive-mutation-is-unlicensed` — all nine: evaluated vs `expect` by
`validate.py:1536` on the pre-push path only; in CI the verdict is compared TS-vs-Python
(`test/parity.test.ts:186-230`) but never against `expect`, so a verdict change where both tools
agree passes CI [mutation-proven: injected kernel→ui edge, `npm test` exit 0]. A deliberate-violation
negative control exists for `kernel-must-not-reach-ui` only (`validate.py:1738-1747`); the other
eight have none.

**Per-property, docable (5):** `publish-requires-review` — `test/engine-behavior.test.ts:16`
[mutation-proven: added a `waiting→published` shortcut transition; test went red];
`processing-implies-custody` — `engine-behavior.test.ts:38` (+ narration pin
`engine-narrate.test.ts:14`); `document-can-return-to-waiting` — `engine-behavior.test.ts:58`;
`transitive-ownership` — `engine-graph.test.ts:16` (unlicensed outcome pinned);
`restricted-reaches-public` — `engine-graph.test.ts:231`. All five CI-covered, **but by hand-kept
literals**: the denominator is not derived, so a sixth query added to docable would be silently
unpinned, and docable's queries carry no `expect:` in the model itself (the §9j polarity incident —
`DESIGN-shell-261002.md:1226-1238` — is what co-located statement+verdict prevents).

**Per-property, example-coverage (24):** every `exercised-by.*` / gap query: covered by
`examples.test.ts:893-902` (outcome===expect, denominator derived by iterating
`ws.state.system.queries`, every query required to carry `expect`), upstream of which the byte-exact
regen gate (`:877-880`) catches any drift between committed model and the examples' reality. This
is the strongest pattern in the repo and the one to generalize.

**Per-property, workbench-affordances (0):** vacuous — the Q2 fix gives it properties; until then
the model contributes nothing to this table by construction.

**The durable measure — design (not implemented; see "what I chose" below).** One node-tier test,
`test/model-coverage.test.ts`, following the two precedents the repo already trusts
(`check-parity.ts`: derive the denominator from the registry; `agent-coverage.test.mjs`: derived
denominator + capped, reasoned exemptions + negative control):

1. **Denominator derived:** `git ls-files '*.mage.yaml'` minus the three example systems (whose
   verdicts are owned by `expected-results.yaml` + `examples.test.ts`). Today that yields the three
   self-models + docable; a fourth self-model joins by landing, not by being remembered.
2. **Per property:** every saved query in each file MUST either carry `expect:` — in which case the
   test loads the model through `Workspace` and asserts `outcome === expect` (the
   `examples.test.ts:893` pattern verbatim; for graph queries parity already holds the engine equal
   to `validate.py`, so this simultaneously closes the CI gap in Q3 finding 1) — or appear in an
   exemption map with a reason string, count capped by a named ceiling (the agent-coverage
   exemption discipline).
3. **Reporting:** emit the per-model/per-property table (covered / exempt / verdict) as the test's
   receipt, the way `agent-coverage` writes `wb-agent-coverage-receipt.json` — the table IS the
   measure, regenerated every run.
4. **Negative control:** feed a literal model text with a flipped `expect` and assert the gate
   reports the mismatch — a check that can only pass is not a check.
5. **What it still cannot see,** stated so the number is honest: it proves verdict-sensitivity of
   the *model's own* queries; it does NOT prove the model corresponds to the code. That is the
   separate import-graph gate (gap table #1) — do not let this test's green be read as alignment.

**What I chose and why:** the brief permitted implementing the measure. I measured manually with
mutations instead, because the audit's value is the verified gap list and first-run numbers — which
mutation runs already made real — while landing a new test file to this project's conventions mid
seven-wave day from an audit worktree risks convention drift the implementing agent would then own.
The design above plus the table is sufficient to implement without re-derivation.

---

## Ranked gap table

Ranked by consequence. Each row is actionable without re-deriving the analysis.

| # | TAG | Gap | Where | Why it matters | Smallest sound fix |
|---|---|---|---|---|---|
| 1 | [LINT] | No gate derives the `src/` import graph and checks it against the components model — a real kernel→UI import passes tsc, all 921 node tests, parity, and `validate.py --self-test` [mutation-proven] | `src/ir/types.ts` (mutation site); no checker exists anywhere | The model's entire reason to exist ("EVERYTHING DEPENDS INWARD") is enforced against nothing; the model checks itself against itself | New node-tier test: add `provenance.subject.ref: src/<dir>` per entity to the model (docable's own pattern, `examples/docable.mage.yaml:79-86`); scan `src/**/*.ts` import specifiers (static `import ... from "../X/"` — both value and `import type`, per the model's `depends-on` definition at `:25-27`); map file→entity via the provenance refs; assert observed edge-set ⊆ declared `depends-on` edges and kernel out-degree 0; negative-control with a fixture source containing a smuggled import. Fold in the Q3 drift rows (gap 3) first or the gate lands red |
| 2 | [FIX] | The components model's `expect:` assertions are not evaluated by any CI gate — model-edit violating them keeps CI green [mutation-proven]; enforcement lives only in the author's pre-push hook | `test/parity.test.ts:79,150,183` (QUERY filtered); `.github/workflows/pages.yml:73-97` (no `validate.py` failing invocation); `hooks/pre-push:32,194-196` (the only holder) | The one architectural invariant gate runs only where the hostile commit path can skip it; CI's green is weaker than the laptop's | One node test: for every tracked `*.mage.yaml` query carrying `expect`, evaluate through `Workspace` and assert `outcome === expect` (generalize `test/examples.test.ts:893-902`). This is also step 2 of the Q4 measure — implement them as one test |
| 3 | [FIX] | Components model drifted from code: `analysis-worker` declared → `query-engine` only, actually imports yaml/rdf/sparql/app; `ui` has undeclared edges to engine and transaction; "nothing depends on ui" false (app, learn do); 6 of 13 src modules unmodeled (app, transaction, learn, rdf, sparql, quant); engine↔quant cycle vs `acyclic: true`; `yaml-adapter` sole-mutator claim predates `TransactionEngine` | `models/workbench-components.mage.yaml:118,131-149` vs `src/worker/analysis.worker.ts:20,27,28`, `src/worker/port.ts:29`, `src/ui/main.ts:23`, `src/ui/view-model.ts:28`, `src/app/capabilities.ts:33`, `src/learn/main.ts:23`, `src/engine/index.ts:25` | Until the model matches as-built reality, gap 1's gate cannot land, and every reader of the model is misinformed about the architecture | Re-found the model from today's imports: add entities for app/transaction/learn/rdf/sparql (decide quant ⊂ query-engine explicitly via `contains:` or its own entity), redraw `depends-on` from the observed graph, re-derive which absences are still asserted (kernel isolation survives: `src/ir` imports nothing — verified), update the `may_mutate` story to the transaction path. Keep the four kernel queries, positive control, refusal control; re-point `engine-must-not-reach-yaml` and decide whether worker→yaml is architecture or violation — **that decision is the author's, flag at review** |
| 4 | [FIX] | False self-descriptions: model header claims enforcement by a flag that never existed and "in CI" which is false; two src headers claim the model "fails the build" which mutation disproved | `models/workbench-components.mage.yaml:3-4` ("model (1) of the eight", "`validate.py --queries` enforces it in CI"); `src/ir/types.ts:4-6`; `src/engine/types.ts:4-6` (also "imports the kernel and nothing else" — false, engine imports quant) | A model asserting its own enforcement in prose while the mechanism does not exist is exactly the brochure class this project refuses; three instances, same class | Rewrite the three headers to name the real mechanism once gaps 1–2 land (until then: "pre-push `validate.py`"); delete or substantiate "the eight" (enumerate in PLAN.md or drop); fix engine/types.ts's import claim to name quant |
| 5 | [DESIGN] | docable's 5 queries carry no `expect:`; verdicts pinned only by hand literals in engine tests — denominator not derived, a 6th query would go silently unpinned | `examples/docable.mage.yaml:236-297`; pins at `test/engine-behavior.test.ts:16,38,58`, `test/engine-graph.test.ts:16,231` | The structural exemplar does not demonstrate the verdict-pinning pattern; §9j showed what co-located statement+verdict catches (two inverted polarities) | Add `expect:` to all five queries (refuted/refuted/holds/unlicensed/holds per current pinned verdicts — re-derive at implementation, do not trust this table); gap 2's test then covers them with a derived denominator. The engine-test literals stay — they pin evidence shape, not just verdicts |
| 6 | [FIX] | workbench-affordances: 44 entities, 0 queries — cannot be refuted; UX-I1 enforced beside the model, not through it | `models/workbench-affordances.mage.yaml` (no `queries:`); enforcement at `scripts/check-parity.ts` + `src/app/capabilities.ts` `affordanceParityGate()` | A model that asserts nothing is decoration by this project's own standard; the fix is mechanical and the precedent (example-coverage's generated queries) is in-repo | Extend `generateAffordanceModel()` to emit per-capability queries: `exists`/`predecessors` over `afforded-by` per interface, `expect: holds` (the `gen-example-coverage.ts` shape); staleness gate already in place; gap 2's test then runs them |
| 7 | [DESIGN] | No machine in any self-model while the transaction×hypothesis×workspace shared-state contract is a genuine cross-component stateful lifecycle pinned only point-wise | `src/transaction/engine.ts` (state-bearing), `src/app/services.ts:160-213` (hypothesis branch), SH-I5/I6 (`DESIGN-shell-261002.md:370-380`), FR-AGENT-2 | Behavior queries could assert interleaving-level claims ("a disposed hypothesis never reaches the authoritative engine") no single current test states; this is the dynamics-shaped gap, and the one place a machine is justified by the code rather than by docable's example | New self-model with 2–3 machines (transaction, hypothesis, workspace-view) + behavior queries with `expect:`; covered by gap 2's test; hold to code initially by `provenance.correspondence: asserted` with checked date — a machine↔code gate is out of scope and should not block the model |
| 8 | [AUDIT] | Prose-invariant census: of UX-I1…I9, SH-I1…I8, EX-I1-3, FR-A11Y, FR-AGENT, MQ-I1/I2, only EX-I3 is expressed through a self-model; the rest live in prose + tests | census in Q2 above; holders at `DESIGN-shell-261002.md:368-380`, `DESIGN-model-query-261002.md:593-594`, `src/ui/invariants.ts` | The holders are real, so this is a recorded fact, not a defect — it becomes a defect only if the model layer keeps claiming to be the constraint surface (gap 4 fixes the claims) | No action beyond gap 4, unless the author wants a generated requirements-coverage model (invariant → holder → tier), which would be built on the example-coverage pattern. Author's call |
| 9 | [FIX] | Stale doc rows describing the pre-dagre state | `PLAN.md:255` ("Layout \| ELK.js"); `DONE-phase-E.md:220-245` recommends adopting ELK (historical record, superseded by `@dagrejs/dagre` landing, commits `05df440d`/`1b74d89c`) | PLAN.md is current-facing; an implementing agent reading it would re-litigate a settled decision | Update the PLAN.md row to dagre-as-landed; add a one-line superseded note at the top of DONE-phase-E's ELK section (it is a dated record — annotate, don't rewrite) |
| 10 | [AUDIT] | Quantities deliberately unmodeled — record the reasoning so it reads as a decision, not an omission | bundle floor at `.github/workflows/pages.yml:95-96`; quantity construct V27-V39 | Prevents a future wave from "completing" a quantities self-model nobody can consume | One paragraph in the models' README-of-record (or PLAN.md): quantities stay in CI assertions until a gate can derive thresholds from a model; revisit if that seam appears |

Gaps 1+2 compose into one implementing wave (the model-coverage test + the import-graph gate share
the provenance-ref groundwork); gap 3 must land before gap 1's gate can go green.

## Where the brief's stated ground truth was wrong or understated

- **Baselines:** the brief said node 900, browser 69. At this tree the node tier is **921** (the
  dispatch message's corrected figures — 921 node, 114 browser — match what I observed for node;
  browser/a11y not re-run, see scope note).
- **The measured shape table (entities/models/machines/queries) is exactly right** — re-derived by
  loader: 5/2/2/5, 9/1/0/9, 44/1/0/0, 27/1/0/24.
- **Understated:** "validate.py validates query well-formedness (V20…)" — `validate.py` does more:
  `check_queries` (`validate.py:1536`) *evaluates* every graph query carrying `expect` and emits a
  failing `QUERY` finding on mismatch, and `--self-test` additionally injects a kernel→ui edge and
  asserts the catch (`validate.py:1738-1747`). The enforcement exists and works; it is *reachable
  only from the pre-push hook*. Likewise `test/parity.test.ts` does more than load the model as a
  fixture — it compares query ANSWERS TS-vs-Python (`:186-230`). The brief's core distinction
  (parses/well-formed ≠ corresponds-to-code) stands and is where the findings are; the middle tier
  (self-consistent under its own expects) exists too, and is laptop-only.
- **Both offered leads verified true, each sharper than stated:** "the eight" has no referent
  anywhere in history (not merely "never enumerated" — the founding commit carried it with no
  backing then either); `--queries` is absent from today's argparse AND from the founding commit's
  (`a13084b3:workbench/validate.py:509-510`) — the claim was born false, not drifted false.
