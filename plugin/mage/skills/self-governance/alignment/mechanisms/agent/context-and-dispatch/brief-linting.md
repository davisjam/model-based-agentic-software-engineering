# Brief-linting

**Intent** — Statically lint an agent's task brief *before the agent is spawned*, refusing to launch
any brief missing the markers that make the agent's work safe and well-scoped.

| | |
|---|---|
| Summary | Reject a malformed dispatch brief before it can launch. |
| Target | Agent · **Context & dispatch substrate** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — exit 1 refuses the launch · bypass `ADA_TOOL_BYPASS_AGENT_FENCE=1` (human-only, audit-logged) |

*Its place in the environment — the **canonical mechanism** for **ADMIT · Admit or reject changes**.*

## Motivation — the failure it kills

A brief is the agent's entire world: it is the only instruction set the agent reads before it starts
mutating a repository. A brief with a missing marker does not fail loudly. It fails *silently and
downstream*. Omit the worktree-isolation marker and the agent edits `main` directly, with no fence
firing. Omit the dispatch-id and the lifecycle substrate can't track or clean the agent. Omit a
mandatory safety snippet (PATH export, commit-cadence, submodule check) and the agent trips a sharp
edge 20 minutes in. Because brief authoring is a manual act repeated for *every* dispatch, the failure
is not a one-off; it is a class that recurs on each launch and compounds across a concurrent fleet.

## Why it's not just "review the brief before you send it"

Human (or orchestrator) review of a brief is a **probabilistic** check: it catches the missing marker
*if* the reviewer happens to look for it, and reviewers reliably miss the boring structural markers
precisely because they are boring. Brief-linting is a **deterministic** check at the point of no
return. It greps for each required marker string and exits non-zero if any is absent, so a
malformed brief *cannot be dispatched* rather than *is unlikely to be*. It also moves the check to
the one moment that matters: the pre-dispatch instant, after which the agent is autonomous and the
cost of the omission is unrecoverable. A gate catches the boring marker every
time; review catches it only when the reviewer thinks to look.

## Mechanism

The brief linter runs a battery of grep-style checks over the brief text: worktree-isolation
marker present, `dispatch-id: agent-<id>` token present *and* the matching per-agent marker file
exists on disk, every mandatory snippet's marker string present, `subagent_type` declared. Exit 1 ⇒
**do not launch**. It is not a standalone habit: the canonical [[dispatch-tool|dispatch path]] calls it
as a required prepare step and rolls back the just-written marker file if the lint fails, so the
dispatch path *is* the enforcement.

**Adopt it — the [agent-brief starter](../../downloads/agent-brief-starter.md)** is the portable shape a
brief takes (Epic cite · trigger · role/LLM · time cap · scope allowlist + non-goals · pre-pasted
`file:line` context · verification · acceptance · trust-nothing hand-back). It is the third of the three
artifacts an orchestrator authors: the Epic is the effort, the design doc is the plan, the brief is the
dispatch. The marker/snippet plumbing this lint checks is the harness-specific enforcement layered on top.

## Genre-gate the content checks (so the lint can grow without crying wolf)

Marker-presence is the *structural* layer. A mature brief lint adds a *content* layer (does the brief
cite a real `file:line`, declare its footprint, cite a **reachable** commit SHA?), and that layer has a
trap: a content check that fires on any *mention* (a filename, a path, a SHA-shaped token)
**false-positives on briefs where the citation isn't required**. A doc-only brief that merely names a source
file trips the "cite the code you touch" check; the operator learns the lint cries wolf and starts
ignoring its output, the exact failure the whole mechanism exists to prevent.

The fix: the brief declares its **genre**. It carries a `brief-genre` marker (emitted by the same template
that lays down the structural markers), and each content check *gates* on it, firing only when the genre
requires that citation (the "cite the code" check on a code brief, not a design-doc one; the
SHA-reachability check only where a citation is actually required). No genre marker → every check fires,
the safe default. Genre-gating is what lets the content layer keep growing (more checks, more precision)
without eroding the trust the structural layer earned. A lint tuned out is worse than a check not written.

## Prerequisites

- Briefs are **structured text with grep-able marker strings**, not free prose; the lint's checks
  are string presence assertions.
- A **mandatory-snippet registry** the lint can enumerate (see
  [mandatory-snippet-table](../governance-doc-controls/mandatory-snippet-table.md)).
- A **dispatch wrapper** that calls the lint on the canonical path and refuses to proceed on failure.
  Otherwise the lint is optional and therefore skipped under time pressure.

## Consequences & costs

- **Structure is not correctness.** The lint checks that a brief is *well-formed*, not that it is
  *well-scoped*: a brief with every marker present can still task the agent with the wrong thing. A
  green lint buys safety-marker coverage, not a good brief; the human still owns scoping judgment.
- **Authoring tax.** Every brief must now carry boilerplate markers, making hand-authoring heavier.
  A brief-template generator mitigates this by pre-placing them by construction. Without the generator
  the markers become friction the author routes around.
- **Each new marker is a maintenance edge.** A new mandatory snippet means both a new lint check *and*
  threading the marker into the template; drift between the two produces false rejections.
- **Bypassable by design.** `ADA_TOOL_BYPASS_AGENT_FENCE=1` exists for humans; the mechanism's floor is
  the discipline of not misusing the escape hatch (audit-logged, but still a hole).

## Known uses

- The agent CWD-drift-defense rule: the `isolation: "worktree"` marker is BLOCKING and lint-verified.
- The dispatch wrapper's prepare step emits its go-ahead only after the brief passes.
- A dedicated check verifies the dispatch-id token *and* the on-disk marker together, closing the
  "token present but no live agent" gap.

## Related mechanisms

- **Enabler** — [mandatory-snippet-table](../governance-doc-controls/mandatory-snippet-table.md)
  supplies the snippet markers this lint asserts; the registry must exist before the lint can check
  for them.
- *See also (complement)* — [dynamic-context-injection](dynamic-context-injection.md): the *content*
  side of dispatch (injects the rules relevant to the target files) where brief-linting is the
  *structure* side (checks the brief is well-formed). Same stage, orthogonal jobs.
- *See also (complement)* — [role-typed-dispatch](role-typed-dispatch.md): the other half of a
  well-formed dispatch, the role that fixes LLM, isolation, and gate set.
