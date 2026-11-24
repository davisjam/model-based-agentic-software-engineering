# DocAble blueprint integration — 2026-11-24

The three blueprints are applied to the authoritative LaTeX manuscript, and the Chapters 2–5 reference pass is complete. A.7 is Remediation-Computation Graph; A.8 is Job Ownership and Recovery; A.9 is Resource Models and Execution Design. Maintenance and design-your-own guidance retain their identifiers and become A.10 and A.11. Appendix A now contains eight blueprints. The opening and Preface counts agree.

## Verification and substantive corrections

Verification used the existing chapters, overlapping Appendix A entries, and retained private implementation/design records. It was a source review, not a new execution or formal-verification campaign. Evidence comments remain beside independently reused implementation and measurement claims, including the three new model tables.

| Site | Before | Applied correction and basis |
| --- | --- | --- |
| Proposed A.7 | “Execution consumes its dependency edges” could identify the analytical Python graph as the scheduler input. | Office registry read/write metadata supplies scheduling and emitted analytical edges. PDF has parallel typed declarations with correspondence checks. The scheduler does not consume the Python graph. E13. |
| Proposed A.7 | “Introduce a missing dependency and confirm that the relevant correspondence check detects the inconsistency.” | Remove an edge from the projection while retaining its executable declaration: that discrepancy can be detected. Separately challenge registration coverage and undeclared reads; agreement between incomplete declarations cannot expose every omission. E13/E18. |
| Proposed A.8 | “Operations that modify ownership must establish that the presented claim is still current.” | State the actual guarded release: presenting an issue epoch makes removal conditional on matching the stored epoch. Keep the database merge-stage claim separate. Neither mechanism guarantees exactly-once execution of a whole job. E08. |
| Proposed A.8 | “Write a regression test for the observed failure.” | The stale-worker trace is an explanatory success/failure case, not a claim that this precise incident was observed. Separate prescribed testing from retained implementation evidence. E08. |
| A.8 recovery scope | A generic ownership/recovery model could obscure publication ordering and analysis assumptions. | Include fallback finalization before durable completion status. Describe the one-job temporal model, pending delivery, four-step cap, strong delivery fairness, and weak sweep/step-cap fairness. The configurations ask a progress question; they are not retained TLC execution receipts. E07/E37. |
| Proposed A.9 | Streaming and a skeleton could be read as sufficient for constant memory. | Preserve the Chapter 4 equation and its operating envelope: buffers, skeleton, handles, individual consumers, decoded media, concurrent work, and streamed output. Rendering consumers may require embedded media even after payload extraction. E26/E27. |
| A.9 measurement | A PDF observation could be generalized to OOXML or whole-pipeline behavior. | Identify the observed PDF recombination object-flush sweep; require separate validation of the OOXML design. Four resource counters on two fixtures are mechanically checked; the GenAI-hop dimension remains an audit measure. E26/E29. |
| Chapter 4 resource coupling | “A memory sweep blocked the production deploy altogether.” | Retained evidence instead documents production shipment of a latency-oriented deck-to-PDF cache conditional on bounded memory and external spill. The paragraph now uses that dated report and the supported semaphore design. The ignored E26 source record names the dated STRATEGY entry. |
| Chapter 5 graph heading | “The Computation Graph: a Representation That Took Over Execution” | “Computation Declarations Shared by Execution and Analysis.” Its original stable identifier is preserved. The new text explains what the factory maintains across changes. |

A.7 traces declared table-header repair through scheduling and analytical correspondence, then challenges a missing projected edge and omitted registrations. A.8 traces current-epoch release and rejection of a stale release, distinguishes competing protected-effect claims, and specifies fallback-publication ordering. A.9 traces a concurrency proposal through readiness, memory feasibility, predicted latency, and measurement; its failing example exceeds the resource budget and requires refusal or a narrower schedule. These are engineering traces with explicit boundaries, not fabricated execution receipts.

## Canonical locations and the main-text pass

The [reference map](docable-blueprint-reference-map.md) and [machine-readable dispositions](docable-blueprint-reference-map.json) retain all 35 pre-edit component sites. Original locators and hashes are historical; post-edit hashes record the implementation of this pass.

