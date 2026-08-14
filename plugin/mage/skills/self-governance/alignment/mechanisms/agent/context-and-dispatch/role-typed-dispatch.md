# Role-typed dispatch

**Intent** — Dispatch every agent under a **typed role** (`sonnet-active` / `opus` / `lint-runner` /
`commit-slave`) that determines its LLM, isolation mode, permissions, and which gates apply, so
those choices are policy-by-type, not a per-dispatch judgment call.

| | |
|---|---|
| Summary | A typed role fixes LLM, isolation, and gates per dispatch. |
| Target | Agent · **Context & dispatch substrate** |
| Form | `quality-gate` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking at each gated op* — enforcers refuse calls whose role doesn't match (e.g. `lint-all` refuses `sonnet-active`) · human bypass `ADA_TOOL_BYPASS_ORCHESTRATOR_CHECK=1` (audit-logged) |

*Its place in the environment — a **variant / known-use** of **Closed Action Vocabulary**, under **CONSTRAIN · Constrain where and how agents act**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-constrain) shows how it folds.*

## Motivation — the failure it kills

Every dispatch bundles several correlated decisions: which LLM (Opus for architecture, Sonnet for
mechanical work), whether the agent runs in an isolated worktree or on `main`, and which compute gates
it must respect. Made ad hoc, these decisions drift apart from the work: a Sonnet gets pointed at an
architecture change whose incorrect output would cause an incident; a commit agent runs in a worktree
when it needs to be on `main` for the hook to fire; a resource-hungry agent runs the aggregate lint it
should never trigger. The failure recurs on *every* dispatch and is invisible until the wrong-tier
output ships or the gate is bypassed.

## Why it's not just "pick the right LLM each time"

"Pick the right LLM" is a per-dispatch judgment, and per-dispatch judgment is exactly what drifts
under load and gets skipped under time pressure. A **role is a typed enum** that binds the whole
bundle (LLM, isolation, permission mode, and the set of gates) once, and is then **enforced**: the
`lint-all` role-enforcement gate *refuses* to run under `sonnet-active`; `commit-slave` is defined to
operate on `main` (no worktree) so the commit hook fires; enforcers key on `ADA_TOOL_AGENT_ROLE`. Four independent judgments a dispatcher
re-makes each time drift apart under load. One named type carries the LLM, isolation, permissions,
and gate set together, so they cannot silently diverge.

## Mechanism

The role is a small closed enum. Each role maps to a policy tuple:

| Role | LLM | Isolation | Notable policy |
|---|---|---|---|
| `sonnet-active` | Sonnet | worktree | refused by the aggregate-lint role gate |
| `opus` | Opus | worktree | architecture / RCA / multi-file |
| `lint-runner` | — | worktree | may run aggregate lint |
| `commit-slave` | Sonnet | **none (on `main`)** | commits via an agent commit helper so the hook fires |

The dispatch tool's `--role <r>` selects the tuple; downstream enforcers refuse calls that don't match the
declared role. Because the role is declared once and read everywhere, the correlated decisions can't
silently diverge.

## Prerequisites

- A **role registry**: the closed enum plus its policy tuple. Free-form role strings reintroduce the
  drift the mechanism removes.
- **Enforcers that read the role** at each gated operation (via an env var like
  `ADA_TOOL_AGENT_ROLE`), so a mis-roled agent is refused rather than merely mislabeled.
- A **dispatch wrapper** that is the sole way to set the role, so it cannot be set inconsistently.

## Consequences & costs

- **A closed enum is rigid.** A task that fits no role forces a mis-fit or a new role. The enum's
  virtue (no per-dispatch drift) is also its cost (no per-dispatch flexibility).
- **The role leaks.** `ADA_TOOL_AGENT_ROLE` propagates into subprocesses; the build-pool agent must
  *not* export it or it trips the role guard in a downstream deploy. The type that fixes dispatch
  policy also becomes ambient state that has to be special-cased.
- **Declaring ≠ matching.** A role fixes LLM/isolation/gates but does not verify the *work* suits the
  role: a Sonnet mis-dispatched onto an architecture change still ships. Routing judgment (Opus vs
  Sonnet) stays with the human; the role only makes the choice legible and enforceable, not correct.
- **Bypassable** via the orchestrator-check escape (audit-logged).

## Known uses

- The four roles above (`sonnet-active` / `opus` / `lint-runner` / `commit-slave`).
- The [[aggregate-lint-runner|aggregate lint runner]]'s role-enforcement policy gate that refuses `sonnet-active`.
- A dispatch rule: `commit-slave` operates on `main` directly (no `isolation`), unlike every other role.
- Build-pool exception: the build-pool agent must *not* export `ADA_TOOL_AGENT_ROLE` (it would
  propagate into deploy subprocesses and trip the role guard), a documented edge of the same
  enforcement.

## Related mechanisms

- **Consumer** — [pre-commit-hook](../gates-and-merge-train/pre-commit-hook.md): the commit path
  consumes the role fixed at dispatch; the `commit-slave` role is shaped precisely so the hook fires.
- *See also (complement)* — [brief-linting](brief-linting.md): checks the brief carries the isolation
  marker the role implies.
- *See also (complement)* — [dynamic-context-injection](dynamic-context-injection.md): the other
  dispatch-time input (content), where role is the dispatch-time policy.
