*A two-page synthesis of the Briefing stack. Five patterns get the right policy and context to an
agent at the moment a decision is due — so it acts on the relevant slice, not the whole corpus and not its
memory. This is the book's explicit durable-versus-2026-transient exemplar: each part is marked for whether
it is infrastructure that endures or a crutch a stronger model eases.*

## The capability

An agent starts a task. Does it have the exact policy this task needs — not the whole rulebook, not whatever
it happens to remember — in front of it at the moment the decision is due? Get that wrong and it burns
rounds repairing a rule it would have honored had it seen it.

**Deliver the policy an agent needs at the grain and moment it needs it — the task's constraints into the
brief, the standing rules into the boot, an omitted step off the runtime lifecycle, a soft discipline as a
rate-limited nudge.** It meets one capability on its context face: *manage work, state, and resources*.
Five delivery surfaces at four grains, so a bounded-context agent acts on the slice that matters
rather than re-reading a whole rulebook or trusting its memory. Read against the years the parts split: some
are infrastructure a larger window does not retire, some are 2026-era crutches whose pressure eases as
models improve.

### Symptoms you need this stack

You are probably feeling one of these:

- An agent reads the wrong part of a rulebook and burns rounds repairing a rule it would have honored had it seen it.
- A brief ships missing a piece of safety boilerplate, and the agent trips exactly that sharp edge downstream.
- A step that must happen at a precise moment depends on someone remembering it.
- Several soft reminders each fire on their own cadence and compound into noise the operator learns to tune out.

### When to adopt this stack

Use this stack when:

- a bounded-context agent must act on the relevant policy slice, not a whole rulebook or its own memory
- policy has to arrive at several grains and moments — task constraints into the brief, standing rules into the boot, an omitted step off the runtime lifecycle

Typical domains:

- LLM-agent orchestration
- autonomous coding fleets
- brief and prompt delivery pipelines
- agent-collaborative codebases

## Failure classes it covers

- **The unread rulebook.** An agent is handed a task and a whole rulebook; it reads none of it or the wrong
  part, and violates a constraint it would have honored had the constraint been in front of it.
- **The missing boilerplate.** A brief ships without a piece of safety boilerplate; the agent drifts its
  working directory, skips the commit cadence, or misses a submodule, and the omission surfaces downstream.
- **The unloaded standing policy.** The standing rules live in a document no one loads; an agent boots
  without them and re-derives conventions it should have inherited, inconsistently.
- **The forgotten step.** A step that must happen at a specific moment — a checkpoint before compaction, a
  check before a tool call — depends on someone remembering it, and the moment it is forgotten the state it
  protected is lost.
- **The wall of nudges.** Several soft reminders each fire on their own cadence; together they become noise
  the operator learns to ignore, and the alarm fatigue kills all of them at once.

## Composition

<!-- label: context-management-stack -->
<!-- figure: assets/context-management-stack.svg | The Briefing stack in one picture. Five parts run left to right, coloured by durability. INJECT (accent, 2026-transient) maps files-about-to-be-touched to their governing constraints and injects the slice into the brief. SNIPPET (blue, mixed) is the registry of mandatory brief snippets asserted at dispatch — transient delivery, durable enforcement. INDEX (green, durable) loads the numbered rule index into every boot context. HOOK (green, durable) binds a script to the runtime lifecycle so an omitted step fires deterministically. NUDGE (accent, 2026-transient) emits at most one tempo-gated reflection per window. The durable parts are infrastructure regardless of model; the transient parts ease as context windows grow. -->

Four parts deliver *policy* at four grains — task-specific, per-brief mandatory, always-on standing, soft
reminder; one delivers an *action* at a runtime moment. Each seam names what the part before it hands over.

## The constituent parts

Five delivery modalities answer one principle — the right policy at the right moment — each meeting the agent
at a different point: inject the constraints a task's files invoke into its brief, assert the standing safety
boilerplate is present at dispatch, load the numbered rule index into every boot, fire the omitted step off a
runtime lifecycle event, and nudge a standing discipline at a paced cadence.

### INJECT — file-scoped constraint injection {#a-7-dynamic-context-injection}

**Deliver the constraints this task invokes.** Map the files an agent is about to touch to the exact
constraints that govern them — lints, conventions, boundaries, tests — and inject that slice into the brief
before the agent writes code. (INJECT.)

