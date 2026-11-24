# DocAble component reference map for the new Appendix A blueprints

Status: editorial handoff, based on the current working-tree LaTeX sources. The manuscript has **not** been reorganized by this audit, and the three new blueprints have **not** yet been inserted. Section numbers below describe the present organization; source locators and labels are the durable addresses. The companion JSON records source hashes and exact starting lines so a later editor can detect intervening edits.

## Editorial decision

Keep the first teaching explanation in the main text. Let Appendix A own the integrated construction reference. A later main-text use should briefly recall the arrangement and then develop its new engineering question. Do not replace a worked teaching example with “see Appendix A.”

| Component | First explanation | Later contribution | Integrated reference to add |
| --- | --- | --- | --- |
| Remediation-computation graph | §2.3.2, registered passes and dependencies | §2.6: authority and joins; §3.2.3: coverage and blocking checks; §4.2.2: execution redesign; §5.2.3: factory reuse | Proposed A.7, Remediation-Computation Graph |
| Job ownership and recovery | §2.4.2, publication ordering and current versus returning workers | §3.3.1: testing; §3.3.2: runtime constraints, safety, and progress; §5.2.3: analysis and correspondence as factory capabilities | Proposed A.8, Job Ownership and Recovery |
| Resource models and execution design | §4.2.1, residency failure and redesign | §4.2.2: execution/latency; §4.2.3: corrections and ratchets; §4.4.2: change impact; §5.2.3: reusable supervisory representations | Proposed A.9, Resource Models and Execution Design |

The largest safe cuts are the repeated graph setup in §3.2.3 and §5.2.3, and repeated stale-worker setup in §3.3. Preserve Chapter 4’s sequence: its subject is how one engineering question leads to another, not just the final architecture.

## Site-by-site treatment

Rows group a continuous passage and its local figure, caption, or inset where they perform the same job. They are not a count of keyword occurrences. “Retain” means preserve the contribution, not freeze every word.

### Remediation-computation graph

