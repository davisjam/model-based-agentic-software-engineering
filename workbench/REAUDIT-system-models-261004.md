# Re-audit: the Workbench's self-models after the six waves — 261004

Commissioned question: the first audit (`AUDIT-system-models-261004.md`) found ten gaps, three
mutation-proven; six waves then reported all ten closed. This re-audit was asked for the thing the
first audit did not give: **a verdict** — certify the self-model layer, or refuse to, re-deriving
everything from the code and the artifacts rather than from the waves' reports.

Audited at published tip `a175d438`. Method: the predecessor's two mutations re-run verbatim, plus
seven invented mutations the implementers did not author gates against. Every mutation was applied
to the real tree, the real gates were run, and the tree was restored clean after each (verified by
`git status` each time; final tree clean at commit).

**Gates re-run at this tree (the honest scope of "gates green"):** `tsc --noEmit` clean; node tier
**935/935, 0 skipped** (matches baseline); `check:parity` **0 violations over 26 capabilities**;
`npm run build` + smoke **3/3**; `python3 validate.py models/workbench-components.mage.yaml` clean
(13 asserted queries evaluated); `validate.py --self-test` exit 0. Browser (114) and a11y (112)
tiers were NOT re-run — concurrent-agent machine load makes the known debounce flake likely, and no
finding below depends on those tiers.

---

## The mutation table

"Previously" = the state the first audit measured (gap 1/2: both mutations passed everything).
Restored clean after every row.

| # | Mutation | Previously | Now | Which gate caught it | Does the message name the problem? |
|---|---|---|---|---|---|
| M1 | `model-ir → ui` edge injected into the model | exit 0, 921/921 | **6 node tests fail**; `validate.py` exit 1 | `test/import-graph.test.ts` (declared-edge-nothing-creates + kernel-spine-dropped), engine V8 acyclic finding surfacing through `test/model-coverage.test.ts`, `validate.py` `QUERY` findings | YES — names the edge id, the absence clause, the spine sentence, and the V8 cycle path |
| M2 | real `import { checkPurposeVisibility } from "../ui/invariants.ts"` in `src/ir/types.ts` | passed tsc, node tier, `--self-test`, model validation | **3 node tests fail** | `test/import-graph.test.ts` | YES — "`model-ir → ui` is an import the components model does not declare … Witnessed at src/ir/types.ts:1 (import) ../ui/invariants.ts", plus the kernel-spine finding. (Incidental: the *unused* import now also trips tsc TS6133; a used one would not — see M4.) |
| M3 | dynamic `import("../ui/main.ts")` with a literal specifier, in the kernel | n/a (invented) | caught, 3 node tests fail | `test/import-graph.test.ts` | YES — witness labeled `(dynamic import)` with file:line |
| M4 | kernel→UI **type** import via a tsconfig `paths` alias (`#view/*` → `src/ui/*`), tsc-clean and used | n/a (invented) | **SLIPS** — tsc 0, node tier 935/935, `validate.py` 0 | **nothing** | — |
| M5 | consistent both-sides edit on an **unqueried** pair: real `src/render → src/sparql` import AND a `rend-sparql` edge declared, one commit | n/a (invented) | **SLIPS** — tsc 0, 935/935, `validate.py` 0 | **nothing** | — |
| M6 | `contains:` laundering: `contains: [ui]` added to `app-services`, the now-self-edge `ui-app` row deleted, real `src/app → src/ui` type import added | n/a (invented) | CI goes red (1 test), but **by accident** | the import-graph negative-control test — its hard-coded literal `model-ir → ui` now reads `model-ir → app-services` under the lift | **NO** — the primary real-tree assertion PASSED with the laundered import present; the failure message blames the control itself, and the plausible "fix" (update the control's literals) would land the laundering green |
| M7 | entity deleted (`shell-surfaces` + its two edges + entities-list row) | n/a (invented) | caught, 3 node tests fail | `test/import-graph.test.ts` | YES — files re-route to `ui`, surfacing undeclared `app-services → ui` with the capabilities.ts:33 witness |
| M8 | `provenance.subject.ref` aimed at the wrong file (`worker-wiring`: port.ts → protocol.ts) | n/a (invented) | caught, 3 tests, **8 distinct findings** | `test/import-graph.test.ts` | YES — misattributed edges reported in both directions, plus the pinned join assertions |
| M9a | mutation authority emptied (`tx-mut-ir` row deleted) | would have passed CI before the positive control landed | caught | `test/model-coverage.test.ts` + `validate.py` exit 1 | YES — "`…#transaction-engine-is-the-mutator` expects 'holds' and answered 'refuted'" |
| M9b | docable `publish-requires-review` expect flipped refuted→holds | silent before docable carried `expect:` | caught | `test/model-coverage.test.ts` | YES — names query and both verdicts |
| M9c | one `afforded-by` relation deleted from the affordances model | silent before the model carried queries | caught **twice** | `test/model-coverage.test.ts` (unmet `afforded-by.machine.import`) + the byte-exact regen gate in `test/capabilities.test.ts` | YES |
| M10 | re-export laundering: `src/transaction/parse.ts` re-exports `MageDocument` from the YAML adapter (tx→yaml declared), `src/ui/main.ts` imports it from transaction (ui→tx declared) | n/a (invented) | **SLIPS** — tsc 0, 935/935, `validate.py` 0; the UI now holds the whole parse class as a value | **nothing** | — |
| M11 | consistent both-sides edit on a **queried** pair: `query-engine → yaml-adapter` declared AND imported | n/a (invented) | caught | `test/model-coverage.test.ts` + `validate.py` exit 1 | YES — "`…#engine-must-not-reach-yaml` expects 'refuted' and answered 'holds'" |

## The mutations that still slip, and what each means

**M4 — the resolution-config channel.** `test/import-graph.test.ts:482` treats every non-relative
specifier as "a bare package specifier: not a component of this system" — silently, and the
assumption is editable. Add `"baseUrl": "."` + `"paths": { "#view/*": ["src/ui/*"] }` to
tsconfig.json and the kernel imports the UI through `#view/invariants.ts` with every gate green and
tsc clean. The model's own `depends-on` definition says "a type-only import counts"; this one
doesn't get counted. Nothing gates tsconfig.json or a future package.json `"imports"` map (which
would extend the channel to value imports node and esbuild both resolve). The gate's header says
"a scanner's coverage is its whole worth" and enumerates NOT-COVERED cases honestly — but this
channel is not on the list.

