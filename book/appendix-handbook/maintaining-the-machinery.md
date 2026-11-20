<!-- GENERATED from book/latex/sources/appendix-handbook/maintaining-the-machinery.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

A working control becomes part of the system later changes must preserve. Its inputs can drift, its consumer can move, and another control can interfere with it. The preceding blueprints therefore need maintenance beyond keeping their files present: engineers must examine interactions, correspondence, failure responses, and the work the machinery actually performs.

## Analyze Interactions Before Adding Another Control {#handbook-model-governance-graph}

Start with a concrete interference question. Do two hooks write the same record? Must one inspect state before another consumes or changes it? Does a required property of a commit conflict with a different mechanism’s transformation? Record only the distinctions needed to decide that question. A list of control names cannot answer it.

DocAble’s governance graph represents selected mechanisms with firing events, resource requirements, enforcement characteristics, and implementation anchors. Requirements distinguish reading, writing, requiring a property, and constraining a resource. Resources have hierarchical names: a coarse reference to `commit` can be refined to `commit.message` or `commit.body`. Apparent interference may disappear when the modeled subresources are disjoint. Genuine overlap may require an ordering or an engineering decision about incompatible requirements.

The graph’s analysis computes a declared order and detects cycles; tests include both a two-node cycle and a self-loop. This establishes properties of the represented relationships. A query returning an order is not an executing scheduler. If an analogous arrangement requires enforced ordering, install a consumer that actually uses the result and test its observed execution sequence.

Correspondence has a similarly concrete boundary. The anchor check compares modeled commands, lifecycle events, scripts, and entry symbols with configured wiring. It can detect a missing command or a mismatched firing event within its inspected population. Finding the expected function name does not establish that its behavior remains suitable. When a control’s meaning changes, review the represented requirements as well as its address.

## Keep Selection Connected to Execution

A check selector must remain connected to the machinery it controls. The merge-check incident in [ref:chapter:appendix-a-model-based-test-selection] illustrates how a correctly derived selection can fail to govern execution and acceptance. Maintenance should therefore examine not only whether the selection remains appropriate, but whether the selected checks actually run, whether their findings determine the intended verdict, and whether changes to the validation machinery have invalidated those relationships.

## Repair, Reconsider, or Retire

A control’s repeated use supplies evidence about its design. False refusals may reveal a bad identity extractor, as in the completed-phase gate. Missing attribution may reveal a mutation path the scanner cannot enumerate. Repeated manual reconstruction may identify a useful model; a frequently consulted model that never changes a decision may instead be unnecessary. Distinguish a defect in the mechanism from a deliberate exception to its policy before adding another override or check.

Keep the maintenance path connected to the original obligation. Identify the failure class, the representation or mechanism changed, the consumer that must use the repair, and the evidence that exercises the repaired path. Retest both refusal and legitimate work. Then remove superseded declarations and controls when consumers no longer depend on them. Leaving both old and new machinery active can create conflicting authority, duplicate cost, or a misleading impression of independent protection.

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

The endpoint is enough dependable machinery for the selected work. A rare inexpensive failure may remain an operating judgment; a recurring costly one may justify a durable interface or gate. Review construction, runtime, diagnosis, and upkeep costs against the work the arrangement enables or preserves. The adoption and measurement procedures in Appendix B’s [Getting Started](appendix-b-getting-started.html) and [Measuring MAGE](appendix-b-measuring-mage.html) sections support that decision as the engineering environment changes.