| ID and current site | Function | Recommended treatment | Evidence records |
| --- | --- | --- | --- |
| [G1 — §2.3.2 — What computations depend on one another?](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.3-structural.tex:106) | First explanation | Retain the registered-pass definition, stable identities, typed data versus control dependencies, mutation categories, worked repair trace, and static-versus-realized distinction. These teach structural modeling before an appendix can be assumed. Add only a brief pointer to the integrated blueprint after the explanation. | E05, E13, E14, E16 |
| [G2 — §2.3.2 — computation-dependency figure](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.3-structural.tex:149) | First visual explanation | Retain the figure and classifier → repair → applier → check trace. It is an explanatory trace, not a recorded execution. Do not make all computations patch producers: the text distinguishes direct mutation, patches, and read-only work. | E05, E14 |
| [G3 — §2.6.3 — Connecting Engineering Models / substrate figure](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.6-system-knowledge.tex:124) | Composition of models | Retain the overview and modeling-substrate figure. Their subject is the connection among representations and consumers, not another introduction to a DAG. Avoid a new glossary of passes. | E10, E13, E14, E16 |
| [G4 — §2.6.3 — One Dependency for Execution and Analysis](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.6-system-knowledge.tex:144) | Authority and derivation | Keep the Office/PDF distinction and scheduler-versus-Python-graph distinction in full. A cross-reference already exists; optionally narrow it to heading:what-computations-depend-on-one-another. This is substantive new material, not redundant setup. | E13 |
| [G5 — §2.6.3 — What One Document Run Changed](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.6-system-knowledge.tex:165) | Provenance and measurement joins | Retain pass stamps, typed editor operations, session edit records, and the distinction from a computation execution trace. Keep two-reductions-static-realized. Refer to A.3 for mutation contracts; the new graph blueprint should point here rather than absorb all edit-history machinery. | E14, E16 |
| [G6 — §3.2.3 — From Correspondence to Enforcement](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part3/3.2-models-and-the-semantic-gap.tex:187) | Coverage failure and admission | Condense the opening reintroduction and static-graph footnote into a recall of §2.6.3. Preserve the prototype recovery history, dated graph census, missed Office pass, advisory versus blocking checks, coverage repair, and separate correspondence/conformance/acceptance judgments. Agreement of declarations is not evidence that execution respects the dependency order. | E05, E13, E16, E17, E18 |
| [G7 — §4.2.2 — Why Are We Still Chunking?](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:132) | A new execution design | Recall the graph in one sentence, then retain the episode: the residency change removes a reason for page partitioning and makes a computation frontier worth considering. Keep interlude-graph-two-partitions. Distinguish execution-driving declarations from richer analytical projections. | E26 |
| [G8 — §4.2.2 — Redesigning the Critical Path](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:158) | Analytical use | Keep the image-description dependency change and interlude-analysis-before-build. The 12-to-7-second diagram is an illustration; do not recast it as a production benchmark. Cross-reference the graph definition only if needed to explain the new analysis. | E26 |
| [G9 — §4.2.3 — The Resulting Model Family](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:257) | Composition and reuse | Keep the remediation-graph row of interlude-model-family and its relationship to the other models. The table explains why several representations were needed; replacing it with an appendix pointer would lose the chapter’s synthesis. | E26, E27, E28, E29 |
| [G10 — §5.2.3 — The Computation Graph: a Representation That Took Over Execution](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part5/5.2-inside-docables-software-factory.tex:320) | Factory consequence | Replace the repeated pass/dependency tutorial with a compact account of shared declarations, their consumers, and the checks that sustain them across changes. Explicitly distinguish Office execution from the Python analytical graph. Retain the callback to the Chapter 4 episode and the new point about reusable analytical views. Consider the more precise heading “Computation Declarations Shared by Execution and Analysis.” | E13, E18, E26 |
| [G11 — §5.2.3 — Substituting the Reasoning Engine](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part5/5.2-inside-docables-software-factory.tex:329) | Boundary with an existing blueprint | Retain the alternative-orchestration lesson and empirical pilots. A.4 owns reasoning substitutability; A.3 owns controlled mutation. Reusing document machinery does not establish that every reasoner uses the same scheduling policy or analytical graph. Do not move the comparison into the new graph blueprint. | Conceptual / refer to adjacent case evidence |

### Job ownership and recovery

