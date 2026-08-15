<!--
PROVENANCE — field-note raw evidence (committed, NON-RENDERED).
Source draft: book/_design/drafts/formal-methods-mining-260815/ (gitignored working dir).
Home: book-models/field-note-sources/ — committed beside the field-note model, NOT under book/**,
so the catalog build's recursive book/**/*.md render glob does not pick it up (no orphan-reachability
gate applies). This is the durable evidence backing the formal-methods field-note entries in
book-models/field-notes.json (fn-db-cas-single-ownership, fn-lease-epoch-fencing, fn-inv18-liveness-gap),
consumed by book-models/substantiation.py as FieldNoteBacking. Model-registered evidence; not inline-cited.
-->

# E2E deep-dive — INV-18 async-termination liveness (the honest limit case)

End-to-end reconstruction of DocAble's cleanest *liveness* obligation — and the
cleanest illustration of *where the assurance is weakest*: a genuine `~>` liveness
property whose only checker is a `.tla` that **no automated job ever runs**. This
deep-dive is the honest complement to the lease (a complete, gating safety chain) and
the DB-CAS (a structural runtime constraint). INV-FO-2 (fan-out termination) is
structurally identical and is summarized at the end.

Chain: engineering problem → behavioral model → invariants → TLA+ → TLC → implementation
correspondence → BMC → authority, with a state trace. Tags: **REPO-FACT** /
**ENG-INTERP** / **MAGE-INTERP**.

---

## 1. Engineering problem

**REPO-FACT** (`spec/INV18AsyncTermination.tla:10-17`;
`docs/ops/k8s-poll-architecture-retirement-260722.md`). The serverless `min=0` cutover
**deletes the always-on polling supervisor** (`blpop_completer` + boot/tick orphan
scans in `web/scaler.py`). Under the new push architecture, Cloud Tasks / Pub-Sub is
*at-least-once*, so a push can be **LOST** with **nothing resident to re-drive it** — a
job strands non-terminal *forever*. The fix (the fence): a Cloud Scheduler
`cron → POST /sweep` that re-pushes stranded jobs — the ONE always-reachable driver
under `min=0`.

**ENG-INTERP.** This is a *liveness* failure ("the job never reaches a terminal
state"), fundamentally different from the lease/CAS *safety* failures ("two owners" /
"double clear"). A finite-trace test cannot observe "never" — you cannot falsify
`Submitted ~> Terminal` by running a bounded number of steps. This is *why* the
verification-tier derivation routes it to `LIVENESS_TLC` and mandates a `.tla`.

---

## 2. Behavioral model

**REPO-FACT** (`spec/INV18AsyncTermination.tla:113, 190`).

- **State variables:** `status : submitted → inflight → {done | failed}`,
  `pushPending` (a push is outstanding), `steps` (a bounded step counter).
- **Actions** (`Next`, `:190`):
  - `Deliver` — consume a pending push, advance one step; if still non-terminal, mint
    the next push.
  - `Lose` — consume a pending push with **no progress** (the at-least-once hazard).
  - `SweepCron` — re-push a stranded (non-terminal, no-pending) job; gated by the
    `SweepCronOn` CONSTANT.
  - `StepCap` — fail-loud at the horizon (`steps = MaxSteps`).
- **Safety companions** (action props, by construction, `:211-212`): `INV_Monotone`
  (status never regresses), `INV_TerminalAbsorbing` (a terminal status is a sink);
  `INV == TypeOK` (`:214`).
- **Bounds:** `MaxSteps = 4` (`INV18AsyncTermination.cfg`).

---

## 3. Invariants / properties

**REPO-FACT** (`spec/INV18AsyncTermination.tla:227, 264`).

| Property | Formal (TLA+) | Kind |
|---|---|---|
| `LIVE_EventualTerminal` | `Submitted ~> Terminal` (every submitted job eventually reaches done/failed) | **liveness** |
| `INV_Monotone`, `INV_TerminalAbsorbing`, `TypeOK` | safety companions, by construction | safety |

**The load-bearing fairness choice** (`FairSpec`, `:264`): `SF_vars(Deliver)` — *strong
fairness* on `Deliver` is the formalization of at-least-once delivery (a push that stays
enabled is eventually delivered) — conjoined with `WF_vars(SweepCron)` +
`WF_vars(StepCap)`. **`Lose` is deliberately unfair** (it may fire but cannot be relied
on) — this is what lets the model express "pushes can be lost arbitrarily often, yet the
job still terminates *because* the sweep cron is weakly-fair."

**Falsifiability toggle:** `SweepCronOn = FALSE` → TLC reports a **lasso**
(submitted → inflight → [push lost] → stranded forever), proving the property has teeth
and that the sweep cron is *necessary*.

