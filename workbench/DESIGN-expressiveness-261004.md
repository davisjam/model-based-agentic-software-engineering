# DESIGN — query expressiveness: variables, Büchi, and where the honest boundary sits (261004)

The commission, verbatim: *"comment on what kinds of queries we can support, and whether we should
be thinking about state machines including variables / Büchi automata, etc."*

This is a position paper, not an implementation. Every claim about this codebase carries a
`file:line`; claims that are computer science rather than measurement are marked as such. Numbers
come from throwaway probes run against the shipped engine (appendix); the probes are not committed.

**The recommendation, up front: grow nothing in the engine now — neither new variable machinery nor
ω-acceptance. Variables are already a shipped primitive, and the one ω-form worth having already
ships. Spend the next unit of work making the liveness boundary legible at the surfaces where a user
meets it, and record the `response` form as the named trigger-gated next step.** The trade-off in a
sentence: we forgo answering response properties — which, without fairness declarations, the engine
could only ever refute — and keep the property that every shipped answer is explainable and every
refusal names its reason. §5 ranks the concrete moves; §5a states what this deliberately cannot do.

---

## 1. What the engine answers today, by expressiveness class

The query surface is one union of three kinds (`src/engine/types.ts:268-271`), carrying nineteen
forms — not sixteen: ten graph (`src/engine/types.ts:148-151`), six behavior (`:155-157`), and three
quantity metrics (`src/quant/requirement.ts:31`). Every query declares `exists` or `forall`
(`types.ts:125`), and the quantifier determines what counts as evidence (`:129-132`).

| Form | Expressiveness class | Evidence shape |
|---|---|---|
| `direct`, `predecessors`, `successors` | one-hop adjacency over typed edges (`src/engine/graph.ts:508-533`) | node sets / path |
| `reachability`, `path`, `shortest-path`, `all-paths` | transitive closure, licensed per relation type by V7 (`types.ts:184-186`) | path |
| `cycles`, `components` | structural: cycle detection, connected components | node sets |
| `containment` | tree walk over the entity `contains` hierarchy | path |
| `reach` | existential reachability — "∃ execution reaching φ" (EF φ, in CTL terms — CS, not code) | trace |
| `invariant` | universal safety — "∀ reachable configurations φ" (AG φ) | counterexample trace |
| `deadend` | existential reachable deadlock | trace |
| `transition-live` | existential transition executability | trace |
| `recurrence` | existential **re-entry** — target, ≥1 step, target again. A reachability-class property, deliberately (SEMANTICS.md:847-866) | lasso |
| `repeatable-cycle` | existential ω-recurrence — a genuinely repeated configuration through the target | lasso |
| past-time (compiled) | precedence with a single control-state antecedent, rewritten to safety over a disclosed history variable (`src/engine/history.ts:1-18`) | counterexample trace |
| `latency`, `cost` | worst-case additive aggregation along executions, with a cycle witness when unbounded | trace / lasso |
| `peak_memory` | peak over reachable configurations | — |

Three structural facts about this table:

- **All behavior forms are existential except `invariant`** (`NATURAL_QUANTIFIER`,
  `src/engine/behavior.ts:52-59`); a mismatched quantifier is refused, not reinterpreted
  (`behavior.ts:124-133`).
- **Every behavior form takes an `avoid` predicate** (`behavior.ts:141-145`), evaluated during the
  walk (`src/engine/explore.ts:465`) — so each is really "…while never passing through a forbidden
  region," which matters in §2.
- **The honesty substrate already covers partial knowledge.** `Outcome` is
  `holds | refuted | inconclusive | unlicensed` (`src/ir/types.ts:657`); `Coverage` is
  `exhaustive | bounded | not-applicable` with `statesExplored` and a closed `reason` enum
  (`:659-663`); evidence is `trace | lasso | path | none` (`:639`). A witness settles an existential
  claim at any coverage; absence settles it only under exhaustive coverage (V22,
  `behavior.ts:17-29`). No proposal below needs a new way to say "I don't know."

Stated in temporal-logic terms (a CS classification of the code above, not a measurement): the
engine covers safety (AG), existential reachability (EF), existential ω-recurrence for a single
target set (the EG-via-lasso shape), bounded precedence, and worst-case quantitative aggregation. It
has no Until, no nesting, no universal path quantification over infinite behaviors — so no "every
run eventually…" — and no fairness. The spec says exactly this: *"The engine is therefore
safety-plus-reachability only. **Fairness is unsupported**"* (SEMANTICS.md:880), and PLAN.md:346
makes fairness/liveness an explicit must-not for the phase that built `behavior.ts`.

