<!-- GENERATED from book/latex/sources/appendix-handbook/resource-models-and-execution-design.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## Problem

A document-processing service can exhaust worker memory even when its individual transformations are correct. Dividing work by page may reduce intermediate allocations while leaving large media payloads resident. Increasing concurrency can then improve latency on small inputs and worsen failure on large ones. The engineering problem is to choose a representation and execution policy that preserve resource bounds while allowing useful parallel work.

## Conceptual Design

DocAble separates document structure from aggregate media residency. For OOXML documents, a streaming transformation places media in external storage and retains stable references in a smaller structural skeleton. Remediation operates on that skeleton and accesses media through its references. Recombination must also stream: buffering the complete payload on output would recreate the memory problem. [ref:interlude-execution-unit] shows how this arrangement differs from whole-document and page-partitioned processing.

The residency model uses the same bound as [ref:4.2-one-problem-many-models:heading:remove-media-from-the-working-set]:

<!-- eq: \begin{aligned} \operatorname{RSS}_{\mathrm{peak}} &\le C,\\ C &= M_{\mathrm{stream}} + M_{\mathrm{skeleton}} + M_{\mathrm{handles}} + M_{\mathrm{work}}. \end{aligned} -->

The terms bound the rolling stream buffer, resident structural skeleton, handles, and active remediation working set. Within the declared operating envelope, \(C\) is independent of aggregate media payload size. That statement requires bounds on the skeleton, handle population, individual media consumers, and concurrent work; streaming alone does not establish it.

With media residency controlled, page boundaries need not determine execution groups. Dependency declarations identify ready computations; mutation restrictions and resource limits constrain which may execute together. [ref:chapter:appendix-a-remediation-computation-graph] describes those declarations and their consumers. A separate performance model evaluates candidate policies using operation costs, dependency paths, concurrency limits, and deployment overhead. A critical path supplies a latency lower bound under the model’s assumptions, not an observation of end-to-end runtime.

## Engineering Models

[ref:handbook-resource-models] identifies the representations needed to connect resource feasibility to execution design.

<!-- label: handbook-resource-models -->
<!-- table: *Engineering models for resource-aware execution.* Representation, scheduling, and measurement must agree on the work and the resource boundary being evaluated. [short: Engineering models for resource-aware execution] -->
| **Model** | **Meaning and authority** | **Consumers** |
|---|---|---|
| Residency | Retained objects, allocation sizes, release conditions, and an admissible memory envelope. | Capacity decisions, concurrency feasibility, and resource guards. |
| Document structure | Skeleton entities and references to media that need not remain resident. | Remediation passes, media access, and streamed recombination. |
| Execution | Computation prerequisites, readiness, mutation restrictions, and allowed concurrency. | Scheduling policies and execution-order tests. |
| Performance | Operation costs, critical paths, fan-out costs, and deployment assumptions. | Predictions and comparisons of candidate designs. |
| Measurement | Workload identities, measured quantities, sampling boundary, and configuration. | Comparisons between predicted and observed memory, latency, and cost. |

A computation’s inputs must resolve to document objects accessible under the residency policy. Check whether a consumer needs embedded media or a rendered page: extracting media before whole-page rendering can remove content the computation requires. The policy must preserve or restore that content. Its concurrency allowance must agree with the memory envelope. Measured quantities must use the same process or container boundary, workload, and configuration as the prediction being evaluated. These relationships make the models useful together; merely maintaining all five does not ensure their agreement.

## Realization

### Establish and Challenge the Residency Bound {.unnumbered}

Measure the failing workload before changing the architecture. Record peak memory, input characteristics, major allocation sources, and execution time. Distinguish growth with aggregate media size from growth with structural complexity, the largest individual object, decoded image area, or active concurrency. Introduce streaming and skeleton references where they remove unnecessary residency, then repeat measurements across the dimensions the model says matter.

DocAble’s PDF recombination path supplied one concrete measurement: approximately flat peak-RSS scaling across a count-scaled media sweep when each object was flushed. That result establishes behavior for the tested path and workload. Evaluating the OOXML skeletonization design requires its own media-size sweep, including the write path and the assumed bounds on structural and active state. A result for one format cannot establish a resource envelope for another.

Challenge the variables as well as their fitted values. In DocAble, measurements contradicted predictions about mapped PDF pages and media offloading; decoded image area exposed another source of memory growth. Such findings require revising the residency explanation or its operating envelope, not merely raising a ceiling until the current fixture passes.

### Admit an Execution Policy Within the Envelope {.unnumbered}

Construct candidate schedules from the dependency declarations. Validate known ready frontiers, required order, and mutation restrictions before comparing latency. Weight the dependency paths with measured or explicitly estimated operation costs. Include resource contention, coordination, and repeated distribution costs where they affect the candidate deployment. Increasing concurrency can reduce serialization of independent work; it cannot remove a genuine dependency, and its memory cost may make the faster prediction infeasible.

Trace a proposed concurrency increase through all three decisions. The execution model identifies simultaneously ready operations. The memory model evaluates the active working set at that width. The performance model predicts completion time. When the proposal satisfies the modeled bounds, run a representative workload and compare measured memory and latency with those predictions before accepting the change.

For the failing case, the dependency order may permit the proposed width while the estimated working set exceeds the deployment budget. A resource guard should refuse that fan-out; the scheduler can use a smaller width or a batched design if the policy permits it. DocAble’s execution design used a bounded-concurrency semaphore and modeled the frontier’s working set as the concurrency limit multiplied by the per-call working set. This connects a scheduling choice to a resource question that dependency order alone cannot answer.

### Preserve the Tested Obligations {.unnumbered}

Retain the fixtures, measurement definitions, and accepted baselines with the design. DocAble mechanically checked four resource counters on two fixtures, while a further GenAI-hop dimension remained an audit measure. Keep that distinction explicit when deciding what a passing run establishes. A changed baseline needs an engineering explanation; a numeric comparison cannot decide whether that explanation is adequate. [ref:chapter:appendix-a-model-based-test-selection] describes selecting relevant validation as these modeled surfaces change.

## Adaptation and Limits

The arrangement applies where large payloads can be separated from the structure needed for reasoning and transformation. A format that requires whole-object access, unbounded structural growth, or a large decoded working set may need a different representation or admission policy. Resource and performance models remain conditional on their workloads and measurement boundaries. Preserve those conditions when changing formats, libraries, deployment tiers, or concurrency.
