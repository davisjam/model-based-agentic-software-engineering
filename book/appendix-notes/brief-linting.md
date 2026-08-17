<!-- note-spread: 2 -->

**Intent** — Statically lint an agent's task brief *before the agent is spawned*, refusing to launch any
brief that is missing the markers which make the agent's work safe and well-scoped.

## Problem

A brief is the agent's entire world. It is the only instruction set the agent reads before it starts mutating
a repository, and a brief with a missing marker does not fail loudly — it fails silently and downstream. Omit
the worktree-isolation marker and the agent edits the main line directly, with no fence firing. Omit the
dispatch identifier and the lifecycle substrate cannot track or clean the agent. Omit a mandatory safety
snippet — a path export, the commit cadence, a submodule check — and the agent trips a sharp edge twenty
minutes in.

Brief authoring is a manual act repeated for every dispatch, so the failure is not a one-off. It is a class
that recurs on each launch and compounds across a concurrent fleet.

<!-- note-fold -->

## Mechanism

The linter runs a battery of presence checks over the brief text: the worktree-isolation marker present, the
dispatch identifier present *and* its matching per-agent marker file on disk, every mandatory snippet's marker
string present, the agent role declared. A non-zero exit means do not launch. The linter is not a standalone
habit an operator remembers to run. The canonical dispatch path calls it as a required step and rolls back the
just-written marker file when the lint fails, so the dispatch path itself is the enforcement.

## Engineering Consequences

Review of a brief is a probabilistic check: it catches the missing marker only when the reviewer thinks to
look, and reviewers reliably miss the boring structural markers precisely because they are boring. The lint is
deterministic at the point of no return — after dispatch the agent is autonomous and the cost of an omission
is unrecoverable. A gate catches the boring marker every time; review catches it only sometimes.

Structure is not correctness, though. The lint proves a brief is well-*formed*, not well-*scoped*: a brief
with every marker present can still task the agent with the wrong thing. A green lint buys marker coverage,
and the human still owns the scoping judgment.

## Implementation Seam

The lint needs briefs to be structured text with grep-able marker strings, a registry of mandatory snippets it
can enumerate, and a dispatch wrapper that calls it on the canonical path and refuses to proceed on failure.
Without that wrapper the lint is optional, and an optional gate is skipped under time pressure.

A mature lint adds a *content* layer on top of marker presence — does the brief cite a real file and line,
declare its footprint, name a reachable commit? That layer has a trap: a check that fires on any mention of a
file or a commit-shaped token false-positives on briefs where the citation is not required, and an operator
who learns the lint cries wolf starts ignoring it. The fix is to have each brief declare its genre, so a
content check fires only when the genre demands that citation. A lint tuned out is worse than a check never
written.

## Known Limitations

Each new marker is a maintenance edge: a new mandatory snippet means both a new check and threading the marker
into the brief template, and drift between the two produces false rejections. The whole gate is bypassable by
design, through a human-only, audit-logged escape hatch, so its floor is the discipline of not misusing that
hatch. Its ceiling is intent, not form: a perfectly-structured brief that points the agent at the wrong work
sails straight through.
