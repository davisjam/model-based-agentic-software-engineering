<!-- GENERATED from book/latex/sources/appendix-handbook/governed-delegation.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## Problem

Delegating engineering work requires more than assigning a task to an agent. The assignment must identify its authorized scope, supply relevant engineering knowledge, preserve durable results, and establish what evidence permits acceptance. Without these arrangements, an agent may work from stale context, repeat completed work, or leave useful changes stranded when its conversation ends.

## Conceptual Design

[ref:handbook-model-guided-delegation] organizes delegated work around three boundaries. Dispatch checks whether an assignment may proceed, using the work order, relevant engineering knowledge, and lifecycle state. Execution gives the agent freedom within the assignment while preserving commits and other durable artifacts. Completion evaluates the resulting work against its acceptance obligations and determines whether it can be accepted or must be reconciled. Recovery uses the durable artifacts to resume interrupted work without discarding completed changes.

<!-- label: handbook-model-guided-delegation -->
<!-- figure: assets/handbook-model-guided-delegation.svg | *Governed delegation joins an assignment to relevant knowledge, durable work, and acceptance evidence.* Context selection is bounded and advisory. Dispatch gates act on assignment structure and resolved phase state; completion review evaluates landed work and independent evidence. Recovery preserves existing artifacts before work is reassigned. [short: Governed delegation] -->

## Engineering Models {#handbook-work-models}

The models in [ref:handbook-delegation-models] connect an assignment to its scope, lifecycle, results, and acceptance evidence.

A work order must carry enough structure for people and machinery to use it. DocAble’s briefs name the objective, target and new files, genre, role, verification work, acceptance criteria, and non-goals. The objective and acceptance conditions express engineering intent. Path declarations establish the initial scope for repository lookup and context selection while leaving implementation choices open within that scope.

<!-- label: handbook-delegation-models -->
<!-- table: *Engineering models for delegated work.* Assignment and phase identities connect scope, relevant knowledge, durable artifacts, and completion criteria. Lifecycle rules govern dispatch and reopening; evidence about landed work supports acceptance. [short: Engineering models for delegated work] -->
| **Model** | **Engineering question** | **Representation** | **Relationships / consumers** |
|---|---|---|---|
| Work order | What work is authorized, and what would make it acceptable? | Objective, scope, named inputs and outputs, acceptance obligations, and non-goals. | Composition and dispatch consume the assignment; completion review evaluates its obligations. |
| Component and constraint models | Which knowledge and obligations apply to the assignment? | Path-to-component relationships and registered constraints with scope and identity. | Context selection joins target paths to relevant records; enforcement remains with the applicable controls. |
| Work lifecycle | Which transitions may proceed from the recorded state? | Assignment or phase identity, state, completion conditions, reopen rules, and authorized exceptions. | Dispatch consults reconciled state; completion and reopening update it under explicit policies. |
| Work identity and provenance | Which durable results belong to an assignment? | Links among work orders, executors, worktrees, commits, artifacts, and inspection records. | Integration and recovery locate results without reconstructing a conversation. |
| Completion criteria | What evidence permits acceptance and closure? | Promised effects, required checks or review, results, and unresolved obligations. | Completion review consumes independently inspectable artifacts and evidence; a producer report is one input. |

The following metadata excerpt from a November 2026 work order locates a standards-evidence check’s inputs and intended output:

<!-- print-keep-with-next: 12 -->

``` text
<!-- target-files:
  tools/lint/lint_all/registrations/batch_d.py,
  system-models/standards_universe.py -->
<!-- new-files-to-create:
  tools/lint/lint-standards-evidence-escape-admission.py -->
<!-- compute-class: lint-all-on-commit -->
<!-- brief-genre: lint -->
```

The existing paths identify the registration point and the model the checker must consume; the new-file field distinguishes an intended output from a missing input. The assignment addresses a gap between acceptance criteria and implementation: exception data exists, but its admission checker is missing. This example shows how an unmet obligation becomes bounded work; the source records the assignment during execution, not its successful completion.

Stable assignment and phase identities connect dispatch, durable results, and completion. Derived context selects relevant records without changing their meaning. A history mentioning a phase does not establish that the assignment belongs to it; conflicting identities or state require reconciliation before a completion decision.

A lifecycle model distinguishes the states its consumers need. One possible design uses ready, dispatched, under review, and accepted states, with interruption recorded separately. Dispatch has a defined precondition, and acceptance requires work-order evidence. DocAble’s completed-phase gate refuses a new dispatch when the resolved phase state is complete. Reopening changes that state; a reasoned override permits one dispatch without redefining completion.

The completion model connects each acceptance obligation to evidence and a decision. An agent’s final message supplies an input to review; it does not itself establish acceptance.

## Realization

### Compose and Select Context {.unnumbered}

Context selection connects an assignment’s scope to maintained engineering knowledge. A component catalogue can map a path to its owner and architectural zone; a constraint registry can identify obligations attached to that path or genre. DocAble combines standing instructions selected during composition, file-specific constraints selected at dispatch, and retrieval as the task develops. A brief that creates a lint receives the relevant authoring instructions; later queries can retrieve designs, service relationships, or operating procedures as needed.

Before selection, validate the assignment’s structure, registered identities, paths, and required instruction markers. These checks establish that the declared inputs can be resolved.

