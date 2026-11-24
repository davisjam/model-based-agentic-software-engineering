<!-- GENERATED from book/latex/sources/appendix-handbook/remediation-computation-graph.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## Problem

A remediation system performs computations whose dependencies do not necessarily follow document structure. A pass may inspect one element, produce information for several later passes, or modify state that another computation reads. When these relationships exist only inside implementations, changing execution order requires reconstructing them. The engineering problem is to make composition explicit enough to support scheduling and analysis while keeping the declarations connected to the operations that actually execute.

## Conceptual Design

Represent each registered computation by a stable identity, its role, and the information it reads or produces. Distinguish data dependencies from control dependencies: one carries information to another computation; the other determines whether work should execute. Record mutation behavior separately, because independence of declared inputs does not establish that two writers can safely run concurrently. [ref:from-nodes-to-composition] illustrates these distinctions.

DocAble connects these declarations to two kinds of consumer. For Office formats, registry read/write metadata informs scheduling and is emitted as dependency edges for a Python analytical graph. The scheduler does not consume that Python graph. For PDF, the analytical graph projects parallel typed declarations whose correspondence with the executable pipeline is checked. The two arrangements share computation identities, but differ in which facts are derived from a common source and which require reconciliation.

Execution order and permission to run are distinct. Registry dependencies constrain the order; a computation can still have a condition that determines whether it applies to the current document. Latency measurements, test coverage, and mutation classifications can be joined to computation identities without becoming inputs to the scheduler.

The declarations and their distinct execution and analysis consumers appear in [ref:handbook-computation-architecture].

<!-- label: handbook-computation-architecture -->
<!-- figure: assets/handbook-computation-architecture.svg | *Computation declarations and their consumers.* Office uses shared registry metadata for scheduling and analytical projections. PDF maintains typed analytical declarations alongside executable passes and checks their correspondence. Both arrangements support analysis through stable computation identities. Coverage checks must also establish that the compared population includes the computations that actually execute. [short: Computation declarations and their consumers] -->

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

### Register Computations and Derive Their Order {.unnumbered}

For DOCX, a typed pass identifier names the computation, and its registration binds metadata to an executable callback. The following pseudocode reduces two actual registrations to their dependency declarations; it omits the callbacks and common metadata:

``` text
if options.FixTableHeaders:
    register(TableHeaderRemediator,
             writes={BodyTableHeaders})
    register(TableStructureCheck,
             reads={BodyTableHeaders},
             writes={BodyTableStructure})
```

The shared resource name connects a table-header repair to the later structure check. The registration helper supplies a phase, access mode, explicit ordering constraints, and optional execution predicate. Resource outputs describe information available to other computations; they do not by themselves establish whether a pass mutates the document directly or produces a patch. Both registrations belong to the same option-controlled group, so disabling header repair removes the pair from this registry.

The registry builder combines explicit ordering constraints with dependencies derived from resource reads and writes. It produces a deterministic topological order and rejects cycles, duplicate computation identities, unresolved dependencies, missing required producers, and conflicting writers. Optional reads permit absent producers but still establish ordering when a producer exists in the same phase. A producer available only in a later phase cannot satisfy an earlier read.

The shared serial driver executes this order. Before invoking a pass, it evaluates the execution predicate and records a skip if the result is false. It then checks declared runtime field preconditions and invokes the callback. An unhandled exception fails the sequence. Registration therefore establishes an ordering obligation, not a guarantee that a conditional producer supplies every value its consumer needs; runtime preconditions must establish the latter where required.

### Project Relationships for Analysis {.unnumbered}

The Office edge emitter constructs registries with the relevant options enabled, without running remediation. It walks each ordered registry and pairs a resource writer with later required or optional readers. Its JSON records contain `format`, `producer`, `consumer`, and `resource`. The example connects the header repair to the structure check through their shared header resource. The Python projection resolves the identities to format-qualified node identifiers and folds the records into data-flow edges. The emitted snapshot must be refreshed when its source declarations change. This projection exposes resource dependencies; it is not a copy of every explicit ordering constraint or of one document’s execution history.

