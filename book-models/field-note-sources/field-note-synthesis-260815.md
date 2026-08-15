<!--
PROVENANCE — field-note raw evidence (committed, NON-RENDERED).
Source draft: book/_design/drafts/formal-methods-mining-260815/ (gitignored working dir).
Home: book-models/field-note-sources/ — committed beside the field-note model, NOT under book/**,
so the catalog build's recursive book/**/*.md render glob does not pick it up (no orphan-reachability
gate applies). This is the durable evidence backing the formal-methods field-note entries in
book-models/field-notes.json (fn-db-cas-single-ownership, fn-lease-epoch-fencing, fn-inv18-liveness-gap),
consumed by book-models/substantiation.py as FieldNoteBacking. Model-registered evidence; not inline-cited.
-->

# Field Note (SYNTHESIS) — Formal methods, state machines, TLA+/TLC, and "bounded model checking" in DocAble / ada-tool

Purpose: evidentiary source material for the MAGE book. This note synthesizes
five region field-notes (R1 TLA+/TLC, R2 SimWorld/BFS, R3 state-machine
centralization, R4 invariant-registry correspondence, R5 concurrency
protocols/authority) into one account of **how DocAble moves from an explicit
behavioral model and invariant, through formal checking of that model, to
assurance that the implementation preserves the corresponding property** — and,
more importantly, **exactly which parts of that sentence are true, through what
machinery, and with what limits.**

Discipline tags: **REPO-FACT** (verifiable in the tree), **ENG-INTERP**
(defensible engineering reading), **MAGE-INTERP** (mapping onto book vocabulary).
Every significant claim carries a confidence. The governing rule is
*strongest-defensible-claim-and-no-stronger*; where the TLA+↔implementation
connection is informal, this note says **exactly where human judgment enters.**

Companion deep-dive files (full chains + state traces):
[`e2e-inflight-lease-fencing-260815.md`](e2e-inflight-lease-fencing-260815.md),
[`e2e-db-cas-work-item-ownership-260815.md`](e2e-db-cas-work-item-ownership-260815.md),
[`e2e-inv18-async-termination-liveness-260815.md`](e2e-inv18-async-termination-liveness-260815.md).

---

## 1. Executive summary

DocAble is an agent-authored accessibility-remediation system with a serverless
job pipeline. Around its concurrency-critical protocols it has built a **genuine,
disciplined, multi-layer assurance stack** — but the stack is **not** the
"TLA+ → TLC → refinement → implementation BMC" chain the naive reading of "formal
methods" would suggest. Five independent regional sweeps converge on the same
picture, at high confidence:

**(A) The formal-methods surface is small, deliberate, and honest.** There are
exactly **four distinct `.tla` files** (the apparent "~81" is git-worktree copy
inflation): `lease.tla` (in-flight-lease fencing core), `spec/INV18AsyncTermination.tla`
(async-termination liveness), `spec/INVFO2FanoutTermination.tla` (fan-out
termination liveness), and `spec/INV1Claim.tla` (a *self-labelled throwaway pilot*
modeling the now-retired ZPOPMIN poll plane). Each live spec faithfully adopts the
TLA+ *schema* (Init / Next / actions / INVARIANT / temporal PROPERTY / WF/SF
fairness) and — the disciplined move — carries a **falsifiability toggle**: one
guard CONSTANT flipped OFF that makes the checker *find* the counterexample,
proving the check is not a tautology. **REPO-FACT, high** (R1 §1, §5; R4 §5).

**(B) TLC is essentially inert as workflow authority.** TLC is executed
automatically for **exactly one** spec (`lease.tla`), and even that run **SKIPS in
the default dev/CI environment because Java/`tla2tools.jar` is not installed there**
(`tools/formal/run-tlc.py` hardcodes `_LEASE_TLA`; `test_lease_tlc_e2e.py` is
`skipif not _deps_available()`). There is **no `.github/workflows/`** and nothing
in `deploy/` invokes a TLC run. The two liveness specs the composed model actually
cites (INV-18, INV-FO-2) have **no automated runner at all** — their only "run" is
a manual `java … tlc2.TLC` in a cfg comment. **REPO-FACT, high** (R1 §2; R4 §5;
R5 §5.2).

**(C) There is NO implementation-level bounded model checking anywhere** — no
CBMC, no SAT/SMT/Z3, no symbolic unwinding, no refinement, no codegen. In this
repository the phrase "bounded model checking" denotes an **in-repo, pure-Python,
explicit-state breadth-first enumeration** (`web/test_simworld/_model_check.py`
`enumerate_reachable`) over *small hand-authored abstract transition systems* — the
authors' own "executable analogue of TLC." The bound is **actor/object counts + a
discrete clock** (2–3 parents, N≈3 chunks, ≤2 redeliveries), not a solver horizon.
**REPO-FACT, high** (R2 §0, §2, §3; R4 §6; R5 §0). The MAGE clause
"implementation-level BMC establishes corresponding properties over concrete
components" is therefore **NOT substantiated** — substitute "exhaustive BFS over an
abstract model" for "BMC" and it becomes true.

**(D) Where the assurance is genuinely strong, the load-bearing checker is
Python, not TLA+.** For the in-flight-lease fencing core the chain is complete and
gating — but the executable proof is `web/test_simworld/test_lease_model_check.py`,
a Java-free exhaustive BFS enumerator that (i) checks four safety + two liveness
invariants on every reachable interleaving up to the bound, and (ii) via
`test_model_matches_runtime_*` drives the **real** `lease_release_cas.lua` /
completer reclaim over a SimWorld and asserts agreement. That is a **conformance
test against an independently-authored obligation**, not BMC and not refinement.
Fence-off falsifiability finds **4,184** violation states; production config finds
**0** over **38,891** (2 parents) / **177,717** (3 parents) interleavings.
**REPO-FACT, high** (R1 §3, §11; R2 §7; R5 §2).

