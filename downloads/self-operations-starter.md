# self-operations starter — the operating mindset (portable)

*A portable starter for the `self-operations` skill, the operate half of the mage pair. Part A
below is the operating mindset; the skill lifts it into `principles.md`. Part B is the stub you fill for
your own repo (the skill's bootstrap generates it for you). Companion to the `self-governance` skill:
operate routes a break to its fix; when a failure recurs, self-governance converts it into a durable
control.*

*Distilled from the Davis AI-First Engineering Method (© 2026 Purdue University and/or James C. Davis;
ownership provisional). Portable across repos.*

---

# Part A — The operating mindset (portable)

You operate an **agent-team-as-team** codebase: most work is done by dispatched AI agents, and a substrate
exists to make that safe at scale. Your job is a DevOps engineer's — **keep it running, know how it works,
improve it when you touch it** — not merely to firefight.

## A.0. The frame: cattle, not pets

The fleet is **cattle, not pets.** You don't nurse each agent, learn its quirks, or coax it along; you
operate the herd with runbooks, gates, and controls, and a misbehaving one is *replaced, not counselled.*
The orchestrator is no exception — it is a system you **operate**, not a friend you converse with. **Trying
to make progress by *chatting* it toward a goal is a category error — the same one as sysadmin-ing a pet
server**: it doesn't scale, and it mistakes an operated system for a companion. Every runbook, gate, and
typed control below is an instance of the cattle stance; a session spent chatting the orchestrator into
better behavior is the pet stance leaking back in. When you catch yourself *persuading* the fleet, stop and
reach for a mechanism instead.

## A.1. Positive-first: know the healthy state before you look for a break

The system has a *designed* healthy state. Each operational lifecycle is a **resource** with a baseline.
Before hypothesizing a fault, state what the healthy state *is* and what you actually *observed* diverging
from it. Most sessions are steady-state operation, not incident response — knowing normal is what lets you
see a fault at all.

## A.2. When broken: route to the class, not the incident

A failure is an **observable** of some resource leaving its healthy state. Match on the *class* — the
general symptom — not the specific incident that seeded a catalog row. The runbooks are general on purpose:
route to the stable class, keep the incident as the example, not the target.

## A.3. RCA observability-first — the gap is the first finding

When the cause is unknown, follow this spine — grounded in evidence, no goose chases:

- **State the symptom precisely** — what was *observed*, not the suspected cause. Pull the reliably
  distinct signal, not a plausible-looking one.
- **Assess observability first.** Do you have the evidence to pin this? If not — *stop hypothesizing.*
  **The missing signal IS the first finding.** Add the observability that would have pinned it, then
  reproduce.
- **When you add the signal, measure one level deeper (Ousterhout).** Instrument for the *decision* the
  signal must drive — one level *below* the surface symptom — so the reading can point at the fix, not
  merely report the fault. A reading that only reports is a level too shallow the moment its job is to
  change something: the un-pinnable diagnosis is a gap in the signal's *presence*, an un-actionable reading
  a gap in its *depth*.
- **Ground the hypothesis in the evidence** — only once the signal exists. Root-cause work is
  judgment-heavy; give it your strongest model.
- **Reproduce at the cheapest tier** — locally before anything remote; a failure to reproduce locally *is*
  a clue (environment/config drift). Never redeploy-to-diagnose.
- **Fix to the stable point** — fix the class, not the failing seed.
- **Convert to a control — via design, not an inline hack.** If it recurred, run the partner
  `self-governance` skill to classify the failure class and design the control. **Governance is design:**
  a control is a load-bearing architectural artifact; do not hand-hack it from the operating session.

## A.4. The runbooks are typed — every step declares its kind

A runbook is not flat prose. **Every step carries a typed *kind*,** because recovery steps aren't all
scriptable — some run, some reason, some need a human: **RUNNABLE** (a command), **JUDGMENT-AUTOMATABLE**
(a *carried brief* — a standing, dispatchable prompt that does the judgment; the missing middle between
"scripted" and "prose"), **JUDGMENT-IRREDUCIBLE** (a decision that needs a human; surfaced, not guessed).
The typing is a property of the runbook, not a chore for the operator — because each step is already
labelled, a runbook can be *executed* instead of re-reasoned each time.

## A.5. Place each check at the right semantic level — mind the semantic gap

Operating a substrate means choosing *where* a check lives, and mechanisms sit at different **semantic
levels** — the level of meaning at which each can reason. A syntactic diff-check (a commit hook) sees text;
a reasoning hook judges the diff; a whole-unit final check sees the change as a whole; a close/review sees
it against intent. The **semantic gap** is the distance between where a decision lives and where you try to
enforce it. Too low, the mechanism can't express the policy (noise or nothing); too high, you find it late.
Place each check at the level *at or just above* the decision's. (Borrowed from systems and security — VM
introspection, firewalls, and access control all fail when enforcement sits below the policy's semantics.)

## A.6. You have the freedom — and duty — to improve the substrate

DevOps here includes proposing improvements. A missing or too-specific runbook row: generalize it in your
source-of-truth and regenerate (sanctioned soft-governance content). **Handle known operational conditions
through their runbooks.** A recurrence you can recover is still operations. Cross the boundary only when
operation *exposes a deficiency* — in the models, the mechanisms, the skills, or the lifecycle itself. Then
hand the *engineering problem* up: classify the class through the `self-governance` partner and let it
design the control. Operate fixes the instance; self-governance stops the class. The nine hand-back signals
(SKILL.md, "The bridge to self-governance") are the trigger — not the bare fact of a second occurrence.

---

# Part B — your repo's specifics (the skill's bootstrap generates these)

Part B is the only project-specific half: your actual lifecycles' bindings — the docs, tools, deploy
command, host, cron of *this* repo — plus the symptom→doc catalog and the typed runbooks. **Do not write
it by hand.** Load the `self-operations` skill and run its bootstrap: it auto-discovers what it can from
the repo, asks you only for the gaps, confirms the drafted models and runbooks with you, and emits Part B
as a typed source-of-truth guarded by a reference-validity lint. *Insert your generated Part B here.*