| ID and current site | Function | Recommended treatment | Evidence records |
| --- | --- | --- | --- |
| [O1 — §2.4.2 — Publishing a recovered result](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.4-behavioral.tex:80) | First lifecycle example | Retain output publication before the database reference and recovery-ordering-model. The three-state teaching reduction is not the complete deployed lifecycle. Decide explicitly whether the new blueprint covers publication ordering; its title currently promises recovery more broadly than stale-owner rejection. | E07 |
| [O2 — §2.4.2 — Distinguishing a current owner from a returning one](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.4-behavioral.tex:134) | First ownership explanation | Retain the stale-worker scenario, claim/generation/lifetime distinctions, ownership-constructs table, and in-flight-ownership-states figure. This is where readers learn why worker identity alone is insufficient. Mark the A7/B8 trace as explanatory, not a reconstructed incident. | E08 |
| [O3 — §2.4 — What is an invariant? inset](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part2/2.4-behavioral.tex:232) | A distinct teaching purpose | Retain the definition-versus-implementation-property distinction and small checker illustration. The status/lease_owner pair is explanatory pseudocode, not evidence of the exact production schema. No need for another appendix pointer inside the inset. | E08 |
| [O4 — §3.3.1 — Testing Against Models / Testing Ownership](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex:184) | Test construction | Replace the repeated A-expires/B-acquires setup with a one-sentence recall of §2.4.2. Preserve regression tests, generated operation sequences, expected outcomes, and the limitation of sequential tests for races and atomicity. Preserve conditional wording for a proposed test driver. | E08 |
| [O5 — §3.3.1 — Failure Models and Testing the Tests](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex:194) | Challenge the checker | Keep the generation-check mutation as a short application of the already taught protocol. It illustrates how to test detection; do not claim a witnessed mutation-testing campaign without a receipt. Other web failure models in this passage are not all ownership models. | E08 |
| [O6 — §3.3.2 — Protecting the Recovery Protocol](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part3/3.3-constraints-sensors-validators-gates.tex:254) | Mechanism selection and safety/liveness | Retain lease expiry versus continued execution versus authority over a protected effect. Keep match-mechanism-to-property and the distinction among runtime atomic constraints, finite explicit-state exploration, and temporal recovery specifications. Shorten the second retelling of the stale worker; never compress these three kinds of assurance into “the model proves recovery.” | E08, E37 |
| [O7 — §5.2.3 — Engineering-model census table](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part5/5.2-inside-docables-software-factory.tex:245) | Factory inventory | Keep the lifecycle/state-model specimen, consumers, and supervisory consequence. Its concise row is useful navigation. Do not expand it into another ownership explanation or imply unbounded verified termination. | E08, E37 |
| [O8 — §5.2.3 — Additional model-based analyses, before computation graph](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part5/5.2-inside-docables-software-factory.tex:318) | Capability and correspondence | Condense the lifecycle/ownership/TLA+ inventory while preserving the point that model analysis creates a separate correspondence obligation. This paragraph has already moved before the computation-graph heading; do not repeat that relocation. Keep explicit-state analysis distinct from TLA+ configurations and from implementation conformance tests. | E08, E37, E51 |

### Resource models and execution design

