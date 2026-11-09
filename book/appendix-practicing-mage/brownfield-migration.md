<!-- GENERATED from book/latex/sources/appendix-practicing-mage/brownfield-migration.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

An existing system usually has fragments of the desired environment: documentation, tests, review rules, ownership records, deployment policy, runbooks, and expert knowledge. Begin by finding which of these the selected work already relies on. The problem is to make consequential knowledge and obligations dependable without first documenting or redesigning the whole system. [{{sec:brownfield-engineering}}](4.3-brownfield-engineering.html) explains the recovery techniques; the procedure here supplies operating decisions and exit criteria.

Keep two dimensions of progress separate. **Representation reach** asks how much of the important system can be understood through trustworthy explicit models. **Enforcement reach** asks which important obligations are enforced by constraints or gates and which have only observations or advisory checks. A thinly modeled system may have strong local permissions and tests that block admission. A richly modeled system may report violations without preventing anything. Address the gap that matters to the selected work; neither dimension is a maturity score that must reach 100 percent.

### Audit, Synchronize, Govern, Extend {#audit-synchronize-govern-extend}

Apply the four stages in [ref:practicing-brownfield-exits] to one surface at a time. Their exit criteria describe what must become dependable before the next investment can rely on it. They are not dates in a rollout plan. A new discrepancy can send one obligation back to reconciliation while other parts of the environment continue to operate.

<!-- label: practicing-brownfield-exits -->
<!-- table: The brownfield migration path. Advance when the selected surface meets its exit criterion. [short: Brownfield migration exit criteria] -->
| **Stage** | **Work** | **Exit criterion** |
|---|---|---|
| **Audit** | Inventory claims, their subjects, and existing mechanisms; classify gaps. | Important gaps are classified rather than merely counted. |
| **Synchronize** | Reconcile the representations that upcoming work will rely upon. | Their intended correspondence is explicit and credible. |
| **Govern** | Enforce selected obligations where sufficient evidence is available. | The selected obligations no longer depend primarily on someone remembering to inspect them. |
| **Extend** | Add capability where expected reuse or consequence justifies its cost. | Each addition has a named consumer or engineering question and a reason to exist. |

During **Audit**, trace a few consequential claims all the way to their subjects and consumers. A wiki may declare that only one service can call an external API; inspect the implementation, deployment policy, and any check that relies on that declaration. Record whether the claim describes current behavior or intended behavior. A disagreement does not tell you which side should change. Keep the audit advisory while those decisions remain unresolved; making a recovered mistake authoritative would make the system harder to repair.

Classify unlinked code before treating it as a modeling backlog. An orphan can have three explanations:

- **Missing representation.** A consequential subsystem or relation has no useful account. Propose a representation around the question that work repeatedly needs to answer.
- **Missing anchor.** The representation exists, but code, tests, or work records do not lead to it. Repair the link rather than creating a competing account.
- **Below the grain.** The implementation is too fine-grained or generic to warrant a separate representation, such as a typed-ID alias or configuration loader. Record the exclusion where coverage reports need to distinguish it from a gap.

An orphan count without this triage rewards unnecessary modeling. Follow the important questions instead. If a model identifies a component, it need not enumerate every helper used to implement it. Conversely, a small piece of code may deserve explicit treatment if it determines a consequential permission or transition. Size alone does not decide the appropriate grain.

During **Synchronize**, repair high-value correspondence as ordinary work touches the relevant surface. Link the claim to the code and evidence that support it; provide the reverse route where engineers or agents need to discover the claim from an implementation location. Repair stale anchors and surface semantic disagreements for an engineering decision. When a machine can derive the needed view from the authoritative source, avoid maintaining a second handwritten version.

An existing configuration can remain authoritative while a recovered model earns trust as a *verified mirror*. In DocAble’s service-flow migration, tests required the model-derived dependency table to match the existing deployment table byte for byte; an injected discrepancy tested whether the check could detect drift. Transferring authority was a separate, planned step: migrate consumers to the model, then retire the duplicated table. This gives brownfield adoption a useful intermediate state. Check correspondence first, resolve disagreements, and move authority deliberately rather than treating a newly recovered representation as authoritative on its first day.

A wiki can remain the entry point. Tell agents how to locate and maintain its relevant pages, and have designs identify the pages their changes affect. Before accepting the work, compare those pages with the current repository rather than relying on the producer’s statement that they were updated. Automate comparisons only for the claims the comparison can actually decide. A mechanically correct link does not establish the truth of the sentence at its destination.

During **Govern**, choose which selected obligations should constrain an action or block a transition. Place enforcement at the earliest boundary with the necessary semantics and evidence. Some properties can be enforced directly by a type, permission, or local check; others depend on the representations just reconciled. Exercise the rejection path as well as a successful case, and examine whether an alternative route bypasses the mechanism. A check that emits the correct finding but permits the prohibited action has not completed this work.

Name the response to missing or stale evidence. Depending on the obligation, the environment may wait, reject the work, or require an explicit engineering decision. An override should record the affected obligation, the available evidence, the person accepting the exception, and its scope. A temporary exception should not silently become the policy for later changes.

During **Extend**, use observed friction and recurring failures to choose the next investment. Better retrieval may be enough; a new model, stronger evaluator, generator, or gate should answer a question that current machinery cannot settle economically. Record both its consumer and its maintenance obligation. The useful endpoint is a selected surface on which work can proceed with an adequate account of intent and acceptability, while the rest remains explicitly outside that claim.