**(E) State-machine centralization is real and mature — as a runtime + test +
lint pattern, not a formal one.** Each async job lifecycle is centralized behind
one generic `JobStateMachine.transition()` primitive (`web/jobtypes/statemachine.py`)
over a hand-authored `dict[State → set[State]]` transition table; an illegal
transition raises `ValueError` and fires ordered `on_exit → flip → on_enter` hooks.
A Layer-3 typed model (`system-models/state_machines.py`, 83 `ConstraintBlock`
invariants) **looks up** (imports) those same tables at import time (rule #42) and a
BLOCKING drift lint reconciles them. **The load-bearing gap:** `self.state` is a
public attribute and there is **no lint banning raw `sm.state = X` assignment** —
centralization rests on convention + hooks-fire-only-through-`transition()`, not a
bypass-preventing static check. **REPO-FACT, high** (R3 §0, §3, §6).

**(F) Authority is displaced off the model-checker onto lints + one Python test.**
The verification tier of each invariant is **DERIVED** from its structural shape
(≥2 participant lanes ∧ a race-shaped coordination primitive → HAIRY; temporal
operator → safety vs liveness), and a **BLOCKING** lint (rule #57,
`lint-invariant-verification-tier.py`) forces every invariant to *cite a checker of
the mandated kind whose path resolves on disk*. Companion BLOCKING lints check the
`.tla` property *line* matches the model predicate (`lint-tla-property-matches-model.py`),
the model transition relation equals the code tables (`lint-state-machine-model-drift.py`),
and the modeled recovery driver exists in prod before the old fleet is deleted
(`lint-sweep-cron-exists-before-scaler-delete.py`). The model-checking *result*
gates nothing automatically; the *structure and correspondence-of-names* is what
holds. This is the repo's own "guidance aims, machinery holds" doctrine —
faithfully applied, with the consequence that **the TLA+/TLC layer by itself holds
nothing in the workflow.** **REPO-FACT + ENG-INTERP, high** (R1 §8; R4 §3; R5 §5).

**The single strongest defensible sentence for the whole subject:**

> DocAble authors small, bounded TLA+ specifications for three concurrency /
> liveness protocols and pins their invariants to a typed invariant registry; for
> the lease *safety* core it additionally maintains an independent, CI-runnable
> exhaustive Python BFS model-checker with real-runtime cross-checks (the actual
> gate). TLC execution is a dev-only / manual belt-and-suspenders step, there is no
> implementation-level bounded model checking, and the TLA+↔implementation
> relationship is established by **shared invariants + naming/line drift-lints + a
> hand-maintained 1:1 mirror — not by refinement, codegen, or BMC.**

---

## 2. What formal machinery exists

### 2.1 The four `.tla` specs (R1 §1)

| `.tla` | location | status | automated runner |
|---|---|---|---|
| `lease.tla` | `docs/epics/closed/job-inflight-lease-accounting-260709/` | authoritative (LIVE-referenced from a closed-Epic dir) | **YES** (`run-tlc.py`, Java-gated, SKIPs by default) + independent Python BFS |
| `spec/INV18AsyncTermination.tla` | `spec/` | authoritative (LIVENESS_TLC, INV-18) | **NO** — manual runbook + lints only |
| `spec/INVFO2FanoutTermination.tla` | `spec/` | authoritative (LIVENESS_TLC, INV-FO-2) | **NO** — manual runbook + lints only |
| `spec/INV1Claim.tla` | `spec/` | **THROWAWAY pilot** (self-labelled); models the retired ZPOPMIN plane | **NO** — historical |

### 2.2 The three techniques, kept distinct

1. **TLA+/TLC** (offline formal). Real specs + `.cfg` configs + a typed sole-seam
   invoker (`tools/formal/tlc_invoker.py`, `TlcInvoker`) + a runner (`run-tlc.py`)
   + a Java-gated e2e pytest that SKIPs without Java. Only `lease.tla` is wired.
2. **Exhaustive explicit-state BFS over abstract Python models** (in-repo, CI-run).
   `web/test_simworld/_model_check.py::enumerate_reachable` BFS-closes the whole
   reachable set of a frozen-dataclass state + pure `successors` relation, checking
   named invariant predicates at every state, with a falsifiability toggle. This is
   what rule #57 calls SAFETY_BFS. ~34 test files, ~176 test functions.
3. **Runtime cross-check (SimWorld)** — the REAL production dispatch bodies driven
   over the real `RedisQueue` backed by `fakeredis` + a dict `FakeDb`, only I/O
   leaves stubbed. This PINS each abstract model to the as-built code path.

### 2.3 The runtime concurrency protocols being modeled (R5 §1)

- **Product plane** (the job pipeline): ownership = a **PostgreSQL row CAS**
  (`web/persistence/jobs.py:update_job`, `UPDATE … WHERE id=? AND status=?`);
  crash-safety = **Cloud Tasks lease/ack**; the merge span = a **Redis in-flight
  lease with an epoch fence** (`shared/lua/lease_release_cas.lua`,
  `lease_reclaim_reissue.lua`); preemption requeue with priority preservation.
- **Agent plane** (the fleet substrate that writes the code): ownership = **OS
  `flock`** (merge-train, serializers, agent-registry); dedup = a **3-state
  tombstone registry SM** with PID-liveness; batching = **Maximum Independent Set**
  over non-conflicting worktrees; authority = the **merge-train full-CI gate**.

### 2.4 The state-machine surface (R3 §1)

Eight Enum state types in one Layer-0 module (`web/jobtypes/statemachine.py`), six
of them runtime-driven by a `JobStateMachine` construction site, each with a
hand-authored transition table; two (`CliSubprocState`, persisted `JobStatus`) are
*models* of a lifecycle with no runtime `JobStateMachine` driver.

### 2.5 The invariant registry (R4 §1)

`system-models/state_machines.py` — 83 frozen `ConstraintBlock` invariants,
verification tier DERIVED (rule #57): **63 LINEAR_PROPERTY** (→ property test),
**18 SAFETY_BFS** (→ SimWorld), **2 LIVENESS_TLC** (→ `.tla`, INV-18 + INV-FO-2).

### 2.6 The governing lints (the real authority)

`lint-invariant-verification-tier.py` (#57, BLOCKING), `lint-state-machine-model-drift.py`
(S-1, BLOCKING), `lint-tla-property-matches-model.py` (P4, BLOCKING),
`lint-invariant-operator-checker-match.py` (P3, BLOCKING),
`lint-sweep-cron-exists-before-scaler-delete.py` (BLOCKING),
`lint-no-tla2tools-in-prod-image.py` (BLOCKING),
`lint-state-machine-reachability.py` (S-2, currently AUDIT-ONLY),
`lint-tlc-invoker-sole-seam.py` (AUDIT-ONLY).

---

## 3. Protocol deep-dive #1 — the in-flight LEASE fencing core

*(Full chain + state trace: [`e2e-inflight-lease-fencing-260815.md`](e2e-inflight-lease-fencing-260815.md). Summarized here.)*

This is the one protocol where the entire modeling → checking → implementation
chain reconstructs, and it is where the assurance is genuinely strongest —
**because the load-bearing checker is executable and Java-free and cross-checks the
real runtime**, not because TLC runs.

- **Engineering problem.** A parent job holds a span across the merge window
  ("GAP-B"). A stale-lease reclaim re-issues the work to a new pod while the
  original may still be alive and fire a *late terminal clear on its OLD epoch* →
  split-brain double-terminal / a stranded requeued copy (the scaler reads demand=0
  and sleeps s2z while the job is genuinely in flight). A leaked lease on a DONE
  parent inflates demand forever (the "r7 phantom"). These live in *interleavings*,
  where example tests are weakest.
- **Behavioral model.** States `QUEUED → CLAIMED → MERGING → DONE`; variables
  `lease[j]` (epoch), `held[j]`, `origLive/origHeld`, `leaseClears[j]`, `clock`,
  `sleeping`, `termRequeue`. 11 actions; the fence is `CasRemoves(cur,snap) ==
  ~EpochFence ∨ cur = snap` (clear only if the clearer's snapshot epoch equals the
  current lease epoch). Bounds: Jobs 2–3, clock ~6.
- **Invariants.** SAFETY: `INV_Lease`, `INV_NoDoubleTerminal` (`leaseClears[j] ≤ 1`),
  `INV_NoForeverLeak` (`~termRequeue`), `INV_TerminalNotRequeued`. LIVENESS:
  `LIVE_IdleEventuallySleeps` (`AllDoneNoLease ~> sleeping`), `INV_NoPersistentOverCount`.
- **TLA+.** `lease.tla`; repo↔spec map documented in `lease-formal-verification-README.md`
  ("Fencing-core → source-of-truth map").
- **TLC.** `run-tlc.py --green` / `--falsify {epochfence|terminalcheck|reconcile}`;
  runs only with Java, SKIPs otherwise, not in CI.
- **Implementation correspondence (the load-bearing move, NOT TLC).** The
  executable proof is `test_lease_model_check.py`: an in-repo, Java-free exhaustive
  BFS whose `_LeaseModel` is asserted a **1:1 mirror** of the `.tla` actions,
  plus `test_model_matches_runtime_*` that drives the real Lua/completer and
  asserts agreement. Three independent representations of the same invariant set:
  the `.tla`, the Python `_LeaseModel`, and the runtime.
- **What binds them.** Engineering intent + naming/ID lints
  (`test_lease_invariant_id_crosscheck.py`, BLOCKING pin) + a re-check runbook.
  **No mechanized proof that `lease.tla` `Spec` and `_LeaseModel` are semantically
  equal — the "1:1 mirror" is hand-maintained. This is exactly where human judgment
  enters.**
- **Authority.** The Python BFS checker is an ordinary pytest → runs pre-deploy /
  in the merge-train CI gate → a violation fails the gate. TLC is advisory. The
  lease safety invariants are authoritatively gated — by the Python checker.

---

## 4. Protocol deep-dive #2 — DB-CAS work-item ownership (the pervasive pattern)

*(Full chain + state trace: [`e2e-db-cas-work-item-ownership-260815.md`](e2e-db-cas-work-item-ownership-260815.md). Summarized here.)*

Where the lease is the exotic crown jewel, this is the **pervasive** ownership
protocol: every work-item handoff in the pipeline is a **PostgreSQL row CAS**, and
it is where *runtime* authority is strongest even though there is **no TLA+ for it**.

- **The primitive.** `web/persistence/jobs.py:update_job(job_id, expected_status,
  **kwargs)` issues `UPDATE jobs SET … WHERE id=%s AND status=%s`; `rowcount == 0`
  means another writer won. The `WHERE` clause is the compare, the row write is the
  swap, `rowcount` is the outcome — a genuine CAS at the database row.
- **The CAS family + invariants.** INV-1 (queue-claim atomicity; the chunk CAS
  `STATUS_QUEUED → STATUS_REMEDIATING` + Cloud Tasks lease/ack is the runtime
  enforcement), INV-14 (quota-gate at-most-once billing, `SQL_CAS`), INV-15
  (introducer at-most-once fan-out, `SQL_CAS`), INV-P2 (`update_job` guarded
  transition). Each is pinned by an exhaustive-BFS model-check test with a
  falsifiability toggle (e.g. INV-14's naive status-guard reaches the double-reserve
  sink).
- **Crash-safety.** The CAS handles *concurrency*; the Cloud Tasks **lease/ack**
  handles *crash* (the HTTP 200 IS the ack; a crash before ack re-delivers). This
  replaced the retired ZPOPMIN Lua-atomic reservation — the invariant PREDICATE
  (no-loss single-claimer) is plane-neutral; the mechanism moved from Redis Lua CAS
  to DB-CAS + managed lease/ack.
- **Correspondence & authority.** No `.tla` and no TLC. The tie is: the SQL-CAS IS
  the runtime constraint (double-claim unrepresentable — only one `UPDATE` matches
  the row), and INV-1/14/15's SAFETY_BFS SimWorld tests (some driving the REAL
  `atomic_zpopmin.lua` and real SM under `fakeredis`) pin the at-most-once property
  over fuzzed/enumerated interleavings. Authority = the pytest gate + rule #57's
  BLOCKING "this HAIRY invariant HAS a checker."

**Why this deep-dive matters for the book:** it is the honest counterexample to
"formal methods = TLA+." The *most impactful* concurrency correctness in DocAble is
a one-line SQL `WHERE` clause whose authority is *structural at runtime*, checked by
exhaustive BFS, with no formal spec at all. The formal apparatus is reserved for the
*one* protocol (the lease) whose correctness genuinely could not be made structural
by a single CAS.

---

## 5. TLA+ / TLC analysis

- **Genre adoption (A.9 / rule #22).** DocAble adopts the TLA+ schema faithfully:
  all three live specs share a house pattern — a small bounded finite transition
  system, a monotone/absorbing safety companion, one `~>` or `[]` property, a
  `FairSpec` refinement so TLC can check the temporal property, and a single guard
  CONSTANT flipped OFF to prove teeth.
- **Bounds** are uniformly tiny (Jobs 2–3, MaxSteps ≈ 4–6, NumChunks 3) and framed
  as "the bounds ARE the sound guarantee": finite reachable set → exhaustive. This
  is legitimate *bounded model checking of a hand-abstracted model*, NOT unbounded
  proof and NOT implementation BMC.
- **Three execution regimes coexist.** (1) `lease.tla` — automated but SKIP-by-
  default (no Java in CI). (2) INV-18 / INV-FO-2 — never automated; only a manual
  `java … tlc2.TLC` in the cfg comment. (3) INV1Claim — throwaway pilot, manual
  only, models a retired plane.
- **The liveness honest-limit case (INV-18).**
  *(Full chain: [`e2e-inv18-async-termination-liveness-260815.md`](e2e-inv18-async-termination-liveness-260815.md).)*
  `LIVE_EventualTerminal == Submitted ~> Terminal` under serverless `min=0`, with
  `FairSpec` conjoining `SF_vars(Deliver)` (strong fairness = a formalization of
  at-least-once delivery) and `WF_vars(SweepCron)`; `Lose` deliberately unfair;
  falsifiability toggle `SweepCronOn=FALSE` yields a TLC lasso. This is a genuine
  liveness obligation a finite-trace BFS **cannot** falsify — which is *why* rule
  #57 routes it to LIVENESS_TLC and mandates a `.tla`. But **no runner executes it**;
  its automated governance is three BLOCKING lints (property-line match; the `.tla`
  exists+resolves; the modeled `SweepCron` recovery driver exists in prod before
  `web/scaler.py` is deleted). INV-FO-2 is structurally identical (fan-out level;
  models the real staging incident `b0ac589992c7` "stuck at 1/3").
- **Doc-rot findings (ENG-INTERP, high).** Both INV-18 and INV-FO-2 docstrings — and
  `lint-tla-property-matches-model.py` — cite `spec/INV5ScalerLiveness.tla` /
  INV-5 as "the proven exemplar," but that spec was **deleted** and INV-5 **retired**
  with the GKE→CloudRun migration. Not a functional break (the live LIVENESS_TLC set
  is only INV-18 + INV-FO-2, both resolving), but real doc rot. Separately,
  `spec/INV1Claim.tla` models the retired ZPOPMIN plane and should be marked
  HISTORICAL or deleted.

---

## 6. Implementation-level BMC analysis

**REPO-FACT (high, five independent sweeps): none exists.** No CBMC, no Klee, no
Z3/SMT/SAT, no symbolic unwinding, no implementation-level bounded model checker, no
derived-from-invariant implementation assertions generated by any such tool. Grep
for `cbmc|z3|smt|apalache|nusmv|klee` returns only a lint-test fixture string and a
doc-format marker — never a solver.

In this repo "bounded model checking" resolves to exactly two things, **both checks
of an abstract model, not object code**:
- the bounded TLA+/TLC model (only `lease.tla` executed, and only with Java), and
- the bounded Python BFS enumeration (`enumerate_reachable`, 2–3 parents / N≈3
  chunks / a few ticks).

The nearest *true* implementation-touching statement is the lease
`test_model_matches_runtime_*` cross-check and the genre-(b) SimWorld tests (e.g.
`test_inv1_atomic_claim.py` driving the REAL `atomic_zpopmin.lua` + real SM under
`fakeredis`): these are **conformance/property tests against an independently-
authored obligation over fuzzed or enumerated interleavings** — bounded, contingent
on `fakeredis`/`FakeDb` faithfully modeling Redis/Postgres — **not BMC and not a
refinement proof.**

Consequence: the MAGE clause "implementation-level bounded model checking
establishes corresponding properties over selected concrete components" is **NOT
substantiated.** The corrected clause: *exhaustive-BFS model checking (and TLC for
one closed-Epic spec) establishes properties over hand-authored abstract models;
some SimWorld tests additionally fuzz REAL code paths under a fake substrate.*

---

## 7. Model ↔ implementation correspondence (the central analytical issue)

Walking the mining brief's §3 menu, the true relation **differs by layer** — naming
one option flat would over- or under-claim. Four distinct correspondence questions,
answered at four strengths:

**7.1 Transition RELATION ↔ code transition tables — MECHANICALLY CHECKED (strongest
link).** The model does not copy the tables; it **looks them up** (imports
`web/jobtypes/statemachine.py`'s `*_TRANSITIONS` at import time, rule #42) and a
BLOCKING drift lint (S-1) set-diffs `StateMachineSpec.transitions/states/terminal_safe`
against them. So the model and code **cannot disagree on the transition relation** —
it is the same Python object. This is the brief's option *"a mechanically checked
mapping between model and implementation states/transitions"* — TRUE, but scoped to
the relation only, not the invariants and not the dynamics.

**7.2 Invariant ↔ its checker (SAFETY_BFS / LINEAR) — INDEPENDENT REPRESENTATION,
existence+kind enforced only.** Rule #57 checks a checker of the mandated kind
*exists and resolves* — it does **not** run it and does **not** prove the checker's
predicate equals the `ConstraintBlock`'s prose predicate. A `verify_refs` pointing
at an empty test would satisfy it. And the 18 SAFETY_BFS checkers are **two genres**:
(a) exhaustive-BFS over a **hand-authored abstract Python model** (`*_model_check.py`)
— epistemically the *same status as TLC-over-`.tla`*, i.e. an abstract re-model, not
the code; (b) Hypothesis-fuzzed interleavings driving **REAL production code** (e.g.
`test_inv1_atomic_claim.py`) — genuine implementation-level assurance, but bounded-
fuzz and contingent on fake-substrate fidelity. Rule #57 does not distinguish these.
So "SAFETY_BFS ⇒ the implementation is checked" is **false** — roughly half re-model
in Python.

**7.3 Invariant ↔ `.tla` temporal property (LIVENESS_TLC) — TEXT-MATCHED PROPERTY
LINE.** `temporal_form_to_tla_property(inv)` emits `<name> == <predicate>` (INV-18:
`LIVE_EventualTerminal == Submitted ~> Terminal`) and `lint-tla-property-matches-model.py`
asserts whitespace-normalized equality of that ONE line. The lint's own docstring:
*"the full state/action spec (Init/Next/vars/the action bodies) stays hand-authored."*
So the enforced correspondence is "the `.tla` file exists AND its `LIVE_*` line
textually matches the model's predicate" — the action bodies could model a different
transition system and only the property *string* is policed.

**7.4 `.tla` / abstract model ↔ implementation code — INTENT + DOCUMENTATION ONLY
(weakest link).** `satisfy_refs` point at runtime enforcement sites (INV-18 →
`web/job_completer.py:_recover_orphaned_jobs`), but they are **existence-checked
only** (path exists + symbol appears). Nothing proves the code enforces the
invariant. For the code-conformance leg the answer is squarely *"related only by
engineering intent/documentation."*

**Where model↔implementation drift can still occur (high confidence):**
- The lease `lease.tla` ⇄ `_LeaseModel` "1:1 mirror" is **hand-maintained**; the
  only automated guard is invariant-ID equality + a re-check runbook that trusts a
  human to notice a fencing-core edit.
- INV-18 / INV-FO-2 `.tla` action bodies are **not** matched to the model — only the
  single property line is.
- `satisfy_refs` are string paths+symbols; a rename a lint doesn't cover drifts
  silently.
- Real Redis / Cloud-Tasks / Postgres semantics vs `fakeredis` / `FakeDb`.
- A raw `sm.state = X` write bypassing the `transition()` guard (no bypass lint).
- Hand-authored `*_TERMINAL_STATES` frozensets "derived" only by comment.

---

## 8. How authority is attached

The brief's §7 assurance-chain table, merged across regions to one canonical view:

| Layer | Artifact | Claim established | Strength | Important limitation |
|---|---|---|---|---|
| Behavioral model | 8 Enum SMs (`jobtypes/statemachine.py`) + abstract `.tla`/`_LeaseModel` systems + 83-invariant `ConstraintBlock` registry | states / transitions / invariants are explicit, typed, enumerable | Strong (SMs, lease) / Medium (liveness specs, hand-authored, unrun) | abstraction chosen by hand; INV-1 spec models a retired plane; 2 of 8 SMs are models with no runtime driver |
| TLA+ | `lease.tla`, `INV18…`, `INVFO2…` (+ throwaway `INV1Claim`) | invariants + `~>`/`[]` properties stated formally, with falsifiability CONSTANTS | Medium | documented artifacts; only `lease.tla` has a runner; INV-5 exemplar deleted (doc rot) |
| TLC | `run-tlc.py` + `test_lease_tlc_e2e.py` | `lease.tla` green + 3 falsify "teeth" **when Java present** | Weak-in-workflow | SKIPs by default (no Java / no `.github/workflows/`); INV-18/FO-2 never automated |
| Correspondence (transition relation) | rule #42 import-lookup + S-1 drift lint (BLOCKING) | model transition relation = code tables | **Strong (mechanical)** | relation only; not dynamics, not invariants |
| Correspondence (invariant / property) | `test_lease_invariant_id_crosscheck` (BLOCKING pin); `lint-tla-property-matches-model` (BLOCKING); lease `test_model_matches_runtime_*` | invariant IDs match; `.tla` property LINE matches model; lease abstract model agrees with real runtime on sampled scenarios | Medium | IDs + property-*line* only for INV-18/FO-2; lease "1:1 mirror" hand-maintained; **no semantic-equivalence proof** |
| Bounded model check (of abstract model) | `enumerate_reachable` BFS over abstract Python models | exhaustive safety over the small bounded space, falsifiability-toothed | Strong **within bound** | explicit-state, bounded params; abstract model not code; safety only |
| BMC (implementation-level) | — | — | **None** | no CBMC / SAT / SMT / impl-BMC exists |
| Code conformance | `satisfy_refs` + monitor-exists lints | a named prod site exists for each invariant | Weak | existence of pointer only; no proof the code enforces the invariant |
| CI / gate | Python BFS pytest (unit tier) + BLOCKING lints (#57 tier, S-1 drift, P3 operator-match, P4 property-match, sweep-cron-exists, no-tla2tools-in-prod) | lease safety gated; every HAIRY invariant HAS a resolving checker; property line matches; recovery driver exists | Strong (structure + lease safety) | the model-checking **result** is not gated; liveness is line-matched not checked; the lint checks checker *existence*, not *adequacy* |

**Mechanism classification (MAGE Alignment axis; no stretching):**
- **Constraint** (makes illegal states unrepresentable): `update_job` DB-CAS; Cloud
  Tasks lease/ack; epoch-fence `lease_release_cas.lua`; `flock` mutual exclusion;
  merge-train MIS; the 3-state tombstone SM; `JobStateMachine.transition()`'s
  `ValueError` (a *soft/runtime* constraint — holds only if the caller uses the
  primitive); `lint-no-tla2tools-in-prod-image.py`.
- **Sensor**: lease stale-scan; `satisfy_refs` pointers; SimWorld (observes real-code
  state); `run-tlc.py` / `test_lease_tlc_e2e.py` (dev, SKIPs — advisory).
- **Validator**: `enumerate_reachable` / SimWorld model-check tests; the DDT + PBT
  state-machine tests; S-1 / P3 / P4 drift lints (also Gates).
- **Gate**: `lint-invariant-verification-tier.py` (blocks deploy on a missing
  checker — a Validator-of-completeness wired as a Gate); `lint-no-failure-requeue.py`;
  the merge-train / tombstone full-CI gate; the unit-tier pytest gate.

**Do not stretch:** the `.tla` file itself is neither Constraint, Sensor, Validator
nor Gate in the live workflow — it is *documentation of a modeled protocol*, and its
would-be Validator role (TLC) is inert.

---

## 9. Mapping to MAGE: Modeling → Alignment → Correspondence → Engineering capital

**Modeling.** The explicit representations that make previously-intractable
properties tractable: (1) the **lease/ownership + epoch-fence model** ("can two
workers hold/clear one job's lease?" → `INV_NoDoubleTerminal`); (2) two **liveness
temporal invariants** naming the eventual-termination obligation the serverless
`min=0` cutover created (`Submitted ~> Terminal`, `WaitingWithMissingChunks ~>
AllChunksTerminal`); (3) the per-lifecycle **transition relation** (`dict[State →
set[State]]`) + the composed **process-view model**; (4) the **verification-tier
derivation** itself — an explicit (H1: ≥2 lanes; H2: race-primitive; operator) →
tier function, so an invariant *cannot lie about its own difficulty*. Each converts
"reason about all interleavings / all reachable states in your head" into an
enumerable, tier-routed question.

**Alignment.** See §8. The clarifying finding: **the alignment authority is
displaced off the model-checker onto lints + an independent executable checker.** TLC
"aims" (an inert/dev sensor); the BLOCKING lints and the Python BFS pytest "hold."
This is a faithful instance of the repo's own doctrine ("guidance aims, machinery
holds") — but it means **the TLA+/TLC layer, by itself, holds nothing in the
workflow.** The verification-tier lint is a **Constraint + Gate on the registry's
completeness** ("a HAIRY invariant with no interleaving checker" is
unrepresentable-at-green) — one level removed from "the property holds."

**Correspondence.** The four levels the brief asks for:
- *model correctness* — established for lease (exhaustive BFS, 0 violations to bound;
  TLC green+falsify when Java present) and asserted-by-runbook for INV-18/FO-2.
- *model/implementation correspondence* — MECHANICAL for the **transition relation**
  (rule #42 + S-1); runtime cross-checks (real Lua/completer) for the lease;
  INTENT-only for the **invariant→code enforcement** leg (`satisfy_refs`).
- *implementation conformance to an independently-authored obligation* — the lease
  Python checker + the genre-(b) Hypothesis tests driving real code are the strongest
  instances; NOT via any BMC.
- *acceptance by a workflow gate* — YES for the registry-completeness + drift lints
  and the Python pytest; NO hard gate for TLC execution.

**Engineering capital.** Once this machinery exists, engineers stop re-deriving, on
every scaler/completer/dispatch/state-machine change: *"can two workers own one
item?"* (SQL-CAS + INV-1 BFS answer it every run), *"can a reclaim double-clear a
lease?"* (the epoch fence + lease BFS answer it every run), *"can a lost push strand
a job forever under min=0?"* and *"does deleting the old fleet lose eventual
termination?"* (INV-18/FO-2 answer it once by a bounded TLC design + thereafter pin
it via the sweep-cron-exists + property-match lints), *"is this the legal next
state?"* (the transition table answers), *"can a job end mid-pipeline without
terminating?"* (`ensure_terminal` + reachability lint), *"can the DB say completed
with no file?"* (the RecoveryState table makes it unrepresentable), *"does this
invariant need state-space reasoning?"* (the derived tier answers structurally). The
recurring interleaving analysis a reviewer would redo per concurrency change is
retired — bounded.

---

## 10. Assurance limits

**What is actually guaranteed (deterministically, at green):**
1. For the lease *safety* invariants: on every pre-deploy / merge-train run, an
   exhaustive Java-free BFS proves no invariant is violated on any reachable
   interleaving up to 2–3 parents / clock 4–6, AND the abstract model agrees with the
   real runtime CAS logic on the sampled scenarios. A genuine, gating,
   implementation-touching guarantee (within the bound).
2. At runtime, single-claimer ownership and no-double-clear are **structural**
   (SQL-CAS + Cloud Tasks ack + epoch-CAS Lua make the illegal state unrepresentable).
3. Within any driver that USES a `JobStateMachine`, an illegal transition is
   impossible (raises `ValueError`); the RecoveryState table makes "DB completed
   before file uploaded" unrepresentable by construction.
4. Every invariant carries a stored tier equal to its derivation; every invariant
   cites a checker of the mandated kind whose file resolves; the model's transition
   relation equals the code's; the 2 liveness invariants' `.tla` property line
   textually matches the model.

**What is merely checked within bounds:** everything TLC — and it is checked only
manually / when a dev has Java. All "exhaustive" BFS claims hold only for 2–3 parents
/ N≈3 chunks / ≤2 redeliveries / a few ticks, over `fakeredis` + `FakeDb`. The `~>`
liveness of INV-18 / INV-FO-2 is *modeled and falsifiable* but not run in any
automated gate. Roughly half the SAFETY_BFS checkers exhaustively check an *abstract
Python re-model*, not the code.

**What still relies on human judgment (the seams the machine does not close):**
1. That the `.tla` / `_LeaseModel` / runtime are truly the same protocol (the "1:1
   mirror" + re-check runbook).
2. That the INV-18 / FO-2 `.tla` *action bodies* model production faithfully (only
   the property line is lint-checked).
3. Choice of `coord_primitive` and `participant_lanes` (the *inputs* to the tier
   derivation — mechanical *given* the inputs, but the inputs encode judgment; some
   invariants are modeled HAIRY to *document a rejected design*).
4. Semantic equivalence of a `ConstraintBlock` predicate and its checker's modeled
   predicate (unenforced — a checker could test a weaker property and still satisfy
   rule #57).
5. `satisfy_refs` = "this code enforces this invariant" (existence-checked only).
6. Choosing the bounds (2–3 parents) as sufficient; running TLC at all.
7. That all state mutations route through `transition()` (no bypass lint); that
   hand-authored terminal-state frozensets match their tables.

**Where model/implementation drift can still occur:** §7's drift list — the hand-
maintained lease mirror, the unmatched liveness action bodies, `satisfy_ref`
renames, fake-vs-real substrate semantics, a raw `sm.state =` bypass, and a new
`update_job(status=…, expected_status=…)` write site adding a persisted-status edge
not reflected in `JOBS_STATUS_TRANSITIONS` (which the CAS does *not* consult at
runtime — the persisted lifecycle has two independent representations of "legal
transition," related by intent + the S-1 lint, not a runtime dependency).

---

## 11. Recommended strengthening (cost-classified)

**Small / mechanical:**
- **Fix the doc rot.** Update the stale `INV5ScalerLiveness.tla` / INV-5 references
  in `lint-tla-property-matches-model.py` and the two live `.tla` docstrings; mark
  `spec/INV1Claim.tla` HISTORICAL or delete it (models the retired ZPOPMIN plane).
- **Generalize `run-tlc.py` beyond lease.** It hardcodes `_LEASE_TLA`; a small
  `--spec {lease|inv18|invfo2}` table lets the same Java-gated e2e *exercise* INV-18 +
  INV-FO-2, closing the "never automatically run" gap (still SKIP-without-Java).
- **Compute `*_TERMINAL_STATES` from `*_TRANSITIONS`** (or add an equality lint)
  instead of the "derived"-by-comment hand-authored literals — removes a drift
  surface.
- **A `verify_refs`-names-its-inv-id lint:** grep each SIMWORLD/TLA_TLC checker file
  for the `inv_id` it claims to check, closing the existence→relevance gap in §7.2.
- **A machine-readable fencing-core manifest** mapping each runtime symbol → its
  `_LeaseModel` action → its `lease.tla` action, lint-walked (replaces the prose
  "Fencing-core → source-of-truth map").

**Moderate:**
- **A `sm.state =` bypass ban-lint** (AST: attribute-store to `.state` on a
  `JobStateMachine`-typed target, outside `statemachine.py`) — converts transition
  centralization from convention to Constraint (the rule-#15 pattern for SMs). *The
  single highest-leverage gap in the state-machine region.*
- **A `lease.tla` action-set == `_LeaseModel` action-set lint** — mechanize the
  1:1-mirror the runbook currently trusts to humans.
- **Put a Java runtime in CI (or a container step)** so `test_lease_tlc_e2e.py` runs
  instead of SKIPs, and add INV-18 / FO-2 — converts the TLC layer from advisory
  sensor to a real (belt-and-suspenders) validator. Cost: a JRE in the CI image +
  ~2s wall.
- **A `.tla`-action ↔ `satisfy_refs` parity check for INV-18 / FO-2** — raise
  correspondence above "property-string-only."
- **Promote S-2 reachability to BLOCKING** once the retired-`check`-mode orphan states
  are pruned or a declared-orphan allowlist is modeled.
- **A traceability manifest** mapping each `ConstraintBlock` predicate token to the
  corresponding checker predicate symbol — makes the "semantic equivalence is
  human-judged" seam auditable.

**Research-grade (do NOT reflexively build):**
- A genuine formal refinement / mechanized `.tla` ⇄ `_LeaseModel` equivalence proof,
  or CBMC over a concrete component. **Not justified by current engineering value** —
  the runtime cross-checks + exhaustive BFS + SQL-CAS structural constraints already
  catch the defect classes that matter; a full refinement would be heavyweight for a
  per-job fence over a bounded protocol.

---

## 12. Evidence ledger (consolidated, key claims)

1. **Only 4 distinct `.tla` files exist** (~81 is worktree-copy inflation).
   *Evidence:* `find . -name '*.tla'` deduped; `spec/` + lease-Epic listings.
   *Confidence:* high. (R1 §0)
2. **Only `lease.tla` has an automated TLC runner; it SKIPs without Java, not in
   CI.** *Evidence:* `tools/formal/run-tlc.py:77-82` (hardcoded `_LEASE_TLA`);
   `test_lease_tlc_e2e.py:86` (`skipif not _deps_available()`);
   `lease-formal-verification-README.md:26-31`; no `.github/workflows/`.
   *Confidence:* high. (R1 §2, R4 §5, R5 §5.2)
3. **INV-18 / INV-FO-2 are the only live LIVENESS_TLC invariants; both `.tla` resolve;
   INV-5 (`spec/INV5ScalerLiveness.tla`) was retired.** *Evidence:* live
   `invariants()` enumeration; `state_machines.py:989-994, 1361-1383`.
   *Confidence:* high. (R1 §5, R4 §13)
4. **The lease load-bearing gate is the Python BFS checker + runtime cross-checks,
   NOT TLC.** *Evidence:* `lease-formal-verification-README.md:16-57, 72-86`;
   `web/test_simworld/test_lease_model_check.py`. *Confidence:* high. (R1 §3, R2 §7,
   R5 §2)
5. **No BMC / CBMC / SAT / SMT / impl-level verification anywhere.** *Evidence:*
   comprehensive tool/invocation search (nil) across five regions. *Confidence:*
   high. (R1 §6, R2 §0/§3, R4 §6, R5 §0)
6. **Authority is BLOCKING lints + a Python pytest; TLC is advisory.** *Evidence:*
   `batch_e.py` registrations (`sweep-cron-exists`, `verification-tier`,
   `property-match`, `state-machine-model-drift` all `blocking=True`);
   `test_lease_tlc_e2e.py` SKIP. *Confidence:* high. (R1 §8, R4 §3, R5 §5)
7. **`.tla` ↔ impl is "same invariant, independently represented + name/line drift-
   lints," not refinement/codegen.** *Evidence:* `lint-tla-property-matches-model.py:16-21`
   ("the full state/action spec … stays hand-authored"); rule #42 import-lookup;
   S-1 drift lint. *Confidence:* high. (R3 §6c, R4 §4)
8. **The model looks up the code's transition tables (rule #42) — the one genuinely
   mechanical correspondence.** *Evidence:* `state_machines.py:98,132` (`_load_statemachine_module`,
   `_transitions_of`); S-1 drift lint BLOCKING. *Confidence:* high. (R3 §6c, R4 §4.1)
9. **Verification tier is DERIVED from structure (rule #57).** *Evidence:*
   `state_machines.py:463` `derive_verification_tier`; `_make_invariant` always calls
   it. *Confidence:* high. (R4 §2)
10. **The epoch-fence split-brain is the documented motivating failure; fence-off →
    BFS finds 4,184 violation states; production config → 0 over 38,891 / 177,717.**
    *Evidence:* `lease-formal-verification-README.md:74-86`; `run-tlc.py:88-93`.
    *Confidence:* high. (R1 §11, R5 §2.5)
11. **`self.state` is a public attribute; no bypass ban-lint exists.** *Evidence:*
    `web/jobtypes/statemachine.py:472`; `tools/lint/` grep (no transition-bypass lint).
    *Confidence:* high. (R3 §3)
12. **Pervasive ownership is a DB row CAS; crash-safety is Cloud Tasks lease/ack.**
    *Evidence:* `web/persistence/jobs.py:202-248` (`WHERE id=%s AND status=%s`,
    `rowcount`); `web/worker.py:2080-2093, 2354`. *Confidence:* high. (R5 §3)

**Distinguishing the three claim-types throughout:** *Repository fact* — the paths,
symbols, counts, SKIP-guards, and BLOCKING flags above. *Engineering interpretation*
— that authority is displaced onto lints, that the SAFETY_BFS set is two genres, that
the highest-leverage gap is a bypass lint. *MAGE interpretation* — mapping these onto
Modeling / Alignment / Correspondence / Engineering-capital in §9.

---

## 13. Book-ready claims (fully supported)

1. **DocAble maintains four TLA+ specifications** — three live (`lease.tla` safety +
   liveness, `INV18AsyncTermination` liveness, `INVFO2FanoutTermination` liveness) and
   one (`INV1Claim`) a self-labelled throwaway pilot for a now-retired queue plane.
2. **Each live spec follows a disciplined house pattern:** a small bounded transition
   system, an explicit safety and/or `~>` liveness invariant, a `FairSpec` refinement,
   and a **falsifiability toggle** — one guard flipped OFF that makes the checker
   *find* the counterexample, proving the check has teeth.
3. **For the in-flight-lease fencing core the assurance chain is genuinely complete
   and gating — but the load-bearing checker is an independent, Java-free, exhaustive
   Python BFS model-checker with real-runtime cross-checks, not TLC;** TLC is a
   dev-only belt-and-suspenders step (fence-off → 4,184 violation states; production
   config → 0 over 38,891 / 177,717 interleavings).
4. **Each async job lifecycle is centralized behind one generic
   `JobStateMachine.transition()` primitive** over a hand-authored transition table;
   an illegal transition raises `ValueError` at runtime and fires ordered
   `on_exit → flip → on_enter` hooks, exercised edge-by-edge by state-machine-coverage
   and Hypothesis property tests.
5. **Each invariant's required verification CLASS is DERIVED from its structural
   shape** (≥2 participant lanes ∧ a race-shaped coordination primitive → HAIRY;
   temporal operator → safety vs liveness), so the tier cannot be silently mis-
   declared; a BLOCKING lint (rule #57) forces every invariant to cite a resolving
   checker of the mandated kind.
6. **TLA+/TLC's authority in the workflow is displaced onto BLOCKING lints** (the
   `.tla` must exist + resolve; its temporal-property *line* must match the system
   model; the modeled recovery driver must exist in production before the old fleet is
   deleted) plus the Python pytest — the model-checking *result* itself gates nothing
   automatically.
7. **The model↔implementation relationship is "the same invariant, independently
   represented, plus naming/line drift-lints," with one genuinely mechanical tie:**
   the model *looks up* (imports) the code's transition tables at import time (rule
   #42) and a BLOCKING drift lint reconciles them — there is no formal refinement, no
   codegen, and no implementation-level bounded model checking.
8. **Pervasively, work-item ownership is a database compare-and-set
   (`UPDATE … WHERE id=? AND status=?`) and crash-safety is the Cloud Tasks
   lease/ack** — together making "two owners" and "lost item" structurally
   unrepresentable at runtime, each pinned by an exhaustive-BFS model-check test with
   a falsifiability toggle.
9. **The strongest single instance of engineering capital:** the question "can a
   split-brain reclaim double-clear one job's lease?" is answered once by the epoch-
   fence design and thereafter re-checked exhaustively on every pre-deploy run —
   retiring the per-change human interleaving analysis it replaces.
10. **The agent fleet that writes the code runs the same governance shape one layer
    down:** `flock` mutual exclusion, a 3-state tombstone-dedup registry with PID-
    liveness reclaim, Maximum-Independent-Set batching of non-conflicting worktrees,
    and a full-CI merge-train gate before any change fast-forwards main.

---

## 14. Claims we should NOT make (tempting but unsupported overclaims)

1. ✗ **"BMC proves the implementation conforms to the TLA+ spec."** There is **no
   BMC / CBMC / SAT / SMT** and **no refinement** anywhere. The nearest true statement
   is a *conformance test* of real Lua/completer code against an abstract model that
   shares the invariants. *(Top-3 — the single most important overclaim to avoid.)*
2. ✗ **"TLC runs in CI and gates merges / deploys."** The TLC e2e **SKIPs** without
   Java (absent in the default env), INV-18 / FO-2 have **no runner at all**, and
   there is **no `.github/workflows/`**. Only BLOCKING lints + the Python BFS pytest
   gate. *(Top-3.)*
3. ✗ **"The implementation is generated from, or provably refines, the formal
   model."** No codegen, no refinement; correspondence is same-invariant-independently-
   represented + naming/line drift-lints + a hand-maintained 1:1 mirror. *(Top-3.)*
4. ✗ **"The TLA+ spec is continuously machine-checked."** Only its *existence* and its
   *property-line text* are continuously lint-checked; the model-checking is manual /
   dev-gated.
5. ✗ **"All three live liveness properties are verified."** They are *modeled and
   falsifiable*; INV-18 / FO-2 `~>` are never executed in an automated gate (and BFS
   provably cannot falsify `~>`).
6. ✗ **"Every invariant is model-checked."** 63/83 are LINEAR_PROPERTY → ordinary
   property tests; only 18 are BFS-checked; only 2 are TLA/TLC-tiered.
7. ✗ **"SAFETY_BFS means the implementation is exhaustively checked."** Roughly half
   the SIMWORLD checkers exhaustively check an *abstract Python re-model* (TLC-grade
   epistemic status, not the code); the code-driving ones are Hypothesis-fuzzed, not
   exhaustive.
8. ✗ **"Rule #57 proves each invariant is verified."** It proves a checker of the
   mandated KIND EXISTS and RESOLVES — it neither runs the checker nor proves the
   checker tests the invariant's predicate.
9. ✗ **"Raw state assignment is banned / a lint prevents bypassing `transition()`."**
   `self.state` is a public attribute; no bypass ban-lint exists. Centralization rests
   on convention + hooks-fire-only-via-`transition()`.
10. ✗ **"`JOBS_STATUS_TRANSITIONS` enforces the DB status transitions at runtime."**
    It is a MODEL; the runtime guard is `update_job`'s raw `status = expected_status`
    equality CAS, which does not consult the table.
11. ✗ **"The `.tla` action bodies are kept in sync with production."** Only the single
    temporal-property line is lint-matched for INV-18 / FO-2; the action bodies are
    hand-authored and unpoliced.
12. ✗ **"INV-5 scaler-liveness is a fourth checked spec"** / **"INV1Claim protects the
    live dispatch path."** INV-5 was retired (its `.tla` deleted — surviving only as
    stale doc-rot references); INV1Claim models the retired ZPOPMIN poll plane.
13. ✗ **"The exhaustive checks are exhaustive over the system."** Exhaustive only
    within tiny bounds (2–3 parents / N≈3 chunks / a few ticks), over `fakeredis` /
    `FakeDb`, `web/`-only; the C# remediation pipeline is out of scope by design.
14. ✗ **"The MIS / flock / tombstone agent-plane protocols are formally verified."**
    They are structural runtime constraints with a CI gate — no formal model exists for
    them; only the product-plane lease core is TLA+-modeled.

---

*End synthesis field note. Companion e2e deep-dives: lease fencing, DB-CAS ownership,
INV-18 async-termination liveness.*
