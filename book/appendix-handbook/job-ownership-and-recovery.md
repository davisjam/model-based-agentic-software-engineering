<!-- GENERATED from book/latex/sources/appendix-handbook/job-ownership-and-recovery.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## Problem

A worker can continue executing after its lease expires. Another worker may acquire the job, leaving both capable of acting on the same work. The original worker must not be able to erase the replacement lease, and neither worker should perform an effect that requires exclusive ownership without obtaining the corresponding authority.

Recovery creates additional problems. A worker may crash after producing an artifact but before recording completion, or after acquiring exclusive permission for an effect but before performing it. DocAble records job state, in-flight work, and output artifacts in separate storage systems, so these changes cannot be committed as one transaction. The engineering problem is to protect the individual decisions and establish how interrupted work can be reconciled.

This blueprint concerns runtime document-remediation jobs. [ref:chapter:appendix-a-governed-delegation] addresses coding-agent assignments, whose lifecycle and acceptance mechanisms differ.

## Conceptual Design

[ref:handbook-recovery-architecture] separates three commitments.

The in-flight lease records work that remains active or requires recovery. Its purpose is accounting and coordination: demand counting uses it to avoid scale-down during active work. It does not establish that a particular worker stops executing when the lease expires.

The protected-effect claim controls an operation whose concurrent execution would be unsafe. DocAble uses a database compare-and-set for its retained merge path. The inline completion path does not acquire this claim.

Publication makes the resulting artifact durable before the job record announces completion. If either operation fails, recovery must determine which effects are already complete before deciding what to repeat.

These commitments use different stores and protect different properties. A valid lease does not authorize every effect. A successful effect claim does not establish that the operation finishes. An artifact may exist without a terminal database record. The figure shows the two completion paths and the points at which recovery must inspect durable state.

The corresponding assurance mechanisms are also distinct. Atomic operations protect selected runtime decisions; explicit-state exploration examines ownership interleavings; temporal analysis examines eventual termination under stated assumptions. [ref:match-mechanism-to-property] distinguishes these obligations.

<!-- label: handbook-recovery-architecture -->
<!-- figure: assets/handbook-recovery-architecture.svg | *Three commitments in job recovery.* The Redis lease records in-flight work by job ID and issue epoch; it does not identify an owning worker. A database compare-and-set protects acquisition of the selected merge claim, while publication persists the artifact before updating durable job state. The inline path bypasses that merge claim. These operations cross separate stores; recovery and assurance address their different failure windows. [short: Three commitments in job recovery] -->

## Engineering Models

[ref:handbook-job-recovery-models] identifies the representations used by these mechanisms.

<!-- label: handbook-job-recovery-models -->
<!-- table: *Engineering models for job ownership and recovery.* Each representation answers a different recovery question. [short: Engineering models for job ownership and recovery] -->
| **Representation** | **Stored meaning** | **Consumer** |
|---|---|---|
| Job row | Database job ID, status, stage, and progress timestamps. | Introduction and effect-claim updates; terminal writes; stale-job scans. |
| In-flight lease | Redis member = parent job ID; score = wall-clock issue epoch. No worker-ID field. | Demand counting, stale-lease scans, and conditional release or reissue. |
| Worker context | A local snapshot of the lease epoch taken at merge claim. | The terminal hook presenting the expected epoch. |
| Effect claim | The job row’s merge-stage value; not a separate per-worker lease. | One conditional database update, followed by the winning caller’s merge. |
| Recovery sequence | Local states such as fallback staged, uploaded, and database updated. | Transition guards and entry hooks ordering publication. |
| Progress model | One abstract job, pending delivery, and bounded steps. | The temporal specification and paired analysis configurations. |

The database job row records status, stage, and progress. Redis records in-flight parent jobs in a sorted set, with the job identifier as member and the lease’s issue time as score. The Redis entry contains no worker identifier. A worker performing the merge retains a local snapshot of the issue time so that its eventual release can be compared with the current entry.

The merge-stage claim is a conditional update of the database job row, not another Redis lease. The publication sequence has its own intermediate states, distinguishing a staged artifact, a finalized artifact, and recorded completion. The temporal recovery model abstracts these mechanisms into job state, pending delivery, and recovery actions.

