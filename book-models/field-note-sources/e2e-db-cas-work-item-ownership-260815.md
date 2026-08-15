<!--
PROVENANCE — field-note raw evidence (committed, NON-RENDERED).
Source draft: book/_design/drafts/formal-methods-mining-260815/ (gitignored working dir).
Home: book-models/field-note-sources/ — committed beside the field-note model, NOT under book/**,
so the catalog build's recursive book/**/*.md render glob does not pick it up (no orphan-reachability
gate applies). This is the durable evidence backing the formal-methods field-note entries in
book-models/field-notes.json (fn-db-cas-single-ownership, fn-lease-epoch-fencing, fn-inv18-liveness-gap),
consumed by book-models/substantiation.py as FieldNoteBacking. Model-registered evidence; not inline-cited.
-->

# E2E deep-dive — DB-CAS work-item ownership (the pervasive pattern)

End-to-end reconstruction of DocAble's *pervasive* concurrency protocol: every
work-item handoff in the job pipeline is a **PostgreSQL row compare-and-set**. This is
the honest counterexample to "formal methods = TLA+": the most impactful concurrency
correctness in the system is a one-line SQL `WHERE` clause whose authority is
*structural at runtime*, checked by exhaustive BFS, **with no formal spec at all.**

Chain: engineering problem → behavioral model → invariants → TLA+ (none) → TLC (none)
→ implementation correspondence → bounded model checking → authority, with a state
trace. Tags: **REPO-FACT** / **ENG-INTERP** / **MAGE-INTERP**.

---

## 1. Engineering problem

