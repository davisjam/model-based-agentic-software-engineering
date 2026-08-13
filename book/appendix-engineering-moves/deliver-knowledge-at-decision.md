**Problem.** A rule can be documented perfectly and still fail in practice when the actor making the decision never encounters it. As the knowledge base grows, "the agent could have found the rule" weakens into an empty governance strategy — the reachable corpus outgrows anyone's ability to search it before acting.

**Move.** Bind the relevant knowledge to the work surface where it matters. Make discovery a property of the environment, not a test of memory or search skill.

[ref:fig-move07] shows the selection step that puts the right rules in front of the decision.

<!-- label: fig-move07 -->
<!-- figure: assets/c7-knowledge-at-decision.svg | *Knowledge meets the decision.* Rules sit on one side, work on the other; a context-selection step picks the rules relevant to this work and feeds them into the decision, so the decision is made with the right knowledge already in hand. Read by shape and dash, not colour. -->

**Example — File-scoped context.** Dynamic context injection selects the rules governing the files in a task and injects those rules into the agent's brief. The agent no longer has to reconstruct the applicable policy from the entire governance corpus before touching the code. The relevant subset arrives with the assignment.

**Example — Dispatch admission.** Brief linting applies the same principle one step earlier. A task cannot launch unless its brief carries the required markers and context. The environment does more than make knowledge available; it verifies that the knowledge surface the work needs is actually present before delegation begins, so an under-briefed task never starts.

**Explore:** Dynamic context injection · Governed Knowledge Base · Brief linting · Mandatory snippet-table enforcement · Point-of-action policy delivery. (MAGE Mechanism Catalog.)
