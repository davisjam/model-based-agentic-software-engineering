<!-- GENERATED from book/latex/sources/appendix-handbook/model-based-test-selection.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## Problem

As agents produce changes faster, the cost of evaluating those changes can become a bottleneck. Running every test and analysis after every change provides broad evidence, but much of that work may be unrelated to the modification. DocAble’s full predeployment validation includes roughly four thousand tests and numerous static checks. Repeating all of them at every integration boundary would consume substantial computing resources and delay subsequent work.

Selecting fewer checks requires evidence that the reduced set is adequate. An omitted dependency can cause a relevant check to be skipped, allowing a regression to escape. Moreover, selecting checks is not the same as executing them: the validation machinery must actually honor the selection, and the acceptance decision must interpret the corresponding results.

## Conceptual Design

The engineering opportunity is to derive validation from models of change impact. A component model identifies the implementation elements involved; relationships among components identify potentially affected subsystems; declarations of validation coverage identify the checks to run. This arrangement can reduce repeated validation without requiring the engineer or agent to choose tests manually. The design below uses DocAble’s change-impact selector as a concrete example.

[ref:handbook-model-based-test-selection] illustrates the design. A proposed change is resolved through component and subsystem models to a declared set of potentially affected subsystems. Their validation obligations determine which tests and analyses should execute. Unmapped changes or recognized gaps in the impact model require broader validation. Separate analyses evaluate the selector itself, including comparisons with results from the full suite.

<!-- label: handbook-model-based-test-selection -->
<!-- figure: assets/handbook-model-based-test-selection.svg | *Model-based regression-test selection.* Component and dependency models derive affected subsystems, and validation coverage maps them to checks. Execution records and findings feed an acceptance gate under an explicit policy. Dependency analyses and full-suite comparisons challenge the selection; conservative fallback covers recognized uncertainty, not every unmodeled dependency. [short: Model-based regression-test selection] -->

Suppose an agent changes the component responsible for editing PDF structure. The selector first resolves the modified files to their modeled components. It uses their declared subsystem memberships and any rules that broaden the affected set to identify potentially affected subsystems, then consults the validation-coverage model to determine which checks evaluate those subsystems. For a change whose modeled impact is confined to PDF processing, PDF-specific checks may be selected while unrelated spreadsheet checks are omitted. The executor must honor that selection, and the acceptance gate must interpret the results of the checks actually required.

The decision is only as reliable as the relationships behind it. If the changed component also affects a shared document abstraction, the selection must cover the affected consumers, whether through a widened declaration or a broader run. An unmapped dependency must not be interpreted as proof that no additional checks are needed. Separately recovered dependency relationships and comparisons with full-suite execution can expose omissions in the selection model. The blueprint therefore governs not only which checks run, but how engineers establish confidence that the selection remains adequate.

## Engineering Models

Five models connect a change to validation. Their outputs have different types: changed files identify implementation elements; impact analysis declares subsystems; coverage declarations map subsystems to validation units. Keeping these distinctions explicit prevents a plausible dependency analysis from being mistaken for an adequate test selection.

The model relationships are summarized in [ref:handbook-selection-models].

<!-- label: handbook-selection-models -->
<!-- table: *Engineering models for regression-test selection.* Component and dependency relationships derive an affected-subsystem declaration; validation coverage maps it to checks. The execution model connects that selection to actual work and acceptance, while separate evidence challenges omissions. [short: Engineering models for regression-test selection] -->
| Model | Engineering question | Representation | Relationships / consumers |
|---|---|---|---|
| Component model | Where do changed implementation elements belong? | File-to-component identities and component-to-subsystem membership. | The impact query reuses the component resolver; stable identities join the other models. |
| Dependency model | Where could a change have consequences? | Declared component relationships and separately recovered project/import dependencies. | Declared relationships inform impact; recovered edges challenge the declaration. |
| Validation coverage model | Which checks evaluate each obligation or subsystem? | Validation-unit scope labels and supporting links to obligations or coverage observations. | Unit labels translate affected subsystems into checks; observations challenge coverage claims. |
| Change-impact model | Which subsystems may this change affect? | Derived affected-set declaration, derivation paths, widening hints, full-run requirement. | Computed from changed files and maintained relationships; consumed by unit selection and selector validation. |
| Validation execution model | What must run, and how do findings govern acceptance? | Selected check identities, execution modes, required results, and acceptance policy. | Executor consumes the selection; execution records support correspondence checks and gate decisions. |

