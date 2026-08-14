<!--
  Operational-playbook template — STARTER (adopt & adapt)

  A playbook is a situation-keyed operating manual for a substrate: for each thing that can go wrong (or
  each question an operator asks), it says how to inspect, what healthy looks like, what wrong looks like,
  and what to do about it. It is the *reaction* half of observability — a signal is only actionable if
  something tells you what to do when it fires.

  Pairs with the "operational playbooks" and "orchestrator-as-reactor over an event bus" mechanisms in
  the catalogue. Discipline: any substrate that emits a signal (a metric, an event topic, an alert) OWNS
  a playbook entry for it — a signal with no entry is emitted but not interpretable. Add one entry per
  situation; replace the bracketed placeholders.
-->

# Playbook: <substrate name>

**When to reach for this:** <the situations that send an operator here — an alert fired, a metric looks
off, a recurring failure, a routine health check.>
**What it observes:** <the surface — the event topics / metrics / logs this substrate emits, and where
they live.> Every signal below should trace to one of them.

---

## §1: <the question, or the situation> — e.g. "Is the work queue backing up?"

**Inspect:**
```
<the exact command / query that answers it — a metrics read, a log grep, a status call>
```

**Baseline healthy:** <what steady-state looks like, ideally quantified — "queue depth < 50; oldest job
< 2 min"; "zero `hard_cap_hit` events in any 24h window".> Give the reader a number to compare against,
not a vibe.

**What looks wrong → what it means → what to do:**
- **<symptom>** (e.g. "queue depth climbing, oldest job > 10 min") → <the likely cause> → <the recovery
  action: scale workers / clear the stuck lock / re-dispatch / open §N below>.
- **<a different symptom of the same subsystem>** → <cause> → <action>.

---

## §2: <"<event/alert> just fired — what now?">

**Inspect:**
```
<how to pull the context around the event — its payload, recent siblings, the affected component>
```

**Baseline healthy:** <how often this is expected to fire in normal operation — "never on a quiet day";
"a handful per deploy" — so the reader can tell signal from noise.>

**What looks wrong → what it means → what to do:**
- **<the firing pattern that's a real problem>** → <cause> → <the concrete recovery steps, in order; if
  it needs a human decision, say what the decision is and who makes it>.
- **Deadlock/wedge note:** <if this substrate can wedge — a stuck lock, an unackable gate — the escape
  hatch that always clears it, and its audit trail.>

---

## §N: <one entry per remaining situation / topic / alert>

> Keep adding entries until every signal the substrate emits has one. The test of completeness: pick any
> alert or metric this substrate can produce — is there an entry that tells a fresh operator what healthy
> is, what wrong is, and what to do? If not, the substrate's observability is incomplete.

---

## Cross-references

- The design doc's observability section (the signals this playbook interprets).
- The substrate's runbook / recovery tools.
- Related playbooks for adjacent substrates.