---

## 4. TLA+ specification

**REPO-FACT.** `spec/INV18AsyncTermination.tla` (MODULE `INV18AsyncTermination`),
authoritative — it is the `TLA_TLC` `verify_ref` for the composed model's INV-18
(`state_machines.py:1361-1383`: operator `~>`, predicate "Submitted ~> Terminal",
`tla_property_name = LIVE_EventualTerminal`, `VerifyRef(TLA_TLC,
"spec/INV18AsyncTermination.tla")`). A proper liveness spec: `Submitted ~> Terminal`
with strong-fairness modeling of at-least-once delivery and a falsifiability toggle. The
*design reasoning* is machine-checkable in principle.

**Doc-rot caveat (REPO-FACT):** the docstring cites `spec/INV5ScalerLiveness.tla` as
"the proven exemplar," but that spec was **deleted** and INV-5 **retired** with the
GKE→CloudRun migration. Stale reference; not a functional break.

---

## 5. TLC checking

**REPO-FACT.** `spec/INV18AsyncTermination.cfg` (`FairSpec`, `INVARIANT INV`,
`PROPERTY LIVE_EventualTerminal`, `SweepCronOn=TRUE`, `MaxSteps=4`) and a
`_falsify.cfg` (`SweepCronOn=FALSE`, `CHECK_DEADLOCK FALSE`) exist with a manual
`java … tlc2.TLC` runbook in the cfg comment.

**The honest limit: no runner executes it.** `run-tlc.py` hardcodes `_LEASE_TLA` and
runs `lease.tla` ONLY; no runner references `INV18AsyncTermination.cfg`. Grep over
`tools/ web/ system-models/` finds **zero executors** of `spec/*.tla`. There is no
`.github/workflows/`. So INV-18's liveness property is **modeled and falsifiable but
never machine-checked in any automated gate** — its only "run" is a human typing the
cfg-comment command.

---

## 6. Implementation correspondence

**REPO-FACT.** The model↔code tie is the *weakest* of the three deep-dives:
- **Model ↔ `.tla` property line:** `temporal_form_to_tla_property(INV-18)` emits
  `LIVE_EventualTerminal == Submitted ~> Terminal`, and
  `lint-tla-property-matches-model.py` (BLOCKING) asserts the `.tla`'s `LIVE_*` line
  equals it, whitespace-normalized. **Only that one line** — the lint's own docstring:
  *"the full state/action spec (Init/Next/vars/the action bodies) stays hand-authored."*
- **Model ↔ code enforcement:** `satisfy_refs` point at `web/job_completer.py:_recover_orphaned_jobs`
  (INV-18's prod site), but they are **existence-checked only** (path exists + symbol
  appears). Nothing proves `_recover_orphaned_jobs` actually enforces
  `Submitted ~> Terminal`.
- **The recovery driver's existence IS lint-enforced:**
  `lint-sweep-cron-exists-before-scaler-delete.py` (BLOCKING) requires the modeled
  `SweepCron` to have a real handler + route + provisioning BEFORE `web/scaler.py` is
  deleted. This is the one *substantive* structural guarantee — it prevents the
  regression "delete the old always-on fleet without first standing up the always-
  reachable recovery driver."

**Where human judgment enters:** (a) that the `.tla` action bodies model production
faithfully (only the property line is checked); (b) that the abstraction (folding away
SQL-CAS fences, chunk cardinality, transport specifics) is sound; (c) that
`_recover_orphaned_jobs` actually implements the sweep; (d) that TLC was *ever run*.

---

## 7. Bounded model checking

**REPO-FACT: none applicable, and none possible with the in-repo BFS.** The
`enumerate_reachable` safety-BFS **cannot falsify a `~>` liveness property** — liveness
is about infinite behaviours, and a finite-trace enumerator has no notion of "eventually
along every fair path." That is precisely why rule #57 routes INV-18 to `LIVENESS_TLC`
rather than `SAFETY_BFS`. There is no CBMC / SAT / SMT anywhere. So INV-18's assurance
is: a hand-authored bounded `.tla` + a lint that the property *line* matches the model +
a lint that the recovery driver exists in prod — **and no executable checker of the
liveness property at all.**

---

## 8. Authority