These representations share the job identity but do not describe identical authority. The lease records in-flight work; the database claim governs the selected merge effect; the publication state records progress toward a durable result. Their consumers must not infer one commitment from another.

## Realization

### Protect the In-Flight Lease {.unnumbered}

DocAble first claims a queued job in the database, changing its status to `remediating`, then adds its identifier to the Redis in-flight set. The two writes are separate, and the Redis operation is best-effort. Consequently, a database claim may exist without a corresponding accounting entry.

Lease expiry does not remove the entry automatically. A recovery scan identifies candidates whose issue times precede a cutoff, then attempts to replace their scores. The replacement operation rechecks staleness atomically so that two scans cannot both reissue the same lease. The parent lease has no per-worker heartbeat-renewal operation.

The following pseudocode preserves the Lua scripts’ decisions. Each function body executes atomically in Redis; the scan that selects a reclaim candidate runs outside it.

``` text
release(job, expected):
    if expected is absent:
        return ZREM(leases, job)
    current = ZSCORE(leases, job)
    if current is numeric and expected is numeric:
        if abs(current - expected) < 0.001:
            return ZREM(leases, job)
    return 0

reissue(job, now, stale_cutoff):
    current = ZSCORE(leases, job)
    if current is absent or not numeric:
        return 0
    if current > stale_cutoff:
        return 0
    ZADD(leases, job, score=now)
    return 1
```

The issue time serves as a generation identifier. {{chapter:modeling}} uses an abstract generation; the implementation uses a floating-point timestamp, while the executable ownership model uses integer ticks. Successive claims remain distinguishable only when replacement epochs differ by enough for the actual clock resolution and comparison tolerance.

A worker retaining an older epoch cannot remove a distinguishably newer entry through guarded release. DocAble also permits release without an expected epoch, which unconditionally removes the accounting entry. Inline completion uses this branch after its terminal database compare-and-set, and dispatch-failure cleanup uses it as well. The merge hook instead presents its claim-time snapshot. The guarded operation protects replacement ownership; the unconditional operation relies on its caller’s separate lifecycle conditions.

### Protect the Merge Effect {.unnumbered}

DocAble’s frontier-finalization adapter reuses the retired page-chunked engine’s merge claim and epoch-checked terminal hooks. This path requires a separate database claim before performing the merge. The claim changes the job’s stage and returns the affected row to the winning caller:

``` text
UPDATE jobs
SET stage = target_stage, progressed_at = server_now
WHERE id = job_id AND stage <> target_stage
  AND status NOT IN ('failed', 'completed',
                     'deleted', 'cancelled')
RETURNING id;
```

A caller proceeds only if the update returns a row. A competing caller attempting the same target stage cannot acquire that claim while the stage remains set.

The guarantee is narrower than general mutual exclusion. The coordinator targets `merging`, while the push consumer targets `merge_claimed`. Their predicates do not independently prevent callers using different target stages from proceeding; route selection must preserve the intended separation. The terminal-state exclusions are also specific to this operation and must be reconciled with other lifecycle consumers.

The authority of an atomic operation therefore depends on its actual predicate. The database guarantees that the update is atomic; it does not establish properties absent from the condition being evaluated.

### Publish Results and Recover Interrupted Work {.unnumbered}

DocAble’s fallback path preserves the original document when remediation cannot safely produce a changed artifact. It first stages the fallback, then finalizes the artifact in storage, and only afterward records completion in the database. The ordering prevents this path from announcing a completed output before it is available. Its publication states are: `FALLBACK_STAGED` \(\rightarrow\) `FALLBACK_UPLOADED` \(\rightarrow\) `DB_UPDATED`. These are local recovery states, not one transaction spanning storage and the database. Finalization uploads the artifact when the store is remote; the subsequent database update conditionally changes `REMEDIATING` to `COMPLETED_UNMODIFIED`. A crash can interrupt the sequence between any two steps. [ref:2.4-behavioral:heading:publishing-a-recovered-result] explains the ordering obligation.

[ref:handbook-job-recovery-failures] identifies the consequential interruption points. An artifact may exist while the job row remains nonterminal, so recovery cannot infer its absence from the row alone. Conversely, a merge claim may survive its worker’s crash, so another notification cannot safely repeat the effect merely because the lease expires.

