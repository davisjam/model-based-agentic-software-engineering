# Self-model reconciliation against the 261004 landings

A great deal landed on 261004 — the LTL foundation, the bindings/compositions split, the conformance
corpus, `semanticBasis`, `count` on the model facade, Learn's second derivation source, the vacuity
disclosure arm — and the self-models had not been read against it. This is that reading.

**The classification is the deliverable, not a change list.** The self-models are purposeful
reductions: they omit deliberately and `omits` is a declared field, so an omission is not drift.
Drift is a claim that is now false, or a part the model declares it covers and no longer does. Every
finding below is classed **stale**, **deliberate omission**, or **newly in-scope**, and the ones that
are neither are called out as such — including three places where a control already held what a
model or doc said was unheld, which is the opposite direction from the drift one expects and the more
dangerous one, because it invites a reader to build the control a second time.

---

## 1. The baseline, measured rather than quoted

At `795394ba`, before any edit in this wave. It had moved several times that day, so every number
here was re-run.

| Gate | Result |
|---|---|
| `npm run check` | exit 0 |
| `npm run check:parity` | exit 0 — `UX-I1: 0 violation(s) over 26 capabilities` |
| `npm run test` | exit 0 — **1130 pass, 0 fail**, 41.5s |
| `npm run build` | exit 0 — 87 source inputs |

And the per-model query census, since the reconciliation turns on which model carries which kind of
statement (measured by walking each file through `canonicalize` + `parseQuery`):

| Model | Queries | Kinds |
|---|---|---|
| `workbench-components.mage.yaml` | 14 | all `graph` |
| `workbench-affordances.mage.yaml` | 80 | all `graph` |
| `example-coverage.mage.yaml` | 24 | all `graph` |
| `workbench-lifecycle.mage.yaml` | 9 | `behavior`: 7 `reach`, 1 `invariant`, 1 `deadend` |

That split is load-bearing twice below: `validate.py` answers `graph` and declines `behavior`, and
`test/ltl-bridge.test.ts` bridges `reach` and `invariant` and declines `deadend`.

**No count moved.** After the edits in this wave all four gates stay green with the same figures —
1130/0, 26 capabilities, 87 inputs. Every edit was to prose, a relation type's `absence` text, or a
header; none touched an entity set, an edge, a query, or an `expect:`.

---

## 2. Did the import-graph gate catch the LTL modules? No — and it could not have

The brief asked whether a missing LTL component was already caught or whether the modules slipped in
under an existing component. The answer is the second, and the reason makes it a third thing: not a
gap the gate missed, but a granularity the gate is built to have.

`query-engine` carries `provenance.subject.ref: src/engine` — a **directory**. By the model's own
longest-prefix rule every file under `src/engine/` resolves to `query-engine`, so four new files
there are invisible to the gate as *components*. What the gate checks is **edges**, and the four
modules' complete set of relative specifiers is:

```
../ir/types.ts          → model-ir       (declared: qe-ir)
./explore.ts            → query-engine   (internal: checked against nothing)
./predicate.ts  ./refs.ts  ./types.ts    (internal)
./ltl.ts  ./ltl-automaton.ts             (internal)
```

One cross-component edge, already declared. So the gate stayed green **correctly**, in both
directions: no undeclared import appeared and no declared edge went dead. Re-run at HEAD, all 11
assertions pass, including *"every import in src/ is an edge the components model declares, and every
declared edge exists"* and *"the kernel's observed out-degree is zero, and the model still asserts
it."*

**The components model's `correspondence.kind: checked` therefore still holds after the additions** —
the brief's third specific, confirmed.

### The gate did fire today, on a different wave, and the architecture model won

`src/learn/questions.ts:40-49` records it. Learn's second derivation source was to be the agent
facade's `MODEL_FACADE` table. The components model resolves `src/app/agent-api.ts` to
`agent-adapter` and draws no `learn-page → agent-adapter` edge, so with the import in place the gate
named it and said it was *"either a dependency to undo or an architecture decision to make and
draw."* It was undone, and `semanticBasis` became the second derivation source instead.

That is the control doing the job it exists for: a model constraining code rather than describing it.
Worth recording because the usual question about a self-model is whether anything enforces it, and
here the answer is a changed design.

---

## 3. `workbench-components.mage.yaml`

**STALE (fixed) — the `depends-on` relation type claimed nothing checks it.** Routed by the
example-manifest wave and verified here. `absence` read: *"Nothing yet derives `src/`'s imports and
checks them against this edge set, so today the absence binds a reader and an agent, not a build."*
`test/import-graph.test.ts` has done exactly that, in both directions, since 261004 — and **the same
file's header says so at length**, so the model contradicted itself. Corrected rather than deleted,
because the replaced sentence is the one a reader would act on.

**STALE (fixed) — `model-ir` said "verified at this commit."** The kernel's zero out-degree is held
per run against the *observed* graph, not verified once. Now reads that way.

**STALE, marginal (fixed) — the worker-mutator query's note.** It said the query *"would survive an
undeclared import,"* true of the query alone but no longer of the system: the gate closes that
loophole from the other side. Now states the three as defense in depth.