| ID and current site | Function | Recommended treatment | Evidence records |
| --- | --- | --- | --- |
| [R1 — §4.1.2 — Kernel ordering example](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.1-the-dynamics-of-mage.tex:39) | Conceptual preparation, not this component | Keep the embedded-system resource example. It teaches which obligations must be protected before structural changes and does not introduce DocAble’s residency machinery. Avoid an appendix pointer here. | Conceptual / refer to adjacent case evidence |
| [R2 — §4.2.1 — Modeling Memory Residency](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:18) | First full explanation | Preserve the whole-document → page-chunk → large-media failure → skeleton-and-handles progression. Keep interlude-execution-unit. This is the chapter’s central dynamics lesson, not disposable implementation setup. The appendix will give the reusable arrangement without retelling the history. | E26 |
| [R3 — §4.2.1 — Remove Media from the Working Set](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:75) | Representation and operating envelope | Retain streaming, skeleton, handles, and working-state terms. State what payload-size independence assumes, including output streaming. Do not claim independence from skeleton size, decoded media area, single-object size, or concurrency. Distinguish the observed PDF sweep from the proposed OOXML sweep. | E26 |
| [R4 — §4.2.1 — Why One Level Deeper Matters](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:110) | Measurement method | Retain mechanism-level measurement as the reason to question aggregate readings. Avoid retelling the same explanation later; later passages should show the particular prediction error or missing variable. | E26, E27 |
| [R5 — §4.2.1 — Memory Did Not Stop Mattering](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:119) | Resources constrain the new design | Keep concurrency feasibility, fail-loud guards, and the memory gate that blocked a latency-oriented deployment. The redesign changes the resource model; it does not abolish memory constraints. | E26 |
| [R6 — §4.2.2 — Modeling Execution and Latency](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:130) | Consequences for execution | Keep the bridge from residency to execution, then the frontier/critical-path discussion catalogued as G7–G8. Refer back to the computation model; do not define registered passes again. “Why Are We Still Chunking?” is a lower heading, not the numbered subsection title. | E26 |
| [R7 — §4.2.2 — The Second Resource Model](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:176) | New deployment-cost question | Retain the distribution equation and its assumptions. The illustrative 70-second example and rejected negative fit are explanations of the model, not evidence of a universal speedup. Keep network/fan-out costs separate from local memory residency. | E26 |
| [R8 — §4.2.2 — Predicting Latency](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:188) | Prediction versus measurement | Retain interlude-latency-floor and its assumptions. Label 7.7 seconds as a derived floor from stage quantities, not measured end-to-end performance. The 33-to-11.5-second concurrency comparison is a prediction requiring validation. | E28 |
| [R9 — §4.2.2 — Predicting the Cost of a Design Change](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:202) | Reuse for a different question | Retain the insertion of an IR stage into the cost model. It demonstrates why a representation can be reused before implementing an alternative; do not repeat the full latency derivation. | E26 |
| [R10 — §4.2.2 — Use Prediction Error as Evidence](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:206) | Revising a model | Retain the explanatory prediction-residual figure and transition into later corrections. Make its illustrative status visible; reserve observed outcomes for the documented falsification cases. | E27 |
| [R11 — §4.2.3 — What Carries Forward](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:223) | Prevent regression | Keep resource ratchets and review obligations. Four counters on two retained fixtures are mechanical checks; the GenAI-hop dimension is audit-only. A requirement to justify a raised baseline is not an automated proof that the justification is sound. | E29 |
| [R12 — §4.2.3 — Models Get Falsified; the Obligation Survives](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:231) | Counterevidence | Preserve the mistaken mmap/offloading predictions, decoded-image-area dimension, and capacity-model recalibration. These are new evidence, not another residency introduction. Keep workload, measurement boundary, and predicted-versus-observed quantities attached to each result. | E27 |
| [R13 — §4.2.3 — Model-family table and composition](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:257) | Synthesis | Retain all seven models and their distinct questions. Cross-reference the new resource blueprint after the synthesis rather than turning every table row into an appendix pointer. Shared site with G9. | E26, E27, E28, E29 |
| [R14 — §4.2.3 — Modeling Inside the Implementation Loop](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.2-one-problem-many-models.tex:308) | Why the episode belongs here | Keep the engineering chronology and model-first/model-last lesson. The blueprint should not reproduce this narrative. Chapter 4 owns how the models emerged and changed. | E26 |
| [R15 — §4.4.2 — Model-Aware Change Impact](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part4/4.4-engineering-the-environment.tex:87) | New consumer of the model family | Keep the worker-concurrency example and model-aware-change-impact figure. Add a precise callback to §4.2’s model family if helpful. The new question is which evidence a change requires; A.6 owns the selection machinery. Do not restate skeletonization. This site is missing from the supplied map. | Conceptual / refer to adjacent case evidence |
| [R16 — §5.2.3 — Memory-model census row](/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog/book/latex/sources/part5/5.2-inside-docables-software-factory.tex:245) | Factory consequence | Retain the resource representation, its consumer, and the supervisory consequence. A short row does not duplicate the Chapter 4 episode. Do not turn a budget or capacity prediction into an unconditional deployment guarantee. | E26, E27 |

## Suggested replacement copy at the main compression sites

These are recommendations for the later authoring pass, not edits already applied. Preserve adjacent evidence comments and figures. Use the repository’s existing reference commands and stable labels; do not paste literal section numbers into LaTeX.

**G4, §2.6.3: narrow the existing callback, rather than add another explanation.**

> The computation model introduced in §2.3.2 also connects execution with analysis.

Continue with the current Office read/write-metadata example and PDF distinction. The present section already does most of the needed work.

**G6, §3.2.3: replace the opening setup and long static-graph footnote.**

> Section 2.6.3 described how DocAble connects computation declarations, scheduling, and an analytical graph. Their agreement leaves two further questions: do the checks cover the live computations, and do their findings govern acceptance?

Then retain the historical recovery paragraph, dated census, missed-pass audit, repair, and three judgments. Refer to §2.6.3 for the static graph versus edit-history distinction. Keep an explicit execution-conformance limitation in the existing three-judgment list.

