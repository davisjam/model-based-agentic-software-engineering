**Problem.** Operational work remains expensive when each incident requires an operator to reconstruct the same judgment: what healthy state looks like, what a symptom means, which procedure applies, and what evidence confirms recovery.

**Move.** Make recurring operational judgment explicit. Generate or execute what can be mechanized; provide guidance where judgment remains necessary; and keep both tied to the system they describe.

[ref:fig-move09] traces the system model into the operational model.

<!-- label: fig-move09 -->
<!-- figure: assets/c9-externalize-judgment.svg | *From system model to operational guidance.* Healthy-state predicates, states, and relations feed an operational model that produces generated procedure where possible and reasoning guidance where judgment remains necessary. -->

**Example — Generated runbook.** DocAble's lifecycle model names operational subsystems and their healthy-state predicates. The operator runbook is generated from that representation, keeping procedure aligned with the system model. When a subsystem's healthy-state predicate changes, the generated runbook changes with it.

**Example — Event-bound playbook.** The orchestrator reacts to typed fleet events through per-topic playbooks. The playbook records the trigger and response once, so the orchestrator can execute them when the event recurs rather than reconstructing the procedure each time.

**Related mechanisms:** Lifecycle model → generated runbook · Operational playbooks · Operator runbook skill · Encoded Operational Judgment · Orchestrator-as-reactor.