<!-- label: handbook-job-recovery-failures -->
<!-- table: *Interruption points in job recovery.* Atomic claims protect individual decisions; artifact persistence and later bookkeeping retain separate failure windows. [short: Interruption points in job recovery] -->
| **Interruption** | **State or source behavior** | **Recovery consequence** |
|---|---|---|
| After merge claim, before completion | The stage claim survives; repeating the same claim loses. | A notification alone cannot undo the claim. Timeout and stale-work handling must resolve a stranded job; do not repeat the effect merely because a lease expired. |
| Fallback copy or finalization raises | The driver aborts before the fallback-completion write and delegates failure outward. | The output is not advertised as completed by this sequence. A process crash bypasses those exception hooks and needs external detection. |
| Artifact finalized, database update not reached | Storage can contain the fallback while the row remains nonterminal. Recovery-step state belongs to the interrupted invocation. | Inspect both artifact and row; this state machine does not supply a persisted checkpoint for automatic resume. |
| Terminal database write, lease clear missed | An accounting entry can outlive completed work. | Terminal-lease reconciliation clears it without starting remediation again; repeated removal of an absent entry is harmless. |
| Terminal write, later bookkeeping interrupted | Artifact and completion can exist without all later analytics or cleanup. | Reconcile auxiliary work separately. Ordered hooks do not make all side effects transactional or exactly once. |

Recovery first distinguishes terminal or missing jobs from work that remains active. The lease scan clears accounting entries for missing or terminal parents without requeuing them. For a nonterminal parent, only the winner of atomic lease reissue acts.

The recovery policy then depends on the execution path. The historical chunked path can republish preempted work; the chunkless path marks an orphan failed rather than automatically repeating a computation that may exhaust memory again. A separate sweep detects stale active jobs through their timestamps and can surface failure without requeueing. Eventual termination therefore includes explicit failure, not necessarily successful remediation.

The implementation also retains distinct cleanup responsibilities. A terminal database record may coexist temporarily with an in-flight accounting entry or incomplete auxiliary analytics. Recovery can reconcile these records without repeating the remediation operation.

### Verify Safety and Progress {.unnumbered}

The three commitments require different evidence, as does eventual progress.

**Lease safety.** Exercise acquisition, expiry, replacement, and release against the production operations. A stale guarded release must leave the replacement entry intact. Explicit-state exploration examines alternative orderings. Negative configurations disable epoch checks, terminal-state protection, or lease reconciliation and require counterexamples, challenging the checker’s ability to expose the intended failures.

**Effect exclusivity.** Race competing merge notifications and verify that only the authorized claim proceeds. A separate finite-state model examines duplicate notifications. A retained run finds no double merge with atomic claims and exposes duplicate merging when the claim is disabled. This supports the modeled safety property, not every behavior of the production database predicate.

**Publication ordering.** Inject storage failures and interruptions before and after artifact finalization. The job record must not announce completion before the artifact is available. Tests must also examine recovery when an artifact exists but the corresponding database update does not occur.

**Eventual progress.** The temporal specification represents delivery, lost notifications, and recovery sweeps. Its property is \(\mathrm{Submitted} \leadsto \mathrm{Terminal}\), under stated fairness assumptions. Configurations with and without recovery examine the sweep’s contribution. The specification abstracts away lease and merge-claim details, and the available evidence does not include a retained TLC execution establishing its results.

The tests and analyses establish different properties. DocAble’s implementation tests exercise selected transition boundaries with substitute database and storage implementations; they do not establish every behavior of the deployed stores. Explicit-state models explore their represented interleavings, while temporal analysis addresses progress under assumptions. Correspondence between these abstractions and the deployed protocol requires reconsideration when lifecycle paths change.

## Adaptation and Limits

The arrangement applies to distributed jobs whose workers may continue after losing ownership. Successive claims must remain distinguishable, and the implementation must identify which effects require exclusive authority. The storage system’s atomic operations determine how those claims can be protected.

The principal limitation is that preventing competing claims does not guarantee progress. A worker may acquire exclusive permission and then crash, leaving the work stranded. Conversely, retrying an interrupted operation may repeat an effect that succeeds before completion is recorded. Recovery must distinguish repeatable work from effects requiring reconciliation with durable state. Safety and eventual progress are separate obligations, and each requires its own evidence.