**O4, §3.3.1: replace only the repeated scenario setup.**

> The ownership model in §2.4.2 gives the tests a specific obligation: a returning worker must not release a newer worker’s claim. A regression test can exercise that sequence; generated operation sequences can examine additional combinations of claims and releases.

Continue with the current test construction and concurrency limitations. If this replaces the beginning of the following testing paragraph too, remove that overlap rather than repeating the regression/property distinction.

**O6, §3.3.2: replace the second stale-worker retelling.**

> For the ownership protocol introduced in §2.4.2, a finite explicit-state model can explore interleavings of claim acquisition, expiry, replacement, and release. That analysis addresses a different question from the atomic runtime operation: whether the modeled transitions permit a forbidden ownership state.

Retain the earlier lease-versus-effect distinction, the purpose-built checker, and the following recovery-progress specification with its fairness assumptions. Keep claims about an executed checker within the retained evidence.

**O8, §5.2.3: shorten the inventory, preserving its factory contribution.**

> Explicit lifecycle and ownership models also supplied objects for analysis: a finite ownership state space for exhaustive exploration, and a temporal recovery specification with stated delivery and sweep assumptions. The factory had to preserve their correspondence with the evolving product. Conformance tests exercised production operations against executable models, while model-to-implementation checks supplied separate evidence when modeled surfaces changed.

Reference §3.3 for the assurance distinctions. This does not claim a successful TLC run. Keep the preceding invariant-to-verification-tier join: it explains selection of required evidence, a separate capability from checking correspondence.

**G10, §5.2.3: replace the repeated graph tutorial with a factory consequence.**

> The computation declarations described in §2.6.3 support both execution and analysis. For Office formats, registry read/write metadata informs scheduling and supplies dependencies to the analytical graph. PDF uses parallel typed declarations whose correspondence is checked. The blocking checks developed in §3.2.3 help preserve these relationships as the product changes. The factory therefore maintains reusable structural knowledge instead of requiring each new analysis to reconstruct composition from pass implementations.

> Chapter 4 follows the execution redesign that this knowledge supported. The resulting analytical views reuse computation identities to examine critical paths, mutation behavior, cost, and coverage, while remaining distinct from the machinery that schedules work.

Prefer “Computation Declarations Shared by Execution and Analysis” as the heading if revising it: the current “graph … took over execution” can imply that the Python analytical graph is the scheduler’s input.

**R15, §4.4.2: make the existing callback explicit, without repeating the model family.**

> Consider a proposed increase in DocAble’s worker concurrency, using the execution, memory, and latency models developed in §4.2.

Continue the current discussion of the obligations affected and their different evidence requirements. This is an application to evaluation selection, not another resource-design explanation.

## Boundaries between the new blueprints and existing Appendix A

| Existing owner | Keep there | New blueprint’s treatment |
| --- | --- | --- |
| A.3 Controlled Mutation | Typed edit contracts, applier decisions, document ownership, application results, edit provenance | A.7 names mutation effects only far enough to explain dependency/scheduling assumptions, then points to A.3. |
| A.4 Substitutable Reasoning | Provider selection, stable reasoning interfaces, alternative orchestration, pilot comparisons | A.7 explains the computation declarations and consumers; it does not repeat the reasoning-engine comparison. |
| A.5 Governed Delegation | Coding-agent work orders, dispatch, review, acceptance, and recovery of development work | A.8 concerns runtime remediation jobs. Shared words such as worker, claim, or recovery do not make these the same lifecycle. |
| A.6 Model-Based Regression-Test Selection | Change → component/subsystem → required checks → execution and acceptance | A.9 supplies resource obligations and evidence that selection may need. A.7’s remediation graph is not the regression-test-selection graph. |
| Current A.7 Maintaining the Machinery | Governance graph, correspondence checks, mechanism upkeep | New A.7–A.9 describe product arrangements and their relevant controls. The governance graph models mechanisms, not remediation computations. |

