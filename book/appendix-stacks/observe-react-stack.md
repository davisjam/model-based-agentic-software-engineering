*A two-page synthesis of the observe → react loop. Five patterns make the fleet's live state legible and
every bad state actionable, so an operator — human or agent — drives from typed signals plus written
responses instead of scraping logs and reasoning from memory.*

## The capability

The pipeline is green and shipping garbage. That is the operator's nightmare — not the crash you can see,
but the run that looks fine and is not. Can you even tell it is happening, and do you know what to do when
you can?

**Turn a running-but-wrong pipeline — the worst failure because it is invisible — into a named signal and a
procedure that answers it.** It discharges two capabilities: *manage work, state, and resources*, and
*govern the control estate itself*. Every substrate emits its health onto one typed surface; a written
procedure answers each signal; a gate refuses new work while a serious one stands unresolved; and a standing
map makes every signal interpretable. The operator reacts to structure, not to scraped text.

### Symptoms you need this stack

You are probably feeling one of these:

- You learn a pipeline is shipping garbage from a user, not from any signal of your own.
- A long-running job goes silent and nobody can tell a wedged process from a slow one.
- The same red state keeps firing and every responder re-reasons the fix from scratch, under pressure.
- Fleet health is scattered across a dozen logs in different shapes, and always learned late, by reading.

### When to adopt this stack

Use this stack when:

- ignoring a serious signal costs nothing, so operators keep piling work onto a known-broken substrate
- an operating agent must run the fleet but has no model of how the substrate is supposed to work

Typical domains:

- autonomous agent-fleet operations
- long-running deploy and CI pipelines
- distributed job systems
- on-call and SRE estates

## Failure classes it covers

- **The scraped state.** Fleet health lives in a dozen logs in different shapes; the operator learns of a bad
  state late, by reading, and reacts to text rather than to structure.
- **The silent long-runner.** A deploy goes quiet; nothing distinguishes a wedged process from one grinding
  through a slow phase, so a hang is found only by a timeout much later.
- **The signal with no response.** A red state fires but says nothing about what to do; the operator
  re-reasons the response from scratch each time, inconsistently, under incident pressure.
- **The ignored alarm.** A high-severity alert fires and the operator keeps piling new work onto a
  possibly-broken substrate, compounding the failure it should have stopped to fix.
- **The symptom without a model.** An operating agent knows the symptom index but not how the substrate is
  *supposed* to work, so it treats symptoms without a model and mis-operates the fleet.

## Composition

<!-- label: observe-react-stack -->
<!-- figure: assets/observe-react-stack.svg | The observe → react loop in one picture. Five parts run left to right. Observe (fleet blue): WATCH is the typed event bus every substrate emits onto; BEAT is the liveness channel that tells a hung process from a slow one. React (green): RESPOND is a written playbook per signal. Block (churn red): BLOCK refuses new work-dispatch while a high-severity alert is unresolved. Self-operate (accent): OPERATE is the positive map of how the substrate works. The bus says what happened; the playbook says what to do; the gate refuses to proceed until it is cleared; the map makes every signal interpretable. -->

Two parts observe, two react, one gives the operator the standing map. The bus is the single surface the
rest of the loop reads.

## The constituent parts

Five parts run as a loop: a typed bus carries every substrate's health onto one queryable surface, heartbeats
sharpen it so a hung process reads differently from a slow one, a playbook says what to do when a signal
fires, a gate raises the cost of ignoring a serious one, and an operator skill supplies the standing map.

### WATCH — the typed event bus {#a-4-typed-event-bus}

**Make fleet health legible.** Give every substrate one typed surface to announce its lifecycle and health
on, so the operator reacts to a single signal stream instead of scraping logs. (WATCH.)

**Depends on** — lifecycle and health facts from across the fleet: is cron running, is the merge-train
yielding, are tombstones stuck. Nothing precedes it; this is where the loop starts.

**Exposes** — a queryable, self-documenting signal surface. Every event carries a topic drawn from a
closed const-string registry, so a typo cannot silently create a dead topic that disables a signal. Health
is read from structure, not scraped from a dozen logs in different shapes — and read on a defined cadence,
not by chance.

**Hands to BEAT and RESPOND** — the one surface the rest of the loop reads. The heartbeat rides it as a
liveness channel, the playbook is keyed to its topics, and the blocking gate downstream watches it for
high-severity events. Everything after reacts to what the bus says.

→ **Deeper treatment:** role:typed-event-bus.

### BEAT — periodic liveness heartbeats {#a-4-deploy-heartbeats}

**Tell a hung process from a slow one.** A long-running process emits a periodic beat carrying its phase and
elapsed time, and a sweep flags a worker that has stopped beating; silence past the cadence reads as stale. (BEAT.)

**Depends on** — the runtime state of long operations: a deploy that runs many minutes, a worker grinding
through a slow phase. It rides the WATCH bus as that bus's liveness channel.

**Exposes** — liveness turned into a signal instead of an ambiguity. The beat proves the process is
*moving*, not just alive; a deadlocked process is alive too, but it stops advancing its phase. Silence past
the known cadence reads as stale. The signal proves motion, not correctness — a deploy can beat steadily and
still fail.

**Hands to RESPOND** — the difference between "still working" and "wedged." That distinction is exactly what
tells the operator whether to wait or to act, which is the first thing the playbook downstream needs to know.

→ **Deeper treatment:** role:deploy-heartbeats.

### RESPOND — situation-keyed operational playbooks {#a-4-operational-playbooks}

