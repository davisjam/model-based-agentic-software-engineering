<!-- GENERATED from book/latex/sources/appendix-handbook/job-ownership-and-recovery.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## Problem

A worker may continue executing after its lease expires. Its delayed release must not erase a replacement lease. Recovery must also protect effects, resolve stranded work, and prevent a database row from announcing an unavailable output.

This blueprint concerns runtime document-remediation jobs. [ref:chapter:appendix-a-governed-delegation] governs coding-agent assignments, whose lifecycle and acceptance procedure differ.

## Conceptual Design

The design separates accounting for in-flight work, acquiring a protected-effect claim, and announcing a durable result. The lease keeps work visible outside ordinary queues; the effect claim atomically controls a selected operation; publication orders artifact finalization before completion. Redis, database, and artifact-store operations do not form one transaction.

DocAble’s lease design keeps a merging parent visible to demand counting, preventing scale-down during active work. Inline chunkless completion releases the accounting lease after its terminal database update; a frontier-finalization adapter reuses the retired page-chunked engine’s merge claim and epoch-checked terminal hooks.

Atomic operations protect state changes; explicit-state exploration examines interleavings; temporal analysis examines eventual termination under delivery and scheduling assumptions. [ref:match-mechanism-to-property] distinguishes these obligations.

The accounting, claim, and publication boundaries appear separately in [ref:handbook-recovery-architecture].

<!-- label: handbook-recovery-architecture -->
<!-- figure: assets/handbook-recovery-architecture.svg | *Three commitments in job recovery.* The Redis lease records in-flight work by job ID and issue epoch; it does not identify an owning worker. A database compare-and-set protects acquisition of the selected merge claim, while publication persists the artifact before updating durable job state. The inline path bypasses that merge claim. These operations cross separate stores; recovery and assurance address their different failure windows. [short: Three commitments in job recovery] -->

## Engineering Models

### State and Identity {.unnumbered}

[ref:handbook-job-recovery-models] separates persisted state from local protocol state.

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

{{chapter:modeling}}’s generation abstracts successive claims. The implementation discriminator is a floating-point issue timestamp, not an incrementing counter. The executable lease model uses integer ticks and distinguishes the original worker’s held epoch from the replacement lease’s epoch. These abstractions do not imply a Redis worker-ID field or authority over every operation. The lease entry alone cannot identify which worker is executing the job; that question requires a worker identity or a link to an execution record.

Local worker state and durable job status answer different questions. An inline worker can return to idle after the database records completion. The merge path additionally tracks waiting, merging, and finalizing work. A conformance mapping must identify which path it describes and which durable evidence supports recovery.

## Realization

### Implement Conditional Lease Operations {.unnumbered}

Introduction first wins a database claim changing `queued` to `remediating`; it then adds the parent ID to the Redis sorted set with the current time as score. These are separate operations. The Redis write is best-effort, so the database claim can exist without its accounting entry. Staleness is a comparison with a cutoff, not automatic removal of the sorted-set member. Reissue replaces the score; the parent lease has no per-worker heartbeat-renewal operation.

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

If A retains an old epoch while reclaim installs a distinguishably newer one for B, A’s guarded release returns zero; B can remove its matching entry. Rechecking staleness atomically prevents two scans from winning the same reclaim. The comparison tolerance requires replacement identities to remain distinguishable at the actual clock resolution.

Inline chunkless completion calls the omitted-epoch branch after its terminal database compare-and-set; dispatch-failure cleanup also uses it. The merge hook instead presents its claim-time snapshot. The API therefore supports both guarded release and unconditional cleanup.

### Claim the Effect and Classify Recovery {.unnumbered}

The merge claim is a single database update whose returned row identifies the winner. The coordinator selects `merging` as its target stage, while `merge_claimed` is the push consumer’s target. Its essential predicate is:

``` text
UPDATE jobs
SET stage = target_stage, progressed_at = server_now
WHERE id = job_id AND stage <> target_stage
  AND status NOT IN ('failed', 'completed',
                     'deleted', 'cancelled')
RETURNING id;
```

Only a caller receiving a row proceeds to the merge. A second caller using the same target stage loses while that stage remains claimed. The snippet’s exclusion set is specific to this primitive; a general terminal-state fence requires reconciling it with the other lifecycle consumers. The two target-stage variants also rely on route selection: their predicates alone do not establish mutual exclusion between callers using different target stages.