**M5 — consistency is enforced; architecture review is not.** A real import plus its declared edge,
landed in one commit on a pair no query prohibits, passes everything silently. For QUERIED pairs
M11 shows the defense-in-depth works (the query goes unmet even though observed≡declared). But the
13 queries cover a handful of the ~240 possible ordered pairs; for the rest, the model is the
authority and editing it is unreviewed by any machine. This is arguably by design — the gate's own
finding text offers "an architecture decision to make and draw" — but nothing distinguishes a ruled
edge from a smuggled one. The 261004 re-founding marked its decisions "author's ruling"; a future
agent's widening carries no such mark and no gate asks for one.

**M6 — containment is semantically unguarded.** `contains:` edits collapse the boundary between two
entities: after `contains: [ui]` under `app-services`, every app→ui import is "internal to one
component and checked against nothing." The primary gate passed with exactly that laundered import
present. CI did go red — but only because a negative control hard-codes the strings `model-ir → ui`
and `model-ir → renderer`, which the lift renamed; the message says the control is broken, not that
containment moved, and updating those literals is the natural wrong fix. The only structural check
on `contains` today is `contained.size > 0` (`import-graph.test.ts:712`). The model's own
justification for the one real containment — "`src/quant/` has exactly ONE importer in the whole
tree" — is prose; the sole-importer condition is checked by nothing.

