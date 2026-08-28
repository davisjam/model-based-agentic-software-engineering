# Operational playbooks

**Intent** — A library of documented, devops-themed decision procedures (*when situation X arises, take
these steps in this order*) that agents and orchestrators consult instead of reasoning from scratch, so
recurring operational situations (a broken deploy, a wedged cron, a stuck worktree, a chicken-and-egg
recovery) get a consistent, pre-reasoned, incident-tested response.

| | |
|---|---|
| Summary | Situation-keyed devops procedures agents follow instead of improvising. |
| Target | Agent · **Governance-doc mechanisms** |
| Form | `agent-output` |
| Move | `constraint` — prevents the error by construction |
| Model | — |
| Enforcement | **Soft** (probabilistic) — a playbook *aims* the response; it informs, it does not block. Its value is that the correct steps are written down and discoverable at the moment they're needed. |

*Its place in the environment — the **canonical mechanism** for **GOVERN · Govern the control machinery itself**. The variants and known uses that fold under it are gathered on the [construction-kit page](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-govern).*

## Motivation — the failure it kills

Operational situations recur: a deploy fails a known way, a cron loop can't self-recover, a worktree is
destroyed mid-flight, an alert gate deadlocks. Each time, an agent under incident pressure re-derives a
response from first principles and gets the sharp edges wrong: a flailing `git reset` destroys landed
work, a naive cron restart re-enters the same loop, a "cleanup" removes a live worktree. The failure is
*inconsistent, error-prone operational response that recurs on every incident*, and the cost is highest
exactly when time is shortest.

## Why it's not just "let the agent reason it out from the docs"

An agent can reason a response out from the docs, and it will, badly, under time pressure, re-deriving a
procedure a human already worked out and debugged once. A playbook removes the re-derivation: it names the
trigger, gives the ordered steps, and lists the *reflexes to avoid* (the `reset`-that-destroys, the
restart-that-loops), all reasoned once when no incident was burning. It is the devops runbook promoted to a
first-class governance document the orchestrator is explicitly told to consult, closer to a reusable
**skill** than to prose documentation.

## Mechanism

Each playbook names a triggering situation, the ordered response steps, and the anti-pattern reflexes to
avoid. Playbooks are cross-referenced two ways: from the terse [rule index](claude-md-rule-index.md)
(which points at the long-form procedure), and from the substrate that emits the triggering signal, so
the observability surface for a topic carries "baseline-healthy · what-looks-wrong · **which playbook to
open**." The orchestrator is instructed, at the trigger, to consult the relevant playbook rather than
improvise.

**Adopt it — the [operational-playbook starter](../../downloads/op-playbook-starter.md)** gives the
per-situation entry shape: the triggering question, the inspect command, baseline-healthy (quantified),
and *what-looks-wrong → what-it-means → what-to-do* (with the deadlock/wedge escape where a substrate can
get stuck). Add one entry per signal the substrate emits.

## Prerequisites

- **A recurring, nameable operational situation.** A one-off doesn't earn a playbook.
- **A human who has reasoned out the correct response once** (including the reflexes to avoid), so the
  playbook encodes hard-won judgment rather than a guess.
- **Discoverability at the moment of need.** A home plus cross-references from the rule index and from
  the signal that triggers it; an unlinked playbook is never opened.

## Consequences & costs

- **Soft: an agent can ignore it.** A playbook informs; nothing forces the agent to open or follow it.
  Its leverage is entirely discoverability + habit.
- **Playbooks rot.** When the substrate changes, a playbook whose steps aren't updated actively
  mis-directs the response, worse than no playbook.
- **Dead weight if the situation stops recurring.** A playbook for a retired failure mode is noise.
- **Not a substitute for prevention.** A situation that recurs often enough should be *designed out*
  (architecture) or *gated* (a hard sensor), not merely playbooked.

## Known uses

- The event-bus observability playbook (per topic: baseline-healthy → what-looks-wrong → response).
- The cron-recovery playbook (the chicken-and-egg "cron is broken and can't restart itself" procedure).
- The cron-alerts-gate recovery playbook (how to clear a wedged HIGH-severity gate).
- Deploy-failure pattern tables (symptom → cause → section) consulted before investigating.

## Related mechanisms

- **Counterpart** — the [typed event bus](../lifecycle-and-observability/typed-event-bus.md) *emits* the
  signals; a playbook says what to *do* about them. A signal with no playbook is unactioned noise; a
  playbook with no signal is never triggered. They are distinct notions: observability surfaces state,
  the playbook prescribes the response.
- **Enabler** — a playbook is only useful once
  [observability](../lifecycle-and-observability/typed-event-bus.md) (or an alert) surfaces the
  triggering situation; the signal is the playbook's entry point.
- *See also (family)* — the [rule index](claude-md-rule-index.md) is the terse index that links out to
  these long-form procedures; playbooks are where a one-line rule expands into steps.
