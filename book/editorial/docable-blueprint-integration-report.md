# DocAble blueprint integration — 2026-11-24

The three blueprints are applied to the authoritative LaTeX manuscript, and the Chapters 2–5 reference pass is complete. A.7 is Remediation-Computation Graph; A.8 is Job Ownership and Recovery; A.9 is Resource Models and Execution Design. Maintenance and design-your-own guidance retain their identifiers and become A.10 and A.11. Appendix A now contains eight blueprints. The opening and Preface counts agree.

## Verification and substantive corrections

Verification used the existing chapters, overlapping Appendix A entries, and retained private implementation/design records. The follow-up combines source review with five isolated Python projection checks and four isolated merge-model tests. It does not replay production services, the full scheduler suite, or TLC. Evidence comments remain beside independently reused implementation and measurement claims, including the three new model tables.

| Site | Before | Applied correction and basis |
| --- | --- | --- |
| Proposed A.7 | “Execution consumes its dependency edges” could identify the analytical Python graph as the scheduler input. | Office registry read/write metadata supplies scheduling and emitted analytical edges. PDF has parallel typed declarations with correspondence checks. The scheduler does not consume the Python graph. E13. |
| Proposed A.7 | “Introduce a missing dependency and confirm that the relevant correspondence check detects the inconsistency.” | Remove an edge from the projection while retaining its executable declaration: that discrepancy can be detected. Separately challenge registration coverage and undeclared reads; agreement between incomplete declarations cannot expose every omission. E13/E18. |
| Proposed A.8 | “Operations that modify ownership must establish that the presented claim is still current.” | State the actual guarded release: presenting an issue epoch makes removal conditional on matching the stored epoch. Keep the database merge-stage claim separate. Neither mechanism guarantees exactly-once execution of a whole job. E08. |
| Proposed A.8 | “Write a regression test for the observed failure.” | The stale-worker trace is an explanatory success/failure case, not a claim that this precise incident was observed. Separate prescribed testing from retained implementation evidence. E08. |
| A.8 recovery scope | A generic ownership/recovery model could obscure publication ordering and analysis assumptions. | Include fallback finalization before durable completion status. Describe the one-job temporal model, pending delivery, four-step cap, strong delivery fairness, and weak sweep/step-cap fairness. The configurations ask a progress question; they are not retained TLC execution receipts. E07/E37. |
| Proposed A.9 | Streaming and a skeleton could be read as sufficient for constant memory. | Preserve the Chapter 4 equation and its operating envelope: buffers, skeleton, handles, individual consumers, decoded media, concurrent work, and streamed output. Rendering consumers may require embedded media even after payload extraction. E26/E27. |
| A.9 measurement | A PDF observation could be generalized to OOXML or whole-pipeline behavior. | Identify the observed PDF recombination object-flush sweep; require separate validation of the OOXML design. Four resource counters on two fixtures are mechanically checked; the GenAI-hop dimension is outside the four-count upper-bound check, but a separate equality assertion can fail. E26/E29. |
| Chapter 4 resource coupling | “A memory sweep blocked the production deploy altogether.” | Retained evidence instead documents production shipment of a latency-oriented deck-to-PDF cache conditional on bounded memory and external spill. The paragraph now uses that dated report and the supported semaphore design. The ignored E26 source record names the dated STRATEGY entry. |
| Chapter 5 graph heading | “The Computation Graph: a Representation That Took Over Execution” | “Computation Declarations Shared by Execution and Analysis.” Its original stable identifier is preserved. The new text explains what the factory maintains across changes. |

The follow-up expands A.7–A.9 with concrete declarations, identities, algorithms, publication steps, failure tables, and validation boundaries. A.7 follows actual DOCX registrations through serial ordering and edge projection; A.8 separates Redis accounting, database effect claims, and artifact publication; A.9 follows manifest references, streamed storage, dependency waits, semaphore admission, and scoped performance checks. The descriptions use present tense, with revision and design scope where needed. A.2–A.6 remain the depth and style standard.