**M10 — value-flow blindness, and a model sentence that overclaims.** The UI acquired the complete
YAML parse path through a one-line re-export in a sanctioned intermediary. `ui-must-not-import-yaml`
is `form: direct` over declared edges; the observed edges (ui→tx, tx→yaml) are both declared; no
gate reasons about what VALUE flows across an edge. This is an inherent limit of a
component-granularity dependency model — but the model's prose claims more than the granularity can
hold: "the view holds no second parse path: the export control gets its text from the facade, so a
formatting decision cannot be made in the shell" (`workbench-components.mage.yaml:522-527`). After
M10 a formatting decision CAN be made in the shell and every gate is green. The repo already owns
the right tool for this class: `test/worker.test.ts` asserts over a module's own bytes.

---

## The four verdicts

### Q1 — Are these the right models? **SOUND WITH NAMED RESERVATIONS**

Three self-models (components hand-written + checked; affordances and example-coverage generated +
staleness-gated) plus docable as structural exemplar. The "model (1) of the eight" phantom is gone
(`grep` finds no occurrence in any tracked file). PLAN.md §0.2a now records both omissions as
reasoned decisions, verbatim in the predecessor's terms: quantities stay in CI assertions until a
gate can derive a threshold from a model (I re-checked the premise — the bundle floor still lives in
`.github/workflows/pages.yml` shell assertions with no model consumer; the omission remains right);
the transaction×hypothesis×workspace machine is "earned … awaiting a ruling on the model set."
Reservations: (1) that machine model is the one genuinely dynamics-shaped contract still outside the
model layer, and "awaiting a ruling" has no owner or date — it will rot into a permanent omission
unless the ruling is actually sought; (2) the model set is now defensible, but Q2's residue (below)
is what bounds how much the set can claim.

### Q2 — Are the invariants/properties suitable? **SOUND WITH NAMED RESERVATIONS**

The ones present are good, and measurably so: components carries 13 (four kernel prohibitions that
name the edge on failure, the direct-form mutation-authority set, a positive control, the
`transaction-engine-is-the-mutator` positive control whose absence M9a proves would matter, and a
refusal control); affordances went 0 → 80 generated queries, so **UX-I1 is now expressed through a
self-model and evaluated in CI** (M9c), which moves the predecessor's census from "only EX-I3" to
"EX-I3 + UX-I1"; docable's 5 carry measured `expect:` (M9b). M11 proves the query layer is real
defense-in-depth: a queried pair survives even a consistent both-sides edit. Reservations: (1) the
rest of the prose-invariant census (SH-I1…I8, MQ-I1/I2, FR-A11Y, FR-AGENT, UX-I2…I9) is unchanged —
still held by tests and code, not models. That is acceptable now because the models no longer claim
to be the sole constraint surface, but it remains a recorded fact, not a closed question. (2) One
invariant is stated weaker than its prose: `ui-must-not-import-yaml` asserts the direct edge while
its comment claims "no second parse path" — M10 drives a parse path through the gap between those
two statements.

### Q3 — Model↔code alignment, the first audit's central failure. **SOUND WITH NAMED RESERVATIONS**

