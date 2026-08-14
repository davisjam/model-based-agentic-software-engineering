# Enforce at the right semantic level

**Intent** — Place a mechanism at the granularity where the property it checks first becomes **legible**, not
at the cheapest or earliest point; a check fired below that scope either can't see the property or rejects a
legitimate partial state (our instance: model↔code drift is checked when an agent *returns* from a
multi-commit task, never at a per-commit hook where the model is legitimately mid-flight).

| | |
|---|---|
| Summary | Match a mechanism's enforcement scope to the semantic scope of the property it checks. |
| Target | Agent · **Governance-doc mechanisms** |
| Form | `agent-output` |
| Move | `constraint` — prevents the error by construction |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Soft** — a design-time placement judgment made when a mechanism is built or reviewed; it aims where a mechanism lands, it does not itself block |
| Governs | `all-models` — placed at the granularity where a model's property is legible |

*Its place in the environment — **lifted to a principle** (P8, Enforce at the right semantic level): the placement judgment that explains where every other mechanism sits. See the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#principles).*

## Motivation — the failure it kills

A property has a **scope at which it becomes legible** — the smallest window in which enough of the world is
visible to decide it true or false. Place a mechanism below that scope and it fails one of two ways:

- **It misses the property.** The property is not yet expressible at that granularity, so the check looks at
  a slice that cannot contain the evidence. A monitor judging one system call at a time never sees a data
  leak, because a leak is a *sequence* — the call that reads the secret and the call that ships it are
  legible together, never apart.
- **It false-fires on a legitimate partial state.** The property is a claim about a *finished* unit, and a
  check fired mid-unit sees an intermediate that is correctly inconsistent. A per-commit gate on model↔code
  parity rejects every intermediate commit of a multi-commit feature, because the model is *allowed* to lag
  the code until the work is done.

The reflex is to place a mechanism where it is cheapest and earliest — the pre-commit hook, the single
syscall, the one changed file — because that is where enforcement is convenient. Convenience and legibility
are different axes, and when they diverge the convenient placement is wrong. The failure recurs at every new
mechanism's design, and it is silent: a mis-placed mechanism looks wired, runs green (or red) on every fire, and
never enforces the thing it was built for.

## Why it's not just "put a lint at the pre-commit hook"

A pre-commit hook is a **placement** — one rung on the ladder this principle chooses *among*. The hook is
right for a property legible in one changed tree (a banned API, a silent catch); it is wrong for a property
legible only across a whole task. Naming the hook does not answer the question this mechanism asks: *at what
scope is this property legible?* The hook is one answer, correct sometimes; this is the judgment that picks
it or rejects it.

- **Not just a linter-scope flag** (changed-file / component / whole-tree). Those select the *files a
  syntactic check reads*. This selects the *semantic altitude* — a diff, a reasoning pass over the diff, a
  whole-worktree final commit, an Epic-close review — each seeing more *meaning* than the last, not just more
  files. A whole-tree lint still reasons syntactically; moving up this ladder changes what kind of judgment
  is possible, not how much text it scans.
- **Not just the Epic Definition-of-Done.** That is one *point* on the ladder — the intent-level rung, where
  a finished feature and its plan are both in view — with its own re-run machinery. This mechanism is the
  ladder and the choice of rung. It cites the Definition-of-Done as the instance that sits at the top, the
  way it cites the commit hook at the bottom.
- **Not just "run the check later."** Later is a *time* axis; this is a *scope* axis. A check can run late
  and still be scoped wrong (a nightly job that judges one syscall), or run early and be scoped right (a
  session-start hook that reads the whole alert backlog). The move is to match the mechanism's window to the
  property's window, whenever in time that window opens.

## Mechanism

When you build or review a mechanism, name the property, then find the scope at which it is legible, then place
the mechanism there.

- **Name the property as a predicate.** State what must be true, precisely enough to ask where it becomes
  decidable. "The model matches the code" is not yet placeable; "the model matches the code *for a completed
  unit of work*" names the scope in the predicate itself.
- **Find the legibility scope.** Ask the smallest window that contains the evidence. A leak needs a call
  *sequence*; a finished-feature claim needs the *whole task*; a banned-API claim needs *one changed file*.
  The scope is a property of the predicate, not a matter of taste.
- **Place the mechanism at that scope, and no lower.** Bind it to the lifecycle event or gate whose window
  matches — a per-file lint, a per-diff reasoning hook, a whole-worktree final-commit check, an agent-return
  review, an Epic-close re-run. Placing it lower is the failure this prevents; placing it higher costs
  latency but stays sound (the check just fires later than it could).
