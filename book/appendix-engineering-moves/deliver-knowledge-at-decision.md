**Problem.** A rule cannot influence a decision if the actor does not encounter it in time. As the knowledge base grows, relying on the actor to search the full corpus becomes increasingly unreliable.

**Move.** Select and deliver the knowledge relevant to the current work at the decision point, rather than relying on the actor to retrieve it from the full corpus.

[ref:fig-move07] shows the selection at the decision point.

<!-- label: fig-move07 -->
<!-- figure: assets/c7-knowledge-at-decision.svg | *Knowledge delivery at the decision point.* Context selection joins the current work with the rules relevant to its scope and supplies that subset to the decision. The distinction is encoded by shape and line style rather than color. -->

**Example — File-scoped context.** Dynamic context injection selects the rules governing the files in a task and injects those rules into the agent's brief. The applicable subset arrives with the assignment rather than requiring the agent to recover it from the full governance corpus.

**Example — Dispatch admission.** Brief linting applies the same principle one step earlier. A task cannot launch unless its brief carries the required markers and context. The environment verifies that the required context is present before delegation begins, preventing an under-briefed task from launching.

**Explore:** Dynamic context injection · Governed Knowledge Base · Brief linting · Mandatory snippet-table enforcement · Point-of-action policy delivery. (MAGE Mechanism Catalog.)