The existing opening and blueprint pattern should remain the common contract: Problem; Conceptual Design; Engineering Models; Realization; Adaptation and Limits. The new entries should be independently usable but need not reproduce all earlier explanations.

## Claims to resolve while constructing the new blueprints

### A.7: say which representation each consumer actually uses

The draft’s “the graph” is too broad. Preserve three roles: executable declarations used for scheduling; analytical projections derived from or checked against declarations; observed execution evidence. For Office, registry read/write metadata is shared authority. The Python analytical graph is a consumer, not the scheduler. PDF has a parallel-declaration correspondence arrangement. A clean analytical graph does not establish complete coverage or correct execution.

The September 5 snapshot of 125 computations / 57 relations and the later 147 / 63 inventory are different snapshots. Do not silently update the historical account, conflate emitted Office edges with the entire graph, or describe any of these as runtime invocation counts. Most computations are not typed-patch producers. State mutation assumptions before discussing safe concurrency.

Evidence to consult: E05 (dated counts), E13 (registry/emitter/analytical graph), E14 (mutation/provenance), E16 (telemetry scope), E18 (coverage and promotion), E26 (execution redesign). A missing-dependency test detects only what its oracle and covered population can expose; do not promise detection of arbitrary omitted semantics.

### A.8: distinguish ownership, protected effects, publication, and progress

Do not make claim generation a blanket exactly-once guarantee. Separate stale-owner release protection from authorization of a protected effect. Identify the actual atomic operation and the identity it compares. Keep publication ordering if the blueprint promises job recovery generally; otherwise explicitly limit its subject and refer to §2.4.2 for output publication.

The Chapter 2 generation trace is explanatory. It is not evidence that that exact incident happened. Regression/property-based testing can be prescribed as a construction method without claiming that every proposed campaign was performed. The retained material supports finite explicit-state analysis and correspondence testing. E37 explicitly records the absence of retained TLC stdout/counterexample receipts; a TLA+ specification and configuration are not witnessed verification results. State delivery/sweep fairness assumptions and model bounds wherever progress is discussed.

Evidence to consult: E07 (publication reduction), E08 (ownership model, finite exploration, atomic operations), E37 (temporal specification/configuration and evidence limits), E51 (model drift). Validate the draft’s statement about an “observed failure” before retaining that verb.

### A.9: preserve the operating envelope and the evidence type

Separate the residency representation, execution dependencies, deployment/fan-out model, latency/cost projections, and measurement model. A sum of residency terms is a model with assumptions, not a guarantee that every workload has constant RSS. Include stream/write behavior, skeleton and handle growth, decoded media, working-state bounds, and concurrency where relevant.

Retain the difference between an observed PDF sweep and a designed OOXML sweep; a derived latency floor and end-to-end runtime; a concurrency prediction and staging evidence; mechanical counters and an audit-only dimension. The mmap/offloading counterexamples demonstrate revision of a particular hypothesis, not failure of resource modeling generally. The appendix should explain the resulting design and how to challenge it, leaving the chronology in Chapter 4.

Evidence to consult: E26 (episode and measurement boundaries), E27 (falsified predictions), E28 (derived latency floor), E29 (ratchet scope). Record the workload, measurement boundary, and date/revision beside numerical claims.

These are source/evidence-boundary checks, not a fresh execution audit of DocAble. No implementation tests or formal verification were rerun for this map. Private records remain private and ignored; manuscript evidence comments should point to them at every independently reused claim, including figures and tables.

## Adjacent mentions that should not be swept into this edit

