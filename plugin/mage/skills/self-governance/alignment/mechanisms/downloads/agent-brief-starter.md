<!--
  Agent-brief template — STARTER (adopt & adapt)

  The third of the three artifacts an orchestrator authors: the Epic is the effort, the design doc is
  the plan, and the *brief* is the dispatch — the entire instruction set an agent reads before it starts
  mutating the repo. A brief with a missing or fuzzy section fails silently and downstream, so the shape
  below front-loads scope, context, and acceptance.

  This is the PORTABLE core — the brief-authoring discipline. A real system also threads substrate
  plumbing through every brief (worktree isolation, dispatch-id markers, mandatory safety snippets, a
  commit-cadence protocol); that plumbing is specific to your harness. The enforcement side is described
  by the "brief linting", "mandatory-snippet table", and "role-typed dispatch" mechanisms in the
  catalogue — a lint that greps the brief for its required markers before the agent launches is what makes
  this template a gate rather than a suggestion. Replace the bracketed placeholders.
-->

# Brief: <short-name> (<Opus | Sonnet>)

**Epic:** Per <link to the Epic/design doc> — <the one-line slice of it this brief executes>.
**Trigger:** <why this brief exists right now — the specific defect, its blast radius, and how it was
found. Be concrete: "measurement X failed at step Y because Z"; not "improve the thing.">

## Role & model

- **Model:** <Opus for multi-file / architecture / unclear-root-cause / RCA; Sonnet for single-file,
  mechanical, well-understood changes and test-writing.>
- **Role:** <e.g. implement | review | investigate — and any policy that role fixes: isolation, which
  gates it must pass, whether it may commit.>

## Time budget

**<N> min hard cap.** If you hit it, **document what you found and stop** — commit a partial with a
verbose hand-off note. A stub that says "here's where I got to and what's left" beats an unfinished edit
with no trace. Do NOT arm a background monitor and end the turn; commit synchronously as your last act.

## Scope

- **In scope (allowlist):** <the exact subtrees/files you may touch — `src/foo/`, `lib/bar.py`>. Working
  outside these is out of scope even if it looks related.
- **NON-goals (don't touch):** <the adjacent things that look in-scope but aren't — a refactor you'll be
  tempted into, a sibling module, a formatting sweep>. A don't-touch list prevents merge conflicts with
  concurrent agents and scope creep.

## Pre-work — context (so you Read, not grep)

Paste the load-bearing context so the agent opens files at the right line instead of searching top-to-bottom:

```
<file:line> — <5-line excerpt of the code to change, or the invariant it must preserve>
<file:line> — <the call site / test / schema it must stay consistent with>
```

## Execution

1. <step — the specific change, in order>.
2. <step>.
3. <if a class-level bug: the fix at N sites AND a lint/test that prevents the class from recurring —
   don't just patch one site>.

## Verification

- Run <the narrowest test filter that covers this change — a single class/file, not the full suite>.
- <Any manual/behavioral check with the expected result. Pin a side-effect of the *intended* path — a
  test named `Vision_*` that silently routes to a fallback proves nothing.>
- Do NOT run the full pre-deploy suite from inside the brief unless the change demands it.

## Acceptance (the definition of done for THIS brief)

<A specific, testable criterion — "`grep -E <pat> src/ | wc -l` returns 0"; "`<test>` passes"; "the lint
exits 0 on the changed files". "It works" is not an acceptance criterion.>

## Hand-back

- Commit in reasonable, self-contained steps with intent-stating messages.
- Final report: what changed, what you verified (with the command output), what you did NOT do and why,
  and any defect/regression you noticed — surfaced as its own item, not buried in the mechanics.
- **Trust nothing on my behalf:** if you claim a gate passes, you ran it; if a step was skipped, say so.

<!--
  Substrate plumbing to add for your harness (not portable — this is where your enforcement lives):
  - Isolation: run in an isolated worktree/branch, discovered at boot, so a mis-placed agent can't
    mutate the trunk.
  - A boot self-check that asserts the agent is where it should be and bails otherwise.
  - Mandatory safety snippets (PATH/env setup, test-runner mediator, commit protocol) — enumerated in a
    registry a pre-launch lint greps for, so a brief missing one cannot be dispatched.
-->