**DELIBERATE OMISSION — no entity for the four LTL modules.** `omits:` declares *per-file import
sites*, and the modules sit inside `query-engine`'s declared ref. Adding an `ltl-engine` entity would
be model content for its own sake and would need edges that duplicate `qe-ir`. Considered, declined,
recorded here so a later wave does not read the absence as an oversight.

**DELIBERATE OMISSION — no entity for `conformance/`.** The dependency model's scan root is `src`,
so the tree is outside the universe of discourse; and a fixture corpus is not a component. Nothing to
reconcile.

---

## 4. `workbench-affordances.mage.yaml`

**IN SYNC — not drift, verified mechanically.** `npm run affordances` regenerates the file
**byte-identical** (zero diff), so whoever landed `count` regenerated it. Nothing to do, and nothing
may be done by hand: the file's first line forbids it and the staleness gate is byte-exact.

**NOT A MODEL CLAIM — `count`, and the 36 → 37 callable figure.** `count` is a callable on an
existing capability's *machine* affordance (`wired("window.mage.model.count")`), not a capability
row, so it adds no affordances entity. It is pinned as an exact list by
`test/model-facade.test.ts:183` — `["count", "elements", "path", "reachable", "related",
"violations"]` — total in both directions. The 36 → 37 figure belongs to the browser tier, outside
the self-models. The brief's framing suggested a self-model consequence; there is none.

---

## 5. `workbench-lifecycle.mage.yaml`

**STALE (fixed) — "ONE implementation decides these verdicts, not two."** This was true when
written and stopped being true the same day. `test/ltl-bridge.test.ts` enumerates `models/*.mage.yaml`
— `readdirSync("models")`, so the subject set grows when a model does rather than when that file is
edited — and compares every bridgeable saved behavior query against an LTL formula decided by
`src/engine/ltl-product.ts`, an independently implemented automaton-product walk. Under
`invariant p == G p` and `reach p holds <=> G not-p refuted`, **8 of the 9 rows are now decided
twice**; `lifecycle-has-no-dead-end` is the one exclusion, for the stated reason that `deadend`'s
positive row needs an atom true at exactly one configuration, which a saved query cannot express.

The parity half of the paragraph was *preserved and re-measured*, because it is still right:
`python3 validate.py models/workbench-lifecycle.mage.yaml` returns nine `[skip]` lines and then
`clean`. The correction is about where the second opinion comes from, not about `validate.py`.

**NEWLY IN-SCOPE (added) — the model is a P1–P5 acceptance subject, and P5 is `refuted`.**
`test/acceptance-p1-p5.test.ts` makes this model one of two subjects for `DESIGN-v02-semantics` §30's
five properties. P1–P4 `holds`; **P5 — every proposed transaction eventually commits or refuses — is
`refuted`**, the liveness consequence of admitting every execution with fairness out of scope, ruled
the intended teaching outcome. The header said nothing about it, and nine met `expect:` rows read as
"every temporal question about this machine comes out green." Two details moved into the model's own
header rather than left only in the design doc: the counterexample is the hypothesis open/apply loop
and not the concurrent-commit cycle §5.2 predicted, and **P5 over this model has no mutation
control** — no single-edge removal flips it, because removing one of `second_author`'s edges fails
V12 outright, so the control lives on the example machine. P5's `refuted` is the one temporal answer
about this model carried by prose rather than a pinned, sensitivity-checked verdict, and a reader
should be told which one that is.

**NOT STALE, preserved deliberately — "Correspondence is ASSERTED BY READING … and nothing checks
it,"** and the three control-flow facts a checker would have to decide. The LTL bridge checks
**verdicts**, not correspondence: both implementations read the same model file, and nothing yet
decides a control-flow fact about `src/`. Swept the whole file for this pattern and every instance of
it is about correspondence and still true. Keeping that line sharp is the point — conflating
verdict-sensitivity with correspondence is the failure class the 261004 audits established by
mutation.

**NOT STALE — the 70-configuration pin.** `test/lifecycle-model.test.ts:109` asserts
`space.statesExplored === 70` and passes at HEAD.

---

## 6. The claim that became checkable — and the one I could not make so

The brief suggested the behaviour queries might now be checkable more strongly than they are stated.
They are, and **the work was already done without touching a model**: that is what `ltl-bridge`'s
`readdirSync("models")` buys. My job was to record it, which §5 does.

The other reading — restate a behaviour query *as* a temporal property — **is not available this
wave**, measured rather than assumed:

