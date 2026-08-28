# Self-governance (detect your own recurring issues; convert each into a tasteful control)

**Intent** — Give the system permission to govern *the way it is governed*: let it detect its own recurring issues and introduce **tasteful** — proportionate, right-sized — constraints and controls that prevent their recurrence, rather than re-patching each instance by hand. When a failure recurs, classify the failure **class**, then add the smallest durable guardrail that kills it: a constraint that makes the wrong move unrepresentable where one can be built, else a sensor that detects and fails it. Fire that conversion on a cadence, so the loop runs by design and not by whoever happens to remember (our instance: a loadable failure-interpretation skill invoked by a turn-end reflection hook that fires at most once per window).

| | |
|---|---|
| Summary | Detect a recurring failure class; convert it into a proportionate control, fired on a cadence. |
| Target | Agent · **Governance-doc mechanisms** |
| Form | `agent-output` |
| Move | `package` — a soft discipline (the conversion judgment) shipped with a hard sensor (the periodic hook that guarantees it fires) |
| Model | — |
| Enforcement | **Soft·Hard** — the skill *aims* (it recommends and scaffolds the control, it cannot install or block); the hook that fires it is a hard, deterministic runtime binding (the reflection runs whether or not anyone remembers) |

*Its place in the environment — the generative engine behind **Encoded Operational Judgment** and the **Governed Knowledge Base**, under **GOVERN · Govern the control machinery itself**; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-govern) shows how it folds.*

## Motivation — the failure it kills

The recurring failure is **re-patching an instance of a class the fleet will hit again**. The same cherry-pick false-rejects a second time; the same lint mis-fires; the same manual step gets re-done by hand. Each time it is fixed *locally*, so the class survives to bite the next agent, and the governance system grows by accident instead of by design.

Two sub-failures compound it:

- **The conversion depends on someone noticing.** Turning an instance fix into a class-killing control requires an operator to spot the recurrence and, under time pressure, choose to build the guardrail instead of just clearing the blockage. That judgment is exactly what gets skipped when the queue is deep.
- **Even a team that believes in conversion forgets to do it.** On a long autonomous run the trigger — *this has happened before* — lives only in fallible memory. A discipline that fires only when remembered does not fire on the run that most needs it.

The cost is a fleet whose velocity never converts into durable trust: it keeps re-solving solved problems, and its guardrail set never reflects what it has actually learned.

## Why it's not just "a lint"

- **Not just a lint.** A lint is the *output* of one conversion; self-governance is the meta-process that *manufactures* lints — and gates, and typed seams — from observed failures. A catalogue of lints answers "what do we check?"; this answers "how does that catalogue grow correctly, and stay proportionate?"
- **Not just a runbook.** A runbook responds to a **known** situation with pre-reasoned steps. Self-governance creates a **new** control for a novel recurring failure no runbook yet covers — it closes the loop back into the control machinery rather than executing within it.
- **Not just "write good tests."** The trigger is the recurrence signal plus the periodic hook, not test-writing diligence. And the preferred output is a **constraint** that prevents the class, not merely a **sensor** that detects it — a distinction test-writing never reaches for. The word *tasteful* is load-bearing: the loop is disciplined to add the smallest guardrail that closes the class, so governing the system does not calcify it.

## Mechanism

Two halves, one soft and one hard, packaged together.

- **The conversion loop.** On a recurrence, name the failure **class**, not the instance. Then pick the durable control that kills it from a small, ordered vocabulary: prefer a **constraint** — a typed seam, a closed enum, an architecture that makes the wrong move unrepresentable — and fall back to a **sensor** — a lint, a gate, a test, a runtime hook — when no constraint can be built. Right-size it: the control should be proportionate to the failure, not the maximal guardrail the class could bear. The loop **scaffolds** the control and hands the hard artifact to a human or the harness to install; it proposes, it does not install.
- **The time-aware trigger.** A reflection hook bound to a runtime lifecycle event — turn-end, or a stop signal — fires the loop on a cadence, **at most once per window** so it aims without decaying into alarm-fatigue noise. It asks a single question: did a failure recur that should become a control? The trigger is deterministic; the conversion it prompts is the soft judgment. This is what makes the discipline reliable rather than memory-dependent.
- **A design-time companion.** The same stance run *before* a subsystem exists audits it for the predictive smells — shared mutable state, an irreversible operation, a duplicated fact — whose failure class can be prevented **by construction**, so a class need never be felt to be closed.