Recovery must classify the job before deciding what to repeat. The lease scan clears entries for missing or terminal parents without requeuing them. For a nonterminal parent, only the winner of atomic lease reissue acts. The historical chunked branch republishes preempted work; the chunkless branch marks an orphan failed rather than repeat a potentially OOM-inducing computation. A separate stale-active-job sweep examines start and progress timestamps and surfaces failure without automatic requeue. Eventual termination can therefore mean an explicit failure, not eventual successful remediation.

### Publish the Fallback and Examine Crash Points {.unnumbered}

The fallback driver first archives the corrupt output and records diagnostic feedback on a best-effort basis. Its publication sequence is `FALLBACK_STAGED` \(\rightarrow\) `FALLBACK_UPLOADED` \(\rightarrow\) `DB_UPDATED`. The hooks copy the original input to the output location, finalize the artifact, then conditionally write `COMPLETED_UNMODIFIED` from `REMEDIATING`. A remote store uploads during finalization; a local store may already have the file. Analytics and chunk cleanup follow. [ref:2.4-behavioral:heading:publishing-a-recovered-result] explains the ordering obligation.

<!-- label: handbook-job-recovery-failures -->
<!-- table: *Interruption points in job recovery.* Atomic claims protect individual decisions; artifact persistence and later bookkeeping retain separate failure windows. [short: Interruption points in job recovery] -->
| **Interruption** | **State or source behavior** | **Recovery consequence** |
|---|---|---|
| After merge claim, before completion | The stage claim survives; repeating the same claim loses. | A notification alone cannot undo the claim. Timeout and stale-work handling must resolve a stranded job; do not repeat the effect merely because a lease expired. |
| Fallback copy or finalization raises | The driver aborts before the fallback-completion write and delegates failure outward. | The output is not advertised as completed by this sequence. A process crash bypasses those exception hooks and needs external detection. |
| Artifact finalized, database update not reached | Storage can contain the fallback while the row remains nonterminal. Recovery-step state belongs to the interrupted invocation. | Inspect both artifact and row; this state machine does not supply a persisted checkpoint for automatic resume. |
| Terminal database write, lease clear missed | An accounting entry can outlive completed work. | Terminal-lease reconciliation clears it without starting remediation again; repeated removal of an absent entry is harmless. |
| Terminal write, later bookkeeping interrupted | Artifact and completion can exist without all later analytics or cleanup. | Reconcile auxiliary work separately. Ordered hooks do not make all side effects transactional or exactly once. |

### Test Safety, Progress, and Correspondence {.unnumbered}

Test the production lease operations against stale and current claim epochs. Exercise fallback publication with injected storage failures, checking that the artifact is finalized before completion is recorded. Race competing completion attempts and verify that only the authorized claim proceeds. DocAble’s tests exercise these boundaries with substitute database and storage implementations; they do not establish the behavior of every external storage system or deployment configuration.

Explicit-state exploration varies the order of lease acquisition, expiry, replacement, and release. The model must reject stale releases that invalidate newer claims. Negative configurations disable the epoch check, terminal-state protection, or lease reconciliation and require counterexamples, challenging the checker’s ability to detect those failure classes.

A separate merge-claim model examines duplicate notifications. A retained run finds no double merge with atomic claims and exposes duplicate merging when the claim is disabled. This supports the model’s selected safety property, not the full database predicate or production behavior.

The temporal specification addresses progress. It represents delivery, lost notifications, and recovery sweeps, with the property \(\mathrm{Submitted} \leadsto \mathrm{Terminal}\) under stated fairness assumptions. Paired configurations enable and disable recovery to test the sweep’s role. They abstract away the lease and merge claim, so this analysis cannot establish those mechanisms’ implementation correctness. The available evidence contains the specification and configurations, but no retained TLC execution establishing their results.

Correspondence checks connect these models to the protocol: compare declarations, exercise implementation operations against the model, and revisit mappings when paths change. Abstract generations, timestamp-based lease operations, and durable stage claims preserve different details; each needs evidence at the boundary it describes.

## Adaptation and Limits

The ownership protocol can be adapted to other distributed jobs, provided that successive claims remain distinguishable and that stale workers cannot revoke newer authority. The implementation must also identify which effects require exclusive claims and which state transitions permit recovery. These decisions depend on the storage system’s atomic operations and the consequences of repeating work.

The principal limitation is that preventing competing claims does not guarantee progress. A worker may acquire exclusive permission for an effect and then crash, leaving the work stranded. Conversely, retrying an interrupted operation may repeat an effect that succeeds before its completion is recorded. Recovery must therefore distinguish work that can safely be repeated from work that requires reconciliation with durable state. Safety and eventual progress are separate obligations, and each requires its own evidence.
