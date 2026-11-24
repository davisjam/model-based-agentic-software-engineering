<!-- GENERATED from book/latex/sources/appendix-practicing-mage/operating-a-gee.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

How does an engineering priority become work that an agent can perform and an engineer can accept? As an illustration, consider a request to improve PDF heading detection in DocAble. The objective is straightforward, but assigning it to an agent requires several engineering decisions. Which heading behaviors should improve? What existing behavior must remain unchanged? Which components may the agent modify? What evidence would establish that the change is acceptable?

[ref:practicing-priority-to-accepted-work] follows this assignment from priority to integrated work. The stages distinguish decisions that are easily conflated when an engineer simply asks an agent to implement a feature. The figure places acceptance at an integration-admission boundary; later completion or release checks may impose additional obligations. [ref:chapter:appendix-a-governed-delegation] gives the corresponding engineering blueprint for work orders, dispatch controls, completion evidence, and recovery; the procedure here concerns operating those mechanisms across an engineering assignment.

<!-- label: practicing-priority-to-accepted-work -->
<!-- figure: assets/priority-to-accepted-work.svg | *From priority to accepted work.* Engineering models inform the assignment and its acceptance conditions. An agent produces changes, but independent evidence determines whether they can be accepted. Interrupted or rejected work returns to repair or recovery without discarding durable results. [short: From priority to accepted work] -->

An engineering priority becomes an assignment only after the intended change and its acceptance obligations are sufficiently clear. For DocAble’s heading-detection example, the design identifies the behavior to improve, the representations and computations involved, and the existing document properties that must survive. The work order then selects a bounded part of that design, records dependencies, and supplies the relevant engineering context. Structural checks can establish that the assignment is well formed; they cannot establish that the proposed design is correct.

The implementing agent retains freedom over details not fixed by the design or its obligations. It may inspect additional code and models as its understanding develops, but the resulting change must be evaluated against the current acceptance criteria. A successful demonstration of improved heading detection is insufficient if the change also damages document structure. Independent checks and engineering review therefore examine both the intended improvement and the properties the change must preserve.

Acceptance and recovery are related but distinct decisions. A failed check may require a local repair or a revised design; an interrupted agent may leave useful commits and partial artifacts. Before redispatching, the engineer or orchestrator must identify which work remains valid and which obligations are unresolved. The workflow can return to earlier decisions without discarding durable results. [ref:chapter:appendix-a-governed-delegation] describes the machinery supporting these transitions.

### From a Brief to Accepted Work {#from-a-brief-to-accepted-work}

The heading-detection assignment illustrates what the dispatch brief must preserve. Prepare it from the current repository, not from a remembered account of the component. Four kinds of information make it usable:

- **Intended change and preservation.** Identify the heading behavior to improve, the existing behavior that must remain, and exclusions such as unrelated document mutations. Leave implementation choices open where they do not affect these obligations.
- **Engineering context.** Point to current source, the representation the component operates through, and relevant invariants. Require the agent to query the models and checks associated with its refined target files before changing them.
- **Acceptance evidence.** Specify evidence for the intended behavior, preservation obligations, and affected integration paths. Evaluate those properties independently of the implementation the agent happens to choose. Record unavailable evidence as an open question.
- **Budget and hand-back.** State when to stop and what to preserve: commits, completed checks, partial results, unresolved questions, and unmet obligations. An honest partial result supports a decision about further work; an unsupported completion claim hides that decision.

DocAble records the agent’s plan and progress in durable commit metadata. Early checks verify selected execution prerequisites, including the expected worktree and branch, before substantial work begins. These records help locate and recover work but do not establish its correctness. Completion review examines the integrated revision against the work order’s acceptance obligations. Failed or interrupted work returns with its unresolved obligations and reusable artifacts identified, rather than being assigned again from the beginning.

<!-- index-def: standing-context -->

Reusable skills can supply procedures, examples, and tools that recur across assignments. Keep the standing context small enough to remain useful, and retrieve richer material when the task calls for it. A procedure’s availability does not establish that an agent will invoke it or follow it correctly; consequential prerequisites and acceptance conditions may require separate checks. Research on deriving skills from execution traces and revising harnesses from execution evidence offers ways to propose improvements, whose assumptions and effects still need engineering review [cite: ni2026trace2skill;chen2026harnessfix;lin2026agentic].

The companion [epic](https://davisjam.github.io/model-based-agentic-software-engineering/downloads/EPIC-TEMPLATE-starter.md), [design-document](https://davisjam.github.io/model-based-agentic-software-engineering/downloads/design-doc-template-starter.md), and [dispatch-brief](https://davisjam.github.io/model-based-agentic-software-engineering/downloads/agent-brief-starter.md) starters supply field structures for these assignments.

### Keep the Checking Process Operational {#keep-the-checking-process-operational}

Schedule validation according to the cost of obtaining evidence and the consequences of obtaining it late. In DocAble, expensive validation triggered after every merge overloaded the host. Separating its schedule from merge arrivals reduced contention, while inexpensive checks remained synchronous. {{sec:engineering-the-environment}} examines the engineering decisions and tradeoffs involved.

The operating process must also establish that scheduled checks actually execute and that their findings receive the intended response. In one DocAble configuration, a timer was declared but not installed; another hook happened to run the checks, concealing the gap. In a separate incident, an alert was marked resolved while its underlying check still failed. These failures distinguish configuration from execution, detection from acknowledgment, and acknowledgment from verified repair. Evidence should identify the revision examined and remain visible until the condition is resolved or an engineer explicitly accepts the exception.

### Make Recovery Improve Later Work {#make-recovery-improve-later-work}

<!-- index-def: runbook -->

<!-- index-def: deterministic-vs-judgment-split -->

A recovery runbook can separate three kinds of step: execute a mechanically determined operation, delegate bounded judgment with its relevant state and criteria, or escalate a decision requiring human authority. Prepare inputs mechanically where possible, preserve the rationale for a judgment, and record the resulting actions and evidence. This makes the procedure easier to replay and check without pretending that every decision is deterministic.

Recovery can reveal a missing model, an implicit obligation, or a control that fails to act. The engineering question is whether the same problem is likely to recur and what subsequent work should inherit from its repair. DocAble’s completed-phase gate addresses duplicate dispatch by refusing a new assignment when its resolved phase record says the work is complete. Further work requires explicit reopening or an authorized override; an unresolved phase does not trigger this particular refusal ([ref:chapter:appendix-a-governed-delegation]).

Not every incident warrants a permanent mechanism. A rare, inexpensive failure may be better handled through an operating procedure, while repeated reconstruction or consequential failures may justify a model or control. The cost includes maintaining that machinery and resolving its interactions with existing controls. Retire superseded procedures when their replacements are established; otherwise, each repair adds another obligation for later work.