**Answer every signal with a written procedure.** For each situation the signals surface, a decision
procedure names the trigger, the ordered steps, and the reflexes to avoid — so an operator under incident
pressure follows a pre-reasoned response instead of re-deriving one badly. (RESPOND.)

**Depends on** — a fired signal from WATCH: a broken deploy, a wedged cron, a worktree destroyed mid-flight,
an alert gate that deadlocked. The bus says what happened; the playbook takes it from there.

**Exposes** — a consistent, incident-tested response, reasoned once when no incident was burning. Each
procedure gives the steps in order and the sharp edges to avoid — the flailing reset that destroys landed
work, the naive cron restart that re-enters the same loop. The value is that the correct steps are written
down and discoverable at the moment they are needed.

**Hands to BLOCK** — the response half of a matched pair. A signal keyed to no playbook is unactioned noise;
the gate downstream leans on the playbook to say how a blocking alert gets cleared.

→ **Deeper treatment:** role:operational-playbooks.

### BLOCK — the high-severity alerts gate {#a-4-cron-alerts-gate}

**Make ignoring a serious signal costly.** While an unresolved high-severity alert stands, the gate refuses
new work-dispatch until it is acknowledged or resolved. (BLOCK.)

**Problem** — surfacing a signal is not enforcing a response. An orchestrator can see, miss, or ignore a red
state and keep piling new work onto a possibly-broken substrate, compounding the failure it should have
stopped to fix.

**Solution** — read the unresolved high-severity alerts on the WATCH bus at session start, against what was
last seen, and make the response mandatory: an unresolved alert refuses the dispatch, worktree-create, and
merge tools outright. It is designed deadlock-free — exempt tools plus an alert-resolving dispatch mean the
gate can always be cleared, never wedged shut.

**Output** — a fleet held still until the problem is addressed. The alert names it, the playbook says how to
clear it, and this gate refuses to proceed until one or the other is done, leaving the operator skill to
supply the standing map that makes the whole loop interpretable.

→ **Deeper treatment:** role:cron-alerts-gate.

### OPERATE — the operator runbook skill {#a-4-operator-runbook-skill}

**Operate from a model, not from memory.** A loadable skill gives an operating agent the positive map of how
the substrate works — its lifecycles and healthy baselines — first, and a symptom-to-resolving-doc catalog as
the fallback when something breaks. (OPERATE.)

**Depends on** — an operator, human or agent, who must know two things: how the substrate runs when healthy,
and what to do when it breaks. Where WATCH and BEAT show state and RESPOND and BLOCK handle each bad one,
this supplies the standing map those four are read through.

**Exposes** — self-operation from a model of the substrate, not from memory. The skill leads with normal
so a fault is spottable against a baseline, is keyed to what the operator *observes* rather than the doc they
would have to already know, and is generated from a typed source so a reference-validity lint resolves every
pointer's file and heading anchor — a moved doc becomes a build error, not a dangling chase.

**Hands off** — nothing further in the loop. It is the standing map the other four parts are interpreted
through; without it, the signals still fire but the operator reads them from recall.

→ **Deeper treatment:** role:operator-runbook-skill.

## A DocAble example, end to end

A DocAble deploy runs long. Historically it would go silent and an operator could not tell a wedged build
from a slow one. Now every substrate — deploy, cron, merge-train — emits onto **WATCH**, the one typed bus,
and the long-running deploy emits a **BEAT** every interval carrying its phase and elapsed time; a sweep
flags a worker that stops beating. When a merge-train tick fails, the event is not a log line to grep but a
typed alert on the bus, keyed to a **RESPOND** playbook that names the recovery steps in order. If that
alert is high-severity, **BLOCK** refuses the next dispatch, worktree-create, and merge until someone acks or
resolves it — so the fleet cannot pile new work onto a broken substrate. And an agent asked to operate the
repo loads **OPERATE** first: it reads how the substrate is supposed to work before it touches a symptom, so
it drives from a model of the fleet rather than from memory.

## Tradeoffs and adoption order

1. **WATCH is the floor.** Without one typed signal surface the rest of the loop has nothing to read. Its
   cost is one emit per lifecycle fact; the closed topic registry keeps a typo from silently disabling a
   signal.
2. **RESPOND pairs with it.** Neither half is useful alone — a signal keyed to no playbook is unactioned
   noise, a playbook with no signal never runs. Adopt them together.
3. **BLOCK when ignoring a signal is expensive.** A deterministic gate over unresolved alerts; it degrades to
   noise only if alerts are acked without being fixed.
4. **BEAT and OPERATE are complementary.** The loop functions without per-phase heartbeats or the operating
   map, but a long pipeline is far more legible with beats, and recovery is faster with the map. Add them
   where the substrate is long-running or agent-operated.

## Why this composition holds

The loop holds together because a signal and a response are two halves of one thing: a bus with no playbook
is noise, a playbook with no bus never fires. The heartbeat earns its place so the bus can tell motion from
death; the gate earns its place so a serious signal cannot be waved past; the operator map earns its place
so every other part is read against a baseline instead of from memory. Observe without react is a dashboard
nobody acts on; react without observe is a runbook for a fault you cannot see. The five are the smallest set
that makes a running-but-wrong system both visible and answerable.

## The full treatment

Each constituent links to its full pattern — in this appendix for the flagship members, online for the rest.
The loop consumes the [Assurance stack](appendix-d-specification-verification-stack.html)
(a proven invariant still needs a live signal when it breaks) and feeds the
[governance-of-governance stack](appendix-d-governance-of-governance-stack.html) (the estate that governs the
controls themselves). The full 85-mechanism catalogue is online in the web edition.
