---
name: self-governance
description: >-
  Apply MAGE to your own engineering work — the capstone mastery-skill of the method.
  Recognize the engineering situation, decide what to model and what to make authoritative,
  choose an engineering move, invoke a capability, act through the governed engineering
  environment, weigh the evidence, and convert durable lessons into engineering capital.
  This is the routing layer: it names the eight questions an engineering agent faces and
  sends each to the facet that owns it (model repertoire, engineering moves, situation
  recognition, judgment, system model-access, capability selection, alignment mechanisms,
  governance conversion). Two standing procedures live under it: AUDIT (survey a repo for
  missing guardrails and propose a prioritized adopt/adapt/skip plan) and INTERPRET-FAILURE
  (a failure just recurred — classify the class and convert it into a durable control:
  a constraint, sensor, validator, or gate). Use at DESIGN time — reviewing a new subsystem,
  state machine, queue, cross-service seam, or data model; or introducing concurrency, a
  trust boundary, an irreversible operation, or duplicated state/logic — to catch predictive
  smells whose failure class can be prevented by construction. Use when hardening an
  agent-collaborative codebase, reducing recurring agent-caused regressions, setting up
  guardrails / lints / gates / typed seams, reviewing governance posture, or when a failure
  class just recurred and should be prevented structurally, not only patched.
---

# Self-Governance

This skill applies **MAGE to the agent's own engineering work**. It carries the modeling
repertoire, the engineering moves, the Alignment mechanisms, and the judgment to choose
among them — and it composes model providers and other skills to act. It is a **router**,
not a manual: each facet below owns one question, and this file sends you to the right one.

## The engineering loop

Everything here supports one loop. Run it whenever you engineer.

```
       recognize the situation
                 |
         what do I need to know?
          /                    \
     MODEL                    ALIGN
   what is missing?        what must hold?
          \                    /
           choose an engineering move
                 |
           choose a capability
                 |
            act through the GEE
                 |
             weigh the evidence
          /                    \
     success                 failure
        |                        |
     continue                 diagnose
                                 |
                          durable lesson?
                           /          \
                          no          yes
                          |            |
                        repair     capitalize
```

**MODEL** and **ALIGN** are the two — and only two — MAGE activities. Modeling makes
engineering knowledge explicit; Alignment gives that knowledge authority. Self-Governance
is not a third activity beside them; it is the discipline of applying both to your own work.

## What this skill establishes

- **Self-Governance applies MAGE to the work.** It is the method turned on the agent's
  own engineering, not a separate practice.
- **Modeling and Alignment remain the two activities.** Self-Governance is not a third one.
- **The skill knows the method; model providers know the system.** Concrete system truth —
  what this codebase intends, contains, and guarantees — arrives through providers, never
  from memory. See [`system/model-access.md`](system/model-access.md).
- **Specialized capabilities come through other skills.** Self-Governance *chooses* the
  move; a specialized skill *executes* it. See [`skills/repertoire.md`](skills/repertoire.md).
- **Consequential action stays bounded by the GEE.** Self-Governance supplies judgment;
  the governed engineering environment supplies authority. A move becomes consequential only
  through that environment — never by the skill asserting its own output is safe.
- **Self-Governance is not Self-Operate.** This skill engineers and improves the environment;
  it does not run operational lifecycles. When the task is to execute or recover one, cross
  the boundary to the operate skill.
- **Self-Governance is not self-certification.** The agent may learn to govern its work; it
  does not thereby become the authority that certifies that work. Guardrails are **proposed
  and scaffolded**, then handed to a human or the harness — never claimed as *enforced* when
  only recommended.

## Routing table

Name the question you face; go to the facet that owns it. Consult one; it points onward.

| Question | Consult |
|---|---|
| What situation am I in? | [`practice/situations.md`](practice/situations.md) |
| What kind of model could help? | [`modeling/repertoire.md`](modeling/repertoire.md) |
| How should the representation improve? | [`modeling/moves.md`](modeling/moves.md) |
| Which move is warranted among alternatives? | [`practice/judgment.md`](practice/judgment.md) |
| What is true of *this* system? | [`system/model-access.md`](system/model-access.md) |
| What capability performs the move? | [`skills/repertoire.md`](skills/repertoire.md) |
| How should intent acquire authority? | [`alignment/repertoire.md`](alignment/repertoire.md) |
| What should persist from this event? | [`learning/governance-conversion.md`](learning/governance-conversion.md) |
| How do I execute an operational lifecycle? | the **self-operate** skill (you have crossed this skill's boundary) |

The last row matters as much as the rest. Self-Governance must recognize when a task is
*operating* the environment rather than *engineering* it, and hand off. A meaningful
operational observation that comes back the other way — a recurring or structural weakness
surfaced while operating — re-enters the loop here as a fresh engineering cycle.

## Ambient stance

Read [`principles.md`](principles.md) — the portable engineering principles this skill
operates by (the generated mirror of the Davis AI-First Engineering Method). It is the
standing stance while this skill is loaded: verify rather than trust stale claims, name
shapes in types, surface load-bearing calls instead of swallowing them, right-size every
fix, and care with irreversible operations. Do not restate it here; the facets cite the
specific reflex each relies on.

## The two standing procedures

Both live in [`learning/governance-conversion.md`](learning/governance-conversion.md) —
they are how the loop's *capitalize* branch runs in practice:

- **AUDIT** — survey a repo for missing guardrails and propose a prioritized adopt / adapt /
  skip plan. Its design-time trait scan is situation-recognition; consult
  [`practice/situations.md`](practice/situations.md) for the smell catalogue.
- **INTERPRET-FAILURE** — a failure recurred; classify the class and convert it into a
  durable control (constraint / sensor / validator / gate), following
  [`alignment/repertoire.md`](alignment/repertoire.md).

## Notes

- **Partner skills — three lenses on one environment.** Self-Governance *engineers* the
  environment; **self-operate** *runs* its operational lifecycles and returns evidence when
  reality exposes a deficiency; **self-communicate** supplies the craft for the
  representations both produce. They are orthogonal, not isolated. Each is recorded as a
  capability in [`skills/repertoire.md`](skills/repertoire.md) — consult it for when to
  invoke which.
- **Beware the tower of governance.** The primary failure mode of this skill is minting
  mechanisms faster than they earn their keep. Default to *skip*; proportion governance to
  the operation. The tradeoff belongs to [`practice/judgment.md`](practice/judgment.md) — a
  mechanism you cannot attach to a real, recurring failure is one the repo does not need,
  **even when the user asks for more.**

## Local adapter (plug points)

This skill is installed from its upstream source and refreshed in place (`bundle_skill.py --install` /
`--refresh`). A refresh **overwrites every upstream file**, so put your local additions where the refresh
never looks. Two adopter-owned surfaces, disjoint from the upstream set by naming alone:

- **File overlays** — for a listed upstream file, create the named `*.local.md` sibling. The agent reads it
  as an **APPEND** after the upstream file. There is no override mode — replacing an upstream file wholesale
  is a fork, out of scope for the adapter. Declared overlays:
  - `principles.md` → `principles.local.md` — your house operating principles, appended to the portable method.
- **Directory drop-in** — any file you place under `local/` is adopter-owned: the agent reads it on the
  topic it names, and upstream never ships into `local/`. Use it for a standalone house note this skill
  does not already carry.

A refresh never reads, writes, or deletes a `*.local.md` file or anything under `local/`, so your local
tinkering survives every upstream update untouched.