**REPO-FACT** (`web/worker.py:_claim_and_process_chunk:2062`; CLAUDE.md "Push-plane
atomicity"). The pipeline is a serverless push architecture: the web tier enqueues
chunks onto Cloud Tasks; each is delivered to a worker `POST /handle-chunk`. Two
failure classes must be impossible:

- **double-processing** — two workers (or a redelivered task) both process the same
  chunk → duplicate remediation, double billing, corrupted merge.
- **lost work** — a worker crashes after claiming but before finishing → the chunk is
  in a "neither queued nor in-flight" gap and never completes.

Cloud Tasks is *at-least-once*: redelivery is normal, so the claim must be idempotent
under concurrent + redelivered delivery.

---

## 2. Behavioral model

**REPO-FACT + ENG-INTERP.** Unlike the lease, this protocol is **not** given an
explicit `.tla` transition system. Its behavioral model is the **persisted status
lifecycle** modeled in `web/jobtypes/statemachine.py` (`JOBS_STATUS_TRANSITIONS`,
built by `_build_jobs_status_transitions()`), plus the composed-model invariants in
`system-models/state_machines.py`. The relevant state is a single Postgres column,
`jobs.status`, transitioning e.g. `STATUS_QUEUED → STATUS_REMEDIATING → …`. Ownership
is *whoever wins the CAS on the from-state*.

**Note (REPO-FACT):** `JOBS_STATUS_TRANSITIONS` is a *behavior-preserving model* of
the lifecycle; `update_job` does **NOT** consult it at runtime (see §6). The model and
the runtime CAS are two independent representations of "legal transition," related by
engineering intent + the S-1 drift lint, not a runtime dependency.

---

## 3. Invariants

**REPO-FACT** (`system-models/state_machines.py`).

| Inv | Description | Coord primitive | Runtime enforcement (`satisfy_ref`) | Checker |
|---|---|---|---|---|
| **INV-1** (`:886`) | Queue claim atomicity (single claimer, no loss) | `ATOMIC_CLAIM` | `worker.py:_claim_and_process_chunk` (chunk CAS + Cloud Tasks lease/ack) | SIMWORLD `test_inv1_atomic_claim.py` |
| **INV-14** (`:1213`) | Quota-gate at-most-once billing | `SQL_CAS` | `claim_quota_gate` (`stage='quota_claimed' WHILE status='checking'`) | SAFETY_BFS `test_inv14_quota_gate_cas_model_check.py` |
| **INV-15** (`:1249`) | Introducer at-most-once fan-out | `SQL_CAS` | `claim_introducer` (`QUEUED→REMEDIATING`) | SAFETY_BFS `test_inv15_introducer_cas_model_check.py` |
| **INV-P2** (`:1693`) | `update_job`-CAS guarded lifecycle | `SQL_CAS` | `web/persistence/jobs.py:update_job` ("the sole guarded transition") | property/BFS |

All are safety properties (`[]P`): "at most one owner," "at most one credit reserve,"
"at most one fan-out." None is a liveness (`~>`) obligation, so none is TLA/TLC-tiered.

---

## 4. TLA+ specification

**REPO-FACT: none.** This protocol has no `.tla`. Its correctness is made
*structural* by the SQL-CAS itself (§6), so the engineering judgment was that a formal
spec buys little over "the database enforces at-most-one-row-match." This is a
deliberate application of A.22 (right-size the fix): the formal apparatus is reserved
for the *lease*, whose correctness genuinely could not be made structural by a single
CAS.

---

## 5. TLC checking

**REPO-FACT: none.** No `.tla` → no TLC.

---

## 6. Implementation correspondence

**REPO-FACT** (`web/persistence/jobs.py:update_job:202-248`). The primitive:

```
UPDATE jobs SET <fields> WHERE id = %s AND status = %s     -- expected_status set
rows_updated = cur.rowcount                                 -- 0 = lost the race
```

The `WHERE id=%s AND status=%s` clause is the **compare**; the row write is the
**swap**; `rowcount` is the **outcome**. A caller passing `expected_status` and getting
`0` knows "someone else reached it first." This is a genuine CAS at the database row —
the *strongest correspondence in the whole subject*, because there is no gap between
"model" and "implementation": the SQL statement **is** the constraint. There is nothing
to keep in sync; a double-claim is unrepresentable because only one `UPDATE` matches the
row.

`web/worker.py:_claim_and_process_chunk:2080-2093` claims with
`expected_status=STATUS_QUEUED → STATUS_REMEDIATING`, then a `recheck` read as
belt-and-suspenders.

**Crash-safety = Cloud Tasks lease/ack** (`web/worker.py:2354`; CLAUDE.md "Push-plane
atomicity"). The CAS handles *concurrency*; the Cloud Tasks lease/ack handles *crash*.
The HTTP 200 from `/handle-chunk` IS the ack; a crash before ack re-delivers the task,
so the chunk is never in a "neither queued nor in-flight" gap. This replaced the
retired ZPOPMIN Lua-atomic `ZPOPMIN → LPUSH` reservation
(`shared/lua/atomic_zpopmin.lua`, now history per
`k8s-poll-architecture-retirement-260722.md`).

**ENG-INTERP — the plane-neutral invariant.** The invariant PREDICATE (no-loss
single-claimer) is *plane-neutral*; the mechanism moved from a Redis Lua CAS to
DB-CAS + managed lease/ack. INV-1's checker `test_inv1_atomic_claim.py` still drives
the **REAL** `atomic_zpopmin.lua` (fakeredis wired into the real `RedisQueue` via its
`client_factory` DI hook) + the real `pop_parent_job` + real SM transitions — a
genre-(b) SimWorld test that gives *genuine implementation-level assurance* (bounded,
contingent on fakeredis fidelity), not an abstract re-model.

---

## 7. Bounded model checking

**REPO-FACT.** The at-most-once property of each CAS fence is checked by an
exhaustive-BFS `*_model_check.py` test with a **falsifiability toggle**:

- **INV-14**: the toggle is the *naive status-guard* (drop the `stage` CAS). Flipped to
  the buggy value, the BFS reaches the **double-reserve sink** (double-billing);
  fenced, 0 violations over the bounded interleaving space.
- **INV-15**: the introducer CAS (`QUEUED→REMEDIATING`); toggle-off reaches the
  double-fan-out sink.
- **INV-1**: the Hypothesis-fuzzed real-Lua interleaving driver.

The bound is bounded actor/object counts + redelivery count (≤2), over `fakeredis` +
`FakeDb`. Same technique as the lease, no TLA+.
**What it does NOT prove:** correctness beyond the bound; that `fakeredis`/`FakeDb`
equal real Redis/Postgres; anything about the C# remediation pipeline.

---

## 8. Authority

**REPO-FACT.** Two attachment points:
- **Runtime (authoritative, always-on):** the SQL-CAS / Cloud Tasks ack ARE the
  enforcement — "the guard IS the monitor." A double-claim / lost item is
  *unrepresentable* in prod. **This is a Constraint** (MAGE Alignment axis) — it makes
  the illegal state impossible, not merely detected.
- **Verification (authoritative within pytest reach):** INV-1/14/15's SAFETY_BFS tests
  run in the unit tier → a broken invariant fails the merge-train CI gate. Rule #57's
  BLOCKING `lint-invariant-verification-tier.py` forces each HAIRY invariant to *have*
  a resolving checker.

**MAGE-INTERP.** *Modeling* = the SQL-CAS ownership model ("can two workers own one
item?" encoded once). *Alignment* = the CAS is a **Constraint** (hard, structural);
the BFS tests are **Validators** (hard, via the gate). *Correspondence* = the strongest
in the subject — the SQL statement *is* the constraint, no model-to-code gap.
*Engineering capital* = the "can two workers own the same item?" question is never
re-reasoned per handoff; it is a one-line `WHERE` clause + one BFS test per fence.

---

## 9. Failure scenario — the double-claim race (state trace)

```
jobs.status = QUEUED                       chunk C is queued; task delivered TWICE
                                           (Cloud Tasks at-least-once) to workers A, B
  │ worker-A: UPDATE jobs SET status=REMEDIATING WHERE id=C AND status=QUEUED
  │           → rowcount = 1  (A wins)
  ▼
jobs.status = REMEDIATING (owner: A)
  │ worker-B: UPDATE jobs SET status=REMEDIATING WHERE id=C AND status=QUEUED
  │           → rowcount = 0  (B lost — status no longer QUEUED)
  ▼
   ── WITH CAS (expected_status=QUEUED): B sees rowcount=0 → acks + skips.
      Exactly one owner (A). ✓  INV-1 holds.
   ── WITHOUT CAS (naive UPDATE … WHERE id=C, no status guard): both write
      REMEDIATING, both process C → double remediation / double bill. ✗
```

Crash variant:

```
jobs.status = REMEDIATING (owner: A)
  │ worker-A crashes before HTTP 200 (no ack)
  ▼
   ── Cloud Tasks lease expires → task RE-DELIVERED → worker-B re-claims via CAS.
      No lost work; chunk never stuck in a "neither queued nor in-flight" gap. ✓
```

- **Violated invariant (without the fence):** INV-1 (queue-claim atomicity).
- **Does the exhaustive BFS expose it?** Yes — the falsifiability toggle (naive
  status-guard) reaches the double-reserve/double-process sink.
- **Would ordinary tests?** The happy-path single-delivery test passes either way; the
  race needs the concurrent + redelivered interleaving the BFS enumerates.
- **Durable engineering response:** the `expected_status` CAS on every ownership
  handoff + the Cloud Tasks lease/ack for crash-safety + one SAFETY_BFS test per fence.

---

## 10. One-line summary for the book

*DocAble's pervasive ownership protocol is a database compare-and-set
(`UPDATE … WHERE id=? AND status=?`) with Cloud Tasks lease/ack for crash-safety: the
most impactful concurrency correctness in the system is made **structurally
unrepresentable at runtime** — no TLA+, no TLC, just the SQL statement as the
constraint — and pinned by exhaustive-BFS model-check tests with falsifiability
toggles. It is the honest counterexample to "formal methods = TLA+."*
