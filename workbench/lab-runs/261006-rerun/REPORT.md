# MAGE Workbench — lab RE-run on the repaired surface, 261006

**Who/how:** a Fable agent driving the running app headless — **Puppeteer's pinned Chromium
from `book/node_modules`** (NOT "Chrome for Testing", NOT Playwright `chrome-headless-shell`;
a process grep should look for `wb-browser-` profile dirs / the puppeteer cache Chromium),
served by the harness's own static server on a **kernel-chosen free port** (never 8099/8100),
tree `wb-lab-rerun-261006` rebased onto `main` tip `d71e32190`, workbench built fresh.
`window.mage.version` = 0.4.0. Every page opened with cleared storage, so each lab began from
the shipped base state (the same isolation the Reset button produces). **I did not open
`workbench/src/**` at any point.** Everything came from `describe()`, the live API, the
published schemas, and `export()` YAML.

**Deliverable fix from the first run: every end state is EXPORTED and committed.**
All paths under `workbench/lab-runs/261006-rerun/` on branch `wb-lab-rerun-261006`:

| artifact | file |
|---|---|
| calibration-loop base | `calibration-loop.before.mage.yaml` |
| calibration-loop solved | `calibration-loop.mage.yaml` |
| transaction-workspace base | `transaction-workspace.before.mage.yaml` |
| transaction-workspace + deadline machine | `transaction-workspace.mage.yaml` |
| the hand-edited YAML fed to `load()` | `transaction-workspace.edited-input.mage.yaml` |
| message-bus base | `message-bus.before.mage.yaml` |
| message-bus repaired | `message-bus.mage.yaml` |

Each `*.mage.yaml` is a `window.mage.export()` artifact — comments and key order preserved —
and loads straight back via Import / `window.mage.load()`. Raw engine answers for every step
are in the sibling `lab-*-results.json` / `probe-*-results.json`; the driver scripts
(`driver/*.mjs`) re-run the whole thing.

---

## Per-lab: solved? and did the six fixes change the EXPERIENCE?

### calibration-loop — SOLVED, same route, independently re-derived

Both wrong answers re-hit deliberately: the edge on two shadows refused with the two V48
unnamed-kind findings; typing both `data` committed (vocabulary, not taxonomy) and the edge
then refused with the distinct V48 wrong-kind message naming
`relation-types.conveys.domain`/`.range` and "all three surfaces are yours". The right move —
one atomic transaction: `set-entity-type reading=measurement`, `set-entity-type
sample=measurement`, `add-relation conveys` — committed;
`reading-is-delivered-as-sample` → HOLDS; `explainType` on both flips to
`established: "authored"` with a constraints entry citing the conveys edge, verdict `member`.
**Not weakened:** `sensor-reaches-controller-through-produces` stays UNLICENSED
(`composition-forbidden`, with populated refusalDetail naming the missing composition
semantics and the `instrumentation` model).

**Experience change:** the example now ships a requirement
(`reading-reaches-the-controller`), and `window.mage.requirements()` reads it directly:
before the fix `status: "violated"` with the sentence "VIOLATED — the breach is exhibited,
and a witness is not softened by coverage"; after, `status: "satisfied"`. In the first run
this join (query outcome × `satisfied_when`) was done by hand from export YAML. **Now it is
one call. Fix #3: real, not cosmetic.**

### transaction-workspace — SOLVED; finding #1 is DISCHARGED where it matters

Base verdicts reproduced (wait-indefinitely HOLDS with a lasso; verdict-is-eventually-forced
UNLICENSED, refusalDetail naming `machine verdict-deadline, sync deadline_expires`). The
forcing modification went through the now-**declared** sanctioned route —
`describe().authoring.sanctionedRoute` says in so many words that export → edit YAML →
`load()` is the SUPPORTED route and not second-class, and `authoring.constructs` told me
before I tried that machines/events are whole-document-only. In the first run that route was
inferred; **now it is read. Fix #6 (sanctionedRoute): real.** I added the `verdict-deadline`
machine, the `deadline_expires` sync event, and the `valid→refused` synchronized transition;
`load()` took it with zero findings; `verdict-is-eventually-forced` → HOLDS;
wait-indefinitely still HOLDS (fairness correctly still out of scope).

**The headline check — are per-step configurations populated? YES, fully.** The 3-step
witness reads: step 1 `propose` — control `{transaction-lifecycle: idle→proposed,
verdict-deadline: armed}`, values `{base_current: true}`; step 2 `validate` —
`proposed→valid`; step 3 `sync: deadline_expires` with `instances:
[transaction-lifecycle, verdict-deadline]` — control `{valid→refused, armed→expired}`.
Both machines' control states and every variable appear at every step, and the sync step
shows both participants stepping atomically. The shipped lasso witness equally carries full
`from`/`to` maps in its stem and cycle. **A trace is now readable without reconstructing
anything from labels. Fix #1: discharged, and it is the one that changes the experience
most — in the first run every trace was `{control: {}, values: {}}`.**