Each analytical node records its identity, format, role, phase reference, mutation classification, and code anchor. An edge identifies producer, consumer, and dependency kind. PDF supplies the analytical inputs through typed `Produces`, `Consumes`, and `ConsumesForControl` sets on its pass interface. These declarations describe composition without selecting runtime order. For example, the intra-page vision-fusion pass consumes heuristic-proposal paths as data, but reads document signals and routing verdicts to decide whether to run. The projection therefore creates data-flow edges for the former and control-gate edges for the latter. A control input must not appear to be payload that the computation transforms.

The PDF projection compares relationships derived from these typed declarations with the analytical graph’s declared edges. Registration checks separately compare node identities with executable registrations. Neither comparison proves that a pass body has no undeclared effect. Mutation analysis therefore needs its own evidence: DocAble’s PDF check inspects code routes to patch-application runners and compares them with the graph’s mutation classification and application boundary. This check distinguishes declared intention from the mutation path the implementation actually uses.

Measurements join to graph nodes through stable, format-qualified computation identities. Coverage and timing consumers use the same identity mapping, so unresolved names can be reported rather than silently discarded. Missing observations remain distinguishable from measured zero cost.

### Attach Analyses to a Shared Population {.unnumbered}

Several analyses can use the same computation population without adding their facts to the execution registry. DocAble’s analytical graph has an attribute-provider registry: each provider joins a particular kind of information, such as configuration posture, cost, complexity, or latency, to stable computation identities. The registry permits one provider for each attribute and rejects coverage claims for nodes outside the graph. Adding an analytical question requires a provider, rather than another independently maintained inventory of computations.

Some providers derive their values from each node’s classification and therefore cover newly added nodes without per-node code. Others require measurements or judgments of their own; a new node does not acquire a measured latency merely because it appears in the graph. Keep each provider’s source and coverage explicit, and test that its claims concern the current node population. These analytical attributes do not make the Python projection an execution authority. For example, a modeled configuration posture remains distinct from the configuration supplied to a runtime call.

### Check the Population and the Relationships {.unnumbered}

The registry’s ordering test registers a reader before its producer and checks that the derived order reverses them. Other tests challenge cycles, missing producers, conflicting writers, and explicit ordering. Projection tests distinguish data from control inputs. A negative test removes the PDF router’s declared outputs and checks that their projected edges disappear. Correspondence findings from either format block admission.

[ref:handbook-computation-failures] distinguishes failures that require different evidence. A passing comparison over two incomplete sets cannot establish completeness, and a complete set of declarations cannot establish that the code obeys them.

<!-- label: handbook-computation-failures -->
<!-- table: *Checking computation declarations.* Agreement, population coverage, and implementation effects require separate checks. [short: Checking computation declarations] -->
| **Failure** | **What is wrong** | **Required evidence** |
|---|---|---|
| Projection disagreement | An analytical edge differs from its source declaration. | Recompute and compare relationships; inject a discrepancy to test detection. |
| Missing computation | Executable work is absent from the population under comparison. | Inspect registrations and direct runner invocations, including paths outside the registry. |
| Undeclared effect | A pass reads or writes state beyond its declarations. | Inspect relevant code effects and test the execution behavior; declaration agreement is insufficient. |

A DocAble coverage audit supplies a concrete missing-population case: DOCX math promotion executes through a direct runner call outside the enum-based registry, so comparing enum members with graph nodes cannot see it. Qualified PDF constructor names also escape the registration reader. The repair includes these execution paths in the checked population and makes correspondence findings block admission. Making an incomplete check blocking cannot repair its blind spot. [ref:3.1-from-engineering-models-to-enforcement:heading:docable-from-correspondence-to-enforcement] develops that distinction.

## Adaptation and Limits

This arrangement is useful for pipelines and workflows with identifiable computations and recurring questions about their composition. Its soundness depends on the declared dependencies and effects matching the implementation. Two computations without a declared edge may still mutate the same document object, share a non-thread-safe library handle, or exceed the resource budget when active together. Safe concurrency therefore requires mutation exclusion and resource admission as well as dependency readiness. Serial execution remains appropriate where those relationships are uncertain; concurrency requires the necessary isolation, application boundaries, and resource limits. [ref:chapter:appendix-a-resource-models-and-execution-design] develops those additional obligations.
