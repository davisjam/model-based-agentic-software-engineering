# Field Note (CURRENT STATE) — the formal-methods substrate AFTER the runner/registry/triggering program landed

**Purpose.** A from-HEAD, trust-nothing, evidence-cited inventory of DocAble / ada-tool's
formal-methods substrate **as it stands now**, plus a finding-by-finding follow-up to the earlier
`field-note-followup-synthesis-260815.md`. Normalized to HEAD
`c51d638716bfb3eaca14899171cb8fec4699c4dc` (2026-08-16). The earlier synthesis was normalized to
`bac511f5128d938249cd78aac64550ed903e46f9` (2026-08-15); **between those two commits a full
formal-methods program landed and CLOSED** — three Epics
(`tlc-spec-registry-and-run` E1, `lease-conformance-change-trigger` E2, the umbrella
`formal-spec-runner-and-triggering`) plus the sibling repair `fix-red-lease-conformance-test`.

This note is a **companion, not a replacement**, to `field-note-followup-synthesis-260815.md`;
that document's structure, artifact inventory, and property-by-property spine remain the reference.
This note records **what changed** and, with equal weight, **what did not**.

**Discipline tags.** **[REPO-FACT, ran]** = I executed the command this session. **[REPO-FACT]** =
path+symbol/line I read at HEAD. **[ENG]** = defensible engineering reading. Governing rule:
*strongest-defensible-claim-and-no-stronger.* This is a READ-ONLY audit; no repository code was
modified and nothing was committed to the repo (the deliverable lives in `~/Downloads`).

**First-hand verifications run this session (the load-bearing ones):**

| What I ran | Result |
|---|---|
| `python3 tools/lint/lint-tla-spec-registry-model-parity.py` | **0 finding(s), exit 0** ✅ [REPO-FACT, ran] |
| `pytest web/test_simworld/test_lease_model_check.py -k runtime` | **3 passed, 9 deselected** ✅ (incl. `test_model_matches_runtime_claim_merge_terminal`, the ~11-day-red one) [REPO-FACT, ran] |
| `git log` for the four Epics | all four **CLOSED** via `epic_close` commits (`383372a005`, `418055a06f`, `d908b3d22f`, `6c8e323e8b`) [REPO-FACT, ran] |
| Floor-lint registration read | `blocking=True, audit_only=True` (`batch_e.py:5300-5305`) — **AUDIT-ONLY** [REPO-FACT] |