- `mage-query.schema.json`'s behavior `form` enum is unchanged: `["reach", "invariant",
  "recurrence", "repeatable-cycle", "deadend", "transition-live"]`. **No saved query can name an LTL
  property.**
- `src/engine/index.ts` re-exports nothing from the four modules (`grep -c ltl` → 0).
- **No module under `src/` imports them at all.** `src/engine/explore.ts` mentions
  `ltl-product.ts` in a comment and that is the whole of it.

So liveness has verdicts, and today a reader obtains one by writing a test, not by saving a query.
That is the foundation design's own declared boundary — §7.4 enumerates what was to be added and a
query form is not on the list — so it is a **follow-up, not drift**. It is also squarely in
`src/engine/` and `src/ir/`, which this wave must not touch.

---

## 7. Docs corrected

**`SEMANTICS.md` §7.3 — STALE as a description of the engine.** *"The engine is therefore
safety-plus-reachability only … liveness … is not [in scope]."* The document is the frozen v0.1
kernel and the v0.1 paragraph stands, but that sentence describes **the engine**, and the engine
gained an LTL foundation under which liveness gets a verdict. Added a dated note in the house
correction-block form, carrying the measured not-wired bound from §6 so the note cannot be read as
"you can ask this in a model now." `PLAN.md` §2 already carried the matching supersession on the
Phase C must-not, which is how the lag was visible at all: two current-facing documents disagreeing.

**`SEMANTICS.md` §13.7 — STALE on one of two halves.** It read: *"`binding` and `requirement,
verification` have no construct to correspond — §14's bindings/compositions split and §20 have not
landed."* The split **landed 261004**: `BINDINGS` and `COMPOSITIONS` are separately typed registries,
and the three binding rows (`appears-in`, `machine-of-entity`, `state-of-entity`) share one
`semanticBasis` declaring KerML's binding subset as borrowed with its non-borrowed parts enumerated.
So `binding` has a construct and is the fourth implementable fixture target; what keeps it `owed` is
narrower — `clause` is `CLAUSE_OWED`, `fixture` is `null`, because a clause written from memory reads
as checked. Split the bullet so the two rows carry their two different reasons.
`requirement, verification` is untouched and still owed for the original reason.

**`SEMANTICS.md` §13.3 K2 — NEWLY IN-SCOPE.** K2 now has two strengths inside it and the split runs
along query kind: `graph` decided twice by parity, `behavior` decided once until `ltl-bridge` closed
it. Added, with the explicit note that this raises *warrant* and moves nothing on the correspondence
axis.

**`PLAN.md` §0 — an LTL row in the state table**, carrying the landing and the not-wired bound.
**§0.2a** — the two consumers the foundation added without a model edit. **§0.2b** — the SysML-import
trigger measured as **still unmet on both halves**: 3 of §35.4's 5 borrowed rows have a fixture, and
**0 are `oracle-executed`** (2 `normative-artifact`, 1 `spec-inspected`); no reference implementation
has run.

**Not touched:** `DESIGN-v02-examples-and-semantic-completion-261004.md`, and no landed design doc's
rulings. No design doc was found to be wrong — §13.7's stale half was a *restatement* in SEMANTICS.md,
not a ruling.

---

## 8. Follow-ups recorded rather than raced

Five siblings were live (`git worktree list`): `wb-example-manifest`, `wb-learn-bindings`,
`wb-p1-message-bus`, `wb-requirements-impl`, `wb-transaction-activity`.

1. **An LTL saved-query form.** Needs `mage-query.schema.json` + `src/engine/` + `src/ir/`. Would let
   the lifecycle model state a temporal claim directly instead of a `reach` approximation of one, and
   would retire §6's bound. `src/engine/` is excluded from this wave.
2. **The `binding` conformance fixture.** Now an implementable target (§7); needs
   `src/engine/model-types.ts` to fill `clause` and `fixture`, and a `conformance/kerml/` directory.
   Pins one of the three bindings and says nothing about completeness, per §35.6.
3. **`requirement, verification`'s construct.** `wb-requirements-impl` is live and ahead of main; its
   half of §13.7 was left exactly as it was.
4. **`models/example-coverage.mage.yaml`** — excluded by the brief (two example waves may regenerate
   it). Checked read-only: its generator gate is green, so it is in sync at HEAD. Its line 131 uses
   "join" in the *sound-correspondence* sense, not as the retired semantic category, so the `joins`
   retirement leaves nothing stale there.

## 9. Where this brief was off

Small things, none of which changed the work:

- **`joins` retired as a semantic category** left no self-model stale — no self-model ever named a
  `joins` registry. Its only doc consequence was §13.7's `binding` row citing the split as not landed.
- **`count` / 36 → 37** has no self-model consequence at all (§4).
- **"a missing LTL component may already have been caught"** offered two answers, gate-fired or
  slipped-in-under-an-existing-component. The real answer is a third: with a *directory* ref, new
  files inside an existing component are invisible to the gate **by construction**, so "slipped in"
  understates how deliberate that is. The gate checks edges, and the edge was already drawn.
- **The vacuity disclosure arm** needed no reconciliation: `src/ir/types.ts`'s
  `Compilation.kind` and `mage-query.schema.json:272` both carry `vacuous`, and `SEMANTICS.md` never
  enumerates that vocabulary (V23 names only the history-variable mechanism), so there is no claim to
  go stale. The arm's home is `DESIGN-v02-quantification-261004.md`. **Deliberate omission.**