**Fix #2 (resolveExhausted) — discharged, and verified end-to-end.** The declaration now
states the producing condition exactly: an authored-`limit` behavioural/graph query answers
`inconclusive` and carries NO escalation (raise the limit or use `analysis.explore`); the
handle's ONLY producer is the fenced `debug.sparql` when an evaluation spends its step
budget. That sentence resolves precisely the dead end the first run hit. I then *produced*
one: a GRAPH-scoped three-way join at `budget: 1` answered `kind: "exhausted"` carrying an
`escalation` handle (with a typed `questions[]` decomposition of what the query needs), and
`analysis.resolveExhausted(handle)` returned `status: "ok-evaluation"` with the full answer.
Unreachable in run 1; reachable-with-instructions now. En route, the SPARQL subset refusal
itself taught the repair ("write GRAPH ?g { … } to ask every model") — I followed the
refusal text alone.

### message-bus — SOLVED; findings #4 and #5 are DISCHARGED

Naive repair (lower `carries` only) REFUSED by V46 naming both surfaces and the offending
field (`'restricted' (from 'shipping-address')` … "One transaction can do both") — did not
commit, hash pinned. Sound repair (delete the `carries_field` edge to shipping-address +
set `carries: internal`, one transaction) committed; breach query
`restricted-data-reaches-impermitted-subscriber` HOLDS → REFUTED; all other verdicts
stable; `requirements()` flips `no-restricted-data-to-an-impermitted-subscriber` to
SATISFIED — again read directly, no hand-join.

**Fix #4 (interpretedAs where-clause): real.** The breach query's sentence now reads
"…where the source's 'permits' is below the target's 'carries'?" — the comparison the first
run found silently missing is in the sentence. An agent trusting interpretedAs no longer
misreads the witness as mere subscription.

**Fix #5 (refusalDetail parity): real, verified at the first run's known-bad site.**
`charge-remaining-at-delivery` (autonomous-delivery), which shipped
`unknown-vocabulary, missing: [], models: []`, now answers `missing-distinction` with
`missing: ["the battery's state of charge"]`, `models: ["mission", "mission-endurance"]` —
the typed half now carries at least the sentence, and the reason itself got more honest.
Every refused/unlicensed query I touched across the three labs (+ that probe) had populated
refusalDetail.

---

## Which fixes were cosmetic? None outright — one is a signpost, not a door

- **Nearest to cosmetic: the saved-query-definitions half of fix #6.** `authoring.gaps` now
  *declares* "saved-query DEFINITIONS have no read-path of their own … read from
  window.mage.export()" — but the read-path still does not exist. The declaration spared me
  nothing in practice this run (I read definitions from export YAML exactly as in run 1,
  e.g. to learn the correct `target: {"<machine>.state": value}` query shape). Declared-but-
  not-closed is what the finding asked for, so I call it honest, minimal discharge.
- **requirements() carries a declared half-gap**: `authoring.gaps` says no human surface
  renders verification statuses yet. For an agent the fix is full-value; for the human
  loading my exports the requirement verdicts remain API-only.

## NEW gaps (places the surface made me guess this run)

1. **`model.related` silently answers the OPPOSITE question on an unknown `direction`.**
   `"outgoing"` asks "Which entities does order-created point at…"; but `"out"`, `"from"`,
   and `"forward"` are all silently interpreted as the INCOMING question ("Which entities
   point at order-created…") and answer it — refuted, in my case — with no refusal and no
   note. An enum-valued parameter whose unrecognized values fall back to a *different
   question* is exactly the failure class this tool refuses loudly everywhere else (compare
   the SPARQL path: "The query was not rewritten to fit"). This is the headline new gap;
   my first driver mis-measured the model because of it and only a self-asserting probe
   caught it.
2. **Transaction refusals have no typed half.** `transact()` findings are
   `{rule, where, message}` — prose only. Query refusals got refusalDetail parity (fix #5);
   the V46/V48 refusals' structured content (the two surfaces, the offending field, the
   required kind) lives only in the sentence. The messages are excellent, so this costs an
   agent little today; it is the same asymmetry fix #5 closed on the query side.
3. (Positive note, not a gap:) a malformed `ask()` target got a refusal that taught the
   correct reference grammar ("References address a control state ('<machine>.state'), a
   variable, or a derived value") — the teaching-refusal posture held even against my own
   bad input.

## Findings #1 and #5: explicitly discharged. 

#1 (empty configurations): discharged — full control+values at every step, stem and cycle,
multi-machine sync steps showing both participants. #5 in the brief's numbering
(refusalDetail parity): discharged corpus-wide as far as I probed, including the previously
deficient site. The first run's #5-as-listed (saved-query definitions): declared, not
closed — see above.