**Receives** — the task's target files and the fleet's addressable constraint registries. Nothing precedes
it; this is where policy first meets the specific task.

**Guarantees** — the relevant constraints made binding, not merely available. An agent handed a task and a
whole rulebook reads none of it or the wrong part, then burns rounds discovering and repairing violations it
would have honored had the rule been in front of it. Resolving the files-about-to-be-touched to the rules
that govern them, and rendering that subset into the brief, moves detection left of the cheapest CI gate:
prevention before the first commit. The relevance operator is fallible, so this shifts the odds; a
downstream gate still guarantees the rule.

**Hands to SNIPPET** — the task-specific half of one brief. Where injection delivers the constraints THIS
task's files invoke, the snippet table beside it delivers the invariant boilerplate every brief needs, and
both land in the same brief at dispatch.

→ **Deeper treatment:** role:dynamic-context-injection.

### SNIPPET — the mandatory brief-snippet table {#a-7-mandatory-snippet-table}

**Guarantee the safety boilerplate is present.** A registry names the mandatory brief snippets — PATH
export, commit cadence, worktree discovery, submodule check — and a dispatch-time lint refuses any brief
missing a required one. (SNIPPET.)

**Receives** — the brief INJECT is filling, plus the registry of what every brief of this shape must carry.

**Guarantees** — no brief ships missing its safety boilerplate. An author who forgets one — say the PATH
export, without which dozens of format tests fail for a missing binary — sends an agent that trips exactly
that sharp edge twenty minutes in. A docs checklist has no reader and rots as snippets are added; the
registry has one, a lint that greps for every required marker and refuses the dispatch on any absence. Some
snippets are always-include, others conditional on the brief's shape, so a brief carries what it needs and
nothing it does not.

**Hands to INDEX** — the per-brief half beneath the always-on baseline. Where the snippet table delivers the
boilerplate mandatory for THIS dispatch, the rule index below it delivers the standing policy every agent
shares, whatever the task.

→ **Deeper treatment:** role:mandatory-snippet-table.

### INDEX — the boot-context rule index {#a-7-claude-md-rule-index}

**Boot every agent on the same policy.** Load the numbered rule index into every agent's boot context, so
standing policy is present by construction at the start of every run rather than fetched on demand. (INDEX.)

**Receives** — the standing rules themselves, each a short boot-context statement cross-referenced to the
canonical doc that carries it in full. It sits beneath INJECT and SNIPPET as the layer neither specializes.

**Guarantees** — every agent boots on the same shared world-model. Standing rules that live in a document no
one loads leave an agent re-deriving conventions it should have inherited, inconsistently, one dispatch at a
time. Loading the index by construction makes the minimum shared policy present at boot, rather than a
reference the agent might consult. A cap lint keeps it inside a scannable budget and a conformance lint
keeps each rule citing its canonical doc, so the always-on baseline stays worth booting.

**Hands to HOOK** — the shift from context to runtime. Where INJECT, SNIPPET, and INDEX deliver POLICY into
a brief or a boot, the hook beside them delivers an ACTION at a runtime moment — the same just-in-time
principle, applied to the lifecycle rather than the context.

→ **Deeper treatment:** role:claude-md-rule-index.

### HOOK — the runtime lifecycle hook {#a-7-lifecycle-hooks}

**Fire the omitted step deterministically.** Bind a script to the agent runtime's lifecycle events —
turn-stop, pre-compaction, session-start, before-a-tool-call — so a step someone keeps forgetting happens
whether or not anyone remembered. (HOOK.)

**Receives** — the runtime's named lifecycle events and a step that must happen at one of them. Where the
layers above deliver policy into context, this one reads the runtime itself.

**Guarantees** — the omitted step fires whether or not anyone remembered. Some failures live in the loop
that drives the agent, not the code it writes: ending a turn with work still queued, compacting without a
hand-off, editing outside the worktree. A lint cannot reach these: the omission happens at runtime, in the
loop itself. The hook splits enforcement's two halves. The firing is hard, guaranteed by the runtime. The
payload is either a hard block that denies the action or soft guidance re-injected into context. The reflex
case, hard delivery of soft guidance, makes the aiming deterministic: the same reminder fired exactly at the
decision point, every time.