| Component | First explanation and representation | Alignment | Development and reuse | Integrated construction |
| --- | --- | --- | --- | --- |
| Computation dependencies | §2.3.2; authority/consumers in §2.6.3 | §3.2.3 correspondence, coverage, and blocking checks | §4.2.2 execution redesign; §5.2.3 factory maintenance | A.7 |
| Job ownership/recovery | §2.4.2 publication and ownership | §3.3.1 tests; §3.3.2 runtime constraint versus analysis | §5.2.3 preserving model/implementation correspondence | A.8 |
| Resource/execution models | §4.2.1 residency | §4.2.3 ratchets and measurement scope | §4.2.2 performance; §4.4.2 change impact; §5.2.3 factory census | A.9 |

- Chapter 2 retains the complete first examples and figures. It gains concise blueprint pointers and a more precise dependency-model callback.
- Chapter 3 replaces the repeated pipeline setup and static-graph footnote with a recall. It retains the dated graph census, missed-pass audit, coverage repair, and three distinct judgments. Repeated stale-worker setup is shortened without removing test construction, atomicity concerns, protected-effect authority, or the explicit-state terminology distinction.
- Chapter 4 retains the episode, equations, predictions, measurements, counterevidence, and model-family synthesis. Execution redesign now recalls the earlier declaration treatment; change-impact analysis points to the model family. The unsupported resource-coupling particulars are corrected as above.
- Chapter 5 shortens the lifecycle/ownership inventory and replaces the graph tutorial with the factory's responsibility for maintaining declarations and correspondence. The invariant-to-verification-tier join, model census, and alternative-reasoner evidence remain: they contribute different facts.
- Existing A.3–A.6 retain ownership of mutation, reasoning substitution, coding-agent delegation, and regression-test selection. The new entries refer to those constructions rather than duplicating them. Existing figures are referenced instead of redrawn.
- A manuscript-wide targeted search checked graph/scheduler authority, TLA+ scope, and memory guarantees across the main chapters and appendices. Governance-interaction graphs and runtime remediation graphs remain distinct.

## Remaining evidence limits

No unresolved contradiction requiring a manuscript change was found in this bounded component review. The remaining limits are material and stated in the prose: incomplete declaration/check coverage; selected telemetry rather than a complete per-run computation trace; finite-state bounds; temporal configurations without retained execution receipts; correspondence evidence distinct from implementation correctness; and workload-specific resource measurements. The September and November computation inventories remain dated snapshots rather than conflicting universal counts. No new claim of a successful implementation test or TLC run is made.

## Publication validation

Source/projection synchronization and HTML emission passed; all three blueprint pages are in the shared publication roster. The first full-book render passed, and visual review found the new tables readable but their first columns unnecessarily wide. Their print proportions are now 20/40/40, with in-place placement to keep the following paragraph uninterrupted.

The first excerpt run exposed a resolver defect: Hyperref destinations named `section*.N` for unnumbered subheadings were absent from the external-reference map even though the full-book auxiliary file supplied a verified containing-section number. The resolver now accepts those destinations, retains local references, and still rejects missing/unverified labels. Regression tests cover both the valid subheading and missing-target cases. Publication-roster fixtures were updated for A.7–A.11. All 39 focused split/publication/reference tests pass.

The corrected full-book build completed successfully: 303 pages, zero unapproved LaTeX diagnostics, all 53 numbered bookmarks verified, and all 13 standalone PDFs passed their current-input, structural, and bookmark checks (5 compiled in this corrected pass; 8 reused after verification). The full book and EPUB were rebuilt. Visual inspection of the seven pages spanning the new blueprints confirmed readable tables, intact rows, resolved references, and coherent heading flow. The only audit-only bottom-margin finding is the existing cover imprint, outside this edit. These document checks do not establish the implementation properties discussed by the blueprints.


## Final-build word counts

Repository method: rendered prose, including rendered citation notes; excludes code, captions, diagram text, and metadata.

| Part | Words |
| --- | ---: |
| Orientation and Reference | 4,131 |
| Chapter 1 — The New Engineering Problem | 5,833 |
| Chapter 2 — Modeling | 14,363 |
| Chapter 3 — Alignment | 13,519 |
| Chapter 4 — MAGE in Motion: Engineering Through Models | 13,126 |
| Chapter 5 — DocAble Among Other Software Factories | 12,503 |
| Chapter 6 — The Theory | 11,083 |
| Chapter 7 — The Profession | 13,049 |
| Conclusion | 1,078 |
| Back Matter | 493 |
| Appendix A | 15,048 |
| Appendix B | 6,208 |
| **Total** | **110,434** |

The total increased by 2,761 words from the preceding build. The three new blueprints add construction detail; the main-text pass retains distinct teaching and evidence rather than cutting to a target mechanically.