A change-impact model relates implementation elements to the subsystems and obligations they may affect. DocAble’s component model identifies ownership and structural relationships within its codebase. A validation model groups components into subsystems, including PDF processing, Office document processing, the web application, and deployment infrastructure. The selector reuses the component model’s path resolver rather than maintaining a second account of component membership.

Given a set of changed files, the selector resolves each file to its component and derives the declared affected subsystems. Each validation unit declares the subsystems it evaluates. The selection rule includes a unit when its scope intersects the affected set. This is a decision about what should execute; the executor must consume it.

The **dependency model** has two uses that must remain distinguishable. Maintained relationships express the impact assumptions used for selection. Separately recovered project and import relationships provide descriptive evidence that can challenge those assumptions. Both may share component identities, so agreement is useful without constituting independent proof of completeness.

The **change-impact model** is a derived view for a particular change: an affected-subsystem declaration together with its derivation and any requirement for full validation. Derivation does not by itself confer authority. The engineer decides where the evidence justifies allowing that declaration to control a reduced run. The **validation execution model** then specifies required execution and the policy for interpreting findings. Execution records describe what actually ran; compare them with the selected set and the permitted broader modes.

Give component ownership, dependency declarations, and validation-unit scope explicit maintainers. A file move must preserve or update its component identity; a new cross-component call may widen impact; a check that acquires another responsibility needs a revised scope declaration. Observed coverage can challenge those declarations but cannot establish that an unobserved relationship is absent. These correspondence obligations keep the joins useful as the system changes.

The executor can choose scheduling and parallelism where the declared dependencies permit. It may run a deliberately broader set under the acceptance policy. Neither choice authorizes silently dropping a required check or changing what a finding means for admission.

## Realization

### Derive the Selection {.unnumbered}

The following explanatory pseudocode preserves DocAble’s `decide_unit` decision order; type annotations are omitted and diagnostic messages are simplified. It is not a verbatim source excerpt.

``` python
def decide_unit(unit_labels, affected, forced_full):
    if forced_full:
        return True, "full validation required"
    if not unit_labels:
        return True, "validation unit has no scope declaration"
    if unit_labels & affected:
        return True, "unit covers an affected subsystem"
    return False, "no modeled impact"
```

The two unconditional branches constrain which checks the selector may omit. If the selector cannot adequately classify a change, it must not interpret missing information as evidence that no checks are necessary. Likewise, a validation unit without a trustworthy scope declaration should run rather than be silently excluded.

DocAble’s selector returns a full-validation requirement for unmapped or cross-cutting files and dependency-manifest changes. The latter deserve special treatment because a project dependency can affect the assembled product beyond the component containing the manifest. Optional impact hints can enlarge the declared affected set, but cannot remove checks required by the models. These fallbacks protect against recognized uncertainty; an unrecognized dependency can still cause an omission.

The resulting selection is a claim about possible impact. Its adequacy depends on the completeness and correctness of the relationships from which it was derived.

### Connect Selection, Execution, and Interpretation {.unnumbered}

A selector is useful only when its decisions reach the machinery that performs validation.

An August 2026 investigation exposed this problem in DocAble’s merge checks. This was a separate mechanism from the change-impact selector: it selected inexpensive lints relevant to merging work. The merge gate selected between one and four lints, yet the validation command still took approximately one minute. In one warm profiled run, a full-tree walker consumed 62.66 of the 63.1 seconds. It executed 281 predicates independently of the selected lint set.

