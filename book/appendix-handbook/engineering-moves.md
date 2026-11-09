<!-- GENERATED from book/latex/sources/appendix-handbook/engineering-moves.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

Choose the move by the recurring problem. A mechanism is one implementation of the move; [ref:handbook-engineering-moves] shows choices made in DocAble rather than prerequisites for practicing MAGE.

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

When choosing among these moves, ask what the next task will inherit. Sometimes it needs a clearer representation; sometimes a generator, a check, or a smaller set of permitted operations. Sometimes the right response is to leave a local decision local. The worked compositions that follow show how those choices can reinforce one another.