**REPO-FACT.** Three BLOCKING lints, no execution:
- `lint-invariant-verification-tier.py` (#57) — the `.tla` exists + resolves + is the
  `TLA_TLC` kind INV-18's derived `LIVENESS_TLC` tier demands.
- `lint-tla-property-matches-model.py` (P4) — the `LIVE_EventualTerminal` line equals
  the model predicate.
- `lint-sweep-cron-exists-before-scaler-delete.py` — the recovery driver exists in prod
  before the old fleet is deleted.

**ENG-INTERP.** So the liveness property is *asserted, line-matched, and its recovery
driver existence-gated* — but **not machine-checked** in any automated gate. Authority
is attached to *structure and correspondence-of-names*, not to a liveness proof.

**MAGE-INTERP.** *Modeling* = the async-termination temporal invariant (naming the
eventual-termination obligation the `min=0` cutover created). *Alignment* = the three
lints are **Constraints/Gates** (hard, BLOCKING) on the *registry + property-line +
recovery-driver-existence*; the `.tla`/TLC would-be **Validator** is **inert**.
*Correspondence* = model↔`.tla` is a single property-LINE match; model/`.tla`↔code is
intent + documentation only. *Engineering capital* = "does deleting the old fleet lose
eventual-termination?" is answered *once* by the bounded TLC design and thereafter
*pinned* by the sweep-cron-exists + property-match lints so the answer cannot silently
rot — even though the liveness check itself never re-runs.

---

## 9. Failure scenario — the stranded job under `min=0` (state trace)

```
status=submitted, pushPending=TRUE, steps=0
  │ Deliver           consume push, advance → inflight; mint next push
  ▼
status=inflight, pushPending=TRUE, steps=1
  │ Lose              the push is LOST (at-least-once hazard); no progress;
  │                   pushPending=FALSE, nothing resident to re-drive
  ▼
status=inflight, pushPending=FALSE, steps=1
  │
  ├─ SweepCronOn = TRUE:  SweepCron re-pushes the stranded job → pushPending=TRUE
  │                       → Deliver → … → terminal.   LIVE_EventualTerminal HOLDS. ✓
  │
  └─ SweepCronOn = FALSE: no driver exists. The job sits inflight forever.
                          TLC finds a LASSO (submitted→inflight→[lost]→stranded ∞).
                          LIVE_EventualTerminal VIOLATED. ✗
```

- **Violated property:** `LIVE_EventualTerminal == Submitted ~> Terminal`.
- **Does TLC expose it?** Yes in principle — `SweepCronOn=FALSE` yields a liveness
  lasso — **but TLC is not run automatically** (no runner references the cfg).
- **Does the BFS expose it?** **No** — a safety-BFS provably cannot falsify a `~>`
  property.
- **Would ordinary tests?** No — "never terminates" is not observable in a finite trace.
- **Durable engineering response:** the Cloud Scheduler `cron → POST /sweep` recovery
  driver (`web/job_completer.py:_recover_orphaned_jobs`), whose *existence* is
  BLOCKING-lint-gated before `web/scaler.py` is deleted — the substantive guarantee —
  plus the `.tla` liveness spec + property-line-match lint as the documented,
  falsifiable (if unrun) design record.

---

## 10. Sibling — INV-FO-2 fan-out termination

**REPO-FACT.** `spec/INVFO2FanoutTermination.tla` is structurally identical at the
fan-OUT level: `LIVE_FanoutTermination == WaitingWithMissingChunks ~> AllChunksTerminal`
— every WAITING parent with an incomplete chunk fan-out eventually terminates (all
chunks done, or the watchdog FAILs it), even after a partial managed publish or a lost
chunk task. `Init` at `dispatched=1, done=0` models the *partial publish*. It models the
real staging incident **job `b0ac589992c7` ("stuck at 1/3")**, RCA
`docs/design/chunk-dispatch-stall-rca-260807.md`. Same posture: `FairSpec` with
`SF_vars(Deliver)`, `SweepCronOn` falsifiability toggle, **never TLC-executed by any
runner**, governance = the same three BLOCKING lints. (Its *safety* sibling INV-FO-1 —
re-drive completeness, `□(WAITING ⇒ ∀c: dispatched_durably ∨ redrive_pending)` — IS
SAFETY_BFS-checked by `web/test_simworld/test_invfo1_fanout_redrive.py`, which the BFS
*can* falsify.)

---

## 11. One-line summary for the book

*INV-18 (and its twin INV-FO-2) is DocAble's honest liveness limit case: a genuine
`Submitted ~> Terminal` obligation created by the serverless `min=0` cutover, expressed
in a proper falsifiable TLA+ liveness spec — but **no automated job ever runs TLC**, a
safety-BFS provably cannot check it, and its workflow authority is three BLOCKING lints
over the property-line text and the existence of the recovery driver, not a liveness
proof. The substantive guarantee is structural (the sweep-cron must exist before the old
fleet is deleted); the formal spec is a documented, unrun design record.*