## 2. The boundary, and whether the refusals are legible

What a user will naturally ask that the engine must decline, and what happens when they do:

| Natural ask | What happens today | Legible? |
|---|---|---|
| "Every accepted job eventually completes" | **Cannot be spelled.** No form exists, so the refusal is the parse error listing the six behavior forms (`src/engine/types.ts:387`). Nothing names fairness or liveness. | **No** — see below |
| "Can `published` occur before `reviewed`?" with a predicate antecedent | Refused with the restriction named: single control-state atoms only, "a richer antecedent needs a different compilation, which v0.1 refuses rather than approximates" (`history.ts:49-56`) | Yes |
| Instance binding, participant selection | `reserved-feature` refusal arm (`src/engine/types.ts:67-68`) | Yes |
| An unbounded variable | V17 refusal, measured verbatim in the probe: *"variable 'node.n' has no finite domain (V17) … Exhaustive exploration is not defined without one."* | Yes |
| A multi-hop question over a `path: forbidden` relation | `composition-forbidden`, V7 (`types.ts:37-38`) | Yes |

The liveness row is the finding. SEMANTICS.md §11 (`:1147-1153`) lists **fairness and liveness**
among seven deliberate limitations and claims *"each has a refusal message so a user meets a clear
boundary instead of a wrong answer."* For fairness/liveness I could not find that refusal on the
human query path — `grep -rn fairness src/` finds a comment (`behavior.ts:4-7`) and one string in
the agent surface's `describe().notSupported` (`src/app/agent-api.ts:558`), which agents see and
humans do not. The state-machine model type's `omits` list — the source the Learn page derives its
"what this deliberately does not tell you" section from (`src/learn/content.ts:1-21`) — names time,
cost, and topology, but not liveness (`src/engine/model-types.ts:494-497`). And the Learn
requirement's own property list, which marks `? every accepted job eventually completes` as not
answerable (`requirements-learn-261002.md:78`), is not yet in the shipped Learn derivation: no file
under `src/learn/` contains "eventually" (measured by grep). The `RefusalReason` vocabulary
(`src/engine/types.ts:36-74`) has no arm meaning "outside this engine's property class" — the
nearest, `unsupported-form`, means a schema form this version does not evaluate, which liveness is
not, because it never reached the schema.

So the boundary is real and principled, but at the one place a user is likeliest to hit it, the
refusal does not name the missing expressiveness. The fix is cheap and lands in §5.

**The honest substitute that exists today.** A counterexample to "after `accepted`, `completed`
eventually follows" has exactly two shapes (CS fact, finite systems): an infinite run that avoids
`completed` forever, or a finite maximal run that halts while avoiding it. Both are askable now:

- `repeatable-cycle` with `target: accepted`, `avoid: completed` — "can it reach `accepted` and then
  repeat a configuration forever, never passing through `completed`?" `holds` refutes the liveness
  claim with a concrete lasso.
- `deadend` with `avoid: completed` — the halting half. One caveat: `deadend`'s subject is the whole
  space, not "after `accepted`"; and a configuration whose only steps enter `completed` is correctly
  NOT a dead end (`explore.ts:464-465` counts the step before the avoid-check prunes it — stepping
  into `completed` is completing).

What this pair cannot do is answer **"yes, it always completes."** And under this engine's
semantics it should not: with interleaved machines and no fairness, the lasso in which the scheduler
simply never schedules the worker exists for nearly any such claim (CS, not measurement — SEMANTICS.md:222
and :767 state there is no scheduler and no fairness), so an unqualified "holds" would be a wrong
answer about a different model. The workbench's stance — *"the workbench must say so rather than
guess"* (SEMANTICS.md:882) — is correct. The gap is that today it says so in a comment, not to the
user.

## 3. Machines with variables: the question is already settled, in the code

The brief framed this as "promote variables to a primitive, or keep as compilation?" The codebase
has already answered: **variables are a shipped, author-declared primitive.**

- The wire schema: `"variables": "THE state vector. Every variable must have a FINITE domain
  (V17)"` (`mage-model.schema.json:185-190`).
