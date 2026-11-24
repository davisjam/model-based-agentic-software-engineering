<!-- GENERATED from book/latex/sources/appendix-handbook/remediation-computation-graph.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## Problem

A remediation system performs computations whose dependencies do not necessarily follow document structure. A pass may inspect one element, produce information for several later passes, or modify state that another computation reads. When these relationships exist only inside implementations, changing execution order requires reconstructing them. The engineering problem is to make composition explicit enough to support scheduling and analysis while keeping the declarations connected to the operations that actually execute.

## Conceptual Design

Represent each registered computation by a stable identity, its role, and the information it reads or produces. Distinguish data dependencies from control dependencies: one carries information to another computation; the other determines whether work should execute. Record mutation behavior separately, because independence of declared inputs does not establish that two writers can safely run concurrently. [ref:from-nodes-to-composition] illustrates these distinctions.

DocAble connects these declarations to two kinds of consumer. For Office formats, registry read/write metadata informs scheduling and is emitted as dependency edges for a Python analytical graph. The scheduler does not consume that Python graph. For PDF, the analytical graph projects parallel typed declarations whose correspondence with the executable pipeline is checked. The two arrangements share computation identities, but differ in which facts are derived from a common source and which require reconciliation.

The execution machinery determines readiness from its dependency declarations and applicable control conditions. A frontier contains work whose prerequisites permit execution; a scheduling policy selects from that frontier subject to resource and mutation restrictions. Analytical views use the computation identities to examine critical paths, mutation behavior, cost, and coverage. Additional analytical annotations need not become scheduling inputs.

## Engineering Models

[ref:handbook-computation-models] separates the declarations from their execution and analysis consumers.

<!-- label: handbook-computation-models -->
<!-- table: *Engineering models for computation dependencies.* Identify the source of each relationship and the consumer that gives it an execution or analytical role. [short: Engineering models for computation dependencies] -->
| **Model** | **Meaning and authority** | **Consumers** |
|---|---|---|
| Computation registry | Stable pass identities and roles; the registered unit is a computation, not each internal statement. | Execution registration, dependency declarations, and attribution. |
| Dependencies | Data prerequisites and control conditions. Office read/write declarations supply shared facts; PDF uses checked parallel declarations. | Scheduling machinery and the derived analytical graph. |
| Mutation behavior | Declared read-only, direct-mutation, patch-producing, or mixed behavior. A declaration alone does not restrict writes. | Mutation analysis; execution policies must separately enforce required exclusion or application boundaries. |
| Execution | Readiness, completion, and scheduling choices within the declared dependencies and resource limits. | The scheduler and tests of execution order and permitted concurrency. |
| Analytical views | Derived relationships joined to measurements, costs, or coverage observations through computation identities. | Critical-path queries, architectural investigation, and correspondence checks. |

The static graph describes possible composition, not the history of one run. Telemetry joined to computation identities supplies measurements for selected analyses; the document edit history records realized mutations through a separate attribution channel. Missing measurements must remain distinguishable from measured zero cost. [ref:2.6-system-knowledge:heading:docable-connecting-engineering-models] explains these connections; [ref:chapter:appendix-a-controlled-mutation] describes the supported mutation interface.

## Realization

### Connect Declarations to Their Consumers {.unnumbered}

Assign stable computation identities and define the meanings of each dependency kind. Where execution already has authoritative declarations, derive analytical edges from them. Where separate declarations are necessary, specify what the correspondence check compares. Check unresolved identities, required inputs, and dependency structures that the chosen execution policy cannot interpret. Define what happens when a control condition is false or a prerequisite fails; graph shape alone does not supply that behavior.

Check the covered population against executable registrations, not merely one declaration set against another. A DocAble audit found a live Office pass outside the entries examined by its checks. Making those checks blocking would not have detected the omitted pass. The repair first expanded coverage and exercised discrepancy detection, then made Office findings blocking at admission. Both format families subsequently required their declared correspondence checks to pass. This progression is developed in [ref:3.2-models-and-the-semantic-gap:heading:docable-from-correspondence-to-enforcement].

### Exercise Ordering and Challenge the Declarations {.unnumbered}

For a successful example, use a table-header repair that produces information required by a later structure check. Resolve both computation identities, derive the data dependency, and verify that the scheduler makes the check ready only after its prerequisite succeeds. Query the analytical view for the same relationship. The ordering test supplies evidence about execution; agreement of the view with its source supplies evidence about correspondence.

For a failing example, remove the relationship from the analytical projection while retaining the executable declaration. The correspondence check should identify the mismatch, and a required-check gate should reject the change. Then challenge coverage with an unregistered computation or an undeclared read. A comparison that examines only the remaining declarations can miss either defect; independent registration checks and targeted execution tests must expose the relevant omission.

Keep execution policy separate from computation meaning. Test a candidate frontier policy on known dependency structures, including independent computations, control-gated work, and conflicting mutations. Use measurements to challenge predicted critical paths rather than treating the graph as a timing observation. [ref:chapter:appendix-a-resource-models-and-execution-design] connects these choices to resource limits.

## Adaptation and Limits

This arrangement is useful for pipelines and workflows with identifiable computations and recurring questions about their composition. Its soundness depends on the declared dependencies and effects matching the implementation. A hidden read or write can invalidate a scheduling choice even when every declared edge is consistent. Preserve a conservative execution policy where those relationships are uncertain, and require separate evidence before using apparent independence to justify concurrency.
