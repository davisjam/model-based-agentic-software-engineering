<!-- GENERATED from book/latex/sources/appendix-handbook/governed-delegation.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## Problem

Delegating engineering work requires more than assigning a task to an agent. The assignment must identify its authorized scope, supply relevant engineering knowledge, preserve durable results, and establish what evidence permits acceptance. Without these arrangements, an agent may work from stale context, repeat completed work, or leave useful changes stranded when its conversation ends.

## Conceptual Design

[ref:handbook-model-guided-delegation] follows those connections. The work order gives the agent an assignment; maintained engineering models help select context; dispatch checks govern whether that assignment may proceed. Commits and other durable artifacts then support integration, completion review, and recovery. The completion boundary is separate from the dispatch boundary, and the figure does not prescribe one identical sequence for every task.

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

These fields come from an actual November 2026 brief to add a standards-evidence check. Only line wrapping has changed; unrelated fields are omitted.

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

The existing paths locate the registration point and the model the new checker must consume; the new-file field distinguishes an intended output from a missing input. The brief arose from a comparison of the standards project’s acceptance criteria with its implementation: exception data existed, but the checker governing admission of those exceptions was missing. The investigation captured the assignment during execution. It demonstrates the transformation from an unmet obligation to bounded work, not an observed successful completion of that particular task.

The work order states intended work; component records and provenance describe relationships the arrangement relies on. Derived context is a selective view of those records, not a new owner of their meaning. Stable assignment and phase identities connect dispatch, durable results, and completion. A history mentioning a phase does not establish that the current assignment belongs to it. When identities or state disagree, reconcile the records before treating the disagreement as evidence of completion.

A lifecycle model must distinguish the states needed by its consumers. One possible design uses ready, dispatched, under review, and accepted states, with interruption recorded separately from acceptance. Choose the states for the work unit and its consumers. The important requirements are that dispatch have a defined precondition, acceptance require the work-order evidence, and interruption not imply successful completion. DocAble’s completed-phase gate uses a narrower predicate: a positively resolved completed phase refuses a new dispatch. Reopening changes that phase state; a reasoned override permits a particular dispatch without redefining completion.

The engineer retains authority over objectives, acceptance obligations, and exceptions. Agents can choose implementations and investigate alternatives within the declared scope. Context selection helps them find relevant knowledge, while permissions and gates independently restrict selected actions and admissions. The completion model must therefore connect an obligation to the evidence that evaluates it and the decision that consumes that evidence, rather than treating an agent’s final message as the accepted state.

## Realization

### Compose and Select Context {.unnumbered}

Context selection connects an assignment’s scope to maintained engineering knowledge. A component catalogue can map a path to its owner and architectural zone; a constraint registry can identify obligations attached to that path or genre. DocAble combines standing instructions selected during composition, file-specific constraints selected at dispatch, and retrieval as the task develops. A brief that creates a lint receives the relevant authoring instructions; later queries can retrieve designs, service relationships, or operating procedures as needed.

Before selection, validate the assignment’s structure, registered identities, paths, and required instruction markers. These checks establish that the declared inputs can be resolved; they do not establish that the objective is worthwhile or that the chosen acceptance evidence is sufficient. Those decisions require engineering review.

The file-specific selector is a concrete transformation. Each registry adapter accepts target files and returns normalized records carrying a registry and constraint identity, a scope description, severity, priority, source or corrective guidance, and the matched target. The actual adapter protocol exposes this method:

<!-- print-keep-with-next: 8 -->

``` text
def coverage_for_files(
    self, files: list[str], *, repo_root: Path
) -> list[Constraint]: ...
```

The aggregator deduplicates by registry and constraint identity, orders each registry’s contribution by priority, applies its budget, and sorts the retained records. Priority refinement keeps stylistic findings from consuming the same limited space as more consequential structural constraints. For the November brief above, the assembled record contained 47 entries, including 25 from the lint registry. Those counts describe one selection for one scope, not a recommended amount of context for every agent.

DocAble’s adapter aggregator catches extraction exceptions and allows the failed adapter to contribute no records; its tests exercise this degraded-empty behavior. An empty selection therefore does not establish that no obligation applies. Budgeting also intentionally omits some matched material. When adapting the selector, decide how callers will distinguish no match, budget exclusion, and extraction failure, and retain source references for further retrieval. Make those outcomes visible to the caller so that extraction failure cannot be mistaken for absence of obligations.

Selected prose guides the reasoner. The applicable tests, permissions, and gates supply enforcement whether or not the agent followed that guidance. When work expands beyond its declared target files, repeat the selection for the actual scope and revisit the acceptance obligations. Context selection cannot recover a design intention that no queried representation contains.

### Dispatch, Execute, and Evaluate Completion {#handbook-model-lifecycle .unnumbered}