- The IR: `CanonVariable` with its domain *enumerated as a list* — "Finiteness is not a hope here;
  it is a list" (`src/ir/types.ts:40-47`). A configuration is control states plus variable values
  and nothing else (`:623-628`).
- Guards: `GuardOp` (`src/ir/types.ts:189`) is six comparison operators used in three places —
  transition guards (`:191-196`), behavior-predicate atoms (`src/engine/types.ts:220-230`), and
  graph `where` comparisons (`:197-208`). Order comparisons require a declared ordered domain (V20,
  `src/engine/types.ts:188-189`).
- Updates: `Effect` expressions are restricted to `<var> <+|-> <int>` or a literal
  (`src/ir/types.ts:198-202`).
- Shipped usage: `retry_count` with `range: [0, 3]` in two examples
  (`examples/worker-queue/system.mage.yaml:158-163`, `examples/docable.mage.yaml:129-133`).

What `history.ts` adds is narrower than "variables": it is a *query-time compilation* that answers a
past-time question by adding an auxiliary Boolean the author never declared, and disclosing both the
variable and its cost (V23, `history.ts:9-12`). That module is the precedent for *engine-added*
expressiveness; *author-declared* variables predate it.

**The state-space arithmetic, measured.** Each machine instance contributes
(states × Π domain sizes); instances multiply. On the shipped examples the spaces are tiny and the
walk is instantaneous:

| System | naive product | reachable | wall time |
|---|---|---|---|
| `examples/docable.mage.yaml` | 40 | 39 | 0.6 ms |
| `examples/document-processing` | 24 | 18 | 0.1 ms |
| `examples/worker-queue` | 72 | 29 | 0.1 ms |
| synthetic: 4 instances × (3 states, one `[0,7]` counter) | 331,776 | 83,521 | ~1.5 s |

The synthetic row measures explorer throughput: **~54,000 configurations/second**, in-process,
single-threaded. The default ceiling is 100,000 configurations (`DEFAULT_STATE_LIMIT`,
`src/engine/explore.ts:39`), so a limit-tripping walk costs roughly two seconds of Worker compute —
and the engine runs in a Web Worker (`src/worker/analysis.worker.ts:1-19`), so that cost never
touches the UI thread. The renderer's synchronous constraint does not apply to this path; confirmed
by reading the worker, which imports the engine and replies asynchronously.

One honesty finding fell out of measuring the history compilation. Its disclosure says the rewrite
*"doubles the configuration space"* (`history.ts:134`). Measured on `docable` (antecedent: entry to
`failed`; consequent: `waiting`): **39 configurations before, 39 after** — growth 1.0×, because on
every reachable configuration `seen_failed` is implied by `retry_count ≥ 1` (my reading of the
model; the measurement stands regardless). The doubling is a worst-case bound stated as a fact. V23
exists because a wrong statement about the model is worse than no statement; the disclosure should
say "up to doubles," or better, report the measured pair — the machinery is one extra `exploreSpace`
call over a space the engine already built.

**The live variable frontier, ranked — none urgent:**

1. **Richer effect grammar** (var-to-var assignment, min/max). Preserves finiteness; trigger is a
   shipped example that cannot express its update. None exists today.
2. **Predicate antecedents for past-time questions** — the "different (and larger) rewrite"
   `history.ts:14-17` names and refuses. Trigger: a user actually asking one.
3. **Unbounded domains — never.** Two unbounded counters make reachability undecidable (Minsky-machine
   reduction; textbook CS, not a fact about this repo). V17 is the right wall, its refusal already
   names itself, and `Coverage.kind: "exhaustive"` — the flag that licenses the engine's strongest
   claims (`src/ir/types.ts:614-621`) — is only sound because domains arrive as lists.

## 4. Büchi / ω-automata: what full machinery would add beyond what ships

**What ships is already the core of the Büchi check, for one acceptance set, existentially.**
"∃ a reachable cycle through a target configuration" — which is `repeatable-cycle`
(`src/engine/behavior.ts:356-379`) — is exactly non-emptiness of the model read as a Büchi automaton
whose acceptance set is the target (CS statement). The evidence is a lasso, which the IR has carried
from the start (`src/ir/types.ts:639-647`; SEMANTICS.md:843-845). `recurrence` is deliberately
weaker — re-entry, a reachability-class fact — and the two are separate forms precisely so each
denotes one question (SEMANTICS.md:847-866).

