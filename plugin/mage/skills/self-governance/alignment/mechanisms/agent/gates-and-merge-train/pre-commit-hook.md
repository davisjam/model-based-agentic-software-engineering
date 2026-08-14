# Pre-commit hook (3-stanza, tree-sha markers)

**Intent** — A three-stanza pre-commit hook that runs changed-file lints and unit-tier tests and
writes tree-sha-keyed marker files, so an agent's commit cannot advance to merge unless the cheap
checks actually passed on *exactly this tree*.

| | |
|---|---|
| Summary | Cheap changed-file checks gate every commit, marker-verified. |
| Target | Agent · **Gates & merge-train** |
| Form | `quality-gate` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — the hook fails the commit; `merge-check` rejects agent commits lacking valid markers · bypass prefixes (`sentinel:` / `tombstone:` / `chore(worktree):`) skip; `--no-verify` is **banned** for agents |

*Its place in the environment — a **variant / known-use** of **Staged Admission Gates**, under **ADMIT · Admit or reject changes**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-admit) shows how it folds.*

## Motivation — the failure it kills

Agents commit fast and often. Without a cheap gate *at commit time*, a broken change flows downstream
to the expensive gates (merge-train, deploy) where the context of *what the agent was doing* is gone
and the cost of diagnosis is highest. Worse, because the merge-train batches many agents' work, one
un-checked broken commit can poison an entire batch. The failure recurs on every commit and compounds
with fleet size: the later the break is found, the more work is entangled with it.

## Why it's not just "run CI on the pull request"

CI-on-PR is *late and coarse*: it discovers the break after the commit exists and has been batched,
far from the moment and context of authoring. The pre-commit hook is the **first and cheapest stair**
of the path-to-production staircase: changed-file-scoped lints plus unit-tier tests, run at the
instant of commit. And it does something CI-on-PR does not: it writes **tree-sha-keyed marker files**
that a downstream verifier (`merge-check`) *checks*, so "the cheap checks ran green on **this** tree"
becomes a **deterministic, forgeable-proof fact** rather than a trust assumption. What does CI-on-PR
give the merge step to trust? Only that the PR exists. This hook hands it a tree-keyed marker: the gate
fired early, and its passing is independently auditable.

## Mechanism

Three stanzas fire in order: (1) changed-file lints; (2) unit-tier tests; (3) marker write. Markers
are keyed by the **tree-sha** so a marker from one tree cannot vouch for another. A worktree
merge-check step refuses to advance an agent commit that lacks a valid marker for its tree. Bypass-prefix
subjects (`sentinel:`, `tombstone:`, `chore(worktree):`) skip the hook by design; codemod-class
waves use an explicit `pre-commit-skip: <reason>` marker (lint stanza skipped, unit-tier still runs);
`--no-verify` is banned for agents because it also skips the CWD-drift fences.

## Prerequisites

- **Changed-file-scoped lints** fast enough to run on every commit; a whole-tree sweep here would
  make commit unbearable (that is what the aggregate-lint mediator is for, later in the staircase).
- **A unit-tier test set** that runs in seconds (the "1-second rule" discipline).
- **A marker store keyed to tree identity**, so a pass cannot be replayed onto a different tree.
- **A downstream verifier** (`merge-check`) that refuses unmarked commits; without it the markers are
  advisory and the gate is skippable.

## Consequences & costs

- **Per-commit latency tax.** Every commit pays the lint + unit-tier cost; mitigated by changed-file
  scoping and unit-tier-only, but a slow unit-tier erodes commit cadence and *creates pressure to
  bypass*. The gate's cost is a direct incentive against it.
- **Bypass prefixes are a real hole.** `sentinel:`/`tombstone:`/`chore(worktree):` commits skip
  entirely; correctness there rests on those prefixes being used honestly (auditable, not prevented).
- **Marker logic is subtle and easy to break.** If the tree-sha keying drifts, markers silently stop
  matching and either block good commits or vouch for the wrong tree.

## Known uses

- The 3-stanza hook + the worktree merge-check verification.
- The `pre-commit-skip` marker for codemod-class waves (skips the lint stanza; unit-tier still runs).
- The Commit-of `i/N` trailer the hook requires on agent commits.

## Related mechanisms

- **Layer** — the *first* stair of the commit → cron → merge-train → deploy staircase; escalates into
  [merge-train-mis-batching](merge-train-mis-batching.md) and [staged-deploy-gates](staged-deploy-gates.md).
- **Layer** — [sentinel-first-commit](sentinel-first-commit.md) runs at the same commit-time stage,
  catching *substrate* failure where this catches *content* failure.
- *See also (complement)* — [role-typed-dispatch](../context-and-dispatch/role-typed-dispatch.md): the
  commit path this hook guards *consumes* the role fixed at dispatch (the `commit-slave` role is shaped
  so the hook fires).
- **Counterpart** — [lifecycle-hooks](../lifecycle-and-observability/lifecycle-hooks.md): the other kind
  of hook. This one fires on a *commit* and guards what gets **written**; that one fires on a *runtime
  lifecycle event* (turn-stop, compaction, session-start) and guards what the operator's loop **does**.
