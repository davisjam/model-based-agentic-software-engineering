<!-- GENERATED from book/latex/sources/appendix-handbook/engineering-moves.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

Read a blueprint by following the effect it governs. For deployment, the effect is an installed permission. For document editing, it is a mutation to the artifact. For delegation, it is accepted engineering work and the state from which later work proceeds. Ask which component may cause that effect, what information it needs, and what happens when the information is missing or the attempted action fails.

The figures use a common vocabulary. Rectangles identify models or durable artifacts; rounded rectangles identify mechanisms or transformations; diamonds identify decisions. Solid arrows carry data or artifacts. Dashed arrows show correspondence or verification relationships, and a heavy boundary identifies where an action is constrained or refused. A path into a decision is not automatically evidence sufficient to justify it: the accompanying prose states what the check establishes. Pale gray identifies flexible reasoning; other components remain white. The flexible reasoning component remains distinct from the machinery governing its effects.

State authority separately from representation. An authored contract specifies an obligation; a recovered model may initially describe existing configuration; a derived plan computes a consequence of other facts. A correct derivation from a mistaken obligation remains mistaken. A faithful model can also describe behavior that ought to change. In each blueprint, identify who owns the fact, which component consumes it, and who resolves a disagreement before making the representation authoritative.

## Use the Engineering Moves Selectively {#handbook-composition-procedure}

The ten moves in [ref:handbook-engineering-moves] are construction choices. A blueprint combines the moves needed for its purpose; it does not require every mechanism in the table. For example, deriving a grant plan is useful only after the caller, callee, and runtime identity can be joined reliably. Checking that derivation against an existing deployment map is a migration aid, not another permanent owner of the same fact.

<!-- label: handbook-engineering-moves -->
<!-- table: Ten engineering moves, the problems that motivate them, and concrete realizations in DocAble. [short: Engineering moves at a glance] -->
| Recurring problem | Engineering move | DocAble example |
|-----------------|--------------------|--------------------------|
| Different consumers disagree about the same fact. | **Make one source authoritative.** Assign the fact an owner and name its consumers. | The component catalogue defines the zones used by repository accounting and agent audits. |
| A copied declaration drifts from its source. | **Derive; do not copy.** Compute the second representation where a reliable transformation exists. | Deployment derives invocation-grant plans from service dependencies and runtime identity. |
| A useful representation no longer describes its subject. | **Check correspondence.** Compare declared facts with independently obtained evidence. | A governance-graph check resolves modeled hooks against their configured events and implementing scripts. |
| A collection of tests has no explicit account of what it must cover. | **Derive the obligation set.** Enumerate required evidence from represented properties. | Cross-service invariant declarations identify verification obligations and references to their checkers. |
| A rule is checked where the necessary state is unavailable. | **Enforce where the property is legible.** Place the decision and its consequence at a suitable boundary. | The PDF applier resolves the target before deciding whether an artifact-demotion request is admissible. |
| A protected operation remains available through ungoverned paths. | **Close the action surface.** Offer supported operations through a controlled interface. | External PDF editing uses typed operations; the applier can refuse a request before mutation. |
| Relevant knowledge is discovered after the consequential choice. | **Deliver knowledge at the decision.** Join the work’s scope to the representations it needs. | Dispatch context extraction selects constraints associated with the brief’s target files. |
| A result cannot be traced to the work that produced it. | **Carry cause with consequence.** Preserve identities and attribution across transformations. | PDF mutation records identify the responsible pass or editing session; applied results can be compared with proposed edits. |
| The same operational judgment must be reconstructed repeatedly. | **Externalize recurring judgment.** Record states, evidence, and sanctioned responses. | Lifecycle descriptions and runbooks distinguish recovery work from ordinary completion and identify where judgment remains. |
| Individually reasonable changes conflict when combined. | **Make dependencies queryable.** Represent the relationships needed to analyze the interaction. | The governance graph records firing events, resource use, and chosen resolutions among selected mechanisms. |

The third move, checking correspondence, has two possible responses. If a descriptive representation is stale, repair it to match the implementation. If an authoritative obligation is violated, repair the implementation or reconsider the obligation through the appropriate engineering decision. A check that reports disagreement cannot decide which side ought to change merely because it found a difference.

The sixth move also has a scope. Closing the external PDF editing interface does not establish that every internal document mutation uses it. A useful control has a stated boundary and evidence that the relevant paths cross it. Extending that boundary is further engineering work, with its own compatibility and maintenance costs.

## Read the Implementation Evidence

The code fragments are excerpts from actual implementations, with omissions identified. They expose consequential interfaces rather than provide complete programs to copy. The inspected DocAble source is pinned to a November 2026 snapshot; dated investigations describe what was observed or repaired at those times. Inspection of source and tests is distinct from rerunning those tests, querying a live deployment, or establishing that a migration subsequently finished. Proposed construction steps are stated as instructions to the reader, not as additional DocAble results.

Before adapting a blueprint, choose one work unit and write down its required outcome. Then trace a successful case and a failed case through the components. A plan that cannot be applied, a refused edit, an unresolved assignment, and an interrupted executor each need an explicit disposition. Build the smallest complete path that supplies those dispositions, then extend it when another consumer or consequential failure justifies the cost. The blueprints omit local implementation detail where it does not change that reasoning.