I did **not** re-run TLC this session (no jar copied into this worktree's gitignored `.cache/`); the
TLC state-counts I cite (lease 72,894 / INV-18 5 / INV-FO-2 10) are carried forward from the earlier
synthesis + the E1 phase doc + the Final Opus DoD (`final-dod-260816.md`, which re-ran TLC 9/9 with
the jar present at HEAD this same day). I flag every such carried-forward number.

---

# PART A — CURRENT STATE (what is present NOW)

## A.0. One-paragraph orientation

The earlier synthesis's executive finding — **B (partial two-layer assurance), localized to the
lease-fencing core; C for the two liveness specs; A excluded** — **still holds**. The program that
landed did **not** change the *class* of assurance; it changed the *reproducibility, registration,
and change-triggering* of the formal machinery that was already there. Concretely: the two liveness
specs that were "a `.tla` file on disk with no runner" are now reproducibly runnable and
model-registered; the conformance layer that had **zero** change-trigger targets and had **rotted
red for ~11 days** is repaired and change-triggered; and a **Java-free floor lint** now guarantees
that a machine with no JVM can still enforce that every live temporal spec is registered. What did
**not** change: TLC-run remains **AUDIT-ONLY / non-gating**, there is still **no implementation-level
bounded/symbolic checking**, and the model↔implementation correspondence is still
**example-based/sampled**, not a refinement.

## A.1. The TLA+ specs + TLC — unchanged specs, generalized runner

- **`lease.tla`** (`docs/epics/closed/job-inflight-lease-accounting-260709/lease.tla`) — the
  in-flight-lease epoch-fence safety core. Unchanged. TLC-machine-checked (green 72,894 distinct
  states; three biting falsify toggles → `INV_NoDoubleTerminal` / `INV_NoForeverLeak` /
  `INV_NoPersistentOverCount`). *[state-counts carried forward; re-confirmed 9/9 by `final-dod-260816.md` §1.]*
- **`spec/INV18AsyncTermination.tla`** — async eventual-termination `Submitted ~> Terminal` under
  `min=0` with loseable at-least-once push; `FairSpec = SF(Deliver) ∧ WF(SweepCron) ∧ WF(StepCap)`.
  Green 5 states; falsify `SweepCronOn=FALSE` → `LIVE_EventualTerminal` violated (stranded-job lasso).
- **`spec/INVFO2FanoutTermination.tla`** — fan-out eventual-termination
  `WaitingWithMissingChunks ~> AllChunksTerminal`; models staging incident `b0ac589992c7`. Green 10
  states; falsify → `LIVE_FanoutTermination` violated (strands 1/3).
- **`spec/INV1Claim.tla`** — the self-labeled THROWAWAY pilot; **deliberately excluded** from the
  new registry (`tla_spec_registry.py:31-33` documents the exclusion explicitly).

**The decisive change to this layer is NOT the specs — it is the runner.** The earlier synthesis's
sharpest liveness-gap sentence was: *"`tools/formal/run-tlc.py` hardcodes `_LEASE_TLA` (line 77) …
no `--spec`; the two liveness specs have no runner."* That is **CLOSED** (A.2).

## A.2. The NEW TLC spec REGISTRY — the SSOT [REPO-FACT]

`tools/formal/tla_spec_registry.py` (Epic `tlc-spec-registry-and-run` E1, Phase 1) is the single
source of truth naming every live temporal spec. Shape (genre-checked 1:1 against the existing
`lease_invariant_registry.py`, rule #22):

- `@dataclass(frozen=True) FalsifyToggle` (`name`, `cfg`, `expected_token`) and
  `@dataclass(frozen=True) TlaSpec` (`spec_id`, `tla_path`, `green_cfg`, `falsify`,
  `model_invariant_ids`, `modeled_surfaces`).
- `TLA_SPECS` (`:115-189`) = **exactly the 3 live specs**: `lease`, `INV-18`, `INV-FO-2`. Each
  reproduces its former lease-only constants exactly (lease's green + three toggles at `:120-151`).
- Accessors `spec_ids()`, `spec_by_id()`, `registry_model_tla_paths()` (`:192-212`).
- **`model_invariant_ids`**: `()` for `lease` (it carries its OWN `lease_invariant_registry.py`, so
  it is not a `ConstraintBlock` in `state_machines.py`); `("INV-18",)` / `("INV-FO-2",)` for the two
  liveness specs (model-backed). This asymmetry is load-bearing for the floor lint (A.4).
- **`INV1Claim` excluded** — documented at `:31-33` and `:114`.

## A.3. The generalized runner — `run-tlc.py --spec` [REPO-FACT]

`tools/formal/run-tlc.py` now runs **any registered spec**. The former `_LEASE_TLA` / `_GREEN_CFG` /
`_FALSIFY_TOGGLES` constants are **gone** (only named in the docstring's migration narrative — A.7
no-shim). Selection is `--spec <id>` (default `lease` for back-compat), resolved via the registry
(`_resolve_spec`, `:290-299`, fail-loud on unknown id). Modes: `--green` (assert 0 violations),
`--falsify <toggle>` / `--falsify-all` (assert TLC FINDS the expected counterexample — "the teeth").
Rule #14 exit codes (0 ok / 1 runtime / 2 missing-dep) and rule #32 PLAN/RESULT envelopes are both
emitted (`_emit_plan` `:128`, `_emit_result` `:150`). The sole-seam `TlcInvoker`
(`tools/formal/tlc_invoker.py`) is **UNCHANGED** (an E1 NON-goal, honoured). Java-gating is unchanged
(`_gate_dependencies`, `:203` — exit 2 when no JRE ≥ 11 or the jar is unfetched).

## A.4. The NEW Java-free BIDIRECTIONAL parity floor lint [REPO-FACT, ran]

`tools/lint/lint-tla-spec-registry-model-parity.py` (Epic E1, Phase 5) is the **standing enforcement
that Java-absence cannot degrade**. It reads the two in-repo SSOTs at lint-time — **no Java, no TLC** —
and asserts **BIDIRECTIONAL set-equality** between the registry's model-backed `.tla` paths
(`registry_model_tla_paths()`) and `state_machines.py`'s `TLA_TLC` verify-ref paths. `check()`
(`:141-185`) flags three finding classes: (a) a model `TLA_TLC` ref with no registry entry (spec not
reproducibly runnable); (b) a model-backed registry `.tla` that is not any invariant's verify-ref (a
STALE entry); (c) id-level inconsistency. The bidirectional shape (not superset-only) folds
Phase-1b REVISE-note #2 — a one-directional check would let a stale entry pointing at a deleted spec
pass (A.24 "second SURFACE of a pair," held at the parity-CONTROL rung).

**I ran it: `0 finding(s), exit 0`.** [REPO-FACT, ran]

**HONEST NUANCE — it is AUDIT-ONLY, not (yet) a blocking gate.** Registered
`blocking=True, audit_only=True` (`tools/lint/lint_all/registrations/batch_e.py:5300-5305`).
`audit_only=True` overrides — it runs and reports but **does not contribute to the `lint-all` exit
code**. This is AUDIT-ONLY-first per rule #55 (it must not inject a red into the no-baseline
deploy-scope gate); promotion to BLOCKING is a deferred follow-up (§G-Q2/Q5, "once the
authority-host Java reliability + run-as-gate decision lands"). So "the standing gate that
Java-absence cannot degrade" is more precisely **"the standing VALIDATOR that runs Java-free"** —
it *catches* a registry↔model drift on any host, but does not yet *block* on it.

## A.5. The NEW slow_unit pytest — TLC actually RUNS [REPO-FACT]

`tools/formal/test_tla_specs_tlc_e2e.py` (E1) generalizes the deleted lease-only
`test_lease_tlc_e2e.py`. It drives `run-tlc.py` end-to-end for **every** registered spec:
`test_green_gate_zero_violations` (parametrized over `_SPEC_IDS`) and
`test_falsifiability_toggle_finds_counterexample` (parametrized over every `(spec, toggle)`), plus a
Java-**free** `test_registry_integrity_java_free` that checks every `.tla`/cfg exists and every
toggle is well-formed. Marked `pytest.mark.unit` **+ `pytest.mark.slow_unit`** (`:86`) — precommit's
`-m 'unit and not slow_unit'` filter **skips** it; the cron / merge-train full-unit tier (`-m 'unit'`)
**includes** it. Java-conditional `skipif` (`requires_tlc`, `:116`): where a JRE + jar are present the
green/falsify tests run, else they SKIP while the Java-free integrity test still passes.

**Wall-time (measured 260815, per the docstring `:34-36`): lease green ~1.6s / INV-18 ~0.45s /
INV-FO-2 ~0.4s; each falsify sub-second.** `final-dod-260816.md` §1 re-ran this at HEAD: **9 passed
(5.68s) with the jar present; 1 passed + 8 skipped without.** [carried forward; I did not re-run TLC
this session.]

**HONEST NUANCE — this proves TLC *executes*, closing the "a `.tla` file merely EXISTS" gap, but the
run rides the merge-train/cron rung and is Java-conditional. It is not precommit and not a hard
release gate.**

## A.6. The NEW model-reading change-trigger RESOLVER — two consumers [REPO-FACT]

`tools/formal/formal_change_trigger.py` is a single package-agnostic resolver serving **two**
consumers off one shared core (`_normalize` + exact set-membership; rule #11 — extracted on the 2nd
consumer, not copy-pasted):

1. **TLC-spec selection** (`select_specs`, `spec_modeled_surfaces` `:172-202`) — Epic E1 P2. A spec's
   modeled-surface set = its own files (`tla_path` + `green_cfg` + each falsify cfg) ∪ the registry's
   declared `modeled_surfaces` ∪ the **model-DERIVED** `satisfy_refs` prod paths read from
   `state_machines.py` at resolve time (`_model_satisfy_ref_paths` `:142-169`; rule #33/#42 — the
   join is derived, never hand-copied into the registry).
2. **Conformance-test selection** (`select_conformance_tests` `:274-289`) — Epic E2. Reads each
   `web/test_simworld/test_*.py`'s `# test-pins: targets:` block package-agnostically.

**The `parts[0]` cross-package gotcha — the reason a resolver exists at all.** The precommit
`pre_commit_unit_tier` rung-1 grep scopes discovery to the staged file's `parts[0]` PACKAGE dir. So a
`spec/INV18…tla` edit (`parts[0]=spec`) or a `shared/lua/lease_release_cas.lua` edit
(`parts[0]=shared`) can **never** select a `tools/formal/` or `web/test_simworld/` test via that grep
— the cross-package trigger is structurally invisible to package-scoped discovery. The resolver reads
**absolute repo-relative** ref paths, so it is package-agnostic by construction (docstring `:24-33`).
Selection is exact set-membership (no glob/prefix/dir) — the rule-#45 mis-fire bound: a broad map
would fan every completer PR out to a JVM+TLC run and wedge merge-train. `final-dod-260816.md` §1
confirmed both behaviours first-hand: `--files shared/lua/lease_release_cas.lua` → selects `lease`
+ the conformance test; `--files web/job_completer.py` → selects `INV-18,INV-FO-2` (NOT `lease`) +
the conformance test.

## A.7. The conformance test-pins targets — the rot CLOSED [REPO-FACT]

`web/test_simworld/test_lease_model_check.py:613-615` now carries:

```
# test-pins:
#   tier: unit
#   targets: web/job_completer.py, web/job_introducer.py, shared/lua/lease_release_cas.lua, web/dispatch/queue.py
```

The earlier synthesis's §7 "Sharp limitation" — *"`test_lease_model_check.py`'s `# test-pins:` carry
only `tier: unit` (no `targets:`), so editing the fencing-core production code does NOT pull the
BFS/runtime cross-check into the changed-file-scoped unit tier"* — is **CLOSED**. Editing any of those
four fenced-lease prod surfaces now selects this conformance test via the resolver's
`select_conformance_tests`.

## A.8. The minimal AUDIT-ONLY merge-train wiring [REPO-FACT]

`tools/agents/merge_train.py:1308-1312` (imported `:93-95`) prints an AUDIT-ONLY
`report_batch_selection` line at stage time (which formal checks the batch's diff selects, vs
pre-promote main). It is wrapped in a `try/except` with a logged skip — the comment (`:1304-1307`,
`:1311`) is explicit: *"Does NOT gate — a resolver hiccup must never block a green promote."* §G-Q5
validator-first honoured (rule #8 — the swallow is surfaced, not silent).

## A.9. The REPAIRED lease conformance test — GREEN [REPO-FACT, ran]

The earlier synthesis's "secondary receipt" — the correspondence layer that **silently rotted red**:
`test_model_matches_runtime_claim_merge_terminal` failing with
`AttributeError: 'FakeDb' object has no attribute 'SERVER_NOW'`, red since prod added `db.SERVER_NOW`
on 2026-08-04 (`b6c14f630a`) — is **REPAIRED** (Epic `fix-red-lease-conformance-test`, closed
`6c8e323e8b`). `web/test_simworld/_simworld.py:235` now re-exports `SERVER_NOW = db.SERVER_NOW`, and
`update_job` (`:277-301`) resolves the sentinel to a current server-clock ISO timestamp at write time
— mirroring the real Postgres `to_char(now() …)` path (`persistence/jobs.py:_PG_SERVER_NOW_ISO`),
with a rule-#42 lookup comment (`:229-234`) rather than a hardcoded snapshot.

**I ran the three runtime conformance tests: `3 passed`** — `test_model_matches_runtime_claim_merge_terminal`
(the repaired one, drives the REAL introducer claim path), `test_model_matches_runtime_split_brain_fence`
(drives the REAL `lease_release_cas.lua`), and `test_model_matches_runtime_terminal_reclaim_clears_not_requeues`
(drives the REAL `_reclaim_orphaned_leases`). [REPO-FACT, ran] The whole runtime-correspondence layer
is now green at HEAD, and — via A.7 — is change-triggered when its prod surfaces are edited.

## A.10. The bounded explicit-state Python checker — UNCHANGED

`web/test_simworld/test_lease_model_check.py` (`_LeaseModel` + BFS over `_model_check.py`'s
`enumerate_reachable`) is **unchanged in substance** by this program (the `targets:` block A.7 was
added; the checker logic was not). It remains the **load-bearing, Java-free conformance gate** for the
lease safety obligations: exhaustive BFS closure over a finite abstract transition system (complete
explicit-state model checking — NOT SAT/SMT "BMC"), green over 55,781@2p / 325,059@3p interleavings,
with fence-off / terminal-check-off falsifiability teeth (4,896 / 27,260 violation states). [counts
carried forward from the earlier synthesis's R2 measurement.]

## A.11. `state_machines.py` refs — the join the resolver + floor lint read [REPO-FACT]

`system-models/state_machines.py`: INV-18 (`:1351`) carries
`VerifyRef(VerifyKind.TLA_TLC, "spec/INV18AsyncTermination.tla", "")` (`:1383`) +
`SatisfyRef("web/job_completer.py", "_recover_orphaned_jobs", …)`. INV-FO-2 (`:1587`) carries
`VerifyRef(VerifyKind.TLA_TLC, "spec/INVFO2FanoutTermination.tla", "")` (`:1624`) +
`SatisfyRef("web/job_completer.py", "_redrive_incomplete_fanout", …)` +
`SatisfyRef("web/dispatch/fanout_redrive.py", "redrive_incomplete_fanout", …)`. These are the exact
paths the floor lint (A.4) checks parity against and the resolver (A.6) derives its prod surfaces
from. [ENG note: the derived satisfy-ref surfaces are **file-level** (`web/job_completer.py`), so an
edit anywhere in that file selects both INV-18 and INV-FO-2 — bounded per spec, but not narrower than
the file.]

## A.12. Program bookkeeping status [REPO-FACT, ran]

All four Epics are **CLOSED** and moved under `docs/epics/closed/`:
`formal-spec-runner-and-triggering` (✅ closed 2026-08-16; carries `phase-1-design-260815.md`,
`phase-1b-review-260815.md` — rule #58 double-Opus RATIFY — and `final-dod-260816.md`),
`tlc-spec-registry-and-run` (`phase-1-260816.md`), `lease-conformance-change-trigger`
(`phase-1-260816.md` — the E2 phase doc the DoD flagged as missing was subsequently authored),
`fix-red-lease-conformance-test`. The Final Opus DoD (`final-dod-260816.md`) verdict:
**"engineering DoD-COMPLETE and GREEN across all three Epics"**, with the only gaps being
documentation-bookkeeping (since closed) — no engineering gaps.

---

# PART B — UPDATED FOLLOW-UP to the earlier synthesis

Each earlier-synthesis load-bearing finding, mapped to **CHANGED / CLOSED / STILL-RESIDUAL** with
evidence.

## B.1. The four findings the program targeted

### Finding 1 — "rule-#57 lint only checks the `.tla` file EXISTS, not that TLC ran" → **CHANGED (materially narrowed), NOT fully closed**

*Earlier framing:* the verification-tier lint (rule #57) and the correspondence lints gate the
*structure* (property text matches, `.tla` file resolves, recovery symbols exist), but *"the formal
RESULT gates nothing"* and *"only `lease.tla` is TLC-runnable."*

*Now:* two things were added. (a) The **Java-free floor lint** (A.4) adds a **bidirectional
registry↔model parity** check — so "a spec silently dropped from the runnable set" is now
detectable on any host. (b) The **slow_unit pytest** (A.5) makes TLC **actually execute** every
registered spec (green + falsify teeth), closing the literal "a `.tla` merely exists" gap.

*Why NOT fully closed (be honest):* **the TLC RUN is still AUDIT-ONLY / non-gating.** The floor lint
is registered `audit_only=True` (A.4) — it validates but does not contribute to the exit code. The
pytest is `slow_unit` + Java-conditional — it rides the merge-train/cron rung and skips without a
JVM. So the *formal result still gates nothing hard*; what improved is **reproducibility +
registration integrity + a Java-free standing validator**, not the elevation of TLC to a release
gate. The earlier synthesis's §7 authority fact — *"the formal RESULT gates nothing; the surrounding
STRUCTURE gates everything"* — **still holds**, now with a stronger (but still non-blocking) structure.

### Finding 2 — "conformance test-pins carry ZERO `targets:`" → **CLOSED**

`test_lease_model_check.py:613-615` now declares
`targets: web/job_completer.py, web/job_introducer.py, shared/lua/lease_release_cas.lua, web/dispatch/queue.py`
(A.7), and the package-agnostic resolver `select_conformance_tests` (A.6) selects the conformance test
when any of those fenced-lease prod surfaces is edited — the cross-package complement to the
`parts[0]`-scoped rung-1 grep. The earlier synthesis's exact limitation ("editing the fencing-core
production code does not pull the cross-check into the changed-file-scoped unit tier") is closed.
[REPO-FACT]

### Finding 3 — "the lease conformance test is RED (~11 days), silently rotted" → **CLOSED (repaired + now change-triggered)**

`_simworld.py:235` re-exports `SERVER_NOW`; the three runtime cross-checks **pass at HEAD** (I ran
them: `3 passed`, A.9). And — the durable part — the rot's *recurrence* is now defended two ways: the
`targets:` block (A.7) means a future prod edit to the fenced-lease surfaces **selects** the
conformance test into the changed-file unit tier, and the repair itself was landed as a dedicated
Epic. [REPO-FACT, ran]

*Residual honesty:* the repair fixes the *drift instance* and adds change-triggering, but there is
**no general fake-vs-runtime drift check** on the whole `FakeDb`/`db` surface — the improvement
directive's "the fake/runtime seam should itself have drift checks where practical" is only partially
met (change-triggering the conformance test ≠ a standing parity check of the fake against the prod db
attribute set). A future `db`-surface addition not covered by these four `targets:` paths could still
drift a different fake method unnoticed.

### Finding 4 — "INV-18 / INV-FO-2 are TLC-run MANUAL only (no runner, no pytest)" → **CHANGED (reproducibly runnable + resolver-selected); NOT elevated to a gate**

Both specs are now: (a) registered (`tla_spec_registry.py`, A.2); (b) runnable via
`run-tlc.py --spec INV-18` / `--spec INV-FO-2` (A.3; the DoD re-ran `--spec INV-18 --green` → exit 0,
5 states); (c) executed by the parametrized slow_unit pytest (A.5); (d) selected by the change-trigger
resolver when their modeled surface (`web/job_completer.py` etc.) is edited (A.6). The earlier
"MANUAL ONLY … no runner, no pytest target" is **no longer true**.

*Residual honesty:* their TLC runs are still **advisory** — `slow_unit` + Java-conditional +
AUDIT-ONLY-adjacent. The liveness RESULT still gates nothing hard; the model↔code link for these two
is still `satisfy_ref`-existence + property-line-match strength (the resolver selects the check on a
prod edit but the check's authority is a merge-train/cron test, not a blocking release gate).

## B.2. The RESIDUAL gaps that STILL hold (do NOT overclaim)

1. **TLC-run is AUDIT-ONLY, not gating.** The floor lint is `audit_only=True` (A.4); the pytest is
   `slow_unit` + Java-conditional (A.5); the merge-train wiring is explicitly non-gating (A.8). The
   program raised *reproducibility and registration integrity*; it did **not** make any formal result
   a hard release gate. The load-bearing HARD gate for the lease safety obligations remains the
   **Java-free Python BFS** conformance test at the unit tier.

2. **Java assumed-absent on the authority host → the RUN degrades (registration does not).** By
   design the whole point of the Java-free floor lint is that *"absence-of-Java degrades the RUN,
   never the REGISTRATION"* (`tla_spec_registry.py:29`). On a JVM-less host the green/falsify TLC
   tests SKIP; only the Java-free integrity + parity checks run. This is a deliberate, honest
   degradation — but it means "TLC verified the protocol at merge time" is **only true where a JVM +
   the pinned jar are present**, which is not guaranteed on every runner.

3. **No implementation-level bounded/symbolic checking — the BMC finding HOLDS.** Nothing in this
   program touched R4's five-sweep negative. There is still no CBMC/ESBMC/KLEE/Z3/Dafny, no
   `__CPROVER` harness, no `.smt2`/bitcode artifact, no solver dependency in any manifest. The
   production code is still **never handed to any exhaustive or symbolic checker**. Per
   `bmc-vs-explicit-state-clarification-260816.md`, this holds on **both** axes: the Python checker is
   **complete explicit-state** (exhaustive BFS to fixpoint over a *finite model*), not depth-bounded
   BMC; and — decisively — it checks a **model**, not the **implementation**. The exhaustive assurance
   lives over the model; the model→implementation link is **examples**.

4. **Prod correspondence is STILL example-based / sampled.** The strongest model↔code link remains
   the `test_model_matches_runtime_*` conformance tests — genuine (they drive the REAL Lua / completer
   / introducer under fakeredis, and they DID rot precisely because they are coupled to prod), but a
   **handful of hand-written scenarios**, not exhaustive over the code and not symbolic. The program
   *change-triggered* and *repaired* this layer; it did not make it exhaustive.

5. **No refinement relation.** Unchanged and out of scope (improvement-directive point 4, confirmed by
   the umbrella design §A). Correspondence is same-invariant-independently-represented + name/line/
   relation drift-lints + a hand-maintained "1:1 mirror" + bounded test-linked conformance — **not** a
   refinement.

6. **`.tla` action BODIES for INV-18/FO-2 are still hand-authored and unpoliced.** Only the single
   temporal-property *line* is lint-matched (`lint-tla-property-matches-model`); the `Init`/`Next`/
   action bodies are never matched to code. The floor lint added parity at the **spec-registration**
   level (does every live spec have a runnable entry?), not at the **spec-body-vs-code** level.

7. **Doc-rot residuals** (from `final-dod-260816.md` §6, not code): the claim-vocabulary [FIX]
   (directive point 3 — stop calling the Python checker "bounded model checking") was **never applied**
   to the sibling active Epic `formal-methods-field-note-mining` docs; and `bmc-vs-explicit-state-
   clarification-260816.md` is a `~/Downloads` mining artifact, **dangling** as an in-repo citation.

## B.3. Updated claim tiers

### SAFE NOW (add / strengthen vs the earlier synthesis)

- **[strengthened]** All three live temporal specs are now **reproducibly runnable** under TLC via a
  single registry-driven runner (`run-tlc.py --spec <id>`), driven by a registry SSOT
  (`tla_spec_registry.py`) and a parametrized `slow_unit` pytest that executes green + falsifiability
  for every spec.
- **[NEW]** A **Java-free bidirectional parity floor lint** guarantees that every live `LIVENESS_TLC`
  model invariant has a runnable registry entry and vice-versa — enforced (as a validator) even on a
  JVM-less host, so Java-absence degrades the run but never the registration. *(0 findings at HEAD;
  AUDIT-ONLY.)*
- **[NEW]** A **model-reading, package-agnostic change-trigger resolver** selects the right TLC specs
  and the lease conformance test when their modeled prod surfaces are edited — reading `satisfy_refs`
  from the composed model at resolve time (no hand-copied join), handling the `parts[0]` cross-package
  gotcha the package-scoped precommit grep structurally cannot.
- **[CLOSED-rot]** The lease model↔implementation conformance layer is **green at HEAD** and
  **change-triggered** (`targets:` block present); the ~11-day `SERVER_NOW` rot is repaired.

### SAFE WITH QUALIFICATION

- **"The two liveness specs are reproducibly TLC-checked and change-triggered"** — TRUE, but qualify:
  the runs are `slow_unit` + Java-conditional + **advisory (gate nothing hard)**; the model↔code link
  is still existence-pointer + property-line strength; action bodies remain unpoliced.
- **"Formal-methods change-triggering exists"** — TRUE (resolver + merge-train wiring), but qualify:
  the merge-train report is **AUDIT-ONLY**; it *reports* which checks a batch selects, it does not
  *run-and-gate* them at promote.
- **"Two-layer assurance exists for the lease core"** — still TRUE and now **more robust** (green +
  change-triggered), but still bounded by fakeredis/`FakeDb` fidelity and **sampled**, not
  mechanical/formal.

### NOT SUPPORTED (unchanged — the program did not move these)

- ✗ Implementation-level bounded model checking / symbolic execution / a refinement relation — none
  exists (residual gap 3/5 above).
- ✗ "TLC gates the protocols / liveness in CI/deploy" or "the formal specs gate deploy" — the run is
  AUDIT-ONLY / advisory; the floor lint is `audit_only=True`; the merge-train wiring is non-gating.
- ✗ "The `.tla` action bodies are kept in sync with production" — only the property *line* is matched
  for INV-18/FO-2; bodies are hand-authored and unpoliced.

## B.4. Book delta — what Part IV/V can now say that it could not before

**What is newly sayable:**

- The DocAble instance is not just *"a checked model + a separately-maintained correspondence
  obligation that can rot"* — it is now *"…that rotted, was caught, was repaired, and had a
  change-trigger + a Java-free registration-parity validator installed so the class is defended
  going forward."* The **rot-and-repair cycle is the receipt**: the correspondence obligation went red
  for ~11 days (fixture drift on a real prod `db.SERVER_NOW` attribute), which is the empirical proof
  the second obligation is *real, live, and separately maintained* — and the team's response was to
  add change-triggering (a modeled-surface edit now selects the conformance test) rather than to fuse
  the layers with a refinement or an overclaimed solver. This is a cleaner, fuller instance of the
  Part IV "second correspondence obligation as an Alignment problem with its own drift controls"
  thesis than the earlier synthesis could offer.
- The team now demonstrates *"choose evidence appropriate to the property"* at a second level: they
  invested in **reproducibility and registration integrity** for the formal specs (a registry, a
  generalized runner, a Java-free parity floor) rather than in **elevating TLC to a hard gate** or in
  **adding a solver** — the "genre check before invent" discipline applied to formal-methods
  *operations*, not just to the choice of formalism.

**What STILL cannot be claimed (the book's conservatism remains correct):**

- No implementation-level BMC/symbolic verification; no refinement; TLC gates nothing hard;
  correspondence is example-based/sampled. The manuscript's refusal to claim implementation-level
  bounded model checking or refinement should **stand verbatim** — the program strengthened the
  *operations* around the existing assurance boundary; it did **not move the boundary**. Use
  HEAD-measured, per-checker numbers; keep "complete explicit-state model checking" for the Python
  checker and reserve "bounded model checking" for depth-bounded BMC (the claim-vocab discipline the
  clarification note fixes, and which is still un-applied in the sibling mining docs — residual gap 7).

---

*End current-state field note. Normalized to HEAD `c51d638716bfb3eaca14899171cb8fec4699c4dc`
(2026-08-16). Companion to — not replacement of — `field-note-followup-synthesis-260815.md`.
READ-ONLY audit; no repository code modified; no repo commit. Deliverable written to
`~/Downloads/formal-methods-mining/followup/`.*