**What full LTL→Büchi machinery adds:** Until and nested temporal operators; negation; universal
path quantification ("every infinite run satisfies φ") via the product with a ¬φ automaton plus
fair-cycle detection; generalized acceptance (multiple sets). The counterexample then lives in the
*product*, and must be projected back onto the model before a user sees it.

**The cost, itemized:**

- **Compute: affordable, and SMT-free.** The product multiplies the state count by the automaton
  size (≤ 2^|φ| in theory, 2–5 states for the formulas users write — textbook). At the measured
  54k configs/s, a 4-state product over the 100k ceiling is tens of seconds in the Worker; nested-DFS
  or SCC-based emptiness is linear in product size. Nothing here needs SMT, so PLAN.md §1a.2
  (`PLAN.md:285-307` — z3 needs SharedArrayBuffer, Pages cannot set COOP/COEP headers, verified
  blocker) is not an obstacle to this path. Compute is not the reason to decline.
- **Fairness: the real bill, and it is semantic.** A universal liveness claim over interleaved
  machines with no fairness is refuted by the scheduler-starvation lasso in all but degenerate
  models (CS; the engine's own no-scheduler semantics is SEMANTICS.md:222, :767). So ω-machinery is
  inseparable from fairness declarations: schema surface (per-machine or per-transition weak
  fairness at least), new V-rules, and — hardest — the disclosure story: a fair-cycle check that
  excluded a counterexample must say *which declared assumption excluded it*, or the user has been
  told "holds" about a model they did not write. That is a new disclosure genre. (It is NOT a new
  outcome or coverage arm: a fairness-filtered search is still exhaustive over its product, and
  `holds | refuted | inconclusive` plus `compilation` disclosures carry it — the existing substrate
  suffices, which the brief asked be checked.)
- **Teachability: the identity cost.** Every form ships a plain-language interpretation (V21,
  `behavior.ts:430-453`), and the project ruled that *"a query denotes a question, not a search
  strategy"* (SEMANTICS.md:847). An LTL formula box is the opposite of that: the user writes
  `□(accepted → ◇completed)` and the tool explains automata products back to them. For a teaching
  tool with a Learn gallery, expressiveness that cannot be explained is a cost; if response
  properties ever ship, they should ship as a *named form* ("response: after p, q eventually
  follows") compiled and disclosed the way `history.ts` compiles precedence — never as formula
  syntax.
- **It is currently a spec-level non-goal.** PLAN.md:346 (*"Must not: implement fairness or
  liveness"*) and SEMANTICS.md:1151. Changing that is a ruling first, code second.

## 5. The recommendation, ranked by (value to a real question) ÷ (cost)

**Grow nothing in the engine now. Close the legibility gap. Record the trigger.** PLAN.md §0.2a
(`PLAN.md:94-115`) is this project's precedent for recording a reasoned omission as a decision;
this section is written to be foldable into it.

1. **[FIX, one string] Name liveness in the state-machine type's `omits`**
   (`src/engine/model-types.ts:494-497`): add "whether something must *eventually* happen — liveness
   requires fairness assumptions this model does not represent." Because Learn and the refusal prose
   derive from the registry (`src/learn/content.ts:1-21`), one string closes the §11
   "each has a refusal message" gap at every derived surface at once.
2. **[FIX] Ship the Learn requirement's `?` row** (`requirements-learn-261002.md:70-79`): the
   property list with `✓ retry cannot continue indefinitely` beside
   `? every accepted job eventually completes — requires assumptions this model may not represent`.
   The boundary IS the lesson; teaching it costs a content row, not an engine.
3. **[FIX, one sentence] Stop overstating the history-variable cost** (`history.ts:134`): "up to
   doubles," or disclose the measured before/after pair (39 → 39 on the shipped example, §3). V23's
   own standard is the argument.
4. **[DESIGN, trigger-gated] A `response` form — the named next step, deliberately not taken now.**
   "After p, q eventually follows," compiled to the two counterexample searches the engine already
   performs (`repeatable-cycle` + `avoid`, `deadend` + `avoid`, §2), disclosed like `history.ts`,
   answering `refuted` with a concrete lasso, and `inconclusive`-by-design on the affirmative side
   with prose naming fairness as the missing assumption. No automaton, no product, no new outcome.
   **Trigger:** users, via the ask surface or Learn, actually posing response-shaped questions and
   finding the two-query idiom confusing — observable once refused asks are logged. The
   starvation lasso this form would surface is itself the best fairness lesson a teaching tool can
   give.
5. **[REJECTED for v0.x] Full LTL/Büchi plus fairness declarations.** Re-open only if MAGE models
   grow protocol-like machines where response properties are the *primary* question and rung 4's
   fairness-free refutations prove insufficient in practice. That is a different tool posture;
   it requires rewriting SEMANTICS §7/§11 and PLAN's must-not before any code, and it drags the full
   fairness-declaration/disclosure bill of §4 with it.

### 5a. What this recommendation cannot do

After rungs 1–3 the engine still cannot assert any universal liveness claim; "every accepted job
eventually completes" remains unanswerable — now legibly, with the refusal naming fairness and the
Learn page teaching why. Rung 4, if triggered, still never answers "holds" on a response property;
it refutes with witnesses or declines with the assumption named. Nothing here extends the
quantitative layer, the SPARQL subset, or past-time antecedents; and nothing here needs SMT, so the
§1a.2 constraint is honored by not approaching it.

## 6. Where the brief's ground truth was wrong

Checked as directed; four corrections and one refinement:

1. **"Variables already exist as a COMPILATION, not a primitive" — wrong.** They are an
   author-declared primitive: `mage-model.schema.json:185-190` ("THE state vector"), `CanonVariable`
   (`src/ir/types.ts:40-47`), guards/effects on transitions (`:191-214`), shipped `retry_count`
   declarations (`examples/worker-queue/system.mage.yaml:158-163`). `history.ts` is a compilation
   that *adds an auxiliary* variable for past-time questions; it is the disclosure precedent, not
   the variables story.
2. **"`recurrence` and `repeatable-cycle` … 'does this state recur infinitely often' IS a Büchi
   acceptance condition" — half right.** Only `repeatable-cycle` is the infinitely-often witness
   (a genuinely repeated configuration). `recurrence` deliberately means finite re-entry — a
   reachability-class property — and the spec forbids conflating them (SEMANTICS.md:847-866).
3. **"the outcome vocabulary includes `inconclusive` and `exhausted`" — `exhausted` is not an engine
   outcome.** `Outcome` is four-valued (`src/ir/types.ts:657`; PLAN.md:346 bans a fourth… fifth).
   `exhausted` belongs to the SPARQL evaluator's separate answer vocabulary
   (`src/sparql/eval.ts:71`), with its own escalation handle (`src/sparql/parse.ts:118-143`).
4. **The `Coverage` citation — right shape, wrong file.** The type lives at `src/ir/types.ts:659-663`;
   `src/engine/types.ts:455-461` holds its constructor helpers. And `reason` is a closed enum
   (`"state-limit" | "time-limit" | "depth-limit"`), not free prose.
5. **"Sixteen forms" undercounts by a kind.** Sixteen graph+behavior forms, plus three quantity
   metrics (`src/quant/requirement.ts:31`) under the third query kind: nineteen.

Verified as stated: `GRAPH_FORMS` at `:148`, `BEHAVIOR_FORMS` at `:155`; `GuardOp` at
`src/ir/types.ts:189`; the SMT blocker (`PLAN.md:285-307`); the Worker placement
(`src/worker/analysis.worker.ts:1-19`).

---

## Appendix: probe methodology (probes not committed)

Two Node 24 scripts in session scratch space, importing the engine directly
(`MageDocument.load` → `system()` → `compileSystem` → `exploreSpace(defaultOptions())`):

- **State-space census** over the five `.mage.yaml` systems under `examples/` and `models/`
  (naive domain product vs. `statesExplored`, stop reason, wall time), plus `compileHistory` on
  `docable` with before/after exploration for the history-cost measurement.
- **Throughput probe**: a synthetic 4-instance machine (3 states, one `[0,7]` integer each,
  interleaved, no sync) — naive 331,776, reachable 83,521 (complete), ~1.5 s ≈ 54k configs/s.
  The V17 refusal string in §2's table is this probe's verbatim output from a mis-declared domain.

Tree state at commit: this document is the only change; no production code touched.