**Hands to NUDGE** — the substrate you build on the second reflection hook. One hook re-arms one reflex; a
second soft nudge starts the fatigue the tempo-gated substrate below resolves.

→ **Deeper treatment:** role:lifecycle-hooks.

### NUDGE — the tempo-gated reflection substrate {#a-7-reflection-facet-substrate}

**Nudge without alarm fatigue.** This is the stack's softest delivery — a rate-limited soft reminder of a
standing discipline, at the gentle end of the delivery spectrum. (NUDGE.)

**Purpose** — reflect the running work against a standing discipline without becoming noise. Fire several
nudges, each on its own cadence, and together they become a wall the operator tunes out, killing them all at
once.

**Mechanism** — one tempo-gated substrate consolidates the reflection nudges: a registry of facets, each
reflecting the context against one policy dimension it references rather than copies, the whole family
emitting at most one reflection per window. It earns its keep at the second facet, not the first.

**Guarantee** — soft reminders that cannot compound into fatigue. One shared tempo budget caps the
aggregate, so a class's facets round-robin for a single window's reflection. Each facet points at its
canonical policy, so a moved doc trips a lint rather than rotting in a payload string; per-firing telemetry
puts the family on a measured leash, pulled on over-fire or near-zero yield.

→ **Deeper treatment:** role:reflection-facet-substrate.

## A DocAble example, end to end

A DocAble agent is dispatched to change PDF tag-tree code. **INJECT** resolves the files it is about to touch
to the constraints that govern them — the typed-seam rule, the ban-lint on raw library calls, the tests that
pin the format — and drops that slice into the brief, so the agent sees exactly the rules its files invoke
before it writes a line. **SNIPPET** asserts the brief also carries the invariant safety boilerplate: PATH
export, commit cadence, worktree discovery, the submodule check. **INDEX** is already present — the numbered
rule index loaded at boot gives the agent the always-on baseline the other deliveries specialize. Mid-run,
**HOOK** fires a checkpoint before the context compacts, saving state the agent would otherwise lose to a
forgotten step. And **NUDGE**, at most once per window, reflects the running work against one standing
discipline — a soft reminder that aims without becoming the wall of alarms the operator tunes out.

## Tradeoffs and adoption order

This stack is where the book makes the durable-versus-transient call explicit, part by part.

1. **INDEX and HOOK are durable.** An enforced rule index and a deterministic lifecycle binding lean on no
   model capability; they are infrastructure a larger window does not retire. Adopt them first.
2. **SNIPPET is mixed.** Its delivery half is 2026-transient — a model that reliably held every convention
   would need fewer pasted snippets — but its assert-at-dispatch enforcement half is durable, since a
   required snippet's absence is a deterministic check.
3. **INJECT and NUDGE are 2026-transient in degree.** Pre-selecting the relevant slice and nudging a
   forgotten discipline both compensate for a 2026 limit — a small window, a model losing track over a long
   run. Their pressure eases as windows grow, though relevance-focusing and fatigue-prevention never fall to
   zero.

## Why this composition holds

These five parts are not a pipeline; they are one delivery surface that leaves no grain and no moment
uncovered. The rule index puts the standing policy in every boot; injection narrows it to the exact
constraints the files about to be touched invoke; the snippet registry guarantees the safety boilerplate a
brief cannot be trusted to carry; the lifecycle hook fires the step that must happen at a precise instant
whether or not anyone remembers it; and the rate-limited nudge carries the soft disciplines a hard gate
would over-police. Miss any one and the gap is exact: no boot policy and the agent re-derives conventions,
no injection and it reads the whole rulebook or the wrong part, no hook and the timed step is lost the once
it is forgotten. What holds the set together is coverage across every grain and moment — and the book marks
which parts are durable infrastructure and which are 2026-era crutches a larger context window will ease.

## The full treatment

Each constituent links to its full pattern — in this appendix for the flagship members, online for the rest.
INDEX's govern-itself facet lives in the
[governance-of-governance stack](appendix-d-governance-of-governance-stack.html); the stack shares one
machine among many agents with the [Mediation stack](appendix-d-resource-mediation-stack.html). The
full 85-mechanism catalogue is online in the web edition.
