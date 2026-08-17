<!-- note-spread: 2 -->

**Intent** — A structured event bus with a closed, const-string topic registry and a companion playbook,
over which the substrate emits lifecycle and health events. The bus turns the orchestrator into a reactor
over the fleet: it reads health from a queryable, self-documenting signal surface and reacts to each event
with a playbook-prescribed response, keeping a fleet of agents productive over long sessions instead of
drifting into silent breakage.

## Problem

A fleet's health — is cron running, is the merge-train yielding, are tombstones stuck — is invisible without
a signal surface, so degradation accretes silently: cron can be broken for hours before anyone notices. And
without a reaction loop the orchestrator is a passive observer that can only steer the fleet if it reacts to
what the substrate reports. The failure is silent substrate degradation paired with an un-reacting
orchestrator, and it recurs continuously across a long session while each individual dispatch still looks
locally fine.

<!-- note-fold -->

## Mechanism

Emitters call the bus with a topic drawn from a closed const-string registry, lint-enforced so a typo cannot
create a dead topic that silently disables a signal. A playbook maps each topic to its healthy baseline, its
what-looks-wrong signs, and the response entry to open. A substrate-observability rule requires any design
doc that introduces a topic to ship an observability block; the lint lands audit-only, then promotes to
blocking. A monitoring-cadence rule sets consumption: the orchestrator polls at session start and after
cherry-pick waves, with named anomaly triggers such as repeated merge-train yields or a prolonged no-op with
tombstones queued.

## Engineering Consequences

A structured, queryable, self-documenting surface replaces the pull model of remembering to grep prose logs.
The playbook is the active half: it turns a raw signal into a reaction rather than a passive read. Emission
is hard and mechanical, but the bus itself does not block — a derived alerts gate does that. Acting on the
signal depends on the orchestrator honoring the poll cadence.

## Implementation Seam

Four artifacts carry the pattern: the event bus and its const-string topic registry, the playbook keyed by
topic, the observability-block lint that keeps every emitting substrate documented, and the session-start
plus post-cherry-pick monitoring cadence.

## Known Limitations

A topic without a playbook entry is emitted but not interpretable — the observability-block rule exists
because that gap is the common failure. Consumption is discipline, not machinery: the bus can carry a
perfect signal and still be ignored if the orchestrator skips the cadence. Every new topic adds registry, emit-point, and playbook maintenance that must stay synchronized, or the
surface goes stale.