Begin with a structured assignment and a deliberately small set of dispatch checks. Verify that the assigned scope is resolvable, that the work is attached to the intended project, and that the required instruction sources are available. State what happens when a premise cannot be established. A missing path for a declared new file has a different meaning from a missing source file the agent is expected to edit.

Require durable work early enough that interruption is recoverable. In DocAble, agent commits carry progress information, and a final validation marker distinguishes work prepared for integration from an interrupted sequence. The shared repository, worktree, assignment, and executor registry supply different evidence. Design their identities so that an operator can find the changes belonging to an assignment without recovering the agent’s conversation.

Evaluate completion against the work order. Check that the promised changes arrived, that relevant integration occurred, and that the available tests or review address the acceptance conditions. Record unresolved obligations rather than replacing them with a completion marker. Different checks may occur before merge, in later validation, or at release; an accepted dispatch does not settle those later decisions. The assignment’s producing agent may report its results, but acceptance must be grounded in evidence that can be inspected independently of that report.

Recovery should inspect durable artifacts before assigning replacement work or resetting an executor. After an orchestrator restart on November 9, DocAble lost background completion notifications while agents’ commits remained in Git worktrees. The operator inspected branches, recovered and landed completed work, then released the affected slots. This observed recovery supports a narrow but useful claim: committed results can survive loss of the conversational channel. It does not establish that every interrupted assignment is complete or safe to merge.

For a new arrangement, test interruption before the first durable result, after a partial result, and after completion but before notification. Define who may resume the work and which evidence permits a slot or workspace to be released. A stale heartbeat or apparently idle process is a reason to inspect state, not sufficient evidence that its work can be destroyed.

### Enforce Lifecycle Decisions {#handbook-conversion-episode .unnumbered}

A system that delegates work against persistent assignments needs explicit rules for recognizing completed work, reopening assignments, and authorizing exceptions. DocAble repeatedly dispatched, or nearly dispatched, work against phases whose implementation had already landed. The repair carried phase identity through briefs and commits, reconciled the corresponding phase record, and checked it during work-order composition as well as dispatch. The selected obligation was narrow: refuse a new assignment when the resolved phase record positively says the phase is complete.

A missing record or unresolved phase does not establish completion and therefore does not trigger this particular refusal. Other dispatch requirements still apply. When genuine further work is needed, reopening changes the recorded phase to a state that can be scheduled again. An explicit override instead permits one dispatch with a reason; its audit write is best-effort, and a write failure is reported rather than represented as persisted evidence. The override does not silently redefine the phase’s completion state.

The control itself required repair. An October 10 investigation found that phase extraction first examined the declared `Epic` line but fell back to the first “Phase N” mention anywhere in the brief. Historical prose about a completed phase could then cause a new assignment to be refused. Four false refusals in one session prompted investigation. The corrected extractor, reproduced below from the field note, restricts identity extraction to the declared line:

<!-- print-keep-with-next: 11 -->

``` text
def extract_phase_from_brief(brief_text: str) -> str | None:
    m_line = _EPIC_LINE_RE.search(brief_text)
    if m_line is None:
        return None
    m_phase = _PHASE_IN_LINE_RE.search(m_line.group(0))
    return m_phase.group(1) if m_phase else None
```

Verify both sides of this gate. A declared completed phase should be refused; a reopened phase should proceed subject to the other checks. A declared Phase 3 beside narrative history about Phase 2 must resolve to Phase 3. If the declared line has no phase, narrative history must not manufacture one. These cases test the link between identity, state, and consequence rather than merely exercising the final refusal branch.

Override frequency supplies maintenance evidence. The inspected mechanism can recommend review when overrides accumulate, including repeated overrides for the same phase, while accounting for intervening reopen events. That signal does not automatically weaken or disable the gate. An engineer must determine whether the premise, extractor, state reconciliation, or policy needs correction. A conversion ledger can link the failure class to the phase installing its repair; the control’s actual behavior still needs its own evidence.

### Verify the Arrangement {.unnumbered}

Exercise the whole path from assignment to accepted or recoverable work. A valid work order should resolve its intended scope and instruction sources; missing inputs and extraction failures should receive the declared response. A completed-phase refusal, legitimate reopening, and authorized override should have distinguishable effects. Interrupt an executor before and after durable results, then verify that recovery finds the correct artifacts without accepting unfinished work. Finally, inject a failed acceptance obligation and confirm that a successful producer report cannot close it.

## Adaptation and Limits

An analogous arrangement might delegate an infrastructure change, a document transformation, or an operational procedure. Preserve the relationships among scope, relevant knowledge, authority, durable results, and acceptance evidence; do not copy the document taxonomy merely because DocAble uses briefs and phases. Choose the smallest work identity whose completion and reopening can be stated meaningfully. Retain enough evidence to resume or decline work without reconstructing the executor’s entire reasoning process. The [Operating a GEE section of Appendix B](appendix-b-operating-a-gee.html) develops the day-to-day decisions around these boundaries.
