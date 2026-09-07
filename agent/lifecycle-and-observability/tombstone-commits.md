# Tombstone commits (lifecycle close records)

**Intent** — A tombstone commit written at a worktree's branch tip that durably records its lifecycle
close and *disposition* (cherry-picked / declared-skipped), so cleanup can *prove* a worktree is safely
reclaimable instead of guessing.

| | |
|---|---|
| Summary | A close record proving a worktree is safe to reclaim. |
| Target | Agent · **Lifecycle & observability** |
| Form | `audit-trail` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *audit record* — a durable close record that the cleanup gate reads before reclaiming |

*Its place in the environment — a **variant / known-use** of **Authoritative Lifecycle State**, under **MANAGE · Manage work, state, and resources**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Reclaiming a worktree *safely* requires knowing its work is fully accounted for — every commit either
cherry-picked to main or deliberately skipped. Without a durable close record, cleanup faces a
dilemma: delete eagerly and risk **destroying unlanded work**, or never delete and **leak worktrees**
forever. The failure is one of those two, and it recurs at every agent completion.

## Why it's not just "delete the worktree when the agent is done"

"Done" is ambiguous: are all commits cherry-picked, or some intentionally abandoned? A bare delete
cannot tell the difference. A **tombstone commit records the disposition at the branch tip**, so
`cleanup-stale` can verify a precise predicate — *tombstone at tip AND every non-tombstone commit is
cherry-picked-or-declared-skipped* — before removing the directory. The alternative that fails is the
"looks finished, delete it" guess: it cannot read intent off a branch, so it either destroys unlanded
work or leaks. The disposition-bearing record is what makes the whole cleanup-stale safety chain sound.

## Mechanism

The tombstone tool writes a tombstone at the branch tip carrying a disposition. Concurrent tombstone
processes are **deduplicated via a registry event** (`tombstoning_started`, exits 78 on a second
starter — the dedup-via-registry pattern). It **refuses** to operate on any agent-id whose live marker
exists (the live-worktree guard), and
mass-tombstoning requires an explicit `--id-file`; runtime enumeration of worktree dirs is banned.
`cleanup-stale` then reads the tombstone as its safe-to-reclaim proof.

## Prerequisites

- **A place to write the close record** — here, a commit at the branch tip.
- **A disposition vocabulary** (cherry-picked / skipped) so the record is machine-checkable.
- **A dedup mechanism** (the registry `tombstoning_started` event) to serialize concurrent closers.
- **The live-worktree guard** so a still-working agent can never be tombstoned.

## Consequences & costs

- **Bypass-prefix hole.** `tombstone:` commits skip the pre-commit hook by design — needed for the
  mechanism, but a gap that rests on honest use.
- **Dedup depends on the registry.** If the `tombstoning_started` event is missed, two closers can race.
- **A wrong disposition is dangerous.** A tombstone that mis-records "skipped" for un-landed work would
  greenlight an unsafe reclaim — the reclaim trusts the record's *correctness*.
- **Mass-tombstone id-lists are manual.** The `--id-file` discipline is a human step (deliberately, to
  prevent runtime enumeration).

## Known uses

- The tombstone tool — writes the disposition-bearing close record.
- The dedup event (`tombstoning_started`, exit 78); the explicit-id-list + live-worktree guard.
- The `cleanup-stale` predicate (tombstone-at-tip AND all commits cherry-picked/skipped).

## Related mechanisms

- **Consumer** — reads [agent-registry](agent-registry.md) live markers before writing a close record
  (the live-worktree guard).
- **Enabler** — `worktree.py cleanup-stale` verifies the record it writes before reclaiming a
  directory.
- **Counterpart** — the live-worktree guard (hard) prevents this audit record from ever being
  written for an agent that is still working.