The problem extended beyond wasted computation. Findings produced by predicates outside the selected set could contribute to the gate’s failure verdict. The selection therefore governed neither all the work executed nor all the evidence interpreted.

The repair connected the walker to the same derived selection used by the other lint processes. It distinguished three cases for the walker’s own cohort of checks:

- **No restriction:** execute the ordinary full walker.
- **Empty intersection:** no walker checks are selected, so skip the walker.
- **Nonempty intersection:** at least one walker check is selected, so execute the full predicate cohort.

The third case deliberately retained extra checks rather than risk omitting a selected predicate. The empty-intersection branch removed both the unnecessary walk and its contributions to the gate verdict. A nonempty intersection still ran the whole cohort; the repair did not implement predicate-by-predicate filtering.

A historical replay used eleven merge batches reconstructed from one work window. All eleven runs of the previous configuration reached the 120-second execution limit; the revised configuration completed with a measured p95 of 8.86 seconds. The earlier durations were censored at the timeout, so 120 seconds is not a measured completion-time p95. This replay demonstrates the benefit of reconnecting selection to execution for that workload, not a current or general performance rate.

This incident identifies three responsibilities. **Selection** names the required checks. **Execution** performs them, or a deliberately broader set. **Interpretation** determines how findings affect acceptance. If execution runs extra checks, record that broader scope and define how their findings are handled. Do not silently let them change the gate’s policy or discard a consequential failure merely because it fell outside the selection. Preserve the finding, investigate the discrepancy, and apply the declared blocking, escalation, or review policy. Test all three responsibilities together.

### Challenge the Impact Declaration {.unnumbered}

Selective validation introduces a new possible failure: a relevant check may be omitted because the impact model does not represent a consequential relationship.

The principal requirement is that the selected checks supply the required evidence for every validation obligation the change can affect. Establishing that property is difficult because the model used to select checks may itself be incomplete.

DocAble’s validation machinery compares the selector’s declarations with several sources of evidence.

Static dependency analysis constructs a separate estimate of potentially affected subsystems. For C# code, it follows reverse project references; for Python, it follows reverse module imports. The validation condition requires the subsystems reached by this analysis to be included in the selector’s declaration:

<!-- eq: \operatorname{Reachable}(C) \subseteq \operatorname{Declared}(C). -->

Here, both sets contain **validation subsystems** for a proposed change C; neither is a set of tests. A reached subsystem omitted from the declaration is a counterexample to the impact claim. The scope declarations of validation units then translate affected subsystems into checks to execute.

The direction of this relation matters. The reachable set under-approximates potential impact: the analyzed graphs may omit reflection, dynamic dispatch, configuration-dependent behavior, or other consequential relationships. Passing the subset check establishes consistency with the dependencies that analysis found, not completeness of the declaration. The two calculations also share the component model, so a common classification error can escape this comparison.

Additional model relationships provide another source of counterexamples. DocAble’s validator compares the declared subsystems with maintained relationships among controls, mutations, and other engineering mechanisms. These checks can expose dependencies not visible in ordinary project-reference or import graphs.

Coverage evidence provides a third perspective. If an observed execution associates a validation unit with implementation affected by the change, but the selector would omit that unit, the disagreement warrants investigation. Coverage evidence is also incomplete: an unobserved execution path cannot establish that no dependency exists.

Finally, full-suite execution provides an empirical comparison. Run the selector alongside ordinary validation and record which checks it would omit. A failure in an omitted subsystem exposes a possible under-declaration. Investigate whether the change caused the failure, whether the check’s scope is declared correctly, and whether the result is reproducible. This comparison can challenge the selector’s models without treating every pre-existing or intermittent failure as evidence of a new dependency.

The historical evidence illustrates the limits of corpus validation. Across 200 historical change windows, the analysis reported 28 under-declaration findings arising from six root causes. Widening the modeled relationships reduced those findings to zero on that corpus. A subsequent evaluation reported 111 under-declaration findings across 797 historical change windows. A window may produce several findings, and findings may share a cause; these totals do not count distinct failing changes or distinct root causes.