## Prerequisites

- **A recurrence signal.** The loop keys on *the second occurrence*, so the system needs some way — memory, an incident log, an operator's recall — to recognize that this failure has happened before. Without it, every failure looks novel and nothing converts.
- **A runtime lifecycle event to bind to.** The cadence half depends on the harness exposing a hook (turn-end / stop / session-start) a script can register against. A system with no lifecycle events to bind falls back to a memory-driven trigger, which is the failure this mechanism exists to fix.
- **A closed control vocabulary.** "Pick the durable control" is only checkable if the menu — constraint kinds and sensor kinds — is enumerated, so the conversion produces a known shape rather than an ad-hoc one.
- **Somewhere for the output to land.** A converted failure becomes a rule or a check that must live in an enforced, bounded home (the Governed Knowledge Base), or the estate grows without an index and the next conversion cannot see what already exists.

## Consequences & costs

- **The proposing half is soft.** The skill recommends and scaffolds; it cannot block a violation on its own. Its value is being loaded and heeded, and the hard hook only guarantees the *prompt*, not the *action*.
- **Cadence tuning is a real cost.** Fire the reflection too often and it becomes the alarm fatigue it was built to avoid; too rarely and a recurrence ages past the moment it was cheapest to convert. The at-most-one-per-window gate is the knob, and it needs a sensible window.
- **Taste does not automate.** "Proportionate" is a judgment. The loop can enumerate the control menu and prompt the choice, but choosing the right-sized guardrail — and resisting the over-control reflex — stays human.
- **It can manufacture noise.** A conversion that adds a low-value check on every recurrence grows a thicket of guardrails that themselves need governing. The discipline is to convert a *class*, once, at the second occurrence — not to reflexively lint every instance.
- **The conversion is a design act, not a patch.** Naming the recurring failure class is cheap, and it can happen inline, in the middle of the incident that provoked it. Building the control it calls for cannot. A guardrail scaffolded and installed in the heat of that incident is compromised architecture of the exact kind the method exists to avoid: a mis-scoped lint, a gate set at the wrong level, a check that soon needs governing itself — the thing built to stop failures becoming a new source of them. So the loop proposes the control and hands it off; something deliberate then designs it, under the same rigor any load-bearing change earns. Classify fast, design slow.

## Known uses

- A production agent-fleet repo ships the conversion loop as a **loadable skill** with a sharp trigger — the same bug, lint, false-positive, or manual step recurring a second time in a session — plus a design-time **audit** mode for new subsystems, and fires a **turn-end reflection hook** (at most once per window) that nudges the operator to run it. The conversion discipline is made cadence-driven rather than memory-driven.
- The bounded, stable-numbered **rule index** every converted failure lands in is itself under mechanism — its own cap lint and conformance lint — so governing-the-governance is concrete, not aspirational.
- The design-time audit half turns the same stance forward: before building a queue, a trust boundary, or a duplicated-state seam, it names the near-certain failure and prevents it by construction.

## Related mechanisms

- **Sibling** — [operator-runbook-skill](operator-runbook-skill.md): both are loadable skills under GOVERN, and they partner. The runbook *responds* to a known situation with pre-reasoned steps; when a runbook's situation keeps recurring in a way no step covers, this loop *manufactures* the new control. The named axis is *execute within the estate* versus *grow the estate*.
- **Generalization** — [semantic-lints](https://davisjam.github.io/model-based-agentic-software-engineering/product/validation-and-conformance/semantic-lints.html): a semantic lint is one shape the conversion emits. This mechanism is the general engine; a lint is one instance of its output, alongside gates and typed seams.
- **Consumer** — [claude-md-rule-index](claude-md-rule-index.md): the converted control lands in the bounded, enforced rule index, which carries every failure the loop has turned into policy. Without that home the estate grows unindexed.
- **Enabler** — [lifecycle-hooks](../lifecycle-and-observability/lifecycle-hooks.md): the cadence half is a lifecycle-event binding — a script fired off a runtime moment — so the reflection runs deterministically instead of on memory.
- **See also** — [control-coverage-census](../../models-bridge/system-models/control-coverage-census.md): the census answers *which targets are covered*; this loop is how a discovered coverage gap becomes a new control rather than a noted absence.