All follow-up archaeology resides under ignored `book/data/local-evidence/evidentiary-basis-11202026/integration/`: `blueprint-A7-archaeology.md`, `blueprint-A8-archaeology.md`, and `blueprint-A9-archaeology.md`, with source copies, hashes, and bounded test receipts. The `blueprint-followup-20261124` folder holds the request, integrated draft snapshots, and component consistency map. Raw evidence comments connect manuscript claims to these records. Private material remains outside Git publication.

## Canonical locations and the main-text pass

The [reference map](docable-blueprint-reference-map.md) and [machine-readable dispositions](docable-blueprint-reference-map.json) retain all 35 pre-edit component sites. Original locators and hashes are historical; post-edit hashes record the implementation of this pass.

| Component | First explanation and representation | Alignment | Development and reuse | Integrated construction |
| --- | --- | --- | --- | --- |
| Computation dependencies | §2.3.2; authority/consumers in §2.6.3 | §3.2.3 correspondence, coverage, and blocking checks | §4.2.2 execution redesign; §5.2.3 factory maintenance | A.7 |
| Job ownership/recovery | §2.4.2 publication and ownership | §3.3.1 tests; §3.3.2 runtime constraint versus analysis | §5.2.3 preserving model/implementation correspondence | A.8 |
| Resource/execution models | §4.2.1 residency | §4.2.3 resource checks and measurement scope | §4.2.2 performance; §4.4.2 change impact; §5.2.3 factory census | A.9 |

- Chapter 2 retains the complete first examples and figures. It gains concise blueprint pointers and a more precise dependency-model callback.
- Chapter 3 replaces the repeated pipeline setup and static-graph footnote with a recall. It retains the dated graph census, missed-pass audit, coverage repair, and three distinct judgments. Repeated stale-worker setup is shortened without removing test construction, atomicity concerns, protected-effect authority, or the explicit-state terminology distinction.
- Chapter 4 retains the episode, equations, predictions, measurements, counterevidence, and model-family synthesis. Execution redesign now recalls the earlier declaration treatment; change-impact analysis points to the model family. The unsupported resource-coupling particulars are corrected as above.
- Chapter 5 shortens the lifecycle/ownership inventory and replaces the graph tutorial with the factory's responsibility for maintaining declarations and correspondence. The invariant-to-verification-tier join, model census, and alternative-reasoner evidence remain: they contribute different facts.
- Existing A.3–A.6 retain ownership of mutation, reasoning substitution, coding-agent delegation, and regression-test selection. The new entries refer to those constructions rather than duplicating them. The blueprints retain references to the earlier conceptual figures. Three additional architectural figures follow the author’s supplied targets and reuse the appendix’s vector style; captions remain manuscript text.
- A manuscript-wide targeted search checked graph/scheduler authority, TLA+ scope, and memory guarantees across the main chapters and appendices. Governance-interaction graphs and runtime remediation graphs remain distinct.

## Remaining evidence limits

The follow-up identifies concrete limits that now constrain the copy: omitted-epoch cleanup is unconditional; the merge SQL excludes a particular terminal-status set rather than every terminal state; and route-specific merge targets do not establish universal mutual exclusion. The A.8 report preserves the discrepancy between the predicate and a broader test description. The lease machinery remains present, while the page-chunked path supplies a dated design whose hooks also serve a frontier adapter.

The resource tests distinguish Python allocations from RSS despite a misleading test name. GenAI transport hops have a separate equality assertion. A numeric time-complexity fit has conflicting source provenance and supplies no measurement claim here. No retained paired concurrency prediction/production measurement supports a speedup claim. Temporal configurations remain specifications without retained TLC receipts. The isolated merge-model run explores 37 states without double merge under atomic claims and exposes 32 violating states without the claim; it verifies the abstract model, not the full SQL predicate.