- **Prefer the lowest *sound* scope, not the lowest scope.** Cheaper-and-earlier is the goal *among placements
  that can actually see the property.* Descend the ladder until the property stops being legible, then stop one
  rung up. The pre-commit hook is preferred *when it works*; the point is to notice when it can't.

The escalating ladder is the reusable shape: **syntactic diff-check → reasoning pass over the diff →
whole-worktree final commit → agent-return review → Epic-close intent review.** Each rung sees more meaning
than the last. A mechanism belongs on the lowest rung at which its property is decidable.

## Prerequisites

- **A ladder of enforcement points at distinct scopes.** Without a runtime that exposes a commit event, a
  task-return event, and a unit-close gate, there is nowhere to place a mechanism but the one hook you have.
  The ladder is what makes placement a *choice*.
- **The property stated as a predicate**, sharp enough that "where is this legible?" has an answer. A vague
  property ("the code is good") has no legibility scope and cannot be placed.
- **A reviewer who asks the placement question at design time.** This is a soft judgment; it holds only if
  someone reaching for a new mechanism asks *at what scope is this legible?* before defaulting to the cheapest
  hook. A failure-interpretation handoff that routes a recurrence to *design a mechanism* is the natural place
  to force the question.

## Consequences & costs

- **The higher rung costs latency.** A property legible only at agent-return is caught later than a per-commit
  author would like; the intermediate work proceeds un-checked on that dimension until the unit closes. That
  is the price of soundness, not a defect — a lower placement would be *wrong*, not merely faster.
- **It is a judgment, not a gate.** Nothing forces a designer to place a mechanism correctly; a mis-placed
  mechanism still ships and still looks wired. The defense is the design-time question, and a soft question can
  be skipped. The tell of a skipped one is a mechanism that fires forever and never catches its class.
- **Over-placing is its own waste.** Lifting a property that *is* legible in one file up to an Epic-close
  review buys nothing and delays the catch. The rule is the *lowest sound* rung, not the highest.

## Known uses

- **Model-drift → agent-return, not the commit hook.** A model↔code parity claim about a *finished* unit is
  legible only when the agent returns from the whole task; a per-commit gate would false-fire on every
  legitimate mid-task commit. The trust-nothing re-run at the unit's close (the Epic Definition-of-Done) is
  this placement at the intent-level rung.
- **Data-exfiltration → a call sequence, not one syscall.** A leak is legible only across a stitched
  sequence of calls; a monitor judging calls one at a time sits below the policy's semantics and passes the
  leak. This is the classic OS "semantic gap" — VM introspection and firewalls fail for the same reason when
  they sit below the semantics they must apply.
- **Operator-loop omissions → a runtime lifecycle event, not a source lint.** "Did the operator write a
  hand-off before compaction?" has no source artifact to analyze; it is legible only in the running loop, at
  the pre-compaction event. Placed as a lint, it has nothing to read.
- **A banned API → one changed file.** The counter-example that keeps the principle honest: a property fully
  legible in a single tree belongs on the cheapest rung, the pre-commit hook. Not everything climbs the
  ladder; most mechanisms belong at the bottom.

## Related mechanisms

- **Generalization** — [epic-definition-of-done](epic-definition-of-done.md): the intent-level rung of the
  ladder, where a finished feature and its plan are both legible. It is the top-of-ladder instance this
  principle cites; its trust-nothing re-run is placement-at-agent-return made concrete.
- **See also (a placement each)** — [pre-commit-hook](../gates-and-merge-train/pre-commit-hook.md) sits at the
  syntactic-diff rung; [lifecycle-hooks](../lifecycle-and-observability/lifecycle-hooks.md) at the
  runtime-event rung. Each is a mechanism *placed* by this judgment; this entry is the judgment that places
  them. The named axis is *placement-principle* vs *placed-mechanism*.
- **Consumer** — the operate→harden handoff ([operator-runbook-skill](operator-runbook-skill.md)) routes a
  recurring failure to *design a mechanism*, and part of that design is asking this placement question before
  defaulting to the nearest hook.
- **See also (complement)** — [control-substrate-dependency](../../models-bridge/system-models/control-substrate-dependency.md):
  that computes *which* substrate a control depends on; this chooses *at what scope* a control fires. Both
  are questions about a control's fit — one to the substrate it reads, one to the property it checks.
