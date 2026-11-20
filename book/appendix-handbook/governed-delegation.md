<!-- GENERATED from book/latex/sources/appendix-handbook/governed-delegation.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

An agent can receive a clear objective and still work from stale context, repeat a completed assignment, or leave useful changes stranded when its conversation ends. A delegated-work arrangement must connect authorized scope to the knowledge needed for the task, preserve durable results, and distinguish reported completion from evidence that the work can be accepted.

[ref:handbook-model-guided-delegation] follows those connections. The work order gives the agent an assignment; maintained engineering models help select context; dispatch checks govern whether that assignment may proceed. Commits and other durable artifacts then support integration, completion review, and recovery. The completion boundary is separate from the dispatch boundary, and the figure does not prescribe one identical sequence for every task.

<!-- label: handbook-model-guided-delegation -->
<!-- figure: assets/handbook-model-guided-delegation.svg | *Governed delegation joins an assignment to relevant knowledge, durable work, and acceptance evidence.* Context selection is bounded and advisory. Dispatch gates act on assignment structure and resolved phase state; completion review evaluates landed work and independent evidence. Recovery preserves existing artifacts before work is reassigned. [short: Governed delegation] -->

## Make the Assignment a Usable Interface {#handbook-work-models}

A work order must carry enough structure for both people and machinery to use it. DocAble’s briefs name the objective, target and new files, genre, role, verification work, acceptance criteria, and non-goals. The objective and acceptance conditions express engineering intent. The path declarations identify the initial scope for repository lookup and context selection. They leave implementation choices open within that scope.

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

Assignment validation can check structure, registered identities, paths, and required instruction markers. It cannot establish that the objective is worthwhile or that the chosen acceptance evidence is sufficient. Keep that review explicit. A usable assignment is a prerequisite for delegation, not a certificate that its engineering premise is sound.

## Select Context Without Claiming Completeness

Connect the assignment’s scope to maintained knowledge. A component catalogue can map a path to its owner and architectural zone; a constraint registry can identify obligations attached to that path or genre. DocAble combines standing instructions selected during composition, file-specific constraints selected at dispatch, and retrieval as the task develops. A brief that creates a lint receives the relevant authoring instructions; later queries can retrieve designs, service relationships, or operating procedures as needed.

The file-specific selector is a concrete transformation. Each registry adapter accepts target files and returns normalized records carrying a registry and constraint identity, a scope description, severity, priority, source or corrective guidance, and the matched target. The actual adapter protocol exposes this method:

<!-- print-keep-with-next: 8 -->

``` text
def coverage_for_files(
    self, files: list[str], *, repo_root: Path
) -> list[Constraint]: ...
```

The aggregator deduplicates by registry and constraint identity, orders each registry’s contribution by priority, applies its budget, and sorts the retained records. Priority refinement keeps stylistic findings from consuming the same limited space as more consequential structural constraints. For the November brief above, the assembled record contained 47 entries, including 25 from the lint registry. Those counts describe one selection for one scope, not a recommended amount of context for every agent.

The inspected implementation catches adapter exceptions and allows that adapter to contribute nothing; a test explicitly exercises this degraded-empty behavior. An empty selection therefore does not establish that no obligation applies. Budgeting also intentionally omits some matched material. When adapting the selector, decide how callers will distinguish no match, budget exclusion, and extraction failure, and retain source references for further retrieval. That visibility is a requirement for the new arrangement, not a claim that every DocAble extraction failure was already surfaced.

Selected prose guides the reasoner. The applicable tests, permissions, and gates supply enforcement whether or not the agent followed that guidance. When work expands beyond its declared target files, repeat the selection for the actual scope and revisit the acceptance obligations. Context selection cannot recover a design intention that no queried representation contains.

## Build Dispatch, Completion, and Recovery Together {#handbook-model-lifecycle}

Begin with a structured assignment and a deliberately small set of dispatch checks. Verify that the assigned scope is resolvable, that the work is attached to the intended project, and that the required instruction sources are available. State what happens when a premise cannot be established. A missing path for a declared new file has a different meaning from a missing source file the agent is expected to edit.

Require durable work early enough that interruption is recoverable. In DocAble, agent commits carry progress information, and a final validation marker distinguishes work prepared for integration from an interrupted sequence. The shared repository, worktree, assignment, and executor registry supply different evidence. Design their identities so that an operator can find the changes belonging to an assignment without recovering the agent’s conversation.

Evaluate completion against the work order. Check that the promised changes arrived, that relevant integration occurred, and that the available tests or review address the acceptance conditions. Record unresolved obligations rather than replacing them with a completion marker. Different checks may occur before merge, in later validation, or at release; an accepted dispatch does not settle those later decisions. The assignment’s producing agent may report its results, but acceptance must be grounded in evidence that can be inspected independently of that report.

Recovery should inspect durable artifacts before assigning replacement work or resetting an executor. After an orchestrator restart on November 9, DocAble lost background completion notifications while agents’ commits remained in Git worktrees. The operator inspected branches, recovered and landed completed work, then released the affected slots. This observed recovery supports a narrow but useful claim: committed results can survive loss of the conversational channel. It does not establish that every interrupted assignment is complete or safe to merge.

For a new arrangement, test interruption before the first durable result, after a partial result, and after completion but before notification. Define who may resume the work and which evidence permits a slot or workspace to be released. A stale heartbeat or apparently idle process is a reason to inspect state, not sufficient evidence that its work can be destroyed.

## Refuse Repeated Work Without Blocking Rework {#handbook-conversion-episode}

Add controls where recurring failures reveal a dependable decision. DocAble repeatedly dispatched, or nearly dispatched, work against phases whose implementation had already landed. The repair carried phase identity through briefs and commits, reconciled the corresponding phase record, and checked it during work-order composition as well as dispatch. The selected obligation was narrow: refuse a new assignment when the resolved phase record positively says the phase is complete.

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

## Adapt the Work Unit and Durable Store

An analogous arrangement might delegate an infrastructure change, a document transformation, or an operational procedure. Preserve the relationships among scope, relevant knowledge, authority, durable results, and acceptance evidence; do not copy the document taxonomy merely because DocAble uses briefs and phases. Choose the smallest work identity whose completion and reopening can be stated meaningfully. Retain enough evidence to resume or decline work without reconstructing the executor’s entire reasoning process. The [Operating a GEE section of Appendix B](appendix-b-operating-a-gee.html) develops the day-to-day decisions around these boundaries.