## Publication validation

Source/projection synchronization and HTML emission passed; all three blueprint pages are in the shared publication roster. The first full-book render passed, and visual review found the new tables readable but their first columns unnecessarily wide. Their print proportions are now 20/40/40, with in-place placement to keep the following paragraph uninterrupted.

The first excerpt run exposed a resolver defect: Hyperref destinations named `section*.N` for unnumbered subheadings were absent from the external-reference map even though the full-book auxiliary file supplied a verified containing-section number. The resolver now accepts those destinations, retains local references, and still rejects missing/unverified labels. Regression tests cover both the valid subheading and missing-target cases. Publication-roster fixtures were updated for A.7–A.11. All 39 focused split/publication/reference tests pass.

The HTML/EPUB renderer now supports the temporal leads-to operator without substituting an ordinary transition arrow; its regression check verifies the distinct symbol. Visual review identifies two compact pseudocode blocks split across pages, so print preparation now keeps listings in the three new blueprints together. The Author’s Note also includes the requested personal paragraph before the signature, with the simpler ending.

The subsequent selective text pass removes the inaccurate ratcheteering box, anchors its index entry to the existing glossary definition, and trims repeated graph, CAS, and frontier explanations. The Conclusion and author guidance use the same precise terminology. Figure construction follows the author’s later three visual targets, with semantic corrections supported by the archaeology. In particular, the lease records job ID and issue epoch, not worker identity. The three generators reproduce all six SVG/TikZ assets byte-for-byte from shared geometry; their captions remain manuscript text. All 143 native figures fit at authored sizes, with zero geometry findings and 1,638 typography checks passing. The browser check covers 77 pages at three widths; a navigation timeout after 217 checks is resolved by rerunning the remaining 14 with the same assertions. The final PDF figure pages and Author’s Note are visually inspected.

The publication recheck incorporates the terminology, symbolic-reference, and label-padding corrections found by the commit gate, followed by the author's complete Appendix A engineering-reference prose checklist. The prose pass preserves all eight figures and eleven tables, removes four simple code blocks, and records the appendix's purpose in AGENTS. A final sentence adjustment removes a one-word carryover above A.4. The full-book build contains 306 pages and passes with zero unapproved LaTeX diagnostics. All 53 numbered section bookmarks verify. Native section PDFs: 13/13 passed (3 compiled, 10 reused; 4 worker(s)). The standalone Appendix A edition contains 46 pages, including its review front matter. HTML and EPUB render successfully.

Visual review covers the complete Appendix A page flow, the three architectural figures, model/crash tables, and substantive listings; the conditional lease and SQL listings remain intact. The existing cover-imprint bottom-margin finding remains audit-only and outside this edit. The earlier 39 split/publication/reference tests and four math-rendering tests pass; catalogue validation after the prose edits reports zero issues. These publication checks do not establish the implementation properties discussed by the blueprints.

## Final-build word counts

Repository method: rendered prose, including rendered citation notes; excludes code, captions, diagram text, and metadata. The Appendix A prose pass reduces its count from 16,840 to 15,265, a reduction of 1,575 words. Suggested reduction percentages are editorial guidance, not a quota.

| Part | Words |
| --- | ---: |
| Orientation and Reference | 4,193 |
| Chapter 1 — The New Engineering Problem | 5,833 |
| Chapter 2 — Modeling | 14,294 |
| Chapter 3 — Alignment | 13,415 |
| Chapter 4 — MAGE in Motion: Engineering Through Models | 13,073 |
| Chapter 5 — DocAble Among Other Software Factories | 12,497 |
| Chapter 6 — The Theory | 11,083 |
| Chapter 7 — The Profession | 13,049 |
| Conclusion | 1,080 |
| Back Matter | 493 |
| Appendix A | 15,265 |
| Appendix B | 6,208 |
| **Total** | **110,483** |
