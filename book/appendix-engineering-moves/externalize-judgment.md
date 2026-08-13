**Problem.** Some work stays expensive not because the action is hard but because every operator rebuilds the same map: what healthy looks like, what a symptom means, which procedure applies, and what evidence confirms recovery. The knowledge exists; it just lives in a person's head and gets reconstructed on each incident.

**Move.** Represent the recurring operational judgment explicitly. Separate what can be derived or executed from what still needs human context, and keep the representation tied to the system it describes.

[ref:fig-move09] traces the system model into the operational model the operator reads.

<!-- label: fig-move09 -->
<!-- figure: assets/c9-externalize-judgment.svg | *From system model to operator.* A system model — healthy-state predicates, states, relations — feeds an operational model that splits into a generated procedure and reasoning guidance, both reaching the operator. -->

**Example — Generated runbook.** DocAble's lifecycle model names operational subsystems and their healthy-state predicates. The operator runbook generates from that representation, so the procedure stays anchored to the system rather than drifting away in independent prose. When a subsystem's healthy state changes, the runbook that explains it changes with it.

**Example — Event-bound playbook.** The orchestrator reacts to typed fleet events through per-topic playbooks. The triggering condition and the response structure are externalized, not reconstructed each time the event recurs. This mechanism runs more dynamically than a generated runbook, yet it externalizes the same recurring judgment — the operator's reflex, written down where the system can act on it.

Part IV's SRE runbook inset traces this discipline's lineage; this page names only its engineering shape.

**Explore:** Lifecycle model → generated runbook · Operational playbooks · Operator runbook skill · Encoded Operational Judgment · Orchestrator-as-reactor. (MAGE Mechanism Catalog.)