Closed for the channel it models, and genuinely: both predecessor mutations now fail loudly with
messages that name the edge, the witness file:line, the absence clause, and the kernel spine (M1,
M2). The gate holds both directions (M1's stale declared edge), derives the kernel rather than
naming it, holds the spine against the OBSERVED graph (so the model-and-code-together kernel edit
fails — verified by the gate's own in-memory control), and the join is total both ways (M7 entity
deletion and M8 ref-typo both caught, M8 with findings in both directions). The 16 entities carry
`provenance.subject.ref`; the observed and declared sets are equal at this tree. Reservations, in
rank order: the **M4 alias channel** (the scanner's universe of discourse — "relative specifiers
only" — is an unstated, config-editable assumption), **M6 containment** (an unguarded model edit
collapses the boundary the gate checks against), and **M10 value-flow** (inherent granularity limit,
currently overclaimed by model prose). None of the three is the predecessor's failure mode — the
model is no longer "enforced against itself, on the author's laptop" — but all three are ways the
closed loop can be reopened without any gate naming what happened.

### Q4 — Per-model/per-property coverage. **SOUND**

The measure exists (`test/model-coverage.test.ts`), the denominator is derived (`git ls-files`
cross-checked against a disk walk of `models/`; exclusions carry in-file evidence strings), the
exemption map is empty with a ceiling of 0, and the receipt carries the claim AND its limit ("This
does NOT prove any model corresponds to the code…") so the number travels with its bound. First-run
table re-derived at this tree: docable 5/5, example-coverage 24/24, affordances 80/80, components
13/13 — 122 queries, all asserted, all met, 0 exempt. "Covered" means what it says: I flipped
verdicts in all four subject models by four different routes (model edge M1, relation deletion M9a,
expect flip M9b, generated-relation deletion M9c) and the gate went red each time, naming the query
and both verdicts. The negative control drives a flipped `expect` through the real engine, not a
hand-made report. The one scope note (not a defect): the measure is per-QUERY, and "property" =
"saved query with expect" — it does not map queries to the prose-invariant families of Q2, so its
green says nothing about SH-I5 and was never claimed to.

## The `src/ir/types.ts` "three gates" claim — tested

The file's enforcement claim is in its third state in one day (false → honestly-absent → three
gates). As literally written, each of the three named mechanisms exists and fires: model-coverage
answers the kernel queries in CI (M1), `validate.py` answers them independently and `--self-test`
exits 0 / catches the injected edge, wired at `hooks/pre-push:194-205` (pre-push only, as the header
says), and import-graph fails on an import added to the module (M2, M3). **But its last sentence —
"An import added here now goes red" — is overbroad, and M4 is the counterexample:** an aliased,
used, type-only import added to exactly that file stayed green everywhere. The claim is true for
every relative-specifier import, which is every import the tree currently contains; it is not true
of the construct "an import added here." A file that has been burned twice for enforcement prose
should state the bound the way the coverage receipt does.

---

## Verdict

**CERTIFIED, WITH THE FOLLOWING EXPLICIT BOUNDS.** The self-model layer is sound in the sense the
commission defines: the models are well chosen and their omissions reasoned and recorded; the
invariants present are worth asserting and are verdict-pinned; the model↔code loop that was the
first audit's central failure is closed for the import graph as scanned, in both directions, with
failure messages a stranger can act on; and the coverage measure is derived, zero-exempt, and
mutation-verified in all four models. The predecessor's two defeating mutations now fail 6 and 3
gates respectively, with the problem named.

**What this certification does NOT cover:**

1. **Imports that do not use relative specifiers.** A tsconfig `paths` alias (or a future
   package.json `imports` map) carries a real dependency past every gate (M4). Until that channel is
   gated or declared impossible, "the kernel's out-degree is zero" means "zero over relative
   specifiers under the current resolution config."
2. **The goodness of declared architecture.** Gates enforce model↔code consistency and the 13
   asserted properties; a consistent both-sides widening on any unqueried pair lands silently (M5).
   Certification covers the mechanism, not future unreviewed model edits.
3. **Containment edits.** `contains:` can merge two entities' checking domains with no gate naming
   the move; the one red M6 produced was accidental and misattributed. The quant containment's
   sole-importer justification is unchecked prose.
4. **Value flow.** The model speaks at edge granularity; a re-export through a sanctioned
   intermediary moves a prohibited capability into the view with everything green (M10), and one
   model comment currently promises more than edge granularity can hold.
5. **Tiers not run:** browser (114) and a11y (112) — this certification is of the self-model layer,
   whose gates live in the node tier, parity, and validate.py, all run here.

## Ranked follow-up gaps (none blocks certification; each bounds it)

| # | TAG | Gap | Where | Why it matters | Smallest sound fix |
|---|---|---|---|---|---|
| 1 | [LINT] | Non-relative-specifier channel unguarded: tsconfig `paths`/`baseUrl` (and package.json `imports`) can smuggle a dependency past the import-graph gate [mutation-proven, M4] | `test/import-graph.test.ts:482` (silent bare-specifier skip); `tsconfig.json` (ungated) | Defeats the gate's whole claim with a two-line config edit; the kernel imported the UI with 935/935 green | In the import-graph gate: assert tsconfig.json declares no `paths`/`baseUrl` and package.json no `imports` map (evidence-string style, like `OUTSIDE_ROOT`), so enabling aliasing fails the gate until the scanner learns to resolve it; add the channel to the header's NOT-COVERED list either way |
| 2 | [FIX] | `contains:` edits are unguarded; M6's catch was a control literal by accident, with a message that indicts the control | `test/import-graph.test.ts:712` (only `contained.size > 0`); `models/workbench-components.mage.yaml:192` | A one-line model edit merges two entities' checking domains; the natural fix for the red it happens to cause would bury the laundering | Pin the contains set the way the kernel is derived: assert the model's own justification mechanically (every contained entity's code is imported by exactly one other entity's code — the sole-importer predicate, computed from the observed graph), so a new `contains:` must satisfy the stated rule or fail with containment named |
| 3 | [FIX] | `src/ir/types.ts:12` "An import added here now goes red" — overbroad, falsified by M4; third enforcement-claim revision in one day | `src/ir/types.ts:4-12` | The exact claim class this project keeps getting burned by, on the file with the worst history of it | Bound the sentence: "a relative-specifier import added here now goes red; the gate does not resolve path aliases" (or land gap 1 and keep the sentence true) |
| 4 | [FIX] | "The view holds no second parse path" overclaims: re-export laundering puts `MageDocument` in the UI with all gates green [mutation-proven, M10] | `models/workbench-components.mage.yaml:522-527`; no byte-level check on `src/ui` | The model prose promises a value-flow property; the gates hold an edge property | Either bound the comment to what `form: direct` checks, or add a `test/worker.test.ts`-style byte assertion: no file outside `src/yaml`+sanctioned consumers re-exports a yaml-adapter symbol |
| 5 | [PROCESS] | Unqueried-pair model edits (M5) are consistent-but-unreviewed; ruled edges and smuggled edges are indistinguishable | model `relations:` block | The re-founding marked decisions "author's ruling"; nothing holds future widenings to that discipline | Author's call: a CODEOWNERS-style review pin on the model file, or a gate asserting each `depends-on` row carries a comment/provenance tag — cheap, but it is review discipline, not mechanism, and may be declined |
| 6 | [DESIGN] | The earned machine model (transaction×hypothesis×workspace) is "awaiting a ruling" with no owner | `PLAN.md:113-119` | An undated deferral rots into a permanent omission; the predecessor judged this the one dynamics-shaped gap | Put the ruling in front of the author once; record accept-or-decline in §0.2a with a date, either way |

## Where this brief's stated ground truth was wrong or understated

- **Baselines verified exact where run:** node **935/935, 0 skipped**; parity 0/26; smoke 3/3;
  `validate.py` clean; 122 model-coverage queries over 4 models with 0 exemptions — all match the
  brief. Browser 114 / a11y 112 taken on faith (not re-run, stated above).
- **"It previously passed everything (exit 0, 921/921)… passes tsc"** — the M2 shape as written (an
  unused import) no longer passes tsc at this tree: `noUnusedLocals` trips TS6133 before any gate
  runs. Immaterial to the finding — M4's used import is tsc-clean, and the load-bearing catch is the
  import-graph gate either way — but the predecessor's "passes tsc" does not reproduce verbatim at
  HEAD for the unused form.
- **"docable gained five measured expect values"** — correct, and one of the file's six `expect:`
  occurrences is in a comment; the real count is 5/5, all met.
- **The brief's suggested mutation list was well-aimed:** of its six invented-mutation prompts,
  three (dynamic import, deleted entity, wrong-directory ref) are caught — the implementers defended
  them — and three (alias/barrel variants, consistent-both-sides, `contains` laundering) found the
  real residue documented above. The brief's instinct that "a gate authored against a named mutation
  will catch that mutation" is exactly what the data shows: every slip is a mutation shape no gate
  was authored against.