Each constraint-registry adapter accepts target files and returns normalized records carrying registry and constraint identities, scope, severity, priority, source or corrective guidance, and the matched target. Independently maintained registries expose a common selection interface:

<!-- print-keep-with-next: 8 -->

``` text
def coverage_for_files(
    self, files: list[str], *, repo_root: Path
) -> list[Constraint]: ...
```

The aggregator deduplicates by registry and constraint identity, orders each registry’s contribution by priority, applies its budget, and sorts the retained records. Priority refinement keeps stylistic findings from displacing structural constraints. The resulting selection is bounded and prioritized, so it need not contain every applicable constraint. Its purpose is to provide relevant context without overwhelming the assignment.

DocAble’s aggregator catches extraction exceptions and allows the failed adapter to contribute no records; its tests exercise this degraded-empty behavior. An empty selection therefore does not establish that no obligation applies. Callers need to distinguish no match, budget exclusion, and extraction failure, with source references available for further retrieval.

Selected prose guides the reasoner. The applicable tests, permissions, and gates supply enforcement whether or not the agent follows that guidance. When work expands beyond its declared target files, repeat the selection for the actual scope and revisit the acceptance obligations.

### Dispatch, Execute, and Evaluate Completion {#handbook-model-lifecycle .unnumbered}

Begin with a structured assignment and a deliberately small set of dispatch checks. Verify that the assigned scope is resolvable, that the work is attached to the intended project, and that the required instruction sources are available. State what happens when a premise cannot be established. A missing path for a declared new file has a different meaning from a missing source file the agent is expected to edit.

Require durable work early enough that interruption is recoverable. In DocAble, agent commits carry progress information, and a final validation marker distinguishes work ready for integration from an interrupted sequence. Links among the assignment, executor, worktree, and commits let an operator locate results without recovering the conversation.

Evaluate completion against the work order. Inspect the promised changes, their integration, and the tests or review addressing acceptance. Record unresolved obligations rather than replacing them with a completion marker. Checks may occur before merge, in later validation, or at release. Acceptance depends on independently inspectable evidence, including but not limited to the producing agent’s report.

Recovery inspects durable artifacts before assigning replacement work or resetting an executor. In DocAble’s November 9 restart episode, background completion notifications disappear while agents’ commits remain in Git worktrees. The operator inspects branches, integrates completed work, then releases the affected slots. Durable repository state supplies the evidence needed to recover the work.

For a new arrangement, test interruption before the first durable result, after a partial result, and after completion but before notification. Define who may resume the work and which evidence permits a slot or workspace to be released. A stale heartbeat or apparently idle process is a reason to inspect state, not sufficient evidence that its work can be destroyed.

### Enforce Lifecycle Decisions {#handbook-conversion-episode .unnumbered}

Persistent assignments need rules for recognizing completion, reopening work, and authorizing exceptions. DocAble’s completed-phase gate addresses repeated dispatch against phases whose implementation is already integrated. Phase identities in briefs and commits connect the assignment to a reconciled phase record, which composition and dispatch both consult. The gate refuses a new assignment when that record positively identifies a completed phase.

A missing record or unresolved phase does not establish completion and therefore does not trigger this particular refusal. Other dispatch requirements still apply. When genuine further work is needed, reopening changes the recorded phase to a state that can be scheduled again. An explicit override instead permits one dispatch with a reason; its audit write is best-effort, and a write failure is reported rather than represented as persisted evidence. The override does not silently redefine the phase’s completion state.

The October 10 investigation identifies four false refusals in one session. The original extractor searches the declared `Epic` line, then falls back to the first phase reference anywhere in the brief. Narrative history about a completed phase can therefore cause an unrelated assignment to be refused. The repair restricts extraction to the declared field. If that field contains no phase, the extractor returns no phase rather than manufacturing an identity from narrative text.

Verify both sides of this gate. A declared completed phase should be refused; a reopened phase should proceed subject to the other checks. A declared Phase 3 beside narrative history about Phase 2 must resolve to Phase 3. If the declared line has no phase, narrative history must not manufacture one. These cases test the link between identity, state, and consequence rather than merely exercising the final refusal branch.

Repeated overrides should prompt review of the gate’s premise, identity extraction, state reconciliation, or policy. An override is an exception to a particular dispatch decision, not evidence that the underlying control is correct.

### Verify the Arrangement {.unnumbered}

Exercise the whole path from assignment to accepted or recoverable work. A valid work order should resolve its intended scope and instruction sources; missing inputs and extraction failures should receive the declared response. A completed-phase refusal, legitimate reopening, and authorized override should have distinguishable effects. Interrupt an executor before and after durable results, then verify that recovery finds the correct artifacts without accepting unfinished work. Finally, inject a failed acceptance obligation and confirm that a successful producer report cannot close it.

## Adaptation and Limits

The arrangement applies wherever delegated work must survive interrupted execution and be accepted against explicit obligations. Its effectiveness depends on stable assignment identities, durable artifacts, and a completion decision grounded in evidence beyond the producer’s report. It does not establish that an authorized assignment is worthwhile or that the selected acceptance criteria are sufficient. Those remain engineering judgments. [Appendix B’s Operating a GEE section](appendix-b-operating-a-gee.html) develops the corresponding operating procedures.