These results do not establish a universal error rate or correctness over future changes. They show that eliminating findings on one corpus does not establish adequacy on a broader population. Additional methods and more varied changes can expose relationships that an earlier evaluation did not challenge.

When a discrepancy is found, revise the impact model and repeat the comparison. Expanding the selected set cannot introduce a new omission for the same change, although it can increase validation cost. The objective is not to minimize the selected set at any price, but to eliminate unnecessary checking without losing consequential evidence.

### Introduce the Arrangement Incrementally {.unnumbered}

Begin with a full validation process whose results are understood. Partition the system into a manageable set of components and validation subsystems, then establish which checks evaluate each subsystem. The initial model need not distinguish every component precisely. Coarse partitions will run more checks, but they require fewer assumptions about independence.

Implement the selector as a query over those models. Require it to explain its decisions: which changed file resolved to which component, which relationships established the affected subsystems, and why each validation unit was included or omitted. These records make a mistaken selection diagnosable.

Define conservative behavior before optimizing. Unmapped files, unresolved relationships, and changes with potentially broad effects should trigger full validation. Do not allow a missing scope declaration to become permission to skip a check. An agent may supply additional impact information, but that information should enlarge rather than narrow the set required by the maintained models.

Next, verify that the executor uses the selection and that the gate follows the declared policy for interpreting findings. Exercise empty selections, full selections, and checks executed through different mechanisms. Introduce known failures inside and outside the selected set. Confirm both that required checks detect their failures and that broader execution or unexpected findings trigger the intended blocking, escalation, or review response.

Evaluate the selector against historical changes and current work while retaining full-suite execution. Apply the challenges described under “Challenge the Impact Declaration” to identify omissions in the impact declaration. Resolve the discrepancies and repeat the evaluation over a sufficiently varied workload. The evidence should include changes to shared dependencies, test infrastructure, configuration, and other components whose effects may extend beyond their immediate source locations.

Only then decide whether the evidence justifies reduced validation at a particular boundary. The required assurance depends on the consequences of an escaped regression. A team may retain full validation before release while using a reduced set for earlier integration checks, with periodic full-suite runs to challenge the selection. Even the full suite supplies evidence only about the properties it checks; selection must not be credited with assurance the baseline never provided.

Selective validation creates a continuing maintenance obligation. Component boundaries change, tests acquire new responsibilities, and dependencies emerge. The selection models and their validation evidence must evolve accordingly.

Verify the complete path with a known change and deliberately introduced failures. Check the declared subsystems, selected unit identities, execution records, and resulting gate decision against the same revision. A missing result must not appear as a passing check, and an unavailable required observation must trigger the specified broader run or review.

## Adaptation and Limits

The potential economic benefit is reduced repeated validation. Its costs include constructing and maintaining impact relationships, evaluating the selector, investigating omissions, and running broader checks when uncertainty remains. Compare them using the lifecycle account in [ref:6.1-toward-a-theory-of-mage:heading:cost-and-failure-separately], while preserving the required quality of acceptance evidence.

Measure the actual work executed, not merely the number of checks selected. Record validation latency, computing cost, omitted-check findings, and the effort needed to maintain the impact model. Compare these costs against the consequences of delayed detection or escaped defects.

The appropriate granularity depends on the system. A small project may gain little from selective validation because its complete test suite is inexpensive. A large repository with costly integration tests may justify a detailed model of change impact. Where the consequences of an omission are severe, conservative selection or full validation may remain preferable.

The same principle applies to other engineering evaluations. A change to a resource model may require renewed performance measurements; a change to an authorization boundary may require security analyses; a modification to a deployment dependency may require checks across several services. The relevant question is which engineering obligations a change could disturb and what evidence is needed to evaluate them.

Model-based selection makes validation responsive to the system’s engineering structure rather than treating every change as equally consequential. Its value depends on maintaining trustworthy relationships among changes, obligations, and checks—and ensuring that the resulting decisions govern the validation actually performed.