Generic structural/build graphs in §§2.3 and 2.6 teach representation and authority; generic behavioral machines in §2.4 establish the abstraction. Chapter 3’s governance-interaction graph describes interacting controls, not remediation passes. The resource example in §4.1 prepares the alignment-kernel argument. Chapter 4’s operational lifecycle/runbook discussion concerns the engineering environment, including coding-agent recovery. Chapter 5’s requirements, development-stage figures, model counts, operating costs, and external factory cases provide context or other evidence. They are not fresh introductions to these three components merely because they mention models, workers, memory, or graphs.

In particular, retain the invariant-facts → verification-tier → required-checker join in §5.2.3. Do not replace it with ownership exposition. Retain the alternative-reasoner experiments at their present level of detail: they show reuse of maintained document machinery and have a distinct canonical blueprint in A.4.

## References and integration sequence for the author-agent

1. Validate each proposed blueprint against the records above. Write a small authority/consumer inventory before drafting: representation, owner, derived views, runtime consumer, checking consumer, enforcement boundary, and remaining judgment. Do not substitute a list of files for the engineering design.
2. Add the three blueprints after Model-Based Regression-Test Selection. Preserve existing stable IDs for maintenance and design-your-own; let numbering move them from A.7/A.8 to A.10/A.11. Suggested new IDs are `appendix-a-remediation-computation-graph`, `appendix-a-job-ownership-and-recovery`, and `appendix-a-resource-models-and-execution-design`; these are proposals, not existing reference targets.
3. Update the Appendix A opening’s “five reasons,” the design-your-own opening’s “five blueprints,” and the Preface’s five-blueprint count. The new total is eight blueprints, excluding introduction, maintenance, and design-your-own guidance. Check navigation/registries rather than hard-coding shifted numbers.
4. Apply the selective recalls above in reading order: Chapter 2, Chapter 3, Chapter 4, Chapter 5. First introductions retain their teaching work. Later uses add a property, consumer, failure, or consequence. Add appendix pointers at useful section boundaries, not after every mention.
5. Preserve cut material in the existing cutting-room-floor file and retain evidence comments. Synchronize generated Markdown through the existing native-source tooling; do not edit both formats independently.
6. Check each new blueprint with one successful trace and one failing trace. For A.7, distinguish declared readiness from observed execution; for A.8, stale release from protected-effect authority and recovery; for A.9, predicted resource acceptability from a measured envelope violation. Label explanatory traces as such.
7. Validate references, source/render parity, and relevant build checks. Inspect Appendix A and the affected main-text transitions in both HTML and PDF. Compilation validates publication plumbing, not the engineering claims.

Stable main-text targets already present: `heading:what-computations-depend-on-one-another`; `heading:docable-connecting-engineering-models`; `heading:docable-from-correspondence-to-enforcement`; `heading:docable-job-lifecycles-and-recovery`; `heading:distinguishing-a-current-owner-from-a-returning-one`; `heading:tests-and-models-work-together`; `heading:one-obligation-several-ways-to-hold-it`; `heading:modeling-memory-residency`; `heading:modeling-execution-and-latency`; `heading:the-resulting-model-family`; `heading:model-aware-change-impact`.

## Corrections to the supplied preliminary map

- §2.6.3 already points back to the structural example and explicitly distinguishes Office/PDF authority. Preserve that distinction rather than replace it with a generic shared-graph statement.
- The numbered §4.2.2 title is “Modeling Execution and Latency”; “Why Are We Still Chunking?” is inside it.
- The broad lifecycle/ownership-analysis paragraph in §5.2.3 already precedes the computation-graph heading.
- §4.4.2’s change-impact example is another substantive resource-model use and belongs in the map.
- TLA+ configurations, illustrative generation traces, proposed measurements, and dated observed results need separate treatment. The appendix drafts cannot be treated as independent evidence of implementation or execution.

Input documents: the user’s three-blueprint draft, integration instructions, and preliminary canonical map supplied in this conversation. Review basis: current authoritative LaTeX for Chapters 2–5, active Appendix A entries, and the existing private evidence records. The source index is a bounded editorial map of component uses, not an assertion that every occurrence of a shared word denotes the same component.
